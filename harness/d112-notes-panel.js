// D112: unified Notes section, per-room note add/edit/delete, room-box
// icon-only rendering, and the Known-Rooms-only add gesture. Structural/
// logic coverage (no real browser/touch simulation here -- that lives in
// this project's Playwright-style mobile harnesses); this proves the pure
// data/DOM-construction logic in js/Map.js is correct, in isolation from
// the actual gesture-timing code the plan's negative test (contextmenu/
// touch handlers bound ONLY to #rooms-list #container, never the map
// canvas) is checked here as a static source-text assertion instead.
global.window = global;
global.document = { getElementById: function () { return null; } };

function makeEl() {
    var state = { classes: {}, _text: "", _val: "", attrs: {}, dataStore: {}, hidden: false, children: [], handlers: {}, _subs: {} };
    var api = {
        __state: state,
        addClass: function (c) { (c || "").split(/\s+/).forEach(function (x) { if (x) state.classes[x] = true; }); return api; },
        removeClass: function (c) { (c || "").split(/\s+/).forEach(function (x) { delete state.classes[x]; }); return api; },
        toggleClass: function (c, on) { if (on) state.classes[c] = true; else delete state.classes[c]; return api; },
        hasClass: function (c) { return !!state.classes[c]; },
        find: function (selArg) { if (!state._subs[selArg]) state._subs[selArg] = makeEl(); return state._subs[selArg]; },
        text: function (v) { if (v === undefined) return state._text; state._text = v; return api; },
        html: function (v) { if (v === undefined) return state._text; state._text = v; return api; },
        empty: function () { state.children = []; state._text = ""; return api; },
        remove: function () { return api; },
        hide: function () { state.hidden = true; return api; },
        show: function () { state.hidden = false; return api; },
        attr: function (k, v) {
            if (typeof k === "object") { Object.assign(state.attrs, k); return api; }
            if (v === undefined) return state.attrs[k];
            state.attrs[k] = v; return api;
        },
        data: function (k, v) { if (v === undefined) return state.dataStore[k]; state.dataStore[k] = v; return api; },
        val: function (v) { if (v === undefined) return state._val; state._val = v; return api; },
        prop: function (k, v) { if (v === undefined) return state.attrs["prop:" + k]; state.attrs["prop:" + k] = v; return api; },
        css: function () { return api; },
        click: function (fn) { if (fn) { state.handlers.click = fn; return api; } if (state.handlers.click) state.handlers.click(); return api; },
        on: function () { return api; },
        off: function () { return api; },
        appendTo: function (target) {
            var t = (typeof target === "string") ? global.$(target) : target;
            t.__state.children.push(api);
            return api;
        },
        outerWidth: function () { return 400; },
        width: function () { return 900; }
    };
    return api;
}
global.__dom = {};
global.$ = function (sel) {
    if (typeof sel === "function") return { ready: function () {} };
    if (typeof sel !== "string") return makeEl();
    if (sel.indexOf("<") === 0) return makeEl();
    if (!global.__dom[sel]) global.__dom[sel] = makeEl();
    return global.__dom[sel];
};

global.WorkspaceUI = { DrawPaths: function () {} };
global.requestAnimationFrame = function (fn) { fn(); };
global.MapTopology = { isPlayerFacingRoom: function (r) { return !r.Internal; } };
global.Global = { Prefs: { ShowNotesAddButton: false } };
global.ParchLockQol = { EscapeHtml: function (s) { return String(s); } };
global.Message = {
    calls: [],
    IsOpen: false,
    Show: function (title, body, disabledTypeToClose) { global.Message.calls.push({ fn: "Show", title: title, body: body }); },
    Hide: function () { global.Message.calls.push({ fn: "Hide" }); },
    RoomNotFound: function (roomName) { global.Message.calls.push({ fn: "RoomNotFound", roomName: roomName }); }
};

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "Map.js"), "utf8");
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

function freshRooms() {
    return [
        { Id: 0, Name: "Kitchen", ObjectId: "100", HasRealId: true, Exits: {}, Notes: ["Fridge is locked", "Key under mat"] },
        { Id: 1, Name: "Hallway", ObjectId: "101", HasRealId: true, Exits: {}, Notes: [] },
        { Id: 2, Name: "Cellar", ObjectId: "102", HasRealId: true, Exits: {}, Notes: ["Dark, need lamp"] }
    ];
}

