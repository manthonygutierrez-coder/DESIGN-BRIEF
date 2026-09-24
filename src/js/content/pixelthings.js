"use strict";
/* ── the things in the pictures ───────────────────────────
 * One drawing per thing ImagePlan knows, in a box whose bottom edge is where
 * it stands. Drawings work in the box's own 0..1 units and are mirrored by
 * the box, so they never need to know how big the picture is. Every shape is
 * lit by the kit, so a white dove at dusk comes out peach on one side and
 * violet on the other without the drawing saying so.
 *
 * A drawing can also be asked for `solid`: one flat ink, for printing it on
 * something else — the bigfoot on a mug, a duck on a tee.
 */

const PixelThings = (() => {
  const K = () => PixelScene.kit;

  // aspect: width / height of the box. small: sits on counters. person: sized
  // like a person. floats: sits in water rather than on it.
  const INFO = {
    dove: { aspect: 1.3, small: true }, duck: { aspect: 1.35, small: true, floats: true },
    rabbit: { aspect: 1.0, small: true }, cat: { aspect: 0.8, small: true }, dog: { aspect: 1.3 },
    fish: { aspect: 2.0, small: true, floats: true }, bigfoot: { aspect: 0.55, person: true }, rooster: { aspect: 1.0, small: true },
    burrito: { aspect: 2.2, small: true }, burger: { aspect: 1.25, small: true }, fries: { aspect: 0.8, small: true },
    shake: { aspect: 0.5, small: true, scale: 1.35 }, biscuit: { aspect: 1.3, small: true }, bucket: { aspect: 0.9, small: true },
    plate: { aspect: 1.7, small: true }, cup: { aspect: 1.15, small: true }, cheese: { aspect: 1.7, small: true },
    cake: { aspect: 1.1, small: true }, crown: { aspect: 1.3, small: true }, tophat: { aspect: 1.15, small: true },
    cards: { aspect: 1.3, small: true }, baton: { aspect: 3.2, small: true }, band: { aspect: 1.7, small: true },
    jacket: { aspect: 1.0 }, sweater: { aspect: 1.0 }, tape: { aspect: 1.5, small: true }, kiln: { aspect: 1.05, big: true },
    vase: { aspect: 0.8, small: true }, sign: { aspect: 1.3, big: true }, balloon: { aspect: 0.8, small: true },
    pin: { aspect: 0.7, small: true }, mic: { aspect: 0.4 }, freshener: { aspect: 0.65, small: true },
    tshirt: { aspect: 1.1 }, star: { aspect: 1.0, small: true }, moon: { aspect: 1.0, small: true },
    boat: { aspect: 3.2, floats: true }, log: { aspect: 3.0, floats: true }, spool: { aspect: 0.8, small: true },
    ink: { aspect: 1.5, small: true }, book: { aspect: 0.8, small: true },
    person: { aspect: 0.42, person: true }, runner: { aspect: 0.6, person: true }, team: { aspect: 0.42, person: true },
    magician: { aspect: 0.6, person: true }, fisherman: { aspect: 0.5, person: true },
    tree: { aspect: 0.7 }, plant: { aspect: 0.8, small: true }, flower: { aspect: 0.55, small: true }, mushroom: { aspect: 0.9, small: true },
  };
  const info = (id) => INFO[id] || { aspect: 1 };

  function colourFor(p){
    const c = ImagePlan.colourOf(p);
    return c || null;
  }

  /* The drawing surface for one thing: box units in, lit pixels out. */
  function pen(b, box, o){
    const k = K();
    const X = (u) => box.x + (o.flip ? 1 - u : u) * box.w;
    const Y = (v) => box.y + v * box.h;
    const rp = (hex, extra = 0) => {
      if (o.solid) return [o.solid, o.solid, o.solid, o.solid, o.solid];
      const r = k.ramp(hex, o.L, (o.haze || 0) + extra);
      return o.cartoon ? [r[1], r[1], r[2], r[3], r[3]] : r;
    };
    const opt = (x = {}) => Object.assign({ mark: o.mark }, x);
    return {
      k, X, Y, rp, R: o.R,
      E: (u, v, ru, rv, hex, x) => k.ellipse(b, X(u), Y(v), ru * box.w, rv * box.h, rp(hex), opt(x)),
      P: (list, hex, x) => k.poly(b, list.map(([u, v]) => [X(u), Y(v)]), rp(hex), opt(x)),
      B: (u, v, du, dv, hex, x) => k.poly(b, [[X(u), Y(v)], [X(u + du), Y(v)], [X(u + du), Y(v + dv)], [X(u), Y(v + dv)]], rp(hex), opt(x)),
      L: (u0, v0, u1, v1, hex, a = 1) => k.line(b, X(u0), Y(v0), X(u1), Y(v1), o.solid || rp(hex)[2], a, o.mark),
      D: (u, v, hex) => k.set(b, X(u), Y(v), o.solid || K().rgb(hex), 1, o.mark),
      glow: (u, v, r, hex, a) => o.solid ? null : k.glow(b, X(u), Y(v), r * box.h, hex, a),
      text: (str, u, v, hex, s = 1) => k.text(b, str, X(u) - (o.flip ? k.textW(str, s) : 0), Y(v), o.solid || K().rgb(hex), s, o.mark),
      box, o,
    };
  }

  // A small flat print of another thing, for the front of a mug or a tee.
  function decal(b, id, box, o, ink){
    if (!DRAW[id]) return;
    DRAW[id](pen(b, box, Object.assign({}, o, { solid: K().rgb(ink), flip: false, cartoon: false })));
  }

  /* ── animals ────────────────────────────────────────── */
  const DRAW = {
    dove(q){
      const c = q.o.colour || "#F4F1EA";
      if (q.o.setting === "sky" || q.o.framing === "wide" && q.R() > 0.4){
        q.P([[0.34, 0.5], [0.18, 0.02], [0.58, 0.42]], c, { tone: 0.3 });
        q.E(0.48, 0.52, 0.3, 0.13, c);
        q.P([[0.2, 0.46], [0.02, 0.4], [0.04, 0.62], [0.22, 0.56]], c, { tone: 0.4 });
        q.E(0.78, 0.44, 0.1, 0.1, c);
        q.P([[0.4, 0.5], [0.46, 0.0], [0.66, 0.44]], c, { tone: 0.62 });
        q.P([[0.86, 0.42], [0.96, 0.46], [0.86, 0.49]], "#E8A07A");
        q.D(0.8, 0.42, "#1C1C1E");
        return;
      }
      // Plump and upright, a small head and a long tail: not a duck.
      q.L(0.46, 0.8, 0.44, 1, "#D07A6A"); q.L(0.54, 0.8, 0.56, 1, "#D07A6A");
      q.P([[0.3, 0.56], [0.02, 0.82], [0.1, 0.88], [0.36, 0.7]], c, { tone: 0.4 });
      q.E(0.48, 0.6, 0.24, 0.24, c);
      q.E(0.62, 0.5, 0.14, 0.2, c, { bias: 0.05 });
      q.E(0.4, 0.58, 0.18, 0.14, c, { bias: -0.14 });
      q.E(0.7, 0.3, 0.09, 0.1, c);
      q.P([[0.78, 0.29], [0.86, 0.32], [0.78, 0.35]], "#B08884");
      q.D(0.72, 0.28, "#1C1C1E");
    },

    duck(q){
      const mallard = !q.o.colour || q.o.colour === "mallard";
      const body = mallard ? "#A89F92" : q.o.colour, head = mallard ? "#2E6A3A" : q.o.colour;
      if (!q.o.floats) { q.L(0.45, 0.82, 0.43, 1, "#E8902A"); q.L(0.55, 0.82, 0.57, 1, "#E8902A"); }
      q.P([[0.12, 0.56], [0.02, 0.44], [0.22, 0.62]], mallard ? "#2A2A2E" : body, { tone: 0.4 });
      q.E(0.45, 0.66, 0.36, 0.2, body);
      q.E(0.38, 0.58, 0.24, 0.1, mallard ? "#7A6A58" : body, { bias: -0.1 });
      if (mallard) q.E(0.72, 0.64, 0.13, 0.14, "#7A3E26");
      q.E(0.76, 0.46, 0.07, 0.12, head);
      q.E(0.8, 0.34, 0.12, 0.12, head);
      if (mallard) q.L(0.7, 0.53, 0.84, 0.53, "#F4F1EA");
      q.P([[0.9, 0.36], [1.0, 0.41], [0.9, 0.44]], "#E8C23A");
      q.D(0.83, 0.31, "#101010");
    },

    rabbit(q){
      const c = q.o.colour || "#F4F1EA";
      q.E(0.46, 0.72, 0.3, 0.26, c);
      q.E(0.36, 0.78, 0.2, 0.2, c, { bias: -0.08 });
      q.E(0.14, 0.68, 0.07, 0.07, "#FFFFFF");
      q.E(0.64, 0.14, 0.05, 0.16, c); q.E(0.74, 0.16, 0.05, 0.15, c);
      q.E(0.64, 0.16, 0.02, 0.1, "#E8A0A8", { flat: true }); q.E(0.74, 0.18, 0.02, 0.09, "#E8A0A8", { flat: true });
      q.E(0.72, 0.42, 0.16, 0.15, c);
      q.D(0.78, 0.38, "#1C1C1E"); q.D(0.87, 0.45, "#D07A8A");
    },

    cat(q){
      const c = q.o.colour || "#E08A3C";
      q.E(0.18, 0.86, 0.16, 0.06, c, { bias: -0.05 });
      q.E(0.5, 0.68, 0.26, 0.3, c);
      q.P([[0.34, 0.2], [0.38, 0.02], [0.46, 0.16]], c); q.P([[0.54, 0.16], [0.62, 0.02], [0.66, 0.2]], c);
      q.E(0.5, 0.3, 0.2, 0.17, c);
      q.D(0.42, 0.28, "#4E8A3A"); q.D(0.58, 0.28, "#4E8A3A"); q.D(0.5, 0.35, "#D07A8A");
    },

    dog(q){
      const c = q.o.colour || "#B07A44";
      for (const u of [0.26, 0.36, 0.64, 0.74]) q.B(u, 0.6, 0.06, 0.4, c, { tone: 0.42 });
      q.L(0.16, 0.5, 0.06, 0.28, c);
      q.E(0.5, 0.52, 0.34, 0.17, c);
      q.E(0.84, 0.34, 0.14, 0.14, c);
      q.E(0.96, 0.4, 0.07, 0.06, c, { bias: 0.08 });
      q.E(0.78, 0.36, 0.05, 0.12, c, { bias: -0.2 });
      q.D(0.88, 0.3, "#1C1C1E"); q.D(1.0, 0.39, "#1C1C1E");
    },

    fish(q){
      const c = q.o.colour || "#8FA6A0";
      q.P([[0.1, 0.5], [0.0, 0.24], [0.0, 0.76]], c, { tone: 0.4 });
      q.E(0.52, 0.5, 0.4, 0.22, c);
      q.P([[0.46, 0.3], [0.56, 0.12], [0.62, 0.3]], c, { tone: 0.35 });
      q.D(0.8, 0.44, "#101010");
    },

    bigfoot(q){
      const c = q.o.colour || "#5A3E2A";
      q.B(0.3, 0.68, 0.14, 0.32, c, { tone: 0.35 }); q.B(0.56, 0.66, 0.14, 0.3, c, { tone: 0.45 });
      q.E(0.5, 0.46, 0.26, 0.28, c);
      q.E(0.24, 0.5, 0.07, 0.22, c, { bias: -0.1 }); q.E(0.76, 0.5, 0.07, 0.22, c);
      q.E(0.5, 0.14, 0.13, 0.12, c);
      q.L(0.44, 0.12, 0.56, 0.12, "#241810");
    },

    rooster(q){
      const c = q.o.colour || "#F2EDE4";
      q.L(0.46, 0.8, 0.44, 1, "#E8A02A"); q.L(0.56, 0.8, 0.58, 1, "#E8A02A");
      q.E(0.18, 0.4, 0.14, 0.26, "#1E3A2E", { bias: -0.05 });
      q.E(0.48, 0.62, 0.3, 0.22, c);
      q.E(0.72, 0.32, 0.12, 0.14, c);
      q.P([[0.66, 0.2], [0.7, 0.06], [0.76, 0.16], [0.8, 0.08], [0.8, 0.22]], "#D02A2A");
      q.P([[0.82, 0.32], [0.94, 0.36], [0.82, 0.38]], "#E8A02A");
      q.E(0.8, 0.44, 0.03, 0.06, "#D02A2A", { flat: true });
      q.D(0.75, 0.3, "#101010");
    },

    /* ── food ─────────────────────────────────────────── */
    burrito(q){
      const c = q.o.colour || "#E8C98E";
      if (q.o.view === "top"){
        q.E(0.5, 0.5, 0.46, 0.3, c);
        for (let i = 0; i < 5; i++) q.L(0.18 + i * 0.14, 0.34, 0.24 + i * 0.14, 0.62, "#9A6A34", 0.6);
        return;
      }
      q.E(0.14, 0.66, 0.12, 0.26, c, { bias: -0.05 });
      q.B(0.14, 0.4, 0.72, 0.52, c, { tone: 0.6, grad: 0.3 });
      for (let i = 0; i < 4; i++) q.L(0.24 + i * 0.16, 0.48, 0.3 + i * 0.16, 0.6, "#9A6A34", 0.7);
      q.E(0.86, 0.66, 0.1, 0.26, "#F2D060", { flat: true });
      q.E(0.85, 0.6, 0.04, 0.07, "#8A5A2A", { flat: true }); q.E(0.88, 0.74, 0.03, 0.05, "#C8302A", { flat: true });
      q.E(0.83, 0.76, 0.03, 0.05, "#4E8A3A", { flat: true });
    },

    burger(q){
      q.E(0.5, 0.86, 0.44, 0.12, "#C98A42");
      q.B(0.08, 0.66, 0.84, 0.14, "#5A3420", { tone: 0.45, grad: 0.1 });
      q.P([[0.06, 0.62], [0.94, 0.62], [0.9, 0.7], [0.8, 0.66], [0.66, 0.74], [0.5, 0.66], [0.3, 0.72], [0.1, 0.68]], "#F2C62C");
      q.P([[0.04, 0.58], [0.96, 0.58], [0.9, 0.64], [0.7, 0.6], [0.5, 0.65], [0.3, 0.6], [0.1, 0.64]], "#5AA03A");
      q.E(0.5, 0.46, 0.46, 0.3, "#D9923E", { bias: 0.05 });
      q.B(0.02, 0.46, 0.96, 0.12, "#C98A42", { tone: 0.35 });
      for (let i = 0; i < 6; i++) q.D(0.26 + i * 0.1, 0.3 + (i % 2) * 0.06, "#F4ECD0");
    },

    fries(q){
      const c = q.o.colour || "#C8252C";
      for (let i = 0; i < 8; i++) q.B(0.18 + i * 0.08, 0.04 + (i % 3) * 0.06, 0.06, 0.5, "#F2C23A", { tone: 0.6 });
      q.P([[0.08, 0.34], [0.92, 0.34], [0.8, 1], [0.2, 1]], c, { tone: 0.55 });
      q.P([[0.08, 0.34], [0.5, 0.46], [0.92, 0.34], [0.9, 0.4], [0.5, 0.52], [0.1, 0.4]], c, { tone: 0.4 });
      q.E(0.5, 0.72, 0.14, 0.1, "#F2C62C", { flat: true });
    },

    shake(q){
      const c = q.o.colour || "#F4D0DC";
      q.L(0.62, 0.0, 0.52, 0.34, "#E23A5A"); q.L(0.64, 0.0, 0.54, 0.34, "#F4F1EA");
      q.E(0.5, 0.26, 0.36, 0.12, "#FFFFFF", { bias: 0.1 }); q.E(0.44, 0.18, 0.2, 0.1, "#FFFFFF", { bias: 0.1 });
      q.E(0.54, 0.08, 0.08, 0.07, "#C8202C");
      q.P([[0.14, 0.3], [0.86, 0.3], [0.72, 0.86], [0.28, 0.86]], c, { tone: 0.6 });
      q.L(0.24, 0.34, 0.34, 0.8, "#FFFFFF", 0.5);
      q.B(0.36, 0.86, 0.28, 0.06, "#D8E0E4"); q.E(0.5, 0.96, 0.22, 0.05, "#D8E0E4");
    },

    biscuit(q){
      q.E(0.5, 0.84, 0.46, 0.14, q.o.colour || "#D9A25A");
      q.B(0.06, 0.56, 0.88, 0.2, "#8A5A2A", { tone: 0.5, grad: 0.2 });
      q.P([[0.04, 0.54], [0.96, 0.54], [0.86, 0.62], [0.5, 0.58], [0.14, 0.63]], "#F2D060");
      q.E(0.5, 0.42, 0.46, 0.26, q.o.colour || "#D9A25A", { bias: 0.05 });
      q.L(0.2, 0.4, 0.8, 0.36, "#9A6A34", 0.5); q.L(0.26, 0.5, 0.74, 0.47, "#9A6A34", 0.4);
    },

    bucket(q){
      for (let i = 0; i < 4; i++) q.E(0.24 + i * 0.17, 0.16 + (i % 2) * 0.05, 0.12, 0.13, "#A8642A");
      q.P([[0.06, 0.24], [0.94, 0.24], [0.82, 1], [0.18, 1]], "#F4F1EA", { tone: 0.6 });
      for (let i = 0; i < 4; i++) q.P([[0.1 + i * 0.22, 0.24], [0.2 + i * 0.22, 0.24], [0.21 + i * 0.18, 1], [0.15 + i * 0.18, 1]], q.o.colour || "#C8252C");
    },

    plate(q){
      if (q.o.view === "top"){
        q.E(0.5, 0.5, 0.48, 0.46, "#F4F1EA", { flat: true, bias: 0.1 });
        q.E(0.5, 0.5, 0.36, 0.34, "#E8E4DA", { flat: true });
        q.E(0.38, 0.42, 0.14, 0.12, "#FFFFFF", { flat: true }); q.E(0.38, 0.42, 0.05, 0.05, "#F2B830");
        q.B(0.54, 0.34, 0.2, 0.2, "#C98A42", { tone: 0.6 });
        q.L(0.3, 0.64, 0.66, 0.66, "#A0402A"); q.L(0.3, 0.68, 0.66, 0.7, "#C85A3A");
        return;
      }
      q.E(0.5, 0.86, 0.48, 0.12, "#F4F1EA", { flat: true, bias: 0.1 });
      q.E(0.36, 0.72, 0.18, 0.1, "#FFFFFF"); q.E(0.36, 0.68, 0.07, 0.07, "#F2B830");
      q.P([[0.56, 0.78], [0.62, 0.42], [0.84, 0.44], [0.8, 0.8]], "#C98A42", { tone: 0.62 });
    },

    cheese(q){
      q.E(0.5, 0.82, 0.48, 0.14, "#8A5A34", { flat: true });
      q.P([[0.12, 0.76], [0.44, 0.76], [0.38, 0.4]], q.o.colour || "#F2C94C", { tone: 0.62 });
      q.D(0.3, 0.64, "#C9A03A"); q.D(0.36, 0.7, "#C9A03A");
      q.B(0.5, 0.5, 0.2, 0.26, "#F4ECD0", { tone: 0.6 });
      for (let i = 0; i < 6; i++) q.E(0.78 + (i % 3) * 0.05, 0.62 + ((i / 3) | 0) * 0.08, 0.035, 0.05, "#6B3F7A");
    },

    cake(q){
      const c = q.o.colour || "#F4C7D8";
      q.B(0.1, 0.4, 0.8, 0.56, c, { tone: 0.58 });
      q.E(0.5, 0.4, 0.4, 0.1, "#FFFFFF", { flat: true, bias: 0.1 });
      for (let i = 0; i < 5; i++) q.E(0.16 + i * 0.17, 0.46, 0.04, 0.06, "#FFFFFF", { flat: true });
      for (let i = 0; i < 3; i++){ q.B(0.34 + i * 0.14, 0.18, 0.03, 0.2, "#7EC8F0"); q.glow(0.355 + i * 0.14, 0.14, 0.12, [255, 200, 90], 0.5); q.D(0.355 + i * 0.14, 0.14, "#FFD060"); }
    },
  };

  /* ── objects ─────────────────────────────────────────── */
  // The word on a sign: one from the query if it has one worth lighting up.
  const PLAIN = new Set(["sign", "signs", "vintage", "neon", "old", "retro", "hand", "painted", "big", "the", "a", "of",
                         "marquee", "billboard", "classic", "sign", "light", "lights", "at", "night", "photo", "street"]);
  function signWord(o){
    const w = String(o.query || "").toLowerCase().split(/[^a-z]+/).find((x) => x.length > 2 && x.length < 8 && !PLAIN.has(x));
    if (w) return w.toUpperCase();
    return { diner: "EAT", lanes: "BOWL", drive: "OPEN", street: "MOTEL" }[o.setting] || "OPEN";
  }

  // A ring drawn as beads round an ellipse: bands, handles, hoops.
  function ring(q, u, v, ru, rv, th, hex, x){
    for (let a = 0; a < 6.283; a += 0.18) q.E(u + Math.cos(a) * ru, v + Math.sin(a) * rv, th, th * q.box.w / q.box.h, hex, x);
  }

  Object.assign(DRAW, {
    crown(q){
      const c = q.o.colour || "#D9A62A";
      if (q.o.setting === "stage" || q.o.setting === "studio") q.E(0.5, 0.9, 0.5, 0.1, "#8E1A2A");
      q.P([[0.1, 0.84], [0.9, 0.84], [0.94, 0.3], [0.76, 0.56], [0.62, 0.2], [0.5, 0.52], [0.38, 0.2], [0.24, 0.56], [0.06, 0.3]], c, { tone: 0.6 });
      q.B(0.1, 0.7, 0.8, 0.14, c, { tone: 0.42 });
      for (const [u, v] of [[0.06, 0.28], [0.38, 0.18], [0.62, 0.18], [0.94, 0.28]]) q.E(u, v, 0.05, 0.06, c, { bias: 0.1 });
      q.E(0.5, 0.77, 0.06, 0.05, "#C8202C"); q.E(0.28, 0.77, 0.04, 0.04, "#2F6FC0"); q.E(0.72, 0.77, 0.04, 0.04, "#3E8A3A");
    },

    tophat(q){
      const c = q.o.colour || "#1C1C1E";
      q.E(0.5, 0.88, 0.48, 0.1, c, { flat: true, bias: 0.05 });
      q.B(0.22, 0.14, 0.56, 0.72, c, { tone: 0.5, grad: 0.3 });
      q.B(0.22, 0.66, 0.56, 0.1, "#8E1A2A", { tone: 0.5 });
      q.E(0.5, 0.14, 0.28, 0.06, c, { flat: true, bias: 0.12 });
      if (q.R() > 0.55){ q.L(0.86, 0.3, 0.98, 0.96, "#101010"); q.L(0.86, 0.3, 0.88, 0.38, "#F4F1EA"); }
    },

    cards(q){
      const n = 5, suit = ["#C8202C", "#1C1C1E"];
      for (let i = 0; i < n; i++){
        const a = (i - (n - 1) / 2) * 0.28, cx = 0.5, cy = 0.95;
        const pt = (du, dv) => [cx + du * Math.cos(a) - dv * Math.sin(a), cy + du * Math.sin(a) + dv * Math.cos(a)];
        q.P([pt(-0.14, -0.88), pt(0.14, -0.88), pt(0.14, -0.1), pt(-0.14, -0.1)], "#F4F1EA", { tone: 0.62 - i * 0.03 });
        const [pu, pv] = pt(0, -0.62);
        q.E(pu, pv, 0.04, 0.05, suit[i % 2], { flat: true });
      }
    },

    baton(q){
      const c = q.o.colour || "#7EC8F0";
      q.E(0.06, 0.62, 0.05, 0.3, c, { bias: -0.1 });
      q.B(0.06, 0.32, 0.88, 0.6, c, { tone: 0.6, grad: 0.45 });
      q.E(0.94, 0.62, 0.05, 0.3, c, { bias: 0.1 });
      q.P([[0.5, 0.4], [0.53, 0.54], [0.6, 0.55], [0.54, 0.62], [0.56, 0.76], [0.5, 0.67], [0.44, 0.76], [0.46, 0.62], [0.4, 0.55], [0.47, 0.54]], "#F2C94C");
    },

    // A short terry tube seen from above the rim: outside, then the dark inside.
    band(q){
      const c = q.o.colour || "#F07A1C";
      q.E(0.5, 0.76, 0.44, 0.2, c);
      q.B(0.06, 0.42, 0.88, 0.34, c, { tone: 0.55, grad: 0.35 });
      for (let i = 0; i < 16; i++) q.L(0.09 + i * 0.053, 0.44, 0.09 + i * 0.053, 0.9, "#000000", 0.12);
      q.E(0.5, 0.42, 0.44, 0.2, c, { flat: true, bias: 0.15 });
      q.E(0.5, 0.43, 0.36, 0.14, c, { flat: true, bias: -0.35 });
      q.B(0.62, 0.52, 0.14, 0.16, "#F4F1EA", { tone: 0.6 });
    },

    jacket(q){
      const c = q.o.colour || "#1B2A4A";
      if (q.o.setting === "shop" || q.o.setting === "studio") q.L(0.5, 0.0, 0.5, 0.12, "#8A8D91");
      q.P([[0.16, 0.2], [0.02, 0.9], [0.14, 0.94], [0.26, 0.4]], c, { tone: 0.42 });
      q.P([[0.84, 0.2], [0.98, 0.9], [0.86, 0.94], [0.74, 0.4]], c, { tone: 0.5 });
      q.P([[0.2, 0.14], [0.8, 0.14], [0.78, 1], [0.22, 1]], c, { tone: 0.55 });
      q.B(0.4, 0.06, 0.2, 0.1, c, { tone: 0.62 });
      q.L(0.5, 0.12, 0.5, 1, "#C0C4C8");
      q.L(0.1, 0.3, 0.02, 0.88, "#F4F1EA", 0.9); q.L(0.9, 0.3, 0.98, 0.88, "#F4F1EA", 0.9);
      q.E(0.34, 0.34, 0.06, 0.04, "#3FB8AF", { flat: true });
    },

    sweater(q){
      const c = q.o.colour || "#4E7A3A";
      q.P([[0.16, 0.18], [0.02, 0.9], [0.14, 0.94], [0.26, 0.38]], c, { tone: 0.42 });
      q.P([[0.84, 0.18], [0.98, 0.9], [0.86, 0.94], [0.74, 0.38]], c, { tone: 0.5 });
      q.P([[0.2, 0.12], [0.42, 0.12], [0.5, 0.46], [0.58, 0.12], [0.8, 0.12], [0.78, 1], [0.22, 1]], c, { tone: 0.56 });
      for (let v = 0.2; v < 1; v += 0.08) q.L(0.22, v, 0.78, v, "#000000", 0.12);
      for (let i = 0; i < 4; i++) q.D(0.5, 0.54 + i * 0.12, "#E8DCC4");
    },

    tape(q){
      const c = q.o.colour || "#F2C62C";
      q.B(0.44, 0.7, 0.56, 0.12, c, { tone: 0.62, grad: 0 });
      for (let i = 0; i < 9; i++) q.L(0.48 + i * 0.06, 0.7, 0.48 + i * 0.06, 0.74 + (i % 2) * 0.03, "#1C1C1E");
      q.E(0.3, 0.6, 0.28, 0.34, c);
      q.E(0.3, 0.6, 0.1, 0.12, "#8A8D91");
      q.D(0.3, 0.6, "#1C1C1E");
    },

    kiln(q){
      const c = q.o.colour || "#8A4A2E";
      q.B(0.36, 0.0, 0.12, 0.2, "#4A4A50", { tone: 0.4 });
      q.B(0.04, 0.16, 0.92, 0.84, c, { tone: 0.5 });
      for (let v = 0.22; v < 1; v += 0.1) q.L(0.04, v, 0.96, v, "#3A1E12", 0.5);
      q.E(0.5, 0.64, 0.24, 0.2, "#2A0E06", { flat: true });
      q.glow(0.5, 0.66, 0.5, [255, 140, 40], 0.6);
      q.E(0.5, 0.7, 0.16, 0.12, "#FF9A2A", { flat: true, bias: 0.25 });
      q.P([[0.42, 0.74], [0.46, 0.5], [0.5, 0.66], [0.55, 0.46], [0.58, 0.74]], "#FFD060");
    },

    vase(q){
      const c = q.o.colour || "#C2562B", shape = (q.o.mark + (q.R() * 3 | 0)) % 3;
      if (shape === 0){
        q.E(0.5, 0.64, 0.4, 0.34, c);
        q.B(0.36, 0.14, 0.28, 0.24, c, { tone: 0.5 });
        q.E(0.5, 0.14, 0.18, 0.05, c, { flat: true, bias: 0.15 });
      } else if (shape === 1){
        q.E(0.5, 0.74, 0.48, 0.24, c);
        q.E(0.5, 0.56, 0.44, 0.06, c, { flat: true, bias: -0.25 });
      } else {
        q.E(0.84, 0.46, 0.12, 0.16, c, { bias: -0.1 });
        q.E(0.46, 0.62, 0.36, 0.36, c);
        q.P([[0.28, 0.1], [0.62, 0.1], [0.56, 0.34], [0.34, 0.34]], c, { tone: 0.5 });
      }
      q.L(0.16, 0.66, 0.84, 0.66, "#F4ECD0", 0.6);
    },

    sign(q){
      const c = q.o.colour || "#C8252C", lit = q.o.time === "night" || q.o.time === "dusk";
      const word = signWord(q.o);
      q.B(0.47, 0.64, 0.06, 0.36, "#6E6E76", { tone: 0.45 });
      if (lit) q.glow(0.5, 0.38, 0.7, K().rgb(c), 0.45);
      q.P([[0.5, 0.0], [0.58, 0.1], [0.5, 0.2], [0.42, 0.1]], "#F2C62C");
      q.B(0.04, 0.18, 0.92, 0.46, c, { tone: 0.55 });
      q.B(0.1, 0.24, 0.8, 0.34, "#F4ECD0", { tone: lit ? 0.9 : 0.62 });
      for (let i = 0; i < 16; i++){
        const u = 0.06 + (i % 8) * 0.125, v = i < 8 ? 0.2 : 0.62;
        q.D(u, v, lit && (i + q.o.mark) % 2 ? "#FFF2B0" : "#8A6A3A");
        if (lit && i % 3 === 0) q.glow(u, v, 0.06, [255, 230, 150], 0.5);
      }
      const inner = q.box.w * 0.8 - 2, fit = K().textW(word, 2) <= inner ? 2 : 1;
      const shown = word.slice(0, Math.max(1, Math.floor((inner + 1) / (4 * fit))));
      const tw = K().textW(shown, fit);
      q.text(shown, 0.1 + Math.max(0, (q.box.w * 0.8 - tw) / 2) / q.box.w, 0.41 - fit * 2.5 / q.box.h, lit ? "#E23A2A" : "#1C1C1E", fit);
    },

    balloon(q){
      if (/animal|dog/.test(q.o.query || "")){
        const c = q.o.colour || "#E23A5A";
        for (const [u, v, ru, rv] of [[0.3, 0.72, 0.05, 0.2], [0.44, 0.72, 0.05, 0.2], [0.66, 0.72, 0.05, 0.2], [0.8, 0.72, 0.05, 0.2]]) q.E(u, v, ru, rv, c);
        q.E(0.56, 0.48, 0.3, 0.1, c); q.E(0.18, 0.3, 0.1, 0.16, c);
        q.E(0.12, 0.08, 0.05, 0.12, c); q.E(0.24, 0.1, 0.05, 0.12, c);
        q.E(0.92, 0.36, 0.05, 0.14, c);
        return;
      }
      const cs = ["#E23A5A", "#2F6FC0", "#F2C62C", "#3E8A3A"];
      for (let i = 0; i < 3; i++){
        const u = 0.25 + i * 0.25, v = 0.24 + (i % 2) * 0.12, cc = q.o.colour || cs[(i + q.o.mark) % cs.length];
        q.L(u, v + 0.2, 0.5, 1, "#8A8D91", 0.8);
        q.E(u, v, 0.14, 0.2, cc);
        q.D(u, v + 0.21, cc);
      }
    },

    pin(q){
      q.E(0.32, 0.72, 0.18, 0.26, "#F4F1EA");
      q.B(0.26, 0.26, 0.12, 0.3, "#F4F1EA", { tone: 0.6 });
      q.E(0.32, 0.18, 0.1, 0.12, "#F4F1EA");
      q.B(0.25, 0.34, 0.14, 0.05, "#C8202C"); q.B(0.24, 0.42, 0.16, 0.05, "#C8202C");
      q.E(0.76, 0.8, 0.2, 0.2, q.o.colour && q.o.colour !== "#F4F1EA" ? q.o.colour : "#2A2A6A");
      q.D(0.72, 0.74, "#101010"); q.D(0.8, 0.74, "#101010"); q.D(0.76, 0.84, "#101010");
    },

    mic(q){
      q.E(0.5, 0.96, 0.4, 0.04, "#2A2A2E", { flat: true });
      q.L(0.5, 0.2, 0.5, 0.96, "#4A4A50");
      q.E(0.5, 0.14, 0.26, 0.12, q.o.colour || "#C0C4C8");
      for (let i = 0; i < 4; i++) q.L(0.32, 0.1 + i * 0.03, 0.68, 0.1 + i * 0.03, "#6E6E76", 0.5);
    },

    freshener(q){
      const c = q.o.colour || "#3E8A3A";
      q.L(0.5, 0.0, 0.5, 0.12, "#C0C4C8");
      for (let k = 0; k < 3; k++) q.P([[0.5, 0.1 + k * 0.24], [0.1 + k * 0.04, 0.44 + k * 0.24], [0.9 - k * 0.04, 0.44 + k * 0.24]], c, { tone: 0.55 });
      q.B(0.44, 0.8, 0.12, 0.2, "#8A5A34");
    },

    tshirt(q){
      const c = q.o.colour || "#F4F1EA";
      q.P([[0.3, 0.06], [0.02, 0.24], [0.12, 0.44], [0.24, 0.36], [0.24, 1], [0.76, 1], [0.76, 0.36], [0.88, 0.44], [0.98, 0.24], [0.7, 0.06], [0.6, 0.1], [0.4, 0.1]], c, { tone: 0.58 });
      q.E(0.5, 0.08, 0.1, 0.04, c, { flat: true, bias: -0.3 });
    },

    star(q){
      const pts = [];
      for (let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.2 : 0.48; pts.push([0.5 + Math.cos(a) * r, 0.52 + Math.sin(a) * r]); }
      if (q.o.time === "night") q.glow(0.5, 0.5, 0.8, [255, 220, 120], 0.5);
      q.P(pts, q.o.colour || "#F2C62C", { tone: 0.62 });
    },

    moon(q){
      const c = q.o.colour || "#F4E6B8";
      q.L(0.5, -2, 0.5, 0.05, "#2A2A2E");
      q.glow(0.5, 0.5, 1.1, [255, 200, 120], 0.45);
      q.E(0.5, 0.52, 0.46, 0.46, c, { bias: 0.15 });
      for (let v = 0.2; v < 0.9; v += 0.14) q.L(0.14, v, 0.86, v, "#C8A060", 0.35);
    },

    boat(q){
      const c = q.o.colour || "#C2562B";
      q.P([[0.0, 0.3], [1.0, 0.3], [0.86, 0.9], [0.14, 0.9]], c, { tone: 0.5 });
      q.P([[0.06, 0.3], [0.94, 0.3], [0.9, 0.42], [0.1, 0.42]], "#3A2A1E", { tone: 0.35 });
      q.L(0.6, 0.0, 0.76, 0.8, "#8A5A34");
    },

    log(q){
      q.B(0.06, 0.34, 0.86, 0.6, q.o.colour || "#6A4A30", { tone: 0.5, grad: 0.4 });
      for (let i = 0; i < 6; i++) q.L(0.1 + i * 0.13, 0.42, 0.2 + i * 0.13, 0.46, "#2A1A10", 0.6);
      q.E(0.92, 0.64, 0.08, 0.3, "#C9A06A", { flat: true });
      q.E(0.92, 0.64, 0.04, 0.14, "#9A7048", { flat: true });
    },

    spool(q){
      const c = q.o.colour || "#D9A62A";
      q.E(0.5, 0.92, 0.42, 0.08, "#C9A06A", { flat: true });
      q.B(0.14, 0.14, 0.72, 0.76, c, { tone: 0.6, grad: 0.1 });
      for (let v = 0.2; v < 0.9; v += 0.07) q.L(0.14, v, 0.86, v + 0.02, "#000000", 0.15);
      q.E(0.5, 0.12, 0.42, 0.08, "#C9A06A", { flat: true, bias: 0.15 });
    },

    ink(q){
      const c = q.o.colour || "#FF48B0";
      q.P([[0.52, 0.86], [0.98, 0.76], [0.98, 0.9], [0.56, 0.98]], c, { tone: 0.55 });
      q.B(0.04, 0.3, 0.46, 0.66, "#5A5A62", { tone: 0.5 });
      q.E(0.27, 0.3, 0.23, 0.08, c, { flat: true, bias: 0.1 });
      q.B(0.1, 0.52, 0.34, 0.2, "#F4F1EA", { tone: 0.62 });
    },

    book(q){
      const c = q.o.colour || "#C8252C";
      if (q.o.view === "top"){
        q.B(0.1, 0.06, 0.8, 0.88, c, { tone: 0.55 });
        q.B(0.24, 0.26, 0.52, 0.06, "#F4ECD0"); q.B(0.3, 0.38, 0.4, 0.04, "#F4ECD0");
        return;
      }
      q.B(0.14, 0.04, 0.72, 0.96, "#F4ECD0", { tone: 0.62 });
      q.B(0.1, 0.02, 0.7, 0.98, c, { tone: 0.52 });
      q.B(0.1, 0.02, 0.1, 0.98, c, { tone: 0.35 });
      q.B(0.3, 0.2, 0.4, 0.06, "#F4ECD0"); q.B(0.34, 0.3, 0.32, 0.04, "#F4ECD0");
    },

    /* ── people ──────────────────────────────────────── */
    person(q){ figure(q, "stand"); },
    team(q){ figure(q, "stand"); },
    runner(q){ figure(q, "run"); },
    magician(q){ figure(q, "magic"); },
    fisherman(q){ figure(q, "fish"); },

    /* ── plants ──────────────────────────────────────── */
    tree(q){
      const c = q.o.colour || "#3E6E3A";
      q.B(0.44, 0.56, 0.12, 0.44, "#6A4A30", { tone: 0.45 });
      if (q.o.mark % 2){ for (let k = 0; k < 3; k++) q.P([[0.5, k * 0.18], [0.08 + k * 0.02, 0.4 + k * 0.2], [0.92 - k * 0.02, 0.4 + k * 0.2]], c, { tone: 0.5 }); return; }
      q.E(0.34, 0.44, 0.26, 0.22, c); q.E(0.66, 0.42, 0.28, 0.24, c); q.E(0.5, 0.24, 0.3, 0.24, c, { bias: 0.05 });
    },

    plant(q){
      const c = q.o.colour || "#4E8A3A";
      for (let i = 0; i < 6; i++){
        const a = -2.6 + i * 0.44, tu = 0.5 + Math.cos(a) * 0.46, tv = 0.5 + Math.sin(a) * 0.5;
        q.P([[0.46, 0.62], [tu, tv], [0.54, 0.62]], c, { tone: 0.45 + (i % 2) * 0.15 });
      }
      q.P([[0.24, 0.6], [0.76, 0.6], [0.68, 1], [0.32, 1]], "#C2562B", { tone: 0.55 });
    },

    flower(q){
      const c = q.o.colour || "#E23A5A";
      q.L(0.5, 0.3, 0.5, 1, "#3E7A34");
      q.E(0.64, 0.66, 0.12, 0.05, "#4E8A3A");
      for (let i = 0; i < 5; i++){ const a = i * 1.2566; q.E(0.5 + Math.cos(a) * 0.2, 0.26 + Math.sin(a) * 0.12, 0.14, 0.09, c); }
      q.E(0.5, 0.26, 0.08, 0.06, "#F2C62C");
    },

    mushroom(q){
      const c = q.o.colour || "#C8252C";
      q.B(0.38, 0.46, 0.24, 0.54, "#F2E6C8", { tone: 0.6 });
      q.P([[0.02, 0.5], [0.12, 0.2], [0.5, 0.04], [0.88, 0.2], [0.98, 0.5]], c, { tone: 0.6 });
      for (const [u, v] of [[0.3, 0.3], [0.56, 0.18], [0.72, 0.36]]) q.E(u, v, 0.05, 0.04, "#F4F1EA", { flat: true });
    },
  });

  // Colours a person wears, and their skin, from their own seed.
  const SKIN = ["#F2C9A8", "#E0A87C", "#C98B5F", "#A56A44", "#7C4B2E", "#5A3420"];
  const CLOTH = ["#C8252C", "#2F6FC0", "#3E8A3A", "#F2C62C", "#1B2A4A", "#E8DCC4", "#6B3FA0", "#F07A1C"];

  function figure(q, pose){
    const R = q.R, skin = SKIN[(R() * SKIN.length) | 0], hair = ["#1B1512", "#3A2418", "#6B4A2B", "#B4B4BA"][(R() * 4) | 0];
    const kit = pose === "run" || q.o.setting === "track" ? (q.o.colour || "#F4F1EA") : q.o.colour || CLOTH[(R() * CLOTH.length) | 0];
    const legs = pose === "magic" ? "#1C1C1E" : ["#2A3A5A", "#3A3434", "#6E6E76"][(R() * 3) | 0];
    if (pose === "magic") q.P([[0.3, 0.2], [0.7, 0.2], [0.9, 0.86], [0.1, 0.86]], "#1C1C1E", { tone: 0.4 });
    if (pose === "run"){
      q.P([[0.42, 0.56], [0.52, 0.58], [0.3, 1], [0.2, 0.98]], legs, { tone: 0.4 });
      q.P([[0.5, 0.56], [0.6, 0.56], [0.86, 0.9], [0.76, 0.94]], legs, { tone: 0.55 });
      q.L(0.4, 0.3, 0.18, 0.46, skin); q.L(0.62, 0.3, 0.84, 0.24, skin);
    } else {
      q.B(0.36, 0.56, 0.12, 0.44, legs, { tone: 0.4 }); q.B(0.52, 0.56, 0.12, 0.44, legs, { tone: 0.5 });
    }
    q.P([[0.3, 0.2], [0.7, 0.2], [0.66, 0.6], [0.34, 0.6]], pose === "magic" ? "#1C1C1E" : kit, { tone: 0.56 });
    if (pose === "run" && q.o.setting === "track") q.B(0.46, 0.24, 0.08, 0.34, "#7EC8F0");
    if (pose === "stand"){ q.B(0.22, 0.22, 0.08, 0.34, kit, { tone: 0.42 }); q.B(0.7, 0.22, 0.08, 0.34, kit, { tone: 0.5 }); }
    if (pose === "magic"){
      q.L(0.66, 0.28, 0.86, 0.1, "#1C1C1E"); q.L(0.86, 0.1, 0.96, 0.0, "#F4F1EA");
      q.B(0.44, 0.2, 0.12, 0.04, "#D9A62A");
    }
    if (pose === "fish"){ q.L(0.62, 0.3, 1.0, 0.0, "#6E5A40"); q.L(1.0, 0.0, 1.0, 0.6, "#C0C4C8", 0.6); }
    q.E(0.5, 0.11, 0.12, 0.1, skin);
    q.E(0.5, 0.05, 0.12, 0.05, hair, { bias: -0.1 });
    if (pose === "magic"){ q.B(0.4, -0.16, 0.2, 0.16, "#1C1C1E", { tone: 0.5 }); q.B(0.32, 0.0, 0.36, 0.03, "#1C1C1E"); }
    if (pose === "fish") q.P([[0.34, 0.04], [0.66, 0.04], [0.58, -0.04], [0.42, -0.04]], "#4E6A3A");
  }

  // Where a print goes on the things that have a front.
  INFO.cup.print = (box) => ({ x: box.x + box.w * 0.3, y: box.y + box.h * 0.36, w: box.w * 0.3, h: box.h * 0.4 });
  INFO.tshirt.print = (box) => ({ x: box.x + box.w * 0.34, y: box.y + box.h * 0.3, w: box.w * 0.32, h: box.h * 0.34 });

  DRAW.cup = function (q){
    const c = q.o.colour || "#F4F1EA";
    if (q.o.view === "top"){
      ring(q, 0.86, 0.5, 0.1, 0.12, 0.04, c);
      q.E(0.46, 0.5, 0.4, 0.42, c, { flat: true, bias: 0.1 });
      q.E(0.46, 0.5, 0.32, 0.34, "#4A2A18", { flat: true });
      q.E(0.4, 0.44, 0.12, 0.1, "#C8A070", { flat: true });
      return;
    }
    ring(q, 0.8, 0.54, 0.12, 0.2, 0.05, c);
    q.B(0.12, 0.16, 0.6, 0.78, c, { tone: 0.58, grad: 0.3 });
    q.E(0.42, 0.94, 0.3, 0.06, c, { bias: -0.2 });
    q.E(0.42, 0.16, 0.3, 0.07, c, { flat: true, bias: 0.15 });
    q.E(0.42, 0.17, 0.25, 0.05, "#4A2A18", { flat: true });
    if (q.o.setting === "diner" || /coffee|tea|latte/.test(q.o.query || "")) for (let i = 0; i < 3; i++) q.L(0.3 + i * 0.12, 0.08, 0.34 + i * 0.12, -0.12, "#FFFFFF", 0.3);
  };

  function draw(id, b, box, o){
    const fn = DRAW[id];
    if (!fn) return;
    const q = pen(b, box, o);
    fn(q);
    const t = INFO[id] || {};
    if (o.companion && !o.solid && t.print) {
      const pb = t.print(box);
      decal(b, o.companion, pb, o, "#1C1C1E");
    }
  }

  return { INFO, DRAW, info, colourFor, draw, decal, pen };
})();

if (typeof module !== "undefined") module.exports = PixelThings;
