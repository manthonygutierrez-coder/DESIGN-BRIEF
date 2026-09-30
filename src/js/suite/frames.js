"use strict";
/* ── frames: playing, timing, sheets, tiles ───────────────
 * The maths behind an animated sprite that is not the document itself (doc.js
 * keeps the frames and tags): in what order a run of frames plays, which
 * frames to show faint as onion skin, how to lay out lengths across a run, how
 * a sheet of frames is arranged and described, and whether a tile meets its
 * own edge cleanly.
 *
 *   order(from, to, dir)            frame numbers for one play of a run
 *   sequence(frames, tag)           [{ i, ms }]: one play of a tag, or of every frame
 *   onion(cur, n, before, after)    [{ i, side, step, alpha }]
 *   spread(count, ms0, ms1, ease)   lengths, eased from the first frame to the last
 *   sheetLayout(n, w, h, opts)      { cols, rows, W, H, cells: [{ x, y }] }
 *   selection(doc, tagIndex)        { from, to, frames } to export
 *   rgba(px, w, h)                  a frame's pixels as bytes
 *   sheetRGBA(list, layout, w, h)   every frame on one sheet
 *   atlas(o)                        the sheet, described for a game to read
 *   seams(px, w, h)                 where a tile's edges meet hard
 *
 * Pure: no DOM.
 */

const SuiteFrames = (() => {
  const DIRS = ["forward", "reverse", "pingpong"];
  const EASES = ["even", "linear", "in", "out"];

  // The frames one play of a run shows, in order. There-and-back does not
  // show either end twice, so it loops without a stutter.
  function order(from, to, dir) {
    const up = [], n = Math.max(0, to - from + 1);
    for (let i = 0; i < n; i++) up.push(from + i);
    if (dir === "reverse") return up.reverse();
    if (dir === "pingpong" && n > 2) return up.concat(up.slice(1, -1).reverse());
    return up;
  }
  function sequence(frames, tag) {
    const from = tag ? Math.max(0, tag.from) : 0, to = tag ? Math.min(frames.length - 1, tag.to) : frames.length - 1;
    return order(from, to, tag ? tag.dir : "forward").map((i) => ({ i, ms: frames[i].ms }));
  }

  // The frames either side of this one, nearest first, that show through: no
  // wrap, so the first frame has nothing before it. Further ones are fainter.
  function onion(cur, n, before, after) {
    const out = [];
    for (let s = 1; s <= before && cur - s >= 0; s++) out.push({ i: cur - s, side: "before", step: s, alpha: Math.round(0.55 / s * 100) / 100 });
    for (let s = 1; s <= after && cur + s < n; s++) out.push({ i: cur + s, side: "after", step: s, alpha: Math.round(0.55 / s * 100) / 100 });
    return out;
  }

  // `count` lengths going from ms0 to ms1: all alike, straight along, slow to
  // speed up (in), or quick to slow down (out).
  function spread(count, ms0, ms1, ease) {
    const f = ease === "in" ? (t) => t * t : ease === "out" ? (t) => 1 - (1 - t) * (1 - t) : (t) => t;
    return Array.from({ length: count }, (_, k) => {
      if (ease === "even" || count === 1) return Math.round(ms0);
      return Math.round(ms0 + (ms1 - ms0) * f(k / (count - 1)));
    });
  }

  /* ── sheets ────────────────────────────────────────────── */
  // How many frames go along a row: all of them, one, or a square-ish block.
  function sheetLayout(n, w, h, o = {}) {
    const pad = Math.max(0, Math.min(16, Math.round(o.pad) || 0));
    const cols = o.cols ? Math.max(1, Math.min(n, Math.round(o.cols))) : o.pack === "column" ? 1 : o.pack === "square" ? Math.ceil(Math.sqrt(n)) : n;
    const rows = Math.ceil(n / cols);
    const cells = Array.from({ length: n }, (_, i) => ({ x: (i % cols) * (w + pad), y: Math.floor(i / cols) * (h + pad) }));
    return { cols, rows, pad, W: cols * w + (cols - 1) * pad, H: rows * h + (rows - 1) * pad, cells };
  }
  // Which frames leave, for the whole animation or for one tag.
  function selection(doc, tagIndex) {
    const all = doc.frames || [{ px: doc.bitmap, ms: 156 }];
    const tag = tagIndex != null && doc.tags && doc.tags[tagIndex];
    const from = tag ? tag.from : 0, to = tag ? tag.to : all.length - 1;
    return { from, to, tag: tag || null, frames: all.slice(from, to + 1) };
  }
  const hexRGB = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function rgba(px, w, h) {
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const c = px[i];
      if (!c) continue;
      const [r, g, b] = hexRGB(c);
      out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
    }
    return out;
  }
  // Every frame's bytes set down on one sheet at its cell; the gaps stay empty.
  function sheetRGBA(list, layout, w, h) {
    const out = new Uint8Array(layout.W * layout.H * 4);
    list.forEach((f, i) => {
      const at = layout.cells[i];
      for (let y = 0; y < h; y++) out.set(f.subarray(y * w * 4, (y + 1) * w * 4), ((at.y + y) * layout.W + at.x) * 4);
    });
    return { rgba: out, w: layout.W, h: layout.H };
  }
  // The sheet described for whatever reads it: where each frame is, how long
  // it shows, and the runs (tags) by their frames' numbers on the sheet.
  function atlas(o) {
    const { name, image, layout, w, h, k = 1, frames, tags = [] } = o;
    return {
      meta: { app: "Pixel Crossing", version: 1, image, scale: k, size: { w: layout.W * k, h: layout.H * k }, frameSize: { w: w * k, h: h * k }, padding: layout.pad * k },
      frames: frames.map((f, i) => ({ filename: name + " " + i, frame: { x: layout.cells[i].x * k, y: layout.cells[i].y * k, w: w * k, h: h * k }, duration: f.ms })),
      tags: tags.map((t) => ({ name: t.name, from: t.from, to: t.to, direction: t.dir })),
    };
  }

  /* ── tiles ─────────────────────────────────────────────── */
  const dist = (a, b) => {
    if (!a && !b) return 0;
    if (!a || !b) return 1000;                                   // filled against empty is as hard as it gets
    const [r1, g1, b1] = hexRGB(a), [r2, g2, b2] = hexRGB(b);
    return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
  };
  // Where a tile meets itself with a harder change than it has inside: for each
  // row the left edge against the right, for each column the top against the
  // bottom, judged against the hardest step within that same row or column.
  // A busy tile, which changes everywhere, has no seam to see.
  function seams(px, w, h) {
    const across = [], down = [];
    const at = (x, y) => px[y * w + x] || "";
    for (let y = 0; y < h; y++) {
      let inner = 0;
      for (let x = 1; x < w; x++) inner = Math.max(inner, dist(at(x - 1, y), at(x, y)));
      if (dist(at(w - 1, y), at(0, y)) > inner) across.push(y);
    }
    for (let x = 0; x < w; x++) {
      let inner = 0;
      for (let y = 1; y < h; y++) inner = Math.max(inner, dist(at(x, y - 1), at(x, y)));
      if (dist(at(x, h - 1), at(x, 0)) > inner) down.push(x);
    }
    return { across, down };
  }

  return { DIRS, EASES, order, sequence, onion, spread, sheetLayout, selection, rgba, sheetRGBA, atlas, seams };
})();

if (typeof module !== "undefined") module.exports = SuiteFrames;
