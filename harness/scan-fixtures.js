const path = require("path");
const fs = require("fs");
const createPmVmProbe = require(path.join(__dirname, "..", "native-hooks", "build", "wasm", "pm_vm_probe.js"));
(async () => {
  const mod = await createPmVmProbe();
  const files = process.argv.slice(2);
  for (const f of files) {
    const buf = fs.readFileSync(f);
    const p = mod._malloc(buf.length);
    mod.HEAPU8.set(buf, p);
    const scan = mod._pm_vm_probe_scan_stub(p, buf.length);
    mod._free(p);
    console.log(JSON.stringify({ file: path.basename(f), bytes: buf.length, ver: buf[0], scan, ok: scan >= 0 }));
    if (scan < 0) process.exitCode = 2;
  }
})().catch(e => { console.error(e); process.exit(1); });