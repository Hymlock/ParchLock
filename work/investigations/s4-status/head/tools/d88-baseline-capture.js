/**
 * D88 Stage 1 baseline capture.
 *
 * Records exact current command-surface output from the live product files
 * (ActionSynth, Actionable, Qol, Autocomplete, Navigator, GrammarProvider)
 * before any consumer cutover. Does not load SemanticActions.js.
 *
 * Usage: node tools/d88-baseline-capture.js
 * Writes: tools/screenshots/matrix/d88-baseline.json
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "tools", "screenshots", "matrix");
const outFile = path.join(outDir, "d88-baseline.json");

function loadStoryZcode(rel) {
    const abs = path.join(root, rel);
    const text = fs.readFileSync(abs);
    if (rel.endsWith(".js")) {
        const s = text.toString("utf8");
        const m = s.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
        if (!m) throw new Error("no base64 in " + rel);
        return extractZcode(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
    }
    return extractZcode(text);
}
function extractZcode(buf) {
    if (buf[0] >= 1 && buf[0] <= 8) return buf;
    const str = buf.toString("latin1");
    const zcod = str.indexOf("ZCOD");
    if (zcod >= 0) {
        const len = buf.readUInt32BE(zcod + 4);
        return buf.slice(zcod + 8, zcod + 8 + len);
    }
    throw new Error("not zcode/blorb");
}

function serialCommand(c) {
    if (!c) return null;
    return {
        verb: c.verb,
        noun: c.noun,
        objectId: c.objectId,
        command: c.command,
        confidence: c.confidence
    };
}
function serialSlice(s) {
    if (!s) return null;
    const out = {
        Label: s.Label,
        Command: s.Command,
        Enter: s.Enter,
        Score: s.Score,
        Usage: s.Usage,
        hasAction: typeof s.Action === "function"
    };
    Object.keys(out).forEach(function (k) { if (out[k] === undefined) delete out[k]; });
    return out;
}
function serialRadialItem(c) {
    if (!c) return null;
    return {
        Command: c.Command,
        Label: c.Label,
        Enter: c.Enter,
        Score: c.Score,
        Usage: c.Usage,
        source: c.source
    };
}

const handlers = {};
const subscribers = {};
const injected = [];
let inputVisible = true;
let inputValue = "";
const radialButtons = [];
let radialMenuStore = {};
const submitted = [];

function makeChain(kind) {
    const chain = {
        length: kind === "visible-input" ? (inputVisible ? 1 : 0) : kind === "dialog" ? 0 : 1,
        _kind: kind,
        _text: "",
        _data: {},
        _class: "",
        off: function () { return chain; },
        on: function (event, selector, handler) {
            if (typeof selector === "function") handlers[event] = selector;
            else handlers[event] = handler;
            return chain;
        },
        empty: function () {
            if (kind === "menu") radialButtons.length = 0;
            return chain;
        },
        addClass: function (cls) { chain._class += " " + cls; return chain; },
        removeClass: function () { return chain; },
        toggleClass: function () { return chain; },
        attr: function () { return chain; },
        css: function () { return chain; },
        text: function (t) {
            if (t === undefined) return chain._text;
            chain._text = t;
            return chain;
        },
        html: function () { return ""; },
        data: function (k, v) {
            if (kind === "menu") {
                if (arguments.length > 1) { radialMenuStore[k] = v; return chain; }
                return radialMenuStore[k];
            }
            if (arguments.length > 1) { chain._data[k] = v; return chain; }
            return chain._data[k];
        },
        click: function () { return chain; },
        appendTo: function () {
            radialButtons.push({
                Label: chain._text,
                Command: chain._data.command,
                Enter: chain._data.enter,
                Action: chain._data.action,
                className: chain._class
            });
            return chain;
        },
        append: function () { return chain; },
        outerWidth: function () { return 460; },
        outerHeight: function () { return 460; },
        closest: function () { return { length: 0 }; },
        trigger: function () { return chain; },
        each: function () { return chain; },
        find: function () { return chain; },
        toArray: function () { return []; }
    };
    return chain;
}

const sandbox = {
    console: console,
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    document: {},
    window: { innerWidth: 1200, innerHeight: 800, __PL_GRAMMAR_VERBS__: null },
    module: undefined,
    $: function (sel) {
        if (sel === ".Input.LineInput:visible") return makeChain("visible-input");
        if (sel === "#dialog") return makeChain("dialog");
        if (sel === "#radial-menu") return makeChain("menu");
        if (sel === sandbox.document) return makeChain("document");
        if (typeof sel === "string" && sel.indexOf("<") === 0) return makeChain("el");
        return makeChain("other");
    },
    Message: { IsOpen: false, Show: function () {} },
    TurnRecorder: {
        subscribeAcceptedSubmit: function (id, fn) { subscribers[id] = fn; }
    },
    Input: {
        Clear: function () { inputValue = ""; },
        Focus: function () {},
        Inject: function (text, enter) {
            if (!inputVisible || (enter && sandbox.Message.IsOpen)) return false;
            inputValue += text;
            injected.push({ text: text, enter: !!enter });
            return true;
        }
    },
    WorldModel: { lastPayload: null },
    ParchLockMap: {
        GetCurrentRoom: function () { return sandbox.__currentRoom || null; },
        GetRoom: function (id) { return (sandbox.__rooms || {})[id] || null; },
        Rooms: {},
        CurrentRoom: "room-a"
    },
    ZRamProvider: { getMem: function () { return null; } },
    AttrCalibrator: {
        defaultInspectVerb: function () { return "examine"; },
        inspectVerbCurrentlyDisabled: function () { return false; }
    }
};

vm.createContext(sandbox);

function loadJs(file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

loadJs("ZRamReader.js");
loadJs("GrammarProvider.js");
loadJs("ActionSynth.js");
loadJs("Actionable.js");
loadJs("Autocomplete.js");
loadJs("Qol.js");
loadJs("Navigator.js");

const ActionSynth = sandbox.ActionSynth;
const Actionable = sandbox.Actionable;
const Autocomplete = sandbox.Autocomplete;
const ParchLockQol = sandbox.ParchLockQol;
const Navigator = sandbox.Navigator;
const GrammarProvider = sandbox.GrammarProvider;
const WorldModel = sandbox.WorldModel;

Actionable.Init();

const PLAYER = 1;
const GUARD = 10, ROCK = 11, RADIO = 12, BOX = 13, DOOR = 14, RING = 15, COIN = 16;
const BAG = 20, KEY = 21;
const STONE = 30;

const mixedPayload = {
    engineMode: "structural",
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    discoveredObjects: [
        { id: GUARD, name: "guard", parentId: 2, attrs: { animate: true } },
        { id: ROCK, name: "rock", parentId: 2, attrs: { takeable: true } },
        { id: RADIO, name: "radio", parentId: 2, attrs: { talkable: true, switchable: true } },
        { id: BOX, name: "box", parentId: 2, attrs: { container: true, openable: true } },
        { id: DOOR, name: "door", parentId: 2, attrs: { door: true, lockable: true } },
        { id: STONE, name: "stone", parentId: 2, attrs: {} }
    ],
    inventory: [
        { id: RING, name: "ring", parentId: PLAYER, attrs: { worn: true, takeable: true } },
        { id: COIN, name: "coin", parentId: PLAYER, attrs: { takeable: true } },
        { id: BAG, name: "bag", parentId: PLAYER, attrs: { container: true, worn: true } },
        { id: KEY, name: "key", parentId: BAG, attrs: { takeable: true } }
    ],
    exits: [
        { label: "exit-91", command: "x1" },
        { label: "north", command: "north" },
        { label: "aft" }
    ],
    specialCommands: [
        { label: "look", command: "look" },
        { label: "inventory", command: "inventory" },
        { label: "xyzzy", command: "xyzzy", source: "dictionary-verb" },
        { label: "pray", command: "pray", source: "dictionary-verb" }
    ]
};

const aliasPayload = {
    engineMode: "structural",
    playerId: 99,
    probe: { status: "z-ram-live", playerId: 99 },
    discoveredObjects: [
        { id: 2, name: "display box", attrs: { container: true } },
        { id: 3, name: "display guard", attrs: { animate: true } },
        { id: 4, name: "ring", parentId: 99, attrs: { worn: true, takeable: true } }
    ],
    inventory: [
        { id: 1, name: "display coin", parentId: 99, attrs: {} },
        { id: 4, name: "ring", parentId: 99, attrs: { worn: true, takeable: true } }
    ],
    exits: [{ label: "exit-91", command: "x1" }]
};

function setPayload(p) {
    WorldModel.lastPayload = p;
}

function openSlices(noun, kind, objectId) {
    const captured = [];
    const orig = ParchLockQol.OpenRadial;
    ParchLockQol.OpenRadial = function (x, y, slices, context, pageIndex) {
        captured.push({
            context: context,
            pageIndex: pageIndex == null ? null : pageIndex,
            slices: (slices || []).map(serialSlice)
        });
        orig.call(ParchLockQol, x, y, slices, context, pageIndex);
    };
    Actionable.Open(noun, kind, 10, 20, objectId);
    ParchLockQol.OpenRadial = orig;
    return captured;
}

function invokeNamedSlice(noun, kind, objectId, label) {
    const orig = ParchLockQol.OpenRadial;
    let top = [];
    ParchLockQol.OpenRadial = function (x, y, slices) {
        top = slices || [];
        orig.call(ParchLockQol, x, y, slices);
    };
    Actionable.Open(noun, kind, 10, 20, objectId);
    ParchLockQol.OpenRadial = orig;
    const hit = top.find(function (s) { return s && s.Label === label; });
    if (!hit || typeof hit.Action !== "function") return { top: top.map(serialSlice), submenu: null };
    let sub = null;
    ParchLockQol.OpenRadial = function (x, y, slices, context) {
        sub = { context: context, slices: (slices || []).map(serialSlice) };
    };
    hit.Action();
    ParchLockQol.OpenRadial = orig;
    return { top: top.map(serialSlice), submenu: sub };
}

function primaryClick(noun, kind, objectId) {
    injected.length = 0;
    inputValue = "";
    const click = handlers["click.pmAct"];
    if (!click) return { injected: [], error: "no click.pmAct handler" };
    click.call(
        { dataset: { noun: noun, kind: kind, objectId: objectId == null ? "" : String(objectId) } },
        { preventDefault: function () {}, stopPropagation: function () {} }
    );
    return { injected: injected.slice(), value: inputValue };
}

function capturePagination(commands, context, width, height) {
    sandbox.window.innerWidth = width;
    sandbox.window.innerHeight = height;
    const pages = [];
    const seen = {};
    ParchLockQol.OpenRadial(100, 100, commands, context);
    for (let i = 0; i < 24; i++) {
        const cmds = radialButtons.filter(function (b) { return String(b.className || "").indexOf("radial-command") >= 0; });
        const labels = cmds.map(function (b) { return b.Label; });
        const key = labels.join("|");
        if (seen[key]) break;
        seen[key] = true;
        pages.push(cmds.map(function (b) {
            return { Label: b.Label, Command: b.Command, Enter: b.Enter };
        }));
        const more = cmds.find(function (b) { return b.Label === "More..."; });
        if (!more || typeof more.Action !== "function") break;
        more.Action();
    }
    sandbox.window.innerWidth = 1200;
    sandbox.window.innerHeight = 800;
    return {
        window: { innerWidth: width, innerHeight: height },
        capacity: (width < 600 || height < 600) ? 6 : 16,
        pageCount: pages.length,
        pages: pages
    };
}

function grammarCollectWithMem(mem) {
    const prev = sandbox.ZRamProvider.getMem;
    sandbox.ZRamProvider.getMem = function () { return mem; };
    const result = GrammarProvider.collect();
    sandbox.ZRamProvider.getMem = prev;
    return result;
}

// --- Synthesis ---
setPayload(mixedPayload);
const byObject = {};
[GUARD, ROCK, RADIO, BOX, DOOR, STONE, RING, COIN, BAG, KEY].forEach(function (id) {
    byObject[String(id)] = ActionSynth.commandsForPayloadObjectId(id).map(serialCommand);
});

const synthesis = {
    rules: JSON.parse(JSON.stringify(ActionSynth.rules)),
    defaultInspectVerb: ActionSynth.defaultInspectVerb(),
    inspectVerbDisabled: ActionSynth.inspectVerbDisabled(),
    verbsForAttrs: {
        animate: ActionSynth.verbsForAttrs({ animate: true }),
        talkable: ActionSynth.verbsForAttrs({ talkable: true }),
        takeable: ActionSynth.verbsForAttrs({ takeable: true }),
        none: ActionSynth.verbsForAttrs({}),
        containerOpenable: ActionSynth.verbsForAttrs({ container: true, openable: true }),
        switchable: ActionSynth.verbsForAttrs({ switchable: true })
    },
    collectFromPayload: ActionSynth.collectFromPayload(mixedPayload).map(serialCommand),
    commandsForPayloadObjectId: byObject,
    nestedKeyDirect: ActionSynth.commandsForObject(
        { id: KEY, name: "key", parentId: BAG, attrs: { takeable: true } },
        "inventory",
        "bag"
    ).map(serialCommand)
};

// --- Primary click ---
setPayload(mixedPayload);
Actionable.VerifiedNouns = {};
const primaryClickSurface = {
    guard: primaryClick("guard", "object", GUARD),
    rock: primaryClick("rock", "object", ROCK),
    coin: primaryClick("coin", "inventory", COIN),
    ring: primaryClick("ring", "inventory", RING),
    keyNested: primaryClick("key", "inventory", KEY),
    exit91: primaryClick("exit-91", "direction", null),
    north: primaryClick("north", "direction", null)
};
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = function () { return true; };
const primaryClickInspectDisabled = {
    stone: primaryClick("stone", "object", STONE),
    guardStillHasTalk: primaryClick("guard", "object", GUARD)
};
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = function () { return false; };

// --- Object / inventory radials ---
setPayload(mixedPayload);
Actionable.usageCounts = {};
Actionable.verbCounts = {};
const objectRadial = {
    guard: openSlices("guard", "object", GUARD),
    guardAskAbout: invokeNamedSlice("guard", "object", GUARD, "Ask about..."),
    radio: openSlices("radio", "object", RADIO),
    radioAskAbout: invokeNamedSlice("radio", "object", RADIO, "Ask about..."),
    rock: openSlices("rock", "object", ROCK),
    box: openSlices("box", "object", BOX),
    door: openSlices("door", "object", DOOR),
    directionExit91: openSlices("exit-91", "direction", null)
};
const inventoryRadial = {
    coin: openSlices("coin", "inventory", COIN),
    coinPutIn: invokeNamedSlice("coin", "inventory", COIN, "Put in..."),
    coinGiveTo: invokeNamedSlice("coin", "inventory", COIN, "Give to..."),
    coinUseWith: invokeNamedSlice("coin", "inventory", COIN, "Use with..."),
    ring: openSlices("ring", "inventory", RING),
    bag: openSlices("bag", "inventory", BAG),
    keyNested: openSlices("key", "inventory", KEY)
};

setPayload(aliasPayload);
Actionable.VerifiedNouns = { 1: "penny", 2: "chest", 3: "soldier" };
const aliasRadial = {
    coinPutIn: invokeNamedSlice("display coin", "inventory", 1, "Put in..."),
    coinUseWith: invokeNamedSlice("display coin", "inventory", 1, "Use with..."),
    guardAskAbout: invokeNamedSlice("display guard", "object", 3, "Ask about...")
};
Actionable.VerifiedNouns = {};

// --- Input radial + stems ---
setPayload(mixedPayload);
Actionable.usageCounts = {};
Actionable.verbCounts = {};
const inputUnranked = ParchLockQol.GetRadialCommands();
const inputRanked = ParchLockQol.RankInputRadialCommands(inputUnranked);
const inputStems = inputUnranked.filter(function (c) { return c.source === "ram-synth"; });
Actionable.noteUsage("wait");
Actionable.noteUsage("wait");
Actionable.noteUsage("take rock");
const inputRankedAfterUsage = ParchLockQol.RankInputRadialCommands(ParchLockQol.GetRadialCommands());
const inputRadial = {
    getRadialCommands: inputUnranked.map(serialRadialItem),
    ranked: inputRanked.map(serialRadialItem),
    rankedAfterWaitAndTakeUsage: inputRankedAfterUsage.map(serialRadialItem),
    ramSynthStems: inputStems.map(serialRadialItem),
    sources: inputUnranked.reduce(function (acc, c) {
        acc[c.source] = (acc[c.source] || 0) + 1;
        return acc;
    }, {})
};

// --- Autocomplete ---
setPayload(mixedPayload);
const autocomplete = {
    usesRamLook: Autocomplete.UsesRam("look"),
    usesRamSlash: Autocomplete.UsesRam("/goto "),
    ramCommandSeeds: Autocomplete.RamCommandSeeds().slice(),
    ramSuggestions: {
        empty: Autocomplete.RamSuggestions(""),
        take: Autocomplete.RamSuggestions("take"),
        "take ": Autocomplete.RamSuggestions("take "),
        "talk to": Autocomplete.RamSuggestions("talk to"),
        x: Autocomplete.RamSuggestions("x"),
        xyz: Autocomplete.RamSuggestions("xyz")
    }
};
setPayload(aliasPayload);
Actionable.VerifiedNouns = { 1: "penny", 2: "chest", 3: "soldier" };
autocomplete.aliasSeeds = Autocomplete.RamCommandSeeds().slice();
autocomplete.aliasSuggestions = {
    "put penny": Autocomplete.RamSuggestions("put penny"),
    x1: Autocomplete.RamSuggestions("x1")
};
injected.length = 0;
inputValue = "";
Autocomplete.InjectCommand("put penny in ", true);
autocomplete.injectStemDoesNotEnter = { injected: injected.slice(), value: inputValue };
injected.length = 0;
inputValue = "";
Autocomplete.InjectCommand("examine chest", true);
autocomplete.injectFullEnters = { injected: injected.slice(), value: inputValue };
Actionable.VerifiedNouns = {};

// --- Navigation ---
setPayload(mixedPayload);
const navigation = {
    commandForExitLabel: {
        "exit-91": Actionable.commandForExitLabel("exit-91"),
        "EXIT-91": Actionable.commandForExitLabel("EXIT-91"),
        north: Actionable.commandForExitLabel("north"),
        aft: Actionable.commandForExitLabel("aft"),
        missing: Actionable.commandForExitLabel("southwest")
    }
};
sandbox.__currentRoom = {
    Id: "room-a",
    Exits: { "exit-91": "room-b", north: "room-c" },
    ExitMeta: {}
};
sandbox.__rooms = { "room-a": sandbox.__currentRoom, "room-b": { Id: "room-b", Exits: {} } };
sandbox.ParchLockMap.Rooms = sandbox.__rooms;
sandbox.ParchLockMap.GetCurrentRoom = function () { return sandbox.__currentRoom; };
submitted.length = 0;
injected.length = 0;
const origSubmit = Actionable.Submit;
Actionable.Submit = function (command) {
    submitted.push(command);
    return origSubmit.call(Actionable, command);
};
Navigator.StepQueue = ["exit-91"];
Navigator.Interrupted = false;
Navigator.InterruptReason = "";
Navigator.Running = true;
Navigator.Awaiting = null;
Navigator.Pump();
navigation.pumpSubmitted = submitted.slice();
navigation.pumpInjected = injected.slice();
navigation.pumpAwaitingTarget = Navigator.Awaiting && Navigator.Awaiting.target;
Actionable.Submit = origSubmit;
Navigator.ClearQueue();

// --- Pagination via the real OpenRadial ---
setPayload(mixedPayload);
Actionable.usageCounts = {};
Actionable.verbCounts = {};
const inputCommands = ParchLockQol.GetRadialCommands();
const pagination = {
    inputDesktop: capturePagination(inputCommands, { source: "input" }, 1200, 800),
    inputMobile: capturePagination(inputCommands, { source: "input" }, 400, 500),
    objectGuardDesktop: (function () {
        let slices = [];
        const orig = ParchLockQol.OpenRadial;
        ParchLockQol.OpenRadial = function (x, y, s, context) { slices = s || []; };
        Actionable.Open("guard", "object", 10, 20, GUARD);
        ParchLockQol.OpenRadial = orig;
        return capturePagination(slices, { source: "text" }, 1200, 800);
    })()
};

// --- GrammarProvider ---
const grammarProvider = {
    noMem: GrammarProvider.collect(),
    sourceHardcodesLookInventory: /label:\s*"look"/.test(fs.readFileSync(path.join(root, "js", "GrammarProvider.js"), "utf8")),
    sourceHasInformVerbFlags: /informVerbFlags/.test(fs.readFileSync(path.join(root, "js", "GrammarProvider.js"), "utf8"))
};
try {
    const adventMem = loadStoryZcode("games/Advent.z5.js");
    grammarProvider.advent = grammarCollectWithMem(adventMem);
} catch (e) {
    grammarProvider.adventError = String(e && e.message || e);
}
try {
    const zorkMem = loadStoryZcode("games/Zork1-TheGreatUndergroundEmpire.z3.js");
    grammarProvider.zork1 = grammarCollectWithMem(zorkMem);
} catch (e) {
    grammarProvider.zork1Error = String(e && e.message || e);
}

const baseline = {
    capturedAt: new Date().toISOString(),
    stage: 1,
    note: "Legacy command-surface snapshot. SemanticActions.js was not loaded.",
    filesLoaded: [
        "js/ZRamReader.js",
        "js/GrammarProvider.js",
        "js/ActionSynth.js",
        "js/Actionable.js",
        "js/Autocomplete.js",
        "js/Qol.js",
        "js/Navigator.js"
    ],
    synthesis: synthesis,
    primaryClick: {
        inspectEnabled: primaryClickSurface,
        inspectDisabled: primaryClickInspectDisabled
    },
    objectRadial: objectRadial,
    inventoryRadial: inventoryRadial,
    aliasRadial: aliasRadial,
    inputRadial: inputRadial,
    autocomplete: autocomplete,
    navigation: navigation,
    pagination: pagination,
    grammarProvider: grammarProvider
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(baseline, null, 2));

function count(arr) { return Array.isArray(arr) ? arr.length : 0; }
const summary = {
    ok: true,
    outFile: path.relative(root, outFile).replace(/\\/g, "/"),
    synthesisRules: Object.keys(ActionSynth.rules),
    collectFromPayloadCount: count(synthesis.collectFromPayload),
    primaryClickGuard: primaryClickSurface.guard.injected,
    primaryClickExit91: primaryClickSurface.exit91.injected,
    objectGuardLabels: (objectRadial.guard[0] && objectRadial.guard[0].slices || []).map(function (s) { return s.Label; }),
    inventoryCoinLabels: (inventoryRadial.coin[0] && inventoryRadial.coin[0].slices || []).map(function (s) { return s.Label; }),
    aliasAskAbout: (aliasRadial.guardAskAbout.submenu && aliasRadial.guardAskAbout.submenu.slices || []).map(function (s) {
        return { Label: s.Label, Command: s.Command };
    }),
    inputCommandCount: count(inputRadial.getRadialCommands),
    inputStemCommands: inputRadial.ramSynthStems.map(function (c) { return c.Command; }),
    autocompleteSeeds: autocomplete.ramCommandSeeds,
    navigation: navigation.commandForExitLabel,
    pumpSubmitted: navigation.pumpSubmitted,
    paginationDesktop: {
        capacity: pagination.inputDesktop.capacity,
        pageCount: pagination.inputDesktop.pageCount,
        firstPageLabels: (pagination.inputDesktop.pages[0] || []).map(function (p) { return p.Label; }),
        hasMore: (pagination.inputDesktop.pages[0] || []).some(function (p) { return p.Label === "More..."; })
    },
    paginationMobile: {
        capacity: pagination.inputMobile.capacity,
        pageCount: pagination.inputMobile.pageCount,
        firstPageLabels: (pagination.inputMobile.pages[0] || []).map(function (p) { return p.Label; }),
        hasMore: (pagination.inputMobile.pages[0] || []).some(function (p) { return p.Label === "More..."; })
    },
    grammarNoMem: grammarProvider.noMem,
    grammarAdventSpecialCount: grammarProvider.advent && count(grammarProvider.advent.specialCommands),
    grammarAdventHead: grammarProvider.advent && grammarProvider.advent.specialCommands.slice(0, 8),
    grammarZork1: grammarProvider.zork1,
    grammarSourceHardcodesLookInventory: grammarProvider.sourceHardcodesLookInventory
};

console.log(JSON.stringify(summary, null, 2));
console.log("WROTE " + summary.outFile);
