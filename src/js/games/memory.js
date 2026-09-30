"use strict";
/* ── Memory: a table of cards, face down ──────────────────
 * Turn two; a pair stays up, anything else turns back. Some pairs are
 * research (the fact is on a card as if clipped, and the talk strip says
 * what it was), and so is finishing a whole set. No clock of its own: take
 * your time, the research clock is stopped. Arrow keys and Space, or click.
 *
 *   HustleMemory.play(api)   api (hustle.js): { key, spec, seed, won, grant, factLabel, played, onClose }
 *   HustleMemory.core        the pure part: dealing, turning, matching (tested)
 *
 * spec (games.js): { title, name, intro, done, ink, felt, grants, pairs, sets }
 *   pair  { id, a: face, b?: face (else the same as a), set?, grant?, say? }
 *   face  { art, colour?, label }   art: bowl mug cat rain chalk cal coin kiln kilnopen
 *   sets  set id → { grant, say }: won when every pair in it is matched
 */

const HustleMemory = (() => {
  const W = 160, H = 112, COLS = 4, ROWS = 4, CW = 32, CH = 22, GX = 6, GY = 4;
  const X0 = (W - (COLS * CW + (COLS - 1) * GX)) >> 1, Y0 = (H - (ROWS * CH + (ROWS - 1) * GY)) >> 1;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;

  /* ── the pure part ─────────────────────────────────────── */
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Two cards for every pair, shuffled.
  function deal(pairs, seed) {
    const r = rng(seed), cards = [];
    pairs.forEach((_, i) => { cards.push({ pair: i, side: "a", up: false, done: false }); cards.push({ pair: i, side: "b", up: false, done: false }); });
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    return { cards, open: [], moves: 0 };
  }
  // Turn card i. Returns what happened: null (it was up already, or two are
  // waiting to turn back), "one" (the first of two), "match", "miss", or
  // "done" (the last pair). A miss leaves both up until settle().
  function flip(st, i) {
    const c = st.cards[i];
    if (!c || c.up || c.done || st.open.length >= 2) return null;
    c.up = true;
    st.open.push(i);
    if (st.open.length < 2) return "one";
    st.moves++;
    const [a, b] = st.open.map((k) => st.cards[k]);
    if (a.pair !== b.pair) return "miss";
    a.done = b.done = true;
    st.open = [];
    return st.cards.every((k) => k.done) ? "done" : "match";
  }
  function settle(st) { for (const k of st.open) st.cards[k].up = false; st.open = []; }
  const setDone = (st, pairs, set) => pairs.every((p, i) => p.set !== set || st.cards.filter((c) => c.pair === i).every((c) => c.done));

  /* ── drawing ───────────────────────────────────────────── */
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  function art(ctx, f, cx, cy) {
    const col = f.colour || "#D9482B";
    switch (f.art) {
      case "bowl":
        rect(ctx, "#F4EAD8", cx - 8, cy - 2, 16, 6); rect(ctx, "#F4EAD8", cx - 6, cy + 4, 12, 2); rect(ctx, "#C9B08E", cx - 8, cy + 3, 16, 1);
        rect(ctx, col, cx - 7, cy - 2, 14, 2);
        if (f.bits) for (let i = 0; i < 3; i++) rect(ctx, f.bits, cx - 5 + i * 4, cy - 2, 1, 1);
        rect(ctx, "#5E8C3A", cx, cy - 3, 1, 1);
        break;
      case "mug":
        rect(ctx, col, cx - 6, cy - 5, 11, 11); rect(ctx, col, cx + 5, cy - 2, 3, 5); rect(ctx, f.inner || "#2A1C14", cx + 6, cy - 1, 1, 3);
        rect(ctx, "rgba(255,255,255,.35)", cx - 5, cy - 4, 2, 8);
        break;
      case "cat":                                // Parsnip, sat on a card, as usual
        rect(ctx, "#F4EAD8", cx - 9, cy + 1, 18, 5); rect(ctx, "#C9B08E", cx - 7, cy + 3, 12, 1);
        Kit.blit(ctx, ["o..o....", "oooo....", "okok....", "ooo...o.", "oooooo..", "oooooo.."], cx - 4, cy - 6, { o: "#D9822B", k: "#1A1418" });
        break;
      case "rain":
        rect(ctx, "#C8CCD8", cx - 8, cy - 6, 16, 5); rect(ctx, "#C8CCD8", cx - 5, cy - 8, 8, 3);
        for (let i = 0; i < 4; i++) rect(ctx, "#6FA8DC", cx - 7 + i * 4, cy + 1 + (i % 2) * 2, 1, 3);
        break;
      case "chalk":                               // a chalkboard, running
        rect(ctx, "#8A5A34", cx - 10, cy - 7, 20, 13); rect(ctx, "#2E3A2E", cx - 9, cy - 6, 18, 11);
        for (let j = 0; j < 3; j++) { rect(ctx, "#E8E4D8", cx - 7, cy - 4 + j * 3, 12 - j * 2, 1); rect(ctx, "#8A9A8A", cx - 6 + j * 3, cy - 3 + j * 3, 1, 3); }
        break;
      case "cal":
        rect(ctx, "#F4F1EA", cx - 7, cy - 7, 14, 13); rect(ctx, "#C8252C", cx - 7, cy - 7, 14, 4);
        Kit.text(ctx, "THU", cx - 5, cy - 1, "#2A1C14");
        break;
      case "coin":
        rect(ctx, "#E8C24A", cx - 6, cy - 6, 12, 12); rect(ctx, "#E8C24A", cx - 7, cy - 4, 14, 8); rect(ctx, "#B8902A", cx - 6, cy + 5, 12, 1);
        Kit.text(ctx, "£12", cx - 6, cy - 2, "#5A3A10");
        break;
      case "kiln":
      case "kilnopen": {
        rect(ctx, "#8A4A3A", cx - 8, cy - 7, 16, 13); rect(ctx, "#6E3A2E", cx - 8, cy - 7, 16, 2);
        for (let j = 0; j < 3; j++) rect(ctx, "#6E3A2E", cx - 8, cy - 3 + j * 3, 16, 1);
        if (f.art === "kilnopen") { rect(ctx, "#FFB84A", cx - 4, cy - 3, 8, 7); rect(ctx, "#FFE6A0", cx - 2, cy - 1, 4, 4); }
        else rect(ctx, "#3A2A24", cx - 4, cy - 3, 8, 7);
        break;
      }
    }
  }
  function card(ctx, f, x, y, up, done, hot, P, t) {
    if (!up && !done) {
      rect(ctx, P.back, x, y, CW, CH); rect(ctx, P.back2, x + 2, y + 2, CW - 4, CH - 4);
      for (let j = 4; j < CH - 4; j += 4) for (let i = 4 + (j % 8 ? 2 : 0); i < CW - 4; i += 4) rect(ctx, P.back, x + i, y + j, 1, 1);
    } else {
      rect(ctx, done ? P.faceDone : P.face, x, y, CW, CH);
      art(ctx, f, x + (CW >> 1), y + 9);
      if (f.label) { const w = Kit.measure(f.label); Kit.text(ctx, f.label, x + ((CW - w) >> 1), y + CH - 6, P.ink); }
    }
    rect(ctx, P.edge, x, y, CW, 1); rect(ctx, P.edge, x, y + CH - 1, CW, 1); rect(ctx, P.edge, x, y, 1, CH); rect(ctx, P.edge, x + CW - 1, y, 1, CH);
    if (hot) { const c = Math.floor(t * 3) % 2 ? P.hot : P.hot2; rect(ctx, c, x - 2, y - 2, CW + 4, 1); rect(ctx, c, x - 2, y + CH + 1, CW + 4, 1); rect(ctx, c, x - 2, y - 2, 1, CH + 4); rect(ctx, c, x + CW + 1, y - 2, 1, CH + 4); }
  }

  /* ── play ──────────────────────────────────────────────── */
  function play(api) {
    const spec = api.spec, P = spec.felt;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--memory", ink: spec.ink, enterGo: false,
      onClose: () => { if (S && api.played) api.played(S.found ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const ctx = g.ctx, grants = spec.grants || [], has = (id) => api.won(id);
    S = { st: null, at: 0, wait: 0, t: 0, found: false, games: 0 };
    const face = (c) => { const p = spec.pairs[c.pair]; return c.side === "b" && p.b ? p.b : p.a; };
    const hud = () => g.hud("pairs " + S.st.cards.filter((c) => c.done).length / 2 + "/" + spec.pairs.length + " · found " + grants.filter(has).length + "/" + grants.length);
    function win(id, say) {
      if (!id) return;
      if (api.grant(id, say) === "new") { S.found = true; g.toast("+ fact card: " + (api.factLabel ? api.factLabel(id) : id)); }
      if (say) g.say(say);
    }
    function start() {
      S.games++;
      S.st = deal(spec.pairs, (api.seed || 1) + S.games * 131);
      S.at = 0; S.wait = 0;
      g.say(spec.intro);
      g.choices([]);
      g.focus();
      hud();
    }
    function turn(i) {
      if (S.wait > 0) { settle(S.st); S.wait = 0; }
      const r = flip(S.st, i);
      if (!r) return;
      if (typeof uiSound === "function") uiSound(r === "miss" ? "tuck" : "pick");
      if (r === "miss") S.wait = g.reduced ? 1.4 : 0.9;
      if (r === "match" || r === "done") {
        const p = spec.pairs[S.st.cards[i].pair];
        if (p.grant) win(p.grant, p.say);
        else if (p.say) g.say(p.say);
        if (p.set && spec.sets && spec.sets[p.set] && setDone(S.st, spec.pairs, p.set)) {
          const set = spec.sets[p.set];
          if (set.grant) win(set.grant, set.say); else if (set.say) g.say(set.say);
        }
      }
      if (r === "done") {
        g.say(spec.done + " " + S.st.moves + " turns.");
        g.choices([{ label: "Deal again", kind: "go", act: start }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      }
      hud();
    }
    const cellAt = (e) => {
      const a = g.at(e), cx = Math.floor((a.x - X0) / (CW + GX)), cy = Math.floor((a.y - Y0) / (CH + GY));
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
      const lx = a.x - X0 - cx * (CW + GX), ly = a.y - Y0 - cy * (CH + GY);
      return lx < CW && ly < CH ? cy * COLS + cx : -1;
    };
    g.cv.addEventListener("click", (e) => { const i = cellAt(e); if (i >= 0) { S.at = i; turn(i); } });
    g.cv.addEventListener("pointermove", (e) => { const i = cellAt(e); if (i >= 0) S.at = i; });
    g.onKey((key) => {
      const n = COLS * ROWS;
      if (key === "arrowleft" || key === "a") S.at = (S.at + n - 1) % n;
      else if (key === "arrowright" || key === "d") S.at = (S.at + 1) % n;
      else if (key === "arrowup" || key === "w") S.at = (S.at + n - COLS) % n;
      else if (key === "arrowdown" || key === "s") S.at = (S.at + COLS) % n;
      else if (key === " " || key === "enter") turn(S.at);
    });
    function draw() {
      rect(ctx, P.felt, 0, 0, W, H);
      for (let y = 1; y < H; y += 3) for (let x = (y % 2) * 2; x < W; x += 5) rect(ctx, P.felt2, x, y, 1, 1);
      S.st.cards.forEach((c, i) => {
        const x = X0 + (i % COLS) * (CW + GX), y = Y0 + Math.floor(i / COLS) * (CH + GY);
        card(ctx, face(c), x, y, c.up, c.done, i === S.at, P, S.t);
      });
    }
    start();
    g.state = S;                                       // for tests: the table as it lies
    g.loop((dt) => {
      S.t += dt;
      if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { settle(S.st); S.wait = 0; } }
      draw();
    });
    draw();
    return g;
  }

  const out = { play, core: { deal, flip, settle, setDone, rng, COLS, ROWS }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("memory", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustleMemory;
