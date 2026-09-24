"use strict";
// The music tools' only way out of their page: save a file, film, send real
// input, log, finish.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tool", {
  save: (name, bytes) => ipcRenderer.invoke("tool:save", name, bytes),
  rec: (on) => ipcRenderer.invoke("tool:rec", !!on),              // film.js: start or stop filming
  input: (ev) => ipcRenderer.invoke("tool:input", ev),            // film.js: a real mouse or key event
  log: (msg) => ipcRenderer.send("tool:log", String(msg)),
  done: (report) => ipcRenderer.invoke("tool:done", report),
});
