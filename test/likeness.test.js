"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../src/js/content/characters.js");
const L = require("../src/js/hustle/likeness.js");

// A "drawing": the reference re-painted onto a canvas at a position and scale,
// optionally stretched or recoloured — no DOM needed.
function draw(ref, { scale = 1, sx = 1, ox = 5, oy = 3, recolour = null, spill = 0 } = {}) {
  const w = Math.ceil(ref.w * scale * sx) + ox * 2 + spill, h = Math.ceil(ref.h * scale) + oy * 2;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const rx = Math.floor((x - ox) / (scale * sx)), ry = Math.floor((y - oy) / scale);
    if (rx < 0 || ry < 0 || rx >= ref.w || ry >= ref.h) continue;
    const k = (ry * ref.w + rx) * 4;
    if (ref.rgba[k + 3] < 128) continue;
    const c = recolour ? recolour : [ref.rgba[k], ref.rgba[k + 1], ref.rgba[k + 2]];
    rgba.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
  }
  for (let y = oy; y < h - oy && spill; y++) for (let x = w - spill; x < w; x++) rgba.set([200, 0, 200, 255], (y * w + x) * 4);
  return { w, h, rgba };
}

const ref = C.reference("toma", "front");

test("the model sheet against itself is a perfect likeness", () => {
  const r = L.compare(ref, draw(ref));
  assert.ok(r.quality > 0.98, JSON.stringify(r));
});

test("where and how big you drew it does not matter", () => {
  const a = L.compare(ref, draw(ref, { scale: 1 }));
  const b = L.compare(ref, draw(ref, { scale: 3, ox: 40, oy: 17 }));
  assert.ok(Math.abs(a.quality - b.quality) < 0.03, a.quality + " vs " + b.quality);
});

test("wrong colours, stretching and spill each cost the right thing", () => {
  const good = L.compare(ref, draw(ref));
  const flat = L.compare(ref, draw(ref, { recolour: [120, 200, 60] }));
  assert.ok(flat.palette < 0.1 && flat.shape > 0.95, "recolour hits palette only");
  assert.ok(flat.quality < 0.6, "and a figure in the wrong colours is not on-model: " + flat.quality);
  const wide = L.compare(ref, draw(ref, { sx: 1.4 }));
  assert.ok(wide.proportions < 0.1 && wide.quality < good.quality - 0.2, "stretch hits proportions");
  const messy = L.compare(ref, draw(ref, { spill: 30 }));
  assert.ok(messy.shape < good.shape - 0.3, "spill hits shape: " + messy.shape);
});

test("shading is a bonus: flat base colours still read as the right regions", () => {
  const flatBase = { w: ref.w, h: ref.h, rgba: new Uint8ClampedArray(ref.rgba) };
  ref.base.forEach((hex, i) => { if (hex) { const [r, g, b] = C.hexToRGB(hex); flatBase.rgba.set([r, g, b, 255], i * 4); } });
  const r = L.compare(ref, flatBase);
  assert.ok(r.regions > 0.98, "every region still in place: " + r.regions);
  assert.ok(r.palette > 0.9 && r.palette < 1, "a little lower for skipping the shadows: " + r.palette);
});

test("blocks in the right overall shape are not a likeness", () => {
  // A column of three flat blocks, about the figure's size: skin, white, skin.
  const w = ref.w, h = ref.h, rgba = new Uint8ClampedArray(w * h * 4);
  const fill = (y0, y1, x0, x1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba.set([...c, 255], (y * w + x) * 4); };
  fill(0, 22, 7, 19, [226, 169, 126]); fill(22, 55, 4, 22, [246, 247, 242]); fill(55, 90, 7, 19, [226, 169, 126]);
  const r = L.compare(ref, { w, h, rgba });
  assert.ok(r.quality < 0.5, "blocks: " + JSON.stringify({ q: r.quality, regions: r.regions, shape: r.shape }));
});

test("relative scale follows canon, 90 to 93", () => {
  assert.equal(L.relativeScale(90, 93, 90, 93), true);
  assert.equal(L.relativeScale(80, 100, 90, 93), false);
  assert.equal(L.relativeScale(0, 93, 90, 93), null);
});
