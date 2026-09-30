"use strict";
/* ── Picross: a picture from the numbers ──────────────────
 * A nonogram. The numbers by each row and column say how many filled
 * squares run together there, in order; fill the grid to match and the
 * picture is there. Every puzzle has one answer, and needs no guessing.
 * Solving one is research. Click to fill, right-click (or X) to mark a
 * square empty, drag to do a run; arrows and Space too.
 *
 *   HustlePicross.play(api)   api (hustle.js): { key, spec, seed, won, grant, factLabel, played, onClose }
 *   HustlePicross.core        the pure part: clues, checking, and a line solver (tested)
 *
 * spec (games.js): { title, name, intro, ink, grants, puzzles: [{ name, rows: ["#..#", …], colour, grant?, say? }] }
 */

const HustlePicross = (() => {
  const W = 160, H = 112, CELL = 8;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;

  /* ── the pure part ─────────────────────────────────────── */
  const runs = (line) => { const out = []; let n = 0; for (const c of line) { if (c) n++; else if (n) { out.push(n); n = 0; } } if (n) out.push(n); return out; };
  function clues(rows) {
    const g = rows.map((r) => [...r].map((c) => c === "#"));
    const cols = g[0].map((_, x) => g.map((r) => r[x]));
    return { rows: g.map(runs), cols: cols.map(runs), w: g[0].length, h: g.length };
  }
  const solved = (rows, filled) => rows.every((r, y) => [...r].every((c, x) => (c === "#") === !!filled[y * r.length + x]));
  // Every way to lay the runs along a line of length n, as 0/1 arrays.
  function layouts(runsIn, n) {
    const out = [];
    const rec = (i, at, line) => {
      if (i === runsIn.length) { out.push(line.concat(Array(n - line.length).fill(0))); return; }
      const rest = runsIn.slice(i + 1).reduce((s, r) => s + r + 1, 0);
      for (let s = at; s + runsIn[i] + rest <= n; s++) {
        const next = line.concat(Array(s - line.length).fill(0), Array(runsIn[i]).fill(1));
        rec(i + 1, s + runsIn[i] + 1, i + 1 < runsIn.length ? next.concat([0]) : next);
      }
    };
    if (!runsIn.length) return [Array(n).fill(0)];
    rec(0, 0, []);
    return out.map((l) => l.slice(0, n));
  }
  // Solve by lines alone: fill what every layout agrees on, over and over.
  // Returns the grid (1 filled, 0 empty, -1 unknown) and whether it is done.
  function solve(cl) {
    const g = Array.from({ length: cl.h }, () => Array(cl.w).fill(-1));
    const fits = (l, known) => l.every((v, i) => known[i] === -1 || known[i] === v);
    let changed = true;
    while (changed) {
      changed = false;
      for (let y = 0; y < cl.h; y++) {
        const ok = layouts(cl.rows[y], cl.w).filter((l) => fits(l, g[y]));
        if (!ok.length) return { g, done: false, broken: true };
        for (let x = 0; x < cl.w; x++) if (g[y][x] === -1 && ok.every((l) => l[x] === ok[0][x])) { g[y][x] = ok[0][x]; changed = true; }
      }
      for (let x = 0; x < cl.w; x++) {
        const col = g.map((r) => r[x]);
        const ok = layouts(cl.cols[x], cl.h).filter((l) => fits(l, col));
        if (!ok.length) return { g, done: false, broken: true };
        for (let y = 0; y < cl.h; y++) if (g[y][x] === -1 && ok.every((l) => l[y] === ok[0][y])) { g[y][x] = ok[0][y]; changed = true; }
      }
    }
    return { g, done: g.every((r) => r.every((v) => v !== -1)), broken: false };
  }

  /* ── play ──────────────────────────────────────────────── */
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  function play(api) {
    const spec = api.spec;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--picross", ink: spec.ink, enterGo: false,
      onClose: () => { if (S && api.played) api.played(S.found ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const ctx = g.ctx, grants = spec.grants || [], has = (id) => api.won(id), C = spec.colours;
    S = { i: 0, cl: null, fill: null, mark: null, at: 0, drag: null, done: false, found: false, t: 0, X0: 0, Y0: 0 };
    const hud = () => g.hud((spec.puzzles[S.i].name || "") + " · found " + grants.filter(has).length + "/" + grants.length);
    function start(i) {
      S.i = i % spec.puzzles.length;
      const p = spec.puzzles[S.i];
      S.cl = clues(p.rows);
      S.fill = new Uint8Array(S.cl.w * S.cl.h); S.mark = new Uint8Array(S.cl.w * S.cl.h);
      S.done = false; S.at = 0;
      const clueW = Math.max(...S.cl.rows.map((r) => Kit.measure(r.join(" ")))) + 4, clueH = Math.max(...S.cl.cols.map((c) => c.length)) * 6 + 2;
      S.X0 = Math.max(clueW, Math.round((W - 44 - S.cl.w * CELL) / 2 + clueW / 2)); S.Y0 = Math.max(clueH, H - 6 - S.cl.h * CELL);
      g.say(spec.intro + " This one's " + (p.stall || p.name) + ".");
      g.choices([]);
      g.focus();
      hud();
    }
    function set(i, how) {
      if (S.done || i < 0) return;
      if (how === "fill") { S.fill[i] = S.fill[i] ? 0 : 1; S.mark[i] = 0; }
      else if (how === "mark") { S.mark[i] = S.mark[i] ? 0 : 1; S.fill[i] = 0; }
      else if (how === "paint") { S.fill[i] = 1; S.mark[i] = 0; }
      else if (how === "unpaint") S.fill[i] = 0;
      else if (how === "cross") { S.mark[i] = 1; S.fill[i] = 0; }
      const p = spec.puzzles[S.i];
      if (solved(p.rows, S.fill)) {
        S.done = true;
        if (typeof uiSound === "function") uiSound("loaded");
        if (p.grant && api.grant(p.grant, p.say) === "new") { S.found = true; g.toast("+ fact card: " + (api.factLabel ? api.factLabel(p.grant) : p.grant)); }
        hud();
        g.say(p.say || "That's the picture.");
        g.choices([{ label: "Next picture", kind: "go", act: () => start(S.i + 1) }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      }
    }
    const cellAt = (e) => {
      const a = g.at(e), cx = Math.floor((a.x - S.X0) / CELL), cy = Math.floor((a.y - S.Y0) / CELL);
      return cx >= 0 && cy >= 0 && cx < S.cl.w && cy < S.cl.h ? cy * S.cl.w + cx : -1;
    };
    g.cv.addEventListener("contextmenu", (e) => e.preventDefault());
    g.cv.addEventListener("pointerdown", (e) => {
      const i = cellAt(e);
      if (i < 0) return;
      S.at = i;
      const mark = e.button === 2 || e.shiftKey;
      // A drag does what the first square did, to every square it crosses.
      S.drag = mark ? (S.mark[i] ? "unmark" : "cross") : (S.fill[i] ? "unpaint" : "paint");
      set(i, S.drag === "unmark" ? "mark" : S.drag);
      g.cv.setPointerCapture && g.cv.setPointerCapture(e.pointerId);
    });
    g.cv.addEventListener("pointermove", (e) => {
      const i = cellAt(e);
      if (i < 0) return;
      S.at = i;
      if (S.drag && e.buttons) set(i, S.drag === "unmark" ? (S.mark[i] ? "mark" : null) : S.drag);
    });
    g.cv.addEventListener("pointerup", () => { S.drag = null; });
    g.onKey((key) => {
      const w = S.cl.w, n = w * S.cl.h;
      if (key === "arrowleft" || key === "a") S.at = (S.at + n - 1) % n;
      else if (key === "arrowright" || key === "d") S.at = (S.at + 1) % n;
      else if (key === "arrowup" || key === "w") S.at = (S.at + n - w) % n;
      else if (key === "arrowdown" || key === "s") S.at = (S.at + w) % n;
      else if (key === " " || key === "enter") set(S.at, "fill");
      else if (key === "x" || key === "f") set(S.at, "mark");
    });
    function draw() {
      const cl = S.cl, p = spec.puzzles[S.i];
      rect(ctx, C.bg, 0, 0, W, H);
      const X0 = S.X0, Y0 = S.Y0, gw = cl.w * CELL, gh = cl.h * CELL;
      // Clues: along the left, and over the top.
      cl.rows.forEach((r, y) => {
        const t = (r.length ? r : [0]).join(" "), done = runs([...Array(cl.w)].map((_, x) => S.fill[y * cl.w + x])).join(",") === r.join(",");
        Kit.text(ctx, t, X0 - 3 - Kit.measure(t), Y0 + y * CELL + 2, done ? C.dim : C.ink);
      });
      cl.cols.forEach((c, x) => {
        const col = c.length ? c : [0], done = runs([...Array(cl.h)].map((_, y) => S.fill[y * cl.w + x])).join(",") === c.join(",");
        col.forEach((v, k) => Kit.text(ctx, String(v), X0 + x * CELL + 2 - (v > 9 ? 2 : 0), Y0 - 2 - (col.length - k) * 6, done ? C.dim : C.ink));
      });
      rect(ctx, C.grid, X0 - 1, Y0 - 1, gw + 1, gh + 1);
      for (let y = 0; y < cl.h; y++) for (let x = 0; x < cl.w; x++) {
        const i = y * cl.w + x, px = X0 + x * CELL, py = Y0 + y * CELL;
        rect(ctx, S.fill[i] ? (S.done ? p.colour || C.fill : C.fill) : C.cell, px, py, CELL - 1, CELL - 1);
        if (S.mark[i]) { rect(ctx, C.mark, px + 2, py + 2, 1, 1); rect(ctx, C.mark, px + 4, py + 4, 1, 1); rect(ctx, C.mark, px + 4, py + 2, 1, 1); rect(ctx, C.mark, px + 2, py + 4, 1, 1); rect(ctx, C.mark, px + 3, py + 3, 1, 1); }
        if ((x + 1) % 5 === 0 && x + 1 < cl.w) rect(ctx, C.grid5, px + CELL - 1, py, 1, CELL);
        if ((y + 1) % 5 === 0 && y + 1 < cl.h) rect(ctx, C.grid5, px, py + CELL - 1, CELL, 1);
      }
      if (!S.done) {
        const px = X0 + (S.at % cl.w) * CELL, py = Y0 + Math.floor(S.at / cl.w) * CELL, c = Math.floor(S.t * 3) % 2 ? C.hot : C.ink;
        rect(ctx, c, px - 1, py - 1, CELL + 1, 1); rect(ctx, c, px - 1, py + CELL - 1, CELL + 1, 1); rect(ctx, c, px - 1, py - 1, 1, CELL + 1); rect(ctx, c, px + CELL - 1, py - 1, 1, CELL + 1);
      }
      // The picture so far, at its real size, as the market app would show it.
      const vx = W - 34, vy = 8;
      rect(ctx, C.panel, vx - 4, vy - 4, 32, 44);
      rect(ctx, "#FFFFFF", vx, vy, cl.w * 2 + 4, cl.h * 2 + 4);
      for (let y = 0; y < cl.h; y++) for (let x = 0; x < cl.w; x++) if (S.fill[y * cl.w + x]) rect(ctx, S.done ? p.colour || C.fill : C.fill, vx + 2 + x * 2, vy + 2 + y * 2, 2, 2);
      const nm = (p.name || "").toUpperCase();
      Kit.text(ctx, nm, vx + 12 - Kit.measure(nm) / 2, vy + cl.h * 2 + 8, C.ink);
    }
    start(0);
    g.state = S;                                       // for tests: the grid as it stands
    g.loop((dt) => { S.t += dt; draw(); });
    draw();
    return g;
  }

  const out = { play, core: { runs, clues, solved, layouts, solve }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("picross", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustlePicross;
