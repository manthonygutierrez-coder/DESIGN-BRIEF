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
    "......kak.......",".......kk.......","................","................"]},
  /* ── design suite: apps and tools ── */
  "t-select":{p:{k:"#0A0A0A",w:"#FFFFFF"},g:[
    "................","..k.............","..kk............","..kwk...........",
    "..kwwk..........","..kwwwk.........","..kwwwwk........","..kwwwwwk.......",
    "..kwwwwwwk......","..kwwwwwwwk.....","..kwwwwkkkkk....","..kwwkwwk.......",
    "..kwk.kwwk......","..kk...kwwk.....","..k.....kwk.....",".........k......"]},
  "t-rect":{p:{k:"#0A0A0A",a:"#E0442B"},g:[
    "................","................","................","..kkkkkkkkkkkk..",
    "..kaaaaaaaaaak..","..kaaaaaaaaaak..","..kaaaaaaaaaak..","..kaaaaaaaaaak..",
    "..kaaaaaaaaaak..","..kaaaaaaaaaak..","..kaaaaaaaaaak..","..kaaaaaaaaaak..",
    "..kkkkkkkkkkkk..","................","................","................"]},
  "t-ellipse":{p:{k:"#0A0A0A",a:"#1084D0"},g:[
    "................",".......kk.......","....kkkkkkkk....","...kkaaaaaakk...",
    "..kkaaaaaaaakk..","..kaaaaaaaaaak..","..kaaaaaaaaaak..",".kkaaaaaaaaaakk.",
    ".kkaaaaaaaaaakk.","..kaaaaaaaaaak..","..kaaaaaaaaaak..","..kkaaaaaaaakk..",
    "...kkaaaaaakk...","....kkkkkkkk....",".......kk.......","................"]},
  "t-text":{p:{k:"#0A0A0A"},g:[
    "................","................","..kkkkkkkkkkkk..","..kkkkkkkkkkkk..",
    "..k....kk....k..",".......kk.......",".......kk.......",".......kk.......",
    ".......kk.......",".......kk.......",".......kk.......",".......kk.......",
    ".....kkkkkk.....",".....kkkkkk.....","................","................"]},
  "t-image":{p:{k:"#0A0A0A",s:"#8FD3FF",y:"#FFD24A",g:"#3C8C3C"},g:[
    "................","................",".kkkkkkkkkkkkkk.",".kssssssssssssk.",
    ".kssssssssyyssk.",".ksssssssyyyysk.",".kssssssssyyssk.",".kssssgsssssssk.",
    ".ksssgggssssssk.",".kssgggggsssgsk.",".ksgggggggsgggk.",".kggggggggggggk.",
    ".kggggggggggggk.",".kkkkkkkkkkkkkk.","................","................"]},
  "t-eyedrop":{p:{k:"#0A0A0A",w:"#FFFFFF",a:"#E0442B"},g:[
    "................","...........kk...","..........kaak..",".........kaaaak.",
    ".........kkaakk.",".........kwkkk..","........kwk.....",".......kwk......",
    "......kwk.......",".....kwk........","....kwk.........","...kwk..........",
    "..kwk...........",".kwk............",".aa.............","................"]},
  "t-pen":{p:{k:"#0A0A0A",w:"#FFFFFF",a:"#1084D0"},g:[
    "................","................",".......kk.......","......kwwk......",
    "......kwwk......",".....kwwwwk.....",".....kwkkwk.....","....kwwkkwwk....",
    "....kwwwwwwk....",".....kwwwwk.....",".....kkkkkk.....",".....kaaaak.....",
    ".....kaaaak.....",".....kkkkkk.....","................","................"]},
  "t-pencil":{p:{k:"#0A0A0A",y:"#F2C94C",e:"#F29BB0",w:"#EAD9B8"},g:[
    "................","............kk..","...........keek.","..........keek..",
    ".........kyyk...","........kyyk....",".......kyyk.....","......kyyk......",
    ".....kyyk.......","....kyyk........","...kyyk.........","..kyyk..........",
    ".kwwk...........",".kkk............",".k..............","................"]},
  "t-erase":{p:{k:"#0A0A0A",w:"#FFFFFF",e:"#F29BB0"},g:[
    "................","................","........kkkkkk..",".......keeeeeek.",
    "......keeeeeeek.",".....keeeeeeek..","....kwkeeeeek...","...kwwwkeeek....",
    "..kwwwwwkek.....","..kwwwwwwk......","...kwwwwk.......","....kkkk........",
    "................","................",".kkkkkkkkkkkkkk.","................"]},
  "t-fill":{p:{k:"#0A0A0A",w:"#FFFFFF",a:"#1084D0"},g:[
    "................","................","......kk........",".....kwwk.......",
    "....kwwwwk......","...kwwwwwwk.....","..kwwwwwwwwk....",".kwwwwwwwwwwk...",
    "..kwwwwwwwwkak..","...kwwwwwwkaaak.","....kwwwwk.kaak.",".....kwwk...kak.",
    "......kk.....k..","................","................","................"]},
  "app-banner":{p:{k:"#0A0A0A",a:"#E0442B",w:"#FFFFFF",b:"#14110E"},g:[
    "................","................","................","................",
    "kkkkkkkkkkkkkkkk","kaaaaaaaaaaaaaak","kawwwwwwwabbbbak","kaaaaaaaaabbbbak",
    "kawwwwwaaabbbbak","kaaaaaaaaabbbbak","kaaaaaaaaaaaaaak","kkkkkkkkkkkkkkkk",
    "................","................","................","................"]},
  "app-type":{p:{k:"#0A0A0A",w:"#F4F1E9",a:"#E0442B"},g:[
    "................",".kkkkkkkkkkkkkk.",".kwwwwwwwwwwwwk.",".kwkkkkkkkkkkwk.",
    ".kwkkkkkkkkkkwk.",".kwwwwwkkwwwwwk.",".kwwwwwkkwwwwwk.",".kwwwwwkkwwwwwk.",
    ".kwwwwwkkwwwwwk.",".kwwwwwkkwwwwwk.",".kwwwwkkkkwwwwk.",".kwwwwwwwwwwwwk.",
    ".kwaaaaaaaaaawk.",".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.","................"]},
  "app-pixel":{p:{k:"#0A0A0A",a:"#57E0FF",b:"#FF5FA8",c:"#FFE08A"},g:[
    "................",".kkkkkkkkkkkkkk.",".kaaaabbbbcccck.",".kaaaabbbbcccck.",
    ".kaaaabbbbcccck.",".kaaaabbbbcccck.",".kbbbbccccaaaak.",".kbbbbccccaaaak.",
    ".kbbbbccccaaaak.",".kbbbbccccaaaak.",".kccccaaaabbbbk.",".kccccaaaabbbbk.",
    ".kccccaaaabbbbk.",".kccccaaaabbbbk.",".kkkkkkkkkkkkkk.","................"]},
  "app-layout":{p:{k:"#0A0A0A",w:"#FFFFFF",b:"#1084D0",s:"#8FAFCB"},g:[
    "................",".kkkkkkkkkkkkkk.",".kbbbbbbbbbbbbk.",".kbbbbbbbbbbbbk.",
    ".kkkkkkkkkkkkkk.",".kwwwwwwwwwwwwk.",".kwsssssssssswk.",".kwsssssssssswk.",
    ".kwsssssssssswk.",".kwwwwwwwwwwwwk.",".kwsssswwsssswk.",".kwsssswwsssswk.",
    ".kwsssswwsssswk.",".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.","................"]},
  "app-swatch":{p:{k:"#0A0A0A",a:"#E0442B",b:"#EFA845",c:"#4FD1C5"},g:[
    "................","................",".kkkk...........",".kaak...........",
    ".kaak.kkkk......",".kaak.kbbk......",".kaak.kbbk.kkkk.",".kaak.kbbk.kcck.",
    ".kaak.kbbk.kcck.",".kaak.kbbk.kcck.",".kaak.kbbk.kcck.",".kaak.kbbk.kcck.",
    ".kaak.kbbk.kcck.",".kaak.kbbk.kcck.",".kkkk.kkkk.kkkk.","................"]},
  "app-cutout":{p:{k:"#0A0A0A",a:"#E0442B",w:"#FFFFFF"},g:[
    "................","...kk......kk...","....kk....kk....",".....kk..kk.....",
    ".....kk..kk.....","......kkkk......",".......ww.......","......kkkk......",
    "......kkkk......",".....kk..kk.....","..aaaa....aaaa..",".aa..aa..aa..aa.",
    ".a....a..a....a.",".aa..aa..aa..aa.","..aaaa....aaaa..","................"]},
  "suite":{p:{k:"#0A0A0A",t:"#E8D9B8",a:"#E0442B",b:"#1084D0",c:"#4FD1C5",d:"#3C8C3C"},g:[
    "................","................",".....kkkkkk.....","...kkttttttkk...",
    "..kkttttbbttkk..",".kktaattbbtttkk.",".kttaattttttcck.","kkttttttttttcckk",
    "kttttttttttttttk","kkttddttttttttkk",".kttddtttkkkttk.",".kkttttttk.ktkk.",
    "..kktttttkkkkk..","...kkttttttkk...",".....kkkkkk.....","................"]},
  "logoff":{p:{k:"#0A0A0A",y:"#FFD24A"},g:[
    "................","................","................","................",
    "..kkkk..........",".kyyyyk.........","kyykkyykkkkkkkk.","kyk..kyyyyyyyyyk",
    "kyykkyykkkkkkkkk",".kyyyyk....kyk..","..kkkk.....kkk..","................",
    "................","................","................","................"]},
};

// A client's own icon if one has been drawn, else the discipline's.
// dom is the client domain; the slug drops dots and any leading www.
ICON_ART["t-pick"] = ICON_ART["t-eyedrop"];

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
