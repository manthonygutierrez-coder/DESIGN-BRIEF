"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const zlib = require("node:zlib");
const E = require("../src/js/suite/encode.js");

/* ── readers, to check what the encoders wrote ─────────────── */
function readGif(b) {
  const s = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  assert.equal(s(0, 6), "GIF89a");
  const w = b[6] | (b[7] << 8), h = b[8] | (b[9] << 8), packed = b[10];
  let i = 13;
  const gct = [];
  if (packed & 0x80) { const n = 3 << ((packed & 7) + 1); for (let k = 0; k < n; k += 3) gct.push([b[i + k], b[i + k + 1], b[i + k + 2]]); i += n; }
  const frames = []; let loop = null, gce = null;
  while (b[i] !== 0x3B) {
    if (b[i] === 0x21) {
      const label = b[i + 1]; i += 2;
      if (label === 0xF9) gce = { delay: b[i + 2] | (b[i + 3] << 8), transparent: (b[i + 1] & 1) ? b[i + 4] : null, dispose: (b[i + 1] >> 2) & 7 };
      if (label === 0xFF && s(i + 1, 11) === "NETSCAPE2.0") loop = b[i + 14] | (b[i + 15] << 8);
      while (b[i] !== 0) i += b[i] + 1;
      i++;
    } else if (b[i] === 0x2C) {
      const fw = b[i + 5] | (b[i + 6] << 8), fh = b[i + 7] | (b[i + 8] << 8);
      i += 10;
      const min = b[i++], data = [];
      while (b[i] !== 0) { for (let k = 1; k <= b[i]; k++) data.push(b[i + k]); i += b[i] + 1; }
      i++;
      frames.push({ w: fw, h: fh, gce, idx: unlzw(data, min, fw * fh) });
    } else throw new Error("unknown block " + b[i] + " at " + i);
  }
  return { w, h, gct, frames, loop };
}
function unlzw(data, min, count) {
  const clear = 1 << min, eoi = clear + 1, out = [];
  let dict = [], bits = min + 1, cur = 0, have = 0, pos = 0, prev = null;
  const reset = () => { dict = []; for (let i = 0; i < clear; i++) dict.push([i]); dict.push(null, null); bits = min + 1; prev = null; };
  reset();
  for (;;) {
    while (have < bits && pos < data.length) { cur |= data[pos++] << have; have += 8; }
    if (have < bits) break;
    const code = cur & ((1 << bits) - 1); cur >>>= bits; have -= bits;
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) entry = prev.concat(prev[0]);
    else throw new Error("bad code " + code);
    out.push(...entry);
    if (prev && dict.length < 4096) dict.push(prev.concat(entry[0]));
    if (dict.length === (1 << bits) && bits < 12) bits++;
    prev = entry;
    if (out.length >= count) break;
  }
  return out.slice(0, count);
}
function chunks(b) {
  const out = []; let i = 8;
  while (i < b.length) {
    const n = (b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]) >>> 0, type = String.fromCharCode(...b.subarray(i + 4, i + 8));
    const data = b.subarray(i + 8, i + 8 + n), crc = (b[i + 8 + n] << 24 | b[i + 9 + n] << 16 | b[i + 10 + n] << 8 | b[i + 11 + n]) >>> 0;
    assert.equal(E.crc32(b.subarray(i + 4, i + 8 + n)), crc, type + " has the right checksum");
    out.push({ type, data }); i += 12 + n;
  }
  return out;
}
const solid = (w, h, r, g, b, a = 255) => { const o = new Uint8Array(w * h * 4); for (let i = 0; i < w * h; i++) o.set([r, g, b, a], i * 4); return o; };

/* ── tests ─────────────────────────────────────────────── */
test("checksums: the standard answers", () => {
  assert.equal(E.crc32(new TextEncoder().encode("123456789")), 0xCBF43926);
  assert.equal(E.adler32(new TextEncoder().encode("Wikipedia")), 0x11E60398);
});

