"use strict";
/* ── the design suite ─────────────────────────────────────
 * One tool with three modes, switched in place in one window per job: Vector
 * (marks, wordmarks, monograms, banners, posters), Pixel (sprites and icons)
 * and Layout (a web page). Cutout, Swatch and the card tray are drawers that
 * pull out of any mode and do what makes sense there (drawers.js). Each mode
 * is its own file (vectored.js, pixeled.js, layouted.js) and borrows the
 * suite's plumbing through H.
 *
 * State lives in the active save slot under `state.suite`:
 *   cards    every card in the tray
 *   docs     autosaved documents, keyed "<app>:<job>" — a job has one per mode
 *   unlocks  bonus tools earned (Hustle only — Studio has them all)
 *   swatch   the Swatch drawer's working palette
 *   drawers  where each drawer's tab sits, and whether it is open
 *   look     "graphite" (dark) or "classic" (Win98 silver)
 */

const Suite = (() => {
  const D = SuiteDoc, R = SuiteRender, C = SuiteCards, A = SuiteApps, X = SuiteCutout;
  const AUTOSAVE_MAX = 3 * 1024 * 1024;
  const MODES = ["vector", "pixel", "layout"];
  const EDITORS = { vector: () => SuiteVectorEd, pixel: () => SuitePixelEd, layout: () => SuiteLayoutEd };
  // wm.js's esc() leaves quotes alone; card labels land inside attributes here,
  // and cards will come from outside the app, so this one escapes quotes too.
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  let state = null;
  const wins = new Map();            // window key -> suite window

  /* ── state ─────────────────────────────────────────────── */
  async function boot() {
    state = await Bridge.getState();
    const s = state.suite && typeof state.suite === "object" ? state.suite : {};
    // Keep keys other modules own (the reference board's pins live here too).
    state.suite = {
      ...s,
      cards: (Array.isArray(s.cards) ? s.cards : []).map(C.normalize).filter(Boolean),
      docs: s.docs && typeof s.docs === "object" ? s.docs : {},
      unlocks: Array.isArray(s.unlocks) ? s.unlocks.filter((u) => A.BONUS[u]) : [],
      swatch: Array.isArray(s.swatch) ? s.swatch.filter((c) => /^#[0-9A-F]{6}$/i.test(c)).slice(0, 6) : [],
      touched: s.touched && typeof s.touched === "object" ? s.touched : {},
      drawers: s.drawers && typeof s.drawers === "object" ? s.drawers : {},
      look: s.look === "classic" ? "classic" : "graphite",
    };
    document.addEventListener("keydown", onKey);
    S().cards.forEach(registerPicture);
    R.onImageReady(() => wins.forEach((w) => { const ed = w.eds[w.mode]; if (ed && ed.draw) ed.draw(); }));
  }
  const S = () => state.suite;
  const save = () => Bridge.saveState(state);
  const slot = () => Bridge.slot();
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sound = (name) => { if (typeof Music !== "undefined" && Music.ui) Music.ui(name); };

  /* ── jobs: what the work is for ────────────────────────── */
  // Studio jobs are briefs in the mailbox; Hustle jobs are gigs in progress.
  function jobs() {
    if (slot() === "hustle") return typeof Hustle !== "undefined" ? Hustle.jobs() : [];
    return typeof Mail !== "undefined" && Mail.jobs ? Mail.jobs() : [];
  }
  const jobById = (id) => jobs().find((j) => j.id === id) || null;
  const catOf = (job) => (job ? CATS[job.ci] : null);
  // The app a job is made in: the gig says; a brief goes by its discipline.
  function jobApp(job) {
    if (!job) return "banner";
    if (slot() === "hustle" && typeof Hustle !== "undefined" && Hustle.gig) { const g = Hustle.gig(job.id); if (g && g.app && A.APPS[g.app]) return g.app; }
    const cat = catOf(job);
    return A.forDiscipline(cat && cat.id).find((id) => !A.APPS[id].utility) || "banner";
  }

  /* ── cards ─────────────────────────────────────────────── */
  // Object cards can be a Layout block's picture: the block asks Imagery for
  // "card:<id>", and this makes that seed resolve to the card's image.
  function registerPicture(c) {
    if (c && c.kind === "object" && typeof Imagery !== "undefined") Imagery.override("card:" + c.id, c.value);
  }
  function addCards(list) {
    let n = 0;
    for (const raw of list) {
      const c = C.normalize(raw);
      if (!c) continue;
      if (S().cards.some((x) => x.kind === c.kind && x.value === c.value)) continue;
      S().cards.push(c);
      registerPicture(c);
      n++;
    }
    if (S().cards.length > 150) S().cards.splice(0, S().cards.length - 150);
    save();
    refreshDrawers();
    return n;
  }
  function removeCard(id) {
    S().cards = S().cards.filter((c) => c.id !== id);
    save();
    refreshDrawers();
  }
  const cardById = (id) => S().cards.find((c) => c.id === id) || null;
  function clientKit(job) {
    const client = job && job.client ? job.client : Object.values(CLIENTS)[Math.floor(Math.random() * Object.values(CLIENTS).length)];
    return C.debugPack(client, (ref) => Imagery.make(ref, 1, 320, 240));
  }
  // Which cards a mode can use at all. Others still show, dimmed.
  function usable(mode, c) {
    if (mode === "pixel") return c.kind === "colour" || c.kind === "object" || C.INTENT.includes(c.kind);
    if (mode === "layout") return c.kind !== "shape";
    return true;
  }
  function cardChip(c, mode) {
    let face;
    if (c.kind === "colour") face = '<span class="cd__sw" style="background:' + c.value + '"></span>';
    else if (c.kind === "object") face = '<img class="cd__img" src="' + c.value + '" alt="">';
    else if (c.kind === "type") face = '<span class="cd__aa" style="font-family:\'' + esc(c.value).replace(/'/g, "") + '\'">Aa</span>';
    else if (c.kind === "shape") face = '<svg class="cd__shape" viewBox="0 0 64 64"><path d="' + esc(c.value) + '"/></svg>';
    else face = '<span class="cd__txt">' + c.kind.toUpperCase() + "</span>";
    const dim = mode && !usable(mode, c) ? " dim" : "";
    return '<div class="cd cd--' + c.kind + dim + '" draggable="true" data-card="' + esc(c.id) + '" title="' +
      esc(c.label + " — " + (c.kind === "object" ? "picture" : c.value) + ". Drag it onto the work, or click to use it.") + '">' + face +
      '<span class="cd__l">' + esc(c.label) + '</span><button class="cd__x" data-uncard="' + esc(c.id) + '" aria-label="Remove card">×</button>' +
      (c.kind === "object" && typeof RefBoard !== "undefined" ? '<button class="cd__pin" data-pincard="' + esc(c.id) + '" title="Pin to the reference board">PIN</button>' : "") + "</div>";
  }

  /* ── fonts: bundled faces, then any type cards you found ─ */
  function fonts() {
    const out = A.FONTS.slice();
    for (const c of S().cards) if (c.kind === "type" && !out.some((f) => f.name === c.value)) out.push({ name: c.value, cat: "Cards", weights: [400, 700] });
    return out;
  }

  /* ── opening ───────────────────────────────────────────── */
  // The launcher is the suite itself now: it opens on the job, in its mode.
  function launcher(jobId) {
    const job = jobById(jobId);
    return open(jobApp(job), job ? job.id : null);
  }

  function open(appId, jobId, doc) {
    const job = jobById(jobId);
    if (appId === "swatch" || appId === "cutout") { const w = open(jobApp(job), jobId); if (w) winOf(w).drawers.open(appId); return w; }
    if (!A.APPS[appId]) appId = jobApp(job);
    const mode = A.modeOf(appId);
    const key = "suite:" + (job ? job.id : "scratch");
    let win = wins.get(key);
    if (!win || !win.w.el.isConnected) win = makeWindow(key, job);
    if (doc) {
      const ed = editorFor(win, mode);
      replaceDoc(ed, D.normalize(doc) || doc);
    }
    switchMode(win, mode);
    return revealWin(win.w);
  }
  const winOf = (w) => wins.get(w.key);

  function makeWindow(key, job) {
    const w = createWindow({
      key, title: "DESIGN SUITE — " + (job ? job.brief.project : "SCRATCH"), iconId: "suite", w: 1000, h: 680, minW: 720, minH: 500,
      className: "w98--suite", onClose: () => closeWindow(key),
    });
    w.client.classList.add("client--flush");
    const win = { key, job, w, mode: null, eds: {}, status: "", cut: { mode: "wand", tol: 36 } };
    const own = A.modeOf(jobApp(job));
    w.client.innerHTML =
      '<div class="sx" data-look="' + S().look + '">' +
        '<div class="sx__top">' +
          '<div class="sx__modes" role="tablist" aria-label="Mode">' + MODES.map((m) =>
            '<button class="sx__mode" role="tab" data-mode="' + m + '" title="' + esc(A.MODES[m].label + ": " + A.MODES[m].blurb + (m === own && job ? ". The brief is made here." : "")) + '">' +
            iconSVG(A.MODES[m].icon, 16) + "<b>" + A.MODES[m].label + "</b>" + (m === own && job ? '<i class="sx__own" aria-label="the brief\'s mode"></i>' : "") + "</button>").join("") + "</div>" +
          '<span class="sx__sep"></span>' +
          '<span class="sx__g sx__g--doc"><select class="sx__preset" data-s="preset" title="Size for a new document"></select>' +
            '<button class="sx__ib" data-s="new" title="New document at that size (Undo brings the old one back)">' + iconSVG("f-new", 16) + "</button>" +
            '<button class="sx__ib" data-s="open" title="Open a document…">' + iconSVG("folder", 16) + "</button></span>" +
          '<span class="sx__sep"></span>' +
          '<button class="sx__ib" data-s="undo" title="Undo (⌘Z)">' + iconSVG("f-undo", 16) + "</button>" +
          '<button class="sx__ib" data-s="redo" title="Redo (⇧⌘Z)">' + iconSVG("f-redo", 16) + "</button>" +
          '<span class="sx__sep sx__g--zoom"></span>' +
          '<span class="sx__g sx__g--zoom"><button class="sx__ib" data-s="zout" title="Zoom out (⌘-scroll)">' + iconSVG("z-out", 16) + "</button>" +
            '<span class="sx__zoom" data-s="zval" title="Click to fit">100%</span>' +
            '<button class="sx__ib" data-s="zin" title="Zoom in">' + iconSVG("z-in", 16) + "</button>" +
            '<button class="sx__ib" data-s="fit" title="Fit to the window">' + iconSVG("z-fit", 16) + "</button></span>" +
          '<span class="sx__g sx__g--view" aria-label="Guides and grid"></span>' +
          '<span class="sx__spacer"></span>' +
          '<input class="sx__name" data-s="name" maxlength="80" title="Document name" aria-label="Document name">' +
          '<button class="sx__ib" data-s="save" title="Save to 02-process (⌘S)">' + iconSVG("f-save", 16) + "</button>" +
          '<span class="sx__g sx__g--export"><select class="sx__xscale" data-s="xscale" title="Export scale" hidden></select>' +
          '<button class="sx__ib" data-s="export" title="Export a PNG to 04-final">' + iconSVG("f-export", 16) + "</button></span>" +
          (slot() === "hustle" && job ? '<button class="sx__deliver" data-s="deliver" title="Send it to the client">' + iconSVG("f-deliver", 16) + "<span>Deliver…</span></button>" : "") +
        "</div>" +
        '<div class="sx__body"></div>' +
        '<div class="sx__foot"><span class="sx__status" role="status"></span><span class="sx__spacer"></span>' +
          '<label class="sx__job"><span>WORK ON</span><select data-s="job"></select></label>' +
          '<button class="sx__look" data-s="look" title="Switch the suite\'s look"></button></div>' +
        '<div class="sx__splash" aria-hidden="true"></div>' +
      "</div>" +
      '<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sx__file" hidden>';
    win.root = w.client.querySelector(".sx");
    win.body = w.client.querySelector(".sx__body");
    win.lesson = lessonOf(job);
    if (win.lesson && !S().drawers.lesson) S().drawers.lesson = { edge: "right", pos: 0.3, open: true };
    win.drawers = SuiteDrawers.make(drawerDefs(win), S().drawers, { saved: () => save(), sound, opened: (id) => { if (id === "cutout") paintCutSources(win); if (id === "lesson") spotlight(win); } });
    wins.set(key, win);
    wireTop(win);
    splash(win);
    return win;
  }

  function closeWindow(key) {
    const win = wins.get(key);
    if (!win) return;
    for (const ed of Object.values(win.eds)) { if (ed.unmount) ed.unmount(); flushAutosave(ed); }
    wins.delete(key);
  }

  // A moment of the suite's name as it opens, in the mode's colours.
  function splash(win) {
    const el = win.root.querySelector(".sx__splash");
    if (reduced()) { el.remove(); return; }
    el.innerHTML = '<div class="sx__sp"><i>' + iconSVG("suite", 32) + "</i><b>PIXEL SUITE</b><span>" + MODES.map((m) => iconSVG(A.MODES[m].icon, 16)).join("") + "</span></div>";
    setTimeout(() => el.classList.add("out"), 520);
    setTimeout(() => el.remove(), 900);
    el.addEventListener("pointerdown", () => el.remove());
  }

  /* ── one editor per mode ───────────────────────────────── */
  function editorFor(win, mode) {
    if (win.eds[mode]) return win.eds[mode];
    const job = win.job;
    const appId = mode === "vector" ? (jobApp(job) === "type" ? "type" : "banner") : mode;
    const docKey = appId + ":" + (job ? job.id : "scratch");
    let doc = D.normalize(S().docs[docKey]);
    if (!doc && mode === "vector" && job) {
      // Work started in the other vector app (the old Banner or Type) is the same work.
      const other = (appId === "type" ? "banner" : "type") + ":" + job.id;
      doc = D.normalize(S().docs[other]);
    }
    if (!doc) {
      const [, pw, ph] = A.presetsFor(mode, appId)[0];
      doc = D.create({ mode: mode === "vector" ? "free" : mode, w: pw, h: ph, name: job ? job.brief.project : A.MODES[mode].label + " sketch", briefId: job ? job.id : null,
        site: mode === "layout" ? { tagline: job ? job.client && job.client.site && job.client.site.tagline : "" } : undefined });
    }
    const ed = { win, mode, appId, docKey, job, doc, hist: D.history(), bonus: A.bonusForMode(mode, slot(), S().unlocks) };
    win.eds[mode] = ed;
    return ed;
  }

  function switchMode(win, mode) {
    if (win.mode === mode && win.eds[mode] && win.eds[mode].body && win.eds[mode].body.parentNode === win.body) return;
    const prev = win.mode && win.eds[win.mode];
    if (prev) { if (prev.unmount) prev.unmount(); flushAutosave(prev); if (prev.ro) prev.ro.disconnect(); }
    win.mode = mode;
    const ed = editorFor(win, mode);
    ed.bonus = A.bonusForMode(mode, slot(), S().unlocks);
    // Each mode gets a fresh host: its listeners go when it goes, so a click
    // in one mode never reaches another's handlers.
    const host = document.createElement("div");
    host.className = "sx__host";
    win.body.replaceChildren(host);
    ed.body = host;
    win.root.dataset.mode = mode;
    win.body.classList.remove("sx__body--in"); void win.body.offsetWidth; win.body.classList.add("sx__body--in");
    EDITORS[mode]().mount(ed, H);
    ed.onView = () => paintZoom(win);
    ed.onGrid = () => sound("grid");
    win.drawers.attach(ed.view);
    wireSwatchPick(win, ed.view);
    paintTop(win);
    if (prev) sound("pick");
    setStatus(ed, statusHint(ed));
  }

  function statusHint(ed) {
    if (ed.mode === "pixel") return "Draw at true resolution. Exports scale by whole numbers only, so pixels stay hard.";
    if (ed.mode === "layout") return "Click a block in the page to edit it. Drag a card onto a block to write it in.";
    return "Pull guides out of the rulers; two across and two down make a focus grid. Drop cards from the tray onto the work.";
  }

  function replaceDoc(ed, doc) {
    const pre = JSON.stringify(ed.doc);
    ed.doc = doc;
    ed.hist.record(pre);
    changed(ed, {});
  }

  /* ── the top bar ───────────────────────────────────────── */
  function paintTop(win) {
    const ed = win.eds[win.mode], root = win.root;
    root.querySelectorAll("[data-mode]").forEach((b) => { if (b.closest(".sx__modes")) { const on = b.dataset.mode === win.mode; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); } });
    const canvas = win.mode !== "layout";
    root.querySelectorAll(".sx__g--zoom,.sx__g--doc,.sx__g--export").forEach((el) => { el.hidden = !canvas; });
    const presets = A.presetsFor(win.mode, ed.appId);
    const sel = root.querySelector('[data-s="preset"]');
    sel.innerHTML = presets.map(([n, pw, ph], i) => '<option value="' + i + '"' + (pw === ed.doc.w && ph === ed.doc.h ? " selected" : "") + ">" + esc(n) + " · " + pw + "×" + ph + "</option>").join("");
    const xs = root.querySelector('[data-s="xscale"]');
    xs.hidden = win.mode !== "pixel";
    if (win.mode === "pixel" && !xs.options.length) xs.innerHTML = [1, 2, 4, 8, 16].map((s) => '<option value="' + s + '"' + (s === 8 ? " selected" : "") + ">" + s + "×</option>").join("");
    const name = root.querySelector('[data-s="name"]');
    if (document.activeElement !== name) name.value = ed.doc.meta.name;
    name.title = win.mode === "layout" ? "The site's name: it is the page's masthead" : "Document name: the file's name when it is saved or delivered";
    paintUndo(win);
    paintZoom(win);
    const js = jobs(), jsel = root.querySelector('[data-s="job"]');
    jsel.innerHTML = '<option value="">Scratch — no brief</option>' + js.map((j) => '<option value="' + esc(j.id) + '"' + (win.job && j.id === win.job.id ? " selected" : "") + ">" + esc(j.brief.project + " · " + CATS[j.ci].label) + "</option>").join("");
    const look = root.querySelector('[data-s="look"]');
    look.textContent = "LOOK: " + S().look.toUpperCase();
  }
  function paintUndo(win) {
    const ed = win.eds[win.mode];
    if (!ed) return;
    win.root.querySelector('[data-s="undo"]').disabled = !ed.hist.canUndo();
    win.root.querySelector('[data-s="redo"]').disabled = !ed.hist.canRedo();
  }
  function paintZoom(win) {
    const ed = win.eds[win.mode], el = win.root.querySelector('[data-s="zval"]');
    if (ed && ed.st && el) el.textContent = Math.round(ed.st.zoom * 100) + "%";
  }

  function wireTop(win) {
    const root = win.w.client;
    root.addEventListener("click", (e) => {
      const v = e.target.closest("[data-v]");
      if (v && v.closest(".sx__top")) { const ed0 = win.eds[win.mode]; if (ed0 && ed0.viewClick) ed0.viewClick(v.dataset.v); return; }
      const t = e.target.closest("[data-s],[data-mode]");
      if (!t || !t.closest(".sx__top,.sx__foot")) return;
      const ed = win.eds[win.mode];
      if (t.dataset.mode) { switchMode(win, t.dataset.mode); return; }
      const s = t.dataset.s;
      if (s === "undo") undo(ed);
      if (s === "redo") undo(ed, true);
      if (s === "zin" && ed.st) { ed.st.step(1); }
      if (s === "zout" && ed.st) { ed.st.step(-1); }
      if ((s === "fit" || s === "zval") && ed.st) { ed.st.fit(ed.doc); ed.draw(); paintZoom(win); }
      if (s === "save") saveDoc(ed);
      if (s === "export") exportPNG(ed, win.mode === "pixel" ? Number(root.querySelector('[data-s="xscale"]').value) : 1);
      if (s === "deliver") deliver(ed);
      if (s === "open") openFromDisk(win);
      if (s === "look") { S().look = S().look === "graphite" ? "classic" : "graphite"; save(); win.root.dataset.look = S().look; Object.values(win.eds).forEach((x) => x.relook && x.relook()); paintTop(win); sound("pick"); }
      if (s === "new") {
        const [, pw, ph] = A.presetsFor(win.mode, ed.appId)[Number(root.querySelector('[data-s="preset"]').value) || 0];
        mutate(ed, () => {
          const fresh = D.create({ mode: ed.doc.mode, w: pw, h: ph, name: ed.doc.meta.name, briefId: ed.doc.meta.briefId });
          fresh.palette = ed.doc.palette.slice();
          fresh.guides = ed.doc.guides || { v: [], h: [] };
          Object.keys(ed.doc).forEach((k) => delete ed.doc[k]);
          Object.assign(ed.doc, fresh);
        });
        if (ed.st) { ed.st.fit(ed.doc); ed.render(); paintZoom(win); }
        setStatus(ed, "New " + pw + "×" + ph + " document. Undo brings the old one back.");
      }
    });
    root.addEventListener("input", (e) => {
      if (e.target.dataset.s === "name") { const ed = win.eds[win.mode]; ed.doc.meta.name = e.target.value.slice(0, 80) || "Untitled"; changed(ed, { quiet: true }); if (win.mode === "layout") ed.draw(); }
    });
    root.addEventListener("change", (e) => {
      if (e.target.dataset.s === "job") { const id = e.target.value; e.target.value = win.job ? win.job.id : ""; launcher(id || null); }
    });
    root.querySelector(".sx__file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0], cb = win.fileCb;
      e.target.value = "";
      win.fileCb = null;
      if (!f || !cb) return;
      if (f.size > 6 * 1024 * 1024) { setStatus(win.eds[win.mode], "That image is over 6MB."); return; }
      const r = new FileReader();
      r.onload = () => cb(r.result, f.name.replace(/\.[a-z]+$/i, "").slice(0, 40));
      r.readAsDataURL(f);
    });
  }

  /* ── the plumbing every mode borrows ───────────────────── */
  let autosaveTimer = 0;
  function changed(ed, opts = {}) {
    ed.dirty = true;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => flushAutosave(ed), 700);
    if (!opts.quiet && ed.render && ed.body && ed.body.isConnected) ed.render(opts);
    paintUndo(ed.win);
    afterPaint(ed.win);
  }
  function flushAutosave(ed) {
    if (!ed || !ed.dirty) return;
    const text = JSON.stringify(ed.doc);
    if (text.length > AUTOSAVE_MAX) { setStatus(ed, "Too large to autosave — use Save to keep it."); return; }
    S().docs[ed.docKey] = JSON.parse(text);
    S().touched[ed.docKey] = Date.now();
    ed.dirty = false;
    save();
  }
  // Run a change as one undo step, recorded only if something actually changed.
  function mutate(ed, fn, opts) {
    const pre = JSON.stringify(ed.doc);
    const out = fn();
    if (JSON.stringify(ed.doc) !== pre) { ed.hist.record(pre); changed(ed, opts); }
    else if (!(opts && opts.quiet) && ed.render && ed.body && ed.body.isConnected) ed.render(opts || {});
    return out;
  }
  // A gesture that already changed the doc: record it against where it started.
  function record(ed, pre) {
    if (pre && JSON.stringify(ed.doc) !== pre) { ed.hist.record(pre); changed(ed, { quiet: true }); }
  }
  function undo(ed, redo) {
    const next = redo ? ed.hist.redo(ed.doc) : ed.hist.undo(ed.doc);
    if (!next) return;
    ed.doc = next;
    if (ed.blockSel != null && ed.blockSel >= (ed.doc.blocks || []).length) ed.blockSel = ed.doc.blocks.length - 1;
    changed(ed, {});
    paintTop(ed.win);
    sound("tool");
  }
  function setStatus(ed, text) {
    const win = ed.win || ed;
    win.status = text;
    const el = win.root && win.root.querySelector(".sx__status");
    if (el) el.textContent = text;
  }

  const H = {
    status: setStatus, sound, look: () => S().look, reduced,
    mutate, record, changed,
    card: cardById, addCards, fonts,
    drawerButtons: (ed) => ["cutout", "swatch", "cards"].concat(ed.win.lesson ? ["lesson"] : []).map((id) => {
      const d = DRAWERS[id];
      return '<button class="sx__tool sx__tool--dw' + (ed.win.drawers && ed.win.drawers.isOpen(id) ? " on" : "") + '" data-drawer="' + id + '" title="' + esc(d.label + ": " + d.blurb[ed.mode]) + '">' + iconSVG(d.icon, 16) + "</button>";
    }).join(""),
    toggleDrawer: (ed, id) => { ed.win.drawers.toggle(id); if (ed.render) ed.render({ panels: false }); },
    switchMode: (ed, mode) => switchMode(ed.win, mode),
    // After any repaint: the lesson's controls light up again, and its ticks move.
    painted: (ed) => afterPaint(ed.win),
    // The view's own switches (grid, smart guides, snap) sit by the zoom.
    viewBar: (ed, html) => { const el = ed.win.root && ed.win.root.querySelector(".sx__g--view"); if (el) el.innerHTML = html; },
    pickFile: (ed, cb) => { ed.win.fileCb = cb; ed.win.w.client.querySelector(".sx__file").click(); },
    dropPin, visitLayout,
  };

  /* ── drawers ───────────────────────────────────────────── */
  const DRAWERS = {
    cutout: { icon: "app-cutout", label: "Cutout", edge: "top", pos: 0.22, w: 440, h: 420,
      blurb: { vector: "cut things out of pictures, or out of a picture on the work", pixel: "select pixels by colour on the sprite, or bring a picture down to pixels", layout: "cut pictures out for picture blocks" } },
    swatch: { icon: "d-swatch", label: "Swatch", edge: "top", pos: 0.38, w: 330, h: 330,
      blurb: { vector: "build a palette and check its contrast", pixel: "a palette for the sprite, or a classic one", layout: "brand colours, checked for contrast" } },
    cards: { icon: "card", label: "Cards", edge: "bottom", pos: 0.5, w: 660, h: 150,
      blurb: { vector: "what research found: drag it onto the work", pixel: "what research found: drag it onto the sprite", layout: "what research found: drag it onto a block" } },
    lesson: { icon: "lesson", label: "Lesson", edge: "right", pos: 0.3, w: 300, h: 400,
      blurb: { vector: "this job's lesson, one step at a time", pixel: "this job's lesson, one step at a time", layout: "this job's lesson, one step at a time" } },
  };
  function drawerDefs(win) {
    return Object.entries(DRAWERS).filter(([id]) => id !== "lesson" || win.lesson)
      .map(([id, d]) => Object.assign({ id, paint: (body) => paintDrawer(win, id, body) }, d));
  }
  function paintDrawer(win, id, body) {
    if (id === "cards") paintCards(win, body);
    if (id === "swatch") paintSwatch(win, body);
    if (id === "cutout") paintCutout(win, body);
    if (id === "lesson") paintLesson(win, body);
  }
  function refreshDrawers() { wins.forEach((win) => ["cards", "swatch", "cutout"].forEach((id) => win.drawers.repaint(id))); }

  /* The card tray. */
  function paintCards(win, body) {
    const ed = win.eds[win.mode];
    if (!body.dataset.wired) { body.dataset.wired = "1"; wireTray(win, body); }
    const cards = S().cards;
    const kit = slot() !== "hustle";
    body.innerHTML = '<div class="dw__row dw__row--head"><span class="dw__n">' + cards.length + " card" + (cards.length === 1 ? "" : "s") + "</span>" +
      '<span class="dw__sp"></span>' + (kit ? '<button class="sx__tb" data-k="kit">' + (win.job && win.job.client ? "Client kit" : "Sample kit") + "</button>" : "") + "</div>" +
      '<div class="dw__cards">' + (cards.length ? cards.slice().reverse().map((c) => cardChip(c, ed && ed.mode)).join("")
        : '<p class="sx__hint">' + (slot() === "hustle" ? "No cards yet. Research a gig to find some: clip facts from sites, cut things out of pictures." : "No cards yet. Pull a client kit to start.") + "</p>") + "</div>";
  }
  function wireTray(win, body) {
    body.addEventListener("dragstart", (e) => {
      const el = e.target.closest && e.target.closest("[data-card]");
      if (!el) return;
      e.dataTransfer.setData("text/x-pxcard", el.dataset.card);
      e.dataTransfer.effectAllowed = "copy";
    });
    body.addEventListener("click", (e) => {
      const pinB = e.target.closest("[data-pincard]");
      if (pinB) { e.stopPropagation(); const c = cardById(pinB.dataset.pincard); if (c) RefBoard.pin({ src: c.value, label: c.label }); return; }
      const x = e.target.closest("[data-uncard]");
      if (x) { e.stopPropagation(); removeCard(x.dataset.uncard); return; }
      if (e.target.closest('[data-k="kit"]')) { addCards(clientKit(win.job)); return; }
      const cd = e.target.closest("[data-card]");
      const ed = win.eds[win.mode];
      if (cd && ed && ed.drop) ed.drop(cardById(cd.dataset.card), null, e.shiftKey);
    });
  }

  /* Swatch: a working palette of six, every pair checked for contrast. */
  function luminance(hex) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  // Classic palettes for sprites: tight, and each one a look of its own.
  const CLASSICS = {
    "Pocket 4": ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
    "1-bit": ["#0A0A0A", "#F2ECE0"],
    "Fantasy 16": ["#000000", "#1D2B53", "#7E2553", "#008751", "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8", "#FF004D", "#FFA300", "#FFEC27", "#00E436", "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA"],
    "Sepia 5": ["#2B1D14", "#5C3D2E", "#9C6B4E", "#D6A77A", "#F4E3C1"],
  };
  function paintSwatch(win, body) {
    const ed = win.eds[win.mode], sw = S().swatch;
    if (!body.dataset.wired) { body.dataset.wired = "1"; wireSwatch(win, body); }
    const target = win.mode === "layout" ? "the brand colour" : win.mode === "pixel" ? "the sprite's palette" : "the document's palette";
    let h = '<div class="dw__row">' + sw.map((c) => '<button class="su__chip dw__chip" data-sw="' + c + '" style="background:' + c + '" title="' + c + (win.mode === "layout" ? ": make it the brand colour" : ": paint with it") + ". Alt-click removes it.\"></button>").join("") +
      (sw.length < 6 ? '<span class="dw__slot">' + (6 - sw.length) + " free</span>" : "") + "</div>" +
      '<div class="dw__row dw__tools">' +
        '<label class="sx__well" title="Mix a colour"><input type="color" data-w="mix" value="' + (win.mixed || "#e0442b") + '"><i style="background:' + (win.mixed || "#e0442b") + '"></i></label>' +
        '<button class="sx__ib" data-w="addmix" title="Add the mixed colour (it becomes a card too)">' + iconSVG("plus", 16) + "</button>" +
        '<button class="sx__ib' + (win.swatchPick ? " on" : "") + '" data-w="pick" title="Take a colour from the work: click it next">' + iconSVG("t-eyedrop", 16) + "</button>" +
        '<button class="sx__ib" data-w="fromdoc" title="Fill the swatch from the colours in the work">' + iconSVG("f-import", 16) + "</button>" +
        '<span class="dw__sp"></span>' +
        '<button class="sx__tb" data-w="apply" title="Use these colours as ' + target + '"' + (sw.length ? "" : " disabled") + ">" + iconSVG("f-down", 16) + "<span>Use in the " + (win.mode === "layout" ? "page" : win.mode === "pixel" ? "sprite" : "work") + "</span></button>" +
      "</div>";
    if (win.mode === "pixel") {
      h += '<div class="dw__sub">CLASSIC PALETTES</div><div class="dw__row dw__classics">' + Object.entries(CLASSICS).map(([n, cs]) =>
        '<button class="dw__classic" data-classic="' + esc(n) + '" title="' + esc(n) + ': make it the sprite\'s palette">' + cs.slice(0, 16).map((c) => '<i style="background:' + c + '"></i>').join("") + "<span>" + esc(n) + "</span></button>").join("") + "</div>";
    }
    h += '<div class="dw__sub">CONTRAST</div>' + (sw.length < 2
      ? '<p class="sx__hint">' + (sw.length ? "Add one more colour to see how the pair reads." : "Up to six colours; every pair is checked for text contrast (4.5 for body text, 3 for large).") + "</p>"
      : '<table class="su__ct"><tr><th></th>' + sw.map((c) => '<th><span class="su__chip" style="background:' + c + '"></span></th>').join("") + "</tr>" +
        sw.map((a) => '<tr><th><span class="su__chip" style="background:' + a + '"></span></th>' + sw.map((b) => {
          if (a === b) return "<td></td>";
          const r = contrast(a, b), grade = r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large" : "fail";
          return '<td class="su__ct--' + grade.split(" ")[0].toLowerCase() + '" title="' + r.toFixed(2) + ": " + grade + '"><span style="background:' + b + ";color:" + a + '">Ag</span>' + r.toFixed(1) + "</td>";
        }).join("") + "</tr>").join("") + "</table>");
    const colours = S().cards.filter((c) => c.kind === "colour" && !sw.includes(c.value));
    if (colours.length) h += '<div class="dw__sub">FROM YOUR CARDS</div><div class="dw__row">' + colours.slice(-12).map((c) => '<button class="su__chip" data-addsw="' + c.value + '" style="background:' + c.value + '" title="' + esc(c.label) + ': add to the swatch"></button>').join("") + "</div>";
    body.innerHTML = h;
  }
  function wireSwatch(win, body) {
    const addSw = (v) => { const sw = S().swatch; if (sw.includes(v)) return; if (sw.length >= 6) { setStatus(win, "Six colours is the limit. Alt-click one to remove it."); return; } sw.push(v); save(); };
    body.addEventListener("input", (e) => { if (e.target.dataset.w === "mix") { win.mixed = e.target.value; const i = e.target.parentNode.querySelector("i"); if (i) i.style.background = e.target.value; } });
    body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-sw],[data-w],[data-classic],[data-addsw]");
      if (!t) return;
      const ed = win.eds[win.mode];
      if (t.dataset.sw) {
        const c = t.dataset.sw;
        if (e.altKey) { S().swatch = S().swatch.filter((x) => x !== c); save(); }
        else if (win.mode === "layout") mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, brand: c }); });
        else if (ed.drop) ed.drop({ id: "swatch", kind: "colour", label: c, value: c, tags: C.colourTags(c) }, null, e.shiftKey);
      }
      if (t.dataset.addsw) addSw(t.dataset.addsw);
      if (t.dataset.w === "addmix") { const v = (win.mixed || "#E0442B").toUpperCase(); addCards([{ kind: "colour", label: "Mixed " + v, value: v, tags: ["mixed"] }]); addSw(v); }
      if (t.dataset.w === "pick") { win.swatchPick = !win.swatchPick; setStatus(ed, win.swatchPick ? "Click the work to take a colour into the swatch." : ""); }
      if (t.dataset.w === "fromdoc") {
        const got = D.colours(ed.doc).filter((c) => /^#[0-9A-F]{6}$/.test(c));
        for (const c of got) addSw(c);
        setStatus(ed, got.length ? "Took " + Math.min(got.length, 6) + " colours from the work." : "No colours in the work yet.");
      }
      if (t.dataset.w === "apply") {
        const sw = S().swatch.slice();
        if (win.mode === "layout") mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, brand: sw[0] }); });
        else mutate(ed, () => { ed.doc.palette = sw; });
        setStatus(ed, win.mode === "layout" ? "Brand colour: " + sw[0] + "." : "Palette set: it's in the options strip now.");
        sound("drop");
      }
      if (t.dataset.classic) {
        const cs = CLASSICS[t.dataset.classic];
        mutate(ed, () => { ed.doc.palette = cs.slice(); });
        if (ed.fg !== undefined) { ed.fg = cs[0]; ed.render({}); }
        setStatus(ed, t.dataset.classic + ": " + cs.length + " colours, in the options strip.");
        sound("drop");
      }
      paintSwatch(win, body);
    });
  }
  // The swatch's eyedropper takes the next click on the work before the mode does.
  function wireSwatchPick(win, view) {
    if (view.dataset.pickWired) return;
    view.dataset.pickWired = "1";
    view.addEventListener("pointerdown", (e) => {
      if (!win.swatchPick || (e.target.closest && e.target.closest(".dw"))) return;
      const ed = win.eds[win.mode];
      if (!ed.st || !ed.sample) return;
      e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
      const p = ed.st.toDoc(e), c = ed.sample(p.x, p.y);
      win.swatchPick = false;
      if (c) { const sw = S().swatch; if (!sw.includes(c) && sw.length < 6) { sw.push(c); save(); } setStatus(ed, "Took " + c + " into the swatch."); sound("pick"); }
      else setStatus(ed, "Nothing there to take a colour from.");
      win.drawers.repaint("swatch");
    }, true);
  }

  /* Cutout: select part of a picture by colour or by drawing round it. */
  function paintCutout(win, body) {
    const ed = win.eds[win.mode], cut = win.cut;
    if (!body.dataset.wired) { body.dataset.wired = "1"; wireCutout(win, body); }
    let h = "";
    if (win.mode === "pixel") {
      h += '<div class="dw__sub">ON THE SPRITE</div><div class="dw__row dw__tools">' +
        '<button class="sx__tb' + (ed.tool === "wand" ? " on" : "") + '" data-c="spritewand">' + iconSVG("c-wand", 16) + "<span>Select by colour</span></button>" +
        '<label class="sx__slide"><span>TOL</span><input type="range" min="0" max="120" value="' + cut.tol + '" data-c="tol"><b>' + cut.tol + "</b></label></div>" +
        '<p class="sx__hint">Click the sprite to select a colour region (Shift adds). Then drag it, recolour it, or make it a card.</p>';
    }
    h += '<div class="dw__sub">' + (win.mode === "pixel" ? "FROM A PICTURE" : "PICTURE") + '</div><div class="dw__srcs"></div>' +
      '<div class="dw__row dw__tools">' +
        '<button class="sx__ib' + (cut.mode === "wand" ? " on" : "") + '" data-c="wand" title="Wand: click a colour (Shift adds)">' + iconSVG("c-wand", 16) + "</button>" +
        '<button class="sx__ib' + (cut.mode === "lasso" ? " on" : "") + '" data-c="lasso" title="Lasso: draw round what you want">' + iconSVG("c-lasso", 16) + "</button>" +
        '<label class="sx__slide" title="How close a colour counts as the same"><span>TOL</span><input type="range" min="0" max="120" value="' + cut.tol + '" data-c="tol"><b>' + cut.tol + "</b></label>" +
        '<button class="sx__ib" data-c="invert" title="Swap what is selected">' + iconSVG("c-invert", 16) + "</button>" +
        '<button class="sx__ib" data-c="clear" title="Select nothing">' + iconSVG("none", 16) + "</button>" +
        '<button class="sx__ib" data-c="file" title="Load a picture from disk…">' + iconSVG("folder", 16) + "</button></div>" +
      '<div class="dw__cutv"><canvas class="dw__cut"></canvas><p class="dw__cutn"></p></div>' +
      '<div class="dw__row dw__tools">' +
        '<button class="sx__tb" data-c="object" title="Make what is selected an object card">' + iconSVG("card", 16) + "<span>Object card</span></button>" +
        '<button class="sx__tb" data-c="colour" title="Its main colour as a colour card">' + iconSVG("d-swatch", 16) + "<span>Colour card</span></button>" +
        '<button class="sx__tb" data-c="place" title="' + (win.mode === "pixel" ? "Bring it down to pixels on the sprite" : win.mode === "layout" ? "Make it a picture card for a block" : "Put it on the canvas") + '">' + iconSVG("f-down", 16) + "<span>" + (win.mode === "pixel" ? "Onto sprite" : win.mode === "layout" ? "For a block" : "Place it") + "</span></button>" +
        (cut.layer ? '<button class="sx__tb" data-c="replace" title="Replace the picture on the work with just the cutout">' + iconSVG("c-replace", 16) + "<span>Replace</span></button>" : "") +
      "</div>";
    body.innerHTML = h;
    cut.cv = body.querySelector(".dw__cut");
    cut.ctx = cut.cv.getContext("2d", { willReadFrequently: true });
    paintCutSources(win);
    drawCut(win);
  }
  function paintCutSources(win) {
    const body = win.drawers.body("cutout"), el = body && body.querySelector(".dw__srcs");
    if (!el) return;
    const ed = win.eds[win.mode];
    // Official art is for looking at, never for cutting up: it stays off this list.
    const refs = ((win.job && win.job.client && win.job.client.refs) || []).filter((r) => !(typeof Characters !== "undefined" && Characters.poseFor(r, 0)));
    const objs = S().cards.filter((c) => c.kind === "object").slice(-10).reverse();
    const layer = ed && ed.selectedImage && ed.selectedImage();
    const tile = (key, src, label) => '<button class="dw__src' + (win.cut.key === key ? " on" : "") + '" data-src="' + esc(key) + '" title="' + esc(label) + '"><img src="' + src + '" alt=""></button>';
    el.innerHTML = (layer ? tile("layer:" + layer.id, layer.src, "The picture selected on the work") : "") +
      refs.map((r, i) => tile("ref:" + i, Imagery.make(r, 1, 96, 72), r)).join("") +
      objs.map((c) => tile("card:" + c.id, c.value, c.label)).join("") ||
      '<p class="sx__hint">' + (win.job ? "No pictures yet: search the web for some, or load one from disk." : "Load a picture from disk, or pick a job with client references.") + "</p>";
  }
  function loadCut(win, src, label, tags, key, layerId) {
    const cut = win.cut;
    const img = new Image();
    img.onload = () => {
      if (!cut.cv) return;
      const k = Math.min(1, 404 / img.naturalWidth, 250 / img.naturalHeight);
      cut.cv.width = Math.max(1, Math.round(img.naturalWidth * k));
      cut.cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      cut.ctx.clearRect(0, 0, cut.cv.width, cut.cv.height);
      cut.ctx.drawImage(img, 0, 0, cut.cv.width, cut.cv.height);
      Object.assign(cut, { img, src, label, tags: tags || [], key, layer: layerId || null, pixels: cut.ctx.getImageData(0, 0, cut.cv.width, cut.cv.height), mask: new Uint8Array(cut.cv.width * cut.cv.height), lasso: [] });
      const body = win.drawers.body("cutout");
      if (body) { const r = body.querySelector('[data-c="replace"]'); if (!!r !== !!layerId) paintCutout(win, body); else { paintCutSources(win); drawCut(win); } }
    };
    img.src = src;
  }
  function drawCut(win) {
    const cut = win.cut, cv = cut.cv, ctx = cut.ctx;
    if (!cv) return;
    const n = cv.parentNode.querySelector(".dw__cutn");
    if (!cut.pixels || cut.pixels.width !== cv.width) {
      if (!cut.img) { cv.width = 404; cv.height = 150; ctx.fillStyle = "rgba(128,128,140,.25)"; ctx.fillRect(0, 0, 404, 150); if (n) n.textContent = "Pick a picture above."; return; }
      loadCut(win, cut.src, cut.label, cut.tags, cut.key, cut.layer);
      return;
    }
    ctx.putImageData(cut.pixels, 0, 0);
    if (cut.mask) {
      const over = ctx.getImageData(0, 0, cv.width, cv.height);
      for (let p = 0; p < cut.mask.length; p++) {
        const i = p * 4;
        if (cut.mask[p]) { over.data[i] = over.data[i] * 0.55 + 16 * 0.45; over.data[i + 1] = over.data[i + 1] * 0.55 + 132 * 0.45; over.data[i + 2] = over.data[i + 2] * 0.55 + 208 * 0.45; }
      }
      ctx.putImageData(over, 0, 0);
    }
    if (cut.lasso.length) { ctx.strokeStyle = "#FF5FA8"; ctx.lineWidth = 1.5; ctx.beginPath(); cut.lasso.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
    const count = cut.mask ? X.count(cut.mask) : 0;
    if (n) n.textContent = count ? count + " pixels selected from " + cut.label : "Nothing selected: " + (cut.mode === "wand" ? "click a colour" : "draw round something");
  }
  function cutImage(win) {
    const cut = win.cut;
    const out = cut.pixels && X.extract(cut.pixels.data, cut.cv.width, cut.cv.height, cut.mask);
    if (!out) return null;
    const oc = document.createElement("canvas");
    oc.width = out.w; oc.height = out.h;
    oc.getContext("2d").putImageData(new ImageData(out.rgba, out.w, out.h), 0, 0);
    return { src: oc.toDataURL("image/png"), bounds: out.bounds };
  }
  function wireCutout(win, body) {
    const cut = win.cut;
    body.addEventListener("input", (e) => { if (e.target.dataset.c === "tol") { cut.tol = Number(e.target.value); const b = e.target.parentNode.querySelector("b"); if (b) b.textContent = cut.tol; } });
    body.addEventListener("click", (e) => {
      const src = e.target.closest("[data-src]");
      const ed = win.eds[win.mode];
      if (src) {
        const k = src.dataset.src;
        if (k.startsWith("layer:")) { const l = D.find(ed.doc, k.slice(6)); if (l) loadCut(win, l.src, l.name, ["cutout"], k, l.id); }
        else if (k.startsWith("ref:")) {
          const refs = ((win.job && win.job.client && win.job.client.refs) || []).filter((r) => !(typeof Characters !== "undefined" && Characters.poseFor(r, 0)));
          const ref = refs[Number(k.slice(4))];
          if (ref) loadCut(win, Imagery.make(ref, 1, 480, 360), ref, ["reference"], k);
        } else { const c = cardById(k.slice(5)); if (c) loadCut(win, c.value, c.label, c.tags, k); }
        return;
      }
      const t = e.target.closest("[data-c]");
      if (!t || t.tagName === "INPUT") return;
      const c = t.dataset.c;
      if (c === "spritewand") { ed.tool = "wand"; ed.render({}); setStatus(ed, "Click the sprite to select a colour region."); paintCutout(win, body); return; }
      if (c === "wand" || c === "lasso") { cut.mode = c; paintCutout(win, body); return; }
      if (c === "file") { H.pickFile(ed, (s, name) => loadCut(win, s, name, ["found"], "file")); return; }
      if (!cut.pixels) { setStatus(ed, "Pick a picture first."); return; }
      if (c === "clear") { cut.mask = new Uint8Array(cut.cv.width * cut.cv.height); drawCut(win); }
      if (c === "invert") { cut.mask = X.invert(cut.mask); drawCut(win); }
      if (c === "object" || c === "place" || c === "replace") {
        const got = cutImage(win);
        if (!got) { setStatus(ed, "Select something first."); return; }
        if (c === "object") { const n = addCards([{ kind: "object", label: "Cut: " + cut.label, value: got.src, tags: cut.tags.concat(["cutout"]) }]); setStatus(ed, n ? "Object card made from " + cut.label + "." : "That cutout is already a card."); }
        if (c === "place" && ed.place) ed.place(got.src, "Cut: " + cut.label);
        if (c === "replace" && cut.layer) {
          const l = D.find(ed.doc, cut.layer);
          if (l) {
            const k = l.w / cut.cv.width, kh = l.h / cut.cv.height, b = got.bounds;
            mutate(ed, () => { D.update(ed.doc, l.id, { src: got.src, x: l.x + b.x * k, y: l.y + b.y * kh, w: Math.max(1, b.w * k), h: Math.max(1, b.h * kh), name: "Cut: " + l.name }); });
            setStatus(ed, "The picture is just the cutout now. Undo brings the whole one back.");
            cut.layer = null;
          }
        }
        sound("drop");
      }
      if (c === "colour") {
        const hex = X.dominant(cut.pixels.data, cut.mask);
        if (!hex) { setStatus(ed, "Select something first."); return; }
        const n = addCards([{ kind: "colour", label: hex + " from " + cut.label, value: hex, tags: cut.tags.concat(["sampled"]) }]);
        setStatus(ed, n ? "Colour card " + hex + " made." : hex + " is already a card.");
      }
    });
    let lassoing = false;
    const pt = (e) => { const r = cut.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cut.cv.width / r.width, y: (e.clientY - r.top) * cut.cv.height / r.height }; };
    body.addEventListener("pointerdown", (e) => {
      if (e.target !== cut.cv || !cut.pixels) return;
      const p = pt(e);
      if (cut.mode === "wand") {
        cut.mask = X.wand(cut.pixels.data, cut.cv.width, cut.cv.height, Math.floor(p.x), Math.floor(p.y), cut.tol, e.shiftKey ? cut.mask : new Uint8Array(cut.cv.width * cut.cv.height));
        drawCut(win);
      } else {
        lassoing = true; cut.cv.setPointerCapture(e.pointerId);
        cut.lasso = [p];
        if (!e.shiftKey) cut.mask = new Uint8Array(cut.cv.width * cut.cv.height);
      }
    });
    body.addEventListener("pointermove", (e) => { if (lassoing) { cut.lasso.push(pt(e)); drawCut(win); } });
    const endLasso = () => {
      if (!lassoing) return;
      lassoing = false;
      cut.mask = X.lasso(cut.lasso, cut.cv.width, cut.cv.height, cut.mask);
      cut.lasso = [];
      drawCut(win);
    };
    body.addEventListener("pointerup", endLasso);
    body.addEventListener("pointercancel", endLasso);
  }

  /* ── lessons ──────────────────────────────────────────── */
  /* A tutorial job (HustleLessons, hustle/tutorial.js) says what it teaches.
   * The Lesson drawer lists the steps in the client's words and ticks them as
   * the work meets them; the controls of the step you are on are ringed, so
   * they are easy to find; "Show me" rings them harder, switching to the mode
   * they live in if you are somewhere else. */
  function lessonOf(job) {
    if (!job || slot() !== "hustle" || typeof Hustle === "undefined" || !Hustle.gig || typeof HustleLessons === "undefined") return null;
    const gig = Hustle.gig(job.id);
    return gig && gig.teach && gig.teach.length ? { gig, teach: gig.teach, mode: A.modeOf(gig.app), app: gig.app } : null;
  }
  function lessonCtx(win) {
    const L = win.lesson, ed = win.eds[L.mode];
    const doc = ed ? ed.doc : D.normalize(S().docs[(L.mode === "vector" ? (L.app === "type" ? "type" : "banner") : L.mode) + ":" + win.job.id]);
    return { doc, cards: S().cards };
  }
  const MODE_TOOLS = { vector: SuiteVectorEd.TOOLS.map((t) => t.id).concat(Object.keys(SuiteVectorEd.SHAPES)),
    pixel: SuitePixelEd.TOOLS.map((t) => t.id), layout: ["select", "text"] };
  function selectorsFor(ctrl) {
    const [kind, id] = ctrl.split(":");
    if (ctrl === "ruler") return [".sx__rx", ".sx__ry"];
    if (ctrl === "layers") return [".sx__layers"];
    if (ctrl === "deliver") return ['.sx__top [data-s="deliver"]'];
    if (kind === "tool") return ['.sx__rail [data-tool="' + id + '"]'];
    if (kind === "opt") return ['.sx__opts [data-o="' + id + '"]', '.sx__opts [data-l="' + id + '"]', '.sx__opts [data-s="' + id + '"]'];
    if (kind === "view") return ['.sx__top [data-v="' + id + '"]'];
    if (kind === "drawer") return ['.dw__tab[data-dw="' + id + '"]:not([hidden])', '.sx__rail [data-drawer="' + id + '"]'];
    if (kind === "mode") return ['.sx__modes [data-mode="' + id + '"]'];
    if (kind === "blk") return ['.sx__lib [data-add="' + id + '"]'];
    return [];
  }
  // A control inside a label (a colour well, a number, a slider) rings the label.
  function controlsFor(win, ctrl) {
    const out = [];
    for (const sel of selectorsFor(ctrl)) win.root.querySelectorAll(sel).forEach((el) => out.push(el.closest(".sx__well,.sx__num,.sx__slide") || el));
    // A shape that isn't the one showing in the rail: ring the shapes button.
    if (!out.length && ctrl.startsWith("tool:") && SuiteVectorEd.SHAPES[ctrl.slice(5)]) win.root.querySelectorAll(".sx__rail .sx__fly").forEach((el) => out.push(el));
    return out;
  }

  let paintQueued = false;
  function afterPaint(win) {
    if (!win || !win.lesson || paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => { paintQueued = false; if (win.root && win.root.isConnected) { spotlight(win); win.drawers.repaint("lesson"); } });
  }

  function spotlight(win) {
    win.root.querySelectorAll(".sx-teach").forEach((el) => el.classList.remove("sx-teach"));
    const L = win.lesson;
    if (!L) return;
    const ctx = lessonCtx(win);
    const p = HustleLessons.progress(L.teach, ctx);
    // A step ticked since last time: a small sound, and it says so.
    win.ticked = win.ticked || new Set(p.filter((x) => x.done).map((x) => x.id));
    const fresh = p.filter((x) => x.done && !win.ticked.has(x.id));
    fresh.forEach((x) => win.ticked.add(x.id));
    const step = HustleLessons.current(L.teach, ctx);
    if (fresh.length) { sound(step ? "pick" : "grid"); if (!step) setStatus(win, "Every step done. Deliver it when it looks right."); }
    const ctrls = step ? step.with : ["deliver"];
    // Somewhere else? The mode tab is the way back.
    if (step && win.mode !== L.mode && !ctrls.some((c) => c.startsWith("mode:"))) ctrls.unshift("mode:" + L.mode);
    for (const c of ctrls) for (const el of controlsFor(win, c)) el.classList.add("sx-teach");
  }

  function showMe(win, i) {
    const L = win.lesson, step = L && L.teach[i];
    if (!step) return;
    const toMode = step.with.find((c) => c.startsWith("mode:")) ? null : L.mode;
    if (toMode && win.mode !== toMode) switchMode(win, toMode);
    requestAnimationFrame(() => {
      const els = step.with.flatMap((c) => controlsFor(win, c));
      if (!els.length) { setStatus(win, step.say + " (It shows once the right thing is selected.)"); return; }
      els.forEach((el) => { el.classList.remove("sx-teach--now"); void el.offsetWidth; el.classList.add("sx-teach--now"); setTimeout(() => el.classList.remove("sx-teach--now"), 2600); });
      setStatus(win, step.say);
      sound("menu");
    });
  }

  function paintLesson(win, body) {
    const L = win.lesson;
    if (!L) return;
    if (!body.dataset.wired) {
      body.dataset.wired = "1";
      body.addEventListener("click", (e) => { const b = e.target.closest("[data-show]"); if (b) showMe(win, Number(b.dataset.show)); });
    }
    const ctx = lessonCtx(win), p = HustleLessons.progress(L.teach, ctx), now = HustleLessons.current(L.teach, ctx);
    const who = typeof HUSTLE !== "undefined" && HUSTLE.people[L.gig.poster.handle];
    const face = who && typeof Portraits !== "undefined" ? Portraits.head(L.gig.poster.handle, who.look, { px: 36 }) : "";
    const n = p.filter((x) => !x.tip && x.done).length, of = p.filter((x) => !x.tip).length;
    body.innerHTML = '<div class="ls__head">' + (face ? '<img class="ls__face" src="' + face + '" alt="">' : "") +
        "<div><b>" + esc(L.gig.poster.name) + "'s notes</b><span>Lesson " + L.gig.lesson.n + " of " + L.gig.lesson.of + ": " + esc(L.gig.lesson.title) + "</span></div>" +
        '<em class="ls__n" title="Steps done">' + n + "/" + of + "</em></div>" +
      '<ol class="ls__steps">' + L.teach.map((s, i) => {
        const st = p[i], cls = st.tip ? "tip" : st.done ? "done" : s === now ? "now" : "";
        return '<li class="ls__step' + (cls ? " ls__step--" + cls : "") + '"><i>' + (st.tip ? "★" : st.done ? "✓" : i + 1) + "</i><p>" + esc(s.say) + "</p>" +
          '<button class="sx__tb ls__show" data-show="' + i + '" title="Show me where">' + iconSVG("show", 16) + "</button></li>";
      }).join("") + "</ol>" +
      (now ? "" : '<p class="ls__done">' + iconSVG("star", 16) + "<span>All done! Deliver it when it looks right.</span></p>");
  }

  /* ── pins, pages, files ────────────────────────────────── */
  // An official pin dropped on the canvas marks where you drew that character:
  // a labelled box, sized to the pose's proportions, and nothing else.
  function dropPin(ed, pinId, at) {
    const pin = typeof RefBoard !== "undefined" ? RefBoard.get(pinId) : null;
    if (!pin) return;
    if (ed.mode !== "vector") { setStatus(ed, "Subjects are marked in Vector."); return; }
    if (!pin.char || typeof Characters === "undefined" || !Characters.has(pin.char, pin.pose)) { setStatus(ed, "That pin is just for looking at. Only official art marks who you drew."); return; }
    const ref = Characters.reference(pin.char, pin.pose);
    const h = Math.round(Math.min(ed.doc.h * 0.92, 260)), w = Math.max(8, Math.round(h * ref.w / ref.h));
    const first = Characters.CAST[pin.char].name.split(" ")[0];
    mutate(ed, () => {
      const l = D.add(ed.doc, D.layer("subject", {
        name: "Subject: " + first + " (" + pin.pose + ")", label: first + " — " + pin.pose, ref: { id: pin.char, pose: pin.pose },
        x: Math.round(at.x - w / 2), y: Math.round(Math.max(0, Math.min(ed.doc.h - h, at.y - h / 2))), w, h,
      }));
      if (l) ed.sel = [l.id];
    });
    setStatus(ed, "Marked where you're drawing " + first + ". Draw him inside the box, by eye. The box is never exported.");
  }

  // Register the page as a site so the in-app browser can visit it.
  function visitLayout(ed, client) {
    const key = "SUITE:" + client.dom;
    const clash = Object.entries(CLIENTS).some(([k, c]) => k !== key && c.dom.toLowerCase() === client.dom);
    if (clash) { setStatus(ed, client.dom + " is already somebody's site. Rename the page."); return; }
    CLIENTS[key] = JSON.parse(JSON.stringify(client));
    Web.visit("http://" + client.dom + "/", CLIENTS[key]);
  }

  function jobPlace(ed) {
    const cat = catOf(ed.job);
    return { discipline: cat ? cat.label : "Scratch", project: ed.job ? ed.job.brief.project : "Sketchpad" };
  }
  // In a browser tab there is no project folder: fall back to a download.
  function download(name, href) {
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  async function saveDoc(ed) {
    flushAutosave(ed);
    const text = D.serialize(ed.doc);
    const res = await Bridge.suiteSave({ ...jobPlace(ed), slot: "02-process", name: ed.doc.meta.name, text });
    if (res && res.ok) setStatus(ed, "Saved " + res.name + " to 02-process.");
    else if (!Bridge.native) { download(ed.doc.meta.name + ".pxdoc", URL.createObjectURL(new Blob([text], { type: "application/json" }))); setStatus(ed, "Downloaded " + ed.doc.meta.name + ".pxdoc"); }
    else setStatus(ed, "Save failed: " + (res && res.error));
    sound("press");
  }
  async function exportPNG(ed, scale) {
    const dataURL = R.toPNG(ed.doc, scale);
    const name = ed.doc.meta.name + (scale && scale !== 1 ? "@" + scale + "x" : "");
    const res = await Bridge.suiteSave({ ...jobPlace(ed), slot: "04-final", name, dataURL });
    if (res && res.ok) setStatus(ed, "Exported " + res.name + " to 04-final" + (slot() === "studio" ? " — ready to attach to a reply." : "."));
    else if (!Bridge.native) { download(name + ".png", dataURL); setStatus(ed, "Downloaded " + name + ".png"); }
    else setStatus(ed, "Export failed: " + (res && res.error));
    sound("press");
  }
  async function openFromDisk(win) {
    const res = await Bridge.suiteOpen();
    if (!res || !res.ok) { if (res && res.error && !res.canceled) alertBox("Could not open", res.error); return; }
    const doc = D.parse(res.text);
    if (!doc) { alertBox("Could not open", res.name + " is not a suite document."); return; }
    const mode = doc.mode === "pixel" ? "pixel" : doc.mode === "layout" ? "layout" : "vector";
    switchMode(win, mode);
    replaceDoc(win.eds[mode], doc);
    if (win.eds[mode].st) { win.eds[mode].st.fit(doc); win.eds[mode].draw(); }
    paintTop(win);
    setStatus(win.eds[mode], "Opened " + res.name + ". Undo brings back what was here.");
  }

  function deliver(ed, confirmed) {
    if (ed.unmount) ed.unmount();
    flushAutosave(ed);
    const warnings = !confirmed && Hustle.preflight ? Hustle.preflight(ed.job.id, ed.doc) : [];
    if (warnings.length) { confirmBox("Before you send it", warnings.join(" "), "Deliver anyway", () => deliver(ed, true)); return; }
    const res = Hustle.deliver(ed.job.id, JSON.parse(JSON.stringify(ed.doc)), ed.appId);
    if (res && !res.ok) setStatus(ed, res.reason);
  }
  function confirmBox(title, text, okLabel, onOK) {
    const w = createWindow({ key: "suite-confirm-" + Date.now(), title, iconId: "suite", w: 380, h: 190, minW: 300, minH: 160 });
    w.client.innerHTML = '<p class="su__alert"></p><p class="su__row"><button class="w98btn" data-ok></button><button class="w98btn" data-no>Go back</button></p>';
    w.client.querySelector(".su__alert").textContent = text;
    w.client.querySelector("[data-ok]").textContent = okLabel;
    w.client.querySelector("[data-ok]").addEventListener("click", () => { closeWin(w); onOK(); });
    w.client.querySelector("[data-no]").addEventListener("click", () => closeWin(w));
  }
  function alertBox(title, text) {
    const w = createWindow({ key: "suite-alert-" + Date.now(), title, iconId: "suite", w: 340, h: 170, minW: 280, minH: 150 });
    w.client.innerHTML = '<p class="su__alert"></p><p><button class="w98btn" data-ok>OK</button></p>';
    w.client.querySelector(".su__alert").textContent = text;
    w.client.querySelector("[data-ok]").addEventListener("click", () => closeWin(w));
  }

  /* ── keyboard ─────────────────────────────────────────── */
  const activeSuite = () => (typeof activeWin !== "undefined" && activeWin ? wins.get(activeWin.key) : null);
  function onKey(e) {
    const win = activeSuite();
    if (!win) return;
    const ed = win.eds[win.mode];
    if (!ed) return;
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); undo(ed, e.shiftKey); return; }
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveDoc(ed); return; }
    if (mod && (e.key === "=" || e.key === "+" || e.key === "-") && ed.st) { e.preventDefault(); ed.st.step(e.key === "-" ? -1 : 1); return; }
    if (mod && e.key === "0" && ed.st) { e.preventDefault(); ed.st.fit(ed.doc); ed.draw(); paintZoom(win); return; }
    if (ed.key && ed.key(e)) e.preventDefault();
  }
  // Escape inside a suite window steps back (a drawer, the pen, the
  // selection); it must not also throw you back across to the world, which is
  // what app.js does with Escape everywhere else.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const win = activeSuite();
    if (!win) return;
    e.stopImmediatePropagation();
    if (win.swatchPick) { win.swatchPick = false; win.drawers.repaint("swatch"); return; }
    const ed = win.eds[win.mode];
    if (ed && ed.escape && ed.escape()) return;
    const open = ["cutout", "swatch", "cards"].filter((id) => win.drawers.isOpen(id));
    if (open.length && open[0] !== "cards") win.drawers.close(open[0]);
  }, true);

  function unlock(name) {
    if (!A.BONUS[name] || S().unlocks.includes(name)) return false;
    S().unlocks.push(name);
    save();
    wins.forEach((win) => Object.values(win.eds).forEach((ed) => { ed.bonus = A.bonusForMode(ed.mode, slot(), S().unlocks); }));
    return true;
  }

  // The most recently edited document for a job, from whichever mode made it.
  function docFor(jobId, preferApp) {
    wins.forEach((win) => Object.values(win.eds).forEach((ed) => { if (ed.job && ed.job.id === jobId) flushAutosave(ed); }));
    const touched = S().touched || {};
    const keys = Object.keys(S().docs).filter((k) => k.slice(k.indexOf(":") + 1) === jobId);
    keys.sort((a, b) => (touched[b] || 0) - (touched[a] || 0) || (b.startsWith(preferApp + ":") ? 1 : 0) - (a.startsWith(preferApp + ":") ? 1 : 0));
    return keys.length ? { appId: keys[0].split(":")[0], doc: D.normalize(S().docs[keys[0]]) } : null;
  }

  return {
    boot, launcher, open, addCards, unlock, docFor,
    cards: () => S().cards.slice(),
    cutoutFrom: (initial, jobId) => {
      const w = launcher(jobId);
      const win = w && winOf(w);
      if (!win) return w;
      win.drawers.open("cutout");
      loadCut(win, initial.src, initial.label, initial.tags, "found");
      return w;
    },
    unlocks: () => S().unlocks.slice(),
    // For checking by script: each open suite window, its mode, and its editors.
    peek: () => [...wins.values()].map((w) => ({ key: w.key, mode: w.mode, win: w, ed: w.eds[w.mode] })),
  };
})();
