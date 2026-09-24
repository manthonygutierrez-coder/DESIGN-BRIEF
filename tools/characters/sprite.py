"""A tiny pixel-art drawing kit for the Paper Moon Relay model sheets.

Sprites are grids of single-character keys. Each key belongs to a *region*
(skin, hair, jacket...) and is either that region's base tone or its shadow.
Outlines are added afterwards, the way anime model sheets are drawn:

  - around the whole silhouette, outside it
  - between regions that are different things (hair against skin), on the
    pixel of whichever region is allowed to give one up
  - never between a region's base and its shadow

That last rule is what lets the game's scorer treat "base colour on a shadow
pixel" as a near miss rather than a wrong colour.
"""

LINE = "L"
EMPTY = "."


class Sprite:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [[EMPTY] * w for _ in range(h)]

    # ── painting ───────────────────────────────────────────
    def px(self, k, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.g[y][x] = k

    def pxs(self, k, pts):
        for x, y in pts:
            self.px(k, x, y)

    def span(self, k, y, x0, x1):
        for x in range(x0, x1 + 1):
            self.px(k, x, y)

    def rows(self, k, spans):
        for y, x0, x1 in spans:
            self.span(k, y, x0, x1)

    def rect(self, k, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            self.span(k, y, x0, x1)

    def poly(self, k, pts, only=None):
        """Scanline fill at pixel centres. `only` limits painting to keys."""
        ys = [p[1] for p in pts]
        for y in range(max(0, int(min(ys))), min(self.h, int(max(ys)) + 1)):
            cy = y + 0.5
            xs = []
            n = len(pts)
            for i in range(n):
                (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
                if (y1 <= cy < y2) or (y2 <= cy < y1):
                    xs.append(x1 + (cy - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            for a, b in zip(xs[0::2], xs[1::2]):
                for x in range(max(0, int(a + 0.5)), min(self.w, int(b + 0.5))):
                    if only is None or self.g[y][x] in only:
                        self.g[y][x] = k

    def ellipse(self, k, cx, cy, rx, ry, only=None):
        for y in range(self.h):
            for x in range(self.w):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    if only is None or self.g[y][x] in only:
                        self.g[y][x] = k

    def line(self, k, x0, y0, x1, y1):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        e = dx + dy
        while True:
            self.px(k, x0, y0)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * e
            if e2 >= dy:
                e += dy; x0 += sx
            if e2 <= dx:
                e += dx; y0 += sy

    def stamp(self, x, y, rows):
        """Paint a small hand-drawn patch; spaces are left alone."""
        for dy, row in enumerate(rows):
            for dx, k in enumerate(row):
                if k != " ":
                    self.px(k, x + dx, y + dy)

    def recolour(self, old, new, box=None):
        x0, y0, x1, y1 = box or (0, 0, self.w - 1, self.h - 1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.g[y][x] == old:
                    self.g[y][x] = new

    def mirror_x(self, axis2, y0=0, y1=None):
        """Copy the left half onto the right, across x = axis2 / 2, for rows
        y0..y1 only — so mirroring a leg never undoes an asymmetric face."""
        for y in range(y0, (self.h - 1 if y1 is None else y1) + 1):
            for x in range(self.w):
                mx = axis2 - x
                if x < mx and 0 <= mx < self.w:
                    self.g[y][mx] = self.g[y][x]

    # ── outlines ───────────────────────────────────────────
    def outline(self, region_of, carrier_rank, keep=()):
        """External outline, then internal lines between different regions.

        region_of:    key -> region name
        carrier_rank: region -> rank; at a boundary the line goes on the pixel
                      of the region with the LOWER rank (it gives a pixel up).
                      Regions missing from the table never carry a line.
        keep:         keys never overwritten (explicit line work, eyes).
        """
        w, h, g = self.w, self.h, self.g
        src = [row[:] for row in g]
        filled = lambda x, y: 0 <= x < w and 0 <= y < h and src[y][x] != EMPTY
        # outside the silhouette
        for y in range(h):
            for x in range(w):
                if src[y][x] == EMPTY and any(filled(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    g[y][x] = LINE
        # between regions
        for y in range(h):
            for x in range(w):
                k = src[y][x]
                if k in (EMPTY, LINE) or k in keep:
                    continue
                r = region_of.get(k)
                if r not in carrier_rank:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    k2 = src[ny][nx]
                    if k2 in (EMPTY, LINE):
                        continue
                    r2 = region_of.get(k2)
                    if r2 == r or r2 is None:
                        continue
                    if carrier_rank[r] < carrier_rank.get(r2, 99):
                        g[y][x] = LINE
                        break

    def rows_text(self):
        return ["".join(r) for r in self.g]


def render(sprites, palettes, path, scale=8, gap=2, bg=(236, 233, 226)):
    """Lay several sprites side by side and save a preview PNG."""
    from PIL import Image
    W = sum(s.w for s in sprites) + gap * (len(sprites) + 1)
    H = max(s.h for s in sprites) + gap * 2
    im = Image.new("RGB", (W * scale, H * scale), bg)
    px = im.load()
    ox = gap
    for s, pal in zip(sprites, palettes):
        oy = gap + (H - 2 * gap - s.h)
        for y in range(s.h):
            for x in range(s.w):
                k = s.g[y][x]
                if k == EMPTY:
                    continue
                c = pal[k]
                rgb = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
                for yy in range(scale):
                    for xx in range(scale):
                        px[(ox + x) * scale + xx, (oy + y) * scale + yy] = rgb
        ox += s.w + gap
    im.save(path)
