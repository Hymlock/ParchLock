/**
 * D88 Stage 4 gate -- passive command-form evidence on the real TurnRecorder
 * substrate (PRODUCTION_PLAN.md line 116-119, ARCHITECTURE_UML.md "Evidence
 * and persistence boundary"). Exercises the REAL js/TurnRecorder.js
 * (unmodified) with SemanticActions.turnRecorderAnalyzer registered exactly
 * as play.html now does, through its real onAcceptedSubmit entry point.
 *
 * Usage: node harness/d88-passive-evidence.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

const sandbox = {
    console,
    setTimeout: function (fn) { fn(); }, // settle immediately, no real 450ms wait
    window: {}, $: function () { return { length: 0 }; }
};
vm.createContext(sandbox);
load(sandbox, "AttributeSchema.js");
load(sandbox, "ActionSynth.js");
load(sandbox, "SemanticActions.js");
load(sandbox, "WorldModel.js");
load(sandbox, "TurnRecorder.js");
vm.runInContext("SemanticActions.registerWithTurnRecorder();", sandbox);

const TurnRecorder = sandbox.TurnRecorder;
const SemanticActions = sandbox.SemanticActions;
const WorldModel = sandbox.WorldModel;

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.error("FAIL:", msg); } }
function realmNormalize(v) { return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)); }

const GUARD = 10, COIN = 16;
WorldModel.lastPayload = {
    playerId: 1,
    discoveredObjects: [{ id: GUARD, name: "guard", attrs: { animate: true } }],
    inventory: [{ id: COIN, name: "coin", attrs: { takeable: true } }]
};

// Analyzer registered exactly once (no duplicate on re-register, per TurnRecorder's own contract).
SemanticActions.registerWithTurnRecorder();
ok(TurnRecorder._analyzers.filter(function (a) { return a.id === "semantic-evidence"; }).length === 1,
    "semantic-evidence analyzer registered exactly once, even after registerWithTurnRecorder() called twice");

// --- Recognized multiword command produces exactly one provisional entry ---
SemanticActions.Evidence.clear();
TurnRecorder.onAcceptedSubmit("talk to guard", "typed");
const entries1 = realmNormalize(SemanticActions.Evidence.all());
ok(entries1.length === 1, "a recognized typed command ('talk to guard') produces exactly one evidence entry");
ok(entries1[0] && entries1[0].intent === "TALK_TO" && JSON.stringify(entries1[0].objectIds) === JSON.stringify([GUARD]),
    "the entry carries the correct intent (TALK_TO) and objectIds ([guard])");
ok(entries1[0] && entries1[0].confirmed === false,
    "the entry is never confirmed -- Stage 4 has no structural witness wired for any engine yet");

// --- Unrecognized / free-text command produces NO evidence (cheapest path, prepare() returns null) ---
SemanticActions.Evidence.clear();
TurnRecorder.onAcceptedSubmit("xyzzy", "typed");
const entries2 = realmNormalize(SemanticActions.Evidence.all());
ok(entries2.length === 0, "an unrecognized command ('xyzzy') produces zero evidence entries");

// --- Simple single-word commands (not one of the fixed templates) produce no evidence either ---
SemanticActions.Evidence.clear();
TurnRecorder.onAcceptedSubmit("take coin", "typed");
const entries3 = realmNormalize(SemanticActions.Evidence.all());
ok(entries3.length === 0, "a plain 'take coin' (not a multiword template) produces zero evidence entries -- only the fixed templates are recognized");

// --- Two-object template recognized end to end through the real substrate ---
SemanticActions.Evidence.clear();
TurnRecorder.onAcceptedSubmit("give coin to guard", "inject");
const entries4 = realmNormalize(SemanticActions.Evidence.all());
ok(entries4.length === 1 && entries4[0].intent === "GIVE_TO" && JSON.stringify(entries4[0].objectIds) === JSON.stringify([COIN, GUARD]),
    "'give coin to guard' through the real onAcceptedSubmit entry point produces one GIVE_TO entry with [coin, guard]");
ok(entries4[0].source === "inject", "the entry records the real submission source ('inject'), not a hardcoded value");

// --- Evidence recording never influences resolution (shadow mode: pure observation) ---
const beforeResolve = realmNormalize(SemanticActions.resolveForPayloadObjectId(GUARD));
TurnRecorder.onAcceptedSubmit("talk to guard", "typed");
TurnRecorder.onAcceptedSubmit("talk to guard", "typed");
TurnRecorder.onAcceptedSubmit("talk to guard", "typed");
const afterResolve = realmNormalize(SemanticActions.resolveForPayloadObjectId(GUARD));
assert.deepStrictEqual(afterResolve, beforeResolve);
pass++; console.log("PASS: repeated evidence recording does not change resolveForObject's output (shadow mode -- observation has zero effect on resolution)");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) {
    console.error("FAIL: d88-passive-evidence (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d88-passive-evidence (" + pass + " passed)");
