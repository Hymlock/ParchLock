const fs = require("fs");

// 1) play.html: ZvmCapture before main.js; ZRam* before WorldModel
let html = fs.readFileSync("play.html", "utf8");
if (!html.includes("ZvmCapture.js")) {
  html = html.replace(
    '<script src="lib/main.js"></script>',
    '<script src="js/ZvmCapture.js"></script>\n\t\t<script src="lib/main.js"></script>'
  );
}
["js/ZRamReader.js", "js/ZRamProvider.js"].forEach(src => {
  if (html.includes(src)) return;
  html = html.replace(
    '<script src="js/WorldModel.js"></script>',
    '<script src="' + src + '"></script>\n\t\t<script src="js/WorldModel.js"></script>'
  );
});
fs.writeFileSync("play.html", html);
console.log("play.html wired", html.includes("ZvmCapture.js"), html.includes("ZRamProvider.js"));

// 2) WorldModel: when merging discoveredObjects, if any provider has confidence>=0.8 structural, replace rather than union with low-conf text
let wm = fs.readFileSync("js/WorldModel.js", "utf8");
if (!wm.includes("structuralReplace")) {
  // Patch collectProviders merge logic - find discoveredObjects merge
  if (wm.includes("discoveredObjects")) {
    wm = wm.replace(
      /discoveredObjects[\s\S]{0,200}/,
      (m) => m
    );
  }
  // Add helper and use in tick after collectProviders
  if (!wm.includes("preferStructuralPayload")) {
    wm = wm.replace(
      "tick: () => {",
      `preferStructuralPayload: (merged, factsList) => {
        var structural = null;
        (factsList || []).forEach(function (f) {
            if (!f || !f.sources) return;
            var isZ = (f.sources || []).some(function (s) { return s.name === "z-ram" && s.confidence >= 0.5; });
            if (isZ) structural = f;
        });
        if (!structural) return merged;
        // structuralReplace: P2 wins these fields
        if (structural.roomId) merged.roomId = structural.roomId;
        if (structural.roomName) {
            merged.roomName = structural.roomName;
            merged.roomConfidence = Math.max(merged.roomConfidence || 0, structural.roomConfidence || 0.9);
        }
        if (structural.discoveredObjects && structural.discoveredObjects.length) {
            merged.discoveredObjects = structural.discoveredObjects.slice();
        }
        if (structural.inventory && structural.inventory.length) {
            merged.inventory = structural.inventory.slice();
        }
        if (structural.exits && structural.exits.length) {
            merged.exits = structural.exits.slice();
        }
        merged.engineMode = structural.engineMode || "structural";
        merged.vmType = structural.vmType || merged.vmType;
        return merged;
    },

    tick: () => {`
    );
    wm = wm.replace(
      "WorldModel.lastPayload = merged;",
      "merged = WorldModel.preferStructuralPayload(merged, WorldModel._providerFacts || []);\n        WorldModel.lastPayload = merged;"
    );
  }
  fs.writeFileSync("js/WorldModel.js", wm);
  try { new Function(wm); console.log("WorldModel OK"); } catch (e) { console.log("WM FAIL", e.message); }
}

// 3) BufferTap: collapse confidence when z-ram live
let bt = fs.readFileSync("js/BufferTapProvider.js", "utf8");
if (!bt.includes("z-ram-live-demote")) {
  bt = bt.replace(
    "collect: () => {",
    `collect: () => {
        // z-ram-live-demote: do not compete with structural provider
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.last && ZRamProvider.last.ok && ZRamProvider.last.roomId) {
                return { sources: [{ name: "buffer-tap", confidence: 0.01 }], discoveredObjects: [] };
            }
        } catch (e) {}
`
  );
  fs.writeFileSync("js/BufferTapProvider.js", bt);
  console.log("BufferTap demoted");
}

// 4) Actionable: mark with data-object-id from payload; prefer objects with ids
let act = fs.readFileSync("js/Actionable.js", "utf8");
if (!act.includes("data-object-id")) {
  act = act.replace(
    'mark.className = "pl-act"; mark.dataset.noun = noun;',
    `mark.className = "pl-act"; mark.dataset.noun = noun;
                    try {
                        var pobj = (WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects || []).find(function (o) {
                            return (o.name || "").toLowerCase() === noun || ((o.name || "").toLowerCase().split(/\\s+/).indexOf(noun) >= 0);
                        });
                        if (pobj && pobj.id) mark.dataset.objectId = String(pobj.id);
                        if (pobj && pobj.dictAddr) mark.dataset.dictAddr = String(pobj.dictAddr);
                    } catch (e) {}`
  );
  fs.writeFileSync("js/Actionable.js", act);
  try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Actionable OK"); } catch (e) { console.log("Act FAIL", e.message); }
}

// DeterministicNouns: when z-ram objects exist, ONLY use those names (and directions/inventory)
if (!act.includes("z-ram-only-nouns")) {
  act = fs.readFileSync("js/Actionable.js", "utf8");
  act = act.replace(
    "DeterministicNouns: () => {\n        // payload objects win ? these are the only words that may be marked actionable\n        var out = [];",
    `DeterministicNouns: () => {
        // z-ram-only-nouns when structural snapshot present
        var out = [];
        try {
            var p = WorldModel && WorldModel.lastPayload;
            var structural = p && p.probe && p.probe.status === "z-ram-live";
            if (structural && p.discoveredObjects && p.discoveredObjects.length) {
                p.discoveredObjects.forEach(function (o) {
                    var n = (o.name || "").toLowerCase();
                    if (!n) return;
                    out.push(n);
                    n.split(/\\s+/).forEach(function (t) { if (t.length > 2) out.push(t); });
                });
                (p.inventory || []).forEach(function (o) {
                    var n = (typeof o === "string" ? o : (o && o.name) || "").toLowerCase();
                    if (n) out.push(n);
                });
                (Actionable.Directions || []).filter(function (d) { return d && d.length > 2; }).forEach(function (d) { out.push(d); });
                return Array.from(new Set(out.filter(Boolean)));
            }
        } catch (e) {}
`
  );
  fs.writeFileSync("js/Actionable.js", act);
  try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Actionable nouns OK"); } catch (e) { console.log("Act2 FAIL", e.message); }
}
