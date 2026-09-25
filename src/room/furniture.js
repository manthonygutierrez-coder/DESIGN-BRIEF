// furniture.js — the desk, the chair, the shelves, and the things a designer
// leaves on a desk: a lamp, a mug, a sketchbook, a swatch fan, some disks.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { DESK, LAMP, CHAIR, PROPS } from "./layout.js";
import { tex, woodCanvas, mugCanvas, sketchbookCanvas } from "./textures.js";
import { std, box } from "./shell.js";

// A rod from a to b (a lamp's arm).
function rod(a, b, r, mat, parent) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

function cyl(rt, rb, h, mat, x, y, z, parent, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// Every colour a designer might pin up, borrowed from the seven disciplines.
const INKS = [0xe0442b, 0xefa845, 0x4fd1c5, 0x1e3a58, 0xb24a6e, 0x2e3a8c, 0xc4643f, 0x57e0ff, 0xd3452f, 0xffb656, 0x8fafcb, 0x3c8c3c];

export function buildFurniture(scene) {
  const g = new THREE.Group();
  g.name = "furniture";
  const D = DESK, top = D.top;

  // ── the desk: birch top, a drawer pedestal on the left, steel legs right ──
  const wood = std(0xffffff, 0.75, { map: tex(woodCanvas(D.wood, D.edge)) });
  const edge = std(D.edge, 0.7);
  box(D.w, D.thick, D.d, wood, D.x, top - D.thick / 2, D.z, g).name = "desk";
  box(D.w, 0.012, D.d, edge, D.x, top - D.thick - 0.006, D.z, g);
  const ped = { x: D.x - D.w / 2 + 0.24, w: 0.44 };
  const pedH = top - D.thick - 0.012;
  box(ped.w, pedH, D.d - 0.04, std(0xd8cdb5, 0.8), ped.x, pedH / 2, D.z, g);
  for (let i = 0; i < 3; i++) {
    const y = pedH - 0.13 - i * 0.23;
    box(ped.w - 0.04, 0.2, 0.012, std(0xe4dac3, 0.75), ped.x, y, D.z + D.d / 2 - 0.014, g);
    box(0.1, 0.014, 0.02, std(0x3b3d44, 0.4, { metalness: 0.6 }), ped.x, y + 0.05, D.z + D.d / 2 - 0.002, g);
  }
  const steel = std(D.leg, 0.45, { metalness: 0.5 });
  for (const dz of [-1, 1]) box(0.04, pedH, 0.04, steel, D.x + D.w / 2 - 0.05, pedH / 2, D.z + dz * (D.d / 2 - 0.05), g);
  box(0.03, 0.03, D.d - 0.1, steel, D.x + D.w / 2 - 0.05, 0.12, D.z, g);
  box(D.w - 0.6, 0.18, 0.012, std(0x2f3137, 0.8), D.x + 0.25, top - 0.13, D.z - D.d / 2 + 0.03, g);   // modesty panel

  // ── the chair ──
  const C = CHAIR;
  const chair = new THREE.Group();
  chair.name = "chair";
  const fabric = std(C.fabric, 0.95), black = std(0x1b1c20, 0.5), accent = std(C.accent, 0.8);
  box(0.47, 0.08, 0.45, fabric, 0, 0.48, 0, chair);
  box(0.47, 0.012, 0.45, accent, 0, 0.44, 0, chair);
  const backrest = box(0.44, 0.5, 0.07, fabric, 0, 0.84, 0.25, chair);
  backrest.rotation.x = -0.12;
  box(0.05, 0.3, 0.03, black, 0, 0.6, 0.25, chair);
  for (const s of [-1, 1]) {
    box(0.05, 0.2, 0.04, black, s * 0.26, 0.56, 0.02, chair);
    box(0.07, 0.03, 0.26, black, s * 0.26, 0.67, 0.02, chair);
  }
  cyl(0.028, 0.028, 0.3, std(0x8a8d94, 0.3, { metalness: 0.8 }), 0, 0.3, 0, chair);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, arm = box(0.3, 0.035, 0.05, black, Math.cos(a) * 0.15, 0.09, Math.sin(a) * 0.15, chair);
    arm.rotation.y = -a;
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), black);
    wheel.position.set(Math.cos(a) * 0.29, 0.035, Math.sin(a) * 0.29);
    chair.add(wheel);
  }
  chair.position.set(C.away.x, 0, C.away.z);
  chair.rotation.y = C.away.ry;
  g.add(chair);

  // ── the desk lamp, red: a base, two arms, a shade over the mouse hand ──
  const L = LAMP, red = std(L.color, 0.5);
  cyl(0.075, 0.085, 0.025, red, L.x, top + 0.012, L.z, g, 18);
  const base = new THREE.Vector3(L.x, top + 0.025, L.z);
  const elbow = new THREE.Vector3(L.x - 0.02, top + 0.46, L.z + 0.1);
  const head = new THREE.Vector3(L.x - 0.14, top + 0.47, L.z + 0.38);
  rod(base, elbow, 0.011, red, g);
  rod(elbow, head, 0.011, red, g);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.13, 18, 1, true), std(L.color, 0.5, { side: THREE.DoubleSide }));
  shade.position.copy(head).add(new THREE.Vector3(0, -0.04, 0.02));
  shade.rotation.set(0.35, 0, -0.18);
  shade.castShadow = true;
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(2.2, 1.9, 1.3) }));
  bulb.position.copy(head).add(new THREE.Vector3(0, -0.085, 0.035));
  g.add(bulb);
  const lampAt = bulb.position.clone(), lampAim = new THREE.Vector3(L.x - 0.3, top, L.z + 0.62);

  // ── mug, sketchbook, pencil, swatch fan, floppy disks, a plant ──
  const P = PROPS;
  cyl(0.04, 0.036, 0.095, std(0xffffff, 0.5, { map: tex(mugCanvas()) }), P.mug.x, top + 0.048, P.mug.z, g, 16);
  cyl(0.036, 0.036, 0.002, std(0x2a1a10, 0.3), P.mug.x, top + 0.088, P.mug.z, g, 16);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 12, Math.PI), std(0xf2ece0, 0.5));
  handle.position.set(P.mug.x + 0.04, top + 0.05, P.mug.z); handle.rotation.z = -Math.PI / 2;
  g.add(handle);

  const book = box(0.22, 0.016, 0.29, std(0xffffff, 0.9, { map: tex(sketchbookCanvas()) }), P.sketchbook.x, top + 0.008, P.sketchbook.z, g);
  book.rotation.y = P.sketchbook.ry;
  const pencil = cyl(0.004, 0.004, 0.17, std(0xf2c230, 0.6), P.sketchbook.x + 0.02, top + 0.02, P.sketchbook.z, g, 6);
  pencil.rotation.set(Math.PI / 2, 0, 0.6);

  for (let i = 0; i < 7; i++) {                 // a swatch fan, spread open
    const slat = box(0.034, 0.003, 0.15, std(INKS[i], 0.8), 0, 0, 0);
    const pivot = new THREE.Group();
    pivot.position.set(P.swatches.x, top + 0.003 + i * 0.0032, P.swatches.z);
    pivot.rotation.y = P.swatches.ry + (i - 3) * 0.2;
    slat.position.z = -0.065;
    pivot.add(slat);
    g.add(pivot);
  }

  [0x2e3a8c, 0xe0442b, 0x3c8c3c, 0x14110e].forEach((c, i) => {   // floppies, not quite stacked
    const d = box(0.09, 0.003, 0.094, std(c, 0.5), P.floppies.x + (i % 2) * 0.01, top + 0.002 + i * 0.0032, P.floppies.z - i * 0.006, g);
    d.rotation.y = i * 0.12 - 0.15;
  });

  cyl(0.06, 0.05, 0.1, std(0xc4643f, 0.8), P.plant.x, top + 0.05, P.plant.z, g, 12);
  const leaf = [0x3f7a44, 0x4f9150, 0x2f6034];
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39, r = 0.02 + (i % 3) * 0.02;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 2) * 0.01, 7, 5), std(leaf[i % 3], 0.9));
    s.position.set(P.plant.x + Math.cos(a) * r, top + 0.13 + (i % 4) * 0.035, P.plant.z + Math.sin(a) * r);
    s.scale.y = 0.7;
    s.castShadow = true;
    g.add(s);
  }

  // ── the bookshelf on the left wall ──
  const B = PROPS.bookshelf, shelf = std(0x8a6a48, 0.75);
  const sw = 0.34, sd = 1.1, sh = 1.9;
  box(sw, 0.03, sd, shelf, B.x, sh, B.z, g);
  box(sw, sh, 0.03, shelf, B.x, sh / 2, B.z - sd / 2, g);
  box(sw, sh, 0.03, shelf, B.x, sh / 2, B.z + sd / 2, g);
  box(0.02, sh, sd, std(0x6e5238, 0.8), B.x - sw / 2 + 0.01, sh / 2, B.z, g);
  let seed = 3;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let s = 0; s < 5; s++) {
    const y = 0.05 + s * 0.38;
    box(sw, 0.025, sd, shelf, B.x, y, B.z, g);
    let z = B.z - sd / 2 + 0.04;
    while (z < B.z + sd / 2 - 0.06) {
      const w = 0.025 + r() * 0.035, h = 0.2 + r() * 0.12;
      if (r() < 0.12) { z += 0.06; continue; }                     // a gap
      const b = box(0.2 + r() * 0.06, h, w, std(INKS[(r() * INKS.length) | 0], 0.85), B.x + 0.02, y + 0.013 + h / 2, z + w / 2, g);
      if (r() < 0.08) b.rotation.x = 0.18;                          // one leaning
      z += w + 0.004;
    }
  }

  // ── a bin of discarded thumbnails ──
  const bin = cyl(0.13, 0.11, 0.3, std(0x3a3d45, 0.6, { side: THREE.DoubleSide }), PROPS.bin.x, 0.15, PROPS.bin.z, g, 16);
  bin.geometry = new THREE.CylinderGeometry(0.13, 0.11, 0.3, 16, 1, true);
  for (let i = 0; i < 5; i++) {
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 0), std(0xf2ece0, 1));
    ball.position.set(PROPS.bin.x + Math.cos(i * 2.1) * 0.05, 0.25 + (i % 2) * 0.04, PROPS.bin.z + Math.sin(i * 2.1) * 0.05);
    ball.rotation.set(i, i * 2, 0);
    g.add(ball);
  }

  // ── a floor lamp in the far corner, so the room is never black ──
  const F = PROPS.floorLamp;
  cyl(0.14, 0.16, 0.03, std(0x2b2d33, 0.5), F.x, 0.015, F.z, g, 16);
  cyl(0.012, 0.012, 1.55, std(0x2b2d33, 0.4, { metalness: 0.4 }), F.x, 0.8, F.z, g, 8);
  const fshade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.26, 18, 1, true), std(0xf1e4c8, 0.9, { side: THREE.DoubleSide, emissive: 0xffc98a, emissiveIntensity: 0.55 }));
  fshade.position.set(F.x, 1.62, F.z);
  g.add(fshade);
  const floorLampAt = new THREE.Vector3(F.x, 1.55, F.z);

  scene.add(g);
  return { group: g, chair, lampAt, lampAim, floorLampAt };
}
