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

// LLR3 SCORE, measured: experience is printed, and it is not the score.
const llrScore = "You are a level 1 rogue, with 0 experience points. You need 50 points to progress to the next level.";
const llrExp = S.parsePrintedMetrics(llrScore);
assert(llrExp && llrExp.experience && llrExp.experience.value === 0 && llrExp.experience.label === "EXP",
    "LLR score text surfaces the printed experience (0) as EXP");
assert(llrExp.experience.max === 50 && llrExp.experience.unit === "fraction",
    "LLR 'need 50 points to progress' is the next-level requirement beside current EXP");
assert(!llrExp.score && Object.keys(llrExp).length === 1,
    "the progress clause is not invented as a score or a second stat");
const exp20 = S.parsePrintedMetrics("You gained 20 exp.");
assert(exp20 && exp20.experience.value === 20 && exp20.experience.max == null,
    "a printed '20 exp' is experience, not an invented total");
assert(S.parsePrintedMetrics("EXP: 20/50").experience.max === 50,
    "an explicit EXP n/m form keeps the printed denominator");
const llrExp20 = S.parsePrintedMetrics("You are a level 1 rogue, with 20 experience points. You need 30 more points to progress to the next level.");
assert(llrExp20 && llrExp20.experience.value === 20 && llrExp20.experience.max === 50,
    "LLR remaining points are added to current EXP to recover the next-level threshold");
assert(S.parsePrintedMetrics("You have so far scored 1 point in 3 turns.") === null,
    "wump2ka's score reply does not invent experience");
assert(S.parsePrintedMetrics("You need 50 points to progress to the next level.") === null,
    "a point threshold with no experience word contributes nothing");
const llrModel = S.blank();
S.recordPrintedMetrics(llrModel, llrScore, "score");
assert(llrModel.scoreMetricKey === "experience" && llrModel.stats.experience.value === 0,
    "an actual SCORE response deterministically binds this module's score notifications to EXP");
S._pendingDeltaText = "score has just gone up by twenty points";
S.applyScoreDeltaToDisplay(llrModel, 20, 0);
assert(llrModel.stats.experience.value === 20 && llrModel.stats.experience.lastChange === 20,
    "a later score popup updates EXP after the module relationship is proven");
const proseModel = S.blank();
S.recordPrintedMetrics(proseModel, "You gained 20 experience points.", "attack goblin");
assert(proseModel.scoreMetricKey == null,
    "experience prose without a SCORE command does not relabel score notifications");
const autoExpModel = S.blank();
S._samples = [{ observed: {}, globals: [0, 0, 7] }];
autoExpModel.scoreCandidates = [0, 1];
global.Actionable = { isGameWord: word => word === "experience" };
assert(S.classifyExperienceScoreEvent(autoExpModel,
    { level: { value: 1 }, strength: { value: 12 } }, 20, [20, 20, 8]) === true,
    "an automatic first score popup becomes EXP when status, dictionary, delta and RAM agree");
assert(autoExpModel.stats.experience.value === 20 && autoExpModel.stats.score == null,
    "tied zero-to-total shadow globals yield one deterministic EXP value, not a duplicate Score");
const ordinaryScoreModel = S.blank();
ordinaryScoreModel.scoreCandidates = [0];
assert(S.classifyExperienceScoreEvent(ordinaryScoreModel,
    { score: { value: 20 } }, 20, [20, 0, 8]) === false,
    "a conventional score module without LVL/STR context is never relabelled EXP");
delete global.Actionable;
S._samples = [];

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
    "explicit module-authored death wording is detected without treating every unknown banner as death");

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




