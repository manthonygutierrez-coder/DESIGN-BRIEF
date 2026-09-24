"use strict";
// What the soundtrack files are. Each arrangement goes four times round the
// sixteen-bar form, one time round per stage of a career, so a listener hears
// the band fill in the way a player does as their reputation grows.
const MusicTracks = {
  // Fullness is reputation / 80 in the game (js/music/theme.js).
  STAGES: [
    { fullness: 0, rep: 0, name: "Nobody knows you yet" },
    { fullness: 0.25, rep: 20, name: "A few jobs in" },
    { fullness: 0.5, rep: 40, name: "People know your name" },
    { fullness: 0.75, rep: 60, name: "Established" },
  ],
  ZONES: [
    { id: "hub", file: "1-hub", title: "Hub", where: "the desktop, mail and the gig board",
      adds: ["electric piano, a lazy bass and vinyl crackle", "soft drums, swung", "the tune, played lazily", "a warm pad: the whole band"],
      coda: { chord: "ep", bass: "sub", kick: "kickSoft", up: 0, bassUp: 0 } },
    { id: "hunt", file: "2-hunt", title: "Hunt", where: "the browser, the gig ticket and comparing rivals",
      adds: ["plucked bass and a curious marimba", "shaker, kick and rim", "chord stabs on the off-beats", "the tune on a pulse lead"],
      coda: { chord: "mallet", bass: "pluck", kick: "kick", up: 12, bassUp: 12 } },
    { id: "studio", file: "3-studio", title: "Studio", where: "the Design Suite",
      adds: ["a pulse arpeggio and a triangle bass", "four-on-the-floor chip drums", "the tune on a square lead", "an echo of it a third below"],
      coda: { chord: "pulse25", bass: "tri", kick: "kickChip", up: 12, bassUp: 0 } },
  ],
};

if (typeof module !== "undefined") module.exports = MusicTracks;
