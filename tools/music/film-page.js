"use strict";
// The music video: one gig, start to finish, played in the game by this
// script while tools/music/film.js films it. A cursor you can see glides to
// each thing before it is clicked; the clicks and keys themselves are real
// input (sent through Electron), so the game reacts exactly as to a person.
// Captions say what the music is doing. The game is played as it is, except
// that two clocks are shortened so the deadline can be heard inside three
// minutes, three cards (the duck and two inks) are handed over rather than
// clipped, and "months later" is a cut straight to the full band.
(async () => {
  const ID = "weird-things-4";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const say = (m) => tool.log("film: " + m);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const shown = (el) => {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== "hidden" ? el : null;
  };
  async function until(fn, ms = 12000, what = "") {
    const end = performance.now() + ms;
    for (;;) {
      let v = null;
      try { v = fn(); } catch { v = null; }
      if (v) return v;
      if (performance.now() > end) throw new Error("waited too long for " + (what || fn.toString().slice(0, 90)));
      await wait(80);
    }
  }
  const byText = (sel, re, root = document) => $$(sel, root).find((el) => re.test(el.textContent) && shown(el)) || null;
  class Cut extends Error {}
  const scene = (name) => { say("scene " + name); if (window.__filmStop && window.__filmStop === name) throw new Cut("stopped after " + name); };

  // A take once found the call drawing with NaN. If a NaN reaches the game's
  // markup again, the log names the first one and the code that wrote it.
  const inner = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  let traced = false;
  Object.defineProperty(Element.prototype, "innerHTML", { configurable: true, get: inner.get, set(v) {
    if (!traced && typeof v === "string" && v.includes('"NaN"')) {
      traced = true;
      say("NaN markup into " + (this.className || this.tagName) + ": " + v.slice(Math.max(0, v.indexOf("NaN") - 90), v.indexOf("NaN") + 8) + " | " + new Error().stack.split("\n").slice(2, 6).map((l) => l.trim()).join(" < "));
    }
    return inner.set.call(this, v);
  } });

  /* ── the cursor you can see ───────────────────────────── */
  const ARROW = ["k..........", "kk.........", "kwk........", "kwwk.......", "kwwwk......", "kwwwwk.....",
    "kwwwwwk....", "kwwwwwwk...", "kwwwwwwwk..", "kwwwwwwwwk.", "kwwwwwkkkkk", "kwwkwwk....",
    "kwk.kwwk...", "kk..kwwk...", "k....kwwk..", ".....kwwk..", "......kk..."];
  let rects = "";
  ARROW.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== ".") rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (row[x] === "k" ? "#000" : "#fff") + '"/>'; });
  const cur = document.createElement("div");
  cur.innerHTML = '<svg viewBox="0 0 11 17" width="22" height="34" shape-rendering="crispEdges">' + rects + "</svg>";
  cur.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;line-height:0;filter:drop-shadow(1px 1px 0 rgba(0,0,0,.4))";
  document.body.appendChild(cur);
  let cx = 1060, cy = 560;
  const place = () => { cur.style.transform = "translate(" + Math.round(cx) + "px," + Math.round(cy) + "px)"; };
  place();

  async function glide(x, y, ms) {
    const x0 = cx, y0 = cy, d = Math.hypot(x - x0, y - y0);
    ms = ms || Math.min(950, 260 + d * 0.9);
    const t0 = performance.now();
    for (;;) {
      const k = Math.min(1, (performance.now() - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      cx = x0 + (x - x0) * e; cy = y0 + (y - y0) * e - Math.sin(Math.PI * k) * Math.min(40, d * 0.08);   // a slight arc, like a hand
      place();
      await tool.input({ type: "mouseMove", x: Math.round(cx), y: Math.round(cy) });
      if (k >= 1) break;
      await wait(16);
    }
    cx = x; cy = y; place();
  }
  const centre = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; };
  async function press(x, y, count = 1) {
    await tool.input({ type: "mouseDown", x, y, button: "left", clickCount: count });
    await wait(70);
    await tool.input({ type: "mouseUp", x, y, button: "left", clickCount: count });
  }
  // Click an element (or a selector, or a point), after gliding there.
  async function click(target, o = {}) {
    let el = target;
    if (typeof target === "string") el = await until(() => shown($(target)), o.ms || 12000, target);
    if (el && el.nodeType === 1) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      await wait(40);
    }
    const p = el && el.nodeType === 1 ? centre(el) : el;
    const x = Math.round(p.x + (o.dx || 0)), y = Math.round(p.y + (o.dy || 0));
    const what = el && el.nodeType === 1 ? (el.className || el.tagName).toString().split(" ")[0] + " " + (el.textContent || "").trim().slice(0, 24) : "point";
    if (!Number.isFinite(x) || !Number.isFinite(y)) { say("skipped a click with no position: " + what); return; }
    say("click " + what + " @" + x + "," + y);
    await glide(x, y);
    await wait(o.hover == null ? 140 : o.hover);
    await press(x, y, 1);
    if (o.count === 2) { await wait(60); await press(x, y, 2); }
    await wait(o.after == null ? 350 : o.after);
  }
  // Real keys. The hidden copy may not be taking keys; then the text is set
  // the way a paste would, and the page still hears it as input.
  async function typeInto(el, text, cps = 13) {
    el.focus();
    const before = el.value;
    for (const ch of text) {
      await tool.input({ type: "char", keyCode: ch });
      await wait((1000 / cps) * (0.55 + Math.random() * 0.9));
    }
    if (el.value === before || !el.value.includes(text)) {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  async function guideNext() {
    const step = () => (($(".w98--camguide .camg__step") || {}).textContent || "") + "|" + !!shown($(".w98--camguide [data-cam-name]"));
    const before = step();
    for (let i = 0; i < 5; i++) {
      const b = shown($('.w98--camguide [data-g="next"]'));
      if (!b) return;
      await click(b, { after: 900 });
      if (step() !== before || !shown($(".w98--camguide"))) return;
    }
    throw new Error("the guide would not move on from " + before);
  }
  // Close a window with its own close button, if it is up.
  async function closeWin98(sel) {
    const w = typeof sel === "string" ? shown($(sel)) : shown(sel);
    if (w) await click(w.querySelector('[data-w="cls"]'), { after: 450, hover: 90 });
  }
  function setField(el, value) {
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /* ── captions and cards ───────────────────────────────── */
  const cap = document.createElement("div");
  cap.style.cssText = "position:fixed;left:24px;bottom:54px;z-index:2147483646;pointer-events:none;display:flex;max-width:660px;" +
    "opacity:0;transform:translateY(10px);transition:opacity .45s ease,transform .45s ease;box-shadow:4px 4px 0 rgba(0,0,0,.45)";
  document.body.appendChild(cap);
  function caption(tag, colour, text) {
    cap.innerHTML =
      '<b style="display:flex;align-items:center;padding:0 14px;background:' + colour + ';color:#0B0B0B;font:400 16px Silkscreen,monospace;letter-spacing:.06em">' + tag + "</b>" +
      '<span style="padding:9px 16px 10px;background:rgba(9,11,14,.9);color:#F4F1EA;font:24px/1.05 VT323,monospace">' + text + "</span>";
    cap.style.opacity = "1"; cap.style.transform = "none";
    say("caption " + tag);
  }
  const uncaption = () => { cap.style.opacity = "0"; cap.style.transform = "translateY(10px)"; };

  const card = document.createElement("div");
  card.style.cssText = "position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" +
    "background:#05080A;color:#F4F1EA;text-align:center;opacity:0;transition:opacity .9s ease;pointer-events:none";
  document.body.appendChild(card);
  function showCard(big, line, foot) {
    card.innerHTML =
      '<div style="font:400 48px Silkscreen,monospace;letter-spacing:.08em;color:#FFCE6A">' + big + "</div>" +
      '<div style="font:34px VT323,monospace;color:#F4F1EA">' + line + "</div>" +
      '<div style="font:400 16px Silkscreen,monospace;letter-spacing:.08em;color:#7CF9C0;margin-top:10px">' + foot + "</div>";
    card.style.opacity = "1";
  }
  const hideCard = () => { card.style.opacity = "0"; };

  /* ── recording ────────────────────────────────────────── */
  const stream = Music.tap();
  const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const recStarted = new Promise((r) => { rec.onstart = () => r(performance.now()); });
  rec.start(1000);
  const tAudio = await recStarted, tAsk = performance.now();
  await tool.rec(true);
  const audioLead = (tAsk + performance.now()) / 2 - tAudio;

  // The two clocks, short enough to hear run out.
  const gig = HUSTLE.gigs[ID];
  gig.research = Object.assign({}, gig.research, { seconds: 34 });
  gig.deadline = 80;

  const report = { audioLead };
  try {
    /* 0 · the world side, before anything plays */
    showCard("PIXEL CROSSING", "the desk plays its own music", "ONE GIG, START TO FINISH");
    await wait(4200);
    hideCard();
    await wait(900);
    await click("#pickerBtn", { after: 600 });
    await click(await until(() => shown($("#pickerList [role=option]")), 5000, "the disciplines"), { after: 200 });

    scene("world");
    /* 1 · the desk: the camera builder, sparse hub */
    const done = await until(() => shown($(".w98--cam .cam__done")), 15000, "the camera builder");
    await wait(1600);
    caption("HUB", "#FFCE6A", "The desk. Nobody knows you yet, so the band is small: keys, a lazy bass, vinyl.");
    const ths = $$(".w98--cam .cam__opts .cam__th").filter(shown);
    for (const i of [9, 12]) if (ths[i]) await click(ths[i], { after: 800 });
    const sw = $$(".w98--cam .cam__sw").filter(shown);
    if (sw[18]) await click(sw[18], { after: 900 });
    await click(done, { after: 900 });

    /* 2 · the setup guide */
    await until(() => shown($('.w98--camguide [data-g="next"]')), 8000, "the guide");
    await wait(1500);
    await guideNext();
    const nameBox = await until(() => shown($(".w98--camguide [data-cam-name]")), 8000, "the name box");
    await click(nameBox, { after: 200 });
    nameBox.select();
    await typeInto(nameBox, "Pix");
    await wait(500);
    await guideNext();
    uncaption();
    await wait(1200);
    await guideNext();                                                          // "Open gigslist"
    const skip = shown($('.w98--camguide [data-g="skip"]'));
    if (skip) await click(skip, { after: 600 });                                // the rest of the tour, another day

    scene("setup");
    /* 3 · the board: hunt */
    const post = await until(() => byText(".w98--web a", /zine cover/i), 12000, "the zine post");
    caption("HUNT", "#7CF9C0", "Anything in the browser: plucked bass and a curious marimba. It changes on the next bar line.");
    await wait(2600);
    await click(post, { after: 1600 });
    await click('[data-hx="reply"]', { after: 400 });

    scene("board");
    /* 4 · the call */
    await until(() => shown($(".w98--call")), 10000, "the call");
    caption("CALL", "#9FB4B8", "A client picks up. The music steps back and muffles, like a laptop speaker.");
    // The call re-draws its buttons as lines arrive, so a click can land on
    // one that is being replaced: check the question was asked, and ask again.
    const said = () => ((Hustle.debug().gigs[ID] || {}).dlg || { log: [] }).log.length;
    const ask = async (id, ms = 20000) => {
      for (let attempt = 0; ; attempt++) {
        const b = await until(() => shown($('.w98--call [data-cl="ask"][data-opt="' + id + '"]')), ms, "the question " + id);
        const before = said();
        await click(b, { after: 200, hover: 80 });
        const took = await until(() => said() > before || shown($(".w98--call .cl__wait")), 2500).catch(() => false);
        if (took) break;
        if (attempt === 2) throw new Error("the question " + id + " would not take");
        say("the question " + id + " did not take; again");
      }
      await until(() => !shown($(".w98--call .cl__wait")) || shown($(".w98--call .cl__over")), 25000, "their answer");
      await wait(800);
    };
    // Our turn: read their field notes while the glass is still full, so the
    // notes are on a card before we ask who saw it.
    await until(() => shown($('.w98--call [data-cl="ask"]')), 25000, "our turn");
    await click('.w98--call [data-cl="visit"]', { after: 500, hover: 60 });
    const notes = await until(() => byText(".w98--web .ie__view a", /field notes/i), 8000, "the field notes link");
    await click(notes, { after: 600, hover: 60 });
    const witnesses = await until(() => byText(".w98--web .ie__view td, .w98--web .ie__view dd, .w98--web .ie__view li", /fishermen/i), 8000, "the witnesses line");
    witnesses.scrollIntoView({ block: "center" });
    caption("CLIPS", "#7CF9C0", "Clipping lands on the beat, in the key of the bar.");
    await click(witnesses, { after: 500, hover: 80 });
    await ask("subject");
    await ask("seen");
    const read = await until(() => shown($(".w98--call .cl__opt--win")), 20000, "the question you earned");
    caption("READ IT", "#F2C94C", "You read their notes mid-call, so a better question opens up.");
    await click(read, { after: 600 });
    await until(() => !shown($(".w98--call .cl__wait")), 20000, "their answer");
    await wait(900);
    uncaption();
    await ask("cover");
    await ask("print");
    await ask("done");
    await until(() => shown($(".w98--call .cl__over")) || Hustle.progress().stage === "research", 20000, "the call to end");
    await wait(1400);
    await closeWin98(".w98--call");                                        // they hang up; so do we

    scene("call");
    /* 5 · research, against a clock */
    await closeWin98(".w98--pager");
    caption("CLIPS", "#7CF9C0", "Research. A run of good finds climbs the chord.");
    const canoe = await until(() => byText(".w98--web .ie__view td, .w98--web .ie__view dd, .w98--web .ie__view li", /canoe/i), 8000, "the canoe line");
    await click(canoe, { after: 800 });
    const home = byText(".w98--web .ie__view nav a, .w98--web .ie__view a", /^\s*home\s*$/i) || byText(".w98--web .ie__view a", /weird things/i);
    if (home) await click(home, { after: 1100 });
    const riso = await until(() => byText(".w98--web .ie__view p", /risograph/i), 8000, "the risograph paragraph");
    riso.scrollIntoView({ block: "center", behavior: "smooth" });
    await wait(600);
    await click(riso, { after: 1000 });
    uncaption();

    // A picture: the Big Duck, from the image search.
    await closeWin98(".w98--pager");
    const finder = byText(".w98--web button, .w98--web a", /imagefinder/i);
    if (finder) await click(finder, { after: 1100 }); else { Web.go("http://imagefinder.web/"); await wait(1100); }
    const q = await until(() => shown($(".w98--web .ifind__form input[name=q]")), 8000, "the search box");
    await click(q, { after: 150 });
    await typeInto(q, "mallard duck");
    await wait(250);
    await tool.input({ type: "keyDown", keyCode: "Enter" });
    await tool.input({ type: "keyUp", keyCode: "Enter" });
    await wait(900);
    if (!shown($(".w98--web .ifr"))) { Web.go("http://imagefinder.web/?q=" + encodeURIComponent("mallard duck")); await wait(1400); }
    const result = await until(() => shown($$(".w98--web .ifr")[1]) || shown($(".w98--web .ifr")), 10000, "the results");
    await click(result, { after: 1700 });
    const duckSrc = (shown($(".lb img")) || result.querySelector("img")).src;
    Suite.addCards([{ kind: "object", label: "Mallard duck", value: duckSrc, tags: ["duck", "bird"], source: { url: "http://imagefinder.web/?q=mallard%20duck", ref: "film:duck" } }]);
    await closeWin98($$(".w98").find((w) => w.querySelector(".lb")));

    // While the clock runs down: what the rivals do, and nobody does.
    caption("DEADLINE", "#FF6B5A", "The clock is running out: a ticking clock and a floor tom come in on top.");
    await closeWin98(".w98--pager");
    const cmp = shown($('.w98--web [data-hx="compare"]'));
    if (cmp) { await click(cmp, { after: 4200 }); await closeWin98(".w98--compare"); }

    // Time runs out; the pager says so, and its balloon opens the suite.
    const balloon = await until(() => shown($(".balloon--hx.on")) && /time is up/i.test($(".balloon--hx").textContent) && $(".balloon--hx"), 45000, "research to run out");
    await wait(1300);
    uncaption();
    await click(balloon.querySelector(".balloon__b") || balloon, { after: 1100 });

    scene("research");
    /* 6 · the studio */
    await click(await until(() => shown($('.su__app[data-app="banner"]')), 10000, "the suite launcher"), { after: 1300 });
    const ed = await until(() => $$(".w98--suite").find((w) => shown(w.querySelector(".su__cv"))), 10000, "the editor");
    await closeWin98($$(".w98").find((w) => w.querySelector(".su__app")));    // the launcher has done its job
    await closeWin98(".w98--pager");
    await click(ed.querySelector(".tbar__t"), { count: 2, after: 700 });       // the whole desk for the canvas
    caption("STUDIO", "#FF48B0", "The Design Suite: pulse arpeggios, a triangle bass, four on the floor.");
    Suite.addCards([
      { kind: "colour", label: "Riso fluorescent pink", value: "#FF48B0", source: { url: "http://weirdthingszine.net/", ref: "film:pink" } },
      { kind: "colour", label: "Riso blue", value: "#0078BF", source: { url: "http://weirdthingszine.net/", ref: "film:blue" } },
    ]);
    const preset = ed.querySelector('[data-s="preset"]');
    await click(preset, { after: 300 });
    setField(preset, [...preset.options].findIndex((o) => /zine/i.test(o.textContent)));
    await click(ed.querySelector('[data-s="new"]'), { after: 700 });
    await click(ed.querySelector('[data-s="fit"]'), { after: 500 });
    const bg = ed.querySelector('.su__props [data-p="bg"]');
    if (bg) { await click(bg, { after: 250 }); setField(bg, "#F4F0E6"); await wait(600); }
    uncaption();

    const cv = () => ed.querySelector(".su__cv");
    const at = (x, y) => { const r = cv().getBoundingClientRect(), k = r.width / 550; return { x: r.left + x * k, y: r.top + y * k }; };
    const cardEl = (re) => $$(".su__tray .cd[data-card]", ed).find((c) => re.test(c.title + " " + c.textContent));

    const duck = await until(() => cardEl(/mallard/i), 6000, "the duck card");
    await click(duck, { after: 600 });
    for (const [p, v] of [["w", 470], ["h", 352], ["x", 40], ["y", 236]]) { const f = ed.querySelector('.su__props [data-p="' + p + '"]'); if (f) setField(f, v); await wait(140); }
    await wait(600);

    const words = [
      { text: "WEIRD THINGS", x: 40, y: 70, size: 60, ink: /pink/i },
      { text: "FOUR WITNESSES", x: 40, y: 620, size: 44, ink: /blue/i },
      { text: "ISSUE 4", x: 40, y: 700, size: 66, ink: /pink/i },
    ];
    for (const wd of words) {
      await click(ed.querySelector('[data-tool="text"]'), { after: 250 });
      await click(at(wd.x + 30, wd.y + 20), { after: 400 });
      const ta = await until(() => shown(ed.querySelector('.su__props [data-p="text"]')), 5000, "the text box");
      ta.select();
      await typeInto(ta, wd.text, 11);
      const size = ed.querySelector('.su__props [data-p="size"]');
      if (size) { setField(size, wd.size); await wait(300); }
      for (const [p, v] of [["x", wd.x], ["y", wd.y]]) { const f = ed.querySelector('.su__props [data-p="' + p + '"]'); if (f) setField(f, v); }
      await wait(300);
      await click(cardEl(wd.ink), { after: 650 });
    }
    await click(at(500, 590), { after: 900 });                               // step back from it: nothing selected

    scene("studio");
    /* 7 · delivered */
    await click(ed.querySelector('[data-s="deliver"]'), { after: 900 });
    const ok = shown($$(".w98 [data-ok]").pop());
    if (ok) await click(ok, { after: 600 });
    await until(() => Hustle.progress().stage === "delivered", 12000, "the delivery");
    const r = Hustle.debug().gigs[ID].result || {};
    report.stars = r.stars; report.total = r.total;
    caption("DELIVERED", "#F2C94C", (r.stars || 0) + " stars. The notes on delivery grow with the stars.");
    await wait(2400);
    await closeWin98(".w98--pager");
    Hustle.openTicket(ID);                                                    // the review, line by line
    await wait(4400);
    uncaption();

    scene("delivered");
    /* 8 · later: the whole band */
    for (const w of [...wins.values()]) minimizeWin(w);                     // a cut: months pass
    Music.set({ fullness: 0.75 });
    caption("LATER", "#F4F1EA", "A few months on, people know your name, so the whole band plays.");
    await glide(700, 420, 900);
    await wait(5200);                                                          // the bare desk: hub
    const task = (re) => $$("#tasks .task").find((el) => re.test(el.textContent));
    const webTask = task(/the web/i);
    if (webTask) await click(webTask, { after: 5200 });                        // the browser: hunt
    const edTask = task(/banner/i);
    if (edTask) await click(edTask, { after: 5600 });                          // the suite: studio
    uncaption();
    Music.stop();                                                              // it fades under the card
    showCard("PIXEL CROSSING", "every note synthesized live on the desk", "D MAJOR · 96 BPM · THREE ARRANGEMENTS, ONE TUNE");
    await wait(5200);
  } catch (e) {
    if (e instanceof Cut) { report.cut = e.message; say(e.message); }
    else report.error = String((e && e.message) || e);
  }
  if (report.error) {
    say("stopped early: " + report.error);
    caption("…", "#FF6B5A", "(the take stopped here)");
    await wait(1500);
  }

  /* ── wrap: stop both at once, save the music ──────────── */
  rec.stop();
  const [pictureSeconds] = await Promise.all([tool.rec(false), new Promise((r) => { rec.onstop = r; })]);
  report.pictureSeconds = pictureSeconds;
  const blob = new Blob(chunks, { type: "audio/webm" });
  const buf = await new AudioContext().decodeAudioData(await blob.arrayBuffer());
  const x = buf.getChannelData(0), n = x.length;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(x[i]));
  const gain = peak > 0.891 ? 0.891 / peak : 1;                                            // -1 dBFS at most
  const bytes = new ArrayBuffer(44 + n * 2), dv = new DataView(bytes);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, buf.sampleRate, true); dv.setUint32(28, buf.sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(x[i] * gain * 32767))), true);
  report.audioSeconds = +(n / buf.sampleRate).toFixed(2);
  report.audioGainDb = +(20 * Math.log10(gain)).toFixed(1);
  await tool.save("music.wav", bytes);
  await tool.done(report);
})().catch((e) => tool.done({ error: String((e && e.stack) || e) }));
