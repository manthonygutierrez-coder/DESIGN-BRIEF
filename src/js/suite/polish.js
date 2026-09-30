"use strict";
/* ── Polish ───────────────────────────────────────────────
 * What a pixel artist tidies before calling a sprite done, found in its
 * pixels. Pixel mode rings each one on the work while Polish is on.
 *
 *   stray   a lone pixel, with nothing of its own colour touching it, even
 *           corner to corner; or a pinhole, one empty pixel in a solid patch.
 *           A glint, one light pixel set in among darker ones, is meant.
 *   double  a one-pixel line doubled up at a step: an L of three where the
 *           corner pixel isn't needed. A square corner, both arms two or more
 *           long, was meant, and is left alone.
 *   step    a run out of line with the runs around it along a one-pixel
 *           line: the 1 in 3, 1, 3, or the one 2 in a line of 1s. Lines that
 *           keep a steady rhythm (2, 1, 2, 1) are fine.
 *
 *   find(bitmap, w, h) → { marks: [{ x, y, kind }], counts: { stray, double, step }, total }
 *
 * Pure: no DOM. A bitmap is an array of "#RRGGBB" or "" (empty), row by row.
 */

const SuitePolish = (() => {
  const KINDS = [
    { id: "stray", one: "lone pixel", many: "lone pixels", colour: "#FF4FD8" },
    { id: "double", one: "doubled corner", many: "doubled corners", colour: "#FFB020" },
    { id: "step", one: "uneven step", many: "uneven steps", colour: "#3FD0FF" },
  ];
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  // How light a colour is, 0 to 255.
  const luma = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };

  function find(bitmap, w, h) {
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? bitmap[y * w + x] || "" : "");
    // How many of each pixel's eight neighbours share its colour.
    const kin = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c) kin[y * w + x] = N8.reduce((n, [dx, dy]) => n + (at(x + dx, y + dy) === c ? 1 : 0), 0);
    }
    const marks = [], seen = new Set();
    const mark = (x, y, kind) => { const k = kind + x + "," + y; if (!seen.has(k)) { seen.add(k); marks.push({ x, y, kind }); } };

    /* lone pixels, and pinholes: a hole with its colour all round it and
       more beyond, so the middle of a tiny ring isn't one. A lone pixel in
       among others and lighter than all of them is a glint, and meant. */
    const glint = (x, y, c) => {
      const round = N8.map(([dx, dy]) => at(x + dx, y + dy)).filter(Boolean);
      return round.length >= 3 && round.every((r) => luma(r) + 16 < luma(c));
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (c && !kin[y * w + x] && !glint(x, y, c)) mark(x, y, "stray");
      if (!c) {
        const r = at(x - 1, y);
        if (!r || !N8.every(([dx, dy]) => at(x + dx, y + dy) === r)) continue;
        let beyond = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2 && at(x + dx, y + dy) === r) beyond++;
        if (beyond >= 4) mark(x, y, "stray");
      }
    }

    /* doubled corners: this pixel is the corner of an L of three */
    const arm = (x, y, dx, dy, c) => { let n = 0; while (at(x + dx * (n + 1), y + dy * (n + 1)) === c) n++; return n; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (!c) continue;
      for (const ax of [-1, 1]) for (const cy of [-1, 1]) {
        if (at(x + ax, y) !== c || at(x, y + cy) !== c) continue;
        if (at(x + ax, y + cy) === c) continue;                    // a 2×2 block: something solid, not a line
        if (at(x - ax, y) === c || at(x, y - cy) === c) continue;  // held from the other side too: thicker, or a T
        if (arm(x, y, ax, 0, c) >= 2 && arm(x, y, 0, cy, c) >= 2) continue;   // a square corner, meant
        mark(x, y, "double");
      }
    }

    /* uneven steps, along rows and then down columns */
    for (const down of [false, true]) {
      const U = down ? h : w, V = down ? w : h;                 // along a run, across runs
      const px = (u, v) => (down ? at(v, u) : at(u, v));
      const thin = (u, v) => (down ? kin[u * w + v] : kin[v * w + u]) <= 2;
      const runs = [], startAt = new Map();
      for (let v = 0; v < V; v++) {
        for (let u = 0; u < U;) {
          const c = px(u, v);
          if (!c || !thin(u, v)) { u++; continue; }
          let e = u;
          while (e + 1 < U && px(e + 1, v) === c && thin(e + 1, v)) e++;
          const r = { v, u0: u, u1: e, c, len: e - u + 1 };
          runs.push(r); startAt.set(v * U + u, r);
          u = e + 1;
        }
      }
      // The next run along a line starts just past this one's end, a row up
      // or down, in the same colour. Two ways on is a fork: the line ends.
      const next = new Map(), into = new Map();
      for (const r of runs) {
        if (r.u1 + 1 >= U) continue;
        const ways = [-1, 1].map((s) => ({ s, run: r.v + s >= 0 && r.v + s < V ? startAt.get((r.v + s) * U + r.u1 + 1) : null }))
          .filter((o) => o.run && o.run.c === r.c);
        if (ways.length === 1) { next.set(r, ways[0]); into.set(ways[0].run, (into.get(ways[0].run) || 0) + 1); }
      }
      const judge = (chain) => {
        const raw = chain.map((r) => r.len), n = raw.length;
        // A line's first and last runs may be cut short where it starts and
        // stops: shorter there is fine, so they count as full ones.
        const L = raw.slice();
        if (n > 1) { L[0] = Math.max(L[0], L[1]); L[n - 1] = Math.max(L[n - 1], L[n - 2]); }
        const inner = raw.slice(1, -1);
        for (let i = 1; i < n - 1; i++) {
          const d1 = L[i] - L[i - 1], d2 = L[i] - L[i + 1];
          if (!((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0))) continue;   // on its way up or down: a curve
          const jump = Math.abs(d1) >= 2 || Math.abs(d2) >= 2;            // 3, 1, 3
          // One run unlike all the others between the ends: 1, 1, 2, 1, 1. It
          // takes a few to tell that from a steady 2, 1, 2, 1.
          const rest = inner.filter((_, j) => j !== i - 1);
          const odd = inner.length >= 4 && rest.every((l) => l === rest[0]);
          if (!jump && !odd) continue;
          const r = chain[i];
          for (let u = r.u0; u <= r.u1; u++) mark(down ? r.v : u, down ? u : r.v, "step");
        }
      };
      // Follow each line from its first run. A line that turns (stepping down,
      // then up) is two lines, sharing the run at the turn.
      for (const r of runs) {
        if (into.get(r) === 1) continue;
        let chain = [r], dir = 0, cur = r;
        for (let guard = 0; next.has(cur) && guard < runs.length; guard++) {
          const { s, run } = next.get(cur);
          if (into.get(run) !== 1) break;
          if (dir && s !== dir) { judge(chain); chain = [cur]; }
          dir = s;
          chain.push(run);
          cur = run;
        }
        judge(chain);
      }
    }

    const counts = { stray: 0, double: 0, step: 0 };
    for (const m of marks) counts[m.kind]++;
    return { marks, counts, total: marks.length };
  }

  // "3 lone pixels", "1 doubled corner".
  const say = (kind, n) => { const k = KINDS.find((x) => x.id === kind); return n + " " + (n === 1 ? k.one : k.many); };

  return { KINDS, find, say, luma };
})();

if (typeof module !== "undefined") module.exports = SuitePolish;
