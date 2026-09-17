"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/js/suite/doc.js");
const C = require("../src/js/suite/cards.js");

const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("normalize rejects bad cards", () => {
  assert.equal(C.normalize({ kind: "colour", value: "red" }), null);
  assert.equal(C.normalize({ kind: "object", value: "https://x/y.png" }), null);
  assert.equal(C.normalize({ kind: "weapon", value: "x" }), null);
  assert.equal(C.normalize({ kind: "type", value: '"}<script>' }).value, "script");
  assert.equal(C.normalize({ kind: "colour", value: "#abcdef" }).value, "#ABCDEF");
});

test("every application writes provenance", () => {
  const doc = D.create({ w: 400, h: 300 });
  const red = C.card("colour", "Red", "#E0442B");
  const img = C.card("object", "Ref", PNG);
  const face = C.card("type", "Serif", "Instrument Serif");
  const gap = C.card("gap", "Nobody shows the room", "none of the rivals photograph the space");

  const placed = C.applyToCanvas(doc, img, { x: 200, y: 150 });
  assert.ok(placed.ok);
  const text = D.add(doc, D.layer("text"));
  assert.ok(C.applyToLayer(doc, text.id, face).ok);
  assert.equal(D.find(doc, text.id).font, "Instrument Serif");
  assert.ok(C.applyToLayer(doc, text.id, red, { stroke: true }).ok);
  assert.equal(D.find(doc, text.id).stroke, "#E0442B");
  assert.ok(C.applyToCanvas(doc, gap).ok);

  assert.deepEqual(D.cardsUsed(doc).sort(), [gap.id, img.id, red.id].sort());
  assert.equal(C.applyToLayer(doc, placed.layer.id, face).ok, false, "type does not apply to an image");
});

test("palette caps at six in free mode", () => {
  const doc = D.create();
  for (let i = 0; i < 6; i++) assert.ok(C.applyToCanvas(doc, C.card("colour", "c", "#00000" + i)).ok);
  assert.equal(C.applyToCanvas(doc, C.card("colour", "c", "#FFFFFF")).ok, false);
});

test("layout blocks take intent cards as copy", () => {
  const doc = D.create({ mode: "layout" });
  D.addBlock(doc, { t: "lede", p: "old" });
  const fact = C.card("fact", "They say", "Open late on Fridays");
  assert.ok(C.applyToBlock(doc, 0, fact).ok);
  assert.equal(doc.blocks[0].p, "Open late on Fridays");
  assert.deepEqual(D.cardsUsed(doc), [fact.id]);
});

test("debug pack builds from a real client", () => {
  global.clientFor = undefined;
  const src = require("fs").readFileSync(__dirname + "/../src/js/content/clients.js", "utf8");
  const CLIENTS = new Function(src + "; return CLIENTS;")();
  const client = Object.values(CLIENTS)[0];
  const pack = C.debugPack(client, () => PNG);
  const kinds = new Set(pack.map((c) => c.kind));
  for (const k of ["colour", "type", "object", "shape"]) assert.ok(kinds.has(k), "has " + k);
  assert.ok(pack.every((c) => C.normalize(c)));
});

test("colour families", () => {
  const has = (hex, ...want) => { const t = C.colourTags(hex); for (const w of want) assert.ok(t.includes(w), hex + " should be " + w + " (got " + t + ")"); };
  has("#1B2A4A", "blue", "navy", "dark", "cool");
  has("#FF7A1A", "orange", "warm", "vivid");
  has("#FFFFFF", "neutral", "white");
  has("#0A0A0A", "neutral", "black");
  has("#F7B6C8", "pink", "pastel", "warm");
  assert.ok(C.card("colour", "x", "#FF7A1A").tags.includes("orange"), "colour cards carry their family");
});

test("object cards become a picture block's image", () => {
  const doc = D.create({ mode: "layout" });
  D.addBlock(doc, { t: "plate", q: "", cap: "" });
  D.addBlock(doc, { t: "lede", p: "x" });
  const pic = C.card("object", "Banner", PNG);
  assert.ok(C.applyToBlock(doc, 0, pic).ok);
  assert.equal(doc.blocks[0].q, "card:" + pic.id);
  assert.equal(C.applyToBlock(doc, 1, pic).ok, false);
  assert.deepEqual(D.cardsUsed(doc), [pic.id]);
});
