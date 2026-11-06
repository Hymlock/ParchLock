// D215 P-DEATH focused fixture (claude). Contract:
// work/investigations/2026-10-09-claude-death-proposal.md (R2+R3, plus the
// banner amendment for resurrecting stories such as Zork I).
// The HHG lines are the real ending captured from the operator's save; the
// Zork lines are its JIGS-UP banner. Synthetic negatives are labelled as such.
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const S = require(path.resolve(__dirname, "..", "js", "StatTracker.js"));

let sub = 0;
// One player submission: its output spans, then the next input request(s).
function turn(lines, opts) {
    opts = opts || {};
    S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: opts.command || "look", source: opts.source || "typed" };
    S.collectEnding(lines.map(t => typeof t === "string" ? { text: t } : t));
    if (opts.charFirst) S.settleEnding({ request: {}, line: false });
    S.settleEnding({ request: {}, line: true });
}
const fresh = () => { S.reset(); S._model = S.blank(); };

const HHG = [
    "As the house collapses around you, a bulldozer...",
    "",
    "Better luck next life.",
    "You scored 0 out of a possible 400, in 19 turns.",
    "Would you like to start over, restore a saved position, get hints or end this session of the game?",
    "(Type RESTART, RESTORE, HINTS or QUIT):"
];
const INFORM_MENU = "Would you like to RESTART, RESTORE a saved game, give the FULL score for that game or QUIT?";

// ---- positives ----
fresh(); turn(HHG);
assert(S.model().deaths === 1, "HHG multi-line ending (cue before the score and menu lines) counts one death");
assert(S.visibleStats().some(s => s.key === "deaths" && s.label === "Deaths this playthrough" && s.value === 1),
    "the tile reads 'Deaths this playthrough' = 1");
fresh(); turn(["*** You have died ***", "", INFORM_MENU]);
assert(S.model().deaths === 1, "Inform death banner plus end menu counts one death");
fresh(); turn(["Oh, no! A lurking grue devoured you!", "    ****  You have died  ****", "", "Now, let's take a look here... Well, you probably deserve another chance."]);
assert(S.model().deaths === 1, "Zork I resurrection: a complete death phrase inside a banner counts without an end menu");
fresh(); turn(["*** You have won ***", "", INFORM_MENU]);
assert(S.model().wins === 1 && S.model().deaths === 0, "a win is a win, not a death");
fresh(); S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "jump", source: "typed" };
S.collectEnding([{ text: "Better luck next life." }]);
S.settleEnding({ request: { id: 1 }, line: false });
assert(S.model().deaths === 0 && !S._ending.settled, "a key-press pause inside an ending does not settle early");
S.collectEnding([{ text: INFORM_MENU }]);
S.settleEnding({ request: { id: 2 }, line: true });
assert(S.model().deaths === 1, "the line request after the pause decides, counting once");

// HHG, measured live: the death text, then a RETURN pause ("Put on your
// peril-sensitive sunglasses..."), then the score and the end menu. The bare
// RETURN is an accepted submission with an empty command.
fresh();
S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "look", source: "typed" };
S.collectEnding([{ text: "Astoundingly, a bulldozer pokes through your wall." }, { text: "Better luck next life." },
    { text: "We are about to give you your score. Put on your peril-sensitive sunglasses now. (Hit RETURN or ENTER when ready.)" }]);
S.settleEnding({ request: { id: "return-pause" }, line: true });
assert(S.model().deaths === 0 && !S._ending.settled, "the RETURN pause leaves the HHG ending open");
S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "", source: "typed" };
S.collectEnding([{ text: "Your score is 0 of a possible 400, in 19 turns." }, { text: HHG[4] }, { text: HHG[5] }]);
S.settleEnding({ request: { id: "end-menu" }, line: true });
assert(S.model().deaths === 1, "the bare RETURN continues the same ending, so the death counts once at the menu");

