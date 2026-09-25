const fs = require("fs");

// Strip story-specific noun boosts from BufferTap ? heuristic must stay generic
let bt = fs.readFileSync("js/BufferTapProvider.js", "utf8");
bt = bt.replace(/"boxes", "bin", "bins", "alley", "street", "lane", "corner"/g, '"boxes", "bin", "bins", "street", "lane", "corner"');
bt = bt.replace(/\s*add\("garbage can"\); add\("garbage cans"\); add\("can"\); add\("cans"\);?\s*/g, "\n");
bt = bt.replace(/\s*add\("window"\); add\("fence"\);?\s*/g, "\n");
fs.writeFileSync("js/BufferTapProvider.js", bt);
console.log("BufferTap alley whitelist removed", /garbage can|alley/.test(bt));

// ZRamProvider: match location by scoring room short-names against windowport text (holistic)
let zp = fs.readFileSync("js/ZRamProvider.js", "utf8");
if (!zp.includes("matchRoomFromText")) {
  zp = zp.replace(
    "resolveStatusRoom: function () {",
    `matchRoomFromText: function (mem) {
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
                if (/^(class|object|compass|direction|kind)$/i.test(nm)) continue;
                var obj = ZRamReader.objectLinks(mem, id);
                if (!obj) continue;
                var kids = ZRamReader.children(mem, id);
                if (kids.length < 1) continue;
                // Prefer top-level or room-like
                if (obj.parent !== 0 && kids.length < 2) continue;
                var nml = nm.toLowerCase();
                if (nml.length < 4) continue;
                var idx = text.lastIndexOf(nml);
                if (idx < 0) continue;
                // Prefer later mentions (current room description)
                var sc = kids.length * 2 + Math.floor(idx / 50);
                if (obj.parent === 0) sc += 5;
                if (sc > bestSc) { bestSc = sc; best = id; }
            }
            return bestSc >= 6 ? best : 0;
        } catch (e) { return 0; }
    },

    resolveStatusRoom: function () {`
  );
  // In collect, after findLikelyLocation, if still empty use matchRoomFromText
  zp = zp.replace(
    "} catch (eLoc) {}",
    `} catch (eLoc) {}
        try {
            if ((!snap.roomId || !(snap.discoveredObjects || []).length) && typeof ZRamProvider.matchRoomFromText === "function") {
                var mid = ZRamProvider.matchRoomFromText(mem);
                if (mid) {
                    snap.roomId = mid;
                    snap.roomName = ZRamReader.shortName(mem, mid) || "";
                    snap.discoveredObjects = ZRamReader.scopeObjects(mem, mid, { depth: 2 }).filter(function (o) {
                        return o && o.name && String(o.name).charAt(0) !== "(";
                    });
                    snap.exits = ZRamReader.lookAheadExits(mem, mid);
                    snap.confidence = 0.9;
                }
            }
        } catch (eMatch) {}`
  );
  fs.writeFileSync("js/ZRamProvider.js", zp);
}
try { new Function(fs.readFileSync("js/ZRamProvider.js","utf8")); console.log("ZP OK"); } catch (e) { console.log("ZP FAIL", e.message); }
try { new Function(fs.readFileSync("js/BufferTapProvider.js","utf8")); console.log("BT OK"); } catch (e) { console.log("BT FAIL", e.message); }
