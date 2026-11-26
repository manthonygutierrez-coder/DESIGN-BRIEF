"use strict";
/* ── capsule creatures ─────────────────────────────────────
 * The prompts that come out of the gachapon machine in your room. Each capsule
 * holds one of the little sleeping toys and a folded slip describing a creature
 * nobody has drawn yet. Pure: a seed goes in, and out come
 *
 *   make(seed)       the creature itself: a spec of every part it has
 *   describe(spec)   the words on the slip, written the way a field guide
 *                    describes a creature's body: posture, covering, head,
 *                    eyes, ears, mouth, limbs, back and tail, in that order
 *   sprite(spec)     the reference picture, at true resolution (48 × 48), that
 *                    a drawing is compared with once it is done
 *   compare(...)     how close a drawing came: its silhouette, and its colours
 *
 * The words and the picture are both read off the same spec, so the slip never
 * mentions a part the reference does not have, or the other way round. Every
 * part is one the reference can show from the front: a stripe "across its
 * back" would be in the words and nowhere in the picture, so markings sit on
 * the face, the chest, the shoulders or the tail. No DOM, no canvas.
 */

const Capsules = (() => {
  /* ── seeded randomness ─────────────────────────────────── */
  function rng(seed) {
    // scramble first: neighbouring seeds (1, 2, 3...) must not start out alike
    let a = seed >>> 0;
    a = Math.imul(a ^ (a >>> 16), 0x85ebca6b); a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35); a = (a ^ (a >>> 16)) >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (list) => list[Math.floor(next() * list.length)],
      chance: (p) => next() < p,
    };
  }

  /* ── colours, by the names the slip uses ──────────────── */
  const COLOURS = {
    vermilion: "#E2483D", tangerine: "#F08A2B", crimson: "#B8293A", rust: "#B5532A",
    saffron: "#F4B829", gold: "#E3B23C", cream: "#F5E6C4",
    cerulean: "#3E86D9", teal: "#2B9C9C", navy: "#2B3F7A", seafoam: "#7FD3B8", coral: "#F28A7A", "pale aqua": "#BFEFEA",
    fern: "#4F9E44", moss: "#6B8A3A", lime: "#9BD452", olive: "#7C7A35", "blossom pink": "#F3A6BB", goldenrod: "#D8A23A",
    canary: "#F6D743", lemon: "#EFE46A", amber: "#E89A2C", charcoal: "#3A3632", cobalt: "#2E4FA8",
    slate: "#6E7A86", sandstone: "#C9A27A", granite: "#8E8A86", umber: "#7A5236", copper: "#C46B3C", ivory: "#F4EEDC",
    "ice blue": "#A9DCF2", periwinkle: "#8C9BE0", "snow white": "#EEF3F8", silver: "#C3CBD3", "pale cyan": "#CFF4F7",
    violet: "#8C5BD1", plum: "#7A3F6E", indigo: "#45348C", lilac: "#C7A8E8", "bone white": "#EEE7D8", magenta: "#D14FA0",
    "sky blue": "#8EC8F0", mint: "#9FE0C0", white: "#FFFFFF", "pale yellow": "#F7EFA8", peach: "#F6C9A4", "light grey": "#D6D6D6",
    ruby: "#C8283C", emerald: "#2FA05A", sapphire: "#2F5FC8", black: "#1E1A22",
  };
  const BELLIES = ["cream", "ivory", "pale yellow", "peach", "white", "light grey"];
  const EYES = ["black", "amber", "ruby", "emerald", "sapphire", "gold", "violet"];

  /* ── elements: colours, coverings, what grows on the head and the tail ── */
  const TYPES = {
    ember: { word: "Cinder", mains: ["vermilion", "tangerine", "crimson", "rust"], accents: ["saffron", "gold", "cream"],
      beasts: ["lizard", "fox", "pup", "salamander", "imp"], crowns: ["flame", "horn", "horns", null], tips: ["flame"], roots: ["Cin", "Pyr", "Scor", "Blaz", "Emb", "Ash", "Fla"] },
    tide: { word: "Tide", mains: ["cerulean", "teal", "navy", "seafoam"], accents: ["white", "coral", "pale aqua"],
      beasts: ["otter", "axolotl", "seal", "salamander", "penguin"], crowns: ["crest", null, null], tips: ["fin"], roots: ["Aqu", "Mar", "Rip", "Brin", "Tid", "Sal", "Wav"] },
    leaf: { word: "Sprout", mains: ["fern", "moss", "lime", "olive"], accents: ["blossom pink", "cream", "goldenrod"],
      beasts: ["toad", "fawn", "rabbit", "beetle", "tortoise"], crowns: ["sprout", "sprout", null], tips: ["leaf"], roots: ["Fern", "Bud", "Thist", "Mos", "Clov", "Bram", "Ivy"] },
    volt: { word: "Spark", mains: ["canary", "lemon", "amber"], accents: ["charcoal", "white", "cobalt"],
      beasts: ["mouse", "beetle", "moth", "cat", "fox"], crowns: ["antennae", "antennae", null], tips: ["bolt", "ball"], roots: ["Volt", "Zap", "Jolt", "Amp", "Stat", "Fiz", "Buzz"] },
    stone: { word: "Pebble", mains: ["slate", "sandstone", "granite", "umber"], accents: ["moss", "copper", "ivory"],
      beasts: ["armadillo", "tortoise", "boar", "toad", "beetle"], crowns: ["crystal", "horn", null], tips: ["club"], roots: ["Peb", "Grav", "Crag", "Shal", "Tor", "Flin", "Rub"] },
    frost: { word: "Frost", mains: ["ice blue", "periwinkle", "snow white"], accents: ["navy", "silver", "pale cyan"],
      beasts: ["rabbit", "penguin", "fox", "owlet", "seal"], crowns: ["crystal", "crest", null], tips: ["ball"], roots: ["Fros", "Rim", "Glac", "Sno", "Hail", "Bri", "Yuk"] },
    gloom: { word: "Dusk", mains: ["violet", "plum", "indigo"], accents: ["lilac", "bone white", "magenta"],
      beasts: ["bat", "imp", "cat", "moth", "mouse"], crowns: ["horns", "antennae", null], tips: ["spade"], roots: ["Mur", "Nox", "Gloo", "Shad", "Vel", "Umb", "Dus"] },
    gale: { word: "Breeze", mains: ["sky blue", "mint", "lilac"], accents: ["white", "pale yellow", "teal"],
      beasts: ["owlet", "bat", "moth", "rabbit", "penguin"], crowns: ["crest", "antennae", null], tips: ["feather"], roots: ["Zeph", "Gus", "Aer", "Whis", "Swi", "Sky", "Flit"] },
  };

  /* ── animals the creatures are built like (front view) ──
   * plans: how it stands. ears, muzzle, arms, tail, head: what it can have.
   * back / wings / crown, where set, come with the animal itself. */
  const BEASTS = {
    lizard:     { kin: "reptilian", cover: "scales", plans: ["biped", "quadruped"], ears: [null, "frills"], muzzle: ["snout", "fangs"], arms: ["clawed"], tail: ["long"], head: ["round", "wide"], back: [null, "spikes"], ends: ["lisk", "zar", "drel", "mander"] },
    salamander: { kin: "amphibian", cover: "smooth skin", plans: ["quadruped", "biped"], ears: [null, "frills"], muzzle: ["wide"], arms: ["mittens"], tail: ["long"], head: ["wide", "round"], back: [null, "fin"], ends: ["mander", "newt", "ock", "lo"] },
    fox:        { kin: "fox-like", cover: "fur", plans: ["quadruped", "biped"], ears: ["pointed"], muzzle: ["snout"], arms: ["paws"], tail: ["fluffy"], head: ["pointed", "round"], ends: ["vix", "fen", "kit", "rey"] },
    pup:        { kin: "canine", cover: "fur", plans: ["quadruped"], ears: ["round", "floppy"], muzzle: ["snout"], arms: ["paws"], tail: ["curled"], head: ["round"], ends: ["pup", "bark", "ruff", "hound"] },
    otter:      { kin: "otter-like", cover: "sleek fur", plans: ["biped"], ears: ["round"], muzzle: ["snout"], arms: ["paws"], tail: ["long"], head: ["round", "wide"], ends: ["ott", "lutra", "slip", "dle"] },
    axolotl:    { kin: "amphibian", cover: "smooth skin", plans: ["biped"], ears: ["frills"], muzzle: ["wide"], arms: ["mittens"], tail: ["fin"], head: ["wide"], ends: ["lotl", "xo", "gill", "mee"] },
    seal:       { kin: "seal-like", cover: "sleek fur", plans: ["blob"], ears: [null], muzzle: ["snout"], arms: ["flippers"], tail: [null], head: ["round"], ends: ["pip", "seal", "phoca", "lump"] },
    toad:       { kin: "amphibian", cover: "smooth, bumpy skin", plans: ["blob", "quadruped"], ears: [null], muzzle: ["wide"], arms: ["mittens"], tail: [null], head: ["wide", "flat"], ends: ["toad", "croak", "rib", "bul"] },
    fawn:       { kin: "deer-like", cover: "short fur", plans: ["quadruped"], ears: ["long"], muzzle: ["snout"], arms: ["hooves"], tail: ["nub"], head: ["pointed"], ends: ["fawn", "doe", "stag", "lope"] },
    beetle:     { kin: "insectoid", cover: "a glossy shell", plans: ["biped"], ears: [null], muzzle: ["mandibles"], arms: ["clawed"], tail: [null], head: ["round", "flat"], back: ["shell"], ends: ["bug", "tle", "chit", "scara"] },
    rabbit:     { kin: "rabbit-like", cover: "soft fur", plans: ["biped"], ears: ["long"], muzzle: ["snout"], arms: ["paws"], tail: ["nub"], head: ["round"], ends: ["bun", "hop", "lop", "pin"] },
    mouse:      { kin: "rodent", cover: "short fur", plans: ["biped"], ears: ["round"], muzzle: ["snout"], arms: ["paws"], tail: ["long"], head: ["round", "pointed"], ends: ["mus", "squeak", "nib", "rel"] },
    moth:       { kin: "moth-like", cover: "fuzzy down", plans: ["avian"], ears: [null], muzzle: ["none"], arms: ["stubby"], tail: [null], head: ["round"], wings: "insect", crown: "antennae", ends: ["moth", "lumen", "dust", "wisp"] },
    armadillo:  { kin: "armadillo-like", cover: "a banded hide", plans: ["quadruped"], ears: ["round"], muzzle: ["snout"], arms: ["clawed"], tail: ["long"], head: ["pointed"], back: ["plates"], ends: ["dillo", "roll", "arma", "bandi"] },
    tortoise:   { kin: "tortoise-like", cover: "leathery skin", plans: ["quadruped"], ears: [null], muzzle: ["beak"], arms: ["stubby"], tail: ["nub"], head: ["round"], back: ["shell"], ends: ["toise", "shel", "testu", "plod"] },
    boar:       { kin: "boar-like", cover: "bristly fur", plans: ["quadruped"], ears: ["pointed"], muzzle: ["tusks"], arms: ["hooves"], tail: ["curled"], head: ["wide"], ends: ["boar", "tusk", "snort", "grunt"] },
    owlet:      { kin: "owl-like", cover: "feathers", plans: ["avian"], ears: ["tufted"], muzzle: ["beak"], arms: [null], tail: [null], head: ["round"], wings: "feather", ends: ["owl", "hoot", "strix", "let"] },
    penguin:    { kin: "penguin-like", cover: "short feathers", plans: ["biped"], ears: [null], muzzle: ["beak"], arms: ["flippers"], tail: ["nub"], head: ["round"], ends: ["pen", "guin", "waddle", "flip"] },
    bat:        { kin: "bat-like", cover: "velvety fur", plans: ["avian", "floater"], ears: ["pointed"], muzzle: ["fangs"], arms: [null], tail: [null], head: ["round", "wide"], wings: "bat", ends: ["bat", "flit", "nyct", "squeak"] },
    imp:        { kin: "impish", cover: "smooth skin", plans: ["biped", "floater"], ears: ["pointed"], muzzle: ["fangs"], arms: ["clawed"], tail: ["long"], head: ["round", "pointed"], crown: "horns", ends: ["imp", "kin", "grem", "puck"] },
    cat:        { kin: "feline", cover: "soft fur", plans: ["biped", "quadruped"], ears: ["pointed"], muzzle: ["snout"], arms: ["paws"], tail: ["long", "curled"], head: ["round", "wide"], ends: ["mew", "purr", "kit", "lyn"] },
  };

  const SIZES = { tiny: { k: 0.82, m: [0.2, 0.34] }, small: { k: 0.91, m: [0.35, 0.6] }, medium: { k: 1, m: [0.61, 1.1] } };

  /* ── the creature ──────────────────────────────────────── */
  function make(seed) {
    seed = (Number(seed) >>> 0) || 1;
    const r = rng(seed);
    const typeId = r.pick(Object.keys(TYPES)), T = TYPES[typeId];
    const beastId = r.pick(T.beasts), B = BEASTS[beastId];
    const plan = r.pick(B.plans);
    const size = r.pick(Object.keys(SIZES));
    const main = r.pick(T.mains);
    const accent = r.pick(T.accents.filter((c) => c !== main));
    const bellies = BELLIES.filter((c) => c !== main && c !== accent && contrast(COLOURS[c], COLOURS[main]) > 60);
    const belly = r.chance(0.8) && bellies.length ? r.pick(bellies) : null;
    const eye = r.pick(EYES.filter((c) => c !== main && contrast(COLOURS[c], COLOURS[main]) > 50));

    const crown = B.crown || r.pick(T.crowns);
    const ears = r.pick(B.ears);
    const tail = r.pick(B.tail);
    const spec = {
      v: 1, seed, type: typeId, beast: beastId, plan, size,
      build: plan === "blob" ? "round" : r.pick(["round", "stocky", "slender"]),
      colours: { main, accent, belly, eye },
      head: { shape: plan === "blob" ? "round" : r.pick(B.head), big: plan !== "serpent" && r.chance(0.7) },
      eyes: { shape: r.pick(["round", "round", "large", "narrow", "sleepy"]), pupil: r.pick(["round", "slit", "none"]) },
      ears: ears ? { kind: ears, inner: ears === "pointed" || ears === "long" ? r.chance(0.6) : false } : null,
      crown: crown ? { kind: crown } : null,
      muzzle: r.pick(B.muzzle),
      arms: plan === "quadruped" ? null : (() => { const a = r.pick(B.arms); return a ? { kind: a, digits: a === "clawed" ? r.int(2, 3) : a === "paws" ? 3 : 0 } : null; })(),
      legs: plan === "biped" || plan === "avian" ? { count: 2, kind: plan === "avian" ? "thin" : r.pick(["stubby", "stubby", "long"]), toes: plan === "avian" ? 3 : r.int(2, 3) }
        : plan === "quadruped" ? { count: 4, kind: B.arms[0] === "hooves" ? "hooved" : "stubby", toes: B.arms[0] === "hooves" ? 0 : r.int(2, 3) }
        : { count: 0, kind: plan },
      tail: tail ? { kind: tail, tip: tail === "long" || tail === "curled" ? (r.chance(0.65) ? r.pick(T.tips) : null) : null } : null,
      wings: B.wings ? { kind: B.wings } : null,
      back: (() => { const b = B.back ? r.pick(B.back) : (r.chance(0.18) ? "spikes" : null); return b ? { kind: b, count: b === "spikes" ? r.int(3, 5) : 0 } : null; })(),
      pattern: null,
    };
    if (spec.tail && spec.tail.kind === "long" && spec.tail.tip === "fin") spec.tail.tip = null;
    // markings the reference can show from the front
    if (r.chance(0.55)) {
      const where = r.pick(["forehead", "cheeks", "shoulders", "chest", ...(spec.tail && spec.tail.kind !== "nub" && !spec.tail.tip ? ["tail"] : [])]);
      const kind = where === "forehead" ? r.pick(["stripes", "diamond"]) : where === "cheeks" ? r.pick(["spots", "stripes"])
        : where === "shoulders" ? r.pick(["stripes", "spots"]) : where === "chest" ? r.pick(["diamond", "spots"]) : "band";
      const pcol = r.pick([accent, ...T.accents.filter((c) => c !== accent && c !== main)].filter(Boolean));
      spec.pattern = { kind, where, colour: pcol, count: kind === "stripes" ? r.int(2, 3) : kind === "spots" ? r.int(2, 4) : 1 };
    }
    const [lo, hi] = SIZES[size].m;
    spec.height = Math.round((lo + r.next() * (hi - lo)) * 10) / 10 || 0.2;
    const bulk = { round: 1.15, stocky: 1.35, slender: 0.8 }[spec.build] * (spec.back && spec.back.kind === "shell" ? 1.6 : 1);
    spec.weight = Math.round(spec.height * spec.height * spec.height * 38 * bulk * (0.8 + r.next() * 0.4) * 10) / 10 || 0.4;
    spec.name = nameOf(r, T, B);
    spec.category = T.word + " " + cap(beastId === "salamander" ? "Newt" : beastId === "owlet" ? "Owl" : beastId === "pup" ? "Pup" : beastId) + " Creature";
    return spec;
  }

  function nameOf(r, T, B) {
    const root = r.pick(T.roots), end = r.pick(B.ends);
    let name = root + end.toLowerCase();
    name = name.replace(/(.)\1\1/g, "$1$1");
    if (name.length < 5) name += r.pick(["o", "y", "et", "a"]);
    if (name.length > 10) name = name.slice(0, 10);
    return cap(name.toLowerCase());
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function rgbOf(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function contrast(a, b) { const x = rgbOf(a), y = rgbOf(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 1.7; }

  /* ── the slip: words a reader can draw from ───────────── */
  const NUM = ["no", "one", "two", "three", "four", "five", "six"];
  const an = (w) => (/^[aeiou]/i.test(w) ? "an " : "a ") + w;
  const POSTURE = { biped: "bipedal", quadruped: "quadrupedal", blob: "limbless", avian: "bird-like, bipedal", floater: "floating" };
  const BUILD = { round: "round, pudgy", stocky: "stocky, barrel-shaped", slender: "slender" };

  function describe(spec) {
    const s = spec, c = s.colours, N = s.name, B = BEASTS[s.beast];
    const cover = s.wings && s.wings.kind === "feather" ? "feathers" : B.cover;
    const out = [];
    // 1. what it is, its body, its covering
    // "soft fur" in vermilion reads "soft, vermilion fur"; "a glossy shell" reads "a glossy, vermilion shell"
    const cw = cover.replace(/^a /, "").split(" "), noun = cw.pop(), coat = (cover.startsWith("a ") ? "a " : "") + (cw.length ? cw.join(" ") + ", " : "") + c.main + " " + noun;
    out.push(N + " is " + an(s.size) + ", " + POSTURE[s.plan] + ", " + B.kin + " creature with " + an(BUILD[s.build]) + " body covered in " + coat + "." +
      (c.belly ? " Its " + c.belly + " underbelly runs from its throat to " + (s.legs.count ? "the tops of its legs." : "the base of its body.") : ""));
    // 2. the head: shape, eyes, ears, crown, mouth
    const head = [];
    const shape = { round: "round", wide: "broad and wider than it is tall", pointed: "round, narrowing to a pointed chin", flat: "flat-topped and wide" }[s.head.shape];
    head.push((s.plan === "blob" ? "Its head and body are one shape; its face sits high on the front of its body, which is " : "Its " + (s.head.big ? "oversized " : "") + "head is ") + shape + ".");
    const eyeWords = { round: "round eyes", large: "large, glossy eyes", narrow: "narrow, almond-shaped eyes", sleepy: "heavy-lidded eyes" }[s.eyes.shape];
    const lids = s.eyes.shape === "sleepy" ? ", which it keeps half closed" : "";
    const pupil = s.eyes.pupil === "slit" ? " and slit pupils" : s.eyes.pupil === "round" ? " and round, black pupils" : "";
    head.push(s.eyes.pupil === "none" || c.eye === "black" ? "It has " + eyeWords + " that are solid " + c.eye + ", each with a single white glint" + lids + "." : "It has " + eyeWords + " with " + c.eye + " irises" + pupil + lids + ".");
    if (s.ears) head.push({
      pointed: "A pair of tall, pointed ears stands up from the top of its head" + (s.ears.inner ? ", their insides " + c.accent + "." : "."),
      round: "Two small, round ears sit on top of its head.",
      floppy: "Two soft, floppy ears hang down beside its face.",
      long: "Two long, upright ears rise from its head, nearly as tall as the head itself" + (s.ears.inner ? ", lined with " + c.accent + "." : "."),
      frills: "Three short, feathery frills of " + c.accent + " fan out from each side of its head, like gills.",
      tufted: "Two pointed feather tufts stick up from the top of its head like ears.",
    }[s.ears.kind]);
    if (s.crown) head.push({
      flame: "A small flame of " + c.accent + " flickers on the crown of its head.",
      horn: "A single short, " + c.accent + " horn juts up from the middle of its forehead.",
      horns: "Two short " + c.accent + " horns curve up from the top of its head.",
      crest: "A spiky crest of " + c.accent + " runs over the top of its head in three points.",
      sprout: "A short stem grows from the top of its head and splits into two green leaves.",
      antennae: "Two thin antennae rise from its head, each tipped with a round " + c.accent + " bulb.",
      crystal: "A diamond-shaped " + c.accent + " crystal grows from the top of its head.",
    }[s.crown.kind]);
    head.push({
      snout: "It has a short, rounded snout" + (c.belly ? " the colour of its underbelly" : "") + ", with a small dark nose.",
      fangs: "Two small white fangs poke down over its lower lip.",
      wide: "Its mouth is very wide, a thin line that stretches almost from cheek to cheek.",
      beak: "It has a small, pointed beak of " + c.accent + ".",
      tusks: "A pair of short white tusks curves up from the corners of its mouth.",
      mandibles: "Two small, curved mandibles sit below its eyes in place of a mouth.",
      none: "It has no visible mouth.",
    }[s.muzzle]);
    out.push(head.join(" "));
    // 3. the body: arms, legs, wings, back
    const body = [];
    if (s.arms) body.push({
      clawed: "It has two short arms, each ending in " + NUM[s.arms.digits] + " small, sharp claws.",
      paws: "Its two short arms end in round paws.",
      mittens: "Its two stubby arms end in mitten-like hands with no visible fingers.",
      stubby: "It has two stubby little arms held close to its sides.",
      flippers: "Instead of arms it has two flat, rounded flippers.",
    }[s.arms.kind]);
    if (s.legs.count === 2) body.push(s.legs.kind === "thin" ? "It stands on two thin legs, each with a three-toed foot." :
      "It stands on two " + (s.legs.kind === "long" ? "long, slim" : "short, thick") + " legs with " + NUM[s.legs.toes] + " toes on each foot.");
    else if (s.legs.count === 4) body.push(s.legs.kind === "hooved" ? "It walks on four slim legs that end in small, dark hooves." :
      "It walks on four short legs, each ending in a round paw with " + NUM[s.legs.toes] + " toes.");
    else if (s.plan === "blob") body.push("It has no legs, and rests on the flat underside of its body.");
    else if (s.plan === "floater") body.push("It has no legs: its body tapers to a rounded point, and it floats a little above the ground.");
    if (s.wings) body.push({
      bat: "A pair of " + c.accent + " bat-like wings, each with three bony points along its edge, spreads from its back.",
      feather: "Two rounded, feathered wings fold against its sides, their tips " + c.accent + ".",
      insect: "Two pairs of translucent, insect-like wings, edged in " + c.accent + ", spread from behind its shoulders.",
    }[s.wings.kind]);
    if (s.back) body.push({
      spikes: "A row of " + NUM[s.back.count] + " " + c.accent + " spikes peeks up over its shoulders from its back.",
      shell: "It carries a rounded " + c.accent + " shell on its back, whose rim shows around its body from the front.",
      plates: "Overlapping " + c.accent + " plates cover its back and show as a scalloped edge behind its shoulders.",
      fin: "A tall, rounded " + c.accent + " fin rises from its back, behind its head.",
    }[s.back.kind]);
    if (body.length) out.push(body.join(" "));
    // 4. the tail, and its markings
    const tail = [];
    if (s.tail) tail.push({
      long: "A long, thin tail curls up behind it on one side" + (s.tail.tip ? ", ending in " + tipWords(s.tail.tip, c.accent) + "." : "."),
      curled: "Its short tail curls into a loop behind one hip" + (s.tail.tip ? " and ends in " + tipWords(s.tail.tip, c.accent) + "." : "."),
      fluffy: "A large, fluffy tail, as big as its body, sweeps up behind it on one side" + (c.belly ? ", tipped with " + c.belly + "." : "."),
      nub: "It has a small, round nub of a tail, just visible beside one hip.",
      fin: "Its broad, flat tail ends in a tall fin that shows behind it on one side.",
    }[s.tail.kind]);
    if (s.pattern) { const p = s.pattern, col = p.colour;
      tail.push({
        "stripes:forehead": NUM[p.count] + " short " + col + " stripes run across its forehead.",
        "diamond:forehead": "A " + col + " diamond-shaped marking sits in the middle of its forehead.",
        "spots:cheeks": "A round " + col + " spot marks each cheek.",
        "stripes:cheeks": "Two thin " + col + " stripes, like whiskers, mark each cheek.",
        "stripes:shoulders": NUM[p.count] + " " + col + " stripes run across each shoulder.",
        "spots:shoulders": "Each shoulder is dotted with " + NUM[p.count] + " " + col + " spots.",
        "diamond:chest": "A " + col + " diamond-shaped marking sits in the middle of its chest.",
        "spots:chest": NUM[p.count] + " " + col + " spots run down the middle of its chest.",
        "band:tail": "The tip of its tail is banded with " + col + ".",
      }[p.kind + ":" + p.where]);
    }
    if (tail.length) out.push(tail.join(" ").replace(/(^|\. )([a-z])/g, (m, a, b) => a + b.toUpperCase()));
    return { name: N, category: "The " + s.category, height: s.height, weight: s.weight, type: s.type, paragraphs: out, text: out.join("\n\n") };
  }
  function tipWords(tip, accent) {
    return {
      flame: "a flickering, flame-shaped tip of " + accent,
      leaf: "a single broad leaf",
      bolt: "a zigzag tip shaped like a lightning bolt, in " + accent,
      ball: "a round " + accent + " bulb",
      spade: "a pointed, spade-shaped tip",
      club: "a heavy, knobbly club",
      feather: "a single long " + accent + " feather",
    }[tip];
  }

  /* ── the reference: the same spec, drawn at true resolution ──
   * Front view, 48 × 48, light from the upper left, a one-pixel outline round
   * the silhouette and round each part that sits over another. Parts are
   * ellipses, polygons and lines, laid down back to front; markings and the
   * face go on last. Out comes a Design Suite bitmap: "#RRGGBB" or "" per cell. */
  const SW = 48, SH = 48;
  const toHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
  const mixHex = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const LEAF = "#5FAE45", INKC = "#1C1424", WHITE = "#FFFFFF";
  function tones(hex) {
    const lum = rgbOf(hex).reduce((s, v) => s + v, 0) / 765;
    return { light: lum > 0.88 ? hex : mixHex(hex, WHITE, 0.32), base: hex, shadow: mixHex(hex, "#2A1E3A", lum > 0.85 ? 0.18 : 0.3), line: mixHex(hex, INKC, 0.72) };
  }

  function sprite(spec, opts = {}) {
    let s = spec;
    const c = s.colours, k = SIZES[s.size].k, cx = SW / 2, ground = SH - 2;
    const col = { main: COLOURS[c.main], belly: c.belly ? COLOURS[c.belly] : COLOURS[c.main], eye: COLOURS[c.eye] || COLOURS.black };
    // every part has its own colour (a slip can say "a crest of gold" and "ears lined with white"); unnamed, a part takes the accent
    col.accent = COLOURS[c.accent] || mixHex(col.main, WHITE, 0.45);
    for (const pk of ["crown", "ears", "wings", "back", "tip", "muzzle"]) col[pk] = (c.parts && COLOURS[c.parts[pk]]) || col.accent;
    if (opts.asleep) s = { ...s, eyes: { ...s.eyes, shape: "sleepy" } };
    const parts = [];
    // shape builders; role is a colour, edge = gets an inner outline where it overlaps an earlier part
    const ell = (x, y, rx, ry, colour, o = {}) => parts.push({ t: "e", x, y, rx: Math.max(0.6, rx), ry: Math.max(0.6, ry), colour, shade: o.shade !== false, edge: o.edge !== false, dark: !!o.dark });
    const poly = (pts, colour, o = {}) => parts.push({ t: "p", pts, colour, shade: o.shade !== false, edge: o.edge !== false, dark: !!o.dark });
    const seg = (pts, w, colour, o = {}) => parts.push({ t: "l", pts, w, colour, shade: false, edge: o.edge !== false, dark: !!o.dark });

    // ── proportions
    const big = s.head.big ? 1.12 : 1;
    let hr = 9.2 * k * big;
    const brx = { round: 8.6, stocky: 9.6, slender: 6.6 }[s.build] * k;
    let body, head, legTop;
    if (s.plan === "quadruped") {
      const rx = { round: 12, stocky: 13, slender: 10.5 }[s.build] * k, ry = 7 * k, by = ground - 6.5 * k - ry * 0.4;
      body = { x: cx, y: by, rx, ry };
      head = { x: cx, y: by - ry * 0.55 - hr * 0.45 };
    } else if (s.plan === "blob") {
      const rx = 13.5 * k, ry = 11.5 * k;
      body = { x: cx, y: ground - ry, rx, ry };
      hr = ry; head = { x: cx, y: body.y };
    } else if (s.plan === "floater") {
      const ry = 7.5 * k;
      body = { x: cx, y: ground - 7 - ry, rx: brx * 0.95, ry };
      head = { x: cx, y: body.y - ry * 0.75 - hr * 0.55 };
    } else {
      const legH = s.legs.kind === "long" ? 8 * k : s.legs.kind === "thin" ? 6 * k : 4.5 * k, ry = 8 * k;
      body = { x: cx, y: ground - legH - ry * 0.72, rx: s.plan === "avian" ? brx * 1.05 : brx, ry };
      legTop = body.y + ry * 0.5;
      head = { x: cx, y: body.y - ry * 0.7 - hr * 0.62 };
    }
    const shapeK = { round: [1, 1], wide: [1.2, 0.88], pointed: [1, 1], flat: [1.15, 0.86] }[s.head.shape];
    head.rx = s.plan === "blob" ? body.rx : hr * shapeK[0]; head.ry = s.plan === "blob" ? body.ry : hr * shapeK[1];
    const top = head.y - head.ry;                      // the top of the head
    const side = -1;                                   // the tail and its tip show on the viewer's left

    // ── behind everything: wings, tail, back, far legs
    if (s.wings) {
      for (const d of [-1, 1]) {
        const sx = cx + d * body.rx * 0.55, sy = body.y - body.ry * 0.5;
        if (s.wings.kind === "bat") poly([[sx, sy], [cx + d * (body.rx + 13), sy - 9], [cx + d * (body.rx + 12), sy + 1], [cx + d * (body.rx + 8), sy - 1], [cx + d * (body.rx + 5), sy + 4], [cx + d * (body.rx + 2), sy + 2], [sx, sy + 5]], col.wings);
        else if (s.wings.kind === "feather") { ell(cx + d * (body.rx + 0.5), body.y + 0.5, 3.6, 7.2, col.main); ell(cx + d * (body.rx + 0.8), body.y + 5, 2.6, 2.8, col.wings, { edge: false }); }
        else { const w = mixHex(col.wings, WHITE, 0.7); ell(cx + d * (body.rx + 5), body.y - 6.5, 6.5, 4.6, w, { shade: false }); ell(cx + d * (body.rx + 3.5), body.y + 1.5, 4.6, 3.4, w, { shade: false }); }
      }
    }
    let tailEnd = null;
    if (s.tail) {
      const hx = cx + side * body.rx * 0.6, hy = body.y + body.ry * 0.35, ox = cx + side * (body.rx + 1);
      if (s.tail.kind === "long") { const p = [[hx, hy], [ox + side * 5, hy - 1], [ox + side * 8, hy - 6], [ox + side * 7.5, hy - 12]]; seg(p, 2.2, col.main); tailEnd = p[3]; }
      else if (s.tail.kind === "curled") { const r0 = 3.6, qx = ox + side * 3.5, qy = hy - 3; const ring = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.4 + (i / 10) * Math.PI * 1.7; ring.push([qx + Math.cos(a) * r0 * -side, qy + Math.sin(a) * r0]); } seg([[hx, hy], ...ring], 2.2, col.main); tailEnd = ring[ring.length - 1]; }
      else if (s.tail.kind === "fluffy") { ell(ox + side * 4, body.y - 4, 5.8, 9, col.main); ell(ox + side * 4.3, body.y - 10.5, 3.8, 3, col.belly, { edge: false }); }
      else if (s.tail.kind === "nub") ell(ox, hy + 1, 2.6, 2.4, col.main);
      else if (s.tail.kind === "fin") poly([[hx, hy - 1], [ox + side * 10, hy - 10], [ox + side * 7, hy], [ox + side * 10, hy + 6], [hx, hy + 3]], col.main);
      if (tailEnd && s.tail.tip) tip(s.tail.tip, tailEnd[0], tailEnd[1]);
      if (tailEnd && s.pattern && s.pattern.kind === "band") ell(tailEnd[0], tailEnd[1], 2, 2, COLOURS[s.pattern.colour], { edge: false });
    }
    function tip(kind, x, y) {
      if (kind === "flame") poly([[x - 2.6, y + 1], [x - 2.2, y - 3], [x - 0.5, y - 7], [x + 1.6, y - 3.5], [x + 2.6, y + 1]], col.tip);
      else if (kind === "leaf") ell(x + side * 1.2, y - 2.4, 2.4, 3.6, LEAF);
      else if (kind === "bolt") poly([[x - 1, y + 1], [x + 2.5, y - 2], [x, y - 2.5], [x + 3, y - 7], [x - 2.6, y - 2.6], [x, y - 2]], col.tip);
      else if (kind === "ball") ell(x, y - 1.5, 2.6, 2.6, col.tip);
      else if (kind === "spade") poly([[x, y - 6.5], [x + 3, y - 2], [x, y + 0.5], [x - 3, y - 2]], col.main);
      else if (kind === "club") ell(x, y - 1.5, 3.2, 3.2, col.main);
      else if (kind === "feather") ell(x + side * 0.6, y - 3.5, 1.7, 4, col.tip);
    }
    if (s.back) {
      if (s.back.kind === "shell" || s.back.kind === "plates") {
        ell(body.x, body.y - 1.2, body.rx + 2.6, body.ry + 2.2, col.back);
        if (s.back.kind === "plates") for (const d of [-1, 0, 1]) ell(body.x + d * body.rx * 0.6, body.y - body.ry - 1.2 + Math.abs(d) * 1.4, 2.4, 2, col.back);
      } else if (s.back.kind === "fin") ell(head.x, head.y - head.ry * 0.5, 3, head.ry * 0.75, col.back);     // shorter than anything the head grows
      else for (let i = 0; i < s.back.count; i++) {
        const d = i % 2 ? 1 : -1, x = cx + d * (head.rx * 0.78 + Math.floor(i / 2) * 3.4) + (i === s.back.count - 1 && i % 2 === 0 && i > 0 ? 0 : 0), y = body.y - body.ry + 1.5 + Math.floor(i / 2) * 1.6;
        poly([[x - 2.1, y + 2], [x + 2.1, y + 2], [x + d * 0.8, y - 4.2]], col.back);
      }
    }
    if (s.plan === "quadruped") for (const d of [-1, 1]) ell(cx + d * body.rx * 0.74, ground - 3.4 * k, 2.6 * k, 3.6 * k, col.main, { dark: true });

    // ── the body, then what is in front of it
    if (s.plan === "floater") poly([[body.x - body.rx * 0.8, body.y + 2], [body.x + body.rx * 0.8, body.y + 2], [body.x + 1, ground - 3], [body.x - 1, ground - 3]], col.main);
    ell(body.x, body.y, body.rx, body.ry, col.main);
    if (c.belly) {
      if (s.plan === "blob") ell(body.x, body.y + body.ry * 0.45, body.rx * 0.62, body.ry * 0.45, col.belly, { edge: false, shade: false });
      else ell(body.x, body.y + body.ry * 0.12, body.rx * 0.56, body.ry * 0.72, col.belly, { edge: false, shade: false });
    }
    if (s.legs.count === 2) for (const d of [-1, 1]) {
      const x = cx + d * body.rx * 0.48;
      if (s.legs.kind === "thin") { seg([[x, legTop], [x, ground - 1]], 1.2, mixHex(col.main, INKC, 0.35)); seg([[x - 2, ground], [x + 2, ground]], 1.2, mixHex(col.main, INKC, 0.35)); }
      else if (s.legs.kind === "long") ell(x, ground - 4 * k, 2.5 * k, 4.4 * k, col.main);
      else ell(x, ground - 2.6 * k, 3.2 * k, 2.8 * k, col.main);
    } else if (s.legs.count === 4) for (const d of [-1, 1]) {
      const x = cx + d * 4.6 * k;
      ell(x, ground - 4 * k, 2.6 * k, 4.2 * k, col.main);
      if (s.legs.kind === "hooved") ell(x, ground - 0.8, 2.2 * k, 1.2, "#3A2E2A", { edge: false });
    }
    if (s.arms) for (const d of [-1, 1]) {
      const x = cx + d * (body.rx + 0.4), y = body.y - (s.plan === "blob" ? 0 : 1);
      if (s.arms.kind === "flippers") poly([[x - d * 1.5, y - 3], [x + d * 2.8, y - 1], [x + d * 4.5, y + 4.5], [x - d * 0.5, y + 2.5]], col.main);
      else { ell(x, y, s.arms.kind === "stubby" ? 2 : 2.5, s.arms.kind === "stubby" ? 2.8 : 3.6, col.main);
        if (s.arms.kind === "clawed") for (let i = 0; i < s.arms.digits; i++) seg([[x + (i - (s.arms.digits - 1) / 2) * 1.4, y + 3.4], [x + (i - (s.arms.digits - 1) / 2) * 1.4, y + 4.6]], 0.9, WHITE, { edge: false }); }
    }
    // ── ears and what grows from the head, then the head
    if (s.ears) for (const d of [-1, 1]) {
      const ex = head.x + d * head.rx * 0.56, ey = top + head.ry * 0.32;
      const inner = s.ears.inner ? col.ears : null;
      if (s.ears.kind === "pointed" || s.ears.kind === "tufted") {
        const h = s.ears.kind === "tufted" ? 4.2 : 6.4, w = s.ears.kind === "tufted" ? 2.2 : 3.1;
        poly([[ex - w, ey + 1.5], [ex + w, ey + 1.5], [ex + d * 1.6, ey - h]], col.main);
        if (inner) poly([[ex - w * 0.4, ey + 0.8], [ex + w * 0.4, ey + 0.8], [ex + d * 1.2, ey - h * 0.55]], inner, { edge: false, shade: false });
      } else if (s.ears.kind === "round") ell(head.x + d * head.rx * 0.7, top + 1.4, 3 * k, 2.9 * k, col.main);
      else if (s.ears.kind === "floppy") ell(head.x + d * (head.rx * 0.95), head.y + 1, 2.4, 5, col.main, { dark: true });
      else if (s.ears.kind === "long") { const lx = head.x + d * head.rx * 0.38; ell(lx, top - 5 * k, 2.6 * k, 7 * k, col.main); if (inner) ell(lx, top - 5 * k, 1.1 * k, 5 * k, inner, { edge: false, shade: false }); }
      else if (s.ears.kind === "frills") for (let j = 0; j < 3; j++) { const fy = head.y - 3 + j * 3; seg([[head.x + d * head.rx * 0.85, fy], [head.x + d * (head.rx + 4), fy - 1.6 + j * 0.6]], 1.6, col.ears); }
    }
    if (s.crown) {
      const hx = head.x, t = top + 1;
      const kc = s.crown.kind;
      if (kc === "flame") { poly([[hx - 3, t + 1], [hx - 2.4, t - 3.5], [hx - 0.2, t - 8], [hx + 2.2, t - 4], [hx + 3, t + 1]], col.crown); poly([[hx - 1.3, t], [hx, t - 4.5], [hx + 1.3, t]], mixHex(col.crown, WHITE, 0.55), { edge: false, shade: false }); }
      else if (kc === "horn") poly([[hx - 2, t + 2], [hx + 2, t + 2], [hx + 0.3, t - 5.5]], col.crown);
      else if (kc === "horns") for (const d of [-1, 1]) poly([[hx + d * head.rx * 0.38 - 1.6, t + 2.2], [hx + d * head.rx * 0.38 + 1.6, t + 2.2], [hx + d * (head.rx * 0.38 + 2.4), t - 4.8]], col.crown);
      else if (kc === "crest") for (const [dx, h] of [[-3.2, 4], [0, 6.5], [3.2, 4]]) poly([[hx + dx - 1.8, t + 2], [hx + dx + 1.8, t + 2], [hx + dx, t - h]], col.crown);
      else if (kc === "sprout") { seg([[hx, t + 1], [hx, t - 4]], 1, mixHex(LEAF, INKC, 0.3)); ell(hx - 2.8, t - 4.8, 2.9, 1.5, LEAF); ell(hx + 2.8, t - 5.8, 2.9, 1.5, LEAF); }
      else if (kc === "antennae") for (const d of [-1, 1]) { seg([[hx + d * 2.4, t + 1], [hx + d * 4.8, t - 6.5]], 1, col.main); ell(hx + d * 4.9, t - 7.2, 1.7, 1.7, col.crown); }
      else if (kc === "crystal") { poly([[hx, t - 8.5], [hx + 3, t - 3], [hx, t + 2], [hx - 3, t - 3]], col.crown); poly([[hx, t - 7], [hx + 1.2, t - 3], [hx, t - 1]], mixHex(col.crown, WHITE, 0.6), { edge: false, shade: false }); }
    }
    if (s.plan !== "blob") {
      ell(head.x, head.y, head.rx, head.ry, col.main);
      if (s.head.shape === "pointed") poly([[head.x - head.rx * 0.5, head.y + head.ry * 0.6], [head.x + head.rx * 0.5, head.y + head.ry * 0.6], [head.x, head.y + head.ry * 1.18]], col.main, { edge: false });
    }

    // ── rasterise: the top-most part wins each cell
    const owner = new Int16Array(SW * SH).fill(-1);
    const inPoly = (pts, x, y) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
    const nearSeg = (pts, w, x, y) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)); if (Math.hypot(x - ax - t * dx, y - ay - t * dy) <= w / 2) return true; } return false; };
    if (s.head.shape === "flat" && s.plan !== "blob") parts.forEach((p) => { if (p.t === "e" && p.x === head.x && p.y === head.y && p.rx === head.rx) p.flat = head.y - head.ry * 0.62; });
    parts.forEach((p, i) => {
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
        const px = x + 0.5, py = y + 0.5;
        let hit = false;
        if (p.t === "e") hit = ((px - p.x) / p.rx) ** 2 + ((py - p.y) / p.ry) ** 2 <= 1 && !(p.flat && py < p.flat);
        else if (p.t === "p") hit = inPoly(p.pts, px, py);
        else hit = nearSeg(p.pts, p.w, px, py);
        if (hit) owner[y * SW + x] = i;
      }
    });
    // ── colour, light from the upper left, then the outlines
    const px = new Array(SW * SH).fill("");
    const boxOf = (p) => { if (p.t === "e") return [p.x, p.y, p.rx, p.ry]; const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); return [(x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, (x1 - x0) / 2), Math.max(1, (y1 - y0) / 2)]; };
    for (let i = 0; i < SW * SH; i++) {
      const o = owner[i]; if (o < 0) continue;
      const p = parts[o], T = tones(p.colour), x = (i % SW) + 0.5, y = Math.floor(i / SW) + 0.5;
      let v = T.base;
      if (p.dark) v = T.shadow;
      else if (p.shade) { const [bx, by, rx, ry] = boxOf(p), d = ((x - bx) / rx) * 0.55 + ((y - by) / ry) * 0.85; v = d > 0.62 ? T.shadow : d < -0.7 ? T.light : T.base; }
      px[i] = v;
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= SW || y >= SH ? -1 : owner[y * SW + x]);
    const lined = px.slice();
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const o = at(x, y); if (o < 0) continue;
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      if (n.some((q) => q < 0)) lined[y * SW + x] = tones(col.main).line;
      else if (parts[o].edge && n.some((q) => q < o && parts[q].colour !== parts[o].colour || (q < o && parts[o].t !== "e" && q !== o))) lined[y * SW + x] = mixHex(tones(parts[o].colour).shadow, INKC, 0.45);
    }
    // ── the face, painted on top, pixel by pixel
    const put = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < SW && y < SH && owner[y * SW + x] >= 0) lined[y * SW + x] = v; };
    const fx = head.x, fy = s.plan === "blob" ? body.y - body.ry * 0.28 : head.y + head.ry * 0.08, fr = s.plan === "blob" ? body.rx * 0.62 : head.rx;
    const dark = INKC, ink = tones(col.main).line;
    // markings on the face and body
    if (s.pattern) {
      const p = s.pattern, pc = COLOURS[p.colour];
      if (p.where === "forehead" && p.kind === "stripes") for (let i = 0; i < p.count; i++) for (let dx = -1; dx <= 1; dx++) put(fx + dx, fy - fr * 0.52 + i * 1.6 - 1, pc);
      if (p.where === "forehead" && p.kind === "diamond") [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => put(fx + dx, fy - fr * 0.5 + dy, pc));
      if (p.where === "cheeks") for (const d of [-1, 1]) { const qx = fx + d * fr * 0.64, qy = fy + fr * 0.28;
        if (p.kind === "spots") [[0, 0], [d, 0], [0, 1], [d, 1]].forEach(([dx, dy]) => put(qx + dx, qy + dy, pc));
        else for (let j = 0; j < 2; j++) for (let t = 0; t < 3; t++) put(qx + d * t, qy - 0.5 + j * 2 - t * 0.3, pc); }
      if (p.where === "shoulders") for (const d of [-1, 1]) { const qx = cx + d * body.rx * 0.62, qy = body.y - body.ry * 0.45;
        for (let i = 0; i < p.count; i++) { if (p.kind === "stripes") for (let t = 0; t < 3; t++) put(qx + d * t * 0.6, qy + i * 2 + t * 0.4, pc); else put(qx + d * (i % 2) * 1.5, qy + i * 1.6, pc); } }
      if (p.where === "chest") { const qy = body.y - body.ry * 0.15;
        if (p.kind === "diamond") [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => put(cx + dx, qy + dy, pc));
        else for (let i = 0; i < p.count; i++) { put(cx, qy - 1 + i * 2.2, pc); put(cx + 1, qy - 1 + i * 2.2, pc); } }
    }
    // the muzzle
    const my = fy + fr * 0.42;
    if (s.muzzle === "snout") { for (let y = -1; y <= 1; y++) for (let x = -2 + Math.abs(y); x <= 2 - Math.abs(y) + 1; x++) put(fx + x - 0.5, my + y, c.belly ? col.belly : tones(col.main).light); put(fx - 0.5, my - 1, dark); put(fx + 0.5, my - 1, dark); put(fx - 0.5, my + 1, ink); put(fx + 0.5, my + 1, ink); }
    else if (s.muzzle === "fangs") { for (let x = -1; x <= 1; x++) put(fx + x, my, dark); put(fx - 1, my + 1, WHITE); put(fx + 1, my + 1, WHITE); }
    else if (s.muzzle === "wide") { const w = Math.round(fr * 0.5); for (let x = -w; x <= w; x++) put(fx + x, my + (Math.abs(x) === w ? -1 : 0), dark); }
    else if (s.muzzle === "beak") { for (let y = 0; y < 3; y++) for (let x = -2 + y; x <= 2 - y; x++) put(fx + x, my - 1 + y, y === 2 ? tones(col.muzzle).shadow : col.muzzle); }
    else if (s.muzzle === "tusks") { for (let x = -1; x <= 1; x++) put(fx + x, my, dark); for (const d of [-1, 1]) { put(fx + d * 2, my, WHITE); put(fx + d * 2, my - 1, WHITE); } }
    else if (s.muzzle === "mandibles") for (const d of [-1, 1]) { put(fx + d * 1.5, my - 1, dark); put(fx + d * 1, my, dark); put(fx + d * 0.5, my + 0.6, dark); }
    // the eyes: iris, pupil, glint
    const ex = fr * 0.38, eh = { round: 3, large: 4, narrow: 2, sleepy: 1 }[s.eyes.shape], iris = c.eye === "black" || s.eyes.pupil === "none" ? (c.eye === "black" ? dark : col.eye) : col.eye;
    for (const d of [-1, 1]) {
      const x0 = Math.round(fx + d * ex - 1), y0 = Math.round(fy - Math.ceil(eh / 2) + 1);
      const w = s.eyes.shape === "large" || s.eyes.shape === "narrow" ? 3 : 2;
      for (let y = 0; y < eh; y++) for (let x = 0; x < w; x++) put(x0 + x, y0 + y, iris);
      if (iris !== dark && s.eyes.pupil === "slit") for (let y = 0; y < eh; y++) put(x0 + (w === 3 ? 1 : d > 0 ? 0 : 1), y0 + y, dark);
      if (iris !== dark && s.eyes.pupil === "round" && eh > 1) { put(x0 + w - 1, y0 + eh - 1, dark); if (eh > 2) put(x0 + w - 1, y0 + eh - 2, dark); }
      if (s.eyes.shape === "narrow" || s.eyes.shape === "sleepy") for (let x = -1; x <= w; x++) put(x0 + x, y0 - 1, ink);
      if (eh > 1) put(x0, y0, WHITE);
    }
    return { w: SW, h: SH, px: lined };
  }

  /* ── how close a drawing came ───────────────────────────
   * Both pictures are cropped to what is drawn, fitted into the same square and
   * laid over each other: the silhouette score is how much of the two shapes
   * agrees (a mirrored drawing counts as well as an unmirrored one: the slip
   * only ever says "one side"). The colour score asks, for each colour the slip
   * names, how near the closest colour in the drawing is. */
  function fitMask(img, N) {
    const { w, h, px } = img; let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const size = Math.max(x1 - x0 + 1, y1 - y0 + 1), mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2, out = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const sx = Math.floor(mx - size / 2 + ((x + 0.5) * size) / N), sy = Math.floor(my - size / 2 + ((y + 0.5) * size) / N);
      if (sx >= 0 && sy >= 0 && sx < w && sy < h && px[sy * w + sx]) out[y * N + x] = 1;
    }
    return out;
  }
  function overlap(a, b) { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 0; }
  function mirror(m, N) { const o = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) o[y * N + x] = m[y * N + (N - 1 - x)]; return o; }
  function lab(hex) {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = rgbOf(hex).map(lin);
    const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  const deltaE = (a, b) => { const x = lab(a), y = lab(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

  function compare(drawing, spec) {
    const N = 32, ref = sprite(spec), a = fitMask(drawing, N), b = fitMask(ref, N);
    const silhouette = a && b ? Math.max(overlap(a, b), overlap(mirror(a, N), b)) : 0;
    const counts = new Map(); let total = 0;
    for (const v of drawing.px) if (v) { counts.set(v.toUpperCase(), (counts.get(v.toUpperCase()) || 0) + 1); total++; }
    const used = [...counts.keys()];
    const roles = [["main", 0.5], ["belly", 0.2], ["accent", 0.2], ["eye", 0.1]].filter(([r]) => spec.colours[r]);
    const colours = roles.map(([role, weight]) => {
      const name = spec.colours[role], hex = COLOURS[name];
      let best = null, d = Infinity;
      for (const u of used) { const e = deltaE(hex, u); if (e < d) { d = e; best = u; } }
      return { role, name, hex, closest: best, score: best ? Math.max(0, 1 - d / 60) : 0, weight };
    });
    const wsum = colours.reduce((s2, x) => s2 + x.weight, 0) || 1;
    const colour = total ? colours.reduce((s2, x) => s2 + x.score * x.weight, 0) / wsum : 0;
    return { silhouette: Math.round(silhouette * 100), colour: Math.round(colour * 100), overall: Math.round((0.6 * silhouette + 0.4 * colour) * 100), colours, drawn: total };
  }


  /* ── unseen: a dark silhouette, lit from behind ─────────
   * Until you have drawn a creature and compared, its picture stays in shadow:
   * every pixel goes dark, the edges the light catches (from behind, upper
   * right) take the rim colour, brightest on the outermost pixel and fading one
   * pixel in, and the far side gets a faint cool bounce. The rim is tinted by
   * the creature's type, so a fire creature glows warm and a water one cool. */
  const RIMS = { ember: "#FFB05A", tide: "#8FE3FF", leaf: "#B8F28A", volt: "#FFF07A", stone: "#EAD9B4", frost: "#DDF6FF", gloom: "#D9A8FF", gale: "#C6F7E4" };
  const SHADE = "#16111E";
  function silhouette(img, type) {
    const { w, h, px } = img, rim = RIMS[type] || "#F4E9C8", soft = mixHex(rim, SHADE, 0.55), bounce = mixHex("#6B78B8", SHADE, 0.6);
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !!px[y * w + x];
    const out = new Array(w * h).fill("");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      let v = SHADE;
      if (!on(x, y - 1) || !on(x + 1, y) || !on(x + 1, y - 1)) v = rim;             // the edge facing the light
      else if (!on(x, y - 2) || !on(x + 2, y) || !on(x + 2, y - 2)) v = soft;      // and a pixel in, fading
      else if (!on(x - 1, y) || !on(x - 1, y + 1)) v = bounce;                     // the far side
      out[y * w + x] = v;
    }
    return { w, h, px: out };
  }

  // The page as it reads before you know who it is: "Who's that?" No name, just "it".
  function veiled(p) {
    const re = new RegExp("\\b" + p.name + "\\b", "g");
    const swap = (t) => t.replace(re, (m, at, str) => (at === 0 || /[.!?]\s+$/.test(str.slice(0, at)) ? "It" : "it"));
    const body = p.body.map(swap);
    return { ...p, name: "???", body, behaviour: swap(p.behaviour), text: body.join("\n\n") };
  }

  /* ── reading a page: from the words to the creature ─────
   * read(text) builds the creature a page describes, for the painter to draw.
   * It reads the physical description sentence by sentence: what the body is
   * covered in and its colour, the underbelly, the head, eyes, ears, what grows
   * on the head, the mouth, arms, legs, wings, back, tail and markings. Each
   * part takes the colour named nearest to it in its own sentence ("a crest of
   * pale aqua", "ears lined with white"). Words it doesn't know are left alone,
   * so a page can be written in plain prose; a part never mentioned isn't drawn.
   * The machine's own slips are read the same way: the words decide the picture. */
  const COLOUR_RE = new RegExp("\\b(" + Object.keys(COLOURS).sort((a, b) => b.length - a.length).map((n) => n.replace(/ /g, "\\s+")).join("|") + ")\\b", "gi");
  const NUMS = { a: 1, an: 1, single: 1, one: 1, two: 2, pair: 2, three: 3, four: 4, five: 5, six: 6 };
  function coloursIn(sentence) {
    const out = []; COLOUR_RE.lastIndex = 0; let m;
    while ((m = COLOUR_RE.exec(sentence))) {
      const after = sentence.slice(m.index + m[0].length, m.index + m[0].length + 8).toLowerCase(), before = sentence.slice(Math.max(0, m.index - 14), m.index).toLowerCase();
      if (/^\s+glint/.test(after) || /colour of\s*$/.test(before)) continue;
      out.push({ name: m[1].toLowerCase().replace(/\s+/g, " "), at: m.index });
    }
    return out;
  }
  // the colour named nearest a word in the sentence, or null
  function colourNear(sentence, word) {
    const i = sentence.toLowerCase().search(word); if (i < 0) return null;
    let best = null, d = Infinity;
    for (const c of coloursIn(sentence)) { const e = Math.abs(c.at - i); if (e < d) { d = e; best = c.name; } }
    return best;
  }
  // the number word nearest before a word ("a row of four copper spikes" is four, not a)
  const countBefore = (sentence, word) => {
    const w = sentence.toLowerCase().replace(/[,.;:]/g, " ").split(/\s+/), at = w.findIndex((x) => x.startsWith(word));
    for (let i = at - 1; at > 0 && i >= Math.max(0, at - 6); i--) if (NUMS[w[i]] && w[i] !== "a" && w[i] !== "an") return NUMS[w[i]];
    return null; };

  function read(text) {
    const all = String(text || "").replace(/\s+/g, " ").trim(), low = all.toLowerCase();
    const sentences = all.split(/(?<=[.!?])\s+/).filter(Boolean);
    const has = (s, re) => re.test(s.toLowerCase());
    const find = (re, not) => sentences.filter((s) => has(s, re) && !(not && has(s, not)));
    const first = sentences[0] || "";
    const spec = { v: 1, name: (all.match(/^([A-Z][\w'-]*)\s+is\s+an?\b/) || [, "Unnamed"])[1] };

    // posture, size, build
    spec.plan = /\bfloat(s|ing)?\b|\bhover/.test(low) ? "floater" : /\blimbless\b|\bno legs\b|\blegless\b/.test(low) ? "blob"
      : /\bquadrupedal\b|\bfour[\s-]legged\b|\bon (its )?four\b/.test(low) ? "quadruped" : /\bbird-like\b/.test(low) ? "avian" : "biped";
    const fl = first.toLowerCase();
    spec.size = /\btiny\b/.test(fl) ? "tiny" : /\bsmall\b/.test(fl) ? "small" : "medium";
    spec.build = spec.plan === "blob" ? "round" : /\b(stocky|barrel|chunky|bulky|heavy-set)\b/.test(fl) ? "stocky" : /\b(slender|lean|lanky|slim)\b/.test(fl) ? "slender" : "round";

    // colours: the body, the underbelly, the eyes
    const coatS = find(/covered in|\bbody is\b|\b(fur|scales|skin|feathers|plumage|hide|down|shell)\b/, /underbelly|eyes/)[0] || first;
    const main = (coloursIn(coatS)[0] || coloursIn(first)[0] || { name: "granite" }).name;
    const bm = all.match(new RegExp(COLOUR_RE.source + "\\s+(under)?belly", "i")) || all.match(new RegExp("belly is\\s+" + COLOUR_RE.source, "i"));
    const belly = bm ? bm[1].toLowerCase().replace(/\s+/g, " ") : null;
    const eyeS = find(/\beyes\b/)[0] || "";
    const em = eyeS.match(new RegExp(COLOUR_RE.source + "\\s+iris", "i")) || eyeS.match(new RegExp("solid\\s+" + COLOUR_RE.source, "i"));
    spec.colours = { main, belly, eye: em ? em[1].toLowerCase().replace(/\s+/g, " ") : "black", parts: {} };
    const parts = spec.colours.parts;

    // the head
    // what is said right after "head", up to the end of its sentence ("its head is broad, with narrow eyes")
    const headS = [...low.matchAll(/\bhead\b/g)].map((m) => low.slice(m.index, m.index + 48).split(".")[0]).join(" | ");
    spec.head = { shape: spec.plan === "blob" ? "round" : /flat-topped|flat head/.test(headS) ? "flat" : /pointed chin|pointed face|narrow(s|ing)? to/.test(headS) ? "pointed" : /\b(broad|wide|wider)\b/.test(headS) ? "wide" : "round",
      big: /\b(oversized|huge|big|large) head\b/.test(low) };
    const eyeL = eyeS.toLowerCase();
    spec.eyes = { shape: /heavy-lidded|half[\s-]closed|sleepy/.test(eyeL) ? "sleepy" : /\b(large|big|glossy|huge)\b[^.]*\beyes/.test(eyeL) ? "large" : /\b(narrow|almond)/.test(eyeL) ? "narrow" : "round",
      pupil: /\bslit/.test(eyeL) ? "slit" : /\bsolid\b|no pupils/.test(eyeL) ? "none" : /pupils|irises/.test(eyeL) ? "round" : "none" };

    // ears
    const earS = find(/\b(ears|frills|tufts|gills)\b/)[0];
    if (earS) { const e = earS.toLowerCase();
      const kind = /frills|gills/.test(e) ? "frills" : /tufts/.test(e) ? "tufted" : /floppy|droop|hang/.test(e) ? "floppy" : /\blong\b/.test(e) ? "long" : /pointed|triangular/.test(e) ? "pointed" : "round";
      const inner = (kind === "pointed" || kind === "long") && /insides|lined|inner/.test(e);
      spec.ears = { kind, inner };
      const ec = kind === "frills" ? colourNear(earS, /frills|gills/) : inner ? colourNear(earS, /insides|lined|inner/) : null;
      if (ec) parts.ears = ec;
    } else spec.ears = null;

    // what grows on the head (never the tail's tip)
    const crownS = find(/\b(flame|horns?|crest|stem|sprout|leaves|antennae|crystal|gem)\b/, /\btail\b/).find((s) => has(s, /\bhead\b|\bforehead\b|\bcrown\b|\bbrow\b/));
    if (crownS) { const c = crownS.toLowerCase();
      const kind = /antennae/.test(c) ? "antennae" : /crystal|gem/.test(c) ? "crystal" : /stem|sprout|leaves/.test(c) ? "sprout" : /crest/.test(c) ? "crest" : /\bflame/.test(c) ? "flame"
        : /\bhorns\b|two[^.]*horn|pair of horns/.test(c) ? "horns" : "horn";
      spec.crown = { kind };
      const cc = colourNear(crownS, { antennae: /bulb|antennae/, crystal: /crystal|gem/, sprout: /^$/, crest: /crest/, flame: /flame/, horns: /horn/, horn: /horn/ }[kind]);
      if (cc && kind !== "sprout") parts.crown = cc;
    } else spec.crown = null;

    // the mouth
    spec.muzzle = /\btusks\b/.test(low) ? "tusks" : /\bmandibles\b/.test(low) ? "mandibles" : /\bbeak\b/.test(low) ? "beak" : /\bfangs\b/.test(low) ? "fangs"
      : /mouth is (very )?wide|wide mouth|cheek to cheek/.test(low) ? "wide" : /\bsnout\b|\bmuzzle\b|\bnose\b/.test(low) ? "snout" : "none";
    if (spec.muzzle === "beak") { const bc = colourNear(find(/\bbeak\b/)[0], /beak/); if (bc) parts.muzzle = bc; }

    // arms and legs
    const armS = spec.plan === "quadruped" ? null : find(/\barms?\b|\bflippers\b/, /\bno arms\b/)[0];
    if (armS) { const a = armS.toLowerCase();
      const kind = /flipper/.test(a) ? "flippers" : /claw/.test(a) ? "clawed" : /mitten/.test(a) ? "mittens" : /paw/.test(a) ? "paws" : "stubby";
      spec.arms = { kind, digits: kind === "clawed" ? countBefore(armS, "claws") || 3 : kind === "paws" ? 3 : 0 };
    } else spec.arms = null;
    const legS = find(/\blegs?\b/, /\bno legs\b|underbelly|tops of its legs/)[0] || "", lg = legS.toLowerCase();
    const toes = countBefore(legS, "toes") || (lg.match(/\b(two|three|four)-toed/) ? NUMS[lg.match(/\b(two|three|four)-toed/)[1]] : 3);
    spec.legs = spec.plan === "biped" || spec.plan === "avian" ? { count: 2, kind: spec.plan === "avian" || /\bthin legs\b/.test(lg) && /toed/.test(lg) ? "thin" : /\blong\b/.test(lg) ? "long" : "stubby", toes }
      : spec.plan === "quadruped" ? { count: 4, kind: /hoo(f|ves)/.test(lg) ? "hooved" : "stubby", toes: /hoo(f|ves)/.test(lg) ? 0 : toes }
      : { count: 0, kind: spec.plan };

    // wings and back
    const wingS = find(/\bwings\b/)[0];
    if (wingS) { const w = wingS.toLowerCase(); spec.wings = { kind: /insect|translucent|dragonfly/.test(w) ? "insect" : /feather/.test(w) ? "feather" : "bat" };
      const wc = colourNear(wingS, spec.wings.kind === "feather" ? /tips/ : spec.wings.kind === "insect" ? /edged|wings/ : /wings/); if (wc) parts.wings = wc; } else spec.wings = null;
    const backS = find(/\b(spikes|shell|plates)\b|\bfin\b[^.]*\bback\b/, /\btail\b|covered in/)[0];
    if (backS) { const b = backS.toLowerCase(), kind = /spikes/.test(b) ? "spikes" : /shell/.test(b) ? "shell" : /plates/.test(b) ? "plates" : "fin";
      spec.back = { kind, count: kind === "spikes" ? countBefore(backS, "spikes") || 3 : 0 };
      const bc = colourNear(backS, new RegExp(kind === "fin" ? "\\bfin" : kind)); if (bc) parts.back = bc; } else spec.back = null;

    // the tail and its tip
    const tailT = find(/\btail\b/, /stripe|spots?\b|banded|marking/).join(" "), tl = tailT.toLowerCase();
    if (tailT && !/\bno tail\b/.test(tl)) {
      const kind = /\bnub\b|stub of a tail/.test(tl) ? "nub" : /fluffy|bushy|plume/.test(tl) ? "fluffy" : /\bfin\b/.test(tl) ? "fin" : /loop|curled|coil/.test(tl) ? "curled" : "long";
      const tip = kind !== "long" && kind !== "curled" ? null : /flame/.test(tl) ? "flame" : /\bleaf\b/.test(tl) ? "leaf" : /lightning|bolt|zigzag/.test(tl) ? "bolt" : /bulb|\bball\b|\borb\b/.test(tl) ? "ball"
        : /spade/.test(tl) ? "spade" : /\bclub\b/.test(tl) ? "club" : /feather/.test(tl) ? "feather" : null;
      spec.tail = { kind, tip };
      if (tip) { const tc = colourNear(tailT, { flame: /flame/, bolt: /bolt|zigzag|lightning/, ball: /bulb|ball|orb/, feather: /feather/, leaf: /leaf/, spade: /spade/, club: /club/ }[tip]); if (tc && tip !== "leaf") parts.tip = tc; }
    } else spec.tail = null;

    // markings
    const patS = find(/\bstripes?\b|\bspots?\b|\bmarking\b|\bbanded with\b/, /crystal|covered in|underbelly/)[0];
    if (patS) { const p = patS.toLowerCase();
      const where = /forehead/.test(p) ? "forehead" : /cheek/.test(p) ? "cheeks" : /shoulder/.test(p) ? "shoulders" : /chest|belly/.test(p) ? "chest" : /tail/.test(p) ? "tail" : "chest";
      const kind = where === "tail" ? "band" : /diamond/.test(p) ? "diamond" : /stripe/.test(p) ? "stripes" : "spots";
      const word = kind === "stripes" ? "stripes" : kind === "spots" ? "spots" : "diamond";
      spec.pattern = { kind, where, colour: colourNear(patS, new RegExp(kind === "band" ? "banded" : word.replace(/s$/, ""))) || main,
        count: kind === "stripes" || kind === "spots" ? countBefore(patS, word) || (where === "cheeks" ? 2 : 3) : 1 };
    } else spec.pattern = null;

    spec.colours.accent = parts.crown || parts.ears || parts.wings || parts.back || parts.tip || parts.muzzle || null;
    return spec;
  }

  /* ── pages ─────────────────────────────────────────────
   * Every creature has a page: who it is, a physical description, and a line
   * on how it lives. The six toys that live in the machine have pages written
   * by hand; every other creature's page is written from a seed. Either way the
   * creature is read from its own words (read), and its picture drawn from that. */
  const TOY_PAGES = {
    emberkit: { name: "Emberkit", type: "ember", category: "The Ember Drake Creature", height: 0.3, weight: 2.4, body: [
      "Emberkit is a small, bipedal, reptilian creature with a round, pudgy body covered in smooth vermilion scales. Its cream underbelly runs from its throat to the tops of its legs.",
      "Its oversized head is round. It has large, glossy eyes that are solid black, each with a single white glint. A small flame of saffron flickers on the crown of its head. Two small white fangs poke down over its lower lip.",
      "It has two short arms, each ending in three small, sharp claws. It stands on two short, thick legs with three toes on each foot.",
      "A long, thin tail curls up behind it on one side, ending in a flickering, flame-shaped tip of saffron."],
      behaviour: "Emberkit dozes for most of the day, and the flame on its head burns low while it sleeps. It flares up bright the moment it wakes, which is how you can tell it is ready to play." },
    sproutle: { name: "Sproutle", type: "leaf", category: "The Seedling Creature", height: 0.3, weight: 2.1, body: [
      "Sproutle is a small, bipedal, toad-like creature with a round, pudgy body covered in smooth fern skin. Its cream underbelly runs from its throat to the tops of its legs.",
      "Its oversized head is round. It has large, glossy eyes that are solid black, each with a single white glint. Two small, round ears sit on top of its head. A short stem grows from the top of its head and splits into two green leaves. It has a short, rounded snout the colour of its underbelly, with a small dark nose.",
      "Its two short arms end in round paws. It stands on two short, thick legs with three toes on each foot.",
      "It has a small, round nub of a tail, just visible beside one hip. A round blossom pink spot marks each cheek."],
      behaviour: "Sproutle naps in sunny spots with its leaves spread wide, and wakes up hungry. When it is happy the two leaves on its head stand straight up." },
    tidepup: { name: "Tidepup", type: "tide", category: "The Tide Pool Creature", height: 0.4, weight: 3.6, body: [
      "Tidepup is a small, bipedal, amphibian creature with a round, pudgy body covered in smooth cerulean skin. Its white underbelly runs from its throat to the tops of its legs.",
      "Its oversized head is broad and wider than it is tall. It has large, glossy eyes that are solid black, each with a single white glint. Three short, feathery frills of pale aqua fan out from each side of its head, like gills. A spiky crest of pale aqua runs over the top of its head in three points. Its mouth is very wide, a thin line that stretches almost from cheek to cheek.",
      "Its two stubby arms end in mitten-like hands with no visible fingers. It stands on two short, thick legs with three toes on each foot.",
      "Its broad, flat tail ends in a tall fin that shows behind it on one side."],
      behaviour: "Tidepup sleeps floating on its back in shallow tide pools, its frills fanned out on the water. It is a strong swimmer, and steers with its tail fin." },
    voltbug: { name: "Voltbug", type: "volt", category: "The Static Bug Creature", height: 0.3, weight: 0.9, body: [
      "Voltbug is a small, bird-like, bipedal, insectoid creature with a round, pudgy body covered in fuzzy canary down. Its pale yellow underbelly runs from its throat to the tops of its legs.",
      "Its oversized head is round. It has large, glossy eyes that are solid black, each with a single white glint. Two thin antennae rise from its head, each tipped with a round white bulb. It has no visible mouth.",
      "It has two stubby little arms held close to its sides. It stands on two thin legs, each with a three-toed foot. Two pairs of translucent, insect-like wings, edged in white, spread from behind its shoulders."],
      behaviour: "Voltbug builds up static as it buzzes about, and the bulbs on its antennae glow when it is charged. It sleeps clinging to warm lamps and window sills." },
    pebblor: { name: "Pebblor", type: "stone", category: "The Pebble Golem Creature", height: 0.5, weight: 21.5, body: [
      "Pebblor is a small, bipedal creature with a stocky, barrel-shaped body covered in a rough granite hide. Its light grey underbelly runs from its throat to the tops of its legs.",
      "Its oversized head is round. It has large, glossy eyes that are solid black, each with a single white glint. A diamond-shaped pale cyan crystal grows from the top of its head. Its mouth is very wide, a thin line that stretches almost from cheek to cheek.",
      "Its two stubby arms end in mitten-like hands with no visible fingers. It stands on two short, thick legs with three toes on each foot."],
      behaviour: "Pebblor can sit without moving for days, and is easily mistaken for a rock. The crystal on its head grows a little every year it sleeps." },
    gloombat: { name: "Gloombat", type: "gloom", category: "The Dusk Bat Creature", height: 0.3, weight: 1.2, body: [
      "Gloombat is a small, floating, bat-like creature with a round, pudgy body covered in velvety violet fur. Its lilac underbelly runs from its throat to the base of its body.",
      "Its oversized head is round. It has large, glossy eyes that are solid black, each with a single white glint. A pair of tall, pointed ears stands up from the top of its head. Two small white fangs poke down over its lower lip.",
      "It has no legs: its body tapers to a rounded point, and it floats a little above the ground. A pair of lilac bat-like wings, each with three bony points along its edge, spreads from its back."],
      behaviour: "Gloombat sleeps all day hanging in dark corners, wrapped in its wings, and drifts about at dusk. It is shy, but follows anyone who leaves a light on." },
  };
  const TOY_IDS = Object.keys(TOY_PAGES).map((k) => "toy:" + k);

  const BEHAVIOUR = {
    ember: ["naps in warm, sunny spots, and its body gives off a gentle heat when it is content.", "is never far from a fire, and curls up beside embers to sleep."],
    tide: ["is most often found in tide pools and slow streams, where it floats on its back to rest.", "can hold its breath for a very long time, and sleeps underwater."],
    leaf: ["spends sunny afternoons perfectly still, soaking up the light.", "buries itself in damp earth at night and comes up at dawn."],
    volt: ["builds up static as it moves, and small sparks crackle off it when it is startled.", "is drawn to anything that hums, and sleeps curled against warm machines."],
    stone: ["is very patient, and can sit unmoving for days, which makes it easy to mistake for a rock.", "chews on pebbles to keep its teeth worn down."],
    frost: ["prefers cold places, and the air around it is always a little chilly.", "sleeps buried in snowdrifts, and leaves a trail of frost behind it."],
    gloom: ["is active at night, and sleeps through the day in dark, quiet corners.", "is shy, and hides in its own shadow when it is watched."],
    gale: ["rides gusts of wind, and is often seen drifting high above open fields.", "naps in high places where the breeze is strongest."],
  };

  // A page by id: "toy:tidepup", or "seed:12345" for a creature the machine made up.
  function page(id) {
    id = String(id || "");
    let p;
    if (id.startsWith("toy:") && TOY_PAGES[id.slice(4)]) { const t = TOY_PAGES[id.slice(4)]; p = { ...t, body: t.body.slice() }; }
    else {
      const seed = Number(id.replace(/^seed:/, "")) >>> 0, s = make(seed), d = describe(s), r = rng(seed ^ 0x5bd1e995);
      p = { name: d.name, type: s.type, category: d.category, height: d.height, weight: d.weight, body: d.paragraphs, behaviour: d.name + " " + r.pick(BEHAVIOUR[s.type]) };
      id = "seed:" + seed;
    }
    const spec = read(p.body.join(" "));
    spec.type = p.type;
    return { id, ...p, text: p.body.join("\n\n"), spec };
  }

  return { make, describe, read, page, sprite, silhouette, veiled, compare, rng, COLOURS, TYPES, BEASTS, TOY_IDS, RIMS, rgbOf };
})();

if (typeof module !== "undefined") module.exports = Capsules;
