/* ── desktop / window manager ─────────────────────────────
 * Generic Win98 windows. Any app (briefs, mail, browser) calls
 * createWindow() and fills in .client itself; everything below —
 * focus, z-order, placement, drag, resize from any edge, snapping to a
 * half of the desk, min/max/close, arranging, taskbar — is app-agnostic.
 * Windows are keyed by string ("brief:3", "mail"). The geometry is in
 * wmgeom.js.
 */
const deskEl = $("desk"), winsEl = $("wins"), iconsEl = $("icons"), tasksEl = $("tasks");
const startBtn = $("startBtn"), smenu = $("smenu"), slist = $("slist");
const coarse = matchMedia("(pointer: coarse)").matches;

const wins = new Map();       // key -> win record
const shortcuts = new Map();  // key -> element
let zTop = 10, activeWin = null;
const ICON_COL = 104;         // the shortcut column new windows open clear of

function esc(s){ return String(s).replace(/[&<>]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[m])); }
// Silkscreen draws its ampersand as something close to a cent sign, so any
// label shown in the pixel face takes a slash instead.
function pixelLabel(s){ return String(s).replace(" & ", " / "); }

// The interface's own small sounds: music.js plays them in the key of the bar,
// if the music is up and the player has not switched them off.
function uiSound(name){ if (typeof Music !== "undefined" && Music.ui) Music.ui(name); }

/* ── shortcuts ─────────────────────────────────────────── */
function addShortcut(key, label, iconId, onOpen){
  if (shortcuts.has(key)) return shortcuts.get(key);
  const el = document.createElement("button");
  el.className = "sc";
  el.type = "button";
  el.dataset.key = key;
  el.innerHTML = iconSVG(iconId, 32) + '<span class="sc__l"></span>';
  el.querySelector(".sc__l").textContent = pixelLabel(label);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    selectShortcut(key);
    if (coarse) onOpen();              // no double-tap on touch
  });
  el.addEventListener("dblclick", (e) => { e.stopPropagation(); onOpen(); });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); onOpen(); }
  });
  iconsEl.appendChild(el);
  shortcuts.set(key, el);
  return el;
}
function selectShortcut(key){
  shortcuts.forEach((el, k) => el.classList.toggle("sel", k === key));
}
function clearSelection(){ shortcuts.forEach((el) => el.classList.remove("sel")); }

/* ── focus / z-order ───────────────────────────────────── */
function focusWin(w){
  if (activeWin && activeWin !== w && activeWin.el.isConnected){
    activeWin.el.classList.remove("on");
    activeWin.tb.classList.remove("on");
  }
  activeWin = w;
  w.el.classList.add("on");
  w.tb.classList.add("on");
  w.el.style.zIndex = String(++zTop);
  announceFocus();
}

// Whatever follows the front window (the music does) listens for this,
// so no app has to call it. An empty className is the bare desktop.
function announceFocus(){
  const w = activeWin && activeWin.el.isConnected && !activeWin.el.classList.contains("min") ? activeWin : null;
  document.dispatchEvent(new CustomEvent("wm:focus", { detail: { key: w ? w.key : null, className: w ? w.el.className : "" } }));
}

function getWin(key){ return wins.get(key) || null; }

function revealWin(w){
  if (w.el.classList.contains("min")) w.el.classList.remove("min");
  focusWin(w);
  return w;
}

/* ── geometry helpers ──────────────────────────────────── */
const deskSize = () => ({ w: deskEl.clientWidth || 900, h: deskEl.clientHeight || 600 });
const rectOf = (w) => ({ x: w.el.offsetLeft, y: w.el.offsetTop, w: w.el.offsetWidth, h: w.el.offsetHeight });
function setRect(w, r){
  w.el.style.left = Math.round(r.x) + "px"; w.el.style.top = Math.round(r.y) + "px";
  w.el.style.width = Math.round(r.w) + "px"; w.el.style.height = Math.round(r.h) + "px";
}
const isMin = (w) => w.el.classList.contains("min");
// The windows on show, back to front.
const shownWins = () => [...wins.values()].filter((w) => !isMin(w))
  .sort((a, b) => (Number(a.el.style.zIndex) || 0) - (Number(b.el.style.zIndex) || 0));

function minimizeWin(w){
  uiSound("min");
  w.el.classList.add("min");
  w.tb.classList.remove("on");
  if (w === activeWin) announceFocus();
}

// Out of maximized and out of any snap, keeping the current position.
function unsnap(w){
  if (w.el.classList.contains("max")) w.el.classList.remove("max");
  w.prev = null;
  w.snap = null;
}

