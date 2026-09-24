"use strict";
/* ── whole pixels ─────────────────────────────────────────
 * Pixel art only reads as pixel art when every art pixel covers the same
 * whole number of screen pixels. Stretch an 80x60 call by 3.45 and some of
 * its pixels come out a column wider than their neighbours; squeeze a
 * picture below its size and some of its pixels are not drawn at all.
 *
 * This is the job Unity's Pixel Perfect Camera does, done for the page: take
 * the biggest whole scale that fits the space, and leave the rest of the
 * space as border (Unity calls it windowboxing) instead of stretching.
 *
 * Mark an <img> or <canvas> with data-px="n", n being how many of its own
 * pixels make one art pixel: a search result painted at 100x75 and saved at
 * 200x150 is data-px="2". data-px="auto" works that out from the picture.
 * It is then sized inside its parent, and again whenever the parent changes
 * size or the screen's pixel density does (a zoom, another display).
 *
 *   data-fit="contain"  fit the parent's height as well as its width. Only
 *                       for a parent whose size does not come from this
 *                       element, or the two would chase each other down.
 *   data-fit="cover"    run edge to edge at the next whole scale up, with
 *                       the parent cropping the spill: a banner.
 *   data-max="WxH"      never bigger than this many CSS pixels: a picture
 *                       floating over something bigger (you, in a call).
 */
