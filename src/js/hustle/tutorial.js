"use strict";
/* ── Tori's Ladle: the Design Suite, one gig at a time ─────
 * A tutorial chain. Tori L. sells one soup a day from a cart at the Millbrook
 * Saturday Market; her cat picks which. She taught kindergarten for eleven
 * years and does everything one step at a time, so each job she sends is
 * small, builds on the one before, and teaches one part of the suite:
 *
 *   1  tori-sign     Vector: shapes, colour, words            (cart sign)
 *   2  tori-menu     guides and the focus grid                (menu board)
 *   3  tori-mark     shapes, mirrors, the shape builder       (logo mark)
 *   4  tori-sticker  words on a curve, the pen, points        (lid sticker)
 *   5  tori-icon     Pixel                                    (app icon)
 *   6  tori-site     Layout                                   (website)
 *
 * Each delivery comes back as a card for the next job (the sign goes on the
 * board, the mark in the sticker and the icon, the sticker on the site), and
 * each gig's `teach` (see lessons.js) lights up the controls it is about in
 * the suite while you work. After the first call, Tori sends complete briefs
 * by Pager (`brief: "pager"`): the lessons are about making things.
 *
 * Kept apart from content.js so the chain can grow on its own; it registers
 * itself into HUSTLE when it loads.
 */

