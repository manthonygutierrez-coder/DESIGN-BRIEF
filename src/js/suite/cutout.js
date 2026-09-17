"use strict";
/* ── cutout masks ─────────────────────────────────────────
 * The maths behind the Cutout app: select part of an image by colour (magic
 * wand) or by drawing round it (lasso), then crop to what was selected.
 * Pure functions over RGBA arrays, so they run under node --test.
 *
 * A mask is a Uint8Array of w*h, 1 = selected.
 */

const SuiteCutout = (() => {
  // Colour distance is max channel difference: predictable for a player
  // dragging a tolerance slider, unlike a perceptual metric.
  function wand(rgba, w, h, sx, sy, tol = 32, mask = new Uint8Array(w * h)) {
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return mask;
    const i0 = (sy * w + sx) * 4;
    const r0 = rgba[i0], g0 = rgba[i0 + 1], b0 = rgba[i0 + 2], a0 = rgba[i0 + 3];
    const seen = new Uint8Array(w * h);
    const stack = [sy * w + sx];
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (Math.max(Math.abs(rgba[i] - r0), Math.abs(rgba[i + 1] - g0), Math.abs(rgba[i + 2] - b0), Math.abs(rgba[i + 3] - a0)) > tol) continue;
      mask[p] = 1;
      const x = p % w, y = (p - x) / w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }
    return mask;
  }

  // Even-odd point-in-polygon, per pixel centre.
  function lasso(points, w, h, mask = new Uint8Array(w * h)) {
    if (!points || points.length < 3) return mask;
    const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
        }
        if (inside) mask[y * w + x] = 1;
      }
    }
    return mask;
  }

  const invert = (mask) => mask.map((v) => (v ? 0 : 1));
  const count = (mask) => mask.reduce((n, v) => n + v, 0);

  function bounds(mask, w, h) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  // Selected pixels only, cropped to their bounds; everything else transparent.
  function extract(rgba, w, h, mask) {
    const b = bounds(mask, w, h);
    if (!b) return null;
    const out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const src = (y + b.y) * w + (x + b.x);
      if (!mask[src]) continue;
      out.set(rgba.subarray ? rgba.subarray(src * 4, src * 4 + 4) : rgba.slice(src * 4, src * 4 + 4), (y * b.w + x) * 4);
    }
    return { w: b.w, h: b.h, rgba: out, bounds: b };
  }

  // The most common opaque colour in the selection, quantised a little so
  // near-identical shades count together. That becomes the colour card.
  function dominant(rgba, mask) {
    const tally = new Map();
    for (let p = 0; p < mask.length; p++) {
      if (!mask[p] || rgba[p * 4 + 3] < 128) continue;
      const q = [0, 1, 2].map((k) => Math.min(255, Math.round(rgba[p * 4 + k] / 8) * 8));
      const key = "#" + q.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
      tally.set(key, (tally.get(key) || 0) + 1);
    }
    let best = null, n = 0;
    for (const [k, v] of tally) if (v > n) { best = k; n = v; }
    return best;
  }

  return { wand, lasso, invert, count, bounds, extract, dominant };
})();

if (typeof module !== "undefined") module.exports = SuiteCutout;
