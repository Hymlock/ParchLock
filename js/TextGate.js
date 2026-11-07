var TextGate = {
    /* D24/D29: correctly repurposed as a compatibility stub, not a spoiler
       shield and not a source for actionable/map/radial. play.html keeps the
       script tag; isVisible is a permanent no-op (RAM-scope is the shield);
       collect never fills discoveredObjects/exits/inventory/roomName.
       Printed-vocab map (discovered) and normalize() are gone. */
    lastChunk: "",

    noteText: (text) => {
        TextGate.lastChunk = String(text || "");
    },

    isVisible: (name) => {
        return true;
    },

    reset: () => { TextGate.lastChunk = ""; },

    collect: () => {
        return {
            sources: [{ name: "text-gate", confidence: 0 }],
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
            WorldModel.registerProvider({ name: "text-gate", collect: TextGate.collect });
        }
    }, 0);
} catch (e) {}
