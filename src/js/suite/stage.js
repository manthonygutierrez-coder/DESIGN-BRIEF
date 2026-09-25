"use strict";
/* ── the canvas panel ─────────────────────────────────────
 * The view both drawing modes work in: an artboard on a pasteboard, zoomed and
 * panned, with rulers you pull guides out of. Work can sit out on the
 * pasteboard: it is drawn there, dimmed, and can be grabbed; only the artboard
 * is exported.
 *
 *   make(host, hooks)  a stage inside `host`. hooks.view() runs after every
 *                      zoom or pan; hooks.guide(axis, value, index, done) while
 *                      a guide is dragged out of a ruler (index -1: a new one)
 *
 * It draws the parts every mode shares (pasteboard, board, guides, the focus
 * grid, smart guides, rulers); each editor draws its layers and handles
 * between them. View space is CSS pixels inside the canvas; document space
 * is the doc's own units.
 */

const SuiteStage = (() => {
  const G = SuiteGuides;
  const RULER = 16;
  const SNAP_PX = 6;                     // how close, on screen, a snap catches
  const Z = { min: 0.05, max: 32 };

  const LOOKS = {
    graphite: { board: "#2B2B31", paste: "#1D1D21", veil: "rgba(29,29,33,.62)", edge: "rgba(255,255,255,.14)",
      ruler: "#26262B", rulerInk: "#8E8E9A", rulerHot: "rgba(87,224,255,.28)", guide: "#3FD3FF", grid: "rgba(255,160,64,.34)",
      gridMajor: "rgba(255,160,64,.7)", smart: "#FF4FA3", sel: "#57E0FF", shadow: "rgba(0,0,0,.55)" },
    classic: { board: "#9A9AA4", paste: "#7B7B84", veil: "rgba(123,123,132,.6)", edge: "rgba(0,0,0,.35)",
      ruler: "#D4D0C8", rulerInk: "#303036", rulerHot: "rgba(16,132,208,.25)", guide: "#00A8E8", grid: "rgba(224,68,43,.28)",
      gridMajor: "rgba(224,68,43,.62)", smart: "#E0197D", sel: "#1084D0", shadow: "rgba(0,0,0,.35)" },
  };

  function make(host, hooks = {}) {
    host.innerHTML = '<div class="sx__rc" title="Drag from a ruler to place a guide"></div>' +
      '<canvas class="sx__rx" aria-hidden="true"></canvas><canvas class="sx__ry" aria-hidden="true"></canvas>' +
      '<div class="sx__view"><canvas class="sx__cv"></canvas></div>';
    const cv = host.querySelector(".sx__cv"), rx = host.querySelector(".sx__rx"), ry = host.querySelector(".sx__ry");
    const st = {
      host, cv, rx, ry, view: host.querySelector(".sx__view"), look: LOOKS.graphite,
      zoom: 1, x: 0, y: 0, w: 1, h: 1, dpr: 1, pixel: false, doc: null,
      bloomAt: 0, marks: null, panning: null, spaceDown: false, hot: null,
    };

    /* ── size and view ─────────────────────────────────── */
    st.measure = () => {
      const r = st.view.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      // The options strip growing a row moves the view's top edge: move the
      // work back by as much, so nothing on the board jumps.
      if (st.top != null && r.width && (Math.abs(r.top - st.top) > 0.5 || Math.abs(r.left - st.left) > 0.5) && Math.abs(w - st.w) < 2) {
        st.y -= r.top - st.top; st.x -= r.left - st.left;
      }
      if (r.width) { st.top = r.top; st.left = r.left; }
      if (w !== st.w || h !== st.h || dpr !== st.dpr) {
        st.w = w; st.h = h; st.dpr = dpr;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        cv.style.width = w + "px"; cv.style.height = h + "px";
        rx.width = Math.round(w * dpr); rx.height = Math.round(RULER * dpr); rx.style.width = w + "px"; rx.style.height = RULER + "px";
        ry.width = Math.round(RULER * dpr); ry.height = Math.round(h * dpr); ry.style.width = RULER + "px"; ry.style.height = h + "px";
        return true;
      }
      return false;
    };

    st.fit = (doc) => {
      st.measure();
      const m = 36;
      let z = Math.min((st.w - m * 2) / doc.w, (st.h - m * 2) / doc.h);
      if (st.pixel) z = Math.max(1, Math.floor(z));
      else z = Math.max(Z.min, Math.min(4, Math.floor(z * 100) / 100));
      st.zoom = z;
      st.x = Math.round((st.w - doc.w * z) / 2); st.y = Math.round((st.h - doc.h * z) / 2);
      st.auto = true;
      if (hooks.view) hooks.view();
    };
    // A resize keeps the fitted view fitted; one you zoomed or moved stays put.
    st.refit = (doc) => {
      const w0 = st.w, h0 = st.h;
      if (st.measure() && st.auto && (Math.abs(st.w - w0) > 48 || Math.abs(st.h - h0) > 48)) st.fit(doc);
    };

    // Zoom so the document point under (sx, sy) stays where it is.
    st.zoomTo = (z, sx = st.w / 2, sy = st.h / 2) => {
      st.auto = false;
      z = st.pixel ? Math.max(1, Math.min(48, Math.round(z))) : Math.max(Z.min, Math.min(Z.max, z));
      const dx = (sx - st.x) / st.zoom, dy = (sy - st.y) / st.zoom;
      st.zoom = z;
      st.x = sx - dx * z; st.y = sy - dy * z;
      if (st.pixel) { st.x = Math.round(st.x); st.y = Math.round(st.y); }
      if (hooks.view) hooks.view();
    };
    st.step = (dir) => {
      if (st.pixel) return st.zoomTo(st.zoom + dir * Math.max(1, Math.round(st.zoom / 4)));
      const steps = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];
      const i = dir > 0 ? steps.findIndex((s) => s > st.zoom + 1e-3) : steps.length - 1 - steps.slice().reverse().findIndex((s) => s < st.zoom - 1e-3);
      st.zoomTo(steps[Math.max(0, Math.min(steps.length - 1, i < 0 ? (dir > 0 ? steps.length - 1 : 0) : i))]);
    };
    st.pan = (dx, dy) => { st.auto = false; st.x += dx; st.y += dy; if (st.pixel) { st.x = Math.round(st.x); st.y = Math.round(st.y); } if (hooks.view) hooks.view(); };

    st.toDoc = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left - st.x) / st.zoom, y: (e.clientY - r.top - st.y) / st.zoom };
    };
    st.toView = (x, y) => ({ x: st.x + x * st.zoom, y: st.y + y * st.zoom });
    st.tol = (px = SNAP_PX) => px / st.zoom;

    /* ── wheel, space and middle-button panning ────────── */
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const f = Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022));
        st.zoomTo(st.pixel ? st.zoom + Math.sign(-e.deltaY) : st.zoom * f, e.clientX - r.left, e.clientY - r.top);
      } else st.pan(-(e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX), e.shiftKey && !e.deltaX ? 0 : -e.deltaY);
    }, { passive: false });
    const panStart = (e) => {
      st.panning = { x: e.clientX, y: e.clientY };
      cv.setPointerCapture(e.pointerId);
      host.classList.add("is-panning");
    };
    cv.addEventListener("pointerdown", (e) => {
      if (e.button === 1 || (e.button === 0 && (st.spaceDown || st.handTool))) { e.stopImmediatePropagation(); e.preventDefault(); panStart(e); }
    }, true);
    cv.addEventListener("pointermove", (e) => {
      if (!st.panning) return;
      e.stopImmediatePropagation();
      st.pan(e.clientX - st.panning.x, e.clientY - st.panning.y);
      st.panning = { x: e.clientX, y: e.clientY };
    }, true);
    const panEnd = (e) => { if (st.panning) { e.stopImmediatePropagation(); st.panning = null; host.classList.remove("is-panning"); } };
    cv.addEventListener("pointerup", panEnd, true);
    cv.addEventListener("pointercancel", panEnd, true);

    /* ── guides out of the rulers ──────────────────────── */
    const fromRuler = (axis) => (e) => {
      if (e.button !== 0 || !st.doc || !hooks.guide) return;
      e.preventDefault();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const p = st.toDoc(ev);
        const v = axis === "v" ? p.x : p.y;
        const r = cv.getBoundingClientRect();
        const inside = ev.clientX >= r.left && ev.clientY >= r.top && ev.clientX <= r.right && ev.clientY <= r.bottom;
        hooks.guide(axis, st.snapGuide(axis, v), -1, false, inside);
      };
      const up = (ev) => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
        const p = st.toDoc(ev), r = cv.getBoundingClientRect();
        const inside = ev.clientX >= r.left && ev.clientY >= r.top && ev.clientX <= r.right && ev.clientY <= r.bottom;
        hooks.guide(axis, st.snapGuide(axis, axis === "v" ? p.x : p.y), -1, true, inside);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
    };
    // The top ruler makes horizontal guides; the left one, vertical.
    rx.addEventListener("pointerdown", fromRuler("h"));
    ry.addEventListener("pointerdown", fromRuler("v"));

    // Guides land on whole units (whole pixels in Pixel), and on the board's
    // edges and middle when they are close.
    st.snapGuide = (axis, v) => {
      const doc = st.doc;
      const size = axis === "v" ? doc.w : doc.h;
      const hit = G.snap(v, [0, size / 2, size], st.tol());
      return hit !== null ? hit : st.pixel ? Math.round(v) : Math.round(v * 2) / 2;
    };

    // The guide under a view point, if any: { axis, index }.
    st.guideAt = (pt) => {
      const g = st.doc && st.doc.guides;
      if (!g) return null;
      const tol = st.tol(4);
      let best = null, bd = tol;
      g.v.forEach((x, i) => { const d = Math.abs(pt.x - x); if (d <= bd) { bd = d; best = { axis: "v", index: i }; } });
      g.h.forEach((y, i) => { const d = Math.abs(pt.y - y); if (d <= bd) { bd = d; best = { axis: "h", index: i }; } });
      return best;
    };

    /* ── the focus grid ────────────────────────────────── */
    st.focus = () => {
      const doc = st.doc;
      if (!doc || !doc.guides) return null;
      return G.focus(doc.guides, doc.w, doc.h, { pad: Math.max(doc.w, doc.h) });
    };
    // When the grid appears it blooms out from its cell.
    st.bloom = () => {
      st.bloomAt = performance.now();
      if (st.reduced) { st.bloomAt = 0; return; }
      const tick = () => { if (hooks.redraw) hooks.redraw(); if (st.bloomAt && performance.now() - st.bloomAt < 700) requestAnimationFrame(tick); else st.bloomAt = 0; };
      requestAnimationFrame(tick);
    };

    /* ── drawing ───────────────────────────────────────── */
    st.begin = () => {
      const ctx = cv.getContext("2d");
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.w, st.h);
      ctx.fillStyle = st.look.paste;
      ctx.fillRect(0, 0, st.w, st.h);
      return ctx;
    };
    // The document's own transform, for drawing layers in doc units.
    st.docTransform = (ctx) => ctx.setTransform(st.dpr * st.zoom, 0, 0, st.dpr * st.zoom, st.dpr * st.x, st.dpr * st.y);
    st.viewTransform = (ctx) => ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);

    st.board = (ctx, doc) => {
      const b = st.toView(0, 0), w = doc.w * st.zoom, h = doc.h * st.zoom;
      st.viewTransform(ctx);
      ctx.fillStyle = st.look.shadow;
      ctx.fillRect(b.x + 3, b.y + 3, w, h);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(b.x, b.y, w, h);
      if (!doc.bg || doc.mode === "pixel") {
        // A fine, quiet checker that never lines up with the pixels, so an
        // empty pixel never reads as a drawn one.
        const cell = st.pixel ? 8 : 10;
        ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, w, h); ctx.clip();
        ctx.fillStyle = st.pixel ? "#EDEDED" : "#E4E4E4";
        for (let y = 0; y < h; y += cell) for (let x = (Math.round(y / cell) % 2) * cell; x < w; x += cell * 2) ctx.fillRect(b.x + x, b.y + y, cell, cell);
        ctx.restore();
      }
    };

    // Everything off the board, dimmed: what is out there still shows, and
    // still takes a click, but reads as "not in the picture".
    st.veil = (ctx, doc) => {
      const b = st.toView(0, 0);
      st.viewTransform(ctx);
      ctx.fillStyle = st.look.veil;
      ctx.beginPath();
      ctx.rect(0, 0, st.w, st.h);
      ctx.rect(b.x + doc.w * st.zoom, b.y, -doc.w * st.zoom, doc.h * st.zoom);
      ctx.fill("evenodd");
      ctx.strokeStyle = st.look.edge;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(b.x) - 0.5, Math.round(b.y) - 0.5, Math.round(doc.w * st.zoom) + 1, Math.round(doc.h * st.zoom) + 1);
    };

    st.grid = (ctx, doc, f, opts = {}) => {
      if (!f) return;
      st.viewTransform(ctx);
      const cx = f.cell.x + f.cell.w / 2, cy = f.cell.y + f.cell.h / 2;
      const since = st.bloomAt ? performance.now() - st.bloomAt : Infinity;
      // Bloom: lines appear by their distance from the cell, easing out past it.
      const t = Math.min(1, since / 560), ease = 1 - Math.pow(1 - t, 3);
      const reach = since === Infinity ? Infinity : ease * Math.max(doc.w, doc.h) * 1.4 + Math.max(f.cell.w, f.cell.h) / 2;
      const b = st.toView(0, 0);
      const inBoard = (ctx2) => { ctx2.beginPath(); ctx2.rect(b.x, b.y, doc.w * st.zoom, doc.h * st.zoom); };
      ctx.save();
      if (!opts.pasteboard) { inBoard(ctx); ctx.clip(); }
      const line = (axis, v, major) => {
        const d = Math.abs(v - (axis === "x" ? cx : cy));
        if (d > reach) return;
        const p = axis === "x" ? Math.round(st.x + v * st.zoom) + 0.5 : Math.round(st.y + v * st.zoom) + 0.5;
        ctx.strokeStyle = major ? st.look.gridMajor : st.look.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (axis === "x") { ctx.moveTo(p, 0); ctx.lineTo(p, st.h); } else { ctx.moveTo(0, p); ctx.lineTo(st.w, p); }
        ctx.stroke();
      };
      const majorX = new Set(f.major.xs), majorY = new Set(f.major.ys);
      // A minor line closer than 4 px on screen to the next is noise: skip it.
      const minorOK = Math.min(f.px, f.py) * st.zoom >= 4;
      for (const x of f.xs) if (minorOK || majorX.has(x)) line("x", x, majorX.has(x));
      for (const y of f.ys) if (minorOK || majorY.has(y)) line("y", y, majorY.has(y));
      // The cell itself, where it started from.
      const c0 = st.toView(f.cell.x, f.cell.y);
      ctx.fillStyle = st.look.grid.replace(/[\d.]+\)$/, "0.10)");
      ctx.fillRect(c0.x, c0.y, f.cell.w * st.zoom, f.cell.h * st.zoom);
      ctx.restore();
    };

    st.guides = (ctx, doc, hot) => {
      const g = doc.guides;
      if (!g) return;
      st.viewTransform(ctx);
      ctx.lineWidth = 1;
      const draw = (axis, v, i) => {
        const on = hot && hot.axis === axis && hot.index === i;
        ctx.strokeStyle = st.look.guide;
        ctx.globalAlpha = on ? 1 : 0.8;
        ctx.setLineDash(on ? [] : [5, 3]);
        ctx.beginPath();
        if (axis === "v") { const x = Math.round(st.x + v * st.zoom) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, st.h); }
        else { const y = Math.round(st.y + v * st.zoom) + 0.5; ctx.moveTo(0, y); ctx.lineTo(st.w, y); }
        ctx.stroke();
      };
      g.v.forEach((x, i) => draw("v", x, i));
      g.h.forEach((y, i) => draw("h", y, i));
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };

    // A guide being dragged out: solid, with its position beside the cursor.
    st.ghostGuide = (ctx, axis, v) => {
      st.viewTransform(ctx);
      ctx.strokeStyle = st.look.guide; ctx.lineWidth = 1;
      ctx.beginPath();
      const p = axis === "v" ? Math.round(st.x + v * st.zoom) + 0.5 : Math.round(st.y + v * st.zoom) + 0.5;
      if (axis === "v") { ctx.moveTo(p, 0); ctx.lineTo(p, st.h); } else { ctx.moveTo(0, p); ctx.lineTo(st.w, p); }
      ctx.stroke();
      st.label(ctx, (axis === "v" ? "x " : "y ") + Math.round(v * 10) / 10, axis === "v" ? p + 4 : 20, axis === "v" ? 18 : p - 14);
    };

    st.smart = (ctx, lines) => {
      if (!lines || !lines.length) return;
      st.viewTransform(ctx);
      ctx.strokeStyle = st.look.smart; ctx.lineWidth = 1;
      for (const l of lines) {
        ctx.beginPath();
        if (l.axis === "x") { const x = Math.round(st.x + l.at * st.zoom) + 0.5; ctx.moveTo(x, st.y + l.from * st.zoom - 6); ctx.lineTo(x, st.y + l.to * st.zoom + 6); }
        else { const y = Math.round(st.y + l.at * st.zoom) + 0.5; ctx.moveTo(st.x + l.from * st.zoom - 6, y); ctx.lineTo(st.x + l.to * st.zoom + 6, y); }
        ctx.stroke();
      }
    };

    st.label = (ctx, text, x, y) => {
      ctx.save();
      ctx.font = "8px Silkscreen, monospace";
      const w = ctx.measureText(text).width + 8;
      ctx.fillStyle = "rgba(10,10,14,.82)";
      ctx.fillRect(x, y, w, 13);
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "top";
      ctx.fillText(text, x + 4, y + 3);
      ctx.restore();
    };

    /* ── rulers ────────────────────────────────────────── */
    // marks: { x: [lo, hi], y: [lo, hi] } — the selection, shaded on both rulers.
    st.rulers = () => {
      const L = st.look;
      const draw = (c, horiz) => {
        const ctx = c.getContext("2d");
        ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
        const len = horiz ? st.w : st.h;
        ctx.fillStyle = L.ruler; ctx.fillRect(0, 0, horiz ? len : RULER, horiz ? RULER : len);
        const off = horiz ? st.x : st.y;
        const mk = st.marks && st.marks[horiz ? "x" : "y"];
        if (mk) { ctx.fillStyle = L.rulerHot; const a = off + mk[0] * st.zoom, b = off + mk[1] * st.zoom; horiz ? ctx.fillRect(a, 0, b - a, RULER) : ctx.fillRect(0, a, RULER, b - a); }
        // A labelled tick at least every 56 px on screen.
        const unit = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000].find((u) => u * st.zoom >= 56) || 10000;
        const minor = unit / (unit % 5 === 0 && unit >= 5 ? 5 : 2);
        ctx.strokeStyle = L.rulerInk; ctx.fillStyle = L.rulerInk; ctx.lineWidth = 1;
        ctx.font = "8px Silkscreen, monospace"; ctx.textBaseline = "top";
        const first = Math.floor(-off / st.zoom / minor) * minor, last = (len - off) / st.zoom;
        ctx.beginPath();
        for (let v = first, n = 0; v <= last && n < 2000; v += minor, n++) {
          const p = Math.round(off + v * st.zoom) + 0.5;
          const major = Math.abs(v / unit - Math.round(v / unit)) < 1e-6;
          const k = major ? RULER : minor * st.zoom >= 6 ? 5 : 0;
          if (!k) continue;
          if (horiz) { ctx.moveTo(p, RULER); ctx.lineTo(p, RULER - k); } else { ctx.moveTo(RULER, p); ctx.lineTo(RULER - k, p); }
          if (major) {
            const t = String(Math.round(v));
            if (horiz) ctx.fillText(t, p + 3, 2);
            else { ctx.save(); ctx.translate(2, p + 3); ctx.rotate(Math.PI / 2); ctx.fillText(t, 0, -9); ctx.restore(); }
          }
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,.25)";
        horiz ? ctx.fillRect(0, RULER - 1, len, 1) : ctx.fillRect(RULER - 1, 0, 1, len);
      };
      draw(rx, true); draw(ry, false);
    };

    return st;
  }

  return { make, LOOKS, RULER, SNAP_PX };
})();
