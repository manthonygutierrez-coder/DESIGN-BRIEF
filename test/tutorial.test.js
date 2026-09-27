"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../src/js/hustle/content.js");
const T = require("../src/js/hustle/tutorial.js");
const L = require("../src/js/hustle/lessons.js");
const Res = require("../src/js/hustle/research.js");
const Score = require("../src/js/hustle/score.js");
const Runs = require("../src/js/hustle/runs.js");
const Mtg = require("../src/js/hustle/meeting.js");
const Dlg = require("../src/js/hustle/dialogue.js");
const A = require("../src/js/suite/apps.js");
const C = require("../src/js/suite/cards.js");
const D = require("../src/js/suite/doc.js");

const CHAIN = ["tori-sign", "tori-menu", "tori-mark", "tori-sticker", "tori-icon", "tori-site"];
const gigs = CHAIN.map((id) => [id, H.gigs[id]]);
const PNG = "data:image/png;base64,iVBORw0KGgo=";

// A site's pages as the passages a player could clip.
const passages = (site) => {
  const out = [];
  const walk = (v) => { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  Object.values(site.site.pages).forEach(walk);
  return out;
};

test("tutorial: Tori's six jobs are in the game, in order, each after the last", () => {
  assert.deepEqual(Object.keys(T.gigs), CHAIN);
  gigs.forEach(([id, g], i) => {
    assert.ok(g, id + " is registered");
    assert.equal(g.lesson.n, i + 1, id + " is lesson " + (i + 1));
    assert.equal(g.lesson.of, CHAIN.length);
    assert.equal(g.poster.handle, "tori_l");
    if (i === 0) { assert.equal(g.kind, "listing"); assert.equal(g.minRep, 0, "anyone can take the first one"); assert.ok(!g.brief, "the first job is a call"); }
    else { assert.equal(g.kind, "chain"); assert.equal(g.after.gig, CHAIN[i - 1]); assert.ok(g.after.minStars <= 2, "a lesson forgives"); assert.equal(g.brief, "pager"); }
  });
  assert.ok(H.people.tori_l && H.sites["torisladle.com"], "Tori and her site");
  assert.ok(H.index.some((e) => e.dom === "torisladle.com"), "the crawler knows her");
  const modes = new Set(gigs.map(([, g]) => A.modeOf(g.app)));
  assert.deepEqual([...modes].sort(), ["layout", "pixel", "vector"], "the chain goes through every mode");
});

test("tutorial: each job builds on one before it", () => {
  const outputs = new Map(gigs.filter(([, g]) => g.output).map(([id, g]) => [g.output.tags[0], id]));
  for (const [id, g] of gigs.slice(1)) {
    if (id === "tori-mark") continue;       // the mark starts from the brand, not a picture
    const uses = g.needs.flatMap((n) => n.tags || []).filter((t) => outputs.has(t));
    assert.ok(uses.length, id + " uses an earlier delivery");
    for (const t of uses) assert.ok(CHAIN.indexOf(outputs.get(t)) < CHAIN.indexOf(id), id + ": " + t + " comes first");
  }
});

test("tutorial: every fact, trend and window is really there, and the gap can be proved", () => {
  for (const [id, gig] of gigs) {
    for (const f of gig.facts) assert.ok(passages(H.sites[f.where]).some((p) => Res.matches(f, p)), id + ": fact " + f.id + " is on " + f.where);
    for (const dom of gig.competitors) {
      assert.ok(H.sites[dom], id + ": rival " + dom);
      for (const tr of Res.relevantTrends(gig, H.sites, dom)) assert.ok(passages(H.sites[dom]).some((p) => Res.matches(tr, p)), id + ": trend " + tr.id + " is on " + dom);
    }
    for (const f of gig.features) for (const [dom, tid] of Object.entries(f.doneBy || {})) assert.ok(H.sites[dom].trends.some((t) => t.id === tid), id + ": " + f.id + " points at a real trend");
    assert.equal(gig.features.filter((f) => f.gap).length, 1, id + " has one gap");
    const windows = Object.entries(gig.dialogue.challenges || {});
    for (const [wid, w] of windows) {
      assert.ok(gig.dialogue.options[w.after], id + ": window " + wid + " opens after a real question");
      assert.ok(gig.facts.some((f) => f.id === w.needsFact), id + ": window " + wid + " needs a real fact");
    }
    const revealable = new Set([...Object.values(gig.dialogue.options), ...windows.map(([, w]) => w)].flatMap((o) => o.reveals || []));
    for (const r of revealable) assert.ok(gig.needs.some((n) => n.id === r) || gig.limits.some((l) => l.id === r), id + ": reveal " + r);
    for (const n of gig.needs.concat(gig.limits)) assert.ok(revealable.has(n.id) || n.id === "size", id + ": " + n.id + " can be asked about");
    let found = Res.emptyFound();
    for (const dom of gig.competitors) for (const tr of Res.relevantTrends(gig, H.sites, dom)) {
      const text = passages(H.sites[dom]).find((p) => Res.matches(tr, p));
      for (let i = 0; i < 4; i++) found = Res.record(found, Res.clip(gig, H.sites, dom, text, found));
    }
    assert.equal(Res.proven(gig, H.sites, found), gig.features.find((f) => f.gap).id, id + ": gap is provable");
  }
});

test("tutorial: every need can be met with what the job hands you, in the app it asks for", () => {
  const hues = new Set();
  for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
    C.colourTags("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()).forEach((t) => hues.add(t));
  }
  for (const [id, gig] of gigs) {
    const parent = gig.after && H.gigs[gig.after.gig];
    const earlier = CHAIN.slice(0, CHAIN.indexOf(id)).flatMap((k) => (H.gigs[k].output ? H.gigs[k].output.tags : []));
    const reach = new Set([...hues, ...gig.facts.flatMap((f) => f.tags), ...gig.refs.flatMap((r) => r.tags), ...earlier, ...((parent && parent.output && parent.output.tags) || [])]);
    const app = A.APPS[gig.app];
    assert.ok(A.forDiscipline(gig.discipline).includes(gig.app), id + ": " + gig.app + " is an app for " + gig.discipline);
    const canType = app.mode === "layout" || app.tools.includes("text");
    for (const n of gig.needs) {
      for (const any of [...(n.tags ? [n.tags] : []), ...(n.all || []).map((t) => [t])]) assert.ok(any.some((t) => reach.has(t)), id + ": " + n.id + " can be met");
      if (n.text) {
        assert.ok(canType, id + ": " + n.id + " asks for words in an app without text");
        assert.ok(!n.text.every((s) => gig.short.toLowerCase().includes(s.toLowerCase())), id + ": " + n.id + " is not met by the document's own name");
      }
    }
    for (const l of gig.limits.filter((x) => x.rule === "size")) assert.ok(app.presets.some(([, w, h]) => w === l.w && h === l.h), id + ": " + l.w + "×" + l.h + " is a preset");
  }
});

test("tutorial: every day Tori can have is a call that can be won", () => {
  for (const [id, gig] of gigs) {
    for (const run of Runs.every(gig)) {
      const t = Runs.view(gig, run).dialogue;
      let st = Mtg.tick(t, Mtg.start(t), 60000);
      for (let i = 0; i < 40 && !st.ended; i++) {
        const opts = Mtg.available(t, st, []);
        if (!opts.length) { st = Mtg.tick(t, st, 60000); continue; }
        st = Mtg.tick(t, Mtg.choose(t, st, (opts.find((o) => !o.end) || opts[0]).id, []), 60000);
      }
      assert.ok(st.ended, id + " " + (run.mood || "plain") + ": the call ends");
    }
    // A brief by Pager tells you everything.
    const pre = Dlg.premade(gig.dialogue, gig.needs.map((n) => n.id).concat(gig.limits.map((l) => l.id)));
    for (const n of gig.needs.concat(gig.limits)) assert.ok(pre.revealed.includes(n.id), id + ": the Pager brief says " + n.id);
  }
});

test("tutorial: every lesson points at real controls and knows when each step is done", () => {
  for (const [id, gig] of gigs) {
    assert.deepEqual(L.problems(gig.teach), [], id);
    assert.ok(gig.teach.filter((s) => s.check).length >= 3, id + " teaches at least three things");
    const blank = D.create({ mode: gig.app === "pixel" ? "pixel" : gig.app === "layout" ? "layout" : "free", w: 100, h: 100 });
    assert.equal(L.current(gig.teach, { doc: blank, cards: [] }), gig.teach.find((s) => s.check), id + ": a blank page starts at the first step");
  }
  assert.ok(L.problems([{ id: "x", say: "Hi", with: ["tool:laser"], check: { layer: "rect" } }]).length, "a made-up tool is caught");
  assert.ok(L.problems([{ id: "x", say: "Hi", with: ["tool:rect"], check: { vibes: true } }]).length, "and a made-up check");
});

/* The model answer to each job: what a player following the lesson would
 * make. It has to meet Tori's brief, and tick every step of the lesson. */
function modelAnswer(id, gig, cards) {
  const card = (tag) => cards.find((c) => (c.tags || []).includes(tag));
  const gap = C.card("gap", gig.gap.label, gig.gap.line, { tags: [gig.gap.tag, "gap"] });
  cards.push(gap);
  if (gig.app === "pixel") {
    const doc = D.create({ mode: "pixel", w: 32, h: 32, name: "tori icon" });
    for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) D.setPx(doc, x, y, x === 6 || x === 25 || y === 6 || y === 25 ? "#3A2418" : y < 12 ? "#F6EAD2" : "#D9482B");
    doc.meta.intent.push(card("tori-mark").id, gap.id);
    doc.palette = ["#D9482B", "#3A2418", "#F6EAD2"];
    return doc;
  }
  if (gig.app === "layout") {
    const doc = D.create({ mode: "layout", name: "Tori's Ladle" });
    D.addBlock(doc, A.BLOCKS.lede.make());
    doc.blocks[0].p = "One soup a day, Saturdays, Row C at the Millbrook market.";
    D.addBlock(doc, A.BLOCKS.faq.make());
    D.addBlock(doc, A.BLOCKS.plate.make());
    C.applyToBlock(doc, 2, card("tori-sticker"));
    C.applyToCanvas(doc, gap);
    doc.site = D.site(Object.assign({}, doc.site, { brand: "#D9482B" }));
    return doc;
  }
  const size = gig.limits.find((l) => l.rule === "size");
  const doc = D.create({ mode: "free", w: size.w, h: size.h, name: gig.short.toLowerCase() });
  const add = (type, p) => D.add(doc, D.layer(type, p));
  const say = (text, y, size = 40) => add("text", { text, x: 40, y, size, font: "Georgia", fill: "#D9482B" });
  if (id === "tori-sign") {
    doc.bg = "#F6EAD2";
    add("rect", { x: 20, y: 20, w: 1160, h: 360, radius: 24, fill: "#D9482B" });
    add("ellipse", { x: 1080, y: 40, w: 60, h: 60, fill: "#5E8C3A" });
    add("text", { text: "TORI'S LADLE", x: 60, y: 60, size: 120, font: "Georgia", fill: "#F6EAD2" });
    add("text", { text: "SOUP", x: 60, y: 220, size: 60, font: "Georgia", fill: "#F6EAD2" });
    add("text", { text: "SATURDAYS", x: 400, y: 220, size: 60, font: "Georgia", fill: "#F6EAD2" });
  }
  if (id === "tori-menu") {
    doc.bg = "#F6EAD2";
    doc.guides = { v: [40, 300], h: [200, 400] };
    C.applyToCanvas(doc, card("tori-sign"), { x: 300, y: 80 });
    ["Tomato", "Leek", "Pumpkin", "Minestrone", "Pea", "Mushroom"].forEach((s, i) => say(s, 220 + i * 70, 32));
    say("TODAY:", 680, 36);
    say("Parsnip picks", 760, 24);
  }
  if (id === "tori-mark") {
    doc.bg = "#F6EAD2";
    add("path", { d: "M0 0H64V32H0Z", box: 64, x: 150, y: 400, w: 500, h: 250, fill: "#D9482B" });
    add("ellipse", { x: 300, y: 150, w: 60, h: 60, fill: "#5E8C3A", mirror: { v: 400, h: null }, locked: true });
  }
  if (id === "tori-sticker") {
    doc.bg = "#F6EAD2";
    C.applyToCanvas(doc, card("tori-mark"), { x: 400, y: 400 });
    say("TORI'S LADLE", 60, 56).bend = 60;
    const curve = add("path", { d: "M0 0C21 64 43 64 64 0", box: 64, x: 150, y: 600, w: 500, h: 120, fill: null, stroke: "#D9482B", strokeW: 2 });
    add("text", { text: "MADE THIS MORNING", size: 36, font: "Georgia", fill: "#D9482B", on: curve.id });
  }
  C.applyToCanvas(doc, gap);
  return doc;
}

test("tutorial: a model answer to each job meets Tori's brief and finishes its lesson", () => {
  const cards = [];
  for (const [id, gig] of gigs) {
    const doc = modelAnswer(id, gig, cards);
    const r = Score.score({ gig, doc, cards, appId: gig.app, lateSeconds: 0 });
    assert.ok(r.ok, id + ": " + r.reason);
    const missed = r.lines.filter((l) => !l.ok).map((l) => l.text);
    assert.deepEqual(missed, [], id + " misses nothing");
    assert.equal(r.stars, 5, id + " gets five stars");
    const left = L.progress(gig.teach, { doc, cards }).filter((s) => !s.tip && !s.done).map((s) => s.id);
    assert.deepEqual(left, [], id + ": every step of the lesson is ticked");
    // What was delivered comes back as the next job's card.
    if (gig.output) cards.push(C.card("object", gig.output.label, PNG, { tags: gig.output.tags, source: { url: "", ref: "delivered:" + id } }));
  }
});
