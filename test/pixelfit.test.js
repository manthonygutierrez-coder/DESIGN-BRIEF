"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Fit = require("../src/js/pixelfit.js");
const P = require("../src/js/content/portraits.js");
const Cam = require("../src/js/hustle/camera.js");

test("pixel art gets the biggest whole scale that fits, never a fraction", () => {
  // The call: 80x60 art in a 552px stage on a 2x screen used to be 3.45.
  assert.equal(Fit.scale(80, 60, 552 * 2, Infinity), 13);
  assert.deepEqual(Fit.cssSize(80, 60, 13, 2), { w: 520, h: 390 });
  let checked = 0;
  for (const dpr of [1, 1.25, 1.5, 2, 2.2, 3]) {
    for (let room = 60; room < 900; room += 7) {
      const k = Fit.scale(100, 75, room * dpr, Infinity), { w } = Fit.cssSize(100, 75, k, dpr);
      assert.ok(Number.isInteger(k) && k >= 1);
      assert.ok(Math.abs((w * dpr) / 100 - k) < 1e-9, "whole screen pixels per art pixel at " + dpr + "x");
      if (k > 1) assert.ok(w <= room + 1e-9, "fits the " + room + "px it was given");
      checked++;
    }
  }
  assert.ok(checked > 700, "checked " + checked + " rooms");
  assert.equal(Fit.scale(80, 60, 40, 40), 1, "never below one, even when nothing fits");
  assert.equal(Fit.scale(80, 60, 640, 250), 4, "the tighter side decides");
});

test("a banner runs edge to edge at the next whole scale, unless that crops too much", () => {
  // The studio hero: 760 across at 3x is 253 art pixels, in a 721px page on a 2x screen.
  assert.equal(Fit.coverScale(760 / 3, 721 * 2), 6);
  // Zoomed to 1.5x with a picture whose pixels could not be read: 2x would crop 40%.
  assert.equal(Fit.coverScale(760, 721 * 1.5), null);
  assert.equal(Fit.coverScale(100, 400), 4, "an exact fit is its own cover");
});

// A picture drawn at artW x artH and saved at b times that, optionally cropped.
function saved(artW, artH, b, cropW) {
  let s = 7;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const art = Array.from({ length: artW * artH }, () => [(rnd() * 255) | 0, (rnd() * 255) | 0, (rnd() * 255) | 0]);
  const w = cropW || artW * b, h = artH * b, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = art[Math.floor(y / b) * artW + Math.floor(x / b)], i = (y * w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return { d, w, h };
}

test("how big a picture's pixels are is read back from the picture", () => {
  for (const b of [1, 2, 3, 4, 5]) {
    const { d, w, h } = saved(20, 15, b);
    assert.equal(Fit.blockOf(d, w, h), b, "saved at " + b + "x");
  }
  // The studio banner: 254 art pixels at 3x is 762, cut to 760 across.
  const { d, w, h } = saved(254, 10, 3, 760);
  assert.equal(Fit.blockOf(d, w, h), 3, "a part-block at the edge does not hide the scale");
});

test("a call feed of any size is painted a whole number of pixels per art pixel", () => {
  const ops = [];
  const canvas = (w, h, dest) => {
    const c = { width: w, height: h };
    const g = {
      imageSmoothingEnabled: true, globalAlpha: 1, fillStyle: "#000", strokeStyle: "#000", lineWidth: 1,
      fillRect(x, y, fw, fh) { if (dest) ops.push({ op: "fill", x, y, w: fw, h: fh, alpha: this.globalAlpha }); },
      drawImage(img, ...a) { if (dest) ops.push({ op: "draw", self: img === c, a }); },
      strokeRect() {}, clearRect() {},
      createRadialGradient: () => ({ addColorStop() {} }),
      createLinearGradient: () => ({ addColorStop() {} }),
    };
    c.getContext = () => g;
    return c;
  };
  const me = Cam.fresh(3);
  global.document = { createElement: () => canvas(0, 0, false) };
  try {
    for (const [cw, ch] of [[320, 240], [256, 192], [96, 72], [400, 300], [90, 60]]) {
      ops.length = 0;
      P.paintFeed(canvas(cw, ch, true), "me", me.look, { theme: Cam.themeOf(me), room: me.room, framing: me.framing, pattern: me.pattern, glitch: 2 });
      const k = Math.max(1, Math.floor(Math.min(cw / 80, ch / 60)));
      const [, , , , dx, dy, dw, dh] = ops.find((o) => o.op === "draw" && !o.self).a;
      assert.deepEqual([dw, dh], [80 * k, 60 * k], cw + "x" + ch + ": whole art pixels");
      assert.deepEqual([dx, dy], [Math.floor((cw - 80 * k) / 2), Math.floor((ch - 60 * k) / 2)], cw + "x" + ch + ": centred");
      const mush = ops.filter((o) => o.op === "fill" && o.alpha < 1), glitch = ops.filter((o) => o.op === "draw" && o.self);
      assert.ok(mush.length === 150 && glitch.length === 7, "the effects were painted");
      for (const f of mush) assert.ok(f.w === k && f.h === k && (f.x - dx) % k === 0 && (f.y - dy) % k === 0, "mush on the art grid");
      for (const { a } of glitch) assert.ok(a[2] === 4 * k && (a[0] - dx) % (4 * k) === 0 && (a[4] - dx) % (4 * k) === 0, "glitch on the art grid");
    }
  } finally {
    delete global.document;
  }
});
