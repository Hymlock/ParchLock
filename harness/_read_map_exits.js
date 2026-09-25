const fs = require("fs");
const mi = fs.readFileSync("js/MapIdentity.js", "utf8");
console.log(mi.slice(mi.indexOf("applyExits"), mi.indexOf("applyExits") + 1500));
// how Map stores exits
const map = fs.readFileSync("js/Map.js", "utf8");
const idx = map.search(/Exits|AddExit|non.?cardinal|isNonCardinal/i);
console.log("\nMap mentions", (map.match(/Exits/g)||[]).length);
// Find room exit structure usage
let n=0, i=0;
while ((i = map.indexOf(".Exits", i)) >= 0 && n < 5) {
  console.log(map.slice(i-40, i+120).replace(/\s+/g," "));
  i+=6; n++;
}
