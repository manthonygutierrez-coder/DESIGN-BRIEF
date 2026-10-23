"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/js/content/capsules.js");

const SEEDS = Array.from({ length: 400 }, (_, i) => i * 7919 + 13);

test("a seed always makes the same creature, words and picture", () => {
  for (const seed of [1, 42, 99991]) {
    assert.deepEqual(C.make(seed), C.make(seed));
    assert.equal(C.describe(C.make(seed)).text, C.describe(C.make(seed)).text);
    assert.deepEqual(C.sprite(C.make(seed)).px, C.sprite(C.make(seed)).px);
  }
});

test("neighbouring seeds do not start out alike", () => {
  const types = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => C.make(s).type));
  assert.ok(types.size >= 4, "eight seeds in a row give at least four elements, got " + [...types]);
  const names = new Set(SEEDS.map((s) => C.make(s).name));
  assert.ok(names.size > SEEDS.length * 0.5, "names vary");
});

test("the slip names every colour and every part the creature has", () => {
  for (const seed of SEEDS) {
    const s = C.make(seed), t = C.describe(s).text.toLowerCase();
    assert.ok(t.includes(s.colours.main), seed + ": main colour " + s.colours.main);
    if (s.colours.belly) assert.ok(t.includes(s.colours.belly + " underbelly"), seed + ": belly");
    assert.ok(t.includes(s.colours.eye), seed + ": eye colour");
    if (s.ears) assert.ok(/ears|frills|tufts/.test(t), seed + ": ears");
    if (s.crown) assert.ok({ flame: /flame/, horn: /horn/, horns: /horns/, crest: /crest/, sprout: /sprout|stem/, antennae: /antennae/, crystal: /crystal/ }[s.crown.kind].test(t), seed + ": crown " + s.crown.kind);
    if (s.wings) assert.ok(t.includes("wings"), seed + ": wings");
    if (s.back) assert.ok({ spikes: /spikes/, shell: /shell/, plates: /plates/, fin: /fin rises/ }[s.back.kind].test(t), seed + ": back " + s.back.kind);
    if (s.tail) assert.ok(/tail/.test(t), seed + ": tail");
    if (s.tail && s.tail.tip) assert.ok(/ending in|ends in/.test(t), seed + ": tail tip");
    if (s.pattern) assert.ok(t.includes(s.pattern.colour), seed + ": marking colour");
    assert.ok(t.includes({ 2: "two", 4: "four" }[s.legs.count] || "no legs"), seed + ": legs");
    assert.ok(!/undefined|null|NaN/.test(t), seed + ": no holes in the words: " + t);
  }
});

test("the slip only ever says one side, so either way round is right", () => {
  for (const seed of SEEDS) assert.ok(!/\b(left|right)\b/i.test(C.describe(C.make(seed)).text), String(seed));
});

