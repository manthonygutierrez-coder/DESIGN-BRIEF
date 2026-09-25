"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/js/tips.js");

test("tips: a short pause for the first, none while one is handing over", () => {
  assert.equal(T.delayFor(10000, -Infinity), T.DELAY, "nothing shown lately: wait");
  assert.ok(T.DELAY >= 250 && T.DELAY <= 450, "quicker than the browser's second, but not instant");
  assert.equal(T.delayFor(10000, 10000 - 120), 0, "one just went: the next comes up at once");
  assert.equal(T.delayFor(10000, 10000 - T.HANDOFF - 1), T.DELAY, "a while after: wait again");
});

test("tips: a trailing (X) becomes the shortcut, anything else stays text", () => {
  assert.deepEqual(T.split("Rectangle (R)"), { text: "Rectangle", key: "R" });
  assert.deepEqual(T.split("Undo (Ctrl+Z)"), { text: "Undo", key: "Ctrl+Z" });
  assert.deepEqual(T.split("Read their site while they wait. Clipping stays on."), { text: "Read their site while they wait. Clipping stays on.", key: "" });
  assert.deepEqual(T.split("Costs (a pip) of attention"), { text: "Costs (a pip) of attention", key: "" }, "only at the end");
  assert.deepEqual(T.split(""), { text: "", key: "" });
});

test("tips: below the pointer if it fits, above if not, never off an edge", () => {
  const desk = { x: 0, y: 0, w: 1024, h: 768 }, tip = { w: 180, h: 22 };
  const below = T.place({ x: 100, y: 100, w: 1, h: 18 }, tip, desk);
  assert.deepEqual(below, { x: 100, y: 122 });
  const low = T.place({ x: 100, y: 740, w: 1, h: 18 }, tip, desk);
  assert.ok(low.y + tip.h <= 740, "near the bottom it goes above the anchor");
  const right = T.place({ x: 1010, y: 100, w: 1, h: 18 }, tip, desk);
  assert.ok(right.x + tip.w <= desk.w - 2 && right.x >= 2, "pulled in from the right edge");
  const left = T.place({ x: -30, y: 100, w: 1, h: 18 }, tip, desk);
  assert.equal(left.x, 2, "and from the left");
});
