const fs = require("fs");
const t = fs.readFileSync("js/Map.js", "utf8");
const keys = ["Draw:", "Build:", "CreateRooms", "DisplayedRoom", "Save:", "Load:", "AllowUpdate", "zoom", "Center"];
keys.forEach(k => {
  const i = t.indexOf(k);
  console.log(k, i);
});
// Quixe memory - search mem / ram in quixe briefly via strings
const q = fs.readFileSync("lib/quixe.js", "utf8");
for (const p of ["mem_read", "MemRead", "ReadByte", "ram_start", "gamefile", "Quixe.", "class_map"]) {
  const re = new RegExp(p, "g");
  let c = 0, m; while (re.exec(q) && c < 2) c++;
  if (c) console.log("quixe", p, "hits", c);
}
