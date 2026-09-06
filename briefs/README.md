# The brief feed

Scheduled briefs reach the app from outside it. The app polls two places and
does not care which one delivered a given brief:

| Transport | Where | Written by |
|---|---|---|
| **pull** | a JSON feed at an HTTPS URL — `feed.json` in this repo | a routine that commits here |
| **drop** | `~/Documents/Pixel Crossing/_inbox/*.json` | anything running on that Mac |

Both are polled on the same interval and deduped by each record's `id`, so
polling is idempotent — a feed can be re-read forever without ever producing a
duplicate message.

## Turning it on

In the app's DevTools console:

```js
await Feed.configure({
  url: "https://api.github.com/repos/manthonygutierrez-coder/DESIGN-BRIEF/contents/briefs/feed.json",
  pollMinutes: 15
})
await Feed.poll()          // force a poll now rather than waiting
Feed.status()              // last result and current config
```

**Use the API URL, not `raw.githubusercontent.com`.** Raw is served through a
CDN cache keyed on path, held for several minutes; a cache-busting query string
and `Cache-Control: no-cache` both fail to defeat it, so a freshly committed
brief would not arrive until the cache expired on its own. The Contents API
reflects a commit immediately. It returns the file inside a base64 envelope,
which the app unwraps automatically — either URL form works, the API one is
just current.

Unauthenticated, the API allows 60 requests an hour per IP. At the default
15-minute interval that is 4, so there is plenty of headroom; do not poll more
than once a minute.

The setting persists in `state.json`. The drop folder needs no configuration —
it is polled whenever the feed is enabled. Set `{ enabled: false }` to stop.

The fetch happens in Electron's **main** process, never the renderer. No page in
the app is allowed to reach the network (`connect-src 'none'`), and only HTTPS
is accepted — plus `http://localhost` so a feed can be tested locally.

## Record shape

`feed.json` is `{ version, updated, briefs: [ … ] }`. A single record, or a bare
array of them, is also accepted. Only `id`, `brief.project` and `brief.ask` are
required; everything else has a sensible default and malformed records are
skipped rather than throwing.

```json
{
  "id": "2026-08-31-quarter-inch",
  "cadence": "daily",
  "received": "2026-08-31T09:00:00Z",
  "discipline": "Graphic Design",

  "brief": {
    "project": "QUARTER INCH",
    "client": "A hardware shop that has never advertised",
    "ask": "One or two sentences. What the work actually is, and why now.",
    "deliver": ["Poster, A1", "Window vinyl, one line"],
    "limits": ["It cannot beg.", "One colour plus the paper."],
    "tone": "Plain · stubborn · not sentimental"
  },

  "clientProfile": {
    "who": "Ada Winterbourne",
    "role": "Owner since 1989",
    "co": "Winterbourne & Sons",
    "dom": "winterbourneandsons.co.uk",
    "frame": "shop",
    "voice": "How they sign off the email.",
    "refs": ["hardware shop interior", "hand painted sign"],
    "site": {
      "tagline": "Ironmongers. Corner of Petty Cury since 1974.",
      "nav": [["Home", "/"], ["What we stock", "/stock"]],
      "pages": { "/": [ { "t": "lede", "p": "…" } ] }
    }
  }
}
```

### Fields

- **`id`** — any stable string. This is the dedupe key; reusing one means the
  brief is silently ignored on later polls.
- **`discipline`** — matched by name against the seven disciplines
  (`Graphic Design`, `Interface Design`, `3D & Asset`, `Illustration`,
  `Character Design`, `Motion Design`, `Type Design`). Falls back to the first.
- **`cadence`** — free text, recorded on the message. Purely descriptive:
  every brief is a full brief regardless of how often they arrive.
- **`clientProfile`** — optional. Supply it and the client is registered so
  their domain resolves in the in-app browser, exactly like a built-in client.
  Omit it and the brief still arrives; it just has no site to link to.
  - `frame` — one of `press`, `civic`, `saas`, `terminal`, `neon`, `paper`,
    `shop`, `studio`, `board`, `specimen`. Anything else falls back to `studio`.
  - `site.pages` — a path → block-list map. Block shapes are the `BLOCKS`
    object in `src/js/content/sites.js` (`lede`, `prose`, `notice`, `stats`,
    `products`, `pricing`, `table`, `spec`, `feed`, and others). If omitted, a
    reasonable one-page site is built from the brief itself.
  - A `dom` that collides with a built-in client is ignored rather than
    shadowing it.

Everything is length-capped and type-checked on ingest — this content comes from
outside the app and is not trusted to be well-formed.

## Client artwork (`assets`)

A brief may arrive with real designed artwork instead of the generated
stand-ins. The routine designs it in Figma, exports it, and commits it here.

```json
"assets": {
  "markSVG": "<path d=\"M15 47V17h6z\" fill=\"%B%\"/><rect x=\"5\" y=\"5\" width=\"8\" height=\"8\" fill=\"%C%\"/>",
  "figma": "https://figma.com/design/<key>",
  "images": [
    { "ref": "auction mart ring interior", "path": "briefs/assets/hallgarthmart/ring.png" }
  ]
}
```

- **`markSVG`** — the logo's shape elements only, no outer `<svg>` wrapper, on a
  64-unit square. Use `%B%` / `%C%` / `%G%` for brand, second and ground colours
  exactly as `src/js/content/marks.js` does; they are substituted from the
  client's theme at render time so a mark cannot drift out of step with its
  palette. Registered under the client's domain, and only if that domain has no
  drawn mark already — a feed record never overwrites one in the repo.

- **`images[].ref`** — must match one of the client's `refs` **verbatim**. The
  image is registered as an override for that reference seed, so it replaces the
  procedural stand-in *everywhere* that seed is drawn: site galleries, the image
  search, the lightbox. That is the whole integration; `sites.js` is untouched.

- **`images[].path`** — repo-relative. Resolved against whatever repo the feed
  URL points at, so a record never hardcodes an owner or branch. An absolute
  `url` also works. PNG, JPEG, WebP or GIF; 4MB ceiling each, twelve per brief.

Images are fetched by the **main** process and handed to the renderer as `data:`
URIs, because the page is allowed `img-src 'self' data:` and no network at all.
They are cached under `userData/assets/`, so a client's artwork is fetched once
and then works offline like everything else.

**`markSVG` is sanitised before it touches the DOM** — a strict element and
attribute whitelist. `script`, `foreignObject`, `image`, `use`, every `href` and
`on*` handler, `<style>` and `<animate>` are all dropped. Feed content is not
trusted, and a mark that arrives with nothing drawable in it is rejected rather
than rendered empty.

## Writing the routine

A scheduled agent should append a record to `briefs` in `feed.json` and commit.
Keeping the array capped (say the most recent 50) stops the file growing without
limit; the app dedupes, so trimming old entries is safe.

The brief is the whole product. It should read like a real client wrote it —
a specific business with a specific problem, constraints that genuinely
constrain, and no motivational filler. `.claude/agents/narrative-designer.md`
in this repository is the voice to write in.
