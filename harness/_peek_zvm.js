const fs = require("fs");
const z = fs.readFileSync("lib/zvm.js", "utf8");
for (const p of ["getByte", "getWord", "m.get", "memory", "ram", "HEAP", "ReadByte", "exports", "ZVM", "window.ZVM"]) {
  const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "g");
  let c=0; while(re.exec(z) && c<3) c++;
  if (c) console.log(p, c);
}
// first 200 chars of exports-ish
const i = z.indexOf("getByte");
console.log("getByte", z.slice(Math.max(0,i-50), i+120));
