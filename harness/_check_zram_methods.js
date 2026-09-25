const fs = require("fs");
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const keys = ["scopeObjects", "children", "findPlayerId", "lookAheadExits", "snapshot", "attrsFromObject", "objectLinks", "shortName"];
keys.forEach((k) => console.log(k, zr.includes(k + ":"), zr.indexOf(k + ":")));
console.log("len", zr.length);
// show around where scopeObjects should be
const i = zr.indexOf("lookAheadExits");
console.log("--- before lookAhead ---");
console.log(zr.slice(i - 200, i + 100));
try { new Function(zr); console.log("parse OK"); } catch (e) { console.log("parse FAIL", e.message); }
