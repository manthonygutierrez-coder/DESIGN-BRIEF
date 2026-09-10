/* ── pixel icons (16x16 grids, run-length -> svg) ───── */
const ICON_ART = {
  graphic:{p:{k:"#0A0A0A",w:"#F2ECE0",a:"#E0442B"},g:[
    "................","..kkkkkkkkkkkk..","..kwwwwwwwwwwk..","..kwwwwwwwwwwk..",
    "..kwwwaaaawwwk..","..kwwaaaaaawwk..","..kwwaaaaaawwk..","..kwwwaaaawwwk..",
    "..kwwwwwwwwwwk..","..kkkkkkkkkkkk..","..kwwwwwwwwwwk..","..kwwwwwwwwwwk..",
    "..kwwwwwwwwwwk..","..kkkkkkkkkkkk..","................","................"]},
  webui:{p:{k:"#0A0A0A",w:"#FFFFFF",b:"#1084D0",s:"#8FAFCB"},g:[
    "................","..kkkkkkkkkkkk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..",
    "..kkkkkkkkkkkk..","..kwwwwwwwwwwk..","..kwssssswwwwk..","..kwwwwwwwwwwk..",
    "..kwsssssssswk..","..kwwwwwwwwwwk..","..kwssssswwwwk..","..kwwwwwwwwwwk..",
    "..kkkkkkkkkkkk..","................","................","................"]},
  asset3d:{p:{k:"#0A0A0A",a:"#EFE7DB",b:"#9A8F7E",c:"#5A5148"},g:[
    "................","......kkkk......","....kkaaaakk....","..kkaaaaaaaakk..",
    "..kaaaaaaaaaak..","..kbbbbkkcccck..","..kbbbbkkcccck..","..kbbbbkkcccck..",
    "..kbbbbkkcccck..","..kbbbbkkcccck..","..kbbbbkkcccck..","...kbbbkkccck...",
    "....kkbkckk.....","......kkkk......","................","................"]},
  illustrative:{p:{k:"#0A0A0A",a:"#C9A87C",b:"#8A8A96",c:"#2E3A8C"},g:[
    "................","............kk..","...........kaak.","..........kaaak.",
    ".........kaaak..","........kaaak...",".......kaaak....","......kaaak.....",
    ".....kaaak......","....kbbbk.......","...kbbbk........","..kcccck........",
    "..kcccck........","..kcccck........","...kkkk.........","................"]},
  character:{p:{k:"#0A0A0A",a:"#E8C9A0",b:"#7A4A1C"},g:[
    "................","......kkkk......",".....kaaaak.....",".....kaaaak.....",
    ".....kaaaak.....","......kaak......","....kkkaakkk....","...kbbbbbbbbk...",
    "..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..","..kbbbbbbbbbbk..",
    "..kbbbbbbbbbbk..","..kkkkkkkkkkkk..","................","................"]},
  motion:{p:{k:"#0A0A0A",w:"#3A3A44",a:"#57E0FF"},g:[
    "................","..kkkkkkkkkkkk..","..kwkwwwwwwkwk..","..kkkwwwwwwkkk..",
    "..kwkwaawwwkwk..","..kkkwaaawwkkk..","..kwkwaaaawkwk..","..kkkwaaawwkkk..",
    "..kwkwaawwwkwk..","..kkkwwwwwwkkk..","..kwkwwwwwwkwk..","..kkkkkkkkkkkk..",
    "................","................","................","................"]},
  type:{p:{k:"#0A0A0A",a:"#F4F1E9"},g:[
    "................",".......kk.......","......kaak......","......kaak......",
    ".....kaaaak.....",".....kaaaak.....","....kaakkaak....","....kaaaaaak....",
    "...kaaaaaaaak...","...kaakkkkaak...","..kaak....kaak..","..kaak....kaak..",
    "..kkk......kkk..","................","................","................"]},
  mail:{p:{k:"#0A0A0A",w:"#FFFFFF"},g:[
    "................","................","..kkkkkkkkkkkk..","..kwwwwwwwwwwk..",
    "..kwkkwwwwkkwk..","..kwwkkwwkkwwk..","..kwwwkkkkwwwk..","..kwwwwkkwwwwk..",
    "..kwwwwwwwwwwk..","..kwwwwwwwwwwk..","..kkkkkkkkkkkk..","................",
    "................","................","................","................"]},
  folder:{p:{k:"#0A0A0A",a:"#E8C36A"},g:[
    "................","................","................","..kkkk..........",
    ".kaaaak.........",".kaaaaakkkkkkk..",".kaaaaaaaaaaaak.",".kaaaaaaaaaaaak.",
    ".kaaaaaaaaaaaak.",".kaaaaaaaaaaaak.",".kaaaaaaaaaaaak.",".kkkkkkkkkkkkkk.",
    "................","................","................","................"]},
  trash:{p:{k:"#0A0A0A",a:"#B8BCC2"},g:[
    "................","................",".....kkkkkk.....","..kkkkkkkkkkkk..",
    "..kaaaaaaaaaak..","...kaakaakaak...","...kaakaakaak...","...kaakaakaak...",
    "...kaakaakaak...","...kaakaakaak...","...kaakaakaak...","....kkkkkkkk....",
    "................","................","................","................"]},
  web:{p:{k:"#0A0A0A",a:"#5FC9E8"},g:[
    "................",".....kkkkkk.....","...kkaaaaaakk...","..kaaakaakaaak..",
    ".kaaaakaakaaaak.",".kaakaaaaaakaak.","kaaaaaaaaaaaaaak","kkkkkkkkkkkkkkkk",
    "kaaaaaaaaaaaaaak",".kaakaaaaaakaak.",".kaaaakaakaaaak.","..kaaakaakaaak..",
    "...kkaaaaaakk...",".....kkkkkk.....","................","................"]},
  /* ── client marks ─────────────────────────────────────
   * One per client, keyed by domain slug. Drawn 16x16 in LibreSprite
   * and converted with .claude/skills/pixel-assets/png2grid.py.
   * clientIcon() falls back to the discipline icon when a client has
   * none, so an unillustrated client is never a missing image. */
winterbourneandsons:{p:{k:"#14110E",w:"#D8C08A",a:"#8A7040"},g:[
    "................","................","....kkkkkkkk....","...kwwwwwwwwk...",
    "...kwwkkkkwwk...","...kwwwwwwwwk...","....kkawwakk....",".....kwwwwk.....",
    "....kwwwwwwk....",".....kwwaak.....","....kwwwwwwk....",".....kwwaak.....",
    "....kwwwwwwk....",".....kwwaak.....","......kwak......",".......kk......."]},
  hallgarthmart:{p:{k:"#14110E",w:"#2E3A34",a:"#E8E4D8"},g:[
    "................","..kkkkkkkkkkkk..","..kwwwwwwwwwwk..","..kwaawwaaawwk..",
    "..kwwwwwwwwwwk..","..kwaaawwaawwk..","..kwwwwwwwwwwk..","..kwaawwwaaawk..",
    "..kwwwwwwwwwwk..","..kkkkkkkkkkkk..","....k......k....","....k......k....",
    "...k........k...","...k........k...","................","................"]},
  ardwickbaths:{p:{k:"#1A3A44",w:"#E4E0D0",a:"#3E8FA8",b:"#7FCDE0"},g:[
    "................",".kkkkkkkkkkkkkk.",".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.",
    ".kaaaaaaaaaaaak.",".kaabbaaaabbaak.",".kaaaabbaaaaaak.",".kabbaaaabbaaak.",
    ".kaaaaaabbaaaak.",".kabbaaaaaabbak.",".kaaaaaaaaaaaak.",".kkkkkkkkkkkkkk.",
    ".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.","................","................"]},
  ambergateironfounders:{p:{k:"#14110E",w:"#7A7A70",a:"#45453E"},g:[
    "................","..kkkkkkkkkkkk..","..kwwwwwwwwwwk..","..kwaaaaaaaawk..",
    "..kwaaaaaaaawk..","...kwaaaaaawk...","....kwaaaawk....",".....kwaawk.....",
    "......kwwk......","......kaak......","......kaak......","......kaak......",
    "......kaak......",".....kkaakk.....","......kaak......","................"]},

  back:{p:{k:"#0A0A0A",a:"#7CF9C0"},g:[
    "................","................",".......kk.......","......kak.......",
    ".....kaak.......","....kaaakkkkkk..","...kaaaaaaaaaak.","..kaaaaaaaaaaak.",
    "..kaaaaaaaaaaak.","...kaaaaaaaaaak.","....kaaakkkkkk..",".....kaak.......",
    "......kak.......",".......kk.......","................","................"]}
};

// A client's own icon if one has been drawn, else the discipline's.
// dom is the client domain; the slug drops dots and any leading www.
function clientIcon(dom, fallbackId){
  if (!dom) return fallbackId;
  const slug = String(dom).toLowerCase().replace(/^www\./, "").replace(/\.[a-z.]+$/, "").replace(/[^a-z0-9]/g, "");
  return ICON_ART[slug] ? slug : fallbackId;
}

function iconSVG(id, px){
  const art = ICON_ART[id];
  if (!art) return "";
  let r = "";
  art.g.forEach((row, y) => {
    let x = 0;
    while (x < row.length){
      const ch = row[x];
      if (ch === "."){ x++; continue; }
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      r += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" fill="' + art.p[ch] + '"/>';
      x += n;
    }
  });
  return '<svg viewBox="0 0 16 16" width="' + px + '" height="' + px +
         '" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
}
