from pathlib import Path
p=Path('js/SaveState.js');s=p.read_text(encoding='utf-8')
def sub(a,b):
 global s
 assert s.count(a)==1,(a[:90],s.count(a));s=s.replace(a,b,1)
sub('''    readIntent: function (path) {''','''    cleanCapture: function (capture) {
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
    readIntent: function (path) {''')
sub('''            if (i.kind === "restore" && i.capture && typeof i.capture === "object" && (i.fallback === null || PlaythroughState.validId(i.fallback))) return i;''','''            if (i.kind === "restore") {
                var selection = PlaythroughState.cleanSelection(i.selection, 0), capture = PlaythroughState.cleanCapture(i.capture);
                if (!selection || !capture || typeof i.name !== "string" || i.name.length > 255) return null;
                var snapshot = null;
                if (i.snapshot) {
                    var map = SaveState.cleanMap(i.snapshot.map), labels = i.snapshot.labels == null ? null : SaveState.cleanLabels(i.snapshot.labels);
                    if (!map || (i.snapshot.labels != null && !labels)) return null;
                    snapshot = { schema: 1, story: null, savedAt: String(i.snapshot.savedAt || ""), map: map, labels: labels };
                }
                return { schema: 1, path: path, kind: "restore", nonce: i.nonce, name: i.name, selection: selection, capture: capture, snapshot: snapshot };
            }''')
sub('''                    : { type: "restore", name: "", capture: intent.capture, fallback: intent.fallback, nonce: intent.nonce, noAttach: true });''','''                    : { type: "restore", name: intent.name, capture: intent.capture, selection: intent.selection, snapshot: intent.snapshot, nonce: intent.nonce, forceBinding: !!intent.snapshot });''')
sub('''            if (captured.state === "valid") {
                PlaythroughState.merge(ctx, captured.meta); PlaythroughState.run(ctx, captured.meta.id);
            } else if (op.fallback) PlaythroughState.run(ctx, op.fallback);
            else PlaythroughState.run(ctx);''','''            if (op.selection) {
                var chosen = PlaythroughState.resolveSelection(ctx, op.selection, 0);
                PlaythroughState.merge(ctx, chosen); PlaythroughState.run(ctx, chosen.id);
            } else if (captured.state === "valid") {
                PlaythroughState.merge(ctx, captured.meta); PlaythroughState.run(ctx, captured.meta.id);
            } else PlaythroughState.run(ctx);''')
sub('''            if (op.name && !op.noAttach && captured.state === "missing" && !op.capture.error) {
                var base = SaveState.read(ctx.digest, op.name);
                ctx.sidecars[op.name] = { schema: 1, story: ctx.digest, savedAt: "", map: base ? base.map : [], labels: base ? base.labels : null, playthrough: PlaythroughState.meta(ctx) };
            }''','''            if (op.name && op.forceBinding && op.snapshot) {
                var restoredSave = JSON.parse(JSON.stringify(op.snapshot));
                restoredSave.story = ctx.digest; restoredSave.playthrough = PlaythroughState.meta(ctx);
                ctx.sidecars[op.name] = restoredSave;
            } else if (op.name && !op.noAttach && captured.state === "missing" && !op.capture.error) {
                var base = SaveState.read(ctx.digest, op.name);
                ctx.sidecars[op.name] = { schema: 1, story: ctx.digest, savedAt: "", map: base ? base.map : [], labels: base ? base.labels : null, playthrough: PlaythroughState.meta(ctx) };
            }''')
sub('''            try { ctx.doc = PlaythroughState.readDoc(id); }
            catch (e) { ctx.doc = PlaythroughState.empty(id); ctx.blocked = true; PlaythroughState.report(ctx, e.message); }
        }''','''            try { ctx.doc = PlaythroughState.readDoc(id); }
            catch (e) { ctx.doc = PlaythroughState.empty(id); ctx.blocked = true; PlaythroughState.report(ctx, e.message); }
            if (!ctx.doc.active) PlaythroughState.run(ctx);
            ctx.initialId = ctx.doc.active;
        }''')
start=s.index('    restored: function (name) {');end=s.index('    snapshot: function (id, name, snapshot)',start)
s=s[:start]+'''    restored: function (name) {
        var ctx = PlaythroughState.context(); if (!ctx) return;
        var cap = PlaythroughState.captureRestore(name, ctx), nonce = PlaythroughState.freshId(ctx), logical = PlaythroughState.logicalSelection(ctx);
        var own = name && Object.prototype.hasOwnProperty.call(logical.bindings, name) ? logical.bindings[name] : undefined;
        var selection = own ? own.selection : own === null ? logical.selection : { capture: cap, fallback: logical.selection };
        var snapshot = own && own.snapshot ? JSON.parse(JSON.stringify(own.snapshot)) : null;
        PlaythroughState.writeIntent(ctx, { schema: 1, path: ctx.path, kind: "restore", name: name, capture: cap, selection: selection, snapshot: snapshot, nonce: nonce });
        PlaythroughState.enqueue({ type: "restore", name: name, capture: cap, selection: selection, snapshot: snapshot, forceBinding: !!snapshot, nonce: nonce });
    },
'''+s[end:]
# Preserve selected valid metadata when enrichment cannot read the ledger.
sub('''                        var doc = PlaythroughState.peek(id), latest = doc.runs[meta.id];
                        if (latest) rec.playthrough = { id: meta.id, deaths: Math.max(meta.deaths, latest.deaths), wins: Math.max(meta.wins, latest.wins) };''','''                        var latest = null;
                        try { var doc = PlaythroughState.peek(id); latest = doc.runs[meta.id]; }
                        catch (eLedger) {
                            var memory = PlaythroughState._ctx;
                            if (memory && memory.digest === id && memory.doc) latest = memory.doc.runs[meta.id];
                            PlaythroughState.report(memory, "Stored playthrough history could not be read for export. Available validated save and current-page counts were kept.");
                        }
                        if (latest) rec.playthrough = { id: meta.id, deaths: Math.max(meta.deaths, latest.deaths), wins: Math.max(meta.wins, latest.wins) };''')
p.write_text(s,encoding='utf-8')