// ---- D173: an announced change must be COUNTED, not only used to pin ------
// The operator's exact case, Anchorhead: the game replied "0 out of a possible
// 100", then announced "Your score has just gone up by two points." -- and the
// HUD stayed at 0, with no tone and no badge. D167 used that notification only
// to identify which global holds the score, and on this game one event cannot:
// globals 15 and 16 both shadow the score, so pinScoreByDelta correctly refuses
// to tie-break. Nothing wrote stats.score, and the cue and badge hang off that
// write, so all three symptoms followed from one freeze.
{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];

    S.observe({}, "");                       // establish a model
    S.applyScoreReply("You have so far scored 0 out of a possible 100 points.");
    let m = S.model();
    assert(m.stats.score && m.stats.score.value === 0 && m.stats.score.max === 100,
        "D173: the game's own SCORE reply gives an absolute baseline (0 of 100)");

    assert(S.parseScoreDelta("Your score has just gone up by two points.") === 2,
        "D173: the notification's worded delta is read as +2");

    // The turn the notification arrives. A game turn counter is established
    // first, because D175 keys the replay guard on the GAME's turn rather than
    // on the tick counter.
    m.stats.turns = { key: "turns", label: "Turns", value: 29, unit: "plain",
                      kind: "counter", seen: 2, source: "status", confirmed: true };
    S._turn++;
    S.takeEvents();
    S._pendingDelta = S.parseScoreDelta("Your score has just gone up by two points.");
    S.observe({}, "");
    S._pendingDelta = null;
    m = S.model();
    assert(m.stats.score.value === 2,
        `D173: the announced change is counted (0 + 2 = 2, got ${m.stats.score.value})`);
    const ev = S.takeEvents();
    assert(ev.some(e => e.type === "score-up" && e.delta === 2),
        "D173: and it emits score-up, which is what drives the tone and the badge");

    // Replay: a restore or transcript reprint can re-present the SAME
    // notification. It must not be counted twice.
    //
    // D175: this test used to hold S._turn still, which made it a FALSE GREEN.
    // _turn is a TICK counter and D153 measured observe() running about forty
    // times per game turn, so live a replay always lands on a different tick.
    // The ticks are advanced here, and the GAME's turn counter -- which is what
    // a restore actually returns to -- is what must make the stamp match.
    const afterFirst = S.model().stats.score.value;

    S._turn += 40;                       // forty ticks later, same game turn
    S._pendingDelta = 2;
    S.parseScoreDelta("Your score has just gone up by two points.");
    S.observe({}, "");
    S._pendingDelta = null;
    assert(S.model().stats.score.value === afterFirst,
        `D175: the same notification replayed 40 TICKS later, same game turn, is not double counted (${S.model().stats.score.value})`);

    // A later event on a later game turn still counts.
    S._turn++;
    S.model().stats.turns.value = 34;
    S._pendingDelta = S.parseScoreDelta("Your score has just gone up by five points.");
    S.observe({}, "");
    S._pendingDelta = null;
    assert(S.model().stats.score.value === 7,
        `D173: a later announced change still counts (2 + 5 = 7, got ${S.model().stats.score.value})`);
}

// D175: the pin baseline must be an absolute the game stated, never the
// running total D173 maintains for display. Otherwise the NEXT notification
// narrows against a drifted number, `known + delta` is a value RAM never holds,
// every candidate is rejected and the slot can never pin -- killing the very
// headless path this was built to bootstrap.
{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];
    S.observe({}, "");
    S.applyScoreReply("You have so far scored 0 out of a possible 100 points.");
    let m2 = S.model();
    assert(m2.scorePinKnown === 0,
        "D175: a SCORE reply seeds the pin baseline");

    S._turn++;
    S._pendingDelta = 2;
    S.parseScoreDelta("Your score has just gone up by two points.");
    S.observe({}, "");
    S._pendingDelta = null;
    m2 = S.model();
    assert(m2.stats.score.value === 2, "D175: the HUD counts the change");
    assert(m2.scorePinKnown === 0,
        `D175: but the pin baseline stays the last stated absolute, not the running total (${m2.scorePinKnown})`);
}

