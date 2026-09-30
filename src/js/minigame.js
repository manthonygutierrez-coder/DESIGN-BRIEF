"use strict";
/* ── mini-games: the frame they play in ───────────────────
 * The research games (Dennis's card trick first) each play in a window of
 * their own: a low-resolution canvas scaled up by whole numbers, so its
 * pixels stay square on any screen, and a strip beneath for who's talking and
 * what you can do. The frame knows nothing about any one game.
 *
 *   MiniGame.open({ key, title, iconId, w, h, scale, className, onClose })
 *     → game: { w (the window), cv, ctx, W, H, say(text), choices(list),
 *               tween(ms, fn), wait(ms), alive(), close() }
 *
 *   choices([{ label, act, kind }])   buttons under the picture; kind "go"
 *                                      is the one Enter presses
 *   tween(ms, fn)                      fn(0…1) every frame, then resolves
 *   wait(ms)                           a beat
 *
 * With less motion asked for, tweens jump to their end and beats are short.
 * Both stop at once when the window closes, so a game can simply return.
 */

const MiniGame = (() => {
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  function open(o) {
    const had = getWin(o.key);
    if (had && had.game) { revealWin(had); return had.game; }
    const W = o.w, Ht = o.h, k = o.scale || 3;
    let alive = true;
    const w = createWindow({
      key: o.key, title: o.title, iconId: o.iconId || "web",
      w: W * k + 26, h: Ht * k + 236, minW: W * 2 + 26, minH: Ht * 2 + 230,
      className: "w98--game" + (o.className ? " " + o.className : ""),
      onClose: () => { alive = false; if (o.onClose) o.onClose(); },
    });
    w.client.classList.add("client--flush");
    w.client.innerHTML =
      '<div class="mg"><div class="mg__screen"><canvas class="mg__cv" width="' + W + '" height="' + Ht + '"></canvas></div>' +
      '<div class="mg__talk"><p class="mg__say" aria-live="polite"></p><div class="mg__choices" role="group"></div></div></div>';
    const cv = w.client.querySelector(".mg__cv"), screen = w.client.querySelector(".mg__screen");
    // As big as the window allows, in whole device pixels to every game
    // pixel, whatever the screen's scaling: at 150% a game pixel is 4 device
    // pixels, never a blurry 4.5. Maximise the window for a bigger game.
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const room = Math.min((screen.clientWidth - 16) * dpr / W, (screen.clientHeight - 16) * dpr / Ht);
      const d = Math.max(1, Math.min(Math.floor(room + 1e-6), Math.floor(6 * dpr)));
      cv.style.width = (W * d) / dpr + "px";
      cv.style.height = (Ht * d) / dpr + "px";
    };
    fit();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(fit).observe(screen);
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const say = w.client.querySelector(".mg__say"), box = w.client.querySelector(".mg__choices");
    let acts = [];
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (!b || b.disabled) return;
      const it = acts[Number(b.dataset.i)];
      if (it && it.act) it.act();
    });
    w.el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target.closest("button,input,select,textarea")) return;
      const go = box.querySelector('[data-kind="go"]');
      if (go) { e.preventDefault(); go.click(); }
    });

    const game = {
      w, cv, ctx, W, H: Ht,
      reduced: reduced(),
      alive: () => alive && w.el.isConnected,
      say(text) { say.textContent = text; },
      choices(list) {
        acts = list || [];
        box.innerHTML = acts.map((c, i) => '<button type="button" class="w98btn mg__c' + (c.kind ? " mg__c--" + c.kind : "") + '" data-i="' + i + '"' +
          (c.kind ? ' data-kind="' + c.kind + '"' : "") + ">" + esc(c.label) + "</button>").join("");
        const first = box.querySelector('[data-kind="go"]') || box.querySelector("button");
        if (first && w.el.contains(document.activeElement)) first.focus({ preventScroll: true });
      },
      tween(ms, fn) {
        return new Promise((done) => {
          if (!game.alive()) return done();
          if (game.reduced || ms <= 0) { fn(1); return done(); }
          const t0 = performance.now();
          const step = (now) => {
            if (!game.alive()) return done();
            const t = Math.min(1, (now - t0) / ms);
            fn(t);
            if (t < 1) requestAnimationFrame(step); else done();
          };
          requestAnimationFrame(step);
        });
      },
      wait(ms) { return new Promise((done) => (game.alive() ? setTimeout(done, game.reduced ? Math.min(ms, 120) : ms) : done())); },
      close() { if (w.el.isConnected) closeWin(w); },
    };
    w.game = game;
    return game;
  }

  return { open, reduced };
})();
