/* EmglkenHost - O1 dual-host staging.
 * Default remains Quixe/ZVM (lib/main.js).
 * When ?vm=emglken is present, mark host as requested and probe staged assets.
 * Full Bocfel/Glulxe launch is intentionally not wired yet (keeps regressions green).
 */
var EmglkenHost = {
    version: "0.7.2-staged+parchment-2026.8.23",
    requested: false,
    assetsOk: false,
    engines: {
        bocfel: "lib/emglken/bocfel.js",
        bocfelWasm: "lib/emglken/bocfel.wasm",
        glulxe: "lib/emglken/glulxe.js",
        glulxeWasm: "lib/emglken/glulxe.wasm",
        asyncglk: "lib/emglken/asyncglk.js"
    },
    status: "quixe-default",

    wantsEmglken: () => {
        try {
            var q = (location.search || "").toLowerCase();
            if (q.indexOf("vm=emglken") >= 0) return true;
            if (q.indexOf("host=emglken") >= 0) return true;
            if (typeof parchment_options !== "undefined" && parchment_options.use_emglken) return true;
        } catch (e) {}
        return false;
    },

    probeAssets: () => {
        var keys = ["bocfelWasm", "glulxeWasm", "bocfel", "glulxe"];
        var pending = keys.length;
        var ok = true;
        keys.forEach(function (k) {
            var url = EmglkenHost.engines[k];
            fetch(url, { method: "HEAD", cache: "no-store" }).then(function (r) {
                if (!r.ok) ok = false;
            }).catch(function () { ok = false; }).finally(function () {
                pending -= 1;
                if (pending === 0) {
                    EmglkenHost.assetsOk = ok;
                    EmglkenHost.status = EmglkenHost.requested
                        ? (ok ? "emglken-requested-assets-ok" : "emglken-requested-assets-missing")
                        : (ok ? "quixe-default-emglken-staged" : "quixe-default-emglken-incomplete");
                    try { window.__EMGLKEN_HOST__ = EmglkenHost.snapshot(); } catch (e) {}
                }
            });
        });
    },

    snapshot: () => ({
        version: EmglkenHost.version,
        requested: EmglkenHost.requested,
        assetsOk: EmglkenHost.assetsOk,
        status: EmglkenHost.status,
        engines: EmglkenHost.engines
    }),

    init: () => {
        EmglkenHost.requested = EmglkenHost.wantsEmglken();
        EmglkenHost.status = EmglkenHost.requested ? "emglken-requested-probing" : "quixe-default-probing";
        try { window.__EMGLKEN_HOST__ = EmglkenHost.snapshot(); } catch (e) {}
        if (typeof fetch === "function") EmglkenHost.probeAssets();
        else {
            EmglkenHost.assetsOk = false;
            EmglkenHost.status = "fetch-unavailable";
            try { window.__EMGLKEN_HOST__ = EmglkenHost.snapshot(); } catch (e) {}
        }
    }
};

try { EmglkenHost.init(); } catch (e) {}