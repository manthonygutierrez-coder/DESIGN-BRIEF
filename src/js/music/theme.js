"use strict";
/* ── the score ────────────────────────────────────────────
 * One theme in four arrangements, all in D major at 96 bpm over the same
 * sixteen bars, so the desktop can move between them on any bar line:
 *
 *   hub     the desktop, mail, the board: lo-fi keys, a lazy bass, vinyl
 *   hunt    looking for work on the web: plucked bass, marimba, a shaker groove
 *   case    researching a job: a walking upright, brushes in half time,
 *           vibes, and the key's minor chords laid over its major ones
 *   studio  the design apps: pulse arpeggios, a triangle bass, four on the floor
 *
 * Every part comes in at a level of fullness from 0 to 1, and fullness is
 * your reputation: somebody nobody has heard of gets bass and chords, an
 * established name gets the whole band. Pressure, a deadline getting close,
 * adds a ticking clock and a floor tom on top of whatever is playing.
 *
 * Nothing here makes a sound. It is data and arithmetic, tested without a
 * sound card; js/music/music.js plays it.
 */
const MusicTheme = (() => {
  const BPM = 96, STEPS = 16, BARS = 16;          // sixteenths to a bar, bars to the form
  const STEP_SEC = 60 / BPM / 4, BAR_SEC = STEP_SEC * STEPS;
  const IN_KEY = new Set([2, 4, 6, 7, 9, 11, 1]); // D major, as pitch classes
  const inKey = (m) => IN_KEY.has(((m % 12) + 12) % 12);
  const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));

  // One chord a bar. Voicings are written out so the keys move by step.
  const CHORDS = {
    "Gmaj7":  { root: 43, tones: [55, 59, 62, 66] },
    "F#m7":   { root: 42, tones: [54, 57, 61, 64] },
    "Em7":    { root: 40, tones: [52, 55, 59, 62] },
    "A7":     { root: 45, tones: [55, 57, 61, 64] },
    "Bm7":    { root: 47, tones: [54, 57, 59, 62] },
    "A7sus4": { root: 45, tones: [55, 57, 62, 64] },
    "Dmaj7":  { root: 38, tones: [54, 57, 61, 62] },
  };
  const FORM = ["Gmaj7", "F#m7", "Em7", "A7", "Gmaj7", "F#m7", "Bm7", "A7sus4",
                "Em7", "A7", "Dmaj7", "Bm7", "Em7", "A7", "Dmaj7", "Dmaj7"];
  // The minor (or diminished) triad from the key that sits over each chord:
  // what research hears instead of the major colour. B minor shares D major's
  // notes, so it is the same key in a darker room.
  const SHADE = {
    "Gmaj7": [59, 62, 66], "F#m7": [54, 57, 61], "Em7": [52, 55, 59], "A7": [61, 64, 67],
    "Bm7": [59, 62, 66], "A7sus4": [52, 55, 59], "Dmaj7": [54, 57, 61],
  };
  const wrap = (bar) => ((bar % BARS) + BARS) % BARS;
  const chordAt = (bar) => CHORDS[FORM[wrap(bar)]];

  // The tune every arrangement quotes, a bar at a time: [step, steps long, note].
  const MELODY = [
    [[0, 3, 78], [3, 3, 81], [6, 2, 83], [8, 4, 81], [12, 4, 78]],
    [[0, 6, 76], [6, 2, 73], [8, 8, 76]],
    [[0, 3, 74], [3, 3, 76], [6, 2, 79], [8, 4, 83], [12, 4, 81]],
    [[0, 4, 79], [4, 2, 76], [6, 2, 73], [8, 8, 76]],
    [[0, 3, 78], [3, 3, 81], [6, 2, 83], [8, 4, 86], [12, 4, 83]],
    [[0, 4, 85], [4, 4, 81], [8, 8, 76]],
    [[0, 3, 86], [3, 3, 83], [6, 2, 81], [8, 8, 78]],
    [[0, 4, 76], [4, 4, 74], [8, 4, 76], [12, 4, 81]],
    [[0, 6, 83], [6, 2, 81], [8, 4, 79], [12, 4, 76]],
    [[0, 4, 73], [4, 4, 76], [8, 4, 79], [12, 4, 81]],
    [[0, 8, 78], [8, 2, 76], [10, 2, 78], [12, 4, 81]],
    [[0, 6, 83], [6, 2, 81], [8, 8, 78]],
    [[0, 3, 79], [3, 3, 83], [6, 2, 86], [8, 4, 83], [12, 4, 79]],
    [[0, 4, 76], [4, 4, 79], [8, 4, 85], [12, 4, 81]],
    [[0, 8, 86], [8, 4, 85], [12, 4, 81]],
    [[0, 12, 78]],
  ];

  // The note next to `to`, on the side `from` is on, that stays in the key.
  function approach(from, to) {
    const dir = from < to ? -1 : 1;
    for (const d of [1, 2]) if (inKey(to + dir * d)) return to + dir * d;
    return to;
  }
  // Two scale steps down: a third below, for harmony.
  function thirdBelow(m) {
    let n = m, found = 0;
    while (found < 2) { n--; if (inKey(n)) found++; }
    return n;
  }

  // A small seeded generator, so a bar varies from one time round to the
  // next but the same bar of the same time round is always the same.
  function rng(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    let a = h >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const eighths = (fn) => { const out = []; for (let s = 0; s < STEPS; s += 2) out.push(fn(s)); return out; };

  /* Each part: a synth patch (music.js has them), the fullness it comes in
   * at, its level in the mix, and its notes for a bar as
   * [step, steps long, note (0 for drums), velocity]. */
  const TIERS = {
    hub: { swing: 0.34, parts: [
      { id: "keys", patch: "ep", level: 0, gain: 0.34, notes(bar, r) {
        const c = chordAt(bar), v = 0.5 + r() * 0.12, held = r() < 0.3, out = [];
        for (const n of c.tones) out.push([0, held ? 14 : 6, n, v]);
        if (!held && r() < 0.75) for (const n of c.tones.slice(1)) out.push([6, 5, n, v * 0.6]);
        return out;
      } },
      { id: "bass", patch: "sub", level: 0, gain: 0.5, notes(bar, r) {
        const c = chordAt(bar), out = [[0, 6, c.root, 0.9], [10, 4, r() < 0.5 ? c.root + 12 : c.root + 7, 0.6]];
        if (r() < 0.5) out.push([14, 2, approach(c.root, chordAt(bar + 1).root), 0.5]);
        return out;
      } },
      { id: "vinyl", patch: "vinyl", level: 0, gain: 0.5, notes(bar, r) {
        const out = [], n = 2 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) out.push([Math.floor(r() * STEPS), 1, 0, 0.3 + r() * 0.7]);
        return out;
      } },
      { id: "kick", patch: "kickSoft", level: 0.25, gain: 0.6, notes(bar, r) {
        const out = [[0, 1, 0, 0.9], [10, 1, 0, 0.7]];
        if (r() < 0.35) out.push([7, 1, 0, 0.45]);
        return out;
      } },
      { id: "snare", patch: "snareSoft", level: 0.25, gain: 0.5, notes(bar, r) {
        const out = [[4, 1, 0, 0.8], [12, 1, 0, 0.8]];
        if (r() < 0.25) out.push([15, 1, 0, 0.3]);
        return out;
      } },
      { id: "hats", patch: "hatSoft", level: 0.25, gain: 0.45, notes(bar, r) {
        return eighths((s) => [s, 1, 0, (s % 4 === 0 ? 0.55 : 0.35) * (0.85 + r() * 0.3)]);
      } },
      { id: "melody", patch: "ep", level: 0.5, gain: 0.3, notes(bar, r) {
        // The tune an octave down and lazier: some notes dropped, the rest held on.
        return MELODY[wrap(bar)].filter(() => r() > 0.25)
          .map(([s, d, m]) => [s, Math.min(STEPS - s, d + 2), m - 12, 0.5 + r() * 0.2]);
      } },
      { id: "pad", patch: "pad", level: 0.75, gain: 0.28, notes(bar) {
        const c = chordAt(bar);
        return [[0, 16, c.tones[1] + 12, 0.6], [0, 16, c.tones[3] + 12, 0.5]];
      } },
    ] },

    hunt: { swing: 0.2, parts: [
      { id: "bass", patch: "pluck", level: 0, gain: 1.5, notes(bar, r) {
        const n = chordAt(bar).root + 12;             // an octave up, so it pops
        const out = [[0, 2, n, 0.9], [3, 1, n + 12, 0.55], [6, 2, n, 0.75]];
        if (r() < 0.5) out.push([10, 2, n + 7, 0.7]);
        else out.push([9, 1, n + 7, 0.6], [11, 1, n + 12, 0.55]);
        out.push([14, 2, approach(n, chordAt(bar + 1).root + 12), 0.65]);
        return out;
      } },
      { id: "marimba", patch: "mallet", level: 0, gain: 1.3, notes(bar, r) {
        // Even bars quote the tune a step late; odd bars poke around the chord.
        if (bar % 2 === 0) return MELODY[wrap(bar)].slice(0, 3).map(([s, , m]) => [Math.min(STEPS - 1, s + 2), 1, m, 0.7]);
        const t = chordAt(bar).tones.map((m) => m + 12), out = [];
        for (const s of [2, 5, 7, 10, 13, 15]) if (r() < 0.6) out.push([s, 1, t[Math.floor(r() * t.length)], 0.45 + r() * 0.3]);
        return out;
      } },
      { id: "shaker", patch: "shaker", level: 0.25, gain: 0.8, notes(bar, r) {
        const out = [];
        for (let s = 0; s < STEPS; s++) out.push([s, 1, 0, (s % 4 === 2 ? 0.7 : s % 2 ? 0.3 : 0.45) * (0.8 + r() * 0.4)]);
        return out;
      } },
      { id: "kick", patch: "kick", level: 0.25, gain: 0.7, notes(bar) {
        const out = [[0, 1, 0, 0.9], [8, 1, 0, 0.7], [11, 1, 0, 0.5]];
        if (bar % 2) out.push([14, 1, 0, 0.4]);
        return out;
      } },
      { id: "rim", patch: "rim", level: 0.25, gain: 0.8, notes(bar, r) {
        const out = [[4, 1, 0, 0.8], [12, 1, 0, 0.8]];
        if (r() < 0.3) out.push([15, 1, 0, 0.35]);
        return out;
      } },
      { id: "stabs", patch: "stab", level: 0.5, gain: 0.5, notes(bar, r) {
        const t = chordAt(bar).tones.slice(1).map((m) => m + 12), out = [];
        for (const s of [2, 10]) for (const m of t) out.push([s, 1, m, 0.55]);
        if (r() < 0.4) for (const m of t) out.push([7, 1, m, 0.4]);
        return out;
      } },
      { id: "lead", patch: "pulse25", level: 0.75, gain: 0.3, notes(bar) {
        return bar % 2 === 0 ? MELODY[wrap(bar)].map(([s, d, m]) => [s, d, m, 0.6]) : [];
      } },
    ] },

    // Research. Turning things over: the same chords, with a minor triad from
    // the key laid over each (B minor on G, F-sharp minor on D, a diminished
    // one on A for the tension), a bass that walks instead of grooves, brushes
    // that only lean on the third beat, and vibes that quote the tune slowly
    // and leave room around it.
    case: { swing: 0.34, parts: [
      { id: "upright", patch: "upright", level: 0, gain: 1.2, notes(bar, r) {
        // Walking quarters: the root, a chord tone, another, then a step into the next bar.
        const c = chordAt(bar), low = c.tones.map((m) => m - 12).filter((m) => m > c.root);
        const b2 = low[Math.floor(r() * Math.min(2, low.length))] || c.root + 12;
        const b3 = r() < 0.5 ? low[low.length - 1] || c.root + 12 : c.root + 12;
        return [[0, 3, c.root, 0.9], [4, 3, b2, 0.65], [8, 3, b3, 0.75],
                [12, 3, approach(b3, chordAt(bar + 1).root), 0.7]];
      } },
      { id: "brush", patch: "brush", level: 0, gain: 1, notes(bar, r) {
        // Half time: the swish lands on three; the taps keep a slow swung ride.
        const out = [[8, 2, 0, 0.85]];
        for (const s of [0, 4, 12]) out.push([s, 1, 0, 0.35 + r() * 0.1]);
        for (const s of [6, 14]) if (r() < 0.6) out.push([s, 1, 0, 0.25 + r() * 0.1]);
        return out;
      } },
      { id: "kick", patch: "kickSoft", level: 0.25, gain: 0.5, notes(bar, r) {
        const out = [[0, 1, 0, 0.8]];
        if (r() < 0.3) out.push([10, 1, 0, 0.45]);
        return out;
      } },
      { id: "vibes", patch: "vibes", level: 0.25, gain: 0.55, notes(bar, r) {
        // Even bars: the tune's first notes, late and let ring. Odd bars: one
        // note of the shade, high, as if a thought just came.
        if (bar % 2 === 0) return MELODY[wrap(bar)].slice(0, 2).map(([s, d, m], i) =>
          [Math.min(STEPS - 2, s + 2 + i * 2), Math.min(6, STEPS - Math.min(STEPS - 2, s + 2 + i * 2)), m, 0.6]);
        const sh = SHADE[FORM[wrap(bar)]];
        return r() < 0.7 ? [[6, 6, sh[Math.floor(r() * sh.length)] + 12, 0.45]] : [];
      } },
      { id: "shade", patch: "pad", level: 0.5, gain: 0.5, notes(bar) {
        return SHADE[FORM[wrap(bar)]].map((m) => [0, STEPS, m, 0.4]);
      } },
      { id: "lead", patch: "tri", level: 0.75, gain: 0.16, notes(bar) {
        // Only the tune's long notes, an octave down: the melody, half-remembered.
        return bar % 2 === 1 ? [] : MELODY[wrap(bar)].filter(([, d]) => d >= 4).map(([s, d, m]) => [s, d, m - 12, 0.5]);
      } },
    ] },

    studio: { swing: 0, parts: [
      { id: "arp", patch: "pulse12", level: 0, gain: 0.2, notes(bar) {
        const t = chordAt(bar).tones, up = t.concat(t.map((m) => m + 12));
        return up.concat(up.slice().reverse()).map((m, s) => [s, 1, m, s % 4 === 0 ? 0.7 : 0.5]);
      } },
      { id: "bass", patch: "tri", level: 0, gain: 0.45, notes(bar) {
        const c = chordAt(bar), next = chordAt(bar + 1).root;
        return eighths((s) => [s, 2, s === 14 ? approach(c.root, next) : c.root + (s % 4 ? 12 : 0), 0.85]);
      } },
      { id: "kick", patch: "kickChip", level: 0.25, gain: 0.6, notes(bar, r) {
        const out = [0, 4, 8, 12].map((s) => [s, 1, 0, 0.9]);
        if (r() < 0.3) out.push([10, 1, 0, 0.5]);
        return out;
      } },
      { id: "snare", patch: "snareChip", level: 0.25, gain: 0.5, notes(bar) {
        const out = [[4, 1, 0, 0.85], [12, 1, 0, 0.85]];
        if (bar % 4 === 3) out.push([14, 1, 0, 0.6], [15, 1, 0, 0.7]);   // a fill into every fourth bar
        return out;
      } },
      { id: "hats", patch: "hat", level: 0.25, gain: 0.4, notes(bar, r) {
        const out = [];
        for (let s = 0; s < STEPS; s++) if (s % 2 === 0 || r() < 0.5) out.push([s, 1, 0, s % 4 === 2 ? 0.7 : s % 2 ? 0.3 : 0.5]);
        return out;
      } },
      { id: "lead", patch: "square", level: 0.5, gain: 0.2, notes(bar, r) {
        const out = [];
        for (const [s, d, m] of MELODY[wrap(bar)]) {
          if (d >= 4 && s > 0 && r() < 0.35) out.push([s - 1, 1, approach(m - 12, m), 0.45]);   // a grace note
          out.push([s, d, m, 0.65]);
        }
        return out;
      } },
      { id: "echo", patch: "pulse25", level: 0.75, gain: 0.14, notes(bar) {
        return MELODY[wrap(bar)].filter(([s]) => s + 3 < STEPS)
          .map(([s, d, m]) => [s + 3, Math.min(d, STEPS - s - 3), thirdBelow(m), 0.5]);
      } },
    ] },
  };

  // On top of any arrangement, as a deadline gets close. Each part fades in
  // across its stretch of pressure (from, to).
  const PRESSURE = [
    { id: "tick", patch: "tick", from: 0, to: 0.6, gain: 0.5, notes() { return eighths((s) => [s, 1, 0, s % 4 === 0 ? 0.9 : 0.6]); } },
    { id: "tom", patch: "tom", from: 0.3, to: 0.8, gain: 0.5, notes() { return [0, 4, 8, 12].map((s) => [s, 1, 0, s === 0 ? 0.9 : 0.6]); } },
    { id: "rush", patch: "tick", from: 0.6, to: 1, gain: 0.4, notes() { const out = []; for (let s = 1; s < STEPS; s += 2) out.push([s, 1, 0, 0.5]); return out; } },
  ];

  const TIER_IDS = Object.keys(TIERS);
  const partsOf = (tier) => (tier === "pressure" ? PRESSURE : (TIERS[tier] || { parts: [] }).parts);
  const partOf = (tier, id) => partsOf(tier).find((p) => p.id === id) || null;

  // A part's notes for a bar. `bar` counts from the start, so the same bar of
  // the form sounds a little different each time round.
  function notes(tier, id, bar) {
    const p = partOf(tier, id);
    return p ? p.notes(wrap(bar), rng(tier + "." + id + "." + bar)) : [];
  }

  // Where everything should sit: the zone's arrangement up, the others down,
  // parts in by fullness, the pressure parts by pressure.
  function mix(o = {}) {
    const zone = TIERS[o.zone] ? o.zone : "hub", full = clamp01(o.fullness), press = clamp01(o.pressure);
    const tiers = { pressure: 1 }, parts = {};
    for (const [tid, tier] of Object.entries(TIERS)) {
      tiers[tid] = tid === zone ? 1 : 0;
      for (const p of tier.parts) parts[tid + "." + p.id] = full + 1e-9 >= p.level ? p.gain : 0;
    }
    for (const p of PRESSURE) parts["pressure." + p.id] = p.gain * clamp01((press - p.from) / (p.to - p.from));
    return { tiers, parts };
  }

  // Which arrangement a window belongs to. Your camera floats over everything
  // and is not a place, so it keeps whatever was playing (null).
  // The web is the hunt for work, until a job is being researched; then the
  // same windows play the case.
  function zoneOf(className, o = {}) {
    const c = " " + String(className || "") + " ";
    if (/ w98--camguide /.test(c)) return null;
    if (/ w98--(web|ticket|compare) /.test(c)) return o.research ? "case" : "hunt";
    if (/ w98--(suite|re) /.test(c)) return "studio";
    return "hub";
  }

  // Reputation 0-100 to fullness 0-1: the whole band by 80.
  const fullnessFromRep = (rep) => clamp01((Number(rep) || 0) / 80);

  // How close a gig's clock is to running out, 0-1. Research tightens over
  // its last 40%; production from 60% of the deadline on. Late, it stays at
  // full for a quarter of the deadline again, then settles to a low tick:
  // a job left late is not an emergency for the rest of the afternoon.
  function pressureOf(g) {
    if (!g) return 0;
    if (g.stage === "research") return clamp01((0.4 - (Number(g.left) || 0) / Math.max(1, g.total || 240)) / 0.4);
    if (g.stage === "production") {
      const f = (Number(g.used) || 0) / Math.max(1, g.deadline || 600);
      return f <= 1 ? clamp01((f - 0.6) / 0.4) : f <= 1.25 ? 1 : 0.35;
    }
    return 0;
  }

  // The first line of a grid of `unit` seconds from t0, at or after now.
  const nextGrid = (now, t0, unit) => t0 + Math.max(0, Math.ceil((now - t0) / unit - 1e-9)) * unit;
  // A sound effect lands on the next sixteenth, unless that is too long after
  // the click to still feel like the click; then the next thirty-second.
  function sfxTime(now, t0) {
    const at = nextGrid(now, t0, STEP_SEC);
    return at - now <= 0.09 ? at : nextGrid(now, t0, STEP_SEC / 2);
  }

  // Sound effects in the key of the bar they land in:
  // [delay in steps, steps long, note, velocity, patch].
  function sfxNotes(name, bar, o = {}) {
    const c = chordAt(bar), t = c.tones.map((m) => m + 24);
    if (name === "clip-hit") {
      // Clip after clip climbs the chord, like a run of good finds should.
      const n = Math.max(0, o.combo | 0), up = 12 * Math.min(1, Math.floor(n / 4));
      const a = t[n % 4] + up, b = n % 4 === 3 ? t[0] + 12 + up : t[(n % 4) + 1] + up;
      return [[0, 0.5, a, 0.7, "blip"], [0.5, 1, b, 0.6, "blip"]];
    }
    if (name === "clip-dupe") return [[0, 1, t[0], 0.3, "blip"]];
    if (name === "clip-miss") { const m = c.tones[0] + 12; return [[0, 1, m, 0.6, "bonk"], [1, 2, thirdBelow(m), 0.5, "bonk"]]; }
    if (name === "chime") return [[0, 3, 86, 0.6, "bell"], [2, 6, 81, 0.5, "bell"]];
    if (name === "deliver") {
      const run = [74, 78, 81, 86, 90, 93, 98], k = 2 + Math.max(1, Math.min(5, o.stars | 0 || 1));
      return run.slice(0, k).map((m, i) => [i, i === k - 1 ? 6 : 1, m, 0.55 + i * 0.04, "pulse25"]);
    }
    // Finding the gap: the case's shade, climbing on the vibes.
    if (name === "gap") { const sh = SHADE[FORM[wrap(bar)]]; return sh.map((m, i) => [i, i === 2 ? 5 : 1, m + 12, 0.5, "vibes"]); }
    // A call: the phone, the line opening, the line going.
    if (name === "ring") return [[0, 1, t[3], 0.3, "bell"], [1, 1, t[2], 0.26, "bell"], [3, 1, t[3], 0.3, "bell"], [4, 2, t[2], 0.26, "bell"]];
    if (name === "pickup") return [[0, 0.5, t[0], 0.3, "blip"], [0.5, 1, t[2], 0.3, "blip"]];
    if (name === "hangup") return [[0, 0.5, t[2], 0.26, "blip"], [0.5, 1.5, thirdBelow(t[0]), 0.26, "blip"]];
    return UI_SOUNDS.has(name) ? uiNotes(name, c, t) : [];
  }

  // The interface's own small sounds: quiet, short, and still in the key of
  // the bar, so clicking about never fights the music. The player can switch
  // these off (the tray's volume box) without losing the game's own cues.
  const UI_SOUNDS = new Set(["open", "close", "min", "menu", "pick", "press", "loaded", "tool", "layer", "drop", "drawer", "tuck", "grid"]);
  function uiNotes(name, c, t) {
    if (name === "open") return [[0, 0.5, t[0], 0.18, "blip"], [0.5, 1, t[2], 0.16, "blip"]];
    if (name === "close") return [[0, 0.5, t[2], 0.15, "blip"], [0.5, 1, t[0], 0.13, "blip"]];
    if (name === "min") return [[0, 1, t[0] - 12, 0.14, "blip"]];
    if (name === "menu") return [[0, 1, t[1], 0.2, "mallet"]];
    if (name === "pick") return [[0, 1, t[3], 0.2, "mallet"]];
    if (name === "press") return [[0, 0.5, c.root + 36, 0.16, "pluck"]];
    if (name === "loaded") return [[0, 1, t[1], 0.14, "mallet"], [1, 2, t[3], 0.12, "mallet"]];
    // The design suite: a tool picked up, a layer made or moved, a card let
    // go on the work, a drawer springing out and tucking back, and the focus
    // grid blooming out from its cell.
    if (name === "tool") return [[0, 0.5, t[2], 0.12, "mallet"]];
    if (name === "layer") return [[0, 0.5, t[0], 0.14, "pluck"], [0.5, 0.5, t[1], 0.12, "pluck"]];
    if (name === "drop") return [[0, 0.5, c.root + 24, 0.2, "pluck"], [0.5, 1, t[2], 0.14, "mallet"]];
    if (name === "drawer") return [[0, 0.5, t[0], 0.14, "blip"], [0.5, 0.5, t[2], 0.13, "blip"], [1, 1, t[0] + 12, 0.12, "blip"]];
    if (name === "tuck") return [[0, 0.5, t[2], 0.12, "blip"], [0.5, 1, t[0], 0.11, "blip"]];
    if (name === "grid") return [[0, 1, t[0], 0.22, "vibes"], [0.5, 1, t[1], 0.2, "vibes"], [1, 1, t[2], 0.2, "vibes"], [1.5, 3, t[3], 0.18, "vibes"]];
    return [];
  }

  return {
    BPM, STEPS, BARS, STEP_SEC, BAR_SEC, CHORDS, FORM, SHADE, MELODY, TIERS, PRESSURE, TIER_IDS,
    inKey, chordAt, partsOf, notes, mix, zoneOf, fullnessFromRep, pressureOf, nextGrid, sfxTime, sfxNotes, UI_SOUNDS,
  };
})();

if (typeof module !== "undefined") module.exports = MusicTheme;
