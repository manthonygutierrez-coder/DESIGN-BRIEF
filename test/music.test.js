"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/js/music/theme.js");
const Synth = require("../src/js/music/synth.js");

const ALL_TIERS = M.TIER_IDS.concat("pressure");

// Every note of every part, twice round the form.
function everyNote() {
  const out = [];
  for (const tier of ALL_TIERS) for (const p of M.partsOf(tier)) for (let bar = 0; bar < M.BARS * 2; bar++)
    for (const e of M.notes(tier, p.id, bar)) out.push({ at: tier + "." + p.id + " bar " + bar, e });
  return out;
}

test("every arrangement plays in one key over one form, so any bar line is a way across", () => {
  const all = everyNote();
  assert.ok(all.length > 3000, "checked " + all.length + " notes");
  for (const { at, e: [s, len, m, v] } of all) {
    assert.ok(Number.isInteger(s) && s >= 0 && s < M.STEPS, at + ": starts inside the bar");
    assert.ok(len > 0 && s + len <= M.STEPS, at + ": ends inside the bar");
    assert.ok(v > 0 && v <= 1, at + ": velocity " + v);
    if (m) assert.ok(M.inKey(m), at + ": " + m + " is not in D major");
  }
  assert.equal(M.FORM.length, M.BARS);
  assert.equal(M.MELODY.length, M.BARS);
  assert.ok(Math.abs(M.BAR_SEC - 2.5) < 1e-9, "a bar of 4/4 at 96 bpm is 2.5 seconds");
});

test("reputation fills the band in: an unknown gets a sparse version, a name gets all of it", () => {
  for (const tier of M.TIER_IDS) {
    const counts = [0, 0.25, 0.5, 0.75, 1].map((f) => Object.entries(M.mix({ zone: tier, fullness: f }).parts)
      .filter(([k, g]) => k.startsWith(tier + ".") && g > 0).length);
    for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], tier + " never loses a part as you get known");
    assert.ok(counts[0] >= 2, tier + " is never just one thing");
    assert.equal(counts[4], M.partsOf(tier).length, tier + " is the whole band at the top");
    assert.ok(counts[4] > counts[0], tier + " audibly grows");
  }
  assert.equal(M.fullnessFromRep(0), 0);
  assert.equal(M.fullnessFromRep(80), 1);
  assert.equal(M.fullnessFromRep(100), 1);
  assert.ok(M.fullnessFromRep(30) < M.fullnessFromRep(50));
});

test("the front window picks the arrangement; your camera is not a place", () => {
  const cases = { "w98 w98--web on": "hunt", "w98 w98--ticket": "hunt", "w98 w98--compare": "hunt",
    "w98 w98--suite": "studio", "w98 w98--re": "studio", "w98 w98--mail": "hub", "w98 w98--pager": "hub",
    "w98 w98--call": "hub", "w98 w98--cam": "hub", "w98": "hub", "": "hub", "w98 w98--camguide on": null };
  for (const [cls, zone] of Object.entries(cases)) assert.equal(M.zoneOf(cls), zone, JSON.stringify(cls));
  const m = M.mix({ zone: "hunt" });
  assert.deepEqual([m.tiers.hub, m.tiers.hunt, m.tiers.case, m.tiers.studio], [0, 1, 0, 0], "one arrangement at a time");
});

test("the web is the hunt for work, until a job is being researched: then it is the case", () => {
  const research = { research: true };
  for (const cls of ["w98 w98--web on", "w98 w98--ticket", "w98 w98--compare"]) {
    assert.equal(M.zoneOf(cls), "hunt", cls + " while looking for work");
    assert.equal(M.zoneOf(cls, research), "case", cls + " while researching");
  }
  assert.equal(M.zoneOf("w98 w98--suite", research), "studio", "making the work is still the studio");
  assert.equal(M.zoneOf("w98 w98--call", research), "hub");
  assert.equal(M.zoneOf("w98 w98--camguide", research), null);
  const m = M.mix({ zone: "case" });
  assert.deepEqual([m.tiers.hub, m.tiers.hunt, m.tiers.case, m.tiers.studio], [0, 0, 1, 0]);
});

test("the case leans minor over the same chords, and walks", () => {
  for (const [name, tri] of Object.entries(M.SHADE)) {
    assert.ok(M.CHORDS[name], name + " is a chord of the form");
    assert.ok(tri.every(M.inKey), name + "'s shade is in the key");
    const [a, b, c] = tri;
    assert.equal(b - a, 3, name + ": a minor third at the bottom (minor or diminished)");
    assert.ok(c - b === 4 || c - b === 3, name + ": then a major or minor third");
  }
  for (let bar = 0; bar < M.BARS; bar++) {
    assert.deepEqual(M.notes("case", "upright", bar).map(([s]) => s), [0, 4, 8, 12], "the bass walks in quarters, bar " + bar);
    assert.equal(M.notes("case", "upright", bar)[0][2], M.chordAt(bar).root, "and starts on the root");
    assert.ok(M.notes("case", "brush", bar).some(([s, , , v]) => s === 8 && v > 0.8), "the swish lands on three, bar " + bar);
  }
});

