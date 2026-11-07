/* ExitCalibrator (D134) -- learns where a compiled game stores its exits, by
 * watching real travel, so the map can show exits it has NOT walked yet.
 *
 * THE GAP THIS CLOSES
 * D61 gated ZRamReader.lookAheadExits to structurally-confirmed Inform-compiled
 * games, correctly: Inform's direction-property convention (props 7-18, scan
 * range 5-31) is a compiler fact, and applying it to ZIL-compiled Zork1
 * produced five phantom "exit-N" directions from properties that coincidentally
 * held valid-looking object ids. The honest consequence was an empty pre-travel
 * exit list for the ENTIRE non-Inform catalog -- Zork 1/2/3, Planetfall,
 * Deadline -- so those maps only ever contained edges the player had personally
 * walked, one direction at a time. Live-confirmed on Zork1: after a six-room
 * walk every room held exactly one exit, the one used to leave it, though
 * "West of House" really has three.
 *
 * WHY NOT JUST DECODE ZIL
 * ZIL does encode exits in properties, but the layout varies by exit type
 * (UEXIT/NEXIT/CEXIT/DEXIT/FEXIT) and the direction-to-property assignment is
 * per-game. Hand-decoding it from assumed byte layouts is precisely the class
 * of guess that produced D61's phantoms -- a wrong compass label is worse than
 * an honest absence, because the map has one fixed physical slot per direction
 * and cannot un-render a wrongly-placed room.
 *
 * WHAT THIS DOES INSTEAD
 * Travel is ground truth. When the player really moves from room A to room B by
 * typing "north", the game itself has just told us that A's north exit leads to
 * B. So: look at every property on A, and see which ones actually contain B.
 * Tally that across real moves. A property number only becomes "this is where
 * north lives" once it has predicted real travel in SEVERAL DIFFERENT ROOMS --
 * one room proves nothing (any byte can coincidentally equal a room id), but
 * the same property holding the correct destination in room after room is the
 * game's own structure showing through.
 *
 * This cannot invent an exit: nothing is emitted for a property that has not
 * already earned its place against real movement. Before calibration the
 * behaviour is byte-for-byte what it is today -- an honest empty list (D24).
 *
 * It is also compiler-agnostic by construction. It learns whatever the game in
 * front of it actually does, which is the operator's standing directive (D61):
 * handle the whole Z-machine family generically, never decode modules one at a
 * time. Emission is nevertheless gated to non-Inform games so D61's proven
 * Inform path stays untouched.
 *
 * Follows D73/AttrCalibrator's discipline exactly: learn only from real
 * observed evidence, require repeated confirmation, reset on contradiction
 * rather than averaging toward a wrong answer, persist per game file.
 */
