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
  /* ── the room: leaving the desk, and switching off ── */
  standup:{p:{k:"#0A0A0A",a:"#7CF9C0"},g:[
    "................",".......kk.......","......kaak......",".....kaaaak.....",
    "....kaaaaaak....","...kaaaaaaaak...","..kkkkaaaakkkk..",".....kaaaak.....",
    ".....kaaaak.....",".....kaaaak.....",".....kaaaak.....",".....kaaaak.....",
    ".....kkkkkk.....","................","................","................"]},
  shutdown:{p:{r:"#E0442B"},g:[
    "................",".......rr.......","...rr..rr..rr...","..rr...rr...rr..",
    ".rr....rr....rr.",".rr....rr....rr.","rr.....rr.....rr","rr.....rr.....rr",
    "rr............rr","rr............rr",".rr..........rr.",".rr..........rr.",
    "..rr........rr..","...rrr....rrr...",".....rrrrrr.....","................"]},
  "logoff":{p:{k:"#0A0A0A",y:"#FFD24A"},g:[
    "................","................","................","................",
    "..kkkk..........",".kyyyyk.........","kyykkyykkkkkkkk.","kyk..kyyyyyyyyyk",
    "kyykkyykkkkkkkkk",".kyyyyk....kyk..","..kkkk.....kkk..","................",
    "................","................","................","................"]},
};

// A client's own icon if one has been drawn, else the discipline's.
// dom is the client domain; the slug drops dots and any leading www.
// Hustle: the pager, the gig board, a job ticket.
Object.assign(ICON_ART, {
  pager:{p:{k:"#0A0A0A",b:"#3A3A44",s:"#9BE7A8",t:"#1F5A2B",w:"#C8C8D0"},g:[
    "................","................","..kkkkkkkkkkkk..",".kbbbbbbbbbbbbk.",
    ".kbkkkkkkkkkkbk.",".kbksssssssskbk.",".kbksttsttsskbk.",".kbksssssssskbk.",
    ".kbkkkkkkkkkkbk.",".kbbbbbbbbbbbbk.",".kbwwbbwwbbwwbk.",".kbbbbbbbbbbbbk.",
    "..kkkkkkkkkkkk..","................","................","................"]},
  gigslist:{p:{k:"#0A0A0A",w:"#FFFFFF",l:"#8A8A96",p:"#7B2FBE",r:"#E0442B"},g:[
    "................",".......rr.......","......rrrr......",".kkkkkkrrkkkkkk.",
    ".kwwwwwwkwwwwwk.",".kwppppwwwwwwwk.",".kwwwwwwwwwwwwk.",".kwllllllllllwk.",
    ".kwllllllwwwwwk.",".kwwwwwwwwwwwwk.",".kwppppppwwwwwk.",".kwllllllllllwk.",
    ".kwllllwwwwwwwk.",".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.","................"]},
  ticket:{p:{k:"#0A0A0A",y:"#F2D27A",r:"#C2452C",d:"#8A6A2A"},g:[
    "................","................","................","kkkkkkkkkkkkkkkk",
    "kyyyyyyykyyyyyyk","kyrrrrryyyyyyyyk","kyyyyyyykyydddyk",".kyddddyyyyyyyk.",
    ".kyyyyyykyydddk.","kyddddyyyyyyyyyk","kyyyyyyykyyyyyyk","kkkkkkkkkkkkkkkk",
    "................","................","................","................"]},
});
// The reference board's pushpin, and the shape builder.
Object.assign(ICON_ART, {
  camera:{p:{k:"#0A0A0A",w:"#D8D8DC",b:"#1F3A6B",l:"#7EC8F0",r:"#E0442B",m:"#8A8A96"},g:[
    "................",".....kkkkkk.....","....kwwwwwwk....","...kwwkkkkwwk...",
    "...kwkbbbbkwk...","..kwwkbllbkwwk..","..kwwkbllbkwwk..","...kwkbbbbkwk...",
    "...kwwkkkkwwk...","....kwwwwwrk....",".....kkkkkk.....",".......kk.......",
    ".......kk.......",".....kkkkkk.....","....kmmmmmmk....","....kkkkkkkk...."]},
  "ref":{p:{k:"#0A0A0A",r:"#C2452C",w:"#F6F7F2",y:"#FFF3C4",m:"#8A8A96"},g:[
    "................","......kkkk......",".....krrrrk.....",".....krwrrk.....",
    "......krrk......","....kkkrrkkk....","...krrrrrrrrk...","....kkkkkkkk....",
    ".......kk.......",".kkkkkkmkkkkkk..",".kyyyyykyyyyyk..",".kyyyyyyyyyyyk..",
    ".kyyyyyyyyyyyk..",".kyyyyyyyyyyyk..",".kkkkkkkkkkkkk..","................"]},
  "t-build":{p:{k:"#0A0A0A",a:"#1084D0",b:"#E0442B",p:"#FF5FA8"},g:[
    "................","..kkkkkk........","..kaaaak........","..kaaaakkkkk....",
    "..kaaaakbbbk....","..kaaaakbbbk....","..kkkkkbbbbk....","......kbbbbk....",
    "......kkkkkk....","................","..pp..pp..pp....","...........pp...",
    "............pp..",".............p..","................","................"]},
});
// The taskbar's Arrange button: two windows side by side.
ICON_ART.arrange = {p:{k:"#0A0A0A",b:"#000080",c:"#1084D0",w:"#FFFFFF",s:"#808080"},g:[
  "................","kkkkkkk..kkkkkkk","kbbbbck..kbbbbck","kkkkkkk..kkkkkkk",
  "kwwwwwks.kwwwwwk","kwwwwwks.kwwwwwk","kwwwwwks.kwwwwwk","kwwwwwks.kwwwwwk",
  "kwwwwwks.kwwwwwk","kwwwwwks.kwwwwwk","kwwwwwks.kwwwwwk","kkkkkkks.kkkkkkk",
  ".sssssss..ssssss","................","................","................"]};
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
      // A colour can be a CSS variable (the suite re-inks its icons per look);
      // a presentation attribute can't hold one, a style can.
      const c = art.p[ch];
      r += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" ' + (c.startsWith("var(") ? 'style="fill:' + c + '"' : 'fill="' + c + '"') + '/>';
      x += n;
    }
  });
  return '<svg viewBox="0 0 16 16" width="' + px + '" height="' + px +
         '" shape-rendering="crispEdges" aria-hidden="true">' + r + '</svg>';
}

