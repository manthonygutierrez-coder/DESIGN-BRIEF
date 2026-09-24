// rig.js — where you are in the room, and how you get between places.
//
//   wide ──sit──▶ seated ──zoom──▶ in (at the glass: the game takes the window)
//     ▲             │  ▲                       │
//     └────stand────┘  └─────────unzoom────────┘
//
// wide:   standing back, the room framed, the view drifting with the pointer.
// seated: in the chair; drag to turn your head all the way round.
// in:     face to the glass, the screen filling the view — main.js hands over
//         to the game here, and back from it.
import * as THREE from "./vendor/three/three.webgpu.min.js";
import { CAMERA } from "./layout.js";
import { fitDistance } from "./fit.js";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Less motion asked for: the camera still travels (it says where you went),
// but quickly, and the view does not drift with the pointer.
const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const quick = (s) => (reduced ? Math.min(s, 0.35) : s);
const easeIn = (t) => t * t * t;
const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);

export class Rig {
  // glass: the CRT's glass mesh (its world transform is the zoom target).
  constructor(camera, glass, { onPhase } = {}) {
    this.camera = camera;
    this.glass = glass;
    this.onPhase = onPhase || (() => {});
    this.phase = "wide";
    this.transition = null;
    this.parallax = new THREE.Vector2(); this.parallaxTo = new THREE.Vector2();
    this.look = new THREE.Vector2(); this.lookTo = new THREE.Vector2();
    this.yaw = 0; this.pitch = 0; this.yawTo = 0; this.pitchTo = 0;
    this.put("wide");
  }

  get busy() { return this.transition !== null; }

  // The pose for a phase: { pos, quat, fov }.
  pose(phase) {
    if (phase === "wide") {
      const w = CAMERA.wide, pos = v3(w.pos);
      return { pos, quat: this.lookFrom(pos, v3(w.look)), fov: w.fov };
    }
    if (phase === "seated") {
      return { pos: v3(CAMERA.seat.pos), quat: this.seatQuat(), fov: CAMERA.seat.fov };
    }
    // in: square to the glass, near enough that the screen covers the view.
    const g = this.glass, fov = CAMERA.zoom.fov;
    g.updateWorldMatrix(true, false);
    const centre = new THREE.Vector3().setFromMatrixPosition(g.matrixWorld);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(g.matrixWorld);
    const { width, height } = g.geometry.parameters;
    const d = fitDistance(width, height, fov, this.camera.aspect, "cover") * 0.985;
    const pos = centre.clone().addScaledVector(normal, d);
    return { pos, quat: this.lookFrom(pos, centre), fov };
  }

  // Jump straight to a phase, no travel (booting, or coming back from the game).
  put(phase) {
    if (phase === "seated") this.aimAtScreen();
    const p = this.pose(phase);
    this.camera.position.copy(p.pos);
    this.camera.quaternion.copy(p.quat);
    this.camera.fov = p.fov;
    this.camera.near = CAMERA.near; this.camera.far = CAMERA.far;
    this.camera.updateProjectionMatrix();
    this.transition = null;
    this.setPhase(phase);
  }

  sit() { if (this.phase === "wide" && !this.busy) { this.aimAtScreen(); this.go("seated", quick(CAMERA.durations.sit)); } }
  stand() { if (this.phase === "seated" && !this.busy) this.go("wide", quick(CAMERA.durations.stand)); }
  zoom(onDone) {
    if (this.phase !== "seated" || this.busy) return false;
    this.go("in", quick(CAMERA.durations.zoom), onDone, easeIn);
    return true;
  }
  unzoom(onDone) { if (this.phase === "in") { this.aimAtScreen(); this.go("seated", quick(CAMERA.durations.unzoom), onDone); } }

  pointer(x, y) {
    if (reduced) return;
    if (this.phase === "wide") this.parallaxTo.set(x * CAMERA.wide.parallax.x, y * CAMERA.wide.parallax.y);
    else if (this.phase === "seated") this.lookTo.set(-x * CAMERA.seat.lookParallax.x, y * CAMERA.seat.lookParallax.y);
  }
  drag(dx, dy) {
    if (this.phase !== "seated") return;
    const s = CAMERA.seat;
    this.yawTo -= dx * s.dragSpeed;
    this.pitchTo = THREE.MathUtils.clamp(this.pitchTo - dy * s.dragSpeed, s.pitchMin, s.pitchMax);
  }

  update(dt) {
    const cam = this.camera, tr = this.transition;
    if (tr) {
      tr.t = Math.min(1, tr.t + dt / tr.duration);
      const e = tr.ease(tr.t);
      const to = tr.phase === "seated" ? this.pose("seated") : tr.to;   // the seat's aim can move while you travel to it
      cam.position.lerpVectors(tr.from.pos, to.pos, e);
      cam.quaternion.slerpQuaternions(tr.from.quat, to.quat, e);
      cam.fov = tr.from.fov + (to.fov - tr.from.fov) * e;
      cam.updateProjectionMatrix();
      if (tr.t >= 1) { this.transition = null; this.setPhase(tr.phase); if (tr.onDone) tr.onDone(); }
      return;
    }
    if (this.phase === "wide") {
      const w = CAMERA.wide;
      this.parallax.lerp(this.parallaxTo, w.parallax.lerp);
      cam.position.set(w.pos.x + this.parallax.x, w.pos.y + this.parallax.y, w.pos.z);
      cam.lookAt(w.look.x, w.look.y, w.look.z);
    } else if (this.phase === "seated") {
      const k = 1 - Math.exp(-CAMERA.seat.smoothing * dt);
      this.yaw += (this.yawTo - this.yaw) * k;
      this.pitch += (this.pitchTo - this.pitch) * k;
      this.look.lerp(this.lookTo, CAMERA.seat.lookParallax.lerp);
      cam.position.copy(v3(CAMERA.seat.pos));
      cam.quaternion.copy(this.seatQuat());
    }
  }

  // ── internals ──
  aimAtScreen() {
    const seat = v3(CAMERA.seat.pos);
    const centre = new THREE.Vector3().setFromMatrixPosition(this.glass.matrixWorld);
    const dir = centre.sub(seat).normalize();
    this.yaw = this.yawTo = Math.atan2(-dir.x, -dir.z);
    this.pitch = this.pitchTo = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)) - (CAMERA.seat.aimBelow || 0);
    this.look.set(0, 0); this.lookTo.set(0, 0);
  }
  seatQuat() {
    const s = CAMERA.seat;
    const pitch = THREE.MathUtils.clamp(this.pitch + this.look.y, s.pitchMin, s.pitchMax);
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, this.yaw + this.look.x, 0, "YXZ"));
  }
  lookFrom(pos, target) {
    const m = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }
  go(phase, duration, onDone, easing = ease) {
    const cam = this.camera;
    this.transition = {
      phase, duration, onDone, t: 0, ease: easing,
      from: { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov },
      to: this.pose(phase),
    };
    this.setPhase("moving");
  }
  setPhase(p) { if (this.phase !== p) { this.phase = p; this.onPhase(p); } }
}