var ExitCalibrator = {

    VERSION: 1,
    // A property must predict real travel in this many DISTINCT rooms before
    // it is trusted. Two different rooms is the point at which coincidence
    // stops being a plausible explanation: a byte that happens to equal the
    // destination in one room almost never does so in another.
    CONFIRM_ROOMS: 2,
    // A confirmed direction survives this many contradictions before being
    // torn down. Conditional exits (ZIL CEXIT) legitimately lead elsewhere
    // when their condition fails, so a single mismatch is not proof of error.
    MAX_CONTRADICT: 3,

    _key: null,
    _table: null,

    D198ExitValve: {
        StorageKey: "PL_D198_ExitValve_v1",
        _testOverride: null,
        mode: function () {
            var value = ExitCalibrator.D198ExitValve._testOverride;
            if (value == null) {
                try { value = typeof localStorage !== "undefined" && localStorage.getItem(ExitCalibrator.D198ExitValve.StorageKey); } catch (e) {}
            }
            return value === "off" || value === "shadow" ? value : "on";
        },
        setMode: function (mode) {
            var value = mode === "shadow" || mode === "on" ? mode : "off";
            if (value !== "shadow") ExitCalibrator.clearD198GenerationHints();
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(ExitCalibrator.D198ExitValve.StorageKey, value);
                }
            } catch (e) {}
            return value;
        }
    },

    _d198Clone: function (value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    },

    // D198 hints are generation-local inputs owned by this calibrator. They
    // are accepted only with explicit validated family direction linkage;
    // grammar vocabulary alone is intentionally insufficient.
    setD198StructuralHints: function (family, links) {
        ExitCalibrator._d198GenerationLinks = [];
        var validFamily = family && family.classification === "confirmed-zil-family" &&
            family.evidence === "validated" && family.directionLinkEvidence === "validated";
        if (!validFamily || !Array.isArray(links)) return false;
        var seen = {};
        links.forEach(function (link) {
            if (!link || link.roomId == null || !ExitCalibrator.normalizeDir(link.label)) return;
            if (!(Number(link.prop) > 0) || ["b0", "w0", "b1", "w1", "b2"].indexOf(link.mode) < 0) return;
            var clean = {
                roomId: Number(link.roomId),
                label: ExitCalibrator.normalizeDir(link.label),
                prop: Number(link.prop),
                mode: link.mode,
                evidence: "validated-family-direction-link"
            };
            var key = clean.roomId + "|" + clean.label;
            if (seen[key]) return;
            seen[key] = true;
            ExitCalibrator._d198GenerationLinks.push(clean);
        });
        return ExitCalibrator._d198GenerationLinks.length > 0;
    },

    clearD198GenerationHints: function () {
        ExitCalibrator._d198GenerationLinks = [];
        try { delete ExitCalibrator._d198ShadowSnapshot; } catch (e) { ExitCalibrator._d198ShadowSnapshot = null; }
    },

    d198ExitDiagnostics: function () {
        return ExitCalibrator._d198Clone(ExitCalibrator._d198ShadowSnapshot || null);
    },

    _d198ExitsFor: function (mem, roomId) {
        var out = [];
        (ExitCalibrator._d198GenerationLinks || []).forEach(function (link) {
            if (String(link.roomId) !== String(roomId)) return;
            var dest = ExitCalibrator.destFor(mem, roomId, link.prop, link.mode);
            if (!(Number(dest) > 0)) return;
            try {
                if (ZRamReader.isPlausibleExitTarget && !ZRamReader.isPlausibleExitTarget(mem, dest)) return;
            } catch (e0) { return; }
            var name = "";
            try { name = ZRamReader.shortName(mem, dest) || ""; } catch (e1) {}
            var attrs = {};
            try { attrs = ZRamReader.attrsFromObject(mem, dest) || {}; } catch (e2) {}
            var cardinal = { north: 1, south: 1, east: 1, west: 1, northeast: 1, northwest: 1,
                southeast: 1, southwest: 1, up: 1, down: 1, "in": 1, out: 1 };
            out.push({
                label: link.label,
                command: link.label,
                prop: link.prop,
                targetRoomId: dest,
                targetRoomName: name,
                isDoor: !!attrs.door,
                isLocked: !!(attrs.door && attrs.locked),
                isNonCardinal: !cardinal[link.label],
                hinted: true,
                confidence: 0.8,
                source: "d198-structural-exit-hint"
            });
        });
        return out;
    },

    // D214 Z1: parser-linked destinations are hints, including UEXIT: V-WALK
    // may dynamically override a direction before reading its property.
    // Room/door aliases are read from compiled exit relationships, never names
    // or a DOORBIT guess. The index is local to one decode: targets can change.
    _d214RoomDoorIndex: function (mem, roomId, mapping, stats) {
        if (stats) stats.indexBuilds = (stats.indexBuilds || 0) + 1;
        var R = ZRamReader, h = R.header(mem), size = mem && (mem.byteLength || mem.length);
        if (!h || [3, 4, 5].indexOf(h.version) < 0 || !size) return null;
        var family = GrammarProvider.decodeD198(mem);
        if (!family || family.classification !== 'confirmed-zil-family' || family.evidence !== 'validated' ||
            family.family !== 'infocom-pre-v6-fixed') return null;
        var payload = typeof WorldModel !== 'undefined' && WorldModel.lastPayload;
        if (!payload || String(payload.roomId) !== String(roomId)) return null;
        if (typeof ZRamProvider !== 'undefined' && ZRamProvider.getMem) {
            var live = ZRamProvider.getMem();
            // The provider makes fresh DataViews over the same live buffer.
            if (live !== mem && !(live && live.buffer && mem.buffer && live.buffer === mem.buffer &&
                live.byteOffset === mem.byteOffset && live.byteLength === mem.byteLength)) return null;
        }
        // In this fixed layout the first property pointer is the end of the
        // contiguous object records. objectCount's heuristic can scan past it.
        var first = R.objectBase(h, 1), pointerOffset = h.version <= 3 ? 7 : 12;
        if (!Number.isInteger(first) || first < 0 || first > size - h.entrySize) return null;
        var firstProps = R.u16(mem, first + pointerOffset), count = (firstProps - first) / h.entrySize;
        if (!Number.isInteger(count) || count < 2 || count > (h.version <= 3 ? 255 : 65535) ||
            firstProps >= h.staticMem || h.staticMem > size) return null;
        var player = payload.playerId || (payload.probe || {}).playerId;
        if (!Number.isInteger(player) || player < 2 || player > count) return null;
        var excluded = {}, walked = {}, at = player, reached = false;
        for (var n = 0; at && n < 16; n++) {
            if (!Number.isInteger(at) || at < 1 || at > count || walked[at]) return null;
            walked[at] = true; excluded[at] = true;
            if (String(at) === String(roomId)) reached = true;
            at = R.objectLinks(mem, at).parent;
        }
        if (at || !reached) return null;
        excluded[roomId] = true;
        var directions = {}, byRoom = {}, incoming = {}, v3 = h.version <= 3;
        mapping.forEach(function (entry) { directions[entry.prop] = true; });
        function validId(id) { return Number.isInteger(id) && id >= 2 && id <= count; }
        function boundedProps(ptr) {
            if (!Number.isInteger(ptr) || ptr < firstProps || ptr >= h.staticMem) return null;
            var at = ptr + 1 + R.u8(mem, ptr) * 2, previous = v3 ? 32 : 64, result = [];
            while (at < h.staticMem && result.length < (v3 ? 31 : 63)) {
                var tag = R.u8(mem, at++);
                if (!tag) return result;
                var num = tag & (v3 ? 31 : 63), length;
                if (!num || num >= previous) return null;
                previous = num;
                if (v3) length = (tag >> 5) + 1;
                else if (tag & 128) {
                    if (at >= h.staticMem) return null;
                    length = (R.u8(mem, at++) & 63) || 64;
                } else length = (tag & 64) ? 2 : 1;
                if (length > h.staticMem - at) return null;
                result.push({ num: num, sz: length, dataAddr: at });
                at += length;
            }
            return at < h.staticMem && R.u8(mem, at) === 0 ? result : null;
        }
        for (var id = 2; id <= count; id++) {
            var links = R.objectLinks(mem, id);
            if (!links || [links.parent, links.sibling, links.child].some(function (x) {
                return !Number.isInteger(x) || x < 0 || x > count;
            })) return null;
            var props = boundedProps(links.props), edges = [];
            if (!props) return null;
            for (var j = 0; j < props.length; j++) {
                if (stats) stats.propertiesExamined = (stats.propertiesExamined || 0) + 1;
                var p = props[j], a = p.dataAddr;
                if (!directions[p.num] || !Number.isInteger(a) || a < 0 ||
                    !Number.isInteger(p.sz) || p.sz > size - a) continue;
                var kind = p.sz === (v3 ? 1 : 2) ? 'U' : p.sz === (v3 ? 5 : 6) ? 'D' : null;
                if (!kind) continue;
                var dest = v3 ? R.u8(mem, a) : R.u16(mem, a), door = null;
                if (!validId(dest)) continue;
                if (kind === 'D') {
                    door = v3 ? R.u8(mem, a + 1) : R.u16(mem, a + 2);
                    if (!validId(door) || (v3 && R.u8(mem, a + 4) !== 0)) continue;
                    var packed = R.u16(mem, a + (v3 ? 2 : 4)), stringAt = packed * (v3 ? 2 : 4);
                    if (packed && (stringAt < h.staticMem || stringAt > size - 2)) continue;
                }
                var edge = { from: id, prop: p.num, dest: dest, door: door, kind: kind };
                edges.push(edge);
                if (kind === 'U' || door !== dest) (incoming[dest] || (incoming[dest] = [])).push(edge);
            }
            byRoom[id] = edges;
        }
        return { qualifies: function (dest, prop) {
            if (!byRoom[dest] || !byRoom[dest].length || !(byRoom[roomId] || []).some(function (e) {
                return e.prop === prop && e.kind === 'D' && e.dest === dest && e.door === dest;
            })) return false;
            return (incoming[dest] || []).some(function (e) {
                return e.from !== dest && !excluded[e.from] &&
                    GrammarProvider.d214RoomTarget(mem, roomId, e.from);
            });
        } };
    },

    // Locked R2 (claude+codex): the live locked bit of a DEXIT's own door object, or
    // null (unknown). Only for a confirmed ZIL title whose exact-digest fact maps
    // `locked`, on the live memory, with the door inside the true object frontier
    // (first property pointer), never objectCount's heuristic. Never coerces unknown.
    _d214DoorLocked: function (mem, door) { return ExitCalibrator._d214DoorBit(mem, door, 'locked'); },

    // P10 R2 (claude+codex #5543): the live OPEN bit of the same DEXIT door, read with the
    // identical validation through fact.attributeMap.open; missing/invalid => null (unknown).
    _d214DoorOpen: function (mem, door) { return ExitCalibrator._d214DoorBit(mem, door, 'open'); },

    _d214DoorBit: function (mem, door, key) {
        try {
            var R = ZRamReader, h = R.header(mem), size = mem && (mem.byteLength || mem.length);
            if (!h || [3, 4, 5].indexOf(h.version) < 0 || !size) return null;
            var family = GrammarProvider.decodeD198(mem);
            if (!family || family.classification !== 'confirmed-zil-family' || family.evidence !== 'validated') return null;
            if (typeof ZRamProvider !== 'undefined' && ZRamProvider.getMem) {
                var live = ZRamProvider.getMem();
                if (live !== mem && !(live && live.buffer && mem.buffer && live.buffer === mem.buffer &&
                    live.byteOffset === mem.byteOffset && live.byteLength === mem.byteLength)) return null;
            }
            // Stable-header ownership (executableLayoutFacts) is required; no digest-only fallback.
            var fact = R.executableLayoutFacts && R.executableLayoutFacts(mem);
            var bit = fact && fact.attributeMap && fact.attributeMap[key];
            if (!Number.isInteger(bit) || bit < 0 || bit >= (h.version <= 3 ? 32 : 48)) return null;
            var first = R.objectBase(h, 1), pointerOffset = h.version <= 3 ? 7 : 12;
            if (!Number.isInteger(first) || first < 0 || first > size - h.entrySize) return null;
            var firstProps = R.u16(mem, first + pointerOffset), count = (firstProps - first) / h.entrySize;
            if (!Number.isInteger(count) || count < 2 || firstProps >= h.staticMem) return null;
            if (!Number.isInteger(door) || door < 2 || door > count) return null;
            var at = R.objectBase(h, door) + (bit >> 3);
            return !!(R.u8(mem, at) & (128 >> (bit & 7)));
        } catch (e) { return null; }
    },

    _d214ZilExitsFor: function (mem, roomId, stats) {
        try {
            if (typeof GrammarProvider === 'undefined' || !GrammarProvider.d214DirectionProperties) return [];
            var mapping = GrammarProvider.d214DirectionProperties(mem);
            if (!mapping.length) return [];
            var table = ExitCalibrator.hydrate(mem), conflict = mapping.some(function (entry) {
                return entry.aliases.concat(entry.label).some(function (alias) {
                    var d = table && table.dirs && table.dirs[ExitCalibrator.normalizeDir(alias) || alias];
                    return d && d.confirmed && d.prop !== entry.prop;
                });
            });
            if (conflict) return [];
            var h = ZRamReader.header(mem), v3 = h.version <= 3, props = ZRamReader.listProps(mem, roomId), out = [];
            var aliasIndex, aliasIndexBuilt = false;
            mapping.forEach(function (entry) {
                if (table && ExitCalibrator.isBlocked(table, roomId, entry.label)) return;
                var p = props.find(function (p) { return p.num === entry.prop; });
                if (!p || p.dataAddr < 0 || p.dataAddr + p.sz > (mem.byteLength || mem.length)) return;
                var kind = (v3 ? { 1: 'U', 2: 'N', 3: 'F', 4: 'C', 5: 'D' } : { 2: 'U', 3: 'N', 4: 'F', 5: 'C', 6: 'D' })[p.sz];
                if (!kind) return;
                var dest = null, name = '', door = null;
                if (kind === 'U' || kind === 'C' || kind === 'D') {
                    dest = v3 ? ZRamReader.u8(mem, p.dataAddr) : ZRamReader.u16(mem, p.dataAddr);
                    if (!dest || !GrammarProvider.d214RoomTarget(mem, roomId, dest)) return;
                    name = ZRamReader.shortName(mem, dest) || '';
                    if (kind === 'D') {
                        door = v3 ? ZRamReader.u8(mem, p.dataAddr + 1) : ZRamReader.u16(mem, p.dataAddr + 2);
                        if (!door || door > ZRamReader.objectCount(mem, h)) return;
                        if (door === dest) {
                            if (!aliasIndexBuilt) {
                                aliasIndexBuilt = true;
                                aliasIndex = ExitCalibrator._d214RoomDoorIndex(mem, roomId, mapping, stats);
                            }
                            if (!aliasIndex || !aliasIndex.qualifies(dest, entry.prop)) return;
                        }
                    }
                }
                var hint = { label: entry.label, command: entry.label, prop: entry.prop, targetRoomId: dest, targetRoomName: name,
                    isDoor: kind === 'D', doorObjectId: door, conditional: kind === 'C' || kind === 'D',
                    hinted: true, hintOnly: true, roomHintSourceId: roomId, confidence: 0.8, source: 'd214-zil-exit-hint', exitForm: kind };
                if (kind === 'D') {
                    var locked = ExitCalibrator._d214DoorLocked(mem, door);
                    if (locked !== null) hint.isLocked = locked;
                    // P10 R2: the route contract is narrower than the glyph: pause only for
                    // locked AND closed. Unknown open is not closed, so no route block.
                    hint.routeBlocked = locked === true && ExitCalibrator._d214DoorOpen(mem, door) === false;
                }
                out.push(hint);
            });
            return out;
        } catch (e) { return []; }
    },

    DIRS: {
        n: "north", north: "north",
        s: "south", south: "south",
        e: "east", east: "east",
        w: "west", west: "west",
        ne: "northeast", northeast: "northeast",
        nw: "northwest", northwest: "northwest",
        se: "southeast", southeast: "southeast",
        sw: "southwest", southwest: "southwest",
        u: "up", up: "up",
        d: "down", down: "down",
        "in": "in", inside: "in", enter: "in",
        out: "out", outside: "out", exit: "out",
        // D134: shipboard/nautical directions are real travel words in
        // several modules (Planetfall's Feinstein, Cutthroats, Ballyhoo).
        // They are ordinary directions to the game -- each has its own exit
        // property exactly like north does -- so they calibrate identically.
        // Omitting them meant a whole deck of Planetfall could never be
        // learned.
        port: "port", p: "port",
        starboard: "starboard", sb: "starboard",
        fore: "fore", forward: "fore", f: "fore",
        aft: "aft", a: "aft"
    },

    // A direction the player tried that did NOT move them. Recorded per
    // (room, direction) so a property that merely LOOKS like an exit -- a
    // blocked-with-message form whose bytes happen to start with a valid
    // room number -- stops being offered for that room. Negative evidence is
    // as real as positive evidence, and this is the only way to tell the two
    // apart without guessing at byte layouts.
    observeBlocked: function (mem, roomId, dirLabel) {
        if (!mem || roomId == null) return;
        var dir = ExitCalibrator.normalizeDir(dirLabel);
        if (!dir) return;
        var t = ExitCalibrator.hydrate(mem);
        t.blocked = t.blocked || {};
        var k = String(roomId) + "|" + dir;
        var n = (t.blocked[k] || 0) + 1;
        // P13b: re-insert so key order is recency order, then bound the key
        // count (LRU). Blocked keys are only ever written for the room the
        // player stood in, so every kept key belongs to a visited room.
        delete t.blocked[k];
        t.blocked[k] = n;
        ExitCalibrator.compactTable(t);
        ExitCalibrator.persist();
    },

    isBlocked: function (t, roomId, dir) {
        return !!(t && t.blocked && t.blocked[String(roomId) + "|" + dir]);
    },

    normalizeDir: function (label) {
        var l = String(label || "").trim().toLowerCase();
        if (!l) return null;
        if (ExitCalibrator.DIRS[l]) return ExitCalibrator.DIRS[l];
        // "go north" / "walk north"
        var m = /^(?:go|walk|run|head|travel)\s+(.+)$/.exec(l);
        if (m && ExitCalibrator.DIRS[m[1]]) return ExitCalibrator.DIRS[m[1]];
        return null;
    },

    // ---- persistence (same convention as AttrCalibrator/diagonal) --------
    storageKey: function (mem) {
        var id = (typeof ZRamReader !== "undefined" && ZRamReader.learningIdentityKey)
            ? ZRamReader.learningIdentityKey(mem) : null;
        return id ? ("PM_ExitCalib_" + id) : null;
    },

    learningKeyFor: function (i) { return i && typeof i.identityKey === "string" && i.identityKey ? "PM_ExitCalib_" + i.identityKey : null; },

    // P13b R2. Measured (grok2 p13b-measure): whole exit table 3.5-6.4 KB on
    // 400-600 turn walks; 512 blocked keys is several times any measured walk.
    BLOCKED_MAX_KEYS: 512,
    // Drops evidence that can no longer change an answer: cand buckets for
    // dirs already confirmed (a torn-down dir deletes its cand anyway) and
    // the least recently blocked keys past BLOCKED_MAX_KEYS.
    compactTable: function (t) {
        if (!t || typeof t !== "object") return t;
        if (t.cand && t.dirs) Object.keys(t.cand).forEach(function (d) { if (t.dirs[d] && t.dirs[d].confirmed) delete t.cand[d]; });
        if (t.blocked) {
            var keys = Object.keys(t.blocked);
            for (var i = 0; i < keys.length - ExitCalibrator.BLOCKED_MAX_KEYS; i++) delete t.blocked[keys[i]];
        }
        return t;
    },

    emptyTable: function () {
        return { v: ExitCalibrator.VERSION, dirs: {}, cand: {}, blocked: {} };
    },

    hydrate: function (mem) {
        var key = ExitCalibrator.storageKey(mem);
        if (!key) { ExitCalibrator._key=null; ExitCalibrator._table=ExitCalibrator.emptyTable(); return ExitCalibrator._table; }
        if (ExitCalibrator._key === key && ExitCalibrator._table) return ExitCalibrator._table;
        ExitCalibrator._key = key;
        ExitCalibrator._table = ExitCalibrator.emptyTable();
        try {
            var id = LearningStores.identity(mem);
            var result = LearningStores.readOwned("exitCalib",id);
            var raw = result.value;
            if (raw) {
                var p = JSON.parse(raw);
                // A table written by an older rule set is discarded rather
                // than trusted -- the meaning of its entries may have changed.
                if (p && p.v === ExitCalibrator.VERSION && p.dirs) ExitCalibrator._table = p;
            }
        } catch (e) {}
        return ExitCalibrator._table;
    },

    persist: function () {
        try {
            if (ExitCalibrator._key && ExitCalibrator._table) {
                var ek = ExitCalibrator._key;
                ExitCalibrator.compactTable(ExitCalibrator._table);
                if (typeof LearningStores !== "undefined") LearningStores.persist("exitCalib", { identityKey: ek.slice("PM_ExitCalib_".length) }, JSON.stringify(ExitCalibrator._table), function () { if (ExitCalibrator._key === ek) ExitCalibrator._table = ExitCalibrator.emptyTable(); });
                else localStorage.setItem(ek, JSON.stringify(ExitCalibrator._table));
            }
        } catch (e) {}
    },

    // ---- candidate destinations encoded in one property ------------------
    // A property's bytes are read two ways, and only these two: the first
    // byte, and the first word. ZIL packs a destination room into the leading
    // byte of its multi-byte exit forms; Inform-style entries put an object
    // number in the word. Anything more speculative than this would be the
    // guessing D61 warns about -- and it is unnecessary, because a wrong
    // reading simply never earns confirmation.
    candidates: function (mem, prop) {
        var out = [];
        if (!prop) return out;
        try {
            if (prop.sz === 1) {
                out.push({ mode: "b0", dest: ZRamReader.u8(mem, prop.dataAddr) });
            } else if (prop.sz >= 2) {
                out.push({ mode: "b0", dest: ZRamReader.u8(mem, prop.dataAddr) });
                out.push({ mode: "w0", dest: ZRamReader.u16(mem, prop.dataAddr) });
                // Some multi-byte exit forms lead with something else (a door
                // object, a condition variable) and carry the destination in
                // the following byte/word. Reading those positions too costs
                // nothing in safety: a wrong position simply never predicts
                // real travel twice in two different rooms, so it can never
                // be confirmed. Found necessary on Planetfall, where several
                // shipboard transitions were not in the leading byte.
                out.push({ mode: "b1", dest: ZRamReader.u8(mem, prop.dataAddr + 1) });
            }
            if (prop.sz >= 3) {
                out.push({ mode: "w1", dest: ZRamReader.u16(mem, prop.dataAddr + 1) });
                out.push({ mode: "b2", dest: ZRamReader.u8(mem, prop.dataAddr + 2) });
            }
        } catch (e) {}
        return out;
    },

    // A calibrated decoding is only valid for the property size it was proven
    // on (operator-reported "punctured boat" east of Zork's West of House: a
    // 2-byte message exit -- the boarded door's text address -- was read as a
    // 1-byte room number). `sizes` is the proven set; calibrations saved before
    // sizes were recorded fall back to the form's own width (b0 = 1 byte,
    // w0 = 2 bytes).
    sizeAllowed: function (sz, mode, sizes) {
        if (Array.isArray(sizes) && sizes.length) return sizes.indexOf(sz) >= 0;
        if (mode === "b0") return sz === 1;
        if (mode === "w0") return sz === 2;
        return true;
    },
    destFor: function (mem, roomId, propNum, mode, sizes) {
        try {
            var props = ZRamReader.listProps(mem, roomId) || [];
            for (var i = 0; i < props.length; i++) {
                if (props[i].num !== propNum) continue;
                if (!ExitCalibrator.sizeAllowed(props[i].sz, mode, sizes)) return null;
                if (mode === "b0") return ZRamReader.u8(mem, props[i].dataAddr);
                if (mode === "w0") return ZRamReader.u16(mem, props[i].dataAddr);
                if (mode === "b1") return (props[i].sz >= 2) ? ZRamReader.u8(mem, props[i].dataAddr + 1) : null;
                if (mode === "w1") return (props[i].sz >= 3) ? ZRamReader.u16(mem, props[i].dataAddr + 1) : null;
                if (mode === "b2") return (props[i].sz >= 3) ? ZRamReader.u8(mem, props[i].dataAddr + 2) : null;
                return null;
            }
        } catch (e) {}
        return null;
    },

    // ---- learning --------------------------------------------------------
    // Called at the one moment the game has proven something: a real move
    // just happened, from a real room id, in a known direction, to a real
    // room id.
    observe: function (mem, fromRoomId, dirLabel, toRoomId) {
        if (!mem || fromRoomId == null || toRoomId == null) return;
        var dir = ExitCalibrator.normalizeDir(dirLabel);
        if (!dir) return;
        var from = Number(fromRoomId), to = Number(toRoomId);
        if (!(from > 0) || !(to > 0) || from === to) return;

        var t = ExitCalibrator.hydrate(mem);
        var dirty = false;

        // Moving proves the way IS open now -- clear any earlier suppression
        // (a door that was locked before may be unlocked now).
        if (t.blocked && t.blocked[String(from) + "|" + dir]) {
            delete t.blocked[String(from) + "|" + dir];
            dirty = true;
        }

        // Already confirmed? Check it still holds, and stop.
        var known = t.dirs[dir];
        if (known && known.confirmed) {
            var predicted = ExitCalibrator.destFor(mem, from, known.prop, known.mode, known.sizes);
            if (String(predicted) === String(to)) {
                if (known.contra) { known.contra = 0; dirty = true; }
            } else {
                known.contra = (known.contra || 0) + 1;
                dirty = true;
                if (known.contra > ExitCalibrator.MAX_CONTRADICT) {
                    // Repeatedly wrong: tear it down rather than keep
                    // emitting exits the game disagrees with.
                    delete t.dirs[dir];
                    if (t.cand) delete t.cand[dir];
                }
            }
            if (dirty) ExitCalibrator.persist();
            return;
        }

        // Not confirmed yet: tally every property that really does contain
        // this destination, remembering WHICH ROOM proved it.
        var props = [];
        try { props = ZRamReader.listProps(mem, from) || []; } catch (e) { return; }
        t.cand = t.cand || {};
        var bucket = t.cand[dir] = t.cand[dir] || {};

        for (var i = 0; i < props.length; i++) {
            var cands = ExitCalibrator.candidates(mem, props[i]);
            for (var j = 0; j < cands.length; j++) {
                if (String(cands[j].dest) !== String(to)) continue;
                var k = props[i].num + ":" + cands[j].mode;
                var e = bucket[k] = bucket[k] || { prop: props[i].num, mode: cands[j].mode, rooms: [], sizes: [] };
                if (e.rooms.indexOf(from) === -1) { e.rooms.push(from); dirty = true; }
                e.sizes = e.sizes || [];
                if (e.sizes.indexOf(props[i].sz) === -1) { e.sizes.push(props[i].sz); dirty = true; }
                if (e.rooms.length >= ExitCalibrator.CONFIRM_ROOMS && !t.dirs[dir]) {
                    t.dirs[dir] = { prop: e.prop, mode: e.mode, sizes: e.sizes.slice(0, 4), confirmed: true, contra: 0, rooms: e.rooms.slice(0, 8) };
                    dirty = true;
                }
            }
        }
        if (dirty) ExitCalibrator.persist();
    },

    // ---- emission --------------------------------------------------------
    isCalibrated: function (mem) {
        var t = ExitCalibrator.hydrate(mem);
        return !!(t && t.dirs && Object.keys(t.dirs).length);
    },

    confirmedDirs: function (mem) {
        var t = ExitCalibrator.hydrate(mem);
        var out = [];
        Object.keys((t && t.dirs) || {}).forEach(function (d) { if (t.dirs[d].confirmed) out.push(d); });
        return out;
    },

    // Every exit this room structurally has, for directions already proven.
    // Emits nothing for an unproven direction -- an honest absence, never a
    // guess (D24).
    exitsFor: function (mem, roomId) {
        var out = [];
        if (!mem || roomId == null) return out;
        var t = ExitCalibrator.hydrate(mem);
        if (!t || !t.dirs) return out;

        Object.keys(t.dirs).forEach(function (dir) {
            var d = t.dirs[dir];
            if (!d || !d.confirmed) return;
            // Proven not to lead anywhere from THIS room.
            if (ExitCalibrator.isBlocked(t, roomId, dir)) return;
            var dest = ExitCalibrator.destFor(mem, roomId, d.prop, d.mode, d.sizes);
            if (dest == null || !(Number(dest) > 0)) return;
            // The destination must be something that can actually be a place.
            try {
                // D155: a door is a valid thing to travel THROUGH, so it must
                // not disqualify the exit -- only a destination that is not a
                // place at all does.
                if (ZRamReader.isPlausibleExitTarget
                    ? !ZRamReader.isPlausibleExitTarget(mem, dest)
                    : (ZRamReader.isPlausibleMapRoom && !ZRamReader.isPlausibleMapRoom(mem, dest))) return;
            } catch (e) { return; }
            var tname = "";
            try { tname = ZRamReader.shortName(mem, dest) || ""; } catch (e) {}
            if (tname.charAt(0) === "(") return;
            if (/^c_rooms(_?\d+)?$/i.test(tname)) tname = "";
            // Field-for-field the same record ZRamReader.lookAheadExits emits
            // for Inform games -- MapTopology.classifyExit/link read
            // `targetRoomName`, so anything else silently loses the
            // destination and the edge never joins the route graph.
            var tAttrs = {};
            try { tAttrs = ZRamReader.attrsFromObject(mem, dest) || {}; } catch (e) {}
            var CARDINAL = { north: 1, south: 1, east: 1, west: 1, northeast: 1, northwest: 1,
                             southeast: 1, southwest: 1, up: 1, down: 1, "in": 1, out: 1 };
            out.push({
                label: dir,
                command: dir,
                prop: d.prop,
                targetRoomId: dest,
                targetRoomName: tname,
                isDoor: !!tAttrs.door,
                isLocked: !!(tAttrs.door && tAttrs.locked),
                isNonCardinal: !CARDINAL[dir],
                hinted: !tname,
                confidence: 0.85,
                source: "exit-calibrator"
            });
        });
        var mode = ExitCalibrator.D198ExitValve.mode();
        if (mode !== "off") {
            var hints = ExitCalibrator._d198ExitsFor(mem, roomId).concat(ExitCalibrator._d214ZilExitsFor(mem, roomId));
            if (mode === "shadow") {
                ExitCalibrator._d198ShadowSnapshot = ExitCalibrator._d198Clone({ roomId: roomId, exits: hints });
            } else {
                var labels = {}, byLabel = {};
                out.forEach(function (exit) {
                    var key = String(exit.label || "").toLowerCase();
                    labels[key] = true; byLabel[key] = exit;
                });
                hints.forEach(function (exit) {
                    var label = String(exit.label || "").toLowerCase();
                    if (!labels[label]) { labels[label] = true; out.push(exit); return; }
                    // Locked R2: a learned exit keeps its route, but the same compiled
                    // DEXIT's own door identity and live lock state replace the
                    // destination-room attrs (in ZIL the room is not the door).
                    var learned = byLabel[label];
                    if (learned && exit.exitForm === 'D' && exit.doorObjectId != null &&
                        learned.prop === exit.prop && String(learned.targetRoomId) === String(exit.targetRoomId)) {
                        learned.doorObjectId = exit.doorObjectId;
                        if (typeof exit.isLocked === 'boolean') learned.isLocked = exit.isLocked;
                        else delete learned.isLocked;
                        if (typeof exit.routeBlocked === 'boolean') learned.routeBlocked = exit.routeBlocked;
                        else delete learned.routeBlocked;
                    }
                });
            }
        }
        return out;
    },

    // Diagnostics for the harness and for live probing -- never used to make
    // a decision, only to explain one.
    describe: function (mem) {
        var t = ExitCalibrator.hydrate(mem);
        var dirs = {};
        Object.keys((t && t.dirs) || {}).forEach(function (d) {
            dirs[d] = { prop: t.dirs[d].prop, mode: t.dirs[d].mode, rooms: t.dirs[d].rooms, contra: t.dirs[d].contra || 0 };
        });
        return { key: ExitCalibrator._key, confirmed: dirs, pending: (t && t.cand) || {} };
    },

    reset: function () {
        ExitCalibrator._table = ExitCalibrator.emptyTable();
        ExitCalibrator.persist();
    }
};
if (typeof LearningStores !== "undefined") LearningStores.register("exitCalib", "PM_ExitCalib_", ExitCalibrator.learningKeyFor, {
    compact: function (value) { return JSON.stringify(ExitCalibrator.compactTable(JSON.parse(value))); }
});
