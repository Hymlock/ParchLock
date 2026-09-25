const fs = require("fs");
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
["findRoomsByName","findLikelyLocation","findLocationGlobal","directionProps","readProp","parseDictionary","objectCount","header","attr"].forEach((k) => console.log(k, zr.includes(k)));
// list top-level keys roughly
const keys = [...zr.matchAll(/\n\s{4}([A-Za-z][A-Za-z0-9_]*):\s*(?:\(|function|\{|\[)/g)].map(m => m[1]);
console.log("methods", keys);