function reset() {
    ParchLockMap.Rooms = freshRooms();
    ParchLockMap.CurrentRoom = "Kitchen";
    ParchLockMap.CurrentRoomId = "100";
    ParchLockMap.NotesScopeRoomKey = null;
    ParchLockMap.PersistenceBlocked = true; // Save() no-ops without a real ParchLock.GameFilename
    global.ParchLock = { GameFilename: null };
    global.__dom = {};
    global.Message.calls = [];
}

// --- AddNoteToRoom / AddNote (legacy current-room wrapper) ---
reset();
ParchLockMap.AddNoteToRoom(ParchLockMap.GetRoom("Cellar"), "New cellar note");
assert(ParchLockMap.GetRoom("Cellar").Notes.length === 2 && ParchLockMap.GetRoom("Cellar").Notes[1] === "New cellar note", "AddNoteToRoom adds to a room OTHER than the current room");
assert(ParchLockMap.GetRoom("Kitchen").Notes.length === 2, "AddNoteToRoom to Cellar did not touch Kitchen's notes");

reset();
ParchLockMap.AddNote("Current room note");
assert(ParchLockMap.GetRoom("Kitchen").Notes.length === 3, "AddNote (legacy /note wrapper) still adds to the CURRENT room");
assert(ParchLockMap.GetRoom("Hallway").Notes.length === 0, "AddNote never touches a non-current room");

// --- EditNote: fail-closed on stale index/text ---
reset();
var kitchen = ParchLockMap.GetRoom("Kitchen");
ParchLockMap.EditNote(kitchen, 0, "Fridge is locked", "Fridge is locked (edited)");
assert(kitchen.Notes[0] === "Fridge is locked (edited)", "EditNote replaces the note when expected text matches");
assert(kitchen.Notes[1] === "Key under mat", "EditNote left the sibling note untouched");

reset();
kitchen = ParchLockMap.GetRoom("Kitchen");
ParchLockMap.EditNote(kitchen, 0, "This is stale/wrong", "Should never appear");
assert(kitchen.Notes[0] === "Fridge is locked", "EditNote fails CLOSED (does nothing) when the captured expected text no longer matches");

// --- RemoveNote: fail-closed on stale index/text ---
reset();
kitchen = ParchLockMap.GetRoom("Kitchen");
ParchLockMap.RemoveNote(kitchen, 0, "Fridge is locked");
assert(kitchen.Notes.length === 1 && kitchen.Notes[0] === "Key under mat", "RemoveNote deletes only the targeted note when expected text matches");

reset();
kitchen = ParchLockMap.GetRoom("Kitchen");
ParchLockMap.RemoveNote(kitchen, 0, "stale text");
assert(kitchen.Notes.length === 2, "RemoveNote fails CLOSED (deletes nothing) when the captured expected text no longer matches");

// --- ClearNotes: current room only, unaffected by per-note operations ---
reset();
ParchLockMap.ClearNotes();
assert(ParchLockMap.GetRoom("Kitchen").Notes.length === 0, "ClearNotes wipes the current room's Notes array");
assert(ParchLockMap.GetRoom("Cellar").Notes.length === 1, "ClearNotes does not touch other rooms");

// --- RebuildNotesList: unscoped (all rooms with notes, grouped) ---
reset();
ParchLockMap.RebuildNotesList();
var container = global.__dom["#notes-container"];
var headings = container.__state.children.filter(function (c) { return c.__state.classes["notes-room-heading"]; });
assert(headings.length === 2, "unscoped Notes view shows a heading for exactly the 2 rooms that have notes (Kitchen, Cellar), not Hallway (got " + headings.length + ")");
assert(headings[0].__state._text === "Kitchen" && headings[1].__state._text === "Cellar", "unscoped Notes view lists rooms in Known-Rooms/Rooms-array order");
var noteRows = container.__state.children.filter(function (c) { return c.__state.classes["note-row"]; });
assert(noteRows.length === 3, "unscoped Notes view renders one row per note across all rooms (2 + 1 = 3), not just one per room (got " + noteRows.length + ")");

