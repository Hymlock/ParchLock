const fs = require("fs");

// Patch ParchLock.Loop to call TranslatorUI + TextGate + save/undo resync
let p = fs.readFileSync("js/ParchLock.js", "utf8");
if (p.indexOf("TranslatorUI.tick") < 0) {
  p = p.replace(
    /if \(typeof WorldModel !== "undefined"\) WorldModel\.tick\(\);/,
    'if (typeof WorldModel !== "undefined") WorldModel.tick();\n\t\tif (typeof TranslatorUI !== "undefined") TranslatorUI.tick();\n\t\tif (typeof TextGate !== "undefined" && typeof $ !== "undefined") { try { TextGate.noteText($("#windowport").text()); } catch (e) {} }'
  );
  // also early init
  p = p.replace(
    /if \(typeof WorldModel !== "undefined"\) WorldModel\.tick\(\); \/\/ init-payload/,
    'if (typeof WorldModel !== "undefined") WorldModel.tick(); // init-payload\n\t\tif (typeof TranslatorUI !== "undefined") TranslatorUI.tick();\n\t\tif (typeof MapIdentity !== "undefined") MapIdentity.migrateAll();'
  );
  fs.writeFileSync("js/ParchLock.js", p);
  console.log("ParchLock patched");
} else console.log("ParchLock already patched");

// Patch Actionable.RenderInventory for nested tree
let a = fs.readFileSync("js/Actionable.js", "utf8");
if (a.indexOf("_inventoryTree") < 0 || a.indexOf("pl-inv-nested") < 0) {
  a = a.replace(
    /RenderInventory:\s*\(\)\s*=>\s*\{[\s\S]*?Scope\.inventoryNouns\.forEach\(noun => \{/,
    `RenderInventory: () => {
        $("#inventory-items").empty();
        var tree = Actionable.Scope._inventoryTree;
        var nouns = Actionable.Scope.inventoryNouns || [];
        $("#items-count").text(nouns.length);
        $("#inventory-response").text(Actionable.Scope.lastInventoryText || "No inventory response recorded.");
        if (tree && tree.length) {
            tree.forEach(function (item) {
                var row = $("<div>").addClass("pl-inv-nested").css("padding-left", (item.depth || 0) * 12 + "px");
                var label = item.name;
                $("<button>").text(label).attr("title", "Examine " + label).appendTo(row).on("click", function () {
                    Actionable.Submit("examine " + label);
                });
                if (typeof ActionSynth !== "undefined") {
                    ActionSynth.commandsForObject({ name: label, attrs: item.attrs || {} }).slice(0, 4).forEach(function (c) {
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
        Actionable.Scope.inventoryNouns.forEach(noun => {`
  );
  fs.writeFileSync("js/Actionable.js", a);
  console.log("Actionable patched", a.indexOf("pl-inv-nested") >= 0);
} else console.log("Actionable already nested");

// Register TextGate after WorldModel exists
let tg = fs.readFileSync("js/TextGate.js", "utf8");
if (tg.indexOf("setTimeout") < 0) {
  tg += "\ntry { setTimeout(function () { if (typeof WorldModel !== 'undefined' && WorldModel.registerProvider) WorldModel.registerProvider({ name: 'text-gate', collect: TextGate.collect }); }, 0); } catch (e) {}\n";
  fs.writeFileSync("js/TextGate.js", tg);
  console.log("TextGate late-register");
}

// Save/undo resync hook in Actionable.Submit
if (a.indexOf("pl-resync") < 0) {
  a = fs.readFileSync("js/Actionable.js", "utf8");
  a = a.replace(
    /Submit:\s*\(command\)\s*=>\s*\{/,
    `Submit: (command) => {
        try {
            if (/^(undo|restore|restart)$/i.test(String(command || "").trim())) {
                window.__PL_RESYNC__ = Date.now();
                if (typeof TextGate !== "undefined" && /^(restore|restart)$/i.test(String(command).trim())) TextGate.reset();
                if (typeof TranslatorUI !== "undefined") TranslatorUI.lastSig = "";
            }
        } catch (e) {}
`
  );
  fs.writeFileSync("js/Actionable.js", a);
  console.log("Submit resync hook");
}
