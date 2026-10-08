var Actionable = {
    Scope: { roomName: "", roomId: null, roomNouns: [], inventoryNouns: [], lastLookText: "", lastInventoryText: "" },
    Signature: "",
    InventoryRequested: false,
    LiveMarks: [],
    _markEpoch: null,
    _lineVersions: new WeakMap(),
    RoomLines: [],
    RoomHeading: null,
    /* Session usage counts for input-line radial ranking (D26/#33/#34).
       Incremented from Submit — the single command choke-point — not from
       DOM/text scraping. Full commands rank by exact match; verb-stem
       radial items (Enter:false, e.g. "take ") rank by first-token verb
       frequency so submitting "take lamp" lifts the "take " stem. */
    usageCounts: {},
    verbCounts: {},
    radialInteractionCounts: {},
    radialAcceptedOverlapCounts: {},
    pendingRadialUsageKey: null,
    // D64: once a specific object id's real-text match has been verified
    // (see wrapTargets below), remember which phrase actually worked --
    // keyed by RAM object id, so it survives past the tick that found it
    // (the object leaves visible room text once taken, but ActionSynth
    // still needs a real, parser-valid noun for its inventory commands).
    // Never guessed -- only ever set from a phrase that was confirmed
    // present in real printed game text.
    VerifiedNouns: {},
    // Compound-name follow-on to D64/D70 (operator: "examine long-handled shovel" rejected by the game's own
    // parser even though "shovel" alone is real vocabulary; "it really should just be defaulting when possible
    // to the base item name"). VerifiedNouns above answers "what text should be underlined in the room's PRINTED
    // words" (longest visible match wins, D70-protected) -- that is a different question from "what word should
    // be TYPED at the parser," and conflating them was the bug: a compound display name is nearly always the
    // longest, first-tried, and only-ever-verified phrase, so it silently became the command text too, even
    // when it is not itself real parser vocabulary. CommandNouns answers the second question, from the object's
    // OWN structural dictionary words (ZRamReader.parserWords, attached to every payloadPool() object as
    // .aliases) -- never from room prose, and independent of whether the object's name currently appears in
    // printed text at all, so an inventory item keeps a real command noun after it leaves room text. Recomputed
    // from the current room+inventory scope on every changed Refresh: aliases are static, but whether an alias
    // uniquely identifies its object changes as objects enter and leave scope. Non-Inform-compiled objects have
    // aliases:[] (ZRamReader.isInformCompiled
    // gate) and fall through unchanged to VerifiedNouns/obj.name, exactly as before this fix.
    CommandNouns: {},
    // Among an object's own real dictionary words, prefer one that is not shared with any OTHER object
    // currently in scope (aliasCounts: word -> how many distinct object ids in the current room+inventory pool
    // have it) -- a shared word like "key"/"door"/"note" is real vocabulary but would let the parser silently
    // resolve to the wrong physical object. If every alias is shared, still submit the best one rather than an
    // unverified display phrase: there is no disambiguation UI in this app (the game's own "Which do you mean"
    // reply just reopens the line prompt for the player's next line, the same as typing an ambiguous command
    // ever does), so a real-but-ambiguous word is strictly no worse than that, while an invalid compound phrase
    // is guaranteed wrong.
    pickCommandAlias: (obj, aliasCounts) => {
        var skip = { a: 1, an: 1, the: 1, of: 1, and: 1, or: 1, to: 1 };
        var list = (obj && obj.aliases) || [];
        var nameLower = String((obj && obj.name) || "").toLowerCase();
        var nameTokens = nameLower.split(/[^a-z0-9']+/).filter(Boolean);
        var seen = {}, filtered = [];
        list.forEach(function (w) {
            var wl = String(w || "").toLowerCase().trim();
            // These are compiler-owned parser words, not prose-mined underline
            // candidates. Legitimate short nouns such as "y2" must survive.
            if (!wl || skip[wl] || seen[wl]) return;
            seen[wl] = true;
            filtered.push(wl);
        });
        if (!filtered.length) return null;
        var unique = filtered.filter(function (w) { return (aliasCounts[w] || 0) <= 1; });
        var pool = unique.length ? unique : filtered;
        var inName = pool.filter(function (w) { return nameTokens.indexOf(w) >= 0; });
        if (!inName.length) return pool[0];
        // Prefer the rightmost exact display token. This usually selects the
        // displayed base noun ("key", "shovel", "note") while every choice
        // remains parser-owned vocabulary. Property-list order breaks ties.
        var best = inName[0], bestPos = nameTokens.lastIndexOf(best);
        inName.slice(1).forEach(function (w) {
            var pos = nameTokens.lastIndexOf(w);
            if (pos > bestPos) { best = w; bestPos = pos; }
        });
        return best;
    },
    commandNounsForPool: (objects) => {
        var pool = objects || [];
        var aliasOwners = {};
        pool.forEach(function (o) {
            if (!o || o.id == null) return;
            var objectKey = String(o.id);
            var seen = {};
            (o.aliases || []).forEach(function (w) {
                var wl = String(w || "").toLowerCase().trim();
                if (!wl || seen[wl]) return;
                seen[wl] = true;
                (aliasOwners[wl] = aliasOwners[wl] || {})[objectKey] = true;
            });
        });
        var aliasCounts = {};
        Object.keys(aliasOwners).forEach(function (w) {
            aliasCounts[w] = Object.keys(aliasOwners[w]).length;
        });
        var resolved = {};
        pool.forEach(function (o) {
            if (!o || o.id == null) return;
            var chosen = Actionable.pickCommandAlias(o, aliasCounts);
            if (chosen) resolved[String(o.id)] = chosen;
        });
        return resolved;
    },
    commandNounFor: (obj) => {
        try {
            if (obj && obj.id != null) {
                var key = String(obj.id);
                if (Actionable.CommandNouns[key]) return Actionable.CommandNouns[key];
                // D150: VerifiedNouns answers "what text was underlined in the
                // printed prose", which D146 already established is a DIFFERENT
                // question from "what word names this object to the parser".
                // Using it as a command noun leaks the first answer into the
                // second, and measured on Anchorhead it produced a real defect:
                // the object "real estate office door" is never printed with
                // the word "door" in it -- the room reads "Outside the Real
                // Estate Office" -- so the mark landed on "estate" and the
                // synthesized command became "examine estate".
                //
                // This branch is only reached for an object with NO mined
                // vocabulary at all (otherwise CommandNouns won above), and for
                // such an object every markable phrase is one of its own name
                // tokens. Among those, the head token is the thing the object
                // IS. So a mark-derived phrase is overridden by the head token
                // when the dictionary confirms that token parses -- evidence,
                // not preference.
                //
                // Deliberately narrow: a verified phrase that already ENDS in
                // the head token is a more specific reference and is kept
                // ("wedding ring" is better than "ring"), and an object with no
                // verified phrase keeps its full display name exactly as before.
                var verified = Actionable.VerifiedNouns[key];
                if (verified) {
                    var head = Actionable.headTokenOf(obj);
                    if (head && head !== String(verified).toLowerCase()
                        && !new RegExp("(^|\\s)" + head + "$").test(String(verified).toLowerCase())
                        && Actionable.isGameWord(head)) {
                        return head;
                    }
                    return verified;
                }
            }
        } catch (e) {}
        return (obj && obj.name) || "";
    },
    // D141 (operator-reported: "green blob / yellow blob / blue blob -- it
    // doesn't understand their difference"). Phase 4 planned this and it was
    // never built: "adjective+noun unambiguous commands (query the object's
    // dictionary adjective properties, not just its noun, so a synthesized
    // command like TAKE SMALL BRASS KEY is unique enough to skip parser
    // disambiguation - not just TAKE KEY)".
    //
    // D64/D107 deliberately reduced a command to ONE verified dictionary word,
    // which is right when that word is unique and wrong the moment it is not:
    // three blobs all verify as "blob", so all three produce the same command
    // and the story has to stop and ask which one was meant.
    //
    // Everything here is RAM-derived and deterministic -- the object's own
    // dictionary words and its own header short-name. No prose is read, and a
    // qualifier is only added when a real rival is in scope RIGHT NOW, so an
    // unambiguous object keeps the exact short command it has today.
    vocabularyKey: function (word) {
        var w = String(word || "").toLowerCase();
        // Punctuation consumes Z-characters: a hyphenated dictionary entry
        // can truncate before character nine. Compare its actual encoding.
        try {
            var vm = window.__PARCHLOCK_ZVM__;
            if (/^[a-z][a-z'-]*$/.test(w) && /['-]/.test(w) && vm && vm.encode) {
                return "z:" + vm.encode(Array.from(w, function (c) { return c.charCodeAt(0); })).join(",");
            }
        } catch (eEncoding) {}
        try {
            var mem = ZRamProvider.getMem();
            ZRamReader.hasDictionaryWord(mem, w);
            var dict = ZRamReader._dictWordCache || ZRamReader.parseDictionary(mem);
            if (dict.words[w]) return "@" + dict.words[w];
            var cut = ZRamReader.header(mem).version <= 3 ? 6 : 9;
            if (/^[a-z]+$/.test(w) && dict.words[w.slice(0, cut)]) return "@" + dict.words[w.slice(0, cut)];
        } catch (e) {}
        return w;
    },
    referenceFor: function (obj, suppliedPool) {
        var pool = suppliedPool || Actionable.payloadPool();
        var noun = Actionable.disambiguatedNoun(obj);
        var tokens = String(noun || "").toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
        var owners = {}, candidates = [];
        Actionable.distinctObjects(pool.concat(obj || [])).forEach(function (o) {
            if (!o || o.id == null || owners[String(o.id)]) return;
            owners[String(o.id)] = true;
            var words = (o.aliases || []).concat(String(o.name || "").toLowerCase().split(/[^a-z0-9'-]+/)).map(Actionable.vocabularyKey);
            if (tokens.length && tokens.every(function (t) { return words.indexOf(Actionable.vocabularyKey(t)) >= 0; })) candidates.push(o.id);
        });
        var mem = null;
        try { mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null; } catch (eM) {}
        var head = tokens.length ? tokens[tokens.length - 1] : "";
        var customUnverified = pool.some(function (o) {
            if (!o || o.id == null || o.parserReferenceVerified) return false;
            var hasCustom = !!(o.customParseName || o.parseNameUnverified);
            if (!hasCustom) {
                try {
                    hasCustom = !!(mem && typeof ZRamReader !== "undefined" && ZRamReader.objectHasCustomParseName
                        && ZRamReader.objectHasCustomParseName(mem, o.id));
                } catch (eC) { hasCustom = false; }
            }
            if (!hasCustom) return false;
            if (String(o.id) === String(obj && obj.id)) return true;
            if (candidates.indexOf(o.id) >= 0 || candidates.indexOf(String(o.id)) >= 0) return true;
            // Custom parsers may accept a shared head without listing every adjective.
            var words = (o.aliases || []).map(Actionable.vocabularyKey);
            return !!(head && words.indexOf(Actionable.vocabularyKey(head)) >= 0);
        });
        // A custom parser is not evidence of a collision. Keep the existing
        // interaction path; reserve the stricter proof for automatic learning.
        var unique = candidates.length === 1 && String(candidates[0]) === String(obj && obj.id);
        return { noun: noun, candidateIds: candidates, unique: unique, verified: unique && !customUnverified, provenance: "scoped-vocabulary" };
    },
    isGrammarParticle: function (word) { return /^(a|an|the|of|and|or|to)$/i.test(String(word || "")); },
    // Trigger presentation only; these tokens never change scope or command nouns.
    isReferenceToken: function (word) { return /^(it|its|them|they|him|her|his|your|yours|my|mine|our|ours|their|theirs|hers|you|me|myself|yourself|he|she|us|we|i)$/i.test(String(word || "").trim()); },
    observedLine: function (line) {
        return !!(line && line.isConnected && !Actionable.IsInstruction(line)
            && !$(line).closest('.pl-carry-probe, .pl-stat-probe, [aria-hidden="true"], [hidden]').length
            && $(line).is(':visible'));
    },
    displayNameFor: function (obj, pool, text) { return Actionable.observedPhraseFor(obj,pool,text,false); },
    observedPhraseFor: function (obj, pool, text, requireUnique) {
        // Display-only equivalence uses the live interpreter's encoding: a
        // hyphen consumes an alphabet shift and can truncate before character 9.
        var displayKey = function (word) {
            var w = String(word || "").toLowerCase();
            var vm = window.__PARCHLOCK_ZVM__;
            if (vm && vm.encode && /^[a-z][a-z'-]*$/.test(w)) {
                try { return "z:" + vm.encode(Array.from(w, function (c) { return c.charCodeAt(0); })).join(","); } catch (e) {}
            }
            return Actionable.vocabularyKey(w);
        };
        var aliases = (obj.aliases || []).map(displayKey);
        if (!aliases.length) return obj.name;
        var source = String(text || "").toLowerCase();
        var matches = Array.from(source.matchAll(/[a-z][a-z'-]*/g));
        var words = matches.map(function (match) { return match[0]; });
        var best = "", bestRank = -1;
        var structural = String(obj.structuralName || obj.name || "").toLowerCase().replace(/\s+/g," ").trim();
        for (var i = 0; i < words.length; i++) {
            var phrase = [];
            for (var j = i; j < Math.min(words.length, i + 6); j++) {
                if (j > i && !/^\s+$/.test(source.slice(matches[j - 1].index + words[j - 1].length, matches[j].index))) break;
                if (aliases.indexOf(displayKey(words[j])) < 0) break;
                phrase.push(words[j]);
                // D184 recovered labels need a real vocabulary word at both
                // edges. Interior articles remain valid; named objects retain
                // their structural labels (including "the Order").
                if (obj.labelProvenance === "parser-vocabulary"
                    && (Actionable.isGrammarParticle(phrase[0]) || Actionable.isGrammarParticle(words[j]))) continue;
                if (phrase.length < 2 && obj.labelProvenance !== "parser-vocabulary") continue;
                var owners = (pool || []).filter(function (o) {
                    var mine = (o.aliases || []).map(displayKey);
                    return phrase.every(function (w) { return mine.indexOf(displayKey(w)) >= 0; });
                });
                if ((!requireUnique || owners.length === 1) && owners.some(function (o) { return String(o.id) === String(obj.id); })) {
                    var label = phrase.join(" ");
                    // Shared spelling recovery cannot erase an observed structural
                    // descriptor. Unique extensions of that name remain preferred.
                    // Parser ownership selection retains its existing unique gate.
                    var preservesName = label === structural || (owners.length === 1 && structural && (" " + label + " ").indexOf(" " + structural + " ") >= 0);
                    var rank = requireUnique ? 0 : preservesName ? 3 : owners.length === 1 ? 2 : 1;
                    if (rank > bestRank || (rank === bestRank && label.length > best.length)) { best = label; bestRank = rank; }
                }
            }
        }
        return best || obj.name;
    },
    nounWordsOf: (obj) => {
        var out = {};
        try {
            ((obj && obj.aliases) || []).forEach(function (w) {
                w = String(w || "").toLowerCase().trim();
                if (w) out[w] = 1;
            });
            String((obj && obj.name) || "").toLowerCase().split(/[^a-z0-9'-]+/).forEach(function (w) {
                if (w) out[w] = 1;
            });
        } catch (e) {}
        return out;
    },

    // Objects currently in scope that answer to the same word. Those are the
    // ones the parser would have to choose between.
    rivalsFor: (obj, base) => {
        var b = String(base || "").toLowerCase().trim();
        if (!b) return [];
        try {
            return Actionable.payloadPool().filter(function (o) {
                if (!o || String(o.id) === String(obj && obj.id)) return false;
                return !!Actionable.nounWordsOf(o)[b];
            });
        } catch (e) { return []; }
    },

    // D144: a Z-machine dictionary stores only the first 6 characters of a word
    // (9 from v4), so mining Zork1's mailbox yields the entry "mailbo". Typing
    // that DOES parse -- the interpreter truncates input the same way -- but it
    // reads like a typo in the radial and in the command line. When a display
    // token simply extends the stored entry, both spellings resolve to the very
    // same dictionary entry, so the full word is shown instead. Length-gated to
    // the real truncation points so an ordinary short word is never "expanded"
    // into something the parser has not got.
    expandTruncated: (word, obj) => {
        var w = String(word || "").toLowerCase().trim();
        if (!w) return word;
        var tokens = String((obj && obj.name) || "").toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].length <= w.length || tokens[i].indexOf(w) !== 0) continue;
            if (/['-]/.test(w) || /['-]/.test(tokens[i])) {
                // Only the interpreter's encoding can prove this spelling.
                if (Actionable.vocabularyKey(w).indexOf("z:") === 0 && Actionable.vocabularyKey(w) === Actionable.vocabularyKey(tokens[i])) return tokens[i];
            } else if (w.length === 6 || w.length === 9) return tokens[i];
        }
        return word;
    },

    // The object's head noun: the rightmost word of its printed name that is
    // also one of its real dictionary words. For "green blob" that is "blob" --
    // the thing it IS, as opposed to which one it is.
    headNounOf: (obj) => {
        var words = (obj && obj.aliases) || [];
        if (!words.length) return "";
        var tokens = String((obj && (obj.displayName || obj.name)) || "").toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
        for (var i = tokens.length - 1; i >= 0; i--) {
            if (words.some(function (w) { return Actionable.vocabularyKey(w) === Actionable.vocabularyKey(tokens[i]); })) return tokens[i];
        }
        return "";
    },

    // D146: the head token of the object's printed name -- its rightmost real
    // word. Unlike headNounOf this does NOT require the word to be confirmed
    // vocabulary, so it is used only to choose WHICH WORD TO UNDERLINE, never
    // to build a command. An object can easily have no minable dictionary
    // words (Anchorhead's "transom window" has none), and without this the
    // longest token wins and underlines "transom" while "window" sits
    // unmarked in the same sentence.
    headTokenOf: (obj) => {
        var skip = { a: 1, an: 1, the: 1, of: 1, and: 1, or: 1, to: 1 };
        var tokens = String((obj && obj.name) || "").toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
        for (var i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].length >= 3 && !skip[tokens[i]]) return tokens[i];
        }
        return "";
    },

    // D147: is this word real vocabulary in the loaded story file? Answers
    // "false" whenever RAM is unavailable, so an unverifiable word is never
    // treated as verified.
    isGameWord: (word) => {
        try {
            if (typeof ZRamProvider === "undefined" || !ZRamProvider.getMem) return false;
            var mem = ZRamProvider.getMem();
            if (!mem || typeof ZRamReader === "undefined" || !ZRamReader.hasDictionaryWord) return false;
            return ZRamReader.hasDictionaryWord(mem, word);
        } catch (e) { return false; }
    },

    // D147: "use X with Y" was submitted for every object in every game, and
    // `use` is not a verb in either the ZIL or the Inform 6 standard library.
    // Measured across the catalog's own dictionaries: ABSENT from Zork 1,
    // Planetfall, Enchanter, Balances and Anchorhead; PRESENT only in Advent.
    // Confirmed live in Enchanter -- "use book with me" replies
    // "I don't know the word 'use'." So the whole launcher was dead text
    // wherever it mattered.
    //
    // Each candidate below carries the phrasing that verb really takes, and is
    // offered only when this story's dictionary contains the verb (D24: an
    // honest absence beats a command that cannot parse). `cast A at B` was
    // confirmed live -- "cast blorb at book" encloses the spell book in a
    // strong box -- which is the spell/inventory path the operator asked about.
    INSTRUMENTALS: [
        { verb: "use", label: "Use with...", build: function (a, b) { return "use " + a + " with " + b; } },
        { verb: "cast", label: "Cast at...", build: function (a, b) { return "cast " + a + " at " + b; } },
        { verb: "unlock", label: "Unlock with...", build: function (a, b) { return "unlock " + b + " with " + a; } }
    ],
    availableInstrumentals: () => {
        try {
            return Actionable.INSTRUMENTALS.filter(function (i) { return Actionable.isGameWord(i.verb); });
        } catch (e) { return []; }
    },

    disambiguatedNoun: (obj) => {
        var fallback = Actionable.expandTruncated(Actionable.commandNounFor(obj), obj);
        var noun = Actionable.headNounOf(obj);
        if (!noun) {
            var own = (obj && obj.aliases) || [];
            var pool = Actionable.payloadPool();
            var unique = own.find(function (word) {
                return !/^(a|an|the|of|and|or|to|some)$/i.test(word) && !pool.some(function (r) {
                    return String(r.id) !== String(obj.id) && (r.aliases || []).some(function (w) { return Actionable.vocabularyKey(w) === Actionable.vocabularyKey(word); });
                });
            });
            return unique ? Actionable.expandTruncated(unique, obj) : fallback;
        }

        var rivals = Actionable.rivalsFor(obj, noun);
        // Nothing else answers to this noun: the short form is unambiguous and
        // is left exactly as it was.
        if (!rivals.length) return Actionable.expandTruncated(noun, obj);

        // Words the rivals also answer to cannot separate us from them.
        var taken = {};
        rivals.forEach(function (r) {
            var w = Actionable.nounWordsOf(r);
            Object.keys(w).forEach(function (k) { taken[k] = 1; });
        });

        // Prefer a qualifier that actually appears in this object's own printed
        // name, so the phrase reads the way the story writes it ("green blob"),
        // then any other unshared dictionary word.
        var nameTokens = String((obj && obj.name) || "").toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean);
        var mine = ((obj && obj.aliases) || []).map(function (w) { return String(w || "").toLowerCase().trim(); });
        var usable = mine.filter(function (w) {
            return w && w.length > 1 && w !== noun && !taken[w];
        });
        // D147: a rival's printed NAME tokens are just as unusable as its mined
        // words -- two objects both called "... spell" are not separated by
        // "spell" no matter which list the word came from.
        rivals.forEach(function (r) {
            String((r && r.name) || "").toLowerCase().split(/[^a-z0-9'-]+/).filter(Boolean)
                .forEach(function (w) { taken[w] = 1; });
        });
        usable = usable.filter(function (w) { return !taken[w]; });
        // D147: the qualifier may also come from the object's own printed name,
        // PROVIDED the game's own dictionary actually contains that word. This
        // is not the invented compound phrase D107 forbids -- D107's failure was
        // submitting words the parser has never heard of ("long-handled"),
        // whereas this is the same self-verification discipline as D142: the
        // word ships in the story file's dictionary, so it parses.
        //
        // Measured on Enchanter: every spell is an object named "<name> spell"
        // whose only minable word is "spell", so all of them previously reduced
        // to the single command "spell" and the story had to ask which was meant
        // -- the reported blob defect again, in spell form. "rezrov" IS in
        // Enchanter's dictionary, and "cast rezrov spell at me" was confirmed
        // live to parse exactly as "cast rezrov at me" does.
        nameTokens.forEach(function (w) {
            if (!w || w.length < 2 || w === noun || taken[w]) return;
            if (usable.indexOf(w) >= 0) return;
            if (Actionable.isGameWord(w)) usable.push(w);
        });
        if (!usable.length) {
            // D107: with nothing to distinguish it, keep the real single word.
            // An invented compound phrase is rejected by the parser outright,
            // which is worse than the story asking "Which do you mean?".
            // A shared observed head is real vocabulary too. Keep its readable
            // spelling; uniqueness is still decided by referenceFor.
            return Actionable.expandTruncated(noun, obj);
        }
        var inName = usable.filter(function (w) { return nameTokens.indexOf(w) >= 0; });
        var qualifier = inName.length ? inName[0] : usable[0];
        return Actionable.expandTruncated(qualifier, obj) + " " + Actionable.expandTruncated(noun, obj);
    },

    usageKey: (command) => String(command || "").replace(/\s+/g, " ").trim().toLowerCase(),
    noteUsage: (command) => {
        var key = Actionable.usageKey(command);
        if (!key) return;
        Actionable.usageCounts[key] = (Actionable.usageCounts[key] || 0) + 1;
        var verb = key.split(" ")[0];
        if (verb) Actionable.verbCounts[verb] = (Actionable.verbCounts[verb] || 0) + 1;
        // A non-submitting radial pill already counted its tap. If the next
        // accepted command is that exact text or a completion of its stem,
        // record the overlap so adaptive ranking counts the player action
        // once. Any other accepted command abandons the pending completion.
        var pending = Actionable.pendingRadialUsageKey;
        if (pending && pending.indexOf("radial:") === 0) {
            var pendingCommand = pending.slice(7);
            if (key === pendingCommand || key.indexOf(pendingCommand + " ") === 0) {
                Actionable.radialAcceptedOverlapCounts[pending] = (Actionable.radialAcceptedOverlapCounts[pending] || 0) + 1;
            }
        }
        Actionable.pendingRadialUsageKey = null;
    },
    noteRadialInteraction: (usageKey) => {
        var key = String(usageKey || "").trim().toLowerCase();
        if (!key) return;
        Actionable.radialInteractionCounts[key] = (Actionable.radialInteractionCounts[key] || 0) + 1;
        if (key.indexOf("radial:") === 0) Actionable.pendingRadialUsageKey = key;
    },
    // D88 Stage 6: "count usage by semantic action plus exact rendered
    // form, retaining legacy counters for comparison during the soak"
    // (PRODUCTION_PLAN.md line 128). Legacy usageCounts/verbCounts above are
    // untouched -- this is purely additive bookkeeping, populated only from
    // cutover-path Action closures that already know their own intent (no
    // post-hoc re-parsing of the submitted string).
    intentUsageCounts: {},
    noteIntentUsage: (intent) => {
        if (!intent) return;
        Actionable.intentUsageCounts[intent] = (Actionable.intentUsageCounts[intent] || 0) + 1;
    },
    // D88 Stage 6 cutover point. Default OFF: SemanticActions.CutoverFlag
    // defaults to disabled, so this returns the exact legacy array
    // unchanged unless the flag is explicitly on. When on, sources from
    // SemanticActions instead of calling ActionSynth directly -- proven
    // byte-parity with the legacy path (harness/d88-semantic-parity.js), so
    // this changes WHERE the array is computed, never its contents.
    resolveObjectCommands: (objectId, kind, options) => {
        var target = Actionable.payloadPool().find(function (o) { return String(o.id) === String(objectId); });
        if (target && !Actionable.referenceFor(target).unique && !(options && options.allowAmbiguousReference)) return [];
        try {
            var hit = Actionable.payloadPool().find(function (o) {
                return o && String(o.id) === String(objectId);
            });
            if (hit && hit.examineOnly) {
                var noun = Actionable.commandNounFor(hit) || hit.name;
                if (!noun) return [];
                // D201: a promoted candidate may now carry attributes decoded
                // from this module's own compiler declarations. Let the shared
                // synthesizer expose only those directly evidenced capabilities
                // (plus confirmed per-object learning); it deliberately omits
                // dictionary-only guesses. Modules without declarations retain
                // the historical inspect-only result below.
                if (typeof ActionSynth !== "undefined" && ActionSynth.commandsForEvidenceObject) {
                    return ActionSynth.commandsForEvidenceObject(hit, kind === "inventory" ? "inventory" : "room", options) || [];
                }
                var cmds = [];
                // The inspect verb keeps its policy: disabled means no command
                // at all, and a learned substitute ("look at") is honoured.
                if (typeof ActionSynth !== "undefined" && !ActionSynth.inspectVerbDisabled()) {
                    var inspect = ActionSynth.defaultInspectVerb();
                    if (inspect) cmds.push({ verb: inspect, command: inspect + " " + noun, confidence: 0.85 });
                }
                // D190: Take, but only when the MODULE'S OWN declared attributes
                // say so. A blanket Take was added to make the pellets takeable
                // and broke the inspect policy above; full synthesis was
                // rejected by both audits because it also offered "drink
                // pellets" -- measured, not hypothetical.
                //
                // These attrs are populated by promoteUnnamed ONLY where D186
                // decoded the module's declared attribute table, so this gate
                // reads the compiler's own declaration rather than the standard
                // profile that D58/D73 show cannot be trusted here. Where no
                // table decoded, attrs stay empty and the object remains
                // examine-only, exactly as before.
                var pa = hit.attrs || {};
                if (pa.takeable && !pa.static && !pa.scenery) {
                    cmds.push({ verb: "take", command: "take " + noun, confidence: 0.9 });
                }
                return cmds;
            }
        } catch (eEx) {}
        try {
            if (typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled()) {
                var resolvedKind = kind === "inventory" ? "inventory" : "room";
                var semantic = SemanticActions.resolveForPayloadObjectId(objectId, resolvedKind) || [];
                // The precedence resolver chooses one semantic winner per verb,
                // but the radial is also the discoverability surface for every
                // distinct command already justified by the legacy deterministic
                // synthesizer. Preserve those parallel forms after the winners;
                // exact rendered duplicates are removed, never capabilities.
                var legacy = (typeof ActionSynth !== "undefined" && objectId)
                    ? (ActionSynth.commandsForPayloadObjectId(objectId, resolvedKind, options) || []) : [];
                var seen = {};
                return semantic.concat(legacy).filter(function (entry) {
                    var key = String((entry && entry.command) || "").toLowerCase().replace(/\s+/g, " ").trim();
                    if (!key || seen[key]) return false;
                    seen[key] = true;
                    return true;
                });
            }
        } catch (e) {}
        try {
            if (typeof ActionSynth !== "undefined" && objectId) {
                return ActionSynth.commandsForPayloadObjectId(objectId, kind === "inventory" ? "inventory" : "room", options) || [];
            }
        } catch (e) {}
        return [];
    },
    // Same cutover point for exit/direction commands -- mirrors
    // commandForExitLabel exactly when the flag is on (proven in
    // harness/d88-semantic-parity.js fixture 5).
    resolveExitCommand: (label) => {
        try {
            if (typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled()) {
                return SemanticActions.resolveExitCommand(label);
            }
        } catch (e) {}
        return Actionable.commandForExitLabel(label);
    },
    // Same cutover point for the "Ask about..." topic list. When the flag is
    // on, sources from SemanticActions.resolveAskAboutFormsForObject (proven
    // byte-parity against this exact legacy construction in
    // harness/d88-semantic-parity.js fixture 4); when off, this IS that
    // legacy construction, verbatim, unchanged.
    resolveAskAboutTopics: (objectId) => {
        try {
            if (typeof SemanticActions !== "undefined" && SemanticActions.CutoverFlag && SemanticActions.CutoverFlag.isEnabled()) {
                return (SemanticActions.resolveAskAboutFormsForObject(objectId) || []).map(function (f) {
                    return { Label: f.noun, Command: f.command, intent: f.intent };
                });
            }
        } catch (e) {}
        try {
            var clicked = Actionable.payloadPool().find(function (o) { return o && String(o.id) === String(objectId); });
            var clickedAttrs = clicked && clicked.attrs;
            if (!clicked || !clickedAttrs || !(clickedAttrs.animate || clickedAttrs.talkable)) return [];
            var askPlayerId = (typeof ActionSynth !== "undefined" && ActionSynth.payloadPlayerId)
                ? ActionSynth.payloadPlayerId(WorldModel && WorldModel.lastPayload) : null;
            var topics = Actionable.payloadPool().filter(function (o) {
                if (!o || String(o.id) === String(objectId)) return false;
                if (askPlayerId != null && String(o.id) === String(askPlayerId)) return false;
                return true;
            });
            return topics.map(function (topic) {
                var cmd = "ask " + Actionable.commandNounFor(clicked) + " about " + Actionable.commandNounFor(topic);
                return { Label: topic.name, Command: cmd, intent: "ASK_ABOUT" };
            });
        } catch (e2) { return []; }
    },
    // Saturation ceiling a command's usage bonus can ever reach (6 real
    // uses at +6 each). Exposed as a named constant, not a magic 36,
    // because Qol.js OpenRadial normalizes the visible fill percentage
    // against this same ceiling (D46) -- a single-item radial where that
    // one item happens to be the current highest scorer must not read as
    // "fully used" after one click.
    MAX_USAGE_BONUS: 36,
    usageCount: (command, radialUsageKey) => {
        var raw = String(command || "");
        var isStem = /\s$/.test(raw);
        var key = Actionable.usageKey(raw);
        var accepted = 0;
        if (key) {
            var verb = key.split(" ")[0];
            accepted = isStem ? (Actionable.verbCounts[verb] || 0) : (Actionable.usageCounts[key] || 0);
        }
        var interactionKey = String(radialUsageKey || "").trim().toLowerCase();
        var radial = interactionKey ? (Actionable.radialInteractionCounts[interactionKey] || 0) : 0;
        var overlap = interactionKey ? (Actionable.radialAcceptedOverlapCounts[interactionKey] || 0) : 0;
        return Math.max(0, accepted + radial - overlap);
    },
    usageBonus: (command, radialUsageKey) => {
        return Math.min(Actionable.usageCount(command, radialUsageKey) * 6, Actionable.MAX_USAGE_BONUS);
    },
    Init: () => {
        if (typeof TurnRecorder !== "undefined" && TurnRecorder.subscribeAcceptedSubmit) {
            TurnRecorder.subscribeAcceptedSubmit("actionable-usage", function (event) {
                Actionable.noteUsage(event.command);
            });
        }
        $(document).off("click.pmAct contextmenu.pmAct");
        $(document).on("click.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            var noun = this.dataset.noun;
            var kind = this.dataset.kind || "object";
            var oid = this.dataset.objectId || null;
            if (kind === "direction") Actionable.Submit(Actionable.resolveExitCommand(noun));
            else {
                var primary = null;
                var primaryIntent = null;
                var primaryEnter = true;
                try {
                    if (oid) {
                        var cmds = Actionable.resolveObjectCommands(oid, kind);
                        if (cmds && cmds[0] && cmds[0].learnedWordScope && typeof LearnedWords !== "undefined" && !LearnedWords.commandCurrent(cmds[0])) return;
                        if (cmds && cmds.length) { primary = cmds[0].command; primaryIntent = cmds[0].intent || null; primaryEnter = cmds[0].Enter !== false && cmds[0].enter !== false; }
                    }
                } catch (err) {}
                if (!primary) Actionable.Open(noun, kind, e.clientX, e.clientY, oid);
                if (primary) {
                    if (!primaryEnter) { Input.Clear(); Input.Inject(primary, false); Input.Focus(); }
                    else { Actionable.Submit(primary); if (primaryIntent) Actionable.noteIntentUsage(primaryIntent); }
                }
            }
        }).on("contextmenu.pmAct", ".pl-act:not(.is-stale)", function (e) {
            e.preventDefault();
            e.stopPropagation();
            Actionable.Open(this.dataset.noun, this.dataset.kind || "object", e.clientX, e.clientY, this.dataset.objectId || null);
        });

        // D88 Stage 6: genuine touch long-press (ARCHITECTURE_UML.md "Mobile
        // and out-of-sample gate" -- "contextmenu simulation at a narrow
        // viewport is not proof of mobile support"). Real touchstart/
        // touchmove/touchend timing, additive only: click.pmAct/
        // contextmenu.pmAct above are completely untouched, so desktop
        // behavior cannot regress (neither handler's own code changed).
        // A genuine tap (short touch, no meaningful movement) does nothing
        // here and falls through to the browser's own synthetic click
        // event, which the existing click.pmAct handler above already
        // processes -- one single code path for "tap", desktop or mobile.
        // A genuine long-press opens the SAME Actionable.Open() radial as
        // desktop right-click, then swallows the touch's own trailing
        // synthetic click/contextmenu so it cannot ALSO submit a second,
        // duplicate command.
        $(document).off("touchstart.pmAct touchmove.pmAct touchend.pmAct touchcancel.pmAct");
        Actionable.endHoldSelection(Actionable._touch);
        Actionable._touch = null;
        $(document).on("touchstart.pmAct", ".pl-act:not(.is-stale)", function (e) {
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var el = this;
            // D93 (G22): suppress native text selection only WHILE a
            // long-press gesture is active on this element, not permanently --
            // a permanent user-select:none on every .pl-act would silently
            // stop the player from ever copying noun-bearing story text,
            // a real regression in its own right. Removed again in every
            // exit path below (cancelled/touchend/touchcancel), after firing too.
            el.classList.add("pl-press-pending");
            Actionable._touch = { el: el, startX: touch.clientX, startY: touch.clientY, fired: false, touchId: touch.identifier };
            var state = Actionable._touch;
            Actionable.beginHoldSelection(state);
            state.timer = setTimeout(function () {
                if (Actionable._touch !== state) return; // cancelled (moved/lifted) before firing
                state.fired = true;
                Actionable.fireHoldSelection(state);
                Actionable.Open(el.dataset.noun, el.dataset.kind || "object", state.startX, state.startY, el.dataset.objectId || null);
            }, Actionable.LongPressMs);
        }).on("touchmove.pmAct", ".pl-act:not(.is-stale)", function (e) {
            var state = Actionable._touch;
            if (!state || state.el !== this) return;
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var dx = touch.clientX - state.startX, dy = touch.clientY - state.startY;
            // Cancellation: real finger movement past a small threshold is a
            // scroll/drag, not a hold -- never fire a radial out from under it.
            if (!state.fired && (dx * dx + dy * dy) > (Actionable.LongPressMoveCancelPx * Actionable.LongPressMoveCancelPx)) {
                clearTimeout(state.timer);
                Actionable.endHoldSelection(state);
                state.el.classList.remove("pl-press-pending");
                Actionable._touch = null;
            }
        }).on("touchend.pmAct", ".pl-act:not(.is-stale)", function (e) {
            var state = Actionable._touch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            state.el.classList.remove("pl-press-pending");
            if (state.fired) {
                // Duplicate-submission prevention: the long-press already
                // submitted via Open()'s radial: stop this touch's own
                // trailing synthetic click/contextmenu from ALSO firing.
                e.preventDefault();
            }
            Actionable._touch = null;
        }).on("touchcancel.pmAct", ".pl-act:not(.is-stale)", function () {
            var state = Actionable._touch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            state.el.classList.remove("pl-press-pending");
            Actionable._touch = null;
        });
    },
    // Selection belongs to the hold target, never to the whole transcript.
    _selectionHolds: [],
    beginHoldSelection: function (state) {
        if (!state || !state.el) return;
        Actionable._selectionHolds.slice().forEach(function (old) {
            if (old.el === state.el) Actionable.endHoldSelection(old);
        });
        state.el.classList.add("pl-hold-active");
        Actionable._selectionHolds.push(state);
        if (!Actionable._holdSelectionBound && document.addEventListener) {
            Actionable._holdSelectionBound = true;
            document.addEventListener("selectstart", Actionable.guardHoldSelection, true);
            document.addEventListener("contextmenu", Actionable.guardHoldSelection, true);
            // Capture also receives an end outside the original element. Leave
            // fired/long flags intact for the owner's trailing-click guard.
            ["touchend", "touchcancel"].forEach(function (name) {
                document.addEventListener(name, function (event) {
                    Actionable._selectionHolds.slice().forEach(function (s) {
                        if (s.pointerId == null && (s.touchId == null || Array.prototype.some.call(event.changedTouches || [], function (t) { return t.identifier === s.touchId; }))) Actionable.endHoldSelection(s);
                    });
                }, true);
            });
        }
        if (!Actionable._holdSelectionObserver && typeof MutationObserver !== "undefined" && document.documentElement) {
            Actionable._holdSelectionObserver = new MutationObserver(function () {
                Actionable._selectionHolds.slice().forEach(function (s) {
                    if (!s.el.isConnected) Actionable.endHoldSelection(s);
                });
            });
            Actionable._holdSelectionObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    },
    guardHoldSelection: function (event) {
        if (Actionable._selectionHolds.some(function (s) {
            return s.el === event.target || (s.el.contains && s.el.contains(event.target));
        })) {
            event.preventDefault();
            if (event.type === "contextmenu") event.stopPropagation();
        }
    },
    fireHoldSelection: function (state) {
        if (!state || !state.el) return;
        var el = state.el;
        try {
            var selection = window.getSelection && window.getSelection();
            if (selection) {
                // Remove only ranges touching this target. Other selected text
                // remains copyable even when a different control opens a ring.
                for (var i = selection.rangeCount - 1; i >= 0; i--) {
                    var range = selection.getRangeAt(i);
                    if (range.intersectsNode(el)) selection.removeRange(range);
                }
            }
            if (typeof el.selectionStart === "number") el.setSelectionRange(el.selectionEnd, el.selectionEnd);
        } catch (e) {}
    },
    endHoldSelection: function (state) {
        if (!state || !state.el) return;
        clearTimeout(state.timer);
        state.el.classList.remove("pl-hold-active");
        state.el.classList.remove("pl-press-pending");
        if (state.selectionCleanup) state.selectionCleanup();
        Actionable._selectionHolds = Actionable._selectionHolds.filter(function (s) { return s !== state; });
        if (!Actionable._selectionHolds.length && Actionable._holdSelectionObserver) {
            Actionable._holdSelectionObserver.disconnect();
            Actionable._holdSelectionObserver = null;
        }
    },
    LongPressMs: 500,
    // D93 (plan §3.6c): raised from 10 to 20 -- 10px is smaller than
    // typical real-finger jitter on a touchscreen while holding still,
    // which was self-cancelling legitimate long-presses before they could
    // ever fire.
    LongPressMoveCancelPx: 20,

    Submit: (command, source) => {
        try {
            if (/^(undo|restore|restart)$/i.test(String(command || "").trim())) {
                window.__PL_RESYNC__ = Date.now();
                if (typeof TextGate !== "undefined" && /^(restore|restart)$/i.test(String(command).trim())) TextGate.reset();
                if (typeof TranslatorUI !== "undefined") TranslatorUI.lastSig = "";
            }
        } catch (e) {}

        /* UNDO_RESTORE_RESYNC */
        if (!$(".Input.LineInput").length || Message.IsOpen || $("#dialog").length) return false;
        if (!$(".Input.LineInput:visible").length
            // D192 (grok round 2): the `equip-open` escape has been removed.
            // It allowed ANY injection into a hidden line input for as long as
            // the sheet was open -- a radial or a map tap, not just the sheet's
            // own drag-and-drop -- which contradicts D86's rule that
            // Input.Inject is the single non-typed choke point. The probe's own
            // submission has its own narrow permission below.
            //
            // Measured before removing it: with the sheet open the line input
            // is VISIBLE on both desktop and mobile (412px), so the sheet's
            // drag-and-drop and Refresh still pass the visibility test above
            // and never needed this clause.
            && !(typeof StatTracker !== "undefined" && StatTracker._carryProbeSubmitting)) return false;
        Input.Clear();
        var accepted = Input.Inject(command, true, source || "inject");
        // Mobile: never Focus after a headless radial/tap submit -- that
        // pops the OS keyboard on every examine/go (operator). Keyboard
        // only after a deliberate short-tap on the line field.
        try {
            if (document.body.classList.contains("pl-mobile")
                && typeof Input !== "undefined" && Input.DismissKeyboard) {
                Input.DismissKeyboard();
            } else {
                Input.Focus();
            }
        } catch (eF) {
            try { Input.Focus(); } catch (e2) {}
        }
        return accepted;
    },
    Stale: () => $(".pl-act:not(.is-stale)").addClass("is-stale").removeAttr("tabindex role"),
    IsInstruction: line => /^\s*\(?\s*(?:type|press|for help|for more information|release\s+\d|serial number)\b/i.test(line.textContent),
    // D184: an object the compiler gave no printable name can still own real
    // parser vocabulary. wump2ka's food pellets are objects "(bar1)"/"(bar2)"
    // carrying ["food","pellet","pellets",...], printed as "two food pellets"
    // and never highlightable because the meta-name filter discards them.
    //
    // A first attempt named them inside ZRamReader and was reverted: measured
    // across the catalog it renamed Anchorhead's rooms, LostPig's internals and
    // 905's PLAYER object, because "what should this be called" has no
    // evidential answer in a RAM module. The answer lives HERE, where the
    // printed text is: a candidate becomes real only when the game has just
    // printed one of its own words, in this room, this turn -- the same
    // question D64/D70 already answer for named objects.
    promoteUnnamed: (payload, roomText) => {
        var out = [];
        try {
            var cands = (payload && payload.unnamedCandidates) || [];
            if (!cands.length || !roomText) return out;
            var text = String(roomText).toLowerCase();

            // Hard exclusions. Each is a decision already taken elsewhere, not
            // a judgement made here.
            var blocked = {};
            if (payload.playerId != null) blocked[String(payload.playerId)] = 1;   // D82
            if (payload.roomId != null) blocked[String(payload.roomId)] = 1;
            try {
                if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.confirmedInventoryRootId) {
                    var rootMem = ZRamProvider.getMem();
                    var heldRoot = rootMem && AttrCalibrator.confirmedInventoryRootId(rootMem);
                    if (heldRoot != null) blocked[String(heldRoot)] = 1;
                }
            } catch (eRoot) {}
            try {
                (ParchLockMap.Rooms || []).forEach(function (r) {
                    if (r && r.ObjectId != null) blocked[String(r.ObjectId)] = 1;   // never a room
                });
            } catch (eR) {}

            // Scope and vocabulary establish candidates, not unique ownership.
            // A named carried copy must not erase an unnamed ground sibling.
            // referenceFor and the mark candidate set retain parser ambiguity.

            // Native encoding handles alphabet shifts as well as dictionary
            // width: space-ra is already truncated despite having 8 letters.
            var observedWords = Array.from(text.matchAll(/[a-z][a-z'-]*/g)).map(function (m) { return m[0]; });
            var observedKeys = observedWords.map(Actionable.vocabularyKey);

            // Resolved once per pass: the table is cached per memory instance,
            // but the absence of one should not be re-tested per candidate.
            var mem = null, hasDeclared = false;
            try {
                mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
                hasDeclared = !!(mem && typeof ZRamReader !== "undefined"
                    && ZRamReader.informAttributeNames && ZRamReader.informAttributeNames(mem));
            } catch (eD) {}
            var declaredAttrs = function (id) {
                if (!hasDeclared) return {};
                try { return ZRamReader.attrsFromObject(mem, id) || {}; } catch (eA) { return {}; }
            };

            cands.forEach(function (c) {
                if (!c || c.id == null || blocked[String(c.id)]) return;
                var best = null;
                ((c.aliases) || []).forEach(function (w) {
                    var t = String(w || "").toLowerCase().trim();
                    if (!t || t.length < 3) return;
                    if (Actionable.isGrammarParticle(t) || Actionable.isReferenceToken(t)) return;
                    if (!/^[a-z][a-z'-]*$/.test(t)) return;         // "barrel1" is a compiler tag
                    // A named sibling may share this vocabulary; keep each scoped RAM identity.
                    var index = observedKeys.indexOf(Actionable.vocabularyKey(t));
                    if (index < 0) return;
                    var printed = observedWords[index];
                    if (!best || printed.length > best.length) best = printed;
                });
                if (!best) return;
                // Keep physical siblings; the marker owns a candidate set.
                var recovered = { id: c.id, name: best, aliases: c.aliases, labelProvenance: "parser-vocabulary" };
                var display = Actionable.displayNameFor(recovered, cands, roomText);
                var label = Actionable.observedPhraseFor(recovered,cands,roomText,true);
                out.push({
                    id: c.id, name: label, displayName:display, parentId: c.parentId,
                    labelProvenance: "parser-vocabulary",
                    aliases: c.aliases,
                    // D190: the declared attributes, and ONLY when D186 decoded
                    // this module's own attribute-name table. D184 shipped {}
                    // here because the standard profile misreads this story --
                    // that reasoning stands wherever no table decoded, and is
                    // why this is conditional rather than unconditional.
                    attrs: declaredAttrs(c.id),
                    // D184: attributes cannot be trusted (D58/D73), so do not
                    // run ActionSynth. Examine + Take only -- these are room
                    // objects the player is meant to pick up (food pellets).
                    examineOnly: true
                });
            });
        } catch (e) {}
        return out;
    },

    distinctObjects: function (objects) {
        var positions = {}, out = [], held = {};
        if (typeof WorldModel !== 'undefined') (((WorldModel.lastPayload || {}).inventory) || []).forEach(function(o){held[String(o.id)]=o;});
        (objects || []).forEach(function(o){
            if (!o || o.id == null) return;
            var id=String(o.id), index=positions[id];
            if(index==null){positions[id]=out.length;out.push(o);} else {
                var aliases=Array.from(new Set((out[index].aliases||[]).concat(o.aliases||[])));
                out[index]=Object.assign({},out[index],o,{aliases:aliases});
            }
            if(held[id] && held[id].attrs) out[positions[id]]=Object.assign({},out[positions[id]],{attrs:held[id].attrs,parentId:held[id].parentId});
        });
        return out;
    },
    payloadPool: () => {
        try {
            var p = WorldModel && WorldModel.lastPayload;
            if (!p) return [];
            var base = (p.discoveredObjects || []).concat(p.inventory || []).filter(function (o) {
                return o && o.id != null && o.id !== "" && o.name;
            });
            var text = "";
            try {
                // Prefer player-observed look + inventory prose (EquipmentUI peer).
                // RoomLines alone miss inventory-only descriptors.
                var admitted = {};
                base.concat(p.unnamedCandidates || []).forEach(function (o) { admitted[String(o.id)] = true; });
                var retained = (Actionable.LiveMarks || []).filter(function (m) {
                    if (!Actionable.observedLine(m.closest('.BufferLine')) || m.classList.contains('is-stale')) return false;
                    var ids = [];
                    try { ids = JSON.parse(m.dataset.candidateIds || '[]'); } catch (eIds) {}
                    if (m.dataset.objectId) ids.push(m.dataset.objectId);
                    return ids.some(function (id) { return admitted[String(id)]; });
                }).map(function (m) { return m.textContent; });
                text = [Actionable.Scope.lastLookText || "", Actionable.Scope.lastInventoryText || "", Actionable.Scope.lastReplyText || ""]
                    .concat(retained)
                    .concat((Actionable.RoomLines || []).filter(function (l) { return l && l.isConnected; })
                        .map(function (l) { return l.textContent || ""; }))
                    .join("\n");
            } catch (eT) {}
            var seen = {};
            base.forEach(function (o) { seen[String(o.id)] = 1; });
            Actionable.promoteUnnamed(p, text).forEach(function (o) {
                if (!seen[String(o.id)]) base.push(o);
            });
            var mem = null;
            try {
                mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
            } catch (eM) {}
            return base.map(function (o) {
                var row = o;
                try {
                    if (mem && typeof ZRamReader !== "undefined" && ZRamReader.objectHasCustomParseName
                        && ZRamReader.objectHasCustomParseName(mem, o.id)
                        && !o.parserReferenceVerified) {
                        row = Object.assign({}, o, { customParseName: true, parseNameUnverified: true });
                    }
                } catch (eP) {}
                var display = Actionable.displayNameFor(row,base,text);
                var label = Actionable.observedPhraseFor(row,base,text,true);
                return label === row.name ? Object.assign({},row,{displayName:display}) : Object.assign({}, row, { name: label, displayName:display, structuralName: o.name, labelProvenance: row.labelProvenance === "parser-vocabulary" ? "parser-vocabulary" : "observed-vocabulary" });
            });
        } catch (e) { return []; }
    },
    exitLabels: () => {
        try {
            var p = WorldModel && WorldModel.lastPayload;
            return ((p && p.exits) || []).map(function (e) {
                return String((e && e.label) || "").toLowerCase();
            }).filter(Boolean);
        } catch (e) { return []; }
    },

    // D54: a direction's DISPLAY label (what the map/text shows, e.g. an
    // I7 numbered exit's own internal "exit-91" placeholder) is not always
    // real game vocabulary -- the parser may require a different word
    // entirely (that same exit's real command is "x1", confirmed live).
    // Every exit the RAM reader emits carries its own real `command`
    // alongside `label` (defaulting to the label for ordinary compass
    // exits, where the two are the same word); this looks that up so a
    // direction click/radial always submits the real command, never the
    // display label verbatim.
    commandForExitLabel: (label) => {
        try {
            var p = WorldModel && WorldModel.lastPayload;
            var exits = (p && p.exits) || [];
            var lab = String(label || "").toLowerCase();
            var hit = exits.find(function (e) { return e && String(e.label || "").toLowerCase() === lab; });
            return (hit && hit.command) || label;
        } catch (e) { return label; }
    },

    isStructuralPayload: (p) => {
        if (!p) return false;
        if (p.engineMode === "structural") return true;
        if (p.probe && p.probe.status === "z-ram-live") return true;
        try {
            if (typeof WorldModel !== "undefined" && WorldModel.isStructuralFact) return WorldModel.isStructuralFact(p);
        } catch (e) {}
        return false;
    },

    DeterministicNouns: () => {
        // payload objects win ? these are the only words that may be marked actionable
        var out = [];
        try {
            var p = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) ? WorldModel.lastPayload : null;
            if (p) {
                (p.discoveredObjects || []).forEach(function (o) {
                    var n = (o && o.name) ? String(o.name).toLowerCase() : "";
                    if (n) out.push(n);
                });
                (p.inventory || []).forEach(function (o) {
                    var n = typeof o === "string" ? o : (o && o.name) || "";
                    n = String(n).toLowerCase();
                    if (n) out.push(n);
                });
                (p.exits || []).forEach(function (e) {
                    var n = String((e && (e.label || e.dir)) || "").toLowerCase();
                    if (n) out.push(n);
                });
            }
            if (Actionable.Scope) {
                (Actionable.Scope.inventoryNouns || []).forEach(function (n) { if (n) out.push(String(n).toLowerCase()); });
            }
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.GetRoom) {
                var room = ParchLockMap.GetRoom(ParchLockMap.CurrentRoom);
                if (room && room.Exits) Object.keys(room.Exits).forEach(function (d) {
                    if (room.Exits[d] !== null && room.Exits[d] !== undefined) out.push(String(d).toLowerCase());
                });
            }
            (Actionable.Directions || []).filter(function (d) { return d && d.length > 2; }).forEach(function (d) { out.push(d); });
        } catch (e) {}
        return Array.from(new Set(out.filter(Boolean)));
    },

    /* RAM short names often include adjectives that the printed text omits
       ("transom window" vs "window"). Phrases are derived from the object's
       own name — never from a hardcoded noun list. */
    namePhrases: (name) => {
        var raw = String(name || "").replace(/\s+/g, " ").trim();
        if (!raw) return [];
        // Deterministic articles only — not a prose stopword list (plan: no
        // text mining). Tokens come from the object's own short-name.
        var out = Actionable.isReferenceToken(raw) ? [] : [raw];
        raw.split(" ").forEach(function (t) {
            if (!t || t.length < 3 || Actionable.isGrammarParticle(t) || Actionable.isReferenceToken(t)) return;
            if (out.indexOf(t) < 0) out.push(t);
        });
        return out;
    },

    wrapFirstExact: (lines, phrase, meta) => {
        var target = String(phrase || "");
        if (!target || !lines || !lines.length) return false;
        var targetLower = target.toLowerCase();
        var wrapped = false;
        lines.some(function (line) {
            if (wrapped || !line) return wrapped;
            var walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
            var nodes = [];
            var node;
            while ((node = walker.nextNode())) {
                if (!$(node.parentElement).closest(".Input, .Style_input, .Style_subheader, a, style, script, .pl-act").length) nodes.push(node);
            }
            nodes.some(function (textNode) {
                if (wrapped) return true;
                var source = textNode.nodeValue;
                if (!source) return false;
                var lower = source.toLowerCase();
                var from = 0;
                while (from <= lower.length - targetLower.length) {
                    var idx = lower.indexOf(targetLower, from);
                    if (idx < 0) return false;
                    var before = idx === 0 ? " " : source.charAt(idx - 1);
                    var afterIdx = idx + target.length;
                    var after = afterIdx >= source.length ? " " : source.charAt(afterIdx);
                    if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) {
                        from = idx + 1;
                        continue;
                    }
                    var matched = source.slice(idx, afterIdx);
                    var frag = document.createDocumentFragment();
                    frag.appendChild(document.createTextNode(source.slice(0, idx)));
                    var mark = document.createElement("span");
                    mark.className = "pl-act";
                    mark.dataset.noun = matched.toLowerCase();
                    mark.dataset.kind = meta.kind;
                    if (meta.objectId != null && meta.objectId !== "") {
                        var owners = Actionable.distinctObjects(Actionable.payloadPool()).filter(function (o) {
                            var words = Actionable.nounWordsOf(o);
                            return String(o.name).toLowerCase() === matched.toLowerCase() || matched.toLowerCase().split(/\s+/).every(function (w) { return !!words[w] || (o.aliases || []).some(function (a) { return Actionable.vocabularyKey(a) === Actionable.vocabularyKey(w); }); });
                        });
                        mark.dataset.candidateIds = JSON.stringify(owners.map(function (o) { return o.id; }));
                        if (owners.length === 1 && String(owners[0].id) === String(meta.objectId)) mark.dataset.objectId = String(meta.objectId);
                        var held = {};
                        (((WorldModel.lastPayload || {}).inventory) || []).forEach(function (o) { held[String(o.id)] = true; });
                        if (owners.length) mark.dataset.kind = owners.every(function (o) { return held[String(o.id)]; }) ? 'inventory' : 'object';
                    }
                    if (meta.dictAddr) mark.dataset.dictAddr = String(meta.dictAddr);
                    mark.textContent = matched;
                    mark.title = meta.kind === "direction" ? "Go " + mark.dataset.noun : "Examine " + mark.dataset.noun;
                    if (meta.kind !== "direction" && !mark.dataset.objectId) mark.title = "Ambiguous reference: " + mark.dataset.noun;
                    meta.resolvedObjectId = mark.dataset.objectId || null;
                    meta.markCandidateIds = mark.dataset.candidateIds || '[]';
                    frag.appendChild(mark);
                    frag.appendChild(document.createTextNode(source.slice(afterIdx)));
                    textNode.parentNode.replaceChild(frag, textNode);
                    wrapped = true;
                    return true;
                }
                return false;
            });
            return wrapped;
        });
        return wrapped;
    },

    phraseOwners: function (phrase, pool) {
        var matched = String(phrase || '').toLowerCase();
        if (Actionable.isReferenceToken(matched)) return [];
        return Actionable.distinctObjects(pool).filter(function (o) {
            var words = Actionable.nounWordsOf(o);
            return String(o.name).toLowerCase() === matched || matched.split(/\s+/).every(function (w) {
                return !!words[w] || (o.aliases || []).some(function (a) { return Actionable.vocabularyKey(a) === Actionable.vocabularyKey(w); });
            });
        });
    },
    retainMarks: function (pool) {
        var held = {}, exits = Actionable.exitLabels().map(function (s) { return String(s).toLowerCase(); });
        (((WorldModel.lastPayload || {}).inventory) || []).forEach(function (o) { held[String(o.id)] = true; });
        Actionable.LiveMarks = Actionable.LiveMarks.filter(function (mark) {
            var valid = mark.isConnected && !mark.classList.contains('is-stale') && Actionable.observedLine(mark.closest('.BufferLine'));
            if (valid && mark.dataset.kind === 'direction') valid = exits.indexOf(mark.dataset.noun) >= 0;
            else if (valid) {
                var prior = [];
                try { prior = JSON.parse(mark.dataset.candidateIds || '[]'); } catch (eIds) {}
                if (mark.dataset.objectId) prior.push(mark.dataset.objectId);
                var owners = Actionable.phraseOwners(mark.textContent, pool);
                valid = owners.some(function (o) { return prior.some(function (id) { return String(id) === String(o.id); }); });
                if (valid) {
                    mark.dataset.candidateIds = JSON.stringify(owners.map(function (o) { return o.id; }));
                    if (owners.length === 1) mark.dataset.objectId = String(owners[0].id);
                    else delete mark.dataset.objectId;
                    mark.dataset.kind = owners.every(function (o) { return held[String(o.id)]; }) ? 'inventory' : 'object';
                    mark.title = owners.length === 1 ? 'Examine ' + mark.dataset.noun : 'Ambiguous reference: ' + mark.dataset.noun;
                }
            }
            if (!valid && mark.isConnected) { mark.classList.add('is-stale'); mark.removeAttribute('tabindex'); mark.removeAttribute('role'); }
            return valid;
        });
    },
    relocateExactMarks: function (lines, suppliedMarks) {
        // Phrase/ownership selection has already finished. Move those SAME
        // marks, so latest-copy presentation cannot change the chosen noun.
        var marks = suppliedMarks || [];
        if (!suppliedMarks) lines.forEach(function (line) { line.querySelectorAll(".pl-act:not(.is-stale)").forEach(function (mark) { if (marks.indexOf(mark) < 0) marks.push(mark); }); });
        marks.forEach(function (mark) {
            var phrase = mark.textContent, target = phrase.toLowerCase(), parent = mark.parentNode;
            if (!parent || !target) return;
            var original = document.createTextNode(phrase);
            mark.replaceWith(original);
            var best = null;
            lines.forEach(function (line) {
                if (!Actionable.observedLine(line)) return;
                var walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT), node;
                while ((node = walker.nextNode())) {
                    if ($(node.parentElement).closest(".Input, .Style_input, .Style_subheader, a, style, script, .pl-act").length) continue;
                    var source = node.nodeValue || "", lower = source.toLowerCase(), from = 0, index;
                    while ((index = lower.indexOf(target, from)) >= 0) {
                        var end = index + phrase.length;
                        var forward = node === original || !!(original.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
                        if (forward && !/[A-Za-z0-9]/.test(source.charAt(index - 1)) && !/[A-Za-z0-9]/.test(source.charAt(end))) {
                            if (!best || (best.node === node && index > best.index) || (best.node.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)) best = { node: node, index: index, end: end };
                        }
                        from = index + 1;
                    }
                }
            });
            if (!best) { original.replaceWith(mark); parent.normalize(); return; }
            var source = best.node.nodeValue, fragment = document.createDocumentFragment();
            fragment.appendChild(document.createTextNode(source.slice(0, best.index)));
            mark.textContent = source.slice(best.index, best.end);
            fragment.appendChild(mark);
            fragment.appendChild(document.createTextNode(source.slice(best.end)));
            best.node.replaceWith(fragment);
            parent.normalize();
            if (mark.parentNode !== parent) mark.parentNode.normalize();
        });
    },

    Refresh: () => {
        // Force Translator sync before marks ? actionable words must come from WorldModel
        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
            if (typeof TranslatorUI !== "undefined" && TranslatorUI.apply && WorldModel && WorldModel.lastPayload) {
                TranslatorUI.applyDiscovered(WorldModel.lastPayload);
            }
        } catch (e) {}

        try {
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
        } catch (e) {}

        var payload = null;
        try { payload = WorldModel && WorldModel.lastPayload; } catch (eP) {}
        var structural = Actionable.isStructuralPayload(payload);
        if (!$(".Input.LineInput:visible").length) return;

        var lines = $("#windowport .BufferWindow .BufferLine").toArray();
        var epoch = (typeof UndoRestoreSync !== 'undefined' ? UndoRestoreSync.generation : 0) + ':' +
            (typeof ParchLock !== 'undefined' ? ParchLock.GameFilename : '');
        var port = document.getElementById('windowport');
        if (Actionable._markEpoch !== epoch || Actionable._markPort !== port) {
            Actionable.Stale();
            Actionable.LiveMarks = [];
            Actionable.Scope.lastReplyText = '';
            Actionable._lineVersions = new WeakMap();
            Actionable._markEpoch = epoch;
            Actionable._markPort = port;
            Actionable.Signature = '';
        }
        var version = typeof BufferRevision !== 'undefined' ? BufferRevision.versionReader() : null;
        var changedLines = lines.filter(function (line) { return !version || Actionable._lineVersions.get(line) !== version(line); });
        // Per-line facts are cached until a mutation touches the line
        // (BufferRevision, consensus #1830): this runs every 200 ms, and the
        // old per-line jQuery passes grew with the whole session.
        var facts = lines.map(line => typeof BufferRevision !== "undefined" ? BufferRevision.lineFacts(line) : {
            input: !!line.querySelector(".Style_input"),
            subheaders: $(line).find('.Style_subheader').addBack('.Style_subheader').toArray().map(el => el.textContent),
            stars: /\*\*\*/.test(String(line.textContent || ""))
        });
        var lastInput = -1;
        facts.forEach((f, index) => { if (f.input) lastInput = index; });
        var scope = Actionable.Scope, room = ParchLockMap.CurrentRoom;
        // D170: match the banner against the payload's room name BEFORE the
        // map's. `ParchLockMap.CurrentRoom` is a stored label, and D62 already
        // established that wump2ka's display name is not stable per visit --
        // so the stored one can disagree with the banner the game just
        // printed, while the payload's name is read from the same turn.
        // Measured: room "A fair-sized, pocked cavern" against a printed
        // banner of "A large, textured, watery room", where the payload name
        // WAS the printed banner. Both are tried, so a game whose names are
        // stable (the two agree) is completely unaffected.
        var headingNames = [];
        try { if (payload && payload.roomName) headingNames.push(String(payload.roomName).toLowerCase()); } catch (eN) {}
        if (room) headingNames.push(String(room).toLowerCase());

        // D170: the name may be a TRUNCATED form of the banner. wump2ka's only
        // player-facing name comes from the status row, and on a phone that row
        // is a ~31-column grid that cuts it off -- "A fair-sized, pocked,
        // watery caver" against a printed banner of "...watery cavern". An
        // exact comparison therefore never matches on a phone, which is why
        // this was reported from a handset and not from the desktop build.
        // A prefix match in either direction accepts the truncation without
        // accepting anything else: one of the two strings must be a complete
        // leading run of the other, so unrelated rooms still cannot collide.
        var nameMatches = function (text) {
            var t = ParchLock.CleanRoomName(text).toLowerCase();
            if (!t) return false;
            for (var i = 0; i < headingNames.length; i++) {
                var n = headingNames[i];
                if (!n) continue;
                if (t === n) return true;
                var shorter = t.length < n.length ? t : n;
                var longer = t.length < n.length ? n : t;
                // Guard against a stub matching half the cave: require the
                // shared prefix to be substantial before trusting it.
                if (shorter.length >= 8 && longer.indexOf(shorter) === 0) return true;
            }
            return false;
        };

        var heading = -1;
        facts.forEach((f, index) => {
            if (f.subheaders.some(text => nameMatches(text))) heading = index;
        });

        // D170 (operator: "this instance of Wumpus does not want to underline
        // exits or items").
        //
        // The search above locates the room's banner by matching its NAME --
        // and D62 already established that wump2ka's display name is not a
        // stable per-visit label, which is the very reason this text search
        // exists at all. So it is built on the one thing it cannot rely on.
        // When the stored name and the printed banner disagree, the match
        // lands on an OLD occurrence of the stale name far up the transcript.
        //
        // Measured live: room "A fair-sized, pocked cavern" against a printed
        // banner of "A large, textured, watery room" gave heading=28 with
        // lastInput=196 in a 200-line buffer. RoomLines then became two lines
        // from 168 lines earlier, long scrolled off screen, and every exit and
        // item in the description the player was actually reading went
        // unmarked -- exactly the reported symptom.
        //
        // A banner printed AFTER the player's last command is, by definition,
        // the room they are in now. That is positional rather than
        // name-derived, so it holds even when the label changed between
        // visits. Used only when the name match found nothing current: a match
        // that is already after the last input is left exactly as it was, so
        // every game whose names ARE stable behaves as before.
        // Measured, and it is why the name match alone cannot work here: with
        // lastInput at 196 in a 200-line buffer, the name matched a banner at
        // line 81 -- an earlier visit whose generated label happened to agree.
        // RoomLines then covered that old room's text, while the description
        // the player was reading sat unmarked between the real banner and the
        // command. `latest` does not rescue it either: measured latestCount 3,
        // because the player had since typed another command, so the visible
        // description is ABOVE the last input, not after it.
        //
        // The most recent banner in the transcript is the room you are in --
        // you cannot be in a room whose banner was printed before a later
        // room's. That is positional and needs no stable label, which is the
        // whole difficulty in wump2ka (D62). Applied only when it is MORE
        // RECENT than the name match, so a game whose names are stable keeps
        // picking exactly the line it picked before.
        // Two guards, both from measurements by the grok seat against the
        // operator's save, which falsified a blunter version of this rule:
        //
        //   heading(name-match) 49, lastInput 47, lastBanner 63
        //
        // Taking the last banner unconditionally moved the anchor to 63 -- an
        // end-of-game banner -- so RoomLines covered the score/quit epilogue,
        // liveNouns went empty and marks fell to 0 while the look with Exit
        // 1/2/3 was still on screen. Overshooting is its own bug.
        //
        // 1. A name match that is ALREADY after the player's last command is
        //    the current room's banner. Nothing later can improve on it.
        // 2. Not every subheader is a room. The end-of-game banners are
        //    asterisk-delimited in both libraries (ZIL four, Inform three --
        //    see StatTracker's death/win detection), so they are excluded as
        //    anchors rather than being allowed to define a room's text.
        var lastBanner = -1;
        facts.forEach((f, index) => {
            if (!f.subheaders.length) return;
            if (f.stars) return;
            lastBanner = index;
        });
        if (heading <= lastInput && lastBanner > heading) heading = lastBanner;
        var latest = lines.slice(Math.max(lastInput, heading >= lastInput ? heading : -1) + 1).filter(Actionable.observedLine);
        var text = latest.map(line => line.textContent).join("\n");
        var command = $("#windowport .Style_input").last().text().trim().toLowerCase();
        var payloadKey = structural
            ? JSON.stringify([payload.roomId, payload.roomName, [payload.discoveredObjects || [], payload.inventory || [], payload.unnamedCandidates || []].map(function (objects) {
                return objects.map(function (o) {
                    var attrs = o.attrs || {};
                    var state = Object.keys(attrs).sort().filter(function (key) {
                        return attrs[key] == null || /^(boolean|string|number)$/.test(typeof attrs[key]);
                    }).map(function (key) { return [key, attrs[key]]; });
                    return [o.id, o.name, o.parentId, o.aliases || [], state];
                });
            })])
            : "none";
        var signature = room + ":" + lines.length + ":" + lastInput + ":" + text + ":" + payloadKey;
        if (signature === Actionable.Signature && !changedLines.length && Actionable.LiveMarks.every(mark => mark.isConnected && !mark.classList.contains("is-stale"))) return;
        Actionable.Signature = signature;

        if (!structural) {
            Actionable.Stale();
            Actionable.LiveMarks = [];
            scope.roomNouns = [];
            scope.inventoryNouns = [];
            Actionable.RenderInventory();
            return;
        }

        // Only wump2ka-style games need the subheader-text search above to
        // LOCATE the room's banner in the transcript (its display name is
        // real but not a stable per-visit label, D62). Deciding WHETHER the
        // room changed at all should never rest on that display string --
        // every other game (and Wumpus itself, once identified) is
        // structurally keyed by its real RAM room number. Comparing the
        // display name here meant any non-movement name refinement (a
        // stub-to-real name upgrade, a later display refinement tick) could
        // register as a false "room changed", discarding the persisted
        // RoomLines and losing real, still-current room-text highlighting
        // even though the player never moved. Structural roomId is now the
        // authority whenever it's available; name comparison is only the
        // fallback for a non-structural/heuristic payload with no real id.
        var structuralRoomId = structural && payload && payload.roomId != null ? payload.roomId : null;
        var roomChanged = structuralRoomId != null
            ? scope.roomId !== structuralRoomId
            : scope.roomName !== room;
        var newHeading = heading >= 0 && lines[heading] !== Actionable.RoomHeading;
        var reset = /^(restore|restart|undo)$/.test(command);
        var inventoryCmd = /^(i|inv|inventory)\b/.test(command);
        if (!inventoryCmd && (roomChanged || reset || newHeading || !Actionable.RoomLines.some(line => line.isConnected))) {
            if (heading >= 0 && (!(roomChanged || reset) || heading > lastInput)) {
                var end = lines.findIndex((line, index) => index > heading && $(line).is('.Style_input, :has(.Style_input)'));
                Actionable.RoomLines = lines.slice(heading + 1, end < 0 ? lines.length : end).filter(line => !Actionable.IsInstruction(line));
                Actionable.RoomHeading = lines[heading];
            } else {
                Actionable.RoomLines = latest;
                Actionable.RoomHeading = null;
            }
            Actionable.RoomLines = Actionable.RoomLines.filter(line => !$(line).is('.Style_input') && !line.querySelector('.Input, .Style_input'));
        }
        // New owners start at the newest admitted occurrence. Existing marks
        // remain attached to their word, not to the last response block.
        var activeLines = Array.from(new Set(latest.slice().reverse().concat(Actionable.RoomLines.filter(Actionable.observedLine).slice().reverse())));
        var inventory = /^(i|inv|inventory)$/.test(command);
        if (inventory && typeof StatTracker !== "undefined" && StatTracker._hideCarryProbe) {
            // D207: StatTracker owns the carry probe's span from submission and
            // has already hidden its reply while releasing the turn's real
            // events (an enemy's attack). Hiding every line from lastInput here
            // would re-hide those events, so only a span StatTracker never
            // owned falls back to the old blanket rule.
            if (!StatTracker._probeBaseline) lines.slice(Math.max(0, lastInput)).forEach(function (line) {
                if (!line || !line.classList) return;
                if (line.querySelector && line.querySelector(".Input, .LineInput, .CharInput")) return;
                line.classList.add("pl-carry-probe");
                line.setAttribute("aria-hidden", "true");
                line.style.display = "none";
            });
            if (StatTracker.ensureProbeDomGuard) StatTracker.ensureProbeDomGuard();
            if (StatTracker.protectProbeInputs) StatTracker.protectProbeInputs(document.getElementById("windowport"));
            StatTracker._hideCarryProbe = false;
            StatTracker._carryProbeTurnCheck = true;
        }
        scope.lastReplyText = latest.filter(Actionable.observedLine).map(function (line) { return line.textContent; }).join('\n');
        var idPool = Actionable.payloadPool();
        Actionable.retainMarks(idPool);
        var relocationLines = Array.from(new Set(Actionable.LiveMarks.map(function (mark) { return mark.closest('.BufferLine'); }).concat(changedLines.filter(Actionable.observedLine))));
        Actionable.relocateExactMarks(relocationLines, Actionable.LiveMarks);
        var invIds = {};
        try {
            ((payload && payload.inventory) || []).forEach(function (inv) {
                if (inv && inv.id != null) invIds[String(inv.id)] = true;
            });
        } catch (eInv) {}
        // Compound-name fix: resolve each object's real command noun from structural dictionary data, not room
        // prose. Independent of text-wrap marking below, so it runs for every scoped object (including ones
        // whose name isn't printed verbatim this tick) and is unaffected by D70's visible-phrase ordering.
        Actionable.CommandNouns = Actionable.commandNounsForPool(idPool);
        scope.roomNouns = idPool.filter(function (o) { return !invIds[String(o.id)]; }).map(function (o) { return String(o.name).toLowerCase(); });
        scope.inventoryNouns = idPool.filter(function (o) { return invIds[String(o.id)]; }).map(function (o) { return String(o.name).toLowerCase(); });
        scope.roomName = room;
        scope.roomId = structuralRoomId;
        scope.lastLookText = Actionable.RoomLines.map(line => line.textContent).join("\n");
        if (inventory) scope.lastInventoryText = text;
        Actionable.RenderInventory();
        if (inventory && Actionable.InventoryRequested) {
            Actionable.InventoryRequested = false;
            setTimeout(Actionable.ShowInventory, 0);
        }

        // D64 (PRODUCTION_PLAN): short-name phrases first, then property-1
        // parserWords aliases. Longest match first. Only mark when the exact
        // phrase appears in room lines — no prose mining.
        var wrapTargets = [];
        idPool.forEach(function (o) {
            var kind = invIds[String(o.id)] ? "inventory" : "object";
            var seenPhrase = {};
            // D146: flag the object's own full name and its HEAD NOUN. Once a
            // mark is one-per-object, "longest token wins" picks whichever
            // adjective happens to be longest -- "estate" for the real estate
            // office door, "transom-style" for the window, "self-contained"
            // for a scrub brush. The head noun is what the object actually IS
            // and what a reader reaches for, so it is preferred over a longer
            // qualifier belonging to the same object.
            var headNoun = String(Actionable.headNounOf(o) || Actionable.headTokenOf(o) || "").toLowerCase();
            var fullName = String(o.name || "").trim().toLowerCase();
            Actionable.namePhrases(o.name).forEach(function (phrase) {
                var pl = String(phrase).toLowerCase();
                seenPhrase[pl] = true;
                wrapTargets.push({
                    phrase: phrase, kind: kind, objectId: o.id, dictAddr: o.dictAddr, fromName: true,
                    preferred: (pl === fullName) || (!!headNoun && pl === headNoun)
                });
            });
            (o.aliases || []).forEach(function (word) {
                if (!word || word.length < 3) return;
                var wl = String(word).toLowerCase();
                if (seenPhrase[wl]) return;
                // Grammar particles only (not a prose stopword list).
                if (Actionable.isGrammarParticle(wl) || Actionable.isReferenceToken(wl)) return;
                seenPhrase[wl] = true;
                wrapTargets.push({ phrase: word, kind: kind, objectId: o.id, dictAddr: o.dictAddr, fromName: false });
            });
        });
        Actionable.exitLabels().forEach(function (label) {
            wrapTargets.push({ phrase: label, kind: "direction", objectId: null, fromName: true });
        });
        // Prefer longer phrases; prefer short-name hits over alias hits at
        // equal length so "canteen" wins before a short alias collides.
        wrapTargets.sort(function (a, b) {
            var d = String(b.phrase).length - String(a.phrase).length;
            if (d) return d;
            if (a.fromName && !b.fromName) return -1;
            if (!a.fromName && b.fromName) return 1;
            return 0;
        });
        // D64: try name-derived targets first pass; alias-only words only if
        // this objectId still has no mark (shortName never appeared in text).
        //
        // D146 (measured across modules): the `!t.fromName` in this guard meant
        // the once-per-object rule applied ONLY to alias fallbacks. But
        // namePhrases() emits the full name AND every individual token of it,
        // all flagged fromName, so whenever the full name did not appear
        // verbatim in the prose every token was wrapped separately: Anchorhead's
        // "real estate office door" became three adjacent marks -- "real",
        // "estate", "office" -- which read as three different objects, and
        // Planetfall marked a five-word brush in five pieces. Worse, a token of
        // one object could land in text describing another ("Patrol" bound to
        // the uniform inside "Patrol-issue ... scrub brush").
        //
        // Targets are already sorted longest-first, so dropping the exemption
        // makes the LONGEST phrase that actually appears win and stop there --
        // which is exactly what D70's "longest visible match wins" intends.
        var markedIds = {};
        var markedDirections = {};
        Actionable.LiveMarks.forEach(function (mark) {
            if (mark.dataset.kind === 'direction') { markedDirections[mark.dataset.noun] = true; return; }
            var ids = [];
            try { ids = JSON.parse(mark.dataset.candidateIds || '[]'); } catch (eIds) {}
            if (mark.dataset.objectId) ids.push(mark.dataset.objectId);
            ids.forEach(function (id) { markedIds[String(id)] = true; });
        });
        // Two passes. The first offers every object its BEST phrase -- full
        // name, then head noun -- so an object is never represented by a
        // stray adjective while its own noun sits unmarked in the same
        // sentence. The second fills in anything still unmarked from the
        // remaining tokens and aliases. Both passes keep the longest-first
        // order, so a longer phrase still wins across different objects.
        var ordered = wrapTargets.filter(function (t) { return t.preferred; })
            .concat(wrapTargets.filter(function (t) { return !t.preferred; }));
        ordered.forEach(function (t) {
            if (t.objectId != null && markedIds[String(t.objectId)]) return;
            if (t.kind === 'direction' && markedDirections[String(t.phrase).toLowerCase()]) return;
            if (Actionable.wrapFirstExact(activeLines, t.phrase, t)) {
                try { JSON.parse(t.markCandidateIds || '[]').forEach(function (id) { markedIds[String(id)] = true; }); } catch (eIds) {}
                if (t.objectId != null && String(t.resolvedObjectId) === String(t.objectId)) {
                    markedIds[String(t.objectId)] = true;
                    var key = String(t.objectId);
                    var prev = Actionable.VerifiedNouns[key];
                    if (!prev || t.phrase.length >= prev.length) {
                        Actionable.VerifiedNouns[key] = t.phrase;
                    }
                }
                if (t.kind === 'direction') markedDirections[String(t.phrase).toLowerCase()] = true;
            }
        });
        Actionable.relocateExactMarks(activeLines);
        Actionable.LiveMarks = $(".pl-act:not(.is-stale)").toArray();
        // Drain our own wrapping mutations before remembering tokens, so an
        // idle tick does not re-scan prose because of its own last render.
        version = typeof BufferRevision !== 'undefined' ? BufferRevision.versionReader() : null;
        if (version) lines.forEach(function (line) { Actionable._lineVersions.set(line, version(line)); });
    },
    // D122: inventory now has its own sheet. Every existing entry point --
    // /items (js/Input.js:859), the Tools list (js/WorkspaceUI.js:35), the
    // desktop control panel (js/Qol.js:21) and the post-"inventory" auto-open
    // above -- routes here, so pointing this one function at the equipment
    // sheet moves all of them at once without touching any caller. The old
    // #items-tab markup stays in the DOM (RenderInventory still writes the
    // "Last response" text into it) but is hidden inside the map sheet; this
    // no longer toggles it.
    ShowInventory: () => {
        if (Message.IsOpen) Message.Hide();
        Actionable.RenderInventory();
        if (typeof EquipmentUI !== "undefined" && EquipmentUI.Show) { EquipmentUI.Show(); return; }
        ParchLockMap.Show();
        $("#items-tab").prop("open", !$("#items-tab").prop("open"));
    },
    RenderInventory: () => {
        var payload = WorldModel && WorldModel.lastPayload;
        var items = [];
        try {
            items = ((payload && payload.inventory) || []).filter(function (o) {
                return o && o.id != null && o.name;
            });
        } catch (e) {}
        var playerId = payload && (payload.playerId != null && payload.playerId !== ""
            ? payload.playerId
            : (payload.probe && payload.probe.playerId));
        // Inventory is a flat array with real parentId (D31) -- build a
        // parentId->children index locally for rendering nesting, rather
        // than expecting ZRamReader to emit a tree (keeps the same flat
        // convention as discoveredObjects/scopeObjects everywhere else).
        var byParent = {};
        var itemIds = {};
        items.forEach(function (o) {
            itemIds[String(o.id)] = true;
            var key = String(o.parentId);
            (byParent[key] = byParent[key] || []).push(o);
        });
        var topLevel = items.filter(function (o) {
            if (o.parentId == null || o.parentId === "") return true;
            if (playerId != null && String(o.parentId) === String(playerId)) return true;
            if (!itemIds[String(o.parentId)]) return true;
            return false;
        });
        var isWorn = function (obj) {
            var a = obj && obj.attrs;
            if (!a) return false;
            // D58/D68: structural worn gate (bits only; see AttributeSchema).
            if (typeof AttributeSchema !== "undefined" && AttributeSchema.isTrulyWorn) {
                return AttributeSchema.isTrulyWorn(a);
            }
            if (!(a.worn || a.isWorn)) return false;
            if (a.scenery && !(a.clothing || a.wearable)) return false;
            return true;
        };
        var worn = topLevel.filter(isWorn);
        var carried = topLevel.filter(function (o) { return !isWorn(o); });
        $("#inventory-items").empty();
        $("#items-count").text(topLevel.length);
        var names = worn.map(function (o) { return o.name + " (worn)"; }).concat(carried.map(function (o) { return o.name; }));
        $("#inventory-response").text(names.length ? names.join(", ") : "No inventory recorded.");
        var renderBtn = function (obj, suffix) {
            var noun = String(obj.name).toLowerCase();
            var label = obj.name + (suffix || "");
            $("<button>").text(label).attr("title", "Actions for " + obj.name).attr("data-object-id", String(obj.id)).appendTo("#inventory-items").on("click contextmenu", function(e) {
                e.preventDefault();
                Actionable.Open(noun, "inventory", e.clientX, e.clientY, obj.id);
            });
            var nested = byParent[String(obj.id)] || [];
            nested.forEach(function (child) {
                if (child && child.id != null && child.name) renderBtn(child, " (in " + obj.name + ")");
            });
        };
        worn.forEach(function (obj) { renderBtn(obj, " (worn)"); });
        carried.forEach(function (obj) { renderBtn(obj, ""); });
        $("#refresh-inventory").off("click").click(() => {
            Actionable.Submit("inventory");
        });
        // D122: the equipment sheet reads the same payload. Re-render it from
        // the same point the legacy chip list is rebuilt, so both views can
        // never disagree about what the player is carrying.
        try { if (typeof EquipmentUI !== "undefined" && EquipmentUI.Render) EquipmentUI.Render(); } catch (e) {}
    },
    addMoreActions: function (slices, context, x, y) {
        if (context.kind === "direction") return;
        var suggestions = [], seen = {};
        var obj = Actionable.payloadPool().find(function (o) { return String(o.id) === String(context.objectId); });
        var noun = obj ? Actionable.referenceFor(obj).noun : context.noun;
        var add = function (verb) {
            verb = String(verb || '').trim();
            if (!verb || seen[verb.toLowerCase()]) return;
            seen[verb.toLowerCase()] = true;
            var command = verb + ' ' + noun;
            suggestions.push({ Label: verb.charAt(0).toUpperCase() + verb.slice(1), Command: command, Enter: false, Score: 30 });
        };
        // These are vocabulary suggestions, not claims of object capability.
        // Selection fills the prompt for confirmation; existing proven actions
        // and learned forms remain in the normal command resolver.
        try {
            ParchLockQol.GetRadialCommands().forEach(function (c) {
                if (c.source === 'dictionary-verb' || c.source === 'ram-synth') add(c.Command.trim());
            });
            if (typeof AttrCalibrator !== 'undefined' && AttrCalibrator.allowedVerbsFor) {
                var ids = obj ? [obj.id] : (context.candidateIds || []);
                ids.forEach(function (id) { AttrCalibrator.allowedVerbsFor(id).forEach(add); });
            }
        } catch (e) {}
        if (suggestions.length) slices.push({ Label: 'More', MoreSuggestions: true, Score: 0, Action: function () {
            ParchLockQol.OpenRadial(x, y, suggestions, context);
        } });
    },
    sharedObjectCommands: function (choices, kind) {
        var held = ((WorldModel.lastPayload || {}).inventory || []).map(function (o) { return String(o.id); });
        var eligible = choices.filter(function (o) { return (held.indexOf(String(o.id)) >= 0) === (kind === "inventory"); });
        var lists = eligible.map(function (o) { return Actionable.resolveObjectCommands(o.id, kind, {allowAmbiguousReference:true}); });
        return (lists[0] || []).filter(function (entry) {
            return lists.every(function (list) { return list.some(function (c) { return c.command === entry.command; }); });
        }).map(function (entry) {
            var members = lists.map(function (list) { return list.find(function (c) { return c.command === entry.command; }); });
            return Object.assign({}, entry, {
                objectId: null, sharedMembers: members,
                confidence: Math.min.apply(Math, members.map(function (c) { return typeof c.confidence === "number" ? c.confidence : 0.8; })),
                Enter: members.every(function (c) { return c.Enter !== false && c.enter !== false; })
            });
        });
    },
    radialCommandCurrent: function (command) {
        return (command.sharedMembers || [command]).every(function (c) {
            return !c.learnedWordScope || typeof LearnedWords === "undefined" || LearnedWords.commandCurrent(c);
        });
    },
    Open: (noun, kind, x, y, objectId) => {
        var sharedCommands = null;
        var object = Actionable.payloadPool().find(function (o) { return String(o.id) === String(objectId); });
        if (!objectId || (object && !Actionable.referenceFor(object).unique)) {
            if (kind !== "direction") {
                var choices = Actionable.distinctObjects(Actionable.payloadPool()).filter(function (o) {
                    return String(o.name).toLowerCase() === String(noun).toLowerCase() || String(noun).toLowerCase().split(/\s+/).every(function (word) { return (o.aliases || []).some(function (w) { return Actionable.vocabularyKey(w) === Actionable.vocabularyKey(word); }); });
                });
                var ambiguity = choices.filter(function (o) { return Actionable.referenceFor(o).unique; }).map(function (o) {
                    return { Label: o.name, Action: function () { Actionable.Open(o.name, kind, x, y, o.id); } };
                });
                if (ambiguity.length) {
                    var selectionContext = { source: "text", noun: noun, kind: kind, objectId: null };
                    Actionable.addMoreActions(ambiguity, selectionContext, x, y);
                    ParchLockQol.OpenRadial(x, y, ambiguity, selectionContext);
                    return;
                }
                // Shared references use the same slice/target/ranking builder below.
                // Only command eligibility differs; no physical owner is selected.
                sharedCommands = Actionable.sharedObjectCommands(choices, kind);
                objectId = null;
            }
        }
        var context = { source: "text", noun: (sharedCommands && sharedCommands[0] && sharedCommands[0].noun) || noun, kind: kind, objectId: objectId || null, candidateIds: sharedCommands ? choices.map(function (o) { return o.id; }) : undefined };
        var slices = [];
        // Score is a static confidence prior. Usage stays separate so the
        // shared D110 ranker can apply the strict usage/prior/order tuple.
        var usageFor = function (command) {
            var bonus = 0;
            try { bonus = Actionable.usageBonus(command); } catch (eS) {}
            return bonus;
        };
        var scoreFor = function (command, base) {
            return typeof base === "number" ? base : 50;
        };
        if (kind === "direction") {
            var dirCommand = Actionable.resolveExitCommand(noun);
            slices.push({ Label: "Go " + noun, Command: dirCommand, Score: scoreFor(dirCommand, 50), Usage: usageFor(dirCommand), Action: function () { Actionable.Submit(dirCommand); } });
        } else if (objectId || sharedCommands) {
            var cmds = sharedCommands || Actionable.resolveObjectCommands(objectId, kind);
            slices = cmds.map(function (c) {
                var verb = String(c.verb || "examine");
                var command = String(c.command || "");
                var base = Math.round((typeof c.confidence === "number" ? c.confidence : 0.8) * 60);
                // A command that ends in whitespace (e.g. "put X in ",
                // "give X to ") is a stem, not a complete submission -- it
                // still needs a target object. Detected structurally by
                // shape (trailing space), not by matching specific verb
                // names, so this applies to any current or future stem-
                // producing verb, not just "put in"/"give to". Rather than
                // auto-submitting the incomplete stem (which lets the
                // game's own parser silently guess/disambiguate a target,
                // e.g. defaulting to an unrelated in-scope noun), open a
                // real target-selection submenu sourced from the same
                // RAM-scope object pool "Use with..." already uses.
                var needsTarget = /\s$/.test(command);
                if (needsTarget) {
                    return {
                        Label: verb.charAt(0).toUpperCase() + verb.slice(1) + "...",
                        Score: scoreFor(command, base),
                        Usage: usageFor(command),
                        UsageKey: "radial:" + Actionable.usageKey(command),
                        TrackTap: true,
                        Action: function () {
                            if (!Actionable.radialCommandCurrent(c)) return;
                            if (c.Enter === false || c.enter === false) { Input.Clear();Input.Inject(command,false);Input.Focus();return; }
                            // D77: a real, live-reported case -- a hardcoded
                            // `.slice(0, 8)` here silently dropped a genuine
                            // container (trenchcoat, `attrs.container:true`)
                            // from its own room's "put in" target list,
                            // purely because of its incidental position in
                            // the pool array behind room scenery (rain/sky/
                            // wall/transom window/etc.); which OTHER object
                            // happened to be excluded (the one clicked)
                            // shifted everything after it by one slot, so
                            // the SAME room could show or hide the real
                            // container depending only on which item you
                            // right-clicked -- confirmed live, not assumed.
                            // `ParchLockQol.OpenRadial` already has its own
                            // capacity/paging system (rings up to 16 items,
                            // a real "More..." button cycling through the
                            // rest) built exactly for "there are more real
                            // candidates than one ring can show" -- there is
                            // no reason for this code to ALSO impose its own,
                            // separate, lower cap ahead of that. Every real
                            // candidate is passed through now; only the
                            // ORDER is biased so the structurally-relevant
                            // kind of target for this stem verb
                            // (`attrs.container`/`attrs.supporter` for "put",
                            // `attrs.animate`/`attrs.talkable` for "give"/
                            // "ask"/"show"/"tell" -- real RAM-derived
                            // signal, not per-object) surfaces on the FIRST
                            // ring page rather than requiring "More..." for
                            // the common case, without ever dropping anyone.
                            var vLower = verb.toLowerCase();
                            var wantsContainer = /^put\b/.test(vLower);
                            var wantsRecipient = /^(give|ask|show|tell)\b/.test(vLower);
                            var pool = Actionable.payloadPool().filter(function (o) {
                                return o && String(o.id) !== String(objectId) && !o.examineOnly && Actionable.referenceFor(o).unique;
                            });
                            if (wantsContainer || wantsRecipient) {
                                var primary = [], rest = [];
                                pool.forEach(function (o) {
                                    var a = o.attrs || {};
                                    var matches = wantsContainer ? (a.container || a.supporter) : (a.animate || a.talkable);
                                    (matches ? primary : rest).push(o);
                                });
                                pool = primary.concat(rest);
                            }
                            var targets = pool;
                            if (!targets.length) {
                                Input.Clear();
                                Input.Inject(command, false);
                                if (document.body.classList.contains("pl-mobile") && Input.DismissKeyboard) {
                                    Input.DismissKeyboard();
                                } else {
                                    Input.Focus();
                                }
                                return;
                            }
                            ParchLockQol.OpenRadial(x, y, targets.map(function (t) {
                                var full = command + Actionable.referenceFor(t).noun;
                                return { Label: t.name, Command: full, Score: scoreFor(full, base), Usage: usageFor(full), Action: function () { if (!Actionable.radialCommandCurrent(c)) return; Actionable.Submit(full, sharedCommands ? "ambiguous-reference" : undefined); if (c.intent) Actionable.noteIntentUsage(c.intent); } };
                            }), context);
                        }
                    };
                }
                return {
                    Label: verb.charAt(0).toUpperCase() + verb.slice(1),
                    Command: command,
                    Score: scoreFor(command, base),
                    Usage: usageFor(command),
                    Enter: c.Enter !== false && c.enter !== false,
                    Action: function () {
                        if (!Actionable.radialCommandCurrent(c)) return;
                        if (c.Enter === false || c.enter === false) { Input.Clear(); Input.Inject(command, false); Input.Focus(); }
                        else { Actionable.Submit(command, sharedCommands ? "ambiguous-reference" : undefined); if (c.intent) Actionable.noteIntentUsage(c.intent); }
                    }
                };
            });
            if (sharedCommands && !cmds.length && typeof ActionSynth !== "undefined" && !ActionSynth.inspectVerbDisabled()) {
                var inspect = ActionSynth.defaultInspectVerb();
                if (inspect) slices.push({Label:"Specify...", Action:function () {Input.Clear();Input.Inject(inspect + " " + noun,false);Input.Focus();}});
            }
            try {
                var srcObj = Actionable.payloadPool().find(function (o) {
                    return o && String(o.id) === String(objectId);
                });
                if ((srcObj && srcObj.examineOnly) || (sharedCommands && choices.length && choices.some(function (o) { return o.examineOnly; }))) {
                    Actionable.addMoreActions(slices, context, x, y);
                    ParchLockQol.OpenRadial(x, y, slices, context);
                    return;
                }
                var others = Actionable.payloadPool().filter(function (o) {
                    return o && String(o.id) !== String(objectId) && !o.examineOnly;
                });
                // D147: one launcher per instrumental verb this story's own
                // dictionary actually contains, instead of a single hardcoded
                // "use" that almost no game understands. A game with none gets
                // no launcher at all rather than an unparseable command.
                if (others.length) {
                    Actionable.availableInstrumentals().forEach(function (inst) {
                        slices.push({ Label: inst.label, Score: 50, Usage: 0, UsageKey: "launcher:" + inst.verb + "-with:" + objectId, TrackTap: true, Action: function () {
                            ParchLockQol.OpenRadial(x, y, Actionable.payloadPool().filter(function (o) {
                                return o && String(o.id) !== String(objectId) && !o.examineOnly && Actionable.referenceFor(o).unique;
                            }).map(function (other) {
                                var source = Actionable.payloadPool().find(function (o) { return String(o.id) === String(objectId); });
                                // D141/D147: the disambiguating form on BOTH
                                // sides -- with three spells held, "cast spell
                                // at spell" names nothing.
                                var sourceNoun = sharedCommands ? ((cmds[0] && cmds[0].noun) || noun) : Actionable.disambiguatedNoun(source);
                                var cmd = inst.build(sourceNoun, Actionable.disambiguatedNoun(other));
                                return { Label: other.name, Command: cmd, Score: scoreFor(cmd, 50), Usage: usageFor(cmd), Action: function () { Actionable.Submit(cmd, sharedCommands ? "ambiguous-reference" : undefined); } };
                            }), context);
                        }});
                    });
                }
            } catch (eUse) {}
            // NPC "Known Topics" (D31): ASK <NPC> ABOUT <TOPIC>, only for an
            // animate/talkable object, sourced strictly from RAM-scope
            // objects/NPCs already in discoveredObjects/inventory — never
            // from dictionary word lists or printed transcript text. No
            // decodable RAM signal exists for "global topic word" (grammar
            // token type 9 "topic" is verb-parse machinery, not a per-word
            // flag), so a topic is offered only when it is a real object.
            try {
                var topics = Actionable.resolveAskAboutTopics(objectId);
                if (topics.length) {
                    slices.push({ Label: "Ask about...", Score: 50, Usage: 0, UsageKey: "launcher:ask-about:" + objectId, TrackTap: true, Action: function () {
                        ParchLockQol.OpenRadial(x, y, topics.map(function (topic) {
                            var cmd = topic.Command;
                            return { Label: topic.Label, Command: cmd, Score: scoreFor(cmd, 50), Usage: usageFor(cmd), Action: function () { Actionable.Submit(cmd); if (topic.intent) Actionable.noteIntentUsage(topic.intent); } };
                        }), context);
                    }});
                }
            } catch (eAsk) {}
        }
        Actionable.addMoreActions(slices, context, x, y);
        ParchLockQol.OpenRadial(x, y, slices, context);
    }
};
