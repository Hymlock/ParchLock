/**
 * D73 / AttrCalibrator Phase B: opcode-level observation and correlation.
 * (Phase C/D -- persistence and applyTo() consumption -- landed in the
 * same file after this harness was written; see
 * harness/attr-calibrator-phase-cd.js for that coverage. This file still
 * proves the Phase B correlation/classification mechanics in isolation.)
 *
 * D86 CUTOVER, 2026-09-14: the legacy observeCommand/_resolvePending/
 * `_pending` window this harness originally drove directly has been
 * removed -- AttrCalibrator.analyzers.verbSuccess (registered against
 * TurnRecorder) is now the sole real writer, reusing the exact same
 * classification logic. This harness drives that analyzer's
 * prepare/observeOpcode/analyze interface directly with a synthetic turn
 * object, exercising the SAME underlying code, not a reimplementation.
 *
 * Proves, with the SAME real opcode sequence captured live on
 * wump2ka.z5.js ("take canteen"), that AttrCalibrator correctly:
 *   - correlates a submitted command to the real target object id
 *     (via the existing AttributeSchema._findIdByName, not a new lookup)
 *   - classifies a real take/insert_obj+remove_obj trace as success
 *   - classifies a test_attr-only (rejected) trace as failure
 *   - ignores opcodes for objects other than the one targeted this turn
 *
 * Usage: node harness/attr-calibrator-phase-b.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);

// Minimal stand-ins for the two systems AttrCalibrator correlates through
// (Actionable.Submit as the command choke-point, WorldModel.lastPayload as
// _findIdByName's real-object fallback pool -- both already-established
// patterns, not new plumbing).
sandbox.Actionable = { Submit: function (command) { sandbox.__lastSubmitted = command; } };
sandbox.WorldModel = {
    lastPayload: {
        discoveredObjects: [{ id: 285, name: "canteen" }, { id: 171, name: "(CustomPlayer)" }],
        inventory: []
    }
};
sandbox.ZvmCapture = { getMem: function () { return {}; } };

vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "AttrCalibrator.js"), "utf8"), sandbox);

const AttributeSchema = sandbox.AttributeSchema;
const AttrCalibrator = sandbox.AttrCalibrator;
const ZRamReader = sandbox.ZRamReader;
if (!AttributeSchema || !AttrCalibrator || !ZRamReader) {
    console.error("FAIL: AttributeSchema / ZRamReader / AttrCalibrator did not load");
    process.exit(1);
}

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// Drives AttrCalibrator.analyzers.verbSuccess directly, the same way
// TurnRecorder itself would: prepare() at "open", observeOpcode() per real
// opcode call, then captureAfter()+analyze() at "close".
function driveVerbSuccess(command, opcodes) {
    var analyzer = AttrCalibrator.analyzers.verbSuccess;
    var turn = { command: command, startLine: 0, endLine: null, analyzerSnapshots: {} };
    var interest = analyzer.prepare(turn);
    if (!interest) return { turn: turn, interest: null };
    opcodes.forEach(function (c) { analyzer.observeOpcode(turn, c.op, null, c.args, c.result); });
    turn.endLine = 0;
    if (interest.captureAfter) turn.analyzerSnapshots["diag-verbSuccess"] = interest.captureAfter(turn);
    analyzer.analyze(turn);
    return { turn: turn, interest: interest };
}

// --- Case 1: the real, live-captured "take canteen" trace (success) ---
sandbox.window.__PARCHLOCK_ATTR_TRACE__ = [];
var r1 = driveVerbSuccess("take canteen", [
    { op: "test_attr", args: [285, 5], result: 0 },
    { op: "test_attr", args: [285, 32], result: 0 },
    { op: "test_attr", args: [285, 33], result: 0 },
    { op: "test_attr", args: [285, 34], result: 0 },
    { op: "test_attr", args: [285, 35], result: 0 },
    { op: "test_attr", args: [285, 22], result: 0 },
    { op: "test_attr", args: [285, 24], result: 0 },
    { op: "remove_obj", args: [285], result: undefined },
    { op: "insert_obj", args: [285, 171], result: undefined },
    { op: "set_attr", args: [285, 17], result: undefined }
]);
assert(!!r1.interest, "prepare() opened a correlation for 'take canteen'");
assert(r1.turn.__diagVerbSuccessCtx && String(r1.turn.__diagVerbSuccessCtx.id) === "285", "correlation targets the real canteen object id (285), resolved via AttributeSchema._findIdByName");
assert(r1.turn.__diagVerbSuccessCtx.trace.length === 10, "all 10 real opcode calls for the targeted object were captured (got " + r1.turn.__diagVerbSuccessCtx.trace.length + ")");

var log1 = sandbox.window.__PARCHLOCK_ATTR_TRACE__;
assert(log1.length === 1, "one trace entry recorded after resolving");
assert(log1[0].success === true, "the real take-canteen trace (remove_obj+insert_obj present) classifies as success");
assert(log1[0].objectId === 285, "recorded entry carries the real object id, not a name string");
assert(log1[0].trace.length === 10, "recorded entry preserves the full opcode trace for forensic/Phase-C use");

// --- Case 2: a rejected take (test_attr only, never reaches insert_obj/remove_obj) ---
sandbox.window.__PARCHLOCK_ATTR_TRACE__ = [];
driveVerbSuccess("take canteen", [
    { op: "test_attr", args: [285, 19], result: 1 },
    { op: "test_attr", args: [285, 17], result: 0 }
]);
var log2 = sandbox.window.__PARCHLOCK_ATTR_TRACE__;
assert(log2.length === 1 && log2[0].success === false, "a test_attr-only trace (no mutation) classifies as failure, not success");

// --- Case 3: opcodes for an UNRELATED object during the same window are excluded ---
sandbox.window.__PARCHLOCK_ATTR_TRACE__ = [];
var r3 = driveVerbSuccess("take canteen", [
    { op: "insert_obj", args: [171, 20], result: undefined }, // unrelated object (171), not the canteen (285)
    { op: "test_attr", args: [285, 5], result: 0 }
]);
assert(r3.turn.__diagVerbSuccessCtx.trace.length === 1, "an opcode call for a different object id is excluded from this command's trace (got " + r3.turn.__diagVerbSuccessCtx.trace.length + ")");
assert(sandbox.window.__PARCHLOCK_ATTR_TRACE__[0].success === false, "excluding the unrelated object's insert_obj correctly leaves this trace classified as failure");

// --- Case 4: applyTo() still runs correctly with AttrCalibrator loaded ---
// (Phase C/D landed in this same file since this harness was first written
// -- see harness/attr-calibrator-phase-cd.js for the actual override/
// regression-safety proof. This case is now just a load-order sanity check.)
var attrsBefore = {};
var fakeObjStatic = { attrBytes: [0, 64, 16, 0, 0, 0] }; // matches the real canteen bytes: light(9) + static(19) set
AttributeSchema.applyTo(attrsBefore, fakeObjStatic);
assert(attrsBefore.static === undefined || typeof attrsBefore.static === "boolean", "applyTo still runs correctly with AttrCalibrator loaded (sanity)");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
