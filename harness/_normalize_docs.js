const fs = require("fs");

function fix(s) {
  return s
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/Word\?ObjectID/g, "Word<->ObjectID")
    .replace(/location\?parent/g, "location<-parent")
    .replace(/player\?parent/g, "player -> parent")
    .replace(/Phase 2\?3/g, "Phase 2-3")
    .replace(/D12\?D16/g, "D12-D16")
    .replace(/D17\?D20/g, "D17-D20")
    .replace(/D8\?D12/g, "D8-D12")
    .replace(/D15\?D16/g, "D15-D16")
    .replace(/confidence \? structural/g, "confidence >= structural")
    .replace(/on \?N-room/g, "on >=N-room")
    .replace(/P2\) \? CRITICAL/g, "P2) - CRITICAL")
    .replace(/Deferred \? /g, "Deferred - ")
    .replace(/BUILD 45\? /g, "BUILD 45 - ");
}

let plan = fix(fs.readFileSync("PRODUCTION_PLAN.md", "utf8"));
let uml = fix(fs.readFileSync("ARCHITECTURE_UML.md", "utf8"));

// Fix provider map rows
if (!uml.includes("ZRamProvider")) {
  uml = uml.replace(
    "| Story-byte Z probe | `js/VmProbeLoader.js` + `lib/pm_vm_probe.*` | P2 light | [~] scan + ABI?v2 object summary in progress |\n| Live Bocfel HEAP | native-hooks linked into terp | P2 full | [ ] not started |",
    "| Story-byte Z probe | `js/VmProbeLoader.js` + `lib/pm_vm_probe.*` | P2 light | [yes] ABI2 header/summary only - NOT live scope |\n| Live ZVM RAM walk | target `js/ZvmCapture.js` + `js/ZRamProvider.js` + probe ABI3 | P2 full on play.html | [ ] CRITICAL - player/location/children/dictionary |\n| Live Bocfel HEAP | native-hooks linked into terp | P2 full alt | [ ] optional when under same chrome |"
  );
}

// Fix open question 4 that undersells live ZVM path
uml = uml.replace(
  "4. Live HEAP still blocked on terp export surface ? keep story-byte structural probe as the shippable P2 light path.",
  "4. P2 full on play.html uses live ZVM memory first; Bocfel get_vm_ram_ptr remains optional parallel path. Story-byte ABI2 is light-only."
);

fs.writeFileSync("PRODUCTION_PLAN.md", plan);
fs.writeFileSync("ARCHITECTURE_UML.md", uml);

// docs-sync: require D17-D20
let ds = fs.readFileSync("harness/docs-sync.js", "utf8");
if (!ds.includes("D17")) {
  ds = ds.replace(
    'const need = [\n  "D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader",\n  "DISTRIBUTE.md", "play-emglken.html", "Dual-host runtime"\n];',
    'const need = [\n  "D12", "D13", "D17", "D18", "D19", "D20", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader",\n  "DISTRIBUTE.md", "play-emglken.html", "Dual-host runtime", "CRITICAL PATH", "Word<->ObjectID"\n];'
  );
  // also the second loop
  ds = ds.replace(
    'for (const token of ["D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "DISTRIBUTE.md", "play-emglken.html"])',
    'for (const token of ["D12", "D13", "D17", "D18", "D19", "D20", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "DISTRIBUTE.md", "play-emglken.html", "CRITICAL PATH"])'
  );
  ds = ds.replace(
    'for (const token of ["D12", "D13", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "Dual-host runtime"])',
    'for (const token of ["D12", "D13", "D17", "WorldModel Translator", "RemGlkTapProvider", "VmProbeLoader", "Dual-host runtime"])'
  );
  fs.writeFileSync("harness/docs-sync.js", ds);
}

// Ensure UML has Word<->ObjectID and CRITICAL for sync
if (!uml.includes("Word<->ObjectID")) {
  uml += "\n\nWord<->ObjectID dictionary binding is mandatory under D18.\n";
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}
if (!uml.includes("CRITICAL PATH") && !uml.includes("CRITICAL -")) {
  uml += "\nLive ZVM RAM walk is the CRITICAL PATH for deterministic actionable marks.\n";
  fs.writeFileSync("ARCHITECTURE_UML.md", uml);
}

console.log("normalized");
console.log("plan Word", plan.includes("Word<->ObjectID"));
console.log("uml ZRam", uml.includes("ZRamProvider") || fs.readFileSync("ARCHITECTURE_UML.md","utf8").includes("ZRamProvider"));
