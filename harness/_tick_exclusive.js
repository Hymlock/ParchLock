const fs = require("fs");
let wm = fs.readFileSync("js/WorldModel.js", "utf8");

// Make collectProviders return factsList; tick calls preferStructuralPayload
if (!wm.includes("factsList:")) {
  // Find collectProviders return
  wm = wm.replace(
    /collectProviders:\s*\(\)\s*=>\s*\{/,
    `collectProviders: () => {
        var factsList = [];`
  );
  // After each provider collect, push to factsList - look for typical pattern
}

// Simpler robust fix: in tick, after merge, exclusive-filter when z-ram-live
if (!wm.includes("TICK_EXCLUSIVE_ZRAM")) {
  wm = wm.replace(
    "WorldModel.lastPayload = payload;",
    `/* TICK_EXCLUSIVE_ZRAM */
        try {
            var zFact = null;
            (WorldModel.providers || []).forEach(function (prov) {
                if (!prov || prov.name !== "z-ram" || typeof prov.collect !== "function") return;
                try { zFact = prov.collect(); } catch (e1) {}
            });
            if (!zFact && typeof ZRamProvider !== "undefined" && ZRamProvider.collect) {
                try { zFact = ZRamProvider.collect(); } catch (e2) {}
            }
            if (zFact && zFact.probe && zFact.probe.status === "z-ram-live" && (zFact.probe.scopeCount || 0) > 0) {
                payload.probe = zFact.probe;
                payload.roomId = zFact.roomId;
                payload.roomName = zFact.roomName || payload.roomName;
                payload.discoveredObjects = (zFact.discoveredObjects || []).filter(function (o) {
                    return o && o.id != null && o.name;
                });
                if (zFact.inventory && zFact.inventory.length) payload.inventory = zFact.inventory;
                if (zFact.exits && zFact.exits.length) payload.exits = zFact.exits;
                payload.engineMode = "structural";
                payload.vmType = "z";
                var hasZ = (payload.sources || []).some(function (s) { return s.name === "z-ram"; });
                if (!hasZ) payload.sources = (payload.sources || []).concat([{ name: "z-ram", confidence: zFact.confidence || 0.95 }]);
            }
        } catch (eTick) {}
        WorldModel.lastPayload = payload;`
  );
  fs.writeFileSync("js/WorldModel.js", wm);
}
try { new Function(fs.readFileSync("js/WorldModel.js","utf8")); console.log("WM OK"); } catch (e) { console.log("WM FAIL", e.message); }

// Ensure Map.CurrentRoom updates from roomName in TranslatorUI
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (!tu.includes("CurrentRoom =") && tu.includes("applyDiscovered")) {
  // soft
}
if (tu.includes("apply:") || tu.includes("applyDiscovered")) {
  if (!tu.includes("APPLY_ROOM_FROM_RAM")) {
    tu = tu.replace(
      /applyDiscovered:\s*\([^)]*\)\s*=>\s*\{/,
      `applyDiscovered: (payload) => {
        /* APPLY_ROOM_FROM_RAM */
        try {
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                if (!ParchLockMap.CurrentRoom || /alley/i.test(payload.roomName)) {
                    ParchLockMap.CurrentRoom = payload.roomName;
                }
            }
        } catch (e) {}
`
    );
    fs.writeFileSync("js/TranslatorUI.js", tu);
  }
}
try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU OK"); } catch (e) { console.log("TU", e.message); }
