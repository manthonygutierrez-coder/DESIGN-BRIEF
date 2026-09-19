"use strict";
/* ── the reference board ──────────────────────────────────
 * Where an artist keeps what they are drawing from, like PureRef: a slim
 * panel floating over the desktop, there when you want to look and out of the
 * way when you draw.
 *
 *   idle     faint, and click-through: you can draw straight through it.
 *            Only its header strip takes clicks.
 *   active   hover the header, hold ` (backtick), or click REF in the tray.
 *            Opaque; switch pins, wheel to zoom, drag to pan, H flips it,
 *            G turns it grey to check values.
 *   docked   drag it to a screen edge for a full-height column; drop it on
 *            the taskbar to tuck it into the tray. Double-click the header
 *            to swap between docked and floating.
 *
 * There is deliberately no eyedropper: the board is for looking. Exact
 * colours come from research. Dragging a pin's tab onto a suite canvas marks
 * where you are drawing that character (see suite.js, dropPin).
 *
 * Pins live in the active save slot under state.suite.refboard.
 */

const RefBoard = (() => {
  const MAX = 8;
  const MIN_W = 180, MIN_H = 200;
  let state = null;
  let el = null, trayBtn = null;
  let active = false, sticky = false, held = false, hover = false, leaveTimer = 0;
  let zoom = 1, panX = 0, panY = 0, fitScale = 1;

  const S = () => state.suite.refboard;
  const save = () => Bridge.saveState(state);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const screen = () => document.getElementById("sideScreen");

  async function boot() {
    state = await Bridge.getState();
    if (!state.suite || typeof state.suite !== "object") state.suite = {};
    const r = state.suite.refboard && typeof state.suite.refboard === "object" ? state.suite.refboard : {};
    state.suite.refboard = {
      pins: (Array.isArray(r.pins) ? r.pins : []).filter((p) => p && typeof p.src === "string" && /^data:image\//.test(p.src)).slice(-MAX),
      cur: typeof r.cur === "string" ? r.cur : null,
      x: Number.isFinite(r.x) ? r.x : null, y: Number.isFinite(r.y) ? r.y : 60,
      w: Math.max(MIN_W, Number(r.w) || 250), h: Math.max(MIN_H, Number(r.h) || 330),
      dock: ["left", "right", "tray"].includes(r.dock) ? r.dock : (r.pins && r.pins.length ? null : "tray"),
      flip: !!r.flip, grey: !!r.grey,
    };
    mount();
    place();
    paint();
  }

  /* ── pins ──────────────────────────────────────────────── */
  function pin(p) {
    if (!state || !p || typeof p.src !== "string" || !/^data:image\//.test(p.src)) return null;
    const pins = S().pins;
    let hit = pins.find((x) => x.src === p.src);
    if (!hit) {
      hit = {
        id: "R" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
        src: p.src, label: String(p.label || "Reference").slice(0, 60),
        char: p.char || null, pose: p.pose || null, variant: p.variant || null,
      };
      pins.push(hit);
      while (pins.length > MAX) pins.shift();
    }
    S().cur = hit.id;
    if (S().dock === "tray") S().dock = null;
    resetView();
    place();
    paint();
    save();
    // Show that it landed, then fade back out of the way.
    setActive(true);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => { if (!hover && !held && !sticky) setActive(false); }, 1400);
    return hit.id;
  }

  const get = (id) => (state ? S().pins.find((p) => p.id === id) || null : null);
  const current = () => get(S().cur) || S().pins[S().pins.length - 1] || null;

  function unpin(id) {
    S().pins = S().pins.filter((p) => p.id !== id);
    if (S().cur === id) S().cur = null;
    paint();
    save();
  }

  /* ── the element ───────────────────────────────────────── */
  function mount() {
    el = document.createElement("div");
    el.className = "rb";
    el.innerHTML =
      '<div class="rb__head" title="Reference board — hover to use, drag to move, double-click to dock">' +
        '<span class="rb__grab">REF</span><span class="rb__tabs"></span><span class="rb__sp"></span>' +
        '<button class="rb__b" data-rb="flip" title="Flip it (H) — mistakes jump out">⇋</button>' +
        '<button class="rb__b" data-rb="grey" title="Greyscale (G) — check the values">◐</button>' +
        '<button class="rb__b" data-rb="dock" title="Dock to the side, or float">▮</button>' +
        '<button class="rb__b" data-rb="tray" title="Tuck into the tray">_</button>' +
      "</div>" +
      '<div class="rb__view"><img class="rb__img" alt="" draggable="false"><p class="rb__empty">Pin references here. Open a picture and choose <b>Pin reference</b>.</p></div>' +
      '<div class="rb__foot"><span class="rb__label"></span><button class="rb__b" data-rb="unpin" title="Unpin this one">×</button></div>' +
      '<div class="rb__grip" title="Resize"></div>';
    screen().appendChild(el);

    const head = el.querySelector(".rb__head");
    head.addEventListener("pointerenter", () => { hover = true; setActive(true); });
    el.addEventListener("pointerenter", () => { if (active) hover = true; });
    el.addEventListener("pointerleave", () => {
      hover = false;
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { if (!hover && !held && !sticky) setActive(false); }, 260);
    });
    el.addEventListener("click", onClick);
    head.addEventListener("dblclick", (e) => {
      if (e.target.closest("button")) return;
      S().dock = S().dock ? null : "right";
      place(); save();
    });
    head.addEventListener("pointerdown", startMove);
    el.querySelector(".rb__grip").addEventListener("pointerdown", startResize);

    const view = el.querySelector(".rb__view");
    view.addEventListener("wheel", (e) => {
      if (!active) return;
      e.preventDefault();
      zoom = Math.max(0.25, Math.min(8, zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      transform();
    }, { passive: false });
    view.addEventListener("pointerdown", (e) => {
      if (!active || e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY, px = panX, py = panY;
      view.setPointerCapture(e.pointerId);
      const move = (m) => { panX = px + m.clientX - sx; panY = py + m.clientY - sy; transform(); };
      const up = () => { view.removeEventListener("pointermove", move); view.removeEventListener("pointerup", up); };
      view.addEventListener("pointermove", move);
      view.addEventListener("pointerup", up);
    });
    view.addEventListener("dblclick", () => { resetView(); transform(); });
    el.querySelector(".rb__img").addEventListener("load", () => { fit(); transform(); });

    // Tabs are the drag handles: drop one on a canvas to mark who you drew.
    el.addEventListener("dragstart", (e) => {
      const t = e.target.closest && e.target.closest("[data-pin]");
      if (!t) return;
      e.dataTransfer.setData("text/x-pxpin", t.dataset.pin);
      e.dataTransfer.effectAllowed = "copy";
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest("input,textarea,select")) return;
      if (e.code === "Backquote") { if (!held) { held = true; setActive(true); } e.preventDefault(); return; }
      if (!active) return;
      if (e.key === "h" || e.key === "H") { toggle("flip"); e.stopPropagation(); }
      if (e.key === "g" || e.key === "G") { toggle("grey"); e.stopPropagation(); }
    }, true);
    document.addEventListener("keyup", (e) => {
      if (e.code === "Backquote") { held = false; if (!hover && !sticky) setActive(false); }
    });

    mountTray();
    window.addEventListener("resize", place);
  }

  function mountTray() {
    const tray = document.querySelector(".tray");
    if (!tray || trayBtn) return;
    trayBtn = document.createElement("button");
    trayBtn.className = "tray__ref";
    trayBtn.type = "button";
    trayBtn.innerHTML = "<i>" + (typeof iconSVG === "function" ? iconSVG("ref", 14) : "") + "</i><span>REF</span>";
    trayBtn.addEventListener("click", () => {
      if (S().dock === "tray") { S().dock = null; place(); sticky = true; setActive(true); }
      else { sticky = !sticky; setActive(sticky); }
      paintTray();
      save();
    });
    tray.insertBefore(trayBtn, tray.firstChild);
  }

  function setActive(on) {
    active = on;
    if (el) el.classList.toggle("on", on);
  }

  function toggle(k) {
    S()[k] = !S()[k];
    paint();
    save();
  }

  function onClick(e) {
    const b = e.target.closest("[data-rb],[data-pin]");
    if (!b) return;
    if (b.dataset.pin) { S().cur = b.dataset.pin; resetView(); paint(); save(); return; }
    const a = b.dataset.rb;
    if (a === "flip" || a === "grey") toggle(a);
    if (a === "dock") { S().dock = S().dock === "left" || S().dock === "right" ? null : "right"; place(); save(); }
    if (a === "tray") { S().dock = "tray"; sticky = false; setActive(false); place(); save(); }
    if (a === "unpin") { const c = current(); if (c) unpin(c.id); }
  }

  /* ── placement: floating, docked, or in the tray ───────── */
  function bounds() {
    const r = screen().getBoundingClientRect();
    return { w: r.width, h: r.height - 40 };           // above the taskbar
  }

  function place() {
    if (!el) return;
    const b = bounds(), st = S();
    el.dataset.dock = st.dock || "";
    el.hidden = st.dock === "tray";
    if (st.dock === "left" || st.dock === "right") {
      el.style.top = "0px"; el.style.height = b.h + "px";
      el.style.width = Math.min(st.w, Math.round(b.w * 0.45)) + "px";
      el.style.left = st.dock === "left" ? "0px" : (b.w - Math.min(st.w, Math.round(b.w * 0.45))) + "px";
    } else if (st.dock !== "tray") {
      const w = Math.min(st.w, b.w - 8), h = Math.min(st.h, b.h - 8);
      const x = st.x === null ? b.w - w - 12 : Math.max(0, Math.min(b.w - w, st.x));
      const y = Math.max(0, Math.min(b.h - h, st.y));
      Object.assign(el.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    }
    paintTray();
    fit(); transform();
  }

  function startMove(e) {
    if (e.button !== 0 || e.target.closest("button,[data-pin]")) return;
    const b = bounds(), r = el.getBoundingClientRect(), sr = screen().getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const wasDocked = S().dock;
    if (wasDocked) { S().dock = null; S().h = Math.min(S().h, b.h - 8); }
    el.classList.add("moving");
    const move = (m) => {
      S().x = m.clientX - sr.left - dx; S().y = m.clientY - sr.top - dy;
      place();
      const edge = m.clientX - sr.left < 18 ? "left" : m.clientX - sr.left > b.w - 18 ? "right" : m.clientY - sr.top > b.h ? "tray" : "";
      el.dataset.target = edge;
    };
    const up = (u) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      el.classList.remove("moving");
      const target = el.dataset.target;
      el.dataset.target = "";
      if (target) { S().dock = target; if (target === "tray") { sticky = false; setActive(false); } }
      place();
      save();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  function startResize(e) {
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, w0 = el.offsetWidth, h0 = el.offsetHeight, dock = S().dock;
    const move = (m) => {
      if (dock === "left") S().w = Math.max(MIN_W, w0 + m.clientX - sx);
      else if (dock === "right") S().w = Math.max(MIN_W, w0 - (m.clientX - sx));
      else { S().w = Math.max(MIN_W, w0 + m.clientX - sx); S().h = Math.max(MIN_H, h0 + m.clientY - sy); }
      place();
    };
    const up = () => { document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); save(); };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  /* ── painting ──────────────────────────────────────────── */
  function paint() {
    if (!el) return;
    const st = S(), c = current();
    el.querySelector(".rb__tabs").innerHTML = st.pins.map((p) =>
      '<span class="rb__tab' + (c && p.id === c.id ? " on" : "") + (p.char ? " rb__tab--official" : "") + '" data-pin="' + esc(p.id) + '" draggable="true" title="' +
        esc(p.label) + (p.char ? " — drag onto your canvas to mark where you drew him" : "") + '"><img src="' + p.src + '" alt=""></span>').join("");
    const img = el.querySelector(".rb__img");
    el.querySelector(".rb__empty").hidden = !!c;
    img.hidden = !c;
    if (c && img.getAttribute("src") !== c.src) img.src = c.src;
    img.dataset.pixel = c && c.char ? "1" : "";
    el.querySelector(".rb__label").textContent = c ? c.label : "";
    el.classList.toggle("grey", st.grey);
    el.querySelector('[data-rb="flip"]').classList.toggle("on", st.flip);
    el.querySelector('[data-rb="grey"]').classList.toggle("on", st.grey);
    transform();
    paintTray();
  }

  function paintTray() {
    if (!trayBtn || !state) return;
    const n = S().pins.length;
    trayBtn.querySelector("span").textContent = "REF" + (n ? " " + n : "");
    trayBtn.classList.toggle("has", S().dock === "tray" && n > 0);
    trayBtn.title = S().dock === "tray" ? "Reference board — click to bring it back" : "Reference board — click to keep it open";
  }

  function resetView() { zoom = 1; panX = 0; panY = 0; }

  // Pixel art fits at a whole-number scale so every pixel stays a flat block.
  function fit() {
    if (!el) return;
    const img = el.querySelector(".rb__img"), view = el.querySelector(".rb__view");
    if (!img.naturalWidth) return;
    const k = Math.min((view.clientWidth - 12) / img.naturalWidth, (view.clientHeight - 12) / img.naturalHeight);
    fitScale = img.dataset.pixel && k >= 1 ? Math.floor(k) : k;
  }

  function transform() {
    if (!el) return;
    const img = el.querySelector(".rb__img");
    const s = fitScale * zoom * (S().flip ? -1 : 1);
    img.style.transform = "translate(-50%,-50%) translate(" + panX + "px," + panY + "px) scale(" + s + "," + fitScale * zoom + ")";
  }

  return { boot, pin, get, unpin, pins: () => (state ? S().pins.slice() : []), isActive: () => active };
})();
