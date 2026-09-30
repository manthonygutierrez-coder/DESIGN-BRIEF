"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const HUSTLE = require("../src/js/hustle/content.js");
const Tutorial = require("../src/js/hustle/tutorial.js");
const Games = require("../src/js/hustle/games.js");

const gigs = Object.assign({}, HUSTLE.gigs, Tutorial.gigs);

test("games: every game sits on a real gig, plays on its client's site, and is set up in full", () => {
  assert.deepEqual(Games.problems(gigs), []);
  for (const [id, spec] of Object.entries(Games.GAMES)) {
    assert.ok(gigs[id], id);
    assert.ok(Games.ENGINES[spec.engine], id + " has an engine");
    assert.equal(Games.of(id), spec);
  }
  assert.equal(Games.of("no-such-gig"), null);
});

test("games: what a game can win is the gig's own facts and flavour, never a trend or the gap", () => {
  for (const [id, spec] of Object.entries(Games.GAMES)) {
    const gig = gigs[id], facts = new Set((gig.facts || []).map((f) => f.id));
    for (const w of Games.winnings(spec)) {
      assert.notEqual(w.kind, "trend", id + " grants no trends");
      if (w.kind === "fact" && w.id) assert.ok(facts.has(w.id), id + " grants its own fact " + w.id);
    }
  }
});

test("games: the checks catch a game that would give the research away", () => {
  const bad = {
    "otp-banner": { engine: "cards", id: "x1", site: "thebatonpass.net", title: "T", button: "B", blurb: "b", grants: ["nope"] },
    "tori-sign": { engine: "nope", id: "x2", site: "elsewhere.net", title: "T", button: "B", blurb: "b", grants: [],
      prize: { cards: [{ kind: "trend", label: "a trend", tags: ["gap-plain"] }] } },
  };
  const saved = Object.assign({}, Games.GAMES);
  try {
    Object.assign(Games.GAMES, bad);
    const p = Games.problems(gigs).join("\n");
    assert.match(p, /otp-banner: grants nope, which is not one of its facts/);
    assert.match(p, /tori-sign: unknown engine nope/);
    assert.match(p, /tori-sign: plays on elsewhere\.net, not the client's site/);
    assert.match(p, /tori-sign: grants a trend/);
    assert.match(p, /tori-sign: a prize card carries the gap/);
  } finally {
    for (const k of Object.keys(bad)) delete Games.GAMES[k];
    Object.assign(Games.GAMES, saved);
  }
});
