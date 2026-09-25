const fs = require("fs");
const files = ["PRODUCTION_PLAN.md", "ARCHITECTURE_UML.md", "Full Stack Engine Level Conversion.txt"];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log("MISSING", f); continue; }
  const t = fs.readFileSync(f, "utf8");
  console.log("\n====", f, "====");
  const keys = ["compass", "non-cardinal", "named exit", "hybrid", "cardinal", "direction"];
  for (const k of keys) {
    let idx = 0, n = 0;
    const low = t.toLowerCase();
    const kk = k.toLowerCase();
    while ((idx = low.indexOf(kk, idx)) >= 0 && n < 3) {
      console.log("---", k, "@", idx);
      console.log(t.slice(Math.max(0, idx - 80), idx + 220).replace(/\s+/g, " "));
      idx += kk.length; n++;
    }
  }
}
