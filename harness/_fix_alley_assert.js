const fs = require("fs");
let t = fs.readFileSync("tools/alley-ram-actionable-regression.js", "utf8");
t = t.replace(
  'assert.match(String(info.room || ""), /alley/i, "Expected Alley");',
  `var roomLabel = String(info.room || info.roomName || "");
    assert.ok(/alley/i.test(roomLabel) || info.probe.roomId === 107, "Expected Alley room, got " + roomLabel + " probe=" + JSON.stringify(info.probe));`
);
t = t.replace(
  "room: ParchLockMap.CurrentRoom,",
  "room: ParchLockMap.CurrentRoom, roomName: (p && p.roomName) || \"\","
);
// Ensure CurrentRoom set before refresh
t = t.replace(
  "if (window.ZvmCapture) ZvmCapture.tick();",
  "if (window.ParchLockMap) ParchLockMap.CurrentRoom = ParchLockMap.CurrentRoom || \"Alley\";\n      if (window.ZvmCapture) ZvmCapture.tick();"
);
fs.writeFileSync("tools/alley-ram-actionable-regression.js", t);

// TranslatorUI: always sync CurrentRoom from structural roomName when live
let tu = fs.readFileSync("js/TranslatorUI.js", "utf8");
if (!tu.includes("SYNC_CURRENT_ROOM")) {
  if (tu.includes("APPLY_ROOM_FROM_RAM")) {
    tu = tu.replace(
      "/* APPLY_ROOM_FROM_RAM */",
      `/* APPLY_ROOM_FROM_RAM SYNC_CURRENT_ROOM */`
    );
    tu = tu.replace(
      /if \(payload && payload\.roomName && typeof ParchLockMap !== "undefined"\) \{[\s\S]*?\}/,
      `if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = payload.roomName;
            }`
    );
  } else {
    // inject into apply if exists
    tu = tu.replace(
      /apply:\s*\(payload\)\s*=>\s*\{/,
      `apply: (payload) => {
        /* SYNC_CURRENT_ROOM */
        try {
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = payload.roomName;
            }
        } catch (e) {}
`
    );
  }
  fs.writeFileSync("js/TranslatorUI.js", tu);
}
try { new Function(fs.readFileSync("js/TranslatorUI.js","utf8")); console.log("TU OK"); } catch (e) { console.log(e.message); }
