"use strict";
/* ── the cascade: what the start screen is made of ────────
 * Pixel Crossing starts in a cascade of coloured cells falling down the
 * screen. The loading bar, the band under the name and the frames of the two
 * choices are drawn in those cells. The logo is not: it is vector, smooth
 * and thin on a disc the cascade leaves clear for it, on purpose against the
 * cells. The name is set in Press Start 2P on its band. This file is the
 * pure part: the colours, the logo, where things go, and when a front
 * reaches a row. crossing.js draws it and runs the screen.
 *
 *   CELL                        a cell's size in px: 13 × 1.2
 *   BERRY, TIDE                 the two cascades: candy apple reds and berries at
 *                               boot, cobalt, blues and greens while you choose
 *   LOGO_INK                    the logo's lavender
 *   STRANDS, logoSVG(w)         the logo as strokes, and as SVG
 *   nameSize(cols, cellPx, k)   the name's size in px (a multiple of 8), and its cells
 *   layout(cols, rows, mode, cellPx)  where the logo, name, bar and cards sit, in cells
 *   columns(cols, seed, kind)   each column's delay and speed for a front
 *   frontRow(col, c, t, rows)   how far down column c a front is at t (0…1)
 *   rgb(hex), mix(a, b, t), hash(c, y), pick(pal, h)
 *
 * Pure: no DOM.
 */

