"use strict";
/* ── research games: which gig has which, and what each can win ──
 * Every gig hides a game somewhere in its client's world, each a different
 * kind of play: Dennis's card trick, a walk round a market, a run of
 * one-word microgames, a memory table, a spoiler sweep, a rhythm, a picture
 * puzzle. Playing is never needed, since everything a need rests on is on
 * the pages; it is another way to find it. What a game can win is a fact,
 * exactly as if it had been clipped (the same card, counted the same), or a
 * flavour card (a colour, a line). Never a trend and never the gap: those are
 * what comparing rivals is for.
 *
 *   GAMES          gig id → { engine, id, site, title, button, blurb, ink, grants, … }
 *                  the engine's own content rides along in the same object
 *   of(gigId)      the gig's game, or null
 *   ENGINES        engine → the global that plays it
 *   register(engine, player), player(engine)   each engine registers itself
 *   problems(gigs) what is wrong with the games as written, for tests
 *
 * Pure: no DOM. The engines are in games/; Hustle (hustle.js) opens them,
 * stops the research clock while one has your attention, and grants what
 * they win.
 */

const HustleGames = (() => {
  const ENGINES = {
    cards: "HustleCardGame",
  };

  const GAMES = {
    // A 2004 site: of course there's a pop-up. The trick's rules are in
    // cardtrick.js, the show in cardgame.js. It wins no facts: a signature
    // card and his colours, and a tool lent for the job.
    "dennis-wordmark": {
      engine: "cards", id: "cardtrick", site: "improbabledennis.com", popup: true,
      title: "PICK A CARD! — The Improbable Dennis", button: "Pick a card", icon: "cards",
      ink: { bg: "#170A26", panel: "#2A1240", fg: "#FFF4D6", dim: "#9C7CC0", hi: "#E0B83A", lo: "#10061C" },
      blurb: "Dennis's card trick. The research clock stops while you play.",
      grants: [],
      prize: {
        cards: [
          { kind: "fact", label: "His signature card: the King of Spades, in black and gold", value: "Dennis ends every card trick on the King of Spades, from a black-and-gold deck. \"Black and gold, like the act.\"", tags: ["signature"] },
          { kind: "colour", label: "Card-back black", value: "#141414", tags: ["black"] },
          { kind: "colour", label: "Deck gold", value: "#D4AF37", tags: ["gold"] },
        ],
        loan: "align",
        note: "His signature card and his black and gold are on cards in your tray, and he's lent you Align for this job.",
        says: "It's on a card in your tray, with my black and gold. And borrow my Align, for this job only.",
      },
    },
  };

  const of = (gigId) => GAMES[gigId] || null;

  // The engines say who they are as they load (a top-level const is not a
  // property of the window, so they cannot be looked up by name).
  const players = {};
  const register = (engine, player) => { players[engine] = player; };
  const player = (engine) => players[engine] || null;

  // Everything a game might hand over, as [{ kind, id? , tags? }]: its fact
  // grants, and its prize cards.
  function winnings(spec) {
    const facts = (spec.grants || []).map((id) => ({ kind: "fact", id }));
    const prize = ((spec.prize && spec.prize.cards) || []).map((c) => ({ kind: c.kind, tags: c.tags || [] }));
    return facts.concat(prize);
  }

  // gigs: id → gig (content.js and tutorial.js). A game must sit on a real
  // gig, be played by a known engine, grant only that gig's own facts, and
  // never anything tagged with the gig's gap or a trend.
  function problems(gigs) {
    const out = [];
    for (const [id, spec] of Object.entries(GAMES)) {
      const gig = gigs[id];
      if (!gig) { out.push(id + ": no such gig"); continue; }
      if (!ENGINES[spec.engine]) out.push(id + ": unknown engine " + spec.engine);
      for (const k of ["id", "site", "title", "button", "blurb"]) if (!spec[k]) out.push(id + ": no " + k);
      const sites = [gig.poster && gig.poster.site, gig.site].filter(Boolean);
      if (!sites.includes(spec.site)) out.push(id + ": plays on " + spec.site + ", not the client's site");
      const gap = gig.gap && gig.gap.tag;
      for (const w of winnings(spec)) {
        if (w.kind === "trend") out.push(id + ": grants a trend");
        if (w.kind === "fact" && w.id) {
          const f = (gig.facts || []).find((x) => x.id === w.id);
          if (!f) { out.push(id + ": grants " + w.id + ", which is not one of its facts"); continue; }
          if (gap && (f.tags || []).includes(gap)) out.push(id + ": grants the gap through " + w.id);
        }
        if (gap && (w.tags || []).includes(gap)) out.push(id + ": a prize card carries the gap");
      }
      const ids = Object.values(GAMES).filter((s) => s.id === spec.id);
      if (ids.length > 1) out.push(id + ": game id " + spec.id + " is used twice");
    }
    return [...new Set(out)];
  }

  return { GAMES, ENGINES, of, register, player, winnings, problems };
})();

if (typeof module !== "undefined") module.exports = HustleGames;
