const fs = require("fs");
console.log("--- probe header ---");
console.log(fs.readFileSync("native-hooks/include/pm_vm_probe.h","utf8").slice(0,2500));
console.log("--- VmProbeLoader collect/scan ---");
const v = fs.readFileSync("js/VmProbeLoader.js","utf8");
["z_summary","zSummary","collect","scanCurrent","objectCount","short","parent","child","HEAP"].forEach(k=>{
  const i=v.indexOf(k); console.log(k, i);
});
console.log(v.slice(v.indexOf("collect:"), v.indexOf("collect:")+900));
