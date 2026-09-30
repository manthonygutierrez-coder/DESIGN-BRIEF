"use strict";
/* ── Walk: a wander round a client's world, top-down ──────
 * Grid steps on 8 px tiles, the view following you; people to talk to and
 * things to look at, in the talk strip under the picture. Some of what they
 * say is research: a fact, won exactly as if clipped. A "!" over someone
 * says they have something to tell you, until you have it (from them, or
 * from a page). Arrow keys or WASD to walk, Space or Enter to talk; or click
 * where to go, or who to talk to.
 *
 *   HustleWalk.play(api)   api (hustle.js): { key, spec, won, grant, factLabel, played, onClose }
 *   HustleWalk.core        the pure part: the grid, paths, facing, and checks (tested)
 *
 * spec (games.js): { world, title, intro, done, ink, grants, people, things }
 *   person  { id, name, at: [x, y], face, look, talk, again?, wander? }
 *   things  thing id → { name, talk } (what looking at a world's thing says, for this gig)
 *   talk    { start: node, …: node }; node { say, grant?, opts?: [[label, next|null]] }
 *           again: a line for every visit after the first
 * A world (worlds.js): { name, pal, ground, props, things: [{ id?, kind, x, y, w, h, keeper? }], start }
 */

const HustleWalk = (() => {
  const T = 8, VW = 20, VH = 14, W = VW * T, H = VH * T;
  const Kit = typeof PixKit !== "undefined" ? PixKit : typeof require === "function" ? require("./pixkit.js") : null;
  const Worlds = () => (typeof WalkWorlds !== "undefined" ? WalkWorlds : typeof require === "function" ? require("./worlds.js") : {});

  /* ── the pure part ─────────────────────────────────────── */
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const SOLID_GROUND = "~|";                 // water, walls
  const SOLID_PROPS = "T#obwlxrh";           // tree, fence, rock, bench, bush, lamp, crate, reeds, hedge

  // Where you cannot walk: water and walls, solid props, and every thing's footprint.
  function grid(world) {
    const h = world.ground.length, w = world.ground[0].length, solid = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const g = world.ground[y][x], p = (world.props && world.props[y] && world.props[y][x]) || " ";
      if (SOLID_GROUND.includes(g) || SOLID_PROPS.includes(p)) solid[y * w + x] = 1;
    }
    for (const t of world.things || []) {
      if (t.walk) continue;
      for (let j = 0; j < (t.h || 1); j++) for (let i = 0; i < (t.w || 1); i++) {
        const x = t.x + i, y = t.y + j;
        if (x >= 0 && y >= 0 && x < w && y < h) solid[y * w + x] = 1;
      }
    }
    return { w, h, solid };
  }
  const inside = (G, x, y) => x >= 0 && y >= 0 && x < G.w && y < G.h;
  const open = (G, taken, x, y) => inside(G, x, y) && !G.solid[y * G.w + x] && !(taken && taken(x, y));
  const ahead = ([x, y], dir) => [x + DIRS[dir][0], y + DIRS[dir][1]];
  const faceTo = ([x0, y0], [x1, y1]) => (Math.abs(x1 - x0) > Math.abs(y1 - y0) ? (x1 > x0 ? "right" : "left") : y1 > y0 ? "down" : "up");
  // The shortest walk from `from` to `to`, as the cells to step through; to a
  // cell beside `to` if it cannot be stood on. null if there is no way.
  function path(G, taken, from, to) {
    const goal = new Set();
    if (open(G, taken, to[0], to[1])) goal.add(to[1] * G.w + to[0]);
    else for (const d of Object.values(DIRS)) { const x = to[0] + d[0], y = to[1] + d[1]; if (open(G, taken, x, y) || (x === from[0] && y === from[1])) goal.add(y * G.w + x); }
    const start = from[1] * G.w + from[0];
    if (goal.has(start)) return [];
    const prev = new Int32Array(G.w * G.h).fill(-1), q = [start];
    prev[start] = start;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi], cx = c % G.w, cy = (c / G.w) | 0;
      for (const d of Object.values(DIRS)) {
        const x = cx + d[0], y = cy + d[1], n = y * G.w + x;
        if (!inside(G, x, y) || prev[n] !== -1 || !open(G, taken, x, y)) continue;
        prev[n] = c;
        if (goal.has(n)) {
          const out = [];
          for (let k = n; k !== start; k = prev[k]) out.push([k % G.w, (k / G.w) | 0]);
          return out.reverse();
        }
        q.push(n);
      }
    }
    return null;
  }
  const thingAt = (world, x, y) => (world.things || []).find((t) => x >= t.x && y >= t.y && x < t.x + (t.w || 1) && y < t.y + (t.h || 1)) || null;

  // What is wrong with a walk as written, for tests: people stood in walls,
  // talk that leads nowhere, grants the game does not have, and anyone you
  // cannot reach to talk to.
  function problems(world, spec) {
    const out = [], G = grid(world), people = spec.people || [];
    const at = new Set(people.map((p) => p.at.join(",")));
    const taken = (x, y) => at.has(x + "," + y);
    const [sx, sy] = world.start;
    if (!open(G, taken, sx, sy)) out.push("the start is not free");
    const grants = new Set(spec.grants || []), given = new Set();
    const talks = people.map((p) => [p.id, p.talk]).concat(Object.entries(spec.things || {}).map(([id, t]) => [id, t.talk]));
    for (const [id, talk] of talks) {
      if (!talk || !talk.start) { out.push(id + ": no start"); continue; }
      for (const [nid, n] of Object.entries(talk)) {
        if (!n || typeof n.say !== "string" || !n.say) out.push(id + "." + nid + ": nothing said");
        if (n && n.grant) { if (!grants.has(n.grant)) out.push(id + "." + nid + ": grants " + n.grant + ", not one of the game's"); given.add(n.grant); }
        for (const [label, next] of (n && n.opts) || []) {
          if (!label) out.push(id + "." + nid + ": an option with no words");
          if (next && !talk[next]) out.push(id + "." + nid + ": leads to " + next + ", which is not there");
        }
      }
    }
    for (const g of grants) if (!given.has(g)) out.push("nobody gives " + g);
    // A keeper is talked to across their counter: reaching the counter is enough.
    const kept = new Set((world.things || []).filter((t) => t.keeper).map((t) => t.keeper));
    const reachThing = (t) => {
      const next = [];
      for (let i = -1; i <= (t.w || 1); i++) next.push([t.x + i, t.y - 1], [t.x + i, t.y + (t.h || 1)]);
      for (let j = 0; j < (t.h || 1); j++) next.push([t.x - 1, t.y + j], [t.x + (t.w || 1), t.y + j]);
      return next.some(([x, y]) => open(G, taken, x, y) && path(G, taken, [sx, sy], [x, y]) !== null);
    };
    for (const p of people) {
      if (!inside(G, p.at[0], p.at[1]) || G.solid[p.at[1] * G.w + p.at[0]]) {
        if (!kept.has(p.id)) out.push(p.id + " stands in something solid");
        else if (!reachThing((world.things || []).find((t) => t.keeper === p.id))) out.push(p.id + "'s counter cannot be reached");
      } else if (path(G, (x, y) => at.has(x + "," + y) && !(x === p.at[0] && y === p.at[1]), [sx, sy], p.at) === null) out.push(p.id + " cannot be reached");
    }
    for (const id of Object.keys(spec.things || {})) {
      const t = (world.things || []).find((x) => x.id === id);
      if (!t) { out.push("no thing " + id + " in " + world.name); continue; }
      if (!reachThing(t)) out.push(id + " cannot be reached");
    }
    return out;
  }

  /* ── drawing ───────────────────────────────────────────── */
  function rect(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  function ground(ctx, ch, sx, sy, x, y, P, t, still) {
    const h = Kit.hash(x, y);
    switch (ch) {
      case ",":
        rect(ctx, P.path, sx, sy, 8, 8);
        if (h % 3 === 0) rect(ctx, P.path2, sx + (h % 7), sy + ((h >> 3) % 7), 1, 1);
        if (h % 5 === 0) rect(ctx, P.path2, sx + ((h >> 5) % 6), sy + ((h >> 8) % 6), 2, 1);
        break;
      case ":":
        rect(ctx, P.stone, sx, sy, 8, 8);
        rect(ctx, P.stone2, sx, sy + 3, 8, 1); rect(ctx, P.stone2, sx, sy + 7, 8, 1);
        rect(ctx, P.stone2, sx + (y % 2 ? 2 : 6), sy, 1, 3); rect(ctx, P.stone2, sx + (y % 2 ? 5 : 1), sy + 4, 1, 3);
        if (h % 4 === 0) rect(ctx, P.stoneHi, sx + (h % 5), sy + ((h >> 4) % 2 ? 1 : 5), 2, 1);
        break;
      case "~": {
        rect(ctx, P.water, sx, sy, 8, 8);
        const k = still ? 0 : Math.floor(t * 1.6 + (h % 8)) % 8;
        rect(ctx, P.water2, sx + ((h >> 3) + k) % 6, sy + (h % 3) * 3 + 1, 3, 1);
        if (h % 4 === 0) rect(ctx, P.water2, sx + ((h >> 7) + k * 2) % 7, sy + 6, 1, 1);
        break;
      }
      case "=":
        rect(ctx, P.wood, sx, sy, 8, 8);
        rect(ctx, P.wood2, sx, sy + 3, 8, 1); rect(ctx, P.wood2, sx, sy + 7, 8, 1);
        rect(ctx, P.ink, sx + (y % 2 ? 1 : 5), sy + 1, 1, 1);
        break;
      case "_":
        rect(ctx, P.floor, sx, sy, 8, 8);
        rect(ctx, P.floor2, sx, sy, 8, 1); rect(ctx, P.floor2, sx + (y % 2 ? 0 : 4), sy, 1, 8);
        break;
      case "s":
        rect(ctx, P.sand, sx, sy, 8, 8);
        if (h % 3 === 0) rect(ctx, P.sand2, sx + (h % 7), sy + ((h >> 3) % 7), 1, 1);
        break;
      case "|":
        rect(ctx, P.wall, sx, sy, 8, 8);
        rect(ctx, P.wall2, sx, sy + 3, 8, 1); rect(ctx, P.wall2, sx, sy + 7, 8, 1);
        rect(ctx, P.wall2, sx + (y % 2 ? 2 : 6), sy, 1, 3); rect(ctx, P.wall2, sx + (y % 2 ? 6 : 2), sy + 4, 1, 3);
        break;
      default:
        rect(ctx, P.grass, sx, sy, 8, 8);
        if (h % 3 === 0) { rect(ctx, P.grass2, sx + (h % 6), sy + ((h >> 4) % 5) + 1, 1, 2); rect(ctx, P.grass2, sx + (h % 6) + 2, sy + ((h >> 4) % 5) + 2, 1, 1); }
        else if (h % 7 === 1) rect(ctx, P.grass2, sx + ((h >> 6) % 7), sy + ((h >> 9) % 7), 1, 1);
    }
  }
  // Flowers lie flat; everything else stands, and is drawn in turn with the people.
  function flat(ctx, ch, sx, sy, x, y, P) {
    if (ch !== "*") return;
    const h = Kit.hash(x + 3, y + 7), cs = [P.flowerA, P.flowerB, P.flowerC];
    for (let i = 0; i < 3; i++) {
      const fx = sx + 1 + ((h >> (i * 4)) % 6), fy = sy + 1 + ((h >> (i * 5 + 2)) % 6);
      rect(ctx, P.grass2, fx, fy + 1, 1, 1);
      rect(ctx, cs[(h >> (i * 3)) % 3], fx, fy, 1, 1);
    }
  }
  function prop(ctx, ch, sx, sy, x, y, P) {
    const h = Kit.hash(x, y);
    switch (ch) {
      case "T":                                   // a tree: its crown stands over the tile above
        rect(ctx, P.shadow, sx + 1, sy + 6, 6, 2);
        rect(ctx, P.trunk, sx + 3, sy + 2, 2, 5);
        rect(ctx, P.leaf, sx, sy - 6, 8, 8); rect(ctx, P.leaf, sx + 1, sy - 7, 6, 10);
        rect(ctx, P.leaf2, sx + 1, sy - 6, 5, 4); rect(ctx, P.leafHi, sx + 2, sy - 5, 2, 1);
        if (h % 3 === 0) rect(ctx, P.fruit || P.leafHi, sx + 5, sy - 2, 1, 1);
        break;
      case "#": {                                 // a fence
        rect(ctx, P.fence2, sx, sy + 3, 8, 1); rect(ctx, P.fence2, sx, sy + 6, 8, 1);
        rect(ctx, P.fence, sx + 1, sy + 1, 2, 7); rect(ctx, P.fence, sx + 5, sy + 1, 2, 7);
        rect(ctx, P.fence2, sx + 1, sy + 1, 2, 1); rect(ctx, P.fence2, sx + 5, sy + 1, 2, 1);
        break;
      }
      case "o":
        rect(ctx, P.shadow, sx + 1, sy + 5, 7, 3);
        rect(ctx, P.rock, sx + 1, sy + 2, 6, 5); rect(ctx, P.rock, sx + 2, sy + 1, 4, 7);
        rect(ctx, P.rockHi, sx + 2, sy + 2, 2, 1);
        break;
      case "w":
        rect(ctx, P.shadow, sx, sy + 5, 8, 3);
        rect(ctx, P.leaf, sx, sy + 1, 8, 6); rect(ctx, P.leaf, sx + 1, sy, 6, 8);
        rect(ctx, P.leaf2, sx + 1, sy + 1, 4, 2); if (h % 2) rect(ctx, P.flowerA, sx + 5, sy + 2, 1, 1);
        break;
      case "h":                                   // a clipped hedge
        rect(ctx, P.leaf, sx, sy, 8, 8); rect(ctx, P.leaf2, sx, sy, 8, 2); rect(ctx, P.leafHi, sx + (h % 6), sy, 2, 1);
        break;
      case "b":                                   // a bench
        rect(ctx, P.shadow, sx, sy + 6, 8, 2);
        rect(ctx, P.wood2, sx, sy + 1, 8, 2); rect(ctx, P.wood, sx, sy + 4, 8, 2);
        rect(ctx, P.ink, sx + 1, sy + 6, 1, 2); rect(ctx, P.ink, sx + 6, sy + 6, 1, 2);
        break;
      case "l": {                                 // a lamp post
        rect(ctx, P.shadow, sx + 2, sy + 6, 4, 2);
        rect(ctx, P.iron, sx + 3, sy - 6, 2, 13);
        rect(ctx, P.iron, sx + 2, sy - 9, 4, 1); rect(ctx, P.lamp, sx + 2, sy - 8, 4, 3); rect(ctx, P.iron, sx + 2, sy - 5, 4, 1);
        break;
      }
      case "x":
        rect(ctx, P.shadow, sx, sy + 6, 8, 2);
        rect(ctx, P.wood, sx + 1, sy + 1, 6, 6); rect(ctx, P.wood2, sx + 1, sy + 1, 6, 1); rect(ctx, P.wood2, sx + 1, sy + 4, 6, 1);
        rect(ctx, P.ink, sx + 1, sy + 7, 6, 1);
        break;
      case "r":                                   // reeds at the water's edge
        for (let i = 0; i < 4; i++) { const rx = sx + 1 + i * 2, top = sy - 2 + ((h >> i) % 3); rect(ctx, i % 2 ? P.leaf : P.leaf2, rx, top, 1, 9 - (top - sy)); }
        rect(ctx, P.trunk, sx + 3, sy - 2 + (h % 2), 1, 2);
        break;
    }
  }

  // The world's own things: stalls, carts, boards, houses, vans. Drawn in
  // turn with the people, by the row they stand on.
  function thing(ctx, o, sx, sy, P, t, still, part) {
    const w = (o.w || 1) * T, hh = (o.h || 1) * T;
    switch (o.kind) {
      case "stall": {                             // three rows: the awning, the keeper's, the counter
        const [a, b] = o.awning || [P.awnA, P.awnB];
        if (part !== "front") {                   // behind the keeper: posts and the awning
          rect(ctx, P.wood, sx + 1, sy + 2, 2, hh - 4); rect(ctx, P.wood, sx + w - 3, sy + 2, 2, hh - 4);
          for (let i = 0; i < w; i++) rect(ctx, (i >> 2) % 2 ? b : a, sx + i, sy - 2, 1, 9 + ((i >> 1) % 2));
          rect(ctx, P.ink, sx, sy - 3, w, 1);
          if (o.sign) {
            const tw = Kit.measure(o.sign);
            rect(ctx, P.plate || "#F4EAD8", sx + ((w - tw) >> 1) - 2, sy - 1, tw + 4, 7);
            Kit.text(ctx, o.sign, sx + ((w - tw) >> 1), sy, o.signInk || P.ink);
          }
        }
        if (part !== "back") {                    // in front of the keeper: the counter and what is on it
          const cy = sy + hh - 8;
          rect(ctx, P.shadow, sx, sy + hh - 1, w, 2);
          rect(ctx, P.counter || P.wood2, sx, cy + 2, w, 6); rect(ctx, P.wood, sx, cy + 7, w, 1); rect(ctx, P.ink, sx, cy + 2, w, 1);
          goods(ctx, o.goods, sx, cy + 1, w, P, t, still);
        }
        break;
      }
      case "cart": {                              // Tori's cart: red, cream trim, a pot steaming
        rect(ctx, P.shadow, sx + 1, sy + hh - 1, w - 2, 2);
        rect(ctx, P.cart, sx, sy + 5, w, 8); rect(ctx, P.cream, sx, sy + 5, w, 2); rect(ctx, P.cream, sx, sy + 11, w, 1);
        rect(ctx, P.ink, sx + 3, sy + 12, 4, 4); rect(ctx, P.iron, sx + 4, sy + 13, 2, 2);                // a wheel
        rect(ctx, P.ink, sx + w - 7, sy + 12, 4, 4); rect(ctx, P.iron, sx + w - 6, sy + 13, 2, 2);
        rect(ctx, P.iron, sx + 4, sy, 8, 5); rect(ctx, P.ink, sx + 4, sy, 8, 1); rect(ctx, P.soup, sx + 5, sy + 1, 6, 1);   // the pot
        rect(ctx, P.parsley, sx + 7, sy + 1, 1, 1);
        if (!still) for (let i = 0; i < 3; i++) { const k = (t * 3 + i * 0.8) % 3; rect(ctx, P.steam, sx + 6 + i * 2 + (Math.floor(k * 2) % 2), sy - 2 - Math.floor(k * 2), 1, 1); }
        // The pizza box it has instead of a sign, propped on the front.
        rect(ctx, P.box, sx + w - 9, sy + 6, 8, 6); rect(ctx, P.boxInk, sx + w - 8, sy + 8, 6, 1); rect(ctx, P.boxInk, sx + w - 8, sy + 10, 4, 1);
        break;
      }
      case "board": {                              // a notice board on two legs
        rect(ctx, P.shadow, sx, sy + hh - 1, w, 2);
        rect(ctx, P.wood, sx + 1, sy + 9, 1, hh - 9); rect(ctx, P.wood, sx + w - 2, sy + 9, 1, hh - 9);
        rect(ctx, P.wood, sx, sy + 1, w, 9); rect(ctx, o.face || P.chalk || "#2E3A2E", sx + 1, sy + 2, w - 2, 7);
        if (o.label) Kit.text(ctx, o.label, sx + 2, sy + 3, o.ink || "#F4F1EA");
        else for (let j = 0; j < 3; j++) rect(ctx, "#E8E4D8", sx + 2, sy + 3 + j * 2, w - 4 - ((j * 3) % 4), 1);
        break;
      }
      case "post": {                               // a signpost with a letter on it
        rect(ctx, P.shadow, sx + 2, sy + 6, 4, 2);
        rect(ctx, P.wood, sx + 3, sy - 1, 2, 8);
        rect(ctx, P.plate || "#F4EAD8", sx, sy - 5, 8, 7); rect(ctx, P.ink, sx, sy + 1, 8, 1);
        if (o.label) Kit.text(ctx, o.label, sx + ((8 - Kit.measure(o.label)) >> 1), sy - 4, P.ink);
        break;
      }
      case "house": {                              // a cottage: roof, walls, a door, windows
        const roofH = Math.min(hh - 8, 12);
        rect(ctx, P.shadow, sx, sy + hh - 1, w, 2);
        rect(ctx, o.walls || P.walls, sx + 1, sy + roofH, w - 2, hh - roofH);
        for (let j = 0; j < roofH; j++) rect(ctx, j % 3 === 2 ? (o.roof2 || P.roof2) : (o.roof || P.roof), sx + Math.max(0, 3 - j), sy + j, w - Math.max(0, 3 - j) * 2, 1);
        const dx = sx + (o.door != null ? o.door * T + 2 : ((w - 4) >> 1));
        rect(ctx, o.doorC || P.door, dx, sy + hh - 7, 5, 7); rect(ctx, P.ink, dx + 3, sy + hh - 4, 1, 1);
        for (let i = 0; i < (o.win || 2); i++) {
          const wx = sx + 3 + i * Math.max(8, Math.floor((w - 12) / Math.max(1, (o.win || 2) - 1)));
          if (Math.abs(wx - dx) < 6) continue;
          rect(ctx, P.ink, wx, sy + roofH + 3, 5, 5); rect(ctx, P.glass, wx + 1, sy + roofH + 4, 3, 3);
        }
        if (o.sign) {
          const tw = Kit.measure(o.sign);
          rect(ctx, P.plate || "#F4EAD8", sx + ((w - tw) >> 1) - 2, sy + roofH - 3, tw + 4, 7);
          Kit.text(ctx, o.sign, sx + ((w - tw) >> 1), sy + roofH - 2, P.ink);
        }
        break;
      }
      case "van": {
        rect(ctx, P.shadow, sx + 1, sy + hh - 1, w - 2, 2);
        rect(ctx, o.body || "#E8E4D8", sx, sy + 2, w - 6, 11); rect(ctx, o.body || "#E8E4D8", sx + w - 7, sy + 5, 7, 8);
        rect(ctx, P.glass, sx + w - 6, sy + 6, 4, 3);
        rect(ctx, o.stripe || "#C8252C", sx, sy + 8, w, 2); rect(ctx, o.stripe2 || "#2F6FC0", sx, sy + 10, w, 1);
        rect(ctx, P.ink, sx + 3, sy + 12, 4, 4); rect(ctx, P.ink, sx + w - 8, sy + 12, 4, 4);
        break;
      }
      case "table": {
        rect(ctx, P.shadow, sx, sy + hh - 1, w, 2);
        rect(ctx, o.cloth || P.cloth || "#F4EAD8", sx, sy + 2, w, 6); rect(ctx, P.wood, sx + 1, sy + 8, 1, hh - 8); rect(ctx, P.wood, sx + w - 2, sy + 8, 1, hh - 8);
        goods(ctx, o.goods, sx, sy + 1, w, P, t, still);
        break;
      }
      case "well": {
        rect(ctx, P.shadow, sx, sy + hh - 1, w, 2);
        rect(ctx, P.stone, sx + 1, sy + 6, w - 2, hh - 6); rect(ctx, P.stone2, sx + 1, sy + 9, w - 2, 1); rect(ctx, P.water, sx + 3, sy + 6, w - 6, 2);
        rect(ctx, P.wood, sx + 1, sy - 2, 1, 8); rect(ctx, P.wood, sx + w - 2, sy - 2, 1, 8); rect(ctx, P.roof, sx, sy - 4, w, 3);
        break;
      }
      case "missing": {                             // a sprite nobody has drawn yet
        rect(ctx, P.shadow, sx + 1, sy + 6, 6, 2);
        for (let j = 0; j < 12; j++) for (let i = 0; i < 8; i++) rect(ctx, ((i >> 1) + (j >> 1)) % 2 ? "#FF00DC" : "#101010", sx + i, sy - 4 + j, 1, 1);
        if (!still && Math.floor(t * 2) % 2) Kit.text(ctx, "?", sx + 2, sy - 1, "#FFFFFF");
        break;
      }
      case "duck": {                                // something in the water, the size of a canoe
        if (still) break;
        const k = (t * 0.25 + (o.phase || 0)) % 1, dx = Math.round(Math.sin(k * Math.PI * 2) * 10);
        const bx = sx + dx, by = sy + 3;
        rect(ctx, P.water2, bx - 2, by + 4, w + 4, 1);
        rect(ctx, "#2A3A2A", bx + 2, by + 1, w - 6, 3); rect(ctx, "#2A3A2A", bx + w - 6, by - 3, 3, 5); rect(ctx, "#C9A43A", bx + w - 4, by - 2, 3, 1);
        break;
      }
    }
  }
  function goods(ctx, kind, sx, sy, w, P, t, still) {
    const n = Math.floor((w - 4) / 4);
    for (let i = 0; i < n; i++) {
      const gx = sx + 2 + i * 4;
      if (kind === "jars") { rect(ctx, P.honey, gx, sy, 3, 3); rect(ctx, P.cream, gx, sy - 1, 3, 1); }
      else if (kind === "veg") { rect(ctx, i % 2 ? P.veg : P.leaf2, gx, sy, 3, 3); rect(ctx, P.leaf, gx + 1, sy - 1, 1, 1); }
      else if (kind === "bread") { rect(ctx, P.bread, gx, sy, 3, 2); rect(ctx, P.bread2 || P.wood2, gx, sy + 1, 3, 1); }
      else if (kind === "flowers") { rect(ctx, P.leaf2, gx + 1, sy, 1, 3); rect(ctx, [P.flowerA, P.flowerB, P.flowerC][i % 3], gx, sy - 1, 3, 2); }
      else if (kind === "wool") { rect(ctx, [P.flowerA, "#6B8FD8", P.flowerB][i % 3], gx, sy, 3, 3); }
      else if (kind === "neon") { if (!still && Math.floor(t * 4 + i) % 5 === 0) continue; rect(ctx, "#39FF14", gx, sy - 1, 3, 1); rect(ctx, "#39FF14", gx + 1, sy, 1, 2); }
      else if (kind === "cans") { rect(ctx, i % 2 ? "#9B3FE0" : "#FFD23F", gx, sy - 1, 3, 4); }
      else if (kind === "zines") { rect(ctx, i % 2 ? "#E8574A" : "#2F6FC0", gx, sy, 3, 2); }
      else if (kind === "thread") { rect(ctx, [P.flowerA, P.flowerB, "#6B8FD8"][i % 3], gx, sy, 2, 3); rect(ctx, P.wood, gx, sy - 1, 2, 1); }
      else if (kind === "laptop") { rect(ctx, "#2A2A30", gx, sy - 2, 4, 3); rect(ctx, "#8FD8FF", gx + 1, sy - 1, 2, 1); rect(ctx, "#5A5A64", gx - 1, sy + 1, 6, 1); }
    }
  }
  function cat(ctx, sx, sy, fur, dir, step) {
    const rows = dir === "up" || dir === "down"
      ? [".k..k...", ".ffff...", ".fkfk...", "..fff.f.", ".ffffff.", ".f.f.f.."]
      : ["k..k....", "ffff....", "fkff....", "fff...ff", "ffffffff", ".f.f..f."];
    if (step) rows[5] = dir === "up" || dir === "down" ? "..f.f..." : "f.f..f..";
    Kit.blit(ctx, rows, sx, sy + 2, { f: fur, k: "#1A1418" }, dir === "right");
  }
  function bubble(ctx, sx, sy, ink, bob) {
    const y = sy - 11 - bob;
    rect(ctx, ink, sx + 1, y, 6, 8); rect(ctx, "#FFFFFF", sx + 2, y + 1, 4, 6); rect(ctx, ink, sx + 3, y + 8, 2, 1);
    rect(ctx, ink, sx + 4, y + 2, 1, 2); rect(ctx, ink, sx + 4, y + 5, 1, 1);
  }

  /* ── play ──────────────────────────────────────────────── */
  function play(api) {
    const spec = api.spec, world = Worlds()[spec.world];
    if (!world) return null;
    let S = null;
    const g = MiniGame.open({ key: api.key, title: spec.title, iconId: "gamepad", w: W, h: H, scale: 3, className: "w98--walk", ink: spec.ink, enterGo: false,
      onClose: () => { if (S && api.played) api.played(S.done ? "won" : "left"); if (api.onClose) api.onClose(); } });
    if (g.running) return g;
    g.running = true;
    const P = world.pal, still = g.reduced, ctx = g.ctx, G = grid(world);
    const MW = G.w * T, MH = G.h * T;
    const me = Kit.lookOf(typeof Camera !== "undefined" && Camera.current ? Camera.current() : null);
    const people = (spec.people || []).map((p) => Object.assign({ x: p.at[0], y: p.at[1], dir: p.face || "down", home: p.at.slice(), mv: null, next: 1 + Math.random() * 2 }, p));
    S = {
      x: world.start[0], y: world.start[1], dir: world.start[2] || "up", mv: null, step: 0, steps: 0,
      route: [], face: null, talking: null, met: new Set(), done: false, last: null, t: 0, cam: { x: 0, y: 0 },
    };
    const SPEED = 7.5;                                  // tiles a second
    // Someone stands on their cell, and on the one they are stepping to.
    const who = (x, y) => people.find((p) => (p.x === x && p.y === y) || (p.mv && p.mv.to[0] === x && p.mv.to[1] === y)) || null;
    const meAt = (x, y) => (S.x === x && S.y === y) || (!!S.mv && S.mv.to[0] === x && S.mv.to[1] === y);
    const walkable = (x, y) => open(G, (a, b) => !!who(a, b), x, y);
    const grants = spec.grants || [];
    const has = (id) => api.won(id);
    const hud = () => g.hud("found " + grants.filter(has).length + "/" + grants.length);
    const fresh = (talk) => Object.values(talk || {}).some((n) => n && n.grant && !has(n.grant));

    /* talking */
    function talkTo(p) {
      S.route = []; S.face = null;
      if (p.kind !== "thing") p.dir = faceTo([p.x, p.y], [S.x, S.y]);
      S.talking = p;
      const again = S.met.has(p.id) && p.again && !fresh(p.talk);
      S.met.add(p.id);
      show(again ? { say: p.again } : p.talk.start);
    }
    function show(n) {
      const p = S.talking;
      if (!p || !n) return end();
      g.say((p.name ? p.name + ": " : "") + n.say);
      if (n.grant && api.grant(n.grant, n.say) === "new") {
        g.toast("+ fact card: " + (api.factLabel ? api.factLabel(n.grant) : n.grant));
        hud();
        if (!S.done && grants.every(has)) S.done = true;
      }
      const opts = n.opts || [];
      if (!opts.length) { g.choices([{ label: "…", kind: "go", act: end }]); return; }
      g.choices(opts.map(([label, next], i) => ({ label, kind: i === 0 ? "go" : next ? null : "quiet", act: () => (next ? show(p.talk[next]) : end()) })));
    }
    function end() {
      S.talking = null;
      if (S.done && !S.toldDone) {
        S.toldDone = true;
        g.say(spec.done || "That's everything here.");
        g.choices([{ label: "Done", kind: "go", act: () => g.close() }, { label: "Keep walking", kind: "quiet", act: explore }]);
        return;
      }
      explore();
    }
    function explore() {
      S.talking = null;
      g.say(S.done ? (spec.done || "That's everything here.") : spec.intro);
      g.choices([{ label: "Leave", kind: "quiet", act: () => g.close() }]);
      g.focus();
    }

    /* what is in front of you */
    function target([x, y]) {
      const p = who(x, y);
      if (p) return p;
      const o = thingAt(world, x, y);
      if (!o) return null;
      if (o.keeper) { const k = people.find((q) => q.id === o.keeper); if (k) return k; }
      const t = o.id && spec.things && spec.things[o.id];
      if (t) return Object.assign({ kind: "thing", id: o.id, x: o.x, y: o.y }, t);
      if (o.say) return { kind: "thing", id: o.id || o.kind + o.x + "," + o.y, name: o.name, talk: { start: { say: o.say } }, x: o.x, y: o.y };
      return null;
    }
    function interact() {
      if (S.talking || S.mv) return;
      const t = target(ahead([S.x, S.y], S.dir));
      if (t) talkTo(t);
    }

    /* moving */
    function stepTo(dir) {
      S.dir = dir;
      const [nx, ny] = ahead([S.x, S.y], dir);
      if (!walkable(nx, ny)) { S.route = []; return false; }
      S.mv = { from: [S.x, S.y], to: [nx, ny], t: 0 };
      return true;
    }
    const KEYDIR = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    function held() {
      if (S.last && Object.entries(KEYDIR).some(([k, d]) => d === S.last && g.keys.has(k))) return S.last;
      for (const [k, d] of Object.entries(KEYDIR)) if (g.keys.has(k)) return d;
      return null;
    }
    g.onKey((key) => {
      if (KEYDIR[key]) { S.last = KEYDIR[key]; S.route = []; S.face = null; }
      if (key === " " || key === "enter" || key === "e" || key === "z") interact();
    });
    // Click where to go; click someone, or something, to walk up to it and talk.
    g.cv.addEventListener("click", (e) => {
      if (S.talking) return;
      const a = g.at(e), tx = Math.floor((a.x + S.cam.x) / T), ty = Math.floor((a.y + S.cam.y) / T);
      if (!inside(G, tx, ty)) return;
      const aim = !!(who(tx, ty) || (thingAt(world, tx, ty) && target([tx, ty])));
      const route = path(G, (x, y) => !!who(x, y) && !(aim && x === tx && y === ty), [S.x, S.y], [tx, ty]);
      if (!route) return;
      S.route = route;
      S.face = aim ? [tx, ty] : null;
    });

    function update(dt) {
      S.t += dt;
      if (S.mv) {
        S.mv.t += dt * SPEED;
        if (S.mv.t >= 1) { [S.x, S.y] = S.mv.to; S.mv = null; S.steps++; }
      }
      if (!S.mv && !S.talking) {
        const d = held();
        if (d) stepTo(d);
        else if (S.route.length) {
          const [nx, ny] = S.route[0];
          if (!walkable(nx, ny)) S.route = [];
          else { S.route.shift(); stepTo(faceTo([S.x, S.y], [nx, ny])); }
        } else if (S.face) {
          // Whoever you were going to may have stepped away: face where they are now.
          const f = S.face; S.face = null;
          const p = people.find((q) => q.x === f[0] && q.y === f[1]);
          const at = p ? [p.x, p.y] : f;
          S.dir = faceTo([S.x, S.y], at);
          if (Math.abs(at[0] - S.x) + Math.abs(at[1] - S.y) === 1) interact();
        }
      }
      S.step = S.mv ? (S.mv.t < 0.5 ? (S.steps % 2 ? 1 : 2) : 0) : 0;
      // The others: a step now and then, near home, never into anyone.
      for (const p of people) {
        if (p.mv) { p.mv.t += dt * SPEED * 0.5; if (p.mv.t >= 1) { [p.x, p.y] = p.mv.to; p.mv = null; } continue; }
        if (!p.wander || S.talking === p || (S.face && S.face[0] === p.x && S.face[1] === p.y)) continue;
        p.next -= dt;
        if (p.next > 0) continue;
        p.next = 1.4 + Math.random() * 2.6;
        const dir = Object.keys(DIRS)[Math.floor(Math.random() * 4)], [nx, ny] = ahead([p.x, p.y], dir);
        p.dir = dir;
        if (Math.abs(nx - p.home[0]) + Math.abs(ny - p.home[1]) > p.wander || !open(G, null, nx, ny) || who(nx, ny) || meAt(nx, ny)) continue;
        p.mv = { from: [p.x, p.y], to: [nx, ny], t: 0 };
      }
    }

    const pos = (o) => (o.mv ? [o.mv.from[0] + (o.mv.to[0] - o.mv.from[0]) * Math.min(1, o.mv.t), o.mv.from[1] + (o.mv.to[1] - o.mv.from[1]) * Math.min(1, o.mv.t)] : [o.x, o.y]);
    function draw() {
      const [px, py] = pos(S);
      const cx = MW <= W ? (MW - W) / 2 : Math.max(0, Math.min(MW - W, px * T + 4 - W / 2));
      const cy = MH <= H ? (MH - H) / 2 : Math.max(0, Math.min(MH - H, py * T + 4 - H / 2));
      S.cam = { x: Math.round(cx), y: Math.round(cy) };
      const ox = -S.cam.x, oy = -S.cam.y;
      rect(ctx, P.edge || P.grass, 0, 0, W, H);
      const x0 = Math.max(0, Math.floor(S.cam.x / T) - 1), x1 = Math.min(G.w - 1, Math.floor((S.cam.x + W) / T) + 1);
      const y0 = Math.max(0, Math.floor(S.cam.y / T) - 1), y1 = Math.min(G.h - 1, Math.floor((S.cam.y + H) / T) + 2);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        ground(ctx, world.ground[y][x], ox + x * T, oy + y * T, x, y, P, S.t, still);
        flat(ctx, (world.props[y] || "")[x], ox + x * T, oy + y * T, x, y, P);
      }
      // Everything that stands, back to front by the row its feet are on.
      const list = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const ch = (world.props[y] || "")[x];
        if (ch && ch !== " " && ch !== "*" && ch !== ".") list.push({ z: y, f: () => prop(ctx, ch, ox + x * T, oy + y * T, x, y, P) });
      }
      for (const o of world.things || []) {
        if (o.x > x1 + 1 || o.x + (o.w || 1) < x0 - 1 || o.y > y1 + 2 || o.y + (o.h || 1) < y0 - 1) continue;
        const sx = ox + o.x * T, sy = oy + o.y * T, bottom = o.y + (o.h || 1) - 1;
        if (o.kind === "stall") {
          list.push({ z: o.y, f: () => thing(ctx, o, sx, sy, P, S.t, still, "back") });
          list.push({ z: bottom, f: () => thing(ctx, o, sx, sy, P, S.t, still, "front") });
        } else list.push({ z: o.kind === "duck" ? -99 : bottom, f: () => thing(ctx, o, sx, sy, P, S.t, still) });
      }
      for (const p of people) {
        const [qx, qy] = pos(p);
        list.push({ z: qy + 0.5, f: () => {
          const sx = Math.round(ox + qx * T), sy = Math.round(oy + qy * T), st = p.mv ? (p.mv.t < 0.5 ? 1 : 2) : 0;
          rect(ctx, P.shadow, sx + 1, sy + 7, 6, 1);
          if (p.look && p.look.cat) cat(ctx, sx, sy, p.look.fur, p.dir, st);
          else Kit.person(ctx, sx, sy - 4, p.look, p.dir, st);
          if (fresh(p.talk) && S.talking !== p) bubble(ctx, sx, sy + (p.look && p.look.cat ? 6 : 0), P.ink, still ? 0 : (Math.floor(S.t * 3 + p.home[0]) % 2));
        } });
      }
      list.push({ z: py + 0.6, f: () => {
        const sx = Math.round(ox + px * T), sy = Math.round(oy + py * T);
        rect(ctx, P.shadow, sx + 1, sy + 7, 6, 1);
        Kit.person(ctx, sx, sy - 4, me, S.dir, S.step);
      } });
      list.sort((a, b) => a.z - b.z);
      for (const it of list) it.f();
      // A thing with something still to find twinkles over its corner.
      for (const [id, t] of Object.entries(spec.things || {})) {
        if (!fresh(t.talk)) continue;
        const o = (world.things || []).find((x) => x.id === id);
        if (!o) continue;
        const gx = ox + o.x * T + (o.w || 1) * T - 3, gy = oy + o.y * T - 7, c = still || Math.floor(S.t * 2) % 2 ? "#FFFFFF" : (P.lamp || "#FFD86B");
        rect(ctx, c, gx + 1, gy, 1, 3); rect(ctx, c, gx, gy + 1, 3, 1);
      }
      // Where you are, in the corner.
      const label = world.name.toUpperCase(), lw = Kit.measure(label);
      rect(ctx, "rgba(0,0,0,.5)", 2, H - 10, lw + 4, 8);
      Kit.text(ctx, label, 4, H - 8, "#F4F1EA");
    }

    hud();
    if (grants.length && grants.every(has)) { S.done = true; S.toldDone = true; }
    explore();
    g.state = { S, people };                           // for tests: where everyone is
    g.loop((dt) => { update(dt); draw(); });
    draw();
    return g;
  }

  const out = { play, core: { DIRS, grid, path, ahead, faceTo, thingAt, open, problems, T, VW, VH }, W, H };
  if (typeof HustleGames !== "undefined") HustleGames.register("walk", out);
  return out;
})();

if (typeof module !== "undefined") module.exports = HustleWalk;
