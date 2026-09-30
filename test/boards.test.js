"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Memory = require("../src/js/games/memory.js");
const Sweep = require("../src/js/games/sweep.js");
const Rhythm = require("../src/js/games/rhythm.js");
const Picross = require("../src/js/games/picross.js");
const Games = require("../src/js/hustle/games.js");
const HUSTLE = require("../src/js/hustle/content.js");
const Tutorial = require("../src/js/hustle/tutorial.js");

const gigs = Object.assign({}, HUSTLE.gigs, Tutorial.gigs);
const of = (engine) => Object.entries(Games.GAMES).filter(([, s]) => s.engine === engine);

test("games: every gig has a game, and no two gigs play the same kind of game on the same site twice over", () => {
  const without = Object.keys(gigs).filter((id) => !Games.of(id));
  assert.deepEqual(without, [], "every gig hides a game");
  const kinds = new Set(Object.values(Games.GAMES).map((s) => s.engine));
  assert.ok(kinds.size >= 6, "a mix of ways to play: " + [...kinds].join(", "));
  assert.deepEqual(Games.problems(gigs), []);
});

/* ── memory ─────────────────────────────────────────────── */
test("memory: dealing, turning two, pairs staying up, misses turning back", () => {
  const C = Memory.core;
  const pairs = [{ a: {} }, { a: {} }, { a: {} }];
  const st = C.deal(pairs, 9);
  assert.equal(st.cards.length, 6);
  assert.deepEqual(st.cards.map((c) => c.pair).sort(), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual(C.deal(pairs, 9).cards.map((c) => c.pair), st.cards.map((c) => c.pair), "the same seed deals the same");
  const idx = (p, side) => st.cards.findIndex((c) => c.pair === p && c.side === side);
  const other = (p) => st.cards.findIndex((c) => c.pair !== p);
  assert.equal(C.flip(st, idx(0, "a")), "one");
  assert.equal(C.flip(st, idx(0, "a")), null, "a card already up does nothing");
  assert.equal(C.flip(st, other(0)), "miss");
  assert.equal(C.flip(st, idx(2, "a")), null, "two up, waiting to turn back");
  C.settle(st);
  assert.ok(st.cards.every((c) => !c.up));
  assert.equal(C.flip(st, idx(0, "a")), "one");
  assert.equal(C.flip(st, idx(0, "b")), "match");
  assert.ok(C.setDone(st, [{ set: "x" }, {}, {}], "x"), "a set is done when its pairs are");
  C.flip(st, idx(1, "a")); C.flip(st, idx(1, "b"));
  C.flip(st, idx(2, "a"));
  assert.equal(C.flip(st, idx(2, "b")), "done");
  assert.equal(st.moves, 4);
});

test("memory: every table fills the grid, and everything it grants can be won", () => {
  const C = Memory.core;
  for (const [id, spec] of of("memory")) {
    assert.equal(spec.pairs.length * 2, C.COLS * C.ROWS, id + " fills the table");
    const given = new Set(spec.pairs.filter((p) => p.grant).map((p) => p.grant).concat(Object.values(spec.sets || {}).filter((s) => s.grant).map((s) => s.grant)));
    assert.deepEqual([...given].sort(), [...spec.grants].sort(), id + " can win every grant");
    for (const p of spec.pairs) {
      if (p.grant) assert.ok(p.say, id + " " + p.id + " says what it was");
      for (const f of [p.a, p.b].filter(Boolean)) assert.ok(!f.label || f.label.length <= 8, id + " " + p.id + ": a label fits on a card");
      if (p.set) assert.ok(spec.sets && spec.sets[p.set], id + " " + p.id + ": its set is there");
    }
  }
});

/* ── sweep ──────────────────────────────────────────────── */
test("sweep: the first post is always safe, zeros open their neighbours, and clearing wins", () => {
  const C = Sweep.core;
  for (let seed = 1; seed <= 30; seed++) {
    const b = C.board(10, 7, 11);
    const first = (seed * 7) % 70;
    const r = C.open(b, first, seed);
    assert.notEqual(r, "spoiled", "never spoiled on the first");
    assert.equal(b.bad.reduce((s, x) => s + x, 0), 11);
    for (const j of C.around(b, first)) assert.equal(b.bad[j], 0, "nor next to it");
    assert.equal(b.near[first], 0);
    assert.ok(b.open.reduce((s, x) => s + x, 0) > 1, "a zero opens round itself");
    // Open every safe post: that is a win.
    let last = null;
    for (let i = 0; i < 70; i++) if (!b.bad[i] && !b.open[i]) last = C.open(b, i, seed) || last;
    assert.equal(b.won, true);
    assert.equal(last, "won");
  }
  const b = C.board(10, 7, 11);
  C.open(b, 0, 3);
  const bad = b.bad.indexOf(1);
  assert.equal(C.flagIt(b, bad), true);
  assert.equal(C.open(b, bad, 3), null, "a flagged post will not open");
  C.flagIt(b, bad);
  assert.equal(C.open(b, bad, 3), "spoiled");
  assert.equal(C.open(b, 1, 3), null, "nothing opens after a spoiler");
});

test("sweep: chording opens round a number whose flags are all down", () => {
  const C = Sweep.core;
  const b = C.board(10, 7, 11);
  C.open(b, 35, 11);
  const num = [...Array(70).keys()].find((i) => b.open[i] && b.near[i] > 0 && C.around(b, i).some((j) => !b.open[j] && !b.bad[j]));
  assert.ok(num !== undefined);
  assert.equal(C.chord(b, num, 11), null, "not until the flags are down");
  for (const j of C.around(b, num)) if (b.bad[j]) C.flagIt(b, j);
  const r = C.chord(b, num, 11);
  assert.ok(r === "open" || r === "won");
  for (const j of C.around(b, num)) if (!b.bad[j]) assert.equal(b.open[j], 1);
});

test("sweep: every forum grants its own facts", () => {
  for (const [id, spec] of of("sweep")) {
    const given = [spec.spoiled && spec.spoiled.grant, spec.cleared && spec.cleared.grant].filter(Boolean);
    assert.deepEqual(given.sort(), [...spec.grants].sort(), id);
    assert.ok(spec.spoilers < spec.cols * spec.rows - 9, id + " leaves room for a safe start");
  }
});

/* ── rhythm ─────────────────────────────────────────────── */
test("rhythm: the chart, judging a press, missing what goes by, and grading a section", () => {
  const C = Rhythm.core;
  const c = C.chart([{ bars: ["x...x..."] }, { bars: ["xx......"] }], 120, 1);
  assert.deepEqual(c.notes.map((n) => +n.t.toFixed(3)), [1, 2, 3, 3.25]);
  assert.deepEqual(c.notes.map((n) => n.sec), [0, 0, 1, 1]);
  assert.equal(C.press(c, 1.03, false), "perfect");
  assert.equal(C.press(c, 1.5, false), null, "a stray press costs nothing");
  assert.equal(C.press(c, 2.12, false), "good");
  assert.equal(C.grade(c, 0), 0.9);
  assert.equal(C.sweep(c, 3.1, false), 0, "not yet gone by");
  assert.equal(C.sweep(c, 3.5, false), 2, "both gone by");
  assert.equal(C.grade(c, 1), 0);
  const d = C.chart([{ bars: ["x......."] }], 120, 1);
  assert.equal(C.press(d, 1.1, false), "good");
  const e = C.chart([{ bars: ["x......."] }], 120, 1);
  assert.equal(C.press(e, 1.1, true), "perfect", "with less motion, wider windows");
  const f = C.chart([{ bars: ["x......."] }], 120, 1);
  assert.equal(C.press(f, 1.2, false), null);
  assert.equal(C.press(f, 1.2, true), "good");
});

test("rhythm: every song is written in bars of eight, grants its own facts, and says what each was", () => {
  for (const [id, spec] of of("rhythm")) {
    const given = spec.sections.filter((s) => s.grant).map((s) => s.grant);
    assert.deepEqual(given.sort(), [...spec.grants].sort(), id);
    for (const s of spec.sections) {
      for (const bar of s.bars) assert.match(bar, /^[x.]{8}$/, id + " bar " + bar);
      if (s.grant) assert.ok(s.say, id + " says what the section taught");
    }
    const c = Rhythm.core.chart(spec.sections, spec.bpm);
    assert.ok(c.end > 20 && c.end < 70, id + ": a song of a sensible length (" + c.end.toFixed(0) + "s)");
  }
});

/* ── picross ────────────────────────────────────────────── */
test("picross: clues from a picture, and checking a grid", () => {
  const C = Picross.core;
  const cl = C.clues(["##.#", "....", "####"]);
  assert.deepEqual(cl.rows, [[2, 1], [], [4]]);
  assert.deepEqual(cl.cols, [[1, 1], [1, 1], [1], [1, 1]]);
  assert.equal(C.solved(["#.", ".#"], [1, 0, 0, 1]), true);
  assert.equal(C.solved(["#.", ".#"], [1, 1, 0, 1]), false);
  assert.equal(C.layouts([2], 4).length, 3);
  assert.equal(C.layouts([1, 1], 4).length, 3);
  assert.deepEqual(C.layouts([], 3), [[0, 0, 0]]);
});

test("picross: every picture has one answer, found by lines alone, no guessing", () => {
  const C = Picross.core;
  const ambiguous = C.solve(C.clues(["#.", ".#"]));
  assert.equal(ambiguous.done, false, "the solver knows a picture it cannot finish");
  for (const [id, spec] of of("picross")) {
    for (const p of spec.puzzles) {
      const r = C.solve(C.clues(p.rows));
      assert.equal(r.done, true, id + " " + p.name + " solves by lines alone");
      assert.deepEqual(r.g.map((row) => row.map((v) => (v ? "#" : ".")).join("")), p.rows, id + " " + p.name + " solves to itself");
      if (p.grant) assert.ok(spec.grants.includes(p.grant) && p.say, id + " " + p.name + " grants its own fact and says what it was");
    }
  }
});
