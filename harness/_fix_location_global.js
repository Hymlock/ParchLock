const fs = require("fs");
let zr = fs.readFileSync("js/ZRamReader.js", "utf8");

// Replace findLocationGlobal with Inform-style as-you-go: prefer low globals (location)
const start = zr.indexOf("findLocationGlobal:");
const end = zr.indexOf("findPlayerId:", start);
if (start < 0 || end < 0) {
  console.log("bounds", start, end);
} else {
  const body = `findLocationGlobal: (mem, playerId) => {
        var h = ZRamReader.header(mem);
        if (!h) return 0;
        var count = ZRamReader.objectCount(mem, h);
        function isMeta(nm) {
            nm = String(nm || "");
            return !nm || nm.charAt(0) === "(" || /^(class|object|compass|compassdirection|direction|kind|nothing)$/i.test(nm);
        }
        var best = 0, bestScore = -1;
        // Inform as-you-go: location often lives in a low global (esp. global 0 / early slots)
        for (var g = 0; g < 200; g++) {
            var val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val < 2 || val > count) continue;
            if (playerId && val === playerId) continue;
            var nm = ZRamReader.shortName(mem, val) || "";
            if (isMeta(nm)) continue;
            var obj = ZRamReader.objectLinks(mem, val);
            if (!obj) continue;
            var kids = ZRamReader.children(mem, val);
            if (!kids.length) continue;
            var score = 0;
            // Strong preference for early globals (location / real_location)
            if (g <= 3) score += 40;
            else if (g <= 10) score += 25;
            else if (g <= 40) score += 10;
            if (obj.parent === 0) score += 8;
            score += Math.min(kids.length, 12);
            // Player contained in this room's tree?
            for (var i = 0; i < kids.length; i++) if (kids[i] === playerId) score += 50;
            if (score > bestScore) { bestScore = score; best = val; }
        }
        return bestScore >= 20 ? best : 0;
    },

`;
  zr = zr.slice(0, start) + body + zr.slice(end);
  fs.writeFileSync("js/ZRamReader.js", zr);
}
try { new Function(fs.readFileSync("js/ZRamReader.js","utf8")); console.log("findLocationGlobal OK"); }
catch (e) { console.log("FAIL", e.message); }

// ZRamProvider.resolveLocationId already: parent then findLocationGlobal ? good
