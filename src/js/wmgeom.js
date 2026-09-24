"use strict";
/* ── window geometry ──────────────────────────────────────
 * The arithmetic behind the window manager, kept pure so it can be tested.
 * Rects are { x, y, w, h } in desk pixels; the desk is { w, h }.
 *
 *   place    where a new window opens: the spot that covers least of what is
 *            already open, with the front windows counting more (that is where
 *            you are working). Ties go to the top-left, so windows fill the
 *            desk in reading order instead of piling into one corner.
 *   cascade  the Win98 staircase
 *   tile     side by side ("cols") or stacked ("rows"); past three, a grid
 *   snap     a title bar dragged to the left or right edge takes that half of
 *            the desk; to the top edge, all of it
 *   pair     two windows sharing the desk, the first at its own width
 *   resize   dragging any edge or corner, within minimum sizes and the desk
 */

const WinGeom = (() => {
  const GAP = 4;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function overlap(a, b) {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /* size: the window's { w, h }. others: the visible windows, back to front.
   * opts.left: a column to keep clear (the desktop icons) when there is room. */
  function place(desk, size, others = [], opts = {}) {
    const w = Math.min(size.w, desk.w - GAP * 2), h = Math.min(size.h, desk.h - GAP * 2);
    const left = opts.left || 0;
    const minX = desk.w - w > left + 16 ? left : GAP, minY = GAP * 2;
    const maxX = Math.max(minX, desk.w - w - GAP), maxY = Math.max(minY, desk.h - h - GAP);
    // Candidates: the desk's corners, flush against every open window, and a
    // coarse grid for everything in between.
    const xs = new Set([minX, maxX]), ys = new Set([minY, maxY]);
    for (const o of others) {
      xs.add(o.x + o.w + GAP); xs.add(o.x - w - GAP); xs.add(o.x);
      ys.add(o.y + o.h + GAP); ys.add(o.y - h - GAP); ys.add(o.y);
    }
    for (let x = minX; x < maxX; x += 48) xs.add(x);
    for (let y = minY; y < maxY; y += 48) ys.add(y);

    let best = null;
    for (const cy of ys) {
      for (const cx of xs) {
        const x = Math.round(clamp(cx, minX, maxX)), y = Math.round(clamp(cy, minY, maxY));
        const r = { x, y, w, h };
        let cost = 0;
        others.forEach((o, i) => { cost += overlap(r, o) * (1 + (i + 1) / others.length); });
        if (!best || cost < best.cost || (cost === best.cost && (y < best.y || (y === best.y && x < best.x)))) {
          best = { x, y, w, h, cost };
        }
      }
    }
    return best;
  }

  // Each window a title bar lower and to the right; the stair wraps if the
  // desk runs out.
  function cascade(desk, n, step = 26) {
    const w = Math.round(Math.max(Math.min(desk.w * 0.62, desk.w - GAP * 2), 320));
    const h = Math.round(Math.max(Math.min(desk.h * 0.72, desk.h - GAP * 2), 240));
    const fit = Math.max(1, Math.floor(Math.min(desk.w - w - GAP, desk.h - h - GAP) / step) + 1);
    return Array.from({ length: n }, (_, i) => ({ x: GAP + (i % fit) * step, y: GAP + (i % fit) * step, w, h }));
  }

  function tile(desk, n, mode = "cols") {
    if (n < 1) return [];
    const stacked = mode === "rows";
    let across = stacked ? 1 : n, down = stacked ? n : 1;
    if (n > 3) {
      const a = Math.ceil(Math.sqrt(n)), b = Math.ceil(n / a);
      across = stacked ? b : a; down = stacked ? a : b;
    }
    const cw = (desk.w - GAP * (across + 1)) / across, rh = (desk.h - GAP * (down + 1)) / down;
    return Array.from({ length: n }, (_, i) => {
      const c = stacked ? Math.floor(i / down) : i % across;
      const r = stacked ? i % down : Math.floor(i / across);
      return { x: Math.round(GAP + c * (cw + GAP)), y: Math.round(GAP + r * (rh + GAP)), w: Math.floor(cw), h: Math.floor(rh) };
    });
  }

  // px, py: the pointer in desk pixels. The pointer has to reach the edge
  // itself — pointer capture reports it past the edge, too — so moving a
  // window close to an edge never snaps it by accident.
  function snapZone(desk, px, py) {
    if (py <= 1) return "max";
    if (px <= 2) return "left";
    if (px >= desk.w - 3) return "right";
    return null;
  }

  function snapRect(desk, zone) {
    const half = Math.floor(desk.w / 2);
    if (zone === "left") return { x: 0, y: 0, w: half, h: desk.h };
    if (zone === "right") return { x: half, y: 0, w: desk.w - half, h: desk.h };
    if (zone === "max") return { x: 0, y: 0, w: desk.w, h: desk.h };
    return null;
  }

  // The first window keeps its width (within a third and a half of the desk),
  // the second takes the rest. Both get the full height.
  function pair(desk, firstW) {
    const w1 = Math.round(clamp(firstW, desk.w * 0.3, desk.w * 0.5));
    const h = desk.h - GAP * 2;
    return [
      { x: GAP, y: GAP, w: w1, h },
      { x: GAP * 2 + w1, y: GAP, w: desk.w - w1 - GAP * 3, h },
    ];
  }

  /* start: the rect when the drag began; dir: some of n, s, e, w;
   * dx, dy: how far the pointer has moved; min: { w, h }. */
  function resize(start, dir, dx, dy, min, desk) {
    let { x, y, w, h } = start;
    if (dir.includes("e")) w = clamp(start.w + dx, min.w, Math.max(min.w, desk.w - start.x));
    if (dir.includes("s")) h = clamp(start.h + dy, min.h, Math.max(min.h, desk.h - start.y));
    // A window already hanging off the left can stay there; the far edge holds.
    if (dir.includes("w")) {
      const lo = Math.min(0, start.x), hi = start.x + start.w - min.w;
      x = hi < lo ? start.x : clamp(start.x + dx, lo, hi); w = start.w + start.x - x;
    }
    if (dir.includes("n")) {
      const hi = start.y + start.h - min.h;
      y = hi < 0 ? start.y : clamp(start.y + dy, 0, hi); h = start.h + start.y - y;
    }
    return { x, y, w, h };
  }

  return { overlap, place, cascade, tile, snapZone, snapRect, pair, resize, GAP };
})();

if (typeof module !== "undefined") module.exports = WinGeom;
