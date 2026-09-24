// main.js — your room, and the way into the computer on your desk.
//
// The game runs on that computer. Across the room its screen is the real page
// (#pc), placed exactly behind the CRT's glass in 3D (three's CSS3DRenderer)
// under a WebGPU canvas that is see-through where the glass is: live, at full
// fidelity, and the very page you then play. Sit down and click the screen,
// and the camera goes up to the glass until the screen is all you see; then
// the page drops its 3D transform and takes the window. Stand Up (Start menu,
// Esc on the world side) turns that round; Shut Down switches the machine off,
// and switching it back on starts the game over, like a computer does.
//
// While you are in the room the game hears none of your clicks or keys: they
// are caught on the way down (capture phase, on window) and #pc is inert.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { CSS3DRenderer, CSS3DObject } from "./vendor/three/addons/CSS3DRenderer.js";
import { PIXEL, LIGHTS, MONITOR, KEYBOARD, MOUSE, DESK, WINDOW, ROOM, CHAIR } from "./layout.js";
import { pixelCanvas, screenSize, isClick } from "./fit.js";
import { buildShell } from "./shell.js";
import { buildFurniture } from "./furniture.js";
import { buildComputer } from "./computer.js";
import { createGlass } from "./glass.js";
import { buildPost } from "./post.js";
import { Rig } from "./rig.js";
import { createSound } from "./sound.js";

window.__room = PC.without ? "off" : "starting";

const FLAG = "pixel-crossing:room";
const HINT = {
  wide: "CLICK TO SIT DOWN",
  seated: "CLICK THE SCREEN TO USE IT · DRAG TO LOOK AROUND · ESC TO STAND",
  off: "CLICK THE SCREEN OR THE TOWER'S BUTTON TO SWITCH ON · ESC TO STAND",
};
const pc = document.getElementById("pc");
const flag = PC.flag || {};
try { sessionStorage.removeItem(FLAG); } catch { /* private window */ }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });

let renderer, scene, camera, css, canvas, layer, hint, veil;
let shell, furniture, computer, glass, post, rig, sound, crt, sun;
let screenLights = [], fit = null;
let mode = "room", power = "on", usedHere = false;
let beamTo = 1, beamRate = 2;
let running = false, raf = 0, last = 0;
let press = null, wheelSum = 0, wheelAt = 0, seatedAt = 0, disk = 0, label = "";
const pressed = new Set();
const pointer = new THREE.Vector2();
const ray = new THREE.Raycaster();

if (!PC.without) boot().catch(fail);

function fail(err) {
  console.error("[room] could not start, so the game plays without it:", err);
  window.__room = "failed";
  if (layer) layer.remove();
  if (veil) veil.remove();
  running = false;
  flatten();
  PC.reveal();
}

/* ── boot ─────────────────────────────────────────────── */

