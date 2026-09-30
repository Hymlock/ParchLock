const fs = require("fs");
const vm = require("vm");

const calls = [];
const timers = [];
const sandbox = {
    console,
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; },
    clearTimeout() {},
    ZvmCapture: { tick() { calls.push("zvm"); } },
    StatTracker: { Resync() { calls.push("stats"); } },
    WorldModel: { lastPayload: null, tick() { calls.push("world"); } },
    MapTopology: { prevRoomId: 1, prevRoomName: "old" },
    Actionable: { Refresh() { calls.push("actionable"); } },
    ParchLockMap: { Draw() { calls.push("map"); } },
    SemanticActions: { generationReset() { calls.push("semantic-clear"); } },
    AttrCalibrator: { clearD198GenerationEvidence() { calls.push("provenance-clear"); } },
    ExitCalibrator: { clearD198GenerationHints() { calls.push("exit-clear"); } }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("js/UndoRestoreSync.js", "utf8"), sandbox);
sandbox.UndoRestoreSync.resync();

function before(a, b) { return calls.indexOf(a) >= 0 && calls.indexOf(a) < calls.indexOf(b); }
if (!before("stats", "world")) throw new Error("stats-before-world ordering changed: " + calls.join(","));
for (const name of ["semantic-clear", "provenance-clear", "exit-clear"]) {
    if (calls.filter(x => x === name).length !== 1) throw new Error(name + " expected exactly once: " + calls.join(","));
}
if (!(before("world", "semantic-clear") && before("semantic-clear", "provenance-clear") && before("provenance-clear", "exit-clear"))) {
    throw new Error("D198 owner cleanup order is not explicit: " + calls.join(","));
}
if (sandbox.MapTopology.prevRoomId !== null || sandbox.MapTopology.prevRoomName !== "") {
    throw new Error("topology reset changed");
}
console.log("PASS D198 lifecycle: proven restore order preserved; semantic, provenance and exit generation owners clear exactly once");
