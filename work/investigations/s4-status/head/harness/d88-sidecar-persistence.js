/**
 * D88 Stage 5 gate -- sidecar persistence and migration (PRODUCTION_PLAN.md
 * line 120-124). Keyed by release+serial+checksum+adapter+locale, separate
 * namespace from PL_AttrCalib_* v2, fails closed on corrupt/foreign/
 * mismatched data, imports D85 substitute-verb data at most once as
 * provisional-only, only ever persists confirmed entries (currently none).
 *
 * Usage: node harness/d88-sidecar-persistence.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

function makeLocalStorage() {
    var store = {};
    return {
        getItem: function (k) { return store.hasOwnProperty(k) ? store[k] : null; },
        setItem: function (k, v) { store[k] = String(v); },
        removeItem: function (k) { delete store[k]; },
        _dump: function () { return store; }
    };
}

function makeSandbox() {
    const sandbox = { console, setTimeout: (fn) => fn(), window: {}, localStorage: makeLocalStorage() };
    vm.createContext(sandbox);
    load(sandbox, "AttributeSchema.js");
    load(sandbox, "ActionSynth.js");
    load(sandbox, "ZRamReader.js");
    load(sandbox, "SemanticActions.js");
    return sandbox;
}

// Minimal Z-machine header: release u16 @0x02, 6-byte serial @0x12, checksum u16 @0x1c.
function makeHeader(release, serial, checksum) {
    var mem = new Array(0x40).fill(0);
    mem[0x02] = (release >> 8) & 0xff; mem[0x03] = release & 0xff;
    for (var i = 0; i < 6; i++) mem[0x12 + i] = serial.charCodeAt(i);
    mem[0x1c] = (checksum >> 8) & 0xff; mem[0x1d] = checksum & 0xff;
    return mem;
}

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.error("FAIL:", msg); } }

// --- Key building: release+serial+checksum+adapter+locale ---
var s = makeSandbox();
var memA = makeHeader(88, "230601", 0xabcd);
var keyA = s.SemanticActions.buildIdentityKey(memA);
ok(typeof keyA === "string" && keyA.indexOf("88-230601-abcd-") === 0, "buildIdentityKey encodes release-serial-checksum in order: " + keyA);
ok(keyA.indexOf(s.SemanticActions.ADAPTER_VERSION) >= 0, "buildIdentityKey includes the adapter version");
ok(keyA.slice(-3) === "-en", "buildIdentityKey defaults locale to 'en' when not given");
ok(s.SemanticActions.buildIdentityKey(null) === null, "buildIdentityKey(null) fails closed to null, never a guessed key");

// --- Same release+serial, DIFFERENT checksum -> different key (must not share learning) ---
var memB = makeHeader(88, "230601", 0xffff);
var keyB = s.SemanticActions.buildIdentityKey(memB);
ok(keyA !== keyB, "two binaries with the same release+serial but different checksum get DIFFERENT sidecar keys: " + keyA + " vs " + keyB);

// --- Persist writes only CONFIRMED entries (today: none exist, so nothing persists) ---
s.SemanticActions.Evidence.clear();
s.SemanticActions.Evidence.record({ intent: "TALK_TO", formId: "typed:TALK_TO", objectIds: [10], command: "talk to guard", source: "typed", confirmed: false });
s.SemanticActions.persist(memA);
var stored = JSON.parse(s.localStorage.getItem("PL_SemanticActions_" + keyA));
ok(stored.version === 1 && stored.buildKey === keyA, "persisted blob carries version + exact buildKey");
ok(Array.isArray(stored.entries) && stored.entries.length === 0,
    "persist() writes ZERO entries today -- nothing is ever confirmed yet (Stage 4 has no structural witness), so nothing unconfirmed leaks into durable storage");

// --- Persist DOES write a confirmed entry, if one existed ---
s.SemanticActions.Evidence.record({ intent: "OPEN", formId: "hypothetical:confirmed", objectIds: [13], command: "open box", source: "structural", confirmed: true });
s.SemanticActions.persist(memA);
var stored2 = JSON.parse(s.localStorage.getItem("PL_SemanticActions_" + keyA));
ok(stored2.entries.length === 1 && stored2.entries[0].confirmed === true, "a genuinely confirmed entry IS persisted (mechanism proven, not just the empty case)");

// --- Hydrate: separate namespace from PL_AttrCalib_* v2 ---
s.localStorage.setItem("PL_AttrCalib_88-230601", JSON.stringify({ version: 2, verbs: { should: "never-be-touched" } }));
s.SemanticActions.hydrate(memA);
ok(s.localStorage.getItem("PL_AttrCalib_88-230601") === JSON.stringify({ version: 2, verbs: { should: "never-be-touched" } }),
    "hydrate() never reads or rewrites the PL_AttrCalib_* v2 namespace");

// --- Hydrate: round-trips a confirmed entry written by persist() ---
var s2 = makeSandbox();
s2.localStorage.setItem("PL_SemanticActions_" + keyA, s.localStorage.getItem("PL_SemanticActions_" + keyA));
s2.SemanticActions.hydrate(memA);
var hydrated = s2.SemanticActions.Evidence.all();
ok(hydrated.length === 1 && hydrated[0].formId === "hypothetical:confirmed", "a fresh instance hydrates the persisted confirmed entry for the SAME build key");

// --- Hydrate: fails closed on corrupt JSON ---
var s3 = makeSandbox();
s3.localStorage.setItem("PL_SemanticActions_" + keyA, "{not valid json");
s3.SemanticActions.hydrate(memA);
ok(s3.SemanticActions.Evidence.all().length === 0, "hydrate() fails closed on corrupt JSON -- Evidence stays empty, no throw");

// --- Hydrate: fails closed on version mismatch ---
var s4 = makeSandbox();
s4.localStorage.setItem("PL_SemanticActions_" + keyA, JSON.stringify({ version: 99, buildKey: keyA, entries: [{ intent: "TAKE" }] }));
s4.SemanticActions.hydrate(memA);
ok(s4.SemanticActions.Evidence.all().length === 0, "hydrate() fails closed on version mismatch -- foreign-shaped data is never adopted");

// --- Hydrate: fails closed on buildKey mismatch (wrong build's data under a colliding/edited key) ---
var s5 = makeSandbox();
s5.localStorage.setItem("PL_SemanticActions_" + keyA, JSON.stringify({ version: 1, buildKey: "some-other-build", entries: [{ intent: "TAKE" }] }));
s5.SemanticActions.hydrate(memA);
ok(s5.SemanticActions.Evidence.all().length === 0, "hydrate() fails closed on buildKey mismatch -- cross-build contamination refused");

// --- Hydrate: hydrates at most once per build (hydrate-once guard, D73-style) ---
var s6 = makeSandbox();
s6.localStorage.setItem("PL_SemanticActions_" + keyA, JSON.stringify({ version: 1, buildKey: keyA, entries: [{ intent: "TAKE", confirmed: true }] }));
s6.SemanticActions.hydrate(memA);
s6.SemanticActions.Evidence.record({ intent: "LIVE", confirmed: false });
s6.SemanticActions.hydrate(memA); // second hydrate call for the SAME build must be a no-op
ok(s6.SemanticActions.Evidence.all().some(function (e) { return e.intent === "LIVE"; }),
    "a second hydrate() call for the same build does not wipe evidence recorded since the first hydrate (hydrate-once guard)");

// --- D85 legacy import: at most once, always provisional, never confirmed ---
var s7 = makeSandbox();
s7.AttrCalibrator = { table: { verbBehavior: { substituteVerb: "feel" } } };
s7.SemanticActions.hydrate(memA);
var legacy = s7.SemanticActions.Evidence.all().filter(function (e) { return e.source === "d85-legacy-import"; });
ok(legacy.length === 1 && legacy[0].confirmed === false && legacy[0].command === "feel",
    "D85 substitute-verb data ('feel') is imported once as provisional (never confirmed) evidence");
s7.SemanticActions.hydratedForBuild = null; // force a second hydrate pass against the same AttrCalibrator state
s7.SemanticActions.hydrate(memA);
var legacyAgain = s7.SemanticActions.Evidence.all().filter(function (e) { return e.source === "d85-legacy-import"; });
ok(legacyAgain.length === 1, "D85 import does not duplicate on a repeated hydrate pass");

// --- generationReset: clears pending/generation-bound (currently: all) evidence ---
var s8 = makeSandbox();
s8.SemanticActions.Evidence.record({ intent: "TALK_TO", confirmed: false });
s8.SemanticActions.generationReset();
ok(s8.SemanticActions.Evidence.all().length === 0, "generationReset() clears unconfirmed evidence (called from UndoRestoreSync.resync() on real undo/restore/restart)");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) {
    console.error("FAIL: d88-sidecar-persistence (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d88-sidecar-persistence (" + pass + " passed)");
