// Copies the parts of three.js the room uses into src/room/vendor/three and
// points their imports at each other. The game's CSP allows scripts from its
// own folder only, so there is no import map (an inline script) and no CDN:
// the bare "three" specifiers the addons use are rewritten to relative paths.
//
//   node tools/room/vendor-three.mjs <path to a three package, e.g. node_modules/three>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const src = path.resolve(process.argv[2] || "node_modules/three");
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/room/vendor/three");
const version = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8")).version;

// file in the package → file in the vendor folder, with its imports remapped.
const FILES = [
  ["build/three.core.min.js", "three.core.min.js"],
  ["build/three.webgpu.min.js", "three.webgpu.min.js"],
  ["build/three.tsl.min.js", "three.tsl.min.js"],
  ["examples/jsm/renderers/CSS3DRenderer.js", "addons/CSS3DRenderer.js"],
  ["examples/jsm/tsl/display/BloomNode.js", "addons/BloomNode.js"],
];

fs.rmSync(out, { recursive: true, force: true });
for (const [from, to] of FILES) {
  const dest = path.join(out, to);
  const up = path.relative(path.dirname(dest), out) || ".";
  const rel = (f) => (up === "." ? "./" : up + "/") + f;
  let code = fs.readFileSync(path.join(src, from), "utf8");
  code = code
    .replace(/(from\s*["'])three\/webgpu(["'])/g, "$1" + rel("three.webgpu.min.js") + "$2")
    .replace(/(from\s*["'])three\/tsl(["'])/g, "$1" + rel("three.tsl.min.js") + "$2")
    .replace(/(from\s*["'])three(["'])/g, "$1" + rel("three.webgpu.min.js") + "$2");
  const left = code.match(/from\s*["'](three[^"']*)["']/);
  if (left) throw new Error(to + " still imports " + left[1]);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, code);
}
fs.copyFileSync(path.join(src, "LICENSE"), path.join(out, "LICENSE"));
fs.writeFileSync(path.join(out, "VERSION"), version + "\n");
console.log("three " + version + " → " + out);
