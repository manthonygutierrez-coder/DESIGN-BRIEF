/* ── desktop / window manager ─────────────────────────────
 * Generic Win98 windows. Any app (briefs, mail, browser) calls
 * createWindow() and fills in .client itself; everything below —
 * focus, z-order, cascade, drag, resize, min/max/close, taskbar —
 * is app-agnostic. Windows are keyed by string ("brief:3", "mail").
 */
const deskEl = $("desk"), winsEl = $("wins"), iconsEl = $("icons"), tasksEl = $("tasks");
const startBtn = $("startBtn"), smenu = $("smenu"), slist = $("slist");
const coarse = matchMedia("(pointer: coarse)").matches;

const wins = new Map();       // key -> win record
const shortcuts = new Map();  // key -> element
let zTop = 10, cascade = 0, activeWin = null;

function esc(s){ return String(s).replace(/[&<>]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[m])); }
// Silkscreen draws its ampersand as something close to a cent sign, so any
// label shown in the pixel face takes a slash instead.
function pixelLabel(s){ return String(s).replace(" & ", " / "); }

/* ── shortcuts ─────────────────────────────────────────── */
function addShortcut(key, label, iconId, onOpen){
  if (shortcuts.has(key)) return shortcuts.get(key);
  const el = document.createElement("button");
  el.className = "sc";
  el.type = "button";
  el.dataset.key = key;
  el.innerHTML = iconSVG(iconId, 34) + '<span class="sc__l"></span>';
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
}

function getWin(key){ return wins.get(key) || null; }

function revealWin(w){
  if (w.el.classList.contains("min")) w.el.classList.remove("min");
  focusWin(w);
  return w;
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
    '<div class="grip"></div>';

  w.el = el;
  w.client = el.querySelector(".client");
  w.titleEl = el.querySelector(".tbar__t");
  w.setTitle = (t) => {
    w.titleEl.textContent = t;
    const s = w.tb.querySelector("span");
    if (s) s.textContent = t;
  };

  // Cascade like the real thing. Leave slack for the offset, and scale the
  // step to whatever slack actually exists so small desks still fan out
  // instead of stacking every window on one clamped position.
  const dw = deskEl.clientWidth || 900, dh = deskEl.clientHeight || 600;
  const ww = Math.min(opts.w || 600, Math.max(opts.minW || 250, dw - 70));
  const wh = Math.min(opts.h || 470, Math.max(opts.minH || 170, dh - 70));
  // Start clear of the shortcut column when there is room, so opening a window
  // does not bury the desktop icons it came from.
  const iconCol = 104;
  const baseX = (dw - ww > iconCol + 16) ? iconCol : 8;
  const slackX = Math.max(0, dw - ww - baseX - 8), slackY = Math.max(0, dh - wh - 16);
  const stepX = Math.max(6, Math.min(26, slackX / 6)), stepY = Math.max(6, Math.min(26, slackY / 6));
  const n = cascade % 7;
  cascade++;
  let x = Math.round(baseX + n * stepX), y = Math.round(8 + n * stepY);
  if (x + ww > dw) x = Math.max(4, dw - ww - 4);
  if (y + wh > dh) y = Math.max(4, dh - wh - 4);
  el.style.left = x + "px"; el.style.top = y + "px";
  el.style.width = ww + "px"; el.style.height = wh + "px";
  if (opts.minW) el.style.minWidth = opts.minW + "px";
  if (opts.minH) el.style.minHeight = opts.minH + "px";

  const tb = document.createElement("button");
  tb.className = "task";
  tb.type = "button";
  tb.innerHTML = '<i>' + iconSVG(iconId, 14) + '</i><span></span>';
  tb.addEventListener("click", () => {
    if (el.classList.contains("min")){ el.classList.remove("min"); focusWin(w); }
    else if (activeWin === w){ el.classList.add("min"); tb.classList.remove("on"); }
    else focusWin(w);
  });
  w.tb = tb;
  w.onClose = onClose;

  el.addEventListener("pointerdown", () => focusWin(w), true);
  el.querySelector('[data-w="min"]').addEventListener("click", (e) => {
    e.stopPropagation(); el.classList.add("min"); tb.classList.remove("on");
  });
  el.querySelector('[data-w="max"]').addEventListener("click", (e) => { e.stopPropagation(); toggleMax(w); });
  el.querySelector('[data-w="cls"]').addEventListener("click", (e) => { e.stopPropagation(); closeWin(w); });
  el.querySelector(".tbar").addEventListener("dblclick", () => toggleMax(w));

  dragBy(el.querySelector(".tbar"), w, "move");
  dragBy(el.querySelector(".grip"), w, "size");

  winsEl.appendChild(el);
  tasksEl.appendChild(tb);
  wins.set(key, w);
  w.setTitle(title);
  focusWin(w);
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
  if (typeof w.onClose === "function") { try { w.onClose(w); } catch (e) { console.error(e); } }
  w.el.remove(); w.tb.remove();
  wins.delete(w.key);
  if (activeWin === w){
    activeWin = null;
    const last = [...wins.values()].pop();
    if (last) focusWin(last);
  }
}

/* drag + resize; pointer capture keeps it alive outside the window */
function dragBy(handle, w, mode){
  handle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest(".tb")) return;
    if (mode === "move" && w.el.classList.contains("max")) return;
    e.preventDefault();
    focusWin(w);
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY;
    const ox = w.el.offsetLeft, oy = w.el.offsetTop;
    const ow = w.el.offsetWidth, oh = w.el.offsetHeight;
    const dw = deskEl.clientWidth, dh = deskEl.clientHeight;
    const minW = parseInt(w.el.style.minWidth, 10) || 250;
    const minH = parseInt(w.el.style.minHeight, 10) || 170;

    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === "move"){
        // keep at least a strip of titlebar reachable, like Win98
        w.el.style.left = clamp(ox + dx, -(ow - 90), dw - 90) + "px";
        w.el.style.top  = clamp(oy + dy, 0, dh - 26) + "px";
      } else {
        w.el.style.width  = clamp(ow + dx, minW, dw - w.el.offsetLeft) + "px";
        w.el.style.height = clamp(oh + dy, minH, dh - w.el.offsetTop) + "px";
      }
    };
    const up = (ev) => {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
}

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
