// gachapon.js — the capsule machine in the corner of your room. Click it while
// you are seated and you turn its crank: a wooden token goes into the slot, the
// rotor under the capsules turns a third of a turn, and a capsule rolls into
// the outlet. It comes out onto the stand's shelf and opens, and the little
// creature asleep inside wakes up and stays on the shelf. Folded in with it is
// its page: its own description, and a line on how it lives.
//
// Every creature is drawn from its page's words (Capsules.read, in
// src/js/content/capsules.js). The six toys that live in the machine, Tidepup
// and the rest, have pages written by hand and come out first, once each;
// after them every capsule holds a creature whose page is written the moment
// it opens, from a fresh seed. The page goes to the computer (PC.capsule),
// where the Capsule Dex keeps it: draw the creature in the suite's Pixel mode
// from the words, then compare. Like everything in the room, the machine is
// built from code and painted on small canvases.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { GACHA } from "./layout.js";
import { tex, canvas } from "./textures.js";
import { std, box } from "./shell.js";

// local frame: the front faces +z, width along x; metres
const M = { w: 0.44, d: 0.4, stand: 0.28, low: 0.34, glass: 0.32, roof: 0.035, shelf: 0.2, standW: 0.66, r: 0.032 };
const Y0 = M.stand + M.low, Y1 = Y0 + M.glass;                 // hopper floor, glass top
const CRANK = { y: M.stand + M.low * 0.6, z: M.d / 2 };
const TRAY = { w: 0.15, h: 0.095, d: 0.085, y: M.stand + 0.03 };
const SHELF_Z = M.d / 2 + M.shelf / 2;
const SLOT = { x: 0.155, y: M.stand + M.low * 0.66 };
const STACK = { x: 0.2, z: SHELF_Z };
const LAND_Z = M.d / 2 + 0.085 + M.r + 0.012;               // where a capsule comes to rest, in front of the outlet
const TOY_SPOTS = [-0.25, -0.12];                              // left of the outlet, on the shelf
const TOY = 0.13;                                              // a toy's height (bigger than life, so it reads across the room)
const CAPCOLS = [0xe2483d, 0x3e86d9, 0xf2c230, 0x38a565, 0xf08a2b, 0xd94f86, 0x8c4bd1, 0x2bb3b1];
const TOYS_KEY = "pixel-crossing:toys";                      // the toys on the shelf (ids)
const FOUND_KEY = "pixel-crossing:found";                    // which of the six have come out
const SEEN_KEY = "pixel-crossing:revealed";                  // creatures you have drawn and compared: out of the shadow

const pageOf = (id) => (typeof Capsules !== "undefined" ? Capsules.page(id) : null);
const load = (key) => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const seen = (id) => load(SEEN_KEY).includes(id);
// a creature's sprite on a canvas: asleep in its capsule, awake out of it, and
// until you have drawn it and compared, a dark silhouette lit from behind
function creatureCanvas(id, awake) {
  const [c, g] = canvas(48, 48), p = pageOf(id);
  if (!p) return c;
  const art = Capsules.sprite(p.spec, { asleep: !awake });
  (seen(id) ? art : Capsules.silhouette(art, p.type)).px.forEach((v, k) => { if (v) { g.fillStyle = v; g.fillRect(k % 48, Math.floor(k / 48), 1, 1); } });
  return c;
}
const store = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private window */ } };
// what the next capsule holds: one of the six not yet found, else someone new
function nextCreature() {
  const ids = typeof Capsules !== "undefined" ? Capsules.TOY_IDS : [];
  const found = load(FOUND_KEY), left = ids.filter((id) => !found.includes(id));
  if (left.length) { const id = left[Math.floor(Math.random() * left.length)]; store(FOUND_KEY, [...found, id]); return id; }
  return "seed:" + ((Math.random() * 4294967296) >>> 0);
}

