// D215 save-tied state: focused node fixture for js/SaveState.js (claude).
// Stubs only what SaveState touches; the live Zork/Treasures proofs run in a
// browser separately once the UndoRestoreSync and Actionable halves land.
const path = require("path");
let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.log("FAIL:", msg); } }

const store = {};
let quota = false;
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { if (quota) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; } store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    key: i => Object.keys(store)[i],
    get length() { return Object.keys(store).length; }
};
const shown = [];
global.Message = { Show: (t, b) => shown.push(b) };
global.ParchLock = { GameId: "short", GameFilename: "games/x.z5.js" };
global.Transcript = { digest: "story1" };   // the exact executable digest
global.WorkspaceUI = {
    MapKey: () => "PL_MapSlots_" + ParchLock.GameFilename,
    MapData: () => ({ Format: "ParchLockMap", Version: 1, Story: ParchLock.GameFilename, Map: ParchLockMap.Rooms }),
    ValidateMap: d => { if (!Array.isArray(d.Map) || d.Map.some((r, i) => !r || r.Id !== i || typeof r.Name !== "string")) throw new Error("bad"); return d; }
};
const room = (id, name, exits) => ({ Id: id, Name: name, Exits: exits || {}, Notes: [] });
global.ParchLockMap = {
    Rooms: [], saved: 0,
    Clear: () => { ParchLockMap.Rooms = []; },
    Save: () => { ParchLockMap.saved++; store["PL_Map_" + ParchLock.GameFilename] = JSON.stringify(ParchLockMap.Rooms); },
    Draw: () => {}
};
let applied = null, cleared = 0;
global.Actionable = {
    labelSnapshot: () => ({ schema: 1, labels: { 12: { phrase: "absorbent space-rag", words: ["space-rag", "rag"] } } }),
    applyLabelSnapshot: s => { applied = s; },
    clearLabelSnapshot: () => { cleared++; }
};
const S = require(path.resolve(__dirname, "..", "js", "SaveState.js"));

// save A -> more exploring -> save B -> restore A -> restore B
ParchLockMap.Rooms = [room(0, "West of House", { n: 1 }), room(1, "North of House", { s: 0 })];
S.onLifecycle("save", { name: "A" });
ParchLockMap.Rooms = [room(0, "West of House", { n: 1 }), room(1, "North of House", { s: 0, e: 2 }), room(2, "Behind House", { w: 1 })];
S.onLifecycle("save", { name: "B" });
S.onLifecycle("restore", { name: "A" });
assert(ParchLockMap.Rooms.length === 3, "a restore is only staged; nothing changes before the resync applies it");
assert(S.applyPending("restore_file", 7) === true && ParchLockMap.Rooms.length === 2, "applying the restore of save A brings back A's 2-room map");
assert(applied && applied.labels["12"].phrase === "absorbent space-rag", "and A's display labels go to Actionable.applyLabelSnapshot");
S.onLifecycle("restore", { name: "B" }); S.applyPending("restore_file", 8);
assert(ParchLockMap.Rooms.length === 3, "restoring save B brings back B's 3-room map");
assert(S.applyPending("restore_file", 9) === false, "nothing pending: applyPending returns false so the legacy path runs");

// a save made before this feature has no snapshot -> clean state
S.onLifecycle("restore", { name: "old-save" }); const c0 = cleared; S.applyPending("restore_file", 10);
assert(ParchLockMap.Rooms.length === 0 && cleared === c0 + 1, "a save with no snapshot restores a clean map and no labels");

// new game: archive (flagged), then clear; pruning only touches flagged slots
store[WorkspaceUI.MapKey()] = JSON.stringify([{ Name: "Before new game (mine)", Date: "x", Data: { Map: [] } }]);
for (let i = 0; i < 5; i++) {
    ParchLockMap.Rooms = [room(0, "Room " + i)];
    S.onLifecycle("restart"); S.applyPending("restart", 20 + i);
}
const slots = JSON.parse(store[WorkspaceUI.MapKey()]);
assert(slots.filter(s => s.autoArchive === true).length === 3, "at most 3 automatic archives are kept");
assert(slots.some(s => s.Name === "Before new game (mine)" && !s.autoArchive), "an operator slot with a similar name is never pruned");
assert(ParchLockMap.Rooms.length === 0, "a new game starts with an empty map after archiving");
assert(slots.filter(s => s.autoArchive).every(s => s.Data && Array.isArray(s.Data.Map) && s.Data.Map.length === 1), "archives use the Maps slot format and can be loaded from Maps");

// archive failure keeps the working map
ParchLockMap.Rooms = [room(0, "Precious")]; quota = true; shown.length = 0;
S.onLifecycle("restart"); S.applyPending("restart", 30);
assert(ParchLockMap.Rooms.length === 1 && shown.length === 1, "if the archive cannot be written, the map is kept and an error is reported");
quota = false;

// fresh boot archives then clears
ParchLockMap.Rooms = [room(0, "Old session room")];
S.onLifecycle("boot");
assert(ParchLockMap.Rooms.length === 0, "a fresh start (no observed autorestore) clears the map after archiving it");

