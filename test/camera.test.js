"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/js/content/portraits.js");
const Cam = require("../src/js/hustle/camera.js");

// A canvas that only records which cells got which colour: enough to tell
// whether a piece shows up at all, without a DOM.
function grid(w = P.GW, h = P.GH){
  const cells = new Map();
  const g = {
    fillStyle: "#000", globalAlpha: 1,
    fillRect(x, y, fw, fh){
      for (let yy = Math.floor(y); yy < Math.ceil(y + fh); yy++) for (let xx = Math.floor(x); xx < Math.ceil(x + fw); xx++)
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) cells.set(xx + "," + yy, String(this.fillStyle));
    },
    createRadialGradient: () => ({ addColorStop(){} }),
    createLinearGradient: () => ({ addColorStop(){} }),
  };
  return { g, cells };
}
const picture = (look) => { const { g, cells } = grid(); P.paint(g, P.traits("me", look), { garment: look.garment, line: null }); return cells; };

test("every piece in the wardrobe changes the picture", () => {
  // Judged on a plain face, so one piece is never hidden under another.
  const base = Object.assign(Cam.fresh(42).look, { style: "crop", facial: "none", specs: "none", marks: "none", ears: "none", extra: "none", top: "tee" });
  for (const row of Cam.YOU) {
    const seen = new Set();
    for (const v of row.values) {
      const look = Object.assign({}, base, { [row.key]: v });
      if (row.key === "hat") look.style = "beanie";
      if (row.key === "accent") look.extra = "tie";
      const cells = picture(look), key = JSON.stringify([...cells.entries()].sort());
      assert.ok(!seen.has(key), row.key + " = " + v + " looks like something else in its row");
      seen.add(key);
    }
  }
});

test("every piece for your room draws something", () => {
  const th = Object.assign({ dark: false }, Cam.PALETTES.cosy);
  for (const p of Object.keys(Cam.PIECES)) {
    assert.ok(P.PROPS[p], p + " has a drawing");
    const { g, cells } = grid(80, 60);
    let n = 1;
    P.PROPS[p](g, 10, 10, 30, 30, th, () => ((n = (n * 9301 + 49297) % 233280) / 233280));
    assert.ok(cells.size > 20, p + " shows up (" + cells.size + " px)");
  }
  for (const pat of Object.keys(Cam.PATTERN_NAMES)) {
    if (pat === "plain") continue;
    const { g, cells } = grid(80, 60);
    P.PATTERNS[pat](g, 80, 50, th);
    assert.ok(cells.size > 30, pat + " covers the wall");
  }
});

test("a new piece lands in the room, not off the edge", () => {
  let room = [];
  for (const p of Object.keys(Cam.PIECES)) {
    const it = Cam.placeFor(p, room);
    room.push(it);
    const b = P.project(it, P.zOf(it));
    assert.ok(b.x > -0.2 && b.x + b.w < 1.2 && b.y > -0.2 && b.y < 1, p + " lands in the frame");
  }
});

test("a roll only ever hands out what the wardrobe has", () => {
  for (let s = 1; s < 60; s++) {
    const me = Cam.fresh(s);
    for (const row of Cam.YOU) assert.ok(row.values.includes(me.look[row.key]), "seed " + s + ": " + row.key);
    assert.ok(Cam.PALETTES[me.palette] && Cam.PATTERN_NAMES[me.pattern]);
    assert.ok(me.room.every((it) => Cam.PIECES[it.p]));
  }
  assert.deepEqual(Cam.fresh(9), Cam.fresh(9), "the same seed is the same person");
});

test("a saved camera is made safe before it is drawn", () => {
  const junk = { look: { style: "<script>", skin: 12, top: "hoodie" }, room: [{ p: "nope", x: 0, y: 0, w: 1, h: 1 }, { p: "cat", x: "a" }],
                 palette: "nowhere", pattern: 4, framing: "sideways", name: "x".repeat(80), guide: "later" };
  const me = Cam.normalize(junk, 3);
  assert.equal(me.look.top, "hoodie", "what was fine is kept");
  assert.ok(Cam.YOU[1].values.includes(me.look.style), "what was not is replaced");
  assert.deepEqual(me.room, []);
  assert.ok(Cam.PALETTES[me.palette]);
  assert.equal(me.framing, "against");
  assert.equal(me.name.length, 24);
  assert.equal(me.guide, 0);
  assert.equal(Cam.normalize({ guide: "done" }, 3).guide, "done");
});

test("nobody already in the game changes: builder pieces are opt-in", () => {
  for (const seed of ["batonpass_nell", "thimble_ines", "a", "b", "improbable_dennis:denise"]) {
    const t = P.traits(seed);
    assert.equal(t.top, "plain"); assert.equal(t.marks, "none"); assert.equal(t.ears, "none");
    assert.equal(t.hat, null); assert.equal(t.accent, null);
    assert.ok(P.STYLES.includes(t.style), "a rolled person only rolls the old styles");
  }
});
