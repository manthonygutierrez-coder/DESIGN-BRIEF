"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/js/cascade.js");

function hsl(hex) {
  const [r, g, b] = C.rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

test("palettes: six cells each, weights that add up, and a highlight and ink", () => {
  for (const p of [C.BERRY, C.TIDE]) {
    assert.equal(p.cells.length, 6);
    assert.equal(p.weights.length, 6);
    assert.ok(Math.abs(p.weights.reduce((a, b) => a + b, 0) - 1) < 1e-9, p.name + " weights sum to 1");
    for (const c of p.cells.concat([p.hi, p.ink])) assert.match(c, /^#[0-9A-F]{6}$/);
    assert.ok(hsl(p.hi).l > 0.85, "the highlight is near white");
    assert.ok(hsl(p.ink).l < 0.1, "the ink is near black");
  }
});

test("palettes: bright colours a tenth desaturated, cool reds and berries, then blues and greens", () => {
  for (const p of [C.BERRY, C.TIDE]) for (const c of p.cells) assert.ok(hsl(c).s <= 0.905, c + " is desaturated a tenth or more");
  for (const c of C.BERRY.cells.slice(0, 5)) {
    const { h, s, l } = hsl(c);
    assert.ok(h >= 315 || h < 1, c + " is a cool red or berry (hue " + h.toFixed(0) + "), not an orange");
    assert.ok(s >= 0.85 && l >= 0.45, c + " is bright");
  }
  for (const c of C.TIDE.cells.slice(0, 5)) {
    const { h, s, l } = hsl(c);
    assert.ok(h >= 140 && h <= 225, c + " is a blue or green (hue " + h.toFixed(0) + ")");
    assert.ok(s >= 0.85 && l >= 0.4, c + " is bright");
  }
});

test("palettes: mostly candy apple red, then mostly cobalt, and hardly any of the near-white cells", () => {
  const top = (p) => p.cells[p.weights.indexOf(Math.max(...p.weights))];
  const red = hsl(top(C.BERRY)), blue = hsl(top(C.TIDE));
  assert.ok(red.h >= 354 && red.l < 0.55, "the boot cascade is mostly a deep, slightly cool red");
  assert.ok(blue.h >= 210 && blue.h <= 222 && blue.l < 0.45, "the choosing cascade is mostly cobalt");
  for (const p of [C.BERRY, C.TIDE]) {
    p.cells.forEach((c, i) => { if (hsl(c).l > 0.7) assert.ok(p.weights[i] <= 0.05, c + " leans white, so it is rare"); });
  }
});

test("logo: the strokes are the lattice, cell for cell, and the same after a quarter turn", () => {
  const L = C.LATTICE, n = L.length;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) assert.equal(L[r][c], L[n - 1 - c][r], "the lattice turns onto itself");
  // Every centre a stroke passes through, which at a stroke of one cell is every cell it covers.
  const on = new Set();
  const segs = [];
  for (const s of C.STRANDS) {
    const pts = s.closed ? s.pts.concat([s.pts[0]]) : s.pts;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      assert.ok(a[0] === b[0] || a[1] === b[1], "strokes run along the lattice");
      segs.push([a, b]);
      const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      for (let [x, y] = a; ; x += dx, y += dy) { on.add(x + "," + y); if (x === b[0] && y === b[1]) break; }
    }
  }
  const want = new Set();
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (L[r][c] === "#") want.add(c + "," + r);
  assert.deepEqual([...on].sort(), [...want].sort());
  const key = ([a, b]) => [a.join(","), b.join(",")].sort().join(" ");
  const all = new Set(segs.map(key));
  const turn = ([c, r]) => [r, n - 1 - c];
  for (const [a, b] of segs) assert.ok(all.has(key([turn(a), turn(b)])), "a quarter turn lands every stroke on a stroke");
  const kinds = {};
  for (const s of C.STRANDS) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  assert.deepEqual(kinds, { ring: 4, tail: 4, cross: 4 });
});

test("logo: thin vector strokes that keep inside the disc, each ready to draw itself in", () => {
  const svg = C.logoSVG();
  assert.equal((svg.match(/<path /g) || []).length, 12);
  assert.equal((svg.match(/pathLength="1"/g) || []).length, 12);
  assert.ok(!/filter|shadow|<image|<rect/.test(svg), "no shadows, no bitmaps: just strokes");
  assert.ok(C.LOGO.w < 1, "thinner than a cell");
  // The corners of every stroke, turned 45°, stay well inside the view (the disc).
  const w = C.LOGO.w, c = (C.LATTICE.length - 1) / 2;
  let far = 0;
  for (const s of C.STRANDS) for (const [x, y] of s.pts) for (const ox of [-1, 1]) for (const oy of [-1, 1]) {
    const u = x + ox * w, v = y + oy * w;                 // generous: a whole stroke out, not half
    far = Math.max(far, Math.hypot((u + v) / 2 - c, (u - v) / 2));
  }
  assert.ok(far < C.LOGO.view / 2 * 0.86, "a margin between the mark and the edge of its disc (" + far.toFixed(2) + ")");
  // The free ends run half a stroke past their centres: gaps and holes are all 2 − w.
  const tail = C.STRANDS.find((s) => s.kind === "tail");
  assert.equal(C.strandPath(tail, w / 2), "M" + tail.pts[0].join(" ") + "L" + [tail.pts[1][0], tail.pts[1][1] + w / 2].join(" "));
});

