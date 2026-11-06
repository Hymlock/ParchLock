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
// Save-owned cumulative history: older saves select their playthrough without
// rewinding its death/win totals. Current VM readings remain StatTracker-owned.
var PlaythroughState = {
    PREFIX: "PL_Playthroughs_", INTENT: "PL_PlaythroughIntent_",
    MAX_RUNS: 2048, MAX_RECENT: 128, MAX_PENDING: 256,
    _ctx: null, _nonce: 0,
    path: function () {
        try {
            var path = typeof ParchLock !== "undefined" && ParchLock.StoryPath;
            if (!path && typeof window !== "undefined" && window.location) path = new URLSearchParams(window.location.search).get("story");
            if (!path && typeof ParchLock !== "undefined" && ParchLock.GameFilename) path = "games/" + String(ParchLock.GameFilename).replace(/^games\//, "");
            return String(path || "").replace(/\\/g, "/").replace(/^\.\//, "");
        } catch (e) { return ""; }
    },
    digest: function (path) {
        try {
            var id = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest ? ModuleLibrary.currentExecutableDigest(path) : null;
            if (!id && typeof Transcript !== "undefined" && Transcript.storyPath === path) id = Transcript.digest;
            return /^[a-f0-9]{64}$/.test(String(id || "")) ? id : null;
        } catch (e) { return null; }
    },
    validId: function (id) { return typeof id === "string" && /^p_[A-Za-z0-9_-]{8,94}$/.test(id); },
    count: function (n) { return Number.isSafeInteger(n) && n >= 0; },
    cleanMeta: function (m) {
        return m && PlaythroughState.validId(m.id) && PlaythroughState.count(m.deaths) && PlaythroughState.count(m.wins)
            ? { id: m.id, deaths: m.deaths, wins: m.wins } : null;
    },
    empty: function (id) { return { schema: 1, story: id, active: null, runs: Object.create(null) }; },
    cleanDoc: function (d, id) {
        if (!d || d.schema !== 1 || d.story !== id || !d.runs || typeof d.runs !== "object" || Array.isArray(d.runs)) return null;
        var keys = Object.keys(d.runs), out = PlaythroughState.empty(id);
        if (keys.length > PlaythroughState.MAX_RUNS) return null;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i], r = d.runs[key];
            if (!PlaythroughState.validId(key) || !r || !PlaythroughState.count(r.deaths) || !PlaythroughState.count(r.wins)
                || !Array.isArray(r.recent) || r.recent.length > PlaythroughState.MAX_RECENT
                || !r.recent.every(function (s) { return typeof s === "string" && s.length > 0 && s.length <= 256; })) return null;
            out.runs[key] = { deaths: r.deaths, wins: r.wins, recent: Array.from(new Set(r.recent)) };
        }
        if (d.active !== null && (!PlaythroughState.validId(d.active) || !Object.prototype.hasOwnProperty.call(out.runs, d.active))) return null;
        out.active = d.active;
        return out;
    },
    readDoc: function (id) {
        var raw = localStorage.getItem(PlaythroughState.PREFIX + id);
        if (!raw) return PlaythroughState.empty(id);
        var doc = PlaythroughState.cleanDoc(JSON.parse(raw), id);
        if (!doc) throw new Error("The stored playthrough history is invalid; it has not been overwritten.");
        return doc;
    },
    freshId: function (ctx) {
        var id, source;
        do {
            source = "";
            try {
                if (typeof crypto !== "undefined" && crypto.randomUUID) source = crypto.randomUUID();
                else if (typeof crypto !== "undefined" && crypto.getRandomValues) source = Array.from(crypto.getRandomValues(new Uint32Array(4))).map(function (n) { return n.toString(16); }).join("_");
            } catch (e) {}
            // Never draw from Math.random: the interpreter can use that stream.
            if (!source) source = Date.now().toString(36) + "_" + (++PlaythroughState._nonce).toString(36) + "_" + String(typeof performance !== "undefined" ? performance.timeOrigin || performance.now() : 0).replace(/[^0-9]/g, "");
            id = "p_" + source;
        } while (ctx && ctx.doc && Object.prototype.hasOwnProperty.call(ctx.doc.runs, id));
        return id;
    },
    report: function (ctx, message) {
        if (ctx && ctx.warned) return;
        if (ctx) ctx.warned = true;
        try { SaveState.report(message); } catch (e) {}
    },
    intentKey: function (path) { return PlaythroughState.INTENT + encodeURIComponent(path); },
    cleanCapture: function (capture) {
        if (!capture || typeof capture !== "object" || Array.isArray(capture) || Object.keys(capture).length > PlaythroughState.MAX_RUNS + 1) return null;
        var out = Object.create(null), keys = Object.keys(capture);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i], value = capture[key];
            if (key === "error") { if (typeof value !== "string" || value.length > 1024) return null; out.error = value; continue; }
            if (!/^[a-f0-9]{64}$/.test(key) || !value || ["missing", "invalid", "valid"].indexOf(value.state) < 0) return null;
            if (value.state === "valid") { var meta = PlaythroughState.cleanMeta(value.meta); if (!meta) return null; out[key] = { state: "valid", meta: meta }; }
            else out[key] = { state: value.state };
        }
        return out;
    },
    cleanSelection: function (selection, depth) {
        if (!selection || (depth || 0) > PlaythroughState.MAX_PENDING) return null;
        if (selection.resume === true) return { resume: true };
        var meta = PlaythroughState.cleanMeta(selection.meta);
        if (meta) return { meta: meta };
        var capture = PlaythroughState.cleanCapture(selection.capture), fallback = PlaythroughState.cleanSelection(selection.fallback, (depth || 0) + 1);
        return capture && fallback ? { capture: capture, fallback: fallback } : null;
    },
    logicalSelection: function (ctx) {
        var selected = ctx.doc && ctx.doc.active ? { meta: PlaythroughState.meta(ctx) } : { resume: true };
        var bindings = Object.create(null);
        Object.keys(ctx.sidecars).forEach(function (name) {
            var rec = ctx.sidecars[name], meta = rec && PlaythroughState.cleanMeta(rec.playthrough);
            bindings[name] = meta ? { selection: { meta: meta }, snapshot: rec } : null;
        });
        ctx.ops.forEach(function (op) {
            if (op.type === "select") selected = { meta: { id: op.id, deaths: 0, wins: 0 } };
            else if (op.type === "save") bindings[op.name] = { selection: JSON.parse(JSON.stringify(selected)), snapshot: op.snapshot };
            else if (op.type === "restore") selected = op.selection || { capture: op.capture, fallback: selected };
            else if (op.type === "forget") op.names.forEach(function (name) { bindings[name] = null; });
        });
        return { selection: selected, bindings: bindings };
    },
    resolveSelection: function (ctx, selection, depth) {
        if (!selection || (depth || 0) > PlaythroughState.MAX_PENDING) throw new Error("Invalid pending playthrough selection");
        if (selection.resume) {
            var r = PlaythroughState.run(ctx, ctx.initialId);
            return { id: ctx.initialId, deaths: r.deaths, wins: r.wins };
        }
        if (selection.meta) return selection.meta;
        var cap = selection.capture[ctx.digest] || { state: "missing" };
        if (cap.state === "valid") return cap.meta;
        if (cap.state === "invalid" || selection.capture.error) PlaythroughState.report(ctx, selection.capture.error || "The restored save has invalid playthrough metadata; its history was not guessed.");
        return PlaythroughState.resolveSelection(ctx, selection.fallback, (depth || 0) + 1);
    },
    readIntent: function (path) {
        try {
            var raw = sessionStorage.getItem(PlaythroughState.intentKey(path)), i = raw && JSON.parse(raw);
            if (!i || i.schema !== 1 || i.path !== path || !PlaythroughState.validId(i.nonce)) return null;
            if (i.kind === "select" && PlaythroughState.validId(i.runId)) return i;
            if (i.kind === "restore") {
                var selection = PlaythroughState.cleanSelection(i.selection, 0), capture = PlaythroughState.cleanCapture(i.capture);
                if (!selection || !capture || typeof i.name !== "string" || i.name.length > 255) return null;
                var snapshot = null;
                if (i.snapshot) {
                    var map = SaveState.cleanMap(i.snapshot.map), labels = i.snapshot.labels == null ? null : SaveState.cleanLabels(i.snapshot.labels);
                    if (!map || (i.snapshot.labels != null && !labels)) return null;
                    snapshot = { schema: 1, story: null, savedAt: String(i.snapshot.savedAt || ""), map: map, labels: labels };
                }
                return { schema: 1, path: path, kind: "restore", nonce: i.nonce, name: i.name, selection: selection, capture: capture, snapshot: snapshot };
            }
        } catch (e) {}
        return null;
    },
    writeIntent: function (ctx, intent) {
        try { sessionStorage.setItem(PlaythroughState.intentKey(ctx.path), JSON.stringify(intent)); ctx.intent = intent; return true; }
        catch (e) { PlaythroughState.report(ctx, "The playthrough selection could not be stored. Keep this page open and save again when storage is available."); return false; }
    },
    context: function () {
        var path = PlaythroughState.path();
        if (!path) return null;
        var provider = typeof ModuleLibrary !== "undefined" && typeof ModuleLibrary.currentExecutableDigest === "function";
        var boundTranscript = typeof Transcript !== "undefined" && Transcript.storyPath === path && /^[a-f0-9]{64}$/.test(String(Transcript.digest || ""));
        if (!provider && !boundTranscript) return null; // no possible exact-identity authority

        if (!PlaythroughState._ctx || PlaythroughState._ctx.path !== path) {
            var ctx = { path: path, generation: ++PlaythroughState._nonce, digest: null, doc: null, ops: [], sidecars: Object.create(null), dirty: false, blocked: false, retryBlocked: false, warned: false, intent: null };
            PlaythroughState._ctx = ctx;
            var intent = PlaythroughState.readIntent(path);
            if (intent) {
                ctx.intent = intent;
                ctx.ops.push(intent.kind === "select" ? { type: "select", id: intent.runId, nonce: intent.nonce }
                    : { type: "restore", name: intent.name, capture: intent.capture, selection: intent.selection, snapshot: intent.snapshot, nonce: intent.nonce, forceBinding: !!intent.snapshot });
            }
        }
        return PlaythroughState._ctx;
    },
    run: function (ctx, id) {
        id = id || ctx.doc.active;
        if (!id) id = PlaythroughState.freshId(ctx);
        if (!Object.prototype.hasOwnProperty.call(ctx.doc.runs, id)) {
            if (Object.keys(ctx.doc.runs).length >= PlaythroughState.MAX_RUNS) throw new Error("The playthrough history is full; no saved history was deleted.");
            ctx.doc.runs[id] = { deaths: 0, wins: 0, recent: [] };
            ctx.dirty = true;
        }
        ctx.doc.active = id;
        return ctx.doc.runs[id];
    },
    meta: function (ctx) {
        var r = PlaythroughState.run(ctx);
        return { id: ctx.doc.active, deaths: r.deaths, wins: r.wins };
    },
    merge: function (ctx, meta) {
        var active = ctx.doc.active, r = PlaythroughState.run(ctx, meta.id);
        r.deaths = Math.max(r.deaths, meta.deaths); r.wins = Math.max(r.wins, meta.wins);
        ctx.doc.active = active; ctx.dirty = true;
    },
    captureRestore: function (name, ctx) {
        var capture = Object.create(null), id = PlaythroughState.digest(ctx.path);
        function add(story, raw) {
            try {
                var rec = raw && JSON.parse(raw);
                if (!rec || rec.schema !== 1 || rec.story !== story) { capture[story] = { state: raw ? "invalid" : "missing" }; return; }
                var m = PlaythroughState.cleanMeta(rec.playthrough);
                capture[story] = m ? { state: "valid", meta: m } : { state: rec.playthrough == null ? "missing" : "invalid" };
            } catch (e) { capture[story] = { state: "invalid" }; }
        }
        if (!name) return capture;
        try {
            if (id) add(id, localStorage.getItem(SaveState.keyFor(id, name)));
            else {
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (!key || key.indexOf(SaveState.PREFIX) !== 0) continue;
                    var rest = key.slice(SaveState.PREFIX.length), story = rest.slice(0, 64);
                    if (/^[a-f0-9]{64}$/.test(story) && key === SaveState.keyFor(story, name)) add(story, localStorage.getItem(key));
                    if (Object.keys(capture).length > PlaythroughState.MAX_RUNS) throw new Error("Too many restore metadata candidates");
                }
            }
        } catch (e) { capture.error = "The restored save's playthrough metadata could not be read."; }
        return capture;
    },
    selectIntent: function (ctx, id, nonce) {
        var i = { schema: 1, path: ctx.path, kind: "select", runId: id, nonce: nonce || PlaythroughState.freshId(ctx) };
        var prior = PlaythroughState.readIntent(ctx.path);
        ctx.selection = { id: id, nonce: i.nonce, supersedes: prior && prior.nonce };
        PlaythroughState.writeIntent(ctx, i);
    },
    apply: function (ctx, op) {
        if (op.type === "select") {
            PlaythroughState.run(ctx, op.id); ctx.dirty = true;
            PlaythroughState.selectIntent(ctx, op.id, op.nonce);
        } else if (op.type === "ending") {
            var r = PlaythroughState.run(ctx), field = op.kind === "death" ? "deaths" : "wins";
            if (r.recent.indexOf(op.key) >= 0) return;
            if (r[field] < Number.MAX_SAFE_INTEGER) r[field]++;
            else PlaythroughState.report(ctx, "The playthrough counter has reached its safe limit and cannot increase further.");
            r.recent.push(op.key); r.recent = r.recent.slice(-PlaythroughState.MAX_RECENT); ctx.dirty = true;
        } else if (op.type === "save") {
            var rec = op.snapshot;
            rec.story = ctx.digest; rec.playthrough = PlaythroughState.meta(ctx);
            ctx.sidecars[op.name] = rec;
        } else if (op.type === "restore") {
            var captured = op.capture[ctx.digest] || { state: "missing" };
            // An earlier queued SAVE/forget takes precedence over old disk state.
            if (op.name && Object.prototype.hasOwnProperty.call(ctx.sidecars, op.name)) {
                var prior = ctx.sidecars[op.name], ownMeta = prior && PlaythroughState.cleanMeta(prior.playthrough);
                captured = ownMeta ? { state: "valid", meta: ownMeta } : { state: "missing" };
            }
            if (op.selection) {
                var chosen = PlaythroughState.resolveSelection(ctx, op.selection, 0);
                PlaythroughState.merge(ctx, chosen); PlaythroughState.run(ctx, chosen.id);
            } else if (captured.state === "valid") {
                PlaythroughState.merge(ctx, captured.meta); PlaythroughState.run(ctx, captured.meta.id);
            } else PlaythroughState.run(ctx);
            ctx.dirty = true;
            if (op.capture.error || captured.state === "invalid") PlaythroughState.report(ctx, op.capture.error || "The restored save has invalid playthrough metadata. Its history has not been guessed or overwritten.");
            if (op.name && op.forceBinding && op.snapshot) {
                var restoredSave = JSON.parse(JSON.stringify(op.snapshot));
                restoredSave.story = ctx.digest; restoredSave.playthrough = PlaythroughState.meta(ctx);
                ctx.sidecars[op.name] = restoredSave;
            } else if (op.name && !op.noAttach && captured.state === "missing" && !op.capture.error) {
                var base = SaveState.read(ctx.digest, op.name);
                ctx.sidecars[op.name] = { schema: 1, story: ctx.digest, savedAt: "", map: base ? base.map : [], labels: base ? base.labels : null, playthrough: PlaythroughState.meta(ctx) };
            }
            PlaythroughState.selectIntent(ctx, ctx.doc.active, op.nonce);
        } else if (op.type === "forget") op.names.forEach(function (name) { ctx.sidecars[name] = null; });
    },
    flush: function (ctx) {
        if (!ctx || !ctx.digest || ctx.retryBlocked) return;
        var failed = false;
        if (ctx.dirty && !ctx.blocked) {
            try {
                localStorage.setItem(PlaythroughState.PREFIX + ctx.digest, JSON.stringify(ctx.doc)); ctx.dirty = false;
                var current = PlaythroughState.readIntent(ctx.path);
                if (current && ctx.selection && ctx.selection.id === ctx.doc.active
                    && (current.nonce === ctx.selection.nonce || current.nonce === ctx.selection.supersedes)) {
                    try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); ctx.intent = null; } catch (eIntent) {}
                }
            } catch (e) { failed = true; PlaythroughState.report(ctx, "The death and win history could not be stored. The current page keeps its count; keep it open and save again when storage is available."); }
        }
        Object.keys(ctx.sidecars).forEach(function (name) {
            var rec = ctx.sidecars[name], key = SaveState.keyFor(ctx.digest, name);
            try {
                if (rec === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(rec));
                delete ctx.sidecars[name];
            } catch (e) {
                failed = true;
                try { localStorage.removeItem(key); } catch (eRemove) {}
                PlaythroughState.report(ctx, "The save was written, but its map, labels and playthrough link could not be stored. An older link was removed; keep this page open and save again.");
            }
        });
        ctx.retryBlocked = failed || ctx.blocked;
        if (!ctx.retryBlocked) ctx.warned = false;
    },
    ready: function (flush) {
        var ctx = PlaythroughState.context(); if (!ctx) return null;
        var id = PlaythroughState.digest(ctx.path);
        if (!id) {
            if (!ctx.waitingIdentity && typeof ModuleLibrary !== "undefined" && ModuleLibrary.whenExecutableIdentityReady) {
                ctx.waitingIdentity = true;
                var path = ctx.path, generation = ctx.generation;
                Promise.resolve(ModuleLibrary.whenExecutableIdentityReady(path)).then(function () {
                    ctx.waitingIdentity = false;
                    if (PlaythroughState._ctx === ctx && ctx.generation === generation && PlaythroughState.path() === path
                        && PlaythroughState.digest(path)) {
                        var ready = PlaythroughState.ready();
                        if (ready && typeof StatTracker !== "undefined" && StatTracker.syncPlaythrough) StatTracker.syncPlaythrough();
                    }
                }, function () { ctx.waitingIdentity = false; });
            }
            return null;
        }
        if (ctx.digest && ctx.digest !== id) { PlaythroughState._ctx = null; return PlaythroughState.ready(flush); }
        if (!ctx.digest) {
            ctx.digest = id;
            try { ctx.doc = PlaythroughState.readDoc(id); }
            catch (e) { ctx.doc = PlaythroughState.empty(id); ctx.blocked = true; PlaythroughState.report(ctx, e.message); }
            if (!ctx.doc.active) PlaythroughState.run(ctx);
            ctx.initialId = ctx.doc.active;
        }
        try {
            while (ctx.ops.length) PlaythroughState.apply(ctx, ctx.ops.shift());
            if (!ctx.doc.active) { PlaythroughState.run(ctx); ctx.dirty = true; }
        } catch (e) { ctx.blocked = true; PlaythroughState.report(ctx, e.message); }
        if (flush !== false) PlaythroughState.flush(ctx);
        return ctx;
    },
    enqueue: function (op) {
        var ctx = PlaythroughState.context(); if (!ctx) return null;
        if (ctx.ops.length >= PlaythroughState.MAX_PENDING) { PlaythroughState.report(ctx, "The story identity is not ready and playthrough events could not be stored. Keep this page open."); return null; }
        ctx.retryBlocked = false;
        if (ctx.digest && ctx.doc && !ctx.blocked) {
            try { ctx.doc = PlaythroughState.peek(ctx.digest); }
            catch (eRefresh) { ctx.blocked = true; PlaythroughState.report(ctx, eRefresh.message); }
        }
        ctx.ops.push(op);
        return PlaythroughState.ready();
    },
    totals: function () { var ctx = PlaythroughState.ready(); if (!ctx) return null; var r = PlaythroughState.run(ctx); return { deaths: r.deaths, wins: r.wins }; },
    ending: function (kind, key) {
        if ((kind !== "death" && kind !== "win") || typeof key !== "string" || !key || key.length > 256) return null;
        var ctx = PlaythroughState.enqueue({ type: "ending", kind: kind, key: key });
        if (!ctx) return null; var r = PlaythroughState.run(ctx); return { deaths: r.deaths, wins: r.wins };
    },
    start: function () {
        var ctx = PlaythroughState.context(); if (!ctx) return false;
        var id = PlaythroughState.freshId(ctx), nonce = PlaythroughState.freshId(ctx);
        PlaythroughState.selectIntent(ctx, id, nonce);
        PlaythroughState.enqueue({ type: "select", id: id, nonce: nonce }); return true;
    },
    prepare: function () {
        var ctx = PlaythroughState.context(); if (!ctx) return false;
        var prior = PlaythroughState.readIntent(ctx.path);
        if (ctx.prepared && prior && prior.nonce === ctx.prepared) return ctx.prepared;
        var i = { schema: 1, path: ctx.path, kind: "select", runId: PlaythroughState.freshId(ctx), nonce: PlaythroughState.freshId(ctx) };
        if (!PlaythroughState.writeIntent(ctx, i)) return false;
        ctx.prepared = i.nonce; return i.nonce;
    },
    cancel: function (nonce) {
        var ctx = PlaythroughState.context(); if (!ctx) return;
        var i = PlaythroughState.readIntent(ctx.path);
        if (i && i.nonce === nonce) { try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); } catch (e) {} ctx.intent = null; ctx.prepared = null; }
    },
    restored: function (name) {
        var ctx = PlaythroughState.context(); if (!ctx) return;
        var cap = PlaythroughState.captureRestore(name, ctx), nonce = PlaythroughState.freshId(ctx), logical = PlaythroughState.logicalSelection(ctx);
        var own = name && Object.prototype.hasOwnProperty.call(logical.bindings, name) ? logical.bindings[name] : undefined;
        var selection = own ? own.selection : own === null ? logical.selection : { capture: cap, fallback: logical.selection };
        var snapshot = own && own.snapshot ? JSON.parse(JSON.stringify(own.snapshot)) : null;
        PlaythroughState.writeIntent(ctx, { schema: 1, path: ctx.path, kind: "restore", name: name, capture: cap, selection: selection, snapshot: snapshot, nonce: nonce });
        PlaythroughState.enqueue({ type: "restore", name: name, capture: cap, selection: selection, snapshot: snapshot, forceBinding: !!snapshot, nonce: nonce });
    },
    snapshot: function (id, name, snapshot) {
        var exact = PlaythroughState.digest(PlaythroughState.path());
        if (exact || !id || /^[a-f0-9]{64}$/.test(String(id || ""))) { PlaythroughState.enqueue({ type: "save", name: name, snapshot: snapshot }); return true; }
        return false; // legacy test environments without executable identity keep map-only behavior
    },
    peek: function (id) {
        var ctx = PlaythroughState._ctx, disk = PlaythroughState.readDoc(id);
        if (ctx && ctx.digest === id && ctx.doc) {
            Object.keys(ctx.doc.runs).forEach(function (key) {
                var local = ctx.doc.runs[key], old = disk.runs[key];
                disk.runs[key] = old ? { deaths: Math.max(local.deaths, old.deaths), wins: Math.max(local.wins, old.wins), recent: Array.from(new Set(old.recent.concat(local.recent))).slice(-PlaythroughState.MAX_RECENT) } : JSON.parse(JSON.stringify(local));
            });
            disk.active = ctx.doc.active;
        }
        return disk;
    }
};

