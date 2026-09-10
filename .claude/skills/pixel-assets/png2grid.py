#!/usr/bin/env python3
"""Turn a LibreSprite PNG export into the grid format icons.js already uses.

    png2grid.py sprite.png [--name mail] [--svg]

Reads an indexed/RGB/RGBA PNG at its authored resolution (16x16 for this app's
icons), maps each distinct colour to a single character, and prints a ready-to-
paste ICON_ART entry. `.` is transparent.

    --svg   also print the run-length-merged SVG, to eyeball before pasting.

No dependencies: PNG decoding is done here, filters and all.
"""

import sys, zlib, struct
from collections import OrderedDict

# Characters chosen so a grid stays readable: k=key/dark, w=white, then a,b,c…
CHARS = "kwabcdefghijmnopqrstuvxyz"


def decode_png(path):
    """Return (width, height, pixel(x, y) -> (r, g, b, a))."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path}: not a PNG")
    pos, idat, pal, trns = 8, b"", None, None
    w = h = bd = ct = 0
    while pos < len(data):
        ln = struct.unpack(">I", data[pos:pos + 4])[0]
        typ, chunk = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + ln]
        if typ == b"IHDR":
            w, h, bd, ct = struct.unpack(">IIBB", chunk[:10])
        elif typ == b"PLTE":
            pal = chunk
        elif typ == b"tRNS":
            trns = chunk
        elif typ == b"IDAT":
            idat += chunk
        pos += 12 + ln
    if bd != 8:
        raise SystemExit(f"{path}: only 8-bit PNGs supported (got {bd}-bit)")

    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw, stride = zlib.decompress(idat), w * channels
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        filt = raw[i]; i += 1
        row = bytearray(raw[i:i + stride]); i += stride
        # PNG rows are filtered; skipping this silently corrupts the image.
        for x in range(stride):
            a = row[x - channels] if x >= channels else 0
            b = prev[x]
            c = prev[x - channels] if x >= channels else 0
            if filt == 1:   row[x] = (row[x] + a) & 255
            elif filt == 2: row[x] = (row[x] + b) & 255
            elif filt == 3: row[x] = (row[x] + ((a + b) >> 1)) & 255
            elif filt == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                row[x] = (row[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(bytes(row)); prev = row

    def pixel(x, y):
        r = rows[y]
        if ct == 3:
            idx = r[x]
            rgb = tuple(pal[idx * 3:idx * 3 + 3])
            alpha = trns[idx] if trns and idx < len(trns) else 255
            return rgb + (alpha,)
        if ct == 2: return tuple(r[x * 3:x * 3 + 3]) + (255,)
        if ct == 6: return tuple(r[x * 4:x * 4 + 4])
        if ct == 0: v = r[x]; return (v, v, v, 255)
        v, a = r[x * 2], r[x * 2 + 1]; return (v, v, v, a)

    return w, h, pixel


def visible_colours(path):
    """Distinct *visible* colours. Fully transparent pixels are collapsed.

    LibreSprite leaves stale RGB behind in alpha=0 pixels after a scale, so
    counting raw RGBA tuples reports far more colours than the sprite has and
    makes a perfectly good export look resampled. Only opaque pixels count.
    """
    w, h, pixel = decode_png(path)
    out = set()
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixel(x, y)
            out.add(None if a < 128 else (r, g, b))
    return out


def to_grid(path):
    w, h, pixel = decode_png(path)
    palette = OrderedDict()
    grid = []
    for y in range(h):
        line = ""
        for x in range(w):
            r, g, b, a = pixel(x, y)
            if a < 128:                       # anything half-transparent reads as empty
                line += "."
                continue
            key = f"#{r:02X}{g:02X}{b:02X}"
            if key not in palette:
                if len(palette) >= len(CHARS):
                    raise SystemExit(f"{path}: more than {len(CHARS)} colours — index the sprite down first")
                palette[key] = CHARS[len(palette)]
            line += palette[key]
        grid.append(line)
    return w, h, palette, grid


def to_svg(w, h, palette, grid, px=64):
    """Run-length merge each row, exactly as icons.js does."""
    inv = {v: k for k, v in palette.items()}
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == ".":
                x += 1; continue
            n = 1
            while x + n < len(row) and row[x + n] == ch:
                n += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{inv[ch]}"/>')
            x += n
    return (f'<svg viewBox="0 0 {w} {h}" width="{px}" height="{px}" '
            f'shape-rendering="crispEdges">' + "".join(rects) + "</svg>"), len(rects)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    src = args[0]
    name = sys.argv[sys.argv.index("--name") + 1] if "--name" in sys.argv else "icon"

    w, h, palette, grid = to_grid(src)
    if w != h:
        print(f"# note: {w}x{h} is not square — icons.js assumes a square viewBox", file=sys.stderr)

    pal = ",".join(f'{c}:"{hexv}"' for hexv, c in palette.items())
    print(f"  {name}:{{p:{{{pal}}},g:[")
    for i in range(0, len(grid), 4):
        print("    " + ",".join(f'"{r}"' for r in grid[i:i + 4]) + ("," if i + 4 < len(grid) else "]},"))

    svg, rects = to_svg(w, h, palette, grid)
    print(f"\n# {w}x{h}, {len(palette)} colours, {rects} rects after run-length merge", file=sys.stderr)
    if "--svg" in sys.argv:
        print("\n" + svg, file=sys.stderr)


if __name__ == "__main__":
    main()
