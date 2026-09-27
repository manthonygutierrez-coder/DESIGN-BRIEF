"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = path.join(__dirname, "..", "src", "styles");
const desktop = fs.readFileSync(path.join(styles, "desktop.css"), "utf8");
const dark = fs.readFileSync(path.join(styles, "dark.css"), "utf8");
const vars = (css, selector) => {
  const at = css.indexOf(selector + "{");
  assert.ok(at >= 0, selector + " is in the sheet");
  const body = css.slice(at + selector.length + 1, css.indexOf("}", at));
  return Object.fromEntries([...body.matchAll(/(--w-[a-z0-9]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim().toUpperCase()]));
};

test("scheme: every window colour has a dark one", () => {
  const light = vars(desktop, ".side--screen"), night = vars(dark, ".side--screen.theme-dark");
  assert.ok(Object.keys(light).length >= 10, "the light scheme is where it was");
  assert.deepEqual(Object.keys(night).sort(), Object.keys(light).sort());
  for (const k of Object.keys(light)) assert.notEqual(night[k], light[k], k + " changes in the dark");
});

test("scheme: a web page in the browser keeps the light colours", () => {
  const light = vars(desktop, ".side--screen"), page = vars(dark, ".theme-dark .ie__view");
  assert.deepEqual(page, light);
});

test("scheme: the dark sheet is loaded after the others, so it wins ties", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "index.html"), "utf8");
  const sheets = [...html.matchAll(/href="styles\/([a-z]+)\.css"/g)].map((m) => m[1]);
  assert.equal(sheets[sheets.length - 1], "dark");
  assert.ok(html.indexOf("js/scheme.js") > html.indexOf("js/icons.js"), "the switch draws its icon from icons.js");
});
