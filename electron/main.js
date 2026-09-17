const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const https = require('https');
const http = require('http');

let mainWindow = null;

/* ── paths ─────────────────────────────────────────────── */

const DEFAULT_ROOT = () => path.join(app.getPath('documents'), 'Pixel Crossing');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tif', '.tiff', '.bmp', '.heic']);
// The four slots map 1:1 onto the book spread's image areas in the next pass.
const SLOTS = ['01-concept', '02-process', '03-progress', '04-final'];

/* ── save slots ────────────────────────────────────────
 * Studio (real work, real mail) and Hustle (the game) share nothing at runtime:
 * each has its own state file and its own projects folder. The renderer picks a
 * slot at logon, before it reads any state.
 */

const SLOT_NAMES = ['studio', 'hustle'];
let currentSlot = 'studio';

const LEGACY_STATE_FILE = () => path.join(app.getPath('userData'), 'state.json');
const STATE_FILE = (slot = currentSlot) => path.join(app.getPath('userData'), 'slots', `${slot}.json`);

// Before slots existed there was one state.json. It was always real work, so it
// becomes Studio — moved once, never copied, so there is only ever one truth.
async function migrateLegacyState() {
  const legacy = LEGACY_STATE_FILE();
  const target = STATE_FILE('studio');
  try {
    await fsp.access(legacy);
  } catch { return; }
  try {
    await fsp.access(target);
    return;                                  // studio already exists: leave both alone
  } catch { /* target missing: migrate */ }
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.rename(legacy, target);
  console.log('[slots] migrated state.json into the studio slot');
}

/* ── state: atomic read/write ──────────────────────────── */

const EMPTY_STATE = { version: 1, projectsRoot: null, mail: [], projects: {}, issued: [] };

async function readState(slot = currentSlot) {
  try {
    return { ...EMPTY_STATE, ...JSON.parse(await fsp.readFile(STATE_FILE(slot), 'utf8')) };
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[state] unreadable, starting fresh:', err.message);
    return { ...EMPTY_STATE };
  }
}

