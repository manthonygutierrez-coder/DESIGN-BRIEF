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

  let state = null, who = null, sel = -1, timer = 0, drag = null, saveAt = 0, saveSoon = 0;

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
  // Which of the two shots this person sits in — see FRAMINGS in portraits.js.
  const framing = () => (Por && Por.FRAMINGS[person().framing] ? person().framing : "against");
  const shotRect = () => Object.assign({}, Por.FRAMINGS[framing()].shot, frame());
  // Back wall, in the room, or between the lens and them.
  const BANDS = [["wall", "Back wall", 0.06], ["room", "In the room", 0.32], ["fore", "Foreground", 0.86]];
  const bandOf = (z) => (z < 0.2 ? "wall" : z < 0.6 ? "room" : "fore");

  // Put saved edits back onto the content at boot, so the rest of the game
  // never has to know this editor exists.
  function applySaved(st) {
    state = st;
    const saved = (st.hustle && st.hustle.rooms) || {};
    for (const h of Object.keys(saved)) {
      if (!people()[h]) continue;
      if (saved[h].room) people()[h].room = JSON.parse(JSON.stringify(saved[h].room));
      if (saved[h].frame) people()[h].frame = Object.assign({}, saved[h].frame);
      if (saved[h].framing) people()[h].framing = saved[h].framing;
    }
  }

  function commit() {
    if (!state || !who) return;
    bag()[who] = { room: JSON.parse(JSON.stringify(room())), frame: Object.assign({}, frame()), framing: framing() };
    const now = Date.now();
    if (now - saveAt > 500) { saveAt = now; Bridge.saveState(state); }   // drags are not a save each
    else { clearTimeout(saveSoon); saveSoon = setTimeout(() => Bridge.saveState(state), 600); }
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
    const p = person(), items = room();
    const props = Object.keys(Por.PROPS);
    const cur = items[sel];
    const z = cur ? Por.zOf(cur) : 0;

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
                "<span>" + esc(it.p) + "</span>" +
                '<em class="re__z re__z--' + bandOf(Por.zOf(it)) + '">' + bandOf(Por.zOf(it)) + "</em></li>").join("") +
              (items.length ? "" : '<li class="re__none">Empty room.</li>') + "</ol>" +
              // Pick what a thing looks like, not what it is called.
              '<div class="re__thumbs">' + props.map((k) =>
                '<button class="re__th" data-re="add" data-p="' + k + '" title="Add a ' + k + '">' +
                '<canvas width="46" height="34" data-thumb="' + k + '"></canvas>' +
                "<span>" + k + "</span></button>").join("") + "</div>" +
            "</div>" +

            '<div class="re__grp"' + (cur ? "" : " hidden") + '><b class="re__h">SELECTED</b>' +
              (cur ? '<div class="re__row"><select data-re="type">' + props.map((k) =>
                  '<option value="' + k + '"' + (k === cur.p ? " selected" : "") + ">" + k + "</option>").join("") + "</select></div>" +
                '<div class="re__row"><label class="re__tint">tint' +
                  '<input type="color" data-re="tint" value="' + esc(cur.c || themeFor(who).brand) + '"></label>' +
                  '<button class="w98btn" data-re="untint"' + (cur.c ? "" : " disabled") + ">Use brand</button></div>" +
                // How far off it stands: size, colour and what it passes in front of.
                '<div class="re__row re__bands">' + BANDS.map(([k, label]) =>
                  '<button class="w98btn re__band re__band--' + k + (bandOf(z) === k ? " on" : "") + '" ' +
                  'data-re="band" data-b="' + k + '">' + label + "</button>").join("") + "</div>" +
                '<div class="re__row"><button class="w98btn" data-re="further">◂ further</button>' +
                  '<span class="re__zn">' + r3(z) + "</span>" +
                  '<button class="w98btn" data-re="nearer">nearer ▸</button></div>' +
                '<p class="re__nums">x ' + r3(cur.x) + " · y " + r3(cur.y) + " · w " + r3(cur.w) + " · h " + r3(cur.h) + "</p>" +
                '<div class="re__row"><button class="w98btn" data-re="back">Back</button>' +
                  '<button class="w98btn" data-re="front">Front</button>' +
                  '<button class="w98btn" data-re="dupe">Duplicate</button>' +
                  '<button class="w98btn" data-re="del">Delete</button></div>' : "") +
            "</div>" +

            '<div class="re__grp"><b class="re__h">SHOT</b>' +
              Por.FRAMING_NAMES.map((k) => {
                const fr = Por.FRAMINGS[k];
                return '<button class="re__shot re__shot--' + k + (framing() === k ? " on" : "") + '" data-re="shot" data-k="' + k + '">' +
                  "<b>" + esc(fr.label) + "</b><span>" + esc(fr.hint) + "</span></button>";
              }).join("") +
              '<p class="re__note">Drag them in the feed to move them, their corner to size them.</p>' +
              '<div class="re__row"><button class="w98btn" data-re="resetframe">Reset their position</button></div>' +
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

    thumbs();
    boxes();
    exportText();
    paint();
  }

  // Each prop drawn as itself, in this person's colours and at the distance
  // that kind of thing usually sits: a picker you can read at a glance.
  function thumbs() {
    const w = getWin(KEY);
    if (!w || !Por) return;
    const th = themeFor(who);
    w.client.querySelectorAll("[data-thumb]").forEach((c) => {
      const kind = c.dataset.thumb, fn = Por.PROPS[kind];
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      const graded = Por.gradeTheme(th, Por.zOf({ p: kind }));
      g.fillStyle = graded.bg; g.fillRect(0, 0, c.width, c.height);
      if (fn) fn(g, 5, 3, c.width - 10, c.height - 6, graded, Por.rngFrom(Por.seedOf(kind)));
    });
  }

  /* ── the draggable overlay ───────────────────────────── */
  function boxes() {
    const w = getWin(KEY);
    if (!w) return;
    const host = w.client.querySelector(".re__boxes");
    if (!host) return;
    const pc = (v) => (v * 100) + "%";
    // A box sits where the prop actually lands, distance and all.
    host.innerHTML = room().map((it, i) => {
      const r = Por.project(it, Por.zOf(it));
      return '<div class="re__box re__box--' + bandOf(Por.zOf(it)) + (i === sel ? " on" : "") + '" data-box="' + i + '" style="' +
        "left:" + pc(r.x) + ";top:" + pc(r.y) + ";width:" + pc(r.w) + ";height:" + pc(r.h) + '">' +
        "<em>" + esc(it.p) + "</em><i data-grip=\"" + i + "\"></i></div>";
    }).join("") +
      (() => {                                        // and one for the person
        const s = shotRect();
        return '<div class="re__box re__box--fig" data-fig="1" style="left:' + pc(s.dx) + ";top:" + pc(s.dy) +
          ";width:" + pc(s.dw) + ";height:" + pc(s.dh) + '"><em>them</em><i data-figgrip="1"></i></div>';
      })();
  }

  function startDrag(e, mode, extra) {
    const stage = getWin(KEY).client.querySelector(".re__stage");
    const r = stage.getBoundingClientRect();
    drag = Object.assign({ mode, r, ox: e.clientX / r.width, oy: e.clientY / r.height }, extra);
    e.preventDefault();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    render();
  }

  function onDown(e) {
    const figGrip = e.target.closest("[data-figgrip]"), figBox = e.target.closest("[data-fig]");
    if (figGrip || figBox) { startDrag(e, figGrip ? "figsize" : "fig", { it: shotRect() }); return; }
    const grip = e.target.closest("[data-grip]");
    const box = e.target.closest("[data-box]");
    if (!grip && !box) return;
    const i = Number((grip || box).dataset.grip || box.dataset.box);
    sel = i;
    startDrag(e, grip ? "size" : "move", { i, it: Object.assign({}, room()[i]) });
  }

  function onMove(e) {
    if (!drag) return;
    const dx0 = (e.clientX / drag.r.width) - drag.ox;
    const dy0 = (e.clientY / drag.r.height) - drag.oy;
    if (drag.mode === "fig" || drag.mode === "figsize") {
      const f = person().frame || (person().frame = {});
      if (drag.mode === "fig") {
        f.dx = clamp(drag.it.dx + dx0, -0.3, 1);
        f.dy = clamp(drag.it.dy + dy0, -0.4, 0.9);
      } else {
        f.dw = clamp(drag.it.dw + dx0, 0.12, 1.4);
        f.dh = clamp(drag.it.dh + dy0, 0.2, 1.8);
      }
      boxes();
      return;
    }
    const it = room()[drag.i];
    if (!it) return;
    const dx = dx0, dy = dy0;
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
      // A thing arrives at the distance its kind usually sits, and big things
      // at the front arrive at the edge, where they frame the shot.
      const kind = b.dataset.p || "poster";
      const z = Por.zOf({ p: kind });
      items.push(z > 0.6 ? { p: kind, x: 0.02, y: 0.40, w: 0.22, h: 0.6, z }
                         : { p: kind, x: 0.40, y: 0.30, w: 0.20, h: 0.24, z });
      sel = items.length - 1;
    }
    if (a === "band" && items[sel]) {
      const band = BANDS.find(([k]) => k === b.dataset.b);
      if (band) items[sel].z = band[2];
    }
    if ((a === "further" || a === "nearer") && items[sel]) {
      items[sel].z = clamp(Por.zOf(items[sel]) + (a === "nearer" ? 0.08 : -0.08), 0, 1);
    }
    // The shot is the composition, so it starts clean: any nudges were made
    // for the other one. Reset their position undoes a nudge on its own.
    if (a === "shot") { person().framing = b.dataset.k; person().frame = {}; }
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
      theme: themeFor(who), room: room(), frame: person().frame, framing: framing(),
      mood: "neutral", blink: phase === 5, mouthOpen: false,
      bob: phase < 3, glance: false, glitch: 0,
    });
  }

  /* ── export ──────────────────────────────────────────── */
  function block() {
    const f = person().frame || {};
    const lines = ['      framing: "' + framing() + '",'];
    if (Object.keys(f).length) {
      lines.push("      frame: { " + Object.keys(f).map((k) => k + ": " + r3(f[k])).join(", ") + " },");
    }
    lines.push("      room: [");
    for (const it of room()) {
      lines.push("        { p: \"" + it.p + "\", x: " + r3(it.x) + ", y: " + r3(it.y) +
                 ", w: " + r3(it.w) + ", h: " + r3(it.h) +
                 (it.z === undefined ? "" : ", z: " + r3(it.z)) +
                 (it.c ? ", c: \"" + it.c + "\"" : "") + " },");
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
