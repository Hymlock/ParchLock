// Verifies js/MapTopology.js ensureRoom keys room identity by ObjectId
// (real RAM room id) first, not by printed Name -- proving:
//   1) two DIFFERENT real rooms sharing the SAME printed name produce TWO
//      distinct room entries (the "two dark rooms both say the same thing"
//      case), and
//   2) the SAME real room seen under TWO DIFFERENT printed names (e.g.
//      before/after being lit) produces ONE room entry, not two.
global.window = global;
global.MapIdentity = { hashName: (n) => "hash_" + n, ensureRoomIdentity: () => {}, migrateAll: () => {} };
global.ParchLockMap = {
    Rooms: [],
    GetRoom: (roomName) => ParchLockMap.Rooms.find(e => e.Name.toLowerCase() == String(roomName).toLowerCase())
};

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "MapTopology.js"), "utf8");
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// Case 1: two different real rooms, identical printed name ("dark room").
ParchLockMap.Rooms.length = 0;
var darkA = MapTopology.ensureRoom("It's too dark to see", "objA");
var darkB = MapTopology.ensureRoom("It's too dark to see", "objB");
assert(darkA.Id !== darkB.Id, "two different real ids sharing an identical name produce two distinct room entries");
assert(ParchLockMap.Rooms.length === 2, "Rooms array has 2 entries for the two distinct dark rooms");

// Case 2: same real room, described under two different printed names
// across visits. D62 (superseding this test's original expectation):
// live-confirmed on wump2ka.z5.js that a game can print a DIFFERENT
// display name for the exact SAME real room object on different visits
// for purely cosmetic/thematic reasons (a randomly-generated dungeon
// crawl's own "Room #N" numbering is not a stable per-room label) -- so
// always trusting the latest reading as an authoritative rename made a
// single real room appear to keep changing its own name every visit.
// There is no non-text-guessing way to tell "this new name is a genuine
// improvement" (the hypothetical dark-room-gets-lit case, never actually
// confirmed live) apart from "this new name is just cosmetic noise" (the
// confirmed Wumpus case) -- so the name is fixed the first time a real id
// is attached and does not change on subsequent calls, favoring the
// confirmed real-world failure mode over an unconfirmed hypothetical one.
ParchLockMap.Rooms.length = 0;
var cellarDark = MapTopology.ensureRoom("It's too dark to see", "objC");
var cellarLit = MapTopology.ensureRoom("Cellar", "objC");
assert(cellarDark.Id === cellarLit.Id, "same real id under two different printed names resolves to one room entry");
assert(ParchLockMap.Rooms.length === 1, "Rooms array has exactly 1 entry for the same real room seen under two names");
assert(cellarLit.Name === "It's too dark to see", "the room's display name is fixed at its first real-id assignment, not overwritten by a later visit's different text (D62)");

// Case 2b: D80 display-name refinement must feed ensureRoom a corrected
// first assignment, so the existing freeze-on-first-real-id behavior preserves
// the descriptive title on revisit instead of flickering back to "Room #N".
ParchLockMap.Rooms.length = 0;
var wumpPretty = MapTopology.ensureRoom("A tiny, polished dead-end", "objWump16");
var wumpGenericRevisit = MapTopology.ensureRoom("Room #16", "objWump16");
assert(wumpPretty.Id === wumpGenericRevisit.Id, "same wump2ka real id still resolves to one room after a generic revisit label");
assert(wumpGenericRevisit.Name === "A tiny, polished dead-end", "corrected wump2ka display label sticks across a later generic Room #N revisit");

// Case 2c (D54 hardened): ensureRoom must REFUSE internal short-names even
// with a real ObjectId -- never mint a C_ROOMS_* / "(Inform Library)" node.
// First player-facing visit creates the room under the refined title only.
ParchLockMap.Rooms.length = 0;
assert(MapTopology.isInternalRoomName("C_ROOMS_4"), "C_ROOMS_4 is classified as an internal room name");
assert(MapTopology.isInternalRoomName("(Inform Library)"), "(Inform Library) is classified as an internal room name");
assert(MapTopology.isInternalRoomName("(darkness object)"), "(darkness object) is classified as an internal room name");
var wumpInternal = MapTopology.ensureRoom("C_ROOMS_4", "objWump4");
assert(wumpInternal == null, "ensureRoom refuses C_ROOMS_* even with a real ObjectId");
assert(MapTopology.ensureRoom("(Inform Library)", "objLib") == null, "ensureRoom refuses (Inform Library)");
assert(MapTopology.ensureRoom("(darkness object)", "objDark") == null, "ensureRoom refuses (darkness object)");
var wumpFacing = MapTopology.ensureRoom("A fair-sized, rough chamber", "objWump4");
assert(!!wumpFacing && wumpFacing.Name === "A fair-sized, rough chamber", "first player-facing visit creates the room under the refined title");
assert(MapTopology.isPlayerFacingRoom(wumpFacing), "refined room is player-facing");
// Internal name must not overwrite or fork once the facing room exists.
var wumpBack = MapTopology.ensureRoom("C_ROOMS_4", "objWump4");
assert(wumpBack == null, "later internal short-name call still refused");
assert(ParchLockMap.Rooms.length === 1, "only the player-facing room exists");
assert(ParchLockMap.Rooms[0].Name === "A fair-sized, rough chamber", "facing Name unchanged after refused internal call");