const PixelFit = (() => {
  // Screen pixels per art pixel: the most that fits, and never below one,
  // because below one some art pixels are dropped. Room is in screen pixels.
  function scale(artW, artH, roomW, roomH) {
    const by = (art, room) => (room > 0 && Number.isFinite(room) ? Math.floor(room / art + 1e-6) : Infinity);
    const k = Math.min(by(artW, roomW), by(artH, roomH));
    return Number.isFinite(k) ? Math.max(1, k) : 1;
  }

  // For a banner that should run edge to edge: the next whole scale up,
  // centred, with the parent cropping what spills over. Null when that would
  // crop more than a fifth of it; then bars are the lesser evil.
  function coverScale(art, room) {
    const up = Math.max(1, Math.ceil(room / art - 1e-6));
    return art * up <= room * 1.2 ? up : null;
  }

  // The CSS size that gives exactly k screen pixels per art pixel. It can be
  // a fraction of a CSS pixel; counted in screen pixels it is always whole.
  function cssSize(artW, artH, k, dpr) {
    return { w: (artW * k) / dpr, h: (artH * k) / dpr };
  }

  // How many of a picture's own pixels make one of its art pixels: the
  // biggest block size at which every whole block is one flat colour.
  function blockOf(data, w, h, max = 12) {
    for (let b = Math.min(max, Math.floor(w / 2), Math.floor(h / 2)); b > 1; b--) {
      let flat = true;
      for (let by = 0; flat && by + b <= h; by += b) {
        for (let bx = 0; flat && bx + b <= w; bx += b) {
          const i0 = (by * w + bx) * 4;
          for (let y = by; flat && y < by + b; y++) {
            for (let x = bx; x < bx + b; x++) {
              const i = (y * w + x) * 4;
              if (data[i] !== data[i0] || data[i + 1] !== data[i0 + 1] || data[i + 2] !== data[i0 + 2] || data[i + 3] !== data[i0 + 3]) { flat = false; break; }
            }
          }
        }
      }
      if (flat) return b;
    }
    return 1;
  }

  /* ── on the page ──────────────────────────────────────── */
  const held = new Map();                 // parent -> the pictures sized inside it
  const measured = new Map();             // src -> its block size, for data-px="auto"
  let ro = null, density = null;

  const num = (v) => parseFloat(v) || 0;

  function blockFor(el) {
    const src = el.currentSrc || el.src;
    if (measured.has(src)) return measured.get(src);
    let b = 1;
    try {
      const w = el.naturalWidth, h = el.naturalHeight, c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.drawImage(el, 0, 0);
      b = blockOf(g.getImageData(0, 0, w, h).data, w, h);
    } catch { /* not readable: treat it as drawn at its own size */ }
    if (measured.size > 400) measured.clear();
    measured.set(src, b);
    return b;
  }

  function artOf(el) {
    const canvas = el.tagName === "CANVAS";
    const w = canvas ? el.width : el.naturalWidth, h = canvas ? el.height : el.naturalHeight;
    if (!w || !h) return null;
    const n = el.dataset.px === "auto" ? (canvas ? 1 : blockFor(el)) : Math.max(1, Number(el.dataset.px) || 1);
    return { w: w / n, h: h / n };
  }

  // The parent's content box, in CSS pixels.
  function roomOf(parent) {
    const cs = getComputedStyle(parent);
    return {
      w: parent.clientWidth - num(cs.paddingLeft) - num(cs.paddingRight),
      h: parent.clientHeight - num(cs.paddingTop) - num(cs.paddingBottom),
    };
  }

  function fit(el, room) {
    const a = artOf(el);
    if (!a || !el.parentElement) return;
    room = room || roomOf(el.parentElement);
    const dpr = window.devicePixelRatio || 1, cs = getComputedStyle(el);
    const edgeW = num(cs.borderLeftWidth) + num(cs.borderRightWidth) + num(cs.paddingLeft) + num(cs.paddingRight);
    const edgeH = num(cs.borderTopWidth) + num(cs.borderBottomWidth) + num(cs.paddingTop) + num(cs.paddingBottom);
    const mode = el.dataset.fit;
    let rw = (room.w - edgeW) * dpr, rh = mode === "contain" ? (room.h - edgeH) * dpr : Infinity;
    const max = String(el.dataset.max || "").split("x").map(Number);
    if (max[0] > 0) rw = Math.min(rw, max[0] * dpr);
    if (max[1] > 0) rh = Math.min(rh, max[1] * dpr);
    const k = (mode === "cover" && coverScale(a.w, rw)) || scale(a.w, a.h, rw, rh);
    const s = cssSize(a.w, a.h, k, dpr), border = cs.boxSizing === "border-box";
    const outW = s.w + (border ? edgeW : 0), outH = s.h + (border ? edgeH : 0);
    const w = outW + "px", h = outH + "px";
    if (el.style.width !== w) el.style.width = w;
    if (el.style.height !== h) el.style.height = h;
    if (mode === "cover") {
      const ml = Math.round(((room.w - outW) / 2) * dpr) / dpr + "px";
      if (el.style.marginLeft !== ml) el.style.marginLeft = ml;
      el.style.maxWidth = "none";          // or max-width:100% squeezes it back, and only across
    }
    el.dataset.pxk = String(k);           // screen pixels per art pixel, for anyone checking
  }

  function hold(el) {
    const parent = el.parentElement;
    if (!parent || !ro) return;
    let set = held.get(parent);
    if (!set) { set = new Set(); held.set(parent, set); ro.observe(parent); }
    set.add(el);
    if (el.tagName === "IMG" && !(el.complete && el.naturalWidth)) return;   // fitted on load
    fit(el);
  }

  function prune() {
    for (const [parent, set] of held) {
      for (const el of set) if (!el.isConnected || el.parentElement !== parent) set.delete(el);
      if (!set.size || !parent.isConnected) { held.delete(parent); ro.unobserve(parent); }
    }
  }

  function refitAll() {
    prune();
    for (const [parent, set] of held) { const room = roomOf(parent); for (const el of set) fit(el, room); }
  }

  function watchDensity() {
    if (density) density.removeEventListener("change", onDensity);
    density = window.matchMedia("(resolution: " + (window.devicePixelRatio || 1) + "dppx)");
    density.addEventListener("change", onDensity);
  }
  function onDensity() { watchDensity(); refitAll(); }

  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches("[data-px]")) hold(node);
    node.querySelectorAll("[data-px]").forEach(hold);
  }

  // Sizing a picture changes its parent's height, which is being observed.
  // Doing that inside the observer's own callback is how you get "loop
  // completed with undelivered notifications", so resizes wait for a frame.
  const pending = new Set();
  let frame = 0;
  function flush() {
    frame = 0;
    const rooms = [...pending].map((p) => [p, roomOf(p)]);
    pending.clear();
    for (const [parent, room] of rooms) {
      const set = held.get(parent);
      if (set) for (const el of set) if (el.isConnected && el.parentElement === parent) fit(el, room);
    }
  }

  function watch() {
    if (ro || typeof ResizeObserver === "undefined") return;
    ro = new ResizeObserver((entries) => {
      for (const e of entries) if (held.has(e.target)) pending.add(e.target);
      if (pending.size && !frame) frame = requestAnimationFrame(flush);
    });
    new MutationObserver((list) => {
      for (const m of list) m.addedNodes.forEach(scan);
      if (held.size > 64) prune();
    }).observe(document.documentElement, { childList: true, subtree: true });
    // An image sized before it decoded is sized again once it has.
    document.addEventListener("load", (e) => {
      const el = e.target;
      if (el && el.tagName === "IMG" && el.dataset && el.dataset.px) hold(el);
    }, true);
    watchDensity();
    scan(document.documentElement);
  }

  if (typeof document !== "undefined" && typeof window !== "undefined") watch();

  return { scale, coverScale, cssSize, blockOf, fit, refit: refitAll };
})();

if (typeof module !== "undefined") module.exports = PixelFit;
