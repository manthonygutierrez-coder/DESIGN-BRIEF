"use strict";
/* ── suite apps ───────────────────────────────────────────
 * One engine, several apps. Each app is a configuration: which canvas mode,
 * which tools, which bonus tools, and which disciplines it is relevant to.
 * Gating lives here and nowhere else.
 *
 * Bonus tools are useful but never required. Studio has all of them; in Hustle
 * they appear only once unlocked.
 */

const SuiteApps = (() => {
  const ALL = ["graphic", "webui", "asset3d", "illustrative", "character", "motion", "type"];

  const APPS = {
    banner: {
      label: "Banner", icon: "app-banner", mode: "free", blurb: "Banners, posters, marks, social cards",
      presets: [["Leaderboard", 728, 90], ["Rectangle", 300, 250], ["Social card", 1200, 630], ["Square post", 1080, 1080], ["Poster", 600, 850]],
      tools: ["select", "rect", "ellipse", "text", "image", "eyedrop"],
      bonus: ["gradient", "pen", "snap", "align"],
      for: ["graphic", "illustrative", "motion"],
    },
    type: {
      label: "Type", icon: "app-type", mode: "free", blurb: "Wordmarks, specimens, lettering",
      presets: [["Wordmark", 1200, 400], ["Specimen", 1000, 1300], ["Glyph", 800, 800]],
      tools: ["select", "text", "eyedrop"],
      bonus: ["snap", "align"],
      for: ["type", "graphic"],
    },
    pixel: {
      label: "Pixel", icon: "app-pixel", mode: "pixel", blurb: "Sprites, icons, tiles at true resolution",
      presets: [["Icon", 16, 16], ["Sprite", 32, 32], ["Portrait", 64, 64], ["Tile sheet", 96, 96]],
      tools: ["pencil", "erase", "fill", "pick"],
      bonus: ["mirror"],
      for: ["character", "asset3d", "illustrative"],
    },
    layout: {
      label: "Layout", icon: "app-layout", mode: "layout", blurb: "A web page, built from real site blocks",
      presets: [["Page", 960, 1200]],
      tools: [],
      bonus: [],
      for: ["webui"],
    },
    swatch: {
      label: "Swatch", icon: "app-swatch", utility: true, blurb: "Build a palette and check its contrast",
      for: ALL,
    },
    cutout: {
      label: "Cutout", icon: "app-cutout", utility: true, blurb: "Cut objects and colours out of pictures",
      for: ALL,
    },
  };

  const TOOLS = {
    select: { label: "Select / move", key: "v" },
    rect: { label: "Rectangle", key: "r" },
    ellipse: { label: "Ellipse", key: "o" },
    text: { label: "Text", key: "t" },
    image: { label: "Place image", key: "i" },
    eyedrop: { label: "Eyedropper", key: "e" },
    pen: { label: "Pen (bonus)", key: "p" },
    pencil: { label: "Pencil", key: "b" },
    erase: { label: "Eraser", key: "e" },
    fill: { label: "Fill", key: "g" },
    pick: { label: "Pick colour", key: "i" },
  };

  const BONUS = {
    gradient: "Two-colour gradient fills",
    pen: "Pen tool for custom shapes",
    snap: "Snap to a 10px grid",
    align: "Align to canvas or selection",
    mirror: "Mirror drawing across the centre",
  };

  // Which apps a job may use. No discipline (scratch work) means everything.
  function forDiscipline(catId) {
    return Object.keys(APPS).filter((id) => !catId || APPS[id].for.includes(catId));
  }

  const relevant = (appId, catId) => !catId || APPS[appId].for.includes(catId);

  function bonusFor(appId, slot, unlocks = []) {
    const app = APPS[appId];
    if (!app || !app.bonus) return [];
    return slot === "studio" ? app.bonus.slice() : app.bonus.filter((b) => unlocks.includes(b));
  }

  /* ── layout blocks ─────────────────────────────────────
   * Starting content for each block the Layout app offers, plus how to edit it:
   * `fields` are single strings; `list` is an array edited one item per line,
   * with columns separated by " | ".
   */
  const BLOCKS = {
    lede: { label: "Lede", make: () => ({ t: "lede", p: "One sentence that says what this is." }), fields: [["p", "Text"]] },
    prose: { label: "Prose", make: () => ({ t: "prose", h: "About", ps: ["A paragraph about who this is for."] }), fields: [["h", "Heading"]], lines: ["ps", "Paragraphs"] },
    notice: { label: "Notice", make: () => ({ t: "notice", h: "Heads up", p: "Something visitors need to know." }), fields: [["h", "Heading"], ["p", "Text"], ["stamp", "Stamp"]] },
    stats: { label: "Stats", make: () => ({ t: "stats", h: "By the numbers", items: [{ n: "12", l: "chapters" }, { n: "3", l: "years" }] }), fields: [["h", "Heading"]], list: ["items", ["n", "l"]] },
    steps: { label: "Steps", make: () => ({ t: "steps", h: "How it works", items: [{ h: "Read", p: "Start at chapter one." }, { h: "Join", p: "Say hello in the forum." }] }), fields: [["h", "Heading"]], list: ["items", ["h", "p"]] },
    faq: { label: "FAQ", make: () => ({ t: "faq", h: "Questions", items: [{ q: "Is this official?", a: "No. Made by fans." }] }), fields: [["h", "Heading"]], list: ["items", ["q", "a"]] },
    feed: { label: "Updates", make: () => ({ t: "feed", h: "Latest", items: [{ d: "Sep 12", h: "New fan art gallery", p: "" }] }), fields: [["h", "Heading"]], list: ["items", ["d", "h", "p"]] },
    gallery: { label: "Gallery", make: () => ({ t: "gallery", h: "Gallery", caps: ["First", "Second", "Third"] }), fields: [["h", "Heading"], ["q", "Picture search"]], lines: ["caps", "Captions"] },
    plate: { label: "Big picture", make: () => ({ t: "plate", q: "", cap: "" }), fields: [["q", "Picture search"], ["cap", "Caption"]] },
    people: { label: "People", make: () => ({ t: "people", h: "Who runs this", items: [{ n: "A name", r: "What they do", p: "" }] }), fields: [["h", "Heading"]], list: ["items", ["n", "r", "p"]] },
    swatches: { label: "Swatches", make: () => ({ t: "swatches", h: "Colours", items: [{ c: "#E0442B", n: "Red", m: "" }] }), fields: [["h", "Heading"]], list: ["items", ["c", "n", "m"]] },
    contact: { label: "Contact", make: () => ({ t: "contact", h: "Contact", lines: ["Write any time."] }), fields: [["h", "Heading"]], lines: ["lines", "Lines"] },
  };

  // Text-area form of a list field, and back again.
  function listToText(items, cols) {
    return (items || []).map((it) => cols.map((c) => String(it[c] == null ? "" : it[c]).replace(/\|/g, "/")).join(" | ")).join("\n");
  }
  function textToList(text, cols) {
    return String(text).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 24).map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const o = {};
      cols.forEach((c, i) => { o[c] = (parts[i] || "").slice(0, 300); });
      return o;
    });
  }

  return { APPS, TOOLS, BONUS, BLOCKS, forDiscipline, relevant, bonusFor, listToText, textToList };
})();

if (typeof module !== "undefined") module.exports = SuiteApps;
