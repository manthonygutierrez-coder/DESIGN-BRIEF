"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/js/suite/pixeled.js");
const V = require("../src/js/suite/vector.js");

const key = (pts) => new Set(pts.map(([x, y]) => x + "," + y));

test("pixel: lines, boxes and ellipses land on whole pixels with no gaps", () => {
  const line = P.linePts(0, 0, 7, 3);
  assert.equal(line.length, 8, "one pixel a column on a shallow line");
  assert.deepEqual(line[0], [0, 0]); assert.deepEqual(line[7], [7, 3]);
  assert.equal(P.rectPts(0, 0, 3, 2, false).length, 10, "an outline is its rim only");
  assert.equal(P.rectPts(3, 2, 0, 0, true).length, 12, "filled, from any corner");
  const ring = key(P.ellipsePts(0, 0, 9, 9, false)), disc = key(P.ellipsePts(0, 0, 9, 9, true));
  assert.ok(!ring.has("5,5") && disc.has("5,5"), "an outline is hollow");
  for (const p of ring) assert.ok(disc.has(p), "the rim is part of the disc");
  assert.ok(ring.has("0,5") && ring.has("9,4") && ring.has("4,0"), "touching all four sides");
});

test("pixel: a curve laid down as pixels is one connected pixel line, with no doubled corners", () => {
  const path = [{ closed: false, nodes: [V.node(1.5, 10.5), Object.assign(V.node(10.5, 1.5), { ix: 1.5, iy: 1.5, ox: 10.5, oy: 1.5 })] }];
  path[0].nodes[0].ox = 1.5; path[0].nodes[0].oy = 1.5;
  const pts = P.curvePts(path);
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i][0] - pts[i - 1][0]), dy = Math.abs(pts[i][1] - pts[i - 1][1]);
    assert.ok(dx <= 1 && dy <= 1 && dx + dy > 0, "neighbours touch at " + i);
  }
  for (let i = 1; i + 1 < pts.length; i++) {
    const a = pts[i - 1], b = pts[i + 1];
    assert.ok(!(Math.abs(a[0] - b[0]) === 1 && Math.abs(a[1] - b[1]) === 1 && (pts[i][0] === a[0] || pts[i][1] === a[1])), "no L-shaped corner at " + i);
  }
  assert.deepEqual(pts[0], [1, 10]); assert.deepEqual(pts[pts.length - 1], [10, 1]);
});
