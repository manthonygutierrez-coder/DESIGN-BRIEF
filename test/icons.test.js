"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// icons.js is a classic script with no exports: run it and read what it made.
const src = fs.readFileSync(path.join(__dirname, "..", "src", "js", "icons.js"), "utf8");
const ctx = vm.createContext({});
vm.runInContext(src + "\n;this.__art = ICON_ART; this.__svg = iconSVG;", ctx);
const art = ctx.__art;

test("icons: every sprite is 16 rows of 16 cells", () => {
  for (const [id, a] of Object.entries(art)) {
    assert.equal(a.g.length, 16, id + " has 16 rows");
    a.g.forEach((row, y) => assert.equal(row.length, 16, id + " row " + y + " is 16 wide"));
  }
});

test("icons: every cell is transparent or in the palette", () => {
  for (const [id, a] of Object.entries(art)) {
    for (const ch of a.g.join("")) if (ch !== ".") assert.ok(ch in a.p, id + " uses undefined colour '" + ch + "'");
  }
});

test("icons: the desktop sizes are whole multiples of the grid", () => {
  const svg = ctx.__svg("mail", 32);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /viewBox="0 0 16 16"/);
});
