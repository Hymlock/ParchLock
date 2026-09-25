const fs = require("fs");

// 1) Early guard in play.html before lib/main.js
let html = fs.readFileSync("play.html", "utf8");
const guard = `<script>
/* BUILD 43: when Emglken host is requested, keep story off Quixe ? binary .z5/.z8 is not JS */
(function () {
  try {
    var u = new URL(location.href);
    var host = (u.searchParams.get("host") || u.searchParams.get("vm") || "").toLowerCase();
    if (host !== "emglken") return;
    window.__PL_EMGLKEN_STORY__ = u.searchParams.get("story") || u.searchParams.get("storyfile") || "";
    u.searchParams.delete("story");
    u.searchParams.delete("storyfile");
    var qs = u.searchParams.toString();
    history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + u.hash);
    window.parchment_options = window.parchment_options || {};
    window.parchment_options.auto_load = false;
  } catch (e) {}
})();
</script>
`;
if (html.indexOf("__PL_EMGLKEN_STORY__") < 0) {
  html = html.replace('<script src="lib/main.js"></script>', guard + '\t\t<script src="lib/main.js"></script>');
  fs.writeFileSync("play.html", html);
  console.log("play.html guard inserted");
} else console.log("guard present");

// 2) HostEmglkenBridge reads reserved story
let b = fs.readFileSync("js/HostEmglkenBridge.js", "utf8");
if (b.indexOf("__PL_EMGLKEN_STORY__") < 0) {
  b = b.replace(
    "storyParam: () => {\n        try {\n            var u = new URL(location.href);\n            return u.searchParams.get(\"story\") || u.searchParams.get(\"storyfile\") || \"\";\n        } catch (e) { return \"\"; }\n    },",
    "storyParam: () => {\n        try {\n            if (window.__PL_EMGLKEN_STORY__) return window.__PL_EMGLKEN_STORY__;\n            var u = new URL(location.href);\n            return u.searchParams.get(\"story\") || u.searchParams.get(\"storyfile\") || \"\";\n        } catch (e) { return \"\"; }\n    },"
  );
  fs.writeFileSync("js/HostEmglkenBridge.js", b);
  console.log("bridge storyParam updated");
} else console.log("bridge ok");

// 3) Remove em-dash from TranslatorUI string
let tui = fs.readFileSync("js/TranslatorUI.js", "utf8");
tui = tui.replace(/\u2014/g, "-");
fs.writeFileSync("js/TranslatorUI.js", tui);
console.log("TranslatorUI dash normalized");