/* ── painted panels ─────────────────────────────────────── */
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function frontCanvas(body) {
  const W = 88, H = 68, [c, g] = canvas(W, H), px = W / M.w;
  g.fillStyle = hex(body); g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(0,0,0,.28)";                                      // the door's seam
  g.fillRect(3, 3, W - 6, 1); g.fillRect(3, H - 4, W - 6, 1); g.fillRect(3, 3, 1, H - 6); g.fillRect(W - 4, 3, 1, H - 6);
  const sx = Math.round((M.w / 2 + SLOT.x) * px), sy = Math.round((Y0 - SLOT.y) * px);    // token plate and slot
  g.fillStyle = "#d8dde0"; g.fillRect(sx - 6, sy - 11, 13, 25);
  g.fillStyle = "#8f989b"; g.fillRect(sx - 6, sy + 13, 13, 1);
  g.fillStyle = "#1d1a16"; g.fillRect(sx - 1, sy - 4, 2, 8);
  g.fillStyle = "#e2483d"; g.fillRect(sx - 4, sy - 9, 9, 3);              // price strip
  const cy = Math.round((Y0 - CRANK.y) * px), cx = W / 2;                 // escutcheon and the turning arrow
  g.fillStyle = "#d8dde0"; g.beginPath(); g.arc(cx, cy, 9.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, 13, -Math.PI * 0.35, Math.PI * 0.25); g.stroke();
  const a = Math.PI * 0.25; g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath(); g.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16); g.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10); g.lineTo(cx + Math.cos(a + 0.35) * 13.5, cy + Math.sin(a + 0.35) * 13.5); g.fill();
  g.fillStyle = "#d8dde0"; g.beginPath(); g.arc(11, 12, 2.2, 0, Math.PI * 2); g.fill();           // lock
  g.fillStyle = "#3a3632"; g.fillRect(10.5, 11, 1, 2);
  const ty = Math.round((Y0 - TRAY.y - TRAY.h) * px), tw = Math.round(TRAY.w * px);              // the outlet's mouth
  g.fillStyle = "#1d1a16"; g.fillRect(cx - tw / 2, ty, tw, Math.round(TRAY.h * px));
  return c;
}
function sideCanvas(body) {
  const W = 80, H = 68, [c, g] = canvas(W, H);
  g.fillStyle = hex(body); g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,255,255,.2)"; g.fillRect(8, 8, W - 16, H - 16);
  g.fillStyle = "#eef8fa"; g.beginPath(); g.arc(W / 2, 26, 9, Math.PI, 0); g.fill();
  g.fillStyle = "#e2483d"; g.beginPath(); g.arc(W / 2, 26, 9, 0, Math.PI); g.fill();
  g.strokeStyle = "#231e16"; g.lineWidth = 1; g.beginPath(); g.arc(W / 2, 26, 9, 0, Math.PI * 2); g.moveTo(W / 2 - 9, 26); g.lineTo(W / 2 + 9, 26); g.stroke();
  g.fillStyle = "#3a1d16"; g.font = "8px Silkscreen"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("GACHA", W / 2, 47);
  return c;
}
function signCanvas() {
  const [c, g] = canvas(96, 20);
  g.fillStyle = "#fff4d6"; g.fillRect(0, 0, 96, 20);
  g.fillStyle = "#e2483d"; g.font = "8px Silkscreen"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("GACHA BEASTS", 48, 10.5);
  return c;
}

