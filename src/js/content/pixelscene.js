"use strict";
/* ── painting a planned picture ───────────────────────────
 * Takes an ImagePlan and paints it the way the rest of the game paints
 * people: small, lit, and scaled up by a whole number so every pixel stays
 * square. A thumbnail is about 100 × 75 real pixels; the lightbox is the same
 * picture with more of them.
 *
 * Light comes from the upper left and is tinted by the time of day. Shadows
 * lean cool and highlights warm, and anything further back is mixed toward the
 * haze, so distance reads the way it does in the call feeds.
 */

const PixelScene = (() => {
  /* ── colour ─────────────────────────────────────────── */
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).slice(i, i + 2), 16) || 0);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

  /* Five tones for one material: deep shadow → highlight. */
  function ramp(base, L, haze = 0){
    let c = typeof base === "string" ? rgb(base) : base;
    if (haze > 0) c = mix(c, L.haze, haze);
    const cool = L.shadow, warm = L.light;
    return [
      mix(mix(c, cool, 0.4), [0, 0, 0], 0.5),
      mix(mix(c, cool, 0.25), [0, 0, 0], 0.24),
      c,
      mix(c, warm, 0.3),
      mix(c, warm, 0.62),
    ];
  }

  /* ── the buffer ─────────────────────────────────────── */
  function buffer(w, h){ return { w, h, d: new Float32Array(w * h * 3), m: new Uint8Array(w * h) }; }
  function set(b, x, y, c, a = 1, mark = 0){
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return;
    const i = (y * b.w + x) * 3;
    if (a >= 1){ b.d[i] = c[0]; b.d[i + 1] = c[1]; b.d[i + 2] = c[2]; }
    else { b.d[i] += (c[0] - b.d[i]) * a; b.d[i + 1] += (c[1] - b.d[i + 1]) * a; b.d[i + 2] += (c[2] - b.d[i + 2]) * a; }
    if (mark) b.m[y * b.w + x] = mark;
  }
  const get = (b, x, y) => { const i = ((y | 0) * b.w + (x | 0)) * 3; return [b.d[i], b.d[i + 1], b.d[i + 2]]; };

  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];

  /* A continuous tone 0..1 picked from a five-step ramp, dithered between steps. */
  function tone(r, t, x, y){
    const f = Math.max(0, Math.min(0.999, t)) * 4, i = f | 0;
    return r[Math.min(4, i + (f - i > bayer(x, y) ? 1 : 0))];
  }

  // Vertical gradient through any number of stops, banded and dithered like
  // an old GIF rather than smooth.
  function vgrad(b, x0, y0, x1, y1, stops, bands = 7){
    const cs = stops.map((s) => (typeof s === "string" ? rgb(s) : s));
    for (let y = Math.max(0, y0 | 0); y < Math.min(b.h, y1); y++){
      const t = (y - y0) / Math.max(1, y1 - y0);
      for (let x = Math.max(0, x0 | 0); x < Math.min(b.w, x1); x++){
        let q = t * bands; const qi = q | 0;
        q = (qi + (q - qi > bayer(x, y) ? 1 : 0)) / bands;
        const seg = Math.min(cs.length - 2, Math.floor(q * (cs.length - 1)));
        const local = q * (cs.length - 1) - seg;
        set(b, x, y, mix(cs[seg], cs[seg + 1], Math.min(1, local)));
      }
    }
  }

  /* ── lit shapes ─────────────────────────────────────── */
  const LX = -0.55, LY = -0.62, LZ = 0.56;

  // An ellipse shaded as a lit volume. `spin` skews the light for flat things.
  function ellipse(b, cx, cy, rx, ry, r, o = {}){
    if (rx < 0.5 || ry < 0.5) return;
    const flat = o.flat, bias = o.bias || 0, mark = o.mark === undefined ? 1 : o.mark;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++){
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
        if (d > 1) continue;
        let t;
        if (flat) t = 0.55 - v * 0.18 + bias;
        else { const nz = Math.sqrt(1 - d); t = 0.5 + 0.62 * (u * LX + v * LY + nz * LZ) - 0.12 + bias; }
        set(b, x, y, tone(r, t, x, y), o.alpha || 1, mark);
      }
    }
  }

  // Scanline polygon. `tone` sets the face's brightness; `grad` darkens toward
  // the bottom so even flat faces read as lit from above.
  function poly(b, pts, r, o = {}){
    const ys = pts.map((p) => p[1]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(b.h - 1, Math.ceil(Math.max(...ys)));
    const base = o.tone === undefined ? 0.55 : o.tone, g = o.grad === undefined ? 0.22 : o.grad;
    const mark = o.mark === undefined ? 1 : o.mark;
    for (let y = y0; y <= y1; y++){
      const yy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++){
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay) / (by - ay) * (bx - ax));
      }
      xs.sort((a, c) => a - c);
      const t = base - g * ((y - y0) / Math.max(1, y1 - y0) - 0.5);
      for (let k = 0; k + 1 < xs.length; k += 2){
        for (let x = Math.ceil(xs[k] - 0.5); x < xs[k + 1] - 0.5; x++) set(b, x, y, tone(r, t, x, y), o.alpha || 1, mark);
      }
    }
  }
  const rect = (b, x, y, w, h, r, o) => poly(b, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, o);

  function line(b, x0, y0, x1, y1, c, a = 1, mark = 0){
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 600; n++){
      set(b, x0, y0, c, a, mark);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy){ e += dy; x0 += sx; }
      if (e2 <= dx){ e += dx; y0 += sy; }
    }
  }

  // Darkens what is already there: contact shadows under things.
  function shadow(b, cx, cy, rx, ry, k = 0.4){
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++){
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v;
      if (d > 1 || x < 0 || y < 0 || x >= b.w || y >= b.h || b.m[y * b.w + x]) continue;
      if ((1 - d) * k * 1.6 < bayer(x, y) * 0.5) continue;
      const c = get(b, x, y); set(b, x, y, mix(c, [8, 10, 24], k * (1 - d * 0.6)));
    }
  }

  function glow(b, cx, cy, r, c, k = 0.5){
    const cc = typeof c === "string" ? rgb(c) : c;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++){
      if (x < 0 || y < 0 || x >= b.w || y >= b.h) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d >= 1) continue;
      const a = k * (1 - d) * (1 - d);
      if (a < bayer(x, y) * 0.08) continue;
      const cur = get(b, x, y);
      set(b, x, y, [Math.min(255, cur[0] + cc[0] * a), Math.min(255, cur[1] + cc[1] * a), Math.min(255, cur[2] + cc[2] * a)]);
    }
  }

  /* ── a 3 × 5 font, for signs and labels ─────────────── */
  const GLYPHS = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
    K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
    P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
    Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
    4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111",
    9: "111101111001110", "!": "010010010000010", "#": "101111101111101", "$": "011110010011110", " ": "000000000000000",
  };
  function text(b, str, x, y, c, s = 1, mark = 1){
    let cx = x;
    for (const ch of String(str).toUpperCase()){
      const g = GLYPHS[ch] || GLYPHS[" "];
      for (let i = 0; i < 15; i++) if (g[i] === "1")
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) set(b, cx + (i % 3) * s + dx, y + ((i / 3) | 0) * s + dy, c, 1, mark);
      cx += 4 * s;
    }
  }
  const textW = (str, s = 1) => String(str).length * 4 * s - s;

  const kit = { rgb, mix, lum, ramp, set, get, bayer, tone, vgrad, ellipse, poly, rect, line, shadow, glow, text, textW };

  /* ── light ──────────────────────────────────────────── */
  const TIME = {
    day:    { sky: ["#4F8FD0", "#8FC0E6", "#D4EAF4"], light: "#FFF1D0", shadow: "#34457A", haze: "#C8DCEA", sun: "#FFF6D8" },
    dawn:   { sky: ["#5D6FB0", "#D99AA8", "#FFD0A0"], light: "#FFD4A8", shadow: "#4E3F86", haze: "#E8BFB8", sun: "#FFE6B8" },
    dusk:   { sky: ["#2E2764", "#A04A7A", "#F2944A"], light: "#FFAE6A", shadow: "#33245E", haze: "#B0647A", sun: "#FFC47A" },
    night:  { sky: ["#070A1C", "#141A3C", "#232A52"], light: "#AFC2FF", shadow: "#0A0A1E", haze: "#1E2446", sun: null },
    indoor: { sky: ["#6E7FA0", "#A8B8C8", "#D8E0E4"], light: "#FFE8C8", shadow: "#3A3050", haze: "#8A7F74", sun: null },
  };

  function rng(seed){
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (R, list) => list[(R() * list.length) | 0];

  /* ── settings ───────────────────────────────────────── *
   * Each paints the background and says where things stand: `floor` is the
   * line their feet or bases rest on, `counter` a raised surface for small
   * things, `water` a waterline to reflect in. */

  function sky(b, S, y1){
    const { w, T, R } = S;
    vgrad(b, 0, 0, w, y1, T.sky);
    if (S.plan.time === "night"){
      for (let i = 0; i < w * y1 / 40; i++) set(b, R() * w, R() * y1 * 0.9, [230, 232, 255], 0.35 + R() * 0.6);
      if (R() > 0.4) ellipse(b, w * (0.15 + R() * 0.7), y1 * (0.18 + R() * 0.2), 3, 3, ramp("#F4ECD0", S.L), { flat: true, mark: 0 });
    } else if (T.sun){
      const sx = w * (0.2 + R() * 0.6), sy = y1 * (S.plan.time === "day" ? 0.2 : 0.86);
      glow(b, sx, sy, w * 0.28, rgb(T.sun), 0.5);
      ellipse(b, sx, sy, 3.5, 3.5, ramp(T.sun, S.L), { flat: true, mark: 0 });
    }
    if (S.plan.time !== "night") for (let c = 0; c < 2 + ((R() * 3) | 0); c++){
      const cx = R() * w, cy = y1 * (0.12 + R() * 0.45), cw = 6 + R() * w * 0.12;
      const cloud = ramp(mix(rgb(T.sky[2]), [255, 255, 255], 0.5), S.L);
      for (let k = 0; k < 4; k++) ellipse(b, cx + (k - 1.5) * cw * 0.35, cy - (k % 2) * 1.5, cw * 0.3, 2 + R() * 2, cloud, { flat: true, bias: 0.2, mark: 0 });
    }
  }

  // A distant ridge, mixed toward the haze the further back it is.
  function ridge(b, S, y, amp, colour, far, bumpy){
    const { w, h, R, L } = S, ph = R() * 9, f = 0.05 + R() * 0.06;
    const c = mix(rgb(colour), L.haze, far);
    for (let x = 0; x < w; x++){
      let top = y - amp * (0.5 + 0.5 * Math.sin(x * f + ph)) - (bumpy ? (Math.sin(x * 1.7 + ph) > 0.2 ? 2 : 0) : 0);
      for (let yy = Math.max(0, top | 0); yy < h && yy < y + amp * 3; yy++) set(b, x, yy, mix(c, [0, 0, 0], (yy - top) / (amp * 12)));
    }
  }

  function grass(b, S, y0, colour){
    const { w, h, R } = S, snow = S.plan.looks.includes("snow");
    const top = snow ? "#E8EEF2" : colour, bottom = snow ? "#AEBCC8" : mix(rgb(colour), [20, 30, 10], 0.55);
    vgrad(b, 0, y0, w, h, [top, bottom], 5);
    for (let i = 0; i < w * (h - y0) / 14; i++){
      const x = R() * w, y = y0 + R() * (h - y0);
      set(b, x, y, snow ? [255, 255, 255] : mix(rgb(colour), [10, 20, 6], 0.45), 0.8);
    }
  }

  const SETTINGS = {
    studio(b, S){
      const { w, h, R } = S;
      const back = pick(R, ["#D8D2C8", "#C9D2D6", "#E4D8C4", "#CBC4D8", "#3A3A40"]);
      const c = rgb(back);
      vgrad(b, 0, 0, w, h * 0.66, [mix(c, [255, 255, 255], 0.18), c], 5);
      vgrad(b, 0, h * 0.66, w, h, [mix(c, [255, 255, 255], 0.1), mix(c, [0, 0, 0], 0.28)], 5);
      return { floor: h * 0.84 };
    },

    table(b, S){
      const { w, h, R } = S, top = S.top;
      const edge = top ? -1 : h * (0.46 + R() * 0.08);
      if (!top){
        const wall = rgb(pick(R, ["#CDB9A0", "#9FB0A8", "#C9A89A", "#6E7E8E", "#E6DCC8"]));
        vgrad(b, 0, 0, w, edge, [mix(wall, [255, 255, 255], 0.12), mix(wall, [0, 0, 0], 0.15)], 5);
      }
      const kind = pick(R, ["wood", "wood", "marble", "cloth"]);
      const base = kind === "wood" ? rgb("#8A5A34") : kind === "marble" ? rgb("#E6E4DE") : rgb("#F2ECE0");
      for (let y = Math.max(0, edge | 0); y < h; y++) for (let x = 0; x < w; x++){
        let c = mix(base, [0, 0, 0], top ? 0.05 : (y - edge) / h * 0.3);
        if (kind === "wood" && ((y * 7 + (x >> 4) * 13) % 9 === 0 || Math.sin(x * 0.4 + y * 2.3) > 0.97)) c = mix(c, [40, 20, 8], 0.35);
        if (kind === "marble" && Math.abs(Math.sin(x * 0.07 + y * 0.11) + Math.sin(x * 0.19 - y * 0.05)) < 0.05) c = mix(c, [120, 120, 126], 0.5);
        if (kind === "cloth" && (((x >> 3) + (y >> 3)) & 1)) c = mix(c, rgb("#C8252C"), 0.75);
        set(b, x, y, c);
      }
      if (!top) line(b, 0, edge, w, edge, mix(base, [255, 255, 255], 0.35));
      return { floor: top ? h * 0.62 : h * 0.86, counter: top ? h * 0.62 : h * 0.86 };
    },

    water(b, S){
      const { w, h, R } = S, hz = h * (0.44 + R() * 0.08);
      sky(b, S, hz);
      ridge(b, S, hz, 3 + R() * 3, "#2E4A3A", 0.45, true);
      const top = mix(rgb(S.T.sky[2]), [30, 50, 70], 0.25), deep = mix(rgb(S.T.sky[0]), [8, 18, 28], 0.55);
      vgrad(b, 0, hz + 1, w, h, [top, deep], 6);
      for (let i = 0; i < w * (h - hz) / 22; i++){
        const x = R() * w, y = hz + 2 + R() * (h - hz), len = 2 + R() * 5;
        line(b, x, y, x + len, y, mix(rgb(S.T.sky[2]), [255, 255, 255], 0.3), 0.35);
      }
      return { floor: h * (0.74 + R() * 0.08), water: hz + 1 };
    },

    field(b, S){
      const { w, h, R } = S, hz = h * (0.46 + R() * 0.1);
      sky(b, S, hz);
      ridge(b, S, hz, 5, "#40604A", 0.6);
      ridge(b, S, hz + 3, 3, "#4E7A3A", 0.3);
      grass(b, S, hz + 4, "#6E9A44");
      return { floor: h * 0.88 };
    },

    forest(b, S){
      const { w, h, R, L } = S;
      sky(b, S, h * 0.5);
      vgrad(b, 0, h * 0.5, w, h, [mix(rgb("#3A5A40"), L.haze, 0.5), "#1E2E1C"], 4);
      for (const [far, n, size] of [[0.62, 9, 0.28], [0.34, 7, 0.42], [0.08, 5, 0.62]]){
        const c = ramp(mix(rgb("#244A2E"), L.haze, far), L);
        for (let i = 0; i < n; i++){
          const x = (i + R() * 0.8) / n * w, hh = h * size * (0.8 + R() * 0.4), base = h * (0.55 + (1 - far) * 0.35);
          poly(b, [[x, base - hh], [x - hh * 0.32, base], [x + hh * 0.32, base]], c, { tone: 0.45, mark: 0 });
        }
      }
      grass(b, S, h * 0.9, "#3A4A2A");
      return { floor: h * 0.92 };
    },

    track(b, S){
      const { w, h, R } = S;
      sky(b, S, h * 0.34);
      rect(b, 0, h * 0.3, w, h * 0.14, ramp("#2A2A36", S.L), { tone: 0.4, grad: 0, mark: 0 });
      for (let i = 0; i < w * 1.2; i++) set(b, R() * w, h * (0.31 + R() * 0.12), pick(R, [[240, 200, 170], [200, 80, 60], [90, 120, 200], [240, 240, 230]]), 0.7);
      grass(b, S, h * 0.44, "#4E8A3A");
      const y0 = h * 0.54, vx = w * (0.5 + (R() - 0.5) * 0.4), vy = h * 0.18;
      rect(b, 0, y0, w, h - y0, ramp("#C4553A", S.L), { tone: 0.5, grad: 0.2, mark: 0 });
      const white = mix([245, 240, 230], S.L.light, 0.2);
      for (let k = -4; k <= 8; k++){
        const bx = w * (k / 4), t0 = (y0 - vy) / (h - vy);
        line(b, vx + (bx - vx) * t0, y0, bx, h, white, 0.9);
      }
      return { floor: h * 0.9 };
    },

    stage(b, S){
      const { w, h, R } = S, fold = rgb(pick(R, ["#8E1A2A", "#6A1830", "#2A2A6A"]));
      const velvet = ramp(fold, S.L), floorY = h * 0.7, ph = R() * 6;
      for (let y = 0; y < floorY; y++) for (let x = 0; x < w; x++){
        const t = 0.42 + 0.34 * Math.sin(x * 0.55 + ph + Math.sin(y * 0.05) * 0.6) - y / floorY * 0.1;
        set(b, x, y, tone(velvet, t, x, y));
      }
      vgrad(b, 0, floorY, w, h, ["#3A2418", "#6A4428"], 4);
      for (let y = floorY + 3; y < h; y += 3 + ((y - floorY) / 6 | 0)) line(b, 0, y, w, y, [40, 24, 14], 0.5);
      const sx = S.spot || w * 0.5;
      glow(b, sx, h * 0.84, w * 0.36, [255, 230, 180], 0.45);
      glow(b, sx, h * 0.3, w * 0.5, [255, 220, 170], 0.18);
      return { floor: h * 0.88 };
    },

    lanes(b, S){
      const { w, h, R } = S;
      vgrad(b, 0, 0, w, h * 0.42, ["#0E0C18", "#1C1830"], 4);
      const neon = pick(R, [[255, 70, 160], [60, 220, 255], [255, 200, 60]]);
      const y = h * 0.12 + R() * h * 0.08, word = pick(R, ["BOWL", "LANES", "STRIKE"]);
      const x0 = w * 0.5 - textW(word, 2) / 2;
      glow(b, w * 0.5, y + 5, w * 0.3, neon, 0.45);
      text(b, word, x0, y, mix(neon, [255, 255, 255], 0.4), 2, 0);
      const vx = w * 0.5, vy = h * 0.3, y0 = h * 0.42;
      for (let x = 0; x < w; x++) for (let yy = y0 | 0; yy < h; yy++){
        const t = (yy - vy) / (h - vy), lx = (x - vx) / Math.max(0.2, t);
        const lane = Math.floor((lx + w * 2) / (w * 0.45)), gutter = ((lx + w * 2) % (w * 0.45)) < w * 0.05;
        const wood = gutter ? [40, 34, 40] : mix([214, 168, 106], [120, 80, 44], (lane & 1) * 0.25 + (1 - t) * 0.3);
        set(b, x, yy, mix(wood, S.L.shadow, 0.08));
      }
      for (let i = 0; i < 10; i++){
        const px = vx + (i - 4.5) * w * 0.03, py = y0 + 1;
        rect(b, px, py - 3, 1.5, 3, ramp("#F4F1EA", S.L), { mark: 0 });
      }
      return { floor: h * 0.92 };
    },

    drive(b, S){
      const { w, h, R, L } = S, lit = S.plan.time !== "day";
      sky(b, S, h * 0.6);
      vgrad(b, 0, h * 0.6, w, h * 0.8, ["#8A8A86", "#6A6A68"], 3);
      const x0 = w * (0.02 + R() * 0.1), bw = w * (0.8 + R() * 0.16);
      rect(b, x0, h * 0.3, bw, h * 0.5, ramp(pick(R, ["#D9C4A0", "#C9B8A8", "#E0D6C4", "#B89A7A"]), L), { tone: 0.5, mark: 0 });
      rect(b, x0, h * 0.25, bw, h * 0.07, ramp(pick(R, ["#C8252C", "#E86A1C", "#2E9A96", "#F2C62C"]), L), { tone: 0.55, mark: 0 });
      const left = R() > 0.5, wx = left ? x0 + bw * 0.12 : x0 + bw * 0.62, bx = left ? x0 + bw * 0.62 : x0 + bw * 0.1;
      rect(b, wx, h * 0.42, bw * 0.22, h * 0.2, ramp(lit ? "#FFE9A8" : "#9FB8C8", L), { tone: lit ? 0.8 : 0.5, mark: 0 });
      if (lit) glow(b, wx + bw * 0.11, h * 0.52, w * 0.2, [255, 220, 150], 0.35);
      rect(b, bx + bw * 0.12, h * 0.5, 1.5, h * 0.3, ramp("#3A3A3E", L), { mark: 0 });
      rect(b, bx, h * 0.36, bw * 0.26, h * 0.16, ramp("#22201E", L), { tone: 0.4, mark: 0 });
      for (let r = 0; r < 4; r++) line(b, bx + 2, h * 0.39 + r * 2.5, bx + bw * (0.1 + R() * 0.12), h * 0.39 + r * 2.5, [255, 214, 120], 0.9);
      vgrad(b, 0, h * 0.8, w, h, ["#4A4A50", "#2A2A2E"], 4);
      for (let x = 0; x < w; x += 8) line(b, x, h * 0.9, x + 4, h * 0.9, [230, 190, 60], 0.9);
      if (R() > 0.45){
        const cx = wx + bw * 0.11, car = ramp(pick(R, ["#2F6FC0", "#C8252C", "#E8E4DA", "#3A3A3E"]), L);
        rect(b, cx - w * 0.16, h * 0.7, w * 0.32, h * 0.12, car, { tone: 0.55, mark: 0 });
        rect(b, cx - w * 0.09, h * 0.62, w * 0.18, h * 0.09, car, { tone: 0.62, mark: 0 });
        rect(b, cx - w * 0.07, h * 0.64, w * 0.14, h * 0.05, ramp("#9FB8C8", L), { tone: 0.7, mark: 0 });
        for (const dx of [-0.1, 0.1]) ellipse(b, cx + w * dx, h * 0.83, 3, 3, ramp("#1C1C1E", L), { mark: 0 });
        if (lit) glow(b, cx + w * 0.16, h * 0.76, w * 0.08, [255, 240, 200], 0.6);
      }
      return { floor: h * 0.94, counter: h * 0.62 };
    },

    diner(b, S){
      const { w, h, R, L } = S;
      vgrad(b, 0, 0, w, h * 0.56, ["#F2E6C8", "#E0D2B0"], 4);
      rect(b, 0, h * 0.18, w, 2, ramp("#2E9A96", L), { grad: 0, mark: 0 });
      rect(b, w * 0.1, h * 0.06, w * 0.8, h * 0.1, ramp("#22201E", L), { tone: 0.4, mark: 0 });
      text(b, pick(R, ["EAT", "DINER", "COFFEE", "PIE"]), w * 0.14, h * 0.08, [255, 214, 120], 1, 0);
      rect(b, 0, h * 0.56, w, 2, ramp("#C0C4C8", L), { tone: 0.8, grad: 0, mark: 0 });
      rect(b, 0, h * 0.58, w, h * 0.16, ramp("#C8252C", L), { tone: 0.5, mark: 0 });
      for (let y = h * 0.74 | 0; y < h; y++) for (let x = 0; x < w; x++){
        set(b, x, y, (((x >> 2) + (y >> 2)) & 1) ? [236, 232, 224] : [40, 38, 44]);
      }
      for (let k = 0; k < 4; k++){
        const sx = w * (0.14 + k * 0.24);
        rect(b, sx - 0.5, h * 0.8, 1.5, h * 0.12, ramp("#C0C4C8", L), { mark: 0 });
        ellipse(b, sx, h * 0.79, w * 0.06, 2, ramp("#C8252C", L), { mark: 0 });
      }
      return { floor: h * 0.95, counter: h * 0.57 };
    },

    shop(b, S){
      const { w, h, R, L } = S;
      vgrad(b, 0, 0, w, h * 0.62, ["#E6D8C0", "#C9B79A"], 4);
      for (let s = 0; s < 3; s++){
        const y = h * (0.14 + s * 0.16);
        rect(b, w * 0.04, y + h * 0.1, w * 0.92, 1.5, ramp("#6A4A30", L), { mark: 0 });
        for (let x = w * 0.06; x < w * 0.94; x += 3 + R() * 4){
          const gh = h * (0.04 + R() * 0.06);
          rect(b, x, y + h * 0.1 - gh, 2 + R() * 2, gh, ramp(pick(R, ["#C8252C", "#2F6FC0", "#F2C62C", "#3E8A3A", "#E8DCC4", "#6B3FA0"]), L, 0.2), { mark: 0 });
        }
      }
      rect(b, 0, h * 0.62, w, h * 0.38, ramp("#8A5A34", L), { tone: 0.5, grad: 0.3, mark: 0 });
      line(b, 0, h * 0.62, w, h * 0.62, [214, 170, 120]);
      return { floor: h * 0.95, counter: h * 0.63 };
    },

    street(b, S){
      const { w, h, R, L } = S, night = S.plan.time === "night" || S.plan.time === "dusk";
      sky(b, S, h * 0.66);
      let x = -R() * 10;
      while (x < w){
        const bw = 10 + R() * 22, bh = h * (0.25 + R() * 0.4), c = night ? "#1A1C2A" : pick(R, ["#9A5A44", "#B8A088", "#7A7A86"]);
        rect(b, x, h * 0.66 - bh, bw, bh, ramp(c, L, 0.25), { tone: 0.4, mark: 0 });
        for (let wy = h * 0.66 - bh + 3; wy < h * 0.62; wy += 4) for (let wx = x + 2; wx < x + bw - 2; wx += 4)
          if (R() > (night ? 0.45 : 0.2)) set(b, wx, wy, night ? [255, 214, 130] : [60, 80, 100], night ? 0.9 : 0.7);
        x += bw + 1;
      }
      rect(b, 0, h * 0.66, w, h * 0.05, ramp("#8A8A90", L), { grad: 0, mark: 0 });
      vgrad(b, 0, h * 0.71, w, h, night ? ["#1E1E26", "#0E0E14"] : ["#5A5A60", "#3A3A40"], 4);
      if (night) for (let i = 0; i < 4; i++){
        const lx = R() * w, c = pick(R, [[255, 80, 160], [80, 220, 255], [255, 200, 90]]);
        glow(b, lx, h * (0.4 + R() * 0.2), w * 0.12, c, 0.5);
        for (let y = h * 0.72 | 0; y < h; y++) set(b, lx + Math.sin(y) * 0.6, y, c, 0.25);
      }
      return { floor: h * 0.84 };
    },

    sky(b, S){
      sky(b, S, S.h);
      return { floor: null };
    },

    party(b, S){
      const { w, h, R, L } = S;
      const wall = rgb(pick(R, ["#F4D6E4", "#D6ECF4", "#FFF0C8"]));
      vgrad(b, 0, 0, w, h * 0.74, [mix(wall, [255, 255, 255], 0.2), wall], 4);
      for (let k = 0; k < 2; k++){
        const y0 = h * (0.08 + k * 0.1);
        for (let x = 0; x < w; x += 7){
          const sag = Math.sin(x / w * Math.PI) * 4;
          poly(b, [[x, y0 + sag], [x + 6, y0 + sag], [x + 3, y0 + sag + 5]], ramp(pick(R, ["#E23A5A", "#2F6FC0", "#F2C62C", "#3E8A3A"]), L), { mark: 0 });
        }
      }
      for (let i = 0; i < w; i++) set(b, R() * w, R() * h * 0.7, pick(R, [[226, 58, 90], [47, 111, 192], [242, 198, 44]]), 0.8);
      rect(b, 0, h * 0.74, w, h * 0.26, ramp("#F4F1EA", L), { tone: 0.6, mark: 0 });
      return { floor: h * 0.92, counter: h * 0.76 };
    },
  };

  /* ── putting things in the picture ─────────────────── */
  const SIZE = { hero: 0.5, context: 0.32, product: 0.56, close: 1.0, group: 0.32, wide: 0.17, top: 0.52 };

  // Where each subject goes, back to front. Decided before the setting is
  // painted, so a stage can put its spotlight where the subject will stand.
  function layout(p, S, info){
    const { w, h, R } = S, n = Math.max(1, p.count || 1);
    let size = SIZE[p.framing] || 0.4;
    if (info.person) size *= 1.45;
    if (info.small && p.framing !== "close") size *= 0.8;
    if (info.big) size *= 1.5;
    if (info.scale) size *= info.scale;
    if (p.framing === "wide" && info.small) size = Math.max(size, 0.24);
    if (p.framing === "wide" && info.big) size = Math.max(size, 0.3);
    const out = [];
    for (let i = 0; i < n; i++){
      const back = n > 1 ? (i % 2 === 0 && n > 2 ? 1 : 0) : 0;   // alternate rows for depth
      const sh = h * size * (back ? 0.78 : 1) * (0.9 + R() * 0.2);
      const sw = sh * info.aspect;
      let x = n === 1
        ? (p.framing === "context" ? (R() > 0.5 ? 0.3 : 0.7) : p.framing === "wide" ? 0.2 + R() * 0.6 : 0.5 + (R() - 0.5) * 0.12) * w
        : (i + 0.5) / n * w + (R() - 0.5) * w / n * 0.4;
      if (p.framing === "close") x = w * (0.5 + (R() - 0.5) * 0.2);
      out.push({ x, w: sw, h: sh, back, i });
    }
    return out.sort((a, c) => c.back - a.back);
  }

  function reflect(b, x0, x1, top, base, mark, S){
    const ph = S.R() * 6;
    for (let y = top | 0; y < base; y++){
      const ty = Math.round(base + (base - y) * 0.9);
      if (ty >= b.h) continue;
      const dx = Math.round(Math.sin(ty * 1.3 + ph));
      for (let x = Math.max(0, x0 | 0); x < Math.min(b.w, x1); x++){
        if (b.m[y * b.w + x] !== mark) continue;
        set(b, x + dx, ty, mix(get(b, x, y), S.L.shadow, 0.35), 0.45);
      }
    }
  }

  /* ── looks ──────────────────────────────────────────── */
  function blur(b, passes){
    const { w, h } = b;
    for (let p = 0; p < passes; p++){
      const src = b.d.slice();
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
        let r = 0, g = 0, bl = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++){
          const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy)), j = (yy * w + xx) * 3;
          r += src[j]; g += src[j + 1]; bl += src[j + 2]; n++;
        }
        const i = (y * w + x) * 3; b.d[i] = r / n; b.d[i + 1] = g / n; b.d[i + 2] = bl / n;
      }
    }
  }

  function outline(b){
    const { w, h } = b, ink = [28, 26, 32], src = b.m.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      if (src[y * w + x]) continue;
      const near = (x > 0 && src[y * w + x - 1]) || (x < w - 1 && src[y * w + x + 1]) || (y > 0 && src[(y - 1) * w + x]) || (y < h - 1 && src[(y + 1) * w + x]);
      if (near) set(b, x, y, ink);
    }
  }

  function grade(b, S){
    const { w, h } = b, looks = S.plan.looks, R = rng(S.plan.seed ^ 0x9E37);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const i = (y * w + x) * 3;
      let c = [b.d[i], b.d[i + 1], b.d[i + 2]];
      if (looks.includes("mono")){ const l = lum(c); c = [l, l, l]; c = c.map((v) => (v - 128) * 1.15 + 128); }
      if (looks.includes("vintage")){ const l = lum(c); c = mix(c, [l * 1.08 + 18, l * 0.94 + 10, l * 0.72], 0.6); c = c.map((v) => v * 0.86 + 24); }
      const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2, v = 1 - 0.2 * (dx * dx + dy * dy) * (looks.includes("vintage") ? 1.8 : 1);
      const n = (R() - 0.5) * 7;
      b.d[i] = c[0] * v + n; b.d[i + 1] = c[1] * v + n; b.d[i + 2] = c[2] * v + n;
    }
  }

  /* ── the whole picture ─────────────────────────────── */
  const INCIDENTAL = {
    water: [null, "boat", "duck", null, "log"], field: [null, "tree", "flower", "rabbit"], forest: [null, "mushroom", "log", "tree"],
    track: [null, "runner", null, "baton"], stage: [null, "mic", "tophat"], street: [null, "sign", "person"], lanes: [null, "pin"],
    diner: [null, "cup", "shake"], party: [null, "balloon", "cake"], shop: [null, "cat", null], sky: [null, "dove", null, "star"],
  };

  function paint(p, w, h, Things){
    const b = buffer(w, h), R = rng(p.seed);
    const T = TIME[p.time] || TIME.indoor;
    const L = { light: rgb(T.light), shadow: rgb(T.shadow), haze: rgb(T.haze) };
    const S = { w, h, R, T, L, plan: p, top: p.framing === "top", spot: null };
    // A picture of a place gets the odd thing in it, so a page of them varies.
    if (!p.subject && Things){
      const extra = INCIDENTAL[p.setting] && INCIDENTAL[p.setting][p.index % INCIDENTAL[p.setting].length];
      if (extra) p = Object.assign({}, p, { subject: extra, count: extra === "duck" || extra === "flower" ? 2 : 1, framing: "wide", colour: null });
    }
    const info = p.subject && Things ? Things.info(p.subject) : null;
    const spots = info ? layout(p, S, info) : [];
    if (spots.length) S.spot = spots[spots.length - 1].x;
    const st = (SETTINGS[p.setting] || SETTINGS.studio)(b, S);

    let colour = Things && p.subject ? Things.colourFor(p) : null;
    if (colour && p.looks.includes("pastel")) colour = "#" + mix(rgb(colour), [255, 255, 255], 0.45).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
    spots.forEach((s, k) => {
      const floats = info.floats && st.water;
      const sits = info.small && st.counter && !S.top ? st.counter : null;
      const base = st.floor == null ? h * (0.35 + R() * 0.4)
        : S.top ? h * 0.5 + s.h / 2 + (s.back ? -h * 0.08 : h * 0.04)
        : (sits || st.floor) - (s.back ? h * 0.05 : 0) + (p.framing === "close" ? s.h * 0.18 : 0);
      // A close-up of a person is their head and shoulders, not their coat.
      const top = p.framing === "close" && info.person ? h * 0.1 : base - s.h;
      const box = { x: s.x - s.w / 2, y: top, w: s.w, h: s.h };
      const mark = k + 1;
      const haze = (s.back ? 0.18 : 0) + (p.framing === "wide" && T !== TIME.indoor ? 0.2 : 0);
      if (st.floor != null && !floats && !S.top) shadow(b, s.x, base, s.w * 0.5, Math.max(1, s.h * 0.07), 0.45);
      Things.draw(p.subject, b, box, {
        L, R, mark, colour, haze, flip: p.flip !== (k % 2 === 1), view: S.top ? "top" : "side",
        companion: p.companion, time: p.time, query: p.query, cartoon: p.looks.includes("cartoon"), floats, framing: p.framing, setting: p.setting,
      });
      if (floats) reflect(b, box.x - 2, box.x + box.w + 2, box.y, base, mark, S);
    });

    if (p.looks.includes("cartoon")) outline(b);
    if (p.looks.includes("snow") && TIME[p.time] !== TIME.indoor) for (let i = 0; i < w * h / 30; i++) set(b, R() * w, R() * h, [250, 252, 255], 0.8);
    if (p.looks.includes("blurry")) blur(b, 2);
    grade(b, S);
    return b;
  }

  // Paints small, then scales by a whole number so the pixels stay square.
  function render(p, W, H, Things){
    const k = Math.max(1, Math.round(H / 90)), w = Math.ceil(W / k), h = Math.ceil(H / k);
    const b = paint(p, w, h, Things);
    const small = document.createElement("canvas");
    small.width = w; small.height = h;
    const g = small.getContext("2d"), img = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++){
      img.data[i * 4] = b.d[i * 3]; img.data[i * 4 + 1] = b.d[i * 3 + 1]; img.data[i * 4 + 2] = b.d[i * 3 + 2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const o = out.getContext("2d");
    o.imageSmoothingEnabled = false;
    o.drawImage(small, 0, 0, w * k, h * k);
    return out;
  }

  return { kit, buffer, rng, pick, TIME, SETTINGS, paint, render };
})();

if (typeof module !== "undefined") module.exports = PixelScene;
