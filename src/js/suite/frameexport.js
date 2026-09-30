"use strict";
/* ── frame export ─────────────────────────────────────────
 * An animated sprite leaves the suite as one of four things, chosen in the
 * export box: a sheet (a PNG of every frame, and a JSON that says where each
 * is, how long it shows and what the tags are), an animated GIF, an animated
 * PNG, or a run of numbered PNGs in a ZIP. Any of them for the whole animation
 * or for one tag, at any whole-number scale, so pixels stay hard.
 *
 *   build(doc, opts, deflate)   Promise<{ files, info }>: the files to write
 *   open(ed, H)                 the export box, over the editor
 *
 * build is pure; open is the box.
 */

const SuiteFrameExport = (() => {
  const need = (g, path) => (typeof globalThis[g] !== "undefined" ? globalThis[g] : typeof require === "function" ? require(path) : null);
  const D = typeof SuiteDoc !== "undefined" ? SuiteDoc : need("SuiteDoc", "./doc.js");
  const F = typeof SuiteFrames !== "undefined" ? SuiteFrames : need("SuiteFrames", "./frames.js");
  const E = typeof SuiteEncode !== "undefined" ? SuiteEncode : need("SuiteEncode", "./encode.js");

  const FORMATS = [
    ["sheet", "Sheet", "A PNG of every frame side by side, and a JSON that says where each one is"],
    ["gif", "Animated GIF", "Plays anywhere: 256 colours, one bit of transparency"],
    ["apng", "Animated PNG", "Full colour and soft transparency; browsers play it, some tools do not"],
    ["seq", "PNG sequence", "One numbered PNG a frame, in a ZIP, for a game or an editor to read"],
  ];
  const SCALES = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
  const PACKS = [["row", "One row"], ["column", "One column"], ["square", "A block"]];
  const DEFAULTS = { format: "sheet", scale: 4, tag: null, pack: "row", pad: 0, atlas: true, loop: 0, transparent: true, bg: "#FFFFFF" };

  const clean = (o) => {
    const r = Object.assign({}, DEFAULTS, o);
    r.scale = Math.max(1, Math.min(16, Math.round(r.scale) || 1));
    r.pad = Math.max(0, Math.min(16, Math.round(r.pad) || 0));
    r.loop = Math.max(0, Math.min(9, Math.round(r.loop) || 0));
    if (!FORMATS.some(([id]) => id === r.format)) r.format = "sheet";
    if (!PACKS.some(([id]) => id === r.pack)) r.pack = "row";
    if (!/^#[0-9a-f]{6}$/i.test(r.bg)) r.bg = "#FFFFFF";
    return r;
  };
  // A file name a folder will take: no slashes or dots that mean something.
  const safe = (s) => String(s || "sprite").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").replace(/^\.+/, "").trim().slice(0, 60) || "sprite";

  async function build(doc, options, deflate) {
    const o = clean(options);
    if (D.syncFrame) D.syncFrame(doc);
    const sel = F.selection(doc, o.tag), w = doc.w, h = doc.h, k = o.scale, n = sel.frames.length;
    const base = safe(doc.meta && doc.meta.name) + (sel.tag ? " " + safe(sel.tag.name) : "");
    const suffix = k > 1 ? "@" + k + "x" : "";
    const bytes = sel.frames.map((f) => F.rgba(f.px, w, h));
    const scaled = () => bytes.map((b, i) => Object.assign(E.scale(b, w, h, k), { ms: sel.frames[i].ms }));
    // The tags that fall inside what is leaving, renumbered from its first frame.
    const tags = (doc.tags || []).filter((t) => t.from >= sel.from && t.to <= sel.to).map((t) => ({ name: t.name, from: t.from - sel.from, to: t.to - sel.from, dir: t.dir }));
    const files = [];
    if (o.format === "sheet") {
      const layout = F.sheetLayout(n, w, h, { pack: o.pack, pad: o.pad });
      const sheet = F.sheetRGBA(bytes, layout, w, h), big = E.scale(sheet.rgba, sheet.w, sheet.h, k);
      const image = base + " sheet" + suffix + ".png";
      files.push({ name: image, ext: ".png", bytes: await E.png({ w: big.w, h: big.h, rgba: big.rgba, deflate }) });
      if (o.atlas) files.push({ name: base + " sheet" + suffix + ".json", ext: ".json", text: JSON.stringify(F.atlas({ name: base, image, layout, w, h, k, frames: sel.frames, tags }), null, 2) });
    } else if (o.format === "gif") {
      const fr = scaled();
      files.push({ name: base + suffix + ".gif", ext: ".gif", bytes: E.gif({ w: w * k, h: h * k, frames: fr.map((f) => ({ rgba: f.rgba, ms: f.ms })), loop: o.loop, transparent: o.transparent, bg: parseInt(o.bg.slice(1), 16) }) });
    } else if (o.format === "apng") {
      const fr = scaled();
      files.push({ name: base + " animated" + suffix + ".png", ext: ".png", bytes: await E.apng({ w: w * k, h: h * k, frames: fr.map((f) => ({ rgba: f.rgba, ms: f.ms })), loop: o.loop, deflate }) });
    } else {
      const fr = scaled(), pad = String(n).length, entries = [];
      for (let i = 0; i < fr.length; i++) entries.push({ name: base + " " + String(i + 1).padStart(Math.max(2, pad), "0") + suffix + ".png", data: await E.png({ w: fr[i].w, h: fr[i].h, rgba: fr[i].rgba, deflate }) });
      if (o.atlas) entries.push({ name: base + " frames.json", data: JSON.stringify({ frames: entries.map((e, i) => ({ file: e.name, duration: sel.frames[i].ms })), tags, size: { w: w * k, h: h * k } }, null, 2) });
      files.push({ name: base + " frames" + suffix + ".zip", ext: ".zip", bytes: E.zip(entries) });
    }
    const total = files.reduce((t, f) => t + (f.bytes ? f.bytes.length : f.text.length), 0);
    return { files, info: { w: w * k, h: h * k, frames: n, bytes: total, options: o } };
  }

  /* ── the export box ────────────────────────────────────── */
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  // The browser's own deflate, so a PNG is smaller than the stored kind.
  async function deflate(bytes) {
    if (typeof CompressionStream === "undefined") return E.zlibStored(bytes);
    const cs = new CompressionStream("deflate"), w = cs.writable.getWriter();
    w.write(bytes); w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }
  const kb = (n) => (n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1) + " KB" : (n / 1048576).toFixed(2) + " MB");

  function open(ed, H) {
    const root = ed.win && ed.win.root;
    if (!root) return;
    const old = root.querySelector(".sx__exp");
    if (old) old.remove();
    const doc = ed.doc, tags = doc.tags || [];
    const st = Object.assign({}, DEFAULTS, ed.exportOpts || {}, { tag: ed.tagSel != null && tags[ed.tagSel] ? ed.tagSel : null });
    const el = document.createElement("div");
    el.className = "sx__exp";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Export frames");
    root.appendChild(el);
    let timer = 0, token = 0;

    const sel = (o, list, val) => '<select data-x="' + o + '">' + list.map(([id, label]) => '<option value="' + id + '"' + (String(id) === String(val) ? " selected" : "") + ">" + esc(label) + "</option>").join("") + "</select>";
    function paint() {
      const f = st.format, animated = f === "gif" || f === "apng";
      el.innerHTML = '<div class="sx__expbox"><header><b>EXPORT</b><span>' + esc(doc.meta.name) + '</span><button data-x="close" title="Close (Esc)" aria-label="Close">×</button></header>' +
        '<div class="sx__expcols"><div class="sx__expf">' +
          '<div class="sx__expfmt" role="radiogroup" aria-label="Format">' + FORMATS.map(([id, label, tip]) => '<button role="radio" aria-checked="' + (id === f) + '" class="' + (id === f ? "on" : "") + '" data-x="format" data-v="' + id + '" title="' + esc(tip) + '">' + esc(label) + "</button>").join("") + "</div>" +
          '<label class="sx__num"><span>FRAMES</span>' + sel("tag", [["", "All " + D.framesOf(doc).length]].concat(tags.map((t, i) => [i, t.name + " (" + (t.from + 1) + "–" + (t.to + 1) + ")"])), st.tag == null ? "" : st.tag) + "</label>" +
          '<label class="sx__num"><span>SCALE</span>' + sel("scale", SCALES.map((s) => [s, s + "×  " + doc.w * s + " × " + doc.h * s]), st.scale) + "</label>" +
          (f === "sheet" ? '<label class="sx__num"><span>LAYOUT</span>' + sel("pack", PACKS, st.pack) + '</label><label class="sx__num"><span>GAP</span><input type="number" data-x="pad" min="0" max="16" value="' + st.pad + '" style="width:40px"></label>' : "") +
          (f === "sheet" || f === "seq" ? '<label class="sx__chk"><input type="checkbox" data-x="atlas"' + (st.atlas ? " checked" : "") + "><span>Write a JSON with each frame's place, length and the tags</span></label>" : "") +
          (animated ? '<label class="sx__num"><span>PLAYS</span>' + sel("loop", [[0, "For ever"], [1, "Once"]].concat([2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, n + " times"])), st.loop) + "</label>" : "") +
          (f === "gif" ? '<label class="sx__chk"><input type="checkbox" data-x="transparent"' + (st.transparent ? " checked" : "") + "><span>Keep empty pixels clear</span></label>" +
            (st.transparent ? "" : '<label class="sx__num"><span>BEHIND IT</span><input type="color" data-x="bg" value="' + st.bg.toLowerCase() + '"></label>') : "") +
          '<p class="sx__expnote" data-x="note"></p>' +
        '</div><div class="sx__expv"><canvas class="sx__expc"></canvas><p class="sx__expn" data-x="info"></p></div></div>' +
        '<footer><button class="sx__tb" data-x="close">Close</button><span class="sx__spacer"></span><button class="sx__deliver" data-x="save">Save to 04-final</button></footer></div>';
      refresh();
    }
    // What would be written, counted for real, and the frames playing as they will.
    async function refresh() {
      const mine = ++token;
      const box = el.querySelector('[data-x="info"]'), note = el.querySelector('[data-x="note"]');
      let out;
      try { out = await build(doc, st, deflate); } catch (e) { box.textContent = "Could not build that: " + e.message; return; }
      if (mine !== token || !el.isConnected) return;
      const list = out.files.map((x) => x.name + "  (" + kb(x.bytes ? x.bytes.length : x.text.length) + ")");
      box.textContent = out.info.w + " × " + out.info.h + " px · " + out.info.frames + " frame" + (out.info.frames === 1 ? "" : "s") + " · " + kb(out.info.bytes);
      note.textContent = list.join("\n");
      preview(out.info);
    }
    function preview(info) {
      clearInterval(timer);
      const c = el.querySelector(".sx__expc");
      if (!c) return;
      const s = F.selection(doc, st.tag), k = Math.max(1, Math.floor(Math.min(200 / doc.w, 150 / doc.h)));
      c.width = doc.w * k; c.height = doc.h * k;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      const seq = F.sequence(s.frames, s.tag ? { from: 0, to: s.frames.length - 1, dir: s.tag.dir } : null);
      let at = 0;
      const draw = () => {
        g.clearRect(0, 0, c.width, c.height);
        const px = s.frames[seq[at].i].px;
        for (let i = 0; i < px.length; i++) if (px[i]) { g.fillStyle = px[i]; g.fillRect((i % doc.w) * k, Math.floor(i / doc.w) * k, k, k); }
      };
      const tick = () => { if (!el.isConnected) return; draw(); const ms = seq[at].ms; at = (at + 1) % seq.length; timer = setTimeout(tick, ms); };
      if (seq.length > 1) tick(); else draw();
      void info;
    }
    const close = () => { clearTimeout(timer); token++; el.remove(); document.removeEventListener("keydown", onKey, true); };
    function onKey(e) { if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); } }
    document.addEventListener("keydown", onKey, true);

    el.addEventListener("click", async (e) => {
      const t = e.target.closest("[data-x]");
      if (e.target === el) { close(); return; }
      if (!t) return;
      const x = t.dataset.x;
      if (x === "close") { close(); return; }
      if (x === "format") { st.format = t.dataset.v; ed.exportOpts = Object.assign({}, st); paint(); return; }
      if (x === "save") {
        t.disabled = true;
        const out = await build(doc, st, deflate);
        ed.exportOpts = Object.assign({}, st);
        await H.saveFiles(ed, out.files);
        close();
      }
    });
    el.addEventListener("change", (e) => {
      const t = e.target.closest("[data-x]");
      if (!t) return;
      const x = t.dataset.x;
      if (x === "tag") st.tag = t.value === "" ? null : Number(t.value);
      else if (x === "scale" || x === "pad" || x === "loop") st[x] = Number(t.value);
      else if (x === "pack" || x === "bg") st[x] = t.value;
      else if (x === "atlas" || x === "transparent") st[x] = t.checked;
      ed.exportOpts = Object.assign({}, st);
      paint();
    });
    paint();
    const first = el.querySelector("[data-x=format].on");
    if (first) first.focus();
  }

  return { FORMATS, SCALES, DEFAULTS, build, open, safe };
})();

if (typeof module !== "undefined") module.exports = SuiteFrameExport;
