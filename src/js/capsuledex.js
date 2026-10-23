"use strict";
/* ── the capsule dex ──────────────────────────────────────
 * A page for every creature that came out of the gachapon machine in your
 * room, kept on the computer (Studio only: drawing from a page is studio work,
 * not a gig). Each page is the creature's own: its picture, who it is, a
 * physical description, and how it lives. The picture is drawn from the words
 * (Capsules.read), so what you read is what it looks like.
 *
 *   draw it      the Design Suite opens in Pixel on a 48 × 48 page named after
 *                the creature; what you have drawn so far comes back with it
 *   compare      your drawing beside its picture at the same size, with how
 *                close the silhouette and the colours came (Capsules.compare)
 *
 * The room hands a creature over with PC.capsule(id): "toy:tidepup" for one of
 * the six toys, "seed:123" for one the machine made up. One that comes out
 * before you log on to Studio (or in Hustle) waits in localStorage until Studio
 * boots. A page is made from its id whenever it is needed, so an entry is
 * stored as little more than that id:
 *   state.capsules = [{ id, at, seen, drawn: { w, h, px } | null, score | null }]
 */

const CapsuleDex = (() => {
  const PENDING = "pixel-crossing:capsules";
  const TYPES = { ember: "Fire", tide: "Water", leaf: "Grass", volt: "Electric", stone: "Rock", frost: "Ice", gloom: "Dusk", gale: "Wind" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  let state = null, w = null, current = -1, note = "";

  const list = () => state.capsules;
  const save = () => Bridge.saveState(state);
  const docName = (p) => "Capsule — " + p.name;
  // An id from anything a slip has been stored as: the first build kept bare seeds.
  const idOf = (x) => (x && typeof x.id === "string" && /^(toy|seed):/.test(x.id) ? x.id : x && Number.isFinite(x.seed) ? "seed:" + (x.seed >>> 0) : typeof x === "string" && /^(toy|seed):/.test(x) ? x : null);

  async function boot() {
    state = await Bridge.getState();
    const old = Array.isArray(state.capsules) ? state.capsules : [];
    state.capsules = [];
    for (const c of old) { const id = idOf(c); if (id && !list().some((x) => x.id === id)) list().push({ id, at: c.at || Date.now(), seen: !!c.seen, drawn: c.drawn || null, score: c.score || null }); }
    let waiting = [];
    try { waiting = JSON.parse(localStorage.getItem(PENDING) || "[]"); localStorage.removeItem(PENDING); } catch { waiting = []; }
    for (const p of waiting) { const id = idOf(p); if (id) add(id, p.at); }
    save();
    badge();
  }
  const badge = () => setBadge("capsules", list().filter((c) => !c.seen).length);

  function add(id, at) {
    const i = list().findIndex((c) => c.id === id);
    if (i >= 0) return i;
    list().push({ id, at: at || Date.now(), seen: false, drawn: null, score: null });
    return list().length - 1;
  }

  // From the room: a creature's page. In Studio it lands here at once; anywhere else it waits.
  function receive(raw) {
    const id = idOf(raw) || (Number.isFinite(Number(raw)) ? "seed:" + (Number(raw) >>> 0) : null);
    if (!id) return "unknown";
    if (!state || Bridge.slot() !== "studio") {
      try { const q = JSON.parse(localStorage.getItem(PENDING) || "[]"); q.push({ id, at: Date.now() }); localStorage.setItem(PENDING, JSON.stringify(q.slice(-40))); } catch { /* private window */ }
      return "waiting";
    }
    const i = add(id);
    save();
    badge();
    if (w && w.el.isConnected) { current = i; render(); }
    return "dex";
  }

  /* ── the window ───────────────────────────────────────── */
  function open(i) {
    if (!w || !w.el.isConnected) {
      w = createWindow({ key: "capsules", title: "CAPSULE DEX", iconId: "capsule", w: 720, h: 520, minW: 540, minH: 380, className: "w98--cdx" });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", onClick);
    }
    if (Number.isInteger(i)) current = i;
    if (current < 0 || current >= list().length) current = list().length - 1;
    render();
    return revealWin(w);
  }

  function render() {
    if (!w) return;
    const items = list();
    if (!items.length) {
      w.client.innerHTML = '<div class="cdx cdx--empty"><p>No capsules yet.</p><p class="cdx__hint">Stand up from the desk and turn the crank on the gachapon machine in the corner of your room. Every capsule holds a little creature, and its page comes here.</p></div>';
      return;
    }
    const e = items[current], p = Capsules.page(e.id);
    if (!e.seen) { e.seen = true; save(); badge(); }
    const rows = items.map((c, i) => { const q = Capsules.page(c.id);
      return '<button class="cdx__row' + (i === current ? " on" : "") + '" data-pick="' + i + '"><canvas class="cdx__mini" data-mini="' + i + '" width="48" height="48"></canvas>' +
        '<span class="cdx__no">' + String(i + 1).padStart(3, "0") + '</span><span class="cdx__nm">' + esc(q.name) + "</span>" +
        (c.score ? '<b class="cdx__sc">' + c.score.overall + "%</b>" : !c.seen ? '<i class="cdx__new">NEW</i>' : "") + "</button>"; }).join("");
    const drawn = liveDrawing(p) || e.drawn;
    w.client.innerHTML =
      '<div class="cdx">' +
        '<nav class="cdx__list" aria-label="Capsules">' + rows + "</nav>" +
        '<article class="cdx__slip">' +
          '<aside class="cdx__box"><h2>' + esc(p.name) + '</h2><canvas data-pic="art" width="48" height="48"></canvas>' +
            "<dl><dt>Category</dt><dd>" + esc(p.category.replace(/^The /, "")) + "</dd><dt>Type</dt><dd>" + esc(TYPES[p.type] || p.type) + "</dd>" +
            "<dt>Height</dt><dd>" + p.height.toFixed(1) + " m</dd><dt>Weight</dt><dd>" + p.weight.toFixed(1) + " kg</dd><dt>No.</dt><dd>" + String(current + 1).padStart(3, "0") + "</dd></dl></aside>" +
          '<h3>Physical description</h3><div class="cdx__words">' + p.body.map((t) => "<p>" + esc(t) + "</p>").join("") + "</div>" +
          '<h3>Behaviour</h3><div class="cdx__words"><p>' + esc(p.behaviour) + "</p></div>" +
          '<div class="cdx__acts"><button class="w98btn" data-act="draw">' + (drawn ? "Keep drawing" : "Draw it in Pixel") + "</button>" +
          '<button class="w98btn" data-act="compare">' + (e.score ? "Compare again" : "Compare my drawing") + "</button></div>" +
          (note ? '<p class="cdx__note" role="status">' + esc(note) + "</p>" : "") +
          (e.score ? compareHtml(e) : '<p class="cdx__hint">Draw it from the words, then compare your drawing with its picture.</p>') +
        "</article>" +
      "</div>";
    const art = Capsules.sprite(p.spec);
    paint(w.client.querySelector('[data-pic="art"]'), art);
    items.forEach((c, i) => paint(w.client.querySelector('[data-mini="' + i + '"]'), i === current ? art : Capsules.sprite(Capsules.page(c.id).spec)));
    if (e.score) { paint(w.client.querySelector('[data-pic="yours"]'), e.drawn); paint(w.client.querySelector('[data-pic="ref"]'), art); }
  }

  function compareHtml(e) {
    const r = e.score;
    return '<section class="cdx__cmp">' +
      '<figure><canvas data-pic="yours" width="48" height="48"></canvas><figcaption>Yours</figcaption></figure>' +
      '<figure><canvas data-pic="ref" width="48" height="48"></canvas><figcaption>Its picture</figcaption></figure>' +
      '<dl class="cdx__nums"><dt>Silhouette</dt><dd>' + r.silhouette + "%</dd><dt>Colours</dt><dd>" + r.colour + "%</dd><dt>Overall</dt><dd><b>" + r.overall + "%</b></dd></dl>" +
      '<ul class="cdx__cols">' + r.colours.map((c) => '<li><i style="background:' + c.hex + '"></i><span>' + esc(c.name) + "</span>" +
        (c.closest ? '<i style="background:' + c.closest + '"></i><em>' + Math.round(c.score * 100) + "%</em>" : "<em>missing</em>") + "</li>").join("") + "</ul>" +
      "</section>";
  }
  function paint(canvas, img) {
    if (!canvas || !img) return;
    canvas.width = img.w; canvas.height = img.h;
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, img.w, img.h);
    img.px.forEach((v, k) => { if (v) { g.fillStyle = v; g.fillRect(k % img.w, Math.floor(k / img.w), 1, 1); } });
  }

  /* ── drawing it, and comparing ────────────────────────── */
  // The open Pixel page for this creature, if there is one.
  function liveEd(p) {
    if (typeof Suite === "undefined") return null;
    for (const x of Suite.peek()) { const ed = x.win && x.win.eds && x.win.eds.pixel; if (ed && ed.doc && ed.doc.meta && ed.doc.meta.name === docName(p)) return ed; }
    return null;
  }
  function liveDrawing(p) {
    const ed = liveEd(p);
    if (!ed || !ed.doc.bitmap.some(Boolean)) return null;
    return { w: ed.doc.w, h: ed.doc.h, px: ed.doc.bitmap.slice() };
  }
  function draw(e) {
    const p = Capsules.page(e.id);
    if (liveEd(p)) { Suite.open("pixel", null); return; }
    const doc = SuiteDoc.create({ mode: "pixel", w: 48, h: 48, name: docName(p) });
    if (e.drawn && e.drawn.w === 48 && e.drawn.h === 48) doc.bitmap = e.drawn.px.slice();
    Suite.open("pixel", null, doc);
  }
  function compare(e) {
    const p = Capsules.page(e.id), live = liveDrawing(p);
    if (live) e.drawn = live;
    if (!e.drawn) { note = "Nothing drawn yet: Draw it in Pixel first, then compare."; render(); note = ""; return; }
    const r = Capsules.compare(e.drawn, p.spec);
    e.score = { silhouette: r.silhouette, colour: r.colour, overall: r.overall, colours: r.colours.map(({ name, hex, closest, score }) => ({ name, hex, closest, score })) };
    save();
    if (typeof Music !== "undefined" && Music.sfx) Music.sfx("chime");
    render();
  }

  function onClick(ev) {
    const pick = ev.target.closest("[data-pick]");
    if (pick) { current = Number(pick.dataset.pick); render(); return; }
    const act = ev.target.closest("[data-act]");
    if (!act) return;
    const e = list()[current];
    if (!e) return;
    if (act.dataset.act === "draw") draw(e);
    else if (act.dataset.act === "compare") compare(e);
  }

  return { boot, open, receive, count: () => (state ? list().length : 0) };
})();
