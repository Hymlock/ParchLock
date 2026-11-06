// P13b R2 harness: learning-store caps and compaction, the durable digests
// index (incl. legacy ownersOverflow migration), quota hooks with
// stop-requeue, the 64 custom-slice limit and the learned-data size note.
// Run: node harness/learning-caps.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log("FAIL", name); } }

function quotaErr() { const e = new Error("quota"); e.name = "QuotaExceededError"; e.code = 22; return e; }
function makeStorage() {
    const m = new Map();
    const s = {
        maxValue: Infinity, // values longer than this throw QuotaExceededError
        setCalls: [],
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { s.setCalls.push(k); v = String(v); if (v.length > s.maxValue && k !== "PL_ModuleLearningOwner_v1") throw quotaErr(); m.set(k, v); },
        removeItem: k => { m.delete(k); },
        key: i => Array.from(m.keys())[i] || null,
        get length() { return m.size; },
        _m: m
    };
    return s;
}
function makeLocks() {
    let tail = Promise.resolve();
    return { request(name, cb) { const run = tail.then(() => cb()); tail = run.catch(() => {}); return run; } };
}
function makeLib(installed) {
    const lib = {
        installed, current: null,
        all: () => lib.installed.map(m => ({ Path: m.path })),
        normalizePath: p => String(p || ""),
        transcriptDigestKey: p => "PL_TranscriptDigest_" + p,
        currentExecutableDigest: p => { if (p === undefined) return lib.current; const m = lib.installed.find(x => x.path === p); return m ? m.digest : null; }
    };
    return lib;
}
const files = ["LearningStores", "LearnedWords", "AttrCalibrator", "SemanticActions", "ExitCalibrator", "StatTracker", "DirectionalRadial"];
function makeTab(storage, lib) {
    const ctx = {
        localStorage: storage, navigator: { locks: makeLocks() }, console: { log() {}, warn() {}, error() {} },
        ModuleLibrary: lib || makeLib([]), ParchLock: { StoryPath: "", GameFilename: "" },
        setTimeout() {}, clearTimeout() {}, Date, Math, JSON, Promise
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    files.forEach(f => {
        const src = fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8");
        try { vm.runInContext(src + "\n;this." + f + "=" + f + ";", ctx, { filename: f + ".js" }); } catch (e) { ctx["_err_" + f] = e; }
    });
    return ctx;
}
const flush = () => new Promise(r => setImmediate(r));
async function settle() { for (let i = 0; i < 6; i++) await flush(); }
const clone = o => JSON.parse(JSON.stringify(o));

(async function main() {
    const t = makeTab(makeStorage());
    files.forEach(f => ok(!t["_err_" + f], "load " + f + (t["_err_" + f] ? ": " + t["_err_" + f].message : "")));

    // ---- AttrCalibrator compaction (no object LRU) -----------------------
    {
        const A = t.AttrCalibrator;
        const objects = {};
        for (let i = 1; i <= 40; i++) objects[i] = { takeable: true };
        objects[7] = { exactForms: { "pry": { confirmations: 2 }, "ghost": { confirmations: 0 }, "kick": { confirmations: 1, behavioralAccept: true } },
            allowedVerbs: { "open": { confirmations: 3, opcodeConfirmed: true }, "push": { confirmations: 0, opcodeConfirmed: false } } };
        const tab = {
            version: 2, objects,
            verbs: { open: { candidates: { 11: true, 12: true }, mutatedBit: 11, confirmations: 4 }, wear: { candidates: { 3: true, 9: true }, mutatedBit: null, confirmations: 2 } },
            locationGlobal: { confirmedSlot: 0, confirmedSlots: [0, 5], stableFor: A.LOCATION_STABLE_TURNS,
                candidates: { 0: { transitions: 5, returns: 2, seen: { 10: true, 11: true, 12: true }, history: ["10>11"] },
                    5: { transitions: 5, returns: 2, seen: { 10: true, 11: true }, history: ["10>11"] },
                    9: { transitions: 1, returns: 0, seen: { 10: true }, history: [] } } }
        };
        const out = A.compactTable(clone(tab));
        ok(JSON.stringify(Object.keys(out.verbs.open.candidates)) === '["11"]', "attr: losing flag candidates dropped once mutatedBit set");
        ok(Object.keys(out.verbs.wear.candidates).length === 2, "attr: unconfirmed flag keeps every candidate");
        ok(!out.locationGlobal.candidates[9] && out.locationGlobal.dropped.indexOf(9) >= 0, "attr: non-confirmed location slot dropped once stable");
        ok(out.locationGlobal.candidates[0].seenCount === 3 && !out.locationGlobal.candidates[0].seen && out.locationGlobal.candidates[0].returns === 2, "attr: confirmed slot seen{} -> seenCount");
        const confirming = clone(tab); confirming.locationGlobal.stableFor = A.LOCATION_STABLE_TURNS - 1;
        const out2 = A.compactTable(confirming);
        ok(out2.locationGlobal.candidates[9] && out2.locationGlobal.candidates[0].seen && !out2.locationGlobal.dropped, "attr: nothing touched while the cohort is still confirming");
        ok(out.objects[7].exactForms.pry && out.objects[7].exactForms.kick && !out.objects[7].exactForms.ghost, "attr: exactForms keep confirmations>0 (behavioralAccept incl.)");
        ok(out.objects[7].allowedVerbs.open.opcodeConfirmed && out.objects[7].allowedVerbs.push, "attr: opcodeConfirmed allowedVerb kept (allowedVerbs untouched)");
        ok(Object.keys(out.objects).length === 40, "attr: no object is ever removed (no LRU; in-scope objects safe)");
        const src = fs.readFileSync(path.join(ROOT, "js", "AttrCalibrator.js"), "utf8");
        ok(/loc\.dropped && loc\.dropped\.indexOf\(g\) >= 0\) continue;/.test(src) && /if \(!winner\.length\) delete loc\.dropped;/.test(src), "attr: dropped slots not re-learned while confirmed, revived when the cohort is lost");
    }

    // ---- ExitCalibrator --------------------------------------------------
    {
        const E = t.ExitCalibrator;
        const blocked = {};
        for (let i = 0; i < E.BLOCKED_MAX_KEYS + 40; i++) blocked[i + "|n"] = 1;
        const out = E.compactTable({ v: E.VERSION, dirs: { n: { confirmed: true } }, cand: { n: { "5:b": {} }, s: { "6:b": {} } }, blocked });
        ok(!out.cand.n && out.cand.s, "exit: cand of a confirmed dir dropped, unconfirmed kept");
        const keys = Object.keys(out.blocked);
        ok(keys.length === E.BLOCKED_MAX_KEYS && keys[0] === "40|n" && keys[keys.length - 1] === (E.BLOCKED_MAX_KEYS + 39) + "|n", "exit: blocked keys LRU-bounded, newest kept");
        ok(E.BLOCKED_MAX_KEYS >= 512, "exit: blocked cap is generous");
    }

    // ---- StatTracker -----------------------------------------------------
    {
        const S = t.StatTracker;
        const seen = {}; for (let i = 0; i < 100; i++) seen["ending|" + i + "|1"] = 1;
        const model = { itemMetrics: { 4: { value: { prop: 17, candidates: [17] }, weight: { prop: null, candidates: [3, 4] } }, 5: { value: { prop: null } } }, seenBanners: seen };
        const v = S.persistView(model);
        ok(v.itemMetrics[4].value && !v.itemMetrics[4].weight && !v.itemMetrics[5], "stats: itemMetrics persisted only with prop != null");
        const ids = Object.keys(v.seenBanners);
        ok(ids.length === 64 && ids[0] === "ending|36|1" && ids[63] === "ending|99|1", "stats: seenBanners keeps the latest 64");
        ok(Object.keys(model.seenBanners).length === 100 && model.itemMetrics[5], "stats: live model not mutated");
    }

    // ---- LearnedWords row cap -------------------------------------------
    {
        const W = t.LearnedWords;
        ok(W.MAX_ROWS === 1000, "lw: cap 1000 rows");
        const row = (o) => Object.assign({ trigger: "x", label: "X", ignored: false, objectId: "1", original: "x", revision: "classification", witnesses: [] }, o);
        const data = { version: 1, gameIdentityKey: "k", rows: {
            "exact:1:a": row({ classificationOnly: true }),
            "manual:z": row({ revision: "r1" }),
            "exact:1:edited": row({ revision: "r2", trigger: "pry", original: "x" }),
            "exact:1:ign": row({ ignored: true, classificationOnly: true }),
            "allowed:1:b": row({ classificationOnly: true }),
            "exact:1:old": row({}),
            "exact:1:new": row({}),
            "behavior:substitute": row({ revision: "r3" })
        } };
        const one = W.capRows(clone(data), 7);
        ok(!one.rows["exact:1:a"] && one.rows["allowed:1:b"], "lw: oldest classificationOnly evicted first");
        const four = W.capRows(clone(data), 4);
        ok(!four.rows["exact:1:a"] && !four.rows["allowed:1:b"] && !four.rows["exact:1:old"] && !four.rows["exact:1:new"], "lw: then oldest unedited recorder exact/allowed");
        const none = W.capRows(clone(data), 0);
        ok(none.rows["manual:z"] && none.rows["exact:1:edited"] && none.rows["exact:1:ign"] && none.rows["behavior:substitute"], "lw: manual, user-edited exact and ignored suppress never evicted");
        ok(Object.keys(W.capRows(clone(data)).rows).length === 8, "lw: under the cap nothing is evicted");
    }

    // ---- SemanticActions dedupe -----------------------------------------
    {
        const d = t.SemanticActions.dedupeEntries([{ intent: "OPEN", formId: "f", objectIds: [3], n: 1 }, { intent: "OPEN", formId: "f", objectIds: ["3"], n: 2 }, { intent: "OPEN", formId: "g", objectIds: [3] }]);
        ok(d.length === 2 && d[0].n === 2, "semantic: dedupe by intent/form/object ids, latest wins");
    }

    // ---- DirectionalRadial 64 slices -------------------------------------
    {
        const tt = makeTab(makeStorage());
        tt.ParchLock.GameFilename = "a.z5.js";
        let made = 0;
        for (let i = 0; i < 64; i++) if (tt.DirectionalRadial.AddCustomSlice({ label: "s" + i, command: "c", angle: i, ring: 2 })) made++;
        await settle();
        ok(made === 64 && tt.DirectionalRadial.GetCustomSlices().length === 64, "radial: 64 slices accepted");
        ok(tt.DirectionalRadial.AddCustomSlice({ label: "x", command: "c", angle: 1, ring: 3 }) === null && tt.DirectionalRadial.GetCustomSlices().length === 64, "radial: 65th refused");
        const src = fs.readFileSync(path.join(ROOT, "js", "DirectionalRadial.js"), "utf8");
        ok(/errEl\.text\(DirectionalRadial\.CUSTOM_LIMIT_MESSAGE\)/.test(src) && /64 custom slices/.test(tt.DirectionalRadial.CUSTOM_LIMIT_MESSAGE), "radial: refusal shows a message");
    }

    // ---- index: digests + legacy overflow migration ----------------------
    {
        const owners16 = Array.from({ length: 16 }, (_, i) => ({ digest: "d" + i, path: "games/b" + i + ".z5.js", inputs: { identityKey: "2-B" } }));
        const s = makeStorage(), lib = makeLib([]);
        s.setItem("PL_LearnedWordOverrides_2-B", "v");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, tombstones: {},
            entries: { "PL_LearnedWordOverrides_2-B": { key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", owners: owners16, ownersOverflow: true } } }));
        const tt = makeTab(s, lib);
        lib.current = "dNew"; tt.ParchLock.StoryPath = "games/new.z5.js";
        tt.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v2"); await settle();
        lib.current = null; tt.ParchLock.StoryPath = "";
        const e = tt.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(e.ownersOverflow === true && !e.digests && e.owners.length === 16, "index: legacy overflow stays flagged, no digests invented");
        const L = tt.LearningStores.list();
        ok(L.removable === 0 && L.unknown === 1 && s.getItem("PL_LearnedWordOverrides_2-B") === "v2", "index: legacy overflow entry stays unerasable");
    }
    {   // complete legacy entry: digests rebuilt from its owners on the next owner add
        const s = makeStorage(), lib = makeLib([]);
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, tombstones: {},
            entries: { "PL_LearnedWordOverrides_2-B": { key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", owners: [{ digest: "dA", path: "games/a.z5.js", inputs: { identityKey: "2-B" } }] } } }));
        const tt = makeTab(s, lib);
        lib.current = "dB"; tt.ParchLock.StoryPath = "games/b.z5.js";
        tt.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v"); await settle();
        const e = tt.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(JSON.stringify(e.digests) === '["dA","dB"]' && e.owners[1].lastWriteAt > 0, "index: digests rebuilt from known owners, lastWriteAt recorded");
    }
    {   // a dropped path-only owner keeps the entry fail-closed; installed digest outside owners still protects
        const s = makeStorage(), lib = makeLib([]);
        const tt = makeTab(s, lib);
        tt.ParchLock.StoryPath = "games/pathonly.z5.js"; lib.current = null;
        tt.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v"); await settle();
        for (let i = 0; i < 16; i++) { lib.current = "d" + i; tt.ParchLock.StoryPath = "games/b" + i + ".z5.js"; tt.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v" + i); await settle(); }
        lib.current = null; tt.ParchLock.StoryPath = "";
        const e = tt.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(e.owners.length === 16 && e.pathOnlyDropped === true && e.owners.every(o => o.digest), "index: dropping a path-only owner sets pathOnlyDropped");
        ok(tt.LearningStores.list().removable === 0, "index: path-only history stays fail-closed");
        // digest d0 left the owners list? no -- d0 is still an owner; check an evicted digest protects
        const s2 = makeStorage(), lib2 = makeLib([]);
        const t2 = makeTab(s2, lib2);
        for (let i = 0; i < 18; i++) { lib2.current = "d" + i; t2.ParchLock.StoryPath = "games/b" + i + ".z5.js"; t2.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v" + i); await settle(); }
        lib2.current = null; t2.ParchLock.StoryPath = "";
        lib2.installed = [{ path: "games/renamed.z5.js", digest: "d0" }];
        const L = t2.LearningStores.list();
        ok(L.removable === 0 && L.installed === 1, "index: an installed digest trimmed from owners still protects the entry");
    }

    // ---- quota hooks + stop-requeue --------------------------------------
    {
        const s = makeStorage(), lib = makeLib([]);
        const tt = makeTab(s, lib);
        lib.current = "dA"; tt.ParchLock.StoryPath = "games/a.z5.js";
        s.setItem("PL_Map_a.z5.js", "MAP");
        const seen = {}; for (let i = 0; i < 400; i++) seen["ending|" + i + "|1"] = 1;
        const big = JSON.stringify({ seenBanners: seen });
        const small = JSON.stringify(tt.StatTracker.persistView({ seenBanners: seen }));
        s.maxValue = small.length; // only the compacted value fits
        tt.LearningStores.persist("stats", { identityKey: "1-A" }, big); await settle();
        ok(s.getItem("PM_Stats_1-A") === small && !tt.LearningStores.lastError(), "quota: compact hook applied and retried once");
        s.maxValue = 10;
        tt.LearningStores.persist("stats", { identityKey: "1-A" }, big); await settle();
        ok(tt.LearningStores.lastError() === "Storage is full; learned data was not saved", "quota: second failure reports the status");
        ok(tt.LearningStores.pending() === 0, "quota: snapshot not requeued");
        const calls = s.setCalls.length;
        tt.LearningStores._drain(); await settle();
        ok(s.setCalls.length === calls, "quota: no retry until a real mutation");
        ok(s.getItem("PL_Map_a.z5.js") === "MAP" && s.getItem("PM_Stats_1-A") === small, "quota: maps and the older value untouched");
        s.maxValue = Infinity;
        tt.LearningStores.persist("stats", { identityKey: "1-A" }, "{}"); await settle();
        ok(s.getItem("PM_Stats_1-A") === "{}" && !tt.LearningStores.lastError(), "quota: next real mutation writes and clears the status");
        // kind without a hook: retried once, then reported
        s.maxValue = 3;
        tt.ParchLock.GameFilename = "a.z5.js";
        tt.LearningStores.persist("dirRadial", { filename: "a.z5.js" }, "0123456789"); await settle();
        ok(tt.LearningStores.lastError() === tt.LearningStores.QUOTA_MESSAGE && tt.LearningStores.pending() === 0, "quota: hookless kind skipped, reported, not requeued");
        const src = fs.readFileSync(path.join(ROOT, "js", "LearningStores.js"), "utf8");
        ok(/quotaError \|\| lastError \|\| recoveryError/.test(src) && /pl-learning-erase-status/.test(src), "quota: Options > Learned words status line shows it");
        ["AttrCalibrator", "ExitCalibrator", "StatTracker", "LearnedWords"].forEach(f =>
            ok(/LearningStores\.register\([^;]*compact: function \(value\)/.test(fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8")), "quota: " + f + " registers a compact hook"));
    }

    // ---- size note ------------------------------------------------------
    {
        const LS = t.LearningStores;
        ok(LS.sizeNote({ ok: true, bytes: 2e6, byModule: { "games/big.z5.js": 1.2 * 1024 * 1024 } }) === " Note: learned data for big.z5.js is over 1 MB.", "note: per-module > 1 MB");
        ok(/over 3 MB in total/.test(LS.sizeNote({ ok: true, bytes: 3.5 * 1024 * 1024, byModule: { a: 9e5, b: 9e5, c: 9e5, d: 9e5 } })), "note: total > 3 MB");
        ok(LS.sizeNote({ ok: true, bytes: 160000, byModule: { a: 160000 } }) === "", "note: silent at measured sizes");
        const s = makeStorage(), lib = makeLib([]);
        const tt = makeTab(s, lib);
        lib.current = "dA"; tt.ParchLock.StoryPath = "games/a.z5.js";
        tt.LearningStores.persist("stats", { identityKey: "1-A" }, "x".repeat(600000)); await settle();
        const L = tt.LearningStores.list();
        ok(L.byModule["games/a.z5.js"] > 1024 * 1024 && /learned data for a\.z5\.js is over 1 MB/.test(tt.LearningStores.describe(L)), "note: list().bytes per module drives the labelled note");
    }

    console.log("learning-caps: " + pass + " PASS, " + fail + " FAIL");
    process.exit(fail ? 1 : 0);
})();
