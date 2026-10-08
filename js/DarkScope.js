var DarkScope = {
    dark: false,
    lastText: "",

    noteText: (text) => {
        var t = String(text || "");
        // Same text, same verdict (the cues only depend on t): skip the
        // whole-transcript regex when nothing was printed since last time.
        if (t === DarkScope.lastText && DarkScope._noted) return;
        DarkScope._noted = true;
        DarkScope.lastText = t;
        var low = t.toLowerCase().replace(/\s+/g, " ");
        var darkCue = /it is pitch dark|too dark to see|darkness|cannot see a thing|can't see a thing|you are in the dark|in the dark/.test(low);
        var lightCue = /you can see|visible light|switch on|lantern|torch|flashlight|offers light/.test(low);
        if (darkCue) DarkScope.dark = true;
        if (lightCue && !/pitch dark|too dark/.test(low)) DarkScope.dark = false;
        try {
            document.documentElement.classList.toggle("pl-dark-scope", !!DarkScope.dark);
        } catch (e) {}
    },

    collect: () => {
        try {
            if (typeof $ !== "undefined") DarkScope.noteText(typeof BufferRevision !== "undefined" ? BufferRevision.text("#windowport") : $("#windowport").text());
        } catch (e) {}
        return {
            sources: [{ name: "dark-scope", confidence: 0.5 }],
            darkness: DarkScope.dark,
            hudMetrics: DarkScope.dark ? [{ key: "scope", value: "dark (heuristic)", confidence: 0.5 }] : []
        };
    }
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "dark-scope", collect: DarkScope.collect });
        }
    }, 0);
} catch (e) {}
