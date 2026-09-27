"use strict";
/* ── Pixel mode ───────────────────────────────────────────
 * Sprites and icons at true resolution. The same tools as everywhere, in
 * pixels: the pen lays a curve down as a clean one-pixel line, type is stamped
 * in a pixel face, shapes land on whole pixels, and a selection lifts pixels
 * off to move them. Cutout's wand selects by colour here, on the sprite.
 *
 * mount(ed, H): see vectored.js for what H lends and what the mode sets on ed.
 */

const SuitePixelEd = (() => {
  const need = (g, path) => (typeof globalThis[g] !== "undefined" ? globalThis[g] : typeof require === "function" ? require(path) : null);
  const D = typeof SuiteDoc !== "undefined" ? SuiteDoc : need("SuiteDoc", "./doc.js");
  const V = typeof SuiteVector !== "undefined" ? SuiteVector : need("SuiteVector", "./vector.js");
  const X = typeof SuiteCutout !== "undefined" ? SuiteCutout : need("SuiteCutout", "./cutout.js");
  const Sh = typeof SuiteShapes !== "undefined" ? SuiteShapes : need("SuiteShapes", "./shapes.js");
  const R = typeof SuiteRender !== "undefined" ? SuiteRender : null;
  const TOOLS = [
    { id: "pencil", icon: "t-pencil", label: "Pencil", key: "b" },
    { id: "erase", icon: "t-erase", label: "Eraser", key: "e" },
    { id: "fill", icon: "t-fill", label: "Fill", key: "g" },
    { id: "pick", icon: "t-pick", label: "Pick a colour", key: "i" },
    { id: "line", icon: "t-line", label: "Line", key: "l" },
    { id: "rect", icon: "t-rect", label: "Rectangle (Shift: square)", key: "r" },
    { id: "ellipse", icon: "t-ellipse", label: "Ellipse (Shift: circle)", key: "o" },
    { id: "pen", icon: "t-pen", label: "Pen: click and drag a curve, Enter lays it down in pixels", key: "p" },
    { id: "text", icon: "t-text", label: "Type, stamped in a pixel face", key: "t" },
    { id: "select", icon: "t-marquee", label: "Select: drag a box, then drag inside it to move", key: "m" },
    { id: "hand", icon: "t-hand", label: "Hand (or hold Space)", key: "h" },
  ];
  const FACES = [["Silkscreen", 8, 400], ["Silkscreen", 16, 400], ["VT323", 16, 400], ["Silkscreen", 8, 700]];
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* ── pixels a shape covers ─────────────────────────────── */
  function linePts(x0, y0, x1, y1) {
    const out = [];
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 4096; n++) {
      out.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return out;
  }
  function rectPts(x0, y0, x1, y1, filled) {
    const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [c, d] = [Math.min(y0, y1), Math.max(y0, y1)];
    const out = [];
    for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) if (filled || x === a || x === b || y === c || y === d) out.push([x, y]);
    return out;
  }
  // The pixels whose centres fall inside the ellipse in the box, and for an
  // outline, only the ones with a neighbour outside it.
  function ellipsePts(x0, y0, x1, y1, filled) {
    const [a, b] = [Math.min(x0, x1), Math.max(x0, x1)], [c, d] = [Math.min(y0, y1), Math.max(y0, y1)];
    const cx = (a + b + 1) / 2, cy = (c + d + 1) / 2, rx = (b - a + 1) / 2, ry = (d - c + 1) / 2;
    const inside = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    const out = [];
    for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) {
      if (!inside(x, y)) continue;
      if (filled || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) out.push([x, y]);
    }
    return out;
  }
  // A curve as a one-pixel line: sampled finely, rounded, joined up.
  function curvePts(path) {
    const pts = [];
    for (const s of path) for (const [a, b] of V.segs(s)) {
      const c = V.cubic(a, b);
      const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(a.ox - a.x, a.oy - a.y) + Math.hypot(b.ix - b.x, b.iy - b.y)) * 2);
      for (let k = 0; k <= n; k++) { const p = V.at(c, k / n); const q = [Math.floor(p.x), Math.floor(p.y)]; const l = pts[pts.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) pts.push(q); }
    }
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      if (!i) { out.push(pts[0]); continue; }
      linePts(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]).slice(1).forEach((q) => out.push(q));
    }
    // Pixel-art curves have no doubled corners: drop an L-shaped middle pixel,
    // judged against the last pixel kept so the line never breaks.
    const clean = [];
    for (let i = 0; i < out.length; i++) {
      const p = out[i], a = clean[clean.length - 1], b = out[i + 1];
      if (a && b && Math.abs(a[0] - b[0]) === 1 && Math.abs(a[1] - b[1]) === 1 && (p[0] === a[0] || p[1] === a[1])) continue;
      clean.push(p);
    }
    return clean;
  }
  // Type in a pixel face at its own size: drawn, then only the solid pixels kept.
  function textPts(text, face, size, weight) {
    const cv = document.createElement("canvas");
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.font = weight + " " + size + "px \"" + face + "\", monospace";
    const lines = String(text).split("\n");
    const w = Math.ceil(Math.max(1, ...lines.map((s) => ctx.measureText(s).width))) + 2, h = Math.ceil(lines.length * size * 1.1) + 2;
    cv.width = w; cv.height = h;
    ctx.font = weight + " " + size + "px \"" + face + "\", monospace";
    ctx.textBaseline = "top"; ctx.fillStyle = "#000";
    lines.forEach((s, i) => ctx.fillText(s, 0, Math.round(i * size * 1.1)));
    const data = ctx.getImageData(0, 0, w, h).data, out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] >= 128) out.push([x, y]);
    return out;
  }

  /* ── mount ─────────────────────────────────────────────── */
  function mount(ed, H) {
    ed.body.innerHTML =
      '<div class="sx__opts" role="toolbar" aria-label="Tool options"></div>' +
      '<div class="sx__main">' +
        '<div class="sx__rail" role="toolbar" aria-label="Tools"></div>' +
        '<div class="sx__stage sx__stage--pixel"></div>' +
        '<div class="sx__side sx__side--pixel">' +
          '<section class="sx__panel"><header class="sx__ph"><span>PREVIEW</span></header><div class="sx__pv"><canvas class="sx__pvc"></canvas></div></section>' +
          '<section class="sx__panel sx__panel--grow"><header class="sx__ph"><span>COLOURS IN USE</span></header><div class="sx__used"></div></section>' +
        "</div>" +
      "</div>";
    Object.assign(ed, {
      tool: ed.tool || "pencil", fg: ed.fg || "#0A0A0A", filled: !!ed.filled, mx: !!ed.mx, my: !!ed.my, face: ed.face || 0,
      drag: null, pen: null, mask: null, float: null, stamp: null, grid: ed.grid !== false,
    });
    ed.opts = ed.body.querySelector(".sx__opts");
    ed.rail = ed.body.querySelector(".sx__rail");
    ed.st = SuiteStage.make(ed.body.querySelector(".sx__stage"), {
      view: () => { draw(ed); if (ed.onView) ed.onView(); }, redraw: () => draw(ed),
      guide: (axis, v, index, done, inside) => {
        if (!done) { ed.ghost = inside ? { axis, v } : null; draw(ed); return; }
        ed.ghost = null;
        if (inside) { H.mutate(ed, () => { ed.doc.guides = SuiteGuides.put(ed.doc.guides || { v: [], h: [] }, axis, Math.round(v)); }, { panels: false }); H.sound("pick"); }
        else draw(ed);
      },
    });
    ed.st.pixel = true;
    ed.st.look = SuiteStage.LOOKS[H.look()] || SuiteStage.LOOKS.graphite;
    ed.st.reduced = H.reduced();
    ed.view = ed.st.view;
    ed.draw = () => draw(ed);
    ed.render = (o = {}) => render(ed, H, o);
    ed.key = (e) => onKey(ed, H, e);
    ed.escape = () => escape(ed, H);
    ed.drop = (c) => dropCard(ed, H, c);
    ed.sample = (x, y) => D.getPx(ed.doc, Math.floor(x), Math.floor(y)) || null;
    ed.place = (src, name) => pixelate(ed, H, src, name);
    ed.selectedImage = () => null;
    ed.wand = (x, y, tol, add) => wandAt(ed, H, x, y, tol, add);
    ed.unmount = () => { commitFloat(ed, H); finishPen(ed, H, true); };
    ed.relook = () => { ed.st.look = SuiteStage.LOOKS[H.look()] || SuiteStage.LOOKS.graphite; draw(ed); };
    ed.viewClick = (o) => {
      if (o === "grid") { ed.grid = !ed.grid; render(ed, H, {}); }
      if (o === "clearguides") { H.mutate(ed, () => { ed.doc.guides = { v: [], h: [] }; }); H.status(ed, "Guides cleared."); }
    };
    wirePointer(ed, H);
    wirePanels(ed, H);
    const v = ed.st.view;
    v.addEventListener("dragover", (e) => { if (!(e.target.closest && e.target.closest(".dw")) && e.dataTransfer.types.includes("text/x-pxcard")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
    v.addEventListener("drop", (e) => { if (e.target.closest && e.target.closest(".dw")) return; const id = e.dataTransfer.getData("text/x-pxcard"); if (id) { e.preventDefault(); dropCard(ed, H, H.card(id)); } });
    requestAnimationFrame(() => { ed.st.doc = ed.doc; ed.st.fit(ed.doc); ed.render(); });
    if (typeof ResizeObserver !== "undefined") { const ro = new ResizeObserver(() => { ed.st.refit(ed.doc); draw(ed); }); ro.observe(ed.st.view); ed.ro = ro; }
  }

  const inDoc = (ed, x, y) => x >= 0 && y >= 0 && x < ed.doc.w && y < ed.doc.h;
  // Every point, and its reflections when mirroring is on.
  function mirrored(ed, pts) {
    const out = [], seen = new Set(), w = ed.doc.w, h = ed.doc.h;
    const add = (x, y) => { const k = x + "," + y; if (!seen.has(k) && inDoc(ed, x, y)) { seen.add(k); out.push([x, y]); } };
    for (const [x, y] of pts) {
      add(x, y);
      if (ed.mx) add(w - 1 - x, y);
      if (ed.my) add(x, h - 1 - y);
      if (ed.mx && ed.my) add(w - 1 - x, h - 1 - y);
    }
    return out;
  }
  function paintPts(ed, pts, colour) { for (const [x, y] of mirrored(ed, pts)) D.setPx(ed.doc, x, y, colour); }
  const mirrorOK = (ed) => ed.bonus.includes("mirror");

  /* ── drawing ───────────────────────────────────────────── */
  function render(ed, H, o) {
    if (!ed.body.isConnected) return;
    draw(ed);
    if (o.panels !== false) { paintOpts(ed, H); paintSide(ed); }
    paintRail(ed, H);
    if (H.painted) H.painted(ed);
  }

  function draw(ed) {
    const st = ed.st, doc = ed.doc;
    if (!st.view.isConnected) return;
    st.measure(); st.doc = doc;
    const ctx = st.begin();
    st.board(ctx, doc);
    ctx.imageSmoothingEnabled = false;
    st.docTransform(ctx);
    R.draw(ctx, doc, { scale: 1, checker: false });
    st.viewTransform(ctx);
    const z = st.zoom, b = st.toView(0, 0), cw = doc.w * z, ch = doc.h * z;
    if (z >= 6) {
      ctx.strokeStyle = "rgba(0,0,0,.13)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 1; x < doc.w; x++) { ctx.moveTo(b.x + x * z + 0.5, b.y); ctx.lineTo(b.x + x * z + 0.5, b.y + ch); }
      for (let y = 1; y < doc.h; y++) { ctx.moveTo(b.x, b.y + y * z + 0.5); ctx.lineTo(b.x + cw, b.y + y * z + 0.5); }
      ctx.stroke();
    }
    st.veil(ctx, doc);
    const f = st.focus();
    if (ed.grid && f) st.grid(ctx, doc, f);
    st.guides(ctx, doc, null);
    if (ed.ghost) st.ghostGuide(ctx, ed.ghost.axis, ed.ghost.v);
    const look = st.look;
    ctx.save(); ctx.strokeStyle = look.smart; ctx.setLineDash([5, 4]);
    if (ed.mx) { ctx.beginPath(); ctx.moveTo(b.x + cw / 2, b.y - 8); ctx.lineTo(b.x + cw / 2, b.y + ch + 8); ctx.stroke(); }
    if (ed.my) { ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + ch / 2); ctx.lineTo(b.x + cw + 8, b.y + ch / 2); ctx.stroke(); }
    ctx.restore();
    // What a shape, the pen or a stamp would lay down.
    const ghost = previewPts(ed);
    if (ghost.length) {
      ctx.globalAlpha = 0.85; ctx.fillStyle = ed.tool === "erase" ? "#FFFFFF" : ed.fg;
      for (const [x, y] of mirrored(ed, ghost)) ctx.fillRect(b.x + x * z, b.y + y * z, z, z);
      ctx.globalAlpha = 1;
    }
    if (ed.float) {
      const fl = ed.float;
      for (const [x, y, c] of fl.px) { const px = x + fl.dx, py = y + fl.dy; if (inDoc(ed, px, py)) { ctx.fillStyle = c; ctx.fillRect(b.x + px * z, b.y + py * z, z, z); } }
    }
    if (ed.mask) ants(ed, ctx, ed.mask, ed.float ? ed.float.dx : 0, ed.float ? ed.float.dy : 0);
    if (ed.drag && ed.drag.mode === "marquee") {
      const [x0, y0, x1, y1] = ed.drag.box;
      ctx.strokeStyle = look.sel; ctx.setLineDash([3, 3]);
      ctx.strokeRect(b.x + Math.min(x0, x1) * z + 0.5, b.y + Math.min(y0, y1) * z + 0.5, (Math.abs(x1 - x0) + 1) * z, (Math.abs(y1 - y0) + 1) * z);
      ctx.setLineDash([]);
    }
    if (ed.pen && ed.pen.nodes.length) {
      ctx.strokeStyle = look.sel;
      ed.pen.nodes.forEach((n) => { const a = st.toView(n.x, n.y); ctx.strokeRect(Math.round(a.x) - 3.5, Math.round(a.y) - 3.5, 7, 7);
        if (Math.hypot(n.ox - n.x, n.oy - n.y) > 0.01) { const h = st.toView(n.ox, n.oy), i = st.toView(n.ix, n.iy); ctx.beginPath(); ctx.moveTo(i.x, i.y); ctx.lineTo(h.x, h.y); ctx.stroke(); } });
    }
    st.rulers();
    paintPreview(ed);
  }

  // Marching ants round a selection mask, by its outline.
  function ants(ed, ctx, mask, dx, dy) {
    const st = ed.st, z = st.zoom, b = st.toView(dx, dy);
    const loops = Sh.contours(mask, ed.doc.w, ed.doc.h);
    ctx.save();
    ctx.lineWidth = 1;
    for (const [dash, colour] of [[[], "#000"], [[4, 4], "#FFF"]]) {
      ctx.setLineDash(dash); ctx.strokeStyle = colour; ctx.lineDashOffset = -(performance.now() / 60 % 8);
      ctx.beginPath();
      for (const l of loops) l.forEach((p, i) => { const x = Math.round(b.x + p.x * z) + 0.5, y = Math.round(b.y + p.y * z) + 0.5; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }), ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
    if (!ed.antsTimer) ed.antsTimer = setTimeout(() => { ed.antsTimer = 0; if (ed.mask && ed.st.view.isConnected) draw(ed); }, 120);
  }

  function previewPts(ed) {
    const d = ed.drag;
    if (d && d.mode === "shape") {
      const [x0, y0] = d.from, [x1, y1] = d.to;
      if (ed.tool === "line") return linePts(x0, y0, x1, y1);
      if (ed.tool === "rect") return rectPts(x0, y0, x1, y1, ed.filled);
      if (ed.tool === "ellipse") return ellipsePts(x0, y0, x1, y1, ed.filled);
    }
    if (ed.pen && ed.pen.nodes.length > 1) return curvePts([{ closed: false, nodes: ed.pen.nodes }]);
    if (ed.stamp) return ed.stamp.pts.map(([x, y]) => [x + ed.stamp.x, y + ed.stamp.y]);
    return [];
  }

  function paintPreview(ed) {
    const c = ed.body.querySelector(".sx__pvc");
    if (!c) return;
    const k = Math.max(1, Math.floor(Math.min(112 / ed.doc.w, 112 / ed.doc.h)));
    c.width = ed.doc.w * k; c.height = ed.doc.h * k;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    R.draw(ctx, ed.doc, { scale: k });
  }
  function paintSide(ed) {
    const used = [...new Set(ed.doc.bitmap.filter(Boolean))];
    ed.body.querySelector(".sx__used").innerHTML = used.length
      ? used.map((c) => '<button class="sx__chip" data-pal="' + c + '" style="background:' + c + '" title="' + c + ' — draw with it"></button>').join("") +
        '<p class="sx__hint">' + used.length + " colour" + (used.length === 1 ? "" : "s") + " in the sprite</p>"
      : '<p class="sx__hint">Nothing drawn yet.</p>';
  }

  /* ── pointer ───────────────────────────────────────────── */
  function wirePointer(ed, H) {
    const cv = ed.st.cv;
    cv.addEventListener("pointerdown", (e) => { if (e.button === 0) down(ed, H, e); });
    cv.addEventListener("pointermove", (e) => move(ed, H, e));
    cv.addEventListener("pointerup", () => up(ed, H));
    cv.addEventListener("pointercancel", () => up(ed, H));
    cv.addEventListener("dblclick", () => { if (ed.tool === "pen") finishPen(ed, H); });
  }
  const cell = (ed, e) => { const p = ed.st.toDoc(e); return [Math.floor(p.x), Math.floor(p.y)]; };

  function down(ed, H, e) {
    const [x, y] = cell(ed, e), doc = ed.doc, pre = JSON.stringify(doc);
    ed.st.cv.setPointerCapture(e.pointerId);
    const t = ed.tool;
    if (t !== "select") commitFloat(ed, H);
    if (t === "pick") { const c = D.getPx(doc, x, y); if (c) { ed.fg = c; H.status(ed, "Picked " + c); paintOpts(ed, H); } return; }
    if (t === "fill") { for (const [px, py] of mirrored(ed, [[x, y]])) D.fill(doc, px, py, ed.fg); H.record(ed, pre); render(ed, H, {}); return; }
    if (t === "pencil" || t === "erase") { paintPts(ed, [[x, y]], t === "erase" ? "" : ed.fg); ed.drag = { mode: "paint", pre, last: [x, y] }; draw(ed); return; }
    if (["line", "rect", "ellipse"].includes(t)) { ed.drag = { mode: "shape", pre, from: [x, y], to: [x, y] }; draw(ed); return; }
    if (t === "pen") {
      const p = ed.st.toDoc(e), q = { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 };
      ed.pen = ed.pen || { nodes: [] };
      ed.pen.nodes.push(V.node(q.x, q.y));
      ed.drag = { mode: "pull", from: q };
      draw(ed);
      return;
    }
    if (t === "text") { startStamp(ed, H, x, y); return; }
    if (t === "wand") { wandAt(ed, H, x, y, ed.win && ed.win.cut ? ed.win.cut.tol : 24, e.shiftKey); return; }
    if (t === "select") {
      const fx = ed.float ? ed.float.dx : 0, fy = ed.float ? ed.float.dy : 0;
      if (ed.mask && inMask(ed, x - fx, y - fy)) {
        if (!ed.float) lift(ed);
        ed.drag = { mode: "float", from: [x, y], start: [ed.float.dx, ed.float.dy], pre: ed.float.pre };
        return;
      }
      commitFloat(ed, H);
      ed.drag = { mode: "marquee", box: [x, y, x, y], add: e.shiftKey };
      draw(ed);
    }
  }
  const inMask = (ed, x, y) => inDoc(ed, x, y) && ed.mask[y * ed.doc.w + x];

  function move(ed, H, e) {
    const d = ed.drag, [x, y] = cell(ed, e);
    if (ed.tool === "pen" && ed.pen && !d) return;
    if (!d) { ed.st.cv.style.cursor = ed.tool === "hand" ? "grab" : ed.tool === "select" && ed.mask && inMask(ed, x - (ed.float ? ed.float.dx : 0), y - (ed.float ? ed.float.dy : 0)) ? "move" : "crosshair"; return; }
    if (d.mode === "paint") { paintPts(ed, linePts(d.last[0], d.last[1], x, y), ed.tool === "erase" ? "" : ed.fg); d.last = [x, y]; draw(ed); return; }
    if (d.mode === "shape") {
      let [x1, y1] = [x, y];
      if (e.shiftKey && ed.tool !== "line") { const m = Math.max(Math.abs(x1 - d.from[0]), Math.abs(y1 - d.from[1])); x1 = d.from[0] + Math.sign(x1 - d.from[0] || 1) * m; y1 = d.from[1] + Math.sign(y1 - d.from[1] || 1) * m; }
      d.to = [x1, y1]; draw(ed); return;
    }
    if (d.mode === "pull") {
      const p = ed.st.toDoc(e), n = ed.pen.nodes[ed.pen.nodes.length - 1];
      if (Math.hypot(p.x - d.from.x, p.y - d.from.y) < 0.75) return;
      Object.assign(n, { ox: p.x, oy: p.y, ix: 2 * n.x - p.x, iy: 2 * n.y - p.y, k: "sym" });
      draw(ed); return;
    }
    if (d.mode === "marquee") { d.box[2] = x; d.box[3] = y; draw(ed); return; }
    if (d.mode === "float") { ed.float.dx = d.start[0] + x - d.from[0]; ed.float.dy = d.start[1] + y - d.from[1]; draw(ed); }
  }

  function up(ed, H) {
    const d = ed.drag;
    ed.drag = null;
    if (!d) return;
    if (d.mode === "paint") { H.record(ed, d.pre); render(ed, H, {}); return; }
    if (d.mode === "shape") { paintPts(ed, previewPts(Object.assign({}, ed, { drag: d, pen: null, stamp: null })), ed.fg); H.record(ed, d.pre); H.sound("layer"); render(ed, H, {}); return; }
    if (d.mode === "marquee") {
      const [x0, y0, x1, y1] = d.box, w = ed.doc.w;
      const m = d.add && ed.mask ? ed.mask : new Uint8Array(w * ed.doc.h);
      for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(ed.doc.h - 1, Math.max(y0, y1)); y++) for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(w - 1, Math.max(x0, x1)); x++) m[y * w + x] = 1;
      ed.mask = X.count(m) ? m : null;
      render(ed, H, {});
      return;
    }
    if (d.mode === "float") { draw(ed); return; }
    draw(ed);
  }

  /* ── selections that move ──────────────────────────────── */
  function lift(ed) {
    const doc = ed.doc, px = [];
    const pre = JSON.stringify(doc);
    for (let i = 0; i < ed.mask.length; i++) {
      if (!ed.mask[i] || !doc.bitmap[i]) continue;
      px.push([i % doc.w, Math.floor(i / doc.w), doc.bitmap[i]]);
      doc.bitmap[i] = "";
    }
    ed.float = { px, dx: 0, dy: 0, pre };
  }
  function commitFloat(ed, H) {
    const fl = ed.float;
    if (!fl) return;
    ed.float = null;
    for (const [x, y, c] of fl.px) D.setPx(ed.doc, x + fl.dx, y + fl.dy, c);
    if (ed.mask && (fl.dx || fl.dy)) {
      const w = ed.doc.w, h = ed.doc.h, m = new Uint8Array(w * h);
      for (let i = 0; i < ed.mask.length; i++) if (ed.mask[i]) { const x = i % w + fl.dx, y = Math.floor(i / w) + fl.dy; if (x >= 0 && y >= 0 && x < w && y < h) m[y * w + x] = 1; }
      ed.mask = X.count(m) ? m : null;
    }
    H.record(ed, fl.pre);
  }
  function selectionAct(ed, H, what) {
    if (!ed.mask) return;
    commitFloat(ed, H);
    const doc = ed.doc;
    if (what === "clear") H.mutate(ed, () => { ed.mask.forEach((v, i) => { if (v) doc.bitmap[i] = ""; }); });
    if (what === "paint") H.mutate(ed, () => { ed.mask.forEach((v, i) => { if (v && doc.bitmap[i]) doc.bitmap[i] = ed.fg; }); });
    if (what === "fillsel") H.mutate(ed, () => { ed.mask.forEach((v, i) => { if (v) doc.bitmap[i] = ed.fg; }); });
    if (what === "card") {
      const rgba = rgbaOf(doc), out = X.extract(rgba, doc.w, doc.h, ed.mask);
      if (!out) return;
      const c = document.createElement("canvas"); c.width = out.w; c.height = out.h;
      c.getContext("2d").putImageData(new ImageData(out.rgba, out.w, out.h), 0, 0);
      const n = H.addCards([{ kind: "object", label: "Sprite cut: " + doc.meta.name, value: c.toDataURL("image/png"), tags: ["sprite", "cutout"] }]);
      H.status(ed, n ? "The selection is a card in the tray now." : "That's already a card.");
    }
    if (what === "none") { ed.mask = null; draw(ed); }
    render(ed, H, {});
  }
  function rgbaOf(doc) {
    const out = new Uint8ClampedArray(doc.w * doc.h * 4);
    doc.bitmap.forEach((c, i) => { if (c) { out[i * 4] = parseInt(c.slice(1, 3), 16); out[i * 4 + 1] = parseInt(c.slice(3, 5), 16); out[i * 4 + 2] = parseInt(c.slice(5, 7), 16); out[i * 4 + 3] = 255; } });
    return out;
  }
  // Cutout's wand, on the sprite: select a colour region.
  function wandAt(ed, H, x, y, tol, add) {
    commitFloat(ed, H);
    const m = X.wand(rgbaOf(ed.doc), ed.doc.w, ed.doc.h, x, y, tol, add && ed.mask ? ed.mask : new Uint8Array(ed.doc.w * ed.doc.h));
    ed.mask = X.count(m) ? m : null;
    ed.tool = "select";
    render(ed, H, {});
    H.status(ed, ed.mask ? X.count(ed.mask) + " pixels selected. Drag them, recolour them, or make them a card." : "Nothing there to select.");
  }

  /* ── the pen, in pixels ────────────────────────────────── */
  function finishPen(ed, H, quiet) {
    const pen = ed.pen;
    ed.pen = null;
    if (!pen || pen.nodes.length < 2) { if (!quiet) draw(ed); return; }
    const pre = JSON.stringify(ed.doc);
    paintPts(ed, curvePts([{ closed: false, nodes: pen.nodes }]), ed.fg);
    H.record(ed, pre);
    if (!quiet) { H.sound("layer"); render(ed, H, {}); }
  }

  /* ── type stamps ───────────────────────────────────────── */
  function startStamp(ed, H, x, y) {
    const [face, size, weight] = FACES[ed.face] || FACES[0];
    ed.stamp = { x, y, text: ed.stampText || "HELLO", pts: [] };
    ed.stamp.pts = textPts(ed.stamp.text, face, size, weight);
    paintOpts(ed, H);
    draw(ed);
    // After the click has finished moving focus about, the words take it.
    requestAnimationFrame(() => { const inp = ed.opts.querySelector('[data-o="stamptext"]'); if (inp) { inp.focus(); inp.select(); } });
    H.status(ed, "Type the words, move the click to place them, Enter to stamp.");
  }
  function commitStamp(ed, H) {
    const s = ed.stamp;
    ed.stamp = null;
    if (!s || !s.pts.length) { draw(ed); return; }
    H.mutate(ed, () => paintPts(ed, s.pts.map(([x, y]) => [x + s.x, y + s.y]), ed.fg));
    H.sound("layer");
  }

  // A picture (from Cutout, or a card) brought down to the sprite's size and
  // colours. A card's picture is still that card: the work records it used it.
  function pixelate(ed, H, src, name, card) {
    const img = new Image();
    img.onload = () => {
      const doc = ed.doc, k = Math.min(doc.w / img.naturalWidth, doc.h / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const pal = doc.palette.length ? doc.palette : null;
      const near = (r, g, b) => {
        const hex = "#" + [r, g, b].map((v) => (Math.round(v / 17) * 17).toString(16).padStart(2, "0")).join("").toUpperCase();
        if (!pal) return hex;
        let best = pal[0], bd = Infinity;
        for (const p of pal) { const d = (parseInt(p.slice(1, 3), 16) - r) ** 2 + (parseInt(p.slice(3, 5), 16) - g) ** 2 + (parseInt(p.slice(5, 7), 16) - b) ** 2; if (d < bd) { bd = d; best = p; } }
        return best;
      };
      const ox = Math.floor((doc.w - w) / 2), oy = Math.floor((doc.h - h) / 2);
      H.mutate(ed, () => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] >= 128) D.setPx(doc, x + ox, y + oy, near(data[i], data[i + 1], data[i + 2]));
        }
        if (card && card.id && !doc.meta.intent.includes(card.id)) doc.meta.intent.push(card.id);
      });
      H.status(ed, "Brought down to " + w + " × " + h + (pal ? ", in the sprite's palette." : ". Add a palette to keep it to your colours."));
      H.sound("drop");
    };
    img.src = src;
  }

  function dropCard(ed, H, c) {
    if (!c) return;
    if (c.kind === "colour") { ed.fg = c.value; H.mutate(ed, () => SuiteCards.applyToCanvas(ed.doc, c)); H.status(ed, "Drawing with " + c.label); H.sound("drop"); return; }
    if (c.kind === "object") { pixelate(ed, H, c.value, c.label, c); return; }
    const res = H.mutate(ed, () => SuiteCards.applyToCanvas(ed.doc, c));
    H.status(ed, res.ok ? c.label + ": " + res.what : res.reason);
  }

  /* ── keys ─────────────────────────────────────────────── */
  function setTool(ed, H, t) {
    if (ed.tool === "pen" && t !== "pen") finishPen(ed, H);
    if (t !== "text") ed.stamp = null;
    if (t !== "select") commitFloat(ed, H);
    ed.tool = t;
    ed.st.handTool = t === "hand";
    H.sound("tool");
    render(ed, H, {});
  }
  function onKey(ed, H, e) {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (e.key === " " && !e.repeat) { ed.st.spaceDown = true; const u = (ev) => { if (ev.key === " ") { ed.st.spaceDown = false; document.removeEventListener("keyup", u); } }; document.addEventListener("keyup", u); return true; }
    if ((e.key === "Delete" || e.key === "Backspace") && ed.mask) { selectionAct(ed, H, "clear"); return true; }
    if (e.key === "Enter" && ed.pen) { finishPen(ed, H); return true; }
    if (e.key.startsWith("Arrow") && ed.mask) {
      if (!ed.float) lift(ed);
      ed.float.dx += e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      ed.float.dy += e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      draw(ed);
      return true;
    }
    if (mod && k === "a") { ed.mask = new Uint8Array(ed.doc.w * ed.doc.h).fill(1); ed.tool = "select"; render(ed, H, {}); return true; }
    if (mod || e.altKey) return false;
    if (k === "x" && mirrorOK(ed)) { ed.mx = !ed.mx; render(ed, H, {}); return true; }
    const t = TOOLS.find((x) => x.key === k);
    if (t) { setTool(ed, H, t.id); return true; }
    return false;
  }
  function escape(ed, H) {
    if (ed.stamp) { ed.stamp = null; render(ed, H, {}); return true; }
    if (ed.pen) { finishPen(ed, H); return true; }
    if (ed.float) { commitFloat(ed, H); render(ed, H, {}); return true; }
    if (ed.mask) { ed.mask = null; render(ed, H, {}); return true; }
    return false;
  }

  /* ── rail and options ──────────────────────────────────── */
  function paintRail(ed, H) {
    ed.rail.innerHTML = TOOLS.map((t) => '<button class="sx__tool' + (ed.tool === t.id ? " on" : "") + '" data-tool="' + t.id + '" title="' + esc(t.label + " (" + t.key.toUpperCase() + ")") + '" aria-pressed="' + (ed.tool === t.id) + '">' + iconSVG(t.icon, 16) + "</button>").join("") +
      '<span class="sx__rsep"></span>' + H.drawerButtons(ed);
  }
  const ib = (o, icon, label, on, off) => '<button class="sx__ib' + (on ? " on" : "") + '" data-o="' + o + '" title="' + esc(label) + '" aria-pressed="' + !!on + '"' + (off ? " disabled" : "") + ">" + iconSVG(icon, 16) + "</button>";
  function paintOpts(ed, H) {
    const el = ed.opts;
    if (el.contains(document.activeElement) && document.activeElement.dataset.o === "stamptext") return;
    let h = '<span class="sx__olab">COLOUR</span><label class="sx__well" title="Drawing colour"><input type="color" data-o="fg" value="' + ed.fg.toLowerCase() + '"><i style="background:' + ed.fg + '"></i></label><span class="sx__osep"></span>';
    if (["rect", "ellipse"].includes(ed.tool)) h += ib("outline", "t-" + ed.tool, "Outline", !ed.filled) + ib("filled", "f-" + ed.tool, "Filled", ed.filled) + '<span class="sx__osep"></span>';
    if (ed.tool === "text") {
      h += '<label class="sx__num sx__num--wide"><span>WORDS</span><input data-o="stamptext" maxlength="60" value="' + esc(ed.stamp ? ed.stamp.text : ed.stampText || "HELLO") + '"></label>' +
        '<label class="sx__num"><span>FACE</span><select data-o="face">' + FACES.map(([f, s, w], i) => "<option value=\"" + i + "\"" + (i === ed.face ? " selected" : "") + ">" + f + " " + s + (w === 700 ? " bold" : "") + "</option>").join("") + "</select></label>" +
        (ed.stamp ? '<button class="sx__tb" data-o="stamp">Stamp it</button>' : '<span class="sx__ohint">Click where the words go</span>') + '<span class="sx__osep"></span>';
    }
    if (ed.tool === "pen") h += '<span class="sx__ohint">Click, or drag for a curve · Enter lays the line down in pixels</span><span class="sx__osep"></span>';
    if (ed.mask) h += '<span class="sx__olab">SELECTION</span>' + ib("sel:paint", "t-fill", "Recolour what's drawn in it") + ib("sel:fillsel", "f-rect", "Fill it") + ib("sel:clear", "l-del", "Clear it (Del)") + ib("sel:card", "card", "Make it a card") + ib("sel:none", "none", "Deselect (Esc)") + '<span class="sx__osep"></span>';
    if (mirrorOK(ed)) h += ib("mx", "mirror", "Mirror left to right (X)", ed.mx) + ib("my", "mirror-h", "Mirror top to bottom", ed.my) + '<span class="sx__osep"></span>';
    const f = ed.st.focus();
    H.viewBar(ed, ib("grid", "grid", f ? "Tile grid " + Math.round(f.px) + " × " + Math.round(f.py) + " px" : "Tile grid: pull two guides down and two across", ed.grid && !!f, !f).replace('data-o="', 'data-v="') +
      ib("clearguides", "guides-x", "Clear all guides", false, !(ed.doc.guides && (ed.doc.guides.v.length || ed.doc.guides.h.length))).replace('data-o="', 'data-v="'));
    h += '<span class="sx__ospace"></span>' +
      '<span class="sx__pal">' + ed.doc.palette.map((c) => '<button class="sx__chip' + (c === ed.fg ? " on" : "") + '" data-pal="' + c + '" style="background:' + c + '" title="' + c + ' — Alt-click to remove"></button>').join("") +
      '<button class="sx__chip sx__chip--add" data-o="addpal" title="Add the drawing colour">+</button></span>';
    el.innerHTML = h;
  }
  function wirePanels(ed, H) {
    ed.body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tool],[data-o],[data-pal],[data-drawer]");
      if (!t) return;
      if (t.dataset.drawer) { H.toggleDrawer(ed, t.dataset.drawer); return; }
      if (t.dataset.tool) { setTool(ed, H, t.dataset.tool); return; }
      if (t.dataset.pal) {
        if (e.altKey) { H.mutate(ed, () => { ed.doc.palette = ed.doc.palette.filter((x) => x !== t.dataset.pal); }); return; }
        ed.fg = t.dataset.pal; paintOpts(ed, H); H.sound("pick"); return;
      }
      const o = t.dataset.o;
      if (o === "outline" || o === "filled") { ed.filled = o === "filled"; paintOpts(ed, H); }
      if (o === "mx") { ed.mx = !ed.mx; render(ed, H, {}); }
      if (o === "my") { ed.my = !ed.my; render(ed, H, {}); }
      if (o === "grid") { ed.grid = !ed.grid; render(ed, H, {}); }
      if (o === "stamp") commitStamp(ed, H);
      if (o === "addpal") H.mutate(ed, () => { if (!ed.doc.palette.includes(ed.fg)) ed.doc.palette.push(ed.fg); });
      if (o && o.startsWith("sel:")) selectionAct(ed, H, o.slice(4));
    });
    ed.body.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.o === "fg") { ed.fg = t.value.toUpperCase(); const i = t.parentNode.querySelector("i"); if (i) i.style.background = ed.fg; }
      if (t.dataset.o === "stamptext") {
        ed.stampText = t.value;
        if (ed.stamp) { const [face, size, weight] = FACES[ed.face]; ed.stamp.text = t.value; ed.stamp.pts = textPts(t.value, face, size, weight); draw(ed); }
      }
    });
    ed.body.addEventListener("change", (e) => {
      if (e.target.dataset.o === "face") {
        ed.face = Number(e.target.value) || 0;
        if (ed.stamp) { const [face, size, weight] = FACES[ed.face]; ed.stamp.pts = textPts(ed.stamp.text, face, size, weight); draw(ed); }
      }
    });
    ed.body.addEventListener("keydown", (e) => {
      if (e.target.dataset && e.target.dataset.o === "stamptext") {
        e.stopPropagation();
        // Done with the words: give the keys back to the tools.
        if (e.key === "Enter") { e.preventDefault(); commitStamp(ed, H); e.target.blur(); render(ed, H, {}); }
        if (e.key === "Escape") { ed.stamp = null; e.target.blur(); render(ed, H, {}); }
      }
    });
  }

  return { mount, TOOLS, linePts, rectPts, ellipsePts, curvePts };
})();

if (typeof module !== "undefined") module.exports = SuitePixelEd;
