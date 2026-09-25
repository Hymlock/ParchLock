/* GlkTapProvider - Phase O1 protocol-ish provider.
 * Reads same-origin Emglken iframe (#emglken-frame) windowport text.
 * D24: not a source for discoveredObjects / exits / inventory / roomName.
 * Probe sample is HUD/meta telemetry only.
 */
var GlkTapProvider = {
    name: "glk-tap",
    frameId: "emglken-frame",

    readFrameText: () => {
        try {
            var frame = document.getElementById(GlkTapProvider.frameId);
            if (!frame || !frame.contentWindow || !frame.contentDocument) return "";
            var doc = frame.contentDocument;
            var port = doc.querySelector("#windowport") || doc.body;
            return ((port && port.innerText) || "").replace(/\s+/g, " ").trim();
        } catch (e) {
            return "";
        }
    },

    collect: () => {
        var text = GlkTapProvider.readFrameText();
        return {
            sources: [{ name: "glk-tap", confidence: text ? 0.5 : 0.05 }],
            vmType: text ? "emglken-bocfel" : "pending-emglken",
            engineMode: text ? "behavioral" : "heuristic",
            roomName: "",
            roomConfidence: 0,
            roomId: null,
            exits: [],
            inventory: [],
            discoveredObjects: [],
            probe: {
                status: text ? "glk-tap-live" : "glk-tap-waiting",
                sample: text.slice(0, 160)
            }
        };
    }
};

try {
    if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
        WorldModel.registerProvider(GlkTapProvider);
    }
} catch (e) {}
