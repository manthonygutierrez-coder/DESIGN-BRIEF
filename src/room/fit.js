// fit.js — the room's arithmetic, kept free of three.js and the DOM so node
// can test it: how big the room's pixels are, how far from the glass the
// camera has to be for the screen to fill the view, and what the sky outside
// is doing at this hour.

// The room is drawn at a fraction of the window's resolution and scaled up by
// a whole number, so every room pixel is the same size on screen. Returns the
// canvas size in room pixels and its CSS box, centred in the window.
export function pixelCanvas(cssW, cssH, px) {
  const p = Math.max(1, Math.round(px));
  const cols = Math.max(1, Math.floor(cssW / p)), rows = Math.max(1, Math.floor(cssH / p));
  const w = cols * p, h = rows * p;
  return { cols, rows, w, h, left: Math.floor((cssW - w) / 2), top: Math.floor((cssH - h) / 2) };
}

// Distance from a w×h rectangle, facing the camera, at which it fills a view
// of the given vertical fov (degrees) and aspect. "cover" fills the whole view
// (the rectangle's edges run off it); "contain" shows all of the rectangle.
export function fitDistance(w, h, fovDeg, aspect, mode = "cover") {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const byH = h / 2 / t, byW = w / 2 / (t * aspect);
  return mode === "cover" ? Math.min(byH, byW) : Math.max(byH, byW);
}

// The CRT's glass and the game's layout share one shape: the game lays out at
// `base` CSS pixels wide and whatever height keeps the glass's proportions.
export function screenSize(glassW, glassH, base = 1024) {
  return { w: base, h: Math.round((base * glassH) / glassW) };
}

// What the window shows at a given hour (0–24, fractional): the phase of the
// day, how much daylight there is (0 night … 1 noon) and whether the city's
// lights are on. Dawn and dusk blend over an hour either side.
export function skyAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  const ramp = (a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  const day = h < 12 ? ramp(5.5, 8) : 1 - ramp(17.5, 20.5);
  const phase = h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17.5 ? "day" : h >= 17.5 && h < 21 ? "dusk" : "night";
  return { phase, day, lights: day < 0.55 };
}

// A small, seeded generator, so a session's weather and a poster's grain come
// out the same every time they are drawn.
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The weather for a session: mostly clear, sometimes rain, and snow only in
// the cold months (northern hemisphere, which is where the game's clients live).
export function weatherFor(month, roll) {
  const snowy = month === 11 || month <= 1;
  if (snowy && roll < 0.3) return "snow";
  if (roll > 0.72) return "rain";
  return "clear";
}

// Where a click lands in a press-and-release: a drag if the pointer travelled
// or the press was held, otherwise a click on whatever is under it.
export function isClick(dx, dy, ms) {
  return Math.hypot(dx, dy) <= 6 && ms <= 500;
}
