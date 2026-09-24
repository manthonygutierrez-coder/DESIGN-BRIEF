// layout.js — where everything in the room is, in one place. Metres; y up;
// the desk is against the back wall and faces +z, and you sit at +z looking -z.
// Rearrange the room here, not in the builders.
//
// The room is your studio: the desk, the computer the game runs on, and the
// seven disciplines on the walls. Adapted from the desk scene of the Father's
// Day project (the camera rig, the CRT, the lighting and the ink outline),
// rebuilt from code so nothing in it is a photograph or a model file.

// How many CSS pixels one room pixel covers. The room is drawn at this fraction
// of the window and scaled up whole, so it reads as pixels like the rest of
// the game; 1 draws it at full resolution.
export const PIXEL = 2;

export const ROOM = {
  left: -2.6, right: 2.6, back: -1.25, front: 3.75, height: 2.7,
  wall: 0x6f7a78, trim: 0x3a3d42, ceiling: 0x4a4d52, floor: 0x8a6240,
};

export const DESK = {
  x: 0.15, z: -0.8, w: 1.72, d: 0.86, top: 0.74, thick: 0.035,
  wood: 0xc9a674, edge: 0x9a7a4e, leg: 0x2a2c31,
};

// The CRT. Its glass is the game's screen: 4:3, the same shape as the 1024×768
// layout the game gets while it is on the desk (see main.js).
export const MONITOR = {
  x: 0.14, z: -0.7,                 // the glass's centre, over the desk
  glassW: 0.4, glassH: 0.3,
  raise: 0.3,                       // glass centre above the desk top
  depth: 0.42,                      // bezel front to the back of the hood
  plastic: 0xd9d0bc, hood: 0xcac1ad,
};

export const TOWER = { x: -0.47, z: -0.86, ry: 0.22, w: 0.19, h: 0.42, d: 0.44, plastic: 0xd6cdb8 };   // turned a little towards you
export const SPEAKERS = { dx: 0.34, z: -0.74, w: 0.085, h: 0.15, d: 0.1 };
export const KEYBOARD = { x: 0.12, z: -0.47, tilt: 0.07 };
export const MOUSE = { x: 0.6, z: -0.46 };
export const LAMP = { x: 0.84, z: -1.02, color: 0xd9412c };
// The chair sits pushed back and turned while you stand, and rolls in under you when you sit.
export const CHAIR = { away: { x: 0.66, z: 0.62, ry: -0.8 }, seat: { x: 0.14, z: 0.24, ry: 0 }, fabric: 0x3a3e4a, accent: 0xffce6a };

// Things on and around the desk that are only there to be looked at.
export const PROPS = {
  mug: { x: 0.8, z: -0.5 },
  sketchbook: { x: -0.42, z: -0.47, ry: -0.18 },
  swatches: { x: -0.2, z: -0.5, ry: 0.5 },
  floppies: { x: 0.43, z: -1.02 },
  plant: { x: 0.95, z: -0.74 },
  bookshelf: { x: -2.38, z: 0.9 },
  bin: { x: -0.95, z: -0.55 },
  rug: { x: 0.2, z: 0.45, w: 2.2, d: 1.7 },
  floorLamp: { x: 2.25, z: 3.35 },
};

// The window over the desk, and the seven disciplines, one poster each.
export const WINDOW = { x: 1.3, y: 1.62, w: 1.05, h: 1.05 };
export const DOOR = { z: 2.7, w: 0.9, h: 2.05 };
export const CORKBOARD = { x: -0.62, y: 1.58, w: 0.78, h: 0.56 };
export const POSTERS = [
  { id: "graphic", wall: "back", x: -1.62, y: 1.55, w: 0.56, h: 0.78 },
  { id: "type", wall: "left", z: -0.35, y: 1.6, w: 0.56, h: 0.78 },
  { id: "illustrative", wall: "left", z: 2.2, y: 1.55, w: 0.6, h: 0.84 },
  { id: "character", wall: "front", x: -0.9, y: 1.58, w: 0.6, h: 0.84 },
  { id: "asset3d", wall: "front", x: 0.35, y: 1.62, w: 0.56, h: 0.78 },
  { id: "motion", wall: "right", z: 0.2, y: 1.58, w: 0.62, h: 0.86 },
  { id: "webui", wall: "right", z: 1.35, y: 1.62, w: 0.56, h: 0.78 },
];

export const LIGHTS = {
  ambient: { color: 0x4a4e5e, intensity: 1.5 },
  hemi: { sky: 0x6a7896, ground: 0x4a3626, intensity: 1.2 },
  ceiling: { color: 0xffe0b8, intensity: 5, distance: 8, decay: 1.6, pos: { x: 0.2, y: 2.5, z: 1.2 } },
  lamp: { color: 0xffe2b0, intensity: 5, distance: 3.2, angle: 0.95, penumbra: 0.6, decay: 1.6 },
  screen: { color: 0x8fd0ff, intensity: 0.6, distance: 2.4, decay: 2 },
  screenSpot: { color: 0xa6dcff, intensity: 9, distance: 2.8, angle: 0.75, penumbra: 0.9, decay: 1.6 },
  flicker: 0.08,
  floorLamp: { color: 0xffc98a, intensity: 3.2, distance: 5, decay: 1.8 },
  // Daylight through the window at full day (window.js sets its colour by the hour).
  sun: { intensity: 2.2 },
};

// Camera poses. The zoom's end is worked out from the glass (see rig.js).
export const CAMERA = {
  near: 0.03, far: 40,
  wide: { pos: { x: -1.35, y: 1.72, z: 2.5 }, look: { x: 0.18, y: 0.95, z: -0.72 }, fov: 50,
          parallax: { x: 0.12, y: 0.06, lerp: 0.05 } },
  seat: { pos: { x: 0.14, y: 1.19, z: 0.12 }, fov: 52,
          pitchMin: -1.1, pitchMax: 0.8, dragSpeed: 0.0034, smoothing: 9,
          aimBelow: 0.07,                 // look a little under the screen's centre, so the keyboard is in view
          lookParallax: { x: 0.05, y: 0.03, lerp: 0.05 } },
  zoom: { fov: 38 },
  durations: { sit: 2.0, stand: 1.5, zoom: 1.25, unzoom: 1.1 },
};
