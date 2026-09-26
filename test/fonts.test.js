"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const A = require("../src/js/suite/apps.js");

const root = path.join(__dirname, "..", "src");
const css = fs.readFileSync(path.join(root, "styles", "fonts.css"), "utf8");
const notice = fs.readFileSync(path.join(root, "fonts", "LICENSE.md"), "utf8");
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
  family: /font-family:\s*'([^']+)'/.exec(body)[1],
  weight: /font-weight:\s*([\d ]+);/.exec(body)[1].trim().split(/\s+/).map(Number),
  style: /font-style:\s*(\w+)/.exec(body)[1],
  file: /url\(\.\.\/fonts\/([^)]+)\)/.exec(body)[1],
}));

test("fonts: every face the type menu offers is bundled, in every weight it lists", () => {
  for (const f of A.FONTS.filter((x) => x.cat !== "System")) {
    const mine = faces.filter((x) => x.family === f.name && x.style === "normal");
    assert.ok(mine.length, f.name + " has an @font-face");
    for (const w of f.weights) {
      assert.ok(mine.some((x) => (x.weight.length === 1 ? x.weight[0] === w : w >= x.weight[0] && w <= x.weight[1])), f.name + " " + w + " is bundled");
    }
    if (f.italic) assert.ok(faces.some((x) => x.family === f.name && x.style === "italic"), f.name + " has its italic");
  }
});

test("fonts: every file is there, and every family is credited under the OFL", () => {
  for (const x of faces) assert.ok(fs.existsSync(path.join(root, "fonts", x.file)), x.file);
  for (const fam of new Set(faces.map((x) => x.family))) assert.ok(notice.includes("| " + fam + " |"), fam + " is in src/fonts/LICENSE.md");
  const n = new Set(faces.map((x) => x.family)).size;
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  assert.ok(notice.includes("bundles " + words[n] + " typefaces"), "the notice counts " + n);
});

test("fonts: choosing a face snaps the text to a weight it really has", () => {
  assert.equal(A.weightFor("Pacifico", 700), 400);
  assert.equal(A.weightFor("Syne", 400), 700);
  assert.equal(A.weightFor("Fraunces", 800), 800);
  assert.equal(A.weightFor("Cinzel", 650), 600);
  assert.equal(A.weightFor("Some Card Face", 300), 300, "a face we don't know keeps its weight");
});

test("fonts: every category the menu shows has something in it", () => {
  for (const c of ["Logotype", "Monogram", "Script", "Display"]) assert.ok(A.FONTS.some((f) => f.cat === c), c);
  for (const f of A.FONTS) assert.ok(A.FONT_CATS.includes(f.cat), f.name + ": " + f.cat + " is a category");
});
