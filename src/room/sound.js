// sound.js — the room's own few sounds: the machine's hum while it is on and
// you are in the room, the thunk and whine of the tube coming on, the snap of
// it going off, and rain on the window when there is rain. Synthesised, like
// the desk's music, and under the same volume and mute (the speaker by the
// clock sets both; they live in one preference).
const PREF_KEY = "pixel-crossing:sound";

function prefs() {
  try { return Object.assign({ volume: 0.6, muted: false }, JSON.parse(localStorage.getItem(PREF_KEY) || "{}")); }
  catch { return { volume: 0.6, muted: false }; }
}

export function createSound() {
  let ctx = null, out = null, hum = null, rain = null, noise = null;

  function make() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    out = ctx.createGain();
    out.connect(ctx.destination);
    level();
    const len = ctx.sampleRate * 2;               // two seconds of brown noise, looped
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    return true;
  }
  // Volume follows the desk's preference, squared like the music's.
  function level() {
    if (!out) return;
    const p = prefs();
    out.gain.setTargetAtTime(p.muted ? 0 : p.volume * p.volume, ctx.currentTime, 0.05);
  }

  function loop(freq, gain) {
    const src = ctx.createBufferSource();
    src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(out);
    src.start();
    g.gain.setTargetAtTime(gain, ctx.currentTime, 0.4);
    return { g, stop() { g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); setTimeout(() => src.stop(), 900); } };
  }

  function tone(type, f0, f1, dur, gain, at = 0) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function crackle(dur, gain, at = 0) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  return {
    // Browsers let sound start only from a click or key: call from one.
    wake() { if (make() && ctx.state !== "running") ctx.resume().catch(() => {}); level(); },
    level,
    hum(on) {
      if (!ctx) return;
      if (on && !hum) hum = loop(140, 0.05);
      else if (!on && hum) { hum.stop(); hum = null; }
    },
    rain(on) {
      if (!ctx) return;
      if (on && !rain) rain = loop(1800, 0.025);
      else if (!on && rain) { rain.stop(); rain = null; }
    },
    powerOn() {
      if (!ctx) return;
      tone("sine", 90, 38, 0.28, 0.22);
      crackle(0.35, 0.08, 0.05);
      tone("triangle", 180, 1400, 0.9, 0.012, 0.1);
    },
    powerOff() {
      if (!ctx) return;
      tone("sine", 1200, 60, 0.32, 0.05);
      crackle(0.18, 0.1);
      tone("sine", 70, 30, 0.2, 0.15, 0.05);
    },
    click() { if (ctx) { crackle(0.03, 0.12); tone("square", 1800, 900, 0.02, 0.02); } },
  };
}
