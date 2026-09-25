const fs = require("fs");
let t = fs.readFileSync("js/Autocomplete.js", "utf8");
// Remove broken trailing IIFE
t = t.replace(/\r?\n\/\* BUILD 43:[\s\S]*$/m, "\n");
// Insert TranslatorSeeds before final closing of Autocomplete object
if (t.indexOf("TranslatorSeeds") < 0) {
  t = t.replace(
    /WordClicked:\s*function\(e\)\s*\{[\s\S]*?\n\s*\}\n\}/,
    (m) => m.replace(/\n\}$/, `,\n\n    TranslatorSeeds: function () {\n        var out = [];\n        try {\n            (window.__PL_ACTION_SYNTH__ || []).forEach(function (c) { if (c && c.command) out.push(c.command); });\n            if (typeof WorldModel !== "undefined" && WorldModel.lastPayload) {\n                (WorldModel.lastPayload.specialCommands || []).forEach(function (c) {\n                    out.push(typeof c === "string" ? c : (c.command || c.label || ""));\n                });\n            }\n        } catch (e) {}\n        return out.filter(Boolean);\n    }\n}`)
  );
}
fs.writeFileSync("js/Autocomplete.js", t);
try { new Function(t); console.log("syntax OK", t.includes("TranslatorSeeds")); }
catch (e) { console.log("syntax FAIL", e.message); }
