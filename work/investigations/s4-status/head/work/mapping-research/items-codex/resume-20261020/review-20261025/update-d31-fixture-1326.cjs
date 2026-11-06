const fs=require('fs');const f='harness/d31-nested-inventory.js';let s=fs.readFileSync(f,'utf8');const replace=(a,b)=>{if(!s.includes(a))throw Error('seam missing '+a.slice(0,60));s=s.replace(a,b)};replace(' * only offers "take out of X", never WEAR / LIGHT / DROP / etc. directly.',' * offers enabled Inspect first, then contextual "take out of X" with a plain\n * Take command; never WEAR / LIGHT / DROP / etc. directly.');replace('assert(nested.length === 1, "nested lamp offers exactly one command");','assert(nested.length === 2 && nested[0].command === "examine lamp", "nested lamp offers Inspect first, then contextual Take");');replace('assert(nested[0].command === "take lamp",','assert(nested[1].command === "take lamp",');replace('assert(nested[0].verb === "take out of box",','assert(nested[1].verb === "take out of box",');replace('assert(viaProbe.length === 1 && viaProbe[0].command === "take key" && viaProbe[0].verb === "take out of satchel",','assert(viaProbe.length === 2 && viaProbe[0].command === "examine key" && viaProbe[1].command === "take key" && viaProbe[1].verb === "take out of satchel",');replace('WorldModel.lastPayload = mockPayload;\n\n// --- RAM walk:',`WorldModel.lastPayload = mockPayload;

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

// --- RAM walk:`);replace('assert(liveNested.length === 1, "RAM-backed nested lamp offers exactly one command");','assert(liveNested.length === 2 && liveNested[0].command === "examine lamp", "RAM-backed nested lamp offers Inspect first, then contextual Take");');replace('assert(liveNested[0].command === "take lamp",','assert(liveNested[1].command === "take lamp",');replace('assert(liveNested[0].verb === "take out of box",','assert(liveNested[1].verb === "take out of box",');replace('assert(nestedLabels.filter(function (l) { return !/^Use with/.test(l); }).length === 1,\n    "radial has exactly one verb slice besides optional Use with...");','assert(nestedCmds.indexOf("examine lamp") >= 0 && nestedLabels.filter(function (l) { return !/^Use with/.test(l); }).length === 2,\n    "radial has Inspect and contextual Take besides optional Use with...");');replace('nestedCommand: nested[0] && nested[0].command,','nestedCommand: nested[1] && nested[1].command,');fs.writeFileSync(f,s);
