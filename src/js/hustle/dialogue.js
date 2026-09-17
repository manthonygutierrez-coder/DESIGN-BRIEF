"use strict";
/* ── briefing conversations ──────────────────────────────
 * A client you approached does not hand you a brief. You get one by asking,
 * and they only have so much attention for you.
 *
 *   tree = {
 *     patience: 6,
 *     opening: ["hiii", "ok so"],
 *     options: {
 *       ship:  { ask: "Who's the pairing?", reply: ["TOMA AND KIYOSHI"], reveals: ["names"], cost: 1 },
 *       ep12:  { ask: "What happens in ep 12?", reply: [...], requires: ["vibe"], reveals: ["mood"] },
 *       money: { ask: "Can you pay more?", reply: ["no :("], cost: 2, mood: -1 },
 *       done:  { ask: "Got it, thanks.", reply: ["yay!!"], end: true, cost: 0 },
 *     },
 *     leave: ["ok gtg"],        // said when patience runs out
 *   }
 *
 * Options are one-shot. `requires` hides a follow-up until its parent was
 * asked. What a conversation `reveals` is what ends up written on the ticket —
 * the needs you never asked about still count when the work is scored, you
 * just never found out about them. Pure functions; state is plain JSON.
 */

const HustleDialogue = (() => {
  function start(tree) {
    return {
      patience: Math.max(1, Number(tree.patience) || 5),
      max: Math.max(1, Number(tree.patience) || 5),
      used: [],
      revealed: [],
      log: (tree.opening || []).map((text) => ({ who: "them", text })),
      ended: false,
      reason: null,
    };
  }

  function available(tree, st) {
    if (st.ended) return [];
    return Object.entries(tree.options || {})
      .filter(([id, o]) => !st.used.includes(id) && (o.requires || []).every((r) => st.used.includes(r)))
      .map(([id, o]) => ({ id, ask: o.ask, end: !!o.end }));
  }

  // Returns a new state; never mutates the one passed in.
  function choose(tree, st, id) {
    const o = tree.options && tree.options[id];
    if (!o || st.ended || !available(tree, st).some((a) => a.id === id)) return st;
    const next = JSON.parse(JSON.stringify(st));
    next.used.push(id);
    next.log.push({ who: "you", text: o.ask });
    for (const text of o.reply || []) next.log.push({ who: "them", text });
    for (const r of o.reveals || []) if (!next.revealed.includes(r)) next.revealed.push(r);
    next.patience = Math.max(0, next.patience - (o.cost === undefined ? 1 : Number(o.cost)));
    if (o.end) {
      next.ended = true;
      next.reason = "wrapped";
    } else if (next.patience <= 0) {
      next.ended = true;
      next.reason = "bored";
      for (const text of tree.leave || ["I have to go."]) next.log.push({ who: "them", text });
    } else if (!available(tree, next).length) {
      next.ended = true;
      next.reason = "exhausted";
    }
    return next;
  }

  // A client who arrives with a brief already written has told you everything.
  function premade(tree, needIds) {
    const st = start(tree || {});
    st.revealed = needIds.slice();
    st.ended = true;
    st.reason = "premade";
    return st;
  }

  return { start, available, choose, premade };
})();

if (typeof module !== "undefined") module.exports = HustleDialogue;
