/* E4 (operator 2026-10-07): a running transcript per module, attached to saves.
 *
 * Lines become permanent only when a save is made (operator rule). Until then
 * the current line of play is held in memory. A successful save writes those
 * lines to IndexedDB and drops an invisible "token" recording exactly which
 * parts of the stream make up the story so far; loading that save shows those
 * parts and continues from there. Nothing a save still uses is ever erased;
 * deleting a save deletes the lines only it used; uninstalling the module
 * deletes everything (ModuleLibrary.removeTranscript).
 *
 *   view       = list of stream ranges [[from, to|null], ...] (null = open)
 *   save token = the view at the moment the save file was written
 *   restore    = view := token ranges + a new open range
 *   new game   = view := one new open range (unsaved lines are dropped)
 *
 * Capture: each top-level BufferLine is recorded when finished (not holding
 * the live prompt) and visible; probe-owned / aria-hidden output is skipped
 * until released (D207). A line that grows later is updated in place; lines
 * removed from the screen (restore/clear) are captured from the observer's
 * removed nodes before they are lost.
 *
 * Evidence: the native Dialog (shared by ZVM and Quixe) is wrapped on the
 * first VM opcode (js/ZvmCapture.js). A save attaches only when file_write of
 * the chosen save file succeeds. A Z-code restore commits on the VM's
 * successful restore_file; a Glulx restore commits on successful vm_restore,
 * after the engine validates the file. An engine autosave restore keeps the view; an
 * unobserved one is treated as a fresh start (only unsaved lines are lost).
 * Storage failure marks the transcript incomplete; gameplay is never touched.
 */