// forget and uninstall
S.onLifecycle("forget", { names: ["A"] });
assert(!store["PL_SaveState_story1_A"] && !!store["PL_SaveState_story1_B"], "a deleted save takes only its own snapshot");
S.removeStory("story1");
assert(!Object.keys(store).some(k => k.indexOf("PL_SaveState_story1_") === 0), "uninstalling removes every snapshot of that story");

// package export/import and validation of untrusted input
ParchLockMap.Rooms = [room(0, "West of House")]; S.onLifecycle("save", { name: "P" });
const exported = S.exportFor(["P", "missing"]);
assert(exported && exported.story === "story1" && Object.keys(exported.saves).join() === "P", "export carries only the named saves' snapshots");
delete store["PL_SaveState_story1_P"];
assert(S.validImport(exported) === true, "a clean package block validates");
const writes = S.importWrites(exported, ["P"]);
writes.forEach(w => { if (w.Data === null) delete store[w.Key]; else store[w.Key] = w.Data; });
assert(!!store["PL_SaveState_story1_P"], "and imports through the importer's own rollback-able writes");
store["PL_SaveState_story1_Q"] = JSON.stringify({ schema: 1, story: "story1", map: [room(0, "Old Q")] });
const w2 = S.importWrites(null, ["Q"]);
assert(w2.length === 1 && w2[0].Key === "PL_SaveState_story1_Q" && w2[0].Data === null, "an imported save with no packaged snapshot removes the old snapshot of that name");
assert(S.importWrites(exported, []).length === 0, "names not imported as saves are never touched");
assert(S.validImport(null) === true && S.validImport(undefined) === true, "a package without save maps is fine");
assert(S.validImport(Object.assign({}, exported, { story: "other" })) === false, "a block for another story is rejected");
const badMap = JSON.parse(JSON.stringify(exported)); badMap.saves.P.map[0].Exits = { n: 99 };
assert(S.validImport(badMap) === false, "a map with an out-of-range exit is rejected");
const badLabels = JSON.parse(JSON.stringify(exported)); badLabels.saves.P.labels = { schema: 1, labels: { "abc": { phrase: "x", words: [] } } };
assert(S.cleanLabels(badLabels.saves.P.labels) && Object.keys(S.cleanLabels(badLabels.saves.P.labels).labels).length === 0, "non-numeric label ids are dropped");
const proto = S.cleanLabels(JSON.parse('{"schema":1,"labels":{"__proto__":{"phrase":"x","words":["x"]},"5":{"phrase":"lamp","words":["lamp"]}}}'));
assert(proto && Object.keys(proto.labels).join() === "5" && Object.getPrototypeOf(proto.labels) === null, "prototype keys are refused and records have no prototype");
const long = S.cleanLabels({ schema: 1, labels: { 7: { phrase: "x".repeat(1025), words: ["x"] } } });
assert(Object.keys(long.labels).length === 0, "phrases over 1024 characters are refused");
const many = S.cleanLabels({ schema: 1, labels: { 7: { phrase: "a long two-handed sword", words: Array(128).fill("sword") } } });
assert(Object.keys(many.labels).length === 1, "up to 128 words are kept (no truncation of legitimate names)");

assert(S.cleanLabels({ schema: 1, labels: [{ phrase: "x", words: ["x"] }] }) === null, "an array is refused as the labels container");
assert(Object.keys(S.cleanLabels({ schema: 1, labels: { 65536: { phrase: "x", words: ["x"] }, 65535: { phrase: "y", words: ["y"] } } }).labels).join() === "65535", "object ids above 65535 are refused");
store[WorkspaceUI.MapKey()] = "{not json"; ParchLockMap.Rooms = [room(0, "Keep me")]; shown.length = 0;
S.onLifecycle("restart"); S.applyPending("restart", 40);
assert(ParchLockMap.Rooms.length === 1 && shown.length === 1, "an unreadable Maps list is reported and the working map is kept");
S.onLifecycle("restore", { name: "" }); S.applyPending("restore_file", 41);
assert(ParchLockMap.Rooms.length === 0, "a successful restore of an unknown save restores a clean state");
// only the authoritative reason consumes a staged event (codex #2229)
ParchLockMap.Rooms = [room(0, "West of House")]; S.onLifecycle("save", { name: "R" });
ParchLockMap.Rooms = [room(0, "Elsewhere"), room(1, "Further")];
S.onLifecycle("restore", { name: "R" });
assert(S.applyPending(undefined, 50) === false && ParchLockMap.Rooms.length === 2, "a generic resync does not consume a staged restore");
assert(S.applyPending("restore_file", 51) === true && ParchLockMap.Rooms.length === 1, "the authoritative restore_file resync applies it");
// snapshot write failure invalidates the older snapshot of that save
ParchLockMap.Rooms = [room(0, "Newer")]; quota = true; shown.length = 0;
S.onLifecycle("save", { name: "R" }); quota = false;
assert(!store["PL_SaveState_story1_R"] && shown.length === 1, "a failed snapshot write removes the older snapshot and reports it");
S.onLifecycle("restore", { name: "R" }); S.applyPending("restore_file", 52);
assert(ParchLockMap.Rooms.length === 0, "so that save then restores a clean map, never the previous one");
console.log(pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
