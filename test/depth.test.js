"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/js/content/portraits.js");

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

test("a prop stands where its kind usually stands, unless it says otherwise", () => {
  assert.ok(P.zOf({ p: "poster" }) < 0.2, "posters are on the wall");
  assert.ok(P.zOf({ p: "plantbig" }) > 0.6, "the big plant is up by the lens");
  assert.equal(P.zOf({ p: "poster", z: 0.9 }), 0.9);
  assert.equal(P.zOf({ p: "poster", z: 5 }), 1, "clamped");
  assert.ok(P.zOf({ p: "nothing-like-it" }) < 0.5, "an unknown thing hangs back");
});

test("distance grows a prop from its base, where it was put", () => {
  const it = { p: "poster", x: 0.4, y: 0.3, w: 0.2, h: 0.4 };
  const mid = P.project(it, 0.18);                    // the depth scale is measured from
  assert.ok(Math.abs(mid.w - it.w) < 1e-9 && Math.abs(mid.x - it.x) < 1e-9);

  const near = P.project(it, 0.9), far = P.project(it, 0.02);
  assert.ok(near.w > it.w && far.w < it.w, "nearer is bigger, further is smaller");
  const base = (r) => r.y + r.h, centre = (r) => r.x + r.w / 2;
  for (const r of [mid, near, far]) {
    assert.ok(Math.abs(base(r) - (it.y + it.h)) < 1e-9, "it keeps standing where it stood");
    assert.ok(Math.abs(centre(r) - (it.x + it.w / 2)) < 1e-9, "and does not slide sideways");
  }
});

test("cool colours recede and warm ones come forward", () => {
  const th = { bg: "#808080", panel: "#808080", ink: "#808080", line: "#808080", brand: "#808080", dark: false };
  const [fr, fg, fb] = rgb(P.gradeTheme(th, 0).brand);
  assert.ok(fb > fr, "the back wall goes cool");
  assert.ok(fg < 0x80 + 1, "and no brighter");
  const [nr, , nb] = rgb(P.gradeTheme(th, 1).brand);
  assert.ok(nr > nb, "what is up against the lens goes warm");
  const mid = P.gradeTheme(th, 0.48).brand;
  assert.equal(mid.toLowerCase(), "#808080", "the middle of the room is left alone");
});

test("the two shots differ in what the room does behind them", () => {
  const { receded, against } = P.FRAMINGS;
  assert.ok(receded && against);
  assert.deepEqual(against.shot, P.SHOTS.call, "the close shot is the one calls always used");
  assert.ok(receded.room.hz < against.room.hz, "standing back shows floor");
  assert.ok(receded.shot.dh < against.shot.dh, "and makes them smaller in frame");
  assert.ok(receded.room.subject < against.room.subject, "so less has to be in front of them");
  assert.equal(P.framingOf("nonsense"), against, "anything unknown calls the way it always did");
});
