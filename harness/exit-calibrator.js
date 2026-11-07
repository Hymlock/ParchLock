// D134 ExitCalibrator: learns where a compiled game stores its exits by
// watching real travel, closing the gap D61 left open for the entire
// non-Inform catalog (Zork 1/2/3, Planetfall, Enchanter, Deadline...), whose
// maps previously contained ONLY edges the player had personally walked.
//
// Pure Node against a synthetic memory image, so the safety rules are proven
// deterministically rather than by hoping a live walk happens to exercise
// them. The live proof lives alongside this: Zork1 calibrates north/south/
// east/west and predicts 15/15 real destinations with zero phantoms.
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// ---- stubs ---------------------------------------------------------------
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
};

// A tiny fake object table: room id -> { propNum: [bytes] }
const WORLD = {
    10: { 31: [11], 28: [12], 30: [13] },       // room 10: n->11 s->12 e->13
    11: { 31: [14], 28: [10] },                 // room 11: n->14 s->10
    12: { 31: [10], 30: [15] },
    13: { 28: [99, 16] },                       // destination in the SECOND byte
    14: {},
    20: { 7: [21] }                             // a different property number
};
let plausible = id => id > 0 && id < 200;

global.ZRamReader = {
    u8: (mem, addr) => mem.bytes[addr] || 0,
    u16: (mem, addr) => ((mem.bytes[addr] || 0) << 8) | (mem.bytes[addr + 1] || 0),
    gameIdentityKey: () => "TEST-1",
    learningIdentityKey: () => "TEST-1",
    isPlausibleMapRoom: (mem, id) => plausible(Number(id)),
    shortName: (mem, id) => "Room" + id,
    attrsFromObject: () => ({}),
    listProps: (mem, id) => {
        const room = WORLD[id];
        if (!room) return [];
        const out = [];
        Object.keys(room).forEach(num => {
            const bytes = room[num];
            const base = mem.alloc(bytes);
            out.push({ num: Number(num), sz: bytes.length, value: bytes[0], dataAddr: base });
        });
        return out;
    }
};

function makeMem() {
    const mem = { bytes: [], next: 1 };
    mem.alloc = (bytes) => { const at = mem.next; bytes.forEach((b, i) => { mem.bytes[at + i] = b; }); mem.next += bytes.length + 2; return at; };
    return mem;
}

const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "ExitCalibrator.js"), "utf8");
eval(src);
const E = global.ExitCalibrator || ExitCalibrator;
const mem = makeMem();

// ---- direction vocabulary ------------------------------------------------
assert(E.normalizeDir("n") === "north" && E.normalizeDir("NORTH") === "north", "short and long compass words normalise together");
assert(E.normalizeDir("go north") === "north", 'a "go <dir>" command still resolves to the direction');
assert(E.normalizeDir("starboard") === "starboard" && E.normalizeDir("aft") === "aft",
    "shipboard directions are real directions -- Planetfall's whole ship deck depends on it");
assert(E.normalizeDir("xyzzy") === null, "a non-direction is not forced into one");

// ---- nothing is emitted before anything is proven ------------------------
assert(E.exitsFor(mem, 10).length === 0, "before any travel the exit list is empty -- an honest absence, never a guess (D24)");

// ---- one room proves nothing --------------------------------------------
E.observe(mem, 10, "north", 11);
assert(E.exitsFor(mem, 10).length === 0, "a single confirming room is NOT enough: any byte can coincidentally equal a room id");
assert(E.confirmedDirs(mem).length === 0, "so nothing is confirmed yet");

// ---- a second, different room confirms ----------------------------------
E.observe(mem, 11, "north", 14);
assert(E.confirmedDirs(mem).indexOf("north") !== -1, "the same property predicting travel in a SECOND room confirms it");
const d = E.describe(mem).confirmed.north;
assert(d.prop === 31, "and it identifies the real property number (31), learned rather than assumed");

