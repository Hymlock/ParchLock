const fs = require("fs");
const path = require("path");
function scan(file, patterns) {
  if (!fs.existsSync(file)) return;
  const t = fs.readFileSync(file, "utf8");
  const hits = [];
  for (const p of patterns) {
    const re = new RegExp(p, "gi");
    let m, c = 0;
    while ((m = re.exec(t)) && c < 3) {
      hits.push(p + " @" + m.index);
      c++;
    }
  }
  if (hits.length) console.log(file, hits.join(" | "));
}
const pats = ["HEAPU8", "HEAP8", "wasmMemory", "getMemory", "read_byte", "vm_read", "ram_size", "Glulx|ZMachine|memmem|story_map"];
const files = [
  "lib/quixe.js","lib/zvm.js","lib/main.js",
  "lib/emglken/bocfel.js","lib/emglken/glulxe.js","lib/emglken/asyncglk.js",
  "lib/parchment-modern/bocfel-noz6.js","lib/parchment-modern/parchment.js",
  "js/VmProbeLoader.js","native-hooks/include/pm_vm_probe.h","native-hooks/src/pm_vm_probe.c"
];
files.forEach(f => scan(f, pats));
// Map.js beautify / Draw hooks
scan("js/Map.js", ["Beautify","layout","Draw\\(","Floor","graphics","windowport"]);
scan("css/ParchLock.css", ["floor","dock","graphics","beautify"]);
console.log("fixtures", fs.readdirSync("harness/fixtures"));
