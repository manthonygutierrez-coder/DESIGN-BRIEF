"use strict";
/* ── the brief feed ───────────────────────────────────────
 * Scheduled briefs arrive from outside the app. Two transports, and the app
 * does not care which delivered a given brief:
 *
 *   pull  a JSON feed at a URL — a routine commits briefs to a public repo
 *   drop  JSON files in <projects root>/_inbox — a job on this machine
 *
 * Both are polled by the same loop and deduped by the record's own `id`, so
 * polling is idempotent: a feed can be re-read forever without duplicating mail.
 *
 * A record's client is normalised into the full shape sites.js expects and
 * registered into CLIENTS, so a link in a scheduled brief opens a real site in
 * the in-app browser exactly like a built-in one. Nothing reaches the live web.
 */

const Feed = (() => {
  const DEFAULTS = { url: null, pollMinutes: 15, enabled: true };
  const FRAMES = ["press","civic","saas","terminal","neon","paper","shop","studio","board","specimen"];

  let cfg = { ...DEFAULTS };
  let timer = 0;
  let lastStatus = { at: null, ok: null, added: 0, error: null };

  async function boot(){
    const state = await Bridge.getState();
    cfg = { ...DEFAULTS, ...(state.feed || {}) };
    if (!cfg.enabled) return;
    // A first pass shortly after launch, then on the configured interval.
    setTimeout(poll, 4000);
    schedule();
  }

  function schedule(){
    clearInterval(timer);
    const mins = Math.max(1, Number(cfg.pollMinutes) || 15);
    timer = setInterval(poll, mins * 60000);
  }

  async function configure(patch){
    const state = await Bridge.getState();
    cfg = { ...cfg, ...patch };
    state.feed = cfg;
    Bridge.saveState(state);
    schedule();
    return cfg;
  }

  /* ── polling ───────────────────────────────────────────── */
  async function poll(){
    const records = [];
    let error = null;

    if (cfg.url){
      const res = await Bridge.feedFetch(cfg.url);
      if (res && res.ok) records.push(...extract(res.data));
      else error = (res && res.error) || "fetch failed";
    }

    const drop = await Bridge.feedDrop();
    if (drop && drop.ok) records.push(...extract(drop.data));

    let added = 0;
    // Oldest first, so the inbox ends up newest-on-top after unshift.
    for (const rec of records.slice().reverse()){
      const norm = normalize(rec);
      if (!norm) continue;
      if (norm.client) registerClient(norm.client);
      if (Mail.ingest(norm)) added++;
    }

    lastStatus = { at: Date.now(), ok: !error, added, error };
    return lastStatus;
  }

  function extract(data){
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.briefs)) return data.briefs;
    return [data];
  }

  /* ── record normalisation ──────────────────────────────── */
  // Feed records are written by something outside this app, so nothing is
  // trusted to be well-formed. Anything missing gets a sane default rather
  // than throwing somewhere deep in the renderer.
  function normalize(rec){
    if (!rec || typeof rec !== "object") return null;
    const b = rec.brief || rec;
    if (!b.project || !b.ask) return null;

    const brief = {
      project: String(b.project).slice(0, 80),
      client:  String(b.client || rec.clientLine || "A client").slice(0, 200),
      ask:     String(b.ask).slice(0, 1200),
      deliver: arr(b.deliver, 8, 160),
      limits:  arr(b.limits,  8, 160),
      tone:    String(b.tone || "").slice(0, 120),
    };
    if (!brief.deliver.length) brief.deliver = ["As agreed with the client"];
    if (!brief.limits.length)  brief.limits  = ["No constraints stated"];

    return {
      id: String(rec.id || (brief.project + ":" + (rec.received || ""))).slice(0, 120),
      discipline: rec.discipline || null,
      ci: typeof rec.ci === "number" ? rec.ci : undefined,
      cadence: rec.cadence || null,
      received: rec.received || null,
      brief,
      client: rec.clientProfile ? normalizeClient(rec.clientProfile, brief) : null,
    };
  }

  function arr(v, maxN, maxLen){
    if (!Array.isArray(v)) return [];
    return v.filter((x) => typeof x === "string" && x.trim())
            .slice(0, maxN).map((x) => x.trim().slice(0, maxLen));
  }

  // sites.js needs a complete shape or resolve() will throw on a missing page.
  // Fill in whatever the feed left out, building a page out of the brief itself.
  function normalizeClient(raw, brief){
    if (!raw || typeof raw !== "object") return null;
    const co  = String(raw.co || brief.client || "Client").slice(0, 80);
    const dom = String(raw.dom || slugDomain(co)).toLowerCase().replace(/[^a-z0-9.-]/g, "");
    if (!dom) return null;

    const site = raw.site && typeof raw.site === "object" ? { ...raw.site } : {};
    site.tagline = String(site.tagline || raw.tagline || "").slice(0, 160);
    if (!Array.isArray(site.nav) || !site.nav.length) site.nav = [["Home", "/"]];
    site.nav = site.nav.map((n) => (Array.isArray(n) ? [String(n[0]), String(n[1] || "/")] : [String(n), "/"]));

    if (!site.pages || typeof site.pages !== "object" || !site.pages["/"]){
      site.pages = Object.assign({
        "/": [
          { t: "lede", p: site.tagline || ("What " + co + " does, and who it does it for.") },
          { t: "prose", h: "About", ps: [
            String(raw.about || brief.client),
            "This page is here so the brief has somewhere to point.",
          ].filter(Boolean) },
        ],
      }, site.pages || {});
    }
    // Every nav path must exist, or the browser 404s its own navigation.
    site.nav = site.nav.filter(([, path]) => path === "/" || site.pages[path]);
    if (!site.nav.length) site.nav = [["Home", "/"]];

    return {
      who:  String(raw.who || "The client").slice(0, 80),
      role: String(raw.role || "").slice(0, 80),
      co, dom,
      frame: FRAMES.includes(raw.frame) ? raw.frame : "studio",
      theme: raw.theme && typeof raw.theme === "object" ? raw.theme : undefined,
      voice: String(raw.voice || "").slice(0, 240),
      wrap:  raw.wrap ? String(raw.wrap).slice(0, 240) : undefined,
      site,
      refs: arr(raw.refs, 6, 60).length ? arr(raw.refs, 6, 60) : ["studio desk", "work in progress"],
    };
  }

  function slugDomain(co){
    return co.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "") + ".com";
  }

  // CLIENTS is a const binding to a mutable object; adding keys is how a feed
  // client becomes reachable from Sites.resolve() and the image search.
  function registerClient(c){
    if (typeof CLIENTS === "undefined" || !c || !c.dom) return;
    const clash = Object.values(CLIENTS).some((x) => x.dom.toLowerCase() === c.dom.toLowerCase());
    if (clash) return;                      // never shadow a built-in client
    CLIENTS[c.co.toUpperCase()] = c;
  }

  return { boot, poll, configure, status: () => ({ ...lastStatus, cfg: { ...cfg } }) };
})();
