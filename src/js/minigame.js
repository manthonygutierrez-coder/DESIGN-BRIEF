"use strict";
/* ── mini-games: the frame they play in ───────────────────
 * The research games each play in a window of their own, framed lightly (the
 * ghost frame: a hairline until you reach for it) so the game is what you
 * see. Inside, one look for all of them, inked in each game's own colours: a
 * strip along the top with the game's name, how it is going, and whether the
 * research clock is stopped; the picture, a low-resolution canvas scaled up
 * by whole numbers so its pixels stay square on any screen; and beneath it,
 * who is talking and what you can do, as chips rather than Windows buttons.
 * The frame knows nothing about any one game.
 *
 *   MiniGame.open({ key, title, iconId, w, h, scale, className, onClose, ink, enterGo })
 *     → game: { w (the window), cv, ctx, W, H, reduced,
 *               say(text), choices(list), hud(text), toast(text),
 *               tween(ms, fn), wait(ms), loop(fn), playing(), at(e),
 *               keys, onKey(fn), focus(), alive(), close() }
 *
 *   ink        { bg, panel, fg, dim, hi, lo }: the game's colours, for the frame
 *   choices([{ label, act, kind }])   chips under the picture; kind "go" is the
 *                                      one Enter presses, "quiet" a lesser one
 *   loop(fn)   fn(dt, now) every frame while the game has your attention (its
 *              window in front, not minimised); paused otherwise. Returns stop().
 *   playing()  whether it has your attention: the research clock is stopped
 *              only then (hustle.js asks the same thing of the window)
 *   keys       keys held down now, as e.key lower-cased: "arrowleft", "a", " "
 *   onKey(fn)  fn(key, e) for each key pressed on the picture
 *   at(e)      a pointer event, in the canvas's own pixels
 *
 * Keys pressed in a game stay in it: the desk never hears them, and Esc
 * closes the game. With less motion asked for, tweens jump to their end and
 * beats are short; a game's own timing, in its loop, is its own to ease.
 */

