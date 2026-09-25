const fs = require("fs");
const q = fs.readFileSync("lib/quixe.js", "utf8");
let idx = q.indexOf("ReadByte");
console.log("ReadByte ctx", q.slice(idx - 80, idx + 200));
idx = q.search(/function\s+ReadByte|ReadByte\s*[:=]/);
console.log("alt", idx);
// window exports
for (const p of ["window.Quixe", "GiDispa", "Glk", "class_map", "memmap", "ram_size", "MemW"]) {
  console.log(p, q.includes(p));
}
const map = fs.readFileSync("js/Map.js", "utf8");
const d = map.indexOf("Draw:");
console.log("Draw slice\n", map.slice(d, d + 900));
