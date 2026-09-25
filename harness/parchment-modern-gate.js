const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const need = [
  "play-emglken.html",
  "lib/parchment-modern/parchment-single.html",
  "lib/parchment-modern/parchment-single-tapped.html",
  "js/GlkTapProvider.js",
  "harness/fixtures/LostPig.z8"
];
let ok = true;
for (const rel of need) {
  if (!fs.existsSync(path.join(root, rel))) { console.error("missing", rel); ok = false; }
}
const tapped = fs.readFileSync(path.join(root, "lib/parchment-modern/parchment-single-tapped.html"), "utf8");
if (!tapped.includes("GlkTapProvider") || !tapped.includes("#wm-panel")) {
  console.error("tapped host missing WorldModel inject");
  process.exit(1);
}
if (!ok) process.exit(1);
console.log("PASS: parchment-modern tapped host present");