test("the reference is a 48 by 48 bitmap in the colours the slip names", () => {
  for (const seed of SEEDS.slice(0, 120)) {
    const s = C.make(seed), sp = C.sprite(s);
    assert.equal(sp.w, 48); assert.equal(sp.h, 48); assert.equal(sp.px.length, 48 * 48);
    const used = new Set(sp.px.filter(Boolean));
    assert.ok(used.has(C.COLOURS[s.colours.main]), seed + ": main colour drawn");
    if (s.colours.belly && s.plan !== "quadruped") assert.ok(used.has(C.COLOURS[s.colours.belly]), seed + ": belly drawn");
    assert.ok(sp.px.every((v) => v === "" || /^#[0-9A-F]{6}$/.test(v)), seed + ": suite bitmap cells");
    const filled = sp.px.filter(Boolean).length;
    assert.ok(filled > 250 && filled < 1700, seed + ": a creature-sized silhouette, " + filled);
  }
});

test("what grows on top of the head shows above it", () => {
  const top = (sp) => { for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (sp.px[y * 48 + x]) return y; return 48; };
  for (const seed of SEEDS) {
    const s = C.make(seed);
    if (!s.crown || s.ears) continue;
    const bare = { ...s, crown: null };
    assert.ok(top(C.sprite(s)) < top(C.sprite(bare)), seed + ": " + s.crown.kind + " rises above the head");
  }
});

test("a drawing is scored on its silhouette and its colours", () => {
  const s = C.make(4242), ref = C.sprite(s);
  const same = C.compare(ref, s);
  assert.equal(same.silhouette, 100); assert.equal(same.colour, 100); assert.equal(same.overall, 100);

  const blank = C.compare({ w: 48, h: 48, px: new Array(48 * 48).fill("") }, s);
  assert.equal(blank.overall, 0);

  // drawn smaller, moved and mirrored: the same shape, so the silhouette still matches
  const small = { w: 64, h: 64, px: new Array(64 * 64).fill("") };
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (ref.px[y * 48 + x]) {
    small.px[(y + 10) * 64 + (47 - x) + 9] = ref.px[y * 48 + x];
  }
  assert.ok(C.compare(small, s).silhouette >= 95, "mirrored and shifted");

  // the right shape in the wrong colours scores on shape only
  const grey = { w: 48, h: 48, px: ref.px.map((v) => (v ? "#808080" : "")) };
  const g = C.compare(grey, s);
  assert.equal(g.silhouette, 100);
  assert.ok(g.colour < 80, "grey is not " + s.colours.main);
});

test("a creature is drawn from its words: reading a slip back gives the same picture", () => {
  for (const seed of SEEDS) {
    const s = C.make(seed), words = C.describe(s).text;
    assert.deepEqual(C.sprite(C.read(words)).px, C.sprite(s).px, seed + ": the words alone decide the art\n" + words);
  }
});

test("a page by id is the creature its own words describe", () => {
  const p = C.page("seed:4242");
  assert.equal(p.id, "seed:4242");
  assert.ok(p.text.startsWith(p.name + " is "), "the page is about " + p.name);
  assert.deepEqual(C.sprite(p.spec).px, C.sprite(C.make(4242)).px);
  assert.ok(p.behaviour.startsWith(p.name + " "), "and so is its behaviour line");
  assert.deepEqual(C.page("seed:4242"), C.page("seed:4242"));
});

test("the six toys have their own pages, and are drawn from them", () => {
  assert.equal(C.TOY_IDS.length, 6);
  for (const id of C.TOY_IDS) {
    const p = C.page(id);
    assert.ok(p.text.startsWith(p.name + " is "), id + " describes itself, not another creature");
    assert.ok(p.behaviour && p.behaviour.startsWith(p.name), id + " has a behaviour line about itself");
    assert.ok(C.sprite(p.spec).px.filter(Boolean).length > 250, id + " is drawn");
  }
  const t = C.page("toy:tidepup").spec;
  assert.equal(t.name, "Tidepup"); assert.equal(t.plan, "biped"); assert.equal(t.colours.main, "cerulean"); assert.equal(t.colours.belly, "white");
  assert.deepEqual(t.ears, { kind: "frills", inner: false }); assert.equal(t.colours.parts.ears, "pale aqua");
  assert.equal(t.crown.kind, "crest"); assert.equal(t.colours.parts.crown, "pale aqua");
  assert.equal(t.muzzle, "wide"); assert.equal(t.arms.kind, "mittens"); assert.equal(t.tail.kind, "fin"); assert.equal(t.head.shape, "wide");
  const e = C.page("toy:emberkit").spec;
  assert.equal(e.crown.kind, "flame"); assert.equal(e.tail.tip, "flame"); assert.equal(e.colours.parts.tip, "saffron"); assert.equal(e.arms.digits, 3);
  assert.equal(C.page("toy:gloombat").spec.plan, "floater");
  assert.equal(C.page("toy:voltbug").spec.wings.kind, "insect");
});

test("plain prose is read too", () => {
  const s = C.read("Blorbit is a large, four-legged creature with a stocky body covered in shaggy teal fur and a cream belly. Its head is broad, with narrow eyes that have gold irises and slit pupils. Two curved horns of ivory grow from its head. It has a pair of tusks. A row of five coral spikes runs down its back. Its long tail ends in a round coral bulb. Two thin navy stripes mark each cheek.");
  assert.equal(s.name, "Blorbit"); assert.equal(s.plan, "quadruped"); assert.equal(s.build, "stocky");
  assert.equal(s.colours.main, "teal"); assert.equal(s.colours.belly, "cream"); assert.equal(s.colours.eye, "gold");
  assert.deepEqual(s.eyes, { shape: "narrow", pupil: "slit" }); assert.equal(s.head.shape, "wide");
  assert.equal(s.crown.kind, "horns"); assert.equal(s.colours.parts.crown, "ivory"); assert.equal(s.muzzle, "tusks");
  assert.deepEqual(s.back, { kind: "spikes", count: 5 }); assert.equal(s.colours.parts.back, "coral");
  assert.deepEqual(s.tail, { kind: "long", tip: "ball" }); assert.equal(s.colours.parts.tip, "coral");
  assert.deepEqual([s.pattern.kind, s.pattern.where, s.pattern.colour], ["stripes", "cheeks", "navy"]);
});

test("a toy sleeps in its capsule: only its eyes change", () => {
  const s = C.page("toy:tidepup").spec, awake = C.sprite(s).px, asleep = C.sprite(s, { asleep: true }).px;
  const diff = awake.filter((v, i) => v !== asleep[i]).length;
  assert.ok(diff > 0 && diff < 40, "a few pixels round the eyes, " + diff);
});
