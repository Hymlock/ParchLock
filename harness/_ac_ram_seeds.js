const fs = require("fs");
let ac = fs.readFileSync("js/Autocomplete.js", "utf8");
if (!ac.includes("RamCommandSeeds")) {
  const insert = `
    RamCommandSeeds: function () {
        var out = [];
        try {
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            if (!p) return out;
            var pool = (p.discoveredObjects || []).concat(p.inventory || []);
            pool.slice(0, 40).forEach(function (o) {
                if (typeof ActionSynth !== "undefined") {
                    ActionSynth.commandsForObject(o, "room").forEach(function (c) { if (c.command) out.push(c.command); });
                } else if (o && o.name) out.push("examine " + o.name);
            });
            (p.specialCommands || []).forEach(function (c) {
                out.push(typeof c === "string" ? c : (c.command || c.label || ""));
            });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },
`;
  if (ac.includes("TranslatorSeeds:")) {
    ac = ac.replace("TranslatorSeeds:", insert + "\n    TranslatorSeeds:");
  } else {
    ac = ac.replace(/\n\}\s*$/, ",\n" + insert + "\n}");
  }
  // Prefetch seeds into suggestions if ToggleSuggestions exists - soft
  fs.writeFileSync("js/Autocomplete.js", ac);
}
try { new Function(fs.readFileSync("js/Autocomplete.js","utf8")); console.log("Autocomplete OK", fs.statSync("js/Autocomplete.js").size); }
catch (e) { console.log("AC FAIL", e.message); }

// BUILD 46
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 46");
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD 46");
