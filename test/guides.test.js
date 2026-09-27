"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../src/js/suite/guides.js");

test("guides: no grid until two guides cross two others", () => {
  assert.equal(G.focus({ v: [], h: [] }, 1200, 400), null);
  assert.equal(G.focus({ v: [100, 200], h: [50] }, 1200, 400), null);
  assert.equal(G.focus({ v: [100, 101], h: [50, 90] }, 1200, 400), null, "a sliver is not a cell");
  assert.ok(G.focus({ v: [100, 160], h: [50, 90] }, 1200, 400));
});

test("guides: a small cell repeats as it is, lined up with the guides, right across", () => {
  const f = G.focus({ v: [110, 150], h: [70, 100] }, 1200, 400);
  assert.equal(f.nx, 1); assert.equal(f.ny, 1);
  assert.equal(f.px, 40); assert.equal(f.py, 30);
  assert.ok(f.xs.includes(110) && f.xs.includes(150) && f.xs.includes(30) && f.xs.includes(1190), "through the guides, and outward both ways");
  assert.equal(f.xs[0], 30, "the first line inside the left edge");
  assert.ok(f.ys.includes(10) && f.ys.includes(400), "and down to the bottom edge");
  f.xs.forEach((x, i) => { if (i) assert.equal(Math.round((x - f.xs[i - 1]) * 100) / 100, 40); });
});

test("guides: a cell too wide to be a module is split evenly inside", () => {
  // 1200 × 400: a module is at most 400 / 6 ≈ 66.7 px.
  const f = G.focus({ v: [300, 600], h: [100, 300] }, 1200, 400);
  assert.equal(f.nx, 5); assert.equal(f.ny, 3);
  assert.equal(f.px, 60); assert.ok(Math.abs(f.py - 66.67) < 0.01);
  assert.ok(f.xs.includes(300) && f.xs.includes(360) && f.xs.includes(600), "the split lands on both guides");
  assert.deepEqual(f.major.xs, [0, 300, 600, 900, 1200], "the cell itself still repeats, as the heavier lines");
  // Carried past the canvas over the pasteboard when asked.
  const p = G.focus({ v: [300, 600], h: [100, 300] }, 1200, 400, { pad: 120 });
  assert.equal(p.xs[0], -120);
});

test("guides: the grid follows the guides you placed last", () => {
  let g = { v: [], h: [] };
  g = G.put(g, "v", 100); g = G.put(g, "v", 900); g = G.put(g, "h", 40); g = G.put(g, "h", 200);
  g = G.put(g, "v", 160);                         // a third: the newest two make the cell
  assert.deepEqual(G.focus(g, 1200, 400).cell, { x: 160, y: 40, w: 740, h: 160 });
  g = G.put(g, "v", 130, 0);                      // moving the first makes it the newest
  assert.deepEqual(g.v, [900, 160, 130]);
  assert.equal(G.focus(g, 1200, 400).cell.w, 30);
  g = G.drop(g, "v", 2);
  assert.deepEqual(g.v, [900, 160]);
});

test("guides: snapping pulls the nearest edge or middle onto a line", () => {
  assert.equal(G.snap(103, [0, 100, 200], 5), 100);
  assert.equal(G.snap(106, [0, 100, 200], 5), null);
  const s = G.snapBox({ x: 47, y: 10, w: 100, h: 20 }, [0, 100, 200], [0, 22], 4);
  assert.equal(s.dx, 3, "the middle, 97, is 3 off the line at 100");
  assert.equal(s.dy, 2, "and y: the middle, 20, is 2 off the line at 22");
  assert.equal(G.snapBox({ x: 0, y: 40, w: 10, h: 20 }, [], [0, 22], 4).dy, 0, "nothing near: no nudge");
  assert.deepEqual(G.normalize({ v: [1, "2", NaN, 1e9], h: null }), { v: [1, 2], h: [] });
});

test("guides: smart guides line a layer up with the canvas and the others", () => {
  const frame = { x: 0, y: 0, w: 1200, h: 400 };
  const s = G.smart({ x: 548, y: 150, w: 100, h: 40 }, [], frame, 4);
  assert.equal(s.dx, 2, "centred on the canvas");
  assert.equal(s.lines[0].axis, "x"); assert.equal(s.lines[0].at, 600);
  const other = { x: 800, y: 60, w: 50, h: 50 };
  const t = G.smart({ x: 300, y: 62, w: 80, h: 30 }, [other], frame, 4);
  assert.equal(t.dy, -2, "top edges meet");
  const line = t.lines.find((l) => l.axis === "y");
  assert.equal(line.from, 300); assert.equal(line.to, 850, "the line runs from one to the other");
});
