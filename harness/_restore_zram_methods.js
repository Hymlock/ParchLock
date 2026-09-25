const fs = require("fs");
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");
const insert = `
    attrsFromObject: (mem, id) => {
        var obj = ZRamReader.objectLinks(mem, id);
        var a = {
            takeable: true, openable: false, lockable: false, enterable: false,
            switchable: false, edible: false, wearable: false, container: false,
            supporter: false, door: false, scenery: false
        };
        if (!obj) return a;
        var kids = ZRamReader.children(mem, id);
        if (kids.length) { a.container = true; a.openable = true; a.takeable = false; }
        if (obj.attrBytes && (obj.attrBytes[2] & 0x40)) { a.scenery = true; a.takeable = false; a.enterable = false; }
        var name = (ZRamReader.shortName(mem, id) || "").toLowerCase();
        if (/door|gate/.test(name)) { a.door = true; a.openable = true; a.takeable = false; }
        if (/wall|sky|rain|floor|ceiling|ground/.test(name)) { a.takeable = false; a.scenery = true; a.enterable = false; }
        if (a.scenery) a.takeable = false;
        a.raw = obj.attrBytes || [];
        return a;
    },

    scopeObjects: (mem, roomId, opts) => {
        opts = opts || {};
        var depth = typeof opts.depth === "number" ? opts.depth : 2;
        var out = [];
        var seen = {};
        function walk(id, d) {
            if (!id || seen[id] || d < 0) return;
            seen[id] = 1;
            ZRamReader.children(mem, id).forEach(function (cid) {
                var name = ZRamReader.shortName(mem, cid);
                if (!name || name.charAt(0) === "(") {
                    walk(cid, d - 1);
                    return;
                }
                var obj = ZRamReader.objectLinks(mem, cid);
                out.push({
                    id: cid,
                    name: name,
                    parentId: id,
                    attrs: Object.assign({ raw: obj ? obj.attrBytes : [] }, ZRamReader.attrsFromObject(mem, cid)),
                    confidence: 0.85,
                    discovered: true
                });
                // Recurse into open/transparent containers & supporters (depth-limited)
                var attrs = ZRamReader.attrsFromObject(mem, cid);
                if (d > 0 && (attrs.container || attrs.supporter || attrs.openable)) walk(cid, d - 1);
            });
        }
        walk(roomId, depth);
        return out;
    },

    lookAheadExits: (mem, roomId) => {
        var CARD = {
            north:1, south:1, east:1, west:1, northeast:1, northwest:1, southeast:1, southwest:1,
            up:1, down:1, in:1, out:1, n:1, s:1, e:1, w:1, ne:1, nw:1, se:1, sw:1, u:1, d:1
        };
        var exits = [];
        var h = ZRamReader.header(mem);
        var count = ZRamReader.objectCount(mem, h);
        var seen = {};
        function pushExit(label, prop, val) {
            var tname = ZRamReader.shortName(mem, val) || "";
            if (!tname || tname.charAt(0) === "(") return;
            var lab = String(label || ("exit-" + prop)).toLowerCase();
            var key = lab + "->" + val;
            if (seen[key]) return;
            seen[key] = 1;
            exits.push({
                label: lab,
                prop: prop,
                targetRoomId: val,
                targetRoomName: tname,
                isDoor: /door|gate|hatch|portal/i.test(tname),
                isLocked: false,
                isNonCardinal: !CARD[lab],
                confidence: CARD[lab] ? 0.85 : 0.75
            });
        }
        var cand = (ZRamReader.directionProps && ZRamReader.directionProps.candidates) || [];
        cand.forEach(function (propNum) {
            var val = ZRamReader.readProp(mem, roomId, propNum);
            if (!(val >= 1 && val <= count)) return;
            var tname = (ZRamReader.shortName(mem, val) || "").toLowerCase();
            var label = CARD[tname] ? tname : ("exit-" + propNum);
            pushExit(label, propNum, val);
        });
        for (var p = 1; p <= 48; p++) {
            if (cand.indexOf(p) >= 0) continue;
            var v = ZRamReader.readProp(mem, roomId, p);
            if (!(v >= 2 && v <= count)) continue;
            var o2 = ZRamReader.objectLinks(mem, v);
            if (!o2) continue;
            var k2 = ZRamReader.children(mem, v);
            var nm2 = ZRamReader.shortName(mem, v) || "";
            if (!nm2 || nm2.charAt(0) === "(") continue;
            if (o2.parent === 0 && k2.length >= 1) {
                pushExit(CARD[nm2.toLowerCase()] ? nm2.toLowerCase() : ("exit-" + p), p, v);
            }
        }
        return exits;
    },

`;
// Insert before snapshot
if (!zr.includes("scopeObjects:")) {
  zr = zr.replace(/\n\s*snapshot:\s*\(mem\)\s*=>/, "\n" + insert + "\n    snapshot: (mem) =>");
  fs.writeFileSync("js/ZRamReader.js", zr);
}
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("ZR restored", {
  scope: fs.readFileSync("js/ZRamReader.js","utf8").includes("scopeObjects:"),
  look: fs.readFileSync("js/ZRamReader.js","utf8").includes("lookAheadExits:"),
  attrs: fs.readFileSync("js/ZRamReader.js","utf8").includes("attrsFromObject:")
}); } catch (e) { console.log("FAIL", e.message); }

// Also make snapshot use parent(player) first (as-you-go), not findLikelyLocation first
zr = fs.readFileSync("js/ZRamReader.js", "utf8");
zr = zr.replace(
  /snapshot:\s*\(mem\)\s*=>\s*\{[\s\S]*?\n\s*\}\s*;?\s*$/,
  `snapshot: (mem) => {
        var h = ZRamReader.header(mem);
        if (!h) return { ok: false, error: "bad-header" };
        var dict = ZRamReader.parseDictionary(mem);
        var playerId = ZRamReader.findPlayerId(mem, dict);
        var roomId = 0;
        var roomName = "";
        // As-you-go primary: parent(player)
        if (playerId) {
            var pl = ZRamReader.objectLinks(mem, playerId);
            if (pl && pl.parent > 1) {
                var pn = ZRamReader.shortName(mem, pl.parent) || "";
                if (pn && pn.charAt(0) !== "(" && !/^(class|object|compass|kind)$/i.test(pn)) {
                    roomId = pl.parent;
                    roomName = pn;
                }
            }
        }
        if (!roomId && typeof ZRamReader.findLocationGlobal === "function") {
            roomId = ZRamReader.findLocationGlobal(mem, playerId) || 0;
            if (roomId) roomName = ZRamReader.shortName(mem, roomId) || "";
        }
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
                    attrs: ZRamReader.attrsFromObject(mem, cid),
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
            confidence: roomId && scope.length ? 0.95 : (roomId ? 0.7 : 0.3)
        };
    }
};
`);
fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(zr); console.log("snapshot cascade OK"); } catch (e) { console.log("snap FAIL", e.message); }
