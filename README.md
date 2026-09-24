# Pixel Crossing

A freelance design studio on the other side of the screen.

You start in **the world** — an abstract scene per discipline. Choose one and a pixel
waterfall carries you through to **the screen**: a Windows 98 desktop where the work
actually arrives. Pick a discipline from the Start menu, a client emails you a brief,
their link unlocks a browser where you can read their site and search reference, and
when you're done you reply with the files.

macOS desktop app (Electron, arm64). Works entirely offline — fonts are bundled and
every image in the app is generated on a canvas, nothing is fetched.

## Running it

```bash
npm install && node node_modules/electron/install.js && npm run dev
```

The second command is only needed because npm's install-script gating skips Electron's
binary download.

To build a `.dmg`:

```bash
npm run build
```

Output lands in `build/`. It is **unsigned**, so the first launch needs
right-click → Open rather than a double-click.

## Two ways to play

The first crossing over asks who is logging on. Each is its own save slot —
its own state file under `userData/slots/`, its own projects folder — and they
share nothing at runtime. **Log Off** from the Start menu switches.

| Slot | What it is |
|---|---|
| **Studio** | The loop below. Real briefs by mail, real work in your own tools, real files. |
| **Hustle** | The work made into puzzles, played entirely inside the desktop. See **Hustle** below. Output goes to `~/Documents/Pixel Crossing/_hustle/`. |

An existing `state.json` from before slots is moved into Studio on first launch.

## Hustle

Every step of a job is a small puzzle, and all of it happens on the desktop.

0. **Set up your camera.** Clients see you on every call, so the first time you log
   on you build yourself and dress the room behind you — 14 skin tones, 24 hair styles
   and head coverings from locs and puffs to a hijab or turban, glasses, freckles, a
   hearing aid, nine tops; 27 props, eight room palettes and seven walls — against
   your own live feed. Then your camera stays on for your first job and talks you
   through one whole gig — the board, replying, the call and its sand, clipping,
   rivals and the gap, making it, delivering, the review — in your own voice, as
   you actually get to each part. Each beat waits for you to do the thing, rings
   what to press, and has a "show me"; slips get a line, never a stop. After that
   it sits in the corner of every call. Start → Camera changes how you look;
   Start → Setup guide walks the whole job again.
1. **Find work.** `gigslist.org` has small jobs from real-sounding people. Not every
   business posts: some only advertise, and hovering an ad names the brand. Work out
   its address, type it in, and you have found a prospect you can pitch.
2. **Get the brief, on a call.** Clients meet you over video. You pick the
   questions; they only have so much attention, and an **hourglass runs on every
   pause** — let it empty and they fill the silence themselves, which costs a pip
   and closes whatever window was open. Two silences back to back and they wrap up
   on their own. You can turn the glass over once ("sorry, give me a second") at the
   cost of a pip; reputation buys more flips.

   Clipping is live during the call, so you can open their site mid-conversation and
   read while they wait — **Their site** puts the browser beside the call, not over
   it — and a wrong clip burns sand. That reading is what unlocks the
   **windows**: some replies contradict the client's own pages, and the question that
   catches it appears only during that glass, and only if you clipped the fact that
   proves it. Catch it and it is free and reveals a requirement nothing else will.
   Whatever you never ask about still counts when the work is scored — the ticket
   just shows it as `???`. With enough reputation, businesses send complete briefs
   instead.
3. **Research, against the clock.** Turn on clipping in the browser and click the
   passages that matter: facts on the client's site, trends on rival sites. A useless
   clip costs five seconds. The image search shows what you asked for — "mallard
   duck" is a duck on a reservoir, "bigfoot mug" is a mug with a bigfoot printed on
   it, "vintage vegas sign" is lit up at night — drawn in the same pixel light as the
   calls, so what you cut out is the thing itself. What each clip was worth rises off the passage, and the
   toolbar counts what the site holds for the gig (`Here: 2/7 clipped`), so you know
   when a page is done. Cut objects and colours out of image-search pictures —
   cards inherit what the search was about. **Compare rivals** is a deduction grid:
   once you have clipped everything a rival does, the rest of its column fills in,
   and the row nobody does is the gap. Guessing early is allowed; a wrong guess costs.
4. **Make it** in the design suite with the cards you found, then **Deliver**.
5. **The review** scores the work line by line — needs (70), limits (20), the gap
   (10), minus lateness — and reputation unlocks bonus suite tools, follow-up jobs
   from happy clients, and businesses that come to you.

