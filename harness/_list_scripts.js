const fs = require("fs");
const t = fs.readFileSync("play.html", "utf8");
const re = /script src="([^"]+)"/g;
let m;
while ((m = re.exec(t))) console.log(m[1]);
