const fs = require("fs");
console.log(fs.readFileSync("native-hooks/src/pm_vm_probe.c","utf8").slice(0,3500));
