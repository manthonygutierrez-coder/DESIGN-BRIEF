"use strict";
/* ── scoring a delivery ───────────────────────────────────
 * Offline and explainable: every point on the review traces to one line.
 *
 *   needs    70 points, shared by weight. What the client wanted — whether or
 *            not you asked them about it.
 *   limits   20 points, shared equally. What the client would not accept.
 *   gap      10 points, for building on the gap your competitor research found.
 *   late     up to −15, five per started minute past the deadline.
 *
 * A need is met by any of:
 *   text    every string appears in the work's text (case-insensitive)
 *   tags    any tag appears on a card the work used, or on a colour in the work
 *   all     every tag does
 *   blocks  every block type appears (Layout)
 *   app     it was made in that app
 *   subjects   graded, not pass/fail: how like the model sheets the marked
 *              drawings are (hustle/likeness.js). Pasting official art zeroes it.
 *
 * The scorer never looks at pixels. It reads the document the suite saved and
 * the cards that document records using.
 */

const HustleScore = (() => {
  const DOC = typeof SuiteDoc !== "undefined" ? SuiteDoc : require("../suite/doc.js");
  const CARDS = typeof SuiteCards !== "undefined" ? SuiteCards : require("../suite/cards.js");

  function textOf(doc) {
    return [doc.meta && doc.meta.name, shownText(doc)].filter(Boolean).join("\n").toLowerCase();
  }

  function shownText(doc) {
    const out = [];
    for (const l of doc.layers || []) if (l.type === "text" && !l.hidden) out.push(l.text);
    if (doc.site) out.push(doc.site.tagline);
    const walk = (v) => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (k !== "t" && k !== "q" && k !== "card") walk(x); });
    };
    walk(doc.blocks || []);
    return out.filter(Boolean).join("\n").toLowerCase();
  }

  function tagsOf(doc, cards) {
    const byId = new Map((cards || []).map((c) => [c.id, c]));
    const tags = new Set();
    for (const id of DOC.cardsUsed(doc)) {
      const c = byId.get(id);
      if (c) c.tags.forEach((t) => tags.add(t));
    }
    colourWords(doc).forEach((t) => tags.add(t));
    return tags;
  }

  function colourWords(doc) {
    const colours = doc.mode === "layout" ? [doc.site && doc.site.brand].filter(Boolean) : DOC.colours(doc);
    return new Set(colours.flatMap((hex) => CARDS.colourTags(hex)));
  }

  const isEmpty = (doc) => {
    if (doc.mode === "pixel") return !doc.bitmap.some(Boolean);
    if (doc.mode === "layout") return !doc.blocks.length;
    return !doc.layers.some((l) => !l.hidden);
  };

  function needMet(need, ctx) {
    if (need.text && !need.text.every((s) => ctx.text.includes(String(s).toLowerCase()))) return false;
    if (need.tags && !need.tags.some((t) => ctx.tags.has(t))) return false;
    if (need.all && !need.all.every((t) => ctx.tags.has(t))) return false;
    if (need.blocks && !need.blocks.every((b) => ctx.doc.blocks.some((x) => x.t === b))) return false;
    if (need.app && need.app !== ctx.appId) return false;
    return true;
  }

  function limitCheck(limit, doc) {
    switch (limit.rule) {
      case "size": return { ok: doc.w === limit.w && doc.h === limit.h, got: doc.w + "×" + doc.h };
      case "maxColours": {
        if (doc.mode === "layout") return { ok: true };
        const n = DOC.colours(doc).length;
        return { ok: n <= limit.value, got: n + " colours" };
      }
      case "noGradient": return { ok: !DOC.usesGradient(doc), got: "a gradient" };
      case "minText": {
        const small = (doc.layers || []).filter((l) => l.type === "text" && !l.hidden && l.size < limit.value);
        return { ok: !small.length, got: small.length ? "text at " + Math.min(...small.map((l) => l.size)) + "px" : "" };
      }
      case "maxBlocks": return { ok: (doc.blocks || []).length <= limit.value, got: (doc.blocks || []).length + " blocks" };
      // What a client has dropped: an old colour, a word Legal will not allow.
      // Judged on what is shown, never on the document's own name.
      case "avoid": {
        const words = colourWords(doc), text = shownText(doc);
        const hue = (limit.tags || []).find((t) => words.has(t));
        const said = (limit.text || []).find((s) => text.includes(String(s).toLowerCase()));
        return { ok: !hue && !said, got: hue || "“" + said + "”" };
      }
      case "mode": return { ok: doc.mode === limit.value, got: doc.mode };
      default: return { ok: true };
    }
  }

  /* The on-model need, from the likeness report the renderer measured:
   * { subjects: { toma: { quality, shape, palette, proportions } }, scaleOK, pasted } */
  function likenessLine(need, max, rep) {
    const name = (id) => id.charAt(0).toUpperCase() + id.slice(1);
    if (rep && rep.pasted) {
      return { ok: false, text: "Pasted official art. The studio takes fan sites down for that", pts: 0, max, kind: "need" };
    }
    const per = need.subjects.map((id) => (rep && rep.subjects && rep.subjects[id]) || null);
    let q = per.reduce((n, r) => n + (r ? r.quality : 0), 0) / need.subjects.length;
    if (rep && rep.scaleOK === false) q *= 0.85;
    q = Math.max(0, Math.min(1, q));
    const detail = need.subjects.map((id, i) => name(id) + " " + (per[i] ? Math.round(per[i].quality * 100) + "%" : "not marked")).join(" · ") +
      " (shape, palette, proportions)" + (rep && rep.scaleOK === true ? "; relative scale ✓" : rep && rep.scaleOK === false ? "; relative scale off" : "");
    const ok = q >= 0.6;
    return { ok, text: (ok ? "On-model — " : (need.missed || "Not on-model") + " — ") + detail, pts: max * q, max, kind: "need", graded: q };
  }

  function stars(total) {
    return total >= 90 ? 5 : total >= 75 ? 4 : total >= 55 ? 3 : total >= 35 ? 2 : 1;
  }

  /* opts: { gig, doc, cards, appId, lateSeconds }
   * Returns { ok, total, stars, rep, gap, lines: [{ ok, text, pts, max }] } */
  function score(opts) {
    const { gig, doc, cards = [], appId = null, lateSeconds = 0 } = opts;
    if (!doc || isEmpty(doc)) return { ok: false, reason: "There is nothing in that document to deliver." };

    const ctx = { doc, appId, text: textOf(doc), tags: tagsOf(doc, cards) };
    const lines = [];

    const needs = gig.needs || [];
    const weight = needs.reduce((n, x) => n + (x.weight || 1), 0) || 1;
    for (const need of needs) {
      const max = 70 * (need.weight || 1) / weight;
      if (need.subjects) { lines.push(likenessLine(need, max, opts.likeness)); continue; }
      const ok = needMet(need, ctx);
      lines.push({ ok, text: ok ? need.met || need.label : need.missed || need.label, pts: ok ? max : 0, max, kind: "need" });
    }
    if (!needs.length) lines.push({ ok: true, text: "No particular needs", pts: 70, max: 70, kind: "need" });

    const limits = gig.limits || [];
    for (const limit of limits) {
      const max = 20 / limits.length;
      const r = limitCheck(limit, doc);
      lines.push({ ok: r.ok, text: r.ok ? limit.label : limit.label + " — got " + r.got, pts: r.ok ? max : 0, max, kind: "limit" });
    }
    if (!limits.length) lines.push({ ok: true, text: "No hard limits", pts: 20, max: 20, kind: "limit" });

    let gap = false;
    if (gig.gap) {
      gap = ctx.tags.has(gig.gap.tag);
      lines.push({ ok: gap, text: gap ? "Built on the gap: " + gig.gap.label : "Nothing here that the competition does not already do", pts: gap ? 10 : 0, max: 10, kind: "gap" });
    } else {
      lines.push({ ok: true, text: "No competition to stand apart from", pts: 10, max: 10, kind: "gap" });
    }

    if (lateSeconds > 0) {
      const pen = Math.min(15, Math.ceil(lateSeconds / 60) * 5);
      lines.push({ ok: false, text: "Delivered " + Math.ceil(lateSeconds / 60) + " min late", pts: -pen, max: 0, kind: "late" });
    }

    const total = Math.max(0, Math.min(100, Math.round(lines.reduce((n, l) => n + l.pts, 0))));
    const st = stars(total);
    const rep = [0, 1, 3, 5, 8][st - 1] + (gap ? 2 : 0);
    lines.forEach((l) => { l.pts = Math.round(l.pts); l.max = Math.round(l.max); });
    return { ok: true, total, stars: st, rep, gap, lines };
  }

  const TIERS = [[0, "Unknown"], [6, "Newcomer"], [15, "Reliable"], [30, "Sought after"], [55, "In demand"], [80, "A name"]];
  function tier(rep) {
    let t = TIERS[0][1];
    for (const [min, name] of TIERS) if (rep >= min) t = name;
    return t;
  }

  return { score, stars, tier, textOf, tagsOf, needMet, limitCheck, likenessLine, TIERS };
})();

if (typeof module !== "undefined") module.exports = HustleScore;
