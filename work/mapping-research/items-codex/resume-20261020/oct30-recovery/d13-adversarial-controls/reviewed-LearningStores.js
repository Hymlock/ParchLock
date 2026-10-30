/* D13 (R3-R6): module learning store ownership and erase-for-uninstalled.
 *
 * Each module-scoped learning store registers its exact localStorage key at
 * its own write site and persists through a serialized writer under the Web
 * Lock "PL_learning_store". The index PL_ModuleLearningOwner_v1 records, per
 * key, the kind, the owners {digest, path, inputs} and the committed
 * storeRevision, plus the index revision and erase tombstones.
 *
 * Erase (Options > Learned words) removes only keys whose every owner is
 * uninstalled AND whose owner digests are disjoint from the known digests of
 * every installed module; the current story is protected by digest and path.
 * Maps, saves, transcripts, preferences and unmanaged keys are never touched.
 * Without Web Locks the erase is disabled and persists write as before.
 */
var LearningStores = (function () {
    var INDEX_KEY = "PL_ModuleLearningOwner_v1";
    var LOCK = "PL_learning_store";
    var MAX_OWNERS = 16;
    var generators = Object.create(null);
    var prefixes = [];
    var queue = [];            // FIFO of immutable snapshots
    var draining = false;
    var localRev = Object.create(null);   // key -> last captured storeRevision
    var hydratedAt = Object.create(null); // key -> index revision when read/reset
    var lastError = null, reported = false;

    function storage() { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; } }
    function locks() {
        try { return typeof navigator !== "undefined" && navigator.locks && typeof navigator.locks.request === "function" ? navigator.locks : null; } catch (e) { return null; }
    }
    function emptyIndex() { return { v: 1, revision: 0, entries: {}, tombstones: {} }; }

    function isObj(o) { return !!o && typeof o === "object" && !Array.isArray(o); }
    function validInt(n) { return typeof n === "number" && isFinite(n) && n >= 0 && Math.floor(n) === n; }

    // Returns {ok, index}; a malformed index is ignored (ok:false).
    function readIndex() {
        var ls = storage();
        if (!ls) return { ok: false, index: emptyIndex(), reason: "storage unavailable" };
        var raw;
        try { raw = ls.getItem(INDEX_KEY); } catch (e) { return { ok: false, index: emptyIndex(), reason: "storage unavailable" }; }
        if (raw == null) return { ok: true, index: emptyIndex() };
        try {
            var p = JSON.parse(raw);
            if (!isObj(p) || p.v !== 1 || !validInt(p.revision) || !isObj(p.entries) || !isObj(p.tombstones)) throw 0;
            Object.keys(p.entries).forEach(function (k) {
                var e = p.entries[k];
                if (!isObj(e) || e.key !== k || typeof e.kind !== "string" || !Array.isArray(e.owners) || !validInt(e.storeRevision)) throw 0;
                e.owners.forEach(function (o) {
                    if (!isObj(o) || !isObj(o.inputs) || (o.digest != null && typeof o.digest !== "string") || typeof o.path !== "string") throw 0;
                });
            });
            Object.keys(p.tombstones).forEach(function (k) {
                if (!isObj(p.tombstones[k]) || !validInt(p.tombstones[k].erasedAtIndexRevision)) throw 0;
            });
            return { ok: true, index: p };
        } catch (e2) { return { ok: false, index: emptyIndex(), reason: "The learning index is damaged, so nothing can be erased." }; }
    }
    function writeIndex(index) { storage().setItem(INDEX_KEY, JSON.stringify(index)); }

    function register(kind, prefix, generator) {
        generators[kind] = generator;
        if (prefix && prefixes.indexOf(prefix) < 0) prefixes.push(prefix);
    }

    function entryValid(entry) {
        var gen = generators[entry.kind];
        if (!gen || !entry.owners.length) return false;
        return entry.owners.every(function (o) {
            try { return gen(o.inputs) === entry.key; } catch (e) { return false; }
        });
    }

    function normPath(p) {
        try { return typeof ModuleLibrary !== "undefined" && ModuleLibrary.normalizePath ? ModuleLibrary.normalizePath(p) : String(p || ""); } catch (e) { return String(p || ""); }
    }
    function currentOwner() {
        var path = "", digest = null;
        try { if (typeof ParchLock !== "undefined") path = normPath(ParchLock.StoryPath || ParchLock.GameFilename || ""); } catch (e) {}
        try { if (typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest) digest = ModuleLibrary.currentExecutableDigest() || null; } catch (e2) {}
        return { digest: digest, path: path };
    }

    function sameOwner(a, b) {
        return a.digest === b.digest && a.path === b.path && JSON.stringify(a.inputs) === JSON.stringify(b.inputs);
    }

    // Value a store should hydrate from: the newest queued snapshot for the
    // key, else storage. Records the index revision the store hydrated at.
    function read(key) {
        hydratedAt[key] = readIndex().index.revision;
        for (var i = queue.length - 1; i >= 0; i--) if (queue[i].key === key) return queue[i].value;
        try { var ls = storage(); return ls ? ls.getItem(key) : null; } catch (e) { return null; }
    }

    function commit(snap) {
        var ls = storage();
        var r = readIndex();
        var index = r.ok ? r.index : null;
        if (index) {
            var tomb = index.tombstones[snap.key];
            var hyd = snap.hydratedRevision == null ? -1 : snap.hydratedRevision;
            if (tomb && tomb.erasedAtIndexRevision > hyd) {
                // Erased after this store hydrated: never resurrect it. The
                // store starts fresh for that module.
                hydratedAt[snap.key] = index.revision;
                localRev[snap.key] = 0;
                if (typeof snap.reset === "function") { try { snap.reset(); } catch (e) {} }
                return "erased";
            }
            var entry = index.entries[snap.key];
            // Superseded only by a strictly newer committed snapshot.
            if (entry && entry.kind === snap.kind && entry.storeRevision > snap.storeRevision) {
                return "superseded";
            }
        }
        ls.setItem(snap.key, snap.value);
        if (!index) return "written-unindexed";
        var e = index.entries[snap.key];
        if (!e || e.kind !== snap.kind) e = index.entries[snap.key] = { key: snap.key, kind: snap.kind, owners: [], storeRevision: 0 };
        if (!e.owners.some(function (o) { return sameOwner(o, snap.owner); })) {
            e.owners.push(snap.owner);
            if (e.owners.length > MAX_OWNERS) e.owners.shift();
        }
        e.storeRevision = Math.max(e.storeRevision, snap.storeRevision);
        if (index.tombstones[snap.key]) delete index.tombstones[snap.key];
        writeIndex(index);
        return "written";
    }

    var seqNo = 0;

    function reportOnce(err) {
        lastError = "Learned data could not be saved yet; it will retry.";
        if (!reported) { reported = true; try { console.warn("[LearningStores] lock unavailable:", err); } catch (e) {} }
        try { if (typeof $ !== "undefined") $("#pl-learning-erase-status").text(lastError); } catch (e2) {}
    }

    function drain() {
        if (draining || !queue.length) return Promise.resolve();
        var l = locks();
        draining = true;
        var p;
        try {
            p = l.request(LOCK, function () {
                while (queue.length) {
                    var snap = queue[0];
                    commit(snap); // a throw keeps the snapshot queued (dirty)
                    queue.shift();
                }
            });
        } catch (eSync) { p = Promise.reject(eSync); }
        return Promise.resolve(p).then(function () { draining = false; lastError = null; reported = false; if (queue.length) return drain(); },
            function (err) { draining = false; reportOnce(err); });
    }

    // Capture an immutable snapshot and persist it. `value` is the serialized
    // store; `reset` clears the store's in-memory table if the key was erased.
    function persist(kind, inputs, value, reset) {
        var gen = generators[kind];
        if (!gen) return null;
        var key = gen(inputs);
        if (!key) return null;
        var ls = storage();
        if (!ls) return null;
        var owner = currentOwner();
        owner = { digest: owner.digest, path: owner.path, inputs: JSON.parse(JSON.stringify(inputs)) };
        if (!locks()) {
            // No Web Locks: cleanup is disabled for the session; write as today.
            try { ls.setItem(key, value); } catch (e) { return null; }
            try {
                var r = readIndex();
                if (r.ok) {
                    var e = r.index.entries[key];
                    if (!e || e.kind !== kind) e = r.index.entries[key] = { key: key, kind: kind, owners: [], storeRevision: 0 };
                    if (!e.owners.some(function (o) { return sameOwner(o, owner); })) { e.owners.push(owner); if (e.owners.length > MAX_OWNERS) e.owners.shift(); }
                    e.storeRevision += 1;
                    writeIndex(r.index);
                }
            } catch (e2) {}
            return Promise.resolve("written");
        }
        if (localRev[key] == null) {
            var ent = readIndex().index.entries[key];
            localRev[key] = ent ? ent.storeRevision : 0;
        }
        if (hydratedAt[key] == null) hydratedAt[key] = readIndex().index.revision;
        var snap = Object.freeze({
            key: key, kind: kind, owner: Object.freeze(owner), value: String(value),
            storeRevision: ++localRev[key], hydratedRevision: hydratedAt[key], seq: ++seqNo, reset: reset
        });
        queue.push(snap);
        return drain();
    }

    // ---- installed-set and erase -------------------------------------------------
    function installedSet() {
        var paths = [], digests = [], unknown = 0;
        var mods = [];
        try { mods = ModuleLibrary.all(); } catch (e) { return null; }
        var ls = storage();
        mods.forEach(function (m) {
            var p = normPath(m.Path);
            paths.push(p);
            var d = null;
            try { d = ModuleLibrary.currentExecutableDigest(p) || null; } catch (e1) {}
            if (!d) { try { d = ls.getItem(ModuleLibrary.transcriptDigestKey(p)) || null; } catch (e2) {} }
            if (d) digests.push(d); else unknown++;
        });
        return { paths: paths, digests: digests, unknown: unknown };
    }

    function list() {
        var out = { ok: false, reason: "", candidates: [], removable: 0, installed: 0, unknown: 0, unmanaged: 0, bytes: 0, revision: 0, signature: "" };
        if (!locks()) { out.reason = "Erasing is unavailable in this browser (no Web Locks)."; return out; }
        var ls = storage();
        if (!ls) { out.reason = "Storage is unavailable."; return out; }
        var r = readIndex();
        if (!r.ok) { out.reason = r.reason; return out; }
        var inst = installedSet();
        if (!inst) { out.reason = "The story library is unavailable."; return out; }
        var cur = currentOwner();
        out.revision = r.index.revision;
        var managed = Object.create(null);
        Object.keys(r.index.entries).forEach(function (k) {
            var e = r.index.entries[k];
            var value;
            try { value = ls.getItem(k); } catch (eG) { value = null; }
            if (!entryValid(e)) return; // counted as unmanaged below if present
            managed[k] = true;
            if (value != null) out.bytes += (k.length + value.length) * 2;
            var installed = e.owners.some(function (o) {
                return inst.paths.indexOf(o.path) >= 0 || (o.digest && inst.digests.indexOf(o.digest) >= 0) ||
                    (cur.path && o.path === cur.path) || (cur.digest && o.digest === cur.digest);
            });
            if (installed) { out.installed++; return; }
            if (inst.unknown > 0 || e.owners.some(function (o) { return !o.digest; })) { out.unknown++; return; }
            if (value == null) return;
            out.candidates.push({ key: k, value: value });
        });
        try {
            for (var i = 0; i < ls.length; i++) {
                var key = ls.key(i);
                if (key && !managed[key] && prefixes.some(function (p) { return key.indexOf(p) === 0; })) out.unmanaged++;
            }
        } catch (eL) {}
        out.removable = out.candidates.length;
        out.signature = JSON.stringify([inst.paths.slice().sort(), inst.digests.slice().sort(), inst.unknown, cur, out.revision]);
        out.ok = true;
        return out;
    }

    // Erase what `listing` showed. Re-validated inside the lock: if the
    // installed set, index revision or any candidate value changed, abort.
    function erase(listing) {
        var l = locks();
        if (!l || !listing || !listing.ok) return Promise.resolve({ aborted: true, reason: (listing && listing.reason) || "Erasing is unavailable." });
        return Promise.resolve(l.request(LOCK, function () {
            var now = list();
            if (!now.ok || now.signature !== listing.signature || now.candidates.length !== listing.candidates.length ||
                now.candidates.some(function (c, i) { return c.key !== listing.candidates[i].key || c.value !== listing.candidates[i].value; })) {
                return { aborted: true, reason: "Your stories changed; the list was refreshed.", listing: now };
            }
            var ls = storage();
            var index = readIndex().index;
            var nextRev = index.revision + 1;
            var removed = 0, failed = 0;
            listing.candidates.forEach(function (c) {
                var gone = false;
                try { ls.removeItem(c.key); gone = ls.getItem(c.key) == null; } catch (e) { gone = false; }
                if (gone) {
                    removed++;
                    delete index.entries[c.key];
                    index.tombstones[c.key] = { erasedAtIndexRevision: nextRev };
                } else failed++;
            });
            index.revision = nextRev; // written last
            try { writeIndex(index); } catch (eW) { return { aborted: false, removed: removed, failed: failed, indexWriteFailed: true }; }
            return { aborted: false, removed: removed, failed: failed };
        })).catch(function (err) { return { aborted: true, reason: "Could not get exclusive access; nothing was erased." }; });
    }

    function kb(bytes) { return Math.max(0, Math.round(bytes / 1024 * 10) / 10); }
    function describe(listing, result) {
        if (!listing.ok) return listing.reason;
        var s = "Learned data: about " + kb(listing.bytes) + " KB (UTF-16 estimate). " +
            listing.removable + " erasable, " + listing.installed + " kept for installed stories, " +
            listing.unknown + " unknown, " + listing.unmanaged + " unmanaged.";
        if (result) s = (result.aborted ? result.reason + " " : "Removed " + result.removed + ", failed " + result.failed + ". ") + s;
        return s;
    }

    // Options > Learned words row (WorkspaceUI).
    function addOptions(container) {
        if (typeof $ === "undefined") return;
        var row = $("<div class='pl-learning-erase'>").appendTo(container);
        var status = $("<span id='pl-learning-erase-status' role='status'>");
        var button = $("<button type='button'>").text("Erase learned data for uninstalled stories").appendTo(row);
        status.appendTo(row);
        function refresh(result) {
            var listing = list();
            button.prop("disabled", !listing.ok || listing.removable === 0);
            status.text(lastError ? lastError + " " + describe(listing, result) : describe(listing, result));
            return listing;
        }
        button.on("click", function () {
            var listing = refresh();
            if (!listing.ok || !listing.removable) return;
            if (!confirm("Erase learned data for " + listing.removable + " item(s) from stories that are no longer installed? Maps, saves and transcripts are kept.")) return;
            erase(listing).then(function (res) { refresh(res); });
        });
        refresh();
    }

    return {
        INDEX_KEY: INDEX_KEY, LOCK: LOCK,
        register: register, read: read, persist: persist, readIndex: readIndex,
        list: list, erase: erase, describe: describe, addOptions: addOptions,
        entryValid: entryValid, pending: function () { return queue.length; },
        lastError: function () { return lastError; },
        _drain: drain
    };
})();
