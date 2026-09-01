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
await Feed.configure({ url: "https://raw.githubusercontent.com/<you>/DESIGN-BRIEF/main/briefs/feed.json", pollMinutes: 15 })
await Feed.poll()          // force a poll now rather than waiting
Feed.status()              // last result and current config
```

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

## Writing the routine

A scheduled agent should append a record to `briefs` in `feed.json` and commit.
Keeping the array capped (say the most recent 50) stops the file growing without
limit; the app dedupes, so trimming old entries is safe.

The brief is the whole product. It should read like a real client wrote it —
a specific business with a specific problem, constraints that genuinely
constrain, and no motivational filler. `.claude/agents/narrative-designer.md`
in this repository is the voice to write in.
