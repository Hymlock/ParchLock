const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
for (const rel of ["js/GlkTapProvider.js", "js/HostEmglkenBridge.js", "play-emglken.html", "play.html"]) {
  if (!fs.existsSync(path.join(root, rel))) { console.error("missing", rel); process.exit(1); }
}
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
if (!play.includes("GlkTapProvider.js") || !play.includes("HostEmglkenBridge.js")) {
  console.error("play.html missing GlkTap / HostEmglkenBridge wiring");
  process.exit(1);
}
const tapped = fs.readFileSync(path.join(root, "lib/parchment-modern/parchment-single-tapped.html"), "utf8");
if (!tapped.includes("GlkTapProvider") && !tapped.includes("RemGlkTapProvider")) {
  console.error("tapped host missing tap providers");
  process.exit(1);
}
const em = fs.readFileSync(path.join(root, "play-emglken.html"), "utf8");
if (!em.includes("parchment-single-tapped.html") && !em.includes("emglken-frame")) {
  console.error("play-emglken missing tapped redirect or frame");
  process.exit(1);
}
console.log("PASS: glk-tap shell wired (play.html + tapped + play-emglken)");
