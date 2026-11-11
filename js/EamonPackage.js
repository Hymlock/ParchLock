/* EamonPackage - installing the Eamon Showcase through the ordinary Modules importer.
 *
 * The Showcase is one file: a gzip stream holding "PLEAMON1\n", a 4-byte little-endian header length, a
 * JSON header {title, version, files: [{path, size, sha256}]} and then every file's bytes in that order.
 * It carries the Eamon CS engine build and the game data, which is executable content. ParchLock
 * therefore runs a package only when the SHA-256 of the whole file is one this app release approves
 * (TRUSTED below). A package's own member hashes prove it arrived intact; they do not prove who made it.
 *
 * Installed files are kept in a Cache Storage bucket named for the package and served to the engine by
 * the service worker at lib/eamon/pkg/<digest>/... . Campaign progress lives elsewhere and is not
 * touched by installing or removing the package.
 */
var EamonPackage = (function () {
    "use strict";

    // Approved Showcase releases for this app build: SHA-256 of the package file -> label.
    var TRUSTED = {
        /*TRUSTED-BEGIN*/
        "a4f77d988f7e03e1500e07ba495cd59174d3e4ccdb5e4232efff792c1db19d80": "Eamon Showcase 0.1.0-dev"
        /*TRUSTED-END*/
    };
    var MAGIC = "PLEAMON1\n";
    var MAX_PACKAGE_BYTES = 96 * 1024 * 1024;
    var MIME = { ".wasm": "application/wasm", ".js": "text/javascript", ".json": "application/json", ".dat": "application/octet-stream" };

    function cacheName(id) { return "parchlock-eamon-pkg-" + id; }
    function baseUrl(id) { return new URL("lib/eamon/pkg/" + id + "/", document.baseURI).href; }
    function hex(buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("");
    }
    function sha256(bytes) { return crypto.subtle.digest("SHA-256", bytes).then(hex); }

    // A gzip stream begins 1f 8b; nothing ParchLock otherwise imports does.
    function looksLikePackage(bytes, filename) {
        return bytes.length > 18 && bytes[0] === 0x1f && bytes[1] === 0x8b && /\.eamon$/i.test(String(filename || ""));
    }

    function gunzip(bytes) {
        if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("This device cannot unpack the Eamon Showcase."));
        return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
            .then(function (buffer) { return new Uint8Array(buffer); });
    }

    function parse(bytes) {
        var magic = new TextDecoder().decode(bytes.subarray(0, MAGIC.length));
        if (magic !== MAGIC) throw new Error("Not an Eamon Showcase package.");
        var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var headerLength = view.getUint32(MAGIC.length, true);
        var start = MAGIC.length + 4;
        if (headerLength < 2 || start + headerLength > bytes.length) throw new Error("Eamon Showcase package is damaged.");
        var header = JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + headerLength)));
        if (!header || !Array.isArray(header.files) || !header.files.length) throw new Error("Eamon Showcase package is damaged.");
        var offset = start + headerLength;
        var files = header.files.map(function (entry) {
            var path = String(entry.path || "");
            // Member paths are plain relative paths; nothing may climb out of the package folder.
            if (!path || /^[\/\\]|(^|[\/\\])\.\.([\/\\]|$)|[\\:?#]/.test(path)) throw new Error("Eamon Showcase package has an unsafe file name.");
            if (!(entry.size >= 0) || offset + entry.size > bytes.length) throw new Error("Eamon Showcase package is damaged.");
            var data = bytes.subarray(offset, offset + entry.size);
            offset += entry.size;
            return { path: path, sha256: String(entry.sha256 || ""), data: data };
        });
        if (offset !== bytes.length) throw new Error("Eamon Showcase package is damaged.");
        return { header: header, files: files };
    }

    function verify(files) {
        return files.reduce(function (chain, file) {
            return chain.then(function () {
                return sha256(file.data).then(function (actual) {
                    if (actual !== file.sha256) throw new Error("Eamon Showcase package failed its integrity check (" + file.path + ").");
                });
            });
        }, Promise.resolve());
    }

    function isInstalled(id) {
        if (typeof caches === "undefined") return Promise.resolve(false);
        return caches.has(cacheName(id)).then(function (has) {
            if (!has) return false;
            return caches.open(cacheName(id)).then(function (cache) { return cache.match(baseUrl(id) + ".installed"); }).then(function (hit) { return !!hit; });
        });
    }

    /* Returns {id, title, version, size}. Everything is checked before anything is stored, and the
       ".installed" marker is written last, so an interrupted import is never mistaken for a package. */
    function install(bytes) {
        if (!window.isSecureContext || typeof caches === "undefined" || !window.crypto || !crypto.subtle) {
            return Promise.reject(new Error("The Eamon Showcase needs ParchLock opened from the app, the launcher or an https address."));
        }
        if (bytes.length > MAX_PACKAGE_BYTES) return Promise.reject(new Error("Eamon Showcase package is too large."));
        var id, parsed;
        return sha256(bytes).then(function (digest) {
            id = digest;
            if (!Object.prototype.hasOwnProperty.call(TRUSTED, id)) {
                throw new Error("This Eamon package is not a release approved for this version of ParchLock.");
            }
            return gunzip(bytes);
        }).then(function (raw) {
            parsed = parse(raw);
            return verify(parsed.files);
        }).then(function () {
            return caches.delete(cacheName(id));
        }).then(function () {
            return caches.open(cacheName(id));
        }).then(function (cache) {
            var base = baseUrl(id);
            return parsed.files.reduce(function (chain, file) {
                return chain.then(function () {
                    var ext = (file.path.match(/\.[A-Za-z0-9]+$/) || [""])[0].toLowerCase();
                    return cache.put(base + file.path, new Response(file.data, { headers: { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": String(file.data.length) } }));
                });
            }, Promise.resolve()).then(function () {
                return cache.put(base + ".installed", new Response(JSON.stringify({ id: id, title: parsed.header.title, version: parsed.header.version, files: parsed.files.length }), { headers: { "Content-Type": "application/json" } }));
            });
        }).then(function () {
            return { id: id, title: String(parsed.header.title || "Eamon Showcase").slice(0, 200), version: String(parsed.header.version || ""), size: bytes.length, files: parsed.files.length, label: TRUSTED[id] };
        }).catch(function (error) {
            if (id) { try { caches.delete(cacheName(id)); } catch (e) {} }
            throw error;
        });
    }

    function remove(id) {
        if (typeof caches === "undefined") return Promise.resolve(false);
        return caches.delete(cacheName(id));
    }

    // "local/<64 hex>.eamon.js" -> the package id, or null for anything else (including the dev overlay id).
    function idFromStory(story) {
        var value = String(story || "");
        try { value = decodeURIComponent(value); } catch (e) {}
        var match = /(?:^|\/)local\/([0-9a-f]{64})\.eamon\.js$/.exec(value);
        return match ? match[1] : null;
    }

    return { looksLikePackage: looksLikePackage, install: install, remove: remove, isInstalled: isInstalled, baseUrl: baseUrl, idFromStory: idFromStory, trusted: function () { return Object.assign({}, TRUSTED); } };
})();
