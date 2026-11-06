const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const need = [
  "js/RemGlkTapProvider.js",
  "js/VmProbeLoader.js",
  "lib/pm_vm_probe.js",
  "lib/pm_vm_probe.wasm",
  "lib/parchment-modern/parchment-single-tapped.html",
  "DISTRIBUTE.md",
  "play-emglken.html"
];
let ok = true;
for (const rel of need) {
  if (!fs.existsSync(path.join(root, rel))) { console.error("missing", rel); ok = false; }
}
const tapped = fs.readFileSync(path.join(root, "lib/parchment-modern/parchment-single-tapped.html"), "utf8");
for (const token of ["RemGlkTapProvider.js", "VmProbeLoader.js", "parchlock-root", "../../js/"]) {
  if (!tapped.includes(token)) { console.error("tapped missing", token); ok = false; }
}
const dist = fs.readFileSync(path.join(root, "DISTRIBUTE.md"), "utf8");
if (!/static web server/i.test(dist)) { console.error("DISTRIBUTE.md incomplete"); ok = false; }
// fail if runtime js still hardcodes a user home path
for (const rel of ["js/RemGlkTapProvider.js", "js/VmProbeLoader.js", "js/WorldModel.js", "play-emglken.html"]) {
  const t = fs.readFileSync(path.join(root, rel), "utf8");
  if (/C:\\\\Users\\\\|SKSEDevKit|hymlo/i.test(t)) { console.error("local lock-in in", rel); ok = false; }
}
if (!ok) process.exit(1);
console.log("PASS: remglk+probe+distribute portable gates");