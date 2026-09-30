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
    walk: "HustleWalk",
    micro: "HustleMicro",
  };

  /* ── the Millbrook market's people ───────────────────────
   * Who stands where (games/worlds.js has the market), what they look like,
   * and what they say when they have nothing to do with the job. A job's
   * walk takes the people it wants and gives some of them lines of their own. */
  const MARKET = {
    tori: { name: "Tori", at: [10, 11], face: "down", look: { skin: "#F2C9A8", hair: "#C0561F", top: "#D9482B", legs: "#3A2A1E", style: "bun", apron: "#F6EAD2" } },
    honey: { name: "The honey man", at: [8, 12], face: "down", look: { skin: "#C98B5F", hair: "#8E8E93", top: "#E8A628", legs: "#34344A", style: "bald", beard: true },
      talk: { start: { say: "Tori? Best neighbour I've had. She brings me a cup at eleven and I give her a jar at one." } } },
    mo: { name: "Mo", at: [12, 14], face: "up", look: { skin: "#8A5638", hair: "#1B1512", top: "#2E9A96", legs: "#2A2A2E" },
      talk: { start: { say: "Queue starts here. Well. The queue is me." } } },
    okafor: { name: "Mr. Okafor, who runs the market", at: [3, 8], face: "left", look: { skin: "#5A3520", hair: "#2B211A", top: "#3E8A3A", legs: "#34344A", style: "cap", hat: "#F2C62C" },
      talk: { start: { say: "Morning. Pitch fees are Fridays. Complaints are never." } } },
    ivy: { name: "Ivy", at: [19, 7], face: "down", wander: 2, look: { skin: "#E8B894", hair: "#D9C08A", top: "#E86A9A", legs: "#6B3FA0", style: "long" },
      talk: { start: { say: "Do you like soup? I like soup." } } },
    parsnip: { name: "Parsnip", at: [13, 10], face: "down", wander: 2, look: { cat: true, fur: "#D9822B" },
      talk: { start: { say: "Mrrp." } }, again: "Parsnip ignores you, with great dignity." },
    brad: { name: "Brad, of Broth Bros", at: [5, 4], face: "down", look: { skin: "#E0A87C", hair: "#1B1512", top: "#1A1A1A", legs: "#1A1A1A", style: "cap", hat: "#39FF14" },
      talk: { start: { say: "PROTEIN IN A CUP, BRO. Twelve broths. Zero excuses." } }, again: "You can see our neon from the car park." },
    dee: { name: "Dee, of Souper Star", at: [20, 13], face: "down", look: { skin: "#F7DCC2", hair: "#8A5AC8", top: "#9B3FE0", legs: "#FFD23F", style: "long" },
      talk: { start: { say: "You're a Souper Star! Twelve soups and one singing can. She's not singing now. She's charging." } } },
    veg: { name: "The veg grower", at: [11, 4], face: "down", look: { skin: "#A56A44", hair: "#3A2A1E", top: "#3E8A3A", legs: "#7A4A28", style: "cap", hat: "#7A4A28" },
      talk: { start: { say: "Carrots, leeks, parsnips. Tori buys the ugly ones. Soup doesn't mind." } } },
    baker: { name: "The baker", at: [16, 4], face: "down", look: { skin: "#FBE3D0", hair: "#E4E4E8", top: "#F4F1EA", legs: "#34344A", style: "bald", apron: "#F4F1EA" },
      talk: { start: { say: "Rolls to go with the soup? Tori sends people over. I send them back." } } },
    florist: { name: "The florist", at: [21, 4], face: "down", look: { skin: "#D29A6A", hair: "#5A2E2E", top: "#E8574A", legs: "#34344A", style: "bun" },
      talk: { start: { say: "Sunflowers are a pound. Tori says her cart needs flowers. I say it needs a sign." } } },
    knit: { name: "Maud, who knits", at: [18, 12], face: "down", look: { skin: "#F2C9A8", hair: "#E4E4E8", top: "#6B8FD8", legs: "#34344A", style: "bun", glasses: "#1A1418" },
      talk: { start: { say: "I'm knitting Parsnip a scarf. He won't wear it. He'll sit on it." } } },
  };
  // The market for one job: everyone, with `lines` (id → { talk, again? }) and extra people on top.
  const market = (lines, extra) => Object.entries(MARKET).map(([id, p]) => Object.assign({ id }, p, lines[id] || {})).concat(extra || []);
  const GREEN = { bg: "#16220F", panel: "#1F2E16", fg: "#F4F1EA", dim: "#9AB88A", hi: "#F2C62C", lo: "#0E160A" };

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

    // Tori's first job: the people at the market know the soup better than she can say it.
    "tori-sign": {
      engine: "walk", id: "market-sign", world: "millbrook", site: "torisladle.com",
      title: "SATURDAY MARKET — Millbrook", button: "Walk the market", icon: "gamepad", ink: GREEN,
      blurb: "A walk round the Millbrook Saturday Market, where Tori's cart is. Ask around. The research clock stops while you play.",
      intro: "Millbrook Saturday Market. Tori's cart is in Row C. Walk with the arrow keys and Space talks, or click. People here know the soup.",
      done: "That's what the market knows about the soup. It's on cards in your tray.",
      grants: ["onesoup", "hours", "parsley"],
      people: market({
        tori: { talk: {
          start: { say: "Oh, hello! You found me. I'm stirring, so ask around: people know this cart better than I do.", opts: [["What should the sign say?", "sign"], ["I'll look around", null]] },
          sign: { say: "Whatever's true. I'm no good at saying it short. That's why I asked you." },
        } },
        mo: { talk: {
          start: { say: "Queue starts here. Well. The queue is me.", opts: [["What's the soup today?", "soup"], ["Never mind", null]] },
          soup: { say: "No idea till she lifts the lid. It's only ever one soup, and she makes it that morning. One soup a day. That's the whole idea.", grant: "onesoup" },
        }, again: "Still queueing. Still worth it." },
        okafor: { talk: {
          start: { say: "Morning. Pitch fees are Fridays. Complaints are never.", opts: [["When's the market on?", "hours"], ["Thanks", null]] },
          hours: { say: "Saturdays, eight till one. Rain or shine. Mostly rain.", grant: "hours" },
        }, again: "Eight till one. It's on the board." },
        ivy: { talk: {
          start: { say: "Do you like soup? I like soup.", opts: [["Do you like Tori's?", "tori"], ["Bye, Ivy", null]] },
          tori: { say: "Yes! But she puts green on top. A little bit of parsley. I pick it off and give it to the cat.", grant: "parsley" },
        }, again: "The cat doesn't eat the parsley either." },
      }),
      things: {
        timetable: { name: "The market board", talk: { start: { say: "MILLBROOK SATURDAY MARKET. SATURDAYS, 8 TILL 1. Somebody has drawn a cat in the corner.", grant: "hours" } } },
        cart: { name: "Tori's cart", talk: { start: { say: "A pizza box, propped on the front. TORI'S LADLE, in marker." } } },
      },
    },

    // Her website: where to find her, and who made the last one.
    "tori-site": {
      engine: "walk", id: "market-site", world: "millbrook", site: "torisladle.com",
      title: "SATURDAY MARKET — Millbrook", button: "Walk the market", icon: "gamepad", ink: GREEN,
      blurb: "Back to the Saturday Market: where is Tori's cart, exactly? The research clock stops while you play.",
      intro: "Millbrook Saturday Market, again. A website has to say where she is. Walk with the arrow keys and Space talks, or click.",
      done: "That's what the market can tell a website. It's on cards in your tray.",
      grants: ["rowc", "nephew"],
      people: market({
        tori: { talk: { start: { say: "The website! I'd just like people to find me. And maybe know what the soup is before they get here." } } },
        honey: { talk: {
          start: { say: "Looking for Tori? You've found her. And me.", opts: [["Where is she, exactly? It's for her website.", "where"], ["Just browsing", null]] },
          where: { say: "Row C, next to the honey man. That's me. Twenty years in this pitch; she's had the one beside me for three.", grant: "rowc" },
        }, again: "Row C. Next to the honey. You can't miss it. People do." },
      }, [
        { id: "milo", name: "Milo, Tori's nephew", at: [13, 8], face: "down", wander: 2,
          look: { skin: "#F2C9A8", hair: "#C0561F", top: "#2F6FC0", legs: "#34344A" },
          talk: {
            start: { say: "Are you the website person? I made the website. The old one.", opts: [["You made it?", "made"], ["Bye, Milo", null]] },
            made: { say: "When I was six! It has a visitor counter. Nine visitors. Five were me. I'm nine now, so it's old.", grant: "nephew" },
          },
          again: "Don't delete the counter. Or do. I'm nine." },
      ]),
      things: {
        cart: { name: "Tori's cart", talk: { start: { say: "A pizza box, propped on the front. TORI'S LADLE, in marker." } } },
      },
    },

    // Ines's game, as she sent it: the shop works, the shopkeeper isn't drawn.
    "pell-sprite": {
      engine: "walk", id: "thimblewick", world: "thimblewick", site: "thimblewickgame.net",
      title: "THIMBLEWICK — dev build 0.14", button: "Play the build", icon: "gamepad",
      ink: { bg: "#1A1426", panel: "#231B33", fg: "#F4EAD8", dim: "#A898C8", hi: "#FFD27A", lo: "#120E1C" },
      blurb: "Ines's game, as she sent it. The shop's open; its shopkeeper isn't drawn yet. The research clock stops while you play.",
      intro: "Thimblewick, dev build 0.14. The shop works. The shopkeeper doesn't exist yet, but the village knows her. Arrow keys to walk, Space talks.",
      done: "That's what Thimblewick knows about Mrs. Pell. It's on cards in your tray.",
      grants: ["pell", "wardrobe", "rules"],
      people: [
        { id: "bram", name: "Bram, the baker", at: [6, 7], face: "down",
          look: { skin: "#E0A87C", hair: "#E4E4E8", top: "#F4F1EA", legs: "#5A4028", style: "bald", apron: "#F4F1EA", beard: true },
          talk: {
            start: { say: "Evening. The bread's done for the day. The buns are not.", opts: [["Who keeps the shop?", "pell"], ["Evening", null]] },
            pell: { say: "Mrs. Pell. Retired tailor, sixty-eight. Keeps the shop open because she's bored at home. Don't tell her I said bored.", grant: "pell" },
          },
          again: "She'll measure you, if you stand still long enough." },
        { id: "wren", name: "Wren", at: [17, 8], face: "left", wander: 2,
          look: { skin: "#8A5638", hair: "#1B1512", top: "#C8527A", legs: "#3A4A6E", style: "long" },
          talk: {
            start: { say: "Are you looking for Mrs. Pell? You'll know her when you see her.", opts: [["How will I know her?", "look"], ["Maybe later", null]] },
            look: { say: "Green cardigan, one button missing. A yellow tape measure round her neck, always. She measured my dog. Twice.", grant: "wardrobe" },
          },
          again: "The dog was the same size both times." },
        { id: "ines", name: "Ines, who made all this", at: [21, 13], face: "right",
          look: { skin: "#F2C9A8", hair: "#5A2E2E", top: "#3A4A6E", legs: "#2A2A2E", style: "bun", glasses: "#1A1418" },
          talk: { start: { say: "Oh! You found the dev room. Nobody finds the dev room. If you're drawing for me, the rules are on the board." } },
          again: "The devlog goes up on Fridays, news or not." },
        { id: "halden", name: "Halden, on contract", at: [5, 9], face: "up",
          look: { skin: "#E0A87C", hair: "#3A2A1E", top: "#6E5640", legs: "#34344A", beard: true },
          talk: { start: { say: "I do the music. This loop is fourteen seconds long. You've heard it eleven times." } } },
        { id: "cat", name: "A cat", at: [15, 10], face: "down", wander: 3, look: { cat: true, fur: "#8A8A96" },
          talk: { start: { say: "This cat has been placed here to test the pathfinding. It is doing very well." } } },
      ],
      things: {
        missing: { name: "Behind the counter", talk: { start: { say: "Where the shopkeeper should stand: a pink and black square, and a note in the code. pell.png, TODO." } } },
        rules: { name: "The dev room's notice", talk: { start: { say: "ART RULES. Every character sprite is 32 × 32. Eight colours, at most. A dark 1px outline on everything that moves.", grant: "rules" } } },
        shop: { name: "Pell's", talk: { start: { say: "PELL'S: threads, buttons, mending. OPEN, says the sign. Nobody inside to say it." } } },
      },
    },

    // Where the Big Duck was seen, and the people who saw it.
    "weird-things-4": {
      engine: "walk", id: "reservoir", world: "reservoir", site: "weirdthingszine.net",
      title: "CARVEL RESERVOIR — the north shore", button: "Go to the reservoir", icon: "gamepad",
      ink: { bg: "#142230", panel: "#1B2C3C", fg: "#EEF4F8", dim: "#8EA8BC", hi: "#FF48B0", lo: "#0C1620" },
      blurb: "The north shore of Carvel Reservoir, where the Big Duck was seen. The witnesses are still about. The research clock stops while you play.",
      intro: "Carvel Reservoir, the north shore, just after dawn. This is where they saw it. Arrow keys to walk, Space talks. Keep an eye on the water.",
      done: "That's what the shore can tell you. It's on cards in your tray.",
      grants: ["witnesses", "canoe", "twoinks"],
      people: [
        { id: "ray", name: "Ray, fishing", at: [12, 3], face: "up",
          look: { skin: "#C98B5F", hair: "#8E8E93", top: "#3E6A44", legs: "#34344A", style: "cap", hat: "#C8252C" },
          talk: { start: { say: "It looked at me like I owed it money. I don't owe it money. I checked." } } },
        { id: "pete", name: "Pete, fishing", at: [13, 5], face: "right",
          look: { skin: "#F2C9A8", hair: "#A8752F", top: "#E8C24A", legs: "#2A2A2E", beard: true },
          talk: {
            start: { say: "You here about the duck?", opts: [["How big was it?", "size"], ["Just looking", null]] },
            size: { say: "About the size of a canoe. Bigger, maybe. I know canoes. I've fallen out of most of them.", grant: "canoe" },
          },
          again: "A canoe. With a neck." },
        { id: "sal", name: "Sal", at: [17, 9], face: "up",
          look: { skin: "#5A3520", hair: "#1B1512", top: "#2E6A9A", legs: "#34344A", style: "cap", hat: "#3E6A44" },
          talk: { start: { say: "I didn't see it. I heard it. HONK. Not a goose honk. A big honk." } } },
        { id: "dot", name: "Dot, who delivers the post", at: [19, 14], face: "left",
          look: { skin: "#E0A87C", hair: "#6B4A2B", top: "#2F6FC0", legs: "#1B2A4A", style: "cap", hat: "#2F6FC0" },
          talk: {
            start: { say: "Nineteen years I've delivered on that road. That was not a goose.", opts: [["Who else saw it?", "who"], ["Morning", null]] },
            who: { say: "Four of us. The three fishermen on the pier, and me, from the van. Ray, Pete and Sal. Sal says he only heard it. Sal saw it.", grant: "witnesses" },
          },
          again: "Not a goose." },
        { id: "june", name: "June, from the Hollis Street library", at: [7, 11], face: "right",
          look: { skin: "#FBE3D0", hair: "#8E8E93", top: "#8A5AC8", legs: "#34344A", style: "bun", glasses: "#1A1418" },
          talk: {
            start: { say: "I'm only here for the walk. And the duck.", opts: [["Do you know Alex, who makes the zine?", "riso"], ["Enjoy the walk", null]] },
            riso: { say: "Alex prints it at our library, on the risograph. Two inks, fluorescent pink and blue. We don't have black. We have never had black.", grant: "twoinks" },
          },
          again: "There is no black. People ask." },
        { id: "alex", name: "Alex", at: [10, 11], face: "down", wander: 1,
          look: { skin: "#D29A6A", hair: "#FF48B0", top: "#3255A4", legs: "#2A2A2E", style: "long" },
          talk: { start: { say: "you came!! ok. it was here. right here. talk to everyone, they all saw it. well. most of them." } } },
      ],
      things: {},
    },

    // Nell made a fan game. Of course she did. It's about the relay.
    "otp-banner": {
      engine: "micro", id: "relay", site: "thebatonpass.net", scene: "track",
      title: "RELAY RUN — The Baton Pass", name: "RELAY RUN", button: "Relay Run", icon: "gamepad",
      ink: { bg: "#1E1430", panel: "#2A1C40", fg: "#FFF1E0", dim: "#B89AC8", hi: "#F07A1C", lo: "#140C22" },
      blurb: "Nell's fan game: a run of tiny relay games, a few seconds each. The research clock stops while you play.",
      intro: "RELAY RUN!! a fan game i made. one word, then do it before the fuse burns out. Space or click. arrows to move.",
      go: "GO GO GO",
      more: "there's more lore in it if u keep going!!",
      done: "that's all the lore i hid in it lol",
      grants: ["sweatband", "fringe", "ep12"],
      cast: { runner: { skin: "#F2C9A8", hair: "#5A2E1E", top: "#F07A1C", legs: "#1B2A4A" } },
      games: [
        { kind: "mash", cmd: "RUN!", art: "run", need: 12, color: "#F07A1C", hint: "SPACE SPACE SPACE" },
        { kind: "catch", cmd: "CATCH!", good: "band", bad: "bottle", need: 2, catcher: "hands", color: "#F07A1C", hint: "THE ORANGE BAND",
          grant: "sweatband", say: "Toma's orange sweatband. He never races without it. It's in every episode's key art, if you look." },
        { kind: "pick", cmd: "FIND KIYOSHI!", hint: "FRINGE OVER HIS LEFT EYE", answer: 0, options: [
          { head: { skin: "#F7DCC2", hair: "#1B1512", top: "#1B2A4A", fringe: "left" } },
          { head: { skin: "#F7DCC2", hair: "#1B1512", top: "#1B2A4A", fringe: "right" } },
          { head: { skin: "#F2C9A8", hair: "#5A2E1E", top: "#F07A1C", band: "#F07A1C", cowlick: true } },
        ], grant: "fringe", say: "Kiyoshi's fringe always covers his left eye. Always. The forum keeps a list of the three frames where it doesn't." },
        { kind: "timing", cmd: "ZIP UP!", art: "zip", zone: [0.84, 0.97], v: 0.95, color: "#4A5E96", hint: "RIGHT TO THE TOP" },
        { kind: "dodge", cmd: "DODGE!", items: ["cam", "bottle"], hint: "NO PHOTOS", cast: "runner" },
        { kind: "mash", cmd: "FINISH!", art: "run", need: 14, color: "#E8805A", hint: "THE FINAL, AT DUSK",
          grant: "ep12", say: "Episode 12: the relay final, run at dusk. Nell cried. Nell says everyone cried." },
      ],
    },

    // The crew training on the Burger Baron site, which Dwayne found and does not mention.
    "baron-burrito": {
      engine: "micro", id: "drivethru", site: "burgerbaron.com", scene: "drive",
      title: "DRIVE-THRU — Burger Baron #214", name: "DRIVE-THRU", button: "Work the window", icon: "gamepad",
      ink: { bg: "#2A1010", panel: "#3A1616", fg: "#FFF4D6", dim: "#E0A89A", hi: "#FFC72C", lo: "#1C0A0A" },
      blurb: "The crew training game on the Burger Baron site: a shift at the window, a few seconds a job. The research clock stops while you play.",
      intro: "CREW TRAINING, STORE #214. Do what the word says before the fuse burns out. Space or click; arrows to move.",
      go: "Your shift starts now.",
      more: "Keep going. The training has more to teach.",
      done: "Training complete. The Baron salutes you. He is not holding anything.",
      grants: ["crownrule", "bestword", "opens"],
      cast: { dodger: { skin: "#F2C9A8", hair: "#FFC72C", top: "#C8102E", legs: "#3A1A10", style: "cap", hat: "#FFC72C" } },
      games: [
        { kind: "mash", cmd: "WRAP!", art: "wrap", need: 11, color: "#FFC72C", hint: "ONE BURRITO" },
        { kind: "balance", cmd: "LEVEL!", hint: "KEEP THE CROWN STRAIGHT",
          grant: "crownrule", say: "Brand standards: the crown is never tilted and never cropped. Not by a degree. Not for a burrito." },
        { kind: "pick", cmd: "PICK ONE!", hint: "WHAT CAN WE PRINT?", answer: 0, options: [
          { text: "A BREAKFAST\nBURRITO" }, { text: "THE BEST\nBURRITO" }, { text: "BEST IN\nTOWN" },
        ], grant: "bestword", say: "Never use the word best. Legal has asked twice. Dwayne printed both emails." },
        { kind: "catch", cmd: "CATCH!", good: "hash", bad: "drink", need: 2, catcher: "tray", hint: "HASH BROWNS ONLY" },
        { kind: "timing", cmd: "OPEN UP!", art: "clock", zone: [0.74, 0.84], v: 0.8, color: "#3E8A3A", hint: "AT SIX SHARP",
          grant: "opens", say: "Store #214 opens at 6am, every day of the year. Dwayne is in at half past four." },
        { kind: "dodge", cmd: "HANDS OFF!", hint: "THE BARON HOLDS NOTHING" },
      ],
    },

    // Friday night, soup for the morning; Tori narrates.
    "tori-mark": {
      engine: "micro", id: "kitchen", site: "torisladle.com", scene: "kitchen",
      title: "SOUP'S ON — Tori's kitchen", name: "SOUP'S ON", button: "Help in the kitchen", icon: "gamepad",
      ink: { bg: "#2A1810", panel: "#3A2216", fg: "#FBF4E6", dim: "#D8B89A", hi: "#D9482B", lo: "#1C100A" },
      blurb: "Friday night in Tori's kitchen, making the morning's soup, a few seconds a job. The research clock stops while you play.",
      intro: "Friday night, soup for the morning. One word, then do it before the fuse burns down. Space or click; arrows to move.",
      go: "Aprons on!",
      more: "Keep going! There's more to learn in here. There's always more to learn.",
      done: "That's everything my kitchen can teach you. Gold star.",
      grants: ["parsley", "hat"],
      games: [
        { kind: "mash", cmd: "STIR!", art: "stir", need: 12, color: "#D9482B", hint: "ROUND AND ROUND" },
        { kind: "drop", cmd: "GARNISH!", hint: "ON THE SOUP",
          grant: "parsley", say: "A little parsley green on top. A little. Never a lot. That's the whole look of it." },
        { kind: "pick", cmd: "SPOT THE SPOON!", hint: "IT'S WEARING A HAT", answer: 0, options: [{ art: "spoonhat" }, { art: "spoon" }, { art: "hat" }],
          grant: "hat", say: "That's my old logo! Milo drew it when he was six. Everyone says it looks like a spoon wearing a hat. It's a ladle." },
        { kind: "catch", cmd: "CATCH!", good: "carrot", bad: "sock", need: 2, catcher: "bowl", hint: "CARROTS, NOT SOCKS" },
        { kind: "timing", cmd: "LADLE!", art: "ladle", zone: [0.42, 0.58], v: 1, color: "#D9482B", hint: "INTO THE CUP" },
      ],
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
