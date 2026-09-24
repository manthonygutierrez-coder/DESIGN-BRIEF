// window.js — what is outside: the real time of day (the same clock as the
// taskbar), over a small city whose lights come on at dusk, in whatever
// weather this session drew. Two layers, set apart behind the wall so the
// view has depth as you move: the sky and skyline far off, the weather close.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { canvas, tex } from "./textures.js";
import { skyAt, seeded, weatherFor } from "./fit.js";

const W = 96, H = 96;

// Sky colours through the day: [hour, top, middle, horizon].
const KEYS = [
  [0, "#070b1d", "#0f1733", "#1c2750"],
  [5, "#0a1024", "#172046", "#2d3563"],
  [6.4, "#2d3570", "#9a5f8e", "#f2a877"],
  [8, "#5da3e0", "#8cc3ec", "#d6ecf4"],
  [16.5, "#5a9fde", "#8ec0e8", "#dcebf0"],
  [18.6, "#28306b", "#8e4f8c", "#f38d4f"],
  [20.2, "#111737", "#27275a", "#553c6a"],
  [24, "#070b1d", "#0f1733", "#1c2750"],
];
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const css = (c) => "rgb(" + c.map((v) => Math.round(v)).join(",") + ")";
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function skyColours(hour) {
  let i = 0;
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1][0]) i++;
  const [h0, ...a] = KEYS[i], [h1, ...b] = KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (hour - h0) / (h1 - h0)));
  return a.map((c, k) => mixc(rgb(c), rgb(b[k]), t));
}

