"use strict";
/* ── drawers ──────────────────────────────────────────────
 * Tools that used to be apps of their own (Cutout, Swatch) and the card tray
 * live in drawers: a tab with an icon on an edge of the canvas panel. Click
 * it, or pull it away from its edge, and it springs open into a floating
 * panel; tuck the panel away (or drag it back to an edge) and it bounces back
 * into a tab. Slide a tab along its edge to put it somewhere else.
 *
 *   make(defs, state, hooks) → drawers
 *     defs   [{ id, icon, label, w, h, paint(body, id) }]
 *     state  { [id]: { edge: top|left|right|bottom|float, pos 0–1, open, fx, fy } },
 *            kept up to date in place; hooks.saved() after every change
 *   drawers.attach(view)   hang them on a view (they move with the mode)
 *   open / close / toggle / isOpen / body / repaint
 */

const SuiteDrawers = (() => {
  const TAB = { long: 34, short: 22 };
  const PULL = 0.3;                 // pulled this far out of its size, it opens

  function make(defs, state, hooks = {}) {
    const byId = Object.fromEntries(defs.map((d) => [d.id, d]));
    const els = {};
    let view = null;
    const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    function build(def) {
      const tab = document.createElement("button");
      tab.className = "dw__tab"; tab.type = "button"; tab.dataset.dw = def.id;
      tab.title = def.label + ": click or pull it out";
      tab.innerHTML = iconSVG(def.icon, 16) + '<span class="dw__tl">' + def.label.toUpperCase() + "</span>";
      const panel = document.createElement("section");
      panel.className = "dw__panel"; panel.dataset.dw = def.id; panel.hidden = true;
      panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", def.label);
      panel.innerHTML = '<header class="dw__head">' + iconSVG(def.icon, 16) + "<b>" + def.label.toUpperCase() + '</b><span class="dw__sp"></span>' +
        '<button class="dw__tuck" type="button" title="Tuck it away (Esc)" aria-label="Tuck ' + def.label + ' away">' + iconSVG("tuck", 16) + "</button></header>" +
        '<div class="dw__body"></div>';
      const wrap = document.createElement("div");
      wrap.className = "dw";
      wrap.append(tab, panel);
      wirePull(def.id, tab);
      wireHead(def.id, panel);
      panel.querySelector(".dw__tuck").addEventListener("click", () => close(def.id));
      panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); close(def.id); tab.focus(); } });
      return { wrap, tab, panel, body: panel.querySelector(".dw__body") };
    }

    const st = (id) => state[id] || (state[id] = { edge: byId[id].edge || "top", pos: byId[id].pos == null ? 0.5 : byId[id].pos, open: false });
    const sizeOf = (id) => {
      const d = byId[id], W = view ? view.clientWidth : 800, Hh = view ? view.clientHeight : 600;
      return { w: Math.min(d.w, W - 12), h: Math.min(d.h, Hh - 12), W, H: Hh };
    };

    // Where the tab and the panel sit, in the view's own pixels.
    function place(id) {
      const e = els[id];
      if (!e || !view) return;
      const s = st(id), { w, h, W, H } = sizeOf(id);
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const along = s.edge === "left" || s.edge === "right" ? H : W;
      const c = clamp(s.pos * along, TAB.long / 2 + 4, along - TAB.long / 2 - 4);
      const tab = e.tab.style, pan = e.panel.style;
      e.wrap.dataset.edge = s.edge;
      if (s.edge === "top") Object.assign(tab, { left: c - TAB.long / 2 + "px", top: "0px", right: "", bottom: "" });
      if (s.edge === "bottom") Object.assign(tab, { left: c - TAB.long / 2 + "px", top: H - TAB.short + "px", right: "", bottom: "" });
      if (s.edge === "left") Object.assign(tab, { left: "0px", top: c - TAB.long / 2 + "px", right: "", bottom: "" });
      if (s.edge === "right") Object.assign(tab, { left: W - TAB.short + "px", top: c - TAB.long / 2 + "px", right: "", bottom: "" });
      let x, y;
      if (s.edge === "float") { x = clamp(s.fx || 40, 0, W - w); y = clamp(s.fy || 40, 0, H - h); }
      else if (s.edge === "top" || s.edge === "bottom") { x = clamp(c - w / 2, 6, W - w - 6); y = s.edge === "top" ? 0 : H - h; }
      else { y = clamp(c - h / 2, 6, H - h - 6); x = s.edge === "left" ? 0 : W - w; }
      Object.assign(pan, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
      const ox = s.edge === "left" ? "0%" : s.edge === "right" ? "100%" : ((c - x) / w * 100) + "%";
      const oy = s.edge === "top" ? "0%" : s.edge === "bottom" ? "100%" : s.edge === "float" ? "0%" : ((c - y) / h * 100) + "%";
      pan.transformOrigin = ox + " " + oy;
      e.tab.hidden = !!s.open;
    }

    function attach(v) {
      view = v;
      for (const def of defs) {
        if (!els[def.id]) els[def.id] = build(def);
        v.appendChild(els[def.id].wrap);
        const s = st(def.id);
        els[def.id].panel.hidden = !s.open;
        place(def.id);
        if (s.open && def.paint) def.paint(els[def.id].body, def.id);
      }
    }
    const replace = () => defs.forEach((d) => place(d.id));

    let top = 7;
    function open(id, opts = {}) {
      const e = els[id];
      if (!e) return;
      const s = st(id), was = s.open;
      s.open = true;
      e.panel.hidden = false;
      e.panel.style.zIndex = ++top;
      place(id);
      const d = byId[id];
      if (d.paint) d.paint(e.body, id);
      if (!was && !reduced()) { e.panel.classList.remove("is-closing"); e.panel.classList.remove("is-opening"); void e.panel.offsetWidth; e.panel.classList.add("is-opening"); }
      if (!was && hooks.sound) hooks.sound("drawer");
      if (!was && hooks.opened) hooks.opened(id);
      if (hooks.saved) hooks.saved();
      if (opts.focus !== false) { const f = e.panel.querySelector(".dw__body button, .dw__body input"); if (f && opts.focus) f.focus(); }
    }

    function close(id) {
      const e = els[id], s = st(id);
      if (!e || !s.open) return;
      if (s.edge === "float") dockNearest(id);
      s.open = false;
      const done = () => {
        e.panel.hidden = true; e.panel.classList.remove("is-closing");
        place(id);
        e.tab.hidden = false;
        if (!reduced()) { e.tab.classList.remove("is-boing"); void e.tab.offsetWidth; e.tab.classList.add("is-boing"); }
      };
      if (reduced()) done();
      else { e.panel.classList.remove("is-opening"); e.panel.classList.add("is-closing"); setTimeout(done, 170); }
      if (hooks.sound) hooks.sound("tuck");
      if (hooks.closed) hooks.closed(id);
      if (hooks.saved) hooks.saved();
    }

    const toggle = (id) => (st(id).open ? close(id) : open(id));
    const isOpen = (id) => !!st(id).open;

    function dockNearest(id) {
      const s = st(id), { w, h, W, H } = sizeOf(id);
      const x = s.fx || 0, y = s.fy || 0, cx = x + w / 2, cy = y + h / 2;
      const d = { top: y, bottom: H - (y + h), left: x, right: W - (x + w) };
      const edge = Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
      s.edge = edge;
      s.pos = edge === "top" || edge === "bottom" ? cx / W : cy / H;
    }

    /* Pulling a tab: away from its edge opens (it stretches out as you pull),
     * along the edge moves it. A click without a pull toggles. */
    function wirePull(id, tab) {
      let g = null;
      tab.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        g = { x: e.clientX, y: e.clientY, mode: null };
        tab.setPointerCapture(e.pointerId);
      });
      tab.addEventListener("pointermove", (e) => {
        if (!g) return;
        const s = st(id), dx = e.clientX - g.x, dy = e.clientY - g.y;
        const vertical = s.edge === "top" || s.edge === "bottom";
        const pull = s.edge === "top" ? dy : s.edge === "bottom" ? -dy : s.edge === "left" ? dx : -dx;
        const slide = vertical ? dx : dy;
        if (!g.mode && Math.max(Math.abs(pull), Math.abs(slide)) > 6) g.mode = Math.abs(slide) > Math.abs(pull) ? "slide" : "pull";
        const e2 = els[id];
        if (g.mode === "slide") {
          const r = view.getBoundingClientRect();
          s.pos = vertical ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
          s.pos = Math.max(0, Math.min(1, s.pos));
          place(id);
        } else if (g.mode === "pull") {
          const { w, h } = sizeOf(id), size = vertical ? h : w;
          const k = Math.max(0.08, Math.min(1, pull / size));
          e2.panel.hidden = false;
          place(id);
          e2.tab.hidden = true;
          e2.panel.style.transform = vertical ? "scaleY(" + k + ")" : "scaleX(" + k + ")";
          g.k = k;
          if (!g.painted && byId[id].paint) { byId[id].paint(e2.body, id); g.painted = true; }
        }
      });
      const end = () => {
        if (!g) return;
        const m = g.mode, k = g.k || 0;
        g = null;
        const e2 = els[id];
        e2.panel.style.transform = "";
        if (!m) { toggle(id); return; }
        if (m === "slide") { if (hooks.saved) hooks.saved(); return; }
        if (k >= PULL) open(id);
        else { e2.panel.hidden = true; place(id); e2.tab.hidden = false; e2.tab.classList.remove("is-boing"); void e2.tab.offsetWidth; e2.tab.classList.add("is-boing"); }
      };
      tab.addEventListener("pointerup", end);
      tab.addEventListener("pointercancel", end);
      tab.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); open(id, { focus: true }); } });
    }

    // Dragging a panel by its header floats it; let go near an edge and it docks.
    function wireHead(id, panel) {
      const head = panel.querySelector(".dw__head");
      let g = null;
      head.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || e.target.closest("button")) return;
        const r = panel.getBoundingClientRect();
        g = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        head.setPointerCapture(e.pointerId);
        panel.classList.add("is-moving");
      });
      head.addEventListener("pointermove", (e) => {
        if (!g) return;
        const s = st(id), r = view.getBoundingClientRect();
        s.edge = "float"; s.fx = e.clientX - r.left - g.dx; s.fy = e.clientY - r.top - g.dy;
        place(id);
      });
      const end = (e) => {
        if (!g) return;
        g = null;
        panel.classList.remove("is-moving");
        const s = st(id), r = view.getBoundingClientRect(), { w, h } = sizeOf(id);
        const x = e.clientX - r.left, y = e.clientY - r.top;
        const snap = 28;
        if (y < snap || y > r.height - snap || x < snap || x > r.width - snap) {
          const d = { top: y, bottom: r.height - y, left: x, right: r.width - x };
          s.edge = Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
          s.pos = s.edge === "top" || s.edge === "bottom" ? (s.fx + w / 2) / r.width : (s.fy + h / 2) / r.height;
          s.pos = Math.max(0, Math.min(1, s.pos));
          place(id);
        }
        if (hooks.saved) hooks.saved();
      };
      head.addEventListener("pointerup", end);
      head.addEventListener("pointercancel", end);
      head.addEventListener("dblclick", (e) => { if (!e.target.closest("button")) close(id); });
    }

    const body = (id) => (els[id] ? els[id].body : null);
    const repaint = (id) => { const d = byId[id]; if (d && d.paint && els[id] && st(id).open) d.paint(els[id].body, id); };

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => replace());
      const watch = (v) => { ro.disconnect(); ro.observe(v); };
      const inner = attach;
      return { attach: (v) => { inner(v); watch(v); }, open, close, toggle, isOpen, body, repaint, place: replace, defs };
    }
    return { attach, open, close, toggle, isOpen, body, repaint, place: replace, defs };
  }

  return { make };
})();
