"use strict";
/* ── the brief, as steps ──────────────────────────────────
 * What the Brief panel beside your work shows, what "show me" points at, which
 * tools are out, and what Deliver checks first. Pure: no DOM, so node checks
 * it against the scorer itself.
 *
 * It only knows what you know. A need the client never told you about stays
 * "???": it adds no tool, no step and no hint. And it only ticks what you could
 * check by looking at your own work: the words on it, the file's name, its
 * colours, its sections, every limit. Whether a picture or a fact is the right
 * one is your call, judged when you deliver; so is how well you drew someone.
 *
 *   steps({ gig, parent, doc, cards, appId, known, gapFound })
 *     → [{ id, from, kind, state, label, detail, control, wants }]
 *       from     "need" | "limit" | "gap"
 *       kind     "check" | "call" | "graded" (null while unknown)
 *       state    "met" | "open" | "judged" | "unknown"
 *       control  what "show me" rings: a name the suite maps to a control
 *       wants    for a call: "picture" | "fact" | "either"
 *   toolsFor(appId, gig, known, unlocks) → { tools, more, bonus, ref }
 *   preflight(steps, doc) → [lines still open]
 */

const HustleBrief = (() => {
  const Score = typeof HustleScore !== "undefined" ? HustleScore : require("./score.js");
  const Cards = typeof SuiteCards !== "undefined" ? SuiteCards : require("../suite/cards.js");
  const Doc = typeof SuiteDoc !== "undefined" ? SuiteDoc : require("../suite/doc.js");
  const Apps = typeof SuiteApps !== "undefined" ? SuiteApps : require("../suite/apps.js");

  const COLOUR = new Set(Cards.COLOUR_WORDS);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /* ── what the gig is ─────────────────────────────────── */
  function sizeOf(gig) {
    const l = ((gig && gig.limits) || []).find((x) => x.rule === "size");
    return l ? { w: l.w, h: l.h } : null;
  }

  // "Poster", "Banner", "Zine cover": what the window is called while you make it.
  function deliverable(gig, appId) {
    if (gig && gig.deliverable) return gig.deliverable;
    const app = Apps.APPS[appId || (gig && gig.app)];
    const size = sizeOf(gig);
    const preset = app && app.presets && size && app.presets.find(([, w, h]) => w === size.w && h === size.h);
    return preset ? preset[0] : app ? app.label : "Work";
  }

  /* ── what kind of need ───────────────────────────────── */
  // check  you can see whether it's there: words, the file's name, sections,
  //        colour words, the earlier delivery a follow-up builds on
  // call   a picture or a fact: yours to choose, judged on delivery
  // graded judged by eye (the on-model drawing, a page's design)
  function kindOf(need, gig, parent) {
    if (need.subjects || need.design) return "graded";
    if (need.text || need.file || need.blocks || need.app) return "check";
    const tags = [...(need.tags || []), ...(need.all || [])];
    if (tags.length && tags.every((t) => COLOUR.has(t))) return "check";
    const out = new Set((parent && parent.output && parent.output.tags) || []);
    if (tags.length && tags.every((t) => out.has(t))) return "check";
    return "call";
  }

  // For a call: is it a picture that's wanted, something you read, or either.
  function wantsOf(need, gig) {
    const tags = new Set([...(need.tags || []), ...(need.all || [])]);
    const hit = (list) => (list || []).some((x) => (x.tags || []).some((t) => tags.has(t)));
    const picture = hit(gig.refs), fact = hit(gig.facts);
    return picture && fact ? "either" : picture ? "picture" : fact ? "fact" : "either";
  }

  /* ── steps ───────────────────────────────────────────── */
  function steps({ gig, parent = null, doc = null, cards = [], appId = null, known = [], gapFound = null }) {
    const knows = new Set(known);
    const ctx = doc ? { doc, appId, text: Score.textOf(doc), tags: Score.tagsOf(doc, cards) } : null;
    const out = [];
    const unknown = (id, from) => ({ id, from, kind: null, state: "unknown", label: "???", detail: "", control: null });

    for (const need of gig.needs || []) {
      if (!knows.has(need.id)) { out.push(unknown(need.id, "need")); continue; }
      const kind = kindOf(need, gig, parent);
      const step = { id: need.id, from: "need", kind, label: need.label, detail: "", control: null };
      if (kind === "check") {
        step.state = ctx && Score.needMet(need, ctx) ? "met" : "open";
        step.detail = ctx ? needDetail(need, ctx) : "";
        step.control = needControl(need, parent);
      } else if (kind === "graded") {
        step.state = "judged";
        step.detail = need.subjects ? marked(need, doc) : "judged when you deliver";
        step.control = need.subjects ? "pins" : null;
      } else {
        step.state = "judged";
        step.wants = wantsOf(need, gig);
        step.detail = (step.wants === "picture" ? "a picture" : step.wants === "fact" ? "something you found" : "a picture or something you found") +
          ": your call, judged when you deliver";
      }
      out.push(step);
    }

    for (const limit of gig.limits || []) {
      if (!knows.has(limit.id)) { out.push(unknown(limit.id, "limit")); continue; }
      const r = doc ? Score.limitCheck(limit, doc) : { ok: false };
      out.push({
        id: limit.id, from: "limit", kind: "check", state: r.ok ? "met" : "open", label: limit.label,
        detail: doc ? limitDetail(limit, doc, r) : "", control: doc ? limitControl(limit, doc) : null,
      });
    }

    if (gig.gap && gapFound) {
      const used = !!ctx && ctx.tags.has(gig.gap.tag);
      out.push({ id: "gap", from: "gap", kind: "check", state: used ? "met" : "open", label: "Build on the gap: " + gig.gap.label,
        detail: used ? "" : "the gap card goes on the work", control: "gap" });
    }
    return out;
  }

  const tick = (ok) => (ok ? " ✓" : " —");

  function needDetail(need, ctx) {
    const parts = [];
    if (need.text && need.text.length > 1) parts.push(need.text.map((s) => s + tick(ctx.text.includes(String(s).toLowerCase()))).join("  "));
    if (need.file) parts.push("named “" + (ctx.doc.meta && ctx.doc.meta.name) + "”");
    if (need.all && need.all.length > 1) parts.push(need.all.map((t) => t + tick(ctx.tags.has(t))).join("  "));
    if (need.blocks) parts.push(need.blocks.map((b) => blockName(b) + tick((ctx.doc.blocks || []).some((x) => x.t === b))).join("  "));
    return parts.join(" · ");
  }

  const blockName = (t) => (Apps.BLOCKS[t] ? Apps.BLOCKS[t].label : cap(t));

  function needControl(need, parent) {
    if (need.file) return "file";
    if (need.blocks) return "blocks";
    if (need.text) return "copy";
    const tags = [...(need.tags || []), ...(need.all || [])];
    const out = new Set((parent && parent.output && parent.output.tags) || []);
    if (tags.length && tags.every((t) => out.has(t))) return "earlier";
    return "colour";
  }

  function marked(need, doc) {
    const on = new Set(doc ? Doc.subjects(doc).map((l) => l.ref.id) : []);
    return "Marked: " + need.subjects.map((id) => cap(id) + tick(on.has(id))).join("  ");
  }

  function limitDetail(limit, doc, r) {
    switch (limit.rule) {
      case "size": return r.ok ? doc.w + " × " + doc.h : "it's " + doc.w + " × " + doc.h + ", theirs is " + limit.w + " × " + limit.h;
      case "maxColours": {
        const n = Doc.colours(doc).length;
        return n + " of " + limit.value + " colours" + (!r.ok && doc.bg ? ": the background counts" : "");
      }
      case "minText": {
        const sizes = (doc.layers || []).filter((l) => l.type === "text" && !l.hidden).map((l) => l.size);
        return sizes.length ? "smallest text " + Math.min(...sizes) + " px, theirs is " + limit.value : "";
      }
      case "maxBlocks": return (doc.blocks || []).length + " of " + limit.value + " sections";
      case "noGradient": return r.ok ? "" : "a gradient is in it";
      case "avoid": return r.ok ? "" : r.got + " is in it";
      default: return "";
    }
  }

  function limitControl(limit, doc) {
    switch (limit.rule) {
      case "size": return "resize";
      case "maxColours": return "colours";
      case "minText": return "size";
      case "noGradient": return "gradient";
      case "maxBlocks": return "blocks";
      case "avoid": {
        // The layer the offending word or colour is on.
        const words = (limit.text || []).map((s) => String(s).toLowerCase());
        const hues = new Set(limit.tags || []);
        const l = (doc.layers || []).find((x) => !x.hidden && (
          (x.type === "text" && words.some((w) => String(x.text).toLowerCase().includes(w))) ||
          (typeof x.fill === "string" && Cards.colourTags(x.fill).some((t) => hues.has(t)))));
        return l ? "layer:" + l.id : null;
      }
      default: return null;
    }
  }

  /* ── tools ───────────────────────────────────────────── */
  // What's out for a gig. The rest waits in More tools; nothing is taken away.
  const ALWAYS = {
    banner: ["select", "rect", "ellipse", "text"],
    type: ["select", "text"],
    pixel: ["pencil", "erase", "fill", "pick"],
  };

  function toolsFor(appId, gig, known = [], unlocks = []) {
    const app = Apps.APPS[appId];
    if (!app || app.utility) return { tools: [], more: [], bonus: [], ref: false };
    const knows = new Set(known);
    const needs = ((gig && gig.needs) || []).filter((n) => knows.has(n.id));
    const draw = needs.some((n) => n.subjects);
    const out = new Set(ALWAYS[appId] || []);
    if (draw) { out.add("pen"); out.add("build"); }
    const tools = (app.tools || []).filter((t) => out.has(t));
    return { tools, more: (app.tools || []).filter((t) => !out.has(t)), bonus: Apps.bonusFor(appId, "hustle", unlocks), ref: draw };
  }

  /* ── before you deliver ──────────────────────────────── */
  // What is still open, in the brief's own words. Reminders about pictures and
  // finds never say which one.
  function preflight(list, doc) {
    const lines = list.filter((s) => s.state === "open").map((s) => s.label + (s.detail ? " (" + s.detail + ")" : ""));
    const calls = list.filter((s) => s.kind === "call");
    const pictures = doc && doc.mode === "free" ? doc.layers.some((l) => l.type === "image" && !l.hidden && l.card) : true;
    if (calls.some((s) => s.wants === "picture") && !pictures) lines.push("There are no pictures in it yet");
    const intent = doc && doc.meta && doc.meta.intent && doc.meta.intent.length;
    if (calls.some((s) => s.wants === "fact") && !intent) lines.push("None of what you found is on it yet");
    return lines;
  }

  // The tray's order: this job's finds, then earlier deliveries, then the rest.
  function relevance(card, gigId, parentId) {
    if (card.gig && card.gig === gigId) return 0;
    if (parentId && card.source && card.source.ref === "delivered:" + parentId) return 1;
    if (card.source && /^delivered:/.test(card.source.ref || "")) return 1;
    return 2;
  }

  return { sizeOf, deliverable, kindOf, wantsOf, steps, toolsFor, preflight, relevance, ALWAYS };
})();

if (typeof module !== "undefined") module.exports = HustleBrief;
