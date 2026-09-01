/* ── start menu, taskbar, desktop surface ───────────── */
$("startIco").innerHTML = iconSVG("graphic", 16);

CATS.forEach((cat, i) => {
  const b = document.createElement("button");
  b.className = "si"; b.type = "button"; b.setAttribute("role", "menuitem");
  b.innerHTML = '<i>' + iconSVG(cat.id, 20) + '</i><span></span>';
  b.querySelector("span").textContent = pixelLabel(cat.label);
  b.addEventListener("click", () => { toggleStart(false); requestBrief(i); });
  slist.appendChild(b);
});
slist.insertAdjacentHTML("beforeend", '<div class="ssep"></div>');
const backItem = document.createElement("button");
backItem.className = "si"; backItem.type = "button"; backItem.setAttribute("role", "menuitem");
backItem.innerHTML = '<i>' + iconSVG("back", 20) + '</i><span>Return to the World...</span>';
backItem.addEventListener("click", () => { toggleStart(false); cross(-1); });
slist.appendChild(backItem);

function toggleStart(open){
  const next = open === undefined ? !smenu.classList.contains("on") : open;
  smenu.classList.toggle("on", next);
  startBtn.classList.toggle("on", next);
  startBtn.setAttribute("aria-expanded", String(next));
  if (next) slist.querySelector(".si").focus();
}
startBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });
sideScreen.addEventListener("pointerdown", (e) => {
  if (!smenu.contains(e.target) && !startBtn.contains(e.target)) toggleStart(false);
});
deskEl.addEventListener("pointerdown", (e) => { if (e.target === deskEl || e.target === iconsEl) clearSelection(); });

const clockEl = $("clock");
function tickClock(){
  const d = new Date();
  clockEl.textContent = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
tickClock();
setInterval(tickClock, 15000);

const desk = {
  // Crossing over no longer opens a brief; it just lands you on the desktop.
  // Work arrives by mail, from the Start menu.
  arrive(){ if (typeof Mail !== "undefined") Mail.restore(); },
  focusTarget(){ return activeWin ? (activeWin.el.querySelector(".w98btn") || activeWin.el) : startBtn; }
};

/* ── parallax on the screen side ────────────────────── */
const roomIn = $("roomIn");
if (!reduced){
  sideScreen.addEventListener("pointermove", (e) => {
    const r = sideScreen.getBoundingClientRect();
    roomIn.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(3));
    roomIn.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(3));
  });
}
