// glass.js — the CRT's face. The game is not drawn here: it is the real page,
// placed exactly behind this glass (see main.js), and the glass is a window
// onto it. Where the tube is lit, the glass writes almost no alpha, so the
// page shows through; on top it lays what a tube adds (scanlines, darker
// corners, a faint reflection). Outside the lit area it is dark glass.
//
// `beam` runs the tube: 1 is a full picture, 0 is off. Switching off, the
// picture folds to a bright line and the line to a dot; switching on unfolds.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { Fn, uv, vec2, vec3, vec4, float, uniform, smoothstep, max, min, abs, mix, screenCoordinate, fract, clamp } from "./vendor/three/three.tsl.min.js";

export function createGlass() {
  const beam = uniform(1);          // 0 off … 1 full picture
  const flash = uniform(0);         // a white pop, for the moment it comes on

  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = Fn(() => {
    const p = uv().sub(0.5).mul(2).abs();                       // 0 at the centre, 1 at the edges
    // The lit area: height folds first (beam 1 → 0.5), then width (0.5 → 0).
    const hh = mix(float(0.012), float(1), clamp(beam.sub(0.5).mul(2), 0, 1));
    const hw = mix(float(0.01), float(1), clamp(beam.mul(2), 0, 1));
    const on = smoothstep(0.02, 0.06, beam);
    const inside = float(1).sub(smoothstep(hw.sub(0.02), hw, p.x)).mul(float(1).sub(smoothstep(hh.sub(0.02), hh, p.y))).mul(on);
    // The line is hot while it is a line.
    const hot = float(1).sub(smoothstep(0.35, 0.6, beam)).mul(on).mul(inside);

    // What a tube lays over the picture: every other room pixel a little
    // darker (so the scanlines stay crisp at any distance), corners darker.
    const scan = fract(screenCoordinate.y.mul(0.5)).step(0.5).mul(0.1);
    const corner = smoothstep(0.55, 1.0, max(p.x, p.y)).mul(0.28).add(smoothstep(1.2, 1.9, p.x.add(p.y)).mul(0.3));
    // The canvas turns these from linear light to sRGB, which lifts small
    // values a lot (0.03 becomes about 0.19): what the glass adds over the page
    // has to be tiny to read as a faint sheen, not a haze.
    const reflect = smoothstep(0.35, 0.0, abs(uv().x.add(uv().y.mul(0.6)).sub(0.3))).mul(0.004);

    const darkGlass = vec3(0.028, 0.034, 0.032).add(reflect.mul(9));
    // Premultiplied: light added over the page, and how much of it to cover.
    const cover = min(1, scan.add(corner));
    const add = vec3(0.0012, 0.0022, 0.0026).add(reflect).add(vec3(hot.mul(1.6))).add(vec3(flash));
    const litA = cover.mul(float(1).sub(hot)).add(hot.mul(0.85)).add(flash.mul(0.9));
    return vec4(mix(darkGlass, add, inside), mix(float(1), min(1, litA), inside));
  })();
  mat.transparent = true;
  mat.blending = THREE.NoBlending;  // write exactly this colour and alpha: the hole is real
  mat.toneMapped = false;
  return { material: mat, beam, flash };
}
