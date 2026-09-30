"use strict";
/* ── the places you can walk round (walk.js) ──────────────
 * Each is a tile map, a row of letters a row of tiles, in two layers:
 *
 *   ground   . grass   , path   : cobbles   ~ water   = boards   _ floor   s sand   | wall
 *   props    T tree   # fence   * flowers   o rock   b bench   w bush   l lamp   x crate
 *            r reeds   h hedge  (space: nothing)
 *
 * and its things, the bigger pieces (stalls, carts, houses, vans), each with
 * the cells it stands on. A thing's `keeper` is who you talk to across it; a
 * thing's `id` is what a gig's game can give words to (games.js). Who is
 * there, and what they say, is the gig's: the same market has different
 * people in it for different jobs.
 */

const WalkWorlds = (() => {
  /* ── Millbrook Saturday Market ─────────────────────────────
   * A cobbled square in the park, eight till one. Row A along the top, Row C
   * along the bottom; Tori's cart is in Row C, next to the honey man, with a
   * pizza box for a sign. Her rivals are here too: the Broth Bros' neon, and
   * the Souper Star truck.                                                  */
  const millbrook = {
    name: "Millbrook Saturday Market",
    pal: {
      edge: "#5E9A40", grass: "#78B24E", grass2: "#5E9A40",
      path: "#D8B77A", path2: "#C49F62",
      stone: "#CDBFA6", stone2: "#B3A58C", stoneHi: "#E2D6C0",
      water: "#3E7FB8", water2: "#8CC4E8",
      wood: "#7A4E2C", wood2: "#A8703F", counter: "#B07A48", ink: "#2A1C14",
      trunk: "#6B4A2B", leaf: "#3E7A3A", leaf2: "#56994A", leafHi: "#7CBF5E", fruit: "#E8574A",
      fence: "#8A6A48", fence2: "#6B4F33",
      flowerA: "#E8574A", flowerB: "#F2C62C", flowerC: "#F4F1EA",
      rock: "#8A8D91", rockHi: "#B8BBC0", iron: "#3A3A44", lamp: "#FFD86B", glass: "#9AC8E8",
      shadow: "rgba(0,0,0,.18)", awnA: "#D8453A", awnB: "#F4EAD8", plate: "#F4EAD8",
      honey: "#E8A628", cream: "#F6EAD2", bread: "#C9853E", veg: "#E86A2C",
      cart: "#D9482B", soup: "#D9482B", parsley: "#5E8C3A", steam: "#FFFFFF", box: "#D9B88A", boxInk: "#3A2418",
      chalk: "#2E3A2E",
    },
    ground: [
      "..............................",
      "..............................",
      "..............................",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      ",,,::::::::::::::::::::::::...",
      ",,,::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "...::::::::::::::::::::::::...",
      "..............,,..............",
      "..............,,..............",
      "..............,,..............",
      "..............,,..............",
    ],
    props: [
      "                              ",
      " TTTTTTTTTTTTTTTTTTTTTTTTTTTT ",
      "T*  *    *     *   *     *  *T",
      "T                            T",
      "T                            T",
      "T                            T",
      "T  l                    l    T",
      "T                            T",
      "T                         b  T",
      "                          b  T",
      "                             T",
      "T                            T",
      "T                            T",
      "T                            T",
      "T                            T",
      "T  l                    l    T",
      "T *  *  *  *      *  *  *  * T",
      "TTTTTTTTTTTTTT  TTTTTTTTTTTTTT",
      "   *      *           *    *  ",
      "  *    *         *      *     ",
    ],
    things: [
      { id: "bb", kind: "stall", x: 4, y: 3, w: 4, h: 3, awning: ["#1A1A1A", "#39FF14"], goods: "neon", sign: "BB", keeper: "brad" },
      { kind: "stall", x: 10, y: 3, w: 3, h: 3, awning: ["#3E8A3A", "#F4EAD8"], goods: "veg", sign: "VEG", keeper: "veg" },
      { kind: "stall", x: 15, y: 3, w: 3, h: 3, awning: ["#E86A2C", "#F4EAD8"], goods: "bread", sign: "BUNS", keeper: "baker" },
      { kind: "stall", x: 20, y: 3, w: 3, h: 3, awning: ["#E8574A", "#FFFFFF"], goods: "flowers", sign: "BLOOM", keeper: "florist" },
      { id: "honey", kind: "stall", x: 7, y: 11, w: 3, h: 3, awning: ["#E8A628", "#F4EAD8"], goods: "jars", sign: "HONEY", keeper: "honey" },
      { id: "cart", kind: "cart", x: 10, y: 12, w: 2, h: 2, keeper: "tori" },
      { kind: "stall", x: 17, y: 11, w: 3, h: 3, awning: ["#6B8FD8", "#F4EAD8"], goods: "wool", sign: "WOOL", keeper: "knit" },
      { id: "truck", kind: "van", x: 21, y: 12, w: 3, h: 2, body: "#9B3FE0", stripe: "#FFD23F", stripe2: "#FFFFFF",
        name: "The Souper Star truck", say: "A purple truck with a can painted on it. The can has a face. The can is singing." },
      { id: "timetable", kind: "board", x: 1, y: 7, w: 2, h: 2, label: "8-1", name: "The market board",
        say: "MILLBROOK SATURDAY MARKET, in chalk, and a map of the rows." },
      { kind: "post", x: 3, y: 5, label: "A", name: "A sign", say: "Row A." },
      { kind: "post", x: 6, y: 14, label: "C", name: "A sign", say: "Row C." },
    ],
    start: [14, 16, "up"],
  };

  /* ── Thimblewick, dev build 0.14 ────────────────────────────
   * Ines's cosy game, as she sent it: a village square at dusk, cottages
   * with their lamps lit, a well. Mrs. Pell's shop is open, but nobody is
   * behind the counter yet: in her place, a missing sprite. Behind the hedge
   * in the corner, the room the developer left in.                          */
  const thimblewick = {
    name: "Thimblewick 0.14",
    pal: {
      edge: "#3F6636", grass: "#5E8F4E", grass2: "#4A7840",
      path: "#C9A97A", path2: "#B08E62",
      stone: "#B8AFA0", stone2: "#9A9284", stoneHi: "#D2CABC",
      water: "#3E6FA0", water2: "#8FB8DA",
      wood: "#6B4A30", wood2: "#8A6444", counter: "#8A6444", ink: "#22180F",
      trunk: "#5A3E26", leaf: "#2F5E36", leaf2: "#467A44", leafHi: "#6A9E5A", fruit: "#E8C24A",
      fence: "#7A5A3C", fence2: "#5A4028",
      flowerA: "#C8527A", flowerB: "#F2D27A", flowerC: "#B8A8E8",
      rock: "#7A7C84", rockHi: "#A8AAB2", iron: "#2E2A34", lamp: "#FFD27A", glass: "#F2D27A",
      shadow: "rgba(10,0,20,.22)", plate: "#F4EAD8",
      walls: "#E8DCC0", roof: "#B8894A", roof2: "#9A6E36", door: "#6B3F2A",
      floor: "#8A6E52", floor2: "#6E5640", cloth: "#3A4A6E",
    },
    ground: [
      "..........................",
      "..........................",
      "..........................",
      "..........................",
      "..........................",
      "..,,,,,,,,,,,,,,,,,,,,,,..",
      "..,::::::::::::::::::::,..",
      "..,::::::::::::::::::::,..",
      "..,::::::::::::::::::::,..",
      "..,::::::::::::::::::::,..",
      "..,::::::::::::::::::::,..",
      "..,,,,,,,,,,,,,,,,,,,,,,..",
      "............,,.......____.",
      "............,,.......____.",
      "............,,.......____.",
      "............,,............",
      "............,,............",
      "............,,............",
    ],
    props: [
      "                          ",
      " TTTTTTTTTTTTTTTTTTTTTTTT ",
      "T                        T",
      "T                        T",
      "T                        T",
      "T                        T",
      "T  l                  l  T",
      "T                        T",
      "T   b                    T",
      "T                        T",
      "T  l                  l  T",
      "T*  *  *  *     *  *  * *T",
      "T   w  *  *    T    h    h",
      "T  *  T   *     *   h    h",
      "T      *   *   *  *  hhhhh",
      "T  T   *      *   T      T",
      "TTTTTTTTTTTT  TTTTTTTTTTTT",
      "                          ",
    ],
    things: [
      { kind: "house", x: 3, y: 2, w: 5, h: 3, roof: "#B8894A", win: 2 },
      { id: "shop", kind: "house", x: 10, y: 2, w: 6, h: 3, sign: "PELL'S", roof: "#8A4A5A", roof2: "#6E3646", walls: "#F2E6D0", win: 2 },
      { kind: "house", x: 18, y: 2, w: 5, h: 3, roof: "#B8894A", win: 2 },
      { id: "missing", kind: "missing", x: 13, y: 5, w: 1, h: 1, name: "Behind the counter" },
      { id: "well", kind: "well", x: 12, y: 8, w: 2, h: 2, name: "The well", say: "A well. Someone has dropped a thimble in it. Of course they have." },
      { id: "rules", kind: "board", x: 23, y: 12, w: 2, h: 2, label: "ART", face: "#1E2A4A", name: "A notice, pinned up in the dev room" },
      { id: "desk", kind: "table", x: 22, y: 13, w: 1, h: 1, cloth: "#3A4A6E", goods: "laptop", name: "A laptop", say: "A laptop on its second battery. A devlog, half written: \"Devlog 15: somebody behind the counter?\"" },
      { kind: "post", x: 19, y: 11, label: "D", name: "A sign", say: "DEV. Keep out. (Come in.)" },
    ],
    start: [12, 16, "up"],
  };

  /* ── Carvel Reservoir, the north shore, just after dawn ─────
   * Where the Big Duck was seen: a pier, reeds, a road along the shore with
   * the mail van on it. Something the size of a canoe crosses the water now
   * and then, if you are looking.                                           */
  const reservoir = {
    name: "Carvel Reservoir",
    pal: {
      edge: "#5E7A58", grass: "#6E9A5A", grass2: "#5A8448",
      path: "#9A9A94", path2: "#86867E",
      stone: "#A8A69E", stone2: "#8E8C84", stoneHi: "#C4C2BA",
      water: "#4E7294", water2: "#A6C4DC", sand: "#D6C69C", sand2: "#BFAE84",
      wood: "#6E5236", wood2: "#8E6E4C", counter: "#8E6E4C", ink: "#1E1A16",
      trunk: "#5A4630", leaf: "#3E6A44", leaf2: "#568454", leafHi: "#7AA66A",
      fence: "#7A6448", fence2: "#5A4A34",
      flowerA: "#E8C4D8", flowerB: "#F2E0A0", flowerC: "#FFFFFF",
      rock: "#7E828A", rockHi: "#A8ACB4", iron: "#2E3036", lamp: "#FFE6A0", glass: "#B8D4E8",
      shadow: "rgba(10,20,30,.2)", plate: "#F4EAD8",
    },
    ground: [
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~==~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~==~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~==~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~==~~~~~~~~~~~~~~",
      "~~~~~~~~~~~~==~~~~~~~~~~~~~~",
      "sssssssssssss=ssssssssssssss",
      "ssssssssssssssssssssssssssss",
      "............................",
      "............................",
      "............................",
      "............................",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      ",,,,,,,,,,,,,,,,,,,,,,,,,,,,",
      "............................",
      "............................",
    ],
    props: [
      "                            ",
      "                            ",
      "                            ",
      "                            ",
      "                            ",
      "                            ",
      "                            ",
      "                            ",
      "rr  r  rr        r   rr  r r",
      "                            ",
      "T  o      *        *    o  T",
      "T     b         *       *  T",
      "T  *      T   *     T   *  T",
      "  T  *       *    *      T  ",
      "                            ",
      "                            ",
      "T  T  * T  *  T   *  T *  TT",
      "TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    ],
    things: [
      { id: "duck", kind: "duck", x: 5, y: 3, w: 4, h: 1, walk: true, phase: 0.2 },
      { id: "van", kind: "van", x: 20, y: 14, w: 3, h: 2, body: "#E8E4D8", stripe: "#C8252C", stripe2: "#2F6FC0", name: "The mail van",
        say: "A mail van, running. There's a sticker on the back: I BRAKE FOR BIG DUCKS." },
      { id: "notice", kind: "board", x: 3, y: 12, w: 3, h: 2, label: "DUCK?", face: "#F4EAD8", ink: "#FF48B0", name: "A poster on a board",
        say: "SEEN A BIG DUCK? Weird Things wants to hear from you. A phone number, and a drawing of a duck that is mostly beak." },
    ],
    start: [8, 15, "up"],
  };

  return { millbrook, thimblewick, reservoir };
})();

if (typeof module !== "undefined") module.exports = WalkWorlds;
