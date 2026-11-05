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
    //     clears dark when X is on the chain, or M11: unnamed depth-1 parent
    //     with the same reply printing "outside the X" (HHG bed);
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
            // M11 HHG: bed/container may be parentless (parent 0) so the chain
            // never reaches the room. Keep ONLY the direct parent (depth 1) so
            // ", in the bed" can still clear dark when X matches that object.
            if (out.length) return [out[0]];
            return [];
        } catch (e) { return []; }
    },

    isHeadingLine: (line, roomName, chain, inform, replyBlob) => {
        var lt = String(line || "").toLowerCase(), name = String(roomName || "").toLowerCase().trim();
        if (name.length < 3 || lt.indexOf(name) !== 0) return false;
        var rest = lt.slice(name.length);
        if (rest === "") return true;
        var m = /^\s*(?:,\s*(?:in|on)\s+((?:the|a|an)\s+)?([^,()]+?)|\s*\(\s*(?:in|on)\s+((?:the|a|an)\s+)?([^()]+?)\s*\))\s*\.?$/.exec(rest);
        if (!m) return false;
        if (m[4] != null && !inform) return false; // parenthesised form is Inform's
        var want = String(m[2] || m[4] || "").trim();
        var wantWords = want.split(/\s+/);
        if (chain.some(function (level) {
            if (level.names.indexOf(want) >= 0) return true;
            return level.words.length && wantWords.every(function (w) {
                return level.words.some(function (x) { return x === w || (x.length >= 6 && w.indexOf(x) === 0); });
            });
        })) return true;
        return false;
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
            var darkCue = /it is (?:now )?pitch (?:dark|black)|too dark to see|darkness|cannot see a thing|can't see a thing|you are in the dark|in the dark/.test(low);
            var inform = false;
            try { inform = !!(typeof ZRamReader !== "undefined" && ZRamReader.isInformCompiled(ZRamProvider.getMem())); } catch (eI) {}
            if (darkCue) DarkScope.dark = true;
            else if (roomName && lines.some(function (l) {
                return DarkScope.isHeadingLine(l, roomName, chain, inform, lines.join("\n"));
            })) DarkScope.dark = false;
        }
        if (payload.darkness === true) DarkScope.dark = true;
        // Wump2ka identity R4 (Codex #3103/#3131): the validated measured
        // location result travels with this payload from the snapshot (one
        // read, same tick). Only a measured room carries naming evidence.
        payload.darkEvidence = "unknown";
        var pr = payload.probe, measured = false;
        if (pr && pr.roomSource === "measured-fact" && typeof pr.measuredDark === "boolean"
            && String(pr.roomId) === String(payload.roomId)) {
            payload.darkEvidence = pr.measuredDark ? "dark" : "lit";
            DarkScope.dark = pr.measuredDark;
            measured = true;
        }
        // Own HUD entry only; other scope entries are preserved.
        payload.hudMetrics = (payload.hudMetrics || []).filter(function (h) { return !(h && h.source === "dark-scope"); });
        // A measured verdict is labelled as measured; the text heuristic keeps its label.
        if (DarkScope.dark) payload.hudMetrics.push(measured
            ? { key: "scope", value: "dark (measured)", confidence: 0.95, source: "measured-fact" }
            : { key: "scope", value: "dark (heuristic)", confidence: 0.5, source: "dark-scope" });
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