/* ── the hourglass ─────────────────────────────────────────
 * Not a static icon: the sand has to move. Same 16x16 grid and the same
 * crisp edges as everything above, but the rows are filled at draw time from
 * how much of the pause is left. The number goes over it in the DOM, where it
 * stays legible at any fill.
 */
const GLASS_ROWS = [
  null,                              // 0  cap
  [4, 8], [4, 8], [5, 6], [6, 4], [6, 4], [7, 2],   // 1-6  upper bulb
  [7, 2], [7, 2],                                    // 7-8  the neck
  [7, 2], [6, 4], [6, 4], [5, 6], [4, 8], [4, 8],    // 9-14 lower bulb
  null                               // 15 cap
];
const GLASS_TOP = [1, 2, 3, 4, 5, 6];
const GLASS_BOT = [14, 13, 12, 11, 10, 9];

// ratio 0..1 of sand left; phase animates the falling grain; tone picks the
// sand colour — "calm", "low", or "out".
function hourglassSVG(ratio, px, phase, tone){
  const r = Math.max(0, Math.min(1, Number(ratio) || 0));
  const sand = tone === "out" ? "#E8563B" : tone === "low" ? "#E8913B" : "#E8C36A";
  const sandD = tone === "out" ? "#B33A24" : tone === "low" ? "#B86A1E" : "#B8933E";
  const frame = "#2E2318", glass = "#9FB4B8", lit = "#D7E4E6";
  const put = (x, y, w, h, c) =>
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>';

  let s = put(3, 0, 10, 1, frame) + put(3, 15, 10, 1, frame) +
          put(3, 1, 1, 1, frame) + put(12, 1, 1, 1, frame) +
          put(3, 14, 1, 1, frame) + put(12, 14, 1, 1, frame);

  // the empty glass, then the sand on top of it
  GLASS_ROWS.forEach((row, y) => { if (row) s += put(row[0], y, row[1], 1, glass); });

  const held = Math.round(GLASS_TOP.length * r);             // rows still up top
  GLASS_TOP.slice(GLASS_TOP.length - held).forEach((y) => {
    const [x, w] = GLASS_ROWS[y];
    s += put(x, y, w, 1, sand);
  });
  const piled = Math.round(GLASS_BOT.length * (1 - r));      // rows fallen through
  GLASS_BOT.slice(0, piled).forEach((y) => {
    const [x, w] = GLASS_ROWS[y];
    s += put(x, y, w, 1, sand);
  });
  if (piled) s += put(GLASS_ROWS[14][0], 14, GLASS_ROWS[14][1], 1, sandD);
  if (held)  s += put(7, 6, 2, 1, sandD);

  if (r > 0 && r < 1) s += put(7 + (phase % 2), 7 + (Math.floor(phase / 2) % 2), 1, 1, sand);
  s += put(4, 1, 1, 1, lit) + put(4, 9, 1, 1, lit);          // one highlight, so it reads as glass

  return '<svg viewBox="0 0 16 16" width="' + px + '" height="' + px +
         '" shape-rendering="crispEdges" aria-hidden="true">' + s + '</svg>';
}

