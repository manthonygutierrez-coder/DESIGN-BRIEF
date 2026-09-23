"use strict";
/* ── what a picture is of ─────────────────────────────────
 * The image search's reading of a query. Pure: a query and a result number
 * go in, a description of one photograph comes out, and pixelscene.js paints
 * it. Kept apart from the painting so the reading can be tested.
 *
 *   subject    the thing the picture is of: the rightmost thing named, so
 *              "bigfoot mug" is a mug and "mallard duck" is a duck
 *   companion  anything else named, printed on the subject if it has room
 *   setting    where it is: named in the query, or somewhere it lives
 *   time       dawn, day, dusk, night, or indoors
 *   looks      treatments the query asks for: blurry, black and white, ...
 *   framing    how this result was shot. Results rotate through framings so
 *              a page of them varies the way a real search does.
 *
 * A query that names no thing and no place is a mood ("boucle fabric",
 * "payment flow diagram") and keeps the older abstract compositions.
 */

const ImagePlan = (() => {
  function seedOf(str){
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
  }

  // kind: animal, food, object, person, plant. where: settings it turns up in.
  // many: it comes in groups. colours: what it usually is, varied by result.
  const THINGS = {
    dove:      { k: ["dove", "doves", "pigeon", "pigeons", "bird", "birds"], kind: "animal", where: ["sky", "field", "stage", "studio"], many: true, colours: ["#F4F1EA"] },
    duck:      { k: ["duck", "ducks", "mallard", "mallards"], kind: "animal", where: ["water", "water", "field"], many: true, colours: ["mallard"] },
    rabbit:    { k: ["rabbit", "rabbits", "bunny", "hare"], kind: "animal", where: ["field", "stage", "studio"], colours: ["#F4F1EA", "#9A8068", "#6E6660"] },
    cat:       { k: ["cat", "cats", "kitten", "shop cat"], kind: "animal", where: ["shop", "table", "field"], colours: ["#E08A3C", "#3A3434", "#9A9A9E"] },
    dog:       { k: ["dog", "dogs", "puppy"], kind: "animal", where: ["field", "street"], colours: ["#B07A44", "#3A3434", "#E8DCC4"] },
    fish:      { k: ["fish", "trout", "carp"], kind: "animal", where: ["water", "table"], many: true, colours: ["#8FA6A0"] },
    bigfoot:   { k: ["bigfoot", "sasquatch", "squatch", "cryptid", "yeti", "cryptids"], kind: "animal", where: ["forest", "forest", "water"], colours: ["#5A3E2A"] },
    rooster:   { k: ["rooster", "hen", "chicken"], kind: "animal", where: ["field", "studio"], colours: ["#F2EDE4"] },

    burrito:   { k: ["burrito", "burritos", "wrap"], kind: "food", where: ["table", "studio"], colours: ["#E8C98E"] },
    burger:    { k: ["burger", "burgers", "cheeseburger", "hamburger"], kind: "food", where: ["table", "studio"], colours: ["#C98A42"] },
    fries:     { k: ["fries", "french fries"], kind: "food", where: ["table", "studio"], colours: ["#C8252C"] },
    shake:     { k: ["milkshake", "shake", "milkshakes"], kind: "food", where: ["diner", "table", "studio"], colours: ["#F4D0DC", "#8A5A3C", "#F4EEDC"] },
    biscuit:   { k: ["biscuit", "biscuits", "sandwich"], kind: "food", where: ["table", "studio"], colours: ["#D9A25A"] },
    bucket:    { k: ["bucket", "fried chicken bucket"], kind: "food", where: ["table", "studio"], colours: ["#C8252C"] },
    plate:     { k: ["plate", "plates", "breakfast plate", "eggs"], kind: "food", where: ["table", "diner"], many: true, colours: ["#F4F1EA"] },
    cup:       { k: ["mug", "mugs", "cup", "cups", "coffee", "tea", "latte"], kind: "object", where: ["table", "diner", "studio"], many: true, colours: ["#F4F1EA", "#C2562B", "#3E6E9A", "#2E2A28"] },
    cheese:    { k: ["cheese", "cheese board"], kind: "food", where: ["table"], colours: ["#F2C94C"] },
    cake:      { k: ["cake", "cakes", "birthday cake", "cupcake"], kind: "food", where: ["table", "party"], colours: ["#F4C7D8", "#F4F1EA"] },

    crown:     { k: ["crown", "crowns", "tiara"], kind: "object", where: ["studio", "stage", "table"], colours: ["#D9A62A"] },
    tophat:    { k: ["top hat", "top hats", "hat", "hats"], kind: "object", where: ["stage", "studio", "table"], colours: ["#1C1C1E"] },
    cards:     { k: ["playing cards", "cards", "card trick", "deck"], kind: "object", where: ["table", "stage"], colours: ["#F4F1EA"] },
    baton:     { k: ["baton", "batons", "relay baton"], kind: "object", where: ["track", "studio"], colours: ["#7EC8F0", "#C8252C", "#C0C4C8"] },
    band:      { k: ["sweatband", "headband", "wristband", "sweatbands"], kind: "object", where: ["studio", "table", "track"], colours: ["#F07A1C", "#F4F1EA"] },
    jacket:    { k: ["jacket", "track jacket", "hoodie", "jackets"], kind: "object", where: ["studio", "shop"], colours: ["#1B2A4A", "#C8252C", "#3E8A3A"] },
    sweater:   { k: ["cardigan", "sweater", "jumper", "knit", "knitted"], kind: "object", where: ["studio", "shop", "table"], colours: ["#4E7A3A", "#C2562B", "#E8DCC4"] },
    tape:      { k: ["tape measure", "measuring tape"], kind: "object", where: ["table", "studio", "shop"], colours: ["#F2C62C"] },
    kiln:      { k: ["kiln", "kilns", "furnace"], kind: "object", where: ["studio", "shop"], colours: ["#8A4A2E"] },
    vase:      { k: ["vase", "vases", "pottery", "pot", "pots", "bowl", "bowls", "ceramics", "jug"], kind: "object", where: ["table", "studio", "shop"], many: true, colours: ["#C2562B", "#E8DCC4", "#5E7E8E", "#F4C7D8"] },
    sign:      { k: ["sign", "signs", "marquee", "billboard"], kind: "object", where: ["street", "street", "drive"], colours: ["#C8252C", "#2E9A96"] },
    balloon:   { k: ["balloon", "balloons", "balloon animal", "balloon animals", "balloon dog"], kind: "object", where: ["party", "studio"], many: true, colours: ["#E23A5A", "#2F6FC0", "#F2C62C", "#3E8A3A"] },
    pin:       { k: ["bowling pin", "bowling pins", "bowling ball", "pins"], kind: "object", where: ["lanes", "studio"], many: true, colours: ["#F4F1EA"] },
    mic:       { k: ["microphone", "mic", "microphones"], kind: "object", where: ["stage", "studio"], colours: ["#C0C4C8"] },
    freshener: { k: ["air freshener", "air fresheners"], kind: "object", where: ["studio", "street"], colours: ["#3E8A3A"] },
    tshirt:    { k: ["shirt", "t-shirt", "tshirt", "tee", "shirts", "tees"], kind: "object", where: ["studio", "shop"], colours: ["#F4F1EA", "#3E8A3A", "#1C1C1E"] },
    star:      { k: ["star", "stars"], kind: "object", where: ["sky", "studio"], colours: ["#F2C62C"] },
    moon:      { k: ["moon", "lantern", "paper moon", "moons"], kind: "object", where: ["sky", "track"], colours: ["#F4E6B8"] },
    boat:      { k: ["canoe", "boat", "boats", "rowboat", "kayak"], kind: "object", where: ["water"], colours: ["#C2562B", "#2E9A96", "#E8DCC4"] },
    log:       { k: ["log", "logs", "driftwood"], kind: "object", where: ["water", "forest"], colours: ["#6A4A30"] },
    spool:     { k: ["thread", "spool", "spools", "embroidery", "yarn"], kind: "object", where: ["table", "shop", "studio"], many: true, colours: ["#D9A62A", "#C8252C", "#3E6E9A"] },
    ink:       { k: ["ink", "paint", "inks"], kind: "object", where: ["table", "studio"], colours: ["#FF48B0", "#2F6FC0"] },
    book:      { k: ["book", "books", "zine", "zines"], kind: "object", where: ["table", "shop"], many: true, colours: ["#C8252C", "#2F6FC0", "#3E8A3A"] },

    person:    { k: ["person", "people", "man", "woman", "fan", "fans", "customer"], kind: "person", where: ["street", "field", "shop"], many: true },
    runner:    { k: ["runner", "runners", "athlete", "sprinter", "relay runner"], kind: "person", where: ["track"], many: true },
    team:      { k: ["team", "crowd", "audience", "team photo", "relay team"], kind: "person", where: ["track", "stage"], group: true },
    magician:  { k: ["magician", "magicians", "conjurer", "illusionist"], kind: "person", where: ["stage", "stage", "party", "street"] },
    fisherman: { k: ["fisherman", "fishermen", "angler"], kind: "person", where: ["water"] },

    tree:      { k: ["tree", "trees", "pine", "pines", "oak"], kind: "plant", where: ["field", "forest"], many: true, colours: ["#3E6E3A"] },
    plant:     { k: ["plant", "plants", "fern", "ferns", "houseplant", "seedling"], kind: "plant", where: ["table", "shop", "studio"], colours: ["#4E8A3A"] },
    flower:    { k: ["flower", "flowers", "rose", "roses", "daisy", "tulip"], kind: "plant", where: ["field", "table", "studio"], many: true, colours: ["#E23A5A", "#F2C62C", "#F4F1EA"] },
    mushroom:  { k: ["mushroom", "mushrooms", "toadstool"], kind: "plant", where: ["forest", "field"], many: true, colours: ["#C8252C", "#C9A06A"] },
  };

  // Places. `outdoor` settings have a sky, and so a time of day.
  const SETTINGS = {
    water:  { k: ["reservoir", "lake", "pond", "river", "sea", "harbour", "harbor", "beach", "shore", "water", "floating"], outdoor: true },
    track:  { k: ["running track", "track", "stadium", "relay", "race", "finish line"], outdoor: true },
    stage:  { k: ["stage", "theatre", "theater", "curtain", "velvet curtain", "backstage", "spotlight", "magic show"] },
    lanes:  { k: ["bowling alley", "bowling", "lanes"] },
    drive:  { k: ["drive thru", "drive through", "fast food", "drive in"], outdoor: true },
    diner:  { k: ["diner", "cafe", "coffee shop", "booth", "counter"] },
    shop:   { k: ["shop", "store", "market", "stall", "market stall", "tailor shop", "sewing shop", "boutique", "shop counter"] },
    street: { k: ["street", "city", "vegas", "strip", "alley", "downtown", "motel", "street magic"], outdoor: true },
    sky:    { k: ["sky", "clouds", "flying", "flock", "in flight"], outdoor: true },
    field:  { k: ["field", "park", "meadow", "grass", "garden", "farm", "lawn"], outdoor: true },
    forest: { k: ["forest", "woods", "woodland"], outdoor: true },
    studio: { k: ["studio", "product", "isolated", "white background", "studio shot"] },
    table:  { k: ["table", "kitchen", "tabletop", "breakfast", "dinner"] },
    party:  { k: ["party", "birthday", "kids party"] },
  };

  const TIMES = {
    dawn:  ["dawn", "sunrise", "morning", "daybreak"],
    day:   ["day", "noon", "afternoon", "sunny", "daylight"],
    dusk:  ["dusk", "sunset", "evening", "golden hour", "twilight"],
    night: ["night", "midnight", "3am", "neon", "after dark"],
  };

  const LOOKS = {
    blurry:  ["blurry", "blur", "blurred", "out of focus", "fuzzy", "grainy"],
    mono:    ["black and white", "monochrome", "b&w", "bw", "greyscale", "grayscale"],
    vintage: ["vintage", "retro", "old", "antique", "polaroid", "1950s", "1960s", "1970s", "70s", "classic"],
    cartoon: ["cartoon", "illustration", "clipart", "clip art", "icon", "mascot"],
    close:   ["close up", "closeup", "close-up", "macro", "detail"],
    top:     ["top down", "overhead", "flat lay", "flatlay", "aerial"],
    neon:    ["neon"],
    pastel:  ["pastel", "pastels"],
    snow:    ["snow", "snowy", "winter", "frozen", "icy"],
  };

  // Phrases where a word means something else: a ship's log is a book, and
  // sign language has no sign in it.
  const BLOCK = [
    ["sign language", "sign"], ["ship log", "log"], ["log book", "log"], ["tide table", "table"],
    ["illustration plate", "plate"], ["monolith field", "field"],
  ];
  const blocked = (s) => new Set(BLOCK.filter(([ph]) => hit(s, ph)).map(([, id]) => id));

  const COLOURS = {
    "fluorescent pink": "#FF48B0", "hot pink": "#FF48B0", "sky blue": "#7EC8F0",
    white: "#F4F1EA", black: "#1C1C1E", grey: "#8A8D91", gray: "#8A8D91", silver: "#C0C4C8",
    red: "#C8252C", orange: "#F07A1C", yellow: "#F2C62C", gold: "#D9A62A", golden: "#D9A62A",
    green: "#3E8A3A", teal: "#2E9A96", blue: "#2F6FC0", navy: "#1B2A4A", purple: "#6B3FA0",
    pink: "#F06AA8", brown: "#7A4A28", terracotta: "#C2562B", cream: "#F2E6C8", tan: "#C9A06A",
  };

  // Settings the framing can move a subject into without being asked.
  const STUDIO_KINDS = new Set(["food", "object"]);
  // Things that lie flat enough to shoot from above.
  const FLAT = new Set(["burrito", "burger", "fries", "biscuit", "plate", "cheese", "cake", "cards", "band",
                        "jacket", "sweater", "tshirt", "tape", "spool", "book", "ink", "cup"]);
  // Things that look like themselves after dark.
  const NIGHT = { sign: ["night", "dusk", "night"], moon: ["night", "dusk"], star: ["night"] };

  /* The query as padded words, so matching is whole-word or whole-phrase. */
  const words = (q) => " " + String(q || "").toLowerCase().replace(/&/g, " & ").replace(/[^a-z0-9&-]+/g, " ").replace(/-/g, " ").trim() + " ";
  const hit = (s, k) => s.includes(" " + k.replace(/-/g, " ") + " ");

  // Where in the query a keyword ends, or -1. Used to find the head noun.
  function endOf(s, k){
    const at = s.lastIndexOf(" " + k.replace(/-/g, " ") + " ");
    return at < 0 ? -1 : at + k.length + 1;
  }

  function scored(s, table){
    let best = null, bestScore = 0;
    for (const [id, v] of Object.entries(table)){
      const keys = Array.isArray(v) ? v : v.k;
      let score = 0;
      for (const k of keys) if (hit(s, k)) score += k.length * (k.includes(" ") ? 2 : 1);
      if (score > bestScore){ bestScore = score; best = id; }
    }
    return best;
  }

  /* Every thing named, rightmost first. A phrase ("tape measure") beats the
   * words inside it, and a place word is never also a thing. */
  function thingsIn(s){
    const found = [];
    for (const [id, t] of Object.entries(THINGS)){
      let end = -1;
      for (const k of t.k) end = Math.max(end, endOf(s, k));
      if (end >= 0) found.push({ id, end });
    }
    found.sort((a, b) => b.end - a.end);
    return found.map((f) => f.id);
  }

  function colourIn(s){
    let best = null, len = 0;
    for (const [k, hex] of Object.entries(COLOURS)) if (hit(s, k) && k.length > len){ best = hex; len = k.length; }
    return best;
  }

  const plural = (s, id) => THINGS[id].k.some((k) => /s$/.test(k) && !/ss$/.test(k) && hit(s, k));

  const FRAMINGS = ["hero", "context", "product", "close", "group", "hero", "wide", "top", "context"];

  function plan(query, index = 0){
    const s = words(query);
    const i = Math.abs(index | 0);
    const seed = seedOf(String(query).toLowerCase() + "::" + i);
    const no = blocked(s);
    const named = thingsIn(s).filter((id) => !no.has(id));
    // The subject's own name is not a place: a track jacket is not on a track.
    let rest = s;
    if (named[0]) for (const k of THINGS[named[0]].k.slice().sort((x, y) => y.length - x.length)) rest = rest.split(" " + k.replace(/-/g, " ") + " ").join("  ");
    let setting = scored(rest, SETTINGS);
    if (no.has(setting)) setting = null;
    const time = scored(s, TIMES);
    const looks = Object.keys(LOOKS).filter((l) => LOOKS[l].some((k) => hit(s, k)));
    const out = { query: String(query), index: i, seed, subject: null, companion: null, count: 1,
                  colour: colourIn(s), setting: null, time: null, looks, framing: "wide",
                  flip: ((seed >>> 3) & 1) === 1, legacy: false };

    // A backdrop on its own is not a subject: "sofa studio shot" stays a mood.
    if (!named.length && (!setting || setting === "studio" || setting === "table")){ out.legacy = true; return out; }

    const subject = named[0] || null;
    const t = subject && THINGS[subject];
    out.subject = subject;
    out.companion = named.find((id) => id !== subject && THINGS[id].kind !== "person") || null;

    // Which framing this result is. A search for a place is all views of it.
    let framing = subject ? FRAMINGS[(seedOf(s) + i) % FRAMINGS.length] : (i % 3 === 2 ? "context" : "wide");
    if (subject && looks.includes("close") && i % 3 !== 2) framing = "close";
    if (subject && looks.includes("top") && i % 3 !== 2) framing = "top";
    if (framing === "group" && !(t.many || t.group)) framing = "hero";
    if (framing === "top" && !FLAT.has(subject)) framing = "context";
    if (framing === "product" && t && !STUDIO_KINDS.has(t.kind)) framing = "hero";
    // Every ninth result is the kind of near miss a real search returns: the
    // place with nothing in it.
    if (subject && i % 9 === 8) { framing = "wide"; out.subject = null; out.companion = null; }
    out.framing = framing;

    const home = t ? t.where[(seedOf(s + "|w") + i) % t.where.length] : null;
    out.setting = framing === "product" && !setting ? "studio"
      : framing === "top" ? "table"
      : setting || home || "studio";
    if (!out.subject && !setting) out.setting = home || "field";

    out.count = !out.subject ? 0
      : t.group ? 5 + (seed % 3)
      : framing === "group" ? 3 + (seed % 3)
      : plural(s, subject) && framing !== "close" ? 2 + (seed % 3)
      : 1;

    const outdoor = SETTINGS[out.setting] && SETTINGS[out.setting].outdoor;
    const nights = NIGHT[out.subject];
    out.time = time || (looks.includes("neon") ? "night"
      : nights && outdoor ? nights[i % nights.length]
      : outdoor ? ["day", "day", "dusk", "dawn", "day"][i % 5] : "indoor");
    if (!outdoor && out.time !== "night") out.time = time && SETTINGS[out.setting] ? time : "indoor";
    return out;
  }

  // A thing's colour for this result: the one asked for, or one of its own.
  function colourOf(p){
    if (p.colour) return p.colour;
    const t = THINGS[p.subject];
    if (!t || !t.colours) return null;
    return t.colours[(p.seed >>> 5) % t.colours.length];
  }

  return { plan, colourOf, THINGS, SETTINGS, TIMES, LOOKS, COLOURS, seedOf, words };
})();

if (typeof module !== "undefined") module.exports = ImagePlan;
