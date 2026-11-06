const path = require("path");
const fs = require("fs");
const createPmVmProbe = require(path.join(__dirname, "..", "build", "wasm", "pm_vm_probe.js"));
(async () => {
  const mod = await createPmVmProbe();
  const ptr = mod._pm_vm_probe_info();
  const abi = mod.getValue(ptr, "i32");
  const buildPtr = mod.getValue(ptr + 16, "*");
  const buildId = mod.UTF8ToString(buildPtr);
  console.log(JSON.stringify({ abi, buildId }));
  if (abi !== 1) process.exit(1);

  const sample = new Uint8Array(128);
  sample[0] = 5; // Z5
  sample[10] = 0x01; sample[11] = 0x00; // object table @ 0x0100 (fake within length? 256 > 128)
  // put object table base inside buffer: 0x0040
  sample[10] = 0x00; sample[11] = 0x40;
  const heapPtr = mod._malloc(sample.length);
  if (mod.HEAPU8) mod.HEAPU8.set(sample, heapPtr);
  else for (let i = 0; i < sample.length; i++) mod.setValue(heapPtr + i, sample[i], "i8");
  const scan = mod._pm_vm_probe_scan_stub(heapPtr, sample.length);
  mod._free(heapPtr);
  if (scan < 0) { console.error("scan failed", scan); process.exit(1); }
  console.log("scan", scan);
  // Also scan real fixture if present
  const fixture = path.join(__dirname, "..", "..", "harness", "fixtures", "LostPig.z8");
  if (fs.existsSync(fixture)) {
    const buf = fs.readFileSync(fixture);
    const p2 = mod._malloc(buf.length);
    mod.HEAPU8.set(buf, p2);
    const s2 = mod._pm_vm_probe_scan_stub(p2, buf.length);
    mod._free(p2);
    console.log("LostPig scan", s2, "ver", buf[0]);
    if (s2 < 0) process.exit(1);
  }
  console.log("PASS: wasm pm_vm_probe story-scan");
})().catch(e => { console.error(e); process.exit(1); });