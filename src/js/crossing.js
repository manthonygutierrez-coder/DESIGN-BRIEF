"use strict";
/* ── the start screen, the crossing to the desk, the screen saver ──
 * Pixel Crossing boots in a cascade (cascade.js has its colours, the logo
 * and where things sit): candy apple reds and berries fall and fill the
 * screen round a dark disc, and on it the logo draws itself in, thin and
 * smooth against the cells, while a bar loads. Then a wave of cobalt, blues
 * and greens washes down, the logo glides up, smaller, and two cards come
 * up: Studio and Hustle. Picking one closes the disc over the logo and
 * drains the cascade away, and you are at that desk.
 *
 * Back from the desk (Esc, or Start Screen on the Start menu) the cascade
 * falls over it again, the disc opens on the logo, and the cards offer the
 * desk you came from or the other one. Switching is a log off: the two never
 * share a page. Left alone at the desk a while, the cascade comes back as a
 * screen saver, the logo drifting on it, until you move.
 *
 * The cascade draws on #fx, inside #pc, so it is on the monitor across the
 * room and fills the window up close. Over it (#boot): the logo, the name in
 * Press Start 2P on its band of cells, and the cards, in frames cut from the
 * cells. It starts when #pc can first be seen: after the room's fade-in, or
 * when the monitor is switched on.
 */

