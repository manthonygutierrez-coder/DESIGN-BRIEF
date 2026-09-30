"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const X = require("../src/js/suite/frameexport.js");
const D = require("../src/js/suite/doc.js");

const deflate = (d) => zlib.deflateSync(d);
function walker() {
  const doc = D.create({ mode: "pixel", w: 4, h: 4, name: "Hero: run/walk" });
  ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"].forEach((c, i) => {
    if (i) D.addFrame(doc);
    doc.bitmap.fill("");
    doc.bitmap[i] = c;
  });
  D.frameMs(doc, 200);
  D.goFrame(doc, 1); D.frameMs(doc, 100);
  D.addTag(doc, "run", 1, 3, "pingpong");
  return doc;
}
const name = (o) => (o.files.map((f) => f.name));

test("export names: safe to put in a folder, and they say what they are", async () => {
  const doc = walker();
  assert.equal(X.safe("Hero: run/walk"), "Hero run walk");
  assert.equal(X.safe("...."), "sprite");
  assert.equal(X.safe(""), "sprite");
  const sheet = await X.build(doc, { format: "sheet", scale: 4 }, deflate);
  assert.deepEqual(name(sheet), ["Hero run walk sheet@4x.png", "Hero run walk sheet@4x.json"]);
  const one = await X.build(doc, { format: "sheet", scale: 1, atlas: false }, deflate);
  assert.deepEqual(name(one), ["Hero run walk sheet.png"], "no @1x, and no JSON when it is not wanted");
  assert.deepEqual(name(await X.build(doc, { format: "gif", scale: 2, tag: 0 }, deflate)), ["Hero run walk run@2x.gif"]);
  assert.deepEqual(name(await X.build(doc, { format: "apng", scale: 1 }, deflate)), ["Hero run walk animated.png"]);
  assert.deepEqual(name(await X.build(doc, { format: "seq", scale: 3 }, deflate)), ["Hero run walk frames@3x.zip"]);
});

test("export options: anything odd is put right", async () => {
  const doc = walker();
  const o = (await X.build(doc, { format: "flash", scale: 99, pad: -3, loop: 40, bg: "red", pack: "spiral" })).info.options;
  assert.deepEqual([o.format, o.scale, o.pad, o.loop, o.bg, o.pack], ["sheet", 16, 0, 9, "#FFFFFF", "row"]);
});

test("export sheet: the picture is the size of the layout at scale, the JSON says where each frame is", async () => {
  const doc = walker();
  const out = await X.build(doc, { format: "sheet", scale: 3, pack: "square", pad: 1 }, deflate);
  const png = out.files[0].bytes;
  const w = (png[16] << 24 | png[17] << 16 | png[18] << 8 | png[19]) >>> 0, h = (png[20] << 24 | png[21] << 16 | png[22] << 8 | png[23]) >>> 0;
  assert.deepEqual([w, h], [(4 * 2 + 1) * 3, (4 * 2 + 1) * 3], "a two by two block of 4 px frames with a 1 px gap, at 3x");
  const json = JSON.parse(out.files[1].text);
  assert.equal(json.frames.length, 4);
  assert.deepEqual(json.frames[3].frame, { x: 15, y: 15, w: 12, h: 12 });
  assert.equal(json.frames[1].duration, 100);
  assert.equal(json.meta.image, "Hero run walk sheet@3x.png");
  assert.deepEqual(json.tags, [{ name: "run", from: 1, to: 3, direction: "pingpong" }]);
  assert.equal(out.info.frames, 4);
});

test("export a tag: only its frames, and its tag renumbered from the first", async () => {
  const doc = walker();
  const out = await X.build(doc, { format: "sheet", scale: 1, tag: 0 }, deflate);
  const json = JSON.parse(out.files[1].text);
  assert.equal(json.frames.length, 3);
  assert.deepEqual(json.frames.map((f) => f.duration), [100, doc.frames[2].ms, doc.frames[3].ms]);
  assert.deepEqual(json.tags, [{ name: "run", from: 0, to: 2, direction: "pingpong" }]);
  assert.equal(out.files[0].name, "Hero run walk run sheet.png");
});

test("export gif and apng: the whole animation, at scale, with each frame's own length", async () => {
  const doc = walker();
  const gif = (await X.build(doc, { format: "gif", scale: 5 }, deflate)).files[0].bytes;
  assert.equal(String.fromCharCode(...gif.subarray(0, 6)), "GIF89a");
  assert.deepEqual([gif[6] | gif[7] << 8, gif[8] | gif[9] << 8], [20, 20]);
  const ap = (await X.build(doc, { format: "apng", scale: 2, loop: 3 }, deflate)).files[0].bytes;
  const at = Buffer.from(ap).indexOf("acTL");
  assert.ok(at > 0);
  assert.equal(ap[at + 7], 4, "four frames");
  assert.equal(ap[at + 11], 3, "playing three times");
});

test("export sequence: a numbered png a frame, and a JSON, in one zip", async () => {
  const doc = walker();
  const zip = (await X.build(doc, { format: "seq", scale: 1 }, deflate)).files[0].bytes;
  const text = Buffer.from(zip).toString("latin1");
  for (const n of ["01", "02", "03", "04"]) assert.ok(text.includes("Hero run walk " + n + ".png"), n);
  assert.ok(text.includes("Hero run walk frames.json"));
  assert.equal((text.match(/PK\x03\x04/g) || []).length, 5, "four frames and the JSON");
  assert.equal(text.includes("PK\x05\x06"), true);
});

test("export a still sprite: one frame is a sheet of one, or a gif that does not move", async () => {
  const doc = D.create({ mode: "pixel", w: 3, h: 3, name: "Dot" });
  doc.bitmap[4] = "#123456";
  const s = await X.build(doc, { format: "sheet", scale: 2 }, deflate);
  assert.equal(s.info.frames, 1);
  assert.deepEqual(JSON.parse(s.files[1].text).tags, []);
  const g = await X.build(doc, { format: "gif", scale: 1 }, deflate);
  assert.equal(g.info.frames, 1);
});

test("export without a deflate: the stored kind still reads", async () => {
  const doc = walker();
  const out = await X.build(doc, { format: "sheet", scale: 2 });
  const png = out.files[0].bytes, i = Buffer.from(png).indexOf("IDAT");
  const len = (png[i - 4] << 24 | png[i - 3] << 16 | png[i - 2] << 8 | png[i - 1]) >>> 0;
  assert.equal(zlib.inflateSync(Buffer.from(png.subarray(i + 4, i + 4 + len))).length > 0, true);
});
