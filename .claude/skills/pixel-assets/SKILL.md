---
name: pixel-assets
description: Author hard-edged pixel art in LibreSprite and get it into the UI at the size the UI actually needs, without soft edges or uneven pixels. Use when adding or editing an icon, sprite, cursor, brand mark or any pixel asset for Pixel Crossing; when a pixel image looks blurry, shimmery or unevenly scaled; or when batch-exporting from LibreSprite / Aseprite.
---

# Pixel assets

Two rules decide everything here:

1. **Author at true resolution.** A 16×16 icon is drawn as 16×16 pixels. Never
   draw it large and shrink it — that is how you get anti-aliased mush.
2. **Scale by whole pixels, or use vectors.** How you scale up depends entirely
   on whether the target size is an integer multiple of the source. Get this
   wrong and the asset shimmers: some source pixels land 2px wide, their
   neighbours 3px.

## Which output format

This is the decision that actually matters. Check the ratio first.

| Target size ÷ source | Use | Why |
|---|---|---|
| Always an integer (16→32, 16→64) | **PNG** + `image-rendering: pixelated` | Cheapest. Each source pixel is a flat block. |
| Anything else, or variable | **SVG rect grid** + `shape-rendering="crispEdges"` | Each source pixel is a vector rect. Lands crisp at *any* size. |
| Large raster art, photos, backdrops | **PNG**, sized to fit | Vectors are the wrong tool at that scale. |

**This app is the second case.** `iconSVG()` is called at 14, 16, 20 and 34px
from a 16×16 source — only 16 is an integer multiple. As PNGs those would
shimmer at three of the four sizes. They are SVG rect grids instead, which is
why they stay sharp. Follow that; do not "simplify" icons to PNG.

The one place PNG is right is `#fx`, the pixel waterfall: its canvas backing
store is one canvas pixel per cell and CSS scales it up, so `desktop.css` sets
`image-rendering: pixelated`. Integer by construction.

## LibreSprite

Installed at `/Applications/LibreSprite.app`. The binary is inside the bundle
and is not on `PATH`:

```bash
LS="/Applications/LibreSprite.app/Contents/MacOS/libresprite"
```

`--scale` is genuine nearest-neighbour — verified: a two-colour source comes
out of an 8× scale with exactly two colours and perfectly flat blocks.

```bash
# open the GUI on a file
"$LS" sprite.ase

# batch (-b = no UI). Re-save / convert format
"$LS" -b sprite.ase --save-as out.png

# integer upscale, hard edges preserved
"$LS" -b sprite.ase --scale 8 --save-as out@8x.png

# sprite sheet + metadata, one frame per row
"$LS" -b sprite.ase --sheet sheet.png --data sheet.json --format json-array

# each layer as its own frame in the sheet
"$LS" -b sprite.ase --split-layers --sheet sheet.png --data sheet.json

# only a tagged animation range
"$LS" -b sprite.ase --frame-tag walk --sheet walk.png
```

Batch mode still prints palette/loader chatter to stdout. Filter it with
`| grep -v '^Loading\|^Using'` when you only want real errors.

`--shell` opens a scripting console if you need to generate sprites
programmatically rather than draw them.

## Getting a sprite into this app

`png2grid.py` (next to this file) converts a PNG into the exact `ICON_ART`
entry `src/js/icons.js` uses — a colour map plus one string per row, `.` for
transparent. Verified round-trip: an icon exported through LibreSprite and
converted back is byte-identical to the entry already in `icons.js`.

```bash
# draw 16x16 in LibreSprite, save as .ase, then:
"$LS" -b icon.ase --save-as icon.png
python3 .claude/skills/pixel-assets/png2grid.py icon.png --name compass
```

Paste the printed block into `ICON_ART`. Add `--svg` to print the merged SVG to
stderr if you want to eyeball it first. It reports the rect count after
run-length merging — a 16×16 icon should land well under 60 rects; far more
than that means the art is noisy and will read as static at 14px.

Constraints the converter enforces, because `icons.js` assumes them:
- **8-bit PNG.** Indexed, RGB, greyscale and RGBA all decode.
- **25 colours maximum.** Index the sprite down first if you exceed it.
- **Alpha is binary.** Under 50% becomes transparent; there is no partial alpha
  in this format, and half-transparent edge pixels are exactly the softness
  worth avoiding.
- Square is assumed. A non-square sprite still converts but warns.

## Two traps

**Silent blur from a non-integer PNG scale.** If you must ship a PNG at a
non-integer size, do not stretch it — snap the *container* to the nearest whole
multiple and centre it. Stretching to 34px from 16 gives you 2.125px per source
pixel and visible banding.

**PNG row filters.** Any hand-rolled PNG reader must undo per-row filters
(types 0–4) before reading pixels. Skipping that does not error — it returns
plausible-looking garbage. `png2grid.py` handles it; if you write another
decoder, port that loop rather than assuming filter 0.

## Checking your work

Confirm the edges really are hard rather than trusting the flag. A correctly
scaled sprite has the same **visible** colours as its source, and each source
pixel maps to a perfectly flat block. Use `visible_colours()` from
`png2grid.py`:

    from png2grid import decode_png, visible_colours
    assert visible_colours("icon.png") == visible_colours("icon@8x.png")
    w, h, px = decode_png("icon@8x.png")
    # sample a block over actual artwork, not the margin
    assert len({px(x, y)[:3] for y in range(64, 72) for x in range(64, 72)}) == 1

More *visible* colours out than in means something resampled it.

**Count visible colours, not raw pixels.** LibreSprite leaves stale RGB in
fully-transparent pixels after a scale — an RGBA sprite with four colours can
come out reporting nine, every extra one at `alpha=0` and therefore invisible.
Comparing raw RGBA tuples fails a flawless export. `png2grid.py` already ignores
those pixels when building a grid; `visible_colours()` exists so the check does
too.

**Do not test flatness on the top-left block.** On most icons that corner is
transparent, so it is flat no matter what happened to the artwork. Sample a
block you know is drawn on.