async function boot() {
  veil = document.createElement("div");
  veil.className = "room-veil";
  document.body.appendChild(veil);
  if (flag.at !== "pc") veilTo(1, 0);

  // Posters and the badge are lettered in the game's own fonts.
  await Promise.race([Promise.all(["8px Silkscreen", "52px 'Instrument Serif'"].map((f) => document.fonts.load(f))), wait(1500)]).catch(() => {});

  renderer = new THREE.WebGPURenderer({ antialias: false, alpha: true });
  await renderer.init();
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  layer = document.createElement("div");
  layer.className = "room3d";
  css = new CSS3DRenderer();
  css.domElement.classList.add("room3d__css");
  canvas = renderer.domElement;
  canvas.classList.add("room3d__gl");
  canvas.setAttribute("aria-hidden", "true");
  hint = document.createElement("p");
  hint.className = "room3d__hint";
  hint.setAttribute("aria-live", "polite");         // what you can do from here, read out as it changes
  layer.append(css.domElement, canvas, hint);
  document.body.appendChild(layer);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c12);
  camera = new THREE.PerspectiveCamera(50, 1.6, 0.03, 40);
  glass = createGlass();
  shell = buildShell(scene);
  furniture = buildFurniture(scene);
  computer = buildComputer(scene, glass.material);
  light();
  post = buildPost(renderer, scene, camera);
  rig = new Rig(camera, computer.glass, { onPhase: (p) => { if (p === "seated") seatedAt = performance.now(); showHint(); } });
  sound = createSound();

  resize();
  addEventListener("resize", resize);
  bind();

  window.Room = {
    live: () => window.__room === "ready",
    standUp: () => leavePC(),
    shutDown: () => shutDown(),
    // The page is about to reload (logging off): come back at the screen.
    keepSeat() { try { sessionStorage.setItem(FLAG, JSON.stringify({ at: "pc" })); } catch { /* private */ } },
    state: () => ({ mode, phase: rig.phase, power, weather: shell.view.weather, sky: shell.view.sky().phase }),
  };

  if (flag.at === "pc") {
    rig.put("in");
    mode = "pc";
    layer.hidden = true;
    window.__room = "ready";
    return;
  }

  onGlass();
  if (flag.power === "boot") {                  // just switched on: in the chair, tube still dark
    rig.put("seated");
    power = "off"; beamTo = 0; glass.beam.value = 0;
    pc.classList.add("pc--off");
  } else {
    rig.put("wide");
  }
  const c = furniture.chair, at = flag.power === "boot" ? CHAIR.seat : CHAIR.away;
  c.position.set(at.x, 0, at.z); c.rotation.y = at.ry;
  showHint();
  start();
  await frames(2);
  PC.reveal();
  window.__room = "ready";
  await veilTo(0, 700);
  if (flag.power === "boot") powerOn();
}

function light() {
  const L = LIGHTS;
  scene.add(new THREE.AmbientLight(L.ambient.color, L.ambient.intensity));
  scene.add(new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity));

  const lamp = new THREE.SpotLight(L.lamp.color, L.lamp.intensity, L.lamp.distance, L.lamp.angle, L.lamp.penumbra, L.lamp.decay);
  lamp.position.copy(furniture.lampAt);
  lamp.target.position.copy(furniture.lampAim);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0012;
  lamp.shadow.camera.near = 0.05;
  scene.add(lamp, lamp.target);

  // The tube lights the desk and whoever sits at it, and flickers doing so.
  const centre = new THREE.Vector3().setFromMatrixPosition(computer.glass.matrixWorld);
  const fill = new THREE.PointLight(L.screen.color, L.screen.intensity, L.screen.distance, L.screen.decay);
  fill.position.copy(centre).add(new THREE.Vector3(0, 0.02, 0.35));
  const spot = new THREE.SpotLight(L.screenSpot.color, L.screenSpot.intensity, L.screenSpot.distance, L.screenSpot.angle, L.screenSpot.penumbra, L.screenSpot.decay);
  spot.position.copy(centre).add(new THREE.Vector3(0, 0, 0.04));
  spot.target.position.set(KEYBOARD.x, DESK.top, KEYBOARD.z + 0.6);
  scene.add(fill, spot, spot.target);
  screenLights = [[fill, L.screen.intensity], [spot, L.screenSpot.intensity]];

  const top = new THREE.PointLight(L.ceiling.color, L.ceiling.intensity, L.ceiling.distance, L.ceiling.decay);
  top.position.set(L.ceiling.pos.x, L.ceiling.pos.y, L.ceiling.pos.z);
  scene.add(top);

  const corner = new THREE.PointLight(L.floorLamp.color, L.floorLamp.intensity, L.floorLamp.distance, L.floorLamp.decay);
  corner.position.copy(furniture.floorLampAt);
  scene.add(corner);

  // Daylight, or moonlight, through the window only: the back wall throws
  // the shadow, the frame and the mullion draw on the desk.
  sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(WINDOW.x + 1.4, WINDOW.y + 1.9, ROOM.back - 3.4);
  sun.target.position.set(WINDOW.x - 0.5, 0.2, ROOM.back + 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
}

/* ── the frame ───────────────────────────────────────── */

function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
function stop() { running = false; cancelAnimationFrame(raf); }

