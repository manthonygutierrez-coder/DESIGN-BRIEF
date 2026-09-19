"use strict";
/* ── likeness: is that them? ──────────────────────────────
 * The on-model need is judged by eye, the way a fan would judge it. Nobody
 * traces; the player draws Toma from a reference pinned beside the canvas.
 * This compares what they drew with the model sheet, and forgives exactly
 * what a good drawing by eye gets wrong: where it is, how big it is, and a
 * pixel of wobble at every edge.
 *
 *   1. find the drawing's tight bounds
 *   2. scale it uniformly to the pose's height, centred
 *   3. score, with one pixel of tolerance everywhere:
 *        shape        the silhouette's overlap (F1). A standing figure is
 *                     roughly a column, so this alone says little — it is
 *                     the smaller share.
 *        palette      the colour regions (hair, band, skin, kit…): is each
 *                     one in the right place, in the right colour? F1 per
 *                     region, weighted by √area so the band and the eyes
 *                     count for more than their size. Outlines are left out:
 *                     nobody drawing a banner by eye inks 1-pixel lines.
 *                     Shadow tones are a bonus, never a requirement.
 *        proportions  the drawing's aspect against the pose's; 6% free, then
 *                     falling to nothing at 31% off
 *
 * Colour within the lines, with the right palette, at the right scale — that
 * is the whole score, measured without ever showing the player a line.
 * Pure; runs under node.
 */

