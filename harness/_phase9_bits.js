const fs = require("fs");

// NOTICE for Phase 9
const notice = `# NOTICE

ParchLock overlay and conversion modules are GPL-3.0 (see LICENSE).

Third-party components used in this distribution:
- Parchment / Quixe / ZVM — their respective licenses (see lib/ and upstream)
- Emglken / Bocfel / Glulxe / AsyncGlk — upstream licenses under vendor/ and lib/emglken
- jQuery — MIT
- pm_vm_probe (native-hooks) — same project license as ParchLock

This package is designed to be relocatable: no absolute machine paths are required at runtime.
See DISTRIBUTE.md for the ship checklist.
`;
fs.writeFileSync("NOTICE", notice);

// Harness gate for complete plan surface
const gate = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const need = [
  "js/TextGate.js","js/ActionSynth.js","js/MapIdentity.js","js/TranslatorUI.js",
  "js/HostEmglkenBridge.js","js/WorldModel.js","js/RemGlkTapProvider.js","js/VmProbeLoader.js",
  "js/Navigator.js","NOTICE","DISTRIBUTE.md","PRODUCTION_PLAN.md","ARCHITECTURE_UML.md"
];
let fail = 0;
need.forEach(f => {
  if (!fs.existsSync(path.join(root, f))) { console.error("MISSING", f); fail++; }
});
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
["TranslatorUI.js","HostEmglkenBridge.js","TextGate.js","WorldModel.js"].forEach(s => {
  if (play.indexOf(s) < 0) { console.error("play.html missing", s); fail++; }
});
const nav = fs.readFileSync(path.join(root, "js/Navigator.js"), "utf8");
if (nav.indexOf("StepQueue") < 0) { console.error("Navigator missing StepQueue"); fail++; }
const c = fs.readFileSync(path.join(root, "js/Consts.js"), "utf8");
if (!/BUILD\\s*[:=]\\s*43/.test(c)) { console.error("BUILD not 43"); fail++; }
const plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");
["TranslatorUI","HostEmglkenBridge","TextGate","MapIdentity","ActionSynth","D13","BUILD 43"].forEach(t => {
  if (plan.indexOf(t) < 0) { console.error("plan missing", t); fail++; }
});
if (fail) { console.error("complete-plan-gate FAIL", fail); process.exit(1); }
console.log("complete-plan-gate PASS");
`;
fs.writeFileSync("harness/complete-plan-gate.js", gate);

// Patch Autocomplete lightly for dict seed from WorldModel
let ac = fs.readFileSync("js/Autocomplete.js", "utf8");
if (ac.indexOf("__PL_ACTION_SYNTH__") < 0) {
  // append seed helper at end
  ac += `

/* BUILD 43: seed suggestions from Translator action synth when present */
(function () {
  var _orig = typeof Autocomplete !== "undefined" ? Autocomplete.GetMatches || Autocomplete.Matches : null;
  if (typeof Autocomplete === "undefined") return;
  Autocomplete.TranslatorSeeds = function () {
    var out = [];
    try {
      (window.__PL_ACTION_SYNTH__ || []).forEach(function (c) { if (c && c.command) out.push(c.command); });
      if (typeof WorldModel !== "undefined" && WorldModel.lastPayload) {
        (WorldModel.lastPayload.specialCommands || []).forEach(function (c) {
          out.push(typeof c === "string" ? c : (c.command || c.label || ""));
        });
      }
    } catch (e) {}
    return out.filter(Boolean);
  };
})();
`;
  fs.writeFileSync("js/Autocomplete.js", ac);
  console.log("Autocomplete seeded");
}

console.log("NOTICE+gate written");
