"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

// The room is ES modules (see src/room/package.json); its arithmetic is kept in
// fit.js, free of three.js and the DOM, so it can be checked here.
const fit = () => import("../src/room/fit.js");

test("the room's pixels are whole and the same size everywhere", async () => {
  const { pixelCanvas } = await fit();
  for (const [w, h, px] of [[1440, 900, 2], [1281, 799, 2], [1024, 768, 3], [375, 812, 2], [7, 5, 2]]) {
    const c = pixelCanvas(w, h, px);
    assert.equal(c.w, c.cols * Math.round(px), "width is a whole number of room pixels");
    assert.equal(c.h, c.rows * Math.round(px));
    assert.ok(c.w <= w && c.h <= h && w - c.w < px && h - c.h < px, "fills the window to within one room pixel");
    assert.ok(c.left >= 0 && c.top >= 0 && c.left <= 1 && c.top <= 1, "centred");
  }
});

test("at the end of the zoom the screen covers the view, and only just", async () => {
  const { fitDistance } = await fit();
  const tan = Math.tan((38 * Math.PI) / 360);
  for (const aspect of [16 / 10, 4 / 3, 21 / 9, 3 / 4]) {
    const d = fitDistance(0.4, 0.3, 38, aspect, "cover");
    const viewH = 2 * d * tan, viewW = viewH * aspect;
    assert.ok(viewW <= 0.4 + 1e-9 && viewH <= 0.3 + 1e-9, "no bezel in view at " + aspect.toFixed(2));
    assert.ok(Math.abs(viewW - 0.4) < 1e-9 || Math.abs(viewH - 0.3) < 1e-9, "the glass touches two edges at " + aspect.toFixed(2));
    const whole = fitDistance(0.4, 0.3, 38, aspect, "contain");
    assert.ok(whole >= d, "seeing all of it takes at least as far back");
  }
});

test("the game lays out in the glass's own shape", async () => {
  const { screenSize } = await fit();
  assert.deepEqual(screenSize(0.4, 0.3), { w: 1024, h: 768 });
  assert.deepEqual(screenSize(0.94, 0.72), { w: 1024, h: 784 });
});

test("the window follows the clock: night, dawn, day, dusk, and the city's lights", async () => {
  const { skyAt } = await fit();
  assert.equal(skyAt(2).phase, "night");
  assert.equal(skyAt(6).phase, "dawn");
  assert.equal(skyAt(12).phase, "day");
  assert.equal(skyAt(19).phase, "dusk");
  assert.equal(skyAt(23.5).phase, "night");
  assert.equal(skyAt(12).day, 1);
  assert.equal(skyAt(1).day, 0);
  assert.ok(skyAt(12).lights === false && skyAt(22).lights === true);
  let last = -1;
  for (let h = 4; h <= 12; h += 0.25) { const d = skyAt(h).day; assert.ok(d >= last, "the morning only gets lighter"); last = d; }
  assert.deepEqual(skyAt(-2), skyAt(22), "hours wrap");
});

test("weather: snow only in the cold months, rain sometimes, mostly clear", async () => {
  const { weatherFor, seeded } = await fit();
  const count = (month) => {
    const r = seeded(month + 1), n = { clear: 0, rain: 0, snow: 0 };
    for (let i = 0; i < 2000; i++) n[weatherFor(month, r())]++;
    return n;
  };
  const july = count(6), january = count(0);
  assert.equal(july.snow, 0);
  assert.ok(january.snow > 400);
  assert.ok(july.clear > july.rain && july.rain > 300);
});

test("a press that barely moves is a click; a drag or a long hold is not", async () => {
  const { isClick } = await fit();
  assert.ok(isClick(0, 0, 120));
  assert.ok(isClick(4, -3, 300));
  assert.ok(!isClick(12, 0, 100));
  assert.ok(!isClick(0, 0, 900));
});

test("seeded randomness repeats, and stays between 0 and 1", async () => {
  const { seeded } = await fit();
  const a = seeded(42), b = seeded(42);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});