var Transcript = {
    DB_NAME: "ParchLockTranscripts",
    _db: null,
    digest: null,
    meta: null,           // persisted: { length, view, saves: {name: ranges}, incomplete }
    _live: [],            // unsaved lines of the current view: [{seq, text}]
    _lineInfo: (typeof WeakMap !== "undefined") ? new WeakMap() : null,  // el -> live entry
    _booting: true,
    _autorestored: false,
    _choice: null,        // { usage: "save"|"restore", name, at }
    _flushChain: Promise.resolve(),
    _timer: null,

    // Loaded scripts can expose Quixe before the story starts. Hook its
    // prepare boundary so the shared Dialog is observed before the first SAVE.
    attachEngines: function () {
        try {
            if (typeof window === "undefined") return;
            var q = window.Quixe;
            if (q && !q.__plTranscriptPrepared && typeof q.prepare === "function") {
                var prepare = q.prepare;
                q.__plTranscriptPrepared = true;
                q.prepare = function (bytes, options) {
                    if (options) {
                        Transcript.hookDialog(options.Dialog);
                        var io = options.io;
                        if (io && typeof io.restore_allstate === "function" && !io.__plTranscriptRestore) {
                            var restoreState = io.restore_allstate;
                            io.__plTranscriptRestore = true;
                            io.restore_allstate = function () {
                                var result = restoreState.apply(this, arguments);
                                Transcript._autorestored = true;
                                return result;
                            };
                        }
                    }
                    return prepare.apply(this, arguments);
                };
            }
            var self = q && q.get_vm_internals && q.get_vm_internals();
            ["vm_restore", "vm_restart"].forEach(function (name) {
                if (!self || typeof self[name] !== "function" || self[name].__plTranscriptWrapped) return;
                var original = self[name];
                var wrapped = function () {
                    var result = original.apply(this, arguments);
                    Transcript.onVmEvent(name === "vm_restore" ? "restore_file" : "restart", name === "vm_restart" || result, false);
                    return result;
                };
                wrapped.__plTranscriptWrapped = true;
                self[name] = wrapped;
            });
            var iface = window.GlkOte && window.GlkOte.getinterface && window.GlkOte.getinterface();
            if (iface) Transcript.hookDialog(iface.Dialog);
        } catch (e) {}
    },

    metaKey: function () { return "PL_Transcript_" + Transcript.digest; },
    loadMeta: function () {
        var m = null;
        try { m = JSON.parse(localStorage.getItem(Transcript.metaKey()) || "null"); } catch (e) {}
        if (!m || typeof m.length !== "number" || !Array.isArray(m.view)) m = { length: 0, view: [], saves: {}, incomplete: false };
        m.saves = m.saves || {};
        return m;
    },
    saveMeta: function () {
        try { localStorage.setItem(Transcript.metaKey(), JSON.stringify(Transcript.meta)); }
        catch (e) { Transcript.meta.incomplete = true; }
    },
    markIncomplete: function () {
        if (!Transcript.meta || Transcript.meta.incomplete) return;
        Transcript.meta.incomplete = true;
        Transcript.saveMeta();
    },

    db: function () {
        if (Transcript._db) return Transcript._db;
        Transcript._db = new Promise(function (resolve, reject) {
            try {
                var req = indexedDB.open(Transcript.DB_NAME, 1);
                req.onupgradeneeded = function () {
                    var store = req.result.createObjectStore("lines", { keyPath: ["digest", "seq"] });
                    store.createIndex("digest", "digest");
                };
                req.onsuccess = function () { resolve(req.result); };
                req.onerror = function () { reject(req.error); };
            } catch (e) { reject(e); }
        });
        return Transcript._db;
    },

    // ---- lifecycle -----------------------------------------------------
    // The executable identity is registered after page load; wait for it.
    init: function (tries) {
        try {
            if (Transcript.digest) return;
            var digest = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableDigest
                ? ModuleLibrary.currentExecutableDigest() : null;
            if (!digest) {
                if ((tries || 0) < 400) setTimeout(function () { Transcript.init((tries || 0) + 1); }, 150);
                return;
            }
            Transcript.digest = digest;
            Transcript.storyPath = typeof ParchLock !== "undefined" ? ParchLock.StoryPath || "" : "";
            Transcript.attachEngines();
            Transcript.meta = Transcript.loadMeta();
            try {
                var path = (typeof ParchLock !== "undefined" && (ParchLock.StoryPath || ParchLock.GameFilename)) || "";
                if (path && ModuleLibrary.transcriptDigestKey) localStorage.setItem(ModuleLibrary.transcriptDigestKey(path), digest);
            } catch (eP) {}
            Transcript.observe();
        } catch (e) {}
    },
    openRange: function () { Transcript.meta.view.push([Transcript.meta.length, null]); },
    closeView: function () {
        return Transcript.meta.view.map(function (r) { return [r[0], r[1] == null ? Transcript.meta.length : r[1]]; });
    },
    // Export naming: the save the current line of play came from (if any).
    currentSaveLabel: null,
    resetView: function (ranges) {
        Transcript.currentSaveLabel = null;
        Transcript._live = [];   // unsaved lines of the abandoned line of play are dropped
        Transcript.meta.view = (ranges || []).map(function (r) { return [r[0], r[1]]; });
        Transcript.openRange();
        Transcript.saveMeta();
    },
    // From js/ZvmCapture.js after a VM restart / restore_file returned.
    onVmEvent: function (name, success, isAutorestore) {
        try {
            if (name === "restart") {
                var submitted = typeof TurnRecorder !== "undefined" && TurnRecorder._submissionId > 0;
                if (Transcript._booting && !submitted) return; // boot is not a new human playthrough
                if (typeof SaveState !== "undefined") SaveState.onLifecycle("restart");
                if (!Transcript.meta) return;
                Transcript.collect();
                Transcript.resetView([]);
                // Save-owned state already observed the successful restart above.
            } else if (name === "restore_file" && success) {
                if (isAutorestore) { Transcript._autorestored = true; return; }
                Transcript.commitRestore();
            }
        } catch (e) {}
    },
    commitRestore: function () {
        var c = Transcript._choice;
        Transcript._choice = null;
        var earlyName = c && c.usage === "restore" && c.name && Date.now() - c.at < 120000 ? c.name : "";
        if (!Transcript.meta) {
            if (typeof SaveState !== "undefined") SaveState.onLifecycle("restore", { name: earlyName });
            return;
        }
        Transcript.collect();
        var token = c && c.usage === "restore" && Date.now() - c.at < 120000 ? Transcript.meta.saves[c.name] : null;
        Transcript.resetView(token || []);
        // The loaded save names the transcript export even when it predates
        // transcripts (no token): the restore itself succeeded with that file.
        var restoredName = c && c.usage === "restore" && c.name && Date.now() - c.at < 120000 ? c.name : "";
        if (restoredName) Transcript.currentSaveLabel = restoredName;
        // D215: stage that save's map and labels; resync applies them. A
        // successful restore whose save is unknown restores a clean state.
        if (typeof SaveState !== "undefined") SaveState.onLifecycle("restore", { name: restoredName });
        Transcript.append("[Restored" + (c && c.name ? " “" + c.name + "”" : "") + "]");
    },
    commitSave: function (name) {
        if (!Transcript.meta) {
            if (typeof SaveState !== "undefined") SaveState.onLifecycle("save", { name: name });
            return;
        }
        Transcript.collect();
        var toWrite = Transcript._live.slice();
        Transcript.meta.saves[name] = Transcript.closeView();   // the invisible token
        Transcript.saveMeta();
        Transcript.writeLines(toWrite);
        // D215: the map and item labels are saved with the game as well.
        if (typeof SaveState !== "undefined") SaveState.onLifecycle("save", { name: name });
    },

    // ---- native Dialog (shared by ZVM and Quixe) -----------------------
    nameOf: function (dirent) {
        if (!dirent) return "";
        if (dirent.filename) return String(dirent.filename);
        var key = String(dirent.dirent || dirent || "");
        return key.split(":").slice(3).join(":");
    },
    isSaveDirent: function (dirent) {
        var key = String((dirent && (dirent.dirent || dirent.usage)) || "");
        return /save/i.test(key) || /save/i.test(String(dirent && dirent.usage || ""));
    },
    hookDialog: function (dlg) {
        if (!dlg || dlg.__plTranscriptWrapped) return;
        dlg.__plTranscriptWrapped = true;
        if (typeof dlg.open === "function") {
            var open = dlg.open;
            dlg.open = function (toSave, usage, gameid, callback) {
                var args = Array.prototype.slice.call(arguments);
                if (typeof callback === "function") {
                    args[3] = function (dirent) {
                        try {
                            if (dirent && /save/i.test(String(usage))) {
                                Transcript._choice = { usage: toSave ? "save" : "restore", name: Transcript.nameOf(dirent), at: Date.now() };
                            }
                        } catch (eC) {}
                        return callback.apply(this, arguments);
                    };
                }
                return open.apply(this, args);
            };
        }
        if (typeof dlg.file_write === "function") {
            var write = dlg.file_write;
            dlg.file_write = function (dirent) {
                var ok = write.apply(this, arguments);
                try {
                    var c = Transcript._choice;
                    if (ok && c && c.usage === "save" && Transcript.isSaveDirent(dirent)
                        && Transcript.nameOf(dirent) === c.name) {
                        Transcript._choice = null;
                        Transcript.commitSave(c.name);
                    }
                } catch (eW) {}
                return ok;
            };
        }
    },
    isGlulx: function () {
        try {
            var id = ModuleLibrary.currentExecutableIdentity();
            return !!(id && /^(?:gblorb|ulx|glulx)$/i.test(String(id.format || "")));
        } catch (e) { return false; }
    },

    // ---- capture -------------------------------------------------------
    observe: function () {
        if (typeof MutationObserver === "undefined") return;
        var port = document.getElementById("windowport");
        if (!port) { setTimeout(Transcript.observe, 300); return; }
        new MutationObserver(function (mutations) {
            // Lines leaving the screen (restore, clear) are finished: take them now.
            mutations.forEach(function (m) {
                Array.prototype.forEach.call(m.removedNodes || [], function (n) {
                    if (n.nodeType !== 1) return;
                    var lines = n.classList && n.classList.contains("BufferLine") ? [n] : Array.prototype.slice.call(n.querySelectorAll ? n.querySelectorAll(".BufferLine") : []);
                    lines.forEach(function (el) { Transcript.recordLine(el, true); });
                });
            });
            clearTimeout(Transcript._timer);
            Transcript._timer = setTimeout(Transcript.collect, 300);
        }).observe(port, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "aria-hidden"] });
        Transcript.collect();
    },
    lineText: function (el) {
        var parts = [];
        (function walk(n) {
            Array.prototype.forEach.call(n.childNodes || [], function (c) {
                if (c.nodeType === 3) { parts.push(c.nodeValue || ""); return; }
                if (c.nodeType !== 1) return;
                if (c.classList && (c.classList.contains("pl-stat-probe") || c.classList.contains("pl-carry-probe"))) return;
                if (c.getAttribute && c.getAttribute("aria-hidden") === "true") return;
                walk(c);
            });
        })(el);
        return parts.join("").replace(/ /g, " ").replace(/\s+$/, "");
    },
    hiddenLine: function (el, detached) {
        // closest also traverses ancestors in a removed subtree.
        return !!el.closest(".pl-stat-probe, .pl-carry-probe, [aria-hidden='true']");
    },
    recordLine: function (el, detached) {
        if (!Transcript.meta || !Transcript._lineInfo) return;
        if (!detached && el.parentElement && el.parentElement.closest && el.parentElement.closest(".BufferLine")) return;
        if (el.querySelector(".Input, .LineInput, .CharInput, .InvisibleCursor")) return;   // live prompt: not finished
        if (Transcript.hiddenLine(el, detached)) return;                                      // hidden until released
        var text = Transcript.lineText(el), entry = Transcript._lineInfo.get(el);
        if (entry) {
            // The same line grew (or re-wrapped): update the unsaved copy in place.
            if (text !== entry.text) {
                if (text.indexOf(entry.text) !== 0) {
                    Transcript._lineInfo.set(el, Transcript.append(text));
                    return;
                }
                if (Transcript._live.indexOf(entry) >= 0) entry.text = text;
                else {
                    // A saved prefix belongs to that save forever. Capture
                    // subsequent output as an unsaved suffix, without rewriting it.
                    Transcript.append(text.slice(entry.text.length));
                    Transcript._lineInfo.set(el, { text: text });
                }
            }
            return;
        }
        entry = Transcript.append(text);
        Transcript._lineInfo.set(el, entry);
    },
    collect: function () {
        try {
            if (!Transcript.meta) return;
            var lines = document.querySelectorAll("#windowport .BufferWindow .BufferLine");
            if (Transcript._booting && lines.length) {
                Transcript._booting = false;
                Transcript.reconcileSaves();
                // Same line of play only after an OBSERVED engine autorestore.
                if (!(Transcript._autorestored && Transcript.meta.view.length)) {
                    Transcript.resetView([]);
                    // D215: a fresh start is a new game for the map too.
                    if (typeof SaveState !== "undefined") SaveState.onLifecycle("boot");
                }
            }
            Array.prototype.forEach.call(lines, function (el) { Transcript.recordLine(el, false); });
        } catch (e) {}
    },
    append: function (text) {
        var entry = { seq: Transcript.meta.length++, text: String(text || "") };
        Transcript._live.push(entry);
        return entry;
    },

    // ---- storage -------------------------------------------------------
    // Sequential, so readers can await every outstanding write.
    writeLines: function (lines) {
        var digest = Transcript.digest;
        if (!lines || !lines.length || !digest) return Transcript._flushChain;
        Transcript._live = Transcript._live.filter(function (l) { return lines.indexOf(l) < 0; });
        Transcript._flushChain = Transcript._flushChain.then(function () { return Transcript.db(); }).then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction("lines", "readwrite"), store = tx.objectStore("lines");
                lines.forEach(function (l) { store.put({ digest: digest, seq: l.seq, text: l.text }); });
                tx.oncomplete = function () { resolve(); };
                tx.onerror = tx.onabort = function () { Transcript.markIncomplete(); resolve(); };
            });
        }).catch(function () { Transcript.markIncomplete(); });
        return Transcript._flushChain;
    },
    readRange: function (db, digest, from, to) {
        return new Promise(function (resolve) {
            var out = [];
            try {
                var req = db.transaction("lines").objectStore("lines").openCursor(IDBKeyRange.bound([digest, from], [digest, to - 1]));
                req.onsuccess = function () { var c = req.result; if (c) { out.push({ seq: c.value.seq, text: c.value.text }); c.continue(); } else resolve(out); };
                req.onerror = function () { Transcript.markIncomplete(); resolve(out); };
            } catch (e) { Transcript.markIncomplete(); resolve(out); }
        });
    },
    // Lines of the given ranges: stored ones plus unsaved ones, in order.
    linesFor: function (ranges) {
        var digest = Transcript.digest;
        var inRanges = function (seq) { return ranges.some(function (r) { return seq >= r[0] && seq < r[1]; }); };
        var live = Transcript._live.filter(function (l) { return inRanges(l.seq); }).map(function (l) { return { seq: l.seq, text: l.text }; });
        return Transcript._flushChain.then(function () { return Transcript.db(); }).then(function (db) {
            return Promise.all(ranges.filter(function (r) { return r[1] > r[0]; }).map(function (r) { return Transcript.readRange(db, digest, r[0], r[1]); }));
        }, function () { Transcript.markIncomplete(); return []; }).then(function (parts) {
            var bySeq = {};
            [].concat.apply([], parts || []).concat(live).forEach(function (l) { bySeq[l.seq] = l.text; });
            return ranges.reduce(function (out, r) {
                Object.keys(bySeq).map(Number).filter(function (s) { return s >= r[0] && s < r[1]; })
                    .sort(function (a, b) { return a - b; }).forEach(function (s) { out.push(bySeq[s]); });
                return out;
            }, []);
        });
    },

    // ---- self-cleaning (operator) -------------------------------------
    signature: function () {
        try {
            if (typeof ParchLock !== "undefined" && ParchLock.GameId) return ParchLock.GameId;
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            if (!mem || mem.length < 30) return "";
            var s = "";
            for (var i = 0; i < 30; i++) s += (mem[i] < 16 ? "0" : "") + mem[i].toString(16);
            return s;
        } catch (e) { return ""; }
    },
    // A save deleted anywhere (Save/Restore window or the native dialog) takes
    // its transcript with it.
    reconcileSaves: function () {
        var sig = Transcript.signature();
        if (!sig || !Transcript.meta) return;
        var gone = Object.keys(Transcript.meta.saves).filter(function (n) {
            try { return localStorage.getItem("dirent:save:" + sig + ":" + n) == null; } catch (e) { return false; }
        });
        if (gone.length) Transcript.forgetSaves(gone);
    },
    forgetSaves: function (names) {
        if (!Transcript.meta) return Promise.resolve();
        (names || []).forEach(function (n) { delete Transcript.meta.saves[n]; });
        if (typeof SaveState !== "undefined") SaveState.onLifecycle("forget", { names: names || [] });
        Transcript.saveMeta();
        return Transcript.collectGarbage();
    },
    // Delete stored lines no remaining save (and not the current view) uses.
    collectGarbage: function () {
        if (!Transcript.meta || !Transcript.digest) return Promise.resolve();
        var keep = Transcript.closeView();
        Object.keys(Transcript.meta.saves).forEach(function (n) { keep = keep.concat(Transcript.meta.saves[n]); });
        var used = function (seq) { return keep.some(function (r) { return seq >= r[0] && seq < r[1]; }); };
        var digest = Transcript.digest;
        Transcript._flushChain = Transcript._flushChain.then(function () { return Transcript.db(); }).then(function (db) {
            return new Promise(function (resolve) {
                var tx = db.transaction("lines", "readwrite");
                var req = tx.objectStore("lines").index("digest").openCursor(IDBKeyRange.only(digest));
                req.onsuccess = function () { var c = req.result; if (!c) return; if (!used(c.value.seq)) c.delete(); c.continue(); };
                tx.oncomplete = tx.onerror = tx.onabort = function () { resolve(); };
            });
        }).catch(function () {});
        return Transcript._flushChain;
    },

    // ---- save packages -------------------------------------------------
    exportFor: function (names) {
        if (!Transcript.meta || !Transcript.digest) return Promise.resolve(null);
        var picked = (names || []).filter(function (n) { return Transcript.meta.saves[n]; });
        if (!picked.length) return Promise.resolve(null);
        var out = { version: 1, digest: Transcript.digest, saves: {} };
        return Promise.all(picked.map(function (n) {
            return Transcript.linesFor(Transcript.meta.saves[n]).then(function (lines) { out.saves[n] = lines; });
        })).then(function () { return out; }, function () { return null; });
    },
    // Validated BEFORE the package mutates anything.
    validImport: function (t) {
        if (t == null) return true;
        if (typeof t !== "object" || t.version !== 1 || typeof t.saves !== "object" || !t.saves) return false;
        if (Transcript.digest && t.digest !== Transcript.digest) return false;
        var total = 0;
        return Object.keys(t.saves).every(function (n) {
            var lines = t.saves[n];
            return typeof n === "string" && n.length < 256 && Array.isArray(lines) && lines.every(function (s) {
                total += typeof s === "string" ? s.length : 1e9;
                return typeof s === "string";
            });
        }) && total < 8 * 1024 * 1024;
    },
    // Each imported save's lines are stored as its own range.
    importRecords: function (t) {
        if (!t || !Transcript.meta) return Promise.resolve();
        var all = [];
        Object.keys(t.saves).forEach(function (n) {
            var start = Transcript.meta.length;
            t.saves[n].forEach(function (s) { all.push({ seq: Transcript.meta.length++, text: s }); });
            Transcript.meta.saves[n] = [[start, Transcript.meta.length]];
        });
        Transcript.saveMeta();
        return Transcript.writeLines(all);
    },

    // ---- reading -------------------------------------------------------
    getText: function () {
        if (!Transcript.meta || !Transcript.digest) return Promise.resolve(null);
        Transcript.collect();
        return Transcript.linesFor(Transcript.closeView()).then(function (lines) {
            if (!lines.length) return null;
            var text = lines.join("\n");
            if (Transcript.meta.incomplete) text = "[Transcript incomplete: storage was unavailable for part of this story]\n\n" + text;
            return text;
        }, function () { return null; });
    }
};
if (typeof document !== "undefined") {
    document.addEventListener("load", function (event) {
        if (event.target && event.target.tagName === "SCRIPT") Transcript.attachEngines();
    }, true);
    Transcript.attachEngines();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { Transcript.init(0); });
    else Transcript.init(0);
}
