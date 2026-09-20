"use strict";
/* ── Hustle ───────────────────────────────────────────────
 * The game half of Pixel Crossing. Everything happens inside the desktop:
 *
 *   find      gigslist posts, the crawler, and brand ads whose domains you
 *             have to work out and type in yourself
 *   brief     a video call. The questions you ask decide what the ticket
 *             says, the client only has so much attention, and an hourglass
 *             runs on every pause — see meeting.js for the rules
 *   research  timed: clip facts and rival trends off pages, cut things out of
 *             pictures, and prove the gap on the comparison grid
 *   make      in the design suite, with the cards you found
 *   deliver   scored offline, line by line; reputation opens doors
 *
 * Game state lives in the Hustle save slot under `state.hustle`. Content is
 * HUSTLE (content.js); the rules are HustleDialogue, HustleResearch and
 * HustleScore, which are pure and tested on their own.
 */

const Hustle = (() => {
  const H = HUSTLE, Dlg = HustleDialogue, Mtg = HustleMeeting, Res = HustleResearch, Sc = HustleScore;
  const Por = typeof Portraits !== "undefined" ? Portraits : null;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const GL = (path) => "http://" + H.GIGSLIST + (path || "/");
  const SYSTEM = "gigslist";
  const CLIP_MISS = 5, GAP_MISS = 30, GAP_TRIES = 2;
  // The pen is a core tool now: drawing characters by eye needs it from day one.
  const UNLOCKS = [[5, "snap", "Snap to grid"], [10, "align", "Align"], [16, "gradient", "Gradients"], [24, "mirror", "Mirror drawing"]];

  let state = null;
  let clipping = true;
  let focusId = null;              // the gig the browser toolbar is about
  let tickN = 0;
  let trayEl = null, pagerTrayEl = null, balloonEl = null, balloonTimer = 0;
  let pagerSel = null;
  let renderTimer = 0;
  let callTimer = 0;               // one interval drives every open call
  const callAnim = {};             // per-call blink, speech and dropped frames

  const G = () => state.hustle;
  const gigOf = (id) => H.gigs[id] || null;
  const gsOf = (id) => G().gigs[id] || (G().gigs[id] = {});
  const save = () => Bridge.saveState(state);
  const now = () => Date.now();
  const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
  const clock = (sec) => { const s = Math.max(0, Math.round(sec)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const siteClient = (dom) => (typeof CLIENTS !== "undefined" ? CLIENTS["HUSTLE:" + dom] : null) || null;

  /* ── boot ──────────────────────────────────────────────── */
  async function boot() {
    state = await Bridge.getState();
    const h = state.hustle && typeof state.hustle === "object" ? state.hustle : {};
    state.hustle = {
      v: 1,
      rep: Math.max(0, Math.min(100, Number(h.rep) || 0)),
      gigs: h.gigs && typeof h.gigs === "object" ? h.gigs : {},
      prospects: h.prospects && typeof h.prospects === "object" ? h.prospects : {},
      threads: h.threads && typeof h.threads === "object" ? h.threads : {},
      welcomed: !!h.welcomed,
    };

    if (typeof RoomEdit !== "undefined") RoomEdit.applySaved(state);
    registerSites();
    Sites.registerHost(H.GIGSLIST, renderGigslist);
    Sites.registerHost(H.CRAWLER, renderCrawler);
    H.parked.forEach((d) => Sites.registerHost(d, renderParked));

    Web.unlock();
    Web.setHome(GL("/"));
    Web.addFav("gigslist", GL("/"));
    Web.addFav("crawler", "http://" + H.CRAWLER + "/");
    Web.addFav("imagefinder", Sites.home());
    Web.setTools(tools);
    Web.onNavigate(onNavigate);

    mountTray();
    if (!G().welcomed) {
      G().welcomed = true;
      post(SYSTEM, "sys", [
        "Welcome to gigslist.",
        "Small jobs from real people. Reply to a post and the client will page you here.",
        "Do good work and people start to hear about you. Some of them never post at all.",
      ]);
      balloon("Welcome to Hustle", "Open gigslist to find your first gig.", () => Web.visit(GL("/")));
    }
    focusId = activeGigs()[0] || null;
    checkChains();
    checkInbound();
    save();
    paintTray();
    setInterval(tick, 1000);
  }

  function registerSites() {
    for (const [dom, site] of Object.entries(H.sites)) {
      const key = "HUSTLE:" + dom;
      const clash = Object.entries(CLIENTS).some(([k, c]) => k !== key && c.dom && c.dom.toLowerCase() === dom);
      if (!clash) CLIENTS[key] = JSON.parse(JSON.stringify(site));
    }
  }

  /* ── gigs: lookups ─────────────────────────────────────── */
  const stageOf = (id) => (G().gigs[id] && G().gigs[id].stage) || null;
  const activeGigs = () => Object.keys(H.gigs).filter((id) => ["research", "production"].includes(stageOf(id)));
  // Clipping is live during the briefing too: a designer who reads the site
  // before the call is the whole fantasy, and mid-call it costs sand rather
  // than research seconds.
  const CLIPPABLE_STAGES = ["research", "briefing"];
  const researchGig = () => {
    if (focusId && CLIPPABLE_STAGES.includes(stageOf(focusId))) return focusId;
    return Object.keys(H.gigs).find((id) => CLIPPABLE_STAGES.includes(stageOf(id))) || null;
  };
  const clippedFacts = (gs) => (gs && gs.found && gs.found.facts) || [];
  // One flip a call to start with; reputation buys you room to think.
  const flipsFor = () => (G().rep >= 24 ? 3 : G().rep >= 10 ? 2 : 1);

  // What the design suite sees as a job.
  function jobs() {
    return activeGigs().map((id) => {
      const gig = gigOf(id);
      const client = siteClient(gig.poster.site);
      return {
        id, ci: Math.max(0, CATS.findIndex((c) => c.id === gig.discipline)),
        brief: { project: gig.short, client: gig.poster.name, ask: gig.title, deliver: [], limits: [], tone: "" },
        client: client ? { ...client, refs: (gig.refs || []).map((r) => r.q) } : null,
      };
    });
  }

  /* ── the Pager: threads ────────────────────────────────────
   * Messages are stored with the time they should appear. Replies are written
   * into state the moment they are decided, but show up after a typing delay —
   * so a reload mid-conversation loses nothing, and the pace still feels human.
   */
  function thread(handle) {
    const t = G().threads[handle];
    if (t) return t;
    const gig = Object.values(H.gigs).find((g) => g.poster.handle === handle);
    return (G().threads[handle] = {
      handle,
      name: handle === SYSTEM ? "gigslist" : gig ? gig.poster.name : handle,
      site: gig ? gig.poster.site : H.GIGSLIST,
      msgs: [],
      read: 0,
    });
  }

  // Appends lines; "them" lines arrive one by one after a typing delay.
  function post(handle, who, lines, extra = {}) {
    const t = thread(handle);
    const last = t.msgs.length ? t.msgs[t.msgs.length - 1].at : 0;
    let at = Math.max(now(), last);
    for (const text of [].concat(lines)) {
      if (who === "them") at += 700 + Math.min(1800, String(text).length * 28);
      t.msgs.push({ who, text: String(text), at, ...extra });
    }
    scheduleRender();
    return at;
  }

  const visibleMsgs = (t) => t.msgs.filter((m) => m.at <= now());
  const typing = (t) => t.msgs.some((m) => m.at > now());
  const unread = (t) => Math.max(0, visibleMsgs(t).filter((m) => m.who !== "you").length - (t.read || 0));

  function scheduleRender() {
    clearTimeout(renderTimer);
    const pending = Object.values(G().threads).flatMap((t) => t.msgs.filter((m) => m.at > now()).map((m) => m.at));
    renderPager();
    paintTray();
    if (pending.length) renderTimer = setTimeout(scheduleRender, Math.max(60, Math.min(...pending) - now() + 30));
  }

  /* ── finding work ──────────────────────────────────────── */
  function reply(id) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || gs.stage) return;
    gs.stage = "contacted";
    gs.contactAt = now();
    post(gig.poster.handle, "you", "Hi " + gig.poster.name + " — I saw your post on gigslist and I'd like to help.");
    // Decided now; the answer shows up once they have "typed" it.
    if (G().rep >= (gig.minRep || 0)) startBriefing(id);
    else {
      gs.stage = "passed";
      post(gig.poster.handle, "them", ["Thanks for replying!", "I went with someone who has a few more reviews, sorry."]);
    }
    focusPager(gig.poster.handle);
    save();
    Web.repaint();
  }

  function pitch(id) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || (gs.stage && gs.stage !== "declined")) return;
    if (gs.stage === "declined" && G().rep < (gs.retryRep || 0)) return;
    const site = siteClient(gig.site);
    gs.stage = "contacted";
    post(gig.poster.handle, "you", "Hi — I'm a designer, and I'd love to work with " + (site ? site.co : gig.poster.name) + ". Is there anything you need?");
    if (G().rep >= (gig.minRep || 0)) startBriefing(id);
    else {
      gs.stage = "declined";
      gs.retryRep = Math.max(gig.minRep || 0, G().rep + 4);
      post(gig.poster.handle, "them", gig.pitchReject || ["Thanks, but not right now."]);
    }
    focusPager(gig.poster.handle);
    save();
    Web.refreshTools();
  }

  function startBriefing(id) {
    const gig = gigOf(id), gs = gsOf(id);
    gs.stage = "briefing";
    gs.dlg = Mtg.start(gig.dialogue, { flips: flipsFor() });
    gs.found = gs.found || Res.emptyFound();        // you may have read up already
    gs.logged = gs.dlg.log.length;
    gs.callAt = now();
    post(gig.poster.handle, "them", gs.dlg.log.map((m) => m.text));
    focusId = id;
    balloon(gig.poster.name + " is calling", "Pick up — they only have a few minutes.", () => openCall(id));
    openCall(id);
  }

  function choose(id, optionId) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || gs.stage !== "briefing") return;
    advance(id, Mtg.choose(gig.dialogue, gs.dlg, optionId, clippedFacts(gs)));
  }

  function flipGlass(id) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || gs.stage !== "briefing") return;
    advance(id, Mtg.flip(gig.dialogue, gs.dlg));
  }

  // Takes whatever the meeting rules returned and lets the rest of the desktop
  // catch up: the thread keeps the transcript, the ticket opens, research runs.
  function advance(id, next) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!next || next === gs.dlg) return;
    const fresh = next.log.slice(gs.logged || 0);
    gs.dlg = next;
    gs.logged = next.log.length;
    const t = thread(gig.poster.handle);
    for (const m of fresh) t.msgs.push({ who: m.who, text: String(m.text), at: now() });
    if (next.ended) endCall(id);
    save();
    renderCall(id);
    scheduleRender();
  }

  function endCall(id) {
    const gig = gigOf(id), gs = gsOf(id);
    const s = Mtg.summary(gs.dlg);
    const note = s.ended === "wrapped" ? "Call closed. Brief written to your ticket."
      : s.ended === "bored" ? "They hung up. The ticket keeps the gaps — the work is scored on them anyway."
      : s.ended === "drifted" ? "They drifted off and wrapped up on their own. What you never asked is still on the ticket."
      : "Nothing left to ask. Brief written to your ticket.";
    post(gig.poster.handle, "sys", note + " Research is open — the clock starts now.", { gig: id, cta: "ticket" });
    startResearch(id);
  }

  function startResearch(id) {
    const gig = gigOf(id), gs = gsOf(id);
    gs.stage = "research";
    gs.research = { left: (gig.research && gig.research.seconds) || 240 };
    gs.found = gs.found || Res.emptyFound();
    gs.gapTries = 0;
    focusId = id;
    save();
    Web.refreshTools();
    renderTicket(id);
    paintTray();
  }

  function endResearch(id, why) {
    const gig = gigOf(id), gs = gsOf(id);
    if (gs.stage !== "research") return;
    gs.stage = "production";
    gs.production = { used: 0 };
    clipping = true;
    post(gig.poster.handle, "sys", why === "time"
      ? "Research time is up. Make the work — deadline in " + Math.round(gig.deadline / 60) + " minutes."
      : "Research closed. Make the work — deadline in " + Math.round(gig.deadline / 60) + " minutes.", { gig: id, cta: "suite" });
    if (why === "time") balloon("Research time is up", gig.short + ": open the Design Suite and make it.", () => Suite.launcher(id));
    save();
    Web.refreshTools();
    renderTicket(id);
    renderCompare(id);
    paintTray();
  }

  /* ── research: clipping ────────────────────────────────── */
  const CLIPPABLE = "p, li, dd, dt, td, th, h1, h2, h3, figcaption, .stat, .blk-lede, .prs, .ad__txt";

  function clip(target, url) {
    const id = researchGig();
    if (!id) return;
    const gig = gigOf(id), gs = gsOf(id);

    // Official art is never a card: clipping a model sheet pins it to the
    // reference board, to draw from by eye.
    const fig = target.closest && target.closest("[data-pose]");
    if (fig && typeof RefBoard !== "undefined" && typeof Characters !== "undefined") {
      const [cid, pose] = fig.dataset.pose.split(":");
      if (Characters.has(cid, pose)) {
        RefBoard.pin({ src: Characters.art(cid, pose, { scale: 1 }), label: Characters.CAST[cid].name + " — " + pose, char: cid, pose });
        flash(fig, "hit");
        floatNote(fig, "Pinned to your ref board", "pin");
        webStatus("Pinned " + Characters.CAST[cid].name + " (" + pose + ") to your reference board. Look, don't copy.");
        return;
      }
    }
    // A fan artist's colour pick is an exact colour: that is the research.
    const sw = target.closest && target.closest(".sw[data-hex]");
    if (sw) {
      const name = (sw.querySelector(".sw__n") || {}).textContent || sw.dataset.hex;
      const n = Suite.addCards([{ kind: "colour", label: name.slice(0, 60), value: sw.dataset.hex, tags: ["colour-pick"], source: { url, ref: "pick:" + sw.dataset.hex } }]);
      flash(sw, n ? "hit" : "dupe");
      floatNote(sw, n ? "+ Colour card" : "Already a card", n ? "hit" : "dupe");
      webStatus(n ? "Colour card: " + name + " " + sw.dataset.hex : "Already on a card: " + name);
      return;
    }

    const el = target.closest && target.closest(CLIPPABLE);
    if (!el || !el.closest(".ie__view")) { webStatus("Clip a passage: a paragraph, a list item, a caption."); return; }
    const text = el.textContent.replace(/\s+/g, " ").trim();
    const dom = hostOf(url);
    const hit = Res.clip(gig, H.sites, dom, text, gs.found);

    if (!hit) {
      if (gs.stage === "briefing" && gs.dlg && !gs.dlg.ended) {
        gs.dlg.sand -= CLIP_MISS * 500;              // and they are still waiting
        flash(el, "miss");
        floatNote(el, "Nothing useful — they're waiting", "miss");
        webStatus("Nothing useful there — and they're still on the line.");
      } else if (gs.research) {
        gs.research.left = Math.max(0, gs.research.left - CLIP_MISS);
        flash(el, "miss");
        floatNote(el, "Nothing useful  −" + CLIP_MISS + "s", "miss");
        webStatus("Nothing useful there. −" + CLIP_MISS + "s");
      }
    } else if (hit.kind === "dupe") {
      flash(el, "dupe");
      floatNote(el, "Already on a card", "dupe");
      webStatus("Already on a card: " + hit.item.label);
    } else {
      gs.found = Res.record(gs.found, hit);
      flash(el, "hit");
      floatNote(el, "+ " + (hit.kind === "fact" ? "Fact" : "Trend") + " card: " + hit.item.label, "hit");
      if (hit.kind === "fact") {
        Suite.addCards([{ kind: "fact", label: hit.item.label, value: text.slice(0, 400), tags: hit.item.tags.concat(["fact"]), source: { url, ref: "fact:" + hit.item.id } }]);
        webStatus("Fact card: " + hit.item.label);
      } else {
        const site = siteClient(dom);
        Suite.addCards([{ kind: "trend", label: hit.item.label, value: (site ? site.co + ": " : "") + text.slice(0, 380), tags: hit.item.tags.concat(["trend"]), source: { url, ref: "trend:" + hit.item.id } }]);
        webStatus("Trend card: " + hit.item.label + (Res.studied(gig, H.sites, gs.found, dom) ? " — that's everything on this rival." : ""));
      }
    }
    save();
    renderTicket(id);
    renderCompare(id);
    Web.refreshTools();                              // the "found here" count
    if (gs.research && gs.research.left <= 0) endResearch(id, "time");
  }

  function flash(el, kind) {
    el.classList.remove("hx-hit", "hx-miss", "hx-dupe");
    void el.offsetWidth;
    el.classList.add("hx-" + kind);
    setTimeout(() => el.classList.remove("hx-" + kind), 900);
  }

  // What a clip was worth, rising off the passage itself — where you are
  // looking — instead of only in the status bar at the foot of the window.
  function floatNote(el, text, kind) {
    const win = el.closest(".w98");
    if (!win) return;
    const wr = win.getBoundingClientRect(), r = el.getBoundingClientRect();
    const n = document.createElement("div");
    n.className = "hx-float hx-float--" + kind;
    n.textContent = text.length > 60 ? text.slice(0, 57) + "…" : text;
    n.style.left = Math.round(Math.max(8, Math.min(r.left - wr.left + 10, wr.width - 240))) + "px";
    n.style.top = Math.round(Math.max(34, Math.min(r.top - wr.top - 26, wr.height - 40))) + "px";
    win.appendChild(n);
    setTimeout(() => n.remove(), 1600);
  }

  // How much of what this site holds for the gig is already on cards. Every
  // fact names the site it is on, so the count is exact.
  function foundHere(id, host) {
    if (!host) return null;
    const gig = gigOf(id), found = gsOf(id).found || Res.emptyFound();
    const facts = (gig.facts || []).filter((f) => String(f.where || "").toLowerCase() === host);
    const trends = (gig.competitors || []).includes(host) ? Res.relevantTrends(gig, H.sites, host) : [];
    const got = facts.filter((f) => found.facts.includes(f.id)).length +
      trends.filter((t) => ((found.trends || {})[host] || []).includes(t.id)).length;
    return { got, total: facts.length + trends.length };
  }

  function webStatus(text) {
    const m = document.querySelector(".w98--web .ie__msg");
    if (m) m.textContent = text;
  }

  function tagsForQuery(q) {
    const nq = String(q).toLowerCase().trim();
    const tags = new Set();
    for (const id of activeGigs()) {
      for (const r of gigOf(id).refs || []) {
        const rq = r.q.toLowerCase();
        if (nq.includes(rq) || rq.includes(nq)) r.tags.forEach((t) => tags.add(t));
      }
    }
    return [...tags];
  }

  /* ── research: the gap ─────────────────────────────────── */
  function guessGap(id, featureId) {
    const gig = gigOf(id), gs = gsOf(id);
    if (gs.stage !== "research" || gs.gapFound || (gs.gapTries || 0) >= GAP_TRIES) return;
    const f = gig.features.find((x) => x.id === featureId);
    if (Res.guess(gig, featureId)) {
      gs.gapFound = featureId;
      Suite.addCards([{ kind: "gap", label: f.label, value: gig.gap.line, tags: [gig.gap.tag, "gap"], source: { url: "", ref: "gap:" + id } }]);
      balloon("You found the gap", f.label + ". Build on it and the client will notice.", () => renderTicket(id, true));
    } else {
      gs.gapTries = (gs.gapTries || 0) + 1;
      gs.research.left = Math.max(0, gs.research.left - GAP_MISS);
      gs.gapWrong = (gs.gapWrong || []).concat(featureId);
    }
    save();
    renderCompare(id);
    renderTicket(id);
    if (gs.research.left <= 0) endResearch(id, "time");
  }

  /* ── delivery ──────────────────────────────────────────── */
  /* ── likeness: the renderer's half ───────────────────────
   * For every subject marker, draw only the shapes sitting mostly inside it,
   * on their own, and hand the pixels to HustleLikeness.compare with the model
   * sheet. Images never count as drawing, so pasted art cannot pass as work. */
  const DRAWN = ["rect", "ellipse", "path"];

  function insideFrac(l, box) {
    const a = (l.rot || 0) * Math.PI / 180, cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    const hw = Math.abs(l.w / 2 * Math.cos(a)) + Math.abs(l.h / 2 * Math.sin(a));
    const hh = Math.abs(l.w / 2 * Math.sin(a)) + Math.abs(l.h / 2 * Math.cos(a));
    const x0 = Math.max(cx - hw, box.x), x1 = Math.min(cx + hw, box.x + box.w);
    const y0 = Math.max(cy - hh, box.y), y1 = Math.min(cy + hh, box.y + box.h);
    const area = 4 * hw * hh;
    return area > 0 && x1 > x0 && y1 > y0 ? ((x1 - x0) * (y1 - y0)) / area : 0;
  }

  function measureLikeness(doc) {
    const report = { subjects: {}, scaleOK: null, pasted: false };
    if (typeof Characters === "undefined" || typeof HustleLikeness === "undefined") return report;
    const official = new Set(Suite.cards().filter((c) => c.tags.includes("official-art")).map((c) => c.id));
    report.pasted = doc.layers.some((l) => l.type === "image" && !l.hidden && l.card && official.has(l.card));
    for (const sj of SuiteDoc.subjects(doc)) {
      const id = sj.ref.id, pose = sj.ref.pose;
      if (!Characters.has(id, pose)) continue;
      const ref = Characters.reference(id, pose);
      const shapes = doc.layers.filter((l) => DRAWN.includes(l.type) && !l.hidden && insideFrac(l, sj) >= 0.6);
      const s = Math.max(1, (ref.h * 2) / Math.max(1, sj.h));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.ceil(sj.w * s)); cv.height = Math.max(1, Math.ceil(sj.h * s));
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.setTransform(s, 0, 0, s, -sj.x * s, -sj.y * s);
      for (const l of shapes) SuiteRender.drawLayer(ctx, Object.assign({}, l, { opacity: 1 }));
      const r = HustleLikeness.compare(ref, { w: cv.width, h: cv.height, rgba: ctx.getImageData(0, 0, cv.width, cv.height).data });
      const entry = Object.assign({}, r, { pose, drawnH: r.drawn ? r.drawn.h / s : 0, shapes: shapes.length });
      if (!report.subjects[id] || entry.quality > report.subjects[id].quality) report.subjects[id] = entry;
    }
    const t = report.subjects.toma, k = report.subjects.kiyoshi;
    if (t && k && t.pose === k.pose) {
      report.scaleOK = HustleLikeness.relativeScale(t.drawnH, k.drawnH, Characters.heightOf("toma", t.pose), Characters.heightOf("kiyoshi", k.pose));
    }
    return report;
  }

  // Warnings before a delivery goes out — only about things the player knows
  // the client wants.
  function preflight(id, doc) {
    const gig = gigOf(id), gs = G().gigs[id];
    if (!gig || !gs) return [];
    const known = new Set((gs.dlg && gs.dlg.revealed) || []);
    const out = [];
    for (const need of gig.needs || []) {
      if (!need.subjects || !known.has(need.id)) continue;
      const marked = new Set(SuiteDoc.subjects(doc).map((l) => l.ref.id));
      for (const cid of need.subjects) {
        if (marked.has(cid)) continue;
        const name = typeof Characters !== "undefined" && Characters.CAST[cid] ? Characters.CAST[cid].name.split(" ")[0] : cid;
        out.push("Mark where " + name + " is: drag his pin from the reference board onto the canvas, or the on-model check can't find him.");
      }
    }
    return out;
  }

  function deliver(id, doc, appId) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || !["research", "production"].includes(gs.stage)) return { ok: false, reason: "That gig isn't open for delivery." };
    const late = gs.production ? Math.max(0, gs.production.used - gig.deadline) : 0;
    const r = Sc.score({ gig, doc, cards: Suite.cards(), appId, lateSeconds: late, likeness: measureLikeness(doc) });
    if (!r.ok) return r;
    if (gs.stage === "research") { gs.stage = "production"; gs.production = { used: 0 }; }

    const before = G().rep;
    gs.stage = "delivered";
    gs.result = { total: r.total, stars: r.stars, rep: r.rep, gap: r.gap, lines: r.lines, at: now(), appId };
    G().rep = Math.min(100, G().rep + r.rep);
    if (gig.output && doc.mode !== "layout") {
      try { gs.output = SuiteRender.toPNG(doc, doc.mode === "pixel" ? 4 : 1); } catch { gs.output = null; }
    }

    const handle = gig.poster.handle;
    post(handle, "you", "Here it is — " + (doc.meta.name || gig.short) + ".", { file: doc.meta.name || gig.short });
    post(handle, "them", gig.wrap[r.stars] || gig.wrap[3]);
    post(handle, "sys", "Review: " + r.total + "/100 · " + "★".repeat(r.stars) + "☆".repeat(5 - r.stars) + " · reputation +" + r.rep, { gig: id, cta: "review" });

    for (const [min, tool, label] of UNLOCKS) {
      if (before < min && G().rep >= min && Suite.unlock(tool)) {
        post(SYSTEM, "sys", "Your standing is now " + Sc.tier(G().rep) + ". New in the Design Suite: " + label + ".");
      }
    }
    focusId = activeGigs()[0] || null;
    focusPager(handle);
    balloon(gig.poster.name + " reviewed your work", "★".repeat(r.stars) + " · " + r.total + "/100", () => focusPager(handle));
    setTimeout(() => { checkChains(); checkInbound(); }, 5000);
    save();
    renderTicket(id);
    Web.repaint();
    paintTray();
    return { ok: true, result: r };
  }

  // A follow-up job from a client who liked the last one.
  function checkChains() {
    for (const [id, gig] of Object.entries(H.gigs)) {
      if (gig.kind !== "chain" || stageOf(id)) continue;
      const prev = G().gigs[gig.after.gig];
      if (!prev || prev.stage !== "delivered" || prev.result.stars < gig.after.minStars) continue;
      const parent = gigOf(gig.after.gig);
      if (parent.output && prev.output) {
        Suite.addCards([{ kind: "object", label: parent.output.label, value: prev.output, tags: parent.output.tags, source: { url: "", ref: "delivered:" + gig.after.gig } }]);
      }
      post(gig.poster.handle, "them", gig.invite || []);
      startBriefing(id);
      save();
    }
  }

  // Businesses that have heard of you get in touch with a brief of their own.
  function checkInbound() {
    for (const [id, gig] of Object.entries(H.gigs)) {
      if (!gig.inboundRep || G().rep < gig.inboundRep) continue;
      const st = stageOf(id);
      if (st && st !== "declined") continue;
      const gs = gsOf(id);
      G().prospects[gig.site] = G().prospects[gig.site] || { discovered: now() };
      gs.dlg = Dlg.premade(gig.dialogue, gig.needs.map((n) => n.id).concat(gig.limits.map((l) => l.id)));
      gs.inbound = true;
      post(gig.poster.handle, "them", gig.invite || ["We'd like to hire you."]);
      post(gig.poster.handle, "sys", "They sent a complete brief. It's on your ticket. Research is open.", { gig: id, cta: "ticket" });
      startResearch(id);
      balloon(gig.poster.name + " wants to hire you", gig.title, () => focusPager(gig.poster.handle));
    }
  }

  /* ── the clock ─────────────────────────────────────────── */
  function tick() {
    if (document.hidden || !state) return;
    tickN++;
    for (const id of Object.keys(H.gigs)) {
      const gs = G().gigs[id];
      if (!gs) continue;
      if (gs.stage === "research") {
        gs.research.left = Math.max(0, gs.research.left - 1);
        if (gs.research.left <= 0) endResearch(id, "time");
      } else if (gs.stage === "production") {
        gs.production.used += 1;
      }
    }
    if (tickN % 5 === 0) save();
    document.querySelectorAll("[data-hx-timer]").forEach((el) => { el.textContent = timerText(el.dataset.hxTimer); });
    paintTray();
  }

  function timerText(id) {
    const gig = gigOf(id), gs = G().gigs[id];
    if (!gig || !gs) return "";
    if (gs.stage === "research") return "research " + clock(gs.research.left);
    if (gs.stage === "production") {
      const left = gig.deadline - gs.production.used;
      return left >= 0 ? "due in " + clock(left) : "late " + clock(-left);
    }
    return "";
  }

  /* ── browser toolbar ───────────────────────────────────── */
  const tools = {
    html(url) {
      const host = hostOf(url);
      const parts = [];
      const rid = researchGig();
      if (rid) {
        const gig = gigOf(rid);
        parts.push('<button class="w98btn hx-tb' + (clipping ? " on" : "") + '" data-hx="clip" title="While clipping, clicking a passage turns it into a card">Clipping: ' + (clipping ? "on" : "off") + "</button>");
        parts.push('<span class="hx-tb__gig"><b>' + esc(gig.short) + '</b> <span class="hx-tb__t" data-hx-timer="' + rid + '">' + timerText(rid) + "</span></span>");
        parts.push('<button class="w98btn" data-hx="ticket" data-gig="' + rid + '">Ticket</button>');
        parts.push('<button class="w98btn" data-hx="compare" data-gig="' + rid + '">Compare rivals</button>');
        const here = foundHere(rid, host);
        if (here) {
          parts.push('<span class="hx-tb__here' + (here.total && here.got === here.total ? " done" : "") + '" title="What this site holds for ' + esc(gig.short) + '">' +
            (here.total ? "Here: " + here.got + "/" + here.total + " clipped" : "Nothing here for this gig") + "</span>");
        }
      } else {
        const pid = activeGigs()[0];
        if (pid) parts.push('<span class="hx-tb__gig"><b>' + esc(gigOf(pid).short) + '</b> <span class="hx-tb__t" data-hx-timer="' + pid + '">' + timerText(pid) + '</span></span><button class="w98btn" data-hx="suite" data-gig="' + pid + '">Design Suite</button>');
      }
      const pg = pitchableAt(host);
      if (pg) parts.push('<button class="w98btn hx-tb--pitch" data-hx="pitch" data-gig="' + pg + '">Pitch ' + esc(siteClient(host).co) + "</button>");
      return parts.length ? '<span class="hx-tb__lbl">HUSTLE</span>' + parts.join("") : "";
    },
    clipping: () => clipping && !!researchGig(),
    clip,
    click(el, url, extra) {
      const a = el.dataset.hx, id = el.dataset.gig;
      if (a === "clip") { clipping = !clipping; Web.refreshTools(); }
      if (a === "ticket") renderTicket(id || researchGig(), true);
      if (a === "compare") renderCompare(id || researchGig(), true);
      if (a === "suite") Suite.launcher(id);
      if (a === "reply") reply(id);
      if (a === "pitch") pitch(id);
      if (a === "cut" && extra) {
        const tags = tagsForQuery(extra.q);
        Suite.cutoutFrom({ src: extra.src, label: extra.q, tags }, researchGig() || activeGigs()[0]);
      }
    },
    lightbox(q, i) {
      if (typeof Characters !== "undefined" && Characters.poseFor(q, i)) {
        return '<span class="lb__hint">Official art. No screenshots in fan work: pin it, and draw by eye.</span>';
      }
      return activeGigs().length
        ? '<button class="w98btn" data-hx="cut">Cut out…</button><span class="lb__hint">' +
          (tagsForQuery(q).length ? "Useful for your gig." : "Not obviously useful for your gig.") + "</span>"
        : "";
    },
  };

  function pitchableAt(host) {
    if (!host || !G().prospects[host]) return null;
    const id = Object.keys(H.gigs).find((k) => H.gigs[k].kind === "prospect" && H.gigs[k].site === host);
    if (!id) return null;
    const st = stageOf(id);
    if (!st) return id;
    if (st === "declined" && G().rep >= (gsOf(id).retryRep || 0)) return id;
    return null;
  }

  function onNavigate(page) {
    const host = hostOf(page.url);
    const pid = Object.keys(H.gigs).find((k) => H.gigs[k].kind === "prospect" && H.gigs[k].site === host);
    if (pid && !G().prospects[host]) {
      G().prospects[host] = { discovered: now() };
      const site = siteClient(host);
      balloon("Prospect found: " + (site ? site.co : host), "They never posted a gig. Pitch them from the toolbar.", null);
      save();
      Web.refreshTools();
    }
  }

  /* ── gigslist ──────────────────────────────────────────── */
  function renderGigslist(u) {
    const path = u.pathname.replace(/\/+$/, "") || "/";
    const listed = Object.entries(H.gigs).filter(([, g]) => g.kind === "listing");
    const ad = (k) => Sites.renderBlocks([H.ADS[k]], {});
    const chrome = (title, body) => ({
      title: title + " — gigslist",
      url: GL(path),
      html: '<div class="gl"><header class="gl__top"><a href="#" data-url="' + GL("/") + '" class="gl__logo">gigslist</a>' +
        '<span class="gl__area">online &gt; all areas &gt; creative gigs</span>' +
        '<span class="gl__you">your standing: <b>' + esc(Sc.tier(G().rep)) + "</b> (" + G().rep + ")</span></header>" +
        '<div class="gl__cols"><main class="gl__main">' + body + "</main>" +
        '<aside class="gl__side"><a href="#" data-url="' + GL("/help") + '">how gigs work</a>' + ad("kiln") + ad("dial") + "</aside></div>" +
        '<footer class="gl__foot">© gigslist · be kind · never pay to apply</footer></div>',
    });

    if (path === "/help") {
      return chrome("how gigs work", "<h2>how gigs work</h2><ol class=\"gl__help\">" +
        "<li>Reply to a post. If the poster likes the look of you, they page you.</li>" +
        "<li>Ask good questions. People only have so much patience, and whatever you don't ask about still counts.</li>" +
        "<li>Research before you make anything: their site, pictures, and the competition. You're on the clock.</li>" +
        "<li>Deliver from the Design Suite. You'll get a review, and your standing goes up.</li>" +
        "<li>Not every business posts here. Plenty advertise, though, and most live at their own name dot com.</li></ol>");
    }
    const m = path.match(/^\/gig\/([a-z0-9-]+)$/);
    if (m && H.gigs[m[1]] && H.gigs[m[1]].kind === "listing") {
      const id = m[1], gig = H.gigs[id], st = stageOf(id);
      let act;
      if (!st) act = '<button class="w98btn" data-hx="reply" data-gig="' + id + '">Reply to this post</button>';
      else if (st === "contacted" || st === "briefing") act = "<p class=\"gl__note\">You replied. Check your Pager.</p>";
      else if (st === "passed") act = "<p class=\"gl__note\">This gig went to someone else.</p>";
      else if (st === "delivered") act = "<p class=\"gl__note\">You delivered this one: " + "★".repeat(G().gigs[id].result.stars) + "</p>";
      else act = "<p class=\"gl__note\">You're on this job.</p>" + '<button class="w98btn" data-hx="ticket" data-gig="' + id + '">Open ticket</button>';
      return chrome(gig.title,
        "<h2>" + esc(gig.title) + "</h2>" +
        '<p class="gl__meta">posted ' + esc(gig.posted) + " · " + esc(gig.area) + " · compensation: <b>" + esc(gig.pay) + "</b></p>" +
        gig.listing.map((p) => "<p>" + esc(p) + "</p>").join("") +
        '<p class="gl__meta">' + (gig.minRep ? "wants: someone with a few reviews" : "wants: anyone good") + "</p>" + act);
    }
    const f = path.match(/^\/post\/(\d+)$/);
    if (f && H.listings[Number(f[1])]) {
      const l = H.listings[Number(f[1])];
      return chrome(l.title, "<h2>" + esc(l.title) + '</h2><p class="gl__meta">posted ' + esc(l.posted) + "</p><p class=\"gl__note\">" + esc(l.note) + "</p>");
    }
    if (path !== "/") return null;

    const rows = listed.map(([id, g]) => {
      const st = stageOf(id);
      const tag = !st ? "" : st === "passed" ? "filled" : st === "delivered" ? "done " + "★".repeat(G().gigs[id].result.stars) : st === "contacted" || st === "briefing" ? "replied" : "working";
      return { posted: g.posted, html: '<a href="#" data-url="' + GL("/gig/" + id) + '">' + esc(g.title) + '</a> <span class="gl__pay">(' + esc(g.pay) + ")</span>" + (tag ? ' <span class="gl__tag">' + tag + "</span>" : "") };
    }).concat(H.listings.map((l, i) => ({
      posted: l.posted, html: '<a href="#" class="gl__dead" data-url="' + GL("/post/" + i) + '">' + esc(l.title) + '</a> <span class="gl__tag gl__tag--' + l.status + '">' + l.status + "</span>",
    }))).sort((a, b) => (a.posted < b.posted ? 1 : -1));

    return chrome("creative gigs", "<h2>creative gigs</h2><ul class=\"gl__list\">" +
      rows.map((r) => '<li><span class="gl__date">' + esc(r.posted) + "</span> " + r.html + "</li>").join("") + "</ul>");
  }

  /* ── the crawler ───────────────────────────────────────── */
  function renderCrawler(u) {
    const q = (u.searchParams.get("q") || "").trim();
    const form = '<form class="cw__form" data-go="http://' + H.CRAWLER + '/?q="><input name="q" value="' + esc(q) + '" placeholder="Search the web" autocomplete="off"><button class="w98btn" type="submit">Crawl</button></form>';
    const logo = '<div class="cw__logo">Crawler<span>.web</span></div>';
    if (!q) {
      return { title: "Crawler", url: "http://" + H.CRAWLER + "/", html: '<div class="cw">' + logo + form + '<p class="cw__note">Indexing 31,402 pages, including some good ones.</p></div>' };
    }
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const results = H.index.map((e) => {
      const hay = (e.title + " " + e.snippet + " " + e.keywords.join(" ")).toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score += 1;
      for (const k of e.keywords) if (q.toLowerCase().includes(k)) score += 2;
      return { e, score };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
    const list = results.length
      ? results.map(({ e }) => '<li><a href="#" data-url="http://' + esc(e.dom) + '/">' + esc(e.title) + '</a><span class="cw__dom">' + esc(e.dom) + "</span><p>" + esc(e.snippet) + "</p></li>").join("")
      : '<li class="cw__none">No pages found. Try fewer words.</li>';
    return {
      title: q + " — Crawler", url: "http://" + H.CRAWLER + "/?q=" + encodeURIComponent(q),
      html: '<div class="cw cw--res"><div class="cw__top">' + logo + form + '</div><p class="cw__count">' + results.length + " pages for <b>" + esc(q) + "</b></p>" +
        '<div class="cw__cols"><ol class="cw__list">' + list + '</ol><aside class="cw__ads"><span class="cw__sp">Sponsored</span>' + Sites.renderBlocks([H.ADS.kiln], {}) + "</aside></div></div>",
    };
  }

  function renderParked(u) {
    return {
      title: u.hostname, url: "http://" + u.hostname + "/",
      html: '<div class="parked"><h1>' + esc(u.hostname) + "</h1><p>This domain may be for sale.</p><p class=\"parked__s\">Related searches: dial-up · free internet · 56k</p></div>",
    };
  }

  /* ── tray + balloon ────────────────────────────────────── */
  function mountTray() {
    const tray = document.querySelector(".tray");
    if (!tray || trayEl) return;
    pagerTrayEl = document.createElement("button");
    pagerTrayEl.className = "tray__mail";
    pagerTrayEl.type = "button";
    pagerTrayEl.title = "Pager";
    pagerTrayEl.innerHTML = "<i>" + iconSVG("pager", 14) + '</i><span class="tray__n"></span>';
    pagerTrayEl.addEventListener("click", () => openPager());
    trayEl = document.createElement("button");
    trayEl.className = "tray__hx";
    trayEl.type = "button";
    trayEl.addEventListener("click", () => {
      const id = activeGigs()[0];
      if (id) renderTicket(id, true); else Web.visit(GL("/"));
    });
    tray.insertBefore(trayEl, tray.firstChild);
    tray.insertBefore(pagerTrayEl, tray.firstChild);
  }

  function paintTray() {
    if (!trayEl || !state) return;
    const id = activeGigs().sort((a, b) => (stageOf(a) === "research" ? -1 : 1))[0];
    trayEl.innerHTML = '<b>★' + G().rep + "</b>" + (id ? '<span data-hx-timer="' + id + '">' + timerText(id) + "</span>" : "");
    trayEl.title = Sc.tier(G().rep) + (id ? " · " + gigOf(id).short : "");
    const n = Object.values(G().threads).reduce((k, t) => k + unread(t), 0);
    pagerTrayEl.classList.toggle("has", n > 0);
    pagerTrayEl.querySelector(".tray__n").textContent = n ? String(n) : "";
  }

  function balloon(title, text, onClick) {
    if (!balloonEl) {
      balloonEl = document.createElement("div");
      balloonEl.className = "balloon balloon--hx";
      document.getElementById("sideScreen").appendChild(balloonEl);
    }
    balloonEl.innerHTML = '<button class="balloon__x" data-x aria-label="Dismiss">&#215;</button>' +
      '<div class="balloon__h">' + iconSVG("pager", 14) + "<span>" + esc(title) + "</span></div>" +
      '<div class="balloon__b">' + esc(text) + "</div>";
    balloonEl.onclick = (e) => {
      balloonEl.classList.remove("on");
      if (!e.target.closest("[data-x]") && onClick) onClick();
    };
    balloonEl.classList.add("on");
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(() => balloonEl.classList.remove("on"), 9000);
  }

  /* ── Pager window ──────────────────────────────────────── */
  function focusPager(handle) {
    pagerSel = handle;
    openPager();
  }

  function openPager() {
    let w = getWin("pager");
    if (!w) {
      w = createWindow({ key: "pager", title: "PAGER", iconId: "pager", w: 620, h: 460, minW: 440, minH: 320, className: "w98--pager" });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", onPagerClick);
    }
    renderPager();
    return revealWin(w);
  }

  function renderPager() {
    const w = getWin("pager");
    if (!w || !state) return;
    const threads = Object.values(G().threads).sort((a, b) => lastAt(b) - lastAt(a));
    if (!pagerSel || !G().threads[pagerSel]) pagerSel = threads[0] ? threads[0].handle : null;
    const t = pagerSel ? G().threads[pagerSel] : null;
    const logEl = w.client.querySelector(".pg__log");
    const keepScroll = logEl && logEl.scrollTop + logEl.clientHeight < logEl.scrollHeight - 30 ? logEl.scrollTop : null;

    let chat = '<div class="pg__empty">No conversations yet.</div>';
    if (t) {
      t.read = visibleMsgs(t).filter((m) => m.who !== "you").length;
      const gid = Object.keys(H.gigs).find((id) => H.gigs[id].poster.handle === t.handle && stageOf(id) === "briefing");
      const gs = gid ? G().gigs[gid] : null;
      const isTyping = typing(t);
      const meter = gs ? '<span class="pg__meter" title="How much attention they have left">ATTENTION ' +
        Array.from({ length: gs.dlg.max }, (_, i) => '<i class="' + (i < gs.dlg.patience ? "on" : "") + '"></i>').join("") + "</span>" : "";
      const msgs = visibleMsgs(t).map((m) => {
        if (m.who === "sys") {
          const btn = m.cta === "ticket" ? '<button class="w98btn" data-pg="ticket" data-gig="' + m.gig + '">Open ticket</button>'
            : m.cta === "suite" ? '<button class="w98btn" data-pg="suite" data-gig="' + m.gig + '">Open Design Suite</button>'
            : m.cta === "review" ? '<button class="w98btn" data-pg="ticket" data-gig="' + m.gig + '">Read the review</button>' : "";
          return '<div class="pg__sys">' + esc(m.text) + (btn ? "<div>" + btn + "</div>" : "") + "</div>";
        }
        return '<div class="pg__m pg__m--' + m.who + '"><b>' + (m.who === "you" ? "you" : esc(t.name)) + "</b><span>" + esc(m.text) +
          (m.file ? '<em class="pg__file">📎 ' + esc(m.file) + "</em>" : "") + "</span></div>";
      }).join("");
      // The briefing happens on the call now; the thread keeps the transcript.
      const opts = gs ? '<button class="w98btn pg__opt pg__opt--end" data-pg="call" data-gig="' + gid + '">Back to the call with ' + esc(t.name) + "</button>" : "";
      chat = '<div class="pg__who"><b>' + esc(t.name) + '</b><span>' + esc(t.handle === SYSTEM ? "system" : t.site) + "</span>" + meter + "</div>" +
        '<div class="pg__log">' + msgs + (isTyping ? '<div class="pg__typing">' + esc(t.name) + " is typing…</div>" : "") + "</div>" +
        '<div class="pg__opts">' + (gs ? (isTyping ? '<span class="pg__wait">…</span>' : opts) : "") + "</div>";
    }

    w.client.innerHTML = '<div class="pg">' +
      '<div class="pg__top"><span class="pg__me">● online</span><span class="ml__spacer"></span><span>★ ' + G().rep + " · " + esc(Sc.tier(G().rep)) + "</span></div>" +
      '<div class="pg__main"><div class="pg__list">' + threads.map((x) => {
        const n = x === t ? 0 : unread(x);
        const live = Object.keys(H.gigs).some((id) => H.gigs[id].poster.handle === x.handle && stageOf(id) === "briefing");
        return '<button class="pg__c' + (x === t ? " on" : "") + '" data-pg="sel" data-h="' + esc(x.handle) + '"><i class="pg__dot' + (live ? " live" : "") + '"></i><span>' + esc(x.name) + "</span>" + (n ? "<b>" + n + "</b>" : "") + "</button>";
      }).join("") + '</div><div class="pg__chat">' + chat + "</div></div></div>";

    const log = w.client.querySelector(".pg__log");
    if (log) log.scrollTop = keepScroll === null ? log.scrollHeight : keepScroll;
    paintTray();
  }

  const lastAt = (t) => (t.msgs.length ? t.msgs[t.msgs.length - 1].at : 0);

  function onPagerClick(e) {
    const b = e.target.closest("[data-pg]");
    if (!b) return;
    const a = b.dataset.pg;
    if (a === "sel") { pagerSel = b.dataset.h; renderPager(); }
    if (a === "ask") choose(b.dataset.gig, b.dataset.opt);
    if (a === "call") openCall(b.dataset.gig);
    if (a === "ticket") renderTicket(b.dataset.gig, true);
    if (a === "suite") Suite.launcher(b.dataset.gig);
  }

  /* ── the call ──────────────────────────────────────────────
   * A briefing is a live meeting, so it gets a window of its own rather than
   * a list of buttons in the Pager. The rules are in meeting.js; everything
   * here is the face, the room and the glass.
   *
   * One interval drives every open call. State changes — asking, flipping,
   * a silence they fill themselves — rebuild the window through advance();
   * the rest of the time only the canvas, the hourglass and the clock move.
   */
  const callKey = (id) => "call:" + id;
  const personFor = (gig) => (H.people && H.people[gig.poster.handle]) || {};

  function openCall(id) {
    const gig = gigOf(id);
    if (!gig) return null;
    const who = personFor(gig);
    let w = getWin(callKey(id));
    if (!w) {
      w = createWindow({
        key: callKey(id), title: "CALL — " + String(who.co || gig.poster.name).toUpperCase(),
        iconId: "pager", w: 566, h: 660, minW: 470, minH: 520, className: "w98--call",
      });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", onCallClick);
      renderCall(id);
    }
    startCallLoop();
    return revealWin(w);
  }

  function onCallClick(e) {
    const b = e.target.closest("[data-cl]");
    if (!b) return;
    const id = b.dataset.gig, a = b.dataset.cl;
    if (a === "ask") choose(id, b.dataset.opt);
    if (a === "flip") flipGlass(id);
    if (a === "ticket") renderTicket(id, true);
    if (a === "visit") {
      const gig = gigOf(id);
      focusId = id; clipping = true;
      Web.visit("http://" + gig.poster.site + "/", siteForWeb(id, gig.poster.site));
      // They are still on the line: the site opens beside the call, not over it.
      pairWins(getWin(callKey(id)), getWin("browser"));
    }
  }

  // portraits.js lights a room by how dark it is.
  function portraitTheme(t) {
    t = t || {};
    const hex = String(t.bg || "#202020");
    const n = parseInt(hex.slice(1), 16) || 0;
    const lum = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    return { bg: t.bg || "#202020", panel: t.panel || "#2A2A2A", ink: t.ink || "#EEE",
             dim: t.dim || "#888", line: t.line || "#444", brand: t.brand || "#4E6E88",
             brand2: t.brand2, dark: lum < 0.5 };
  }

  function renderCall(id) {
    const w = getWin(callKey(id));
    if (!w) return;
    const gig = gigOf(id), gs = gsOf(id), st = gs.dlg, who = personFor(gig);
    if (!st) return;
    const site = siteClient(gig.poster.site) || {};
    const brand = (site.theme && site.theme.brand) || "#4E6E88";
    const opts = Mtg.available(gig.dialogue, st, clippedFacts(gs));
    const waiting = !st.ended && st.speaking > 0;

    const pips = Array.from({ length: st.max }, (_, i) =>
      '<i class="' + (i < st.patience ? "on" : "") + '"></i>').join("");

    let actions;
    if (st.ended) {
      actions = '<p class="cl__over">' + esc(
        st.reason === "wrapped" ? "Call closed. They have what they need."
        : st.reason === "bored" ? "They ran out of patience and hung up."
        : st.reason === "drifted" ? "The silences did it. They wrapped up on their own."
        : "You asked everything there was.") + "</p>" +
        '<button class="w98btn cl__go" data-cl="ticket" data-gig="' + id + '">Open the ticket</button>';
    } else if (waiting) {
      actions = '<p class="cl__wait">' + esc(who.name || gig.poster.name) + " is speaking…</p>";
    } else {
      actions = opts.map((o) =>
        '<button class="w98btn cl__opt' + (o.challenge ? " cl__opt--win" : "") + (o.end ? " cl__opt--end" : "") +
        '" data-cl="ask" data-gig="' + id + '" data-opt="' + esc(o.id) + '">' +
        (o.challenge ? '<span class="cl__read">YOU READ THIS</span>' : "") + esc(o.ask) +
        (o.cost > 1 ? '<em class="cl__cost">costs ' + o.cost + "</em>" : "") + "</button>").join("");
    }

    const lines = st.log.slice(-40).map((m) =>
      '<div class="cl__l cl__l--' + (m.who === "you" ? "you" : "them") +
      (m.filler ? " cl__l--fill" : "") + (m.challenge ? " cl__l--win" : "") + '">' +
      "<b>" + esc(m.who === "you" ? "you" : String(who.name || gig.poster.name).split(" ")[0]) + "</b>" +
      "<span>" + esc(m.text) + "</span></div>").join("");

    w.client.innerHTML =
      '<div class="cl">' +
        '<div class="cl__stage">' +
          '<canvas class="cl__feed" width="320" height="240"></canvas>' +
          '<div class="cl__hud">' +
            '<span class="cl__rec">● LIVE <b data-cl-clock>00:00</b></span>' +
            '<span class="cl__fps" data-cl-fps>8 fps · 320×240</span>' +
            '<span class="cl__low" style="border-left-color:' + esc(brand) + '">' +
              "<b>" + esc(who.name || gig.poster.name) + "</b>" +
              "<span>" + esc(who.role || "") + (who.dom ? " · " + esc(who.dom) : "") + "</span></span>" +
          "</div>" +
          '<div class="cl__glass" title="How long they will sit in this pause">' +
            "<span data-cl-art></span><b data-cl-secs>0</b></div>" +
        "</div>" +
        '<div class="cl__said" data-cl-said></div>' +
        '<div class="cl__bar">' +
          '<span class="cl__att"><em>ATTENTION</em><span class="cl__pips">' + pips + "</span></span>" +
          '<button class="w98btn" data-cl="visit" data-gig="' + id + '" title="Read their site while they wait. Clipping stays on.">Their site</button>' +
          '<button class="w98btn" data-cl="flip" data-gig="' + id + '"' +
            (Mtg.canFlip(st) ? "" : " disabled") + ' title="Sorry — give me a second. Costs a pip of attention.">' +
            "Turn the glass (" + Math.max(0, st.maxFlips - st.flips) + ")</button>" +
        "</div>" +
        '<div class="cl__opts">' + actions + "</div>" +
        '<div class="cl__log">' + lines + "</div>" +
      "</div>";

    const log = w.client.querySelector(".cl__log");
    if (log) log.scrollTop = log.scrollHeight;
    (callAnim[id] || (callAnim[id] = {})).sig = callSig(gig, gs, st);
    paintCall(id);
  }

  // Everything that moves between state changes.
  function paintCall(id) {
    const w = getWin(callKey(id));
    if (!w) return false;
    const gig = gigOf(id), gs = gsOf(id), st = gs.dlg, who = personFor(gig);
    if (!st) return false;
    const a = callAnim[id] || (callAnim[id] = { blinkUntil: 0, nextBlink: 0, glitchUntil: 0, nextGlitch: 0, phase: 0 });
    const t = now();
    const talking = st.speaking > 0 && !st.ended;

    if (t > a.blinkUntil && t > a.nextBlink) { a.blinkUntil = t + 130; a.nextBlink = t + 2200 + Math.random() * 4200; }
    if (t > a.nextGlitch) { a.glitchUntil = t + 170; a.nextGlitch = t + 3600 + Math.random() * 6000; }
    a.phase = (a.phase + 1) % 4;

    const canvas = w.client.querySelector(".cl__feed");
    if (canvas && Por) {
      const site = siteClient(gig.poster.site) || {};
      Por.paintFeed(canvas, gig.poster.handle, who.look, {
        theme: portraitTheme(site.theme), room: who.room, frame: who.frame,
        mood: Mtg.mood(st), blink: t < a.blinkUntil,
        mouthOpen: talking && a.phase % 2 === 0,
        bob: Math.floor(t / 900) % 3 === 0,
        glance: Mtg.glancing(st),
        glitch: t < a.glitchUntil ? Math.floor(t / 170) : 0,
      });
    }

    const secs = Mtg.seconds(st), ratio = Mtg.ratio(st);
    const art = w.client.querySelector("[data-cl-art]");
    if (art) {
      const tone = st.ended || talking ? "calm" : secs <= 3 ? "out" : ratio < 0.4 ? "low" : "calm";
      art.innerHTML = hourglassSVG(talking || st.ended ? 1 : ratio, 44, a.phase, tone);
      const box = art.parentNode;
      box.classList.toggle("cl__glass--low", !talking && !st.ended && ratio < 0.4);
      box.classList.toggle("cl__glass--out", !talking && !st.ended && secs <= 3);
      box.classList.toggle("cl__glass--held", talking || st.ended);
    }
    const num = w.client.querySelector("[data-cl-secs]");
    if (num) num.textContent = st.ended ? "—" : talking ? "·" : String(secs);

    const said = w.client.querySelector("[data-cl-said]");
    if (said && said.dataset.line !== st.said) {
      said.dataset.line = st.said;
      said.textContent = st.said ? "“" + st.said + "”" : "";
    }
    const clock = w.client.querySelector("[data-cl-clock]");
    if (clock) {
      const el = Math.max(0, Math.floor((t - (gs.callAt || t)) / 1000));
      clock.textContent = String(Math.floor(el / 60)).padStart(2, "0") + ":" + String(el % 60).padStart(2, "0");
    }
    const fps = w.client.querySelector("[data-cl-fps]");
    if (fps) fps.textContent = (t < a.glitchUntil ? "3" : "8") + " fps · 320×240";
    return true;
  }

  // Everything the options pane depends on. When this changes, redraw it.
  function callSig(gig, gs, st) {
    return [st.speaking > 0 ? "talk" : "wait", st.ended ? st.reason : "live", st.patience, st.flips,
            Mtg.available(gig.dialogue, st, clippedFacts(gs)).map((o) => o.id).join(",")].join("|");
  }

  function startCallLoop() {
    if (callTimer) return;
    callTimer = setInterval(callTick, 90);
  }

  function callTick() {
    const live = Object.keys(H.gigs).filter((id) => getWin(callKey(id)));
    if (!live.length || !state) { clearInterval(callTimer); callTimer = 0; return; }
    for (const id of live) {
      const gig = gigOf(id), gs = gsOf(id);
      if (!gs || !gs.dlg) continue;
      if (gs.stage === "briefing" && !gs.dlg.ended) {
        const before = gs.dlg.log.length;
        const next = Mtg.tick(gig.dialogue, gs.dlg, 90);
        if (next.log.length !== before || next.ended) { advance(id, next); continue; }
        gs.dlg = next;
      }
      const a = callAnim[id] || (callAnim[id] = {});
      const sig = callSig(gig, gs, gs.dlg);
      if (sig !== a.sig) { renderCall(id); continue; }   // she stopped talking, or a window opened
      paintCall(id);
    }
  }

  /* ── ticket window ─────────────────────────────────────── */
  function renderTicket(id, open) {
    if (!id || !gigOf(id)) return;
    const key = "ticket:" + id;
    let w = getWin(key);
    if (!w && !open) return;
    const gig = gigOf(id), gs = gsOf(id);
    if (!w) {
      w = createWindow({ key, title: "TICKET — " + gig.short, iconId: "ticket", w: 620, h: 520, minW: 460, minH: 360, className: "w98--ticket" });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", (e) => {
        const b = e.target.closest("[data-tk]");
        if (!b) return;
        const a = b.dataset.tk;
        if (a === "visit") { focusId = id; clipping = true; Web.visit(b.dataset.url, siteForWeb(id, hostOf(b.dataset.url))); }
        if (a === "compare") renderCompare(id, true);
        if (a === "make") { endResearch(id, "early"); Suite.launcher(id); }
        if (a === "suite") Suite.launcher(id);
        if (a === "deliver") {
          const found = Suite.docFor(id, gig.app);
          const res = found ? deliver(id, found.doc, found.appId) : { ok: false, reason: "Make something in the Design Suite first." };
          if (!res.ok) { const n = w.client.querySelector(".tk__msg"); if (n) n.textContent = res.reason; }
        }
        if (a === "search") { focusId = id; Web.visit(Sites.searchURL(b.dataset.q), siteForWeb(id, gig.poster.site)); }
      });
    }
    const revealed = new Set(gs.dlg ? gs.dlg.revealed : []);
    const item = (x) => revealed.has(x.id)
      ? '<li class="tk__known">' + esc(x.label) + "</li>"
      : '<li class="tk__unknown">??? <em>you never asked</em></li>';
    const factsN = (gs.found && gs.found.facts.length) || 0;
    const rivals = (gig.competitors || []).map((dom) => {
      const s = siteClient(dom);
      const have = ((gs.found && gs.found.trends[dom]) || []).length;
      const total = Res.relevantTrends(gig, H.sites, dom).length;
      const done = gs.found && Res.studied(gig, H.sites, gs.found, dom);
      return "<li>" + esc(s ? s.co : dom) + ' <span class="tk__dim">' + (done ? "studied" : have ? have + " found" : "not yet") + "</span></li>";
    }).join("");
    const gap = gs.gapFound ? '<p class="tk__gap">Gap found: <b>' + esc(gig.features.find((f) => f.id === gs.gapFound).label) + "</b></p>" : "";
    const r = gs.result;

    let body = "";
    if (gs.stage === "briefing" || gs.stage === "contacted") body = '<p class="tk__note">Still on the call. What you never ask stays ??? — and is scored anyway.</p>';
    else {
      body =
        '<div class="tk__cols"><section><h3>WHAT THEY NEED</h3><ul class="tk__list">' + gig.needs.map(item).join("") + "</ul>" +
          "<h3>WHAT THEY WON'T ACCEPT</h3><ul class=\"tk__list\">" + gig.limits.map(item).join("") + "</ul></section>" +
        "<section><h3>RESEARCH</h3>" +
          '<p class="tk__line">Facts clipped: <b>' + factsN + "</b></p>" +
          '<div class="tk__acts"><button class="w98btn" data-tk="visit" data-url="http://' + gig.poster.site + '/">Their site</button>' +
            (gig.refs || []).slice(0, 3).map((ref) => '<button class="w98btn" data-tk="search" data-q="' + esc(ref.q) + '">Pictures: ' + esc(ref.q) + "</button>").join("") + "</div>" +
          '<p class="tk__line">Rivals</p><ul class="tk__list">' + rivals + "</ul>" +
          '<div class="tk__acts">' + (gig.competitors || []).map((dom) => '<button class="w98btn" data-tk="visit" data-url="http://' + dom + '/">' + esc((siteClient(dom) || {}).co || dom) + "</button>").join("") +
          '<button class="w98btn" data-tk="compare">Compare rivals</button></div>' + gap + "</section></div>";
    }
    if (r) {
      body += '<div class="tk__review"><h3>REVIEW ' + "★".repeat(r.stars) + "☆".repeat(5 - r.stars) + " " + r.total + "/100 · reputation +" + r.rep + "</h3><ul>" +
        r.lines.map((l) => '<li class="' + (l.ok ? "ok" : "no") + '"><span>' + (l.ok ? "✓" : "✗") + " " + esc(l.text) + "</span><b>" + (l.pts > 0 ? "+" : "") + l.pts + (l.max ? "/" + l.max : "") + "</b></li>").join("") + "</ul></div>";
    }

    const actions = gs.stage === "research"
      ? '<button class="w98btn" data-tk="make">Stop researching — make it →</button>'
      : gs.stage === "production"
        ? '<button class="w98btn" data-tk="suite">Open Design Suite</button><button class="w98btn tk__go" data-tk="deliver">Deliver latest work</button>'
        : "";

    w.client.innerHTML = '<div class="tk">' +
      '<header class="tk__head"><i>' + iconSVG("ticket", 34) + "</i><div><b>" + esc(gig.title) + "</b><span>" + esc(gig.poster.name) + " · " + esc(gig.poster.site) + " · " + esc(gig.pay) + "</span></div>" +
        '<span class="tk__stage tk__stage--' + (gs.stage || "none") + '">' + esc(gs.stage || "open") + "</span></header>" +
      '<div class="tk__time"><span data-hx-timer="' + id + '">' + timerText(id) + "</span>" + (gs.stage === "production" ? '<span class="tk__dim">Deliver from the suite, or here.</span>' : "") + "</div>" +
      '<div class="tk__body">' + body + "</div>" +
      '<footer class="tk__foot"><span class="tk__msg"></span><span class="ml__spacer"></span>' + actions + "</footer></div>";
    if (open) revealWin(w);
  }

  // The browser's image-search suggestions follow the gig's picture refs.
  function siteForWeb(id, dom) {
    const c = siteClient(dom) || siteClient(gigOf(id).poster.site);
    return c ? { ...c, refs: (gigOf(id).refs || []).map((r) => r.q) } : null;
  }

  /* ── comparison grid ───────────────────────────────────── */
  function renderCompare(id, open) {
    if (!id || !gigOf(id) || !gigOf(id).features) return;
    const key = "compare:" + id;
    let w = getWin(key);
    if (!w && !open) return;
    const gig = gigOf(id), gs = gsOf(id);
    if (!w) {
      w = createWindow({ key, title: "COMPARE — " + gig.short, iconId: "ticket", w: 560, h: 380, minW: 420, minH: 280, className: "w98--compare" });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", (e) => {
        const b = e.target.closest("[data-gap]");
        if (b && !b.disabled) guessGap(id, b.dataset.gap);
      });
    }
    const b = Res.board(gig, H.sites, gs.found || Res.emptyFound());
    const tries = GAP_TRIES - (gs.gapTries || 0);
    const canGuess = gs.stage === "research" && !gs.gapFound && tries > 0;
    const glyph = { yes: "✓", no: "—", "?": "?" };
    w.client.innerHTML = '<div class="cmp">' +
      '<p class="cmp__how">Clip what each rival does. When you have clipped everything a rival does, the rest of their column fills with —. The gap is the row nobody does.</p>' +
      '<table class="cmp__t"><tr><th></th>' + b.doms.map((d) => "<th>" + esc((siteClient(d) || {}).co || d) + "</th>").join("") + "<th></th></tr>" +
      b.rows.map((r) => {
        const wrong = (gs.gapWrong || []).includes(r.id), hit = gs.gapFound === r.id;
        return '<tr class="' + (hit ? "cmp__hit" : wrong ? "cmp__wrong" : "") + '"><td>' + esc(r.label) + "</td>" +
          r.cells.map((c) => '<td class="cmp__c cmp__c--' + (c === "?" ? "q" : c) + '">' + glyph[c] + "</td>").join("") +
          '<td><button class="w98btn cmp__g" data-gap="' + r.id + '"' + (canGuess && !wrong ? "" : " disabled") + ">" + (hit ? "The gap" : wrong ? "Not it" : "This is the gap") + "</button></td></tr>";
      }).join("") + "</table>" +
      '<p class="cmp__foot">' + (gs.gapFound ? "Gap found. It's a card in your tray." : gs.stage !== "research" ? "Research is closed." :
        tries + " guess" + (tries === 1 ? "" : "es") + " left. A wrong guess costs " + GAP_MISS + " seconds.") + "</p></div>";
    if (open) revealWin(w);
  }

  return {
    boot, jobs, deliver, preflight, measureLikeness,
    openPager, openCall, openTicket: (id) => renderTicket(id, true),
    board: () => Web.visit(GL("/")),
    rep: () => (state ? G().rep : 0),
    // For testing and for the content pipeline: the whole game state.
    debug: () => JSON.parse(JSON.stringify(G())),
  };
})();
