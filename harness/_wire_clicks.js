const fs = require("fs");

// ActionSynth: remove guessy verb padding; examine-only unless attrs say otherwise
fs.writeFileSync("js/ActionSynth.js", `var ActionSynth = {
    profile: "inform6-lite+ram",
    rules: {
        takeable: ["take", "drop"],
        openable: ["open", "close"],
        lockable: ["lock", "unlock"],
        enterable: ["enter", "exit"],
        switchable: ["switch on", "switch off"],
        edible: ["eat"],
        wearable: ["wear", "remove"],
        container: ["search", "empty", "open", "close"],
        door: ["open", "close"],
        supporter: ["search"],
        default: ["examine"]
    },

    verbsForAttrs: (attrs) => {
        var verbs = ["examine"];
        var a = attrs || {};
        Object.keys(ActionSynth.rules).forEach(function (key) {
            if (key === "default") return;
            if (a[key]) {
                ActionSynth.rules[key].forEach(function (v) {
                    if (verbs.indexOf(v) < 0) verbs.push(v);
                });
            }
        });
        return verbs;
    },

    commandsForObject: (obj, context) => {
        if (!obj || !obj.name) return [];
        var name = String(obj.name);
        var attrs = obj.attrs || {};
        // Inventory context: prefer drop/wear over take
        if (context === "inventory") {
            attrs = Object.assign({}, attrs, { takeable: false });
            if (attrs.wearable) attrs.wearable = true;
        }
        if (context === "room" && attrs.takeable !== false) attrs.takeable = attrs.takeable !== false;
        return ActionSynth.verbsForAttrs(attrs).map(function (v) {
            var cmd = v === "examine" ? ("examine " + name) : (v + " " + name);
            if (v === "talk to") cmd = "talk to " + name;
            return {
                verb: v,
                noun: name,
                objectId: obj.id || null,
                command: cmd,
                confidence: obj.confidence || 0.8
            };
        });
    },

    commandsForPayloadObjectId: (objectId, context) => {
        try {
            var p = WorldModel && WorldModel.lastPayload;
            if (!p) return [];
            var obj = (p.discoveredObjects || []).concat(p.inventory || []).find(function (o) {
                return o && String(o.id) === String(objectId);
            });
            if (!obj) return [];
            return ActionSynth.commandsForObject(obj, context);
        } catch (e) { return []; }
    }
};
`);

// Patch Actionable Open + click handlers to be RAM/ActionSynth driven
let a = fs.readFileSync("js/Actionable.js", "utf8");

