const fs = require("fs");
let plan = fs.readFileSync("PRODUCTION_PLAN.md", "utf8");
if (!plan.includes("as-you-go")) {
  if (plan.includes("Location cascade:")) {
    plan = plan.replace(
      /Location cascade:[^\n]*/,
      "As-you-go location cascade: each turn decode only current room via parent(player) when valid; map grows via look-ahead + state-delta as player moves (no whole-game pre-scan)."
    );
  } else {
    plan = plan.replace(
      "Required deliverables (from conversion guide, folded in):",
      "Required deliverables (from conversion guide, folded in):\n\n**As-you-go rule:** decode only the current room from RAM each turn (player ? location ? scope/exits). Map grows with movement. No whole-game room pre-scan.\n"
    );
  }
  fs.writeFileSync("PRODUCTION_PLAN.md", plan);
}
console.log("as-you-go", fs.readFileSync("PRODUCTION_PLAN.md","utf8").includes("as-you-go"));

// Grammar: dictionary verb bits ? ActionSynth
fs.writeFileSync("js/GrammarProvider.js", `var GrammarProvider = {
    name: "grammar-ram",
    // Z dictionary entries often flag verbs; expose as specialCommands / ActionSynth seed ? holistic, not story-specific
    readVerbWords: function (mem) {
        var out = [];
        try {
            var dict = ZRamReader.parseDictionary(mem);
            if (!dict || !dict.entries) return out;
            dict.entries.forEach(function (e) {
                // Inform: encoded word; if entry has verb-ish flag in raw bytes when present
                if (!e || !e.word) return;
                var w = String(e.word).toLowerCase();
                if (w.length < 2) return;
                if (e.isVerb || e.verb || (e.flags & 1)) out.push(w);
            });
            // If flags unavailable, keep empty ? attrs still drive ActionSynth
        } catch (e) {}
        return Array.from(new Set(out)).slice(0, 80);
    },
    collect: function () {
        try {
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            if (!mem) {
                return { sources: [{ name: "grammar-ram", confidence: 0.02 }], specialCommands: [] };
            }
            var verbs = GrammarProvider.readVerbWords(mem);
            var special = [
                { label: "look", command: "look" },
                { label: "inventory", command: "inventory" }
            ];
            verbs.slice(0, 20).forEach(function (v) {
                special.push({ label: v, command: v, source: "dictionary-verb" });
            });
            try {
                window.__PL_GRAMMAR_VERBS__ = verbs;
            } catch (e2) {}
            return {
                sources: [{ name: "grammar-ram", confidence: verbs.length ? 0.55 : 0.25 }],
                specialCommands: special
            };
        } catch (e) {
            return { sources: [{ name: "grammar-ram", confidence: 0.02 }], specialCommands: [] };
        }
    }
};
try {
    setTimeout(function () {
        if (typeof WorldModel !== "undefined" && WorldModel.registerProvider) {
            WorldModel.registerProvider({ name: "grammar-ram", collect: function () { return GrammarProvider.collect(); } });
        }
    }, 0);
} catch (e) {}
`);
try { new Function(fs.readFileSync("js/GrammarProvider.js","utf8")); console.log("Grammar OK"); }
catch (e) { console.log("Grammar FAIL", e.message); }

// Undo/restore: generation bump + full resync from RAM cascade (not story-specific)
fs.writeFileSync("js/UndoRestoreSync.js", `var UndoRestoreSync = {
    generation: 0,
    pending: false,
    noteCommand: function (cmd) {
        var s = String(cmd || "").trim().toLowerCase();
        if (/^(undo|restore|restart|load)\\b/.test(s)) {
            UndoRestoreSync.pending = true;
        }
    },
    resync: function () {
        UndoRestoreSync.generation++;
        UndoRestoreSync.pending = false;
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.tick) ZvmCapture.tick();
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
            // Reset topology previous room so next location is fresh from RAM cascade
            if (typeof MapTopology !== "undefined") {
                MapTopology.prevRoomId = null;
                MapTopology.prevRoomName = "";
                if (WorldModel.lastPayload) MapTopology.tick(WorldModel.lastPayload);
            }
            if (typeof Actionable !== "undefined" && Actionable.Refresh) Actionable.Refresh();
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.Draw) ParchLockMap.Draw();
        } catch (e) {}
    },
    tick: function () {
        if (!UndoRestoreSync.pending) return;
        // Allow terp to apply undo/restore first
        setTimeout(function () { UndoRestoreSync.resync(); }, 250);
    }
};
try {
    if (typeof Actionable !== "undefined" && Actionable.Submit && !Actionable._undoSyncWrapped) {
        var _s = Actionable.Submit;
        Actionable.Submit = function (cmd) {
            try { UndoRestoreSync.noteCommand(cmd); } catch (e) {}
            var r = _s.apply(this, arguments);
            try { UndoRestoreSync.tick(); } catch (e2) {}
            return r;
        };
        Actionable._undoSyncWrapped = true;
    }
} catch (e) {}
`);
try { new Function(fs.readFileSync("js/UndoRestoreSync.js","utf8")); console.log("Undo OK"); }
catch (e) { console.log("Undo FAIL", e.message); }

// Wire UndoRestoreSync in play.html if missing
let html = fs.readFileSync("play.html", "utf8");
if (!html.includes("UndoRestoreSync.js")) {
  html = html.replace('<script src="js/MapTopology.js"></script>', '<script src="js/MapTopology.js"></script>\n\t\t<script src="js/UndoRestoreSync.js"></script>');
  if (!html.includes("UndoRestoreSync.js")) {
    html = html.replace('<script src="js/WorldModel.js"></script>', '<script src="js/UndoRestoreSync.js"></script>\n\t\t<script src="js/WorldModel.js"></script>');
  }
  fs.writeFileSync("play.html", html);
}
if (!html.includes("GrammarProvider.js") && !fs.readFileSync("play.html","utf8").includes("GrammarProvider.js")) {
  let h2 = fs.readFileSync("play.html", "utf8");
  h2 = h2.replace('<script src="js/WorldModel.js"></script>', '<script src="js/GrammarProvider.js"></script>\n\t\t<script src="js/WorldModel.js"></script>');
  fs.writeFileSync("play.html", h2);
}
console.log({
  undoWired: fs.readFileSync("play.html","utf8").includes("UndoRestoreSync.js"),
  grammarWired: fs.readFileSync("play.html","utf8").includes("GrammarProvider.js")
});

// BUILD 49
let c = fs.readFileSync("js/Consts.js", "utf8");
c = c.replace(/BUILD\s*=\s*\d+/, "BUILD = 49");
fs.writeFileSync("js/Consts.js", c);
console.log("BUILD 49");
