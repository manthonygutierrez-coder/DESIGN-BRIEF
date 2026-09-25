// textures.js — every surface in the room, painted on small canvases at pixel
// scale. Nothing is loaded: like the rest of the game, the room is drawn.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { seeded } from "./fit.js";

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}

// A canvas as a texture: whole pixels up close (nearest), smooth when far off.
export function tex(c, { repeat = null, srgb = true, nearest = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) t.magFilter = THREE.NearestFilter;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function shade(color, k) {
  const c = typeof color === "number" ? color : parseInt(color.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return "rgb(" + f((c >> 16) & 255) + "," + f((c >> 8) & 255) + "," + f(c & 255) + ")";
}
function speckle(g, w, h, base, amount, rnd, spread = 0.07) {
  g.fillStyle = typeof base === "number" ? hex(base) : base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * amount; i++) {
    g.fillStyle = shade(base, 1 + (rnd() - 0.5) * 2 * spread);
    g.fillRect((rnd() * w) | 0, (rnd() * h) | 0, 1, 1);
  }
}

/* ── surfaces ───────────────────────────────────────── */

export function wallCanvas(color) {
  const [c, g] = canvas(32, 32);
  speckle(g, 32, 32, color, 0.35, seeded(11), 0.04);
  return c;
}

export function floorCanvas(color) {
  const [c, g] = canvas(64, 64), rnd = seeded(7);
  for (let p = 0; p < 4; p++) {                    // four boards across, staggered joints
    const k = 0.86 + rnd() * 0.24;
    g.fillStyle = shade(color, k);
    g.fillRect(p * 16, 0, 16, 64);
    for (let i = 0; i < 90; i++) {                 // grain runs along the board
      g.fillStyle = shade(color, k * (0.9 + rnd() * 0.18));
      g.fillRect(p * 16 + 1 + ((rnd() * 14) | 0), (rnd() * 64) | 0, 1, 2 + ((rnd() * 5) | 0));
    }
    g.fillStyle = shade(color, 0.55);
    g.fillRect(p * 16, 0, 1, 64);
    const j = (p * 23 + 9) % 64;
    g.fillRect(p * 16, j, 16, 1);
  }
  return c;
}

export function woodCanvas(color, edge) {
  const [c, g] = canvas(64, 32), rnd = seeded(3);
  g.fillStyle = hex(color);
  g.fillRect(0, 0, 64, 32);
  for (let y = 0; y < 32; y++) {                   // long, wavy grain
    const k = 0.93 + Math.sin(y * 0.9 + rnd()) * 0.04;
    g.fillStyle = shade(color, k);
    g.fillRect(0, y, 64, 1);
  }
  for (let i = 0; i < 28; i++) {
    const y = (rnd() * 32) | 0, x = (rnd() * 64) | 0, l = 6 + ((rnd() * 18) | 0);
    g.fillStyle = shade(edge, 1.05);
    g.fillRect(x, y, l, 1);
  }
  return c;
}

export function plasticCanvas(color) {
  const [c, g] = canvas(32, 32);
  speckle(g, 32, 32, color, 0.5, seeded(5), 0.05);
  return c;
}

export function rugCanvas() {
  const [c, g] = canvas(56, 44);
  const R = "#8c2f2a", O = "#c9873c", T = "#2f6b6a", B = "#e8dcc2", D = "#3a1d1a";
  g.fillStyle = R; g.fillRect(0, 0, 56, 44);
  g.fillStyle = D; g.fillRect(2, 2, 52, 40);
  g.fillStyle = O; g.fillRect(4, 4, 48, 36);
  g.fillStyle = R; g.fillRect(6, 6, 44, 32);
  for (let x = 6; x < 50; x += 4) { g.fillStyle = (x / 4) % 2 ? B : T; g.fillRect(x, 6, 2, 2); g.fillRect(x, 36, 2, 2); }
  const diamond = (cx, cy, r, col) => {
    g.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const w = r - Math.abs(dy); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
  };
  diamond(28, 22, 12, O); diamond(28, 22, 9, T); diamond(28, 22, 6, B); diamond(28, 22, 3, D);
  diamond(13, 22, 4, T); diamond(43, 22, 4, T);
  for (let x = 0; x < 56; x += 2) { g.fillStyle = B; g.fillRect(x, 0, 1, 1); g.fillRect(x + 1, 43, 1, 1); }
  return c;
}

export function corkCanvas() {
  const [c, g] = canvas(96, 72), rnd = seeded(21);
  speckle(g, 96, 72, 0xb07a45, 0.9, rnd, 0.16);
  const card = (x, y, w, h, col, lines, line) => {
    g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(x + 1, y + 1, w, h);
    g.fillStyle = col; g.fillRect(x, y, w, h);
    if (line) { g.fillStyle = line; g.fillRect(x, y + 3, w, 1); }
    g.fillStyle = "rgba(40,40,60,.55)";
    for (let i = 0; i < lines; i++) g.fillRect(x + 2, y + 6 + i * 3, w - 4 - ((rnd() * 6) | 0), 1);
  };
  card(6, 6, 26, 18, "#f4f1e8", 4, "#e0442b");       // index cards: the jobs on the go
  card(36, 4, 22, 16, "#f4f1e8", 3, "#1084d0");
  card(10, 30, 18, 18, "#ffe27a", 4);               // sticky notes
  card(62, 8, 16, 16, "#ff9fc6", 3);
  // a polaroid: a pixel sunset, pinned crooked
  g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(41, 29, 22, 26);
  g.fillStyle = "#f7f4ec"; g.fillRect(40, 28, 22, 26);
  const sky = ["#2e3a8c", "#6a3d8c", "#c4643f", "#efa845"];
  sky.forEach((s, i) => { g.fillStyle = s; g.fillRect(42, 30 + i * 4, 18, 4); });
  g.fillStyle = "#14110e"; g.fillRect(42, 44, 18, 4); g.fillRect(48, 42, 5, 2);
  // a swatch strip, the way a designer's board always has one
  ["#e0442b", "#efa845", "#4fd1c5", "#1e3a58", "#b24a6e"].forEach((s, i) => { g.fillStyle = s; g.fillRect(70 + (i % 1), 30 + i * 6, 16, 5); });
  g.fillStyle = "#f4f1e8"; g.fillRect(68, 30, 2, 30);
  card(8, 52, 28, 14, "#f4f1e8", 2, "#3c8c3c");
  // pins
  [[18, 7], [46, 5], [18, 31], [70, 9], [51, 29], [77, 31], [22, 53]].forEach(([x, y], i) => {
    g.fillStyle = ["#e0442b", "#1084d0", "#3c8c3c", "#efa845"][i % 4];
    g.fillRect(x, y, 2, 2);
  });
  return c;
}

/* ── the computer ───────────────────────────────────── */

// The monitor's badge. The maker is one of the game's own: Pixel Crossing's
// world has no real brands in it.
export function badgeCanvas(text = "LUMEN") {
  const [c, g] = canvas(48, 12);
  g.fillStyle = "#3a3a3e"; g.fillRect(0, 0, 48, 12);
  g.fillStyle = "#cfc7b3"; g.font = "8px Silkscreen"; g.textBaseline = "middle"; g.textAlign = "center";
  g.fillText(text, 24, 6.5);
  return c;
}

export function towerFrontCanvas(color) {
  const [c, g] = canvas(38, 84), rnd = seeded(9);
  speckle(g, 38, 84, color, 0.5, rnd, 0.05);
  const bay = (y, h) => {
    g.fillStyle = shade(color, 0.72); g.fillRect(3, y, 32, h);
    g.fillStyle = shade(color, 1.06); g.fillRect(4, y + 1, 30, h - 2);
  };
  bay(5, 9);                                         // CD-ROM: tray seam, eject, a light
  g.fillStyle = shade(color, 0.6); g.fillRect(6, 10, 26, 1);
  g.fillStyle = shade(color, 0.8); g.fillRect(28, 11, 4, 2);
  g.fillStyle = "#3a8f4a"; g.fillRect(7, 12, 2, 1);
  bay(16, 9);                                        // a blank bay
  g.fillStyle = shade(color, 0.85); g.fillRect(8, 20, 22, 1);
  bay(28, 7);                                        // the floppy drive
  g.fillStyle = "#26262a"; g.fillRect(8, 31, 18, 2);
  g.fillStyle = shade(color, 0.8); g.fillRect(28, 31, 4, 2);
  for (let y = 60; y < 80; y += 3) { g.fillStyle = shade(color, 0.62); g.fillRect(6, y, 26, 1); }   // vents
  g.fillStyle = "#3a3a3e"; g.fillRect(12, 50, 14, 5);  // badge
  g.fillStyle = "#cfc7b3"; g.fillRect(14, 52, 10, 1);
  return c;
}

export function padCanvas() {
  const [c, g] = canvas(40, 32);
  g.fillStyle = "#1c2a3a"; g.fillRect(0, 0, 40, 32);
  g.fillStyle = "#24364a";
  for (let x = 0; x < 40; x += 4) g.fillRect(x, 0, 1, 32);
  for (let y = 0; y < 32; y += 4) g.fillRect(0, y, 40, 1);
  g.fillStyle = "#7cf9c0"; g.fillRect(29, 23, 7, 5);        // a little phosphor-green tag
  g.fillStyle = "#1c2a3a"; g.fillRect(31, 25, 3, 1);
  return c;
}

export function mugCanvas() {
  const [c, g] = canvas(32, 16);
  g.fillStyle = "#f2ece0"; g.fillRect(0, 0, 32, 16);
  g.fillStyle = "#e0442b"; g.fillRect(0, 5, 32, 3);
  g.fillStyle = "#14110e"; g.fillRect(12, 10, 8, 2);
  return c;
}

export function sketchbookCanvas() {
  const [c, g] = canvas(32, 24);
  g.fillStyle = "#1b1b1f"; g.fillRect(0, 0, 32, 24);
  g.fillStyle = "#26262c";
  for (let i = 0; i < 40; i++) g.fillRect((i * 7) % 32, (i * 5) % 24, 1, 1);
  g.fillStyle = "#c9412c"; g.fillRect(25, 0, 2, 24);            // the elastic
  g.fillStyle = "#f2ece0"; g.fillRect(4, 4, 12, 3);             // a label
  g.fillStyle = "#14110e"; g.fillRect(5, 5, 8, 1);
  return c;
}

/* ── the seven disciplines, one poster each ──────────
 * Each is the world scene the game opens on for that discipline, painted
 * small: the same shapes and the same palette (see js/briefs.js). */

const POSTER_W = 52, POSTER_H = 72;
const TITLES = {
  graphic: "GRAPHIC", webui: "INTERFACE", asset3d: "3D + ASSET", illustrative: "ILLUSTRATE",
  character: "CHARACTER", motion: "MOTION", type: "TYPE",
};

function radial(g, w, h, cx, cy, r, stops) {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach(([t, c]) => gr.addColorStop(t, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
function linear(g, w, h, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([t, c]) => gr.addColorStop(t, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}
function disc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); }
}
function ring(g, cx, cy, rx, ry, rot, col) {
  g.fillStyle = col;
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    g.fillRect(Math.round(cx + x * Math.cos(rot) - y * Math.sin(rot)), Math.round(cy + x * Math.sin(rot) + y * Math.cos(rot)), 1, 1);
  }
}

const PAINT = {
  graphic(g, w, h) {
    linear(g, w, h, 0, 0, w, h, [[0, "#FFF8EB"], [0.5, "#EFE2CE"], [1, "#D8C5AA"]]);
    g.fillStyle = "rgba(20,17,14,.18)";
    for (let y = 1; y < h; y += 3) for (let x = (y % 2) + 1; x < w; x += 3) g.fillRect(x, y, 1, 1);   // halftone
    disc(g, w * 0.44, h * 0.44, 16, "#E0442B");
    g.save(); g.translate(w * 0.5, h * 0.58); g.rotate(-0.19); g.fillStyle = "#14110E"; g.fillRect(-24, -3, 44, 6); g.restore();
    g.fillStyle = "#EFA845"; g.fillRect(6, 8, 6, 6);
  },
  webui(g, w, h) {
    linear(g, w, h, 0, 0, w * 0.4, h, [[0, "#EDF3F8"], [0.52, "#C6D9E8"], [1, "#8FAFCB"]]);
    const pane = (x, y, pw, ph, r) => {
      g.save(); g.translate(x, y); g.rotate(r);
      g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = "rgba(30,58,88,.55)"; g.fillRect(-pw / 2, -ph / 2, pw, 1); g.fillRect(-pw / 2, ph / 2 - 1, pw, 1);
      g.fillRect(-pw / 2, -ph / 2, 1, ph); g.fillRect(pw / 2 - 1, -ph / 2, 1, ph);
      g.fillStyle = "rgba(30,58,88,.35)"; g.fillRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, 2);
      g.restore();
    };
    pane(20, 18, 22, 15, -0.12); pane(30, 32, 26, 18, 0.07); pane(16, 42, 17, 20, 0.16); pane(38, 20, 15, 25, -0.05);
    g.save(); g.translate(8, -4); g.rotate(0.35); g.fillStyle = "rgba(79,209,197,.35)"; g.fillRect(0, 0, 9, 90); g.restore();
  },
  asset3d(g, w, h) {
    radial(g, w, h, w * 0.26, h * 0.16, h * 0.9, [[0, "#F0EAE1"], [0.46, "#CFC5B8"], [1, "#8A8279"]]);
    g.fillStyle = "rgba(42,37,31,.35)";
    for (let x = -14; x <= 14; x++) { const hh = Math.round(Math.sqrt(1 - (x / 14) ** 2) * 3); g.fillRect(26 + x, 48 - hh, 1, hh * 2); }
    for (let y = -13; y <= 13; y++) for (let x = -13; x <= 13; x++) {
      if (x * x + y * y > 169) continue;
      const l = (-x * 0.5 - y * 0.6 + 7) / 14, d = ((x + y) & 1) * 0.06;     // one light, dithered
      g.fillStyle = l + d > 0.62 ? "#F0EAE1" : l + d > 0.4 ? "#CFC5B8" : l + d > 0.2 ? "#B8683A" : "#6E4A34";
      g.fillRect(26 + x, 30 + y, 1, 1);
    }
    ring(g, 26, 30, 22, 8, 0, "rgba(75,66,57,.5)");
    ring(g, 26, 30, 22, 8, 1.05, "rgba(75,66,57,.5)");
    ring(g, 26, 30, 22, 8, 2.1, "rgba(75,66,57,.5)");
  },
  illustrative(g, w, h) {
    radial(g, w, h, w * 0.6, h * 0.3, h, [[0, "#FBF6EA"], [0.55, "#F0E6D2"], [1, "#DFCEB2"]]);
    g.globalAlpha = 0.75;
    disc(g, 18, 22, 12, "#2E3A8C");
    disc(g, 34, 36, 13, "#C4643F");
    disc(g, 22, 44, 10, "#B24A6E");
    g.globalAlpha = 1;
    g.fillStyle = "#1A1712";
    for (let x = 4; x < 48; x++) {                   // one brush stroke across
      const y = 50 - Math.sin(x / 9) * 12 - x * 0.2, t = 1 + Math.round(Math.sin(x / 5) * 1.2 + 1.2);
      g.fillRect(x, Math.round(y), 1, t);
    }
  },
  character(g, w, h) {
    radial(g, w, h, w * 0.5, h * 0.56, h * 0.7, [[0, "#7A4A1C"], [0.46, "#4A2A11"], [1, "#1E1108"]]);
    disc(g, 26, 34, 18, "rgba(255,182,86,.3)");
    ring(g, 26, 32, 20, 13, 0.3, "rgba(255,182,86,.55)");
    ring(g, 26, 32, 17, 19, -0.42, "rgba(255,182,86,.55)");
    g.fillStyle = "#160E07";
    disc(g, 26, 26, 7, "#160E07");                    // someone arriving
    g.beginPath(); g.moveTo(12, 62); g.lineTo(16, 38); g.lineTo(36, 38); g.lineTo(40, 62); g.fill();
    g.fillRect(22, 31, 8, 8);
  },
  motion(g, w, h) {
    radial(g, w, h, w * 0.42, h * 0.52, h * 0.8, [[0, "#101A22"], [0.55, "#070C11"], [1, "#020406"]]);
    [[16, "#57E0FF", 2], [20, "#57E0FF", 1], [30, "#FF5FA8", 1], [33, "#FF5FA8", 2], [44, "#FFE08A", 1], [50, "#57E0FF", 1], [54, "#7C5CFF", 2]]
      .forEach(([y, col, t], i) => {
        const x0 = (i * 11) % 20, len = 26 + ((i * 7) % 20);
        g.fillStyle = col; g.fillRect(x0, y, len, t);
        g.globalAlpha = 0.35; g.fillRect(x0 - 4, y - 1, len + 8, t + 2); g.globalAlpha = 1;
      });
  },
  type(g, w, h) {
    linear(g, w, h, 0, 0, 0, h, [[0, "#3A4247"], [0.6, "#272D31"], [1, "#171B1E"]]);
    g.fillStyle = "rgba(94,214,214,.35)";
    [14, 30, 46].forEach((y) => g.fillRect(0, y, w, 1));
    g.fillRect(10, 0, 1, h);
    g.fillStyle = "#D3452F"; g.fillRect(36, 16, 9, 10);
    g.fillStyle = "#F4F1E9"; g.font = "52px 'Instrument Serif'"; g.textBaseline = "alphabetic";
    g.fillText("&", 3, 52);
  },
};

export function posterCanvas(id) {
  const [c, g] = canvas(POSTER_W + 4, POSTER_H + 16);
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, c.width, c.height);        // the paper's margin
  const [art, ag] = canvas(POSTER_W, POSTER_H);
  (PAINT[id] || PAINT.graphic)(ag, POSTER_W, POSTER_H);
  g.drawImage(art, 2, 2);
  g.fillStyle = "#14110e"; g.font = "8px Silkscreen"; g.textBaseline = "middle"; g.textAlign = "center";
  g.fillText(TITLES[id] || id.toUpperCase(), c.width / 2, POSTER_H + 9);
  return c;
}
