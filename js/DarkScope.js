var DarkScope = {
    dark: false,
    lastKey: "",

    // D221 / M11 (codex #2694 consensus). Heuristic light/dark presentation,
    // NOT a deterministic darkness proof and NOT a same-reply guarantee.
    // Called ONCE per WorldModel.tick on the FINALIZED payload (after room
    // refinement), so the room/actor are this tick's, never a stale tick's.
    //   - a dark cue in the latest reply (lines after the last command echo)
    //     sets dark;
    //   - a line whose FULL text is the current room's name, or that name plus
    //     a positional suffix ", in|on the X" / " (in|on the X)" where X is an
    //     object on the player's containment chain strictly below the room,
    //     clears dark (HHG "Bedroom, in the bed");
    //   - anything else (help/inventory headings, prose starting with the room
    //     name, another room's heading, no structural room) leaves it as is.
    // A defensive guard keeps dark when payload.darkness is true from another
    // source; payload.darkness false is not light evidence.
    latestReplyLines: () => {
        try {
            var lines = Array.prototype.slice.call(document.querySelectorAll("#windowport .BufferWindow .BufferLine"));
            var last = -1;
            for (var i = lines.length - 1; i >= 0; i--) {
                if (lines[i].querySelector(".Style_input") || (lines[i].classList && lines[i].classList.contains("Style_input"))) { last = i; break; }
            }
            return lines.slice(last + 1).map(function (line) { return String(line.textContent || "").replace(/\s+/g, " ").trim(); }).filter(Boolean);
        } catch (e) { return []; }
    },

    // The player's containment chain strictly below the room, with the words
    // that name each level (short name, story name, parser words).
    chainBelowRoom: (playerId, roomId) => {
        var out = [];
        try {
            if (!playerId || roomId == null || typeof ZRamReader === "undefined" || typeof ZRamProvider === "undefined") return out;
            var mem = ZRamProvider.getMem(); if (!mem) return out;
            var id = ZRamReader.objectLinks(mem, Number(playerId)).parent;
            for (var d = 0; id && d < 16; d++) {
                if (String(id) === String(roomId)) return out;
                // Structural short name and parser words only (the D219 story
                // name is not accepted as a binding name: codex #2698).
                var names = [String(ZRamReader.shortName(mem, id) || "")];
                var words = (ZRamReader.parserWordsAny(mem, id) || []).map(function (w) { return String(w).toLowerCase(); });
                out.push({ id: id, names: names.map(function (n) { return n.toLowerCase().replace(/^(the|a|an)\s+/, "").trim(); }).filter(Boolean), words: words });
                id = ZRamReader.objectLinks(mem, id).parent;
            }
            return []; // chain never reached the room: no proof
        } catch (e) { return []; }
    },

    isHeadingLine: (line, roomName, chain, inform) => {
        var lt = String(line || "").toLowerCase(), name = String(roomName || "").toLowerCase().trim();
        if (name.length < 3 || lt.indexOf(name) !== 0) return false;
        var rest = lt.slice(name.length);
        if (rest === "") return true;
        var m = /^\s*(?:,\s*(?:in|on)\s+((?:the|a|an)\s+)?([^,()]+?)|\s*\(\s*(?:in|on)\s+((?:the|a|an)\s+)?([^()]+?)\s*\))\s*\.?$/.exec(rest);
        if (!m) return false;
        if (m[4] != null && !inform) return false; // parenthesised form is Inform's
        var want = String(m[2] || m[4] || "").trim();
        var wantWords = want.split(/\s+/);
        return chain.some(function (level) {
            if (level.names.indexOf(want) >= 0) return true;
            return level.words.length && wantWords.every(function (w) {
                return level.words.some(function (x) { return x === w || (x.length >= 6 && w.indexOf(x) === 0); });
            });
        });
    },

    noteFromPayload: (payload) => {
        if (!payload) return;
        var lines = DarkScope.latestReplyLines();
        // Heading evidence needs a structural payload (not a bare id).
        var structural = false;
        try { structural = !!(typeof WorldModel !== "undefined" && WorldModel.isStructuralFact && WorldModel.isStructuralFact(payload)); } catch (eSt) {}
        var roomName = structural && payload.roomId != null ? String(payload.roomName || "").trim() : "";
        var chain = roomName ? DarkScope.chainBelowRoom(payload.playerId, payload.roomId) : [];
        var key = [payload.playerId, payload.roomId, roomName, JSON.stringify(chain), lines.join("\n")].join("|");
        if (key !== DarkScope.lastKey) {
            DarkScope.lastKey = key;
            var low = lines.join(" ").toLowerCase();
            var darkCue = /it is pitch dark|it is pitch black|too dark to see|darkness|cannot see a thing|can't see a thing|you are in the dark|in the dark/.test(low);
            var inform = false;
            try { inform = !!(typeof ZRamReader !== "undefined" && ZRamReader.isInformCompiled(ZRamProvider.getMem())); } catch (eI) {}
            if (darkCue) DarkScope.dark = true;
            else if (roomName && lines.some(function (l) { return DarkScope.isHeadingLine(l, roomName, chain, inform); })) DarkScope.dark = false;
        }
        if (payload.darkness === true) DarkScope.dark = true;
        // Own HUD entry only; other scope entries are preserved.
        payload.hudMetrics = (payload.hudMetrics || []).filter(function (h) { return !(h && h.source === "dark-scope"); });
        if (DarkScope.dark) payload.hudMetrics.push({ key: "scope", value: "dark (heuristic)", confidence: 0.5, source: "dark-scope" });
        try { document.documentElement.classList.toggle("pl-dark-scope", !!DarkScope.dark); } catch (e) {}
    },

    // Provider: diagnostics only. The verdict is made once per tick on the
    // finalized payload (WorldModel.tick -> noteFromPayload).
    collect: () => ({ sources: [{ name: "dark-scope", confidence: 0.5 }] })
};

try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "dark-scope", collect: DarkScope.collect });
        }
    }, 0);
} catch (e) {}
