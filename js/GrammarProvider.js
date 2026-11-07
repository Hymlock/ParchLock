var GrammarProvider = {
    name: "grammar-ram",
    D198DecoderVersion: "d198-infocom-pre-v6-v2",
    _d198DecodeCache: (typeof WeakMap !== "undefined") ? new WeakMap() : null,
    _d214DirectionCache: (typeof WeakMap !== "undefined") ? new WeakMap() : null,

    _d214TakeCache: new WeakMap(),
    d214TakeAttribute: function (mem) {
        try {
            var key=mem && (mem.buffer || mem), cache=GrammarProvider._d214TakeCache;
            if (key && cache.has(key)) return cache.get(key);
            var decoded = GrammarProvider.decodeD198(mem);
            if (decoded.classification !== 'confirmed-zil-family' || decoded.evidence !== 'validated'
                || (decoded.family !== 'infocom-pre-v6-fixed' && decoded.family !== 'infocom-pre-v6-variable')) { if(key && decoded.evidence === 'validated')cache.set(key,null); return null; }
            var lines = decoded.templates.filter(function(t){return t.verb === 'take' && t.objectCount === 1 && !t.prepositions.length;});
            if (lines.length !== 1 || !lines[0].findAttributes) return null;
            var bit=lines[0].findAttributes[0], h=ZRamReader.header(mem);
            if (!Number.isInteger(bit) || bit <= 0 || bit >= (h.version <= 3 ? 32 : 48)) return null;
            // Conflicting bare forms or parser actions do not establish a capability.
            var action=lines[0].actionId;
            if (!decoded.templates.some(function(t){return t.verb === 'take' && t.actionId === action && t.objectCount === 2;})) return null;
            if(key)cache.set(key,bit);
            return bit;
        } catch(e) { return null; }
    },
    d214RoomTarget: function (mem, sourceId, destId) {
        try {
            var h = ZRamReader.header(mem), count = ZRamReader.objectCount(mem, h);
            if (!Number.isInteger(destId) || destId < 2 || destId > count) return false;
            var name = ZRamReader.shortName(mem, destId);
            if (!name || name.charAt(0) === '(' || /^(class|object|compass|direction|kind|nothing|thedark)$/i.test(name)) return false;
            if (ZRamReader.isPlausibleMapRoom(mem, destId)) return true;
            // An Inform bit profile is not evidence against a ZIL room.
            // Narrow exception: a sibling in the current proven room bucket.
            if (!GrammarProvider.d214DirectionProperties(mem).length) return false;
            var p = typeof WorldModel !== 'undefined' && WorldModel.lastPayload;
            if (!p || String(p.roomId) !== String(sourceId)) return false;
            var player = p.playerId || (p.probe || {}).playerId, seen = {}, found = false;
            for (var i = 0, id = player; id && i < 16 && !seen[id]; i++) {
                if (String(id) === String(sourceId)) { found = true; break; }
                seen[id] = true; var link = ZRamReader.objectLinks(mem, id); id = link && link.parent;
            }
            if (!found) return false;
            var source = ZRamReader.objectLinks(mem, sourceId), dest = ZRamReader.objectLinks(mem, destId);
            return !!(source && dest && source.parent > 0 && source.parent === dest.parent && destId !== source.parent && destId !== player);
        } catch (e) { return false; }
    },

    // Immutable parser linkage only. Exit values and permission are NEVER cached.
    d214DirectionProperties: function (mem) {
        try {
            var key = mem && (mem.buffer || mem), cache = GrammarProvider._d214DirectionCache;
            if (cache && key && cache.has(key)) return cache.get(key);
            var family = GrammarProvider.decodeD198(mem), result = [];
            if (family.classification !== 'confirmed-zil-family' || family.evidence !== 'validated') return result;
            var h = ZRamReader.header(mem);
            if ([3, 4, 5].indexOf(h.version) < 0) return result;
            var dict = GrammarProvider._d198RawDictionary(mem, h, mem.byteLength || mem.length), byProp = {}, byLabel = {}, rejected = false;
            if (!dict) return result;
            var present = {};
            for (var id = 1, count = ZRamReader.objectCount(mem, h); id <= count; id++) {
                ZRamReader.listProps(mem, id).forEach(function (p) { present[p.num] = true; });
            }
            dict.entries.forEach(function (entry) {
                if (!(entry.flags & 0x10)) return;
                // Single-value layout: the invariant proves P1 = direction, so the value is data[1].
                var prop = dict.layout === 'single-value' ? entry.data[1] : entry.data[(entry.flags & 3) === 3 ? 1 : 2];
                var label = typeof ExitCalibrator !== 'undefined' && ExitCalibrator.normalizeDir(entry.word) || entry.word;
                if (!/^[a-z]+$/.test(label) || !Number.isInteger(prop) || prop < 1 || prop > (h.version <= 3 ? 31 : 63) || !present[prop]) { rejected = true; return; }
                if (byLabel[label] != null && byLabel[label] !== prop) { rejected = true; return; }
                byLabel[label] = prop;
                (byProp[prop] = byProp[prop] || []).push({ word: entry.word, label: label });
            });
            if (!rejected) Object.keys(byProp).forEach(function (prop) {
                var aliases = byProp[prop], cardinal = /^(north|south|east|west|northeast|northwest|southeast|southwest|up|down|in|out)$/;
                var best = aliases.find(function (a) { return cardinal.test(a.label) && a.word === a.label; })
                    || aliases.find(function (a) { return cardinal.test(a.label); }) || aliases[0];
                result.push({ prop: Number(prop), label: best.label, aliases: aliases.map(function (a) { return a.word; }) });
            });
            if (cache && key) cache.set(key, result);
            return result;
        } catch (e) { return []; }
    },

    D198GrammarValve: {
        StorageKey: "PL_D198_GrammarValve_v1",
        _testOverride: null,
        mode: function () {
            var value = GrammarProvider.D198GrammarValve._testOverride;
            if (value == null) {
                try { value = typeof localStorage !== "undefined" && localStorage.getItem(GrammarProvider.D198GrammarValve.StorageKey); } catch (e) {}
            }
            return value === "off" || value === "shadow" ? value : "on";
        },
        setMode: function (mode) {
            var value = mode === "shadow" || mode === "on" ? mode : "off";
            if (value !== "shadow") {
                try { delete GrammarProvider._d198ShadowSnapshot; } catch (e0) { GrammarProvider._d198ShadowSnapshot = null; }
            }
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(GrammarProvider.D198GrammarValve.StorageKey, value);
                }
            } catch (e) {}
            return value;
        }
    },

    _d198Clone: function (value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    },

    _d198Absent: function (reason, evidence) {
        return {
            classification: "unknown",
            evidence: evidence || "absent",
            activation: "off",
            decoderVersion: GrammarProvider.D198DecoderVersion,
            reason: reason || "no-validated-family",
            evidenceRefs: [],
            vocabulary: [],
            prepositions: [],
            templates: []
        };
    },

    // D198 Gate D: decode only the structurally documented pre-V6 Infocom
    // grammar family. The Z-machine does not specify parser tables, so a
    // failed Inform test is never sufficient evidence. This decoder proves a
    // static-memory root, a self-sized monotonic pointer table, bounded parse
    // entries, dictionary verb-index cross-links, and the preposition table.
    // It returns game-wide grammar only; action numbers remain opaque.
    // B7 perf (b7-perf/D198-MUTATION-AUDIT): every caller only reads the decode, so the cached
    // result is deep-frozen and shared instead of JSON-copied per call (~20 calls per LOOK).
    // The one writer, collect() in shadow mode, copies first.
    _d198DeepFreeze: function (value) {
        if (value && typeof value === "object" && !Object.isFrozen(value)) {
            Object.freeze(value);
            Object.keys(value).forEach(function (k) { GrammarProvider._d198DeepFreeze(value[k]); });
        }
        return value;
    },
    decodeD198: function (mem) {
        var cache = GrammarProvider._d198DecodeCache;
        var cacheKey = mem && mem.buffer ? mem.buffer : mem;
        if (cache && cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);

        var result = GrammarProvider._decodeD198Uncached(mem);
        var cacheable = !!(result && result._d198Cacheable);
        if (result) delete result._d198Cacheable;
        if (cacheable && cache && cacheKey) cache.set(cacheKey, GrammarProvider._d198DeepFreeze(result));
        return result;
    },

    _decodeD198Uncached: function (mem) {
        var absent = GrammarProvider._d198Absent;
        try {
            if (!mem || typeof ZRamReader === "undefined") return absent("no-memory");
            var h = ZRamReader.header(mem);
            var length = mem.byteLength || mem.length || 0;
            if (!h || !length) return absent("invalid-zcode");
            if (h.version === 6) return absent("infocom-v6-family-not-implemented");

            var dict = GrammarProvider._d198RawDictionary(mem, h, length);
            if (!dict) return absent("invalid-dictionary", "rejected");

            // Modern and stamped Inform keeps its established classifier.
            // Early Inform Z3 (the Deja Vu counterexample) is recognized from
            // its own dictionary structure: compass words are noun-only and
            // do not carry Infocom's direction/verb bits.
            var knownInform = false;
            try { knownInform = !!(ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(mem)); } catch (e0) {}
            var earlyInform = GrammarProvider._d198EarlyInformSignal(dict.entries) &&
                GrammarProvider._d198InformGV1Structure(mem, h, length);
            if (knownInform || earlyInform) {
                return {
                    classification: "confirmed-inform",
                    evidence: "validated",
                    activation: "off",
                    decoderVersion: GrammarProvider.D198DecoderVersion,
                    reason: knownInform ? "existing-inform-classifier" : "inform-compass-dictionary-layout",
                    evidenceRefs: knownInform ? ["ZRamReader.isInformCompiled"] : ["dictionary-compass-noun-layout"],
                    vocabulary: [], prepositions: [], templates: []
                };
            }

            var grammar = GrammarProvider._d198InfocomGrammar(mem, h, length, dict);
            if (!grammar) return absent("unvalidated-grammar-family", "rejected");
            return grammar;
        } catch (e) {
            return absent("decoder-exception", "rejected");
        }
    },

    _d198RawDictionary: function (mem, h, length) {
        var p = h.dict;
        if (!(p >= 0x40 && p + 4 <= length)) return null;
        var separatorCount = ZRamReader.u8(mem, p);
        if (separatorCount > 64 || p + 1 + separatorCount + 3 > length) return null;
        p += 1 + separatorCount;
        var entryLen = ZRamReader.u8(mem, p);
        var count = ZRamReader.u16(mem, p + 1);
        var first = p + 3;
        var textWords = h.version <= 3 ? 2 : 3;
        var textBytes = textWords * 2;
        // D198 layouts, chosen for the whole dictionary:
        // classic = text + flags + two value bytes (or more);
        // single-value = text + flags + ONE value byte (the P1 part's value, Sherlock v5
        // parser.zil K-P-P1OFF 7). It is admitted only under a biconditional
        // part-of-speech invariant, so data[1] always belongs to a known part.
        var layout = entryLen >= textBytes + 3 ? 'classic'
            : (entryLen === textBytes + 2 && h.version === 5 ? 'single-value' : null);
        if (!layout || count < 1 || count > 4000 || first + entryLen * count > length) return null;
        var entries = [], byAddress = {}, byWord = {};
        for (var i = 0; i < count; i++) {
            var addr = first + i * entryLen;
            var word = String(ZRamReader.decodeDictionaryText(mem, addr, textWords) || "").toLowerCase().trim();
            var data = [];
            for (var j = textBytes; j < entryLen; j++) data.push(ZRamReader.u8(mem, addr + j));
            if (layout === 'single-value') {
                var f = data[0], p1 = f & 3;
                if (((f & 0x40) !== 0) !== (p1 === 1) || ((f & 0x10) !== 0) !== (p1 === 3) || p1 === 2
                    || (p1 === 0 && data[1] !== 0)) return null;
            }
            var entry = { word: word, addr: addr, flags: data[0], data: data };
            entries.push(entry);
            byAddress[addr] = entry;
            if (word) byWord[word] = entry;
        }
        return { entries: entries, byAddress: byAddress, byWord: byWord, first: first, end: first + entryLen * count, entryLen: entryLen, layout: layout };
    },

    _d198EarlyInformSignal: function (entries) {
        var compass = { north: 1, south: 1, east: 1, west: 1, n: 1, s: 1, e: 1, w: 1 };
        var seen = 0;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            if (!e || !compass[e.word]) continue;
            if ((e.flags & 0x80) === 0 || (e.flags & 0x50) !== 0) return false;
            seen++;
        }
        return seen >= 4;
    },

    _d198InformGV1Structure: function (mem, h, length) {
        var base = h.staticMem;
        if (!(base >= 0x40 && base + 4 <= length)) return false;
        var first = ZRamReader.u16(mem, base);
        if (!(first > base && first < length) || ((first - base) & 1)) return false;
        var count = (first - base) / 2;
        if (count < 1 || count > 256) return false;
        var previous = 0;
        for (var i = 0; i < count; i++) {
            var start = ZRamReader.u16(mem, base + i * 2);
            var limit = i + 1 < count ? ZRamReader.u16(mem, base + (i + 1) * 2) : length;
            if (start < first || start >= length || (previous && start <= previous) || limit <= start || limit > length) return false;
            previous = start;
            var lines = ZRamReader.u8(mem, start);
            if (lines < 1 || lines > 64) return false;
            var pos = start + 1;
            for (var line = 0; line < lines; line++) {
                if (pos + 8 > limit || ZRamReader.u8(mem, pos) > 6) return false;
                for (var token = 1; token <= 6; token++) {
                    var value = ZRamReader.u8(mem, pos + token);
                    if ((value >= 9 && value <= 15) || (value >= 112 && value <= 127)) return false;
                }
                pos += 8;
            }
            if (i + 1 < count) {
                while (pos < limit && ZRamReader.u8(mem, pos) === 0) pos++;
                if (pos !== limit) return false;
            }
        }
        return true;
    },

    _d198InfocomGrammar: function (mem, h, length, dict) {
        var base = h.staticMem;
        if (!(base >= 0x40 && base + 4 <= length)) return null;
        var first = ZRamReader.u16(mem, base);
        if (!(first > base && first < length) || ((first - base) & 1)) return null;
        var verbCount = (first - base) / 2;
        if (verbCount < 1 || verbCount > 256) return null;
        var pointers = [];
        for (var i = 0; i < verbCount; i++) {
            var pointer = ZRamReader.u16(mem, base + i * 2);
            if (pointer < first || pointer >= length || (i && pointer <= pointers[i - 1])) return null;
            pointers.push(pointer);
        }

        var firstLines = ZRamReader.u8(mem, pointers[0]);
        if (firstLines < 1 || firstLines > 64 || verbCount < 2) return null;
        var family = ((pointers[1] - pointers[0]) / firstLines <= 7) ? "variable" : "fixed";
        var syntaxByIndex = [], maxAction = -1, grammarEnd = 0;
        var sizes = [2, 4, 7, 0];
        for (i = 0; i < verbCount; i++) {
            var start = pointers[i];
            var limit = i + 1 < verbCount ? pointers[i + 1] : length;
            var lineCount = ZRamReader.u8(mem, start);
            var pos = start + 1, lines = [];
            if (lineCount < 1 || lineCount > 64) return null;
            for (var lineNo = 0; lineNo < lineCount; lineNo++) {
                if (family === "fixed") {
                    if (pos + 8 > limit) return null;
                    var objects = ZRamReader.u8(mem, pos);
                    if (objects > 2) return null;
                    var prep1 = ZRamReader.u8(mem, pos + 1);
                    var prep2 = ZRamReader.u8(mem, pos + 2);
                    if ((prep1 && prep1 < 0x80) || (prep2 && prep2 < 0x80)) return null;
                    var fixedAction = ZRamReader.u8(mem, pos + 7);
                    lines.push({ objectCount: objects, prepIndices: [prep1, prep2].filter(function (value) { return !!value; }), action: fixedAction, findAttributes: [ZRamReader.u8(mem,pos+3),ZRamReader.u8(mem,pos+4)] });
                    if (fixedAction > maxAction) maxAction = fixedAction;
                    pos += 8;
                } else {
                    if (pos + 2 > limit) return null;
                    var firstByte = ZRamReader.u8(mem, pos);
                    var variableObjects = (firstByte >> 6) & 3;
                    var size = sizes[variableObjects];
                    if (!size || pos + size > limit) return null;
                    var variablePreps = [];
                    var p1 = firstByte & 0x3f;
                    if (p1) variablePreps.push(p1 | 0xc0);
                    if (variableObjects > 1) {
                        var p2 = ZRamReader.u8(mem, pos + 4) & 0x3f;
                        if (p2) variablePreps.push(p2 | 0xc0);
                    }
                    var variableAction = ZRamReader.u8(mem, pos + 1);
                    lines.push({ objectCount: variableObjects, prepIndices: variablePreps, action: variableAction, findAttributes: variableObjects ? [ZRamReader.u8(mem,pos+2), variableObjects > 1 ? ZRamReader.u8(mem,pos+5) : 0] : null });
                    if (variableAction > maxAction) maxAction = variableAction;
                    pos += size;
                }
            }
            if (i + 1 < verbCount) {
                while (pos < limit && ZRamReader.u8(mem, pos) === 0) pos++;
                if (pos !== limit) return null;
            }
            syntaxByIndex.push(lines);
            grammarEnd = pos;
        }
        if (maxAction < 0 || maxAction > 255) return null;

        var actionBase = grammarEnd;
        while (actionBase < length && ZRamReader.u8(mem, actionBase) === 0) actionBase++;
        var actionCount = maxAction + 1;
        var prepBase = actionBase + actionCount * 4;
        if (actionBase >= length || prepBase + 2 > length) return null;
        var prepCount = ZRamReader.u16(mem, prepBase);
        if (prepCount > 128 || prepBase + 2 + prepCount * 3 > length) return null;
        var prepType = 1;
        if (prepCount && prepBase + 5 < length && ZRamReader.u8(mem, prepBase + 4) === 0) prepType = 0;
        var prepEntrySize = prepType === 0 ? 4 : 3;
        if (prepBase + 2 + prepCount * prepEntrySize > length) return null;
        var prepByIndex = {}, prepositions = [];
        var singleValue = dict.layout === 'single-value', prepIdByWord = {}, prepAliases = {};
        var prepPos = prepBase + 2;
        for (i = 0; i < prepCount; i++) {
            var dictAddr = ZRamReader.u16(mem, prepPos);
            var prepEntry = dict.byAddress[dictAddr];
            if (!prepEntry || !prepEntry.word) return null;
            var prepIndex = prepType === 0 ? ZRamReader.u16(mem, prepPos + 2) : ZRamReader.u8(mem, prepPos + 2);
            if (prepIndex < 0x80) return null;
            if (singleValue) {
                // Sherlock's PREPOSITIONS lists synonyms under one ID. Allowed only
                // for preposition-flagged words; a word may never carry two IDs.
                if (!(prepEntry.flags & 0x08)) return null;
                if (prepIdByWord[prepEntry.word] != null && prepIdByWord[prepEntry.word] !== prepIndex) return null;
                prepIdByWord[prepEntry.word] = prepIndex;
                if (prepByIndex[prepIndex]) {
                    var al = prepAliases[prepIndex];
                    if (al.aliases.indexOf(prepEntry.word) < 0 && al.canonical !== prepEntry.word) al.aliases.push(prepEntry.word);
                    prepositions.push(prepEntry.word);
                    prepPos += prepEntrySize;
                    continue;
                }
                prepAliases[prepIndex] = { id: prepIndex, canonical: prepEntry.word, aliases: [] };
            } else if (prepByIndex[prepIndex]) return null;
            prepByIndex[prepIndex] = prepEntry.word;
            prepositions.push(prepEntry.word);
            prepPos += prepEntrySize;
        }

        var verbEntries = [], mappedIndices = {};
        for (i = 0; i < dict.entries.length; i++) {
            var de = dict.entries[i];
            if (!de.word || !(de.flags & 0x40)) continue;
            var dataOffset = (singleValue || (de.flags & 0x03) === 0x01) ? 1 : 2;
            if (dataOffset >= de.data.length) continue;
            var verbIndex = 255 - de.data[dataOffset];
            if (verbIndex < 0 || verbIndex >= verbCount) continue;
            mappedIndices[verbIndex] = true;
            verbEntries.push({ word: de.word, verbIndex: verbIndex });
        }
        var orphanVerbIndices = [];
        for (i = 0; i < verbCount; i++) {
            if (!mappedIndices[i]) orphanVerbIndices.push(i);
        }
        if (orphanVerbIndices.length) {
            // A bounded syntax entry can be authored without a dictionary
            // spelling. It still participates in action/preposition layout,
            // but can never supply a command template by itself.
            if (orphanVerbIndices.length > 1 || orphanVerbIndices.length * 100 > verbCount) return null;
            var orphanIndex = orphanVerbIndices[0];
            var orphanLines = syntaxByIndex[orphanIndex];
            if (!orphanLines || !orphanLines.length || orphanLines.some(function (line) {
                return line.prepIndices.some(function (prep) { return !prepByIndex[prep]; });
            })) return null;
            for (i = 0; i < dict.entries.length; i++) {
                var rawVerb = dict.entries[i];
                if (!(rawVerb.flags & 0x40)) continue;
                // Check both possible data positions, including records whose
                // undecodable word was excluded by the mapped-word pass.
                if (singleValue) {
                    if (!rawVerb.data || rawVerb.data.length < 2 || 255 - rawVerb.data[1] === orphanIndex) return null;
                    continue;
                }
                if (!rawVerb.data || rawVerb.data.length < 3
                    || 255 - rawVerb.data[1] === orphanIndex
                    || 255 - rawVerb.data[2] === orphanIndex) return null;
            }
        }

        var vocabulary = [], seenWords = {}, templates = [];
        verbEntries.forEach(function (verb) {
            if (!seenWords[verb.word]) { seenWords[verb.word] = 1; vocabulary.push(verb.word); }
            (syntaxByIndex[verb.verbIndex] || []).forEach(function (line) {
                var words = [];
                for (var k = 0; k < line.prepIndices.length; k++) {
                    var prepWord = prepByIndex[line.prepIndices[k]];
                    if (!prepWord) return;
                    words.push(prepWord);
                }
                if (words.length !== line.prepIndices.length) return;
                templates.push({
                    verb: verb.word,
                    verbIndex: verb.verbIndex,
                    objectCount: line.objectCount,
                    prepositions: words,
                    findAttributes: line.findAttributes || null,
                    actionId: "infocom-pre-v6:" + line.action
                });
            });
        });
        if (!templates.length) return null;
        var decoded = {
            classification: "confirmed-zil-family",
            family: "infocom-pre-v6-" + family,
            evidence: "validated",
            activation: "off",
            decoderVersion: GrammarProvider.D198DecoderVersion,
            reason: "bounded-root-pointer-dictionary-crosslinks",
            evidenceRefs: ["header-static-memory-root", "monotonic-grammar-pointers", "dictionary-verb-indices", "bounded-preposition-table"],
            _d198Cacheable: dict.first >= h.staticMem,
            staticRange: { start: base, end: prepPos },
            vocabulary: vocabulary,
            prepositions: prepositions,
            templates: templates
        };
        if (singleValue) {
            decoded.dictionaryLayout = 'single-value';
            decoded.prepositionIds = Object.keys(prepAliases).map(function (k) { return prepAliases[k]; });
            decoded.evidenceRefs.push("single-value-dictionary-invariant");
        }
        if (orphanVerbIndices.length) {
            decoded.orphanVerbIndices = orphanVerbIndices;
            decoded.evidenceRefs.push("bounded-unreferenced-syntax-index");
        }
        return decoded;
    },

    d198Diagnostics: function (mem) {
        return GrammarProvider.decodeD198(mem);
    },

    d198ShadowDiagnostics: function () {
        return GrammarProvider._d198Clone(GrammarProvider._d198ShadowSnapshot || null);
    },

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
            var mode = GrammarProvider.D198GrammarValve.mode();
            try { delete GrammarProvider._d198ShadowSnapshot; } catch (e0) { GrammarProvider._d198ShadowSnapshot = null; }
            var mem = typeof ZRamProvider !== "undefined" && ZRamProvider.getMem && ZRamProvider.getMem();
            if (!mem) {
                return { sources: [{ name: "grammar-ram", confidence: 0.02 }], specialCommands: [] };
            }
            var verbs = GrammarProvider.readVerbWords(mem);
            var special = verbs.map(function (v) {
                return { label: v, command: v, source: "dictionary-verb" };
            });

            var d198 = null;
            if (mode === "shadow") d198 = GrammarProvider._d198Clone(GrammarProvider.decodeD198(mem));
            else if (mode === "on") d198 = GrammarProvider.decodeD198(mem);
            if (mode === "shadow") {
                d198.activation = "shadow";
                GrammarProvider._d198ShadowSnapshot = GrammarProvider._d198Clone(d198);
            } else if (mode === "on" && d198 && d198.classification === "confirmed-zil-family" && d198.evidence === "validated") {
                var seen = {};
                special.forEach(function (item) { seen[String(item.command || "").toLowerCase()] = true; });
                d198.vocabulary.forEach(function (verb) {
                    var key = String(verb || "").toLowerCase();
                    if (!key || seen[key]) return;
                    seen[key] = true;
                    special.push({ label: verb, command: verb, source: "dictionary-verb", d198: true });
                });
                verbs = special.map(function (item) { return item.command; });
            }
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
