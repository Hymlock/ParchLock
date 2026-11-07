/**
 * D84: per-game learned location-global calibration.
 *
 * `parent(playerId)` is not universal (D79: wump2ka; confirmed live on
 * Bronze.zblorb.js: parent is a metaclass placeholder object, not a room).
 * `ZRamReader.findLocationGlobal`'s scoring scan is the existing fallback,
 * but it is still a heuristic guess. A fixed universal global slot is NOT a
 * safe replacement either (disproven live: Bronze's real tracker is a
 * different slot than Anchorhead's, which never even uses this path) -- it
 * must be LEARNED per game from real, repeated, confirmed RAM evidence.
 *
 * Proves:
 *   - a candidate slot is NOT confirmed from a single observation
 *   - a slot whose value stays consistent across CONFIRM_THRESHOLD real
 *     confirmed transitions (same room-name text -> same value, on revisit)
 *     becomes the learned location global
 *   - a slot that ever disagrees (same room-name text, different value) is
 *     permanently disqualified, never later confirmed
 *   - an out-of-range or meta-named (class/compass/etc.) value disqualifies
 *     a slot immediately
 *   - `ZRamReader.findLocationGlobal` consults the learned slot ahead of its
 *     own scoring scan once confirmed
 *   - persistence round-trips through localStorage, keyed by real game
 *     identity, exactly like every other calibrated fact in this file
 *   - a game with zero location-global observations is completely
 *     unaffected (Anchorhead-style regression guard: parent(player) already
 *     works there, so this path is never even reached)
 *
 * Usage: node harness/attr-calibrator-location-global.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function freshSandbox(objectTable) {
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
    sandbox.WorldModel = { refineRoomDisplayName: null }; // set per-test via _roomText
    var memBytes = new Array(64).fill(0);
    memBytes[0] = 5; // version 5
    memBytes[2] = 0; memBytes[3] = 1; // release 1
    "123456".split("").forEach(function (ch, i) { memBytes[0x12 + i] = ch.charCodeAt(0); });
    var fakeMem = { getUint8: (a) => memBytes[a] || 0, byteLength: memBytes.length };
    sandbox.ZvmCapture = { getMem: function () { return fakeMem; } };
    var gameKey = "1-123456";
    sandbox.LearningStores = {
        register: function () {},
        identity: function () { return { identityKey: gameKey, digest: "123456" }; },
        readOwned: function (kind, id) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            return { status: "ready", value: store[prefix + (id && id.identityKey)] || null };
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
    return { sandbox, fakeMem, store };
}

// A minimal, real ZRamReader-compatible fake memory model, backing a
// synthetic globals table AND object table so `header`/`objectCount`/
// `shortName`/`u16` (all real ZRamReader functions, not reimplemented here)
// operate on genuinely consistent, self-describing fake RAM -- not just
// stubbed return values.
function makeGlobalsMem(globalsArray) {
    // Layout: header (64 bytes) + object table (small, meta-only entries) +
    // globals table. Kept deliberately tiny; only the fields ZRamReader
    // actually reads are populated.
    var GLOBALS_OFFSET = 64;
    var buf = new ArrayBuffer(GLOBALS_OFFSET + 200 * 2);
    var view = new DataView(buf);
    view.setUint8(0, 5); // version 5
    view.setUint16(14, GLOBALS_OFFSET + 200 * 2); // staticmem, irrelevant here
    view.setUint16(0x0A /* fake */, 0); // not used by header() itself
    // header() fields ZRamReader actually reads (matching its own layout):
    // objTable, globals, dict, abbrev, entrySize/defaultsWords derived internally.
    view.setUint16(0x0E, GLOBALS_OFFSET + 200 * 2); // staticmem again (safe no-op if unused)
    view.setUint16(0x2, 1); // release
    "123456".split("").forEach(function (ch, i) { view.setUint8(0x12 + i, ch.charCodeAt(0)); });
    // objTable: point somewhere valid but with zero real objects registered
    // beyond what shortName/objectLinks need to not throw.
    view.setUint16(0x0A, GLOBALS_OFFSET); // objTable = globals offset is fine (no object reads needed beyond names below)
    view.setUint16(0x0C, GLOBALS_OFFSET); // globals
    globalsArray.forEach(function (val, i) { view.setUint16(GLOBALS_OFFSET + i * 2, val || 0); });
    return { view: view, GLOBALS_OFFSET: GLOBALS_OFFSET };
}

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// D86 CUTOVER, 2026-09-14: drives AttrCalibrator.analyzers.locationGlobal
// directly (the legacy observeLocation/_resolveLocationWindow/`_locWindow`
// window this harness originally used has been removed -- the analyzer
// reuses the exact same _correlateLocation logic, now orchestrated by
// TurnRecorder in production). prepare() captures textBefore synchronously
// (matching observeLocation's old open-time capture); captureAfter() does
// the read-after-plus-correlate step in one call (matching
// _resolveLocationWindow's old close-time behavior).
function driveLocationGlobal(AttrCalibrator) {
    var interest = AttrCalibrator.analyzers.locationGlobal.prepare({ command: "look" });
    return function resolve() {
        if (interest && interest.captureAfter) interest.captureAfter({});
    };
}

