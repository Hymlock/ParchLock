// D149 character tracker: pure-Node proof of the parsing and calibration rules.
//
// Every SCORE reply, status row and death banner asserted here was captured live
// from the real module named beside it in this session -- none of them is a
// plausible-looking invention. The live counterpart is tools/stat-tracker-live.js.
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};

const S = require(path.resolve(__dirname, "..", "js", "StatTracker.js"));

// ---- status columns ------------------------------------------------------
// wump2ka, measured: "Room #2   Score: 1   A large, textured cavern   Health: 81%"
let cols = S.splitColumns("Room #2   Score: 1   A large, textured cavern   Health: 81%");
let stats = S.statsFromColumns(cols);
assert(stats.score && stats.score.value === 1, "wump2ka's Score column is read (1)");
assert(stats.health && stats.health.value === 81 && stats.health.unit === "percent",
    "and its Health column is read as a PERCENT (81%), not a bare number");
assert(!stats["a large"], "a prose column that is not a labelled number never becomes a stat");

// TreasuresofaSlaversKingdom, measured.
stats = S.statsFromColumns(S.splitColumns(
    "OPEN PLAIN   HIT POINTS: 15/15   Paths: North South East West   QUEST RATE: 0/500"));
assert(stats.health && stats.health.value === 15 && stats.health.max === 15 && stats.health.unit === "fraction",
    "HIT POINTS: 15/15 parses as a FRACTION and canonicalises to health -- a first-pass regex missed this shape entirely");
assert(stats["quest rate"] && stats["quest rate"].max === 500,
    "a game's own invented stat (QUEST RATE: 0/500) is kept under its own printed name rather than discarded");
assert(!stats.paths, "'Paths: North South East West' is not numeric and is not mistaken for a stat");

// pentari / Seastalker / CtDoom, measured.
assert(S.statsFromColumns(S.splitColumns("Your Quarters   Score: 0   Moves: 3")).turns.value === 3,
    "Moves and Turns both canonicalise to one stat (pentari says Moves, Seastalker says Turns)");

// ---- SCORE replies, every family measured verbatim ----------------------
const SCORE_CASES = [
    ["Zork 1", "Your score is 0 (total of 350 points), in 1 move. This gives you the rank of Beginner.", 0, 350, 1, "Beginner"],
    ["Enchanter", "Your score is 0 of a possible 400, in 1 move. This puts you in the class of Charlatan.", 0, 400, 1, "Charlatan"],
    ["Planetfall", "Your score would be 0 (out of 80 points). It is Day 1 of your adventure.", 0, 80, null, null],
    ["Advent", "You have so far scored 36 out of a possible 350, in 1 turn, earning you the rank of Adventurer.", 36, 350, 1, "Adventurer"],
    ["Anchorhead", "You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery.", 0, 100, null, null],
    ["pentari", "You have so far scored 0 out of a possible 70, in 3 turns.", 0, 70, 3, null],
    ["Sherlock", "[You have 0 out of 100 points, which earns you a ranking of Chief Superintendent of Scotland Yard.]", 0, 100, null, "Chief Superintendent of Scotland Yard"],
    ["Slavers", "You have so far scored 0 out of a possible 500, in 3 turns, earning you the rank of \"Peripatetic Bastard\".", 0, 500, 3, "Peripatetic Bastard"]
];
SCORE_CASES.forEach(([who, text, score, max, turns, rank]) => {
    const p = S.parseScoreReply(text);
    assert(p && p.score === score && p.max === max,
        who + ": score " + score + (max == null ? "" : " of " + max) + " read from its own wording");
    if (turns != null) assert(p.turns === turns, who + ": turn count " + turns + " read from the same reply");
    if (rank) assert(p.rank === rank, who + ": rank " + JSON.stringify(rank) + " read (quotes stripped)");
});

// wump2ka has NO maximum -- its second number is turns, and mistaking it for a
// maximum would draw a progress bar of 1 out of 3.
const w = S.parseScoreReply("You have so far scored 1 point in 3 turns.");
assert(w.score === 1 && w.max === null && w.turns === 3,
    "wump2ka reports no maximum at all, so no maximum is invented and its 3 is read as turns");

