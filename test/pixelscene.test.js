"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
global.ImagePlan = require("../src/js/content/imageplan.js");
global.PixelScene = require("../src/js/content/pixelscene.js");
const Things = require("../src/js/content/pixelthings.js");
const S = global.PixelScene;

const TIMES = ["day", "dawn", "dusk", "night", "indoor"];

test("every setting paints every pixel, at every time of day", () => {
  for (const name of Object.keys(S.SETTINGS)) {
    for (const time of TIMES) {
      const b = S.buffer(100, 75);
      b.d.fill(NaN);
      const T = S.TIME[time], rgb = S.kit.rgb;
      const plan = { time, looks: [], seed: 7, framing: "wide" };
      S.SETTINGS[name](b, { w: 100, h: 75, R: S.rng(7), T, L: { light: rgb(T.light), shadow: rgb(T.shadow), haze: rgb(T.haze) }, plan, top: false });
      assert.ok(!b.d.some(Number.isNaN), name + " at " + time + " leaves no hole");
    }
  }
});

test("every thing draws itself, in every framing, and only where it stands", () => {
  for (const id of Object.keys(ImagePlan.THINGS)) {
    assert.ok(Things.DRAW[id], id + " has a drawing");
    for (const framing of ["hero", "close", "group", "wide", "top"]) {
      const plan = { query: id, index: 0, seed: 11, subject: id, companion: null, count: framing === "group" ? 3 : 1,
                     colour: null, setting: "studio", time: "indoor", looks: [], framing, flip: false };
      const b = S.paint(plan, 100, 75, Things);
      const marked = b.m.reduce((n, v) => n + (v ? 1 : 0), 0);
      assert.ok(marked > 12, id + " " + framing + " puts pixels in the picture (" + marked + ")");
      assert.ok(b.d.every(Number.isFinite), id + " " + framing + " paints real colours");
    }
  }
});

test("the same result is the same picture, and neighbours differ", () => {
  const one = (i) => S.paint(ImagePlan.plan("mallard duck", i), 100, 75, Things).d;
  assert.deepEqual(one(3), one(3));
  assert.notDeepEqual(one(3), one(4));
});

test("a companion is printed on the thing, in one ink", () => {
  const plan = ImagePlan.plan("bigfoot mug", 0);
  Object.assign(plan, { framing: "hero", setting: "studio", count: 1 });
  const bare = Object.assign({}, plan, { companion: null });
  const a = S.paint(plan, 100, 75, Things).d, b = S.paint(bare, 100, 75, Things).d;
  assert.notDeepEqual(a, b, "the mug with a bigfoot on it is not a plain mug");
});