// A full glass, for the taskbar and anywhere a static one will do.
ICON_ART.hourglass = {p:{k:"#2E2318",s:"#E8C36A",d:"#B8933E"},g:[
  "...kkkkkkkkkk...","...kssssssssk...","....kssssssk....",".....kssssk.....",
  ".....kssssk.....","......kssk......","......ksdk......","......ksdk......",
  "......ksdk......","......kssk......",".....kssssk.....",".....kssssk.....",
  "....kssssssk....","...kssssssssk...","...kssssssssk...","...kkkkkkkkkk..."]};

ICON_ART.roomedit = {p:{k:"#0A0A0A",w:"#E8E4DA",b:"#4E6E88",a:"#E8913B",g:"#7FA38C"},g:[
  "................",".kkkkkkkkkkkkkk.",".kwwwwwwwwwwwwk.",".kwbbwwwwwwaawk.",
  ".kwbbwwwwwwaawk.",".kwwwwwggwwaawk.",".kwwwwwggwwwwwk.",".kwwbbwggwwwwwk.",
  ".kwwbbwggwwwwwk.",".kwwwwwwwwwwwwk.",".kkkkkkkkkkkkkk.","......kaak......",
  ".....kaaaak.....","....kaaaaaak....","...kkkkkkkkkk...","................"]};
// The tray speaker, on and off.
Object.assign(ICON_ART, {
  sound:{p:{k:"#0A0A0A",w:"#E8E8EC",g:"#8A8A96"},g:[
    "................","................",".......k........","......kk....k...",
    ".....kwk.....k..","kkkkkwwk..k...k.","kwwwwwwk...k..k.","kwgwwwwk...k..k.",
    "kwgwwwwk...k..k.","kwwwwwwk...k..k.","kkkkkwwk..k...k.",".....kwk.....k..",
    "......kk....k...",".......k........","................","................"]},
  soundoff:{p:{k:"#0A0A0A",w:"#E8E8EC",g:"#8A8A96",r:"#C2452C"},g:[
    "................","................",".......k........","......kk........",
    ".....kwk........","kkkkkwwk........","kwwwwwwk.r...r..","kwgwwwwk..r.r...",
    "kwgwwwwk...r....","kwwwwwwk..r.r...","kkkkkwwk.r...r..",".....kwk........",
    "......kk........",".......k........","................","................"]},
});

