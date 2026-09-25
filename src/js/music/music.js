"use strict";
/* ── music: the director ──────────────────────────────────
 * Plays js/music/theme.js on the instruments in js/music/synth.js. Nothing
 * is recorded: every note is synthesized as it is booked, which keeps the
 * page inside its security policy (no media, no fetches) and lets the hub
 * come out a little different each time round, so it can play all
 * afternoon without wearing thin.
 *
 * Timing belongs to the audio clock, never the frame clock. A small scheduler
 * books each bar just before it starts, against ctx.currentTime; every change
 * of arrangement is booked for the next bar line, so clicking between windows
 * cannot make the music lurch, and the audio thread does the fading
 * (setTargetAtTime), told once per change rather than stepped every frame.
 *
 * The game only sets parameters and fires sounds by name:
 *   Music.set({ zone, fullness, pressure, call, far })
 *   Music.sfx("clip-hit" | "clip-dupe" | "clip-miss" | "chime" | "deliver", opts)
 * Which window is in front comes from the window manager ("wm:focus"), so
 * no app has to know the music exists.
 */
const Music = (() => {
  const T = typeof MusicTheme !== "undefined" ? MusicTheme : null;
  const S = typeof MusicSynth !== "undefined" ? MusicSynth : null;
  const PREFS_KEY = "pixel-crossing:sound";
  const AHEAD = 0.5, EVERY_MS = 50, SFX_VOICES = 6;

  const params = { zone: "hub", fullness: 0, pressure: 0, call: false, far: false };
  let prefs = typeof window !== "undefined" ? readPrefs() : { volume: 0.6, muted: false, music: true };
  let ctx = null, bus = null, voices = null;
  let playing = false, wanted = false, away = false, timer = 0, stopTimer = 0;
  let t0 = 0, nextBar = 0, booked = -1;
  let mixNow = null, mixNext = null, mixFrom = Infinity;   // the mix, and the bar the next one starts at
  let liveLast = new Set();
  let sfxEnds = [], combo = 0, lastHit = -Infinity;
  let trayBtn = null, panel = null;

  function readPrefs() {
    const d = { volume: 0.6, muted: false, music: true };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); } catch { return d; }
  }
  function writePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private window */ }
  }
  const loudness = () => (prefs.muted ? 0 : prefs.volume * prefs.volume);   // the slider feels even

  // The desk from synth.js, then fade (starting and stopping) and your volume.
  function make() {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC || !T || !S) return false;
    ctx = new AC();
    const volume = ctx.createGain(), fade = ctx.createGain();
    volume.gain.value = loudness(); volume.connect(ctx.destination);
    fade.gain.value = 0; fade.connect(volume);
    bus = Object.assign(S.desk(ctx, T, fade), { volume, fade });
    bus.music.gain.value = prefs.music ? 1 : 0;
    bus.meter = ctx.createAnalyser(); bus.meter.fftSize = 1024;
    bus.glue.connect(bus.meter);                     // reads before the volume, so it works muted
    voices = S.voices(ctx);
    return true;
  }

  /* ── the scheduler ─────────────────────────────────────── */
  const barStart = (bar) => t0 + bar * T.BAR_SEC;
  const barAt = (time) => Math.floor((time - t0) / T.BAR_SEC + 1e-9);

  // A part just turned down plays one more bar, into its fade.
  function playBar(bar) {
    if (bar >= mixFrom) { mixNow = mixNext; mixNext = null; mixFrom = Infinity; }
    const live = S.live(T, mixNow);
    S.book(T, voices, bus, new Set([...live, ...liveLast]), bar, barStart(bar), ctx.currentTime);
    liveLast = live;
    booked = bar;
  }

  function book() {
    if (!playing) return;
    while (barStart(nextBar) < ctx.currentTime + AHEAD) playBar(nextBar++);
  }

  // A new mix, from the first bar not yet booked: gains move on that bar line.
  function applyMix() {
    if (!ctx || !playing) return;
    const m = T.mix(params), bar = Math.max(barAt(ctx.currentTime) + 1, booked + 1), at = barStart(bar);
    for (const [tier, g] of Object.entries(bus.tiers)) { g.gain.cancelScheduledValues(at); g.gain.setTargetAtTime(m.tiers[tier] || 0, at, S.FADE.tier); }
    for (const [key, g] of Object.entries(bus.parts)) { g.gain.cancelScheduledValues(at); g.gain.setTargetAtTime(m.parts[key] || 0, at, S.FADE.part); }
    mixNext = m; mixFrom = bar;
  }

  // A call is not on the beat: it muffles the music as soon as they pick up.
  // So does getting up from the desk: the music is still playing, but in the
  // computer's little speakers across the room.
  function applyCall() {
    if (!ctx) return;
    const now = ctx.currentTime, call = !!params.call, far = !!params.far;
    const hz = Math.min(call ? S.FADE.muffleHz : 20000, far ? S.FADE.farHz : 20000);
    bus.muffle.frequency.cancelScheduledValues(now);
    bus.muffle.frequency.setTargetAtTime(hz, now, S.FADE.call);
    bus.duck.gain.cancelScheduledValues(now);
    bus.duck.gain.setTargetAtTime((call ? S.FADE.duck : 1) * (far ? S.FADE.far : 1), now, S.FADE.call);
  }

  function begin() {
    playing = true;
    t0 = ctx.currentTime + 0.15; nextBar = 0; booked = -1;
    mixNow = T.mix(params); mixNext = null; mixFrom = Infinity; liveLast = new Set();
    const now = ctx.currentTime;
    for (const [tier, g] of Object.entries(bus.tiers)) { g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(mixNow.tiers[tier] || 0, now); }
    for (const [key, g] of Object.entries(bus.parts)) { g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(mixNow.parts[key] || 0, now); }
    bus.fade.gain.cancelScheduledValues(0);
    bus.fade.gain.setValueAtTime(0, now);
    applyCall();
    clearInterval(timer);
    timer = setInterval(book, EVERY_MS);
    book();
  }

  // Browsers only let sound start after someone has clicked or typed.
  function resume() {
    if (ctx.state === "running" || document.hidden) return;
    ctx.resume().catch(() => {});
    if (ctx.state !== "running") {
      const kick = () => { if (wanted && !document.hidden) ctx.resume().catch(() => {}); };
      addEventListener("pointerdown", kick, { once: true, capture: true });
      addEventListener("keydown", kick, { once: true, capture: true });
    }
  }

  function start() {
    wanted = true;
    if (!ctx && !make()) return;
    clearTimeout(stopTimer);
    if (!playing) begin();
    resume();
    bus.fade.gain.cancelScheduledValues(ctx.currentTime);
    bus.fade.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
  }

  function stop() {
    wanted = false;
    if (!ctx || !playing) return;
    bus.fade.gain.cancelScheduledValues(ctx.currentTime);
    bus.fade.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => {
      if (wanted) return;
      clearInterval(timer);
      playing = false;
      ctx.suspend().catch(() => {});
    }, 1600);
  }

  // Off to the world side and back: the desk's music goes with the desk.
  function screen(on) {
    if (!on) { if (wanted) { away = true; stop(); } }
    else if (away) { away = false; start(); }
  }

  function set(p) {
    let mix = false;
    for (const k of ["zone", "fullness", "pressure"]) {
      if (!(k in p)) continue;
      const v = k === "pressure" ? Math.round((Number(p[k]) || 0) * 20) / 20 : p[k];   // steps of 5%, not every tick
      if (v !== params[k]) { params[k] = v; mix = true; }
    }
    if (mix) applyMix();
    let muffle = false;
    for (const k of ["call", "far"]) if (k in p && !!p[k] !== params[k]) { params[k] = !!p[k]; muffle = true; }
    if (muffle) applyCall();
  }

  /* ── sound effects ───────────────────────────────────────
   * On the grid, in the key of the bar they land in, never quite the same
   * twice, and never more than a handful at once. */
  function sfx(name, o = {}) {
    if (!ctx || !playing || ctx.state !== "running") return;
    const now = ctx.currentTime;
    sfxEnds = sfxEnds.filter((e) => e > now);
    if (sfxEnds.length >= SFX_VOICES) return;
    if (name === "clip-hit") { combo = now - lastHit < 6 ? combo + 1 : 0; lastHit = now; o = Object.assign({ combo }, o); }
    const at = T.sfxTime(now, t0), bar = barAt(at);
    let end = at;
    for (const [dt, len, m, v, patch] of T.sfxNotes(name, bar, o)) {
      const when = at + dt * T.STEP_SEC, dur = len * T.STEP_SEC;
      voices[patch](m, when, dur, v * (0.9 + Math.random() * 0.2), bus.sfx);
      end = Math.max(end, when + dur + 0.3);
    }
    sfxEnds.push(end);
  }

  /* ── the tray: a speaker, and the Win98 volume box ───────── */
  function paintTray() {
    if (!trayBtn) return;
    const off = prefs.muted || prefs.volume === 0;
    trayBtn.innerHTML = "<i>" + (typeof iconSVG === "function" ? iconSVG(off ? "soundoff" : "sound", 16) : "") + "</i>";
    trayBtn.title = off ? "Sound is off" : "Volume";
  }

  function applyPrefs() {
    writePrefs();
    paintTray();
    if (!ctx) return;
    const now = ctx.currentTime;
    bus.volume.gain.setTargetAtTime(loudness(), now, 0.05);
    bus.music.gain.setTargetAtTime(prefs.music ? 1 : 0, now, 0.2);
  }

  function togglePanel(open) {
    if (!trayBtn) return;
    open = open === undefined ? !panel : open;
    if (!open) { if (panel) { panel.remove(); panel = null; trayBtn.classList.remove("on"); } return; }
    if (panel) return;
    panel = document.createElement("div");
    panel.className = "vol";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Volume");
    panel.innerHTML =
      '<b class="vol__t">Volume</b>' +
      '<input class="vol__r" type="range" min="0" max="100" step="1" aria-label="Volume" value="' + Math.round(prefs.volume * 100) + '">' +
      '<label class="vol__c"><input type="checkbox" data-v="music"' + (prefs.music ? " checked" : "") + "> Music</label>" +
      '<label class="vol__c"><input type="checkbox" data-v="mute"' + (prefs.muted ? " checked" : "") + "> Mute</label>";
    panel.querySelector(".vol__r").addEventListener("input", (e) => { prefs.volume = Number(e.target.value) / 100; applyPrefs(); });
    panel.addEventListener("change", (e) => {
      const v = e.target.dataset && e.target.dataset.v;
      if (v === "music") prefs.music = e.target.checked;
      if (v === "mute") prefs.muted = e.target.checked;
      applyPrefs();
    });
    panel.addEventListener("keydown", (e) => { if (e.key === "Escape") { togglePanel(false); trayBtn.focus(); } });
    (document.getElementById("sideScreen") || document.body).appendChild(panel);
    trayBtn.classList.add("on");
    panel.querySelector(".vol__r").focus();
  }

  function mountTray() {
    const tray = document.querySelector(".tray");
    if (!tray || trayBtn) return;
    trayBtn = document.createElement("button");
    trayBtn.className = "tray__vol";
    trayBtn.type = "button";
    trayBtn.setAttribute("aria-label", "Volume");
    trayBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });
    const clock = document.getElementById("clock");
    tray.insertBefore(trayBtn, clock && clock.parentElement === tray ? clock : null);
    paintTray();
    document.addEventListener("pointerdown", (e) => {
      if (panel && !panel.contains(e.target) && !trayBtn.contains(e.target)) togglePanel(false);
    }, true);
  }

  /* ── listening to the desktop ──────────────────────────── */
  if (typeof document !== "undefined") {
    document.addEventListener("wm:focus", (e) => {
      const zone = T && T.zoneOf(e.detail && e.detail.className);
      if (zone) set({ zone });
    });
    // Hidden, the game stops its clocks; the music waits with it.
    document.addEventListener("visibilitychange", () => {
      if (!ctx || !playing) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (wanted) ctx.resume().catch(() => {});
    });
  }

  // For checking by eye or by script: where everything is, and how loud.
  function state() {
    return {
      playing, audio: ctx ? ctx.state : "none", zone: params.zone, fullness: params.fullness,
      pressure: params.pressure, call: params.call, far: params.far, bar: ctx && playing ? barAt(ctx.currentTime) : null,
      live: [...liveLast], prefs: Object.assign({}, prefs),
      tiers: bus ? Object.fromEntries(Object.entries(bus.tiers).map(([k, g]) => [k, +g.gain.value.toFixed(3)])) : null,
      muffle: bus ? Math.round(bus.muffle.frequency.value) : null,
    };
  }
  function level() {
    if (!bus) return 0;
    const a = new Float32Array(bus.meter.fftSize);
    bus.meter.getFloatTimeDomainData(a);
    let sum = 0;
    for (const x of a) sum += x * x;
    return Math.sqrt(sum / a.length);
  }
  // The mix as a stream, before your volume and mute: for recording what
  // the desk plays (tools/music films a gig with it).
  function tap() {
    if (!ctx && !make()) return null;
    const dest = ctx.createMediaStreamDestination();
    bus.fade.connect(dest);
    ctx.resume().catch(() => {});                    // a recording needs the clock running, silence and all
    return dest.stream;
  }

  return { start, stop, screen, set, sfx, mountTray, state, level, tap };
})();

if (typeof module !== "undefined") module.exports = Music;
