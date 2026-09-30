/* ── state ──────────────────────────────────────────── */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let atScreen = false;     // at the desk (true) or on the start screen
let busy = false;         // crossing between them

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const track = $("track"), sideWorld = $("sideWorld"), sideScreen = $("sideScreen");
