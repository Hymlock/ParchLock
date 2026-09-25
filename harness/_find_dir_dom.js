const fs = require("fs");
const files = ["js/Map.js", "js/WorkspaceUI.js", "js/ParchLock.js", "css/ParchLock.css"];
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  if (/dir-north|dir-n\b|CreateExit|exit\.dir/.test(t)) {
    console.log("\n====", f);
    let i = 0, n = 0;
    while ((i = t.search(/dir-north|BuildExits|exit\.dir|Directions\./)) >= 0 && n < 3) {
      // use indexOf variants
      break;
    }
    const re = /dir-(north|n)\b|BuildMap|PopulateExits|\.dir-/g;
    let m; let c = 0;
    while ((m = re.exec(t)) && c < 8) {
      console.log(m.index, t.slice(m.index, m.index + 100).replace(/\s+/g, " "));
      c++;
    }
  }
}
