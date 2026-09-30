"use strict";
/* ── the pixel kit: what every research game draws with ───
 * The games draw on small canvases, a pixel at a time, and never write with
 * a smooth font: words on a canvas are this 3 × 5 pixel font.
 *
 *   text(ctx, str, x, y, colour, scale)   upper-case pixel text; returns its width
 *   measure(str, scale)                   how wide text would be
 *   blit(ctx, rows, x, y, pal, flip)      a sprite: rows of palette letters, "." clear
 *   person(ctx, x, y, look, dir, step)    an 8 × 12 person, facing "down" "up" "left"
 *                                         "right", on step 0 (standing), 1 or 2
 *   lookOf(cam)                           a person's look from your camera's
 *   hash(a, b)                            a number from two, the same every time
 *
 * A look: { skin, hair, top, legs, style?, accent?, hat?, apron?, cardigan?,
 * glasses?, tape?, beard? } (colours as "#RRGGBB"; style "short" "long" "bun"
 * "bald" "cap").
 */

const PixKit = (() => {
  const G = (s) => s.split(" ");
  const FONT = {
    A: G(".#. #.# ### #.# #.#"), B: G("##. #.# ##. #.# ##."), C: G(".## #.. #.. #.. .##"), D: G("##. #.# #.# #.# ##."),
    E: G("### #.. ##. #.. ###"), F: G("### #.. ##. #.. #.."), G: G(".## #.. #.# #.# .##"), H: G("#.# #.# ### #.# #.#"),
    I: G("### .#. .#. .#. ###"), J: G("..# ..# ..# #.# .#."), K: G("#.# #.# ##. #.# #.#"), L: G("#.. #.. #.. #.. ###"),
    M: G("#...# ##.## #.#.# #...# #...#"), N: G("#..# ##.# #.## #..# #..#"), O: G(".#. #.# #.# #.# .#."), P: G("##. #.# ##. #.. #.."),
    Q: G(".#. #.# #.# ##. .##"), R: G("##. #.# ##. #.# #.#"), S: G(".## #.. .#. ..# ##."), T: G("### .#. .#. .#. .#."),
    U: G("#.# #.# #.# #.# ###"), V: G("#.# #.# #.# #.# .#."), W: G("#...# #...# #.#.# ##.## #...#"), X: G("#.# #.# .#. #.# #.#"),
    Y: G("#.# #.# .#. .#. .#."), Z: G("### ..# .#. #.. ###"),
    0: G("### #.# #.# #.# ###"), 1: G(".#. ##. .#. .#. ###"), 2: G("##. ..# .#. #.. ###"), 3: G("##. ..# .#. ..# ##."),
    4: G("#.# #.# ### ..# ..#"), 5: G("### #.. ##. ..# ##."), 6: G(".## #.. ### #.# ###"), 7: G("### ..# .#. .#. .#."),
    8: G("### #.# ### #.# ###"), 9: G("### #.# ### ..# ##."),
    "!": G(".#. .#. .#. ... .#."), "?": G("##. ..# .#. ... .#."), ".": G("... ... ... ... .#."), ",": G("... ... ... .#. #.."),
    ":": G("... .#. ... .#. ..."), "-": G("... ... ### ... ..."), "+": G("... .#. ### .#. ..."), "/": G("..# ..# .#. #.. #.."),
    "'": G(".#. .#. ... ... ..."), "×": G("... #.# .#. #.# ..."), "&": G(".#. #.# .#. #.# .##"), "£": G(".## #.. ### #.. ###"),
    "$": G(".## ##. .#. .## ##."), "%": G("#.# ..# .#. #.. #.#"), "=": G("... ### ... ### ..."), "#": G("#.# ### #.# ### #.#"),
    "(": G(".#. #.. #.. #.. .#."), ")": G(".#. ..# ..# ..# .#."), "*": G("... #.# .#. #.# ..."), " ": G("... ... ... ... ..."),
  };
  // Most letters are 3 wide; M, N and W need more to be told apart.
  const glyph = (ch) => FONT[ch] || FONT[ch.toUpperCase()] || FONT["?"];
  const measure = (str, scale = 1) => {
    let w = 0;
    for (const ch of String(str)) w += glyph(ch)[0].length + 1;
    return Math.max(0, w - 1) * scale;
  };
  function text(ctx, str, x, y, colour, scale = 1) {
    ctx.fillStyle = colour;
    let cx = Math.round(x);
    for (const ch of String(str)) {
      const g = glyph(ch), gw = g[0].length;
      for (let j = 0; j < 5; j++) for (let i = 0; i < gw; i++) if (g[j][i] === "#") ctx.fillRect(cx + i * scale, Math.round(y) + j * scale, scale, scale);
      cx += (gw + 1) * scale;
    }
    return measure(str, scale);
  }

  // A sprite from rows of palette letters. pal: letter → colour ("." is clear).
  function blit(ctx, rows, x, y, pal, flip) {
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < w; i++) {
        const c = pal[r[i]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x + (flip ? w - 1 - i : i), y + j, 1, 1);
      }
    }
  }

  /* ── people ──────────────────────────────────────────────
   * 8 × 12, standing on the bottom row. h hair, s skin, k dark (eyes, shoes),
   * c top, l legs. A step lifts one foot and the body a pixel.            */
  const BODY = {
    down: ["..hhhh..", ".hhhhhh.", ".hssssh.", ".skssks.", "..ssss..", ".cccccc.", "sccccccs", "sccccccs", ".cccccc.", ".llllll.", ".ll..ll.", ".kk..kk."],
    up:   ["..hhhh..", ".hhhhhh.", ".hhhhhh.", ".hhhhhh.", "..hhhh..", ".cccccc.", "sccccccs", "sccccccs", ".cccccc.", ".llllll.", ".ll..ll.", ".kk..kk."],
    left: ["..hhhh..", ".hhhhhh.", ".ssshhh.", ".kssshh.", "..ssss..", "..cccc..", "..cccc..", "..sccc..", "..cccc..", "..llll..", "..l..l..", ".kk..kk."],
  };
  // What a hair style changes: rows it replaces, per facing.
  const STYLE = {
    long: { down: { 2: ".hsssshh", 3: "hskssksh", 4: "hhssssh.", 5: "hccccccc" }, up: { 4: ".hhhhhh.", 5: "hhcccchh" }, left: { 3: ".ksshhhh", 4: "..sshhh.", 5: "..cchhh." } },
    bun:  { down: { 0: "...hh...", 1: "..hhhh..", 2: ".hhhhhh." }, up: { 0: "...hh...", 1: "..hhhh..", 2: ".hhhhhh." }, left: { 0: "....hh..", 1: "..hhhhh.", 2: ".hhhhhh." } },
    bald: { down: { 0: "........", 1: "..ssss..", 2: ".ssssss." }, up: { 0: "........", 1: "..ssss..", 2: ".ssssss.", 3: ".ssssss.", 4: "..ssss.." }, left: { 0: "........", 1: "..ssss..", 2: ".ssssss.", 3: ".ksssss." } },
    cap:  { down: { 0: "..tttt..", 1: ".tttttt.", 2: "tthsshtt" }, up: { 0: "..tttt..", 1: ".tttttt.", 2: ".tttttt." }, left: { 0: "..tttt..", 1: ".tttttt.", 2: "ttsshhh." } },
  };
  function rowsFor(look, dir) {
    const d = dir === "right" ? "left" : dir;
    const rows = BODY[d].slice();
    const st = STYLE[look.style] && STYLE[look.style][d];
    if (st) for (const [j, r] of Object.entries(st)) rows[j] = r;
    if (look.beard && d !== "up") rows[4] = d === "down" ? "..hhhh.." : "..hhhs..";
    return rows;
  }
  function person(ctx, x, y, look, dir = "down", step = 0) {
    const rows = rowsFor(look, dir), flip = dir === "right";
    const pal = { h: look.hair, s: look.skin, k: look.dark || "#1A1418", c: look.top, l: look.legs || "#3A3A48", t: look.hat || look.top };
    // A step: the whole body rises a pixel and one foot lifts (the left on
    // step 1, the right on 2), its shoe where the leg ended.
    const lift = step ? 1 : 0;
    const body = rows.slice(0, 11).map((r) => r.split("")), feet = rows[11].split("");
    const up = step === 1 ? [1, 2] : step === 2 ? [5, 6] : [];
    for (const i of up) { if (feet[i] === "k") { body[10][i] = "k"; feet[i] = "."; } }
    blit(ctx, body.map((r) => r.join("")), x, y - lift, pal, flip);
    blit(ctx, [feet.join("")], x, y + 11 - lift, pal, flip);
    const at = (i, j, c) => { ctx.fillStyle = c; ctx.fillRect(x + (flip ? 7 - i : i), y - lift + j, 1, 1); };
    if (look.apron && dir !== "up") for (let j = 6; j <= 9; j++) for (let i = 2; i <= 5; i++) at(i, j, look.apron);
    if (look.cardigan) for (let j = 5; j <= 8; j++) { if (dir === "down") { at(1, j, look.cardigan); at(6, j, look.cardigan); at(2, j, look.cardigan); at(5, j, look.cardigan); } else if (dir === "up") for (let i = 1; i <= 6; i++) at(i, j, look.cardigan); else { at(2, j, look.cardigan); at(3, j, look.cardigan); at(4, j, look.cardigan); } }
    if (look.tape && dir === "down") { at(2, 5, look.tape); at(5, 5, look.tape); at(2, 6, look.tape); at(5, 7, look.tape); at(5, 8, look.tape); }
    if (look.tape && dir !== "down" && dir !== "up") { at(3, 5, look.tape); at(3, 6, look.tape); }
    if (look.glasses && dir === "down") { at(1, 3, look.glasses); at(3, 3, look.glasses); at(4, 3, look.glasses); at(6, 3, look.glasses); at(2, 3, look.glasses); at(5, 3, look.glasses); }
    if (look.glasses && (dir === "left" || dir === "right")) { at(1, 3, look.glasses); at(2, 3, look.glasses); }
  }

  // Your camera's look, as a person: skin, hair, what you wear.
  function lookOf(cam) {
    const l = (cam && cam.look) || {};
    const covered = ["cap", "beanie", "headscarf", "hijab", "turban"].includes(l.style);
    const long = ["long", "ponytail", "braids", "locs", "pigtails"].includes(l.style);
    return {
      skin: l.skin || "#E0A87C", hair: covered ? (l.hat || "#2F6FC0") : l.hair || "#3A2A1E", top: l.garment || "#2F6FC0",
      legs: "#34344A", style: l.style === "bald" || l.style === "buzz" ? "bald" : covered ? "cap" : long ? "long" : l.style === "bun" ? "bun" : "short",
      hat: l.hat, glasses: l.specs && l.specs !== "none" ? "#1A1418" : null, beard: l.facial === "beard",
    };
  }

  function hash(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
  }

  return { FONT, text, measure, blit, person, rowsFor, lookOf, hash };
})();

if (typeof module !== "undefined") module.exports = PixKit;
