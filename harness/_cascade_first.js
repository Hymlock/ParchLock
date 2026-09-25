const fs = require("fs");

// Align ZRamProvider to RAM-cascade-first: player ? parent(location) ? scope/exits.
// Text/status matching is fallback ONLY when parent is missing/meta ? never primary.
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
    isMetaName: function (nm) {
        nm = String(nm || "");
        if (!nm || nm.charAt(0) === "(") return true;
        return /^(class|object|routine|string|kind|nothing|compass|compassdirection|direction|directions)$/i.test(nm);
    },
    // Primary: location from parent(player). Fallback: Inform location global, then (last resort) status/text.
    resolveLocationId: function (mem, playerId) {
        if (playerId) {
            var pl = ZRamReader.objectLinks(mem, playerId);
            if (pl && pl.parent > 1) {
                var pn = ZRamReader.shortName(mem, pl.parent) || "";
                if (!ZRamProvider.isMetaName(pn)) return pl.parent;
            }
        }
        if (typeof ZRamReader.findLocationGlobal === "function") {
            var g = ZRamReader.findLocationGlobal(mem, playerId || 0);
            if (g) return g;
        }
        // Last resort only ? not the main decoder
        if (typeof ZRamReader.findLikelyLocation === "function") {
            var status = "";
            try {
                if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) status = String(ParchLockMap.CurrentRoom);
            } catch (e) {}
            var loc = ZRamReader.findLikelyLocation(mem, playerId || 0, status);
            if (loc) return loc;
        }
        return 0;
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
        var playerId = snap.playerId || ZRamReader.findPlayerId(mem) || 0;
        var roomId = ZRamProvider.resolveLocationId(mem, playerId);
        var roomName = roomId ? (ZRamReader.shortName(mem, roomId) || "") : "";
        if (ZRamProvider.isMetaName(roomName)) {
            roomId = 0;
            roomName = "";
        }
        var discovered = [];
        var exits = [];
        var inventory = [];
        if (roomId) {
            discovered = ZRamReader.scopeObjects(mem, roomId, { depth: 2 }).filter(function (o) {
                return o && o.name && !ZRamProvider.isMetaName(o.name);
            });
            exits = ZRamReader.lookAheadExits(mem, roomId);
        }
        if (playerId) {
            ZRamReader.children(mem, playerId).forEach(function (cid) {
                var name = ZRamReader.shortName(mem, cid);
                if (!name || ZRamProvider.isMetaName(name)) return;
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
        var conf = roomId && discovered.length ? 0.95 : (roomId ? 0.7 : 0.35);
        return {
            sources: [{ name: "z-ram", confidence: conf }],
            engineMode: "structural",
            vmType: "z",
            roomId: roomId || null,
            roomName: roomName,
            discoveredObjects: discovered,
            inventory: inventory,
            exits: exits || [],
            probe: {
                status: "z-ram-live",
                playerId: playerId,
                roomId: roomId || 0,
                scopeCount: discovered.length
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
try { new Function(fs.readFileSync("js/ZRamProvider.js", "utf8")); console.log("ZP cascade-first OK"); }
catch (e) { console.log("ZP FAIL", e.message); }

// Note in plan: location is as-you-go from parent(player)
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (!plan.includes("as-you-go location")) {
  plan = plan.replace(
    "3. Location cascade: `roomId = parent(player)`; room short name from props.",
    "3. **As-you-go location cascade:** each turn decode only the current room ? `roomId = parent(player)` when valid; room short name from props. Do not pre-scan the whole game; map grows via look-ahead + state-delta as the player moves."
  );
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
console.log("plan note", plan.includes("as-you-go location") || fs.readFileSync("PRODUCTION_PLAN.md","utf8").includes("as-you-go location"));
