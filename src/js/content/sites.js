"use strict";
/* The web, such as it is.
 *
 * Every page the browser can reach is rendered here from client data.
 * Nothing touches the network — Sites.resolve() is the whole internet.
 *
 * Three things make a client's site theirs rather than a template:
 *
 *   theme    colours, type pairing and mark style, emitted as CSS custom
 *            properties on the page root. Two clients on the same frame
 *            still look nothing alike.
 *   frame    the chrome: masthead, nav and footer. Nine of them, chosen to
 *            suit the kind of organisation, not to fill a grid.
 *   blocks   the actual content. Typed sections — pricing tables, specs,
 *            departure boards, product grids, changelogs, specimens — so a
 *            site carries information a designer could work from, rather
 *            than three paragraphs of prose in every case.
 *
 * Sites are multi-page. c.site.pages maps a path to a block list, and the
 * nav resolves for real, so the browser's history has somewhere to go.
 */

const Sites = (() => {

  const SEARCH_HOST = "imagefinder.web";

  function esc2(s){ return String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
  function attr(s){ return esc2(s).replace(/'/g, "&#39;"); }

  function normalize(url){
    let u = String(url || "").trim();
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    try { return new URL(u); } catch { return null; }
  }

  /* ── theme ───────────────────────────────────────────────
   * Font stacks must use single quotes: these end up inside a double-quoted
   * style attribute.
   */
  const DEFAULT_THEME = {
    bg: "#FFFFFF", panel: "#F2F2EE", ink: "#1A1A1A", dim: "#6C6C6C", line: "#D8D8D2",
    brand: "#1A3FA0", brand2: "#101820", link: "#1A3FA0", onBrand: "#FFFFFF",
    head: "Georgia, 'Times New Roman', serif",
    body: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', Courier, monospace",
    mark: "disc", markFace: "Helvetica, Arial, sans-serif",
    rule: "1px",
  };

  function themeOf(c){ return Object.assign({}, DEFAULT_THEME, c.theme || {}); }

  function themeVars(t){
    return [
      "--bg:" + t.bg, "--panel:" + t.panel, "--ink:" + t.ink, "--dim:" + t.dim,
      "--line:" + t.line, "--brand:" + t.brand, "--brand2:" + t.brand2,
      "--link:" + t.link, "--on-brand:" + t.onBrand, "--rule:" + t.rule,
      "--head:" + t.head, "--body:" + t.body, "--mono:" + t.mono,
    ].join(";");
  }

  // A drawn mark if the client has one (marks.js), otherwise the generated
  // fallback — so a new client still gets a logo before anyone designs it one.
  function markImg(c, t, size){
    const s = size || 40;
    const drawn = typeof brandmarkSVG === "function" ? brandmarkSVG(c, t, s) : null;
    if (drawn) return drawn;
    const src = Imagery.mark(c.dom, {
      style: t.mark, brand: t.brand, brand2: t.brand2, bg: t.markBg || t.bg,
      face: t.markFace, text: t.markText, size: s, plate: !!t.markPlate,
    });
    return '<img class="brandmark" src="' + src + '" alt="' + attr(c.co) + ' mark" ' +
           'width="' + s + '" height="' + s + '">';
  }

  function refAt(c, i){ return c.refs[i % c.refs.length]; }

  /* ── blocks ──────────────────────────────────────────────
   * Every block gets .blk so frames can space them uniformly, plus its own
   * modifier for the parts that are genuinely different.
   */

  function head(b){ return b.h ? '<h2 class="blk__h">' + esc2(b.h) + "</h2>" : ""; }
  function sub(b){ return b.sub ? '<p class="blk__sub">' + esc2(b.sub) + "</p>" : ""; }
  function note(b){ return b.note ? '<p class="blk__note">' + esc2(b.note) + "</p>" : ""; }

  const BLOCKS = {

    lede(b){
      return '<p class="blk-lede">' + esc2(b.p) + "</p>";
    },

    prose(b){
      return '<section class="blk blk--prose">' + head(b) +
        (b.ps || [b.p]).filter(Boolean).map((p) => "<p>" + esc2(p) + "</p>").join("") +
        "</section>";
    },

    // A banner the organisation would consider load-bearing.
    notice(b){
      return '<section class="blk blk--notice">' +
        '<b class="blk-notice__h">' + esc2(b.h) + "</b>" +
        "<p>" + esc2(b.p) + "</p>" +
        (b.stamp ? '<span class="blk-notice__stamp">' + esc2(b.stamp) + "</span>" : "") +
        "</section>";
    },

    // Big numbers. Institutions and startups both do this, differently.
    stats(b){
      return '<section class="blk blk--stats">' + head(b) +
        '<div class="stats">' + b.items.map((s) =>
          '<div class="stat"><b class="stat__n">' + esc2(s.n) + "</b>" +
          '<span class="stat__l">' + esc2(s.l) + "</span></div>").join("") +
        "</div>" + note(b) + "</section>";
    },

    // Things for sale, with a picture, a spec line and a price.
    products(b, c){
      return '<section class="blk blk--products">' + head(b) + sub(b) +
        '<div class="prods">' + b.items.map((p, i) =>
          '<article class="prod">' +
            '<img src="' + Imagery.make(p.ref || refAt(c, i), 40 + i, 240, 180) + '" alt="">' +
            '<h3 class="prod__n">' + esc2(p.name) + "</h3>" +
            (p.meta ? '<p class="prod__m">' + esc2(p.meta) + "</p>" : "") +
            '<p class="prod__f"><span class="prod__p">' + esc2(p.price) + "</span>" +
            (p.tag ? '<span class="prod__t">' + esc2(p.tag) + "</span>" : "") + "</p>" +
          "</article>").join("") +
        "</div>" + note(b) + "</section>";
    },

    // Tiers. The middle one is always the one they want you to take.
    pricing(b){
      return '<section class="blk blk--pricing">' + head(b) + sub(b) +
        '<div class="tiers">' + b.tiers.map((t) =>
          '<div class="tier' + (t.pick ? " tier--pick" : "") + '">' +
            (t.pick ? '<span class="tier__flag">' + esc2(t.pick) + "</span>" : "") +
            '<h3 class="tier__n">' + esc2(t.name) + "</h3>" +
            '<p class="tier__p">' + esc2(t.price) + "</p>" +
            (t.note ? '<p class="tier__note">' + esc2(t.note) + "</p>" : "") +
            "<ul>" + t.feats.map((f) => "<li>" + esc2(f) + "</li>").join("") + "</ul>" +
          "</div>").join("") +
        "</div>" + note(b) + "</section>";
    },

    // Timetables, ledgers, fare charts, catalogues.
    table(b){
      return '<section class="blk blk--table">' + head(b) + sub(b) +
        '<div class="tblwrap"><table class="tbl">' +
          "<thead><tr>" + b.cols.map((h2) => "<th>" + esc2(h2) + "</th>").join("") + "</tr></thead>" +
          "<tbody>" + b.rows.map((r) => "<tr>" + r.map((cell, i) =>
            '<td' + (i === 0 ? ' class="tbl__k"' : "") + ">" + esc2(cell) + "</td>").join("") + "</tr>").join("") +
        "</tbody></table></div>" + note(b) + "</section>";
    },

    // Key/value technical detail. The single most useful thing on a real site.
    spec(b){
      return '<section class="blk blk--spec">' + head(b) + sub(b) +
        '<dl class="spec">' + b.rows.map((r) =>
          "<dt>" + esc2(r[0]) + "</dt><dd>" + esc2(r[1]) + "</dd>").join("") +
        "</dl>" + note(b) + "</section>";
    },

    // Dated entries: devlogs, changelogs, service notices, letters.
    feed(b){
      return '<section class="blk blk--feed">' + head(b) +
        '<ol class="feed">' + b.items.map((e) =>
          '<li class="fe"><span class="fe__d">' + esc2(e.d) + "</span>" +
          '<div><b class="fe__h">' + esc2(e.h) + "</b>" +
          (e.p ? "<p>" + esc2(e.p) + "</p>" : "") + "</div></li>").join("") +
        "</ol>" + note(b) + "</section>";
    },

    // A numbered process. Studios and services both explain themselves this way.
    steps(b){
      return '<section class="blk blk--steps">' + head(b) + sub(b) +
        '<ol class="steps">' + b.items.map((s) =>
          '<li class="step"><b class="step__h">' + esc2(s.h) + "</b>" +
          "<p>" + esc2(s.p) + "</p></li>").join("") +
        "</ol>" + "</section>";
    },

    faq(b){
      return '<section class="blk blk--faq">' + head(b) +
        '<dl class="faq">' + b.items.map((q) =>
          '<dt class="faq__q">' + esc2(q.q) + '</dt><dd class="faq__a">' + esc2(q.a) + "</dd>").join("") +
        "</dl></section>";
    },

    // Type set at size. Only a foundry has any business using this.
    specimen(b, c){
      const t = themeOf(c);
      return '<section class="blk blk--specimen">' + head(b) + sub(b) +
        b.items.map((s) =>
          '<div class="spec-line">' +
            '<div class="spec-line__t" style="font-size:' + (s.size || 40) + 'px' +
              (s.face ? ";font-family:" + s.face : ";font-family:" + t.head) +
              (s.tracking ? ";letter-spacing:" + s.tracking : "") + '">' + esc2(s.t) + "</div>" +
            '<div class="spec-line__m">' + esc2(s.name) + "</div>" +
          "</div>").join("") +
        note(b) + "</section>";
    },

    // Files a visitor is meant to take away. Press kits, betas, PDFs.
    downloads(b){
      return '<section class="blk blk--dl">' + head(b) + sub(b) +
        '<ul class="dls">' + b.items.map((d) =>
          '<li class="dl"><span class="dl__ico">' + esc2(d.kind || "FILE") + "</span>" +
          '<span class="dl__n">' + esc2(d.name) + "</span>" +
          '<span class="dl__s">' + esc2(d.size) + "</span></li>").join("") +
        "</ul>" + note(b) + "</section>";
    },

    // Colour, fabric, ink, stock. A swatch row is a designer's favourite block.
    swatches(b){
      return '<section class="blk blk--sw">' + head(b) + sub(b) +
        '<div class="sws">' + b.items.map((s) =>
          '<div class="sw"><span class="sw__c" style="background:' + attr(s.c) +
            (s.tex ? ";background-image:" + attr(s.tex) : "") + '"></span>' +
          '<b class="sw__n">' + esc2(s.n) + "</b>" +
          (s.m ? '<span class="sw__m">' + esc2(s.m) + "</span>" : "") + "</div>").join("") +
        "</div>" + note(b) + "</section>";
    },

    gallery(b, c){
      const caps = b.caps || c.site.gallery || [];
      return '<section class="blk blk--gal">' + head(b) +
        '<div class="gal">' + caps.map((cap, i) =>
          "<figure><img src=\"" + Imagery.make(b.q || refAt(c, i), i + 11, 260, 190) + "\" alt=\"\">" +
          "<figcaption>" + esc2(cap) + "</figcaption></figure>").join("") +
        "</div>" + note(b) + "</section>";
    },

    // One image, given room. For studios whose work is the argument.
    plate(b, c){
      return '<section class="blk blk--plate">' +
        "<img src=\"" + Imagery.make(b.q || refAt(c, 0), b.seed || 3, 720, 320) + "\" alt=\"\">" +
        (b.cap ? '<p class="plate__cap">' + esc2(b.cap) + "</p>" : "") + "</section>";
    },

    people(b){
      return '<section class="blk blk--people">' + head(b) +
        '<div class="ppl">' + b.items.map((p) =>
          '<div class="prs"><b>' + esc2(p.n) + "</b><span>" + esc2(p.r) + "</span>" +
          (p.p ? "<p>" + esc2(p.p) + "</p>" : "") + "</div>").join("") +
        "</div></section>";
    },

    contact(b, c){
      return '<section class="blk blk--contact">' + head(b) +
        '<div class="ctc"><p>' +
          (b.lines || []).map((l) => esc2(l)).join("<br>") +
          (b.lines && b.lines.length ? "<br><br>" : "") +
          esc2(clientEmail(c)) +
        "</p></div>" + note(b) + "</section>";
    },
  };

  function renderBlocks(list, c){
    return (list || []).map((b) => {
      const fn = BLOCKS[b.t];
      return fn ? fn(b, c) : "";
    }).join("");
  }

  /* ── pages ───────────────────────────────────────────────
   * nav is [label, path]. Every entry resolves to a real page.
   */
  function navOf(c){
    return c.site.nav.map((n) => (Array.isArray(n) ? n : [n, "/"]));
  }

  function pageFor(c, path){
    const pages = c.site.pages || {};
    const p = pages[path] || pages["/"] || [];
    return p;
  }

  function pageTitle(c, path){
    const hit = navOf(c).find((n) => n[1] === path);
    return hit && hit[1] !== "/" ? c.co + " — " + hit[0] : c.co;
  }

  function navHTML(c, path, cls, sep){
    const items = navOf(c).map(([label, p]) =>
      '<a href="#" data-url="http://' + attr(c.dom) + attr(p) + '"' +
      (p === path ? ' class="here"' : "") + ">" + esc2(label) + "</a>");
    return '<nav class="' + cls + '">' + items.join(sep || "") + "</nav>";
  }

  /* ── frames ──────────────────────────────────────────────
   * The chrome around the blocks. Chosen per client in clients.js.
   */

  const FRAMES = {

    // Centred masthead, hairline rules, everything symmetrical. Old trades.
    press(c, t, path){
      return '<header class="fr-press__top">' + markImg(c, t, 46) +
          "<h1>" + esc2(c.co) + "</h1>" +
          '<p class="fr-press__tag">' + esc2(c.site.tagline) + "</p>" +
          (c.site.est ? '<p class="fr-press__est">' + esc2(c.site.est) + "</p>" : "") +
        "</header>" +
        navHTML(c, path, "fr-press__nav", '<span class="sep">·</span>') +
        '<main class="fr-press__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-press__foot"><p>' + esc2(c.co) + " · " + esc2(c.dom) +
          (c.site.foot ? "<br>" + esc2(c.site.foot) : "") + "</p></footer>";
    },

    // Crest, tab strip, contact rail. Anything answerable to the public.
    civic(c, t, path){
      return '<div class="fr-civic__crest">' + markImg(c, t, 40) +
          "<div><h1>" + esc2(c.co) + "</h1><p>" + esc2(c.site.tagline) + "</p></div>" +
          (c.site.crestNote ? '<span class="fr-civic__note">' + esc2(c.site.crestNote) + "</span>" : "") +
        "</div>" +
        navHTML(c, path, "fr-civic__nav") +
        '<div class="fr-civic__body"><main class="fr-civic__main">' +
          renderBlocks(pageFor(c, path), c) +
        '</main><aside class="fr-civic__side">' +
          '<h3>Contact</h3><p>' + esc2(c.who) + "<br>" + esc2(c.role) + "<br><br>" +
          esc2(clientEmail(c)) + "</p>" +
          (c.site.side || []).map((s) => "<h3>" + esc2(s.h) + "</h3><p>" + esc2(s.p) + "</p>").join("") +
        "</aside></div>" +
        '<div class="fr-civic__foot">' + esc2(c.dom) +
          (c.site.foot ? " · " + esc2(c.site.foot) : "") + "</div>";
    },

    // Top bar, hero with a claim and a button, then everything else. Software.
    saas(c, t, path){
      const blocks = pageFor(c, path);
      const hero = path === "/" && c.site.hero;
      return '<div class="fr-saas__bar">' +
          '<span class="fr-saas__logo">' + markImg(c, t, 26) + "<b>" + esc2(c.co) + "</b></span>" +
          navHTML(c, path, "fr-saas__nav") +
          '<span class="fr-saas__cta2">' + esc2(c.site.navCta || "Sign in") + "</span>" +
        "</div>" +
        (hero
          ? '<div class="fr-saas__hero"><h1>' + esc2(c.site.hero.h) + "</h1>" +
            "<p>" + esc2(c.site.hero.p) + "</p>" +
            '<p class="fr-saas__btns"><button class="btn-brand">' + esc2(c.site.hero.cta) + "</button>" +
            (c.site.hero.cta2 ? '<button class="btn-ghost">' + esc2(c.site.hero.cta2) + "</button>" : "") + "</p>" +
            (c.site.hero.foot ? '<p class="fr-saas__herofoot">' + esc2(c.site.hero.foot) + "</p>" : "") +
            "</div>"
          : '<div class="fr-saas__ph"><h1>' + esc2(pageTitle(c, path).split(" — ").pop()) + "</h1></div>") +
        '<main class="fr-saas__body">' + renderBlocks(blocks, c) + "</main>" +
        '<div class="fr-saas__foot"><b>' + esc2(c.co) + "</b><span>" + esc2(c.dom) +
          (c.site.foot ? " · " + esc2(c.site.foot) : "") + "</span></div>";
    },

    // Monospace, dark, bracketed nav. Built by the person who runs it.
    terminal(c, t, path){
      return '<header class="fr-term__top">' + markImg(c, t, 34) +
          "<div><h1>" + esc2(c.co) + "</h1>" +
          '<p class="fr-term__tag">' + esc2(c.site.tagline) + "</p></div></header>" +
        navHTML(c, path, "fr-term__nav") +
        '<main class="fr-term__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-term__foot">— ' + esc2(c.who) + ", " + esc2(c.role) +
          '<br><a href="#">' + esc2(clientEmail(c)) + "</a>" +
          (c.site.foot ? '<br><span class="dimmed">' + esc2(c.site.foot) + "</span>" : "") + "</footer>";
    },

    // Dark, glowing, a sign rather than a page. Places open at night.
    neon(c, t, path){
      return '<header class="fr-neon__top">' +
          '<div class="fr-neon__sign">' + markImg(c, t, 54) +
          "<h1>" + esc2(c.co) + "</h1>" +
          '<p class="fr-neon__tag">' + esc2(c.site.tagline) + "</p></div>" +
          (c.site.strap ? '<p class="fr-neon__strap">' + esc2(c.site.strap) + "</p>" : "") +
        "</header>" +
        navHTML(c, path, "fr-neon__nav") +
        '<main class="fr-neon__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-neon__foot">' + esc2(c.co) + " · " + esc2(c.dom) +
          (c.site.foot ? "<br>" + esc2(c.site.foot) : "") + "</footer>";
    },

    // Masthead, rules, dense columns, a dateline. Print, or pretending to be.
    paper(c, t, path){
      return '<header class="fr-paper__mast">' +
          '<span class="fr-paper__side">' + esc2(c.site.mastL || "") + "</span>" +
          "<h1>" + esc2(c.co) + "</h1>" +
          '<span class="fr-paper__side fr-paper__side--r">' + esc2(c.site.mastR || "") + "</span>" +
        "</header>" +
        '<p class="fr-paper__tag">' + esc2(c.site.tagline) + "</p>" +
        navHTML(c, path, "fr-paper__nav") +
        '<main class="fr-paper__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-paper__foot">' + esc2(c.co) + " · " + esc2(c.dom) +
          (c.site.foot ? " · " + esc2(c.site.foot) : "") + "</footer>";
    },

    // The type is the interface. One foundry only.
    specimen(c, t, path){
      return '<div class="fr-spec__bar">' + markImg(c, t, 28) +
          "<b>" + esc2(c.co) + "</b>" + navHTML(c, path, "fr-spec__nav") + "</div>" +
        '<header class="fr-spec__hero"><p class="fr-spec__tag">' + esc2(c.site.tagline) + "</p>" +
          (c.site.hero ? '<div class="fr-spec__big">' + esc2(c.site.hero.h) + "</div>" : "") + "</header>" +
        '<main class="fr-spec__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-spec__foot">' + esc2(c.dom) +
          (c.site.foot ? " · " + esc2(c.site.foot) : "") + "</footer>";
    },

    // A lit board in a dark hall. Departures, arrivals, service status.
    board(c, t, path){
      return '<div class="fr-board__top">' + markImg(c, t, 34) +
          "<div><h1>" + esc2(c.co) + "</h1><p>" + esc2(c.site.tagline) + "</p></div>" +
          '<span class="fr-board__clock">' + esc2(c.site.clock || "SERVICE RUNNING") + "</span>" +
        "</div>" +
        navHTML(c, path, "fr-board__nav") +
        '<main class="fr-board__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<div class="fr-board__foot">' + esc2(c.dom) +
          (c.site.foot ? " · " + esc2(c.site.foot) : "") + "</div>";
    },

    // Image first, words after. Studios that would rather show you.
    studio(c, t, path){
      return '<div class="fr-studio__bar"><span>' + markImg(c, t, 24) + "<b>" + esc2(c.co) + "</b></span>" +
          navHTML(c, path, "fr-studio__nav") + "</div>" +
        '<header class="fr-studio__hero">' +
          "<img src=\"" + Imagery.make(refAt(c, 0), 7, 760, 260) + "\" alt=\"\">" +
          '<div class="fr-studio__over"><h1>' + esc2(c.site.tagline) + "</h1></div></header>" +
        '<main class="fr-studio__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-studio__foot">' + esc2(c.co) + " · " + esc2(clientEmail(c)) +
          (c.site.foot ? "<br>" + esc2(c.site.foot) : "") + "</footer>";
    },

    // Goods, laid out to be bought.
    shop(c, t, path){
      return '<header class="fr-shop__top">' +
          '<span class="fr-shop__logo">' + markImg(c, t, 34) + "<b>" + esc2(c.co) + "</b></span>" +
          '<span class="fr-shop__tag">' + esc2(c.site.tagline) + "</span>" +
          '<span class="fr-shop__cart">' + esc2(c.site.cart || "Basket (0)") + "</span>" +
        "</header>" +
        navHTML(c, path, "fr-shop__nav") +
        (c.site.strap ? '<p class="fr-shop__strap">' + esc2(c.site.strap) + "</p>" : "") +
        '<main class="fr-shop__body">' + renderBlocks(pageFor(c, path), c) + "</main>" +
        '<footer class="fr-shop__foot">' + esc2(c.co) + " · " + esc2(c.dom) +
          (c.site.foot ? "<br>" + esc2(c.site.foot) : "") + "</footer>";
    },
  };

  // Older data used `skin`; keep it resolving so nothing 404s mid-refactor.
  const LEGACY = { shopfront: "press", corporate: "saas", institutional: "civic", indie: "terminal" };

  function renderSite(c, path){
    const t = themeOf(c);
    const frameName = c.frame || LEGACY[c.skin] || "press";
    const frame = FRAMES[frameName] || FRAMES.press;
    return '<div class="site site--' + frameName + '" style="' + themeVars(t) + '">' +
      frame(c, t, path) + "</div>";
  }

  /* ── image search ────────────────────────────────────── */

  function searchHome(suggested){
    return '<div class="ifind">' +
      '<div class="ifind__logo">image<span>finder</span></div>' +
      '<form class="ifind__form" data-search><input name="q" placeholder="Search for pictures" autocomplete="off">' +
      '<button class="w98btn" type="submit">Search</button></form>' +
      (suggested && suggested.length
        ? '<p class="ifind__hint">Suggested for your current brief</p><p class="ifind__chips">' +
          suggested.map((q) => '<a href="#" data-q="' + attr(q) + '">' + esc2(q) + "</a>").join("") + "</p>"
        : '<p class="ifind__hint">Try a subject, a material, or a mood.</p>') +
      '<p class="ifind__note">Indexing 4,182,904 pictures. Safe search: off.</p>' +
      "</div>";
  }

  function searchResults(q, suggested){
    const n = 24;
    let grid = "";
    for (let i = 0; i < n; i++){
      grid += '<a class="ifr" href="#" data-img="' + attr(q) + '" data-i="' + i + '">' +
        '<img src="' + Imagery.make(q, i, 200, 150) + '" alt="">' +
        '<span class="ifr__n">' + esc2(Imagery.filename(q, i)) + "</span>" +
        '<span class="ifr__d">' + esc2(Imagery.dimensions(q, i)) + "</span></a>";
    }
    return '<div class="ifind ifind--res">' +
      '<div class="ifind__top"><span class="ifind__logo ifind__logo--sm">image<span>finder</span></span>' +
      '<form class="ifind__form" data-search><input name="q" value="' + attr(q) + '" autocomplete="off">' +
      '<button class="w98btn" type="submit">Search</button></form></div>' +
      '<p class="ifind__count">About ' + (1200 + q.length * 137) + " results for <b>" + esc2(q) + "</b></p>" +
      (suggested && suggested.length
        ? '<p class="ifind__chips">' + suggested.map((s) =>
            '<a href="#" data-q="' + attr(s) + '"' + (s === q ? ' class="on"' : "") + ">" + esc2(s) + "</a>").join("") + "</p>"
        : "") +
      '<div class="ifind__grid">' + grid + "</div></div>";
  }

  function notFound(u){
    return '<div class="site site--404"><h1>Cannot find server</h1>' +
      "<p>The page cannot be displayed. The server at <b>" + esc2(u) + "</b> could not be found.</p>" +
      '<p class="ml-note">Check the address, or pick something from the Resources bar.</p></div>';
  }

  /* ── resolution ──────────────────────────────────────── */

  // ctx: { client, refs } — whatever brief the browser was opened from.
  function resolve(url, ctx){
    const u = normalize(url);
    if (!u) return { title: "Cannot find server", html: notFound(url), url: String(url) };
    const host = u.hostname.toLowerCase();
    const suggested = (ctx && ctx.refs) || [];

    if (host === SEARCH_HOST){
      const q = u.searchParams.get("q");
      return q
        ? { title: q + " — imagefinder", html: searchResults(q, suggested), url: u.href }
        : { title: "imagefinder", html: searchHome(suggested), url: u.href };
    }

    const hit = Object.values(CLIENTS).find((c) => c.dom.toLowerCase() === host);
    if (hit){
      let path = u.pathname || "/";
      if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
      const pages = hit.site.pages || {};
      // An address the site does not have is a 404, the same as anywhere else.
      if (path !== "/" && !pages[path]){
        return { title: "Not found", html: renderSite(hit, "/"), url: "http://" + hit.dom + "/" };
      }
      return { title: pageTitle(hit, path), html: renderSite(hit, path), url: u.origin + path };
    }
    return { title: "Cannot find server", html: notFound(host), url: u.href };
  }

  function searchURL(q){ return "http://" + SEARCH_HOST + "/?q=" + encodeURIComponent(q); }
  const home = () => "http://" + SEARCH_HOST + "/";

  return { resolve, searchURL, home, SEARCH_HOST };
})();