var SaveState = {
    PREFIX: "PL_SaveState_",
    ARCHIVE_KEEP: 3,
    _pending: null,

    outcomes: function () { return PlaythroughState.totals(); },
    recordOutcome: function (kind, key) { return PlaythroughState.ending(kind, key); },
    startPlaythrough: function () { return PlaythroughState.start(); },
    prepareNewGame: function () { return PlaythroughState.prepare(); },
    cancelNewGameIntent: function (nonce) { PlaythroughState.cancel(nonce); },
    importReady: function () {
        var ctx = PlaythroughState.context();
        return !!(ctx && PlaythroughState.digest(ctx.path) && ctx.ops.length === 0);
    },
    afterImport: function () {
        var ctx = PlaythroughState._ctx;
        if (!ctx || !ctx.digest) return;
        try {
            ctx.doc = PlaythroughState.peek(ctx.digest);
            if (typeof StatTracker !== "undefined" && StatTracker.syncPlaythrough) StatTracker.syncPlaythrough();
        } catch (e) { PlaythroughState.report(ctx, e.message); }
    },

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
            return { map: map, labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null,
                playthrough: PlaythroughState.cleanMeta(rec.playthrough) };
        } catch (e) { return null; }
    },

    // ---- lifecycle (called from Transcript.js) ----------------------------
    onLifecycle: function (kind, info) {
        try {
            var id = SaveState.storyId();
            if (kind === "save") { SaveState.snapshot(id, String(info && info.name || "")); return; }
            if (kind === "restore") PlaythroughState.restored(String(info && info.name || ""));
            else if (kind === "restart" || kind === "new-game") PlaythroughState.start();
            else if (kind === "forget") PlaythroughState.enqueue({ type: "forget", names: (info && info.names || []).slice() });
            else PlaythroughState.ready();
            if (!id) return;
            if (kind === "restore") SaveState._pending = { kind: "restore", story: id, snapshot: SaveState.read(id, String(info && info.name || "")) };
            else if (kind === "restart") SaveState._pending = { kind: "newGame", story: id, archived: SaveState.archiveWorkingMap("restart") };
            else if (kind === "boot") SaveState.freshBoot(id);
            else if (kind === "forget") (info && info.names || []).forEach(function (n) { try { localStorage.removeItem(SaveState.keyFor(id, n)); } catch (e) {} });
        } catch (e) {}
    },

    snapshot: function (id, name) {
        if (!name) return;
        var labels = null;
        try { if (typeof Actionable !== "undefined" && Actionable.labelSnapshot) labels = SaveState.cleanLabels(Actionable.labelSnapshot()); } catch (e) {}
        var rooms = typeof ParchLockMap !== "undefined" ? ParchLockMap.Rooms || [] : [];
        var rec = { schema: 1, story: id, savedAt: new Date().toISOString(), map: JSON.parse(JSON.stringify(rooms)), labels: labels };
        if (PlaythroughState.snapshot(id, name, rec)) return;
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
            try {
                var raw = localStorage.getItem(SaveState.keyFor(id, n));
                if (raw) {
                    var rec = JSON.parse(raw), meta = PlaythroughState.cleanMeta(rec.playthrough);
                    if (meta) {
                        var latest = null;
                        try { var doc = PlaythroughState.peek(id); latest = doc.runs[meta.id]; }
                        catch (eLedger) {
                            var memory = PlaythroughState._ctx;
                            if (memory && memory.digest === id && memory.doc) latest = memory.doc.runs[meta.id];
                            PlaythroughState.report(memory, "Stored playthrough history could not be read for export. Available validated save and current-page counts were kept.");
                        }
                        if (latest) rec.playthrough = { id: meta.id, deaths: Math.max(meta.deaths, latest.deaths), wins: Math.max(meta.wins, latest.wins) };
                    }
                    out[n] = rec;
                }
            } catch (e) {}
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
                && (rec.labels == null || !!SaveState.cleanLabels(rec.labels))
                && (rec.playthrough == null || !!PlaythroughState.cleanMeta(rec.playthrough));
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
        var saves = (block && block.saves) || {}, ledger = null, ledgerChanged = false;
        (Array.from(new Set(importedNames || []))).forEach(function (n) {
            var rec = Object.prototype.hasOwnProperty.call(saves, n) ? saves[n] : null;
            if (!rec) { out.push({ Key: SaveState.keyFor(id, n), Data: null }); return; }
            var clean = { schema: 1, story: id, savedAt: String(rec.savedAt || ""), map: SaveState.cleanMap(rec.map), labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null };
            var meta = PlaythroughState.cleanMeta(rec.playthrough);
            if (meta) {
                if (!ledger) ledger = PlaythroughState.peek(id);
                var run = ledger.runs[meta.id];
                ledger.runs[meta.id] = run ? { deaths: Math.max(run.deaths, meta.deaths), wins: Math.max(run.wins, meta.wins), recent: run.recent.slice() }
                    : { deaths: meta.deaths, wins: meta.wins, recent: [] };
                clean.playthrough = { id: meta.id, deaths: ledger.runs[meta.id].deaths, wins: ledger.runs[meta.id].wins };
                ledgerChanged = true;
            }
            out.push({ Key: SaveState.keyFor(id, n), Data: JSON.stringify(clean) });
        });
        if (ledgerChanged) {
            if (!PlaythroughState.cleanDoc(ledger, id)) throw new Error("Invalid imported playthrough history");
            out.unshift({ Key: PlaythroughState.PREFIX + id, Data: JSON.stringify(ledger) });
        }
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
            localStorage.removeItem(PlaythroughState.PREFIX + storyId);
            var ctx = PlaythroughState._ctx;
            if (ctx && ctx.digest === storyId) {
                try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); } catch (eIntent) {}
                PlaythroughState._ctx = null;
            }
        } catch (e) {}
    },

    report: function (text) {
        try { if (typeof Message !== "undefined" && Message.Show) Message.Show("Save data", "<p>" + text + "</p>", true); } catch (e) {}
    }
};

if (typeof module !== "undefined" && module.exports) module.exports = SaveState;