// ---- negatives (synthetic) ----
fresh(); turn(["*** Death of a Salesman ***", "", INFORM_MENU]);
assert(S.model().deaths === 0, "a heading banner with a keyword ('Death of...') is not a death, even before an end menu");
fresh(); turn(["The old man says, \"you are dead to me.\"", INFORM_MENU]);
assert(S.model().deaths === 0, "a quoted phrase in dialogue is not a death");
fresh(); turn([{ text: ">say you are dead", input: true }, "You speak, but nobody answers.", INFORM_MENU], { command: "say you are dead" });
assert(S.model().deaths === 0, "the player's own typed words (input echo) never count");
fresh(); turn(["You have died. No wait, you have won!", INFORM_MENU]);
assert(S.model().deaths === 0 && S.model().wins === 0, "conflicting death and win phrases give unknown: no count");
fresh(); turn(["Type RESTART or RESTORE at any time. You are dead tired."]);
assert(S.model().deaths === 0, "instructions naming RESTART and RESTORE are not a choice line, and 'dead tired' is not a phrase");
fresh(); turn(["You are dead.", "Are you sure you want to quit?"]);
assert(S.model().deaths === 0, "a phrase without an end menu or death banner does not count (a YES/NO prompt is not terminal)");
// HHG, measured live with the operator's save: the story's clock kills the
// player in the very turn the save is RESTORED, then pauses for RETURN; the
// player types "look" at the pause, and the end menu follows.
fresh();
S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "restore", source: "typed" };
S._engineOut = "Astoundingly, a bulldozer pokes through your wall.\n\nBetter luck next life.\n\nWe are about to give you your score. (Hit RETURN or ENTER when ready.) >";
S.collectEnding([{ text: "Astoundingly, a bulldozer pokes through your wall." }, { text: "Better luck next life." },
    { text: "We are about to give you your score. Put on your peril-sensitive sunglasses now. (Hit RETURN or ENTER when ready.)" }]);
S.settleEnding({ request: { id: "pause" }, line: true });
S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "look", source: "typed" };
S.collectEnding([{ text: ">look", input: true }, { text: "Your score is 0 of a possible 400, in 19 turns." }, { text: HHG[4] }, { text: HHG[5] }]);
S.settleEnding({ request: { id: "menu" }, line: true });
assert(S.model().deaths === 1, "a death the story prints in reply to RESTORE counts, and text typed at its pause continues the same ending");
fresh(); S._lastSubmission = { submissionId: ++sub, pageEpoch: "fixture", command: "restore", source: "typed" };
S._engineOut = "Ok.";
S.collectEnding([{ text: "*** You have died ***" }, { text: INFORM_MENU }]);
S.settleEnding({ request: {}, line: true });
assert(S.model().deaths === 0, "a RESTORE whose ending text did not pass through the engine (replayed DOM text) does not count");
fresh(); turn(["You are standing in a field.", "Nothing happens."], { command: "restore" }); turn(["You see nothing special."]);
assert(S.model().deaths === 0, "an ordinary restore and turn count nothing");
fresh(); turn(["It's pitch dark. You are likely to be eaten by a grue."]); turn(["Time passes."], { command: "wait" });
assert(S.model().deaths === 0 && S._ending.carries === undefined, "text after a turn WITHOUT a death phrase starts a new episode (no carry)");
fresh(); turn(["*** You have died ***", "", INFORM_MENU], { source: "stat-probe", command: "score" });
assert(S.model().deaths === 0, "the app's own probe submissions never count");
fresh(); turn(["Your score has just gone up by ten points.", "Game over, man!", INFORM_MENU]);
assert(S.model().deaths === 0 && S.model().wins === 0, "'game over' is an unspecified ending: unknown, no count");

