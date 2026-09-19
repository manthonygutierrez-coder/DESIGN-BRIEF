// Builds the Paper Moon Relay character bible as one HTML page, from the same
// data the game draws: src/js/content/characters.js and characters.art.js.
//
//   node tools/character-bible.mjs [out.html]
//
// Sheets are inline SVG rect grids (crisp at any size); everything else is
// the canon text. Nothing is fetched except two Google fonts.
import { createRequire } from "module";
import { writeFileSync } from "fs";
const require = createRequire(import.meta.url);
const C = require("../src/js/content/characters.js");

const out = process.argv[2] || "character-bible.html";
const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const CM_PER_PX = C.CAST.toma.height / C.heightOf("toma", "front");   // 172 cm over 90 px

// Run-length rects, one per horizontal run of a colour.
function rects(id, pose, ox = 0, oy = 0) {
  const g = C.pose(id, pose);
  let r = "";
  g.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const k = row[x];
      if (k === ".") { x++; continue; }
      let n = 1;
      while (x + n < row.length && row[x + n] === k) n++;
      r += `<rect x="${ox + x}" y="${oy + y}" width="${n}" height="1" fill="${C.ART[id].palette[k]}"/>`;
      x += n;
    }
  });
  return r;
}

function figure(id, pose, label, scale = 3) {
  const g = C.pose(id, pose);
  return `<figure class="fig"><svg viewBox="0 0 ${g.w} ${g.h}" width="${g.w * scale}" height="${g.h * scale}" shape-rendering="crispEdges" role="img" aria-label="${esc(C.CAST[id].name + ", " + label)}">${rects(id, pose)}</svg><figcaption>${esc(label)}</figcaption></figure>`;
}

// A height ruler in centimetres, drawn to the sheets' own scale.
function ruler(scale = 3, maxCm = 180) {
  const hPx = 96, ground = hPx;
  let ticks = "";
  for (let cm = 0; cm <= maxCm; cm += 10) {
    const y = (ground - cm / CM_PER_PX) * scale;
    const major = cm % 50 === 0;
    ticks += `<line x1="${major ? 0 : 10}" y1="${y}" x2="22" y2="${y}"/>` + (major ? `<text x="26" y="${y + 4}">${cm}</text>` : "");
  }
  return `<svg class="ruler" viewBox="0 0 54 ${hPx * scale}" width="54" height="${hPx * scale}" aria-hidden="true"><line x1="22" y1="0" x2="22" y2="${hPx * scale}"/>${ticks}</svg>`;
}

function lineup(scale = 3) {
  const ids = ["kiyoshi", "toma"];
  const w = 44, gap = 8, W = ids.length * w + (ids.length - 1) * gap, H = 96;
  const body = ids.map((id, i) => rects(id, "front", i * (w + gap), 0)).join("");
  const eye = 16.5;                                        // Toma's band, Kiyoshi's eye line
  return `<svg class="lineup" viewBox="-4 0 ${W + 8} ${H}" width="${(W + 8) * scale}" height="${H * scale}" shape-rendering="crispEdges" role="img" aria-label="Kiyoshi and Toma, front, at one scale">${body}<line class="eye" x1="-4" y1="${eye}" x2="${W + 4}" y2="${eye}"/></svg>`;
}

function chips(id) {
  return C.CAST[id].palette.map(([k, name]) =>
    `<li><span class="chip" style="background:${C.ART[id].palette[k]}"></span><span class="chip__n">${esc(name)}</span><code>${C.ART[id].palette[k]}</code></li>`).join("");
}

