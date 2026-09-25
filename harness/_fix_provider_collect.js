const fs = require("fs");

// --- Rewrite ZRamProvider.collect status bootstrap cleanly ---
let zp = fs.readFileSync("js/ZRamProvider.js", "utf8");
const collectStart = zp.indexOf("collect:");
if (collectStart < 0) throw new Error("no collect");

// Replace entire collect method body by rewriting file's collect via regex carefully
zp = zp.replace(
  /collect:\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\},?\s*\n\s*(register|install|getMem|name:)/,
  `collect: () => {
        var mem = ZRamProvider.getMem();
        if (!mem || typeof ZRamReader === "undefined") {
            return {
                sources: [{ name: "z-ram", confidence: 0.02 }],
                probe: { status: "z-ram-waiting-for-zvm" }
            };
        }
        var snap = ZRamReader.snapshot(mem) || {};
        try {
            var status = "";
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) status = String(ParchLockMap.CurrentRoom);
            if (!status) {
                var el = document.querySelector("#statusline, .StatusLine, #status, .statusline");
                if (el) status = (el.textContent || "").trim();
            }
            var needFix = !snap.roomId || !(snap.discoveredObjects && snap.discoveredObjects.length);
            // Always upgrade to live room instance if name match scores higher
            var roomWord = (status || snap.roomName || "").split(/\\s{2,}|\\t/)[0].replace(/[^A-Za-z0-9' \\-]/g, "").trim();
            if (roomWord && typeof ZRamReader.findRoomsByName === "function") {
                var hits = ZRamReader.findRoomsByName(mem, roomWord);
                if (hits && hits[0] && hits[0].score >= 15) {
                    if (needFix || hits[0].id !== snap.roomId) {
                        snap.roomId = hits[0].id;
                        snap.roomName = hits[0].name;
                        snap.discoveredObjects = ZRamReader.scopeObjects(mem, snap.roomId, { depth: 2 }).filter(function (o) {
                            return o && o.name && String(o.name).charAt(0) !== "(";
                        });
                        snap.exits = ZRamReader.lookAheadExits(mem, snap.roomId);
                        snap.confidence = 0.94;
                    }
                }
            }
        } catch (eStatus) {}

        var objs = snap.discoveredObjects || [];
        var inv = snap.inventory || [];
        var conf = snap.confidence || (objs.length ? 0.9 : 0.3);
        return {
            sources: [{ name: "z-ram", confidence: conf }],
            engineMode: "structural",
            vmType: "z",
            roomId: snap.roomId || null,
            roomName: snap.roomName || "",
            discoveredObjects: objs,
            inventory: inv,
            exits: snap.exits || [],
            probe: {
                status: "z-ram-live",
                playerId: snap.playerId || 0,
                roomId: snap.roomId || 0,
                scopeCount: objs.length
            },
            confidence: conf
        };
    },

    $1`
);

fs.writeFileSync("js/ZRamProvider.js", zp);
try { new Function(zp); console.log("ZP OK", zp.length); } catch (e) { console.log("ZP FAIL", e.message); }

// Ensure findRoomsByName exists
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
console.log("findRoomsByName", zr.includes("findRoomsByName"));
console.log("findLocationGlobal", zr.includes("findLocationGlobal"));

// Soft-demote BufferTap when z-ram-live has id'd objects
let bt = fs.readFileSync("js/BufferTapProvider.js", "utf8");
if (!bt.includes("STRUCTURAL_HARD_DEMOTE")) {
  bt = bt.replace(
    "collect: () => {",
    `collect: () => {
        /* STRUCTURAL_HARD_DEMOTE */
        try {
            var zpLive = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            if (zpLive && p && p.probe && p.probe.status === "z-ram-live" && (p.probe.scopeCount || 0) > 0) {
                return { sources: [{ name: "buffer-tap", confidence: 0.01 }], discoveredObjects: [], confidence: 0.01 };
            }
        } catch (e) {}
`
  );
  fs.writeFileSync("js/BufferTapProvider.js", bt);
}
try { new Function(fs.readFileSync("js/BufferTapProvider.js","utf8")); console.log("BT OK"); } catch (e) { console.log("BT FAIL", e.message); }

// Actionable DeterministicNouns: only id-backed when z-ram-live with scope
let a = fs.readFileSync("js/Actionable.js", "utf8");
if (a.includes("DeterministicNouns") && !a.includes("scopeCount")) {
  a = a.replace(
    'var structural = p && p.probe && p.probe.status === "z-ram-live";',
    'var structural = p && p.probe && p.probe.status === "z-ram-live" && (p.probe.scopeCount > 0 || (p.discoveredObjects || []).some(function (o) { return o && o.id; }));'
  );
  fs.writeFileSync("js/Actionable.js", a);
}
try { new Function(fs.readFileSync("js/Actionable.js","utf8")); console.log("Act OK"); } catch (e) { console.log("Act FAIL", e.message); }
