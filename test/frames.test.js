"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../src/js/suite/frames.js");
const D = require("../src/js/suite/doc.js");

test("order: a run plays forward, backward, or there and back without stuttering at the ends", () => {
  assert.deepEqual(F.order(2, 5, "forward"), [2, 3, 4, 5]);
  assert.deepEqual(F.order(2, 5, "reverse"), [5, 4, 3, 2]);
  assert.deepEqual(F.order(0, 3, "pingpong"), [0, 1, 2, 3, 2, 1], "neither end shows twice when it loops round");
  assert.deepEqual(F.order(0, 1, "pingpong"), [0, 1], "two frames just alternate");
  assert.deepEqual(F.order(4, 4, "pingpong"), [4]);
  assert.deepEqual(F.order(0, 2, "sideways"), [0, 1, 2], "an unknown direction is forward");
});

test("sequence: a tag's run with each frame's own length, or every frame", () => {
  const frames = [{ ms: 100 }, { ms: 200 }, { ms: 300 }, { ms: 400 }];
  assert.deepEqual(F.sequence(frames).map((s) => s.i), [0, 1, 2, 3]);
  assert.deepEqual(F.sequence(frames, { from: 1, to: 3, dir: "pingpong" }), [{ i: 1, ms: 200 }, { i: 2, ms: 300 }, { i: 3, ms: 400 }, { i: 2, ms: 300 }]);
  assert.deepEqual(F.sequence(frames, { from: 2, to: 99, dir: "reverse" }).map((s) => s.i), [3, 2], "a tag past the end is cut to the frames there are");
});

test("onion: frames either side, nearest and strongest first, and none where there is nothing", () => {
  const o = F.onion(2, 6, 2, 1);
  assert.deepEqual(o.map((x) => x.side + x.step + ":" + x.i), ["before1:1", "before2:0", "after1:3"]);
  assert.ok(o[0].alpha > o[1].alpha, "the further one is fainter");
  assert.deepEqual(F.onion(0, 4, 2, 0), [], "the first frame has nothing before it");
  assert.deepEqual(F.onion(3, 4, 0, 2), [], "nor the last, after");
  assert.deepEqual(F.onion(1, 4, 0, 0), [], "and with both at none, nothing shows");
});

test("spread: lengths from the first to the last, even, straight, easing in or easing out", () => {
  assert.deepEqual(F.spread(4, 100, 400, "even"), [100, 100, 100, 100]);
  assert.deepEqual(F.spread(4, 100, 400, "linear"), [100, 200, 300, 400]);
  const inn = F.spread(5, 100, 500, "in"), out = F.spread(5, 100, 500, "out");
  assert.deepEqual([inn[0], inn[4], out[0], out[4]], [100, 500, 100, 500], "both go from one end to the other");
  assert.ok(inn[1] < out[1], "easing in stays near the start longer; easing out leaves it faster");
  assert.deepEqual(F.spread(1, 250, 999, "linear"), [250]);
});

test("sheetLayout: a row, a column or a block, with padding only between frames", () => {
  const row = F.sheetLayout(4, 8, 8);
  assert.deepEqual([row.cols, row.rows, row.W, row.H], [4, 1, 32, 8]);
  const col = F.sheetLayout(4, 8, 8, { pack: "column", pad: 2 });
  assert.deepEqual([col.cols, col.rows, col.W, col.H], [1, 4, 8, 38]);
  const sq = F.sheetLayout(5, 8, 8, { pack: "square" });
  assert.deepEqual([sq.cols, sq.rows], [3, 2]);
  assert.deepEqual(sq.cells[4], { x: 8, y: 8 });
  assert.deepEqual(F.sheetLayout(5, 8, 8, { cols: 2, pad: 1 }).cells[3], { x: 9, y: 9 });
  assert.equal(F.sheetLayout(3, 8, 8, { cols: 99 }).cols, 3, "no more columns than frames");
  assert.equal(F.sheetLayout(3, 8, 8, { pad: 99 }).pad, 16, "padding is kept sensible");
});

