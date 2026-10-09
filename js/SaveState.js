/* D215 save-tied state (claude/codex consensus R1+R2, #2217/#2221).
 *
 * The transcript was already tied to game saves (E4); the map and the item
 * names the player has seen were not, so a new game kept the old map and a
 * loaded save showed dictionary fragments until INVENTORY was typed again.
 *
 * Transcript.js already observes the authoritative events, so this module adds
 * no detection of its own. It is told:
 *   save(name)    after file_write succeeded for the chosen save
 *   restore(name) after restore_file succeeded (staged; applied by resync)
 *   restart       a real in-game restart (not the VM's boot restart)
 *   boot          a fresh page start with no observed engine autorestore
 *   forget(names) saves deleted anywhere
 * and stores, per save, the map and codex's display-only label snapshot in
 * synchronous localStorage: PL_SaveState_<storyId>_<saveName>.
 *
 * A save without a snapshot restores a clean map and no labels: nothing newer
 * is ever carried into an older save. A new game first archives a non-empty
 * working map as a flagged "Before new game" Maps slot, so exploration is never
 * silently lost; if that archive cannot be written, the map is not cleared.
 */
var SaveState = {
    PREFIX: "PL_SaveState_",
    ARCHIVE_KEEP: 3,
    _pending: null,

    // The exact executable digest, the same identity the transcript uses: a
    // short native id could collide between different files.
    storyId: function () {
        try {
            if (typeof Transcript !== "undefined" && Transcript.digest) return String(Transcript.digest);
            if (typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest) return String(ModuleLibrary.currentExecutableDigest() || "");
        } catch (e) {}
        return "";
    },
    keyFor: function (id, name) { return SaveState.PREFIX + id + "_" + name; },

    // ---- validation (stored records and imported packages are untrusted) ----
    BAD_KEYS: { "__proto__": 1, "constructor": 1, "prototype": 1 },
    cleanLabels: function (snap) {
        if (!snap || typeof snap !== "object" || snap.schema !== 1 || !snap.labels || typeof snap.labels !== "object" || Array.isArray(snap.labels)) return null;
        var out = Object.create(null), count = 0;
        Object.keys(snap.labels).forEach(function (k) {
            if (SaveState.BAD_KEYS[k] || !/^[1-9][0-9]{0,4}$/.test(k) || Number(k) > 65535 || count >= 4096) return;
            var v = snap.labels[k];
            if (!v || typeof v !== "object" || typeof v.phrase !== "string" || !v.phrase || v.phrase.length > 1024) return;
            if (!Array.isArray(v.words) || v.words.length > 128) return;
            if (!v.words.every(function (w) { return typeof w === "string" && w.length > 0 && w.length <= 64; })) return;
            out[k] = { phrase: v.phrase, words: v.words.slice() };
            count++;
        });
        return { schema: 1, labels: out };
    },
    cleanMap: function (map) {
        try {
            if (!Array.isArray(map)) return null;
            var copy = JSON.parse(JSON.stringify(map));
            var data = { Map: copy };
            if (typeof WorkspaceUI !== "undefined" && WorkspaceUI.ValidateMap) WorkspaceUI.ValidateMap(data);
            var rooms = Array.isArray(data.Map) ? data.Map : [];
            if (rooms.some(function (room, index) {
                return !room || room.Id !== index || !room.Exits || typeof room.Exits !== "object"
                    || Object.keys(room.Exits).some(function (d) { var id = room.Exits[d]; return SaveState.BAD_KEYS[d] || !Number.isInteger(id) || id < 0 || id >= rooms.length; });
            })) return null;
            if (typeof MapTopology !== "undefined" && MapTopology.isInternalRoomName
                && rooms.some(function (r) { return !r.Name || MapTopology.isInternalRoomName(r.Name); })) return null;
            if (typeof MapTopology !== "undefined" && MapTopology.quarantineUnprovenSubSteps) MapTopology.quarantineUnprovenSubSteps(rooms);
            return rooms;
        } catch (e) { return null; }
    },
    read: function (id, name) {
        try {
            var raw = localStorage.getItem(SaveState.keyFor(id, name));
            if (!raw) return null;
            var rec = JSON.parse(raw);
            if (!rec || rec.schema !== 1 || rec.story !== id) return null;
            var map = SaveState.cleanMap(rec.map);
            if (!map) return null;
            return { map: map, labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null };
        } catch (e) { return null; }
    },

    // ---- lifecycle (called from Transcript.js) ----------------------------
    onLifecycle: function (kind, info) {
        try {
            var id = SaveState.storyId();
            if (!id) return;
            if (kind === "save") SaveState.snapshot(id, String(info && info.name || ""));
            else if (kind === "restore") SaveState._pending = { kind: "restore", story: id, snapshot: SaveState.read(id, String(info && info.name || "")) };
            else if (kind === "restart") SaveState._pending = { kind: "newGame", story: id, archived: SaveState.archiveWorkingMap("restart") };
            else if (kind === "boot") SaveState.freshBoot(id);
            else if (kind === "forget") (info && info.names || []).forEach(function (n) { try { localStorage.removeItem(SaveState.keyFor(id, n)); } catch (e) {} });
        } catch (e) {}
    },

    snapshot: function (id, name) {
        if (!name || typeof ParchLockMap === "undefined") return;
        var labels = null;
        try { if (typeof Actionable !== "undefined" && Actionable.labelSnapshot) labels = SaveState.cleanLabels(Actionable.labelSnapshot()); } catch (e) {}
        var rec = { schema: 1, story: id, savedAt: new Date().toISOString(), map: ParchLockMap.Rooms || [], labels: labels };
        try {
            localStorage.setItem(SaveState.keyFor(id, name), JSON.stringify(rec));
        } catch (e) {
            // Never leave an older snapshot beside the new save bytes: restoring
            // this save must then start clean, not show a previous map.
            try { localStorage.removeItem(SaveState.keyFor(id, name)); } catch (eRm) {}
            SaveState.report("The map for this save could not be stored (" + (e && e.name || "storage error") + "). The game save itself was written; loading it will start with a clean map.");
        }
    },

    // Called by UndoRestoreSync.resync after its scope/label clear and BEFORE
    // its map handling. Returns true when this module owned the map handling.
    applyPending: function (reason, generation) {
        var p = SaveState._pending;
        if (!p) return false;
        // Only the authoritative event consumes what it staged: a generic or
        // earlier resync leaves the pending restore/new game in place.
        if ((p.kind === "restore" && reason !== "restore_file") || (p.kind === "newGame" && reason !== "restart")) return false;
        SaveState._pending = null;
        if (p.story !== SaveState.storyId() || typeof ParchLockMap === "undefined") return false;
        if (p.kind === "restore") {
            if (p.snapshot) {
                ParchLockMap.Clear({ seed: false });
                ParchLockMap.Rooms = p.snapshot.map;
            } else {
                ParchLockMap.Clear({ seed: false });
            }
            ParchLockMap.Save();
            try {
                if (typeof Actionable !== "undefined") {
                    if (p.snapshot && p.snapshot.labels && Actionable.applyLabelSnapshot) Actionable.applyLabelSnapshot(p.snapshot.labels);
                    else if (Actionable.clearLabelSnapshot) Actionable.clearLabelSnapshot();
                }
            } catch (e) {}
            return true;
        }
        if (p.kind === "newGame") {
            // An archive that failed keeps the working map: never clear what
            // could not be preserved.
            if (p.archived !== false) { ParchLockMap.Clear({ seed: false }); ParchLockMap.Save(); }
            try { if (typeof Actionable !== "undefined" && Actionable.clearLabelSnapshot) Actionable.clearLabelSnapshot(); } catch (e) {}
            return true;
        }
        return false;
    },

    freshBoot: function (id) {
        if (typeof ParchLockMap === "undefined" || !(ParchLockMap.Rooms || []).length) return;
        if (SaveState.archiveWorkingMap("boot") === false) return;
        ParchLockMap.Clear({ seed: false });
        ParchLockMap.Save();
        try {
            if (typeof MapTopology !== "undefined") {
                MapTopology.prevRoomId = null;
                MapTopology.prevRoomName = "";
                if (typeof WorldModel !== "undefined" && WorldModel.lastPayload) MapTopology.tick(WorldModel.lastPayload);
            }
            if (ParchLockMap.Draw) ParchLockMap.Draw();
        } catch (e) {}
    },

    // Returns true (archived, or nothing to archive) or false (write failed).
    archiveWorkingMap: function (why) {
        try {
            var rooms = (typeof ParchLockMap !== "undefined" && ParchLockMap.Rooms) || [];
            if (!rooms.length || typeof WorkspaceUI === "undefined" || !WorkspaceUI.MapKey) return true;
            var key = WorkspaceUI.MapKey(), slots = [];
            try { slots = JSON.parse(localStorage.getItem(key) || "[]"); } catch (eParse) { slots = null; }
            if (!Array.isArray(slots)) {
                SaveState.report("Your saved Maps list could not be read, so the previous map was kept on screen instead of being archived.");
                return false;
            }
            var stamp = new Date();
            var label = "Before new game " + stamp.toLocaleDateString() + " " + stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            var data = WorkspaceUI.MapData ? WorkspaceUI.MapData() : { Format: "ParchLockMap", Version: 1, Story: ParchLock.GameFilename, Map: rooms };
            slots.push({ Name: label, Date: stamp.toISOString(), Data: JSON.parse(JSON.stringify(data)), autoArchive: true });
            var auto = slots.filter(function (s) { return s && s.autoArchive === true; });
            while (auto.length > SaveState.ARCHIVE_KEEP) {
                var oldest = auto.shift();
                slots.splice(slots.indexOf(oldest), 1);
            }
            localStorage.setItem(key, JSON.stringify(slots));
            return true;
        } catch (e) {
            SaveState.report("Your previous map could not be archived before the new game, so it was kept on screen (" + (e && e.name || "storage error") + ").");
            return false;
        }
    },

    // ---- portable packages --------------------------------------------------
    exportFor: function (names) {
        var id = SaveState.storyId(), out = {};
        if (!id) return null;
        (names || []).forEach(function (n) {
            try { var raw = localStorage.getItem(SaveState.keyFor(id, n)); if (raw) out[n] = JSON.parse(raw); } catch (e) {}
        });
        return Object.keys(out).length ? { schema: 1, story: id, saves: out } : null;
    },
    validImport: function (block) {
        if (block == null) return true;
        if (typeof block !== "object" || block.schema !== 1 || typeof block.saves !== "object" || !block.saves) return false;
        if (block.story !== SaveState.storyId()) return false;
        return Object.keys(block.saves).every(function (n) {
            var rec = block.saves[n];
            return !SaveState.BAD_KEYS[n] && rec && rec.schema === 1 && rec.story === block.story && !!SaveState.cleanMap(rec.map)
                && (rec.labels == null || !!SaveState.cleanLabels(rec.labels));
        });
    },
    // The writes a package import makes, for the importer to apply inside its
    // own rollback: every imported game save gets exactly its packaged
    // snapshot, or loses any old one (an overwritten save must not restore an
    // unrelated older map). Names not imported as saves are never touched.
    // Each entry is { Key, Data } with Data null meaning remove.
    importWrites: function (block, importedNames) {
        var id = SaveState.storyId(), out = [];
        if (!id || !SaveState.validImport(block)) return out;
        var saves = (block && block.saves) || {};
        (importedNames || []).forEach(function (n) {
            var rec = Object.prototype.hasOwnProperty.call(saves, n) ? saves[n] : null;
            if (!rec) { out.push({ Key: SaveState.keyFor(id, n), Data: null }); return; }
            var clean = { schema: 1, story: id, savedAt: String(rec.savedAt || ""), map: SaveState.cleanMap(rec.map), labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null };
            out.push({ Key: SaveState.keyFor(id, n), Data: JSON.stringify(clean) });
        });
        return out;
    },

    // Uninstalling a module removes its save snapshots with its transcript.
    removeStory: function (storyId) {
        try {
            if (!storyId) return;
            var prefix = SaveState.PREFIX + storyId + "_", doomed = [];
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) doomed.push(k);
            }
            doomed.forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
    },

    report: function (text) {
        try { if (typeof Message !== "undefined" && Message.Show) Message.Show("Save data", "<p>" + text + "</p>", true); } catch (e) {}
    }
};

if (typeof module !== "undefined" && module.exports) module.exports = SaveState;
