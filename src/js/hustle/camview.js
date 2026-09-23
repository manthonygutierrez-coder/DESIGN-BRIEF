"use strict";
/* ── your camera: the windows ─────────────────────────────
 * The builder (you and your room, against your own live feed), the guide
 * (your camera talking you through setup), and the little picture of you in
 * the corner of every call. Adds itself to Camera; camera.js holds the data.
 */

Object.assign(Camera, (() => {
  const C = Camera, Por = typeof Portraits !== "undefined" ? Portraits : null;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const KEY = "camera:builder";
  const SEED = "me";

  let io = null;            // { get, set } — the slot's `me`, from hustle.js
  let me = null, tab = "you", sel = -1, drag = null, anim = 0, smileUntil = 0, onFinish = null;

  const get = () => (me = C.normalize(io ? io.get() : me, 7));
  const put = () => { if (io) io.set(me); };

  /* ── drawing you ─────────────────────────────────────── */
  function feed(canvas, o = {}){
    if (!Por) return;
    Por.paintFeed(canvas, SEED, me.look, Object.assign({
      theme: C.themeOf(me), room: me.room.length ? me.room : [{ p: "none", x: 0, y: 0, w: 0, h: 0 }],
      framing: me.framing, pattern: me.pattern,
    }, o));
  }

  // One piece, shown on you: the head for hair and faces, head and shoulders
  // for what you wear. Whole-number scale, so every thumbnail is crisp.
  function thumb(canvas, look, kind){
    const t = Por.traits(SEED, look), fig = Por.figure(t, { garment: look.garment, line: look.line, bg: "#B7C2C4", mood: "warm" });
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    const crop = kind === "bust" ? [2, 8, 20, 22] : [3, 0, 18, 20];
    g.drawImage(fig, crop[0], crop[1], crop[2], crop[3], 0, 0, crop[2] * 2, crop[3] * 2);
  }

  function propThumb(canvas, p){
    const g = canvas.getContext("2d"), th = C.themeOf(me);
    g.imageSmoothingEnabled = false;
    g.fillStyle = th.bg; g.fillRect(0, 0, canvas.width, canvas.height);
    const piece = C.PIECES[p], ar = piece.w / piece.h, s = canvas.width - 8;
    const w = ar >= 1 ? s : Math.max(6, Math.round(s * ar)), h = ar >= 1 ? Math.max(6, Math.round(s / ar)) : s;
    let n = 1;
    Por.PROPS[p](g, Math.round((canvas.width - w) / 2), Math.round((canvas.height - h) / 2), w, h, th, () => ((n = (n * 9301 + 49297) % 233280) / 233280));
  }

  function wallThumb(canvas, pattern){
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    Por.paintRoom(g, canvas.width, canvas.height, C.themeOf(me), [{ p: "none", x: 0, y: 0, w: 0, h: 0 }], SEED, { hz: 0.72, pattern });
  }

  /* ── the builder window ─────────────────────────────── */
  function open(opts = {}){
    get();
    onFinish = opts.onDone || null;
    const existing = getWin(KEY);
    if (existing){ revealWin(existing); return existing; }
    const w = createWindow({ key: KEY, title: "Your camera", iconId: "camera", w: 760, h: 540, minW: 640, minH: 460,
                             className: "w98--cam", onClose: () => { clearInterval(anim); anim = 0; } });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="cam">' +
        '<div class="cam__left">' +
          '<div class="cam__stage"><canvas class="cam__feed" width="320" height="240"></canvas>' +
            '<span class="cam__rec">● PREVIEW</span></div>' +
          '<p class="cam__hint" data-cam-hint></p>' +
          '<div class="cam__sel" data-cam-sel></div>' +
          '<div class="cam__rolls"><button class="w98btn" data-cam="roll-you">Roll a new me</button>' +
            '<button class="w98btn" data-cam="roll-room">Roll a new room</button></div>' +
        "</div>" +
        '<div class="cam__right">' +
          '<div class="cam__tabs" role="tablist"><button data-cam-tab="you">You</button><button data-cam-tab="room">Your room</button></div>' +
          '<div class="cam__rows" data-cam-rows></div>' +
          '<div class="cam__foot"><span data-cam-note>Everyone who calls you sees this.</span>' +
            '<button class="w98btn cam__done" data-cam="done">' + (opts.intro ? "That's me" : "Done") + "</button></div>" +
        "</div>" +
      "</div>";
    w.client.addEventListener("click", onClick);
    w.client.addEventListener("input", onInput);
    const cv = w.client.querySelector(".cam__feed");
    cv.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    render(w);
    clearInterval(anim);
    anim = setInterval(() => { if (getWin(KEY)) paintPreview(); else clearInterval(anim); }, 140);
    return w;
  }

  function render(w = getWin(KEY)){
    if (!w) return;
    w.client.querySelectorAll("[data-cam-tab]").forEach((b) => b.classList.toggle("on", b.dataset.camTab === tab));
    const rows = w.client.querySelector("[data-cam-rows]");
    rows.innerHTML = tab === "you" ? youRows() : roomRows();
    rows.querySelectorAll("canvas[data-th]").forEach((cv) => {
      const [kind, k, v] = cv.dataset.th.split("|");
      if (kind === "prop") propThumb(cv, v);
      else if (kind === "wall") wallThumb(cv, v);
      else if (kind === "shot"){ const keep = me.framing; me.framing = v; feed(cv, { mood: "warm" }); me.framing = keep; }
      else thumb(cv, Object.assign({}, me.look, { [k]: v }), kind);
    });
    paintSel(w);
    paintPreview();
  }

  const on = (k, v) => (me.look[k] === v ? " on" : "");

  function youRows(){
    return C.visibleRows(me.look).map((row) => {
      const items = row.values.map((v) => {
        const title = esc(C.NAMES[v] || v);
        if (row.kind === "swatch") return '<button class="cam__sw' + on(row.key, v) + '" data-k="' + row.key + '" data-v="' + v + '" title="' + v + '" style="background:' + v + '"></button>';
        if (row.kind === "word") return '<button class="cam__word' + on(row.key, v) + '" data-k="' + row.key + '" data-v="' + v + '">' + title + "</button>";
        const [cw, ch] = row.kind === "bust" ? [40, 44] : [36, 40];
        return '<button class="cam__th' + on(row.key, v) + '" data-k="' + row.key + '" data-v="' + v + '" title="' + title + '">' +
          '<canvas width="' + cw + '" height="' + ch + '" data-th="' + row.kind + "|" + row.key + "|" + v + '"></canvas></button>';
      }).join("");
      return '<div class="cam__row"><h4>' + esc(row.label) + '</h4><div class="cam__opts">' + items + "</div></div>";
    }).join("");
  }

  function roomRows(){
    const pal = Object.entries(C.PALETTES).map(([id, p]) =>
      '<button class="cam__pal' + (me.palette === id ? " on" : "") + '" data-room="palette" data-v="' + id + '" title="' + esc(p.name) + '">' +
      '<i style="background:' + p.bg + '"></i><i style="background:' + p.brand + '"></i><i style="background:' + p.brand2 + '"></i><span>' + esc(p.name) + "</span></button>").join("");
    const walls = Object.entries(C.PATTERN_NAMES).map(([id, n]) =>
      '<button class="cam__th' + (me.pattern === id ? " on" : "") + '" data-room="pattern" data-v="' + id + '" title="' + esc(n) + '">' +
      '<canvas width="44" height="32" data-th="wall||' + id + '"></canvas></button>').join("");
    const shots = ["against", "receded"].map((id) =>
      '<button class="cam__shot' + (me.framing === id ? " on" : "") + '" data-room="framing" data-v="' + id + '">' +
      '<canvas width="80" height="60" data-th="shot||' + id + '"></canvas><span>' + esc(Por.FRAMINGS[id].label) + "</span></button>").join("");
    const add = Object.entries(C.PIECES).map(([id, pc]) =>
      '<button class="cam__th" data-add="' + id + '" title="Add ' + esc(pc.name.toLowerCase()) + '"><canvas width="36" height="36" data-th="prop||' + id + '"></canvas></button>').join("");
    const have = me.room.map((it, i) =>
      '<span class="cam__have' + (i === sel ? " on" : "") + '"><button data-pick="' + i + '">' + esc((C.PIECES[it.p] || {}).name || it.p) + '</button><button data-rm="' + i + '" title="Take it out">✕</button></span>').join("");
    return '<div class="cam__row"><h4>Colours</h4><div class="cam__opts">' + pal + "</div></div>" +
      '<div class="cam__row"><h4>Wall</h4><div class="cam__opts">' + walls + "</div></div>" +
      '<div class="cam__row"><h4>How you sit</h4><div class="cam__opts">' + shots + "</div></div>" +
      '<div class="cam__row"><h4>Add to your room</h4><div class="cam__opts">' + add + "</div></div>" +
      '<div class="cam__row"><h4>In your room</h4><div class="cam__opts cam__haves">' + (have || "<em>Nothing yet. Add something above.</em>") + "</div></div>";
  }

  function paintPreview(){
    const w = getWin(KEY);
    if (!w) return;
    const t = Date.now(), cv = w.client.querySelector(".cam__feed");
    feed(cv, { mood: t < smileUntil ? "warm" : "neutral", blink: (t % 3400) < 140, bob: Math.floor(t / 900) % 3 === 0 });
    if (tab === "room" && sel >= 0 && me.room[sel]){
      const b = boxOf(me.room[sel]), g = cv.getContext("2d");
      g.strokeStyle = "#FFE14D"; g.setLineDash([4, 3]); g.lineWidth = 2;
      g.strokeRect(b.x * cv.width, b.y * cv.height, b.w * cv.width, b.h * cv.height);
      g.setLineDash([]);
    }
    const hint = w.client.querySelector("[data-cam-hint]");
    if (hint) hint.textContent = tab === "room" ? "Drag anything in your room to move it." : "Pick what you look like. It is only pixels; change it any time.";
  }

  const boxOf = (it) => Por.project(it, Por.zOf(it));

  function paintSel(w){
    const el = w.client.querySelector("[data-cam-sel]");
    const it = tab === "room" && me.room[sel];
    el.innerHTML = it ? "<b>" + esc((C.PIECES[it.p] || {}).name || it.p) + '</b><button class="w98btn" data-cam="nearer">Nearer</button>' +
      '<button class="w98btn" data-cam="further">Further</button><button class="w98btn" data-cam="bigger">Bigger</button>' +
      '<button class="w98btn" data-cam="smaller">Smaller</button><button class="w98btn" data-cam="remove">Take out</button>' : "";
  }

  function changed(smile){
    put();
    if (smile) smileUntil = Date.now() + 900;
    render();
  }

  function onClick(e){
    const b = e.target.closest("button");
    if (!b) return;
    const w = getWin(KEY);
    if (b.dataset.camTab){ tab = b.dataset.camTab; sel = -1; render(w); return; }
    if (b.dataset.k){ me.look[b.dataset.k] = b.dataset.v; changed(true); return; }
    if (b.dataset.room){ me[b.dataset.room] = b.dataset.v; changed(true); return; }
    if (b.dataset.add){ me.room.push(C.placeFor(b.dataset.add, me.room)); sel = me.room.length - 1; changed(true); return; }
    if (b.dataset.pick){ sel = Number(b.dataset.pick); render(w); return; }
    if (b.dataset.rm){ me.room.splice(Number(b.dataset.rm), 1); sel = -1; changed(false); return; }
    const it = me.room[sel];
    switch (b.dataset.cam){
      case "roll-you": me.look = C.roll(Math.random); changed(true); break;
      case "roll-room": Object.assign(me, C.rollRoom(Math.random)); sel = -1; changed(true); break;
      case "nearer": if (it){ it.z = Math.min(0.95, Por.zOf(it) + 0.1); changed(false); } break;
      case "further": if (it){ it.z = Math.max(0, Por.zOf(it) - 0.1); changed(false); } break;
      case "bigger": if (it){ it.w = Math.min(1.2, it.w * 1.15); it.h = Math.min(1.2, it.h * 1.15); changed(false); } break;
      case "smaller": if (it){ it.w = Math.max(0.05, it.w / 1.15); it.h = Math.max(0.05, it.h / 1.15); changed(false); } break;
      case "remove": if (it){ me.room.splice(sel, 1); sel = -1; changed(false); } break;
      case "done": finish(); break;
    }
  }
  function onInput(){ /* no free text in the builder */ }

  /* dragging things round the room */
  function onDown(e){
    if (tab !== "room") return;
    const cv = e.currentTarget, r = cv.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    let hit = -1, best = -1;
    me.room.forEach((it, i) => {
      const b = boxOf(it), z = Por.zOf(it);
      if (fx >= b.x && fx <= b.x + b.w && fy >= b.y && fy <= b.y + b.h && z >= best){ hit = i; best = z; }
    });
    sel = hit;
    if (hit >= 0){ drag = { i: hit, fx, fy, x: me.room[hit].x, y: me.room[hit].y, r }; e.preventDefault(); }
    render();
  }
  function onMove(e){
    if (!drag) return;
    const it = me.room[drag.i];
    if (!it) { drag = null; return; }
    it.x = Math.round((drag.x + (e.clientX - drag.r.left) / drag.r.width - drag.fx) * 1000) / 1000;
    it.y = Math.round((drag.y + (e.clientY - drag.r.top) / drag.r.height - drag.fy) * 1000) / 1000;
    paintPreview();
  }
  function onUp(){ if (drag){ drag = null; put(); render(); } }

  function finish(){
    put();
    const w = getWin(KEY);
    if (w) closeWin(w);
    const f = onFinish; onFinish = null;
    if (f) f();
  }

  /* ── you, in the corner of a call ─────────────────── */
  function paintSelf(canvas, o = {}){
    if (!me) get();
    feed(canvas, o);
  }

  /* ── the guide: your own camera talks you through setup ─
   * Nobody else is on this call. It is you, checking your camera works and
   * saying out loud how the job goes, the way people do before a first day.
   * `show` lights up the desktop shortcut the line is about. */
  const GKEY = "camera:guide";
  const STEPS = [
    { say: ["Okay. Camera's on.", "That's me. I look like someone people would pay."], next: "Hi, me" },
    { say: ["What do clients call me?"], ask: "name", next: "That's me" },
    { say: ["Work comes from gigslist. Small jobs from real people.", "Replying to a post is how it starts."], show: "gigslist", next: "Got it" },
    { say: ["When someone bites, they page me. Then it's a call.", "They only have so much patience, so I pick my questions."], show: "pager", next: "Got it" },
    { say: ["Before the call, and during it, I read their site.", "With clipping on, the right passage becomes a card. The wrong one costs me time."], show: "browser", next: "Got it" },
    { say: ["Then I make it in the Design Suite and send it back.", "Good work gets me known. Some clients never post at all."], show: "suite", next: "Got it" },
    { say: ["I can fix my hair or my room any time: Start, then Camera.", "Right. Let's find something."], next: "Open gigslist", end: true },
  ];
  let gi = 0, typed = 0, typeTimer = 0, guideDone = null;

  const lines = () => STEPS[gi].say.join(" ");
  const nameOf = () => (get().name || "").trim();

  function guide(opts = {}){
    get();
    guideDone = opts.onDone || guideDone;
    gi = typeof me.guide === "number" ? Math.min(me.guide, STEPS.length - 1) : 0;
    let w = getWin(GKEY);
    if (!w){
      w = createWindow({ key: GKEY, title: "Your camera", iconId: "camera", w: 300, h: 420, minW: 280, minH: 400,
                         className: "w98--camguide", onClose: () => { clearInterval(typeTimer); hint(null); } });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", onGuideClick);
      w.client.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("[data-cam-name]")) step(1); });
      const desk = document.querySelector(".desk") || document.body, dr = desk.getBoundingClientRect();
      w.el.style.left = Math.max(8, dr.width - 316) + "px";
      w.el.style.top = Math.max(8, dr.height - 470) + "px";
    }
    say();
    return w;
  }

  function say(){
    const w = getWin(GKEY), s = STEPS[gi];
    if (!w) return;
    typed = 0;
    w.client.innerHTML =
      '<div class="camg">' +
        '<div class="cam__stage cam__stage--sm"><canvas class="cam__feed" width="256" height="192"></canvas><span class="cam__rec">● YOU</span></div>' +
        '<p class="camg__said" data-said></p>' +
        (s.ask === "name" ? '<input class="camg__name" data-cam-name maxlength="24" placeholder="Your name, or what you go by" value="' + esc(nameOf()) + '">' : "") +
        '<div class="camg__bar"><button class="w98btn" data-g="skip">Skip setup</button><span></span>' +
          (gi > 0 ? '<button class="w98btn" data-g="back">Back</button>' : "") +
          '<button class="w98btn camg__next" data-g="next">' + esc(s.next) + "</button></div>" +
        '<p class="camg__step">' + (gi + 1) + " of " + STEPS.length + "</p>" +
      "</div>";
    hint(s.show || null);
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      const ww = getWin(GKEY);
      if (!ww){ clearInterval(typeTimer); return; }
      typed = Math.min(lines().length, typed + 2);
      ww.client.querySelector("[data-said]").textContent = lines().slice(0, typed);
      const talking = typed < lines().length, t = Date.now();
      feed(ww.client.querySelector(".cam__feed"), { mouthOpen: talking && Math.floor(t / 120) % 2 === 0, blink: (t % 3600) < 140,
        mood: talking ? "neutral" : "warm", bob: talking && Math.floor(t / 700) % 2 === 0 });
    }, 60);
    const input = w.client.querySelector("[data-cam-name]");
    if (input) setTimeout(() => input.focus(), 0);
  }

  // Lights up the shortcut the camera is talking about.
  function hint(key){
    document.querySelectorAll(".sc.sc--cam").forEach((el) => el.classList.remove("sc--cam"));
    if (key){ const el = document.querySelector('.sc[data-key="' + key + '"]'); if (el) el.classList.add("sc--cam"); }
  }

  function step(d){
    const w = getWin(GKEY);
    const input = w && w.client.querySelector("[data-cam-name]");
    if (input){ me.name = input.value.trim().slice(0, 24); }
    if (typed < lines().length && d > 0){ typed = lines().length; return; }   // first click finishes the sentence
    if (STEPS[gi].end && d > 0) return end(true);
    gi = Math.max(0, Math.min(STEPS.length - 1, gi + d));
    me.guide = gi; put();
    say();
  }

  function end(go){
    me.guide = "done"; put();
    clearInterval(typeTimer); hint(null);
    const w = getWin(GKEY);
    if (w) closeWin(w);
    const f = guideDone; guideDone = null;
    if (f) f(go);
  }

  function onGuideClick(e){
    const b = e.target.closest("[data-g]");
    if (!b) return;
    if (b.dataset.g === "next") step(1);
    else if (b.dataset.g === "back") step(-1);
    else if (b.dataset.g === "skip") end(false);
  }

  /* ── first run ──────────────────────────────────────── */
  // Build yourself, then let your camera talk you through the rest. A save
  // that stopped halfway picks up where it left off.
  function intro(onDone){
    get();
    if (me.guide === "done") return false;
    if (me.guide === 0 && !me.built) open({ intro: true, onDone: () => { me.built = true; put(); guide({ onDone }); } });
    else guide({ onDone });
    return true;
  }

  function init(access){
    io = access;
    if (!io.get()) io.set(C.fresh((Date.now() ^ (Math.random() * 1e9)) >>> 0));
    get();
  }
  const ready = () => !!(io && io.get() && io.get().guide === "done");

  return { init, open, guide, intro, paintSelf, ready, name: nameOf, current: () => get(), STEPS };
})());
