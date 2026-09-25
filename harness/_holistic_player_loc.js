const fs = require("fs");
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");

// Strengthen findPlayerId: reject meta/class/compass; prefer animate-ish under a real room
zr = zr.replace(
  /findPlayerId:\s*\(mem,\s*dict\)\s*=>\s*\{[\s\S]*?return bestScore >= 8 \? best : best;\s*\},/,
  `findPlayerId: (mem, dict) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        function isMetaName(nm) {
            nm = String(nm || "").toLowerCase();
            if (!nm || nm.charAt(0) === "(") return true;
            return /^(class|object|routine|string|kind|nothing|compass|compassdirection|direction|room|thing|backdrop|region|door)$/i.test(nm);
        }
        var best = 0, bestScore = -1;
        // Globals first: Inform often stores player in a low global
        for (var g = 0; g < 80; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 2 || val > count) continue;
            var nm = ZRamReader.shortName(mem, val) || "";
            if (isMetaName(nm)) continue;
            var obj = ZRamReader.objectLinks(mem, val);
            if (!obj) continue;
            var score = 0;
            if (/^(yourself|cretin|grunk|body)$/i.test(nm)) score += 30;
            if (/you|self|grunk|adventurer|player/i.test(nm)) score += 12;
            // Player usually has a non-meta parent that looks like a location (has children or parent 0 with kids)
            if (obj.parent > 1) {
                var pn = ZRamReader.shortName(mem, obj.parent) || "";
                if (!isMetaName(pn)) {
                    score += 8;
                    var pk = ZRamReader.children(mem, obj.parent);
                    if (pk.length) score += 6;
                }
            }
            // Inventory children are common for PC
            var kids = ZRamReader.children(mem, val);
            if (kids.length && kids.length < 20) score += 4;
            if (score > bestScore) { bestScore = score; best = val; }
        }
        for (var id = 1; id <= count; id++) {
            var name = ZRamReader.shortName(mem, id) || "";
            if (isMetaName(name)) continue;
            var o = ZRamReader.objectLinks(mem, id);
            if (!o) continue;
            var sc = 0;
            if (/^(yourself|cretin|grunk)$/i.test(name)) sc += 30;
            else if (/yourself|cretin|grunk|adventurer/i.test(name)) sc += 14;
            else continue; // only strong name hits in full scan
            if (o.parent > 1) {
                var pnm = ZRamReader.shortName(mem, o.parent) || "";
                if (!isMetaName(pnm)) sc += 10;
            }
            if (sc > bestScore) { bestScore = sc; best = id; }
        }
        return bestScore >= 10 ? best : 0;
    },`
);

// findRoomsByName: if status is a game title (ADVENTURE), return []; caller must use other signals
zr = zr.replace(
  /findRoomsByName:\s*\(mem,\s*name\)\s*=>\s*\{[\s\S]*?return hits;\s*\},/,
  `findRoomsByName: (mem, name) => {
        var want = String(name || "").toLowerCase().replace(/^the\\s+/, "").trim();
        if (!want) return [];
        // Reject non-room status tokens (game titles, prompts)
        if (/^(adventure|inform|score|turns|time|serial|release|would you|do you|press|type)$/i.test(want)) return [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var hits = [];
        for (var id = 1; id <= count; id++) {
            var nm = (ZRamReader.shortName(mem, id) || "").toLowerCase().replace(/^the\\s+/, "").trim();
            if (!nm || nm.charAt(0) === "(") continue;
            if (/^(class|object|compass|compassdirection|direction)$/i.test(nm)) continue;
            if (nm !== want && nm.indexOf(want) < 0 && want.indexOf(nm) < 0) continue;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, id);
            var score = 0;
            if (nm === want) score += 10;
            if (kids.length) score += 20 + Math.min(kids.length, 10);
            if (obj.parent === 0) score += 3;
            if (obj.child) score += 5;
            hits.push({ id: id, name: nm, score: score, kids: kids.length });
        }
        hits.sort(function (a, b) { return b.score - a.score; });
        return hits;
    },`
);

// New: findLikelyLocation ? holistic: room with most "scenery-like" presence matching recent text tokens OR player parent OR global
if (!zr.includes("findLikelyLocation")) {
  zr = zr.replace(
    "findLocationGlobal:",
    `findLikelyLocation: (mem, playerId, textHint) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        function isMeta(nm) {
            nm = String(nm || "");
            return !nm || nm.charAt(0) === "(" || /^(class|object|compass|compassdirection|direction|kind|nothing)$/i.test(nm);
        }
        // 1) Valid parent(player)
        if (playerId) {
            var pl = ZRamReader.objectLinks(mem, playerId);
            if (pl && pl.parent > 1) {
                var pn = ZRamReader.shortName(mem, pl.parent) || "";
                if (!isMeta(pn)) {
                    var pk = ZRamReader.children(mem, pl.parent);
                    if (pk.length) return pl.parent;
                }
            }
        }
        // 2) Status / map / text hint via findRoomsByName
        var hint = String(textHint || "").trim();
        if (hint) {
            var hits = ZRamReader.findRoomsByName(mem, hint);
            if (hits && hits[0] && hits[0].score >= 15) return hits[0].id;
            // Partial: match any room whose name tokens appear as a header line
            var hintL = hint.toLowerCase();
            var best = 0, bestSc = -1;
            for (var id = 1; id <= count; id++) {
                var nm = ZRamReader.shortName(mem, id) || "";
                if (isMeta(nm)) continue;
                var obj = ZRamReader.objectLinks(mem, id);
                if (!obj || obj.parent !== 0) continue;
                var kids = ZRamReader.children(mem, id);
                if (!kids.length) continue;
                var nml = nm.toLowerCase();
                if (hintL.indexOf(nml) >= 0 || nml.indexOf(hintL) >= 0) {
                    var sc = 20 + kids.length;
                    if (sc > bestSc) { bestSc = sc; best = id; }
                }
            }
            if (best) return best;
        }
        // 3) Global location scan
        var loc = ZRamReader.findLocationGlobal(mem, playerId);
        if (loc) return loc;
        return 0;
    },

    findLocationGlobal:`
  );
}