const Cascade = (() => {
  const CELL = 15.6;

  /* ── colours ─────────────────────────────────────────────
   * Tune the look here. Each cascade is six cell colours (the last two are its
   * light and dark accents, and the light one is kept rare), a highlight for
   * the falling fronts and the few glints, and an ink for the disc, the band
   * and the insides of the cards. All are bright colours desaturated by a
   * tenth (HSL saturation × 0.9), and weighted to the first and the last:
   *   BERRY  candy apple red 357°, crimson 346°, raspberry 336°, berry 328°,
   *          blush 342° (light), plum 320° (dark)
   *   TIDE   azure 206°, cyan 190°, teal 172°, sea green 150°,
   *          aqua 182° (light), cobalt 215° (dark, and the most of it)       */
  const BERRY = {
    name: "berry",
    cells: ["#ED0C18", "#F20D42", "#F53D87", "#E40C7F", "#F98BAC", "#810E5B"],
    weights: [0.34, 0.18, 0.12, 0.16, 0.04, 0.16],
    hi: "#FDDDE2", ink: "#1E0514",
  };
  const TIDE = {
    name: "tide",
    cells: ["#2A9CF4", "#0DCCF2", "#0BCBB2", "#0CDF75", "#81F4F8", "#094EAE"],
    weights: [0.16, 0.12, 0.14, 0.16, 0.04, 0.38],
    hi: "#D8FDFD", ink: "#05141E",
  };
  // The logo's own lavender, and a lighter one for the name.
  const LOGO_INK = "#BFBCDE", WORD_INK = "#E4E2F4";

  /* ── the logo ────────────────────────────────────────────
   * The mark is a knot on a 45° lattice. Turned upright it is this 13 × 13
   * grid: four rings, each with a tail towards the middle, round a crossing,
   * the same after a quarter turn. It is drawn as strokes through the cells'
   * centres, turned back 45°: thin, and with every gap and every ring's hole
   * the same width. QUARTER is one ring, its tail and half the crossing, each
   * in the order it draws itself in; the rest is the same turned about the
   * middle. Points are [column, row].                                      */
  const LATTICE = [
    "......###....",
    "......#.#....",
    "......###....",
    "........#....",
    "#####.#.#....",
    "#.#...#......",
    "###.#####.###",
    "......#...#.#",
    "....#.#.#####",
    "....#........",
    "....###......",
    "....#.#......",
    "....###......",
  ];
  const turn = ([c, r]) => [r, LATTICE.length - 1 - c];
  const QUARTER = [
    { kind: "ring", closed: true, pts: [[7, 0], [8, 0], [8, 2], [6, 2], [6, 0]] },   // from the middle of its outer edge
    { kind: "tail", pts: [[8, 2], [8, 4]] },                                        // from the ring towards the middle
    { kind: "cross", pts: [[6, 6], [6, 4]] },                                       // out from the middle
  ];
  const STRANDS = [0, 1, 2, 3].flatMap((q) => QUARTER.map((s) => ({
    kind: s.kind, closed: !!s.closed,
    pts: s.pts.map((p) => { for (let n = 0; n < q; n++) p = turn(p); return p; }),
  })));
  // A strand as path data. Its free end runs `reach` past the last centre.
  function strandPath(s, reach) {
    const p = s.pts.map((q) => q.slice());
    if (!s.closed) {
      const a = p[p.length - 2], b = p[p.length - 1];
      b[0] += Math.sign(b[0] - a[0]) * reach;
      b[1] += Math.sign(b[1] - a[1]) * reach;
    }
    return "M" + p.map((q) => q.join(" ")).join("L") + (s.closed ? "Z" : "");
  }
  // The mark as SVG. The matrix turns the lattice 45° (at 1/√2 its size); the
  // view is LOGO.view units square round the middle, so the mark keeps a
  // margin inside the disc. w is the stroke in lattice cells; free ends run
  // w/2 past their centres, so every gap and hole is 2 − w wide. Each stroke
  // has a pathLength of 1, to draw itself in with a dash.
  const LOGO = { w: 0.56, view: 12 };
  function logoSVG(w = LOGO.w) {
    const v = LOGO.view, c = (LATTICE.length - 1) / 2;
    return '<svg viewBox="' + [c - v / 2, -v / 2, v, v].join(" ") + '" aria-hidden="true" focusable="false">' +
      '<g transform="matrix(.5 .5 .5 -.5 0 0)" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linejoin="miter">' +
      STRANDS.map((s) => '<path pathLength="1" data-k="' + s.kind + '" d="' + strandPath(s, w / 2) + '"/>').join("") +
      "</g></svg>";
  }

  /* ── where things go ─────────────────────────────────────
   * In whole cells, for cells of about 16 px. "boot": the logo's disc, the
   * name on its band and a loading bar, in the middle. "choose": a smaller
   * disc higher up, and two cards under the name, side by side or, on a
   * narrow screen, one above the other. "saver": the disc and the name alone
   * (the screen saver moves them). Everything doubles on a big screen; the
   * disc shrinks to fit a short one, and while choosing goes altogether on a
   * very short one, so the cards always fit. The name steps down in 8 px.  */
  const NAME = "PIXEL CROSSING";
  // The name in Press Start 2P, which is drawn on an 8 px grid: the biggest
  // multiple of 8 that fits, and the cells it covers. Each letter, the space
  // too, is one em wide.
  function nameSize(cols, cellPx = CELL, k = 1) {
    const room = (cols - 4) * cellPx;
    let px = k > 1 ? 48 : 24;
    while (px > 8 && NAME.length * px > room) px -= 8;
    return { px, w: Math.ceil((NAME.length * px) / cellPx), h: Math.ceil(px / cellPx) };
  }
  function layout(cols, rows, mode = "boot", cellPx = CELL) {
    const k = cols >= 120 && rows >= 78 ? 2 : 1;
    const side = cols >= 40;
    const cardW = side ? Math.min(24, Math.floor((cols - 5) / 2)) : Math.min(cols - 4, 28);
    const cardH = side ? 8 : 7, cardsH = side ? cardH : cardH * 2 + 1;
    const name = nameSize(cols, cellPx, k), bandW = name.w + 2, bandH = name.h + 2;
    const gap = (mode === "choose" ? 1 : 2) * k;                 // between the disc and the band
    const rest = bandH + (mode === "choose" ? 3 * k + cardsH : mode === "boot" ? 3 * k : 0);
    let d = Math.min((mode === "choose" ? 19 : 27) * k, cols - 2, rows - 2 - rest - gap);
    const showLogo = mode !== "choose" || d >= 11;
    d = showLogo ? Math.max(9, d) : 0;
    const total = (showLogo ? d + gap : 0) + rest;
    const out = { mode, k, cols, rows, logo: null, band: null, word: null, bar: null, cards: null, stack: !side };
    let y = Math.max(1, Math.floor((rows - total) / 2));
    if (showLogo) { out.logo = { x: Math.floor((cols - d) / 2), y, w: d, h: d }; y += d + gap; }
    out.band = { x: Math.floor((cols - bandW) / 2), y, w: bandW, h: bandH };
    out.word = { x: out.band.x + 1, y: y + 1, w: name.w, h: name.h, px: name.px };
    y += bandH;
    if (mode === "boot") out.bar = { x: out.band.x, y: y + 2 * k, w: bandW, h: k };
    else if (mode === "choose") {
      y += 3 * k;
      out.cards = side
        ? [0, 1].map((i) => ({ x: Math.floor((cols - (cardW * 2 + 3)) / 2) + i * (cardW + 3), y, w: cardW, h: cardH }))
        : [0, 1].map((i) => ({ x: Math.floor((cols - cardW) / 2), y: y + i * (cardH + 1), w: cardW, h: cardH }));
    }
    return out;
  }

  /* ── fronts ──────────────────────────────────────────────
   * A front sweeps down every column: each column starts after its own
   * delay and falls at its own speed, scaled so the last column is down by
   * t = 1. "rain" starts anywhere, "centre" starts in the middle and spreads,
   * "sweep" runs left to right like the old waterfall.                      */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function columns(cols, seed = 1, kind = "rain") {
    const r = rng(seed), dl = new Float32Array(cols), sp = new Float32Array(cols), vs = new Float32Array(cols);
    for (let c = 0; c < cols; c++) {
      const f = cols > 1 ? c / (cols - 1) : 0;
      dl[c] = kind === "centre" ? Math.abs(f - 0.5) * 0.5 + r() * 0.18 : kind === "sweep" ? f * 0.34 + r() * 0.14 : r() * 0.42;
      sp[c] = 0.9 + r() * 0.6;
      vs[c] = 4 + r() * 7;                               // cells a second while the cascade holds
    }
    let worst = 0;
    for (let c = 0; c < cols; c++) worst = Math.max(worst, 1 / ((1 - dl[c]) * sp[c]));
    return { kind, dl, sp, vs, gain: worst };
  }
  // Rows from the top the front has reached in column c (it runs a little past the bottom).
  const frontRow = (col, c, t, rows) => Math.max(0, (t - col.dl[c]) * col.sp[c] * col.gain) * (rows + 2);

  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function hash(c, y) {
    let h = (c * 374761393 + y * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }
  // A palette's colour for a hash, by its weights.
  function pick(pal, h) {
    let r = (h % 1000) / 1000;
    for (let i = 0; i < pal.cells.length; i++) { r -= pal.weights[i]; if (r < 0) return i; }
    return pal.cells.length - 1;
  }

  return { CELL, BERRY, TIDE, LOGO_INK, WORD_INK, LATTICE, STRANDS, LOGO, NAME, strandPath, logoSVG, nameSize, layout, rng, columns, frontRow, rgb, mix, hash, pick };
})();

if (typeof module !== "undefined") module.exports = Cascade;
