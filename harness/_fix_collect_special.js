const fs = require("fs");
let t = fs.readFileSync("js/RemGlkTapProvider.js", "utf8");
const i = t.indexOf("collect:");
console.log(t.slice(i, i + 1200));
