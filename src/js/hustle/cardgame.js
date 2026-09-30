"use strict";
/* ── Pick a card: Dennis's trick, on screen ───────────────
 * The Princess Card Trick (hustle/cardtrick.js) in a window of its own
 * (minigame.js): a self-shuffling deck on purple felt, in Dennis's purple and
 * gold, drawn a pixel at a time. It deals, you pick, it gathers, shuffles and
 * deals four back, and you say what you saw. What that wins is Hustle's
 * business: this only reports how each go went.
 *
 *   HustleCardGame.play({ key, title, seedFor(play), onResult(kind, round), onClose })
 *
 * onResult may return a line to show under the result (what you won).
 */

const HustleCardGame = (() => {
  const T = HustleCardTrick;
  const W = 176, H = 104, CW = 22, CH = 30;
  const DECK = { x: (W - CW) / 2, y: 38 };
  const row = (n, y) => Array.from({ length: n }, (_, i) => ({ x: Math.round((W - (n * CW + (n - 1) * 8)) / 2 + i * (CW + 8)), y }));

  /* ── the art ─────────────────────────────────────────── */
  const INK = { felt: "#2A1240", felt2: "#331650", gold: "#E0B83A", gold2: "#8A6A22", bulb: "#FFE58A", edge: "#1A1020",
    face: "#FFF8E8", back: "#6B2FA0", red: "#C8202E", black: "#141414", glow: "#FFD86B" };
  const G = (rows) => rows.map((r) => [...r].map((c) => c === "#"));
  const RANK = {
    J: G(["..#", "..#", "..#", "#.#", ".#."]), Q: G([".#.", "#.#", "#.#", "##.", ".##"]),
    K: G(["#.#", "#.#", "##.", "#.#", "#.#"]), A: G([".#.", "#.#", "###", "#.#", "#.#"]),
  };
  const PIP = {
    H: G(["#.#", "###", ".#."]), D: G([".#.", "###", ".#."]), S: G([".#.", "###", "#.#"]), C: G([".#.", "#.#", ".#."]),
  };
  const BIG = {
    H: G([".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."]),
    D: G(["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."]),
    S: G(["...#...", "..###..", ".#####.", "#######", "#######", ".##.##.", "..###.."]),
    C: G(["..###..", "..###..", "##.#.##", "#######", "##.#.##", "...#...", "..###.."]),
  };
  function blit(ctx, bmp, x, y, colour, flip) {
    ctx.fillStyle = colour;
    const h = bmp.length, w = bmp[0].length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (bmp[j][i]) ctx.fillRect(flip ? x + w - 1 - i : x + i, flip ? y + h - 1 - j : y + j, 1, 1);
  }
  // One card: face up (a card) or down (null), squeezed by `squash` when it
  // is turning over, lifted when it's the one you picked.
  function card(ctx, s) {
    const x = Math.round(s.x), y = Math.round(s.y - (s.lift || 0)), w = Math.max(1, Math.round(CW * (s.squash == null ? 1 : s.squash)));
    const x0 = x + Math.round((CW - w) / 2);
    if (s.glow) { ctx.fillStyle = INK.glow; ctx.fillRect(x0 - 1, y, w + 2, CH); ctx.fillRect(x0, y - 1, w, CH + 2); }
    ctx.fillStyle = INK.edge;
    ctx.fillRect(x0 + 1, y, w - 2, CH); ctx.fillRect(x0, y + 1, w, CH - 2);
    const up = s.face && s.card;
    ctx.fillStyle = up ? INK.face : INK.back;
    ctx.fillRect(x0 + 1, y + 1, w - 2, CH - 2);
    if (w < CW) return;                              // mid-turn: just the edge and the colour
    if (!up) {
      ctx.fillStyle = INK.gold;
      ctx.fillRect(x0 + 2, y + 2, CW - 4, 1); ctx.fillRect(x0 + 2, y + CH - 3, CW - 4, 1);
      ctx.fillRect(x0 + 2, y + 2, 1, CH - 4); ctx.fillRect(x0 + CW - 3, y + 2, 1, CH - 4);
      for (let j = 4; j < CH - 4; j++) for (let i = 4; i < CW - 4; i++) if ((i + j) % 4 === 0 && (i - j + 64) % 4 === 0) ctx.fillRect(x0 + i, y + j, 1, 1);
      return;
    }
    const c = s.card, ink = T.red(c) ? INK.red : INK.black;
    blit(ctx, RANK[c.r], x0 + 2, y + 2, ink);
    blit(ctx, PIP[c.s], x0 + 2, y + 8, ink);
    blit(ctx, RANK[c.r], x0 + CW - 5, y + CH - 7, ink, true);
    blit(ctx, PIP[c.s], x0 + CW - 5, y + CH - 11, ink, true);
    if (c.r !== "A") {                               // a court card's frame
      ctx.fillStyle = INK.gold;
      ctx.fillRect(x0 + 6, y + 7, 10, 1); ctx.fillRect(x0 + 6, y + 22, 10, 1);
      ctx.fillRect(x0 + 6, y + 7, 1, 16); ctx.fillRect(x0 + 15, y + 7, 1, 16);
    }
    blit(ctx, BIG[c.s], x0 + 8, y + 11, ink);
    if (s.gilt) { ctx.fillStyle = INK.gold; ctx.fillRect(x0 + 1, y + 1, CW - 2, 1); ctx.fillRect(x0 + 1, y + CH - 2, CW - 2, 1); ctx.fillRect(x0 + 1, y + 1, 1, CH - 2); ctx.fillRect(x0 + CW - 2, y + 1, 1, CH - 2); }
  }
  // Purple felt, a gold rope round it, and a marquee of bulbs along the top.
  function felt(ctx, lit) {
    ctx.fillStyle = INK.felt; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = INK.felt2;
    for (let y = 12; y < H - 2; y += 2) for (let x = (y / 2) % 2 ? 1 : 3; x < W - 2; x += 4) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = INK.gold2; ctx.fillRect(1, 1, W - 2, 1); ctx.fillRect(1, H - 2, W - 2, 1); ctx.fillRect(1, 1, 1, H - 2); ctx.fillRect(W - 2, 1, 1, H - 2);
    ctx.fillStyle = INK.gold; ctx.fillRect(2, 9, W - 4, 1);
    for (let i = 0, x = 5; x < W - 5; x += 7, i++) { ctx.fillStyle = (i + lit) % 3 === 0 ? INK.bulb : INK.gold2; ctx.fillRect(x, 4, 3, 3); }
  }

  /* ── the show ────────────────────────────────────────── */
  function play(o) {
    const g = MiniGame.open({ key: o.key, title: o.title || "PICK A CARD! — The Improbable Dennis", iconId: "cards", w: W, h: H, scale: 3, className: "w98--cards", onClose: o.onClose });
    if (g.running) return g;
    g.running = true;
    const ui = (n) => { if (typeof uiSound === "function") uiSound(n); };
    const sfx = (n) => { if (typeof Music !== "undefined") Music.sfx(n); };
    let cards = [], lit = 0, hover = -1, picking = null;
    const draw = () => { if (!g.alive()) return; felt(g.ctx, lit); cards.forEach((s, i) => card(g.ctx, Object.assign({}, s, { glow: s.glow || (picking && i === hover) }))); };
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const move = (list, to, ms, stagger = 0) => g.tween(ms + stagger * (list.length - 1), (t) => {
      const T0 = ms + stagger * (list.length - 1);
      list.forEach((s, i) => { const k = ease(Math.max(0, Math.min(1, (t * T0 - i * stagger) / ms))); s.x = s.from.x + (to[i].x - s.from.x) * k; s.y = s.from.y + (to[i].y - s.from.y) * k; });
      draw();
    });
    const from = (list) => list.forEach((s) => { s.from = { x: s.x, y: s.y }; });
    // Turn cards over: they narrow to an edge, change sides, and widen again.
    const turn = (list, face, ms = 200) => g.tween(ms, (t) => {
      list.forEach((s) => { s.squash = Math.abs(1 - 2 * t); if (t >= 0.5) s.face = face; });
      if (t >= 1) list.forEach((s) => { s.squash = 1; });
      draw();
    });
    // The marquee chases, unless less motion is asked for.
    const marquee = g.reduced ? 0 : setInterval(() => { if (!g.alive()) return clearInterval(marquee); lit++; draw(); }, 420);

    // Clicking a card while you're choosing one.
    const at = (e) => { const r = g.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const hit = (p) => cards.findIndex((s) => p.x >= s.x && p.x < s.x + CW && p.y >= s.y - (s.lift || 0) && p.y < s.y + CH);
    g.cv.addEventListener("pointermove", (e) => { if (!picking) return; const i = hit(at(e)); if (i !== hover) { hover = i; g.cv.style.cursor = i >= 0 ? "pointer" : ""; draw(); } });
    g.cv.addEventListener("pointerleave", () => { if (hover >= 0) { hover = -1; draw(); } });
    g.cv.addEventListener("click", (e) => { if (!picking) return; const i = hit(at(e)); if (i >= 0) picking(i); });

    const choose = (list) => new Promise((done) => g.choices(list.map((c) => Object.assign({}, c, { act: () => done(c.value) }))));

    async function round(n, first) {
      const r = T.deal(o.seedFor(n));
      cards = r.hand.map((c) => ({ card: c, face: false, x: DECK.x, y: DECK.y }));
      picking = null; hover = -1;
      draw();
      g.say(first ? "Welcome, welcome! The Improbable Dennis. Five cards, and you think of one. Don't tell me which!" : "Again! A fresh five. Think of one, and don't tell me.");
      if (!(await choose([{ label: "Deal them", value: 1, kind: "go" }]))) return;
      g.choices([]);
      ui("drawer");
      from(cards);
      await move(cards, row(5, 44), 260, 90);
      ui("pick");
      await turn(cards, true);
      if (!g.alive()) return;
      g.say("Look at them all. Click the one you're thinking of, so it's fixed in your mind. I'm looking at the ceiling.");
      g.choices([]);
      const picked = await new Promise((done) => { picking = done; });
      picking = null; hover = -1; g.cv.style.cursor = "";
      cards[picked].lift = 4; cards[picked].glow = true;
      ui("pick");
      draw();
      g.say("That one? Wonderful. Keep it in your head. Now: watch closely. Closer. Not that close.");
      await g.wait(900);
      cards[picked].lift = 0; cards[picked].glow = false;
      await turn(cards, false);
      from(cards);
      await move(cards, cards.map(() => DECK), 240, 40);
      // Shuffle: the deck splits and riffles back together, twice.
      ui("tuck");
      for (let k = 0; k < 2 && g.alive(); k++) {
        const a = cards.slice(0, 3), b = cards.slice(3);
        from(cards);
        await g.tween(220, (t) => { const d = Math.sin(t * Math.PI) * 16; a.forEach((s) => { s.x = DECK.x - d; }); b.forEach((s) => { s.x = DECK.x + d; }); draw(); });
      }
      // One goes in his pocket.
      const gone = cards.pop();
      from([gone]);
      await move([gone], [{ x: DECK.x + 50, y: -CH - 4 }], 300);
      // And four come back.
      cards = r.shown.map((c) => ({ card: c, face: false, x: DECK.x, y: DECK.y }));
      from(cards);
      draw();
      await move(cards, row(4, 44), 240, 90);
      await turn(cards, true);
      if (!g.alive()) return;
      sfx("chime");
      g.say("Your card... is GONE! Improbable! Well?");
      const claim = await choose(T.claims(r, picked).map((c) => ({ label: c.text, value: c, kind: c.kind === "applause" ? "quiet" : null })));
      if (!claim || !g.alive()) return;
      g.choices([]);
      const kind = T.judge(claim);
      const won = o.onResult ? o.onResult(kind, r, claim) : null;
      if (kind === "caught") {
        sfx("gap");
        // The first five, back on the felt above the four: not one of them came back.
        const five = r.hand.map((c) => ({ card: c, face: true, x: DECK.x, y: -CH }));
        const lower = cards;
        from(lower); await move(lower, row(4, 66), 220);
        cards = five.concat(lower);
        from(five); await move(five, row(5, 18), 260, 60);
        g.say("...You saw it. Nobody sees it. All five changed: the four you got back only look like them. I've done that one since 1991.");
        await g.wait(2600);
        if (!g.alive()) return;
        cards = [{ card: { r: "K", s: "S" }, face: true, gilt: true, x: DECK.x, y: 34 }];
        draw();
        ui("grid");
        g.say("For a sharp eye: my signature card. The King of Spades, black and gold, like the act." + (won ? " " + won : ""));
        await choose([{ label: "Close", value: "close", kind: "go" }]);
        g.close();
        return;
      }
      if (kind === "wrong") {
        sfx("clip-miss");
        g.say(claim.card ? "The " + T.name(claim.card).slice(4) + "? I never dealt " + T.name(claim.card) + "! Look closer, my friend." + (won ? " " + won : "") : "No, no.");
      } else {
        ui("loaded");
        g.say("Thank you! Thank you. You're a wonderful audience. I'm at the Starlite Lanes on Fridays." + (won ? " " + won : ""));
      }
      const next = await choose([{ label: "Again", value: "again", kind: "go" }, { label: "Close", value: "close" }]);
      if (next === "again") return round(n + 1, false);
      g.close();
    }

    round(0, true).finally(() => { clearInterval(marquee); g.running = false; });
    return g;
  }

  return { play, W, H };
})();
