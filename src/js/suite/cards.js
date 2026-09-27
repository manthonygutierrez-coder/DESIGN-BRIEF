"use strict";
/* ── cards ────────────────────────────────────────────────
 * Anything scavenged during research becomes a card. Cards follow you into the
 * suite and are applied to the work; every application records provenance on
 * the document, which is what Hustle scoring reads later.
 *
 *   { id, kind, label, value, tags: [..], source: { url, ref }, gig? }
 *
 * `gig` is the Hustle job a card was found for, so the tray can show that
 * job's finds first. It is never used for scoring.
 *
 *   colour  value "#RRGGBB"
 *   object  value data:image/... (a cutout)
 *   shape   value SVG path data on a 64-unit square
 *   type    value a CSS font family
 *   trend / gap / fact   value plain text — intent, pinned to the document
 *
 * Pure: no DOM. The debug pack takes an image callback so it runs in node too.
 */

const SuiteCards = (() => {
  const KINDS = ["colour", "object", "shape", "type", "trend", "gap", "fact"];
  const INTENT = ["trend", "gap", "fact"];
  const HEX = /^#[0-9A-Fa-f]{6}$/;
  const DOC = typeof SuiteDoc !== "undefined" ? SuiteDoc : require("./doc.js");

  let seq = 0;
  const uid = () => "K" + Date.now().toString(36) + (seq++).toString(36);
  const clip = (v, n) => String(v == null ? "" : v).slice(0, n);

  function normalize(raw) {
    if (!raw || typeof raw !== "object" || !KINDS.includes(raw.kind)) return null;
    let value = raw.value;
    if (raw.kind === "colour") {
      if (typeof value !== "string" || !HEX.test(value)) return null;
      value = value.toUpperCase();
    } else if (raw.kind === "object") {
      if (typeof value !== "string" || !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return null;
      if (value.length > DOC.MAX.src) return null;
    } else if (raw.kind === "shape") {
      if (typeof value !== "string" || !/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(value)) return null;
      value = value.slice(0, 20000);
    } else if (raw.kind === "type") {
      value = clip(value, 80).replace(/[;{}<>"]/g, "");
      if (!value) return null;
    } else {
      value = clip(value, 400);
      if (!value) return null;
    }
    let tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string").map((t) => t.toLowerCase().slice(0, 32)) : [];
    if (raw.kind === "colour") tags = tags.concat(colourTags(value));
    tags = tags.filter((t, i) => t && tags.indexOf(t) === i).slice(0, 16);
    return {
      id: clip(raw.id, 80) || uid(),
      kind: raw.kind,
      label: clip(raw.label || raw.kind, 60),
      value,
      tags,
      source: raw.source && typeof raw.source === "object"
        ? { url: clip(raw.source.url, 200), ref: clip(raw.source.ref, 80) } : { url: "", ref: "" },
      ...(typeof raw.gig === "string" && raw.gig ? { gig: clip(raw.gig, 80) } : {}),
    };
  }

  const card = (kind, label, value, extra = {}) => normalize({ kind, label, value, ...extra });

  /* ── colour families ───────────────────────────────────
   * Words a person would use for a colour: its hue family, how light or dark
   * it is, and whether it reads warm or cool. Colour cards carry these, and the
   * Hustle scorer applies them to every colour actually in a document — so a
   * brief can ask for "navy" without caring which exact navy you mixed.
   */
  function colourTags(hex) {
    if (typeof hex !== "string" || !HEX.test(hex)) return [];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    const tags = [];
    if (l < 0.28) tags.push("dark");
    if (l > 0.78) tags.push("light");
    if (s < 0.14 || l < 0.06 || l > 0.97) {
      tags.push("neutral");
      tags.push(l < 0.2 ? "black" : l > 0.85 ? "white" : "grey");
      return tags;
    }
    const family = h < 15 || h >= 345 ? "red" : h < 42 ? "orange" : h < 70 ? "yellow" : h < 165 ? "green"
      : h < 200 ? "teal" : h < 255 ? "blue" : h < 290 ? "purple" : "pink";
    tags.push(family);
    if (family === "blue" && l < 0.35) tags.push("navy");
    if (family === "orange" && l < 0.4) tags.push("brown");
    tags.push(["red", "orange", "yellow", "pink"].includes(family) ? "warm" : "cool");
    if (s > 0.7 && l > 0.35 && l < 0.7) tags.push("vivid");
    // In HSL a pastel keeps its saturation and gains lightness.
    if (l >= 0.72) tags.push("pastel");
    return tags;
  }

  // Every word colourTags can say. A need asking only for these is met by the
  // colours in the work, which the player can check by looking.
  const COLOUR_WORDS = ["dark", "light", "neutral", "black", "white", "grey", "red", "orange", "yellow", "green",
    "teal", "blue", "purple", "pink", "navy", "brown", "warm", "cool", "vivid", "pastel"];

  /* ── applying a card ───────────────────────────────────── */
  // Dropped on the canvas (no layer under the pointer). `at` is doc space.
  function applyToCanvas(doc, c, at = { x: 0, y: 0 }) {
    if (!c) return { ok: false, reason: "not a card" };
    if (INTENT.includes(c.kind)) {
      if (!doc.meta.intent.includes(c.id)) doc.meta.intent.push(c.id);
      return { ok: true, what: "pinned as intent" };
    }
    if (c.kind === "colour") {
      if (doc.mode === "pixel" || doc.palette.length < 6 || doc.palette.includes(c.value)) {
        if (!doc.palette.includes(c.value)) doc.palette.push(c.value);
        if (!doc.meta.intent.includes(c.id)) doc.meta.intent.push(c.id);
        return { ok: true, what: "added to palette" };
      }
      return { ok: false, reason: "palette is full (six colours)" };
    }
    if (doc.mode !== "free") return { ok: false, reason: "this app cannot place " + c.kind + " cards" };
    if (c.kind === "object") {
      const w = Math.min(doc.w, 240), h = Math.min(doc.h, 240);
      const l = DOC.add(doc, DOC.layer("image", { name: c.label, src: c.value, x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2), w, h, card: c.id, cards: { src: c.id } }));
      return l ? { ok: true, what: "placed image", layer: l } : { ok: false, reason: "too many layers" };
    }
    if (c.kind === "shape") {
      const s = Math.min(doc.w, doc.h, 120);
      const l = DOC.add(doc, DOC.layer("path", { name: c.label, d: c.value, box: 64, x: Math.round(at.x - s / 2), y: Math.round(at.y - s / 2), w: s, h: s, fill: doc.palette[0] || "#0A0A0A", card: c.id, cards: { d: c.id } }));
      return l ? { ok: true, what: "placed shape", layer: l } : { ok: false, reason: "too many layers" };
    }
    if (c.kind === "type") return { ok: false, reason: "drop a type card on a text layer" };
    return { ok: false, reason: "nothing to do" };
  }

  // Dropped on an existing layer.
  function applyToLayer(doc, layerId, c, opts = {}) {
    const l = DOC.find(doc, layerId);
    if (!l || !c) return { ok: false, reason: "nothing there" };
    if (INTENT.includes(c.kind)) return applyToCanvas(doc, c);
    if (c.kind === "colour") {
      const patch = opts.stroke ? { stroke: c.value, strokeW: l.strokeW || 2 } : { fill: c.value };
      DOC.update(doc, l.id, { ...patch, card: c.id, cards: { ...l.cards, [opts.stroke ? "stroke" : "fill"]: c.id } });
      return { ok: true, what: opts.stroke ? "set stroke" : "set fill" };
    }
    if (c.kind === "type") {
      if (l.type !== "text") return { ok: false, reason: "type cards only apply to text" };
      DOC.update(doc, l.id, { font: c.value, card: c.id, cards: { ...l.cards, font: c.id } });
      return { ok: true, what: "set typeface" };
    }
    if (c.kind === "object") {
      if (l.type !== "image") return applyToCanvas(doc, c, { x: l.x + l.w / 2, y: l.y + l.h / 2 });
      DOC.update(doc, l.id, { src: c.value, card: c.id, cards: { ...l.cards, src: c.id } });
      return { ok: true, what: "replaced image" };
    }
    if (c.kind === "shape") {
      if (l.type !== "path") return applyToCanvas(doc, c, { x: l.x + l.w / 2, y: l.y + l.h / 2 });
      DOC.update(doc, l.id, { d: c.value, card: c.id, cards: { ...l.cards, d: c.id } });
      return { ok: true, what: "replaced shape" };
    }
    return { ok: false, reason: "nothing to do" };
  }

  // Layout mode: a card applied to a block.
  function applyToBlock(doc, index, c) {
    const b = doc.blocks[index];
    if (!b || !c) return { ok: false, reason: "nothing there" };
    // An object card on a picture block becomes that block's picture. The
    // block asks Imagery for "card:<id>", which the suite registers as an
    // override, so the site renderer needs no changes to show it.
    if (c.kind === "object") {
      if (b.t !== "plate" && b.t !== "gallery") return { ok: false, reason: "drop pictures on a Big picture or Gallery block" };
      b.q = "card:" + c.id;
      b.card = c.id;
      return { ok: true, what: "set the picture" };
    }
    if (c.kind === "trend" || c.kind === "gap" || c.kind === "fact") {
      if (b.t === "lede") b.p = c.value;
      else if (b.t === "prose") b.ps = [...(b.ps || []), c.value];
      else return applyToCanvas(doc, c);
      b.card = c.id;
      return { ok: true, what: "wrote it into the page" };
    }
    return applyToCanvas(doc, c);
  }

  /* ── debug pack ────────────────────────────────────────── */
  // Until the research minigames exist, seed a tray from a real client so the
  // suite is built and tested against real content. `imageFor(ref)` returns a
  // data URI (Imagery.make in the app; a stub in tests).
  function debugPack(client, imageFor) {
    if (!client) return [];
    const t = client.theme || {};
    const src = { url: client.dom ? "http://" + client.dom + "/" : "", ref: "" };
    const out = [];
    const push = (c) => { if (c) out.push(c); };
    [["brand", "Brand"], ["brand2", "Second"], ["ink", "Ink"], ["bg", "Ground"], ["panel", "Panel"]].forEach(([k, name]) => {
      if (HEX.test(t[k] || "")) push(card("colour", client.co + " · " + name, t[k], { tags: ["client", k], source: src }));
    });
    const face = (css) => String(css || "").split(",")[0].replace(/['"]/g, "").trim();
    if (face(t.head)) push(card("type", "Headline · " + face(t.head), face(t.head), { tags: ["client", "display"], source: src }));
    if (face(t.body) && face(t.body) !== face(t.head)) push(card("type", "Body · " + face(t.body), face(t.body), { tags: ["client", "text"], source: src }));
    for (const ref of (client.refs || []).slice(0, 4)) {
      const uri = imageFor ? imageFor(ref) : null;
      push(card("object", ref, uri, { tags: ["reference"], source: { url: src.url, ref } }));
    }
    const site = client.site || {};
    if (site.tagline) push(card("fact", "They say", site.tagline, { tags: ["voice"], source: src }));
    if (client.voice) push(card("trend", "How they talk", client.voice, { tags: ["voice"], source: src }));
    push(card("shape", "Circle", "M32 2A30 30 0 1 1 31.9 2Z", { tags: ["primitive"] }));
    push(card("shape", "Star", "M32 2L40 24H62L44 38L51 60L32 46L13 60L20 38L2 24H24Z", { tags: ["primitive"] }));
    return out;
  }

  return { KINDS, INTENT, COLOUR_WORDS, normalize, card, colourTags, applyToCanvas, applyToLayer, applyToBlock, debugPack };
})();

if (typeof module !== "undefined") module.exports = SuiteCards;