// D176: the slot must still PIN after the display has counted a change.
// D175 froze the pin baseline at the last stated absolute, which fixed a
// baseline that ran too high and created one stuck too low: after SCORE 0 and a
// counted +2, a following +5 demanded a global holding 5 while RAM held 7, so
// every candidate was rejected and the slot could never pin -- and RAM can only
// refresh the baseline once pinned. The 95-assertion suite missed it because it
// only checked the HUD arithmetic, never that pinning still worked. That was a
// second false green in the same feature, so this asserts the pin itself.
{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];

    // A story whose score really lives in global 7.
    const g = (score) => { const a = new Array(16).fill(0); a[7] = score; a[2] = 1; return a; };
    S.observe(null, "");
    S._samples.push({ globals: g(0) });
    S.applyScoreReply("You have so far scored 0 out of a possible 100 points.");
    let m3 = S.model();
    m3.scoreUnavailable = false;      // set by an earlier NO_SCORE block; not under test here
    m3.stats.turns = { key: "turns", label: "Turns", value: 10, unit: "plain",
                       kind: "counter", seen: 2, source: "status", confirmed: true };

    // Event one: +2. RAM moves 0 -> 2.
    S._turn++; m3.stats.turns.value = 11;
    S._samples = [{ globals: g(0) }];
    S._pendingDelta = S.parseScoreDelta("Your score has just gone up by two points.");
    S.pinScoreByDelta(m3, 2, g(2));
    S.applyScoreDeltaToDisplay(m3, 2, 0);
    S._pendingDelta = null;
    assert(m3.stats.score.value === 2, `D176: the display counts event one (${m3.stats.score.value})`);

    // Event two: +5. RAM moves 2 -> 7, while the baseline is still the stated 0.
    S._turn++; m3.stats.turns.value = 12;
    S._samples = [{ globals: g(2) }];
    S.pinScoreByDelta(m3, 5, g(7));
    // Before D176 the hold-total filter rejected every candidate here, so
    // pinScoreByDelta returned at `if (!hits.length) return;` WITHOUT recording
    // a candidate or counting the event. Those two fields are therefore the
    // direct evidence that hits survived.
    assert(m3.scoreDeltaEvents === 2,
        `D176: event two is counted, so hits were not empty (${m3.scoreDeltaEvents})`);
    assert(JSON.stringify(m3.scoreCandidates) === "[7]",
        `D176: and the real slot is still the surviving candidate (${JSON.stringify(m3.scoreCandidates)})`);
    const pinned = m3.globals && m3.globals.score;
    assert(pinned === 7,
        `D176: the slot pins on the stale baseline (got ${pinned})`);
}

// D181: a restore must not fire the score-up tone. The grok seat found that
// re-deriving after a resync computes a delta against the abandoned timeline's
// number (measured 685 -> 35), which is indistinguishable from scoring.
{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];
    S.observe(null, "");
    S.applyScoreReply("You have so far scored 685 out of a possible 1000 points.");
    let m4 = S.model();
    assert(m4.stats.score.confirmed === true, "D181: the score is confirmed before the restore");

    S.takeEvents();
    S.forgetReadings(m4);
    assert(m4.stats.score.confirmed === false, "D181: a resync unconfirms it");

    // Re-derivation lands a very different number, as a restore would.
    S.recordObservation(m4, "score", { label: "Score", value: 35, max: 1000, unit: "plain" });
    const ev4 = S.takeEvents();
    assert(ev4.length === 0,
        `D181: the first reading after a resync emits NOTHING -- no tone, no badge (${JSON.stringify(ev4.map(e=>e.type))})`);
    assert(S.model().stats.score.value === 35, "D181: but the new reading is adopted");
    assert(!S.model().stats.score.lastChange,
        "D181: and lastChange is not left set -- Render would badge it");
}

{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];
    S.observe(null, "");
    S.applyScoreReply("You have so far scored 685 out of a possible 1000 points.");
    const mRam = S.model();
    mRam.globals.score = 1;
    S.forgetReadings(mRam);
    S.takeEvents();
    const g = new Array(20).fill(0);
    g[1] = 35;
    S.readConfirmedGlobals(mRam, g);
    const evRam = S.takeEvents();
    assert(evRam.length === 0,
        `D181: RAM re-derive after forget emits nothing (${JSON.stringify(evRam.map(e=>e.type))})`);
    assert(mRam.stats.score.value === 35, "D181: RAM adopts 35");
    assert(!mRam.stats.score.lastChange, "D181: RAM path does not leave lastChange for the badge");
    assert(mRam.stats.score.confirmed === true, "D181: RAM re-confirms");
}

// Without an absolute to add to, a delta must NOT invent a total (D24).
{
    S._key = null; S._model = null; S._samples = []; S._events = []; S._turn = 0;
    for (const k of Object.keys(store)) delete store[k];
    S.observe({}, "");
    S._turn++;
    S._pendingDelta = 2;
    S.observe({}, "");
    S._pendingDelta = null;
    const sc = S.model().stats.score;
    assert(!sc || sc.value !== 2,
        "D173: a delta with no confirmed baseline does not invent a score");
}