const HustleLikeness = (() => {
  const TOL = 40;                                      // RGB distance still "that colour"
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const W = { shape: 0.3, palette: 0.5, proportions: 0.2 };
  const LINE_HEX = "#2A1E24";

  const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  function tight(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (img.rgba[(y * img.w + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function dilate(m, w, h) {
    const out = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1;
      }
    }
    return out;
  }

  // Precision and recall with a pixel of slack, combined.
  function f1(ref, pl, w, h) {
    let nr = 0, np = 0, hitP = 0, hitR = 0;
    const dr = dilate(ref, w, h), dp = dilate(pl, w, h);
    for (let i = 0; i < ref.length; i++) {
      if (pl[i]) { np++; if (dr[i]) hitP++; }
      if (ref[i]) { nr++; if (dp[i]) hitR++; }
    }
    if (!nr && !np) return 1;
    if (!nr || !np) return 0;
    const P = hitP / np, R = hitR / nr;
    return P + R ? (2 * P * R) / (P + R) : 0;
  }

  /* ref:  Characters.reference(id, pose) — { w, h, rgba, base[], alt[], keys[] }
   * draw: { w, h, rgba } — the player's subject, rendered on its own */
  function compare(ref, draw) {
    const zero = { shape: 0, palette: 0, proportions: 0, quality: 0, iou: 0, drawn: null };
    if (!ref || !draw) return zero;
    const b = tight(draw);
    if (!b) return zero;

    // One grid: the reference as drawn, the drawing scaled to its height.
    const s = ref.h / b.h;
    const dw = b.w * s;
    const G = Math.max(ref.w, Math.ceil(dw)) + 2, H = ref.h, N = G * H;
    const ro = Math.floor((G - ref.w) / 2), po = (G - dw) / 2;
    const refSil = new Uint8Array(N), plSil = new Uint8Array(N);
    const refRegion = new Array(N).fill(null), refHex = new Array(N).fill(null);
    const plHex = new Array(N).fill(null), plRGB = new Array(N).fill(null);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < G; x++) {
        const i = y * G + x, rx = x - ro;
        if (rx >= 0 && rx < ref.w) {
          const ri = y * ref.w + rx;
          if (ref.rgba[ri * 4 + 3] >= 128) {
            refSil[i] = 1;
            const hex = hexOf(ref.rgba[ri * 4], ref.rgba[ri * 4 + 1], ref.rgba[ri * 4 + 2]);
            if (hex !== LINE_HEX) { refRegion[i] = ref.base[ri] || hex; refHex[i] = hex; }
          }
        }
        const sx = Math.floor(b.x + (x + 0.5 - po) / s), sy = Math.floor(b.y + (y + 0.5) / s);
        if (sx >= b.x && sx < b.x + b.w && sy >= b.y && sy < b.y + b.h) {
          const k = (sy * draw.w + sx) * 4;
          if (draw.rgba[k + 3] >= 128) {
            plSil[i] = 1;
            plRGB[i] = [draw.rgba[k], draw.rgba[k + 1], draw.rgba[k + 2]];
          }
        }
      }
    }

    // Each region accepts its tones and their episode-12 dusk versions.
    const accept = new Map();                          // region -> Set(hex)
    for (let ri = 0; ri < ref.w * ref.h; ri++) {
      if (ref.rgba[ri * 4 + 3] < 128) continue;
      const hex = hexOf(ref.rgba[ri * 4], ref.rgba[ri * 4 + 1], ref.rgba[ri * 4 + 2]);
      if (hex === LINE_HEX) continue;
      const region = ref.base[ri] || hex;
      if (!accept.has(region)) accept.set(region, new Set());
      accept.get(region).add(hex);
      if (ref.alt && ref.alt[ri]) accept.get(region).add(ref.alt[ri]);
    }
    const tones = [...accept.entries()].map(([region, set]) => [region, [...set].map((h) => [h, rgbOf(h)])]);

    // Each drawn pixel goes to its nearest tone, with the line colour as a
    // class of its own — otherwise a dark outline would read as dark hair.
    // A hex shared by two regions (kit white and eye light) belongs to both.
    const inRegion = new Map(tones.map(([r]) => [r, new Uint8Array(N)]));
    const lineRGB = rgbOf(LINE_HEX);
    for (let i = 0; i < N; i++) {
      if (!plRGB[i]) continue;
      let best = dist(plRGB[i], lineRGB), bestHex = LINE_HEX;
      for (const [, list] of tones) for (const [h, rgb] of list) {
        const d = dist(plRGB[i], rgb);
        if (d < best) { best = d; bestHex = h; }
      }
      if (best > TOL || bestHex === LINE_HEX) continue;
      plHex[i] = bestHex;
      for (const [region, list] of tones) if (list.some(([h]) => h === bestHex)) inRegion.get(region)[i] = 1;
    }

    // palette: region by region, weighted by √area
    let wsum = 0, psum = 0, toneHits = 0, toneN = 0;
    for (const [region] of tones) {
      const R = new Uint8Array(N);
      let area = 0;
      for (let i = 0; i < N; i++) if (refRegion[i] === region) { R[i] = 1; area++; }
      if (!area) continue;
      const wr = Math.sqrt(area);
      wsum += wr;
      psum += wr * f1(R, inRegion.get(region), G, H);
      // tone: on pixels where this region was drawn in its place, the exact
      // tone (base or shadow) counts 1, the other tone of the region 0.6
      for (let i = 0; i < N; i++) {
        if (!R[i] || !inRegion.get(region)[i]) continue;
        toneN++;
        toneHits += plHex[i] === refHex[i] ? 1 : 0.6;
      }
    }
    const regionF1 = wsum ? psum / wsum : 0;
    const tone = toneN ? toneHits / toneN : 0;
    const palette = regionF1 * (0.85 + 0.15 * tone);

    const sil = f1(refSil, plSil, G, H);
    const shape = clamp01((sil - 0.5) / 0.45);

    const ratio = (b.w / b.h) / (ref.w / ref.h);
    // 6% free: a figure drawn without the model sheet's 1-pixel outline is
    // that much slimmer, and that is not a proportion mistake.
    const proportions = clamp01(1 - Math.max(0, Math.abs(ratio - 1) - 0.06) / 0.25);
    const quality = W.shape * shape + W.palette * palette + W.proportions * proportions;
    return { shape, palette, proportions, quality, iou: sil, regions: regionF1, tone, drawn: b };
  }

  // Two characters drawn at one scale keep canon's height difference.
  function relativeScale(heightA, heightB, canonA, canonB, tol = 0.06) {
    if (!heightA || !heightB) return null;
    return Math.abs((heightB / heightA) / (canonB / canonA) - 1) <= tol;
  }

  return { compare, relativeScale, tight, TOL, WEIGHTS: W };
})();

if (typeof module !== "undefined") module.exports = HustleLikeness;
