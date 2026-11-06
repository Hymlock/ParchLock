var ZRamProvider = {
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
    // D53/D57/D58/D75 (PRODUCTION_PLAN.md): the resolved playerId is not
    // always the real inventory holder -- some compiled games route a
    // generic "player" probe id to an empty-handed object while the TRUE
    // holder is a different, sometimes-unnamed, sometimes-non-animate-this-
    // session RAM object. Precedence, matching the documented history:
    //   1. D75: a real, opcode-observed insert_obj from a confirmed
    //      successful take (AttrCalibrator.confirmedInventoryRootId) --
    //      100% observed fact, checked first, never second-guessed by a
    //      static fallback.
    //   2. D53: if playerId itself already holds something, trust it.
    //   3. D57/D58: scan room-scope discovered objects for an animate
    //      object (distinct from playerId) holding a PLURAL (2+), PC-shaped
    //      set of children -- real RAM structure, never a name/text guess.
    //   4. Otherwise the original playerId (honest: nothing better found).
    resolveInventoryRootId: function (mem, playerId, discovered, roomId) {
        // A digest-pinned, validated player (playerObject / playerGlobal fact) is executable-owned evidence and outranks
        // every learned or structural guess: Sherlock's learner otherwise settled on the coat pocket.
        try {
            // Digest-pinned player via ZRamReader.resolvePlayer (links/range validated; fact-uninitialized → 0).
            // Cheap fact declaration guard first (Codex #3682): skip costly resolve when no pin exists.
            // Never return the caller's playerId here (Codex #3668 / grok #3589).
            try {
                var lfQuick = ZRamReader.executableLayoutFacts && ZRamReader.executableLayoutFacts(mem);
                if (lfQuick && (Number.isInteger(lfQuick.playerObject) || Number.isInteger(lfQuick.playerGlobal))
                    && typeof ZRamReader.resolvePlayer === "function") {
                    var pinned = ZRamReader.resolvePlayer(mem);
                    if (pinned && (pinned.source === "measured-player-object" || pinned.source === "measured-player-global"
                        || pinned.source === "fact-uninitialized")) {
                        return pinned.id || 0;
                    }
                }
            } catch (ePin) {}
        } catch (eFact) {}
        try {
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.confirmedInventoryRootId) {
                var confirmed = AttrCalibrator.confirmedInventoryRootId(mem);
                if (confirmed != null) return confirmed;
            }
        } catch (e1) {}
        try {
            if (playerId && ZRamReader.children(mem, playerId).length) return playerId;
        } catch (e2) {}
        // A resolved player that is really IN the current room (its parent chain reaches roomId) and holds nothing is
        // genuinely empty-handed: no other animate object may be promoted to holder. Galatea's statue (35) holds her
        // knees/ears/face and was listed as the player's inventory. The animate fallback stays for players that are not
        // placed in the world (e.g. a class object rather than the instance).
        var playerPlaced = false;
        try {
            if (playerId && roomId) {
                var up = ZRamReader.objectLinks(mem, playerId), hop = 0;
                while (up && up.parent && hop++ < 6) { if (String(up.parent) === String(roomId)) { playerPlaced = true; break; } up = ZRamReader.objectLinks(mem, up.parent); }
            }
        } catch (ePl) {}
        if (!playerPlaced) try {
            var pool = Array.isArray(discovered) ? discovered
                : ((typeof WorldModel !== "undefined" && WorldModel.lastPayload && WorldModel.lastPayload.discoveredObjects) || []);
            for (var i = 0; i < pool.length; i++) {
                var o = pool[i];
                if (!o || o.id == null || String(o.id) === String(playerId)) continue;
                var attrs = ZRamReader.attrsFromObject(mem, o.id);
                if (!attrs.animate) continue;
                var kids = ZRamReader.children(mem, o.id);
                if (kids.length >= 2) return o.id;
            }
        } catch (e3) {}
        // The unnamed-holder recovery below depends on Inform compiler shape.
        // ZIL uses unnamed groupings for offstage/global objects as well; those
        // are not inventories. Native confirmed holders above remain first.
        if (!ZRamReader.isInformCompiled(mem)) return playerId;
        // The placed, empty-handed player guard covers the unnamed-wrapper family too (Codex #3566).
        if (playerPlaced) return playerId;
        // D75: wump2ka (and similar) parent the real held tree under an
        // unnamed room child ("(CustomPlayer)") whose animate bit may be
        // clear this session. probe playerId is often an empty-handed
        // (self object). Structural recovery: an unnamed direct child of
        // the current room that holds at least one printable object is
        // the inventory root. Bits/structure only — no name matching.
        try {
            var rid = roomId;
            if (rid == null && typeof WorldModel !== "undefined" && WorldModel.lastPayload) {
                rid = WorldModel.lastPayload.roomId;
            }
            if (rid && (!playerId || !ZRamReader.children(mem, playerId).length)) {
                var roomKids = ZRamReader.children(mem, rid);
                var best = 0, bestN = 0;
                for (var k = 0; k < roomKids.length; k++) {
                    var hid = roomKids[k];
                    if (playerId && String(hid) === String(playerId)) continue;
                    var hnm = ZRamReader.shortName(mem, hid) || "";
                    if (hnm && hnm.charAt(0) !== "(") continue;
                    var held = ZRamReader.children(mem, hid);
                    var printable = 0;
                    for (var h = 0; h < held.length; h++) {
                        var cn = ZRamReader.shortName(mem, held[h]) || "";
                        if (cn && cn.charAt(0) !== "(") printable++;
                    }
                    if (printable > bestN) { bestN = printable; best = hid; }
                }
                if (best && bestN > 0) return best;

                // D151: the same search one level deeper, through furniture.
                // D139 established that the player can be standing IN or ON
                // something -- findLikelyLocation walks UP out of any
                // container/supporter/vehicle to find the room -- so the
                // search that walks back DOWN to find the player has to look
                // inside that same furniture, or the two directions disagree.
                //
                // Measured on 905.z5: the real PC is "(thief)", a child of the
                // bed, which is a child of the Bedroom. The game opens with
                // "Bedroom (on the bed)" and reports soiled clothing and a gold
                // watch being worn, while the nominal "(self object)" holds
                // nothing -- so the sheet showed an empty inventory for a
                // player who is visibly wearing two things.
                for (var f = 0; f < roomKids.length; f++) {
                    var fid = roomKids[f];
                    var fattrs = ZRamReader.attrsFromObject(mem, fid) || {};
                    if (!(fattrs.container || fattrs.supporter || fattrs.vehicle)) continue;
                    var inner = ZRamReader.children(mem, fid);
                    for (var g = 0; g < inner.length; g++) {
                        var gid = inner[g];
                        if (playerId && String(gid) === String(playerId)) continue;
                        var gnm = ZRamReader.shortName(mem, gid) || "";
                        if (gnm && gnm.charAt(0) !== "(") continue;   // same unnamed-wrapper rule
                        var gheld = ZRamReader.children(mem, gid);
                        var gprint = 0;
                        for (var q = 0; q < gheld.length; q++) {
                            var qn = ZRamReader.shortName(mem, gheld[q]) || "";
                            if (qn && qn.charAt(0) !== "(") gprint++;
                        }
                        if (gprint > bestN) { bestN = gprint; best = gid; }
                    }
                }
                if (best && bestN > 0) return best;
            }
        } catch (e4) {}
        return playerId;
    },
    statusTranslation: function () {
        try {
            if (typeof StatusGridDecoder !== "undefined" && StatusGridDecoder.fromDocument) {
                return StatusGridDecoder.fromDocument(document);
            }
        } catch (e) {}
        return { roomLabel: "", metrics: [], columns: [] };
    },
    resolveStatusRoom: function () {
        try {
            var translated = ZRamProvider.statusTranslation();
            if (translated.roomLabel) return translated.roomLabel;
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) {
                var cr = String(ParchLockMap.CurrentRoom).trim();
                if (cr && cr.charAt(0) !== "(") return cr;
            }
            var el = document.querySelector("#statusline, .StatusLine, #status, .statusline, #status_right, #status_left");
            if (el && el.textContent) {
                var st = el.textContent.trim().split(/\n/)[0].trim().replace(/\s{2,}.*$/, "").trim();
                if (st && !/^(adventure|inform|score|turns)$/i.test(st)) return st;
            }
            var cells = document.querySelectorAll(".StatusGrid .Style_subheader, .statusline, #windowport .Style_subheader");
            for (var ci = 0; ci < cells.length; ci++) {
                var ct = (cells[ci].textContent || "").trim();
                if (ct && ct.length < 60 && !/^(adventure|score|turns)$/i.test(ct)) return ct;
            }
            var wp = document.querySelector("#windowport");
            if (wp) {
                var t = ZRamProvider._windowportText(wp).trim().split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
                for (var i = t.length - 1; i >= 0; i--) {
                    var line = t[i];
                    if (line.length < 2 || line.length > 48) continue;
                    if (/^(You |I |There |The |A |An |It |She |He |>|What |Would |Do you|Press |Type )/i.test(line)) continue;
                    if (/^(ADVENTURE|Inform|Score|Turns)/i.test(line)) continue;
                    if (/^[A-Z][A-Za-z0-9'., \-]{1,47}$/.test(line) || /^[A-Z0-9' \-]{3,40}$/.test(line)) return line;
                }
            }
        } catch (e) {}
        return "";
    },
    // S4: textContent (not innerText) so a visibility:hidden status grid is
    // still read; GridLine/BufferLine rows are joined by newlines to keep the
    // line structure innerText used to provide.
    _windowportText: function (wp) {
        if (!wp) return "";
        var rows = wp.querySelectorAll(".GridLine, .BufferLine");
        if (!rows.length) return wp.textContent || "";
        // Rows the app deliberately removed from view (hidden D207 carry-probe replies) were never read by
        // innerText; keep them out. Only visibility (the S4-hidden status grid) still reads.
        return Array.prototype.filter.call(rows, function (r) {
            if (r.classList && r.classList.contains("pl-carry-probe")) return false;
            if (r.closest && r.closest('[aria-hidden="true"], [hidden]')) return false;
            try { for (var n = r; n && n !== wp; n = n.parentElement) if (getComputedStyle(n).display === "none") return false; } catch (eS) {}
            return true;
        }).map(function (r) { return r.textContent || ""; }).join("\n");
    },
    matchRoomFromText: function (mem) {
        try {
            var wp = document.querySelector("#windowport");
            var text = ZRamProvider._windowportText(wp).toLowerCase();
            if (!text || text.length < 8) return 0;
            var h = ZRamReader.header(mem);
            var count = ZRamReader.objectCount(mem, h);
            var best = 0, bestSc = -1;
            for (var id = 1; id <= count; id++) {
                var nm = ZRamReader.shortName(mem, id);
                if (!nm || nm.charAt(0) === "(") continue;
                if (/^(class|object|compass|direction|kind|nothing)$/i.test(nm)) continue;
                var obj = ZRamReader.objectLinks(mem, id);
                if (!obj) continue;
                var kids = ZRamReader.children(mem, id);
                if (kids.length < 1) continue;
                var nml = nm.toLowerCase();
                if (nml.length < 4) continue;
                var idx = text.lastIndexOf(nml);
                if (idx < 0) continue;
                var sc = kids.length * 2 + Math.floor(idx / 40);
                if (obj.parent === 0) sc += 8;
                if (sc > bestSc) { bestSc = sc; best = id; }
            }
            return bestSc >= 8 ? best : 0;
        } catch (e) { return 0; }
    },
    // Incremented once per collection pass (several per command, also during
    // boot; never a promise of one per native turn). Caches over mutable
    // VM state (D217 library compass) are valid only within one generation.
    collectGeneration: 0,
    collect: function () {
        ZRamProvider.collectGeneration++;
        var mem = ZRamProvider.getMem();
        if (!mem || typeof ZRamReader === "undefined") {
            return {
                sources: [{ name: "z-ram", confidence: 0.02 }],
                probe: { status: "z-ram-waiting-for-zvm" }
            };
        }
        var snap = ZRamReader.snapshot(mem) || {};
        var statusInfo = ZRamProvider.statusTranslation();
        // Structural-first, generic for any game (not a per-title branch):
        // ZRamReader.snapshot() already ran its own hint-FREE resolution
        // ladder (parent(player) -> learned/confirmed global -> scored
        // global scan, all real RAM structure, zero text involved). Trust
        // that result first. Text-hint resolution (status line / map's own
        // "current room" label / printed-text matching) is a real fallback
        // only for when structural resolution found NOTHING at all --
        // never a second opinion allowed to override an already-successful
        // structural answer. This matters generically, for every game:
        // `status` below is sourced from `ParchLockMap.CurrentRoom`, which
        // is itself set from a PREVIOUS resolved room name -- letting a
        // hint-based re-resolution win unconditionally each tick created a
        // self-reinforcing loop (one wrong early guess, e.g. matching an
        // NPC's name that happened to appear in the status text, becomes
        // permanent, since every later tick re-feeds that same wrong name
        // back in as its own hint). Confirmed live on Anchorhead, but the
        // mechanism is title-agnostic and could affect any game whose
        // status/current-room label transiently mismatches its real room
        // during the FIRST tick, before this fix.
        var loc = snap.roomId || 0;
        if (!loc) {
            var status = statusInfo.roomLabel || ZRamProvider.resolveStatusRoom();
            try {
                if (typeof ZRamReader.findLikelyLocation === "function") {
                    loc = ZRamReader.findLikelyLocation(mem, snap.playerId || 0, status || snap.roomName || "") || 0;
                }
            } catch (e1) {}
            if (!loc) loc = ZRamProvider.matchRoomFromText(mem) || 0;
            if (!loc && status && typeof ZRamReader.findRoomsByName === "function") {
                var hits = ZRamReader.findRoomsByName(mem, status);
                if (hits && hits[0] && hits[0].score >= 15) loc = hits[0].id;
            }
        }
        if (loc) {
            snap.roomId = loc;
            snap.roomName = ZRamReader.shortName(mem, loc) || "";
            // D82: exclude the resolved playerId from the primary room-scope
            // filter, same as resolveInventoryRootId's own fallback scan
            // already does a few lines away -- a real printable name like
            // "player" isn't caught by the meta-placeholder ("(...)") check
            // alone, so without this a room whose only real RAM child is the
            // player itself would offer nonsensical affordances like
            // "examine player."
            var scoped = ZRamReader.scopeObjects(mem, loc, { depth: 2, playerId: snap.playerId });
            // D184: objects the compiler left unnamed but which own real parser
            // vocabulary. Carried as CANDIDATES only -- js/Actionable.js decides
            // whether any of them is a thing the player can actually see, by
            // matching their own words against the text the game just printed.
            // Nothing downstream treats these as discovered objects.
            snap.unnamedCandidates = (scoped && scoped.unnamedCandidates) || [];
            snap.discoveredObjects = scoped.filter(function (o) {
                if (!o || !o.name || String(o.name).charAt(0) === "(") return false;
                if (snap.playerId != null && String(o.id) === String(snap.playerId)) return false;
                return true;
            });
            snap.exits = ZRamReader.lookAheadExits(mem, loc);
            snap.confidence = 0.95;
        }
        // D201: status text may name an already-proven structural room, but it
        // never creates the room ID. This is the same display-only exception
        // Wumpus already uses for C_ROOMS_N and now also covers an honestly
        // blank early-Inform short name.
        if (snap.roomId && statusInfo.roomLabel
            && (!snap.roomName || /^c_rooms(?:_?\d+)?$/i.test(snap.roomName))) {
            snap.roomName = statusInfo.roomLabel;
            snap.roomLabelProvenance = "status-grid";
        }
        if (snap.roomName && /^(class|object|kind|compass)$/i.test(snap.roomName)) {
            snap.roomId = 0; snap.roomName = ""; snap.discoveredObjects = []; snap.exits = [];
        }
        // D31/D53/D75: inventory must walk from the verified holder id, which
        // can differ from probe playerId (Anchorhead class 654 vs instance 20).
        // snapshot()'s inventory is a same-shaped fallback; the live provider
        // always re-roots via resolveInventoryRootId + walkVisibleDescendants
        // so nested parentIds stay real and empty-handed probe ids cannot
        // wipe a real held tree. Do not invent inventory when no root exists.
        var invRoot = ZRamProvider.resolveInventoryRootId(
            mem,
            snap.playerId || 0,
            snap.discoveredObjects || [],
            snap.roomId || 0
        );
        if (invRoot && typeof ZRamReader.walkVisibleDescendants === "function") {
            snap.inventory = ZRamReader.walkVisibleDescendants(mem, invRoot, 2, 0.9);
        } else {
            snap.inventory = Array.isArray(snap.inventory) ? snap.inventory : [];
        }
        // D58: scenery bit on a held object (Glow Bar) is randomized dressing,
        // not proof it is room decoration — if it is parented under the
        // inventory root it is carried. Do NOT strip scenery from inventory.
        // D82: exclude inventory-root from room scope when it is a distinct
        // printable id (e.g. Deadline's "player"), same rule as probe playerId.
        if (invRoot != null) {
            snap.discoveredObjects = (snap.discoveredObjects || []).filter(function (o) {
                return !o || String(o.id) !== String(invRoot);
            });
        }
        var objs = snap.discoveredObjects || [];
        var conf = snap.confidence || (objs.length ? 0.9 : 0.3);
        return {
            sources: [{ name: "z-ram", confidence: conf }],
            engineMode: "structural",
            vmType: "z",
            roomId: snap.roomId || null,
            roomName: snap.roomName || "",
            discoveredObjects: objs,
            // D184: candidates travel beside the objects, never among them.
            unnamedCandidates: snap.unnamedCandidates || [],
            inventory: snap.inventory || [],
            exits: snap.exits || [],
            hudMetrics: statusInfo.metrics || [],
            probe: {
                status: "z-ram-live",
                playerId: snap.playerId || 0,
                inventoryRootId: invRoot || 0,
                playerSource: snap.playerSource || "",
                roomId: snap.roomId || 0,
                roomSource: snap.roomSource || "",
                measuredDark: snap.measuredDark == null ? null : !!snap.measuredDark,
                scopeCount: objs.length
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