export function createWindowView({ now = new Date(), seed = Date.now() } = {}) {
  const rnd = seeded(seed);
  const hourOf = (d) => d.getHours() + d.getMinutes() / 60;
  const weather = weatherFor(now.getMonth(), rnd());

  // The skyline, fixed for the session: buildings, and which windows are lit.
  const blocks = [];
  for (let x = -4; x < W + 4;) {
    const w = 6 + ((rnd() * 12) | 0), h = 12 + ((rnd() * 30) | 0);
    const lit = [];
    for (let wy = 3; wy < h - 2; wy += 3) for (let wx = 2; wx < w - 2; wx += 2) if (rnd() < 0.34) lit.push([wx, wy, rnd()]);
    blocks.push({ x, w, h, lit, tone: 0.8 + rnd() * 0.3, far: rnd() < 0.45 });
    x += w + ((rnd() * 3) | 0);
  }
  const stars = Array.from({ length: 40 }, () => [(rnd() * W) | 0, (rnd() * H * 0.55) | 0, rnd()]);
  const clouds = Array.from({ length: weather === "clear" ? 4 : 9 }, (_, i) => ({ y: 8 + rnd() * 34, x: rnd() * W, r: 5 + rnd() * 7, v: 0.6 + rnd() * 0.8 + i * 0.05 }));
  const drops = Array.from({ length: weather === "snow" ? 70 : 90 }, () => ({ x: rnd() * W, y: rnd() * H, v: 0.7 + rnd() * 0.6, s: rnd() }));

  const [farC, fg] = canvas(W, H), [nearC, ng] = canvas(W, H);
  const far = tex(farC), near = tex(nearC);
  const light = { color: new THREE.Color(), intensity: 1 };

  function paintFar(t, date) {
    const hour = hourOf(date), sky = skyAt(hour);
    let [top, mid, low] = skyColours(hour);
    if (weather !== "clear") {                       // overcast: greyer, and dimmer by day
      const grey = (c) => mixc(c, [c[0] * 0.5 + 70, c[1] * 0.5 + 72, c[2] * 0.5 + 80].map((v, i) => v * (0.62 + 0.3 * (i === 2))), 0.55);
      top = grey(top); mid = grey(mid); low = grey(low);
    }
    const gr = fg.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, css(top)); gr.addColorStop(0.55, css(mid)); gr.addColorStop(1, css(low));
    fg.fillStyle = gr; fg.fillRect(0, 0, W, H);

    if (sky.day < 0.5 && weather === "clear") {        // stars, and the moon
      for (const [x, y, s] of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + s * 2) + s * 40);
        fg.fillStyle = "rgba(255,248,220," + ((1 - sky.day * 2) * (0.35 + 0.5 * tw)).toFixed(2) + ")";
        fg.fillRect(x, y, 1, 1);
      }
      fg.fillStyle = "rgba(246,240,214," + (1 - sky.day * 2).toFixed(2) + ")";
      for (let y = -4; y <= 4; y++) { const w = Math.round(Math.sqrt(16 - y * y)); fg.fillRect(70 - w, 16 + y, w * 2, 1); }
    }
    if (sky.day > 0.05 && weather === "clear") {       // the sun, low at the ends of the day
      const arc = (hour - 6) / 13, sx = 10 + arc * 76, sy = 58 - Math.sin(Math.PI * Math.min(1, Math.max(0, arc))) * 46;
      fg.fillStyle = "rgba(255,244,200," + Math.min(1, sky.day * 1.5).toFixed(2) + ")";
      for (let y = -4; y <= 4; y++) { const w = Math.round(Math.sqrt(16 - y * y)); fg.fillRect(Math.round(sx) - w, Math.round(sy) + y, w * 2, 1); }
    }
    for (const c of clouds) {                          // clouds drift across
      const x = ((c.x + t * c.v) % (W + 30)) - 15;
      const lum = weather === "clear" ? 0.55 + sky.day * 0.45 : 0.35 + sky.day * 0.4;
      fg.fillStyle = "rgba(" + [236, 232, 236].map((v) => Math.round(v * lum)).join(",") + "," + (weather === "clear" ? 0.75 : 0.9) + ")";
      for (let k = 0; k < 3; k++) {
        const r = c.r * (1 - k * 0.22), cx = x + k * c.r * 0.8, cy = c.y + k;
        for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); fg.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); }
      }
    }
    const haze = mixc(low, [20, 24, 40], 0.55);          // the city, the back row paler
    for (const b of blocks) {
      const base = b.far ? mixc(haze, low, 0.35) : mixc([14, 16, 28], [70, 82, 100], sky.day * 0.7);
      fg.fillStyle = css(base.map((v) => v * b.tone));
      const top = H - b.h - (b.far ? 8 : 0);
      fg.fillRect(b.x, top, b.w, H - top);
      if (sky.lights) {
        for (const [wx, wy, s] of b.lit) {
          if (s > 0.97 && Math.sin(t * 0.7 + s * 99) > 0.6) continue;     // someone switched off for a bit
          fg.fillStyle = s > 0.8 ? "#9fd4ff" : "#ffd88a";
          fg.fillRect(b.x + wx, top + wy, 1, 1);
        }
      }
    }
    far.needsUpdate = true;

    // The light the window lets in: colour and strength follow the sky.
    const warm = sky.phase === "dawn" || sky.phase === "dusk";
    light.color.set(sky.day > 0.6 ? 0xfff0d8 : warm ? 0xffae78 : 0x7f9bd6);
    light.intensity = (0.25 + sky.day * 1.75) * (weather === "clear" ? 1 : 0.6);
    return sky;
  }

  function paintNear(dt) {
    ng.clearRect(0, 0, W, H);
    if (weather === "rain") {
      ng.fillStyle = "rgba(190,210,235,.55)";
      for (const d of drops) {
        d.y += dt * 120 * d.v; d.x += dt * 22 * d.v;
        if (d.y > H) { d.y -= H + 4; d.x = Math.random() * W; }
        ng.fillRect(Math.round(d.x) % W, Math.round(d.y), 1, 3);
      }
    } else if (weather === "snow") {
      ng.fillStyle = "rgba(245,248,255,.85)";
      for (const d of drops) {
        d.y += dt * 14 * d.v; d.x += Math.sin(d.y * 0.1 + d.s * 9) * dt * 6;
        if (d.y > H) { d.y -= H + 2; d.x = Math.random() * W; }
        const s = d.s > 0.7 ? 2 : 1;
        ng.fillRect(((Math.round(d.x) % W) + W) % W, Math.round(d.y), s, s);
      }
    }
    near.needsUpdate = true;
  }

  let farAt = -1, nearAt = 0, t = 0;
  const sky0 = paintFar(0, now);
  return {
    far, near, light, weather, sky: () => skyAt(hourOf(new Date())), initial: sky0,
    update(dt) {
      t += dt;
      if (t - farAt > 0.5) { farAt = t; paintFar(t, new Date()); }
      if (weather !== "clear" && t - nearAt > 1 / 24) { paintNear(t - nearAt); nearAt = t; }
    },
  };
}
