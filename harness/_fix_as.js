const fs = require("fs");
let a = fs.readFileSync("js/ActionSynth.js", "utf8");
// Fix premature close: },\n    collectFromPayload -> ,\n    collectFromPayload and ensure single closing
a = a.replace(/\n\}\s*,\s*\n\s*collectFromPayload:/, ",\n    collectFromPayload:");
// If still broken, rewrite from commandsForPayloadObjectId end
if (a.includes("},\n    collectFromPayload") === false && a.includes("collectFromPayload")) {
  // already fixed pattern
}
fs.writeFileSync("js/ActionSynth.js", a);
try { new Function(a); console.log("AS OK"); }
catch (e) {
  console.log("still", e.message);
  // nuclear: take everything before the bad }, and append collect properly
  const cut = a.indexOf("},\n    collectFromPayload");
  if (cut < 0) {
    const bad = a.lastIndexOf("\n},");
    const head = a.slice(0, bad);
    a = head + `,\n    collectFromPayload: function (p) {\n        var cmds = [];\n        if (!p) return cmds;\n        (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (o) {\n            if (!o || !o.name) return;\n            ActionSynth.commandsForObject(o, "room").forEach(function (c) { cmds.push(c); });\n        });\n        return cmds;\n    }\n};\n`;
    fs.writeFileSync("js/ActionSynth.js", a);
    try { new Function(a); console.log("AS rewritten OK"); } catch (e2) { console.log("AS still fail", e2.message); }
  }
}