// The browser's buttons, the tools Hustle adds to it and to a call, and the
// taskbar's Arrange menu: pictures where there were words and glyphs.
Object.assign(ICON_ART, {
  "nav-back":{p:{k:"#0A0A0A",g:"#2E9A3E",l:"#8BE09A"},g:[
    "................","................","......k.........",".....kk.........",
    "....kgk.........","...kggkkkkkkkk..","..kgllllllllllk.",".kgggggggggggggk",
    ".kgggggggggggggk","..kgggggggggggk.","...kggkkkkkkkk..","....kgk.........",
    ".....kk.........","......k.........","................","................"]},
  "nav-stop":{p:{k:"#0A0A0A",r:"#D23A2A",w:"#FFFFFF"},g:[
    "................","....kkkkkkkk....","...krrrrrrrrk...","..krrrrrrrrrrk..",
    ".krrwwrrrrwwrrk.",".krrrwwrrwwrrrk.",".krrrrwwwwrrrrk.",".krrrrrwwrrrrrk.",
    ".krrrrwwwwrrrrk.",".krrrwwrrwwrrrk.",".krrwwrrrrwwrrk.","..krrrrrrrrrrk..",
    "...krrrrrrrrk...","....kkkkkkkk....","................","................"]},
  "nav-reload":{p:{k:"#0A0A0A",b:"#2F6FC0",l:"#9CC4F0"},g:[
    "................","................",".....kkkkk..k...","...kkbbbbbkkbk..",
    "..kbbllllbbbbk..","..kbk....kbbbk..",".kbk....kbbbbk..",".kbk.....kkkkk..",
    ".kbk............",".kbk.......kbk..","..kbk.....kbk...","..kbbk...kbbk...",
    "...kbbbbbbbk....","....kkkkkkk.....","................","................"]},
  "nav-home":{p:{k:"#0A0A0A",r:"#C2452C",w:"#F2ECE0",d:"#8A6A2A",b:"#5FC9E8"},g:[
    "................",".......kk.......","......krrk......",".....krrrrk.kk..",
    "....krrrrrrkdk..","...krrrrrrrrkk..","..krrrrrrrrrrk..",".kkkkkkkkkkkkkk.",
    "..kwwwwwwwwwwk..","..kwbbwwwwkkwk..","..kwbbwwwwkdwk..","..kwwwwwwwkdwk..",
    "..kwwwwwwwkdwk..","..kkkkkkkkkkkk..","................","................"]},
  clip:{p:{k:"#0A0A0A",m:"#B8BCC2",w:"#F4F4F4",r:"#C2452C"},g:[
    "................","..kk........kk..",".kmmk......kmmk.",".kmwmk....kmwmk.",
    "..kmwmk..kmwmk..","...kmwmkkmwmk...","....kmwmmwmk....",".....kmmmmk.....",
    ".....kkmmkk.....","....krrkkrrk....","...krkk..kkrk...","...kr.k..k.rk...",
    "...krkk..kkrk...","....krk..krk....",".....k....k.....","................"]},
  compare:{p:{k:"#0A0A0A",w:"#FFFFFF",n:"#000080",g:"#2E9A3E",r:"#C2452C"},g:[
    "................","kkkkkkkkkkkkkkkk","knnnnnknnnnknnnk","knnnnnknnnnknnnk",
    "kkkkkkkkkkkkkkkk","kwwwwwkwgwwkwrwk","kwwwwwkgwgwkrwrk","kwwwwwkwwwwkwwwk",
    "kkkkkkkkkkkkkkkk","kwwwwwkwrwwkwgwk","kwwwwwkrwrwkgwgk","kwwwwwkwwwwkwwwk",
    "kkkkkkkkkkkkkkkk","................","................","................"]},
  pitch:{p:{k:"#0A0A0A",w:"#FFFFFF",d:"#3A3A44"},g:[
    "................",".kkkkkkkkkkkkkk.","kwwwwwwwwwwwwwwk","kwddwdddwddwwwwk",
    "kwwwwwwwwwwwwwwk","kwdddwddwdddwwwk","kwwwwwwwwwwwwwwk","kwddwddddwwwwwwk",
    "kwwwwwwwwwwwwwwk",".kkkkkwkkkkkkkk.",".....kwk........","....kwk.........",
    "....kk..........","................","................","................"]},
  cascade:{p:{k:"#0A0A0A",n:"#000080",w:"#FFFFFF",f:"#C0C0C0"},g:[
    "kkkkkkkk........","knnnnnnk........","kffffffk........","kffkkkkkkkk.....",
    "kffknnnnnnk.....","kkkkffffffk.....","...kffkkkkkkkk..","...kffknnnnnnk..",
    "...kkkkwwwwwwk..","......kwwwwwwk..","......kwwwwwwk..","......kwwwwwwk..",
    "......kkkkkkkk..","................","................","................"]},
  "tile-cols":{p:{k:"#0A0A0A",n:"#000080",w:"#FFFFFF"},g:[
    "................","kkkkkkk.kkkkkkk.","knnnnnk.knnnnnk.","kwwwwwk.kwwwwwk.",
    "kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.",
    "kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.","kwwwwwk.kwwwwwk.",
    "kkkkkkk.kkkkkkk.","................","................","................"]},
  "tile-rows":{p:{k:"#0A0A0A",n:"#000080",w:"#FFFFFF"},g:[
    "kkkkkkkkkkkkkkk.","knnnnnnnnnnnnnk.","kwwwwwwwwwwwwwk.","kwwwwwwwwwwwwwk.",
    "kwwwwwwwwwwwwwk.","kkkkkkkkkkkkkkk.","................","kkkkkkkkkkkkkkk.",
    "knnnnnnnnnnnnnk.","kwwwwwwwwwwwwwk.","kwwwwwwwwwwwwwk.","kwwwwwwwwwwwwwk.",
    "kkkkkkkkkkkkkkk.","................","................","................"]},
  "min-all":{p:{k:"#0A0A0A",f:"#C0C0C0",n:"#000080"},g:[
    "................","................","................","................",
    "................","................","................","................",
    "................","..kkkkkk.kkkkkk.","..knnnnk.knnnnk.","..kffffk.kffffk.",
    "..kkkkkk.kkkkkk.","................","kkkkkkkkkkkkkkkk","kffffffffffffffk"]},
  restore:{p:{k:"#0A0A0A",n:"#000080",w:"#FFFFFF"},g:[
    "................","....kkkkkkkkkkk.","....knnnnnnnnnk.","....kwwwwwwwwwk.",
    ".kkkkkkkkkkkwwk.",".knnnnnnnnnkwwk.",".kwwwwwwwwwkwwk.",".kwwwwwwwwwkwwk.",
    ".kwwwwwwwwwkkkk.",".kwwwwwwwwwk....",".kwwwwwwwwwk....",".kkkkkkkkkkk....",
    "................","................","................","................"]},
});
// Forward is back, the other way round.
ICON_ART["nav-fwd"] = { p: ICON_ART["nav-back"].p, g: ICON_ART["nav-back"].g.map((r) => r.split("").reverse().join("")) };
