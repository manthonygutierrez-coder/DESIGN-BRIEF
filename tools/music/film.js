"use strict";
// Films one gig, start to finish, in a hidden copy of the game with its music
// playing: the music video. Every frame the page paints goes to macOS's own
// H.264 encoder, and the music is recorded inside the page from the same mix
// the desk plays, then the two are joined without re-encoding.
//
//   ./node_modules/.bin/electron tools/music/film.js <out-dir>
//
// The copy runs without the game's preload, so it saves to its own storage
// and never writes to ~/Documents; it is muted, so nobody hears it filming.
// The script it acts out is tools/music/film-page.js.
const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");

const ROOT = path.resolve(__dirname, "../.."), W = 1280, H = 800, FPS = 30;
const out = path.resolve(process.argv.slice(2).find((a) => !a.startsWith("-") && !a.endsWith(".js")) || "film-out");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pc-film-"));
app.setPath("userData", path.join(tmp, "profile"));
const log = (...a) => console.log("[film " + ((Date.now() - started) / 1000).toFixed(1) + "s]", ...a);
const started = Date.now();

// The native tools, built once into the scratch folder.
function build(name, lib) {
  const bin = path.join(tmp, "pc-" + name);
  execFileSync("swiftc", ["-O"].concat(lib ? ["-parse-as-library"] : []).concat([path.join(__dirname, name + ".swift"), "-o", bin]));
  return bin;
}

app.whenReady().then(async () => {
  if (app.dock) app.dock.hide();
  fs.mkdirSync(out, { recursive: true });
  const encodeBin = build("encode"), muxBin = build("mux", true);
  log("tools built");

  const w = new BrowserWindow({
    width: W, height: H, show: false, useContentSize: true,
    webPreferences: { offscreen: true, preload: path.join(__dirname, "preload.js"), backgroundThrottling: false, autoplayPolicy: "no-user-gesture-required" },
  });
  w.webContents.setAudioMuted(true);
  w.webContents.setFrameRate(FPS);
  w.webContents.on("console-message", (e, level, message) => {
    const m = e.message || message;
    if (/error|warn|film/i.test(m)) console.log("[page] " + m);
  });

  // The latest painted frame, as raw BGRA; the pump repeats it until the next.
  let frame = null, fw = 0, fh = 0;
  w.webContents.on("paint", (e, dirty, image) => {
    const s = image.getSize();
    if (s.width !== W || s.height !== H) { fw = s.width; fh = s.height; return; }
    frame = image.toBitmap();
  });

  let enc = null, pump = 0, t0 = 0, n = 0, video = path.join(tmp, "picture.mp4");
  const encoded = new Promise((resolve) => { ipcMain.once("film:encoded", resolve); });
  ipcMain.handle("tool:rec", (e, on) => {
    if (on && !enc) {
      enc = spawn(encodeBin, [video, String(W), String(H), String(FPS)], { stdio: ["pipe", "inherit", "inherit"] });
      enc.on("exit", (code) => { log("encoder done", code); ipcMain.emit("film:encoded"); });
      t0 = Date.now(); n = 0;
      pump = setInterval(() => {
        const due = Math.floor(((Date.now() - t0) * FPS) / 1000);
        while (frame && n <= due) { enc.stdin.write(frame); n++; }
      }, 4);
      log("recording");
      return t0;
    }
    if (!on && enc) {
      clearInterval(pump);
      enc.stdin.end();
      log("stopped after " + n + " frames (" + (n / FPS).toFixed(1) + "s)");
      return n / FPS;
    }
    return 0;
  });
  // Real input, so the page reacts exactly as it would to a person.
  ipcMain.handle("tool:input", (e, ev) => { w.webContents.sendInputEvent(ev); return true; });
  ipcMain.handle("tool:save", (e, name, bytes) => {
    const file = path.join(tmp, path.basename(name));
    fs.writeFileSync(file, Buffer.from(bytes));
    log("saved " + name + " (" + Math.round(bytes.byteLength / 1024) + " KB)");
    return file;
  });
  ipcMain.on("tool:log", (e, msg) => log(msg));
  ipcMain.handle("tool:done", async (e, report) => {
    log("director finished", JSON.stringify(report));
    try {
      if (enc) await encoded;
      const wav = path.join(tmp, "music.wav"), m4a = path.join(tmp, "music.m4a"), final = path.join(out, "pixel-crossing-one-gig.mp4");
      if (fs.existsSync(wav)) {
        execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "192000", wav, m4a]);
        const offset = Math.max(0, ((report && report.audioLead) || 0) / 1000);
        console.log(execFileSync(muxBin, [video, m4a, final, String(offset)]).toString().trim());
        log("wrote " + final);
      } else log("no music was saved; the picture alone is at " + video);
      if (fw) log("note: some frames were " + fw + "x" + fh + " and were skipped");
    } catch (err) { log("finishing failed: " + err.message); }
    setTimeout(() => app.exit(report && report.error ? 1 : 0), 100);
    return true;
  });

  const url = "file://" + path.join(ROOT, "src/index.html") + "?slot=hustle";
  await w.loadURL(url);
  log("game loaded; handing over to the director");
  await w.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, "film-page.js"), "utf8") + "\n//# sourceURL=film-page.js");
});