// LDoDoom answers outright.
const none = S.parseScoreReply("There is no scoring in this game.");
assert(none && none.unavailable === true && none.scored === false,
    "LDoDoom's 'There is no scoring in this game.' is a POSITIVE finding that suppresses the score row");

assert(S.parseScoreReply("You can't see any such thing.") === null,
    "an unrelated reply yields nothing rather than a zero score");

// ---- DIAGNOSE, measured ------------------------------------------------
let d = S.parseDiagnoseReply("You are in perfect health. You can be killed by a serious wound.");
assert(d && d.health && d.health.unit === "ordinal",
    "Zork 1's DIAGNOSE gives a qualitative health BAND, never an invented percentage");
d = S.parseDiagnoseReply("You are wide awake. You are well hydrated and well fed.");
assert(d && d.sleep.band === "rested" && d.thirst.band === "hydrated" && d.hunger.band === "fed",
    "Enchanter's DIAGNOSE yields three separate stats at once: sleep, thirst and hunger");
d = S.parseDiagnoseReply("You are in perfect health. You feel well-rested. You seem to be well-fed.");
assert(d && d.health.band === "perfect" && d.sleep.band === "rested" && d.hunger.band === "fed",
    "Planetfall's hyphenated 'well-rested'/'well-fed' parse the same as Enchanter's unhyphenated wording");
assert(S.parseDiagnoseReply("That's not a verb I recognise.") === null,
    "an Inform game, which has no DIAGNOSE, contributes nothing rather than an empty gauge");

// ---- end-of-game banners ----------------------------------------------
// Zork 1, measured: four asterisks. Inform uses three.
assert(S.bannersIn("Oh, no! A lurking grue devoured you! **** You have died ****")[0].kind === "death",
    "Zork 1's four-asterisk '**** You have died ****' is detected");
assert(S.bannersIn("*** You have died ***")[0].kind === "death",
    "Inform's three-asterisk form is detected by the same rule");
assert(S.bannersIn("*** You have won ***")[0].kind === "win",
    "a win is a win, not a death");
assert(S.bannersIn("*** You have quit ***")[0].kind === "quit",
    "a voluntary quit is neither");
assert(S.bannersIn("*** You have been eaten by a dragon ***")[0].kind === "death",
    "a module's OWN wording still counts as a death: anything that is not a win and not a quit is an involuntary ending, which is what makes this work on modules nobody has probed");

// ---- death counting ---------------------------------------------------
S.reset();
S.observeText("*** You have died ***", 1);
assert(S.model().deaths === 1, "a death is counted");
S.observeText("*** You have died ***", 1);
assert(S.model().deaths === 1, "the SAME banner re-rendered on the same turn is not a second death");
S.observeText("*** You have died ***", 2);
assert(S.model().deaths === 2, "dying again on a later turn does count");
S.observeText("*** You have won ***", 3);
assert(S.model().deaths === 2 && S.model().wins === 1, "winning does not increment deaths");

// ---- the score cue must not fire on a decrease -----------------------
// Measured in Zork 1: dying cost 10 points, 35 -> 25.
S.reset();
const m = S.model();
S.recordObservation(m, "score", { key: "score", label: "Score", value: 35, max: null, unit: "plain" });
S.recordObservation(m, "score", { key: "score", label: "Score", value: 35, max: null, unit: "plain" });
S.takeEvents();
S.recordObservation(m, "score", { key: "score", label: "Score", value: 25, max: null, unit: "plain" });
let evs = S.takeEvents();
assert(evs.length === 1 && evs[0].type === "score-down",
    "a score DECREASE emits score-down, never score-up -- Zork 1 charges 10 points for dying and the horn must not sound");
S.recordObservation(m, "score", { key: "score", label: "Score", value: 45, max: null, unit: "plain" });
evs = S.takeEvents();
assert(evs.length === 1 && evs[0].type === "score-up" && evs[0].delta === 20,
    "and a real increase emits score-up with its delta");