test("a deadline brings the clock in, and a job left late settles down", () => {
  const research = (left) => M.pressureOf({ stage: "research", left, total: 240 });
  const production = (used) => M.pressureOf({ stage: "production", used, deadline: 600 });
  assert.equal(research(240), 0);
  assert.equal(research(0), 1);
  assert.ok(research(60) > research(90), "tighter as it runs down");
  assert.equal(production(300), 0);
  assert.equal(production(600), 1);
  assert.equal(production(700), 1, "just late is still urgent");
  assert.equal(production(1200), 0.35, "long late is a low tick, not an emergency");
  for (const stage of ["contacted", "briefing", "delivered", "passed"]) assert.equal(M.pressureOf({ stage }), 0);
  let prev = -1;
  for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const parts = M.mix({ pressure: p }).parts, sum = M.PRESSURE.reduce((n, x) => n + parts["pressure." + x.id], 0);
    assert.ok(sum >= prev, "more pressure is never quieter");
    prev = sum;
  }
  assert.ok(M.PRESSURE.every((x) => M.mix({ pressure: 0 }).parts["pressure." + x.id] === 0), "no deadline, no clock");
  assert.ok(M.PRESSURE.every((x) => M.mix({ pressure: 1 }).parts["pressure." + x.id] > 0), "at the wire, all of it");
});

test("the hub is never quite the same twice round, but the same bar always is", () => {
  let differs = 0;
  for (let bar = 0; bar < M.BARS; bar++) {
    assert.deepEqual(M.notes("hub", "melody", bar), M.notes("hub", "melody", bar), "reproducible");
    const once = JSON.stringify([M.notes("hub", "keys", bar), M.notes("hub", "melody", bar)]);
    const again = JSON.stringify([M.notes("hub", "keys", bar + M.BARS), M.notes("hub", "melody", bar + M.BARS)]);
    if (once !== again) differs++;
  }
  assert.ok(differs >= 8, differs + " of 16 bars change the second time round");
});

test("sound effects land on the grid, soon after the click, in the key", () => {
  let checked = 0;
  for (let now = 3; now < 9; now += 0.0137) {
    const t0 = 1.234, at = M.sfxTime(now, t0), half = M.STEP_SEC / 2;
    assert.ok(at >= now - 1e-9 && at - now <= 0.09 + 1e-9, "soon: " + (at - now).toFixed(3) + "s");
    const k = (at - t0) / half;
    assert.ok(Math.abs(k - Math.round(k)) < 1e-6, "on the grid");
    checked++;
  }
  assert.ok(checked > 400);
  for (let bar = 0; bar < M.BARS; bar++) {
    for (const name of ["clip-hit", "clip-dupe", "clip-miss", "chime", "deliver"])
      for (const [, , m] of M.sfxNotes(name, bar, { combo: bar % 6, stars: 1 + (bar % 5) })) assert.ok(M.inKey(m), name + " " + m + " in bar " + bar);
    const first = (n) => M.sfxNotes("clip-hit", bar, { combo: n })[0][2];
    for (let n = 0; n < 7; n++) assert.ok(first(n + 1) > first(n), "a run of good clips climbs");
  }
  const run = (stars) => M.sfxNotes("deliver", 0, { stars });
  assert.ok(run(5).length > run(3).length && run(3).length > run(1).length, "more stars, more flourish");
  assert.deepEqual(M.sfxNotes("nonsense", 0), []);
});

test("every sound the score asks for is one the player can make", () => {
  const patches = new Set(Synth.NAMES);
  for (const tier of ALL_TIERS) for (const p of M.partsOf(tier)) assert.ok(patches.has(p.patch), tier + "." + p.id + " wants " + p.patch);
  for (const name of ["clip-hit", "clip-dupe", "clip-miss", "chime", "deliver"])
    for (const [, , , , patch] of M.sfxNotes(name, 0, { stars: 5 })) assert.ok(patches.has(patch), name + " wants " + patch);
});

test("every interface sound, the suite's included, is in key and playable", () => {
  const patches = new Set(Synth.NAMES);
  assert.ok(["tool", "layer", "drop", "drawer", "tuck", "grid"].every((n) => M.UI_SOUNDS.has(n)), "the suite's sounds can be switched off with the rest");
  for (const name of M.UI_SOUNDS) {
    assert.ok(M.sfxNotes(name, 0).length, name + " makes a sound");
    for (let bar = 0; bar < M.BARS; bar++) for (const [, , m, v, patch] of M.sfxNotes(name, bar)) {
      assert.ok(M.inKey(m), name + " " + m + " in bar " + bar);
      assert.ok(v <= 0.3, name + " is quiet");
      assert.ok(patches.has(patch), name + " wants " + patch);
    }
  }
});