test("scale: every pixel becomes a hard k by k block", () => {
  const rgba = Uint8Array.from([1, 2, 3, 255, 9, 8, 7, 255]);                  // two pixels side by side
  const r = E.scale(rgba, 2, 1, 3);
  assert.deepEqual([r.w, r.h], [6, 3]);
  assert.deepEqual([...r.rgba.subarray(0, 4)], [1, 2, 3, 255]);
  assert.deepEqual([...r.rgba.subarray(8, 12)], [1, 2, 3, 255], "the third column is still the first pixel");
  assert.deepEqual([...r.rgba.subarray(12, 16)], [9, 8, 7, 255], "the fourth is the second");
  assert.deepEqual([...r.rgba.subarray(6 * 4 * 2, 6 * 4 * 2 + 4)], [1, 2, 3, 255], "and so is the third row");
  assert.equal(E.scale(rgba, 2, 1, 1).rgba, rgba, "at 1x nothing is copied");
});

test("gif: what goes in comes back out, frame by frame, with its timing and its holes", () => {
  const w = 5, h = 4, a = solid(w, h, 255, 0, 0), b = solid(w, h, 0, 0, 255);
  b.set([0, 0, 0, 0], 0);                                                        // a hole in the corner of the second frame
  const bytes = E.gif({ w, h, frames: [{ rgba: a, ms: 100 }, { rgba: b, ms: 250 }], loop: 0 });
  const g = readGif(bytes);
  assert.deepEqual([g.w, g.h, g.frames.length], [w, h, 2]);
  assert.equal(g.loop, 0, "loops for ever");
  assert.equal(g.frames[0].gce.delay, 10);
  assert.equal(g.frames[1].gce.delay, 25);
  assert.equal(g.frames[0].gce.transparent, 0);
  const at = (f, i) => g.gct[g.frames[f].idx[i]];
  assert.deepEqual(at(0, 7), [255, 0, 0]);
  assert.deepEqual(at(1, 7), [0, 0, 255]);
  assert.equal(g.frames[1].idx[0], 0, "index 0 is the hole");
  assert.equal(g.frames[0].idx[0] !== 0, true, "and the first frame has none");
});

test("gif: a busy picture survives the compressor, including when its table fills and starts again", () => {
  const w = 64, h = 64, rgba = new Uint8Array(w * h * 4);
  let seed = 7;
  for (let i = 0; i < w * h; i++) { seed = (seed * 1103515245 + 12345) >>> 0; const c = (seed >>> 16) % 200; rgba.set([c, (c * 7) & 255, (c * 13) & 255, 255], i * 4); }
  const g = readGif(E.gif({ w, h, frames: [{ rgba, ms: 100 }] }));
  for (let i = 0; i < w * h; i++) assert.deepEqual(g.gct[g.frames[0].idx[i]], [...rgba.subarray(i * 4, i * 4 + 3)], "pixel " + i);
});

test("gif: opaque, a single play, and more colours than a gif holds", () => {
  const w = 20, h = 20, rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([i % 256, (i * 3) % 256, (i * 5) % 256, 255], i * 4);   // 400 pixels, about 400 colours
  const g = readGif(E.gif({ w, h, frames: [{ rgba, ms: 40 }], loop: 1, transparent: false }));
  assert.equal(g.loop, null, "no loop block: it plays once");
  assert.equal(g.frames[0].gce.transparent, null);
  assert.ok(g.gct.length <= 256);
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const worst = Math.max(...Array.from({ length: w * h }, (_, i) => near(g.gct[g.frames[0].idx[i]], [...rgba.subarray(i * 4, i * 4 + 3)])));
  assert.ok(Number.isFinite(worst));
  assert.equal(E.gif({ w: 1, h: 1, frames: [{ rgba: solid(1, 1, 5, 5, 5, 0), ms: 10 }] }).at(-1), 0x3B, "an empty picture is still a gif");
});

test("png: a real png, read back byte for byte", async () => {
  const w = 3, h = 2, rgba = Uint8Array.from({ length: w * h * 4 }, (_, i) => (i * 37) & 255);
  for (const deflate of [undefined, (d) => zlib.deflateSync(d)]) {
    const bytes = await E.png({ w, h, rgba, deflate });
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const cs = chunks(bytes);
    assert.deepEqual(cs.map((c) => c.type), ["IHDR", "IDAT", "IEND"]);
    assert.equal(cs[0].data[8], 8); assert.equal(cs[0].data[9], 6);
    const raw = zlib.inflateSync(Buffer.from(cs[1].data));
    for (let y = 0; y < h; y++) {
      assert.equal(raw[y * (w * 4 + 1)], 0, "filter none");
      assert.deepEqual([...raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1))], [...rgba.subarray(y * w * 4, (y + 1) * w * 4)]);
    }
  }
});

