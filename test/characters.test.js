"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/js/content/characters.js");

test("every pose is a well-formed grid with a known palette", () => {
  for (const id of ["toma", "kiyoshi"]) {
    const pal = C.ART[id].palette;
    assert.ok(Object.keys(pal).length <= 25, id + " palette fits the grid format");
    for (const p of C.POSES) {
      const g = C.pose(id, p);
      assert.equal(g.rows.length, g.h, id + " " + p + " height");
      for (const row of g.rows) {
        assert.equal(row.length, g.w, id + " " + p + " row width");
        for (const k of row) assert.ok(k === "." || pal[k], id + " " + p + " unknown key " + k);
      }
    }
  }
});

test("canon heights at one scale: 172 cm is 90 px, 178 cm is 93 px", () => {
  assert.equal(C.heightOf("toma", "front"), 90);
  assert.equal(C.heightOf("kiyoshi", "front"), 93);
  assert.equal(C.heightOf("toma", "side"), 90);
  assert.equal(C.heightOf("kiyoshi", "side"), 93);
  const ratio = C.CAST.kiyoshi.height / C.CAST.toma.height;
  assert.ok(Math.abs(93 / 90 - ratio) < 0.01);
});

test("the canon names every palette key it uses", () => {
  for (const id of ["toma", "kiyoshi"]) {
    for (const [k] of C.CAST[id].palette) assert.ok(C.ART[id].palette[k], id + " names " + k);
    for (const [s, b] of Object.entries(C.ART[id].shadowOf)) assert.ok(C.ART[id].palette[b], id + " shadow " + s + " has a base");
  }
});

test("signature colours are where the canon says", () => {
  assert.equal(C.ART.toma.palette.O, "#FF7A1A");
  assert.equal(C.ART.kiyoshi.palette.N, "#1B2A4A");
  const hasKey = (id, pose, k) => C.pose(id, pose).rows.some((r) => r.includes(k));
  for (const p of C.POSES) {
    assert.ok(hasKey("toma", p, "O"), "the band is in toma " + p);
    assert.ok(hasKey("kiyoshi", p, "N"), "the jacket is in kiyoshi " + p);
  }
  assert.ok(hasKey("kiyoshi", "bust", "D"), "the beauty mark");
});

test("image search knows which result is official art", () => {
  const hit = C.poseFor("Kiyoshi Mori", 1);
  assert.deepEqual([hit.id, hit.pose, hit.variant], ["kiyoshi", "bust", "canon"]);
  assert.equal(C.poseFor("relay baton", 0), null);
});
