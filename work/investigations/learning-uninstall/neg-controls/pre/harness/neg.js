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
    console.log("neg: " + pass + " PASS, " + fail + " FAIL");
})();