const Boot = (() => {
  const C = Cascade;
  const cv = $("fx"), ctx = cv.getContext("2d", { alpha: true }), el = $("boot");
  const html = document.documentElement;
  const TIME = { fill: 1500, logo: 2600, recolor: 1400, out: 1150, in: 950, drift: 9000 };
  const FADE = { fill: 260, logo: 1400, recolor: 1, out: 320, in: 260, drift: 9000 };   // with less motion: fades, no falling
  const dur = (ph) => (reduced ? FADE : TIME)[ph] || 0;
  const GLIDE = 560, IRIS = 380, DRAW = 1150;        // ms: the logo moving, its disc opening or closing, drawing itself in
  const IDLE = 90000;                                // untouched at the desk this long: the screen saver
  const K = { VOID: 2, BAND: 4, BAR: 6, FRAME: 7, INSIDE: 8 };   // what a cell is, when it is not cascade

  const pal = (p) => Object.assign({}, p, {
    rgb: p.cells.map(C.rgb), hiRGB: C.rgb(p.hi), inkRGB: C.rgb(p.ink),
    frontRGB: C.mix(C.rgb(p.hi), C.rgb(p.cells[0]), 0.45),           // a falling front: lit, not white
    lowRGB: C.mix(C.rgb(p.ink), C.rgb(p.cells[5]), 0.3),             // an empty bar, a card's inside
    edgeRGB: C.mix(C.rgb(p.cells[4]), C.rgb(p.ink), 0.35),           // a card's frame, resting
  });
  const BERRY = pal(C.BERRY), TIDE = pal(C.TIDE);
  const LOGO = C.rgb(C.LOGO_INK), HOT = C.mix(LOGO, C.rgb(C.TIDE.ink), 0.45);   // the chosen card's lights, lit and between

  let cols = 0, rows = 0, cell = C.CELL, img = null, grid = null;
  let colFill = null, colRain = null, colRe = null, colOut = null, colScroll = null;
  const S = {
    phase: "off", t0: 0, frame: 0,
    now: BERRY, next: null,                    // the cascade's colours, and the ones washing in
    mode: "boot", L: null,                     // what is laid out, and where
    at: null, to: null,                        // the name's band, where it is and where it is going: { x, y } in cells
    lg: null, glide: null, shut: false,        // the logo's disc { x, y, d } in cells (fractions too), and its move
    named: false, marked: false,
    cardsAt: 0, hot: 0, going: -1,
    auto: null,                                // a slot to go straight to (after a switch, or ?slot=)
    saver: false, vel: null, last: 0,          // the screen saver, and how its logo drifts
  };
  let raf = 0, stepAt = 0;

  /* ── the grid ──────────────────────────────────────────── */
  // Cells are whole screen pixels, and the canvas runs a little past the edge
  // rather than stretching them. The screen is the computer's (#pc).
  function size() {
    const s = PC.size(), dpr = window.devicePixelRatio || 1;
    cell = Math.max(1, Math.round(C.CELL * dpr)) / dpr;
    const c = Math.max(8, Math.ceil(Math.max(1, s.w) / cell)), r = Math.max(8, Math.ceil(Math.max(1, s.h) / cell));
    const changed = c !== cols || r !== rows;
    cols = c; rows = r;
    cv.width = cols; cv.height = rows;
    cv.style.width = cols * cell + "px"; cv.style.height = rows * cell + "px";
    ctx.imageSmoothingEnabled = false;
    img = ctx.createImageData(cols, rows);
    el.style.setProperty("--cell", cell + "px");
    if (changed || !colFill) {
      const n = cols * rows;
      grid = { code: new Uint8Array(n), idx: new Int16Array(n), card: new Int8Array(n) };
      colFill = C.columns(cols, 11, "centre"); colRain = C.columns(cols, 53, "rain"); colRe = C.columns(cols, 23, "rain");
      colOut = C.columns(cols, 37, "sweep"); colScroll = C.columns(cols, 41, "rain");
    }
    if (S.L) { lay(S.mode, true); placeCards(); }
  }

  /* ── what sits on the cascade ──────────────────────────────
   * Per cell: the disc under the logo, the band under the name (both in the
   * cascade's ink), the loading bar, a card's frame and its inside. The disc
   * is the logo's circle, fractions and all, so as it glides or opens its
   * edge moves a cell at a time.                                          */
  function lay(mode, snap) {
    S.mode = mode;
    S.L = C.layout(cols, rows, mode, cell);
    const L = S.L;
    S.to = { x: L.band.x, y: L.band.y };
    if (snap || !S.at) S.at = { x: S.to.x, y: S.to.y };
    const disc = discOf(L) || (S.lg && shut(S.lg));
    if (disc) moveLogo(disc, snap ? 0 : GLIDE);
    placeName();
    deco();
  }
  const discOf = (L) => L.logo ? { x: L.logo.x, y: L.logo.y, d: L.logo.w } : null;
  const shut = (g) => ({ x: g.x + g.d / 2, y: g.y + g.d / 2, d: 0 });

  function deco() {
    if (!grid || !S.L) return;
    const { code, idx, card } = grid, L = S.L, g = S.lg;
    code.fill(0); card.fill(-1);
    const put = (x, y, k) => { if (x >= 0 && y >= 0 && x < cols && y < rows) code[y * cols + x] = k; };
    if (g && g.d > 0.3) {
      const r = g.d / 2, cx = g.x + r, cy = g.y + r;
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(rows - 1, Math.ceil(cy + r)); y++)
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(cols - 1, Math.ceil(cx + r)); x++)
          if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) code[y * cols + x] = K.VOID;
    }
    if (S.named && L.band) for (let y = 0; y < L.band.h; y++) for (let x = 0; x < L.band.w; x++) put(S.at.x + x, S.at.y + y, K.BAND);
    if (L.bar && S.phase !== "out") for (let x = 0; x < L.bar.w; x++) for (let y = 0; y < L.bar.h; y++) {
      const cx = L.bar.x + x, cy = L.bar.y + y;
      if (cx < cols && cy < rows) { code[cy * cols + cx] = K.BAR; idx[cy * cols + cx] = x; }
    }
    if (L.cards && S.phase === "choose") L.cards.forEach((r, ci) => {
      let p = 0;
      const edge = (x, y) => { if (x < 0 || y < 0 || x >= cols || y >= rows) return; const i = y * cols + x; code[i] = K.FRAME; card[i] = ci; idx[i] = p++; };
      for (let x = r.x; x < r.x + r.w; x++) edge(x, r.y);
      for (let y = r.y + 1; y < r.y + r.h; y++) edge(r.x + r.w - 1, y);
      for (let x = r.x + r.w - 2; x >= r.x; x--) edge(x, r.y + r.h - 1);
      for (let y = r.y + r.h - 2; y > r.y; y--) edge(r.x, y);
      for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        if (x < cols && y < rows) { code[y * cols + x] = K.INSIDE; card[y * cols + x] = ci; }
      }
      r.perim = p;
    });
  }

  /* ── drawing ───────────────────────────────────────────── */
  function draw(now, p) {
    const d = img.data, ph = S.phase, tsec = now / 1000, L = S.L, { code, idx, card } = grid;
    const filling = ph === "fill" || ph === "in", draining = ph === "out", washing = ph === "recolor";
    const fall = S.saver ? colRain : colFill;
    const bar = L && L.bar ? (ph === "logo" ? p : ph === "fill" ? 0 : 1) : 0;
    const tick = Math.floor(now / 90), cardP = S.cardsAt ? Math.min(1, (now - S.cardsAt) / 320) : 0;
    S.frame++;
    for (let c = 0; c < cols; c++) {
      const f = filling && !reduced ? C.frontRow(fall, c, p, rows) : Infinity;
      const dr = draining && !reduced ? C.frontRow(colOut, c, p, rows) : -Infinity;
      const re = washing && !reduced ? C.frontRow(colRe, c, p, rows) : -1;
      const sc = reduced ? 0 : Math.floor(tsec * colScroll.vs[c]);
      for (let y = 0; y < rows; y++) {
        const i = y * cols + c, o = i * 4;
        if (y > f || y < dr) { d[o + 3] = 0; continue; }
        const P = y < re ? S.next : S.now, kind = code[i];
        let col = null, k = 1;
        if (kind === K.VOID || kind === K.BAND) col = P.inkRGB;
        else if (kind === K.BAR) col = idx[i] < bar * L.bar.w ? LOGO : P.lowRGB;
        else if (kind === K.FRAME) {
          const ci = card[i];
          if (idx[i] < cardP * (L.cards[ci].perim || 1)) {
            const lit = ci === S.going || (ci === S.hot && (reduced || ((idx[i] - tick) % 8 + 8) % 8 < 4));
            col = S.going >= 0 && ci !== S.going ? P.lowRGB : lit ? LOGO : ci === S.hot ? HOT : P.edgeRGB;
          }
        } else if (kind === K.INSIDE && cardP >= 1) col = P.lowRGB;
        if (!col) {
          // The cascade: each column scrolls down at its own speed. A glint now
          // and then; the falling fronts lit, but not white.
          const h = C.hash(c, y - sc);
          col = (h >>> 11) % 173 === 0 ? P.hiRGB : P.rgb[C.pick(P, h)];
          k = 0.82 + ((h >>> 20) & 7) / 7 * 0.18;
          if (f - y < 1.4 || (re > y && re - y < 1.4) || y - dr < 1.4) { col = P.frontRGB; k = 1; }
          else if (f - y < 4) k = Math.min(1.1, k * 1.12);
          if (!reduced && ((h ^ Math.imul(S.frame, 2654435761)) >>> 11) % 43 === 0) k *= 1.16;
        }
        d[o] = Math.min(255, col[0] * k); d[o + 1] = Math.min(255, col[1] * k); d[o + 2] = Math.min(255, col[2] * k); d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ── the logo ──────────────────────────────────────────── */
  // Its disc goes to `to` ({ x, y, d } in cells) over ms, or at once.
  function moveLogo(to, ms) {
    if (!S.lg || !ms || reduced) { S.lg = { x: to.x, y: to.y, d: to.d }; S.glide = null; placeLogo(); return; }
    S.glide = { from: { x: S.lg.x, y: S.lg.y, d: S.lg.d }, to: { x: to.x, y: to.y, d: to.d }, t0: performance.now(), ms };
  }
  function stepLogo(now) {
    const g = S.glide;
    if (!g) return false;
    const t = Math.min(1, (now - g.t0) / g.ms), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    S.lg = { x: g.from.x + (g.to.x - g.from.x) * e, y: g.from.y + (g.to.y - g.from.y) * e, d: g.from.d + (g.to.d - g.from.d) * e };
    if (t >= 1) S.glide = null;
    return true;
  }
  function placeLogo() {
    const g = S.lg;
    logoEl.style.visibility = g && g.d > 0.3 ? "" : "hidden";
    if (g) Object.assign(logoEl.style, { left: g.x * cell + "px", top: g.y * cell + "px", width: g.d * cell + "px", height: g.d * cell + "px" });
  }
  // The strokes draw themselves in (a dash, in world.css), or are simply there.
  let drawnT = 0;
  function marked(on, at) {
    clearTimeout(drawnT);
    S.marked = on;
    el.classList.toggle("is-marked", on);
    el.classList.toggle("is-drawn", on && (at || reduced));
    if (on && !at && !reduced) drawnT = setTimeout(() => el.classList.add("is-drawn"), DRAW + 200);
  }
  function named(on) {
    if (S.named === !!on) return;
    S.named = !!on;
    el.classList.toggle("is-named", S.named);
    deco();
  }

  /* ── the phases ──────────────────────────────────────────── */
  function go(phase) {
    S.phase = phase;
    S.t0 = performance.now();
    const shown = phase !== "desk" && phase !== "off";
    el.hidden = !shown;
    el.inert = phase !== "choose";
    el.style.setProperty("--ink", S.now.ink);
    if (phase === "choose") { S.cardsAt = S.t0; S.going = -1; showCards(); }
    else if (phase !== "out") S.cardsAt = 0;
    if (phase === "out" || !shown) named(false);
    if (!shown) marked(false);
    if (phase === "logo" || phase === "choose" || phase === "recolor" || phase === "drift") named(true);
    deco();
    status();
    kick();
  }
  function frame(now) {
    const ph = S.phase, T = dur(ph), p = T ? Math.min(1, (now - S.t0) / T) : 1;
    let moved = stepLogo(now);
    if (S.saver && (ph === "drift" || ph === "recolor")) moved = drift(now) || moved;
    // The name moves a cell at a time to where the layout wants it.
    if (S.to && now - stepAt > 28) {
      stepAt = now;
      const a = S.at, t = S.to;
      if (a.x !== t.x || a.y !== t.y) { S.at = { x: a.x + Math.sign(t.x - a.x), y: a.y + Math.sign(t.y - a.y) }; placeName(); moved = true; }
    }
    if (moved) { placeLogo(); deco(); }
    if (reduced) cv.style.opacity = ph === "fill" || ph === "in" ? String(p) : ph === "out" ? String(1 - p) : "1";
    draw(now, p);
    // The logo draws itself in on its disc once the cascade is falling round it,
    // and the name comes up once the cascade is past it.
    if (ph === "fill" && p > 0.3 && !S.marked) marked(true);
    if ((ph === "fill" || ph === "in") && p > 0.62) named(true);
    if (ph === "in" && p > 0.35 && S.shut) { S.shut = false; const disc = discOf(S.L); if (disc) moveLogo(disc, IRIS); }
    if (ph === "recolor" && p > 0.35 && S.mode !== "choose" && !S.saver) lay("choose");
    if (ph === "recolor" && p > 0.5) el.style.setProperty("--ink", S.next.ink);
    if (p < 1) return;
    if (ph === "fill") go(S.saver ? "drift" : "logo");
    else if (ph === "logo") { if (S.auto) { const slot = S.auto; S.auto = null; leave(slot); } else wash(TIDE); }
    else if (ph === "recolor") {
      S.now = S.next; S.next = null;
      if (S.saver) go("drift");
      else { if (S.mode !== "choose") lay("choose"); go("choose"); }
    }
    else if (ph === "drift") { if (reduced) go("drift"); else wash(S.now === BERRY ? TIDE : BERRY); }
    else if (ph === "in") go("choose");
    else if (ph === "out") landed();
  }
  const running = () => S.phase !== "off" && S.phase !== "desk";
  function loop(now) { raf = 0; if (!running()) return; frame(now); raf = requestAnimationFrame(loop); }
  function kick() { if (!raf && running()) raf = requestAnimationFrame(loop); }

  function wash(to) { S.next = to; go("recolor"); }

  // From the top: the monitor has just come on.
  function start() {
    size();
    S.now = BERRY; S.next = null; S.hot = 0; S.going = -1; S.saver = false; S.shut = false;
    hideCards(); named(false); marked(false);
    cv.style.opacity = "1"; cv.hidden = false;
    lay("boot", true);
    S.auto = (typeof Session !== "undefined" && (Session.nextSlot() || Session.fromQuery())) || null;
    go("fill");
  }
  // The monitor went dark: stop, and start over when it comes back.
  function reset() {
    S.phase = atScreen ? "desk" : "off";
    S.saver = false;
    hideCards(); named(false); marked(false);
    el.hidden = true;
    ctx.clearRect(0, 0, cols, rows);
    if (atScreen) cv.style.opacity = "0";
  }

  /* ── crossing ──────────────────────────────────────────── */
  // To the desk: the disc closes over the logo, and the cascade drains away
  // with the desk underneath.
  function leave(slot) {
    if (atScreen || busy) return;
    busy = true;
    if (slot && typeof Session !== "undefined") Session.choose(slot);
    const i = SLOTS.indexOf(slot);
    if (i >= 0 && S.phase === "choose") { S.going = i; cardsEl.querySelectorAll(".boot__card").forEach((b, k) => b.classList.toggle("is-go", k === i)); }
    setTimeout(() => {
      hideCards();
      if (S.phase === "off" || !S.L) { size(); lay("boot", true); }
      atScreen = true;
      if (typeof Music !== "undefined") Music.screen(true);
      sideWorld.inert = true;
      sideScreen.inert = false;
      track.style.transform = "translate3d(-100cqw,0,0)";
      cv.hidden = false;
      cv.style.opacity = "1";
      if (S.lg) moveLogo(shut(S.lg), IRIS);
      go("out");
      desk.arrive();
    }, S.going >= 0 && !reduced ? 220 : 0);
  }
  function landed() {
    const saver = S.saver;
    S.phase = "desk";
    S.saver = false;
    el.hidden = true;
    marked(false);
    cv.style.opacity = "0";
    ctx.clearRect(0, 0, cols, rows);
    if (saver) { poke(); return; }
    busy = false;
    poke();
    const f = desk.focusTarget();
    if (f) f.focus({ preventScroll: true });
  }
  // Back from the desk: the cascade falls over it, the disc opens on the
  // logo, and the cards come up.
  function back() {
    if (!atScreen || busy) return;
    busy = true;
    clearTimeout(idleT);
    size();
    S.now = TIDE; S.next = null; S.going = -1; S.saver = false;
    S.hot = Math.max(0, SLOTS.indexOf(Session.slot() || Session.remembered()));
    lay("choose", true);
    if (S.lg) { S.lg = shut(S.lg); S.shut = true; placeLogo(); }
    marked(true, true);
    cv.style.opacity = "1"; cv.hidden = false;
    go("in");
    const done = () => {
      if (S.phase !== "choose") { setTimeout(done, 60); return; }
      atScreen = false;
      if (typeof Music !== "undefined") Music.screen(false);
      sideWorld.inert = false;
      sideScreen.inert = true;
      track.style.transform = "translate3d(0,0,0)";
      busy = false;
      focus();
    };
    setTimeout(done, dur("in"));
  }

  /* ── the screen saver ───────────────────────────────────────
   * Untouched at the desk for IDLE, the cascade rains down over it and the
   * logo drifts on its disc, the name under it, the colours washing between
   * the two cascades. Not while a call or a game is on, or a dialog is up.
   * Across the room it simply runs on the monitor; at the computer, the first
   * key or click only wakes it, and does nothing else.                     */
  let idleT = 0;
  const blocked = () => !!document.querySelector(".w98--call:not(.min), .w98--game:not(.min)") ||
    (typeof Session !== "undefined" && Session.dialogOpen && Session.dialogOpen());
  function poke() {
    clearTimeout(idleT);
    if (atScreen && !busy) idleT = setTimeout(sleep, IDLE);
  }
  function sleep() {
    if (!atScreen || busy || S.phase !== "desk" || !seen()) return;
    if (blocked()) { idleT = setTimeout(sleep, IDLE / 3); return; }
    size();
    S.saver = true;
    S.now = BERRY; S.next = null; S.going = -1; S.shut = false;
    hideCards(); named(false); marked(false);
    cv.style.opacity = "1"; cv.hidden = false;
    lay("saver", true);
    const a = Math.PI * (0.18 + 0.14 * Math.random()) + (Math.random() < 0.5 ? 0 : Math.PI / 2);
    S.vel = { x: Math.cos(a) * 1.7, y: Math.sin(a) * 1.7 };    // cells a second
    S.last = 0;
    go("fill");
  }
  function wake() {
    if (!S.saver || S.phase === "out") return;
    if (S.lg) moveLogo(shut(S.lg), IRIS);
    go("out");
  }
  // The disc and the name, as one, bounce slowly round the screen.
  function drift(now) {
    const L = S.L, g = S.lg;
    if (reduced || !L || !L.logo || !g || S.glide) return false;
    const dt = S.last ? Math.min(0.1, (now - S.last) / 1000) : 0;
    S.last = now;
    const gap = L.band.y - (L.logo.y + L.logo.h), w = Math.max(g.d, L.band.w), h = g.d + gap + L.band.h;
    let x = g.x - (w - g.d) / 2 + S.vel.x * dt, y = g.y + S.vel.y * dt;
    if (x < 1) { x = 1; S.vel.x = Math.abs(S.vel.x); } else if (x + w > cols - 1) { x = cols - 1 - w; S.vel.x = -Math.abs(S.vel.x); }
    if (y < 1) { y = 1; S.vel.y = Math.abs(S.vel.y); } else if (y + h > rows - 1) { y = rows - 1 - h; S.vel.y = -Math.abs(S.vel.y); }
    S.lg = { x: x + (w - g.d) / 2, y, d: g.d };
    S.to = { x: Math.round(x + (w - L.band.w) / 2), y: Math.round(y + g.d + gap) };
    S.at = { x: S.to.x, y: S.to.y };
    placeName();
    return true;
  }
  // Only what happens at the computer counts. A key or a click that wakes the
  // saver is eaten, the click that follows the press too.
  const atPC = () => !PC.el.inert;
  let eat = 0;
  for (const type of ["pointerdown", "pointermove", "keydown", "wheel"]) {
    const stops = type === "pointerdown" || type === "keydown";
    addEventListener(type, (e) => {
      if (!atPC() || (type !== "keydown" && !PC.el.contains(e.target))) return;
      if (S.saver) {
        if (type === "pointermove" && Math.abs(e.movementX) + Math.abs(e.movementY) < 3) return;
        if (stops) { e.preventDefault(); e.stopImmediatePropagation(); }
        if (type === "pointerdown") eat = performance.now() + 800;
        wake();
        return;
      }
      if (atScreen) poke();
    }, { capture: true, passive: !stops });
  }
  addEventListener("click", (e) => {
    if (eat && performance.now() < eat) { e.preventDefault(); e.stopImmediatePropagation(); }
    eat = 0;
  }, true);

  /* ── the name and the cards ─────────────────────────────── */
  const SLOTS = ["studio", "hustle"];
  const arrow = (d) => '<svg class="boot__arrow" viewBox="0 0 7 5" aria-hidden="true"><path d="' + d + '"/></svg>';
  el.innerHTML = '<h1 class="boot__sr">Pixel Crossing</h1>' +
    '<div class="boot__logo" aria-hidden="true">' + C.logoSVG() + "</div>" +
    '<p class="boot__name" aria-hidden="true">' + C.NAME + "</p>" +
    '<div class="boot__cards" role="group" aria-label="Choose how to play"></div>' +
    '<p class="boot__hint" aria-hidden="true" hidden><kbd>' + arrow("M2 0h1v5H2zM1 1h1v3H1zM0 2h7v1H0z") + "</kbd><kbd>" +
      arrow("M4 0h1v5H4zM5 1h1v3H5zM0 2h7v1H0z") + "</kbd> choose &middot; <kbd>Enter</kbd> start</p>" +
    '<p class="boot__sr" aria-live="polite" data-status></p>';
  const logoEl = el.querySelector(".boot__logo"), nameEl = el.querySelector(".boot__name");
  const cardsEl = el.querySelector(".boot__cards"), hintEl = el.querySelector(".boot__hint");
  // The name sits in its band of cells, at a size Press Start 2P draws crisply.
  function placeName() {
    const w = S.L && S.L.word;
    if (!w || !S.at) { nameEl.hidden = true; return; }
    nameEl.hidden = false;
    Object.assign(nameEl.style, { left: (S.at.x + 1) * cell + "px", top: (S.at.y + 1) * cell + "px", width: w.w * cell + "px", height: w.h * cell + "px", fontSize: w.px + "px" });
  }

  function showCards() {
    const L = S.L;
    if (!L || !L.cards) return;
    const started = Session.slot(), names = Session.LABELS;
    const line = (s) => !started ? names[s].line
      : s === started ? "Pick up where you left off."
      : "Logs off " + cap(names[started].name) + " first. Everything is saved.";
    cardsEl.innerHTML = SLOTS.map((s, i) => '<button class="boot__card" type="button" data-slot="' + s + '" data-i="' + i + '">' +
      "<b>" + (started ? (s === started ? "Back to " : "Switch to ") + cap(names[s].name) : cap(names[s].name)) + "</b><span>" + line(s) + "</span></button>").join("");
    hintEl.hidden = false;
    placeCards();
    cardsEl.querySelectorAll(".boot__card").forEach((b, i) => b.classList.toggle("is-hot", i === S.hot));
    requestAnimationFrame(() => el.classList.add("is-in"));
    if (!PC.el.inert) focus();
  }
  const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  function hideCards() { el.classList.remove("is-in"); cardsEl.innerHTML = ""; hintEl.hidden = true; }
  // Each card over its frame, inside the frame's cells; the hint under them.
  function placeCards() {
    const L = S.L;
    if (!L || !L.cards) return;
    cardsEl.querySelectorAll(".boot__card").forEach((b, i) => {
      const r = L.cards[i];
      Object.assign(b.style, { left: (r.x + 1) * cell + "px", top: (r.y + 1) * cell + "px", width: (r.w - 2) * cell + "px", height: (r.h - 2) * cell + "px" });
    });
    const last = L.cards[1];
    hintEl.style.top = (last.y + last.h + 1) * cell + "px";
    if (last.y + last.h + 3 > rows) hintEl.hidden = true;
  }
  function focus() {
    if (S.phase !== "choose" || el.hidden || el.inert) return;
    const b = cardsEl.querySelectorAll(".boot__card")[S.hot];
    if (b) b.focus({ preventScroll: true });
  }
  function setHot(i) {
    S.hot = (i + SLOTS.length) % SLOTS.length;
    cardsEl.querySelectorAll(".boot__card").forEach((b, k) => b.classList.toggle("is-hot", k === S.hot));
  }
  function choose(slot) {
    if (busy || S.phase !== "choose") return;
    const started = Session.slot();
    if (started && slot !== started) {                 // a different desk: log off, and come back to that one
      S.going = SLOTS.indexOf(slot);
      cardsEl.querySelectorAll(".boot__card").forEach((b, k) => b.classList.toggle("is-go", k === S.going));
      busy = true;
      status("Logging off " + cap(Session.LABELS[started].name) + "…");
      setTimeout(() => Session.switchTo(slot), reduced ? 0 : 260);
      return;
    }
    leave(slot);
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest(".boot__card");
    if (b) choose(b.dataset.slot);
  });
  el.addEventListener("focusin", (e) => { const b = e.target.closest(".boot__card"); if (b) setHot(Number(b.dataset.i)); });
  el.addEventListener("pointerover", (e) => { const b = e.target.closest(".boot__card"); if (b && !busy) setHot(Number(b.dataset.i)); });
  // Arrow keys between the cards; 1 and 2 pick. Only while the cards are up
  // and you are at the computer (across the room, #pc is inert and deaf).
  document.addEventListener("keydown", (e) => {
    if (atScreen || busy || S.phase !== "choose" || el.hidden || PC.el.inert) return;
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowRight" || k === "ArrowDown") {
      e.preventDefault();
      setHot(S.hot + (k === "ArrowLeft" || k === "ArrowUp" ? -1 : 1));
      focus();
    } else if (k === "1" || k === "2") { e.preventDefault(); choose(SLOTS[Number(k) - 1]); }
    else if ((k === "Enter" || k === " ") && !(e.target.closest && e.target.closest(".boot__card"))) { e.preventDefault(); choose(SLOTS[S.hot]); }
  });

  function status(text) {
    const s = el.querySelector("[data-status]");
    const t = text != null ? text : S.saver ? ""
      : S.phase === "choose" ? "Choose how to play: Studio or Hustle."
      : S.phase === "fill" || S.phase === "logo" ? "Pixel Crossing is starting." : "";
    if (s && s.textContent !== t) s.textContent = t;
  }

  /* ── when to start ─────────────────────────────────────── */
  const seen = () => !html.classList.contains("room-boot") && !PC.el.classList.contains("pc--off");
  function watch() {
    if (seen()) {
      if (S.phase === "off" && !atScreen) start();
      if (S.saver && atPC()) wake();                   // sat back down at the computer
    } else if (running() && (!atScreen || S.saver)) reset();
  }
  new MutationObserver(watch).observe(html, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(watch).observe(PC.el, { attributes: true, attributeFilter: ["class", "inert"] });
  addEventListener("resize", () => { if (running()) { size(); if (!raf) draw(performance.now(), 1); } });
  watch();

  return {
    leave, back, focus,
    phase: () => S.phase,
    // Nothing moving: Esc on the start screen may stand you up from the desk.
    calm: () => S.phase === "choose" || S.phase === "logo",
    // The screen saver now, without the wait (the tests use it), and whether it is on.
    saver: () => { clearTimeout(idleT); sleep(); },
    saving: () => S.saver,
  };
})();

// The old crossing's names, kept: cross(1) to the desk, cross(-1) back.
function cross(dir) {
  if (dir === 1) Boot.leave();
  else if (dir === -1) Boot.back();
}
