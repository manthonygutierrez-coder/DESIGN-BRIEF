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
    briefs.js      21 briefs across 7 disciplines
    core.js        shared state and element refs
    world.js       discipline picker and scene preview
    icons.js       16×16 pixel icons, run-length grids → SVG
    wm.js          generic Win98 window manager (drag, resize, min/max/close, cascade)
    brief-doc.js   the brief document and its typewriter reveal
    shell.js       Start menu, taskbar, clock
    mail.js        the inbox and its state machine
    browser.js     the browser: history, favourites, URL dropdown, lightbox
    crossing.js    the pixel waterfall
    app.js         keys and boot
    content/
      clients.js   21 client personas, domains, site copy, reference seeds
      sites.js     four site skins + the image search; resolve() is the whole internet
      imagery.js   procedural faux photography, seeded per query
```

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

## Where things live

| What | Where |
|---|---|
| App state | `~/Library/Application Support/Pixel Crossing/state.json` |
| Your projects | `~/Documents/Pixel Crossing/` (changeable in-app) |
| Build output | `build/` |
