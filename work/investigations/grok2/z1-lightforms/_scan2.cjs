const fs = require("fs");
const s = fs.readFileSync("js/ModuleStatFactsClaude.js", "utf8");
const needles = ['"switchable": [123]', '"switchable": [71]', "Hollywood", "Starcross (Infocom"];
for (const needle of needles) {
  const i = s.indexOf(needle);
  console.log("---", needle, "at", i);
  if (i >= 0) console.log(s.slice(Math.max(0, i - 300), i + 600));
}
