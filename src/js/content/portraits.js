"use strict";
/* ── people, drawn from a seed ─────────────────────────────
 *
 * Nothing in this app is fetched, so nobody's face is a file. A person is a
 * handle — "batonpass_nell" — hashed the way imagery.js hashes a search query,
 * and the traits that fall out are drawn four ways:
 *
 *   head(seed)    a small square head for a contacts row        (crisp, 1px grid)
 *   paintFeed()   a 320x240 call frame, them in their own room  (8fps, blocky)
 *   photo(seed)   the company photograph for an About page      (their theme)
 *   photo(.card)  the same, clipped, carrying its palette       (a suite card)
 *
 * Content may pin any trait through `look`, so a character an author cares
 * about is never at the mercy of a dice roll. Everything below the trait
 * tables is pure canvas; traits() itself runs anywhere, which is what the
 * tests use.
 */

const Portraits = (() => {

  /* ── the same PRNG imagery.js uses ───────────────────── */
  function seedOf(str){
    let h = 1779033703 ^ String(str).length;
    for (let i = 0; i < String(str).length; i++){
      h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
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
  function shade(hex, amt){
    const n = parseInt(String(hex).slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function mix(a, b, t){
    const A = parseInt(String(a).slice(1), 16), B = parseInt(String(b).slice(1), 16);
    const r = Math.round((((A >> 16) & 255) * (1 - t)) + (((B >> 16) & 255) * t));
    const g = Math.round((((A >> 8) & 255) * (1 - t)) + (((B >> 8) & 255) * t));
    const c = Math.round(((A & 255) * (1 - t)) + ((B & 255) * t));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | c).toString(16).slice(1);
  }

  /* ── trait tables ────────────────────────────────────── */
  const SKIN   = ["#F7DCC2", "#F2C9A8", "#E0A87C", "#C98B5F", "#A56A44", "#7C4B2E", "#5A3520", "#3E2417"];
  const HAIR   = ["#1B1512", "#2B211A", "#3A2A1E", "#5A2E2E", "#6B4A2B", "#A8752F", "#C89A4A", "#D9C08A", "#8E8E93", "#D8D8DC"];
  const GREY   = ["#8E8E93", "#B4B4BA", "#D8D8DC"];
  const STYLES = ["crop", "shortback", "bob", "long", "ponytail", "bun", "curls", "braids", "bald", "cap", "beanie", "headscarf"];
  const FACIAL = ["none", "none", "none", "stubble", "moustache", "beard"];
  const SPECS  = ["none", "none", "none", "round", "square"];
  const EXTRAS = ["none", "none", "earrings", "collar", "lanyard", "scarf"];
  const BUILDS = ["narrow", "regular", "regular", "broad"];
  const AGES   = ["young", "mid", "mid", "older"];

  // A person. `look` pins anything content cares about; the rest rolls.
  function traits(seed, look){
    const r = rngFrom(seedOf(seed));
    const pick = (a) => a[Math.floor(r() * a.length) % a.length];
    const t = {
      skin:    pick(SKIN),
      hair:    pick(HAIR),
      style:   pick(STYLES),
      facial:  pick(FACIAL),
      specs:   pick(SPECS),
      extra:   pick(EXTRAS),
      build:   pick(BUILDS),
      age:     pick(AGES),
      band:    null,          // a coloured band across the forehead
      garment: null,          // overridden by the site's brand at draw time
      tint:    null,          // something at the throat: a tape measure, a tie
      // Pieces only the camera builder hands out. They default to nothing, so
      // nobody already in the game changes.
      top: "plain", marks: "none", ears: "none", hat: null, accent: null,
    };
    if (t.age === "older") t.hair = mix(t.hair, GREY[Math.floor(r() * 3) % 3], 0.55 + r() * 0.35);
    const o = look || {};
    for (const k in o) if (o[k] !== undefined) t[k] = o[k];
    return t;
  }

  /* ── the grid ────────────────────────────────────────── */
  const GW = 24, GH = 30;
  const HX = 7, HW = 10, HY = 6, HH = 14;      // head box

  function paint(g, t, o){
    o = o || {};
    const mood  = o.mood || "neutral";
    const skin  = t.skin;
    const dark  = shade(skin, -0.13);
    const deep  = shade(skin, -0.24);
    const hair  = t.hair;
    const hairD = shade(hair, -0.18);
    const cloth = o.garment || t.garment || "#4E6E88";
    const clothD = shade(cloth, -0.16);
    const liner = o.line || hairD;
    const dy    = o.bob ? 1 : 0;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y + (y >= 4 ? dy : 0), w, h); };

    /* torso */
    const bw = t.build === "narrow" ? 18 : t.build === "broad" ? 22 : 20;
    const bx = Math.round((GW - bw) / 2);
    R(bx, 23, bw, 7, cloth);
    R(bx, 23, bw, 1, shade(cloth, 0.10));
    R(bx, 24, 2, 6, clothD); R(bx + bw - 2, 24, 2, 6, clothD);
    R(10, 23, 4, 2, clothD);                                 // collar notch
    // What you are wearing goes on before anything that hangs over it.
    const acc = t.accent || "#F4F1EA";
    switch (t.top){
      case "tee":      R(10, 23, 4, 1, shade(cloth, -0.24)); break;
      case "hoodie":   R(8, 21, 8, 2, shade(cloth, -0.14)); R(10, 24, 1, 3, "#E8E4DA"); R(13, 24, 1, 3, "#E8E4DA"); R(bx + 3, 28, bw - 6, 1, clothD); break;
      case "shirt":    R(9, 23, 2, 2, shade(cloth, 0.26)); R(13, 23, 2, 2, shade(cloth, 0.26)); R(12, 24, 1, 6, clothD);
                       R(11, 25, 1, 1, shade(cloth, 0.3)); R(11, 27, 1, 1, shade(cloth, 0.3)); break;
      case "stripes":  for (let y = 24; y < 30; y += 2) R(bx, y, bw, 1, shade(cloth, 0.28)); break;
      case "sweater":  for (let y = 24; y < 30; y++) for (let x = bx + (y % 2); x < bx + bw; x += 2) R(x, y, 1, 1, shade(cloth, -0.07)); break;
      case "jacket":   R(11, 23, 2, 4, acc); R(9, 23, 2, 4, shade(cloth, -0.24)); R(13, 23, 2, 4, shade(cloth, -0.24)); R(12, 27, 1, 1, clothD); break;
      case "cardigan": R(10, 23, 4, 7, acc); R(9, 23, 1, 7, clothD); R(14, 23, 1, 7, clothD); R(9, 25, 1, 1, "#E8E4DA"); R(9, 28, 1, 1, "#E8E4DA"); break;
      case "overalls": R(9, 25, 6, 5, t.accent || "#3A5A8A"); R(9, 23, 1, 2, t.accent || "#3A5A8A"); R(14, 23, 1, 2, t.accent || "#3A5A8A");
                       R(9, 25, 1, 1, "#E8C36A"); R(14, 25, 1, 1, "#E8C36A"); break;
    }
    if (t.extra === "collar"){ R(9, 23, 2, 3, shade(cloth, 0.16)); R(13, 23, 2, 3, shade(cloth, 0.16)); }
    if (t.extra === "lanyard"){ R(10, 23, 1, 4, "#2E3338"); R(13, 23, 1, 4, "#2E3338"); R(11, 27, 2, 3, "#D8D8DC"); }
    if (t.extra === "scarf"){ R(8, 22, 8, 2, shade(cloth, 0.22)); R(9, 24, 2, 4, shade(cloth, 0.28)); }
    if (t.tint){ R(9, 22, 6, 1, t.tint); R(9, 23, 1, 4, t.tint); R(14, 23, 1, 3, t.tint); }

    /* neck */
    R(10, 19, 4, 5, dark);
    R(10, 22, 4, 1, deep);
    if (t.top === "turtleneck"){ R(9, 19, 6, 4, cloth); R(9, 19, 6, 1, shade(cloth, 0.1)); R(13, 20, 2, 3, clothD); }
    switch (t.extra){
      case "bowtie":     R(9, 22, 2, 2, acc); R(13, 22, 2, 2, acc); R(11, 22, 2, 2, shade(acc, -0.2)); break;
      case "tie":        R(11, 22, 2, 1, shade(acc, 0.1)); R(11, 23, 2, 6, acc); R(11, 28, 2, 1, shade(acc, -0.2)); break;
      case "necklace":   R(9, 22, 1, 1, "#E8C36A"); R(14, 22, 1, 1, "#E8C36A"); R(10, 23, 4, 1, "#E8C36A"); R(11, 24, 2, 1, acc); break;
      case "headphones": R(7, 20, 10, 1, "#2A2A30"); R(6, 20, 2, 3, "#3A3A42"); R(16, 20, 2, 3, "#3A3A42"); R(6, 20, 1, 1, acc); break;
    }

    /* head */
    R(HX, HY, HW, HH, skin);
    R(HX, HY, HW, 1, shade(skin, 0.06));
    R(HX + HW - 2, HY + 1, 2, HH - 2, dark);                 // one side in shadow
    R(6, 12, 1, 4, dark); R(17, 12, 1, 4, deep);             // ears
    R(HX, 18, HW, 2, dark);                                  // jaw

    /* hair */
    const H = (x, y, w, h, c) => R(x, y, w, h, c || hair);
    const hat = t.hat, wrap = hat || shade(cloth, 0.10), shaved = mix(hair, skin, 0.55);
    switch (t.style){
      case "crop":      H(7, 5, 10, 3); H(7, 8, 1, 3); H(16, 8, 1, 3); break;
      case "shortback": H(7, 5, 10, 2); H(7, 7, 1, 6, hairD); H(16, 7, 1, 6, hairD); break;
      case "bob":       H(6, 5, 12, 3); H(6, 8, 2, 9); H(16, 8, 2, 9); break;
      case "long":      H(6, 5, 12, 3); H(5, 8, 3, 17); H(16, 8, 3, 17); H(5, 24, 3, 1, hairD); H(16, 24, 3, 1, hairD); break;
      case "ponytail":  H(7, 5, 10, 3); H(7, 8, 1, 3); H(16, 8, 1, 3); H(17, 8, 3, 11); H(18, 18, 2, 3, hairD); break;
      case "bun":       H(7, 5, 10, 3); H(7, 8, 1, 2); H(16, 8, 1, 2); H(10, 2, 4, 3); H(11, 5, 2, 1, hairD); break;
      case "curls":     H(6, 4, 12, 4); H(5, 7, 3, 4); H(16, 7, 3, 4); H(7, 3, 3, 2); H(13, 3, 4, 2); break;
      case "braids":    H(7, 5, 10, 3); H(5, 8, 2, 16); H(17, 8, 2, 16);
                        for (let i = 10; i < 24; i += 3){ H(5, i, 2, 1, hairD); H(17, i, 2, 1, hairD); } break;
      case "bald":      R(7, 5, 10, 2, shade(skin, 0.05)); R(9, 6, 3, 1, shade(skin, 0.12)); break;
      case "cap":       H(6, 4, 12, 4, hat || shade(cloth, -0.28)); H(4, 8, 10, 1, shade(hat || cloth, hat ? -0.2 : -0.42)); H(8, 3, 8, 1, hat ? shade(hat, 0.12) : shade(cloth, -0.14)); break;
      case "beanie":    H(6, 3, 12, 6, hat || shade(cloth, -0.20)); H(6, 8, 12, 1, shade(hat || cloth, hat ? -0.16 : -0.34)); H(11, 1, 2, 2, hat || shade(cloth, -0.20)); break;
      case "headscarf": H(6, 4, 12, 5, wrap); H(6, 9, 2, 8, shade(wrap, -0.14)); H(16, 9, 2, 8, shade(wrap, -0.14)); break;
      case "afro":      H(5, 1, 14, 2); H(4, 3, 16, 5); H(3, 6, 4, 8); H(17, 6, 4, 8); H(7, 2, 4, 1, shade(hair, 0.14)); H(4, 13, 3, 1, hairD); H(17, 13, 3, 1, hairD); break;
      case "puffs":     H(7, 5, 10, 2); H(3, 1, 6, 5); H(15, 1, 6, 5); H(4, 0, 4, 1); H(16, 0, 4, 1); H(4, 1, 2, 1, shade(hair, 0.14)); H(16, 1, 2, 1, shade(hair, 0.14)); break;
      case "locs":      H(6, 4, 12, 4); H(7, 3, 10, 1, shade(hair, 0.1));
                        for (const [x, len] of [[5, 15], [7, 4], [16, 5], [18, 14]]){ H(x, 8, 2, len); H(x, 8 + len - 1, 2, 1, hairD); } break;
      case "buzz":      R(7, 5, 10, 1, mix(hair, skin, 0.3)); R(7, 6, 10, 1, shaved); R(7, 7, 1, 3, shaved); R(16, 7, 1, 3, shaved); break;
      case "mohawk":    R(7, 5, 10, 2, shade(skin, 0.05)); H(10, 1, 4, 6); H(11, 0, 2, 1); H(10, 2, 1, 3, shade(hair, 0.14)); break;
      case "sidepart":  H(7, 5, 10, 3); H(7, 8, 6, 1); H(7, 8, 1, 4); H(16, 8, 1, 3); R(13, 5, 1, 2, hairD); break;
      case "pigtails":  H(7, 5, 10, 3); H(7, 8, 1, 3); H(16, 8, 1, 3); H(4, 11, 3, 8); H(17, 11, 3, 8);
                        R(4, 11, 3, 1, hat || acc); R(17, 11, 3, 1, hat || acc); break;
      case "fringe":    H(6, 5, 12, 3); H(7, 8, 10, 2); H(6, 8, 2, 10); H(16, 8, 2, 10); H(8, 9, 1, 1, hairD); H(12, 9, 1, 1, hairD); break;
      case "undercut":  H(7, 4, 10, 3); H(12, 3, 5, 1); H(12, 7, 5, 2); R(7, 7, 1, 4, shaved); R(16, 9, 1, 2, shaved); break;
      case "cornrows":  H(7, 5, 10, 3); for (let x = 8; x < 16; x += 2) R(x, 5, 1, 3, hairD); H(7, 8, 1, 2); H(16, 8, 1, 2); H(11, 19, 2, 3); break;
      case "hijab":     H(5, 3, 14, 5, wrap); H(5, 8, 2, 13, shade(wrap, -0.1)); H(17, 8, 2, 13, shade(wrap, -0.1));
                        H(7, 8, 10, 1, shade(wrap, -0.16)); H(7, 19, 10, 4, wrap); H(6, 22, 12, 3, shade(wrap, -0.08)); break;
      case "turban":    H(6, 2, 12, 6, wrap); H(7, 3, 10, 1, shade(wrap, -0.12)); H(6, 5, 12, 1, shade(wrap, -0.14)); H(10, 1, 4, 2, shade(wrap, 0.1)); H(7, 8, 1, 2, hairD); H(16, 8, 1, 2, hairD); break;
    }

    /* the years */
    if (t.age === "older"){ R(8, 11, 2, 1, dark); R(14, 11, 2, 1, dark); R(9, 17, 1, 2, dark); R(14, 17, 1, 2, dark); }

    /* brows — they carry the mood more than the mouth does */
    const lift = mood === "warm" ? -1 : 0;
    const knit = mood === "cool" ? 1 : 0;
    R(8, 11 + lift, 3, 1, liner);
    R(13, 11 + lift + knit, 3, 1, liner);

    /* eyes */
    const ey = 13;
    if (o.blink || mood === "warm"){
      R(9, ey, 2, 1, "#14181B"); R(13, ey, 2, 1, "#14181B");
    } else {
      const look = o.glance ? 1 : 0;                          // drifting off-camera
      R(9, ey, 2, 2, "#FFFFFF"); R(13, ey, 2, 2, "#FFFFFF");
      R(10 - look, ey, 1, 2, "#14181B"); R(14 - look, ey, 1, 2, "#14181B");
    }

    /* nose */
    R(12, 15, 1, 2, dark); R(11, 16, 1, 1, deep);

    /* mouth */
    if (o.mouthOpen){ R(10, 17, 4, 2, "#5E2F2D"); R(11, 18, 2, 1, "#8C4A47"); }
    else if (mood === "warm"){ R(10, 17, 5, 1, "#8C4A47"); R(11, 18, 3, 1, shade("#8C4A47", -0.12)); }
    else if (mood === "cool"){ R(10, 18, 4, 1, "#8C4A47"); R(9, 17, 1, 1, "#8C4A47"); R(14, 17, 1, 1, "#8C4A47"); }
    else if (mood === "gone"){ R(11, 17, 2, 1, "#8C4A47"); }
    else { R(10, 17, 4, 1, "#8C4A47"); }

    /* facial hair, over the mouth */
    if (t.facial === "stubble"){ R(8, 16, 8, 4, mix(skin, hair, 0.22)); R(10, 17, 4, 1, "#8C4A47"); }
    else if (t.facial === "moustache"){ R(10, 16, 4, 1, hair); }
    else if (t.facial === "goatee"){ R(10, 16, 4, 1, hair); R(10, 18, 4, 2, hair); R(11, 20, 2, 1, hairD); }
    else if (t.facial === "sideburns"){ R(7, 10, 1, 7, hair); R(16, 10, 1, 7, hair); }
    else if (t.facial === "beard"){
      R(8, 16, 8, 4, hair); R(9, 20, 6, 1, hairD); R(10, 17, 4, 1, "#7A3E3B"); R(10, 16, 4, 1, hairD);
    }

    /* a band across the forehead: a sweatband, a headset, a hairline */
    if (t.band){ R(7, 10, 10, 1, t.band); R(6, 10, 1, 1, shade(t.band, -0.18)); R(17, 10, 1, 1, shade(t.band, -0.18)); }
    if (t.extra === "earrings"){ R(6, 16, 1, 1, "#E8C36A"); R(17, 16, 1, 1, "#E8C36A"); }
    const spot = mix(skin, "#6E3A1E", 0.42);
    if (t.marks === "freckles") for (const [x, y] of [[8, 15], [9, 16], [10, 15], [14, 15], [15, 16], [13, 16]]) R(x, y, 1, 1, spot);
    if (t.marks === "mole") R(14, 17, 1, 1, shade(spot, -0.2));
    if (t.marks === "blush"){ R(8, 15, 2, 1, mix(skin, "#E0606A", 0.4)); R(14, 15, 2, 1, mix(skin, "#E0606A", 0.4)); }
    if (t.ears === "studs"){ R(6, 15, 1, 1, "#EDEFF4"); R(17, 15, 1, 1, "#EDEFF4"); }
    if (t.ears === "hoops"){ R(5, 16, 1, 3, "#E8C36A"); R(6, 18, 1, 1, "#E8C36A"); R(18, 16, 1, 3, "#E8C36A"); R(17, 18, 1, 1, "#E8C36A"); }
    if (t.ears === "hearingaid"){ R(17, 11, 1, 1, "#C9B79E"); R(18, 11, 1, 4, "#C9B79E"); R(17, 14, 1, 1, "#9E8C74"); }

    /* glasses, over everything */
    if (t.specs !== "none"){
      const f = "#2B3136";
      if (t.specs === "shades"){
        R(8, 12, 4, 3, "#1C1C22"); R(13, 12, 4, 3, "#1C1C22"); R(9, 12, 1, 1, "#5A5A6A"); R(14, 12, 1, 1, "#5A5A6A");
      } else if (t.specs === "cateye"){
        R(8, 12, 4, 1, f); R(13, 12, 4, 1, f); R(7, 11, 1, 1, f); R(17, 11, 1, 1, f);
        R(8, 15, 4, 1, f); R(13, 15, 4, 1, f); R(8, 13, 1, 2, f); R(11, 13, 1, 2, f); R(13, 13, 1, 2, f); R(16, 13, 1, 2, f);
      } else if (t.specs === "round"){
        R(8, 12, 4, 1, f); R(8, 15, 4, 1, f); R(8, 13, 1, 2, f); R(11, 13, 1, 2, f);
        R(13, 12, 4, 1, f); R(13, 15, 4, 1, f); R(13, 13, 1, 2, f); R(16, 13, 1, 2, f);
      } else {
        R(8, 12, 4, 4, f); R(9, 13, 2, 2, "rgba(0,0,0,0)");
        R(13, 12, 4, 4, f); R(14, 13, 2, 2, "rgba(0,0,0,0)");
        g.fillStyle = mix(skin, "#FFFFFF", 0.18);
        g.fillRect(9, 13 + dy, 2, 2); g.fillRect(14, 13 + dy, 2, 2);
        if (!o.blink){ R(10, 13, 1, 2, "#14181B"); R(15, 13, 1, 2, "#14181B"); }
      }
      R(12, 13, 1, 1, f); R(7, 13, 1, 1, f); R(17, 13, 1, 1, f);
    }
  }

  /* ── rooms: what is behind them ──────────────────────── */
  /* Props take fractional coordinates so one room description works at any
   * size — a 320x240 call frame and a 116px About-page photograph. */
  /* ── shapes, without soft edges ───────────────────────────
   * The call is drawn at 80x60 and thrown up whole-number times, so a curve
   * has to be made of pixels: a path fill would arrive antialiased and each
   * of those in-between pixels would land as a 4x4 smudge. Everything here
   * fills whole pixel rows instead, so round and leafy things stay as crisp
   * as the rectangles they sit next to.
   */
  function rows(g, y0, y1, spansAt){
    for (let y = Math.round(y0); y < Math.round(y1); y++){
      const spans = spansAt(y + 0.5);
      if (!spans) continue;
      for (const [l, r] of spans){
        const a = Math.round(l), b = Math.round(r);
        if (b > a) g.fillRect(a, y, b - a, 1);
      }
    }
  }
  function ellipseFill(g, cx, cy, rx, ry){
    rows(g, cy - ry, cy + ry, (y) => {
      const t = (y - cy) / ry;
      if (t <= -1 || t >= 1) return null;
      const hw = rx * Math.sqrt(1 - t * t);
      return [[cx - hw, cx + hw]];
    });
  }
  // The band of an ellipse, `t` thick; `right` keeps the half away from the body.
  function ringFill(g, cx, cy, rx, ry, t, right){
    rows(g, cy - ry, cy + ry, (y) => {
      const o = (y - cy) / ry;
      if (o <= -1 || o >= 1) return null;
      const out = rx * Math.sqrt(1 - o * o);
      const iy = Math.max(0.001, ry - t), i = (y - cy) / iy;
      const inn = Math.abs(i) < 1 ? Math.max(0, rx - t) * Math.sqrt(1 - i * i) : 0;
      const spans = inn > 0 ? [[cx - out, cx - inn], [cx + inn, cx + out]] : [[cx - out, cx + out]];
      return right ? spans.filter(([l]) => l >= cx - 0.01) : spans;
    });
  }
  // One span per row, so convex shapes; enough for pots, shades and slabs.
  function polyFill(g, pts){
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts){ if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    rows(g, y0, y1, (y) => {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < pts.length; i++){
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y) === (b[1] <= y)) continue;
        const x = a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
      return hi > lo ? [[lo, hi]] : null;
    });
  }
  // A leaf: two curves from the stem to the tip, bellied out by `wid`.
  function leaf(g, sx, sy, tx, ty, wid){
    const mx = (sx + tx) / 2, my = (sy + ty) / 2;
    const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * wid, ny = (dx / len) * wid;
    const q = (p1, t) => [
      (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * p1[0] + t * t * tx,
      (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * p1[1] + t * t * ty,
    ];
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(q([mx + nx, my + ny], i / 8));
    for (let i = 8; i >= 0; i--) pts.push(q([mx - nx, my - ny], i / 8));
    polyFill(g, pts);
  }

  const PROPS = {
    poster(g, x, y, w, h, th){
      g.fillStyle = shade(th.panel, th.dark ? 0.10 : -0.07); g.fillRect(x, y, w, h);
      g.fillStyle = th.brand;   g.fillRect(x, y, w, Math.max(1, h * 0.32));
      g.fillStyle = th.brand2 || th.line; g.fillRect(x + w * 0.16, y + h * 0.5, w * 0.68, Math.max(1, h * 0.1));
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, y + h - 1, w, 1);
    },
    shelf(g, x, y, w, h, th, r){
      g.fillStyle = shade(th.line, th.dark ? 0.06 : -0.14); g.fillRect(x, y + h - Math.max(1, h * 0.18), w, Math.max(1, h * 0.18));
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++){
        const cw = w / (n + 1), cx = x + i * cw + cw * 0.3, ch = h * (0.45 + r() * 0.5);
        g.fillStyle = i % 2 ? th.brand : shade(th.dim, -0.1);
        g.fillRect(cx, y + h - ch, Math.max(1, cw * 0.55), ch - Math.max(1, h * 0.18));
      }
    },
    window(g, x, y, w, h, th){
      g.fillStyle = th.dark ? "#2A3A52" : "#CFE3F2"; g.fillRect(x, y, w, h);
      g.fillStyle = shade(th.line, -0.1);
      g.fillRect(x + w / 2 - 1, y, 2, h); g.fillRect(x, y + h / 2 - 1, w, 2);
      g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x, y, w, Math.max(1, h * 0.18));
    },
    monitor(g, x, y, w, h, th){
      g.fillStyle = "#15171C"; g.fillRect(x, y, w, h);
      g.fillStyle = th.brand2 || th.brand; g.globalAlpha = 0.55;
      g.fillRect(x + 1, y + 1, w - 2, h - 3); g.globalAlpha = 1;
      g.fillStyle = "#0B0D10"; g.fillRect(x + w * 0.42, y + h, Math.max(1, w * 0.16), Math.max(1, h * 0.2));
    },
    corkboard(g, x, y, w, h, th, r){
      g.fillStyle = mix(th.panel, "#9A7A4E", 0.45); g.fillRect(x, y, w, h);
      for (let i = 0; i < 5; i++){
        g.fillStyle = i % 2 ? shade(th.ink, -0.06) : th.brand;
        g.globalAlpha = 0.8;
        g.fillRect(x + r() * (w * 0.7), y + r() * (h * 0.7), Math.max(1, w * 0.2), Math.max(1, h * 0.22));
      }
      g.globalAlpha = 1;
    },
    neon(g, x, y, w, h, th){
      const gr = g.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, Math.max(w, h));
      gr.addColorStop(0, th.brand); gr.addColorStop(0.35, th.brand); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = 0.5; g.fillStyle = gr; g.fillRect(x - w, y - h, w * 3, h * 3); g.globalAlpha = 1;
      g.fillStyle = th.brand; g.fillRect(x, y + h * 0.35, w, Math.max(1, h * 0.3));
      g.fillStyle = th.brand2 || th.brand; g.fillRect(x + w * 0.1, y, Math.max(1, w * 0.12), h);
    },
    cabinet(g, x, y, w, h, th){
      g.fillStyle = shade(th.panel, th.dark ? 0.07 : -0.12); g.fillRect(x, y, w, h);
      g.fillStyle = shade(th.line, -0.12);
      for (let i = 1; i < 4; i++) g.fillRect(x, y + (h / 4) * i, w, 1);
      g.fillStyle = th.dim;
      for (let i = 0; i < 4; i++) g.fillRect(x + w * 0.38, y + (h / 4) * i + h * 0.11, Math.max(1, w * 0.24), 1);
    },
    door(g, x, y, w, h, th){
      g.fillStyle = shade(th.bg, th.dark ? 0.08 : -0.16); g.fillRect(x, y, w, h);
      g.fillStyle = shade(th.line, -0.2); g.fillRect(x, y, Math.max(1, w * 0.12), h);
      g.fillStyle = th.dim; g.fillRect(x + w * 0.74, y + h * 0.52, 1, 2);
    },
    plant(g, x, y, w, h, th){
      const leafy = mix(th.panel, "#3E6B34", 0.72), cx = x + w / 2, potY = y + h * 0.62;
      g.fillStyle = leafy;
      [[-0.9, 0.9], [0.85, 0.82], [-0.35, 1], [0.4, 0.95]].forEach(([dir, len]) =>
        leaf(g, cx, potY, cx + dir * w * 0.5, potY - h * 0.58 * len, Math.max(1.2, w * 0.15)));
      g.fillStyle = shade(th.brand, -0.1);
      polyFill(g, [[x + w * 0.3, potY], [x + w * 0.7, potY], [x + w * 0.62, y + h], [x + w * 0.38, y + h]]);
    },
    clock(g, x, y, w, h, th){
      g.fillStyle = shade(th.ink, -0.05); g.fillRect(x, y, w, h);
      g.fillStyle = th.bg; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      g.fillStyle = shade(th.ink, -0.05);
      g.fillRect(x + w / 2, y + h * 0.28, 1, h * 0.24); g.fillRect(x + w / 2, y + h / 2, w * 0.26, 1);
    },
    // Things that stand between the lens and the person. This close they read
    // as shapes, so they are drawn as shapes: leaves, a rim, a curved handle.
    plantbig(g, x, y, w, h, th){
      const dark = mix(th.panel, "#23461F", 0.86), lit = mix(dark, "#7FBF5A", 0.22);
      const potH = Math.max(3, h * 0.26), potY = y + h - potH, cx = x + w / 2;
      [[-1, 0.86, 0], [0.92, 0.8, 1], [-0.52, 1.02, 1], [0.5, 0.96, 0], [0.08, 1.12, 1]]
        .forEach(([dir, len, light]) => {
          g.fillStyle = light ? lit : dark;
          leaf(g, cx, potY + 1, cx + dir * w * 0.62, potY - (h - potH) * len, Math.max(1.4, w * 0.17));
        });
      const clay = mix(th.panel, "#8A4A2E", 0.62);
      g.fillStyle = shade(clay, -0.12);
      polyFill(g, [[x + w * 0.24, potY], [x + w * 0.76, potY], [x + w * 0.66, y + h], [x + w * 0.34, y + h]]);
      g.fillStyle = shade(clay, -0.24);                        // the shaded side
      polyFill(g, [[x + w * 0.6, potY], [x + w * 0.76, potY], [x + w * 0.66, y + h], [x + w * 0.56, y + h]]);
      g.fillStyle = shade(clay, 0.06);                         // the rim catches the light
      ellipseFill(g, cx, potY, w * 0.26, Math.max(1, potH * 0.24));
      g.fillStyle = shade(clay, -0.3);
      ellipseFill(g, cx, potY, w * 0.18, Math.max(1, potH * 0.16));
    },
    mug(g, x, y, w, h, th){
      const bw = w * 0.72, cx = x + bw / 2, top = y + h * 0.2, bh = h - (top - y);
      const ware = mix(th.panel, "#E8E4DA", 0.72);              // glazed, whatever the room
      g.fillStyle = shade(ware, -0.14);
      ringFill(g, x + bw * 0.94, top + bh * 0.52, w * 0.32, bh * 0.32, Math.max(1, w * 0.1), true);
      g.fillStyle = ware;
      polyFill(g, [[x, top], [x + bw, top], [x + bw * 0.86, y + h], [x + bw * 0.14, y + h]]);
      g.fillStyle = shade(ware, -0.16);                        // the side away from the lamp
      polyFill(g, [[x + bw * 0.64, top], [x + bw, top], [x + bw * 0.86, y + h], [x + bw * 0.68, y + h]]);
      g.fillStyle = th.brand;
      ellipseFill(g, cx, top, bw * 0.5, Math.max(1, h * 0.1));
      g.fillStyle = shade(mix(th.ink, "#2A1C12", 0.5), -0.05); // what is in it
      ellipseFill(g, cx, top + Math.max(1, h * 0.02), bw * 0.34, Math.max(1, h * 0.06));
    },
    lamp(g, x, y, w, h, th){
      const cx = x + w * 0.5, shadeH = Math.max(3, h * 0.3);
      g.fillStyle = shade(th.line, -0.3);
      polyFill(g, [[cx - w * 0.06, y + shadeH], [cx + w * 0.06, y + shadeH],
                   [cx + w * 0.1, y + h - h * 0.06], [cx - w * 0.1, y + h - h * 0.06]]);
      g.fillStyle = shade(th.panel, -0.3);
      ellipseFill(g, cx, y + h - h * 0.05, w * 0.34, Math.max(1, h * 0.05));
      g.fillStyle = shade(th.panel, -0.24);
      polyFill(g, [[x + w * 0.24, y], [x + w * 0.76, y], [x + w, y + shadeH], [x, y + shadeH]]);
      g.fillStyle = th.dark ? "rgba(255,222,170,0.55)" : "rgba(255,240,200,0.7)";
      ellipseFill(g, cx, y + shadeH, w * 0.46, Math.max(1, h * 0.05));
    },

    /* ── for the player's own room ─────────────────────── */
    guitar(g, x, y, w, h, th){
      const wood = mix(th.brand, "#B8763A", 0.55), cx = x + w / 2;
      g.fillStyle = shade(wood, -0.35); g.fillRect(cx - Math.max(0.5, w * 0.07), y, Math.max(1, w * 0.14), h * 0.55);
      g.fillStyle = shade(wood, -0.1); ellipseFill(g, cx, y + h * 0.58, w * 0.34, h * 0.14);
      g.fillStyle = wood; ellipseFill(g, cx, y + h * 0.8, w * 0.48, h * 0.2);
      g.fillStyle = shade(wood, -0.5); ellipseFill(g, cx, y + h * 0.66, w * 0.12, h * 0.05);
      g.fillStyle = shade(wood, -0.4); g.fillRect(cx - w * 0.2, y + h * 0.86, w * 0.4, Math.max(1, h * 0.03));
    },
    lights(g, x, y, w, h, th, r){
      const bulbs = ["#FFD166", "#FF6FA8", "#7CE0FF", "#9BF07A"];
      for (let i = 0; i <= 12; i++){
        const t = i / 12, px = x + t * w, py = y + Math.sin(t * Math.PI) * h * 0.8;
        g.fillStyle = shade(th.line, -0.3); g.fillRect(px, py, 1, 1);
        if (i % 2){
          const c = bulbs[(i >> 1) % bulbs.length];
          g.globalAlpha = 0.28; g.fillStyle = c; g.fillRect(px - 1, py, 3, 3); g.globalAlpha = 1;
          g.fillStyle = c; g.fillRect(px, py + 1, 1, 1);
        }
      }
    },
    frame(g, x, y, w, h, th, r){
      g.fillStyle = mix(th.line, "#6A4A2A", 0.5); g.fillRect(x, y, w, h);
      g.fillStyle = mix(th.panel, "#CFE3F2", 0.6); g.fillRect(x + 1, y + 1, w - 2, h * 0.55);
      g.fillStyle = mix(th.brand, "#5E8A4A", 0.5); g.fillRect(x + 1, y + 1 + h * 0.55, w - 2, h - 2 - h * 0.55);
      g.fillStyle = mix(th.brand2 || th.brand, "#F2C94C", 0.4); ellipseFill(g, x + w * (0.3 + r() * 0.4), y + h * 0.3, Math.max(1, w * 0.1), Math.max(1, h * 0.1));
    },
    bookcase(g, x, y, w, h, th, r){
      g.fillStyle = mix(th.line, "#5A3A22", 0.55); g.fillRect(x, y, w, h);
      const shelves = 4, sh = h / shelves;
      for (let s = 0; s < shelves; s++){
        g.fillStyle = shade(mix(th.line, "#5A3A22", 0.55), -0.3); g.fillRect(x + 1, y + s * sh + 1, w - 2, sh - 2);
        for (let bx = x + 1; bx < x + w - 2; bx += 1 + (r() * 2 | 0)){
          g.fillStyle = [th.brand, th.brand2 || th.dim, "#C8252C", "#2F6FC0", "#E8DCC4", "#3E8A3A"][(r() * 6) | 0];
          const bh = sh * (0.5 + r() * 0.4);
          g.fillRect(bx, y + (s + 1) * sh - 1 - bh, 1, bh);
        }
      }
    },
    hanging(g, x, y, w, h, th){
      const cx = x + w / 2, potY = y + h * 0.4;
      g.fillStyle = shade(th.line, -0.2); g.fillRect(cx - w * 0.25, y, 1, potY - y); g.fillRect(cx + w * 0.25, y, 1, potY - y);
      g.fillStyle = mix(th.panel, "#E8DCC4", 0.6); ellipseFill(g, cx, potY + h * 0.06, w * 0.3, h * 0.08);
      g.fillStyle = mix(th.panel, "#3E6B34", 0.75);
      [[-0.5, 1], [-0.1, 1.3], [0.3, 0.9], [0.55, 1.1]].forEach(([dx, len]) => leaf(g, cx, potY + h * 0.08, cx + dx * w, potY + h * 0.5 * len, Math.max(1, w * 0.1)));
    },
    record(g, x, y, w, h, th){
      g.fillStyle = mix(th.line, "#5A3A22", 0.5); g.fillRect(x, y + h * 0.45, w, h * 0.55);
      g.fillStyle = "#1A1A1E"; ellipseFill(g, x + w * 0.42, y + h * 0.45, w * 0.34, h * 0.14);
      g.fillStyle = th.brand; ellipseFill(g, x + w * 0.42, y + h * 0.45, w * 0.08, h * 0.04);
      g.fillStyle = "#C0C4C8"; g.fillRect(x + w * 0.82, y + h * 0.2, 1, h * 0.25);
    },
    pennant(g, x, y, w, h, th){
      g.fillStyle = th.brand; polyFill(g, [[x, y], [x + w, y + h * 0.5], [x, y + h]]);
      g.fillStyle = th.brand2 || shade(th.brand, 0.3); g.fillRect(x, y + h * 0.4, w * 0.5, Math.max(1, h * 0.14));
    },
    mirror(g, x, y, w, h, th){
      g.fillStyle = mix(th.line, "#C9A24B", 0.5); ellipseFill(g, x + w / 2, y + h / 2, w / 2, h / 2);
      g.fillStyle = mix(th.bg, "#CFE3F2", 0.55); ellipseFill(g, x + w / 2, y + h / 2, w / 2 - 1, h / 2 - 1);
      g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x + w * 0.35, y + h * 0.2, 1, h * 0.4);
    },
    cat(g, x, y, w, h, th){
      const fur = mix("#D9803A", th.panel, 0.2);
      g.fillStyle = shade(fur, -0.2); g.fillRect(x + w * 0.05, y + h * 0.82, w * 0.35, Math.max(1, h * 0.1));
      g.fillStyle = fur; ellipseFill(g, x + w * 0.5, y + h * 0.66, w * 0.3, h * 0.32);
      ellipseFill(g, x + w * 0.56, y + h * 0.3, w * 0.24, h * 0.2);
      polyFill(g, [[x + w * 0.36, y + h * 0.22], [x + w * 0.4, y], [x + w * 0.52, y + h * 0.16]]);
      polyFill(g, [[x + w * 0.62, y + h * 0.16], [x + w * 0.74, y], [x + w * 0.78, y + h * 0.24]]);
      g.fillStyle = "#1C1C1E"; g.fillRect(x + w * 0.48, y + h * 0.28, 1, 1); g.fillRect(x + w * 0.64, y + h * 0.28, 1, 1);
    },
    fishtank(g, x, y, w, h, th, r){
      g.fillStyle = "#2A2A30"; g.fillRect(x, y + h - 1, w, 1);
      g.fillStyle = "rgba(90,170,210,0.55)"; g.fillRect(x, y + h * 0.15, w, h * 0.85 - 1);
      g.fillStyle = "#3E8A3A"; for (let i = 0; i < 3; i++) g.fillRect(x + 1 + r() * (w - 2), y + h * 0.55, 1, h * 0.44);
      g.fillStyle = "#F07A1C"; g.fillRect(x + w * (0.2 + r() * 0.5), y + h * (0.35 + r() * 0.3), 2, 1);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x, y + h * 0.15, w, 1);
    },
    trophy(g, x, y, w, h, th){
      g.fillStyle = "#6A4A2A"; g.fillRect(x + w * 0.2, y + h * 0.8, w * 0.6, h * 0.2);
      g.fillStyle = "#D9A62A"; g.fillRect(x + w * 0.44, y + h * 0.5, w * 0.12, h * 0.3);
      polyFill(g, [[x + w * 0.1, y], [x + w * 0.9, y], [x + w * 0.7, y + h * 0.5], [x + w * 0.3, y + h * 0.5]]);
      g.fillStyle = "#F2D26A"; g.fillRect(x + w * 0.24, y + 1, 1, h * 0.3);
    },
    cactus(g, x, y, w, h, th){
      const green = mix(th.panel, "#4E8A3A", 0.75), potY = y + h * 0.7;
      g.fillStyle = green; g.fillRect(x + w * 0.4, y, w * 0.2, potY - y);
      g.fillRect(x + w * 0.18, y + h * 0.26, w * 0.12, h * 0.26); g.fillRect(x + w * 0.18, y + h * 0.46, w * 0.24, Math.max(1, h * 0.06));
      g.fillRect(x + w * 0.7, y + h * 0.18, w * 0.12, h * 0.2); g.fillRect(x + w * 0.58, y + h * 0.34, w * 0.24, Math.max(1, h * 0.06));
      g.fillStyle = mix(th.brand, "#C2562B", 0.5);
      polyFill(g, [[x + w * 0.2, potY], [x + w * 0.8, potY], [x + w * 0.7, y + h], [x + w * 0.3, y + h]]);
    },
    crt(g, x, y, w, h, th){
      g.fillStyle = "#3A3A40"; g.fillRect(x, y + h * 0.2, w, h * 0.8);
      g.fillStyle = th.dark ? "#7CC8E8" : "#5A8AA0"; g.fillRect(x + w * 0.1, y + h * 0.3, w * 0.62, h * 0.55);
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + w * 0.1, y + h * 0.3, w * 0.62, 1);
      g.fillStyle = "#C0C4C8"; g.fillRect(x + w * 0.3, y, 1, h * 0.2); g.fillRect(x + w * 0.6, y, 1, h * 0.2);
      g.fillStyle = th.brand; g.fillRect(x + w * 0.8, y + h * 0.4, 1, 1);
    },
    calendar(g, x, y, w, h, th){
      g.fillStyle = "#F4F1EA"; g.fillRect(x, y, w, h);
      g.fillStyle = th.brand; g.fillRect(x, y, w, Math.max(1, h * 0.22));
      g.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 1; i < 4; i++) g.fillRect(x, y + h * 0.22 + i * (h * 0.78 / 4), w, 1);
      g.fillStyle = "#C8252C"; g.fillRect(x + w * 0.6, y + h * 0.5, Math.max(1, w * 0.2), Math.max(1, h * 0.14));
    },
  };

  const DEFAULT_ROOM = [
    { p: "poster", x: 0.04, y: 0.10, w: 0.24, h: 0.40 },
    { p: "shelf",  x: 0.62, y: 0.16, w: 0.34, h: 0.26 },
    { p: "plantbig", x: -0.04, y: 0.42, w: 0.22, h: 0.62, z: 0.88 }
  ];

  /* ── depth ────────────────────────────────────────────────
   * A room is not a backdrop. Every prop has a distance, z: 0 is the back
   * wall, 1 is the lens. Distance decides the three things it decides on any
   * camera — size, colour and order:
   *
   *   size    props grow and spread out from the vanishing point as they come
   *           forward, so the near ones run off the edges of the frame
   *   colour  cool colours recede and warm ones advance, so far props are
   *           cooled and dimmed and near ones warmed and darkened
   *   order   anything nearer than the person is drawn over them
   *
   * Distances are in the data, so a room authored flat still reads the way it
   * did: z defaults to where that kind of thing usually hangs, and the scale
   * is measured from there.
   */
  const COOL = "#3D5A7A", WARM = "#C2601F", Z0 = 0.18;
  const DEPTH = {
    window: 0.02, door: 0.03, poster: 0.06, corkboard: 0.06, clock: 0.07, neon: 0.08,
    shelf: 0.20, cabinet: 0.24, monitor: 0.30, plant: 0.34,
    lamp: 0.66, plantbig: 0.86, mug: 0.90,
    lights: 0.04, frame: 0.05, pennant: 0.05, mirror: 0.05, calendar: 0.06, guitar: 0.12, bookcase: 0.18,
    trophy: 0.22, record: 0.26, fishtank: 0.26, cat: 0.3, crt: 0.3, hanging: 0.4, cactus: 0.72,
  };

  /* What the wall is covered in. Drawn over its colour, under everything on it. */
  const PATTERNS = {
    plain: null,
    stripes(g, W, y0, th){ g.fillStyle = shade(th.panel, th.dark ? 0.07 : -0.06); for (let x = 0; x < W; x += 6) g.fillRect(x, 0, 3, y0); },
    dots(g, W, y0, th){ g.fillStyle = shade(th.panel, th.dark ? 0.12 : -0.1); for (let y = 2; y < y0; y += 5) for (let x = (y % 10 ? 2 : 4.5); x < W; x += 5) g.fillRect(Math.round(x), y, 1, 1); },
    panel(g, W, y0, th){ const wood = mix(th.panel, "#8A5A34", 0.35); g.fillStyle = wood; g.fillRect(0, y0 * 0.55, W, y0 * 0.45);
                         g.fillStyle = shade(wood, -0.18); for (let x = 3; x < W; x += 7) g.fillRect(x, y0 * 0.55, 1, y0 * 0.45); g.fillRect(0, y0 * 0.55, W, 1); },
    brick(g, W, y0, th){ g.fillStyle = shade(th.panel, th.dark ? 0.08 : -0.08);
                         for (let y = 0; y < y0; y += 4){ g.fillRect(0, y, W, 1); for (let x = ((y / 4) % 2) * 4; x < W; x += 8) g.fillRect(x, y, 1, 4); } },
    tiles(g, W, y0, th){ g.fillStyle = shade(th.panel, th.dark ? 0.1 : -0.07); for (let y = 0; y < y0; y += 6) g.fillRect(0, y, W, 1); for (let x = 0; x < W; x += 6) g.fillRect(x, 0, 1, y0); },
    check(g, W, y0, th){ g.fillStyle = shade(th.panel, th.dark ? 0.06 : -0.05); for (let y = 0; y < y0; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) g.fillRect(x, y, 4, 4); },
  };
  const zOf = (item) => (typeof item.z === "number" ? Math.max(0, Math.min(1, item.z))
    : (DEPTH[item.p] == null ? 0.15 : DEPTH[item.p]));
  const zoom = (z) => (0.70 + z * 1.25) / (0.70 + Z0 * 1.25);

  // The same prop, seen from further off or closer to.
  function gradeTheme(th, z){
    const far = Math.max(0, 0.45 - z) / 0.45;
    const near = Math.max(0, z - 0.5) / 0.5;
    const grade = (hex) => {
      let c = hex;
      if (far) c = shade(mix(c, COOL, far * 0.5), -0.06 * far);
      if (near) c = shade(mix(c, WARM, near * 0.45), -0.18 * near);
      return c;
    };
    const out = { dark: th.dark };
    for (const k of ["bg", "panel", "ink", "dim", "line", "brand", "brand2"]) if (th[k]) out[k] = grade(th[k]);
    return out;
  }

  /* Where a prop lands once distance is taken into account. It grows about
   * where it was put — from its base, the way a thing standing closer to the
   * lens rises higher and hangs further below the frame — rather than about
   * the vanishing point, which would fling anything near an edge out of shot
   * and make a room impossible to compose. */
  function project(item, z){
    const k = zoom(z), w = item.w * k, h = item.h * k;
    return { x: item.x + item.w / 2 - w / 2, y: item.y + item.h - h, w, h };
  }

  /* Paints the room a person is calling from, in their own site's colours.
   * o.layer "fore" paints only what stands in front of them; the default
   * paints the wall, the floor and everything behind. */
  function paintRoom(g, W, H, theme, room, seed, o){
    o = o || {};
    const hz = typeof o.hz === "number" ? o.hz : 0.88, subject = typeof o.subject === "number" ? o.subject : 0.62;
    const th = theme, r = rngFrom(seedOf(String(seed) + "|room"));
    const fore = o.layer === "fore";

    if (!fore){
      // wall, floor, and the line where they meet
      const y0 = Math.max(1, Math.round(H * hz));
      const grad = g.createLinearGradient(0, 0, W, y0);
      grad.addColorStop(0, shade(th.panel, th.dark ? 0.05 : -0.04));
      grad.addColorStop(1, th.bg);
      g.fillStyle = grad; g.fillRect(0, 0, W, y0);
      if (PATTERNS[o.pattern]) PATTERNS[o.pattern](g, W, y0, th);
      if (y0 < H){
        const fl = g.createLinearGradient(0, y0, 0, H);
        fl.addColorStop(0, shade(mix(th.bg, COOL, 0.26), -0.1));
        fl.addColorStop(1, shade(mix(th.bg, COOL, 0.1), th.dark ? 0.04 : -0.16));
        g.fillStyle = fl; g.fillRect(0, y0, W, H - y0);
        g.fillStyle = shade(th.line || th.ink, th.dark ? 0.08 : -0.18);
        g.fillRect(0, y0 - 1, W, 1);
      }
    }

    for (const item of (room && room.length ? room : DEFAULT_ROOM)){
      const z = zOf(item);
      if ((z > subject) !== fore) continue;
      const fn = PROPS[item.p];
      if (!fn) continue;
      // A prop can be tinted away from the site's brand: the theme it is handed
      // is the site's, with one colour swapped and distance graded into all of
      // them, so no prop needs to know about either.
      const pr = project(item, z);
      const pth = gradeTheme(item.c ? Object.assign({}, th, { brand: item.c }) : th, z);
      fn(g, Math.round(pr.x * W), Math.round(pr.y * H),
            Math.max(2, Math.round(pr.w * W)), Math.max(2, Math.round(pr.h * H)), pth, r);
    }

    if (!fore){
      // the light they are sitting in
      const bl = g.createRadialGradient(W * 0.22, H * 0.12, 1, W * 0.22, H * 0.12, H * 0.95);
      bl.addColorStop(0, th.dark ? "rgba(255,222,170,0.22)" : "rgba(255,255,255,0.38)");
      bl.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = bl; g.fillRect(0, 0, W, H);
    }
  }

  /* ── framing ─────────────────────────────────────────────
   * Where the person sits in the picture, and how much of them you see.
   * `s*` are cells of the 24x30 grid: sy 1 starts above the hair, sy 6 is
   * the top of the head, sh 26 reaches the waist. `d*` are fractions of
   * whatever you are drawing into, so one shot works at 80x60 and at 132px.
   *
   * A person can override any field through `frame` (the call) or `plate`
   * (the About-page photograph) — partial overrides merge, so nudging one
   * number is enough.
   */
  const SHOTS = {
    call:  { sx: 2, sy: 1, sw: 20, sh: 26, dx: 0.25, dy: 0.08, dw: 0.50, dh: 0.87 },
    photo: { sx: 2, sy: 2, sw: 20, sh: 24, dx: 0.00, dy: 0.00, dw: 1.00, dh: 1.00 },
    head:  { sx: 5, sy: 3, sw: 14, sh: 14, dx: 0.00, dy: 0.00, dw: 1.00, dh: 1.00 },
  };
  const FEED = { w: 80, h: 60 };          // what the call is rendered at, before it is thrown up

  /* ── the two shots ────────────────────────────────────────
   * How a person sits in front of their own webcam. Either they are back in
   * the room with it falling away behind them, or they are up against what is
   * behind them and it fills the frame. Which one a person uses is in their
   * data; the room editor sets it.
   */
  const FRAMINGS = {
    receded: {
      label: "Background receded",
      hint: "Back in the room: floor in shot, the wall well behind them",
      shot: { sx: 2, sy: 1, sw: 20, sh: 29, dx: 0.34, dy: 0.24, dw: 0.33, dh: 0.70 },
      room: { hz: 0.62, subject: 0.50 },
    },
    against: {
      label: "Against the background",
      hint: "Up close: the wall right behind them, little floor in shot",
      shot: { sx: 2, sy: 1, sw: 20, sh: 26, dx: 0.25, dy: 0.08, dw: 0.50, dh: 0.87 },
      room: { hz: 0.88, subject: 0.62 },
    },
  };
  const FRAMING_NAMES = Object.keys(FRAMINGS);
  const framingOf = (name) => FRAMINGS[name] || FRAMINGS.against;

  const shotFor = (kind, over) => Object.assign({}, SHOTS[kind], over || {});
  // The call's shot: the framing the person uses, with their own nudges on top.
  const callShot = (o) => Object.assign({}, framingOf(o.framing).shot, o.frame || {});
  function place(g, img, f, W, H){
    g.drawImage(img, f.sx, f.sy, f.sw, f.sh,
      Math.round(f.dx * W), Math.round(f.dy * H), Math.round(f.dw * W), Math.round(f.dh * H));
  }

  /* ── canvas plumbing ─────────────────────────────────── */
  const canvasOK = () => typeof document !== "undefined" && !!document.createElement;
  function surface(w, h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    return { c, g };
  }
  // The person alone on a transparent ground, one grid unit per pixel.
  function figure(t, o){
    const { c, g } = surface(GW, GH);
    if (o && o.bg){ g.fillStyle = o.bg; g.fillRect(0, 0, GW, GH); }
    paint(g, t, o);
    return c;
  }

  /* ── 1. the contacts head ────────────────────────────── */
  function head(seed, look, o){
    o = o || {};
    if (!canvasOK()) return "";
    const px = o.px || 36;
    const t = traits(seed, look);
    const src = figure(t, { bg: o.bg || "#B7C2C4", garment: o.garment, mood: o.mood, blink: o.blink });
    const { c, g } = surface(px, px);
    place(g, src, shotFor("head", o.frame), px, px);
    return c.toDataURL("image/png");
  }

  /* ── 2. the call frame ───────────────────────────────── */
  /* Rendered at 80x60 and thrown up to the window size with smoothing off,
   * which is what a 1998 webcam looked like and, conveniently, what keeps a
   * 24-pixel face legible at 320 across. */
  function paintFeed(canvas, seed, look, o){
    o = o || {};
    const th = o.theme, W = FEED.w, H = FEED.h;
    const { c: small, g } = surface(W, H);
    const fr = framingOf(o.framing).room;
    paintRoom(g, W, H, th, o.room, seed, Object.assign({ pattern: o.pattern }, fr));
    const fig = figure(traits(seed, look), {
      garment: (look && look.garment) || th.brand, line: look && look.line !== undefined ? look.line : th.brand2 || "#111",
      mood: o.mood, blink: o.blink, mouthOpen: o.mouthOpen, bob: o.bob, glance: o.glance
    });
    place(g, fig, callShot(o), W, H);
    paintRoom(g, W, H, th, o.room, seed, Object.assign({ layer: "fore", pattern: o.pattern }, fr));

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(small, 0, 0, W, H, 0, 0, canvas.width, canvas.height);

    if (o.glitch){                                            // a dropped frame
      const r = rngFrom(seedOf(String(seed) + "|" + o.glitch));
      const bs = canvas.width / 20;
      for (let i = 0; i < 7; i++){
        const bx = Math.floor(r() * 20) * bs, by = Math.floor(r() * 15) * bs;
        ctx.drawImage(canvas, bx, by, bs, bs, bx + (r() < 0.5 ? -bs : bs), by, bs, bs);
      }
    }
    const rr = rngFrom(seedOf(String(seed) + "|mush"));       // compression mush
    ctx.globalAlpha = 0.05;
    for (let k = 0; k < 150; k++){
      ctx.fillStyle = rr() < 0.5 ? "#000" : "#fff";
      ctx.fillRect(Math.floor(rr() * canvas.width / 4) * 4, Math.floor(rr() * canvas.height / 4) * 4, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  /* ── 3. the company photograph, and 4. the suite card ── */
  function photo(seed, look, o){
    o = o || {};
    if (!canvasOK()) return "";
    const th = o.theme, W = o.w || 116, H = o.h || 139;
    const t = traits(seed, look);
    const { c, g } = surface(W, H);
    const r = rngFrom(seedOf(String(seed) + "|photo"));

    const plate = { hz: 0.84, subject: 0.64 };
    paintRoom(g, W, H, th, o.room, seed, plate);
    g.imageSmoothingEnabled = false;
    place(g, figure(t, { garment: o.garment || th.brand, line: th.brand2 || "#111", mood: o.mood }),
          shotFor("photo", o.frame), W, H);
    paintRoom(g, W, H, th, o.room, seed, Object.assign({ layer: "fore" }, plate));

    g.globalAlpha = 0.06;                                     // film
    for (let i = 0; i < W * H / 9; i++){
      g.fillStyle = r() < 0.5 ? "#000" : "#fff";
      g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
    }
    g.globalAlpha = 1;

    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.82);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, th.dark ? "rgba(0,0,0,0.48)" : "rgba(70,50,32,0.13)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);

    if (o.card){                                              // clipped into the suite
      g.strokeStyle = th.brand; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
      g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, H - 20, W, 20);
      [t.skin, t.hair, th.brand].forEach((sw, i) => {
        g.fillStyle = sw; g.fillRect(6 + i * 14, H - 15, 10, 10);
        g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1;
        g.strokeRect(6.5 + i * 14, H - 14.5, 9, 9);
      });
    }
    return c.toDataURL("image/png");
  }

  // What a clipped portrait carries into the design suite.
  function palette(seed, look, theme){
    const t = traits(seed, look);
    return [t.skin, t.hair, (theme && theme.brand) || "#4E6E88"];
  }

  return { seedOf, rngFrom, shade, mix, traits, head, photo, paintFeed, paintRoom, palette,
           GW, GH, SKIN, HAIR, STYLES, FACIAL, SPECS, EXTRAS, BUILDS, AGES, PROPS, SHOTS, FEED, DEFAULT_ROOM,
           FRAMINGS, FRAMING_NAMES, framingOf, DEPTH, zOf, project, gradeTheme, PATTERNS, paint, figure: (t, o) => figure(t, o) };
})();

if (typeof module !== "undefined") module.exports = Portraits;
