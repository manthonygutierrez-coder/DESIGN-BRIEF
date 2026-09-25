"use strict";
/* ── Vector mode ──────────────────────────────────────────
 * Marks, wordmarks, monograms, banners and posters: shapes you can bend, a
 * pen that draws curves, the shape builder, type you edit where it sits (bent
 * into an arc, or set along a path), mirrored layers, and guides that turn
 * into a focus grid where two cross two others.
 *
 * mount(ed, H) builds the mode into a suite window. H is what the suite lends
 * every mode (undo, status, sounds, cards, fonts); the mode sets on ed what
 * the suite calls back: render, draw, key, escape, drop, sample, place,
 * selectedImage, view.
 */

const SuiteVectorEd = (() => {
  const D = SuiteDoc, R = SuiteRender, V = SuiteVector, G = SuiteGuides, Sh = SuiteShapes, A = SuiteApps;
  const HANDLE = 8, HIT = 7;
  const DRAWN = ["rect", "ellipse", "path", "polygon"];
  const HANDLES = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];

  const TOOLS = [
    { id: "select", icon: "t-select", label: "Select and move", key: "v" },
    { id: "node", icon: "t-node", label: "Nodes: drag points and handles, click an outline to add a point", key: "a" },
    { id: "pen", icon: "t-pen", label: "Pen: click for a corner, drag for a curve", key: "p" },
    { id: "shape", flyout: true },
    { id: "text", icon: "t-text", label: "Type: click to write, or click a shape to write along it", key: "t" },
    { id: "build", icon: "t-build", label: "Shape builder: drag across shapes to merge, Alt-drag to cut", key: "m" },
    { id: "eyedrop", icon: "t-eyedrop", label: "Eyedropper: take a colour from the work", key: "e" },
    { id: "image", icon: "t-image", label: "Place a picture from disk", key: "i" },
    { id: "hand", icon: "t-hand", label: "Hand: drag to move around (or hold Space)", key: "h" },
  ];
  const SHAPES = {
    rect: { icon: "t-rect", label: "Rectangle", key: "r" },
    ellipse: { icon: "t-ellipse", label: "Ellipse", key: "o" },
    polygon: { icon: "t-polygon", label: "Polygon and star", key: "y" },
    line: { icon: "t-line", label: "Line", key: "l" },
  };
  const keyOf = (id) => (SHAPES[id] ? SHAPES[id].key : (TOOLS.find((t) => t.id === id) || {}).key);
  const esc = (s) => String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const r2 = (v) => Math.round(v * 100) / 100;

  /* ── geometry of layers ───────────────────────────────── */
  function toDoc(l, px, py) {
    const a = (l.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    return { x: cx + (px - l.w / 2) * c - (py - l.h / 2) * s, y: cy + (px - l.w / 2) * s + (py - l.h / 2) * c };
  }
  const corners = (l) => [[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]].map(([x, y]) => toDoc(l, x, y));
  function boxOf(ls) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const l of ls) for (const p of corners(l)) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    return x1 < x0 ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // A shape's outline as editable nodes, in its own frame.
  function nodesOf(l) {
    if (l.type === "path") return V.place(l.d, l.box, 0, 0, l.w, l.h);
    if (l.type === "rect") return V.rect(0, 0, l.w, l.h, l.radius || 0);
    if (l.type === "ellipse") return V.ellipse(l.w / 2, l.h / 2, l.w / 2, l.h / 2);
    if (l.type === "polygon") return V.polygon(0, 0, l.w, l.h, l.sides, l.inner);
    return null;
  }

  // Edited nodes back into the layer, which becomes a path if it was not one.
  // The layer's frame moves with the new bounds; nothing on screen jumps.
  function setNodes(l, path) {
    const b = V.bounds(path);
    if (!(b.w > 0.01 || b.h > 0.01)) return;
    const w = Math.max(1, b.w), h = Math.max(1, b.h);
    const c = toDoc(l, b.x + b.w / 2, b.y + b.h / 2);
    const inBox = V.transform(path, (x, y) => ({ x: (x - b.x) / w * 64, y: (y - b.y) / h * 64 }));
    Object.assign(l, { type: "path", d: V.toD(inBox), box: 64, x: r2(c.x - w / 2), y: r2(c.y - h / 2), w: r2(w), h: r2(h) });
    if (!l.fillRule) l.fillRule = "nonzero";
    delete l.radius; delete l.sides; delete l.inner;
  }

  /* ── mount ─────────────────────────────────────────────── */
  function mount(ed, H) {
    const body = ed.body;
    body.innerHTML =
      '<div class="sx__opts" role="toolbar" aria-label="Tool options"></div>' +
      '<div class="sx__main">' +
        '<div class="sx__rail" role="toolbar" aria-label="Tools"></div>' +
        '<div class="sx__stage"></div>' +
        '<div class="sx__side">' +
          '<section class="sx__panel sx__panel--grow"><header class="sx__ph"><span>LAYERS</span><em class="sx__lyn"></em></header>' +
            '<div class="sx__layers" role="listbox" aria-label="Layers" aria-multiselectable="true"></div>' +
            '<footer class="sx__pf"></footer></section>' +
          '<section class="sx__panel"><header class="sx__ph"><span>TRANSFORM</span></header><div class="sx__xf"></div></section>' +
        "</div>" +
      "</div>";
    Object.assign(ed, {
      sel: ed.sel || [], tool: ed.tool || "select", shape: ed.shape || "rect",
      fill: ed.fill || ed.doc.palette[0] || "#E0442B", stroke: ed.stroke || "#14110E", strokeW: ed.strokeW || 0,
      radius: ed.radius || 0, sides: ed.sides || 5, star: !!ed.star, inner: ed.inner || 0.45,
      grid: ed.grid !== false, smartOn: ed.smartOn !== false,
      pen: null, node: null, drag: null, hover: null, lines: [], editing: null, ghost: null, hadGrid: false,
    });
    ed.opts = body.querySelector(".sx__opts");
    ed.rail = body.querySelector(".sx__rail");
    ed.layersEl = body.querySelector(".sx__layers");
    ed.xfEl = body.querySelector(".sx__xf");
    ed.st = SuiteStage.make(body.querySelector(".sx__stage"), {
      view: () => { draw(ed); if (ed.onView) ed.onView(); }, redraw: () => draw(ed),
      guide: (axis, v, index, done, inside) => guideDrag(ed, H, axis, v, index, done, inside),
    });
    ed.st.look = SuiteStage.LOOKS[H.look()] || SuiteStage.LOOKS.graphite;
    ed.st.reduced = H.reduced();
    ed.view = ed.st.view;
    ed.hadGrid = !!G.focus(ed.doc.guides || { v: [], h: [] }, ed.doc.w, ed.doc.h);

    const edit = document.createElement("textarea");
    edit.className = "sx__edit"; edit.hidden = true; edit.spellcheck = false;
    edit.setAttribute("aria-label", "Text");
    ed.view.appendChild(edit);
    ed.editEl = edit;

    ed.draw = () => draw(ed);
    ed.render = (o = {}) => render(ed, H, o);
    ed.key = (e) => onKey(ed, H, e);
    ed.escape = () => escape(ed, H);
    ed.drop = (c, at, shift) => dropCard(ed, H, c, at, shift);
    ed.sample = (x, y) => sampleDoc(ed.doc, x, y);
    ed.selectedImage = () => { const l = one(ed); return l && l.type === "image" && l.src ? l : null; };
    ed.place = (src, name) => placeSrc(ed, H, src, name);
    ed.unmount = () => { endText(ed, H); finishPen(ed, H, true); };
    ed.relook = () => { ed.st.look = SuiteStage.LOOKS[H.look()] || SuiteStage.LOOKS.graphite; draw(ed); };
    ed.viewClick = (o) => optClick(ed, H, o);

    wirePointer(ed, H);
    wirePanels(ed, H);
    wireText(ed, H);
    wireDrop(ed, H);
    requestAnimationFrame(() => { ed.st.doc = ed.doc; ed.st.fit(ed.doc); ed.render(); });
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => { ed.st.refit(ed.doc); draw(ed); });
      ro.observe(ed.st.view);
      ed.ro = ro;
    }
  }

  const layerOf = (ed, id) => D.find(ed.doc, id);
  const chosen = (ed) => ed.sel.map((id) => layerOf(ed, id)).filter(Boolean);
  const one = (ed) => (ed.sel.length === 1 ? layerOf(ed, ed.sel[0]) : null);
  function select(ed, ids) { ed.sel = ids.filter((id) => layerOf(ed, id)); ed.node = null; }

  /* ── render ───────────────────────────────────────────── */
  function render(ed, H, o) {
    if (!ed.body.isConnected) return;
    reflow(ed);
    ed.sel = ed.sel.filter((id) => layerOf(ed, id));
    draw(ed);
    if (o.panels !== false) { paintLayers(ed, H); paintXf(ed); paintOpts(ed, H); }
    paintRail(ed, H);
    if (H.painted) H.painted(ed);
  }

  // Text set along a path follows it: re-place it whenever anything moves.
  function reflow(ed) {
    const ctx = ed.st.cv.getContext("2d");
    for (const l of ed.doc.layers) if (l.type === "text" && (l.on || l.bend)) fitText(ed, l, ctx);
  }
  function fitText(ed, l, ctx = ed.st.cv.getContext("2d")) {
    if (l.on && !layerOf(ed, l.on)) l.on = null;
    const m = R.measureText(ctx, l, ed.doc);
    l.w = m.w; l.h = m.h;
    if (m.x !== undefined) { l.x = m.x; l.y = m.y; l.rot = 0; }
  }

  function draw(ed) {
    const st = ed.st, doc = ed.doc;
    if (!st || !doc || !st.view.isConnected) return;
    st.measure();
    st.doc = doc;
    const f = st.focus();
    if (f && !ed.hadGrid && ed.grid) { st.bloom(); if (ed.onGrid) ed.onGrid(f); }
    ed.hadGrid = !!f;
    const ctx = st.begin();
    st.board(ctx, doc);
    st.docTransform(ctx);
    const shown = ed.editing && !ed.editing.float ? Object.assign({}, doc, { layers: doc.layers.filter((l) => l.id !== ed.editing.id) }) : doc;
    R.draw(ctx, shown, { scale: 1, editor: true, zoom: st.zoom, checker: false });
    st.veil(ctx, doc);
    if (ed.grid && f) st.grid(ctx, doc, f);
    st.guides(ctx, doc, ed.hotGuide);
    if (ed.ghost) st.ghostGuide(ctx, ed.ghost.axis, ed.ghost.v);
    overlays(ed, ctx);
    st.smart(ctx, ed.lines);
    const b = boxOf(chosen(ed));
    st.marks = b ? { x: [b.x, b.x + b.w], y: [b.y, b.y + b.h] } : null;
    st.rulers();
  }

  function overlays(ed, ctx) {
    const st = ed.st, z = st.zoom, look = st.look;
    st.viewTransform(ctx);
    const V2 = (p) => st.toView(p.x, p.y);
    const outline = (l, colour, w = 1) => {
      ctx.strokeStyle = colour; ctx.lineWidth = w;
      const pts = corners(l).map(V2);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.stroke();
    };
    // What the pointer is over.
    const hov = ed.hover && layerOf(ed, ed.hover);
    if (hov && !ed.sel.includes(hov.id) && !ed.drag) {
      if (ed.tool === "text" && DRAWN.includes(hov.type)) {
        const p = R.pathInDoc(hov);
        if (p) { ctx.save(); ctx.strokeStyle = look.guide; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); strokePath(ctx, st, p); ctx.restore(); }
      } else outline(hov, look.sel, 1);
    }
    // Mirror axes of what is selected.
    for (const l of chosen(ed)) {
      if (!l.mirror) continue;
      ctx.save(); ctx.strokeStyle = look.smart; ctx.setLineDash([7, 4]); ctx.lineWidth = 1;
      if (l.mirror.v != null) { const x = Math.round(st.x + l.mirror.v * z) + 0.5; ctx.beginPath(); ctx.moveTo(x, st.y - 12); ctx.lineTo(x, st.y + ed.doc.h * z + 12); ctx.stroke(); diamond(ctx, x, st.y + ed.doc.h * z / 2, look.smart); }
      if (l.mirror.h != null) { const y = Math.round(st.y + l.mirror.h * z) + 0.5; ctx.beginPath(); ctx.moveTo(st.x - 12, y); ctx.lineTo(st.x + ed.doc.w * z + 12, y); ctx.stroke(); diamond(ctx, st.x + ed.doc.w * z / 2, y, look.smart); }
      ctx.restore();
    }
    // Selection.
    const ls = chosen(ed);
    if (ed.tool !== "node") {
      if (ls.length === 1) {
        const l = ls[0];
        ctx.save(); ctx.setLineDash([4, 3]); outline(l, look.sel, 1); ctx.restore();
        if (!l.locked) {
          handlesOf(ed, l).forEach((h) => square(ctx, h.x, h.y, look.sel));
          if (!(l.type === "text" && l.on)) {
            const top = V2(toDoc(l, l.w / 2, 0)), rot = V2(toDoc(l, l.w / 2, -22 / z));
            ctx.strokeStyle = look.sel; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(rot.x, rot.y); ctx.stroke();
            ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(rot.x, rot.y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
      } else if (ls.length > 1) {
        ls.forEach((l) => outline(l, look.sel, 1));
        const b = boxOf(ls);
        ctx.save(); ctx.setLineDash([4, 3]);
        const p0 = st.toView(b.x, b.y);
        ctx.strokeStyle = look.sel; ctx.strokeRect(Math.round(p0.x) + 0.5, Math.round(p0.y) + 0.5, Math.round(b.w * z), Math.round(b.h * z));
        ctx.restore();
        groupHandles(ed, b).forEach((h) => square(ctx, h.x, h.y, look.sel));
      }
    }
    // Nodes.
    if (ed.tool === "node" && ls.length === 1 && DRAWN.includes(ls[0].type)) {
      const l = ls[0], path = nodesOf(l);
      if (path) {
        ctx.save(); ctx.strokeStyle = look.sel; ctx.lineWidth = 1;
        strokePath(ctx, st, V.transform(path, (x, y) => toDoc(l, x, y)));
        path.forEach((s, si) => s.nodes.forEach((n, ni) => {
          const a = V2(toDoc(l, n.x, n.y)), on = ed.node && ed.node.si === si && ed.node.ni === ni;
          const hs = [];
          if (Math.hypot(n.ix - n.x, n.iy - n.y) > 0.01) hs.push(V2(toDoc(l, n.ix, n.iy)));
          if (Math.hypot(n.ox - n.x, n.oy - n.y) > 0.01) hs.push(V2(toDoc(l, n.ox, n.oy)));
          if (on || hs.length && l.type === "path") hs.forEach((h) => {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(h.x, h.y); ctx.stroke();
            ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(h.x, h.y, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
          ctx.fillStyle = on ? look.sel : "#FFFFFF";
          ctx.fillRect(Math.round(a.x) - 3.5, Math.round(a.y) - 3.5, 7, 7); ctx.strokeRect(Math.round(a.x) - 3.5, Math.round(a.y) - 3.5, 7, 7);
        }));
        ctx.restore();
      }
    }
    // The shape builder's stroke, and what it has crossed.
    if (ed.drag && ed.drag.mode === "build") {
      for (const id of ed.drag.crossed) { const l = layerOf(ed, id); if (l) outline(l, look.smart, 2); }
      ctx.strokeStyle = look.smart; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ed.drag.trail.forEach((p, i) => { const v = V2(p); i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y); }); ctx.stroke(); ctx.setLineDash([]);
    }
    // Marquee.
    if (ed.drag && ed.drag.mode === "marquee") {
      const a = V2(ed.drag.from), b = V2(ed.drag.to);
      ctx.fillStyle = "rgba(87,224,255,.12)"; ctx.strokeStyle = look.sel; ctx.setLineDash([3, 3]);
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      ctx.strokeRect(Math.min(a.x, b.x) + 0.5, Math.min(a.y, b.y) + 0.5, Math.abs(b.x - a.x), Math.abs(b.y - a.y)); ctx.setLineDash([]);
    }
    // The pen at work.
    if (ed.pen && ed.pen.nodes.length) {
      const path = [{ closed: false, nodes: ed.pen.nodes.slice() }];
      if (ed.pen.hover && !ed.drag) { const n = ed.pen.hover; path[0].nodes.push(V.node(n.x, n.y)); }
      ctx.strokeStyle = look.sel; ctx.lineWidth = 1.5;
      strokePath(ctx, st, path);
      ed.pen.nodes.forEach((n, i) => {
        const a = V2(n);
        [[n.ix, n.iy], [n.ox, n.oy]].forEach(([hx, hy]) => {
          if (Math.hypot(hx - n.x, hy - n.y) < 0.01) return;
          const h = V2({ x: hx, y: hy }); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(h.x, h.y); ctx.stroke();
          ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
        const closing = i === 0 && ed.pen.nodes.length > 2 && ed.pen.hover && Math.hypot(ed.pen.hover.x - n.x, ed.pen.hover.y - n.y) * z < HIT + 2;
        ctx.fillStyle = closing ? look.smart : i === ed.pen.nodes.length - 1 ? look.sel : "#FFFFFF";
        ctx.fillRect(Math.round(a.x) - (closing ? 5 : 3.5), Math.round(a.y) - (closing ? 5 : 3.5), closing ? 10 : 7, closing ? 10 : 7);
        ctx.strokeRect(Math.round(a.x) - 3.5, Math.round(a.y) - 3.5, 7, 7);
      });
    }
    // A shape being drawn says how big it is.
    if (ed.drag && ed.drag.mode === "create") {
      const l = layerOf(ed, ed.drag.id);
      if (l) st.label(ctx, Math.round(l.w) + " × " + Math.round(l.h), st.toView(l.x + l.w, l.y + l.h).x + 8, st.toView(l.x + l.w, l.y + l.h).y + 6);
    }
  }

  function strokePath(ctx, st, path) {
    ctx.beginPath();
    for (const s of path) {
      if (!s.nodes.length) continue;
      const p0 = st.toView(s.nodes[0].x, s.nodes[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (const [a, b] of V.segs(s)) {
        const c1 = st.toView(a.ox, a.oy), c2 = st.toView(b.ix, b.iy), e = st.toView(b.x, b.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, e.x, e.y);
      }
      if (s.closed) ctx.closePath();
    }
    ctx.stroke();
  }
  function square(ctx, x, y, colour) {
    ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = colour; ctx.lineWidth = 1;
    ctx.fillRect(Math.round(x) - HANDLE / 2 + 0.5, Math.round(y) - HANDLE / 2 + 0.5, HANDLE - 1, HANDLE - 1);
    ctx.strokeRect(Math.round(x) - HANDLE / 2 + 0.5, Math.round(y) - HANDLE / 2 + 0.5, HANDLE - 1, HANDLE - 1);
  }
  function diamond(ctx, x, y, colour) {
    ctx.save(); ctx.setLineDash([]); ctx.fillStyle = colour; ctx.strokeStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // Resize handles in view space: [{ x, y, hx, hy }].
  function handlesOf(ed, l) {
    if (l.type === "text" && l.on) return [];
    return HANDLES.map(([hx, hy]) => Object.assign(ed.st.toView(...Object.values(toDoc(l, (hx + 1) / 2 * l.w, (hy + 1) / 2 * l.h))), { hx, hy }));
  }
  function groupHandles(ed, b) {
    return HANDLES.filter(([hx, hy]) => hx && hy).map(([hx, hy]) => Object.assign(ed.st.toView(b.x + (hx + 1) / 2 * b.w, b.y + (hy + 1) / 2 * b.h), { hx, hy }));
  }

  /* ── snapping ─────────────────────────────────────────── */
  // Lines a point or box can land on: guides, the focus grid, the board's
  // edges and middle; smart guides add the other layers.
  function snapLines(ed) {
    const doc = ed.doc, f = ed.grid ? ed.st.focus() : null;
    const xs = [0, doc.w / 2, doc.w].concat(doc.guides ? doc.guides.v : [], f ? f.xs : []);
    const ys = [0, doc.h / 2, doc.h].concat(doc.guides ? doc.guides.h : [], f ? f.ys : []);
    return { xs, ys };
  }
  function snapPoint(ed, p, e, skip = []) {
    ed.lines = [];
    if (e && (e.metaKey || e.ctrlKey)) return p;
    const { xs, ys } = snapLines(ed), tol = ed.st.tol();
    if (ed.smartOn) for (const l of ed.doc.layers) {
      if (l.hidden || skip.includes(l.id)) continue;
      const b = boxOf([l]); xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h);
    }
    const x = G.snap(p.x, xs, tol), y = G.snap(p.y, ys, tol);
    const out = { x: x !== null ? x : p.x, y: y !== null ? y : p.y };
    if (x !== null) ed.lines.push({ axis: "x", at: x, from: Math.min(0, out.y) - 4, to: Math.max(ed.doc.h, out.y) + 4 });
    if (y !== null) ed.lines.push({ axis: "y", at: y, from: Math.min(0, out.x) - 4, to: Math.max(ed.doc.w, out.x) + 4 });
    if (ed.bonus.includes("snap") && ed.snap) { if (x === null) out.x = D.snap(Math.round(out.x), 10); if (y === null) out.y = D.snap(Math.round(out.y), 10); }
    return out;
  }
  function snapMove(ed, box, e) {
    ed.lines = [];
    if (e.metaKey || e.ctrlKey) return { dx: 0, dy: 0 };
    const tol = ed.st.tol();
    const others = ed.doc.layers.filter((l) => !l.hidden && !ed.sel.includes(l.id) && l.type !== "subject").map((l) => boxOf([l]));
    const s1 = ed.smartOn ? G.smart(box, others, { x: 0, y: 0, w: ed.doc.w, h: ed.doc.h }, tol) : { dx: 0, dy: 0, lines: [] };
    const { xs, ys } = snapLines(ed);
    const s2 = G.snapBox(box, xs, ys, tol);
    const pick = (a, aHit, b, bHit) => (bHit && (!aHit || Math.abs(b) <= Math.abs(a)) ? [b, "b"] : aHit ? [a, "a"] : [0, null]);
    const [dx, wx] = pick(s1.dx, s1.lines.some((l) => l.axis === "x"), s2.dx, s2.x !== null);
    const [dy, wy] = pick(s1.dy, s1.lines.some((l) => l.axis === "y"), s2.dy, s2.y !== null);
    if (wx === "a") ed.lines.push(...s1.lines.filter((l) => l.axis === "x"));
    if (wx === "b") ed.lines.push({ axis: "x", at: s2.x, from: -8, to: ed.doc.h + 8 });
    if (wy === "a") ed.lines.push(...s1.lines.filter((l) => l.axis === "y"));
    if (wy === "b") ed.lines.push({ axis: "y", at: s2.y, from: -8, to: ed.doc.w + 8 });
    let ox = dx, oy = dy;
    if (ed.bonus.includes("snap") && ed.snap) { if (!wx) ox = D.snap(Math.round(box.x), 10) - box.x; if (!wy) oy = D.snap(Math.round(box.y), 10) - box.y; }
    return { dx: ox, dy: oy };
  }

  /* ── pointer ──────────────────────────────────────────── */
  function wirePointer(ed, H) {
    const cv = ed.st.cv;
    cv.addEventListener("pointerdown", (e) => {
      if (ed.fontMenu) { ed.fontMenu = false; paintOpts(ed, H); }
      if (e.button === 0) { endText(ed, H); down(ed, H, e); }
    });
    cv.addEventListener("pointermove", (e) => move(ed, H, e));
    cv.addEventListener("pointerup", (e) => up(ed, H, e));
    cv.addEventListener("pointercancel", (e) => up(ed, H, e));
    cv.addEventListener("pointerleave", () => { if (!ed.drag) { ed.hover = null; if (ed.pen) ed.pen.hover = null; ed.hotGuide = null; draw(ed); } });
    cv.addEventListener("dblclick", (e) => dbl(ed, H, e));
  }

  function hitHandle(ed, e) {
    const l = one(ed);
    const r = ed.st.cv.getBoundingClientRect(), vx = e.clientX - r.left, vy = e.clientY - r.top;
    const near = (p, d = HIT) => Math.abs(p.x - vx) <= d && Math.abs(p.y - vy) <= d;
    if (l && !l.locked) {
      if (!(l.type === "text" && l.on)) {
        const rot = ed.st.toView(...Object.values(toDoc(l, l.w / 2, -22 / ed.st.zoom)));
        if (near(rot, 8)) return { mode: "rotate" };
      }
      const h = handlesOf(ed, l).find((p) => near(p));
      if (h) return { mode: "resize", hx: h.hx, hy: h.hy };
      if (l.mirror) {
        const z = ed.st.zoom;
        if (l.mirror.v != null && near(ed.st.toView(l.mirror.v, ed.doc.h / 2), 8)) return { mode: "axis", axis: "v" };
        if (l.mirror.h != null && near(ed.st.toView(ed.doc.w / 2, l.mirror.h), 8)) return { mode: "axis", axis: "h" };
        void z;
      }
    } else if (ed.sel.length > 1) {
      const h = groupHandles(ed, boxOf(chosen(ed))).find((p) => near(p));
      if (h) return { mode: "gresize", hx: h.hx, hy: h.hy };
    }
    return null;
  }

  function down(ed, H, e) {
    const st = ed.st, doc = ed.doc, p = st.toDoc(e);
    st.cv.setPointerCapture(e.pointerId);
    const pre = JSON.stringify(doc);
    const tool = ed.tool;

    if (tool === "select") {
      const h = hitHandle(ed, e);
      if (h) {
        const l = one(ed);
        ed.drag = Object.assign({ pre, from: p, start: l ? Object.assign({}, l) : null, starts: chosen(ed).map((x) => Object.assign({}, x)), box: boxOf(chosen(ed)) }, h);
        return;
      }
      const g = st.guideAt(p);
      const hit = D.hitTest(doc, p.x, p.y);
      if (g && !hit) { ed.drag = { mode: "guide", pre, axis: g.axis, index: g.index }; return; }
      if (hit) {
        if (e.shiftKey) { select(ed, ed.sel.includes(hit.id) ? ed.sel.filter((id) => id !== hit.id) : ed.sel.concat(hit.id)); render(ed, H, {}); return; }
        if (!ed.sel.includes(hit.id)) select(ed, [hit.id]);
        ed.drag = { mode: "move", pre, from: p, starts: chosen(ed).map((l) => ({ id: l.id, x: l.x, y: l.y, mirror: l.mirror && Object.assign({}, l.mirror) })), box: boxOf(chosen(ed)), alt: e.altKey };
        render(ed, H, {});
        return;
      }
      if (g) { ed.drag = { mode: "guide", pre, axis: g.axis, index: g.index }; return; }
      if (!e.shiftKey) select(ed, []);
      ed.drag = { mode: "marquee", from: p, to: p, keep: e.shiftKey ? ed.sel.slice() : [] };
      render(ed, H, {});
      return;
    }

    if (tool === "node") return nodeDown(ed, H, e, p, pre);

    if (tool === "pen") {
      const q = snapPoint(ed, p, e);
      const pen = ed.pen || (ed.pen = { nodes: [] });
      const first = pen.nodes[0];
      if (first && pen.nodes.length > 2 && Math.hypot(first.x - p.x, first.y - p.y) * st.zoom < HIT + 2) { finishPen(ed, H, false, true); return; }
      pen.nodes.push(V.node(q.x, q.y));
      ed.drag = { mode: "penpull", from: q };
      draw(ed);
      return;
    }

    if (tool === "shape") {
      const q = snapPoint(ed, p, e);
      const type = ed.shape === "line" ? "path" : ed.shape;
      const props = { x: q.x, y: q.y, w: 1, h: 1, fill: ed.shape === "line" ? null : ed.fill, stroke: ed.strokeW > 0 || ed.shape === "line" ? ed.stroke : null,
        strokeW: ed.shape === "line" ? Math.max(2, ed.strokeW) : ed.strokeW, name: SHAPES[ed.shape].label.split(" ")[0] };
      if (type === "rect") props.radius = ed.radius;
      if (type === "polygon") Object.assign(props, { sides: ed.sides, inner: ed.star ? ed.inner : null });
      if (ed.shape === "line") Object.assign(props, { d: "M0 0L64 64", box: 64, stroke: ed.stroke || ed.fill || "#14110E" });
      const l = D.add(doc, D.layer(type, props));
      if (!l) { H.status(ed, "That's as many layers as a document can hold."); return; }
      select(ed, [l.id]);
      ed.drag = { mode: "create", pre, from: q, id: l.id, line: ed.shape === "line" };
      return;
    }

    if (tool === "text") {
      const hit = D.hitTest(doc, p.x, p.y);
      if (hit && hit.type === "text") { select(ed, [hit.id]); render(ed, H, {}); startText(ed, H, hit, true); return; }
      const t = { text: "Type here", font: ed.font || "Archivo", size: ed.fontSize || Math.max(12, Math.round(doc.h / 6)), weight: ed.weight || 700,
        style: ed.italic ? "italic" : "normal", fill: ed.fill && ed.fill !== "#FFFFFF" ? ed.fill : "#0A0A0A", track: ed.track || 0 };
      let l;
      if (hit && DRAWN.includes(hit.type)) {
        // Writing along a shape: the words follow its outline.
        l = D.add(doc, D.layer("text", Object.assign(t, { on: hit.id, align: "center", text: "Write along the curve", size: Math.max(12, Math.round(Math.min(hit.w, hit.h) / 5)) })));
        H.status(ed, "Writing along " + (hit.name || hit.type) + ". Drag the words to slide them along it.");
      } else l = D.add(doc, D.layer("text", Object.assign(t, { x: Math.round(p.x), y: Math.round(p.y - (ed.fontSize || doc.h / 6) * 0.6) })));
      if (!l) return;
      fitText(ed, l);
      H.record(ed, pre);
      select(ed, [l.id]);
      ed.tool = "select";
      H.sound("tool");
      render(ed, H, {});
      startText(ed, H, l, false);
      return;
    }

    if (tool === "build") {
      ed.drag = { mode: "build", pre, cut: e.altKey, crossed: [], trail: [p] };
      crossAt(ed, p);
      draw(ed);
      return;
    }

    if (tool === "eyedrop") {
      const c = sampleDoc(doc, p.x, p.y);
      if (!c) return;
      H.mutate(ed, () => {
        for (const l of chosen(ed)) D.update(doc, l.id, e.shiftKey ? { stroke: c, strokeW: l.strokeW || 2 } : { fill: c });
        if (!doc.palette.includes(c) && doc.palette.length < 12) doc.palette.push(c);
      });
      ed.fill = e.shiftKey ? ed.fill : c;
      H.status(ed, "Took " + c + (ed.sel.length ? " into the selection" : " into the palette"));
      return;
    }

    if (tool === "image") { ed.dropAt = p; H.pickFile(ed, (src, name) => placeSrc(ed, H, src, name, p)); }
  }

  function move(ed, H, e) {
    const st = ed.st, doc = ed.doc, p = st.toDoc(e), d = ed.drag;
    if (!d) {
      // Hover: what a click would do.
      const hit = ["select", "text", "node", "build"].includes(ed.tool) ? D.hitTest(doc, p.x, p.y) : null;
      const hov = hit ? hit.id : null;
      let cursor = "";
      const g = ed.tool === "select" && !hit ? st.guideAt(p) : null;
      ed.hotGuide = g;
      if (ed.tool === "select") {
        const h = hitHandle(ed, e);
        cursor = h ? (h.mode === "rotate" ? "grab" : h.mode === "axis" ? (h.axis === "v" ? "ew-resize" : "ns-resize") : resizeCursor(one(ed), h.hx, h.hy)) : g ? (g.axis === "v" ? "ew-resize" : "ns-resize") : hit ? "move" : "";
      } else if (ed.tool === "pen") {
        const pen = ed.pen;
        if (pen) pen.hover = snapPoint(ed, p, e);
        cursor = "crosshair";
      } else if (ed.tool === "text") cursor = hit && DRAWN.includes(hit.type) ? "copy" : "text";
      else if (ed.tool === "hand") cursor = "grab";
      else if (ed.tool === "eyedrop") cursor = "cell";
      else cursor = "crosshair";
      st.cv.style.cursor = cursor;
      if (hov !== ed.hover || ed.tool === "pen" || g !== ed.hotGuide) { ed.hover = hov; draw(ed); }
      return;
    }
    if (d.mode === "penpull") {
      const pen = ed.pen, n = pen.nodes[pen.nodes.length - 1];
      if (Math.hypot(p.x - d.from.x, p.y - d.from.y) * st.zoom < 3) return;
      n.ox = p.x; n.oy = p.y;
      if (!e.altKey) { n.ix = 2 * n.x - p.x; n.iy = 2 * n.y - p.y; n.k = "sym"; } else n.k = "corner";
      draw(ed);
      return;
    }
    if (d.mode === "marquee") {
      d.to = p;
      const x0 = Math.min(d.from.x, p.x), y0 = Math.min(d.from.y, p.y), x1 = Math.max(d.from.x, p.x), y1 = Math.max(d.from.y, p.y);
      const inside = doc.layers.filter((l) => !l.hidden && !l.locked && (() => { const b = boxOf([l]); return b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0; })()).map((l) => l.id);
      ed.sel = [...new Set(d.keep.concat(inside))];
      draw(ed);
      return;
    }
    if (d.mode === "build") {
      const last = d.trail[d.trail.length - 1];
      const n = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / 2));
      for (let i = 1; i <= n; i++) crossAt(ed, { x: last.x + (p.x - last.x) * i / n, y: last.y + (p.y - last.y) * i / n });
      d.trail.push(p);
      draw(ed);
      return;
    }
    if (d.mode === "guide") {
      const v = st.snapGuide(d.axis, d.axis === "v" ? p.x : p.y);
      const r = st.cv.getBoundingClientRect();
      const out = e.clientX < r.left || e.clientY < r.top;
      doc.guides[d.axis][d.index] = v;
      ed.ghost = out ? null : { axis: d.axis, v };
      d.out = out;
      draw(ed);
      return;
    }
    if (d.mode === "move") {
      if (!d.moved && Math.hypot(p.x - d.from.x, p.y - d.from.y) * st.zoom < 2) return;
      if (!d.moved && d.alt) {
        // Alt-drag leaves a copy behind.
        const copies = [];
        for (const s of d.starts) { const c = D.duplicate(doc, s.id); if (c) { c.x = s.x; c.y = s.y; copies.push(c.id); } }
        void copies;
      }
      d.moved = true;
      let dx = p.x - d.from.x, dy = p.y - d.from.y;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const b = { x: d.box.x + dx, y: d.box.y + dy, w: d.box.w, h: d.box.h };
      const s = snapMove(ed, b, e);
      dx += s.dx; dy += s.dy;
      for (const s0 of d.starts) {
        const l = layerOf(ed, s0.id);
        if (!l || l.locked) continue;
        if (l.type === "text" && l.on) { slideOnPath(ed, l, p); continue; }
        l.x = r2(s0.x + dx); l.y = r2(s0.y + dy);
      }
      reflow(ed);
      draw(ed);
      return;
    }
    if (d.mode === "create") {
      const l = layerOf(ed, d.id);
      if (!l) return;
      const q = snapPoint(ed, p, e, [l.id]);
      if (d.line) {
        let ex = q.x, ey = q.y;
        if (e.shiftKey) { const a = Math.round(Math.atan2(ey - d.from.y, ex - d.from.x) / (Math.PI / 4)) * Math.PI / 4, len = Math.hypot(ex - d.from.x, ey - d.from.y); ex = d.from.x + Math.cos(a) * len; ey = d.from.y + Math.sin(a) * len; }
        const path = [{ closed: false, nodes: [V.node(d.from.x, d.from.y), V.node(ex, ey)] }];
        const f = V.fit(path, 64);
        Object.assign(l, { d: f.d, box: 64, x: r2(f.x), y: r2(f.y), w: r2(Math.max(1, f.w)), h: r2(Math.max(1, f.h)) });
        if (f.w < 1) { l.d = "M32 0L32 64"; }
        if (f.h < 1) { l.d = "M0 32L64 32"; }
      } else {
        let w = q.x - d.from.x, h = q.y - d.from.y;
        if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
        let x0 = w < 0 ? d.from.x + w : d.from.x, y0 = h < 0 ? d.from.y + h : d.from.y;
        w = Math.abs(w); h = Math.abs(h);
        if (e.altKey) { x0 = d.from.x - w; y0 = d.from.y - h; w *= 2; h *= 2; }
        Object.assign(l, { x: r2(x0), y: r2(y0), w: r2(Math.max(1, w)), h: r2(Math.max(1, h)) });
      }
      draw(ed);
      return;
    }
    if (d.mode === "resize") {
      const l = one(ed);
      if (!l) return;
      const q = snapPoint(ed, p, e, [l.id]);
      const keep = e.shiftKey !== (l.type === "text" || l.type === "image");
      const nb = resizeOne(d.start, d.hx, d.hy, q, keep || l.type === "text", e.altKey);
      Object.assign(l, nb);
      if (l.type === "text") { l.size = Math.max(4, r2(d.start.size * nb.h / d.start.h)); fitText(ed, l); }
      reflow(ed);
      draw(ed);
      return;
    }
    if (d.mode === "gresize") {
      const b = d.box, a = { x: b.x + (1 - d.hx) / 2 * b.w, y: b.y + (1 - d.hy) / 2 * b.h };
      const hp = { x: b.x + (d.hx + 1) / 2 * b.w, y: b.y + (d.hy + 1) / 2 * b.h };
      const k = Math.max(0.02, Math.max((p.x - a.x) / ((hp.x - a.x) || 1), (p.y - a.y) / ((hp.y - a.y) || 1)));
      for (const s0 of d.starts) {
        const l = layerOf(ed, s0.id);
        if (!l || l.locked) continue;
        const cx = a.x + (s0.x + s0.w / 2 - a.x) * k, cy = a.y + (s0.y + s0.h / 2 - a.y) * k;
        Object.assign(l, { w: r2(Math.max(1, s0.w * k)), h: r2(Math.max(1, s0.h * k)) });
        l.x = r2(cx - l.w / 2); l.y = r2(cy - l.h / 2);
        if (l.type === "text") { l.size = Math.max(4, r2(s0.size * k)); fitText(ed, l); }
      }
      reflow(ed);
      draw(ed);
      return;
    }
    if (d.mode === "rotate") {
      const l = one(ed);
      if (!l) return;
      let deg = Math.atan2(p.y - (l.y + l.h / 2), p.x - (l.x + l.w / 2)) * 180 / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      l.rot = Math.round(((deg + 540) % 360) - 180);
      draw(ed);
      return;
    }
    if (d.mode === "axis") {
      const l = one(ed);
      if (!l || !l.mirror) return;
      const q = snapPoint(ed, p, e, [l.id]);
      l.mirror = Object.assign({}, l.mirror, { [d.axis]: r2(d.axis === "v" ? q.x : q.y) });
      draw(ed);
      return;
    }
    if (d.mode === "node" || d.mode === "handle") return nodeMove(ed, H, e, p);
  }

  function up(ed, H, e) {
    const d = ed.drag;
    ed.drag = null;
    ed.lines = [];
    ed.ghost = null;
    if (!d) return;
    const doc = ed.doc;
    if (d.mode === "penpull") { draw(ed); return; }
    if (d.mode === "marquee") { render(ed, H, {}); return; }
    if (d.mode === "build") { buildShapes(ed, H, d.crossed, d.cut, d.pre); return; }
    if (d.mode === "guide") {
      if (d.out) doc.guides = G.drop(doc.guides, d.axis, d.index);
      else doc.guides = G.put(doc.guides, d.axis, doc.guides[d.axis][d.index], d.index);
      H.record(ed, d.pre);
      if (d.out) H.status(ed, "Guide removed.");
      render(ed, H, { panels: false });
      return;
    }
    if (d.mode === "create") {
      const l = layerOf(ed, d.id);
      if (l && l.w < 3 && l.h < 3) {
        // A click, not a drag: a shape of a sensible size where you clicked.
        const s = Math.max(24, Math.round(Math.min(doc.w, doc.h) / 4));
        if (d.line) Object.assign(l, { d: "M0 32L64 32", w: s, h: 1, y: l.y });
        else Object.assign(l, { w: s, h: s, x: r2(l.x - s / 2), y: r2(l.y - s / 2) });
      }
      ed.tool = "select";
      H.sound("layer");
    }
    for (const l of chosen(ed)) D.update(doc, l.id, {});      // re-sanitise after direct edits
    if (d.mode === "node" || d.mode === "handle") nodeUp(ed);
    reflow(ed);
    H.record(ed, d.pre);
    render(ed, H, {});
  }

  function dbl(ed, H, e) {
    const p = ed.st.toDoc(e);
    if (ed.tool === "pen") { finishPen(ed, H); return; }
    const hit = D.hitTest(ed.doc, p.x, p.y);
    if (ed.tool === "node" && ed.node) { toggleNodeKind(ed, H); return; }
    if (!hit) return;
    if (hit.type === "text") { select(ed, [hit.id]); render(ed, H, {}); startText(ed, H, hit, true); return; }
    if (DRAWN.includes(hit.type) && ed.tool === "select") { select(ed, [hit.id]); setTool(ed, H, "node"); H.status(ed, "Editing points. Drag a point or a handle; click the outline to add a point; Delete removes one."); }
  }

  function resizeCursor(l, hx, hy) {
    const a = Math.atan2(hy, hx) * 180 / Math.PI + (l ? l.rot || 0 : 0);
    const k = ((Math.round(a / 45) % 4) + 4) % 4;
    return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][k];
  }

  function resizeOne(s, hx, hy, p, keep, center) {
    const q = D.toLocal(s, p.x, p.y);
    let L = 0, Rr = s.w, T = 0, B = s.h;
    if (hx > 0) Rr = q.x; if (hx < 0) L = q.x;
    if (hy > 0) B = q.y; if (hy < 0) T = q.y;
    if (center) {
      if (hx) { const dd = Math.abs(hx > 0 ? Rr - s.w / 2 : s.w / 2 - L); L = s.w / 2 - dd; Rr = s.w / 2 + dd; }
      if (hy) { const dd = Math.abs(hy > 0 ? B - s.h / 2 : s.h / 2 - T); T = s.h / 2 - dd; B = s.h / 2 + dd; }
    }
    let w = Math.max(1, Rr - L), h = Math.max(1, B - T);
    if (keep) {
      const k = hx && hy ? Math.max(w / s.w, h / s.h) : hx ? w / s.w : h / s.h;
      w = Math.max(1, s.w * k); h = Math.max(1, s.h * k);
      if (hx < 0) L = Rr - w; else if (hx > 0) Rr = L + w; else { L = s.w / 2 - w / 2; Rr = L + w; }
      if (hy < 0) T = B - h; else if (hy > 0) B = T + h; else { T = s.h / 2 - h / 2; B = T + h; }
      if (center) { L = s.w / 2 - w / 2; T = s.h / 2 - h / 2; }
    } else {
      if (hx < 0) L = Rr - w; else Rr = L + w;
      if (hy < 0) T = B - h; else B = T + h;
    }
    const c = toDoc(s, (L + L + w) / 2, (T + T + h) / 2);
    return { x: r2(c.x - w / 2), y: r2(c.y - h / 2), w: r2(w), h: r2(h) };
  }

  // Dragging words set along a path slides them along it.
  function slideOnPath(ed, l, p) {
    const track = layerOf(ed, l.on), path = track && R.pathInDoc(track);
    if (!path) return;
    const hit = V.nearest([path[0]], p);
    if (!hit) return;
    const samp = V.sampler(path[0]);
    // Distance along the outline to the nearest point: walk to it by segment.
    const segs = V.segs(path[0]);
    let s = 0;
    for (let i = 0; i < hit.seg; i++) s += V.sampler({ closed: false, nodes: segs[i] }).len;
    s += V.sampler({ closed: false, nodes: [segs[hit.seg][0], segs[hit.seg][1]] }).len * hit.t;
    const width = l.w, len = samp.len || 1;
    const start = s - width / 2;
    l.align = "left";
    l.offset = r2(Math.max(0, Math.min(100, ((start % len) + len) % len / len * 100)));
  }

  /* ── the node tool ────────────────────────────────────── */
  function nodeDown(ed, H, e, p, pre) {
    const st = ed.st, l = one(ed);
    if (l && DRAWN.includes(l.type) && !l.locked) {
      const path = nodesOf(l);
      const r = st.cv.getBoundingClientRect(), vx = e.clientX - r.left, vy = e.clientY - r.top;
      const at = (x, y) => st.toView(...Object.values(toDoc(l, x, y)));
      const near = (v) => Math.hypot(v.x - vx, v.y - vy) <= HIT;
      // Handles of the chosen node first, then any anchor.
      if (ed.node && path[ed.node.si] && path[ed.node.si].nodes[ed.node.ni]) {
        const n = path[ed.node.si].nodes[ed.node.ni];
        for (const side of ["in", "out"]) {
          const hx = side === "in" ? n.ix : n.ox, hy = side === "in" ? n.iy : n.oy;
          if (Math.hypot(hx - n.x, hy - n.y) > 0.01 && near(at(hx, hy))) { ed.drag = { mode: "handle", pre, side, path, alt: e.altKey, frame: frameOf(l) }; return; }
        }
      }
      for (let si = 0; si < path.length; si++) for (let ni = 0; ni < path[si].nodes.length; ni++) {
        const n = path[si].nodes[ni];
        if (near(at(n.x, n.y))) { ed.node = { si, ni }; ed.drag = { mode: "node", pre, path, from: p, start: Object.assign({}, n), frame: frameOf(l) }; draw(ed); paintOpts(ed, H); return; }
      }
      // On the outline: a new point there.
      const loc = D.toLocal(l, p.x, p.y);
      const hit = V.nearest(path, loc);
      if (hit && hit.dist * st.zoom <= HIT) {
        const more = V.insert(path, hit.si, hit.seg, hit.t), frame = frameOf(l);
        setNodes(l, more);
        ed.node = { si: hit.si, ni: hit.seg + 1 };
        H.sound("pick");
        ed.drag = { mode: "node", pre, path: more, from: p, start: Object.assign({}, more[hit.si].nodes[hit.seg + 1]), frame };
        draw(ed);
        return;
      }
    }
    const hit = D.hitTest(ed.doc, p.x, p.y);
    select(ed, hit ? [hit.id] : []);
    ed.node = null;
    if (hit && !DRAWN.includes(hit.type)) H.status(ed, "Only shapes and paths have points. Double-click type to edit its words.");
    render(ed, H, {});
  }

  const frameOf = (l) => ({ x: l.x, y: l.y, w: l.w, h: l.h, rot: l.rot });

  // The path the drag started with, in the frame it started in: every move
  // edits that, so the layer's frame can follow the new bounds as it goes.
  function nodeMove(ed, H, e, p) {
    const d = ed.drag, l = one(ed);
    if (!l || !ed.node) return;
    Object.assign(l, d.frame);
    const path = V.copy(d.path);
    const n = path[ed.node.si].nodes[ed.node.ni];
    const loc = D.toLocal(l, p.x, p.y);
    if (d.mode === "node") {
      // Snap the anchor in document space, then move it and its handles.
      const q = snapPoint(ed, p, e, []);
      const lq = D.toLocal(l, q.x, q.y);
      const s = d.start, dx = lq.x - s.x, dy = lq.y - s.y;
      Object.assign(n, { x: s.x + dx, y: s.y + dy, ix: s.ix + dx, iy: s.iy + dy, ox: s.ox + dx, oy: s.oy + dy });
    } else {
      const m = V.dragHandle(e.altKey || d.alt ? Object.assign({}, n, { k: "corner" }) : n, d.side, loc.x, loc.y);
      Object.assign(n, m);
      if (e.altKey || d.alt) n.k = "corner";
    }
    setNodes(l, path);
    reflow(ed);
    draw(ed);
  }
  function nodeUp(ed) { const l = one(ed); if (l) D.update(ed.doc, l.id, {}); }

  function toggleNodeKind(ed, H) {
    const l = one(ed);
    if (!l || !ed.node) return;
    const pre = JSON.stringify(ed.doc);
    const path = nodesOf(l), s = path[ed.node.si], n = s && s.nodes[ed.node.ni];
    if (!n) return;
    const flat = Math.hypot(n.ix - n.x, n.iy - n.y) < 0.01 && Math.hypot(n.ox - n.x, n.oy - n.y) < 0.01;
    if (flat) {
      // Corner to smooth: handles along the line through its neighbours.
      const prev = s.nodes[(ed.node.ni - 1 + s.nodes.length) % s.nodes.length], next = s.nodes[(ed.node.ni + 1) % s.nodes.length];
      const dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1;
      const k = Math.min(Math.hypot(n.x - prev.x, n.y - prev.y), Math.hypot(next.x - n.x, next.y - n.y)) / 3;
      Object.assign(n, { ix: n.x - dx / len * k, iy: n.y - dy / len * k, ox: n.x + dx / len * k, oy: n.y + dy / len * k, k: "smooth" });
    } else Object.assign(n, { ix: n.x, iy: n.y, ox: n.x, oy: n.y, k: "corner" });
    setNodes(l, path);
    D.update(ed.doc, l.id, {});
    H.record(ed, pre);
    H.sound("pick");
    render(ed, H, {});
  }

  function removeNode(ed, H) {
    const l = one(ed);
    if (!l || !ed.node) return false;
    const pre = JSON.stringify(ed.doc);
    const path = V.remove(nodesOf(l), ed.node.si, ed.node.ni);
    if (!path.length) { D.remove(ed.doc, l.id); select(ed, []); }
    else setNodes(l, path);
    ed.node = null;
    H.record(ed, pre);
    render(ed, H, {});
    return true;
  }

  /* ── the pen ──────────────────────────────────────────── */
  function finishPen(ed, H, quiet, close) {
    const pen = ed.pen;
    ed.pen = null;
    if (pen) pen.nodes = pen.nodes.filter((n, i, a) => !i || Math.hypot(n.x - a[i - 1].x, n.y - a[i - 1].y) > 0.5);
    if (!pen || pen.nodes.length < 2) { if (!quiet) draw(ed); return; }
    const path = [{ closed: !!close, nodes: pen.nodes }];
    const f = V.fit(path, 64);
    const pre = JSON.stringify(ed.doc);
    const l = D.add(ed.doc, D.layer("path", {
      name: close ? "Shape" : "Line", d: f.d, box: 64, x: r2(f.x), y: r2(f.y), w: r2(f.w), h: r2(f.h),
      fill: close ? ed.fill : null, stroke: close ? (ed.strokeW > 0 ? ed.stroke : null) : ed.stroke || ed.fill || "#14110E",
      strokeW: close ? ed.strokeW : Math.max(2, ed.strokeW),
    }));
    if (!l) return;
    if (f.w < 1) l.w = 1;
    if (f.h < 1) l.h = 1;
    select(ed, [l.id]);
    if (quiet) { H.record(ed, pre); return; }
    H.record(ed, pre);
    H.sound("layer");
    H.status(ed, close ? "Closed. Double-click it to edit its points." : "An open line. Click it with the Type tool to write along it.");
    render(ed, H, {});
  }

  /* ── the shape builder ────────────────────────────────── */
  function crossAt(ed, p) {
    const d = ed.drag;
    for (let i = ed.doc.layers.length - 1; i >= 0; i--) {
      const l = ed.doc.layers[i];
      if (l.hidden || l.locked || !DRAWN.includes(l.type)) continue;
      if (D.contains(l, p.x, p.y)) { if (!d.crossed.includes(l.id)) d.crossed.push(l.id); return; }
    }
  }

  /* Merge: every shape the stroke crossed becomes one path. Cut (alt): the
   * topmost crossed shape is punched out of the others. Both work on masks at
   * twice the document's resolution (a mirror is part of its layer), then
   * trace back to vector paths that keep their holes. */
  function buildShapes(ed, H, ids, cut, pre) {
    const doc = ed.doc;
    const layers = ids.map((id) => layerOf(ed, id)).filter(Boolean);
    if (layers.length < 2 && !(layers.length === 1 && layers[0].mirror)) {
      draw(ed);
      H.status(ed, cut ? "Alt-drag from a shape across the ones it should cut." : "Drag across two or more overlapping shapes to merge them.");
      return;
    }
    const S = 2;
    const b = boxOf(layers.flatMap((l) => mirrorBoxes(l)));
    const bx = Math.floor(b.x) - 1, by = Math.floor(b.y) - 1, bw = Math.ceil(b.x + b.w) + 1 - bx, bh = Math.ceil(b.y + b.h) + 1 - by;
    const maskOf = (l) => R.layerMask(l, bw, bh, S, bx, by, doc);
    const toLayer = (mask, w, h, like, name) => {
      const loops = Sh.contours(mask, w, h).map((lp) => Sh.simplify(lp, 0.6)).filter((lp) => lp.length >= 3);
      if (!loops.length) return null;
      const tp = Sh.toPath(loops, 64);
      return D.layer("path", {
        name, d: tp.d, box: 64, fillRule: "evenodd",
        x: r2(bx + tp.bounds.x / S), y: r2(by + tp.bounds.y / S), w: Math.max(1, tp.bounds.w / S), h: Math.max(1, tp.bounds.h / S),
        fill: like.fill, stroke: like.stroke, strokeW: like.strokeW, opacity: like.opacity, card: like.card, cards: like.cards,
      });
    };
    if (!cut) {
      const ms = layers.map(maskOf);
      const merged = ms.slice(1).reduce((m, x) => Sh.union(m, x.mask), ms[0].mask);
      const at = Math.min(...layers.map((l) => doc.layers.indexOf(l)));
      const made = toLayer(merged, ms[0].w, ms[0].h, layers[0], layers.length > 1 ? "Merged shape" : layers[0].name);
      if (!made) return;
      doc.layers = doc.layers.filter((l) => !ids.includes(l.id));
      doc.layers.splice(Math.min(at, doc.layers.length), 0, made);
      select(ed, [made.id]);
    } else {
      const top = layers.reduce((a, c) => (doc.layers.indexOf(c) > doc.layers.indexOf(a) ? c : a));
      const knife = maskOf(top);
      for (const l of layers) {
        if (l === top) continue;
        const m = maskOf(l);
        const left = Sh.cut(m.mask, knife.mask);
        const i = doc.layers.indexOf(l);
        const made = Sh.count(left) ? toLayer(left, m.w, m.h, l, l.name) : null;
        if (made) doc.layers.splice(i, 1, made); else doc.layers.splice(i, 1);
      }
      doc.layers = doc.layers.filter((l) => l !== top);
      select(ed, []);
    }
    H.record(ed, pre);
    H.sound("layer");
    render(ed, H, {});
    H.status(ed, cut ? "Cut." : layers.length > 1 ? "Merged " + layers.length + " shapes into one." : "Mirror merged into the shape.");
  }

  // A layer and its reflections, as layer-like boxes (for bounds).
  function mirrorBoxes(l) {
    const out = [l], m = l.mirror;
    if (!m) return out;
    const flip = (vx, vy) => Object.assign({}, l, { x: vx != null ? 2 * vx - l.x - l.w : l.x, y: vy != null ? 2 * vy - l.y - l.h : l.y, rot: (vx != null) !== (vy != null) ? -(l.rot || 0) : l.rot });
    if (m.v != null) out.push(flip(m.v, null));
    if (m.h != null) out.push(flip(null, m.h));
    if (m.v != null && m.h != null) out.push(flip(m.v, m.h));
    return out;
  }

  // Merging a path's mirror exactly: its reflections become more of the same
  // path, walked the right way round so the overlap stays filled.
  function mergeMirror(ed, H) {
    const pre = JSON.stringify(ed.doc);
    let done = 0;
    for (const l of chosen(ed)) {
      if (!l.mirror || !DRAWN.includes(l.type)) continue;
      const path = R.pathInDoc(l);
      if (!path) continue;
      const m = l.mirror, all = path.slice();
      const refl = (fx, fy) => V.transform(path, (x, y) => ({ x: fx != null ? 2 * fx - x : x, y: fy != null ? 2 * fy - y : y }));
      if (m.v != null) all.push(...refl(m.v, null).map(V.reverse));
      if (m.h != null) all.push(...refl(null, m.h).map(V.reverse));
      if (m.v != null && m.h != null) all.push(...refl(m.v, m.h));
      const f = V.fit(all, 64);
      Object.assign(l, { type: "path", d: f.d, box: 64, x: r2(f.x), y: r2(f.y), w: r2(f.w), h: r2(f.h), rot: 0, mirror: null, fillRule: "nonzero" });
      delete l.radius; delete l.sides; delete l.inner;
      D.update(ed.doc, l.id, {});
      done++;
    }
    if (!done) { H.status(ed, "Only shapes and paths can merge their mirror. Type and pictures stay mirrored."); return; }
    H.record(ed, pre);
    H.sound("layer");
    render(ed, H, {});
    H.status(ed, "Mirror merged: one shape now, both halves editable.");
  }

  function flip(ed, H, axis) {
    const pre = JSON.stringify(ed.doc);
    for (const l of chosen(ed)) {
      if (!DRAWN.includes(l.type)) continue;
      const path = V.transform(nodesOf(l), (x, y) => ({ x: axis === "h" ? l.w - x : x, y: axis === "v" ? l.h - y : y })).map(V.reverse);
      setNodes(l, path);
      D.update(ed.doc, l.id, {});
    }
    H.record(ed, pre);
    render(ed, H, {});
  }

  /* ── type, edited where it sits ───────────────────────── */
  function wireText(ed, H) {
    const el = ed.editEl;
    el.addEventListener("input", () => {
      const l = ed.editing && layerOf(ed, ed.editing.id);
      if (!l) return;
      l.text = el.value.slice(0, D.MAX.text) || " ";
      fitText(ed, l);
      placeEditor(ed, l);
      draw(ed);
    });
    el.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); endText(ed, H); render(ed, H, {}); }
    });
    el.addEventListener("blur", () => { if (!el.isConnected) return; endText(ed, H); render(ed, H, {}); });
  }

  function startText(ed, H, l, selectAll) {
    endText(ed, H);
    const float = !!(l.on || Math.abs(l.bend || 0) >= 0.5 || l.rot);
    ed.editing = { id: l.id, pre: JSON.stringify(ed.doc), float };
    const el = ed.editEl;
    el.value = l.text;
    el.hidden = false;
    el.classList.toggle("sx__edit--float", float);
    placeEditor(ed, l);
    draw(ed);
    requestAnimationFrame(() => { el.focus(); if (selectAll) el.select(); else el.select(); });
  }

  function placeEditor(ed, l) {
    const el = ed.editEl, st = ed.st, z = st.zoom;
    const p = st.toView(l.x, l.y);
    if (ed.editing && ed.editing.float) {
      Object.assign(el.style, { left: Math.max(4, Math.min(st.w - 244, p.x)) + "px", top: Math.max(4, p.y - 64) + "px", width: "240px", height: "54px",
        font: "", letterSpacing: "", lineHeight: "", color: "", textAlign: "left", transform: "" });
      return;
    }
    const colour = typeof l.fill === "string" ? l.fill : l.fill && l.fill.a ? l.fill.a : "#0A0A0A";
    Object.assign(el.style, {
      left: p.x + "px", top: p.y + "px", width: Math.max(40, (l.w + l.size * 0.6) * z) + "px", height: Math.max(20, l.h * z + 4) + "px",
      font: (l.style === "italic" ? "italic " : "") + l.weight + " " + l.size * z + "px \"" + l.font + "\", Archivo, sans-serif",
      letterSpacing: (l.track || 0) * z + "px", lineHeight: l.size * 1.15 * z + "px", color: colour, textAlign: l.align,
      transform: "",
    });
  }

  function endText(ed, H) {
    const e = ed.editing;
    if (!e) return;
    ed.editing = null;
    const el = ed.editEl;
    el.hidden = true;
    const l = layerOf(ed, e.id);
    if (l && !String(l.text).trim()) { D.remove(ed.doc, l.id); select(ed, []); }
    else if (l) { D.update(ed.doc, l.id, {}); fitText(ed, layerOf(ed, e.id)); }
    H.record(ed, e.pre);
  }

  /* ── card drops ───────────────────────────────────────── */
  function wireDrop(ed, H) {
    const v = ed.st.view;
    v.addEventListener("dragover", (e) => {
      if (e.target.closest && e.target.closest(".dw")) return;
      const t = e.dataTransfer.types;
      if (t.includes("text/x-pxcard") || t.includes("text/x-pxpin")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
    });
    v.addEventListener("drop", (e) => {
      if (e.target.closest && e.target.closest(".dw")) return;
      const p = ed.st.toDoc(e);
      const pin = e.dataTransfer.getData("text/x-pxpin");
      if (pin) { e.preventDefault(); H.dropPin(ed, pin, p); return; }
      const id = e.dataTransfer.getData("text/x-pxcard");
      if (!id) return;
      e.preventDefault();
      dropCard(ed, H, H.card(id), p, e.shiftKey);
    });
  }

  function dropCard(ed, H, c, at, shift) {
    if (!c) return;
    endText(ed, H);
    if (c.kind === "colour") { ed.fill = shift ? ed.fill : c.value; if (shift) ed.stroke = c.value; }
    const target = at ? D.hitTest(ed.doc, at.x, at.y) : one(ed);
    const res = H.mutate(ed, () => (target
      ? SuiteCards.applyToLayer(ed.doc, target.id, c, { stroke: shift })
      : SuiteCards.applyToCanvas(ed.doc, c, at || { x: ed.doc.w / 2, y: ed.doc.h / 2 })), { quiet: true });
    if (res.layer) select(ed, [res.layer.id]);
    const l = one(ed);
    if (l && l.type === "text") fitText(ed, l);
    H.sound("drop");
    render(ed, H, {});
    H.status(ed, res.ok ? c.label + ": " + res.what : res.reason);
  }

  function placeSrc(ed, H, src, name, at) {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, (ed.doc.w * 0.6) / img.naturalWidth, (ed.doc.h * 0.8) / img.naturalHeight);
      const w = Math.max(4, Math.round(img.naturalWidth * k)), h = Math.max(4, Math.round(img.naturalHeight * k));
      const p = at || { x: ed.doc.w / 2, y: ed.doc.h / 2 };
      H.mutate(ed, () => {
        const l = D.add(ed.doc, D.layer("image", { name: String(name || "Picture").slice(0, 40), src, x: Math.round(p.x - w / 2), y: Math.round(p.y - h / 2), w, h }));
        if (l) select(ed, [l.id]);
      });
      ed.tool = "select";
      H.sound("drop");
      render(ed, H, {});
    };
    img.src = src;
  }

  function sampleDoc(doc, x, y) {
    if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return null;
    const cv = document.createElement("canvas");
    cv.width = doc.w; cv.height = doc.h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    R.draw(ctx, doc, { checker: false });
    const [r, g, b, a] = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (a < 128) return null;
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  /* ── guides ───────────────────────────────────────────── */
  function guideDrag(ed, H, axis, v, index, done, inside) {
    if (!done) { ed.ghost = inside ? { axis, v } : null; draw(ed); return; }
    ed.ghost = null;
    if (!inside) { draw(ed); return; }
    const pre = JSON.stringify(ed.doc);
    ed.doc.guides = G.put(ed.doc.guides || { v: [], h: [] }, axis, v);
    H.record(ed, pre);
    H.sound("pick");
    const f = ed.st.focus();
    render(ed, H, { panels: false });
    paintOpts(ed, H);
    if (f && ed.grid) H.status(ed, "Focus grid: " + Math.round(f.px) + " × " + Math.round(f.py) + (f.nx > 1 || f.ny > 1 ? ", your box split " + f.nx + " × " + f.ny : "") + ". Shapes and points snap to it.");
  }

  /* ── keys ─────────────────────────────────────────────── */
  function setTool(ed, H, t) {
    if (ed.tool === "pen" && t !== "pen") finishPen(ed, H);
    if (SHAPES[t]) { ed.shape = t; t = "shape"; }
    ed.tool = t;
    ed.st.handTool = t === "hand";
    if (t !== "node") ed.node = null;
    H.sound("tool");
    render(ed, H, {});
  }

  function onKey(ed, H, e) {
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (e.key === " " && !e.repeat) { ed.st.spaceDown = true; ed.st.host.classList.add("is-space"); const up = (ev) => { if (ev.key === " ") { ed.st.spaceDown = false; ed.st.host.classList.remove("is-space"); document.removeEventListener("keyup", up); } }; document.addEventListener("keyup", up); return true; }
    if (mod && k === "a") { select(ed, ed.doc.layers.filter((l) => !l.hidden && !l.locked).map((l) => l.id)); render(ed, H, {}); return true; }
    if (mod && k === "d" && ed.sel.length) {
      H.mutate(ed, () => { const ids = []; for (const l of chosen(ed)) { const c = D.duplicate(ed.doc, l.id); if (c) ids.push(c.id); } select(ed, ids); });
      return true;
    }
    if ((e.key === "Delete" || e.key === "Backspace")) {
      if (ed.tool === "node" && ed.node) return removeNode(ed, H);
      if (!ed.sel.length) return false;
      H.mutate(ed, () => { for (const id of ed.sel) D.remove(ed.doc, id); select(ed, []); });
      H.sound("close");
      return true;
    }
    if (e.key === "Enter") {
      if (ed.pen && ed.pen.nodes.length > 1) { finishPen(ed, H); return true; }
      const l = one(ed);
      if (l && l.type === "text") { startText(ed, H, l, true); return true; }
      return false;
    }
    if (e.key.startsWith("Arrow") && ed.sel.length) {
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      H.mutate(ed, () => { for (const l of chosen(ed)) if (!l.locked) { l.x += dx; l.y += dy; } }, { panels: true });
      return true;
    }
    if (e.key === "[" || e.key === "]") {
      const where = e.key === "]" ? (e.shiftKey ? "top" : "up") : e.shiftKey ? "bottom" : "down";
      H.mutate(ed, () => { for (const l of chosen(ed)) D.restack(ed.doc, l.id, where); });
      H.sound("layer");
      return true;
    }
    if (mod || e.altKey) return false;
    if (k === "'" ) { ed.grid = !ed.grid; render(ed, H, {}); return true; }
    if (k === "x") { const f = ed.fill; ed.fill = ed.stroke; ed.stroke = f; paintOpts(ed, H); return true; }
    const t = TOOLS.find((x) => x.key === k) || null;
    const s = Object.keys(SHAPES).find((id) => SHAPES[id].key === k);
    if (t) { setTool(ed, H, t.id); return true; }
    if (s) { setTool(ed, H, s); return true; }
    return false;
  }

  function escape(ed, H) {
    if (ed.editing) { endText(ed, H); render(ed, H, {}); return true; }
    if (ed.pen) { if (ed.pen.nodes.length > 1) finishPen(ed, H); else { ed.pen = null; draw(ed); } return true; }
    if (ed.node) { ed.node = null; draw(ed); return true; }
    if (ed.tool !== "select") { setTool(ed, H, "select"); return true; }
    if (ed.sel.length) { select(ed, []); render(ed, H, {}); return true; }
    return false;
  }

  /* ── the rail ─────────────────────────────────────────── */
  function paintRail(ed, H) {
    const btn = (id, icon, label, key, on) =>
      '<button class="sx__tool' + (on ? " on" : "") + '" data-tool="' + id + '" title="' + esc(label + (key ? " (" + key.toUpperCase() + ")" : "")) + '" aria-pressed="' + on + '">' + iconSVG(icon, 16) + "</button>";
    const s = SHAPES[ed.shape];
    ed.rail.innerHTML = TOOLS.map((t) => t.flyout
      ? '<div class="sx__fly">' + btn(ed.shape, s.icon, s.label, s.key, ed.tool === "shape") + '<button class="sx__flyk" data-flyout title="More shapes" aria-haspopup="true">' + "</button>" +
        (ed.flyOpen ? '<div class="sx__flym" role="menu">' + Object.entries(SHAPES).map(([id, x]) => btn(id, x.icon, x.label, x.key, ed.tool === "shape" && ed.shape === id)).join("") + "</div>" : "") + "</div>"
      : btn(t.id, t.icon, t.label, t.key, ed.tool === t.id)).join("") +
      '<span class="sx__rsep"></span>' + H.drawerButtons(ed);
  }

  /* ── the layers panel ─────────────────────────────────── */
  function paintLayers(ed, H) {
    const el = ed.layersEl;
    const doc = ed.doc;
    const n = doc.layers.length;
    ed.body.querySelector(".sx__lyn").textContent = n ? String(n) : "";
    if (!n) { el.innerHTML = '<p class="sx__hint">No layers yet. Draw something, or drop a card.</p>'; paintLayerFoot(ed, H); return; }
    el.innerHTML = doc.layers.slice().reverse().map((l) => {
      const on = ed.sel.includes(l.id);
      const name = l.type === "text" ? "“" + String(l.text).slice(0, 22) + "”" : l.type === "subject" ? l.label : l.name;
      return '<div class="sx__ly' + (on ? " on" : "") + (l.hidden ? " off" : "") + '" data-layer="' + l.id + '" role="option" aria-selected="' + on + '" draggable="false">' +
        '<button class="sx__lb" data-eye="' + l.id + '" title="' + (l.hidden ? "Show" : "Hide") + '">' + iconSVG(l.hidden ? "eye-off" : "eye", 16) + "</button>" +
        '<button class="sx__lb" data-lock="' + l.id + '" title="' + (l.locked ? "Unlock" : "Lock") + '">' + iconSVG(l.locked ? "lock" : "unlock", 16) + "</button>" +
        '<canvas class="sx__th" width="44" height="44" data-th="' + l.id + '"></canvas>' +
        '<span class="sx__ln" title="Double-click to rename">' + esc(name) + "</span>" +
        (l.mirror ? '<em class="sx__lbadge" title="Mirrored">' + iconSVG("mirror", 16) + "</em>" : "") +
        (l.type === "text" && l.on ? '<em class="sx__lbadge" title="Set along a path">' + iconSVG("t-textpath", 16) + "</em>" : "") +
        (l.card ? '<em class="sx__lcard" title="Made with a card">◆</em>' : "") + "</div>";
    }).join("");
    // Thumbnails: each layer on its own, fitted to its tile.
    el.querySelectorAll("[data-th]").forEach((c) => {
      const l = layerOf(ed, c.dataset.th);
      if (!l) return;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, 44, 44);
      const b = boxOf([l]) || { x: 0, y: 0, w: 1, h: 1 };
      const k = Math.min(36 / Math.max(1, b.w), 36 / Math.max(1, b.h));
      ctx.save();
      ctx.translate(22 - (b.x + b.w / 2) * k, 22 - (b.y + b.h / 2) * k);
      ctx.scale(k, k);
      R.drawLayer(ctx, Object.assign({}, l, { hidden: false, mirror: null, on: null }), { editor: true, zoom: k, doc: ed.doc });
      ctx.restore();
    });
    paintLayerFoot(ed, H);
  }

  function paintLayerFoot(ed) {
    const any = ed.sel.length > 0, pathy = chosen(ed).some((l) => DRAWN.includes(l.type));
    const b = (act, icon, label, off) => '<button class="sx__ib" data-act="' + act + '" title="' + esc(label) + '"' + (off ? " disabled" : "") + ">" + iconSVG(icon, 16) + "</button>";
    ed.body.querySelector(".sx__pf").innerHTML =
      b("dup", "l-dup", "Duplicate (Cmd+D)", !any) + b("up", "l-up", "Bring forward (])", !any) + b("down", "l-down", "Send backward ([)", !any) +
      b("merge", "t-build", "Merge the selected shapes into one", !(ed.sel.length > 1 && pathy)) +
      b("del", "l-del", "Delete (Del)", !any);
  }

  function paintXf(ed) {
    const el = ed.xfEl;
    if (el.contains(document.activeElement)) return;
    const ls = chosen(ed);
    if (!ls.length) { el.innerHTML = '<p class="sx__hint">' + ed.doc.w + " × " + ed.doc.h + " · nothing selected</p>"; return; }
    const b = ls.length === 1 ? ls[0] : boxOf(ls);
    const n = (p, v, label, dis) => '<label class="sx__f"><span>' + label + '</span><input type="number" step="1" data-xf="' + p + '" value="' + r2(v) + '"' + (dis ? " disabled" : "") + "></label>";
    el.innerHTML = '<div class="sx__row">' + n("x", b.x, "X") + n("y", b.y, "Y") + n("w", b.w, "W") + n("h", b.h, "H") + "</div>" +
      (ls.length === 1 ? '<div class="sx__row">' + n("rot", ls[0].rot || 0, "ROTATE°", ls[0].type === "text" && ls[0].on) +
        '<label class="sx__f sx__f--2"><span>OPACITY</span><input type="range" min="0" max="100" data-xf="opacity" value="' + Math.round(ls[0].opacity * 100) + '"></label></div>' : "");
  }

  /* ── the options strip ────────────────────────────────── */
  const well = (key, colour, label) => '<label class="sx__well" title="' + esc(label) + '"><input type="color" data-o="' + key + '" value="' + (typeof colour === "string" ? colour.toLowerCase() : colour && colour.a ? colour.a.toLowerCase() : "#000000") + '">' +
    '<i class="' + (colour ? "" : "none") + '" style="background:' + (typeof colour === "string" ? colour : colour && colour.a ? "linear-gradient(90deg," + colour.a + "," + colour.b + ")" : "transparent") + '"></i></label>';
  const ib = (o, icon, label, on, off) => '<button class="sx__ib' + (on ? " on" : "") + '" data-o="' + o + '" title="' + esc(label) + '" aria-pressed="' + !!on + '"' + (off ? " disabled" : "") + ">" + iconSVG(icon, 16) + "</button>";
  const num = (o, v, label, min, max, step = 1, w = 44) => '<label class="sx__num" title="' + esc(label) + '"><span>' + esc(label) + '</span><input type="number" data-o="' + o + '" value="' + r2(v) + '" min="' + min + '" max="' + max + '" step="' + step + '" style="width:' + w + 'px"></label>';
  const slide = (o, v, label, min, max) => '<label class="sx__slide" title="' + esc(label) + '"><span>' + esc(label) + '</span><input type="range" data-o="' + o + '" value="' + v + '" min="' + min + '" max="' + max + '"><b>' + Math.round(v) + "</b></label>";
  const sep = '<span class="sx__osep"></span>';

  function paintOpts(ed, H) {
    const el = ed.opts;
    if (el.contains(document.activeElement) && document.activeElement.tagName === "INPUT" && document.activeElement.type !== "color") return;
    const ls = chosen(ed), l = ls.length === 1 ? ls[0] : null;
    const tool = ed.tool;
    let h = "";
    // Paint: the selection's, or what the next shape gets.
    const fillOf = ls.length ? ls[0].fill : ed.fill, strokeOf = ls.length ? ls[0].stroke : ed.stroke, swOf = ls.length ? ls[0].strokeW : ed.strokeW;
    const painted = ls.length ? ls.some((x) => x.type !== "image" && x.type !== "subject") : ["shape", "pen", "text", "select"].includes(tool);
    if (painted) {
      h += '<span class="sx__olab">FILL</span>' + well("fill", fillOf, "Fill colour") + ib("nofill", "none", "No fill", !fillOf) +
        '<span class="sx__olab">STROKE</span>' + well("stroke", swOf > 0 ? strokeOf : null, "Stroke colour") +
        num("strokeW", swOf || 0, "W", 0, 200, 1, 40) + sep;
    }
    const textL = l && l.type === "text" ? l : null;
    if (textL || tool === "text") h += typeOpts(ed, H, textL) + sep;
    if ((l && l.type === "rect") || (tool === "shape" && ed.shape === "rect")) h += num("radius", l ? l.radius || 0 : ed.radius, "CORNER", 0, 2000, 1, 44) + sep;
    if ((l && l.type === "polygon") || (tool === "shape" && ed.shape === "polygon")) {
      const star = l ? l.inner != null : ed.star;
      h += num("sides", l ? l.sides : ed.sides, star ? "POINTS" : "SIDES", 3, 24, 1, 36) + ib("star", "t-star", "Star", star) +
        (star ? slide("inner", Math.round((l ? l.inner : ed.inner) * 100), "DEPTH", 5, 98) : "") + sep;
    }
    if (ls.length) {
      const mv = ls.every((x) => x.mirror && x.mirror.v != null), mh = ls.every((x) => x.mirror && x.mirror.h != null);
      h += ib("mirv", "mirror", "Mirror across a vertical line (drag the diamond to move it)", mv) + ib("mirh", "mirror-h", "Mirror across a horizontal line", mh) +
        (ls.some((x) => x.mirror) ? '<button class="sx__tb" data-o="mirmerge" title="Make the mirror part of the shape">Merge</button>' : "") +
        ib("fliph", "flip-h", "Flip left to right", false, !ls.some((x) => DRAWN.includes(x.type))) + ib("flipv", "flip-v", "Flip top to bottom", false, !ls.some((x) => DRAWN.includes(x.type))) + sep;
      if (ed.bonus.includes("align")) h += ["left", "hcenter", "right", "top", "vcenter", "bottom"].map((a) => ib("al:" + a, "al-" + a, "Align " + a + (ls.length > 1 ? " (to each other)" : " (to the artboard)"))).join("") + sep;
    }
    if (tool === "node") h += nodeOpts(ed) + sep;
    if (tool === "pen") h += '<span class="sx__ohint">Click: corner · drag: curve · Alt: break the handle · click the first point to close · Enter: an open line</span>';
    if (tool === "build") h += '<span class="sx__ohint">Drag across shapes to merge them · Alt-drag to cut the top one out</span>';
    if (tool === "eyedrop") h += '<span class="sx__ohint">Click the work to take a colour · Shift: into the stroke</span>';
    if (tool === "hand") h += '<span class="sx__ohint">Drag to move around · ⌘-scroll or pinch to zoom</span>';
    if (!ls.length && tool === "select") {
      const doc = ed.doc;
      h += '<span class="sx__olab">BOARD</span>' + well("bg", doc.bg || "#FFFFFF", "Background") + ib("nobg", "none", "No background (transparent)", !doc.bg) + sep;
    }
    h += '<span class="sx__ospace"></span><span class="sx__pal">' + ed.doc.palette.map((c) => '<button class="sx__chip" data-pal="' + c + '" style="background:' + c + '" title="' + c + ': click for fill, Shift-click for stroke, Alt-click to remove"></button>').join("") +
      '<button class="sx__chip sx__chip--add" data-o="addpal" title="Add the fill colour to the palette">+</button></span>';
    el.innerHTML = h;
    // Guides and the grid are how you see the board, so they sit by the zoom.
    const f = ed.st.focus(), vb = (o, icon, label, on, off) => ib(o, icon, label, on, off).replace('data-o="', 'data-v="');
    H.viewBar(ed, vb("grid", "grid", f ? "Focus grid: " + Math.round(f.px) + " × " + Math.round(f.py) + " modules (')" : "Focus grid: pull two guides down and two across to make one", ed.grid && !!f, !f) +
      vb("smart", "smart", "Smart guides: line up with the board and the other layers", ed.smartOn) +
      (ed.bonus.includes("snap") ? vb("snap", "snap", "Snap to a 10 px grid", !!ed.snap) : "") +
      vb("clearguides", "guides-x", "Clear all guides", false, !(ed.doc.guides && (ed.doc.guides.v.length || ed.doc.guides.h.length))));
    paintFontMenu(ed, H, textL);
  }

  // The typeface menu opens from its button, over everything else.
  function paintFontMenu(ed, H, l) {
    const old = ed.body.querySelector(":scope > .sx__fm");
    if (!ed.fontMenu) { if (old) old.remove(); return; }
    const btn = ed.opts.querySelector('[data-o="fontmenu"]');
    if (!btn) { ed.fontMenu = false; if (old) old.remove(); return; }
    const wrap = document.createElement("div");
    wrap.innerHTML = fontMenu(ed, H, l ? l.font : ed.font || "Archivo", l);
    const fm = wrap.firstChild;
    const b = btn.getBoundingClientRect(), hb = ed.body.getBoundingClientRect();
    fm.style.left = Math.max(4, b.left - hb.left) + "px";
    fm.style.top = b.bottom - hb.top + 3 + "px";
    if (old) { fm.scrollTop = old.scrollTop; old.replaceWith(fm); fm.style.animation = "none"; } else ed.body.appendChild(fm);
  }

  function typeOpts(ed, H, l) {
    const font = l ? l.font : ed.font || "Archivo";
    const info = A.FONTS.find((f) => f.name === font) || { weights: [400, 700], italic: false };
    const weight = l ? l.weight : ed.weight || 700;
    const weights = [...new Set(info.weights.concat([weight]))].sort((a, b) => a - b);
    let h = '<button class="sx__font" data-o="fontmenu" title="Typeface" style="font-family:\'' + esc(font).replace(/'/g, "") + '\',Archivo"><b>' + esc(font) + "</b><i></i></button>" +
      num("size", l ? l.size : ed.fontSize || 64, "SIZE", 4, 800, 1, 46) +
      '<label class="sx__num" title="Weight"><span>WT</span><select data-o="weight">' + weights.map((w) => "<option" + (w === weight ? " selected" : "") + ">" + w + "</option>").join("") + "</select></label>" +
      ib("italic", "t-italic", "Italic", l ? l.style === "italic" : ed.italic) +
      num("track", l ? l.track : ed.track || 0, "TRACK", -20, 100, 0.5, 44);
    if (l) h += ib("al-l", "ta-left", "Align left", l.align === "left") + ib("al-c", "ta-center", "Align centre", l.align === "center") + ib("al-r", "ta-right", "Align right", l.align === "right");
    if (l && !l.on) h += slide("bend", l.bend || 0, "BEND", -100, 100);
    if (l && l.on) h += slide("offset", l.offset || 0, "ALONG", 0, 100) + '<button class="sx__tb" data-o="detach" title="Take the words off the path">Detach</button>';
    return h;
  }

  function fontMenu(ed, H, current, l) {
    const sample = l ? String(l.text).slice(0, 14) : "Aa Qg";
    const fonts = H.fonts();
    const cats = A.FONT_CATS.filter((c) => fonts.some((f) => f.cat === c)).concat(fonts.some((f) => f.cat === "Cards") ? ["Cards"] : []);
    return '<div class="sx__fm" role="listbox" aria-label="Typefaces">' + cats.map((c) => '<div class="sx__fmh">' + c.toUpperCase() + "</div>" +
      fonts.filter((f) => f.cat === c).map((f) => '<button class="sx__fmi' + (f.name === current ? " on" : "") + '" data-font="' + esc(f.name) + '" role="option">' +
        '<span style="font-family:\'' + esc(f.name).replace(/'/g, "") + '\',Archivo;font-weight:' + (f.weights.includes(700) ? 700 : f.weights[f.weights.length - 1]) + '">' + esc(sample) + "</span><em>" + esc(f.name) + "</em></button>").join("")).join("") + "</div>";
  }

  function nodeOpts(ed) {
    const l = one(ed);
    if (!l || !ed.node) return '<span class="sx__ohint">Click a shape to see its points · click its outline to add one · double-click a point to round or sharpen it</span>';
    const path = nodesOf(l), n = path && path[ed.node.si] && path[ed.node.si].nodes[ed.node.ni];
    const k = n ? n.k : "corner";
    return '<span class="sx__olab">POINT</span>' + ib("nk:corner", "n-corner", "Corner", k === "corner") + ib("nk:smooth", "n-smooth", "Smooth", k === "smooth") +
      ib("nk:sym", "n-sym", "Symmetric", k === "sym") + ib("ndel", "l-del", "Remove the point (Del)");
  }

  /* ── panels: clicks, typing, dragging ─────────────────── */
  function wirePanels(ed, H) {
    const body = ed.body;
    let pre = null;
    body.addEventListener("focusin", (e) => { if (e.target.closest(".sx__opts,.sx__xf")) pre = JSON.stringify(ed.doc); });
    const commit = () => { if (pre) { H.record(ed, pre); pre = JSON.stringify(ed.doc); } };

    body.addEventListener("click", (e) => {
      const t = e.target.closest("[data-tool],[data-flyout],[data-o],[data-act],[data-eye],[data-lock],[data-layer],[data-pal],[data-font],[data-drawer]");
      if (!t) { if (ed.fontMenu && !e.target.closest(".sx__fm")) { ed.fontMenu = false; paintOpts(ed, H); } return; }
      if (t.dataset.drawer) { H.toggleDrawer(ed, t.dataset.drawer); return; }
      if (t.dataset.tool) { ed.flyOpen = false; setTool(ed, H, t.dataset.tool); return; }
      if (t.dataset.flyout !== undefined) { ed.flyOpen = !ed.flyOpen; paintRail(ed, H); return; }
      if (t.dataset.font) { const f = t.dataset.font; ed.fontMenu = false; applyText(ed, H, { font: f }); ed.font = f; H.sound("pick"); return; }
      if (t.dataset.eye) { H.mutate(ed, () => { const l = layerOf(ed, t.dataset.eye); if (l) l.hidden = !l.hidden; }); return; }
      if (t.dataset.lock) { H.mutate(ed, () => { const l = layerOf(ed, t.dataset.lock); if (l) l.locked = !l.locked; }); return; }
      if (t.dataset.layer) {
        const id = t.dataset.layer;
        if (e.shiftKey || e.metaKey || e.ctrlKey) select(ed, ed.sel.includes(id) ? ed.sel.filter((x) => x !== id) : ed.sel.concat(id));
        else select(ed, [id]);
        render(ed, H, {});
        return;
      }
      if (t.dataset.pal) {
        const c = t.dataset.pal;
        if (e.altKey) { H.mutate(ed, () => { ed.doc.palette = ed.doc.palette.filter((x) => x !== c); }); return; }
        if (e.shiftKey) { ed.stroke = c; applyAll(ed, H, (l) => ({ stroke: c, strokeW: l.strokeW || 2 })); }
        else { ed.fill = c; applyAll(ed, H, () => ({ fill: c })); }
        paintOpts(ed, H);
        return;
      }
      if (t.dataset.act) return layerAct(ed, H, t.dataset.act);
      optClick(ed, H, t.dataset.o, t, e);
    });

    body.addEventListener("input", (e) => {
      const t = e.target;
      if (t.dataset.o) { if (pre === null) pre = JSON.stringify(ed.doc); optInput(ed, H, t, false); return; }
      if (t.dataset.xf) { if (pre === null) pre = JSON.stringify(ed.doc); xfInput(ed, t); draw(ed); }
    });
    body.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.o) { optInput(ed, H, t, true); commit(); render(ed, H, {}); return; }
      if (t.dataset.xf) { xfInput(ed, t); commit(); render(ed, H, {}); }
    });

    // Rename on double-click.
    body.addEventListener("dblclick", (e) => {
      const n = e.target.closest(".sx__ln");
      if (!n) return;
      const row = n.closest("[data-layer]"), l = row && layerOf(ed, row.dataset.layer);
      if (!l || l.type === "text") return;
      const inp = document.createElement("input");
      inp.className = "sx__rename"; inp.value = l.name; inp.maxLength = 40;
      n.replaceWith(inp); inp.focus(); inp.select();
      const done = (keep) => { if (keep && inp.value.trim()) H.mutate(ed, () => { l.name = inp.value.trim().slice(0, 40); }); else render(ed, H, {}); };
      inp.addEventListener("keydown", (ev) => { ev.stopPropagation(); if (ev.key === "Enter") inp.blur(); if (ev.key === "Escape") { inp.value = ""; inp.blur(); } });
      inp.addEventListener("blur", () => done(true));
    });

    // Drag a row to restack.
    let rowDrag = null;
    ed.layersEl.addEventListener("pointerdown", (e) => {
      const row = e.target.closest("[data-layer]");
      if (!row || e.target.closest("button,input") || e.button !== 0) return;
      rowDrag = { id: row.dataset.layer, y: e.clientY, moved: false, over: null };
    });
    ed.layersEl.addEventListener("pointermove", (e) => {
      if (!rowDrag) return;
      if (!rowDrag.moved && Math.abs(e.clientY - rowDrag.y) < 5) return;
      rowDrag.moved = true;
      ed.layersEl.setPointerCapture(e.pointerId);
      const rows = [...ed.layersEl.querySelectorAll("[data-layer]")];
      rows.forEach((r) => r.classList.remove("drop-above", "drop-below"));
      const r = rows.find((x) => { const b = x.getBoundingClientRect(); return e.clientY >= b.top && e.clientY < b.bottom; });
      if (r && r.dataset.layer !== rowDrag.id) {
        const b = r.getBoundingClientRect(), above = e.clientY < b.top + b.height / 2;
        r.classList.add(above ? "drop-above" : "drop-below");
        rowDrag.over = { id: r.dataset.layer, above };
      } else rowDrag.over = null;
      ed.layersEl.querySelector('[data-layer="' + rowDrag.id + '"]').classList.add("dragging");
    });
    const rowEnd = () => {
      const d = rowDrag;
      rowDrag = null;
      if (!d || !d.moved) return;
      if (d.over) {
        H.mutate(ed, () => {
          const doc = ed.doc, from = doc.layers.findIndex((l) => l.id === d.id);
          const [l] = doc.layers.splice(from, 1);
          let to = doc.layers.findIndex((x) => x.id === d.over.id);
          // The list shows the top layer first: "above" in the list is later in the stack.
          if (d.over.above) to += 1;
          doc.layers.splice(to, 0, l);
        });
        H.sound("layer");
      } else render(ed, H, {});
    };
    ed.layersEl.addEventListener("pointerup", rowEnd);
    ed.layersEl.addEventListener("pointercancel", rowEnd);

    // Font menu: hovering a face shows it on the selection, leaving puts it back.
    body.addEventListener("pointerover", (e) => {
      const f = e.target.closest && e.target.closest("[data-font]");
      if (!f || !ed.fontMenu) return;
      const l = one(ed);
      if (!l || l.type !== "text") return;
      if (!ed.fontPeek) ed.fontPeek = { id: l.id, font: l.font };
      l.font = f.dataset.font; fitText(ed, l); draw(ed);
    });
    body.addEventListener("pointerout", (e) => {
      if (!ed.fontPeek || (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".sx__fm"))) return;
      const l = layerOf(ed, ed.fontPeek.id);
      if (l) { l.font = ed.fontPeek.font; fitText(ed, l); draw(ed); }
      ed.fontPeek = null;
    });
  }

  function applyAll(ed, H, patchOf) {
    const ls = chosen(ed);
    if (!ls.length) return;
    H.mutate(ed, () => { for (const l of ls) { const n = D.update(ed.doc, l.id, patchOf(l)); if (n && n.type === "text") fitText(ed, n); } });
  }
  function applyText(ed, H, patch) {
    const ls = chosen(ed).filter((l) => l.type === "text");
    if (ed.fontPeek) { const l = layerOf(ed, ed.fontPeek.id); if (l) l.font = ed.fontPeek.font; ed.fontPeek = null; }
    if (!ls.length) { Object.assign(ed, patch.font ? { font: patch.font } : {}); render(ed, H, {}); return; }
    H.mutate(ed, () => { for (const l of ls) { const n = D.update(ed.doc, l.id, patch); if (n) fitText(ed, n); } });
  }

  function optClick(ed, H, o, t, e) {
    if (!o) return;
    const ls = chosen(ed);
    if (o === "fontmenu") { ed.fontMenu = !ed.fontMenu; paintOpts(ed, H); return; }
    if (o === "nofill") { if (ls.length) applyAll(ed, H, () => ({ fill: null })); else { ed.fill = null; paintOpts(ed, H); } return; }
    if (o === "nobg") { H.mutate(ed, () => { ed.doc.bg = ed.doc.bg ? null : "#FFFFFF"; }); return; }
    if (o === "italic") { const on = ls.length ? !(ls[0].style === "italic") : !ed.italic; ed.italic = on; applyText(ed, H, { style: on ? "italic" : "normal" }); return; }
    if (o.startsWith("al-")) { applyText(ed, H, { align: { "al-l": "left", "al-c": "center", "al-r": "right" }[o] }); return; }
    if (o === "detach") { applyText(ed, H, { on: null, offset: 0 }); return; }
    if (o === "star") {
      const on = ls.length ? ls[0].inner == null : !ed.star;
      ed.star = on;
      if (ls.length) applyAll(ed, H, (l) => (l.type === "polygon" ? { inner: on ? ed.inner : null } : {}));
      else paintOpts(ed, H);
      return;
    }
    if (o === "mirv" || o === "mirh") {
      const axis = o === "mirv" ? "v" : "h";
      const on = !ls.every((l) => l.mirror && l.mirror[axis] != null);
      H.mutate(ed, () => {
        for (const l of ls) {
          const m = Object.assign({ v: null, h: null }, l.mirror || {});
          m[axis] = on ? (axis === "v" ? ed.doc.w / 2 : ed.doc.h / 2) : null;
          l.mirror = m.v == null && m.h == null ? null : m;
        }
      });
      H.sound(on ? "pick" : "tool");
      if (on) H.status(ed, "Mirrored across the middle of the board. Drag the diamond on the line to move it.");
      return;
    }
    if (o === "mirmerge") { mergeMirror(ed, H); return; }
    if (o === "fliph" || o === "flipv") { flip(ed, H, o === "fliph" ? "h" : "v"); return; }
    if (o.startsWith("al:")) { H.mutate(ed, () => D.align(ed.doc, ed.sel, o.slice(3))); return; }
    if (o.startsWith("nk:")) {
      const l = one(ed);
      if (!l || !ed.node) return;
      const pre = JSON.stringify(ed.doc), path = nodesOf(l), n = path[ed.node.si].nodes[ed.node.ni];
      const flat = Math.hypot(n.ix - n.x, n.iy - n.y) < 0.01 && Math.hypot(n.ox - n.x, n.oy - n.y) < 0.01;
      if (o === "nk:corner") Object.assign(n, { ix: n.x, iy: n.y, ox: n.x, oy: n.y, k: "corner" });
      else if (flat) { setNodes(l, path); toggleNodeKind(ed, H); const p2 = nodesOf(l); p2[ed.node.si].nodes[ed.node.ni].k = o.slice(3); setNodes(l, p2); H.record(ed, pre); render(ed, H, {}); return; }
      else { n.k = o.slice(3); if (n.k === "sym") Object.assign(n, V.dragHandle(n, "out", n.ox, n.oy)); }
      setNodes(l, path);
      H.record(ed, pre);
      render(ed, H, {});
      return;
    }
    if (o === "ndel") { removeNode(ed, H); return; }
    if (o === "grid") { ed.grid = !ed.grid; render(ed, H, {}); return; }
    if (o === "smart") { ed.smartOn = !ed.smartOn; paintOpts(ed, H); return; }
    if (o === "snap") { ed.snap = !ed.snap; paintOpts(ed, H); return; }
    if (o === "clearguides") { H.mutate(ed, () => { ed.doc.guides = { v: [], h: [] }; }); H.status(ed, "Guides cleared."); return; }
    if (o === "addpal") { const c = ls.length && typeof ls[0].fill === "string" ? ls[0].fill : ed.fill; if (c) H.mutate(ed, () => { if (!ed.doc.palette.includes(c)) ed.doc.palette.push(c); }); return; }
    void t; void e;
  }

  // Typing in the strip applies as you go; the change event makes it one undo step.
  function optInput(ed, H, t, final) {
    const o = t.dataset.o, ls = chosen(ed);
    const v = t.type === "number" || t.type === "range" ? Number(t.value) : t.value;
    const colour = t.type === "color" ? t.value.toUpperCase() : null;
    const live = (patchOf) => { for (const l of ls) { const n = D.update(ed.doc, l.id, patchOf(l)); if (n && n.type === "text") fitText(ed, n); } reflow(ed); draw(ed); };
    if (t.type === "range") { const b = t.parentNode.querySelector("b"); if (b) b.textContent = Math.round(v); }
    if (o === "fill") { ed.fill = colour; if (ls.length) live((l) => ({ fill: typeof l.fill === "object" && l.fill ? Object.assign({}, l.fill, { a: colour }) : colour })); }
    else if (o === "stroke") { ed.stroke = colour; if (!ed.strokeW) ed.strokeW = 2; if (ls.length) live((l) => ({ stroke: colour, strokeW: l.strokeW || 2 })); }
    else if (o === "strokeW") { ed.strokeW = Math.max(0, v); if (ls.length) live((l) => ({ strokeW: Math.max(0, v), stroke: l.stroke || ed.stroke || "#14110E" })); }
    else if (o === "bg") { ed.doc.bg = colour; draw(ed); }
    else if (o === "radius") { ed.radius = v; if (ls.length) live((l) => (l.type === "rect" ? { radius: v } : {})); }
    else if (o === "sides") { ed.sides = v; if (ls.length) live((l) => (l.type === "polygon" ? { sides: v } : {})); }
    else if (o === "inner") { ed.inner = v / 100; if (ls.length) live((l) => (l.type === "polygon" && l.inner != null ? { inner: v / 100 } : {})); }
    else if (["size", "track", "bend", "offset"].includes(o)) {
      if (o === "size") ed.fontSize = v; if (o === "track") ed.track = v;
      if (ls.length) live((l) => (l.type === "text" ? { [o]: v } : {}));
    } else if (o === "weight") { ed.weight = Number(v); if (ls.length) live((l) => (l.type === "text" ? { weight: Number(v) } : {})); }
    if (final && ["fill", "stroke", "strokeW"].includes(o) && !ls.length) paintOpts(ed, H);
  }

  function xfInput(ed, t) {
    const p = t.dataset.xf, v = Number(t.value), ls = chosen(ed);
    if (!ls.length || !Number.isFinite(v)) return;
    if (p === "opacity") { for (const l of ls) l.opacity = Math.max(0, Math.min(1, v / 100)); return; }
    if (ls.length === 1) {
      const l = ls[0];
      if (p === "rot") l.rot = v;
      else if (p === "w" || p === "h") { if (l.type === "text") { const k = v / (p === "w" ? l.w : l.h); l.size = Math.max(4, r2(l.size * k)); fitText(ed, l); } else l[p] = Math.max(1, v); }
      else l[p] = v;
      return;
    }
    const b = boxOf(ls);
    if (p === "x" || p === "y") { const d = v - b[p]; for (const l of ls) l[p] += d; }
    else { const k = v / (b[p] || 1); for (const l of ls) { l.x = b.x + (l.x - b.x) * k; l.y = b.y + (l.y - b.y) * k; l.w *= k; l.h *= k; if (l.type === "text") { l.size *= k; fitText(ed, l); } } }
  }

  function layerAct(ed, H, a) {
    const ls = chosen(ed);
    if (!ls.length) return;
    if (a === "dup") H.mutate(ed, () => { const ids = []; for (const l of ls) { const c = D.duplicate(ed.doc, l.id); if (c) ids.push(c.id); } select(ed, ids); });
    if (a === "up" || a === "down") H.mutate(ed, () => { for (const l of (a === "up" ? ls.slice().reverse() : ls)) D.restack(ed.doc, l.id, a); });
    if (a === "del") { H.mutate(ed, () => { for (const l of ls) D.remove(ed.doc, l.id); select(ed, []); }); H.sound("close"); return; }
    if (a === "merge") { buildShapes(ed, H, ls.filter((l) => DRAWN.includes(l.type)).map((l) => l.id), false, JSON.stringify(ed.doc)); return; }
    H.sound("layer");
  }

  return { mount, TOOLS, SHAPES, keyOf };
})();
