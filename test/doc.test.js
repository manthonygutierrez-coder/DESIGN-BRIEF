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
