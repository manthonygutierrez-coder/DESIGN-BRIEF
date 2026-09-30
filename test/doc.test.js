"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/js/suite/doc.js");

test("layers add, update, restack, remove", () => {
  const doc = D.create({ w: 300, h: 200 });
  const a = D.add(doc, D.layer("rect", { x: 10, y: 10, w: 50, h: 50 }));
  const b = D.add(doc, D.layer("ellipse", { x: 20, y: 20, w: 50, h: 50 }));
  assert.equal(D.hitTest(doc, 30, 30).id, b.id);
  D.restack(doc, b.id, "bottom");
  assert.equal(D.hitTest(doc, 30, 30).id, a.id);
  D.update(doc, a.id, { fill: "#00ff00", type: "text" });
  assert.equal(D.find(doc, a.id).fill, "#00FF00");
  assert.equal(D.find(doc, a.id).type, "rect", "type cannot be patched");
  assert.ok(D.remove(doc, a.id));
  assert.equal(doc.layers.length, 1);
});

test("hit-testing respects rotation and ellipse shape", () => {
  const doc = D.create({ w: 300, h: 300 });
  const r = D.add(doc, D.layer("rect", { x: 100, y: 140, w: 100, h: 20, rot: 90 }));
  assert.equal(D.hitTest(doc, 150, 105), r);   // rotated upright
  assert.equal(D.hitTest(doc, 105, 150), null);
  const e = D.add(doc, D.layer("ellipse", { x: 0, y: 0, w: 40, h: 40 }));
  assert.equal(D.hitTest(doc, 2, 2), null);     // corner of the box, outside the ellipse
  assert.equal(D.hitTest(doc, 20, 20), e);
});

test("undo and redo restore whole documents", () => {
  let doc = D.create();
  const h = D.history();
  h.record(doc);
  D.add(doc, D.layer("rect"));
  h.record(doc);
  D.add(doc, D.layer("rect"));
  doc = h.undo(doc); assert.equal(doc.layers.length, 1);
  doc = h.undo(doc); assert.equal(doc.layers.length, 0);
  assert.equal(h.undo(doc), null);
  doc = h.redo(doc); assert.equal(doc.layers.length, 1);
});

test("pixel mode: line, mirror, flood fill, colours", () => {
  const doc = D.create({ mode: "pixel", w: 8, h: 8 });
  D.line(doc, 0, 0, 7, 7, "#ff0000");
  assert.equal(D.getPx(doc, 4, 4), "#FF0000");
  D.line(doc, 1, 0, 1, 0, "#00ff00", true);
  assert.equal(D.getPx(doc, 6, 0), "#00FF00");
  const n = D.fill(doc, 7, 0, "#0000ff");
  assert.ok(n > 10);
  assert.equal(D.getPx(doc, 0, 7), "", "fill does not cross the diagonal");
  assert.deepEqual(D.colours(doc).sort(), ["#0000FF", "#00FF00", "#FF0000"]);
});

test("normalize rejects hostile or malformed content", () => {
  const doc = D.parse(JSON.stringify({
    mode: "free", w: 99999, h: -4,
    layers: [
      { type: "image", src: "https://evil.example/x.png" },
      { type: "script", src: "x" },
      { type: "text", text: "hi", font: "x;}</style><script>", weight: 950 },
      { type: "path", d: "M0 0 javascript:alert(1)" },
      { type: "rect", fill: { a: "#000000", b: "#ffffff", dir: "v" } },
    ],
    meta: { intent: ["c1", 4, {}] },
  }));
  assert.equal(doc.w, 4096);
  assert.equal(doc.h, 1);
  assert.equal(doc.layers.length, 4);
  assert.equal(doc.layers[0].src, "");
  assert.ok(!/[;<>{}]/.test(doc.layers[1].font));
  assert.equal(doc.layers[1].weight, 400);
  assert.equal(doc.layers[2].d, "");
  assert.ok(D.usesGradient(doc));
  assert.deepEqual(doc.meta.intent, ["c1"]);
  assert.equal(D.parse("{nope"), null);
});

test("round trip through serialize", () => {
  const doc = D.create({ mode: "layout", name: "Fan site" });
  D.addBlock(doc, { t: "lede", p: "hello" });
  D.addBlock(doc, { t: "prose", h: "About", ps: ["x"], card: "k1" }, 0);
  D.moveBlock(doc, 0, 1);
  const back = D.parse(D.serialize(doc));
  assert.deepEqual(back.blocks.map((b) => b.t), ["lede", "prose"]);
  assert.deepEqual(D.cardsUsed(back), ["k1"]);
});

