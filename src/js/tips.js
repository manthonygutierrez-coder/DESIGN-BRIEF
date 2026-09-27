"use strict";
/* ── tooltips ─────────────────────────────────────────────
 * The browser's own tooltip waits about a second and cannot be styled. This
 * one comes up after a short, deliberate pause; while one is showing, the next
 * control's comes up at once, the way Win98 toolbars hand over; and it goes the
 * moment you click, scroll or type.
 *
 * Nothing has to be rewritten for it. Any element's `title` is taken over the
 * first time the pointer or keyboard focus reaches it (moved to data-tip, so
 * the native tooltip never shows as well). A trailing "(X)" in the text becomes
 * a shortcut badge; data-tip-key sets one outright, and data-tip-sub adds a
 * second, quieter line.
 *
 * The tip lives inside the computer (#pc), so on the CRT in the room it is
 * drawn on the glass with everything else.
 */
const Tips = (() => {
  const DELAY = 350;       // ms before the first one: long enough not to flicker past
  const HANDOFF = 500;     // ms after one goes in which the next comes up at once
  const CURSOR = 18;       // the arrow's height: a pointer's tip sits below it

  // Pure rules, tested in node.
  const delayFor = (now, hiddenAt) => (now - hiddenAt <= HANDOFF ? 0 : DELAY);

  // "Rectangle (R)" → { text: "Rectangle", key: "R" }.
  function split(text) {
    const s = String(text == null ? "" : text).trim();
    const m = /^(.*\S)\s*\(([^()]{1,10})\)$/.exec(s);
    return m ? { text: m[1], key: m[2] } : { text: s, key: "" };
  }

  // Below the anchor if it fits, above it if not, and never off the edges.
  // Rects are { x, y, w, h } in the same space as bounds.
  function place(anchor, tip, bounds, gap = 4) {
    let y = anchor.y + anchor.h + gap;
    if (y + tip.h > bounds.y + bounds.h - 2) y = anchor.y - tip.h - gap;
    const x = Math.max(bounds.x + 2, Math.min(anchor.x, bounds.x + bounds.w - tip.w - 2));
    return { x: Math.round(x), y: Math.round(Math.max(bounds.y + 2, y)) };
  }

  const api = { delayFor, split, place, DELAY, HANDOFF };
  if (typeof document === "undefined") return api;

  /* ── the one tip on screen ─────────────────────────────── */
  let el = null;            // the tip element
  let on = null;            // the element it is about
  let pending = null;       // the element whose tip is on its way
  let timer = 0, shownAt = 0, hiddenAt = -Infinity, quietUntilLeave = null;
  let px = 0, py = 0;       // the pointer, in client space

  const host = () => document.getElementById("pc") || document.body;
  const target = (node) => (node && node.closest ? node.closest("[data-tip],[title]") : null);

  // Take the element's title over, keeping what a screen reader heard.
  function adopt(t) {
    const title = t.getAttribute("title");
    if (title === null) return;
    t.removeAttribute("title");
    if (title.trim()) {
      t.dataset.tip = title;
      const named = t.getAttribute("aria-label") || (t.textContent || "").trim();
      if (!named) t.setAttribute("aria-label", split(title).text);
      else if (!t.getAttribute("aria-description") && named !== title) t.setAttribute("aria-description", split(title).text);
    }
  }

  function tipEl() {
    const h = host();
    if (!el || el.parentNode !== h) {
      el = el || document.createElement("div");
      el.className = "tip";
      el.setAttribute("role", "tooltip");
      el.hidden = true;
      h.appendChild(el);
    }
    return el;
  }

  // Client coordinates to the computer's own, which may be scaled on the CRT.
  function local(cx, cy) {
    const h = host(), r = h.getBoundingClientRect();
    const k = h.offsetWidth ? r.width / h.offsetWidth : 1;
    return { x: (cx - r.left) / (k || 1), y: (cy - r.top) / (k || 1), k: k || 1, w: h.offsetWidth || r.width, h: h.offsetHeight || r.height };
  }

  function show(t, byKey) {
    const raw = t.dataset.tip;
    if (!raw || !t.isConnected) return;
    const { text, key } = split(raw);
    const e = tipEl();
    e.innerHTML = "";
    const line = document.createElement("span");
    line.className = "tip__t";
    line.textContent = text;
    e.appendChild(line);
    const k = t.dataset.tipKey || key;
    if (k) { const b = document.createElement("kbd"); b.className = "tip__k"; b.textContent = k; e.appendChild(b); }
    if (t.dataset.tipSub) { const s = document.createElement("span"); s.className = "tip__s"; s.textContent = t.dataset.tipSub; e.appendChild(s); }
    e.hidden = false;
    const L = local(0, 0);
    let anchor;
    if (byKey) {
      const r = t.getBoundingClientRect(), a = local(r.left, r.top);
      anchor = { x: a.x, y: a.y, w: r.width / L.k, h: r.height / L.k };
    } else {
      const p = local(px, py);
      anchor = { x: p.x, y: p.y, w: 1, h: CURSOR };
    }
    const at = place(anchor, { w: e.offsetWidth, h: e.offsetHeight }, { x: 0, y: 0, w: L.w, h: L.h });
    e.style.left = at.x + "px";
    e.style.top = at.y + "px";
    on = t;
    shownAt = performance.now();
  }

  function hide() {
    clearTimeout(timer); timer = 0;
    if (el && !el.hidden) { el.hidden = true; hiddenAt = performance.now(); }
    on = null; pending = null;
  }

  function arm(t, byKey) {
    adopt(t);
    if (!t.dataset.tip) return;
    hide();                                         // a tip showing hands over: hiddenAt is now
    pending = t;
    timer = setTimeout(() => { timer = 0; pending = null; show(t, byKey); }, delayFor(performance.now(), hiddenAt));
  }

  document.addEventListener("pointerover", (e) => {
    px = e.clientX; py = e.clientY;
    const t = target(e.target);
    if (!t || t === on || t === pending || t === quietUntilLeave) return;
    if (!host().contains(t)) return;
    arm(t, false);
  }, true);
  document.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; }, { capture: true, passive: true });
  document.addEventListener("pointerout", (e) => {
    const t = target(e.target);
    if (!t) return;
    if (e.relatedTarget && t.contains(e.relatedTarget)) return;   // still inside it
    if (t === quietUntilLeave) quietUntilLeave = null;
    if (t === on || t === pending) hide();
  }, true);
  // A click, a key or a scroll puts it away, and it stays away until you move on.
  const quiet = () => { quietUntilLeave = on || pending || quietUntilLeave; hide(); };
  document.addEventListener("pointerdown", quiet, true);
  document.addEventListener("wheel", quiet, { capture: true, passive: true });
  document.addEventListener("scroll", hide, true);
  document.addEventListener("keydown", (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) quiet(); }, true);
  window.addEventListener("blur", hide);
  // Keyboard focus shows it too, under the control rather than the pointer.
  document.addEventListener("focusin", (e) => {
    const t = target(e.target);
    if (!t || !host().contains(t)) return;
    let visible = true;
    try { visible = t.matches(":focus-visible"); } catch { /* old engine */ }
    if (visible) arm(t, true);
  });
  document.addEventListener("focusout", (e) => { const t = target(e.target); if (t && (t === on || t === pending)) hide(); });

  return Object.assign(api, { hide, current: () => on });
})();

if (typeof module !== "undefined") module.exports = Tips;
