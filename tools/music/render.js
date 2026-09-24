"use strict";
// Renders the soundtrack to WAV files, one per arrangement, on the game's own
// instruments (src/js/music/synth.js) inside Electron's Chromium: the same
// audio engine the game plays through, so the files sound like the desk.
//
//   ./node_modules/.bin/electron tools/music/render.js <out-dir>
//
// For files to share, AAC is smaller and plays everywhere:
//   afconvert -f m4af -d aac -b 192000 1-hub.wav 1-hub.m4a
const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs"), os = require("os"), path = require("path");

const out = path.resolve(process.argv.slice(2).find((a) => !a.startsWith("-") && !a.endsWith(".js")) || "music-out");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "pc-music-")));   // never the game's own

app.whenReady().then(async () => {
  if (app.dock) app.dock.hide();
  fs.mkdirSync(out, { recursive: true });
  ipcMain.handle("tool:save", (e, name, bytes) => {
    const file = path.join(out, path.basename(name));
    fs.writeFileSync(file, Buffer.from(bytes));
    console.log("wrote " + file);
    return file;
  });
  ipcMain.on("tool:log", (e, msg) => console.log(msg));
  ipcMain.handle("tool:done", (e, report) => {
    console.log(JSON.stringify(report, null, 2));
    setTimeout(() => app.exit(report && report.error ? 1 : 0), 50);
    return true;
  });
  const w = new BrowserWindow({ show: false, webPreferences: { preload: path.join(__dirname, "preload.js") } });
  w.webContents.on("console-message", (e, level, message) => console.log("[page] " + (e.message || message)));
  await w.loadFile(path.join(__dirname, "render.html"));
});
