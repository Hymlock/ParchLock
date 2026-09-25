const fs = require("fs");
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
tu = tu.replace(
  `try {
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = payload.roomName;
            }
            }
        } catch (e) {}`,
  `try {
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = payload.roomName;
            }
        } catch (e) {}`
);
// Also fix if applyDiscovered uses payload vs p
if (tu.includes("if (!p || typeof Actionable") && tu.includes("applyDiscovered: (payload)")) {
  tu = tu.replace(
    "applyDiscovered: (payload) => {\n        /* APPLY_ROOM_FROM_RAM SYNC_CURRENT_ROOM */\n        try {\n            if (payload && payload.roomName && typeof ParchLockMap !== \"undefined\") {\n                ParchLockMap.CurrentRoom = payload.roomName;\n            }\n        } catch (e) {}\n\n        if (!p || typeof Actionable === \"undefined\") return;",
    `applyDiscovered: (payload) => {
        /* APPLY_ROOM_FROM_RAM SYNC_CURRENT_ROOM */
        var p = payload;
        try {
            if (p && p.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = p.roomName;
            }
        } catch (e) {}

        if (!p || typeof Actionable === "undefined") return;`
  );
}
fs.writeFileSync("js/TranslatorUI.js", tu);
try { new Function(tu); console.log("TU OK", tu.length); } catch (e) { console.log("FAIL", e.message); }
