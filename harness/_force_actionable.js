const fs = require("fs");
let a = fs.readFileSync("js/Actionable.js", "utf8");

// Force Refresh to tick WorldModel/BufferTap before marking
if (a.indexOf("WorldModel.tick()") < 0 || a.indexOf("DeterministicNouns") >= 0) {
  // Ensure Refresh starts by syncing Translator
  if (a.indexOf("Force Translator sync before marks") < 0) {
    a = a.replace(
      "Refresh: () => {",
      `Refresh: () => {
        // Force Translator sync before marks ? actionable words must come from WorldModel
        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
            if (typeof TranslatorUI !== "undefined" && TranslatorUI.apply && WorldModel && WorldModel.lastPayload) {
                TranslatorUI.applyDiscovered(WorldModel.lastPayload);
            }
        } catch (e) {}
`
    );
  }
  fs.writeFileSync("js/Actionable.js", a);
}

// Make DeterministicNouns authoritative: include payload objects even if TextGate lags
a = fs.readFileSync("js/Actionable.js", "utf8");
if (a.indexOf("payload objects win") < 0) {
  a = a.replace(
    /DeterministicNouns: \(\) => \{[\s\S]*?return Array\.from\(new Set\(out\.filter\(Boolean\)\)\);\s*\},/,
    `DeterministicNouns: () => {
        // payload objects win ? these are the only words that may be marked actionable
        var out = [];
        try {
            var p = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) ? WorldModel.lastPayload : null;
            if (p) {
                (p.discoveredObjects || []).forEach(function (o) {
                    var n = (o && o.name) ? String(o.name).toLowerCase() : "";
                    if (n) out.push(n);
                });
                (p.inventory || []).forEach(function (o) {
                    var n = typeof o === "string" ? o : (o && o.name) || "";
                    n = String(n).toLowerCase();
                    if (n) out.push(n);
                });
                (p.exits || []).forEach(function (e) {
                    var n = String((e && (e.label || e.dir)) || "").toLowerCase();
                    if (n) out.push(n);
                });
            }
            if (Actionable.Scope) {
                (Actionable.Scope.inventoryNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
            }
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.GetRoom) {
                var room = ParchLockMap.GetRoom(ParchLockMap.CurrentRoom);
                if (room && room.Exits) Object.keys(room.Exits).forEach(function (d) {
                    if (room.Exits[d] !== null && room.Exits[d] !== undefined) out.push(String(d).toLowerCase());
                });
            }
            (Actionable.Directions || []).filter(function (d) { return d && d.length > 2; }).forEach(function (d) { out.push(d); });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },`
  );
  fs.writeFileSync("js/Actionable.js", a);
}
try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Actionable OK"); }
catch (e) { console.log("Actionable FAIL", e.message); }

// Bump BUILD 45 stays or 46
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 45");
fs.writeFileSync("js/Consts.js", c);
