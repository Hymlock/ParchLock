const fs = require("fs");
const path = require("path");
function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const st = fs.statSync(p);
    if (st.isDirectory() && n !== "node_modules" && n !== "vendor") walk(p);
    else if (/\.(js|css|html|md)$/.test(n)) {
      let b = fs.readFileSync(p);
      if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
        fs.writeFileSync(p, b.slice(3));
        console.log("BOM", p);
      }
    }
  }
}
walk("js");
walk("harness");