const HustleTutorial = (() => {
  const H = typeof HUSTLE !== "undefined" ? HUSTLE : typeof require === "function" ? require("./content.js") : null;
  const SITE = "torisladle.com", BB = "brothbros.com", SS = "souperstar.net";
  const poster = { handle: "tori_l", name: "Tori L.", site: SITE };
  const rivals = [BB, SS];
  const OF = 6;

  /* ── Tori ──────────────────────────────────────────────── */
  const people = {
    tori_l: {
      name: "Tori Lindqvist", role: "Soup maker", co: "Tori's Ladle", dom: SITE,
      // A former kindergarten teacher: she will wait a long time for an answer.
      pause: 19000,
      look: { skin: "#EDB892", hair: "#9A4A28", style: "bun", specs: "round", facial: "none",
              extra: "earrings", build: "regular", age: "mid", band: "#D9482B" },
      framing: "call",
      room: [
        { p: "window",  x: 0.03, y: 0.08, w: 0.26, h: 0.40 },
        { p: "shelf",   x: 0.70, y: 0.10, w: 0.27, h: 0.24 },
        { p: "plant",   x: 0.06, y: 0.56, w: 0.16, h: 0.30 },
        { p: "clock",   x: 0.76, y: 0.44, w: 0.14, h: 0.18 },
      ],
      bio: "Taught kindergarten for eleven years, then bought a soup cart. Sells one soup a day at the Millbrook Saturday Market; Parsnip, her cat, picks which by sitting on a recipe card. Her sign is a pizza box.",
      lore: "Gives out gold stars. Old habits.",
    },
  };

  /* ── the sites ────────────────────────────────────────── */
  const sites = {
    [SITE]: {
      who: "Tori Lindqvist", role: "Soup maker", co: "Tori's Ladle", dom: SITE, frame: "paper",
      theme: {
        bg: "#FBF4E6", panel: "#F3E3C3", ink: "#3A2418", dim: "#8A6A55", line: "#E3CFA8",
        brand: "#D9482B", brand2: "#5E8C3A", link: "#B23A21", onBrand: "#FFFFFF",
        head: "Georgia, serif", body: "Georgia, serif", mark: "disc", markText: "TL",
      },
      site: {
        tagline: "One soup a day. Parsnip picks it.",
        foot: "© Tori's Ladle. Site by my nephew, age nine.",
        nav: [["Home", "/"], ["Soups", "/soups"], ["About", "/about"], ["Questions", "/faq"]],
        pages: {
          "/": [
            { t: "lede", p: "Tori's Ladle is a soup cart at the Millbrook Saturday Market, 8 till 1. One soup a day, made that morning." },
            { t: "notice", h: "NEW! A real sign", p: "Our sign is a pizza box with TORI'S LADLE on it in marker. It served us well. A real one is coming.", stamp: "SOON" },
            { t: "swatches", h: "Our colours", items: [
              { c: "#D9482B", n: "Tomato", m: "the soup" },
              { c: "#F6EAD2", n: "Cream", m: "the swirl on top" },
              { c: "#5E8C3A", n: "Parsley", m: "a little, on top" },
            ] },
            { t: "stats", items: [{ n: "1", l: "soup a day" }, { n: "1", l: "cat in charge" }, { n: "11", l: "years teaching kindergarten" }] },
          ],
          "/soups": [
            { t: "prose", h: "Parsnip's recipe cards", ps: [
              "Every Friday night Parsnip sits on one of the recipe cards, and that is Saturday's soup.",
              "The cards: tomato and red lentil, leek and potato, pumpkin, minestrone, green pea and mint, and mushroom and barley.",
              "The chalkboard lists all six. When it rains, the chalkboard runs.",
            ] },
          ],
          "/about": [
            { t: "prose", h: "About Tori", ps: [
              "I taught kindergarten for eleven years. Now I make soup, one step at a time.",
              "My nephew drew our ladle logo when he was six. It looks like a spoon wearing a hat.",
              "Our colours are tomato red and cream, with a little parsley green on top, like a good bowl of soup.",
              "One day I would like stickers for the cup lids, with our name going round the edge.",
              "I give out gold stars. Old habits.",
            ] },
          ],
          "/faq": [
            { t: "faq", h: "Questions people ask", items: [
              { q: "Can I choose the soup?", a: "No. Parsnip chooses. It's better this way." },
              { q: "Is there an app?", a: "The market has an app. Every stall gets a tiny picture, 32 by 32. Mine is blank." },
              { q: "Where are you?", a: "Row C at the Millbrook Saturday Market, next to the honey man." },
              { q: "Do you have a website?", a: "You are on it. My nephew made it. He is nine now." },
            ] },
          ],
        },
      },
      refs: ["soup bowl steam", "wooden ladle", "tabby cat", "farmers market stall", "chalkboard menu"],
    },

    // Two brothers, one ladle, a lot of protein.
    [BB]: {
      who: "Brad & Chad", role: "", co: "Broth Bros", dom: BB, frame: "neon",
      theme: {
        bg: "#0A0A0A", panel: "#141414", ink: "#EFFFE9", dim: "#8FA88A", line: "#1F2A1C",
        brand: "#39FF14", brand2: "#0A0A0A", link: "#39FF14", onBrand: "#0A0A0A",
        head: "Impact, 'Arial Black', sans-serif", body: "Arial, Helvetica, sans-serif", mark: "slab", markText: "BB",
      },
      site: {
        tagline: "PROTEIN IN A CUP.",
        strap: "row a · by the parking lot · you can't miss us",
        nav: [["Home", "/"], ["Menu", "/menu"], ["The brand", "/brand"]],
        pages: {
          "/": [
            { t: "lede", p: "PROTEIN IN A CUP. TWELVE BROTHS. ZERO EXCUSES." },
            { t: "notice", h: "FIND US", p: "Look for the neon. Our neon sign can be seen from the parking lot.", stamp: "GAINS" },
            { t: "stats", items: [{ n: "32g", l: "protein a cup" }, { n: "12", l: "broths, all beef" }] },
          ],
          "/menu": [
            { t: "prose", h: "THE MENU", ps: [
              "Every cup lists its grams of protein, in huge numbers.",
              "Twelve broths, all beef, all day.",
              "Prices in huge numbers too: $9 A CUP.",
            ] },
          ],
          "/brand": [
            { t: "prose", h: "THE BRAND", ps: [
              "Our logo is a flexing arm holding a ladle like a dumbbell.",
              "Every cup gets a sticker that says CRUSH IT.",
              "Our app icon is a dumbbell. Tap it. Feel it.",
              "Our site has a countdown to the next market, down to the second.",
            ] },
          ],
        },
      },
      refs: ["neon sign", "gym dumbbell"],
      trends: [
        { id: "bb-caps", label: "Everything in capitals", match: ["zero excuses"], tags: ["trend-caps"] },
        { id: "bb-neon", label: "A neon sign", match: ["neon sign"], tags: ["trend-neon"] },
        { id: "bb-protein", label: "Grams of protein on everything", match: ["grams of protein"], tags: ["trend-protein"] },
        { id: "bb-prices", label: "Prices in huge numbers", match: ["prices in huge numbers"], tags: ["trend-prices"] },
        { id: "bb-flex", label: "A flexing arm", match: ["flexing arm"], tags: ["trend-flex"] },
        { id: "bb-crush", label: "CRUSH IT on every lid", match: ["crush it"], tags: ["trend-crush"] },
        { id: "bb-icon", label: "A dumbbell for an icon", match: ["app icon is a dumbbell"], tags: ["trend-dumbbell"] },
        { id: "bb-countdown", label: "A countdown timer", match: ["countdown to the next market"], tags: ["trend-countdown"] },
      ],
    },

    // A food truck with a singing mascot and a pun for everything.
    [SS]: {
      who: "Dee Campbell", role: "", co: "Souper Star", dom: SS, frame: "saas",
      theme: {
        bg: "#FFF6FB", panel: "#FFE3F3", ink: "#3B1E54", dim: "#8A6AA0", line: "#F5C2E3",
        brand: "#9B3FE0", brand2: "#FFD23F", link: "#9B3FE0", onBrand: "#FFFFFF",
        head: "'Comic Sans MS', 'Chalkboard SE', cursive", body: "Helvetica, Arial, sans-serif", mark: "disc", markText: "S*",
      },
      site: {
        tagline: "You're a Souper Star!",
        navCta: "Find the truck",
        hero: { h: "You're a Souper Star!", p: "Twelve soups, one singing can, and more puns than you can handle.", cta: "Find the truck" },
        nav: [["Home", "/"], ["Soups", "/soups"], ["Shop", "/shop"]],
        pages: {
          "/": [
            { t: "lede", p: "Meet Can-Dee, our singing soup can! She's our mascot and she never stops singing." },
            { t: "prose", h: "Soups with a twist", ps: [
              "A pun on every soup: the Brothers Grimm, the Souper Bowl, Leek Skywalker.",
              "Everything is covered in glitter. Even the napkins.",
            ] },
          ],
          "/soups": [
            { t: "stats", items: [{ n: "12", l: "soups every day" }, { n: "∞", l: "puns" }] },
            { t: "prose", h: "So many soups", ps: ["Twelve soups every day, so there's something for everyone. Choosing takes a while."] },
          ],
          "/shop": [
            { t: "prose", h: "Can-Dee's shop", ps: [
              "Every sticker has googly eyes.",
              "Collect a stamp on every lid: ten stamps and your eleventh soup is on us.",
              "Our app icon is Can-Dee's face, winking.",
              "Our website plays the Souper Star jingle as soon as it opens.",
              "T-shirts, mugs, and a plush Can-Dee.",
            ] },
          ],
        },
      },
      refs: ["cartoon soup can", "glitter"],
      trends: [
        { id: "ss-mascot", label: "A cartoon mascot", match: ["singing soup can"], tags: ["trend-mascot"] },
        { id: "ss-puns", label: "A pun on every soup", match: ["a pun on every soup"], tags: ["trend-puns"] },
        { id: "ss-glitter", label: "Glitter", match: ["covered in glitter"], tags: ["trend-glitter"] },
        { id: "ss-twelve", label: "Twelve soups a day", match: ["twelve soups every day"], tags: ["trend-twelve"] },
        { id: "ss-googly", label: "Googly eyes", match: ["googly eyes"], tags: ["trend-googly"] },
        { id: "ss-stamps", label: "A stamp card", match: ["ten stamps"], tags: ["trend-stamps"] },
        { id: "ss-icon", label: "The mascot, winking", match: ["can-dee's face, winking"], tags: ["trend-wink"] },
        { id: "ss-jingle", label: "A jingle that plays by itself", match: ["plays the souper star jingle"], tags: ["trend-jingle"] },
        { id: "ss-merch", label: "A merch shop", match: ["plush can-dee"], tags: ["trend-merch"] },
      ],
    },
  };

  /* ── the chain ────────────────────────────────────────── */
  // What Tori says when she's gone, and while you think.
  const filler = ["Take your time. I'm stirring.", "Parsnip, off. Sorry, go on.", "I'm still here! Just tasting."];
  const leave = ["Oh! The pot. I have to go.", "Message me any time. I check it between soups."];
  const wrapOf = (five, four) => ({
    5: [five, "Gold star. A real one. I'm sticking it on your screen."],
    4: [four],
    3: ["That's good! One or two things I'd change, but good."],
    2: ["Hmm. Let's look at it again together next time."],
    1: ["I don't think that's quite it. That's all right: that's how we learn."],
  });

  const gigs = {
    "tori-sign": {
      kind: "listing", discipline: "graphic", app: "banner", deliverable: "Cart sign",
      lesson: { n: 1, of: OF, title: "Shapes, colour and words" },
      title: "patient designer wanted: a sign for my soup cart (a good first job)",
      short: "TORI'S CART SIGN",
      pay: "$30 + all the soup you can carry",
      posted: "Sep 24", area: "Millbrook / online",
      minRep: 0,
      poster,
      listing: [
        "Hello! I'm Tori. I sell one soup a day from a cart at the Millbrook Saturday Market.",
        "My sign is a pizza box with the name written on it in marker. It served us well. It is time.",
        "I taught kindergarten for eleven years, so I like to go one step at a time. If you're new at this, good: so am I. There's more work after this if it goes well.",
      ],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["Hello! Can you see me? Parsnip, get off the keyboard.", "I'm Tori. Thank you for answering. Shall we go one step at a time?"],
        options: {
          name: { ask: "What should the sign say?", reply: ["TORI'S LADLE. With the apostrophe. The apostrophe matters.", "And the word soup, somewhere, so nobody thinks I sell ladles."], reveals: ["name", "soup"] },
          size: { ask: "Where does it go on the cart?", reply: ["Across the front. Long and short, like a shelf.", "The sign man says twelve hundred by four hundred."], reveals: ["size"] },
          colours: { ask: "What are your colours?", reply: ["Tomato red and cream. Like a good bowl of soup.", "And not too many. The sign man charges by the colour."], reveals: ["colours", "inks"] },
          when: { ask: "When are you open?", reply: ["Saturdays. People ask me all morning, so put Saturdays on it."], reveals: ["hours"] },
          cat: { ask: "Who's Parsnip?", reply: ["My cat. He picks the soup.", "Every Friday he sits on a recipe card, and that's Saturday's soup."] },
          pay: { ask: "Is there room in the budget?", reply: ["Thirty dollars, and soup. The soup is very good."], cost: 2 },
          done: { ask: "I've got what I need.", reply: ["Wonderful. Gold star for you already."], end: true, cost: 0 },
        },
        challenges: {
          // She forgets the green she chose herself. Her site remembers.
          parsley: {
            after: "colours", needsFact: "parsley",
            ask: "Your site says a little parsley green on top. Keep the green?",
            reply: ["Oh! The parsley. I always forget the parsley.", "Yes, a little green. Just a little, like on the soup."],
            reveals: ["parsley"],
          },
        },
      },
      needs: [
        { id: "name", label: "TORI'S LADLE, apostrophe and all", missed: "It doesn't say TORI'S LADLE", text: ["tori's ladle"], weight: 3 },
        { id: "soup", label: "The word soup, so nobody thinks she sells ladles", missed: "It never says soup", text: ["soup"], weight: 2 },
        { id: "hours", label: "Saturdays, when she's open", missed: "It doesn't say Saturdays", text: ["saturday"], weight: 1 },
        { id: "colours", label: "Tomato red and cream", missed: "It isn't tomato red and cream", all: ["red", "pastel"], weight: 2 },
        { id: "parsley", label: "A little parsley green", missed: "No parsley green", tags: ["green"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 1200, h: 400, label: "Cart sign, 1200 × 400" },
        { id: "inks", rule: "maxColours", value: 4, label: "Four colours or fewer: the sign man charges by the colour" },
      ],
      facts: [
        { id: "onesoup", where: SITE, label: "One soup a day, made that morning", match: ["one soup a day"], tags: ["one-soup"] },
        { id: "hours", where: SITE, label: "Saturdays, 8 till 1", match: ["8 till 1"], tags: ["hours"] },
        { id: "parsley", where: SITE, label: "A little parsley green on top", match: ["parsley green"], tags: ["parsley"] },
      ],
      refs: [{ q: "soup bowl steam", tags: ["soup"] }, { q: "wooden ladle", tags: ["ladle"] }, { q: "farmers market stall", tags: ["market"] }],
      competitors: rivals,
      features: [
        { id: "caps", label: "Shouting in capitals", doneBy: { [BB]: "bb-caps" } },
        { id: "neon", label: "A neon sign", doneBy: { [BB]: "bb-neon" } },
        { id: "mascot", label: "A cartoon mascot", doneBy: { [SS]: "ss-mascot" } },
        { id: "puns", label: "A pun on every soup", doneBy: { [SS]: "ss-puns" } },
        { id: "plain", label: "Today's soup, said plainly", gap: true },
      ],
      gap: { tag: "gap-plain", label: "today's one soup, said plainly", line: "One shouts PROTEIN and one has a singing can. Nobody just tells you what the soup is." },
      research: { seconds: 180 },
      deadline: 1200,
      output: { label: "Your Tori's Ladle cart sign", tags: ["tori-sign"] },
      wrap: wrapOf("It's going on the cart tomorrow. The pizza box can retire.", "That's a proper sign. The honey man will be jealous."),
      teach: [
        { id: "board", say: "Start with the board. The Rectangle (R): drag it out across the canvas.", with: ["tool:rect"], check: { layer: "rect" } },
        { id: "round", say: "Round its corners a little. With it selected, CORNER is in the strip along the top.", with: ["opt:radius"], check: { radius: true } },
        { id: "paint", say: "Paint it tomato red: FILL, or drag a colour card from the Cards tray onto it.", with: ["opt:fill", "drawer:cards"], check: { fill: "red" } },
        { id: "words", say: "Type (T), click the board, write TORI'S LADLE. Double-click words later to change them.", with: ["tool:text"], check: { text: "tori's ladle" } },
        { id: "face", say: "Choose a face that tastes like soup. The menu shows each one in your own words.", with: ["opt:fontmenu"], check: { font: "custom" } },
        { id: "more", say: "Add SOUP and SATURDAYS the same way. Selecting two and more is Shift-click.", with: ["tool:text", "tool:select"], check: { texts: 3 } },
      ],
    },

    "tori-menu": {
      kind: "chain", discipline: "graphic", app: "banner", deliverable: "Menu board", brief: "pager",
      after: { gig: "tori-sign", minStars: 2 },
      lesson: { n: 2, of: OF, title: "Guides and the focus grid" },
      title: "the chalkboard: all six soups, lined up",
      short: "TORI'S MENU BOARD",
      pay: "$40 + soup",
      poster,
      invite: ["It's Tori! The sign is on the cart. Three people asked where I got it.", "Next step: the menu board. All six of Parsnip's soups, in a grid, so people can see what might come up.", "Please use rulers and a grid. My chalk lines always slope. Your sign goes across the top."],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["Hello again! The sign is up. Gold star.", "Now, the board."],
        options: {
          sign: { ask: "Does the sign go on it?", reply: ["Across the top, like a heading."], reveals: ["sign"] },
          soups: { ask: "Which soups go on the board?", reply: ["All six recipe cards: tomato, leek, pumpkin, minestrone, pea, and mushroom.", "In a grid. Two across, three down, or whatever lines up."], reveals: ["soups"] },
          today: { ask: "How do people know today's soup?", reply: ["A space at the bottom that says TODAY: and I'll chalk it in."], reveals: ["today"] },
          size: { ask: "How big is the board?", reply: ["Poster size. Six hundred by eight hundred and fifty."], reveals: ["size"] },
          read: { ask: "Where do people read it from?", reply: ["The queue. Nothing tiny, please.", "And the same few colours as the sign."], reveals: ["text", "inks"] },
          done: { ask: "I'll line it all up.", reply: ["Lovely. Rulers out!"], end: true, cost: 0 },
        },
        challenges: {
          cat: {
            after: "today", needsFact: "parsnip",
            ask: "Your site says Parsnip picks the soup. Should the board say so?",
            reply: ["Oh, yes. People love that. Put Parsnip on it."],
            reveals: ["cat"],
          },
        },
      },
      needs: [
        { id: "sign", label: "Your sign across the top", missed: "The sign isn't on it", tags: ["tori-sign"], weight: 3 },
        { id: "soups", label: "All six soups: tomato, leek, pumpkin, minestrone, pea, mushroom", missed: "Not all six soups are on it", text: ["tomato", "leek", "pumpkin", "minestrone", "pea", "mushroom"], weight: 3 },
        { id: "today", label: "A space that says TODAY:", missed: "There's nowhere for today's soup", text: ["today"], weight: 2 },
        { id: "cat", label: "Parsnip picks the soup", missed: "It doesn't mention Parsnip", text: ["parsnip"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 600, h: 850, label: "Poster, 600 × 850" },
        { id: "text", rule: "minText", value: 18, label: "No text under 18px: it's read from the queue" },
        { id: "inks", rule: "maxColours", value: 4, label: "The sign's few colours" },
      ],
      facts: [
        { id: "six", where: SITE, label: "The six recipe cards", match: ["tomato and red lentil", "mushroom and barley"], tags: ["recipes"] },
        { id: "parsnip", where: SITE, label: "Parsnip sits on the recipe card", match: ["sits on one of the recipe cards"], tags: ["parsnip"] },
        { id: "rain", where: SITE, label: "When it rains, the chalkboard runs", match: ["the chalkboard runs"], tags: ["weather"] },
      ],
      refs: [{ q: "chalkboard menu", tags: ["chalk"] }, { q: "tabby cat", tags: ["cat"] }],
      competitors: rivals,
      features: [
        { id: "protein", label: "Grams of protein on everything", doneBy: { [BB]: "bb-protein" } },
        { id: "prices", label: "Prices in huge numbers", doneBy: { [BB]: "bb-prices" } },
        { id: "twelve", label: "Twelve soups a day", doneBy: { [SS]: "ss-twelve" } },
        { id: "glitter", label: "Glitter", doneBy: { [SS]: "ss-glitter" } },
        { id: "pick", label: "How today's soup gets picked", gap: true },
      ],
      gap: { tag: "gap-pick", label: "how today's soup gets picked", line: "Everyone lists soups. Nobody tells you there's a cat choosing them." },
      research: { seconds: 150 },
      deadline: 1500,
      output: { label: "Your menu board", tags: ["tori-menu"] },
      wrap: wrapOf("It's printed! It rained on Saturday and nothing ran.", "Everything lines up. My chalk never did that."),
      teach: [
        { id: "guide", say: "Pull a guide down out of the ruler along the top. Let go where the first row starts.", with: ["ruler"], check: { guides: 1 } },
        { id: "four", say: "Three more: two across and two down. Where they cross four times, a focus grid appears.", with: ["ruler"], check: { grid: true } },
        { id: "sign", say: "Everything snaps to the grid now. Drag your sign's card across the top.", with: ["drawer:cards"], check: { card: "tori-sign" } },
        { id: "first", say: "Write the first soup in its cell with Type (T).", with: ["tool:text"], check: { texts: 1 } },
        { id: "copies", say: "Copy it five times: Alt-drag it, or ⌘D. The pink lines say when it lines up with the others.", with: ["view:smart", "tool:select"], check: { texts: 6 } },
        { id: "look", say: "The grid button hides the grid so you can see the board clean.", with: ["view:grid"], check: null },
      ],
    },

    "tori-mark": {
      kind: "chain", discipline: "type", app: "type", deliverable: "Logo mark", brief: "pager",
      after: { gig: "tori-menu", minStars: 2 },
      lesson: { n: 3, of: OF, title: "Shapes, mirrors and the shape builder" },
      title: "a proper logo: just a bowl and a ladle",
      short: "TORI'S MARK",
      pay: "$60 + soup",
      poster,
      invite: ["Tori again! It rained on Saturday and the board didn't run. Printed chalkboards are my new favourite thing.", "Now, my logo. My nephew drew it when he was six. It looks like a spoon wearing a hat.", "I'd like a proper mark: a bowl and a ladle, round and even, like a bowl should be. No words: it's going on my apron."],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["Hello! Big one today.", "The logo."],
        options: {
          what: { ask: "What should the mark be?", reply: ["A bowl and a ladle. Round and even, both sides the same.", "No words. It's for the apron, the sticker, everything."], reveals: ["nowords"] },
          colours: { ask: "Same colours as the sign?", reply: ["Tomato red and cream.", "Three colours at most. The apron lady embroiders it."], reveals: ["colours", "thread"] },
          size: { ask: "What size do you need?", reply: ["Square. Eight hundred."], reveals: ["size"] },
          old: { ask: "What's wrong with the old one?", reply: ["Nothing! He was six. But it looks like a spoon wearing a hat."] },
          done: { ask: "A bowl and a ladle. On it.", reply: ["Round and even! Gold star in advance."], end: true, cost: 0 },
        },
        challenges: {
          green: {
            after: "colours", needsFact: "parsley",
            ask: "Your colours have a little parsley green on top. In the mark too?",
            reply: ["Yes! A little parsley. It's my favourite part."],
            reveals: ["parsley"],
          },
        },
      },
      needs: [
        { id: "colours", label: "Tomato red and cream", missed: "It isn't tomato red and cream", all: ["red", "pastel"], weight: 2 },
        { id: "parsley", label: "A little parsley green", missed: "No parsley green", tags: ["green"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 800, h: 800, label: "Square, 800 × 800" },
        { id: "thread", rule: "maxColours", value: 3, label: "Three colours at most: it gets embroidered" },
        { id: "nowords", rule: "avoid", text: ["tori", "ladle", "soup"], label: "No words: it has to work on its own" },
      ],
      facts: [
        { id: "hat", where: SITE, label: "The old logo looks like a spoon wearing a hat", match: ["spoon wearing a hat"], tags: ["old-logo"] },
        { id: "parsley", where: SITE, label: "A little parsley green on top", match: ["parsley green"], tags: ["parsley"] },
      ],
      refs: [{ q: "wooden ladle", tags: ["ladle"] }, { q: "soup bowl steam", tags: ["soup"] }],
      competitors: rivals,
      features: [
        { id: "flex", label: "A flexing arm", doneBy: { [BB]: "bb-flex" } },
        { id: "neon", label: "Neon green", doneBy: { [BB]: "bb-neon" } },
        { id: "can", label: "A cartoon can with a face", doneBy: { [SS]: "ss-mascot" } },
        { id: "glitter", label: "Glitter", doneBy: { [SS]: "ss-glitter" } },
        { id: "bowl", label: "Just the soup: a bowl and a ladle", gap: true },
      ],
      gap: { tag: "gap-bowl", label: "just the soup: a bowl and a ladle", line: "An arm and a singing can. Nobody's mark is simply the soup." },
      research: { seconds: 120 },
      deadline: 1500,
      output: { label: "Your Tori's Ladle mark", tags: ["tori-mark"] },
      wrap: wrapOf("It's on my apron! My mother cried. Good crying.", "Round and even. The apron lady says it stitches beautifully."),
      teach: [
        { id: "circle", say: "A bowl starts as a circle: the Ellipse (O). Hold Shift to keep it round.", with: ["tool:ellipse"], check: { layer: "ellipse" } },
        { id: "cut", say: "Put a rectangle over its top half, then drag across both with the Shape builder (M) holding Alt: it cuts.", with: ["tool:rect", "tool:build"], check: { path: true } },
        { id: "half", say: "Draw half the ladle, then Mirror it. Both sides stay even while you work.", with: ["opt:mirv"], check: { mirror: true } },
        { id: "merge", say: "Happy with both halves? MERGE makes the mirror part of the shape.", with: ["opt:mirmerge"], check: null },
        { id: "lock", say: "In LAYERS, drag rows to restack, and lock what's finished so it stays put.", with: ["layers"], check: { locked: true } },
      ],
    },

    "tori-sticker": {
      kind: "chain", discipline: "type", app: "type", deliverable: "Lid sticker", brief: "pager",
      after: { gig: "tori-mark", minStars: 2 },
      lesson: { n: 4, of: OF, title: "Words on a curve, and the pen" },
      title: "round stickers for the cup lids",
      short: "TORI'S LID STICKER",
      pay: "$45 + soup",
      poster,
      invite: ["It's Tori! The mark is on my apron and on the cart. Somebody asked if I was a franchise.", "Stickers next: round ones, for the cup lids.", "The mark in the middle and my name going round the edge, like a seal. And made this morning, if it fits."],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["Stickers! I've wanted stickers forever."],
        options: {
          middle: { ask: "What goes in the middle?", reply: ["The mark. The new one."], reveals: ["mark"] },
          words: { ask: "What should go round the edge?", reply: ["TORI'S LADLE, going round, like on a coin."], reveals: ["name"] },
          size: { ask: "How big?", reply: ["Round, and square on the sheet: eight hundred."], reveals: ["size"] },
          small: { ask: "How small does it print?", reply: ["As big as a cup lid. Nothing tiny.", "And three colours, for the printer."], reveals: ["text", "thread"] },
          done: { ask: "Round the edge. Got it.", reply: ["Like a seal! Gold star."], end: true, cost: 0 },
        },
        challenges: {
          fresh: {
            after: "words", needsFact: "morning",
            ask: "Your site says made that morning. Put that on the sticker too?",
            reply: ["Yes! Made this morning. It's the whole point of me."],
            reveals: ["made"],
          },
        },
      },
      needs: [
        { id: "mark", label: "The mark in the middle", missed: "The mark isn't in it", tags: ["tori-mark"], weight: 3 },
        { id: "name", label: "TORI'S LADLE round the edge", missed: "Her name isn't on it", text: ["tori's ladle"], weight: 2 },
        { id: "made", label: "Made this morning", missed: "It doesn't say made this morning", text: ["this morning"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 800, h: 800, label: "Square, 800 × 800" },
        { id: "text", rule: "minText", value: 24, label: "Nothing under 24px: it's the size of a lid" },
        { id: "thread", rule: "maxColours", value: 3, label: "Three colours, for the printer" },
      ],
      facts: [
        { id: "morning", where: SITE, label: "Made that morning", match: ["made that morning"], tags: ["fresh"] },
        { id: "lids", where: SITE, label: "Stickers for the cup lids, name round the edge", match: ["stickers for the cup lids"], tags: ["stickers"] },
      ],
      refs: [{ q: "wax seal", tags: ["seal"] }, { q: "soup bowl steam", tags: ["soup"] }],
      competitors: rivals,
      features: [
        { id: "crush", label: "CRUSH IT on every lid", doneBy: { [BB]: "bb-crush" } },
        { id: "protein", label: "Protein counts", doneBy: { [BB]: "bb-protein" } },
        { id: "googly", label: "Googly eyes", doneBy: { [SS]: "ss-googly" } },
        { id: "stamps", label: "A stamp card", doneBy: { [SS]: "ss-stamps" } },
        { id: "fresh", label: "When it was made", gap: true },
      ],
      gap: { tag: "gap-fresh", label: "when the soup was made", line: "One says CRUSH IT and one has googly eyes. Nobody tells you the soup is fresh." },
      research: { seconds: 120 },
      deadline: 1500,
      output: { label: "Your lid sticker", tags: ["tori-sticker"] },
      wrap: wrapOf("They're on every lid! Somebody peeled one off to keep.", "It looks like a seal. A soup seal."),
      teach: [
        { id: "mark", say: "Drag the mark's card from the tray into the middle.", with: ["drawer:cards"], check: { card: "tori-mark" } },
        { id: "bend", say: "Write TORI'S LADLE, then bend it: BEND arches the words over the top.", with: ["tool:text", "opt:bend"], check: { bend: true } },
        { id: "pen", say: "For the bottom, draw the curve yourself. The Pen (P): click, drag, click, then Enter.", with: ["tool:pen"], check: { open: true } },
        { id: "along", say: "Then Type, and click your curve: the words follow it. Drag them to slide them along.", with: ["tool:text"], check: { onPath: true } },
        { id: "points", say: "Reshape the curve with the Points tool (A): drag its points and handles, and the words follow.", with: ["tool:node"], check: null },
      ],
    },

    "tori-icon": {
      kind: "chain", discipline: "illustrative", app: "pixel", deliverable: "App icon", brief: "pager",
      after: { gig: "tori-sticker", minStars: 2 },
      lesson: { n: 5, of: OF, title: "Pixels" },
      title: "a tiny picture for the market app",
      short: "TORI'S APP ICON",
      pay: "$25 + soup",
      poster,
      invite: ["Tori here. The stickers are on every lid, and people peel them off to keep!", "The market app gives every stall a tiny picture, and mine is still blank. Thirty-two by thirty-two. Pixels!", "Could the mark go in it, small? It has to still look like soup."],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["Pixels! My nephew says I'll love pixels."],
        options: {
          what: { ask: "What should the icon be?", reply: ["The mark, small. It has to still look like soup."], reveals: ["mark"] },
          size: { ask: "What size exactly?", reply: ["Thirty-two by thirty-two. The app man was very firm."], reveals: ["size"] },
          colours: { ask: "Which colours?", reply: ["Tomato red, and a dark line round it so it shows on the white app.", "Four colours at most, he said."], reveals: ["red", "outline", "inks"] },
          done: { ask: "Small, and still soup.", reply: ["Gold star!"], end: true, cost: 0 },
        },
      },
      needs: [
        { id: "mark", label: "The mark, small", missed: "The mark isn't in it", tags: ["tori-mark"], weight: 3 },
        { id: "red", label: "Tomato red", missed: "No tomato red", tags: ["red"], weight: 2 },
        { id: "outline", label: "A dark line round it, for the white app", missed: "Nothing dark round it", tags: ["dark"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 32, h: 32, label: "32 × 32" },
        { id: "inks", rule: "maxColours", value: 4, label: "Four colours at most" },
      ],
      facts: [
        { id: "app", where: SITE, label: "Every stall gets a tiny picture, 32 by 32", match: ["every stall gets a tiny picture"], tags: ["app"] },
      ],
      refs: [{ q: "soup bowl steam", tags: ["soup"] }],
      competitors: rivals,
      features: [
        { id: "dumbbell", label: "A dumbbell", doneBy: { [BB]: "bb-icon" } },
        { id: "neon", label: "Neon green", doneBy: { [BB]: "bb-neon" } },
        { id: "wink", label: "The mascot, winking", doneBy: { [SS]: "ss-icon" } },
        { id: "glitter", label: "Glitter", doneBy: { [SS]: "ss-glitter" } },
        { id: "soup", label: "A picture of the soup itself", gap: true },
      ],
      gap: { tag: "gap-soup", label: "a picture of the soup itself", line: "A dumbbell and a winking can. At that size, only one of the three stalls looks like soup." },
      research: { seconds: 90 },
      deadline: 1200,
      output: { label: "Your app icon", tags: ["tori-icon"] },
      wrap: wrapOf("It's in the app! Parsnip sat on the phone to look at it.", "Tiny, and it's still soup. How?"),
      teach: [
        { id: "pixel", say: "Switch to Pixel: the same suite, one square at a time.", with: ["mode:pixel"], check: { drawn: 1 } },
        { id: "down", say: "Drag the mark's card onto the sprite: it comes down to pixels, in the sprite's colours.", with: ["drawer:cards"], check: { card: "tori-mark" } },
        { id: "palette", say: "Keep it to a few colours: Swatch has classic palettes, or take the colours from the work.", with: ["drawer:swatch"], check: { palette: 2 } },
        { id: "clean", say: "Clean it up with the Pencil (B) and Eraser (E). Every pixel counts at this size.", with: ["tool:pencil", "tool:erase"], check: { drawn: 60 } },
        { id: "curve", say: "The Pen lays a curve down in clean pixels: good for the rim of a bowl.", with: ["tool:pen"], check: null },
      ],
    },

    "tori-site": {
      kind: "chain", discipline: "webui", app: "layout", deliverable: "Site", brief: "pager",
      after: { gig: "tori-icon", minStars: 2 },
      lesson: { n: 6, of: OF, title: "Layout" },
      title: "a proper website (my nephew's is a lot)",
      short: "TORI'S WEBSITE",
      pay: "$80 + soup for life",
      poster,
      invite: ["Tori! The icon is in the app. Parsnip sat on the phone to look at it.", "Last one, for now: a proper website. My nephew's has a lot going on.", "Where I am, when, and the questions everyone asks me. And the sticker, big."],
      dialogue: {
        patience: 7, pause: 19000, filler, leave,
        opening: ["The website! My nephew is being very gracious about it."],
        options: {
          name: { ask: "What's the site called?", reply: ["Tori's Ladle."], reveals: ["name"] },
          when: { ask: "What has to be on it?", reply: ["When: Saturdays. And the questions everyone asks me."], reveals: ["when", "questions"] },
          where: { ask: "Where should it say you are?", reply: ["The market. People always ask which row."] },
          picture: { ask: "Any pictures?", reply: ["The sticker, big. People love the sticker."], reveals: ["sticker"] },
          long: { ask: "How long should it be?", reply: ["Short. Like a soup menu. Six sections at most."], reveals: ["short"] },
          done: { ask: "Short and sweet. On it.", reply: ["Last gold star of the set!"], end: true, cost: 0 },
        },
        challenges: {
          row: {
            after: "where", needsFact: "rowc",
            ask: "Your questions page says Row C, next to the honey man. Put that on?",
            reply: ["Yes! Row C. Next to the honey man. Everyone knows the honey man."],
            reveals: ["row"],
          },
        },
      },
      needs: [
        { id: "name", label: "Tori's Ladle, as the site's name", missed: "The site isn't called Tori's Ladle", text: ["tori's ladle"], weight: 2 },
        { id: "when", label: "Saturdays", missed: "It doesn't say Saturdays", text: ["saturday"], weight: 2 },
        { id: "questions", label: "The questions everyone asks", missed: "There are no questions on it", blocks: ["faq"], weight: 2 },
        { id: "sticker", label: "The sticker, big", missed: "The sticker isn't on it", tags: ["tori-sticker"], weight: 3 },
        { id: "row", label: "Row C, next to the honey man", missed: "It doesn't say Row C", text: ["row c"], weight: 1 },
      ],
      limits: [
        { id: "short", rule: "maxBlocks", value: 6, label: "Six sections at most: short, like a soup menu" },
      ],
      facts: [
        { id: "rowc", where: SITE, label: "Row C, next to the honey man", match: ["row c", "honey man"], tags: ["where"] },
        { id: "nephew", where: SITE, label: "Her nephew made the old site", match: ["he is nine now"], tags: ["old-site"] },
      ],
      refs: [{ q: "farmers market stall", tags: ["market"] }, { q: "soup bowl steam", tags: ["soup"] }],
      competitors: rivals,
      features: [
        { id: "countdown", label: "A countdown timer", doneBy: { [BB]: "bb-countdown" } },
        { id: "prices", label: "Prices in huge numbers", doneBy: { [BB]: "bb-prices" } },
        { id: "jingle", label: "A jingle that plays by itself", doneBy: { [SS]: "ss-jingle" } },
        { id: "merch", label: "A merch shop", doneBy: { [SS]: "ss-merch" } },
        { id: "where", label: "When and where, first", gap: true },
      ],
      gap: { tag: "gap-where", label: "when and where, first thing", line: "A countdown and a jingle. Neither one tells you where the stall is." },
      research: { seconds: 120 },
      deadline: 1800,
      wrap: wrapOf("It's live! The honey man asked who made it. I said you. Gold star.", "It's so calm. My nephew says it's very clean. He means it nicely."),
      teach: [
        { id: "layout", say: "Switch to Layout: a page, built out of blocks.", with: ["mode:layout"], check: { blocks: 1 } },
        { id: "lede", say: "Drag a Lede block onto the page: say what Tori's Ladle is, in one sentence.", with: ["blk:lede"], check: { block: "lede" } },
        { id: "faq", say: "Add the questions: the FAQ block. Click it in the page to edit it on the right.", with: ["blk:faq"], check: { block: "faq" } },
        { id: "sticker", say: "Add a Big picture block, then drop the sticker's card on it.", with: ["blk:plate", "drawer:cards"], check: { card: "tori-sticker" } },
        { id: "brand", say: "Set the brand colour to tomato red: BRAND in the strip, or Swatch.", with: ["opt:brand", "drawer:swatch"], check: { brand: "red" } },
        { id: "visit", say: "Look at it in The Web before you send it.", with: ["opt:visit"], check: null },
      ],
    },
  };

  const index = [
    { dom: SITE, title: "Tori's Ladle — one soup a day", snippet: "A soup cart at the Millbrook Saturday Market. Parsnip picks the soup.", keywords: ["soup", "tori", "tori's ladle", "millbrook", "market", "farmers market", "lunch"] },
    { dom: BB, title: "BROTH BROS — PROTEIN IN A CUP", snippet: "Twelve broths. Zero excuses. Look for the neon.", keywords: ["soup", "broth", "bone broth", "protein", "millbrook", "market"] },
    { dom: SS, title: "Souper Star — you're a Souper Star!", snippet: "Twelve soups, one singing can, and more puns than you can handle.", keywords: ["soup", "food truck", "souper star", "millbrook", "market", "puns"] },
  ];

  // Into the game's own content, once.
  if (H && !H.gigs["tori-sign"]) {
    Object.assign(H.people, people);
    Object.assign(H.sites, sites);
    Object.assign(H.gigs, gigs);
    H.index.push(...index);
  }

  return { people, sites, gigs, index, OF };
})();

if (typeof module !== "undefined") module.exports = HustleTutorial;
