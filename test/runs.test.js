"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Runs = require("../src/js/hustle/runs.js");
const Mtg = require("../src/js/hustle/meeting.js");
const H = require("../src/js/hustle/content.js");

const GIGS = Object.entries(H.gigs).filter(([, g]) => g.dialogue);

test("runs: a seed is a run, the same every time; different seeds differ", () => {
  for (const [id, gig] of GIGS) {
    assert.deepEqual(Runs.roll(gig, 12345), Runs.roll(gig, 12345), id + ": same seed, same run");
    const seen = new Set();
    for (let s = 1; s <= 60; s++) { const r = Runs.roll(gig, s * 7919); seen.add(r.mood + "|" + r.order.join(",")); }
    assert.ok(seen.size > 10, id + ": sixty seeds give many different runs (" + seen.size + ")");
  }
});

test("runs: the canonical run is the gig exactly as written, and a view never changes the content", () => {
  const before = JSON.stringify(H.gigs);
  for (const [id, gig] of GIGS) {
    assert.equal(Runs.view(gig, Runs.canonical(gig)), gig, id + ": canonical is the gig itself");
    for (const run of Runs.every(gig)) Runs.view(gig, run);
    for (let s = 1; s < 20; s++) Runs.view(gig, Runs.roll(gig, s));
  }
  assert.equal(JSON.stringify(H.gigs), before, "no run wrote into the content");
});

test("runs: every day a client can have keeps the call winnable, and says what day it is", () => {
  for (const [id, gig] of GIGS) {
    for (const run of Runs.every(gig)) {
      const d = Runs.view(gig, run).dialogue;
      assert.ok(d.patience >= Runs.MIN_PATIENCE, id + " " + run.mood + ": at least " + Runs.MIN_PATIENCE + " pips");
      assert.ok((d.pause || 12000) >= Runs.MIN_PAUSE, id + " " + run.mood + ": a glass of at least six seconds");
      for (const g of d.given || []) {
        const o = gig.dialogue.options[g];
        assert.ok(o && !o.end, id + ": " + g + " is a real question, not the goodbye");
        assert.ok(!Object.values(gig.dialogue.challenges || {}).some((c) => c.after === g), id + ": nobody volunteers the answer a window hangs off");
        assert.ok((o.reveals || []).every((r) => gig.needs.some((n) => n.id === r) || gig.limits.some((l) => l.id === r)), id + ": what they volunteer is on the ticket");
      }
      if (run.mood) {
        assert.ok(Runs.dayLine(run, "Nell").startsWith("Nell "), id + ": " + run.mood + " has a line");
        assert.ok(Runs.dayTag(run), id + ": and a tag");
      }
    }
  }
});

test("runs: the questions come in the run's order, and closing the call stays last", () => {
  for (const [id, gig] of GIGS) {
    const base = Object.keys(gig.dialogue.options);
    for (let s = 1; s < 12; s++) {
      const keys = Object.keys(Runs.view(gig, Runs.roll(gig, s)).dialogue.options);
      assert.deepEqual(keys.slice().sort(), base.slice().sort(), id + ": the same questions");
      const ends = keys.filter((k) => gig.dialogue.options[k].end);
      assert.deepEqual(keys.slice(keys.length - ends.length), ends, id + ": the goodbye comes last");
    }
  }
});

test("runs: a rushed client's volunteered answer is on the ticket before you ask", () => {
  for (const [id, gig] of GIGS) {
    for (const run of Runs.every(gig).filter((r) => r.given.length)) {
      const v = Runs.view(gig, run), st = Mtg.start(v.dialogue);
      const g = run.given[0], o = gig.dialogue.options[g];
      assert.ok(st.used.includes(g), id + ": " + g + " is already asked");
      for (const r of o.reveals) assert.ok(st.revealed.includes(r), id + ": " + r + " is already known");
      assert.ok(!Mtg.available(v.dialogue, Object.assign({}, st, { speaking: 0 })).some((a) => a.id === g), id + ": and the question is gone");
      assert.ok(st.log.length > (gig.dialogue.opening || []).length, id + ": they said it");
    }
  }
});

test("runs: every day plays through to a proper ending", () => {
  for (const [id, gig] of GIGS) {
    for (const run of Runs.every(gig)) {
      const t = Runs.view(gig, run).dialogue;
      let st = Mtg.tick(t, Mtg.start(t), 60000);   // they finish speaking
      for (let i = 0; i < 40 && !st.ended; i++) {
        const opts = Mtg.available(t, st, []);
        if (!opts.length) { st = Mtg.tick(t, st, 60000); continue; }
        const pick = opts.find((o) => !o.end) || opts[0];
        st = Mtg.tick(t, Mtg.choose(t, st, pick.id, []), 60000);
      }
      assert.ok(st.ended, id + " " + (run.mood || "plain") + ": the call ends");
      assert.ok(["wrapped", "exhausted", "bored", "drifted"].includes(st.reason), id + ": ends for a reason (" + st.reason + ")");
    }
  }
});

test("meeting: a silence can cost more, and a caught window can win pips back", () => {
  const tree = { patience: 5, pause: 1000, opening: ["hi"], filler: ["..."],
    options: { a: { ask: "A?", reply: ["a"], reveals: [] }, b: { ask: "B?", reply: ["b"] } },
    challenges: { w: { after: "a", ask: "But your site says?", reply: ["oh"], cost: 0 } } };
  const quiet = (t) => Mtg.tick(t, Mtg.tick(t, Mtg.start(t), 60000), 5000);
  assert.equal(quiet(tree).patience, 4, "by default a silence costs one pip");
  assert.equal(quiet(Object.assign({}, tree, { silenceCost: 2 })).patience, 3, "a distracted client: two");
  const caught = (t) => {
    let st = Mtg.tick(t, Mtg.start(t), 60000);
    st = Mtg.tick(t, Mtg.choose(t, st, "a", []), 60000);
    return Mtg.choose(t, st, "w", []);
  };
  assert.equal(caught(tree).patience, 4, "by default a catch costs nothing and gives nothing");
  assert.equal(caught(Object.assign({}, tree, { catchBonus: 2 })).patience, 5, "a sceptical client warms to it, up to the full count");
});