/* ── the generic window ────────────────────────────────── */
function createWindow(opts){
  const { key, title, iconId, footer = "", className = "", onClose = null } = opts;

  const w = { key, briefIdx: 0, timers: [], prev: null, meta: opts.meta || {} };

  const el = document.createElement("div");
  el.className = "w98" + (className ? " " + className : "");
  el.innerHTML =
    '<div class="tbar">' +
      '<span class="tbar__i">' + iconSVG(iconId, 16) + '</span>' +
      '<span class="tbar__t"></span>' +
      '<span class="tbtns">' +
        '<button class="tb" data-w="min" aria-label="Minimize"><i class="gmin"></i></button>' +
        '<button class="tb" data-w="max" aria-label="Maximize"><i class="gmax"></i></button>' +
        '<button class="tb" data-w="cls" aria-label="Close"><i class="gcls"></i></button>' +
      '</span>' +
    '</div>' +
    '<div class="client"></div>' +
    (footer ? '<div class="wfoot">' + footer + '</div>' : '') +
    '<div class="grip"></div>' +
    // Every edge and corner resizes, as on the real thing.
    ["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((d) => '<div class="rs rs--' + d + '" data-rs="' + d + '"></div>').join("");

  w.el = el;
  w.client = el.querySelector(".client");
  w.titleEl = el.querySelector(".tbar__t");
  w.setTitle = (t) => {
    w.titleEl.textContent = t;
    const s = w.tb.querySelector("span");
    if (s) s.textContent = t;
  };

  // Open where it covers least of what is already open — beside the window
  // you are working in, not on top of it — and clear of the shortcut column
  // when there is room, so opening a window does not bury the icon it came from.
  const desk = deskSize();
  const ww = Math.min(opts.w || 600, Math.max(opts.minW || 250, desk.w - 70));
  const wh = Math.min(opts.h || 470, Math.max(opts.minH || 170, desk.h - 70));
  const spot = WinGeom.place(desk, { w: ww, h: wh }, shownWins().map(rectOf), { left: ICON_COL });
  setRect(w, spot);
  if (opts.minW) el.style.minWidth = opts.minW + "px";
  if (opts.minH) el.style.minHeight = opts.minH + "px";

  const tb = document.createElement("button");
  tb.className = "task";
  tb.type = "button";
  tb.innerHTML = '<i>' + iconSVG(iconId, 16) + '</i><span></span>';
  tb.addEventListener("click", () => {
    if (el.classList.contains("min")){ el.classList.remove("min"); focusWin(w); }
    else if (activeWin === w) minimizeWin(w);
    else focusWin(w);
  });
  w.tb = tb;
  w.onClose = onClose;

  el.addEventListener("pointerdown", () => focusWin(w), true);
  el.querySelector('[data-w="min"]').addEventListener("click", (e) => { e.stopPropagation(); minimizeWin(w); });
  el.querySelector('[data-w="max"]').addEventListener("click", (e) => { e.stopPropagation(); toggleMax(w); });
  el.querySelector('[data-w="cls"]').addEventListener("click", (e) => { e.stopPropagation(); closeWin(w); });
  el.querySelector(".tbar").addEventListener("dblclick", () => toggleMax(w));

  dragBy(el.querySelector(".tbar"), w, "move");
  dragBy(el.querySelector(".grip"), w, "size", "se");
  el.querySelectorAll("[data-rs]").forEach((h) => dragBy(h, w, "size", h.dataset.rs));

  winsEl.appendChild(el);
  tasksEl.appendChild(tb);
  wins.set(key, w);
  w.setTitle(title);
  focusWin(w);
  uiSound("open");
  return w;
}

function toggleMax(w){
  const el = w.el;
  if (el.classList.contains("max")){
    el.classList.remove("max");
    if (w.prev){ el.style.left = w.prev.x + "px"; el.style.top = w.prev.y + "px";
                 el.style.width = w.prev.w + "px"; el.style.height = w.prev.h + "px"; }
  } else {
    w.prev = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    el.classList.add("max");
  }
  focusWin(w);
}

function closeWin(w){
  clearWinTimers(w);
  if (!w.quietClose) uiSound("close");            // a window with its own goodbye (a call) sets quietClose
  if (typeof w.onClose === "function") { try { w.onClose(w); } catch (e) { console.error(e); } }
  // A docked window's neighbour gets the whole width back, if it is still
  // exactly where the dock put it (moved or resized since, it stays put).
  const d = w.dock;
  if (d && wins.get(d.other.key) === d.other && !isMin(d.other)){
    const r = rectOf(d.other);
    if (r.x === d.rect.x && r.y === d.rect.y && r.w === d.rect.w && r.h === d.rect.h)
      setRect(d.other, { x: WinGeom.GAP, y: d.rect.y, w: deskSize().w - WinGeom.GAP * 2, h: d.rect.h });
  }
  w.el.remove(); w.tb.remove();
  wins.delete(w.key);
  if (activeWin === w){
    activeWin = null;
    const last = [...wins.values()].pop();
    if (last) focusWin(last);
    else announceFocus();
  }
}

/* drag + resize; pointer capture keeps it alive outside the window.
 * mode "move" drags by the title bar and snaps at the desk's edges;
 * mode "size" drags the edge or corner named by dir (n, s, e, w, ne…). */
function dragBy(handle, w, mode, dir){
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".tb")) return;
    if (w.el.classList.contains("max")) return;
    e.preventDefault();
    focusWin(w);
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    const desk = deskSize(), deskBox = deskEl.getBoundingClientRect();
    const min = { w: parseInt(w.el.style.minWidth, 10) || 250, h: parseInt(w.el.style.minHeight, 10) || 170 };
    let start = rectOf(w), zone = null;

    // Dragging a snapped window away gives it back the size it had before,
    // still under the pointer at the same place along its title bar.
    if (mode === "move" && w.snap && w.unsnapped){
      const along = (sx - deskBox.left - start.x) / start.w;
      start = { x: sx - deskBox.left - along * w.unsnapped.w, y: start.y, w: w.unsnapped.w, h: w.unsnapped.h };
      setRect(w, start);
      w.snap = null;
    }
    if (mode === "size") w.snap = null;

    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === "move"){
        // keep at least a strip of titlebar reachable, like Win98
        w.el.style.left = clamp(start.x + dx, -(start.w - 90), desk.w - 90) + "px";
        w.el.style.top  = clamp(start.y + dy, 0, desk.h - 26) + "px";
        zone = WinGeom.snapZone(desk, ev.clientX - deskBox.left, ev.clientY - deskBox.top);
        showSnapGhost(zone && WinGeom.snapRect(desk, zone));
      } else {
        setRect(w, WinGeom.resize(start, dir, dx, dy, min, desk));
      }
    };
    const up = (ev) => {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      showSnapGhost(null);
      if (zone && ev.type === "pointerup") snapWin(w, zone);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
}

