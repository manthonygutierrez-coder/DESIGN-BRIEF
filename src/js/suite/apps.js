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
      presets: [["Leaderboard", 728, 90], ["Rectangle", 300, 250], ["Social card", 1200, 630], ["Square post", 1080, 1080], ["Poster", 600, 850], ["Zine page", 550, 850]],
      // Pen and shape builder are core: drawing a character by eye needs them
      // from the first gig.
      tools: ["select", "rect", "ellipse", "pen", "build", "text", "image", "eyedrop"],
      bonus: ["gradient", "snap", "align"],
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
    pen: { label: "Pen — click points, click the first to close", key: "p" },
    build: { label: "Shape builder — drag across shapes to merge, alt-drag to cut", key: "m" },
    pencil: { label: "Pencil", key: "b" },
    erase: { label: "Eraser", key: "e" },
    fill: { label: "Fill", key: "g" },
    pick: { label: "Pick colour", key: "i" },
  };

  const BONUS = {
    gradient: "Two-colour gradient fills",

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
   * `fields` are single strings; `lines` is a list of strings, one per line;
   * `list` is [key, columns, column labels], edited as one row per item.
   */
  const BLOCKS = {
    lede: { label: "Lede", make: () => ({ t: "lede", p: "One sentence that says what this is." }), fields: [["p", "Text"]] },
    prose: { label: "Prose", make: () => ({ t: "prose", h: "About", ps: ["A paragraph about who this is for."] }), fields: [["h", "Heading"]], lines: ["ps", "Paragraphs"] },
    notice: { label: "Notice", make: () => ({ t: "notice", h: "Heads up", p: "Something visitors need to know." }), fields: [["h", "Heading"], ["p", "Text"], ["stamp", "Stamp"]] },
    stats: { label: "Stats", make: () => ({ t: "stats", h: "By the numbers", items: [{ n: "12", l: "chapters" }, { n: "3", l: "years" }] }), fields: [["h", "Heading"]], list: ["items", ["n", "l"], ["Number", "Label"]] },
    steps: { label: "Steps", make: () => ({ t: "steps", h: "How it works", items: [{ h: "Read", p: "Start at chapter one." }, { h: "Join", p: "Say hello in the forum." }] }), fields: [["h", "Heading"]], list: ["items", ["h", "p"], ["Step", "Detail"]] },
    faq: { label: "FAQ", make: () => ({ t: "faq", h: "Questions", items: [{ q: "Is this official?", a: "No. Made by fans." }] }), fields: [["h", "Heading"]], list: ["items", ["q", "a"], ["Question", "Answer"]] },
    feed: { label: "Updates", make: () => ({ t: "feed", h: "Latest", items: [{ d: "Sep 12", h: "New fan art gallery", p: "" }] }), fields: [["h", "Heading"]], list: ["items", ["d", "h", "p"], ["Date", "Headline", "Text"]] },
    gallery: { label: "Gallery", make: () => ({ t: "gallery", h: "Gallery", caps: ["First", "Second", "Third"] }), fields: [["h", "Heading"], ["q", "Picture search"]], lines: ["caps", "Captions"] },
    plate: { label: "Big picture", make: () => ({ t: "plate", q: "", cap: "" }), fields: [["q", "Picture search"], ["cap", "Caption"]] },
    people: { label: "People", make: () => ({ t: "people", h: "Who runs this", items: [{ n: "A name", r: "What they do", p: "" }] }), fields: [["h", "Heading"]], list: ["items", ["n", "r", "p"], ["Name", "Role", "Bio"]] },
    swatches: { label: "Swatches", make: () => ({ t: "swatches", h: "Colours", items: [{ c: "#E0442B", n: "Red", m: "" }] }), fields: [["h", "Heading"]], list: ["items", ["c", "n", "m"], ["Colour", "Name", "Note"]] },
    contact: { label: "Contact", make: () => ({ t: "contact", h: "Contact", lines: ["Write any time."] }), fields: [["h", "Heading"]], lines: ["lines", "Lines"] },
  };
  const MAX_ITEMS = 24;

  // A blank row for a list block: every column empty, except a colour column,
  // which starts on a colour the swatch will actually show.
  function blankItem(cols) {
    const o = {};
    cols.forEach((c) => { o[c] = c === "c" ? "#CCCCCC" : ""; });
    return o;
  }

  return { APPS, TOOLS, BONUS, BLOCKS, MAX_ITEMS, forDiscipline, relevant, bonusFor, blankItem };
})();

if (typeof module !== "undefined") module.exports = SuiteApps;
