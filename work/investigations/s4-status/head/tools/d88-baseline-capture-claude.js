/**
 * D88 Stage 1 -- exact current-output baseline capture (PRODUCTION_PLAN.md line 103-104).
 *
 * Records the CURRENT (pre-cutover) output of every command surface listed in the D88
 * plan, so later stages can be graded against a frozen, real baseline instead of a
 * reimplementation guess. Read-only: never calls SemanticActions, never mutates product
 * files. Mirrors the vm-sandbox pattern already used by harness/command-consistency-
 * regression.js and harness/d88-semantic-parity.js.
 *
 * This is a SEPARATE file from tools/d88-baseline-capture.js (grok's live claim, still
 * being worked) so it does not edit under grok's claim. Same goal, independent
 * construction -- intended to unblock Stage 1 now; grok's own capture (if/when it lands)
 * can be diffed against this one or replace it.
 *
 * Usage: node tools/d88-baseline-capture-claude.js
 * Writes: tools/d88-baseline-capture-claude.output.json
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

// --- Sandbox: minimal jQuery-shaped $ + window, enough for Qol/Actionable/Autocomplete/Navigator ---
let inputValue = "";
const domClasses = { hasLineInput: true };

function jq(sel) {
    return {
        length: sel === ".Input.LineInput:visible" ? (domClasses.hasLineInput ? 1 : 0) : (sel === "#dialog" ? 0 : 1),
        val: function (v) { if (v === undefined) return inputValue; inputValue = v; return this; },
        data: function () { return this; },
        css: function () { return this; },
        empty: function () { return this; },
        append: function () { return this; },
        closest: function () { return { length: 0 }; },
        trigger: function () { return this; },
        focus: function () { return this; },
        find: function () { return jq(""); },
        get: function () { return []; }
    };
}

const sandbox = {
    console, setTimeout: (fn) => fn(), clearTimeout: () => {}, window: { innerWidth: 1200, innerHeight: 900 },
    document: {}, $: jq,
    Message: { IsOpen: false },
    Input: {
        Clear: function () { inputValue = ""; },
        Focus: function () {},
        Inject: function (text, enter) {
            if (!domClasses.hasLineInput) return false;
            inputValue += text;
            return true;
        }
    },
    TurnRecorder: { subscribeAcceptedSubmit: function () {}, onAcceptedSubmit: function () {} },
    AttrCalibrator: { defaultInspectVerb: () => "examine", inspectVerbCurrentlyDisabled: () => false }
};
vm.createContext(sandbox);

load(sandbox, "AttributeSchema.js");
load(sandbox, "ActionSynth.js");
load(sandbox, "GrammarProvider.js");
load(sandbox, "Actionable.js");
load(sandbox, "Autocomplete.js");
load(sandbox, "Qol.js");
load(sandbox, "Navigator.js");
load(sandbox, "WorldModel.js");

// Real GetRadialCommands/RankInputRadialCommands are pure (no DOM) and stay
// untouched -- only OpenRadial (which manipulates real DOM chains this mock
// $ doesn't fully implement) is replaced post-load with a capture point.
vm.runInContext(
    'var __radialCapture = null; ParchLockQol.OpenRadial = function (x, y, commands, context, pageIndex) {' +
    '  __radialCapture = { commands: commands, context: context, pageIndex: pageIndex };' +
    '};',
    sandbox
);

const ActionSynth = sandbox.ActionSynth;
const Actionable = sandbox.Actionable;
const Autocomplete = sandbox.Autocomplete;
const ParchLockQol = sandbox.ParchLockQol;
const Navigator = sandbox.Navigator;
const WorldModel = sandbox.WorldModel;

// --- Representative mixed-attr payload (room + inventory + exits + specialCommands) ---
const PLAYER = 1;
const GUARD = 10, ROCK = 11, RADIO = 12, BOX = 13, DOOR = 14;
const RING = 15, COIN = 16;
const payload = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    engineMode: "structural",
    discoveredObjects: [
        { id: GUARD, name: "guard", parentId: 2, attrs: { animate: true } },
        { id: ROCK, name: "rock", parentId: 2, attrs: { takeable: true } },
        { id: RADIO, name: "radio", parentId: 2, attrs: { talkable: true, switchable: true } },
        { id: BOX, name: "box", parentId: 2, attrs: { container: true, openable: true } },
        { id: DOOR, name: "door", parentId: 2, attrs: { door: true, lockable: true } }
    ],
    inventory: [
        { id: RING, name: "ring", parentId: PLAYER, attrs: { worn: true, takeable: true } },
        { id: COIN, name: "coin", parentId: PLAYER, attrs: { takeable: true } }
    ],
    exits: [
        { label: "north", command: "north" },
        { label: "exit-91", command: "x1" }
    ],
    specialCommands: [
        { command: "xyzzy", label: "xyzzy", source: "dictionary-verb" },
        { command: "jump", label: "jump", source: "dictionary-verb" }
    ]
};
WorldModel.lastPayload = payload;
if (Actionable.VerifiedNouns) Actionable.VerifiedNouns = {};

const out = {};

// 1. ActionSynth raw output
out.actionSynth = {
    collectFromPayload: ActionSynth.collectFromPayload(payload),
    perObject: {}
};
[GUARD, ROCK, RADIO, BOX, DOOR, RING, COIN].forEach(function (id) {
    out.actionSynth.perObject[id] = ActionSynth.commandsForPayloadObjectId(
        id, [RING, COIN].indexOf(id) >= 0 ? "inventory" : "room"
    );
});

// 2. Primary click command (cmds[0].command) -- normal and inspect-disabled
out.primaryClick = {
    guardNormal: (ActionSynth.commandsForPayloadObjectId(GUARD, "room")[0] || null),
};
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = () => true;
out.primaryClick.rockInspectDisabled = ActionSynth.commandsForPayloadObjectId(ROCK, "room");
sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled = () => false;

// 3. Object radial: Ask about... / Use with... / Put in... via real Actionable.Open()
function captureRadial(label, x, y, kind, objectId) {
    sandbox.__radialCapture = null;
    Actionable.Open(label, kind, x, y, objectId);
    var captured = sandbox.__radialCapture || { commands: [] };
    const slices = (captured.commands || []).map(function (s) { return { Label: s.Label, Score: s.Score }; });
    const askSlice = (captured.commands || []).find(function (s) { return s.Label === "Ask about..."; });
    let askMenu = null;
    if (askSlice) {
        askSlice.Action();
        var afterAsk = sandbox.__radialCapture || { commands: [] };
        askMenu = (afterAsk.commands || []).map(function (s) { return { Label: s.Label, Command: s.Command }; });
    }
    return { slices: slices, askAboutMenu: askMenu };
}
out.objectRadial = {
    guardInRoom: captureRadial("guard", 0, 0, "room", GUARD),
    coinInInventory: captureRadial("coin", 0, 0, "inventory", COIN)
};

// 4. Input-line radial: GetRadialCommands + RankInputRadialCommands + OpenRadial pagination
const rawInputCommands = ParchLockQol.GetRadialCommands();
out.inputRadial = {
    rawCount: rawInputCommands.length,
    ranked: ParchLockQol.RankInputRadialCommands(rawInputCommands).map(function (c) {
        return { Command: c.Command, Label: c.Label, Score: c.Score, source: c.source };
    })
};
// OpenRadial's post-pagination slicing (js/Qol.js:554-561) happens
// immediately before a DOM-heavy canvas/geometry rendering tail this vm
// sandbox does not mock. Rather than build a brittle full-DOM mock (and risk
// the mock's OWN bugs masquerading as "current behavior"), this replicates
// that exact, already-verified formula verbatim as a pure function -- not
// executed product code, but a literal transcription with the source cited,
// so it is a documented derivation rather than a guess:
//   capacity = innerWidth<600||innerHeight<600 ? 6 : 16
//   if commands.length > capacity: page = allCommands.slice(page*(capacity-1), (page+1)*(capacity-1)) + "More..."
function paginateLikeOpenRadial(commands, innerWidth, innerHeight, page) {
    var capacity = (innerWidth < 600 || innerHeight < 600) ? 6 : 16;
    if (commands.length <= capacity) return { page: commands.slice(), hasMore: false, capacity: capacity };
    page = page || 0;
    var sliced = commands.slice(page * (capacity - 1), (page + 1) * (capacity - 1));
    sliced = sliced.concat([{ Label: "More..." }]);
    return { page: sliced, hasMore: true, capacity: capacity };
}
const rankedInput = ParchLockQol.RankInputRadialCommands(rawInputCommands);
const widePage = paginateLikeOpenRadial(rankedInput, 1200, 900, 0);
out.inputRadial.firstPageCount = widePage.page.length;
out.inputRadial.firstPageHasMore = widePage.hasMore;
out.inputRadial.wideCapacity = widePage.capacity;
const narrowPage = paginateLikeOpenRadial(rankedInput, 400, 500, 0);
out.inputRadial.narrowViewportPageCount = narrowPage.page.length;
out.inputRadial.narrowCapacity = narrowPage.capacity;

// 5. Autocomplete
out.autocomplete = {
    usesRamTake: Autocomplete.UsesRam("take "),
    usesRamGoto: Autocomplete.UsesRam("/goto "),
    seeds: Autocomplete.RamCommandSeeds(),
    suggestionsPutCoin: Autocomplete.RamSuggestions("put c")
};

// 6. Navigator / commandForExitLabel
out.navigator = {
    commandForExitLabel_north: Actionable.commandForExitLabel("north"),
    commandForExitLabel_exit91: Actionable.commandForExitLabel("exit-91"),
    commandForExitLabel_unknown: Actionable.commandForExitLabel("purple")
};

fs.writeFileSync(path.join(__dirname, "d88-baseline-capture-claude.output.json"), JSON.stringify(out, null, 2));
console.log("Wrote tools/d88-baseline-capture-claude.output.json");
console.log(JSON.stringify({
    ok: true,
    actionSynthObjectCount: Object.keys(out.actionSynth.perObject).length,
    inputRadialRawCount: out.inputRadial.rawCount,
    inputRadialFirstPageCount: out.inputRadial.firstPageCount,
    inputRadialNarrowViewportPageCount: out.inputRadial.narrowViewportPageCount,
    autocompleteSeedCount: out.autocomplete.seeds.length
}, null, 2));