test("selection: every frame, or one tag's run", () => {
  const doc = D.create({ mode: "pixel", w: 2, h: 2 });
  D.addFrame(doc); D.addFrame(doc); D.addFrame(doc);
  D.addTag(doc, "b", 1, 2, "forward");
  assert.equal(F.selection(doc).frames.length, 4);
  const s = F.selection(doc, 0);
  assert.deepEqual([s.from, s.to, s.frames.length, s.tag.name], [1, 2, 2, "b"]);
  assert.equal(F.selection(doc, 7).frames.length, 4, "a tag that is not there is the whole animation");
  const still = D.create({ mode: "pixel", w: 2, h: 2 });
  assert.equal(F.selection(still).frames.length, 1, "a sprite that does not move is one frame");
});

test("sheetRGBA: each frame lands in its own cell, and the gaps stay empty", () => {
  const w = 2, h = 2, a = F.rgba(["#FF0000", "", "", "#FF0000"], w, h), b = F.rgba(["#00FF00", "#00FF00", "#00FF00", "#00FF00"], w, h);
  assert.deepEqual([...a.subarray(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...a.subarray(4, 8)], [0, 0, 0, 0], "an empty pixel is clear");
  const lay = F.sheetLayout(2, w, h, { pad: 1 });
  const s = F.sheetRGBA([a, b], lay, w, h);
  assert.deepEqual([s.w, s.h], [5, 2]);
  const px = (x, y) => [...s.rgba.subarray((y * s.w + x) * 4, (y * s.w + x) * 4 + 4)];
  assert.deepEqual(px(0, 0), [255, 0, 0, 255]);
  assert.deepEqual(px(2, 0), [0, 0, 0, 0], "the padding column is clear");
  assert.deepEqual(px(3, 1), [0, 255, 0, 255], "the second frame starts after the padding");
});

test("atlas: where each frame is, at the export's scale, with its length and the tags", () => {
  const lay = F.sheetLayout(2, 8, 8, { pad: 2 });
  const at = F.atlas({ name: "hero", image: "hero sheet@4x.png", layout: lay, w: 8, h: 8, k: 4, frames: [{ ms: 100 }, { ms: 250 }], tags: [{ name: "walk", from: 0, to: 1, dir: "pingpong" }] });
  assert.equal(at.meta.image, "hero sheet@4x.png");
  assert.deepEqual(at.meta.size, { w: 18 * 4, h: 8 * 4 });
  assert.deepEqual(at.frames[1], { filename: "hero 1", frame: { x: 40, y: 0, w: 32, h: 32 }, duration: 250 });
  assert.deepEqual(at.tags, [{ name: "walk", from: 0, to: 1, direction: "pingpong" }]);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(at)));
});

test("seams: a tile that changes hard at its own edge is marked there, and a busy one is left alone", () => {
  const w = 4, h = 4;
  const flat = new Array(w * h).fill("#808080");
  assert.deepEqual(F.seams(flat, w, h), { across: [], down: [] }, "one colour has no seam");
  // Each row a gentle ramp, dark to light: repeated, the light edge meets the dark one in a jump.
  const ramp = Array.from({ length: w * h }, (_, i) => { const v = (i % w) * 32; const x = v.toString(16).padStart(2, "0"); return "#" + x + x + x; });
  assert.deepEqual(F.seams(ramp, w, h).across, [0, 1, 2, 3], "every row jumps where the ramp starts over");
  assert.deepEqual(F.seams(ramp, w, h).down, [], "but going down, each column is one colour");
  const stripe = flat.slice();
  for (let y = 0; y < h; y++) stripe[y * w + (w - 1)] = "#000000";
  assert.deepEqual(F.seams(stripe, w, h).across, [], "a dark stripe is as hard inside the tile as at its edge: not a seam");
  const checker = Array.from({ length: w * h }, (_, i) => ((i % w) + Math.floor(i / w)) % 2 ? "#000000" : "#FFFFFF");
  assert.deepEqual(F.seams(checker, w, h), { across: [], down: [] }, "a checker already changes as hard everywhere");
});
