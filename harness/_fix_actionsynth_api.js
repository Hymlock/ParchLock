const fs = require("fs");
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
tu = tu.replace(
  /applyActions:\s*\(p\)\s*=>\s*\{[\s\S]*?\},/,
  `applyActions: (p) => {
        if (typeof ActionSynth === "undefined" || !p) return;
        var cmds = [];
        (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (o) {
            if (!o || !o.name) return;
            ActionSynth.commandsForObject(o, "room").forEach(function (c) { cmds.push(c); });
        });
        window.__PL_ACTION_SYNTH__ = cmds;
    },
`
);
fs.writeFileSync("js/TranslatorUI.js", tu);
try { new Function(tu); console.log("TU OK"); } catch (e) { console.log("TU FAIL", e.message); }

// Also add collectFromPayload to ActionSynth for API completeness
let a = fs.readFileSync("js/ActionSynth.js", "utf8");
if (!a.includes("collectFromPayload")) {
  a = a.replace(
    /commandsForPayloadObjectId:\s*\([\s\S]*?\}\s*;/,
    (m) => m.replace(/\}\s*;\s*$/, `},
    collectFromPayload: (p) => {
        var cmds = [];
        if (!p) return cmds;
        (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (o) {
            if (!o || !o.name) return;
            ActionSynth.commandsForObject(o, "room").forEach(function (c) { cmds.push(c); });
        });
        return cmds;
    }
};`)
  );
  // safer append before final };
  if (!a.includes("collectFromPayload")) {
    a = a.replace(/\n\}\s*;\s*$/, `,\n    collectFromPayload: function (p) {\n        var cmds = [];\n        if (!p) return cmds;\n        (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (o) {\n            if (!o || !o.name) return;\n            ActionSynth.commandsForObject(o, "room").forEach(function (c) { cmds.push(c); });\n        });\n        return cmds;\n    }\n};\n`);
  }
  fs.writeFileSync("js/ActionSynth.js", a);
}
try { new Function(fs.readFileSync("js/ActionSynth.js","utf8")); console.log("AS OK"); } catch (e) { console.log("AS FAIL", e.message); }
