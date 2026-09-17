"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const X = require("../src/js/suite/cutout.js");

// 10x10: white ground, a red 4x4 square at (3,3).
function image() {
  const w = 10, h = 10, px = new Uint8ClampedArray(w * h * 4).fill(255);
  for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) { const i = (y * w + x) * 4; px[i + 1] = 0; px[i + 2] = 0; }
  return { w, h, px };
}

test("wand selects the connected colour region only", () => {
  const { w, h, px } = image();
  const m = X.wand(px, w, h, 4, 4, 10);
  assert.equal(X.count(m), 16);
  assert.deepEqual(X.bounds(m, w, h), { x: 3, y: 3, w: 4, h: 4 });
  assert.equal(X.dominant(px, m), "#FF0000");
  assert.equal(X.count(X.invert(m)), 84);
});

test("lasso selects pixel centres inside the polygon", () => {
  const m = X.lasso([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }], 10, 10);
  assert.equal(X.count(m), 25);
});

test("extract crops and clears unselected pixels", () => {
  const { w, h, px } = image();
  const m = X.lasso([{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 8, y: 8 }, { x: 2, y: 8 }], w, h);
  const out = X.extract(px, w, h, X.wand(px, w, h, 4, 4, 10, new Uint8Array(w * h)));
  assert.equal(out.w, 4);
  assert.equal(out.rgba[3], 255);
  assert.equal(X.count(m), 36);
  assert.equal(X.extract(px, w, h, new Uint8Array(w * h)), null);
});