The rules are pure modules with tests: `hustle/dialogue.js`, `hustle/meeting.js`
(the glass, the windows and the flips, wrapped around a dialogue tree),
`hustle/research.js`, `hustle/score.js`. Faces are drawn, never fetched:
`content/portraits.js` hashes a handle into a person and renders them four ways —
a contacts head, a live call frame in a room painted from their own site's colours,
an About-page photograph, and a clipped card that carries their palette into the
suite. A room is not a backdrop: every prop carries a distance, and distance
decides size, colour and order — things at the back are cooled and dimmed,
things up by the lens are warmed and pass in front of the person, and the wall
meets a floor. Each person sits in one of two shots, **background receded** or
**against the background**, with their own nudges on top. The **Room Editor**
sets all of it against the live feed: pick a prop by what it looks like, send it
to the back wall or the foreground, drag the person in frame, and copy the block
back into `hustle/content.js`. Everything the game is made of — sites, gigs, conversations,
research answers, the crawler's index, ads — is data in `hustle/content.js`, and a
content test checks that every research answer really appears on its page, that
every gap can be proven, and that every need can be met with what the gig hands
you: its facts, its picture searches, a colour, or the work from the gig before.

## Paper Moon Relay: drawing the OTP on-model

The first gig's anime has a real canon. Toma Arakawa and Kiyoshi Mori are
designed in `content/characters.js` (signature, key style details, named
palettes, on-model rules) with pixel model sheets (front, side and bust)
generated from `tools/characters/*.py` into `content/characters.art.js`:

    python3 tools/characters/export.py      # grids, PNGs, and LibreSprite .ase files
    node tools/character-bible.mjs out.html # the shareable character bible

In the game they live on the official site `papermoonrelay.tv` (model sheets
at whole-number scale, profiles, a key visual) and in the image search. Nell's
fan site adds drawing notes and exact colour picks.

Official art is never traceable and never a card. You **pin** it to the
**reference board**, a PureRef-style panel that stays faint and click-through
while you draw. Hover its header, hold <kbd>`</kbd> or click **REF** in the
tray to use it; <kbd>H</kbd> flips it, <kbd>G</kbd> greys it; drag it to a
screen edge to dock, or onto the taskbar to tuck it away. Drag an official
pin's tab onto the canvas to mark where you are drawing that character. Then
draw them by eye with the pen and the **shape builder** (drag across shapes
to merge them, alt-drag to cut).

`hustle/likeness.js` judges the result without any lines: it scales your
drawing to the sheet and scores silhouette, colour regions (is each one in the
right place, in the right colour?), and proportions, with the relative scale
of the pair checked against canon, 172 to 178 cm. Pasting official art in as
an image scores nothing.

## The design suite

Start menu → **Design Suite**, or **Open in Design Suite** on any brief. Apps are
gated by the brief's discipline; scratch work gets all of them.

| App | For |
|---|---|
| Banner | Free canvas: shapes, text, images, eyedropper |
| Type | Wordmarks and specimens |
| Pixel | True-resolution sprites; zoom and export by whole numbers only |
| Layout | A web page built from the same blocks client sites use, viewable in The Web. Click a block in the page to edit it; drop a card on a block to write it in |
| Swatch | A six-colour palette with a WCAG contrast grid, sent to the drawing nearest the front |
| Cutout | Wand and lasso selections that become object and colour cards |

**Cards** are anything scavenged — colours, cut-out objects, shapes, typefaces,
and trend / gap / fact notes. Drag one onto the canvas or a layer to apply it.
Every application records the card on the document; that provenance is what
Hustle will score against. Until the research minigames exist, **Client kit**
fills the tray from a client's theme, refs and site.

**Save** writes a `.pxdoc` to the project's `02-process`; **Export PNG** writes
to `04-final`, so suite output attaches to a reply like anything else. Bonus
tools (gradient, pen, snap, align, mirror) are always on in Studio and unlock
over time in Hustle.

`npm test` runs the document model, card and cutout tests (`node:test`, no
dependencies) — those modules are pure and never touch the DOM.

## The loop

1. **Start menu → a discipline.** A client takes you on.
2. **Mail arrives.** The taskbar keeps an envelope with an unread count, and a balloon
   pops. Nothing opens itself — the notification is meant to sit there.
3. **Read the brief.** Every message moves through
   `unread → read → { archived | completed | deleted | re-rolled }`.
   Re-roll discards this brief and a different one from the same discipline arrives;
   the old one lands in Archive marked as re-rolled.
4. **Accept it.** A real folder appears in `~/Documents/Pixel Crossing/` with four
   slots: `01-concept`, `02-process`, `03-progress`, `04-final`.
5. **Follow the client's link.** The browser unlocks — their site, an image search with
   suggestions scoped to your brief, a Resources bar that grows as you take on work,
   and a URL bar with history.
6. **Do the work in your real tools**, saving into those four folders. The app watches
   them and notices.
7. **Reply with the files.** Send is disabled until something is attached. The client
   writes back, and only then can the brief be marked Complete.

## Layout

```
electron/
  main.js        window, IPC, filesystem, folder watching
  preload.js     the only bridge — contextIsolation + sandbox, no node in the renderer
