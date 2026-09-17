"use strict";
/* ── research ─────────────────────────────────────────────
 * The logic behind the research puzzles. Pure; the browser supplies the text
 * of whatever the player clipped, this decides what it was worth.
 *
 * Site study   facts hide in a client's own pages. Clipping the passage that
 *              holds one turns it into a fact card. Clipping anything else
 *              costs time.
 * Competitors  rival sites carry trends. Clipping one makes a trend card and
 *              marks what that rival does.
 * The gap      a grid of features against the rivals you have studied. A cell
 *              is ✓ once you have clipped that rival doing it, — once you have
 *              clipped everything that rival does on the grid (so it does not),
 *              and ? until then. The gap is the row nobody does; guessing
 *              before the grid proves it is allowed, and a wrong guess costs.
 *
 * Matching is keyword-based: every string in `match` must appear in the
 * clipped text, case-insensitively. Content writes `match` to be unambiguous.
 */

const HustleResearch = (() => {
  const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ");

  function matches(item, text) {
    const t = norm(text);
    return (item.match || []).length > 0 && item.match.every((m) => t.includes(norm(m)));
  }

  function emptyFound() {
    return { facts: [], trends: {} };
  }

  // The rival trends a gig's comparison grid actually asks about. Clipping a
  // rival for one gig never fills in another gig's grid.
  function relevantTrends(gig, sites, dom) {
    const ids = new Set((gig.features || []).map((f) => f.doneBy && f.doneBy[dom]).filter(Boolean));
    return ((sites[dom] && sites[dom].trends) || []).filter((t) => ids.has(t.id));
  }

  /* found = { facts: [factId], trends: { dom: [trendId] } }
   * sites = { dom: { trends: [...] } } — competitor data
   * Returns { kind: "fact"|"trend", item, dom }, { kind: "dupe", item }, or null.
   *
   * One passage can prove more than one thing, so a clip counts the first
   * match not already found, and only reports a duplicate when every match in
   * it is already on a card. */
  function clip(gig, sites, dom, text, found) {
    const d = String(dom || "").toLowerCase();
    let dupe = null;
    for (const f of gig.facts || []) {
      if (f.where && f.where.toLowerCase() !== d) continue;
      if (!matches(f, text)) continue;
      if (!found.facts.includes(f.id)) return { kind: "fact", item: f, dom: d };
      dupe = dupe || { kind: "dupe", item: f };
    }
    if ((gig.competitors || []).includes(d)) {
      for (const tr of relevantTrends(gig, sites, d)) {
        if (!matches(tr, text)) continue;
        if (!(found.trends[d] || []).includes(tr.id)) return { kind: "trend", item: tr, dom: d };
        dupe = dupe || { kind: "dupe", item: tr };
      }
    }
    return dupe;
  }

  function record(found, hit) {
    const next = JSON.parse(JSON.stringify(found || emptyFound()));
    if (!hit) return next;
    if (hit.kind === "fact" && !next.facts.includes(hit.item.id)) next.facts.push(hit.item.id);
    if (hit.kind === "trend") {
      next.trends[hit.dom] = next.trends[hit.dom] || [];
      if (!next.trends[hit.dom].includes(hit.item.id)) next.trends[hit.dom].push(hit.item.id);
    }
    return next;
  }

  const studied = (gig, sites, found, dom) => {
    const all = relevantTrends(gig, sites, dom);
    const have = found.trends[dom] || [];
    return all.length > 0 && all.every((t) => have.includes(t.id));
  };

  /* The comparison grid. features: [{ id, label, doneBy: { dom: trendId }, gap? }] */
  function board(gig, sites, found) {
    const doms = (gig.competitors || []).filter((d) => sites[d]);
    return {
      doms,
      rows: (gig.features || []).map((f) => ({
        id: f.id,
        label: f.label,
        cells: doms.map((d) => {
          const trendId = f.doneBy && f.doneBy[d];
          if (trendId && (found.trends[d] || []).includes(trendId)) return "yes";
          // Everything this rival does has been clipped, so anything not
          // ticked by now is something they do not do.
          if (studied(gig, sites, found, d)) return "no";
          return "?";
        }),
      })),
      proven: null,
    };
  }

  // Whether the grid alone already proves which row is the gap.
  function proven(gig, sites, found) {
    const b = board(gig, sites, found);
    const empty = b.rows.filter((r) => r.cells.every((c) => c === "no"));
    return empty.length === 1 ? empty[0].id : null;
  }

  function guess(gig, featureId) {
    const f = (gig.features || []).find((x) => x.id === featureId);
    return !!(f && f.gap);
  }

  return { matches, emptyFound, relevantTrends, clip, record, studied, board, proven, guess };
})();

if (typeof module !== "undefined") module.exports = HustleResearch;
