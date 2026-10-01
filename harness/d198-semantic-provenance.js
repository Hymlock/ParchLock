const fs = require("fs");
const vm = require("vm");

let pass = 0;
let fail = 0;
function ok(value, label) {
    if (value) { pass++; return; }
    fail++;
    console.error("FAIL: " + label);
}
function eq(actual, expected, label) {
    ok(JSON.stringify(actual) === JSON.stringify(expected), label + " (got " + JSON.stringify(actual) + ")");
}

function calibratorSandbox() {
    const s = {
        console,
        setTimeout() {},
        module: { exports: {} },
        AttributeSchema: { _getMem() { return null; }, _findIdByName() { throw new Error("forbidden name lookup"); } },
        Actionable: { commandNounFor(o) { return o.noun || o.name; } },
        ModuleLibrary: { currentExecutableIdentity() { return { digest: "digest-a" }; } },
        WorldModel: { lastPayload: null }
    };
    vm.createContext(s);
    vm.runInContext(fs.readFileSync("js/AttrCalibrator.js", "utf8"), s);
    return s;
}

const c = calibratorSandbox();
c.WorldModel.lastPayload = {
    discoveredObjects: [{ id: 7, name: "lamp", noun: "brass lamp" }],
    inventory: []
};
eq(c.AttrCalibrator._d198ScopedCorrelation("brass lamp"), { objectId: 7, context: "room" }, "exact parser noun correlates to stable id");
c.WorldModel.lastPayload.discoveredObjects.push({ id: 8, name: "other lamp", noun: "brass lamp" });
eq(c.AttrCalibrator._d198ScopedCorrelation("brass lamp"), null, "duplicate rendered noun fails closed");
c.WorldModel.lastPayload = {
    discoveredObjects: [{ id: 7, name: "lamp", noun: "brass lamp" }],
    inventory: [{ id: 7, name: "lamp", noun: "brass lamp" }]
};
eq(c.AttrCalibrator._d198ScopedCorrelation("brass lamp"), { objectId: 7, context: "inventory" }, "same id is deduplicated and inventory scope wins");

ok(c.AttrCalibrator._recordD198Provenance({
    verb: "take", objectId: 7, success: true, trace: [], at: 1,
    d198Correlation: { objectId: 7, context: "room" }
}), "direct success is recorded");
eq(c.AttrCalibrator.d198ProvenanceForObject(7, "room")[0].provenance, "opcode-state", "success provenance is opcode-state");
eq(c.AttrCalibrator.d198ProvenanceForObject(7, "room")[0].actionId, "opcode:take", "record carries stable action identity");
eq(c.AttrCalibrator.d198ProvenanceForObject(7, "room")[0].executableDigest, "digest-a", "record carries canonical executable identity");
ok(c.AttrCalibrator.d198ProvenanceForObject(7, "room")[0].confirmed, "opcode-state success is confirmed");
ok(c.AttrCalibrator._recordD198Provenance({
    verb: "read", objectId: 7, success: false, behavioralAccept: true, trace: [], at: 2,
    d198Correlation: { objectId: 7, context: "room" }
}), "behavioral acceptance is recorded diagnostically");
ok(!c.AttrCalibrator.d198ProvenanceForObject(7, "room").find(r => r.verb === "read").confirmed, "behavioral evidence cannot confirm");
ok(!c.AttrCalibrator._recordD198Provenance({
    verb: "take", objectId: 7, success: true, ambiguous: true,
    d198Correlation: { objectId: 7, context: "room" }
}), "ambiguous evidence is rejected");
c.AttrCalibrator.table.objects["7"] = { allowedVerbs: { take: { confirmed: true } } };
c.AttrCalibrator.clearD198GenerationEvidence();
eq(c.AttrCalibrator.d198ProvenanceForObject(7, "room"), [], "legacy persisted allowedVerbs cannot become D198 provenance");
c.ModuleLibrary.currentExecutableIdentity = () => null;
ok(!c.AttrCalibrator._recordD198Provenance({
    verb: "take", objectId: 7, success: true,
    d198Correlation: { objectId: 7, context: "room" }
}), "missing executable digest fails closed instead of creating unscoped evidence");