function frame(now) {
  if (!running) return;
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;

  rig.update(dt);
  shell.view.update(dt);
  sun.color.copy(shell.view.light.color);
  sun.intensity = shell.view.light.intensity * LIGHTS.sun.intensity;

  // The tube: unfold or fold towards where it is going.
  const b = glass.beam.value, step = dt * beamRate;
  glass.beam.value = b + Math.max(-step, Math.min(step, beamTo - b));
  if (power === "off" && glass.beam.value <= 0) pc.classList.add("pc--off");
  glass.flash.value = Math.max(0, glass.flash.value - dt * 3);
  const f = 1 - LIGHTS.flicker * (0.5 + 0.35 * Math.sin(now * 0.011) + 0.15 * Math.sin(now * 0.047 + 1.3));
  for (const [l, base] of screenLights) l.intensity = base * f * glass.beam.value;

  // The speakers thump with the desk's music; the disk light chatters.
  const level = power === "on" && typeof Music !== "undefined" ? Music.level() : 0;
  for (const c of computer.cones) c.scale.setScalar(1 + Math.min(0.35, level * 3));
  if (power === "on" && Math.random() < dt * 0.9) disk = now + 60 + Math.random() * 260;
  computer.setLights(power === "on", now < disk);

  // Keys you press go down; the mouse follows yours, a little.
  const k = Math.min(1, dt * 24);
  for (const [code, key] of computer.keys) {
    const to = pressed.has(code) ? key.userData.restY - 0.005 : key.userData.restY;
    key.position.y += (to - key.position.y) * k;
  }
  // The chair rolls in under you as you sit, and back out as you stand.
  const c = furniture.chair, to = rig.phase === "wide" || (rig.phase === "moving" && rig.transition && rig.transition.phase === "wide") ? CHAIR.away : CHAIR.seat;
  const ck = Math.min(1, dt * 2.2);
  c.position.x += (to.x - c.position.x) * ck;
  c.position.z += (to.z - c.position.z) * ck;
  c.rotation.y += (to.ry - c.rotation.y) * ck;
  if (rig.phase === "seated") {
    const m = computer.mouse, tx = MOUSE.x + 0.02 + pointer.x * 0.035, tz = MOUSE.z + 0.02 - pointer.y * 0.03;
    m.position.x += (tx - m.position.x) * k * 0.5;
    m.position.z += (tz - m.position.z) * k * 0.5;
  }

  post.render();
  css.render(scene, camera);
}

function resize() {
  if (!renderer) return;
  fit = pixelCanvas(innerWidth, innerHeight, PIXEL);
  renderer.setSize(fit.cols, fit.rows, false);
  const box = { left: fit.left + "px", top: fit.top + "px", width: fit.w + "px", height: fit.h + "px" };
  Object.assign(canvas.style, box);
  css.setSize(fit.w, fit.h);
  Object.assign(css.domElement.style, { left: box.left, top: box.top });
  camera.aspect = fit.w / fit.h;
  camera.updateProjectionMatrix();
}

/* ── the game: on the glass, or the whole window ─────── */

function onGlass() {
  if (document.activeElement && pc.contains(document.activeElement)) document.activeElement.blur();
  pc.classList.add("pc--crt");
  pc.inert = true;
  // The game, on the glass: 1024×768 CSS pixels scaled down to the tube. A
  // new object each time: CSS3DRenderer remembers the last transform it wrote
  // for an object and would not write it again after flatten() cleared it.
  if (!crt) {
    const size = screenSize(MONITOR.glassW, MONITOR.glassH);
    crt = new CSS3DObject(pc);
    crt.scale.setScalar(MONITOR.glassW / size.w);
    computer.glass.add(crt);
  }
  dispatchEvent(new Event("resize"));            // the game re-measures (#fx, the reference board)
}

