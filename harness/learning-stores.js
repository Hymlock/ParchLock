// D13 harness: LearningStores ownership index, serialized persists and the
// erase-for-uninstalled action, against a constructed localStorage and a
// navigator.locks stub. Run: node harness/learning-stores.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log("FAIL", name); } }

function makeStorage() {
    const m = new Map();
    const s = {
        failRemove: new Set(), failSet: false, failSetKeys: new Set(),
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { if (s.failSet || s.failSetKeys.has(k)) throw new Error("quota"); m.set(k, String(v)); },
        removeItem: k => { if (!s.failRemove.has(k)) m.delete(k); },
        key: i => Array.from(m.keys())[i] || null,
        get length() { return m.size; },
        _m: m
    };
    return s;
}
function makeLocks() {
    let tail = Promise.resolve();
    const l = {
        fail: false, held: 0,
        request(name, cb) {
            if (l.fail) return Promise.reject(new Error("lock denied"));
            const run = tail.then(() => { l.held++; try { return cb(); } finally { l.held--; } });
            tail = run.catch(() => {});
            return run;
        }
    };
    return l;
}
const files = ["LearningStores", "LearnedWords", "AttrCalibrator", "SemanticActions", "ExitCalibrator", "StatTracker", "DirectionalRadial"];
const srcCache = {};
function makeTab(storage, locks, lib) {
    const ctx = {
        localStorage: storage, navigator: locks ? { locks } : {}, console: { log() {}, warn() {}, error() {} },
        ModuleLibrary: lib, ParchLock: { StoryPath: "", GameFilename: "" },
        setTimeout() {}, clearTimeout() {}, Date, Math, JSON, Promise
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    files.forEach(f => {
        const src = srcCache[f] || (srcCache[f] = fs.readFileSync(path.join(ROOT, "js", f + ".js"), "utf8"));
        try { vm.runInContext(src + "\n;this." + f + "=" + f + ";", ctx, { filename: f + ".js" }); }
        catch (e) { ctx["_err_" + f] = e; }
    });
    // ZRamReader is large; its diagonal key generator is checked separately.
    return ctx;
}
function makeLib(installed) {
    // installed: [{path, digest|null}]
    const lib = {
        installed,
        current: null,
        all: () => lib.installed.map(m => ({ Path: m.path })),
        normalizePath: p => String(p || "").replace(/^\.\//, ""),
        transcriptDigestKey: p => "PL_TranscriptDigest_" + p,
        currentExecutableDigest: p => {
            if (p === undefined) return lib.current;
            const m = lib.installed.find(x => x.path === p);
            return m ? m.digest : null;
        }
    };
    return lib;
}
const flush = () => new Promise(r => setImmediate(r));
async function settle() { for (let i = 0; i < 6; i++) await flush(); }

(async function main() {
    // ---- exact key formats per store -------------------------------------
    {
        const t = makeTab(makeStorage(), makeLocks(), makeLib([]));
        files.forEach(f => ok(!t["_err_" + f], "load " + f + (t["_err_" + f] ? ": " + t["_err_" + f].message : "")));
        ok(t.LearnedWords.learningKeyFor({ identityKey: "88-840726" }) === "PL_LearnedWordOverrides_88-840726", "LearnedWords key");
        ok(t.AttrCalibrator.learningKeyFor({ identityKey: "88-840726" }) === "PL_AttrCalib_88-840726", "AttrCalib key");
        ok(t.SemanticActions.learningKeyFor({ identityKey: "88-840726", checksum: "a129", adapter: t.SemanticActions.ADAPTER_VERSION, locale: "en" }) ===
            "PL_SemanticActions_88-840726-a129-" + t.SemanticActions.ADAPTER_VERSION + "-en", "SemanticActions key");
        ok(t.ExitCalibrator.learningKeyFor({ identityKey: "88-840726" }) === "PM_ExitCalib_88-840726", "ExitCalib key");
        ok(t.StatTracker.learningKeyFor({ identityKey: "88-840726" }) === "PM_Stats_88-840726", "Stats key");
        ok(t.DirectionalRadial.learningKeyFor({ filename: "zork1.z3.js" }) === "PL_DirRadial_zork1.z3.js", "DirRadial key");
        ok(t.LearnedWords.learningKeyFor({}) === null && t.DirectionalRadial.learningKeyFor({ filename: "" }) === null, "empty inputs give no key");
        const zsrc = fs.readFileSync(path.join(ROOT, "js", "ZRamReader.js"), "utf8");
        ok(/diagonalLearningKeyFor: \(i\) => \(i && typeof i.identityKey === "string" && i.identityKey \? "PL_DiagonalCalib_" \+ i.identityKey : null\)/.test(zsrc), "Diagonal key generator");
        ok(/LearningStores\.register\("diagonalCalib", "PL_DiagonalCalib_", ZRamReader\.diagonalLearningKeyFor\)/.test(zsrc), "Diagonal registered");
        // persist goes through the index with the store's exact key
        const s = t.localStorage;
        t.ModuleLibrary.current = "d1"; t.ParchLock.StoryPath = "games/a.z5.js"; t.ParchLock.GameFilename = "a.z5.js";
        // This fixture tests the persistence/index seam, with identity supplied
        // explicitly. Real digest/header isolation is covered separately.
        t.LearningStores.identity = () => ({identityKey:'88-840726',digest:'d1'});
        t.StatTracker.save("88-840726", { score: 1 });
        await settle();
        const idx = JSON.parse(s.getItem("PL_ModuleLearningOwner_v1"));
        ok(s.getItem("PM_Stats_88-840726") === JSON.stringify({ score: 1 }), "stats written");
        ok(idx.entries["PM_Stats_88-840726"] && idx.entries["PM_Stats_88-840726"].owners[0].digest === "d1" &&
            idx.entries["PM_Stats_88-840726"].owners[0].path === "games/a.z5.js", "stats owner registered");
        t.DirectionalRadial.SaveCustomSlices([{ id: "x", label: "L", command: "c", angle: 0, ring: 1 }]);
        await settle();
        ok(JSON.parse(s.getItem("PL_ModuleLearningOwner_v1")).entries["PL_DirRadial_a.z5.js"], "dirRadial registered");
    }

    // ---- installed vs uninstalled vs unknown vs current -------------------
    async function scenario(installed, owners, cur, opts) {
        opts = opts || {};
        const s = makeStorage(), l = makeLocks(), lib = makeLib(installed);
        const t = makeTab(s, l, lib);
        for (const o of owners) {
            lib.current = o.digest; t.ParchLock.StoryPath = o.path;
            t.LearningStores.persist("learnedWords", { identityKey: o.id }, "{\"v\":\"" + o.id + "\"}");
            await settle();
        }
        lib.current = cur ? cur.digest : null; t.ParchLock.StoryPath = cur ? cur.path : "";
        return { s, l, lib, t };
    }
    {
        const { t, s } = await scenario([{ path: "games/a.z5.js", digest: "dA" }],
            [{ id: "1-A", digest: "dA", path: "games/a.z5.js" }, { id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const L = t.LearningStores.list();
        ok(L.ok && L.removable === 1 && L.installed === 1 && L.candidates[0].key === "PL_LearnedWordOverrides_2-B", "uninstalled listed, installed kept");
        ok(/about [0-9.]+ KB \(UTF-16 estimate\)/.test(t.LearningStores.describe(L)), "size line");
        const r = await t.LearningStores.erase(L);
        ok(!r.aborted && r.removed === 1 && r.failed === 0, "erase removed one");
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === null && s.getItem("PL_LearnedWordOverrides_1-A") !== null, "only uninstalled erased");
        const idx = JSON.parse(s.getItem("PL_ModuleLearningOwner_v1"));
        ok(idx.revision === 1 && idx.tombstones["PL_LearnedWordOverrides_2-B"].erasedAtIndexRevision === 1 && idx.entries["PL_LearnedWordOverrides_2-B"].eraseEpoch === 1 && !idx.entries["PL_LearnedWordOverrides_2-B"].owners.length, "revision + tombstone + erase epoch");
    }
    {   // unknown installed digest -> everything unknown
        const { t } = await scenario([{ path: "games/a.z5.js", digest: null }], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const L = t.LearningStores.list();
        ok(L.ok && L.removable === 0 && L.unknown === 1, "unknown installed digest blocks erase");
    }
    {   // installed digest known only via transcript digest record
        const { t, s } = await scenario([{ path: "games/a.z5.js", digest: null }], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        s.setItem("PL_TranscriptDigest_games/a.z5.js", "dA");
        ok(t.LearningStores.list().removable === 1, "transcript digest makes installed known");
    }
    {   // owner with unknown digest -> unknown
        const { t } = await scenario([], [{ id: "2-B", digest: null, path: "games/b.z5.js" }], null);
        ok(t.LearningStores.list().unknown === 1, "owner without digest is unknown");
    }
    {   // current story uninstalled while open is protected by digest and path
        const { t } = await scenario([], [{ id: "3-C", digest: "dC", path: "games/c.z5.js" }], { digest: "dC", path: "games/c.z5.js" });
        ok(t.LearningStores.list().removable === 0, "current-but-uninstalled protected");
        const { t: t2 } = await scenario([], [{ id: "3-C", digest: "dC", path: "games/c.z5.js" }], { digest: "dX", path: "games/c.z5.js" });
        ok(t2.LearningStores.list().removable === 0, "current protected by path");
    }
    {   // alias/collision: same key, two owners; one installed (by digest under another path)
        const { t } = await scenario([{ path: "local/zz.z5.js", digest: "dB2" }],
            [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }, { id: "2-B", digest: "dB2", path: "games/b-alt.z5.js" }], null);
        const idx = t.LearningStores.readIndex().index;
        ok(idx.entries["PL_LearnedWordOverrides_2-B"].owners.length === 2, "owners accumulate");
        ok(t.LearningStores.list().removable === 0, "collision with installed digest kept");
    }
    {   // reinstall race: installed between listing and confirm
        const { t, lib, s } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const L = t.LearningStores.list();
        ok(L.removable === 1, "race: listed");
        lib.installed.push({ path: "games/b.z5.js", digest: "dB" });
        const r = await t.LearningStores.erase(L);
        ok(r.aborted && s.getItem("PL_LearnedWordOverrides_2-B") !== null, "reinstall race aborts");
    }
    {   // value changed between listing and confirm
        const { t } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const L = t.LearningStores.list();
        t.localStorage.setItem("PL_LearnedWordOverrides_2-B", "{\"v\":\"changed\"}");
        ok((await t.LearningStores.erase(L)).aborted, "changed value aborts");
    }
    {   // partial failure keeps failed index entries
        const { t, s } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }, { id: "4-D", digest: "dD", path: "games/d.z5.js" }], null);
        s.failRemove.add("PL_LearnedWordOverrides_4-D");
        const r = await t.LearningStores.erase(t.LearningStores.list());
        const idx = t.LearningStores.readIndex().index;
        ok(r.removed === 1 && r.failed === 1 && idx.entries["PL_LearnedWordOverrides_4-D"] && !idx.entries["PL_LearnedWordOverrides_4-D"].eraseEpoch && idx.entries["PL_LearnedWordOverrides_2-B"].eraseEpoch === 1 && idx.revision === 1, "partial failure");
    }
    {   // malformed index disables erase; unmanaged keys never erased
        const { t, s } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        s.setItem("PL_ModuleLearningOwner_v1", "{bad");
        const L = t.LearningStores.list();
        ok(!L.ok && /damaged/.test(L.reason), "malformed index disables erase");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, entries: { "PL_LearnedWordOverrides_9-Z": { key: "PL_LearnedWordOverrides_9-Z", kind: "learnedWords", owners: [{ digest: "dZ", path: "games/z.z5.js", inputs: { identityKey: "OTHER" } }], storeRevision: 1 } }, tombstones: {} }));
        s.setItem("PL_LearnedWordOverrides_9-Z", "x"); s.setItem("PL_AttrCalib_legacy", "y"); s.setItem("PL_Map_games/b.z5.js", "map");
        const L2 = t.LearningStores.list();
        ok(L2.ok && L2.removable === 0 && L2.unmanaged === 3, "invalid generator entry + legacy key are unmanaged (" + L2.unmanaged + ")");
        await t.LearningStores.erase(L2);
        ok(s.getItem("PL_AttrCalib_legacy") === "y" && s.getItem("PL_Map_games/b.z5.js") === "map", "unmanaged and maps untouched");
    }
    {   // cross-tab resurrection: tab B hydrated before tab A erased
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const A = makeTab(s, l, lib), B = makeTab(s, l, lib);
        lib.current = "dB"; B.ParchLock.StoryPath = "games/b.z5.js";
        B.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"old\":1}"); await settle();
        B.LearningStores.read("PL_LearnedWordOverrides_2-B");
        lib.current = null; A.ParchLock.StoryPath = ""; B.ParchLock.StoryPath = "";
        const r = await A.LearningStores.erase(A.LearningStores.list());
        ok(r.removed === 1, "tab A erased");
        let resetCalled = false;
        lib.current = "dB"; B.ParchLock.StoryPath = "games/b.z5.js";
        B.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"old\":2}", () => { resetCalled = true; }); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === null && resetCalled, "stale tab does not resurrect; resets");
        B.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"fresh\":1}"); await settle();
        const idx = B.LearningStores.readIndex().index;
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "{\"fresh\":1}" && !idx.tombstones["PL_LearnedWordOverrides_2-B"], "fresh-start write clears tombstone");
    }
    {   // restore/restart/story switch keep a pending persist; FIFO per key
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        l.fail = true;
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"n\":1}"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === null && t.LearningStores.pending() === 1 && t.LearningStores.lastError(), "lock failure: no write, dirty, reported");
        // story switch to C, then a restore (generation change) -- the B snapshot must survive
        lib.current = "dC"; t.ParchLock.StoryPath = "games/c.z5.js";
        l.fail = false;
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "{\"n\":2}"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "{\"n\":1}" && s.getItem("PL_LearnedWordOverrides_3-C") === "{\"n\":2}", "pending persist kept across switch, written on retry");
        const idx = t.LearningStores.readIndex().index;
        ok(idx.entries["PL_LearnedWordOverrides_2-B"].owners[0].digest === "dB", "old key keeps its captured owner");
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "{\"n\":3}");
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "{\"n\":4}");
        ok(t.LearningStores.read("PL_LearnedWordOverrides_3-C") === "{\"n\":4}", "read sees newest pending snapshot");
        await settle();
        ok(s.getItem("PL_LearnedWordOverrides_3-C") === "{\"n\":4}", "FIFO ends on newest");
    }
    {   // no Web Locks: cleanup disabled, persists write as today
        const s = makeStorage(), lib = makeLib([]);
        const t = makeTab(s, null, lib);
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"n\":1}");
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "{\"n\":1}", "no-locks writes synchronously");
        const L = t.LearningStores.list();
        ok(!L.ok && /Web Locks/.test(L.reason), "no-locks disables erase");
    }


    {   // P13b R2: owners metadata keeps the 16 most recent; the durable
        // digests set (erase authority) keeps every digest, never trimmed
        const { t } = await scenario([], Array.from({ length: 18 }, (_, i) => ({ id: "2-B", digest: "d" + i, path: "games/b" + i + ".z5.js" })), null);
        const e = t.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(e.owners.length === 16 && !e.ownersOverflow && e.owners[0].digest === "d2" && e.digests.length === 18 && e.digests[0] === "d0", "owners keep 16 most recent, digests keep all 18");
        const L = t.LearningStores.list();
        ok(L.removable === 1 && L.unknown === 0, "all 18 owners uninstalled: erasable by the digests set");
    }
    {   // index write fails before erase: nothing removed
        const { t, s } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const L = t.LearningStores.list();
        s.failSetKeys.add("PL_ModuleLearningOwner_v1");
        const r = await t.LearningStores.erase(L);
        s.failSetKeys.clear();
        ok(r.aborted && r.removed === 0 && s.getItem("PL_LearnedWordOverrides_2-B") !== null && !t.LearningStores.readIndex().index.tombstones["PL_LearnedWordOverrides_2-B"], "pre-write failure removes nothing");
    }
    {   // crash between durable tombstone and removal
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const old = makeTab(s, l, lib);
        lib.current = "dB"; old.ParchLock.StoryPath = "games/b.z5.js";
        old.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"old\":1}"); await settle();
        old.LearningStores.read("PL_LearnedWordOverrides_2-B");
        const idx = JSON.parse(s.getItem("PL_ModuleLearningOwner_v1"));
        idx.tombstones["PL_LearnedWordOverrides_2-B"] = { erasedAtIndexRevision: idx.revision + 1 };
        idx.pending = { revision: idx.revision + 1, records: [{ key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", inputs: { identityKey: "2-B" } }] };
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify(idx)); // the crash: keys never removed
        const fresh = makeTab(s, l, lib);
        ok(fresh.LearningStores.read("PL_LearnedWordOverrides_2-B") === null, "pending tombstone hides key from a new tab");
        let reset = false;
        old.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"old\":2}", () => { reset = true; }); await settle();
        const after = JSON.parse(s.getItem("PL_ModuleLearningOwner_v1"));
        ok(reset && s.getItem("PL_LearnedWordOverrides_2-B") === null && !after.pending && after.revision === 1, "old hydrated tab after crash: no resurrection, erase recovered");
        fresh.ParchLock.StoryPath = "games/b.z5.js";
        fresh.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "{\"fresh\":1}"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "{\"fresh\":1}", "fresh tab write after recovery allowed");
    }
    {   // R7 check(): pure hashing of unknown installed modules
        const D = "a".repeat(64), E = "b".repeat(64);
        const { t, lib } = await scenario([{ path: "games/a.z5.js", digest: null }], [{ id: "2-B", digest: E, path: "games/b.z5.js" }], { digest: null, path: "" });
        lib.rev = 0; lib.libraryRevision = () => lib.rev;
        let calls = 0;
        lib.executableDigestForPath = p => { calls++; return Promise.resolve(D); };
        ok(t.LearningStores.list().removable === 0, "before check: unknown");
        const L = await t.LearningStores.check();
        ok(calls === 1 && L.removable === 1 && lib.current === null, "check hashes unknown module, current identity untouched");
        lib.rev = 1;
        ok(t.LearningStores.list().removable === 0, "library change invalidates checked digests");
        lib.executableDigestForPath = p => Promise.reject(new Error("io"));
        ok((await t.LearningStores.check()).removable === 0, "hash failure stays unknown");
        lib.executableDigestForPath = p => { lib.rev++; return Promise.resolve(D); };
        ok((await t.LearningStores.check()).removable === 0, "library change during await fails closed");
        lib.executableDigestForPath = p => Promise.resolve(E);
        const L3 = await t.LearningStores.check();
        ok(L3.removable === 0 && L3.installed === 1, "hashed installed digest matching owner keeps key");
        const ml = fs.readFileSync(path.join(ROOT, "js", "ModuleLibrary.js"), "utf8");
        const body = ml.slice(ml.indexOf("function executableDigestForPath"), ml.indexOf("function identityForPath"));
        ok(body.length > 50 && !/captureExecutableIdentity|executableIdentity\s*=|executableIdentityByPath|executableIdentityPromise/.test(body) && /inspect\(/.test(body) && /executableBytes/.test(body), "executableDigestForPath is side-effect free");
    }

    {   // 7: cross-tab -- a newer mutation after another tab advanced is kept
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const A = makeTab(s, l, lib), B = makeTab(s, l, lib);
        lib.current = "dB"; A.ParchLock.StoryPath = B.ParchLock.StoryPath = "games/b.z5.js";
        A.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "a1"); await settle();
        for (const v of ["b1", "b2", "b3"]) { B.LearningStores.persist("learnedWords", { identityKey: "2-B" }, v); await settle(); }
        A.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "a-latest-user-mutation"); await settle();
        const e = A.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "a-latest-user-mutation" && e && e.storeRevision === undefined && A.LearningStores.pending() === 0, "cross-tab newer mutation committed (last-writer-wins, no per-write counter)");
    }
    {   // bus #5674: metadata-only index writes
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v0"); await settle();
        const w0 = t.LearningStores._indexWrites();
        ok(w0 === 1, "first write creates the entry with one index write (" + w0 + ")");
        for (const v of ["v1", "v2", "v3", "v4"]) { t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, v); await settle(); }
        ok(t.LearningStores._indexWrites() - w0 === 0 && s.getItem("PL_LearnedWordOverrides_2-B") === "v4", "repeated value writes, same owner: 0 index writes, value saved");
        lib.current = "dB2"; t.ParchLock.StoryPath = "games/b2.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v5"); await settle();
        const ix = t.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        ok(t.LearningStores._indexWrites() - w0 === 1 && ix.owners.length === 2, "new owner: exactly one index write");
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "v6"); await settle();
        ok(t.LearningStores._indexWrites() - w0 === 1, "same new owner again: no further index write");
    }
    {   // codex #5692 (negative control fresh-cleared-tombstone-oldtab.json): three-tab resurrection
        const { t: A, s, l, lib } = await scenario([], [{ id: "2-B", digest: "dB", path: "games/b.z5.js" }], null);
        const r = await A.LearningStores.erase(A.LearningStores.list());
        ok(!r.aborted && r.removed === 1, "3-tab: erase removed the key");
        const C = makeTab(s, l, lib);
        lib.current = "dB"; C.ParchLock.StoryPath = A.ParchLock.StoryPath = "games/b.z5.js";
        ok(C.LearningStores.read("PL_LearnedWordOverrides_2-B") === null, "3-tab: fresh tab C hydrates after erase");
        C.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "fresh-learning"); await settle();
        let idx = C.LearningStores.readIndex().index;
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "fresh-learning" && !idx.tombstones["PL_LearnedWordOverrides_2-B"] && idx.entries["PL_LearnedWordOverrides_2-B"].eraseEpoch === 1,
            "3-tab: C's fresh write clears the tombstone but keeps eraseEpoch 1");
        let reset = false;
        A.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "old-resurrected", () => { reset = true; }); await settle();
        idx = A.LearningStores.readIndex().index;
        ok(reset && s.getItem("PL_LearnedWordOverrides_2-B") === "fresh-learning" && idx.entries["PL_LearnedWordOverrides_2-B"].eraseEpoch === 1 && A.LearningStores.pending() === 0,
            "3-tab: stale tab A rejected (reset, no write), epoch kept");
        A.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "a-after-reset"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "a-after-reset", "3-tab: A writes normally after its reset");
    }
    {   // codex #5692 (negative control owner-index-failure-cleanup.json): new owner registered before its value
        const { t, s, lib } = await scenario([{ path: "games/b.z5.js", digest: "dB" }], [{ id: "2-B", digest: "dA", path: "games/a.z5.js" }], null);
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        s.failSetKeys.add("PL_ModuleLearningOwner_v1");
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "B"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "{\"v\":\"2-B\"}" && t.LearningStores.pending() === 1 && /could not be saved/.test(t.LearningStores.lastError() || ""),
            "owner-index failure: value not written, snapshot dirty, reported");
        s.failSetKeys.clear();
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "B2"); await settle();
        const e = t.LearningStores.readIndex().index.entries["PL_LearnedWordOverrides_2-B"];
        lib.current = null; t.ParchLock.StoryPath = "";
        const L = t.LearningStores.list();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "B2" && t.LearningStores.pending() === 0 && e.owners.some(o => o.digest === "dB") && L.removable === 0 && L.installed === 1,
            "owner-index recovery: B registered then written; installed owner protects the key");
        const w = t.LearningStores._indexWrites();
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        s.failSetKeys.add("PL_ModuleLearningOwner_v1");
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "B3"); await settle();
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "B3" && t.LearningStores._indexWrites() === w && t.LearningStores.pending() === 0, "existing-owner value-only fast path unchanged (no index write)");
        s.failSetKeys.clear();
    }
    {   // bus #5674: tombstone clear on a fresh post-erase write still happens
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        s.setItem("PL_LearnedWordOverrides_2-B", "old");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 3, entries: {}, tombstones: { "PL_LearnedWordOverrides_2-B": { erasedAtIndexRevision: 3 } } }));
        const t = makeTab(s, l, lib);
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearningStores.read("PL_LearnedWordOverrides_2-B"); // hydrated after the erase
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "fresh"); await settle();
        const ix = t.LearningStores.readIndex().index;
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "fresh" && !ix.tombstones["PL_LearnedWordOverrides_2-B"] && ix.entries["PL_LearnedWordOverrides_2-B"], "post-erase fresh write clears tombstone in the index");
    }
    {   // bus #5674: recovery commit still happens on a value-only write
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        s.setItem("PL_LearnedWordOverrides_2-B", "known");
        s.setItem("PL_LearnedWordOverrides_9-Z", "half-erased");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 1, tombstones: { "PL_LearnedWordOverrides_9-Z": { erasedAtIndexRevision: 2 } },
            entries: { "PL_LearnedWordOverrides_2-B": { key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", owners: [{ digest: "dB", path: "games/b.z5.js", inputs: { identityKey: "2-B" } }] } },
            pending: { revision: 2, records: [{ key: "PL_LearnedWordOverrides_9-Z", kind: "learnedWords", inputs: { identityKey: "9-Z" } }] } }));
        const t = makeTab(s, l, lib);
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "known2"); await settle();
        const ix = t.LearningStores.readIndex().index;
        ok(!ix.pending && ix.revision === 2 && s.getItem("PL_LearnedWordOverrides_9-Z") === null && s.getItem("PL_LearnedWordOverrides_2-B") === "known2" && t.LearningStores._indexWrites() === 0, "value-only write still commits recovery");
    }
    {   // bus #5674: Erase disabled after abort until a fresh Check
        const src = fs.readFileSync(path.join(ROOT, "js", "LearningStores.js"), "utf8");
        ok(/Saved learned data changed; check again./.test(src) && /needCheck = true/.test(src) && /disabled", needCheck ||/.test(src), "abort disables Erase until Check, with the agreed text");
    }
    {   // 5: queued A -> switch/load/write B -> A erased: B intact, A not resurrected
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        let id = "1-A";
        t.LearnedWords.identity = () => id;
        lib.current = "dA"; t.ParchLock.StoryPath = "games/a.z5.js";
        t.LearnedWords.load();
        l.fail = true;
        t.LearnedWords.write({ version: 1, gameIdentityKey: "1-A", rows: { "exact:1:a": { label: "a" } } });
        await settle();
        ok(t.LearningStores.pending() === 1, "A queued");
        // erase A elsewhere: tombstone after A hydrated
        const idx = { v: 1, revision: 5, entries: {}, tombstones: { "PL_LearnedWordOverrides_1-A": { erasedAtIndexRevision: 5 } } };
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify(idx));
        id = "2-B"; lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        t.LearnedWords.load();
        t.LearnedWords._projection = { marker: 1 };
        const bData = { version: 1, gameIdentityKey: "2-B", rows: { "exact:2:b": { label: "b" } } };
        l.fail = false;
        t.LearnedWords.write(bData, true);
        await settle();
        ok(s.getItem("PL_LearnedWordOverrides_1-A") === null, "A not resurrected");
        ok(t.LearnedWords._key === "2-B" && t.LearnedWords._data === bData && t.LearnedWords._undo.length === 1 && t.LearnedWords._projection.marker === 1, "B rows/undo/projection preserved");
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === JSON.stringify(bData), "B written");
    }

    {   // forged pending record naming a save/map key: recovery removes nothing
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        s.setItem("PL_SaveState_games/b.z5.js", "save"); s.setItem("PL_Map_games/b.z5.js", "map");
        s.setItem("PL_LearnedWordOverrides_2-B", "lw");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, entries: {},
            tombstones: { "PL_SaveState_games/b.z5.js": { erasedAtIndexRevision: 1 }, "PL_Map_games/b.z5.js": { erasedAtIndexRevision: 1 }, "PL_LearnedWordOverrides_2-B": { erasedAtIndexRevision: 1 } },
            pending: { revision: 1, records: [
                { key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", inputs: { identityKey: "2-B" } },
                { key: "PL_SaveState_games/b.z5.js", kind: "learnedWords", inputs: { identityKey: "2-B" } },
                { key: "PL_Map_games/b.z5.js", kind: "nosuchkind", inputs: {} }] } }));
        lib.current = "dC"; t.ParchLock.StoryPath = "games/c.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "c"); await settle();
        const r = await t.LearningStores.erase(t.LearningStores.list());
        ok(s.getItem("PL_SaveState_games/b.z5.js") === "save" && s.getItem("PL_Map_games/b.z5.js") === "map" && s.getItem("PL_LearnedWordOverrides_2-B") === "lw", "forged pending: nothing removed");
        ok(r.aborted && /damaged/.test(t.LearningStores.lastError() || r.reason), "forged pending reported");
    }
    {   // recovery keeps failed keys pending and retries
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        s.setItem("PL_LearnedWordOverrides_2-B", "lw");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, entries: {},
            tombstones: { "PL_LearnedWordOverrides_2-B": { erasedAtIndexRevision: 1 } },
            pending: { revision: 1, records: [{ key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", inputs: { identityKey: "2-B" } }] } }));
        s.failRemove.add("PL_LearnedWordOverrides_2-B");
        lib.current = "dC"; t.ParchLock.StoryPath = "games/c.z5.js";
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "c"); await settle();
        let idx = t.LearningStores.readIndex().index;
        ok(idx.pending && idx.pending.records.length === 1 && idx.tombstones["PL_LearnedWordOverrides_2-B"] && idx.revision === 0 && /retry/.test(t.LearningStores.lastError() || ""), "failed recovery stays pending + reported");
        ok(t.LearningStores.read("PL_LearnedWordOverrides_2-B") === null, "still hidden while pending");
        s.failRemove.clear();
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "c2"); await settle();
        idx = t.LearningStores.readIndex().index;
        ok(!idx.pending && idx.revision === 1 && s.getItem("PL_LearnedWordOverrides_2-B") === null, "retry finishes recovery");
    }

    {   // failed pending removal + fresh hydrate + persist: index stays valid,
        // key not written while pending, fresh value written after retry
        const s = makeStorage(), l = makeLocks(), lib = makeLib([]);
        const t = makeTab(s, l, lib);
        s.setItem("PL_LearnedWordOverrides_2-B", "old");
        s.setItem("PL_ModuleLearningOwner_v1", JSON.stringify({ v: 1, revision: 0, entries: {},
            tombstones: { "PL_LearnedWordOverrides_2-B": { erasedAtIndexRevision: 1 } },
            pending: { revision: 1, records: [{ key: "PL_LearnedWordOverrides_2-B", kind: "learnedWords", inputs: { identityKey: "2-B" } }] } }));
        s.failRemove.add("PL_LearnedWordOverrides_2-B");
        lib.current = "dB"; t.ParchLock.StoryPath = "games/b.z5.js";
        ok(t.LearningStores.read("PL_LearnedWordOverrides_2-B") === null, "fresh hydrate sees nothing");
        t.LearningStores.persist("learnedWords", { identityKey: "2-B" }, "fresh"); await settle();
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "other"); await settle();
        let r = t.LearningStores.readIndex();
        ok(r.ok && r.index.pending && r.index.tombstones["PL_LearnedWordOverrides_2-B"], "index valid while pending");
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "old" && t.LearningStores.pending() === 1, "pending key not written; snapshot kept");
        ok(s.getItem("PL_LearnedWordOverrides_3-C") === "other", "unrelated key commits");
        s.failRemove.clear();
        t.LearningStores.persist("learnedWords", { identityKey: "3-C" }, "other2"); await settle();
        r = t.LearningStores.readIndex();
        ok(r.ok && !r.index.pending && r.index.revision === 1 && !r.index.tombstones["PL_LearnedWordOverrides_2-B"], "erase finalized, tombstone cleared by fresh write");
        ok(s.getItem("PL_LearnedWordOverrides_2-B") === "fresh" && t.LearningStores.pending() === 0, "fresh value written after retry");
    }
    console.log("learning-stores: " + pass + " PASS, " + fail + " FAIL");
    process.exit(fail ? 1 : 0);
})();
