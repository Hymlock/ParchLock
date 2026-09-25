const fs = require("fs");
let g = fs.readFileSync("harness/complete-plan-gate.js", "utf8");
g = g.replace(/BUILD 43/g, "BUILD 44");
g = g.replace(/BUILD\\s\*\[:=\]\\s\*43/, "BUILD\\\\s*[:=]\\\\s*44");
if (g.indexOf("D15") < 0) {
  g = g.replace('["TranslatorUI","HostEmglkenBridge","TextGate","D14","BUILD 43"]', '["TranslatorUI","TextGate","D15","BUILD 44","play.html"]');
  g = g.replace(/BUILD 43/g, "BUILD 44");
}
// Fix BUILD check
g = g.replace(/BUILD\\s\*\[:=\]\\s\*43/, "BUILD\\\\s*[:=]\\\\s*44");
if (!/BUILD\\s\*\[:=\]\\s\*44/.test(g) && g.indexOf("BUILD not") >= 0) {
  g = g.replace(/if \(!\/BUILD[^)]+\)/, 'if (!/BUILD\\s*[:=]\\s*44/.test(c))');
}
fs.writeFileSync("harness/complete-plan-gate.js", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const need = [
  "js/TextGate.js","js/ActionSynth.js","js/MapIdentity.js","js/TranslatorUI.js",
  "js/DarkScope.js","js/GraphicsDock.js","js/MapBeautify.js","js/LiveHeapProvider.js",
  "js/WorldModel.js","js/Navigator.js","NOTICE","DISTRIBUTE.md","PRODUCTION_PLAN.md","ARCHITECTURE_UML.md"
];
let fail = 0;
need.forEach(f => { if (!fs.existsSync(path.join(root, f))) { console.error("MISSING", f); fail++; } });
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
["TranslatorUI.js","TextGate.js","WorldModel.js","DarkScope.js","MapBeautify.js"].forEach(s => {
  if (play.indexOf(s) < 0) { console.error("play.html missing", s); fail++; }
});
const bridge = fs.readFileSync(path.join(root, "js/HostEmglkenBridge.js"), "utf8");
if (bridge.indexOf("location.replace") >= 0) { console.error("HostEmglkenBridge must not redirect"); fail++; }
if (bridge.indexOf("experimental_emglken") < 0) { console.error("HostEmglkenBridge must be experimental-gated"); fail++; }
const c = fs.readFileSync(path.join(root, "js/Consts.js"), "utf8");
if (!/BUILD\\s*=\\s*44/.test(c)) { console.error("BUILD not 44"); fail++; }
const plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");
["D15","BUILD 44","play.html"].forEach(t => { if (plan.indexOf(t) < 0) { console.error("plan missing", t); fail++; } });
if (fail) { console.error("complete-plan-gate FAIL", fail); process.exit(1); }
console.log("complete-plan-gate PASS");
`);
console.log("gate rewritten");