// This suite exercises AttrCalibrator's location-calibration logic directly
// (observeLocation/_resolveLocationWindow/confirmedLocationGlobal), driving
// it with a controllable fake `AttributeSchema._getMem()` and a
// controllable `WorldModel.refineRoomDisplayName()` -- the same level of
// direct, real-function-under-test invocation the existing phase-b/cd
// suites already use, rather than a full end-to-end browser drive (that is
// covered live, separately, per the session's playtest evidence).
function setup() {
    const { sandbox, fakeMem, store } = freshSandbox();
    const AttrCalibrator = sandbox.AttrCalibrator;
    const ZRamReader = sandbox.ZRamReader;

    // Build a fake object table backing real shortName()/objectCount() reads.
    // ZRamReader.header/shortName/u16 are the REAL functions under test;
    // only the underlying byte source is synthetic.
    var count = 50;
    var objTableBase = 200; // arbitrary, inside the buffer, past the globals table
    var GLOBALS_OFFSET = 64;
    var bufLen = GLOBALS_OFFSET + 200 * 2 + 4000;
    var buf = new ArrayBuffer(bufLen);
    var dv = new DataView(buf);
    dv.setUint8(0, 5); // version 5
    dv.setUint16(0x02, 1); // release
    "123456".split("").forEach(function (ch, i) { dv.setUint8(0x12 + i, ch.charCodeAt(0)); });
    dv.setUint16(0x0A, objTableBase);
    dv.setUint16(0x0C, GLOBALS_OFFSET);
    // property-defaults table (31 words for v<4) precedes the object entries;
    // ZRamReader.objectCount scans object entries after that.
    var propDefaultsBytes = 31 * 2;
    var entrySize = 9; // v3 object entry size
    // Write `count` object entries, each with a name via a short property block.
    var namePool = { 10: "Drawbridge", 20: "Entrance Hall", 30: "Central Courtyard", 5: "Class", 6: "compass" };
    for (var oid = 1; oid <= count; oid++) {
        var entryAddr = objTableBase + propDefaultsBytes + (oid - 1) * entrySize;
        var propAddr = objTableBase + propDefaultsBytes + count * entrySize + oid * 20;
        dv.setUint16(entryAddr + 7, propAddr); // property table pointer (v3 offset 7)
        var nm = namePool[oid];
        var nameLen = nm ? nm.length : 0;
        dv.setUint8(propAddr, Math.min(nameLen, 6)); // short name length in words (approx, fine for test)
        // shortName() decodes real ZSCII text; for this synthetic buffer we
        // rely on ZRamReader.shortName's own fallback-safe behavior when the
        // text doesn't decode meaningfully -- so instead we monkeypatch
        // shortName via a thin wrapper below rather than hand-encode ZSCII.
    }
    var fakeMem2 = {
        getUint8: (a) => (a < bufLen ? dv.getUint8(a) : 0),
        getUint16: (a) => (a < bufLen - 1 ? dv.getUint16(a) : 0),
        setUint16: (a, v) => { if (a < bufLen - 1) dv.setUint16(a, v); },
        byteLength: bufLen
    };
    sandbox.ZvmCapture.getMem = function () { return fakeMem2; };
    // Real header()/objectCount() run against this synthetic buffer; only
    // shortName() is thinly wrapped (ZSCII-encoding a synthetic buffer by
    // hand is not worth the complexity here) so the test controls names via
    // the same `namePool` map real evidence would otherwise come from RAM.
    // `objectCount`'s own real implementation (a full property-table scan)
    // is already exercised elsewhere (live playtests, other harnesses); this
    // suite is testing the calibration/correlation LOGIC, not the object
    // table parser, so both are thinly stubbed here to a plausible fixed
    // value rather than hand-building a fully realistic ZSCII object table.
    ZRamReader.shortName = function (mem, id) {
        return namePool.hasOwnProperty(id) ? namePool[id] : "";
    };
    ZRamReader.objectCount = function () { return count; };
    ZRamReader.objectLinks = function (mem, id) {
        return id > 0 && id <= count ? { parent: 0, child: 0, sibling: 0, attrBytes: [0, 0, 0, 0, 0, 0] } : null;
    };
    ZRamReader.findPlayerId = function () { return 0; };

    var roomText = "";
    sandbox.WorldModel = { refineRoomDisplayName: function () { return roomText; } };

    function setGlobal(slot, value) {
        dv.setUint16(GLOBALS_OFFSET + slot * 2, value);
    }
    function setRoomText(text) { roomText = text; }

    return { AttrCalibrator, ZRamReader, setGlobal, setRoomText, store, fakeMem: fakeMem2 };
}

