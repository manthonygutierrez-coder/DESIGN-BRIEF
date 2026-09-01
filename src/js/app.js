/* ── keys ───────────────────────────────────────────── */
addEventListener("keydown", (e) => {
  if (busy || !atScreen) return;
  if (e.key === "Escape"){
    if (smenu.classList.contains("on")) toggleStart(false); else cross(-1);
    return;
  }
  if (e.key === "ArrowLeft" && !e.target.closest(".w98")) cross(-1);
  if (e.key.toLowerCase() === "n" && activeWin && activeWin.ci !== undefined){
    if (finishReveal(activeWin)) return;
    activeWin.briefIdx = (activeWin.briefIdx + 1) % CATS[activeWin.ci].briefs.length;
    renderInto(activeWin);
  }
});

/* ── init ───────────────────────────────────────────── */
setPreview(0);
sideScreen.inert = true;

// The desktop always has an inbox; the browser only appears once a client
// has sent you a link.
Mail.boot().then(() => {
  addShortcut("mail", "Inbox", "mail", () => Mail.open());
  Mail.render();
}).catch((e) => console.error("[mail] boot failed:", e));

// Files landing in a project folder are worth knowing about.
Bridge.onProjectsChanged(() => { if (typeof Mail !== "undefined") Mail.render(); });
