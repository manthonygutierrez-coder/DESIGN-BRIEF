"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Micro = require("../src/js/games/micro.js");
const Games = require("../src/js/hustle/games.js");
const HUSTLE = require("../src/js/hustle/content.js");
const Tutorial = require("../src/js/hustle/tutorial.js");

const { MECH, speedAt, fuseOf, order, rng, LIVES, EVERY } = Micro.core;
const W = Micro.W;
const gigs = Object.assign({}, HUSTLE.gigs, Tutorial.gigs);
const runs = Object.entries(Games.GAMES).filter(([, s]) => s.engine === "micro");

// One game, played by `policy` a frame at a time: "win" or "lose".
function play(g, policy, { speed = 1, still = false, seed = 1 } = {}) {
  const m = { g, t: 0, T: fuseOf(g, speed, still), speed, still, r: rng(seed) };
  m.s = MECH[g.kind].start(m);
  const dt = 1 / 60;
  for (let f = 0; f < 60 * 20; f++) {
    m.t += dt;
    const input = Object.assign({ left: false, right: false, up: false, down: false, press: false, px: null }, policy(m, f));
    const r = MECH[g.kind].step(m, dt, input) || (m.t >= m.T ? (["balance", "dodge"].includes(g.kind) ? "win" : "lose") : null);
    if (r) return r;
  }
  return "never ends";
}
const idle = () => ({});
// How someone who can play would play each kind.
const SKILL = {
  mash: (m, f) => ({ press: f % 4 === 0 }),
  timing: (m) => { const [a, b] = Micro.core.widen(m.s.zone, m.still); return { press: m.s.x > a + (b - a) * 0.3 && m.s.x < b - (b - a) * 0.3 }; },
  catch: (m) => {
    const good = m.s.items.filter((o) => !o.done && o.good).sort((a, b) => b.y - a.y)[0];
    const bad = m.s.items.find((o) => !o.done && !o.good && o.y > 60 && Math.abs(o.x - m.s.x) < 14);
    if (bad && (!good || good.y < bad.y)) return { px: bad.x < m.s.x ? m.s.x + 30 : m.s.x - 30 };
    return good ? { px: good.x } : {};
  },
  pick: (m) => { const k = m.s.perm.indexOf(m.g.answer || 0); return m.t > 0.4 ? { press: true, px: k * (W / m.s.perm.length) + 2 } : {}; },
  balance: (m) => ({ left: m.s.a + m.s.v * 0.3 > 0, right: m.s.a + m.s.v * 0.3 < 0 }),
  dodge: (m) => {
    const near = m.s.items.filter((o) => !o.done && o.y > 40 && o.y < 92 && Math.abs(o.x - m.s.x) < 16).sort((a, b) => b.y - a.y)[0];
    if (!near) return {};
    const away = near.x < m.s.x ? 1 : -1, room = away > 0 ? W - 10 - m.s.x : m.s.x - 10;
    return room > 14 ? (away > 0 ? { right: true } : { left: true }) : (away > 0 ? { left: true } : { right: true });
  },
  drop: (m) => {
    if (m.s.fall) return {};
    const tfall = Math.sqrt((2 * (78 - 24)) / 260), v = 34 * m.speed;
    let bx = m.s.bx, bd = m.s.bd, t = tfall;
    while (t > 0) { const step = Math.min(t, 0.01); bx += bd * v * step; if (bx < 24 || bx > W - 24) bd *= -1; t -= step; }
    return { press: Math.abs(m.s.hx - bx) < 3 };
  },
};

test("micro: the run speeds up every few clears, up to a top speed, and never with less motion", () => {
  assert.equal(speedAt(0), 1);
  assert.equal(speedAt(EVERY - 1), 1);
  assert.ok(speedAt(EVERY) > 1);
  assert.equal(speedAt(1000), speedAt(2000), "there is a top speed");
  assert.equal(speedAt(1000, true), 1, "less motion: never faster");
  const g = { kind: "mash" };
  assert.ok(fuseOf(g, 1, true) > fuseOf(g, 1, false), "less motion: longer fuses");
  assert.ok(fuseOf(g, 1.6) < fuseOf(g, 1), "faster: shorter fuses");
  assert.equal(LIVES, 4);
});

test("micro: the order puts what still holds research first, and never the same game twice running", () => {
  const games = [{ kind: "mash" }, { kind: "catch", grant: "a" }, { kind: "pick" }, { kind: "drop", grant: "b" }];
  const o = order(games, 24, 5, (x) => !!x.grant);
  assert.equal(o.length, 24);
  assert.deepEqual(new Set(o.slice(0, 2).map((i) => games[i].grant)), new Set(["a", "b"]), "the research comes first");
  for (let i = 1; i < o.length; i++) assert.notEqual(o[i], o[i - 1], "no repeats in a row");
  assert.deepEqual(order(games, 12, 5), order(games, 12, 5), "the same seed, the same run");
});

test("micro: every game in every run can be won by someone who can play, and is lost by doing nothing", () => {
  assert.ok(runs.length >= 3);
  for (const [id, spec] of runs) for (const g of spec.games) {
    assert.ok(MECH[g.kind], id + ": a " + g.kind + " game");
    let wins = 0;
    for (let seed = 1; seed <= 12; seed++) if (play(g, SKILL[g.kind], { seed }) === "win") wins++;
    assert.ok(wins >= 10, id + " " + g.cmd + ": won " + wins + " of 12 with skill");
    if (!["balance", "dodge"].includes(g.kind)) assert.equal(play(g, idle), "lose", id + " " + g.cmd + ": doing nothing loses");
    // Faster, and with less motion, it can still be won.
    assert.equal(play(g, SKILL[g.kind], { speed: 1.9, seed: 3 }) === "win" || g.kind === "catch" || g.kind === "dodge", true, id + " " + g.cmd + " at top speed");
    assert.equal(play(g, SKILL[g.kind], { still: true, seed: 4 }), "win", id + " " + g.cmd + " with less motion");
  }
});

test("micro: a balance game is lost by leaning the wrong way, a pick by picking wrong", () => {
  const bal = { kind: "balance" };
  assert.equal(play(bal, (m) => ({ left: m.s.a < 0, right: m.s.a > 0 })), "lose");
  const pick = { kind: "pick", answer: 0, options: [{ text: "A" }, { text: "B" }, { text: "C" }] };
  assert.equal(play(pick, (m) => { const k = m.s.perm.indexOf(1); return { press: true, px: k * (W / 3) + 2 }; }), "lose");
});

test("micro: every run grants its own facts, each from one game, and says what was learned", () => {
  for (const [id, spec] of runs) {
    const facts = new Set((gigs[id].facts || []).map((f) => f.id));
    const given = spec.games.filter((g) => g.grant).map((g) => g.grant);
    assert.deepEqual([...given].sort(), [...spec.grants].sort(), id + ": every grant comes from exactly one game");
    for (const g of spec.games) {
      if (g.grant) { assert.ok(facts.has(g.grant), id + " grants its own " + g.grant); assert.ok(g.say, id + " " + g.cmd + " says what you learned"); }
      if (g.kind === "pick") assert.ok(g.answer >= 0 && g.answer < g.options.length, id + " " + g.cmd + ": the answer is one of the options");
      assert.ok(g.cmd && g.cmd.length <= 16, id + ": a short word to act on");
    }
    assert.ok(spec.grants.length <= 3, id + " keeps most of its research on the pages");
    assert.ok(spec.intro && spec.name && spec.scene, id + " is set up");
  }
});
