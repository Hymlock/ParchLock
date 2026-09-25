const fs = require("fs");
const main = fs.readFileSync("lib/main.js","utf8");
const i = main.indexOf("new window.ZVM");
console.log(main.slice(i-200, i+450));
const z = fs.readFileSync("lib/zvm.js","utf8");
// find prepare and memory fields
let idx = z.indexOf("prepare");
console.log("\nprepare", z.slice(idx, idx+500));
idx = z.indexOf("this.memory");
console.log("\nmemory refs");
let n=0, p=-1;
while ((p=z.indexOf("this.memory", p+1))>=0 && n<8) {
  console.log(p, z.slice(p, p+100).replace(/\n/g," "));
  n++;
}