function semanticSandbox() {
    const store = {};
    const records = [];
    const s = {
        console,
        module: { exports: {} },
        localStorage: {
            getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
            setItem(k, v) { store[k] = String(v); },
            removeItem(k) { delete store[k]; }
        },
        Actionable: { commandNounFor(o) { return o.noun || o.name; } },
        ActionSynth: {
            commandsForObject(o) { return [{ verb: "examine", noun: o.noun || o.name, objectId: o.id, command: "examine " + (o.noun || o.name), confidence: 0.5 }]; },
            defaultInspectVerb() { return "examine"; }
        },
        AttrCalibrator: {
            d198ProvenanceForObject() { return records.slice(); },
            allowedVerbsFor() { throw new Error("forbidden allowedVerbsFor"); },
            clearD198GenerationEvidence() { records.length = 0; }
        },
        GrammarProvider: { d198Diagnostics() { return { classification: "confirmed-zil-family", family: "infocom-pre-v6-fixed", evidence: "validated" }; } },
        ZRamProvider: { getMem() { return { byteLength: 1 }; } }
    };
    vm.createContext(s);
    vm.runInContext(fs.readFileSync("js/SemanticActions.js", "utf8"), s);
    return { s, records };
}

const { s, records } = semanticSandbox();
const obj = { id: 7, name: "lamp", noun: "brass lamp" };
records.push({ verb: "take", actionId: "opcode:take", executableDigest: "digest-a", objectId: 7, context: "room", provenance: "opcode-state", confirmed: true, direct: true });
const active = s.SemanticActions.resolveForObject(obj, "room");
eq(active.map(x => x.command), ["take brass lamp", "examine brass lamp"], "validated semantic path defaults on");
s.SemanticActions.D198SemanticValve._testOverride = "off";
const legacy = s.SemanticActions.resolveForObject(obj, "room");
eq(legacy.map(x => x.command), ["examine brass lamp"], "explicit off preserves exact legacy result");
s.SemanticActions.D198SemanticValve._testOverride = "shadow";
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["examine brass lamp"], "shadow mode preserves resolver output");
const snapshot = s.SemanticActions.d198SemanticDiagnostics();
ok(snapshot && snapshot.forms[0].command === "take brass lamp", "shadow records the candidate form");
snapshot.forms[0].command = "mutated";
ok(s.SemanticActions.d198SemanticDiagnostics().forms[0].command === "take brass lamp", "shadow diagnostics are cloned");
s.SemanticActions.D198SemanticValve._testOverride = "on";
s.SemanticActions.CutoverFlag._testOverride = false;
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["examine brass lamp"], "D88 cutover off blocks D198 visibility");
s.SemanticActions.CutoverFlag._testOverride = true;
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["take brass lamp", "examine brass lamp"], "both valves expose confirmed scoped form first");
ok(s.SemanticActions.resolveForObject(obj, "room")[0].evidenceIdentity.indexOf("digest-a|infocom-pre-v6-fixed|opcode:take") === 0,
    "resolved form carries canonical evidence identity");
records[0].provenance = "behavioral-transcript";
records[0].confirmed = false;
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["examine brass lamp"], "behavioral evidence remains absent");
records[0] = { verb: "open", actionId: "opcode:open", executableDigest: "digest-a", objectId: 7, context: "room", provenance: "opcode-state", confirmed: true, direct: true };
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["examine brass lamp"], "past non-containment mutation is not treated as current applicability");
s.GrammarProvider.d198Diagnostics = () => ({ classification: "unknown", evidence: "rejected" });
records[0] = { verb: "take", actionId: "opcode:take", executableDigest: "digest-a", objectId: 7, context: "room", provenance: "opcode-state", confirmed: true, direct: true };
eq(s.SemanticActions.resolveForObject(obj, "room").map(x => x.command), ["examine brass lamp"], "unknown family produces no D198 form");
s.SemanticActions.generationReset();
ok(!s.SemanticActions.d198SemanticDiagnostics(), "semantic owner reset clears its shadow state");
s.AttrCalibrator.clearD198GenerationEvidence();
eq(records, [], "calibrator owner reset clears D198 evidence");

records.push({ verb: "take", actionId: "opcode:take", executableDigest: "digest-a", objectId: 7,
    context: "room", provenance: "opcode-state", confirmed: true, direct: true });
s.GrammarProvider.d198Diagnostics = () => ({ classification: "confirmed-zil-family", family: "infocom-pre-v6-fixed", evidence: "validated" });
s.ActionSynth.commandsForObject = o => [{ verb: "take", noun: o.noun, objectId: o.id,
    command: "take " + o.noun, confidence: 0.5, evidence: [{ legacy: true }], source: "migration-compat" }];
const merged = s.SemanticActions.resolveForObject(obj, "room");
eq(merged.map(x => x.command), ["take brass lamp"], "same rendered command deduplicates across providers");
ok(merged[0].evidence.length === 1 && merged[0].provenance.indexOf("migration-compat") >= 0,
    "rendered dedupe aggregates later provenance on the winning form");

console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
if (fail) process.exit(1);
console.log("PASS: d198-semantic-provenance (" + pass + " passed)");
