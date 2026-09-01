/* ── picker ─────────────────────────────────────────── */
CATS.forEach((c, i) => {
  const li = document.createElement("li");
  li.className = "opt";
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", String(i === current));
  li.dataset.i = String(i);
  li.innerHTML =
    '<span class="opt__n">' + String(i + 1).padStart(2, "0") + '</span>' +
    '<span class="opt__l"></span>' +
    '<span class="opt__c"></span>';
  li.querySelector(".opt__l").textContent = c.label;
  li.querySelector(".opt__c").textContent = c.concept;
  li.addEventListener("mouseenter", () => setPreview(i));
  li.addEventListener("click", () => commit(i));
  pickerList.appendChild(li);
});
const opts = [...pickerList.children];

function setPreview(i){
  preview = i;
  scenes.forEach((s, k) => s.classList.toggle("on", k === i));
  wTitle.textContent = CATS[i].label;
  wConcept.textContent = CATS[i].concept;
  opts.forEach((o, k) => o.classList.toggle("hot", k === i));
  sideWorld.dataset.chrome = CATS[i].chrome;
}
function openPicker(open){
  pickerEl.classList.toggle("open", open);
  pickerBtn.setAttribute("aria-expanded", String(open));
  if (open) { setPreview(current); pickerList.focus(); }
  else { setPreview(current); }
}
pickerBtn.addEventListener("click", () => openPicker(!pickerEl.classList.contains("open")));
pickerList.addEventListener("mouseleave", () => setPreview(current));
document.addEventListener("click", (e) => {
  if (pickerEl.classList.contains("open") && !pickerEl.contains(e.target)) openPicker(false);
});
pickerList.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp"){
    e.preventDefault();
    const d = e.key === "ArrowDown" ? 1 : -1;
    setPreview((preview + d + CATS.length) % CATS.length);
  } else if (e.key === "Enter" || e.key === " "){
    e.preventDefault(); commit(preview);
  } else if (e.key === "Escape"){
    openPicker(false); pickerBtn.focus();
  }
});

function commit(i){
  if (busy) return;
  current = i;
  pickerVal.textContent = CATS[i].label;
  opts.forEach((o, k) => o.setAttribute("aria-selected", String(k === i)));
  setPreview(i);
  openPicker(false);
  briefIdx = 0;
  cross(1);
}
