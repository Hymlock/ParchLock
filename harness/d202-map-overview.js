const fs = require("fs");
const vm = require("vm");

let pass = 0, fail = 0;
function ok(value, label) { if (value) pass++; else { fail++; console.error("FAIL: " + label); } }
function same(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label); }

const rooms = [
    { Id: 0, Name: "Start", VisitedName: "Start", Exits: { east: 1 }, ExitMeta: {} },
    { Id: 1, Name: "Hall", VisitedName: "Hall", Exits: { west: 0, portal: 2 }, ExitMeta: {} },
    { Id: 2, Name: "Seen neighbor", Exits: {}, ExitMeta: {} },
    { Id: 3, Name: "Lookahead secret", Exits: {}, ExitMeta: {} },
    { Id: 4, Name: "Remote", VisitedName: "Remote", Exits: {}, ExitMeta: {} }
];
const sandbox = {
    console,
    setInterval() {},
    ParchLockMap: {
        Rooms: rooms,
        DisplayedRoomId: 1,
        GetCurrentRoom() { return rooms[0]; },
        GetRoom(id) { return rooms.find(r => String(r.Id) === String(id)); }
    }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("js/MapTopology.js", "utf8"), sandbox, { filename: "MapTopology.js" });
vm.runInContext(fs.readFileSync("js/MapBeautify.js", "utf8"), sandbox, { filename: "MapBeautify.js" });

ok(sandbox.MapTopology.isOverviewEligible(rooms[0], rooms[1]), "current room is eligible");
ok(sandbox.MapTopology.isOverviewEligible(rooms[1], rooms[1]), "visited displayed room is eligible");
ok(sandbox.MapTopology.isOverviewEligible(rooms[2], rooms[1]), "direct hub neighbor is eligible before visit");
ok(!sandbox.MapTopology.isOverviewEligible(rooms[3], rooms[1]), "unvisited non-neighbor lookahead stays hidden");
ok(sandbox.MapTopology.isOverviewEligible(rooms[4], rooms[1]), "visited disconnected room remains known");
ok(!sandbox.MapTopology.isOverviewEligible({ Id: 5, Name: "C_ROOMS_5", VisitedName: "x", Exits: {} }, rooms[1]), "internal compiler room stays hidden");

const eligible = rooms.filter(r => sandbox.MapTopology.isOverviewEligible(r, rooms[1]));
const first = sandbox.MapBeautify.overviewLayout(eligible, 1);
const second = sandbox.MapBeautify.overviewLayout(eligible.slice().reverse(), 1);
same(first, second, "identical graph layout is stable across input order");
ok(Object.keys(first).length === 4, "layout contains every and only eligible room");
ok(new Set(Object.values(first).map(p => p.x + ":" + p.y)).size === 4, "layout resolves coordinate collisions");
ok(first["4"], "disconnected component is deterministically packed");

const mapSource = fs.readFileSync("js/Map.js", "utf8");
ok(/OverviewThreshold:\s*0\.82/.test(mapSource) && /OverviewHysteresis:\s*0\.05/.test(mapSource), "overview mode has a hysteresis latch");
ok(/ActivePointers\[ev\.pointerId\]/.test(mapSource) && /setPointerCapture/.test(mapSource), "pinch tracks pointer ids and captures pointers");
ok(/state\.scale \* distance \/ state\.distance/.test(mapSource), "pinch derives absolute scale from its gesture baseline");
ok(/ClearGesture/.test(mapSource) && /pointercancel/.test(mapSource) && /lostpointercapture/.test(mapSource), "cancel, reset, and lost capture clear gesture state");
ok(/SetScale\(ParchLockMap\.Scale \+ delta/.test(mapSource), "wheel and buttons use the shared scale primitive");

ok(sandbox.MapTopology.isSystemPropExitKey("exit-13"), "hyphenated exit-N is a system prop key");
ok(!sandbox.MapTopology.isSystemPropExitKey("1"), "bare numbered travel exit is not a system prop key");
ok(!sandbox.MapTopology.isSystemPropExitKey("exit 1"), "spaced exit N travel label is not a system prop key");
{
    const mixed = { Id: 10, Name: "Cave", VisitedName: "Cave", Exits: { "exit-13": 3, "1": 2, east: 0 }, ExitMeta: {} };
    const ids = sandbox.MapTopology.overviewNeighborIds(mixed).map(String);
    ok(ids.indexOf("3") < 0, "system exit-N destination is not overview-admitted");
    ok(ids.indexOf("2") >= 0, "numbered travel destination remains overview-admitted");
    ok(ids.indexOf("0") >= 0, "compass destination remains overview-admitted");
}
ok(/isSystemPropExitKey\(label\)/.test(mapSource) && /OverviewEdges\.push/.test(mapSource),
    "DrawOverview OverviewEdges shares hub isSystemPropExitKey filter");
ok(/isSystemPropExitKey\(dir\)/.test(mapSource), "hub Draw shares isSystemPropExitKey for system keys");


const cssSource = fs.readFileSync("css/ParchLock.css", "utf8");
ok(/#map #rooms\.overview-mode > div:not\(#map-overview\)\s*\{[\s\S]*?display:\s*none/.test(cssSource),
    "overview mode removes hub rows from flow so path SVG covers overview nodes");
const workspaceSource = fs.readFileSync("js/WorkspaceUI.js", "utf8");
ok(/clientWidth/.test(workspaceSource) && /function localCenter\(el\)/.test(workspaceSource),
    "DrawPaths maps endpoints from layout box + measured scale (stretch-safe under zoom)");
ok(/querySelector\("svg\.map-paths"\)/.test(workspaceSource),
    "DrawPaths targets svg.map-paths explicitly");
ok(/requestAnimationFrame\(function \(\) \{ requestAnimationFrame\(WorkspaceUI\.DrawPaths\); \}\)/.test(mapSource),
    "map Show remeasures paths after open/minimize restore");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) process.exit(1);
console.log("PASS: d202-map-overview (" + pass + " passed)");