// ---- two sightings required before anything is displayed -------------
S.reset();
const m2 = S.model();
S.recordObservation(m2, "score", { key: "score", label: "Score", value: 0, max: null, unit: "plain" });
assert(S.visibleStats().length === 0,
    "one sighting shows nothing: a single stray line of prose containing a colon must not install a permanent gauge");
S.recordObservation(m2, "score", { key: "score", label: "Score", value: 0, max: null, unit: "plain" });
assert(S.visibleStats().some(s => s.key === "score"), "a second sighting confirms it");

// ---- an n/m denominator is re-read, never latched --------------------
S.reset();
const m3 = S.model();
S.recordObservation(m3, "health", { key: "health", label: "HIT POINTS", value: 15, max: 15, unit: "fraction" });
S.recordObservation(m3, "health", { key: "health", label: "HIT POINTS", value: 12, max: 20, unit: "fraction" });
assert(m3.stats.health.max === 20,
    "the maximum of an n/m gauge is re-read every turn: Slavers was only ever observed at full health, so there is no evidence its denominator is fixed");

// ---- score suppression ------------------------------------------------
S.reset();
const m4 = S.model();
S.recordObservation(m4, "score", { key: "score", label: "Score", value: 0, max: null, unit: "plain" });
S.recordObservation(m4, "score", { key: "score", label: "Score", value: 0, max: null, unit: "plain" });
assert(S.visibleStats().some(s => s.key === "score"), "score is visible before the no-scoring reply");
S.applyScoreReply("There is no scoring in this game.");
assert(!S.visibleStats().some(s => s.key === "score"),
    "and is gone for good afterwards -- an explicit absence outranks two sightings");

// ---- nothing relevant means nothing shown ----------------------------
S.reset();
assert(S.visibleStats().length === 0,
    "a module that tracks nothing yields zero chips, so the whole block can be hidden rather than showing empty furniture");

// ---- deaths appear only once they exist ------------------------------
S.reset();
assert(!S.visibleStats().some(s => s.key === "deaths"), "a fresh module shows no death row");
S.observeText("*** You have died ***", 1);
assert(S.visibleStats().some(s => s.key === "deaths" && s.value === 1),
    "the death row appears with the first death");

// ---- global promotion requires a real CHANGE ------------------------
// At turn one a scoreless game has dozens of zero globals; any of them would
// "match" a score of 0. Only a change tells them apart.
S.reset();
S._samples = [
    { observed: { score: { key: "score", value: 0, max: null, unit: "plain" } }, globals: [7, 0, 0, 0, 0] },
    { observed: { score: { key: "score", value: 0, max: null, unit: "plain" } }, globals: [7, 0, 0, 0, 0] }
];
const mg = S.model();
mg.stats.score = { key: "score", value: 0, confirmed: true, source: "status" };
S.promoteGlobals(mg);
assert(mg.globals.score == null,
    "an unchanged score promotes NO global, however many slots happen to hold its value");
S._samples.push({ observed: { score: { key: "score", value: 36, max: null, unit: "plain" } }, globals: [7, 36, 2, 0, 0] });
S._samples[0].globals = [7, 0, 1, 0, 0];
S._samples[1].globals = [7, 0, 1, 0, 0];
S.promoteGlobals(mg);
assert(mg.globals.score === 1,
    "once the score really changes, the one slot that tracked it throughout is promoted (Advent's G1) -- learned, never assumed");

// ---- a contradicted slot is demoted ---------------------------------
S.reset();
const mc = S.model();
mc.stats.turns = { key: "turns", value: 105, confirmed: true, source: "status" };
mc.globals.turns = 2;
S.readConfirmedGlobals(mc, [0, 0, 999]);
assert(mc.globals.turns == null,
    "a slot that disagrees with the text is torn down rather than left feeding a wrong number -- this is what stops Anchorhead's constant G2 and Planetfall's clock being reported as turns");

// ---- header facts ----------------------------------------------------
// Deadline measured flags1 0x62; Zork 1 and Planetfall 0x60.
global.ZRamReader = {
    header: () => ({ version: 3, globals: 100 }),
    u8: () => 0x62,
    u16: () => 0,
    gameIdentityKey: () => "DEADLINE-TEST"
};
assert(S.headerFacts({}).clockGame === true,
    "Deadline's Flags1 bit 1 identifies it as a CLOCK game before a single turn is played");
