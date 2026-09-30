"use strict";
/* ── the Princess Card Trick ──────────────────────────────
 * Dennis's pop-up game, for his wordmark gig. He deals five court cards and
 * you think of one. He gathers them up, shuffles, and shows four back: yours
 * is gone. It always is, because none of the four were dealt the first time:
 * each is a look-alike (the other suit of the same colour) of one of the five.
 * You catch him by noticing that, and saying which other card went too. The
 * trap is the look-alike of the one card he dropped: it was never dealt at
 * all, and it sounds right.
 *
 *   deal(seed)                 a round: { hand, shown, spare }
 *   claims(round, picked, s)   what you can say when your card is gone
 *   judge(claim)               "caught", "wrong" or "applause"
 *   seedFor(runSeed, play)     each go deals differently, the same every reload
 *   name(card)                 "the King of Spades"
 *
 * Pure: no DOM, no clock.
 */

const HustleCardTrick = (() => {
  const need = (g, path) => (typeof globalThis[g] !== "undefined" ? globalThis[g] : typeof require === "function" ? require(path) : null);
  const Runs = typeof HustleRuns !== "undefined" ? HustleRuns : need("HustleRuns", "./runs.js");

  const RANKS = ["J", "Q", "K", "A"];
  const SUITS = ["S", "H", "D", "C"];
  const RANK_NAME = { J: "Jack", Q: "Queen", K: "King", A: "Ace" };
  const SUIT_NAME = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" };
  const TWIN = { S: "C", C: "S", H: "D", D: "H" };        // the same colour, the other suit
  const red = (c) => c.s === "H" || c.s === "D";
  const same = (a, b) => !!a && !!b && a.r === b.r && a.s === b.s;
  const twin = (c) => ({ r: c.r, s: TWIN[c.s] });
  const name = (c) => "the " + RANK_NAME[c.r] + " of " + SUIT_NAME[c.s];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function shuffled(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Five courts, never a card and its look-alike together, so every one of
  // them has a look-alike to be swapped for. Four of those come back; the
  // fifth card (the spare) he simply keeps.
  function deal(seed) {
    const rnd = Runs.rng(seed >>> 0);
    const all = RANKS.flatMap((r) => SUITS.map((s) => ({ r, s })));
    const hand = [];
    for (const c of shuffled(all, rnd)) {
      if (hand.length === 5) break;
      if (hand.some((h) => same(h, c) || same(twin(h), c))) continue;
      hand.push(c);
    }
    const kept = shuffled([0, 1, 2, 3, 4], rnd);
    return { seed: seed >>> 0, hand, shown: kept.slice(0, 4).map((i) => twin(hand[i])), spare: kept[4] };
  }

  // Once your card has gone: applaud, or say another card went too. One claim
  // names a card from the five (true: they all went); the other names the
  // spare's look-alike, which sounds like it was there and never was.
  function claims(round, picked, seed = round.seed) {
    const rnd = Runs.rng((seed ^ 0x51ED270B) >>> 0);
    const others = round.hand.filter((c, i) => i !== picked);
    const truth = others[Math.floor(rnd() * others.length)];
    const lure = twin(round.hand[round.spare]);
    const say = (c) => "Hang on. " + cap(name(c)) + " has gone too. You changed every card.";
    const both = shuffled([{ kind: "true", card: truth, text: say(truth) }, { kind: "false", card: lure, text: say(lure) }], rnd);
    return both.concat([{ kind: "applause", text: "It's gone! Improbable!" }]);
  }

  const judge = (claim) => (!claim ? "applause" : claim.kind === "true" ? "caught" : claim.kind === "false" ? "wrong" : "applause");
  const seedFor = (runSeed, play) => ((runSeed >>> 0) ^ Math.imul((play | 0) + 1, 0x9E3779B1)) >>> 0;

  return { RANKS, SUITS, RANK_NAME, SUIT_NAME, deal, claims, judge, seedFor, name, twin, same, red };
})();

if (typeof module !== "undefined") module.exports = HustleCardTrick;
