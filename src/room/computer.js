// computer.js — the machine the game runs on: a CRT whose glass is the game's
// screen, a beige tower with a power button that works, two small speakers
// that thump with the desk's music, a keyboard whose keys go down when yours
// do, and a mouse on its pad.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { DESK, MONITOR, TOWER, SPEAKERS, KEYBOARD, MOUSE } from "./layout.js";
import { tex, plasticCanvas, badgeCanvas, towerFrontCanvas, padCanvas } from "./textures.js";
import { std, box } from "./shell.js";
import { inkAsOne } from "./post.js";

// A box that tapers along z: front face wF×hF at +depth/2, back face wB×hB.
// Flat-shaded, so each face of the hood reads as its own plane.
function taper(wF, hF, wB, hB, depth) {
  const f = depth / 2, v = [
    [-wF / 2, -hF / 2, f], [wF / 2, -hF / 2, f], [wF / 2, hF / 2, f], [-wF / 2, hF / 2, f],
    [-wB / 2, -hB / 2, -f], [wB / 2, -hB / 2, -f], [wB / 2, hB / 2, -f], [-wB / 2, hB / 2, -f],
  ];
  const quads = [[0, 1, 2, 3], [5, 4, 7, 6], [1, 5, 6, 2], [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0]];
  const pos = [], uv = [], q = [[0, 0], [1, 0], [1, 1], [0, 1]];
  for (const quad of quads) for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...v[quad[i]]); uv.push(...q[i]); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function rectPath(p, w, h, cy = 0) {
  p.moveTo(-w / 2, cy - h / 2); p.lineTo(w / 2, cy - h / 2); p.lineTo(w / 2, cy + h / 2); p.lineTo(-w / 2, cy + h / 2); p.closePath();
  return p;
}