/* ── the machine ────────────────────────────────────────── */
export function buildGachapon(scene) {
  const G = GACHA, g = new THREE.Group();
  g.name = "gachapon";
  g.position.set(G.x, 0, G.z);
  g.rotation.y = G.ry;
  const body = std(G.body, 0.6), wood = std(G.wood, 0.8), steel = std(0xc6ccce, 0.35, { metalness: 0.6 }), dark = std(0x1d1a16, 0.9);
  const clear = new THREE.MeshStandardNodeMaterial({ color: 0xcfe9f0, roughness: 0.08, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });

  // stand with its shelf, the cabinet, its painted door and sides
  box(M.standW, M.stand, M.d + M.shelf + 0.02, wood, 0, M.stand / 2, M.shelf / 2, g);
  box(M.w, M.low, M.d, body, 0, M.stand + M.low / 2, 0, g);
  const panel = (w, h, cnv, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, 0.7, { map: tex(cnv) })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  panel(M.w, M.low, frontCanvas(G.body), 0, M.stand + M.low / 2, M.d / 2 + 0.001, 0);
  panel(M.d, M.low, sideCanvas(G.body), M.w / 2 + 0.001, M.stand + M.low / 2, 0, Math.PI / 2);
  panel(M.d, M.low, sideCanvas(G.body), -M.w / 2 - 0.001, M.stand + M.low / 2, 0, -Math.PI / 2);

  // the outlet: a short tray standing out of the door, a clear flap hinged over its mouth
  const tz = M.d / 2 + TRAY.d / 2, t = 0.008;
  box(TRAY.w, t, TRAY.d, body, 0, TRAY.y, tz, g);
  box(TRAY.w, t, TRAY.d, body, 0, TRAY.y + TRAY.h, tz, g);
  for (const s of [-1, 1]) box(t, TRAY.h, TRAY.d, body, s * (TRAY.w / 2 - t / 2), TRAY.y + TRAY.h / 2, tz, g);
  box(TRAY.w - 2 * t, 0.002, TRAY.d - 0.004, dark, 0, TRAY.y + t / 2 + 0.001, tz, g);
  const flap = new THREE.Group();
  flap.position.set(0, TRAY.y + TRAY.h, M.d / 2 + TRAY.d);
  const flapPane = new THREE.Mesh(new THREE.PlaneGeometry(TRAY.w - 0.01, TRAY.h - 0.004), new THREE.MeshStandardNodeMaterial({ color: 0xcfe9f0, roughness: 0.1, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
  flapPane.position.y = -(TRAY.h - 0.004) / 2;
  flap.add(flapPane);
  g.add(flap);

  // the crank: hub, lever and knob, turning on the handle shaft
  const crank = new THREE.Group();
  crank.position.set(0, CRANK.y, CRANK.z);
  const cyl = (r, h, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat); m.rotation.x = Math.PI / 2; m.castShadow = true; return m; };
  const hub = cyl(0.03, 0.022, steel); hub.position.z = 0.011; crank.add(hub);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.072, 0.01), steel); lever.position.set(0, 0.036, 0.027); crank.add(lever);
  const knob = cyl(0.013, 0.032, std(0xe2483d, 0.45)); knob.position.set(0, 0.07, 0.04); crank.add(knob);
  g.add(crank);

  // the display box: posts, back wall, glass, roof and sign
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.022, M.glass, 0.022, body, x * (M.w / 2 - 0.011), Y0 + M.glass / 2, z * (M.d / 2 - 0.011), g);
  box(M.w, M.glass, 0.018, body, 0, Y0 + M.glass / 2, -M.d / 2 + 0.009, g);
  const pane = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, M.glass), clear); m.position.set(x, Y0 + M.glass / 2, z); m.rotation.y = ry; m.renderOrder = 2; g.add(m); };
  pane(M.w - 0.04, 0, M.d / 2 - 0.002, 0);
  pane(M.d - 0.04, M.w / 2 - 0.002, 0, Math.PI / 2);
  pane(M.d - 0.04, -M.w / 2 + 0.002, 0, Math.PI / 2);
  box(M.w + 0.02, M.roof, M.d + 0.02, body, 0, Y1 + M.roof / 2, 0, g);
  box(M.w - 0.04, 0.07, 0.035, body, 0, Y1 + M.roof + 0.035, M.d / 2 - 0.02, g);
  panel(M.w - 0.06, 0.05, signCanvas(), 0, Y1 + M.roof + 0.035, M.d / 2 - 0.002 + 0.001, 0);

  // the rotor in the hopper floor, its three pockets
  const rotor = new THREE.Group();
  rotor.position.set(0, Y0 + 0.004, -0.01);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.008, 28), std(0xece6d6, 0.7));
  disc.receiveShadow = true; rotor.add(disc);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.002, 16), dark); p.position.set(Math.cos(a) * 0.09, 0.0045, Math.sin(a) * 0.09); rotor.add(p); }
  g.add(rotor);

  // the capsules, piled: a coloured bottom half and a clear top
  const halfGeo = { top: new THREE.SphereGeometry(M.r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bottom: new THREE.SphereGeometry(M.r, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2) };
  const domeMat = new THREE.MeshStandardNodeMaterial({ color: 0xdff2f6, roughness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, emissive: 0x9fc6cf, emissiveIntensity: 0.25 });
  // the display box is lit inside, so the capsules glow a little in a dark corner
  const cupMats = CAPCOLS.map((c) => std(c, 0.45, { emissive: c, emissiveIntensity: 0.35 }));
  const makeCapsule = (ci) => {
    const c = new THREE.Group(), top = new THREE.Mesh(halfGeo.top, domeMat.clone()), bottom = new THREE.Mesh(halfGeo.bottom, cupMats[ci % cupMats.length]);
    bottom.castShadow = true;
    c.add(bottom, top); c.userData.top = top; c.userData.bottom = bottom;
    return c;
  };
  const pile = [];
  {
    const r = M.r, lim = { x: M.w / 2 - 0.026 - r, z0: -M.d / 2 + 0.03 + r, z1: M.d / 2 - 0.026 - r };
    const at = [];
    const rest = (x, z) => { let y = Y0 + 0.008 + r; for (const p of at) { const d = Math.hypot(p.x - x, p.z - z); if (d < 2 * r) y = Math.max(y, p.y + Math.sqrt(4 * r * r - d * d)); } return y; };
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const x = -lim.x + rnd() * 2 * lim.x, z = lim.z0 + rnd() * (lim.z1 - lim.z0), y = rest(x, z);
      if (y > Y1 - 0.09) continue;
      at.push({ x, y, z });
    }
    at.forEach((p, i) => { const c = makeCapsule(i); c.position.set(p.x, p.y, p.z); c.rotation.set(rnd() * 0.5, rnd() * 6, rnd() * 0.5); c.userData.home = c.position.clone(); g.add(c); pile.push(c); });
  }

  // the token stack on the shelf
  const tokenMat = std(0xd6a468, 0.8), tokenGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.004, 14);
  box(0.05, 0.008, 0.05, std(0xb07a45, 0.8), STACK.x, M.stand + 0.004, STACK.z, g);
  const stack = [];
  for (let i = 0; i < 6; i++) { const t2 = new THREE.Mesh(tokenGeo, tokenMat); t2.position.set(STACK.x, M.stand + 0.008 + 0.002 + i * 0.0042, STACK.z); t2.castShadow = true; g.add(t2); stack.push(t2); }
  const flying = new THREE.Mesh(tokenGeo, tokenMat); flying.visible = false; g.add(flying);

  // the toys already won, standing on the shelf
  const toyGeo = new THREE.PlaneGeometry(TOY, TOY);
  const toyMat = (cnv) => new THREE.MeshBasicNodeMaterial({ map: tex(cnv), transparent: true, alphaTest: 0.5 });
  const toyTex = new Map();
  const texFor = (id, awake) => { const k = id + (awake ? ":awake" : ":asleep") + (seen(id) ? ":seen" : ""); if (!toyTex.has(k)) toyTex.set(k, toyMat(creatureCanvas(id, awake))); return toyTex.get(k); };
  const shelved = [];
  // ids now; the first build kept numbers for the six toys
  const TOY_ORDER = ["emberkit", "sproutle", "tidepup", "voltbug", "pebblor", "gloombat"];
  let kept = load(TOYS_KEY).map((n) => (Number.isInteger(n) ? "toy:" + TOY_ORDER[n] : n)).filter((id) => typeof id === "string" && /^(toy|seed):/.test(id)).slice(-TOY_SPOTS.length);
  const placeToys = () => {
    shelved.forEach((m) => g.remove(m)); shelved.length = 0;
    kept.forEach((n, i) => { const m = new THREE.Mesh(toyGeo, texFor(n, true)); m.position.set(TOY_SPOTS[TOY_SPOTS.length - kept.length + i], M.stand + TOY / 2, SHELF_Z + 0.02); g.add(m); shelved.push(m); });
  };
  placeToys();

  g.traverse((o) => { if (o.isMesh) o.userData.gacha = true; });
  scene.add(g);

  /* ── turning the crank ───────────────────────────────── */
  const st = { phase: "idle", t: 0, used: 0, capsule: null, toy: null, id: null, rotor0: 0 };
  let slipEl = null, onSlip = null;
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const toLocal = new THREE.Vector3();

  function pull() {
    if (st.phase === "slip") { closeSlip(); return true; }
    if (st.phase !== "idle") return false;
    if (st.used >= stack.length) { st.used = 0; stack.forEach((m) => { m.visible = true; }); }      // a fresh roll of tokens
    st.phase = "token"; st.t = 0;
    const top = stack[stack.length - 1 - st.used];
    top.visible = false; st.used++;
    flying.position.copy(top.position); flying.rotation.set(0, 0, 0); flying.visible = true;
    st.from = top.position.clone();
    return true;
  }

  function update(dt, camera) {
    st.t += dt;
    if (st.phase === "token") {
      const k = Math.min(1, st.t / 0.75), q = ease(Math.min(1, k / 0.75));
      const to = new THREE.Vector3(SLOT.x, SLOT.y, M.d / 2 + 0.03);
      if (k < 0.75) { flying.position.lerpVectors(st.from, to, q); flying.position.y += Math.sin(Math.PI * q) * 0.05; flying.rotation.x = q * Math.PI / 2; }
      else { flying.position.set(SLOT.x, SLOT.y, lerp(M.d / 2 + 0.03, M.d / 2 - 0.01, (k - 0.75) / 0.25)); flying.rotation.x = Math.PI / 2; }
      if (k >= 1) { flying.visible = false; st.phase = "crank"; st.t = 0; st.rotor0 = rotor.rotation.y; }
    } else if (st.phase === "crank") {
      const k = Math.min(1, st.t / 1.6), e = ease(k);
      crank.rotation.z = -e * Math.PI * 2;
      rotor.rotation.y = st.rotor0 - e * (Math.PI * 2) / 3;
      for (const c of pile) c.position.y = c.userData.home.y + Math.abs(Math.sin(st.t * 22 + c.userData.home.x * 90)) * 0.003 * (1 - k);
      if (k >= 1) {
        crank.rotation.z = 0;
        st.id = nextCreature();
        st.capsule = makeCapsule(Math.floor(Math.random() * CAPCOLS.length));
        st.capsule.traverse((o) => { if (o.isMesh) o.userData.gacha = true; });
        g.add(st.capsule);
        st.phase = "drop"; st.t = 0;
      }
    } else if (st.phase === "drop") {
      const k = Math.min(1, st.t / 0.4);
      st.capsule.position.set(0, TRAY.y + 0.004 + M.r, lerp(M.d / 2 + 0.005, M.d / 2 + TRAY.d * 0.55, ease(k)));
      st.capsule.rotation.x = -k * 3;
      if (k >= 1) { st.phase = "out"; st.t = 0; }
    } else if (st.phase === "out") {
      const k = Math.min(1, st.t / 0.9);
      flap.rotation.x = -1.3 * ease(Math.min(1, k / 0.35)) * (k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15);
      if (k > 0.3) { const q = ease((k - 0.3) / 0.7); st.capsule.position.set(0, lerp(TRAY.y + 0.004 + M.r, M.stand + M.r, q) + Math.sin(Math.PI * q) * 0.012, lerp(M.d / 2 + TRAY.d * 0.55, LAND_Z, q)); st.capsule.rotation.x = -3 - q * 2.2; }
      if (k >= 1) { flap.rotation.x = 0; st.capsule.rotation.set(0, 0, 0); st.phase = "open"; st.t = 0; open(); }
    } else if (st.phase === "open") {
      const k = Math.min(1, st.t / 1.5), top = st.capsule.userData.top, bottom = st.capsule.userData.bottom;
      top.position.y = ease(Math.min(1, k / 0.4)) * 0.07; top.rotation.z = ease(Math.min(1, k / 0.4)) * 0.8;
      top.material.opacity = 0.3 * (1 - Math.min(1, k / 0.45));
      st.toy.scale.setScalar(Math.min(1, k / 0.3));
      st.toy.position.y = M.stand + TOY / 2 + Math.sin(Math.PI * Math.min(1, k / 0.5)) * 0.03;
      if (k > 0.4 && st.toy.material !== texFor(st.id, true)) st.toy.material = texFor(st.id, true);
      if (k > 0.65) { bottom.material = bottom.material.userData.fade || (bottom.material.userData.fade = Object.assign(bottom.material.clone(), { transparent: true })); bottom.material.opacity = 1 - (k - 0.65) / 0.35; }
      if (k >= 1) {
        g.remove(st.capsule); st.capsule = null;
        kept.push(st.id); kept = kept.slice(-TOY_SPOTS.length);
        store(TOYS_KEY, kept);
        g.remove(st.toy); st.toy = null; placeToys();
        st.phase = "slip"; st.t = 0; showSlip();
      }
    }
    // toys face you (they turn about their upright only)
    if (camera) {
      g.worldToLocal(toLocal.copy(camera.position));
      const face = (m) => { m.rotation.y = Math.atan2(toLocal.x - m.position.x, toLocal.z - m.position.z); };
      shelved.forEach(face); if (st.toy) face(st.toy);
    }
  }

  // The capsule opens: the creature climbs out, and its page goes to the computer.
  function open() {
    st.toy = new THREE.Mesh(toyGeo, texFor(st.id, false));
    st.toy.position.set(0, M.stand + TOY / 2, LAND_Z);
    st.toy.scale.setScalar(0.01);
    st.toy.userData.gacha = true;
    g.add(st.toy);
    st.where = typeof PC !== "undefined" && PC.capsule ? PC.capsule(st.id) : "waiting";
  }

  /* ── the slip ─────────────────────────────────────────── */
  function mount(layer, onChange) {
    slipEl = document.createElement("aside");
    slipEl.className = "room3d__slip";
    slipEl.hidden = true;
    slipEl.setAttribute("aria-live", "polite");
    layer.appendChild(slipEl);
    onSlip = onChange;
  }
  function showSlip() {
    const page = pageOf(st.id);
    if (!slipEl || !page) { st.phase = "idle"; return; }
    const known = seen(st.id), p = known ? page : Capsules.veiled(page);
    const esc = (v) => String(v).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
    const where = (st.where === "dex" ? "Its page is in the Capsule Dex on your computer." : "Its page will wait in the Capsule Dex until you log on to Studio.") +
      (known ? " Draw it in Pixel, then compare." : " Draw it in Pixel from the words, then compare to find out who it is.");
    slipEl.innerHTML =
      '<div class="room3d__toy' + (known ? "" : " is-unseen") + '"><canvas width="48" height="48"></canvas><span>' + (known ? esc(p.name) + " woke up!" : "Who's that?") + "</span></div>" +
      '<div class="room3d__paper"><header><h2>' + esc(p.name) + "</h2><p>" + esc(p.category) + " · " + p.height.toFixed(1) + " m · " + p.weight.toFixed(1) + " kg</p></header>" +
      p.body.map((t) => "<p>" + esc(t) + "</p>").join("") + '<p class="room3d__life">' + esc(p.behaviour) + "</p>" +
      "<footer>" + esc(where) + "</footer></div>";
    slipEl.querySelector("canvas").getContext("2d").drawImage(creatureCanvas(st.id, true), 0, 0);
    slipEl.hidden = false;
    slipEl.scrollTop = 0;
    if (onSlip) onSlip();
  }
  function closeSlip() {
    if (slipEl) slipEl.hidden = true;
    if (st.phase === "slip") st.phase = "idle";
    if (onSlip) onSlip();
  }

  // Drawn and compared on the computer: the toy on the shelf steps out of the shadow.
  function reveal() { placeToys(); }

  return {
    group: g, update, pull, mount, closeSlip, reveal,
    busy: () => st.phase !== "idle" && st.phase !== "slip",
    slipOpen: () => st.phase === "slip" && !!slipEl && !slipEl.hidden,
    scrollSlip: (dy) => { if (slipEl) slipEl.scrollTop += dy; },
  };
}