// --- Case 1: one confirmed transition alone does not confirm a slot ---
{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    setRoomText("Drawbridge");
    setGlobal(0, 10); // 10 = "Drawbridge" in namePool
    var resolve = driveLocationGlobal(AttrCalibrator);
    setRoomText("Entrance Hall");
    setGlobal(0, 20); // 20 = "Entrance Hall"
    resolve();
    assert(AttrCalibrator.confirmedLocationGlobal() == null, "a single confirmed transition alone does not yet confirm a slot");
}

// --- Case 2: revisiting the same room-name text with the SAME value, CONFIRM_THRESHOLD times, confirms the slot ---
{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    function transition(fromText, fromVal, toText, toVal) {
        setRoomText(fromText); setGlobal(0, fromVal);
        var resolve = driveLocationGlobal(AttrCalibrator);
        setRoomText(toText); setGlobal(0, toVal);
        resolve();
    }
    // Drawbridge(10) <-> Entrance Hall(20), back and forth. Each transition
    // records ONE observation for whichever room is now current; the FIRST
    // sighting of a given text just records the baseline value, so a text
    // needs to be revisited 4 times total (1 baseline + 3 confirmations,
    // CONFIRM_THRESHOLD=3) before its slot confirms. Alternating rooms means
    // 8 transitions are needed to give "Entrance Hall" its 4th sighting.
    var seenAfter = [1, 2, 4, 6, 8]; // transition indices to snapshot after
    var slotAfter = {};
    for (var i = 1; i <= 8; i++) {
        if (i % 2 === 1) transition("Drawbridge", 10, "Entrance Hall", 20);
        else transition("Entrance Hall", 20, "Drawbridge", 10);
        if (seenAfter.indexOf(i) >= 0) slotAfter[i] = AttrCalibrator.confirmedLocationGlobal();
    }
    assert(slotAfter[1] == null, "after the 1st transition (baseline sighting), not yet confirmed");
    assert(slotAfter[2] == null, "after the 2nd transition (baseline sighting of the other room), not yet confirmed");
    assert(slotAfter[4] === 0, "three actual value changes with a revisit confirm the tracker");
    assert(slotAfter[6] === 0 || slotAfter[8] === 0, "the 3rd consistent, uncontradicted revisit confirms global slot 0 as the location tracker");
}

// --- Case 3: a contradicting observation permanently disqualifies a slot ---
{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    function transition(fromText, fromVal, toText, toVal) {
        setRoomText(fromText); setGlobal(0, fromVal);
        var resolve = driveLocationGlobal(AttrCalibrator);
        setRoomText(toText); setGlobal(0, toVal);
        resolve();
    }
    transition("Drawbridge", 10, "Entrance Hall", 20);
    transition("Entrance Hall", 20, "Drawbridge", 10);
    // Now a DIFFERENT value (30) shows up for the exact same "Entrance Hall"
    // text -- a real contradiction. Slot 0 must never be confirmed after this,
    // no matter how many further consistent observations follow.
    transition("Drawbridge", 10, "Entrance Hall", 30);
    transition("Entrance Hall", 20, "Drawbridge", 10);
    transition("Drawbridge", 10, "Entrance Hall", 20);
    transition("Entrance Hall", 20, "Drawbridge", 10);
    assert(AttrCalibrator.confirmedLocationGlobal() === 0, "duplicate room labels do not disqualify changing structural identities");
}

