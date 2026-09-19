"use strict";
/* ── Paper Moon Relay: the canon ─────────────────────────────
 * The two characters Nell's shrine is about, designed once and used
 * everywhere: the official site's model sheets, the fan site's colour picks,
 * the image search, the reference board, the on-model score, and the
 * character bible. The art itself is generated into characters.art.js from
 * tools/characters/*.py; everything written about them lives here.
 *
 * The pure half (canon, grids, reference data) runs under node. The canvas
 * half (art(), register()) needs a document.
 */

const Characters = (() => {
  const ART = typeof CHARACTER_ART !== "undefined" ? CHARACTER_ART : require("./characters.art.js");

  const SERIES = {
    title: "Paper Moon Relay",
    episodes: 12,
    site: "papermoonrelay.tv",
    premise: "Hoshizora High's 4×100 relay team loses its third leg. In episode 7 the best curve runner in the prefecture transfers in — from the rival school that beat them. The prefectural final, episode 12, is run at dusk under a paper-lantern moon strung over the finish line.",
    baton: "Sky-blue aluminium, with a gold star sticker Toma put on it.",
  };

  const SCHOOLS = {
    hoshizora: {
      name: "Hoshizora High", gloss: "starry sky",
      kit: "White singlet with sky-blue side panels and a gold five-point star on the chest; sky-blue shorts with a white stripe.",
      colours: [["Sky", "#7EC8F0"], ["White", "#F6F7F2"], ["Star gold", "#F2C94C"]],
    },
    kurohama: {
      name: "Kurohama Technical", gloss: "black beach",
      kit: "Navy track jacket with white piping, stripes down the sleeves, and a teal wave on the left chest.",
      colours: [["Navy", "#1B2A4A"], ["Black", "#0E1117"], ["Wave teal", "#3FB8AF"]],
    },
  };

  const CAST = {
    toma: {
      name: "Toma Arakawa", native: "荒川 斗真",
      role: "Anchor leg", school: "hoshizora", year: "Second year", age: 16, height: 172,
      signature: "The anchor who never had to wait, learning to leave on someone else's call.",
      about: [
        "Loud, quick to grin, bad at standing still — which is why he runs anchor: he only has to wait once.",
        "In the final he has to set off on Kiyoshi's call without looking back, the blind hand-off, and trust that the baton will be there.",
      ],
      details: [
        ["Silhouette", "Spiky dark hair pushed up over the band like a hedge, one upright cowlick at the crown that is never flattened, long arms, a narrow waist. Readable from the hair alone."],
        ["The sweatband", "Orange, across the forehead, always on. It was his older sister Mei's, from when she ran anchor for Hoshizora before a torn hamstring ended it. The tails flick out on his right."],
        ["Face", "Round amber eyes, thick brows that do most of his talking, and a chipped left front tooth that only shows when he grins. A hurdle, age twelve."],
        ["Kit", "The Hoshizora singlet and sky shorts. White spikes he re-laced in orange to match the band."],
        ["Off the track", "An oversized orange hoodie, sleeves shoved to the elbow."],
      ],
      tells: ["Taps the sweatband twice before every start.", "Talks while he runs.", "Bounces on his toes in the exchange zone."],
      line: "Just get it to me. I'll do the rest.",
      palette: [
        ["O", "Sweatband orange"], ["H", "Hair"], ["h", "Hair light"], ["S", "Skin"], ["s", "Skin shadow"],
        ["E", "Eyes, amber"], ["K", "Kit white"], ["B", "Kit sky"], ["G", "Star gold"],
      ],
      rules: {
        do: ["Keep the cowlick upright in every pose.", "Band always orange, always on, tails on his right.", "Show the chipped tooth only in a grin."],
        dont: ["Never flatten the hair under the band.", "Never put him in the Kurohama jacket.", "Never draw him taller than Kiyoshi."],
      },
    },
    kiyoshi: {
      name: "Kiyoshi Mori", native: "森 清志",
      role: "Third leg", school: "kurohama", transfer: "hoshizora", year: "Second year", age: 17, height: 178,
      signature: "The perfectionist who ran for a stopwatch, learning to run for people.",
      about: [
        "Quiet, precise, polite to the point of cold; counts his steps under his breath. Third leg runs the curve, and nobody in the prefecture takes it faster.",
        "He transfers in episode 7 — to the school that beat his.",
      ],
      details: [
        ["Silhouette", "Tall and straight, long legs, narrow shoulders, a high zipped collar, and a long fringe falling over his left eye."],
        ["The jacket", "Navy Kurohama track jacket: white piping, stripes down the sleeves, a teal wave on the left chest. Zipped to the chin before every race, off only when he takes his mark. He still wears it at Hoshizora. The show never says why; the fandom has fourteen theories and a spreadsheet."],
        ["Face", "Narrow grey eyes, calm; a small beauty mark under his right eye."],
        ["Hair", "Straight and blue-black, cut to the jaw. He pushes the fringe back with two fingers before he runs; it falls straight back."],
        ["Kit", "After the transfer, Hoshizora shorts under a Kurohama jacket — the only runner on the team in two schools' colours. He kept his black Kurohama spikes."],
      ],
      tells: ["Counts his steps.", "The two-finger push of the fringe.", "The hand-off call: a single sharp “Hai!”, which is how Toma knows to reach back."],
      line: "Don't look back. I'll be there.",
      palette: [
        ["N", "Jacket navy"], ["n", "Jacket shadow"], ["P", "Piping white"], ["A", "Wave teal"], ["H", "Hair"],
        ["h", "Hair light"], ["S", "Skin"], ["s", "Skin shadow"], ["E", "Eyes, grey"], ["D", "Beauty mark"],
        ["B", "Shorts sky"], ["X", "Spikes black"],
      ],
      rules: {
        do: ["The fringe covers his left eye — the viewer's right.", "Collar zipped to the chin whenever the jacket is on.", "The beauty mark sits under his right eye."],
        dont: ["Never both eyes fully visible.", "Never a Hoshizora jacket: the jacket is Kurohama's.", "Never shorter than Toma: Toma's band sits at his eye line."],
      },
    },
  };

  const PAIRING = {
    name: "TomaKiyo",
    colours: "Orange × navy — the sweatband and the jacket. In episode 12 the hand-off is the first time their colours touch.",
    scale: "Kiyoshi is 6 cm taller; Toma's sweatband sits at Kiyoshi's eye line. Draw them at the same scale and it takes care of itself.",
    handoff: "Kiyoshi incoming on the inside of the curve; Toma ahead, not looking back, right hand reaching behind him, palm up.",
    line: "#2A1E24",
  };

  const POSES = ["front", "side", "bust"];
  const POSE_LABEL = { front: "front", side: "side", bust: "bust" };

  /* ── the grids (pure) ──────────────────────────────────── */
  const has = (id, pose) => !!(ART[id] && ART[id].poses[pose]);
  const pose = (id, p) => (has(id, p) ? ART[id].poses[p] : null);

  function hexToRGB(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();

  // Episode 12's light: everything cooler in the shadows, warmer on top,
  // and a little darker. The line colour never changes.
  function dusk(hex) {
    if (hex === PAIRING.line) return hex;
    const [r, g, b] = hexToRGB(hex);
    return toHex(r * 0.84 + 26, g * 0.66 + 10, b * 0.72 + 30);
  }

  function colourOf(id, key, variant) {
    const hex = ART[id].palette[key];
    return hex ? (variant === "dusk" ? dusk(hex) : hex) : null;
  }

  // The colour of the region a pixel belongs to: its base tone, even on a
  // shadow pixel. The scorer uses this for "right region, flat colour".
  function baseKey(id, key) {
    return (ART[id].shadowOf && ART[id].shadowOf[key]) || key;
  }

  /* Reference data for scoring, at the pose's native resolution, cropped to
   * the figure's tight bounds. rgba is the canon colour; base is each pixel's
   * region base colour; alt is the dusk colour, which is also accepted. */
  function reference(id, p) {
    const g = pose(id, p);
    if (!g) return null;
    let x0 = g.w, y0 = g.h, x1 = -1, y1 = -1;
    g.rows.forEach((row, y) => [...row].forEach((k, x) => {
      if (k === ".") return;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }));
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const rgba = new Uint8ClampedArray(w * h * 4);
    const base = new Array(w * h).fill(null), alt = new Array(w * h).fill(null), keys = new Array(w * h).fill(".");
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = g.rows[y + y0][x + x0];
        if (k === ".") continue;
        const i = y * w + x;
        const [r, gg, b] = hexToRGB(ART[id].palette[k]);
        rgba.set([r, gg, b, 255], i * 4);
        keys[i] = k;
        base[i] = ART[id].palette[baseKey(id, k)];
        alt[i] = dusk(ART[id].palette[k]);
      }
    }
    return { id, pose: p, w, h, rgba, base, alt, keys };
  }

  // Figure height in pixels: the canon scale, 90 for Toma and 93 for Kiyoshi
  // on the full-body sheets.
  const heightOf = (id, p) => { const g = pose(id, p); return g ? g.bottom - g.top + 1 : 0; };

  /* ── drawing (canvas) ──────────────────────────────────── */
  const cache = new Map();

  /* A data-URI PNG of a pose at a whole-number scale, so every pixel is a
   * flat block. With `frame`, the figure sits on an official-art card sized
   * for the image search; without, the background is transparent. */
  function art(id, p, opts = {}) {
    const g = pose(id, p);
    if (!g) return null;
    const variant = opts.variant || "canon";
    const key = [id, p, variant, opts.scale || 0, opts.frame ? opts.w + "x" + opts.h : "bare"].join("|");
    if (cache.has(key)) return cache.get(key);

    let W, H, scale, ox, oy;
    if (opts.frame) {
      W = opts.w || 320; H = opts.h || 240;
      scale = Math.max(1, Math.floor(Math.min((W - 16) / g.w, (H - 24) / (g.bottom - g.top + 1))));
      ox = Math.floor((W - g.w * scale) / 2);
      oy = H - 12 - (g.bottom + 1) * scale;
    } else {
      scale = Math.max(1, Math.round(opts.scale || 1));
      W = g.w * scale; H = g.h * scale; ox = 0; oy = 0;
    }
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    if (opts.frame) {
      const dusky = variant === "dusk";
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, dusky ? "#3B2A4E" : "#F4EFE6");
      bg.addColorStop(1, dusky ? "#C2664A" : "#E4DCCD");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = dusky ? "rgba(255,210,160,.18)" : "rgba(42,30,36,.08)";
      for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 1);
      ctx.fillStyle = dusky ? "rgba(255,230,200,.8)" : "rgba(42,30,36,.55)";
      ctx.font = "9px Silkscreen, monospace";
      ctx.fillText("PAPER MOON RELAY · " + CAST[id].name.toUpperCase(), 6, 12);
    }
    g.rows.forEach((row, y) => {
      [...row].forEach((k, x) => {
        if (k === ".") return;
        ctx.fillStyle = colourOf(id, k, variant);
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      });
    });
    const uri = cv.toDataURL("image/png");
    cache.set(key, uri);
    return uri;
  }

  /* The series' key visual: both of them at one scale, at dusk, under the
   * paper-lantern moon, on the track. Composed from the model sheets, so it
   * can never drift off-model. */
  function keyVisual(W = 760, H = 260) {
    const key = "kv|" + W + "x" + H;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#2B1F45"); sky.addColorStop(0.55, "#8A4B6E"); sky.addColorStop(1, "#E07B4F");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // the paper moon: a lantern, with its ribs
    const mx = Math.round(W * 0.72), my = Math.round(H * 0.28), mr = Math.round(H * 0.17);
    ctx.fillStyle = "#FFE6B8"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(194,102,74,.55)"; ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(mx, my, Math.abs(k) * mr / 3 || 1, mr, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.strokeStyle = "rgba(42,30,36,.6)"; ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, my - mr); ctx.stroke();
    // the track: lanes running to the horizon
    const hz = Math.round(H * 0.7);
    ctx.fillStyle = "#9C4A38"; ctx.fillRect(0, hz, W, H - hz);
    ctx.strokeStyle = "rgba(255,230,200,.55)"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const y = hz + 6 + i * ((H - hz) / 6); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 4); ctx.stroke(); }
    // the two of them, one scale, one baseline, dusk palette
    const scale = Math.max(1, Math.floor((H - 16) / 96));
    const place = (id, x) => {
      const g = pose(id, "front");
      g.rows.forEach((row, y) => [...row].forEach((k, xx) => {
        if (k === ".") return;
        ctx.fillStyle = colourOf(id, k, "dusk");
        ctx.fillRect(x + xx * scale, H - 8 - (g.h - y) * scale, scale, scale);
      }));
    };
    // Clear of the site's title, which sits bottom-left over the hero.
    place("kiyoshi", Math.round(W * 0.44));
    place("toma", Math.round(W * 0.44) + 36 * scale);
    ctx.fillStyle = "rgba(255,230,200,.85)";
    ctx.font = "10px Silkscreen, monospace";
    ctx.fillText("PAPER MOON RELAY", 12, 20);
    const uri = cv.toDataURL("image/png");
    cache.set(key, uri);
    return uri;
  }

  /* ── the image search ──────────────────────────────────── */
  // What each search shows, in order. Several official images per query,
  // including episode 12's dusk frames.
  const SEARCHES = {
    "toma arakawa": [["toma", "front"], ["toma", "bust"], ["toma", "side"], ["toma", "bust", "dusk"], ["toma", "front", "dusk"]],
    "kiyoshi mori": [["kiyoshi", "front"], ["kiyoshi", "bust"], ["kiyoshi", "side"], ["kiyoshi", "bust", "dusk"], ["kiyoshi", "front", "dusk"]],
    "paper moon relay": [["toma", "front"], ["kiyoshi", "front"], ["toma", "bust", "dusk"], ["kiyoshi", "bust", "dusk"], ["toma", "side"], ["kiyoshi", "side"]],
    "tomakiyo": [["toma", "bust"], ["kiyoshi", "bust"], ["toma", "bust", "dusk"], ["kiyoshi", "bust", "dusk"]],
  };
  SEARCHES["toma"] = SEARCHES["toma arakawa"];
  SEARCHES["kiyoshi"] = SEARCHES["kiyoshi mori"];

  function poseFor(query, index) {
    const list = SEARCHES[String(query).toLowerCase().trim()];
    if (!list) return null;
    const [id, p, variant] = list[index % list.length];
    return { id, pose: p, variant: variant || "canon", name: CAST[id].name };
  }

  function register() {
    if (typeof Imagery === "undefined" || typeof document === "undefined") return false;
    // Framed at the search grid's own size, so thumbnails are 1:1 and crisp.
    for (const [q, list] of Object.entries(SEARCHES)) {
      Imagery.override(q, list.map(([id, p, variant]) => art(id, p, { frame: true, w: 200, h: 150, variant })));
    }
    Imagery.override("paper moon relay key visual", keyVisual(760, 260));
    return true;
  }

  return {
    SERIES, SCHOOLS, CAST, PAIRING, POSES, POSE_LABEL, ART,
    has, pose, reference, heightOf, dusk, colourOf, baseKey, hexToRGB,
    art, keyVisual, register, poseFor, searches: () => Object.keys(SEARCHES),
  };
})();

if (typeof module !== "undefined") module.exports = Characters;
