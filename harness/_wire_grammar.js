const fs = require("fs");
let h = fs.readFileSync("play.html", "utf8");
if (!h.includes("GrammarProvider.js")) {
  h = h.replace('<script src="js/WorldModel.js"></script>', '<script src="js/GrammarProvider.js"></script>\n\t\t<script src="js/WorldModel.js"></script>');
  fs.writeFileSync("play.html", h);
  console.log("grammar wired");
}
// Ensure ZvmCapture before main
console.log({
  zvmCap: h.indexOf("ZvmCapture.js") < h.indexOf("lib/main.js"),
  zram: h.includes("ZRamProvider.js"),
  reader: h.includes("ZRamReader.js"),
  grammar: h.includes("GrammarProvider.js")
});