function flatten() {
  if (crt) { if (crt.parent) crt.parent.remove(crt); crt = null; }   // takes #pc out of the 3D layer
  if (pc.parentNode !== document.body) document.body.insertBefore(pc, document.body.firstChild);
  pc.classList.remove("pc--crt", "pc--off");
  for (const k of ["position", "pointerEvents", "userSelect", "transform", "display"]) pc.style[k] = "";
  pc.removeAttribute("draggable");
  pc.inert = false;
  dispatchEvent(new Event("resize"));
}

function enterPC() {
  if (power !== "on") return;
  const going = rig.zoom(async () => {
    await veilTo(1, 90, true);                    // the pop of going through the glass
    mode = "pc";
    usedHere = true;
    stop();
    layer.hidden = true;
    flatten();
    sound.hum(false); sound.rain(false);
    if (typeof Music !== "undefined") Music.set({ far: false });
    PC.focus();
    await veilTo(0, 420, true);
  });
  if (going) { sound.wake(); sound.click(); showHint(); }
}

async function leavePC({ unzoom = true } = {}) {
  if (mode !== "pc" || !rig) return;
  await veilTo(1, 140);
  mode = "room";
  onGlass();
  layer.hidden = false;
  resize();
  rig.put("in");
  if (typeof Music !== "undefined") Music.set({ far: true });
  roomSounds();
  start();
  await frames(2);
  veilTo(0, 320);
  if (unzoom) rig.unzoom();
}

/* ── power ───────────────────────────────────────────── */

function powerOn() {
  if (power === "on" || (rig.busy && rig.phase !== "in")) return;
  if (usedHere) {                                 // the game has been played on this page: start it clean
    try { sessionStorage.setItem(FLAG, JSON.stringify({ at: "seated", power: "boot" })); } catch { /* private */ }
    veilTo(1, 260).then(() => location.reload());
    return;
  }
  sound.wake(); sound.powerOn();
  pc.classList.remove("pc--off");
  power = "on"; beamTo = 1; beamRate = 1 / 0.6;
  glass.flash.value = 0.25;
  roomSounds();
  showHint();
}

async function shutDown() {
  if (power === "off" || !rig) return;
  if (typeof Music !== "undefined") Music.stop();
  if (mode === "pc") await leavePC({ unzoom: false });
  sound.wake(); sound.powerOff();
  power = "off"; beamTo = 0; beamRate = 1 / 0.45;
  roomSounds();
  showHint();
  await wait(750);
  if (rig.phase === "in") rig.unzoom();
}

// The tower's own button, from across the room: the game saves, then off.
async function towerButton() {
  if (power === "on") {
    try { if (typeof Bridge !== "undefined") await Bridge.flush(); } catch { /* nothing to save */ }
    shutDown();
  } else powerOn();
}

function roomSounds() {
  sound.hum(mode === "room" && power === "on");
  sound.rain(mode === "room" && shell.view.weather === "rain");
}

/* ── input ───────────────────────────────────────────── */

const CAUGHT = ["pointerdown", "pointermove", "pointerup", "pointercancel", "mousedown", "mouseup", "mousemove",
  "click", "dblclick", "contextmenu", "wheel", "touchstart", "touchmove", "touchend"];

function bind() {
  for (const t of CAUGHT) addEventListener(t, onPointer, { capture: true, passive: false });
  addEventListener("keydown", onKey, true);
  addEventListener("keyup", onKey, true);
  addEventListener("blur", () => pressed.clear());
}

function onPointer(e) {
  if (mode !== "room") return;
  e.stopPropagation();
  if (e.type === "contextmenu" || e.type === "wheel") e.preventDefault();
  if (e.type === "pointerdown") down(e);
  else if (e.type === "pointermove") move(e);
  else if (e.type === "pointerup" || e.type === "pointercancel") up(e);
  else if (e.type === "wheel") wheel(e);
}

function aim(e) {
  pointer.set(((e.clientX - fit.left) / fit.w) * 2 - 1, -((e.clientY - fit.top) / fit.h) * 2 + 1);
}

function down(e) {
  if (e.button !== 0) return;
  sound.wake();
  aim(e);
  if (rig.busy) return;
  if (rig.phase === "wide") { rig.sit(); return; }
  if (rig.phase === "seated") {
    press = { x: e.clientX, y: e.clientY, t: performance.now(), dragged: false };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* not ours */ }
  }
}