test("name: Press Start 2P at a multiple of 8 px, as wide as fits, and the cells it covers", () => {
  const n = C.nameSize(64, 16);
  assert.equal(n.px, 24, "24 px on the monitor");
  assert.equal(n.w, Math.ceil(C.NAME.length * 24 / 16));
  assert.equal(C.nameSize(160, 16, 2).px, 48, "twice that on a big screen");
  assert.equal(C.nameSize(24, 16).px, 16, "smaller on a narrow screen");
  assert.equal(C.nameSize(10, 16).px, 8, "never smaller than the font's own 8");
  for (const cols of [10, 24, 40, 64, 160]) assert.equal(C.nameSize(cols, 16).px % 8, 0);
});

function inside(r, cols, rows) { return r.x >= 0 && r.y >= 0 && r.x + r.w <= cols && r.y + r.h <= rows; }
function apart(a, b) { return a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y; }

test("layout: cells 20% bigger than the old 13 px, so the monitor is 64 by 48 of them", () => {
  assert.ok(Math.abs(C.CELL / 13 - 1.2) < 1e-9);
  assert.equal(Math.ceil(1024 / 16), 64); assert.equal(Math.ceil(768 / 16), 48);
});

test("layout: on the monitor, the disc, the name's band and the bar, top to bottom in the middle", () => {
  const L = C.layout(64, 48, "boot", 16);
  assert.equal(L.k, 1);
  assert.equal(L.logo.w, 27); assert.equal(L.logo.h, 27);
  for (const r of [L.logo, L.band, L.bar]) assert.ok(inside(r, 64, 48));
  assert.ok(L.logo.y + L.logo.h < L.band.y && L.band.y + L.band.h < L.bar.y, "top to bottom: disc, band, bar");
  assert.ok(Math.abs(L.logo.x + L.logo.w / 2 - 32) <= 1 && Math.abs(L.band.x + L.band.w / 2 - 32) <= 1, "centred");
  assert.deepEqual([L.word.x, L.word.y, L.word.w + 2, L.word.h + 2], [L.band.x + 1, L.band.y + 1, L.band.w, L.band.h], "the name in its band, a cell in all round");
  assert.equal(L.bar.w, L.band.w, "the bar as wide as the band");
  assert.equal(L.cards, null);
  const S = C.layout(64, 48, "saver", 16);
  assert.ok(S.logo && S.band && !S.bar && !S.cards, "the screen saver: disc and name alone");
});

test("layout: choosing puts a smaller disc up top and two cards under the name, side by side or stacked", () => {
  for (const [cols, rows] of [[64, 48], [120, 68], [160, 90], [48, 40], [32, 48], [64, 32], [64, 24], [30, 30]]) {
    const L = C.layout(cols, rows, "choose", 16);
    assert.equal(L.cards.length, 2);
    const parts = [L.logo, L.band, ...L.cards].filter(Boolean);
    for (const r of parts) assert.ok(inside(r, cols, rows), cols + "×" + rows + " keeps everything on screen");
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) assert.ok(apart(parts[i], parts[j]), cols + "×" + rows + " nothing overlaps");
    assert.equal(L.stack, cols < 40);
  }
  assert.equal(C.layout(64, 48, "choose", 16).logo.w, 19, "smaller than at boot, so the cards lead");
  assert.ok(C.layout(64, 34, "choose", 16).logo.w < 19, "a short screen shrinks the disc");
  assert.equal(C.layout(64, 24, "choose", 16).logo, null, "a very short one drops it, so the cards fit");
  assert.equal(C.layout(160, 90, "choose", 16).k, 2, "a big screen doubles everything");
  assert.equal(C.layout(64, 48, "choose", 16).word.px, 24, "the name is 24 px on the monitor");
});

test("columns: the same seed gives the same cascade, and every front is down by the end", () => {
  const a = C.columns(80, 7, "centre"), b = C.columns(80, 7, "centre");
  assert.deepEqual([...a.dl], [...b.dl]);
  for (const kind of ["rain", "centre", "sweep"]) {
    const col = C.columns(80, 3, kind);
    for (let c = 0; c < 80; c++) {
      assert.equal(C.frontRow(col, c, 0, 60), 0, "nothing has fallen at the start");
      assert.ok(C.frontRow(col, c, 1, 60) >= 60, kind + " column " + c + " is down by the end");
    }
  }
  const centre = C.columns(81, 11, "centre");
  const mid = centre.dl[40], edge = (centre.dl[0] + centre.dl[80]) / 2;
  assert.ok(mid < edge, "a centre fill starts in the middle");
});

test("pick: a palette's colours come up about as often as their weights say", () => {
  const n = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 20000; i++) n[C.pick(C.BERRY, C.hash(i % 97, (i / 97) | 0))]++;
  C.BERRY.weights.forEach((w, i) => assert.ok(Math.abs(n[i] / 20000 - w) < 0.03, "colour " + i));
});
