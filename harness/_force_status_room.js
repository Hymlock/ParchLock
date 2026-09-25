const fs = require("fs");

// Fix findLocationGlobal to reject Class/meta objects
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
zr = zr.replace(
  /findLocationGlobal: \(mem, playerId\) => \{[\s\S]*?return bestScore >= 10 \? best : 0;\s*\},/,
  `findLocationGlobal: (mem, playerId) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        var best = 0, bestScore = -1;
        for (var g = 0; g < 240; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 2 || val > count) continue;
            if (val === playerId) continue;
            var nm = (ZRamReader.shortName(mem, val) || "");
            if (!nm || nm.charAt(0) === "(") continue;
            if (/^(class|object|routine|string|kind|nothing)$/i.test(nm)) continue;
            var obj = ZRamReader.objectLinks(mem, val);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, val);
            if (!kids.length) continue;
            // Prefer globals whose children look like scenery (not pure class trees)
            var score = 6 + Math.min(kids.length, 12);
            if (obj.parent === 0) score += 2;
            for (var i = 0; i < kids.length; i++) if (kids[i] === playerId) score += 50;
            if (score > bestScore) { bestScore = score; best = val; }
        }
        return bestScore >= 12 ? best : 0;
    },`
);
fs.writeFileSync("js/ZRamReader.js", zr);

// Rewrite ZRamProvider.collect to ALWAYS resolve via Map/status name when available
let zp = `var ZRamProvider = {
    name: "z-ram",
    getMem: function () {
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.getMem) return ZvmCapture.getMem();
            var z = window.__PARCHLOCK_ZVM__;
            if (!z) return null;
            if (z.m && (z.m.buffer || z.m.length)) return z.m.buffer ? new DataView(z.m.buffer, z.m.byteOffset || 0, z.m.byteLength || z.m.length) : null;
            if (z.ram) return z.ram.buffer ? new DataView(z.ram.buffer) : null;
            return null;
        } catch (e) { return null; }
    },
    resolveStatusRoom: function () {
        try {
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) return String(ParchLockMap.CurrentRoom);
            var el = document.querySelector("#statusline, .StatusLine, #status, .statusline");
            if (el && el.textContent) return el.textContent.trim().split(/\\n/)[0].trim();
            // Last bold/header-ish line in windowport
            var wp = document.querySelector("#windowport");
            if (wp) {
                var t = (wp.innerText || "").trim().split(/\\n+/);
                for (var i = t.length - 1; i >= 0; i--) {
                    var line = t[i].trim();
                    if (/^[A-Z][A-Za-z0-9' \\-]{2,40}$/.test(line)) return line;
                }
            }
        } catch (e) {}
        return "";
    },
    collect: function () {
        var mem = ZRamProvider.getMem();
        if (!mem || typeof ZRamReader === "undefined") {
            return {
                sources: [{ name: "z-ram", confidence: 0.02 }],
                probe: { status: "z-ram-waiting-for-zvm" }
            };
        }
        var snap = ZRamReader.snapshot(mem) || {};
        var status = ZRamProvider.resolveStatusRoom();
        var roomWord = (status || snap.roomName || "").split(/\\s{2,}|\\t/)[0].replace(/[^A-Za-z0-9' \\-]/g, "").trim();
        if (roomWord && typeof ZRamReader.findRoomsByName === "function") {
            var hits = ZRamReader.findRoomsByName(mem, roomWord);
            if (hits && hits[0] && hits[0].score >= 15) {
                snap.roomId = hits[0].id;
                snap.roomName = hits[0].name;
                snap.discoveredObjects = ZRamReader.scopeObjects(mem, snap.roomId, { depth: 2 }).filter(function (o) {
                    return o && o.name && String(o.name).charAt(0) !== "(";
                });
                snap.exits = ZRamReader.lookAheadExits(mem, snap.roomId);
                snap.confidence = 0.95;
            }
        }
        // Reject Class/meta rooms even if still present
        if (snap.roomName && /^(class|object|kind)$/i.test(snap.roomName)) {
            snap.roomId = 0;
            snap.roomName = "";
            snap.discoveredObjects = [];
        }
        var objs = snap.discoveredObjects || [];
        var conf = snap.confidence || (objs.length ? 0.9 : 0.3);
        return {
            sources: [{ name: "z-ram", confidence: conf }],
            engineMode: "structural",
            vmType: "z",
            roomId: snap.roomId || null,
            roomName: snap.roomName || "",
            discoveredObjects: objs,
            inventory: snap.inventory || [],
            exits: snap.exits || [],
            probe: {
                status: "z-ram-live",
                playerId: snap.playerId || 0,
                roomId: snap.roomId || 0,
                scopeCount: objs.length
            },
            confidence: conf
        };
    }
};
try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "z-ram", collect: function () { return ZRamProvider.collect(); } });
        }
    }, 0);
} catch (e) {}
`;
fs.writeFileSync("js/ZRamProvider.js", zp);
try { new Function(zp); console.log("ZP rewritten OK"); } catch (e) { console.log("ZP FAIL", e.message); }
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR OK"); } catch (e) { console.log("ZR FAIL", e.message); }
