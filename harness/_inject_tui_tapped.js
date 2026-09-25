const fs = require("fs");
const path = "lib/parchment-modern/parchment-single-tapped.html";
let t = fs.readFileSync(path, "utf8");
if (t.indexOf("TranslatorUI.js") < 0) {
  t = t.replace(
    'src="../../js/WorldModel.js"',
    'src="../../js/WorldModel.js"></script>\n<script src="../../js/TextGate.js"></script>\n<script src="../../js/TranslatorUI.js"'
  );
  // Ensure tick also applies TranslatorUI - look for WorldModel.tick refresh
  if (t.indexOf("TranslatorUI.tick") < 0 && t.indexOf("WorldModel.tick") >= 0) {
    t = t.replace(/WorldModel\.tick\(\)/g, "WorldModel.tick(); if (window.TranslatorUI) TranslatorUI.tick()");
  }
  fs.writeFileSync(path, t);
  console.log("TranslatorUI injected into tapped");
} else console.log("already in tapped");