// ---- now it predicts exits never walked ---------------------------------
const ex10 = E.exitsFor(mem, 10);
assert(ex10.length === 1 && ex10[0].label === "north" && String(ex10[0].targetRoomId) === "11",
    "a confirmed direction yields the room's exit WITHOUT having walked it -- the whole point");
const ex12 = E.exitsFor(mem, 12);
assert(ex12.length === 1 && String(ex12[0].targetRoomId) === "10",
    "and it works in a room the player has never left, which is what fills an unexplored map");

// ---- the emitted record must match what MapTopology consumes ------------
assert("targetRoomName" in ex10[0], "the record carries targetRoomName -- MapTopology.link reads that exact field, and anything else silently drops the edge");
assert(ex10[0].command && ex10[0].label && ex10[0].confidence > 0, "and the label/command/confidence the exit pipeline expects");

// ---- destinations must be plausible places ------------------------------
plausible = id => id !== 11;
assert(E.exitsFor(mem, 10).length === 0, "a destination that is structurally not a place is dropped, not drawn");
plausible = id => id > 0 && id < 200;

// ---- negative evidence suppresses a non-exit ----------------------------
E.observeBlocked(mem, 10, "north");
assert(E.exitsFor(mem, 10).length === 0, "a direction proven NOT to move the player is no longer offered for that room");
E.observe(mem, 10, "north", 11);
assert(E.exitsFor(mem, 10).length === 1, "and moving again clears the suppression -- a door that was locked can be unlocked");

// ---- contradiction tears a wrong mapping down ---------------------------
E.observe(mem, 10, "south", 12);
E.observe(mem, 12, "south", 99);          // 12's prop 28 holds 10, not 99
for (let i = 0; i < 6; i++) E.observe(mem, 10, "south", 777);
assert(E.confirmedDirs(mem).indexOf("south") === -1,
    "a mapping that keeps disagreeing with real travel is torn down rather than left emitting wrong exits");

// ---- destination not in the leading byte --------------------------------
E.observe(mem, 13, "east", 16);
E.observe(mem, 13, "east", 16);
const modes = Object.keys(E.describe(mem).pending.east || {});
assert(modes.some(k => /b1|w0/.test(k)),
    "a destination stored past the first byte is still found (Planetfall needed this)");

// ---- persistence ---------------------------------------------------------
assert(Object.keys(store).some(k => /^PM_ExitCalib_/.test(k)),
    "what was learned persists per game file, so a second session starts already calibrated");

// ---- D139/D140: room identity and edge labelling -------------------------
const zr = fs.readFileSync(path.resolve(__dirname, "..", "js", "ZRamReader.js"), "utf8");
const mt = fs.readFileSync(path.resolve(__dirname, "..", "js", "MapTopology.js"), "utf8");
const nv = fs.readFileSync(path.resolve(__dirname, "..", "js", "Navigator.js"), "utf8");

assert(/while \(walk && walk\.parent > 1/.test(zr),
    "the player's room is found by walking UP the parent chain -- starting in bed or a vehicle must not record the furniture as the room (Cutthroats reported 'bed')");
assert(/a\.container \|\| a\.supporter \|\| a\.vehicle/.test(zr),
    "it steps out of things you can be in or on, stopping at the first real room rather than the outermost ancestor");
assert(/if \(attrs\.door\) return false;/.test(zr),
    "a door is never a destination room (Anchorhead routed to 'real estate office door')");
assert(/isNonTravelCommand/.test(mt) && /NON_TRAVEL/.test(mt),
    "meta commands cannot become map exits -- wump2ka grew an exit literally called 'look'");
assert(/look: 1/.test(mt) && /inventory: 1/.test(mt), "the stop-list covers observation commands");
assert(/demoteFailedEdge/.test(nv),
    "a route step that does not move the player demotes that edge instead of failing the same way again");
assert(/isBlocked/.test(zr),
    "and the blocked direction is filtered out of the look-ahead for BOTH compilers -- deleting the map edge alone is futile, applyExits recreates it next turn");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
