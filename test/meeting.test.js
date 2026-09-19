"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../src/js/hustle/meeting.js");
const P = require("../src/js/content/portraits.js");

const TREE = {
  patience: 4,
  pause: 10000,
  opening: ["hi"],
  filler: ["…anyway.", "so, yeah."],
  options: {
    rules:  { ask: "Any technical rules?", reply: ["Eight colours at most."], reveals: ["palette"] },
    vibe:   { ask: "Vibe?", reply: ["dusk"] },
    ep12:   { ask: "Which episode?", requires: ["vibe"], reply: ["twelve"], reveals: ["dusk"] },
    money:  { ask: "More money?", reply: ["no"], cost: 3 },
    done:   { ask: "Thanks.", reply: ["bye"], end: true, cost: 0 },
  },
  challenges: {
    outline: { after: "rules", needsFact: "artrules", ask: "Including the outline?",
               reply: ["Including. Good catch."], reveals: ["outlinecount"] },
  },
  leave: ["gtg"],
};

// Run the clock in small steps, the way the window does.
function run(st, ms, step = 100){
  for (let t = 0; t < ms; t += step) st = M.tick(TREE, st, step);
  return st;
}
// Get to the point where the player can actually speak: the tick that ends
// their line is the one that turns the glass, so stop on it.
function ready(st){
  let guard = 0;
  while (!st.ended && st.speaking > 0 && guard++ < 500) st = M.tick(TREE, st, 100);
  return st;
}

test("meeting: the glass turns when they stop talking, and is cut to their attention", () => {
  let st = M.start(TREE);
  assert.ok(st.speaking > 0, "they open the call");
  assert.deepEqual(M.available(TREE, st), [], "you cannot talk over them");

  const before = st.sand;
  st = M.tick(TREE, st, 200);
  assert.equal(st.sand, before, "sand does not run while they speak");

  st = ready(st);
  assert.equal(st.sand, M.glassFor(TREE, st));
  assert.equal(M.ratio(st), 1);
  assert.equal(M.glassFor(TREE, st), 10000, "full attention, full glass");

  const tired = Object.assign({}, st, { patience: 1 });
  assert.ok(M.glassFor(TREE, tired) < 10000, "less attention, shorter pause");
  assert.equal(M.glassFor(TREE, tired), Math.round(10000 * (0.55 + 0.45 * 0.25)));
});

test("meeting: an unfilled pause costs a pip and they fill it themselves", () => {
  let st = ready(M.start(TREE));
  const pips = st.patience;
  st = run(st, st.sand + 300);

  assert.equal(st.silences, 1);
  assert.equal(st.patience, pips - 1, "a silence costs attention");
  assert.equal(st.log[st.log.length - 1].text, "…anyway.");
  assert.equal(st.log[st.log.length - 1].filler, true);
  assert.equal(st.ended, false, "one silence is not the end of the call");
  assert.ok(st.speaking > 0, "they are saying the filler line");
});

test("meeting: two silences back to back and they wrap up on their own", () => {
  let st = ready(M.start(TREE));
  st = run(st, st.sand + 200);          // first silence
  st = ready(st);
  st = run(st, st.sand + 200);          // second, with nothing said between
  assert.equal(st.ended, true);
  assert.equal(st.reason, "drifted");
  assert.equal(st.log[st.log.length - 1].text, "gtg");

  // Asking anything resets the run.
  let ok = ready(M.start(TREE));
  ok = run(ok, ok.sand + 200);
  ok = ready(ok);
  assert.equal(ok.runSilences, 1);
  ok = M.choose(TREE, ok, "vibe");
  assert.equal(ok.runSilences, 0);
  assert.equal(ok.ended, false);
});

