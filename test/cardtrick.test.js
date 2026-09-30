"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../src/js/hustle/cardtrick.js");

const key = (c) => c.r + c.s;
const has = (list, c) => list.some((x) => T.same(x, c));

test("card trick: five courts, and four look-alikes back, none of them dealt", () => {
  for (let seed = 1; seed < 400; seed++) {
    const r = T.deal(seed);
    assert.equal(r.hand.length, 5);
    assert.equal(new Set(r.hand.map(key)).size, 5, "five different cards");
    for (const c of r.hand) assert.ok(!has(r.hand, T.twin(c)), "never a card and its look-alike together");
    assert.equal(r.shown.length, 4);
    for (const c of r.shown) {
      assert.ok(!has(r.hand, c), key(c) + " was not dealt: every card changed");
      assert.ok(has(r.hand, T.twin(c)), key(c) + " looks like one that was");
      assert.equal(T.red(c), T.red(T.twin(c)), "and is the same colour");
    }
    assert.ok(!has(r.shown, T.twin(r.hand[r.spare])), "the spare's look-alike stays out of it");
  }
});

test("card trick: whichever card you think of, it's gone", () => {
  const r = T.deal(7);
  for (const picked of r.hand) assert.ok(!has(r.shown, picked), key(picked));
});

test("card trick: one true claim, one lure, and applause", () => {
  for (let seed = 1; seed < 300; seed++) {
    const r = T.deal(seed);
    for (let picked = 0; picked < 5; picked++) {
      const cs = T.claims(r, picked);
      assert.deepEqual(cs.map((c) => c.kind).sort(), ["applause", "false", "true"]);
      const truth = cs.find((c) => c.kind === "true"), lure = cs.find((c) => c.kind === "false");
      assert.ok(has(r.hand, truth.card) && !T.same(truth.card, r.hand[picked]), "the true one names another card from the five");
      assert.ok(!has(r.hand, lure.card) && !has(r.shown, lure.card), "the lure was never on the table");
      assert.equal(T.judge(truth), "caught");
      assert.equal(T.judge(lure), "wrong");
      assert.equal(T.judge(cs.find((c) => c.kind === "applause")), "applause");
      assert.equal(cs[2].kind, "applause", "applause is always the last thing you can say");
    }
  }
});

test("card trick: every go deals differently, and a reload deals the same", () => {
  assert.deepEqual(T.deal(T.seedFor(42, 0)), T.deal(T.seedFor(42, 0)));
  const hands = new Set();
  for (let play = 0; play < 12; play++) hands.add(T.deal(T.seedFor(42, play)).hand.map(key).join(" "));
  assert.ok(hands.size >= 10, "twelve goes, " + hands.size + " different hands");
  const firsts = new Set([1, 2, 3, 4, 5, 6].map((s) => T.deal(T.seedFor(s, 0)).hand.map(key).join(" ")));
  assert.ok(firsts.size >= 5, "and runs start differently");
  assert.equal(T.name({ r: "K", s: "S" }), "the King of Spades");
});
