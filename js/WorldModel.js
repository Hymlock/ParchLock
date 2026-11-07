var WorldModel = {

    engineMode: "heuristic",
    lastPayload: null,
    providers: [],

    registerProvider: (provider) => {
        if (!provider || !provider.name) return;
        WorldModel.providers = WorldModel.providers.filter(function (p) { return p.name !== provider.name; });
        WorldModel.providers.push(provider);
    },

    // D158: every provider registers itself from a `setTimeout(..., 0)` at
    // script load. A navigation that lands between the script executing and
    // that timer firing throws the timer away, and nothing ever registers
    // again -- the provider objects all exist, `WorldModel.providers` is
    // empty, and the entire payload is dead: no underlined words, no
    // inventory, no map, no stats, engineMode stuck on "heuristic".
    //
    // Reproduced by finishing the tutorial, whose last act is
    // `location.replace(location.href)` to restart the module, and reported
    // independently by the operator after saving and loading a game. It is a
    // race, so it strikes intermittently -- measured three times over ten
    // runs -- and it looks permanent from the player's side because every
    // subsequent turn re-collects from the same empty registry.
    //
    // Re-registering from the objects themselves is idempotent
    // (registerProvider replaces by name) and costs one array check per
    // collect when the registry is already populated.
    ensureProviders: function () {
        WorldModel.providers = WorldModel.providers || [];
        var has = function (name) {
            return WorldModel.providers.some(function (provider) {
                return provider && provider.name === name;
            });
        };
        var wire = function (name, obj, fn) {
            try {
                if (typeof obj === "undefined" || !obj || has(name)) return;
                WorldModel.registerProvider({ name: name, collect: fn });
            } catch (e) {}
        };
        try { wire("z-ram", typeof ZRamProvider !== "undefined" && ZRamProvider,
            function () { return ZRamProvider.collect(); }); } catch (e) {}
        try { wire("grammar-ram", typeof GrammarProvider !== "undefined" && GrammarProvider,
            function () { return GrammarProvider.collect(); }); } catch (e) {}
        try { wire("buffer-tap", typeof BufferTapProvider !== "undefined" && BufferTapProvider,
            function () { return BufferTapProvider.collect(); }); } catch (e) {}
        try { wire("dark-scope", typeof DarkScope !== "undefined" && DarkScope,
            function () { return DarkScope.collect(); }); } catch (e) {}
        try { wire("graphics-dock", typeof GraphicsDock !== "undefined" && GraphicsDock,
            function () { return GraphicsDock.collect(); }); } catch (e) {}
        try {
            if (typeof GlkTapProvider !== "undefined" && GlkTapProvider && GlkTapProvider.collect) {
                if (!has(GlkTapProvider.name)) WorldModel.registerProvider(GlkTapProvider);
            }
        } catch (e) {}
        try {
            if (typeof EmglkenProvider !== "undefined" && EmglkenProvider) {
                if (!has(EmglkenProvider.name)) WorldModel.registerProvider(EmglkenProvider);
            }
        } catch (e) {}
    },

    createEmptyPayload: () => ({
        engineMode: WorldModel.engineMode,
        vmType: "unknown",
        schemaId: null,
        sources: [],
        roomId: null,
        playerId: null,
        roomName: "",
        roomConfidence: 0,
        exits: [],
        inventory: [],
        discoveredObjects: [],
        // D184: unnamed-but-vocabulary-owning objects, decided in Actionable.
        unnamedCandidates: [],
        hudMetrics: [],
        specialCommands: [],
        resourceWarnings: [],
        darkness: false,
        nativeGraphicsActive: false,
        glkBounds: null,
        probe: null
    }),

    isStructuralFact: (extra) => {
        if (!extra) return false;
        if (extra.engineMode === "structural") return true;
        if (extra.probe && extra.probe.status === "z-ram-live") return true;
        return (extra.sources || []).some(function (s) {
            if (!s || !s.name) return false;
            var n = String(s.name);
            if (n !== "z-ram" && n !== "glulx-ram" && n !== "live-heap") return false;
            return (s.confidence || 0) >= 0.5;
        });
    },

    idBacked: (arr) => {
        return (arr || []).filter(function (o) {
            return o && o.id != null && o.id !== "" && o.name;
        });
    },

    /* Recover player inventory from RAM parent links when the z-ram
       provider's children(probe.playerId) is empty. Anchorhead's live
       player object is the unnamed parent of worn items (id 20), while
       findPlayerId can return a named "player" class (id 654) with no
       children. Uses attrs.worn + parentId only — never printed text.
       Note (D31): this fallback only pulls DIRECT children of the
       recovered parent id, same one-level limit the primary inventory
       path had before it was fixed to recurse via
       ZRamReader.walkVisibleDescendants. No catalog story currently
       exercises this fallback WITH a nested held container (Anchorhead,
       the only story known to need this path, has no such case in the
       regression suite), so it hasn't been extended to recurse — if a
       story is ever found that needs both this recovery path and nested
       container visibility, extend this the same way. */
    recoverInventory: (payload) => {
        var inv = WorldModel.idBacked(payload && payload.inventory);
        if (inv.length) return inv;
        // A digest-pinned player that is not yet initialized means "no holder": never recover one from worn bits
        // (Codex #3566).
        if (payload && payload.probe && payload.probe.playerSource === "fact-uninitialized") return inv;
        var objs = (payload && payload.discoveredObjects) || [];
        // D58/D68: only structurally truly-worn objects identify inventory root.
        // scenery+worn (Glow Bar) must not promote a CustomPlayer wrapper.
        // A room is never an inventory holder: worn-flagged scenery lying in the room itself (BibleRetold's beard,
        // sandals, robe in the Large Grassy Field) must not promote the room to holder and list the room as inventory.
        var roomIds = {};
        [payload && payload.roomId, payload && payload.probe && payload.probe.roomId].forEach(function (r) { if (r != null && r !== "" && r !== 0) roomIds[String(r)] = true; });
        var worn = objs.filter(function (o) {
            if (!o || o.parentId == null || !o.attrs) return false;
            // D16 P16: a labelSuppressed row is never a recovery seed.
            if (o.labelSuppressed === true) return false;
            if (roomIds[String(o.parentId)]) return false;
            // D232: a room-visible local global's parent is the LOCAL-GLOBALS holder, never an inventory root.
            if (o.localGlobal) return false;
            if (typeof AttributeSchema !== "undefined" && AttributeSchema.isTrulyWorn) {
                return AttributeSchema.isTrulyWorn(o.attrs);
            }
            if (!(o.attrs.worn || o.attrs.isWorn)) return false;
            if (o.attrs.scenery && !(o.attrs.clothing || o.attrs.wearable)) return false;
            return true;
        });
        var pid = worn.length ? worn[0].parentId : (payload && payload.probe && payload.probe.playerId);
        if (pid == null || pid === "") return inv;
        return WorldModel.idBacked(objs.filter(function (o) {
            return o && o.parentId != null && String(o.parentId) === String(pid);
        }));
    },

    /* findPlayerId()/probe.playerId can name the wrong object on games
       whose real PC instance differs from the generic named "player"
       class Inform declares (Anchorhead: probe.playerId resolves to the
       named class object 654, but every actual inventory item's real
       parentId is the unnamed PC instance 20 — the same ambiguity
       recoverInventory already routes around for discoverability). If
       ActionSynth (heldContainerName/payloadPlayerId) trusts the wrong
       probe.playerId, it misreads every top-level held item as nested
       inside an unknown container, suppressing drop/examine/wear/remove
       entirely (D31 regression). Correct payload.playerId to whichever
       parentId actually holds the recovered inventory — the parentId
       shared by inventory items that is NOT itself the id of another
       inventory item (a genuine nested container's id WOULD appear in
       this same array; the true player object never does). */
    correctPlayerId: (payload) => {
        var inv = (payload && payload.inventory) || [];
        if (!inv.length) return payload && payload.playerId;
        var itemIds = {};
        inv.forEach(function (o) { if (o && o.id != null) itemIds[String(o.id)] = true; });
        var counts = {};
        inv.forEach(function (o) {
            if (!o || o.parentId == null) return;
            // D16 P16: a labelSuppressed row never votes for the holder.
            if (o.labelSuppressed === true) return;
            var key = String(o.parentId);
            if (itemIds[key]) return;
            counts[key] = (counts[key] || 0) + 1;
        });
        var bestKey = null, bestCount = 0;
        Object.keys(counts).forEach(function (k) {
            if (counts[k] > bestCount) { bestCount = counts[k]; bestKey = k; }
        });
        if (bestKey == null) return payload.playerId;
        var numeric = +bestKey;
        return isNaN(numeric) ? bestKey : numeric;
    },

    // A room's compiled Z-machine short-name property is not always the
    // same string the game shows the player (D53 audit, wump2ka.z5.js: a
    // procedurally-generated dungeon crawl compiles each room's short name
    // as an internal debug-style label like "C_ROOMS_3", while what the
    // player actually sees -- in this game's own status bar -- is "Room
    // #3 / A vast, rough room"). This produced garbled "C_ROOMS_N" labels
    // throughout the map and Known Rooms panel. Per D47, a room's real
    // identity is its RAM ObjectId, never its display Name -- so refining
    // the display string to match what the game itself already shows the
    // player is not a text-mining/identity concern (D24/D25 govern
    // discoveredObjects/exits/inventory/room IDENTITY, not a cosmetic
    // label), the same carve-out D9/D12 already give HUD/behavioral text.
    // Reads the story's own status GridWindow (`.GridWindow.reverse`,
    // already a recognized convention in this codebase for the reversed
    // status/subheader row -- not new text-mining machinery), takes the
    // first whitespace-padded column (room name/title only, discarding any
    // second column like score/health that some games pack onto the same
    // row), and prefers it over the raw RAM short name only when it looks
    // like real text. Never touches roomId/ObjectId or any structural
    // field -- exits/inventory/discoveredObjects/identity are untouched.
    // D80: live Playwright capture (real DOM text, not assumed) proved
    // `.GridWindow.reverse`'s text for a game like wump2ka.z5.js is NOT
    // multiple newline-separated lines -- it is ONE line packing multiple
    // 3+-space-gap-separated COLUMNS, e.g. "Room #19   Score: 2   A vast,
    // creased, watery room   Health: 73%". D54's original "first column of
    // the first line" logic therefore always picked the generic id column,
    // never the real descriptive title sitting in a later column of that
    // SAME line. Anchorhead ("Outside the Real Estate Office   day one")
    // and Zork1 ("Clearing   Score: 0  Turns: 5") only ever have ONE
    // real-title column plus standard status metadata, so they were never
    // affected. Fix: split the whole text into columns (real newlines, if
    // a game ever emits them, are treated as column breaks too, so this
    // still covers that shape), discard any column that is a bare
    // generic room-id label or a standard IF status-bar metric (Score/
    // Health/Moves/Turns -- genre-wide conventions, not per-title), and
    // take the first surviving column. A single-column game's own title
    // never matches either discard pattern, so its behavior is unchanged.
    // M14: a status-grid label that cannot be a room name (fewer than two
    // letters in a row, or a bare direction word).
    _validGridRoomLabel: (label) => {
        var t = String(label || "").trim();
        if (!/[A-Za-z]{2}/.test(t)) return false;
        return !/^(n|s|e|w|ne|nw|se|sw|u|d|up|down|in|out|north|south|east|west|northeast|northwest|southeast|southwest)$/.test(t.toLowerCase());
    },
    refineRoomDisplayName: (payload) => {
        if (!payload) return "";
        // Status text is presentation only. Without either an existing
        // compiled label or a structural room ID there is nothing to label.
        if (!payload.roomName && payload.roomId == null) return "";
        try {
            // D165: the status row is only a BETTER source than RAM when RAM
            // has nothing player-facing to offer. D54/D80 introduced this for
            // wump2ka, whose rooms compile to internal labels like "C_ROOMS_3"
            // -- there the printed row genuinely is the only real name.
            //
            // When RAM already holds a real name, reading the row instead can
            // only lose. The status window is a fixed-width character grid, and
            // on a phone it has about 31 columns against 48 on desktop, so a
            // game that right-aligns a second field writes it over the first:
            // Anchorhead's row reads "Outside the Real Estatday onee" at 412px,
            // and that string was being adopted as the room's name -- into the
            // map, Known Rooms and the tracker. That is D137 surfacing as a
            // visibly corrupted name rather than as a missing stat.
            //
            // So the row is consulted only for a room whose own compiled name
            // is internal/meta. Every other game keeps the name the story file
            // itself carries, at any screen width.
            try {
                if (payload.roomName && typeof MapTopology !== "undefined" && MapTopology.isInternalRoomName
                    && !MapTopology.isInternalRoomName(payload.roomName)) {
                    return payload.roomName;
                }
            } catch (eInt) {}
            // D219 / M12: a structurally resolved room whose compiled short
            // name is blank takes the story's own name (I7 short_name) before
            // any status-line column. WiR's status line is only a date. A
            // story without that source keeps the status path below.
            try {
                if (payload.roomId != null && !payload.roomName && typeof ZRamReader !== "undefined"
                    && ZRamReader.storyShortName && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                    var storyName = ZRamReader.storyShortName(ZRamProvider.getMem(), Number(payload.roomId));
                    if (storyName) return storyName;
                }
            } catch (eStory) {}
            // D201: this owner also accepts an honestly blank compiled label,
            // but only after the provider has supplied a structural roomId.
            // The decoder returns presentation and metrics, never identity.
            if (payload.roomId != null && typeof StatusGridDecoder !== "undefined"
                && StatusGridDecoder.fromDocument) {
                var translated = StatusGridDecoder.fromDocument(document);
                // M14: a room whose compiled name is internal/meta (Book and
                // Volume's "(Hallway)") whose status grid is not a name row
                // (that game draws an ASCII street map, giving "|" or "down")
                // takes the story's own short_name instead. A valid grid label
                // keeps winning: storyShortName misreads several I6 games
                // (MakeItGood, dewdrops, vespers). With no valid story name the
                // label stays blank rather than showing the grid fragment.
                var internalName = false;
                try {
                    internalName = !!payload.roomName && typeof MapTopology !== "undefined"
                        && !!MapTopology.isInternalRoomName && MapTopology.isInternalRoomName(payload.roomName);
                } catch (eInt2) {}
                if (internalName && translated.roomLabel && !WorldModel._validGridRoomLabel(translated.roomLabel)) {
                    var storyFallback = "";
                    try {
                        if (typeof ZRamReader !== "undefined" && ZRamReader.storyShortName
                            && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                            storyFallback = String(ZRamReader.storyShortName(ZRamProvider.getMem(), Number(payload.roomId)) || "").trim();
                        }
                    } catch (eStory2) {}
                    return /[A-Za-z]{2}/.test(storyFallback) ? storyFallback : "";
                }
                if (translated.roomLabel) return translated.roomLabel;
            }
            if (typeof $ === "undefined") return payload.roomName || "";
            var el = $(".GridWindow.reverse").first();
            if (!el || !el.length) return payload.roomName || "";
            var raw = String(el.clone().find("style").remove().end().text() || "");
            var columns = raw
                .split(/\r?\n| {3,}/)
                .map(function (col) { return col.trim(); })
                .filter(function (col) { return !!col; });
            if (!columns.length) return payload.roomName || "";
            var genericRoomNumber = /^(Room\s*#?\s*\d+|#\d+)$/i;
            var statusMetric = /^(Score|Health|Moves?|Turns?)\s*:/i;

            // D170: the column split needs 3+ spaces, and on a phone there are
            // none to find. The status window is a fixed-width character grid
            // about 31 columns wide at 412px against 48 on desktop (D137), so a
            // right-aligned metric is written hard up against a room name that
            // has itself been truncated to fit. Measured live on wump2ka at
            // 412px: "A fair-sized, pocked, watery caverHealth: 83%" -- one
            // column, matching neither discard pattern, adopted whole as the
            // room's name and then unable to match its own printed banner.
            //
            // Stripping a metric that is glued to the end of a column recovers
            // the name. It stays TRUNCATED ("caver", not "cavern") because the
            // grid really did cut it off, and inventing the missing letters
            // would be a guess (D24/D61) -- the banner matching in
            // js/Actionable.js tolerates that truncation instead.
            var stripGluedMetric = function (col) {
                return col.replace(/\s*(Score|Health|Moves?|Turns?)\s*:\s*\S*\s*$/i, "").trim();
            };
            columns = columns.map(stripGluedMetric).filter(function (col) { return !!col; });
            if (!columns.length) return payload.roomName || "";

            var banner = columns.find(function (col) {
                return !genericRoomNumber.test(col) && !statusMetric.test(col);
            });
            return banner || columns[0];
        } catch (e) { return payload.roomName || ""; }
    },

    // D65: payload.exits (until now) came ONLY from RAM providers' own
    // pre-travel lookahead (ZRamReader.lookAheadExits), which D61 gated
    // to Inform-compiled games only -- a real, honest absence for any
    // other compiler (ZIL-compiled Zork1/2/3, v3 header), not a guess.
    // But MapTopology.applyStateDelta already records a compiler-agnostic,
    // 100% real fact for every game: once the player actually types a
    // direction and actually moves, that edge is written onto the FROM
    // room's own `Exits` map (`room.Exits[dir] = destId`). Nothing fed
    // that already-known, already-confirmed fact back into payload.exits,
    // so the radial (Qol.js) and Actionable's direction highlighting only
    // ever offered directions for Inform games with a working RAM
    // lookahead -- confirmed live on Zork1 (no directions ever appeared in
    // the radial, even standing in a room whose exit had just been
    // traveled and was already visibly linked on the map). This merges in
    // any exit already confirmed for the CURRENT room's own map entry,
    // never overriding a pre-travel entry that's already present (a
    // pre-travel RAM hint outranks nothing here -- this only ADDS entries
    // for directions with no existing hint at all).
    mergeConfirmedExits: (payload) => {
        var exits = (payload && payload.exits) || [];
        try {
            if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return exits;
            var curRoom = null;
            if (payload.roomId != null && payload.roomId !== "") {
                curRoom = ParchLockMap.Rooms.find(function (r) {
                    return r && r.HasRealId && String(r.ObjectId) === String(payload.roomId);
                });
            }
            if (!curRoom && payload.roomId == null && payload.roomName && typeof ParchLockMap.GetRoom === "function") {
                curRoom = ParchLockMap.GetRoom(payload.roomName);
            }
            if (!curRoom || !curRoom.Exits) return exits;
            // D69: `TranslatorUI.remapRoomExitKeys` deliberately keeps every
            // room's own `Exits` keys in SHORT/abbreviated form ("nw"/"se"/
            // "e"/"w") so `Map.js Draw()`'s `#map .room.dir-XXX` slot lookup
            // works -- but RAM pre-travel lookahead labels are always the
            // FULL word ("northwest"/"southeast"/"east"/"west"). Comparing
            // the two forms directly (as this function originally did)
            // never recognized them as the same direction, so a room with
            // both a RAM hint AND a confirmed short-form entry for the same
            // real exit got BOTH pushed into `payload.exits` as if they were
            // two different directions -- confirmed live on Anchorhead's
            // starting room, whose radial showed "northwest" and "nw" (and
            // "southeast"/"se", "east"/"e", "west"/"w") side by side.
            // `MapTopology.normalizeLabel` is the existing, single-source-of-
            // truth short-to-long canonicalizer already used everywhere else
            // in this exact system (`classifyExit`/`link`/state-delta) --
            // reused here rather than inventing a second alias table.
            var canonOf = function (dir) {
                return (typeof MapTopology !== "undefined" && MapTopology.normalizeLabel)
                    ? MapTopology.normalizeLabel(dir)
                    : dir;
            };
            var haveLabel = {};
            exits.forEach(function (e) {
                var lab = String((e && e.label) || "").toLowerCase();
                if (!lab) return;
                haveLabel[lab] = true;
                haveLabel[canonOf(lab)] = true;
            });
            Object.keys(curRoom.Exits).forEach(function (dir) {
                var canon = canonOf(dir) || dir;
                if (haveLabel[dir] || haveLabel[canon]) return;
                // D223: an unwalked Map_Storage hint is never "confirmed".
                var em = curRoom.ExitMeta && curRoom.ExitMeta[dir];
                if (em && em.source === "i7-mapstorage" && !em.travelledTo) return;
                exits.push({ label: canon, command: canon, confidence: 0.99, confirmed: true });
                haveLabel[dir] = true;
                haveLabel[canon] = true;
            });
        } catch (e) {}
        return exits;
    },

    collectHeuristic: () => {
        /* D24: heuristic is HUD/meta telemetry only. Never a source for
           discoveredObjects / exits / inventory / roomName / roomId. */
        return {
            sources: [{ name: "heuristic", confidence: 0 }],
            roomName: "",
            roomConfidence: 0,
            roomId: null,
            exits: [],
            inventory: [],
            discoveredObjects: []
        };
    },

    collectProviders: () => {
        WorldModel._providerFacts = [];
        var merged = {
            sources: [],
            roomName: "",
            roomConfidence: 0,
            roomId: null,
            playerId: null,
            exits: [],
            inventory: [],
            discoveredObjects: [],
            unnamedCandidates: [],
            vmType: "unknown",
            probe: null,
            engineMode: WorldModel.engineMode,
            specialCommands: [],
            hudMetrics: []
        };

        WorldModel.ensureProviders();

        var h = WorldModel.collectHeuristic();
        merged.sources = h.sources.slice();

        (WorldModel.providers || []).forEach(function (provider) {
            try {
                if (typeof provider.collect !== "function") return;
                var extra = provider.collect() || {};
                WorldModel._providerFacts.push(extra);
                if (extra.sources && extra.sources.length) {
                    merged.sources = merged.sources.concat(extra.sources);
                }
                if (extra.vmType) merged.vmType = extra.vmType;
                if (extra.hudMetrics && extra.hudMetrics.length) {
                    merged.hudMetrics = (merged.hudMetrics || []).concat(extra.hudMetrics);
                }
                if (extra.specialCommands && extra.specialCommands.length) {
                    merged.specialCommands = (merged.specialCommands || []).concat(extra.specialCommands);
                }
                if (!WorldModel.isStructuralFact(extra)) {
                    /* D24: P0/P1 may not fill roomId/roomName/exits/inventory/discoveredObjects */
                    return;
                }
                if (extra.probe) merged.probe = extra.probe;
                if (extra.engineMode) merged.engineMode = extra.engineMode;
                if (extra.roomId) merged.roomId = extra.roomId;
                if (extra.roomName) {
                    merged.roomName = extra.roomName;
                    merged.roomConfidence = Math.max(merged.roomConfidence || 0, extra.roomConfidence || 0.9);
                }
                merged.discoveredObjects = WorldModel.idBacked(extra.discoveredObjects);
                // D184: carried alongside, never merged INTO discoveredObjects.
                // These are candidates, not objects; js/Actionable.js decides.
                merged.unnamedCandidates = extra.unnamedCandidates || [];
                merged.inventory = WorldModel.idBacked(extra.inventory);
                merged.exits = (extra.exits || []).slice();
            } catch (e) {}
        });

        return merged;
    },

    tick: () => {
        var payload = WorldModel.createEmptyPayload();
        var m = WorldModel.collectProviders();
        payload.sources = m.sources;
        payload.roomId = m.roomId || null;
        payload.roomName = m.roomName;
        payload.roomConfidence = m.roomConfidence;
        payload.exits = m.exits;
        payload.inventory = m.inventory;
        payload.discoveredObjects = m.discoveredObjects;
        // D184: candidates ride alongside, never inside, discoveredObjects.
        payload.unnamedCandidates = m.unnamedCandidates || [];
        payload.specialCommands = m.specialCommands || [];
        payload.hudMetrics = m.hudMetrics || [];
        payload.vmType = m.vmType;
        payload.probe = m.probe;
        payload.playerId = (m.probe && m.probe.playerId) || null;
        payload.engineMode = m.engineMode || WorldModel.engineMode;
        payload.discoveredObjects = (function (arr) {
            var best = {};
            (arr || []).forEach(function (o) {
                if (!o || o.id == null || o.id === "" || !o.name) return;
                var k = String(o.id);
                if (!best[k] || (o.confidence || 0) > (best[k].confidence || 0)) best[k] = o;
            });
            return Object.keys(best).map(function (k) { return best[k]; });
        })(payload.discoveredObjects);
        payload.inventory = WorldModel.idBacked(payload.inventory);
        payload.exits = (function (arr) {
            var best = {};
            (arr || []).forEach(function (e) {
                if (!e || !e.label) return;
                var k = String(e.label).toLowerCase();
                if (!best[k] || (e.confidence || 0) > (best[k].confidence || 0)) best[k] = e;
            });
            return Object.keys(best).map(function (k) { return best[k]; });
        })(payload.exits);
        /* Single apply path: collectProviders already exclusive-replaces
           structural fields (including empty z-ram-live rooms). No second
           z-ram collect. recoverInventory uses attrs.worn + parentId only. */
        if (WorldModel.isStructuralFact(payload)) {
            payload.inventory = WorldModel.recoverInventory(payload);
            payload.playerId = WorldModel.correctPlayerId(payload);
            payload.roomName = WorldModel.refineRoomDisplayName(payload);
            // D54: after refinement, meta/internal names are honest absence
            // for map/UI — never leave "(Inform Library)" / "(darkness
            // object)" / C_ROOMS_* as the authoritative roomName.
            try {
                if (typeof MapTopology !== "undefined" && MapTopology.isInternalRoomName
                    && MapTopology.isInternalRoomName(payload.roomName)) {
                    // D201: empty/internal after refine is display absence.
                    // Containment-proven room IDs must keep exits/scope while
                    // the status label catches up -- wiping them erased the
                    // structural identity the rest of D201 just recovered.
                    // Truly meta printed names (C_ROOMS_*, parentheticals)
                    // still clear identity, matching D54.
                    var blankPending = !String(payload.roomName || "").trim();
                    var containmentProven = !!(payload.probe
                        && payload.probe.roomSource === "player-containment"
                        && payload.roomId != null);
                    if (blankPending && containmentProven) {
                        payload.roomName = "";
                    } else {
                        payload.roomName = "";
                        payload.roomId = null;
                        payload.exits = [];
                        payload.discoveredObjects = [];
                    }
                }
            } catch (eMeta) {}
            // D223: reconcile Map_Storage-owned hints BEFORE the confirmed merge.
            try { if (typeof MapTopology !== "undefined" && MapTopology.reconcileI7MapStorage) MapTopology.reconcileI7MapStorage(payload); } catch (eRec) {}
            payload.exits = WorldModel.mergeConfirmedExits(payload);
            if (!payload.engineMode || payload.engineMode === "heuristic") payload.engineMode = "structural";
        }
        WorldModel.lastPayload = payload;
        // D221: one heuristic darkness verdict per tick, on the finalized payload.
        try { if (typeof DarkScope !== "undefined" && DarkScope.noteFromPayload) DarkScope.noteFromPayload(payload); } catch (eDark) {}
        try { window.__PARCHLOCK_WORLD__ = payload; } catch (e) {}
        // D149: one observation per applied payload, which is one per turn.
        // Wrapped in its own try so a tracker fault can never cost the player
        // their world state -- the tracker is a read-only HUD and must degrade
        // to showing nothing rather than break the turn.
        try {
            if (typeof StatTracker !== "undefined" && StatTracker.Tick) StatTracker.Tick();
        } catch (eStat) {}
        return payload;
    }
};

try {
    if (typeof EmglkenProvider !== "undefined" && EmglkenProvider) {
        WorldModel.registerProvider(EmglkenProvider);
    }
} catch (e) {}
