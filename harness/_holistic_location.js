const fs = require("fs");

// ========== 1) Stronger findPlayerId: always scan for yourself/cretin/grunk ==========
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const fpStart = zr.indexOf("findPlayerId:");
const fpEnd = zr.indexOf("findLocationGlobal:", fpStart);
// Actually find next method after findPlayerId - could be findLocationGlobal or findLikelyLocation
let next = zr.indexOf("\n    findLocationGlobal:", fpStart);
if (next < 0) next = zr.indexOf("\n    findLikelyLocation:", fpStart);
if (next < 0) next = zr.indexOf("\n    snapshot:", fpStart);
if (fpStart < 0 || next < 0) {
  console.log("findPlayerId bounds fail", fpStart, next);
} else {
  const body = `findPlayerId: (mem, dict) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        function isMetaName(nm) {
            nm = String(nm || "").toLowerCase();
            if (!nm || nm.charAt(0) === "(") return true;
            return /^(class|object|routine|string|kind|nothing|compass|compassdirection|direction|room|thing|backdrop|region|door|directions)$/i.test(nm);
        }
        var best = 0, bestScore = -1;
        function consider(id, bonus) {
            if (id < 2 || id > count) return;
            var nm = ZRamReader.shortName(mem, id) || "";
            if (isMetaName(nm)) return;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) return;
            var score = bonus || 0;
            var low = nm.toLowerCase();
            if (/^(yourself|cretin|grunk|body)$/.test(low)) score += 40;
            else if (/yourself|cretin|grunk|adventurer|player/.test(low)) score += 18;
            else return; // only strong PC-name candidates in full/global scan
            if (obj.parent > 1) {
                var pn = ZRamReader.shortName(mem, obj.parent) || "";
                if (!isMetaName(pn)) {
                    score += 10;
                    if (ZRamReader.children(mem, obj.parent).length) score += 8;
                }
            }
            var kids = ZRamReader.children(mem, id);
            if (kids.length && kids.length < 24) score += 3;
            if (score > bestScore) { bestScore = score; best = id; }
        }
        for (var g = 0; g < 160; g++) consider(ZRamReader.u16(mem, h.globals + g * 2), 5);
        for (var id = 1; id <= count; id++) consider(id, 0);
        return bestScore >= 18 ? best : 0;
    },

`;
  zr = zr.slice(0, fpStart) + body + zr.slice(next + 1).replace(/^\s*/, "    ");
  // careful - next includes newline+spaces+name. Simpler: slice at next
  zr = fs.readFileSync("js/ZRamReader.js", "utf8");
  zr = zr.slice(0, fpStart) + body + zr.slice(next);
  fs.writeFileSync("js/ZRamReader.js", zr);
}
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR player OK"); }
catch (e) { console.log("ZR player FAIL", e.message); }

