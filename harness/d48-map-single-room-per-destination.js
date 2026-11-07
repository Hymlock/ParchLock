// D48: a room reachable by ANY number of directions must render exactly
// one visible box on the map, regardless of story, room, or which/how many
// directions collide -- not a case fixed only for one door in one game.
global.window = global;
global.__dom = {};
function makeEl() {
    var state = { classes: {} };
    var api = {
        addClass: function (c) { state.classes[c] = true; return api; },
        removeClass: function (c) { delete state.classes[c]; return api; },
        toggleClass: function (c, on) { if (on) state.classes[c] = true; else delete state.classes[c]; return api; },
        hasClass: function (c) { return !!state.classes[c]; },
        find: function () { return api; },
        text: function () { return api; },
        empty: function () { return api; },
        hide: function () { return api; },
        show: function () { return api; },
        attr: function () { return api; },
        data: function () { return api; },
        css: function () { return api; },
        remove: function () { return api; },
        prependTo: function () { return api; },
        outerWidth: function () { return 400; }
    };
    return api;
}
global.$ = function (sel) {
    if (Array.isArray(sel)) return makeEl();
    if (typeof sel !== "string") return makeEl();
    if (!global.__dom[sel]) global.__dom[sel] = makeEl();
    return global.__dom[sel];
};
global.WorkspaceUI = { DrawPaths: function () {} };
global.requestAnimationFrame = function (fn) { fn(); };

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "Map.js"), "utf8");
eval(src);

// Monkey-patch the data-access methods Draw/DrawRoom rely on, using a
// synthetic room graph with THREE directions colliding on one destination
// plus a genuinely separate destination -- proving this isn't a 2-direction
// special case.
ParchLockMap.Rooms = [
    { Id: 0, Name: "Junction", ObjectId: "100", HasRealId: true, Exits: { n: 1, e: 1, se: 1, s: 2 }, Notes: [] },
    { Id: 1, Name: "Shared Chamber", ObjectId: "101", HasRealId: true, Exits: {}, Notes: [] },
    { Id: 2, Name: "South Room", ObjectId: "102", HasRealId: true, Exits: {}, Notes: [] }
];
ParchLockMap.CurrentRoom = "Junction";
ParchLockMap.DisplayedRoom = "";
ParchLockMap.CurrentRoomId = "100";
ParchLockMap.IsDisplayingCurrentRoom = function () { return true; };
ParchLockMap.ApplyViewport = function () {};

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

ParchLockMap.Draw("Junction");

var shownDirs = ["n", "e", "se", "s"].filter(function (d) {
    var el = global.__dom["#map .room.dir-" + d];
    return el && el.hasClass("shown");
});
assert(shownDirs.length === 2, "exactly 2 boxes shown total for 2 distinct destinations reached by 4 directions (got " + shownDirs.length + ": " + shownDirs.join(",") + ")");

var sharedShownCount = ["n", "e", "se"].filter(function (d) {
    var el = global.__dom["#map .room.dir-" + d];
    return el && el.hasClass("shown");
}).length;
assert(sharedShownCount === 1, "the room reached by 3 directions (n, e, se) is shown as exactly ONE box, not three (got " + sharedShownCount + ")");

var southEl = global.__dom["#map .room.dir-s"];
assert(!!(southEl && southEl.hasClass("shown")), "a genuinely different destination (south) still renders its own box");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
