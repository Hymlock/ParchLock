from pathlib import Path
p=Path('js/SaveState.js');s=p.read_text(encoding='utf-8')
def sub(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
sub('PlaythroughState.validId(i.fallback)) return i;', '(i.fallback === null || PlaythroughState.validId(i.fallback))) return i;')
sub('''        PlaythroughState.writeIntent(ctx, i);
    },
    apply:''','''        var prior = PlaythroughState.readIntent(ctx.path);
        ctx.selection = { id: id, nonce: i.nonce, supersedes: prior && prior.nonce };
        PlaythroughState.writeIntent(ctx, i);
    },
    apply:''')
sub('''current && ctx.intent && current.nonce === ctx.intent.nonce && current.kind === "select" && current.runId === ctx.doc.active''','''current && ctx.selection && ctx.selection.id === ctx.doc.active
                    && (current.nonce === ctx.selection.nonce || current.nonce === ctx.selection.supersedes)''')
sub('''        fallback = fallback || PlaythroughState.freshId(ctx);''','''        fallback = fallback || null;''')
sub('''        if (!exact && /^[a-f0-9]{64}$/.test(String(id || ""))) return false;
        if (exact || !id)''','''        if (exact || !id || /^[a-f0-9]{64}$/.test(String(id || "")))''')
sub('''        var id = PlaythroughState.digest(ctx.path); if (!id) return null;''','''        var id = PlaythroughState.digest(ctx.path);
        if (!id) {
            if (!ctx.waitingIdentity && typeof ModuleLibrary !== "undefined" && ModuleLibrary.whenExecutableIdentityReady) {
                ctx.waitingIdentity = true;
                var path = ctx.path, generation = ctx.generation;
                Promise.resolve(ModuleLibrary.whenExecutableIdentityReady(path)).then(function () {
                    ctx.waitingIdentity = false;
                    if (PlaythroughState._ctx === ctx && ctx.generation === generation && PlaythroughState.path() === path) {
                        var ready = PlaythroughState.ready();
                        if (ready && typeof StatTracker !== "undefined" && StatTracker.syncPlaythrough) StatTracker.syncPlaythrough();
                    }
                }, function () { ctx.waitingIdentity = false; });
            }
            return null;
        }''')
sub('''        ctx.retryBlocked = false; ctx.ops.push(op);''','''        ctx.retryBlocked = false;
        if (ctx.digest && ctx.doc && !ctx.blocked) {
            try { ctx.doc = PlaythroughState.peek(ctx.digest); }
            catch (eRefresh) { ctx.blocked = true; PlaythroughState.report(ctx, eRefresh.message); }
        }
        ctx.ops.push(op);''')
sub('''    // The exact executable digest, the same identity the transcript uses:''','''    outcomes: function () { return PlaythroughState.totals(); },
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

    // The exact executable digest, the same identity the transcript uses:''')
sub('''            if (!id) return;
            if (kind === "save") SaveState.snapshot(id, String(info && info.name || ""));
            else if (kind === "restore") SaveState._pending = { kind: "restore", story: id, snapshot: SaveState.read(id, String(info && info.name || "")) };
            else if (kind === "restart") SaveState._pending = { kind: "newGame", story: id, archived: SaveState.archiveWorkingMap("restart") };
            else if (kind === "boot") SaveState.freshBoot(id);
            else if (kind === "forget") (info && info.names || []).forEach(function (n) { try { localStorage.removeItem(SaveState.keyFor(id, n)); } catch (e) {} });''','''            if (kind === "save") { SaveState.snapshot(id, String(info && info.name || "")); return; }
            if (kind === "restore") PlaythroughState.restored(String(info && info.name || ""));
            else if (kind === "restart" || kind === "new-game") PlaythroughState.start();
            else if (kind === "forget") PlaythroughState.enqueue({ type: "forget", names: (info && info.names || []).slice() });
            else PlaythroughState.ready();
            if (!id) return;
            if (kind === "restore") SaveState._pending = { kind: "restore", story: id, snapshot: SaveState.read(id, String(info && info.name || "")) };
            else if (kind === "restart") SaveState._pending = { kind: "newGame", story: id, archived: SaveState.archiveWorkingMap("restart") };
            else if (kind === "boot") SaveState.freshBoot(id);
            else if (kind === "forget") (info && info.names || []).forEach(function (n) { try { localStorage.removeItem(SaveState.keyFor(id, n)); } catch (e) {} });''')
sub('''        if (!name || typeof ParchLockMap === "undefined") return;
        var labels = null;''','''        if (!name) return;
        var labels = null;''')
sub('''        var rec = { schema: 1, story: id, savedAt: new Date().toISOString(), map: ParchLockMap.Rooms || [], labels: labels };
        try {''','''        var rooms = typeof ParchLockMap !== "undefined" ? ParchLockMap.Rooms || [] : [];
        var rec = { schema: 1, story: id, savedAt: new Date().toISOString(), map: JSON.parse(JSON.stringify(rooms)), labels: labels };
        if (PlaythroughState.snapshot(id, name, rec)) return;
        try {''')
sub('''            return { map: map, labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null };''','''            return { map: map, labels: rec.labels ? SaveState.cleanLabels(rec.labels) : null,
                playthrough: PlaythroughState.cleanMeta(rec.playthrough) };''')
# Latest totals enrich selected snapshots; no selection mutation during export.
sub('''            try { var raw = localStorage.getItem(SaveState.keyFor(id, n)); if (raw) out[n] = JSON.parse(raw); } catch (e) {}''','''            try {
                var raw = localStorage.getItem(SaveState.keyFor(id, n));
                if (raw) {
                    var rec = JSON.parse(raw), meta = PlaythroughState.cleanMeta(rec.playthrough);
                    if (meta) {
                        var doc = PlaythroughState.peek(id), latest = doc.runs[meta.id];
                        if (latest) rec.playthrough = { id: meta.id, deaths: Math.max(meta.deaths, latest.deaths), wins: Math.max(meta.wins, latest.wins) };
                    }
                    out[n] = rec;
                }
            } catch (e) {}''')
sub('''                && (rec.labels == null || !!SaveState.cleanLabels(rec.labels));''','''                && (rec.labels == null || !!SaveState.cleanLabels(rec.labels))
                && (rec.playthrough == null || !!PlaythroughState.cleanMeta(rec.playthrough));''')
sub('''        var saves = (block && block.saves) || {};
        (importedNames || []).forEach(function (n) {''','''        var saves = (block && block.saves) || {}, ledger = null, ledgerChanged = false;
        (Array.from(new Set(importedNames || []))).forEach(function (n) {''')
sub('''            out.push({ Key: SaveState.keyFor(id, n), Data: JSON.stringify(clean) });''','''            var meta = PlaythroughState.cleanMeta(rec.playthrough);
            if (meta) {
                if (!ledger) ledger = PlaythroughState.peek(id);
                var run = ledger.runs[meta.id];
                ledger.runs[meta.id] = run ? { deaths: Math.max(run.deaths, meta.deaths), wins: Math.max(run.wins, meta.wins), recent: run.recent.slice() }
                    : { deaths: meta.deaths, wins: meta.wins, recent: [] };
                clean.playthrough = { id: meta.id, deaths: ledger.runs[meta.id].deaths, wins: ledger.runs[meta.id].wins };
                ledgerChanged = true;
            }
            out.push({ Key: SaveState.keyFor(id, n), Data: JSON.stringify(clean) });''')
sub('''        return out;
    },

    // Uninstalling a module''','''        if (ledgerChanged) {
            if (!PlaythroughState.cleanDoc(ledger, id)) throw new Error("Invalid imported playthrough history");
            out.unshift({ Key: PlaythroughState.PREFIX + id, Data: JSON.stringify(ledger) });
        }
        return out;
    },

    // Uninstalling a module''')
sub('''            doomed.forEach(function (k) { localStorage.removeItem(k); });''','''            doomed.forEach(function (k) { localStorage.removeItem(k); });
            localStorage.removeItem(PlaythroughState.PREFIX + storyId);
            var ctx = PlaythroughState._ctx;
            if (ctx && ctx.digest === storyId) {
                try { sessionStorage.removeItem(PlaythroughState.intentKey(ctx.path)); } catch (eIntent) {}
                PlaythroughState._ctx = null;
            }''')
p.write_text(s,encoding='utf-8')
