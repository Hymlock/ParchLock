const fs = require("fs");
let t = fs.readFileSync("js/WorldModel.js", "utf8");
if (t.indexOf("darkness") >= 0 && t.indexOf("facts.darkness") < 0) {
  // In collectProviders / merge loop ? find where hudMetrics merged and add darkness
  if (t.indexOf("merged.darkness") < 0) {
    t = t.replace(
      /if \(facts\.hudMetrics[\s\S]*?\n/,
      (m) => m + "            if (typeof facts.darkness === \"boolean\") merged.darkness = facts.darkness;\n            if (typeof facts.nativeGraphicsActive === \"boolean\") merged.nativeGraphicsActive = facts.nativeGraphicsActive;\n            if (facts.glkBounds) merged.glkBounds = facts.glkBounds;\n"
    );
    // fallback: append merge in tick after collectProviders
    if (t.indexOf("merged.darkness") < 0) {
      t = t.replace(
        "WorldModel.lastPayload = merged;",
        `if (WorldModel._providerFacts) {
            WorldModel._providerFacts.forEach(function (facts) {
                if (facts && typeof facts.darkness === "boolean") merged.darkness = facts.darkness;
                if (facts && typeof facts.nativeGraphicsActive === "boolean") merged.nativeGraphicsActive = facts.nativeGraphicsActive;
                if (facts && facts.glkBounds) merged.glkBounds = facts.glkBounds;
            });
        }
        WorldModel.lastPayload = merged;`
      );
    }
  }
}
// Simpler: patch collectProviders to stash facts
if (t.indexOf("_providerFacts") < 0) {
  t = t.replace(
    "collectProviders: () => {",
    `collectProviders: () => {
        WorldModel._providerFacts = [];`
  );
  // After each provider collect, push
  t = t.replace(
    /var facts = provider\.collect\(\);/g,
    "var facts = provider.collect();\n            try { WorldModel._providerFacts.push(facts); } catch (e) {}"
  );
  t = t.replace(
    "WorldModel.lastPayload = merged;",
    `try {
            (WorldModel._providerFacts || []).forEach(function (facts) {
                if (!facts) return;
                if (typeof facts.darkness === "boolean") merged.darkness = facts.darkness;
                if (typeof facts.nativeGraphicsActive === "boolean") merged.nativeGraphicsActive = facts.nativeGraphicsActive;
                if (facts.glkBounds) merged.glkBounds = facts.glkBounds;
            });
        } catch (e) {}
        WorldModel.lastPayload = merged;`
  );
}
fs.writeFileSync("js/WorldModel.js", t);
try { new Function(t); console.log("WorldModel OK"); } catch (e) { console.log("WM FAIL", e.message); }