/* ── snapping ─────────────────────────────────────────────
 * Drag a title bar to the left or right edge and the window takes that half
 * of the desk; to the top edge, all of it. An outline shows where it will go
 * before you let go. */
const snapGhost = document.createElement("div");
snapGhost.className = "snapghost";
snapGhost.setAttribute("aria-hidden", "true");
deskEl.appendChild(snapGhost);

function showSnapGhost(r){
  snapGhost.classList.toggle("on", !!r);
  if (!r) return;
  snapGhost.style.left = r.x + "px"; snapGhost.style.top = r.y + "px";
  snapGhost.style.width = r.w + "px"; snapGhost.style.height = r.h + "px";
}

function snapWin(w, zone){
  if (zone === "max"){ if (!w.el.classList.contains("max")) toggleMax(w); return; }
  if (!w.snap) w.unsnapped = rectOf(w);
  w.snap = zone;
  setRect(w, WinGeom.snapRect(deskSize(), zone));
  focusWin(w);
}

/* ── arranging ────────────────────────────────────────────
 * The taskbar's own menu, as in Win98: right-click the taskbar, or use the
 * Arrange button beside Start. */
function arrangeWins(mode){
  if (mode === "min"){ shownWins().forEach(minimizeWin); return; }
  if (mode === "restore"){ [...wins.values()].filter(isMin).forEach((w) => w.el.classList.remove("min")); const f = shownWins().pop(); if (f) focusWin(f); return; }
  const list = shownWins();                          // back to front
  if (!list.length) return;
  const desk = deskSize();
  // A cascade ends with the front window on top at the foot of the stair;
  // tiles give the front window the first place.
  const order = mode === "cascade" ? list : list.slice().reverse();
  const rects = mode === "cascade" ? WinGeom.cascade(desk, order.length) : WinGeom.tile(desk, order.length, mode);
  order.forEach((w, i) => { unsnap(w); setRect(w, rects[i]); });
  if (mode === "cascade") order.forEach(focusWin);
  else focusWin(order[0]);
}

// Two windows side by side, e.g. a live call and the site it is about:
// `first` keeps its width on the left, `second` takes the rest.
function pairWins(first, second){
  if (!first || !second || first === second) return;
  const [a, b] = WinGeom.pair(deskSize(), first.el.offsetWidth);
  [[first, a], [second, b]].forEach(([w, r]) => { w.el.classList.remove("min"); unsnap(w); setRect(w, r); });
  focusWin(first);
  focusWin(second);
}

// A slim window down one side of the desk at full height, at the width it
// already has; `other`, if given, takes the rest. A call docks like this so
// the page it is about gets most of the screen. `other` ends up in front.
function dockWins(docked, other, side = "right"){
  if (!docked) return;
  const [a, b] = WinGeom.dock(deskSize(), docked.el.offsetWidth, side);
  const pairs = [[docked, a]];
  if (other && other !== docked) pairs.push([other, b]);
  pairs.forEach(([w, r]) => { w.el.classList.remove("min"); unsnap(w); setRect(w, r); });
  docked.dock = other && other !== docked ? { other, rect: b } : null;   // closeWin gives the space back
  focusWin(docked);
  if (other && other !== docked) focusWin(other);
}

