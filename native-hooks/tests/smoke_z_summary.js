const path = require("path");
const fs = require("fs");
const createPmVmProbe = require(path.join(__dirname, "..", "build", "wasm", "pm_vm_probe.js"));
function summary(mod, buf) {
  const p = mod._malloc(buf.length);
  mod.HEAPU8.set(buf, p);
  const sumPtr = mod._malloc(4 * (6 + 64));
  const n = mod._pm_vm_probe_z_summary(p, buf.length, sumPtr);
  const g = (o) => mod.getValue(sumPtr + o, "i32");
  const out = { n, version: g(0), object_table: g(4), object_count: g(8), entry: g(12), samples: g(20) };
  mod._free(sumPtr); mod._free(p);
  return out;
}
(async () => {
  const mod = await createPmVmProbe();
  const abi = mod.getValue(mod._pm_vm_probe_info(), "i32");
  const buildId = mod.UTF8ToString(mod.getValue(mod._pm_vm_probe_info() + 16, "*"));
  if (abi !== 2) throw new Error("abi " + abi);
  console.log({ abi, buildId });
  for (const rel of ["LostPig.z8", "wump2ka.z5", "yagwad.z5"]) {
    const buf = fs.readFileSync(path.join(__dirname, "..", "..", "harness", "fixtures", rel));
    const s = summary(mod, buf);
    console.log(rel, s);
    if (s.n <= 0) process.exit(2);
  }
  console.log("PASS: z_summary fixtures");
})().catch(e => { console.error(e); process.exit(1); });