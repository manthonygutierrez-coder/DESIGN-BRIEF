"use strict";
/* Faux reference imagery, drawn on a canvas from a seed.
 *
 * Nothing is fetched — the app has to work with no network — so every
 * "photograph" in the image search is generated here. Results are seeded by
 * (query + index), so the same search always returns the same pictures and
 * a client's gallery looks the same on every visit.
 *
 * The aim is a plausible *thumbnail*: right palette, right tonal structure,
 * readable composition. Nothing here is meant to survive being enlarged.
 */

const Imagery = (() => {

  /* seeded PRNG — mulberry32 over a string hash */
  function seedOf(str){
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }
  function rngFrom(seed){
    let a = seed;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Keyword → palette.
   *
   * Matching is scored, not first-past-the-post. A long, specific keyword
   * ("carved stone marker") outranks a short generic one ("field"), and
   * matches must fall on word boundaries — otherwise "granite monolith field"
   * lands in the greenhouse palette because of the word "field", which is
   * exactly the bug this replaced.
   */
  const MOODS = [
    { k: ["neon", "3am", "night street", "diner", "dark concert", "haze", "booth"],
      sky: ["#1A0E22", "#2E1338"], ground: ["#120A18", "#060309"], ink: "#F5D9FF",
      accent: ["#FF4FA3", "#3FE8FF", "#FFD166"], glow: true },

    { k: ["snow", "winter", "frozen", "ice", "cold", "frost",
          "single light in darkness", "weather ship", "weather balloon", "balloon launch"],
      sky: ["#B9D0E0", "#7E9FB8"], ground: ["#E4EDF3", "#9DB2C2"], ink: "#2A3742",
      accent: ["#4E6E88", "#FFFFFF", "#7A93A8"] },

    { k: ["letterpress", "wood type", "ink", "paper", "print", "newsprint", "showcard",
          "brush", "sign painter", "book", "herbarium", "marginalia", "manuscript",
          "specimen sheet", "type", "lettering", "almanac", "tide table",
          "broadsheet", "front page", "composing room", "newspaper", "hand painted sign",
          "sheet music", "log"],
      sky: ["#EFE0C6", "#D4BE99"], ground: ["#BFA478", "#75603F"], ink: "#1E1509",
      accent: ["#C2452C", "#241A10", "#8A7150"] },

    { k: ["quarry", "marble", "rust", "industrial", "machinery", "decay", "salvage",
          "granite", "monolith", "carved stone", "stone", "slab", "salt mine", "excavation"],
      sky: ["#8E9498", "#5C6367"], ground: ["#4A4F52", "#232729"], ink: "#E4E7E8",
      accent: ["#A6602F", "#C9C4BA", "#33383A"] },

    { k: ["spacecraft", "orbital", "docking", "hull", "oxygen", "helmet", "corridor",
          "airlock", "derelict"],
      sky: ["#0B1116", "#161F27"], ground: ["#080C10", "#03060A"], ink: "#BFD6E4",
      accent: ["#4E7C9B", "#D9E6EF", "#C2703A"], glow: true },

    { k: ["greenhouse", "soil", "seedling", "fern", "plant", "weed", "botanical",
          "grow light", "ruderal", "leaf", "tray"],
      sky: ["#D2E2C8", "#9BB889"], ground: ["#51663C", "#25301C"], ink: "#1A2412",
      accent: ["#7FA05C", "#C9A24B", "#36492A"] },

    { k: ["airport", "signage", "departure", "concourse", "terminal", "platform",
          "timetable", "transit", "wayfinding", "livery", "pictogram", "gate"],
      sky: ["#20262C", "#12171B"], ground: ["#171C21", "#0A0D10"], ink: "#F2F5F7",
      accent: ["#FFC83D", "#3E8FD0", "#E8ECEF"], glow: true },

    { k: ["fabric", "boucle", "linen", "weave", "upholstery", "sofa", "textile", "swatch"],
      sky: ["#EAE0D0", "#CDBEA5"], ground: ["#B8A68A", "#7E6E58"], ink: "#332B20",
      accent: ["#B8A184", "#5E5244", "#E4DACA"] },

    { k: ["creature", "cottage", "doorway", "children", "gentle", "oversized",
          "character", "turnaround", "expression"],
      sky: ["#F2DFA8", "#D99E52"], ground: ["#8C5A2E", "#3A2216"], ink: "#2A1A0E",
      accent: ["#E87B34", "#FFF0CE", "#6B3F22"], glow: true },

    { k: ["theatre", "stage", "curtain", "wings", "understudy", "drone performance",
          "concert", "performance", "practice pad", "practice"],
      sky: ["#2A1418", "#150A0D"], ground: ["#1C0E11", "#080405"], ink: "#F0DCC4",
      accent: ["#B03A44", "#E8C77A", "#5A2A30"], glow: true },

    { k: ["payment", "settlement", "dashboard", "diagram", "financial", "chart",
          "isobar", "barometer", "waveform", "metronome", "trace", "plot", "graph",
          "standing wave", "wave pattern", "pattern"],
      sky: ["#F4F6F8", "#DDE4EA"], ground: ["#E8EDF2", "#BCC8D2"], ink: "#1E2A36",
      accent: ["#2E6FB0", "#D95F3B", "#7A8B99"] },

    { k: ["bank", "ledger", "lobby", "library", "counter", "meeting", "passbook", "shelves"],
      sky: ["#E0D7C4", "#B7A88E"], ground: ["#95866C", "#443C2E"], ink: "#1F1A10",
      accent: ["#7A6142", "#B8A47E", "#342C20"] },

    /* ── added for the newer briefs ─────────────────────── */

    // Warning systems, repositories, hazard marking.
    { k: ["warning", "hazard", "marker", "warning pictogram", "pictogram panel",
          "repository", "carved stone marker"],
      sky: ["#D8D4C4", "#A39C86"], ground: ["#6E6858", "#2E2C24"], ink: "#F4F2E8",
      accent: ["#B8860B", "#3A3A34", "#E0D6B4"] },

    // Clinical, nocturnal, fluorescent. Wards and corridors at 4am.
    { k: ["hospital", "ward", "clinical", "corridor at night", "rota", "shift",
          "whiteboard", "phone in one hand", "one hand"],
      sky: ["#1A2229", "#0E141A"], ground: ["#131A20", "#070B0E"], ink: "#DDE8EF",
      accent: ["#0F6E8C", "#7FC4D8", "#E8F0F4"], glow: true },

    // Bone, cabinet, vitrine. Museum collections.
    { k: ["skeleton", "bones", "museum", "natural history", "vertebra", "articulated",
          "specimen drawer", "vitrine", "whale"],
      sky: ["#E8E2D4", "#C0B7A2"], ground: ["#9A8F78", "#3E382C"], ink: "#221E16",
      accent: ["#2F5D62", "#9C6B3C", "#D8CFBA"] },

    // Sea, tide, harbour, working boats.
    { k: ["harbour", "tide", "low water", "shellfish", "wheelhouse", "estuary",
          "quay", "sea", "boat"],
      sky: ["#C4CEC8", "#87999A"], ground: ["#5E6E6A", "#252E2E"], ink: "#EDF0EC",
      accent: ["#1F5C56", "#A3512C", "#C8D2CC"] },

    // Hands, capture markers, studio black.
    { k: ["hands", "hand shape", "sign language", "signing", "motion capture", "gesture"],
      sky: ["#161B1F", "#0C1013"], ground: ["#101418", "#050708"], ink: "#E8EEF2",
      accent: ["#5BD1A6", "#E0566B", "#DCE6EC"], glow: true },

    // Instruments, panels, recorders. Aviation and engineering readouts.
    { k: ["flight", "aircraft", "instrument panel", "recorder", "cockpit", "avionics",
          "flight path", "flight data", "black box"],
      sky: ["#242A30", "#12171C"], ground: ["#1A1F24", "#080B0E"], ink: "#DDE6EC",
      accent: ["#1F3D6B", "#C0392B", "#8FA8BC"], glow: true },

    // Foil, blister, packaging. Bright, reflective, sterile.
    { k: ["blister", "foil", "medicine", "pharmaceutical", "carton", "braille",
          "packaging", "small print", "label"],
      sky: ["#F4F7F6", "#D6E0DB"], ground: ["#E2EAE6", "#A8B8B0"], ink: "#152018",
      accent: ["#00695C", "#B71C1C", "#C4D2CC"] },
  ];

  const DEFAULT_MOOD = {
    sky: ["#DCC8A6", "#A8815A"], ground: ["#7A5836", "#2A1D14"], ink: "#1C1913",
    accent: ["#D2762F", "#F0DCB8", "#4A3628"]
  };

  // Words too generic to decide a palette on their own.
  const WEAK = new Set(["field", "detail", "study", "shot", "close", "up", "page",
                        "sheet", "panel", "at", "in", "on", "of", "the", "a", "and",
                        "dark", "night", "light", "interior", "window", "system"]);

  /* Scored match. A keyword scores its own length (specificity), doubled when it
   * is a multi-word phrase, and is ignored entirely if it is a lone weak word. */
  function moodFor(q){
    const s = " " + q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() + " ";
    let best = null, bestScore = 0;
    for (const m of MOODS){
      let score = 0;
      for (const k of m.k){
        if (WEAK.has(k)) continue;
        // whole-word (or whole-phrase) match only — the query is already
        // space-padded and stripped of punctuation
        if (s.includes(" " + k + " ")) score += k.length * (k.includes(" ") ? 2 : 1);
      }
      if (score > bestScore){ bestScore = score; best = m; }
    }
    return best || DEFAULT_MOOD;
  }

  /* compositions */
  function grad(ctx, x, y, w, h, a, b){
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  // Darkens the bottom of the frame. Almost every real photograph does this and
  // without it the generated ones read as flat swatches.
  function foreground(ctx, W, H, m){
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, "transparent"); g.addColorStop(1, m.ground[1] + "CC");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function landscape(ctx, W, H, m, R){
    const horizon = H * (0.42 + R() * 0.2);
    grad(ctx, 0, 0, W, horizon, m.sky[0], m.sky[1]);
    grad(ctx, 0, horizon, W, H - horizon, m.ground[0], m.ground[1]);
    if (m.glow){
      const g = ctx.createRadialGradient(W * (0.2 + R() * 0.6), horizon, 2, W * 0.5, horizon, W * 0.7);
      g.addColorStop(0, m.accent[0] + "AA"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // three planes of receding mass, each darker and sharper than the last
    for (let plane = 0; plane < 3; plane++){
      const depth = plane / 2;
      const n = 2 + ((R() * 3) | 0);
      for (let i = 0; i < n; i++){
        ctx.fillStyle = m.ground[1] + (plane === 0 ? "66" : plane === 1 ? "AA" : "EE");
        const bw = W * (0.1 + R() * (0.3 + depth * 0.2));
        const bh = H * (0.05 + R() * (0.12 + depth * 0.3));
        ctx.fillRect(R() * W - bw / 2, horizon - bh + plane * H * 0.03, bw, bh + 6);
      }
    }
    foreground(ctx, W, H, m);
  }

  // Layered rock / sediment. Reads as a quarry face, a salt wall, a cut bank.
  function strata(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.sky[1], m.ground[1]);
    let y = -H * 0.1;
    while (y < H * 1.1){
      const band = H * (0.05 + R() * 0.14);
      const tone = R();
      ctx.fillStyle = (tone > 0.66 ? m.accent[0] : tone > 0.33 ? m.ground[0] : m.ground[1]);
      ctx.globalAlpha = 0.45 + R() * 0.5;
      ctx.beginPath();
      ctx.moveTo(-4, y);
      ctx.lineTo(W + 4, y + (R() - 0.5) * H * 0.09);
      ctx.lineTo(W + 4, y + band + (R() - 0.5) * H * 0.09);
      ctx.lineTo(-4, y + band);
      ctx.closePath(); ctx.fill();
      y += band;
    }
    ctx.globalAlpha = 1;
    foreground(ctx, W, H, m);
  }

  function objectShot(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.sky[0], m.sky[1]);
    const cx = W * (0.36 + R() * 0.28), cy = H * (0.5 + R() * 0.1);
    const r = Math.min(W, H) * (0.2 + R() * 0.14);
    ctx.fillStyle = "rgba(0,0,0,.34)";
    ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy + r * 0.95, r * 1.3, r * 0.26, 0, 0, 6.284); ctx.fill();
    const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.48, r * 0.08, cx, cy, r * 1.3);
    g.addColorStop(0, m.accent[2] || "#fff");
    g.addColorStop(0.5, m.accent[0]);
    g.addColorStop(1, m.ground[1]);
    ctx.fillStyle = g;
    if (R() > 0.45){ ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.284); ctx.fill(); }
    else ctx.fillRect(cx - r, cy - r, r * 2, r * 1.9);
    // rim light down one edge — the cheapest way to read as photographed
    ctx.strokeStyle = (m.accent[1] || "#fff") + "88";
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, -1.1, 0.7); ctx.stroke();
    foreground(ctx, W, H, m);
  }

  function macro(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.ground[0], m.ground[1]);
    const step = 3 + ((R() * 6) | 0);
    for (let y = -H; y < H * 2; y += step){
      ctx.strokeStyle = (R() > 0.5 ? m.sky[0] : m.accent[1]) + "66";
      ctx.lineWidth = 1 + R() * 2.4;
      ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(W + 10, y + (R() - 0.5) * 26); ctx.stroke();
    }
    for (let i = 0; i < 3; i++){
      ctx.fillStyle = m.accent[i % m.accent.length] + "3A";
      ctx.beginPath();
      ctx.ellipse(R() * W, R() * H, W * (0.1 + R() * 0.3), H * (0.08 + R() * 0.24), R() * 3, 0, 6.284);
      ctx.fill();
    }
    // shallow depth of field: darken and soften the outer frame
    const g = ctx.createRadialGradient(W * 0.45, H * 0.45, Math.min(W, H) * 0.2,
                                       W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
    g.addColorStop(0, "transparent"); g.addColorStop(1, m.ground[1] + "AA");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function interior(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.sky[0], m.ground[1]);
    ctx.fillStyle = m.ground[1];
    ctx.beginPath();
    ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W * 0.72, H * 0.55); ctx.lineTo(W * 0.28, H * 0.55);
    ctx.closePath(); ctx.fill();
    // receding wall bands, converging — gives the corridor its depth
    for (let i = 0; i < 5; i++){
      const t = i / 5;
      ctx.strokeStyle = m.ink + "1E";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W * (0.28 * t), H * (0.55 - 0.3 * t));
      ctx.lineTo(W * (0.28 * t), H * (0.55 + 0.45 * t));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W * (1 - 0.28 * t), H * (0.55 - 0.3 * t));
      ctx.lineTo(W * (1 - 0.28 * t), H * (0.55 + 0.45 * t));
      ctx.stroke();
    }
    const lx = W * (0.34 + R() * 0.32), ly = H * (0.22 + R() * 0.16);
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, W * 0.55);
    g.addColorStop(0, (m.accent[2] || "#fff") + "DD"); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const n = 2 + ((R() * 3) | 0);
    for (let i = 0; i < n; i++){
      ctx.fillStyle = m.ink + "2A";
      const bw = W * (0.05 + R() * 0.1);
      ctx.fillRect(R() * W, H * 0.42 + R() * H * 0.28, bw, H * (0.14 + R() * 0.3));
    }
    foreground(ctx, W, H, m);
  }

  function panel(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.ground[0], m.ground[1]);
    const pw = W * (0.62 + R() * 0.24), ph = H * (0.4 + R() * 0.26);
    const px = (W - pw) / 2 + (R() - 0.5) * W * 0.08, py = (H - ph) / 2;
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.fillRect(px + 5, py + 6, pw, ph);
    ctx.fillStyle = m.accent[1] || m.sky[0];
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = m.ink;
    const rows = 2 + ((R() * 4) | 0);
    for (let i = 0; i < rows; i++){
      const bh = ph / (rows * 2.2);
      ctx.globalAlpha = 0.62 + R() * 0.3;
      ctx.fillRect(px + pw * 0.08, py + ph * 0.16 + i * (ph * 0.74 / rows), pw * (0.3 + R() * 0.56), bh);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = m.accent[0]; ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
  }

  // A technical drawing or trace: grid, plotted line, annotation ticks.
  function plot(ctx, W, H, m, R){
    grad(ctx, 0, 0, W, H, m.sky[0], m.sky[1]);
    ctx.strokeStyle = m.ink + "1C"; ctx.lineWidth = 1;
    const gx = W / 12, gy = H / 8;
    for (let x = gx; x < W; x += gx){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = gy; y < H; y += gy){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.strokeStyle = m.ink + "44"; ctx.lineWidth = 1.5;
    ctx.strokeRect(W * 0.08, H * 0.12, W * 0.84, H * 0.72);
    for (let s = 0; s < 2; s++){
      ctx.strokeStyle = m.accent[s % m.accent.length];
      ctx.lineWidth = 2 + s;
      ctx.globalAlpha = s ? 0.5 : 1;
      ctx.beginPath();
      let y = H * (0.3 + R() * 0.4);
      ctx.moveTo(W * 0.08, y);
      for (let x = W * 0.08; x < W * 0.92; x += W * 0.06){
        y += (R() - 0.5) * H * 0.22;
        y = Math.max(H * 0.16, Math.min(H * 0.8, y));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const COMPS = [landscape, objectShot, macro, interior, panel, strata, plot];

  // Composition pools by subject. A flat graphic "panel" only suits things that
  // really are flat; a plotted trace only suits data; strata only suits rock.
  const FLAT = ["sign", "signage", "board", "chart", "plate", "specimen", "type",
                "lettering", "card", "diagram", "departure", "timetable", "page",
                "poster", "marginalia", "showcard", "ledger", "log", "isobar",
                "label", "pictogram", "braille", "packaging", "whiteboard", "table"];
  const DATA = ["chart", "diagram", "trace", "plot", "graph", "recorder", "isobar",
                "waveform", "timeline", "dashboard", "instrument", "flight path",
                "settlement", "rota", "timetable", "tide table"];
  const ROCK = ["quarry", "marble", "stone", "granite", "monolith", "salt", "strata",
                "excavation", "slab", "mine", "carved"];

  function poolFor(q){
    const s = q.toLowerCase();
    const has = (list) => list.some((k) => s.includes(k));
    let pool = [landscape, objectShot, macro, interior];
    if (has(FLAT)) pool = pool.concat([panel, panel]);
    if (has(DATA)) pool = pool.concat([plot, plot]);
    if (has(ROCK)) pool = pool.concat([strata, strata]);
    return pool;
  }

  function finish(ctx, W, H, m, R){
    // Contrast curve + saturation lift, then grain. Without this the layered
    // translucent shapes average out to flat mid-grey and every result looks
    // like the same washed photograph.
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    const C = 1.46, S = 1.3, LIFT = -8;
    for (let i = 0; i < d.length; i += 4){
      let r = d[i], g2 = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g2 + 0.114 * b;
      r = lum + (r - lum) * S; g2 = lum + (g2 - lum) * S; b = lum + (b - lum) * S;
      r = (r - 128) * C + 128 + LIFT;
      g2 = (g2 - 128) * C + 128 + LIFT;
      b = (b - 128) * C + 128 + LIFT;
      const n = (R() - 0.5) * 22;
      d[i]     = r + n < 0 ? 0 : r + n > 255 ? 255 : r + n;
      d[i + 1] = g2 + n < 0 ? 0 : g2 + n > 255 ? 255 : g2 + n;
      d[i + 2] = b + n < 0 ? 0 : b + n > 255 ? 255 : b + n;
    }
    ctx.putImageData(img, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.76);
    g.addColorStop(0, "transparent"); g.addColorStop(1, "rgba(0,0,0,.38)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* Returns a data URL for `query`, varied by `index`. */
  function make(query, index, W = 200, H = 150){
    const R = rngFrom(seedOf(query + "::" + index));
    const m = moodFor(query);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    // Rotate through the pool by index rather than rolling for it, so any run of
    // results is guaranteed to vary instead of clustering on one composition.
    const pool = poolFor(query);
    pool[(seedOf(query) + index) % pool.length](ctx, W, H, m, R);
    finish(ctx, W, H, m, R);
    return cv.toDataURL("image/jpeg", 0.72);
  }

  /* ── brand marks ─────────────────────────────────────────
   * A client's site needs a logo, not a placeholder. These are drawn to look
   * like something a designer was paid for: one idea, executed flat, in the
   * client's own two colours. Deterministic on the seed, so a company's mark
   * never changes between visits.
   *
   * mark(seed, { style, brand, brand2, ink, text, size })
   */

  function initials(name){
    const words = String(name).replace(/[^A-Za-z ]/g, " ").split(/\s+/).filter(Boolean)
      .filter((w) => !/^(the|and|of|co|inc|ltd|for)$/i.test(w));
    if (!words.length) return "··";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function fitText(ctx, text, font, maxW, size){
    let s = size;
    do { ctx.font = "700 " + s + "px " + font; s -= 1; }
    while (ctx.measureText(text).width > maxW && s > 6);
    return s + 1;
  }

  const MARKS = {
    // A solid disc with the initials knocked out of it.
    disc(ctx, S, o, R){
      const c = S / 2, r = S * 0.44;
      ctx.fillStyle = o.brand;
      ctx.beginPath(); ctx.arc(c, c, r, 0, 6.284); ctx.fill();
      ctx.lineWidth = Math.max(1, S * 0.03); ctx.strokeStyle = o.brand2;
      ctx.beginPath(); ctx.arc(c, c, r * 0.82, 0, 6.284); ctx.stroke();
      ctx.fillStyle = o.bg;
      const f = fitText(ctx, o.text, o.face, r * 1.05, S * 0.4);
      ctx.font = "700 " + f + "px " + o.face;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.text, c, c + S * 0.015);
    },

    // Two offset squares — the second one printed slightly out of register.
    slab(ctx, S, o){
      const p = S * 0.1, w = S * 0.72;
      ctx.fillStyle = o.brand2;
      ctx.fillRect(p + S * 0.08, p + S * 0.08, w, w);
      ctx.fillStyle = o.brand;
      ctx.fillRect(p, p, w, w);
      ctx.fillStyle = o.bg;
      const f = fitText(ctx, o.text, o.face, w * 0.74, S * 0.38);
      ctx.font = "700 " + f + "px " + o.face;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.text, p + w / 2, p + w / 2 + S * 0.01);
    },

    // Abstract: bars of decreasing width. Reads as a signal, a stack, a ledger.
    stack(ctx, S, o, R){
      const n = 4, top = S * 0.2, gap = S * 0.14, h = S * 0.08;
      for (let i = 0; i < n; i++){
        ctx.fillStyle = i % 2 ? o.brand2 : o.brand;
        const w = S * (0.66 - i * 0.13) + (R() * S * 0.06);
        ctx.fillRect(S * 0.16, top + i * gap, Math.max(w, S * 0.14), h);
      }
    },

    // A shield. Institutions and anything that wants to look older than it is.
    crest(ctx, S, o){
      const x = S * 0.2, y = S * 0.12, w = S * 0.6, h = S * 0.72;
      ctx.fillStyle = o.brand;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * 0.58);
      ctx.quadraticCurveTo(x + w, y + h, x + w / 2, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h * 0.58);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = o.brand2;
      ctx.fillRect(x, y + h * 0.3, w, S * 0.05);
      ctx.fillStyle = o.bg;
      const f = fitText(ctx, o.text[0], o.face, w * 0.5, S * 0.3);
      ctx.font = "700 " + f + "px " + o.face;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(o.text[0], x + w / 2, y + h * 0.15);
    },

    // A pixel grid, partially filled. Software that admits it is software.
    grid(ctx, S, o, R){
      const n = 4, pad = S * 0.16, cell = (S - pad * 2) / n, gap = cell * 0.18;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
        const v = R();
        if (v < 0.28) continue;
        ctx.fillStyle = v > 0.76 ? o.brand2 : o.brand;
        ctx.globalAlpha = 0.55 + v * 0.45;
        ctx.fillRect(pad + x * cell, pad + y * cell, cell - gap, cell - gap);
      }
      ctx.globalAlpha = 1;
    },

    // Concentric arcs from a single point — broadcast, signal, sound.
    wave(ctx, S, o){
      const cx = S * 0.26, cy = S * 0.74;
      ctx.lineCap = "butt";
      for (let i = 0; i < 4; i++){
        ctx.strokeStyle = i % 2 ? o.brand2 : o.brand;
        ctx.lineWidth = S * 0.07;
        ctx.beginPath();
        ctx.arc(cx, cy, S * (0.16 + i * 0.16), -Math.PI / 2, 0);
        ctx.stroke();
      }
      ctx.fillStyle = o.brand;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.06, 0, 6.284); ctx.fill();
    },

    // A single letter debossed into a plate. For anything printed.
    press(ctx, S, o){
      ctx.fillStyle = o.brand2;
      ctx.fillRect(S * 0.1, S * 0.1, S * 0.8, S * 0.8);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const f = fitText(ctx, o.text, o.face, S * 0.58, S * 0.46);
      ctx.font = "700 " + f + "px " + o.face;
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillText(o.text, S / 2 + S * 0.012, S / 2 + S * 0.022);
      ctx.fillStyle = o.brand;
      ctx.fillText(o.text, S / 2, S / 2 + S * 0.01);
    },

    // A directional wedge. Transit, wayfinding, movement.
    chevron(ctx, S, o){
      ctx.fillStyle = o.brand;
      ctx.beginPath();
      ctx.moveTo(S * 0.16, S * 0.2); ctx.lineTo(S * 0.5, S * 0.2);
      ctx.lineTo(S * 0.84, S * 0.5); ctx.lineTo(S * 0.5, S * 0.8);
      ctx.lineTo(S * 0.16, S * 0.8); ctx.lineTo(S * 0.5, S * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = o.brand2;
      ctx.fillRect(S * 0.16, S * 0.46, S * 0.26, S * 0.08);
    },

    // A ring on a tilt, with a body inside it. Orbit, lens, aperture.
    orbit(ctx, S, o){
      const c = S / 2;
      ctx.strokeStyle = o.brand2; ctx.lineWidth = S * 0.055;
      ctx.beginPath(); ctx.ellipse(c, c, S * 0.42, S * 0.18, -0.5, 0, 6.284); ctx.stroke();
      ctx.fillStyle = o.brand;
      ctx.beginPath(); ctx.arc(c, c, S * 0.2, 0, 6.284); ctx.fill();
      ctx.strokeStyle = o.brand; ctx.lineWidth = S * 0.03;
      ctx.beginPath(); ctx.ellipse(c, c, S * 0.42, S * 0.18, -0.5, 3.6, 5.9); ctx.stroke();
    },

    // Two rules and a counter — the space inside a letter, for type people.
    counter(ctx, S, o){
      ctx.fillStyle = o.brand;
      ctx.fillRect(S * 0.14, S * 0.14, S * 0.72, S * 0.72);
      ctx.fillStyle = o.bg;
      ctx.fillRect(S * 0.34, S * 0.32, S * 0.34, S * 0.36);
      ctx.fillStyle = o.brand2;
      ctx.fillRect(S * 0.14, S * 0.5, S * 0.2, S * 0.36);
      ctx.fillRect(S * 0.66, S * 0.14, S * 0.2, S * 0.28);
    },

    // A horizon with one mass on it. Landscape businesses, quarries, places.
    horizon(ctx, S, o){
      ctx.fillStyle = o.brand2;
      ctx.fillRect(S * 0.12, S * 0.12, S * 0.76, S * 0.76);
      ctx.fillStyle = o.brand;
      ctx.beginPath();
      ctx.moveTo(S * 0.12, S * 0.66); ctx.lineTo(S * 0.38, S * 0.36);
      ctx.lineTo(S * 0.56, S * 0.56); ctx.lineTo(S * 0.72, S * 0.4);
      ctx.lineTo(S * 0.88, S * 0.66); ctx.lineTo(S * 0.88, S * 0.88);
      ctx.lineTo(S * 0.12, S * 0.88); ctx.closePath(); ctx.fill();
      ctx.fillStyle = o.bg;
      ctx.beginPath(); ctx.arc(S * 0.7, S * 0.28, S * 0.08, 0, 6.284); ctx.fill();
    },
  };

  const MARK_KEYS = Object.keys(MARKS);

  function mark(seed, opts = {}){
    const S = opts.size || 64;
    const R = rngFrom(seedOf("mark::" + seed));
    const o = {
      brand:  opts.brand  || "#C2452C",
      brand2: opts.brand2 || "#241A10",
      bg:     opts.bg     || "#FFFFFF",
      face:   opts.face   || "Helvetica, Arial, sans-serif",
      text:   opts.text   || initials(seed),
    };
    const cv = document.createElement("canvas");
    // Drawn at 2× so it stays crisp in a 32px header slot.
    const px = S * 2;
    cv.width = px; cv.height = px;
    const ctx = cv.getContext("2d");
    if (opts.plate){ ctx.fillStyle = o.bg; ctx.fillRect(0, 0, px, px); }
    const fn = MARKS[opts.style] || MARKS[MARK_KEYS[seedOf(seed) % MARK_KEYS.length]];
    fn(ctx, px, o, R);
    return cv.toDataURL("image/png");
  }

  // Plausible filenames, so results read like a real index.
  function filename(query, i){
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 26);
    const R = rngFrom(seedOf(query + "|f|" + i));
    const w = [640, 800, 1024, 1280, 1600][(R() * 5) | 0];
    return slug + "-" + String(100 + ((R() * 899) | 0)) + "_" + w + ".jpg";
  }
  function dimensions(query, i){
    const R = rngFrom(seedOf(query + "|d|" + i));
    const w = [640, 800, 1024, 1280, 1600][(R() * 5) | 0];
    return w + " × " + Math.round(w * (0.62 + R() * 0.3));
  }

  return { make, filename, dimensions, mark, initials };
})();
