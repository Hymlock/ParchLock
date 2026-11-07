/**
 * D75: a confirmed real `insert_obj` from a successful take names the TRUE
 * inventory holder id directly -- used by ZRamProvider.resolveInventoryRootId
 * ahead of its own animate-bit fallback, which wump2ka.z5.js's own
 * per-session attribute randomization (D58) can defeat as a false NEGATIVE
 * (the real holder's animate bit reads false that session, so the fallback
 * never even considers it and inventory reads empty despite real items
 * genuinely held) -- found live via the operator's own "inventory did not
 * work at all" report, root-caused to exactly this mechanism.
 *
 * Usage: node harness/attr-calibrator-inventory-root.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function freshSandbox() {
    const store = {};
    const gameKey = "0-654321";
    const sandbox = {
        console, setTimeout, window: {},
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); }
        }
    };
    vm.createContext(sandbox);
    sandbox.Actionable = { Submit: function () {} };
    sandbox.WorldModel = {
        lastPayload: { discoveredObjects: [{ id: 185, name: "transmat popper" }], inventory: [] }
    };
    var memBytes = new Array(64).fill(0);
    memBytes[0] = 5;
    "654321".split("").forEach((ch, i) => { memBytes[0x12 + i] = ch.charCodeAt(0); });
    var fakeMem = { getUint8: (a) => memBytes[a] || 0, byteLength: memBytes.length };
    sandbox.ZvmCapture = { getMem: function () { return fakeMem; } };
    // D13/P13b: AttrCalibrator identity goes through LearningStores.
    sandbox.LearningStores = {
        register: function () {},
        identity: function () { return { identityKey: gameKey, digest: "654321" }; },
        readOwned: function (kind, id) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            var k = prefix + (id && id.identityKey);
            return { status: "ready", value: store[k] || null };
        },
        persist: function (kind, i, value) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            store[prefix + i.identityKey] = value;
        }
    };
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttrCalibrator.js"), "utf8"), sandbox);
    return { sandbox, fakeMem };
}

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// D86 CUTOVER, 2026-09-14: drives AttrCalibrator.analyzers.verbSuccess
// directly (the legacy observeCommand/_resolvePending/`_pending` window this
// harness originally used has been removed -- the analyzer reuses the exact
// same classification logic, now orchestrated by TurnRecorder in production).
function driveVerbSuccess(AttrCalibrator, command, opcodes) {
    var analyzer = AttrCalibrator.analyzers.verbSuccess;
    var turn = { command: command, startLine: 0, endLine: null, analyzerSnapshots: {} };
    var interest = analyzer.prepare(turn);
    if (!interest) return turn;
    opcodes.forEach(function (c) { analyzer.observeOpcode(turn, c.op, null, c.args, c.result); });
    turn.endLine = 0;
    if (interest.captureAfter) turn.analyzerSnapshots["diag-verbSuccess"] = interest.captureAfter(turn);
    analyzer.analyze(turn);
    return turn;
}

// --- Case 1: no take observed yet -> confirmedInventoryRootId is null ---
{
    const { sandbox } = freshSandbox();
    assert(sandbox.AttrCalibrator.confirmedInventoryRootId(sandbox.ZvmCapture.getMem()) === null, "with zero observations, confirmedInventoryRootId is null (no invented answer)");
}

// --- Case 2: a real successful take confirms the true holder id ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    var turn = driveVerbSuccess(AttrCalibrator, "take transmat popper", [
        { op: "test_attr", args: [185, 5], result: 0 },
        { op: "remove_obj", args: [185] },
        { op: "insert_obj", args: [185, 171] } // 171 = the real holder (an unnamed, non-animate-this-session prop, D58)
    ]);
    assert(turn.__diagVerbSuccessCtx && String(turn.__diagVerbSuccessCtx.id) === "185", "correlation targets the real transmat popper object id");

    var confirmedRoot = AttrCalibrator.confirmedInventoryRootId(sandbox.ZvmCapture.getMem());
    assert(confirmedRoot === 171, "the confirmed inventory root is the REAL insert_obj destination (171), not the (possibly wrong) probe playerId");
}

// --- Case 3: ZRamProvider.resolveInventoryRootId prefers the confirmed root over its own animate-gated fallback ---
{
    const { sandbox } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    driveVerbSuccess(AttrCalibrator, "take transmat popper", [
        { op: "insert_obj", args: [185, 171] }
    ]);

    // Minimal ZRamProvider load: it references ZRamReader/AttrCalibrator by
    // name, both already in this sandbox.
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamProvider.js"), "utf8"), sandbox);
    const ZRamProvider = sandbox.ZRamProvider;

    // playerId (20) has zero real children (the exact live-confirmed
    // scenario: probe.playerId resolves to an empty-handed id, the TRUE
    // holder is a different, unnamed, non-animate-this-session object).
    // ZRamReader.children/attrsFromObject read straight from `fakeMem`,
    // which has no real object table, so they safely return empty/false
    // for any id -- meaning the OLD animate-gated fallback in
    // resolveInventoryRootId cannot find a candidate here even in
    // principle, exactly mirroring the live wump2ka.z5.js failure mode.
    var resolved = ZRamProvider.resolveInventoryRootId(sandbox.ZvmCapture.getMem(), 20, 25);
    assert(resolved === 171, "resolveInventoryRootId returns the D75-confirmed real holder (171) instead of falling through to the empty-handed playerId (20)");
}

// --- Case 4: a player who genuinely holds nothing yet is not overridden by a STALE prior-game confirmation ---
// (persistence is scoped per real game identity, same as every other
// AttrCalibrator table -- a different game's header never hydrates this one)
{
    const { sandbox: sandboxA } = freshSandbox();
    driveVerbSuccess(sandboxA.AttrCalibrator, "take transmat popper", [
        { op: "insert_obj", args: [185, 171] }
    ]);

    // A different game (different header bytes) must not inherit this.
    const sandboxB = freshSandbox().sandbox;
    var memBytesB = new Array(64).fill(0);
    memBytesB[0] = 5;
    "999999".split("").forEach((ch, i) => { memBytesB[0x12 + i] = ch.charCodeAt(0); });
    var fakeMemB = { getUint8: (a) => memBytesB[a] || 0, byteLength: memBytesB.length };
    assert(sandboxB.AttrCalibrator.confirmedInventoryRootId(fakeMemB) === null, "a different game's identity key never inherits another game's confirmed inventory root");
}

// Custom TAKE may consume an item by inserting it into a detached bucket.
{
 const {sandbox,fakeMem}=freshSandbox(),A=sandbox.AttrCalibrator;
 sandbox.WorldModel.lastPayload.roomId=40;
 sandbox.ZRamReader.objectLinks=(m,id)=>id===171?{parent:40}:id===37?{parent:0}:null;
 A.hydrate(fakeMem);
 A.table.inventoryRootId=171;
 driveVerbSuccess(A,'take transmat popper',[{op:'remove_obj',args:[185]},{op:'insert_obj',args:[185,37]}]);
 assert(A.table.inventoryRootId===171,'offstage consumption preserves the real prior holder');
 A.table.inventoryRootId=37;
 assert(A.confirmedInventoryRootId(fakeMem)===null,'detached persisted bucket cannot become inventory');
 A.table.inventoryRootId=171;
 assert(A.confirmedInventoryRootId(fakeMem)===171,'in-room real holder remains admitted');
}

// A scripted TAKE can reinsert a handled object into its room without carrying it.
{
 const {sandbox,fakeMem}=freshSandbox(),A=sandbox.AttrCalibrator;
 sandbox.WorldModel.lastPayload.roomId=40;
 driveVerbSuccess(A,'take transmat popper',[{op:'remove_obj',args:[185]},{op:'insert_obj',args:[185,40]}]);
 assert(A.confirmedInventoryRootId(fakeMem)===null,'room reinsertion can never become the inventory holder');
 A.table.inventoryRootId=40;
 assert(A.confirmedInventoryRootId(fakeMem)===null,'already persisted current-room root is ignored');
 sandbox.ZRamReader.compiledRoomIndex=()=>({table:{1:40}});
 sandbox.WorldModel.lastPayload.roomId=50;
 assert(A.confirmedInventoryRootId(fakeMem)===null,'persisted compiled-room root remains excluded after travel');
 A.table.inventoryRootId=171;
 assert(A.confirmedInventoryRootId(fakeMem)===171,'valid existing holder survives rejection of room roots');
}


{
 const {sandbox}=freshSandbox(),A=sandbox.AttrCalibrator;
 sandbox.ZRamReader.objectLinks=()=>({parent:40});
 sandbox.WorldModel.lastPayload.roomId=40;
 const turn=driveVerbSuccess(A,'take transmat popper',[{op:'remove_obj',args:[185]},{op:'insert_obj',args:[185,40]}]);
 const entries=sandbox.window.__PARCHLOCK_ATTR_TRACE__||[];
 assert(entries.length===1&&!entries[0].success&&!entries[0].behavioralAccept,'same-parent remove/reinsert is not a successful or behavioral Take');
}
console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
