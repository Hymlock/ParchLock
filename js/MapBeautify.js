/* MapBeautify ? play.html chrome: floor filter + light untangle for known-rooms list.
 * Keeps compass mental map; does not replace Draw()'s dir grid.
 */
var MapBeautify = {
    nonCardinalSpokes: function () {
        if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return;
        var host = document.getElementById("exits");
        if (!host) return;
        var existing = host.querySelector(".pl-noncardinal");
        var room = ParchLockMap.GetCurrentRoom();

        // D121: these early returns used to fire BEFORE the host lookup, so
        // walking from a room with special exits into one with none left the
        // previous room's spokes on screen indefinitely. Invisible while this
        // block was an unstyled orphan; as a band member it would wrongly
        // hold the story text pushed down for a room that has nothing to
        // show. Clear it instead of bailing.
        if (!room || !room.Exits) {
            if (existing) existing.remove();
            return;
        }

        // D121: this used to unconditionally remove and rebuild the whole
        // block on every call -- and it is called from ParchLock.Loop via
        // TranslatorUI.tick -> MapTopology.tick, i.e. about five times a
        // second, plus a redundant 2.5s interval below. Harmless while it
        // was an unstyled orphan; not harmless now that it is a member of
        // the measured top band (css/ParchLock.css #exits), where every
        // rebuild retriggers the band's height observers and the story
        // buffer's padding. Compute the content signature first and no-op
        // when nothing actually changed, which is the overwhelmingly common
        // case (the exits of a room do not change between turns).
        var spokes = [];
        Object.keys(room.Exits).forEach(function (dir) {
            var meta = (room.ExitMeta && room.ExitMeta[dir]) || {};
            var isNC = meta.isNonCardinal || (typeof MapTopology !== "undefined" && !MapTopology.isCardinal(dir));
            if (!isNC) return;
            var dest = ParchLockMap.Rooms[room.Exits[dir]];
            spokes.push(dir + (dest ? (" -> " + dest.Name) : ""));
        });
        var signature = spokes.join("\u0000");
        if (existing && existing.getAttribute("data-pl-sig") === signature) return;

        if (existing) existing.remove();
        if (!spokes.length) return;
        var wrap = document.createElement("div");
        wrap.className = "pl-noncardinal";
        wrap.setAttribute("data-pl-sig", signature);
        var n = 0;
        Object.keys(room.Exits).forEach(function (dir) {
            var meta = (room.ExitMeta && room.ExitMeta[dir]) || {};
            var isNC = meta.isNonCardinal || (typeof MapTopology !== "undefined" && !MapTopology.isCardinal(dir));
            if (!isNC) return;
            var dest = ParchLockMap.Rooms[room.Exits[dir]];
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pl-exit-noncardinal";
            btn.textContent = dir + (dest ? (" -> " + dest.Name) : "");
            btn.title = "Go: " + dir;
            btn.onclick = function () { if (typeof Actionable !== "undefined") Actionable.SubmitTapMove(Actionable.commandForExitLabel(dir)); };
            wrap.appendChild(btn);
            n++;
        });
        if (n) host.appendChild(wrap);
    },
    iterations: 12,

    ensureFloors: () => {
        if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return;
        ParchLockMap.Rooms.forEach(function (r) {
            if (typeof r.Floor !== "number") r.Floor = 0;
            if (r.ExitMeta) {
                Object.keys(r.ExitMeta).forEach(function (dir) {
                    var z = r.ExitMeta[dir] && r.ExitMeta[dir].zDelta;
                    if (typeof z === "number" && z) {
                        // annotate only; actual floor change happens on travel via TranslatorUI
                    }
                });
            }
        });
        if (typeof ParchLockMap.ActiveFloor !== "number") ParchLockMap.ActiveFloor = 0;
    },

    /* Simple untangle: assign x/y layout hints for rooms-list ordering by BFS from current */
    layoutHints: () => {
        if (typeof ParchLockMap === "undefined") return;
        MapBeautify.ensureFloors();
        var start = ParchLockMap.GetCurrentRoom();
        if (!start) return;
        var queue = [{ id: start.Id, x: 0, y: 0 }];
        var seen = {};
        seen[start.Id] = true;
        var dirs = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1], u: [0, -1], d: [0, 1] };
        while (queue.length) {
            var cur = queue.shift();
            var room = ParchLockMap.Rooms[cur.id];
            if (!room) continue;
            room.LayoutX = cur.x;
            room.LayoutY = cur.y;
            if (!room.Exits) continue;
            Object.keys(room.Exits).forEach(function (dir) {
                var nid = room.Exits[dir];
                if (nid == null || seen[nid]) return;
                var d = dirs[dir] || [1, 0];
                seen[nid] = true;
                queue.push({ id: nid, x: cur.x + d[0], y: cur.y + d[1] });
            });
        }
    },


    applyFloorFilter: () => {
        if (typeof ParchLockMap === "undefined" || typeof $ === "undefined") return;
        MapBeautify.ensureFloors();
        var floor = ParchLockMap.ActiveFloor || 0;
        $("#map #rooms-list #container > div").each(function () {
            var room = $(this).data("room");
            if (!room) return;
            var f = typeof room.Floor === "number" ? room.Floor : 0;
            $(this).toggle(f === floor || ParchLockMap.IsCurrentRoom(room));
        });
        if (typeof TranslatorUI !== "undefined" && TranslatorUI.renderFloors) TranslatorUI.renderFloors();
    },

    tick: () => {
        try { MapBeautify.nonCardinalSpokes(); } catch (e) {}
        try {
            MapBeautify.layoutHints();
            MapBeautify.applyFloorFilter();
        } catch (e) {}
    }
};

try {
    setInterval(function () { if (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms && ParchLockMap.Rooms.length) MapBeautify.tick(); }, 2500);
} catch (e) {}