const MiniGame = (() => {
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const INK = { bg: "#0E0716", panel: "#1A1226", fg: "#EDE7F6", dim: "#8C7FA6", hi: "#FFD86B", lo: "#07040C" };
  const ARROWS = ["arrowleft", "arrowright", "arrowup", "arrowdown"];
  // A pixel caret for the chip Enter presses.
  const CARET = '<svg class="mg__caret" viewBox="0 0 4 7" aria-hidden="true"><path d="M0 0h1v7H0zM1 1h1v5H1zM2 2h1v3H2zM3 3h1v1H3z"/></svg>';

  function open(o) {
    const had = getWin(o.key);
    if (had && had.game) { revealWin(had); had.game.focus(); return had.game; }
    const W = o.w, Ht = o.h, k = o.scale || 3, ink = Object.assign({}, INK, o.ink || {});
    const enterGo = o.enterGo !== false;
    let alive = true, stat = "";
    const w = createWindow({
      key: o.key, title: o.title, iconId: o.iconId || "gamepad", frame: "ghost",
      w: W * k + 28, h: Ht * k + 196, minW: W * 2 + 28, minH: Ht * 2 + 190,
      className: "w98--game" + (o.className ? " " + o.className : ""),
      onClose: () => { alive = false; clearInterval(tick); if (o.onClose) o.onClose(); },
    });
    w.client.classList.add("client--flush");
    // The game's colours, on the window itself: the frame wears them too.
    for (const [n, v] of Object.entries(ink)) w.el.style.setProperty("--mg-" + n, v);
    w.client.innerHTML =
      '<div class="mg">' +
        '<div class="mg__hud"><b class="mg__title">' + esc(String(o.title || "").split(" — ")[0]) + '</b><span class="mg__stat"></span><span class="mg__clock"></span></div>' +
        '<div class="mg__screen" tabindex="0" aria-label="' + esc(o.title || "Game") + '"><canvas class="mg__cv" width="' + W + '" height="' + Ht + '"></canvas>' +
          '<p class="mg__pause" aria-hidden="true">PAUSED<br><span>click to play</span></p></div>' +
        '<div class="mg__talk"><p class="mg__say" aria-live="polite"></p><div class="mg__choices" role="group"></div></div>' +
      "</div>";
    const root = w.client.querySelector(".mg"), cv = w.client.querySelector(".mg__cv"), screen = w.client.querySelector(".mg__screen");
    const statEl = w.client.querySelector(".mg__stat"), clockEl = w.client.querySelector(".mg__clock");
    // As big as the window allows, in whole device pixels to every game
    // pixel, whatever the screen's scaling: at 150% a game pixel is 4 device
    // pixels, never a blurry 4.5. Maximise the window for a bigger game.
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const room = Math.min((screen.clientWidth - 20) * dpr / W, (screen.clientHeight - 20) * dpr / Ht);
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
    screen.addEventListener("pointerdown", () => screen.focus({ preventScroll: true }));

    // Whether the game has your attention: in front, and not minimised.
    const playing = () => alive && w.el.isConnected && activeWin === w && !w.el.classList.contains("min");
    const paint = () => {
      const on = playing();
      clockEl.textContent = on ? "clock stopped" : "clock running";
      clockEl.classList.toggle("is-stopped", on);
    };
    const tick = setInterval(() => { if (!alive) return clearInterval(tick); paint(); }, 250);
    paint();

    /* ── keys: they stay in the game ─────────────────────────── */
    const keys = new Set(), keyFns = [];
    w.el.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
      e.stopPropagation();
      if (key === "escape") { e.preventDefault(); game.close(); return; }
      const chip = e.target.closest(".mg__c");
      if (chip && ARROWS.includes(key)) {                     // arrows walk the chips
        e.preventDefault();
        const all = [...box.querySelectorAll(".mg__c:not(:disabled)")];
        const i = all.indexOf(chip), d = key === "arrowleft" || key === "arrowup" ? -1 : 1;
        if (all.length) all[(i + d + all.length) % all.length].focus({ preventScroll: true });
        return;
      }
      if (e.target.closest("button,input,select,textarea")) return;   // Enter and Space press what has focus
      if (key === "enter" && enterGo) {
        const go = box.querySelector('[data-kind="go"]');
        if (go) { e.preventDefault(); go.click(); return; }
      }
      if (ARROWS.includes(key) || key === " ") e.preventDefault();
      if (!e.repeat) keys.add(key);
      keyFns.forEach((fn) => fn(key, e));
    });
    w.el.addEventListener("keyup", (e) => { keys.delete(e.key.toLowerCase()); e.stopPropagation(); });
    w.el.addEventListener("focusout", (e) => { if (!w.el.contains(e.relatedTarget)) keys.clear(); });

    const game = {
      w, cv, ctx, W, H: Ht, keys,
      reduced: reduced(),
      alive: () => alive && w.el.isConnected,
      playing,
      focus() { if (game.alive()) screen.focus({ preventScroll: true }); },
      say(text) { say.textContent = text; },
      hud(text) { stat = String(text || ""); statEl.textContent = stat; },
      choices(list) {
        const had = w.el.contains(document.activeElement);
        acts = list || [];
        box.innerHTML = acts.map((c, i) => '<button type="button" class="mg__c' + (c.kind ? " mg__c--" + c.kind : "") + '" data-i="' + i + '"' +
          (c.kind ? ' data-kind="' + c.kind + '"' : "") + (c.disabled ? " disabled" : "") + ">" + (c.kind === "go" ? CARET : "") + esc(c.label) + "</button>").join("");
        const first = box.querySelector('[data-kind="go"]') || box.querySelector(".mg__c");
        if (!had) return;
        if (first) first.focus({ preventScroll: true }); else screen.focus({ preventScroll: true });
      },
      // A find, called out over the picture for a moment.
      toast(text) {
        const n = document.createElement("p");
        n.className = "mg__toast";
        n.textContent = text;
        n.style.top = 14 + screen.querySelectorAll(".mg__toast").length * 24 + "px";   // two at once stack, not overlap
        screen.appendChild(n);
        setTimeout(() => n.remove(), 2800);
      },
      onKey(fn) { keyFns.push(fn); },
      at(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * Ht / r.height }; },
      loop(fn) {
        let last = 0, raf = 0;
        const step = (now) => {
          raf = 0;
          if (!game.alive()) return;
          const on = playing();
          root.classList.toggle("is-paused", !on);
          if (on) { const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; fn(dt, now); } else last = 0;
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { if (raf) cancelAnimationFrame(raf); raf = 0; root.classList.remove("is-paused"); };
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
    setTimeout(() => game.focus(), 0);
    return game;
  }

  return { open, reduced, INK };
})();
