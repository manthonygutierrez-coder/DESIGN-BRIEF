"use strict";
/* ── your camera ──────────────────────────────────────────
 * Clients see you on every call, so before the first one you build yourself
 * and dress the room behind you: the same 24 × 30 person and the same props
 * with depth that every client is drawn with, from a much bigger wardrobe.
 * Then your own camera talks you through getting set up, and after that it
 * sits in the corner of every call.
 *
 * Saved in the Hustle slot as `me`:
 *   look      the person: portraits.js traits, every one pinned
 *   palette   the room's colours, by name
 *   pattern   what the wall is covered in
 *   framing   against the wall, or back in the room
 *   room      props, the same shape clients' rooms are
 *   name      what you are called on here
 *   guide     how far through setup you are; "done" once finished
 */

const Camera = (() => {
  /* ── the wardrobe ───────────────────────────────────────
   * `face` rows are shown as heads, `bust` rows as head and shoulders, so you
   * pick what a thing looks like on you rather than a name in a list. */
  const SKIN = ["#FBE3D0", "#F7DCC2", "#F2C9A8", "#E8B894", "#E0A87C", "#D29A6A", "#C98B5F",
                "#B57A4E", "#A56A44", "#8A5638", "#7C4B2E", "#5A3520", "#46291A", "#2E1A10"];
  const HAIR = ["#1B1512", "#2B211A", "#3A2A1E", "#5A2E2E", "#6B4A2B", "#A8752F", "#C0561F", "#D9C08A",
                "#8E8E93", "#E4E4E8", "#E85A9A", "#4A7ADA", "#5AB06A", "#8A5AC8"];
  const CLOTH = ["#2F6FC0", "#1B2A4A", "#C8252C", "#F07A1C", "#F2C62C", "#3E8A3A", "#2E9A96",
                 "#6B3FA0", "#E86A9A", "#F4F1EA", "#8A8D91", "#2A2A2E", "#7A4A28", "#C9A06A"];
  const ACCENT = ["#F4F1EA", "#1C1C1E", "#C8252C", "#F2C62C", "#2F6FC0", "#3E8A3A", "#E86A9A", "#6B3FA0", "#3A5A8A", "#D9A62A"];

  const NAMES = {
    crop: "Crop", shortback: "Short back", bob: "Bob", long: "Long", ponytail: "Ponytail", bun: "Bun",
    curls: "Curls", braids: "Braids", bald: "Bald", cap: "Cap", beanie: "Beanie", headscarf: "Headscarf",
    afro: "Afro", puffs: "Puffs", locs: "Locs", buzz: "Buzz cut", mohawk: "Mohawk", sidepart: "Side part",
    pigtails: "Pigtails", fringe: "Fringe", undercut: "Undercut", cornrows: "Cornrows", hijab: "Hijab", turban: "Turban",
    none: "None", stubble: "Stubble", moustache: "Moustache", goatee: "Goatee", beard: "Beard", sideburns: "Sideburns",
    round: "Round", square: "Square", cateye: "Cat-eye", shades: "Shades",
    freckles: "Freckles", mole: "Beauty mark", blush: "Blush", studs: "Studs", hoops: "Hoops", hearingaid: "Hearing aid",
    tee: "Tee", hoodie: "Hoodie", turtleneck: "Turtleneck", shirt: "Shirt", stripes: "Stripes", sweater: "Knit",
    jacket: "Jacket", cardigan: "Cardigan", overalls: "Overalls", plain: "Plain top",
    scarf: "Scarf", lanyard: "Lanyard", bowtie: "Bow tie", tie: "Tie", necklace: "Necklace", headphones: "Headphones",
    narrow: "Narrow", regular: "Regular", broad: "Broad", young: "Younger", mid: "Middle", older: "Older",
  };
  const COVERS = ["cap", "beanie", "headscarf", "hijab", "turban", "pigtails"];

  const YOU = [
    { key: "skin", label: "Skin", kind: "swatch", values: SKIN },
    { key: "style", label: "Hair", kind: "face", values: ["crop", "shortback", "buzz", "sidepart", "undercut", "mohawk", "curls", "afro", "puffs",
      "locs", "braids", "cornrows", "bob", "fringe", "long", "ponytail", "pigtails", "bun", "bald", "cap", "beanie", "headscarf", "hijab", "turban"] },
    { key: "hair", label: "Hair colour", kind: "swatch", values: HAIR },
    { key: "hat", label: "Hat, wrap or ties", kind: "swatch", values: CLOTH, when: (l) => COVERS.includes(l.style) },
    { key: "facial", label: "Facial hair", kind: "face", values: ["none", "stubble", "moustache", "goatee", "beard", "sideburns"] },
    { key: "specs", label: "Glasses", kind: "face", values: ["none", "round", "square", "cateye", "shades"] },
    { key: "marks", label: "Face", kind: "face", values: ["none", "freckles", "mole", "blush"] },
    { key: "ears", label: "Ears", kind: "face", values: ["none", "studs", "hoops", "hearingaid"] },
    { key: "top", label: "Top", kind: "bust", values: ["tee", "hoodie", "turtleneck", "shirt", "stripes", "sweater", "jacket", "cardigan", "overalls"] },
    { key: "garment", label: "Top colour", kind: "swatch", values: CLOTH },
    { key: "extra", label: "Around your neck", kind: "bust", values: ["none", "scarf", "lanyard", "bowtie", "tie", "necklace", "headphones"] },
    { key: "accent", label: "Second colour", kind: "swatch", values: ACCENT, when: (l) => ["jacket", "cardigan", "overalls"].includes(l.top) || ["bowtie", "tie", "necklace", "headphones"].includes(l.extra) || l.style === "pigtails" },
    { key: "build", label: "Build", kind: "word", values: ["narrow", "regular", "broad"] },
    // Only the ages the painter draws differently; a choice that changes nothing is not a choice.
    { key: "age", label: "Age", kind: "word", values: ["young", "older"] },
  ];

  /* ── the room ───────────────────────────────────────── */
  // A room's colours, in the shape portraits.js paints rooms with.
  const PALETTES = {
    cosy:     { name: "Cosy",       bg: "#E8D6BC", panel: "#F2E4CE", ink: "#3A2A1E", dim: "#8A7460", line: "#C9B08E", brand: "#C2562B", brand2: "#3E6B34" },
    dorm:     { name: "Dorm",       bg: "#C9D4E0", panel: "#DCE4EC", ink: "#1E2A36", dim: "#6E7E8E", line: "#9AAABA", brand: "#2F6FC0", brand2: "#E23A5A" },
    loft:     { name: "Loft",       bg: "#D8D2C8", panel: "#E6E2DA", ink: "#2A2A2E", dim: "#7A7A80", line: "#B0AAA0", brand: "#2A2A2E", brand2: "#F2C62C" },
    nightowl: { name: "Night owl",  bg: "#1A1830", panel: "#26223E", ink: "#E8E4FF", dim: "#8A84B0", line: "#3A3458", brand: "#FF4FA3", brand2: "#3FE8FF" },
    garden:   { name: "Greenhouse", bg: "#CFE0C4", panel: "#E0ECD6", ink: "#1E2E18", dim: "#6A8060", line: "#9AB88A", brand: "#3E8A3A", brand2: "#F2C94C" },
    retro:    { name: "Retro",      bg: "#E8C88A", panel: "#F2DCA8", ink: "#3A2412", dim: "#8A6A48", line: "#C9A064", brand: "#E86A1C", brand2: "#2E9A96" },
    blush:    { name: "Blush",      bg: "#F2D2D6", panel: "#F8E4E6", ink: "#3A2228", dim: "#8E6B74", line: "#D8AEB4", brand: "#C84A6A", brand2: "#6B3FA0" },
    ocean:    { name: "Deep sea",   bg: "#1E3A4A", panel: "#28485A", ink: "#DDEEF4", dim: "#7AA0B0", line: "#3A6070", brand: "#3FB8AF", brand2: "#F2C62C" },
  };
  const PATTERN_NAMES = { plain: "Plain", stripes: "Stripes", dots: "Dots", panel: "Wood panel", brick: "Brick", tiles: "Tiles", check: "Check" };

  // What you can put in your room, and where it goes when you add it: on the
  // wall, standing in the room, or on the desk right in front of you.
  const PIECES = {
    poster:    { name: "Poster",       w: 0.2, h: 0.34, at: "wall" },   frame:    { name: "Framed print", w: 0.18, h: 0.22, at: "wall" },
    pennant:   { name: "Pennant",      w: 0.2, h: 0.12, at: "wall" },   calendar: { name: "Calendar",     w: 0.12, h: 0.18, at: "wall" },
    clock:     { name: "Clock",        w: 0.1, h: 0.14, at: "wall" },   mirror:   { name: "Mirror",       w: 0.14, h: 0.24, at: "wall" },
    lights:    { name: "Fairy lights", w: 0.9, h: 0.08, at: "top" },    window:   { name: "Window",       w: 0.24, h: 0.34, at: "wall" },
    neon:      { name: "Neon sign",    w: 0.22, h: 0.14, at: "wall" },  corkboard:{ name: "Corkboard",    w: 0.24, h: 0.3, at: "wall" },
    guitar:    { name: "Guitar",       w: 0.14, h: 0.5, at: "room" },   bookcase: { name: "Bookcase",     w: 0.24, h: 0.62, at: "room" },
    shelf:     { name: "Shelf",        w: 0.3, h: 0.24, at: "wall" },   cabinet:  { name: "Drawers",      w: 0.24, h: 0.44, at: "room" },
    door:      { name: "Door",         w: 0.22, h: 0.72, at: "room" },  crt:      { name: "Old TV",       w: 0.2, h: 0.24, at: "room" },
    fishtank:  { name: "Fish tank",    w: 0.24, h: 0.2, at: "room" },   record:   { name: "Record player",w: 0.22, h: 0.2, at: "room" },
    trophy:    { name: "Trophy",       w: 0.1, h: 0.16, at: "room" },   cat:      { name: "Cat",          w: 0.16, h: 0.2, at: "room" },
    plant:     { name: "Plant",        w: 0.18, h: 0.3, at: "room" },   hanging:  { name: "Hanging plant",w: 0.16, h: 0.4, at: "top" },
    monitor:   { name: "Monitor",      w: 0.2, h: 0.28, at: "room" },   lamp:     { name: "Desk lamp",    w: 0.2, h: 0.34, at: "desk" },
    plantbig:  { name: "Big plant",    w: 0.22, h: 0.62, at: "desk" },  mug:      { name: "Mug",          w: 0.16, h: 0.2, at: "desk" },
    cactus:    { name: "Cactus",       w: 0.12, h: 0.24, at: "desk" },
  };

  // Where a new piece lands: away from where you sit, and a little different
  // each time so a second poster does not stack on the first.
  const SPOTS = {
    wall: [[0.03, 0.08], [0.76, 0.08], [0.05, 0.36], [0.74, 0.34]],
    top:  [[0.05, 0.0], [0.72, 0.0]],
    room: [[0.02, 0.3], [0.74, 0.28], [0.8, 0.4]],
    desk: [[0.0, 0.62], [0.8, 0.66], [0.06, 0.7]],
  };
  const DESK_Z = { desk: 0.86 };

  function placeFor(p, room){
    const piece = PIECES[p], spots = SPOTS[piece.at] || SPOTS.wall;
    const used = room.filter((it) => PIECES[it.p] && PIECES[it.p].at === piece.at).length;
    const [x, y] = spots[used % spots.length];
    const item = { p, x: r3(x + (used >= spots.length ? 0.04 : 0)), y: r3(y), w: piece.w, h: piece.h };
    if (DESK_Z[piece.at]) item.z = DESK_Z[piece.at];
    if (piece.at === "top") item.x = r3(piece.w > 0.5 ? 0.05 : x);
    return item;
  }
  const r3 = (n) => Math.round(n * 1000) / 1000;

  /* ── you, rolled ────────────────────────────────────── */
  function roll(rnd, only){
    const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
    const look = {};
    for (const row of YOU) look[row.key] = pick(row.values);
    // The rare pieces stay rare in a roll, so most people are not in costume.
    if (rnd() > 0.35) look.facial = "none";
    if (rnd() > 0.3) look.specs = "none";
    if (rnd() > 0.5) look.marks = "none";
    if (rnd() > 0.5) look.ears = "none";
    if (rnd() > 0.45) look.extra = "none";
    if (rnd() > 0.2 && look.hair !== "#E4E4E8") look.hair = pick(HAIR.slice(0, 8));
    look.line = null;                          // brows follow your hair, not a brand
    return only ? Object.fromEntries(only.map((k) => [k, look[k]])) : look;
  }

  function rollRoom(rnd){
    const names = Object.keys(PALETTES), pats = Object.keys(PATTERN_NAMES);
    const room = [];
    const pool = ["poster", "frame", "shelf", "bookcase", "plant", "lights", "clock", "guitar", "window", "calendar", "crt", "cat", "pennant", "record"];
    const n = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++){
      const p = pool[Math.floor(rnd() * pool.length)];
      if (!room.some((it) => it.p === p)) room.push(placeFor(p, room));
    }
    const desk = ["mug", "cactus", "lamp", "plantbig"][Math.floor(rnd() * 4)];
    if (rnd() > 0.35) room.push(placeFor(desk, room));
    return { palette: names[Math.floor(rnd() * names.length)], pattern: pats[Math.floor(rnd() * pats.length)], framing: rnd() > 0.5 ? "against" : "receded", room };
  }

  function rngFrom(seed){
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A fresh you, different for every save slot.
  function fresh(seed){
    const r = rngFrom(seed >>> 0);
    return Object.assign({ look: roll(r), name: "", guide: 0 }, rollRoom(r));
  }

  // Whatever was saved, made safe: unknown pieces fall back rather than break.
  function normalize(me, seed){
    const base = fresh(seed || 1);
    if (!me || typeof me !== "object") return base;
    const look = Object.assign({}, base.look);
    for (const row of YOU) if (me.look && row.values.includes(me.look[row.key])) look[row.key] = me.look[row.key];
    look.line = null;
    const room = Array.isArray(me.room) ? me.room.filter((it) => it && PIECES[it.p] && [it.x, it.y, it.w, it.h].every(Number.isFinite)).slice(0, 24) : base.room;
    return {
      look, room,
      palette: PALETTES[me.palette] ? me.palette : base.palette,
      pattern: PATTERN_NAMES[me.pattern] ? me.pattern : base.pattern,
      framing: me.framing === "receded" ? "receded" : "against",
      name: typeof me.name === "string" ? me.name.slice(0, 24) : "",
      built: !!me.built,
      guide: me.guide === "done" ? "done" : Math.max(0, Math.min(20, me.guide | 0)),
    };
  }

  // The room's colours as portraits.js wants them.
  function themeOf(me){
    const p = PALETTES[me.palette] || PALETTES.cosy;
    const n = parseInt(p.bg.slice(1), 16);
    const lum = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    return Object.assign({}, p, { dark: lum < 0.5 });
  }

  const visibleRows = (look) => YOU.filter((row) => !row.when || row.when(look));

  // The windows are in camview.js, which adds itself to this object.
  return { YOU, NAMES, PALETTES, PATTERN_NAMES, PIECES, placeFor, roll, rollRoom, fresh, normalize, themeOf, visibleRows, rngFrom };
})();

if (typeof module !== "undefined") module.exports = Camera;
