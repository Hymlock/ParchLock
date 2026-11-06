/**
 * D88 Stage 6 gate -- unified consumer cutover behind one flag
 * (PRODUCTION_PLAN.md line 125-128). Proves, for every swapped consumer,
 * that flag-ON output is IDENTICAL to flag-OFF (legacy) output across a
 * representative payload -- the flag changes WHERE a command is computed,
 * never WHAT it is. STOP condition per the plan: "order, labels, strings,
 * stems, or primary selection differ."
 *
 * Usage: node harness/d88-stage6-cutover.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

function makeSandbox() {
    const chain = { off() { return this; }, on() { return this; }, empty() { return this; }, find() { return chain; }, data() { return this; } };
    const sandbox = {
        console, setTimeout: (fn) => fn(), window: { innerWidth: 1200, innerHeight: 900 },
        document: {}, $: () => chain,
        Message: { IsOpen: false },
        ParchLockQol: { OpenRadial: function (x, y, commands, context, pageIndex) { sandbox.__lastRadial = commands; } },
        Input: { Clear() {}, Focus() {}, Inject() { return true; } },
        TurnRecorder: { subscribeAcceptedSubmit() {} },
        AttrCalibrator: { defaultInspectVerb: () => "examine", inspectVerbCurrentlyDisabled: () => false }
    };
    vm.createContext(sandbox);
    load(sandbox, "AttributeSchema.js");
    load(sandbox, "ActionSynth.js");
    load(sandbox, "SemanticActions.js");
    load(sandbox, "Actionable.js");
    load(sandbox, "Autocomplete.js");
    load(sandbox, "Qol.js");
    load(sandbox, "WorldModel.js");
    return sandbox;
}

let pass = 0, fail = 0;
function realmNormalize(v) { return v === null || v === undefined ? v : JSON.parse(JSON.stringify(v)); }
function assertEq(actual, expected, msg) {
    actual = realmNormalize(actual); expected = realmNormalize(expected);
    try { assert.deepStrictEqual(actual, expected); pass++; console.log("PASS:", msg); }
    catch (e) { fail++; console.error("FAIL:", msg, "\n  expected:", JSON.stringify(expected), "\n  actual:  ", JSON.stringify(actual)); }
}

const PLAYER = 1, GUARD = 10, ROCK = 11, RADIO = 12, BOX = 13, COIN = 16;
function payload() {
    return {
        playerId: PLAYER,
        discoveredObjects: [
            { id: GUARD, name: "guard", parentId: 2, attrs: { animate: true } },
            { id: ROCK, name: "rock", parentId: 2, attrs: { takeable: true } },
            { id: RADIO, name: "radio", parentId: 2, attrs: { talkable: true, switchable: true } },
            { id: BOX, name: "box", parentId: 2, attrs: { container: true, openable: true } }
        ],
        inventory: [{ id: COIN, name: "coin", parentId: PLAYER, attrs: { takeable: true } }],
        exits: [{ label: "north", command: "north" }, { label: "exit-91", command: "x1" }],
        specialCommands: []
    };
}

// --- resolveObjectCommands: flag off vs on ---
const sOff1 = makeSandbox(); sOff1.WorldModel.lastPayload = payload();
const sOn1 = makeSandbox(); sOn1.WorldModel.lastPayload = payload(); sOn1.SemanticActions.CutoverFlag.enable();
[GUARD, ROCK, RADIO, BOX, COIN].forEach(function (id) {
    const kind = id === COIN ? "inventory" : "room";
    const off = sOff1.Actionable.resolveObjectCommands(id, kind).map(function (c) { return { verb: c.verb, command: c.command, objectId: c.objectId }; });
    const on = sOn1.Actionable.resolveObjectCommands(id, kind).map(function (c) { return { verb: c.verb, command: c.command, objectId: c.objectId }; });
    assertEq(on, off, "resolveObjectCommands(" + id + ") identical flag on vs off");
});

// --- resolveExitCommand: flag off vs on ---
const sOff2 = makeSandbox(); sOff2.WorldModel.lastPayload = payload();
const sOn2 = makeSandbox(); sOn2.WorldModel.lastPayload = payload(); sOn2.SemanticActions.CutoverFlag.enable();
["north", "exit-91", "purple"].forEach(function (label) {
    assertEq(sOn2.Actionable.resolveExitCommand(label), sOff2.Actionable.resolveExitCommand(label),
        "resolveExitCommand('" + label + "') identical flag on vs off");
});

// --- resolveAskAboutTopics: flag off vs on ---
const sOff3 = makeSandbox(); sOff3.WorldModel.lastPayload = payload();
const sOn3 = makeSandbox(); sOn3.WorldModel.lastPayload = payload(); sOn3.SemanticActions.CutoverFlag.enable();
const askOff = sOff3.Actionable.resolveAskAboutTopics(GUARD).map(function (t) { return { Label: t.Label, Command: t.Command }; });
const askOn = sOn3.Actionable.resolveAskAboutTopics(GUARD).map(function (t) { return { Label: t.Label, Command: t.Command }; });
assertEq(askOn, askOff, "resolveAskAboutTopics(guard) identical flag on vs off");
assert(askOn.length > 0, "sanity: ask-about topics is non-empty for this fixture");
pass++; console.log("PASS: sanity check ask-about topics non-empty");

// --- Qol.GetRadialCommands (input radial): flag off vs on ---
const sOff4 = makeSandbox(); sOff4.WorldModel.lastPayload = payload();
const sOn4 = makeSandbox(); sOn4.WorldModel.lastPayload = payload(); sOn4.SemanticActions.CutoverFlag.enable();
const radialOff = sOff4.ParchLockQol.GetRadialCommands().map(function (c) { return { Command: c.Command, source: c.source }; });
const radialOn = sOn4.ParchLockQol.GetRadialCommands().map(function (c) { return { Command: c.Command, source: c.source }; });
assertEq(radialOn, radialOff, "GetRadialCommands() identical flag on vs off, including order");

// --- Autocomplete.RamCommandSeeds: flag off vs on ---
const sOff5 = makeSandbox(); sOff5.WorldModel.lastPayload = payload();
const sOn5 = makeSandbox(); sOn5.WorldModel.lastPayload = payload(); sOn5.SemanticActions.CutoverFlag.enable();
assertEq(sOn5.Autocomplete.RamCommandSeeds(), sOff5.Autocomplete.RamCommandSeeds(),
    "RamCommandSeeds() identical flag on vs off, including order");

// --- Primary click end to end (real click.pmAct handler) through Actionable.Init ---
function primaryClickCommand(sandbox, objectId, kind) {
    var injected = null;
    sandbox.Input.Inject = function (cmd) { injected = cmd; return true; };
    sandbox.$ = function (sel) {
        if (sel === ".Input.LineInput:visible") return { length: 1 };
        if (sel === "#dialog") return { length: 0 };
        if (typeof sel !== "string") return { off() { return this; }, on(evt, delegate, handler) {
            if (evt === "click.pmAct") sandbox.__clickHandler = handler;
            return this;
        } };
        return { length: 0, off() { return this; }, on() { return this; } };
    };
    vm.runInContext("Actionable.Init();", sandbox);
    sandbox.__clickHandler.call({ dataset: { objectId: String(objectId), kind: kind } }, { preventDefault() {}, stopPropagation() {} });
    return injected;
}
const sOff6 = makeSandbox(); sOff6.WorldModel.lastPayload = payload();
const sOn6 = makeSandbox(); sOn6.WorldModel.lastPayload = payload(); sOn6.SemanticActions.CutoverFlag.enable();
assertEq(primaryClickCommand(sOn6, GUARD, "room"), primaryClickCommand(sOff6, GUARD, "room"),
    "real click.pmAct handler submits the identical primary command flag on vs off");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) {
    console.error("FAIL: d88-stage6-cutover (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d88-stage6-cutover (" + pass + " passed)");
