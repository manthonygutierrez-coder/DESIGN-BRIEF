"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../src/js/suite/vector.js");
const Sh = require("../src/js/suite/shapes.js");

const near = (a, b, eps = 0.02) => Math.abs(a - b) <= eps;

test("vector: path data goes in and comes back out the same shape", () => {
  const d = "M0 0L64 0L64 64L0 64Z";
  const p = V.parse(d);
  assert.equal(p.length, 1);
  assert.equal(p[0].nodes.length, 4, "a closed square is four nodes, not five");
  assert.ok(p[0].closed);
  assert.equal(V.toD(p), d);
  // What the pen and the shape builder already write reads back unchanged.
  const pen = "M0.0 12.5L64.0 0.0L40.0 64.0Z";
  assert.equal(V.toD(V.parse(pen)), "M0 12.5L64 0L40 64Z");
});

test("vector: every command reads, relative ones included", () => {
  const abs = V.parse("M10 10 H50 V50 C50 60 40 70 30 70 S10 60 10 50 Q10 30 20 20 T30 10 Z");
  const rel = V.parse("m10 10 h40 v40 c0 10 -10 20 -20 20 s-20 -10 -20 -20 q0 -20 10 -30 t10 -10 z");
  assert.equal(V.toD(abs), V.toD(rel));
  const b = V.bounds(abs);
  assert.ok(near(b.x, 10) && near(b.y, 10) && near(b.x + b.w, 50) && near(b.y + b.h, 70), "bounds of the mixed path");
  // An arc: a half circle of radius 10 from (0,10) to (20,10), bulging up.
  const arc = V.parse("M0 10 A10 10 0 0 1 20 10");
  const ab = V.bounds(arc);
  assert.ok(near(ab.y, 0, 0.05), "the arc reaches the top of its circle (" + ab.y + ")");
  assert.ok(near(ab.w, 20) && near(ab.h, 10, 0.05));
  // Implicit repeats after M are lines.
  assert.equal(V.parse("M0 0 10 0 10 10")[0].nodes.length, 3);
  // Nonsense is ignored rather than thrown.
  assert.deepEqual(V.parse(""), []);
  assert.deepEqual(V.parse("hello"), []);
});

test("vector: bounds include a curve's bulge, not just its points", () => {
  const circle = V.ellipse(50, 50, 40, 20);
  const b = V.bounds(circle);
  assert.ok(near(b.x, 10) && near(b.y, 30) && near(b.w, 80) && near(b.h, 40));
  const bulge = V.parse("M0 0C0 -40 40 -40 40 0");
  assert.ok(near(V.bounds(bulge).y, -30), "the curve's top, three quarters of its handles' height");
});

test("vector: a node added on a curve leaves the curve where it was", () => {
  const circle = V.ellipse(0, 0, 50, 50);
  const hit = V.nearest(circle, { x: 60, y: 10 });
  assert.equal(hit.si, 0);
  assert.ok(Math.abs(Math.hypot(hit.x, hit.y) - 50) < 0.3, "the nearest point is on the circle");
  const more = V.insert(circle, hit.si, hit.seg, hit.t);
  assert.equal(more[0].nodes.length, 5);
  for (let k = 0; k < 40; k++) {
    const a = k / 40 * Math.PI * 2, p = { x: Math.cos(a) * 50, y: Math.sin(a) * 50 };
    assert.ok(V.nearest(more, p).dist < 0.4, "still a circle at " + k);
  }
  // On a straight side, the new node is a plain corner and the side stays a line.
  const sq = V.rect(0, 0, 10, 10);
  const mid = V.insert(sq, 0, 0, 0.5);
  assert.equal(V.toD(mid), "M0 0L5 0L10 0L10 10L0 10Z");
  // Removing it gives the square back.
  assert.equal(V.toD(V.remove(mid, 0, 1)), V.toD(sq));
});

test("vector: shapes as paths", () => {
  const r = V.rect(10, 20, 100, 40, 8);
  assert.equal(r[0].nodes.length, 8, "a rounded rectangle has two nodes a corner");
  const rb = V.bounds(r);
  assert.ok(near(rb.x, 10) && near(rb.y, 20) && near(rb.w, 100) && near(rb.h, 40));
  const tri = V.polygon(0, 0, 60, 60, 3);
  const tb = V.bounds(tri);
  assert.ok(near(tb.w, 60) && near(tb.h, 60), "a triangle fills its box");
  assert.equal(V.polygon(0, 0, 60, 60, 5, 0.5)[0].nodes.length, 10, "a five-point star has ten corners");
  assert.equal(V.polygon(0, 0, 60, 60, 99)[0].nodes.length, 24, "sides are capped");
});

