/* D13 (R3-R6): module learning store ownership and erase-for-uninstalled.
 *
 * Each module-scoped learning store registers its exact localStorage key at
 * its own write site and persists through a serialized writer under the Web
 * Lock "PL_learning_store". The index PL_ModuleLearningOwner_v1 records, per
 * key, the kind and the owners {digest, path, inputs}, plus the index
 * revision and erase tombstones. Cross-tab value writes are
 * last-writer-wins in commit order; there is no per-write counter. The
 * index is rewritten only when entry metadata changes (new entry/kind,
 * new owner, overflow flag, tombstone clear, recovery/pending changes),
 * never for a value-only write.
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
    var compactors = Object.create(null); // P13b: kind -> compact(value) used on QuotaExceededError
    var QUOTA_MESSAGE = "Storage is full; learned data was not saved";
    var quotaError = null, quotaReported = false;
    var prefixes = [];
    var queue = [];            // FIFO of immutable snapshots
    var draining = false;
    var hydratedAt = Object.create(null); // key -> index revision when read/reset
    var hydratedEpoch = Object.create(null); // key -> entry eraseEpoch when read/reset
    var lastError = null, reported = false, recoveryError = null;

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
                if (!isObj(e) || e.key !== k || typeof e.kind !== "string" || !Array.isArray(e.owners) || (e.eraseEpoch != null && !validInt(e.eraseEpoch))) throw 0;
                if (e.ownersOverflow != null && e.ownersOverflow !== true) throw 0;
                if (e.pathOnlyDropped != null && e.pathOnlyDropped !== true) throw 0;
                if (e.digests != null && (!Array.isArray(e.digests) || !e.digests.every(function (d) { return typeof d === "string"; }))) throw 0;
                e.owners.forEach(function (o) {
                    if (!isObj(o) || !isObj(o.inputs) || (o.digest != null && typeof o.digest !== "string") || typeof o.path !== "string") throw 0;
                    if (o.lastWriteAt != null && !(typeof o.lastWriteAt === "number" && isFinite(o.lastWriteAt))) throw 0;
                });
            });
            Object.keys(p.tombstones).forEach(function (k) {
                if (!isObj(p.tombstones[k]) || !validInt(p.tombstones[k].erasedAtIndexRevision)) throw 0;
            });
            if (p.pending != null && (!isObj(p.pending) || !validInt(p.pending.revision) || !Array.isArray(p.pending.records) ||
                !p.pending.records.every(function (rec) {
                    return isObj(rec) && typeof rec.key === "string" && typeof rec.kind === "string" && isObj(rec.inputs) && p.tombstones[rec.key];
                }))) throw 0;
            return { ok: true, index: p };
        } catch (e2) { return { ok: false, index: emptyIndex(), reason: "The learning index is damaged, so nothing can be erased." }; }
    }
    function writeIndex(index) { storage().setItem(INDEX_KEY, JSON.stringify(index)); }

    // opts.compact(value) -> smaller serialized value; called only on a
    // QuotaExceededError for this kind's own key (P13b R2 quota).
    function register(kind, prefix, generator, opts) {
        generators[kind] = generator;
        if (opts && typeof opts.compact === "function") compactors[kind] = opts.compact;
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

    // P13b R2 index. `digests` is the durable erase authority: every owner
    // digest ever added, never trimmed. `owners` metadata keeps the
    // MAX_OWNERS most recent (by lastWriteAt). Dropping a path-only owner
    // (no digest) sets pathOnlyDropped, which keeps the entry unerasable
    // (path-only owners stay fail-closed).
    // Migration: an entry without `digests` gets them rebuilt from its owners
    // only when that list is complete (never overflowed). A legacy
    // ownersOverflow entry already lost owners beyond 16, so its digest set
    // cannot be rebuilt: it stays unerasable for good, and the overflow flag
    // is never cleared without digests.
    function ensureDigests(e) {
        if (Array.isArray(e.digests) || e.ownersOverflow) return false;
        e.digests = [];
        e.owners.forEach(function (o) { if (o.digest && e.digests.indexOf(o.digest) < 0) e.digests.push(o.digest); });
        return true;
    }
    function addOwner(e, owner) {
        // A known owner changes nothing (value-only writes never rewrite the
        // index; entryDigests derives a complete legacy entry's digests).
        if (e.owners.some(function (o) { return sameOwner(o, owner); })) return false;
        // Legacy overflow (no digests): owners stay frozen, never erasable.
        if (!Array.isArray(e.digests) && e.ownersOverflow) return false;
        ensureDigests(e);
        if (owner.digest && e.digests.indexOf(owner.digest) < 0) e.digests.push(owner.digest);
        while (e.owners.length >= MAX_OWNERS) {
            var oldest = 0;
            for (var i = 1; i < e.owners.length; i++) if ((e.owners[i].lastWriteAt || 0) < (e.owners[oldest].lastWriteAt || 0)) oldest = i;
            var gone = e.owners.splice(oldest, 1)[0];
            if (!gone.digest) e.pathOnlyDropped = true;
        }
        e.owners.push({ digest: owner.digest, path: owner.path, inputs: owner.inputs, lastWriteAt: Date.now() });
        return true;
    }
    function entryDigests(e) {
        if (Array.isArray(e.digests)) return e.digests;
        return e.owners.map(function (o) { return o.digest; }).filter(Boolean);
    }
    function isQuota(err) {
        return !!err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22 || err.code === 1014);
    }
    function reportQuota() {
        quotaError = QUOTA_MESSAGE;
        if (!quotaReported) { quotaReported = true; try { console.warn("[LearningStores] " + QUOTA_MESSAGE); } catch (e) {} }
        try { if (typeof $ !== "undefined") $("#pl-learning-erase-status").text(QUOTA_MESSAGE); } catch (e2) {}
    }
    // Writes a learning value. On QuotaExceededError the kind's registered
    // compact(value) hook runs (kinds without one are skipped; only this
    // learning key is touched -- never maps, saves, transcripts or prefs, and
    // nothing is evicted from other keys), then the write is retried once. A
    // second failure reports the quota status and returns false: the caller
    // drops the snapshot instead of requeueing it, so it is next written only
    // after a real mutation persists a new snapshot.
    function writeValue(ls, kind, key, value) {
        try { ls.setItem(key, value); quotaError = null; quotaReported = false; return true; }
        catch (err) {
            if (!isQuota(err)) throw err;
            var next = value;
            if (compactors[kind]) { try { var c = compactors[kind](value); if (typeof c === "string") next = c; } catch (eC) {} }
            try { ls.setItem(key, next); quotaError = null; quotaReported = false; return true; }
            catch (err2) { if (!isQuota(err2)) throw err2; reportQuota(); return false; }
        }
    }

    // Finish an erase interrupted after its tombstones became durable. Its
    // keys stay tombstoned; removal is retried and the revision finalized.
    // Every pending record is re-validated against its store's exact key
    // generator first; a damaged or unmanaged record aborts recovery with
    // nothing removed. Keys that fail to remove stay pending (tombstoned)
    // and are retried on the next commit or erase.
    function pendingKeys(index) { return index.pending ? index.pending.records.map(function (rec) { return rec.key; }) : []; }
    function recordValid(rec) {
        var gen = generators[rec.kind];
        if (!gen) return false;
        try { return gen(rec.inputs) === rec.key; } catch (e) { return false; }
    }
    function recover(index) {
        if (!index.pending) return "none";
        if (!index.pending.records.every(recordValid)) {
            recoveryError = "An unfinished erase record is damaged; nothing more was erased.";
            return "damaged";
        }
        var ls = storage();
        var left = [];
        index.pending.records.forEach(function (rec) {
            var gone = false;
            try { ls.removeItem(rec.key); gone = ls.getItem(rec.key) == null; } catch (e) {}
            if (gone) eraseEntry(index, rec.key, index.pending.revision); else left.push(rec);
        });
        if (left.length) {
            index.pending.records = left;
            recoveryError = left.length + " learned item(s) could not be erased yet; will retry.";
            writeIndex(index);
            return "retry";
        }
        recoveryError = null;
        index.revision = Math.max(index.revision, index.pending.revision);
        delete index.pending;
        writeIndex(index);
        return "done";
    }

    // codex #5692: an erased key keeps its entry as a permanent erase epoch
    // (monotonic; fresh writes never lower or remove it). Owners are dropped.
    function epochOf(index, key) { var e = index.entries[key]; return (e && e.eraseEpoch) || 0; }
    // A store hydrating while the key's erase is pending already sees it gone,
    // so it hydrates at the epoch that erase will commit.
    function hydrateEpoch(index, key) {
        var ep = epochOf(index, key);
        if (index.pending && pendingKeys(index).indexOf(key) >= 0) ep = Math.max(ep, index.pending.revision);
        return ep;
    }
    function eraseEntry(index, key, rev) {
        var e = index.entries[key];
        index.entries[key] = { key: key, kind: e ? e.kind : "", owners: [], eraseEpoch: Math.max(epochOf(index, key), rev) };
    }

    function sameOwner(a, b) {
        return a.digest === b.digest && a.path === b.path && JSON.stringify(a.inputs) === JSON.stringify(b.inputs);
    }

    // Value a store should hydrate from: the newest queued snapshot for the
    // key, else storage. Records the index revision the store hydrated at.
    function read(key) {
        var idx = readIndex().index;
        hydratedAt[key] = idx.revision;
        hydratedEpoch[key] = hydrateEpoch(idx, key);
        if (idx.pending && pendingKeys(idx).indexOf(key) >= 0) {
            // Mid-erase (or interrupted erase): the key is already gone.
            hydratedAt[key] = idx.pending.revision;
            return null;
        }
        for (var i = queue.length - 1; i >= 0; i--) if (queue[i].key === key) return queue[i].value;
        try { var ls = storage(); return ls ? ls.getItem(key) : null; } catch (e) { return null; }
    }

    // Digest learning identity is separate from the VM's legacy header identity.
    function identity(mem, requireZMemory) {
        try {
            if (typeof ModuleLibrary === "undefined" || !ModuleLibrary.currentExecutableIdentity) return null;
            var id = ModuleLibrary.currentExecutableIdentity();
            if (!id || !/^[0-9a-f]{64}$/.test(id.digest || "")) return null;
            var z = /^(?:z(?:3|4|5|8|blorb))$/.test(id.format || "");
            if (requireZMemory !== false && !mem) return null;
            if (mem) {
                if (!z || !id.header || typeof ZRamReader === "undefined") return null;
                var stable = [0,2,3,4,5,8,9,10,11,12,13,14,15,18,19,20,21,22,23,26,27];
                if (!stable.every(function (at) { return id.header[at] === ZRamReader.u8(mem, at); })) return null;
            } else if (requireZMemory !== false || !/^(?:ulx|gblorb)$/.test(id.format || "")) return null;
            return { identityKey: "sha256:" + id.digest, digest: id.digest };
        } catch (e) { return null; }
    }
    // Development format: exact executable keys only; no legacy import/migration.
    function readOwned(kind, id) {
        var gen = generators[kind], key = id && gen && gen({identityKey:id.identityKey});
        if (!key || !id || id.identityKey !== "sha256:" + id.digest || currentOwner().digest !== id.digest)
            return {status:"unavailable",value:null};
        return {status:"ready",value:read(key)};
    }

    function commit(snap) {
        var ls = storage();
        var r = readIndex();
        var index = r.ok ? r.index : null;
        if (index) {
            recover(index);
            // While this exact key's erase is unfinished, never write it or
            // clear its tombstone: the snapshot stays queued until it is done.
            if (pendingKeys(index).indexOf(snap.key) >= 0) return "pending";
            var tomb = index.tombstones[snap.key];
            var hyd = snap.hydratedRevision == null ? -1 : snap.hydratedRevision;
            var hydE = snap.hydratedEpoch == null ? 0 : snap.hydratedEpoch;
            if ((tomb && tomb.erasedAtIndexRevision > hyd) || epochOf(index, snap.key) > hydE) {
                // Erased after this store hydrated: never resurrect it. The
                // store starts fresh for that module.
                hydratedAt[snap.key] = index.revision;
                hydratedEpoch[snap.key] = epochOf(index, snap.key);
                if (typeof snap.reset === "function") { try { snap.reset(); } catch (e) {} }
                return "erased";
            }
        }
        if (!index) return writeValue(ls, snap.kind, snap.key, snap.value) ? "written-unindexed" : "quota-dropped";
        // Cross-tab writes are last-writer-wins in commit order. The index
        // is rewritten only when entry metadata changed; recovery above
        // already committed its own index changes.
        var e = index.entries[snap.key], meta = false;
        if (!e || e.kind !== snap.kind) {
            var ep = epochOf(index, snap.key);
            e = index.entries[snap.key] = { key: snap.key, kind: snap.kind, owners: [] };
            if (ep) e.eraseEpoch = ep; // never lowered or removed
            meta = true;
        }
        if (addOwner(e, snap.owner)) meta = true;
        if (index.tombstones[snap.key]) { delete index.tombstones[snap.key]; meta = true; }
        if (meta) {
            // codex #5692: owner registration is durable (read back) BEFORE the
            // value is written. A failed index write throws, so the value is
            // never written and the snapshot stays queued (dirty) and reported.
            writeIndex(index); indexWrites++;
            var back = readIndex();
            var be = back.ok && back.index.entries[snap.key];
            if (!be || !be.owners.some(function (o) { return sameOwner(o, snap.owner); }) && !be.ownersOverflow)
                throw new Error("owner registration not durable");
        }
        return writeValue(ls, snap.kind, snap.key, snap.value) ? "written" : "quota-dropped";
    }

    var seqNo = 0;
    var indexWrites = 0; // metadata index writes from commit (test control)
    var deferredCount = 0;
    var activeDrain = null;

    function reportOnce(err) {
        lastError = "Learned data could not be saved yet; it will retry.";
        if (!reported) { reported = true; try { console.warn("[LearningStores] lock unavailable:", err); } catch (e) {} }
        try { if (typeof $ !== "undefined") $("#pl-learning-erase-status").text(lastError); } catch (e2) {}
    }

    function drain() {
        if (draining) return activeDrain || Promise.resolve();
        if (!queue.length) return Promise.resolve();
        var l = locks();
        draining = true;
        var p;
        try {
            p = l.request(LOCK, function () {
                // FIFO per key. A key whose erase is still pending is deferred
                // (with every later snapshot of that key); other keys proceed.
                var kept = [], deferred = Object.create(null);
                try {
                    while (queue.length) {
                        var snap = queue[0];
                        if (deferred[snap.key]) { kept.push(queue.shift()); continue; }
                        var res = commit(snap); // a throw keeps the snapshot queued (dirty)
                        queue.shift();
                        if (res === "pending") { deferred[snap.key] = true; kept.push(snap); }
                    }
                } finally {
                    queue = kept.concat(queue);
                    deferredCount = kept.length;
                }
            });
        } catch (eSync) { p = Promise.reject(eSync); }
        activeDrain = Promise.resolve(p).then(function () { draining = false; lastError = null; reported = false; if (queue.length > deferredCount) return drain(); },
            function (err) { draining = false; reportOnce(err); });
        return activeDrain;
    }

    // Acknowledged application navigation barrier under the existing write lock.
    function flush(timeoutMs) {
        var timer;
        var work = Promise.resolve().then(function () { return drain(); }).then(function () {
            var error = quotaError || lastError || recoveryError;
            return {ok:queue.length===0 && !draining && !error,pending:queue.length,
                error:error || (queue.length ? "Learned data is still waiting to be saved." : null)};
        });
        return Promise.race([work,new Promise(function(resolve) {
            timer=setTimeout(function() { resolve({ok:false,pending:queue.length,error:"Saving learned data took too long. Please try again."}); },timeoutMs || 2000);
        })]).then(function(result) { clearTimeout(timer); return result; });
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
            try { if (!writeValue(ls, kind, key, value)) return null; } catch (e) { reportOnce(e); return null; }
            lastError = null; reported = false;
            try {
                var r = readIndex();
                if (r.ok) {
                    var e = r.index.entries[key];
                    var m = false;
                    if (!e || e.kind !== kind) { e = r.index.entries[key] = { key: key, kind: kind, owners: [] }; m = true; }
                    if (addOwner(e, owner)) m = true;
                    if (m) writeIndex(r.index);
                }
            } catch (e2) {}
            return Promise.resolve("written");
        }
        if (hydratedAt[key] == null) hydratedAt[key] = readIndex().index.revision;
        if (hydratedEpoch[key] == null) hydratedEpoch[key] = hydrateEpoch(readIndex().index, key);
        var snap = Object.freeze({
            key: key, kind: kind, owner: Object.freeze(owner), value: String(value),
            // Supersession is FIFO within this tab's queue only.
            hydratedRevision: hydratedAt[key], hydratedEpoch: hydratedEpoch[key], seq: ++seqNo, reset: reset
        });
        queue.push(snap);
        return drain();
    }

    // ---- installed-set and erase -------------------------------------------------
    var checked = Object.create(null); // path -> {digest, rev}, from check()
    function libRev() { try { return ModuleLibrary.libraryRevision ? ModuleLibrary.libraryRevision() : null; } catch (e) { return null; } }

    // R7: hash installed modules whose executable digest is unknown, from
    // their stored bytes, without touching the current-story identity. Any
    // failure or library change leaves them unknown (fail closed).
    function check() {
        var inst = installedSet();
        if (!inst || !ModuleLibrary.executableDigestForPath) return Promise.resolve(list());
        var rev = libRev();
        var chain = Promise.resolve(true);
        inst.missingPaths.forEach(function (p) {
            chain = chain.then(function (still) {
                if (!still) return false;
                return Promise.resolve().then(function () { return ModuleLibrary.executableDigestForPath(p); }).then(function (d) {
                    if (libRev() !== rev) return false;
                    if (typeof d === "string" && /^[0-9a-f]{64}$/.test(d)) checked[p] = { digest: d, rev: rev };
                    return true;
                }, function () { return libRev() === rev; });
            });
        });
        return chain.then(function () { return list(); });
    }

    function installedSet() {
        var paths = [], digests = [], unknown = 0, missingPaths = [];
        var mods = [];
        try { mods = ModuleLibrary.all(); } catch (e) { return null; }
        var ls = storage();
        mods.forEach(function (m) {
            var p = normPath(m.Path);
            paths.push(p);
            var d = null;
            try { d = ModuleLibrary.currentExecutableDigest(p) || null; } catch (e1) {}
            if (!d) { try { d = ls.getItem(ModuleLibrary.transcriptDigestKey(p)) || null; } catch (e2) {} }
            if (!d && checked[p] && checked[p].rev === libRev()) d = checked[p].digest;
            if (d) digests.push(d); else { unknown++; missingPaths.push(p); }
        });
        return { paths: paths, digests: digests, unknown: unknown, missingPaths: missingPaths };
    }

    function list() {
        var out = { ok: false, reason: "", candidates: [], removable: 0, installed: 0, unknown: 0, unmanaged: 0, bytes: 0, byModule: {}, revision: 0, signature: "" };
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
            if (value != null) {
                var b = (k.length + value.length) * 2;
                out.bytes += b;
                var newest = e.owners.reduce(function (a, o) { return !a || (o.lastWriteAt || 0) >= (a.lastWriteAt || 0) ? o : a; }, null);
                var mod = (newest && newest.path) || "(unknown story)";
                out.byModule[mod] = (out.byModule[mod] || 0) + b;
            }
            var digs = entryDigests(e);
            var installed = e.owners.some(function (o) {
                return inst.paths.indexOf(o.path) >= 0 || (cur.path && o.path === cur.path);
            }) || digs.some(function (d) { return inst.digests.indexOf(d) >= 0 || (cur.digest && d === cur.digest); });
            if (installed) { out.installed++; return; }
            if (r.index.pending && pendingKeys(r.index).indexOf(k) >= 0) return;
            if (e.ownersOverflow || e.pathOnlyDropped || inst.unknown > 0 || e.owners.some(function (o) { return !o.digest; })) { out.unknown++; return; }
            if (value == null) return;
            out.candidates.push({ key: k, value: value, kind: e.kind, inputs: e.owners[0].inputs });
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
            var pre = readIndex();
            if (pre.ok && pre.index.pending) {
                var rec;
                try { rec = recover(pre.index); } catch (eR) { rec = "retry"; }
                if (rec !== "done") return { aborted: true, reason: recoveryError || "An earlier erase is unfinished; nothing was erased.", removed: 0, failed: 0 };
            }
            var now = list();
            if (!now.ok || now.signature !== listing.signature || now.candidates.length !== listing.candidates.length ||
                now.candidates.some(function (c, i) { return c.key !== listing.candidates[i].key || c.value !== listing.candidates[i].value; })) {
                return { aborted: true, reason: "Your stories changed; the list was refreshed.", listing: now };
            }
            var ls = storage();
            var index = readIndex().index;
            var nextRev = index.revision + 1;
            var keys = listing.candidates.map(function (c) { return c.key; });
            // 1. Tombstones + pending set durable (read back) BEFORE any removal.
            keys.forEach(function (k) { index.tombstones[k] = { erasedAtIndexRevision: nextRev }; });
            index.pending = { revision: nextRev, records: listing.candidates.map(function (c) {
                return { key: c.key, kind: c.kind, inputs: JSON.parse(JSON.stringify(c.inputs)) };
            }) };
            var notRecorded = { aborted: true, reason: "The erase could not be recorded; nothing was erased.", removed: 0, failed: 0 };
            try { writeIndex(index); } catch (eW) { return notRecorded; }
            var back = readIndex();
            if (!back.ok || !back.index.pending || back.index.pending.revision !== nextRev ||
                JSON.stringify(pendingKeys(back.index)) !== JSON.stringify(keys)) return notRecorded;
            index = back.index;
            // 2. Remove each key, confirmed by read-back.
            var removed = 0, failed = 0;
            keys.forEach(function (k) {
                var gone = false;
                try { ls.removeItem(k); gone = ls.getItem(k) == null; } catch (e) { gone = false; }
                if (gone) { removed++; eraseEntry(index, k, nextRev); }
                else { failed++; delete index.tombstones[k]; } // still present: keep its entry
            });
            // 3. Finalize: revision written last.
            delete index.pending;
            index.revision = nextRev;
            try { writeIndex(index); } catch (eF) { return { aborted: false, removed: removed, failed: failed, indexWriteFailed: true }; }
            return { aborted: false, removed: removed, failed: failed };
        })).catch(function (err) { return { aborted: true, reason: "Could not get exclusive access; nothing was erased." }; });
    }

    function kb(bytes) { return Math.max(0, Math.round(bytes / 1024 * 10) / 10); }
    // P13b R2 soft note (not a cap): measured long walks hold 87-156 KB of
    // learned data per story, so 1 MB per story / 3 MB in total is several
    // times any measured title.
    var NOTE_MODULE_BYTES = 1024 * 1024, NOTE_TOTAL_BYTES = 3 * 1024 * 1024;
    function sizeNote(listing) {
        if (!listing || !listing.ok) return "";
        var big = Object.keys(listing.byModule || {}).filter(function (m) { return listing.byModule[m] > NOTE_MODULE_BYTES; });
        if (big.length) return " Note: learned data for " + big.map(function (m) { return String(m).split("/").pop(); }).join(", ") + " is over 1 MB.";
        if (listing.bytes > NOTE_TOTAL_BYTES) return " Note: learned data is over 3 MB in total.";
        return "";
    }
    function describe(listing, result) {
        if (!listing.ok) return listing.reason;
        var s = "Learned data: about " + kb(listing.bytes) + " KB (UTF-16 estimate). " +
            listing.removable + " erasable, " + listing.installed + " kept for installed stories, " +
            listing.unknown + " unknown, " + listing.unmanaged + " unmanaged." + sizeNote(listing);
        if (result) s = (result.aborted ? result.reason + " " : "Removed " + result.removed + ", failed " + result.failed + ". ") + s;
        return s;
    }

    // Options > Learned words row (WorkspaceUI).
    function addOptions(container) {
        if (typeof $ === "undefined") return;
        var row = $("<div class='pl-learning-erase'>").appendTo(container);
        var checkBtn = $("<button type='button'>").text("Check learned data for uninstalled stories").appendTo(row);
        var eraseBtn = $("<button type='button'>").text("Erase learned data for uninstalled stories").prop("disabled", true).appendTo(row);
        var status = $("<span id='pl-learning-erase-status' role='status'>").appendTo(row);
        var listing = null, needCheck = false;
        function show(l, result) {
            listing = l;
            eraseBtn.prop("disabled", needCheck || !l || !l.ok || l.removable === 0);
            var err = quotaError || lastError || recoveryError;
            status.text((err ? err + " " : "") + describe(l, result));
        }
        var first = list();
        var err0 = quotaError || lastError || recoveryError;
        status.text((err0 ? err0 + " " : "") + (first.ok ? "Check to find learned data from uninstalled stories. " + describe(first) : first.reason));
        checkBtn.prop("disabled", !first.ok);
        checkBtn.on("click", function () {
            checkBtn.prop("disabled", true); eraseBtn.prop("disabled", true);
            status.text("Checking your stories\u2026");
            check().then(function (l) { needCheck = false; checkBtn.prop("disabled", false); show(l); },
                function () { needCheck = false; checkBtn.prop("disabled", false); show(list()); });
        });
        eraseBtn.on("click", function () {
            if (!listing || !listing.ok || !listing.removable) return;
            if (!confirm("Erase learned data for " + listing.removable + " item(s) from stories that are no longer installed? Maps, saves and transcripts are kept.")) return;
            eraseBtn.prop("disabled", true);
            erase(listing).then(function (res) {
                // After any abort, Erase stays disabled until a fresh Check.
                if (res.aborted) { needCheck = true; res = { aborted: true, reason: "Saved learned data changed; check again." }; }
                show(res.listing || list(), res);
            });
        });
    }

    return {
        INDEX_KEY: INDEX_KEY, LOCK: LOCK,
        register: register, read: read, persist: persist, readIndex: readIndex, flush: flush,
        identity: identity, readOwned: readOwned,
        list: list, check: check, erase: erase, describe: describe, addOptions: addOptions,
        entryValid: entryValid, pending: function () { return queue.length; },
        lastError: function () { return quotaError || lastError || recoveryError; },
        QUOTA_MESSAGE: QUOTA_MESSAGE, sizeNote: sizeNote, MAX_OWNERS: MAX_OWNERS,
        _drain: drain, _indexWrites: function () { return indexWrites; }
    };
})();
