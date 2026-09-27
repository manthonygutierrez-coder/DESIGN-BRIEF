"use strict";
/* ── the appearance scheme ────────────────────────────────
 * Light is Windows as it shipped; dark is the same windows in dark plastic
 * (styles/dark.css). The moon in the tray switches it, and this machine
 * remembers the choice. Web pages keep their own design either way.
 */

const Scheme = (() => {
  const KEY = "pixel-crossing:scheme";
  let dark = false, btn = null;
  try { dark = localStorage.getItem(KEY) === "dark"; } catch { /* no storage: light */ }

  function apply() {
    const el = document.getElementById("sideScreen");
    if (el) el.classList.toggle("theme-dark", dark);
    if (btn) {
      btn.innerHTML = typeof iconSVG === "function" ? iconSVG(dark ? "sun" : "moon", 16) : "";
      btn.title = dark ? "Light windows" : "Dark windows";
      btn.setAttribute("aria-label", btn.title);
      btn.setAttribute("aria-pressed", String(dark));
    }
  }
  function set(on) {
    dark = !!on;
    try { localStorage.setItem(KEY, dark ? "dark" : "light"); } catch { /* not remembered */ }
    apply();
    if (typeof uiSound === "function") uiSound("pick");
  }
  function mount() {
    const tray = document.querySelector(".tray");
    if (tray && !btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tray__scheme";
      btn.addEventListener("click", () => set(!dark));
      const clock = document.getElementById("clock");
      tray.insertBefore(btn, clock && clock.parentElement === tray ? clock : null);
    }
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  return { set, toggle: () => set(!dark), dark: () => dark };
})();
