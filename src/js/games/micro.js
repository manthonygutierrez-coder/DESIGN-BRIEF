"use strict";
/* ── Micro: a run of one-word games, a few seconds each ────
 * A word flashes up (CATCH! PICK! LEVEL!) and you have until the fuse burns
 * down to do it. Clear one and the next comes; miss and you lose a life; the
 * run speeds up as you go, and ends when the lives do. Some games, won the
 * first time, are research: the fact is on a card, as if clipped, and the
 * talk strip says what you learned.
 *
 *   HustleMicro.play(api)   api (hustle.js): { key, spec, seed, won, grant, factLabel, played, onClose }
 *   HustleMicro.core        the pure part: the order of games, the speed, the rules of each (tested)
 *
 * spec (games.js): { title, intro, ink, scene, grants, games: [game], cast? }
 *   game  { kind, cmd, grant?, say?, … }  kind is one of MECH below, with its own settings
 * Keys: arrows or A/D to move, Space (or a click) to act; picks take arrows and Space, or a click.
 * With less motion asked for the run never speeds up, fuses are half as long
 * again, and every window to hit is wider.
 */

const HustleMicro = (() => {
  const W = 160, H = 112;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;

  /* ── the pure part ─────────────────────────────────────── */
  const LIVES = 4, EVERY = 4, STEP = 0.15, TOP = 1.9;
  // How fast the run is after `cleared` games (with less motion, never faster).
  const speedAt = (cleared, still) => (still ? 1 : Math.min(TOP, 1 + Math.floor(cleared / EVERY) * STEP));
  // Seconds a game lasts at a speed.
  const fuseOf = (game, speed, still) => ((game.secs || MECH[game.kind].secs) / speed) * (still ? 1.5 : 1);
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // The order: shuffled rounds of every game, the ones still holding research
  // first in the first round, never the same game twice in a row.
  function order(games, n, seed, fresh) {
    const r = rng(seed), out = [];
    let round = 0;
    while (out.length < n) {
      const idx = games.map((_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      if (round === 0 && fresh) idx.sort((a, b) => (fresh(games[b]) ? 1 : 0) - (fresh(games[a]) ? 1 : 0));
      if (out.length && idx.length > 1 && idx[0] === out[out.length - 1]) idx.push(idx.shift());
      out.push(...idx);
      round++;
    }
    return out.slice(0, n);
  }

  /* ── the games ─────────────────────────────────────────────
   * Each: secs (at speed 1), start(m) → the game's own state, step(m, dt, in)
   * → "win" | "lose" | null, and draw(ctx, m). `in` is this frame's input:
   * { left, right, up, down (held), press (Space or a click, this frame), px (pointer, or null) }.
   * m: { g: the game's settings, t: seconds in, T: seconds it lasts, speed, still, r: rng }. */
  const MECH = {
    // Press, press, press: fill the bar before the fuse.
    mash: {
      secs: 4,
      start: (m) => ({ fill: 0, hits: 0, need: Math.round((m.g.need || 12) * (m.still ? 0.8 : 1)) }),
      step(m, dt, i) {
        const s = m.s;
        s.fill = Math.max(0, s.fill - dt * 0.12);          // it drains a little, unless you keep at it
        if (i.press) { s.hits++; s.fill = Math.min(1, s.fill + 1 / s.need); }
        return s.fill >= 1 - 1e-9 ? "win" : null;
      },
    },
    // A marker sweeps; press while it is in the zone. One press.
    timing: {
      secs: 3.6,
      start: (m) => ({ x: 0, dir: 1, zone: m.g.zone || [0.72, 0.86], v: (m.g.v || 0.9) * m.speed, pressed: false }),
      step(m, dt, i) {
        const s = m.s;
        s.x += s.dir * s.v * dt;
        if (s.x > 1) { s.x = 2 - s.x; s.dir = -1; } else if (s.x < 0) { s.x = -s.x; s.dir = 1; }
        if (i.press && !s.pressed) {
          s.pressed = true;
          const [a, b] = widen(s.zone, m.still);
          return s.x >= a && s.x <= b ? "win" : "lose";
        }
        return null;
      },
    },
    // Move along the bottom; catch the good thing, never a bad one.
    catch: {
      secs: 5,
      start: (m) => ({ x: W / 2, got: 0, need: m.g.need || 2, items: [], next: 0.15 }),
      step(m, dt, i) {
        const s = m.s, sp = 70 * m.speed;
        if (i.px != null) s.x += Math.max(-sp * 1.6 * dt, Math.min(sp * 1.6 * dt, i.px - s.x));
        if (i.left) s.x -= sp * dt; if (i.right) s.x += sp * dt;
        s.x = Math.max(10, Math.min(W - 10, s.x));
        s.next -= dt;
        if (s.next <= 0) {
          const good = m.r() < 0.6 || s.items.filter((o) => o.good).length === 0;
          s.items.push({ x: 12 + m.r() * (W - 24), y: -8, v: (38 + m.r() * 16) * m.speed, good });
          s.next = (0.45 + m.r() * 0.3) / m.speed;
        }
        const catchW = m.still ? 14 : 11;
        for (const o of s.items) {
          if (o.done) continue;
          o.y += o.v * dt;
          if (o.y > 82 && o.y < 92 && Math.abs(o.x - s.x) < catchW) {
            o.done = true;
            if (!o.good) return "lose";
            if (++s.got >= s.need) return "win";
          }
          if (o.y > H) o.done = true;
        }
        return null;
      },
    },
    // One of three is right: arrows and Space, or a click.
    pick: {
      secs: 4.5,
      start: (m) => {
        const n = m.g.options.length, perm = [...Array(n).keys()];
        for (let k = n - 1; k > 0; k--) { const j = Math.floor(m.r() * (k + 1)); [perm[k], perm[j]] = [perm[j], perm[k]]; }
        return { at: 1, perm, cool: 0 };
      },
      step(m, dt, i) {
        const s = m.s, n = s.perm.length;
        s.cool -= dt;
        if (s.cool <= 0 && (i.left || i.right)) { s.at = (s.at + (i.left ? n - 1 : 1)) % n; s.cool = 0.18; }
        if (i.press) {
          const pick = i.px != null ? Math.max(0, Math.min(n - 1, Math.floor(i.px / (W / n)))) : s.at;
          s.at = pick;
          return s.perm[pick] === (m.g.answer || 0) ? "win" : "lose";
        }
        return null;
      },
    },
    // Keep it level: it drifts, you lean against it. Survive the fuse.
    balance: {
      secs: 4.5,
      start: (m) => ({ a: 0, v: 0, push: (m.r() < 0.5 ? -1 : 1) * 0.9 }),
      step(m, dt, i) {
        const s = m.s;
        s.push += (m.r() - 0.5) * 3 * dt;
        s.push = Math.max(-1.3, Math.min(1.3, s.push));
        s.v += (s.push * 1.1 * m.speed + s.a * 0.8 + (i.left ? -3.2 : 0) + (i.right ? 3.2 : 0)) * dt;
        s.v *= 0.94;
        s.a += s.v * dt;
        if (Math.abs(s.a) > (m.still ? 1.35 : 1)) return "lose";
        return m.t >= m.T ? "win" : null;
      },
    },
    // Keep out of the way of what comes flying. Survive the fuse.
    dodge: {
      secs: 4.5,
      start: (m) => ({ x: W / 2, items: [], next: 0.3 }),
      step(m, dt, i) {
        const s = m.s, sp = 78 * m.speed;
        if (i.px != null) s.x += Math.max(-sp * 1.4 * dt, Math.min(sp * 1.4 * dt, i.px - s.x));
        if (i.left) s.x -= sp * dt; if (i.right) s.x += sp * dt;
        s.x = Math.max(10, Math.min(W - 10, s.x));
        s.next -= dt;
        if (s.next <= 0) {
          s.items.push({ x: 10 + m.r() * (W - 20), y: -8, v: (40 + m.r() * 22) * m.speed, k: Math.floor(m.r() * 3) });
          s.next = (0.42 + m.r() * 0.3) / m.speed;
        }
        const hitW = m.still ? 6 : 8;
        for (const o of s.items) {
          if (o.done) continue;
          o.y += o.v * dt;
          if (o.y > 76 && o.y < 90 && Math.abs(o.x - s.x) < hitW) return "lose";
          if (o.y > H) o.done = true;
        }
        return m.t >= m.T ? "win" : null;
      },
    },
    // Drop it onto the moving target.
    drop: {
      secs: 4.5,
      start: (m) => ({ hx: 20, hd: 1, bx: W / 2, bd: m.r() < 0.5 ? -1 : 1, fall: null }),
      step(m, dt, i) {
        const s = m.s;
        s.bx += s.bd * 34 * m.speed * dt; if (s.bx < 24 || s.bx > W - 24) s.bd *= -1;
        if (!s.fall) {
          s.hx += s.hd * 52 * m.speed * dt; if (s.hx < 12 || s.hx > W - 12) s.hd *= -1;
          if (i.press) s.fall = { x: s.hx, y: 24, v: 0 };
          return null;
        }
        s.fall.v += 260 * dt; s.fall.y += s.fall.v * dt;
        if (s.fall.y >= 78) return Math.abs(s.fall.x - s.bx) <= (m.still ? 14 : 10) ? "win" : "lose";
        return null;
      },
    },
  };
  // A window to hit, wider with less motion.
  function widen([a, b], still) { if (!still) return [a, b]; const c = (a + b) / 2, h = (b - a) * 0.8; return [c - h, c + h]; }

  /* ── drawing ─────────────────────────────────────────────── */
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const SPR = {
    band: ["..ooo..", ".o...o.", "o.....o", ".o...o.", "..ooo.."],
    bottle: [".w.", "www", "bbb", "bbb", "bbb", "bbb"],
    hash: [".yyy.", "yyYyy", "yYyyy", ".yyy."],
    burrito: [".cccc.", "cCcCcc", "cccCcc", ".cccc."],
    parsley: [".g.", "ggg", ".g."],
    carrot: [".g.", "ooo", ".oo", ".oo", "..o"],
    heart: [".hh.hh.", "hhhhhhh", "hhhhhhh", ".hhhhh.", "..hhh..", "...h..."],
    burger: [".yyyyy.", "yyyyyyy", "ggggggg", "bbbbbbb", ".yyyyy."],
    fries: ["y.y.y", "yyyyy", "rrrrr", "rrrrr", ".rrr."],
    drink: [".w..", "rrrr", "rwwr", "rrrr", "rrrr", ".rr."],
    crown: ["y.y.y.y.y", "yyyyyyyyy", "yrryyyrry", "yyyyyyyyy"],
    spoon: ["..sss..", ".sssss.", ".sssss.", "..sss..", "...s...", "...s...", "...s...", "...s...", "...s..."],
    hat: ["...kkk...", "..kkkkk..", "..kkkkk..", "kkkkkkkkk"],
    sock: [".ww.", ".ww.", ".ww.", "rwww", "rwww", ".rr."],
    cam: ["..kk...", "kkkkkkk", "kwwkkkk", "kkkkkkk"],
  };
  const SPAL = { o: "#F07A1C", w: "#FFFFFF", b: "#4AA8E8", y: "#E8B83A", Y: "#C8902A", c: "#E8D0A0", C: "#C9A06A", g: "#5E8C3A", h: "#E0442B", r: "#C8252C", s: "#B8BCC8", k: "#2A2A30" };
  const spr = (ctx, id, x, y, pal, flip) => Kit.blit(ctx, SPR[id], Math.round(x), Math.round(y), Object.assign({}, SPAL, pal || {}), flip);

  // Where it happens: the scene behind every game in a run.
  function scene(ctx, name, t, still) {
    if (name === "track") {                        // a running track, at dusk
      const sky = ["#2A1E4E", "#4A2A5E", "#7A3A5E", "#B8506A", "#E8805A", "#F2A65A"];
      sky.forEach((c, i) => rect(ctx, c, 0, i * 7, W, 7));
      rect(ctx, "#1E1830", 0, 34, W, 8);
      for (let x = 0; x < W; x += 12) rect(ctx, "#2A2240", x + 2, 30 - (x % 24 === 0 ? 4 : 1), 8, 12);
      rect(ctx, "#B8503A", 0, 42, W, 70);
      for (let y = 50; y < H; y += 14) rect(ctx, "#F4EAD8", 0, y, W, 1);
      rect(ctx, "#5E8C3A", 0, 42, W, 3);
    } else if (name === "drive") {                 // the Burger Baron, 6am
      rect(ctx, "#C8DEEE", 0, 0, W, 48);
      const sky = ["#F2D6A0", "#F4E2B8", "#E8EEF0", "#C8DEEE"];
      sky.forEach((c, i) => rect(ctx, c, 0, i * 9, W, 9));
      rect(ctx, "#C8252C", 8, 18, 64, 8); rect(ctx, "#F4EAD8", 10, 26, 60, 22); rect(ctx, "#2A2A30", 40, 30, 22, 18); rect(ctx, "#8FC8E8", 14, 30, 20, 12);
      Kit.text(ctx, "BURGER BARON", 14, 20, "#FFFFFF");
      rect(ctx, "#6A6A72", 0, 48, W, H - 48);
      for (let x = 0; x < W; x += 16) rect(ctx, "#E8C83A", x, 78, 8, 2);
      rect(ctx, "#4A4A52", 110, 10, 3, 38);                           // the sign's pole
    } else {                                       // Tori's kitchen
      rect(ctx, "#F6EAD2", 0, 0, W, H);
      for (let y = 0; y < 60; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) rect(ctx, "#EBD9B8", x, y, 7, 7);
      rect(ctx, "#8FC8E8", 112, 8, 36, 24); rect(ctx, "#FFFFFF", 129, 8, 2, 24); rect(ctx, "#FFFFFF", 112, 19, 36, 2);
      rect(ctx, "#A8703F", 0, 86, W, 26); rect(ctx, "#7A4E2C", 0, 86, W, 2);
      rect(ctx, "#D9482B", 0, 60, W, 2);
    }
  }
  // Two heads side by side, with fringes: which eye it covers, or none.
  function head(ctx, x, y, look, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const f = (c, a, b, w, h) => rect(ctx, c, a, b, w, h);
    f(look.skin, 1, 3, 8, 7); f(look.hair, 0, 0, 10, 4); f(look.hair, 0, 3, 1, 4); f(look.hair, 9, 3, 1, 4);
    f("#1A1418", 3, 6, 1, 1); f("#1A1418", 6, 6, 1, 1);
    if (look.fringe === "left") f(look.hair, 5, 3, 4, 4);            // his left: your right
    if (look.fringe === "right") f(look.hair, 1, 3, 4, 4);
    if (look.band) f(look.band, 0, 3, 10, 1);
    if (look.cowlick) { f(look.hair, 4, -2, 1, 2); f(look.hair, 5, -3, 1, 2); }
    f(look.top, 0, 10, 10, 3);
    ctx.restore();
  }
  // What a pick's options look like.
  function option(ctx, o, cx, cy) {
    if (o.text) {
      const lines = String(o.text).split("\n");
      lines.forEach((l, i) => { const w = Kit.measure(l); rect(ctx, "#F4EAD8", cx - w / 2 - 3, cy - 8 + i * 8, w + 6, 8); Kit.text(ctx, l, cx - w / 2, cy - 7 + i * 8, "#2A1C14"); });
    } else if (o.head) head(ctx, cx - 10, cy - 18, o.head, 2);
    else if (o.art === "spoonhat") { spr(ctx, "spoon", cx - 3, cy - 6); spr(ctx, "hat", cx - 4, cy - 10); }
    else if (o.art === "spoon") spr(ctx, "spoon", cx - 3, cy - 6);
    else if (o.art === "hat") spr(ctx, "hat", cx - 4, cy - 2);
    else if (o.art) spr(ctx, o.art, cx - 3, cy - 3);
  }

  function drawGame(ctx, m) {
    const g = m.g, s = m.s, look = m.look;
    switch (g.kind) {
      case "mash": {
        const k = s.fill;
        if (g.art === "stir") {
          rect(ctx, "#3A3A44", 56, 60, 48, 24); rect(ctx, "#D9482B", 58, 62, 44, 4);
          const a = s.hits * 0.9, sx = 80 + Math.round(Math.cos(a) * 14), sy = 62 + Math.round(Math.sin(a) * 3);
          rect(ctx, "#8A5A34", sx, sy - 22, 2, 24);
          if (!m.still) for (let i = 0; i < 3; i++) rect(ctx, "#FFFFFF", 66 + i * 12 + ((s.hits + i) % 2) * 2, 52 - ((s.hits + i * 2) % 4), 1, 2);
        } else if (g.art === "wrap") {
          const n = Math.floor(k * 4);
          rect(ctx, "#E8D0A0", 50, 60, 60 - n * 10, 12); rect(ctx, "#C9A06A", 50 + (60 - n * 10), 58, 8 + n * 3, 16);
          rect(ctx, "#E8742C", 54, 63, 12, 3); rect(ctx, "#5E8C3A", 70, 64, 8, 2);
        } else {                                   // someone running
          const x = 20 + k * 110, st = s.hits % 2 ? 1 : 2;
          Kit.person(ctx, Math.round(x), 60, look.runner || { skin: "#F2C9A8", hair: "#3A2A1E", top: "#F07A1C", legs: "#2A2A30" }, "right", st);
          rect(ctx, "#F4EAD8", 136, 52, 2, 26);
        }
        rect(ctx, "#1A1418", 30, 96, 100, 7); rect(ctx, g.color || "#F2C62C", 31, 97, Math.round(98 * k), 5);
        break;
      }
      case "timing": {
        const [a, b] = widen(s.zone, m.still);
        if (g.art === "zip") {                     // a navy jacket, zipping up
          rect(ctx, "#1B2A4A", 56, 30, 48, 56); rect(ctx, "#2E3E66", 56, 30, 10, 56); rect(ctx, "#2E3E66", 94, 30, 10, 56);
          rect(ctx, "#C9C9D0", 79, 30, 2, 56);
          const zy = 86 - s.x * 56;
          rect(ctx, "#F2C62C", 76, 86 - b * 56, 8, (b - a) * 56);
          rect(ctx, "#E8E8F0", 76, zy - 2, 8, 4);
        } else if (g.art === "clock") {            // five to six, on the store clock
          rect(ctx, "#F4EAD8", 58, 20, 44, 44); rect(ctx, "#2A2A30", 58, 20, 44, 2); rect(ctx, "#2A2A30", 58, 62, 44, 2); rect(ctx, "#2A2A30", 58, 20, 2, 44); rect(ctx, "#2A2A30", 100, 20, 2, 44);
          Kit.text(ctx, "6", 78, 55, "#2A2A30"); Kit.text(ctx, "12", 76, 24, "#2A2A30");
          const ang = -Math.PI / 2 + (s.x - 0.79) * 1.6, cx = 80, cy = 42;
          for (let r = 0; r < 16; r++) rect(ctx, "#C8252C", cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 1, 1);
          for (let r = 0; r < 10; r++) rect(ctx, "#2A2A30", cx, cy + r, 1, 1);
          const openAt = s.pressed && m.result === "win";
          rect(ctx, openAt ? "#3E8A3A" : "#8A8A90", 110, 30, 34, 12); Kit.text(ctx, openAt ? "OPEN" : "SHUT", 116, 33, "#FFFFFF");
        } else if (g.art === "ladle") {            // a ladle swinging over the cups: pour into the one that's there
          const cx = 20 + ((a + b) / 2) * 118;
          rect(ctx, "#F4EAD8", cx - 8, 70, 16, 14); rect(ctx, "#D9482B", cx - 6, 72, 12, 3);
          const lx = 20 + s.x * 118;
          rect(ctx, "#8A5A34", lx - 1, 30, 2, 26); rect(ctx, "#B8BCC8", lx - 5, 54, 10, 5); rect(ctx, "#D9482B", lx - 4, 55, 8, 2);
        }
        rect(ctx, "#1A1418", 20, 92, 120, 8);
        rect(ctx, g.color || "#3E8A3A", 21 + a * 118, 93, Math.max(2, (b - a) * 118), 6);
        rect(ctx, "#FFFFFF", 20 + s.x * 118, 90, 2, 12);
        break;
      }
      case "catch": {
        for (const o of s.items) if (!o.done) spr(ctx, o.good ? g.good : g.bad, o.x - 3, o.y);
        if (g.catcher === "hands") { rect(ctx, "#F2C9A8", s.x - 9, 88, 6, 4); rect(ctx, "#F2C9A8", s.x + 3, 88, 6, 4); rect(ctx, g.color || "#F07A1C", s.x - 10, 92, 20, 4); }
        else if (g.catcher === "bowl") { rect(ctx, "#F4EAD8", s.x - 11, 88, 22, 6); rect(ctx, "#F4EAD8", s.x - 8, 94, 16, 2); rect(ctx, "#D9482B", s.x - 9, 88, 18, 2); }
        else if (g.catcher === "tray") { rect(ctx, "#C8252C", s.x - 12, 90, 24, 3); rect(ctx, "#E8B83A", s.x - 12, 93, 24, 1); }
        else { rect(ctx, "#8A5A34", s.x - 10, 88, 20, 8); rect(ctx, "#A8703F", s.x - 10, 88, 20, 2); }
        Kit.text(ctx, s.got + "/" + s.need, 140, 4, "#FFFFFF");
        break;
      }
      case "pick": {
        const n = s.perm.length, cw = W / n;
        for (let k = 0; k < n; k++) {
          const cx = Math.round(cw * k + cw / 2), cy = 60;
          if (k === s.at) { rect(ctx, "#FFFFFF", cx - 22, cy - 30, 44, 2); rect(ctx, "#FFFFFF", cx - 22, cy + 22, 44, 2); rect(ctx, "#FFFFFF", cx - 22, cy - 30, 2, 54); rect(ctx, "#FFFFFF", cx + 20, cy - 30, 2, 54); }
          option(ctx, g.options[s.perm[k]], cx, cy);
        }
        break;
      }
      case "balance": {                             // the crown on the sign: level, please
        const a = s.a, cx = 111;
        rect(ctx, "#C8252C", cx - 22, 12, 44, 14);
        Kit.text(ctx, "BARON", cx - 9, 17, "#FFFFFF");
        const rows = SPR.crown;
        for (let j = 0; j < rows.length; j++) {
          const shift = Math.round(a * (rows.length - j) * 3);
          for (let i = 0; i < rows[j].length; i++) if (rows[j][i] !== ".") rect(ctx, SPAL[rows[j][i]], cx - 13 + i * 3 + shift, 0 + j * 3, 3, 3);
        }
        rect(ctx, "#1A1418", 30, 96, 100, 7); rect(ctx, "#3E8A3A", 70, 97, 20, 5);
        rect(ctx, "#FFFFFF", 79 + a * 48, 94, 3, 11);
        break;
      }
      case "dodge": {
        const kinds = g.items || ["burger", "fries", "drink"];
        for (const o of s.items) if (!o.done) spr(ctx, kinds[o.k % kinds.length], o.x - 3, o.y);
        Kit.person(ctx, Math.round(s.x - 4), 78, look[g.cast || "dodger"] || { skin: "#F2C9A8", hair: "#E8B83A", top: "#C8252C", legs: "#2A2A30", style: "cap", hat: "#E8B83A" }, "down", Math.floor(m.t * 8) % 3);
        break;
      }
      case "drop": {
        spr(ctx, "parsley", (s.fall ? s.fall.x : s.hx) - 1, s.fall ? s.fall.y : 24);
        if (!s.fall) { rect(ctx, look.skin || "#F2C9A8", s.hx - 3, 16, 6, 6); rect(ctx, "#D9482B", s.hx - 3, 10, 6, 6); }
        rect(ctx, "#F4EAD8", s.bx - 12, 80, 24, 8); rect(ctx, "#D9482B", s.bx - 10, 80, 20, 3); rect(ctx, "#F4EAD8", s.bx - 8, 88, 16, 2);
        break;
      }
    }
  }
  function fuse(ctx, left, still, t) {
    const x = 6 + Math.round(148 * Math.max(0, left));
    rect(ctx, "#1A1418", 4, 104, 152, 5);
    rect(ctx, "#C9A06A", 6, 106, x - 6, 1);
    if (left > 0) { rect(ctx, "#FFD86B", x - 1, 104, 3, 3); if (!still && Math.floor(t * 12) % 2) rect(ctx, "#FFFFFF", x, 103, 1, 1); }
  }
  function big(ctx, text, y, colour, shadow) {
    const s = Kit.measure(text, 3) > W - 8 ? 2 : 3, w = Kit.measure(text, s);
    Kit.text(ctx, text, (W - w) / 2 + s, y + s, shadow || "#1A1418", s);
    Kit.text(ctx, text, (W - w) / 2, y, colour, s);
  }
  function hearts(ctx, lives, y) {
    for (let i = 0; i < LIVES; i++) spr(ctx, "heart", 50 + i * 16, y, { h: i < lives ? "#E0442B" : "#4A3A44" });
  }

  /* ── play ──────────────────────────────────────────────── */
  function play(api) {
    const spec = api.spec;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--micro", ink: spec.ink, enterGo: true,
      onClose: () => { if (S && api.played) api.played(S.found ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const ctx = g.ctx, still = g.reduced, games = spec.games, grants = spec.grants || [];
    const has = (id) => api.won(id);
    const fresh = (x) => !!x.grant && !has(x.grant);
    const hud = () => g.hud(S.phase === "title" ? "found " + grants.filter(has).length + "/" + grants.length : "cleared " + S.cleared + (S.best ? " · best " + S.best : ""));
    S = { phase: "title", t: 0, cleared: 0, lives: LIVES, idx: 0, list: [], m: null, best: 0, found: false, press: false, px: null, runs: 0 };

    // Input for this frame: held keys, and presses since the last.
    g.onKey((key) => { if (key === " " || key === "enter") S.press = true; });
    g.cv.addEventListener("pointerdown", (e) => { if (S.phase === "play") { S.px = g.at(e).x; S.press = true; } });
    g.cv.addEventListener("pointermove", (e) => { if (S.phase === "play" && e.buttons) S.px = g.at(e).x; });
    const held = (...k) => k.some((x) => g.keys.has(x));

    function begin() {
      S.runs++;
      S.cleared = 0; S.lives = LIVES; S.idx = 0;
      S.list = order(games, 60, (api.seed || 1) + S.runs * 101, fresh);
      g.choices([]);
      g.say(spec.go || "Go!");
      next();
    }
    function next() {
      const game = games[S.list[S.idx % S.list.length]], speed = speedAt(S.cleared, still);
      S.m = { g: game, t: 0, T: fuseOf(game, speed, still), speed, still, r: rng((api.seed || 7) * 31 + S.idx * 977 + S.runs), look: spec.cast || {}, result: null };
      S.m.s = MECH[game.kind].start(S.m);
      S.phase = "cmd"; S.t = 0;
      if (S.cleared > 0 && S.cleared % EVERY === 0 && !still && speed < TOP + 0.01) S.faster = true;
      hud();
    }
    function done(result) {
      const m = S.m;
      m.result = result;
      S.phase = "result"; S.t = 0;
      if (result === "win") {
        S.cleared++;
        if (m.g.grant) {
          const r = api.grant(m.g.grant, m.g.say);
          if (r === "new") { S.found = true; g.toast("+ fact card: " + (api.factLabel ? api.factLabel(m.g.grant) : m.g.grant)); }
          if (m.g.say) g.say(m.g.say);
        }
      } else S.lives--;
      hud();
    }
    function over() {
      S.phase = "over"; S.t = 0;
      S.best = Math.max(S.best, S.cleared);
      hud();
      const left = grants.filter((x) => !has(x)).length;
      g.say("Cleared " + S.cleared + "." + (left ? " " + (spec.more || "There's more to find in here.") : " " + (spec.done || "That's everything this one knows.")));
      g.choices([{ label: "Again", kind: "go", act: begin }, { label: "Close", kind: "quiet", act: () => g.close() }]);
    }
    function title() {
      S.phase = "title"; S.t = 0;
      hud();
      g.say(spec.intro);
      g.choices([{ label: "Start", kind: "go", act: begin }, { label: "Close", kind: "quiet", act: () => g.close() }]);
    }

    function update(dt) {
      S.t += dt;
      const inp = { left: held("arrowleft", "a"), right: held("arrowright", "d"), up: held("arrowup", "w"), down: held("arrowdown", "s"), press: S.press, px: S.px };
      S.press = false;
      if (S.phase === "cmd" && S.t >= (still ? 1.1 : 0.8)) { S.phase = "play"; S.t = 0; S.px = null; }
      else if (S.phase === "play") {
        const m = S.m;
        m.t += dt;
        const r = MECH[m.g.kind].step(m, dt, inp) || (m.t >= m.T ? (["balance", "dodge"].includes(m.g.kind) ? "win" : "lose") : null);
        if (r) done(r);
      } else if (S.phase === "result" && S.t >= (still ? 1.2 : 0.8)) {
        if (S.lives <= 0) over();
        else { S.idx++; S.phase = "between"; S.t = 0; }
      } else if (S.phase === "between" && S.t >= (S.faster ? 1.3 : 0.7)) { S.faster = false; next(); }
    }
    function draw() {
      const m = S.m;
      scene(ctx, spec.scene, S.t, still);
      if (S.phase === "title") {
        rect(ctx, "rgba(0,0,0,.45)", 0, 30, W, 46);
        big(ctx, spec.name || "READY?", 38, "#FFFFFF");
        Kit.text(ctx, "SPACE: GO", (W - Kit.measure("SPACE: GO")) / 2, 62, "#F2C62C");
        return;
      }
      if (S.phase === "over") {
        rect(ctx, "rgba(0,0,0,.55)", 0, 0, W, H);
        big(ctx, "GAME OVER", 30, "#FFFFFF");
        const t = "CLEARED " + S.cleared;
        Kit.text(ctx, t, (W - Kit.measure(t, 2)) / 2, 58, "#F2C62C", 2);
        return;
      }
      if (S.phase === "between") {
        rect(ctx, "rgba(0,0,0,.5)", 0, 0, W, H);
        hearts(ctx, S.lives, 40);
        const t = String(S.cleared);
        Kit.text(ctx, t, (W - Kit.measure(t, 3)) / 2, 60, "#FFFFFF", 3);
        if (S.faster) big(ctx, "FASTER!", 84, "#F2C62C");
        return;
      }
      if (m) drawGame(ctx, m);
      if (S.phase === "cmd") { rect(ctx, "rgba(0,0,0,.35)", 0, 0, W, H); big(ctx, m.g.cmd, 40, "#FFFFFF"); if (m.g.hint) Kit.text(ctx, m.g.hint, (W - Kit.measure(m.g.hint)) / 2, 66, "#F2C62C"); }
      if (S.phase === "play") fuse(ctx, 1 - m.t / m.T, still, m.t);
      if (S.phase === "result") big(ctx, m.result === "win" ? "YES!" : "NO!", 34, m.result === "win" ? "#7CE07A" : "#FF6A5A");
    }

    title();
    g.loop((dt) => { update(dt); draw(); });
    draw();
    return g;
  }

  const out = { play, core: { MECH, LIVES, EVERY, speedAt, fuseOf, order, widen, rng }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("micro", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustleMicro;
