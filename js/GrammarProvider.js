var GrammarProvider = {
    name: "grammar-ram",
    // Z dictionary entries often flag verbs; expose as specialCommands / ActionSynth seed ? holistic, not story-specific
    // Gating on Inform's per-word verb flag (dict.informVerbFlags, decoded
    // in ZRamReader.parseDictionary) happens one layer down: parseDictionary
    // only populates `entries` (with real isVerb flags) when informVerbFlags
    // is true for this build; pre-Inform-6/Infocom dictionaries carry no
    // such flag and get entries:[] there, which this function already
    // treats as "nothing to offer" via the `!dict.entries` guard below.
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
        // No artificial cap (same discipline as the D77 "Use with"/"Ask
        // about" pools in js/Actionable.js -- OpenRadial/Qol already page
        // real overflow, so this must not silently drop real dictionary
        // verbs ahead of that). A prior slice(0,80) here truncated
        // alphabetically-late verbs off entirely (confirmed live: Advent's
        // "look"/"pray"/"take"/"xyzzy" all sort past 80 earlier verb-flagged
        // words and never survived), found via harness/d34-dictionary-verbs.js.
        return Array.from(new Set(out));
    },
    // D34: look/inventory are Inform-family UNIVERSALS, already reserved by
    // js/Qol.js's GetRadialCommands `universals` array (D26) ahead of any
    // game-content dump. Hardcoding them here too meant every consumer saw
    // two independent, potentially-conflicting sources of the same two
    // words. specialCommands is now exactly the real dictionary-verb words
    // this build's own RAM dictionary flagged -- nothing added, nothing
    // capped -- so it never claims a word the game's own data didn't confirm,
    // and never duplicates what Qol.js already guarantees.
    collect: function () {
        try {
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            if (!mem) {
                return { sources: [{ name: "grammar-ram", confidence: 0.02 }], specialCommands: [] };
            }
            var verbs = GrammarProvider.readVerbWords(mem);
            var special = verbs.map(function (v) {
                return { label: v, command: v, source: "dictionary-verb" };
            });
            try {
                window.__PL_GRAMMAR_VERBS__ = verbs;
            } catch (e2) {}
            return {
                sources: [{ name: "grammar-ram", confidence: verbs.length ? 0.55 : 0.02 }],
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
