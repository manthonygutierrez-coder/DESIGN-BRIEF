/* ── the pixel waterfall ────────────────────────────── */
const cv = $("fx"), ctx = cv.getContext("2d", { alpha: true });
const CELL = 13;
let cols = 0, rows = 0, img = null;
let dA = [], sA = [], dB = [], sB = [];

function rnd(){ return Math.random(); }
function sizeFX(){
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  cols = Math.max(8, Math.ceil(w / CELL));
  rows = Math.max(8, Math.ceil(h / CELL));
  cv.width = cols; cv.height = rows;
  cv.style.width = w + "px"; cv.style.height = h + "px";
  ctx.imageSmoothingEnabled = false;
  img = ctx.createImageData(cols, rows);
  dA = new Float32Array(cols); sA = new Float32Array(cols);
  dB = new Float32Array(cols); sB = new Float32Array(cols);
  for (let c = 0; c < cols; c++){
    dA[c] = (c / cols) * 0.34 + rnd() * 0.16;
    sA[c] = 0.85 + rnd() * 0.7;
    dB[c] = (c / cols) * 0.30 + rnd() * 0.20;
    sB[c] = 0.85 + rnd() * 0.7;
  }
}
sizeFX();
addEventListener("resize", sizeFX);

const hex2rgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const PHOS = [[124,249,192],[44,122,92],[217,255,236],[255,206,106],[10,26,20]];

function hash(c, y){
  let h = (c * 374761393 + y * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return h;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeInOut = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;

function drawFX(t, dir, palA){
  const d = img.data;
  d.fill(0);
  const FILL_END = 0.46, DRAIN_AT = 0.55;
  const fillP  = clamp(t / FILL_END, 0, 1);
  const drainP = clamp((t - DRAIN_AT) / (1 - DRAIN_AT), 0, 1);
  const mix = clamp((t - 0.18) / 0.42, 0, 1);          // world palette -> phosphor
  const frame = (t * 60) | 0;

  for (let c = 0; c < cols; c++){
    const fillTo  = clamp((fillP  - dA[c]) * sA[c] * 1.9, 0, 1) * (rows + 2);
    const drainTo = clamp((drainP - dB[c]) * sB[c] * 1.9, 0, 1) * (rows + 2);
    if (fillTo <= 0) continue;
    const top = Math.floor(drainTo), bot = Math.ceil(Math.min(fillTo, rows));
    for (let y = top; y < bot; y++){
      const h = hash(c, y);
      const nearFill  = fillTo - y;
      const nearDrain = y - drainTo;
      let r, g, b;
      if (nearFill < 1.4 || (drainTo > 0.5 && nearDrain < 1.4)){
        r = 235; g = 255; b = 244;                                        // leading edge
      } else {
        const useP = ((h >>> 3) % 100) / 100 < mix;
        const src = useP ? PHOS : palA;
        const col = src[(h >>> 7) % src.length];
        const flick = ((h ^ (frame * 2654435761)) >>> 11) % 32 === 0 ? 1.55 : 1;
        const dim = 0.42 + 0.58 * clamp(1 - (nearFill - 1.4) / (rows * 0.55), 0, 1);
        r = clamp(col[0] * dim * flick, 0, 255) | 0;
        g = clamp(col[1] * dim * flick, 0, 255) | 0;
        b = clamp(col[2] * dim * flick, 0, 255) | 0;
      }
      const yy = dir === 1 ? y : rows - 1 - y;
      if (yy < 0 || yy >= rows) continue;
      const o = (yy * cols + c) * 4;
      d[o] = r; d[o+1] = g; d[o+2] = b; d[o+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function cross(dir){
  if (busy) return;
  if (dir === 1 && atScreen) return;
  if (dir === -1 && !atScreen) return;
  busy = true;
  openPicker(false);

  const palA = CATS[current].palette.map(hex2rgb);
  const DUR = reduced ? 620 : 2750;
  const t0 = performance.now();
  let mid = false, ended = false, guard = 0;

  // Swap which side is live. Runs from the animation or the guard, whichever first.
  const arrive = () => {
    if (mid) return;
    mid = true;
    atScreen = dir === 1;
    sideWorld.inert = atScreen;
    sideScreen.inert = !atScreen;
    if (atScreen) desk.arrive();
  };

  // Always lands the page in a valid state, even if rAF never fires
  // (backgrounded tab, throttled renderer) — otherwise `busy` would latch.
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(guard);
    arrive();
    track.style.transform = "translate3d(" + (dir === 1 ? -100 : 0) + "vw,0,0)";
    cv.style.opacity = "0";
    ctx.clearRect(0, 0, cols, rows);
    busy = false;
    const el = atScreen ? desk.focusTarget() : pickerBtn;
    if (el) el.focus({ preventScroll: true });
  };
  guard = setTimeout(finish, DUR + 600);

  cv.style.opacity = "1";

  const step = (now) => {
    if (ended) return;
    const t = Math.min(1, (now - t0) / DUR);
    if (!reduced) drawFX(t, dir, palA);
    else { ctx.clearRect(0, 0, cols, rows); cv.style.opacity = String(t < .5 ? t * 2 : (1 - t) * 2); }

    const pp = clamp((t - 0.30) / 0.42, 0, 1);
    const e = easeInOut(pp);
    const x = dir === 1 ? -e * 100 : -100 + e * 100;
    track.style.transform = "translate3d(" + x + "vw,0,0)";

    if (t > 0.40) arrive();
    if (t < 1) requestAnimationFrame(step);
    else finish();
  };
  requestAnimationFrame(step);
}
