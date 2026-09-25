var BufferTapProvider = {
    name: "buffer-tap",

    /* D24/D29: correctly repurposed as an empty WorldModel stub so play.html
       script tags do not 404. Not a source for actionable/map/radial.
       Former BufferLine/windowport scrape and noun-regex mining are gone. */
    roomText: () => "",

    collect: () => {
        /* STRUCTURAL_HARD_DEMOTE */
        try {
            var zpLive = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            var p = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            if (zpLive && p && p.probe && p.probe.status === "z-ram-live" && (p.probe.scopeCount || 0) > 0) {
                return { sources: [{ name: "buffer-tap", confidence: 0.01 }], discoveredObjects: [], confidence: 0.01 };
            }
        } catch (e) {}

        return {
            sources: [{ name: "buffer-tap", confidence: 0 }],
            roomName: "",
            roomConfidence: 0,
            roomId: null,
            exits: [],
            inventory: [],
            discoveredObjects: []
        };
    }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "buffer-tap", collect: BufferTapProvider.collect });
        }
    }, 0);
} catch (e) {}