// Temp file + rename, so a crash mid-write can never truncate the real state.
async function writeState(state, slot = currentSlot) {
  const target = STATE_FILE(slot);
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

// Hustle output is game output: it lives under the studio root in its own
// folder, so real client folders never fill up with practice gigs.
async function resolveRoot() {
  if (currentSlot === 'hustle') {
    const studio = await readState('studio');
    return path.join(studio.projectsRoot || DEFAULT_ROOT(), '_hustle');
  }
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

ipcMain.handle('slots:list', () => SLOT_NAMES.slice());
ipcMain.handle('slots:use', async (_e, slot) => {
  if (!SLOT_NAMES.includes(slot)) return { ok: false, error: 'unknown slot' };
  currentSlot = slot;
  watchRoot(await resolveRoot());
  return { ok: true, slot };
});
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
  // The root is always a Studio setting; Hustle derives its folder from it.
  const state = await readState('studio');
  state.projectsRoot = res.filePaths[0];
  await writeState(state, 'studio');
  watchRoot(await resolveRoot());
  return resolveRoot();
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


/* ── design suite: save / export / open ────────────────────
 * The suite writes into a project's own folders — PNG exports to 04-final,
 * .pxdoc working files to 02-process — so its output can be attached to a reply
 * like anything made in outside tools. Writes are confined to the projects root.
 */

const SUITE_MAX_BYTES = 12 * 1024 * 1024;

function insideRoot(root, target) {
  const rel = path.relative(root, target);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

ipcMain.handle('suite:save', async (_e, req) => {
  try {
    if (!req || typeof req !== 'object') return { ok: false, error: 'bad request' };
    const slot = SLOTS.includes(req.slot) ? req.slot : '02-process';
    const base = safeName(req.name || 'untitled').replace(/\.+$/, '') || 'untitled';
    let buf, ext;
    if (typeof req.dataURL === 'string') {
      const m = req.dataURL.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return { ok: false, error: 'only PNG exports are accepted' };
      buf = Buffer.from(m[1], 'base64');
      ext = '.png';
    } else if (typeof req.text === 'string') {
      buf = Buffer.from(req.text, 'utf8');
      ext = '.pxdoc';
    } else return { ok: false, error: 'nothing to save' };
    if (buf.length > SUITE_MAX_BYTES) return { ok: false, error: 'file too large' };

    const root = await resolveRoot();
    const dir = await createProject(req.discipline || 'Scratch', req.project || 'Sketchpad');
    const target = path.join(dir, slot, base + ext);
    if (!insideRoot(root, target)) return { ok: false, error: 'outside the projects folder' };
    await fsp.writeFile(target, buf);
    return { ok: true, path: target, name: base + ext };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('suite:open', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Open a suite document',
    defaultPath: await resolveRoot(),
    properties: ['openFile'],
    filters: [{ name: 'Pixel Crossing document', extensions: ['pxdoc'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  try {
    const st = await fsp.stat(res.filePaths[0]);
    if (st.size > SUITE_MAX_BYTES) return { ok: false, error: 'file too large' };
    return { ok: true, name: path.basename(res.filePaths[0]), text: await fsp.readFile(res.filePaths[0], 'utf8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

/* ── brief feed ────────────────────────────────────────────
 * Scheduled briefs reach the app two ways, and it does not care which:
 *   pull — a JSON feed at a URL (a routine commits to the public repo)
 *   drop — JSON files in a local folder (a job on this machine writes them)
 * The fetch lives here in the main process on purpose: the renderer keeps
 * `connect-src 'none'`, so no page in the app can reach the network itself.
 */

const FEED_MAX_BYTES = 2 * 1024 * 1024;
const FEED_TIMEOUT = 12000;
const DROP_DIRNAME = '_inbox';

function fetchJSON(url){
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch { return reject(new Error('bad feed url')); }
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal)){
      return reject(new Error('feed must be https (http allowed for localhost only)'));
    }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, { headers: { 'accept': 'application/json', 'user-agent': 'PixelCrossing' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
        res.resume();
        return fetchJSON(new URL(res.headers.location, u).href).then(resolve, reject);
      }
      if (res.statusCode !== 200){ res.resume(); return reject(new Error('feed HTTP ' + res.statusCode)); }
      let size = 0; const chunks = [];
      res.on('data', (d) => {
        size += d.length;
        if (size > FEED_MAX_BYTES){ req.destroy(); return reject(new Error('feed too large')); }
        chunks.push(d);
      });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch (e){ return reject(new Error('feed is not valid JSON: ' + e.message)); }
        // GitHub's Contents API wraps the file in a base64 envelope. Unwrap it,
        // so a feed URL can be either the API endpoint or a plain JSON file.
        // The API matters: raw.githubusercontent.com is CDN-cached for minutes,
        // so a freshly committed brief would not appear until the cache expired.
        if (parsed && typeof parsed.content === 'string' && parsed.encoding === 'base64'){
          try { parsed = JSON.parse(Buffer.from(parsed.content, 'base64').toString('utf8')); }
          catch (e){ return reject(new Error('feed envelope did not contain JSON: ' + e.message)); }
        }
        resolve(parsed);
      });
    });
    req.setTimeout(FEED_TIMEOUT, () => { req.destroy(); reject(new Error('feed timed out')); });
    req.on('error', reject);
  });
}

async function readDrop(){
  const dir = path.join(await resolveRoot(), DROP_DIRNAME);
  let names;
  try { names = await fsp.readdir(dir); }
  catch { return []; }                       // no drop folder yet is not an error
  const out = [];
  for (const n of names){
    if (!n.toLowerCase().endsWith('.json') || n.startsWith('.')) continue;
    try {
      const raw = await fsp.readFile(path.join(dir, n), 'utf8');
      const parsed = JSON.parse(raw);
      for (const rec of (Array.isArray(parsed) ? parsed : parsed.briefs || [parsed])) out.push(rec);
    } catch (e){ console.error('[feed] skipping', n, e.message); }
  }
  return out;
}

/* Client artwork committed alongside a brief.
 *
 * Fetched here and returned as a data: URI, because the renderer's CSP allows
 * `img-src 'self' data:` and no network at all. Cached on disk so a client's
 * assets are fetched once and then survive offline, like everything else. */
const ASSET_MAX_BYTES = 4 * 1024 * 1024;
const ASSET_TYPES = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' };

function assetCacheDir(){ return path.join(app.getPath('userData'), 'assets'); }

function fetchBinary(url){
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch { return reject(new Error('bad asset url')); }
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal)) return reject(new Error('asset must be https'));
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(u, { headers: { 'user-agent': 'PixelCrossing' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location){
        res.resume();
        return fetchBinary(new URL(res.headers.location, u).href).then(resolve, reject);
      }
      if (res.statusCode !== 200){ res.resume(); return reject(new Error('asset HTTP ' + res.statusCode)); }
      let size = 0; const chunks = [];
      res.on('data', (d) => {
        size += d.length;
        if (size > ASSET_MAX_BYTES){ req.destroy(); return reject(new Error('asset too large')); }
        chunks.push(d);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(FEED_TIMEOUT, () => { req.destroy(); reject(new Error('asset timed out')); });
    req.on('error', reject);
  });
}

ipcMain.handle('feed:asset', async (_e, url) => {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    const mime = ASSET_TYPES[ext];
    if (!mime) return { ok: false, error: 'unsupported asset type ' + ext };

    const dir = assetCacheDir();
    await fsp.mkdir(dir, { recursive: true });
    const key = require('crypto').createHash('sha256').update(url).digest('hex').slice(0, 32) + ext;
    const cached = path.join(dir, key);

    let buf;
    try { buf = await fsp.readFile(cached); }
    catch {
      buf = await fetchBinary(url);
      await fsp.writeFile(cached, buf);
    }
    return { ok: true, dataURI: 'data:' + mime + ';base64,' + buf.toString('base64'), bytes: buf.length };
  } catch (e){ return { ok: false, error: e.message }; }
});

ipcMain.handle('feed:fetch', async (_e, url) => {
  try { return { ok: true, data: await fetchJSON(url) }; }
  catch (e){ return { ok: false, error: e.message }; }
});
ipcMain.handle('feed:drop', async () => {
  try { return { ok: true, data: await readDrop() }; }
  catch (e){ return { ok: false, error: e.message }; }
});
ipcMain.handle('feed:dropDir', async () => {
  const dir = path.join(await resolveRoot(), DROP_DIRNAME);
  await fsp.mkdir(dir, { recursive: true }).catch(() => {});
  return dir;
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
  await migrateLegacyState().catch((e) => console.error('[slots] migration failed:', e.message));
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
