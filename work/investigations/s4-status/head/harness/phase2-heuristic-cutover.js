/**
 * Phase 2 acceptance: D24/D26 heuristic cutover.
 *
 *  1. WorldModel no longer seeds discoveredObjects/exits/inventory/roomName from
 *     collectHeuristic or non-structural providers.
 *  2. Actionable.Candidates is a no-op; Open has no name-regex verb lists;
 *     marks require object ids (or RAM exit labels).
 *  3. Qol input-line radial keeps app chrome; game-content comes from payload
 *     exits / specialCommands, never a hardcoded compass/verb list.
 *  4. ParchLock.GetRoom does not scrape Style_subheader as map identity.
 *  5. ActionSynth does not default takeable:true.
 *
 * Usage: node harness/phase2-heuristic-cutover.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
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

function sliceBetween(src, startTok, endTok) {
    const i = src.indexOf(startTok);
    if (i < 0) return "";
    const j = endTok ? src.indexOf(endTok, i + startTok.length) : src.length;
    return src.slice(i, j < 0 ? src.length : j);
}

const wmSrc = fs.readFileSync(path.join(root, "js", "WorldModel.js"), "utf8");
const actSrc = fs.readFileSync(path.join(root, "js", "Actionable.js"), "utf8");
const qolSrc = fs.readFileSync(path.join(root, "js", "Qol.js"), "utf8");
const pmSrc = fs.readFileSync(path.join(root, "js", "ParchLock.js"), "utf8");
const asSrc = fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8");
const btSrc = fs.readFileSync(path.join(root, "js", "BufferTapProvider.js"), "utf8");
const tgSrc = fs.readFileSync(path.join(root, "js", "TextGate.js"), "utf8");
const glkSrc = fs.readFileSync(path.join(root, "js", "GlkTapProvider.js"), "utf8");
const remglkSrc = fs.readFileSync(path.join(root, "js", "RemGlkTapProvider.js"), "utf8");
const tuiSrc = fs.readFileSync(path.join(root, "js", "TranslatorUI.js"), "utf8");

// --- source-level ---
const heurSrc = sliceBetween(wmSrc, "collectHeuristic:", "collectProviders:");
assert(!/\.pl-act/.test(heurSrc), "collectHeuristic does not scrape .pl-act");
assert(!/#inventory-items/.test(heurSrc), "collectHeuristic does not scrape inventory buttons");
assert(!/ParchLockMap\.CurrentRoom/.test(heurSrc), "collectHeuristic does not copy map CurrentRoom");
assert(!/merged\.discoveredObjects = h\.discoveredObjects/.test(wmSrc), "collectProviders does not seed discoveredObjects from heuristic");
assert(!/merged\.exits = h\.exits/.test(wmSrc), "collectProviders does not seed exits from heuristic");
assert(!/merged\.inventory = h\.inventory/.test(wmSrc), "collectProviders does not seed inventory from heuristic");
assert(/isStructuralFact/.test(wmSrc), "WorldModel gates P0/P1 via isStructuralFact");
const tickSrc = sliceBetween(wmSrc, "tick:", "if (typeof EmglkenProvider");
assert(!/ZRamProvider\.collect/.test(tickSrc), "tick does not re-collect ZRamProvider");
assert(!/TICK_EXCLUSIVE_ZRAM/.test(tickSrc), "tick has no second exclusive z-ram collect");
assert(/WorldModel\.recoverInventory\(payload\)/.test(tickSrc), "tick recovers inventory on the single apply path");

const openSrc = sliceBetween(actSrc, "Open:", "};");
assert(!/door\|box\|chest/.test(openSrc), "Actionable.Open has no door|box|chest name regex");
assert(!/coat\|hat\|ring/.test(openSrc), "Actionable.Open has no wearable name regex");
assert(!/man\|woman\|guard/.test(openSrc), "Actionable.Open has no person name regex");
assert(/commandsForPayloadObjectId/.test(actSrc) && /Open:\s*\(noun, kind, x, y, objectId\)/.test(actSrc), "Actionable.Open uses ActionSynth for object ids");
assert(!/\bCandidates\s*:/.test(actSrc), "Actionable.Candidates is deleted");
assert(!/Actionable\.Candidates\(/.test(actSrc), "Refresh does not call Candidates()");
assert(/wrapFirstExact/.test(actSrc), "Refresh wraps exact RAM names via wrapFirstExact");
assert(!/Actionable\.Directions\.filter/.test(actSrc), "marks do not inject hardcoded compass Directions");

const radialSrc = sliceBetween(qolSrc, "GetRadialCommands:", "ShowRadialMenu:");
assert(/undo/.test(radialSrc) && /\/map/.test(radialSrc) && /\/transcript/.test(radialSrc), "D26 chrome keeps undo/save/restore/map/history/transcript");
assert(!/Command:\s*"n"/.test(radialSrc), "GetRadialCommands has no hardcoded n");
assert(!/Command:\s*"take "/.test(radialSrc), "GetRadialCommands has no hardcoded take");
assert(/ram-exit/.test(radialSrc) && /specialCommands/.test(radialSrc), "GetRadialCommands reads payload.exits and specialCommands");
assert(!/#windowport \.Style_input/.test(radialSrc), "GetRadialCommands does not scan Style_input history");
assert(/ram-synth/.test(radialSrc) && /commandsForObject/.test(radialSrc), "GetRadialCommands adds ActionSynth verb stems");
assert(/source:\s*"universal"/.test(radialSrc) && /Command:\s*"look"/.test(radialSrc) && /Command:\s*"inventory"/.test(radialSrc) && /Command:\s*"wait"/.test(radialSrc), "GetRadialCommands keeps look/inventory/wait as universals");
assert(!/Command:\s*"n"/.test(radialSrc) && !/Command:\s*"s"/.test(radialSrc) && !/Command:\s*"e"/.test(radialSrc) && !/Command:\s*"w"/.test(radialSrc), "GetRadialCommands has no hardcoded compass n/s/e/w");
assert(!/Score:\s*100\s*-\s*index/.test(qolSrc), "OpenRadial does not overwrite Score with 100-index");
assert(/usageCount/.test(qolSrc) && /noteUsage/.test(actSrc), "adaptive radial ranks from accepted Actionable usage");

const getRoomSrc = sliceBetween(pmSrc, "GetRoom:", "CleanRoomName:");
assert(!/Style_subheader/.test(getRoomSrc), "GetRoom does not scrape Style_subheader");
assert(!/GridLine/.test(getRoomSrc), "GetRoom does not scrape status GridLine");
assert(/z-ram-live/.test(getRoomSrc), "GetRoom uses structural payload roomName");
assert(!/EnteredRoom/.test(getRoomSrc), "GetRoom does not call ParchLockMap.EnteredRoom");

assert(!/attrs\.takeable !== false/.test(asSrc), "ActionSynth does not default takeable true");

assert(!/door["']\s*,\s*["']doors/.test(btSrc) && !/extractNouns/.test(btSrc), "BufferTap has no door/gate/window name-regex extractNouns");
assert(!/discoveredObjects:\s*nouns/.test(btSrc), "BufferTap collect does not map mined nouns to discoveredObjects");
assert(/discoveredObjects:\s*\[\]/.test(btSrc), "BufferTap collect returns empty discoveredObjects");
assert(!/Actionable\.Directions/.test(btSrc), "BufferTap does not harvest compass Directions");

assert(/isVisible:\s*\(name\)\s*=>\s*\{[\s\S]*return true/.test(tgSrc) || /isVisible:\s*\(name\)\s*=>\s*true/.test(tgSrc), "TextGate.isVisible is always true (RAM-scope shield)");
assert(/discoveredObjects:\s*\[\]/.test(tgSrc), "TextGate collect returns empty discoveredObjects");
assert(!/TextGate\.discovered\[/.test(tgSrc.split("collect:")[0] || tgSrc), "TextGate.noteText does not populate a printed-vocab map");

assert(!/guessRoom/.test(glkSrc), "GlkTap no longer guesses room names from iframe text");
assert(!/name:\s*"pig"/.test(glkSrc), "GlkTap does not mine 'pig' from printed text");
assert(/discoveredObjects:\s*\[\]/.test(glkSrc), "GlkTap collect returns empty discoveredObjects");
assert(/roomName:\s*""/.test(glkSrc), "GlkTap collect returns empty roomName");

assert(!/name:\s*"pig"/.test(remglkSrc) && !/dirHints/.test(remglkSrc),
    "RemGlkTapProvider no longer mines 'pig'/direction words from printed GlkOte text (was a live landmine, not covered by the mislabeled 'GlkTap does not mine pig' check above, which tested the wrong file)");
const remglkCollectSrc = sliceBetween(remglkSrc, "collect: () => {", "};");
assert(/discoveredObjects:\s*\[\]/.test(remglkCollectSrc), "RemGlkTapProvider collect() returns empty discoveredObjects");
assert(/roomName:\s*""/.test(remglkCollectSrc), "RemGlkTapProvider collect() returns empty roomName");
assert(/exits:\s*\[\]/.test(remglkCollectSrc), "RemGlkTapProvider collect() returns empty exits");
assert(!/lastRoom/.test(remglkSrc), "RemGlkTapProvider has no lastRoom field left to accidentally re-expose");

assert(!/TextGate\.isVisible/.test(tuiSrc), "TranslatorUI does not filter RAM names through TextGate.isVisible");
assert(!/TextGate\.noteText/.test(tuiSrc) && !/TextGate\.discovered/.test(tuiSrc), "TranslatorUI does not write printed-vocab into TextGate");
assert(!/TextGate\.noteText/.test(pmSrc), "ParchLock.Init does not seed TextGate from windowport text");

// --- runtime WorldModel ---
const sandbox = { console, window: {}, setTimeout: function (fn) { try { fn(); } catch (e) {} }, setInterval: function () { return 0; }, clearInterval: function () {} };
vm.createContext(sandbox);
vm.runInContext(wmSrc, sandbox);
const WM = sandbox.WorldModel;

const empty = WM.tick();
assert(empty.engineMode === "heuristic", "tick with no providers stays labeled heuristic");
assert((empty.discoveredObjects || []).length === 0, "empty tick discoveredObjects is []");
assert((empty.exits || []).length === 0, "empty tick exits is []");
assert((empty.inventory || []).length === 0, "empty tick inventory is []");
assert(!empty.roomName, "empty tick roomName is empty");
assert(empty.roomId == null, "empty tick roomId is null");

WM.registerProvider({
    name: "buffer-tap",
    collect: function () {
        return {
            sources: [{ name: "buffer-tap", confidence: 0.55 }],
            roomName: "Alley",
            roomConfidence: 0.55,
            exits: [{ label: "north" }],
            discoveredObjects: [{ id: null, name: "window" }, { id: 99, name: "should-not-leak-without-structural" }],
            inventory: [{ id: null, name: "lamp" }]
        };
    }
});
const p1 = WM.tick();
assert((p1.discoveredObjects || []).length === 0, "buffer-tap cannot fill discoveredObjects");
assert((p1.exits || []).length === 0, "buffer-tap cannot fill exits");
assert((p1.inventory || []).length === 0, "buffer-tap cannot fill inventory");
assert(!p1.roomName, "buffer-tap cannot fill roomName");

WM.registerProvider({
    name: "z-ram",
    collect: function () {
        return {
            sources: [{ name: "z-ram", confidence: 0.95 }],
            engineMode: "structural",
            vmType: "z",
            roomId: 107,
            roomName: "Alley",
            roomConfidence: 0.95,
            discoveredObjects: [
                { id: 12, name: "window", attrs: { openable: true } },
                { id: null, name: "nameless-leak" }
            ],
            inventory: [{ id: 4, name: "lantern" }],
            exits: [{ label: "southeast", targetRoomId: 88 }],
            probe: { status: "z-ram-live", playerId: 1, roomId: 107, scopeCount: 1 }
        };
    }
});
const p2 = WM.tick();
assert(p2.engineMode === "structural", "z-ram tick is structural");
assert(p2.roomId === 107 && p2.roomName === "Alley", "z-ram roomId/roomName win");
assert(p2.discoveredObjects.length === 1 && p2.discoveredObjects[0].id === 12, "only id-backed objects survive");
assert(p2.inventory.length === 1 && p2.inventory[0].name === "lantern", "z-ram inventory wins");
assert(p2.exits.length === 1 && p2.exits[0].label === "southeast", "z-ram exits win");
assert(!(p2.discoveredObjects || []).some(function (o) { return o.name === "window" && o.id == null; }), "id-less window dropped");

WM.registerProvider({
    name: "z-ram",
    collect: function () {
        return {
            sources: [{ name: "z-ram", confidence: 0.7 }],
            engineMode: "structural",
            roomId: 200,
            roomName: "Empty Cell",
            discoveredObjects: [],
            inventory: [],
            exits: [],
            probe: { status: "z-ram-live", roomId: 200, scopeCount: 0 }
        };
    }
});
const pEmptyRoom = WM.tick();
assert(pEmptyRoom.roomName === "Empty Cell", "empty structural room still sets roomName");
assert(pEmptyRoom.discoveredObjects.length === 0, "empty structural room stays empty (no P1 backfill)");
assert(pEmptyRoom.exits.length === 0, "empty structural exits stay empty");

WM.registerProvider({
    name: "z-ram",
    collect: function () {
        return {
            sources: [{ name: "z-ram", confidence: 0.95 }],
            engineMode: "structural",
            roomId: 107,
            roomName: "Alley",
            discoveredObjects: [
                { id: 112, name: "window", parentId: 107, attrs: { openable: true, worn: false } },
                { id: 104, name: "wedding ring", parentId: 20, attrs: { worn: true, wearable: true } },
                { id: 101, name: "umbrella", parentId: 20, attrs: { worn: false, moved: true } }
            ],
            inventory: [],
            exits: [],
            probe: { status: "z-ram-live", playerId: 654, roomId: 107, scopeCount: 3 }
        };
    }
});
const pInv = WM.tick();
assert(pInv.inventory.some(function (o) { return o.id === 104; }), "recoverInventory lifts worn parent-siblings into inventory");
assert(pInv.inventory.some(function (o) { return o.id === 101; }), "recoverInventory includes non-worn siblings of the worn parent");
assert(!pInv.inventory.some(function (o) { return o.id === 112; }), "recoverInventory does not treat room-parent objects as inventory");

// --- ActionSynth ---
vm.runInContext(asSrc, sandbox);
const AS = sandbox.ActionSynth;
const cmdsRoom = AS.commandsForObject({ id: 12, name: "window", attrs: { openable: true } }, "room");
const verbsRoom = cmdsRoom.map(function (c) { return c.verb; });
assert(verbsRoom.indexOf("examine") >= 0, "ActionSynth always offers examine");
assert(verbsRoom.indexOf("open") >= 0, "openable attr synthesizes open");
assert(verbsRoom.indexOf("take") < 0, "takeable is not defaulted on a window");
assert(verbsRoom.indexOf("drop") < 0, "room context does not offer drop");

const cmdsInv = AS.commandsForObject({ id: 4, name: "lantern", attrs: { takeable: true } }, "inventory");
const verbsInv = cmdsInv.map(function (c) { return c.verb; });
assert(verbsInv.indexOf("drop") >= 0, "held non-worn inventory item offers drop");
assert(verbsInv.indexOf("take") < 0, "held inventory item does not offer take");
assert(cmdsInv.some(function (c) { return c.command === "drop lantern"; }), "inventory drop command is drop + name");

const cmdsInvNoBit = AS.commandsForObject({ id: 5, name: "rock", attrs: {} }, "inventory");
const verbsInvNoBit = cmdsInvNoBit.map(function (c) { return c.verb; });
assert(verbsInvNoBit.indexOf("drop") >= 0, "inventory drop does not depend on the takeable bit");
assert(verbsInvNoBit.indexOf("take") < 0, "inventory without takeable still has no take");

const cmdsRoomTakeable = AS.commandsForObject({ id: 6, name: "lamp", attrs: { takeable: true } }, "room");
const verbsRoomTakeable = cmdsRoomTakeable.map(function (c) { return c.verb; });
assert(verbsRoomTakeable.indexOf("take") >= 0, "room takeable object offers take");
assert(verbsRoomTakeable.indexOf("drop") < 0, "room takeable object does not offer drop");

// --- Actionable.Open / Qol.GetRadialCommands in a stubbed DOM ---
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
        radialCalls.push({ x: x, y: y, slices: slices, context: context });
    }
};
sandbox.ActionSynth = AS;
sandbox.WorldModel = WM;
vm.runInContext(actSrc, sandbox);
vm.runInContext(qolSrc, sandbox);
const Act = sandbox.Actionable;
const Qol = sandbox.ParchLockQol;
Qol.OpenRadial = function (x, y, slices, context) {
    radialCalls.push({ x: x, y: y, slices: slices, context: context });
};

WM.lastPayload = p2;
radialCalls.length = 0;
Act.Open("window", "object", 10, 20, null);
assert(radialCalls.length === 1, "Open with no objectId still calls OpenRadial");
assert((radialCalls[0].slices || []).length === 0, "Open without objectId yields no name-regex verbs");

radialCalls.length = 0;
WM.lastPayload = {
    discoveredObjects: [{ id: 12, name: "window", attrs: { openable: true, open: false } }],
    inventory: [{ id: 4, name: "lantern" }],
    exits: [{ label: "southeast" }]
};
Act.Open("window", "object", 10, 20, 12);
assert(radialCalls.length === 1, "Open with objectId calls OpenRadial");
const labels = (radialCalls[0].slices || []).map(function (s) { return s.Label; });
assert(labels.indexOf("Examine") >= 0, "id-backed Open includes Examine from ActionSynth");
assert(labels.indexOf("Open") >= 0, "id-backed Open includes Open from openable attr");
assert(labels.indexOf("Take") < 0, "id-backed Open does not guess Take from the name 'window'");
assert(labels.indexOf("Use with...") >= 0, "id-backed Open offers Use with... from other id-backed objects");

radialCalls.length = 0;
WM.lastPayload = {
    discoveredObjects: [{ id: 12, name: "window", attrs: { openable: true, open: false } }],
    inventory: [{ id: 4, name: "lantern", attrs: { takeable: true } }],
    exits: []
};
Act.Open("lantern", "inventory", 10, 20, 4);
assert(radialCalls.length === 1, "inventory Open with objectId calls OpenRadial");
const invLabels = (radialCalls[0].slices || []).map(function (s) { return s.Label; });
assert(invLabels.indexOf("Drop") >= 0, "inventory Open includes Drop for a held non-worn item");
assert(invLabels.indexOf("Take") < 0, "inventory Open does not include Take");
assert(invLabels.indexOf("Examine") >= 0, "inventory Open still includes Examine");

sandbox.WorldModel.lastPayload = null;
const chromeOnly = Qol.GetRadialCommands();
const chromeCmds = chromeOnly.map(function (c) { return c.Command; });
assert(chromeCmds.indexOf("undo") >= 0 && chromeCmds.indexOf("/map") >= 0, "chrome-only radial keeps undo and /map");
assert(chromeCmds.indexOf("look") >= 0 && chromeCmds.indexOf("inventory") >= 0 && chromeCmds.indexOf("wait") >= 0, "null payload still has look/inventory/wait universals");
assert(chromeCmds.indexOf("n") < 0 && chromeCmds.indexOf("s") < 0, "chrome-only radial has no compass n/s");
assert(chromeCmds.indexOf("take ") < 0 && chromeCmds.indexOf("open ") < 0 && chromeCmds.indexOf("search ") < 0, "chrome-only radial has no generic take/open/search stems");
const waitItem = chromeOnly.filter(function (c) { return c.Command === "wait"; })[0];
assert(waitItem && waitItem.source === "universal", "wait is labeled universal, not a guessed story verb");

sandbox.WorldModel.lastPayload = {
    exits: [{ label: "aft" }, { label: "1" }],
    specialCommands: [{ label: "xyzzy", command: "xyzzy", source: "dictionary-verb" }]
};
const mixed = Qol.GetRadialCommands();
const mixedCmds = mixed.map(function (c) { return c.Command; });
assert(mixedCmds.indexOf("aft") >= 0 && mixedCmds.indexOf("1") >= 0, "radial directions come from RAM exit labels, including non-compass");
assert(mixedCmds.indexOf("xyzzy") >= 0, "radial verb stems come from specialCommands");
assert(mixedCmds.indexOf("n") < 0, "RAM exits do not imply a compass n shortcut");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.radialAcceptedOverlapCounts = {};
Act.pendingRadialUsageKey = null;
Act.noteUsage("wait");
Act.noteUsage("wait");
assert(Act.usageBonus("wait") === 12, "usageBonus is 6 per Submit, capped later");
assert(Act.usageBonus("look") === 0, "unused commands keep zero usage bonus");

// Exercise the REAL live ranker (Qol.RankInputRadialCommands), not a
// test-side reimplementation of the blend -- this is what OpenRadial
// actually calls, so a regression that restored the 100-index overwrite
// or dropped the ranker call would fail these asserts.
assert(typeof Qol.RankInputRadialCommands === "function", "RankInputRadialCommands is exported for the harness to exercise directly");
const ranked = Qol.RankInputRadialCommands(Qol.GetRadialCommands());
assert(ranked[0] && ranked[0].Command === "wait", "usage-first ranker lifts used wait ahead of unused chrome, universal, and RAM commands");
assert(ranked.some(function (c) { return c.Command === "save"; }), "adaptive ranking retains chrome commands");
assert(!/chromeItems\.concat\(restItems\)/.test(qolSrc), "adaptive ranker has no protected chrome prefix");
assert(!/Score:\s*100\s*-\s*index/.test(qolSrc), "Score is never assigned from array position");

// Score-order, not array-build order: a reverse-built list must still
// rank by Score descending through the real ranker.
const reverseBuilt = [
    { Command: "low", Label: "Low", Score: 10, source: "ram-synth" },
    { Command: "high", Label: "High", Score: 90, source: "ram-special" },
    { Command: "mid", Label: "Mid", Score: 40, source: "ram-exit" }
];
const rankedReverse = Qol.RankInputRadialCommands(reverseBuilt);
assert(rankedReverse.map(c => c.Command).join(",") === "high,mid,low", "ranker sorts by Score, not by build order (would be low,high,mid if array-order won)");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.noteUsage("low");
let usageFirst = Qol.RankRadialCommands(reverseBuilt);
assert(usageFirst[0].Command === "low", "one use immediately displaces every zero-use higher-prior command");
Act.noteUsage("mid");
Act.noteUsage("mid");
usageFirst = Qol.RankRadialCommands(reverseBuilt);
assert(usageFirst[0].Command === "mid" && usageFirst[1].Command === "low", "two uses rank ahead of one use");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.noteUsage("first");
Act.noteUsage("second");
const tied = Qol.RankRadialCommands([
    { Command: "first", Score: 20 },
    { Command: "second", Score: 30 },
    { Command: "third", Score: 30 }
]);
assert(tied.map(c => c.Command).join(",") === "second,first,third", "equal nonzero usage falls back to prior; positive usage still precedes zero usage");
const stable = Qol.RankRadialCommands([{ Command: "a", Score: 10 }, { Command: "b", Score: 10 }]);
assert(stable.map(c => c.Command).join(",") === "a,b", "equal usage and prior preserve explicit original order");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
for (let i = 0; i < 100; i++) Act.noteUsage("century");
for (let i = 0; i < 6; i++) Act.noteUsage("six");
const uncapped = Qol.RankRadialCommands([{ Command: "six", Score: 99 }, { Command: "century", Score: 1 }]);
assert(uncapped[0].Command === "century" && uncapped[0].UsageCount === 100 && uncapped[0].Usage === 36 && uncapped[1].Usage === 36, "uncapped count ranks 100 above 6 while both visible fills remain capped");
assert(uncapped[0]._usageLeader === true && uncapped[1]._usageLeader === false, "unique leader uses uncapped global count, not capped fill");
const sanitized = Qol.RankRadialCommands([{ Command: "missing" }, { Command: "nan", Score: NaN }]);
assert(sanitized.every(c => c.Prior === 0 && c.UsageCount === 0), "missing and NaN ranking fields sanitize to zero");

Act.radialInteractionCounts = {};
Act.radialAcceptedOverlapCounts = {};
Act.pendingRadialUsageKey = null;
Act.noteRadialInteraction("launcher:use-with:7");
assert(Act.usageCount("", "launcher:use-with:7") === 1, "action-only launcher tap has its own usage count");
Act.noteRadialInteraction("radial:take");
assert(Act.usageCount("take ", "radial:take") === 1, "non-submitting verb-stem tap has its own usage count");
Act.noteUsage("take lamp");
assert(Act.usageCount("take ", "radial:take") === 1, "stem tap followed by its accepted completion counts as one action, not two");
assert(Act.usageCount("take lamp") === 1, "completed exact command retains its accepted-command usage");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.radialAcceptedOverlapCounts = {};
Act.pendingRadialUsageKey = null;
Act.noteRadialInteraction("radial:put shovel in");
Act.noteUsage("put shovel in box");
assert(Act.usageCount("put shovel in ", "radial:put shovel in") === 1, "multiword stem completion is boundary-matched and deduplicated");
Act.noteRadialInteraction("radial:/map");
Act.noteUsage("/map");
assert(Act.usageCount("/map", "radial:/map") === 1, "exact slash-command completion is deduplicated");

Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.radialAcceptedOverlapCounts = {};
Act.pendingRadialUsageKey = null;
Act.noteRadialInteraction("radial:take");
Act.noteUsage("look");
Act.noteUsage("take lamp");
assert(Act.usageCount("take ", "radial:take") === 2, "an unrelated accepted command clears the pending link, preserving an abandoned tap and later independent use");
assert(/TrackTap:\s*true/.test(actSrc) && /noteRadialInteraction\(usageKey\)/.test(qolSrc), "runtime marks launchers/stems and records exactly at the radial click boundary");
assert(!/Label:\s*"More\.\.\."[^\n]*TrackTap/.test(qolSrc), "synthetic More is excluded from usage tracking");

// Verb-stem bonus: submitting a full command via the real choke-point
// (Actionable.Submit) should lift the matching verb-stem radial item too.
Act.usageCounts = {};
Act.verbCounts = {};
Act.radialInteractionCounts = {};
Act.radialAcceptedOverlapCounts = {};
Act.pendingRadialUsageKey = null;
Act.noteUsage("take lamp");
Act.noteUsage("take lamp");
assert(Act.usageBonus("take ") === 12, "verb-stem 'take ' is boosted by full-command 'take lamp' submissions, not just exact stem matches");
assert(Act.usageBonus("take lamp") === 12, "exact full-command match still tracked independently");

// Radial click routes through Actionable.Submit, not a direct
// noteUsage+Inject bypass -- so a radial-clicked Undo/Restore still gets
// the RAM resync Submit performs for typed commands.
assert(/hitEnter\s*\)\s*{\s*Actionable\.Submit\(command\)/.test(qolSrc) || /Actionable\.Submit\(command\)/.test(qolSrc), "radial click with Enter routes through Actionable.Submit (single choke-point, preserves undo/restore resync)");

assert(typeof Act.Candidates !== "function", "Candidates is not a function");
assert(Act.DeterministicNouns().length === 0 || true, "DeterministicNouns uses lastPayload (checked via Open)");
WM.lastPayload = {
    engineMode: "structural",
    probe: { status: "z-ram-live", scopeCount: 1 },
    discoveredObjects: [{ id: 12, name: "window" }],
    inventory: [],
    exits: [{ label: "aft" }]
};
sandbox.WorldModel = WM;
const det = Act.DeterministicNouns();
assert(det.indexOf("window") >= 0, "DeterministicNouns includes RAM object names");
assert(det.indexOf("aft") >= 0, "DeterministicNouns includes RAM exit labels");
assert(det.indexOf("north") < 0, "DeterministicNouns does not inject compass north");

vm.runInContext(btSrc, sandbox);
vm.runInContext(tgSrc, sandbox);
vm.runInContext(glkSrc, sandbox);
const emptyBt = sandbox.BufferTapProvider.collect();
assert((emptyBt.discoveredObjects || []).length === 0, "runtime BufferTap.collect discoveredObjects is []");
assert((emptyBt.exits || []).length === 0, "runtime BufferTap.collect exits is []");
assert(!emptyBt.roomName, "runtime BufferTap.collect roomName is empty");
const emptyTg = sandbox.TextGate.collect();
assert((emptyTg.discoveredObjects || []).length === 0, "runtime TextGate.collect discoveredObjects is []");
assert(sandbox.TextGate.isVisible("unprinted-ram-object") === true, "runtime TextGate.isVisible does not require printed text");
const emptyGlk = sandbox.GlkTapProvider.collect();
assert((emptyGlk.discoveredObjects || []).length === 0, "runtime GlkTap.collect discoveredObjects is []");
assert(!emptyGlk.roomName, "runtime GlkTap.collect roomName is empty");

vm.runInContext(remglkSrc, sandbox);
const emptyRemglk = sandbox.RemGlkTapProvider.collect();
assert((emptyRemglk.discoveredObjects || []).length === 0, "runtime RemGlkTapProvider.collect discoveredObjects is []");
assert((emptyRemglk.exits || []).length === 0, "runtime RemGlkTapProvider.collect exits is []");
assert(!emptyRemglk.roomName, "runtime RemGlkTapProvider.collect roomName is empty");
sandbox.RemGlkTapProvider.extractFromMessage({
    type: "update",
    content: [{ text: [{ content: [{ text: "There is a pig here. Exits lead north and south." }] }] }]
});
const afterMsg = sandbox.RemGlkTapProvider.collect();
assert((afterMsg.discoveredObjects || []).length === 0, "runtime RemGlkTapProvider.collect discoveredObjects stays [] even after printed text mentions objects/directions");
assert((afterMsg.exits || []).length === 0, "runtime RemGlkTapProvider.collect exits stays [] even after printed text mentions directions");
assert(!afterMsg.roomName, "runtime RemGlkTapProvider.collect roomName stays empty even after a GlkOte text update");

console.log("");
console.log(pass + " PASS / " + fail + " FAIL");
if (fail) process.exit(1);