// Replace Open function body start through slices building
a = a.replace(
  /Open: \(noun, kind, x, y\) => \{[\s\S]*?var slices = verbs\.map\(verb => \(\{ Label: verb\[0\]\.toUpperCase\(\) \+ verb\.slice\(1\), Command: verb \+ " " \+ noun, Enter: true, Action: \(\) => Actionable\.Submit\(verb \+ " " \+ noun\) \}\)\);/,
  `Open: (noun, kind, x, y, objectId) => {
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
            cmds = [{ verb: noun, noun: noun, command: noun, objectId: null, confidence: 0.9 }];
        } else if (typeof ActionSynth !== "undefined") {
            cmds = ActionSynth.commandsForObject(obj || { name: noun, id: objectId || null, attrs: { takeable: true }, confidence: 0.4 }, contextKind);
        } else {
            cmds = [{ verb: "examine", noun: noun, command: "examine " + noun, objectId: objectId || null }];
        }
        var slices = cmds.map(function (c) {
            return {
                Label: c.verb.charAt(0).toUpperCase() + c.verb.slice(1),
                Command: c.command,
                Enter: true,
                Action: function () { Actionable.Submit(c.command); }
            };
        });`
);

// Fix Init click handlers to pass objectId and left=primary examine, right=Open radial
a = a.replace(
  /Init: \(\) => \{[\s\S]*?Open: \(noun/,
  `Init: () => {
        $(document).off("click.pmAct contextmenu.pmAct pointerdown.pmAct");
        $(document).on("click.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var noun = this.dataset.noun;
            var kind = this.dataset.kind || "object";
            var oid = this.dataset.objectId || null;
            if (kind === "direction") Actionable.Submit(noun);
            else {
                // Left-click: primary deterministic command (examine)
                var primary = "examine " + noun;
                try {
                    if (typeof ActionSynth !== "undefined" && oid) {
                        var cmds = ActionSynth.commandsForPayloadObjectId(oid, kind === "inventory" ? "inventory" : "room");
                        if (cmds && cmds[0]) primary = cmds[0].command;
                    }
                } catch (err) {}
                Actionable.Submit(primary);
            }
        }).on("contextmenu.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            Actionable.Open(this.dataset.noun, this.dataset.kind || "object", e.clientX, e.clientY, this.dataset.objectId || null);
        }).on("pointerdown.pmAct", ".pl-act:not(.is-stale)", function (e) {
            if (e.button === 2) return;
        });
    },

    Open: (noun`
);

fs.writeFileSync("js/Actionable.js", a);
try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Actionable OK"); }
catch (e) { console.log("Actionable FAIL", e.message); }

// Inventory buttons: left examine, right radial with object id
a = fs.readFileSync("js/Actionable.js", "utf8");
if (a.includes("pl-inv-nested") && !a.includes("data-object-id") || true) {
  // Ensure inventory tree buttons set object ids when rendering from Scope._inventoryTree / payload
  a = a.replace(
    /RenderInventory: \(\) => \{[\s\S]*?if \(tree && tree\.length\) \{[\s\S]*?tree\.forEach\(function \(item\) \{[\s\S]*?row\.appendTo\("#inventory-items"\);\s*\}\);\s*return;\s*\}/,
    `RenderInventory: () => {
        $("#inventory-items").empty();
        var tree = Actionable.Scope._inventoryTree;
        var nouns = Actionable.Scope.inventoryNouns || [];
        $("#items-count").text(nouns.length);
        $("#inventory-response").text(Actionable.Scope.lastInventoryText || "No inventory response recorded.");
        // Prefer RAM inventory from WorldModel when structural
        try {
            var p = WorldModel && WorldModel.lastPayload;
            if (p && p.probe && p.probe.status === "z-ram-live" && p.inventory && p.inventory.length) {
                p.inventory.forEach(function (item) {
                    var label = item.name || "";
                    var oid = item.id;
                    var row = $("<div>").addClass("pl-inv-nested");
                    var btn = $("<button>").text(label).attr("title", "Left: examine / Right: actions").attr("data-object-id", oid || "");
                    btn.on("click", function (e) { e.preventDefault(); Actionable.Submit("examine " + label); });
                    btn.on("contextmenu", function (e) { e.preventDefault(); Actionable.Open(label, "inventory", e.clientX, e.clientY, oid); });
                    btn.appendTo(row);
                    if (typeof ActionSynth !== "undefined") {
                        ActionSynth.commandsForObject(item, "inventory").slice(0, 6).forEach(function (c) {
                            if (c.verb === "examine") return;
                            $("<button>").addClass("pl-inv-verb").text(c.verb).attr("title", c.command).appendTo(row).on("click", function () {
                                Actionable.Submit(c.command);
                            });
                        });
                    }
                    row.appendTo("#inventory-items");
                });
                return;
            }
        } catch (e) {}
        if (tree && tree.length) {
            tree.forEach(function (item) {
                var row = $("<div>").addClass("pl-inv-nested").css("padding-left", (item.depth || 0) * 12 + "px");
                var label = item.name;
                $("<button>").text(label).attr("title", "Examine " + label).appendTo(row).on("click", function () {
                    Actionable.Submit("examine " + label);
                }).on("contextmenu", function (e) {
                    e.preventDefault();
                    Actionable.Open(label, "inventory", e.clientX, e.clientY, null);
                });
                row.appendTo("#inventory-items");
            });
            return;
        }`
  );
  fs.writeFileSync("js/Actionable.js", a);
  try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Inventory OK"); }
  catch (e) { console.log("Inv FAIL", e.message); }
}
