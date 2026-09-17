"use strict";
/* ── suite document model ─────────────────────────────────
 * One document shape for every suite app. Pure data and pure functions: no DOM,
 * no canvas. That is deliberate — the scorer (Hustle) reads the same Doc, and
 * the whole file runs under `node --test`.
 *
 *   { v, w, h, bg, mode: "free"|"pixel"|"layout",
 *     layers:  [ Layer ],          free mode: bottom → top
 *     bitmap:  [ "" | "#RRGGBB" ], pixel mode: w*h cells, "" is transparent
 *     blocks:  [ SiteBlock ],      layout mode: sites.js block objects
 *     palette: [ "#RRGGBB" ],
 *     meta:    { name, briefId, gigId, intent: [cardId] } }
 *
 * Every layer a card touched carries `card` — its provenance. Scoring never has
 * to look at pixels; it reads which cards ended up where.
 */

const SuiteDoc = (() => {
  const MODES = ["free", "pixel", "layout"];
  const TYPES = ["rect", "ellipse", "text", "image", "path"];
  const MAX = { layers: 200, blocks: 40, text: 400, src: 6 * 1024 * 1024, dim: 4096, pixelDim: 128, palette: 32, name: 80 };
  const HEX = /^#[0-9A-Fa-f]{6}$/;

  let seq = 0;
  const uid = (p) => p + Date.now().toString(36) + (seq++).toString(36);

  const num = (v, d, lo = -1e5, hi = 1e5) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  const str = (v, max, d = "") => (typeof v === "string" ? v.slice(0, max) : d);
  const hex = (v, d = null) => (typeof v === "string" && HEX.test(v) ? v.toUpperCase() : d);
  // Fills are a hex colour, or a two-stop gradient { a, b, dir } (a bonus tool).
  const paint = (v, d) => {
    if (v === null || v === "none") return null;
    if (v && typeof v === "object" && hex(v.a) && hex(v.b)) {
      return { a: hex(v.a), b: hex(v.b), dir: v.dir === "v" ? "v" : "h" };
    }
    return hex(v, d);
  };

  /* ── creation ──────────────────────────────────────────── */
  function create(opts = {}) {
    const mode = MODES.includes(opts.mode) ? opts.mode : "free";
    const lim = mode === "pixel" ? MAX.pixelDim : MAX.dim;
    const w = Math.round(num(opts.w, mode === "pixel" ? 32 : 728, 1, lim));
    const h = Math.round(num(opts.h, mode === "pixel" ? 32 : 90, 1, lim));
    return {
      v: 1, w, h, mode,
      bg: paint(opts.bg, mode === "pixel" ? null : "#FFFFFF"),
      layers: [],
      bitmap: mode === "pixel" ? new Array(w * h).fill("") : [],
      blocks: [],
      palette: [],
      meta: { name: str(opts.name, MAX.name, "Untitled"), briefId: opts.briefId || null, gigId: opts.gigId || null, intent: [] },
      site: mode === "layout" ? site(opts.site) : null,
    };
  }

  // Layout docs carry the settings of the page being designed.
  function site(raw = {}) {
    const r = raw && typeof raw === "object" ? raw : {};
    return {
      frame: str(r.frame, 20, "studio").replace(/[^a-z]/g, "") || "studio",
      tagline: str(r.tagline, 160),
      brand: hex(r.brand, "#C2452C"),
      head: str(r.head, 80, "Archivo").replace(/[;{}<>"]/g, ""),
    };
  }

  function layer(type, props = {}) {
    if (!TYPES.includes(type)) throw new Error("unknown layer type " + type);
    const base = {
      id: uid("L"), type, name: str(props.name, 40, type),
      x: 0, y: 0, w: 100, h: 60, rot: 0, opacity: 1,
      fill: type === "text" ? "#0A0A0A" : "#E0442B", stroke: null, strokeW: 0,
      hidden: false, locked: false, card: null,
    };
    if (type === "text") Object.assign(base, { text: "Text", font: "Archivo", size: 32, weight: 700, track: 0, align: "left" });
    if (type === "image") Object.assign(base, { src: "", fill: null });
    if (type === "path") Object.assign(base, { d: "M0 0H64V64H0Z", box: 64 });
    return sanitizeLayer(Object.assign(base, props, { type, id: props.id || base.id }));
  }

  /* ── layers ────────────────────────────────────────────── */
  const find = (doc, id) => doc.layers.find((l) => l.id === id) || null;
  const indexOf = (doc, id) => doc.layers.findIndex((l) => l.id === id);

  function add(doc, l) {
    if (doc.layers.length >= MAX.layers) return null;
    doc.layers.push(l);
    return l;
  }

  function update(doc, id, patch) {
    const i = indexOf(doc, id);
    if (i < 0) return null;
    const next = sanitizeLayer(Object.assign({}, doc.layers[i], patch, { id, type: doc.layers[i].type }));
    doc.layers[i] = next;
    return next;
  }

  function remove(doc, id) {
    const i = indexOf(doc, id);
    if (i < 0) return false;
    doc.layers.splice(i, 1);
    return true;
  }

  // "up" / "down" one step, or "top" / "bottom".
  function restack(doc, id, where) {
    const i = indexOf(doc, id);
    if (i < 0) return false;
    const [l] = doc.layers.splice(i, 1);
    let j = i;
    if (where === "up") j = Math.min(doc.layers.length, i + 1);
    else if (where === "down") j = Math.max(0, i - 1);
    else if (where === "top") j = doc.layers.length;
    else if (where === "bottom") j = 0;
    doc.layers.splice(j, 0, l);
    return j !== i;
  }

  function duplicate(doc, id) {
    const l = find(doc, id);
    if (!l) return null;
    const copy = Object.assign(JSON.parse(JSON.stringify(l)), { id: uid("L"), x: l.x + 10, y: l.y + 10 });
    doc.layers.splice(indexOf(doc, id) + 1, 0, copy);
    return copy;
  }

  /* ── geometry ──────────────────────────────────────────── */
  // A point in doc space, un-rotated into the layer's own frame.
  function toLocal(l, px, py) {
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    const a = -(l.rot || 0) * Math.PI / 180;
    const dx = px - cx, dy = py - cy;
    return { x: dx * Math.cos(a) - dy * Math.sin(a) + l.w / 2, y: dx * Math.sin(a) + dy * Math.cos(a) + l.h / 2 };
  }

  function contains(l, px, py) {
    const p = toLocal(l, px, py);
    if (p.x < 0 || p.y < 0 || p.x > l.w || p.y > l.h) return false;
    if (l.type === "ellipse") {
      const rx = l.w / 2, ry = l.h / 2;
      return ((p.x - rx) ** 2) / (rx * rx || 1) + ((p.y - ry) ** 2) / (ry * ry || 1) <= 1;
    }
    return true;
  }

  // Topmost visible, unlocked layer under the point.
  function hitTest(doc, px, py) {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i];
      if (!l.hidden && !l.locked && contains(l, px, py)) return l;
    }
    return null;
  }

  function align(doc, ids, how) {
    const ls = ids.map((id) => find(doc, id)).filter(Boolean);
    if (!ls.length) return;
    // One layer aligns to the canvas; several align to their shared bounds.
    const b = ls.length === 1 ? { x0: 0, y0: 0, x1: doc.w, y1: doc.h } : {
      x0: Math.min(...ls.map((l) => l.x)), y0: Math.min(...ls.map((l) => l.y)),
      x1: Math.max(...ls.map((l) => l.x + l.w)), y1: Math.max(...ls.map((l) => l.y + l.h)),
    };
    for (const l of ls) {
      if (how === "left") l.x = b.x0;
      if (how === "right") l.x = b.x1 - l.w;
      if (how === "hcenter") l.x = Math.round((b.x0 + b.x1 - l.w) / 2);
      if (how === "top") l.y = b.y0;
      if (how === "bottom") l.y = b.y1 - l.h;
      if (how === "vcenter") l.y = Math.round((b.y0 + b.y1 - l.h) / 2);
    }
  }

  const snap = (v, grid) => (grid > 1 ? Math.round(v / grid) * grid : v);

  /* ── pixel mode ────────────────────────────────────────── */
  function getPx(doc, x, y) {
    if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return null;
    return doc.bitmap[y * doc.w + x];
  }

  function setPx(doc, x, y, colour) {
    if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return false;
    const c = colour ? hex(colour) : "";
    if (colour && !c) return false;
    const i = y * doc.w + x;
    if (doc.bitmap[i] === c) return false;
    doc.bitmap[i] = c;
    return true;
  }

  // 4-connected flood fill. Iterative, so a 128×128 canvas cannot blow the stack.
  function fill(doc, x, y, colour) {
    const target = getPx(doc, x, y);
    const c = colour ? hex(colour) : "";
    if (target === null || target === c) return 0;
    let n = 0;
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (getPx(doc, px, py) !== target) continue;
      doc.bitmap[py * doc.w + px] = c;
      n++;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    return n;
  }

  // Bresenham, so a fast stroke does not leave gaps between pointer events.
  function line(doc, x0, y0, x1, y1, colour, mirror = false) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, changed = 0;
    for (;;) {
      if (setPx(doc, x0, y0, colour)) changed++;
      if (mirror && setPx(doc, doc.w - 1 - x0, y0, colour)) changed++;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return changed;
  }

  /* ── layout mode ───────────────────────────────────────── */
  function addBlock(doc, block, at = doc.blocks.length) {
    if (doc.blocks.length >= MAX.blocks || !block || typeof block.t !== "string") return false;
    doc.blocks.splice(Math.max(0, Math.min(at, doc.blocks.length)), 0, block);
    return true;
  }
  function moveBlock(doc, i, delta) {
    const j = i + delta;
    if (i < 0 || i >= doc.blocks.length || j < 0 || j >= doc.blocks.length) return false;
    const [b] = doc.blocks.splice(i, 1);
    doc.blocks.splice(j, 0, b);
    return true;
  }
  function removeBlock(doc, i) {
    if (i < 0 || i >= doc.blocks.length) return false;
    doc.blocks.splice(i, 1);
    return true;
  }

  /* ── facts the scorer (and the Swatch app) need ────────── */
  function colours(doc) {
    const out = new Set();
    const addPaint = (p) => {
      if (!p) return;
      if (typeof p === "string") out.add(p);
      else { out.add(p.a); out.add(p.b); }
    };
    addPaint(doc.bg);
    for (const l of doc.layers) if (!l.hidden) { addPaint(l.fill); if (l.strokeW > 0) addPaint(l.stroke); }
    for (const c of doc.bitmap) if (c) out.add(c);
    return [...out];
  }

  const usesGradient = (doc) =>
    [doc.bg, ...doc.layers.filter((l) => !l.hidden).map((l) => l.fill)].some((p) => p && typeof p === "object");

  function cardsUsed(doc) {
    const ids = new Set(doc.meta.intent || []);
    for (const l of doc.layers) if (l.card) ids.add(l.card);
    for (const b of doc.blocks) if (b && b.card) ids.add(b.card);
    return [...ids];
  }

  /* ── undo ──────────────────────────────────────────────── */
  // Whole-document JSON snapshots. Docs are small (image sources are the only
  // bulk, and they are shared strings), so this is simpler than inverse ops
  // and cannot drift out of sync with the model.
  function history(limit = 50) {
    let past = [], future = [];
    return {
      // Takes the document, or a JSON snapshot taken before a change — editors
      // snapshot on pointerdown and only record if the gesture changed anything.
      record(doc) {
        const snap = typeof doc === "string" ? doc : JSON.stringify(doc);
        if (past[past.length - 1] === snap) return;
        past.push(snap);
        if (past.length > limit) past.shift();
        future = [];
      },
      undo(doc) {
        if (!past.length) return null;
        future.push(JSON.stringify(doc));
        return JSON.parse(past.pop());
      },
      redo(doc) {
        if (!future.length) return null;
        past.push(JSON.stringify(doc));
        return JSON.parse(future.pop());
      },
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0,
    };
  }

  /* ── loading untrusted documents ───────────────────────── */
  function sanitizeLayer(l) {
    const out = {
      id: str(l.id, 40) || uid("L"), type: l.type, name: str(l.name, 40, l.type),
      x: num(l.x, 0), y: num(l.y, 0),
      w: num(l.w, 100, 1, MAX.dim * 4), h: num(l.h, 60, 1, MAX.dim * 4),
      rot: num(l.rot, 0, -360, 360), opacity: num(l.opacity, 1, 0, 1),
      fill: paint(l.fill, null), stroke: hex(l.stroke), strokeW: num(l.strokeW, 0, 0, 200),
      hidden: !!l.hidden, locked: !!l.locked, card: l.card ? str(l.card, 80) : null,
    };
    if (l.type === "text") {
      Object.assign(out, {
        text: str(l.text, MAX.text, "Text"), font: str(l.font, 80, "Archivo").replace(/[;{}<>]/g, ""),
        size: num(l.size, 32, 4, 800), weight: [400, 500, 600, 700].includes(l.weight) ? l.weight : 400,
        track: num(l.track, 0, -20, 100), align: ["left", "center", "right"].includes(l.align) ? l.align : "left",
      });
    }
    if (l.type === "image") {
      // Only inline raster images. Nothing in a document may point at a URL.
      const src = str(l.src, MAX.src);
      out.src = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : "";
    }
    if (l.type === "path") {
      out.d = /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]*$/.test(l.d || "") ? str(l.d, 20000) : "";
      out.box = num(l.box, 64, 1, 4096);
    }
    return out;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") return null;
    const doc = create({ mode: raw.mode, w: raw.w, h: raw.h, bg: raw.bg, name: raw.meta && raw.meta.name, site: raw.site });
    if (raw.meta && typeof raw.meta === "object") {
      doc.meta.briefId = raw.meta.briefId ? str(raw.meta.briefId, 120) : null;
      doc.meta.gigId = raw.meta.gigId ? str(raw.meta.gigId, 120) : null;
      doc.meta.intent = Array.isArray(raw.meta.intent) ? raw.meta.intent.filter((x) => typeof x === "string").slice(0, 40).map((x) => x.slice(0, 80)) : [];
    }
    doc.palette = Array.isArray(raw.palette) ? raw.palette.map((c) => hex(c)).filter(Boolean).slice(0, MAX.palette) : [];
    if (Array.isArray(raw.layers)) {
      for (const l of raw.layers.slice(0, MAX.layers)) {
        if (l && TYPES.includes(l.type)) doc.layers.push(sanitizeLayer(l));
      }
    }
    if (doc.mode === "pixel" && Array.isArray(raw.bitmap) && raw.bitmap.length === doc.w * doc.h) {
      doc.bitmap = raw.bitmap.map((c) => (c ? hex(c, "") : ""));
    }
    if (doc.mode === "layout" && Array.isArray(raw.blocks)) {
      // Block content is escaped by sites.js at render time; here it only has to
      // be plain JSON data of a bounded size.
      doc.blocks = raw.blocks.filter((b) => b && typeof b === "object" && typeof b.t === "string")
        .slice(0, MAX.blocks).map((b) => JSON.parse(JSON.stringify(b)))
        .filter((b) => JSON.stringify(b).length < 20000);
    }
    return doc;
  }

  const serialize = (doc) => JSON.stringify({ format: "pxdoc", ...doc });
  function parse(text) {
    try { return normalize(JSON.parse(text)); } catch { return null; }
  }

  return {
    MODES, TYPES, MAX,
    create, layer, find, add, update, remove, restack, duplicate,
    toLocal, contains, hitTest, align, snap,
    getPx, setPx, fill, line,
    addBlock, moveBlock, removeBlock,
    colours, usesGradient, cardsUsed,
    history, normalize, serialize, parse, sanitizeLayer, site,
  };
})();

if (typeof module !== "undefined") module.exports = SuiteDoc;