global.ZRamReader.u8 = () => 0x60;
assert(S.headerFacts({}).clockGame === false, "Zork 1's 0x60 does not");
S.reset();
global.ZRamReader.u8 = () => 0x62;
S.observe({}, "South Lawn");
assert(S.model().scoreUnavailable === true,
    "and a clock game never offers a score row at all, which is why Deadline shows no score");

// ---- the v3 interpreter-status path ---------------------------------
// A v3 status line is drawn by the interpreter from globals 0/1/2, and every v3
// game in this app renders the room name alone (D137), so there is no text to
// verify against and the check must come from BEHAVIOUR.
function v3run(flags, slot2seq, slot1) {
    S.reset();
    let i = 0;
    global.ZRamReader = {
        header: () => ({ version: 3, globals: 0 }),
        u8: () => flags,
        u16: (mem, addr) => (addr === 2 ? slot1 : (addr === 4 ? slot2seq[Math.min(i, slot2seq.length - 1)] : 0)),
        gameIdentityKey: () => "V3-TEST-" + flags + "-" + slot2seq.join("_")
    };
    for (; i < slot2seq.length; i++) S.observe({}, "West of House");
    return S.model();
}

// Zork 1: slot 2 rises by 1 a turn.
let v3 = v3run(0x60, [1, 2, 3, 4], 35);
assert(v3.stats.turns && v3.stats.turns.value === 4,
    "a v3 slot that rises by one every turn is confirmed as the turn counter from its BEHAVIOUR, with no text to check against");
assert(v3.stats.score && v3.stats.score.value === 35 && v3.globals.score === 1,
    "and confirming it licenses the score in slot 1, because the same clause of the standard pairs them -- so Zork 1 shows a score with no status text and without spending a turn on SCORE");

// Planetfall: slot 2 climbs 40 a turn because it is a clock, not a counter.
v3 = v3run(0x60, [4580, 4620, 4660, 4700], 0);
assert(!v3.stats.turns && !v3.stats.score,
    "Planetfall's slot 2 jumps 40 a turn, fails the test, and registers NOTHING -- an honest absence instead of reporting its Galactic Standard Time clock as a turn count");

// A slot that goes backwards is not a turn counter either.
v3 = v3run(0x60, [10, 9, 8, 7], 5);
assert(!v3.stats.turns, "a slot that falls is rejected: turn counters do not run backwards");

// Deadline: a clock game pairs hours with minutes rather than score with turns.
v3 = v3run(0x62, [4, 7, 10, 13], 8);
assert(v3.stats.time && String(v3.stats.time.value) === "8:13",
    "Deadline's clock is assembled from slot 1 as hours and slot 2 as minutes (measured 8:04, 8:07, 8:10)");
assert(!v3.stats.score, "and a clock game still never grows a score row");

// Text outranks a seed.
S.reset();
const mt = S.model();
mt.stats.turns = { key: "turns", value: 999, confirmed: true, source: "status", seen: 2 };
S.setSeeded(mt, "turns", "Turns", 4, "counter", "global:2");
assert(mt.stats.turns.value === 999 && mt.stats.turns.source === "status",
    "a stat the game printed itself outranks a seeded slot and is not overwritten by it");

// ---- the source file is registered for offline use -------------------
const sw = fs.readFileSync(path.resolve(__dirname, "..", "service-worker.js"), "utf8");
assert(/StatTracker\.js/.test(sw),
    "js/StatTracker.js is in the service worker's precache list, or PWA clients would run without it");
const dist = fs.readFileSync(path.resolve(__dirname, "..", "make-dist.bat"), "utf8");
assert(/StatTracker\.js/.test(dist),
    "and in make-dist.bat's allow-list -- D120's tutorial.html shipped broken for exactly this reason");
const html = fs.readFileSync(path.resolve(__dirname, "..", "play.html"), "utf8");
assert(/StatTracker\.js/.test(html), "and is actually loaded by play.html");
assert(/id="pl-stats"/.test(html), "and the tracker has its mount point in the equipment sheet");