// D186: exercise the real persistence/calibration/lifecycle functions, not source strings.
{
    const oldIds = S.carriedIds, oldSum = S.sumIndiv;
    let ids = [1], quantities = { 98: 7, 100: 7 };
    S.carriedIds = () => ids;
    S.sumIndiv = (mem, holders, prop) => quantities[prop] == null ? null : quantities[prop];
    const m = S.blank();
    S.pinCarryProp(m, {}, "weight", 7);
    S.pinCarryProp(m, {}, "weight", 7);
    assert(m.carry.weight.prop == null, "D186: repeated equal candidates never select the first property");
    quantities = { 98: 8, 100: 9 };
    S.pinCarryProp(m, {}, "weight", 9);
    assert(m.carry.weight.prop === 100, "D186: changed evidence uniquely resolves the carried property");
    S.save("d186-carry", m);
    const loaded = S.load("d186-carry");
    assert(loaded.carry && loaded.carry.weight.prop === 100, "D186: a learned carry pin survives reload");
    const repeated = S.blank();
    S.pinCarryProp(repeated, {}, "weight", 9);
    S.pinCarryProp(repeated, {}, "weight", 9);
    assert(repeated.carry.weight.prop == null, "D186: unchanged single-item evidence does not accumulate confirmations");
    S._model = loaded; S._key = null;
    S._events = [{ type: "score-up", delta: 5 }];
    S._pendingDelta = 5;
    S._pendingDeltaText = "old timeline";
    loaded.scoreCandidates = [7, 9]; loaded.scoreDeltaEvents = 2;
    S.Resync();
    assert(S._events.length === 0 && !S._pendingDelta && !S._pendingDeltaText,
        "D186: restore discards queued cues and delta from the abandoned timeline");
    assert(!loaded.scoreCandidates && !loaded.scoreDeltaEvents,
        "D186: restore discards provisional score correlation while keeping learned pins");
    assert(loaded.carry && loaded.carry.weight.prop === 100, "D186: restore retains the confirmed carry property");
    S.carriedIds = oldIds; S.sumIndiv = oldSum;
}
{
    const vm = require("vm"), context = { console };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../js/Actionable.js"), "utf8"), context);
    const A = context.Actionable;
    A.payloadPool = () => [{ id: 1, name: "pellets", examineOnly: true }];
    A.commandNounFor = () => "pellets";
    context.ActionSynth = { inspectVerbDisabled: () => true, defaultInspectVerb: () => "examine" };
    assert(A.resolveObjectCommands(1, "room").length === 0,
        "D186: promoted unnamed objects respect a disabled inspect verb");
    context.ActionSynth.inspectVerbDisabled = () => false;
    context.ActionSynth.defaultInspectVerb = () => "look at";
    assert(A.resolveObjectCommands(1, "room")[0].command === "look at pellets",
        "D186: promoted objects preserve the established multiword inspect form");
    context.ActionSynth.defaultInspectVerb = () => "examine";
    assert(A.resolveObjectCommands(1, "room")[0].command === "examine pellets",
        "D186: ordinary examine-only behavior remains unchanged");
}

// ---- D204 holistic ledger ----------------------------------------------
assert(S.parseCardinal("twenty-eight") === 28, "D204 parses compound cardinal score deltas");
assert(S.parseCardinal("twenty mystery") == null, "D204 rejects partially understood cardinal phrases");
assert(S.parseScoreDelta("Your score has just gone up by twenty-eight points. Your score has just gone down by three points.") === 25,
    "D204 combines every score delta in one settled output batch");
{
    S.reset();
    S.observeText("*** You have died ***", 1, "north", { spanId: "line:1:0:0:21", submissionId: 1 });
    const deaths = S.model().deaths;
    S.Resync();
    assert(S.model().deaths === deaths, "D204 restore invalidates readings without erasing playthrough deaths");
    S.observeText("*** You have died ***", 2, "north", { spanId: "line:2:0:0:21", submissionId: 2 });
    assert(S.model().deaths === deaths + 1, "D204 counts a later repeated death from a distinct output span");
}


