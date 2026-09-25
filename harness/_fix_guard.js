const fs = require("fs");
let html = fs.readFileSync("play.html", "utf8");
const newGuard = `<script>
/* BUILD 44: product path is always Quixe via play.html.
 * Only the explicit experimental_emglken flag may reserve a binary story URL.
 */
(function () {
  try {
    var u = new URL(location.href);
    if ((u.searchParams.get("experimental_emglken") || "") !== "1") return;
    window.__PL_EMGLKEN_STORY__ = u.searchParams.get("story") || u.searchParams.get("storyfile") || "";
    u.searchParams.delete("story");
    u.searchParams.delete("storyfile");
    var qs = u.searchParams.toString();
    history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    window.parchment_options = window.parchment_options || {};
    window.parchment_options.auto_load = false;
    window.parchment_options.story = "";
  } catch (e) {}
})();
</script>
`;
// Replace existing BUILD 43 guard if present
const guardRe = /<script>\s*\/\* BUILD 43:[\s\S]*?<\/script>\s*/;
if (guardRe.test(html)) {
  html = html.replace(guardRe, newGuard + "\n\t\t");
} else if (html.indexOf("experimental_emglken") < 0) {
  html = html.replace('<script src="js/Global.js"></script>', newGuard + '\n\t\t<script src="js/Global.js"></script>');
}
fs.writeFileSync("play.html", html);
console.log("guard updated", html.includes("BUILD 44"), html.includes("experimental_emglken"));
