const fs = require("fs");
let t = fs.readFileSync("js/RemGlkTapProvider.js", "utf8");
t = t.replace(
  /scanDomSpecials:[\s\S]*?return special;\s*\},/,
  `scanDomSpecials: () => {
        var special = [];
        try {
            var text = (document.body && document.body.innerText || "").toLowerCase().replace(/\\s+/g, " ");
            if (/restore a saved game|restore \\?/.test(text)) special.push({ label: "restore", command: "restore" });
            if (/do you wish to continue|would you like to continue|would you like to restore/.test(text)) {
                if (/continue/.test(text)) {
                    special.push({ label: "yes", command: "yes" });
                    special.push({ label: "no", command: "no" });
                }
                if (/restore/.test(text) && !special.some(function (s) { return s.command === "restore"; })) {
                    special.push({ label: "restore", command: "restore" });
                    special.push({ label: "no", command: "no" });
                }
            }
            if (/\\byes\\b.*\\bno\\b|\\by\\/n\\b/.test(text) && special.length === 0) {
                special.push({ label: "yes", command: "yes" });
                special.push({ label: "no", command: "no" });
            }
        } catch (e) {}
        return special;
    },`
);
fs.writeFileSync("js/RemGlkTapProvider.js", t);
try { new Function(t); console.log("ok"); } catch (e) { console.log(e.message); }

// Ensure WorldModel merges object-shaped specialCommands
let wm = fs.readFileSync("js/WorldModel.js", "utf8");
if (wm.indexOf("specialCommands") >= 0) console.log("wm has specialCommands merge");