{
    // D204 fulfillment gates (#974): draft abort, valve, nav-idle, Checking-with-chips.
    // Live SCORE/DIAGNOSE probes on every Equipment open remain accepted authority --
    // these asserts only lock the abort/serialization gates, not probe scarcity.
    const children = [];
    const rows = {
        innerHTML: "",
        appendChild(node) { children.push(node); this.innerHTML += (node.textContent || "") + "\n"; },
        // P3: Render builds off-document and moves the children across.
        get firstChild() { return children[0] || null; },
        removeChild(node) { const i = children.indexOf(node); if (i >= 0) children.splice(i, 1); this.innerHTML = children.map(n => (n.textContent || "") + "\n").join(""); },
        hidden: false
    };
    const host = { hidden: false };
    const line = { value: "" };
    let navigatorBusy = false;
    global.Navigator = {
        get Running() { return navigatorBusy; },
        get Awaiting() { return false; }
    };
    global.document = {
        querySelector(sel) {
            if (sel === ".Input.LineInput") return line;
            if (sel === ".Input.CharInput") return null;
            if (sel === "#dialog, #dialog_frame, #dialog_screen") return null;
            return null;
        },
        getElementById(id) {
            if (id === "pl-stats") return host;
            if (id === "pl-stats-rows") return rows;
            if (id === "pl-stats-identify") return { hidden: false };
            return null;
        },
        createElement() {
            const kids = [];
            return {
                className: "", textContent: "", style: {}, innerHTML: "",
                setAttribute() {},
                appendChild(node) { kids.push(node); this.innerHTML += (node.textContent || "") + "\n"; },
                removeChild(node) { const i = kids.indexOf(node); if (i >= 0) kids.splice(i, 1); },
                get firstChild() { return kids[0] || null; },
                classList: { add() {}, contains() { return false; } }
            };
        }
    };
    global.Actionable = { isGameWord() { return true; }, Submit() { return true; } };
    global.Message = { IsOpen: false, Show() {} };

    S.reset();
    S.D204Valve._testOverride = "on";
    line.value = "look east";
    children.length = 0;
    rows.innerHTML = "";
    S.requestStatusFulfillment(true);
    assert(S.model().fulfillment === "unavailable", "D204 draft at open aborts entire fulfillment");
    assert(!S._probeQueue.length && !S._probeActive, "D204 draft abort queues no probes");

    line.value = "";
    S.reset();
    S.D204Valve._testOverride = "off";
    S.requestStatusFulfillment(false);
    assert(S.model().fulfillment !== "checking" || !S._probeQueue.length,
        "D204 valve off skips automatic open fulfillment");
    S.D204Valve._testOverride = "shadow";
    S.model().stats = {};
    S.requestStatusFulfillment(true);
    assert(S.model().fulfillment === "complete", "D204 shadow completes without live probes");
    assert(!S._probeQueue.length, "D204 shadow records plan only and clears the queue");

    S.D204Valve._testOverride = "on";
    S.reset();
    line.value = "";
    navigatorBusy = true;
    assert(S.probeSafeNow() === false, "D204 safe-idle blocks while Navigator is running");
    navigatorBusy = false;
    assert(S.probeSafeNow() === true, "D204 safe-idle allows a free LineInput with idle navigator");

    const clearCarry = S.clearCarryProbe;
    let carryCancellations = 0;
    S.clearCarryProbe = function () { carryCancellations++; };
    S._probeQueue = [{ kind: "score", verb: "score", attempts: 0 }];
    S._hideCarryProbe = true;
    S._carryProbeSentAt = 0;
    S._carryProbeTimer = {};
    S.runProbeQueue();
    assert(carryCancellations === 0 && S._probeQueue.length === 1, "queued but unsent inventory is not mistaken for a timed-out reply");
    S._carryProbeTimer = null;
    S._carryProbeSentAt = Date.now() - 6000;
    S.runProbeQueue();
    assert(carryCancellations === 1, "actually sent stalled inventory retains bounded timeout recovery");
    S.clearCarryProbe = clearCarry;
    S._hideCarryProbe = false;
    S._carryProbeSentAt = 0;
    S._probeQueue = [];

    // Checking hint remains visible alongside existing chips.
    S.model().stats.score = { key: "score", label: "Score", value: 3, source: "status", kind: "counter", confirmed: true };
    S.model().fulfillment = "checking";
    children.length = 0;
    rows.innerHTML = "";
    S.Render();
    assert(/Checking this story for current status/.test(rows.innerHTML),
        "D204 Checking hint renders even when stat chips already exist");
    assert(children.some(function (n) { return /pl-stat-fulfillment/.test(n.className || ""); }),
        "D204 Checking-with-chips keeps a fulfillment hint node");
    assert(children.some(function (n) { return /pl-stat-score/.test(n.className || ""); }),
        "D204 Checking-with-chips keeps existing score chip");

    S.D204Valve._testOverride = null;

    // Quiet/invisible SCORE/DIAGNOSE ownership (D204 headless contract).
    assert(typeof S.beginProbeOwnership === "function" && typeof S.claimProbeNode === "function",
        "D204 quiet probe ownership API is present");
    S.beginProbeOwnership();
    assert(S._statProbeOwned === true, "D204 beginProbeOwnership arms suppress flag");
    const ownedAttrs = {};
    const ownedLine = {
        nodeType: 1,
        classList: {
            items: ["BufferLine"],
            add(c) { if (this.items.indexOf(c) < 0) this.items.push(c); },
            contains(c) { return this.items.indexOf(c) >= 0; }
        },
        setAttribute(k, v) { ownedAttrs[k] = v; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        closest() { return null; }
    };
    S.claimProbeNode(ownedLine);
    assert(ownedLine.classList.contains("pl-stat-probe"),
        "D204 claimProbeNode marks BufferLine as pl-stat-probe during ownership");
    assert(ownedAttrs["aria-hidden"] === "true",
        "D204 claimed probe line is aria-hidden for narration consumers");
    S.endProbeOwnership();
    assert(S._statProbeOwned === false, "D204 endProbeOwnership clears suppress flag");

    // LLR SCORE reply fulfills silent score probe via printed experience metrics.
    S.reset();
    S._probePending = { score: true };
    S._probeActive = { kind: "score", verb: "score" };
    S._probeQueue = [];
    S.consumeProbeReply("You are a level 1 rogue, with 0 experience points. You need 50 points to progress to the next level.");
    assert(!S._probePending, "D204 LLR SCORE printed-metrics complete the silent score probe");
    assert(S.model().stats.experience && S.model().stats.experience.value === 0,
        "D204 LLR EXP is captured from the silent SCORE probe reply");
    assert(S.model().scoreMetricKey === "experience",
        "D204 silent SCORE probe binds score notifications to EXP");

    delete global.document;
    delete global.Navigator;
    delete global.Actionable;
    delete global.Message;
}

// Audit #1026: exercise production lifecycle entry points, not forgetReadings directly.
const vm = require('vm');
const lifecycle = { StatTracker: S, setTimeout: () => 1, clearTimeout() {}, localStorage };
vm.createContext(lifecycle);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'UndoRestoreSync.js'), 'utf8'), lifecycle);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'js', 'MapTopology.js'), 'utf8'), lifecycle);
S._model = S.blank();
S.observeText('*** You have won ***', 1, '', { spanId: 'lifecycle-win' });
S.model().deaths = 2;
lifecycle.UndoRestoreSync.resync('restore_file');
S.observeText('*** You have won ***', 1, '', { spanId: 'lifecycle-win' });
assert(S.model().wins === 1 && S.model().deaths === 2, 'real restore resync preserves counters and banner dedup');
lifecycle.UndoRestoreSync.resync('undo');
assert(S.model().wins === 1 && S.model().deaths === 2, 'real undo resync preserves playthrough counters');
lifecycle.UndoRestoreSync.resync('restart');
assert(S.model().wins === 0 && S.model().deaths === 0 && !Object.keys(S.model().seenBanners).length, 'real restart resync clears counters and banner ids');
S.observeText('*** You have won ***', 1, '', { spanId: 'lifecycle-win' });
assert(S.model().wins === 1, 'restart permits the same terminal span in the new playthrough');
S.model().deaths = 2;
lifecycle.MapTopology._awaitingRestoreAnswer = true;
lifecycle.MapTopology.handlePossibleNewGameAnswer('no');
assert(S.model().wins === 0 && S.model().deaths === 0 && !Object.keys(S.model().seenBanners).length, 'real decline-restore new game clears counters and banner ids');
const diagnosis = 'You are in perfect health. You are wide awake. You are well hydrated and well fed.';
['player-prop:4', 'indiv:98', 'global:5', 'status-grid'].forEach(source => {
    ['health', 'hunger', 'thirst', 'sleep'].forEach(key => {
        const numeric = { key, value: 80, unit: 'percent', confirmed: true, source, ramStale: false };
        S.model().stats[key] = numeric;
        S.applyDiagnoseReply(diagnosis);
        assert(S.model().stats[key] === numeric && numeric.unit === 'percent', source + ' retains fresh numeric ' + key + ' over ordinal diagnosis');
    });
});
S.model().stats.health = { value: 80, unit: 'plain', confirmed: true, source: 'player-prop:4', ramStale: true };
S.applyDiagnoseReply(diagnosis);
assert(S.model().stats.health.unit === 'ordinal', 'stale RAM health may be replaced by current diagnosis');