test("resizing keeps the work where it was, around the centre", () => {
  const doc = D.create({ w: 600, h: 400 });
  const l = D.add(doc, D.layer("rect", { x: 250, y: 150, w: 100, h: 100 }));
  assert.ok(D.resize(doc, 800, 600));
  assert.deepEqual([doc.w, doc.h, l.x, l.y], [800, 600, 350, 250], "still centred");
  assert.equal(D.resize(doc, 800, 600), false, "same size, nothing to do");

  const px = D.create({ mode: "pixel", w: 4, h: 4 });
  D.setPx(px, 1, 1, "#FF0000"); D.setPx(px, 2, 2, "#00FF00");
  D.resize(px, 8, 8);
  assert.equal(D.getPx(px, 3, 3), "#FF0000");
  assert.equal(D.getPx(px, 4, 4), "#00FF00");
  D.resize(px, 2, 2);
  assert.deepEqual([D.getPx(px, 0, 0), D.getPx(px, 1, 1)], ["#FF0000", "#00FF00"], "cropped around the centre");

  const site = D.create({ mode: "layout" });
  assert.equal(D.resize(site, 10, 10), false, "a page has no canvas size to change");
});

test("duplicating a locked layer gives a copy you can work on", () => {
  const doc = D.create({ mode: "free" });
  const l = D.add(doc, D.layer("rect", { x: 0, y: 0, w: 10, h: 10 }));
  l.locked = true;
  const c = D.duplicate(doc, l.id);
  assert.equal(c.locked, false);
  assert.equal(l.locked, true, "the original stays locked");
});

test("distribute: three or more layers get equal gaps, the outer two stay", () => {
  const doc = D.create({ mode: "free" });
  const a = D.add(doc, D.layer("rect", { x: 0, y: 0, w: 10, h: 10 }));
  const b = D.add(doc, D.layer("rect", { x: 15, y: 0, w: 10, h: 10 }));
  const c = D.add(doc, D.layer("rect", { x: 100, y: 0, w: 10, h: 10 }));
  assert.equal(D.distribute(doc, [a.id, b.id, c.id], "h"), true);
  assert.equal(a.x, 0); assert.equal(c.x, 100);
  assert.equal(b.x, 50, "the middle one sits halfway: gaps of 40 either side");
  assert.equal(D.distribute(doc, [a.id, b.id, c.id], "h"), false, "already even: nothing to do");
  assert.equal(D.distribute(doc, [a.id, b.id], "h"), false, "two layers have nothing between them");
});

test("distribute and align leave a locked layer where it is", () => {
  const doc = D.create({ mode: "free" });
  const a = D.add(doc, D.layer("rect", { x: 0, y: 0, w: 10, h: 10 }));
  const b = D.add(doc, D.layer("rect", { x: 15, y: 0, w: 10, h: 10 }));
  const c = D.add(doc, D.layer("rect", { x: 100, y: 0, w: 10, h: 10 }));
  b.locked = true;
  D.distribute(doc, [a.id, b.id, c.id], "h");
  assert.equal(b.x, 15);
  D.align(doc, [a.id, b.id, c.id], "left");
  assert.equal(b.x, 15);
  assert.equal(c.x, 0);
});

test("paste: copies get new ids, land offset on top, unlocked, and the originals are untouched", () => {
  const src = D.create({ mode: "free" }), dst = D.create({ mode: "free" });
  const a = D.add(src, D.layer("rect", { x: 5, y: 5, w: 10, h: 10 }));
  a.locked = true;
  const out = D.pasteLayers(dst, [a], 20);
  assert.equal(out.length, 1);
  assert.equal(dst.layers.length, 1);
  assert.notEqual(out[0].id, a.id);
  assert.equal(out[0].x, 25);
  assert.equal(out[0].locked, false);
  assert.equal(a.x, 5);
  assert.equal(a.locked, true);
});

test("blocks: moveBlockTo puts a block at an index, and refuses a move that goes nowhere", () => {
  const doc = D.create({ mode: "layout" });
  for (const t of ["lede", "prose", "faq"]) D.addBlock(doc, { t });
  assert.equal(D.moveBlockTo(doc, 0, 2), true);
  assert.deepEqual(doc.blocks.map((b) => b.t), ["prose", "faq", "lede"]);
  assert.equal(D.moveBlockTo(doc, 1, 1), false);
  assert.equal(D.moveBlockTo(doc, 0, 3), false);
  assert.equal(D.moveBlockTo(doc, -1, 0), false);
});

