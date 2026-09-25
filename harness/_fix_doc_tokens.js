const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
let uml = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");

// Restore required tokens in Done
["RemGlkTapProvider", "VmProbeLoader", "play-emglken.html"].forEach(t => {
  if (!plan.includes(t)) {
    plan = plan.replace("### Done (infrastructure / chrome)", "### Done (infrastructure / chrome)\n- " + t);
  }
});

// Replace provider rows by line match
const lines = uml.split(/\n/);
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Story-byte Z probe")) {
    out.push("| Story-byte Z probe | `js/VmProbeLoader.js` + `lib/pm_vm_probe.*` | P2 light | [yes] ABI2 summary only - NOT live scope |");
    out.push("| Live ZVM RAM walk | target `js/ZvmCapture.js` + `js/ZRamProvider.js` + probe ABI3 | P2 full on play.html | [ ] CRITICAL PATH - player/location/children/dictionary |");
    // skip old Live Bocfel line if next; we'll rewrite it
    if (i + 1 < lines.length && lines[i + 1].includes("Live Bocfel HEAP")) {
      out.push("| Live Bocfel HEAP | native-hooks linked into terp | P2 full alt | [ ] optional parallel to ZVM path |");
      i++;
    }
    continue;
  }
  out.push(lines[i]);
}
uml = out.join("\n");
if (!uml.includes("Word<->ObjectID")) {
  uml = uml.replace("Dictionary Word<->ObjectID ? every", "Dictionary Word<->ObjectID -> every");
}
uml = uml.replace(/Word to ObjectID/g, "Word<->ObjectID");
uml = uml.replace(/Dictionary Word<->ObjectID \?/g, "Dictionary Word<->ObjectID ->");

fs.writeFileSync("PRODUCTION_PLAN.md", plan);
fs.writeFileSync("ARCHITECTURE_UML.md", uml);
console.log({
  rem: plan.includes("RemGlkTapProvider"),
  vm: plan.includes("VmProbeLoader"),
  play: plan.includes("play-emglken.html"),
  zram: uml.includes("ZRamProvider"),
  crit: uml.includes("CRITICAL PATH"),
  word: uml.includes("Word<->ObjectID")
});
