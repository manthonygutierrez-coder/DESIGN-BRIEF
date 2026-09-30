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
