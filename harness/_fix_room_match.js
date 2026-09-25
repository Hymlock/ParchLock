const fs = require("fs");
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");

// Prefer live room instances (have children / not paren names) when resolving by short name
if (!zr.includes("findRoomsByName")) {
  zr = zr.replace(
    "findPlayerId: (mem, dict) => {",
    `findRoomsByName: (mem, name) => {
        var want = String(name || "").toLowerCase().replace(/^the\\s+/, "").trim();
        if (!want) return [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var hits = [];
        for (var id = 1; id <= count; id++) {
            var nm = (ZRamReader.shortName(mem, id) || "").toLowerCase().replace(/^the\\s+/, "").trim();
            if (!nm || nm.charAt(0) === "(") continue;
            if (nm !== want && nm.indexOf(want) < 0 && want.indexOf(nm) < 0) continue;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, id);
            var score = 0;
            if (nm === want) score += 10;
            if (kids.length) score += 20 + Math.min(kids.length, 10);
            if (obj.parent === 0) score += 3; // top-level rooms
            if (obj.child) score += 5;
            hits.push({ id: id, name: nm, score: score, kids: kids.length });
        }
        hits.sort(function (a, b) { return b.score - a.score; });
        return hits;
    },

    findLocationGlobal: (mem, playerId) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        // Prefer globals that point at a room-like object (parent 0, has children, not paren name)
        var best = 0, bestScore = -1;
        for (var g = 0; g < 240; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 1 || val > count) continue;
            if (val === playerId) continue;
            var nm = (ZRamReader.shortName(mem, val) || "");
            if (!nm || nm.charAt(0) === "(") continue;
            var obj = ZRamReader.objectLinks(mem, val);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, val);
            var score = 0;
            if (obj.parent === 0) score += 4;
            if (kids.length) score += 10 + Math.min(kids.length, 8);
            // Player currently "in" this room if any child of room equals player ? rare in I7
            for (var i = 0; i < kids.length; i++) if (kids[i] === playerId) score += 50;
            if (score > bestScore) { bestScore = score; best = val; }
        }
        return bestScore >= 10 ? best : 0;
    },

    findPlayerId: (mem, dict) => {`
  );
}

// Rewrite snapshot room resolution
zr = zr.replace(
  /snapshot: \(mem\) => \{[\s\S]*?return \{\s*playerId[\s\S]*?\};\s*\},?\s*\};?\s*$/,
  `snapshot: (mem) => {
        if (!mem) return null;
        var h = ZRamReader.header(mem);
        if (!h) return null;
        var dict = ZRamReader.parseDictionary(mem);
        var playerId = ZRamReader.findPlayerId(mem, dict);
        var roomId = 0;
        var roomName = "";
        if (playerId) {
            var pl = ZRamReader.objectLinks(mem, playerId);
            var parentId = pl && pl.parent;
            var parentName = parentId ? (ZRamReader.shortName(mem, parentId) || "") : "";
            // Reject internal I7 containers like (con_topics)
            if (parentId && parentName && parentName.charAt(0) !== "(") {
                roomId = parentId;
                roomName = parentName;
            }
        }
        if (!roomId) {
            var loc = ZRamReader.findLocationGlobal(mem, playerId);
            if (loc) {
                roomId = loc;
                roomName = ZRamReader.shortName(mem, loc) || "";
            }
        }
        var discovered = roomId ? ZRamReader.scopeObjects(mem, roomId, { depth: 2 }) : [];
        // Filter out paren-named internals from scope
        discovered = discovered.filter(function (o) {
            return o && o.name && String(o.name).charAt(0) !== "(";
        });
        var exits = roomId ? ZRamReader.lookAheadExits(mem, roomId) : [];
        var inventory = [];
        if (playerId) {
            ZRamReader.children(mem, playerId).forEach(function (cid) {
                var name = ZRamReader.shortName(mem, cid);
                if (!name || name.charAt(0) === "(") return;
                inventory.push({
                    id: cid,
                    name: name,
                    parentId: playerId,
                    attrs: Object.assign({ raw: [] }, ZRamReader.attrsFromObject(mem, cid)),
                    confidence: 0.9,
                    discovered: true
                });
            });
        }
        return {
            playerId: playerId,
            roomId: roomId,
            roomName: roomName,
            objectCount: ZRamReader.objectCount(mem, h),
            discoveredObjects: discovered,
            inventory: inventory,
            exits: exits,
            dictionarySize: (dict && dict.entries && dict.entries.length) || 0,
            engineMode: "structural",
            vmType: "z",
            confidence: roomId && discovered.length ? 0.92 : (roomId ? 0.7 : 0.4)
        };
    }
};
`
);

fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(zr); console.log("ZRamReader OK"); } catch (e) { console.log("ZR FAIL", e.message); }

// ZRamProvider: status-line bootstrap prefers findRoomsByName winner
let zp = fs.readFileSync("js/ZRamProvider.js", "utf8");
if (!zp.includes("findRoomsByName")) {
  // Find where room is bootstrapped from status and replace
  zp = zp.replace(
    /\/\/ bootstrap[\s\S]{0,800}?roomId[\s\S]{0,400}?/,
    ""
  );
}
// Simpler: inject after snapshot() call in collect
if (zp.includes("collect:") && !zp.includes("STATUS_ROOM_FIX")) {
  zp = zp.replace(
    "collect: () => {",
    `collect: () => {
        /* STATUS_ROOM_FIX */
`
  );
  // After building payload from snapshot, if roomName empty or room has 0 scope, try status line
  zp = zp.replace(
    /var snap = ZRamReader\.snapshot\(([^)]+)\);/,
    `var snap = ZRamReader.snapshot($1);
            try {
                var status = "";
                var el = document.querySelector("#statusline, .StatusLine, #status");
                if (el) status = (el.textContent || "").trim();
                if (!status) {
                    var lines = (document.querySelector("#windowport") || document.body).innerText || "";
                    var m = lines.match(/\\n\\s*([A-Z][A-Za-z0-9' \\-]{2,40})\\s*(?:\\n|$)/);
                    // Prefer Map.CurrentRoom / last look header
                    if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) status = ParchLockMap.CurrentRoom;
                }
                if ((!snap.roomId || !(snap.discoveredObjects || []).length) && status) {
                    var roomWord = String(status).split(/\\s{2,}|\\t/)[0].replace(/[^A-Za-z0-9' \\-]/g, "").trim();
                    if (roomWord && typeof ZRamReader.findRoomsByName === "function") {
                        var hits = ZRamReader.findRoomsByName(mem, roomWord);
                        if (hits && hits[0] && hits[0].score >= 10) {
                            snap.roomId = hits[0].id;
                            snap.roomName = hits[0].name;
                            snap.discoveredObjects = ZRamReader.scopeObjects(mem, snap.roomId, { depth: 2 }).filter(function (o) {
                                return o && o.name && String(o.name).charAt(0) !== "(";
                            });
                            snap.exits = ZRamReader.lookAheadExits(mem, snap.roomId);
                            snap.confidence = 0.93;
                        }
                    }
                }
            } catch (eStatus) {}`
  );
  fs.writeFileSync("js/ZRamProvider.js", zp);
}
try { new Function(fs.readFileSync("js/ZRamProvider.js","utf8")); console.log("ZRamProvider OK"); } catch (e) { console.log("ZP FAIL", e.message); }

// WorldModel: when structural has objects, wipe heuristic discoveredObjects entirely in preferStructural
let wm = fs.readFileSync("js/WorldModel.js", "utf8");
if (wm.includes("preferStructuralPayload") && !wm.includes("STRUCTURAL_WIPE_HEURISTIC")) {
  wm = wm.replace(
    "preferStructuralPayload: function (payload) {",
    `preferStructuralPayload: function (payload) {
        /* STRUCTURAL_WIPE_HEURISTIC */`
  );
  // After preferring z-ram fields, if z-ram live with objs, set discoveredObjects exclusively from structural source
  if (!wm.includes("exclusiveStructuralObjects")) {
    wm = wm.replace(
      "preferStructuralPayload: function (payload) {",
      `preferStructuralPayload: function (payload) {
        payload = payload || this.createEmptyPayload();
        try {
            var srcs = payload.sources || [];
            var z = srcs.find(function (s) { return s && s.name === "z-ram" && (s.confidence || 0) >= 0.5; });
            if (z && payload.probe && payload.probe.status === "z-ram-live" && (payload.discoveredObjects || []).some(function (o) { return o && o.id; })) {
                payload.discoveredObjects = (payload.discoveredObjects || []).filter(function (o) { return o && o.id; });
            }
        } catch (e) {}
        // fall through ? keep existing prefer logic if present below
`
    );
  }
  fs.writeFileSync("js/WorldModel.js", wm);
}
try { new Function(fs.readFileSync("js/WorldModel.js","utf8")); console.log("WM OK"); } catch (e) { console.log("WM FAIL", e.message); }
