const fs = require("fs");
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const newSnap = `snapshot: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h) return { ok: false, error: "bad-header" };
        var dict = ZRamReader.parseDictionary(mem);
        var playerId = ZRamReader.findPlayerId(mem, dict);
        var player = playerId ? ZRamReader.objectLinks(mem, playerId) : null;
        var roomId = 0;
        var roomName = "";
        if (player && player.parent) {
            var pname = ZRamReader.shortName(mem, player.parent) || "";
            if (pname && pname.charAt(0) !== "(") {
                roomId = player.parent;
                roomName = pname;
            }
        }
        if (!roomId && typeof ZRamReader.findLocationGlobal === "function") {
            var loc = ZRamReader.findLocationGlobal(mem, playerId);
            if (loc) {
                roomId = loc;
                roomName = ZRamReader.shortName(mem, loc) || "";
            }
        }
        // If room has no children, try findRoomsByName upgrade (I7 prototypes vs instances)
        var scope = roomId ? ZRamReader.scopeObjects(mem, roomId, { depth: 2 }) : [];
        scope = (scope || []).filter(function (o) { return o && o.name && String(o.name).charAt(0) !== "("; });
        if ((!scope.length) && roomName && typeof ZRamReader.findRoomsByName === "function") {
            var hits = ZRamReader.findRoomsByName(mem, roomName);
            if (hits && hits[0] && hits[0].score >= 15) {
                roomId = hits[0].id;
                roomName = hits[0].name;
                scope = ZRamReader.scopeObjects(mem, roomId, { depth: 2 }).filter(function (o) {
                    return o && o.name && String(o.name).charAt(0) !== "(";
                });
            }
        }
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
`;
zr = zr.replace(/snapshot:\s*\(mem\)\s*=>\s*\{[\s\S]*\}\s*;\s*$/, newSnap);
fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(zr); console.log("OK"); } catch (e) { console.log("FAIL", e.message); }
console.log(zr.slice(zr.indexOf("snapshot:"), zr.indexOf("snapshot:") + 600));
