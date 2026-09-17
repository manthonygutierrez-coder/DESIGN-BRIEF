"use strict";
/* ── Hustle ───────────────────────────────────────────────
 * The game half of Pixel Crossing. Everything happens inside the desktop:
 *
 *   find      gigslist posts, the crawler, and brand ads whose domains you
 *             have to work out and type in yourself
 *   brief     a Pager conversation; the questions you ask decide what the
 *             ticket says, and the client only has so much attention
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
  const H = HUSTLE, Dlg = HustleDialogue, Res = HustleResearch, Sc = HustleScore;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const GL = (path) => "http://" + H.GIGSLIST + (path || "/");
  const SYSTEM = "gigslist";
  const CLIP_MISS = 5, GAP_MISS = 30, GAP_TRIES = 2;
  const UNLOCKS = [[5, "snap", "Snap to grid"], [10, "align", "Align"], [16, "gradient", "Gradients"], [24, "mirror", "Mirror drawing"], [32, "pen", "The pen tool"]];

  let state = null;
  let clipping = true;
  let focusId = null;              // the gig the browser toolbar is about
  let tickN = 0;
  let trayEl = null, pagerTrayEl = null, balloonEl = null, balloonTimer = 0;
  let pagerSel = null;
  let renderTimer = 0;

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
  const researchGig = () => {
    if (focusId && stageOf(focusId) === "research") return focusId;
    return Object.keys(H.gigs).find((id) => stageOf(id) === "research") || null;
  };

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
    gs.dlg = Dlg.start(gig.dialogue);
    const lines = gs.dlg.log.map((m) => m.text);
    gs.logged = gs.dlg.log.length;
    post(gig.poster.handle, "them", lines);
    balloon(gig.poster.name + " paged you", "Open the Pager to talk through the job.", () => focusPager(gig.poster.handle));
  }

  function choose(id, optionId) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || gs.stage !== "briefing" || typing(thread(gig.poster.handle))) return;
    const next = Dlg.choose(gig.dialogue, gs.dlg, optionId);
    if (next === gs.dlg) return;
    const fresh = next.log.slice(gs.logged || 0);
    gs.dlg = next;
    gs.logged = next.log.length;
    for (const m of fresh) post(gig.poster.handle, m.who, m.text);
    if (next.ended) {
      const at = post(gig.poster.handle, "sys", "Brief written to your ticket. Research is open — the clock starts now.", { gig: id, cta: "ticket" });
      startResearch(id);
    }
    save();
    renderPager();
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
    const el = target.closest && target.closest(CLIPPABLE);
    if (!el || !el.closest(".ie__view")) { webStatus("Clip a passage: a paragraph, a list item, a caption."); return; }
    const text = el.textContent.replace(/\s+/g, " ").trim();
    const dom = hostOf(url);
    const hit = Res.clip(gig, H.sites, dom, text, gs.found);

    if (!hit) {
      gs.research.left = Math.max(0, gs.research.left - CLIP_MISS);
      flash(el, "miss");
      webStatus("Nothing useful there. −" + CLIP_MISS + "s");
    } else if (hit.kind === "dupe") {
      flash(el, "dupe");
      webStatus("Already on a card: " + hit.item.label);
    } else {
      gs.found = Res.record(gs.found, hit);
      flash(el, "hit");
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
    if (gs.research.left <= 0) endResearch(id, "time");
  }

  function flash(el, kind) {
    el.classList.remove("hx-hit", "hx-miss", "hx-dupe");
    void el.offsetWidth;
    el.classList.add("hx-" + kind);
    setTimeout(() => el.classList.remove("hx-" + kind), 900);
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
  function deliver(id, doc, appId) {
    const gig = gigOf(id), gs = gsOf(id);
    if (!gig || !["research", "production"].includes(gs.stage)) return { ok: false, reason: "That gig isn't open for delivery." };
    const late = gs.production ? Math.max(0, gs.production.used - gig.deadline) : 0;
    const r = Sc.score({ gig, doc, cards: Suite.cards(), appId, lateSeconds: late });
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
    lightbox(q) {
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
      const opts = gs && !isTyping ? Dlg.available(gigOf(gid).dialogue, gs.dlg).map((o) =>
        '<button class="w98btn pg__opt' + (o.end ? " pg__opt--end" : "") + '" data-pg="ask" data-gig="' + gid + '" data-opt="' + o.id + '">' + esc(o.ask) + "</button>").join("") : "";
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
    if (a === "ticket") renderTicket(b.dataset.gig, true);
    if (a === "suite") Suite.launcher(b.dataset.gig);
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
    if (gs.stage === "briefing" || gs.stage === "contacted") body = '<p class="tk__note">Still talking this one through in the Pager.</p>';
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
    boot, jobs, deliver,
    openPager, openTicket: (id) => renderTicket(id, true),
    board: () => Web.visit(GL("/")),
    rep: () => (state ? G().rep : 0),
    // For testing and for the content pipeline: the whole game state.
    debug: () => JSON.parse(JSON.stringify(G())),
  };
})();
