// post.js — how the room is finished: a dark ink line round every silhouette
// (from depth and normals, one room pixel wide), bloom for the things that
// glow, a warm grade, a filmic curve and a vignette.
//
// It keeps the scene's alpha. The CRT's glass writes almost none, and the
// canvas is composited premultiplied over the page, so the game shows through
// the glass while the room's glow and the vignette still fall across it.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import {
  pass, mrt, output, transformedNormalView, positionView, cameraViewMatrix,
  screenUV, screenSize, vec2, vec3, vec4, Fn, mix, smoothstep, abs, max, float,
} from "./vendor/three/three.tsl.min.js";
import { bloom } from "./vendor/three/addons/BloomNode.js";

const INK = vec3(0.025, 0.022, 0.03);

const aces = (x) => {
  const a = x.mul(x.mul(2.51).add(0.03));
  const b = x.mul(x.mul(2.43).add(0.59)).add(0.14);
  return a.div(b).clamp(0.0, 1.0);
};
const grade = (c) => mix(c, c.mul(vec3(1.05, 0.98, 0.9)), float(0.55));
const vignette = () => smoothstep(0.95, 0.3, screenUV.sub(0.5).length().mul(1.15)).mul(0.4).add(0.6);

const depth01 = () => positionView.z.negate().mul(0.12).clamp(0.0, 1.0);

// For things too small and many to ink one by one (the keys): they report one
// flat, upward surface to the outline pass, so the board keeps its silhouette
// without a line round every key.
export function inkAsOne(material) {
  material.mrtNode = mrt({ nd: vec4(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz, depth01()) });
  return material;
}

export function buildPost(renderer, scene, camera) {
  const scenePass = pass(scene, camera);
  scenePass.setMRT(mrt({ output, nd: vec4(transformedNormalView, depth01()) }));
  const color = scenePass.getTextureNode("output");
  const nd = scenePass.getTextureNode("nd");
  const glow = bloom(color, 0.2, 0.12, 0.95);

  const finish = Fn(() => {
    const texel = vec2(1.0).div(screenSize);
    const c = nd.uv(screenUV);
    let nEdge = float(0), dEdge = float(0);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const s = nd.uv(screenUV.add(vec2(ox, oy).mul(texel)));
      nEdge = max(nEdge, abs(c.xyz.sub(s.xyz)).length());
      dEdge = max(dEdge, abs(c.w.sub(s.w)));
    }
    const ink = smoothstep(0.45, 0.8, nEdge.mul(0.8).add(dEdge.mul(10.0)));
    let col = color.rgb.add(glow.rgb.mul(mix(float(0.25), float(1), color.a)));   // only a little of the room's glow falls across the open glass
    col = grade(col);
    col = mix(col, INK, ink.mul(color.a));             // no ink laid across the open glass
    col = aces(col);
    const v = vignette();
    // Premultiplied out: the room darkened by the vignette, and where the
    // glass is open the page underneath is darkened by the same amount.
    return vec4(col.mul(v), float(1).sub(v.mul(float(1).sub(color.a))));
  });

  const post = new THREE.PostProcessing(renderer);
  post.outputNode = finish();
  return { render: () => post.renderAsync() };
}
