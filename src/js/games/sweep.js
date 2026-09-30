"use strict";
/* ── Sweep: a forum full of spoilers, cleared by hand ─────
 * Minesweeper, on a fan forum: every cell is a post, some are spoilers, and
 * a number says how many of the posts around it are. Open every safe post
 * without being spoiled. The first post you open is always safe. Flag the
 * ones you are sure of. Being spoiled, and clearing the board, are both
 * research. Click to open, right-click (or F) to flag; arrows and Space too.
 *
 *   HustleSweep.play(api)   api (hustle.js): { key, spec, seed, won, grant, factLabel, played, onClose }
 *   HustleSweep.core        the pure part: laying the board, opening, flagging (tested)
 *
 * spec (games.js): { title, header, intro, ink, colours, grants, cols, rows, spoilers,
 *                    spoiled: { grant, say }, cleared: { grant, say } }
 */

const HustleSweep = (() => {
  const W = 160, H = 112, CELL = 13;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;

  /* ── the pure part ─────────────────────────────────────── */
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const around = (b, i) => {
    const x = i % b.cols, y = (i / b.cols) | 0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < b.cols && ny < b.rows) out.push(ny * b.cols + nx);
    }
    return out;
  };
  function board(cols, rows, spoilers) {
    const n = cols * rows;
    return { cols, rows, spoilers: Math.min(spoilers, n - 9), laid: false, bad: new Uint8Array(n), open: new Uint8Array(n), flag: new Uint8Array(n), near: new Uint8Array(n), lost: -1, won: false };
  }
  // Spoilers go down on the first open, never on it or next to it.
  function lay(b, first, seed) {
    const r = rng(seed), keep = new Set([first, ...around(b, first)]), n = b.cols * b.rows;
    let put = 0;
    while (put < b.spoilers) {
      const i = Math.floor(r() * n);
      if (b.bad[i] || keep.has(i)) continue;
      b.bad[i] = 1; put++;
    }
    for (let i = 0; i < n; i++) b.near[i] = around(b, i).reduce((s, j) => s + b.bad[j], 0);
    b.laid = true;
  }
  // Open a post: "spoiled", "open" (and everything round a zero with it), "won", or null.
  function open(b, i, seed) {
    if (b.lost >= 0 || b.won || b.open[i] || b.flag[i]) return null;
    if (!b.laid) lay(b, i, seed);
    if (b.bad[i]) { b.lost = i; b.open[i] = 1; return "spoiled"; }
    const todo = [i];
    while (todo.length) {
      const k = todo.pop();
      if (b.open[k]) continue;
      b.open[k] = 1; b.flag[k] = 0;
      if (b.near[k] === 0) for (const j of around(b, k)) if (!b.open[j] && !b.bad[j]) todo.push(j);
    }
    const safe = b.cols * b.rows - b.spoilers;
    let opened = 0;
    for (let k = 0; k < b.open.length; k++) if (b.open[k] && !b.bad[k]) opened++;
    if (opened === safe) { b.won = true; return "won"; }
    return "open";
  }
  // Opening a number whose flags are all placed opens the rest round it.
  function chord(b, i, seed) {
    if (!b.open[i] || b.bad[i] || !b.near[i]) return null;
    const ns = around(b, i);
    if (ns.reduce((s, j) => s + b.flag[j], 0) !== b.near[i]) return null;
    let res = null;
    for (const j of ns) if (!b.open[j] && !b.flag[j]) { const r = open(b, j, seed); if (r === "spoiled" || r === "won") return r; res = r || res; }
    return res;
  }
  function flagIt(b, i) { if (b.open[i] || b.lost >= 0 || b.won) return false; b.flag[i] ^= 1; return true; }

  /* ── drawing ───────────────────────────────────────────── */
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const NUM = ["", "#2F6FC0", "#3E8A3A", "#C8252C", "#6B3FA0", "#8A3A10", "#2E9A96", "#1A1A1A", "#8A8D91"];

  function play(api) {
    const spec = api.spec, C = spec.colours;
    const cols = spec.cols || 10, rows = spec.rows || 7;
    const X0 = (W - cols * CELL) >> 1, Y0 = 14;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--sweep", ink: spec.ink, enterGo: false,
      onClose: () => { if (S && api.played) api.played(S.found ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const ctx = g.ctx, grants = spec.grants || [], has = (id) => api.won(id);
    S = { b: null, at: 0, games: 0, found: false, t: 0 };
    const seedOf = () => (api.seed || 1) + S.games * 257;
    const flags = () => S.b.flag.reduce((s, f) => s + f, 0);
    const hud = () => g.hud("spoilers " + Math.max(0, S.b.spoilers - flags()) + " · found " + grants.filter(has).length + "/" + grants.length);
    function win(w) {
      if (!w) return;
      if (api.grant(w.grant, w.say) === "new") { S.found = true; g.toast("+ fact card: " + (api.factLabel ? api.factLabel(w.grant) : w.grant)); }
      g.say(w.say);
    }
    function start() {
      S.games++;
      S.b = board(cols, rows, spec.spoilers || 11);
      S.at = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
      g.say(spec.intro);
      g.choices([]);
      g.focus();
      hud();
    }
    function act(i, how) {
      const b = S.b;
      let r = null;
      if (how === "flag") { flagIt(b, i); if (typeof uiSound === "function") uiSound("pick"); hud(); return; }
      r = b.open[i] ? chord(b, i, seedOf()) : open(b, i, seedOf());
      if (!r) return;
      if (typeof uiSound === "function") uiSound(r === "spoiled" ? "tuck" : "pick");
      if (r === "spoiled") {
        win(spec.spoiled);
        g.choices([{ label: "Try again", kind: "go", act: start }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      } else if (r === "won") {
        win(spec.spoiled && !has(spec.spoiled.grant) ? { grant: spec.spoiled.grant, say: spec.spoiled.cleanSay || spec.spoiled.say } : null);
        win(spec.cleared);
        g.choices([{ label: "Another page", kind: "go", act: start }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      }
      hud();
    }
    const cellAt = (e) => {
      const a = g.at(e), cx = Math.floor((a.x - X0) / CELL), cy = Math.floor((a.y - Y0) / CELL);
      return cx >= 0 && cy >= 0 && cx < cols && cy < rows ? cy * cols + cx : -1;
    };
    g.cv.addEventListener("click", (e) => { const i = cellAt(e); if (i >= 0) { S.at = i; act(i, e.shiftKey ? "flag" : "open"); } });
    g.cv.addEventListener("contextmenu", (e) => { e.preventDefault(); const i = cellAt(e); if (i >= 0) { S.at = i; act(i, "flag"); } });
    g.cv.addEventListener("pointermove", (e) => { const i = cellAt(e); if (i >= 0) S.at = i; });
    g.onKey((key) => {
      const n = cols * rows;
      if (key === "arrowleft" || key === "a") S.at = (S.at + n - 1) % n;
      else if (key === "arrowright" || key === "d") S.at = (S.at + 1) % n;
      else if (key === "arrowup" || key === "w") S.at = (S.at + n - cols) % n;
      else if (key === "arrowdown" || key === "s") S.at = (S.at + cols) % n;
      else if (key === " " || key === "enter") act(S.at, "open");
      else if (key === "f" || key === "x") act(S.at, "flag");
    });
    function draw() {
      const b = S.b;
      rect(ctx, C.page, 0, 0, W, H);
      rect(ctx, C.head, 0, 0, W, 11);
      Kit.text(ctx, spec.header, 4, 3, C.headInk);
      for (let i = 0; i < cols * rows; i++) {
        const x = X0 + (i % cols) * CELL, y = Y0 + Math.floor(i / cols) * CELL;
        const over = b.lost >= 0 && b.bad[i], show = b.open[i] || over;
        if (!show) {
          rect(ctx, C.post, x, y, CELL - 1, CELL - 1); rect(ctx, C.post2, x, y, CELL - 1, 2);
          rect(ctx, C.line, x + 2, y + 5, 7, 1); rect(ctx, C.line, x + 2, y + 8, 5, 1);
          if (b.flag[i]) { rect(ctx, C.flag, x + 2, y + 2, 8, 8); Kit.text(ctx, "!", x + 5, y + 4, "#FFFFFF"); }
        } else if (b.bad[i]) {
          rect(ctx, i === b.lost ? C.spoilHit : C.spoil, x, y, CELL - 1, CELL - 1);
          Kit.text(ctx, "12", x + 2, y + 4, "#FFFFFF");
        } else {
          rect(ctx, C.open, x, y, CELL - 1, CELL - 1);
          if (b.near[i]) Kit.text(ctx, String(b.near[i]), x + 5, y + 4, NUM[b.near[i]]);
        }
        if (i === S.at && b.lost < 0 && !b.won) {
          const c = Math.floor(S.t * 3) % 2 ? C.hot : C.headInk;
          rect(ctx, c, x - 1, y - 1, CELL + 1, 1); rect(ctx, c, x - 1, y + CELL - 1, CELL + 1, 1); rect(ctx, c, x - 1, y - 1, 1, CELL + 1); rect(ctx, c, x + CELL - 1, y - 1, 1, CELL + 1);
        }
      }
      if (b.won || b.lost >= 0) {
        const t = b.won ? "ALL CLEAR" : "SPOILED!", w = Kit.measure(t, 2);
        rect(ctx, "rgba(0,0,0,.6)", 0, 44, W, 22);
        Kit.text(ctx, t, (W - w) / 2, 49, b.won ? "#7CE07A" : "#FF6A5A", 2);
      }
    }
    start();
    g.state = S;                                       // for tests: the board as it lies
    g.loop((dt) => { S.t += dt; draw(); });
    draw();
    return g;
  }

  const out = { play, core: { board, lay, open, chord, flagIt, around, rng }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("sweep", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustleSweep;
