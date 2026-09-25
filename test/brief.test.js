"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/js/suite/doc.js");
const C = require("../src/js/suite/cards.js");
const A = require("../src/js/suite/apps.js");
const Score = require("../src/js/hustle/score.js");
const B = require("../src/js/hustle/brief.js");
const H = require("../src/js/hustle/content.js");

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const parentOf = (gig) => gig.after && H.gigs[gig.after.gig];
const everything = (gig) => [...gig.needs, ...gig.limits].map((x) => x.id);

// A document for the gig's own app, at its size, with something in it.
function workFor(gig) {
  const app = A.APPS[gig.app], size = B.sizeOf(gig);
  const doc = D.create({ mode: app.mode, w: size && size.w, h: size && size.h, name: gig.short });
  if (app.mode === "free") {
    // Half of every word need, so some steps are met and some are not.
    gig.needs.filter((n) => n.text).forEach((n, i) => {
      D.add(doc, D.layer("text", { text: n.text.slice(0, i % 2 ? 1 : n.text.length).join(" "), size: 40 + i }));
    });
    D.add(doc, D.layer("rect", { fill: "#FF7A1A" }));
    D.add(doc, D.layer("rect", { fill: "#1B2A4A" }));
  } else if (app.mode === "pixel") {
    D.setPx(doc, 1, 1, "#0A0A0A"); D.setPx(doc, 2, 1, "#3C8C3C");
  } else {
    D.addBlock(doc, { t: "notice", h: "Spoilers", p: "Episode 12 talk is tagged." });
    D.addBlock(doc, { t: "people", h: "The pair", items: [{ n: "Toma", r: "anchor", p: "" }] });
  }
  return doc;
}

test("brief: what each gig makes, and at what size", () => {
  for (const [id, gig] of Object.entries(H.gigs)) {
    assert.ok(B.deliverable(gig), id + " has a deliverable");
    const size = B.sizeOf(gig);
    const limit = gig.limits.find((l) => l.rule === "size");
    assert.deepEqual(size, limit ? { w: limit.w, h: limit.h } : null, id);
  }
  assert.equal(B.deliverable(H.gigs["weird-things-4"]), "Zine cover");
  assert.equal(B.deliverable({ app: "banner", limits: [{ rule: "size", w: 600, h: 850 }] }), "Poster", "falls back to the preset's name");
});

test("brief: nothing known, nothing given away", () => {
  for (const [id, gig] of Object.entries(H.gigs)) {
    const s = B.steps({ gig, parent: parentOf(gig), doc: workFor(gig), appId: gig.app, known: [] });
    for (const step of s.filter((x) => x.from !== "gap")) {
      assert.equal(step.state, "unknown", id + ": " + step.id);
      assert.equal(step.label, "???");
      assert.equal(step.control, null, id + ": an unknown need points at nothing");
    }
    const t = B.toolsFor(gig.app, gig, []);
    assert.deepEqual(t.tools, (A.APPS[gig.app].tools || []).filter((x) => (B.ALWAYS[gig.app] || []).includes(x)), id);
    assert.equal(t.ref, false, id + ": no reference board until it's asked for");
  }
});

test("brief: pen and shape builder come out once drawing them is known", () => {
  const gig = H.gigs["otp-banner"];
  assert.ok(!B.toolsFor("banner", gig, []).tools.includes("pen"));
  const t = B.toolsFor("banner", gig, ["onmodel"]);
  assert.ok(t.tools.includes("pen") && t.tools.includes("build") && t.ref);
  assert.deepEqual(t.more, ["image", "eyedrop"], "the rest waits in More tools");
  assert.deepEqual(B.toolsFor("banner", gig, [], ["gradient", "snap"]).bonus, ["gradient", "snap"], "earned extras stay available");
});

test("brief: pictures and finds are the player's call", () => {
  const calls = [];
  for (const gig of Object.values(H.gigs)) {
    for (const n of gig.needs) if (B.kindOf(n, gig, parentOf(gig)) === "call") calls.push(n.id);
  }
  assert.deepEqual(calls.sort(), ["crown", "doves", "duck", "dusk", "elder", "food", "terracotta", "vegas"]);

  // Using the right picture still earns no tick: it is judged on delivery.
  const gig = H.gigs["weird-things-4"];
  const duck = C.card("object", "Cut: duck", PNG, { tags: ["duck"] });
  const doc = D.create({ w: 550, h: 850 });
  C.applyToCanvas(doc, duck, { x: 100, y: 100 });
  const step = B.steps({ gig, doc, cards: [duck], appId: "banner", known: everything(gig) }).find((x) => x.id === "duck");
  assert.equal(step.state, "judged");
  assert.equal(step.wants, "picture");
  assert.equal(step.control, null, "never points at a card");
});

