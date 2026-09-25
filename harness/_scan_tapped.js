const fs = require("fs");
const t = fs.readFileSync("lib/parchment-modern/parchment-single-tapped.html", "utf8");
const re = /lib\/emglken[^"'\\s]*/g;
const s = new Set();
let m;
while ((m = re.exec(t))) s.add(m[0]);
console.log("emglken paths", [...s]);
const re2 = /(?:src|href)=["']([^"']+)["']/g;
const out = [];
while ((m = re2.exec(t))) {
  const u = m[1];
  if (/js\/|emglken|probe|World|RemGlk|Glk|Consts|Global|pm_vm/i.test(u)) out.push(u);
}
console.log("injected-ish", out);
// find parchmap script block near end
const idx = t.lastIndexOf("WorldModel");
console.log("WorldModel idx", idx, "len", t.length);
console.log(t.slice(Math.max(0, idx - 200), idx + 200).replace(/\n/g, "\\n"));
