/**
 * D31 nested-inventory fixture.
 *
 * Gate (PRODUCTION_PLAN.md Phase 4): an object inside a held container
 * offers enabled Inspect first, then contextual "take out of X" with a plain
 * Take command; never WEAR / LIGHT / DROP / etc. directly.
 * Also: worn items (parent == player) only EXAMINE/REMOVE; room items
 * suppress DROP/REMOVE/WEAR; ZRamProvider inventory recurses via
 * walkVisibleDescendants so nested parentId is the container, not the player.
 *
 * Usage: node harness/d31-nested-inventory.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "WorldModel.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamProvider.js"), "utf8"), sandbox);

const AttributeSchema = sandbox.AttributeSchema;
const ZRamReader = sandbox.ZRamReader;
const ActionSynth = sandbox.ActionSynth;
const WorldModel = sandbox.WorldModel;
const ZRamProvider = sandbox.ZRamProvider;

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

const BITS = {
    clothing: 2,
    container: 4,
    open: 14,
    openable: 15,
    switchable: 21,
    worn: 26
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

function buildWorld(bagOpen) {
    const mem = new Uint8Array(4096);
    // This fixture models an Inform story (worn = attribute 26). Declare it
    // the way real Inform stories do -- the compiler stamp "6.31" at
    // 0x3C -- so the worn-bit owner precedence (declared > fact > learned >
    // Inform default only when Inform-compiled) applies bit 26.
    mem[0x3C] = 0x36; mem[0x3D] = 0x2E; mem[0x3E] = 0x33; mem[0x3F] = 0x31;
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

    mem[0x080] = 0;
    mem[0x081] = 9;
    setU16(mem, 0x082, 0);

    const IDS = {
        room: 1,
        player: 2,
        bag: 3,
        cloak: 4,
        box: 5,
        rock: 6,
        lamp: 7
    };
    function objBase(id) { return firstObj + (id - 1) * ENTRY; }
    function writeObj(id, parent, sibling, child) {
        const b = objBase(id);
        setU16(mem, b + 6, parent);
        setU16(mem, b + 8, sibling);
        setU16(mem, b + 10, child);
    }

    // room --child--> player --sibling--> rock
    // player --child--> bag --sibling--> cloak
    // bag --child--> box --child--> lamp
    writeObj(IDS.room, 0, 0, IDS.player);
    writeObj(IDS.player, IDS.room, IDS.rock, IDS.bag);
    writeObj(IDS.bag, IDS.player, IDS.cloak, IDS.box);
    writeObj(IDS.cloak, IDS.player, 0, 0);
    writeObj(IDS.box, IDS.bag, 0, IDS.lamp);
    writeObj(IDS.rock, IDS.room, 0, 0);
    writeObj(IDS.lamp, IDS.box, 0, 0);

    setAttrBit(mem, objBase(IDS.bag), BITS.container, true);
    setAttrBit(mem, objBase(IDS.bag), BITS.openable, true);
    setAttrBit(mem, objBase(IDS.bag), BITS.open, !!bagOpen);
    setAttrBit(mem, objBase(IDS.box), BITS.container, true);
    setAttrBit(mem, objBase(IDS.box), BITS.openable, true);
    setAttrBit(mem, objBase(IDS.box), BITS.open, true);
    setAttrBit(mem, objBase(IDS.cloak), BITS.clothing, true);
    setAttrBit(mem, objBase(IDS.cloak), BITS.worn, true);
    setAttrBit(mem, objBase(IDS.lamp), BITS.clothing, true);
    setAttrBit(mem, objBase(IDS.lamp), BITS.switchable, true);

    let propAt = 0x300;
    const names = {
        1: "foyer",
        2: "yourself",
        3: "bag",
        4: "cloak",
        5: "box",
        6: "rock",
        7: "lamp"
    };
    [1, 2, 3, 4, 5, 6, 7].forEach(function (id) {
        setU16(mem, objBase(id) + 12, propAt);
        propAt = writeProps(mem, propAt, names[id], []);
    });
    setU16(mem, 0x090, IDS.player);

    return { mem, IDS, names };
}

function verbsOf(cmds) {
    return (cmds || []).map(function (c) { return String(c.verb || ""); });
}

function commandsOf(cmds) {
    return (cmds || []).map(function (c) { return String(c.command || ""); });
}

// --- source-level: live inventory path recurses ---
const zpSrc = fs.readFileSync(path.join(root, "js", "ZRamProvider.js"), "utf8");
const asSrc = fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8");
assert(/walkVisibleDescendants/.test(zpSrc), "ZRamProvider.collect uses walkVisibleDescendants for inventory");
assert(/heldContainerName/.test(asSrc), "ActionSynth walks parent chain via heldContainerName");
assert(/payloadPlayerId/.test(asSrc), "ActionSynth reads probe.playerId when payload.playerId is unset");
assert(/take out of/.test(asSrc), "ActionSynth synthesizes take-out-of for nested items");

// --- ActionSynth mock-payload fixture (the Phase 4 nested-inventory gate) ---
const PLAYER = 20;
const BAG = 21;
const BOX = 22;
const LAMP = 23;
const CLOAK = 24;
const ROCK = 25;
const mockPayload = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    inventory: [
        { id: BAG, name: "bag", parentId: PLAYER, attrs: { container: true, open: true } },
        { id: BOX, name: "box", parentId: BAG, attrs: { container: true, open: true } },
        { id: LAMP, name: "lamp", parentId: BOX, attrs: { wearable: true, clothing: true, switchable: true } },
        { id: CLOAK, name: "cloak", parentId: PLAYER, attrs: { wearable: true, clothing: true, worn: true } }
    ],
    discoveredObjects: [
        { id: ROCK, name: "rock", parentId: 10, attrs: { takeable: true, wearable: true } }
    ]
};
WorldModel.lastPayload = mockPayload;

const nested = ActionSynth.commandsForPayloadObjectId(LAMP, "inventory");
assert(nested.length === 2 && nested[0].command === "examine lamp", "nested lamp offers Inspect first, then contextual Take");
assert(nested[1].command === "take lamp", "nested lamp's REAL command is plain 'take lamp' (D78 -- 'take X out of Y' is never actually understood as a completed take, confirmed live on Anchorhead)");
assert(nested[1].verb === "take out of box", "nested lamp's DISPLAY label still shows its container context (take out of box)");
assert(verbsOf(nested).indexOf("wear") < 0, "nested lamp does not offer wear");
assert(verbsOf(nested).indexOf("remove") < 0, "nested lamp does not offer remove");
assert(verbsOf(nested).indexOf("switch on") < 0 && verbsOf(nested).indexOf("switch off") < 0,
    "nested lamp does not offer switch on/off (LIGHT)");
assert(verbsOf(nested).indexOf("drop") < 0, "nested lamp does not offer drop");
assert(verbsOf(nested).indexOf("take") < 0, "nested lamp does not offer bare take");
assert(ActionSynth.heldContainerName(mockPayload.inventory[2], mockPayload) === "box",
    "parent-chain names the immediate container (box), not the outer bag");

const bagCmds = ActionSynth.commandsForPayloadObjectId(BAG, "inventory");
assert(verbsOf(bagCmds).indexOf("drop") >= 0, "held bag (direct child of player) offers drop");
assert(verbsOf(bagCmds).indexOf("take") < 0, "held bag does not offer take");
assert(!commandsOf(bagCmds).some(function (c) { return /out of/.test(c); }), "held bag is not take-out-of");

const wornCmds = ActionSynth.commandsForPayloadObjectId(CLOAK, "inventory");
assert(wornCmds.length === 2, "worn cloak offers exactly examine + remove");
assert(verbsOf(wornCmds).indexOf("examine") >= 0 && verbsOf(wornCmds).indexOf("remove") >= 0,
    "worn cloak offers examine and remove");
assert(verbsOf(wornCmds).indexOf("wear") < 0, "worn cloak suppresses wear");
assert(verbsOf(wornCmds).indexOf("drop") < 0, "worn cloak suppresses drop");
assert(verbsOf(wornCmds).indexOf("take") < 0, "worn cloak suppresses take");

const roomCmds = ActionSynth.commandsForPayloadObjectId(ROCK, "room");
assert(verbsOf(roomCmds).indexOf("examine") >= 0, "room rock offers examine");
assert(verbsOf(roomCmds).indexOf("take") >= 0, "room takeable rock offers take");
assert(verbsOf(roomCmds).indexOf("drop") < 0, "room rock suppresses drop");
assert(verbsOf(roomCmds).indexOf("wear") < 0, "room rock suppresses wear");
assert(verbsOf(roomCmds).indexOf("remove") < 0, "room rock suppresses remove");
assert(verbsOf(roomCmds).indexOf("talk to") < 0, "inanimate rock does not offer talk to");

const GUARD = 26;
mockPayload.discoveredObjects.push({
    id: GUARD, name: "guard", parentId: 10, attrs: { animate: true }
});
WorldModel.lastPayload = mockPayload;
assert(ActionSynth.verbsForAttrs({ animate: true }).indexOf("talk to") >= 0,
    "animate attr maps to talk to via ActionSynth.rules");
assert(ActionSynth.verbsForAttrs({ talkable: true }).indexOf("talk to") >= 0,
    "talkable attr maps to talk to via ActionSynth.rules");
const npcCmds = ActionSynth.commandsForPayloadObjectId(GUARD, "room");
assert(verbsOf(npcCmds).indexOf("talk to") >= 0, "animate NPC offers talk to verb");
assert(commandsOf(npcCmds).indexOf("talk to guard") >= 0,
    "animate NPC synthesizes talk to <name> (no longer a dead special case)");
assert(verbsOf(npcCmds).indexOf("examine") >= 0, "animate NPC still offers examine");

const probeOnly = {
    probe: { playerId: PLAYER },
    inventory: [
        { id: BAG, name: "satchel", parentId: PLAYER, attrs: {} },
        { id: LAMP, name: "key", parentId: BAG, attrs: { wearable: true, switchable: true } }
    ],
    discoveredObjects: []
};
WorldModel.lastPayload = probeOnly;
const viaProbe = ActionSynth.commandsForPayloadObjectId(LAMP, "inventory");
assert(viaProbe.length === 2 && viaProbe[0].command === "examine key" && viaProbe[1].command === "take key" && viaProbe[1].verb === "take out of satchel",
    "nested take-out-of label still fires when only probe.playerId is set, with the D78 plain-take real command");

WorldModel.lastPayload = mockPayload;

// A disabled default inspect stays disabled without suppressing contextual Take.
const hadCalibrator = Object.prototype.hasOwnProperty.call(sandbox, "AttrCalibrator");
const savedCalibrator = sandbox.AttrCalibrator;
try {
    sandbox.AttrCalibrator = Object.assign({}, savedCalibrator || {}, { inspectVerbCurrentlyDisabled: function () { return true; } });
    const inspectDisabled = ActionSynth.commandsForPayloadObjectId(LAMP, "inventory");
    assert(inspectDisabled.length === 1 && inspectDisabled[0].command === "take lamp" && inspectDisabled[0].verb === "take out of box",
        "disabled inspect menu retains only contextual Take with plain parser command");
} finally {
    if (hadCalibrator) sandbox.AttrCalibrator = savedCalibrator;
    else delete sandbox.AttrCalibrator;
    WorldModel.lastPayload = mockPayload;
}

// --- RAM walk: open bag exposes box+lamp with real parentIds ---
const opened = buildWorld(true);
const invOpen = ZRamReader.walkVisibleDescendants(opened.mem, opened.IDS.player, 2, 0.9);
const invOpenNames = invOpen.map(function (o) { return o.name; });
assert(invOpenNames.indexOf("bag") >= 0, "open inventory includes bag");
assert(invOpenNames.indexOf("cloak") >= 0, "open inventory includes cloak");
assert(invOpenNames.indexOf("box") >= 0, "open inventory includes box nested in bag");
assert(invOpenNames.indexOf("lamp") >= 0, "open inventory includes lamp nested in box");
assert(invOpenNames.indexOf("rock") < 0, "inventory walk does not include room-sibling rock");
const lampObj = invOpen.find(function (o) { return o.name === "lamp"; });
const boxObj = invOpen.find(function (o) { return o.name === "box"; });
const bagObj = invOpen.find(function (o) { return o.name === "bag"; });
assert(lampObj && lampObj.parentId === opened.IDS.box, "lamp parentId is the box, not the player");
assert(boxObj && boxObj.parentId === opened.IDS.bag, "box parentId is the bag");
assert(bagObj && bagObj.parentId === opened.IDS.player, "bag parentId is the player");

const closed = buildWorld(false);
const invClosed = ZRamReader.walkVisibleDescendants(closed.mem, closed.IDS.player, 2, 0.9);
const invClosedNames = invClosed.map(function (o) { return o.name; });
assert(invClosedNames.indexOf("bag") >= 0, "closed inventory still includes the bag");
assert(invClosedNames.indexOf("box") < 0, "closed opaque bag hides box");
assert(invClosedNames.indexOf("lamp") < 0, "closed opaque bag hides lamp");

// --- ZRamProvider.collect uses the same walk ---
const view = new DataView(opened.mem.buffer, opened.mem.byteOffset, opened.mem.byteLength);
ZRamProvider.getMem = function () { return view; };
const collected = ZRamProvider.collect();
assert(collected.probe && collected.probe.status === "z-ram-live", "ZRamProvider collect is z-ram-live");
const cInv = collected.inventory || [];
assert(cInv.some(function (o) { return o.name === "lamp" && o.parentId === opened.IDS.box; }),
    "ZRamProvider inventory includes nested lamp with box parentId");
assert(cInv.some(function (o) { return o.name === "bag" && o.parentId === opened.IDS.player; }),
    "ZRamProvider inventory includes directly-held bag");
assert(collected.probe.playerId === opened.IDS.player || collected.probe.playerId > 0,
    "ZRamProvider probe.playerId is set");

WorldModel.providers = [];
WorldModel.registerProvider({ name: "z-ram", collect: function () { return collected; } });
const ticked = WorldModel.tick();
assert(ticked.playerId === collected.probe.playerId, "WorldModel.tick copies probe.playerId onto payload");
assert(ticked.inventory.some(function (o) { return o.name === "lamp"; }),
    "ticked inventory still contains nested lamp after recoverInventory");

WorldModel.lastPayload = ticked;
const liveNested = ActionSynth.commandsForPayloadObjectId(
    ticked.inventory.find(function (o) { return o.name === "lamp"; }).id,
    "inventory"
);
assert(liveNested.length === 2 && liveNested[0].command === "examine lamp", "RAM-backed nested lamp offers Inspect first, then contextual Take");
assert(liveNested[1].command === "take lamp", "RAM-backed nested lamp's real command is plain 'take lamp' (D78)");
assert(liveNested[1].verb === "take out of box", "RAM-backed nested lamp's display label is still take out of box");
assert(!/wear|switch|drop|light/i.test(JSON.stringify(liveNested)),
    "RAM-backed nested lamp JSON has no wear/switch/drop/light");

const liveWorn = ActionSynth.commandsForPayloadObjectId(
    ticked.inventory.find(function (o) { return o.name === "cloak"; }).id,
    "inventory"
);
assert(verbsOf(liveWorn).indexOf("drop") < 0 && verbsOf(liveWorn).indexOf("wear") < 0,
    "RAM-backed worn cloak suppresses drop and wear");
assert(verbsOf(liveWorn).indexOf("remove") >= 0, "RAM-backed worn cloak offers remove");

// --- Actionable.Open radial for nested item ---
const radialCalls = [];
sandbox.$ = function () {
    const api = {
        toArray: function () { return []; },
        each: function () { return api; },
        text: function () { return ""; },
        off: function () { return api; },
        click: function () { return api; },
        on: function () { return api; },
        attr: function () { return api; },
        appendTo: function () { return api; },
        empty: function () { return api; }
    };
    return api;
};
sandbox.ParchLockQol = {
    OpenRadial: function (x, y, slices, context) {
        radialCalls.push({ slices: slices, context: context });
    }
};
sandbox.ActionSynth = ActionSynth;
sandbox.WorldModel = WorldModel;
vm.runInContext(fs.readFileSync(path.join(root, "js", "Actionable.js"), "utf8"), sandbox);
const Act = sandbox.Actionable;
WorldModel.lastPayload = mockPayload;
radialCalls.length = 0;
Act.Open("lamp", "inventory", 10, 20, LAMP);
assert(radialCalls.length === 1, "nested Open calls OpenRadial");
const nestedLabels = (radialCalls[0].slices || []).map(function (s) { return s.Label; });
const nestedCmds = (radialCalls[0].slices || []).filter(function (s) { return s.Command; }).map(function (s) { return s.Command; });
assert(nestedCmds.indexOf("take lamp") >= 0, "radial Command is the real, working plain 'take lamp' (D78), not the never-understood 'take lamp out of box'");
assert(nestedCmds.indexOf("examine lamp") >= 0 && nestedLabels.filter(function (l) { return !/^Use with/.test(l); }).length === 2,
    "radial has Inspect and contextual Take besides optional Use with...");
assert(nestedLabels.indexOf("Wear") < 0 && nestedLabels.indexOf("Drop") < 0 && nestedLabels.indexOf("Switch on") < 0,
    "radial does not offer Wear / Drop / Switch on for nested lamp");

console.log(JSON.stringify({
    ok: fail === 0,
    pass: pass,
    fail: fail,
    nestedCommand: nested[1] && nested[1].command,
    heldBagVerbs: verbsOf(bagCmds),
    wornCloakVerbs: verbsOf(wornCmds),
    roomRockVerbs: verbsOf(roomCmds),
    openInventory: invOpenNames,
    closedInventory: invClosedNames,
    tickedPlayerId: ticked.playerId
}, null, 2));

if (fail) {
    console.error("FAIL: d31-nested-inventory (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d31-nested-inventory (" + pass + " passed)");
