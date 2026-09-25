const fs = require("fs");
const t = fs.readFileSync("lib/parchment-modern/parchment-single-tapped.html", "utf8");
const i = t.indexOf("lib_path");
console.log("lib_path count", (t.match(/lib_path/g)||[]).length);
console.log(t.slice(Math.max(0,i-100), i+200));
