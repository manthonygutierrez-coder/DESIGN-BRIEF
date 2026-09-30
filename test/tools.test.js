"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/js/suite/tools.js");
const Pixel = require("../src/js/suite/pixeled.js");
const Vector = require("../src/js/suite/vectored.js");

test("tools: no mode gives two tools the same key", () => {
  assert.deepEqual(T.conflicts("pixel", Pixel.TOOLS), []);
  const vec = Vector.TOOLS.filter((t) => !t.flyout).concat(Object.entries(Vector.SHAPES).map(([id, s]) => ({ id, key: s.key })));
  assert.deepEqual(T.conflicts("vector", vec), []);
});

test("tools: V picks Select in Pixel as it does in Vector, and M still works", () => {
  const map = T.keyMap("pixel", Pixel.TOOLS);
  assert.equal(map.v, "select");
  assert.equal(map.m, "select");
  assert.equal(map.w, "wand");
  assert.equal(T.keyMap("vector", Vector.TOOLS.filter((t) => !t.flyout)).v, "select");
});

test("tools: Escape comes back to Select in every mode", () => {
  for (const m of ["vector", "pixel", "layout", "frames"]) assert.equal(T.home(m), "select");
});

test("tools: every tool in a mode has something to say when it is picked", () => {
  for (const t of Pixel.TOOLS) assert.ok(T.hint("pixel", t.id), "pixel " + t.id + " has a hint");
  for (const t of Vector.TOOLS.filter((x) => !x.flyout)) assert.ok(T.hint("vector", t.id), "vector " + t.id + " has a hint");
  for (const id of Object.keys(Vector.SHAPES)) assert.ok(T.hint("vector", id), "vector " + id + " has a hint");
  assert.match(T.hint("pixel", "select"), /Alt takes one away/, "a mode's own line wins over the general one");
});

test("tools: the pointer says what is under it", () => {
  assert.equal(T.cursor("pencil"), "crosshair");
  assert.equal(T.cursor("hand"), "grab");
  assert.equal(T.cursor("pencil", { space: true }), "grab");
  assert.equal(T.cursor("select", { overSel: true }), "move");
  assert.equal(T.cursor("select"), "default");
  assert.equal(T.cursor("eyedrop"), "cell");
  assert.equal(T.cursor("hand", { panning: true }), "grabbing");
});

test("tools: the shortcut sheet lists the tools, the editing keys and the keys every mode shares", () => {
  const s = T.sheet("pixel", Pixel.TOOLS);
  const titles = s.map((g) => g.title);
  assert.deepEqual(titles, ["TOOLS", "EDITING", "EVERY MODE"]);
  const tools = s[0].rows.map((r) => r[0]);
  assert.ok(tools.includes("B") && tools.includes("W"));
  assert.ok(s[0].rows.some((r) => r[0] === "V" && /also/.test(r[1])), "the alias is listed");
  assert.ok(s[2].rows.some((r) => r[0] === "Cmd+1"));
  assert.equal(T.sheet("pixel", Pixel.TOOLS, [["Cmd+K", "x"]]).map((g) => g.title)[2], "THIS JOB");
});
