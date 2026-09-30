"use strict";
/* ── Rhythm: press on the beat ────────────────────────────
 * Notes slide in from the right to a line; press Space (or click) as each
 * one reaches it. A song has sections, and a section played well enough
 * can be research: the fact goes on a card as if clipped, and the talk strip
 * says what it was. With less motion asked for, the windows to hit are
 * half as wide again.
 *
 *   HustleRhythm.play(api)   api (hustle.js): { key, spec, seed, won, grant, factLabel, played, onClose }
 *   HustleRhythm.core        the pure part: the chart and the judging (tested)
 *
 * spec (games.js): { title, name, intro, done, ink, stage, bpm, grants,
 *                    sections: [{ bars: ["x.x.x..x", …], grant?, say? }] }
 * A bar is eight steps of an eighth note: x a note, . a rest.
 */

const HustleRhythm = (() => {
  const W = 160, H = 112, LINE = 30, LEAD = 1.6, PERFECT = 0.07, GOOD = 0.14, PASS = 0.6;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;

  /* ── the pure part ─────────────────────────────────────── */
  // The notes: when each is due (seconds from the start), and its section.
  function chart(sections, bpm, lead = 2) {
    const step = 60 / bpm / 2, notes = [];
    let t = lead;
    sections.forEach((sec, si) => {
      for (const bar of sec.bars) {
        for (let k = 0; k < 8; k++) { if (bar[k] === "x") notes.push({ t: t + k * step, sec: si, hit: null }); }
        t += 8 * step;
      }
    });
    return { notes, end: t + 1.5 };
  }
  const windows = (still) => (still ? { perfect: PERFECT * 1.5, good: GOOD * 1.5 } : { perfect: PERFECT, good: GOOD });
  // A press at time `now`: the nearest note not yet judged, if one is close
  // enough. Returns "perfect", "good", or null (a stray press costs nothing).
  function press(c, now, still) {
    const w = windows(still);
    let best = null, d = Infinity;
    for (const n of c.notes) {
      if (n.hit) continue;
      const dd = Math.abs(n.t - now);
      if (dd < d) { d = dd; best = n; }
      if (n.t > now + w.good) break;
    }
    if (!best || d > w.good) return null;
    best.hit = d <= w.perfect ? "perfect" : "good";
    return best.hit;
  }
  // Notes gone past the line unplayed are missed. Returns how many just were.
  function sweep(c, now, still) {
    const w = windows(still);
    let n = 0;
    for (const x of c.notes) { if (!x.hit && now - x.t > w.good) { x.hit = "miss"; n++; } }
    return n;
  }
  // How a section went: the share of its notes hit (a perfect counts whole, a good most of one).
  function grade(c, si) {
    const ns = c.notes.filter((n) => n.sec === si);
    if (!ns.length) return 1;
    return ns.reduce((s, n) => s + (n.hit === "perfect" ? 1 : n.hit === "good" ? 0.8 : 0), 0) / ns.length;
  }
  const sectionEnd = (c, si) => Math.max(...c.notes.filter((n) => n.sec === si).map((n) => n.t));

  /* ── drawing ───────────────────────────────────────────── */
  const rect = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  function stage(ctx, name, S, t, still) {
    if (name === "lounge") {                       // the Starlite Lanes lounge, Friday night
      rect(ctx, "#1A0C24", 0, 0, W, H);
      for (let x = 0; x < W; x += 10) rect(ctx, x % 20 ? "#5A1030" : "#6E1438", x, 0, 10, 70);
      rect(ctx, "#E0B83A", 0, 0, W, 3);
      for (let x = 4; x < W; x += 8) rect(ctx, (Math.floor(t * 4) + x) % 3 === 0 && !still ? "#FFE58A" : "#8A6A22", x, 1, 2, 1);
      rect(ctx, "#2A1A10", 0, 70, W, 42); rect(ctx, "#4A2A18", 0, 70, W, 2);
      rect(ctx, "rgba(255,240,200,.12)", 70, 0, 40, 70);
      rect(ctx, "#C8252C", 128, 12, 22, 12); Kit.text(ctx, "21+", 133, 16, "#FFFFFF");
      const look = { skin: "#E0A87C", hair: "#8E8E93", top: "#2A1240", legs: "#1A1418", cardigan: "#E0B83A" };   // black velvet, gold trim
      Kit.person(ctx, 86, 52, look, "down", 0);
      if (S.flourish > 0) {                         // a fan of cards on a good hit
        for (let i = 0; i < 5; i++) rect(ctx, i % 2 ? "#FFF8E8" : "#C8252C", 80 + i * 4, 44 - Math.abs(2 - i), 3, 5);
      }
      if (S.doves) for (let i = 0; i < 4; i++) { const k = (S.doves + i * 0.4) % 2; rect(ctx, "#FFFFFF", 88 + Math.round(Math.sin(k * 3 + i) * 12), 40 - Math.round(k * 24), 3, 2); }
    } else {                                      // Tori's kitchen table: cups on a belt, a stamp
      rect(ctx, "#F6EAD2", 0, 0, W, H);
      for (let y = 0; y < 50; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) rect(ctx, "#EBD9B8", x, y, 7, 7);
      rect(ctx, "#5A5A64", 0, 62, W, 10); for (let x = -(Math.floor(t * 20) % 8); x < W; x += 8) rect(ctx, "#6E6E78", x, 64, 4, 6);
      for (const c of S.cups || []) {
        const cx = Math.round(c.x);
        if (cx < -12 || cx > W) continue;
        rect(ctx, "#F4F1EA", cx - 5, 50, 10, 12); rect(ctx, "#E8E4D8", cx - 6, 48, 12, 3);
        if (c.stuck) { rect(ctx, "#D9482B", cx - 4, 47, 8, 3); rect(ctx, "#F6EAD2", cx - 2, 48, 4, 1); }
      }
      const down = S.flourish > 0 ? 8 : 0;
      rect(ctx, "#8A8D91", LINE - 1, 20, 3, 18 + down); rect(ctx, "#D9482B", LINE - 6, 38 + down, 13, 4);
    }
  }

  function play(api) {
    const spec = api.spec;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--rhythm", ink: spec.ink, enterGo: true,
      onClose: () => { if (S && api.played) api.played(S.found ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const ctx = g.ctx, still = g.reduced, grants = spec.grants || [], has = (id) => api.won(id);
    S = { phase: "title", c: null, now: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0, flourish: 0, judged: "", jt: 0, sec: 0, found: false, cups: [], doves: 0, pressed: false };
    const hud = () => g.hud(S.phase === "play" ? "combo " + S.combo + " · found " + grants.filter(has).length + "/" + grants.length : "found " + grants.filter(has).length + "/" + grants.length);
    function start() {
      S.c = chart(spec.sections, spec.bpm || 100);
      S.now = 0; S.combo = 0; S.best = 0; S.perfect = S.good = S.miss = 0; S.sec = 0; S.doves = 0;
      S.cups = spec.stage === "stickers" ? S.c.notes.map((n) => ({ t: n.t, x: 0, stuck: false })) : [];
      S.phase = "play";
      g.say(spec.go || "Here we go.");
      g.choices([]);
      g.focus();
      hud();
    }
    function hit() {
      if (S.phase !== "play") return;
      const r = press(S.c, S.now, still);
      if (!r) return;
      S.combo++; S.best = Math.max(S.best, S.combo);
      if (r === "perfect") S.perfect++; else S.good++;
      S.judged = r; S.jt = 0.35; S.flourish = 0.12;
      if (spec.stage === "stickers") { const cup = S.cups.find((c) => !c.stuck && Math.abs(c.t - S.now) < 0.3); if (cup) cup.stuck = true; }
      if (typeof uiSound === "function") uiSound("pick");
      hud();
    }
    g.onKey((key) => { if (key === " " || key === "enter") hit(); });
    g.cv.addEventListener("pointerdown", () => hit());
    function update(dt) {
      if (S.phase !== "play") return;
      S.now += dt;
      S.flourish = Math.max(0, S.flourish - dt); S.jt = Math.max(0, S.jt - dt);
      const missed = sweep(S.c, S.now, still);
      if (missed) { S.combo = 0; S.miss += missed; S.judged = "miss"; S.jt = 0.35; hud(); }
      for (const c of S.cups) c.x = LINE + (c.t - S.now) * ((W - LINE) / LEAD);
      // A section just finished: was it good enough to learn from?
      while (S.sec < spec.sections.length && S.now > sectionEnd(S.c, S.sec) + windows(still).good) {
        const sec = spec.sections[S.sec], ok = grade(S.c, S.sec) >= PASS;
        if (sec.grant && ok) {
          if (api.grant(sec.grant, sec.say) === "new") { S.found = true; g.toast("+ fact card: " + (api.factLabel ? api.factLabel(sec.grant) : sec.grant)); }
          g.say(sec.say);
        } else if (sec.grant && !ok && !has(sec.grant)) g.say(spec.miss || "Keep the beat, and there's more to learn.");
        S.sec++;
      }
      if (S.sec >= spec.sections.length && spec.stage === "lounge") S.doves += dt;
      if (S.now >= S.c.end) finish();
    }
    function finish() {
      S.phase = "over";
      const total = S.c.notes.length, score = Math.round(((S.perfect + S.good * 0.8) / total) * 100);
      const left = grants.filter((x) => !has(x)).length;
      g.say("Played " + score + "%: " + S.perfect + " perfect, " + S.good + " good, best combo " + S.best + ". " + (left ? (spec.more || "There's more in it, if you keep the beat.") : spec.done));
      g.choices([{ label: "Again", kind: "go", act: start }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      hud();
    }
    function title() {
      S.phase = "title";
      g.say(spec.intro);
      g.choices([{ label: "Start", kind: "go", act: start }, { label: "Close", kind: "quiet", act: () => g.close() }]);
      hud();
    }
    function draw(t) {
      stage(ctx, spec.stage, S, t, still);
      // The lane, the line, the notes.
      rect(ctx, "rgba(0,0,0,.55)", 0, 82, W, 18);
      rect(ctx, spec.lineColour || "#FFD86B", LINE - 1, 80, 3, 22);
      if (S.c && S.phase === "play") {
        for (const n of S.c.notes) {
          if (n.hit && n.hit !== "miss") continue;
          const x = LINE + (n.t - S.now) * ((W - LINE) / LEAD);
          if (x < -6 || x > W + 6) continue;
          rect(ctx, n.hit === "miss" ? "#6A5A6A" : spec.noteColour || "#FFFFFF", x - 2, 87, 5, 8);
          rect(ctx, n.hit === "miss" ? "#4A3A4A" : spec.noteShade || "#C8B8E8", x - 2, 93, 5, 2);
        }
      }
      if (S.jt > 0 && S.judged) { const t2 = S.judged.toUpperCase(), w = Kit.measure(t2); Kit.text(ctx, t2, LINE + 8, 76, S.judged === "perfect" ? "#7CE07A" : S.judged === "good" ? "#FFD86B" : "#FF6A5A"); }
      if (S.phase === "title") { const t2 = spec.name || "READY?", s = Kit.measure(t2, 3) > W - 8 ? 2 : 3, w = Kit.measure(t2, s); rect(ctx, "rgba(0,0,0,.5)", 0, 30, W, 30); Kit.text(ctx, t2, (W - w) / 2, 38, "#FFFFFF", s); }
      if (S.phase === "over") { const t2 = "THAT'S THE SHOW", w = Kit.measure(t2, 2); rect(ctx, "rgba(0,0,0,.5)", 0, 30, W, 26); Kit.text(ctx, t2, (W - w) / 2, 38, "#FFD86B", 2); }
    }
    title();
    let clock = 0;
    g.loop((dt) => { clock += dt; update(dt); draw(clock); });
    draw(0);
    return g;
  }

  const out = { play, core: { chart, press, sweep, grade, windows, sectionEnd, PASS, PERFECT, GOOD }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("rhythm", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustleRhythm;