test("vector: fit and place are each other's inverse", () => {
  const star = V.polygon(30, 40, 200, 100, 5, 0.45);
  const f = V.fit(star, 64);
  assert.ok(near(f.x, 30) && near(f.y, 40) && near(f.w, 200) && near(f.h, 100));
  const back = V.place(f.d, f.box, f.x, f.y, f.w, f.h);
  star[0].nodes.forEach((n, i) => assert.ok(near(n.x, back[0].nodes[i].x, 0.5) && near(n.y, back[0].nodes[i].y, 0.5)));
  // The path layer's data draws the same as the shape builder's own tracing.
  const loops = Sh.contours(Uint8Array.from([1, 1, 1, 1]), 2, 2);
  const tp = Sh.toPath(loops, 64);
  assert.equal(V.toD(V.parse(tp.d)), tp.d.replace(/(\.\d*?)0+(?=\D)/g, "$1").replace(/\.(?=\D)/g, ""));
});

test("vector: a mirrored copy walks the other way, so both halves fill", () => {
  const half = V.parse("M50 0L50 100L0 50Z");
  const mirrored = V.transform(half, (x, y) => ({ x: 100 - x, y }));
  const area = (s) => s.nodes.reduce((a, n, i) => { const m = s.nodes[(i + 1) % s.nodes.length]; return a + n.x * m.y - m.x * n.y; }, 0) / 2;
  assert.ok(Math.sign(area(half[0])) !== Math.sign(area(mirrored[0])), "reflection turns the winding round");
  assert.equal(Math.sign(area(V.reverse(mirrored[0]))), Math.sign(area(half[0])), "reverse puts it back");
});

test("vector: dragging one handle of a smooth node swings the other", () => {
  const n = { x: 0, y: 0, ix: -10, iy: 0, ox: 20, oy: 0, k: "smooth" };
  const m = V.dragHandle(n, "out", 0, 30);
  assert.ok(near(m.ix, 0) && near(m.iy, -10), "smooth keeps the other handle's length");
  const s = V.dragHandle(Object.assign({}, n, { k: "sym" }), "out", 0, 30);
  assert.ok(near(s.iy, -30), "symmetric matches it");
  const c = V.dragHandle(Object.assign({}, n, { k: "corner" }), "out", 0, 30);
  assert.ok(near(c.ix, -10) && near(c.iy, 0), "a corner leaves it alone");
});

test("vector: walking an outline by distance, and past its ends", () => {
  const line = V.parse("M0 0L100 0");
  const s = V.sampler(line[0]);
  assert.ok(near(s.len, 100));
  assert.ok(near(s.at(25).x, 25) && near(s.at(25).a, 0));
  assert.ok(near(s.at(120).x, 120), "past the end it carries straight on");
  const circle = V.sampler(V.ellipse(0, 0, 50, 50)[0], 48);
  assert.ok(near(circle.len, Math.PI * 100, 0.5), "a circle's length");
});

test("vector: a bent line keeps its letters' spacing and arches the right way", () => {
  const adv = [10, 10, 10, 10, 10, 10];
  const flat = V.bend(adv, 0);
  assert.deepEqual(flat.letters.map((g) => g.x), [-25, -15, -5, 5, 15, 25]);
  assert.ok(flat.letters.every((g) => g.y === 0 && g.a === 0));
  const up = V.bend(adv, 60);
  assert.ok(up.letters[0].y > 0 && up.letters[5].y > 0, "arched up: the ends drop below the middle");
  assert.ok(up.letters[0].a < 0 && up.letters[5].a > 0, "and lean out");
  const down = V.bend(adv, -60);
  assert.ok(down.letters[0].y < 0, "hung down: the ends rise");
  // Neighbours stay a letter apart along the arc.
  const g = up.letters, R = up.r;
  for (let i = 1; i < g.length; i++) {
    const chord = Math.hypot(g[i].x - g[i - 1].x, g[i].y - g[i - 1].y);
    assert.ok(near(2 * R * Math.asin(chord / (2 * R)), 10, 0.01), "arc distance between letters " + i);
  }
  const full = V.bend(adv, 100);
  assert.ok(near(full.letters[0].a, -Math.PI / 2 + Math.PI / 12, 0.01), "at 100 the line wraps half a circle");
  const box = V.lettersBox(up.letters, adv, 8, 2);
  assert.ok(box.w > 0 && box.h > 10, "a bent line's box is taller than one letter");
});

test("vector: inside a shape means inside its paint, holes excepted", () => {
  const ring = V.parse("M0 0H100V100H0Z M30 30H70V70H30Z");
  assert.ok(V.contains(ring, 10, 10, "evenodd"));
  assert.ok(!V.contains(ring, 50, 50, "evenodd"), "the hole of an even-odd ring");
  assert.ok(V.contains(ring, 50, 50), "nonzero with both loops the same way fills the middle");
  const circle = V.ellipse(50, 50, 50, 50);
  assert.ok(V.contains(circle, 50, 50) && !V.contains(circle, 3, 3), "a circle's corner is outside it");
  const line = V.parse("M0 0L100 100");
  assert.ok(V.near(line, 50, 52, 3) && !V.near(line, 50, 60, 3), "near an open line");
  assert.ok(!V.near(line, 0, 100, 3), "an open line has no side back to its start");
});
