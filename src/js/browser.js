"use strict";
/* ── the browser ──────────────────────────────────────────
 * Locked until a client sends you a link. After that it lives on the
 * desktop permanently, with a Resources bar that grows as you take on
 * more work.
 *
 * Back/forward is a real history stack with a cursor, so navigating from
 * the middle truncates the forward entries, exactly as it should.
 */

const Web = (() => {
  let unlocked = false;
  let ctx = null;                 // { client, refs } for the current brief
  let hist = [], cursor = -1;
  let favs = [];                  // [{label, url}]
  let typedHistory = [];          // URL bar dropdown

  function key(){ return "browser"; }

  /* ── unlocking ───────────────────────────────────────── */
  function unlock(){
    if (unlocked) return;
    unlocked = true;
    addShortcut("browser", "The Web", "web", () => open());
    const sc = shortcuts.get("browser");
    if (sc) sc.classList.remove("locked");
  }

  function addFav(label, url){
    if (favs.some((f) => f.url === url)) return;
    favs.push({ label, url });
    paintFavs();
  }

  /* ── navigation ──────────────────────────────────────── */
  function visit(url, client){
    unlock();
    if (client){
      ctx = { client, refs: client.refs || [] };
      addFav(client.co, "http://" + client.dom + "/");
    }
    addFav("imagefinder", Sites.home());
    const w = open();
    go(url);
    revealWin(w);
    return w;
  }

  function go(url, opts = {}){
    const page = Sites.resolve(url, ctx);
    if (!opts.replace){
      // navigating from the middle drops everything ahead of us
      hist = hist.slice(0, cursor + 1);
      hist.push(page.url);
      cursor = hist.length - 1;
    }
    if (!typedHistory.includes(page.url)){
      typedHistory.unshift(page.url);
      typedHistory = typedHistory.slice(0, 12);
    }
    paint(page);
  }

  function back(){ if (cursor > 0){ cursor--; paint(Sites.resolve(hist[cursor], ctx)); } }
  function forward(){ if (cursor < hist.length - 1){ cursor++; paint(Sites.resolve(hist[cursor], ctx)); } }
  function reload(){ if (cursor >= 0) paint(Sites.resolve(hist[cursor], ctx)); }

  /* ── window ──────────────────────────────────────────── */
  function open(){
    const existing = getWin(key());
    if (existing) return revealWin(existing);

    const w = createWindow({
      key: key(), title: "The Web", iconId: "web",
      w: 760, h: 540, minW: 480, minH: 320, className: "w98--web",
    });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="ie">' +
        '<div class="ie__bar">' +
          '<button class="iebtn" data-b="back" title="Back">&#9664;</button>' +
          '<button class="iebtn" data-b="fwd" title="Forward">&#9654;</button>' +
          '<button class="iebtn" data-b="stop" title="Stop">&#10005;</button>' +
          '<button class="iebtn" data-b="reload" title="Refresh">&#8635;</button>' +
          '<button class="iebtn" data-b="home" title="Home">&#8962;</button>' +
        '</div>' +
        '<div class="ie__addr">' +
          '<label>Address</label>' +
          '<div class="ie__urlwrap">' +
            '<input class="ie__url" spellcheck="false" autocomplete="off">' +
            '<button class="ie__drop" data-b="drop" aria-label="Recent addresses">&#9660;</button>' +
            '<ul class="ie__hist"></ul>' +
          '</div>' +
          '<button class="w98btn" data-b="go">Go</button>' +
        '</div>' +
        '<div class="ie__favs"><span class="ie__favlbl">Resources</span><span class="ie__favlist"></span></div>' +
        '<div class="ie__view" tabindex="0"></div>' +
        '<div class="ie__status"><span class="ie__msg">Done</span><span class="ie__zone">Internet zone</span></div>' +
      '</div>';

    w.client.addEventListener("click", onClick);
    w.client.addEventListener("submit", onSubmit);
    w.client.querySelector(".ie__url").addEventListener("keydown", (e) => {
      if (e.key === "Enter"){ e.preventDefault(); go(e.target.value); }
      if (e.key === "Escape") hideDrop();
    });
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".ie__urlwrap")) hideDrop();
    });
    paintFavs();
    if (cursor >= 0) paint(Sites.resolve(hist[cursor], ctx));
    else go(Sites.home());
    return w;
  }

  /* ── painting ────────────────────────────────────────── */
  function el(sel){
    const w = getWin(key());
    return w ? w.client.querySelector(sel) : null;
  }

  function paint(page){
    const w = getWin(key());
    if (!w) return;
    w.client.querySelector(".ie__url").value = page.url;
    const view = w.client.querySelector(".ie__view");
    view.innerHTML = page.html;
    view.scrollTop = 0;
    w.setTitle(page.title + " — The Web");
    w.client.querySelector(".ie__msg").textContent = "Done";
    w.client.querySelector('[data-b="back"]').disabled = cursor <= 0;
    w.client.querySelector('[data-b="fwd"]').disabled = cursor >= hist.length - 1;
  }

  function paintFavs(){
    const list = el(".ie__favlist");
    if (!list) return;
    list.innerHTML = favs.map((f) =>
      '<button class="ie__fav" data-url="' + f.url.replace(/"/g, "&quot;") + '">' +
      f.label.replace(/[&<>]/g, "") + '</button>').join("");
  }

  function showDrop(){
    const ul = el(".ie__hist");
    if (!ul) return;
    ul.innerHTML = typedHistory.map((u) =>
      '<li><button data-url="' + u.replace(/"/g, "&quot;") + '">' + u.replace(/[&<>]/g, "") + '</button></li>').join("")
      || '<li class="ie__none">No recent addresses</li>';
    ul.classList.add("on");
  }
  function hideDrop(){ const ul = el(".ie__hist"); if (ul) ul.classList.remove("on"); }

  /* ── interaction ─────────────────────────────────────── */
  function onSubmit(e){
    const form = e.target.closest("[data-search]");
    if (!form) return;
    e.preventDefault();
    const q = form.querySelector("input").value.trim();
    if (q) go(Sites.searchURL(q));
  }

  function onClick(e){
    const b = e.target.closest("[data-b]");
    if (b && !b.disabled){
      const a = b.dataset.b;
      if (a === "back") back();
      else if (a === "fwd") forward();
      else if (a === "reload") reload();
      else if (a === "home") go(Sites.home());
      else if (a === "stop") { const m = el(".ie__msg"); if (m) m.textContent = "Stopped"; }
      else if (a === "go") go(el(".ie__url").value);
      else if (a === "drop"){
        const ul = el(".ie__hist");
        ul.classList.contains("on") ? hideDrop() : showDrop();
      }
      return;
    }

    const urlBtn = e.target.closest("[data-url]");
    if (urlBtn){ e.preventDefault(); hideDrop(); go(urlBtn.dataset.url); return; }

    const chip = e.target.closest("[data-q]");
    if (chip){ e.preventDefault(); go(Sites.searchURL(chip.dataset.q)); return; }

    const img = e.target.closest("[data-img]");
    if (img){ e.preventDefault(); lightbox(img.dataset.img, parseInt(img.dataset.i, 10)); return; }
  }

  /* Full view of one search result, in its own window like a saved image. */
  function lightbox(q, i){
    const k = "img:" + q + ":" + i;
    const existing = getWin(k);
    if (existing) return revealWin(existing);
    const w = createWindow({
      key: k, title: Imagery.filename(q, i), iconId: "web",
      w: 520, h: 440, minW: 300, minH: 240, className: "w98--web",
    });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="lb"><img src="' + Imagery.make(q, i, 640, 460) + '" alt="">' +
      '<div class="lb__meta"><b>' + Imagery.filename(q, i).replace(/[&<>]/g, "") + '</b>' +
      '<span>' + Imagery.dimensions(q, i) + ' · from a search for “' + q.replace(/[&<>]/g, "") + '”</span></div></div>';
    return w;
  }

  return { visit, open, unlock, addFav, isUnlocked: () => unlocked };
})();
