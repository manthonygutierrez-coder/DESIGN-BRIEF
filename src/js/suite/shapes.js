"use strict";
/* ── shape building ───────────────────────────────────────
 * The maths behind the Shape builder: turn a pixel mask back into vector
 * paths. The suite rasterises the shapes a drag crossed into a mask, merges
 * or cuts, and asks this for the outline.
 *
 *   contours(mask, w, h)  every boundary loop, outer and holes, along pixel
 *                         edges — so filling them even-odd gives the mask back
 *   simplify(loop, eps)   fewer points, same shape (Ramer–Douglas–Peucker)
 *   toPath(loops, box)    SVG path data in a layer's box units
 *   rasterize(loops, w, h) the even-odd fill, for tests and round trips
 *
 * Pure; no canvas.
 */

const SuiteShapes = (() => {
  const union = (a, b) => a.map((v, i) => (v || b[i] ? 1 : 0));
  const cut = (a, b) => a.map((v, i) => (v && !b[i] ? 1 : 0));

  /* Boundary edges run clockwise around filled pixels (screen coords), so a
   * hole's loop comes out the other way round. Chaining them gives closed
   * loops; at a pinch (two pixels touching only at a corner) the walk turns
   * right, which keeps each loop simple. */
  function contours(mask, w, h) {
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
    const out = new Map();               // "x,y" -> [[x2,y2], ...]
    const add = (x1, y1, x2, y2) => {
      const k = x1 + "," + y1;
      if (!out.has(k)) out.set(k, []);
      out.get(k).push([x2, y2]);
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) add(x, y, x + 1, y);
      if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!on(x - 1, y)) add(x, y + 1, x, y);
    }
    const loops = [];
    const take = (k, from) => {
      const list = out.get(k);
      if (!list || !list.length) return null;
      let i = 0;
      if (list.length > 1 && from) {
        // turn right: pick the edge whose direction is clockwise of the incoming one
        const [px, py] = from;
        const [cx, cy] = k.split(",").map(Number);
        const inDir = [cx - px, cy - py];
        const right = [-inDir[1], inDir[0]];
        const j = list.findIndex(([nx, ny]) => nx - cx === right[0] && ny - cy === right[1]);
        if (j >= 0) i = j;
      }
      const [nx, ny] = list.splice(i, 1)[0];
      if (!list.length) out.delete(k);
      return [nx, ny];
    };
    while (out.size) {
      const startKey = out.keys().next().value;
      const start = startKey.split(",").map(Number);
      const loop = [start];
      let prev = null, cur = start;
      for (;;) {
        const next = take(cur[0] + "," + cur[1], prev);
        if (!next) break;
        if (next[0] === start[0] && next[1] === start[1]) break;
        loop.push(next);
        prev = cur; cur = next;
      }
      loops.push(collinear(loop.map(([x, y]) => ({ x, y }))));
    }
    return loops.filter((l) => l.length >= 3);
  }

  // Drop points that sit on a straight run.
  function collinear(loop) {
    const n = loop.length;
    return loop.filter((p, i) => {
      const a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n];
      return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) !== 0;
    });
  }

  function simplify(loop, eps = 0.75) {
    if (loop.length < 5 || eps <= 0) return loop.slice();
    // Split the closed loop at its two farthest-apart points, simplify both halves.
    let far = 0, fd = -1;
    for (let i = 1; i < loop.length; i++) {
      const d = (loop[i].x - loop[0].x) ** 2 + (loop[i].y - loop[0].y) ** 2;
      if (d > fd) { fd = d; far = i; }
    }
    const rdp = (pts) => {
      if (pts.length < 3) return pts;
      const a = pts[0], b = pts[pts.length - 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      let idx = 0, dmax = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const d = Math.abs((b.x - a.x) * (a.y - pts[i].y) - (a.x - pts[i].x) * (b.y - a.y)) / len;
        if (d > dmax) { dmax = d; idx = i; }
      }
      if (dmax <= eps) return [a, b];
      const l = rdp(pts.slice(0, idx + 1)), r = rdp(pts.slice(idx));
      return l.slice(0, -1).concat(r);
    };
    const first = rdp(loop.slice(0, far + 1));
    const second = rdp(loop.slice(far).concat([loop[0]]));
    return first.slice(0, -1).concat(second.slice(0, -1));
  }

  function bounds(loops) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of loops) for (const p of l) {
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    return { x: x0, y: y0, w: Math.max(1e-6, x1 - x0), h: Math.max(1e-6, y1 - y0) };
  }

  // Path data in a layer's own box units, the same convention the pen uses.
  function toPath(loops, box = 64) {
    const b = bounds(loops);
    const f = (v) => Math.round(v * 100) / 100;
    const d = loops.map((l) => l.map((p, i) => (i ? "L" : "M") + f((p.x - b.x) / b.w * box) + " " + f((p.y - b.y) / b.h * box)).join("") + "Z").join("");
    return { d, bounds: b, box };
  }

  // Even-odd scanline fill at pixel centres.
  function rasterize(loops, w, h) {
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      const cy = y + 0.5, xs = [];
      for (const l of loops) {
        for (let i = 0; i < l.length; i++) {
          const a = l[i], b = l[(i + 1) % l.length];
          if ((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)) xs.push(a.x + (cy - a.y) * (b.x - a.x) / (b.y - a.y));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x < Math.min(w, Math.ceil(xs[i + 1] - 0.5)); x++) mask[y * w + x] ^= 1;
      }
    }
    return mask;
  }

  const count = (m) => m.reduce((n, v) => n + (v ? 1 : 0), 0);
  function iou(a, b) {
    let i = 0, u = 0;
    for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; }
    return u ? i / u : 1;
  }

  return { union, cut, contours, simplify, toPath, rasterize, bounds, count, iou };
})();

if (typeof module !== "undefined") module.exports = SuiteShapes;
