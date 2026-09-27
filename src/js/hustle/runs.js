"use strict";
/* ── runs: the same gig, played differently ────────────────
 * A gig is written once, by hand. A run is the dice rolled over it the first
 * time you make contact: what kind of day the client is having, and the order
 * their questions come to mind in. The run is saved with the gig, so a reload
 * is the same run, and nothing about the gig as written ever changes.
 *
 *   roll(gig, seed)   a run for this gig, from a number
 *   canonical(gig)    the gig exactly as written: saves already under way, and
 *                     the first job, while your camera shows you around
 *   view(gig, run)    the gig as this run plays it, a new object (the gig
 *                     itself when the run changes nothing)
 *   every(gig)        every run roll() can produce, bar the question order,
 *                     which changes nothing the tests look at
 *
 * The client's day is a small change to how the meeting runs (meeting.js reads
 * patience, pause, silenceCost, given and catchBonus), and a line that tells
 * you which day it is. Pure: no DOM, no clock.
 */
const HustleRuns = (() => {
  const V = 1;
  const DEFAULT_PAUSE = 12000;     // meeting.js's, for a tree that sets none
  const MIN_PATIENCE = 3, MIN_PAUSE = 6000;

  // One in five calls is just a call.
  const MOODS = {
    rushed:     { tag: "rushed",     patience: -1, pause: 0.7, give: 1, research: 0.85, say: (n) => n + " sounds rushed." },
    chatty:     { tag: "chatty",     patience: +1, pause: 1.3,                         say: (n) => n + " is in a talking mood." },
    distracted: { tag: "distracted", silenceCost: 2, pause: 0.9,                        say: (n) => n + " seems distracted." },
    sceptical:  { tag: "sceptical",  patience: -1, catchBonus: 2,                       say: (n) => n + " sounds unconvinced." },
  };
  const DAYS = [null].concat(Object.keys(MOODS));

  // mulberry32, the same generator the pictures use.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const tree = (gig) => (gig && gig.dialogue) || {};
  const moodsFor = (gig) => {
    const allowed = gig && gig.vary && gig.vary.moods;
    return allowed ? [null].concat(allowed.filter((m) => MOODS[m])) : DAYS;
  };
  // What a rushed client might blurt out: a plain question that tells you
  // something, that no window hangs off, and that nothing has to come first.
  function givable(gig) {
    const t = tree(gig), after = new Set(Object.values(t.challenges || {}).map((c) => c.after));
    return Object.entries(t.options || {})
      .filter(([id, o]) => !o.end && !(o.requires || []).length && (o.reveals || []).length && !after.has(id) && (o.cost === undefined || o.cost <= 1))
      .map(([id]) => id);
  }

  function canonical() { return { v: V, seed: 0, mood: null, order: null, given: [] }; }

  function roll(gig, seed) {
    const r = rng(seed);
    const pool = moodsFor(gig);
    const mood = pool[Math.floor(r() * pool.length) % pool.length];
    const ids = Object.keys(tree(gig).options || {});
    const order = ids.filter((id) => !tree(gig).options[id].end);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const can = givable(gig);
    const given = mood && MOODS[mood].give && can.length ? [can[Math.floor(r() * can.length) % can.length]] : [];
    return { v: V, seed: seed >>> 0, mood, order, given };
  }

  function view(gig, run) {
    if (!gig || !run || (!run.mood && !run.order && !(run.given || []).length)) return gig;
    const t = tree(gig), m = MOODS[run.mood] || {};
    const d = Object.assign({}, t);
    // The questions, in the order they come to mind; closing the call stays last.
    if (run.order) {
      const opts = t.options || {}, out = {};
      for (const id of run.order) if (opts[id]) out[id] = opts[id];
      for (const [id, o] of Object.entries(opts)) if (!out[id]) out[id] = o;
      d.options = out;
    }
    if (run.mood) {
      d.patience = Math.max(MIN_PATIENCE, (Number(t.patience) || 5) + (m.patience || 0));
      d.pause = Math.max(MIN_PAUSE, Math.round((Number(t.pause) || DEFAULT_PAUSE) * (m.pause || 1)));
      if (m.silenceCost) d.silenceCost = m.silenceCost;
      if (m.catchBonus) d.catchBonus = m.catchBonus;
    }
    const given = (run.given || []).filter((id) => givable(gig).includes(id));
    if (given.length) d.given = given;
    const out = Object.assign({}, gig, { dialogue: d, run });
    if (m.research && gig.research) out.research = Object.assign({}, gig.research, { seconds: Math.round((gig.research.seconds || 240) * m.research) });
    return out;
  }

  function every(gig) {
    const out = [canonical()];
    for (const mood of moodsFor(gig)) {
      if (!mood) continue;
      const gives = MOODS[mood].give ? givable(gig) : [];
      if (!gives.length) out.push({ v: V, seed: 0, mood, order: null, given: [] });
      for (const id of gives) out.push({ v: V, seed: 0, mood, order: null, given: [id] });
    }
    return out;
  }

  // What the call says about the day, and the tag beside their name.
  const dayLine = (run, name) => (run && MOODS[run.mood] ? MOODS[run.mood].say(name) : "");
  const dayTag = (run) => (run && MOODS[run.mood] ? MOODS[run.mood].tag : "");

  return { V, MOODS, DAYS, roll, canonical, view, every, givable, dayLine, dayTag, MIN_PATIENCE, MIN_PAUSE };
})();

if (typeof module !== "undefined") module.exports = HustleRuns;
