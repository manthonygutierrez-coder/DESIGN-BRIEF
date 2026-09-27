"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/js/suite/doc.js");

test("doc: the new layer fields survive saving and loading, and nonsense does not", () => {
  const doc = D.create({ w: 800, h: 800 });
  D.add(doc, D.layer("rect", { radius: 12, mirror: { v: 400, h: null } }));
  D.add(doc, D.layer("polygon", { sides: 6, inner: 0.4 }));
  D.add(doc, D.layer("text", { text: "DENNIS", weight: 900, style: "italic", bend: 40, on: "L123", offset: 25 }));
  doc.guides = { v: [100, 300], h: [50, 250] };
  const back = D.parse(D.serialize(doc));
  const [r, p, t] = back.layers;
  assert.equal(r.radius, 12);
  assert.deepEqual(r.mirror, { v: 400, h: null });
  assert.equal(p.sides, 6); assert.equal(p.inner, 0.4);
  assert.equal(t.weight, 900); assert.equal(t.style, "italic");
  assert.equal(t.bend, 40); assert.equal(t.on, "L123"); assert.equal(t.offset, 25);
  assert.deepEqual(back.guides, { v: [100, 300], h: [50, 250] });

  const bad = D.normalize({ w: 100, h: 100, guides: { v: ["x", 1e9, 20], h: "no" },
    layers: [{ type: "polygon", sides: 999, inner: 7 }, { type: "text", weight: 950, style: "oblique", bend: 400 }, { type: "rect", mirror: { v: "a" } }] });
  assert.deepEqual(bad.guides, { v: [20], h: [] });
  assert.equal(bad.layers[0].sides, 24); assert.equal(bad.layers[0].inner, 0.98);
  assert.equal(bad.layers[1].weight, 400); assert.equal(bad.layers[1].style, "normal"); assert.equal(bad.layers[1].bend, 100);
  assert.equal(bad.layers[2].mirror, null);
  // Old documents have none of it and load as they were.
  const old = D.normalize({ w: 100, h: 100, layers: [{ type: "text", text: "hi", weight: 700 }] });
  assert.equal(old.layers[0].bend, 0); assert.equal(old.layers[0].mirror, null); assert.deepEqual(old.guides, { v: [], h: [] });
});

test("doc: a click lands on paint, on a reflection, and through a hole", () => {
  const doc = D.create({ w: 400, h: 200 });
  const o = D.add(doc, D.layer("path", { d: "M0 0H64V64H0Z M16 16H48V48H16Z", box: 64, fillRule: "evenodd", x: 100, y: 50, w: 64, h: 64 }));
  const back = D.add(doc, D.layer("rect", { x: 0, y: 0, w: 400, h: 200 }));
  D.restack(doc, back.id, "bottom");
  assert.equal(D.hitTest(doc, 105, 55).id, o.id, "the ring's paint");
  assert.equal(D.hitTest(doc, 132, 82).id, back.id, "through the ring's hole to what is behind it");
  const star = D.add(doc, D.layer("polygon", { x: 300, y: 20, w: 60, h: 60, sides: 5, inner: 0.4 }));
  assert.equal(D.hitTest(doc, 330, 50).id, star.id, "a star's middle");
  assert.equal(D.hitTest(doc, 301, 78).id, back.id, "not its empty corner");
  const half = D.add(doc, D.layer("rect", { x: 10, y: 150, w: 40, h: 20, mirror: { v: 200, h: null } }));
  assert.equal(D.hitTest(doc, 370, 160).id, half.id, "its reflection across x = 200 is clickable too");
});