// D205 consensus statistics extensions: observations are not learned readings.
S._model = S.blank();
S._events = [];
S.observeText('*** You have won ***', 1, '', { spanId: 'terminal-win' });
S.observeText('*** You have won ***', 1, '', { spanId: 'terminal-win' });
assert(S.model().wins === 1 && S.visibleStats().some(s => s.key === 'wins' && s.value === 1), 'wins surface once from the existing terminal event classifier');
S.forgetReadings(S.model(), false);
S.observeText('*** You have won ***', 1, '', { spanId: 'terminal-win' });
assert(S.model().wins === 1, 'restore readings preserve playthrough event dedup');
S.save('wins-fixture', S.model());
assert(S.load('wins-fixture').wins === 0, 'wins are not rehydrated as learned facts');
S.forgetReadings(S.model());
assert(S.model().wins === 0, 'new game clears wins');
S.observeConditions('You are poisoned.', { source: 'buffer-output', locator: 'span-a' });
assert(S.model().conditions.poisoned.state === 'candidate' && !S.visibleConditions().length, 'unprompted affliction is candidate, not confirmed by repetition');
S.observeConditions('You are poisoned.', { source: 'buffer-output', locator: 'span-b' });
assert(!S.visibleConditions().length, 'two prose statements are not independent condition corroboration');
S.observeConditions('Poisoned: 1', { source: 'status-grid', locator: 'grid', at: 20 });
assert(S.visibleConditions().length === 0, 'older condition observation cannot replace newer narration');
S.recordCondition('poisoned', true, { source: 'status-grid', locator: 'grid', at: Date.now() + 10 });
assert(S.visibleConditions().some(c => c.key === 'poisoned'), 'explicit current status flag confirms condition');
S.recordCondition('poisoned', false, { source: 'diagnose', command: 'diagnose', locator: 'old', at: 1 });
assert(S.visibleConditions().length === 1, 'stale diagnose cannot clear fresher grid evidence');
S.recordCondition('poisoned', false, { source: 'buffer-output', locator: 'cure', at: Date.now() + 20 });
assert(!S.visibleConditions().length && S.model().conditions.poisoned.state === 'cleared', 'explicit negative evidence clears a condition');
S.observeConditions('You are confused.', { source: 'diagnose', command: 'diagnose', locator: 'reply' });
assert(S.visibleConditions().some(c => c.key === 'confused'), 'command-owned diagnosis confirms explicit affliction');
S.forgetReadings(S.model(), false);
assert(!S.visibleConditions().length && S.model().conditions.confused.state === 'unknown', 'restore invalidates conditions without claiming cured');
S.observeConditions('The sign says you are cursed.', { source: 'diagnose', command: 'diagnose', locator: 'quoted' });
assert(!S.model().conditions.cursed, 'quoted/narrated third-party phrase does not become player condition');
global.UndoRestoreSync = { generation: 3 };
S.recordCondition('blinded', true, { source: 'ram', locator: 'p', generation: 2 });
assert(!S.model().conditions.blinded, 'stale generation cannot import condition');
S.observeText('You are blinded.', 1, 'diagnose ', { spanId: 'condition-only-diagnosis' });
assert(S.visibleConditions().some(c => c.key === 'blinded'), 'command-owned diagnosis confirms condition without numeric band');
delete global.UndoRestoreSync;
let itemValues = { 98: 5, 99: 5, 100: 10000 };
global.ZRamReader = { header: () => ({version: 5, himem: 5000}), readProp: () => 1, parseIndivTable: () => itemValues };
const itemMem = new Uint8Array(20000);
global.ZRamProvider = { getMem: () => itemMem };
S.recordItemMetric(itemMem, 7, 'weight', 5, 'kg', 'item weight:5');
assert(!S.itemMetricsFor(7).length, 'single item observation/tied slots cannot show row weight');
itemValues = {98: 6, 99: 5, 100: 10000};
S.recordItemMetric(itemMem, 7, 'weight', 6, 'kg', 'item weight:6');
assert(!S.itemMetricsFor(7).length, 'one transition is insufficient per-item proof');
itemValues[98] = 8;
S.recordItemMetric(itemMem, 7, 'weight', 8, 'kg', 'item weight:8');
assert(S.itemMetricsFor(7).some(x => x.value === 8 && x.source === 'item-property:98'), 'two independent object transitions identify unique property');
assert(!S.itemMetricsFor(8).length, 'object-specific weight proof does not authorize another item');
itemValues[98] = 10000;
assert(!S.itemMetricsFor(7).length, 'computed quantity refuses per-item display');
itemValues[98] = 9;
S.recordItemMetric(itemMem, 7, 'weight', 10, 'kg', 'contradiction');
assert(!S.itemMetricsFor(7).length, 'contradiction demotes row pin');
assert(!S.plainItemQuantity(itemMem, 2000), 'small packed routine address is rejected too');
delete global.ZRamReader; delete global.ZRamProvider;

