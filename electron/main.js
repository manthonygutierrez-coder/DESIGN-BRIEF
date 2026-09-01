const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

let mainWindow = null;

/* ── paths ─────────────────────────────────────────────── */

const STATE_FILE = () => path.join(app.getPath('userData'), 'state.json');
const DEFAULT_ROOT = () => path.join(app.getPath('documents'), 'Pixel Crossing');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tif', '.tiff', '.bmp', '.heic']);
// The four slots map 1:1 onto the book spread's image areas in the next pass.
const SLOTS = ['01-concept', '02-process', '03-progress', '04-final'];

/* ── state: atomic read/write ──────────────────────────── */

const EMPTY_STATE = { version: 1, projectsRoot: null, mail: [], projects: {}, issued: [] };

async function readState() {
  try {
    return { ...EMPTY_STATE, ...JSON.parse(await fsp.readFile(STATE_FILE(), 'utf8')) };
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[state] unreadable, starting fresh:', err.message);
    return { ...EMPTY_STATE };
  }
}

// Temp file + rename, so a crash mid-write can never truncate the real state.
async function writeState(state) {
  const target = STATE_FILE();
  const tmp = `${target}.${process.pid}.tmp`;
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2), 'utf8');
  await fsp.rename(tmp, target);
  return true;
}

/* ── projects on disk ──────────────────────────────────── */

// Keep folder names recognisable but filesystem-safe.
function safeName(s) {
  return String(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);
}

async function resolveRoot() {
  const state = await readState();
  return state.projectsRoot || DEFAULT_ROOT();
}

async function createProject(discipline, project) {
  const root = await resolveRoot();
  const dir = path.join(root, `${safeName(discipline)} — ${safeName(project)}`);
  for (const slot of SLOTS) await fsp.mkdir(path.join(dir, slot), { recursive: true });
  watchRoot(root);
  return dir;
}

async function listProjectImages(dir) {
  const out = {};
  for (const slot of SLOTS) {
    out[slot] = [];
    let entries;
    try {
      entries = await fsp.readdir(path.join(dir, slot), { withFileTypes: true });
    } catch {
      continue; // slot not created yet, or the folder was moved — not an error
    }
    for (const e of entries) {
      if (!e.isFile() || e.name.startsWith('.')) continue;
      if (!IMAGE_EXT.has(path.extname(e.name).toLowerCase())) continue;
      const full = path.join(dir, slot, e.name);
      try {
        const st = await fsp.stat(full);
        out[slot].push({ name: e.name, path: full, size: st.size, mtime: st.mtimeMs });
      } catch { /* vanished between readdir and stat */ }
    }
    out[slot].sort((a, b) => a.mtime - b.mtime);
  }
  return out;
}

// Electron's own image pipeline — no sharp, no native build step.
async function thumbnail(file, maxPx = 320) {
  try {
    const img = await nativeImage.createThumbnailFromPath(file, { width: maxPx, height: maxPx });
    if (!img.isEmpty()) return img.toDataURL();
  } catch { /* fall through to the full-size read */ }
  try {
    const img = nativeImage.createFromPath(file);
    if (img.isEmpty()) return null;
    const { width, height } = img.getSize();
    const scale = Math.min(1, maxPx / Math.max(width, height));
    return (scale < 1
      ? img.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'good' })
      : img).toDataURL();
  } catch {
    return null;
  }
}

/* ── folder watching ───────────────────────────────────── */

let watcher = null, watchedRoot = null, watchTimer = null;

function watchRoot(root) {
  if (watchedRoot === root && watcher) return;
  if (watcher) { watcher.close(); watcher = null; }
  watchedRoot = root;
  try {
    fs.mkdirSync(root, { recursive: true });
    // recursive:true is supported on macOS; one watcher covers every project.
    watcher = fs.watch(root, { recursive: true }, () => {
      clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('projects:changed');
      }, 300); // editors write in bursts; collapse them into one notification
    });
    watcher.on('error', (e) => console.error('[watch]', e.message));
  } catch (e) {
    console.error('[watch] could not watch', root, e.message);
  }
}

/* ── ipc ───────────────────────────────────────────────── */

ipcMain.handle('state:get', () => readState());
ipcMain.handle('state:save', (_e, state) => writeState(state));

ipcMain.handle('projects:getRoot', () => resolveRoot());
ipcMain.handle('projects:chooseRoot', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose where projects are kept',
    defaultPath: await resolveRoot(),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const state = await readState();
  state.projectsRoot = res.filePaths[0];
  await writeState(state);
  watchRoot(state.projectsRoot);
  return state.projectsRoot;
});

ipcMain.handle('projects:create', (_e, discipline, project) => createProject(discipline, project));
ipcMain.handle('projects:listImages', (_e, dir) => listProjectImages(dir));
ipcMain.handle('projects:thumbnail', (_e, file, maxPx) => thumbnail(file, maxPx));
ipcMain.handle('projects:reveal', (_e, target) => {
  shell.showItemInFolder(target);
  return true;
});
ipcMain.handle('projects:pickFiles', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Attach files',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Images', extensions: [...IMAGE_EXT].map((e) => e.slice(1)) }, { name: 'All Files', extensions: ['*'] }],
  });
  if (res.canceled) return [];
  return Promise.all(res.filePaths.map(async (p) => {
    const st = await fsp.stat(p).catch(() => null);
    return { name: path.basename(p), path: p, size: st ? st.size : 0 };
  }));
});

/* ── window ────────────────────────────────────────────── */

// Packaged builds take the icon from the bundle; in dev the Dock would
// otherwise show Electron's own, which makes the app hard to find.
const ICON_PNG = path.join(__dirname, '..', 'build-resources', 'icon-1024.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: ICON_PNG,
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#010404',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // macOS reads the Dock icon from the bundle, which does not exist when
  // running `npm start` — set it explicitly so dev matches the built app.
  if (process.platform === 'darwin' && app.dock) {
    try {
      const img = nativeImage.createFromPath(ICON_PNG);
      if (!img.isEmpty()) app.dock.setIcon(img);
    } catch (e) {
      console.error('[icon] could not set dock icon:', e.message);
    }
  }
  watchRoot(await resolveRoot());
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (watcher) { watcher.close(); watcher = null; }
});
