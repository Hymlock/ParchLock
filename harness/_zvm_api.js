const fs = require("fs");
const z = fs.readFileSync("lib/zvm.js", "utf8");
// find prototype methods
const re = /\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*function/g;
const names = new Set();
let m;
while ((m = re.exec(z))) names.add(m[1]);
console.log([...names].filter(n => /mem|byte|word|ram|read|get|m |story|object/i.test(n)).slice(0, 40));
console.log("window.ZVM assign", z.includes("window.ZVM"));
const i = z.lastIndexOf("window.ZVM");
console.log(z.slice(i, i+200));