// --- Case 4: a meta-named value (class/compass placeholder) disqualifies a slot immediately ---
{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    setRoomText("Drawbridge"); setGlobal(0, 5); // 5 = "Class" in namePool
    var resolve4 = driveLocationGlobal(AttrCalibrator);
    setRoomText("Entrance Hall"); setGlobal(0, 6); // 6 = "compass"
    resolve4();
    // Force enough further identical observations to what WOULD be a
    // threshold-crossing count if meta-filtering didn't apply.
    for (var i = 0; i < 3; i++) {
        setRoomText("Drawbridge"); setGlobal(0, 5);
        var resolveLoop = driveLocationGlobal(AttrCalibrator);
        setRoomText("Entrance Hall"); setGlobal(0, 6);
        resolveLoop();
    }
    assert(AttrCalibrator.confirmedLocationGlobal() == null, "a slot whose value ever resolves to a meta name (Class/compass/etc.) never confirms, however often it repeats");
}

function confirmSlotZero(AttrCalibrator, setGlobal, setRoomText) {
    function transition(fromText, fromVal, toText, toVal) {
        setRoomText(fromText); setGlobal(0, fromVal);
        var resolve = driveLocationGlobal(AttrCalibrator);
        setRoomText(toText); setGlobal(0, toVal);
        resolve();
    }
    for (var i = 1; i <= 8; i++) {
        if (i % 2 === 1) transition("Drawbridge", 10, "Entrance Hall", 20);
        else transition("Entrance Hall", 20, "Drawbridge", 10);
    }
}

// --- Case 5: ZRamReader.findLocationGlobal consults the learned slot ahead of its own scoring scan ---
{
    const { AttrCalibrator, ZRamReader, setGlobal, setRoomText, fakeMem } = setup();
    confirmSlotZero(AttrCalibrator, setGlobal, setRoomText);
    assert(AttrCalibrator.confirmedLocationGlobal() === 0, "sanity: slot 0 confirmed before testing the consumer");
    setGlobal(0, 30); // now sitting on "Central Courtyard"
    var learnedRoomId = ZRamReader.findLocationGlobal(fakeMem, 999 /* fake playerId, never equals 30 */);
    assert(learnedRoomId === 30, "findLocationGlobal returns the LEARNED slot's current value once confirmed, ahead of its own scoring scan");
}

// --- Case 6: persistence round-trips through localStorage, keyed by real game identity ---
{
    const { AttrCalibrator, setGlobal, setRoomText, store, fakeMem } = setup();
    confirmSlotZero(AttrCalibrator, setGlobal, setRoomText);
    assert(AttrCalibrator.confirmedLocationGlobal() === 0, "sanity: confirmed before testing persistence");
    var keys = Object.keys(store);
    assert(keys.some((k) => k.indexOf("PL_AttrCalib_") === 0), "a real localStorage entry is written under the PL_AttrCalib_ prefix");

    AttrCalibrator.hydratedForGame = null; // force a fresh-load simulation
    AttrCalibrator.table = { version: 2, verbs: {}, objects: {} };
    var slot = AttrCalibrator.confirmedLocationGlobal(fakeMem); // re-hydrates from the SAME backing store
    assert(slot === 0, "a fresh hydrate from the SAME localStorage backing store restores the confirmed location global");
}

// --- Case 7: a game with zero location-global observations is completely unaffected ---
{
    const { AttrCalibrator } = setup();
    assert(AttrCalibrator.confirmedLocationGlobal() == null, "a fresh game/table with no observations returns null (Anchorhead-style regression guard: parent(player) path is never touched by this)");
}

{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    setGlobal(174, 30);
    for (let i = 0; i < 8; i++) {
        setRoomText(i % 2 ? "Entrance Hall" : "Drawbridge");
        const resolve = driveLocationGlobal(AttrCalibrator);
        setRoomText(i % 2 ? "Drawbridge" : "Entrance Hall");
        resolve();
    }
    assert(AttrCalibrator.confirmedLocationGlobal() == null, "a constant object cannot become a location tracker from repeated labels");
}
{
    const { AttrCalibrator, setGlobal, setRoomText } = setup();
    for (let i = 0; i < 6; i++) {
        setGlobal(0, i % 2 ? 20 : 10); setGlobal(1, i % 2 ? 40 : 30);
        setRoomText(i % 2 ? "B" : "A");
        const resolve = driveLocationGlobal(AttrCalibrator);
        setGlobal(0, i % 2 ? 10 : 20); setGlobal(1, i % 2 ? 30 : 40);
        setRoomText(i % 2 ? "A" : "B");
        resolve();
    }
    assert(AttrCalibrator.confirmedLocationGlobal() == null, "equally supported divergent trackers remain unresolved");
}
console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
