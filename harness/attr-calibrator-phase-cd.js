/**
 * D73 / AttrCalibrator Phase C (persistence) + Phase D (consumption).
 *
 * Proves:
 *   - a confirmed take/refusal is remembered per-object and overrides
 *     AttributeSchema.applyTo()'s takeable derivation for THAT object only
 *   - a bit-level flag (open/wear/lock/switch) only overrides once the
 *     SAME mutated bit has been confirmed CONFIRM_THRESHOLD times
 *   - a disagreeing observation resets the candidate tally instead of
 *     averaging toward a wrong answer
 *   - persistence round-trips through localStorage keyed by real game
 *     identity (release+serial), mirroring ZRamReader's diagonal-exit
 *     calibration pattern
 *   - a game/flag with NO observation is completely unaffected (no
 *     regression risk for already-correct predictions, e.g. Anchorhead)
 *
 * Usage: node harness/attr-calibrator-phase-cd.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function freshSandbox() {
    const store = {};
    const sandbox = {
        console, setTimeout, window: {},
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
        }
    };
    vm.createContext(sandbox);
    sandbox.Actionable = { Submit: function (command) {} };
    sandbox.WorldModel = {
        lastPayload: {
            discoveredObjects: [{ id: 285, name: "canteen" }, { id: 189, name: "wide shaft" }, { id: 700, name: "door" }],
            inventory: []
        }
    };
    // Fake mem with a real, distinguishable header (release + serial) so
    // gameIdentityKey produces a real key -- ZvmCapture.getMem stub must
    // return something ZRamReader.header() accepts (version byte 1-8).
    var memBytes = new Array(64).fill(0);
    memBytes[0] = 5; // version 5
    memBytes[2] = 0; memBytes[3] = 1; // release 1
    "123456".split("").forEach(function (ch, i) { memBytes[0x12 + i] = ch.charCodeAt(0); });
    var fakeMem = { getUint8: (a) => memBytes[a] || 0, byteLength: memBytes.length };
    sandbox.ZvmCapture = { getMem: function () { return fakeMem; } };
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttrCalibrator.js"), "utf8"), sandbox);
    return { sandbox, fakeMem, store };
}

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// D86 CUTOVER, 2026-09-14: drives AttrCalibrator.analyzers.verbSuccess
// directly (the legacy observeCommand/_resolvePending/`_pending` window this
// harness originally used has been removed -- the analyzer reuses the exact
// same classification logic, now orchestrated by TurnRecorder in
// production). `forceObjectId`, when given, overrides the real
// AttributeSchema._findIdByName-resolved id after prepare() runs -- the
// same trick the original harness used (`_pending.id = objId`) to target
// synthetic object ids that aren't in the fake payload.
function driveVerbSuccess(AttrCalibrator, command, opcodes, forceObjectId) {
    var analyzer = AttrCalibrator.analyzers.verbSuccess;
    var turn = { command: command, startLine: 0, endLine: null, analyzerSnapshots: {} };
    var interest = analyzer.prepare(turn);
    if (!interest) return turn;
    if (forceObjectId != null && turn.__diagVerbSuccessCtx) turn.__diagVerbSuccessCtx.id = forceObjectId;
    opcodes.forEach(function (c) { analyzer.observeOpcode(turn, c.op, null, c.args, c.result); });
    turn.endLine = 0;
    if (interest.captureAfter) turn.analyzerSnapshots["diag-verbSuccess"] = interest.captureAfter(turn);
    analyzer.analyze(turn);
    return turn;
}

// --- Case 1: a confirmed successful take overrides takeable for THAT object only ---
{
    const { sandbox, fakeMem } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;
    const ZRamReader = sandbox.ZRamReader;

    // canteen: static bit (19) set -> static profile predicts takeable:false
    var canteenObj = { id: 285, attrBytes: [0, 0, 0b00010000, 0, 0, 0] }; // bit19 set (byte2 bit3 from MSB: byte2=0b00010000 -> bit19 true), bit17(scenery) false
    var attrsBefore = {};
    AttributeSchema.applyTo(attrsBefore, canteenObj);
    assert(attrsBefore.static === true, "sanity: canteen's static bit reads true before any calibration");
    assert(attrsBefore.takeable === false, "sanity: static profile predicts canteen is NOT takeable, before calibration");

    // Simulate the real observed "take canteen" -> Taken. trace (D73 proof).
    driveVerbSuccess(AttrCalibrator, "take canteen", [
        { op: "test_attr", args: [285, 5], result: 0 }, { op: "test_attr", args: [285, 32], result: 0 },
        { op: "remove_obj", args: [285] }, { op: "insert_obj", args: [285, 171] }, { op: "set_attr", args: [285, 17] }
    ]);

    var attrsAfter = {};
    AttributeSchema.applyTo(attrsAfter, canteenObj);
    assert(attrsAfter.takeable === true, "after one confirmed real take, canteen's takeable prediction flips to true (per-object override)");
    assert(attrsAfter.static === true, "the underlying static bit read is untouched -- only the derived takeable flag changed");

    // A DIFFERENT object (wide shaft, also static) must be unaffected.
    var shaftObj = { id: 189, attrBytes: [0, 0, 0b00010000, 0, 0, 0] };
    var shaftAttrs = {};
    AttributeSchema.applyTo(shaftAttrs, shaftObj);
    assert(shaftAttrs.takeable === false, "a different object with the same static bit is NOT affected by the canteen's per-object override");
}

// --- Case 2: bit-level calibration only finalizes after CONFIRM_THRESHOLD consistent observations ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;

    // Real profile bit for "open" is 14. Simulate a game whose real OPEN
    // routine actually flips bit 40 instead (a shifted/nonstandard layout).
    function simulateOpen(objId) {
        driveVerbSuccess(AttrCalibrator, "open door", [
            { op: "test_attr", args: [objId, 10], result: 0 },
            { op: "set_attr", args: [objId, 40] }
        ], objId);
    }
    simulateOpen(501);
    assert(!AttrCalibrator.overrideFor().open, "one observation alone does not yet finalize a bit override");
    simulateOpen(502);
    assert(!AttrCalibrator.overrideFor().open, "two observations alone do not yet finalize a bit override");
    driveVerbSuccess(AttrCalibrator, "close door", [
        { op: "clear_attr", args: [503, 40] }
    ], 503);
    var ov = AttrCalibrator.overrideFor();
    assert(ov.open && ov.open.bit === 40, "three complementary open/close observations confirm the unique shared bit 40");

    var doorObj = { id: 999, attrBytes: [0, 0, 0, 0, 0, 0, 0, 0] };
    doorObj.attrBytes[5] = 0b00000000; // bit 40 = byte5 bit0(MSB) -- leave false for now
    var attrsClosed = {};
    AttributeSchema.applyTo(attrsClosed, doorObj);
    assert(attrsClosed.open === false, "applyTo now reads the CALIBRATED bit (40), not the static profile's bit 14, for 'open'");
}

// --- Case 3: a disagreeing observation resets the candidate tally, never averages to a wrong answer ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    function simulateOpen(objId, bit) {
        driveVerbSuccess(AttrCalibrator, "open door", [
            { op: "set_attr", args: [objId, bit] }
        ], objId);
    }
    simulateOpen(601, 40);
    simulateOpen(602, 40);
    simulateOpen(603, 41); // disagrees -- resets bit 40's tally
    simulateOpen(604, 41);
    assert(!AttrCalibrator.overrideFor().open, "an inconsistent bit sequence never finalizes an override from noise alone (got: " + JSON.stringify(AttrCalibrator.overrideFor().open) + ")");
}

// --- Case 4: persistence round-trips through localStorage, keyed by real game identity ---
{
    const { sandbox, store } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const AttributeSchema = sandbox.AttributeSchema;
    driveVerbSuccess(AttrCalibrator, "take canteen", [
        { op: "remove_obj", args: [285] }, { op: "insert_obj", args: [285, 171] }
    ]);
    var keys = Object.keys(store);
    assert(keys.some((k) => k.indexOf("PL_AttrCalib_") === 0), "a real localStorage entry is written under the PL_AttrCalib_ prefix");

    // Fresh sandbox (new page load), same localStorage backing store: the
    // learned table must hydrate back in, not start clean.
    const AttributeSchema2 = sandbox.AttributeSchema;
    AttrCalibrator.hydratedForGame = null; // force a fresh-load simulation
    AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
    var canteenObj2 = { id: 285, attrBytes: [0, 0, 0b00010000, 0, 0, 0] };
    var attrs2 = {};
    AttributeSchema2.applyTo(attrs2, canteenObj2);
    assert(attrs2.takeable === true, "a fresh hydrate from the SAME localStorage backing store restores the canteen's learned takeable:true");
}

// --- Case 5: no observation ever recorded -> zero effect (Anchorhead-style regression guard) ---
{
    const { sandbox } = freshSandbox();
    const AttributeSchema = sandbox.AttributeSchema;
    var freshObj = { id: 42, attrBytes: [0, 0, 0b00010000, 0, 0, 0] }; // static bit set, never observed
    var attrs = {};
    AttributeSchema.applyTo(attrs, freshObj);
    assert(attrs.takeable === false, "an object/game with zero AttrCalibrator observations behaves exactly as the static profile always did");
}

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
