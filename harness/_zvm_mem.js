const fs = require("fs");
const z = fs.readFileSync("lib/zvm.js","utf8");
for (const p of ["m:", "this.m", "Uint8Array", "getByte", "memory", "ram", "story", "objects", "parent", "child"]) {
  const re = new RegExp(p.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&"), "g");
  let c=0; while(re.exec(z)&&c<2)c++;
  if(c) console.log("zvm", p, c);
}
