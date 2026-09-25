const fs = require("fs");
let a = fs.readFileSync("js/Actionable.js", "utf8");
if (!a.includes("UNDO_RESTORE_RESYNC") && a.includes("Submit:")) {
  a = a.replace(
    /Submit:\s*\(([^)]*)\)\s*=>\s*\{/,
    `Submit: ($1) => {
        /* UNDO_RESTORE_RESYNC */`
  );
  // After inject, if command is undo/restore/restart, force ZRam + map resync
  if (a.includes("Input.Inject") || a.includes("Inject(")) {
    // find Submit body end-ish - add before closing of Submit by wrapping inject area
  }
  // Simpler: patch after common inject pattern inside Submit
  const marker = "/* UNDO_RESTORE_RESYNC */";
  if (a.includes(marker) && !a.includes("forceRamResync")) {
    a = a.replace(
      marker,
      `/* UNDO_RESTORE_RESYNC */
        var forceRamResync = /^(undo|restore|restart|load)\\b/i.test(String(arguments[0] || ""));
`
    );
    // Before return of Submit, if forceRamResync, tick worldmodel
    a = a.replace(
      /Submit:\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\n\s*\},/,
      (block) => {
        if (block.includes("forceRamResync &&")) return block;
        return block.replace(
          /\n\s*\},$/,
          `\n        if (forceRamResync) {\n            try {\n                setTimeout(function () {\n                    if (window.ZvmCapture) ZvmCapture.tick();\n                    if (window.WorldModel) WorldModel.tick();\n                    if (window.Actionable) Actionable.Refresh();\n                    if (window.ParchLockMap && ParchLockMap.Draw) ParchLockMap.Draw();\n                }, 200);\n            } catch (eR) {}\n        }\n    },`
        );
      }
    );
  }
  fs.writeFileSync("js/Actionable.js", a);
}
try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Act OK"); } catch (e) { console.log("Act FAIL", e.message); }

// GrammarProvider: enrich ActionSynth with verbs from dictionary presence (light) ? already stubbed
console.log("grammar", fs.existsSync("js/GrammarProvider.js"));
