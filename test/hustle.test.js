"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const D = require("../src/js/suite/doc.js");
const C = require("../src/js/suite/cards.js");
const Dlg = require("../src/js/hustle/dialogue.js");
const Res = require("../src/js/hustle/research.js");
const Score = require("../src/js/hustle/score.js");

const TREE = {
  patience: 4,
  opening: ["hi"],
  options: {
    ship: { ask: "Who?", reply: ["Toma and Kiyoshi"], reveals: ["names"] },
    vibe: { ask: "Vibe?", reply: ["ep 12"], reveals: ["mood"] },
    ep12: { ask: "What happens in 12?", reply: ["the relay"], requires: ["vibe"], reveals: ["handoff"] },
    money: { ask: "More money?", reply: ["no"], cost: 3 },
    done: { ask: "Thanks!", reply: ["yay"], end: true, cost: 0 },
  },
  leave: ["gtg"],
};

test("dialogue: follow-ups, reveals, patience, endings", () => {
  let st = Dlg.start(TREE);
  assert.deepEqual(Dlg.available(TREE, st).map((o) => o.id).sort(), ["done", "money", "ship", "vibe"]);
  st = Dlg.choose(TREE, st, "vibe");
  assert.ok(Dlg.available(TREE, st).some((o) => o.id === "ep12"), "follow-up unlocked");
  const same = Dlg.choose(TREE, st, "vibe");
  assert.equal(same, st, "one-shot options cannot repeat");
  st = Dlg.choose(TREE, st, "money");
  assert.equal(st.ended, true);
  assert.equal(st.reason, "bored");
  assert.equal(st.log[st.log.length - 1].text, "gtg");
  assert.deepEqual(st.revealed, ["mood"]);

  let ok = Dlg.start(TREE);
  ok = Dlg.choose(TREE, Dlg.choose(TREE, ok, "ship"), "done");
  assert.equal(ok.reason, "wrapped");
  assert.deepEqual(ok.revealed, ["names"]);
});

const SITES = {
  "rival-a.net": { trends: [{ id: "a1", match: ["episode", "screenshots"] }, { id: "a2", match: ["shipping", "fic"] }] },
  "rival-b.net": { trends: [{ id: "b1", match: ["episode", "screenshots"] }] },
};
const GIG = {
  id: "g",
  facts: [{ id: "sweatband", match: ["orange", "sweatband"], where: "client.net", tags: ["orange-lore"] }],
  competitors: ["rival-a.net", "rival-b.net"],
  features: [
    { id: "shots", label: "Episode screenshots", doneBy: { "rival-a.net": "a1", "rival-b.net": "b1" } },
    { id: "fic", label: "Fan fiction", doneBy: { "rival-a.net": "a2" } },
    { id: "handoff", label: "The hand-off", gap: true },
  ],
};

test("research: clipping facts and trends, and proving the gap", () => {
  let found = Res.emptyFound();
  assert.equal(Res.clip(GIG, SITES, "client.net", "Toma's ORANGE sweatband, obviously", found).kind, "fact");
  assert.equal(Res.clip(GIG, SITES, "rival-a.net", "Toma's orange sweatband", found), null, "facts only count where they live");
  found = Res.record(found, Res.clip(GIG, SITES, "client.net", "orange sweatband", found));
  assert.equal(Res.clip(GIG, SITES, "client.net", "orange sweatband", found).kind, "dupe");

  assert.equal(Res.proven(GIG, SITES, found), null);
  for (const [dom, text] of [["rival-a.net", "Episode 1 screenshots"], ["rival-a.net", "shipping fic archive"], ["rival-b.net", "all the episode screenshots"]]) {
    found = Res.record(found, Res.clip(GIG, SITES, dom, text, found));
  }
  const b = Res.board(GIG, SITES, found);
  assert.deepEqual(b.rows.map((r) => r.cells), [["yes", "yes"], ["yes", "no"], ["no", "no"]]);
  assert.equal(Res.proven(GIG, SITES, found), "handoff");
  assert.equal(Res.guess(GIG, "fic"), false);
  assert.equal(Res.guess(GIG, "handoff"), true);
});

