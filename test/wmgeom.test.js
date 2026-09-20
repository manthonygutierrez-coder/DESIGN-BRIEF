"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../src/js/wmgeom.js");

const DESK = { w: 1440, h: 816 };
const inside = (r, d = DESK) => r.x >= 0 && r.y >= 0 && r.x + r.w <= d.w && r.y + r.h <= d.h;

test("the first window opens top-left, clear of the icon column", () => {
  const p = G.place(DESK, { w: 760, h: 540 }, [], { left: 104 });
  assert.deepEqual([p.x, p.y, p.cost], [104, 8, 0]);
});

test("the next window opens beside the last one instead of on top of it", () => {
  const web = { x: 104, y: 8, w: 760, h: 540 };
  const call = G.place(DESK, { w: 566, h: 660 }, [web], { left: 104 });
  assert.equal(call.cost, 0);
  assert.equal(G.overlap(call, web), 0);
  assert.ok(inside(call));
});

test("on a full desk it covers as little as it can, and the back windows first", () => {
  const back = { x: 0, y: 0, w: 720, h: 816 }, front = { x: 720, y: 0, w: 720, h: 816 };
  const p = G.place(DESK, { w: 600, h: 400 }, [back, front]);
  assert.ok(inside(p));
  assert.equal(G.overlap(p, front), 0, "the window being worked in stays uncovered");
});

test("a window bigger than the desk is fitted to it", () => {
  const p = G.place({ w: 500, h: 300 }, { w: 900, h: 700 }, []);
  assert.ok(inside(p, { w: 500, h: 300 }));
});

test("tiling side by side splits the desk into columns, then a grid", () => {
  const two = G.tile(DESK, 2, "cols");
  assert.equal(two.length, 2);
  assert.ok(two[0].x < two[1].x && two[0].y === two[1].y);
  assert.equal(G.overlap(two[0], two[1]), 0);
  const five = G.tile(DESK, 5, "cols");
  assert.equal(new Set(five.map((r) => r.y)).size, 2, "two rows of three");
  for (let i = 0; i < five.length; i++) {
    assert.ok(inside(five[i]));
    for (let j = i + 1; j < five.length; j++) assert.equal(G.overlap(five[i], five[j]), 0);
  }
});

test("tiling stacked splits the desk into rows", () => {
  const three = G.tile(DESK, 3, "rows");
  assert.ok(three.every((r) => r.x === three[0].x && r.w === three[0].w));
  assert.ok(three[0].y < three[1].y && three[1].y < three[2].y);
  assert.ok(three.every((r) => inside(r)));
});

test("cascading steps each window down a title bar and stays on the desk", () => {
  const c = G.cascade(DESK, 4);
  assert.ok(c.every((r) => inside(r)));
  assert.ok(c[1].x > c[0].x && c[1].y > c[0].y);
  const many = G.cascade({ w: 700, h: 500 }, 30);
  assert.ok(many.every((r) => inside(r, { w: 700, h: 500 })), "the stair wraps instead of walking off");
});

test("only the very edges snap", () => {
  assert.equal(G.snapZone(DESK, 0, 400), "left");
  assert.equal(G.snapZone(DESK, 1439, 400), "right");
  assert.equal(G.snapZone(DESK, 700, 0), "max");
  assert.equal(G.snapZone(DESK, -40, 400), "left", "pointer capture reports past the edge");
  assert.equal(G.snapZone(DESK, 30, 400), null);
  assert.equal(G.snapZone(DESK, 700, 20), null);
  const l = G.snapRect(DESK, "left"), r = G.snapRect(DESK, "right");
  assert.equal(l.w + r.w, DESK.w);
  assert.equal(G.overlap(l, r), 0);
});

test("a pair shares the desk: the first at its own width, the second the rest", () => {
  const [a, b] = G.pair(DESK, 566);
  assert.equal(a.w, 566);
  assert.equal(G.overlap(a, b), 0);
  assert.ok(inside(a) && inside(b));
  assert.equal(G.pair(DESK, 1300)[0].w, 720, "never more than half");
});

test("resizing from any edge keeps the far edge put and respects the minimum", () => {
  const start = { x: 200, y: 100, w: 600, h: 400 }, min = { w: 250, h: 170 };
  const w = G.resize(start, "w", -50, 0, min, DESK);
  assert.deepEqual(w, { x: 150, y: 100, w: 650, h: 400 });
  const nw = G.resize(start, "nw", 500, 500, min, DESK);
  assert.equal(nw.w, 250); assert.equal(nw.h, 170);
  assert.equal(nw.x + nw.w, 800, "the right edge did not move");
  assert.equal(nw.y + nw.h, 500, "the bottom edge did not move");
  const se = G.resize(start, "se", 5000, 5000, min, DESK);
  assert.ok(inside(se));
  const n = G.resize(start, "n", 0, -500, min, DESK);
  assert.equal(n.y, 0);
});
