/* Local story-module library. Product-owned names use the final ParchLock namespace. */
var ModuleLibrary = (function () {
    "use strict";

    var DB_NAME = "parchlock-modules-v1";
    var DB_VERSION = 1;
    var STORE = "modules";
    var CACHE_KEY = "PL_Modules_Index";
    var HIDDEN_KEY = "PL_Modules_Hidden";
    var LOCAL_RE = /^local\/([0-9a-f]{64})\.(z3|z4|z5|z8|zblorb|gblorb|ulx)\.js$/;
    var MAX_STORY_BYTES = 64 * 1024 * 1024;
    var MAX_IFMD_BYTES = 512 * 1024;
    var listeners = [];
    var dbPromise = null;
    var ajaxInstalled = false;
    var executableIdentity = null;
    var executableIdentityPromise = Promise.resolve(null);
    var executableIdentityByPath = Object.create(null);
    var executableIdentityPromiseByPath = Object.create(null);
    var executableIdentitySequence = 0;
    var channel = null;
    var libraryRevision = 0; // D13: bumped on every library change
    var cache = loadJson(CACHE_KEY, []);
    var hidden = loadJson(HIDDEN_KEY, []);

    var LEGACY = Object.freeze({
        starred: "PL_Games_Starred",
        done: "PL_Games_Done",
        lastStory: "PL_LastStory",
        map: "PL_Map_",
        mapSlots: "PL_MapSlots_",
        gameId: "PL_GameId_"
    });

    function loadJson(key, fallback) {
        try {
            var parsed = JSON.parse(localStorage.getItem(key) || "null");
            return Array.isArray(parsed) ? parsed : fallback;
        } catch (e) { return fallback; }
    }

    function saveCache() {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
    }

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise(function (resolve, reject) {
            if (!window.indexedDB) return reject(new Error("Local module storage is unavailable."));
            var request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function () {
                var db = request.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error || new Error("Unable to open local module storage.")); };
        });
        return dbPromise;
    }

    function request(method, value) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var readonly = method === "get" || method === "getAll";
                var tx = db.transaction(STORE, readonly ? "readonly" : "readwrite");
                var store = tx.objectStore(STORE);
                var req = method === "get" ? store.get(value)
                    : method === "getAll" ? store.getAll()
                    : method === "put" ? store.put(value)
                    : store.delete(value);
                var result;
                req.onsuccess = function () {
                    result = req.result;
                    if (readonly) resolve(result);
                };
                tx.oncomplete = function () { if (!readonly) resolve(result); };
                tx.onerror = tx.onabort = function () {
                    reject(tx.error || req.error || new Error("Module storage operation failed."));
                };
            });
        });
    }

    function text(bytes, start, length) {
        var out = "";
        var end = Math.min(bytes.length, start + length);
        for (var i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
        return out;
    }

    function readU32(bytes, offset) {
        if (offset < 0 || offset + 4 > bytes.length) throw new Error("Truncated 32-bit field.");
        return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
    }

    function decodeBase64(value) {
        var raw;
        try { raw = atob(value); } catch (e) { throw new Error("Invalid base64 story wrapper."); }
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 255;
        return bytes;
    }

    function unwrap(bytes, filename) {
        if (!/\.js$/i.test(filename || "")) return bytes;
        if (bytes.length > MAX_STORY_BYTES * 2) throw new Error("Story wrapper is too large.");
        var source = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
        var match = source.match(/^processBase64Zcode\(\s*(['"])([A-Za-z0-9+/=]+)\1\s*\)\s*;?$/);
        if (!match) throw new Error("Unsupported JavaScript story wrapper.");
        return decodeBase64(match[2]);
    }

    function parseIfmd(bytes) {
        if (!bytes || !bytes.length) return {};
        if (bytes.length > MAX_IFMD_BYTES) throw new Error("IFmd metadata is too large.");
        var xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        if (/<!DOCTYPE/i.test(xml)) throw new Error("IFmd DOCTYPE is not allowed.");
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        if (doc.getElementsByTagName("parsererror").length) throw new Error("Invalid IFmd metadata.");
        function field(name) {
            var node = doc.getElementsByTagName(name)[0];
            var value = node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : "";
            return value.slice(0, 500);
        }
        return { title: field("title"), author: field("author"), headline: field("headline"), ifid: field("ifid") };
    }

    function inspectBlorb(bytes) {
        if (bytes.length < 12 || text(bytes, 0, 4) !== "FORM" || text(bytes, 8, 4) !== "IFRS") {
            throw new Error("Not a valid Blorb package.");
        }
        var formEnd = readU32(bytes, 4) + 8;
        if (formEnd !== bytes.length) throw new Error("Blorb FORM length does not match the file.");
        var chunks = [];
        var byOffset = {};
        var ifmd = {};
        for (var pos = 12; pos < formEnd;) {
            if (pos + 8 > formEnd) throw new Error("Truncated Blorb chunk header.");
            var type = text(bytes, pos, 4);
            var length = readU32(bytes, pos + 4);
            var dataStart = pos + 8;
            var dataEnd = dataStart + length;
            if (dataEnd < dataStart || dataEnd > formEnd) throw new Error("Blorb chunk extends outside the file.");
            var chunk = { type: type, offset: pos, start: dataStart, end: dataEnd, length: length };
            chunks.push(chunk);
            byOffset[pos] = chunk;
            if (type === "IFmd") ifmd = parseIfmd(bytes.slice(dataStart, dataEnd));
            pos = dataEnd + (length & 1);
            if (pos > formEnd) throw new Error("Invalid Blorb chunk padding.");
        }
        var ridx = chunks.filter(function (chunk) { return chunk.type === "RIdx"; });
        if (ridx.length !== 1) throw new Error("Blorb must contain exactly one resource index.");
        var index = ridx[0];
        if (index.length < 4) throw new Error("Truncated Blorb resource index.");
        var count = readU32(bytes, index.start);
        if (count > Math.floor((index.length - 4) / 12) || 4 + count * 12 !== index.length) {
            throw new Error("Invalid Blorb resource index length.");
        }
        var executables = [];
        for (var i = 0; i < count; i++) {
            var entry = index.start + 4 + i * 12;
            if (text(bytes, entry, 4) !== "Exec") continue;
            var chunk = byOffset[readU32(bytes, entry + 8)];
            if (!chunk || (chunk.type !== "ZCOD" && chunk.type !== "GLUL")) {
                throw new Error("Blorb executable index points outside a supported executable chunk.");
            }
            executables.push(chunk);
        }
        if (executables.length !== 1) throw new Error("Blorb must identify exactly one executable.");
        return { executable: bytes.slice(executables[0].start, executables[0].end), type: executables[0].type, metadata: ifmd };
    }

    function inspect(bytes, filename) {
        bytes = unwrap(bytes, filename);
        if (!bytes.length || bytes.length > MAX_STORY_BYTES) throw new Error("Story file is empty or exceeds 64 MB.");
        var metadata = {};
        var format;
        var compat;
        var executable = bytes;
        if (text(bytes, 0, 4) === "FORM") {
            var blorb = inspectBlorb(bytes);
            executable = blorb.executable;
            metadata = blorb.metadata;
            if (blorb.type === "ZCOD") {
                var zv = blorb.executable[0];
                if ([3, 4, 5, 8].indexOf(zv) < 0) throw new Error("Unsupported Z-machine version " + zv + ".");
                format = "zblorb";
                compat = "full Z-machine features";
            } else {
                validateGlulx(blorb.executable);
                format = "gblorb";
                compat = "Glulx play-only";
            }
        } else if (text(bytes, 0, 4) === "Glul") {
            validateGlulx(bytes);
            format = "ulx";
            compat = "Glulx play-only";
        } else {
            var version = bytes[0];
            if ([3, 4, 5, 8].indexOf(version) < 0 || bytes.length < 64) {
                throw new Error("Unsupported or invalid story format.");
            }
            format = "z" + version;
            compat = "full Z-machine features";
            metadata.release = (bytes[2] << 8) | bytes[3];
            metadata.serial = text(bytes, 18, 6).replace(/[^ -~]/g, "");
        }
        return { bytes: bytes, executableBytes: executable, format: format, compat: compat, metadata: metadata };
    }

    function validateGlulx(bytes) {
        if (bytes.length < 36 || text(bytes, 0, 4) !== "Glul") throw new Error("Invalid Glulx story.");
        var version = readU32(bytes, 4);
        if (version < 0x00020000 || version >= 0x00030200) {
            throw new Error("Unsupported Glulx version 0x" + version.toString(16) + ".");
        }
    }

    function sha256Fallback(bytes) {
        function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
        var k = [], primes = [], candidate = 2;
        while (primes.length < 64) {
            var prime = true;
            for (var d = 2; d * d <= candidate; d++) if (candidate % d === 0) { prime = false; break; }
            if (prime) { primes.push(candidate); k.push((Math.pow(candidate, 1 / 3) * 0x100000000) | 0); }
            candidate++;
        }
        var h = primes.slice(0, 8).map(function (p) { return (Math.sqrt(p) * 0x100000000) | 0; });
        var bitLength = bytes.length * 8;
        var paddedLength = ((bytes.length + 9 + 63) >> 6) << 6;
        var data = new Uint8Array(paddedLength);
        data.set(bytes);
        data[bytes.length] = 0x80;
        var view = new DataView(data.buffer);
        view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
        view.setUint32(paddedLength - 4, bitLength >>> 0, false);
        var w = new Int32Array(64);
        for (var off = 0; off < data.length; off += 64) {
            for (var i = 0; i < 16; i++) w[i] = view.getInt32(off + i * 4, false);
            for (i = 16; i < 64; i++) {
                var s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
                var s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
            }
            var a = h[0], b = h[1], c = h[2], d0 = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
            for (i = 0; i < 64; i++) {
                var s1e = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
                var ch = (e & f) ^ (~e & g);
                var t1 = (hh + s1e + ch + k[i] + w[i]) | 0;
                var s0a = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
                var maj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (s0a + maj) | 0;
                hh = g; g = f; f = e; e = (d0 + t1) | 0; d0 = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d0) | 0;
            h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
        }
        return h.map(function (n) { return (n >>> 0).toString(16).padStart(8, "0"); }).join("");
    }

    function hash(bytes) {
        if (window.crypto && crypto.subtle) {
            return crypto.subtle.digest("SHA-256", bytes).then(function (digest) {
                return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
            });
        }
        return Promise.resolve(sha256Fallback(bytes));
    }

    function cleanTitle(filename) {
        var name = String(filename || "Untitled story").replace(/\.js$/i, "").replace(/\.(z\d|zblorb|gblorb|ulx)$/i, "");
        return name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled story";
    }

    function metadata(record) {
        return {
            id: record.id, Filename: record.path, Path: record.path, Title: record.title,
            Author: record.author || "", Subtitle: record.subtitle || "", Format: record.format,
            Compat: record.compat, Size: record.size, AddedAt: record.addedAt, Local: true,
            MetadataOrigin: record.metadataOrigin
        };
    }

    function addFile(file) {
        return file.arrayBuffer().then(function (buffer) {
            var inspected = inspect(new Uint8Array(buffer), file.name);
            return hash(inspected.bytes).then(function (id) {
                var path = "local/" + id + "." + inspected.format + ".js";
                var info = inspected.metadata || {};
                var record = {
                    id: id, path: path, bytes: inspected.bytes.buffer.slice(inspected.bytes.byteOffset, inspected.bytes.byteOffset + inspected.bytes.byteLength),
                    title: info.title || cleanTitle(file.name), author: info.author || "", subtitle: info.headline || "",
                    format: inspected.format, compat: inspected.compat, size: inspected.bytes.length,
                    addedAt: new Date().toISOString(), filenameHint: String(file.name || "").slice(0, 255),
                    metadataOrigin: info.title || info.author ? "IFmd" : "filename"
                };
                var duplicate = cache.some(function (entry) { return entry.id === id; });
                return request("put", record).then(function () {
                    var item = metadata(record);
                    cache = cache.filter(function (entry) { return entry.id !== id; });
                    cache.push(item);
                    saveCache();
                    changed();
                    requestPersistence();
                    item.Duplicate = duplicate;
                    return item;
                });
            });
        });
    }

    function addFiles(files, progress) {
        var list = Array.prototype.slice.call(files || []);
        var results = [];
        return list.reduce(function (chain, file, index) {
            return chain.then(function () {
                if (progress) progress({ index: index, total: list.length, file: file.name });
                return addFile(file).then(function (item) {
                    results.push({ file: file.name, status: item.Duplicate ? "already present" : "added", item: item });
                }).catch(function (error) {
                    var reason = error && (error.name === "QuotaExceededError" || /quota/i.test(error.message || ""))
                        ? "Device storage is full or unavailable. Remove modules or free device storage, then retry."
                        : error.message || String(error);
                    results.push({ file: file.name, status: "rejected", reason: reason });
                });
            });
        }, Promise.resolve()).then(function () { return results; });
    }

    function requestPersistence() {
        try {
            if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        } catch (e) {}
    }

    function builtIns() {
        var source = Array.isArray(window.GameList) ? window.GameList : [];
        return source.filter(function (game) { return game && game.Filename; }).map(function (game) {
            return Object.assign({}, game, { Path: "games/" + game.Filename, Local: false, Compat: "built-in" });
        });
    }

    function all() {
        return builtIns().filter(function (game) { return hidden.indexOf(game.Path) < 0; }).concat(cache.slice());
    }

    function normalizePath(value) {
        var path = String(value || "").split(/[?#]/)[0];
        try { path = decodeURIComponent(path); } catch (e) {}
        return path.replace(/^\.\//, "");
    }

    function canonicalLocalPath(value) {
        var raw = String(value || "");
        if (/[?#]/.test(raw)) return null;
        var path = normalizePath(raw);
        return LOCAL_RE.test(path) ? path : null;
    }

    function find(value) {
        var path = normalizePath(value);
        return all().find(function (game) { return normalizePath(game.Path || ("games/" + game.Filename)) === path; }) || null;
    }

    function getBytes(value) {
        var path = canonicalLocalPath(value);
        if (!path) return Promise.reject(new Error("Invalid local module path."));
        var match = path.match(LOCAL_RE);
        return request("get", match[1]).then(function (record) {
            if (!record || record.path !== path) throw new Error("Local module is missing.");
            return new Uint8Array(record.bytes);
        });
    }

    function bytesToBase64(bytes) {
        var pieces = [];
        for (var i = 0; i < bytes.length; i += 0x8000) pieces.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
        return btoa(pieces.join(""));
    }

    function isExecutableStoryRequest(value) {
        return /\.(?:z3|z4|z5|z8|zblorb|ulx|gblorb)(?:\.js)?$/i.test(normalizePath(value));
    }

    // Product-owned story-response seam. lib/main.js receives the returned
    // base64 only after this promise resolves, then decodes the same response
    // and starts the selected VM. This records a digest of the executable ZCOD/GLUL
    // slice without patching the minified loader or racing a second fetch.
    function captureExecutableIdentity(base64, rawUrl) {
        if (!isExecutableStoryRequest(rawUrl) || typeof base64 !== "string") return Promise.resolve(base64);
        var sourcePath = normalizePath(rawUrl);
        var sourceName = sourcePath.replace(/\.js$/i, "");
        var sequence = ++executableIdentitySequence;
        var inspected;
        try {
            inspected = inspect(decodeBase64(base64), sourceName);
        } catch (e) {
            delete executableIdentityByPath[sourcePath];
            executableIdentityPromiseByPath[sourcePath] = Promise.resolve(null);
            if (sequence === executableIdentitySequence) executableIdentity = null;
            executableIdentityPromise = Promise.resolve(null);
            return Promise.resolve(base64);
        }
        if (!/^(?:z(?:3|4|5|8|blorb)|ulx|gblorb)$/.test(inspected.format)) return Promise.resolve(base64);
        var executable = inspected.executableBytes.slice();
        delete executableIdentityByPath[sourcePath];
        if (sequence === executableIdentitySequence) executableIdentity = null;
        var pending;
        try { pending = hash(executable); }
        catch (eHash) { pending = Promise.reject(eHash); }
        var safe = Promise.resolve(pending).then(function (digest) {
            var summary = Object.freeze({
                digest: digest,
                format: inspected.format,
                byteLength: executable.length,
                sourcePath: sourcePath,
                header: Object.freeze(Array.from(executable.subarray(0, 64)))
            });
            var identity = Object.freeze({
                digest: digest,
                format: inspected.format,
                byteLength: executable.length,
                sourcePath: sourcePath,
                bytes: executable,
                summary: summary
            });
            executableIdentityByPath[sourcePath] = identity;
            if (sequence === executableIdentitySequence) executableIdentity = identity;
            return identity;
        }, function () {
            delete executableIdentityByPath[sourcePath];
            if (sequence === executableIdentitySequence) executableIdentity = null;
            return null;
        });
        executableIdentityPromiseByPath[sourcePath] = safe;
        executableIdentityPromise = safe;
        return safe.then(function () { return base64; });
    }

    // D13/R7: side-effect-free executable digest of an installed module, over
    // the exact stored bytes and the same extraction as identity capture
    // (blorb Exec chunk). Never touches the current-story identity state.
    function executableDigestForPath(value) {
        var path = normalizePath(value);
        var item = find(path);
        if (!item) return Promise.reject(new Error("Module is not installed."));
        var load = item.Local
            ? getBytes(path).then(function (bytes) { return { bytes: bytes, name: path.replace(/\.js$/i, "") }; })
            : fetch(path).then(function (res) {
                if (!res.ok) throw new Error("Module bytes are unavailable.");
                return res.arrayBuffer();
            }).then(function (buffer) { return { bytes: new Uint8Array(buffer), name: path }; });
        return load.then(function (x) {
            var inspected = inspect(x.bytes, x.name);
            return hash(inspected.executableBytes.slice());
        });
    }

    function identityForPath(value) {
        var sourcePath = value ? normalizePath(value) : "";
        if (!sourcePath) {
            try {
                if (typeof ParchLock !== "undefined" && ParchLock.StoryPath) {
                    sourcePath = normalizePath(ParchLock.StoryPath);
                }
            } catch (e) {}
        }
        return sourcePath ? (executableIdentityByPath[sourcePath] || null) : executableIdentity;
    }

    function currentExecutableDigest(value) {
        var identity = identityForPath(value);
        return identity ? identity.digest : null;
    }

    function currentExecutableIdentity(value) {
        var identity = identityForPath(value);
        return identity ? identity.summary : null;
    }

    // Explicit opt-in for cold-path callers that truly need the whole file.
    function currentExecutableBytes(value) {
        var identity = identityForPath(value);
        return identity ? identity.bytes.slice() : null;
    }

    function whenExecutableIdentityReady(value) {
        var sourcePath = value ? normalizePath(value) : "";
        var pending = sourcePath ? executableIdentityPromiseByPath[sourcePath] : executableIdentityPromise;
        return (pending || Promise.resolve(null)).then(function () {
            return currentExecutableIdentity(sourcePath);
        });
    }

    function installAjaxAdapter() {
        if (ajaxInstalled || typeof jQuery === "undefined") return;
        var original = jQuery.ajax;
        jQuery.ajax = function () {
            var args = Array.prototype.slice.call(arguments);
            var options = typeof args[0] === "string" ? (args[1] || {}) : (args[0] || {});
            var rawUrl = typeof args[0] === "string" ? args[0] : options.url;
            var normalized = normalizePath(rawUrl);
            if (normalized.indexOf("local/") !== 0) {
                var requestResult = original.apply(this, args);
                if (!isExecutableStoryRequest(rawUrl)) return requestResult;
                var wrapped = requestResult.then(function (data) {
                    return captureExecutableIdentity(data, rawUrl);
                });
                if (requestResult.abort) wrapped.abort = function () { return requestResult.abort(); };
                return wrapped;
            }
            var deferred = jQuery.Deferred();
            var aborted = false;
            var promise = deferred.promise({ abort: function () { aborted = true; deferred.reject({ status: 0 }, "abort", "abort"); } });
            getBytes(rawUrl).then(function (bytes) {
                if (aborted) return;
                captureExecutableIdentity(bytesToBase64(bytes), rawUrl).then(function (data) {
                    if (!aborted) deferred.resolve(data, "success", promise);
                }).catch(function (error) {
                    if (!aborted) deferred.reject({ status: 422 }, "error", error.message || String(error));
                });
            }).catch(function (error) {
                if (!aborted) deferred.reject({ status: 404 }, "error", error.message || String(error));
            });
            return promise;
        };
        ajaxInstalled = true;
    }

    function removeFlags(path) {
        var filename = path.indexOf("games/") === 0 ? path.slice(6) : path;
        [LEGACY.starred, LEGACY.done].forEach(function (key) {
            var values = loadJson(key, []).filter(function (value) { return value !== path && value !== filename; });
            localStorage.setItem(key, JSON.stringify(values));
        });
        var last = localStorage.getItem(LEGACY.lastStory);
        if (last === path || last === filename) localStorage.removeItem(LEGACY.lastStory);
        // E3: uninstalling (remove, hide, remove-all) re-arms the module's
        // one-time inventory warning for a later reinstall.
        try { localStorage.removeItem(inventoryWarningKey(path)); } catch (eW) {}
        // D215: the map and label snapshots of its saves, keyed by the same
        // executable digest -- read before removeTranscript deletes that key.
        try { if (typeof SaveState !== "undefined") SaveState.removeStory(localStorage.getItem(transcriptDigestKey(path))); } catch (eSs) {}
        // E4: uninstalling removes the module's whole transcript.
        removeTranscript(path);
    }

    function transcriptDigestKey(value) {
        return "PL_TranscriptDigest_" + normalizePath(value);
    }
    function removeTranscript(path) {
        try {
            var key = transcriptDigestKey(path), digest = localStorage.getItem(key);
            if (!digest) return;
            localStorage.removeItem(key);
            localStorage.removeItem("PL_Transcript_" + digest);
            if (typeof indexedDB === "undefined") return;
            var req = indexedDB.open("ParchLockTranscripts", 1);
            req.onupgradeneeded = function () {
                var store = req.result.createObjectStore("lines", { keyPath: ["digest", "seq"] });
                store.createIndex("digest", "digest");
            };
            req.onsuccess = function () {
                try {
                    var tx = req.result.transaction("lines", "readwrite");
                    var cur = tx.objectStore("lines").index("digest").openCursor(IDBKeyRange.only(digest));
                    cur.onsuccess = function () { var c = cur.result; if (c) { c.delete(); c.continue(); } };
                } catch (eT) {}
            };
        } catch (e) {}
    }

    // E3: one seen-once flag per installed module (tutorial-style).
    function inventoryWarningKey(value) {
        return "PL_InvWarnSeen_" + normalizePath(value);
    }

    function removeLocal(path) {
        var item = find(path);
        if (!item || !item.Local) return Promise.resolve(false);
        return request("delete", item.id).then(function () {
            cache = cache.filter(function (entry) { return entry.id !== item.id; });
            removeFlags(item.Path);
            [LEGACY.map, LEGACY.mapSlots, LEGACY.gameId].forEach(function (prefix) { localStorage.removeItem(prefix + item.Path); });
            saveCache();
            changed();
            return true;
        });
    }

    function hideBuiltIn(path) {
        path = normalizePath(path);
        if (hidden.indexOf(path) < 0) hidden.push(path);
        removeFlags(path);
        saveCache();
        changed();
    }

    function removeAll() {
        var ids = cache.map(function (item) { return item.id; });
        return ids.reduce(function (chain, id) { return chain.then(function () { return request("delete", id); }); }, Promise.resolve())
            .then(function () {
                cache.forEach(function (item) { removeFlags(item.Path); });
                cache = [];
                var built = builtIns();
                built.forEach(function (item) { removeFlags(item.Path); });
                hidden = built.map(function (game) { return game.Path; });
                saveCache();
                changed();
            });
    }

    function renameLocal(path, title) {
        var item = find(path);
        title = String(title || "").replace(/\s+/g, " ").trim().slice(0, 200);
        if (!item || !item.Local) return Promise.reject(new Error("Imported module not found."));
        if (!title) return Promise.reject(new Error("A module name is required."));
        return request("get", item.id).then(function (record) {
            if (!record) throw new Error("Imported module not found.");
            record.title = title;
            record.metadataOrigin = "user";
            return request("put", record);
        }).then(function () { return reconcile(); });
    }

    function restoreBuiltIns() { hidden = []; saveCache(); changed(); }

    function reconcile(suppressBroadcast) {
        return request("getAll").then(function (records) {
            cache = records.map(metadata);
            saveCache();
            changed(!!suppressBroadcast);
            return cache;
        }).catch(function () { return cache; });
    }

    function changed(suppressBroadcast) {
        libraryRevision++;
        listeners.slice().forEach(function (listener) { try { listener(); } catch (e) {} });
        try { window.dispatchEvent(new CustomEvent("parchlock:modules-changed")); } catch (e) {}
        try { if (channel && !suppressBroadcast) channel.postMessage("changed"); } catch (e2) {}
    }

    function onChanged(listener) { if (typeof listener === "function") listeners.push(listener); }

    function formatSize(size) {
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
        return (size / (1024 * 1024)).toFixed(1) + " MB";
    }

    function renderManagerList() {
        var list = $("#pl-module-list").empty();
        var modules = all();
        var query = String($("#pl-module-search").val() || "").trim().toLowerCase();
        var total = modules.length;
        modules = modules.filter(function (item) {
            return !query || ((item.Title || "") + " " + (item.Author || "")).toLowerCase().indexOf(query) >= 0;
        });
        $("#pl-module-count").text(query ? modules.length + " of " + total : total + (total === 1 ? " story" : " stories"));
        if (!modules.length) list.append($("<p>").addClass("pl-module-empty").text(query ? "No stories match your search." : "Your library is ready for its first story."));
        modules.forEach(function (item) {
            var row = $("<div>").addClass("pl-module-row").appendTo(list);
            var info = $("<div>").addClass("pl-module-info").appendTo(row);
            $("<strong>").text(item.Title || "Untitled story").appendTo(info);
            $("<span>").addClass("pl-module-author").text(item.Author || "Author not listed").appendTo(info);
            var meta = $("<div>").addClass("pl-module-meta").appendTo(info);
            $("<span>").addClass("pl-module-badge").text(item.Local ? "Imported" : "Included").appendTo(meta);
            if (item.Format && item.Format !== "built-in") $("<span>").text(item.Format.toUpperCase()).appendTo(meta);
            if (item.Compat && item.Compat !== "built-in") $("<span>").text(item.Compat).appendTo(meta);
            if (item.Size) $("<span>").text(formatSize(item.Size)).appendTo(meta);
            var actions = $("<div>").addClass("pl-module-row-actions").appendTo(row);
            $("<button>").attr("type", "button").addClass("pl-module-remove").text(item.Local ? "Remove" : "Hide").on("click", function () {
                if (!confirm((item.Local ? "Remove " : "Hide ") + (item.Title || "this module") + "? Saves are kept.")) return;
                var result = item.Local ? removeLocal(item.Path) : Promise.resolve(hideBuiltIn(item.Path));
                Promise.resolve(result).then(renderManagerList);
            }).appendTo(actions);
            if (item.Local) {
                $("<button>").attr("type", "button").addClass("pl-module-edit").text("Rename").on("click", function () {
                    var next = prompt("Module name", item.Title || "");
                    if (next === null) return;
                    renameLocal(item.Path, next).then(renderManagerList).catch(function (error) {
                        $("#pl-module-progress").text(error.message || String(error));
                    });
                }).appendTo(actions);
            }
        });
    }

    function showResults(results) {
        var summary = results.reduce(function (counts, result) { counts[result.status] = (counts[result.status] || 0) + 1; return counts; }, {});
        $("#pl-module-progress").text((summary.added || 0) + " added, " + (summary["already present"] || 0) + " already present, " + (summary.rejected || 0) + " rejected.");
        var details = $("#pl-module-results").empty();
        results.forEach(function (result) {
            $("<li>").text(result.file + ": " + result.status + (result.reason ? " - " + result.reason : "")).appendTo(details);
        });
        renderManagerList();
    }

    function bindPicker(selector) {
        $(selector).off("change.plModules").on("change.plModules", function () {
            var input = this;
            addFiles(input.files, function (state) {
                $("#pl-module-progress").text("Inspecting " + (state.index + 1) + " of " + state.total + ": " + state.file);
            }).then(showResults);
        });
    }

    function openManager() {
        var uploadIcon = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5'/></svg>";
        var folderIcon = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 7V5h7l2 3h9v12H3V7Z'/></svg>";
        var body = "<div class='pl-module-manager'>" +
            "<p class='pl-module-intro'>Bring your next story along.</p>" +
            "<div class='pl-module-actions'><label class='pl-module-import-card pl-module-primary'><span class='pl-module-import-icon'>" + uploadIcon + "</span><span class='pl-module-action-title'>Choose files</span><span class='pl-module-action-detail'>Add one story or a few</span><input id='pl-module-files' aria-label='Add module files' type='file' multiple accept='.z3,.z4,.z5,.z8,.zblorb,.gblorb,.ulx,.js'></label>" +
            "<label class='pl-module-import-card'><span class='pl-module-import-icon'>" + folderIcon + "</span><span class='pl-module-action-title'>Choose folder</span><span class='pl-module-action-detail'>Bring a collection</span><input id='pl-module-folder' aria-label='Add module folder' type='file' multiple webkitdirectory></label></div>" +
            "<p id='pl-module-progress' aria-live='polite'></p><ul id='pl-module-results'></ul>" +
            "<section class='pl-module-collection' aria-label='Installed stories'><div class='pl-module-list-heading'><h3>Your stories</h3><span id='pl-module-count'></span></div><input id='pl-module-search' type='search' placeholder='Find a story or author' aria-label='Search installed stories'><div id='pl-module-list'></div></section>" +
            "<details class='pl-module-library-options'><summary>Library options</summary><div class='pl-module-maintenance'><button id='pl-module-restore' type='button'>Restore built-ins</button><button id='pl-module-remove-all' type='button'>Remove all</button></div></details>" +
            "<p class='pl-module-permission'>Only add stories you have permission to use.</p><details class='pl-module-format-note'><summary>Supported formats &amp; storage</summary><p>Z-machine: .z3, .z4, .z5, .z8 and .zblorb. Glulx: .ulx and .gblorb. Compatible .js files are also accepted. ParchLock checks compatibility, not ownership or permission.</p><p>Z-machine modules support mapping, actions and radials. Glulx modules are play-only.</p><p class='pl-module-storage-note'>Imported stories stay on this device. Clearing browser or app storage removes imported modules and local state.</p></details></div>";
        Message.Show("Modules", body, true);
        $("#message #close").text("\u2715").attr("aria-label", "Close");
        bindPicker("#pl-module-files");
        bindPicker("#pl-module-folder");
        $("#pl-module-search").on("input", renderManagerList);
        $("#pl-module-remove-all").on("click", function () {
            if (confirm("Remove all imported modules and hide all built-ins? Saves are kept.")) removeAll().then(renderManagerList);
        });
        $("#pl-module-restore").on("click", function () { restoreBuiltIns(); renderManagerList(); });
        renderManagerList();
    }

    function init() {
        installAjaxAdapter();
        if (!channel && typeof BroadcastChannel !== "undefined") {
            channel = new BroadcastChannel("parchlock-modules-v1");
            channel.onmessage = function () { reconcile(true); };
        }
        window.addEventListener("storage", function (event) {
            if (event.key === CACHE_KEY || event.key === HIDDEN_KEY) {
                cache = loadJson(CACHE_KEY, []);
                hidden = loadJson(HIDDEN_KEY, []);
                listeners.slice().forEach(function (listener) { try { listener(); } catch (e) {} });
            }
        });
        return reconcile();
    }

    if (!Array.isArray(window.GameList)) window.GameList = [];
    installAjaxAdapter();

    return {
        init: init, all: all, find: find, getBytes: getBytes, addFile: addFile, addFiles: addFiles,
        removeLocal: removeLocal, hideBuiltIn: hideBuiltIn, removeAll: removeAll, inventoryWarningKey: inventoryWarningKey, transcriptDigestKey: transcriptDigestKey,
        restoreBuiltIns: restoreBuiltIns, renameLocal: renameLocal, openManager: openManager, onChanged: onChanged,
        reconcile: reconcile, inspect: inspect, hash: hash, sha256Fallback: sha256Fallback,
        currentExecutableDigest: currentExecutableDigest,
        executableDigestForPath: executableDigestForPath, libraryRevision: function () { return libraryRevision; },
        currentExecutableBytes: currentExecutableBytes,
        currentExecutableIdentity: currentExecutableIdentity, whenExecutableIdentityReady: whenExecutableIdentityReady,
        normalizePath: normalizePath, canonicalLocalPath: canonicalLocalPath, localPathPattern: LOCAL_RE, legacy: LEGACY
    };
})();
