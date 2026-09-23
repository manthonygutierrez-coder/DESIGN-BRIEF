"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/js/content/imageplan.js");

test("a picture is of the thing named last, with anything else printed on it", () => {
  assert.equal(P.plan("mallard duck").subject, "duck");
  assert.equal(P.plan("breakfast burrito").subject, "burrito");
  assert.equal(P.plan("stage magician top hat").subject, "tophat");
  const mug = P.plan("bigfoot mug");
  assert.equal(mug.subject, "cup");
  assert.equal(mug.companion, "bigfoot");
});

test("a place is a place, and it has a time of day", () => {
  const r = P.plan("reservoir at dawn");
  assert.equal(r.subject, null);
  assert.equal(r.setting, "water");
  assert.equal(r.time, "dawn");
  assert.equal(P.plan("drive thru at dawn").setting, "drive");
  assert.equal(P.plan("vintage vegas sign", 0).time, "night", "a sign is shot lit up");
  assert.equal(P.plan("breakfast burrito").time, "indoor");
});

test("moods stay moods, and words that mean something else are not things", () => {
  for (const q of ["boucle fabric", "payment flow diagram", "sign language hands", "tide table page",
                   "sofa studio shot", "departure board", "granite monolith field", "weather ship log"]) {
    assert.equal(P.plan(q).legacy, true, q);
  }
});

test("the query's own words decide colour and treatment", () => {
  assert.equal(P.colourOf(P.plan("gold crown")), P.COLOURS.gold);
  assert.equal(P.colourOf(P.plan("terracotta mugs")), P.COLOURS.terracotta);
  assert.equal(P.colourOf(P.plan("fluorescent pink ink")), P.COLOURS["fluorescent pink"]);
  assert.ok(P.plan("blurry lake photo").looks.includes("blurry"));
  assert.ok(P.plan("black and white street").looks.includes("mono"));
  assert.ok(P.plan("vintage vegas sign").looks.includes("vintage"));
  assert.ok(P.plan("white doves", 0).count >= 2, "plural means more than one");
});

test("a page of results varies, and the same result is always the same picture", () => {
  const page = Array.from({ length: 24 }, (_, i) => P.plan("white doves", i));
  assert.ok(new Set(page.map((r) => r.framing)).size >= 4, "several framings");
  assert.ok(new Set(page.map((r) => r.setting)).size >= 2, "more than one place");
  assert.ok(page.some((r) => r.subject === null), "and the odd near miss");
  assert.deepEqual(P.plan("white doves", 5), P.plan("white doves", 5));
  assert.ok(page.every((r) => r.framing !== "top"), "birds are not shot from above");
});

test("every picture Hustle asks for is of something", () => {
  const H = require("../src/js/hustle/content.js");
  const C = require("../src/js/content/characters.js");
  const queries = new Set();
  for (const g of Object.values(H.gigs)) (g.refs || []).forEach((r) => queries.add(r.q));
  for (const s of Object.values(H.sites)) {
    (s.refs || []).forEach((q) => queries.add(q));
    for (const b of Object.values(s.site.pages).flat()) {
      if ((b.t === "plate" || b.t === "gallery") && b.q) queries.add(b.q);
      if (b.t === "products") b.items.forEach((it) => it.ref && queries.add(it.ref));
    }
  }
  for (const q of queries) {
    if (C.poseFor(q, 0) || q === "paper moon relay key visual") continue;   // official art
    const r = P.plan(q, 0);
    assert.ok(!r.legacy && (r.subject || r.setting), q + " is a picture of something");
  }
});
