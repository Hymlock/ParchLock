const fs = require("fs");
const t = fs.readFileSync("lib/parchment-modern/parchment-single-tapped.html", "utf8");
let idx = 0, n = 0;
while ((idx = t.indexOf("lib_path", idx)) >= 0 && n < 5) {
  console.log("---", n, "at", idx);
  console.log(t.slice(idx - 120, idx + 180).replace(/\n/g, "\\n"));
  idx += 8; n++;
}
// also search parchment_options
idx = t.indexOf("parchment_options");
console.log("options at", idx);
console.log(t.slice(idx, idx + 400));
