var GraphicsDock = {
    active: false,

    detect: () => {
        var g = false;
        try {
            if (typeof $ !== "undefined") {
                g = $("#windowport .GraphicsWindow, #windowport canvas, .GraphicsWindow").filter(":visible").length > 0;
            }
        } catch (e) {}
        GraphicsDock.active = !!g;
        try {
            document.documentElement.classList.toggle("pl-graphics-dock", GraphicsDock.active);
        } catch (e) {}
        return GraphicsDock.active;
    },

    collect: () => {
        GraphicsDock.detect();
        return {
            sources: [{ name: "graphics-dock", confidence: 0.4 }],
            nativeGraphicsActive: GraphicsDock.active,
            glkBounds: GraphicsDock.active ? { dockMap: true } : null
        };
    },

    tick: () => { GraphicsDock.detect(); }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "graphics-dock", collect: GraphicsDock.collect });
        }
        setInterval(GraphicsDock.tick, 2000);
    }, 0);
} catch (e) {}
