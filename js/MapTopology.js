var MapTopology = {
    // LLR3 dungeon depth (operator 2026-11-06): a digest-bound regionDepth fact names the
    // property holding each room's map region; depth = 1 + the region's rank among the
    // distinct region values rooms carry (game's own data, no prose). Null when no fact.
    _regionDepthCache: null,
    regionDepthTable: function () {
        try {
            if (typeof ModuleLibrary === "undefined" || typeof StatTracker === "undefined" || typeof ZRamProvider === "undefined") return null;
            var id = ModuleLibrary.currentExecutableIdentity();
            var fact = id && StatTracker.probeFactsForIdentity(id);
            var rd = fact && fact.regionDepth;
            if (!rd || !(rd.regionProperty > 0)) return null;
            var c = MapTopology._regionDepthCache;
            if (c && c.digest === id.digest) return c;
            var mem = ZRamProvider.getMem();
            if (!mem) return null;
            var byRoom = {}, values = {};
            for (var o = 1; o < 2000; o++) {
                if (!ZRamReader.objectLinks(mem, o)) break;
                var v = ZRamReader.readProp(mem, o, rd.regionProperty);
                if (v) { byRoom[o] = v; values[v] = true; }
            }
            var ranks = {};
            Object.keys(values).map(Number).sort(function (a, b) { return a - b; })
                .forEach(function (v, i) { ranks[v] = i + 1; });
            c = { digest: id.digest, byRoom: byRoom, ranks: ranks };
            if (Object.keys(byRoom).length) MapTopology._regionDepthCache = c;
            return c;
        } catch (e) { return null; }
    },
    roomDepth: function (room) {
        if (!room || !room.HasRealId || room.ObjectId == null) return null;
        var t = MapTopology.regionDepthTable();
        if (!t) return null;
        var region = t.byRoom[Number(room.ObjectId)];
        return region ? t.ranks[region] : null;
    },
    // "down"/"up" when the two rooms sit at different measured depths, else null.
    levelChangeDir: function (from, to) {
        var a = MapTopology.roomDepth(from), b = MapTopology.roomDepth(to);
        if (a == null || b == null || a === b) return null;
        return b > a ? "down" : "up";
    },
    prevRoomId: null,
    prevRoomName: "",
    lastCommand: "",
    lastNotedEchoCount: 0,
    CARDINAL: {
        north: 1, n: 1, south: 1, s: 1, east: 1, e: 1, west: 1, w: 1,
        northeast: 1, ne: 1, northwest: 1, nw: 1, southeast: 1, se: 1, southwest: 1, sw: 1,
        up: 1, u: 1, down: 1, d: 1, in: 1, out: 1
    },
    isCardinal: function (label) {
        return !!MapTopology.CARDINAL[String(label || "").toLowerCase().trim()];
    },
    // D54/D80: a compiled Z-machine short-name is not always player-facing.
    // wump2ka and similar Inform builds expose internal debug labels
    // ("C_ROOMS_16") that must never appear on the map or Known Rooms list.
    // Identity still keys on ObjectId (D47); this is display-only filtering.
    // Also treat bare "exit-N"/"exit N" strings as non-room labels so a
    // system exit token never becomes a room Name.
    isInternalRoomName: function (name) {
        var n = String(name || "").trim();
        if (!n) return true;
        if (/^c_rooms(_?\d+)?$/i.test(n)) return true;
        if (/^exit[-\s]?\d+$/i.test(n)) return true;
        if (/^\(.*\)$/.test(n)) return true;
        // wump2ka meta end marker object (not a place the player visits).
        if (/^the last room!?$/i.test(n)) return true;
        return false;
    },
    // True once the room has a real, player-facing display name (visited
    // refinement or any non-internal Name). Unvisited look-ahead stubs that
    // only ever held an internal short-name stay hidden from the UI.
    isPlayerFacingRoom: function (room) {
        if (!room) return false;
        if (room.VisitedName && !MapTopology.isInternalRoomName(room.Name)) return true;
        if (room.Name && !MapTopology.isInternalRoomName(room.Name)) return true;
        return false;
    },
    // M09: does the status/heading announce this room name right now?
    isRoomAnnounced: function (name) {
        var n = String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (!n || n.length < 2) return false;
        try {
            var el = (typeof document !== "undefined") && (
                document.querySelector(".GridWindow.reverse") || document.querySelector(".GridWindow")
            );
            var heading = el ? String(el.innerText || el.textContent || "").toLowerCase().replace(/\s+/g, " ") : "";
            if (heading.indexOf(n) >= 0) return true;
            // A status line can carry something else entirely (WiR shows a
            // date), so the game's own room heading in the latest reply also
            // announces the room: a FULL line equal to the name, optionally
            // with a positional suffix "(on|in the X)" / ", on|in the X".
            if (typeof DarkScope !== "undefined" && DarkScope.latestReplyLines) {
                var lines = DarkScope.latestReplyLines() || [];
                for (var i = 0; i < lines.length; i++) {
                    var l = String(lines[i] || "").toLowerCase().replace(/\s+/g, " ").trim();
                    if (l === n || (l.indexOf(n) === 0 && /^\s*(\((in|on) [^()]+\)|, (in|on) [^,()]+)\s*$/.test(l.slice(n.length)))) return true;
                }
            }
            if (typeof StatusGridDecoder !== "undefined" && StatusGridDecoder.decode) {
                var d = StatusGridDecoder.decode(document);
                if (d && d.roomLabel && String(d.roomLabel).toLowerCase().indexOf(n) >= 0) return true;
            }
        } catch (eA) {}
        return false;
    },
    // M09: map still empty of real-id rooms (first admission / after Reset).
    mapIsEmptyOfRealRooms: function () {
        try {
            var rooms = (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms) || [];
            return !rooms.some(function (r) {
                return r && r.HasRealId && r.Name && !MapTopology.isInternalRoomName(r.Name);
            });
        } catch (eE) { return true; }
    },
    // M09 first-room gate: empty map admits current only with deterministic
    // source (containment/measured-fact) AND announcement, or after travel.
    // existing-resolver alone under epigraph is refused (Curses/Vespers).
    // Ghost intro is containment under epigraph — announcement still required.
    mayAdmitFirstCurrentRoom: function (payload) {
        if (!payload || !payload.roomName) return false;
        if (!MapTopology.mapIsEmptyOfRealRooms()) return true;
        if (MapTopology.prevRoomId != null && payload.roomId != null
            && String(MapTopology.prevRoomId) !== String(payload.roomId)) return true;
        // M09 scope (orchestrator 2026-10-10): the epigraph/menu boot problem is
        // Inform-only (Curses, Ghost, Vespers). ZIL stories keep the pre-M09
        // admission so a room the player starts in while dark (HHG Bedroom 150,
        // status line 'Darkness') is still admitted. Structural test, no prose.
        try {
            if (typeof ZRamReader !== "undefined" && typeof ZRamProvider !== "undefined"
                && ZRamProvider.getMem && ZRamProvider.getMem()
                && !ZRamReader.isInformCompiled(ZRamProvider.getMem())) return true;
        } catch (eZ) {}
        var src = payload.probe && payload.probe.roomSource;
        var det = src === "player-containment" || src === "measured-fact";
        if (!det) return false;
        return MapTopology.isRoomAnnounced(payload.roomName);
    },
    // R4: stamp display-only SectionGroup from status "Room #N" when D224
    // measured-fact is valid for this room (wump2ka multi-section).
    stampSectionGroup: function (room, payload) {
        if (!room || !payload || !payload.probe) return;
        if (payload.probe.roomSource !== "measured-fact") return;
        if (payload.roomId == null || String(payload.roomId) !== String(room.ObjectId)) return;
        try {
            var el = document.querySelector(".GridWindow.reverse") || document.querySelector(".GridWindow");
            var t = el ? String(el.innerText || el.textContent || "") : "";
            var m = /\bRoom\s*#\s*(\d+)\b/i.exec(t);
            if (m) {
                var n = parseInt(m[1], 10);
                if (n > 0 && room.SectionGroup !== n) room.SectionGroup = n;
            }
        } catch (eS) {}
    },
    normalizeLabel: function (label) {
        var k = String(label || "").toLowerCase().trim();
        var aliases = { n: "north", s: "south", e: "east", w: "west", u: "up", d: "down", ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest" };
        return aliases[k] || k;
    },
    noteCommand: function (cmd) {
        if (cmd == null) return;
        var s = String(cmd).trim();
        if (s) MapTopology.lastCommand = s;
        // Snapshot how many command-echo lines exist in the transcript
        // right now. readLastTypedCommand uses this to tell "a real
        // submission happened that this noteCommand call already accounts
        // for" apart from "a real submission happened that bypassed
        // noteCommand entirely" -- see its own comment.
        try {
            if (typeof $ !== "undefined") MapTopology.lastNotedEchoCount = $(".Style_input").length;
        } catch (e) {}
        try { MapTopology.handlePossibleNewGameAnswer(s); } catch (eN) {}
    },
    // Directions.js/AttributeSchema-style caveat applies here too: this is
    // not a fixed vocabulary gate, only a ground-truth READ of whatever
    // the player actually submitted. `lastCommand` above is only ever set
    // via `noteCommand`, which itself is only ever called from
    // Input.Inject -- the path clicked/radial-driven commands take. A
    // player typing directly into the input box and pressing Enter (the
    // primary way anyone plays) never goes through Inject at all, so
    // lastCommand silently goes stale for the most common case, and ANY
    // custom/dynamic/non-cardinal command a player types would be lost the
    // same way -- this is not specific to compass words.
    //
    // The engine itself echoes every submitted line into the transcript
    // regardless of source (`.Style_input`, already relied on by the
    // pre-existing `Input.GetLastDirection`), so a new echo line that
    // `noteCommand` never snapshotted for is decisive proof a real
    // submission bypassed it -- read that line as ground truth. When the
    // echo count matches what `noteCommand` already recorded (the normal
    // Inject path, or a direct test-harness call to `noteCommand` with no
    // real DOM submission at all), trust `lastCommand` instead so an
    // explicit caller's value is never silently overridden by whatever
    // text happens to be sitting in the transcript already.
    // Commands that can never be travel. Deliberately a small, closed list of
    // meta/observation verbs -- a game's own invented direction words must
    // still be learnable, so anything not named here is allowed.
    NON_TRAVEL: {
        look: 1, l: 1, wait: 1, z: 1, again: 1, g: 1,
        inventory: 1, i: 1, inv: 1,
        yes: 1, y: 1, no: 1, n_answer: 1,
        score: 1, version: 1, diagnose: 1, time: 1,
        save: 1, restore: 1, restart: 1, undo: 1, quit: 1, q: 1,
        verbose: 1, brief: 1, superbrief: 1, notify: 1, script: 1, unscript: 1,
        help: 1, about: 1, credits: 1, hint: 1, hints: 1, move: 1
    },

    // Verbs that can actually relocate the player. Deliberately a closed list:
    // a command is only allowed to become a map edge when it both starts with
    // one of these AND was followed by a real room change.
    POSTURE_VERBS: { get: 1, stand: 1, sit: 1, lie: 1, hop: 1, step: 1 },
    MOVEMENT_PREPS: {
        on: 1, onto: 1, off: 1, in: 1, into: 1, out: 1, up: 1, down: 1,
        through: 1, over: 1, under: 1, across: 1, behind: 1, inside: 1, outside: 1
    },

    MOVEMENT_VERBS: {
        go: 1, walk: 1, run: 1, head: 1, travel: 1, move: 1,
        climb: 1, enter: 1, exit: 1, leave: 1, board: 1, disembark: 1,
        jump: 1, crawl: 1, swim: 1, wade: 1, cross: 1, follow: 1,
        descend: 1, ascend: 1, ride: 1, step: 1, squeeze: 1, slide: 1
    },

    isNonTravelCommand: function (cmd) {
        var c = String(cmd || "").trim().toLowerCase();
        if (!c) return true;
        // D162 (operator-reported regression): D140 rejected EVERY multi-word
        // command here, on the reasoning that a multi-word command is an action
        // rather than a direction. That was wrong, and it removed a genuinely
        // learned capability -- the operator had Anchorhead's alley learn
        // "climb on can" and "go through fence" as real traversal steps, usable
        // in the compass ring and by auto-pathing, without ever minting a room
        // for the top of the can. The case D140 actually needed to stop
        // (wump2ka growing an exit literally called "look") is a SINGLE word
        // and is already covered by the stop-list above.
        //
        // An edge is only ever recorded when the player demonstrably changed
        // rooms, so the question here is not "is this a direction" but "could
        // this command have been what moved them". A multi-word command
        // qualifies when it starts with a verb of locomotion; anything else --
        // "take lamp", "open door" -- is still refused, so an action that
        // merely coincides with a room change (a trapdoor opening under you)
        // cannot become a phantom exit.
        if (/\s/.test(c)) {
            var parts = c.split(/\s+/);
            var first = parts[0];
            if (!MapTopology.MOVEMENT_VERBS[first]) {
                // "get"/"stand"/"sit" relocate the player only in their
                // prepositional form. "stand on can" is how Anchorhead's alley
                // is actually climbed -- it answers "You clamber onto the
                // wobbling garbage can" and the location becomes "Alley, on the
                // garbage can" -- while "get lamp" is an ordinary take and must
                // never become an exit.
                if (!(MapTopology.POSTURE_VERBS[first] && MapTopology.MOVEMENT_PREPS[parts[1]])) return true;
            }
        }
        if (MapTopology.NON_TRAVEL[c]) return true;
        // "n" is north, but a bare "no" answer is not travel; both are handled
        // above -- this only guards the spelled-out answer forms.
        return false;
    },

    readLastTypedCommand: function () {
        try {
            if (typeof $ === "undefined") return MapTopology.lastCommand;
            var els = $(".Style_input");
            var count = els ? els.length : 0;
            if (count > MapTopology.lastNotedEchoCount) {
                var text = String(els.last().text() || "").trim();
                MapTopology.lastNotedEchoCount = count;
                if (text) return text;
            }
            return MapTopology.lastCommand;
        } catch (e) { return MapTopology.lastCommand; }
    },
    // System prop-index placeholders (directionLabelForProp fallback
    // "exit-13") are NOT real parser vocabulary and must never be queued
    // by Navigator or left as the sole Exits[] key to a destination when a
    // real command exists. D60 numbered form "exit 1" (space) is different
    // and pairs with command "x1".
    isSystemPropExitKey: function (label) {
        return /^exit-\d+$/i.test(String(label || "").trim());
    },
    classifyExit: function (ex) {
        // Prefer the display label; do not let command steal the label when
        // both exist (D55: label "exit 1", command "x1" must stay distinct).
        var rawLabel = (ex && (ex.label || ex.dir)) || "";
        var label = MapTopology.normalizeLabel(rawLabel || (ex && ex.command) || "");
        var cardinal = MapTopology.isCardinal(label);
        var command = (ex && ex.command != null && String(ex.command).trim() !== "")
            ? String(ex.command).toLowerCase().trim()
            : label;
        return Object.assign({}, ex || {}, {
            label: label || ("x" + (ex && ex.prop != null ? ex.prop : "unk")),
            command: command,
            isNonCardinal: !cardinal,
            confidence: (ex && ex.confidence) || 0.7
        });
    },
    // Room identity: when a real RAM room id is available, that id is the
    // ONLY correct identity signal -- printed/display names are not unique.
    // Two different real rooms routinely share a printed name (most common
    // case: an unlit/dark room, which many games render with a generic
    // "it's too dark to see" line instead of the room's own name, or any
    // two rooms with the same description by design); matching on name
    // alone would incorrectly collapse them into one map node. The reverse
    // also happens: the same real room can be described under two
    // different printed names across visits (e.g. before/after it's lit).
    // Matching on ObjectId first gets both cases right; falling back to
    // name only applies when no real id exists yet (an untraveled/hinted
    // stub with nothing else to key on).
    // Room record -> the finalized payload that first gave it a real id.
    _admittedBy: new WeakMap(),
    ensureRoom: function (name, objectId, evidence) {
        if (typeof ParchLockMap === "undefined" || !name) return null;
        var oid = objectId ? String(objectId) : null;
        // D201: a room already admitted under containment provenance (blank
        // compiled short name + player-facing status/label) must remain
        // addressable for link()/state-delta. Those callers pass only
        // fromId/toId and cannot re-supply probe evidence. Re-running the
        // isPlausibleMapRoom name gate here erased ExitMeta/Exits for the
        // whole unnamed early-Inform family (exemplar: A Little Like Rogue)
        // while named compilers (Anchorhead) stayed healthy. Reuse the
        // existing real-id record before the new-admission hard stop.
        var existingById = null;
        if (oid) {
            existingById = ParchLockMap.Rooms.find(function (r) {
                return r && r.HasRealId && String(r.ObjectId) === oid;
            }) || null;
        }
        // Hard stop for NEW admissions only: never create a map room for an
        // ObjectId that is structurally not a place (animate NPC, clothing,
        // etc.). Containment-proven current rooms remain the sole blank-name
        // admission path (D201); this does not invent destinations.
        if (!existingById) {
            try {
                if (oid && typeof ZRamReader !== "undefined" && ZRamReader.isPlausibleMapRoom
                    && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                    var _memER = ZRamProvider.getMem();
                    var containmentProven = evidence && evidence.probe
                        && evidence.probe.roomSource === "player-containment"
                        && String(evidence.probe.roomId) === String(objectId);
                    var decoderRoom = evidence && evidence.hintOnly && evidence.roomHintSourceId != null
                        && typeof GrammarProvider !== 'undefined' && GrammarProvider.d214RoomTarget
                        && GrammarProvider.d214RoomTarget(_memER, evidence.roomHintSourceId, Number(objectId));
                    if (_memER && !containmentProven && !decoderRoom && !ZRamReader.isPlausibleMapRoom(_memER, objectId)) return null;
                }
            } catch (eER) {}
        }
        // D54: internal/meta short-names are never map rooms -- even when a
        // real ObjectId is known. "(Inform Library)", "(darkness object)",
        // and "C_ROOMS_N" must not enter Rooms[] or become CurrentRoom.
        // Identity for real places still keys on ObjectId once a player-
        // facing name arrives (D47/D62).
        if (MapTopology.isInternalRoomName(name)) return null;
        var room = null;

        // HasRealId distinguishes a genuine RAM-confirmed id from the
        // synthetic hash/"r_name" placeholder assigned to a stub that has
        // never had a real id. A placeholder is not an identity claim, so
        // it must never be treated as "a different real id" when a later
        // call finally supplies the real one for the same name -- doing so
        // would fork the stub into a duplicate room instead of upgrading
        // it in place.
        if (existingById) {
            room = existingById;
        }

        if (!room) {
            var byName = ParchLockMap.GetRoom(name);
            // Reuse a name match unless it already carries a *different*
            // REAL id -- that's two distinct real rooms sharing a printed
            // name, and merging them would be exactly the false-positive
            // this identity check exists to prevent. A name match with no
            // real id yet (a stub) is always safe to reuse/upgrade.
            if (byName && (!oid || !byName.HasRealId || String(byName.ObjectId) === oid)) {
                room = byName;
            }
        }

        if (!room) {
            room = {
                Id: ParchLockMap.Rooms.length,
                Name: name,
                Exits: {},
                Notes: [],
                ObjectId: oid || (typeof MapIdentity !== "undefined" ? MapIdentity.hashName(name) : ("r_" + name)),
                HasRealId: !!oid,
                Floor: 0,
                ExitMeta: {}
            };
            ParchLockMap.Rooms.push(room);
            var createdNow = true;
        }

        room.ExitMeta = room.ExitMeta || {};
        // Identity (ObjectId) is fixed once a real id is known. The display
        // Name is not identity and is allowed to upgrade ONCE, the first
        // time a real id is attached to this room (a stub's placeholder
        // name being replaced by the real one, or a dark-room's generic
        // line being replaced once it's lit) -- but D62: once a room
        // already has its real id AND a name from a previous call, a later
        // call must NOT keep overwriting it. Live-confirmed on
        // wump2ka.z5.js: the SAME real room object (identical child/
        // sibling/property-table address, definitively the same RAM
        // structure) was printed under a DIFFERENT "Room #N" number by the
        // game's own status bar on a later visit -- neither "Room #N" nor
        // any other printed label is a stable per-room identifier in that
        // game, only the RAM object itself is. Treating every later
        // status-bar reading as an authoritative rename would make the
        // same real room appear to keep changing its name each visit.
        // Freezing the name after its first real-id assignment is correct
        // for both cases: Anchorhead's one-time dark-to-lit upgrade still
        // happens (first real-id call), and Wumpus's per-visit relabeling
        // no longer corrupts an already-identified room's display name.
        if (oid) {
            var hadRealIdAlready = !!room.HasRealId;
            room.ObjectId = oid;
            room.HasRealId = true;
            // D62 freezes the display Name after the first real-id assignment
            // so Wumpus per-visit renumbering cannot churn an already-known
            // room. Exception (D54/D80, confirmed live): if the name that got
            // frozen was only an internal compiler short-name (C_ROOMS_N),
            // a later player-facing refined title MUST still upgrade it once
            // -- otherwise look-ahead stubs permanently poison Known Rooms
            // and the map with system labels. Never overwrite a already
            // player-facing Name with an internal one.
            if (name) {
                var incomingInternal = MapTopology.isInternalRoomName(name);
                var currentInternal = MapTopology.isInternalRoomName(room.Name);
                // Wump dark P1 (Codex #3039/#3131): evidence only from the
                // current finalized payload (identity, not a copy) for THIS
                // real id; anything else abstains.
                var current = typeof WorldModel !== "undefined" ? WorldModel.lastPayload : null;
                var darkEv = evidence && current && evidence === current && evidence.darkEvidence
                    && String(evidence.roomId) === oid ? evidence.darkEvidence : "unknown";
                // The admitting payload: the stamp is allowed only on the same
                // payload that first gave this room its real id.
                // A room created in this call is created WITH its real id, so
                // "first admission" is creation or a stub's first real id.
                if ((createdNow || !hadRealIdAlready) && current) MapTopology._admittedBy.set(room, current);
                if (!hadRealIdAlready) {
                    if (!incomingInternal || !room.Name) room.Name = name;
                } else if (currentInternal && !incomingInternal) {
                    room.Name = name;
                } else if (room.NameProvenance === "dark" && darkEv === "lit" && !incomingInternal && name !== room.Name) {
                    // One-shot: a name frozen under measured dark evidence upgrades
                    // to the lit name; D62 holds for every other case.
                    room.Name = name;
                    delete room.NameProvenance;
                }
                // First admission only: stamp when this dark payload is the one
                // that admitted the room and the frozen name is its name.
                if (darkEv === "dark" && room.Name === name && MapTopology._admittedBy.get(room) === evidence) room.NameProvenance = "dark";
            }
        }
        if (typeof MapIdentity !== "undefined") MapIdentity.ensureRoomIdentity(room);
        return room;
    },
    link: function (fromName, label, toName, meta) {
        if (!fromName || !label) return;
        // Never seed the graph from an internal short-name as the FROM room
        // either -- callers should already pass a refined current name, but
        // defend the boundary so a C_ROOMS current room cannot re-enter.
        if (MapTopology.isInternalRoomName(fromName) && !(meta && meta.fromId)) return;
        var from = MapTopology.ensureRoom(fromName, meta && meta.fromId);
        if (!from) return;
        var dir = MapTopology.normalizeLabel(label);
        if (!dir) return;
        meta = meta || {};
        // Real parser command for this edge (D55: may differ from label).
        // Wumpus numbered exits need the exact "xN" command for auto-pathing.
        var command = (meta.command != null && String(meta.command).trim() !== "")
            ? String(meta.command).toLowerCase().trim()
            : dir;
        // System prop-index keys ("exit-13") are never real vocabulary.
        // Prefer the real command as the edge key when it is usable so
        // Navigator BFS never queues a doomed "exit-13" step.
        if (MapTopology.isSystemPropExitKey(dir) && command && !MapTopology.isSystemPropExitKey(command)) {
            dir = MapTopology.normalizeLabel(command) || command;
        }
        var priorProof = from.ExitMeta[dir] && from.ExitMeta[dir].travelledTo;
        // D223: the Map_Storage lane never overwrites another source's entry
        // or a walked proof, and never clears travelledTo (Codex #2778).
        if (meta.source === "i7-mapstorage") {
            // Check EVERY alias of this direction (full, D69 short, canonical)
            // for another source's metadata, a walked proof, or a bare edge;
            // any hit means this lane does not write (Codex #2800/#2802).
            var shortKey = null;
            try { shortKey = typeof TranslatorUI !== "undefined" && TranslatorUI.canonicalDir ? TranslatorUI.canonicalDir(dir) : null; } catch (eSk) {}
            var aliases = [dir, shortKey, MapTopology.normalizeLabel(dir)].filter(function (k, i, a) { return k && a.indexOf(k) === i; });
            var blocked = aliases.some(function (k) {
                var m = from.ExitMeta[k];
                if (m && (m.travelledTo || (m.source && m.source !== "i7-mapstorage"))) return true;
                return from.Exits && Object.prototype.hasOwnProperty.call(from.Exits, k) && !(m && m.source === "i7-mapstorage");
            });
            if (blocked) return;
        }
        var priorDoorId = from.ExitMeta[dir] && from.ExitMeta[dir].doorObjectId;
        from.ExitMeta[dir] = Object.assign({}, from.ExitMeta[dir] || {}, meta, {
            isNonCardinal: !MapTopology.isCardinal(dir),
            label: dir,
            command: command
        });
        // Locked R2: lock state is an observation, not a sticky fact. A payload
        // exit replaces it: true sets it, false or unknown clears it (and the
        // legacy `locked`), so an older door's state is never inherited.
        // Scoped to exits that carry, or previously carried, a ZIL door identity:
        // losing that identity must not leave an old lock behind. Inform exits
        // never carry one and are unchanged.
        if (meta && (meta.doorObjectId != null || priorDoorId != null) &&
            Object.prototype.hasOwnProperty.call(meta, "isLocked") && meta.isLocked !== true) {
            delete from.ExitMeta[dir].isLocked;
            delete from.ExitMeta[dir].locked;
            if (meta.doorObjectId == null) delete from.ExitMeta[dir].doorObjectId;
        }
        // M7 R2 condition 1: the door_to hint is the latest observation only; an
        // observation without it clears it. Display-only: never toId or Exits.
        if (meta && meta.doorTo == null) { delete from.ExitMeta[dir].doorTo; delete from.ExitMeta[dir].doorToName; }
        // P10 R2: route block (locked AND closed) is replaced the same way; only true survives.
        if (meta && (meta.doorObjectId != null || priorDoorId != null) && meta.routeBlocked !== true)
            delete from.ExitMeta[dir].routeBlocked;
        // World map (bus #1884/#1886): `source` is the LATEST observation, so a
        // later look-ahead overwrote the proof that this exit was walked. Keep
        // that proof separately, bound to the destination it reached: a real
        // move records it; any later observation naming a DIFFERENT
        // destination id (a moved exit, a door, a changed world) clears it.
        // Without a destination id an observation cannot contradict a bound
        // proof; an unbound "?" proof ends as soon as ANY destination id is
        // observed for this exit (#1897: never an unbound proof).
        var incomingTarget = meta.toId != null ? String(meta.toId) : null;
        if (meta.source === "state-delta") from.ExitMeta[dir].travelledTo = incomingTarget || "?";
        else if (priorProof && incomingTarget && (priorProof === "?" || priorProof !== incomingTarget)) delete from.ExitMeta[dir].travelledTo;
        // D54: look-ahead may resolve a real destination ObjectId whose only
        // known short-name is still the internal compiler label. Keep the
        // structural toId on ExitMeta for later identity match, but do NOT
        // create/link a visible room record under that internal name -- the
        // edge stays hinted until state-delta / a visit supplies a real
        // player-facing description (operator: Known Rooms never lists
        // C_ROOMS; map never shows system placeholders as room names).
        if (toName && MapTopology.isInternalRoomName(toName)) {
            toName = null;
        }
        // D201 (system-wide): look-ahead often carries only targetRoomId when
        // the destination's compiled short name is blank (early Inform) or
        // was cleared as C_ROOMS_*. Once that ObjectId is already admitted
        // under a player-facing label, recover the admitted Name so pathable
        // Exits[] form between visited rooms -- the same feature named
        // compilers get from non-blank targetRoomName. Unvisited blank
        // ObjectIds stay name-less and remain ExitMeta hints until travel.
        if ((!toName || MapTopology.isInternalRoomName(toName)) && meta && meta.toId != null
            && typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms) {
            var admittedNamed = ParchLockMap.Rooms.find(function (r) {
                return r && r.HasRealId && String(r.ObjectId) === String(meta.toId)
                    && r.Name && !MapTopology.isInternalRoomName(r.Name);
            });
            if (admittedNamed) toName = admittedNamed.Name;
        }
        // Do not mint map rooms for animate/clothing ObjectIds (NPC "Michael",
        // "Michael's pants") even when look-ahead resolves a destination id.
        // Doors remain allowed (D42). Structural check only when RAM is live.
        // D201: once a destination ObjectId was already admitted (containment
        // provenance + player-facing label), blank compiled short names must
        // not strip toName here -- that left state-delta edges as ExitMeta
        // hints only and produced isolated map rooms for the unnamed
        // early-Inform family. Unvisited blank destinations stay name-less
        // and remain hinted until travel admits them.
        try {
            if (toName && meta && meta.toId != null
                && typeof ZRamReader !== "undefined" && ZRamReader.isPlausibleMapRoom
                && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                var _m2 = ZRamProvider.getMem();
                var destAdmitted = (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms || []).some(function (r) {
                    return r && r.HasRealId && String(r.ObjectId) === String(meta.toId);
                });
                var decoderRoom = meta.hintOnly && meta.roomHintSourceId != null && typeof GrammarProvider !== 'undefined'
                    && GrammarProvider.d214RoomTarget && GrammarProvider.d214RoomTarget(_m2, meta.roomHintSourceId, Number(meta.toId));
                if (_m2 && !destAdmitted && !decoderRoom && !ZRamReader.isPlausibleMapRoom(_m2, meta.toId)) {
                    toName = null;
                }
            }
        } catch (ePlaus) {}
        // System prop-index placeholders must never become pathable Exits[]
        // edges (operator: auto-pathing submitted "exit-13" and the parser
        // rejected it). Keep ExitMeta for diagnostics; travel/state-delta
        // will write the real command key when confirmed.
        if (MapTopology.isSystemPropExitKey(dir)) {
            from.ExitMeta[dir].hinted = true;
            if (from.Exits && Object.prototype.hasOwnProperty.call(from.Exits, dir)) {
                delete from.Exits[dir];
            }
            return;
        }
        if (toName) {
            var to = MapTopology.ensureRoom(toName, meta && meta.toId, meta);
            if (!to) {
                from.ExitMeta[dir].hinted = true;
                return;
            }
            // Never create a self-loop edge (Alley  ->  Alley). Confirmed live on
            // Anchorhead when identity briefly disagreed during look-ahead /
            // state-delta; the map then drew two current-room boxes.
            if (String(to.Id) === String(from.Id)) {
                from.ExitMeta[dir].hinted = true;
                if (from.Exits && Object.prototype.hasOwnProperty.call(from.Exits, dir)) {
                    delete from.Exits[dir];
                }
                return;
            }
            // D49/D48/D55: only one pathable Exits[] key per destination when
            // the keys are aliases for the SAME exit (label "exit 2" vs command
            // "x2"), or uncalibrated dual diagonal candidates. Keep ExitMeta for
            // alternate labels (radial still offers them); do not mint a second
            // pathable key that reappears every look-ahead tick after travel.
            var existingSame = null;
            Object.keys(from.Exits || {}).forEach(function (ed) {
                if (String(from.Exits[ed]) !== String(to.Id)) return;
                if (ed === dir) return;
                var em = from.ExitMeta[ed] || {};
                var sameAlias = (ed === command || em.command === command
                    || em.label === dir || em.command === dir
                    || ed === (meta && meta.label));
                if (meta.ambiguousDiagonal || sameAlias) existingSame = ed;
            });
            if (existingSame != null) {
                from.ExitMeta[dir].hinted = true;
                from.ExitMeta[dir].duplicateDestOf = existingSame;
                return;
            }
            // D214 decoded ZIL links disclose geography, not permission. A
            // destination visited by another route does not prove THIS edge.
            if (meta.hintOnly && String(from.ExitMeta[dir].travelledTo || '') !== String(meta.toId)) {
                from.ExitMeta[dir].hinted = true;
                if (from.Exits) delete from.Exits[dir];
                return;
            }
            from.Exits[dir] = to.Id;
        } else {
            from.ExitMeta[dir].hinted = true;
        }
    },
    // D74: shared resolver for every OTHER `ParchLockMap.CurrentRoom =`
    // write site (TranslatorUI.js/ParchLock.js) -- resolves to the same
    // frozen, real-id-first identity `applyPayloadExits` above now uses,
    // instead of each site re-deriving (or worse, just re-using) a raw,
    // possibly re-randomized `payload.roomName` string independently.
    resolveCurrentRoomName: function (payload) {
        if (!payload || !payload.roomName) return payload && payload.roomName;
        try {
            // D54: internal/meta names are not CurrentRoom. Keep any prior
            // good CurrentRoom; do not paint "(Inform Library)" etc.
            if (MapTopology.isInternalRoomName(payload.roomName)) {
                return (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
            }
            // M09: do not mint the first current room under epigraph/boot
            // when the map is still empty (Curses Tiny Balcony, Ghost 179,
            // Vespers menu obj34).
            if (!MapTopology.mayAdmitFirstCurrentRoom(payload)) {
                return (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
            }
            // Defense: never promote an animate/meta ObjectId into the room
            // graph (Anchorhead "Michael"; Inform thedark / Library).
            try {
                if (payload.roomId != null && typeof ZRamReader !== "undefined"
                    && ZRamReader.isPlausibleMapRoom && typeof ZRamProvider !== "undefined"
                    && ZRamProvider.getMem) {
                    var _mem = ZRamProvider.getMem();
                    var containmentProven = payload.probe
                        && payload.probe.roomSource === "player-containment"
                        && String(payload.probe.roomId) === String(payload.roomId);
                    if (_mem && !containmentProven && !ZRamReader.isPlausibleMapRoom(_mem, payload.roomId)) {
                        return (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
                    }
                }
            } catch (eAnim) {}
            var room = MapTopology.ensureRoom(payload.roomName, payload.roomId, payload);
            if (!room) {
                return (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
            }
            if (payload.roomId != null && !MapTopology.isInternalRoomName(payload.roomName)) {
                // First real visit with a player-facing title: lock display
                // and mark VisitedName so map/list filters treat it as known.
                if (!room.VisitedName || MapTopology.isInternalRoomName(room.Name)) {
                    room.Name = payload.roomName;
                    room.VisitedName = true;
                }
                MapTopology.stampSectionGroup(room, payload);
            }
            if (room && ParchLockMap.SetCurrentRoom) ParchLockMap.SetCurrentRoom(room);
            if (room && room.Name && !MapTopology.isInternalRoomName(room.Name)) return room.Name;
        } catch (e) {}
        return (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom) || "";
    },

    applyPayloadExits: function (payload) {
        if (!payload) return;
        var roomName = payload.roomName || "";
        // D54/D74: never seed exits from an internal/meta roomName. Fall
        // back to an already-resolved player-facing CurrentRoom only.
        if (!roomName || MapTopology.isInternalRoomName(roomName)) {
            roomName = (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom
                && !MapTopology.isInternalRoomName(ParchLockMap.CurrentRoom))
                ? ParchLockMap.CurrentRoom
                : "";
        }
        if (!roomName) return;
        // M09: empty map must not seed exits from an unannounced boot room.
        if (!MapTopology.mayAdmitFirstCurrentRoom(payload)
            && MapTopology.mapIsEmptyOfRealRooms()) return;
        // Same animate/clothing/meta guard as resolveCurrentRoomName.
        try {
            if (payload.roomId != null && typeof ZRamReader !== "undefined"
                && ZRamReader.isPlausibleMapRoom && typeof ZRamProvider !== "undefined"
                && ZRamProvider.getMem) {
                var _m3 = ZRamProvider.getMem();
                var containmentProven = payload.probe
                    && payload.probe.roomSource === "player-containment"
                    && String(payload.probe.roomId) === String(payload.roomId);
                if (_m3 && !containmentProven && !ZRamReader.isPlausibleMapRoom(_m3, payload.roomId)) return;
            }
        } catch (ePay) {}
        if (MapTopology.isInternalRoomName(roomName)) return;
        var room = MapTopology.ensureRoom(roomName, payload.roomId, payload);
        if (room) MapTopology.stampSectionGroup(room, payload);
        // D74: use the room's own FROZEN identity name (D62) from here on,
        // not the raw `payload.roomName` string just read this tick. Some
        // games (confirmed live: wump2ka.z5.js) re-randomize their printed
        // room label on revisits -- D62 already keeps the underlying room
        // RECORD's `.Name` stable against that, but every direct
        // `ParchLockMap.CurrentRoom = <raw string>` assignment (this one,
        // plus the ones in TranslatorUI.js/ParchLock.js) still overwrote
        // CurrentRoom with that fresh, re-randomized text -- so CurrentRoom
        // drifted to a string matching NO room in `ParchLockMap.Rooms`,
        // and `Map.js Draw()`'s `GetRoom(CurrentRoom)` lookup silently
        // failed, rendering zero boxes (not even "here"). Confirmed live
        // by the operator after using the Reset Map button then continuing
        // to play. Reassigning `roomName` here to the resolved identity
        // also keeps the `link()` calls below keyed consistently.
        if (room && room.Name) roomName = room.Name;
        if (typeof ParchLockMap !== "undefined") {
            if (ParchLockMap.SetCurrentRoom) ParchLockMap.SetCurrentRoom(room);
            else ParchLockMap.CurrentRoom = roomName;
        }
        (payload.exits || []).forEach(function (raw) {
            var ex = MapTopology.classifyExit(raw);
            var dest = ex.targetRoomName || null;
            if (dest && dest.charAt(0) === "(") dest = null;
            // Drop internal short-names here too (link() also defends) so a
            // look-ahead C_ROOMS_* destination never becomes a map node.
            if (dest && MapTopology.isInternalRoomName(dest)) dest = null;
            MapTopology.link(roomName, ex.label, dest, {
                fromId: payload.roomId,
                toId: ex.targetRoomId,
                isDoor: !!ex.isDoor,
                // Locked R2: true / false / unknown (undefined). Unknown is not coerced to
                // false; link() lets the latest observation replace an older one.
                isLocked: ex.isLocked === true ? true : ex.isLocked === false ? false : undefined,
                routeBlocked: ex.routeBlocked === true ? true : ex.routeBlocked === false ? false : undefined,
                doorObjectId: ex.doorObjectId,
                confidence: ex.confidence,
                source: raw && raw.source === "i7-mapstorage" ? "i7-mapstorage" : "ram-lookahead",
                prop: ex.prop,
                command: ex.command || ex.label,
                ambiguousDiagonal: !!ex.ambiguousDiagonal,
                hintOnly: !!ex.hintOnly,
                roomHintSourceId: ex.roomHintSourceId,
                doorTo: ex.isDoor && ex.doorTo != null ? ex.doorTo : undefined,
                doorToName: ex.isDoor && ex.doorTo != null ? ex.doorToName : undefined
            });
        });
    },
    // D223: source-owned reconciliation for Map_Storage hints, current room
    // only, run BEFORE mergeConfirmedExits. Unwalked i7-mapstorage entries
    // whose cell is gone/changed (or whose decoder is invalid) are removed with
    // their own target metadata; walked or other-source entries are untouched.
    reconcileI7MapStorage: function (payload) {
        try {
            if (!payload || payload.roomId == null || typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return;
            var st = (typeof ZRamReader !== "undefined" && ZRamReader._i7LaneState) || null;
            if (!st || !st.active || String(st.roomId) !== String(payload.roomId)) return;
            // The lane state must belong to THIS collection generation and
            // this interpreter memory (Codex #2800), never a stale or foreign one.
            var gen = (typeof ZRamProvider !== "undefined" && ZRamProvider.collectGeneration) || 0;
            var mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
            if (st.gen !== gen || !mem || st.memKey !== ((mem && mem.buffer) || mem)) return;
            var room = ParchLockMap.Rooms.find(function (r) { return r && r.HasRealId && String(r.ObjectId) === String(payload.roomId); });
            if (!room || !room.ExitMeta) return;
            var want = {};
            if (st.valid) (st.exits || []).forEach(function (e) { if (e.targetRoomId != null) want[MapTopology.normalizeLabel(e.label) || e.label] = String(e.targetRoomId); });
            Object.keys(room.ExitMeta).forEach(function (dir) {
                var em = room.ExitMeta[dir];
                if (!em || em.source !== "i7-mapstorage" || em.travelledTo) return;
                // Stored keys may be short (D69 "n"); labels are full ("north").
                var canon = MapTopology.normalizeLabel(dir) || dir;
                if (want[canon] != null && String(em.toId) === want[canon]) return;
                if (room.Exits) delete room.Exits[dir];
                delete room.ExitMeta[dir];
            });
        } catch (e) {}
    },
    // D213: the RAM parent of the (corrected) player, or null when unknown.
    playerParentId: function (payload) {
        try {
            if (!payload || payload.playerId == null || typeof ZRamReader === "undefined"
                || typeof ZRamProvider === "undefined" || !ZRamProvider.getMem) return null;
            var mem = ZRamProvider.getMem();
            if (!mem) return null;
            var links = ZRamReader.objectLinks(mem, payload.playerId);
            var parent = links && links.parent;
            if (!parent || parent === payload.playerId) return null;
            // A corrupt chain must not stamp containment: the bounded
            // ancestor walk from the player has to reach the room (#1607).
            if (payload.roomId != null) {
                var seen = {}, id = parent, steps = 0, reached = false;
                while (id && steps++ < 32 && !seen[id]) {
                    if (String(id) === String(payload.roomId)) { reached = true; break; }
                    seen[id] = true;
                    var up = ZRamReader.objectLinks(mem, id);
                    if (!up) return null;
                    id = up.parent;
                }
                if (!reached) return null;
            } else if (!ZRamReader.objectLinks(mem, parent)) return null;
            return parent;
        } catch (e) { return null; }
    },
    // D213: in-room steps learned before containment evidence was required
    // may be false (a combat verb recorded because the status banner
    // changed). They are moved, unchanged, out of the active ExitMeta into
    // the room's UnprovenSubSteps -- never deleted. A later containment-
    // proven step for the same command clears its quarantine record.
    quarantineUnprovenSubSteps: function (rooms) {
        (rooms || []).forEach(function (r) {
            var meta = r && r.ExitMeta;
            if (!meta) return;
            Object.keys(meta).forEach(function (k) {
                // Operator ruling (2026-10-06): resetting old unproven steps is
                // acceptable. Every step learned before containment evidence
                // existed is set aside uniformly (data preserved) and returns on
                // its next proven use -- no word-list guess about which were real.
                if (meta[k] && meta[k].subLocation && meta[k].evidence !== "containment") {
                    r.UnprovenSubSteps = r.UnprovenSubSteps || {};
                    r.UnprovenSubSteps[k] = meta[k];
                    delete meta[k];
                }
            });
        });
        return rooms;
    },
    applyStateDelta: function (payload) {
        if (!payload || !payload.roomName) return;
        if (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.pending) {
            MapTopology.prevRoomId = null;
            MapTopology.prevRoomName = "";
            return;
        }
        var currId = payload.roomId || null;
        var currName = payload.roomName;
        // D54: never record travel from/to meta short-names.
        if (MapTopology.isInternalRoomName(currName)) return;
        if (MapTopology.prevRoomName && MapTopology.isInternalRoomName(MapTopology.prevRoomName)) {
            MapTopology.prevRoomId = currId;
            MapTopology.prevRoomName = currName;
            return;
        }
        var prevName = MapTopology.prevRoomName;
        var changed = currId != null && MapTopology.prevRoomId != null
            ? String(currId) !== String(MapTopology.prevRoomId)
            : prevName.toLowerCase() !== currName.toLowerCase();
        // D163 (operator-reported regression): a step that moves the player
        // WITHIN a room used to be learned and no longer was. Anchorhead's
        // alley is climbed with "stand on can" -- the story answers "You
        // clamber onto the wobbling garbage can" and the location becomes
        // "Alley, on the garbage can" -- and the operator had the compass ring
        // offering that step, "without actually adding an extra room for the
        // top of the can".
        //
        // It worked in v27 because findLikelyLocation had no walk-up: standing
        // on the can made the CAN the location, so the room id changed and the
        // command was recorded. D139 added the walk-up so the room is the room
        // and not the furniture (Cutthroats reported "bed"), which is correct
        // and stays -- but it left the id identical on both sides, so `changed`
        // is false and nothing is learned.
        //
        // The evidence is still there in the name the game itself prints. When
        // the room ID is unchanged but its printed name is not, the player
        // moved within the room: record the command as a hinted step on this
        // room. No room is minted and no pathable edge is created -- there is
        // no destination to point at -- so this only ever adds a direction the
        // player can pick, which is exactly what was lost.
        //
        // D213: the printed name alone is not movement. Treasures' combat
        // status grid replaces the room banner ("BARBARIAN"), so a bare
        // "assail" was recorded as a compass step. Movement within a room
        // must be shown by RAM: the player's own parent changed (room ->
        // can, can -> room) while the room stayed the same, and the command
        // passes the original D163 command gate.
        var currParent = MapTopology.playerParentId(payload);
        var prevParent = MapTopology.prevPlayerParent && MapTopology.prevPlayerParent.roomId != null
            && String(MapTopology.prevPlayerParent.roomId) === String(MapTopology.prevRoomId)
            ? MapTopology.prevPlayerParent.parent : null;
        if (prevName && currName && !changed && currId != null
            && String(currId) === String(MapTopology.prevRoomId)
            && prevParent != null && currParent != null && prevParent !== currParent
            && (String(prevParent) !== String(currId) || String(currParent) !== String(currId))) {
            try {
                var subCmd = MapTopology.readLastTypedCommand() || "";
                if (subCmd && !MapTopology.isNonTravelCommand(subCmd)) {
                    var here = MapTopology.ensureRoom(currName, currId) || MapTopology.ensureRoom(prevName, currId);
                    if (here) {
                        var subKey = MapTopology.normalizeLabel(subCmd);
                        here.ExitMeta = here.ExitMeta || {};
                        if (!here.ExitMeta[subKey] || here.ExitMeta[subKey].subLocation) {
                            here.ExitMeta[subKey] = {
                                label: subKey, command: subCmd, hinted: true, subLocation: true, evidence: "containment"
                            };
                        }
                        if (here.UnprovenSubSteps && here.UnprovenSubSteps[subKey]) delete here.UnprovenSubSteps[subKey];
                    }
                }
            } catch (eSub) {}
        }
        MapTopology.prevPlayerParent = { roomId: currId, parent: currParent };
        if (prevName && currName && changed) {
            var rawTyped = MapTopology.readLastTypedCommand() || "move";
            // D140 (found sweeping wump2ka): the room the player is standing in
            // can change on a turn where they did NOT travel -- a "look" that
            // first reveals the room, a "no" answering the restore prompt, a
            // timed event that moves them. The typed command was being taken as
            // the edge label regardless, so Wumpus's map grew an exit literally
            // called "look", and the router then tried to travel by typing it.
            //
            // A stop-list, not a whitelist: games invent their own travel words
            // (Wumpus's "x1", Planetfall's "starboard"), so anything unknown is
            // still allowed through. Only commands that are definitively NOT
            // movement are refused.
            if (MapTopology.isNonTravelCommand(rawTyped)) {
                MapTopology.prevRoomId = currId;
                MapTopology.prevRoomName = currName;
                return;
            }
            var label = MapTopology.normalizeLabel(rawTyped);
            var parts = label.split(/\s+/);
            var maybeDir = parts[parts.length - 1];
            if (MapTopology.isCardinal(maybeDir)) label = MapTopology.normalizeLabel(maybeDir);
            else if (/^go\s+/.test(label)) {
                var rest = label.replace(/^go\s+/, "");
                if (MapTopology.isCardinal(rest)) label = MapTopology.normalizeLabel(rest);
            }

            // D55 label/command split (Wumpus E1+X1): when the departure room
            // already holds exactly one exit whose recorded COMMAND is what was
            // just submitted (label "exit 1", command "x1") and whose
            // destination agrees, the walk confirms THAT exit -- key the edge by
            // its label, not by the command, so one exit keeps one key/label.
            try {
                var typedLower = String(rawTyped).toLowerCase().trim();
                // Grok #3262: lookup only (never mint a room), non-cardinal labels only.
                var departRoom = (typeof ParchLockMap !== "undefined" && MapTopology.prevRoomId != null)
                    ? (ParchLockMap.Rooms || []).filter(function (r) {
                        return r && r.HasRealId && String(r.ObjectId) === String(MapTopology.prevRoomId);
                    })[0] : null;
                if (departRoom && departRoom.ExitMeta && !departRoom.ExitMeta[label] && !MapTopology.isCardinal(label)) {
                    var aliasKeys = Object.keys(departRoom.ExitMeta).filter(function (k) {
                        var em = departRoom.ExitMeta[k];
                        return k !== label && em && String(em.command || "").toLowerCase().trim() === typedLower
                            && (currId == null ? true : (em.toId != null && String(em.toId) === String(currId)));
                    });
                    if (aliasKeys.length === 1) label = aliasKeys[0];
                }
            } catch (eAlias) {}
            // Real-evidence resolution (D40/D49): the room just left may
            // already carry a direction key pointing at this exact
            // destination -- either a compass guess from the pre-travel
            // RAM lookahead, or (D49) a neutral "exit-N" placeholder that
            // deliberately asserted no compass word yet. Either way, a real
            // confirmed move (state-delta, confidence 0.98) is decisive
            // ground truth for what this direction is actually called, so
            // any earlier, less-certain key for the SAME destination is
            // superseded -- drop it rather than leave two paths to one
            // room under different labels. This is general (any stale key
            // vs. the real one), not specific to diagonals; the diagonal
            // profile calibration is a separate side effect below, for
            // future lookaheads only.
            // D134: a real move just completed, from a real RAM room id, in a
            // known direction, to a real RAM room id. That is ground truth,
            // and it is the ONLY evidence ExitCalibrator ever learns from --
            // it looks at which of the departure room's properties actually
            // contained this destination, so the map can later read exits the
            // player has not walked. Nothing is emitted from a property until
            // it has predicted travel in several distinct rooms.
            try {
                if (typeof ExitCalibrator !== "undefined" && ExitCalibrator.observe
                    && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) {
                    ExitCalibrator.observe(ZRamProvider.getMem(), MapTopology.prevRoomId, label, currId);
                }
            } catch (eEC) {}

            if (typeof ParchLockMap !== "undefined") {
                var prevRoom = MapTopology.ensureRoom(prevName, MapTopology.prevRoomId);
                // Exits values are ParchLockMap.Rooms ARRAY INDICES (Id), not
                // the raw RAM room id in `currId`. D62: a pre-travel
                // lookahead hint records its destination's ARRAY id under
                // whatever name was known at hint time -- often the room's
                // still-garbled internal short name, before D54's display
                // refinement ever runs (refinement only happens once the
                // player actually stands there and its status bar becomes
                // readable). A plain name-based lookup here (GetRoom) can
                // therefore miss the ALREADY-KNOWN room entirely, since
                // `currName` is now the REFINED display string, not the
                // stub's original name -- causing dedup to silently never
                // fire, a stale/duplicate exit key to persist, and (found
                // live in wump2ka.z5.js) a wrong Id when a name coincidentally
                // matched a different room. Resolve identity by the real RAM
                // id first (ensureRoom, the same id-first lookup D47 already
                // established), which finds-or-creates the correct room
                // record regardless of which display string was used when.
                var currRoomRecord = MapTopology.ensureRoom(currName, currId);
                var currRoomsId = currRoomRecord ? currRoomRecord.Id : null;
                if (prevRoom && prevRoom.Exits && prevRoom.ExitMeta && currRoomsId != null) {
                    Object.keys(prevRoom.Exits).slice().forEach(function (existingDir) {
                        if (existingDir === label) return;
                        if (String(prevRoom.Exits[existingDir]) !== String(currRoomsId)) return;
                        var meta = prevRoom.ExitMeta[existingDir];
                        if (meta && meta.source === "state-delta" && meta.confidence >= 0.98) return;
                        var propNum = meta && meta.prop;
                        if (propNum != null && typeof ZRamReader !== "undefined" && ZRamReader.calibrateDiagonalFromTravel) {
                            ZRamReader.calibrateDiagonalFromTravel(propNum, label, currRoomsId, prevRoom.Exits[existingDir]);
                        }
                        delete prevRoom.Exits[existingDir];
                        delete prevRoom.ExitMeta[existingDir];
                    });
                }
            }

            // Prefer the exact typed/submitted command for pathing (wumpus
            // needs "x1" not a display synonym). Fall back to the normalized
            // label when the echo is unavailable.
            var typedCmd = MapTopology.readLastTypedCommand() || label;
            MapTopology.link(prevName, label, currName, {
                fromId: MapTopology.prevRoomId,
                toId: currId,
                isNonCardinal: !MapTopology.isCardinal(label),
                confidence: 0.98,
                source: "state-delta",
                command: String(typedCmd || label).toLowerCase().trim()
            });
        }
        MapTopology.prevRoomId = currId;
        MapTopology.prevRoomName = currName;
    },
    // Count traveled Exits plus any hinted ExitMeta already recorded
    // (untraveled look-ahead). Dest-backed I6 direction properties
    // populate Exits; this is not an I7 doorDir discovery path.
    countRoomExits: function (room) {
        if (!room) return 0;
        var keys = {};
        Object.keys(room.Exits || {}).forEach(function (k) {
            if (k && room.Exits[k] != null) keys[k] = 1;
        });
        Object.keys(room.ExitMeta || {}).forEach(function (k) {
            if (!k) return;
            var meta = room.ExitMeta[k];
            if (!meta) return;
            if (meta.hinted || keys[k] || room.Exits[k] != null) keys[k] = 1;
            else keys[k] = 1;
        });
        return Object.keys(keys).length;
    },
    // Wumpus (and similar) regenerate the dungeon on a fresh start. A prior
    // session's PL_Map_* graph is wrong for the new seed. When the story
    // asks to restore and the player answers no, wipe the working map so
    // boot cannot show last run's rooms beside "(Inform Library)".
    // (Plan: specialized restore prompt handling; D76 Reset Map semantics.)
    _awaitingRestoreAnswer: false,
    noteRestorePrompt: function () {
        try {
            if (typeof $ === "undefined") return;
            var t = String((typeof BufferRevision !== "undefined" ? BufferRevision.text("#windowport") : $("#windowport").text()) || "");
            if (/would you like to restore a saved game/i.test(t)) {
                MapTopology._awaitingRestoreAnswer = true;
            }
        } catch (e) {}
    },
    handlePossibleNewGameAnswer: function (cmd) {
        if (!MapTopology._awaitingRestoreAnswer) return;
        var s = String(cmd || "").trim().toLowerCase();
        if (!s) return;
        if (/^(n|no)\b/.test(s)) {
            MapTopology._awaitingRestoreAnswer = false;
            try {
                if (typeof ParchLockMap !== "undefined" && ParchLockMap.Clear) {
                    // Clear without re-seeding from a still-meta payload.
                    ParchLockMap.PersistenceBlocked = false;
                    ParchLockMap.Rooms = [];
                    ParchLockMap.CurrentRoom = "";
                    ParchLockMap.CurrentRoomId = null;
                    ParchLockMap.DisplayedRoomId = null;
                    // D112: an emptied Rooms array invalidates any active
                    // Notes scope.
                    ParchLockMap.NotesScopeRoomKey = null;
                    MapTopology.prevRoomId = null;
                    MapTopology.prevRoomName = "";
                    if (typeof ParchLock !== "undefined" && ParchLock.GameFilename) {
                        try { localStorage.removeItem("PL_Map_" + ParchLock.GameFilename); } catch (eL) {}
                    }
                    try { ParchLockMap.UpdateStats(); ParchLockMap.RebuildRoomsList(); ParchLockMap.RebuildNotesList(); ParchLockMap.ApplyNotesAddButtonPref(); ParchLockMap.Draw(); } catch (eD) {}
                }
            } catch (e) {}
            // D182 (grok seat): declining the restore prompt starts a NEW game,
            // and this is the only place that knows it. UndoRestoreSync.resync
            // -- where D180 wired the stats in -- is never reached, because
            // noteCommand only matches undo/restore/restart/load and the
            // player's command here is simply "no". So the map was wiped while
            // the previous game's score and carried totals stayed on screen:
            // the exact gap D180 was meant to close and did not.
            try {
                if (typeof StatTracker !== "undefined" && StatTracker.Resync) StatTracker.Resync("new-game");
            } catch (eS) {}
            return;
        }
        if (/^(y|yes)\b/.test(s)) {
            MapTopology._awaitingRestoreAnswer = false;
        }
    },
    tick: function (payload) {
        payload = payload || (typeof WorldModel !== "undefined" && WorldModel.lastPayload);
        if (!payload) return;
        try { MapTopology.noteRestorePrompt(); } catch (eR) {}
        MapTopology.applyPayloadExits(payload);
        MapTopology.applyStateDelta(payload);
        if (typeof MapBeautify !== "undefined" && MapBeautify.tick) {
            try { MapBeautify.tick(); } catch (e) {}
        }
    }
};
