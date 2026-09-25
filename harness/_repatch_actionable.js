const fs = require("fs");
let a = fs.readFileSync("js/Actionable.js", "utf8");

// 1) Add DeterministicNouns before Candidates if missing
if (!a.includes("DeterministicNouns")) {
  a = a.replace("Candidates: (text, inventory) => {",
`DeterministicNouns: () => {
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
            if (p) {
                (p.discoveredObjects || []).forEach(function (o) { if (o && o.name) out.push(String(o.name).toLowerCase()); });
                (p.inventory || []).forEach(function (o) {
                    var n = typeof o === "string" ? o : (o && o.name) || "";
                    if (n) out.push(String(n).toLowerCase());
                });
            }
            if (Actionable.Scope) (Actionable.Scope.inventoryNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
            (Actionable.Directions || []).filter(function (d) { return d && d.length > 2; }).forEach(function (d) { out.push(d); });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },

    Candidates: (text, inventory) => {`);
}

// 2) Patch Init for left/right click with objectId
a = a.replace(
  /Init:\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\n\s*Submit:/,
  `Init: () => {
        $(document).off("click.pmAct contextmenu.pmAct");
        $(document).on("click.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var noun = this.dataset.noun;
            var kind = this.dataset.kind || "object";
            var oid = this.dataset.objectId || null;
            if (kind === "direction") Actionable.Submit(noun);
            else {
                var primary = "examine " + noun;
                try {
                    if (typeof ActionSynth !== "undefined" && oid) {
                        var cmds = ActionSynth.commandsForPayloadObjectId(oid, kind === "inventory" ? "inventory" : "room");
                        if (cmds && cmds.length) primary = cmds[0].command;
                    }
                } catch (err) {}
                Actionable.Submit(primary);
            }
        }).on("contextmenu.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            Actionable.Open(this.dataset.noun, this.dataset.kind || "object", e.clientX, e.clientY, this.dataset.objectId || null);
        });
    },

    Submit:`
);

// 3) Replace Open to accept objectId and use ActionSynth (keep rest of file)
a = a.replace(
  /Open:\s*\(noun, kind, x, y\)\s*=>\s*\{[\s\S]*?ParchLockQol\.OpenRadial\(x, y, slices, context\);\s*\},/,
  `Open: (noun, kind, x, y, objectId) => {
        var context = { source: "text", noun: noun, kind: kind, objectId: objectId || null };
        var contextKind = kind === "inventory" ? "inventory" : (kind === "direction" ? "direction" : "room");
        var obj = null;
        try {
            var p = WorldModel && WorldModel.lastPayload;
            if (p) {
                var pool = (p.discoveredObjects || []).concat(p.inventory || []);
                if (objectId) obj = pool.find(function (o) { return o && String(o.id) === String(objectId); });
                if (!obj) obj = pool.find(function (o) { return (o.name || "").toLowerCase() === String(noun).toLowerCase(); });
            }
        } catch (e) {}
        var cmds = [];
        if (kind === "direction") {
            cmds = [{ verb: "go", command: noun }];
        } else if (typeof ActionSynth !== "undefined") {
            cmds = ActionSynth.commandsForObject(obj || { name: noun, id: objectId || null, attrs: {}, confidence: 0.3 }, contextKind);
        } else {
            cmds = [{ verb: "examine", command: "examine " + noun }];
        }
        var slices = cmds.map(function (c) {
            return {
                Label: (c.verb || c.command).charAt(0).toUpperCase() + (c.verb || c.command).slice(1),
                Command: c.command,
                Enter: true,
                Action: function () { Actionable.Submit(c.command); }
            };
        });
        if (kind === "direction") {
            slices = [{ Label: "Go " + noun, Command: noun, Enter: true, Action: function () { Actionable.Submit(noun); } }];
        }
        ParchLockQol.OpenRadial(x, y, slices, context);
    },`
);

// 4) Refresh: force WorldModel.tick first; use DeterministicNouns; set data-object-id
if (!a.includes("Force Translator sync before marks")) {
  a = a.replace("Refresh: () => {", `Refresh: () => {
        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
        } catch (e) {}
`);
}

if (a.includes("var nouns = Actionable.Candidates") && !a.includes("var nouns = Actionable.DeterministicNouns")) {
  a = a.replace(
    "var nouns = Actionable.Candidates(inventory ? inventoryText : text, inventory);",
    `var nouns = Actionable.DeterministicNouns();
        if (inventory) {
            Actionable.Candidates(inventoryText, true).forEach(function (n) { if (nouns.indexOf(n) < 0) nouns.push(n); });
        }
        if (!nouns.length) { Actionable.LiveMarks = []; return; }`
  );
}

if (!a.includes("dataset.objectId")) {
  a = a.replace(
    'mark.className = "pl-act"; mark.dataset.noun = noun;',
    `mark.className = "pl-act"; mark.dataset.noun = noun;
                    try {
                        var pobj = (WorldModel && WorldModel.lastPayload && (WorldModel.lastPayload.discoveredObjects || []).concat(WorldModel.lastPayload.inventory || []) || []).find(function (o) {
                            var nm = (o.name || "").toLowerCase();
                            return nm === noun || nm.split(/\\s+/).indexOf(noun) >= 0;
                        });
                        if (pobj && pobj.id) mark.dataset.objectId = String(pobj.id);
                        if (kind === "inventory" || (Actionable.Scope.inventoryNouns || []).indexOf(noun) >= 0) mark.dataset.kind = "inventory";
                    } catch (e) {}`
  );
}

fs.writeFileSync("js/Actionable.js", a);
try {
  new Function(a);
  console.log("OK len", a.length, "Submit", a.includes("Submit:"), "Refresh", a.includes("Refresh:"), "Open", a.includes("objectId"));
} catch (e) {
  console.log("FAIL", e.message);
  fs.copyFileSync("js/Actionable.js.bak13020", "js/Actionable.js");
}