function character(id) {
  const c = C.CAST[id];
  const school = C.SCHOOLS[c.school].name + (c.transfer ? " → " + C.SCHOOLS[c.transfer].name : "");
  return `
<section class="char" id="${id}" aria-labelledby="${id}-h">
  <header class="char__head">
    <p class="kicker">${esc(c.role)} · ${esc(school)} · ${esc(c.year)}</p>
    <h2 id="${id}-h">${esc(c.name)} <span class="native" lang="ja">${esc(c.native)}</span></h2>
    <p class="sig">${esc(c.signature)}</p>
  </header>
  <div class="sheet">
    <div class="sheet__art">
      ${ruler()}
      ${figure(id, "front", "front")}
      ${figure(id, "side", "side")}
      ${figure(id, "bust", "bust", 3)}
    </div>
    <p class="sheet__meta"><span>${c.height} cm</span><span>${c.age}</span><span>${C.heightOf(id, "front")} px at sheet scale</span></p>
  </div>
  <div class="char__body">
    <div class="col">
      ${c.about.map((p) => `<p>${esc(p)}</p>`).join("")}
      <h3>Key style details</h3>
      <dl class="details">${c.details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    </div>
    <div class="col col--side">
      <h3>Palette</h3>
      <ul class="chips">${chips(id)}</ul>
      <h3>Tells</h3>
      <ul class="tells">${c.tells.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <blockquote class="line">“${esc(c.line)}”</blockquote>
      <h3>On model</h3>
      <ul class="rules">
        ${c.rules.do.map((t) => `<li class="do">${esc(t)}</li>`).join("")}
        ${c.rules.dont.map((t) => `<li class="dont">${esc(t)}</li>`).join("")}
      </ul>
    </div>
  </div>
</section>`;
}

