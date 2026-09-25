const fs = require("fs");
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 45");
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD", (c.match(/BUILD\s*=\s*(\d+)/)||[])[1]);
