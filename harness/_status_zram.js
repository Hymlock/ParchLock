const fs = require("fs");
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const c = fs.readFileSync("js/Consts.js", "utf8");
console.log({
  findLikelyLocation: zr.includes("findLikelyLocation"),
  findPlayerId: zr.includes("findPlayerId"),
  isNonCardinal: zr.includes("isNonCardinal"),
  build: (c.match(/BUILD\s*=\s*(\d+)/) || [])[1]
});
// show findPlayerId body head
const i = zr.indexOf("findPlayerId:");
console.log(zr.slice(i, i + 900));
