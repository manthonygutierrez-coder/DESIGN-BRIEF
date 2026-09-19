"use strict";
/* ── the design suite ─────────────────────────────────────
 * A launcher, three editors (free canvas, pixel canvas, page layout) and two
 * utilities (Swatch, Cutout), all as ordinary Win98 windows from wm.js.
 *
 * State lives in the active save slot under `state.suite`:
 *   cards    every card in the tray
 *   docs     autosaved documents, keyed "<app>:<job>"
 *   unlocks  bonus tools earned (Hustle only — Studio has them all)
 *   swatch   the Swatch app's working palette
 */

const Suite = (() => {
  const D = SuiteDoc, R = SuiteRender, C = SuiteCards, A = SuiteApps, X = SuiteCutout, Sh = SuiteShapes;
  const SHAPES = ["rect", "ellipse", "path"];
  const FONTS = ["Archivo", "Instrument Serif", "Silkscreen", "VT323", "Georgia", "Helvetica Neue", "Courier New", "Times New Roman"];
  const AUTOSAVE_MAX = 3 * 1024 * 1024;
  // wm.js's esc() leaves quotes alone; card labels land inside attributes here,
  // and cards will come from outside the app, so this one escapes quotes too.
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  let state = null;
  const editors = new Map();        // window key -> editor
  let lastEditor = null;            // the Swatch app applies palettes here

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
    };
    document.addEventListener("keydown", onKey);
    S().cards.forEach(registerPicture);
    R.onImageReady(() => editors.forEach((ed) => ed.draw && ed.draw()));
  }
  const S = () => state.suite;
  const save = () => Bridge.saveState(state);
  const slot = () => Bridge.slot();

  /* ── jobs: what the work is for ────────────────────────── */
  // Studio jobs are briefs in the mailbox; Hustle jobs are gigs in progress.
  function jobs() {
    if (slot() === "hustle") return typeof Hustle !== "undefined" ? Hustle.jobs() : [];
    return typeof Mail !== "undefined" && Mail.jobs ? Mail.jobs() : [];
  }
  const jobById = (id) => jobs().find((j) => j.id === id) || null;
  const catOf = (job) => (job ? CATS[job.ci] : null);

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
    refreshTrays();
    return n;
  }
  function removeCard(id) {
    S().cards = S().cards.filter((c) => c.id !== id);
    save();
    refreshTrays();
  }
  const cardById = (id) => S().cards.find((c) => c.id === id) || null;

  function clientKit(job) {
    const client = job && job.client ? job.client
      : Object.values(CLIENTS)[Math.floor(Math.random() * Object.values(CLIENTS).length)];
    return C.debugPack(client, (ref) => Imagery.make(ref, 1, 320, 240));
  }

  // Which cards an app can use at all. Others still show, dimmed.
  function usable(app, c) {
    if (app.mode === "pixel") return c.kind === "colour" || C.INTENT.includes(c.kind);
    if (app.mode === "layout") return c.kind !== "shape";
    return true;
  }

  function cardChip(c, app) {
    let face;
    if (c.kind === "colour") face = '<span class="cd__sw" style="background:' + c.value + '"></span>';
    else if (c.kind === "object") face = '<img class="cd__img" src="' + c.value + '" alt="">';
    else if (c.kind === "type") face = '<span class="cd__aa" style="font-family:\'' + esc(c.value).replace(/'/g, "") + '\'">Aa</span>';
    else if (c.kind === "shape") face = '<svg class="cd__shape" viewBox="0 0 64 64"><path d="' + esc(c.value) + '"/></svg>';
    else face = '<span class="cd__txt">' + c.kind.toUpperCase() + "</span>";
    const dim = app && !usable(app, c) ? " dim" : "";
    return '<div class="cd cd--' + c.kind + dim + '" draggable="true" data-card="' + esc(c.id) + '" title="' +
      esc(c.label + " — " + (c.kind === "object" ? "image" : c.value)) + '">' + face +
      '<span class="cd__l">' + esc(c.label) + '</span><button class="cd__x" data-uncard="' + esc(c.id) + '" aria-label="Remove card">×</button>' +
      (c.kind === "object" && typeof RefBoard !== "undefined" ? '<button class="cd__pin" data-pincard="' + esc(c.id) + '" title="Pin to the reference board">PIN</button>' : "") + "</div>";
  }

  function trayHTML() {
    return '<div class="su__tray"><div class="su__trayhead"><b>CARDS</b><span class="su__trayn"></span>' +
      '<span class="ml__spacer"></span><button class="w98btn su__sm" data-s="kit">Client kit</button></div>' +
      '<div class="su__cards"></div></div>';
  }

  function paintTray(root, app, job) {
    const list = root.querySelector(".su__cards");
    if (!list) return;
    const cards = S().cards;
    root.querySelector(".su__trayn").textContent = "(" + cards.length + ")";
    const kit = root.querySelector('[data-s="kit"]');
    // In Hustle, research is how cards are earned; a free kit would skip the game.
    if (kit) { kit.hidden = slot() === "hustle"; kit.textContent = job && job.client ? "Client kit" : "Sample kit"; }
    list.innerHTML = cards.length ? cards.slice().reverse().map((c) => cardChip(c, app)).join("")
      : '<p class="su__empty">' + (slot() === "hustle" ? "No cards yet. Research a gig to find some: clip facts from sites, cut things out of pictures." : "No cards yet. Pull a client kit to start.") + "</p>";
  }

  function refreshTrays() {
    editors.forEach((ed) => ed.paintTray && ed.paintTray());
    const l = getWin("suite");
    if (l && l.meta.paint) l.meta.paint();
  }

  // Shared tray behaviour: drag, remove, kit.
  function wireTray(root, job, onClickCard) {
    root.addEventListener("dragstart", (e) => {
      const el = e.target.closest && e.target.closest("[data-card]");
      if (!el) return;
      e.dataTransfer.setData("text/x-pxcard", el.dataset.card);
      e.dataTransfer.effectAllowed = "copy";
    });
    root.addEventListener("click", (e) => {
      const pinB = e.target.closest("[data-pincard]");
      if (pinB) { e.stopPropagation(); const c = cardById(pinB.dataset.pincard); if (c) RefBoard.pin({ src: c.value, label: c.label }); return; }
      const x = e.target.closest("[data-uncard]");
      if (x) { e.stopPropagation(); removeCard(x.dataset.uncard); return; }
      if (e.target.closest('[data-s="kit"]')) { addCards(clientKit(job)); return; }
      const cd = e.target.closest("[data-card]");
      if (cd && onClickCard) onClickCard(cardById(cd.dataset.card));
    });
  }

  /* ── launcher ──────────────────────────────────────────── */
  function launcher(jobId) {
    let w = getWin("suite");
    if (!w) {
      w = createWindow({ key: "suite", title: "DESIGN SUITE", iconId: "suite", w: 560, h: 440, minW: 420, minH: 320 });
      w.client.classList.add("client--flush");
      w.meta.jobId = jobId || "";
      w.meta.paint = () => paintLauncher(w);
      w.client.addEventListener("change", (e) => {
        if (e.target.matches('[data-s="job"]')) { w.meta.jobId = e.target.value; paintLauncher(w); }
      });
      w.client.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-app],[data-s]");
        if (!b) return;
        if (b.dataset.app) open(b.dataset.app, w.meta.jobId || null);
        if (b.dataset.s === "open") openFromDisk(w.meta.jobId || null);
      });
    } else if (jobId !== undefined) {
      w.meta.jobId = jobId || "";
    }
    paintLauncher(w);
    return revealWin(w);
  }

  function paintLauncher(w) {
    const js = jobs();
    if (w.meta.jobId && !js.some((j) => j.id === w.meta.jobId)) w.meta.jobId = "";
    const job = jobById(w.meta.jobId);
    const cat = catOf(job);
    const ids = A.forDiscipline(cat && cat.id);
    const bonusN = slot() === "studio" ? "all" : S().unlocks.length;
    w.client.innerHTML =
      '<div class="su su--launch">' +
        '<div class="su__bar"><label class="su__lbl">WORK ON</label><select class="su__sel" data-s="job">' +
          '<option value="">Scratch — no brief</option>' +
          js.map((j) => '<option value="' + esc(j.id) + '"' + (j.id === w.meta.jobId ? " selected" : "") + ">" +
            esc(j.brief.project + " · " + CATS[j.ci].label) + "</option>").join("") +
        '</select><span class="ml__spacer"></span><button class="w98btn" data-s="open">Open document…</button></div>' +
        '<p class="su__note">' + (cat ? "Apps relevant to " + esc(pixelLabel(cat.label)) + "." : "Every app is available for scratch work.") + "</p>" +
        '<div class="su__apps">' + ids.map((id) => {
          const a = A.APPS[id];
          return '<button class="su__app" data-app="' + id + '"><i>' + iconSVG(a.icon, 34) + "</i><b>" + a.label +
            "</b><span>" + esc(a.blurb) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="su__foot">Cards in tray: ' + S().cards.length + " · Bonus tools: " + bonusN +
          (slot() === "hustle" ? " unlocked" : "") + "</div>" +
      "</div>";
    w.setTitle(job ? "DESIGN SUITE — " + job.brief.project : "DESIGN SUITE");
  }

  async function openFromDisk(jobId) {
    const res = await Bridge.suiteOpen();
    if (!res || !res.ok) {
      if (res && res.error && !res.canceled) alertBox("Could not open", res.error);
      return;
    }
    const doc = D.parse(res.text);
    if (!doc) { alertBox("Could not open", res.name + " is not a suite document."); return; }
    const appId = doc.mode === "pixel" ? "pixel" : doc.mode === "layout" ? "layout" : "banner";
    open(appId, jobId, doc);
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

  /* ── opening an app ───────────────────────────────────── */
  function open(appId, jobId, doc) {
    const app = A.APPS[appId];
    if (!app) return null;
    const job = jobById(jobId);
    const cat = catOf(job);
    if (!A.relevant(appId, cat && cat.id)) {
      alertBox("Not for this job", app.label + " is not part of a " + cat.label + " brief.");
      return null;
    }
    if (appId === "swatch") return openSwatch(job);
    if (appId === "cutout") return openCutout(job);

    const key = "suite:" + appId + ":" + (job ? job.id : "scratch");
    const existing = getWin(key);
    if (existing && !doc) return revealWin(existing);
    if (existing) closeWin(existing);

    const docKey = appId + ":" + (job ? job.id : "scratch");
    let d = doc || D.normalize(S().docs[docKey]);
    if (!d) {
      const [, pw, ph] = app.presets[0];
      d = D.create({ mode: app.mode, w: pw, h: ph, name: job ? job.brief.project : app.label + " sketch", briefId: job ? job.id : null,
        site: app.mode === "layout" ? { tagline: job ? job.client && job.client.site && job.client.site.tagline : "" } : undefined });
    }

    const ed = {
      key, docKey, appId, app, job, doc: d, hist: D.history(), sel: null,
      tool: app.tools[0] || null, zoom: 1, fg: app.mode === "free" ? (d.palette[0] || "#E0442B") : "#0A0A0A", mirror: false, snap: false, gradient: false,
      bonus: A.bonusFor(appId, slot(), S().unlocks), pen: [], blockSel: -1, pre: null, status: "",
    };
    const title = app.label.toUpperCase() + " — " + (job ? job.brief.project : "SCRATCH");
    ed.w = createWindow({
      key, title, iconId: app.icon, w: app.mode === "layout" ? 980 : 940, h: 640, minW: 640, minH: 440,
      className: "w98--suite", onClose: () => { flushAutosave(ed); editors.delete(key); if (lastEditor === ed) lastEditor = null; },
    });
    ed.w.client.classList.add("client--flush");
    editors.set(key, ed);
    lastEditor = ed;
    ed.w.el.addEventListener("pointerdown", () => { lastEditor = ed; }, true);

    if (app.mode === "layout") mountLayout(ed); else mountCanvas(ed);
    return ed.w;
  }

  /* ── shared editor plumbing ───────────────────────────── */
  let autosaveTimer = 0;
  function changed(ed, opts = {}) {
    ed.dirty = true;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => flushAutosave(ed), 700);
    if (!opts.quiet) ed.render && ed.render(opts);
  }
  function flushAutosave(ed) {
    if (!ed.dirty) return;
    const text = JSON.stringify(ed.doc);
    if (text.length > AUTOSAVE_MAX) { setStatus(ed, "Too large to autosave — use Save to keep it."); return; }
    S().docs[ed.docKey] = JSON.parse(text);
    S().touched = S().touched && typeof S().touched === "object" ? S().touched : {};
    S().touched[ed.docKey] = Date.now();
    ed.dirty = false;
    save();
  }

  // Run a change as one undo step, recorded only if something actually changed.
  function mutate(ed, fn, opts) {
    const pre = JSON.stringify(ed.doc);
    const out = fn();
    if (JSON.stringify(ed.doc) !== pre) { ed.hist.record(pre); changed(ed, opts); }
    return out;
  }

  function undo(ed, redo) {
    const next = redo ? ed.hist.redo(ed.doc) : ed.hist.undo(ed.doc);
    if (!next) return;
    ed.doc = next;
    if (ed.sel && !D.find(ed.doc, ed.sel)) ed.sel = null;
    if (ed.blockSel >= ed.doc.blocks.length) ed.blockSel = ed.doc.blocks.length - 1;
    changed(ed, { panels: true });
  }

  function setStatus(ed, text) {
    ed.status = text;
    const el = ed.w.client.querySelector(".su__status");
    if (el) el.textContent = text;
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
  }

  async function exportPNG(ed, scale) {
    const dataURL = R.toPNG(ed.doc, scale);
    const name = ed.doc.meta.name + (scale && scale !== 1 ? "@" + scale + "x" : "");
    const res = await Bridge.suiteSave({ ...jobPlace(ed), slot: "04-final", name, dataURL });
    if (res && res.ok) setStatus(ed, "Exported " + res.name + " to 04-final" + (slot() === "studio" ? " — ready to attach to a reply." : "."));
    else if (!Bridge.native) { download(name + ".png", dataURL); setStatus(ed, "Downloaded " + name + ".png"); }
    else setStatus(ed, "Export failed: " + (res && res.error));
  }

  /* ── canvas editors (free + pixel) ────────────────────── */
  function mountCanvas(ed) {
    const { app } = ed;
    const pixel = app.mode === "pixel";
    const tools = app.tools.slice();
    ed.w.client.innerHTML =
      '<div class="su' + (pixel ? " su--pixel" : "") + '">' +
        '<div class="su__bar">' +
          '<select class="su__sel" data-s="preset" title="New document size">' +
            app.presets.map(([n, pw, ph], i) => '<option value="' + i + '">' + esc(n) + " · " + pw + "×" + ph + "</option>").join("") +
          '</select><button class="w98btn" data-s="new">New</button>' +
          '<span class="su__sep"></span>' +
          '<button class="w98btn" data-s="undo">Undo</button><button class="w98btn" data-s="redo">Redo</button>' +
          '<span class="su__sep"></span>' +
          '<button class="w98btn su__sm" data-s="zout">−</button><span class="su__zoom"></span><button class="w98btn su__sm" data-s="zin">+</button>' +
          '<button class="w98btn" data-s="fit">Fit</button>' +
          '<span class="ml__spacer"></span>' +
          '<input class="su__name" data-s="name" maxlength="80" title="Document name">' +
          '<button class="w98btn" data-s="save">Save</button>' +
          (pixel ? '<select class="su__sel" data-s="xscale" title="Export scale">' + [1, 2, 4, 8, 16].map((s) => '<option value="' + s + '"' + (s === 8 ? " selected" : "") + ">" + s + "×</option>").join("") + "</select>" : "") +
          '<button class="w98btn" data-s="export">Export PNG</button>' +
          deliverButton(ed) +
        "</div>" +
        '<div class="su__body">' +
          '<div class="su__tools">' +
            tools.map((t) => '<button class="su__tool" data-tool="' + t + '" title="' + esc(A.TOOLS[t].label + " (" + A.TOOLS[t].key.toUpperCase() + ")") + '">' + iconSVG("t-" + t, 20) + "</button>").join("") +
            '<input type="color" class="su__fg" data-s="fg" title="Current colour — new shapes, the pen and the shape builder use it">' +
            ed.bonus.filter((b) => ["snap", "mirror", "gradient"].includes(b)).map((b) =>
              '<label class="su__bonus" title="' + esc(A.BONUS[b]) + '"><input type="checkbox" data-bonus="' + b + '">' + b.toUpperCase() + "</label>").join("") +
          "</div>" +
          '<div class="su__stage"><div class="su__pad"><canvas class="su__cv"></canvas></div></div>' +
          '<div class="su__side">' +
            (pixel ? "" : '<div class="su__panel"><div class="su__ph">PROPERTIES</div><div class="su__props"></div></div>' +
              '<div class="su__panel su__panel--grow"><div class="su__ph">LAYERS</div><div class="su__layers"></div></div>') +
            '<div class="su__panel"><div class="su__ph">PALETTE</div><div class="su__pal"></div></div>' +
          "</div>" +
        "</div>" +
        trayHTML() +
        '<div class="su__status"></div>' +
      "</div>" +
      '<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="su__file" hidden>';

    const root = ed.w.client;
    ed.cv = root.querySelector(".su__cv");
    ed.stage = root.querySelector(".su__stage");
    root.querySelector('[data-s="name"]').value = ed.doc.meta.name;

    ed.draw = () => drawCanvas(ed);
    ed.paintTray = () => paintTray(root, app, ed.job);
    ed.render = (opts = {}) => {
      ed.draw();
      if (!pixel) { if (opts.panels !== false) { paintProps(ed); paintLayers(ed); } }
      paintPalette(ed);
      root.querySelector('[data-s="undo"]').disabled = !ed.hist.canUndo();
      root.querySelector('[data-s="redo"]').disabled = !ed.hist.canRedo();
      root.querySelector(".su__zoom").textContent = Math.round(ed.zoom * 100) + "%";
      root.querySelectorAll("[data-tool]").forEach((b) => b.classList.toggle("on", b.dataset.tool === ed.tool));
    };

    root.addEventListener("click", (e) => onCanvasBar(ed, e));
    root.addEventListener("change", (e) => onCanvasChange(ed, e));
    root.addEventListener("input", (e) => onCanvasInput(ed, e));
    root.addEventListener("focusin", (e) => { if (e.target.closest(".su__props")) ed.pre = JSON.stringify(ed.doc); });
    root.querySelector(".su__file").addEventListener("change", (e) => placeFile(ed, e.target));
    wireTray(root, ed.job, (c) => dropCard(ed, c, null));
    wirePointer(ed);

    ed.stage.addEventListener("dragover", (e) => {
      const t = e.dataTransfer.types;
      if (t.includes("text/x-pxcard") || t.includes("text/x-pxpin")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
    });
    ed.stage.addEventListener("drop", (e) => {
      const pin = e.dataTransfer.getData("text/x-pxpin");
      if (pin) { e.preventDefault(); dropPin(ed, pin, docPoint(ed, e)); return; }
      const id = e.dataTransfer.getData("text/x-pxcard");
      if (!id) return;
      e.preventDefault();
      dropCard(ed, cardById(id), docPoint(ed, e), e.shiftKey);
    });

    // Fit once the window has laid out.
    requestAnimationFrame(() => { fit(ed); ed.render(); ed.paintTray(); syncFg(ed); setStatus(ed, statusHint(ed)); });
    if (typeof ResizeObserver !== "undefined") {
      let last = 0;
      new ResizeObserver(() => { const n = ed.stage.clientWidth + ed.stage.clientHeight; if (Math.abs(n - last) > 40 && last) ed.draw(); last = n; }).observe(ed.stage);
    }
  }

  // An official pin dropped on the canvas marks where you drew that character:
  // a labelled box, sized to the pose's proportions, and nothing else.
  function dropPin(ed, pinId, at) {
    const pin = typeof RefBoard !== "undefined" ? RefBoard.get(pinId) : null;
    if (!pin) return;
    if (ed.app.mode !== "free") { setStatus(ed, "Subjects are marked on a Banner or Type canvas."); return; }
    if (!pin.char || typeof Characters === "undefined" || !Characters.has(pin.char, pin.pose)) {
      setStatus(ed, "That pin is just for looking at. Only official art marks who you drew.");
      return;
    }
    const ref = Characters.reference(pin.char, pin.pose);
    const h = Math.round(Math.min(ed.doc.h * 0.92, 260)), w = Math.max(8, Math.round(h * ref.w / ref.h));
    const first = Characters.CAST[pin.char].name.split(" ")[0];
    mutate(ed, () => {
      const l = D.add(ed.doc, D.layer("subject", {
        name: "Subject: " + first + " (" + pin.pose + ")", label: first + " — " + pin.pose,
        ref: { id: pin.char, pose: pin.pose },
        x: Math.round(at.x - w / 2), y: Math.round(Math.max(0, Math.min(ed.doc.h - h, at.y - h / 2))), w, h,
      }));
      if (l) ed.sel = l.id;
    });
    ed.render();
    setStatus(ed, "Marked where you're drawing " + first + ". Draw him inside the box, by eye. The box is never exported.");
  }

  function deliverButton(ed) {
    return slot() === "hustle" && ed.job ? '<button class="w98btn su__deliver" data-s="deliver">Deliver…</button>' : "";
  }

  function deliver(ed, confirmed) {
    flushAutosave(ed);
    const warnings = !confirmed && Hustle.preflight ? Hustle.preflight(ed.job.id, ed.doc) : [];
    if (warnings.length) {
      confirmBox("Before you send it", warnings.join(" "), "Deliver anyway", () => deliver(ed, true));
      return;
    }
    const res = Hustle.deliver(ed.job.id, JSON.parse(JSON.stringify(ed.doc)), ed.appId);
    if (res && !res.ok) setStatus(ed, res.reason);
  }

  function statusHint(ed) {
    return ed.app.mode === "pixel"
      ? "Draw at true resolution. Exports scale by whole numbers only, so pixels stay hard."
      : "Drag cards from the tray onto the canvas or onto a layer. Shift-drop a colour to set the stroke.";
  }

  function fit(ed) {
    const sw = Math.max(100, ed.stage.clientWidth - 40), sh = Math.max(100, ed.stage.clientHeight - 40);
    let z = Math.min(sw / ed.doc.w, sh / ed.doc.h);
    if (ed.app.mode === "pixel") z = Math.max(1, Math.floor(z));   // whole pixels only
    else z = Math.max(0.05, Math.min(4, Math.floor(z * 100) / 100));
    ed.zoom = z;
  }

  function zoomBy(ed, dir) {
    if (ed.app.mode === "pixel") ed.zoom = Math.max(1, Math.min(48, ed.zoom + dir * Math.max(1, Math.round(ed.zoom / 4))));
    else {
      const steps = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4];
      const i = steps.findIndex((s) => s >= ed.zoom - 0.001);
      ed.zoom = steps[Math.max(0, Math.min(steps.length - 1, (i < 0 ? steps.length - 1 : i) + dir))];
    }
    ed.render({ panels: false });
  }

  function drawCanvas(ed) {
    const { doc, cv } = ed;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(doc.w * ed.zoom), ch = Math.round(doc.h * ed.zoom);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      cv.style.width = cw + "px"; cv.style.height = ch + "px";
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = doc.mode !== "pixel";
    R.draw(ctx, doc, { scale: ed.zoom * dpr, editor: true, zoom: ed.zoom });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (doc.mode === "pixel") {
      if (ed.zoom >= 6) {
        ctx.strokeStyle = "rgba(0,0,0,.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 1; x < doc.w; x++) { ctx.moveTo(x * ed.zoom + 0.5, 0); ctx.lineTo(x * ed.zoom + 0.5, ch); }
        for (let y = 1; y < doc.h; y++) { ctx.moveTo(0, y * ed.zoom + 0.5); ctx.lineTo(cw, y * ed.zoom + 0.5); }
        ctx.stroke();
      }
      if (ed.mirror) { ctx.strokeStyle = "rgba(16,132,208,.8)"; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke(); ctx.setLineDash([]); }
      return;
    }

    const l = ed.sel && D.find(doc, ed.sel);
    if (l) {
      const z = ed.zoom;
      ctx.save();
      ctx.translate((l.x + l.w / 2) * z, (l.y + l.h / 2) * z);
      ctx.rotate((l.rot || 0) * Math.PI / 180);
      ctx.translate(-l.w / 2 * z, -l.h / 2 * z);
      ctx.strokeStyle = "#1084D0"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
      ctx.strokeRect(-0.5, -0.5, l.w * z + 1, l.h * z + 1);
      ctx.setLineDash([]);
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#000080";
      const hs = 7;
      ctx.fillRect(l.w * z - hs / 2, l.h * z - hs / 2, hs, hs); ctx.strokeRect(l.w * z - hs / 2, l.h * z - hs / 2, hs, hs);
      ctx.beginPath(); ctx.moveTo(l.w * z / 2, 0); ctx.lineTo(l.w * z / 2, -16); ctx.stroke();
      ctx.beginPath(); ctx.arc(l.w * z / 2, -18, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (ed.buildPath && ed.buildPath.length > 1) {
      ctx.strokeStyle = "#FF5FA8"; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ed.buildPath.forEach((p, i) => (i ? ctx.lineTo(p.x * ed.zoom, p.y * ed.zoom) : ctx.moveTo(p.x * ed.zoom, p.y * ed.zoom)));
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (ed.pen.length) {
      ctx.strokeStyle = "#1084D0"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ed.pen.forEach((p, i) => (i ? ctx.lineTo(p.x * ed.zoom, p.y * ed.zoom) : ctx.moveTo(p.x * ed.zoom, p.y * ed.zoom)));
      ctx.stroke();
      ed.pen.forEach((p) => ctx.strokeRect(p.x * ed.zoom - 3, p.y * ed.zoom - 3, 6, 6));
    }
  }

  function docPoint(ed, e) {
    const r = ed.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / ed.zoom, y: (e.clientY - r.top) / ed.zoom };
  }

  /* pointer tools */
  function wirePointer(ed) {
    const cv = ed.cv;
    let drag = null;

    cv.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const p = docPoint(ed, e);
      const doc = ed.doc;
      cv.setPointerCapture(e.pointerId);

      if (doc.mode === "pixel") {
        const x = Math.floor(p.x), y = Math.floor(p.y);
        if (ed.tool === "pick") {
          const c = D.getPx(doc, x, y);
          if (c) { ed.fg = c; syncFg(ed); setStatus(ed, "Picked " + c); }
          return;
        }
        const pre = JSON.stringify(doc);
        if (ed.tool === "fill") { D.fill(doc, x, y, ed.fg); if (ed.mirror) D.fill(doc, doc.w - 1 - x, y, ed.fg); }
        else D.line(doc, x, y, x, y, ed.tool === "erase" ? "" : ed.fg, ed.mirror);
        drag = { mode: "paint", pre, last: { x, y } };
        ed.draw();
        return;
      }

      if (ed.tool === "select") {
        const l = ed.sel && D.find(doc, ed.sel);
        if (l) {
          const loc = D.toLocal(l, p.x, p.y), tol = 7 / ed.zoom;
          if (Math.abs(loc.x - l.w) < tol && Math.abs(loc.y - l.h) < tol) {
            drag = { mode: "resize", pre: JSON.stringify(doc), start: { ...l } };
            return;
          }
          if (Math.abs(loc.x - l.w / 2) < tol && Math.abs(loc.y + 18 / ed.zoom) < tol) {
            drag = { mode: "rotate", pre: JSON.stringify(doc) };
            return;
          }
        }
        const hit = D.hitTest(doc, p.x, p.y);
        ed.sel = hit ? hit.id : null;
        if (hit) drag = { mode: "move", pre: JSON.stringify(doc), from: p, start: { x: hit.x, y: hit.y } };
        ed.render();
        return;
      }

      if (ed.tool === "rect" || ed.tool === "ellipse") {
        const pre = JSON.stringify(doc);
        const fill = ed.fg || ed.doc.palette[0] || (ed.tool === "rect" ? "#E0442B" : "#1084D0");
        const l = D.add(doc, D.layer(ed.tool, { x: p.x, y: p.y, w: 1, h: 1, fill }));
        if (!l) return;
        ed.sel = l.id;
        drag = { mode: "create", pre, from: p };
        return;
      }

      if (ed.tool === "text") {
        mutate(ed, () => {
          const l = D.add(doc, D.layer("text", { x: Math.round(p.x), y: Math.round(p.y), text: "Type here", size: Math.max(12, Math.round(doc.h / 5)), fill: ed.doc.palette[0] || "#0A0A0A" }));
          if (l) { fitText(ed, l); ed.sel = l.id; }
        });
        ed.tool = "select";
        ed.render();
        const ta = ed.w.client.querySelector('.su__props [data-p="text"]');
        if (ta) { ta.focus(); ta.select(); }
        return;
      }

      if (ed.tool === "image") { ed.dropAt = p; ed.w.client.querySelector(".su__file").click(); return; }

      if (ed.tool === "eyedrop") {
        const c = sampleDoc(ed.doc, p.x, p.y);
        if (!c) return;
        mutate(ed, () => {
          if (ed.sel) D.update(doc, ed.sel, { fill: c });
          if (!doc.palette.includes(c) && doc.palette.length < 6) doc.palette.push(c);
        });
        setStatus(ed, "Sampled " + c + (ed.sel ? " into the selected layer" : " into the palette"));
        return;
      }

      if (ed.tool === "build") {
        drag = { mode: "build", pre: JSON.stringify(doc), cut: e.altKey, crossed: [] };
        ed.buildPath = [p];
        crossAt(ed, drag, p);
        ed.draw();
        return;
      }

      if (ed.tool === "pen") {
        const first = ed.pen[0];
        if (first && ed.pen.length > 2 && Math.hypot(first.x - p.x, first.y - p.y) < 8 / ed.zoom) { finishPen(ed); return; }
        ed.pen.push({ x: p.x, y: p.y });
        ed.draw();
      }
    });

    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = docPoint(ed, e);
      const doc = ed.doc;
      if (drag.mode === "build") {
        const last = ed.buildPath[ed.buildPath.length - 1];
        // sample along the stroke so a fast drag cannot skip a thin shape
        const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 2));
        for (let i = 1; i <= steps; i++) crossAt(ed, drag, { x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps });
        ed.buildPath.push(p);
        ed.draw();
        return;
      }
      const grid = ed.snap ? 10 : 0;

      if (drag.mode === "paint") {
        const x = Math.floor(p.x), y = Math.floor(p.y);
        if (ed.tool === "fill") return;
        D.line(doc, drag.last.x, drag.last.y, x, y, ed.tool === "erase" ? "" : ed.fg, ed.mirror);
        drag.last = { x, y };
        ed.draw();
        return;
      }
      const l = ed.sel && D.find(doc, ed.sel);
      if (!l) return;
      if (drag.mode === "move") {
        l.x = D.snap(Math.round(drag.start.x + p.x - drag.from.x), grid);
        l.y = D.snap(Math.round(drag.start.y + p.y - drag.from.y), grid);
      } else if (drag.mode === "create") {
        const x0 = Math.min(drag.from.x, p.x), y0 = Math.min(drag.from.y, p.y);
        let w = Math.abs(p.x - drag.from.x), h = Math.abs(p.y - drag.from.y);
        if (e.shiftKey) w = h = Math.max(w, h);
        Object.assign(l, { x: D.snap(Math.round(x0), grid), y: D.snap(Math.round(y0), grid), w: Math.max(1, D.snap(Math.round(w), grid)), h: Math.max(1, D.snap(Math.round(h), grid)) });
      } else if (drag.mode === "resize") {
        // Resize in the layer's own frame, keeping its top-left corner fixed.
        const s = drag.start;
        const loc = D.toLocal(s, p.x, p.y);
        let w = Math.max(4, loc.x), h = Math.max(4, loc.y);
        if (e.shiftKey || l.type === "text") { const k = Math.max(w / s.w, h / s.h); w = s.w * k; h = s.h * k; }
        const a = (s.rot || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
        // top-left in world space stays put
        const tlx = s.x + s.w / 2 - (s.w / 2) * cos + (s.h / 2) * sin;
        const tly = s.y + s.h / 2 - (s.w / 2) * sin - (s.h / 2) * cos;
        const cx = tlx + (w / 2) * cos - (h / 2) * sin, cy = tly + (w / 2) * sin + (h / 2) * cos;
        Object.assign(l, { w: Math.round(w), h: Math.round(h), x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) });
        if (l.type === "text") l.size = Math.max(4, Math.round(s.size * w / s.w));
      } else if (drag.mode === "rotate") {
        let deg = Math.atan2(p.y - (l.y + l.h / 2), p.x - (l.x + l.w / 2)) * 180 / Math.PI + 90;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        l.rot = Math.round(((deg + 540) % 360) - 180);
      }
      ed.draw();
    });

    const end = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.mode === "build") {
        ed.buildPath = null;
        buildShapes(ed, d.crossed, d.cut);
        return;
      }
      if (d.mode === "create") {
        const l = ed.sel && D.find(ed.doc, ed.sel);
        if (l && l.w < 4 && l.h < 4) Object.assign(l, { w: 120, h: 80 });
        ed.tool = "select";
      }
      if (ed.doc.mode !== "pixel") {
        const l = ed.sel && D.find(ed.doc, ed.sel);
        if (l) D.update(ed.doc, l.id, {});   // re-sanitise after direct edits
      }
      if (JSON.stringify(ed.doc) !== d.pre) { ed.hist.record(d.pre); changed(ed); }
      else ed.render();
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("dblclick", () => { if (ed.tool === "pen" && ed.pen.length > 2) finishPen(ed); });
  }

  // The topmost shape under a point, for the shape builder's stroke.
  function crossAt(ed, drag, p) {
    for (let i = ed.doc.layers.length - 1; i >= 0; i--) {
      const l = ed.doc.layers[i];
      if (l.hidden || l.locked || !SHAPES.includes(l.type)) continue;
      if (D.contains(l, p.x, p.y)) { if (!drag.crossed.includes(l.id)) drag.crossed.push(l.id); return; }
    }
  }

  /* Merge: every shape the stroke crossed becomes one path. Cut (alt): the
   * topmost crossed shape is punched out of the others. Both work on masks at
   * twice the document's resolution, then trace back to vector paths that
   * keep their holes. */
  function buildShapes(ed, ids, cut) {
    const doc = ed.doc;
    const layers = ids.map((id) => D.find(doc, id)).filter(Boolean);
    if (layers.length < 2) {
      ed.draw();
      setStatus(ed, cut ? "Alt-drag from a shape across the ones it should cut." : "Drag across two or more overlapping shapes to merge them.");
      return;
    }
    const S = 2;
    let bx = Infinity, by = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const l of layers) {
      const a = (l.rot || 0) * Math.PI / 180, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = cx + (dx * l.w / 2) * Math.cos(a) - (dy * l.h / 2) * Math.sin(a);
        const y = cy + (dx * l.w / 2) * Math.sin(a) + (dy * l.h / 2) * Math.cos(a);
        bx = Math.min(bx, x); by = Math.min(by, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
      }
    }
    bx = Math.floor(bx) - 1; by = Math.floor(by) - 1;
    const bw = Math.ceil(bx1) + 1 - bx, bh = Math.ceil(by1) + 1 - by;
    const maskOf = (l) => R.layerMask(l, bw, bh, S, bx, by);
    const toLayer = (mask, w, h, like, name) => {
      const loops = Sh.contours(mask, w, h).map((l) => Sh.simplify(l, 0.6)).filter((l) => l.length >= 3);
      if (!loops.length) return null;
      const tp = Sh.toPath(loops, 64);
      return D.layer("path", {
        name, d: tp.d, box: 64, fillRule: "evenodd",
        x: Math.round((bx + tp.bounds.x / S) * 100) / 100, y: Math.round((by + tp.bounds.y / S) * 100) / 100,
        w: Math.max(1, tp.bounds.w / S), h: Math.max(1, tp.bounds.h / S),
        fill: like.fill, stroke: like.stroke, strokeW: like.strokeW, opacity: like.opacity, card: like.card,
      });
    };
    mutate(ed, () => {
      if (!cut) {
        const ms = layers.map(maskOf);
        const merged = ms.slice(1).reduce((m, x) => Sh.union(m, x.mask), ms[0].mask);
        const at = Math.min(...layers.map((l) => doc.layers.indexOf(l)));
        const made = toLayer(merged, ms[0].w, ms[0].h, layers[0], "Merged shape");
        if (!made) return;
        doc.layers = doc.layers.filter((l) => !ids.includes(l.id));
        doc.layers.splice(Math.min(at, doc.layers.length), 0, made);
        ed.sel = made.id;
      } else {
        const top = layers.reduce((a, b) => (doc.layers.indexOf(b) > doc.layers.indexOf(a) ? b : a));
        const knife = maskOf(top);
        for (const l of layers) {
          if (l === top) continue;
          const m = maskOf(l);
          const left = Sh.cut(m.mask, knife.mask);
          const i = doc.layers.indexOf(l);
          const made = Sh.count(left) ? toLayer(left, m.w, m.h, l, l.name) : null;
          if (made) doc.layers.splice(i, 1, made); else doc.layers.splice(i, 1);
        }
        doc.layers = doc.layers.filter((l) => l !== top);
        ed.sel = null;
      }
    });
    ed.render();
    setStatus(ed, cut ? "Cut." : "Merged " + layers.length + " shapes into one.");
  }

  function finishPen(ed) {
    const pts = ed.pen;
    ed.pen = [];
    if (pts.length < 3) { ed.draw(); return; }
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const bw = Math.max(1, Math.max(...xs) - x0), bh = Math.max(1, Math.max(...ys) - y0);
    const d = pts.map((p, i) => (i ? "L" : "M") + ((p.x - x0) / bw * 64).toFixed(1) + " " + ((p.y - y0) / bh * 64).toFixed(1)).join("") + "Z";
    mutate(ed, () => {
      const l = D.add(ed.doc, D.layer("path", { d, box: 64, x: Math.round(x0), y: Math.round(y0), w: Math.round(bw), h: Math.round(bh), fill: ed.fg || ed.doc.palette[0] || "#14110E" }));
      if (l) ed.sel = l.id;
    });
    ed.tool = "select";
    ed.render();
  }

  function fitText(ed, l) {
    const m = R.measureText(ed.cv.getContext("2d"), l);
    l.w = m.w; l.h = m.h;
  }

  function sampleDoc(doc, x, y) {
    if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return null;
    const cv = document.createElement("canvas");
    cv.width = doc.w; cv.height = doc.h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    R.draw(ctx, doc, { checker: false });
    const [r, g, b, a] = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (a < 128) return null;
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function placeFile(ed, input) {
    const f = input.files && input.files[0];
    input.value = "";
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { setStatus(ed, "That image is over 6MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, (ed.doc.w * 0.6) / img.naturalWidth, (ed.doc.h * 0.8) / img.naturalHeight);
        const w = Math.max(4, Math.round(img.naturalWidth * k)), h = Math.max(4, Math.round(img.naturalHeight * k));
        const at = ed.dropAt || { x: ed.doc.w / 2, y: ed.doc.h / 2 };
        mutate(ed, () => {
          const l = D.add(ed.doc, D.layer("image", { name: f.name.slice(0, 40), src: reader.result, x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2), w, h }));
          if (l) ed.sel = l.id;
        });
        ed.tool = "select";
        ed.render();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }

  function dropCard(ed, c, at, shift) {
    if (!c) return;
    // A card is a deliberate edit: commit any half-typed field so the panel
    // can repaint with what the card changed.
    const active = document.activeElement;
    if (active && ed.w.client.contains(active) && active.closest(".su__props")) active.blur();
    if (!usable(ed.app, c)) { setStatus(ed, ed.app.label + " cannot use a " + c.kind + " card."); return; }
    if (ed.app.mode === "pixel") {
      const res = mutate(ed, () => C.applyToCanvas(ed.doc, c));
      if (c.kind === "colour") { ed.fg = c.value; syncFg(ed); setStatus(ed, "Drawing with " + c.label); }
      else setStatus(ed, res.ok ? c.label + ": " + res.what : res.reason);
      return;
    }
    if (c.kind === "colour") { ed.fg = c.value; syncFg(ed); }
    const target = at ? D.hitTest(ed.doc, at.x, at.y) : (ed.sel && D.find(ed.doc, ed.sel));
    const res = mutate(ed, () => (target
      ? C.applyToLayer(ed.doc, target.id, c, { stroke: shift })
      : C.applyToCanvas(ed.doc, c, at || { x: ed.doc.w / 2, y: ed.doc.h / 2 })));
    if (res.layer) ed.sel = res.layer.id;
    const l = ed.sel && D.find(ed.doc, ed.sel);
    if (l && l.type === "text") fitText(ed, l);
    ed.render();
    setStatus(ed, res.ok ? c.label + ": " + res.what : res.reason);
  }

  function syncFg(ed) {
    const el = ed.w.client.querySelector('[data-s="fg"]');
    if (el) el.value = ed.fg.toLowerCase();
    paintPalette(ed);
  }

  function onCanvasBar(ed, e) {
    const t = e.target.closest("[data-tool],[data-s],[data-act],[data-layer],[data-eye],[data-pal],[data-align]");
    if (!t) return;
    if (t.dataset.tool) { ed.tool = t.dataset.tool; ed.pen = []; ed.render({ panels: false }); return; }
    if (t.dataset.eye) { mutate(ed, () => { const l = D.find(ed.doc, t.dataset.eye); if (l) l.hidden = !l.hidden; }); return; }
    if (t.dataset.layer) { ed.sel = t.dataset.layer; ed.render(); return; }
    if (t.dataset.pal) {
      const c = t.dataset.pal;
      if (e.altKey) { mutate(ed, () => { ed.doc.palette = ed.doc.palette.filter((x) => x !== c); }); return; }
      ed.fg = c; syncFg(ed);
      if (ed.app.mode === "pixel") return;
      if (ed.sel) mutate(ed, () => D.update(ed.doc, ed.sel, e.shiftKey ? { stroke: c, strokeW: D.find(ed.doc, ed.sel).strokeW || 2 } : { fill: c }));
      return;
    }
    if (t.dataset.align) { mutate(ed, () => D.align(ed.doc, [ed.sel], t.dataset.align)); return; }
    const s = t.dataset.s, a = t.dataset.act;
    if (s === "undo") undo(ed);
    if (s === "redo") undo(ed, true);
    if (s === "zin") zoomBy(ed, 1);
    if (s === "zout") zoomBy(ed, -1);
    if (s === "fit") { fit(ed); ed.render({ panels: false }); }
    if (s === "save") saveDoc(ed);
    if (s === "deliver") deliver(ed);
    if (s === "export") exportPNG(ed, ed.app.mode === "pixel" ? Number(ed.w.client.querySelector('[data-s="xscale"]').value) : 1);
    if (s === "new") {
      const [, pw, ph] = ed.app.presets[Number(ed.w.client.querySelector('[data-s="preset"]').value) || 0];
      mutate(ed, () => {
        const fresh = D.create({ mode: ed.app.mode, w: pw, h: ph, name: ed.doc.meta.name, briefId: ed.doc.meta.briefId });
        fresh.palette = ed.doc.palette.slice();
        Object.keys(ed.doc).forEach((k) => delete ed.doc[k]);
        Object.assign(ed.doc, fresh);
      });
      ed.sel = null; fit(ed); ed.render();
      setStatus(ed, "New " + pw + "×" + ph + " document. Undo brings the old one back.");
    }
    if (s === "addpal") {
      const l = ed.sel && D.find(ed.doc, ed.sel);
      const c = ed.app.mode === "pixel" ? ed.fg : l && typeof l.fill === "string" ? l.fill : null;
      if (c) mutate(ed, () => { if (!ed.doc.palette.includes(c)) ed.doc.palette.push(c); });
    }
    const l = ed.sel && D.find(ed.doc, ed.sel);
    if (!a || !l) return;
    if (a === "up" || a === "down" || a === "top" || a === "bottom") mutate(ed, () => D.restack(ed.doc, l.id, a));
    if (a === "dup") mutate(ed, () => { const c = D.duplicate(ed.doc, l.id); if (c) ed.sel = c.id; });
    if (a === "del") { mutate(ed, () => D.remove(ed.doc, l.id)); ed.sel = null; ed.render(); }
    if (a === "nofill") mutate(ed, () => D.update(ed.doc, l.id, { fill: null }));
  }

  // Property inputs apply live while typing, and become a single undo step
  // when the field is committed.
  function readProp(ed, el) {
    const l = ed.sel && D.find(ed.doc, ed.sel);
    const p = el.dataset.p;
    if (!p) return false;
    if (p === "docname") { ed.doc.meta.name = el.value.slice(0, 80) || "Untitled"; return true; }
    if (!l) {
      if (p === "bg") ed.doc.bg = el.value.toUpperCase();
      if (p === "nobg") ed.doc.bg = el.checked ? null : "#FFFFFF";
      return true;
    }
    const numP = ["x", "y", "w", "h", "rot", "size", "strokeW", "track"];
    let v = numP.includes(p) ? Number(el.value) : el.value;
    if (p === "opacity") v = Number(el.value) / 100;
    if (p === "weight") v = Number(el.value);
    if (p === "fill" || p === "stroke" || p === "fill2") v = el.value.toUpperCase();
    const patch = {};
    if (p === "fill2" || p === "gdir") {
      const a = typeof l.fill === "object" && l.fill ? l.fill.a : l.fill || "#000000";
      const b = p === "fill2" ? v : (l.fill && l.fill.b) || "#FFFFFF";
      patch.fill = { a, b, dir: p === "gdir" ? el.value : (l.fill && l.fill.dir) || "h" };
    } else if (p === "grad") {
      patch.fill = el.checked ? { a: typeof l.fill === "string" ? l.fill : "#000000", b: "#FFFFFF", dir: "h" } : (l.fill && l.fill.a) || "#000000";
    } else if (p === "fill" && l.fill && typeof l.fill === "object") {
      patch.fill = { ...l.fill, a: v };
    } else patch[p] = v;
    const next = D.update(ed.doc, l.id, patch);
    if (next && next.type === "text" && ["text", "size", "font", "weight", "track"].includes(p)) fitText(ed, next);
    return true;
  }

  function onCanvasInput(ed, e) {
    if (e.target.dataset.s === "name") { ed.doc.meta.name = e.target.value.slice(0, 80) || "Untitled"; changed(ed, { quiet: true }); return; }
    if (e.target.dataset.s === "fg") { ed.fg = e.target.value.toUpperCase(); return; }
    if (!e.target.closest(".su__props")) return;
    if (ed.pre === null) ed.pre = JSON.stringify(ed.doc);
    if (readProp(ed, e.target)) ed.draw();
  }

  function onCanvasChange(ed, e) {
    const b = e.target.dataset.bonus;
    if (b === "snap") ed.snap = e.target.checked;
    if (b === "mirror") { ed.mirror = e.target.checked; ed.draw(); }
    if (b === "gradient") { ed.gradient = e.target.checked; paintProps(ed); }
    if (!e.target.closest(".su__props")) return;
    readProp(ed, e.target);
    const pre = ed.pre;
    ed.pre = JSON.stringify(ed.doc);
    if (pre && pre !== ed.pre) { ed.hist.record(pre); changed(ed, { panels: false }); paintLayers(ed); syncGeometry(ed); }
  }

  // A committed edit can move or resize the layer (text re-measures itself);
  // refresh those fields in place so the panel keeps focus and stays truthful.
  function syncGeometry(ed) {
    const l = ed.sel && D.find(ed.doc, ed.sel);
    if (!l) return;
    for (const p of ["x", "y", "w", "h", "rot", "size"]) {
      const el = ed.w.client.querySelector('.su__props [data-p="' + p + '"]');
      if (el && el !== document.activeElement && l[p] !== undefined) el.value = Math.round(l[p] * 100) / 100;
    }
  }

  const colourVal = (c) => (typeof c === "string" ? c.toLowerCase() : c && c.a ? c.a.toLowerCase() : "#000000");

  function paintProps(ed) {
    const el = ed.w.client.querySelector(".su__props");
    if (!el || el.contains(document.activeElement)) return;
    const doc = ed.doc;
    const l = ed.sel && D.find(doc, ed.sel);
    const n = (p, v, label, step = 1) => '<label class="su__f"><span>' + label + '</span><input type="number" step="' + step + '" data-p="' + p + '" value="' + Math.round(v * 100) / 100 + '"></label>';
    if (!l) {
      el.innerHTML = '<div class="su__row"><label class="su__f su__f--wide"><span>Name</span><input data-p="docname" maxlength="80"></label></div>' +
        '<div class="su__row"><span class="su__k">SIZE</span><b>' + doc.w + " × " + doc.h + "</b></div>" +
        '<div class="su__row"><label class="su__f"><span>Background</span><input type="color" data-p="bg" value="' + colourVal(doc.bg || "#FFFFFF") + '"></label>' +
        '<label class="su__chk"><input type="checkbox" data-p="nobg"' + (doc.bg ? "" : " checked") + '>None</label></div>' +
        '<p class="su__hint">Nothing selected. Pick a tool, or click a layer.</p>';
      el.querySelector('[data-p="docname"]').value = doc.meta.name;
      return;
    }
    if (l.type === "subject") {
      el.innerHTML = '<div class="su__row">' + n("x", l.x, "X") + n("y", l.y, "Y") + n("w", l.w, "W") + n("h", l.h, "H") + "</div>" +
        '<p class="su__hint">Marks where you drew ' + esc(l.label) + ". The on-model check compares what you drew inside it with the model sheet. Never exported.</p>" +
        '<div class="su__row su__acts"><button class="w98btn su__sm" data-act="del">Remove marker</button></div>';
      return;
    }
    const grad = l.fill && typeof l.fill === "object";
    let h = '<div class="su__row">' + n("x", l.x, "X") + n("y", l.y, "Y") + n("w", l.w, "W") + n("h", l.h, "H") + "</div>" +
      '<div class="su__row">' + n("rot", l.rot, "Rotate°") +
        '<label class="su__f"><span>Opacity</span><input type="range" min="0" max="100" data-p="opacity" value="' + Math.round(l.opacity * 100) + '"></label></div>';
    if (l.type !== "image") {
      h += '<div class="su__row"><label class="su__f"><span>Fill</span><input type="color" data-p="fill" value="' + colourVal(l.fill) + '"></label>' +
        (ed.bonus.includes("gradient") ? '<label class="su__chk"><input type="checkbox" data-p="grad"' + (grad ? " checked" : "") + ">Gradient</label>" : "") +
        (grad ? '<label class="su__f"><span>To</span><input type="color" data-p="fill2" value="' + l.fill.b.toLowerCase() + '"></label>' +
          '<label class="su__f"><span>Dir</span><select data-p="gdir"><option value="h"' + (l.fill.dir === "h" ? " selected" : "") + '>→</option><option value="v"' + (l.fill.dir === "v" ? " selected" : "") + ">↓</option></select></label>" : "") +
        '<button class="w98btn su__sm" data-act="nofill" title="No fill">∅</button></div>';
    }
    h += '<div class="su__row"><label class="su__f"><span>Stroke</span><input type="color" data-p="stroke" value="' + colourVal(l.stroke || "#000000") + '"></label>' + n("strokeW", l.strokeW, "Width") + "</div>";
    if (l.type === "text") {
      const fonts = FONTS.concat(S().cards.filter((c) => c.kind === "type").map((c) => c.value)).filter((f, i, a) => a.indexOf(f) === i);
      if (!fonts.includes(l.font)) fonts.push(l.font);
      h += '<div class="su__row"><label class="su__f su__f--wide"><span>Text</span><textarea data-p="text" rows="2"></textarea></label></div>' +
        '<div class="su__row"><label class="su__f su__f--wide"><span>Typeface</span><select data-p="font">' +
          fonts.map((f) => '<option' + (f === l.font ? " selected" : "") + ">" + esc(f) + "</option>").join("") + "</select></label></div>" +
        '<div class="su__row">' + n("size", l.size, "Size") +
          '<label class="su__f"><span>Weight</span><select data-p="weight">' + [400, 500, 600, 700].map((wt) => "<option" + (wt === l.weight ? " selected" : "") + ">" + wt + "</option>").join("") + "</select></label>" +
          n("track", l.track, "Track", 0.5) +
          '<label class="su__f"><span>Align</span><select data-p="align">' + ["left", "center", "right"].map((a) => "<option" + (a === l.align ? " selected" : "") + ">" + a + "</option>").join("") + "</select></label></div>";
    }
    h += '<div class="su__row su__acts">' +
      '<button class="w98btn su__sm" data-act="top" title="Bring to front">⤒</button><button class="w98btn su__sm" data-act="up" title="Forward">↑</button>' +
      '<button class="w98btn su__sm" data-act="down" title="Backward">↓</button><button class="w98btn su__sm" data-act="bottom" title="Send to back">⤓</button>' +
      '<button class="w98btn su__sm" data-act="dup">Duplicate</button><button class="w98btn su__sm" data-act="del">Delete</button></div>';
    if (ed.bonus.includes("align")) {
      h += '<div class="su__row su__acts">' + [["left", "⇤"], ["hcenter", "↔"], ["right", "⇥"], ["top", "⤒"], ["vcenter", "↕"], ["bottom", "⤓"]]
        .map(([k, g]) => '<button class="w98btn su__sm" data-align="' + k + '" title="Align ' + k + '">' + g + "</button>").join("") + "</div>";
    }
    if (l.card) { const c = cardById(l.card); h += '<p class="su__hint">From card: ' + esc(c ? c.label : l.card) + "</p>"; }
    el.innerHTML = h;
    const ta = el.querySelector('[data-p="text"]');
    if (ta) ta.value = l.text;
  }

  function paintLayers(ed) {
    const el = ed.w.client.querySelector(".su__layers");
    if (!el) return;
    el.innerHTML = ed.doc.layers.length ? ed.doc.layers.slice().reverse().map((l) =>
      '<div class="su__ly' + (l.id === ed.sel ? " on" : "") + (l.hidden ? " off" : "") + '" data-layer="' + l.id + '">' +
        '<button class="su__eye" data-eye="' + l.id + '" title="Show / hide">' + (l.hidden ? "○" : "●") + "</button>" +
        "<span>" + esc(l.type === "text" ? "“" + l.text.slice(0, 18) + "”" : l.type === "subject" ? "◇ " + l.label : l.name) + "</span>" +
        (l.card ? '<em title="Made with a card">◆</em>' : "") + "</div>").join("")
      : '<p class="su__hint">No layers yet.</p>';
  }

  function paintPalette(ed) {
    const el = ed.w.client.querySelector(".su__pal");
    if (!el) return;
    el.innerHTML = ed.doc.palette.map((c) =>
      '<button class="su__chip' + (ed.app.mode === "pixel" && c === ed.fg ? " on" : "") + '" data-pal="' + c + '" style="background:' + c + '" title="' + c + ' — click to apply, alt-click to remove"></button>').join("") +
      '<button class="w98btn su__sm" data-s="addpal" title="Add the current colour">+</button>';
  }

  /* ── layout editor ────────────────────────────────────── */
  function layoutClient(ed) {
    const doc = ed.doc, site = doc.site || D.site();
    const base = ed.job && ed.job.client;
    const slug = (doc.meta.name || "page").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").slice(0, 30) || "page";
    return {
      who: base ? base.who : "You", role: "", co: doc.meta.name || "Untitled", dom: slug + ".local",
      frame: Sites.FRAME_NAMES.includes(site.frame) ? site.frame : "studio",
      theme: { brand: site.brand, link: site.brand, head: "'" + site.head + "', Georgia, serif" },
      site: { tagline: site.tagline, nav: [["Home", "/"]], pages: { "/": doc.blocks } },
      refs: base && base.refs && base.refs.length ? base.refs : ["fan art", "poster", "illustration"],
    };
  }

  function mountLayout(ed) {
    ed.w.client.innerHTML =
      '<div class="su su--layout">' +
        '<div class="su__bar">' +
          '<input class="su__name" data-s="name" maxlength="80" title="Site name">' +
          '<select class="su__sel" data-l="frame" title="Site frame">' + Sites.FRAME_NAMES.map((f) => "<option>" + f + "</option>").join("") + "</select>" +
          '<input type="color" data-l="brand" title="Brand colour">' +
          '<select class="su__sel" data-l="head" title="Headline typeface"></select>' +
          '<span class="su__sep"></span><button class="w98btn" data-s="undo">Undo</button><button class="w98btn" data-s="redo">Redo</button>' +
          '<span class="ml__spacer"></span><button class="w98btn" data-s="save">Save</button><button class="w98btn" data-s="visit">View in The Web</button>' +
          deliverButton(ed) +
        "</div>" +
        '<div class="su__body">' +
          '<div class="su__lib">' + Object.entries(A.BLOCKS).map(([k, b]) => '<button class="w98btn su__blk" data-add="' + k + '">+ ' + esc(b.label) + "</button>").join("") + "</div>" +
          '<div class="su__stage su__stage--page"><div class="su__page"></div></div>' +
          '<div class="su__side">' +
            '<div class="su__panel"><div class="su__ph">PAGE</div><div class="su__row"><label class="su__f su__f--wide"><span>Tagline</span><input data-l="tagline" maxlength="160"></label></div></div>' +
            '<div class="su__panel"><div class="su__ph">BLOCKS</div><div class="su__blocks"></div></div>' +
            '<div class="su__panel su__panel--grow"><div class="su__ph">EDIT BLOCK</div><div class="su__bedit"></div></div>' +
          "</div>" +
        "</div>" +
        trayHTML() +
        '<div class="su__status"></div>' +
      "</div>";

    const root = ed.w.client;
    const page = root.querySelector(".su__page");
    ed.paintTray = () => paintTray(root, ed.app, ed.job);

    const paintBar = () => {
      const site = ed.doc.site || (ed.doc.site = D.site());
      root.querySelector('[data-s="name"]').value = ed.doc.meta.name;
      root.querySelector('[data-l="frame"]').value = site.frame;
      root.querySelector('[data-l="brand"]').value = site.brand.toLowerCase();
      const fonts = FONTS.concat(S().cards.filter((c) => c.kind === "type").map((c) => c.value)).filter((f, i, a) => a.indexOf(f) === i);
      root.querySelector('[data-l="head"]').innerHTML = fonts.map((f) => "<option" + (f === site.head ? " selected" : "") + ">" + esc(f) + "</option>").join("");
      const tag = root.querySelector('[data-l="tagline"]');
      if (document.activeElement !== tag) tag.value = site.tagline;
    };

    ed.render = (opts = {}) => {
      page.innerHTML = Sites.renderSite(layoutClient(ed), "/");
      if (opts.panels !== false) { paintBlocks(); paintBlockEdit(); paintBar(); }
      root.querySelector('[data-s="undo"]').disabled = !ed.hist.canUndo();
      root.querySelector('[data-s="redo"]').disabled = !ed.hist.canRedo();
    };

    const paintBlocks = () => {
      root.querySelector(".su__blocks").innerHTML = ed.doc.blocks.length ? ed.doc.blocks.map((b, i) =>
        '<div class="su__ly' + (i === ed.blockSel ? " on" : "") + '" data-bsel="' + i + '"><span>' + (i + 1) + ". " + esc((A.BLOCKS[b.t] || { label: b.t }).label) +
          (b.h ? " — " + esc(String(b.h).slice(0, 16)) : "") + "</span>" + (b.card ? "<em>◆</em>" : "") +
          '<button class="w98btn su__sm" data-bmove="' + i + '" data-d="-1">↑</button><button class="w98btn su__sm" data-bmove="' + i + '" data-d="1">↓</button>' +
          '<button class="w98btn su__sm" data-bdel="' + i + '">×</button></div>').join("")
        : '<p class="su__hint">Add blocks from the left. The preview is the real site renderer.</p>';
    };

    const paintBlockEdit = () => {
      const el = root.querySelector(".su__bedit");
      const b = ed.doc.blocks[ed.blockSel];
      const spec = b && A.BLOCKS[b.t];
      if (!spec) { el.innerHTML = '<p class="su__hint">Select a block to edit it, or drop a fact / trend / gap card on it.</p>'; return; }
      let h = (spec.fields || []).map(([k, label]) => '<label class="su__f su__f--wide"><span>' + esc(label) + '</span><input data-bf="' + k + '"></label>').join("");
      if (spec.lines) h += '<label class="su__f su__f--wide"><span>' + esc(spec.lines[1]) + ' — one per line</span><textarea rows="4" data-bl="' + spec.lines[0] + '"></textarea></label>';
      if (spec.list) h += '<label class="su__f su__f--wide"><span>Items — one per line: ' + spec.list[1].join(" | ") + '</span><textarea rows="5" data-bi="' + spec.list[0] + '"></textarea></label>';
      el.innerHTML = h;
      (spec.fields || []).forEach(([k]) => { el.querySelector('[data-bf="' + k + '"]').value = b[k] || ""; });
      if (spec.lines) el.querySelector("[data-bl]").value = (b[spec.lines[0]] || []).join("\n");
      if (spec.list) el.querySelector("[data-bi]").value = A.listToText(b[spec.list[0]], spec.list[1]);
    };

    const readBlockField = (t) => {
      const b = ed.doc.blocks[ed.blockSel];
      const spec = b && A.BLOCKS[b.t];
      if (!spec) return;
      if (t.dataset.bf) b[t.dataset.bf] = t.value.slice(0, 400);
      if (t.dataset.bl) b[t.dataset.bl] = t.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 24).map((s) => s.slice(0, 400));
      if (t.dataset.bi) {
        let items = A.textToList(t.value, spec.list[1]);
        // Swatch colours end up in a style attribute: hex only.
        if (b.t === "swatches") items = items.map((it) => ({ ...it, c: /^#[0-9A-Fa-f]{6}$/.test(it.c) ? it.c : "#CCCCCC" }));
        b[t.dataset.bi] = items;
      }
    };

    root.addEventListener("focusin", (e) => { if (e.target.closest(".su__bedit,[data-l='tagline']")) ed.pre = JSON.stringify(ed.doc); });
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.s === "name") { ed.doc.meta.name = t.value.slice(0, 80) || "Untitled"; changed(ed, { panels: false }); return; }
      if (t.dataset.l === "tagline") { ed.doc.site.tagline = t.value.slice(0, 160); page.innerHTML = Sites.renderSite(layoutClient(ed), "/"); return; }
      if (t.closest(".su__bedit")) { readBlockField(t); page.innerHTML = Sites.renderSite(layoutClient(ed), "/"); }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.l === "frame" || t.dataset.l === "brand" || t.dataset.l === "head") {
        mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, [t.dataset.l]: t.dataset.l === "brand" ? t.value.toUpperCase() : t.value }); });
        return;
      }
      if (t.closest(".su__bedit") || t.dataset.l === "tagline") {
        const pre = ed.pre;
        ed.pre = JSON.stringify(ed.doc);
        if (pre && pre !== ed.pre) { ed.hist.record(pre); changed(ed, { panels: false }); paintBlocks(); }
      }
    });
    root.addEventListener("click", (e) => {
      if (e.target.closest(".su__page")) { e.preventDefault(); return; }   // the preview is not navigable
      const t = e.target.closest("[data-add],[data-bsel],[data-bmove],[data-bdel],[data-s]");
      if (!t) return;
      if (t.dataset.add) {
        mutate(ed, () => { const at = ed.blockSel >= 0 ? ed.blockSel + 1 : ed.doc.blocks.length; if (D.addBlock(ed.doc, A.BLOCKS[t.dataset.add].make(), at)) ed.blockSel = at; });
        return;
      }
      if (t.dataset.bmove) { const i = Number(t.dataset.bmove), d = Number(t.dataset.d); mutate(ed, () => { if (D.moveBlock(ed.doc, i, d)) ed.blockSel = i + d; }); return; }
      if (t.dataset.bdel) { const i = Number(t.dataset.bdel); mutate(ed, () => { D.removeBlock(ed.doc, i); ed.blockSel = Math.min(ed.blockSel, ed.doc.blocks.length - 1); }); return; }
      if (t.dataset.bsel) { ed.blockSel = Number(t.dataset.bsel); paintBlocks(); paintBlockEdit(); return; }
      if (t.dataset.s === "undo") undo(ed);
      if (t.dataset.s === "redo") undo(ed, true);
      if (t.dataset.s === "save") saveDoc(ed);
      if (t.dataset.s === "visit") visitLayout(ed);
      if (t.dataset.s === "deliver") deliver(ed);
    });
    page.addEventListener("submit", (e) => e.preventDefault(), true);

    wireTray(root, ed.job, (c) => dropOnBlock(ed, c));
    const stage = root.querySelector(".su__stage");
    stage.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("text/x-pxcard")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
    stage.addEventListener("drop", (e) => {
      const id = e.dataTransfer.getData("text/x-pxcard");
      if (!id) return;
      e.preventDefault();
      dropOnBlock(ed, cardById(id));
    });

    ed.render();
    ed.paintTray();
    setStatus(ed, "Select a block, then drop a fact, trend or gap card to write it in. A colour card sets the brand colour.");
  }

  function dropOnBlock(ed, c) {
    if (!c) return;
    if (c.kind === "colour") {
      mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, brand: c.value }); C.applyToCanvas(ed.doc, c); });
      setStatus(ed, "Brand colour: " + c.label);
      return;
    }
    if (c.kind === "type") {
      mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, head: c.value }); if (!ed.doc.meta.intent.includes(c.id)) ed.doc.meta.intent.push(c.id); });
      setStatus(ed, "Headline typeface: " + c.value);
      return;
    }
    const res = mutate(ed, () => (ed.blockSel >= 0 ? C.applyToBlock(ed.doc, ed.blockSel, c) : C.applyToCanvas(ed.doc, c)));
    setStatus(ed, res.ok ? c.label + ": " + res.what : res.reason);
  }

  // Register the page as a site so the in-app browser can visit it.
  function visitLayout(ed) {
    const client = layoutClient(ed);
    const key = "SUITE:" + client.dom;
    const clash = Object.entries(CLIENTS).some(([k, c]) => k !== key && c.dom.toLowerCase() === client.dom);
    if (clash) { setStatus(ed, client.dom + " is already somebody's site. Rename the page."); return; }
    CLIENTS[key] = JSON.parse(JSON.stringify(client));
    Web.visit("http://" + client.dom + "/", CLIENTS[key]);
  }

  /* ── Swatch ───────────────────────────────────────────── */
  function luminance(hex) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  function openSwatch(job) {
    const key = "suite:swatch";
    let w = getWin(key);
    if (w) { w.meta.job = job; w.meta.paint(); return revealWin(w); }
    w = createWindow({ key, title: "SWATCH", iconId: "app-swatch", w: 620, h: 520, minW: 460, minH: 380, onClose: () => editors.delete(key) });
    w.client.classList.add("client--flush");
    w.meta.job = job;
    const ed = { w, app: A.APPS.swatch };
    editors.set(key, ed);
    w.client.innerHTML =
      '<div class="su su--swatch"><div class="su__bar"><b class="su__lbl">PALETTE</b><span class="su__sw6"></span><span class="ml__spacer"></span>' +
        '<input type="color" data-w="mix" title="Mix a colour"><button class="w98btn" data-w="addmix">Add mixed colour</button>' +
        '<button class="w98btn" data-w="apply">Send to open document</button></div>' +
        '<div class="su__swbody"><div class="su__panel su__panel--grow"><div class="su__ph">CONTRAST</div><div class="su__grid"></div></div></div>' +
        trayHTML() + '<div class="su__status"></div></div>';
    ed.paintTray = () => paintTray(w.client, ed.app, w.meta.job);
    w.meta.paint = () => {
      const sw = S().swatch;
      w.client.querySelector(".su__sw6").innerHTML = sw.map((c) => '<button class="su__chip su__chip--lg" data-rm="' + c + '" style="background:' + c + '" title="' + c + ' — click to remove"></button>').join("") +
        (sw.length < 6 ? '<span class="su__slot">' + (6 - sw.length) + " free</span>" : "");
      w.client.querySelector(".su__grid").innerHTML = sw.length < 2 ? '<p class="su__hint">Click colour cards below to build a palette of up to six. Every pair is checked for text contrast.</p>' :
        '<table class="su__ct"><tr><th></th>' + sw.map((c) => '<th><span class="su__chip" style="background:' + c + '"></span></th>').join("") + "</tr>" +
        sw.map((a) => '<tr><th><span class="su__chip" style="background:' + a + '"></span></th>' + sw.map((b) => {
          if (a === b) return "<td></td>";
          const r = contrast(a, b);
          const grade = r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "AA large" : "fail";
          return '<td class="su__ct--' + grade.split(" ")[0].toLowerCase() + '"><span style="background:' + b + ";color:" + a + '">Ag</span>' + r.toFixed(1) + " " + grade + "</td>";
        }).join("") + "</tr>").join("") + "</table>";
      ed.paintTray();
    };
    wireTray(w.client, job, (c) => {
      if (c.kind !== "colour") { setStatus(ed, "Swatch only takes colour cards."); return; }
      const sw = S().swatch;
      if (sw.includes(c.value)) return;
      if (sw.length >= 6) { setStatus(ed, "Six colours is the limit. Remove one first."); return; }
      sw.push(c.value); save(); w.meta.paint();
    });
    w.client.addEventListener("click", (e) => {
      const t = e.target.closest("[data-rm],[data-w]");
      if (!t) return;
      if (t.dataset.rm) { S().swatch = S().swatch.filter((c) => c !== t.dataset.rm); save(); w.meta.paint(); }
      if (t.dataset.w === "addmix") {
        const v = w.client.querySelector('[data-w="mix"]').value.toUpperCase();
        addCards([{ kind: "colour", label: "Mixed " + v, value: v, tags: ["mixed"] }]);
        if (S().swatch.length < 6 && !S().swatch.includes(v)) { S().swatch.push(v); save(); }
        w.meta.paint();
      }
      if (t.dataset.w === "apply") {
        const target = lastEditor && editors.has(lastEditor.key) ? lastEditor : null;
        if (!target || !target.doc) { setStatus(ed, "Open a Banner, Type, Pixel or Layout document first."); return; }
        mutate(target, () => { target.doc.palette = S().swatch.slice(); });
        setStatus(ed, "Palette sent to " + target.doc.meta.name + ".");
      }
    });
    w.meta.paint();
    setStatus(ed, "Contrast uses the WCAG formula: 4.5 for body text, 3 for large text.");
    return w;
  }

  /* ── Cutout ───────────────────────────────────────────── */
  function openCutout(job, initial) {
    const key = "suite:cutout";
    let w = getWin(key);
    if (w) {
      w.meta.job = job;
      w.meta.paintSources();
      if (initial) w.meta.load(initial.src, initial.label, initial.tags);
      return revealWin(w);
    }
    w = createWindow({ key, title: "CUTOUT", iconId: "app-cutout", w: 760, h: 600, minW: 560, minH: 460, onClose: () => editors.delete(key) });
    w.client.classList.add("client--flush");
    w.meta.job = job;
    const ed = { w, app: A.APPS.cutout, mode: "wand", mask: null, img: null, label: "", tags: [], lasso: [] };
    editors.set(key, ed);
    w.client.innerHTML =
      '<div class="su su--cutout"><div class="su__bar">' +
        '<select class="su__sel" data-c="src"></select><button class="w98btn" data-c="file">Load picture…</button>' +
        '<span class="su__sep"></span>' +
        '<label class="su__chk"><input type="radio" name="cutmode" value="wand" checked>Wand</label><label class="su__chk"><input type="radio" name="cutmode" value="lasso">Lasso</label>' +
        '<label class="su__f su__f--inline"><span>Tolerance</span><input type="range" min="0" max="120" value="36" data-c="tol"></label>' +
        "</div>" +
        '<div class="su__body"><div class="su__stage"><div class="su__pad"><canvas class="su__cv"></canvas></div></div>' +
          '<div class="su__side"><div class="su__panel"><div class="su__ph">SELECTION</div><div class="su__row su__acts">' +
            '<button class="w98btn su__sm" data-c="clear">Clear</button><button class="w98btn su__sm" data-c="invert">Invert</button></div>' +
            '<p class="su__hint su__cutn"></p>' +
            '<div class="su__row su__acts"><button class="w98btn" data-c="object">Make object card</button></div>' +
            '<div class="su__row su__acts"><button class="w98btn" data-c="colour">Make colour card</button></div>' +
            '<p class="su__hint">Click to select by colour (shift adds). Lasso: drag round the thing you want.</p></div></div></div>' +
        trayHTML() + '<div class="su__status"></div></div>' +
        '<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="su__file" hidden>';

    const cv = w.client.querySelector(".su__cv");
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    let pixels = null;
    ed.paintTray = () => paintTray(w.client, ed.app, w.meta.job);

    const draw = () => {
      if (!ed.img) { cv.width = 360; cv.height = 240; ctx.fillStyle = "#DDD"; ctx.fillRect(0, 0, 360, 240); return; }
      ctx.putImageData(pixels, 0, 0);
      if (ed.mask) {
        const over = ctx.getImageData(0, 0, cv.width, cv.height);
        for (let p = 0; p < ed.mask.length; p++) {
          const i = p * 4;
          if (ed.mask[p]) { over.data[i] = over.data[i] * 0.55 + 16 * 0.45; over.data[i + 1] = over.data[i + 1] * 0.55 + 132 * 0.45; over.data[i + 2] = over.data[i + 2] * 0.55 + 208 * 0.45; }
        }
        ctx.putImageData(over, 0, 0);
      }
      if (ed.lasso.length) {
        ctx.strokeStyle = "#FF5FA8"; ctx.lineWidth = 1.5; ctx.beginPath();
        ed.lasso.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }
      const n = ed.mask ? X.count(ed.mask) : 0;
      w.client.querySelector(".su__cutn").textContent = n ? n + " pixels selected" : "Nothing selected";
    };

    const load = (src, label, tags) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 520 / img.naturalWidth, 380 / img.naturalHeight);
        cv.width = Math.max(1, Math.round(img.naturalWidth * k));
        cv.height = Math.max(1, Math.round(img.naturalHeight * k));
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        pixels = ctx.getImageData(0, 0, cv.width, cv.height);
        Object.assign(ed, { img, label, tags: tags || [], mask: new Uint8Array(cv.width * cv.height), lasso: [] });
        draw();
      };
      img.src = src;
    };

    w.meta.load = load;
    w.meta.paintSources = () => {
      const sel = w.client.querySelector('[data-c="src"]');
      // Official art is for looking at, never for cutting up: it stays off this list.
      const refs = ((w.meta.job && w.meta.job.client && w.meta.job.client.refs) || [])
        .filter((r) => !(typeof Characters !== "undefined" && Characters.poseFor(r, 0)));
      const objs = S().cards.filter((c) => c.kind === "object");
      sel.innerHTML = '<option value="">Choose a picture…</option>' +
        (refs.length ? '<optgroup label="Client references">' + refs.map((r, i) => '<option value="ref:' + i + '">' + esc(r) + "</option>").join("") + "</optgroup>" : "") +
        (objs.length ? '<optgroup label="Object cards">' + objs.map((c) => '<option value="card:' + esc(c.id) + '">' + esc(c.label) + "</option>").join("") + "</optgroup>" : "");
      ed.paintTray();
    };

    w.client.addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "cutmode") ed.mode = t.value;
      if (t.dataset.c === "src" && t.value) {
        if (t.value.startsWith("ref:")) {
          const ref = ((w.meta.job.client.refs) || []).filter((r) => !(typeof Characters !== "undefined" && Characters.poseFor(r, 0)))[Number(t.value.slice(4))];
          load(Imagery.make(ref, 1, 480, 360), ref, ["reference"]);
        } else {
          const c = cardById(t.value.slice(5));
          if (c) load(c.value, c.label, c.tags);
        }
      }
    });
    w.client.querySelector(".su__file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!f || f.size > 6 * 1024 * 1024) return;
      const r = new FileReader();
      r.onload = () => load(r.result, f.name.replace(/\.[a-z]+$/i, "").slice(0, 40), ["found"]);
      r.readAsDataURL(f);
    });
    w.client.addEventListener("click", (e) => {
      const t = e.target.closest("[data-c]");
      if (!t || t.tagName === "SELECT" || t.tagName === "INPUT") return;
      const c = t.dataset.c;
      if (c === "file") w.client.querySelector(".su__file").click();
      if (!ed.img) return;
      if (c === "clear") { ed.mask = new Uint8Array(cv.width * cv.height); draw(); }
      if (c === "invert") { ed.mask = X.invert(ed.mask); draw(); }
      if (c === "object") {
        const out = X.extract(pixels.data, cv.width, cv.height, ed.mask);
        if (!out) { setStatus(ed, "Select something first."); return; }
        const oc = document.createElement("canvas");
        oc.width = out.w; oc.height = out.h;
        oc.getContext("2d").putImageData(new ImageData(out.rgba, out.w, out.h), 0, 0);
        const n = addCards([{ kind: "object", label: "Cut: " + ed.label, value: oc.toDataURL("image/png"), tags: ed.tags.concat(["cutout"]) }]);
        setStatus(ed, n ? "Object card made from " + ed.label + "." : "That cutout is already a card.");
      }
      if (c === "colour") {
        const hex = X.dominant(pixels.data, ed.mask);
        if (!hex) { setStatus(ed, "Select something first."); return; }
        const n = addCards([{ kind: "colour", label: hex + " from " + ed.label, value: hex, tags: ed.tags.concat(["sampled"]) }]);
        setStatus(ed, n ? "Colour card " + hex + " made." : hex + " is already a card.");
      }
    });

    let lassoing = false;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
    cv.addEventListener("pointerdown", (e) => {
      if (!ed.img) return;
      const p = pt(e);
      if (ed.mode === "wand") {
        const tol = Number(w.client.querySelector('[data-c="tol"]').value);
        ed.mask = X.wand(pixels.data, cv.width, cv.height, Math.floor(p.x), Math.floor(p.y), tol, e.shiftKey ? ed.mask : new Uint8Array(cv.width * cv.height));
        draw();
      } else {
        lassoing = true; cv.setPointerCapture(e.pointerId);
        ed.lasso = [p];
        if (!e.shiftKey) ed.mask = new Uint8Array(cv.width * cv.height);
      }
    });
    cv.addEventListener("pointermove", (e) => { if (lassoing) { ed.lasso.push(pt(e)); draw(); } });
    const endLasso = () => {
      if (!lassoing) return;
      lassoing = false;
      ed.mask = X.lasso(ed.lasso, cv.width, cv.height, ed.mask);
      ed.lasso = [];
      draw();
    };
    cv.addEventListener("pointerup", endLasso);
    cv.addEventListener("pointercancel", endLasso);

    wireTray(w.client, job, (c) => { if (c.kind === "object") load(c.value, c.label, c.tags); });
    w.meta.paintSources();
    draw();
    setStatus(ed, "Pick a client reference or an object card, then cut out what you need.");
    if (initial) load(initial.src, initial.label, initial.tags);
    return w;
  }

  /* ── keyboard ─────────────────────────────────────────── */
  function onKey(e) {
    if (typeof activeWin === "undefined" || !activeWin) return;
    const ed = editors.get(activeWin.key);
    if (!ed || !ed.doc) return;
    if (e.target.closest && e.target.closest("input,textarea,select")) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); undo(ed, e.shiftKey); return; }
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); saveDoc(ed); return; }
    if (ed.app.mode === "layout") return;
    if (mod && e.key.toLowerCase() === "d" && ed.sel) { e.preventDefault(); mutate(ed, () => { const c = D.duplicate(ed.doc, ed.sel); if (c) ed.sel = c.id; }); return; }
    if ((e.key === "Delete" || e.key === "Backspace") && ed.sel) { e.preventDefault(); mutate(ed, () => D.remove(ed.doc, ed.sel)); ed.sel = null; ed.render(); return; }
    if (e.key === "Enter" && ed.pen.length > 2) { finishPen(ed); return; }
    if (e.key.startsWith("Arrow") && ed.sel) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      mutate(ed, () => { const l = D.find(ed.doc, ed.sel); if (l) { l.x += dx; l.y += dy; } }, { panels: true });
      return;
    }
    if (!mod && !e.altKey) {
      const tool = ed.app.tools.find((t) => A.TOOLS[t].key === e.key.toLowerCase());
      if (tool) { ed.tool = tool; ed.pen = []; ed.render({ panels: false }); }
    }
  }

  // Escape inside a suite window deselects; it must not also throw you back
  // across to the world, which is what app.js does with Escape everywhere else.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || typeof activeWin === "undefined" || !activeWin || !String(activeWin.key).startsWith("suite")) return;
    e.stopImmediatePropagation();
    const ed = editors.get(activeWin.key);
    if (ed && ed.doc && ed.render) { ed.pen = []; ed.sel = null; ed.render(); }
  }, true);

  function unlock(name) {
    if (!A.BONUS[name] || S().unlocks.includes(name)) return false;
    S().unlocks.push(name);
    save();
    return true;
  }

  // The most recently edited document for a job, from whichever app made it.
  function docFor(jobId, preferApp) {
    editors.forEach((ed) => { if (ed.job && ed.job.id === jobId) flushAutosave(ed); });
    const touched = S().touched || {};
    const keys = Object.keys(S().docs).filter((k) => k.slice(k.indexOf(":") + 1) === jobId);
    keys.sort((a, b) => (touched[b] || 0) - (touched[a] || 0) || (b.startsWith(preferApp + ":") ? 1 : 0) - (a.startsWith(preferApp + ":") ? 1 : 0));
    return keys.length ? { appId: keys[0].split(":")[0], doc: D.normalize(S().docs[keys[0]]) } : null;
  }

  return {
    boot, launcher, open, addCards, unlock, docFor,
    cards: () => S().cards.slice(),
    cutoutFrom: (initial, jobId) => openCutout(jobById(jobId), initial),
    unlocks: () => S().unlocks.slice(),
  };
})();
