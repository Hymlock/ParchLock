const fs = require("fs");
let html = fs.readFileSync("play.html", "utf8");
const block = [
  "js/EmglkenHost.js",
  "js/EmglkenProvider.js",
  "js/TextGate.js",
  "js/ActionSynth.js",
  "js/MapIdentity.js",
  "js/GlkTapProvider.js",
  "js/RemGlkTapProvider.js",
  "js/VmProbeLoader.js",
  "js/WorldModel.js",
  "js/TranslatorUI.js",
  "js/HostEmglkenBridge.js",
  "js/ParchLock.js"
].map(function (s) { return '\t\t<script src="' + s + '"></script>'; }).join("\n");

const re = /<script src="js\/EmglkenHost\.js"><\/script>[\s\S]*?<script src="js\/ParchLock\.js"><\/script>/;
if (re.test(html)) {
  html = html.replace(re, block);
} else {
  // fallback: insert before ParchLock
  html = html.replace('<script src="js/ParchLock.js"></script>', block);
}
if (html.indexOf('name="parchlock-root"') < 0) {
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n\t\t<meta name="parchlock-root" content=".">');
}
fs.writeFileSync("play.html", html);
console.log("play ok", html.indexOf("TranslatorUI.js") >= 0, html.indexOf("HostEmglkenBridge.js") >= 0);

let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*[:=]\s*\d+/, function (s) { return s.replace(/\d+/, "43"); });
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD", (c.match(/BUILD\s*[:=]\s*(\d+)/) || [])[1]);