// ========== 2) ZRamProvider.collect always uses text-room match as core path ==========
fs.writeFileSync("js/ZRamProvider.js", `var ZRamProvider = {
    name: "z-ram",
    getMem: function () {
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.getMem) return ZvmCapture.getMem();
            var z = window.__PARCHLOCK_ZVM__;
            if (!z) return null;
            if (z.m && z.m.buffer) return new DataView(z.m.buffer, z.m.byteOffset || 0, z.m.byteLength || z.m.length);
            if (z.ram && z.ram.buffer) return new DataView(z.ram.buffer);
            return null;
        } catch (e) { return null; }
    },
    resolveStatusRoom: function () {
        try {
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) {
                var cr = String(ParchLockMap.CurrentRoom).trim();
                if (cr && cr.charAt(0) !== "(") return cr;
            }
            var el = document.querySelector("#statusline, .StatusLine, #status, .statusline, #status_right, #status_left");
            if (el && el.textContent) {
                var st = el.textContent.trim().split(/\\n/)[0].trim().replace(/\\s{2,}.*$/, "").trim();
                if (st && !/^(adventure|inform|score|turns)$/i.test(st)) return st;
            }
            var cells = document.querySelectorAll(".StatusGrid .Style_subheader, .statusline, #windowport .Style_subheader");
            for (var ci = 0; ci < cells.length; ci++) {
                var ct = (cells[ci].textContent || "").trim();
                if (ct && ct.length < 60 && !/^(adventure|score|turns)$/i.test(ct)) return ct;
            }
            var wp = document.querySelector("#windowport");
            if (wp) {
                var t = (wp.innerText || "").trim().split(/\\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
                for (var i = t.length - 1; i >= 0; i--) {
                    var line = t[i];
                    if (line.length < 2 || line.length > 48) continue;
                    if (/^(You |I |There |The |A |An |It |She |He |>|What |Would |Do you|Press |Type )/i.test(line)) continue;
                    if (/^(ADVENTURE|Inform|Score|Turns)/i.test(line)) continue;
                    if (/^[A-Z][A-Za-z0-9'., \\-]{1,47}$/.test(line) || /^[A-Z0-9' \\-]{3,40}$/.test(line)) return line;
                }
            }
        } catch (e) {}
        return "";
    },
    matchRoomFromText: function (mem) {
        try {
            var wp = document.querySelector("#windowport");
            var text = ((wp && wp.innerText) || "").toLowerCase();
            if (!text || text.length < 8) return 0;
            var h = ZRamReader.header(mem);
            var count = ZRamReader.objectCount(mem, h);
            var best = 0, bestSc = -1;
            for (var id = 1; id <= count; id++) {
                var nm = ZRamReader.shortName(mem, id);
                if (!nm || nm.charAt(0) === "(") continue;
                if (/^(class|object|compass|direction|kind|nothing)$/i.test(nm)) continue;
                var obj = ZRamReader.objectLinks(mem, id);
                if (!obj) continue;
                var kids = ZRamReader.children(mem, id);
                if (kids.length < 1) continue;
                var nml = nm.toLowerCase();
                if (nml.length < 4) continue;
                var idx = text.lastIndexOf(nml);
                if (idx < 0) continue;
                var sc = kids.length * 2 + Math.floor(idx / 40);
                if (obj.parent === 0) sc += 8;
                if (sc > bestSc) { bestSc = sc; best = id; }
            }
            return bestSc >= 8 ? best : 0;
        } catch (e) { return 0; }
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
        // Holistic location resolution ladder (no story-specific branches)
        var loc = 0;
        try {
            if (typeof ZRamReader.findLikelyLocation === "function") {
                loc = ZRamReader.findLikelyLocation(mem, snap.playerId || 0, status || snap.roomName || "") || 0;
            }
        } catch (e1) {}
        if (!loc) loc = ZRamProvider.matchRoomFromText(mem) || 0;
        if (!loc && status && typeof ZRamReader.findRoomsByName === "function") {
            var hits = ZRamReader.findRoomsByName(mem, status);
            if (hits && hits[0] && hits[0].score >= 15) loc = hits[0].id;
        }
        if (loc) {
            snap.roomId = loc;
            snap.roomName = ZRamReader.shortName(mem, loc) || "";
            snap.discoveredObjects = ZRamReader.scopeObjects(mem, loc, { depth: 2 }).filter(function (o) {
                return o && o.name && String(o.name).charAt(0) !== "(";
            });
            snap.exits = ZRamReader.lookAheadExits(mem, loc);
            snap.confidence = 0.95;
        }
        if (snap.roomName && /^(class|object|kind|compass)$/i.test(snap.roomName)) {
            snap.roomId = 0; snap.roomName = ""; snap.discoveredObjects = []; snap.exits = [];
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
`);
try { new Function(fs.readFileSync("js/ZRamProvider.js","utf8")); console.log("ZP OK"); }
catch (e) { console.log("ZP FAIL", e.message); }
