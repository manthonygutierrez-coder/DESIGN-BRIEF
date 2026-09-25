// shell.js — the room itself: floor, four walls and a ceiling (you can turn
// all the way round while seated, so it is closed on every side), the window
// cut into the back wall, the door, the corkboard and the posters.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { ROOM, WINDOW, DOOR, CORKBOARD, POSTERS, PROPS } from "./layout.js";
import { tex, wallCanvas, floorCanvas, rugCanvas, corkCanvas, posterCanvas } from "./textures.js";
import { createWindowView } from "./window.js";

export const std = (color, rough = 0.9, extra = {}) => new THREE.MeshStandardNodeMaterial(Object.assign({ color, roughness: rough, metalness: 0 }, extra));
export function box(w, h, d, mat, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function plane(w, h, mat, x, y, z, ry = 0, rx = 0, parent) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// A wall with a rectangular hole in it (for the window), in the same frame a
// PlaneGeometry of the same size would have.
function holedWall(w, h, hx, hy, hw, hh) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
  const hole = new THREE.Path();
  const lx = hx, ly = hy - h / 2;
  hole.moveTo(lx - hw / 2, ly - hh / 2); hole.lineTo(lx - hw / 2, ly + hh / 2);
  hole.lineTo(lx + hw / 2, ly + hh / 2); hole.lineTo(lx + hw / 2, ly - hh / 2); hole.closePath();
  s.holes.push(hole);
  const geo = new THREE.ShapeGeometry(s);
  const pos = geo.attributes.position, uv = geo.attributes.uv;   // UVs in metres, so the plaster tiles evenly
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) + w / 2, pos.getY(i) + h / 2);
  return geo;
}

export function buildShell(scene) {
  const g = new THREE.Group();
  g.name = "room";
  const { left, right, back, front, height } = ROOM;
  const width = right - left, depth = front - back, cx = (left + right) / 2, cz = (back + front) / 2;

  const floorTex = tex(floorCanvas(ROOM.floor), { repeat: [width / 0.9, depth / 0.9] });
  plane(width, depth, std(0xffffff, 0.85, { map: floorTex }), cx, 0, cz, 0, -Math.PI / 2, g);

  const wallTex = (w, h) => tex(wallCanvas(ROOM.wall), { repeat: [w / 0.6, h / 0.6] });
  const wallMat = (w, h) => std(0xffffff, 1, { map: wallTex(w, h) });
  const backMat = std(0xffffff, 1, { map: tex(wallCanvas(ROOM.wall), { repeat: [1 / 0.6, 1 / 0.6] }) });
  const back_ = new THREE.Mesh(holedWall(width, height, WINDOW.x - cx, WINDOW.y, WINDOW.w, WINDOW.h), backMat);
  back_.position.set(cx, height / 2, back); back_.receiveShadow = back_.castShadow = true; g.add(back_);   // the window is the only way daylight gets in
  plane(width, height, wallMat(width, height), cx, height / 2, front, Math.PI, 0, g);
  plane(depth, height, wallMat(depth, height), left, height / 2, cz, Math.PI / 2, 0, g);
  plane(depth, height, wallMat(depth, height), right, height / 2, cz, -Math.PI / 2, 0, g);
  plane(width, depth, std(ROOM.ceiling, 1), cx, height, cz, 0, Math.PI / 2, g).castShadow = true;

  const trim = std(ROOM.trim, 0.7);
  box(width, 0.1, 0.02, trim, cx, 0.05, back + 0.01, g);
  box(width, 0.1, 0.02, trim, cx, 0.05, front - 0.01, g);
  box(0.02, 0.1, depth, trim, left + 0.01, 0.05, cz, g);
  box(0.02, 0.1, depth, trim, right - 0.01, 0.05, cz, g);

  // ── the window: the view sits well behind the wall, in two layers ──
  const view = createWindowView();
  const W = WINDOW;
  const farMat = new THREE.MeshBasicNodeMaterial({ map: view.far });
  const nearMat = new THREE.MeshBasicNodeMaterial({ map: view.near, transparent: true });
  plane(W.w * 2.2, W.h * 2.2, farMat, W.x, W.y, back - 0.55, 0, 0, g).receiveShadow = false;
  plane(W.w * 1.6, W.h * 1.6, nearMat, W.x, W.y, back - 0.12, 0, 0, g).receiveShadow = false;
  const frame = std(0xe8e1d0, 0.7);
  box(W.w + 0.1, 0.06, 0.08, frame, W.x, W.y + W.h / 2 + 0.03, back + 0.02, g);
  box(W.w + 0.1, 0.06, 0.08, frame, W.x, W.y - W.h / 2 - 0.03, back + 0.02, g);
  box(0.06, W.h, 0.08, frame, W.x - W.w / 2 - 0.03, W.y, back + 0.02, g);
  box(0.06, W.h, 0.08, frame, W.x + W.w / 2 + 0.03, W.y, back + 0.02, g);
  box(0.035, W.h, 0.05, frame, W.x, W.y, back + 0.01, g);                         // mullion
  box(W.w, 0.035, 0.05, frame, W.x, W.y + 0.08, back + 0.01, g);                   // transom
  box(W.w + 0.26, 0.05, 0.2, std(0x8a6848, 0.7), W.x, W.y - W.h / 2 - 0.08, back + 0.1, g);   // sill
  for (let i = 0; i < 5; i++) box(W.w, 0.03, 0.015, std(0xe6dfcc, 0.6), W.x, W.y + W.h / 2 - 0.05 - i * 0.055, back + 0.07, g);   // blinds, half up

  // ── the door, on the right ──
  const doorMat = std(0x6a4a33, 0.7);
  box(0.05, DOOR.h, DOOR.w, doorMat, right - 0.03, DOOR.h / 2, DOOR.z, g);
  box(0.03, DOOR.h + 0.08, DOOR.w + 0.12, std(0x3d2b1e, 0.75), right - 0.015, (DOOR.h + 0.08) / 2, DOOR.z, g);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), std(0xc9b26a, 0.35, { metalness: 0.7 }));
  knob.position.set(right - 0.08, 1.0, DOOR.z - DOOR.w / 2 + 0.1); g.add(knob);

  // ── corkboard over the tower ──
  const C = CORKBOARD;
  box(C.w + 0.05, C.h + 0.05, 0.025, std(0x6b4a2c, 0.7), C.x, C.y, back + 0.013, g);
  plane(C.w, C.h, std(0xffffff, 0.95, { map: tex(corkCanvas()) }), C.x, C.y, back + 0.028, 0, 0, g);

  // ── the seven disciplines ──
  for (const p of POSTERS) {
    const mat = std(0xffffff, 0.9, { map: tex(posterCanvas(p.id)) });
    const at = {
      back: [p.x, p.y, back + 0.012, 0],
      front: [p.x, p.y, front - 0.012, Math.PI],
      left: [left + 0.012, p.y, p.z, Math.PI / 2],
      right: [right - 0.012, p.y, p.z, -Math.PI / 2],
    }[p.wall];
    const m = plane(p.w, (p.w * 88) / 56, mat, at[0], at[1], at[2], at[3], 0, g);   // the canvas is 56×88
    m.userData.poster = p.id;
  }

  // ── the rug under the chair ──
  const R = PROPS.rug;
  plane(R.w, R.d, std(0xffffff, 1, { map: tex(rugCanvas()) }), R.x, 0.004, R.z, 0, -Math.PI / 2, g);

  scene.add(g);
  return { group: g, view };
}
