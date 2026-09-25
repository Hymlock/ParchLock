const fs = require("fs");

// Finish MapBeautify tick safely
let mb = fs.readFileSync("js/MapBeautify.js", "utf8");
if (!mb.includes("nonCardinalSpokes")) {
  // re-read from failed run - maybe partial
  console.log("MapBeautify missing spokes ? rewriting file tail");
}
if (mb.includes("nonCardinalSpokes") && !mb.includes("nonCardinalSpokes()")) {
  // ensure tick calls it
}
if (!mb.includes("tick:")) {
  mb = mb.replace(/\n\}\s*;\s*$/, `,\n    tick: function () {\n        try { MapBeautify.nonCardinalSpokes(); MapBeautify.ensureFloors && MapBeautify.ensureFloors(); } catch (e) {}\n    }\n};\n`);
  fs.writeFileSync("js/MapBeautify.js", mb);
} else if (mb.includes("nonCardinalSpokes") && mb.includes("tick:") && !mb.includes("MapBeautify.nonCardinalSpokes()")) {
  mb = mb.replace("tick: () => {", "tick: () => {\n        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}");
  mb = mb.replace("tick: function () {", "tick: function () {\n        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}");
  fs.writeFileSync("js/MapBeautify.js", mb);
}
try { new Function(fs.readFileSync("js/MapBeautify.js","utf8")); console.log("MB OK"); } catch (e) { console.log("MB FAIL", e.message); }

// Ensure MapTopology exists (rewrite if missing)
if (!fs.existsSync("js/MapTopology.js") || fs.statSync("js/MapTopology.js").size < 500) {
  console.log("MapTopology missing ? write failed earlier?");
} else {
  try { new Function(fs.readFileSync("js/MapTopology.js","utf8")); console.log("Topo OK", fs.statSync("js/MapTopology.js").size); }
  catch (e) { console.log("Topo FAIL", e.message); }
}

// Wire play.html
let html = fs.readFileSync("play.html", "utf8");
if (!html.includes("MapTopology.js")) {
  if (html.includes("MapBeautify.js")) {
    html = html.replace('<script src="js/MapBeautify.js"></script>', '<script src="js/MapTopology.js"></script>\n\t\t<script src="js/MapBeautify.js"></script>');
  } else if (html.includes("MapIdentity.js")) {
    html = html.replace('<script src="js/MapIdentity.js"></script>', '<script src="js/MapIdentity.js"></script>\n\t\t<script src="js/MapTopology.js"></script>');
  }
  fs.writeFileSync("play.html", html);
}
console.log("play", fs.readFileSync("play.html","utf8").includes("MapTopology.js"));

// TranslatorUI
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (!tu.includes("MapTopology")) {
  if (tu.includes("tick:")) {
    tu = tu.replace(/tick:\s*\(\)\s*=>\s*\{/, "tick: () => {\n        try { if (typeof MapTopology !== \"undefined\" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (eMT) {}");
    tu = tu.replace(/tick:\s*function\s*\(\)\s*\{/, "tick: function () {\n        try { if (typeof MapTopology !== \"undefined\" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (eMT) {}");
    fs.writeFileSync("js/TranslatorUI.js", tu);
  }
}
try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU OK"); } catch (e) { console.log("TU", e.message); }

// Input noteCommand
let inp = fs.readFileSync("js/Input.js", "utf8");
if (!inp.includes("MapTopology.noteCommand")) {
  const m = inp.match(/Inject:\s*\(([^)]*)\)\s*=>\s*\{/);
  if (m) {
    inp = inp.replace(m[0], m[0] + "\n        try { if (typeof MapTopology !== \"undefined\") MapTopology.noteCommand(arguments[0]); } catch (e) {}");
    fs.writeFileSync("js/Input.js", inp);
  }
}
try { new Function(fs.readFileSync("js/Input.js","utf8")); console.log("Input OK"); } catch (e) { console.log("Input", e.message); }

// ZRamReader lookAhead - check if replaced
const zr = fs.readFileSync("js/ZRamReader.js", "utf8");
console.log("lookAhead isNonCardinal", zr.includes("isNonCardinal"));

// BUILD
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 48");
fs.writeFileSync("js/Consts.js", c);

// Docs if D23 missing from failed early exit - check
const plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
console.log("D23", plan.includes("D23"), "Phase5", /Phase 5[^\n]*\[~\]/.test(plan));
