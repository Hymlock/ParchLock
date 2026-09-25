/* LiveHeapProvider ? optional P2 under the hood (no UX fork).
 * Tries live Quixe.ReadByte; falls back to VmProbeLoader story-byte summary.
 */
var LiveHeapProvider = {
    name: "live-heap",
    last: null,

    tryQuixeWalk: () => {
        try {
            if (typeof Quixe === "undefined" || typeof Quixe.ReadByte !== "function") return null;
            // Glulx RAM peek smoke: read a few bytes at 0; real object walk needs dbg/schema
            var b0 = Quixe.ReadByte(0);
            var b1 = Quixe.ReadByte(1);
            var b2 = Quixe.ReadByte(2);
            var b3 = Quixe.ReadByte(3);
            return {
                sources: [{ name: "live-heap-quixe", confidence: 0.35 }],
                hudMetrics: [
                    { key: "heap", value: "quixe-live", confidence: 0.35 },
                    { key: "glulx_hdr", value: [b0, b1, b2, b3].join("."), confidence: 0.35 }
                ],
                probe: { status: "quixe-live-bytes", abiHint: "ReadByte" }
            };
        } catch (e) { return null; }
    },

    collect: () => {
        var live = LiveHeapProvider.tryQuixeWalk();
        if (live) { LiveHeapProvider.last = live; return live; }
        // Story-byte path already fed via VmProbeLoader; report linkage only
        var probe = null;
        try {
            if (typeof VmProbeLoader !== "undefined" && VmProbeLoader.lastSummary) probe = VmProbeLoader.lastSummary;
        } catch (e) {}
        return {
            sources: [{ name: "live-heap", confidence: probe ? 0.25 : 0.05 }],
            hudMetrics: probe ? [{ key: "heap", value: "story-byte-fallback", confidence: 0.25 }] : [],
            probe: { status: probe ? "story-byte-fallback" : "no-live-heap", storySummary: probe || null }
        };
    }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "live-heap", collect: LiveHeapProvider.collect });
        }
    }, 0);
} catch (e) {}
