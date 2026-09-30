"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Walk = require("../src/js/games/walk.js");
const Worlds = require("../src/js/games/worlds.js");
const Games = require("../src/js/hustle/games.js");
const HUSTLE = require("../src/js/hustle/content.js");
const Tutorial = require("../src/js/hustle/tutorial.js");

const C = Walk.core;
const gigs = Object.assign({}, HUSTLE.gigs, Tutorial.gigs);
const walks = Object.entries(Games.GAMES).filter(([, s]) => s.engine === "walk");

test("walk: every world's two layers are the same size, rectangle, in letters the engine knows", () => {
  for (const [name, w] of Object.entries(Worlds)) {
    const width = w.ground[0].length;
    assert.equal(w.props.length, w.ground.length, name + " has a props row for every ground row");
    for (const row of w.ground) { assert.equal(row.length, width, name + " ground rows are even"); assert.match(row, /^[.,:~=_s|]+$/, name + " ground letters"); }
    for (const row of w.props) { assert.equal(row.length, width, name + " props rows are even"); assert.match(row, /^[ T#*obwlxrh]+$/, name + " props letters"); }
    for (const t of w.things) assert.ok(t.x >= 0 && t.y >= 0 && t.x + (t.w || 1) <= width && t.y + (t.h || 1) <= w.ground.length, name + " keeps its things inside");
  }
});

test("walk: grids, paths and facing", () => {
  const world = { name: "test", ground: ["....", ".~..", "....", "...."], props: ["    ", "    ", " T  ", "    "], things: [{ kind: "board", x: 3, y: 0, w: 1, h: 2 }], start: [0, 0] };
  const G = C.grid(world);
  assert.equal(G.solid[1 * 4 + 1], 1, "water is solid");
  assert.equal(G.solid[2 * 4 + 1], 1, "a tree is solid");
  assert.equal(G.solid[0 * 4 + 3], 1, "a thing stands on its cells");
  assert.equal(G.solid[0], 0);
  const p = C.path(G, null, [0, 0], [2, 3]);
  assert.equal(p.length, 5, "round the water and the tree");
  assert.deepEqual(p[p.length - 1], [2, 3]);
  const toThing = C.path(G, null, [0, 0], [3, 1]);
  assert.ok(toThing && toThing.length, "to beside something solid");
  const [ex, ey] = toThing[toThing.length - 1];
  assert.equal(Math.abs(ex - 3) + Math.abs(ey - 1), 1, "ends next to it");
  assert.equal(C.path(G, (x, y) => x === 1 && y === 0, [0, 0], [3, 3]).length > 0, true, "around someone in the way");
  assert.equal(C.path({ w: 3, h: 1, solid: Uint8Array.from([0, 1, 0]) }, null, [0, 0], [2, 0]), null, "no way through a wall");
  assert.equal(C.faceTo([2, 2], [2, 1]), "up");
  assert.equal(C.faceTo([2, 2], [3, 2]), "right");
  assert.deepEqual(C.ahead([2, 2], "left"), [1, 2]);
  assert.equal(C.thingAt(world, 3, 1).kind, "board");
});

test("walk: every walk game can be played through: people stand free, talk leads somewhere, every grant is given, all reachable", () => {
  assert.ok(walks.length >= 2);
  for (const [id, spec] of walks) {
    const world = Worlds[spec.world];
    assert.ok(world, id + " walks round " + spec.world);
    assert.deepEqual(C.problems(world, spec), [], id);
    const facts = new Set((gigs[id].facts || []).map((f) => f.id));
    for (const g of spec.grants) assert.ok(facts.has(g), id + " grants its own " + g);
    assert.ok(spec.intro && spec.done, id + " says hello and goodbye");
  }
});

test("walk: the checks catch a walk that cannot be finished", () => {
  const world = Worlds.millbrook;
  const bad = {
    grants: ["onesoup", "hours"],
    people: [
      { id: "a", at: [1, 1], talk: { start: { say: "hi", opts: [["go on", "nowhere"]] } } },
      { id: "b", at: [5, 7], talk: { start: { say: "", grant: "rowc" } } },
    ],
    things: { nope: { talk: { start: { say: "?" } } } },
  };
  const p = C.problems(world, bad).join("\n");
  assert.match(p, /a stands in something solid/);
  assert.match(p, /a\.start: leads to nowhere/);
  assert.match(p, /b\.start: nothing said/);
  assert.match(p, /b\.start: grants rowc, not one of the game's/);
  assert.match(p, /nobody gives onesoup/);
  assert.match(p, /no thing nope/);
});
