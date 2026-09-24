"use strict";
// The music tools' only way out of their page: save a file, log, finish.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tool", {
  save: (name, bytes) => ipcRenderer.invoke("tool:save", name, bytes),
  log: (msg) => ipcRenderer.send("tool:log", String(msg)),
  done: (report) => ipcRenderer.invoke("tool:done", report),
});
