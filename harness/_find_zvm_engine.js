const fs = require("fs");
const main = fs.readFileSync("lib/main.js","utf8");
for (const p of ["ZVM","engine","runner","vm.","createEngine","zvm"]) {
  const re = new RegExp(p, "gi");
  let c=0; while(re.exec(main)&&c<3)c++;
  console.log("main", p, c);
}
// Search the window assignment for the engine.
const z = fs.readFileSync("lib/zvm.js","utf8");
const i = z.indexOf("window.ZVM");
console.log("ZVM export ctx", z.slice(i, i+300));
// Look for .m= or a memory property near the constructor.
let idx = 0, n=0;
while ((idx = z.indexOf(".m=", idx+1)) > 0 && n < 5) {
  console.log("m=", z.slice(idx-40, idx+80).replace(/\n/g," "));
  n++;
}
