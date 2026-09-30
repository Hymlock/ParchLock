const fs = require("fs");
const vm = require("vm");

let pass = 0, fail = 0;
function ok(v, label) { if (v) pass++; else { fail++; console.error("FAIL: " + label); } }
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label + " got=" + JSON.stringify(a)); }

const storage = {};
const props = {
    10: [{ num: 5, sz: 1, dataAddr: 100 }]
};
const bytes = { 100: 20 };
const sandbox = {
    console,
    localStorage: {
        getItem(k) { return storage[k] || null; },
        setItem(k, v) { storage[k] = String(v); },
        removeItem(k) { delete storage[k]; }
    },
    ZRamReader: {
        gameIdentityKey() { return "test"; },
        listProps(mem, id) { return props[id] || []; },
        u8(mem, addr) { return bytes[addr] || 0; },
        u16(mem, addr) { return ((bytes[addr] || 0) << 8) | (bytes[addr + 1] || 0); },
        isPlausibleExitTarget(mem, id) { return id === 20; },
        shortName(mem, id) { return id === 20 ? "Destination" : ""; },
        attrsFromObject() { return {}; }
    }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync("js/ExitCalibrator.js", "utf8"), sandbox);
const E = sandbox.ExitCalibrator;
const mem = {};
const family = { classification: "confirmed-zil-family", evidence: "validated", directionLinkEvidence: "validated" };
const link = [{ roomId: 10, label: "north", prop: 5, mode: "b0" }];

eq(E.exitsFor(mem, 10), [], "valve defaults off");
ok(!E.setD198StructuralHints({ classification: "confirmed-zil-family", evidence: "validated" }, link), "grammar-only family cannot authorize exits");
eq(E._d198GenerationLinks, [], "rejected hints leave no generation facts");
ok(E.setD198StructuralHints(family, link), "validated direction linkage accepted");
eq(E.exitsFor(mem, 10), [], "accepted hint remains invisible while valve off");
E.D198ExitValve._testOverride = "shadow";
eq(E.exitsFor(mem, 10), [], "shadow leaves existing exit output unchanged");
const snap = E.d198ExitDiagnostics();
ok(snap && snap.exits.length === 1 && snap.exits[0].targetRoomId === 20, "shadow records live decoded destination");
snap.exits[0].targetRoomId = 99;
ok(E.d198ExitDiagnostics().exits[0].targetRoomId === 20, "shadow getter clones diagnostics");
E.D198ExitValve._testOverride = "on";
eq(E.exitsFor(mem, 10).map(x => [x.label, x.targetRoomId, x.source]), [["north", 20, "d198-structural-exit-hint"]], "on emits validated ephemeral hint");
ok(!storage.PM_ExitCalib_test, "D198 hint does not persist into learned-travel store");
bytes[100] = 21;
eq(E.exitsFor(mem, 10), [], "dynamic property is read live and invalid destination fails closed");
bytes[100] = 20;
E.clearD198GenerationHints();
eq(E.exitsFor(mem, 10), [], "generation clear removes hints");
eq(E.d198ExitDiagnostics(), null, "generation clear removes shadow diagnostics");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) process.exit(1);
console.log("PASS: d198-exit-valve (" + pass + " passed)");