// Treasures mid-combat (measured live): the player's row comes first, the
// enemy's after it. The player's health must not take the enemy's value.
{
    const combatCols = ['BARBARIAN', 'HIT POINTS: 9/16', 'VON DARTH THE SLY', 'HIT POINTS: 58/65'];
    const cs = S.statsFromColumns(combatCols);
    assert(cs.health && cs.health.value === 9 && cs.health.max === 16, 'combat grid: player health is the first row (9/16), not the enemy (58/65): ' + JSON.stringify(cs.health));
    const GD = require(path.resolve(__dirname, '..', 'js', 'StatusGridDecoder.js'));
    const dm = (GD.decode('BARBARIAN   HIT POINTS: 9/16\nVON DARTH THE SLY   HIT POINTS: 58/65').metrics || []).filter(m => m.key === 'health');
    assert(dm.length === 1 && dm[0].value === 9, 'decoder: one health metric, the player\'s 9/16: ' + JSON.stringify(dm));
    const plain = GD.decode('OPEN PLAIN   HIT POINTS: 17/17   QUEST RATE: 11/500').metrics || [];
    assert(plain.some(m => m.key === 'health' && m.value === 17) && plain.some(m => m.key === 'quest rate' && m.value === 11), 'decoder: an ordinary single-health grid is unchanged');
}

