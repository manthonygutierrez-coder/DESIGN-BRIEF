"use strict";
/* ── suite renderer ───────────────────────────────────────
 * Draws a SuiteDoc onto a 2D canvas context. One renderer for the editor view,
 * thumbnails and PNG export, so what you see is exactly what gets delivered.
 *
 * Text is always drawn with fillText — document content never becomes markup.
 */

const SuiteRender = (() => {
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

  const fontOf = (l) => (l.weight || 400) + " " + l.size + "px \"" + String(l.font).replace(/"/g, "") + "\", Archivo, sans-serif";

  // Text layers size themselves to their content, so the selection box and
  // hit-testing match what is drawn.
  function measureText(ctx, l) {
    ctx.save();
    ctx.font = fontOf(l);
    if ("letterSpacing" in ctx) ctx.letterSpacing = (l.track || 0) + "px";
    const lines = String(l.text).split("\n");
    const w = Math.max(8, ...lines.map((s) => ctx.measureText(s).width));
    ctx.restore();
    return { w: Math.ceil(w), h: Math.ceil(lines.length * l.size * 1.15) };
  }

  function drawLayer(ctx, l, opts = {}) {
    if (l.hidden) return;
    if (l.type === "subject" && !opts.editor) return;       // never part of the picture
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.translate(l.x + l.w / 2, l.y + l.h / 2);
    if (l.rot) ctx.rotate(l.rot * Math.PI / 180);
    ctx.translate(-l.w / 2, -l.h / 2);

    const fill = paintOf(ctx, l.fill, l.w, l.h);
    const stroke = l.strokeW > 0 && l.stroke ? l.stroke : null;
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = l.strokeW; }

    if (l.type === "rect") {
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, l.w, l.h); }
      if (stroke) ctx.strokeRect(l.strokeW / 2, l.strokeW / 2, l.w - l.strokeW, l.h - l.strokeW);
    } else if (l.type === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(l.w / 2, l.h / 2, Math.max(0, l.w / 2 - l.strokeW / 2), Math.max(0, l.h / 2 - l.strokeW / 2), 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) ctx.stroke();
    } else if (l.type === "path") {
      if (l.d) {
        ctx.save();
        ctx.scale(l.w / l.box, l.h / l.box);
        const p = new Path2D(l.d);
        if (fill) { ctx.fillStyle = paintOf(ctx, l.fill, l.box, l.box); ctx.fill(p, l.fillRule === "evenodd" ? "evenodd" : "nonzero"); }
        if (stroke) { ctx.lineWidth = l.strokeW * l.box / Math.max(l.w, l.h); ctx.stroke(p); }
        ctx.restore();
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
      ctx.font = fontOf(l);
      if ("letterSpacing" in ctx) ctx.letterSpacing = (l.track || 0) + "px";
      ctx.textBaseline = "top";
      ctx.textAlign = l.align;
      const x = l.align === "center" ? l.w / 2 : l.align === "right" ? l.w : 0;
      String(l.text).split("\n").forEach((s, i) => {
        const y = i * l.size * 1.15;
        if (fill) { ctx.fillStyle = fill; ctx.fillText(s, x, y); }
        if (stroke) ctx.strokeText(s, x, y);
      });
    }
    ctx.restore();
  }

  // Draws the document at `scale` with its top-left at the context origin.
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
      if (doc.bg) { ctx.fillStyle = paintOf(ctx, doc.bg, doc.w, doc.h); ctx.fillRect(0, 0, doc.w, doc.h); }
      else if (opts.checker !== false) checker(ctx, doc.w, doc.h, 10);
      const lo = Object.assign({ docH: doc.h }, opts);
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
  function toPNG(doc, scale = 1) {
    const s = doc.mode === "pixel" ? Math.max(1, Math.round(scale)) : scale;
    const cv = document.createElement("canvas");
    cv.width = Math.round(doc.w * s);
    cv.height = Math.round(doc.h * s);
    const ctx = cv.getContext("2d");
    draw(ctx, doc, { scale: s, checker: false });
    return cv.toDataURL("image/png");
  }

  function thumb(doc, px = 96) {
    const s = Math.min(px / doc.w, px / doc.h);
    return toPNG(doc, doc.mode === "pixel" ? Math.max(1, Math.floor(s)) : s);
  }

  return {
    draw, drawLayer, measureText, toPNG, thumb, imageFor,
    // One layer on its own, onto a fresh canvas — the shape builder's masks
    // and the likeness check both start here.
    layerMask(l, w, h, scale = 1, ox = 0, oy = 0) {
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.ceil(w * scale)); cv.height = Math.max(1, Math.ceil(h * scale));
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale);
      drawLayer(ctx, Object.assign({}, l, { opacity: 1 }));
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const mask = new Uint8Array(cv.width * cv.height);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
      return { mask, w: cv.width, h: cv.height, scale, ox, oy };
    },
    onImageReady: (cb) => { onImageReady = cb; },
  };
})();
