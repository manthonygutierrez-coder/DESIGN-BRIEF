"use strict";
/* ── guides and the focus grid ────────────────────────────
 * Guides are lines you pull out of the rulers. Two down and two across meet at
 * four points, and the box between those points becomes the module of a grid
 * over the whole canvas: the focus grid. A box too big to be a module is split
 * evenly inside, and the lines carry on outward at that size, lined up with
 * your guides.
 *
 *   { v: [x, …], h: [y, …] }   vertical guides by x, horizontal by y; the last
 *                              two on each axis are the ones you placed last
 *
 *   focus(guides, w, h)        the grid, or null until two guides cross two others
 *   snap(v, lines, tol)        the nearest line to a value, within tol
 *   snapBox(box, xs, ys, tol)  a box's edges and middle pulled onto lines
 *   smart(box, others, frame)  lines up with the canvas and the other layers,
 *                              and the lines to draw while it holds
 *
 * Pure.
 */

const SuiteGuides = (() => {
  const MAX = 40;
  const MIN_CELL = 4;
  const MODULES = 6;          // a module is at most 1/6 of the canvas's short side
  const LINES = 600;          // never draw more than this many lines an axis
  const r2 = (v) => Math.round(v * 100) / 100;

  function normalize(raw, w = 4096, h = 4096) {
    const g = raw && typeof raw === "object" ? raw : {};
    const clean = (list, lim) => (Array.isArray(list) ? list : [])
      .map(Number).filter((n) => Number.isFinite(n) && n >= -lim && n <= lim * 2).slice(-MAX).map(r2);
    return { v: clean(g.v, w), h: clean(g.h, h) };
  }

  // Placing or moving a guide makes it the newest on its axis.
  function put(guides, axis, value, from = -1) {
    const list = guides[axis].slice();
    if (from >= 0 && from < list.length) list.splice(from, 1);
    list.push(r2(value));
    if (list.length > MAX) list.shift();
    return Object.assign({}, guides, { [axis]: list });
  }
  function drop(guides, axis, index) {
    const list = guides[axis].slice();
    list.splice(index, 1);
    return Object.assign({}, guides, { [axis]: list });
  }

  const pair = (list) => (list.length >= 2 ? [Math.min(list[list.length - 1], list[list.length - 2]), Math.max(list[list.length - 1], list[list.length - 2])] : null);

  // Every line `pitch` apart through `from`, between lo and hi.
  function run(from, pitch, lo, hi) {
    const out = [];
    if (!(pitch > 0)) return out;
    let k = Math.ceil((lo - from) / pitch - 1e-9);
    for (let n = 0; n < LINES; n++, k++) {
      const x = from + k * pitch;
      if (x > hi + 1e-9) break;
      out.push(r2(x));
    }
    return out;
  }

  /* The four points are where the newest two vertical guides cross the newest
   * two horizontal ones. `pad` carries the lines out past the canvas edge, over
   * the pasteboard. */
  function focus(guides, w, h, opts = {}) {
    const vx = pair(guides.v || []), hy = pair(guides.h || []);
    if (!vx || !hy) return null;
    const cw = vx[1] - vx[0], ch = hy[1] - hy[0];
    if (cw < MIN_CELL || ch < MIN_CELL) return null;
    const limit = Math.max(MIN_CELL * 2, Math.min(w, h) / (opts.modules || MODULES));
    const nx = cw > limit ? Math.ceil(cw / limit - 1e-9) : 1;
    const ny = ch > limit ? Math.ceil(ch / limit - 1e-9) : 1;
    const px = cw / nx, py = ch / ny, pad = opts.pad || 0;
    return {
      cell: { x: vx[0], y: hy[0], w: cw, h: ch }, nx, ny, px, py,
      xs: run(vx[0], px, -pad, w + pad), ys: run(hy[0], py, -pad, h + pad),
      major: { xs: run(vx[0], cw, -pad, w + pad), ys: run(hy[0], ch, -pad, h + pad) },
    };
  }

  function snap(v, lines, tol) {
    let best = null, bd = tol;
    for (const l of lines) { const d = Math.abs(l - v); if (d <= bd) { bd = d; best = l; } }
    return best;
  }

  // Which of a box's left / middle / right (top / middle / bottom) lands
  // closest to a line, and how far to move it there.
  function snapAxis(lo, size, lines, tol, ends = true) {
    const probes = ends ? [lo, lo + size / 2, lo + size] : [lo + size / 2];
    let best = null;
    for (const p of probes) {
      const l = snap(p, lines, tol);
      if (l !== null && (!best || Math.abs(l - p) < Math.abs(best.d))) best = { d: l - p, at: l };
    }
    return best;
  }

  function snapBox(box, xs, ys, tol) {
    const sx = snapAxis(box.x, box.w, xs, tol), sy = snapAxis(box.y, box.h, ys, tol);
    return { dx: sx ? sx.d : 0, dy: sy ? sy.d : 0, x: sx ? sx.at : null, y: sy ? sy.at : null };
  }

  /* Smart guides: the canvas's edges and middle, and every other layer's.
   * Returns the nudge that lines the box up, and a line to draw for each axis
   * that caught, spanning the things it lines up. */
  function smart(box, others, frame, tol) {
    const xs = [frame.x, frame.x + frame.w / 2, frame.x + frame.w], ys = [frame.y, frame.y + frame.h / 2, frame.y + frame.h];
    for (const o of others) {
      xs.push(o.x, o.x + o.w / 2, o.x + o.w);
      ys.push(o.y, o.y + o.h / 2, o.y + o.h);
    }
    const s = snapBox(box, xs, ys, tol);
    const moved = { x: box.x + s.dx, y: box.y + s.dy, w: box.w, h: box.h };
    const lines = [];
    const span = (axis, at) => {
      const touch = [moved].concat(others.filter((o) => (axis === "x"
        ? [o.x, o.x + o.w / 2, o.x + o.w] : [o.y, o.y + o.h / 2, o.y + o.h]).some((v) => Math.abs(v - at) < 0.5)));
      const onFrame = (axis === "x" ? [frame.x, frame.x + frame.w / 2, frame.x + frame.w] : [frame.y, frame.y + frame.h / 2, frame.y + frame.h]).some((v) => Math.abs(v - at) < 0.5);
      const lo = Math.min(...touch.map((o) => (axis === "x" ? o.y : o.x)).concat(onFrame ? [axis === "x" ? frame.y : frame.x] : []));
      const hi = Math.max(...touch.map((o) => (axis === "x" ? o.y + o.h : o.x + o.w)).concat(onFrame ? [axis === "x" ? frame.y + frame.h : frame.x + frame.w] : []));
      return { axis, at, from: lo, to: hi };
    };
    if (s.x !== null) lines.push(span("x", s.x));
    if (s.y !== null) lines.push(span("y", s.y));
    return { dx: s.dx, dy: s.dy, lines };
  }

  return { MAX, MODULES, normalize, put, drop, focus, snap, snapAxis, snapBox, smart, run };
})();

if (typeof module !== "undefined") module.exports = SuiteGuides;
