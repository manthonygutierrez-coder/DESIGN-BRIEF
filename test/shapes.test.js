"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Sh = require("../src/js/suite/shapes.js");

function maskFrom(rows) {
  const h = rows.length, w = rows[0].length, m = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => { m[y * w + x] = c === "#" ? 1 : 0; }));
  return { m, w, h };
}

test("contours find outer loops and holes, and fill back exactly", () => {
  const { m, w, h } = maskFrom([
    "........",
    ".######.",
    ".#....#.",
    ".#.##.#.",
    ".#....#.",
    ".######.",
    "........",
  ]);
  const loops = Sh.contours(m, w, h);
  assert.equal(loops.length, 3, "outer ring, hole, and the island inside it");
  assert.deepEqual([...Sh.rasterize(loops, w, h)], [...m]);
});

test("pinched corners stay simple loops", () => {
  const { m, w, h } = maskFrom(["##..", "##..", "..##", "..##"]);
  const loops = Sh.contours(m, w, h);
  assert.equal(loops.length, 2);
  assert.deepEqual([...Sh.rasterize(loops, w, h)], [...m]);
});

test("a smooth shape survives simplify within IoU 0.97", () => {
  const w = 60, h = 60, m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - 30) ** 2 / 400 + (y - 30) ** 2 / 225 <= 1) m[y * w + x] = 1;
  const loops = Sh.contours(m, w, h).map((l) => Sh.simplify(l, 0.75));
  const back = Sh.rasterize(loops, w, h);
  assert.ok(Sh.iou(back, m) > 0.97, "iou " + Sh.iou(back, m));
  assert.ok(loops[0].length < 120, "fewer points: " + loops[0].length);
});

test("merge and cut", () => {
  const a = new Uint8Array([1, 1, 0, 0]), b = new Uint8Array([0, 1, 1, 0]);
  assert.deepEqual([...Sh.union(a, b)], [1, 1, 1, 0]);
  assert.deepEqual([...Sh.cut(a, b)], [1, 0, 0, 0]);
});

test("toPath writes box units", () => {
  const { m, w, h } = maskFrom(["##", "##"]);
  const p = Sh.toPath(Sh.contours(m, w, h), 64);
  assert.match(p.d, /^M[\d. L]+Z$/);
  assert.deepEqual(p.bounds, { x: 0, y: 0, w: 2, h: 2 });
});