test("doc: frames, a copy at a time, and the picture is always the frame being drawn", () => {
  const doc = D.create({ mode: "pixel", w: 4, h: 4 });
  assert.equal(doc.frames, null, "one frame is no frames");
  D.setPx(doc, 0, 0, "#AA0000");
  assert.ok(D.addFrame(doc));
  assert.equal(doc.frames.length, 2);
  assert.equal(doc.frame, 1, "the new frame is the one you're on");
  assert.equal(D.getPx(doc, 0, 0), "#AA0000", "and it starts as a copy");
  D.setPx(doc, 1, 1, "#00AA00");
  assert.equal(doc.frames[0].px[1 * 4 + 1], "", "drawing on it leaves the first alone");
  D.goFrame(doc, 0);
  assert.equal(D.getPx(doc, 1, 1), "", "back on the first");
  assert.deepEqual(D.colours(doc).sort(), ["#00AA00", "#AA0000"], "colours count every frame");
  D.goFrame(doc, 1);
  assert.ok(D.moveFrame(doc, -1));
  assert.equal(doc.frame, 0);
  assert.equal(D.getPx(doc, 1, 1), "#00AA00", "a frame moved keeps its pixels");
  assert.ok(D.frameMs(doc, 10));
  assert.equal(doc.frames[0].ms, D.FRAME_MS.min, "no frame is shorter than a blink");
  assert.ok(D.removeFrame(doc));
  assert.equal(doc.frames, null, "back to one: back to no frames");
  assert.equal(D.getPx(doc, 0, 0), "#AA0000");
});

test("doc: frames survive saving, undo and a resize", () => {
  const doc = D.create({ mode: "pixel", w: 4, h: 4 });
  D.addFrame(doc); D.setPx(doc, 2, 2, "#0000AA"); D.addFrame(doc);
  // A tool that swaps the bitmap for a new array: the frame still gets it.
  doc.bitmap = doc.bitmap.slice(); doc.bitmap[0] = "#FFFFFF";
  const back = D.parse(D.serialize(doc));
  assert.equal(back.frames.length, 3);
  assert.equal(back.frame, 2);
  assert.equal(back.bitmap, back.frames[2].px, "the picture is the frame, the same array");
  assert.equal(back.bitmap[0], "#FFFFFF", "the bitmap as saved wins");
  const hist = D.history();
  hist.record(doc);
  D.goFrame(doc, 1); D.setPx(doc, 3, 3, "#AA00AA");
  const before = D.normalize(hist.undo(doc));
  assert.equal(before.frames[1].px[15], "", "undo brings the frames back as they were");
  const big = D.parse(D.serialize(doc));
  D.resize(big, 6, 6);
  assert.ok(big.frames.every((f) => f.px.length === 36), "every frame is resized");
  assert.equal(big.frames[1].px[3 * 6 + 3], "#0000AA", "and keeps its drawing, centred");
  assert.equal(big.bitmap, big.frames[big.frame].px);
  const junk = D.normalize({ mode: "pixel", w: 2, h: 2, bitmap: ["", "", "", ""], frames: [{ px: ["#AA0000", "", "", ""], ms: 99999 }, { px: ["x"] }, { px: ["", "", "", ""] }] });
  assert.equal(junk.frames.length, 2, "a frame of the wrong size is dropped");
  assert.equal(junk.frames[0].ms, D.FRAME_MS.max);
});

function frameDoc(n) {
  const doc = D.create({ mode: "pixel", w: 2, h: 2 });
  for (let i = 1; i < n; i++) D.addFrame(doc);
  // each frame's first pixel says which frame it is: 0..n-1
  doc.frames.forEach((f, i) => { f.px[0] = "#00000" + i; });
  D.goFrame(doc, 0);
  return doc;
}
const order = (doc) => doc.frames.map((f) => f.px[0].slice(-1)).join("");

test("tags: a named run of frames, kept in bounds, at most eight", () => {
  const doc = frameDoc(5);
  assert.equal(D.addTag(doc, "walk", 3, 1, "pingpong"), true);
  assert.deepEqual(doc.tags[0], { name: "walk", from: 1, to: 3, dir: "pingpong" }, "the ends are put in order");
  D.addTag(doc, "x".repeat(50), -4, 99, "sideways");
  assert.deepEqual([doc.tags[1].name.length, doc.tags[1].from, doc.tags[1].to, doc.tags[1].dir], [16, 0, 4, "forward"], "long names, wild ends and unknown directions are set right");
  for (let i = 0; i < 12; i++) D.addTag(doc, "t" + i, 0, 1, "forward");
  assert.equal(doc.tags.length, D.MAX_TAGS);
  assert.equal(D.addTag(D.create({ mode: "pixel", w: 2, h: 2 }), "a", 0, 0, "forward"), false, "one frame has nothing to tag");
  assert.equal(D.removeTag(doc, 0), true);
  assert.equal(D.updateTag(doc, 0, { to: 2, name: "run" }), true);
  assert.equal(doc.tags[0].name, "run");
});

