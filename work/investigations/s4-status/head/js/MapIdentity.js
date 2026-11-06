var MapIdentity = {
    // Stable id helpers for Phase 5: name-key -> object-id graph without discarding notes
    hashName: (name) => {
        var s = String(name || "").toLowerCase().trim();
        var h = 2166136261;
        for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return "r_" + (h >>> 0).toString(16);
    },

    ensureRoomIdentity: (room) => {
        if (!room) return null;
        if (!room.ObjectId) room.ObjectId = MapIdentity.hashName(room.Name);
        if (!room.Exits) room.Exits = {};
        if (!room.Notes) room.Notes = room.Notes || [];
        return room.ObjectId;
    },

    migrateAll: () => {
        if (typeof ParchLockMap === "undefined" || !ParchLockMap.Rooms) return 0;
        var n = 0;
        ParchLockMap.Rooms.forEach(function (r) {
            var before = r.ObjectId;
            MapIdentity.ensureRoomIdentity(r);
            if (r.ObjectId !== before) n++;
        });
        return n;
    },

    applyExits: (roomName, exits) => {
        if (typeof ParchLockMap === "undefined" || !roomName || !exits || !exits.length) return;
        if (!ParchLockMap.GetRoom(roomName)) {
            ParchLockMap.Rooms.push({ Id: ParchLockMap.Rooms.length, Name: roomName, Exits: {}, Notes: [], ObjectId: MapIdentity.hashName(roomName), Floor: 0 });
        }
        var room = ParchLockMap.GetRoom(roomName);
        MapIdentity.ensureRoomIdentity(room);
        exits.forEach(function (ex) {
            var dir = String((ex && (ex.label || ex.dir)) || "").toLowerCase();
            if (!dir) return;
            // Mark known exit direction without inventing destination room names (anti-spoiler)
            // Do not insert null exit targets ? Navigator treats missing edges as unknown.
            room.ExitMeta = room.ExitMeta || {};
            if (room.Exits[dir] === undefined) {
                room.ExitMeta[dir] = Object.assign({}, room.ExitMeta[dir] || {}, { hinted: true });
            }
            // Locked R2: for a ZIL DEXIT (doorObjectId) merge, never replace the
            // exit's meta, and let a fresh non-true observation clear an old lock.
            // Inform exits keep the original behaviour.
            var zilDoor = ex && (ex.doorObjectId != null || (room.ExitMeta[dir] && room.ExitMeta[dir].doorObjectId != null));
            if (ex && ex.isLocked && !zilDoor) {
                room.ExitMeta[dir] = { locked: true, confidence: ex.confidence || 0.5 };
            } else if (ex && ex.isLocked === true) {
                room.ExitMeta[dir] = Object.assign({}, room.ExitMeta[dir] || {}, { locked: true, confidence: ex.confidence || 0.5 });
            } else if (zilDoor && room.ExitMeta[dir]) {
                delete room.ExitMeta[dir].locked;
                delete room.ExitMeta[dir].isLocked;
            }
            // P10 R2: route block is its own observation for ZIL door exits.
            if (zilDoor && room.ExitMeta[dir]) {
                if (ex && ex.routeBlocked === true) room.ExitMeta[dir].routeBlocked = true;
                else delete room.ExitMeta[dir].routeBlocked;
            }
            if (ex && typeof ex.zDelta === "number" && ex.zDelta) {
                room.Floor = (room.Floor || 0) + 0; // floor tabs consume z later; keep room.Floor stable
                room.ExitMeta = room.ExitMeta || {};
                room.ExitMeta[dir] = Object.assign({}, room.ExitMeta[dir] || {}, { zDelta: ex.zDelta });
            }
        });
    },

    findByObjectId: (oid) => {
        if (typeof ParchLockMap === "undefined") return null;
        return (ParchLockMap.Rooms || []).find(function (r) { return r.ObjectId === oid; }) || null;
    }
};