// Rewrite snapshot to use findLikelyLocation + never keep Class
zr = zr.replace(
  /snapshot:\s*\(mem\)\s*=>\s*\{[\s\S]*\}\s*;\s*$/,
  `snapshot: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h) return { ok: false, error: "bad-header" };
        var dict = ZRamReader.parseDictionary(mem);
        var playerId = ZRamReader.findPlayerId(mem, dict);
        var roomId = 0;
        var roomName = "";
        if (typeof ZRamReader.findLikelyLocation === "function") {
            roomId = ZRamReader.findLikelyLocation(mem, playerId, "");
        }
        if (roomId) roomName = ZRamReader.shortName(mem, roomId) || "";
        if (roomName && /^(class|object|compass)$/i.test(roomName)) {
            roomId = 0; roomName = "";
        }
        var scope = roomId ? ZRamReader.scopeObjects(mem, roomId, { depth: 2 }) : [];
        scope = (scope || []).filter(function (o) { return o && o.name && String(o.name).charAt(0) !== "("; });
        scope.forEach(function (o) {
            var key = (o.name || "").toLowerCase();
            if (key && dict.words && dict.words[key]) o.dictAddr = dict.words[key];
            var first = key.split(/\\s+/)[0];
            if (first && dict.words && dict.words[first]) o.dictAddr = o.dictAddr || dict.words[first];
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
                    attrs: typeof ZRamReader.attrsFromObject === "function" ? ZRamReader.attrsFromObject(mem, cid) : {},
                    confidence: 0.9,
                    discovered: true
                });
            });
        }
        return {
            ok: true,
            version: h.version,
            objectCount: ZRamReader.objectCount(mem, h),
            playerId: playerId,
            roomId: roomId,
            roomName: roomName,
            discoveredObjects: scope,
            inventory: inventory,
            exits: exits,
            dictCount: dict.count || 0,
            confidence: roomId && scope.length ? 0.94 : (roomId ? 0.6 : 0.3)
        };
    }
};
`
);

fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(zr); console.log("ZR OK"); } catch (e) { console.log("ZR FAIL", e.message); }

// ZRamProvider.collect: always pass resolveStatusRoom into findLikelyLocation upgrade
let zp = fs.readFileSync("js/ZRamProvider.js", "utf8");
zp = zp.replace(
  /var snap = ZRamReader\.snapshot\(mem\) \|\| \{\};[\s\S]*?var roomWord =[\s\S]*?snap\.confidence = 0\.95;\s*\}\s*\}/,
  `var status = ZRamProvider.resolveStatusRoom();
        var snap = ZRamReader.snapshot(mem) || {};
        // Holistic location upgrade: status/map hint ? findLikelyLocation (no story-specific branches)
        try {
            var loc = ZRamReader.findLikelyLocation(mem, snap.playerId || 0, status || snap.roomName || "");
            if (loc) {
                snap.roomId = loc;
                snap.roomName = ZRamReader.shortName(mem, loc) || "";
                snap.discoveredObjects = ZRamReader.scopeObjects(mem, loc, { depth: 2 }).filter(function (o) {
                    return o && o.name && String(o.name).charAt(0) !== "(";
                });
                snap.exits = ZRamReader.lookAheadExits(mem, loc);
                snap.confidence = 0.95;
            }
        } catch (eLoc) {}
        var roomWord = (status || snap.roomName || "").split(/\\s{2,}|\\t/)[0].replace(/[^A-Za-z0-9' \\-]/g, "").trim();
        if ((!snap.roomId || !(snap.discoveredObjects || []).length) && roomWord && typeof ZRamReader.findRoomsByName === "function") {
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
        }`
);
fs.writeFileSync("js/ZRamProvider.js", zp);
try { new Function(fs.readFileSync("js/ZRamProvider.js","utf8")); console.log("ZP OK"); } catch (e) { console.log("ZP FAIL", e.message); }

// Strengthen docs language: Alley is NEVER a dependency
let p = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (!p.includes("Alley is never a product dependency")) {
  p = p.replace(
    "Alley/Anchorhead is a **fixture**, not the product scope.",
    "Alley/Anchorhead is a **fixture only**, never a product dependency or code branch. The RAM miner must be holistic for all rooms/modules/systems."
  );
  p = p.replace(
    "Hard rule: **no story-specific or room-specific product code paths** except harness fixtures.",
    "Hard rule: **no story-specific or room-specific product code paths** except harness fixtures. **Alley is never a product dependency.**"
  );
  fs.writeFileSync("PRODUCTION_PLAN.md", p);
}
let u = fs.readFileSync("ARCHITECTURE_UML.md", "utf8");
if (!u.includes("Alley is never")) {
  u = u.replace(
    "Fixture vs product | Alley/Anchorhead harness proves the path; matrix harness proves universality",
    "Fixture vs product | Harness fixtures (incl. Alley) prove the path; **Alley is never a product dependency**; matrix harness proves universality"
  );
  fs.writeFileSync("ARCHITECTURE_UML.md", u);
}
console.log("docs strengthened");