// --- RebuildNotesList: search filter narrows the unscoped view ---
reset();
global.__dom["#room-filter"] = makeEl();
global.__dom["#room-filter"].val("lamp");
ParchLockMap.RebuildNotesList();
container = global.__dom["#notes-container"];
headings = container.__state.children.filter(function (c) { return c.__state.classes["notes-room-heading"]; });
assert(headings.length === 1 && headings[0].__state._text === "Cellar", "search filter narrows the unscoped Notes view by NOTE TEXT ('lamp' matches only Cellar's note), same box that narrows Known Rooms");

reset();
global.__dom["#room-filter"] = makeEl();
global.__dom["#room-filter"].val("kitchen");
ParchLockMap.RebuildNotesList();
container = global.__dom["#notes-container"];
headings = container.__state.children.filter(function (c) { return c.__state.classes["notes-room-heading"]; });
assert(headings.length === 1 && headings[0].__state._text === "Kitchen", "search filter narrows the unscoped Notes view by ROOM NAME too");

// --- RebuildNotesList: scoped to one room (no heading, that room's notes only) ---
reset();
ParchLockMap.NotesScopeRoomKey = ParchLockMap.GetRoom("Kitchen");
ParchLockMap.RebuildNotesList();
container = global.__dom["#notes-container"];
headings = container.__state.children.filter(function (c) { return c.__state.classes["notes-room-heading"]; });
noteRows = container.__state.children.filter(function (c) { return c.__state.classes["note-row"]; });
assert(headings.length === 0, "scoped Notes view shows no room heading (only one room is ever shown)");
assert(noteRows.length === 2, "scoped Notes view shows only the scoped room's own notes (Kitchen has 2)");

reset();
ParchLockMap.NotesScopeRoomKey = ParchLockMap.GetRoom("Hallway"); // zero notes
ParchLockMap.RebuildNotesList();
container = global.__dom["#notes-container"];
var empties = container.__state.children.filter(function (c) { return c.__state.classes["empty"]; });
assert(empties.length === 1 && empties[0].__state._text === "There are no notes here yet.", "the permanent Notes section shows the correct empty message for a scoped room with zero notes");

// --- Self-audit fix: a scoped room that no longer exists (removed/reset/
//     reimported) falls back to the unscoped all-rooms view instead of
//     misleadingly claiming that gone room still has zero notes ---
reset();
var goneRoom = { Id: 99, Name: "Long Gone Room", ObjectId: "999", HasRealId: true, Notes: [] };
ParchLockMap.NotesScopeRoomKey = goneRoom; // not a member of ParchLockMap.Rooms
ParchLockMap.RebuildNotesList();
assert(ParchLockMap.NotesScopeRoomKey === null, "RebuildNotesList clears NotesScopeRoomKey when the scoped room no longer resolves");
container = global.__dom["#notes-container"];
headings = container.__state.children.filter(function (c) { return c.__state.classes["notes-room-heading"]; });
assert(headings.length === 2, "falls back to rendering the unscoped all-rooms view (both Kitchen and Cellar), not a stale/empty scoped message");

// --- ShowNotes / FocusNotesForRoom: resolves room, sets scope, clears search, opens map+section ---
reset();
global.__dom["#room-filter"] = makeEl();
global.__dom["#room-filter"].val("leftover search term");
global.__dom["body"] = makeEl();
ParchLockMap.ShowNotes(null, "Cellar");
assert(ParchLockMap.NotesScopeRoomKey && ParchLockMap.NotesScopeRoomKey.Name === "Cellar", "ShowNotes(roomName) resolves the room and sets NotesScopeRoomKey via FocusNotesForRoom");
assert(global.__dom["#room-filter"].val() === "", "FocusNotesForRoom clears any leftover search term so it can never hide the focused room");
assert(global.__dom["#notes-tab"].prop("open") === true, "FocusNotesForRoom opens the Notes <details> section");
assert(global.__dom["body"].hasClass("map-open"), "FocusNotesForRoom opens the map panel if it wasn't already open");

// --- ShowNotes with an unresolvable room name still reports RoomNotFound (D47: never silently guesses on an ambiguous/missing name) ---
reset();
global.__dom["#room-filter"] = makeEl();
ParchLockMap.ShowNotes(null, "No Such Room");
assert(global.Message.calls.length === 1 && global.Message.calls[0].fn === "RoomNotFound", "ShowNotes reports RoomNotFound for an unresolvable room name, same as before D112");
assert(ParchLockMap.NotesScopeRoomKey === null, "an unresolvable room name never sets a scope");

