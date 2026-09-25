const fs = require("fs");

// --- TranslatorUI debug gate ---
let tui = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (tui.indexOf("debugVisible") < 0) {
  tui = tui.replace(
    "var TranslatorUI = {\n    lastSig: \"\",\n    engineMode: \"heuristic\",",
    `var TranslatorUI = {
    lastSig: "",
    engineMode: "heuristic",
    // Player-facing ParchLock chrome only. Metrics/debug stay hidden unless opted in.
    debugVisible: () => {
        try {
            if (typeof Global !== "undefined" && Global.Prefs && Global.Prefs.DebugTranslator) return true;
            var q = (location.search || "").toLowerCase();
            return q.indexOf("debug=1") >= 0 || q.indexOf("debugtranslator=1") >= 0;
        } catch (e) { return false; }
    },`
  );
  tui = tui.replace(
    "applyHud: (p) => {\n        TranslatorUI.ensureChrome();\n        var el = $(\"#pl-hud-metrics\").empty();",
    `applyHud: (p) => {
        TranslatorUI.ensureChrome();
        var el = $("#pl-hud-metrics").empty();
        if (!TranslatorUI.debugVisible()) { el.hide(); return; }
        el.show();`
  );
  // special commands: keep visible (ParchLock player UI). Floor tabs: keep.
  fs.writeFileSync("js/TranslatorUI.js", tui);
  console.log("TranslatorUI debug-gated");
}

// Hide pl-hud by default in CSS
let css = fs.readFileSync("css/ParchLock.css", "utf8");
if (css.indexOf("pl-hud-metrics") >= 0 && css.indexOf("debug-translator") < 0) {
  css += `

/* BUILD 44 ? Translator metrics hidden unless debug */
#pl-hud-metrics { display: none !important; }
html.pl-debug-translator #pl-hud-metrics { display: flex !important; }
`;
  fs.writeFileSync("css/ParchLock.css", css);
  console.log("CSS hud hidden");
}

// Toggle class when debug
if (tui.indexOf("pl-debug-translator") < 0) {
  tui = fs.readFileSync("js/TranslatorUI.js", "utf8");
  tui = tui.replace(
    "apply: (payload) => {",
    `apply: (payload) => {
        try { document.documentElement.classList.toggle("pl-debug-translator", !!TranslatorUI.debugVisible()); } catch (e) {}`
  );
  fs.writeFileSync("js/TranslatorUI.js", tui);
}

// --- Strip / hide WorldModel side panel in experimental tapped host ---
const tapped = "lib/parchment-modern/parchment-single-tapped.html";
if (fs.existsSync(tapped)) {
  let h = fs.readFileSync(tapped, "utf8");
  // Hide wm panel styles if present
  if (h.indexOf("id=\"wm-panel\"") >= 0 || h.indexOf("wm-json") >= 0) {
    if (h.indexOf("pl-hide-wm-debug") < 0) {
      h = h.replace("<head>", `<head>
<style id="pl-hide-wm-debug">
  /* Experimental host only: WorldModel debug UI hidden unless ?debug=1 */
  #wm-panel, #wm-mode, #wm-json, .wm-panel, [id^="wm-"] {
    display: none !important;
  }
  html.pl-debug-translator #wm-panel,
  html.pl-debug-translator #wm-mode,
  html.pl-debug-translator #wm-json {
    display: block !important;
  }
</style>
<script>
(function(){
  try {
    if (/[?&]debug=1\\b/i.test(location.search)) document.documentElement.classList.add("pl-debug-translator");
  } catch(e) {}
})();
</script>`);
      fs.writeFileSync(tapped, h);
      console.log("tapped debug panel hidden by default");
    } else console.log("tapped already gated");
  } else {
    console.log("tapped: no wm-panel id found ? searching markers");
    const i = h.indexOf("wm-json");
    console.log("wm-json at", i);
    if (i > 0 && h.indexOf("pl-hide-wm-debug") < 0) {
      h = h.replace("<head>", `<head>
<style id="pl-hide-wm-debug">#wm-panel,.wm-debug,[id*="wm-"]{display:none!important} html.pl-debug-translator #wm-panel,html.pl-debug-translator .wm-debug{display:block!important}</style>
`);
      fs.writeFileSync(tapped, h);
      console.log("tapped generic hide injected");
    }
  }
}

// Docs D16
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (plan.indexOf("D16") < 0) {
  plan = plan.replace(/\| D15 \|[^\n]+\n/, (m) => m + "| D16 | Only ParchLock play.html UI is player-visible; engines/Translator metrics hidden unless user enables debug | [yes] |\n");
  plan = plan.replace("### Done", "### Done\n- D16: visible UI = ParchLock only; WorldModel/probe HUD opt-in via \`?debug=1\` / Prefs.DebugTranslator\n");
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (uml.indexOf("D16") < 0) {
  uml += "\n\n## 21. Visible UI rule (D16)\n\nPlayers only see ParchLock (`play.html`). Engine hosts and Translator internals are background. Debug chrome requires explicit user opt-in.\n";
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}
console.log("docs D16");
