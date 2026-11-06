/**
 * Phase 1 acceptance: RAM-deterministic closed-container gating.
 *
 * Builds a synthetic Z5 object table (room -> closed tin -> matches, plus a
 * locked door exit and name-decoy objects) and asserts:
 *   1. scopeObjects() hides the tin's children while the open bit is clear
 *   2. flipping the RAM open bit makes those children appear
 *   3. attrsFromObject() has no name-regex fallbacks (a "wooden door" without
 *      the door bit is not a door). takeable has no I6 bit (PROFILE null) but
 *      AttributeSchema.applyTo derives it as !static && !scenery (D56) so
 *      ActionSynth can offer TAKE; that derivation is not a name-regex default.
 *   4. lookAheadExits() derives isLocked / isDoor from real bits
 *
 * Usage: node harness/phase1-closed-container.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);

const AttributeSchema = sandbox.AttributeSchema;
const ZRamReader = sandbox.ZRamReader;
if (!AttributeSchema || !ZRamReader) {
    console.error("FAIL: AttributeSchema / ZRamReader did not load");
    process.exit(1);
}

const BITS = {
    container: 4,
    door: 5,
    locked: 11,
    open: 14,
    openable: 15,
    scenery: 17,
    supporter: 20
};

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

function setAttrBit(mem, objBase, n, on) {
    const byteOff = Math.floor(n / 8);
    const bit = 7 - (n % 8);
    if (on) mem[objBase + byteOff] |= (1 << bit);
    else mem[objBase + byteOff] &= ~(1 << bit) & 0xff;
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
        const sz = prop.words || 2;
        if (sz === 2) {
            mem[p] = 0x40 | num;
            p += 1;
            setU16(mem, p, prop.value);
            p += 2;
        } else {
            mem[p] = num;
            p += 1;
            mem[p] = prop.value & 0xff;
            p += 1;
        }
    });
    mem[p] = 0;
    return p + 1;
}

function buildWorld(tinOpen) {
    const mem = new Uint8Array(2048);
    const OBJ_TABLE = 0x100;
    const DEFAULTS = 63;
    const ENTRY = 14;
    const firstObj = OBJ_TABLE + DEFAULTS * 2;

    mem[0] = 5;
    setU16(mem, 4, 0x400);
    setU16(mem, 8, 0x080);
    setU16(mem, 10, OBJ_TABLE);
    setU16(mem, 12, 0x090);
    setU16(mem, 14, 0x400);
    setU16(mem, 24, 0x040);
    // Inform compiler stamp at $3C ("6.") so lookAheadExits's D61
    // isInformCompiled gate treats this fixture as Inform-shaped (the
    // direction-property scan is Inform-only; non-Inform games correctly
    // get honest empty pre-travel exits).
    mem[0x3C] = 0x36;
    mem[0x3D] = 0x2E;

    mem[0x080] = 0;
    mem[0x081] = 9;
    setU16(mem, 0x082, 0);

    const IDS = { room: 1, tin: 2, matches: 3, hatch: 4, decoyDoor: 5, wall: 6 };
    function objBase(id) { return firstObj + (id - 1) * ENTRY; }

    function writeObj(id, parent, sibling, child) {
        const b = objBase(id);
        setU16(mem, b + 6, parent);
        setU16(mem, b + 8, sibling);
        setU16(mem, b + 10, child);
    }

    writeObj(IDS.room, 0, 0, IDS.tin);
    writeObj(IDS.tin, IDS.room, IDS.hatch, IDS.matches);
    writeObj(IDS.matches, IDS.tin, 0, 0);
    writeObj(IDS.hatch, IDS.room, IDS.decoyDoor, 0);
    writeObj(IDS.decoyDoor, IDS.room, IDS.wall, 0);
    writeObj(IDS.wall, IDS.room, 0, 0);

    setAttrBit(mem, objBase(IDS.tin), BITS.container, true);
    setAttrBit(mem, objBase(IDS.tin), BITS.openable, true);
    setAttrBit(mem, objBase(IDS.tin), BITS.open, !!tinOpen);
    setAttrBit(mem, objBase(IDS.hatch), BITS.door, true);
    setAttrBit(mem, objBase(IDS.hatch), BITS.locked, true);
    setAttrBit(mem, objBase(IDS.hatch), BITS.openable, true);

    let propAt = 0x300;
    const names = {
        1: "foyer",
        2: "tin",
        3: "matches",
        4: "hatch",
        5: "wooden door",
        6: "stone wall"
    };
    [1, 2, 3, 4, 5, 6].forEach(function (id) {
        const props = id === IDS.room ? [{ num: 23, value: IDS.hatch, words: 2 }] : [];
        setU16(mem, objBase(id) + 12, propAt);
        propAt = writeProps(mem, propAt, names[id], props);
    });

    return { mem, IDS, names };
}

function namesOf(scope) {
    return (scope || []).map(function (o) { return String(o.name || "").toLowerCase(); });
}

function assert(cond, msg) {
    if (!cond) {
        console.error("FAIL:", msg);
        process.exit(1);
    }
    console.log("PASS:", msg);
}

// --- source-level: no name-regex leftovers in attrsFromObject ---
const zrSrc = fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8");
const attrsSrc = zrSrc.slice(zrSrc.indexOf("attrsFromObject:"), zrSrc.indexOf("scopeObjects:"));
assert(!/door\|gate/.test(attrsSrc), "attrsFromObject has no /door|gate/ name regex");
assert(!/wall\|sky\|rain/.test(attrsSrc), "attrsFromObject has no scenery name regex");
assert(!/takeable:\s*true/.test(attrsSrc), "attrsFromObject has no takeable:true default");
assert(!/kids\.length/.test(attrsSrc), "attrsFromObject has no children-implies-container heuristic");

assert(AttributeSchema.bitFor("container") === 4, "container bit is 4 (linklpa.h)");
assert(AttributeSchema.bitFor("open") === 14, "open bit is 14 (linklpa.h)");
assert(AttributeSchema.bitFor("locked") === 11, "locked bit is 11 (linklpa.h)");
assert(AttributeSchema.bitFor("takeable") === null, "takeable has no I6 bit");
assert(AttributeSchema.bitFor("wearable") === 2, "wearable aliases clothing=2");
assert(AttributeSchema.bitFor("isOpen") === 14, "isOpen aliases open=14");

// --- closed tin hides matches ---
const closed = buildWorld(false);
assert(ZRamReader.shortName(closed.mem, closed.IDS.tin) === "tin", "shortName decodes tin");
assert(ZRamReader.shortName(closed.mem, closed.IDS.matches) === "matches", "shortName decodes matches");

const tinClosed = ZRamReader.attrsFromObject(closed.mem, closed.IDS.tin);
assert(tinClosed.container === true, "tin has container bit");
assert(tinClosed.open === false && tinClosed.isOpen === false, "tin open bit is clear");
// D56: takeable has no I6 bit (bitFor null) but is derived as !static &&
// !scenery once those real bits are read. Leaving it permanently undefined
// suppressed TAKE on every object (live holistic play). A tin with neither
// static nor scenery set is therefore takeable:true — not a name default.
assert(AttributeSchema.bitFor("takeable") === null, "takeable still has no I6 PROFILE bit");
assert(tinClosed.static === false && tinClosed.scenery === false, "tin is neither static nor scenery");
assert(tinClosed.takeable === true, "takeable derived !static && !scenery (D56), not left undefined");

const scopeClosed = ZRamReader.scopeObjects(closed.mem, closed.IDS.room, { depth: 2 });
const closedNames = namesOf(scopeClosed);
assert(closedNames.indexOf("tin") >= 0, "closed scope includes the tin itself");
assert(closedNames.indexOf("matches") < 0, "closed scope EXCLUDES matches (closed tin)");
assert(closedNames.indexOf("hatch") >= 0, "closed scope includes hatch (sibling of tin)");
assert(closedNames.indexOf("wooden door") >= 0, "closed scope includes name-decoy wooden door");

const decoy = ZRamReader.attrsFromObject(closed.mem, closed.IDS.decoyDoor);
assert(decoy.door !== true, "object named 'wooden door' is NOT a door without the door bit");
const wall = ZRamReader.attrsFromObject(closed.mem, closed.IDS.wall);
assert(wall.scenery !== true, "object named 'stone wall' is NOT scenery without the scenery bit");

const hatchAttrs = ZRamReader.attrsFromObject(closed.mem, closed.IDS.hatch);
assert(hatchAttrs.door === true, "hatch has door bit");
assert(hatchAttrs.locked === true, "hatch has locked bit");

const exitsClosed = ZRamReader.lookAheadExits(closed.mem, closed.IDS.room);
const hatchExit = (exitsClosed || []).find(function (e) { return e.targetRoomId === closed.IDS.hatch; });
assert(!!hatchExit, "lookAheadExits found the hatch via direction property");
assert(hatchExit.isDoor === true, "lookAheadExits isDoor from door bit, not name regex");
assert(hatchExit.isLocked === true, "lookAheadExits isLocked from locked bit, not hardcoded false");

// --- simulate successful OPEN: flip RAM open bit, re-read ---
const opened = buildWorld(true);
const tinOpen = ZRamReader.attrsFromObject(opened.mem, opened.IDS.tin);
assert(tinOpen.open === true && tinOpen.isOpen === true, "after OPEN, RAM open bit is set");
assert(ZRamReader.attr(ZRamReader.objectLinks(opened.mem, opened.IDS.tin), 14) === true,
    "raw attr(14) flipped on the tin");

const scopeOpen = ZRamReader.scopeObjects(opened.mem, opened.IDS.room, { depth: 2 });
const openNames = namesOf(scopeOpen);
assert(openNames.indexOf("tin") >= 0, "open scope still includes the tin");
assert(openNames.indexOf("matches") >= 0, "open scope INCLUDES matches once open bit is set");

const matchObj = scopeOpen.find(function (o) { return o.name === "matches"; });
assert(matchObj && matchObj.parentId === opened.IDS.tin, "matches parent is the tin");

// same-buffer flip: start closed, set the bit in place, confirm the delta
const live = buildWorld(false);
const before = namesOf(ZRamReader.scopeObjects(live.mem, live.IDS.room, { depth: 2 }));
assert(before.indexOf("matches") < 0, "live buffer: matches hidden before flip");
const tinBase = 0x100 + 63 * 2 + (live.IDS.tin - 1) * 14;
setAttrBit(live.mem, tinBase, BITS.open, true);
const after = namesOf(ZRamReader.scopeObjects(live.mem, live.IDS.room, { depth: 2 }));
assert(after.indexOf("matches") >= 0, "live buffer: matches visible after RAM open-bit flip");

console.log(JSON.stringify({
    ok: true,
    profile: AttributeSchema.PROFILE_ID,
    source: AttributeSchema.SOURCE,
    bits: {
        light: AttributeSchema.bitFor("light"),
        container: AttributeSchema.bitFor("container"),
        openable: AttributeSchema.bitFor("openable"),
        open: AttributeSchema.bitFor("open"),
        locked: AttributeSchema.bitFor("locked"),
        supporter: AttributeSchema.bitFor("supporter"),
        wearable: AttributeSchema.bitFor("wearable"),
        switchable: AttributeSchema.bitFor("switchable"),
        edible: AttributeSchema.bitFor("edible"),
        enterable: AttributeSchema.bitFor("enterable"),
        scenery: AttributeSchema.bitFor("scenery"),
        door: AttributeSchema.bitFor("door"),
        takeable: AttributeSchema.bitFor("takeable"),
        transparent: AttributeSchema.bitFor("transparent"),
        worn: AttributeSchema.bitFor("worn")
    },
    closedScope: closedNames,
    openScope: openNames,
    hatchExit: hatchExit
}, null, 2));
console.log("PASS: phase1-closed-container");
