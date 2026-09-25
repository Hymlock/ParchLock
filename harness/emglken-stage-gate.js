const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const need = [
  "lib/emglken/bocfel.js",
  "lib/emglken/bocfel.wasm",
  "lib/emglken/glulxe.js",
  "lib/emglken/glulxe.wasm",
  "lib/emglken/asyncglk.js",
  "lib/emglken/file-sizes.json",
  "js/EmglkenHost.js",
  "vendor/emglken-stage/node_modules/emglken/package.json"
];
let ok = true;
for (const rel of need) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) { console.error("missing", f); ok = false; }
}
if (!ok) process.exit(1);
const pkg = JSON.parse(fs.readFileSync(path.join(root, "vendor/emglken-stage/node_modules/emglken/package.json"), "utf8"));
if (pkg.version !== "0.7.2") { console.error("unexpected emglken version", pkg.version); process.exit(1); }
console.log("PASS: emglken-stage 0.7.2 assets present");