function move(e) {
  aim(e);
  rig.pointer(pointer.x, pointer.y);
  if (rig.phase !== "seated") { canvas.style.cursor = rig.phase === "wide" ? "pointer" : ""; return; }
  if (press) {
    if (!isClick(e.clientX - press.x, e.clientY - press.y, 0)) press.dragged = true;
    if (press.dragged) { rig.drag(e.movementX, e.movementY); canvas.style.cursor = "grabbing"; return; }
  }
  hover();
}

function up(e) {
  const p = press;
  press = null;
  if (!p || rig.phase !== "seated" || rig.busy) return;
  aim(e);
  if (p.dragged || !isClick(e.clientX - p.x, e.clientY - p.y, performance.now() - p.t)) { hover(); return; }
  const hit = pick();
  if (hit.screen) { if (power === "on") enterPC(); else powerOn(); }
  else if (hit.power) towerButton();
  else if (hit.poster) poster(hit.poster);
}

function wheel(e) {
  if (rig.busy) return;
  if (rig.phase === "wide") { rig.sit(); return; }
  if (rig.phase !== "seated") return;
  const now = performance.now();
  if (now - seatedAt < 900) return;               // the scroll that sat you down, still coasting
  if (now - wheelAt > 350) wheelSum = 0;
  wheelAt = now;
  wheelSum += e.deltaY;
  if (wheelSum < -140) { wheelSum = 0; if (power === "on") enterPC(); }
  else if (wheelSum > 180) { wheelSum = 0; rig.stand(); }
}

function onKey(e) {
  if (mode === "pc") {
    // On the world side with nothing open, Esc gets you up from the desk.
    if (e.type === "keydown" && e.key === "Escape" && !e.repeat && PC.worldIdle()) {
      e.stopPropagation(); e.preventDefault();
      leavePC();
    }
    return;
  }
  e.stopPropagation();                             // across the room, the game hears nothing
  if (e.type === "keyup") { pressed.delete(e.code); return; }
  sound.wake();
  if (rig.phase === "seated") pressed.add(e.code);
  if (e.repeat || rig.busy) return;
  if (e.key === "Escape") { if (rig.phase === "seated") rig.stand(); }
  else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (rig.phase === "wide") rig.sit();
    else if (rig.phase === "seated") { if (power === "on") enterPC(); else powerOn(); }
  }
}

function pick() {
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(scene.children, true)[0];
  const d = hit ? hit.object.userData : {};
  return { screen: !!d.screen, power: !!d.power, poster: d.poster || null };
}

function hover() {
  const hit = pick();
  canvas.style.cursor = hit.screen || hit.power || (hit.poster && power === "on") ? "pointer" : "grab";
  const d = hit.poster ? PC.discipline(hit.poster) : null;
  const next = d ? (d.label + " — " + d.concept).toUpperCase() + (power === "on" && PC.side() === "world" ? " · CLICK TO PUT IT ON THE SCREEN" : "") : "";
  if (next !== label) { label = next; showHint(); }
}

function poster(id) {
  if (power !== "on") return;
  if (PC.pick(id)) sound.click();
}

function showHint() {
  if (!hint) return;
  let text = "";
  if (label && rig.phase === "seated") text = label;
  else if (mode === "room" && !rig.busy) text = rig.phase === "wide" ? HINT.wide : rig.phase === "seated" ? HINT[power === "on" ? "seated" : "off"] : "";
  hint.textContent = text;
  hint.classList.toggle("is-label", !!label && rig.phase === "seated");
}

function veilTo(opacity, ms, white = false) {
  if (!veil) return Promise.resolve();
  veil.classList.toggle("is-white", white);
  veil.style.transition = "none";
  if (ms) {
    void veil.offsetWidth;
    veil.style.transition = "opacity " + ms + "ms ease";
  }
  veil.style.opacity = String(opacity);
  return wait(ms);
}
