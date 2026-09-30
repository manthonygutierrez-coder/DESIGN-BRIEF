"use strict";
/* ── file encoders ────────────────────────────────────────
 * What the suite writes when a sprite leaves the app: an animated GIF, a PNG or
 * an animated PNG, and a ZIP to carry a run of frames. The app has no runtime
 * dependencies, so these are written out here, byte for byte, and tested by
 * reading their output back.
 *
 *   gif({ w, h, frames: [{ rgba, ms }], loop, transparent, bg })   Uint8Array
 *   png({ w, h, rgba, deflate })                                     Promise<Uint8Array>
 *   apng({ w, h, frames: [{ rgba, ms }], loop, deflate })            Promise<Uint8Array>
 *   zip([{ name, data }])                                            Uint8Array
 *   scale(rgba, w, h, k)                                             { rgba, w, h }: whole-number, hard-edged
 *   toBase64(bytes)                                                  string
 *
 * `rgba` is w * h * 4 bytes. `deflate` (bytes -> zlib bytes, sync or async) is
 * how PNG data is compressed: the app hands in the browser's own; without one
 * the data is stored, which every reader accepts and which is larger.
 *
 * Pure: no DOM.
 */

const SuiteEncode = (() => {
  const enc = new TextEncoder();
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const u32le = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  const u16le = (n) => [n & 255, (n >>> 8) & 255];
  const cat = (parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  /* ── checksums ─────────────────────────────────────────── */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes, crc = 0) {
    let c = ~crc >>> 0;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return ~c >>> 0;
  }
  function adler32(bytes) {
    let a = 1, b = 0;
    for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }

  /* ── pixels ────────────────────────────────────────────── */
  // A picture at a whole-number scale: every pixel a k by k block, edges hard.
  function scale(rgba, w, h, k) {
    k = Math.max(1, Math.round(k) || 1);
    if (k === 1) return { rgba, w, h };
    const out = new Uint8Array(w * k * h * k * 4), W = w * k;
    for (let y = 0; y < h * k; y++) {
      const sy = (y / k) | 0;
      for (let x = 0; x < W; x++) {
        const s = (sy * w + ((x / k) | 0)) * 4, d = (y * W + x) * 4;
        out[d] = rgba[s]; out[d + 1] = rgba[s + 1]; out[d + 2] = rgba[s + 2]; out[d + 3] = rgba[s + 3];
      }
    }
    return { rgba: out, w: w * k, h: h * k };
  }

  /* ── GIF ───────────────────────────────────────────────── */
  // The colours a set of frames uses, as up to `max` palette entries: the most
  // used keep their own colour and the rest take the nearest of those.
  function palette(frames, max) {
    const count = new Map();
    for (const f of frames) for (let i = 0; i < f.rgba.length; i += 4) {
      if (f.rgba[i + 3] < 128) continue;
      const k = (f.rgba[i] << 16) | (f.rgba[i + 1] << 8) | f.rgba[i + 2];
      count.set(k, (count.get(k) || 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k);
  }
  function lzw(indices, minBits) {
    const clear = 1 << minBits, eoi = clear + 1, out = [];
    let cur = 0, have = 0;
    const put = (code, bits) => {
      cur |= code << have; have += bits;
      while (have >= 8) { out.push(cur & 255); cur >>>= 8; have -= 8; }
    };
    let dict = new Map(), next = eoi + 1, bits = minBits + 1;
    put(clear, bits);
    let prefix = -1;
    for (let i = 0; i < indices.length; i++) {
      const c = indices[i];
      if (prefix < 0) { prefix = c; continue; }
      const key = prefix * 4096 + c, hit = dict.get(key);
      if (hit !== undefined) { prefix = hit; continue; }
      put(prefix, bits);
      if (next < 4096) {
        dict.set(key, next++);
        if (next > (1 << bits) && bits < 12) bits++;
      } else {
        put(clear, bits);
        dict = new Map(); next = eoi + 1; bits = minBits + 1;
      }
      prefix = c;
    }
    if (prefix >= 0) put(prefix, bits);
    put(eoi, bits);
    if (have > 0) out.push(cur & 255);
    return out;
  }
  function gif(o) {
    const { w, h, frames } = o, loop = o.loop == null ? 0 : o.loop | 0;
    const transparent = o.transparent !== false;
    const bg = o.bg == null ? 0xFFFFFF : o.bg;
    // Index 0 is left for "nothing" when the picture has holes; otherwise colours start there.
    const cols = palette(frames, transparent ? 255 : 256);
    if (!cols.length) cols.push(0);
    const off = transparent ? 1 : 0, size = cols.length + off;
    let bitsN = 1; while ((1 << bitsN) < size) bitsN++;
    bitsN = Math.max(2, bitsN);
    const table = [];
    if (transparent) table.push(0, 0, 0);
    for (const c of cols) table.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
    while (table.length < (3 << bitsN)) table.push(0);
    const lookup = new Map(cols.map((c, i) => [c, i + off]));
    const nearest = (r, g, b) => {
      let best = off, bd = Infinity;
      for (let i = 0; i < cols.length; i++) { const c = cols[i], d = ((c >> 16) - r) ** 2 + (((c >> 8) & 255) - g) ** 2 + ((c & 255) - b) ** 2; if (d < bd) { bd = d; best = i + off; } }
      return best;
    };
    const out = [...enc.encode("GIF89a"), ...u16le(w), ...u16le(h), 0x80 | 0x70 | (bitsN - 1), 0, 0, ...table];
    if (loop !== 1) out.push(0x21, 0xFF, 11, ...enc.encode("NETSCAPE2.0"), 3, 1, ...u16le(loop === 0 ? 0 : Math.max(1, loop - 1)), 0);
    for (const f of frames) {
      const idx = new Uint8Array(w * h), cache = new Map();
      for (let i = 0; i < w * h; i++) {
        const a = f.rgba[i * 4 + 3];
        if (a < 128) { idx[i] = transparent ? 0 : (lookup.get(bg) !== undefined ? lookup.get(bg) : nearest(bg >> 16, (bg >> 8) & 255, bg & 255)); continue; }
        const k = (f.rgba[i * 4] << 16) | (f.rgba[i * 4 + 1] << 8) | f.rgba[i * 4 + 2];
        let v = lookup.get(k);
        if (v === undefined) { v = cache.get(k); if (v === undefined) { v = nearest(k >> 16, (k >> 8) & 255, k & 255); cache.set(k, v); } }
        idx[i] = v;
      }
      const delay = Math.max(2, Math.round((f.ms || 100) / 10));
      out.push(0x21, 0xF9, 4, (transparent ? 0x09 : 0x04), ...u16le(delay), 0, 0);   // dispose to background; transparent index 0
      out.push(0x2C, 0, 0, 0, 0, ...u16le(w), ...u16le(h), 0);
      const min = bitsN;
      out.push(min);
      const data = lzw(idx, min);
      for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(data[i + j]); }
      out.push(0);
    }
    out.push(0x3B);
    return Uint8Array.from(out);
  }

  /* ── PNG and animated PNG ──────────────────────────────── */
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  function chunk(type, data) {
    const t = enc.encode(type), body = cat([t, data]);
    return cat([Uint8Array.from(u32(data.length)), body, Uint8Array.from(u32(crc32(body)))]);
  }
  // zlib with no compression: valid everywhere, and what is used when no deflate is given.
  function zlibStored(data) {
    const parts = [Uint8Array.from([0x78, 0x01])];
    for (let i = 0; i < data.length || i === 0; i += 65535) {
      const n = Math.min(65535, data.length - i), last = i + n >= data.length ? 1 : 0;
      parts.push(Uint8Array.from([last, n & 255, n >>> 8, ~n & 255, (~n >>> 8) & 255]), data.subarray(i, i + n));
      if (last) break;
    }
    parts.push(Uint8Array.from(u32(adler32(data))));
    return cat(parts);
  }
  const scanlines = (rgba, w, h) => {
    const out = new Uint8Array((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) out.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
    return out;
  };
  const ihdr = (w, h) => chunk("IHDR", Uint8Array.from([...u32(w), ...u32(h), 8, 6, 0, 0, 0]));
  async function png(o) {
    const z = await (o.deflate || zlibStored)(scanlines(o.rgba, o.w, o.h));
    return cat([Uint8Array.from(SIG), ihdr(o.w, o.h), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))]);
  }
  async function apng(o) {
    const { w, h, frames } = o, deflate = o.deflate || zlibStored;
    const parts = [Uint8Array.from(SIG), ihdr(w, h), chunk("acTL", Uint8Array.from([...u32(frames.length), ...u32(o.loop == null ? 0 : o.loop | 0)]))];
    let seq = 0;
    for (let i = 0; i < frames.length; i++) {
      const z = await deflate(scanlines(frames[i].rgba, w, h)), ms = Math.max(10, Math.round(frames[i].ms || 100));
      parts.push(chunk("fcTL", Uint8Array.from([...u32(seq++), ...u32(w), ...u32(h), ...u32(0), ...u32(0), ...[ms >> 8, ms & 255], ...[1000 >> 8, 1000 & 255], 1, 0])));
      if (i === 0) parts.push(chunk("IDAT", z));
      else parts.push(chunk("fdAT", cat([Uint8Array.from(u32(seq++)), z])));
    }
    parts.push(chunk("IEND", new Uint8Array(0)));
    return cat(parts);
  }

  /* ── ZIP ───────────────────────────────────────────────── */
  // Files stored as they are, one after another, with the directory at the end.
  function zip(files) {
    const local = [], central = [];
    let at = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = f.data instanceof Uint8Array ? f.data : enc.encode(String(f.data)), crc = crc32(data);
      const head = Uint8Array.from([0x50, 0x4B, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32le(crc), ...u32le(data.length), ...u32le(data.length), ...u16le(name.length), 0, 0]);
      local.push(head, name, data);
      central.push(Uint8Array.from([0x50, 0x4B, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32le(crc), ...u32le(data.length), ...u32le(data.length),
        ...u16le(name.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32le(at)]), name);
      at += head.length + name.length + data.length;
    }
    const dir = cat(central);
    return cat([...local, dir, Uint8Array.from([0x50, 0x4B, 5, 6, 0, 0, 0, 0, ...u16le(files.length), ...u16le(files.length), ...u32le(dir.length), ...u32le(at), 0, 0])]);
  }

  // Bytes as base64, in pieces, so a big file does not overflow the call stack.
  function toBase64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64");
  }

  return { crc32, adler32, scale, palette, gif, png, apng, zip, zlibStored, toBase64 };
})();

if (typeof module !== "undefined") module.exports = SuiteEncode;
