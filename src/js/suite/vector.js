"use strict";
/* ── vector paths ─────────────────────────────────────────
 * The maths behind the pen, the node tool, shapes you can bend into letters,
 * and words that follow a curve. A path is a list of subpaths:
 *
 *   { closed, nodes: [{ x, y, ix, iy, ox, oy, k }] }
 *
 * (x, y) is the anchor, (ix, iy) and (ox, oy) its handles, absolute. A handle
 * sitting on its anchor means that side is straight. k is how the two handles
 * move together when you drag one: "corner" (apart), "smooth" (in line) or
 * "sym" (in line and the same length).
 *
 *   parse(d) / toD(path)      SVG path data both ways (every command in; M L C Z out)
 *   bounds(path)              exact: the curves' bulges count
 *   nearest(path, p)          the closest point on the outline
 *   insert / remove           a node on a curve without changing its shape, or one gone
 *   rect, ellipse, polygon    shapes as paths, so they can be bent
 *   sampler(sub)              walk an outline by distance: text on a path
 *   bend(advances, amount)    where the letters of a line go when it is bent
 *
 * Pure; no canvas.
 */

const SuiteVector = (() => {
  const K = 0.5522847498;                 // handle length of a quarter circle, over its radius
  const EPS = 1e-6;
  const r2 = (v) => Math.round(v * 100) / 100;

  const node = (x, y, k = "corner") => ({ x, y, ix: x, iy: y, ox: x, oy: y, k });
  const copy = (path) => path.map((s) => ({ closed: s.closed, nodes: s.nodes.map((n) => Object.assign({}, n)) }));
  const flat = (n, side) => (side === "in" ? Math.abs(n.ix - n.x) < EPS && Math.abs(n.iy - n.y) < EPS
    : Math.abs(n.ox - n.x) < EPS && Math.abs(n.oy - n.y) < EPS);

  /* ── SVG path data in ─────────────────────────────────── */
  const TOKEN = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

  function parse(d) {
    const tok = String(d || "").match(TOKEN) || [];
    const out = [];
    let i = 0, cmd = null, cur = null, x = 0, y = 0, sx = 0, sy = 0, lastC = null, lastQ = null;
    const isCmd = (t) => /^[A-Za-z]$/.test(t);
    const has = (n) => { for (let k = 0; k < n; k++) if (i + k >= tok.length || isCmd(tok[i + k])) return false; return true; };
    const num = () => Number(tok[i++]);
    const start = (px, py) => { cur = { closed: false, nodes: [node(px, py)] }; out.push(cur); sx = px; sy = py; };
    const lineTo = (px, py) => { if (!cur) start(x, y); cur.nodes.push(node(px, py)); };
    const curveTo = (c1x, c1y, c2x, c2y, px, py) => {
      if (!cur) start(x, y);
      const last = cur.nodes[cur.nodes.length - 1];
      last.ox = c1x; last.oy = c1y;
      const n = node(px, py); n.ix = c2x; n.iy = c2y;
      cur.nodes.push(n);
    };
    while (i < tok.length) {
      if (isCmd(tok[i])) cmd = tok[i++];
      else if (!cmd || cmd === "Z" || cmd === "z") { i++; continue; }   // stray numbers
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === "Z") {
        if (cur) { close(cur); cur = null; }
        x = sx; y = sy; lastC = lastQ = null;
        continue;
      }
      const need = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[C];
      if (!need || !has(need)) { i++; continue; }
      if (C === "M") { x = num() + ox; y = num() + oy; start(x, y); cmd = rel ? "l" : "L"; lastC = lastQ = null; continue; }
      if (C === "L") { x = num() + ox; y = num() + oy; lineTo(x, y); lastC = lastQ = null; continue; }
      if (C === "H") { x = num() + ox; lineTo(x, y); lastC = lastQ = null; continue; }
      if (C === "V") { y = num() + oy; lineTo(x, y); lastC = lastQ = null; continue; }
      if (C === "C" || C === "S") {
        let c1x, c1y;
        if (C === "C") { c1x = num() + ox; c1y = num() + oy; }
        else { c1x = lastC ? 2 * x - lastC[0] : x; c1y = lastC ? 2 * y - lastC[1] : y; }
        const c2x = num() + ox, c2y = num() + oy, px = num() + ox, py = num() + oy;
        curveTo(c1x, c1y, c2x, c2y, px, py);
        lastC = [c2x, c2y]; lastQ = null; x = px; y = py;
        continue;
      }
      if (C === "Q" || C === "T") {
        let qx, qy;
        if (C === "Q") { qx = num() + ox; qy = num() + oy; }
        else { qx = lastQ ? 2 * x - lastQ[0] : x; qy = lastQ ? 2 * y - lastQ[1] : y; }
        const px = num() + ox, py = num() + oy;
        // A quadratic is a cubic with its control point shared out two thirds each way.
        curveTo(x + (qx - x) * 2 / 3, y + (qy - y) * 2 / 3, px + (qx - px) * 2 / 3, py + (qy - py) * 2 / 3, px, py);
        lastQ = [qx, qy]; lastC = null; x = px; y = py;
        continue;
      }
      if (C === "A") {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), px = num() + ox, py = num() + oy;
        const cs = arcCubics(x, y, rx, ry, rot * Math.PI / 180, !!large, !!sweep, px, py);
        if (!cs) lineTo(px, py);
        else for (const c of cs) curveTo(...c);
        lastC = lastQ = null; x = px; y = py;
      }
    }
    for (const s of out) kinds(s);
    return out.filter((s) => s.nodes.length > 0);
  }

  // Closing a subpath whose last point is its first: one node, not two.
  function close(sub) {
    sub.closed = true;
    const n = sub.nodes;
    if (n.length > 1) {
      const a = n[0], b = n[n.length - 1];
      if (Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4) { a.ix = b.ix; a.iy = b.iy; n.pop(); }
    }
  }

  // After parsing, say which nodes are smooth: handles in a line through the anchor.
  function kinds(sub) {
    for (const n of sub.nodes) {
      if (flat(n, "in") || flat(n, "out")) { n.k = "corner"; continue; }
      const ax = n.x - n.ix, ay = n.y - n.iy, bx = n.ox - n.x, by = n.oy - n.y;
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const cross = (ax * by - ay * bx) / (la * lb), dot = (ax * bx + ay * by) / (la * lb);
      n.k = Math.abs(cross) < 0.02 && dot > 0 ? (Math.abs(la - lb) < 0.02 * Math.max(la, lb) ? "sym" : "smooth") : "corner";
    }
  }

  // Endpoint arc to cubics, split so no piece turns more than a quarter.
  function arcCubics(x1, y1, rx, ry, phi, large, sweep, x2, y2) {
    if (!rx || !ry || (Math.abs(x1 - x2) < EPS && Math.abs(y1 - y2) < EPS)) return null;
    rx = Math.abs(rx); ry = Math.abs(ry);
    const sp = Math.sin(phi), cp = Math.cos(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / (den || 1)));
    const cxp = coef * (rx * y1p / ry), cyp = coef * (-ry * x1p / rx);
    const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
    const t1 = ang(1, 0, ux, uy);
    let dt = ang(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    else if (sweep && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
    const step = dt / n, k = 4 / 3 * Math.tan(step / 4);
    const map = (px, py) => [cx + rx * px * cp - ry * py * sp, cy + rx * px * sp + ry * py * cp];
    const out = [];
    for (let s = 0, a = t1; s < n; s++, a += step) {
      const b = a + step;
      out.push([...map(Math.cos(a) - k * Math.sin(a), Math.sin(a) + k * Math.cos(a)),
        ...map(Math.cos(b) + k * Math.sin(b), Math.sin(b) - k * Math.cos(b)),
        ...map(Math.cos(b), Math.sin(b))]);
    }
    return out;
  }

  /* ── SVG path data out ────────────────────────────────── */
  function toD(path, f = r2) {
    return path.filter((s) => s.nodes.length).map((s) => {
      let d = "M" + f(s.nodes[0].x) + " " + f(s.nodes[0].y);
      for (const [a, b] of segs(s)) {
        if (flat(a, "out") && flat(b, "in")) {
          if (b === s.nodes[0] && s.closed) continue;           // Z draws the straight way home
          d += "L" + f(b.x) + " " + f(b.y);
        } else d += "C" + f(a.ox) + " " + f(a.oy) + " " + f(b.ix) + " " + f(b.iy) + " " + f(b.x) + " " + f(b.y);
      }
      return d + (s.closed ? "Z" : "");
    }).join("");
  }

  /* ── curves ───────────────────────────────────────────── */
  function segs(sub) {
    const n = sub.nodes, out = [];
    for (let i = 0; i + 1 < n.length; i++) out.push([n[i], n[i + 1]]);
    if (sub.closed && n.length > 1) out.push([n[n.length - 1], n[0]]);
    return out;
  }
  const cubic = (a, b) => [a.x, a.y, a.ox, a.oy, b.ix, b.iy, b.x, b.y];

  function at(c, t) {
    const u = 1 - t, w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
    return { x: w0 * c[0] + w1 * c[2] + w2 * c[4] + w3 * c[6], y: w0 * c[1] + w1 * c[3] + w2 * c[5] + w3 * c[7] };
  }
  function tangent(c, t) {
    const u = 1 - t;
    let dx = 3 * (u * u * (c[2] - c[0]) + 2 * u * t * (c[4] - c[2]) + t * t * (c[6] - c[4]));
    let dy = 3 * (u * u * (c[3] - c[1]) + 2 * u * t * (c[5] - c[3]) + t * t * (c[7] - c[5]));
    if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) { dx = c[6] - c[0]; dy = c[7] - c[1]; }
    return Math.atan2(dy, dx);
  }
  // de Casteljau: the two halves of a curve at t, each [x0 y0 x1 y1 x2 y2 x3 y3].
  function split(c, t) {
    const l = (a, b) => a + (b - a) * t;
    const x01 = l(c[0], c[2]), y01 = l(c[1], c[3]), x12 = l(c[2], c[4]), y12 = l(c[3], c[5]), x23 = l(c[4], c[6]), y23 = l(c[5], c[7]);
    const xa = l(x01, x12), ya = l(y01, y12), xb = l(x12, x23), yb = l(y12, y23);
    const xm = l(xa, xb), ym = l(ya, yb);
    return [[c[0], c[1], x01, y01, xa, ya, xm, ym], [xm, ym, xb, yb, x23, y23, c[6], c[7]]];
  }

  // Where one axis of a curve turns back: the roots of its derivative in (0, 1).
  function turns(p0, p1, p2, p3) {
    const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
    if (Math.abs(a) < 1e-9) return Math.abs(b) < 1e-9 ? [] : [-c / b];
    const disc = b * b - 4 * a * c;
    if (disc < 0) return [];
    const s = Math.sqrt(disc);
    return [(-b + s) / (2 * a), (-b - s) / (2 * a)];
  }

  function bounds(path) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const take = (p) => { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; };
    for (const s of path) {
      for (const n of s.nodes) take(n);
      for (const [a, b] of segs(s)) {
        const c = cubic(a, b);
        for (const t of turns(c[0], c[2], c[4], c[6]).concat(turns(c[1], c[3], c[5], c[7]))) if (t > 0 && t < 1) take(at(c, t));
      }
    }
    return x1 < x0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // The closest point on the outline: sample, then narrow in.
  function nearest(path, p) {
    let best = null;
    path.forEach((s, si) => segs(s).forEach(([a, b], gi) => {
      const c = cubic(a, b);
      let bt = 0, bd = Infinity;
      for (let k = 0; k <= 32; k++) { const q = at(c, k / 32), d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; bt = k / 32; } }
      let lo = Math.max(0, bt - 1 / 32), hi = Math.min(1, bt + 1 / 32);
      for (let k = 0; k < 18; k++) {
        const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        const q1 = at(c, m1), q2 = at(c, m2);
        if ((q1.x - p.x) ** 2 + (q1.y - p.y) ** 2 < (q2.x - p.x) ** 2 + (q2.y - p.y) ** 2) hi = m2; else lo = m1;
      }
      const t = (lo + hi) / 2, q = at(c, t), d = Math.hypot(q.x - p.x, q.y - p.y);
      if (!best || d < best.dist) best = { si, seg: gi, t, x: q.x, y: q.y, dist: d };
    }));
    return best;
  }

  // A node on segment `seg` of subpath `si` at t; the outline does not move.
  function insert(path, si, seg, t) {
    const out = copy(path), s = out[si];
    if (!s) return out;
    const pairs = segs(s), pair = pairs[seg];
    if (!pair) return out;
    const [a, b] = pair;
    const straight = flat(a, "out") && flat(b, "in");
    const [L, R] = split(cubic(a, b), t);
    const n = node(L[6], L[7], straight ? "corner" : "smooth");
    if (!straight) {
      a.ox = L[2]; a.oy = L[3];
      n.ix = L[4]; n.iy = L[5]; n.ox = R[2]; n.oy = R[3];
      b.ix = R[4]; b.iy = R[5];
    }
    s.nodes.splice(s.nodes.indexOf(a) + 1, 0, n);
    return out;
  }

  function remove(path, si, ni) {
    const out = copy(path), s = out[si];
    if (!s) return out;
    s.nodes.splice(ni, 1);
    if (s.nodes.length < 2) out.splice(si, 1);
    else if (s.nodes.length < 3) s.closed = false;
    return out;
  }

  // Every point, handles included, through fn(x, y) → {x, y}.
  function transform(path, fn) {
    return path.map((s) => ({ closed: s.closed, nodes: s.nodes.map((n) => {
      const a = fn(n.x, n.y), i = fn(n.ix, n.iy), o = fn(n.ox, n.oy);
      return { x: a.x, y: a.y, ix: i.x, iy: i.y, ox: o.x, oy: o.y, k: n.k };
    }) }));
  }

  // Same outline, walked the other way (a mirrored copy must be, or it
  // punches a hole where it overlaps its original).
  function reverse(sub) {
    const nodes = sub.nodes.slice().reverse().map((n) => ({ x: n.x, y: n.y, ix: n.ox, iy: n.oy, ox: n.ix, oy: n.iy, k: n.k }));
    return { closed: sub.closed, nodes };
  }

  // Moving one handle of a smooth node swings the other with it.
  function dragHandle(n, side, x, y) {
    const m = Object.assign({}, n);
    if (side === "in") { m.ix = x; m.iy = y; } else { m.ox = x; m.oy = y; }
    if (n.k === "smooth" || n.k === "sym") {
      const dx = n.x - x, dy = n.y - y, len = Math.hypot(dx, dy) || 1;
      const other = side === "in" ? Math.hypot(n.ox - n.x, n.oy - n.y) : Math.hypot(n.ix - n.x, n.iy - n.y);
      const keep = n.k === "sym" ? len : other;
      if (side === "in") { m.ox = n.x + dx / len * keep; m.oy = n.y + dy / len * keep; }
      else { m.ix = n.x + dx / len * keep; m.iy = n.y + dy / len * keep; }
    }
    return m;
  }

  /* ── shapes as paths ──────────────────────────────────── */
  function rect(x, y, w, h, r = 0) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    if (r < EPS) return [{ closed: true, nodes: [node(x, y), node(x + w, y), node(x + w, y + h), node(x, y + h)] }];
    const k = r * (1 - K);
    const n = (px, py, ix, iy, ox, oy) => ({ x: px, y: py, ix, iy, ox, oy, k: "corner" });
    return [{ closed: true, nodes: [
      n(x + r, y, x + k, y, x + r, y), n(x + w - r, y, x + w - r, y, x + w - k, y),
      n(x + w, y + r, x + w, y + k, x + w, y + r), n(x + w, y + h - r, x + w, y + h - r, x + w, y + h - k),
      n(x + w - r, y + h, x + w - k, y + h, x + w - r, y + h), n(x + r, y + h, x + r, y + h, x + k, y + h),
      n(x, y + h - r, x, y + h - k, x, y + h - r), n(x, y + r, x, y + r, x, y + k),
    ] }];
  }

  function ellipse(cx, cy, rx, ry) {
    const kx = rx * K, ky = ry * K;
    const n = (x, y, ix, iy, ox, oy) => ({ x, y, ix, iy, ox, oy, k: "sym" });
    return [{ closed: true, nodes: [
      n(cx, cy - ry, cx - kx, cy - ry, cx + kx, cy - ry),
      n(cx + rx, cy, cx + rx, cy - ky, cx + rx, cy + ky),
      n(cx, cy + ry, cx + kx, cy + ry, cx - kx, cy + ry),
      n(cx - rx, cy, cx - rx, cy + ky, cx - rx, cy - ky),
    ] }];
  }

  // A regular polygon in the w × h box, point up; with `inner` (0–1) a star
  // whose valleys sit at that fraction of the radius.
  function polygon(x, y, w, h, sides = 5, inner = null) {
    const n = Math.max(3, Math.min(24, Math.round(sides)));
    const pts = [];
    const star = inner != null && inner > 0;
    const count = star ? n * 2 : n;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / count;
      const r = star && i % 2 ? Math.max(0.05, Math.min(0.98, inner)) : 1;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    // Fit the points, not the circle, to the box: a triangle fills its box too.
    const b = { x0: Math.min(...pts.map((p) => p.x)), x1: Math.max(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), y1: Math.max(...pts.map((p) => p.y)) };
    const sx = w / ((b.x1 - b.x0) || 1), sy = h / ((b.y1 - b.y0) || 1);
    return [{ closed: true, nodes: pts.map((p) => node(x + (p.x - b.x0) * sx, y + (p.y - b.y0) * sy)) }];
  }

  /* ── boxes ────────────────────────────────────────────── */
  // A path in document space to the layer convention: data in `box` units
  // across the path's own bounds, plus where those bounds are.
  function fit(path, box = 64) {
    const b = bounds(path);
    const w = Math.max(EPS, b.w), h = Math.max(EPS, b.h);
    const inBox = transform(path, (x, y) => ({ x: (x - b.x) / w * box, y: (y - b.y) / h * box }));
    return { d: toD(inBox), x: b.x, y: b.y, w: Math.max(1, b.w), h: Math.max(1, b.h), box };
  }
  // A path layer's data out into the document (unrotated): the reverse of fit.
  function place(d, box, x, y, w, h) {
    const k = box || 64;
    return transform(parse(d), (px, py) => ({ x: x + px / k * w, y: y + py / k * h }));
  }

  /* ── hit-testing ──────────────────────────────────────── */
  // Each subpath as a polyline: curves in 12 steps, lines as they are. Open
  // subpaths are filled as if closed, the way a canvas fills them.
  function flatten(path, per = 12) {
    return path.map((s) => {
      const pts = s.nodes.length ? [{ x: s.nodes[0].x, y: s.nodes[0].y }] : [];
      segs(s).forEach(([a, b], i, all) => {
        const straight = flat(a, "out") && flat(b, "in");
        const c = cubic(a, b), n = straight ? 1 : per;
        for (let k = 1; k <= n; k++) pts.push(at(c, k / n));
        if (s.closed && i === all.length - 1) pts.pop();     // back at the start
      });
      return { closed: s.closed, pts };
    });
  }

  // Inside the fill, by the nonzero rule unless "evenodd" is asked for.
  function contains(path, x, y, rule) {
    let wind = 0, cross = 0;
    for (const { pts } of flatten(path)) {
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[j], b = pts[i];
        if ((a.y > y) !== (b.y > y)) {
          const xi = a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y);
          if (x < xi) { cross++; wind += b.y > a.y ? 1 : -1; }
        }
      }
    }
    return rule === "evenodd" ? cross % 2 === 1 : wind !== 0;
  }

  // Within `tol` of the outline itself (an open line, or a stroke).
  function near(path, x, y, tol) {
    for (const { closed, pts } of flatten(path)) {
      const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len)) : 0;
        if (Math.hypot(a.x + dx * t - x, a.y + dy * t - y) <= tol) return true;
      }
    }
    return false;
  }

  /* ── walking an outline ───────────────────────────────── */
  // Distance along a subpath to a point and a direction, for letters on a
  // path. Past either end, the line carries on straight.
  function sampler(sub, per = 24) {
    const pts = [];
    let len = 0, prev = null;
    for (const [a, b] of segs(sub)) {
      const c = cubic(a, b);
      for (let k = prev ? 1 : 0; k <= per; k++) {
        const p = at(c, k / per);
        if (prev) len += Math.hypot(p.x - prev.x, p.y - prev.y);
        pts.push({ x: p.x, y: p.y, s: len });
        prev = p;
      }
    }
    if (pts.length < 2) {
      const p = pts[0] || { x: 0, y: 0 };
      return { len: 0, at: (s) => ({ x: p.x + s, y: p.y, a: 0 }) };
    }
    const dir = (i) => Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    function atDist(s) {
      if (s <= 0) { const a = dir(0); return { x: pts[0].x + Math.cos(a) * s, y: pts[0].y + Math.sin(a) * s, a }; }
      if (s >= len) { const j = pts.length - 2, a = dir(j), e = s - len; return { x: pts[j + 1].x + Math.cos(a) * e, y: pts[j + 1].y + Math.sin(a) * e, a }; }
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pts[m].s <= s) lo = m; else hi = m; }
      const p = pts[lo], q = pts[hi], f = (s - p.s) / ((q.s - p.s) || 1);
      return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, a: Math.atan2(q.y - p.y, q.x - p.x) };
    }
    return { len, at: atDist };
  }

  /* ── bent lines of type ───────────────────────────────── */
  // A line of letters, `advances` wide each, bent by `amount` (−100 … 100):
  // 0 is straight, 100 arches it over the top half of a circle, −100 hangs it
  // round the bottom. The line's middle sits at (0, 0) on the baseline.
  // → { letters: [{ x, y, a }] (centre of each letter on the baseline, and its
  //    angle), r (the circle's radius, 0 when straight) }
  function bend(advances, amount) {
    const total = advances.reduce((s, w) => s + w, 0);
    const theta = Math.min(1, Math.abs(Number(amount) || 0) / 100) * Math.PI;
    const up = amount > 0;
    const letters = [];
    let run = 0;
    for (const w of advances) {
      const s = run + w / 2 - total / 2;        // arc length from the middle
      run += w;
      if (theta < 1e-4 || total <= 0) { letters.push({ x: s, y: 0, a: 0 }); continue; }
      const R = total / theta, phi = s / R;
      letters.push(up ? { x: R * Math.sin(phi), y: R - R * Math.cos(phi), a: phi }
        : { x: R * Math.sin(phi), y: -(R - R * Math.cos(phi)), a: -phi });
    }
    return { letters, r: theta < 1e-4 || total <= 0 ? 0 : total / theta };
  }

  // The box a set of placed letters covers: each letter is its advance wide,
  // from `asc` above its baseline to `desc` below, turned by its angle.
  function lettersBox(letters, advances, asc, desc) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    letters.forEach((g, i) => {
      const hw = advances[i] / 2, c = Math.cos(g.a), s = Math.sin(g.a);
      for (const [dx, dy] of [[-hw, -asc], [hw, -asc], [hw, desc], [-hw, desc]]) {
        const x = g.x + dx * c - dy * s, y = g.y + dx * s + dy * c;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    });
    return x1 < x0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // Letters along a sampled outline, starting `offset` along it.
  function onPath(advances, samp, offset = 0) {
    let run = offset;
    return advances.map((w) => { const p = samp.at(run + w / 2); run += w; return { x: p.x, y: p.y, a: p.a }; });
  }

  return {
    K, node, copy, parse, toD, segs, cubic, at, tangent, split, bounds, nearest, insert, remove,
    transform, reverse, dragHandle, rect, ellipse, polygon, fit, place, flatten, contains, near,
    sampler, bend, lettersBox, onPath, arcCubics,
  };
})();

if (typeof module !== "undefined") module.exports = SuiteVector;
