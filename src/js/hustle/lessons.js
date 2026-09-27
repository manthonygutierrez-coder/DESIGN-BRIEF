"use strict";
/* ── lessons ──────────────────────────────────────────────
 * A tutorial gig teaches a part of the Design Suite. Its `teach` is a list of
 * steps, in the client's own words:
 *
 *   { id, say, with: ["tool:rect", …], check: { kind: value } | null }
 *
 * `with` names the controls the step is about: the suite rings them, so they
 * are easy to find while you make the thing. `check` is how the suite knows
 * the step is done, read off the work itself; a step with no check is a tip,
 * shown and never required.
 *
 *   check(step, ctx)       done? ctx = { doc, cards }
 *   progress(teach, ctx)   [{ id, done, tip }]
 *   current(teach, ctx)    the first step still to do (tips skipped), or null
 *   problems(teach)        what is wrong with a lesson as written, for tests
 *
 * Pure: no DOM.
 */

const HustleLessons = (() => {
  const need = (g, path) => (typeof globalThis[g] !== "undefined" ? globalThis[g] : typeof require === "function" ? require(path) : null);
  const Doc = typeof SuiteDoc !== "undefined" ? SuiteDoc : need("SuiteDoc", "../suite/doc.js");
  const Cards = typeof SuiteCards !== "undefined" ? SuiteCards : need("SuiteCards", "../suite/cards.js");
  const Guides = typeof SuiteGuides !== "undefined" ? SuiteGuides : need("SuiteGuides", "../suite/guides.js");
  const Apps = typeof SuiteApps !== "undefined" ? SuiteApps : need("SuiteApps", "../suite/apps.js");

  /* ── what a step can point at ──────────────────────────── */
  const CONTROLS = {
    tool: ["select", "node", "pen", "rect", "ellipse", "polygon", "line", "text", "build", "eyedrop", "image", "hand",
      "pencil", "erase", "fill", "pick"],
    opt: ["fill", "nofill", "stroke", "strokeW", "radius", "sides", "star", "inner", "fontmenu", "size", "weight", "italic", "track",
      "bend", "offset", "detach", "mirv", "mirh", "mirmerge", "fliph", "flipv", "fg", "filled", "outline", "mx", "my",
      "tagline", "frame", "brand", "head", "visit"],
    view: ["grid", "smart", "snap", "clearguides"],
    drawer: ["cards", "swatch", "cutout", "lesson"],
    mode: ["vector", "pixel", "layout"],
    blk: Object.keys(Apps.BLOCKS),
    whole: ["ruler", "layers", "deliver"],
  };
  const known = (c) => {
    if (CONTROLS.whole.includes(c)) return true;
    const [kind, id] = String(c).split(":");
    return !!(CONTROLS[kind] && id && CONTROLS[kind].includes(id));
  };

  /* ── how a step knows it is done ───────────────────────── */
  const shown = (c) => ((c.doc && c.doc.layers) || []).filter((l) => !l.hidden && l.type !== "subject");
  const texts = (c) => shown(c).filter((l) => l.type === "text");
  const CHECKS = {
    layer: (t, c) => shown(c).some((l) => l.type === t),
    layers: (n, c) => shown(c).length >= n,
    radius: (v, c) => shown(c).some((l) => l.type === "rect" && l.radius > 0),
    star: (v, c) => shown(c).some((l) => l.type === "polygon" && l.inner != null),
    fill: (tag, c) => shown(c).some((l) => typeof l.fill === "string" && Cards.colourTags(l.fill).includes(tag)),
    text: (s, c) => texts(c).some((l) => String(l.text).toLowerCase().includes(String(s).toLowerCase())),
    texts: (n, c) => texts(c).length >= n,
    font: (f, c) => texts(c).some((l) => (f === "custom" ? l.font !== "Archivo" : l.font === f)),
    guides: (n, c) => !!c.doc.guides && c.doc.guides.v.length + c.doc.guides.h.length >= n,
    grid: (v, c) => !!(c.doc.guides && Guides.focus(c.doc.guides, c.doc.w, c.doc.h)),
    card: (tag, c) => Doc.cardsUsed(c.doc).some((id) => (c.cards || []).some((k) => k.id === id && (k.tags || []).includes(tag))),
    mirror: (v, c) => shown(c).some((l) => l.mirror),
    path: (v, c) => shown(c).some((l) => l.type === "path"),
    // A line the pen drew and left open: no Z in its data.
    open: (v, c) => shown(c).some((l) => l.type === "path" && !/z/i.test(l.d || "")),
    locked: (v, c) => ((c.doc && c.doc.layers) || []).some((l) => l.locked),
    bend: (v, c) => texts(c).some((l) => Math.abs(l.bend || 0) >= 10),
    onPath: (v, c) => texts(c).some((l) => l.on && c.doc.layers.some((x) => x.id === l.on)),
    drawn: (n, c) => ((c.doc && c.doc.bitmap) || []).filter(Boolean).length >= n,
    palette: (n, c) => ((c.doc && c.doc.palette) || []).length >= n,
    block: (t, c) => ((c.doc && c.doc.blocks) || []).some((b) => b.t === t),
    blocks: (n, c) => ((c.doc && c.doc.blocks) || []).length >= n,
    brand: (tag, c) => !!(c.doc && c.doc.site && Cards.colourTags(c.doc.site.brand).includes(tag)),
  };

  function check(step, ctx) {
    if (!step || !step.check || !ctx || !ctx.doc) return false;
    return Object.entries(step.check).every(([k, v]) => CHECKS[k] ? CHECKS[k](v, ctx) : false);
  }

  const progress = (teach, ctx) => (teach || []).map((s) => ({ id: s.id, tip: !s.check, done: !!s.check && check(s, ctx) }));
  function current(teach, ctx) {
    const p = progress(teach, ctx);
    const i = p.findIndex((x) => !x.tip && !x.done);
    return i < 0 ? null : teach[i];
  }
  const complete = (teach, ctx) => !current(teach, ctx);

  /* ── lessons as written ────────────────────────────────── */
  function problems(teach) {
    const out = [];
    const ids = new Set();
    (teach || []).forEach((s, i) => {
      if (!s.id) out.push("step " + i + " has no id");
      else if (ids.has(s.id)) out.push("step " + s.id + " twice");
      ids.add(s.id);
      if (!s.say || s.say.length > 150) out.push("step " + s.id + ": say something short");
      if (!Array.isArray(s.with) || !s.with.length) out.push("step " + s.id + " points at nothing");
      for (const c of s.with || []) if (!known(c)) out.push("step " + s.id + ": no such control " + c);
      for (const k of Object.keys(s.check || {})) if (!CHECKS[k]) out.push("step " + s.id + ": no such check " + k);
    });
    if (!(teach || []).some((s) => s.check)) out.push("a lesson with nothing to do");
    return out;
  }

  return { CONTROLS, CHECKS, known, check, progress, current, complete, problems };
})();

if (typeof module !== "undefined") module.exports = HustleLessons;
