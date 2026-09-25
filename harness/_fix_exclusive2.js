const fs = require("fs");

let wm = fs.readFileSync("js/WorldModel.js", "utf8");
// Patch existing preferStructuralPayload to exclusive-replace discoveredObjects/inventory from structural
if (wm.includes("if (structural.discoveredObjects && structural.discoveredObjects.length)")) {
  wm = wm.replace(
    /if \(structural\.discoveredObjects && structural\.discoveredObjects\.length\) \{[\s\S]*?\n\s*\}/,
    `if (structural.discoveredObjects && structural.discoveredObjects.length) {
            /* EXCLUSIVE_ZRAM_OBJECTS */
            merged.discoveredObjects = structural.discoveredObjects.filter(function (o) {
                return o && o.id != null && o.id !== "" && o.name;
            });
        }`
  );
}
if (wm.includes("if (structural.inventory") || wm.includes("structural.inventory")) {
  // ensure inventory exclusive too
  if (!wm.includes("merged.inventory = (structural.inventory")) {
    wm = wm.replace(
      "/* EXCLUSIVE_ZRAM_OBJECTS */",
      `/* EXCLUSIVE_ZRAM_OBJECTS */
            if (structural.inventory && structural.inventory.length) {
                merged.inventory = structural.inventory.filter(function (o) {
                    return o && (typeof o === "string" || (o.id != null && o.name));
                });
            }`
    );
  }
}
// Also copy probe from structural
if (!wm.includes("merged.probe = structural.probe") && wm.includes("preferStructuralPayload")) {
  wm = wm.replace(
    "if (!structural) return merged;",
    `if (!structural) return merged;
        if (structural.probe) merged.probe = structural.probe;
        if (structural.engineMode) merged.engineMode = structural.engineMode;
        if (structural.vmType) merged.vmType = structural.vmType;`
  );
}
fs.writeFileSync("js/WorldModel.js", wm);
try { new Function(wm); console.log("WM OK"); } catch (e) { console.log("WM FAIL", e.message); }
console.log(wm.slice(wm.indexOf("preferStructuralPayload"), wm.indexOf("preferStructuralPayload") + 1100));

// Patch Actionable mark objectId binding
let a = fs.readFileSync("js/Actionable.js", "utf8");
if (!a.includes("mark.dataset.objectId")) {
  a = a.replace(
    'mark.className = "pl-act"; mark.dataset.noun = noun;\n                    mark.dataset.kind = Actionable.Directions.includes(noun) ? "direction" : scope.inventoryNouns.includes(noun) ? "inventory" : "object";\n                    mark.textContent = match[0]; mark.title = mark.dataset.kind === "direction" ? "Go " + noun : "Examine " + noun;',
    `mark.className = "pl-act"; mark.dataset.noun = noun;
                    mark.dataset.kind = Actionable.Directions.includes(noun) ? "direction" : scope.inventoryNouns.includes(noun) ? "inventory" : "object";
                    try {
                        var pool = (WorldModel && WorldModel.lastPayload && (WorldModel.lastPayload.discoveredObjects || []).concat(WorldModel.lastPayload.inventory || [])) || [];
                        var pobj = pool.find(function (o) {
                            if (!o || o.id == null || !o.name) return false;
                            var nm = String(o.name).toLowerCase();
                            if (nm === noun) return true;
                            var parts = nm.split(/\\s+/);
                            if (parts.indexOf(noun) >= 0) return true;
                            if (noun.length > 2 && nm.indexOf(noun) >= 0) return true;
                            if (noun.charAt(noun.length - 1) === "s" && (parts.indexOf(noun.slice(0, -1)) >= 0 || nm === noun.slice(0, -1))) return true;
                            return false;
                        });
                        if (pobj) {
                            mark.dataset.objectId = String(pobj.id);
                            if (pobj.dictAddr) mark.dataset.dictAddr = String(pobj.dictAddr);
                        }
                    } catch (eBind) {}
                    mark.textContent = match[0]; mark.title = mark.dataset.kind === "direction" ? "Go " + noun : "Examine " + noun;`
  );
  fs.writeFileSync("js/Actionable.js", a);
}
console.log("objectId", fs.readFileSync("js/Actionable.js","utf8").includes("mark.dataset.objectId"));
try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Act OK"); } catch (e) { console.log("Act FAIL", e.message); }