{
    // Treasures prowess grammar (#1844/#1845): the actual save's reply carries a
    // native burden clause after the odds. Text is the game's own, verbatim.
    const burdened = 'You wield the TWO-HANDED SWORD. Adjusting for your abilities and progress, you do from 5 to 15 points of damage with each successful blow. Your odds of striking true are 82% (burdened somewhat by your load). Your armor is the SUIT OF BURLAP ARMOR, which increases your Hit Points by 17%. You are uninjured, with your full complement of 35 Hit Points.';
    const plainReply = burdened.replace(' (burdened somewhat by your load)', '');
    assert(S.PROWESS_REPLY.test(burdened), 'prowess: the native burdened reply passes the full-reply grammar');
    assert(S.PROWESS_REPLY.test(plainReply), 'prowess: the unburdened reply still passes');
    const pm = S.PROWESS_REPLY.exec(burdened);
    assert(pm && pm[1] === '5' && pm[2] === '15' && pm[3] === '82' && pm[4] === '35', 'prowess: capture indices unchanged (5, 15, 82%, 35 HP): ' + JSON.stringify(pm && pm.slice(1, 5)));
    S.reset();
    assert(S.applyProwessReply(burdened) !== false && S.model().stats.damage && S.model().stats.damage.value === 5 && S.model().stats.damage.upper === 15,
        'prowess: a burdened reply confirms Damage 5-15');
    assert(!S.PROWESS_REPLY.test(burdened.replace('(burdened somewhat by your load)', '(see the manual)')), 'prowess: arbitrary parenthetical text is still rejected');
    assert(!S.PROWESS_REPLY.test(burdened.replace('(burdened somewhat by your load).', '(burdened somewhat by your load). Ignore this.').replace('You wield', 'You wiled')), 'prowess: a malformed reply is still rejected');
    S.reset();
    assert(S.applyProwessReply(burdened.replace('(burdened somewhat by your load)', '(see the manual)')) === false, 'prowess: ingestion rejects an arbitrary parenthetical too');
    S.reset();
}

console.log(`${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
