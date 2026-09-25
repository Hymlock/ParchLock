const fs = require("fs");
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const i = zr.indexOf("findPlayerId:");
console.log(zr.slice(i, i + 2500));
console.log("\n==== SNAPSHOT ====");
console.log(zr.slice(zr.indexOf("snapshot:"), zr.indexOf("snapshot:") + 1200));
// backups?
const bak = ["js/ZRamReader.js.bak", "js/ZRamReader.js.bak13020"];
bak.forEach((b) => console.log(b, fs.existsSync(b)));
