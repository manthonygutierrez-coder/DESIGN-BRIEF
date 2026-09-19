"use strict";
/* ── the room editor ──────────────────────────────────────
 * Rooms and framing are data, so they ought to be editable where you can see
 * them: on the desktop, against a live feed, rather than by guessing numbers
 * into content.js and reloading.
 *
 * Drag a prop to move it, drag its corner to size it, tint it away from the
 * site's brand, add more, throw some away. The feed repaints as you go.
 *
 * Edits are written into the save slot AND onto HUSTLE.people in memory, so
 * everything downstream — the call, the About-page photographs — picks them up
 * at once and they survive a reload. content.js stays the source of truth:
 * when a room is right, Copy and paste it back.
 */

const RoomEdit = (() => {
  const Por = typeof Portraits !== "undefined" ? Portraits : null;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const KEY = "roomedit";

  let state = null, who = null, sel = -1, timer = 0, drag = null, saveAt = 0;

  const people = () => (typeof HUSTLE !== "undefined" && HUSTLE.people) || {};
  const person = () => people()[who] || {};
  const siteOf = (h) => (HUSTLE.sites || {})[(people()[h] || {}).dom] || {};

  function themeFor(h) {
    const t = (siteOf(h).theme) || {};
    const n = parseInt(String(t.bg || "#202020").slice(1), 16) || 0;
    const lum = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
    return { bg: t.bg || "#202020", panel: t.panel || "#2A2A2A", ink: t.ink || "#EEE",
             dim: t.dim || "#888", line: t.line || "#444", brand: t.brand || "#4E6E88",
             brand2: t.brand2, dark: lum < 0.5 };
  }

  /* ── where edits live ────────────────────────────────── */
  const bag = () => {
    const h = state.hustle || (state.hustle = {});
    return (h.rooms = h.rooms || {});
  };
  const room = () => person().room || [];
  const frame = () => person().frame || {};

  // Put saved edits back onto the content at boot, so the rest of the game
  // never has to know this editor exists.
  function applySaved(st) {
    state = st;
    const saved = (st.hustle && st.hustle.rooms) || {};
    for (const h of Object.keys(saved)) {
      if (!people()[h]) continue;
      if (saved[h].room) people()[h].room = JSON.parse(JSON.stringify(saved[h].room));
      if (saved[h].frame) people()[h].frame = Object.assign({}, saved[h].frame);
    }
  }

  function commit() {
    if (!state || !who) return;
    bag()[who] = { room: JSON.parse(JSON.stringify(room())), frame: Object.assign({}, frame()) };
    const now = Date.now();
    if (now - saveAt > 500) { saveAt = now; Bridge.saveState(state); }   // drags are not a save each
    else { clearTimeout(timer._s); timer._s = setTimeout(() => Bridge.saveState(state), 600); }
    repaintOthers();
  }

  // Anything else on screen that draws this person.
  function repaintOthers() {
    if (typeof Web !== "undefined" && Web.repaint) { try { Web.repaint(); } catch (e) {} }
  }

  /* ── the window ──────────────────────────────────────── */
  function open(handle) {
    if (!Por) return null;
    const first = Object.keys(people())[0];
    who = handle || who || first;
    if (!who) return null;
    let w = getWin(KEY);
    if (!w) {
      w = createWindow({ key: KEY, title: "ROOM EDITOR", iconId: "roomedit",
                         w: 700, h: 640, minW: 560, minH: 500, className: "w98--re" });
      w.client.classList.add("client--flush");
      w.client.addEventListener("click", onClick);
      w.client.addEventListener("change", onChange);
      w.client.addEventListener("input", onInput);
      w.client.addEventListener("pointerdown", onDown);
    }
    render();
    if (!timer) timer = setInterval(paint, 110);
    return revealWin(w);
  }

  function render() {
    const w = getWin(KEY);
    if (!w) return;
    const p = person(), items = room(), f = frame();
    const props = Object.keys(Por.PROPS);
    const cur = items[sel];
    const D = Object.assign({}, Por.SHOTS.call, f);

    const slider = (k, lo, hi, step) =>
      '<label class="re__s"><b>' + k + "</b>" +
      '<input type="range" data-f="' + k + '" min="' + lo + '" max="' + hi + '" step="' + step + '" value="' + D[k] + '">' +
      "<span>" + r3(D[k]) + "</span></label>";

    w.client.innerHTML =
      '<div class="re">' +
        '<div class="re__who">' + Object.keys(people()).map((h) =>
          '<button class="w98btn' + (h === who ? " on" : "") + '" data-re="who" data-h="' + esc(h) + '">' +
          esc(people()[h].name) + "</button>").join("") +
          '<span class="re__dom">' + esc(p.dom || "") + "</span></div>" +

        '<div class="re__main">' +
          '<div class="re__stage">' +
            '<canvas class="re__feed" width="320" height="240"></canvas>' +
            '<div class="re__boxes"></div>' +
            '<p class="re__hint">Drag to move · corner to size · arrows nudge · shift+arrows size</p>' +
          "</div>" +

          '<div class="re__side">' +
            '<div class="re__grp"><b class="re__h">PROPS</b>' +
              '<ol class="re__list">' + items.map((it, i) =>
                '<li class="re__it' + (i === sel ? " on" : "") + '" data-re="pick" data-i="' + i + '">' +
                '<i style="background:' + esc(it.c || themeFor(who).brand) + '"></i>' +
                "<span>" + esc(it.p) + "</span></li>").join("") +
              (items.length ? "" : '<li class="re__none">Empty room.</li>') + "</ol>" +
              '<div class="re__row"><select data-re-add>' + props.map((k) =>
                '<option value="' + k + '">' + k + "</option>").join("") + "</select>" +
                '<button class="w98btn" data-re="add">Add</button></div>' +
            "</div>" +

            '<div class="re__grp"' + (cur ? "" : " hidden") + '><b class="re__h">SELECTED</b>' +
              (cur ? '<div class="re__row"><select data-re="type">' + props.map((k) =>
                  '<option value="' + k + '"' + (k === cur.p ? " selected" : "") + ">" + k + "</option>").join("") + "</select></div>" +
                '<div class="re__row"><label class="re__tint">tint' +
                  '<input type="color" data-re="tint" value="' + esc(cur.c || themeFor(who).brand) + '"></label>' +
                  '<button class="w98btn" data-re="untint"' + (cur.c ? "" : " disabled") + ">Use brand</button></div>" +
                '<p class="re__nums">x ' + r3(cur.x) + " · y " + r3(cur.y) + " · w " + r3(cur.w) + " · h " + r3(cur.h) + "</p>" +
                '<div class="re__row"><button class="w98btn" data-re="back">Back</button>' +
                  '<button class="w98btn" data-re="front">Front</button>' +
                  '<button class="w98btn" data-re="dupe">Duplicate</button>' +
                  '<button class="w98btn" data-re="del">Delete</button></div>' : "") +
            "</div>" +

            '<div class="re__grp"><b class="re__h">FRAMING</b>' +
              slider("dx", 0, 1, 0.01) + slider("dy", -0.2, 0.6, 0.01) +
              slider("dw", 0.2, 1, 0.01) + slider("dh", 0.3, 1.4, 0.01) +
              slider("sy", 0, 8, 1) + slider("sh", 12, 30, 1) +
              '<div class="re__row"><button class="w98btn" data-re="resetframe">Default framing</button></div>' +
            "</div>" +

            '<div class="re__grp"><b class="re__h">EXPORT</b>' +
              '<textarea class="re__out" readonly rows="6"></textarea>' +
              '<div class="re__row"><button class="w98btn" data-re="copy">Copy for content.js</button>' +
                '<button class="w98btn" data-re="revert">Revert this person</button></div>' +
              '<p class="re__note" data-re-note>Edits are live and saved to this slot. Paste the block into <b>hustle/content.js</b> to make them permanent.</p>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>";

    boxes();
    exportText();
    paint();
  }

  /* ── the draggable overlay ───────────────────────────── */
  function boxes() {
    const w = getWin(KEY);
    if (!w) return;
    const host = w.client.querySelector(".re__boxes");
    if (!host) return;
    host.innerHTML = room().map((it, i) =>
      '<div class="re__box' + (i === sel ? " on" : "") + '" data-box="' + i + '" style="' +
      "left:" + (it.x * 100) + "%;top:" + (it.y * 100) + "%;" +
      "width:" + (it.w * 100) + "%;height:" + (it.h * 100) + '%">' +
      '<em>' + esc(it.p) + "</em><i data-grip=\"" + i + "\"></i></div>").join("");
  }

  function onDown(e) {
    const grip = e.target.closest("[data-grip]");
    const box = e.target.closest("[data-box]");
    if (!grip && !box) return;
    const i = Number((grip || box).dataset.grip || box.dataset.box);
    const stage = getWin(KEY).client.querySelector(".re__stage");
    const r = stage.getBoundingClientRect();
    sel = i;
    drag = { i, mode: grip ? "size" : "move", r,
             ox: e.clientX / r.width, oy: e.clientY / r.height,
             it: Object.assign({}, room()[i]) };
    e.preventDefault();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    render();
  }

  function onMove(e) {
    if (!drag) return;
    const it = room()[drag.i];
    if (!it) return;
    const dx = (e.clientX / drag.r.width) - drag.ox;
    const dy = (e.clientY / drag.r.height) - drag.oy;
    if (drag.mode === "move") {
      it.x = clamp(drag.it.x + dx, -0.2, 1);
      it.y = clamp(drag.it.y + dy, -0.2, 1);
    } else {
      it.w = clamp(drag.it.w + dx, 0.03, 1.2);
      it.h = clamp(drag.it.h + dy, 0.03, 1.4);
    }
    boxes();
    nums();
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    drag = null;
    commit();
    render();
  }

  function nums() {
    const w = getWin(KEY), it = room()[sel];
    if (!w || !it) return;
    const el = w.client.querySelector(".re__nums");
    if (el) el.textContent = "x " + r3(it.x) + " · y " + r3(it.y) + " · w " + r3(it.w) + " · h " + r3(it.h);
  }

  /* ── controls ────────────────────────────────────────── */
  function onClick(e) {
    const b = e.target.closest("[data-re]");
    if (!b) return;
    const a = b.dataset.re, items = room();
    if (a === "who") { who = b.dataset.h; sel = -1; render(); return; }
    if (a === "pick") { sel = Number(b.dataset.i); render(); return; }
    if (a === "add") {
      const kind = getWin(KEY).client.querySelector("[data-re-add]").value;
      items.push({ p: kind, x: 0.40, y: 0.30, w: 0.20, h: 0.24 });
      sel = items.length - 1;
    }
    if (a === "del" && items[sel]) { items.splice(sel, 1); sel = Math.min(sel, items.length - 1); }
    if (a === "dupe" && items[sel]) {
      const c = JSON.parse(JSON.stringify(items[sel]));
      c.x = clamp(c.x + 0.04, 0, 1); c.y = clamp(c.y + 0.04, 0, 1);
      items.splice(sel + 1, 0, c); sel += 1;
    }
    if (a === "back" && sel > 0) { items.splice(sel - 1, 0, items.splice(sel, 1)[0]); sel -= 1; }
    if (a === "front" && sel > -1 && sel < items.length - 1) { items.splice(sel + 1, 0, items.splice(sel, 1)[0]); sel += 1; }
    if (a === "untint" && items[sel]) delete items[sel].c;
    if (a === "resetframe") person().frame = {};
    if (a === "revert") {
      delete bag()[who];
      Bridge.saveState(state);
      note("Reverted — reload the app to see the file's own version.");
      return;
    }
    if (a === "copy") { copy(); return; }
    commit(); render();
  }

  function onChange(e) {
    const t = e.target.closest("[data-re]");
    if (!t) return;
    if (t.dataset.re === "type" && room()[sel]) { room()[sel].p = t.value; commit(); render(); }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset && t.dataset.re === "tint" && room()[sel]) {
      room()[sel].c = t.value;
      commit();
      const sw = getWin(KEY).client.querySelector(".re__it.on i");
      if (sw) sw.style.background = t.value;
      return;
    }
    if (t.dataset && t.dataset.f) {
      const f = person().frame || (person().frame = {});
      f[t.dataset.f] = Number(t.value);
      const out = t.parentNode.querySelector("span");
      if (out) out.textContent = r3(Number(t.value));
      commit();
      exportText();
    }
  }

  /* ── keyboard nudge ──────────────────────────────────── */
  function onKey(e) {
    const w = getWin(KEY);
    if (!w || w.el.hidden || sel < 0 || !room()[sel]) return;
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    const step = e.altKey ? 0.002 : 0.01;
    const it = room()[sel];
    const k = e.key;
    if (!/^Arrow/.test(k)) return;
    if (e.shiftKey) {
      if (k === "ArrowRight") it.w = clamp(it.w + step, 0.03, 1.2);
      if (k === "ArrowLeft")  it.w = clamp(it.w - step, 0.03, 1.2);
      if (k === "ArrowDown")  it.h = clamp(it.h + step, 0.03, 1.4);
      if (k === "ArrowUp")    it.h = clamp(it.h - step, 0.03, 1.4);
    } else {
      if (k === "ArrowRight") it.x = clamp(it.x + step, -0.2, 1);
      if (k === "ArrowLeft")  it.x = clamp(it.x - step, -0.2, 1);
      if (k === "ArrowDown")  it.y = clamp(it.y + step, -0.2, 1);
      if (k === "ArrowUp")    it.y = clamp(it.y - step, -0.2, 1);
    }
    e.preventDefault();
    boxes(); nums(); commit(); exportText();
  }

  /* ── the live feed ───────────────────────────────────── */
  let phase = 0;
  function paint() {
    const w = getWin(KEY);
    if (!w) { clearInterval(timer); timer = 0; return; }
    const c = w.client.querySelector(".re__feed");
    if (!c || !Por) return;
    phase = (phase + 1) % 8;
    Por.paintFeed(c, who, person().look, {
      theme: themeFor(who), room: room(), frame: person().frame,
      mood: "neutral", blink: phase === 5, mouthOpen: false,
      bob: phase < 3, glance: false, glitch: 0,
    });
  }

  /* ── export ──────────────────────────────────────────── */
  function block() {
    const f = person().frame || {};
    const lines = [];
    if (Object.keys(f).length) {
      lines.push("      frame: { " + Object.keys(f).map((k) => k + ": " + r3(f[k])).join(", ") + " },");
    }
    lines.push("      room: [");
    for (const it of room()) {
      lines.push("        { p: \"" + it.p + "\", x: " + r3(it.x) + ", y: " + r3(it.y) +
                 ", w: " + r3(it.w) + ", h: " + r3(it.h) + (it.c ? ", c: \"" + it.c + "\"" : "") + " },");
    }
    lines.push("      ],");
    return lines.join("\n");
  }
  function exportText() {
    const w = getWin(KEY);
    const el = w && w.client.querySelector(".re__out");
    if (el) el.value = block();
  }
  function note(msg) {
    const w = getWin(KEY);
    const el = w && w.client.querySelector("[data-re-note]");
    if (el) el.textContent = msg;
  }
  function copy() {
    const text = block();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => note("Copied. Paste it over " + who + "'s room in hustle/content.js."),
        () => note("Couldn't reach the clipboard — select the text above and copy it."));
    } else {
      const el = getWin(KEY).client.querySelector(".re__out");
      el.select();
      note("Selected — press Cmd+C.");
    }
  }

  document.addEventListener("keydown", onKey);

  return { open, applySaved, block };
})();

if (typeof module !== "undefined") module.exports = RoomEdit;
