var ParchLockMap = {

    Rooms: [],
    CurrentRoom: "",
    DisplayedRoom: "",
    CurrentRoomId: null,
    DisplayedRoomId: null,
    AllowUpdate: true,
    Visible: false,
    Scale: 1,
    MapMode: "hub",
    OverviewThreshold: 0.82,
    OverviewHysteresis: 0.05,
    GraphRevision: 0,
    OverviewLayoutRevision: -1,
    OverviewCoords: {},
    OverviewEdges: [],
    ActivePointers: {},
    PinchState: null,
    PanX: 0,
    PanY: 0,
    IsDragging: false,
    DragStartX: 0,
    DragStartY: 0,
    DragPanX: 0,
    DragPanY: 0,
    DragMoved: false,

    // D112: null = the Notes section shows every room with notes, grouped,
    // in Known-Rooms order. Set by FocusNotesForRoom to scope it to one
    // room (any of the four "view this room's notes" triggers, all of
    // which still funnel through ShowNotes -> FocusNotesForRoom). Explicit
    // state, not inferred, so a scoped view and a manually-reopened
    // all-rooms view can never be confused with each other.
    NotesScopeRoomKey: null,

    Build: () => {
        try { ParchLockMap.BindResetMap(); } catch (e) {}

        ParchLockMap.CreateRooms(["in", "up"]);
        ParchLockMap.CreateRooms(["nw", "n", "ne"]);
        ParchLockMap.CreateRooms(["w", "here", "e"]);
        ParchLockMap.CreateRooms(["sw", "s", "se"]);
        ParchLockMap.CreateRooms(["down", "out"]);
        $("<div>").attr("id", "map-overview").attr("aria-label", "Known world overview").appendTo("#map #rooms");

        ParchLockMap.CreateMiniMap("horizontal top", ["nw", "n", "ne"]);
        ParchLockMap.CreateMiniMap("horizontal bottom", ["sw", "s", "se"]);
        ParchLockMap.CreateMiniMap("vertical left", ["in", "w", "out"]);
        ParchLockMap.CreateMiniMap("vertical right", ["up", "e", "down"]);

        $("#current-room-notes").click(() => ParchLockMap.ShowNotes(null, ParchLockMap.GetCurrentRoom()));
        // D112: this single binding now refreshes Known Rooms AND the Notes
        // section together, so a search term narrows both lists at once.
        $("#room-filter").on("input", () => {
            ParchLockMap.RebuildRoomsList();
            ParchLockMap.RebuildNotesList();
        });
        $("#center-current-room").click(() => { ParchLockMap.ResetViewport(); ParchLockMap.Draw(); });
        $("#export-map").click(() => WorkspaceUI.ShowMaps());
        $("#zoom-in").click(() => ParchLockMap.Zoom(0.1));
        $("#zoom-out").click(() => ParchLockMap.Zoom(-0.1));
        $("#zoom-reset").click(ParchLockMap.ResetViewport);
        $("#map #rooms-shell")
            .on("wheel", ParchLockMap.MapWheel)
            .on("pointerdown", ParchLockMap.PointerDown)
            .on("lostpointercapture", ParchLockMap.PointerUp);
        $(document)
            .on("pointermove", ParchLockMap.PointerMove)
            .on("pointerup pointercancel", ParchLockMap.PointerUp);

        // D112: map controls (Center/Zoom/Reset/Maps) collapsible -- open
        // by default on desktop, collapsed by default on the mobile-compact
        // layout (operator decision). #items-tab has no such default-state
        // rule, so this is new, not copied from an existing pattern.
        $("#map-controls-tab").prop("open", $(window).width() >= 850);

        ParchLockMap.BindNotesGestures();
        $("#notes-add-button").on("click", () => {
            var target = ParchLockMap.NotesScopeRoomKey ? ParchLockMap.GetRoom(ParchLockMap.NotesScopeRoomKey) : ParchLockMap.GetCurrentRoom();
            if (!target) return;
            ParchLockMap.PromptAddNote(target);
        });
        ParchLockMap.ApplyNotesAddButtonPref();
        ParchLockMap.RebuildNotesList();

        $(window).off("resize.pmMapOverview").on("resize.pmMapOverview", function () {
            ParchLockMap.GraphRevision++;
            if (ParchLockMap.MapMode === "overview") ParchLockMap.DrawOverview(ParchLockMap.DisplayedRoomId);
        });

        ParchLockMap.AutoOpenPending = $(window).width() >= 850;
    },

    // D112: press-and-hold (mobile) or right-click (desktop) on a Known
    // Rooms row opens the add-note popup for that row's room. Bound once,
    // delegated on the stable #container parent, since RebuildRoomsList
    // tears down and recreates the row elements themselves. Deliberately
    // NOT added to the map canvas at all (operator decision: sidesteps the
    // drag/pan gesture conflict entirely rather than arbitrating it) -- the
    // canvas keeps its existing click/drag/icon behavior completely
    // untouched, mobile or desktop.
    BindNotesGestures: () => {
        var container = $("#rooms-list #container");
        container.off(".pmNotes");
        ParchLockMap._notesTouch = null;

        container.on("contextmenu.pmNotes", "> div", function (e) {
            if ($(e.target).closest(".icon").length) return;
            e.preventDefault();
            e.stopPropagation();
            ParchLockMap.PromptAddNote($(this).data("room"));
        });

        // Real touchstart/touchmove/touchend timing, same contract already
        // used for the input-line/char-strip long-press (Actionable.js:
        // LongPressMs/LongPressMoveCancelPx, child-icon exclusion, move-
        // cancel threshold, pointercancel/touchcancel cleanup, and
        // suppressing exactly the one trailing click a fired hold would
        // otherwise also cause -- "go to room").
        container.on("touchstart.pmNotes", "> div", function (e) {
            if ($(e.target).closest(".icon").length) return;
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var el = this;
            el.classList.add("pl-press-pending");
            var state = { el: el, startX: touch.clientX, startY: touch.clientY, fired: false };
            ParchLockMap._notesTouch = state;
            state.timer = setTimeout(function () {
                if (ParchLockMap._notesTouch !== state) return;
                state.fired = true;
                el.classList.remove("pl-press-pending");
                ParchLockMap.PromptAddNote($(el).data("room"));
            }, Actionable.LongPressMs);
        }).on("touchmove.pmNotes", "> div", function (e) {
            var state = ParchLockMap._notesTouch;
            if (!state || state.el !== this) return;
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var dx = touch.clientX - state.startX, dy = touch.clientY - state.startY;
            if ((dx * dx + dy * dy) > (Actionable.LongPressMoveCancelPx * Actionable.LongPressMoveCancelPx)) {
                clearTimeout(state.timer);
                state.el.classList.remove("pl-press-pending");
                ParchLockMap._notesTouch = null;
            }
        }).on("touchend.pmNotes", "> div", function (e) {
            var state = ParchLockMap._notesTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            state.el.classList.remove("pl-press-pending");
            if (state.fired) e.preventDefault(); // suppress the trailing synthetic click (go-to-room)
            ParchLockMap._notesTouch = null;
        }).on("touchcancel.pmNotes", "> div", function () {
            var state = ParchLockMap._notesTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            state.el.classList.remove("pl-press-pending");
            ParchLockMap._notesTouch = null;
        });
    },

    // D125 (operator-reported): pressing the Map tab while the equipment
    // sheet was open appeared to do nothing. Both sheets are peers at the
    // same tier (z-index 20), so toggling `map-open` on top of `equip-open`
    // left BOTH set and #equipment simply kept winning the paint. The map tab
    // must SWAP to the map, mirroring what the equipment tab already does in
    // the other direction (EquipmentUI.Show clears map-open).
    Toggle: () => {

        ParchLockMap.AutoOpenPending = false;
        if (document.body.classList.contains("equip-open")) {
            $("body").removeClass("equip-open").addClass("map-open");
            return;
        }
        $("body").toggleClass("map-open");
        if (!document.body.classList.contains("map-open")) ParchLockMap.ClearGesture();
    },

    Show: () => {

        $("body").removeClass("equip-open").addClass("map-open");
        // Re-measure path endpoints after the sheet/column is shown (mobile
        // translateY / desktop dock). Skip when layout is still 0x0.
        requestAnimationFrame(function () { requestAnimationFrame(WorkspaceUI.DrawPaths); });
    },

    Hide: () => {

        $("body").removeClass("map-open");
        ParchLockMap.ClearGesture();
    },

    CreateRooms: (rooms) => {

        var row = $("<div>").appendTo("#map #rooms");

        rooms.forEach(dir => {

            var room = $("<div>").addClass("room dir-" + dir).appendTo(row);
            $("<div>").addClass("dir").text(dir == "here" ? "" : dir).appendTo(room);

            if (Input.KeyboardNavigation[dir]) room.attr("title", "Shift+" + Input.KeyboardNavigation[dir]);

            if (dir != "here") {

                $("<div>").addClass("icon remove-room").attr("title", "Remove this connection").click(ParchLockMap.RemoveRoom).appendTo(room);
            }

            $("<div>").addClass("name").appendTo(room);
            $("<div>").addClass("icon here").attr("title", "You are here").appendTo(room);
            $("<div>").addClass("icon back-to-room").attr("title", "Center map back on the room you're in").click(() => ParchLockMap.Draw()).appendTo(room);
            $("<div>").addClass("icon go-to-room").attr("title", "Go to this room").click(ParchLockMap.GotoRoom).appendTo(room);
            $("<div>").addClass("note").appendTo(room);
            $("<div>").addClass("icon all-notes").click(ParchLockMap.ShowNotes).appendTo(room).hide();

            room.click(ParchLockMap.RoomClicked);
        });
    },

    CreateMiniMap: (style, exits) => {

        var d = $("<div>").addClass("row").addClass(style).appendTo("#exits");

        exits.forEach(e => {

            var ex = $("<div>").addClass("exit").addClass("dir-" + e).appendTo(d);
            var travel = () => Actionable.Submit(Actionable.commandForExitLabel(ex.data("exit-label") || e));
            $("<span>").addClass("dir-name").text(e).appendTo(ex).click(travel);
            $("<div>").addClass("icon room-notes").click(function() {
                
                ParchLockMap.ShowNotes(null, $(this).parent().data("room"));

            }).appendTo(ex).hide();

            $("<span>").addClass("room-name").appendTo(ex).click(travel);
        });
    },

    GetRoom: (roomName) => {
        if (roomName && typeof roomName === "object") return ParchLockMap.Rooms.find(r => r === roomName || (r.Id === roomName.Id && r.ObjectId === roomName.ObjectId));
        if (typeof roomName === "number") return ParchLockMap.Rooms[roomName];
        var matches = ParchLockMap.Rooms.filter(r => r && r.Name.toLowerCase() === String(roomName || "").toLowerCase());
        return matches.length === 1 ? matches[0] : undefined;
    },

    GetRoomById: function (id) {
        return (ParchLockMap.Rooms || []).find(function (room) {
            return room && String(room.Id) === String(id);
        });
    },

    GetCurrentRoom: () => ParchLockMap.CurrentRoomId != null
        ? ParchLockMap.Rooms.find(r => r.HasRealId && String(r.ObjectId) === String(ParchLockMap.CurrentRoomId))
        : ParchLockMap.GetRoom(ParchLockMap.CurrentRoom),

    SetCurrentRoom: room => {
        if (!room) return;
        ParchLockMap.CurrentRoom = room.Name;
        ParchLockMap.CurrentRoomId = room.HasRealId ? String(room.ObjectId) : null;
    },

    GotoRoom: (e, roomName) => {

        if (e) {

            e.stopImmediatePropagation();
            var room = $(e.currentTarget);
            if (room.data("room")) {

                roomName = room.data("room");
            }
            else {

                var room = $(e.currentTarget).parent();
                roomName = room.data("room") || room.find(".name").text();
            }
        }

        var route = Navigator.FindRoute(ParchLockMap.GetCurrentRoom(), roomName);
        if (route && route.length) {
            if ($(window).width() < 850) ParchLockMap.Toggle();
        }
    },

    RemoveRoom: (e, roomName, removeRoomItself) => {

        if (e) {

            e.stopImmediatePropagation();
            var room = $(e.currentTarget);
            if (room.data("room")) {

                roomName = room.data("room");
            }
            else {

                var room = $(e.currentTarget).parent();
                roomName = room.data("room") || room.find(".name").text();
            }
        }

        var roomToRemove = ParchLockMap.GetRoom(roomName);
        var currentRoom = ParchLockMap.GetCurrentRoom();
        if (!roomToRemove || !currentRoom) return;

        for (var e in currentRoom.Exits) {

            if (currentRoom.Exits[e] == roomToRemove.Id) {

                delete currentRoom.Exits[e];
            }
        }

        if (removeRoomItself) {
            
            var temp = [];
            ParchLockMap.Rooms.forEach(r => { if (r.Id != roomToRemove.Id) temp.push(r); });
            var ids = {};
            temp.forEach((r, i) => { ids[r.Id] = i; });
            temp.forEach((r, i) => {
                r.Id = i;
                Object.keys(r.Exits || {}).forEach(dir => {
                    if (ids[r.Exits[dir]] == null) { delete r.Exits[dir]; if (r.ExitMeta) delete r.ExitMeta[dir]; }
                    else r.Exits[dir] = ids[r.Exits[dir]];
                });
            });
            ParchLockMap.Rooms = temp;
        }

        ParchLockMap.RefreshMapPanels();
    },

    RoomClicked: (e) => {

        if (ParchLockMap.DragMoved) return;

        var room = $(e.currentTarget);
        if (!room.hasClass("shown")) return;

        var roomName = room.data("room") || room.find(".name").text();

        ParchLockMap.Draw(roomName);
    },

    Draw: (roomName) => {

        // D67: a slot marked `tentative-exit` was never cleared here --
        // only `shown` was. `#map .room.tentative-exit{opacity:0.7}` beats
        // the base `#map .room{opacity:0}` rule on CSS specificity alone,
        // with or without `shown` also present, so ANY slot ever marked
        // tentative (D51's ambiguous-diagonal candidates, or D66's inferred
        // incoming-edge neighbors) stayed permanently visible showing
        // whatever stale room name was last written into it, even long
        // after that slot's real content moved on to something else or
        // nothing at all. The only thing that ever cleared it was the
        // main exits loop's own `.toggleClass("tentative-exit", isAmbiguous)`
        // happening to revisit that exact slot later with isAmbiguous
        // false -- which is exactly why repeatedly traveling back and
        // forth through the same rooms would eventually "fix" the map,
        // confirmed live on Zork1 (ghost "North of House ?" / "Forest
        // Path ?" boxes lingered at slots those rooms no longer occupied,
        // several real moves after they stopped being relevant). Clearing
        // both classes together here means every Draw() pass starts from
        // a genuinely clean slate; only the current pass's own
        // determination (either loop below) ever re-applies tentative-exit.
        $("#map .room").removeClass("shown tentative-exit");
        $("#exits .exit").removeClass("shown");
        // D71: reset every slot's corner label back to its own native
        // compass letter before this pass's loops run -- otherwise a
        // borrowed-slot label written by an earlier tick (e.g. "exit 1")
        // would linger forever, even once that slot legitimately goes back
        // to holding a real compass exit of its own. Iterates the same
        // fixed 12-slot list Build()/CreateRooms uses, not a live DOM scan.
        ["n", "ne", "e", "se", "s", "sw", "w", "nw", "up", "down", "in", "out"].forEach(function (slot) {
            $("#map .room.dir-" + slot).find(".dir").text(slot);
        });

        roomName = roomName || ParchLockMap.GetCurrentRoom();
        if (!roomName) return;
        // D54: never paint a meta/internal name as the center "here" box.
        if (typeof MapTopology !== "undefined" && MapTopology.isInternalRoomName
            && MapTopology.isInternalRoomName(typeof roomName === "string" ? roomName : (roomName && roomName.Name))) {
            return;
        }

        var room = ParchLockMap.GetRoom(roomName);
        if (!room) return;
        if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom
            && !MapTopology.isPlayerFacingRoom(room)) return;
        ParchLockMap.DisplayedRoom = room.Name;
        ParchLockMap.DisplayedRoomId = room.Id;

        if (ParchLockMap.MapMode === "overview") {
            ParchLockMap.DrawOverview(room.Id);
            return;
        }

        ParchLockMap.DrawRoom("here", room);

        // Multiple directions can genuinely lead to the same destination
        // room (e.g. both EAST and IN reach the same door object). Each
        // compass direction has its own fixed slot in this grid -- ANY
        // second box still reads as a second room (D48: "=E" labels failed
        // live). Show the destination once; leave repeat slots empty.
        //
        // D49/D51 ambiguous diagonals (nw/se unknown until travel): the
        // PAYLOAD still carries BOTH candidate words so the radial can
        // offer NW and SE (hiding either word was rejected in D51). The
        // MAP must still show only ONE box for that single destination
        // (drawing Alley twice was rejected live -- Anchorhead Outside).
        // MapTopology.link keeps one Exits[] edge + ExitMeta for both
        // labels; Draw collapses by dest room Id. After real travel,
        // state-delta drops the wrong key (D49 calibration).
        // D63: the compass grid only has physical DOM slots for the 12
        // fixed direction words (Build()/CreateRooms). Any game whose
        // exits are NOT compass words at all -- e.g. wump2ka.z5.js's
        // numbered "exit 1"/"exit 2" (this game's PRIMARY navigation
        // method, not an occasional extra) -- had literally nowhere to
        // render: `$("#map .room.dir-exit 1")` matches no element (the key
        // isn't a real compass word, and even contains a space), so the
        // map only ever showed the current room, no neighbors, no
        // connecting lines, confirmed live. This is a generic UI gap, not
        // specific to one game: any exit key that isn't one of the 12 real
        // slots needs a slot assigned to it purely for VISUAL positioning
        // (never changes what direction/command the exit actually is --
        // clicking a map box only re-centers the displayed room via its
        // real Name/Id, it does not submit a direction command). Real
        // compass exits claim their own slot first; leftover non-compass
        // exits fill whatever slots remain, in a fixed preference order.
        var ALL_SLOTS = ["n", "ne", "e", "se", "s", "sw", "w", "nw", "up", "down", "in", "out"];
        var isRealCompassDir = function (d) { return ALL_SLOTS.indexOf(d) >= 0; };
        var claimedSlots = {};
        for (var cdir in room.Exits) { if (isRealCompassDir(cdir)) claimedSlots[cdir] = true; }
        var slotFor = {};
        var nextSlotIdx = 0;
        function assignSlot(dir) {
            if (isRealCompassDir(dir)) return dir;
            if (slotFor[dir]) return slotFor[dir];
            while (nextSlotIdx < ALL_SLOTS.length && claimedSlots[ALL_SLOTS[nextSlotIdx]]) nextSlotIdx++;
            if (nextSlotIdx >= ALL_SLOTS.length) return null;
            var slot = ALL_SLOTS[nextSlotIdx];
            claimedSlots[slot] = true;
            slotFor[dir] = slot;
            return slot;
        }

        var shownRoomIds = {};
        for (var dir in room.Exits) {
            var destId = room.Exits[dir];
            var destRoom = ParchLockMap.Rooms[destId];
            if (!destRoom) continue;
            // D54/D80: never draw a neighbor box whose only known Name is an
            // internal compiler short-name (C_ROOMS_N) or a system exit
            // token. Identity remains in Rooms[] for later upgrade; the UI
            // waits until a real visit supplies a player-facing description.
            if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom
                && !MapTopology.isPlayerFacingRoom(destRoom)) continue;
            var meta = (room.ExitMeta || {})[dir];
            var isAmbiguous = !!(meta && meta.ambiguousDiagonal);
            // D49/D48: ambiguous diagonals may list the SAME destination under
            // both NW and SE until calibration (Anchorhead Outside→Alley).
            // Payload/radial still keep both candidate commands; the map must
            // never draw two boxes for one room id (operator: dual Alley).
            if (Object.prototype.hasOwnProperty.call(shownRoomIds, destId)) continue;
            // Raw prop-index keys ("exit-13") are internal look-ahead
            // placeholders (directionLabelForProp fallback), not player-
            // facing exit words. D60's real numbered form is "exit 1"
            // (space); state-delta writes the real command ("x1"/"southeast").
            // Never draw a map box under a hyphenated exit-N system key --
            // the same destination still renders via its real label when
            // present. (Operator: no "EXIT 16" system labels on the map.)
            // Share MapTopology.isSystemPropExitKey with overview admission/edges:
            // hyphenated exit-N system props stay hidden; numbered travel ("1"/"2"/"exit 1") does not.
            if (typeof MapTopology !== "undefined" && MapTopology.isSystemPropExitKey
                && MapTopology.isSystemPropExitKey(dir)) continue;
            var renderSlot = assignSlot(dir);
            if (!renderSlot) continue;
            ParchLockMap.DrawRoom(renderSlot, destRoom, dir);
            $("#map .room.dir-" + renderSlot).toggleClass("tentative-exit", isAmbiguous);
            shownRoomIds[destId] = dir;
        }

        // D66: a room's own Exits map only ever holds the direction the
        // player ACTUALLY typed FROM that room (MapTopology.applyStateDelta
        // writes the edge on the departure room only, never guessing that
        // travel is reversible -- some real games have genuine one-way
        // passages, so inventing a symmetric edge in the DATA model would
        // assert an unconfirmed fact). Confirmed live on Zork1: arriving at
        // a freshly-entered room (e.g. "Clearing", reached via SOUTH from
        // "Forest") shows a lone box with zero neighbors even though the
        // map already, genuinely knows Forest sits on its north side (from
        // Forest's own confirmed south exit) -- until the player happens to
        // try a direction FROM this new room too. Matches the operator's
        // "map doesn't update correctly until you travel back and forth" a
        // couple of times" report exactly. This does NOT invent a new
        // confirmed edge (never written to `room.Exits`/never treated as a
        // real command anywhere) -- it only DISPLAYS an already-100%-real
        // fact the map has from the other side, using the same generic,
        // language-level (not per-game) compass-opposite pairing, and
        // marked with the same `tentative-exit` visual treatment D51
        // already uses for "known but not confirmed FROM here." A map-box
        // click already only re-centers by the room's real Name/Id (never
        // submits a direction), so this can never cause an unconfirmed
        // command to be sent.
        var OPPOSITE = { n: "s", s: "n", e: "w", w: "e", ne: "sw", sw: "ne", nw: "se", se: "nw", up: "down", down: "up", "in": "out", out: "in" };
        for (var ri = 0; ri < (ParchLockMap.Rooms || []).length; ri++) {
            var otherRoom = ParchLockMap.Rooms[ri];
            if (!otherRoom || otherRoom === room || !otherRoom.HasRealId) continue;
            // Never reverse-draw the current room onto itself (self-loop /
            // duplicate Alley boxes).
            if (String(otherRoom.Id) === String(room.Id)) continue;
            if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom
                && !MapTopology.isPlayerFacingRoom(otherRoom)) continue;
            for (var odir in (otherRoom.Exits || {})) {
                if (String(otherRoom.Exits[odir]) !== String(room.Id)) continue;
                // Skip reverse display of ambiguous dual-keys that only
                // duplicate an already-shown neighbor.
                var ometa = (otherRoom.ExitMeta || {})[odir];
                if (ometa && ometa.ambiguousDiagonal && Object.prototype.hasOwnProperty.call(shownRoomIds, otherRoom.Id)) {
                    continue;
                }
                var opp = OPPOSITE[odir];
                if (!opp || claimedSlots[opp]) continue;
                if (Object.prototype.hasOwnProperty.call(shownRoomIds, otherRoom.Id)) continue;
                claimedSlots[opp] = true;
                ParchLockMap.DrawRoom(opp, otherRoom);
                $("#map .room.dir-" + opp).addClass("tentative-exit");
                shownRoomIds[otherRoom.Id] = opp;
            }
        }

        ParchLockMap.ApplyViewport();
        requestAnimationFrame(WorkspaceUI.DrawPaths);
    },

    // D71: this slot's small corner label was always the STATIC compass
    // letter baked in at Build() time (Map.js CreateRooms), never updated
    // per-render. That's correct for a real compass exit (the slot IS
    // that direction), but D63's borrowed-slot mechanism reassigns a
    // compass slot to hold a NON-compass exit for visual layout only (a
    // numbered-exit game like wump2ka.z5.js has no compass exits at all) --
    // confirmed live: the slot's corner kept showing "N"/"NE" even though
    // the real, only way to reach that room is "exit 1"/"exit 2", never a
    // compass word, which misleadingly implies a north/northeast
    // relationship that isn't real. `label` (when given) is the REAL
    // direction/exit key this room was actually reached by, and now wins
    // over the slot's own static letter; omitted, behavior is unchanged
    // (a real compass exit's slot already equals its own label).
    DrawRoom: (dir, roomName, label) => {
        var record = ParchLockMap.GetRoom(roomName);
        if (!record) return;
        roomName = record.Name;
        var room = $("#map .room.dir-" + dir);
        room.data("room", record);
        if (label != null && label !== dir) room.find(".dir").text(label);
        room.find(".name").text(roomName);
        room.find(".note").empty();
        room.find(".all-notes").hide();
        room.addClass("shown");

        room.find(".back-to-room, .go-to-room").hide();
        room.removeClass("here");

        var miniMap = $("#exits .exit.dir-" + dir);
        miniMap.data("room", record).data("exit-label", label || dir);
        miniMap.find(".dir-name").attr("title", "Go to " + roomName);
        miniMap.find(".room-name").text(roomName).attr("title", "Go to " + roomName);
        miniMap.find(".room-notes").hide();
        miniMap.addClass("shown");

        if (ParchLockMap.IsCurrentRoom(record)) {
            
            room.addClass("here");
        }
        else if (!ParchLockMap.IsDisplayingCurrentRoom() && ParchLockMap.DisplayedRoomId === record.Id) {

            room.find(".back-to-room, .go-to-room").show();
        }

        // D112: the room box never renders note TEXT inline (that was the
        // reported bug) -- only the icon, whenever there is at least one
        // note. room.find(".note").empty() above already runs on every
        // Draw() pass; nothing here ever writes text back into it.
        var _room = record;
        if (_room && _room.Notes && _room.Notes.length > 0) {

            room.find(".all-notes").show().attr("title", "Show " + _room.Notes.length + " note(s)");
            miniMap.find(".room-notes").show().attr("title", "Show " + _room.Notes.length + " note(s)");

            $("#current-room-notes").hide();

            if (ParchLockMap.IsCurrentRoom(record) && _room.Notes.length) {

                $("#current-room-notes").attr("title", "Show " + _room.Notes.length + " note(s)").show();
            }
        }

        /*
        var rotation = ((Math.random() * 2) - 1) * 0.8;
        if (Global.Prefs.MapAnimation) room.css({ transform: "rotate(" + rotation + "deg)" });
        */
    },

    // D112: kept as a compatibility wrapper -- /notes and /room-notes room;
    // (js/Input.js) still call this directly, as do all four existing
    // "view this room's notes" trigger sites (#current-room-notes, the map
    // canvas's neighbor-room icon, the compass-strip icon, and the Known
    // Rooms row icon), all unchanged. The old separate Message-popup body
    // is removed (not left reachable from anywhere) -- viewing notes now
    // always means focusing the one, permanent Notes section.
    ShowNotes: (e, roomName) => {

        if (e) e.stopImmediatePropagation();

        roomName = roomName || (e && ($(e.currentTarget).data("room") || $(e.currentTarget).closest(".room").data("room"))) || ParchLockMap.GetCurrentRoom();

        var room = ParchLockMap.GetRoom(roomName);

        if (room) {

            ParchLockMap.FocusNotesForRoom(room);
        }
        else {

            Message.RoomNotFound(roomName);
        }
    },

    // D112: opens the map panel if needed, clears any leftover search term
    // (so it can never hide the room a trigger icon just asked to focus),
    // scopes the Notes section to this one room, expands it, and scrolls it
    // into view. Room identity (D47), not a name string -- room is already
    // a resolved record by the time this is called (ShowNotes resolves it).
    FocusNotesForRoom: (room) => {

        if (!room) return;

        if (!$("body").hasClass("map-open")) ParchLockMap.Show();

        $("#room-filter").val("");
        ParchLockMap.NotesScopeRoomKey = room;
        $("#notes-tab").prop("open", true);

        ParchLockMap.RebuildRoomsList();
        ParchLockMap.RebuildNotesList();
        ParchLockMap.ApplyNotesAddButtonPref();

        var el = document.getElementById("notes-tab");
        if (el && el.scrollIntoView) {
            try { el.scrollIntoView({ block: "nearest" }); } catch (err) { el.scrollIntoView(); }
        }
    },

    // D112: renders the Notes section for the current NotesScopeRoomKey
    // (null = every room with notes, grouped, in Known-Rooms order; a room
    // record = only that room's notes, unscoped). Each note's edit/delete
    // icon closure captures the room, its index, and its exact current text
    // at render time; since this list is rebuilt synchronously after every
    // mutation, that pairing cannot outlive a render -- PromptEditNote/
    // PromptRemoveNote re-check it and fail closed (do nothing) rather than
    // ever act on a stale index.
    RebuildNotesList: () => {

        var scopeRoom = ParchLockMap.NotesScopeRoomKey;
        $("#notes-container").empty();

        if (scopeRoom) {

            var resolved = ParchLockMap.GetRoom(scopeRoom);

            // Self-audit fix: the scoped room can legitimately stop existing
            // (removed via Known Rooms' trash icon, a fresh map import/load,
            // or Reset Map) while its Notes view is still open. Falling
            // through to "There are no notes here yet." would misleadingly
            // claim a room that's simply gone still has zero notes -- drop
            // back to the unscoped all-rooms view instead, same as if the
            // player had manually reopened Notes with nothing scoped.
            if (!resolved) {

                ParchLockMap.NotesScopeRoomKey = null;
            }
            else {

                var notes = resolved.Notes || [];

                if (!notes.length) {

                    $("<div>").addClass("empty").text("There are no notes here yet.").appendTo("#notes-container");
                    return;
                }

                notes.forEach((note, index) => ParchLockMap.AppendNoteRow(resolved, index, note));
                return;
            }
        }

        var filter = ($("#room-filter").val() || "").trim().toLowerCase();
        var rooms = ParchLockMap.Rooms.filter(r => r && r.Notes && r.Notes.length > 0);

        if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom) {
            rooms = rooms.filter(MapTopology.isPlayerFacingRoom);
        }

        if (filter) {
            rooms = rooms.filter(room => room.Name.toLowerCase().indexOf(filter) !== -1 || (room.Notes || []).join(" ").toLowerCase().indexOf(filter) !== -1);
        }

        if (!rooms.length) {

            $("<div>").addClass("empty").text(filter ? "No matching notes" : "No notes yet.").appendTo("#notes-container");
            return;
        }

        rooms.forEach(room => {

            $("<strong>").addClass("notes-room-heading").text(room.Name).appendTo("#notes-container");
            room.Notes.forEach((note, index) => ParchLockMap.AppendNoteRow(room, index, note));
        });
    },

    AppendNoteRow: (room, index, note) => {

        var row = $("<div>").addClass("note-row").appendTo("#notes-container");
        $("<div>").addClass("icon icon-edit-note").attr("title", "Edit this note").click(() => ParchLockMap.PromptEditNote(room, index, note)).appendTo(row);
        $("<div>").addClass("icon icon-delete-note").attr("title", "Delete this note").click(() => ParchLockMap.PromptRemoveNote(room, index, note)).appendTo(row);
        $("<div>").addClass("note-text").text(note).appendTo(row);
    },

    PromptAddNote: (room) => {

        var resolved = ParchLockMap.GetRoom(room);
        if (!resolved) return;

        ParchLockMap.ShowNoteEditor("Add note to " + resolved.Name, "", (text) => {
            ParchLockMap.AddNoteToRoom(resolved, text);
        });
    },

    PromptEditNote: (room, index, expectedText) => {

        ParchLockMap.ShowNoteEditor("Edit note", expectedText, (text) => {
            ParchLockMap.EditNote(room, index, expectedText, text);
        });
    },

    PromptRemoveNote: (room, index, expectedText) => {

        if (!confirm("Delete this note?")) return;
        ParchLockMap.RemoveNote(room, index, expectedText);
    },

    // D112: shared add/edit text popup -- copies js/WorkspaceUI.js ShowMaps'
    // proven, already mobile-keyboard-safe Message.Show + plain <input>
    // pattern (js/Input.js excludes #message from the app's aggressive
    // mobile keyboard-dismiss logic). disabledTypeToClose:true (Message.Show's
    // third argument) so typing into the input can't also close the dialog.
    // No forced autofocus on the input (Message.Show focuses #close, not
    // this input) given this project's prior mobile IME instability history.
    ShowNoteEditor: (title, initialText, onSave) => {

        Message.Show(ParchLockQol.EscapeHtml(title), "<div class='qol-window-actions'><input id='note-editor-text' aria-label='Note text' placeholder='Note text' maxlength='500'><button id='note-editor-save'>Save</button></div>", true);

        var input = $("#note-editor-text");
        input.val(initialText || "");

        $("#note-editor-save").off("click").on("click", () => {

            var text = (input.val() || "").trim();
            if (!text) return;

            Message.Hide();
            onSave(text);
        });
    },

    // D112: default OFF, general Interface/Accessibility area of Options
    // (WorkspaceUI.ShowOptions), NOT grouped with map-specific options.
    // Controls ONLY this button's presence -- never the Notes header
    // (permanent regardless of note count/collapse/this preference), never
    // note-icon visibility elsewhere, never the hold/right-click or /note
    // paths. Target rule: the scoped room if one is active, else the
    // player's current room (matching /note's own target) -- no picker;
    // disabled if neither resolves.
    ApplyNotesAddButtonPref: () => {

        var show = !!Global.Prefs.ShowNotesAddButton;
        $("#notes-add-button").prop("hidden", !show);

        if (show) {

            var target = ParchLockMap.NotesScopeRoomKey ? ParchLockMap.GetRoom(ParchLockMap.NotesScopeRoomKey) : ParchLockMap.GetCurrentRoom();
            $("#notes-add-button").prop("disabled", !target);
        }
    },

    IsDisplayingCurrentRoom: () => {
        var current = ParchLockMap.GetCurrentRoom();
        return !!current && current.Id === ParchLockMap.DisplayedRoomId;
    },

    IsCurrentRoom: room => !!ParchLockMap.GetCurrentRoom() && ParchLockMap.GetRoom(room) === ParchLockMap.GetCurrentRoom(),

    EnteredRoom: (roomName, fromDirection) => {

        if (!roomName) return;

        if (!ParchLockMap.GetRoom(roomName)) {

            ParchLockMap.Rooms.push({

                Id: ParchLockMap.Rooms.length,
                Name: roomName,
                Exits: {}
            });
        }

        var enteredRoom = ParchLockMap.GetRoom(roomName);

        if (fromDirection) {

            var prevRoom = ParchLockMap.GetCurrentRoom();

            if (prevRoom && ParchLockMap.AllowUpdate) {
                
                prevRoom.Exits[fromDirection.Dir] = enteredRoom.Id;

                if (Global.Prefs.AssumeTwoWayConnections && fromDirection.Opposite) {

                    enteredRoom.Exits[fromDirection.Opposite.Dir] = prevRoom.Id;
                }
            }
        }

        ParchLockMap.SetCurrentRoom(enteredRoom);

        ParchLockMap.RefreshMapPanels();
    },

    // D112: single shared refresh point -- every mutation, load, and import
    // site that used to call Save/Draw/RebuildRoomsList as a triad now
    // calls this instead, so the Notes section (and the add-note button's
    // enabled state, which depends on the current/scoped room) never falls
    // out of sync with any of them.
    RefreshMapPanels: () => {

        ParchLockMap.GraphRevision++;
        ParchLockMap.Save();
        ParchLockMap.Draw();
        ParchLockMap.RebuildRoomsList();
        ParchLockMap.RebuildNotesList();
        ParchLockMap.ApplyNotesAddButtonPref();
    },

    // D112: hardcoded-to-current-room compatibility wrapper -- /note text;
    // (js/Input.js) still calls this directly and is unaffected. Adding a
    // note to any OTHER room goes through AddNoteToRoom (the Known Rooms
    // hold/right-click popup, and the optional header button).
    AddNote: (note) => {

        if (!note) return;
        ParchLockMap.AddNoteToRoom(ParchLockMap.GetCurrentRoom(), note);
    },

    AddNoteToRoom: (room, text) => {

        if (!text) return;

        var resolved = ParchLockMap.GetRoom(room);
        if (!resolved) return;

        if (!resolved.Notes) resolved.Notes = [];
        resolved.Notes.push(text);

        ParchLockMap.RefreshMapPanels();
    },

    // D112: EditNote/RemoveNote take the exact text captured at the moment
    // the edit/delete icon was rendered (RebuildNotesList/AppendNoteRow) and
    // re-check it against the room's CURRENT Notes[index] before mutating --
    // fail closed (do nothing) on a mismatch, rather than ever editing or
    // deleting the wrong entry.
    EditNote: (room, index, expectedText, newText) => {

        var resolved = ParchLockMap.GetRoom(room);
        if (!resolved || !resolved.Notes || resolved.Notes[index] !== expectedText) return;
        if (!newText) return;

        resolved.Notes[index] = newText;
        ParchLockMap.RefreshMapPanels();
    },

    RemoveNote: (room, index, expectedText) => {

        var resolved = ParchLockMap.GetRoom(room);
        if (!resolved || !resolved.Notes || resolved.Notes[index] !== expectedText) return;

        resolved.Notes.splice(index, 1);
        ParchLockMap.RefreshMapPanels();
    },

    // D112: /clear notes (js/Input.js) unchanged -- wipes the whole array
    // for the current room. Distinct from, and unaffected by, the new
    // per-note RemoveNote above (both are valid, separate operations).
    ClearNotes: () => {

        var room = ParchLockMap.GetCurrentRoom();
        if (room) room.Notes = [];

        ParchLockMap.RefreshMapPanels();
    },

    RebuildRoomsList: () => {

        $("#map #rooms-list #container").empty();
        ParchLockMap.UpdateStats();

        var filter = ($("#room-filter").val() || "").trim().toLowerCase();
        var rooms = ParchLockMap.Rooms.filter(room => {
            // D54/D80 operator rule: Known Rooms never lists internal
            // compiler placeholders (C_ROOMS_*) or system exit tokens.
            // Only rooms with a real player-facing description appear.
            if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom
                && !MapTopology.isPlayerFacingRoom(room)) return false;

            if (!filter) return true;

            var noteText = (room.Notes || []).join(" ").toLowerCase();
            return room.Name.toLowerCase().indexOf(filter) != -1 || noteText.indexOf(filter) != -1;
        });

        if (!rooms.length) {

            $("<div>").addClass("empty").text("No matching rooms").appendTo("#map #rooms-list #container");
            return;
        }

        rooms.forEach(room => {

            var d = $("<div>").appendTo("#map #rooms-list #container").data("room", room).attr("title", "Go to " + room.Name).click(ParchLockMap.GotoRoom);
            $("<div>").addClass("icon icon-eye").attr("title", "Center map on " + room.Name).data("room", room).click(ParchLockMap.ShowRoom).appendTo(d);
            $("<div>").addClass("icon icon-go-to-room").attr("title", "Go to " + room.Name).data("room", room).click(ParchLockMap.GotoRoom).appendTo(d);

            if (!ParchLockMap.IsCurrentRoom(room)) {

                $("<div>").addClass("icon icon-remove-room").attr("title", "Remove " + room.Name).click((e) => ParchLockMap.RemoveRoom(e, room, true)).appendTo(d);
            }

            if (room.Notes && room.Notes.length > 0) $("<div>").addClass("icon icon-note").attr("title", "Show " + room.Notes.length + " note(s)").data("room", room).click(ParchLockMap.ShowNotes).appendTo(d);

            $("<div>").addClass("name").text(room.Name).appendTo(d);


            if (ParchLockMap.IsCurrentRoom(room)) d.addClass("here");

        });
    },

    UpdateStats: () => {

        var roomCount = 0;
        var exitCount = 0;
        var noteCount = 0;

        ParchLockMap.Rooms.forEach(room => {
            // Match Known Rooms filter so the stats line does not count
            // hidden internal stubs the player never saw as real rooms.
            if (typeof MapTopology !== "undefined" && MapTopology.isPlayerFacingRoom
                && !MapTopology.isPlayerFacingRoom(room)) return;
            roomCount++;

            if (typeof MapTopology !== "undefined" && MapTopology.countRoomExits) {
                exitCount += MapTopology.countRoomExits(room);
            } else {
                var seen = {};
                Object.keys(room.Exits || {}).forEach(function (k) {
                    if (k && room.Exits[k] != null) seen[k] = 1;
                });
                Object.keys(room.ExitMeta || {}).forEach(function (k) {
                    if (k && room.ExitMeta[k] && (room.ExitMeta[k].hinted || seen[k])) seen[k] = 1;
                    else if (k && room.ExitMeta[k]) seen[k] = 1;
                });
                exitCount += Object.keys(seen).length;
            }
            noteCount += (room.Notes || []).length;
        });

        $("#map-stats").text(roomCount + " rooms / " + exitCount + " exits / " + noteCount + " notes");
    },

    ShowRoom: function(e, roomName) {

        if (e) e.stopImmediatePropagation();
        roomName = roomName || $(e.currentTarget).data("room");

        ParchLockMap.Draw(roomName);
    },

    UpdateMapMode: function () {
        var next = ParchLockMap.MapMode;
        if (next === "hub" && ParchLockMap.Scale < ParchLockMap.OverviewThreshold) next = "overview";
        else if (next === "overview" && ParchLockMap.Scale >= ParchLockMap.OverviewThreshold + ParchLockMap.OverviewHysteresis) next = "hub";
        if (next === ParchLockMap.MapMode) return false;
        ParchLockMap.MapMode = next;
        $("#map #rooms").toggleClass("overview-mode", next === "overview");
        if (next === "overview") ParchLockMap.DrawOverview(ParchLockMap.DisplayedRoomId);
        else {
            $("#map #rooms").css({ width: "", height: "" });
            ParchLockMap.Draw(ParchLockMap.GetRoomById(ParchLockMap.DisplayedRoomId) || ParchLockMap.GetCurrentRoom());
        }
        return true;
    },

    DrawOverview: function (anchorId) {
        var anchor = ParchLockMap.GetRoomById(anchorId) || ParchLockMap.GetCurrentRoom();
        if (anchor) {
            ParchLockMap.DisplayedRoom = anchor.Name;
            ParchLockMap.DisplayedRoomId = anchor.Id;
        }
        var eligible = (ParchLockMap.Rooms || []).filter(function (room) {
            return typeof MapTopology === "undefined" || !MapTopology.isOverviewEligible
                || MapTopology.isOverviewEligible(room, anchor);
        });
        var host = document.getElementById("map-overview");
        if (!host || !eligible.length || typeof MapBeautify === "undefined" || !MapBeautify.overviewLayout) return;
        var coords = MapBeautify.overviewLayout(eligible, anchor && anchor.Id);
        ParchLockMap.OverviewCoords = coords;
        ParchLockMap.OverviewEdges = [];
        host.replaceChildren();
        var pitchX = 176, pitchY = 100, pad = 70;
        var values = Object.keys(coords).map(function (id) { return coords[id]; });
        var minX = Math.min.apply(Math, values.map(function (p) { return p.x; }));
        var minY = Math.min.apply(Math, values.map(function (p) { return p.y; }));
        var maxX = Math.max.apply(Math, values.map(function (p) { return p.x; }));
        var maxY = Math.max.apply(Math, values.map(function (p) { return p.y; }));
        host.style.width = ((maxX - minX) * pitchX + pad * 2 + 150) + "px";
        host.style.height = ((maxY - minY) * pitchY + pad * 2 + 64) + "px";
        $("#map #rooms").css({ width: host.style.width, height: host.style.height });
        eligible.slice().sort(function (a, b) { return String(a.Id).localeCompare(String(b.Id), undefined, { numeric: true }); }).forEach(function (room) {
            var p = coords[String(room.Id)], button = document.createElement("button");
            button.type = "button";
            button.className = "overview-room";
            if (ParchLockMap.IsCurrentRoom(room)) button.classList.add("here");
            if (anchor && String(anchor.Id) === String(room.Id)) button.classList.add("displayed");
            button.dataset.roomId = room.Id;
            button.textContent = room.Name;
            button.title = room.Name;
            button.setAttribute("aria-label", "Center map on " + room.Name);
            if (ParchLockMap.IsCurrentRoom(room)) button.setAttribute("aria-current", "location");
            button.style.left = (pad + (p.x - minX) * pitchX) + "px";
            button.style.top = (pad + (p.y - minY) * pitchY) + "px";
            button.addEventListener("click", function (event) {
                event.stopPropagation();
                if (ParchLockMap.DragMoved) return;
                ParchLockMap.DrawOverview(room.Id);
                requestAnimationFrame(function () { ParchLockMap.CenterOverviewRoom(room.Id); });
            });
            host.appendChild(button);
        });
        var visible = {};
        eligible.forEach(function (room) { visible[String(room.Id)] = true; });
        eligible.forEach(function (room) {
            Object.keys(room.Exits || {}).sort().forEach(function (label) {
                // Hub-mirror spoiler control: system exit-N prop keys never label overview
                // edges. Numbered travel exits ("1"/"2"/"exit 1") stay visible via the
                // shared isSystemPropExitKey predicate (hyphenated exit-N only).
                if (typeof MapTopology !== "undefined" && MapTopology.isSystemPropExitKey
                    && MapTopology.isSystemPropExitKey(label)) return;
                var toId = String(room.Exits[label]);
                if (!visible[toId]) return;
                var meta = (room.ExitMeta || {})[label] || {};
                ParchLockMap.OverviewEdges.push({ from: String(room.Id), to: toId, label: label, tentative: !!(meta.hinted || meta.ambiguousDiagonal) });
            });
        });
        ParchLockMap.OverviewLayoutRevision = ParchLockMap.GraphRevision;
        requestAnimationFrame(WorkspaceUI.DrawPaths);
    },

    CenterOverviewRoom: function (id) {
        var shell = document.getElementById("rooms-shell"), node = document.querySelector('#map-overview .overview-room[data-room-id="' + String(id).replace(/"/g, "") + '"]');
        if (!shell || !node) return;
        var sr = shell.getBoundingClientRect(), nr = node.getBoundingClientRect();
        ParchLockMap.PanX += sr.left + sr.width / 2 - (nr.left + nr.width / 2);
        ParchLockMap.PanY += sr.top + sr.height / 2 - (nr.top + nr.height / 2);
        ParchLockMap.ApplyViewport();
    },

    ApplyViewport: () => {

        $("#map #rooms").css("transform", "translate(" + ParchLockMap.PanX + "px, " + ParchLockMap.PanY + "px) scale(" + ParchLockMap.Scale + ")");
        $("#zoom-reset").text(Math.round(ParchLockMap.Scale * 100) + "%");
    },

    SetScale: (targetScale, originX, originY) => {

        var oldScale = ParchLockMap.Scale;
        var nextScale = Math.max(0.45, Math.min(1.8, Math.round(targetScale * 100) / 100));
        if (nextScale == oldScale) return;

        if (originX !== undefined && originY !== undefined) {

            var map = $("#map #rooms")[0].getBoundingClientRect();
            var localX = originX - map.left - map.width / 2;
            var localY = originY - map.top - map.height / 2;
            var ratio = nextScale / oldScale;

            ParchLockMap.PanX -= localX * (ratio - 1);
            ParchLockMap.PanY -= localY * (ratio - 1);
        }

        ParchLockMap.Scale = nextScale;
        ParchLockMap.ApplyViewport();
        ParchLockMap.UpdateMapMode();
    },

    Zoom: (delta, originX, originY) => {
        ParchLockMap.SetScale(ParchLockMap.Scale + delta, originX, originY);
    },

    ResetViewport: () => {

        ParchLockMap.Scale = 1;
        ParchLockMap.MapMode = "hub";
        ParchLockMap.PanX = 0;
        ParchLockMap.PanY = 0;
        ParchLockMap.ClearGesture();
        $("#map #rooms").removeClass("overview-mode");
        $("#map #rooms").css({ width: "", height: "" });
        ParchLockMap.ApplyViewport();
        ParchLockMap.Draw(ParchLockMap.GetCurrentRoom());
    },

    MapWheel: (e) => {

        e.preventDefault();
        ParchLockMap.Zoom(e.originalEvent.deltaY < 0 ? 0.1 : -0.1, e.originalEvent.clientX, e.originalEvent.clientY);
    },

    PointerDown: function (e) {
        var ev = e.originalEvent || e;
        if (ev.button != null && ev.button !== 0) return;
        if ($(e.target).closest("button, input, .icon").length) return;
        ParchLockMap.ActivePointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY, type: ev.pointerType || "mouse" };
        try { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(ev.pointerId); } catch (captureError) {}
        var ids = Object.keys(ParchLockMap.ActivePointers);
        if (ids.length >= 2) {
            var a = ParchLockMap.ActivePointers[ids[0]], b = ParchLockMap.ActivePointers[ids[1]];
            ParchLockMap.IsDragging = false;
            ParchLockMap.DragMoved = true;
            ParchLockMap.PinchState = {
                distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
                scale: ParchLockMap.Scale,
                midpointX: (a.x + b.x) / 2,
                midpointY: (a.y + b.y) / 2
            };
            $("#map #rooms").addClass("dragging");
            if (ev.cancelable) ev.preventDefault();
            return;
        }
        ParchLockMap.StartDrag(e);
    },

    PointerMove: function (e) {
        var ev = e.originalEvent || e, pointer = ParchLockMap.ActivePointers[ev.pointerId];
        if (!pointer) return;
        pointer.x = ev.clientX; pointer.y = ev.clientY;
        var ids = Object.keys(ParchLockMap.ActivePointers);
        if (ParchLockMap.PinchState && ids.length >= 2) {
            var a = ParchLockMap.ActivePointers[ids[0]], b = ParchLockMap.ActivePointers[ids[1]], state = ParchLockMap.PinchState;
            var distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
            var midpointX = (a.x + b.x) / 2, midpointY = (a.y + b.y) / 2;
            ParchLockMap.SetScale(state.scale * distance / state.distance, midpointX, midpointY);
            ParchLockMap.PanX += midpointX - state.midpointX;
            ParchLockMap.PanY += midpointY - state.midpointY;
            state.midpointX = midpointX; state.midpointY = midpointY;
            ParchLockMap.ApplyViewport();
            if (ev.cancelable) ev.preventDefault();
            return;
        }
        ParchLockMap.Drag(e);
    },

    PointerUp: function (e) {
        var ev = e.originalEvent || e;
        delete ParchLockMap.ActivePointers[ev.pointerId];
        var ids = Object.keys(ParchLockMap.ActivePointers);
        if (ParchLockMap.PinchState) {
            ParchLockMap.PinchState = null;
            if (ids.length === 1) {
                var p = ParchLockMap.ActivePointers[ids[0]];
                ParchLockMap.IsDragging = true;
                ParchLockMap.DragStartX = p.x; ParchLockMap.DragStartY = p.y;
                ParchLockMap.DragPanX = ParchLockMap.PanX; ParchLockMap.DragPanY = ParchLockMap.PanY;
            } else ParchLockMap.EndDrag();
            return;
        }
        if (!ids.length) ParchLockMap.EndDrag();
    },

    ClearGesture: function () {
        ParchLockMap.ActivePointers = {};
        ParchLockMap.PinchState = null;
        ParchLockMap.IsDragging = false;
        $("#map #rooms").removeClass("dragging");
    },

    StartDrag: (e) => {

        if (e.originalEvent.button !== 0) return;
        if ($(e.target).closest("button, input, .icon").length) return;

        ParchLockMap.IsDragging = true;
        ParchLockMap.DragMoved = false;
        ParchLockMap.DragStartX = e.originalEvent.clientX;
        ParchLockMap.DragStartY = e.originalEvent.clientY;
        ParchLockMap.DragPanX = ParchLockMap.PanX;
        ParchLockMap.DragPanY = ParchLockMap.PanY;
        $("#map #rooms").addClass("dragging");
    },

    Drag: (e) => {

        if (!ParchLockMap.IsDragging) return;

        var dx = e.originalEvent.clientX - ParchLockMap.DragStartX;
        var dy = e.originalEvent.clientY - ParchLockMap.DragStartY;
        if (Math.abs(dx) + Math.abs(dy) > 4) ParchLockMap.DragMoved = true;

        ParchLockMap.PanX = ParchLockMap.DragPanX + dx;
        ParchLockMap.PanY = ParchLockMap.DragPanY + dy;
        ParchLockMap.ApplyViewport();
    },

    EndDrag: () => {

        if (!ParchLockMap.IsDragging) return;

        ParchLockMap.IsDragging = false;
        $("#map #rooms").removeClass("dragging");
    },

    Save: () => {
        if (!ParchLock.GameFilename || ParchLockMap.PersistenceBlocked) return;
        var mapData = JSON.stringify(ParchLockMap.Rooms);
        localStorage.setItem("PL_Map_" + ParchLock.GameFilename, mapData);
    },

    Load: () => {
        if (!ParchLock.GameFilename) return;
        try {
            var mapData = localStorage.getItem("PL_Map_" + ParchLock.GameFilename);
            if (mapData) {
                var data = { Map: JSON.parse(mapData) };
                WorkspaceUI.ValidateMap(data);
                // D54: drop any persisted meta/internal names so a prior bug
                // cannot reintroduce "(Inform Library)" / C_ROOMS_* nodes.
                var rooms = Array.isArray(data.Map) ? data.Map : [];
                if (typeof MapTopology !== "undefined" && MapTopology.isInternalRoomName) {
                    rooms = rooms.filter(function (r) {
                        return r && r.Name && !MapTopology.isInternalRoomName(r.Name);
                    });
                    rooms.forEach(function (r, i) { r.Id = i; });
                }
                ParchLockMap.Rooms = rooms;
            }
        } catch (error) {
            ParchLockMap.PersistenceBlocked = true;
            Message.Show("Map unavailable", "Stored map data could not be loaded. It has been preserved. Import a valid map or reset the map to resume saving.", true);
        }
        ParchLockMap.UpdateStats();
    },

    Clear: () => {
        ParchLockMap.PersistenceBlocked = false;
        ParchLockMap.Rooms = [];
        ParchLockMap.CurrentRoomId = null;
        ParchLockMap.DisplayedRoomId = null;
        if (typeof MapTopology !== "undefined") { MapTopology.prevRoomId = null; MapTopology.prevRoomName = ""; }
        // D76: Reset Map used to immediately recreate the current room via
        // the legacy `EnteredRoom(CurrentRoom)` -- a raw name-string push
        // with NO real RAM id (the exact duplicate-identity anti-pattern
        // D72 already removed from the normal per-tick path, since it
        // races `MapTopology`'s real-id-first system). D74 already stopped
        // a stray id-less/mismatched CurrentRoom from ever blanking the
        // map on a LATER tick, but Reset Map itself was still the one
        // remaining place that could introduce that exact kind of stub in
        // the first place, immediately after every reset -- precisely the
        // repeated-use case (retesting the same games, players resetting
        // often) that would keep exercising this path.
        //
        // A first attempt called the FULL `MapTopology.tick()` here, which
        // also re-processes `payload.exits` (pre-travel lookahead hints)
        // and immediately repopulated neighbor room stubs -- silently
        // changing Reset Map's own promised behavior ("Clear the current
        // map? Room notes on the map will be removed") into "clear, then
        // instantly regenerate," which an existing regression test
        // correctly caught (`tools/map-pathing-regression.js`, "Clear()
        // should leave at most current room"). Only the CURRENT room's own
        // identity needs re-establishing here -- via `MapTopology.ensureRoom`
        // directly, the same real-id-first resolver, without touching
        // exits/neighbors at all -- so Reset Map still means "start fresh
        // from here," just without ever creating an id-less stub to do it.
        // Deliberately reuses the EXISTING `WorldModel.lastPayload` rather
        // than forcing a fresh `WorldModel.tick()` here: the underlying
        // game state hasn't changed (only this map cache was just
        // cleared), and calling tick() from inside Clear() was found live
        // (via repeated automated runs, not assumed) to intermittently
        // cascade into the normal per-turn re-tick cycle completing its OWN
        // correct, but here unwanted, full exits re-processing before this
        // function's caller ever reads `Rooms.length` -- a real, flaky
        // timing bug caught by re-running the same test multiple times.
        try {
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            // D54/D76: never re-seed Reset Map from an internal/meta roomName.
            if (p && p.roomName && typeof MapTopology !== "undefined" && MapTopology.ensureRoom
                && !MapTopology.isInternalRoomName(p.roomName)) {
                var room = MapTopology.ensureRoom(p.roomName, p.roomId);
                if (room) ParchLockMap.SetCurrentRoom(room);
            }
        } catch (e) {}
    },

    BindResetMap: () => {
        $("#reset-map").off("click").on("click", () => {
            if (!confirm("Clear the current map? Room notes on the map will be removed.")) return;
            ParchLockMap.Clear();
            ParchLockMap.NotesScopeRoomKey = null;
            ParchLockMap.RefreshMapPanels();
        });
    },

    ExportMap: () => {

        var lines = [];
        lines.push(($("title").text() || APPNAME).replace(" - " + APPNAME, ""));
        lines.push("=".repeat(lines[0].length));
        lines.push("");

        ParchLockMap.Rooms.forEach(room => {

            lines.push(room.Name);

            var exits = Object.keys(room.Exits || {});
            if (exits.length) {

                lines.push("  Exits: " + exits.map(dir => {

                    var target = ParchLockMap.Rooms[room.Exits[dir]];
                    return dir + " -> " + (target ? target.Name : "Unknown");
                }).join(", "));
            }

            (room.Notes || []).forEach(note => lines.push("  Note: " + note));
            lines.push("");
        });

        ParchLockQol.DownloadText(ParchLockQol.GetSafeFilename("map") + ".txt", lines.join("\n"));
    }
}