test("png: a stored png bigger than one block still reads", async () => {
  const w = 200, h = 200, rgba = solid(w, h, 10, 20, 30);                       // 160,000 bytes: three stored blocks
  const cs = chunks(await E.png({ w, h, rgba }));
  const raw = zlib.inflateSync(Buffer.from(cs[1].data));
  assert.equal(raw.length, (w * 4 + 1) * h);
  assert.equal(raw[1], 10);
});

test("apng: frames in order, with their timing, in the chunks a viewer looks for", async () => {
  const w = 2, h = 2, f = [solid(w, h, 255, 0, 0), solid(w, h, 0, 255, 0), solid(w, h, 0, 0, 255)];
  const cs = chunks(await E.apng({ w, h, frames: f.map((rgba, i) => ({ rgba, ms: 100 * (i + 1) })), loop: 0, deflate: (d) => zlib.deflateSync(d) }));
  assert.deepEqual(cs.map((c) => c.type), ["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "fcTL", "fdAT", "IEND"]);
  const ac = cs[1].data;
  assert.equal(ac[3], 3, "three frames"); assert.equal(ac[7], 0, "for ever");
  const fc = cs.filter((c) => c.type === "fcTL").map((c) => c.data);
  assert.deepEqual(fc.map((d) => d[3]), [0, 1, 3], "sequence numbers count up through fcTL and fdAT");
  assert.deepEqual(fc.map((d) => (d[20] << 8) | d[21]), [100, 200, 300], "delay numerators, over 1000");
  assert.equal(((fc[0][22] << 8) | fc[0][23]), 1000);
  const fd = cs.filter((c) => c.type === "fdAT").map((c) => c.data);
  assert.deepEqual(fd.map((d) => d[3]), [2, 4], "an fdAT carries its own sequence number in front");
  const green = zlib.inflateSync(Buffer.from(fd[0].subarray(4)));
  assert.deepEqual([...green.subarray(1, 5)], [0, 255, 0, 255]);
});

test("zip: a directory a reader can walk, and checksums that match", () => {
  const files = [{ name: "a.txt", data: "hello" }, { name: "sheet/b.bin", data: Uint8Array.from([1, 2, 3, 4, 5, 6]) }];
  const z = E.zip(files);
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054B50, "ends with the end record");
  const n = v.getUint16(z.length - 22 + 10, true), dirAt = v.getUint32(z.length - 22 + 16, true);
  assert.equal(n, 2);
  let at = dirAt;
  const seen = [];
  for (let k = 0; k < n; k++) {
    assert.equal(v.getUint32(at, true), 0x02014B50);
    const crc = v.getUint32(at + 16, true), size = v.getUint32(at + 24, true), nl = v.getUint16(at + 28, true), off = v.getUint32(at + 42, true);
    const name = Buffer.from(z.subarray(at + 46, at + 46 + nl)).toString();
    assert.equal(v.getUint32(off, true), 0x04034B50, "the local header is where the directory says");
    const ln = v.getUint16(off + 26, true), le = v.getUint16(off + 28, true);
    const data = z.subarray(off + 30 + ln + le, off + 30 + ln + le + size);
    assert.equal(E.crc32(data), crc, name + " checksum");
    seen.push([name, Buffer.from(data).toString("latin1")]);
    at += 46 + nl;
  }
  assert.deepEqual(seen.map((s) => s[0]), ["a.txt", "sheet/b.bin"]);
  assert.equal(seen[0][1], "hello");
});

test("base64: the same as node's, on a big buffer", () => {
  const big = Uint8Array.from({ length: 100000 }, (_, i) => (i * 31) & 255);
  assert.equal(E.toBase64(big), Buffer.from(big).toString("base64"));
});