// codex #2143/#2144 reproductions.
fresh(); turn(["*** You have died ***", "You have won."]);
assert(S.model().deaths === 0 && S.model().wins === 0, "a death banner plus a complete win phrase without a menu is unknown");
fresh(); turn(["You are dead.", "The actor says, \"Would you like RESTART or RESTORE?\""]);
assert(S.model().deaths === 0, "quoted dialogue that looks like a menu is not a terminal menu");
fresh(); turn(["You are dead tired.", "Would you like to RESTART, RESTORE a saved game or QUIT?"]);
assert(S.model().deaths === 0, "'You are dead tired' is not 'You are dead' (the phrase must end the sentence)");
fresh(); turn(["You have been killed by the troll.", INFORM_MENU]);
assert(S.model().deaths === 1, "'You have been killed by the troll.' is a complete death phrase");
fresh(); turn(["You are dead.", 'Please type "RESTART", "RESTORE" or "QUIT". Would you like to restart or restore?']);
assert(S.model().deaths === 1, "single quoted option labels stay part of a real menu line");

fresh(); turn(["You are dead."]); turn(["Are you sure you want to quit?", INFORM_MENU], { command: "quit" });
assert(S.model().deaths === 0, "a death phrase at an ORDINARY prompt (no authored pause) never carries into the next command's menu");

// ---- dedupe, replay and lifecycle ----
fresh(); turn(HHG);
S.settleEnding({ request: {}, line: true });
S.collectEnding([{ text: "Better luck next life." }]);
S.settleEnding({ request: {}, line: true });
assert(S.model().deaths === 1, "one count per submission: further requests and replayed text do not recount");
turn(["Restoring..."], { command: "restore" });
turn(HHG);
assert(S.model().deaths === 2, "after restoring a pre-death save, a new death from a new command counts");
S.Resync("restore_file");
assert(S.model().deaths === 2, "restore keeps the playthrough count (D204)");
S.Resync("restart");
assert(S.model().deaths === 0, "an accepted RESTART resets the playthrough count (D204)");
assert(!S.visibleStats().some(s => s.key === "deaths"), "the tile is hidden while the count is 0 (D149)");

// ---- engine tap (codex #2161/#2163): stream payload, capture gating, pass-through ----
{
    const calls = [];
    const G = {
        glk_put_string: function (s) { calls.push(["string", s]); return "r1"; },
        glk_put_string_stream: function (stream, s) { calls.push(["stream", stream, s]); return "r2"; }
    };
    global.window = { __PARCHLOCK_ZVM__: { Glk: G } };
    S.reset();
    S.tapEngine();
    S._engineCapture = false;
    const r1 = G.glk_put_string("Ordinary room output.");
    assert(S._engineOut === "" && r1 === "r1" && calls[0][1] === "Ordinary room output.",
        "with capture off, ordinary output is not buffered and the original call and return value pass through");
    S._engineCapture = true;
    const r2 = G.glk_put_string_stream("STREAM", "Better luck next life.");
    assert(S._engineOut === "Better luck next life." && r2 === "r2" && calls[1][1] === "STREAM" && calls[1][2] === "Better luck next life.",
        "with capture on, a _stream call records its payload (argument 1), keeps its arguments and returns the original value");
    S.tapEngine();
    G.glk_put_string("x");
    assert(S._engineOut === "Better luck next life.x", "tapping twice does not double-wrap the same engine");
    delete global.window;
}

// Real Treasures ending: supplied save -> s,s,s,w -> south at cliff.
const TREASURES = ["The curiosity of an upland barbarian knoweth NO BOUNDARIES!",
    "*** YOUR BODY IS NEVER FOUND ***",
    "In that game you scored 44 out of a possible 500, in 324 turns.",
    "Would you like to RESTART, RESTORE a saved game or QUIT?"];
fresh(); turn(TREASURES);
assert(S.model().deaths === 1, "native Treasures custom death banner counts once");
S.settleEnding({request:{},line:true});
assert(S.model().deaths === 1, "re-rendering that death never counts twice");
fresh(); turn(['Your body is never found.', '>']);
assert(S.model().deaths === 0, "unframed body prose is not a death");
fresh(); turn(['A narrator says \"your body is never found.\"', TREASURES[3]]);
assert(S.model().deaths === 0, "quoted custom death phrase is not an ending");
fresh(); turn(TREASURES,{source:"stat-probe"});
assert(S.model().deaths === 0, "an app probe cannot count a custom ending");

console.log(pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