test("meeting: the window opens on one reply, needs the clipping, and closes", () => {
  let st = ready(M.start(TREE));
  assert.equal(st.openWindow, null);

  st = M.choose(TREE, st, "rules");
  assert.equal(st.openWindow, "outline", "that reply contradicts their own page");
  st = ready(st);

  const unread = M.available(TREE, st, []).map((o) => o.id);
  assert.ok(!unread.includes("outline"), "you cannot challenge what you never clipped");

  const read = M.available(TREE, st, ["artrules"]);
  assert.equal(read[0].id, "outline", "the window leads the list");
  assert.equal(read[0].challenge, true);
  assert.equal(read[0].cost, 0, "catching them out is free");

  const caught = M.choose(TREE, st, "outline", ["artrules"]);
  assert.deepEqual(caught.caught, ["outline"]);
  assert.ok(caught.revealed.includes("outlinecount"));
  assert.equal(caught.openWindow, null);

  const lost = run(st, st.sand + 200);
  assert.deepEqual(lost.missed, ["outline"], "the window closes with the glass");
  assert.equal(lost.openWindow, null);
  assert.deepEqual(M.available(TREE, ready(lost), ["artrules"]).filter((o) => o.challenge), []);
});

test("meeting: turning the glass over buys the pause back, once", () => {
  let st = ready(M.start(TREE));
  st = run(st, st.sand - 600);
  assert.ok(M.ratio(st) < 0.1);
  assert.equal(M.canFlip(st), true);

  const pips = st.patience;
  st = M.flip(TREE, st);
  assert.equal(M.ratio(st), 1, "the sand is back");
  assert.equal(st.patience, pips - 1, "and it cost a pip");
  assert.equal(st.flips, 1);
  assert.equal(M.canFlip(st), false, "one flip a call, at this reputation");

  const richer = M.start(TREE, { flips: 3 });
  assert.equal(richer.maxFlips, 3);
});

test("meeting: dialogue rules still hold — follow-ups, one-shots, endings", () => {
  let st = ready(M.start(TREE));
  assert.ok(!M.available(TREE, st).some((o) => o.id === "ep12"), "locked until asked about the vibe");
  st = ready(M.choose(TREE, st, "vibe"));
  assert.ok(M.available(TREE, st).some((o) => o.id === "ep12"), "follow-up unlocked");
  assert.equal(M.choose(TREE, st, "vibe"), st, "one-shot options cannot repeat");

  const wrapped = M.choose(TREE, st, "done");
  assert.equal(wrapped.reason, "wrapped");
  assert.equal(wrapped.sand, 0, "no glass runs after the call closes");

  const broke = M.choose(TREE, st, "money");     // costs 3 of the 4 pips, minus one spent
  assert.equal(broke.ended, true);
  assert.equal(broke.reason, "bored");
  assert.equal(broke.log[broke.log.length - 1].text, "gtg");
});

test("meeting: the ticket gets an account of how it went", () => {
  let st = ready(M.start(TREE));
  st = ready(M.choose(TREE, st, "rules"));
  st = run(st, st.sand + 200);                   // let the window close
  st = ready(st);
  st = M.choose(TREE, st, "done");
  assert.deepEqual(M.summary(st), {
    asked: 2, caught: [], missed: ["outline"], silences: 1, flips: 0, ended: "wrapped",
  });
});

test("portraits: a handle is a person, and content can pin any of them", () => {
  const a = P.traits("batonpass_nell");
  assert.deepEqual(a, P.traits("batonpass_nell"), "the same person every launch");
  assert.notDeepEqual(a, P.traits("thimble_ines"), "different handles, different people");

  const pinned = P.traits("batonpass_nell", { style: "long", band: "#FF7A1A", specs: "none" });
  assert.equal(pinned.style, "long");
  assert.equal(pinned.band, "#FF7A1A");
  assert.equal(pinned.skin, a.skin, "what is not pinned still rolls the same way");

  assert.ok(P.STYLES.includes(a.style));
  assert.ok(P.SKIN.includes(a.skin));
  assert.deepEqual(P.palette("thimble_ines", null, { brand: "#E8B04B" }).length, 3);
});
