const fs = require("fs");

// --- WorldModel: preferStructural must replace discoveredObjects with id-backed only ---
let wm = fs.readFileSync("js/WorldModel.js", "utf8");
if (!wm.includes("EXCLUSIVE_ZRAM_OBJECTS")) {
  // Replace or inject strong filter at end of preferStructuralPayload / before lastPayload set in tick
  if (wm.includes("preferStructuralPayload")) {
    wm = wm.replace(
      /preferStructuralPayload:\s*function\s*\(payload\)\s*\{[\s\S]*?\n\s*\},/,
      `preferStructuralPayload: function (payload) {
        /* EXCLUSIVE_ZRAM_OBJECTS */
        payload = payload || this.createEmptyPayload();
        try {
            var zLive = payload.probe && payload.probe.status === "z-ram-live" && (payload.probe.scopeCount || 0) > 0;
            if (zLive) {
                payload.discoveredObjects = (payload.discoveredObjects || []).filter(function (o) {
                    return o && o.id != null && o.id !== "" && o.name;
                });
                payload.inventory = (payload.inventory || []).filter(function (o) {
                    return o && (typeof o === "string" || (o.id != null && o.name));
                });
                payload.engineMode = "structural";
                payload.vmType = payload.vmType || "z";
            }
        } catch (e) {}
        return payload;
    },`
    );
  }
  // Ensure tick applies preferStructural after merge
  if (wm.includes("tick:") && !wm.includes("preferStructuralPayload(payload)")) {
    wm = wm.replace(
      /this\.lastPayload\s*=\s*payload;/,
      "payload = this.preferStructuralPayload(payload);\n            this.lastPayload = payload;"
    );
  } else if (wm.includes("preferStructuralPayload(payload)") === false && wm.includes("lastPayload")) {
    wm = wm.replace(
      /this\.lastPayload\s*=\s*([^;]+);/,
      "this.lastPayload = this.preferStructuralPayload($1);"
    );
  }
  fs.writeFileSync("js/WorldModel.js", wm);
}
try { new Function(fs.readFileSync("js/WorldModel.js","utf8")); console.log("WM OK"); } catch (e) { console.log("WM FAIL", e.message); }

// Also fix merge: when collecting, if any provider returns z-ram-live with objs, don't append null-id from others
if (!wm.includes("SKIP_NULL_WHEN_ZRAM")) {
  wm = fs.readFileSync("js/WorldModel.js", "utf8");
  // Soft: in merge discoveredObjects loop ? harder; rely on preferStructural
  fs.writeFileSync("js/WorldModel.js", wm.replace("EXCLUSIVE_ZRAM_OBJECTS", "EXCLUSIVE_ZRAM_OBJECTS SKIP_NULL_WHEN_ZRAM"));
}

// --- Actionable: DeterministicNouns only id-backed when structural; fuzzy objectId bind ---
let a = fs.readFileSync("js/Actionable.js", "utf8");
a = a.replace(
  /DeterministicNouns:\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\},/,
  `DeterministicNouns: () => {
        var out = [];
        try {
            var p = WorldModel && WorldModel.lastPayload;
            var structural = p && p.probe && p.probe.status === "z-ram-live" &&
                ((p.probe.scopeCount || 0) > 0 || (p.discoveredObjects || []).some(function (o) { return o && o.id; }));
            var pool = [];
            if (structural) {
                pool = (p.discoveredObjects || []).filter(function (o) { return o && o.id && o.name; })
                    .concat((p.inventory || []).filter(function (o) { return o && o.id && o.name; }));
            } else if (p) {
                pool = (p.discoveredObjects || []).concat(p.inventory || []);
            }
            pool.forEach(function (o) {
                var n = (typeof o === "string" ? o : (o.name || "")).toLowerCase();
                if (!n) return;
                out.push(n);
                n.split(/\\s+/).forEach(function (t) {
                    if (t.length > 2) out.push(t);
                    // plural stem
                    if (t.length > 3 && /s$/.test(t)) out.push(t.slice(0, -1));
                });
            });
            (Actionable.Directions || []).filter(function (d) { return d && d.length > 2; }).forEach(function (d) { out.push(d); });
            if (!structural && Actionable.Scope) {
                (Actionable.Scope.inventoryNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
            }
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },`
);

// Better objectId matching on marks
a = a.replace(
  /try \{\s*var pobj = \(WorldModel[\s\S]*?catch \(e\) \{\}/,
  `try {
                        var pool = (WorldModel && WorldModel.lastPayload && (WorldModel.lastPayload.discoveredObjects || []).concat(WorldModel.lastPayload.inventory || [])) || [];
                        var pobj = pool.find(function (o) {
                            if (!o || !o.id || !o.name) return false;
                            var nm = String(o.name).toLowerCase();
                            if (nm === noun) return true;
                            var parts = nm.split(/\\s+/);
                            if (parts.indexOf(noun) >= 0) return true;
                            if (noun.length > 2 && nm.indexOf(noun) >= 0) return true;
                            // plurals
                            if (noun.charAt(noun.length - 1) === "s" && (nm === noun.slice(0, -1) || parts.indexOf(noun.slice(0, -1)) >= 0)) return true;
                            if (nm.charAt(nm.length - 1) === "s" && noun === nm.slice(0, -1)) return true;
                            return false;
                        });
                        if (pobj && pobj.id) {
                            mark.dataset.objectId = String(pobj.id);
                            if (pobj.dictAddr) mark.dataset.dictAddr = String(pobj.dictAddr);
                        }
                        if (kind === "inventory" || (Actionable.Scope.inventoryNouns || []).indexOf(noun) >= 0) mark.dataset.kind = "inventory";
                    } catch (e) {}`
);

fs.writeFileSync("js/Actionable.js", a);
try { new Function(a); console.log("Act OK", a.length); } catch (e) { console.log("Act FAIL", e.message); }

// BufferTap: always empty discovered when z-ram scope live (check probe via fresh collect)
let bt = fs.readFileSync("js/BufferTapProvider.js", "utf8");
if (!bt.includes("HARD_EMPTY_ON_ZRAM")) {
  bt = bt.replace(
    "/* STRUCTURAL_HARD_DEMOTE */",
    `/* STRUCTURAL_HARD_DEMOTE HARD_EMPTY_ON_ZRAM */
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.collect) {
                var zc = ZRamProvider.collect();
                if (zc && zc.probe && zc.probe.status === "z-ram-live" && (zc.probe.scopeCount || 0) > 0) {
                    return { sources: [{ name: "buffer-tap", confidence: 0.01 }], discoveredObjects: [], roomName: "", confidence: 0.01 };
                }
            }
        } catch (e0) {}
`
  );
  fs.writeFileSync("js/BufferTapProvider.js", bt);
}
try { new Function(fs.readFileSync("js/BufferTapProvider.js","utf8")); console.log("BT OK"); } catch (e) { console.log("BT FAIL", e.message); }

// Soft scenery: if attr byte2 has 0x40 (common I7 scenery-ish), takeable false
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
zr = zr.replace(
  "if (a.scenery) a.takeable = false;",
  `if (obj.attrBytes && (obj.attrBytes[2] & 0x40)) { a.scenery = true; a.takeable = false; a.enterable = false; }
        if (a.scenery) a.takeable = false;
        if (/wall|sky|rain|floor|ceiling|ground/.test(name)) { a.takeable = false; a.scenery = true; a.enterable = false; }`
);
fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR OK"); } catch (e) { console.log("ZR FAIL", e.message); }
