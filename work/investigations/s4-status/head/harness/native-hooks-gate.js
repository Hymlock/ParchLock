const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const need = [
  path.join(root, "native-hooks", "include", "pm_vm_probe.h"),
  path.join(root, "native-hooks", "build", "relwithdebinfo", "pm_vm_probe.dll"),
  path.join(root, "native-hooks", "build", "relwithdebinfo", "pm_vm_probe_smoke.exe"),
  path.join(root, "native-hooks", "build", "wasm", "pm_vm_probe.js"),
  path.join(root, "native-hooks", "build", "wasm", "pm_vm_probe.wasm"),
  path.join(root, "lib", "pm_vm_probe.js"),
  path.join(root, "lib", "pm_vm_probe.wasm")
];
let ok = true;
for (const f of need) {
  if (!fs.existsSync(f)) { console.error("missing", f); ok = false; }
}
if (!ok) process.exit(1);
console.log("PASS: native-hooks MSVC + WASM artifacts present");