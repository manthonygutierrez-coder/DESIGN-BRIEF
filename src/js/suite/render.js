"use strict";
/* ── suite renderer ───────────────────────────────────────
 * Draws a SuiteDoc onto a 2D canvas context. One renderer for the editor view,
 * thumbnails and PNG export, so what you see is exactly what gets delivered.
 *
 * Text is always drawn with fillText — document content never becomes markup.
 *
 * A layer with a mirror is drawn again reflected across its axis (or both
 * axes, four times). Text can be bent into an arc, or set along a path layer
 * (`on`); both lay the letters out one by one with SuiteVector.
 */

const SuiteRender = (() => {
  const V = SuiteVector;
  // Decoded images, keyed by their data URI. Shared across every doc and view.
  const images = new Map();
  let onImageReady = null;

  function imageFor(src) {
    if (!src) return null;
    let img = images.get(src);
    if (!img) {
      img = new Image();
      img.onload = () => { if (onImageReady) onImageReady(); };
      img.src = src;
      images.set(src, img);
      if (images.size > 120) images.delete(images.keys().next().value);
    }
    return img.complete && img.naturalWidth ? img : null;
  }

  function paintOf(ctx, p, w, h) {
    if (!p) return null;
    if (typeof p === "string") return p;
    const g = p.dir === "v" ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, p.a);
    g.addColorStop(1, p.b);
    return g;
  }

  const fontOf = (l) => (l.style === "italic" ? "italic " : "") + (l.weight || 400) + " " + l.size + "px \"" +
    String(l.font).replace(/"/g, "") + "\", Archivo, sans-serif";

  /* ── shapes as Path2D, cached ─────────────────────────── */
  const paths = new Map();
  function cached(key, make) {
    let p = paths.get(key);
    if (!p) {
      p = make();
      paths.set(key, p);
      if (paths.size > 300) paths.delete(paths.keys().next().value);
    }
    return p;
  }
  // A path layer's outline in its own w × h frame (so a stroke is the same
  // width all the way round, however the box was stretched).
  const pathLocal = (l) => cached("p|" + l.d + "|" + l.box + "|" + l.w + "|" + l.h, () => V.place(l.d, l.box, 0, 0, l.w, l.h));
  const path2D = (l) => cached("2|" + l.type + "|" + (l.type === "path" ? l.d + "|" + l.box : l.sides + "|" + l.inner) + "|" + l.w + "|" + l.h,
    () => new Path2D(V.toD(l.type === "path" ? pathLocal(l) : V.polygon(0, 0, l.w, l.h, l.sides, l.inner), (v) => v)));

  // A layer's outline in document space, its rotation included: what text
  // set on it follows.
  function pathInDoc(l) {
    const local = l.type === "path" ? pathLocal(l)
      : l.type === "polygon" ? V.polygon(0, 0, l.w, l.h, l.sides, l.inner)
      : l.type === "ellipse" ? V.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2)
      : l.type === "rect" ? V.rect(0, 0, l.w, l.h, l.radius || 0) : null;
    if (!local) return null;
    const a = (l.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = l.w / 2, cy = l.h / 2;
    return V.transform(local, (x, y) => ({ x: l.x + cx + (x - cx) * c - (y - cy) * s, y: l.y + cy + (x - cx) * s + (y - cy) * c }));
  }

  /* ── text ─────────────────────────────────────────────── */
  const TRACKLESS = typeof CanvasRenderingContext2D !== "undefined" && !("letterSpacing" in CanvasRenderingContext2D.prototype);

  // Where every letter goes. Straight text is lines; bent text and text on a
  // path are one line of letters, each placed on its own.
  //   → { mode: "lines", lines, w, h } | { mode: "letters", letters, chars, adv, box, docSpace }
  function textLayout(ctx, l, doc) {
    ctx.save();
    ctx.font = fontOf(l);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    const track = l.track || 0;
    const onto = l.on && doc ? doc.layers.find((x) => x.id === l.on && x.id !== l.id) : null;
    const bent = Math.abs(l.bend || 0) >= 0.5;
    if (!onto && !bent) {
      if ("letterSpacing" in ctx) ctx.letterSpacing = track + "px";
      const lines = String(l.text).split("\n");
      const w = Math.max(8, ...lines.map((s) => ctx.measureText(s).width + (TRACKLESS ? track * s.length : 0)));
      ctx.restore();
      return { mode: "lines", lines, w: Math.ceil(w), h: Math.ceil(lines.length * l.size * 1.15) };
    }
    const chars = Array.from(String(l.text).replace(/\s*\n\s*/g, " "));
    const adv = chars.map((ch) => ctx.measureText(ch).width + track);
    const m = ctx.measureText("Hg");
    const asc = m.fontBoundingBoxAscent || l.size * 0.82, desc = m.fontBoundingBoxDescent || l.size * 0.24;
    ctx.restore();
    let letters, docSpace = false;
    const outline = onto && pathInDoc(onto);
    if (outline && outline.length) {
      const samp = V.sampler(outline[0]);
      const total = adv.reduce((s, w) => s + w, 0);
      const off = (l.offset || 0) / 100 * samp.len;
      const start = l.align === "center" ? (samp.len - total) / 2 + off : l.align === "right" ? samp.len - total - off : off;
      letters = V.onPath(adv, samp, start);
      docSpace = true;
    } else letters = V.bend(adv, l.bend).letters;
    const box = V.lettersBox(letters, adv, asc, desc);
    return { mode: "letters", letters, chars, adv, box, docSpace, asc, desc };
  }

  // Text layers size themselves to their content, so the selection box and
  // hit-testing match what is drawn. Text on a path also says where it is.
  function measureText(ctx, l, doc) {
    const t = textLayout(ctx, l, doc);
    if (t.mode === "lines") return { w: t.w, h: t.h };
    const out = { w: Math.max(4, Math.ceil(t.box.w)), h: Math.max(4, Math.ceil(t.box.h)) };
    if (t.docSpace) { out.x = Math.floor(t.box.x); out.y = Math.floor(t.box.y); }
    return out;
  }

  function drawLetters(ctx, l, t, fill, stroke) {
    ctx.font = fontOf(l);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    t.letters.forEach((g, i) => {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.a);
      // Tracking is part of each advance; the letter sits in the middle of its
      // own width, so shift it back by half the tracking.
      const x = -(l.track || 0) / 2;
      if (fill) { ctx.fillStyle = fill; ctx.fillText(t.chars[i], x, 0); }
      if (stroke) ctx.strokeText(t.chars[i], x, 0);
      ctx.restore();
    });
  }

  /* ── one layer ────────────────────────────────────────── */
  function drawLayer(ctx, l, opts = {}) {
    if (l.hidden) return;
    if (l.type === "subject" && !opts.editor) return;       // never part of the picture
    drawOne(ctx, l, opts);
    const m = l.mirror;
    if (!m || l.type === "subject") return;
    const again = (tx, ty, sx, sy) => { ctx.save(); ctx.translate(tx, ty); ctx.scale(sx, sy); drawOne(ctx, l, opts); ctx.restore(); };
    if (m.v != null) again(2 * m.v, 0, -1, 1);
    if (m.h != null) again(0, 2 * m.h, 1, -1);
    if (m.v != null && m.h != null) again(2 * m.v, 2 * m.h, -1, -1);
  }

  function drawOne(ctx, l, opts) {
    ctx.save();
    ctx.globalAlpha = l.opacity;
    const stroke = l.strokeW > 0 && l.stroke ? l.stroke : null;

    // Text set along a path is placed in document space, not in its own box.
    if (l.type === "text" && l.on && opts.doc) {
      const t = textLayout(ctx, l, opts.doc);
      if (t.mode === "letters" && t.docSpace) {
        const fill = paintOf(ctx, l.fill, t.box.w, t.box.h);
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = l.strokeW; }
        drawLetters(ctx, l, t, fill, stroke);
        ctx.restore();
        return;
      }
    }

    ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
    if (l.rot) ctx.rotate(l.rot * Math.PI / 180);
    ctx.translate(-l.w / 2, -l.h / 2);

    const fill = paintOf(ctx, l.fill, l.w, l.h);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = l.strokeW; ctx.lineJoin = "round"; }

    if (l.type === "rect") {
      const r = Math.max(0, Math.min(l.radius || 0, l.w / 2, l.h / 2));
      if (r > 0 && ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(0, 0, l.w, l.h, r);
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) {
          const sw = l.strokeW;
          ctx.beginPath(); ctx.roundRect(sw / 2, sw / 2, Math.max(0, l.w - sw), Math.max(0, l.h - sw), Math.max(0, r - sw / 2));
          ctx.stroke();
        }
      } else {
        if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, l.w, l.h); }
        if (stroke) ctx.strokeRect(l.strokeW / 2, l.strokeW / 2, l.w - l.strokeW, l.h - l.strokeW);
      }
    } else if (l.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(l.w / 2, l.h / 2, Math.max(0, l.w / 2 - l.strokeW / 2), Math.max(0, l.h / 2 - l.strokeW / 2), 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) ctx.stroke();
    } else if (l.type === "path" || l.type === "polygon") {
      if (l.type === "polygon" || l.d) {
        const p = path2D(l);
        if (fill) { ctx.fillStyle = fill; ctx.fill(p, l.fillRule === "evenodd" ? "evenodd" : "nonzero"); }
        if (stroke) ctx.stroke(p);
        // A path with no paint at all is a track for text, or a line waiting
        // for a stroke: the editor shows it as a hairline so it can be found.
        if (!fill && !stroke && opts.editor) {
          ctx.lineWidth = 1 / (opts.zoom || 1); ctx.strokeStyle = "rgba(16,132,208,.75)"; ctx.setLineDash([4 / (opts.zoom || 1), 3 / (opts.zoom || 1)]);
          ctx.stroke(p);
        }
      }
    } else if (l.type === "image") {
      const img = imageFor(l.src);
      if (img) ctx.drawImage(img, 0, 0, l.w, l.h);
      else { ctx.fillStyle = "#D8D8D8"; ctx.fillRect(0, 0, l.w, l.h); }
      if (stroke) ctx.strokeRect(l.strokeW / 2, l.strokeW / 2, l.w - l.strokeW, l.h - l.strokeW);
    } else if (l.type === "subject") {
      // A dashed box with its name on a tab: where you drew them, nothing more.
      const z = opts.zoom || 1;
      ctx.setLineDash([6 / z, 4 / z]);
      ctx.lineWidth = 1.5 / z;
      ctx.strokeStyle = "rgba(106,47,176,.9)";
      ctx.strokeRect(0, 0, l.w, l.h);
      ctx.setLineDash([]);
      // The name tab sits outside the box when there is room, so it never
      // covers the drawing; a narrow box gets an initial instead of a name.
      const fs = 8 / z, pad = 3 / z, tabH = fs + 2 * pad;
      ctx.font = "700 " + fs + "px Silkscreen, monospace";
      let text = String(l.label).split(" — ")[0];
      if (ctx.measureText(text).width + 2 * pad > l.w + 10 / z) text = text.charAt(0);
      const tw = ctx.measureText(text).width + 2 * pad;
      const docH = opts.docH || Infinity;
      const ty = l.y >= tabH ? -tabH : l.y + l.h + tabH <= docH ? l.h : l.h - tabH;
      ctx.fillStyle = "rgba(106,47,176,.9)";
      ctx.fillRect(0, ty, tw, tabH);
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "top";
      ctx.fillText(text, pad, ty + pad);
    } else if (l.type === "text") {
      const t = textLayout(ctx, l, opts.doc);
      if (t.mode === "letters") {
        ctx.translate(-t.box.x, -t.box.y);
        drawLetters(ctx, l, t, fill, stroke);
      } else {
        ctx.font = fontOf(l);
        if ("letterSpacing" in ctx) ctx.letterSpacing = (l.track || 0) + "px";
        ctx.textBaseline = "top";
        ctx.textAlign = l.align;
        const x = l.align === "center" ? l.w / 2 : l.align === "right" ? l.w : 0;
        t.lines.forEach((s, i) => {
          const y = i * l.size * 1.15;
          if (fill) { ctx.fillStyle = fill; ctx.fillText(s, x, y); }
          if (stroke) ctx.strokeText(s, x, y);
        });
      }
    }
    ctx.restore();
  }

  // Draws the document at `scale` with its top-left at the context origin.
  // opts.board: false leaves out the background and checker (the editor
  // paints its own pasteboard and board).
  function draw(ctx, doc, opts = {}) {
    const scale = opts.scale || 1;
    ctx.save();
    ctx.scale(scale, scale);
    if (doc.mode === "pixel") {
      ctx.imageSmoothingEnabled = false;
      if (opts.checker !== false) checker(ctx, doc.w, doc.h, Math.max(1, Math.round(8 / scale)));
      if (doc.bg) { ctx.fillStyle = doc.bg; ctx.fillRect(0, 0, doc.w, doc.h); }
      for (let y = 0; y < doc.h; y++) {
        for (let x = 0; x < doc.w; x++) {
          const c = doc.bitmap[y * doc.w + x];
          if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
        }
      }
    } else {
      if (opts.board !== false) {
        if (doc.bg) { ctx.fillStyle = paintOf(ctx, doc.bg, doc.w, doc.h); ctx.fillRect(0, 0, doc.w, doc.h); }
        else if (opts.checker !== false) checker(ctx, doc.w, doc.h, 10);
      }
      const lo = Object.assign({ docH: doc.h, doc }, opts);
      if (opts.clip) { ctx.beginPath(); ctx.rect(0, 0, doc.w, doc.h); ctx.clip(); }
      for (const l of doc.layers) drawLayer(ctx, l, lo);
    }
    ctx.restore();
  }

  function checker(ctx, w, h, cell) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#E4E4E4";
    for (let y = 0; y < h; y += cell) for (let x = (y / cell) % 2 ? cell : 0; x < w; x += cell * 2) ctx.fillRect(x, y, cell, cell);
  }

  // PNG export. Pixel docs export at a whole-number scale only — a non-integer
  // scale would resample and soften the art (see the pixel-assets skill).
  // Only the artboard is exported: work left out on the pasteboard is not.
  function toPNG(doc, scale = 1) {
    const s = doc.mode === "pixel" ? Math.max(1, Math.round(scale)) : scale;
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(doc.w * s));
    cv.height = Math.max(1, Math.round(doc.h * s));
    const ctx = cv.getContext("2d");
    draw(ctx, doc, { scale: s, checker: false });
    return cv.toDataURL("image/png");
  }

  function thumb(doc, px = 96) {
    const s = Math.min(px / doc.w, px / doc.h);
    return toPNG(doc, doc.mode === "pixel" ? Math.max(1, Math.floor(s)) : s);
  }

  return {
    draw, drawLayer, measureText, textLayout, pathInDoc, fontOf, toPNG, thumb, imageFor, checker,
    // One layer on its own, onto a fresh canvas — the shape builder's masks
    // and the likeness check both start here. Its mirror comes with it.
    layerMask(l, w, h, scale = 1, ox = 0, oy = 0, doc = null) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.ceil(w * scale)); cv.height = Math.max(1, Math.ceil(h * scale));
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale);
      drawLayer(ctx, Object.assign({}, l, { opacity: 1 }), { doc });
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const mask = new Uint8Array(cv.width * cv.height);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
      return { mask, w: cv.width, h: cv.height, scale, ox, oy };
    },
    onImageReady: (cb) => { onImageReady = cb; },
  };
})();
