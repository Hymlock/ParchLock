const fs = require("fs");
const n = fs.readFileSync("js/Navigator.js", "utf8");
console.log("cardinal refs", (n.match(/north|Directions|cardinal/gi)||[]).slice(0,20));
const i = n.indexOf("FindRoute");
console.log(n.slice(i, i+900));
const mb = fs.readFileSync("js/MapBeautify.js", "utf8");
console.log("\n--- Beautify ---");
console.log(mb.slice(0, 1000));
