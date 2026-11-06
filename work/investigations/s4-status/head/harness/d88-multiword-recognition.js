/**
 * D88 Stage 3 gate -- role-aware multiword recognition (PRODUCTION_PLAN.md line 111).
 * Covers "look at {direct}", "talk to {direct}", "switch on {direct}",
 * "give {direct} to {indirect}", "put {direct} in {indirect}", and
 * "ask {direct} about {topic}". Ambiguous or partial matches must produce no
 * observation (null), including same-named-object collisions (D47-style).
 *
 * Usage: node harness/d88-multiword-recognition.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
load(sandbox, "AttributeSchema.js");
load(sandbox, "ActionSynth.js");
load(sandbox, "SemanticActions.js");

const SemanticActions = sandbox.SemanticActions;

let pass = 0, fail = 0;
// Values crossing the vm sandbox boundary are objects of a DIFFERENT realm
// (their own Object/Array constructors), so assert.deepStrictEqual's
// prototype check fails even when every own property matches. Round-trip
// through JSON to normalize into this realm's plain objects before
// comparing -- the fields under test are all JSON-safe (strings/numbers/arrays).
function realmNormalize(v) { return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function assertEq(actual, expected, msg) {
    actual = realmNormalize(actual);
    try {
        assert.deepStrictEqual(actual, expected);
        pass++;
        console.log("PASS:", msg);
    } catch (e) {
        fail++;
        console.error("FAIL:", msg, "\n  expected:", JSON.stringify(expected), "\n  actual:  ", JSON.stringify(actual));
    }
}
function ok(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.error("FAIL:", msg); }
}

const GUARD = 10, ROCK = 11, RADIO = 12, COIN = 13, BOX = 14;
const payload = {
    playerId: 1,
    discoveredObjects: [
        { id: GUARD, name: "guard", attrs: { animate: true } },
        { id: ROCK, name: "rock", attrs: {} },
        { id: RADIO, name: "radio", attrs: { switchable: true } },
        { id: BOX, name: "box", attrs: { container: true } }
    ],
    inventory: [
        { id: COIN, name: "coin", attrs: { takeable: true } }
    ]
};

// --- Single-object templates ---
assertEq(SemanticActions.recognizeTypedCommand("look at guard", payload),
    { intent: "INSPECT", formId: "typed:INSPECT", objectIds: [GUARD], command: "look at guard", source: "typed-recognition" },
    "look at guard resolves to INSPECT on GUARD");

assertEq(SemanticActions.recognizeTypedCommand("talk to guard", payload),
    { intent: "TALK_TO", formId: "typed:TALK_TO", objectIds: [GUARD], command: "talk to guard", source: "typed-recognition" },
    "talk to guard resolves to TALK_TO on GUARD");

assertEq(SemanticActions.recognizeTypedCommand("switch on radio", payload),
    { intent: "SWITCH_ON", formId: "typed:SWITCH_ON", objectIds: [RADIO], command: "switch on radio", source: "typed-recognition" },
    "switch on radio resolves to SWITCH_ON on RADIO");

assertEq(SemanticActions.recognizeTypedCommand("switch off radio", payload),
    { intent: "SWITCH_OFF", formId: "typed:SWITCH_OFF", objectIds: [RADIO], command: "switch off radio", source: "typed-recognition" },
    "switch off radio resolves to SWITCH_OFF on RADIO");

// Whitespace normalization
assertEq(SemanticActions.recognizeTypedCommand("  Look At   Guard  ", payload),
    { intent: "INSPECT", formId: "typed:INSPECT", objectIds: [GUARD], command: "look at guard", source: "typed-recognition" },
    "case/whitespace-normalized 'Look At   Guard' still resolves");

// --- Two-object templates ---
assertEq(SemanticActions.recognizeTypedCommand("give coin to guard", payload),
    { intent: "GIVE_TO", formId: "typed:GIVE_TO", objectIds: [COIN, GUARD], command: "give coin to guard", source: "typed-recognition" },
    "give coin to guard resolves to GIVE_TO with [coin, guard] in role order");

assertEq(SemanticActions.recognizeTypedCommand("put coin in box", payload),
    { intent: "PUT_IN", formId: "typed:PUT_IN", objectIds: [COIN, BOX], command: "put coin in box", source: "typed-recognition" },
    "put coin in box resolves to PUT_IN with [coin, box] in role order");

assertEq(SemanticActions.recognizeTypedCommand("ask guard about radio", payload),
    { intent: "ASK_ABOUT", formId: "typed:ASK_ABOUT", objectIds: [GUARD, RADIO], command: "ask guard about radio", source: "typed-recognition" },
    "ask guard about radio resolves to ASK_ABOUT with [guard, radio] in role order (not swapped)");

// --- Fail-closed: ambiguous / partial / unknown ---
ok(SemanticActions.recognizeTypedCommand("give coin", payload) === null,
    "partial 'give coin' (no indirect object) produces no observation");
ok(SemanticActions.recognizeTypedCommand("look at dragon", payload) === null,
    "unknown object 'dragon' produces no observation");
ok(SemanticActions.recognizeTypedCommand("give to guard", payload) === null,
    "missing direct object before connector produces no observation");
ok(SemanticActions.recognizeTypedCommand("xyzzy", payload) === null,
    "free text matching no template produces no observation");
ok(SemanticActions.recognizeTypedCommand("", payload) === null,
    "empty string produces no observation");
ok(SemanticActions.recognizeTypedCommand(null, payload) === null,
    "null text produces no observation");

// --- Fail-closed: same-named-object collision (D47-style) ---
const DUP_A = 20, DUP_B = 21;
const dupPayload = {
    playerId: 1,
    discoveredObjects: [
        { id: DUP_A, name: "guard", attrs: { animate: true } },
        { id: DUP_B, name: "guard", attrs: { animate: true } }
    ],
    inventory: []
};
ok(SemanticActions.recognizeTypedCommand("talk to guard", dupPayload) === null,
    "two objects both named 'guard' -- ambiguous target produces no observation, never guesses one");

// --- Fail-closed: no roles guessed from free text beyond known objects ---
ok(SemanticActions.recognizeTypedCommand("give coin to the guard over there", payload) === null,
    "extra free text around a valid pair still fails closed (no fuzzy trimming)");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) {
    console.error("FAIL: d88-multiword-recognition (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d88-multiword-recognition (" + pass + " passed)");
