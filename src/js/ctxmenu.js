"use strict";
/* ── context menus ────────────────────────────────────────
 * One right-click menu for the whole desk, in the Win98 style, or in the
 * Design Suite's own look inside it.
 *
 *   CtxMenu.open(at, items, { look })
 *     at     the pointer event (or { clientX, clientY })
 *     items  [{ label, act, key?, icon?, checked?, disabled? } | "-"]
 *     look   "graphite" for the suite's dark look; Win98 otherwise
 *
 * Arrow keys move, Enter picks, Escape or a click anywhere else closes it. It
 * lives inside the game's own screen (#pc), so it lands in the right place
 * when the desk is shown on the monitor in the room.
 */

const CtxMenu = (() => {
  let el = null, prevFocus = null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const sound = (n) => { if (typeof uiSound === "function") uiSound(n); };

  function close() {
    if (!el) return;
    el.remove();
    el = null;
    document.removeEventListener("pointerdown", outside, true);
    window.removeEventListener("blur", close);
    window.removeEventListener("resize", close);
    if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === "function") prevFocus.focus({ preventScroll: true });
    prevFocus = null;
  }
  function outside(e) { if (el && !el.contains(e.target)) close(); }

  function move(dir) {
    const all = [...el.querySelectorAll(".ctx__i:not(:disabled)")];
    if (!all.length) return;
    const i = all.indexOf(document.activeElement);
    all[(i + dir + all.length) % all.length].focus({ preventScroll: true });
  }

  function open(at, items, opts = {}) {
    close();
    const list = (items || []).filter((it, i, a) => it !== "-" || (i > 0 && i < a.length - 1 && a[i - 1] !== "-"));
    if (!list.some((it) => it !== "-")) return;
    prevFocus = document.activeElement;
    const host = document.getElementById("pc") || document.body;
    el = document.createElement("div");
    // The menu lives in #pc, outside the screen it belongs to: it dresses like it.
    const dark = document.querySelector(".side--screen.theme-dark");
    el.className = "ctx" + (dark ? " theme-dark" : "") + (opts.look ? " ctx--" + opts.look : "");
    el.setAttribute("role", "menu");
    el.innerHTML = list.map((it, i) => (it === "-" ? '<div class="ctx__sep" role="separator"></div>'
      : '<button type="button" class="ctx__i" role="menuitem" data-i="' + i + '"' + (it.disabled ? " disabled" : "") + ">" +
        '<i class="ctx__ic" aria-hidden="true">' + (it.checked ? "✓" : it.icon && typeof iconSVG === "function" ? iconSVG(it.icon, 16) : "") + "</i>" +
        "<span>" + esc(it.label) + "</span>" + (it.key ? "<em>" + esc(typeof Tips !== "undefined" ? Tips.keys(it.key) : it.key) + "</em>" : "") + "</button>")).join("");
    host.appendChild(el);
    // In the host's own pixels, which are not the screen's when the desk is
    // scaled onto the monitor in the room.
    const r = host.getBoundingClientRect(), k = r.width / (host.offsetWidth || r.width) || 1;
    const x = ((at.clientX ?? 0) - r.left) / k, y = ((at.clientY ?? 0) - r.top) / k;
    const W = host.clientWidth || innerWidth, Hh = host.clientHeight || innerHeight;
    el.style.left = Math.max(2, Math.min(x, W - el.offsetWidth - 2)) + "px";
    el.style.top = Math.max(2, y + el.offsetHeight > Hh - 2 ? y - el.offsetHeight : y) + "px";
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".ctx__i");
      if (!b || b.disabled) return;
      const it = list[Number(b.dataset.i)];
      close();
      sound("pick");
      it.act();
    });
    el.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    const first = el.querySelector(".ctx__i:not(:disabled)");
    if (first) first.focus({ preventScroll: true });
    sound("menu");
  }

  return { open, close, isOpen: () => !!el };
})();

if (typeof module !== "undefined") module.exports = CtxMenu;