test("score: needs, limits, gap and lateness, line by line", () => {
  const gig = {
    needs: [
      { id: "names", label: "Both of them are on it", text: ["Toma", "Kiyoshi"], weight: 3 },
      { id: "colours", label: "Their colours", all: ["orange", "navy"], weight: 2 },
      { id: "mood", label: "Episode 12 at dusk", tags: ["dusk"], weight: 2 },
    ],
    limits: [{ rule: "size", w: 728, h: 90, label: "728 × 90" }, { rule: "maxColours", value: 4, label: "Four colours at most" }],
    gap: { tag: "gap-handoff", label: "The hand-off" },
  };
  const gapCard = C.card("gap", "The hand-off", "Nobody shows the baton changing hands", { tags: ["gap-handoff"] });
  const doc = D.create({ w: 728, h: 90 });
  D.add(doc, D.layer("rect", { fill: "#FF7A1A" }));
  D.add(doc, D.layer("rect", { fill: "#1B2A4A" }));
  D.add(doc, D.layer("text", { text: "TOMA × KIYOSHI", fill: "#FFFFFF" }));
  C.applyToCanvas(doc, gapCard);

  const r = Score.score({ gig, doc, cards: [gapCard], appId: "banner" });
  assert.ok(r.ok);
  const byKind = (k) => r.lines.filter((l) => l.kind === k);
  assert.deepEqual(byKind("need").map((l) => l.ok), [true, true, false]);
  assert.deepEqual(byKind("limit").map((l) => l.ok), [true, true]);
  assert.equal(byKind("gap")[0].ok, true);
  assert.equal(r.total, 30 + 20 + 20 + 10);
  assert.equal(r.stars, 4);
  assert.equal(r.rep, 5 + 2);

  const late = Score.score({ gig, doc, cards: [gapCard], appId: "banner", lateSeconds: 61 });
  assert.equal(late.total, 70);

  assert.equal(Score.score({ gig, doc: D.create(), cards: [] }).ok, false, "empty work cannot be delivered");
  assert.equal(Score.tier(0), "Unknown");
  assert.equal(Score.tier(31), "Sought after");
});

test("score: layout needs read blocks and card tags", () => {
  const banner = C.card("object", "Your banner", "data:image/png;base64,iVBORw0KGgo=", { tags: ["otp-banner"] });
  const doc = D.create({ mode: "layout", name: "The Baton Pass" });
  D.addBlock(doc, { t: "plate", q: "", cap: "" });
  D.addBlock(doc, { t: "notice", h: "Spoilers", p: "Episode 12 talk is tagged." });
  C.applyToBlock(doc, 0, banner);
  const gig = {
    needs: [
      { label: "Banner on the page", tags: ["otp-banner"] },
      { label: "Spoiler notice", blocks: ["notice"], text: ["spoiler"] },
      { label: "Member stats", blocks: ["stats"] },
    ],
    limits: [{ rule: "maxBlocks", value: 6, label: "Six blocks at most" }],
  };
  const r = Score.score({ gig, doc, cards: [banner], appId: "layout" });
  assert.deepEqual(r.lines.filter((l) => l.kind === "need").map((l) => l.ok), [true, true, false]);
});

test("content: every research match is really on its page", () => {
  const H = require("../src/js/hustle/content.js");
  // Flatten a site's pages into the passages a player could clip.
  const passages = (site) => {
    const out = [];
    const walk = (v) => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    Object.values(site.site.pages).forEach(walk);
    return out;
  };
  for (const [id, gig] of Object.entries(H.gigs)) {
    for (const f of gig.facts || []) {
      assert.ok(passages(H.sites[f.where]).some((p) => Res.matches(f, p)), id + ": fact " + f.id + " is on " + f.where);
    }
    for (const dom of gig.competitors || []) {
      assert.ok(H.sites[dom], id + ": rival " + dom + " exists");
      for (const tr of Res.relevantTrends(gig, H.sites, dom)) {
        assert.ok(passages(H.sites[dom]).some((p) => Res.matches(tr, p)), id + ": trend " + tr.id + " is on " + dom);
      }
    }
    for (const f of gig.features || []) {
      for (const [dom, tid] of Object.entries(f.doneBy || {})) {
        assert.ok(H.sites[dom].trends.some((t) => t.id === tid), id + ": feature " + f.id + " points at a real trend");
      }
    }
    assert.equal((gig.features || []).filter((f) => f.gap).length, gig.features ? 1 : 0, id + " has exactly one gap");
    const revealable = new Set(Object.values(gig.dialogue.options).flatMap((o) => o.reveals || []));
    for (const r of revealable) {
      assert.ok(gig.needs.some((n) => n.id === r) || gig.limits.some((l) => l.id === r), id + ": reveal " + r + " names a need or limit");
    }
    for (const site of [gig.poster.site, gig.site].filter(Boolean)) assert.ok(H.sites[site], id + ": site " + site + " exists");
    if (gig.after) assert.ok(H.gigs[gig.after.gig], id + " chains from a real gig");
  }
  // A full playthrough of the grid proves the gap for every gig.
  for (const [id, gig] of Object.entries(H.gigs)) {
    let found = Res.emptyFound();
    for (const dom of gig.competitors) for (const tr of Res.relevantTrends(gig, H.sites, dom)) {
      const text = passages(H.sites[dom]).find((p) => Res.matches(tr, p));
      // Clip the same passage repeatedly until it yields nothing new.
      for (let i = 0; i < 4; i++) found = Res.record(found, Res.clip(gig, H.sites, dom, text, found));
    }
    assert.equal(Res.proven(gig, H.sites, found), gig.features.find((f) => f.gap).id, id + ": gap is provable");
  }
});
