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
  const T = typeof SuiteTools !== "undefined" ? SuiteTools : need("SuiteTools", "./tools.js");
  const P = typeof SuitePolish !== "undefined" ? SuitePolish : need("SuitePolish", "./polish.js");
  const TOOLS = [
    { id: "pencil", icon: "t-pencil", label: "Pencil (Shift-click: a line from the last pixel; Alt-click: pick a colour)", key: "b" },
    { id: "erase", icon: "t-erase", label: "Eraser (Shift-click: a line from the last pixel)", key: "e" },
    { id: "fill", icon: "t-fill", label: "Fill", key: "g" },
    { id: "pick", icon: "t-pick", label: "Pick a colour", key: "i" },
    { id: "line", icon: "t-line", label: "Line (Shift: clean steps, 1:1, 2:1, 3:1)", key: "l" },
    { id: "rect", icon: "t-rect", label: "Rectangle (Shift: square)", key: "r" },
    { id: "ellipse", icon: "t-ellipse", label: "Ellipse (Shift: circle)", key: "o" },
    { id: "pen", icon: "t-pen", label: "Pen: click and drag a curve, Enter lays it down in pixels", key: "p" },
    { id: "text", icon: "t-text", label: "Type, stamped in a pixel face", key: "t" },
    { id: "select", icon: "t-marquee", label: "Select: drag a box, then drag inside it to move (Shift adds, Alt takes away)", key: "m" },
    { id: "wand", icon: "c-wand", label: "Magic wand: click a colour to select it (Shift adds, Alt takes away)", key: "w" },
    { id: "hand", icon: "t-hand", label: "Hand (or hold Space)", key: "h" },
  ];
  const FACES = [["Silkscreen", 8, 400], ["Silkscreen", 16, 400], ["VT323", 16, 400], ["Silkscreen", 8, 700]];
  // Ways to look at the sprite in the preview, the checks pixel artists make:
  // it has to read as a shape, hold its values, and (for a tile) repeat.
  const VIEWS = [
    ["sil", "v-sil", "Silhouette: does it read as a shape?"],
    ["grey", "v-grey", "Greyscale: are the lights and darks right?"],
    ["tile", "v-tile", "Tiled three by three: does it repeat without seams?"],
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* ── the pro inks (Hustle earns them; Studio has them) ─── */
  // Dither patterns, fixed to the sprite's own grid so strokes and fills mesh.
  const DITHERS = {
    50: (x, y) => (x + y) % 2 === 0,
    25: (x, y) => x % 2 === 0 && y % 2 === 0,
  };
  const luma = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  // The ramp shading steps along: the palette, darkest to lightest, or the
  // colours in the sprite when there is no palette to speak of.
  function rampOf(palette, used) {
    const pal = [...new Set((palette || []).filter(Boolean))];
    const src = pal.length > 1 ? pal : [...new Set((used || []).filter(Boolean))];
    return src.sort((a, b) => luma(a) - luma(b));
  }
  // One step along the ramp from colour c: dir -1 darker, +1 lighter. A colour
  // not on the ramp steps from the nearest one on it; the ends stay put.
  function shadeStep(ramp, c, dir) {
    if (!c || !ramp.length) return c;
    let i = ramp.indexOf(c);
    if (i < 0) {
      const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const [r, g, b] = rgb(c);
      let best = Infinity;
      ramp.forEach((h, k) => { const [R, G, B] = rgb(h), d = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (d < best) { best = d; i = k; } });
    }
    return ramp[Math.max(0, Math.min(ramp.length - 1, i + dir))];
  }

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
  // Pixel-perfect: a freehand stroke never doubles up at a corner. Given the
  // stroke's last pixels, the index of an L-shaped middle one to take back,
  // or -1.
  function perfectDrop(trail) {
    const n = trail.length;
    if (n < 3) return -1;
    const a = trail[n - 3], b = trail[n - 2], c = trail[n - 1];
    return Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1 && (b[0] === a[0] || b[1] === a[1]) ? n - 2 : -1;
  }
  // A line toward (x1, y1) in clean pixel steps: straight, or runs of 1, 2 or 3
  // along the long way for every step the short way, whichever angle is
  // nearest the drag. Runs are whole from the first pixel (2-2-2, not
  // Bresenham's 1-2-2-1), and the line goes as far as the drag along its
  // long way.
  const RATIOS = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [3, 1], [1, 3]];
  function cleanLine(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
    const want = Math.atan2(Math.abs(dy), Math.abs(dx));
    let a = 1, b = 0, off = Infinity;
    for (const [ra, rb] of RATIOS) {
      const d = Math.abs(Math.atan2(rb, ra) - want);
      if (d < off - 1e-9) { a = ra; b = rb; off = d; }
    }
    const across = a >= b, run = Math.max(a, b), len = across ? Math.abs(dx) : Math.abs(dy), pts = [];
    for (let i = 0; i <= len; i++) {
      const side = a && b ? Math.floor(i / run) : 0;
      pts.push(across ? [x0 + sx * i, y0 + sy * side] : [x0 + sx * side, y0 + sy * i]);
    }
    return { pts, ratio: !a ? "upright" : !b ? "flat" : a + ":" + b };
  }
  // A selection's pixels flipped or turned a quarter clockwise about its own
  // box (turned from the box's top-left corner, so every pixel lands on a
  // pixel), and the selection with them. Empty pixels in it carry nothing.
  function selTransform(bitmap, mask, w, h, how) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < mask.length; i++) if (mask[i]) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return null;
    const out = bitmap.slice(), m = new Uint8Array(w * h), px = [];
    for (let i = 0; i < mask.length; i++) if (mask[i]) { px.push([i % w, (i / w) | 0, bitmap[i]]); out[i] = ""; }
    for (const [x, y, c] of px) {
      const [nx, ny] = how === "fliph" ? [x0 + x1 - x, y] : how === "flipv" ? [x, y0 + y1 - y] : [x0 + (y1 - y), y0 + (x - x0)];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      m[ny * w + nx] = 1;
      if (c) out[ny * w + nx] = c;
    }
    return { bitmap: out, mask: m };
  }
  // A one-pixel outline round what is drawn in a selection, in `ink`: every
  // empty pixel beside it, inside the selection or just outside, and the
  // selection grows to take the outline in.
  function selOutline(bitmap, mask, w, h, ink) {
    const out = bitmap.slice(), m = Uint8Array.from(mask);
    const shape = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] && bitmap[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bitmap[i]) continue;
      if (shape(x - 1, y) || shape(x + 1, y) || shape(x, y - 1) || shape(x, y + 1)) { out[i] = ink; m[i] = 1; }
    }
    return { bitmap: out, mask: m };
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
    if (filled) return out;
    // Pixel-art curves have no doubled corners: where the outline turns
    // through an L, the corner pixel goes. A square corner, both arms two or
    // more long, stays.
    const on = new Set(out.map(([x, y]) => x + "," + y)), has = (x, y) => on.has(x + "," + y);
    const arm = (x, y, dx, dy) => { let n = 0; while (has(x + dx * (n + 1), y + dy * (n + 1))) n++; return n; };
    for (const [x, y] of out) for (const ax of [-1, 1]) for (const cy of [-1, 1]) {
      if (!has(x, y) || !has(x + ax, y) || !has(x, y + cy) || has(x + ax, y + cy) || has(x - ax, y) || has(x, y - cy)) continue;
      if (arm(x, y, ax, 0) >= 2 && arm(x, y, 0, cy) >= 2) continue;
      on.delete(x + "," + y);
    }
    return out.filter(([x, y]) => has(x, y));
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

  // Every pixel a square brush of `size` covers when dabbed at (x, y).
  function brushPts(x, y, size) {
    const n = Math.max(1, Math.min(16, Math.round(size) || 1)), o = Math.floor((n - 1) / 2), out = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out.push([x - o + i, y - o + j]);
    return out;
  }
  // Selections as masks (one byte a pixel): the other way round, one pixel
  // bigger all round, one smaller.
  const selInvert = (mask) => { const m = new Uint8Array(mask.length); for (let i = 0; i < mask.length; i++) m[i] = mask[i] ? 0 : 1; return m; };
  function selGrow(mask, w, h) {
    const m = Uint8Array.from(mask);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) continue;
      if ((x > 0 && mask[y * w + x - 1]) || (x < w - 1 && mask[y * w + x + 1]) || (y > 0 && mask[(y - 1) * w + x]) || (y < h - 1 && mask[(y + 1) * w + x])) m[y * w + x] = 1;
    }
    return m;
  }
  function selShrink(mask, w, h) {
    const m = new Uint8Array(mask.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      const on = (a, b) => a >= 0 && b >= 0 && a < w && b < h && mask[b * w + a];
      if (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) m[y * w + x] = 1;
    }
    return m;
  }
  // Copy what is drawn inside a selection, keeping its shape: { w, h, px:[[x, y, colour]] }
  // relative to the selection's own top-left, or null when nothing drawn is in it.
  function clipCopy(bitmap, mask, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < mask.length; i++) if (mask[i]) { const x = i % w, y = (i / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return null;
    const px = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * w + x] && bitmap[y * w + x]) px.push([x - x0, y - y0, bitmap[y * w + x]]);
    return px.length ? { w: x1 - x0 + 1, h: y1 - y0 + 1, px } : null;
  }
  // A copy set down with its top-left at `at`: the pixels, and a selection over them.
  function clipPaste(clip, w, h, at = [0, 0]) {
    const px = [], mask = new Uint8Array(w * h);
    for (const [x, y, c] of clip.px) {
      const px1 = x + at[0], py1 = y + at[1];
      if (px1 < 0 || py1 < 0 || px1 >= w || py1 >= h) continue;
      px.push([px1, py1, c]); mask[py1 * w + px1] = 1;
    }
    return { px, mask };
  }
  let clip = null;                    // what was last copied, shared by every sprite

  /* ── mount ─────────────────────────────────────────────── */
  function mount(ed, H) {
    ed.body.innerHTML =
      '<div class="sx__opts" role="toolbar" aria-label="Tool options"></div>' +
      '<div class="sx__main">' +
        '<div class="sx__rail" role="toolbar" aria-label="Tools"></div>' +
        '<div class="sx__stage sx__stage--pixel"></div>' +
        '<div class="sx__side sx__side--pixel">' +
          '<section class="sx__panel"><header class="sx__ph"><span>PREVIEW</span><span class="sx__pvv" role="group" aria-label="Ways to look">' +
            VIEWS.map(([id, icon, t]) => '<button class="sx__ib sx__ib--sm" data-pv="' + id + '" title="' + t + '" aria-pressed="false">' + iconSVG(icon, 16) + "</button>").join("") +
          '</span></header><div class="sx__pv"><canvas class="sx__pvc"></canvas></div></section>' +
          '<section class="sx__panel sx__panel--pol" hidden><header class="sx__ph"><span>POLISH</span></header><div class="sx__pol"></div></section>' +
          '<section class="sx__panel sx__panel--grow"><header class="sx__ph"><span>COLOURS IN USE</span></header><div class="sx__used"></div></section>' +
        "</div>" +
      "</div>" +
      '<div class="sx__time" role="toolbar" aria-label="Frames" hidden></div>';
    Object.assign(ed, {
      tool: ed.tool || "pencil", fg: ed.fg || "#0A0A0A", filled: !!ed.filled, mx: !!ed.mx, my: !!ed.my, face: ed.face || 0, perfect: ed.perfect !== false, size: ed.size || 1, fillAll: !!ed.fillAll,
      drag: null, pen: null, mask: null, float: null, stamp: null, grid: ed.grid !== false, polish: !!ed.polish, pol: null,
      shade: !!ed.shade, dither: ed.dither || 0, lockAlpha: !!ed.lockAlpha, onion: !!ed.onion, playing: false, pvFrame: 0,
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
      covered: () => H.covered(ed),
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
    ed.unmount = () => { commitFloat(ed, H); finishPen(ed, H, true); stopPlay(ed); };
    // History hooks (suite.js): put a lifted selection down before undo, redo or a
    // new document, forget a selection that no longer fits, and let autosave see
    // the sprite with whatever is lifted off it laid back in.
    ed.beforeHistory = () => { commitFloat(ed, H); };
    ed.afterHistory = () => {
      ed.float = null; ed.drag = null; ed.stamp = null;
      if (ed.mask && ed.mask.length !== ed.doc.w * ed.doc.h) ed.mask = null;
    };
    ed.snapshotDoc = () => (ed.float ? Object.assign({}, ed.doc, { bitmap: withFloat(ed.doc.bitmap, ed.float, ed.doc.w, ed.doc.h) }) : ed.doc);
    ed.relook = () => { ed.st.look = SuiteStage.LOOKS[H.look()] || SuiteStage.LOOKS.graphite; draw(ed); };
    ed.viewClick = (o) => {
      if (o === "grid") { ed.grid = !ed.grid; render(ed, H, {}); }
      if (o === "clearguides") { H.mutate(ed, () => { ed.doc.guides = { v: [], h: [] }; }); H.status(ed, "Guides cleared."); }
      if (o === "polish") { ed.polish = !ed.polish; render(ed, H, {}); H.sound(ed.polish ? "grid" : "tuck"); H.status(ed, ed.polish ? polishLine(ed) : ""); }
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
  // Points as the brush lays them: each one a dab of the brush's size.
  const dab = (ed, pts) => (ed.size > 1 ? pts.flatMap(([x, y]) => brushPts(x, y, ed.size)) : pts);
  function paintPts(ed, pts, colour, dithered) { for (const [x, y] of mirrored(ed, pts)) if (lands(ed, x, y, colour, dithered)) D.setPx(ed.doc, x, y, colour); }
  // A freehand stroke, pixel by pixel. It remembers what it painted over, so
  // with pixel-perfect on, an L-shaped corner can go back to what it was.
  // Each pixel that changes plucks a note: its colour's step in the ramp, so
  // shading down a ramp plays a scale.
  function strokeTo(ed, H, d, pts) {
    const ink = inkOf(ed), w = ed.doc.w;
    // Shading ink: each pixel the stroke passes steps once along the ramp,
    // darker, or lighter with the right button.
    if (shadeOn(ed)) {
      d.ramp = d.ramp || rampOf(ed.doc.palette, ed.doc.bitmap);
      for (const p of pts) for (const [mx, my] of mirrored(ed, [p])) {
        const k = my * w + mx, c = D.getPx(ed.doc, mx, my);
        if (d.orig.has(k) || !c) continue;
        d.orig.set(k, c);
        const next = shadeStep(d.ramp, c, ed.rightInk ? 1 : -1);
        if (next !== c) { D.setPx(ed.doc, mx, my, next); H.sound("px", { h: rampStep(ed.doc, next) }); }
      }
      return;
    }
    for (const p of pts) {
      const l = d.trail[d.trail.length - 1];
      if (l && l[0] === p[0] && l[1] === p[1]) continue;
      // A wide brush just dabs: there are no L-shaped corners to take back.
      if (ed.size > 1) { paintPts(ed, brushPts(p[0], p[1], ed.size), ink, true); d.trail.push(p); if (d.trail.length > 3) d.trail.shift(); continue; }
      for (const [mx, my] of mirrored(ed, [p])) { const k = my * w + mx; if (!d.orig.has(k)) d.orig.set(k, D.getPx(ed.doc, mx, my) || ""); }
      const was = inDoc(ed, p[0], p[1]) ? D.getPx(ed.doc, p[0], p[1]) || "" : ink;
      if (was !== ink && lands(ed, p[0], p[1], ink, true)) H.sound("px", { h: rampStep(ed.doc, ink || was), erase: !ink });
      paintPts(ed, [p], ink, true);
      d.trail.push(p);
      if (ed.perfect && !ditherOn(ed)) {
        const i = perfectDrop(d.trail);
        if (i >= 0) {
          for (const [mx, my] of mirrored(ed, [d.trail[i]])) D.setPx(ed.doc, mx, my, d.orig.get(my * w + mx) || "");
          d.trail.splice(i, 1);
        }
      }
      if (d.trail.length > 3) d.trail.shift();
    }
  }
  const mirrorOK = (ed) => ed.bonus.includes("mirror");
  const shadeOn = (ed) => !!ed.shade && ed.tool === "pencil" && ed.bonus.includes("shade");
  const ditherOn = (ed) => !!ed.dither && ed.bonus.includes("dither");
  const lockOn = (ed) => !!ed.lockAlpha && ed.bonus.includes("lockalpha");
  // Where paint may land. Lock alpha keeps to pixels already drawn and rubs
  // none out; the dither brush keeps to its pattern.
  function lands(ed, x, y, colour, dithered) {
    if (lockOn(ed) && (!colour || !D.getPx(ed.doc, x, y))) return false;
    if (dithered && ditherOn(ed) && !DITHERS[ed.dither](x, y)) return false;
    return true;
  }

  /* ── frames: a sprite that moves ───────────────────────── */
  // Frame lengths on the game's own beat, so an animation keeps time with the
  // music: a sixteenth at 96 bpm is 156 ms.
  const STEP_MS = 60000 / 96 / 4;
  const LENGTHS = [[1, "1/4 beat"], [2, "1/2 beat"], [3, "3/4 beat"], [4, "1 beat"], [6, "1 1/2 beats"], [8, "2 beats"]];
  const framesOK = (ed) => ed.bonus.includes("frames");

  function paintTime(ed, H) {
    const el = ed.body.querySelector(".sx__time");
    if (!el) return;
    el.hidden = !framesOK(ed);
    if (el.hidden) { stopPlay(ed); return; }
    const doc = ed.doc, frames = D.framesOf(doc), n = frames.length, cur = doc.frames ? doc.frame : 0;
    if (n < 2) stopPlay(ed);
    const ms = frames[cur].ms, near = LENGTHS.find(([k]) => Math.abs(Math.round(k * STEP_MS) - ms) <= 2);
    el.innerHTML = '<span class="sx__olab">FRAMES</span>' +
      ib("fr:prev", "fr-prev", "Previous frame (,)", false, n < 2) +
      ib("fr:play", ed.playing ? "fr-stop" : "fr-play", ed.playing ? "Stop the preview" : "Play it in the preview", ed.playing, n < 2) +
      ib("fr:next", "fr-next", "Next frame (.)", false, n < 2) + '<span class="sx__osep"></span>' +
      '<span class="sx__frs">' + frames.map((f, i) => '<button class="sx__fr' + (i === cur ? " on" : "") + '" data-fr="' + i + '" title="Frame ' + (i + 1) + ", " + f.ms + ' ms">' +
        '<canvas width="' + doc.w + '" height="' + doc.h + '"></canvas><i>' + (i + 1) + "</i></button>").join("") + "</span>" +
      ib("fr:add", "plus", "New frame: a copy of this one, straight after it") + '<span class="sx__osep"></span>' +
      (n > 1
        ? '<label class="sx__num"><span>LENGTH</span><select data-o="frms">' +
          LENGTHS.map(([k, label]) => '<option value="' + Math.round(k * STEP_MS) + '"' + (near && near[0] === k ? " selected" : "") + ">" + label + "</option>").join("") +
          (near ? "" : '<option selected value="' + ms + '">' + ms + " ms</option>") + "</select></label>" +
          ib("fr:left", "fr-left", "Move this frame earlier", false, cur === 0) + ib("fr:right", "fr-right", "Move this frame later", false, cur === n - 1) +
          ib("fr:del", "l-del", "Delete this frame") + '<span class="sx__osep"></span>' +
          ib("fr:onion", "fr-onion", "Onion skin: the frame before shows through in red, the one after in blue", ed.onion)
        : '<span class="sx__ohint">Add a frame to animate. Each starts as a copy of the one before.</span>');
    el.querySelectorAll(".sx__fr canvas").forEach((c, i) => {
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      R.draw(g, Object.assign({}, doc, { bitmap: frames[i].px }), { scale: 1, checker: true });
    });
  }
  function frameAct(ed, H, what) {
    const doc = ed.doc;
    commitFloat(ed, H); finishPen(ed, H, true);
    if (what === "add") {
      if (!H.mutate(ed, () => D.addFrame(doc))) { H.status(ed, "That's as many frames as a sprite can have."); return; }
      H.sound("layer");
      H.status(ed, "Frame " + (doc.frame + 1) + " of " + doc.frames.length + ", a copy of the one before: change what moves.");
    }
    if (what === "del") { H.mutate(ed, () => D.removeFrame(doc)); H.sound("tuck"); }
    if (what === "left" || what === "right") { H.mutate(ed, () => D.moveFrame(doc, what === "left" ? -1 : 1)); H.sound("tool"); }
    if ((what === "prev" || what === "next") && doc.frames) {
      D.goFrame(doc, (doc.frame + (what === "next" ? 1 : -1) + doc.frames.length) % doc.frames.length);
      render(ed, H, {});
      H.sound("tool");
      H.status(ed, "Frame " + (doc.frame + 1) + " of " + doc.frames.length + ".");
    }
    if (what === "play") { if (ed.playing) stopPlay(ed); else startPlay(ed); paintTime(ed, H); paintPreview(ed); }
    if (what === "onion") { ed.onion = !ed.onion; render(ed, H, {}); H.sound("tool"); }
  }
  // The preview plays the frames, each for its own length, while you draw.
  function startPlay(ed) {
    stopPlay(ed);
    if (!ed.doc.frames) return;
    ed.playing = true;
    ed.pvFrame = ed.doc.frame;
    const step = () => {
      if (!ed.playing || !ed.body.isConnected || !ed.doc.frames) { stopPlay(ed); return; }
      ed.pvFrame = (ed.pvFrame + 1) % ed.doc.frames.length;
      paintPreview(ed);
      ed.playTimer = setTimeout(step, ed.doc.frames[ed.pvFrame].ms);
    };
    ed.playTimer = setTimeout(step, ed.doc.frames[ed.pvFrame].ms);
  }
  function stopPlay(ed) { clearTimeout(ed.playTimer); ed.playTimer = 0; ed.playing = false; }
  // The frames either side, faint: the one before in red, the one after in blue.
  function onion(ed, ctx) {
    const doc = ed.doc, fr = D.framesOf(doc);
    const tint = (px, colour) => { ctx.fillStyle = colour; for (let i = 0; i < px.length; i++) if (px[i]) ctx.fillRect(i % doc.w, Math.floor(i / doc.w), 1, 1); };
    ctx.save();
    ctx.globalAlpha = 0.32;
    if (doc.frame > 0) tint(fr[doc.frame - 1].px, "#FF4040");
    if (doc.frame < fr.length - 1) tint(fr[doc.frame + 1].px, "#3FA0FF");
    ctx.restore();
  }

  /* ── craft sounds ──────────────────────────────────────── */
  // Where a colour sits in the sprite's ramp, 0 (darkest) to 1 (lightest):
  // its place in the palette when it's there, otherwise just how light it is.
  function rampStep(doc, c) {
    if (!c) return 0;
    const pal = (doc.palette || []).filter(Boolean);
    if (pal.length > 1 && pal.includes(c)) { const s = pal.slice().sort((a, b) => P.luma(a) - P.luma(b)); return s.indexOf(c) / (s.length - 1); }
    return P.luma(c) / 255;
  }
  // A line's runs, in order: how many pixels go along before each step.
  function runsOf(pts) {
    if (pts.length < 2) return [pts.length];
    const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1], k = Math.abs(x1 - x0) >= Math.abs(y1 - y0) ? 1 : 0;
    const out = [];
    let n = 0, last = null;
    for (const p of pts) { if (last !== null && p[k] !== last) { out.push(n); n = 0; } n++; last = p[k]; }
    out.push(n);
    return out;
  }
  // A small burst over each thing just tidied, and one of Tori's gold stars
  // when nothing's left. Over the canvas, never on it; not with reduced motion.
  function pops(ed, H, cells, star) {
    if (H.reduced()) return;
    const cv = ed.st.cv, host = cv.parentNode;
    const put = (cls, x, y, html) => {
      const el = document.createElement("i");
      el.className = cls; el.setAttribute("aria-hidden", "true");
      el.style.left = cv.offsetLeft + x + "px"; el.style.top = cv.offsetTop + y + "px";
      if (html) el.innerHTML = html;
      host.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      setTimeout(() => el.remove(), 2000);
    };
    for (const [x, y] of cells.slice(0, 10)) { const p = ed.st.toView(x + 0.5, y + 0.5); put("sx__pop", p.x, p.y); }
    if (star) { const m = ed.st.toView(ed.doc.w / 2, ed.doc.h / 2); put("sx__star", m.x, m.y, iconSVG("star", 64)); }
  }

  /* ── Polish ────────────────────────────────────────────── */
  // What's left to tidy, found again after every change. While Polish is on,
  // each thing tidied chimes, and the last one plays a little run.
  function polishCheck(ed, H) {
    if (!P || !ed.doc.bitmap) return;
    const before = ed.pol, was = before ? before.total : null;
    ed.pol = P.find(ed.doc.bitmap, ed.doc.w, ed.doc.h);
    if (!ed.polish || was === null || ed.pol.total === was) return;
    // The status line keeps count, unless it's saying something else.
    const said = String((ed.win && ed.win.status) || "");
    if (!said || /^(Polish|Clean|Gold)/.test(said)) H.status(ed, ed.pol.total ? polishLine(ed) : "Gold star: clean. Nothing left for Polish to ring.");
    if (ed.pol.total > was) return;
    const still = new Set(ed.pol.marks.map((m) => m.x + "," + m.y));
    pops(ed, H, before.marks.filter((m) => !still.has(m.x + "," + m.y)).map((m) => [m.x, m.y]), !ed.pol.total);
    H.sound(ed.pol.total ? "polish-fix" : "polish-clean");
  }
  // "Polish rings 3 lone pixels and 1 doubled corner."
  function polishLine(ed) {
    const pol = ed.pol;
    if (!pol || !pol.total) return ed.doc.bitmap.some(Boolean) ? "Polish: nothing to tidy. It's clean." : "Polish rings what's worth tidying, once there's something drawn.";
    const parts = P.KINDS.filter((k) => pol.counts[k.id]).map((k) => P.say(k.id, pol.counts[k.id]));
    return "Polish rings " + (parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0]) + ".";
  }
  // What each ring means, and what to do about the first kind still showing.
  const POLISH_TIPS = {
    stray: "A lone pixel is noise, unless it's a glint you meant. A pinhole wants filling.",
    double: "A doubled corner: take the pixel at the corner of the L out.",
    step: "An uneven step: even the run out with the ones round it, or redraw with Line and Shift.",
  };
  function paintPolish(ed, ctx, b, z) {
    const colour = Object.fromEntries(P.KINDS.map((k) => [k.id, k.colour]));
    ctx.save();
    for (const m of ed.pol.marks.slice(0, 5000)) {
      const x = b.x + m.x * z, y = b.y + m.y * z;
      ctx.beginPath();
      if (z >= 8) ctx.rect(Math.round(x) + 1.5, Math.round(y) + 1.5, Math.max(1, Math.round(z) - 3), Math.max(1, Math.round(z) - 3));
      else ctx.arc(x + z / 2, y + z / 2, Math.max(3, z * 0.9), 0, Math.PI * 2);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = colour[m.kind]; ctx.stroke();
    }
    ctx.restore();
  }

  /* ── drawing ───────────────────────────────────────────── */
  function render(ed, H, o) {
    if (!ed.body.isConnected) return;
    D.syncFrame(ed.doc);
    polishCheck(ed, H);
    draw(ed);
    paintTime(ed, H);
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
    if (ed.onion && framesOK(ed) && doc.frames) onion(ed, ctx);
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
    if (ed.polish && ed.pol && ed.pol.total && !ed.drag) paintPolish(ed, ctx, b, z);
    const look = st.look;
    ctx.save(); ctx.strokeStyle = look.smart; ctx.setLineDash([5, 4]);
    if (ed.mx) { ctx.beginPath(); ctx.moveTo(b.x + cw / 2, b.y - 8); ctx.lineTo(b.x + cw / 2, b.y + ch + 8); ctx.stroke(); }
    if (ed.my) { ctx.beginPath(); ctx.moveTo(b.x - 8, b.y + ch / 2); ctx.lineTo(b.x + cw + 8, b.y + ch / 2); ctx.stroke(); }
    ctx.restore();
    // What a shape, the pen or a stamp would lay down.
    const ghost = previewPts(ed);
    if (ghost.length) {
      ctx.globalAlpha = 0.85; ctx.fillStyle = inkOf(ed) || "#FFFFFF";
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
      if (ed.tool === "line") return d.clean ? cleanLine(x0, y0, x1, y1).pts : linePts(x0, y0, x1, y1);
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
    const frames = D.framesOf(ed.doc);
    const doc = ed.playing && frames.length > 1 ? Object.assign({}, ed.doc, { bitmap: frames[ed.pvFrame % frames.length].px }) : ed.doc;
    const v = ed.looks || {}, n = v.tile ? 3 : 1;
    const k = Math.max(1, Math.floor(Math.min(112 / (ed.doc.w * n), 112 / (ed.doc.h * n))));
    const one = document.createElement("canvas");
    one.width = ed.doc.w * k; one.height = ed.doc.h * k;
    const g = one.getContext("2d");
    g.imageSmoothingEnabled = false;
    // Every drawn pixel in one dark ink, on plain ground: the shape alone.
    R.draw(g, v.sil ? Object.assign({}, doc, { bg: null }) : doc, { scale: k, checker: !v.sil });
    if (v.sil) { g.globalCompositeOperation = "source-in"; g.fillStyle = "#0A0A0A"; g.fillRect(0, 0, one.width, one.height); }
    c.width = one.width * n; c.height = one.height * n;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (v.sil) { ctx.fillStyle = "#E9E9E4"; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.filter = v.grey ? "grayscale(1)" : "none";
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) ctx.drawImage(one, i * one.width, j * one.height);
    ed.body.querySelectorAll("[data-pv]").forEach((b) => { const on = !!v[b.dataset.pv]; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  }
  function paintSide(ed) {
    const sec = ed.body.querySelector(".sx__panel--pol");
    if (sec && P) {
      sec.hidden = !ed.polish;
      const pol = ed.pol || { total: 0, counts: {} }, first = P.KINDS.find((k) => pol.counts[k.id]);
      if (ed.polish) sec.querySelector(".sx__pol").innerHTML = pol.total
        ? P.KINDS.filter((k) => pol.counts[k.id]).map((k) => '<p class="sx__polk"><i style="border-color:' + k.colour + '"></i>' + esc(P.say(k.id, pol.counts[k.id])) + "</p>").join("") +
          '<p class="sx__hint">' + esc(POLISH_TIPS[first.id]) + "</p>"
        : '<p class="sx__polk sx__polk--ok">' + (ed.doc.bitmap.some(Boolean) ? "Clean. Nothing to tidy." : "Nothing drawn yet.") + "</p>";
    }
    const used = [...new Set(ed.doc.bitmap.filter(Boolean))];
    ed.body.querySelector(".sx__used").innerHTML = used.length
      ? used.map((c) => '<button class="sx__chip" data-pal="' + c + '" style="background:' + c + '" title="' + c + ' — draw with it"></button>').join("") +
        '<p class="sx__hint">' + used.length + " colour" + (used.length === 1 ? "" : "s") + " in the sprite</p>"
      : '<p class="sx__hint">Nothing drawn yet.</p>';
  }

  /* ── pointer ───────────────────────────────────────────── */
  // The right button paints with the other ink: nothing (it rubs out) with
  // every tool that paints, and the colour with the eraser, the way pixel
  // editors have always done it.
  const RIGHT = ["pencil", "erase", "fill", "line", "rect", "ellipse"];
  const inkOf = (ed) => ((ed.tool === "erase") !== !!ed.rightInk ? "" : ed.fg);
  function wirePointer(ed, H) {
    const cv = ed.st.cv;
    cv.addEventListener("pointerdown", (e) => {
      if (e.button === 0 || (e.button === 2 && RIGHT.includes(ed.tool))) { ed.rightInk = e.button === 2; down(ed, H, e); }
    });
    cv.addEventListener("pointermove", (e) => move(ed, H, e));
    cv.addEventListener("pointerup", () => up(ed, H));
    cv.addEventListener("pointercancel", () => up(ed, H));
    cv.addEventListener("contextmenu", (e) => e.preventDefault());
    cv.addEventListener("dblclick", () => {
      if (ed.tool === "pen") finishPen(ed, H);
      else if (ed.tool === "fill") fillEverywhere(ed, H);
    });
  }
  // Fill, double-clicked: the colour the first click filled over is swapped for
  // the new one everywhere in the sprite, not just where it touches.
  function swapColour(ed, was, ink) {
    const b = ed.doc.bitmap;
    let n = 0;
    for (let i = 0; i < b.length; i++) if ((b[i] || "") === was) { b[i] = ink; n++; }
    return n;
  }
  function fillEverywhere(ed, H) {
    const f = ed.lastFill;
    ed.lastFill = null;
    if (!f || Date.now() - f.at > 600 || f.was === f.ink) return;
    const pre = JSON.stringify(ed.doc);
    if (!swapColour(ed, f.was, f.ink)) return;
    H.record(ed, pre);
    render(ed, H, {});
    H.sound("layer");
    H.status(ed, "Every " + (f.was || "empty") + " pixel is " + (f.ink || "empty") + " now, all over the sprite.");
  }
  const cell = (ed, e) => { const p = ed.st.toDoc(e); return [Math.floor(p.x), Math.floor(p.y)]; };
  // The pixels a fill from x, y would cover (4-connected, one colour).
  function region(doc, x, y) {
    const target = D.getPx(doc, x, y), out = [], seen = new Uint8Array(doc.w * doc.h), stack = [[x, y]];
    if (target === null) return out;
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= doc.w || py >= doc.h || seen[py * doc.w + px] || D.getPx(doc, px, py) !== target) continue;
      seen[py * doc.w + px] = 1;
      out.push([px, py]);
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    return out;
  }

  function down(ed, H, e) {
    const [x, y] = cell(ed, e), doc = ed.doc, pre = JSON.stringify(doc);
    ed.st.cv.setPointerCapture(e.pointerId);
    const t = ed.tool;
    if (t !== "select") commitFloat(ed, H);
    // Alt with any tool that paints: pick up the colour under it instead.
    const painting = ["pencil", "erase", "fill", "line", "rect", "ellipse", "pen"].includes(t);
    if (t === "pick" || (painting && e.altKey)) { const c = D.getPx(doc, x, y); if (c) { ed.fg = c; H.status(ed, "Picked " + c); paintOpts(ed, H); } return; }
    if (t === "fill") {
      // The second click of a double-click: leave the first one's record (what
      // it filled over) for the double-click to use.
      const f = ed.lastFill;
      if (f && f.x === x && f.y === y && Date.now() - f.at < 500) return;
      ed.lastFill = { x, y, was: D.getPx(doc, x, y) || "", ink: inkOf(ed), at: Date.now() };
      if (ed.fillAll && !ditherOn(ed) && lands(ed, x, y, inkOf(ed), false)) { ed.lastFill.at = 0; swapColour(ed, ed.lastFill.was, inkOf(ed)); H.record(ed, pre); H.sound("layer"); render(ed, H, {}); return; }
      for (const [px, py] of mirrored(ed, [[x, y]])) {
        if (!lands(ed, px, py, inkOf(ed), false)) continue;
        if (ditherOn(ed)) { for (const [qx, qy] of region(doc, px, py)) if (DITHERS[ed.dither](qx, qy)) D.setPx(doc, qx, qy, inkOf(ed)); }
        else D.fill(doc, px, py, inkOf(ed));
      }
      H.record(ed, pre); H.sound("layer"); render(ed, H, {}); return;
    }
    if (t === "pencil" || t === "erase") {
      // Shift-click: a straight line on from where the last stroke ended.
      if (e.shiftKey && ed.lastPx && inDoc(ed, ed.lastPx[0], ed.lastPx[1])) {
        const pts = linePts(ed.lastPx[0], ed.lastPx[1], x, y);
        paintPts(ed, dab(ed, pts), inkOf(ed));
        H.sound("px-line", { runs: runsOf(pts), h: rampStep(ed.doc, inkOf(ed)) });
        ed.lastPx = [x, y]; ed.rightInk = false;
        H.record(ed, pre); render(ed, H, {}); return;
      }
      ed.drag = { mode: "paint", pre, last: [x, y], trail: [], orig: new Map() };
      strokeTo(ed, H, ed.drag, [[x, y]]);
      draw(ed); return;
    }
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
    if (t === "wand") { wandAt(ed, H, x, y, tolerance(ed), e.shiftKey, e.altKey); return; }
    if (t === "select") {
      const fx = ed.float ? ed.float.dx : 0, fy = ed.float ? ed.float.dy : 0;
      if (ed.mask && inMask(ed, x - fx, y - fy)) {
        if (!ed.float) lift(ed);
        ed.drag = { mode: "float", from: [x, y], start: [ed.float.dx, ed.float.dy], pre: ed.float.pre };
        return;
      }
      commitFloat(ed, H);
      ed.drag = { mode: "marquee", box: [x, y, x, y], add: e.shiftKey, sub: e.altKey };
      draw(ed);
    }
  }
  const inMask = (ed, x, y) => inDoc(ed, x, y) && ed.mask[y * ed.doc.w + x];

  function move(ed, H, e) {
    const d = ed.drag, [x, y] = cell(ed, e);
    if (ed.tool === "pen" && ed.pen && !d) return;
    if (!d) { ed.st.cv.style.cursor = T.cursor(ed.tool, { overSel: ed.tool === "select" && !!ed.mask && inMask(ed, x - (ed.float ? ed.float.dx : 0), y - (ed.float ? ed.float.dy : 0)) }); return; }
    if (d.mode === "paint") { strokeTo(ed, H, d, linePts(d.last[0], d.last[1], x, y).slice(1)); d.last = [x, y]; draw(ed); return; }
    if (d.mode === "shape") {
      let [x1, y1] = [x, y];
      if (e.shiftKey && ed.tool !== "line") { const m = Math.max(Math.abs(x1 - d.from[0]), Math.abs(y1 - d.from[1])); x1 = d.from[0] + Math.sign(x1 - d.from[0] || 1) * m; y1 = d.from[1] + Math.sign(y1 - d.from[1] || 1) * m; }
      const clean = e.shiftKey && ed.tool === "line";
      if (clean) H.status(ed, "Clean steps: " + cleanLine(d.from[0], d.from[1], x1, y1).ratio + ". Let go of Shift for any angle.");
      else if (d.clean) H.status(ed, "");
      d.clean = clean;
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
    if (d.mode === "paint") { ed.lastPx = d.last; ed.rightInk = false; H.record(ed, d.pre); render(ed, H, {}); return; }
    if (d.mode === "shape") {
      const pts = previewPts(Object.assign({}, ed, { drag: d, pen: null, stamp: null })), ink = inkOf(ed);
      paintPts(ed, pts, ink, ed.filled && ed.tool !== "line"); ed.rightInk = false; H.record(ed, d.pre);
      if (ed.tool === "line") H.sound("px-line", { runs: runsOf(pts), h: rampStep(ed.doc, ink) }); else H.sound("layer");
      render(ed, H, {}); return;
    }
    if (d.mode === "marquee") {
      const [x0, y0, x1, y1] = d.box, w = ed.doc.w;
      const m = (d.add || d.sub) && ed.mask ? ed.mask : new Uint8Array(w * ed.doc.h);
      for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(ed.doc.h - 1, Math.max(y0, y1)); y++) for (let x = Math.max(0, Math.min(x0, x1)); x <= Math.min(w - 1, Math.max(x0, x1)); x++) m[y * w + x] = d.sub ? 0 : 1;
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
  // The bitmap with a lifted selection laid back down where it is now held.
  function withFloat(bitmap, fl, w, h) {
    const out = bitmap.slice();
    for (const [x, y, c] of fl.px) { const px = x + fl.dx, py = y + fl.dy; if (px >= 0 && py >= 0 && px < w && py < h) out[py * w + px] = c; }
    return out;
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
    if (what === "all") { commitFloat(ed, H); ed.mask = new Uint8Array(ed.doc.w * ed.doc.h).fill(1); if (ed.tool !== "wand") ed.tool = "select"; render(ed, H, {}); return; }
    if (!ed.mask) return;
    commitFloat(ed, H);
    const doc = ed.doc;
    if (what === "invert" || what === "grow" || what === "shrink") {
      const m = what === "invert" ? selInvert(ed.mask) : what === "grow" ? selGrow(ed.mask, doc.w, doc.h) : selShrink(ed.mask, doc.w, doc.h);
      ed.mask = X.count(m) ? m : null;
      H.sound("layer");
      render(ed, H, {});
      return;
    }
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
    if (what === "fliph" || what === "flipv" || what === "rotate" || what === "outline") {
      H.mutate(ed, () => {
        const r = what === "outline" ? selOutline(doc.bitmap, ed.mask, doc.w, doc.h, ed.fg) : selTransform(doc.bitmap, ed.mask, doc.w, doc.h, what);
        if (!r) return;
        doc.bitmap = r.bitmap;
        ed.mask = X.count(r.mask) ? r.mask : null;
      });
      H.sound("layer");
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
  // One tolerance for the wand, wherever it is set: the Cutout drawer's slider
  // and the strip's box are the same number.
  const tolerance = (ed) => (ed.win && ed.win.cut && Number.isFinite(ed.win.cut.tol) ? ed.win.cut.tol : 24);
  function wandAt(ed, H, x, y, tol, add, sub) {
    commitFloat(ed, H);
    const len = ed.doc.w * ed.doc.h;
    const m = X.wand(rgbaOf(ed.doc), ed.doc.w, ed.doc.h, x, y, tol, add && ed.mask ? Uint8Array.from(ed.mask) : new Uint8Array(len));
    if (sub && ed.mask) { const keep = Uint8Array.from(ed.mask); for (let i = 0; i < len; i++) if (m[i]) keep[i] = 0; ed.mask = X.count(keep) ? keep : null; }
    else ed.mask = X.count(m) ? m : null;
    if (ed.tool !== "wand") ed.tool = "select";
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
    ed.st.cv.style.cursor = T.cursor(t);
    H.remember(ed);
    H.sound("tool");
    render(ed, H, {});
    H.status(ed, T.hint("pixel", t));
  }
  function onKey(ed, H, e) {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (e.key === " " && !e.repeat) { ed.st.spaceDown = true; const u = (ev) => { if (ev.key === " ") { ed.st.spaceDown = false; document.removeEventListener("keyup", u); } }; document.addEventListener("keyup", u); return true; }
    if ((e.key === "Delete" || e.key === "Backspace") && ed.mask) { selectionAct(ed, H, "clear"); return true; }
    if (e.key === "Enter" && ed.pen) { finishPen(ed, H); return true; }
    if (e.key.startsWith("Arrow") && ed.mask) {
      if (!ed.float) lift(ed);
      const step = e.shiftKey ? 10 : 1;
      ed.float.dx += e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      ed.float.dy += e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      draw(ed);
      return true;
    }
    if (mod && k === "a") { selectionAct(ed, H, "all"); return true; }
    if (mod && k === "i") { selectionAct(ed, H, "invert"); return true; }
    if (mod && (k === "c" || k === "x")) { return copySel(ed, H, k === "x"); }
    if (mod && k === "v") { return pasteSel(ed, H); }
    if (e.shiftKey && !mod && ed.mask && ["h", "v", "r"].includes(k)) { selectionAct(ed, H, { h: "fliph", v: "flipv", r: "rotate" }[k]); return true; }
    if (mod || e.altKey) return false;
    if ((e.key === "," || e.key === ".") && framesOK(ed) && ed.doc.frames) { frameAct(ed, H, e.key === "." ? "next" : "prev"); return true; }
    if (k === "x" && mirrorOK(ed)) { ed.mx = !ed.mx; render(ed, H, {}); return true; }
    const id = T.keyMap("pixel", TOOLS)[k];
    if (id) { setTool(ed, H, id); return true; }
    return false;
  }
  function copySel(ed, H, cut) {
    if (!ed.mask) return false;
    commitFloat(ed, H);
    clip = clipCopy(ed.doc.bitmap, ed.mask, ed.doc.w, ed.doc.h);
    if (!clip) { H.status(ed, "Nothing drawn in the selection to copy."); return true; }
    H.status(ed, (cut ? "Cut " : "Copied ") + clip.px.length + " pixel" + (clip.px.length === 1 ? "" : "s") + ". Paste with the paste key, here or in another sprite.");
    if (cut) selectionAct(ed, H, "clear");
    return true;
  }
  // A paste arrives lifted, in the top-left of the sprite, ready to drag.
  function pasteSel(ed, H) {
    if (!clip) { H.status(ed, "Nothing copied yet."); return true; }
    commitFloat(ed, H);
    const at = clip.w > ed.doc.w || clip.h > ed.doc.h ? [0, 0] : [Math.floor((ed.doc.w - clip.w) / 2), Math.floor((ed.doc.h - clip.h) / 2)];
    const r = clipPaste(clip, ed.doc.w, ed.doc.h, at);
    if (!r.px.length) return true;
    ed.mask = r.mask; ed.tool = "select";
    ed.float = { px: r.px, dx: 0, dy: 0, pre: JSON.stringify(ed.doc) };
    render(ed, H, {});
    H.status(ed, "Pasted. Drag it into place; anything else puts it down.");
    return true;
  }
  function escape(ed, H) {
    if (ed.stamp) { ed.stamp = null; render(ed, H, {}); return true; }
    if (ed.pen) { finishPen(ed, H); return true; }
    if (ed.float) { commitFloat(ed, H); render(ed, H, {}); return true; }
    if (ed.mask) { ed.mask = null; render(ed, H, {}); return true; }
    if (ed.tool !== T.home("pixel")) { setTool(ed, H, T.home("pixel")); return true; }
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
    if (ed.tool === "pencil" || ed.tool === "erase") h += '<label class="sx__num"><span>SIZE</span><input type="number" data-o="size" min="1" max="16" step="1" value="' + ed.size + '"></label>' +
      '<button class="sx__tb' + (ed.perfect && ed.size === 1 ? " on" : "") + '" data-o="perfect" aria-pressed="' + (ed.perfect && ed.size === 1) + '"' + (ed.size > 1 ? " disabled" : "") +
      ' title="Pixel-perfect: a freehand stroke never doubles up at a corner (one-pixel brush)">Pixel-perfect</button><span class="sx__osep"></span>';
    if (ed.tool === "fill") h += '<span class="sx__olab">FILL</span><button class="sx__tb' + (!ed.fillAll ? " on" : "") + '" data-o="fill:joined" aria-pressed="' + !ed.fillAll + '" title="Fill the pixels joined to the one you click">Joined</button>' +
      '<button class="sx__tb' + (ed.fillAll ? " on" : "") + '" data-o="fill:all" aria-pressed="' + ed.fillAll + '" title="Swap that colour everywhere in the sprite (also: double-click)">Every pixel</button><span class="sx__osep"></span>';
    if (ed.tool === "wand") h += '<label class="sx__num"><span>TOLERANCE</span><input type="number" data-o="tol" min="0" max="255" step="4" value="' + tolerance(ed) + '"></label><span class="sx__osep"></span>';
    if ((ed.tool === "select" || ed.tool === "wand") && !ed.mask) h += '<span class="sx__olab">SELECTION</span>' + ib("sel:all", "f-rect", "Select everything (⌘A)") + '<span class="sx__osep"></span>';
    // The pro inks, once earned: shading and dither for the brush, lock alpha
    // for everything that paints.
    const inks = [];
    if (ed.tool === "pencil" && ed.bonus.includes("shade")) inks.push(ib("shade", "ink-shade", "Shading ink: each pixel you pass steps one along the ramp, darker (right button: lighter)", ed.shade));
    if (["pencil", "erase", "fill", "rect", "ellipse"].includes(ed.tool) && ed.bonus.includes("dither"))
      inks.push(ib("dither", "ink-dither", "Dither: paint a checker, " + (ed.dither ? ed.dither + "% now; click for " + (ed.dither === 50 ? "25%" : "off") : "50%; click again for 25%") + (["rect", "ellipse"].includes(ed.tool) ? " (filled shapes)" : ""), !!ed.dither)
        .replace("</button>", ed.dither ? '<b class="sx__badge sx__badge--ink">' + ed.dither + "</b></button>" : "</button>"));
    if (["pencil", "erase", "fill", "line", "rect", "ellipse", "pen", "text"].includes(ed.tool) && ed.bonus.includes("lockalpha"))
      inks.push(ib("lockalpha", "lock-alpha", "Lock alpha: paint lands only on pixels already drawn, and nothing is rubbed out", ed.lockAlpha));
    if (inks.length) h += '<span class="sx__olab">INK</span>' + inks.join("") + '<span class="sx__osep"></span>';
    if (ed.mask) h += '<span class="sx__olab">SELECTION</span>' + ib("sel:paint", "t-fill", "Recolour what's drawn in it") + ib("sel:fillsel", "f-rect", "Fill it") +
      ib("sel:fliph", "flip-h", "Flip it left to right (Shift+H)") + ib("sel:flipv", "flip-v", "Flip it top to bottom (Shift+V)") + ib("sel:rotate", "rot90", "Turn it a quarter clockwise (Shift+R)") +
      ib("sel:outline", "s-outline", "Outline what's in it, one pixel, in the drawing colour") +
      ib("sel:invert", "c-invert", "Select everything else (⌘I)") + ib("sel:grow", "plus", "Grow it by a pixel") + ib("sel:shrink", "l-del", "Shrink it by a pixel") +
      ib("sel:clear", "l-del", "Clear it (Del)") + ib("sel:card", "card", "Make it a card") + ib("sel:none", "none", "Deselect (Esc)") + '<span class="sx__osep"></span>';
    if (mirrorOK(ed)) h += ib("mx", "mirror", "Mirror left to right (X)", ed.mx) + ib("my", "mirror-h", "Mirror top to bottom", ed.my) + '<span class="sx__osep"></span>';
    const f = ed.st.focus(), left = ed.pol ? ed.pol.total : 0;
    H.viewBar(ed, ib("grid", "grid", f ? "Tile grid " + Math.round(f.px) + " × " + Math.round(f.py) + " px" : "Tile grid: pull two guides down and two across", ed.grid && !!f, !f).replace('data-o="', 'data-v="') +
      ib("clearguides", "guides-x", "Clear all guides", false, !(ed.doc.guides && (ed.doc.guides.v.length || ed.doc.guides.h.length))).replace('data-o="', 'data-v="') +
      ib("polish", "polish", "Polish: ring what a pixel artist would tidy: lone pixels, doubled corners, uneven steps", ed.polish).replace('data-o="', 'data-v="')
        .replace("</button>", ed.polish ? '<b class="sx__badge' + (left ? "" : " sx__badge--ok") + '">' + (left > 99 ? "99+" : left) + "</b></button>" : "</button>"));
    h += '<span class="sx__ospace"></span>' +
      '<span class="sx__pal">' + ed.doc.palette.map((c) => '<button class="sx__chip' + (c === ed.fg ? " on" : "") + '" data-pal="' + c + '" style="background:' + c + '" title="' + c + ' — Alt-click to remove"></button>').join("") +
      '<button class="sx__chip sx__chip--add" data-o="addpal" title="Add the drawing colour">+</button></span>';
    el.innerHTML = h;
  }
  function wirePanels(ed, H) {
    ed.body.addEventListener("click", (e) => {
      const pv = e.target.closest("[data-pv]");
      if (pv) { ed.looks = Object.assign({}, ed.looks, { [pv.dataset.pv]: !(ed.looks || {})[pv.dataset.pv] }); paintPreview(ed); H.sound("tool"); return; }
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
      if (o === "perfect") { ed.perfect = !ed.perfect; H.remember(ed); paintOpts(ed, H); H.sound("tool"); }
      if (o === "fill:joined" || o === "fill:all") { ed.fillAll = o === "fill:all"; H.remember(ed); paintOpts(ed, H); H.sound("tool"); }
      if (o === "shade") { ed.shade = !ed.shade; paintOpts(ed, H); H.sound("tool"); H.status(ed, ed.shade ? "Shading ink: drag over pixels to step them darker along the ramp; the right button steps them lighter." : ""); }
      if (o === "dither") { ed.dither = ed.dither === 50 ? 25 : ed.dither === 25 ? 0 : 50; paintOpts(ed, H); H.sound("tool"); H.status(ed, ed.dither ? "Dither: a " + ed.dither + "% checker, fixed to the sprite's grid so strokes and fills mesh." : ""); }
      if (o === "lockalpha") { ed.lockAlpha = !ed.lockAlpha; paintOpts(ed, H); H.sound("tool"); H.status(ed, ed.lockAlpha ? "Lock alpha: only pixels already drawn take paint, and none are rubbed out." : ""); }
      if (o === "mx") { ed.mx = !ed.mx; render(ed, H, {}); }
      if (o === "my") { ed.my = !ed.my; render(ed, H, {}); }
      if (o === "grid") { ed.grid = !ed.grid; render(ed, H, {}); }
      if (o === "stamp") commitStamp(ed, H);
      if (o === "addpal") H.mutate(ed, () => { if (!ed.doc.palette.includes(ed.fg)) ed.doc.palette.push(ed.fg); });
      if (o && o.startsWith("sel:")) selectionAct(ed, H, o.slice(4));
      if (o && o.startsWith("fr:")) frameAct(ed, H, o.slice(3));
    });
    ed.body.addEventListener("click", (e) => {
      const f = e.target.closest("[data-fr]");
      if (!f || !ed.doc.frames) return;
      commitFloat(ed, H); finishPen(ed, H, true);
      D.goFrame(ed.doc, Number(f.dataset.fr));
      render(ed, H, {});
      H.sound("tool");
      H.status(ed, "Frame " + (ed.doc.frame + 1) + " of " + ed.doc.frames.length + ".");
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
      if (e.target.dataset.o === "size") { ed.size = Math.max(1, Math.min(16, Math.round(Number(e.target.value)) || 1)); H.remember(ed); paintOpts(ed, H); return; }
      if (e.target.dataset.o === "tol") {
        const v = Math.max(0, Math.min(255, Math.round(Number(e.target.value)) || 0));
        if (ed.win && ed.win.cut) { ed.win.cut.tol = v; if (ed.win.drawers && ed.win.drawers.repaint) ed.win.drawers.repaint("cutout"); }
        paintOpts(ed, H); return;
      }
      if (e.target.dataset.o === "frms") { H.mutate(ed, () => D.frameMs(ed.doc, Number(e.target.value))); return; }
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

  return { mount, TOOLS, DITHERS, brushPts, selInvert, selGrow, selShrink, clipCopy, clipPaste, linePts, rectPts, ellipsePts, curvePts, perfectDrop, cleanLine, selTransform, selOutline, withFloat, rampOf, shadeStep };
})();

if (typeof module !== "undefined") module.exports = SuitePixelEd;