export function buildComputer(scene, glassMaterial) {
  const g = new THREE.Group();
  g.name = "computer";
  const top = DESK.top;
  const plastic = (color) => std(0xffffff, 0.88, { map: tex(plasticCanvas(color), { repeat: [3, 3] }), color });

  /* ── the monitor: origin at the centre of the glass ── */
  const M = MONITOR, gw = M.glassW, gh = M.glassH;
  const mon = new THREE.Group();
  mon.name = "monitor";
  const shell = plastic(M.plastic), hoodMat = plastic(M.hood);
  const bw = gw + 0.075, bh = gh + 0.1, by = -0.015;      // bezel: a thin brow, a deeper chin
  const bezelShape = rectPath(new THREE.Shape(), bw, bh, by);
  bezelShape.holes.push(rectPath(new THREE.Path(), gw + 0.004, gh + 0.004));
  const bezel = new THREE.Mesh(new THREE.ExtrudeGeometry(bezelShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1 }), shell);
  bezel.position.z = -0.056;
  bezel.castShadow = bezel.receiveShadow = true;
  mon.add(bezel);
  box(gw + 0.01, gh + 0.01, 0.01, std(0x0c0e0d, 0.9), 0, 0, -0.04, mon);          // dark behind the gap
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), glassMaterial);
  glass.position.z = -0.01;                                                        // just behind the bezel's face
  glass.userData.screen = true;
  mon.add(glass);
  const hood = new THREE.Mesh(taper(bw - 0.012, bh - 0.012, bw * 0.6, bh * 0.66, M.depth - 0.05), hoodMat);
  hood.position.set(0, by + 0.01, -0.05 - (M.depth - 0.05) / 2);
  hood.castShadow = hood.receiveShadow = true;
  mon.add(hood);
  const hf = (bh - 0.012) / 2, hb = (bh * 0.66) / 2, run = M.depth - 0.05;
  for (let i = 0; i < 6; i++) {                                                    // vents along the top of the hood
    const z = -0.16 - i * 0.035, f = (-0.05 - z) / run;
    const vent = box(0.16, 0.004, 0.012, std(0x8f887a, 0.9), 0, by + 0.01 + hf + (hb - hf) * f + 0.001, z, mon);
    vent.rotation.x = Math.atan2(hf - hb, run);
  }
  const base = -M.raise;
  box(0.15, 0.05, 0.15, shell, 0, base + 0.055, -0.17, mon);                       // tilt-swivel neck
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.145, 0.028, 22), shell);
  foot.position.set(0, base + 0.014, -0.17);
  foot.castShadow = foot.receiveShadow = true;
  mon.add(foot);
  const chin = by - bh / 2 + 0.03;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.015), std(0xffffff, 0.5, { map: tex(badgeCanvas()) }));
  badge.position.set(-bw / 2 + 0.065, chin, 0.001);
  mon.add(badge);
  for (let i = 0; i < 3; i++) box(0.02, 0.009, 0.006, std(0xbdb49f, 0.6), 0.06 + i * 0.03, chin, 0.002, mon);
  box(0.03, 0.013, 0.008, std(0xbdb49f, 0.6), bw / 2 - 0.05, chin, 0.003, mon);
  const monLed = box(0.006, 0.006, 0.004, new THREE.MeshBasicNodeMaterial({ color: 0x1a3a22 }), bw / 2 - 0.08, chin, 0.003, mon);
  mon.position.set(M.x, top + M.raise, M.z);
  g.add(mon);

  /* ── the tower: a group, so its button and lights turn with it ── */
  const T = TOWER;
  const tw = new THREE.Group();
  tw.name = "tower";
  tw.position.set(T.x, top, T.z);
  tw.rotation.y = T.ry || 0;
  const side = plastic(T.plastic);
  const front = std(0xffffff, 0.85, { map: tex(towerFrontCanvas(T.plastic)) });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(T.w, T.h, T.d), [side, side, side, side, front, side]);
  tower.position.y = T.h / 2;
  tower.castShadow = tower.receiveShadow = true;
  tw.add(tower);
  const face = T.d / 2, btnY = T.h * 0.42;
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 16), std(0x9d9584, 0.5));
  power.rotation.x = Math.PI / 2;
  power.position.set(0.04, btnY, face + 0.006);
  power.userData.power = true;
  tw.add(power);
  const ledOn = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.2, 1.6, 0.5) });
  const ledOff = new THREE.MeshBasicNodeMaterial({ color: 0x14301c });
  const hddOn = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(1.7, 0.9, 0.15) });
  const hddOff = new THREE.MeshBasicNodeMaterial({ color: 0x3a2a10 });
  const led = box(0.008, 0.004, 0.004, ledOff, -0.045, btnY + 0.006, face + 0.002, tw);
  const hdd = box(0.008, 0.004, 0.004, hddOff, -0.045, btnY - 0.006, face + 0.002, tw);
  g.add(tw);

  /* ── speakers, either side of the monitor ── */
  const S = SPEAKERS, cones = [];
  for (const sx of [-1, 1]) {
    const x = M.x + sx * S.dx;
    box(S.w, S.h, S.d, plastic(0xd2c9b4), x, top + S.h / 2, S.z, g);
    box(S.w - 0.012, S.h - 0.03, 0.004, std(0x3a3a40, 0.95), x, top + S.h / 2 + 0.004, S.z + S.d / 2 + 0.002, g);
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), std(0x55555c, 0.6));
    cone.position.set(x, top + S.h / 2 + 0.018, S.z + S.d / 2 + 0.0045);
    g.add(cone);
    const tweet = new THREE.Mesh(new THREE.CircleGeometry(0.011, 12), std(0x6a6a72, 0.4));
    tweet.position.set(x, top + S.h - 0.03, S.z + S.d / 2 + 0.0045);
    g.add(tweet);
    cones.push(cone);
  }

  /* ── keyboard: a full 90s board, one mesh per key so each can go down ── */
  const K = KEYBOARD, u = 0.0182, keys = new Map();
  const kb = new THREE.Group();
  kb.name = "keyboard";
  const light = inkAsOne(std(0xe9e3d3, 0.7)), dark = inkAsOne(std(0xc2baa6, 0.7));
  const MAIN = [
    [["Escape", 1, 1], [null, 1], ...["F1", "F2", "F3", "F4"].map((k) => [k, 1]), [null, 0.5], ...["F5", "F6", "F7", "F8"].map((k) => [k, 1]), [null, 0.5], ...["F9", "F10", "F11", "F12"].map((k) => [k, 1])],
    [["Backquote", 1], ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => ["Digit" + d, 1]), ["Minus", 1], ["Equal", 1], ["Backspace", 2, 1]],
    [["Tab", 1.5, 1], ..."QWERTYUIOP".split("").map((c) => ["Key" + c, 1]), ["BracketLeft", 1], ["BracketRight", 1], ["Backslash", 1.5]],
    [["CapsLock", 1.75, 1], ..."ASDFGHJKL".split("").map((c) => ["Key" + c, 1]), ["Semicolon", 1], ["Quote", 1], ["Enter", 2.25, 1]],
    [["ShiftLeft", 2.25, 1], ..."ZXCVBNM".split("").map((c) => ["Key" + c, 1]), ["Comma", 1], ["Period", 1], ["Slash", 1], ["ShiftRight", 2.75, 1]],
    [["ControlLeft", 1.25, 1], ["MetaLeft", 1.25, 1], ["AltLeft", 1.25, 1], ["Space", 6.25], ["AltRight", 1.25, 1], ["MetaRight", 1.25, 1], ["ContextMenu", 1.25, 1], ["ControlRight", 1.25, 1]],
  ];
  const cap = (code, w, isDark, x, row) => {
    const k = box(w * u - 0.002, 0.009, u - 0.002, isDark ? dark : light, x + (w * u) / 2, 0.019, row * u + (row ? u * 0.4 : 0), kb);
    k.castShadow = false;
    if (code) { k.userData.restY = k.position.y; keys.set(code, k); }
  };
  MAIN.forEach((row, r) => {
    let x = 0;
    for (const [code, w, isDark] of row) { if (code) cap(code, w, isDark, x, r); x += w * u; }
  });
  const block = (codes, x0, r0) => codes.forEach((row, r) => row.forEach((code, c) => { if (code) cap(code, 1, true, x0 + c * u, r0 + r); }));
  block([["Insert", "Home", "PageUp"], ["Delete", "End", "PageDown"]], 15.4 * u, 1);
  block([[null, "ArrowUp", null], ["ArrowLeft", "ArrowDown", "ArrowRight"]], 15.4 * u, 4);
  block([["NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract"], ["Numpad7", "Numpad8", "Numpad9", "NumpadAdd"], ["Numpad4", "Numpad5", "Numpad6", null], ["Numpad1", "Numpad2", "Numpad3", "NumpadEnter"], ["Numpad0", null, "NumpadDecimal", null]], 18.8 * u, 1);
  const kbW = 22.9 * u, kbD = 6.7 * u;
  box(kbW + 0.02, 0.018, kbD + 0.02, plastic(0x9c9482), kbW / 2, 0.009, kbD / 2 - u * 0.3, kb);
  kb.position.set(K.x - kbW / 2, top + kbD * Math.sin(K.tilt), K.z - kbD / 2);   // tilted up at the back, feet on the desk
  kb.rotation.x = K.tilt;
  g.add(kb);

  /* ── mouse and pad ── */
  const pad = box(0.23, 0.003, 0.19, std(0xffffff, 0.95, { map: tex(padCanvas()) }), MOUSE.x, top + 0.0015, MOUSE.z, g);
  pad.castShadow = false;
  const mouse = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.045, 4, 10), plastic(0xe0d8c4));
  mouse.rotation.x = Math.PI / 2;
  mouse.scale.set(1, 1, 0.55);
  mouse.position.set(MOUSE.x + 0.02, top + 0.016, MOUSE.z + 0.02);
  mouse.castShadow = true;
  g.add(mouse);

  scene.add(g);
  mon.updateMatrixWorld(true);
  return {
    group: g, monitor: mon, glass, power, cones, keys, mouse,
    // The lights on the machine: power, the disk, the monitor's own.
    setLights(on, disk) {
      led.material = on ? ledOn : ledOff;
      monLed.material = on ? ledOn : ledOff;
      hdd.material = on && disk ? hddOn : hddOff;
    },
  };
}
