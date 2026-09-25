const fs = require("fs");
let html = fs.readFileSync("play.html", "utf8");
// Extract existing guard block if present
const guardRe = /<script>\s*\/\* BUILD 43: when Emglken[\s\S]*?<\/script>\s*/;
const m = html.match(guardRe);
if (!m) { console.log("no guard found"); process.exit(1); }
let guard = m[0];
html = html.replace(guardRe, "");
// Strengthen: also clear any Global query cache if present
guard = guard.replace(
  "window.__PL_DISABLE_QUIXE__ = true;",
  `window.__PL_DISABLE_QUIXE__ = true;
    try {
      if (window.Global) {
        if ("Query" in Global) Global.Query = location.search;
        if ("UrlParams" in Global) Global.UrlParams = null;
      }
    } catch (e) {}`
);
// Insert immediately after charset / parchlock-root, before Global.js
if (html.indexOf('<script src="js/Global.js"></script>') >= 0) {
  html = html.replace('<script src="js/Global.js"></script>', guard + '\n\t\t<script src="js/Global.js"></script>');
} else {
  console.log("Global.js tag missing");
  process.exit(1);
}
fs.writeFileSync("play.html", html);
console.log("guard moved before Global.js", html.indexOf("__PL_EMGLKEN_STORY__") < html.indexOf("js/Global.js"));