const S = C.SERIES, P = C.PAIRING;
const html = `<title>Paper Moon Relay Bible</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --paper:#F7F6F2; --ink:#1E1A22; --muted:#5E5866; --guide:#7FA7D8; --guide-soft:rgba(127,167,216,.28);
  --red:#C8321C; --sheet:#FFFFFF; --rule:#DAD7E0; --orange:#FF7A1A; --navy:#1B2A4A;
  --display:"Dela Gothic One","Hiragino Sans","Yu Gothic",system-ui,sans-serif;
  --body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --paper:#16141B; --ink:#EDEAE4; --muted:#A39DAE; --guide:#5A7FB0; --guide-soft:rgba(90,127,176,.22);
  --red:#FF6A4D; --sheet:#E9E6DF; --rule:#2E2A36;
}}
:root[data-theme="dark"]{
  --paper:#16141B; --ink:#EDEAE4; --muted:#A39DAE; --guide:#5A7FB0; --guide-soft:rgba(90,127,176,.22);
  --red:#FF6A4D; --sheet:#E9E6DF; --rule:#2E2A36;
}
*{box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font:16px/1.55 var(--body);padding-inline:clamp(16px,4vw,48px);padding-block:32px 64px}
.wrap{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:56px}
.kicker{margin:0;font:500 12px/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
h1,h2{font-family:var(--display);font-weight:400;line-height:1.05;text-wrap:balance;margin:0}
h1{font-size:clamp(40px,7vw,76px);letter-spacing:-.01em}
h2{font-size:clamp(30px,4.5vw,46px)}
h3{margin:24px 0 8px;font:600 13px/1.3 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.native{font-size:.5em;color:var(--muted);margin-left:.3em;white-space:nowrap}
p{margin:0 0 12px;max-width:65ch}
.intro{display:grid;gap:20px}
.intro p{font-size:18px}
.schools{display:flex;flex-wrap:wrap;gap:12px;margin:0;padding:0;list-style:none}
.schools li{flex:1 1 280px;padding:14px 16px;border:1px solid var(--rule);background:color-mix(in srgb,var(--paper) 85%,var(--guide-soft))}
.schools b{display:block;font-family:var(--display);font-weight:400;font-size:20px;margin-bottom:4px}
.schools .gloss{font:12px var(--mono);color:var(--muted)}
.swatches{display:flex;gap:6px;margin-top:10px}
.swatches span{width:22px;height:22px;border:1px solid rgba(0,0,0,.2)}
.char{display:flex;flex-direction:column;gap:20px;padding-top:32px;border-top:2px solid var(--ink)}
.sig{font-style:italic;font-size:19px;color:var(--ink);margin-top:10px}
.sheet{background:var(--sheet);border:1px solid var(--rule);padding:20px;overflow-x:auto;
  background-image:linear-gradient(var(--guide-soft) 1px,transparent 1px),linear-gradient(90deg,var(--guide-soft) 1px,transparent 1px);
  background-size:24px 24px}
.sheet__art{display:flex;align-items:flex-end;gap:28px;min-width:max-content}
.fig{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.fig svg{display:block;image-rendering:pixelated;max-width:none}
.fig figcaption{font:500 11px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:#6B6474}
.ruler line{stroke:#6B87B3;stroke-width:1}
.ruler text{font:10px var(--mono);fill:#6B87B3}
.sheet__meta{display:flex;flex-wrap:wrap;gap:18px;margin:14px 0 0;font:12px var(--mono);color:#6B6474;font-variant-numeric:tabular-nums}
.char__body{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:40px}
.details{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:10px 18px}
.details dt{font:600 13px/1.5 var(--mono);letter-spacing:.04em}
.details dd{margin:0;max-width:60ch}
.chips{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.chips li{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:10px}
.chip{width:28px;height:20px;border:1px solid rgba(0,0,0,.25)}
.chip__n{font-size:14px}
.chips code{font:12px var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}
.tells{margin:0;padding-left:18px}
.tells li{margin-bottom:4px}
.line{margin:20px 0 0;padding:0 0 0 14px;border-left:3px solid var(--ink);font-family:var(--display);font-size:22px;line-height:1.3}
.rules{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.rules li{padding-left:24px;position:relative;font-size:15px}
.rules li::before{position:absolute;left:0;top:0;font:600 14px var(--mono)}
.rules .do::before{content:"○";color:var(--ink)}
.rules .dont{color:var(--red)}
.rules .dont::before{content:"×";color:var(--red)}
.pair{display:grid;grid-template-columns:auto minmax(0,1fr);gap:40px;align-items:end;padding-top:32px;border-top:2px solid var(--ink)}
.pair .sheet{padding:20px 28px}
.lineup{display:block;max-width:none}
.lineup .eye{stroke:#C8321C;stroke-width:.35;stroke-dasharray:1.5 1}
.pair dl{margin:0;display:grid;gap:14px}
.pair dt{font:600 13px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pair dd{margin:2px 0 0}
.redpencil{color:var(--red);font:500 12px var(--mono);letter-spacing:.06em;margin-top:10px}
footer{font:12px var(--mono);color:var(--muted);border-top:1px solid var(--rule);padding-top:16px}
@media (max-width:760px){.char__body,.pair{grid-template-columns:1fr}.details{grid-template-columns:1fr}.details dt{margin-top:6px}}
</style>
<div class="wrap">
  <header class="intro">
    <p class="kicker">Character bible · ${S.episodes} episodes · ${esc(S.site)}</p>
    <h1>${esc(S.title)}</h1>
    <p>${esc(S.premise)}</p>
    <ul class="schools">
      ${Object.values(C.SCHOOLS).map((s) => `<li><b>${esc(s.name)}</b><span class="gloss">${esc(s.gloss)}</span><p>${esc(s.kit)}</p><div class="swatches">${s.colours.map(([n, h]) => `<span title="${esc(n)} ${h}" style="background:${h}"></span>`).join("")}</div></li>`).join("")}
    </ul>
    <p class="kicker">The baton — ${esc(S.baton)}</p>
  </header>
  ${character("toma")}
  ${character("kiyoshi")}
  <section class="pair" aria-labelledby="pair-h">
    <div class="sheet">${lineup()}<p class="redpencil">— Toma's band, Kiyoshi's eye line</p></div>
    <div>
      <p class="kicker">The pairing</p>
      <h2 id="pair-h">${esc(P.name)}</h2>
      <dl>
        <div><dt>Colour code</dt><dd>${esc(P.colours)}</dd></div>
        <div><dt>Scale</dt><dd>${esc(P.scale)}</dd></div>
        <div><dt>The hand-off</dt><dd>${esc(P.handoff)}</dd></div>
        <div><dt>Line colour</dt><dd><code>${P.line}</code>, on every official sheet.</dd></div>
      </dl>
    </div>
  </section>
  <footer>Sheets drawn at true resolution: ${C.heightOf("toma", "front")} px for ${C.CAST.toma.height} cm, ${C.heightOf("kiyoshi", "front")} px for ${C.CAST.kiyoshi.height} cm, shown at 3×. Generated from the Pixel Crossing game data — the same sheets its image search and on-model check use.</footer>
</div>
`;
writeFileSync(out, html);
console.log("wrote", out, (html.length / 1024).toFixed(1) + " KB");
