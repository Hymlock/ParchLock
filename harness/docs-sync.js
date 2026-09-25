const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const plan = fs.readFileSync(path.join(root, "PRODUCTION_PLAN.md"), "utf8");
const uml = fs.readFileSync(path.join(root, "ARCHITECTURE_UML.md"), "utf8");
const need = [
  "D12", "D13", "D17", "D18", "D19", "D20", "D22", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader",
  "DISTRIBUTE.md", "play-emglken.html", "Dual-host runtime", "CRITICAL PATH", "Word<->ObjectID"
];
let ok = true;
for (const token of need) {
  if (!plan.includes(token) && token !== "Dual-host runtime") {
    // Dual-host is UML-specific
  }
  if (!plan.includes(token) && !["Dual-host runtime"].includes(token)) {
    console.error("PRODUCTION_PLAN missing", token);
    ok = false;
  }
  if (!uml.includes(token) && token !== "DISTRIBUTE.md") {
    // DISTRIBUTE filename may only be in plan; allow UML to say DISTRIBUTE
  }
}
for (const token of ["D12", "D13", "D17", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "Dual-host runtime"]) {
  if (!uml.includes(token)) { console.error("ARCHITECTURE_UML missing", token); ok = false; }
}
for (const token of ["D12", "D13", "D17", "D18", "D19", "D20", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "DISTRIBUTE.md", "play-emglken.html", "CRITICAL PATH"]) {
  if (!plan.includes(token)) { console.error("PRODUCTION_PLAN missing", token); ok = false; }
}
if (!ok) process.exit(1);
console.log("PASS: docs-sync D12/D13 + RemGlk/VmProbe/distribute");
