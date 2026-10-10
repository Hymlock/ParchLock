var TranslatorUI = {
    lastSig: "",
    engineMode: "heuristic",
    // Player-facing ParchLock chrome only. Metrics/debug stay hidden unless opted in.
    debugVisible: () => {
        try {
            if (typeof Global !== "undefined" && Global.Prefs && Global.Prefs.DebugTranslator) return true;
            var q = (location.search || "").toLowerCase();
            return q.indexOf("debug=1") >= 0 || q.indexOf("debugtranslator=1") >= 0;
        } catch (e) { return false; }
    },

    ensureChrome: () => {
        if (!$("#pl-special-commands").length) {
            $("<div>").attr("id", "pl-special-commands").attr("aria-live", "polite").prependTo("body");
        }
        if (!$("#pl-hud-metrics").length) {
            $("<div>").attr("id", "pl-hud-metrics").attr("title", "Heuristic / probe metrics (not engine truth)").appendTo("#map-stats");
        }
        if (!$("#pl-floor-tabs").length) {
            $("<div>").attr("id", "pl-floor-tabs").insertAfter("#map-toolbar");
        }
    },

    signature: (p) => {
        if (!p) return "";
        return JSON.stringify([p.roomId, p.roomName, p.exits, p.inventory, p.specialCommands, p.discoveredObjects, p.hudMetrics]);
    },

    applyRoom: (p) => {
        if (!p || !p.roomName || typeof ParchLockMap === "undefined") return;
        if (typeof MapIdentity !== "undefined") MapIdentity.migrateAll();
        // D72: `MapTopology.tick()` (already run earlier this same tick --
        // see `TranslatorUI.tick` below) is the sole authoritative room-
        // identity/graph writer, keying rooms by real RAM id (D47/D62).
        // This used to call the legacy `ParchLockMap.EnteredRoom(roomName,
        // null)` purely to reach its `Draw()`/`Save()`/`RebuildRoomsList()`
        // side effects -- but `EnteredRoom` ALSO independently runs its own
        // NAME-STRING "create this room if I can't find it" check
        // (`Map.js`, pre-dates the RAM-deterministic rewrite) as a side
        // effect of being called at all. Confirmed live on wump2ka.z5.js:
        // during a real room transition, `payload.roomName`'s exact string
        // did not always match whatever name `MapTopology` had already
        // filed the SAME real room under a moment earlier in the same
        // turn, so this second, uncoordinated lookup created a genuine
        // duplicate room record -- unlinked, with no real RAM id (a
        // `MapIdentity.hashName` stub), permanently forking the map graph
        // for that real room. This isn't Wumpus's own procedural
        // randomness (D58) -- it's two of our own systems racing to
        // establish room identity through two different keys (real id vs.
        // name string) for the exact same tick. `EnteredRoom`'s actual job
        // here was never identity (MapTopology already owns that
        // completely) -- only its draw/persist side effects were ever
        // needed, so those are now called directly instead, without ever
        // re-deriving or re-creating the room by name.
        // D112: single shared refresh point (also covers the Notes section
        // and the add-note button's enabled state).
        try { ParchLockMap.NotesScopeRoomKey = null; ParchLockMap.RefreshMapPanels(); } catch (e) {}
        // D72 (continued): `MapIdentity.applyExits` is the SAME anti-
        // pattern under a different name -- it re-processes this exact
        // `p.exits` array with its own independent
        // `if (!ParchLockMap.GetRoom(roomName)) { ParchLockMap.Rooms.push(...
        // ObjectId: MapIdentity.hashName(roomName) ...) }` create-by-name
        // fallback (a "Phase 5" mechanism, per its own file header comment,
        // that pre-dates `MapTopology`'s real-id-based graph). Everything
        // it does to an EXISTING room (ExitMeta hints for locked/zDelta)
        // is already done more completely by `MapTopology.applyPayloadExits`
        // (already run this same tick via `MapTopology.tick`, using
        // `classifyExit`'s real isLocked/confidence data from the identical
        // `payload.exits` array) -- so this call is now removed entirely,
        // closing the second of the two duplicate-room-creation vectors
        // found live in the same investigation as the `EnteredRoom` one
        // above. `MapIdentity.migrateAll()` above is left in place: it only
        // back-fills an `ObjectId` on rooms that ALREADY exist in
        // `ParchLockMap.Rooms` (for old saved-map compatibility), never
        // creates a new room from a name string, so it carries none of
        // this same risk.
        TranslatorUI.renderFloors();
    },

    applyInventory: (p) => {
        if (!p || typeof Actionable === "undefined") return;
        var inv = p.inventory || [];
        if (!inv.length) return;
        var flat = [];
        var renderTree = function (nodes, depth) {
            (nodes || []).forEach(function (n) {
                var name = typeof n === "string" ? n : (n.name || "");
                if (!name) return;
                /* D24: inventory tree is RAM-scope, not printed-text TextGate. */
                flat.push({ name: name, depth: depth || 0, attrs: (n && n.attrs) || {} });
                if (n && n.children) renderTree(n.children, (depth || 0) + 1);
            });
        };
        // support flat strings or tree nodes
        if (inv.length && typeof inv[0] === "string") {
            inv.forEach(function (s) { flat.push({ name: s, depth: 0, attrs: {} }); });
        } else {
            renderTree(inv, 0);
        }
        Actionable.Scope.inventoryNouns = flat.map(function (x) { return x.name.toLowerCase(); });
        Actionable.Scope._inventoryTree = flat;
        if (typeof Actionable.RenderInventory === "function") Actionable.RenderInventory();
    },

    applySpecialCommands: (p) => {
        TranslatorUI.ensureChrome();
        var box = $("#pl-special-commands").empty();
        var cmds = (p && p.specialCommands) || [];
        var rendered = 0;
        cmds.forEach(function (c) {
            var label = typeof c === "string" ? c : (c.label || c.command || "");
            var command = typeof c === "string" ? c : (c.command || c.label || "");
            if (!label) return;
            // Dictionary verbs belong on the input-line radial (D34
            // follow-up / D26), not as a 200-button special-commands bar.
            if (typeof c === "object" && c.source === "dictionary-verb") return;
            $("<button>").text(label).attr("type", "button").appendTo(box).on("click", function () {
                if (typeof Actionable !== "undefined" && Actionable.Submit) Actionable.Submit(command);
                else if (typeof Input !== "undefined" && Input.Inject) { Input.Inject(command); Input.Enter && Input.Enter(); }
            });
            rendered++;
        });
        // Visibility must follow what actually got appended, not the raw
        // pre-filter payload count -- a payload whose specialCommands are
        // entirely dictionary-verb-sourced (or otherwise unlabeled) filters
        // down to zero buttons above, and showing an empty bordered box in
        // that case is a visible dead artifact, not a legitimate chrome
        // element (it was never clickable or draggable; it's an empty div).
        if (!rendered) { box.hide(); return; }
        box.show();
    },

    applyHud: (p) => {
        TranslatorUI.ensureChrome();
        var el = $("#pl-hud-metrics").empty();
        if (!TranslatorUI.debugVisible()) { el.hide(); return; }
        el.show();
        var metrics = (p && p.hudMetrics) || [];
        if (!metrics.length) return;
        metrics.slice(0, 8).forEach(function (m) {
            var label = typeof m === "string" ? m : ((m.key || m.name || "metric") + ": " + (m.value != null ? m.value : ""));
            $("<span>").addClass("pl-hud-chip").attr("title", "Labeled heuristic / probe - not unlabeled engine truth").text(label).appendTo(el);
        });
    },

    applyDiscovered: (payload) => {
        /* APPLY_ROOM_FROM_RAM SYNC_CURRENT_ROOM */
        var p = payload;
        try {
            // D74: resolve through MapTopology's real-id-first identity,
            // not the raw payload string (which some games re-randomize on
            // revisit, e.g. wump2ka.z5.js -- see MapTopology.js's own
            // comment on `resolveCurrentRoomName` for the full mechanism).
            if (p && p.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = (typeof MapTopology !== "undefined" && MapTopology.resolveCurrentRoomName)
                    ? MapTopology.resolveCurrentRoomName(p)
                    : p.roomName;
            }
        } catch (e) {}

        if (!p || typeof Actionable === "undefined") return;
        var objs = p.discoveredObjects || [];
        if (!objs.length) return;
        var names = objs.map(function (o) { return (o.name || "").toLowerCase(); }).filter(Boolean);
        /* D24: RAM-scope names are visible without a printed-text match. */
        Actionable.Scope.roomNouns = Array.from(new Set((Actionable.Scope.roomNouns || []).concat(names))).slice(0, 60);
    },

    applyActions: (p) => {
        if (typeof ActionSynth === "undefined" || !p) return;
        var cmds = [];
        (p.discoveredObjects || []).concat(p.inventory || []).forEach(function (o) {
            if (!o || !o.name) return;
            ActionSynth.commandsForObject(o, "room").forEach(function (c) { cmds.push(c); });
        });
        window.__PL_ACTION_SYNTH__ = cmds;
    },



    renderFloors: () => {
        TranslatorUI.ensureChrome();
        var tabs = $("#pl-floor-tabs").empty();
        if (typeof ParchLockMap === "undefined") return;
        var floors = {};
        (ParchLockMap.Rooms || []).forEach(function (r) {
            var f = typeof r.Floor === "number" ? r.Floor : 0;
            floors[f] = true;
        });
        var keys = Object.keys(floors).map(Number).sort(function (a, b) { return a - b; });
        if (keys.length <= 1) { tabs.hide(); return; }
        tabs.show();
        keys.forEach(function (f) {
            $("<button>").text("Floor " + f).toggleClass("active", (ParchLockMap.ActiveFloor || 0) === f).on("click", function () {
                ParchLockMap.ActiveFloor = f;
                try { ParchLockMap.Draw(); } catch (e) {}
                TranslatorUI.renderFloors();
            }).appendTo(tabs);
        });
    },

    apply: (payload) => {
        /* SYNC_ROOM_IN_APPLY */
        try {
            // D74: same real-id-first resolution as applyDiscovered above.
            if (payload && payload.roomName && typeof ParchLockMap !== "undefined") {
                ParchLockMap.CurrentRoom = (typeof MapTopology !== "undefined" && MapTopology.resolveCurrentRoomName)
                    ? MapTopology.resolveCurrentRoomName(payload)
                    : payload.roomName;
            }
        } catch (eS) {}

        try { document.documentElement.classList.toggle("pl-debug-translator", !!TranslatorUI.debugVisible()); } catch (e) {}
        if (!payload) return;
        var sig = TranslatorUI.signature(payload);
        if (sig === TranslatorUI.lastSig) return;
        TranslatorUI.lastSig = sig;
        TranslatorUI.engineMode = payload.engineMode || TranslatorUI.engineMode;
        TranslatorUI.applyRoom(payload);
        TranslatorUI.applyInventory(payload);
        TranslatorUI.applySpecialCommands(payload);
        TranslatorUI.applyHud(payload);
        TranslatorUI.applyDiscovered(payload);
        TranslatorUI.applyActions(payload);
        try { window.__PARCHLOCK_TRANSLATOR_UI__ = { sig: sig, mode: TranslatorUI.engineMode, at: Date.now() }; } catch (e) {}
    },

    /* Map.DrawRoom only paints short compass classes (.dir-se). MapTopology
       stores long names (southeast) and RAM look-ahead (exit-12). Until
       Phase 3 retargets Draw, remap cardinals and add the two-way reverse
       so .map-paths still render after GetRoom stopped calling EnteredRoom. */
    canonicalDir: (label) => {
        var k = String(label || "").toLowerCase().trim();
        var map = {
            north: "n", n: "n", south: "s", s: "s",
            east: "e", e: "e", west: "w", w: "w",
            northeast: "ne", ne: "ne", northwest: "nw", nw: "nw",
            southeast: "se", se: "se", southwest: "sw", sw: "sw",
            up: "up", u: "up", down: "down", d: "down",
            in: "in", out: "out"
        };
        return map[k] || null;
    },

    remapRoomExitKeys: (room) => {
        if (!room || !room.Exits) return;
        var next = {};
        Object.keys(room.Exits).forEach(function (dir) {
            var short = TranslatorUI.canonicalDir(dir);
            var key = short || dir;
            if (next[key] == null) next[key] = room.Exits[dir];
        });
        room.Exits = next;
        if (room.ExitMeta) {
            var meta = {};
            Object.keys(room.ExitMeta).forEach(function (dir) {
                var short = TranslatorUI.canonicalDir(dir);
                var key = short || dir;
                var prev = meta[key], cur = room.ExitMeta[dir];
                // "n" and "north" fold into one record and the later one wins.
                // Carry MapTopology's walked proof across the fold unless the
                // surviving record names a different destination (World map,
                // bus #1886): a fresh look-ahead under the long key must not
                // erase that the player actually walked this exit.
                if (prev && prev.travelledTo != null && cur && cur.travelledTo == null) {
                    var curTarget = cur.toId != null ? String(cur.toId) : null;
                    if (curTarget ? prev.travelledTo === curTarget : true) cur = Object.assign({}, cur, { travelledTo: prev.travelledTo });
                }
                meta[key] = cur;
            });
            room.ExitMeta = meta;
        }
    },

    ensureDrawableCompass: (prevName, payload, lastCmd) => {
        if (typeof ParchLockMap === "undefined") return;
        (ParchLockMap.Rooms || []).forEach(TranslatorUI.remapRoomExitKeys);
        var currName = payload && payload.roomName;
        var dir = TranslatorUI.canonicalDir(lastCmd);
        if (!dir || !prevName || !currName) return;
        if (String(prevName).toLowerCase() === String(currName).toLowerCase()) return;
        if (typeof MapTopology === "undefined" || !MapTopology.link) return;
        MapTopology.link(prevName, dir, currName, { source: "state-delta-short", confidence: 0.98 });
        // No assumed reverse link is recorded: maps are not symmetric (Zork's
        // West of House). The return path is shown automatically and dotted by
        // Map.js until it is actually walked.
        (ParchLockMap.Rooms || []).forEach(TranslatorUI.remapRoomExitKeys);
    },

    tick: () => {
        var prevName = "";
        var lastCmd = "";
        try {
            if (typeof MapTopology !== "undefined") {
                prevName = MapTopology.prevRoomName || "";
                lastCmd = MapTopology.lastCommand || "";
            }
        } catch (eP) {}
        try { if (typeof MapTopology !== "undefined" && MapTopology.tick) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (eMT) {}
        if (typeof WorldModel === "undefined") return;
        var p = WorldModel.lastPayload || (WorldModel.tick && WorldModel.tick());
        try { (ParchLockMap.Rooms || []).forEach(TranslatorUI.remapRoomExitKeys); } catch (eC) {}
        TranslatorUI.apply(p);
    }
};
