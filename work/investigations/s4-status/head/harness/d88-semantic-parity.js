/**
 * D88 Stage 2 gate -- "deep parity over existing command arrays" (PRODUCTION_PLAN.md
 * line 109). SemanticActions.resolveFor* must reproduce ActionSynth's legacy verb/
 * noun/objectId/command/confidence output byte-for-byte and in the same order, for
 * every object across a set of representative payloads, while additionally attaching
 * a stable intent. Any divergence is a stage-2 STOP condition.
 *
 * Usage: node harness/d88-semantic-parity.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

const sandbox = { console, setTimeout, window: {}, module: undefined };
vm.createContext(sandbox);
load(sandbox, "AttributeSchema.js");
load(sandbox, "ActionSynth.js");
load(sandbox, "SemanticActions.js");
load(sandbox, "WorldModel.js");

const ActionSynth = sandbox.ActionSynth;
const SemanticActions = sandbox.SemanticActions;
const WorldModel = sandbox.WorldModel;

let pass = 0, fail = 0;
function assertEq(actual, expected, msg) {
    try {
        assert.deepStrictEqual(actual, expected);
        pass++;
        console.log("PASS:", msg);
    } catch (e) {
        fail++;
        console.error("FAIL:", msg, "\n  expected:", JSON.stringify(expected), "\n  actual:  ", JSON.stringify(actual));
    }
}

function legacyFields(resolved) {
    return resolved.map(function (c) {
        return { verb: c.verb, noun: c.noun, objectId: c.objectId, command: c.command, confidence: c.confidence };
    });
}
function legacyOf(cmds) {
    return cmds.map(function (c) {
        return { verb: c.verb, noun: c.noun, objectId: c.objectId, command: c.command, confidence: c.confidence };
    });
}

// --- Fixture 1: mixed-attr room + inventory objects (from d31-known-topics/command-consistency payloads) ---
const PLAYER = 1;
const GUARD = 10, ROCK = 11, RADIO = 12, BOX = 13, DOOR = 14, RING = 15, COIN = 16;
const payload1 = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    discoveredObjects: [
        { id: GUARD, name: "guard", parentId: 2, attrs: { animate: true } },
        { id: ROCK, name: "rock", parentId: 2, attrs: { takeable: true } },
        { id: RADIO, name: "radio", parentId: 2, attrs: { talkable: true, switchable: true } },
        { id: BOX, name: "box", parentId: 2, attrs: { container: true, openable: true } },
        { id: DOOR, name: "door", parentId: 2, attrs: { door: true, lockable: true } }
    ],
    inventory: [
        { id: RING, name: "ring", parentId: PLAYER, attrs: { worn: true, takeable: true } },
        { id: COIN, name: "coin", parentId: PLAYER, attrs: { takeable: true } }
    ]
};
WorldModel.lastPayload = payload1;

[GUARD, ROCK, RADIO, BOX, DOOR, RING, COIN].forEach(function (id) {
    const legacy = ActionSynth.commandsForPayloadObjectId(id, id === RING || id === COIN ? "inventory" : "room");
    const resolved = SemanticActions.resolveForPayloadObjectId(id);
    assertEq(legacyFields(resolved), legacyOf(legacy), "object " + id + " resolveForPayloadObjectId matches ActionSynth.commandsForPayloadObjectId");
});

// Whole-payload sweep, order included.
assertEq(
    legacyFields(SemanticActions.resolveForPayload(payload1)),
    legacyOf(ActionSynth.collectFromPayload(payload1)),
    "resolveForPayload matches collectFromPayload for the full mixed-attr payload, in order"
);

// --- Fixture 2: nested-in-held-container inventory item (D31 part-1-style) ---
const BAG = 20, KEY = 21;
const payload2 = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    discoveredObjects: [],
    inventory: [
        { id: BAG, name: "bag", parentId: PLAYER, attrs: { container: true, worn: true } },
        { id: KEY, name: "key", parentId: BAG, attrs: { takeable: true } }
    ]
};
WorldModel.lastPayload = payload2;
const legacyKey = ActionSynth.commandsForPayloadObjectId(KEY, "inventory");
const resolvedKey = SemanticActions.resolveForPayloadObjectId(KEY);
assertEq(legacyFields(resolvedKey), legacyOf(legacyKey), "nested-in-container key resolves to the same single take-out-of form");
assert(legacyKey.length === 1 && legacyKey[0].verb === "take out of bag", "sanity: fixture 2 still exercises the nested-container branch");
pass++; console.log("PASS: fixture 2 sanity check");

// --- Fixture 3: inspect-disabled world (D85 substitute-verb / disabled-inspect path) ---
sandbox.AttrCalibrator = { defaultInspectVerb: () => "examine", inspectVerbCurrentlyDisabled: () => true };
const STONE = 30;
const payload3 = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    discoveredObjects: [{ id: STONE, name: "stone", parentId: 2, attrs: {} }],
    inventory: []
};
WorldModel.lastPayload = payload3;
const legacyStone = ActionSynth.commandsForPayloadObjectId(STONE, "room");
const resolvedStone = SemanticActions.resolveForPayloadObjectId(STONE);
assertEq(legacyFields(resolvedStone), legacyOf(legacyStone), "inspect-disabled stone resolves to zero commands (missing INSPECT submits nothing), matching legacy");
assert.strictEqual(legacyStone.length, 0, "sanity: fixture 3 legacy output really is empty when inspect is disabled and no other attrs apply");
pass++; console.log("PASS: fixture 3 sanity check");
sandbox.AttrCalibrator = undefined;

// --- Intent mapping spot checks ---
WorldModel.lastPayload = payload1;
const guardResolved = SemanticActions.resolveForPayloadObjectId(GUARD);
const talkTo = guardResolved.find(function (c) { return c.verb === "talk to"; });
assert(talkTo && talkTo.intent === "TALK_TO", "talk to guard carries intent TALK_TO");
pass++; console.log("PASS: talk to guard carries intent TALK_TO");
const examine = guardResolved.find(function (c) { return c.verb === ActionSynth.defaultInspectVerb(); });
assert(examine && examine.intent === "INSPECT", "default inspect verb carries intent INSPECT");
pass++; console.log("PASS: default inspect verb carries intent INSPECT");

const doorResolved = SemanticActions.resolveForPayloadObjectId(DOOR);
const openForm = doorResolved.find(function (c) { return c.verb === "open"; });
assert(openForm && openForm.intent === "OPEN" && openForm.source === "migration-compat", "door open form is intent OPEN, source migration-compat in stage 2");
pass++; console.log("PASS: door open form is intent OPEN, source migration-compat");

// Unmapped verb (defensive: give to / put in are mapped; confirm no unmapped verb slips through null silently mislabeled)
Object.keys(SemanticActions.verbIntent).forEach(function (v) {
    assert(typeof SemanticActions.verbIntent[v] === "string" && SemanticActions.verbIntent[v].length > 0, "verbIntent entries are non-empty strings: " + v);
});
pass++; console.log("PASS: verbIntent table entries are all valid non-empty strings");

// --- Fixture 4: ASK_ABOUT parity against the REAL Actionable.Open() "Ask about..." menu ---
// grok's Stage 1 cross-check (#490) found ASK_ABOUT had no producing path in
// SemanticActions. resolveAskAboutFormsForObject must match Actionable's own
// construction exactly (same payload pool, same self/player exclusion, same
// commandNounFor-sourced text), not just structurally resemble it.
const askSandbox = {
    console, setTimeout, window: {},
    Message: { IsOpen: false },
    ParchLockQol: { OpenRadial: function (x, y, slices) { askSandbox.__lastMenu = slices; } },
    $: function (sel) { return { length: 0, closest: function () { return { length: 0 }; } }; }
};
vm.createContext(askSandbox);
load(askSandbox, "AttributeSchema.js");
load(askSandbox, "ActionSynth.js");
load(askSandbox, "SemanticActions.js");
load(askSandbox, "Actionable.js");
load(askSandbox, "WorldModel.js");

const NPC = 40, TOPIC_A = 41, TOPIC_B = 42, ASK_PLAYER = 1;
const askPayload = {
    playerId: ASK_PLAYER,
    probe: { status: "z-ram-live", playerId: ASK_PLAYER },
    discoveredObjects: [
        { id: NPC, name: "soldier", attrs: { animate: true } },
        { id: TOPIC_A, name: "penny", attrs: { takeable: true } },
        { id: TOPIC_B, name: "war", attrs: {} }
    ],
    inventory: []
};
askSandbox.WorldModel.lastPayload = askPayload;

askSandbox.Actionable.Open("soldier", "room", 0, 0, NPC);
const realAskSlice = askSandbox.__lastMenu.find(function (s) { return s.Label === "Ask about..."; });
realAskSlice.Action();
const realAskCommands = askSandbox.__lastMenu.map(function (s) { return { noun: s.Label, command: s.Command }; })
    .sort(function (a, b) { return a.noun < b.noun ? -1 : 1; });

const resolvedAsk = askSandbox.SemanticActions.resolveAskAboutFormsForObject(NPC, askPayload)
    .map(function (c) { return { noun: c.noun, command: c.command }; })
    .sort(function (a, b) { return a.noun < b.noun ? -1 : 1; });

assertEq(resolvedAsk, JSON.parse(JSON.stringify(realAskCommands)),
    "resolveAskAboutFormsForObject matches the REAL Actionable.Open() Ask-about menu exactly (topics, text, player excluded)");

const allAskIntentsSet = askSandbox.SemanticActions.resolveAskAboutFormsForObject(NPC, askPayload).every(function (c) { return c.intent === "ASK_ABOUT"; });
assert(allAskIntentsSet, "every resolved ask-about form carries intent ASK_ABOUT");
pass++; console.log("PASS: every resolved ask-about form carries intent ASK_ABOUT");

const askExcludesSelfAndPlayer = askSandbox.SemanticActions.resolveAskAboutFormsForObject(NPC, askPayload)
    .every(function (c) { return c.topicObjectId !== NPC && c.topicObjectId !== ASK_PLAYER; });
assert(askExcludesSelfAndPlayer, "ask-about topics exclude the NPC itself and the player, matching Actionable.Open()");
pass++; console.log("PASS: ask-about topics exclude the NPC itself and the player");

// --- Fixture 5: resolveExitCommand matches the REAL Actionable.commandForExitLabel ---
const exitSandbox = { console, setTimeout, window: {}, $: function () { return { length: 0 }; } };
vm.createContext(exitSandbox);
load(exitSandbox, "AttributeSchema.js");
load(exitSandbox, "ActionSynth.js");
load(exitSandbox, "SemanticActions.js");
load(exitSandbox, "Actionable.js");
load(exitSandbox, "WorldModel.js");
exitSandbox.WorldModel.lastPayload = {
    exits: [{ label: "north", command: "north" }, { label: "exit-91", command: "x1" }]
};
["north", "North", "exit-91", "purple", ""].forEach(function (label) {
    const real = exitSandbox.Actionable.commandForExitLabel(label);
    const resolved = exitSandbox.SemanticActions.resolveExitCommand(label);
    assertEq(resolved, real, "resolveExitCommand('" + label + "') matches the REAL commandForExitLabel exactly: " + JSON.stringify(real));
});

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) {
    console.error("FAIL: d88-semantic-parity (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d88-semantic-parity (" + pass + " passed)");
