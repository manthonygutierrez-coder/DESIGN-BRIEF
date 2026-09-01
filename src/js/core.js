/* ── state ──────────────────────────────────────────── */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let current = 0;          // committed category index
let preview = 0;          // previewed category index
let briefIdx = 0;
let atScreen = false;
let busy = false;

const $ = (id) => document.getElementById(id);
const track = $("track"), sideWorld = $("sideWorld"), sideScreen = $("sideScreen");
const pickerEl = $("picker"), pickerBtn = $("pickerBtn"), pickerList = $("pickerList"), pickerVal = $("pickerVal");
const wTitle = $("wTitle"), wConcept = $("wConcept");
const scenes = [...document.querySelectorAll(".scene")];
