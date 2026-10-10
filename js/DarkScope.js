var DarkScope = {
    dark: false,
    lastText: "",

    // M11 (D221): judge ONLY the latest reply (the lines printed after the
    // last command echo), never the whole transcript. The old whole-history
    // scan made the flag sticky by construction: once HHG's opening darkness
    // was printed, "darkness" matched forever (plan 8367 residual).
    //   - a dark cue in the latest reply sets dark;
    //   - a room heading printed in the latest reply with no dark cue clears
    //     it (a current-room description is light evidence);
    //   - any other reply (talk, eat, blocked move) leaves the state as is:
    //     no evidence is not light evidence (codex #2431/#2432).
    // Callers may still pass text; it is used only when the DOM is absent.
    latestReply: () => {
        try {
            var lines = Array.prototype.slice.call(document.querySelectorAll("#windowport .BufferWindow .BufferLine"));
            var last = -1;
            for (var i = lines.length - 1; i >= 0; i--) {
                if (lines[i].querySelector(".Style_input") || (lines[i].classList && lines[i].classList.contains("Style_input"))) { last = i; break; }
            }
            var after = lines.slice(last + 1);
            // A current-room description: a styled subheader, or (games that
            // print the heading as plain text, e.g. HHG "Bedroom, in the bed")
            // a line that starts with the structurally resolved room's name.
            var roomName = "";
            try { roomName = String((typeof WorldModel !== "undefined" && WorldModel.lastPayload && WorldModel.lastPayload.roomName) || "").trim().toLowerCase(); } catch (eRn) {}
            var heading = after.some(function (line) {
                var sub = line.querySelector(".Style_subheader");
                if (sub && sub.textContent.trim() && !/\*\s*\*/.test(sub.textContent)) return true;
                var lt = String(line.textContent || "").trim().toLowerCase();
                // The heading line itself: exactly the room name, or the name
                // followed by "," / "(" (HHG "Bedroom, in the bed"). Prose
                // that merely begins with a short name ("Hall door is shut")
                // is not a heading (grok #2631).
                if (roomName.length < 3 || lt.indexOf(roomName) !== 0) return false;
                var rest = lt.slice(roomName.length);
                return rest === "" || /^\s*[,(]/.test(rest);
            });
            return { text: after.map(function (line) { return line.textContent; }).join("\n"), heading: heading };
        } catch (e) { return null; }
    },

    noteText: (text) => {
        var reply = DarkScope.latestReply();
        var t = reply ? reply.text : String(text || "");
        var heading = reply ? reply.heading : false;
        var key = t + "|" + heading;
        // Same reply, same verdict.
        if (key === DarkScope.lastText && DarkScope._noted) return;
        DarkScope._noted = true;
        DarkScope.lastText = key;
        var low = t.toLowerCase().replace(/\s+/g, " ");
        var darkCue = /it is pitch dark|it is pitch black|too dark to see|darkness|cannot see a thing|can't see a thing|you are in the dark|in the dark/.test(low);
        if (darkCue) DarkScope.dark = true;
        else if (heading) DarkScope.dark = false;
        try {
            document.documentElement.classList.toggle("pl-dark-scope", !!DarkScope.dark);
        } catch (e) {}
    },

    collect: () => {
        try {
            DarkScope.noteText("");
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