// --- Draw(): room box never renders note TEXT, only ever the icon ---
reset();
ParchLockMap.CurrentRoom = "Kitchen";
ParchLockMap.CurrentRoomId = "100";
ParchLockMap.DisplayedRoom = "";
ParchLockMap.IsDisplayingCurrentRoom = function () { return true; };
ParchLockMap.ApplyViewport = function () {};
global.__dom["#room-filter"] = makeEl();
ParchLockMap.Draw("Kitchen");
var hereBox = global.__dom["#map .room.dir-here"];
var noteEl = hereBox.find(".note");
assert(noteEl.text() === "", "the room box's .note element is never given text, even for a room with multiple notes (screenshotted bug regression)");
var allNotesIcon = hereBox.find(".all-notes");
assert(allNotesIcon.__state.hidden === false, "the room box's note ICON is shown instead, whenever the room has at least one note");

// --- Negative/static check: the Known-Rooms hold/right-click gesture is wired ONLY to
//     #rooms-list #container, never to the map canvas (#rooms-shell / .room) ---
var bindFnSrc = (function () {
    var m = src.match(/BindNotesGestures:\s*\(\)\s*=>\s*\{([\s\S]*?)\n    \},/);
    return m ? m[1] : "";
})();
assert(bindFnSrc.indexOf("#rooms-list #container") !== -1, "BindNotesGestures binds the add-note hold/right-click gesture to #rooms-list #container");
assert(bindFnSrc.indexOf("#rooms-shell") === -1 && bindFnSrc.indexOf("#map #rooms") === -1, "BindNotesGestures never wires any touch/contextmenu handler to the map canvas (operator decision: no new gesture there at all)");

// --- M11: the hold gesture goes through RoomHoldAction; with no Rewind offered
//     (no ZVM / not armed by a native UNDO / current room) it opens Notes in
//     ONE step exactly as before; otherwise a two-item Notes / Rewind menu ---
assert(bindFnSrc.indexOf("RoomHoldAction") !== -1 && bindFnSrc.indexOf("PromptAddNote") === -1, "both hold paths (contextmenu + touch) route through RoomHoldAction");
reset();
delete global.__PARCHLOCK_ZVM__;
ParchLockMap.RoomHoldAction("Cellar");
assert(global.Message.calls.length === 1 && global.Message.calls[0].title === "Add note to Cellar", "no ZVM: hold opens the Notes editor directly (one step)");
var fakeVm = { undo: [{}, {}, {}], __pmUndoSeen: false };
function armLog(roomName) { ParchLockMap._rewindVm = fakeVm; ParchLockMap.RewindLog = [{ room: ParchLockMap.GetRoom(roomName), undoDepthAtEntry: 1, top: fakeVm.undo[0], next: null }]; }
reset(); global.__PARCHLOCK_ZVM__ = fakeVm; armLog("Cellar");
ParchLockMap.RoomHoldAction("Cellar");
assert(global.Message.calls.length === 1 && global.Message.calls[0].title === "Add note to Cellar", "ZVM not yet armed by a native UNDO: hold opens Notes directly");
reset(); fakeVm.__pmUndoSeen = true; armLog("Cellar");
ParchLockMap.RoomHoldAction("Cellar");
assert(global.Message.calls.length === 1 && global.Message.calls[0].title === "Cellar" && /room-hold-notes/.test(global.Message.calls[0].body) && /Rewind to here/.test(global.Message.calls[0].body), "armed ZVM, visited non-current room: hold shows the two-item Notes / Rewind to here menu");
assert(ParchLockMap.RewindOffer("Cellar").steps === 2, "N = undo.length - index of the room's own snapshot (3 - 1 = 2)");
reset(); armLog("Kitchen");
ParchLockMap.RoomHoldAction("Kitchen");
assert(global.Message.calls.length === 1 && global.Message.calls[0].title === "Add note to Kitchen", "current room never offers Rewind: hold opens Notes directly");
reset(); armLog("Hallway");
ParchLockMap.RoomHoldAction("Cellar");
assert(global.Message.calls.length === 1 && global.Message.calls[0].title === "Add note to Cellar", "a room with no recorded visit never offers Rewind");
delete global.__PARCHLOCK_ZVM__;

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