// ---- D167: identifying a stat's global from an announced change ----------
// The operator's requirement is that stats be read HEADLESSLY -- from RAM, not
// by asking the game. The obstacle was never reading a global, it was knowing
// WHICH one, and both libraries volunteer that for free: "Your score has just
// gone up by two points." costs no command and no turn.
[["Your score has just gone up by two points.", 2],
 ["[Your score has just gone up by one point.]", 1],
 ["Your score has just gone down by three points.", -3],
 ["[Your score has just gone up by 5 points.]", 5],
 ["Your score has just gone up by ten points.", 10]].forEach(function (c) {
    assert(S.parseScoreDelta(c[0]) === c[1],
        "a score notification is read as a delta: " + JSON.stringify(c[0].slice(0, 40)));
});
assert(S.parseScoreDelta("You can't see any such thing.") === null,
    "ordinary prose is never mistaken for a score change");

// One delta narrows; it does not guess.
S.reset();
var pm = S.model();
S._samples = [{ observed: {}, globals: [0, 5, 7, 0, 5] }];
S.pinScoreByDelta(pm, 2, [0, 7, 7, 0, 7]);
assert(pm.globals.score == null,
    "two globals moved by the announced amount, so NEITHER is pinned -- a coincidence must not become the score");
assert((pm.scoreCandidates || []).length === 2, "both are kept as candidates");

// A second notification intersects them down to one.
S._samples = [{ observed: {}, globals: [0, 7, 7, 0, 7] }];
S.pinScoreByDelta(pm, 3, [0, 10, 7, 0, 9]);
assert(pm.globals.score === 1,
    "the slot that moved correctly BOTH times is the score -- narrowed across events, never guessed from one");
assert(pm.stats.score && pm.stats.score.value === 10,
    "and its live value comes straight out of that global");
assert(String(pm.stats.score.source).indexOf("global:") === 0,
    "the source records that it is now read from RAM, not from text");

// Inform keeps a shadow copy of the score, so two slots can follow it forever.
// Measured on Anchorhead: globals 15 and 16 both move with the score. Once a
// second change has narrowed the field, a remaining tie is real and the
// candidates are interchangeable for display.
S.reset();
var tie = S.model();
S._samples = [{ observed: {}, globals: [0, 5, 5, 9] }];
S.pinScoreByDelta(tie, 2, [0, 7, 7, 9]);
assert(tie.globals.score == null, "the first change leaves the tie unresolved");
S._samples = [{ observed: {}, globals: [0, 7, 7, 9] }];
S.pinScoreByDelta(tie, 3, [0, 10, 10, 9]);
assert(tie.globals.score === 1,
    "after a second change two slots still moving together and holding the same value are interchangeable -- the lower is taken rather than deadlocking forever");
assert(tie.stats.score.value === 10, "and it reports the right number");

// A tie whose members DISAGREE is still ambiguous and waits.
S.reset();
var dis = S.model();
S._samples = [{ observed: {}, globals: [0, 5, 1] }];
S.pinScoreByDelta(dis, 2, [0, 7, 3]);
S._samples = [{ observed: {}, globals: [0, 7, 3] }];
S.pinScoreByDelta(dis, 2, [0, 9, 5]);
assert(dis.globals.score == null,
    "two slots that move together but hold DIFFERENT values are not interchangeable and stay unresolved");

// A known total settles it in a single step.
S.reset();
var pm2 = S.model();
pm2.stats.score = { key: "score", value: 5, confirmed: true, unit: "plain", kind: "score", seen: 2 };
S._samples = [{ observed: {}, globals: [0, 5, 5, 0] }];
S.pinScoreByDelta(pm2, 2, [0, 7, 7, 0]);
assert(pm2.globals.score == null || pm2.stats.score.value === 7,
    "with a known total the candidate must also HOLD that total after the change");

// A game with no score is never given one.
S.reset();
var pm3 = S.model();
pm3.scoreUnavailable = true;
S._samples = [{ observed: {}, globals: [0, 1] }];
S.pinScoreByDelta(pm3, 1, [0, 2]);
assert(pm3.globals.score == null && !pm3.stats.score,
    "a story that reported no scoring never grows a score row from a stray line");


console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
