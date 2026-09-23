"use strict";
/* ── session: which save slot this desktop belongs to ────────
 * Two ways to play, sharing nothing at runtime:
 *   studio  real briefs by mail, real work in your own tools, real files
 *   hustle  gigs and research puzzles, made in the in-app design suite
 *
 * The first time you cross over, a logon dialog asks which. Everything that
 * reads state boots only after that. Logging off reloads the renderer rather
 * than trying to unwind every module's in-memory state — that is the guarantee
 * that nothing from one slot leaks into the other.
 */

const Session = (() => {
  const LAST_KEY = "pixel-crossing:last-slot";
  const LABELS = {
    studio: { name: "STUDIO", line: "Real clients write to you. You make the work in your own tools and send real files." },
    hustle: { name: "HUSTLE", line: "Find gigs, research them as puzzles, and make the work in the in-app suite. Build a reputation." },
  };
  let started = null;          // the slot, once logged on
  let dialog = null;

  function remembered() {
    try { return localStorage.getItem(LAST_KEY) || "studio"; } catch { return "studio"; }
  }

  // ?slot=studio|hustle logs straight on — handy for iterating in a browser tab.
  function fromQuery() {
    try {
      const s = new URLSearchParams(location.search).get("slot");
      return s === "studio" || s === "hustle" ? s : null;
    } catch { return null; }
  }

  function arrive() {
    if (started) { if (started === "studio" && typeof Mail !== "undefined") Mail.restore(); return; }
    const auto = fromQuery();
    if (auto) { logon(auto); return; }
    showLogon();
  }

  function showLogon() {
    if (dialog) return;
    const last = remembered();
    dialog = document.createElement("div");
    dialog.className = "logon";
    dialog.innerHTML =
      '<div class="w98 on logon__win" role="dialog" aria-modal="true" aria-labelledby="logonTitle">' +
        '<div class="tbar"><span class="tbar__i">' + iconSVG("logoff", 16) + '</span><span class="tbar__t" id="logonTitle">Welcome to Pixel Crossing</span></div>' +
        '<div class="client logon__c">' +
          '<div class="logon__top"><i>' + iconSVG("logoff", 34) + "</i><p>Choose who is logging on to this desktop. Each keeps its own mail, files and progress.</p></div>" +
          '<div class="logon__opts">' +
            ["studio", "hustle"].map((s) =>
              '<button class="logon__opt' + (s === last ? " last" : "") + '" data-slot="' + s + '">' +
                "<b>" + LABELS[s].name + "</b><span>" + LABELS[s].line + "</span></button>").join("") +
          "</div>" +
          '<div class="logon__foot"><button class="w98btn" data-back>Return to the World</button></div>' +
        "</div>" +
      "</div>";
    deskEl.appendChild(dialog);
    dialog.addEventListener("click", (e) => {
      const b = e.target.closest("[data-slot],[data-back]");
      if (!b) return;
      if (b.dataset.slot) logon(b.dataset.slot);
      else cross(-1);
    });
    const btn = dialog.querySelector(".logon__opt.last");
    if (btn) requestAnimationFrame(() => btn.focus({ preventScroll: true }));
  }

  async function logon(slot) {
    if (started) return;
    started = slot;
    try { localStorage.setItem(LAST_KEY, slot); } catch { /* private window */ }
    if (dialog) { dialog.remove(); dialog = null; }

    try { await Bridge.useSlot(slot); }
    catch (e) { console.error("[session] could not use slot:", e.message); }

    document.body.dataset.slot = slot;
    const banner = document.querySelector(".sbanner span");
    if (banner) banner.textContent = LABELS[slot].name;
    const hint = document.querySelector(".deskhint");
    if (hint) hint.textContent = slot === "studio" ? "START ▸ PICK A DISCIPLINE" : "START ▸ GIGSLIST";

    // Discipline items issue real briefs, which is Studio's loop only.
    slist.querySelectorAll("[data-cat]").forEach((el) => { el.hidden = slot !== "studio"; });
    if (slot === "hustle") {
      addStartItem("gigslist", "Gigslist", () => Hustle.board());
      addStartItem("pager", "Pager", () => Hustle.openPager());
      addStartItem("roomedit", "Room Editor", () => RoomEdit.open());
      addStartItem("camera", "Camera", () => Camera.open());
    }
    addStartItem("suite", "Design Suite", () => Suite.launcher());
    addStartItem("logoff", "Log Off " + LABELS[slot].name + "...", logoff);

    if (slot === "studio") {
      await Mail.boot().catch((e) => console.error("[mail] boot failed:", e));
      addShortcut("mail", "Inbox", "mail", () => Mail.open());
      Mail.render();
      Bridge.onProjectsChanged(() => Mail.render());
      Feed.boot().catch((e) => console.error("[feed] boot failed:", e));
    }
    await Suite.boot().catch((e) => console.error("[suite] boot failed:", e));
    // The reference board is a drawing tool, so both slots get one.
    if (typeof RefBoard !== "undefined") await RefBoard.boot().catch((e) => console.error("[refboard] boot failed:", e));
    if (slot === "hustle") {
      // Paper Moon Relay's official art answers the image search in Hustle.
      if (typeof Characters !== "undefined") Characters.register();
      await Hustle.boot().catch((e) => console.error("[hustle] boot failed:", e));
      addShortcut("gigslist", "Gigslist", "gigslist", () => Hustle.board());
      addShortcut("pager", "Pager", "pager", () => Hustle.openPager());
      addShortcut("roomedit", "Room Editor", "roomedit", () => RoomEdit.open());
      addShortcut("camera", "Camera", "camera", () => Camera.open());
    }
    addShortcut("suite", "Design Suite", "suite", () => Suite.launcher());
    if (slot === "studio") Mail.restore();

    const focus = desk.focusTarget();
    if (focus) focus.focus({ preventScroll: true });
  }

  function addStartItem(icon, label, onClick) {
    const b = document.createElement("button");
    b.className = "si"; b.type = "button"; b.setAttribute("role", "menuitem");
    b.innerHTML = "<i>" + iconSVG(icon, 20) + "</i><span></span>";
    b.querySelector("span").textContent = label;
    b.addEventListener("click", () => { toggleStart(false); onClick(); });
    slist.insertBefore(b, backItem);
  }

  async function logoff() {
    await Bridge.flush();
    // Drop any ?slot so the logon dialog shows again.
    if (location.search) location.search = "";
    else location.reload();
  }

  return { arrive, logon, logoff, slot: () => started, dialogOpen: () => !!dialog };
})();
