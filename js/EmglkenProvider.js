/* EmglkenProvider - WorldModel provider for Emglken staging status. */
var EmglkenProvider = {
    name: "emglken-stub",
    collect: () => {
        var host = null;
        try { host = (typeof EmglkenHost !== "undefined") ? EmglkenHost.snapshot() : (window.__EMGLKEN_HOST__ || null); } catch (e) {}
        return {
            sources: [{ name: "emglken-stub", confidence: host && host.assetsOk ? 0.15 : 0.05 }],
            vmType: host && host.requested ? "emglken-requested" : "pending-emglken",
            engineMode: "heuristic",
            probe: {
                abiVersion: 1,
                buildId: "parchmap-native-hooks-0.1.0-stub",
                supportsZmachine: true,
                supportsGlulx: true,
                supportsHeapView: false,
                status: host ? host.status : "host-unknown",
                wasmPath: "lib/pm_vm_probe.wasm",
                emglkenVersion: host ? host.version : null,
                emglkenAssetsOk: !!(host && host.assetsOk),
                emglkenRequested: !!(host && host.requested)
            }
        };
    }
};