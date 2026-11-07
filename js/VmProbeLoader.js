/* VmProbeLoader - portable WASM probe (story-byte structural facts). */
var VmProbeLoader = {
    ready: false,
    mod: null,
    error: null,
    info: null,
    lastStoryScan: null,
    lastZSummary: null,

    root: () => {
        try {
            var meta = document.querySelector('meta[name="parchlock-root"]');
            if (meta && meta.content) return meta.content.replace(/\/?$/, "/");
        } catch (e) {}
        try {
            var scripts = document.getElementsByTagName("script");
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].getAttribute("src") || "";
                var m = src.match(/^(.*\/)js\/(?:VmProbeLoader|WorldModel|RemGlkTapProvider)\.js/);
                if (m) return m[1];
            }
        } catch (e) {}
        return "./";
    },

    resolve: (rel) => {
        var root = VmProbeLoader.root();
        try { return new URL(rel, new URL(root, document.baseURI || location.href)).href; }
        catch (e) { return root + rel.replace(/^\//, ""); }
    },

    load: async () => {
        if (VmProbeLoader.mod) return VmProbeLoader.mod;
        try {
            var jsUrl = VmProbeLoader.resolve("lib/pm_vm_probe.js");
            await new Promise(function (resolve, reject) {
                if (typeof createPmVmProbe === "function") return resolve();
                var s = document.createElement("script");
                s.src = jsUrl;
                s.async = true;
                s.onload = resolve;
                s.onerror = function () { reject(new Error("failed to load " + jsUrl)); };
                document.head.appendChild(s);
            });
            if (typeof createPmVmProbe !== "function") throw new Error("createPmVmProbe missing");
            var mod = await createPmVmProbe({
                locateFile: function (path) {
                    if (String(path).endsWith(".wasm")) return VmProbeLoader.resolve("lib/pm_vm_probe.wasm");
                    return VmProbeLoader.resolve("lib/" + path);
                }
            });
            VmProbeLoader.mod = mod;
            var ptr = mod._pm_vm_probe_info();
            VmProbeLoader.info = {
                abi: mod.getValue(ptr, "i32"),
                zm: mod.getValue(ptr + 4, "i32"),
                glulx: mod.getValue(ptr + 8, "i32"),
                heap: mod.getValue(ptr + 12, "i32"),
                buildId: mod.UTF8ToString(mod.getValue(ptr + 16, "*"))
            };
            VmProbeLoader.ready = true;
            try { window.__PARCHLOCK_PROBE__ = VmProbeLoader.info; } catch (e) {}
            return mod;
        } catch (e) {
            VmProbeLoader.error = String(e && e.message ? e.message : e);
            VmProbeLoader.ready = false;
            return null;
        }
    },

    storyUrl: () => {
        try {
            var q = new URLSearchParams(location.search).get("story");
            if (q) return q;
        } catch (e) {}
        try {
            if (window.parchment_options && window.parchment_options.story) {
                var s = window.parchment_options.story;
                if (typeof s === "string") return s;
                if (s && s.url) return s.url;
            }
        } catch (e) {}
        return null;
    },

    scanBytes: async (bytes) => {
        var mod = await VmProbeLoader.load();
        if (!mod || !bytes) return { ok: false, reason: VmProbeLoader.error || "no-mod" };
        var buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        var ptr = mod._malloc(buf.length);
        try {
            if (mod.HEAPU8) mod.HEAPU8.set(buf, ptr);
            else for (var i = 0; i < buf.length; i++) mod.setValue(ptr + i, buf[i], "i8");
            var scan = mod._pm_vm_probe_scan_stub(ptr, buf.length);
            return { ok: scan >= 0, scan: scan, info: VmProbeLoader.info };
        } finally {
            mod._free(ptr);
        }
    },

    zSummaryBytes: async (bytes) => {
        var mod = await VmProbeLoader.load();
        if (!mod || !bytes || typeof mod._pm_vm_probe_z_summary !== "function") {
            return { ok: false, reason: "z_summary unavailable" };
        }
        var buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        var ptr = mod._malloc(buf.length);
        var sumPtr = mod._malloc(4 * (6 + 64));
        try {
            mod.HEAPU8.set(buf, ptr);
            var n = mod._pm_vm_probe_z_summary(ptr, buf.length, sumPtr);
            if (n <= 0) return { ok: false, reason: "summary-failed", n: n };
            var g = function (off) { return mod.getValue(sumPtr + off, "i32"); };
            var sampleCount = g(20);
            var samples = [];
            for (var i = 0; i < sampleCount; i++) {
                samples.push({
                    id: g(24 + i * 4),
                    parent: g(24 + 64 + i * 4),
                    child: g(24 + 128 + i * 4),
                    sibling: g(24 + 192 + i * 4)
                });
            }
            return {
                ok: true,
                version: g(0),
                objectTable: g(4),
                objectCount: g(8),
                entrySize: g(12),
                defaultsWords: g(16),
                sampleCount: sampleCount,
                samples: samples
            };
        } finally {
            mod._free(sumPtr);
            mod._free(ptr);
        }
    },

    scanCurrentStory: async () => {
        var url = VmProbeLoader.storyUrl();
        if (!url) return { ok: false, reason: "no-story-url" };
        try {
            var buf;
            if (typeof ModuleLibrary !== "undefined" && ModuleLibrary.canonicalLocalPath(url)) {
                buf = await ModuleLibrary.getBytes(url);
            } else {
                var res = await fetch(url, { cache: "no-store" });
                if (!res.ok) return { ok: false, reason: "fetch-" + res.status, url: url };
                buf = new Uint8Array(await res.arrayBuffer());
            }
            var result = await VmProbeLoader.scanBytes(buf);
            result.url = url;
            result.bytes = buf.length;
            result.zVersion = buf.length ? buf[0] : null;
            var zsum = await VmProbeLoader.zSummaryBytes(buf);
            result.zSummary = zsum;
            VmProbeLoader.lastStoryScan = result;
            VmProbeLoader.lastZSummary = zsum.ok ? zsum : null;
            try {
                window.__PARCHLOCK_STORY_SCAN__ = result;
                window.__PARCHLOCK_ZSUMMARY__ = VmProbeLoader.lastZSummary;
            } catch (e) {}
            return result;
        } catch (e) {
            return { ok: false, reason: String(e && e.message ? e.message : e), url: url };
        }
    },

    collect: () => {
        var z = VmProbeLoader.lastZSummary;
        var facts = {
            sources: [{ name: "vm-probe", confidence: z && z.ok ? 0.35 : (VmProbeLoader.ready ? 0.15 : 0.02) }],
            probe: {
                vmProbeReady: VmProbeLoader.ready,
                vmProbeInfo: VmProbeLoader.info,
                vmProbeError: VmProbeLoader.error,
                storyScan: VmProbeLoader.lastStoryScan || null,
                zSummary: z || null
            }
        };
        // Structural object ids are not player-facing names; expose as hudMetrics for now.
        if (z && z.ok) {
            facts.hudMetrics = [
                { id: "z.objectCount", label: "Z objects", value: String(z.objectCount), confidence: 0.4 },
                { id: "z.objectTable", label: "Z object table", value: String(z.objectTable), confidence: 0.4 }
            ];
        }
        return facts;
    }
};

try {
    if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
        WorldModel.registerProvider(VmProbeLoader);
    }
} catch (e) {}
try { VmProbeLoader.load().then(function () { return VmProbeLoader.scanCurrentStory(); }); } catch (e) {}
