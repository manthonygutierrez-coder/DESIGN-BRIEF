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
  const LS_BASE = "pixel-crossing:state";
  let slot = "studio";
  // Studio keeps the original key so existing browser-tab state is not lost.
  const lsKey = () => (slot === "studio" ? LS_BASE : LS_BASE + ":" + slot);
  const EMPTY = { version: 1, projectsRoot: null, mail: [], projects: {}, issued: [] };

  let memory = null;      // the one shared state object for the active slot
  let saveTimer = 0;
  let pending = null;

  // Chosen once per session, at logon, before anything reads state. Switching
  // slots reloads the renderer instead (see Session), so no module ever holds a
  // reference to the other slot's state.
  async function useSlot(next){
    if (next !== "studio" && next !== "hustle") throw new Error("unknown slot " + next);
    if (memory && next !== slot) throw new Error("slot already in use this session");
    slot = next;
    if (native && typeof api.useSlot === "function") await api.useSlot(next);
    return slot;
  }

  // Every caller gets the SAME object, loaded once.
  //
  // This matters more than it looks. Mail and Feed both hold the state and both
  // call saveState with their own reference; if getState handed out a fresh copy
  // per call, whichever saved last would silently wipe the other's keys — Mail
  // saves on every message, so the feed's configured URL disappeared on restart
  // and scheduled briefs quietly stopped arriving. One shared object, one truth.
  async function getState(){
    if (memory) return memory;
    if (native){
      try { memory = await api.getState(); return memory; }
      catch (e){ console.error("[bridge] getState failed, using local:", e.message); }
    }
    try {
      const raw = localStorage.getItem(lsKey());
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
    try { localStorage.setItem(lsKey(), JSON.stringify(state)); } catch { /* quota — nothing to do */ }
  }

  const unsupported = (what) => () => {
    console.warn("[bridge] " + what + " needs the desktop app");
    return Promise.resolve(null);
  };

  return {
    native,
    useSlot,
    slot: () => slot,
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

    // Feed. In a plain browser tab there is no main process to fetch through,
    // so the feed simply reports as unavailable rather than half-working.
    feedFetch:  native ? (url) => api.feedFetch(url) : async () => ({ ok:false, error:"needs the desktop app" }),
    feedDrop:   native ? () => api.feedDrop()        : async () => ({ ok:false, error:"needs the desktop app" }),
    feedDropDir:native ? () => api.feedDropDir()     : async () => null,
    feedAsset:  native ? (u) => api.feedAsset(u)     : async () => ({ ok:false, error:"needs the desktop app" }),

    // Design suite. In a browser tab exports download instead of landing in a
    // project folder, so the suite is still usable for iteration.
    suiteSave:  native ? (req) => api.suiteSave(req) : async () => ({ ok:false, error:"needs the desktop app" }),
    suiteOpen:  native ? () => api.suiteOpen()       : async () => ({ ok:false, error:"needs the desktop app" }),
  };
})();
