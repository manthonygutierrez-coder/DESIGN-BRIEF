"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/js/suite/polish.js");
const E = require("../src/js/suite/pixeled.js");

// A sprite from rows of text: "." is empty; a, b, k (near black), c (cream)
// and w (white) are colours.
const INK = { a: "#AA0000", b: "#00AA00", k: "#202020", c: "#F6EAD2", w: "#FFFFFF" };
const pic = (rows) => ({ w: rows[0].length, h: rows.length, b: rows.join("").split("").map((ch) => INK[ch] || "") });
const find = (rows) => { const s = pic(rows); return P.find(s.b, s.w, s.h); };
const at = (r) => r.marks.map((m) => m.kind + " " + m.x + "," + m.y).sort();
const sprite = (w, h, pts) => { const b = Array(w * h).fill(""); for (const [x, y] of pts) if (x >= 0 && y >= 0 && x < w && y < h) b[y * w + x] = "#AA0000"; return b; };

test("polish: a lone pixel, and a pinhole in something solid", () => {
  assert.deepEqual(at(find([".....", "..a..", "....."])), ["stray 2,1"]);
  assert.deepEqual(at(find(["aaaaa", "aaaaa", "aa.aa", "aaaaa", "aaaaa"])), ["stray 2,2"]);
  assert.deepEqual(at(find(["aaaaaaa", "aaa.aaa", "aaaaaaa"])), ["stray 3,1"], "a hole in a bar");
  assert.equal(find(["aaa", "a.a", "aaa"]).total, 0, "the middle of a tiny ring is meant");
  assert.equal(find(["abab", "baba", "abab", "baba"]).total, 0, "a dither is not noise: each pixel touches its own colour corner to corner");
  assert.equal(find(["ccccc", "ckkkc", "ckwkc", "ckkkc", "ccccc"]).total, 0, "a glint in an eye is meant");
  assert.deepEqual(at(find(["ccccc", "ccccc", "ccacc", "ccccc", "ccccc"])), ["stray 2,2"], "a dark speck in a light patch is not a glint");
  assert.deepEqual(at(find([".....", "..w..", "....."])), ["stray 2,1"], "nor is a light pixel out on its own");
});

test("polish: a line doubled up at its steps, but not a square corner or a solid edge", () => {
  const r = find(["aa....", ".aa...", "..aa..", "...aa."]);
  assert.ok(r.counts.double >= 3 && r.counts.stray === 0, JSON.stringify(r.counts));
  assert.deepEqual(at(find(["a...", "aaaa"])), ["double 0,1"], "a one-pixel hook");
  assert.equal(find(["aaaaa", "a...a", "a...a", "a...a", "aaaaa"]).total, 0, "a box outline");
  assert.equal(find(["a...", "aa..", "aaa.", "aaaa"]).total, 0, "the stepped edge of something solid");
  assert.equal(find(["aaaa", "aaaa", "aaaa"]).total, 0);
});

test("polish: an uneven step, but not a steady rhythm or a curve", () => {
  assert.deepEqual(at(find(["aaa.......", "...a......", "....aaa...", ".......aaa"])), ["step 3,1"], "3, 1, 3");
  assert.deepEqual(at(find(["a.........", ".a........", "..a.......", "...aa.....", ".....a....", "......a...", ".......a.."])), ["step 3,3", "step 4,3"], "the one 2 in a line of 1s");
  assert.equal(find(["aa.........", "..a........", "...aa......", ".....a.....", "......aa...", "........a..", ".........aa"]).total, 0, "2, 1, 2, 1 keeps time");
  assert.equal(find(["....aaaa....", "..aa....aa..", ".a........a.", "a..........a"]).total, 0, "a curve's runs grow or shrink");
});

test("polish: the clean-steps line and the ellipse lay down nothing to tidy", () => {
  for (let x1 = 1; x1 < 30; x1++) for (let y1 = 0; y1 < 30; y1++) {
    assert.equal(P.find(sprite(32, 32, E.cleanLine(0, 0, x1, y1).pts), 32, 32).total, 0, "clean line to " + x1 + "," + y1);
  }
  for (let a = 2; a < 30; a++) for (let b = 2; b < 30; b++) {
    const pts = E.ellipsePts(1, 1, a, b, false), r = P.find(sprite(32, 32, pts), 32, 32);
    assert.equal(r.counts.double + r.counts.stray, 0, "ellipse " + a + " × " + b + " has no doubled corners");
    const on = new Set(pts.map(([x, y]) => x + "," + y));
    assert.ok(pts.every(([x, y]) => on.has(a + 1 - x + "," + y) && on.has(x + "," + (b + 1 - y))), "and is symmetrical");
  }
});

test("polish: a tidy icon has nothing marked, and counts add up", () => {
  const w = 32, b = Array(w * w).fill("");
  for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) b[y * w + x] = x === 6 || x === 25 || y === 6 || y === 25 ? "#3A2418" : y < 12 ? "#F6EAD2" : "#D9482B";
  assert.equal(P.find(b, w, w).total, 0);
  b[3 * w + 3] = "#D9482B";
  const r = P.find(b, w, w);
  assert.equal(r.total, 1);
  assert.equal(r.total, r.counts.stray + r.counts.double + r.counts.step);
  assert.equal(P.say("stray", 1), "1 lone pixel");
  assert.equal(P.say("double", 3), "3 doubled corners");
});

test("polish: a big noisy sprite is quick enough to check as you draw", () => {
  const w = 128, b = Array.from({ length: w * w }, (_, i) => ((i * 2654435761) >>> 0) % 5 === 0 ? "#AA0000" : ((i * 40503) >>> 0) % 7 === 0 ? "#00AA00" : "");
  const t = process.hrtime.bigint();
  const r = P.find(b, w, w);
  const ms = Number(process.hrtime.bigint() - t) / 1e6;
  assert.ok(r.total > 100, "it finds the noise");
  assert.ok(ms < 250, ms.toFixed(1) + " ms");
});

test("polish: Tori's icon lesson ticks once no more than two things are ringed", () => {
  const L = require("../src/js/hustle/lessons.js");
  const D = require("../src/js/suite/doc.js");
  const step = { id: "polish", say: "Tidy", with: ["view:polish"], check: { polish: 2 } };
  assert.deepEqual(L.problems([step]), [], "Polish is a control a lesson can point at");
  const doc = D.create({ mode: "pixel", w: 32, h: 32 });
  assert.equal(L.check(step, { doc, cards: [] }), false, "nothing drawn: nothing done");
  for (let y = 8; y < 24; y++) for (let x = 8; x < 24; x++) D.setPx(doc, x, y, "#D9482B");
  for (const [x, y] of [[2, 2], [29, 2], [2, 29]]) D.setPx(doc, x, y, "#3A2418");
  assert.equal(L.check(step, { doc, cards: [] }), false, "three lone pixels");
  D.setPx(doc, 2, 29, "");
  assert.equal(L.check(step, { doc, cards: [] }), true, "two left: done");
});