// Case 2d: link() must not create a visible dest room under C_ROOMS_*.
ParchLockMap.Rooms.length = 0;
MapTopology.ensureRoom("A fair-sized, textured chamber", "objHere");
MapTopology.link("A fair-sized, textured chamber", "exit 1", "C_ROOMS_5", {
    fromId: "objHere", toId: "objWump5", source: "ram-lookahead"
});
assert(ParchLockMap.Rooms.length === 1, "look-ahead internal dest does not create a second Known Rooms entry");
var here = ParchLockMap.GetRoom("A fair-sized, textured chamber");
assert(here && here.ExitMeta && here.ExitMeta["exit 1"] && here.ExitMeta["exit 1"].hinted,
    "internal dest stays as a hinted edge (toId preserved on meta) until visit");
assert(here.Exits["exit 1"] == null, "no Exits[] destination id is published for an internal-only look-ahead name");

// Case 3: existing behavior preserved -- no objectId yet (hinted/untraveled
// stub) still falls back to name-based reuse, so repeated stub references
// to the same unconfirmed name don't explode into duplicate stub rooms.
ParchLockMap.Rooms.length = 0;
var stub1 = MapTopology.ensureRoom("Somewhere unknown", null);
var stub2 = MapTopology.ensureRoom("Somewhere unknown", null);
assert(stub1.Id === stub2.Id, "two references to the same unconfirmed name (no objectId yet) still reuse one stub room");

// Case 4: a stub later gets a real id under the same name -- must become
// one identified room (not a lingering unlinked stub plus a new entry).
ParchLockMap.Rooms.length = 0;
var stub = MapTopology.ensureRoom("Somewhere", null);
var identified = MapTopology.ensureRoom("Somewhere", "objD");
assert(stub.Id === identified.Id, "a name-only stub gains a real id on the same room without forking into a second entry");
assert(ParchLockMap.Rooms[0].ObjectId === "objD", "the stub's ObjectId is populated once a real id becomes known");

// Case 5: WorldModel.refineRoomDisplayName chooses a descriptive second
// status-grid line only when the first status-grid line is a generic Room #N
// banner; single-line status bars keep their title column.
global.$ = function () {
    return {
        length: global.__gridText ? 1 : 0,
        first: function () { return this; },
        clone: function () { return this; },
        find: function () { return { remove: function () { return { end: function () { return global.$(); } }; } }; },
        text: function () { return global.__gridText || ""; }
    };
};
const wmSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "WorldModel.js"), "utf8");
eval(wmSrc);

// Real live Playwright captures of .GridWindow.reverse's raw text (no
// invented/synthetic line breaks -- verified 2026-09-13 against the actual
// running games; wump2ka's real text is ONE line with multiple 3+-space-gap
// columns, not multiple newline-separated lines).
global.__gridText = " Room #19                                                                                                                        Score: 2       A vast, creased, watery room                                                                                                   Health: 73%    ";
assert(
    WorldModel.refineRoomDisplayName({ roomName: "C_ROOMS_19" }) === "A vast, creased, watery room",
    "wump2ka single-line, multi-column status grid prefers the descriptive column over generic Room #N"
);

global.__gridText = " Outside the Real Estate Office                                                                                     day one                    ";
assert(
    WorldModel.refineRoomDisplayName({ roomName: "Outside the Real Estate Office" }) === "Outside the Real Estate Office",
    "Anchorhead-style single-line status grid keeps the first title column"
);

global.__gridText = " Clearing                                                                                                                   Score: 0  Turns: 5 ";
assert(
    WorldModel.refineRoomDisplayName({ roomName: "Clearing" }) === "Clearing",
    "Zork1-style single-line status grid keeps the first title column"
);

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
