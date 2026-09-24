"use strict";
/* ── the meeting, and the glass ────────────────────────────
 *
 * dialogue.js knows what a client will tell you and how much attention they
 * have for you. It does not know about time, because a pager thread has none.
 * A call does. This wraps a dialogue tree in the two things a live meeting
 * adds, and stays pure so both can be tested without a canvas:
 *
 *   THE GLASS   the pause after they finish speaking. It runs in real time
 *               while you decide. Let it empty and they fill the silence
 *               themselves: that costs a pip of attention and closes any
 *               window that was open. Two silences in a row and they start
 *               wrapping up on their own.
 *
 *   THE WINDOW  some replies contradict the client's own site, or something
 *               they said earlier. A challenge question appears only during
 *               the glass that follows that reply, and only if you have
 *               already clipped the fact that proves it. Catch it and it is
 *               free. Miss it and you find out at the review.
 *
 * The glass is not a fixed size. It is cut to what attention they have left —
 * `pause * (0.55 + 0.45 * patience/max)` — so it visibly shortens as the
 * meeting wears on, and the player reads the clock off the client rather than
 * off the number.
 *
 * Every function returns a new state. Nothing here touches the DOM.
 */

const HustleMeeting = (() => {

  const DEFAULT_PAUSE = 12000;     // ms of sand at full attention
  const SILENCE_PIPS  = 1;         // what an unfilled pause costs
  const FLIP_PIPS     = 1;         // what turning the glass over costs
  const READ_MS       = 46;        // ms per character, roughly speaking aloud

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const copy  = (st) => JSON.parse(JSON.stringify(st));

  function speakTime(lines, secs){
    if (secs) return Math.round(secs * 1000);
    const chars = (lines || []).join(" ").length;
    return clamp(900 + chars * READ_MS, 900, 9000);
  }

  // How much sand this client's glass holds right now.
  function glassFor(tree, st){
    const full = Number(tree.pause) || DEFAULT_PAUSE;
    return Math.round(full * (0.55 + 0.45 * (st.patience / st.max)));
  }

  function start(tree, opts){
    opts = opts || {};
    const max = Math.max(1, Number(tree.patience) || 5);
    const st = {
      patience: max, max,
      used: [], revealed: [],
      caught: [], missed: [],
      silences: 0, runSilences: 0, flips: 0,
      maxFlips: opts.flips === undefined ? 1 : Math.max(0, opts.flips),
      speaking: speakTime(tree.opening),
      sand: 0, glass: 0,
      openWindow: null,            // a challenge id live during this glass
      log: (tree.opening || []).map((text) => ({ who: "them", text })),
      said: (tree.opening || []).slice(-1)[0] || "",
      ended: false, reason: null
    };
    st.glass = glassFor(tree, st);
    return st;
  }

  // A client who came to you with the brief already written has said it all.
  function premade(tree, needIds){
    const st = start(tree || {});
    st.revealed = (needIds || []).slice();
    st.speaking = 0; st.sand = 0;
    st.ended = true; st.reason = "premade";
    return st;
  }

  /* ── what you can ask right now ──────────────────────── */
  function baseOptions(tree, st){
    return Object.entries(tree.options || {})
      .filter(([id, o]) => !st.used.includes(id) && (o.requires || []).every((r) => st.used.includes(r)))
      .map(([id, o]) => ({ id, ask: o.ask, cost: o.cost === undefined ? 1 : Number(o.cost), end: !!o.end, challenge: false }));
  }

  // The open window, if you did the reading that earns it.
  function openChallenge(tree, st, facts){
    if (!st.openWindow) return null;
    const c = (tree.challenges || {})[st.openWindow];
    if (!c || st.used.includes(st.openWindow)) return null;
    if (c.needsFact && !(facts || []).includes(c.needsFact)) return null;
    return { id: st.openWindow, ask: c.ask, cost: c.cost === undefined ? 0 : Number(c.cost), end: false, challenge: true };
  }

  function available(tree, st, facts){
    if (st.ended || st.speaking > 0) return [];
    const open = openChallenge(tree, st, facts);
    return (open ? [open] : []).concat(baseOptions(tree, st));
  }

  /* ── time passing ────────────────────────────────────── */
  // dt is milliseconds. Returns a new state; call it from one timer.
  function tick(tree, st, dt){
    if (st.ended || !(dt > 0)) return st;
    const next = copy(st);

    if (next.speaking > 0){
      next.speaking = Math.max(0, next.speaking - dt);
      if (next.speaking > 0) return next;
      next.sand = next.glass = glassFor(tree, next);   // they stop; the glass turns
      return next;
    }

    next.sand -= dt;
    if (next.sand > 0) return next;
    return silence(tree, next);
  }

  // Nobody said anything, so they said something.
  function silence(tree, st){
    const next = st.ended ? st : copy(st);
    if (next.ended) return next;

    const fill = (tree.filler && tree.filler.length ? tree.filler : ["…anyway."]);
    const line = fill[next.silences % fill.length];
    next.log.push({ who: "them", text: line, filler: true });
    next.said = line;
    next.silences += 1;
    next.runSilences += 1;
    if (next.openWindow && !next.used.includes(next.openWindow)){
      next.missed.push(next.openWindow);
      next.openWindow = null;
    }
    next.patience = Math.max(0, next.patience - SILENCE_PIPS);

    if (next.patience <= 0) return leave(tree, next, "bored");
    if (next.runSilences >= 2) return leave(tree, next, "drifted");

    next.speaking = speakTime([line]);
    next.sand = next.glass = glassFor(tree, next);
    return next;
  }

  function leave(tree, st, reason){
    const next = copy(st);
    next.ended = true; next.reason = reason;
    next.speaking = 0; next.sand = 0; next.openWindow = null;
    for (const text of (tree.leave || ["I have to go."])) next.log.push({ who: "them", text });
    next.said = (tree.leave || ["I have to go."]).slice(-1)[0];
    return next;
  }

  /* ── asking ──────────────────────────────────────────── */
  function choose(tree, st, id, facts){
    if (st.ended || st.speaking > 0) return st;
    const live = available(tree, st, facts);
    const pick = live.find((a) => a.id === id);
    if (!pick) return st;

    const o = pick.challenge ? (tree.challenges || {})[id] : (tree.options || {})[id];
    const next = copy(st);

    next.used.push(id);
    next.log.push({ who: "you", text: o.ask, challenge: !!pick.challenge });
    for (const text of (o.reply || [])) next.log.push({ who: "them", text });
    next.said = (o.reply || []).slice(-1)[0] || next.said;
    for (const r of (o.reveals || [])) if (!next.revealed.includes(r)) next.revealed.push(r);

    if (pick.challenge){
      next.caught.push(id);
      next.openWindow = null;
    } else {
      // Any window this reply opens is live for the pause that follows it.
      const opened = Object.entries(tree.challenges || {})
        .find(([cid, c]) => c.after === id && !next.used.includes(cid));
      next.openWindow = opened ? opened[0] : null;
    }

    next.patience = Math.max(0, next.patience - pick.cost);
    next.runSilences = 0;
    next.mood = o.mood || null;
    next.speaking = speakTime(o.reply, o.secs);

    if (o.end){
      next.ended = true; next.reason = "wrapped";
      next.speaking = 0; next.sand = 0; next.openWindow = null;
      return next;
    }
    if (next.patience <= 0) return leave(tree, next, "bored");
    if (!baseOptions(tree, next).length && !openChallenge(tree, next, facts)){
      next.ended = true; next.reason = "exhausted";
      next.speaking = 0; next.sand = 0;
      return next;
    }
    next.sand = next.glass = glassFor(tree, next);   // refilled when they stop talking
    return next;
  }

  /* ── turning the glass over ──────────────────────────── */
  // "Sorry — give me a second." Buys back the pause, costs a pip.
  function canFlip(st){
    return !st.ended && st.speaking === 0 && st.flips < st.maxFlips && st.patience > FLIP_PIPS;
  }
  function flip(tree, st){
    if (!canFlip(st)) return st;
    const next = copy(st);
    next.flips += 1;
    next.patience = Math.max(0, next.patience - FLIP_PIPS);
    next.log.push({ who: "you", text: "Sorry — give me a second.", aside: true });
    next.sand = next.glass = glassFor(tree, next);
    return next;
  }

  /* ── readouts ────────────────────────────────────────── */
  const ratio  = (st) => (st.glass > 0 ? clamp(st.sand / st.glass, 0, 1) : 0);
  const seconds = (st) => Math.max(0, Math.ceil(st.sand / 1000));

  // How they look while you are deciding: the glass, read off the client.
  function mood(st){
    if (st.ended) return st.reason === "wrapped" ? "warm" : "gone";
    if (st.mood) return st.mood;
    if (st.speaking > 0) return "neutral";
    const r = ratio(st);
    if (r < 0.25) return "cool";
    return "neutral";
  }
  const glancing = (st) => !st.ended && st.speaking === 0 && ratio(st) < 0.25;

  // What the ticket says about how the meeting went.
  function summary(st){
    return {
      asked: st.used.length,
      caught: st.caught.slice(),
      missed: st.missed.slice(),
      silences: st.silences,
      flips: st.flips,
      ended: st.reason
    };
  }

  return { start, premade, available, tick, choose, flip, canFlip, silence,
           glassFor, ratio, seconds, mood, glancing, summary, speakTime,
           DEFAULT_PAUSE };
})();

if (typeof module !== "undefined") module.exports = HustleMeeting;