test("tags: adding, deleting and moving frames carries them along", () => {
  const doc = frameDoc(4);                                      // frames 0 1 2 3
  D.addTag(doc, "mid", 1, 2, "forward");
  D.goFrame(doc, 0); D.addFrame(doc);                            // a copy of 0 goes in at 1: mid is now 2..3
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [2, 3]);
  D.goFrame(doc, 2); D.addFrame(doc);                            // put in at 3, inside the run: it grows
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [2, 4]);
  D.goFrame(doc, 3); D.removeFrame(doc);                         // and out again
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [2, 3]);
  D.goFrame(doc, 1); D.removeFrame(doc);                         // one before the run: it moves back
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [1, 2]);
  D.goFrame(doc, 1); D.moveFrame(doc, 1);                        // the run's first frame swaps with its last
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [1, 2], "a swap inside the run leaves it whole");
  const one = frameDoc(3);
  D.addTag(one, "solo", 1, 1, "forward");
  D.goFrame(one, 1); D.removeFrame(one);
  assert.deepEqual(one.tags, [], "a tag on just the frame that goes, goes");
  const two = frameDoc(2);
  D.addTag(two, "all", 0, 1, "forward");
  D.removeFrame(two);
  assert.deepEqual(two.tags, [], "back to one frame: no tags");
});

test("tags: they survive saving, and nonsense in a file does not", () => {
  const doc = frameDoc(4);
  D.addTag(doc, "idle", 0, 1, "reverse");
  const back = D.parse(D.serialize(doc));
  assert.deepEqual(back.tags, doc.tags);
  const junk = D.normalize({ mode: "pixel", w: 2, h: 2, bitmap: ["", "", "", ""], frames: [{ px: ["", "", "", ""] }, { px: ["", "", "", ""] }],
    tags: [null, "x", { name: 7, from: "a", to: 999, dir: {} }, { name: "ok", from: 1, to: 0 }] });
  assert.equal(junk.tags.length, 2, "the null and the string are dropped");
  assert.deepEqual(junk.tags[0], { name: "tag", from: 0, to: 1, dir: "forward" }, "a number for a name, a letter for a frame: the defaults");
  assert.deepEqual(junk.tags[1], { name: "ok", from: 0, to: 1, dir: "forward" });
  assert.deepEqual(D.normalize({ mode: "pixel", w: 2, h: 2, tags: [{ name: "a", from: 0, to: 1 }] }).tags, [], "no frames: no tags");
  const old = D.normalize({ mode: "pixel", w: 2, h: 2, bitmap: ["", "", "", ""], frames: [{ px: ["", "", "", ""] }, { px: ["", "", "", ""] }] });
  assert.deepEqual(old.tags, [], "an old animation has none");
});

test("frames: reverse a range, and give a run of frames their lengths", () => {
  const doc = frameDoc(5);
  D.addTag(doc, "run", 1, 3, "forward");
  D.goFrame(doc, 2);
  assert.equal(D.reverseFrames(doc, 1, 3), true);
  assert.equal(order(doc), "03214");
  assert.equal(doc.frames[doc.frame].px[0].slice(-1), "2", "you stay on the same picture");
  assert.equal(doc.frame, 2);
  assert.deepEqual([doc.tags[0].from, doc.tags[0].to], [1, 3], "a tag that was the range is still the range");
  assert.equal(D.reverseFrames(doc), true);
  assert.equal(order(doc), "41230");
  assert.equal(D.reverseFrames(doc, 2, 2), false, "one frame reversed is the same");
  assert.equal(D.setRangeMs(doc, 1, [100, 200, 99999, 5]), true);
  assert.deepEqual(doc.frames.map((f) => f.ms).slice(1), [100, 200, D.FRAME_MS.max, D.FRAME_MS.min], "lengths are kept between a blink and four seconds");
  assert.equal(D.setRangeMs(doc, 1, [100, 200, D.FRAME_MS.max, D.FRAME_MS.min]), false, "nothing changed: nothing to record");
});
