const fs = require("fs");
const z = fs.readFileSync("lib/zvm.js", "utf8");
console.log("len", z.length);
const markers = ["window.ZVM", "ZVM=", "prototype", "getByte", "Uint8Array", ".m=", "memory", "restart", "load"];
markers.forEach(m => console.log(m, z.split(m).length-1));
// dump around window.ZVM
let i = z.lastIndexOf("window.ZVM");
console.log(z.slice(i, i+400));
// find env/options
i = z.indexOf("this.m");
console.log("this.m", i, z.slice(i, i+120));
i = z.indexOf("Uint8Array");
console.log("Uint8Array", i, z.slice(i-80, i+120));
