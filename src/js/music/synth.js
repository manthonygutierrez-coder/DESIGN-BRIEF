"use strict";
/* ── the instruments ──────────────────────────────────────
 * Every sound the music makes, built from oscillators, noise and filters on
 * whatever audio context it is handed: the live one on the desk (music.js),
 * or an offline one that renders the soundtrack to files (tools/music). One
 * set of instruments and one mixing desk, so a rendered track is exactly
 * what the game plays.
 *
 *   voices(ctx)         the patches, bound to ctx: (note, time, secs, vel, out)
 *   desk(ctx, T, out)   part → arrangement → music → muffle → duck → glue → out,
 *                       with effects straight into the glue
 *   live(T, mix)        which parts a mix can be heard in
 *   book(...)           every note of one bar, at its time and swing
 */
const MusicSynth = (() => {
  // How fast things move: arrangements and parts fade over a bar line, a
  // call closes in at once. Shared so the game and the files agree.
  // far: heard from across the room (see src/room), through the desk's small speakers.
  const FADE = { tier: 0.3, part: 0.45, call: 0.2, muffleHz: 900, duck: 0.35, farHz: 1500, far: 0.5 };

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Each patch gets the helpers for its context first, then the note.
  const PATCHES = {
    ep(h, m, t, d, v, out) {                          // electric piano, with a little tape wobble
      const f = hz(m) * (1 + (Math.random() - 0.5) * 0.004);
      h.tone("sine", f, t, d, v * 0.8, { a: 0.006, d: 0.6, s: 0.4, r: 0.35 }, out);
      h.tone("sine", f * 2, t, Math.min(d, 0.2), v * 0.2, { a: 0.003, d: 0.15, s: 0.05, r: 0.1 }, out);
    },
    sub: (h, m, t, d, v, out) => h.tone("sine", hz(m), t, d, v, { a: 0.012, d: 0.2, s: 0.8, r: 0.08 }, out),
    pluck: (h, m, t, d, v, out) => h.tone("square", hz(m), t, d, v * 0.4, { a: 0.003, d: 0.2, s: 0.5, r: 0.08 }, out, [2600, 650, 0.16]),
    mallet(h, m, t, d, v, out) {
      h.tone("triangle", hz(m), t, 0.25, v, { a: 0.002, d: 0.3, s: 0, r: 0.05 }, out);
      h.tone("sine", hz(m) * 4, t, 0.05, v * 0.12, { a: 0.001, d: 0.05, s: 0, r: 0.02 }, out);
    },
    stab: (h, m, t, d, v, out) => h.tone("sawtooth", hz(m), t, 0.1, v * 0.3, { a: 0.004, d: 0.08, s: 0.3, r: 0.06 }, out, [1800, 600, 0.1]),
    tri: (h, m, t, d, v, out) => h.tone("triangle", hz(m), t, d, v, { a: 0.002, d: 0.05, s: 0.9, r: 0.03 }, out),
    square: (h, m, t, d, v, out) => h.tone(h.pulse(0.5), hz(m), t, d, v * 0.35, { a: 0.003, d: 0.1, s: 0.7, r: 0.05 }, out),
    pulse12: (h, m, t, d, v, out) => h.tone(h.pulse(0.125), hz(m), t, d, v * 0.4, { a: 0.002, d: 0.06, s: 0.5, r: 0.03 }, out),
    pulse25: (h, m, t, d, v, out) => h.tone(h.pulse(0.25), hz(m), t, d, v * 0.4, { a: 0.003, d: 0.08, s: 0.6, r: 0.05 }, out),
    pad(h, m, t, d, v, out) {
      for (const cents of [-7, 7]) h.tone("sawtooth", hz(m) * Math.pow(2, cents / 1200), t, d, v * 0.14, { a: 0.4, d: 0.4, s: 0.8, r: 0.8 }, out, [800, 800, 0]);
    },
    kick: (h, m, t, d, v, out) => h.sweep("sine", 150, 42, t, 0.11, v, 0.3, out),
    kickSoft: (h, m, t, d, v, out) => h.sweep("sine", 110, 45, t, 0.09, v * 0.8, 0.24, out),
    kickChip: (h, m, t, d, v, out) => h.sweep("square", 190, 48, t, 0.05, v * 0.35, 0.12, out),
    snare(h, m, t, d, v, out) {
      h.hiss(t, 0.16, v * 0.5, out, [["bandpass", 1800, 0.8]]);
      h.tone("triangle", 190, t, 0.03, v * 0.3, { a: 0.001, d: 0.05, s: 0, r: 0.03 }, out);
    },
    snareSoft: (h, m, t, d, v, out) => h.hiss(t, 0.12, v * 0.28, out, [["lowpass", 3200], ["highpass", 400]]),
    snareChip: (h, m, t, d, v, out) => h.hiss(t, 0.09, v * 0.35, out, [["highpass", 1200]]),
    hat: (h, m, t, d, v, out) => h.hiss(t, 0.035, v * 0.22, out, [["highpass", 7000]]),
    hatSoft: (h, m, t, d, v, out) => h.hiss(t, 0.03, v * 0.14, out, [["highpass", 6000], ["lowpass", 9500]]),
    shaker: (h, m, t, d, v, out) => h.hiss(t, 0.05, v * 0.16, out, [["bandpass", 5500, 1.2]], 0.012),
    rim(h, m, t, d, v, out) {
      h.tone("sine", 1700, t, 0.01, v * 0.3, { a: 0.001, d: 0.02, s: 0, r: 0.01 }, out);
      h.hiss(t, 0.015, v * 0.2, out, [["highpass", 3000]]);
    },
    tom: (h, m, t, d, v, out) => h.sweep("sine", 120, 72, t, 0.2, v * 0.7, 0.34, out),
    tick: (h, m, t, d, v, out) => h.tone("square", 2600, t, 0.008, v * 0.12, { a: 0.001, d: 0.01, s: 0, r: 0.005 }, out),
    vinyl: (h, m, t, d, v, out) => h.hiss(t, 0.006, v * 0.08, out, [["highpass", 2500]]),
    blip: (h, m, t, d, v, out) => h.tone(h.pulse(0.25), hz(m), t, d, v * 0.4, { a: 0.002, d: 0.06, s: 0.4, r: 0.05 }, out),
    bonk(h, m, t, d, v, out) {                        // a small sag, not a buzzer
      const o = h.ctx.createOscillator(), g = h.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(hz(m), t);
      o.frequency.exponentialRampToValueAtTime(hz(m) * 0.94, t + d);
      g.gain.setValueAtTime(v * 0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.08);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + d + 0.1);
    },
    // An upright bass: a woody pluck, the filter closing as the string settles.
    upright(h, m, t, d, v, out) {
      const f = hz(m);
      h.tone("triangle", f, t, d, v * 0.75, { a: 0.004, d: 0.35, s: 0.25, r: 0.12 }, out, [1400, 320, 0.25]);
      h.tone("sine", f, t, d, v * 0.55, { a: 0.004, d: 0.4, s: 0.3, r: 0.12 }, out);
    },
    // Brushes on a snare: a swish that swells in rather than a hit.
    brush: (h, m, t, d, v, out) => h.hiss(t, 0.16 + d * 0.2, v * 0.2, out, [["bandpass", 3200, 0.7], ["lowpass", 6500]], 0.03),
    // Vibes: sine bars with the motor on, a slow tremolo on the ring.
    vibes(h, m, t, d, v, out) {
      const ctx = h.ctx, f = hz(m), len = Math.max(d, 0.6);
      const trem = ctx.createGain(), depth = ctx.createGain(), lfo = ctx.createOscillator();
      trem.gain.value = 1; trem.connect(out);
      lfo.frequency.value = 5.2; depth.gain.value = 0.35;
      lfo.connect(depth); depth.connect(trem.gain);
      h.tone("sine", f, t, len, v * 0.5, { a: 0.003, d: 1.2, s: 0, r: 0.4 }, trem);
      h.tone("sine", f * 4, t, 0.2, v * 0.07, { a: 0.002, d: 0.25, s: 0, r: 0.1 }, trem);
      lfo.start(t); lfo.stop(t + len + 1.2);
    },
    bell(h, m, t, d, v, out) {
      const f = hz(m);
      h.tone("sine", f, t, d, v * 0.5, { a: 0.002, d: 1.1, s: 0, r: 0.3 }, out);
      h.tone("sine", f * 2.76, t, 0.3, v * 0.16, { a: 0.001, d: 0.4, s: 0, r: 0.1 }, out);
      h.tone("sine", f * 5.4, t, 0.1, v * 0.06, { a: 0.001, d: 0.15, s: 0, r: 0.05 }, out);
    },
  };

  function voices(ctx) {
    const waves = {};
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);   // a second of it, for drums and dust
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const h = { ctx };
    // A pulse wave of a given duty, the sound of an old console's square channel.
    h.pulse = (duty) => {
      if (waves[duty]) return waves[duty];
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) {
        re[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
        im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
      }
      return (waves[duty] = ctx.createPeriodicWave(re, im));
    };
    // One oscillator with an envelope (attack, decay to sustain, release after
    // dur) and optionally a low-pass that closes from lp[0] to lp[1] over lp[2].
    h.tone = (type, f, t, dur, vel, e, out, lp) => {
      const o = ctx.createOscillator();
      if (typeof type === "string") o.type = type; else o.setPeriodicWave(type);
      o.frequency.setValueAtTime(f, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + e.a);
      g.gain.setTargetAtTime(vel * e.s, t + e.a, e.d / 3 + 1e-4);
      const off = t + Math.max(dur, e.a);
      g.gain.setTargetAtTime(0, off, e.r / 3 + 1e-4);
      let head = o;
      if (lp) {
        const fl = ctx.createBiquadFilter();
        fl.type = "lowpass";
        fl.frequency.setValueAtTime(lp[0], t);
        if (lp[2]) fl.frequency.exponentialRampToValueAtTime(lp[1], t + lp[2]);
        o.connect(fl); head = fl;
      }
      head.connect(g); g.connect(out);
      o.start(t); o.stop(off + e.r * 2 + 0.05);
    };
    // A pitch that drops fast: kicks and toms.
    h.sweep = (type, f0, f1, t, glide, vel, len, out) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + glide);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + len + 0.02);
    };
    // Filtered noise: snares, hats, shakers, the dust on the record.
    h.hiss = (t, len, vel, out, filters, attack = 0) => {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      let head = s;
      for (const [type, freq, q] of filters) {
        const fl = ctx.createBiquadFilter();
        fl.type = type; fl.frequency.value = freq; if (q) fl.Q.value = q;
        head.connect(fl); head = fl;
      }
      const g = ctx.createGain();
      g.gain.setValueAtTime(attack ? 0 : vel, t);
      if (attack) g.gain.linearRampToValueAtTime(vel, t + attack);
      g.gain.exponentialRampToValueAtTime(0.001, t + attack + len);
      head.connect(g); g.connect(out);
      s.start(t, Math.random() * 0.9);
      s.stop(t + attack + len + 0.02);
    };

    const bound = {};
    for (const [name, fn] of Object.entries(PATCHES)) bound[name] = (...a) => fn(h, ...a);
    return bound;
  }

  function desk(ctx, T, out) {
    const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
    const d = {};
    d.glue = ctx.createDynamicsCompressor();          // so chords and drums together never clip
    d.glue.threshold.value = -16; d.glue.ratio.value = 3; d.glue.attack.value = 0.01; d.glue.release.value = 0.2;
    d.glue.connect(out);
    d.duck = gain(1, d.glue);
    d.muffle = ctx.createBiquadFilter();
    d.muffle.type = "lowpass"; d.muffle.frequency.value = 20000; d.muffle.Q.value = 0.4;
    d.muffle.connect(d.duck);
    d.music = gain(1, d.muffle);
    d.sfx = gain(0.9, d.glue);
    d.tiers = {}; d.parts = {}; d.patch = {}; d.swing = {};
    for (const tier of T.TIER_IDS.concat("pressure")) {
      d.tiers[tier] = gain(0, d.music);
      for (const p of T.partsOf(tier)) {
        const key = tier + "." + p.id;
        d.parts[key] = gain(0, d.tiers[tier]);
        d.patch[key] = p.patch;
        d.swing[key] = (T.TIERS[tier] && T.TIERS[tier].swing) || 0;
      }
    }
    return d;
  }

  // The parts a mix can be heard in: its arrangement up and the part up.
  function live(T, mix) {
    const out = new Set();
    for (const [key, g] of Object.entries(mix.parts)) {
      const tier = key.slice(0, key.indexOf("."));
      if ((mix.tiers[tier] || 0) * g > 0) out.add(key);
    }
    return out;
  }

  // Every note of one bar for the parts in `keys`, from time `at`; offbeats
  // lean late by the arrangement's swing. Notes before `notBefore` (a stall)
  // are dropped rather than crammed in.
  function book(T, v, d, keys, bar, at, notBefore = -Infinity) {
    for (const key of keys) {
      const dot = key.indexOf("."), swing = d.swing[key] * T.STEP_SEC;
      for (const [s, len, m, vel] of T.notes(key.slice(0, dot), key.slice(dot + 1), bar)) {
        const when = at + s * T.STEP_SEC + (s % 4 === 2 ? swing : 0);
        if (when >= notBefore) v[d.patch[key]](m, when, len * T.STEP_SEC, vel, d.parts[key]);
      }
    }
  }

  return { FADE, NAMES: Object.keys(PATCHES), voices, desk, live, book };
})();

if (typeof module !== "undefined") module.exports = MusicSynth;
