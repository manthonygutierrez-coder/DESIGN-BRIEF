"use strict";
/* Thin wrapper over the preload API.
 *
 * Everything downstream talks to `Bridge`, never to `window.crossing` directly,
 * so the renderer runs in three situations without branching at the call site:
 *   - inside Electron  → real filesystem, real state.json
 *   - in a browser tab → localStorage state, no filesystem (fast iteration)
 *   - preload failed   → same as a browser tab, app still boots
 * `Bridge.native` tells the UI which affordances to show. */

const Bridge = (() => {
  const api = typeof window !== "undefined" ? window.crossing : null;
  const native = !!(api && typeof api.getState === "function");
  const LS_KEY = "pixel-crossing:state";
  const EMPTY = { version: 1, projectsRoot: null, mail: [], projects: {}, issued: [] };

  let memory = null;      // browser fallback cache
  let saveTimer = 0;
  let pending = null;

  async function getState(){
    if (native){
      try { return await api.getState(); }
      catch (e){ console.error("[bridge] getState failed, using local:", e.message); }
    }
    if (memory) return memory;
    try {
      const raw = localStorage.getItem(LS_KEY);
      memory = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
    } catch { memory = { ...EMPTY }; }
    return memory;
  }

  // Callers mutate freely; writes are collapsed so a burst of UI changes
  // becomes one disk write.
  function saveState(state){
    memory = state;
    pending = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }

  async function flush(){
    const state = pending;
    if (!state) return;
    pending = null;
    if (native){
      try { await api.saveState(state); return; }
      catch (e){ console.error("[bridge] saveState failed, using local:", e.message); }
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota — nothing to do */ }
  }

  const unsupported = (what) => () => {
    console.warn("[bridge] " + what + " needs the desktop app");
    return Promise.resolve(null);
  };

  return {
    native,
    getState,
    saveState,
    flush,
    getProjectsRoot:    native ? () => api.getProjectsRoot()          : unsupported("projects root"),
    chooseProjectsRoot: native ? () => api.chooseProjectsRoot()       : unsupported("choosing a folder"),
    createProject:      native ? (d, p) => api.createProject(d, p)    : unsupported("creating a project folder"),
    listProjectImages:  native ? (d) => api.listProjectImages(d)      : async () => ({}),
    thumbnail:          native ? (f, n) => api.thumbnail(f, n)        : async () => null,
    revealProject:      native ? (t) => api.revealProject(t)          : unsupported("revealing in Finder"),
    pickFiles:          native ? () => api.pickFiles()                : async () => [],
    onProjectsChanged:  native ? (cb) => api.onProjectsChanged(cb)    : () => () => {},
  };
})();
