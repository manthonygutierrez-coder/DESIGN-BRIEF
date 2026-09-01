/* ── brief document ─────────────────────────────────── */
function clearWinTimers(w){ w.timers.forEach(clearTimeout); w.timers = []; }

function renderInto(w){
  const cat = CATS[w.ci], b = cat.briefs[w.briefIdx];
  clearWinTimers(w);
  w.setTitle(b.project + ".BRF");
  w.el.querySelector(".wstat__n").textContent = "Brief " + (w.briefIdx + 1) + " of " + cat.briefs.length;
  w.el.querySelector(".wstat__t").textContent = pixelLabel(cat.label);

  w.client.innerHTML =
    '<div class="bl"><div class="bk98">PROJECT</div><div class="bt98">' + esc(b.project) + '</div></div>' +
    '<div class="bl"><div class="bk98">CLIENT</div><div class="bv98">' + esc(b.client) + '</div></div>' +
    '<div class="bl"><div class="bk98">THE ASK</div><p class="bv98 bv98--ask" data-type>' + esc(b.ask) + '</p></div>' +
    '<div class="bcols">' +
      '<div class="bl"><div class="bk98">DELIVERABLES</div><ul class="bul">' +
        b.deliver.map((d) => "<li>" + esc(d) + "</li>").join("") + '</ul></div>' +
      '<div class="bl"><div class="bk98">CONSTRAINTS</div><ul class="bul bul--x">' +
        b.limits.map((d) => "<li>" + esc(d) + "</li>").join("") + '</ul></div>' +
    '</div>' +
    '<div class="bl"><div class="bk98">TONE</div><div class="bv98">' + esc(b.tone) + '</div></div>' +
    '<div class="bl"><div class="bk98">PALETTE — SAMPLED FROM THE WORLD</div><div class="sws">' +
      cat.palette.map((c) => '<span class="sw" style="background:' + c + '"></span>').join("") + '</div></div>';
  w.client.scrollTop = 0;

  if (reduced) return;

  const blocks = [...w.client.querySelectorAll(".bl")];
  const typeEl = w.client.querySelector("[data-type]");
  const full = typeEl.textContent;
  blocks.forEach((el) => el.classList.add("hid"));
  typeEl.textContent = "";
  blocks.forEach((el, k) => {
    w.timers.push(setTimeout(() => {
      el.classList.remove("hid");
      if (el.contains(typeEl)) typeOut(w, typeEl, full);
    }, 90 * k));
  });
}

function typeOut(w, el, text){
  el.classList.add("typing");
  let i = 0;
  const step = () => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i < text.length) w.timers.push(setTimeout(step, 11));
    else el.classList.remove("typing");
  };
  step();
}

function finishReveal(w){
  const askText = CATS[w.ci].briefs[w.briefIdx].ask;
  const typeEl = w.client.querySelector("[data-type]");
  const hidden = w.client.querySelectorAll(".bl.hid").length;
  // The ask can be mid-type, or emptied and not yet started — both need restoring.
  const partial = typeEl && typeEl.textContent !== askText;
  if (!hidden && !partial) return false;
  clearWinTimers(w);
  w.client.querySelectorAll(".bl").forEach((el) => el.classList.remove("hid"));
  if (typeEl){ typeEl.textContent = askText; typeEl.classList.remove("typing"); }
  return true;
}
