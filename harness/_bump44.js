const fs = require("fs");
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 44");
fs.writeFileSync("js/Consts.js", c);
console.log((c.match(/BUILD\s*=\s*(\d+)/)||[])[1]);
