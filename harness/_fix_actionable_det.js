const fs = require("fs");

// Deterministic Actionable.Refresh: only mark Translator/WorldModel nouns + mapped exits + inventory
let a = fs.readFileSync("js/Actionable.js", "utf8");
if (a.indexOf("DeterministicNouns") < 0) {
  a = a.replace(
    "Candidates: (text, inventory) => {",
    `DeterministicNouns: () => {
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
            if (typeof Actionable !== "undefined" && Actionable.Scope) {
                (Actionable.Scope.inventoryNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
                // Keep previously confirmed room nouns from Translator merges only
                (Actionable.Scope.roomNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
            }
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.GetRoom) {
                var room = ParchLockMap.GetRoom(ParchLockMap.CurrentRoom);
                if (room && room.Exits) Object.keys(room.Exits).forEach(function (d) { out.push(String(d).toLowerCase()); });
            }
            (Actionable.Directions || []).forEach(function (d) { if (d && d.length > 1) out.push(d); });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },

    Candidates: (text, inventory) => {`
  );

  // In Refresh, replace free Candidates usage for marking with DeterministicNouns
  // Keep Candidates for inventory text parsing fallback when inventory command returns text
  a = a.replace(
    "var nouns = Actionable.Candidates(inventory ? inventoryText : text, inventory);",
    `var nouns = Actionable.DeterministicNouns();
        // Inventory replies may introduce held nouns before Translator merges them
        if (inventory) {
            Actionable.Candidates(inventoryText, true).forEach(function (n) { if (nouns.indexOf(n) < 0) nouns.push(n); });
        }
        // If Translator has not produced any nouns yet, do not fall back to noisy whole-buffer mining
        if (!nouns.length) {
            Actionable.LiveMarks = [];
            return;
        }`
  );

  // When refreshing roomNouns from look text, prefer intersection with deterministic set rather than expanding freely
  a = a.replace(
    "scope.roomNouns = Array.from(new Set(Actionable.Candidates(scope.lastLookText, false).concat(scope.roomNouns))).slice(0, 60);",
    `var lookNouns = Actionable.Candidates(scope.lastLookText, false).filter(function (n) {
                return Actionable.DeterministicNouns().indexOf(n) >= 0 || (Actionable.Directions || []).indexOf(n) >= 0;
            });
            // Seed room nouns from look only for direction words until Translator fills objects
            scope.roomNouns = Array.from(new Set(lookNouns.concat(scope.roomNouns).concat(Actionable.DeterministicNouns()))).slice(0, 60);`
  );

  fs.writeFileSync("js/Actionable.js", a);
  try { new Function(a); console.log("Actionable deterministic OK"); }
  catch (e) { console.log("Actionable FAIL", e.message); }
} else console.log("Actionable already deterministic");

// MapIdentity: do not write null into Exits (poison pathfinding keys)
let mi = fs.readFileSync("js/MapIdentity.js", "utf8");
if (mi.indexOf("ExitMeta") >= 0 && mi.indexOf("room.Exits[dir] = null") >= 0) {
  mi = mi.replace(
    "if (room.Exits[dir] === undefined) room.Exits[dir] = null;",
    `// Do not insert null exit targets ? Navigator treats missing edges as unknown.
            room.ExitMeta = room.ExitMeta || {};
            if (room.Exits[dir] === undefined) {
                room.ExitMeta[dir] = Object.assign({}, room.ExitMeta[dir] || {}, { hinted: true });
            }`
  );
  fs.writeFileSync("js/MapIdentity.js", mi);
  console.log("MapIdentity null-exits removed");
}
