const fs = require("fs");
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const i = zr.indexOf("lookAheadExits");
console.log(zr.slice(i, i + 1800));
console.log("\n--- Directions.js head ---");
console.log(fs.readFileSync("js/Directions.js", "utf8").slice(0, 800));
console.log("\n--- MapIdentity exits ---");
const mi = fs.readFileSync("js/MapIdentity.js", "utf8");
console.log(mi.slice(0, 1200));
