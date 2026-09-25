"use strict";
/* ── the computer the game runs on ──────────────────────────
 * Everything the game draws is inside #pc, and the game measures #pc, never
 * the window: container units in the CSS, PC.size() in scripts. On its own
 * #pc is the whole window. With the room (src/room) it is also the glass of a
 * CRT on your desk, laid out at 1024×768 while you are across the room, and
 * the whole window again once you sit down in front of it.
 *
 * The room is an ES module and starts after everything here. Until it has
 * put the game on its screen, the game stays hidden (html.room-boot), so it
 * never flashes up full-window first. ?room=0 plays without the room.
 */
const PC = (() => {
  const el = document.getElementById("pc");
  const html = document.documentElement;
  const FLAG = "pixel-crossing:room";

  let flag = null;
  try { flag = JSON.parse(sessionStorage.getItem(FLAG) || "null"); } catch { flag = null; }
  const without = new URLSearchParams(location.search).get("room") === "0";
  const reveal = () => html.classList.remove("room-boot");
  // Logging off reloads the page to start clean (see session.js), but you are
  // still sitting at the computer: show the game at once, the room catches up.
  if (without || (flag && flag.at === "pc")) reveal();
  // If the room never starts at all (it could not load), never hide the game.
  setTimeout(() => { if (!window.__room) reveal(); }, 2500);

  function discipline(id) {
    const i = CATS.findIndex((c) => c.id === id);
    return i < 0 ? null : { index: i, label: CATS[i].label, concept: CATS[i].concept };
  }

  return {
    el, flag, without, reveal, discipline,
    size: () => ({ w: el.clientWidth || innerWidth, h: el.clientHeight || innerHeight }),
    hasRoom: () => typeof Room !== "undefined" && Room.live(),
    // On the world side, with nothing open or moving: Esc there stands you up.
    worldIdle: () => !atScreen && !busy && !pickerEl.classList.contains("open"),
    // A poster on the wall picks its discipline, without crossing over.
    pick(id) {
      const d = discipline(id);
      if (!d || atScreen || busy) return false;
      current = d.index;
      pickerVal.textContent = CATS[current].label;
      opts.forEach((o, k) => o.setAttribute("aria-selected", String(k === current)));
      setPreview(current);
      return true;
    },
    // Where the game is: the world side, or the desk.
    side: () => (atScreen ? "desk" : "world"),
    // Give the game the keyboard, where it would have it after crossing.
    focus() {
      const target = atScreen ? desk.focusTarget() : pickerBtn;
      if (target) target.focus({ preventScroll: true });
    },
  };
})();
