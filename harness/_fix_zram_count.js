const fs = require("fs");

// Fix ZRamReader.objectCount + findPlayerId
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");

zr = zr.replace(
  /objectCount: \(mem, h\) => \{[\s\S]*?return Math\.floor\(\(h\.globals - first\) \/ h\.entrySize\);\s*\},/,
  `objectCount: (mem, h) => {
        h = h || ZRamReader.header(mem);
        if (!h) return 0;
        var first = h.objTable + h.defaultsWords * 2;
        var max = 0;
        for (var id = 1; id < 20000; id++) {
            var base = first + (id - 1) * h.entrySize;
            if (base + h.entrySize > (mem.byteLength || 0x7fffffff)) break;
            var parent, sibling, child, props;
            if (h.version <= 3) {
                parent = ZRamReader.u8(mem, base + 4);
                sibling = ZRamReader.u8(mem, base + 5);
                child = ZRamReader.u8(mem, base + 6);
                props = ZRamReader.u16(mem, base + 7);
            } else {
                parent = ZRamReader.u16(mem, base + 6);
                sibling = ZRamReader.u16(mem, base + 8);
                child = ZRamReader.u16(mem, base + 10);
                props = ZRamReader.u16(mem, base + 12);
            }
            if (!props || props >= (mem.byteLength || props + 1)) break;
            if (parent > 20000 || sibling > 20000 || child > 20000) break;
            max = id;
        }
        return max;
    },`
);

zr = zr.replace(
  /findPlayerId: \(mem, dict\) => \{[\s\S]*?return bestScore >= 3 \? best : best;\s*\},/,
  `findPlayerId: (mem, dict) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        var best = 0, bestScore = -1;
        for (var id = 1; id <= count; id++) {
            var name = (ZRamReader.shortName(mem, id) || "").toLowerCase();
            if (!name || name.charAt(0) === "(") continue;
            var obj = ZRamReader.objectLinks(mem, id);
            if (!obj) continue;
            var score = 0;
            if (/^(grunk|yourself|cretin|body)$/.test(name)) score += 20;
            if (/you|self|grunk/.test(name)) score += 8;
            // Prefer objects currently inside a room-like parent (parent has children / room name)
            if (obj.parent > 0) {
                var pname = (ZRamReader.shortName(mem, obj.parent) || "").toLowerCase();
                if (pname && pname.charAt(0) !== "(") score += 4;
                var pobj = ZRamReader.objectLinks(mem, obj.parent);
                if (pobj && pobj.child) score += 2;
            }
            if (score > bestScore) { bestScore = score; best = id; }
        }
        // Globals: any global pointing at a strongly named player
        for (var g = 0; g < 120; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 1 || val > count) continue;
            var nm = (ZRamReader.shortName(mem, val) || "").toLowerCase();
            if (/^(grunk|yourself|cretin)$/.test(nm) || /yourself|grunk/.test(nm)) return val;
        }
        return bestScore >= 8 ? best : best;
    },`
);

// Decode attrs into boolean flags using Inform-ish bit scan + structural signals
if (!zr.includes("attrsFromObject")) {
  zr = zr.replace(
    "scopeObjects: (mem, roomId, opts) => {",
    `attrsFromObject: (mem, id) => {
        var obj = ZRamReader.objectLinks(mem, id);
        var a = { takeable: true, openable: false, lockable: false, enterable: false, switchable: false, edible: false, wearable: false, container: false, supporter: false, door: false, scenery: false };
        if (!obj) return a;
        // Structural: has children => likely container/supporter
        var kids = ZRamReader.children(mem, id);
        if (kids.length) { a.container = true; a.openable = true; a.takeable = false; }
        // Property presence heuristics (RAM, not prose): door_to-like object refs already in lookAhead
        // Attribute bits: expose common I6-ish positions as soft flags (schema fingerprint later)
        if (ZRamReader.attr(obj, 1)) a.scenery = true; // often scenery/visited ? soft
        if (ZRamReader.attr(obj, 14)) a.container = true;
        if (ZRamReader.attr(obj, 15)) a.openable = true;
        if (ZRamReader.attr(obj, 16)) a.lockable = true;
        if (ZRamReader.attr(obj, 17)) a.enterable = true;
        if (ZRamReader.attr(obj, 18)) a.wearable = true;
        if (ZRamReader.attr(obj, 19)) a.edible = true;
        if (ZRamReader.attr(obj, 2)) a.takeable = true;
        var name = (ZRamReader.shortName(mem, id) || "").toLowerCase();
        if (/door|gate/.test(name)) { a.door = true; a.openable = true; a.takeable = false; }
        if (a.scenery) a.takeable = false;
        return a;
    },

    scopeObjects: (mem, roomId, opts) => {`
  );
  zr = zr.replace(
    "out.push({\n                    id: cid,\n                    name: name,\n                    parentId: id,\n                    attrs: { raw: obj ? obj.attrBytes : [] },\n                    confidence: 0.85,\n                    discovered: true\n                });",
    "out.push({\n                    id: cid,\n                    name: name,\n                    parentId: id,\n                    attrs: Object.assign({ raw: obj ? obj.attrBytes : [] }, ZRamReader.attrsFromObject(mem, cid)),\n                    confidence: 0.85,\n                    discovered: true\n                });"
  );
}

fs.writeFileSync("js/ZRamReader.js", zr);
try { new Function(zr); console.log("ZRamReader OK"); } catch (e) { console.log("FAIL", e.message); }

// Retest LostPig
eval(fs.readFileSync("js/ZRamReader.js","utf8"));
const b=fs.readFileSync("harness/fixtures/LostPig.z8");
const mem=new DataView(b.buffer,b.byteOffset,b.byteLength);
const snap=ZRamReader.snapshot(mem);
console.log({count:snap.objectCount, player:snap.playerId, playerName:ZRamReader.shortName(mem,snap.playerId), room:snap.roomId, roomName:snap.roomName, scope:(snap.discoveredObjects||[]).slice(0,10).map(o=>o.name+":"+o.id)});