src/
  index.html     shell; classic scripts sharing one global scope, load order matters
  styles/        base · world · desktop (Win98 chrome) · apps (mail + browser) · fonts
  js/
    bridge.js      wraps the preload API; falls back to localStorage in a plain browser
    pixelfit.js    whole pixels: sizes any img/canvas marked data-px to the biggest
                   whole scale that fits, and again on resize or zoom (tested)
    briefs.js      21 briefs across 7 disciplines
    core.js        shared state and element refs
    world.js       discipline picker and scene preview
    icons.js       16×16 pixel icons, run-length grids → SVG
    wmgeom.js      window geometry: open where it covers least, tile, cascade, snap
    wm.js          generic Win98 window manager (drag, resize from any edge, snap to
                   a half, min/max/close, Arrange menu on the taskbar)
    brief-doc.js   the brief document and its typewriter reveal
    shell.js       Start menu, taskbar, clock
    mail.js        the inbox and its state machine
    browser.js     the browser: history, favourites, URL dropdown, lightbox
    crossing.js    the pixel waterfall
    app.js         keys and boot
    content/
      clients.js   21 client personas, domains, site copy, reference seeds
      sites.js     four site skins + the image search; resolve() is the whole internet
      imagery.js   the image search: official art, brand marks, and abstract moods
      imageplan.js what a query is a picture of: the thing, the place, the light,
                   the treatment, and how this result was framed (pure, tested)
      pixelscene.js paints a plan small and lit, then scales it by a whole number
      pixelthings.js the things in the pictures: animals, food, objects, people
    hustle/
      camera.js    your camera: the wardrobe, room pieces and palettes (pure, tested)
      camview.js   the camera builder, the setup guide, and you in the corner of a call
    music/
      theme.js     the score: one theme in D, arranged for the hub, the hunt and the
                   studio, with the mix rules for reputation and deadlines (pure, tested)
      synth.js     the instruments and the mixing desk, for the game and for files alike
      music.js     plays it live through Web Audio on the audio clock; the tray speaker
```

## Sound

The desk has music, synthesized as it plays (no audio files, so it stays inside the
page's security policy). Which window is in front picks the arrangement: the desktop,
mail and the board get the mellow **hub**, the browser, ticket and rival comparison get
the curious **hunt**, and the Design Suite gets the driving chiptune **studio**. All
three share a key, tempo and sixteen-bar form, so switches wait for the next bar line
and crossfade on the beat. On top of that:

- **A call** muffles the music and turns it down, the moment they pick up.
- **A deadline** brings in a ticking clock and a floor tom as the research or
  production clock runs down. A job left long late settles back to a low tick.
- **Reputation** fills the band in. Somebody nobody has heard of gets bass and chords;
  an established name gets drums, the melody and the whole band. The Studio slot always
  has the whole band.
- **Clips** answer on the beat, in the key of the bar: a run of good clips climbs the
  chord, a miss sags. Notifications chime in the key, and a delivery plays a run that
  grows with the stars.

The speaker by the clock opens a Win98 volume box: volume, music on or off, and mute,
remembered on this computer.

To hear it away from the game, `tools/music` renders it on the same instruments, inside
Electron's own audio engine:

    ./node_modules/.bin/electron tools/music/render.js out/   # each arrangement, four times round, filling in
    ./node_modules/.bin/electron tools/music/film.js out/     # the music video: one gig, filmed as it plays

The film runs a hidden, muted copy of the game with its own save (nothing is written to
`~/Documents`), plays one gig by script with a cursor you can see, and joins the picture
to the music it recorded with macOS's own encoders, so it needs nothing installed.
`FILM_STOP=call` ends a take after that scene, for working on one part.

## Notes for future work

- **Developing without launching Electron.** `src/` is plain HTML/CSS/JS, so it also
  runs from any static server (`python3 -m http.server 8123 --directory src`).
  `Bridge` degrades to `localStorage` and hides the filesystem affordances, so the
  whole mail and browser flow is walkable in a normal browser tab.
- **Zero runtime dependencies.** Electron's own `fs.watch` and `nativeImage` cover
  watching and thumbnails; no `chokidar`, no `sharp`.
- **Not yet built:** the books. This pass writes the project records they will read —
  `state.json` holds the mail and project state, and the four folders per project map
  1:1 onto the two-page spread's image slots.
- **Silkscreen's ampersand** draws as something close to a cent sign, so any label
  shown in the pixel face goes through `pixelLabel()` first.

## Scheduled briefs

Briefs can arrive on a schedule instead of only when you ask for one. The app
polls two sources and treats both identically:

- a JSON feed at an HTTPS URL — a routine commits briefs to a public repo
- `~/Documents/Pixel Crossing/_inbox/*.json` — anything running on this Mac

Both are deduped by record id, so polling never duplicates a message. A
scheduled brief arrives as ordinary unread mail, and if it carries a client
profile that client's site becomes reachable in the in-app browser like any
other. See [briefs/README.md](briefs/README.md) for the schema and setup.

The fetch runs in the main process; the renderer keeps `connect-src 'none'` and
can never reach the network itself.

## Where things live

| What | Where |
|---|---|
| App state | `~/Library/Application Support/Pixel Crossing/state.json` |
| Your projects | `~/Documents/Pixel Crossing/` (changeable in-app) |
| Build output | `build/` |
| Brief drop folder | `~/Documents/Pixel Crossing/_inbox/` |
