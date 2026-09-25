const fs = require("fs");
const map = fs.readFileSync("js/Map.js", "utf8");
const i = map.indexOf("DrawRoom");
console.log(map.slice(i, i + 1200));