test("brief: every tick agrees with the scorer, line by line", () => {
  for (const [id, gig] of Object.entries(H.gigs)) {
    const doc = workFor(gig), cards = [];
    const steps = B.steps({ gig, parent: parentOf(gig), doc, cards, appId: gig.app, known: everything(gig) });
    const r = Score.score({ gig, doc, cards, appId: gig.app });
    assert.ok(r.ok, id);
    const needs = r.lines.filter((l) => l.kind === "need"), limits = r.lines.filter((l) => l.kind === "limit");
    gig.needs.forEach((n, i) => {
      const s = steps.find((x) => x.from === "need" && x.id === n.id);
      if (s.kind === "check") assert.equal(s.state === "met", needs[i].ok, id + ": need " + n.id);
      else assert.equal(s.state, "judged", id + ": need " + n.id);
    });
    gig.limits.forEach((l, i) => {
      const s = steps.find((x) => x.from === "limit" && x.id === l.id);
      assert.equal(s.state === "met", limits[i].ok, id + ": limit " + l.id);
    });
  }
});

test("brief: the details say what the scorer counts", () => {
  const gig = H.gigs["weird-things-4"];
  const doc = D.create({ w: 550, h: 850 });
  D.add(doc, D.layer("text", { text: "WEIRD THINGS", fill: "#0A0A0A", size: 60 }));
  D.add(doc, D.layer("rect", { fill: "#FF48B0" }));
  D.add(doc, D.layer("rect", { fill: "#0078BF" }));
  const steps = B.steps({ gig, doc, appId: "banner", known: everything(gig) });
  const colours = steps.find((s) => s.from === "limit" && gig.limits.find((l) => l.id === s.id).rule === "maxColours");
  assert.equal(colours.state, "open");
  assert.match(colours.detail, /^4 of 3 colours: the background counts$/);
  assert.equal(colours.control, "colours");
  const title = steps.find((s) => s.id === gig.needs.find((n) => n.text && n.text.includes("weird things")).id);
  assert.equal(title.state, "met");
});

test("brief: a file's name is checked as a file's name", () => {
  const gig = H.gigs["otp-banner"];
  const doc = D.create({ w: 728, h: 90, name: "tomakiyo" });
  D.add(doc, D.layer("rect", { fill: "#FF7A1A" }));
  const step = () => B.steps({ gig, doc, appId: "banner", known: everything(gig) }).find((s) => s.id === "filename");
  assert.equal(step().state, "open");
  assert.equal(step().control, "file");
  doc.meta.name = "banner.gif";
  assert.equal(step().state, "met");
});

test("brief: preflight lists what's open and never names a picture", () => {
  const gig = H.gigs["weird-things-4"];
  const doc = D.create({ w: 550, h: 850 });
  D.add(doc, D.layer("text", { text: "Weird Things", size: 60 }));
  const lines = B.preflight(B.steps({ gig, doc, appId: "banner", known: everything(gig) }), doc);
  assert.ok(lines.includes("There are no pictures in it yet"));
  assert.ok(!lines.some((l) => /duck/i.test(l)), "the reminder doesn't say which picture");
  assert.ok(lines.length > 1, "open steps are listed too");
});

test("brief: the tray shows this job's finds, then earlier work, then the rest", () => {
  const mine = C.card("fact", "x", "x", { gig: "dennis-poster" });
  const earlier = C.card("object", "Your wordmark", PNG, { source: { url: "", ref: "delivered:dennis-wordmark" } });
  const other = C.card("fact", "y", "y", { gig: "weird-things-4" });
  assert.deepEqual([other, earlier, mine].sort((a, b) => B.relevance(a, "dennis-poster", "dennis-wordmark") - B.relevance(b, "dennis-poster", "dennis-wordmark")), [mine, earlier, other]);
});
