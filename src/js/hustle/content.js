"use strict";
/* ── Hustle content ───────────────────────────────────────
 * Everything the Hustle game is made of that is not code: the sites you can
 * visit, the gigs, the people you talk to, and the answers the research
 * puzzles check against.
 *
 *   sites     dom → a client-shaped site (see clients.js), plus `trends` on
 *             rivals: the things a rival visibly does, and the words on their
 *             page that prove it.
 *   gigs      id → a job. How it is found (listing, prospect, chain), who
 *             posts it, the briefing conversation, what the client needs and
 *             will not accept, the facts and rivals worth researching, and
 *             what the gap turns out to be.
 *   index     what the crawler search engine knows about. Prospects are
 *             deliberately absent: those you find through their ads.
 *   listings  gigslist posts that are not gigs — flavour, flagged, filled.
 *   ads       brand ads shown on pages. A tooltip names the brand; typing its
 *             domain is how a prospect is discovered.
 *
 * Research `match` strings must appear verbatim (ignoring case) in the page
 * text that holds them. Change the copy, change the match.
 */

const HUSTLE = (() => {
  // The anime's canon lives in content/characters.js; the official site and
  // the fan site both quote it rather than restating it.
  const PMR = typeof Characters !== "undefined" ? Characters
    : typeof require !== "undefined" ? require("../content/characters.js") : null;
  const GIGSLIST = "gigslist.org";
  const CRAWLER = "crawler.web";

  /* ── ads ───────────────────────────────────────────────── */
  const ADS = {
    kiln: { t: "ad", brand: "Kettle & Kiln", line: "Paint a mug. We fire it. Thursdays run late.", art: "kiln" },
    dial: { t: "ad", brand: "HyperDial", line: "56K OF PURE FREEDOM. First month free!!", art: "dial" },
  };

  /* ── the people ────────────────────────────────────────
   * A handle is a person: portraits.js hashes it into a face, and `look`
   * pins whatever an author cares about so nobody important is left to a
   * dice roll. `room` is what is behind them on a call, drawn in their own
   * site's colours. `pause` is how long they will sit in a silence before
   * filling it themselves — the size of the hourglass.
   */
  const people = {

    batonpass_nell: {
      name: "Nell", role: "Webmistress", co: "The Baton Pass", dom: "thebatonpass.net",
      pause: 14000,
      look: { skin: "#E0A87C", hair: "#3A2A1E", style: "long", specs: "none",
              extra: "none", build: "narrow", age: "young", facial: "none", band: "#FF7A1A" },
      // Too close to the camera, the way a teenager at a laptop is.
      framing: "against",
      frame: { dy: 0.06, dh: 0.88 },
      room: [
        { p: "poster", x: 0.02, y: 0.06, w: 0.22, h: 0.48 },
        { p: "shelf",  x: 0.70, y: 0.12, w: 0.28, h: 0.26 },
        { p: "poster", x: 0.74, y: 0.48, w: 0.22, h: 0.34 },
        { p: "mug",    x: 0.74, y: 0.76, w: 0.16, h: 0.20, z: 0.92 },
      ],
      bio: "Sixteen when the shrine went up, seventeen now, and it has been the best thing on her desktop ever since. Hand-codes every page in Notepad because that is how she learned and she is not stopping. Answers every email, usually within the hour, usually in lowercase.",
      lore: "Wears the orange sweatband because Toma does. Will tell you this unprompted.",
      team: [
        { n: "Marisa", r: "Episode guide", p: "Writes the recaps the night each episode airs. Has never once been on a call." },
        { n: "kuro_9", r: "Forum moderator", p: "Deletes the spam at four in the morning. Nobody knows their name, or asks." },
      ],
    },

    thimble_ines: {
      name: "Ines Varga", role: "Solo developer", co: "Thimblewick", dom: "thimblewickgame.net",
      pause: 10000,
      look: { skin: "#C98B5F", hair: "#1B1512", style: "bun", specs: "square",
              extra: "none", build: "regular", age: "mid", facial: "none" },
      // Back at the desk with the studio behind her, the lamp between.
      framing: "receded",
      room: [
        { p: "monitor",   x: 0.03, y: 0.20, w: 0.20, h: 0.30 },
        { p: "corkboard", x: 0.70, y: 0.08, w: 0.28, h: 0.40 },
        { p: "plant",     x: 0.76, y: 0.56, w: 0.20, h: 0.32 },
        { p: "lamp",      x: 0.02, y: 0.44, w: 0.20, h: 0.34, z: 0.7 },
      ],
      bio: "Four years in, funded out of her own savings and one contract that ended well. Writes the devlog on Fridays whether there is news or not. Says \u201cshe is not cute, she is competent\u201d about her shopkeeper and means it about the studio too.",
      lore: "Spent a week on thread physics nobody will notice. Does not regret it.",
      team: [
        { n: "Halden", r: "Music, on contract", p: "Two tracks so far, both good. Lives four time zones away and sends files at three in the morning." },
        { n: "This role", r: "Character art, on contract", p: "Open. It is the job you are being interviewed for, and there is no art department behind it." },
      ],
    },

    kettleandkiln: {
      name: "Priya Anand", role: "Owner", co: "Kettle & Kiln", dom: "kettleandkiln.com",
      pause: 9000,
      look: { skin: "#A56A44", hair: "#1B1512", style: "bob", specs: "none",
              extra: "collar", build: "regular", age: "mid", facial: "none" },
      // Standing back from it, over by the counter, half looking at the shop.
      frame: { dx: 0.34, dy: 0.15, dw: 0.44, dh: 0.82 },
      framing: "receded",
      room: [
        { p: "shelf", x: 0.02, y: 0.10, w: 0.24, h: 0.34 },
        { p: "shelf", x: 0.02, y: 0.52, w: 0.24, h: 0.30 },
        { p: "door",  x: 0.76, y: 0.02, w: 0.24, h: 0.72 },
        { p: "clock", x: 0.62, y: 0.06, w: 0.10, h: 0.14 },
        // One of hers, finished, on the counter between her and the lens.
        { p: "mug",   x: 0.06, y: 0.68, w: 0.18, h: 0.26, z: 0.9 },
      ],
      bio: "Opened on Corder Street in 2019 with one wheel, a secondhand kiln and a card machine that is still slow. Fires on Mondays herself because nobody else is allowed near it. Takes the call from the shop floor, which you can hear.",
      lore: "Still thinks about the gradient on the last menu somebody made her.",
      team: [
        { n: "Dev", r: "Front of house", p: "Knows every regular by their mug. Genuinely — he can name the mug before the person." },
        { n: "Marta", r: "Glazes", p: "Mixes them in the back. Will not write the recipes down, and nobody has pushed it." },
        { n: "Sam", r: "Thursdays", p: "Runs Kiln Night. Teaches beginners without once making them feel like beginners." },
      ],
    },

    improbable_dennis: {
      name: "Dennis Kowalczyk", role: "Magician", co: "The Improbable Dennis", dom: "improbabledennis.com",
      // Loves to talk, and will sit a long time in a silence waiting for you.
      pause: 16000,
      look: { skin: "#E8B896", hair: "#2B2320", style: "shortback", specs: "none", facial: "moustache",
              extra: "collar", tint: "#141414", build: "regular", age: "older" },
      // Leans into the webcam like it is a microphone.
      framing: "against",
      frame: { dy: 0.02, dh: 0.92 },
      room: [
        { p: "poster",  x: 0.03, y: 0.08, w: 0.22, h: 0.46 },
        { p: "neon",    x: 0.70, y: 0.06, w: 0.26, h: 0.18 },
        { p: "cabinet", x: 0.72, y: 0.30, w: 0.26, h: 0.50 },
        { p: "mug",     x: 0.78, y: 0.74, w: 0.16, h: 0.22, z: 0.9 },
      ],
      bio: "Has performed as The Improbable Dennis since 1991: birthday parties, retirement communities, a steakhouse on Fridays and one cruise nobody mentions. His granddaughter says his poster looks like a screensaver. The Starlite Lanes lounge has offered him Fridays, and he wants to look like a man who belongs there.",
      lore: "His assistant of nineteen years moved to Tampa in April. The position is open, and he will mention it.",
      team: [
        { n: "Denise", r: "Assistant, 2005–2024", p: "Moved to Tampa. Still sends a Christmas card with a dove on it." },
        { n: "The doves", r: "Finale", p: "Four of them. They have names, and he will tell you the names." },
      ],
    },

    weirdthings_alex: {
      name: "Alex", role: "Editor, writer, stapler", co: "Weird Things", dom: "weirdthingszine.net",
      // Types notes through the whole call; a silence makes them nervous.
      pause: 8000,
      look: { skin: "#8D5A3B", hair: "#1B1512", style: "beanie", specs: "round", facial: "none",
              extra: "scarf", build: "narrow", age: "young" },
      framing: "receded",
      room: [
        { p: "corkboard", x: 0.02, y: 0.06, w: 0.34, h: 0.46 },
        { p: "poster",    x: 0.74, y: 0.08, w: 0.22, h: 0.30 },
        { p: "shelf",     x: 0.70, y: 0.46, w: 0.28, h: 0.24 },
        { p: "lamp",      x: 0.80, y: 0.52, w: 0.18, h: 0.30, z: 0.72 },
      ],
      bio: "Four issues in, printed on the library risograph and stapled at the kitchen table. Believes every witness until the evidence says otherwise, and the evidence rarely says otherwise. Types faster than anyone you have met.",
      lore: "The corkboard behind them has red string on it. It is not a conspiracy board. It is a timeline.",
      team: [
        { n: "The Hollis Street library", r: "Printer", p: "Lends the risograph on Thursdays. The librarian has started asking about the duck." },
      ],
    },

    baron214_dwayne: {
      name: "Dwayne Tully", role: "Owner-operator", co: "Burger Baron #214", dom: "burgerbaron.com",
      // Ten minutes before the fryers need him, and he means it.
      pause: 7000,
      look: { skin: "#C68E63", hair: "#3A2A1E", style: "cap", specs: "square", facial: "moustache",
              extra: "collar", build: "broad", age: "mid" },
      framing: "receded",
      frame: { dx: 0.30, dy: 0.14, dw: 0.44, dh: 0.80 },
      room: [
        { p: "poster",  x: 0.02, y: 0.08, w: 0.20, h: 0.40 },
        { p: "clock",   x: 0.30, y: 0.04, w: 0.10, h: 0.14 },
        { p: "shelf",   x: 0.72, y: 0.10, w: 0.26, h: 0.28 },
        { p: "monitor", x: 0.74, y: 0.44, w: 0.22, h: 0.26 },
        { p: "mug",     x: 0.06, y: 0.70, w: 0.16, h: 0.24, z: 0.9 },
      ],
      bio: "Has run Burger Baron #214 on Route 9 since 1998, the year it won Regional Cleanest Grill. Opens at six and arrives at four-thirty. Loves the Baron, respects the Baron, and has emailed corporate eleven times about the burrito.",
      lore: "Invented the Baron's Breakfast Burrito on a slow Tuesday. The regulars call it the Dwayne.",
      team: [
        { n: "Regional", r: "Brand standards", p: "Sends letters on the good paper. Has opinions about the crown." },
      ],
    },
  };

  /* ── sites ─────────────────────────────────────────────── */
  const sites = {

    /* The client for the first chain: a fan shrine with a broken banner. */
    "thebatonpass.net": {
      who: "Nell", role: "Webmistress", co: "The Baton Pass", dom: "thebatonpass.net", frame: "neon",
      theme: {
        bg: "#14101E", panel: "#221A33", ink: "#F4EEFF", dim: "#A99BC4", line: "#3A2F52",
        brand: "#FF7A1A", brand2: "#1B2A4A", link: "#FFB27A", onBrand: "#14101E",
        head: "'Silkscreen', 'Courier New', monospace", body: "Georgia, serif", mark: "orbit", markText: "BP",
      },
      voice: "u can email me but pager is faster",
      site: {
        tagline: "a Toma × Kiyoshi shrine — Paper Moon Relay",
        strap: "best viewed at 800×600 · you are visitor #004417",
        foot: "fan site. not affiliated with the studio. please don't sue me i'm sixteen",
        nav: [["Home", "/"], ["Characters", "/characters"], ["Rules", "/rules"], ["Who runs this", "/about"]],
        pages: {
          "/": [
            { t: "notice", h: "Under construction (forever)", p: "The old banner is gone because my host deleted the image folder. A new one is coming. Soon. Probably.", stamp: "SORRY" },
            { t: "stats", items: [{ n: "212", l: "members" }, { n: "48", l: "fan works" }, { n: "12", l: "episodes, rewatched" }] },
            { t: "prose", h: "Why TomaKiyo", ps: [
              "Toma Arakawa runs anchor for Hoshizora High. Kiyoshi Mori runs third leg for their rivals at Kurohama, until episode 7, when he transfers.",
              "In episode 12 the relay final happens at dusk, and Kiyoshi hands the baton to Toma for the first time. That hand-off is the whole show.",
            ] },
            ADS.kiln,
          ],
          "/characters": [
            { t: "people", h: "The two of them", items: [
              { n: "Toma Arakawa", r: "Anchor leg, Hoshizora High", p: "Never runs without the orange sweatband his sister gave him." },
              { n: "Kiyoshi Mori", r: "Third leg, Kurohama → Hoshizora", p: "Still wears his navy Kurohama track jacket after the transfer. Won't say why." },
            ] },
            { t: "prose", h: "drawing toma (for fan artists)", ps: [
              "The cowlick at his crown never lies flat, not even under the band.",
              "The band's tails flick out on his right. The chipped front tooth only shows when he grins.",
              "Official art is on papermoonrelay.tv. Look at it, don't screenshot it. The studio sends takedowns.",
            ] },
            { t: "prose", h: "drawing kiyoshi", ps: [
              "The fringe covers his left eye. Always his left.",
              "Beauty mark under his right eye. Collar zipped to the chin, every time.",
              "He's taller: Toma's sweatband sits at Kiyoshi's eye line. Get that wrong and the forum will tell you.",
            ] },
            { t: "swatches", h: "colour picks for fan artists", note: "picked by hand off the blu-ray, so they're right. use these.", items: [
              { c: "#FF7A1A", n: "Toma's band" }, { c: "#3A2418", n: "Toma's hair" }, { c: "#E2A97E", n: "Toma's skin" },
              { c: "#C7832B", n: "Toma's eyes" }, { c: "#7EC8F0", n: "Hoshizora sky" }, { c: "#F6F7F2", n: "Kit white" },
              { c: "#F2C94C", n: "The star" }, { c: "#1B2A4A", n: "Kiyoshi's jacket" }, { c: "#3FB8AF", n: "The wave" },
              { c: "#14161C", n: "Kiyoshi's hair" }, { c: "#F1D2BC", n: "Kiyoshi's skin" }, { c: "#8A94A6", n: "Kiyoshi's eyes" },
            ] },
            ADS.dial,
          ],
          "/about": [
            { t: "prose", h: "who runs this", ps: [
              "hi it's just me!! i have had this site since i was 14 and i am not stopping.",
              "everything here is hand-coded in notepad. if something is broken it is broken because i broke it, and i will fix it, eventually.",
            ] },
            { t: "people", h: "the shrine staff (lol)", items: [
              { n: "Nell", r: "Webmistress", seed: "batonpass_nell", lead: true,
                p: "Runs it, writes it, breaks it. Orange sweatband, because Toma. Pager is faster than email." },
              { n: "Marisa", r: "Episode guide", seed: "batonpass_nell:marisa",
                look: { skin: "#F2C9A8", hair: "#6B4A2B", style: "ponytail", specs: "round", facial: "none", extra: "none", age: "young", build: "narrow" },
                p: "Writes the recaps the night each episode airs. Has never once been on a call." },
              { n: "kuro_9", r: "Forum moderator", seed: "batonpass_nell:kuro9",
                look: { skin: "#C98B5F", hair: "#1B1512", style: "beanie", specs: "square", facial: "none", extra: "none", age: "young", build: "regular" },
                p: "Deletes the spam at four in the morning. Nobody knows their name, or asks." },
            ] },
            ADS.dial,
          ],
          "/rules": [
            { t: "faq", h: "Rules", items: [
              { q: "Can I post spoilers?", a: "Please don't yet. We have no spoiler system, so episode 12 talk goes in the one forum thread with a warning on it." },
              { q: "Can I use the banner on my site?", a: "When there is one! Link back to the shrine." },
              { q: "Why is the site orange?", a: "Toma. Obviously." },
              { q: "Where's the official art?", a: "papermoonrelay.tv. Look all you want, but draw your own. No screenshots in fan works." },
            ] },
          ],
        },
      },
      refs: ["relay baton", "running track at dusk", "orange sweatband", "navy track jacket"],
    },

    /* The anime's own site: model sheets, profiles, and a firm line on fan works. */
    "papermoonrelay.tv": {
      who: "Production Committee", role: "", co: "Paper Moon Relay", dom: "papermoonrelay.tv", frame: "studio",
      theme: {
        bg: "#0F1420", panel: "#182033", ink: "#F4EFE6", dim: "#9AA3B8", line: "#2A3450",
        brand: "#FF7A1A", brand2: "#1B2A4A", link: "#FFB27A", onBrand: "#0F1420",
        head: "'Instrument Serif', Georgia, serif", body: "Georgia, serif", mark: "orbit", markText: "PM",
      },
      site: {
        tagline: "Twelve legs of a relay. One hand-off.",
        foot: "© Paper Moon Relay Production Committee. Fan works welcome; screenshots are not.",
        nav: [["Home", "/"], ["Toma", "/characters/toma"], ["Kiyoshi", "/characters/kiyoshi"], ["Story", "/story"]],
        pages: {
          "/": [
            { t: "lede", p: PMR ? PMR.SERIES.premise : "" },
            { t: "sheet", h: "Anchor and third leg", lineup: ["toma", "kiyoshi"], eyeline: 16, note: "Drawn to one scale. Toma's sweatband sits at Kiyoshi's eye line." },
            { t: "notice", h: "Fan works", p: "Draw them as much as you like. Please don't post screenshots or our art as your own: we do send takedowns.", stamp: "PLEASE" },
          ],
          "/characters/toma": [
            { t: "lede", p: PMR ? "\u201c" + PMR.CAST.toma.line + "\u201d" : "" },
            { t: "sheet", char: "toma", h: "Toma Arakawa" },
            { t: "spec", h: "Profile", rows: [["School", "Hoshizora High, second year"], ["Leg", "Anchor"], ["Height", "172 cm"], ["Age", "16"], ["Signature", "An orange sweatband, always on"]] },
            { t: "prose", h: "About", ps: PMR ? PMR.CAST.toma.about : [] },
          ],
          "/characters/kiyoshi": [
            { t: "lede", p: PMR ? "\u201c" + PMR.CAST.kiyoshi.line + "\u201d" : "" },
            { t: "sheet", char: "kiyoshi", h: "Kiyoshi Mori" },
            { t: "spec", h: "Profile", rows: [["School", "Kurohama Technical → Hoshizora High"], ["Leg", "Third"], ["Height", "178 cm"], ["Age", "17"], ["Signature", "A Kurohama track jacket, zipped to the chin"]] },
            { t: "prose", h: "About", ps: PMR ? PMR.CAST.kiyoshi.about : [] },
          ],
          "/story": [
            { t: "table", h: "Episodes", cols: ["Ep", "Title"], rows: [
              ["1", "Four Legs Short"], ["2", "Lane Four"], ["3", "The Exchange Zone"], ["4", "Rain Delay"],
              ["5", "Mei's Band"], ["6", "Kurohama"], ["7", "Transfer"], ["8", "Two Jackets"],
              ["9", "Counting Steps"], ["10", "Don't Look Back"], ["11", "Heat Haze"], ["12", "Paper Moon"],
            ] },
          ],
        },
      },
      refs: ["paper moon relay key visual", "paper moon relay"],
    },

    /* Rival 1: the big community site. */
    "moonrelayfans.org": {
      who: "Admin Team", role: "", co: "Moon Relay Fans", dom: "moonrelayfans.org", frame: "paper",
      theme: {
        bg: "#FFFDF6", panel: "#F3EEDC", ink: "#1D1A14", dim: "#6E6552", line: "#D8CFB3",
        brand: "#3A5BA0", brand2: "#1D1A14", link: "#3A5BA0", onBrand: "#FFFDF6",
        head: "Georgia, 'Times New Roman', serif", body: "Georgia, serif", mark: "wave", markText: "MR",
      },
      site: {
        tagline: "The largest Paper Moon Relay community on the web",
        mastL: "EST. 2023", mastR: "4,112 MEMBERS",
        nav: [["Home", "/"], ["Episode guide", "/episodes"], ["Forum", "/forum"]],
        pages: {
          "/": [
            { t: "lede", p: "Our banner rotates episode screenshots every week, voted by members." },
            { t: "prose", h: "Welcome, runners", ps: [
              "Every character gets a page. Our banner shows the full team roster, all eight runners, because every leg matters.",
              "New members get sparkle text in their signature after ten posts!",
            ] },
          ],
          "/episodes": [
            { t: "table", h: "Episode guide", cols: ["Ep", "Title", "Notes"], rows: [["11", "Heat Haze", "Semi-final"], ["12", "Paper Moon", "The final. Full recap below, spoilers and all."]] },
          ],
          "/forum": [
            { t: "feed", h: "Forum", items: [{ d: "Sep 12", h: "Kurohama appreciation thread", p: "412 replies" }, { d: "Sep 10", h: "Fic archive is back online", p: "Our fan fiction archive has 900 stories." }] },
          ],
        },
      },
      refs: ["relay team photo"],
      trends: [
        { id: "mr-shots", label: "Episode screenshots in the banner", match: ["episode screenshots"], tags: ["trend-screenshots"] },
        { id: "mr-roster", label: "The whole team, not a pair", match: ["full team roster"], tags: ["trend-roster"] },
        { id: "mr-sparkle", label: "Sparkle text", match: ["sparkle text"], tags: ["trend-sparkle"] },
        { id: "mr-episodes", label: "An episode guide", match: ["episode guide"], tags: ["trend-episodes"] },
        { id: "mr-fic", label: "A fan fiction archive", match: ["fan fiction archive"], tags: ["trend-fic"] },
      ],
    },

    /* Rival 2: a one-character fan site. */
    "hoshizora-anchor.net": {
      who: "kaz", role: "", co: "Anchor Leg", dom: "hoshizora-anchor.net", frame: "terminal",
      theme: {
        bg: "#0C1210", panel: "#132019", ink: "#C8F5D8", dim: "#6FA385", line: "#23402F",
        brand: "#57E08F", brand2: "#0C1210", link: "#57E08F", onBrand: "#0C1210",
        head: "'VT323', 'Courier New', monospace", body: "'VT323', 'Courier New', monospace", mark: "grid", markText: "AL",
      },
      site: {
        tagline: "just toma. no ships. please read the rules.",
        foot: "hand-coded in notepad",
        nav: [["Home", "/"], ["Gallery", "/gallery"]],
        pages: {
          "/": [
            { t: "lede", p: "A site about Toma Arakawa. Just Toma, on his own. The header is a screenshot collage from every race he runs." },
            { t: "steps", h: "What's here", items: [{ h: "Episode guide", p: "Every Toma scene, timestamped." }, { h: "Gallery", p: "Fan art, Toma only." }] },
            ADS.kiln,
          ],
          "/gallery": [
            { t: "gallery", h: "Gallery", caps: ["the sweatband", "lane four", "after the final"] },
          ],
        },
      },
      refs: ["relay runner"],
      trends: [
        { id: "al-shots", label: "A screenshot collage header", match: ["screenshot collage"], tags: ["trend-screenshots"] },
        { id: "al-solo", label: "One character, on their own", match: ["just toma, on his own"], tags: ["trend-solo"] },
        { id: "al-episodes", label: "An episode guide", match: ["episode guide"], tags: ["trend-episodes"] },
        { id: "al-gallery", label: "A fan art gallery", match: ["fan art"], tags: ["trend-gallery"] },
      ],
    },

    /* The pixel gig's client: a cosy game's devlog. */
    "thimblewickgame.net": {
      who: "Ines Varga", role: "Solo developer", co: "Thimblewick", dom: "thimblewickgame.net", frame: "terminal",
      theme: {
        bg: "#1E1A16", panel: "#2A241E", ink: "#F1E6D2", dim: "#A89880", line: "#3D352C",
        brand: "#E8B04B", brand2: "#1E1A16", link: "#E8B04B", onBrand: "#1E1A16",
        head: "'Silkscreen', 'Courier New', monospace", body: "Georgia, serif", mark: "stack", markText: "TW",
      },
      site: {
        tagline: "a cosy game about mending other people's clothes",
        foot: "demo out this winter",
        nav: [["Devlog", "/"], ["Art rules", "/art"], ["The studio", "/about"]],
        pages: {
          "/": [
            { t: "feed", h: "Devlog", items: [
              { d: "Sep 14", h: "Devlog 14: nobody behind the counter", p: "The shop works. The shopkeeper does not exist yet. Mrs. Pell needs a sprite." },
              { d: "Sep 02", h: "Devlog 13: thread physics", p: "I spent a week on thread physics. Nobody will notice." },
            ] },
            { t: "prose", h: "Who is Mrs. Pell?", ps: [
              "Mrs. Pell is a retired tailor, sixty-eight, who keeps the shop open because she is bored at home.",
              "She wears a green cardigan with one button missing and keeps a yellow tape measure around her neck. Her hair is grey and pinned up.",
            ] },
            ADS.kiln,
          ],
          "/about": [
            { t: "prose", h: "The studio", ps: [
              "Thimblewick is one person and a laptop that has been through two batteries.",
              "Four years in, funded out of savings. There is no art department. When the devlog says I, it means all of it.",
            ] },
            { t: "people", h: "Who is on this", items: [
              { n: "Ines Varga", r: "Everything except the music", seed: "thimble_ines", lead: true,
                p: "Design, code, writing, the devlog. Fridays are for the devlog whether there is news or not." },
              { n: "Halden", r: "Music, on contract", seed: "thimble_ines:halden",
                look: { skin: "#E0A87C", hair: "#3A2A1E", style: "shortback", specs: "none", facial: "stubble", extra: "none", age: "mid", build: "regular" },
                p: "Two tracks so far, both good. Four time zones away, sends files at three in the morning." },
              { n: "This role", r: "Character art, on contract",
                p: "Open — no photograph, because there is nobody in it. It is the job, and there is nobody behind it to hand the work to." },
            ] },
          ],
          "/art": [
            { t: "spec", h: "Art rules", rows: [
              ["Sprite size", "Every character sprite is 32 × 32."],
              ["Colours", "Eight colours per sprite, at most."],
              ["Outline", "A dark 1px outline on everything that moves."],
            ] },
          ],
        },
      },
      refs: ["tailor shop counter", "yellow tape measure", "green knitted cardigan"],
    },

    "needleandhearth.net": {
      who: "Team Hearth", role: "", co: "Needle & Hearth", dom: "needleandhearth.net", frame: "studio",
      theme: {
        bg: "#FFF8F0", panel: "#FBEADB", ink: "#3B2A20", dim: "#8A7462", line: "#EBD5C1",
        brand: "#E86F5A", brand2: "#3B2A20", link: "#C4533F", onBrand: "#FFF8F0",
        head: "Georgia, serif", body: "Georgia, serif", mark: "crest", markText: "NH",
      },
      site: {
        tagline: "A sewing-shop sim, out now",
        nav: [["Home", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "Meet Poppy, your cheerful young shopkeeper, always smiling behind the counter." },
            { t: "prose", h: "Features", ps: ["Forty patterns to unlock.", "Poppy waves at every customer."] },
          ],
        },
      },
      refs: ["sewing shop"],
      trends: [
        { id: "nh-young", label: "A cheerful young shopkeeper", match: ["cheerful young shopkeeper"], tags: ["trend-young"] },
        { id: "nh-counter", label: "Drawn behind the counter", match: ["behind the counter"], tags: ["trend-counter"] },
      ],
    },

    "bramblemarket.net": {
      who: "Bramble", role: "", co: "Bramble Market", dom: "bramblemarket.net", frame: "shop",
      theme: {
        bg: "#F4F7EE", panel: "#E4ECD8", ink: "#223018", dim: "#667A55", line: "#C9D7B6",
        brand: "#5C8A3A", brand2: "#223018", link: "#4A7430", onBrand: "#F4F7EE",
        head: "Georgia, serif", body: "Georgia, serif", mark: "counter", markText: "BM",
      },
      site: {
        tagline: "Run the stall. Pet the shop cat.",
        nav: [["Home", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "Every shopkeeper stands behind the counter, and every counter has a shop cat." },
          ],
        },
      },
      refs: ["market stall"],
      trends: [
        { id: "bm-counter", label: "Drawn behind the counter", match: ["behind the counter"], tags: ["trend-counter"] },
        { id: "bm-cat", label: "A shop cat", match: ["shop cat"], tags: ["trend-cat"] },
      ],
    },

    /* A prospect. Not on gigslist, not in the crawler. Found through its ad. */
    "kettleandkiln.com": {
      who: "Priya Anand", role: "Owner", co: "Kettle & Kiln", dom: "kettleandkiln.com", frame: "shop",
      theme: {
        bg: "#FBF4EC", panel: "#F0E2D2", ink: "#2E1F16", dim: "#85705F", line: "#E0CDB9",
        brand: "#C2562B", brand2: "#2E1F16", link: "#A5441E", onBrand: "#FBF4EC",
        head: "'Instrument Serif', Georgia, serif", body: "Georgia, serif", mark: "disc", markText: "K&K",
      },
      site: {
        tagline: "Pottery painting and tea, on Corder Street",
        cart: "Book a table",
        nav: [["Home", "/"], ["Kiln Night", "/kiln-night"], ["The people here", "/about"]],
        pages: {
          "/": [
            { t: "lede", p: "Pick a mug, paint it, leave it with us. We fire it in our own kiln and you collect it in a week." },
            { t: "products", h: "Bisque to paint", items: [
              { name: "Mug", meta: "350ml", price: "£8", ref: "terracotta mugs" },
              { name: "Small plate", meta: "18cm", price: "£10", ref: "hand painted plate" },
            ] },
          ],
          "/about": [
            { t: "lede", p: "Four of us, and the kiln, which counts. We opened on Corder Street in 2019 with one wheel and a secondhand kiln, and the card machine is still slow." },
            { t: "people", h: "The people here", items: [
              { n: "Priya Anand", r: "Owner", seed: "kettleandkiln", lead: true,
                p: "Fires on Mondays herself because nobody else is allowed near it. On the shop floor the rest of the week." },
              { n: "Dev", r: "Front of house", seed: "kettleandkiln:dev",
                look: { skin: "#7C4B2E", hair: "#1B1512", style: "crop", specs: "none", facial: "stubble", extra: "collar", age: "mid", build: "regular" },
                p: "Knows every regular by their mug — he can name the mug before the person." },
              { n: "Marta", r: "Glazes", seed: "kettleandkiln:marta",
                look: { skin: "#F2C9A8", hair: "#B4B4BA", style: "bun", specs: "round", facial: "none", extra: "none", age: "older", build: "regular" },
                p: "Mixes them in the back. Will not write the recipes down, and nobody has pushed it." },
              { n: "Sam", r: "Thursdays", seed: "kettleandkiln:sam",
                look: { skin: "#C98B5F", hair: "#5A2E2E", style: "curls", specs: "none", facial: "none", extra: "earrings", age: "young", build: "narrow" },
                p: "Runs Kiln Night. Teaches beginners without once making them feel like beginners." },
            ] },
          ],
          "/kiln-night": [
            { t: "notice", h: "Open Kiln Night", p: "Every Thursday we open the kiln room after six. £12 covers your piece and the glaze firing.", stamp: "THURSDAYS" },
            { t: "prose", h: "Why we do it", ps: ["People never see the kiln. It is the best part. At Kiln Night you watch it open."] },
          ],
        },
      },
      refs: ["terracotta mugs", "pottery kiln fire", "hand painted plate"],
    },

    "thepaintedcup.com": {
      who: "The Painted Cup", role: "", co: "The Painted Cup", dom: "thepaintedcup.com", frame: "studio",
      theme: {
        bg: "#FFF7FB", panel: "#FBE3EF", ink: "#3A2233", dim: "#8E6B80", line: "#F0CFE0",
        brand: "#E27AAE", brand2: "#3A2233", link: "#C45A90", onBrand: "#FFF7FB",
        head: "Georgia, serif", body: "Georgia, serif", mark: "wave", markText: "PC",
      },
      site: {
        tagline: "Paint-your-own pottery for all ages",
        nav: [["Home", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "Book a birthday party for kids, with pastel paints and a take-home box." },
          ],
        },
      },
      refs: ["pastel pottery"],
      trends: [
        { id: "pc-kids", label: "Birthday parties for kids", match: ["birthday party for kids"], tags: ["trend-kids"] },
        { id: "pc-pastel", label: "Pastel everything", match: ["pastel paints"], tags: ["trend-pastel"] },
      ],
    },

    "glazeandgraze.com": {
      who: "Glaze & Graze", role: "", co: "Glaze & Graze", dom: "glazeandgraze.com", frame: "studio",
      theme: {
        bg: "#F7F4FF", panel: "#E8E1FA", ink: "#241C3A", dim: "#6E6490", line: "#D6CCF2",
        brand: "#8B6FE0", brand2: "#241C3A", link: "#6D52C4", onBrand: "#F7F4FF",
        head: "Georgia, serif", body: "Georgia, serif", mark: "horizon", markText: "GG",
      },
      site: {
        tagline: "Clay, cheese, and a glass of something",
        nav: [["Home", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "Wine night every Friday: pastel paints, a cheese board, and your own plate to decorate." },
          ],
        },
      },
      refs: ["cheese board"],
      trends: [
        { id: "gg-wine", label: "Wine and cheese nights", match: ["wine night"], tags: ["trend-wine"] },
        { id: "gg-pastel", label: "Pastel everything", match: ["pastel paints"], tags: ["trend-pastel"] },
      ],
    },

    /* A magician's site, untouched since about 2004. It is the brand he is
     * leaving, and it knows things about him he forgets on the phone. */
    "improbabledennis.com": {
      who: "Dennis Kowalczyk", role: "Magician", co: "The Improbable Dennis", dom: "improbabledennis.com", frame: "neon",
      theme: {
        bg: "#2A1240", panel: "#3B1D57", ink: "#FFF4D6", dim: "#C9B3E0", line: "#57347A",
        brand: "#E0B83A", brand2: "#6B2FA0", link: "#FFD86B", onBrand: "#2A1240",
        head: "Papyrus, fantasy", body: "Georgia, serif", mark: "crest", markText: "ID",
      },
      site: {
        tagline: "Magic for all occasions! Since 1991!",
        strap: "you are visitor #000311 · best with your speakers on",
        foot: "© The Improbable Dennis. Doves available for weddings (ask).",
        nav: [["Home", "/"], ["Shows", "/shows"], ["About Dennis", "/about"], ["Questions", "/faq"]],
        pages: {
          "/": [
            { t: "lede", p: "Welcome to the magical world of The Improbable Dennis! Performing since 1991 for birthdays, retirement communities and corporate events of every size." },
            { t: "notice", h: "NEW! Friday nights", p: "Starting in October, The Improbable Dennis plays every Friday at the Starlite Lanes lounge. Grown-ups only, it's in the bar.", stamp: "FRIDAYS" },
            { t: "stats", items: [{ n: "30+", l: "years of magic" }, { n: "4", l: "doves" }, { n: "1", l: "cruise" }] },
          ],
          "/shows": [
            { t: "pricing", h: "Shows", tiers: [
              { name: "Birthday Magic", price: "$150", feats: ["45 minutes", "Six balloon animals", "A magic colouring book"], note: "Ages 4 to 10" },
              { name: "Evening Show", price: "$300", pick: "NEW", feats: ["75 minutes", "Cards, rings and the linking hoops", "The Vanishing Assistant*", "The dove finale"], note: "*assistant currently in Tampa" },
              { name: "Corporate", price: "Call", feats: ["Dental conferences a speciality"] },
            ] },
          ],
          "/about": [
            { t: "prose", h: "About Dennis", ps: [
              "Dennis Kowalczyk has performed as The Improbable Dennis ever since his mother named the act. His mother was right.",
              "The purple and gold have been with him since the first cape. The cape is black velvet with gold trim, and it has outlived two sofas.",
              "Kevin the rabbit retired to my sister's farm in 2019.",
              "The doves do the finale now. There are four of them, and they have names.",
            ] },
            { t: "people", h: "The act", items: [
              { n: "Dennis", r: "The Improbable", seed: "improbable_dennis", lead: true,
                p: "Cards, rings, doves, and patter he has been polishing since before you were born." },
              { n: "Denise", r: "Assistant, 2005–2024", seed: "improbable_dennis:denise",
                look: { skin: "#F0C8A8", hair: "#C9A06A", style: "curls", specs: "none", facial: "none", extra: "earrings", age: "older", build: "narrow" },
                p: "Nineteen years in the box. Moved to Tampa. Sends a card every Christmas." },
            ] },
          ],
          "/faq": [
            { t: "faq", h: "Questions people ask", items: [
              { q: "Is the rabbit coming?", a: "Kevin retired in 2019. Please stop asking the doves about the rabbit." },
              { q: "Do you do weddings?", a: "Yes. The doves are available for weddings. Ask about the doves." },
              { q: "Why is the site purple?", a: "The purple has been with me since the first cape. My granddaughter says it looks like a screensaver. She is not wrong." },
              { q: "Can I be your assistant?", a: "Maybe! Denise moved to Tampa. You would only have to get in the box twice a night." },
            ] },
          ],
        },
      },
      refs: ["stage magician top hat", "white doves", "velvet stage curtain"],
    },

    "partypetemagic.com": {
      who: "Party Pete", role: "", co: "Party Pete Magic", dom: "partypetemagic.com", frame: "saas",
      theme: {
        bg: "#FFFDF2", panel: "#FFF1B8", ink: "#23324A", dim: "#6A7690", line: "#F5DE85",
        brand: "#FF4F7B", brand2: "#2BB5E8", link: "#E03A66", onBrand: "#FFFFFF",
        head: "'Comic Sans MS', 'Chalkboard SE', cursive", body: "Helvetica, Arial, sans-serif", mark: "disc", markText: "PP",
      },
      site: {
        tagline: "The magic comes to YOUR party!",
        navCta: "Book Pete!",
        hero: { h: "The magic comes to YOUR party!", p: "Over two thousand parties and not one sad kid.", cta: "Book Pete" },
        nav: [["Home", "/"], ["Booking", "/book"]],
        pages: {
          "/": [
            { t: "prose", h: "What you get", ps: [
              "Balloon animals for every kid, even the shy ones.",
              "Rainbow silks, rainbow cups, a rainbow wand. Every show comes in rainbow.",
              "Wizzo, the cartoon wizard who lives in my hat, says hello to the birthday kid.",
            ] },
            { t: "stats", items: [{ n: "2,000+", l: "parties" }, { n: "Ages 3–10", l: "perfect for" }] },
          ],
          "/book": [
            { t: "steps", h: "Booking is easy", items: [
              { h: "Pick a date", p: "Weekends fill up fast!" },
              { h: "Pick a theme", p: "Pirates, princesses or dinosaurs." },
              { h: "Party!", p: "Pete brings the magic. You bring the cake." },
            ] },
          ],
        },
      },
      refs: ["kids party magician", "balloon animals"],
      trends: [
        { id: "pp-balloons", label: "Balloon animals", match: ["balloon animals"], tags: ["trend-balloons"] },
        { id: "pp-rainbow", label: "Rainbow everything", match: ["rainbow"], tags: ["trend-rainbow"] },
        { id: "pp-mascot", label: "A cartoon mascot", match: ["cartoon wizard"], tags: ["trend-mascot"] },
        { id: "pp-kids", label: "Kids' parties", match: ["ages 3"], tags: ["trend-kids"] },
      ],
    },

    "marcuskane.live": {
      who: "Marcus Kane", role: "", co: "Marcus Kane", dom: "marcuskane.live", frame: "studio",
      theme: {
        bg: "#0B0B0B", panel: "#161616", ink: "#F2F2F2", dim: "#8A8A8A", line: "#2A2A2A",
        brand: "#FFFFFF", brand2: "#0B0B0B", link: "#FFFFFF", onBrand: "#0B0B0B",
        head: "Helvetica, Arial, sans-serif", body: "Helvetica, Arial, sans-serif", mark: "slab", markText: "MK",
      },
      site: {
        tagline: "Street magic. Mind reading. No top hats.",
        nav: [["Home", "/"], ["Videos", "/videos"]],
        pages: {
          "/": [
            { t: "lede", p: "No top hats. No rabbits. Just a deck of cards and whatever you are thinking right now." },
            { t: "plate", q: "magician hands playing cards", cap: "Close-up. Always close-up." },
            { t: "prose", h: "The look", ps: ["Everything is shot in black and white, because colour is a distraction."] },
          ],
          "/videos": [
            { t: "feed", h: "Latest", items: [
              { d: "Sep 18", h: "I read a stranger's PIN on the 14 bus", p: "Filmed in one take. 2.1 million views." },
              { d: "Sep 04", h: "The card was in his shoe the whole time", p: "Filmed in one take. 880,000 views." },
            ] },
          ],
        },
      },
      refs: ["magician hands playing cards", "street magic"],
      trends: [
        { id: "mk-cards", label: "Close-up card magic", match: ["deck of cards"], tags: ["trend-cards"] },
        { id: "mk-close", label: "Close-up photos, always", match: ["always close-up"], tags: ["trend-closeup"] },
        { id: "mk-mono", label: "Black and white", match: ["black and white"], tags: ["trend-mono"] },
        { id: "mk-video", label: "Street magic on video", match: ["filmed in one take"], tags: ["trend-video"] },
      ],
    },

    /* A zine about small, local cryptids, printed on a library risograph. */
    "weirdthingszine.net": {
      who: "Alex", role: "Editor, writer, stapler", co: "Weird Things", dom: "weirdthingszine.net", frame: "press",
      theme: {
        bg: "#FFF6F2", panel: "#FFE3EE", ink: "#1F3A6B", dim: "#6C7BA0", line: "#F4B8D2",
        brand: "#FF48B0", brand2: "#1F3A6B", link: "#D42F8E", onBrand: "#FFF6F2",
        head: "'Courier New', monospace", body: "Georgia, serif", mark: "grid", markText: "WT",
      },
      site: {
        tagline: "A zine about the cryptids nobody talks about",
        foot: "printed on the library risograph · stapled by hand · believe the witnesses",
        nav: [["Home", "/"], ["Issues", "/issues"], ["Field notes", "/field-notes"]],
        pages: {
          "/": [
            { t: "lede", p: "Weird Things is a zine about the cryptids nobody talks about. Not Bigfoot. The small ones, the local ones, the one your uncle saw." },
            { t: "notice", h: "Issue 4 is coming", p: "The Big Duck. Our biggest story yet, literally. The cover is in progress.", stamp: "SOON" },
            { t: "prose", h: "How it's made", ps: [
              "Every issue is printed on the risograph at the Hollis Street library in two inks, fluorescent pink and blue, on whatever paper they have.",
              "Sixteen pages, folded and stapled at my kitchen table. Forty copies, then forty more if people ask.",
            ] },
            { t: "swatches", h: "The inks", note: "what the library has. there is no black", items: [
              { c: "#FF48B0", n: "Fluorescent pink" }, { c: "#3255A4", n: "Blue" }, { c: "#FFF6F2", n: "The paper (it counts)" },
            ] },
          ],
          "/issues": [
            { t: "feed", h: "Back issues", items: [
              { d: "Mar", h: "Issue 3: The Hollow Tree Lights", p: "Three lights, one tree, no explanation anyone liked." },
              { d: "Nov", h: "Issue 2: Mrs. Albee's Cat, Who Is Too Long", p: "Measured twice. Still too long." },
              { d: "Jun", h: "Issue 1: The Thing in the Culvert", p: "Sold out. The culvert has since been replaced." },
            ] },
          ],
          "/field-notes": [
            { t: "spec", h: "The Big Duck — field notes", rows: [
              ["Seen at", "Carvel Reservoir, north shore"],
              ["Size", "About the size of a canoe"],
              ["Witnesses", "Three fishermen and a mail carrier"],
              ["First seen", "April 14, just after dawn"],
              ["Photographs", "One. Blurry."],
            ] },
            { t: "prose", h: "What they said", ps: [
              "“It looked at me like I owed it money.” — Ray, fisherman",
              "“Nineteen years I've delivered on that road. That was not a goose.” — the mail carrier",
            ] },
          ],
        },
      },
      refs: ["mallard duck", "reservoir at dawn", "blurry lake photo"],
    },

    "itwasalog.net": {
      who: "The Society", role: "", co: "It Was A Log", dom: "itwasalog.net", frame: "civic",
      theme: {
        bg: "#F4F6F4", panel: "#E3E9E3", ink: "#1D2A22", dim: "#5E6E63", line: "#C8D3CA",
        brand: "#3B6B4A", brand2: "#1D2A22", link: "#2F5A3C", onBrand: "#F4F6F4",
        head: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif", mark: "slab", markText: "LOG",
      },
      site: {
        tagline: "Sightings, explained",
        nav: [["Home", "/"], ["Explained", "/explained"]],
        pages: {
          "/": [
            { t: "lede", p: "It was a log. It is almost always a log." },
            { t: "prose", h: "Our method", ps: [
              "Every sighting gets a side-by-side comparison: the photograph, and the log, otter or plastic bag it turned out to be.",
              "This year we have explained 212 sightings. Nobody has ever thanked us.",
            ] },
          ],
          "/explained": [
            { t: "table", h: "Recently explained", cols: ["Sighting", "What it was"], rows: [
              ["The Culvert Thing", "A shopping trolley"],
              ["The Hollow Tree Lights", "A bicycle reflector"],
              ["The Big Duck", "Under review. Probably a canoe."],
            ] },
          ],
        },
      },
      refs: ["log floating in a lake"],
      trends: [
        { id: "log-compare", label: "Side-by-side comparisons", match: ["side-by-side comparison"], tags: ["trend-compare"] },
        { id: "log-count", label: "A running count of explanations", match: ["explained 212"], tags: ["trend-count"] },
      ],
    },

    "squatchdepot.com": {
      who: "Squatch Depot", role: "", co: "Squatch Depot", dom: "squatchdepot.com", frame: "shop",
      theme: {
        bg: "#F7F3E8", panel: "#E9E0C8", ink: "#2A2418", dim: "#76694E", line: "#D8CCAA",
        brand: "#3E7A2E", brand2: "#8A4B1F", link: "#2F6322", onBrand: "#F7F3E8",
        head: "Impact, 'Arial Black', sans-serif", body: "Helvetica, Arial, sans-serif", mark: "disc", markText: "SD",
      },
      site: {
        tagline: "Gifts for the Squatch-curious",
        cart: "Cart (0)",
        nav: [["Shop", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "BELIEVE. Then buy the mug." },
            { t: "products", h: "Top sellers", items: [
              { name: "The BELIEVE mug", meta: "11oz, dishwasher safe", price: "$14", ref: "bigfoot mug" },
              { name: "Squatch air freshener", meta: "Pine scent", price: "$4", ref: "pine air freshener" },
              { name: "Cartoon Squatch tee", meta: "He's waving!", price: "$22", ref: "cartoon bigfoot shirt" },
            ] },
          ],
        },
      },
      refs: ["bigfoot mug", "cartoon bigfoot shirt"],
      trends: [
        { id: "sq-believe", label: "BELIEVE, in big letters", match: ["believe"], tags: ["trend-believe"] },
        { id: "sq-cartoon", label: "A cartoon cryptid", match: ["cartoon squatch"], tags: ["trend-cartoon"] },
      ],
    },

    /* A franchise's corporate site. The client runs one store, and the brand
     * is not his to change — only to work inside. */
    "burgerbaron.com": {
      who: "Burger Baron", role: "", co: "Burger Baron", dom: "burgerbaron.com", frame: "shop",
      theme: {
        bg: "#FFF8EC", panel: "#FFE9C2", ink: "#3A1A10", dim: "#8A5A40", line: "#F2D19A",
        brand: "#C8102E", brand2: "#FFC72C", link: "#A50D25", onBrand: "#FFF8EC",
        head: "'Arial Black', Impact, sans-serif", body: "Helvetica, Arial, sans-serif", mark: "crest", markText: "BB",
      },
      site: {
        tagline: "Flame-crowned since 1971",
        cart: "Order ahead",
        foot: "© Burger Baron Holdings. Participating locations only. The Baron presides.",
        nav: [["Home", "/"], ["Menu", "/menu"], ["Store #214", "/stores/214"], ["For franchisees", "/franchise"]],
        pages: {
          "/": [
            { t: "lede", p: "Flame-crowned burgers, Crown Fries and the Royal Shake, at 1,140 locations across the region." },
            { t: "notice", h: "Breakfast", p: "Breakfast is served at participating locations. Ask your Baron.", stamp: "6–10:30" },
          ],
          "/menu": [
            { t: "products", h: "The menu", items: [
              { name: "The Baron", meta: "Quarter pound, flame-crowned", price: "$3.49", ref: "cheeseburger" },
              { name: "Crown Fries", meta: "Medium", price: "$1.29", ref: "french fries" },
              { name: "Royal Shake", meta: "Vanilla, chocolate or crown berry", price: "$1.99", ref: "milkshake" },
              { name: "Baron Biscuit", meta: "Egg and cheese, breakfast only", price: "$1.79", ref: "breakfast biscuit" },
            ] },
          ],
          "/stores/214": [
            { t: "spec", h: "Store #214", rows: [
              ["Where", "Route 9, next to Tire Barn"],
              ["Owner-operator", "Dwayne Tully, since 1998"],
              ["Hours", "Opens at 6am, every day of the year"],
              ["Awards", "1998 Regional Cleanest Grill"],
            ] },
            { t: "people", h: "Your Baron", items: [
              { n: "Dwayne Tully", r: "Owner-operator", seed: "baron214_dwayne", lead: true,
                p: "Arrives at four-thirty. Knows the regulars' orders. Has opinions about breakfast." },
            ] },
          ],
          "/franchise": [
            { t: "notice", h: "Brand standards", p: "For franchisees. All local marketing must be approved by Regional on form BB-7.", stamp: "BB-7" },
            { t: "spec", h: "The rules", rows: [
              ["Colours", "Baron Red and Crown Gold. Nothing else leads."],
              ["The crown", "Never tilted, never cropped."],
              ["The Baron", "The Baron never holds food. The Baron presides."],
              ["Words", "Never use the word best. Legal has asked twice."],
            ] },
            { t: "swatches", h: "Brand colours", items: [
              { c: "#C8102E", n: "Baron Red" }, { c: "#FFC72C", n: "Crown Gold" }, { c: "#3A1A10", n: "Grill Brown, text only" },
            ] },
          ],
        },
      },
      refs: ["cheeseburger", "gold crown", "drive thru at dawn"],
    },

    "clucksworth.com": {
      who: "Clucksworth", role: "", co: "Clucksworth Chicken", dom: "clucksworth.com", frame: "shop",
      theme: {
        bg: "#FFF9E8", panel: "#FCEBC0", ink: "#3A2412", dim: "#8A6A48", line: "#F0D9A0",
        brand: "#E86A1C", brand2: "#5A2E12", link: "#C4541A", onBrand: "#FFF9E8",
        head: "Georgia, 'Times New Roman', serif", body: "Helvetica, Arial, sans-serif", mark: "disc", markText: "CC",
      },
      site: {
        tagline: "Say hi to Chester!",
        cart: "Order",
        nav: [["Home", "/"]],
        pages: {
          "/": [
            { t: "lede", p: "Biscuits from 6am. Buckets all day." },
            { t: "products", h: "Favourites", items: [
              { name: "Sunrise Biscuit", meta: "Chicken and honey butter", price: "$1.99", ref: "chicken biscuit" },
              { name: "Family Bucket", meta: "Twelve pieces, four sides", price: "$14.99", ref: "fried chicken bucket" },
            ] },
            { t: "prose", h: "Meet Chester", ps: ["Chester is our cartoon rooster. He is on every box, every cup and every bucket."] },
          ],
        },
      },
      refs: ["fried chicken bucket", "chicken biscuit"],
      trends: [
        { id: "cw-biscuit", label: "Breakfast biscuits", match: ["biscuits from 6am"], tags: ["trend-biscuit"] },
        { id: "cw-mascot", label: "A cartoon mascot", match: ["cartoon rooster"], tags: ["trend-mascot"] },
      ],
    },

    "earlybirddiner.net": {
      who: "The Early Bird", role: "", co: "The Early Bird Diner", dom: "earlybirddiner.net", frame: "paper",
      theme: {
        bg: "#FBF7EE", panel: "#EDE6D4", ink: "#1E2E2E", dim: "#5E6E6A", line: "#D9D0B8",
        brand: "#2E8C8C", brand2: "#1E2E2E", link: "#226E6E", onBrand: "#FBF7EE",
        head: "Georgia, 'Times New Roman', serif", body: "Georgia, 'Times New Roman', serif", mark: "wave", markText: "EB",
      },
      site: {
        tagline: "All-day breakfast since 1964",
        nav: [["Home", "/"], ["Menu", "/menu"]],
        pages: {
          "/": [
            { t: "lede", p: "Sit down. Stay a while. There is a booth with your name on it." },
            { t: "prose", h: "The coffee", ps: ["Bottomless coffee with every plate, until you tell us to stop."] },
          ],
          "/menu": [
            { t: "table", h: "Breakfast plates", cols: ["Plate", "Price"], rows: [
              ["Two eggs any style", "$6.50"],
              ["Short stack", "$5.75"],
              ["The Early Bird (everything)", "$9.95"],
            ] },
          ],
        },
      },
      refs: ["diner breakfast plate", "diner coffee"],
      trends: [
        { id: "eb-plates", label: "Sit-down plates", match: ["sit down"], tags: ["trend-plates"] },
        { id: "eb-coffee", label: "Bottomless coffee", match: ["bottomless coffee"], tags: ["trend-coffee"] },
      ],
    },
  };

  /* ── gigs ──────────────────────────────────────────────── */
  const gigs = {

    "otp-banner": {
      kind: "listing", discipline: "graphic", app: "banner",
      title: "need banner w/ my OTP for my anime fan site!!",
      short: "BATON PASS BANNER",
      pay: "$20 + credit on the site",
      posted: "Sep 14", area: "online",
      minRep: 0,
      poster: { handle: "batonpass_nell", name: "Nell", site: "thebatonpass.net" },
      listing: [
        "hi!! my fan site banner got deleted and the site looks broken without it.",
        "the site is about Paper Moon Relay (the anime) and my OTP. must know what an OTP is.",
        "paying $20 and credit on every page. please be nice to me i am new at this",
      ],
      dialogue: {
        patience: 6,
        pause: 14000,
        filler: ["...", "r u still there?? my connection is bad sometimes", "sorry i thought it froze"],
        opening: ["omg hi!! thank u for replying", "ok so i run a fan site for paper moon relay and my banner got deleted"],
        options: {
          ship: { ask: "Who's the pairing?", reply: ["TOMA AND KIYOSHI", "toma arakawa x kiyoshi mori. tomakiyo. the only ship"], reveals: ["names"] },
          site: { ask: "What's the site called?", reply: ["The Baton Pass!!", "the name has to be on it or ppl won't know where they are"], reveals: ["sitename"] },
          size: { ask: "Where does the banner go, and what size is it?", reply: ["top of every page", "728 by 90, the normal size", "and not too many colours, it looks messy that small"], reveals: ["size", "palette"] },
          colours: { ask: "Do any colours mean something to them?", reply: ["YES ok toma is orange and kiyoshi is navy", "it's on my characters page if u want the lore"], reveals: ["colours"] },
          onmodel: { ask: "Should they look exactly like they do in the show?", reply: ["YES. on-model or the forum eats me alive", "but no screenshots!! the studio takes fan sites down for that", "u have to actually draw them"], reveals: ["onmodel"] },
          vibe: { ask: "What should it feel like?", reply: ["like. the end of a race. when it's getting dark", "u know?"] },
          ep12: { ask: "Is that a particular episode?", requires: ["vibe"], reply: ["EPISODE 12", "the relay final is at dusk and kiyoshi hands toma the baton for the first time. i cried"], reveals: ["dusk"] },
          pay: { ask: "Is there any room in the budget?", reply: ["uh", "it's $20 and credit... i'm saving for a con ticket"], cost: 2 },
          done: { ask: "That's everything I need. I'll get started.", reply: ["YAY ok ty!!!", "the site is thebatonpass.net if u need anything"], end: true, cost: 0 },
        },
        leave: ["sorry my mum is calling me for dinner", "just make it cool!! byeee"],
        challenges: {
          // Her site says why the last banner vanished. If you read that
          // before the call, you can ask the question she does not know to
          // answer: forty pages still point at the old filename.
          filename: {
            after: "size", needsFact: "deleted",
            ask: "Your host deleted the last one \u2014 what were the old pages pointing at?",
            reply: ["oh", "ok so every page still links /images/banner.gif", "if u name it banner.gif i don't have to edit 40 pages by hand"],
            reveals: ["filename"],
          },
        },
      },
      needs: [
        { id: "filename", label: "Delivered as banner.gif \u2014 40 pages link to it",
          missed: "It isn't named banner.gif, so forty pages stay broken", text: ["banner.gif"], weight: 1 },
        { id: "names", label: "Toma and Kiyoshi, both, by name", missed: "Toma and Kiyoshi aren't both named on it", text: ["toma", "kiyoshi"], weight: 3 },
        { id: "sitename", label: "The site's name: The Baton Pass", missed: "The site's name isn't on it", text: ["the baton pass"], weight: 2 },
        { id: "colours", label: "Their colours: Toma's orange, Kiyoshi's navy", missed: "Toma's orange and Kiyoshi's navy aren't both there", all: ["orange", "navy"], weight: 2 },
        { id: "dusk", label: "Episode 12's final, at dusk", missed: "Nothing of episode 12's dusk final", tags: ["dusk"], weight: 2 },
        // Judged by eye against the model sheets: mark where you drew each of
        // them by dropping their pin on the canvas. See hustle/likeness.js.
        { id: "onmodel", label: "Toma and Kiyoshi, on-model — drawn, not screenshotted", missed: "They don't look like themselves", subjects: ["toma", "kiyoshi"], weight: 3 },
      ],
      limits: [
        { id: "size", rule: "size", w: 728, h: 90, label: "Banner size, 728 × 90" },
        { id: "palette", rule: "maxColours", value: 12, label: "Twelve colours or fewer" },
      ],
      facts: [
        { id: "sweatband", where: "thebatonpass.net", label: "Toma's orange sweatband", match: ["orange sweatband"], tags: ["toma", "orange-lore"] },
        { id: "jacket", where: "thebatonpass.net", label: "Kiyoshi's navy jacket", match: ["navy kurohama track jacket"], tags: ["kiyoshi", "navy-lore"] },
        { id: "ep12", where: "thebatonpass.net", label: "Ep 12: the final at dusk", match: ["episode 12", "at dusk"], tags: ["ep12", "dusk"] },
        { id: "deleted", where: "thebatonpass.net", label: "Why the banner is gone", match: ["host deleted"], tags: ["history"] },
        { id: "cowlick", where: "thebatonpass.net", label: "Toma's cowlick never lies flat", match: ["cowlick"], tags: ["toma-look"] },
        { id: "fringe", where: "thebatonpass.net", label: "Kiyoshi's fringe: always his left eye", match: ["fringe covers his left eye"], tags: ["kiyoshi-look"] },
        { id: "eyeline", where: "thebatonpass.net", label: "Toma's band at Kiyoshi's eye line", match: ["sweatband sits at kiyoshi's eye line"], tags: ["scale"] },
        { id: "toma-height", where: "papermoonrelay.tv", label: "Toma: 172 cm", match: ["172 cm"], tags: ["scale", "toma"] },
        { id: "kiyoshi-height", where: "papermoonrelay.tv", label: "Kiyoshi: 178 cm", match: ["178 cm"], tags: ["scale", "kiyoshi"] },
      ],
      refs: [
        { q: "relay baton", tags: ["baton"] },
        { q: "running track at dusk", tags: ["dusk", "track"] },
        { q: "orange sweatband", tags: ["orange-lore"] },
        { q: "navy track jacket", tags: ["navy-lore"] },
        { q: "toma arakawa", tags: ["toma"] },
        { q: "kiyoshi mori", tags: ["kiyoshi"] },
      ],
      competitors: ["moonrelayfans.org", "hoshizora-anchor.net"],
      features: [
        { id: "shots", label: "Episode screenshots", doneBy: { "moonrelayfans.org": "mr-shots", "hoshizora-anchor.net": "al-shots" } },
        { id: "roster", label: "The whole team", doneBy: { "moonrelayfans.org": "mr-roster" } },
        { id: "sparkle", label: "Sparkle text", doneBy: { "moonrelayfans.org": "mr-sparkle" } },
        { id: "solo", label: "One character alone", doneBy: { "hoshizora-anchor.net": "al-solo" } },
        { id: "handoff", label: "The baton changing hands", gap: true },
      ],
      gap: { tag: "gap-handoff", label: "the hand-off, which no other site draws", line: "Every rival shows screenshots or one runner. Nobody shows the moment the baton changes hands." },
      research: { seconds: 300 },
      deadline: 900,
      output: { label: "Your Baton Pass banner", tags: ["otp-banner", "baton-pass"] },
      wrap: {
        5: ["I AM SCREAMING", "it's perfect. the HAND-OFF. i'm putting it up right now and telling everyone who made it"],
        4: ["omg it's so good!!", "putting it up now, ur name is going in the footer"],
        3: ["ooh ok!! it's nice", "a couple things aren't quite what i meant but i'll use it"],
        2: ["oh", "it's ok... i might tweak it myself"],
        1: ["um", "this isn't really what i asked for"],
      },
    },

    "otp-site": {
      kind: "chain", discipline: "webui", app: "layout",
      after: { gig: "otp-banner", minStars: 3 },
      title: "redo my whole fan site around the banner",
      short: "BATON PASS SITE",
      pay: "$40",
      poster: { handle: "batonpass_nell", name: "Nell", site: "thebatonpass.net" },
      invite: ["ok so. everyone loves the banner", "the rest of my site looks terrible next to it now lol", "could u redo the homepage?? i can pay $40 this time"],
      dialogue: {
        patience: 5,
        pause: 13000,
        filler: ["...", "hello?? did i lag", "ok i'll just wait"],
        opening: ["ok so what do u need to know"],
        options: {
          banner: { ask: "Should the banner I made lead the page?", reply: ["YES obviously", "it's the best thing on the site"], reveals: ["banner"] },
          sections: { ask: "What has to be on the homepage?", reply: ["the two of them, like who they are", "and how many members we have, i'm proud of that"], reveals: ["characters", "community"] },
          complaints: { ask: "What do members complain about?", reply: ["SPOILERS", "ppl keep ruining episode 12 for new fans. there's no warning anywhere"], reveals: ["spoilers"] },
          colour: { ask: "What colour should the site be?", reply: ["orange or navy!! toma or kiyoshi", "not purple. it's purple now and i hate it"], reveals: ["brand"] },
          length: { ask: "How long should the page be?", reply: ["not too long, nobody scrolls", "like seven sections max"], reveals: ["length"] },
          done: { ask: "Great, I have enough to start.", reply: ["tysm!!!"], end: true, cost: 0 },
        },
        leave: ["gtg, school tomorrow", "u know what to do!!"],
      },
      needs: [
        { id: "banner", label: "Your banner, leading the page", missed: "The banner isn't on the page", tags: ["otp-banner"], weight: 3 },
        { id: "characters", label: "A section on Toma and Kiyoshi", missed: "No section on Toma and Kiyoshi", blocks: ["people"], text: ["toma", "kiyoshi"], weight: 2 },
        { id: "spoilers", label: "A spoiler warning", missed: "No spoiler warning", blocks: ["notice"], text: ["spoiler"], weight: 2 },
        { id: "community", label: "The member count", missed: "The member count isn't shown", blocks: ["stats"], text: ["members"], weight: 1 },
        { id: "brand", label: "Orange or navy as the site colour", missed: "The site colour isn't Toma's or Kiyoshi's", tags: ["orange", "navy"], weight: 1 },
      ],
      limits: [
        { id: "length", rule: "maxBlocks", value: 7, label: "Seven sections or fewer" },
      ],
      facts: [
        { id: "members", where: "thebatonpass.net", label: "212 members", match: ["members"], tags: ["community"] },
        { id: "nospoilers", where: "thebatonpass.net", label: "There's no spoiler system", match: ["no spoiler system"], tags: ["spoilers"] },
      ],
      refs: [{ q: "relay baton", tags: ["baton"] }],
      competitors: ["moonrelayfans.org", "hoshizora-anchor.net"],
      features: [
        { id: "episodes", label: "An episode guide", doneBy: { "moonrelayfans.org": "mr-episodes", "hoshizora-anchor.net": "al-episodes" } },
        { id: "fic", label: "A fan fiction archive", doneBy: { "moonrelayfans.org": "mr-fic" } },
        { id: "gallery", label: "A fan art gallery", doneBy: { "hoshizora-anchor.net": "al-gallery" } },
        { id: "spoilersafe", label: "Spoiler-safe for new fans", gap: true },
      ],
      gap: { tag: "gap-spoilersafe", label: "a site that is safe for new fans", line: "Both rivals put the episode 12 spoilers one click from the homepage." },
      research: { seconds: 240 },
      deadline: 1200,
      wrap: {
        5: ["this is the best fan site on the internet and i mean that", "new fans can finally read it without getting spoiled!!"],
        4: ["it looks SO much better", "ok i'm switching it over tonight"],
        3: ["nice!! it's way better than before"],
        2: ["hmm it's a bit different from what i pictured"],
        1: ["i don't think this is my site anymore"],
      },
    },

    "pell-sprite": {
      kind: "listing", discipline: "character", app: "pixel",
      title: "pixel artist wanted: shopkeeper sprite for a cosy game",
      short: "MRS. PELL SPRITE",
      pay: "$35",
      posted: "Sep 15", area: "online / remote",
      minRep: 0,
      poster: { handle: "thimble_ines", name: "Ines", site: "thimblewickgame.net" },
      listing: [
        "Solo dev making Thimblewick, a cosy game about a mending shop. I need the shopkeeper.",
        "One sprite, one idle frame. The art rules are on the devlog. $35 on delivery.",
      ],
      dialogue: {
        patience: 5,
        pause: 10000,
        filler: ["...", "I do have to get back to the build."],
        opening: ["Hi, thanks for getting in touch.", "What do you need from me?"],
        options: {
          who: { ask: "Who is the shopkeeper?", reply: ["Mrs. Pell. Retired tailor, sixty-eight.", "She is not cute. She is competent."], reveals: ["elder"] },
          look: { ask: "What does she wear?", reply: ["A green cardigan and a yellow tape measure around her neck.", "Grey hair, pinned up."], reveals: ["cardigan", "tape", "hair"] },
          rules: { ask: "Are there technical rules for sprites?", reply: ["32 by 32, eight colours at most.", "It's all on the Art rules page."], reveals: ["size", "palette"] },
          style: { ask: "Should she look like other cosy game shopkeepers?", reply: ["Honestly I haven't looked.", "I just don't want her to be generic."] },
          done: { ask: "Got it. I'll send her over soon.", reply: ["Thank you."], end: true, cost: 0 },
        },
        leave: ["I have to get back to the build. The devlog has everything."],
        challenges: {
          // Eight colours, and a dark outline on everything that moves. Both
          // are on her art rules page, and only one of them is a number.
          outline: {
            after: "rules", needsFact: "rules",
            ask: "Eight colours including the outline, or eight plus it?",
            reply: ["Including.", "Everyone gets that wrong and sends me nine. Dark 1px, on everything that moves."],
            reveals: ["outline"],
          },
        },
      },
      needs: [
        { id: "elder", label: "She reads as older — a retired tailor", missed: "She doesn't read as a retired tailor", tags: ["elder"], weight: 2 },
        { id: "cardigan", label: "The green cardigan", missed: "No green cardigan", all: ["green"], weight: 2 },
        { id: "tape", label: "The yellow tape measure", missed: "No yellow tape measure", all: ["yellow"], weight: 1 },
        { id: "hair", label: "Grey hair", missed: "Her hair isn't grey", tags: ["grey", "white"], weight: 1 },
        { id: "outline", label: "A dark outline", missed: "No dark outline", tags: ["dark", "black"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 32, h: 32, label: "32 × 32" },
        { id: "palette", rule: "maxColours", value: 8, label: "Eight colours at most" },
        { id: "mode", rule: "mode", value: "pixel", label: "Pixel art" },
      ],
      facts: [
        { id: "pell", where: "thimblewickgame.net", label: "Mrs. Pell, retired tailor, 68", match: ["retired tailor"], tags: ["elder", "pell"] },
        { id: "wardrobe", where: "thimblewickgame.net", label: "Green cardigan, yellow tape", match: ["green cardigan", "tape measure"], tags: ["pell"] },
        { id: "rules", where: "thimblewickgame.net", label: "32 × 32 sprites", match: ["32 × 32"], tags: ["rules"] },
      ],
      refs: [
        { q: "yellow tape measure", tags: ["tape"] },
        { q: "green knitted cardigan", tags: ["cardigan"] },
      ],
      competitors: ["needleandhearth.net", "bramblemarket.net"],
      features: [
        { id: "young", label: "A young shopkeeper", doneBy: { "needleandhearth.net": "nh-young" } },
        { id: "counter", label: "Only seen behind the counter", doneBy: { "needleandhearth.net": "nh-counter", "bramblemarket.net": "bm-counter" } },
        { id: "cat", label: "A shop cat", doneBy: { "bramblemarket.net": "bm-cat" } },
        { id: "fullbody", label: "The whole shopkeeper, at work", gap: true },
      ],
      gap: { tag: "gap-fullbody", label: "a shopkeeper shown whole, working", line: "Every rival hides their shopkeeper behind a counter." },
      research: { seconds: 240 },
      deadline: 900,
      wrap: {
        5: ["She's exactly right.", "She looks like she'd fix your hem and tell you it was badly sewn. Paying now."],
        4: ["This is really good. She's going in the build tonight."],
        3: ["Good start. I'll adjust a couple of pixels."],
        2: ["Hm. She's not quite Mrs. Pell."],
        1: ["This isn't going to work, sorry."],
      },
    },

    "kiln-night": {
      kind: "prospect", discipline: "graphic", app: "banner",
      site: "kettleandkiln.com",
      minRep: 6,
      inboundRep: 16,
      title: "A poster for Open Kiln Night",
      short: "KILN NIGHT POSTER",
      pay: "£60",
      poster: { handle: "kettleandkiln", name: "Priya", site: "kettleandkiln.com" },
      pitchReject: ["Thanks for reaching out!", "We usually work with people with a bit more of a track record. Maybe down the line?"],
      invite: ["Hi — Priya from Kettle & Kiln.", "A couple of people mentioned your work. We need a poster for Open Kiln Night. Brief below."],
      dialogue: {
        patience: 5,
        pause: 9000,
        filler: ["Sorry \u2014 one second.", "...right. Where were we?"],
        opening: ["Hello! You found us.", "Sorry about the noise, we're open. What can I help with?"],
        options: {
          what: { ask: "Is there anything you need designed?", reply: ["Actually, yes. A poster for Open Kiln Night.", "It's our Thursday evening, and nobody knows about it."], reveals: ["title"] },
          when: { ask: "When is it, and what does it cost?", requires: ["what"], reply: ["Every Thursday after six.", "£12 covers your piece and the firing."], reveals: ["day", "price"] },
          where: { ask: "Where will the poster go?", requires: ["what"], reply: ["The window, and the board at the library.", "A4 portrait-ish. People read it from the pavement, so nothing tiny."], reveals: ["size", "text"] },
          look: { ask: "Anything you don't want it to look like?", reply: ["No gradients. Our last menu had one and I still think about it.", "We're terracotta, not pastel."], reveals: ["gradient", "terracotta"] },
          done: { ask: "Lovely — I'll put something together.", reply: ["Wonderful, thank you."], end: true, cost: 0 },
        },
        leave: ["Sorry, someone just walked in. Email me!"],
        challenges: {
          // Her own page says the twelve pounds covers the glaze firing. It
          // does not say it covers the piece, and nobody has ever asked.
          bisque: {
            after: "when", needsFact: "thursdays",
            ask: "Your site says \u00a312 covers the glaze firing \u2014 is the piece itself extra?",
            reply: ["...Yes. It is.", "Nobody ever asks, and then they're surprised at the counter.", "Put 'from \u00a312' on it. I should have said."],
            reveals: ["frombisque"],
          },
        },
      },
      needs: [
        { id: "frombisque", label: "\u201cfrom \u00a312\u201d \u2014 the piece is extra",
          missed: "It reads \u00a312 flat, and people find that out at the counter", text: ["from \u00a312"], weight: 1 },
        { id: "title", label: "It says Open Kiln Night", missed: "It doesn't say Open Kiln Night", text: ["open kiln night"], weight: 3 },
        { id: "day", label: "Thursdays", missed: "It doesn't say when", text: ["thursday"], weight: 1 },
        { id: "price", label: "£12", missed: "The price isn't on it", text: ["12"], weight: 1 },
        { id: "terracotta", label: "Terracotta, not pastel", missed: "Nothing of their terracotta", tags: ["terracotta"], weight: 2 },
      ],
      limits: [
        { id: "size", rule: "size", w: 600, h: 850, label: "Poster, 600 × 850" },
        { id: "gradient", rule: "noGradient", label: "No gradients" },
        { id: "text", rule: "minText", value: 20, label: "No text smaller than 20px" },
      ],
      facts: [
        { id: "thursdays", where: "kettleandkiln.com", label: "Thursdays after six, £12", match: ["every thursday", "£12"], tags: ["kiln-night"] },
        { id: "kiln", where: "kettleandkiln.com", label: "People never see the kiln", match: ["never see the kiln"], tags: ["kiln"] },
      ],
      refs: [
        { q: "terracotta mugs", tags: ["terracotta"] },
        { q: "pottery kiln fire", tags: ["kiln", "terracotta"] },
      ],
      competitors: ["thepaintedcup.com", "glazeandgraze.com"],
      features: [
        { id: "kids", label: "Kids' parties", doneBy: { "thepaintedcup.com": "pc-kids" } },
        { id: "pastel", label: "Pastel everything", doneBy: { "thepaintedcup.com": "pc-pastel", "glazeandgraze.com": "gg-pastel" } },
        { id: "wine", label: "Wine and cheese", doneBy: { "glazeandgraze.com": "gg-wine" } },
        { id: "kilnshow", label: "Showing the kiln itself", gap: true },
      ],
      gap: { tag: "gap-kiln", label: "the kiln itself, which no rival shows", line: "Everyone sells the painting. Nobody shows the fire." },
      research: { seconds: 300 },
      deadline: 1200,
      wrap: {
        5: ["Oh, this is going straight in the window.", "People are going to come just to see the kiln. Invoice me."],
        4: ["This is great. Printing it tomorrow."],
        3: ["Nice work — I'll ask for a small change or two."],
        2: ["It's not quite us, I'm afraid."],
        1: ["I don't think we can use this."],
      },
    },

    /* A rebrand in two parts. The old brand is still his website, and the
     * website remembers things he gets wrong on the phone. */
    "dennis-wordmark": {
      kind: "listing", discipline: "type", app: "type",
      title: "MAGICIAN seeks designer (and possibly an assistant)",
      short: "MAGICIAN'S WORDMARK",
      pay: "$75",
      posted: "Sep 19", area: "Harrisburg / online",
      minRep: 0,
      poster: { handle: "improbable_dennis", name: "Dennis", site: "improbabledennis.com" },
      listing: [
        "The Improbable Dennis, performing since forever, has a new Friday residency and needs a new look.",
        "My granddaughter says my logo looks like a screensaver. I need a wordmark that belongs in a lounge.",
        "$75. Also, my assistant moved to Tampa. Ask me about it.",
      ],
      dialogue: {
        patience: 6,
        pause: 16000,
        filler: ["...Hello? Is this thing on?", "I'm leaning in. Is that better?", "Sorry, I thought you froze. People freeze on me."],
        opening: ["Hello! Hello. Can you see me? My granddaughter set this up.", "The Improbable Dennis. Thank you for answering the ad."],
        options: {
          name: { ask: "What's the act called, exactly?", reply: ["The Improbable Dennis. With the 'The'.", "My mother named it. Without the 'The' I sound like a weather forecast."], reveals: ["name"] },
          why: { ask: "Why a new look now?", reply: ["The Starlite Lanes want me Fridays, in the lounge. Grown-ups, with drinks.", "I showed the bartender my poster and she laughed. Kindly. But she laughed."] },
          colours: { ask: "Which colours are you keeping?", reply: ["The gold. The gold is the good part.", "Black and gold, like a proper lounge. The purple was for the birthday parties. No purple."], reveals: ["colours", "nopurple"] },
          feel: { ask: "What should it feel like?", reply: ["Like the old Vegas signs. The ones with all the bulbs.", "A showman. Not a man who does balloon animals, even though I do balloon animals."], reveals: ["vegas"] },
          where: { ask: "Where does the wordmark have to work?", reply: ["Wide, like a sign. My granddaughter says 'wordmark size'.", "And it gets embroidered on the new cape, so three colours at most, the lady said."], reveals: ["size", "thread"] },
          history: { ask: "How long have you been performing?", reply: ["Since '94. No, '93? A long time.", "I have a cape older than you."] },
          assistant: { ask: "Your ad mentioned an assistant?", reply: ["Denise! Nineteen years. She moved to Tampa in April.", "You'd only have to get in the box twice a night. No pressure. Some pressure."] },
          pay: { ask: "Is there any room in the budget?", reply: ["For the wordmark, seventy-five.", "For the right assistant, we can talk."], cost: 2 },
          done: { ask: "I have what I need. I'll send you something.", reply: ["Wonderful. Improbable, truly."], end: true, cost: 0 },
        },
        leave: ["Oh, the doves need feeding. They get opinions.", "Email me! I check it on Tuesdays."],
        challenges: {
          // He guesses at his own start date. His site says 1991, and being
          // reminded makes him realise the years are the pitch.
          since: {
            after: "history", needsFact: "since1991",
            ask: "Your site says 1991. Isn't it longer than you think?",
            reply: ["...1991. You're right. I lose a few years whenever I'm nervous.", "Put it on there. Since 1991. Thirty-odd years is the whole pitch. The young fellows can't say that."],
            reveals: ["heritage"],
          },
        },
      },
      needs: [
        { id: "name", label: "The Improbable Dennis, with the ‘The’", missed: "It isn't The Improbable Dennis, ‘The’ and all", text: ["the", "improbable", "dennis"], weight: 3 },
        { id: "colours", label: "Black and gold, like a proper lounge", missed: "It isn't black and gold", all: ["black", "yellow"], weight: 2 },
        { id: "vegas", label: "An old Vegas showman, not a kids' party", missed: "Nothing of the old Vegas signs in it", tags: ["vegas"], weight: 2 },
        { id: "heritage", label: "Since 1991: the years are the pitch", missed: "It doesn't say since 1991", text: ["1991"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 1200, h: 400, label: "Wordmark, 1200 × 400" },
        { id: "thread", rule: "maxColours", value: 3, label: "Three colours or fewer, for the embroidery" },
        { id: "nopurple", rule: "avoid", tags: ["purple"], label: "No purple: that was the birthday parties" },
      ],
      facts: [
        { id: "since1991", where: "improbabledennis.com", label: "Performing since 1991", match: ["since 1991"], tags: ["history"] },
        { id: "starlite", where: "improbabledennis.com", label: "Fridays at the Starlite Lanes lounge", match: ["starlite lanes"], tags: ["venue"] },
        { id: "cape", where: "improbabledennis.com", label: "Black velvet cape, gold trim", match: ["black velvet", "gold trim"], tags: ["cape"] },
        { id: "screensaver", where: "improbabledennis.com", label: "The purple looks like a screensaver", match: ["screensaver"], tags: ["dated"] },
      ],
      refs: [
        { q: "vintage vegas sign", tags: ["vegas"] },
        { q: "stage magician top hat", tags: ["magic"] },
        { q: "gold embroidery thread", tags: ["thread"] },
      ],
      competitors: ["partypetemagic.com", "marcuskane.live"],
      features: [
        { id: "balloons", label: "Balloon animals", doneBy: { "partypetemagic.com": "pp-balloons" } },
        { id: "rainbow", label: "Rainbow everything", doneBy: { "partypetemagic.com": "pp-rainbow" } },
        { id: "mono", label: "Black and white", doneBy: { "marcuskane.live": "mk-mono" } },
        { id: "video", label: "Street magic on video", doneBy: { "marcuskane.live": "mk-video" } },
        { id: "evening", label: "A grown-up night out", gap: true },
      ],
      gap: { tag: "gap-evening", label: "a grown-up night out, with old-school showmanship", line: "One sells kids' parties and the other sells videos. Nobody is selling an evening out." },
      research: { seconds: 240 },
      deadline: 900,
      output: { label: "Your Improbable Dennis wordmark", tags: ["dennis-wordmark"] },
      wrap: {
        5: ["Improbable! That's me. That's the me I meant.", "It goes to the embroidery lady tomorrow. And the offer about the box stands."],
        4: ["Oh, that's handsome. That's a lounge act.", "The bartender won't laugh at this one."],
        3: ["It's good! Not quite what I pictured, but good."],
        2: ["Hm. My granddaughter might like it."],
        1: ["I don't think this is The Improbable Dennis."],
      },
    },

    "dennis-poster": {
      kind: "chain", discipline: "graphic", app: "banner",
      after: { gig: "dennis-wordmark", minStars: 3 },
      title: "a poster for Fridays at the Starlite",
      short: "MAGICIAN'S LOUNGE POSTER",
      pay: "$120",
      poster: { handle: "improbable_dennis", name: "Dennis", site: "improbabledennis.com" },
      invite: ["It's Dennis! The embroidery lady cried. Good crying.", "The Starlite wants a poster for the lounge door and the board by the shoe counter.", "Same as before, a bit more money. Can you do it?"],
      dialogue: {
        patience: 6,
        pause: 16000,
        filler: ["...Hello? You've gone very still.", "I'm leaning in again. Sorry.", "Take your time. I'll hum."],
        opening: ["You again! Wonderful. I've been telling everyone about you.", "So. Fridays. The poster."],
        options: {
          mark: { ask: "Should the new wordmark lead it?", reply: ["Of course! That's the whole point.", "Big, at the top. People should know it's me before they know it's magic."], reveals: ["mark"] },
          when: { ask: "When is the show?", reply: ["Every Friday at nine, in the lounge.", "Put Fridays on it. People forget the day."], reveals: ["when"] },
          where: { ask: "What's the venue called, exactly?", reply: ["The Starlite Lanes. Starlite with an I-T-E.", "They're particular about that."], reveals: ["where"] },
          picture: { ask: "What should be in the picture?", reply: ["Kevin! The rabbit. Everyone knows me from the rabbit.", "Thirty years that rabbit's been on my cards."] },
          rules: { ask: "Does the venue have rules for it?", reply: ["Sharon runs the lounge. She says it has to say 21 and over, because it's in the bar.", "Poster size, the normal one. And nothing tiny, it's dark in there."], reveals: ["adults", "size", "text"] },
          colours: { ask: "The same colours as the wordmark?", reply: ["Black and gold. Still no purple. I'm a new man."], reveals: ["nopurple"] },
          done: { ask: "Great. I'll get going on it.", reply: ["Improbable! Thank you."], end: true, cost: 0 },
        },
        leave: ["The doves are making a noise. I have to go.", "Email me! Tuesdays."],
        challenges: {
          // Thirty years of the rabbit, and he forgets the rabbit retired. His
          // own site remembers.
          kevin: {
            after: "picture", needsFact: "kevin",
            ask: "Your site says Kevin retired to your sister's farm. Should he still be on it?",
            reply: ["...Oh.", "Oh, you're right. Kevin's been on the farm since 2019. I keep forgetting to tell the posters.", "The doves! The doves do the finale now. Put the doves on it."],
            reveals: ["doves"],
          },
        },
      },
      needs: [
        { id: "mark", label: "Your wordmark, leading the poster", missed: "The new wordmark isn't on it", tags: ["dennis-wordmark"], weight: 3 },
        { id: "where", label: "The Starlite Lanes", missed: "It doesn't say the Starlite Lanes", text: ["starlite lanes"], weight: 2 },
        { id: "when", label: "Fridays", missed: "It doesn't say Fridays", text: ["friday"], weight: 1 },
        { id: "adults", label: "21 and over, because it's in the bar", missed: "It doesn't say 21 and over", text: ["21"], weight: 1 },
        { id: "doves", label: "The doves, not the retired rabbit", missed: "No doves, and Kevin retired in 2019", tags: ["dove"], weight: 2 },
      ],
      limits: [
        { id: "size", rule: "size", w: 600, h: 850, label: "Poster, 600 × 850" },
        { id: "text", rule: "minText", value: 18, label: "No text smaller than 18px: the lounge is dark" },
        { id: "nopurple", rule: "avoid", tags: ["purple"], label: "Still no purple" },
      ],
      facts: [
        { id: "kevin", where: "improbabledennis.com", label: "Kevin the rabbit retired in 2019", match: ["kevin", "retired"], tags: ["rabbit"] },
        { id: "finale", where: "improbabledennis.com", label: "The doves do the finale", match: ["the doves do the finale"], tags: ["doves-lore"] },
        { id: "grownups", where: "improbabledennis.com", label: "The Starlite show is grown-ups only", match: ["grown-ups only"], tags: ["venue"] },
      ],
      refs: [
        { q: "white doves", tags: ["dove"] },
        { q: "bowling alley neon", tags: ["starlite"] },
        { q: "velvet stage curtain", tags: ["stage"] },
      ],
      competitors: ["partypetemagic.com", "marcuskane.live"],
      features: [
        { id: "mascot", label: "A cartoon mascot", doneBy: { "partypetemagic.com": "pp-mascot" } },
        { id: "kids", label: "Kids' parties", doneBy: { "partypetemagic.com": "pp-kids" } },
        { id: "closeup", label: "Close-up photos", doneBy: { "marcuskane.live": "mk-close" } },
        { id: "cards", label: "Card tricks", doneBy: { "marcuskane.live": "mk-cards" } },
        { id: "finale", label: "The finale, mid-trick", gap: true },
      ],
      gap: { tag: "gap-finale", label: "the finale, caught mid-trick", line: "Both of them put the magician on the poster. Nobody shows the magic happening." },
      research: { seconds: 240 },
      deadline: 1200,
      output: { label: "Your Starlite Fridays poster", tags: ["dennis-poster"] },
      wrap: {
        5: ["The doves! Mid-flight! Sharon put it on the door and by the shoe counter.", "Friday is sold out. The lounge holds forty, but still. Sold out."],
        4: ["That's a proper lounge poster.", "Kevin would understand."],
        3: ["Good! I'll put it up. I might move one thing."],
        2: ["Hm. Sharon says it's fine. Sharon says everything is fine."],
        1: ["I don't think the Starlite will put this up."],
      },
    },

    /* Someone with a vibe and no budget. The constraint is the printer. */
    "weird-things-4": {
      kind: "listing", discipline: "illustrative", app: "banner",
      title: "zine cover!! issue 4. a cryptid (it's a duck)",
      short: "CRYPTID ZINE COVER",
      pay: "$25 + five copies",
      posted: "Sep 20", area: "online",
      minRep: 0,
      poster: { handle: "weirdthings_alex", name: "Alex", site: "weirdthingszine.net" },
      listing: [
        "i make a zine about the cryptids nobody talks about. issue 4 is the big one.",
        "need a cover. it's printed on a risograph so there are RULES, i'll explain on a call.",
        "$25 and five copies. i staple them myself so they're good staples",
      ],
      dialogue: {
        patience: 5,
        pause: 8000,
        filler: ["...", "sorry, typing notes", "r u there? i type fast when i'm nervous"],
        opening: ["hi!! ok. thank you. ok.", "issue 4. the big duck. do you know about the big duck"],
        options: {
          subject: { ask: "Tell me about the Big Duck.", reply: ["a duck. the size of a canoe. at carvel reservoir", "i have ONE photo and it's blurry. they're always blurry, that's how you know"], reveals: ["duck"] },
          cover: { ask: "What has to be on the cover?", reply: ["WEIRD THINGS at the top, always", "and ISSUE 4. the library catalogues them by issue"], reveals: ["title", "issue"] },
          print: { ask: "How does the risograph work?", reply: ["two inks! fluorescent pink and blue, that's what the library has", "the paper counts as a colour. so three, total. there is no black. i know. i KNOW"], reveals: ["inks", "riso"] },
          size: { ask: "What size is it?", reply: ["half letter, folded. zine page size"], reveals: ["size"] },
          tone: { ask: "Should it be funny?", reply: ["NO. everybody makes it a joke", "i want it to look like a field guide. something you'd believe"] },
          seen: { ask: "Who's seen it?", reply: ["oh SO many people. dozens", "everyone at the reservoir knows"] },
          pay: { ask: "Is there any more budget?", reply: ["i could do six copies"], cost: 2 },
          done: { ask: "Got it. I'll make you a cover.", reply: ["!!!!! ok. thank you. believe the witnesses"], end: true, cost: 0 },
        },
        leave: ["the library closes at six and i have to print", "email me!! i check it constantly"],
        challenges: {
          // Dozens, on the call. Four, in their own field notes. Catching it
          // gets you the line that makes the cover credible.
          witnesses: {
            after: "seen", needsFact: "witnesses",
            ask: "Your field notes list three fishermen and a mail carrier. Is it four?",
            reply: ["...ok. four.", "four is still a LOT for one duck", "put “four witnesses” on the cover. i want people to take it seriously"],
            reveals: ["four"],
          },
        },
      },
      needs: [
        { id: "title", label: "WEIRD THINGS, at the top", missed: "It doesn't say Weird Things", text: ["weird things"], weight: 2 },
        { id: "issue", label: "Issue 4: the library catalogues by issue", missed: "It doesn't say which issue", text: ["issue", "4"], weight: 1 },
        { id: "duck", label: "The Big Duck", missed: "There's no duck on it", tags: ["duck"], weight: 3 },
        { id: "inks", label: "Fluorescent pink and blue", missed: "It isn't in the two riso inks", all: ["pink", "blue"], weight: 2 },
        { id: "four", label: "Four witnesses, so people take it seriously", missed: "It doesn't say four witnesses", text: ["four witnesses"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 550, h: 850, label: "Zine page, 550 × 850" },
        { id: "riso", rule: "maxColours", value: 3, label: "Three colours: two inks and the paper" },
      ],
      facts: [
        { id: "witnesses", where: "weirdthingszine.net", label: "Three fishermen and a mail carrier", match: ["three fishermen and a mail carrier"], tags: ["witnesses"] },
        { id: "canoe", where: "weirdthingszine.net", label: "About the size of a canoe", match: ["size of a canoe"], tags: ["duck-lore"] },
        { id: "twoinks", where: "weirdthingszine.net", label: "Two inks on the library risograph", match: ["two inks"], tags: ["riso"] },
      ],
      refs: [
        { q: "mallard duck", tags: ["duck"] },
        { q: "reservoir at dawn", tags: ["reservoir"] },
        { q: "blurry lake photo", tags: ["blurry"] },
      ],
      competitors: ["itwasalog.net", "squatchdepot.com"],
      features: [
        { id: "compare", label: "Side-by-side comparisons", doneBy: { "itwasalog.net": "log-compare" } },
        { id: "count", label: "A running count of explanations", doneBy: { "itwasalog.net": "log-count" } },
        { id: "believe", label: "BELIEVE, in big letters", doneBy: { "squatchdepot.com": "sq-believe" } },
        { id: "cartoon", label: "A cartoon cryptid", doneBy: { "squatchdepot.com": "sq-cartoon" } },
        { id: "witness", label: "The witnesses, in their own words", gap: true },
      ],
      gap: { tag: "gap-witness", label: "the witnesses, in their own words", line: "One side explains every sighting away and the other sells mugs. Nobody quotes the people who saw it." },
      research: { seconds: 240 },
      deadline: 900,
      wrap: {
        5: ["oh my god. OH MY GOD", "it looks like something you'd find in a ranger station. printing tonight. you're getting six copies"],
        4: ["it's so good!! the duck looks REAL", "printing it thursday"],
        3: ["ok this is cool. i might move the duck"],
        2: ["hmm. it's a bit of a joke? i wanted people to believe it"],
        1: ["this isn't weird things"],
      },
    },

    /* A franchise owner going rogue inside a brand that is not his. The
     * corporate site is his brand guide and the thing he is dodging. */
    "baron-burrito": {
      kind: "listing", discipline: "graphic", app: "banner",
      title: "NEED POSTER FOR BREAKFAST BURRITO (corporate does not need to know)",
      short: "DRIVE-THRU POSTER",
      pay: "$90 cash + free burritos",
      posted: "Sep 21", area: "Route 9",
      minRep: 3,
      poster: { handle: "baron214_dwayne", name: "Dwayne", site: "burgerbaron.com" },
      listing: [
        "I run a Burger Baron. I invented a breakfast burrito. Corporate has not approved it.",
        "I need a poster for the drive-thru window that looks official enough that nobody asks.",
        "$90 cash and all the burritos you want. I open at six, call before the rush.",
      ],
      dialogue: {
        patience: 5,
        pause: 7000,
        filler: ["You there? The fryer's beeping.", "Sorry, somebody's at the window.", "..."],
        opening: ["Hey. You the poster person? Great.", "I've got about ten minutes before the fryers need me. Go."],
        options: {
          what: { ask: "What's the poster for?", reply: ["The Baron's Breakfast Burrito. Eggs, hash brown and Crown Sauce in a tortilla.", "I invented it on a slow Tuesday. Corporate doesn't do burritos. I do burritos."], reveals: ["burrito"] },
          picture: { ask: "What should people see?", reply: ["The burrito. Big. You should want to eat the poster."], reveals: ["food"] },
          price: { ask: "What does it cost?", reply: ["Two ninety-nine.", "Two ninety-nine until corporate finds out."], reveals: ["price"] },
          look: { ask: "Should it look like an official Baron poster?", reply: ["It has to. Red and gold. People trust the red and gold.", "If it looks homemade, nobody orders it."], reveals: ["brand"] },
          baron: { ask: "Is the Baron on it?", reply: ["Oh, he's got to be. Holding the burrito.", "Like he's about to take a bite. People love the Baron."] },
          legal: { ask: "Is corporate strict about anything?", reply: ["They hate the word 'best'. Legal thing.", "We're 'the Baron's own'. Never 'the best'."], reveals: ["nobest"] },
          where: { ask: "Where does it go?", reply: ["The drive-thru window. Poster size.", "People read it from the car, so nothing tiny."], reveals: ["size", "text"] },
          approved: { ask: "Has corporate approved the burrito?", reply: ["I've emailed them eleven times.", "...So, no."] },
          done: { ask: "Got it. I'll have something for you soon.", reply: ["Good. Thanks. Don't tell Regional."], end: true, cost: 0 },
        },
        leave: ["Breakfast rush. Gotta go.", "Email's fine. I read it at four-thirty."],
        challenges: {
          // He wants the mascot holding the burrito. His own brand standards
          // say the mascot never holds food, and Regional checks.
          presides: {
            after: "baron", needsFact: "presides",
            ask: "Your brand standards say the Baron never holds food. Do you want that fight with Regional?",
            reply: ["...Oh no.", "Last time I got a letter. On the good paper.", "OK. No Baron. Just the crown, and straight, they check. Nobody can say a crown is holding anything."],
            reveals: ["crown"],
          },
        },
      },
      needs: [
        { id: "burrito", label: "It says Breakfast Burrito", missed: "It doesn't say Breakfast Burrito", text: ["breakfast burrito"], weight: 3 },
        { id: "food", label: "A burrito you want to eat", missed: "There's no burrito to look at", tags: ["burrito"], weight: 2 },
        { id: "brand", label: "Baron Red and Crown Gold", missed: "It isn't in the Baron's red and gold", all: ["red", "yellow"], weight: 2 },
        { id: "price", label: "$2.99", missed: "The price isn't on it", text: ["2.99"], weight: 1 },
        { id: "crown", label: "The crown, not the Baron: Regional checks", missed: "No crown, and the Baron can't hold food", tags: ["crown"], weight: 1 },
      ],
      limits: [
        { id: "size", rule: "size", w: 600, h: 850, label: "Window poster, 600 × 850" },
        { id: "text", rule: "minText", value: 24, label: "No text under 24px: it's read from the car" },
        { id: "nobest", rule: "avoid", text: ["best"], label: "Never the word ‘best’" },
      ],
      facts: [
        { id: "presides", where: "burgerbaron.com", label: "The Baron never holds food", match: ["the baron never holds food"], tags: ["baron-rules"] },
        { id: "crownrule", where: "burgerbaron.com", label: "The crown: never tilted, never cropped", match: ["never tilted"], tags: ["crown-rules"] },
        { id: "bestword", where: "burgerbaron.com", label: "Never the word best", match: ["the word best"], tags: ["legal"] },
        { id: "opens", where: "burgerbaron.com", label: "Store #214 opens at 6am", match: ["opens at 6am"], tags: ["hours"] },
      ],
      refs: [
        { q: "breakfast burrito", tags: ["burrito"] },
        { q: "gold crown", tags: ["crown"] },
        { q: "drive thru at dawn", tags: ["dawn"] },
      ],
      competitors: ["clucksworth.com", "earlybirddiner.net"],
      features: [
        { id: "biscuits", label: "Breakfast biscuits", doneBy: { "clucksworth.com": "cw-biscuit" } },
        { id: "mascot", label: "A cartoon mascot", doneBy: { "clucksworth.com": "cw-mascot" } },
        { id: "plates", label: "Sit-down plates", doneBy: { "earlybirddiner.net": "eb-plates" } },
        { id: "coffee", label: "Bottomless coffee", doneBy: { "earlybirddiner.net": "eb-coffee" } },
        { id: "handheld", label: "Breakfast you can eat at the wheel", gap: true },
      ],
      gap: { tag: "gap-handheld", label: "breakfast you can eat at the wheel", line: "Everyone else sells a biscuit or a sit-down plate. Nobody sells breakfast for the drive to work." },
      research: { seconds: 240 },
      deadline: 900,
      wrap: {
        5: ["That's going in the window before the rush.", "It looks more official than the official ones. If Regional calls, you've never heard of me."],
        4: ["Good. That'll sell burritos.", "Come by. They're on me."],
        3: ["It'll do. I'll tape it up."],
        2: ["Hm. Looks a little homemade."],
        1: ["Regional would have my franchise for this."],
      },
    },
  };

  /* ── gigslist posts that are not gigs ──────────────────── */
  const listings = [
    { title: "LOGO for my brand!! paying in EXPOSURE", posted: "Sep 15", status: "flagged", note: "This posting has been flagged for removal." },
    { title: "draw my D&D party (5 characters) $10 total", posted: "Sep 13", status: "filled", note: "The poster says this gig has been filled." },
    { title: "Wedding invites, must be done by tomorrow morning", posted: "Sep 12", status: "flagged", note: "This posting has been flagged for removal." },
    { title: "Band poster — Soft Machinery Club, show on the 30th", posted: "Sep 11", status: "filled", note: "The poster says this gig has been filled." },
    { title: "draw my ghost (he's friendly, he lives in the attic) $15", posted: "Sep 18", status: "filled", note: "The poster says this gig has been filled." },
    { title: "Llama farm rebrand. The llamas have final approval", posted: "Sep 16", status: "filled", note: "The poster says this gig has been filled." },
    { title: "Mascot costume needs a face. The mascot is a potato. Must start TODAY", posted: "Sep 15", status: "flagged", note: "This posting has been flagged for removal." },
  ];

  /* ── the crawler's index ───────────────────────────────── */
  const index = [
    { dom: "papermoonrelay.tv", title: "Paper Moon Relay — official site", snippet: "Twelve legs of a relay. One hand-off. Characters, story, and a note about fan works.", keywords: ["paper moon relay", "official", "anime", "toma", "kiyoshi", "toma arakawa", "kiyoshi mori", "characters", "model sheet"] },
    { dom: "thebatonpass.net", title: "The Baton Pass — a Toma × Kiyoshi shrine", snippet: "Fan site for Paper Moon Relay. 212 members. Under construction.", keywords: ["paper moon relay", "fan site", "toma", "kiyoshi", "tomakiyo", "anime", "shrine"] },
    { dom: "moonrelayfans.org", title: "Moon Relay Fans", snippet: "The largest Paper Moon Relay community on the web. Episode guide, forum, fan fiction.", keywords: ["paper moon relay", "fan site", "fans", "community", "anime", "episode guide", "forum"] },
    { dom: "hoshizora-anchor.net", title: "Anchor Leg — just Toma", snippet: "A site about Toma Arakawa. Gallery and episode guide.", keywords: ["paper moon relay", "fan site", "toma", "anime", "gallery"] },
    { dom: "thimblewickgame.net", title: "Thimblewick devlog", snippet: "A cosy game about mending other people's clothes.", keywords: ["thimblewick", "cosy game", "cozy game", "devlog", "indie game", "pixel"] },
    { dom: "needleandhearth.net", title: "Needle & Hearth", snippet: "A sewing-shop sim, out now.", keywords: ["cosy game", "cozy game", "sewing", "shop", "shopkeeper", "indie game"] },
    { dom: "bramblemarket.net", title: "Bramble Market", snippet: "Run the stall. Pet the shop cat.", keywords: ["cosy game", "cozy game", "market", "shopkeeper", "shop", "indie game"] },
    { dom: "thepaintedcup.com", title: "The Painted Cup — paint-your-own pottery", snippet: "Birthday parties, pastel paints, take-home boxes.", keywords: ["pottery", "pottery painting", "paint your own", "ceramics", "cafe", "café"] },
    { dom: "glazeandgraze.com", title: "Glaze & Graze", snippet: "Clay, cheese, and a glass of something.", keywords: ["pottery", "pottery painting", "wine", "ceramics", "cafe", "café"] },
    { dom: "improbabledennis.com", title: "The Improbable Dennis — magic for all occasions!", snippet: "Birthdays, retirement communities, corporate events. Doves available for weddings.", keywords: ["magician", "magic", "magic show", "birthday magician", "the improbable dennis", "dennis", "doves"] },
    { dom: "partypetemagic.com", title: "Party Pete — the magic comes to YOUR party", snippet: "Balloon animals, rainbow silks and a cartoon wizard. Over 2,000 parties.", keywords: ["magician", "magic", "kids party", "birthday magician", "balloon animals", "party"] },
    { dom: "marcuskane.live", title: "Marcus Kane — street magic, mind reading", snippet: "No top hats. No rabbits. Videos filmed in one take.", keywords: ["magician", "magic", "street magic", "card tricks", "mind reading"] },
    { dom: "weirdthingszine.net", title: "Weird Things — a zine", snippet: "The cryptids nobody talks about. Issue 4: the Big Duck.", keywords: ["zine", "cryptid", "cryptids", "weird things", "big duck", "risograph", "folklore"] },
    { dom: "itwasalog.net", title: "It Was A Log — sightings, explained", snippet: "Side-by-side comparisons. It is almost always a log.", keywords: ["cryptid", "cryptids", "sightings", "debunked", "skeptic", "bigfoot", "big duck"] },
    { dom: "squatchdepot.com", title: "Squatch Depot — gifts for the Squatch-curious", snippet: "Mugs, tees and air fresheners. BELIEVE.", keywords: ["cryptid", "bigfoot", "sasquatch", "gifts", "mugs", "merch"] },
    { dom: "burgerbaron.com", title: "Burger Baron — flame-crowned since 1971", snippet: "Burgers, Crown Fries and the Royal Shake at 1,140 locations.", keywords: ["burger", "burgers", "fast food", "burger baron", "breakfast", "franchise", "drive thru"] },
    { dom: "clucksworth.com", title: "Clucksworth Chicken", snippet: "Biscuits from 6am. Buckets all day.", keywords: ["chicken", "fast food", "breakfast", "biscuits", "drive thru"] },
    { dom: "earlybirddiner.net", title: "The Early Bird Diner", snippet: "All-day breakfast and bottomless coffee since 1964.", keywords: ["diner", "breakfast", "coffee", "pancakes"] },
    { dom: GIGSLIST, title: "gigslist — creative gigs", snippet: "Small jobs from real people. Reply to a post to get started.", keywords: ["gigs", "jobs", "freelance", "design", "work"] },
  ];

  /* Domains that answer but hold nothing: an ad can point at a dead end. */
  const parked = ["hyperdial.net", "hyperdial.com"];

  return { GIGSLIST, CRAWLER, ADS, people, sites, gigs, listings, index, parked };
})();

if (typeof module !== "undefined") module.exports = HUSTLE;
