"use strict";
/* ── the tools, as one model ──────────────────────────────
 * Vector, Pixel and Layout each keep their own tools, but they answer to the
 * same few questions: what does this tool do (a line for the status bar), what
 * does the pointer look like over the work, which key picks it, and what is
 * the tool you come back to when you press Escape. This is where those live,
 * so the modes agree and the shortcut sheet can list them without a second
 * copy to keep true.
 *
 *   hint(mode, tool)          the status line for a tool
 *   cursor(tool, ctx)         the CSS cursor over the work
 *   home(mode)                the tool Escape returns to
 *   keyMap(mode, tools)       { key: tool id }, with the aliases a mode adds
 *   conflicts(mode, tools)    keys two tools both claim (for tests)
 *   sheet(mode, tools, extra) the shortcut sheet: [{ title, rows: [[keys, what]] }]
 *   MODE_KEYS                 the keys that switch mode
 *
 * Pure: no DOM.
 */

const SuiteTools = (() => {
  const MODE_KEYS = { vector: "1", pixel: "2", layout: "3", frames: "4" };

  const HOME = { vector: "select", pixel: "select", layout: "select", frames: "select" };
  const home = (mode) => HOME[mode] || "select";

  // What a tool does, in the words the status bar shows when it is picked. A
  // mode's own line (mode:tool) wins over the general one (tool).
  const HINTS = {
    select: "Click to select, drag to move. Shift adds to the selection; Alt-drag leaves a copy behind.",
    "pixel:select": "Drag a box, then drag inside it to move the pixels. Shift adds another box; Alt takes one away.",
    "layout:select": "Click a block to edit it, drag it to move it up or down the page. Arrows nudge it along.",
    node: "Drag points and handles. Click an outline to add a point, Alt-click a point to remove it.",
    pen: "Click for a corner, drag for a curve. Enter finishes; Esc leaves it as it is.",
    "pixel:pen": "Click, or drag for a curve. Enter lays the line down in pixels.",
    shape: "Drag out the shape. Shift keeps it square or round; Alt draws from the centre.",
    rect: "Drag out a rectangle. Shift makes a square, Alt draws from the centre.",
    "pixel:rect": "Drag a box of pixels. Shift makes a square. Outline or filled is up in the strip.",
    ellipse: "Drag out an ellipse. Shift makes a circle, Alt draws from the centre.",
    "pixel:ellipse": "Drag out an ellipse of pixels. Shift makes a circle.",
    polygon: "Drag out a polygon or star: sides and points are in the strip.",
    line: "Drag a line. Shift snaps the angle.",
    "pixel:line": "Drag a line of pixels. Shift keeps clean steps: 1:1, 2:1, 3:1.",
    text: "Click to write. Click a shape's outline to write along it. Double-click words later to change them.",
    "pixel:text": "Click where the words go, type them, Enter stamps them in the pixel face.",
    "layout:text": "Click a block to write in it.",
    build: "Drag across shapes to merge them. Alt-drag to cut.",
    eyedrop: "Click the work to take a colour from it.",
    image: "Click the work to choose a picture from disk.",
    hand: "Drag to move around the work. Holding Space does the same with any tool.",
    pencil: "Draw a pixel at a time. Shift-click a line from the last pixel; Alt-click picks a colour; right-click rubs out.",
    erase: "Rub pixels out. Shift-click a line from the last pixel; right-click paints instead.",
    fill: "Fill the area you click. The strip chooses joined pixels or every pixel of that colour.",
    pick: "Click a pixel to draw with its colour.",
    wand: "Click a colour to select it. Tolerance is in the strip; Shift adds, Alt takes away.",
  };
  const hint = (mode, tool) => HINTS[mode + ":" + tool] || HINTS[tool] || "";

  // The pointer over the work. `ctx` says what is under it: over a selection
  // (pixel), over a handle or a guide (vector, which draws its own).
  const CURSORS = {
    select: "default", node: "default", hand: "grab", eyedrop: "cell", pick: "cell", text: "text",
    image: "copy", fill: "crosshair", wand: "crosshair",
  };
  function cursor(tool, ctx = {}) {
    if (ctx.panning) return "grabbing";
    if (ctx.space || tool === "hand") return "grab";
    if (tool === "select" && ctx.overSel) return "move";
    return CURSORS[tool] || "crosshair";
  }

  // Keys: a tool's own, plus what a mode adds as a second way in.
  const ALIASES = { pixel: { v: "select" }, frames: { v: "select" } };
  function keyMap(mode, tools) {
    const map = {};
    for (const t of tools) if (t.key) map[t.key.toLowerCase()] = t.id;
    for (const [k, id] of Object.entries(ALIASES[mode] || {})) if (!(k in map)) map[k] = id;
    return map;
  }
  function conflicts(mode, tools) {
    const seen = {}, out = [];
    for (const t of tools) {
      if (!t.key) continue;
      const k = t.key.toLowerCase();
      if (seen[k]) out.push(k);
      seen[k] = t.id;
    }
    return out;
  }

  // What every mode does the same way.
  const SHARED = [
    ["Cmd+Z", "Undo"], ["Shift+Cmd+Z", "Redo"], ["Cmd+S", "Save"],
    ["Cmd+1", "Vector"], ["Cmd+2", "Pixel"], ["Cmd+3", "Layout"], ["Cmd+4", "Frames"],
    ["Cmd+=", "Zoom in"], ["Cmd+-", "Zoom out"], ["Cmd+0", "Fit to the window"],
    ["Space", "Hold to move around"], ["Esc", "Step back; then back to Select"], ["?", "This sheet"],
  ];
  const EDIT = {
    vector: [["Cmd+A", "Select all"], ["Cmd+D", "Duplicate"], ["Cmd+C / X / V", "Copy, cut, paste"], ["Del", "Delete"],
      ["Arrows", "Nudge 1 px (Shift: 10)"], ["[  ]", "Send back, bring forward (Shift: to the end)"], ["X", "Swap fill and stroke"], ["'", "Grid"]],
    pixel: [["Cmd+A", "Select everything"], ["Cmd+I", "Invert the selection"], ["Cmd+C / X / V", "Copy, cut, paste the selection"], ["Del", "Clear the selection"],
      ["Arrows", "Move the selection 1 px (Shift: 10)"], ["Shift+H / V / R", "Flip, flip, turn the selection"], ["X", "Mirror (when earned)"], ["Alt-click", "Pick a colour"]],
    layout: [["Up / Down", "Select the previous, next block"], ["Alt+Up / Down", "Move the block up or down the page"], ["Cmd+D", "Duplicate the block"], ["Del", "Delete the block"], ["Drag", "A block, to a new place on the page"]],
    frames: [[",  .", "Previous, next frame"], ["Enter", "Play, pause"], ["[  ]", "Onion skin fewer, more"], ["Cmd+D", "Duplicate the frame"]],
  };
  function sheet(mode, tools, extra) {
    const t = tools.filter((x) => x.key).map((x) => [x.key.toUpperCase(), (x.label || x.id).split(/[:(]/)[0].trim()]);
    for (const [k, id] of Object.entries(ALIASES[mode] || {})) {
      const base = tools.find((x) => x.id === id);
      if (base && (base.key || "").toLowerCase() !== k) t.push([k.toUpperCase(), (base.label || id).split(/[:(]/)[0].trim() + " (also)"]);
    }
    const groups = [{ title: "TOOLS", rows: t }, { title: "EDITING", rows: EDIT[mode] || [] }, { title: "EVERY MODE", rows: SHARED }];
    if (extra && extra.length) groups.splice(2, 0, { title: "THIS JOB", rows: extra });
    return groups.filter((g) => g.rows.length);
  }

  return { MODE_KEYS, HINTS, home, hint, cursor, keyMap, conflicts, sheet, SHARED };
})();

if (typeof module !== "undefined") module.exports = SuiteTools;
