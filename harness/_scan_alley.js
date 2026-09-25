const fs = require("fs");
const path = require("path");
function walk(d, acc) {
  acc = acc || [];
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) {
      if (/node_modules|screenshots|fixtures/.test(p)) continue;
      walk(p, acc);
    } else if (/\.(js|html)$/.test(f.name)) acc.push(p);
  }
  return acc;
}
const re = /alley|CurrentRoom\s*=\s*['"]Alley|garbage can|roomId\s*===\s*107/i;
const hits = [];
for (const p of walk("js").concat(["play.html"])) {
  const lines = fs.readFileSync(p, "utf8").split(/\n/);
  lines.forEach((l, i) => {
    if (re.test(l)) hits.push(p + ":" + (i + 1) + ":" + l.trim().slice(0, 140));
  });
}
console.log(hits.join("\n") || "CLEAN: no alley-specific product hits in js/");