const arrangeMenu = document.createElement("div");
arrangeMenu.className = "ctxm";
arrangeMenu.setAttribute("role", "menu");
arrangeMenu.innerHTML = [
  ["cascade", "Cascade Windows"], ["cols", "Tile Windows Side by Side"], ["rows", "Tile Windows Stacked"], null,
  ["min", "Minimize All Windows"], ["restore", "Restore All Windows"],
].map((it) => it ? '<button class="si" type="button" role="menuitem" data-arrange="' + it[0] + '"><i>' +
  iconSVG({ cascade: "cascade", cols: "tile-cols", rows: "tile-rows", min: "min-all", restore: "restore" }[it[0]], 16) +
  "</i><span>" + it[1] + "</span></button>" : '<div class="ssep"></div>').join("");
smenu.parentNode.appendChild(arrangeMenu);

const arrangeBtn = document.createElement("button");
arrangeBtn.className = "qlaunch";
arrangeBtn.type = "button";
arrangeBtn.title = "Arrange windows — or right-click the taskbar";
arrangeBtn.setAttribute("aria-label", "Arrange windows");
arrangeBtn.setAttribute("aria-haspopup", "true");
arrangeBtn.innerHTML = iconSVG("arrange", 16);
startBtn.insertAdjacentElement("afterend", arrangeBtn);

function toggleArrange(open, x){
  const next = open === undefined ? !arrangeMenu.classList.contains("on") : open;
  arrangeMenu.classList.toggle("on", next);
  arrangeBtn.classList.toggle("on", next);
  if (!next) return;
  uiSound("menu");
  const any = wins.size > 0;
  arrangeMenu.querySelectorAll("[data-arrange]").forEach((b) => {
    const m = b.dataset.arrange;
    b.disabled = m === "restore" ? ![...wins.values()].some(isMin) : !any || (m !== "min" && !shownWins().length);
  });
  const host = arrangeMenu.parentNode.getBoundingClientRect();
  const left = x === undefined ? arrangeBtn.getBoundingClientRect().left - host.left : x - host.left;
  arrangeMenu.style.left = Math.max(4, Math.min(left, host.width - arrangeMenu.offsetWidth - 4)) + "px";
  const first = arrangeMenu.querySelector("[data-arrange]:not(:disabled)");
  if (first) first.focus({ preventScroll: true });
}
arrangeBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleArrange(); });
startBtn.parentNode.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".tray")) return;
  e.preventDefault();
  toggleArrange(true, e.clientX);
});
arrangeMenu.addEventListener("click", (e) => {
  const b = e.target.closest("[data-arrange]");
  if (!b || b.disabled) return;
  uiSound("pick");
  toggleArrange(false);
  arrangeWins(b.dataset.arrange);
});
arrangeMenu.addEventListener("keydown", (e) => { if (e.key === "Escape"){ toggleArrange(false); arrangeBtn.focus(); } });
document.addEventListener("pointerdown", (e) => {
  if (arrangeMenu.classList.contains("on") && !arrangeMenu.contains(e.target) && !arrangeBtn.contains(e.target)) toggleArrange(false);
});

/* ── brief windows ─────────────────────────────────────── */
function briefKey(ci){ return "brief:" + ci; }

function openBrief(ci){
  const cat = CATS[ci];
  addShortcut(briefKey(ci), cat.label, cat.id, () => openBrief(ci));
  const existing = getWin(briefKey(ci));
  if (existing) return revealWin(existing);

  const w = createWindow({
    key: briefKey(ci), title: "BRIEF", iconId: cat.id, w: 600, h: 470,
    footer: '<button class="w98btn" data-w="next">Next Brief</button>' +
            '<div class="wstat"><span class="wstat__n"></span><span class="wstat__t"></span></div>',
    meta: { ci },
  });
  w.ci = ci;
  w.el.querySelector('[data-w="next"]').addEventListener("click", (e) => {
    e.stopPropagation();
    if (finishReveal(w)) return;
    w.briefIdx = (w.briefIdx + 1) % CATS[w.ci].briefs.length;
    renderInto(w);
  });
  w.client.addEventListener("click", () => finishReveal(w));
  renderInto(w);
  return w;
}

// Open a brief window pinned to one specific brief (the one a client mailed).
function openBriefAt(ci, briefIdx){
  const w = openBrief(ci);
  if (w.briefIdx !== briefIdx){
    w.briefIdx = briefIdx;
    renderInto(w);
  }
  return w;
}
