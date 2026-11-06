var Navigator = {

    StepQueue: [],
    Running: false,
    Interrupted: false,
    InterruptReason: "",
    Timer: null,
    Awaiting: null,
    Submitting: false,

    EnqueueRoute: (dirs) => {
        Navigator.ClearQueue();
        Navigator.StepQueue = (dirs || []).slice();
        Navigator.Interrupted = false;
        Navigator.InterruptReason = "";
        Navigator.Running = true; Navigator._seatedTried = false;
        try { if (typeof Actionable !== "undefined" && Actionable.cancelTapMove) Actionable.cancelTapMove(); } catch (eTap) {}
        // D159 (operator-reported): during fast travel the narration "gets
        // stuck on your original location". Every room the route passes
        // THROUGH prints a description, each is queued for speech, and speech
        // is far slower than travel -- so the player arrives while still
        // hearing where they set off from.
        //
        // Only a multi-step route has rooms worth skipping; a single step goes
        // straight to the destination and is left alone.
        if (Navigator.StepQueue.length > 1) Navigator.startSpeechHold();
        Navigator.Pump();
    },

    // Swallow the text of rooms merely passed through. Done from here, not
    // inside ReadAloud, because js/ReadAloud.js is held by another seat --
    // seedSilent() is that module's own public "treat what is on screen as
    // already handled" call. It has to run on a timer rather than once per
    // step: ReadAloud speaks on a 350ms debounce while steps are ~500ms
    // apart, so a per-step seed always lost the race and every room still got
    // read (measured: 3 of 3 rooms spoken on a 3-step route).
    _raHold: null,
    startSpeechHold: () => {
        if (Navigator._raHold) return;
        try { if (typeof ReadAloud !== "undefined" && ReadAloud.stop) ReadAloud.stop(); } catch (e) {}
        Navigator._raHold = setInterval(function () {
            try {
                if (typeof ReadAloud !== "undefined" && ReadAloud.seedSilent) ReadAloud.seedSilent();
            } catch (e) {}
        }, 120);
    },
    stopSpeechHold: () => {
        if (!Navigator._raHold) return;
        clearInterval(Navigator._raHold);
        Navigator._raHold = null;
    },

    // Remove a map edge that has just been proven not to work, and record the
    // block structurally. Deliberately narrow: only the exact (room,
    // direction) that failed, never the destination room or any other edge.
    demoteFailedEdge: (pending) => {
        if (!pending || pending.fromId == null || !pending.dir) return;
        try {
            var room = ParchLockMap.Rooms[pending.fromId];
            if (room && room.Exits && room.Exits[pending.dir] !== undefined) {
                delete room.Exits[pending.dir];
                if (room.ExitMeta) delete room.ExitMeta[pending.dir];
            }
        } catch (e) {}
        try {
            if (typeof ExitCalibrator !== "undefined" && ExitCalibrator.observeBlocked
                && typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && pending.fromRoomId != null) {
                ExitCalibrator.observeBlocked(ZRamProvider.getMem(), pending.fromRoomId, pending.dir);
            }
        } catch (e) {}
    },

    ClearQueue: (reason) => {
        clearTimeout(Navigator.Timer);
        Navigator.stopSpeechHold();       // D159: never leave narration muted
        Navigator.Awaiting = null;
        Navigator.StepQueue = [];
        Navigator.Running = false;
        if (reason) {
            Navigator.Interrupted = true;
            Navigator.InterruptReason = reason;
            try { Message.Show("Route Interrupted", reason); } catch (e) {}
        }
    },

    Pump: () => {
        if (!Navigator.Running) return;
        var current = ParchLockMap.GetCurrentRoom();
        if (Navigator.Awaiting) {
            var pending = Navigator.Awaiting;
            var ready = $(".Input.LineInput:visible").length && !$("#dialog").length;
            if (!ready || Date.now() - pending.at < 500) {
                if (Date.now() - pending.at > 15000) { Navigator.ClearQueue("The story did not finish the route step."); return; }
                Navigator.Timer = setTimeout(Navigator.Pump, 100); return;
            }
            if (!current || current.Id !== pending.target) {
                // D138 (operator-reported as auto-travel failures): the step
                // was submitted and the player did NOT end up where the map
                // said they would. Previously this only reported and gave up,
                // so the very same impossible route was re-planned on the next
                // attempt -- Anchorhead routed out of the Local Pub by "s"
                // three times running, each time going nowhere.
                //
                // Treat it as evidence. Drop the edge that just failed so the
                // router stops proposing it, and tell ExitCalibrator the
                // direction is blocked from that room. Both are recoverable:
                // really walking it again re-records the edge and clears the
                // block, so a door that was locked and is later opened heals
                // itself.
                try { Navigator.demoteFailedEdge(pending); } catch (eD) {}
                Navigator.ClearQueue("The last movement did not reach the expected room.");
                return;
            }
            Navigator.Awaiting = null;
        }
        if (!Navigator.StepQueue.length) { Navigator.Running = false; return; }
        try {
            var room = current;
            var next = Navigator.StepQueue[0];
            var nm = room && room.ExitMeta && room.ExitMeta[next];
            // P10 R2: a ZIL DEXIT (doorObjectId) pauses only on routeBlocked (live locked
            // AND closed); the lock glyph is a separate contract. Other exits unchanged.
            if (nm && (nm.doorObjectId != null ? nm.routeBlocked === true : (nm.isLocked || nm.locked))) {
                Navigator.ClearQueue('Exit "' + next + '" appears locked. Route paused.');
                return;
            }
            // Skip null / unknown edges that somehow got queued
            if (room && room.Exits && (room.Exits[next] === null || room.Exits[next] === undefined)) {
                Navigator.ClearQueue('No mapped connection for "' + next + '".');
                return;
            }
        } catch (e) {}
        if (!current || !$(".Input.LineInput:visible").length || Message.IsOpen || $("#dialog").length) {
            Navigator.ClearQueue("The game is not ready for a route command."); return;
        }
        // M6: a route started while seated in a non-vehicle carrier gets the
        // game's own get-out form first (once). Awaiting keeps the same room,
        // so a refused get-out simply lets the step run and fail as before.
        if (!Navigator._seatedTried && typeof Actionable !== "undefined" && Actionable.seatedExitForm) {
            Navigator._seatedTried = true;
            var seated = Actionable.seatedExitForm();
            var seatedOk = false;
            if (seated) {
                // Same guard as a route step: an untagged accepted submit would clear the route queue.
                try { Navigator.Submitting = true; seatedOk = Actionable.Submit(seated.command, 'system-navigation') !== false; }
                catch (eSeat) { seatedOk = false; } finally { Navigator.Submitting = false; }
            }
            if (seatedOk) {
                Navigator.Awaiting = { target: current.Id, at: Date.now(), fromId: current.Id, fromRoomId: null, dir: null };
                Navigator.Timer = setTimeout(Navigator.Pump, 100);
                return;
            }
        }
        var dir = Navigator.StepQueue.shift();
        // D159: this was the LAST step, so stop swallowing text -- the
        // description that follows is the destination, the one room the
        // player actually asked to hear.
        if (!Navigator.StepQueue.length) Navigator.stopSpeechHold();
        // D138: remember WHICH edge this step is walking. Without the origin
        // room and direction a failed step can only be reported, never
        // learned from -- and the router would keep planning the same broken
        // route every time.
        Navigator.Awaiting = {
            target: current.Exits[dir],
            at: Date.now(),
            fromId: current.Id,
            fromRoomId: current.HasRealId ? current.ObjectId : null,
            dir: dir
        };
        // D54/D55: Exits key may be a display label; the real parser word is
        // ExitMeta.command when present (wumpus: label "exit 1", command "x1").
        // Fall back to Actionable.commandForExitLabel, then the key itself.
        // Never submit a system prop-index key ("exit-13") -- that is not
        // vocabulary and was confirmed live to print "not a verb I recognise".
        var command = Navigator.resolveStepCommand(current, dir);
        if (!command) {
            Navigator.ClearQueue('No usable travel command for exit "' + dir + '".');
            return;
        }
        try {
            Navigator.Submitting = true;
            if (typeof Actionable !== "undefined" && Actionable.Submit) {
                if (Actionable.Submit(command, 'system-navigation') === false) { Navigator.ClearQueue("The route command was not accepted."); return; }
            }
            else if (typeof Input !== "undefined") { Input.Clear(); Input.Inject(command, true, 'system-navigation'); }
        } catch (e) {
            Navigator.ClearQueue("The route command failed.");
            return;
        } finally { Navigator.Submitting = false; }
        Navigator.Timer = setTimeout(Navigator.Pump, 100);
    },

    // Expand short compass keys so the parser gets a full word when the
    // map stores "nw"/"se" (TranslatorUI short-form) but the story wants
    // "northwest". Numbered "xN" and full words pass through unchanged.
    expandCompassCommand: (cmd) => {
        var k = String(cmd || "").toLowerCase().trim();
        var map = {
            n: "north", s: "south", e: "east", w: "west",
            u: "up", d: "down",
            ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest"
        };
        return map[k] || k;
    },

    isSystemPropExitKey: (label) => {
        if (typeof MapTopology !== "undefined" && MapTopology.isSystemPropExitKey) {
            return MapTopology.isSystemPropExitKey(label);
        }
        return /^exit-\d+$/i.test(String(label || "").trim());
    },

    resolveStepCommand: (room, dir) => {
        var key = String(dir || "");
        var meta = (room && room.ExitMeta && room.ExitMeta[key]) || {};
        var command = (meta.command != null && String(meta.command).trim() !== "")
            ? String(meta.command).toLowerCase().trim()
            : key;
        try {
            if (typeof Actionable !== "undefined") {
                var lookup = Actionable.resolveExitCommand
                    ? Actionable.resolveExitCommand(key)
                    : (Actionable.commandForExitLabel ? Actionable.commandForExitLabel(key) : null);
                if (lookup && !Navigator.isSystemPropExitKey(lookup)) command = String(lookup).toLowerCase().trim();
            }
        } catch (eC) {}
        command = Navigator.expandCompassCommand(command);
        if (Navigator.isSystemPropExitKey(command) || Navigator.isSystemPropExitKey(key)) {
            // Prefer any sibling edge to the same destination with a real command.
            var target = room && room.Exits ? room.Exits[key] : null;
            if (target != null && room && room.Exits) {
                for (var d2 in room.Exits) {
                    if (d2 === key) continue;
                    if (String(room.Exits[d2]) !== String(target)) continue;
                    if (Navigator.isSystemPropExitKey(d2)) continue;
                    var alt = Navigator.resolveStepCommand(room, d2);
                    if (alt && !Navigator.isSystemPropExitKey(alt)) return alt;
                }
            }
            return "";
        }
        return command;
    },

    FindRoute: (fromRoom, toRoom) => {
        var originRoom = ParchLockMap.GetRoom(fromRoom);
        var targetRoom = ParchLockMap.GetRoom(toRoom);
        if (originRoom && targetRoom && originRoom.Id === targetRoom.Id) {
            Message.Show("Already There", "You are already in this room.");
            return [];
        }

        if (!originRoom || !targetRoom) {
            Message.Show("Room Not Found", "One of the rooms in this route is not on the map yet.");
            return [];
        }

        var shortestRoute = Navigator.FindShortestRoute(originRoom.Id, targetRoom.Id);

        if (shortestRoute.length == 0) {
            Message.Show("No Route", "No mapped route from <u>" + originRoom.Name + "</u> to <u>" + targetRoom.Name + "</u> is currently known. Move between rooms first so exits are recorded.");
            return [];
        }

        Navigator.EnqueueRoute(shortestRoute);

        // Return dir list (not a comma command string). GotoRoom must not Inject this as one line.
        return shortestRoute;
    },

    FindShortestRoute: (fromRoomId, toRoomId) => {
        var queue = [{ Id: fromRoomId, Route: [] }];
        var seen = {};
        seen[fromRoomId] = true;

        while (queue.length) {
            var item = queue.shift();
            var room = ParchLockMap.Rooms[item.Id];
            if (!room || !room.Exits) continue;

            // Stable preference: real compass / xN / "exit N" first; never
            // enqueue system prop-index keys ("exit-13") which are not
            // parser vocabulary and break auto-pathing on every module.
            var dirs = Object.keys(room.Exits).filter(function (d) {
                return !Navigator.isSystemPropExitKey(d);
            }).sort(function (a, b) {
                var ca = MapTopology && MapTopology.isCardinal && MapTopology.isCardinal(a) ? 0 : 1;
                var cb = MapTopology && MapTopology.isCardinal && MapTopology.isCardinal(b) ? 0 : 1;
                if (ca !== cb) return ca - cb;
                return String(a).localeCompare(String(b));
            });

            for (var di = 0; di < dirs.length; di++) {
                var dir = dirs[di];
                var nextRoomId = room.Exits[dir];
                if (nextRoomId === undefined || nextRoomId === null || seen[nextRoomId]) continue;
                // Skip edges with no resolvable travel command (defense in
                // depth if a bad key slipped into Exits).
                if (!Navigator.resolveStepCommand(room, dir)) continue;

                var route = item.Route.concat([dir]);
                if (nextRoomId == toRoomId) return route;

                seen[nextRoomId] = true;
                queue.push({ Id: nextRoomId, Route: route });
            }
        }
        return [];
    }
};
