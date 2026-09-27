"use strict";
/* ── Layout mode ──────────────────────────────────────────
 * A web page built from real site blocks, edited where you see it: click a
 * block in the page to edit it, drop a card on a block to write it in, pull a
 * block out of the library onto the page. The page's own settings (tagline,
 * style, brand colour, headline face) sit in the options strip.
 *
 * mount(ed, H): see vectored.js for what H lends and what the mode sets on ed.
 */

const SuiteLayoutEd = (() => {
  const D = SuiteDoc, A = SuiteApps;
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  // What the page looks like to Sites: the document as a client with one page.
  function clientOf(ed, editing) {
    const doc = ed.doc, site = doc.site || D.site();
    const base = ed.job && ed.job.client;
    const slug = (doc.meta.name || "page").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").slice(0, 30) || "page";
    return {
      who: base ? base.who : "You", role: "", co: doc.meta.name || "Untitled", dom: slug + ".local",
      frame: Sites.FRAME_NAMES.includes(site.frame) ? site.frame : "studio",
      theme: { brand: site.brand, link: site.brand, head: "'" + site.head + "', Georgia, serif" },
      site: { tagline: site.tagline, nav: [["Home", "/"]], pages: { "/": doc.blocks } },
      refs: base && base.refs && base.refs.length ? base.refs : ["fan art", "poster", "illustration"],
      editMarks: !!editing,
    };
  }

  function mount(ed, H) {
    ed.body.innerHTML =
      '<div class="sx__opts" role="toolbar" aria-label="Page"></div>' +
      '<div class="sx__main">' +
        '<div class="sx__rail sx__rail--wide" role="toolbar" aria-label="Tools and blocks"></div>' +
        '<div class="sx__stage sx__stage--page"><div class="sx__view"><div class="sx__scroll"><div class="sx__page"></div></div></div></div>' +
        '<div class="sx__side">' +
          '<section class="sx__panel"><header class="sx__ph"><span>BLOCKS</span><em class="sx__lyn"></em></header><div class="sx__blocks"></div></section>' +
          '<section class="sx__panel sx__panel--grow"><header class="sx__ph"><span>EDIT BLOCK</span></header><div class="sx__bedit"></div></section>' +
        "</div>" +
      "</div>";
    Object.assign(ed, { tool: ed.tool === "text" ? "text" : "select", blockSel: ed.blockSel == null ? -1 : ed.blockSel });
    ed.view = ed.body.querySelector(".sx__view");
    ed.rail = ed.body.querySelector(".sx__rail");
    ed.opts = ed.body.querySelector(".sx__opts");
    const page = ed.body.querySelector(".sx__page");
    let pre = null;

    const markSel = () => page.querySelectorAll("[data-block]").forEach((el) => el.classList.toggle("is-sel", Number(el.dataset.block) === ed.blockSel));
    const paintPage = () => { page.innerHTML = Sites.renderSite(clientOf(ed, true), "/"); markSel(); };
    const select = (i, scroll, focus) => {
      ed.blockSel = i;
      paintBlocks(); paintEdit(); markSel();
      const el = scroll && page.querySelector('[data-block="' + i + '"]');
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      if (focus) { const f = ed.body.querySelector(".sx__bedit input, .sx__bedit textarea"); if (f) f.focus(); }
    };
    const listOf = (b) => { const spec = b && A.BLOCKS[b.t]; return spec && spec.list ? spec.list : null; };

    ed.draw = paintPage;
    ed.render = (o = {}) => {
      if (!ed.body.isConnected) return;
      paintPage();
      if (o.panels !== false) { paintBlocks(); paintEdit(); paintOpts(); }
      paintRail();
      if (H.painted) H.painted(ed);
    };
    ed.key = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (k === "v" || k === "t") { ed.tool = k === "v" ? "select" : "text"; H.sound("tool"); paintRail(); return true; }
      if ((e.key === "Delete" || e.key === "Backspace") && ed.blockSel >= 0) { H.mutate(ed, () => { D.removeBlock(ed.doc, ed.blockSel); ed.blockSel = Math.min(ed.blockSel, ed.doc.blocks.length - 1); }); return true; }
      return false;
    };
    ed.escape = () => { if (ed.blockSel >= 0) { select(-1); return true; } return false; };
    ed.drop = (c) => dropOnBlock(ed, H, c);
    ed.sample = () => null;
    ed.selectedImage = () => null;
    ed.place = (src, name) => {
      const n = H.addCards([{ kind: "object", label: "Cut: " + String(name || "picture").slice(0, 40), value: src, tags: ["cutout"] }]);
      H.status(ed, n ? "A picture card is in the tray: drop it on a picture block." : "That picture is already a card.");
    };
    ed.unmount = () => {};
    ed.relook = () => {};

    function paintRail() {
      const tool = (id, icon, label, key) => '<button class="sx__tool' + (ed.tool === id ? " on" : "") + '" data-tool="' + id + '" title="' + esc(label + " (" + key + ")") + '">' + iconSVG(icon, 16) + "</button>";
      ed.rail.innerHTML = '<div class="sx__rrow">' + tool("select", "t-select", "Pick a block to edit", "V") + tool("text", "t-text", "Type: click a block to write in it", "T") +
        '<button class="sx__tool dim" data-mode="vector" title="The pen draws in Vector: click to switch">' + iconSVG("t-pen", 16) + "</button></div>" +
        '<div class="sx__libh">ADD</div><div class="sx__lib">' +
        Object.entries(A.BLOCKS).map(([k, b]) => '<button class="sx__blk" data-add="' + k + '" draggable="true" title="' + esc(b.label + ": click to add, or drag it onto the page") + '">' + iconSVG("blk-" + k, 32) + "<span>" + esc(b.label) + "</span></button>").join("") +
        '</div><span class="sx__rsep"></span><div class="sx__rrow">' + H.drawerButtons(ed) + "</div>";
    }

    function paintOpts() {
      H.viewBar(ed, "");
      if (ed.opts.contains(document.activeElement)) return;
      const site = ed.doc.site || (ed.doc.site = D.site());
      const fonts = H.fonts();
      ed.opts.innerHTML =
        '<label class="sx__num sx__num--wide"><span>TAGLINE</span><input data-l="tagline" maxlength="160" value="' + esc(site.tagline) + '"></label>' +
        '<label class="sx__num"><span>STYLE</span><select data-l="frame">' + Sites.FRAME_NAMES.map((f) => "<option" + (f === site.frame ? " selected" : "") + ">" + f + "</option>").join("") + "</select></label>" +
        '<span class="sx__olab">BRAND</span><label class="sx__well" title="Brand colour"><input type="color" data-l="brand" value="' + site.brand.toLowerCase() + '"><i style="background:' + site.brand + '"></i></label>' +
        '<label class="sx__num"><span>HEADLINES</span><select data-l="head" style="font-family:\'' + esc(site.head).replace(/'/g, "") + '\'">' +
          fonts.map((f) => '<option style="font-family:\'' + esc(f.name).replace(/'/g, "") + '\'"' + (f.name === site.head ? " selected" : "") + ">" + esc(f.name) + "</option>").join("") + "</select></label>" +
        '<span class="sx__ospace"></span><button class="sx__tb" data-s="visit" title="Open the page in The Web">' + iconSVG("web", 16) + "<span>View in The Web</span></button>";
    }

    function paintBlocks() {
      const n = ed.doc.blocks.length;
      ed.body.querySelector(".sx__lyn").textContent = n ? String(n) : "";
      ed.body.querySelector(".sx__blocks").innerHTML = n ? ed.doc.blocks.map((b, i) =>
        '<div class="sx__ly' + (i === ed.blockSel ? " on" : "") + '" data-bsel="' + i + '">' + iconSVG("blk-" + b.t, 16) +
          '<span class="sx__ln">' + (i + 1) + ". " + esc((A.BLOCKS[b.t] || { label: b.t }).label) + (b.h ? " — " + esc(String(b.h).slice(0, 16)) : "") + "</span>" + (b.card ? '<em class="sx__lcard">◆</em>' : "") +
          '<button class="sx__lb" data-bmove="' + i + '" data-d="-1" title="Move up"' + (i ? "" : " disabled") + ">" + iconSVG("l-up", 16) + "</button>" +
          '<button class="sx__lb" data-bmove="' + i + '" data-d="1" title="Move down"' + (i < n - 1 ? "" : " disabled") + ">" + iconSVG("l-down", 16) + "</button>" +
          '<button class="sx__lb" data-bdel="' + i + '" title="Delete block">' + iconSVG("l-del", 16) + "</button></div>").join("")
        : '<p class="sx__hint">Empty page. Click a block on the left, or drag one onto the page.</p>';
    }

    function paintEdit() {
      const el = ed.body.querySelector(".sx__bedit");
      const b = ed.doc.blocks[ed.blockSel], spec = b && A.BLOCKS[b.t];
      if (!spec) {
        el.innerHTML = '<p class="sx__hint">Click a block in the page to edit it here.</p><p class="sx__hint">Drop a fact, trend or gap card on a block to write it in. A colour card sets the brand colour; a type card, the headline face.</p>';
        return;
      }
      let h = '<p class="sx__bname">' + iconSVG("blk-" + b.t, 16) + (ed.blockSel + 1) + ". " + esc(spec.label) + "</p>" +
        (spec.fields || []).map(([k, label]) => '<label class="sx__f"><span>' + esc(label) + '</span><input data-bf="' + k + '"></label>').join("");
      if (spec.lines) h += '<label class="sx__f"><span>' + esc(spec.lines[1]) + ' — one per line</span><textarea rows="4" data-bl="' + spec.lines[0] + '"></textarea></label>';
      const list = spec.list;
      if (list) {
        const [key, cols, labels] = list, items = b[key] || [];
        h += '<div class="sx__items"><span class="sx__itemsh">' + esc(labels.length > 1 ? "ITEMS" : labels[0]) + " (" + items.length + ")</span>" +
          items.map((it, r) => '<div class="sx__item"><div class="sx__itemh"><b>' + (r + 1) + "</b>" +
            '<button class="sx__lb" data-irm="' + r + '" title="Remove item ' + (r + 1) + '">' + iconSVG("l-del", 16) + "</button></div>" +
            cols.map((c, ci) => '<label class="sx__if"><span>' + esc(labels[ci]) + "</span>" +
              (c === "c" && b.t === "swatches"
                ? '<input type="color" data-li="' + r + '" data-lc="c" value="' + esc(/^#[0-9a-f]{6}$/i.test(it.c || "") ? it.c.toLowerCase() : "#cccccc") + '">'
                : '<input data-li="' + r + '" data-lc="' + c + '" maxlength="300">') + "</label>").join("") + "</div>").join("") +
          (items.length < A.MAX_ITEMS ? '<button class="sx__tb" data-iadd>+ Add item</button>' : "") + "</div>";
      }
      el.innerHTML = h;
      (spec.fields || []).forEach(([k]) => { el.querySelector('[data-bf="' + k + '"]').value = b[k] || ""; });
      if (spec.lines) el.querySelector("[data-bl]").value = (b[spec.lines[0]] || []).join("\n");
      if (list) el.querySelectorAll("input[data-li]:not([type=color])").forEach((inp) => {
        const it = (b[list[0]] || [])[Number(inp.dataset.li)] || {};
        inp.value = it[inp.dataset.lc] == null ? "" : String(it[inp.dataset.lc]);
      });
    }

    const readField = (t) => {
      const b = ed.doc.blocks[ed.blockSel], spec = b && A.BLOCKS[b.t];
      if (!spec) return;
      if (t.dataset.bf) b[t.dataset.bf] = t.value.slice(0, 400);
      if (t.dataset.bl) b[t.dataset.bl] = t.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, A.MAX_ITEMS).map((s) => s.slice(0, 400));
      if (t.dataset.li !== undefined && spec.list) {
        const it = (b[spec.list[0]] || [])[Number(t.dataset.li)];
        // A swatch colour ends up in a style attribute: the picker only gives hex.
        if (it) it[t.dataset.lc] = t.type === "color" ? t.value.toUpperCase() : t.value.slice(0, 300);
      }
    };

    const root = ed.body;
    root.addEventListener("focusin", (e) => { if (e.target.closest(".sx__bedit,[data-l='tagline']")) pre = JSON.stringify(ed.doc); });
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.l === "tagline") { ed.doc.site.tagline = t.value.slice(0, 160); paintPage(); return; }
      if (t.dataset.l === "brand") { const i = t.parentNode.querySelector("i"); if (i) i.style.background = t.value; return; }
      if (t.closest(".sx__bedit")) { readField(t); paintPage(); }
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.l === "frame" || t.dataset.l === "brand" || t.dataset.l === "head") {
        H.mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, [t.dataset.l]: t.dataset.l === "brand" ? t.value.toUpperCase() : t.value }); });
        return;
      }
      if (t.closest(".sx__bedit") || t.dataset.l === "tagline") { if (pre) { H.record(ed, pre, { panels: false }); pre = JSON.stringify(ed.doc); paintBlocks(); } }
    });
    root.addEventListener("click", (e) => {
      if (e.target.closest(".sx__page")) {
        // The preview is not navigable; a click in it picks the block it lands on.
        e.preventDefault();
        const hit = e.target.closest("[data-block]");
        if (hit) select(Number(hit.dataset.block), false, ed.tool === "text");
        return;
      }
      const t = e.target.closest("[data-tool],[data-mode],[data-add],[data-bsel],[data-bmove],[data-bdel],[data-iadd],[data-irm],[data-s],[data-drawer]");
      if (!t) return;
      if (t.dataset.drawer) { H.toggleDrawer(ed, t.dataset.drawer); return; }
      if (t.dataset.tool) { ed.tool = t.dataset.tool; H.sound("tool"); paintRail(); return; }
      if (t.dataset.mode) { H.switchMode(ed, t.dataset.mode); return; }
      if (t.dataset.add) { addBlock(t.dataset.add, ed.blockSel >= 0 ? ed.blockSel + 1 : ed.doc.blocks.length); return; }
      if (t.dataset.bmove) { const i = Number(t.dataset.bmove), d = Number(t.dataset.d); H.mutate(ed, () => { if (D.moveBlock(ed.doc, i, d)) ed.blockSel = i + d; }); H.sound("layer"); return; }
      if (t.dataset.bdel) { const i = Number(t.dataset.bdel); H.mutate(ed, () => { D.removeBlock(ed.doc, i); ed.blockSel = Math.min(ed.blockSel, ed.doc.blocks.length - 1); }); H.sound("close"); return; }
      if (t.dataset.bsel) { select(Number(t.dataset.bsel), true); return; }
      if (t.dataset.iadd !== undefined || t.dataset.irm !== undefined) {
        const b = ed.doc.blocks[ed.blockSel], list = listOf(b);
        if (!list) return;
        H.mutate(ed, () => {
          const items = b[list[0]] = b[list[0]] || [];
          if (t.dataset.irm !== undefined) items.splice(Number(t.dataset.irm), 1);
          else if (items.length < A.MAX_ITEMS) items.push(A.blankItem(list[1]));
        });
        if (t.dataset.iadd !== undefined) { const rows = root.querySelectorAll(".sx__bedit .sx__item"); const f = rows.length && rows[rows.length - 1].querySelector("input"); if (f) f.focus(); }
        return;
      }
      if (t.dataset.s === "visit") H.visitLayout(ed, clientOf(ed));
    });
    page.addEventListener("submit", (e) => e.preventDefault(), true);

    function addBlock(type, at) {
      H.mutate(ed, () => { if (D.addBlock(ed.doc, A.BLOCKS[type].make(), at)) ed.blockSel = at; });
      H.sound("drop");
      const added = page.querySelector('[data-block="' + ed.blockSel + '"]');
      if (added) { added.scrollIntoView({ block: "nearest", behavior: "smooth" }); added.classList.add("is-new"); }
    }

    // Blocks dragged out of the library, and cards, land where they are dropped.
    const blockAt = (e) => { const el = e.target.closest && e.target.closest("[data-block]"); return el ? Number(el.dataset.block) : -1; };
    const clear = () => page.querySelectorAll(".is-drop,.is-drop-after").forEach((el) => el.classList.remove("is-drop", "is-drop-after"));
    root.addEventListener("dragstart", (e) => { const b = e.target.closest && e.target.closest("[data-add]"); if (b) { e.dataTransfer.setData("text/x-pxblock", b.dataset.add); e.dataTransfer.effectAllowed = "copy"; } });
    ed.view.addEventListener("dragover", (e) => {
      if (e.target.closest && e.target.closest(".dw")) return;
      const types = e.dataTransfer.types;
      if (!types.includes("text/x-pxcard") && !types.includes("text/x-pxblock")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      clear();
      const i = blockAt(e);
      const el = i >= 0 && page.querySelector('[data-block="' + i + '"]');
      if (el) {
        if (types.includes("text/x-pxblock")) { const r = el.getBoundingClientRect(); el.classList.add(e.clientY > r.top + r.height / 2 ? "is-drop-after" : "is-drop"); }
        else el.classList.add("is-drop");
      }
    });
    ed.view.addEventListener("dragleave", (e) => { if (!ed.view.contains(e.relatedTarget)) clear(); });
    ed.view.addEventListener("drop", (e) => {
      if (e.target.closest && e.target.closest(".dw")) return;
      const block = e.dataTransfer.getData("text/x-pxblock"), id = e.dataTransfer.getData("text/x-pxcard");
      const i = blockAt(e), el = i >= 0 && page.querySelector('[data-block="' + i + '"]');
      clear();
      if (block && A.BLOCKS[block]) {
        e.preventDefault();
        const after = el && e.clientY > el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
        addBlock(block, i < 0 ? ed.doc.blocks.length : i + (after ? 1 : 0));
        return;
      }
      if (!id) return;
      e.preventDefault();
      if (i >= 0) ed.blockSel = i;
      dropOnBlock(ed, H, H.card(id));
    });

    ed.render();
    H.status(ed, "Click a block in the page to edit it. Drag a card onto a block to write it in; drag a block from the left onto the page.");
  }

  function dropOnBlock(ed, H, c) {
    if (!c) return;
    H.sound("drop");
    if (c.kind === "colour") {
      H.mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, brand: c.value }); SuiteCards.applyToCanvas(ed.doc, c); });
      H.status(ed, "Brand colour: " + c.label);
      return;
    }
    if (c.kind === "type") {
      H.mutate(ed, () => { ed.doc.site = D.site({ ...ed.doc.site, head: c.value }); if (!ed.doc.meta.intent.includes(c.id)) ed.doc.meta.intent.push(c.id); });
      H.status(ed, "Headline typeface: " + c.value);
      return;
    }
    const res = H.mutate(ed, () => (ed.blockSel >= 0 ? SuiteCards.applyToBlock(ed.doc, ed.blockSel, c) : SuiteCards.applyToCanvas(ed.doc, c)));
    H.status(ed, res.ok ? c.label + ": " + res.what : res.reason);
  }

  return { mount, clientOf };
})();
