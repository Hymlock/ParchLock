const fs = require("fs");
const path = require("path");
const targets = [
  "lib/parchment-modern/parchment-single-tapped.html",
  "play-emglken.html",
  "js/TranslatorUI.js",
  "js/HostEmglkenBridge.js",
  "css/ParchLock.css"
];
for (const f of targets) {
  if (!fs.existsSync(f)) { console.log("missing", f); continue; }
  const t = fs.readFileSync(f, "utf8");
  const keys = ["wm-mode","wm-json","WorldModel heuristic","pl-hud","debug","side panel","#pl-"];
  const hits = keys.filter(k => t.includes(k));
  console.log(f, hits.join(", ") || "(no debug markers)");
}
