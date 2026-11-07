/**
 * D23 / #28 / #29: look-ahead exit labels from an I6 direction-property
 * profile, not destination-room name matching.
 *
 * Pre-travel (no movement command issued):
 *   - n/s/e/w/ne/nw/se/sw/u/d/in/out resolve to those words via property
 *     numbers 7-18 (inform6lib 6.12.2 linklpa.h; n_to=7).
 *   - an unmapped numbered property stays the honest stub "exit-N".
 *
 * Post-travel: MapTopology.applyStateDelta labels a numbered hop from the
 * typed command ("1"), which is already implemented — this fixture proves
 * the two paths work together, not that we guess "north" for a "1" exit.
 *
 * Usage: node harness/d23-lookahead-labels.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "MapIdentity.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "MapTopology.js"), "utf8"), sandbox);

const ZRamReader = sandbox.ZRamReader;
const MapTopology = sandbox.MapTopology;
if (!ZRamReader || !MapTopology) {
    console.error("FAIL: ZRamReader / MapTopology did not load");
    process.exit(1);
}

let pass = 0;
let fail = 0;
function assert(cond, msg) {
    if (!cond) {
        fail++;
        console.error("FAIL:", msg);
        return;
    }
    pass++;
    console.log("PASS:", msg);
}

function setU16(mem, addr, val) {
    mem[addr] = (val >> 8) & 0xff;
    mem[addr + 1] = val & 0xff;
}

function encodeZsc(str) {
    const a0 = "abcdefghijklmnopqrstuvwxyz";
    const zchars = [];
    const s = String(str || "").toLowerCase();
    for (let i = 0; i < s.length; i++) {
        const ch = s.charAt(i);
        if (ch === " ") { zchars.push(0); continue; }
        const idx = a0.indexOf(ch);
        zchars.push(idx >= 0 ? idx + 6 : 0);
    }
    while (zchars.length % 3) zchars.push(5);
    const words = [];
    for (let i = 0; i < zchars.length; i += 3) {
        let w = ((zchars[i] & 0x1f) << 10) | ((zchars[i + 1] & 0x1f) << 5) | (zchars[i + 2] & 0x1f);
        if (i + 3 >= zchars.length) w |= 0x8000;
        words.push(w);
    }
    return words;
}

function writeProps(mem, addr, name, props) {
    const words = encodeZsc(name);
    mem[addr] = words.length;
    let p = addr + 1;
    for (let i = 0; i < words.length; i++) {
        setU16(mem, p, words[i]);
        p += 2;
    }
    (props || []).forEach(function (prop) {
        const num = prop.num & 0x3f;
        mem[p] = 0x40 | num;
        p += 1;
        setU16(mem, p, prop.value);
        p += 2;
    });
    mem[p] = 0;
    return p + 1;
}

const DIRS = [
    { num: 7, label: "north", dest: "northroom" },
    { num: 8, label: "south", dest: "southroom" },
    { num: 9, label: "east", dest: "eastroom" },
    { num: 10, label: "west", dest: "westroom" },
    { num: 11, label: "northeast", dest: "noroom" },
    { num: 12, label: "northwest", dest: "nwroom" },
    { num: 13, label: "southeast", dest: "seroom" },
    { num: 14, label: "southwest", dest: "swroom" },
    { num: 15, label: "up", dest: "uproom" },
    { num: 16, label: "down", dest: "downroom" },
    { num: 17, label: "in", dest: "inroom" },
    { num: 18, label: "out", dest: "outroom" }
];

function buildCompassWorld() {
    const mem = new Uint8Array(4096);
    const OBJ_TABLE = 0x100;
    const DEFAULTS = 63;
    const ENTRY = 14;
    const firstObj = OBJ_TABLE + DEFAULTS * 2;

    mem[0] = 5;
    setU16(mem, 4, 0x800);
    setU16(mem, 8, 0x080);
    setU16(mem, 10, OBJ_TABLE);
    setU16(mem, 12, 0x090);
    setU16(mem, 14, 0x800);
    setU16(mem, 24, 0x040);
    // D61: lookAheadExits now gates its whole Inform-property-number
    // apparatus behind a real compiler-stamp check (isInformCompiled) --
    // this synthetic fixture must carry the same stamp a real Inform-
    // compiled game has (header $3C/$3D = ASCII "6.") or every assertion
    // below would see an empty exits array, matching what a genuine
    // non-Inform game now correctly gets instead.
    mem[0x3C] = 0x36;
    mem[0x3D] = 0x2E;
    mem[0x080] = 0;
    mem[0x081] = 9;
    setU16(mem, 0x082, 0);

    // 1 start, 2-13 compass dests, 14 numbered dest, 15 decoy "north" object (not a room prop target)
    const IDS = { start: 1, numbered: 14, decoyNorth: 15 };
    DIRS.forEach(function (d, i) { IDS[d.label] = 2 + i; });

    function objBase(id) { return firstObj + (id - 1) * ENTRY; }
    function writeObj(id, parent, sibling, child) {
        const b = objBase(id);
        setU16(mem, b + 6, parent);
        setU16(mem, b + 8, sibling);
        setU16(mem, b + 10, child);
    }

    const maxId = 15;
    for (let id = 1; id <= maxId; id++) {
        const sibling = id < maxId ? id + 1 : 0;
        writeObj(id, 0, sibling, id === 1 ? 0 : 0);
        // Dest rooms need a child so the extra parent=0 scan (props outside candidates)
        // would still accept them; give each dest a dummy self-child-less sibling chain.
    }
    // Give dest rooms a child object so parent=0 && kids.length>=1 holds if scanned that way.
    // Child 15 lives in dest 2 (northroom) as a scenery dummy — wait, 15 is decoy.
    // Use no extra children; the candidate scan does not require kids.

    let propAt = 0x500;
    const names = { 1: "foyer", 14: "sidecave", 15: "north" };
    DIRS.forEach(function (d) { names[IDS[d.label]] = d.dest; });

    const startProps = DIRS.map(function (d) {
        return { num: d.num, value: IDS[d.label], words: 2 };
    });
    startProps.push({ num: 23, value: IDS.numbered ? 14 : 14, words: 2 });

    for (let id = 1; id <= maxId; id++) {
        const props = id === 1 ? startProps : [];
        setU16(mem, objBase(id) + 12, propAt);
        propAt = writeProps(mem, propAt, names[id], props);
    }

    return { mem, IDS, names };
}

const zrSrc = fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8");
const lookSrc = zrSrc.slice(zrSrc.indexOf("lookAheadExits:"), zrSrc.indexOf("snapshot:"));
assert(!/CARD\[tname\]/.test(lookSrc), "lookAheadExits no longer labels by destination short name");
assert(/directionLabelForProp/.test(lookSrc), "lookAheadExits uses directionLabelForProp");
assert(ZRamReader.directionProps.PROFILE_ID === "i6-lib-6.12.2-linklpa-dirs", "profile id is i6 6.12.2 dirs");
assert(ZRamReader.directionProps.PROFILE[7] === "north", "n_to is property 7");
assert(ZRamReader.directionProps.PROFILE[12] === "northwest", "6.12.2 order: nw (12) before se (13)");
assert(ZRamReader.directionProps.PROFILE[13] === "southeast", "se_to is property 13");
assert(ZRamReader.directionLabelForProp(7) === "north", "prop 7 labels north");
assert(ZRamReader.directionLabelForProp(23) === "exit-23", "unmapped prop 23 is honest exit-23");

const world = buildCompassWorld();
// D13/P13b + D217: calibrateDiagonalFromTravel hydrates via ZRamProvider.getMem
// and LearningStores identity. Without a stable mem+key, lookAheadExits re-hydrates
// against a different token and clears diagonalCalibrated before the after-check.
sandbox.ZRamProvider = { getMem: function () { return world.mem; } };
sandbox.LearningStores = {
    register: function () {},
    identity: function () { return { identityKey: "d23-fixture", digest: "d23" }; },
    readOwned: function () { return { status: "ready", value: null }; },
    persist: function () {}
};
const exits = ZRamReader.lookAheadExits(world.mem, world.IDS.start);
const byLabel = {};
(exits || []).forEach(function (e) { byLabel[e.label] = e; });

// D49/D51: nw/se (props 12/13) are the one documented point of real
// variance between I6 library revisions. Until real travel evidence
// calibrates which word is which for THIS story, lookAheadExits must
// never assert a single possibly-wrong compass word (D49), but it also
// must not hide a real, structurally-known exit entirely (D51 -- hiding
// it was rejected as unacceptable too). Every non-diagonal direction has
// no such ambiguity and resolves to its one real compass word as before.
DIRS.forEach(function (d) {
    if (d.num === 12 || d.num === 13) return; // covered separately below
    const hit = byLabel[d.label];
    assert(!!hit, "pre-travel look-ahead has " + d.label + " (prop " + d.num + ")");
    if (hit) {
        assert(hit.prop === d.num, d.label + " is property " + d.num + " not a name match");
        assert(hit.targetRoomId === world.IDS[d.label], d.label + " target is the dest room id");
        assert(String(hit.targetRoomName).toLowerCase() === d.dest, d.label + " target name is " + d.dest);
    }
});

// This fixture deliberately gives BOTH props 12 and 13 their own real,
// DIFFERENT destinations (nwroom/seroom) -- the rare case where a room
// genuinely has two real diagonal exits before calibration. Prop 12 is
// read first, so both compass words are offered for ITS destination;
// prop 13's real, different destination must still be visible (never
// silently dropped) but can't claim either already-used word yet, so it
// surfaces under the honest neutral placeholder "exit-13" until
// calibration (from a real move anywhere in the game) resolves which word
// belongs to which property.
assert(!!byLabel.northwest && byLabel.northwest.targetRoomId === world.IDS.northwest, "northwest candidate points at prop 12's real destination");
assert(!!byLabel.southeast && byLabel.southeast.targetRoomId === world.IDS.northwest, "southeast candidate ALSO points at prop 12's destination (both words claimed by the first-read property)");
assert(byLabel.northwest.ambiguousDiagonal === true && byLabel.southeast.ambiguousDiagonal === true, "both candidate words are flagged ambiguous pre-calibration");
assert(!!byLabel["exit-13"], "prop 13's real, different destination is NOT silently dropped");
assert(byLabel["exit-13"].targetRoomId === world.IDS.southeast, "exit-13 correctly points at prop 13's own real destination");
assert(byLabel["exit-13"].prop === 13, "exit-13 keeps its own real property number");

// D49/D51 calibration: real evidence (a typed "southeast" that reaches the
// exact destination prop 13 already resolves to) must flip diagonalSwapped
// to match this fixture's actual wiring (12=northwest, matching the file's
// own unswapped PROFILE baseline -- so no swap should be recorded), mark
// diagonalCalibrated, and from then on lookAheadExits must assert exactly
// the one real compass word for EACH property instead of offering
// candidates or the exit-13 neutral placeholder.
{
    const nwHit = byLabel.northwest;
    const flipped = ZRamReader.calibrateDiagonalFromTravel(12, "northwest", nwHit.targetRoomId, nwHit.targetRoomId);
    assert(flipped === true, "calibrateDiagonalFromTravel accepts matching real evidence");
    assert(ZRamReader.directionProps.diagonalCalibrated === true, "diagonal profile is calibrated after real evidence");
    assert(ZRamReader.directionProps.diagonalSwapped === false, "this fixture's wiring matches the unswapped baseline, so swapped stays false");
    const exitsAfter = ZRamReader.lookAheadExits(world.mem, world.IDS.start);
    const byLabelAfter = {};
    (exitsAfter || []).forEach(function (e) { byLabelAfter[e.label] = e; });
    assert(!!byLabelAfter.northwest && !byLabelAfter.northwest.ambiguousDiagonal && byLabelAfter.northwest.targetRoomId === world.IDS.northwest,
        "after calibration, prop 12 resolves to the real compass word northwest, no longer ambiguous");
    assert(!!byLabelAfter.southeast && !byLabelAfter.southeast.ambiguousDiagonal && byLabelAfter.southeast.targetRoomId === world.IDS.southeast,
        "after calibration, prop 13 resolves to its own real compass word southeast, no longer collapsed into exit-13");
}

assert(!byLabel.north || byLabel.north.targetRoomId !== world.IDS.decoyNorth,
    "north label is not the object whose short name is 'north'");
const numbered = (exits || []).find(function (e) { return e.prop === 23; });
assert(!!numbered, "pre-travel look-ahead found the numbered property 23");
assert(numbered && numbered.label === "exit-23", "numbered exit stays honest exit-23 before travel");
assert(numbered && numbered.targetRoomId === 14, "numbered exit target is sidecave");
assert(numbered && numbered.isNonCardinal === true, "exit-23 is classified non-cardinal");

// MapTopology state-delta: after the player types "1", the edge is labeled "1"
sandbox.ParchLockMap = {
    Rooms: [],
    CurrentRoom: "",
    GetRoom: function (name) {
        return this.Rooms.find(function (r) { return r.Name === name; }) || null;
    }
};
// Arrival from room 99 (M09 admits a first room the player moved into).
MapTopology.prevRoomId = 99;
MapTopology.prevRoomName = "";
MapTopology.lastCommand = "";
// Fixture rooms are synthetic; do not let live isPlausibleMapRoom drop them.
var _plausible = ZRamReader.isPlausibleMapRoom;
ZRamReader.isPlausibleMapRoom = function () { return true; };
MapTopology.applyPayloadExits({
    roomId: 1,
    roomName: "foyer",
    exits: exits,
    probe: { roomSource: "player-containment", roomId: 1 }
});
const foyerBefore = sandbox.ParchLockMap.GetRoom("foyer");
assert(foyerBefore && foyerBefore.Exits && foyerBefore.Exits.north != null, "payload look-ahead linked north pre-travel");
assert(foyerBefore && foyerBefore.ExitMeta && foyerBefore.ExitMeta["exit-23"], "payload look-ahead hinted exit-23 pre-travel");

MapTopology.prevRoomId = 1;
MapTopology.prevRoomName = "foyer";
MapTopology.noteCommand("1");
MapTopology.applyStateDelta({ roomId: 14, roomName: "sidecave", probe: { roomSource: "player-containment", roomId: 14 } });
const foyerAfter = sandbox.ParchLockMap.GetRoom("foyer");
assert(foyerAfter && foyerAfter.Exits && foyerAfter.Exits["1"] != null, "state-delta labels the numbered hop from typed command 1");
assert(foyerAfter.ExitMeta["1"] && foyerAfter.ExitMeta["1"].source === "state-delta", "typed 1 is state-delta, not a compass guess");

// D35 stub-discovery (accepted 2026-09-12): name-text guessing
// (numberedExitLabel/compassChildren, matching decoded object short names
// against compass words/ordinals) was rejected and reverted -- that was
// the D24/D25 anti-pattern. The accepted mechanism below uses zero name
// text: directionDoorDirs finds the direction-holder object purely by
// RAM structure (>=8 children sharing a common "kind" value at common
// prop 2, each carrying a distinct door_dir at common prop 21), and
// isIndivTable confirms a room's property-3 pointer decodes as an I7
// individual-property table by numeric key range (all keys >= 64), not
// by name. Matched door_dir numbers become honest dest-less exit-N
// hinted stubs -- no destination is fabricated.
function buildI7World() {
    const mem = new Uint8Array(4096);
    const OBJ_TABLE = 0x100;
    const DEFAULTS = 63;
    const ENTRY = 14;
    const firstObj = OBJ_TABLE + DEFAULTS * 2;

    mem[0] = 5;
    setU16(mem, 4, 0x800);
    setU16(mem, 8, 0x080);
    setU16(mem, 10, OBJ_TABLE);
    setU16(mem, 12, 0x090);
    setU16(mem, 14, 0x800);
    setU16(mem, 24, 0x040);
    // D61: lookAheadExits now gates its whole Inform-property-number
    // apparatus behind a real compiler-stamp check (isInformCompiled) --
    // this synthetic fixture must carry the same stamp a real Inform-
    // compiled game has (header $3C/$3D = ASCII "6.") or every assertion
    // below would see an empty exits array, matching what a genuine
    // non-Inform game now correctly gets instead.
    mem[0x3C] = 0x36;
    mem[0x3D] = 0x2E;
    mem[0x080] = 0;
    mem[0x081] = 9;
    setU16(mem, 0x082, 0);

    const ROOM = 1, COMPASS = 2;
    const CHILD_NAMES = ["zeplek", "vorn", "krix", "amble", "dulon", "fenwick", "grommet", "hazlit"];
    function objBase(id) { return firstObj + (id - 1) * ENTRY; }
    function writeObj(id, parent, sibling, child) {
        const b = objBase(id);
        setU16(mem, b + 6, parent);
        setU16(mem, b + 8, sibling);
        setU16(mem, b + 10, child);
    }

    const ROOM2 = 11;
    writeObj(ROOM, 0, COMPASS, 0);
    writeObj(COMPASS, 0, 0, 3);
    for (let i = 0; i < CHILD_NAMES.length; i++) {
        const id = 3 + i;
        const sib = i < CHILD_NAMES.length - 1 ? id + 1 : 0;
        writeObj(id, COMPASS, sib, 0);
    }
    writeObj(ROOM2, 0, 0, 0);

    let propAt = 0x300;
    setU16(mem, objBase(ROOM) + 12, propAt);
    propAt = writeProps(mem, propAt, "foyer", [{ num: 3, value: 0x600 }]);
    setU16(mem, objBase(COMPASS) + 12, propAt);
    propAt = writeProps(mem, propAt, "compass", []);
    const doorDirBase = 91;
    for (let i = 0; i < CHILD_NAMES.length; i++) {
        const id = 3 + i;
        setU16(mem, objBase(id) + 12, propAt);
        propAt = writeProps(mem, propAt, CHILD_NAMES[i], [
            { num: 2, value: 77 },
            { num: 21, value: doorDirBase + i }
        ]);
    }
    // D35: ROOM2 is a genuine second map-room -- its own prop-3 decodes as
    // a real I7 indiv table carrying one of the SAME numbered door_dir
    // keys (structural proof, not a name/parent check).
    setU16(mem, objBase(ROOM2) + 12, propAt);
    propAt = writeProps(mem, propAt, "annex", [{ num: 3, value: 0x610 }]);

    // D35: ROOM's own IndivTable at 0x600. door_dir 91 -> ROOM2 (a real,
    // structurally-validated destination: pushExit, hinted:false). door_dir
    // 92 -> COMPASS (an in-range object with NO indiv table of its own --
    // mirrors real live evidence of in-range-but-non-room indiv values,
    // e.g. Grok's D35 finding of indiv[81]=Routine/indiv[86]=(Fish) on a
    // live game -- must stay a dest-less hinted stub, never fabricated).
    setU16(mem, 0x600, 91);
    mem[0x602] = 1;
    mem[0x603] = ROOM2;
    setU16(mem, 0x604, 92);
    mem[0x606] = 1;
    mem[0x607] = COMPASS;
    setU16(mem, 0x608, 0);

    // ROOM2's own IndivTable at 0x610: needs >=2 keys (isIndivTable's own
    // requirement) both >=64; only presence of a shared door_dir key is
    // checked, not its value.
    setU16(mem, 0x610, 91);
    mem[0x612] = 1;
    mem[0x613] = 0;
    setU16(mem, 0x614, 92);
    mem[0x616] = 1;
    mem[0x617] = 0;
    setU16(mem, 0x618, 0);

    return { mem, ROOM, ROOM2, COMPASS, doorDirBase, names: CHILD_NAMES };
}

const i7 = buildI7World();
assert(ZRamReader.isIndivTable(ZRamReader.parseIndivTable(i7.mem, 0x600)), "room.3 pointer decodes as an I7 indiv table (keys >= 64)");
const foundDoorDirs = ZRamReader.directionDoorDirs(i7.mem);
assert(foundDoorDirs.indexOf(91) >= 0, "directionDoorDirs finds door_dir 91 without reading names");
assert(foundDoorDirs.indexOf(92) >= 0, "directionDoorDirs finds door_dir 92 without reading names");
const i7Exits = ZRamReader.lookAheadExits(i7.mem, i7.ROOM);
const i7ByLabel = {};
(i7Exits || []).forEach(function (e) { i7ByLabel[e.label] = e; });
// D35 destination-resolution (accepted): door_dir 91's value (ROOM2) IS a
// genuine map-room (its own prop-3 decodes as a real IndivTable sharing a
// door_dir key) -> real destination-backed exit, hinted:false. door_dir
// 92's value (COMPASS) is in-range but has no IndivTable of its own -> a
// dest-less honest stub, exactly like Grok's live evidence of in-range
// indiv values that are not rooms (e.g. indiv[81]=Routine). Validation is
// structural only (isIndivTable + shared door_dir key) -- no parent===24,
// no short-name/compass-word/ordinal-text matching (D24/D25).
// D60: the display label for a numbered door_dir exit is now "exit N"
// (N = the same real structural ordinal rank the "xN" submit command
// already uses -- room-local, sorted ascending among only THIS room's
// populated door_dir values, not the raw property number) instead of the
// old "exit-91"-style raw-property label, because the raw property number
// never matched anything in a real game's own printed text ("Exit 1"/
// "Exit 2"), so it was never underlined/clickable there (live-confirmed
// against wump2ka.z5.js). door_dir 91 and 92 are the two populated slots
// here, sorted ascending, so 91 is ordinal 1 and 92 is ordinal 2.
assert(!!i7ByLabel["exit 1"], "I7 indiv table produces an exit for door_dir 91 (ordinal 1)");
assert(i7ByLabel["exit 1"] && !i7ByLabel["exit 1"].hinted && i7ByLabel["exit 1"].targetRoomId === i7.ROOM2 && i7ByLabel["exit 1"].prop === 91,
    "door_dir 91 (ordinal 1) resolves to the real destination room (ROOM2), not a stub");
assert(!!i7ByLabel["exit 2"], "I7 indiv table produces an exit for door_dir 92 (ordinal 2)");
assert(i7ByLabel["exit 2"] && i7ByLabel["exit 2"].hinted && !i7ByLabel["exit 2"].targetRoomId && i7ByLabel["exit 2"].prop === 92,
    "door_dir 92 (ordinal 2, dest=COMPASS, not a map-room) stays an honest dest-less stub");
assert(!i7ByLabel["exit 3"], "zero-valued indiv slot 93 is not emitted");
assert(!i7.names.some(function (n) { return !!i7ByLabel[n.toLowerCase()]; }), "I7 exit labels are not object short names");
assert(ZRamReader.destIsMapRoom(i7.mem, i7.ROOM2, ZRamReader.objectCount(i7.mem), foundDoorDirs), "destIsMapRoom validates the real destination room directly");
assert(!ZRamReader.destIsMapRoom(i7.mem, i7.COMPASS, ZRamReader.objectCount(i7.mem), foundDoorDirs), "destIsMapRoom refutes an in-range object with no IndivTable of its own");

sandbox.ParchLockMap.Rooms = [];
sandbox.ParchLockMap.CurrentRoom = "";
// M09 (df1d172) refuses exits from an unannounced first room on an empty map; this
// fixture is the player arriving from room 37, which M09 admits.
MapTopology.prevRoomId = 37;
MapTopology.prevRoomName = "";
MapTopology.lastCommand = "";
sandbox.ZRamProvider = { getMem: function () { return i7.mem; } };
MapTopology.applyPayloadExits({
    roomId: 38,
    roomName: "pit",
    exits: [
        { label: "exit-1", hinted: true },
        { label: "exit-2", hinted: true }
    ],
    probe: { roomSource: "player-containment", roomId: 38 }
});
const pit = sandbox.ParchLockMap.GetRoom("pit");
assert(pit && pit.ExitMeta && pit.ExitMeta["exit-1"] && pit.ExitMeta["exit-1"].hinted, "applyPayloadExits marks dest-less exit-1 as hinted");
assert(pit && pit.ExitMeta && pit.ExitMeta["exit-2"] && pit.ExitMeta["exit-2"].hinted, "applyPayloadExits marks dest-less exit-2 as hinted");
assert(!(pit && pit.Exits && pit.Exits["exit-1"]), "hinted stub is not a traveled Exits edge");
assert(MapTopology.countRoomExits(pit) === 2, "countRoomExits includes dest-less hinted stubs in the exit total");
assert(MapTopology.countRoomExits({ Exits: { north: 1 }, ExitMeta: { "exit-1": { hinted: true } } }) === 2, "countRoomExits unions traveled + hinted");
assert(MapTopology.countRoomExits({ Exits: {}, ExitMeta: {} }) === 0, "empty room still counts 0 exits");

assert(!/shortName\(mem,\s*c\)/.test(lookSrc) && !/numberedExitLabel/.test(zrSrc), "lookAheadExits has no numberedExitLabel name matcher");
assert(!/compassChildren/.test(zrSrc), "ZRamReader has no compassChildren name matcher");
assert(typeof ZRamReader.numberedExitLabel !== "function", "numberedExitLabel is not exported");

ZRamReader.isPlausibleMapRoom = _plausible;
console.log("");
console.log(pass + " PASS / " + fail + " FAIL");
if (fail) process.exit(1);
