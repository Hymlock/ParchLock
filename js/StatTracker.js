// D149 character tracker.
//
// Reports the stats a module actually tracks, and nothing else. Every number
// shown here has been verified against the game's own evidence first; a stat
// that cannot be verified has no row at all, which is D24's honest absence
// applied to the HUD. There is no per-title branching anywhere in this file.
//
// Four sources, cheapest and most certain first. Each was measured live before
// being written down (see docs/ai-plan.md D149 for the raw captures):
//
//   1. Header. A v3 story's status line is drawn by the INTERPRETER, so its
//      inputs are fixed by the standard: Flags1 bit 1 is 0 for score/turns and
//      1 for hours:mins, and globals 0/1/2 are location/score-or-hours/
//      turns-or-minutes. Measured: Deadline (flags 0x62) shows 8:04 with G1=8
//      and G2=4, then 8:07 with G2=7 -- it is a timed mystery with no score at
//      all, and the header says so before a single turn is played.
//
//   2. The game's own status window, for v4+ where the GAME draws it. One row
//      of 3+-space-separated columns; D80 established that shape from a live
//      capture. Measured: "Room #2   Score: 1   A large, textured cavern
//      Health: 81%" (wump2ka) and "OPEN PLAIN   HIT POINTS: 15/15   Paths: ...
//      QUEST RATE: 0/500" (TreasuresofaSlaversKingdom). Three value shapes are
//      real -- plain, percent, and n/m fraction -- not one.
//
//   3. Global variables, PROMOTED ONLY AFTER matching observed text through a
//      real change. The Inform library often uses the same slots as v3 (Advent
//      G1=36=score, G2=moves; Balances G1=0, G2=moves), but two measured
//      counterexamples prove assuming it would ship wrong numbers: Anchorhead's
//      G2 is 105 and constant with its turn counter at G4/G10, and Planetfall's
//      G2 climbs 40 a turn because it is the Galactic Standard Time clock its
//      own SCORE reply describes. So a slot is a candidate, never a source.
//
//   4. The SCORE reply, which is the only way to learn a MAXIMUM and a RANK.
//      It costs a turn, so it is never issued automatically without being asked
//      for. One module answers "There is no scoring in this game." (LDoDoom),
//      which is a positive finding that suppresses the score row for good.
//
// Deaths are counted here because no module exposes a counter. Confirmed live in
// Zork 1: "**** You have died ****" (ZIL uses four asterisks, Inform three) and
// the score fell 35 -> 25, so a score DECREASE is a normal event and must never
// fire the score-up cue.
var StatTracker = {
    STORAGE_PREFIX: "PM_Stats_",
    // A label must carry a number on two separate turns before it becomes a
    // stat, so one stray line of prose containing a colon cannot install a
    // permanent gauge.
    CONFIRM_SAMPLES: 2,
    MAX_SAMPLES: 8,
    MAX_GLOBALS: 64,

    _samples: [],
    _events: [],
    _key: null,
    _model: null,

    // ---- label vocabulary ------------------------------------------------
    // Genre-wide conventions, not per-title knowledge. An unrecognised label is
    // still tracked; it simply keeps its own printed name, because a game that
    // invents "QUEST RATE" deserves to have it shown as "QUEST RATE".
    CANON: {
        score: "score", points: "score",
        moves: "turns", move: "turns", turns: "turns", turn: "turns",
        health: "health", "hit points": "health", hp: "health", hits: "health",
        stamina: "stamina", energy: "stamina", strength: "strength",
        hunger: "hunger", food: "hunger", thirst: "thirst", water: "thirst",
        sleep: "sleep", rest: "sleep", time: "time", day: "day",
        money: "money", cash: "money", gold: "gold"
    },
    canonKey: (label) => {
        var l = String(label || "").trim().toLowerCase().replace(/\s+/g, " ");
        return StatTracker.CANON[l] || l;
    },

    // ---- status-line parsing ---------------------------------------------
    // The column split is shared with WorldModel.refineRoomDisplayName, which
    // already computed exactly this and then discarded the stat columns in
    // order to find the room title. One parse, two consumers.
    splitColumns: (raw) => String(raw || "")
        .split(/\r?\n| {3,}/)
        .map(function (c) { return c.trim(); })
        .filter(function (c) { return !!c; }),

    // "Score: 1", "Health: 81%", "HIT POINTS: 15/15".
    COLUMN_STAT: /^([A-Za-z][A-Za-z .'-]{0,18}?)\s*[:=]\s*(-?\d+)\s*(?:\/\s*(\d+)|(%))?$/,

    statsFromColumns: (cols) => {
        var out = {};
        (cols || []).forEach(function (col) {
            var m = StatTracker.COLUMN_STAT.exec(String(col).trim());
            if (!m) return;
            var key = StatTracker.canonKey(m[1]);
            if (!key) return;
            out[key] = {
                key: key,
                label: String(m[1]).trim(),
                value: parseInt(m[2], 10),
                max: m[3] ? parseInt(m[3], 10) : null,
                unit: m[3] ? "fraction" : (m[4] ? "percent" : "plain")
            };
        });
        return out;
    },

    // ---- the SCORE reply -------------------------------------------------
    // Ordered families, every one of them measured verbatim. Tried longest-
    // information-first so a reply carrying a maximum is never matched by the
    // barer pattern that would drop it.
    SCORE_PATTERNS: [
        // Inform: "You have so far scored 36 out of a possible 350, in 1 turn,
        // earning you the rank of Adventurer."
        /scored\s+(\d+)\s+out of a possible\s+(\d+)\s*(?:points)?[,;]?\s*(?:in\s+(\d+)\s+turns?)?/i,
        // Sherlock: "[You have 0 out of 100 points, which earns you a ranking of ...]"
        /You have\s+(\d+)\s+out of\s+(\d+)\s+points/i,
        // ZIL: "Your score is 0 (total of 350 points), in 1 move."
        /score is\s+(-?\d+)\s*\((?:total of|out of)\s+(\d+)\s+points\)(?:,\s*in\s+(\d+)\s+moves?)?/i,
        // Enchanter: "Your score is 0 of a possible 400, in 1 move."
        /score is\s+(-?\d+)\s+of a possible\s+(\d+)(?:,\s*in\s+(\d+)\s+moves?)?/i,
        // Planetfall: "Your score would be 0 (out of 80 points)."
        /score would be\s+(-?\d+)\s*\(out of\s+(\d+)\s+points\)/i,
        // wump2ka: "You have so far scored 1 point in 3 turns." -- no maximum.
        /scored\s+(\d+)\s+points?\s+in\s+(\d+)\s+turns?/i
    ],
    RANK_PATTERNS: [
        /rank of\s+"?([^".\n]+?)"?\s*[.\n]/i,
        /class of\s+([^.\n]+?)\s*[.\n]/i,
        /ranking of\s+([^.\n]+?)\s*[.\n]/i,
        /giving you the rank of\s+([^.\n]+?)\s*[.\n]/i
    ],
    // LDoDoom answers this outright. A positive finding, not a failure.
    NO_SCORE: /there is no scoring in this game|this game (?:has no|does not have a) score/i,

    parseScoreReply: (text) => {
        var t = String(text || "");
        if (!t) return null;
        if (StatTracker.NO_SCORE.test(t)) return { scored: false, unavailable: true };
        for (var i = 0; i < StatTracker.SCORE_PATTERNS.length; i++) {
            var m = StatTracker.SCORE_PATTERNS[i].exec(t);
            if (!m) continue;
            var out = { scored: true, score: parseInt(m[1], 10), max: null, turns: null, rank: null };
            // The wump2ka family has no maximum: its second group is the turn
            // count, so it must not be mistaken for one.
            if (i === StatTracker.SCORE_PATTERNS.length - 1) {
                out.turns = parseInt(m[2], 10);
            } else {
                out.max = m[2] != null ? parseInt(m[2], 10) : null;
                if (m[3] != null) out.turns = parseInt(m[3], 10);
            }
            for (var r = 0; r < StatTracker.RANK_PATTERNS.length; r++) {
                var rm = StatTracker.RANK_PATTERNS[r].exec(t);
                if (rm && rm[1] && rm[1].trim()) { out.rank = rm[1].trim(); break; }
            }
            return out;
        }
        return null;
    },

    // ---- DIAGNOSE --------------------------------------------------------
    // Infocom wrote prose, not gauges, so these are ordered qualitative bands
    // and are never rendered as an invented percentage. Measured: Zork 1 "You
    // are in perfect health. You can be killed by a serious wound."; Enchanter
    // "You are wide awake. You are well hydrated and well fed."; Planetfall
    // "perfect health ... well-rested ... well-fed".
    DIAGNOSE_SCALES: [
        { key: "health", steps: [
            [/perfect health|in good shape|unhurt|uninjured/i, "perfect"],
            [/light wound|bruised|slightly injured|minor/i, "bruised"],
            [/serious wound|badly|severe/i, "wounded"],
            [/mortal|dying|near death/i, "critical"]
        ] },
        { key: "hunger", steps: [
            [/well[- ]fed|not hungry/i, "fed"],
            [/hungry|peckish|could eat/i, "hungry"],
            [/starving|famished/i, "starving"]
        ] },
        { key: "thirst", steps: [
            [/well[- ]?hydrated|not thirsty/i, "hydrated"],
            [/thirsty/i, "thirsty"],
            [/dehydrated|parched/i, "parched"]
        ] },
        { key: "sleep", steps: [
            [/wide awake|well[- ]rested|alert/i, "rested"],
            [/tired|sleepy|drowsy/i, "tired"],
            [/exhausted|can barely stay awake/i, "exhausted"]
        ] }
    ],
    parseDiagnoseReply: (text) => {
        var t = String(text || "");
        if (!t || /not a verb|don't know the word/i.test(t)) return null;
        var out = {};
        StatTracker.DIAGNOSE_SCALES.forEach(function (scale) {
            for (var i = 0; i < scale.steps.length; i++) {
                if (scale.steps[i][0].test(t)) {
                    out[scale.key] = { key: scale.key, band: scale.steps[i][1],
                                       step: i, steps: scale.steps.length, unit: "ordinal" };
                    // D166: the FIRST match wins. An earlier draft kept scanning
                    // so a graver band would override, which read Zork 1's "You
                    // are in perfect health. You can be killed by a serious
                    // wound." as "wounded" -- the second sentence is a statement
                    // of what COULD happen, not of the player's condition. These
                    // replies state the current state first, so stopping there
                    // is both simpler and right.
                    break;
                }
            }
        });
        return Object.keys(out).length ? out : null;
    },

    // ---- end-of-game banners --------------------------------------------
    // Every ending in both libraries prints a "*** ... ***" banner, so the
    // banner is classified rather than one sentence being matched. Anything
    // that is not a win and not a voluntary quit is an involuntary ending and
    // counts as a death -- which is what makes this work on the ~217 modules
    // nobody has probed.
    BANNER: /\*{3,}\s*([^*\n]{1,90}?)\s*\*{3,}/g,
    classifyBanner: (inner) => {
        var t = String(inner || "").toLowerCase();
        if (!t) return null;
        if (/\b(won|win|victorio|triumph|congratulat)/.test(t)) return "win";
        if (/\b(quit|session|have left|end of session)/.test(t)) return "quit";
        return "death";
    },
    // Returns every banner in a chunk of text, classified.
    bannersIn: (text) => {
        var out = [];
        var re = new RegExp(StatTracker.BANNER.source, "g");
        var m;
        while ((m = re.exec(String(text || ""))) !== null) {
            var kind = StatTracker.classifyBanner(m[1]);
            if (kind) out.push({ kind: kind, text: m[1].trim() });
        }
        return out;
    },

    // ---- model / persistence --------------------------------------------
    blank: () => ({
        stats: {},          // key -> stat record
        globals: {},        // key -> confirmed global index
        deaths: 0,
        wins: 0,
        scoreUnavailable: false,
        rank: null,
        probed: false,
        seenBanners: {}
    }),

    load: (key) => {
        var m = StatTracker.blank();
        try {
            if (typeof localStorage === "undefined") return m;
            var raw = localStorage.getItem(StatTracker.STORAGE_PREFIX + key);
            if (!raw) return m;
            var parsed = JSON.parse(raw);
            Object.keys(m).forEach(function (k) {
                if (parsed && parsed[k] != null) m[k] = parsed[k];
            });
        } catch (e) {}
        return m;
    },
    // D157: observe() is driven by WorldModel.apply, measured at about forty
    // calls per TURN. Serialising the model and writing localStorage on every
    // one of those is forty JSON.stringify calls and forty synchronous storage
    // writes per turn for data that changes a handful of times a session --
    // pure overhead on a phone, and an easy way to push a constrained device
    // toward its storage quota, where OTHER writes (the map, preferences) start
    // failing too and stay failing until the app's data is cleared.
    //
    // The write is therefore skipped unless the serialised model actually
    // differs from what was last written.
    _lastSaved: null,
    save: (key, model) => {
        try {
            if (typeof localStorage === "undefined") return;
            var json = JSON.stringify(model);
            if (json === StatTracker._lastSaved) return;
            StatTracker._lastSaved = json;
            localStorage.setItem(StatTracker.STORAGE_PREFIX + key, json);
        } catch (e) {}
    },

    model: () => {
        if (!StatTracker._model) StatTracker._model = StatTracker.blank();
        return StatTracker._model;
    },
    reset: () => {
        StatTracker._samples = [];
        StatTracker._events = [];
        StatTracker._model = StatTracker.blank();
        StatTracker._key = null;
        StatTracker._v3 = null;
        StatTracker._probePending = null;
        StatTracker._probeTurns = 0;
    },

    // ---- header facts ----------------------------------------------------
    // v3 only, and spec-guaranteed there. Flags1 bit 1 set means the status
    // line is a clock, which means the story has no score to show.
    headerFacts: (mem) => {
        var out = { version: null, clockGame: false, interpreterStatus: false };
        try {
            if (typeof ZRamReader === "undefined" || !ZRamReader.header) return out;
            var h = ZRamReader.header(mem);
            if (!h) return out;
            out.version = h.version;
            out.interpreterStatus = h.version <= 3;
            if (h.version <= 3) out.clockGame = !!(ZRamReader.u8(mem, 1) & 0x02);
        } catch (e) {}
        return out;
    },

    readGlobals: (mem) => {
        var g = [];
        try {
            var h = ZRamReader.header(mem);
            if (!h) return g;
            for (var i = 0; i < StatTracker.MAX_GLOBALS; i++) {
                g.push(ZRamReader.u16(mem, h.globals + i * 2));
            }
        } catch (e) {}
        return g;
    },

    // ---- the per-turn observation ----------------------------------------
    // `statusRaw` is the status window's text; `mem` may be null (no RAM, or a
    // provider that cannot supply it), in which case only the text path runs.
    observe: function (mem, statusRaw) {
        var facts = StatTracker.headerFacts(mem);
        var key = null;
        try { key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : null; } catch (e) {}
        key = key || "unknown";
        if (StatTracker._key !== key) {
            StatTracker._key = key;
            StatTracker._samples = [];
            StatTracker._model = StatTracker.load(key);
        }
        var model = StatTracker.model();
        if (facts.clockGame) model.scoreUnavailable = true;

        var observed = StatTracker.statsFromColumns(StatTracker.splitColumns(statusRaw));
        var globals = mem ? StatTracker.readGlobals(mem) : [];

        // D153: observe() is driven by WorldModel.apply, which was measured
        // running about forty times per TURN, not once. A plain rolling window
        // therefore held eight samples from inside a single turn, every one of
        // them identical, so no value ever appeared to change and nothing could
        // ever be promoted -- Anchorhead's turn counter sat in slots 4 and 10
        // advancing every turn and was never seen to move.
        //
        // Recording a sample only when something actually differs makes the
        // window span real changes rather than real time, which is what every
        // consumer below is actually asking about.
        var prev = StatTracker._samples[StatTracker._samples.length - 1];
        var same = false;
        if (prev && prev.globals.length === globals.length) {
            same = true;
            for (var gi = 0; gi < globals.length; gi++) {
                if (prev.globals[gi] !== globals[gi]) { same = false; break; }
            }
            if (same) {
                var pk = Object.keys(prev.observed), ok2 = Object.keys(observed);
                if (pk.length !== ok2.length) same = false;
                else {
                    for (var oi = 0; oi < ok2.length; oi++) {
                        var kk = ok2[oi];
                        if (!prev.observed[kk] || prev.observed[kk].value !== observed[kk].value) { same = false; break; }
                    }
                }
            }
        }
        if (!same) {
            StatTracker._samples.push({ observed: observed, globals: globals });
            if (StatTracker._samples.length > StatTracker.MAX_SAMPLES) StatTracker._samples.shift();
        }

        Object.keys(observed).forEach(function (k) {
            StatTracker.recordObservation(model, k, observed[k]);
        });
        StatTracker.seedInterpreterStatus(model, facts, globals);
        StatTracker.promoteTurnCounter(model);
        StatTracker.promoteGlobals(model);
        StatTracker.readConfirmedGlobals(model, globals);
        StatTracker.save(key, model);
        return model;
    },

    // A stat needs CONFIRM_SAMPLES sightings before it is shown at all.
    recordObservation: function (model, k, rec) {
        var prev = model.stats[k];
        if (!prev) {
            model.stats[k] = {
                key: k, label: rec.label, value: rec.value, max: rec.max,
                unit: rec.unit, kind: StatTracker.kindFor(k, rec),
                seen: 1, source: "status", confirmed: false, lastChange: null
            };
            return;
        }
        prev.seen = (prev.seen || 1) + 1;
        prev.label = rec.label;
        // The denominator of an n/m gauge is re-read every turn rather than
        // latched: TreasuresofaSlaversKingdom was only ever observed at full
        // health, so there is no evidence its maximum is fixed.
        prev.max = rec.max;
        prev.unit = rec.unit;
        if (prev.seen >= StatTracker.CONFIRM_SAMPLES) prev.confirmed = true;
        if (rec.value !== prev.value) {
            var delta = rec.value - prev.value;
            prev.lastChange = delta;
            prev.value = rec.value;
            StatTracker.emitChange(model, k, delta);
        }
    },

    kindFor: (k, rec) => {
        if (k === "score") return "score";
        if (k === "turns") return "counter";
        if (k === "time") return "clock";
        if (rec && (rec.unit === "percent" || rec.unit === "fraction")) return "gauge";
        return "counter";
    },

    // A score increase is the only thing that earns the rising cue. A decrease
    // is a real, normal event -- Zork 1 charges 10 points for dying -- and must
    // stay silent.
    emitChange: function (model, k, delta) {
        if (k === "score" && delta > 0) {
            StatTracker._events.push({ type: "score-up", key: k, delta: delta });
        } else if (k === "score") {
            StatTracker._events.push({ type: "score-down", key: k, delta: delta });
        } else {
            StatTracker._events.push({ type: "change", key: k, delta: delta });
        }
    },

    // ---- the v3 interpreter-status path ----------------------------------
    // A v3 story's status line is drawn by the INTERPRETER from globals 0/1/2:
    // location, score-or-hours, turns-or-minutes. That is the standard, not a
    // convention, which is why it can be seeded here at all.
    //
    // It still is not simply believed. Every v3 game in this app renders the
    // room name alone (the open D137 collision), so there is no text to check
    // against and the check has to come from BEHAVIOUR: slot 2 is a turn
    // counter only if it rises by a small amount every single turn and never
    // falls. Confirming that also confirms the pairing, because the same clause
    // of the standard that puts turns in slot 2 puts the score in slot 1 -- so
    // one verified slot licenses the other, and neither is guessed.
    //
    // This is what makes Planetfall behave correctly for free: its slot 2
    // climbs 40 a turn (it is the Galactic Standard Time clock its own SCORE
    // reply names), so it fails the test, nothing is registered, and no wrong
    // number is shown. Measured: Zork 1 rises by 1 a turn and passes.
    // D152: the same behavioural test, run for EVERY version rather than v3
    // only. Measured on a 412px-wide phone: the status window is a fixed-width
    // character grid, so 905's status reads "Bedroom   Score: 9   Moves: 8" at
    // 672px and just "Bedroom" at 396px -- the score columns do not fit and
    // never reach the DOM at all. That is the open D137 collision, and it left
    // the tracker permanently empty on a phone, because promoting a global
    // needs text to verify against and there is none.
    //
    // What survives with no text is behaviour. A turn counter rises by a small
    // amount every turn and never falls, and that is checkable on any screen.
    // For v3 the standard also pairs it with the score in the previous slot, so
    // confirming one licenses the other. For v4+ there is no such clause, so
    // the turn counter is registered on its own and the score waits for real
    // corroboration -- a SCORE reply or a status line wide enough to read.
    V3_MAX_STEP: 8,
    _v3: null,
    seedInterpreterStatus: function (model, facts, globals) {
        if (!facts) return;
        if (!globals || globals.length < 3) return;
        var st = StatTracker._v3 || (StatTracker._v3 = { hits: 0, last: null });
        var slot1 = globals[1], slot2 = globals[2];
        if (st.last != null) {
            var step = slot2 - st.last;
            if (step >= 1 && step <= StatTracker.V3_MAX_STEP) st.hits++;
            else if (step !== 0) st.hits = 0;      // fell, or jumped like a clock
        }
        st.last = slot2;
        if (st.hits < StatTracker.CONFIRM_SAMPLES) return;

        if (facts.clockGame) {
            // Slot 1 is hours and slot 2 minutes. Confirmed live on Deadline:
            // 8:04 with G1=8/G2=4, then 8:07 with G2=7.
            StatTracker.setSeeded(model, "time", "Time",
                String(slot1) + ":" + (slot2 < 10 ? "0" : "") + String(slot2), "clock", "global:1+2");
            return;
        }
        StatTracker.setSeeded(model, "turns", "Turns", slot2, "counter", "global:2");
        model.globals.turns = 2;

        // v3 pairs the two slots by the standard, so one confirmation licenses
        // both. v4+ has no such guarantee -- Anchorhead's slot 1 is 1 and its
        // slot 2 is a constant 105 -- so the score is only taken from slot 1
        // once something independent has corroborated it (a SCORE reply, or a
        // status line wide enough to print it).
        if (facts.interpreterStatus) {
            StatTracker.setSeeded(model, "score", "Score", slot1, "counter", "global:1");
            if (model.stats.score) model.stats.score.kind = "score";
            model.globals.score = 1;
        } else if (model.stats.score && model.stats.score.confirmed && model.globals.score == null
                   && model.stats.score.value === slot1) {
            // Corroborated: the value something else established is sitting in
            // slot 1 right now, so that slot can drive it headlessly from here.
            model.globals.score = 1;
            model.stats.score.source = "global:1";
        }
    },

    // D153: the turn counter is not always in slot 2. Anchorhead's slot 2 is a
    // constant 105 and its real counter sits at slots 4 and 10, so the slot-2
    // test correctly rejected it and the game was left with no stats at all on
    // a phone -- its status grid is too narrow to print any, so there was
    // nothing else to fall back on and the whole panel stayed hidden.
    //
    // A turn counter is recognisable by behaviour wherever it lives: it rises
    // by exactly one on every single turn and never falls. Requiring EXACTLY
    // one (not "a small amount") is what keeps a clock out -- Planetfall's
    // Galactic Standard Time climbs 40 a turn -- and requiring it across
    // several consecutive turns is what keeps an unrelated counter that
    // happened to tick once from qualifying.
    TURN_CONFIRM_STEPS: 3,
    promoteTurnCounter: function (model) {
        if (model.globals.turns != null) return;                 // already known
        var samples = StatTracker._samples.filter(function (s) { return s.globals && s.globals.length; });
        if (samples.length < StatTracker.TURN_CONFIRM_STEPS + 1) return;
        // A payload is not applied exactly once per turn -- it can be re-applied
        // within a turn, giving a delta of 0 -- so every step must be 0 or 1,
        // with enough real increments to prove it is actually counting. A
        // constant (Anchorhead's slot 2 sits at 105) yields no increments and is
        // rejected; a clock (Planetfall's slot 2 climbs 40) breaks the 0-or-1
        // rule outright.
        var hits = [];
        for (var i = 0; i < StatTracker.MAX_GLOBALS; i++) {
            var ok = true, ups = 0;
            for (var s = 1; s < samples.length; s++) {
                var d = samples[s].globals[i] - samples[s - 1].globals[i];
                if (d !== 0 && d !== 1) { ok = false; break; }
                if (d === 1) ups++;
            }
            if (ok && ups >= StatTracker.TURN_CONFIRM_STEPS) hits.push(i);
        }
        if (!hits.length) return;
        // Several globals can advance together (Anchorhead's 4 and 10 both do).
        // They are all counting the same turns, so the lowest is as good as any.
        var idx = hits[0];
        model.globals.turns = idx;
        StatTracker.setSeeded(model, "turns", "Turns",
            samples[samples.length - 1].globals[idx], "counter", "global:" + idx);
    },

    setSeeded: function (model, key, label, value, kind, source) {
        var s = model.stats[key];
        if (!s) {
            s = model.stats[key] = { key: key, label: label, unit: kind === "clock" ? "clock" : "plain",
                                     kind: kind, seen: StatTracker.CONFIRM_SAMPLES, source: source,
                                     confirmed: true, value: value, max: null, lastChange: null };
            return s;
        }
        // A stat already sourced from the game's own text outranks a seed.
        if (s.source === "status" || s.source === "score-command" || s.source === "diagnose") return s;
        s.confirmed = true;
        s.source = source;
        if (s.value !== value) {
            var delta = (typeof value === "number" && typeof s.value === "number") ? value - s.value : 0;
            s.value = value;
            if (delta) { s.lastChange = delta; StatTracker.emitChange(model, key, delta); }
        }
        return s;
    },

    // ---- global verification ---------------------------------------------
    // A slot is promoted only after it has tracked a stat through a real
    // CHANGE. At turn one a scoreless game has dozens of zero globals and any
    // of them would "match" a score of 0; only a change tells them apart.
    promoteGlobals: function (model) {
        var samples = StatTracker._samples.filter(function (s) { return s.globals.length; });
        if (samples.length < StatTracker.CONFIRM_SAMPLES) return;
        Object.keys(model.stats).forEach(function (k) {
            if (model.globals[k] != null) return;
            var withStat = samples.filter(function (s) { return s.observed[k]; });
            if (withStat.length < StatTracker.CONFIRM_SAMPLES) return;
            var values = withStat.map(function (s) { return s.observed[k].value; });
            if (new Set(values).size < 2) return;          // never changed: undecidable
            var hits = [];
            for (var i = 0; i < StatTracker.MAX_GLOBALS; i++) {
                var ok = withStat.every(function (s) { return s.globals[i] === s.observed[k].value; });
                if (ok) hits.push(i);
            }
            // Exactly one surviving slot, or the promotion is ambiguous and is
            // left for a later sample to settle.
            if (hits.length === 1) {
                model.globals[k] = hits[0];
                if (model.stats[k]) model.stats[k].source = "global:" + hits[0];
            }
        });
    },

    // Once a slot is confirmed the stat is read headlessly, with no text at
    // all -- which is what carries v3, whose status row shows only the room
    // name. A slot that contradicts a later text reading is demoted.
    readConfirmedGlobals: function (model, globals) {
        if (!globals || !globals.length) return;
        Object.keys(model.globals).forEach(function (k) {
            var idx = model.globals[k];
            var stat = model.stats[k];
            if (!stat || idx == null || globals[idx] == null) return;
            var v = globals[idx];
            if (stat.source === "status" && stat.value !== v) {
                delete model.globals[k];                    // contradicted: demote
                return;
            }
            if (v !== stat.value) {
                var delta = v - stat.value;
                stat.value = v;
                stat.lastChange = delta;
                stat.confirmed = true;
                StatTracker.emitChange(model, k, delta);
            }
        });
    },

    // ---- deaths ----------------------------------------------------------
    // Guarded against double counting: the same banner text can be re-rendered
    // when the buffer redraws, and that is not a second death.
    observeText: function (text, turnMarker) {
        var model = StatTracker.model();
        var found = StatTracker.bannersIn(text);
        found.forEach(function (b) {
            var id = b.kind + "|" + b.text + "|" + (turnMarker == null ? "" : turnMarker);
            if (model.seenBanners[id]) return;
            model.seenBanners[id] = 1;
            if (b.kind === "death") {
                model.deaths = (model.deaths || 0) + 1;
                StatTracker._events.push({ type: "death", text: b.text, count: model.deaths });
            } else if (b.kind === "win") {
                model.wins = (model.wins || 0) + 1;
                StatTracker._events.push({ type: "win", text: b.text });
            }
        });
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        return model;
    },

    // ---- opt-in probe results -------------------------------------------
    applyScoreReply: function (text) {
        var model = StatTracker.model();
        var parsed = StatTracker.parseScoreReply(text);
        model.probed = true;
        if (!parsed) return model;
        if (parsed.unavailable) {
            model.scoreUnavailable = true;
            delete model.stats.score;
            if (StatTracker._key) StatTracker.save(StatTracker._key, model);
            return model;
        }
        var s = model.stats.score || { key: "score", label: "Score", unit: "plain",
                                       kind: "score", seen: 0, source: "score-command" };
        s.value = parsed.score;
        if (parsed.max != null) { s.max = parsed.max; s.unit = "fraction"; }
        s.seen = Math.max(s.seen || 0, StatTracker.CONFIRM_SAMPLES);
        s.confirmed = true;
        model.stats.score = s;
        if (parsed.rank) model.rank = parsed.rank;
        // D152: a SCORE reply is an independent reading of the same number, so
        // it can stand in for the status text the promoter normally verifies
        // against. Recording it as a sample means one press of Identify stats
        // is enough to pin the slot, after which the score updates live with no
        // text at all -- which is the only route on a phone, where the status
        // grid is too narrow to print it (D137).
        try {
            var mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
            if (mem) {
                var g = StatTracker.readGlobals(mem);
                if (g.length) {
                    var obs = { score: { key: "score", value: parsed.score, max: null, unit: "plain" } };
                    if (parsed.turns != null) obs.turns = { key: "turns", value: parsed.turns, max: null, unit: "plain" };
                    StatTracker._samples.push({ observed: obs, globals: g });
                    if (StatTracker._samples.length > StatTracker.MAX_SAMPLES) StatTracker._samples.shift();
                    StatTracker.promoteGlobals(model);
                }
            }
        } catch (eG) {}
        if (parsed.turns != null) {
            var t = model.stats.turns || { key: "turns", label: "Turns", unit: "plain", kind: "counter", seen: 0, source: "score-command" };
            t.value = parsed.turns;
            t.seen = Math.max(t.seen || 0, StatTracker.CONFIRM_SAMPLES);
            t.confirmed = true;
            model.stats.turns = t;
        }
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        return model;
    },

    applyDiagnoseReply: function (text) {
        var model = StatTracker.model();
        var parsed = StatTracker.parseDiagnoseReply(text);
        if (!parsed) return model;
        Object.keys(parsed).forEach(function (k) {
            var p = parsed[k];
            model.stats[k] = {
                key: k, label: k.charAt(0).toUpperCase() + k.slice(1),
                band: p.band, step: p.step, steps: p.steps,
                unit: "ordinal", kind: "gauge", seen: StatTracker.CONFIRM_SAMPLES,
                confirmed: true, source: "diagnose"
            };
        });
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        return model;
    },

    // ---- what the UI renders ---------------------------------------------
    // Only confirmed stats, and the score row disappears entirely for a module
    // that has told us it has no score.
    visibleStats: function () {
        var model = StatTracker.model();
        var out = [];
        Object.keys(model.stats).forEach(function (k) {
            var s = model.stats[k];
            if (!s || !s.confirmed) return;
            if (k === "score" && model.scoreUnavailable) return;
            out.push(s);
        });
        var ORDER = { score: 0, health: 1, stamina: 2, hunger: 3, thirst: 4, sleep: 5, turns: 8, time: 9 };
        out.sort(function (a, b) {
            var d = (ORDER[a.key] == null ? 6 : ORDER[a.key]) - (ORDER[b.key] == null ? 6 : ORDER[b.key]);
            return d || String(a.key).localeCompare(String(b.key));
        });
        if (model.deaths > 0) {
            out.push({ key: "deaths", label: "Deaths", value: model.deaths,
                       unit: "plain", kind: "counter", confirmed: true, source: "observed" });
        }
        return out;
    },

    takeEvents: function () {
        var e = StatTracker._events;
        StatTracker._events = [];
        return e;
    },

    // ---- per-turn driver -------------------------------------------------
    // Called once per applied payload from WorldModel. Everything below this
    // point needs a DOM and is skipped cleanly in Node, so the harness can
    // require this file and test the logic above without stubbing a browser.
    _lastBufferLen: 0,
    _turn: 0,

    statusText: () => {
        try {
            if (typeof document === "undefined") return "";
            var el = document.querySelector(".GridWindow.reverse") || document.querySelector(".GridWindow");
            return el ? String(el.innerText || el.textContent || "") : "";
        } catch (e) { return ""; }
    },

    Tick: function () {
        if (typeof document === "undefined") return;
        StatTracker._turn++;
        var mem = null;
        try {
            if (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) mem = ZRamProvider.getMem();
        } catch (e) {}
        StatTracker.observe(mem, StatTracker.statusText());

        // Only the text that arrived since the last look is scanned, so an
        // old banner still sitting in the scrollback is not re-counted.
        try {
            var buf = document.querySelector(".BufferWindow");
            var text = buf ? String(buf.innerText || buf.textContent || "") : "";
            if (text.length > StatTracker._lastBufferLen) {
                var fresh = text.slice(StatTracker._lastBufferLen);
                StatTracker.observeText(fresh, StatTracker._turn);
                StatTracker.consumeProbeReply(fresh);
            }
            StatTracker._lastBufferLen = text.length;
        } catch (e) {}

        StatTracker.Render();
        StatTracker.playCues(StatTracker.takeEvents());
    },

    // ---- sound -----------------------------------------------------------
    // Synthesised, because the app ships no audio at all and a bundled asset
    // would need registering in three separate places (play.html, the service
    // worker precache list and make-dist.bat's allow-list) -- the same trap
    // that let D120's tutorial.html ship missing. An oscillator needs none of
    // them. The context is created lazily so it is born inside a real user
    // gesture wherever possible, which is what autoplay policy requires.
    _ac: null,
    audio: () => {
        try {
            if (StatTracker._ac) {
                if (StatTracker._ac.state === "suspended") StatTracker._ac.resume();
                return StatTracker._ac;
            }
            var Ctor = window.AudioContext || window.webkitAudioContext;
            if (!Ctor) return null;
            StatTracker._ac = new Ctor();
            return StatTracker._ac;
        } catch (e) { return null; }
    },
    soundsEnabled: () => {
        try {
            if (typeof Global !== "undefined" && Global.Prefs && Global.Prefs.StatSounds === false) return false;
        } catch (e) {}
        return true;
    },
    // A short two-note rise for a score gain, a slow fall for a death.
    tone: function (steps) {
        var ac = StatTracker.audio();
        if (!ac) return;
        try {
            var t0 = ac.currentTime;
            steps.forEach(function (s) {
                var osc = ac.createOscillator();
                var gain = ac.createGain();
                osc.type = s.type || "triangle";
                osc.frequency.setValueAtTime(s.from, t0 + s.at);
                if (s.to && s.to !== s.from) {
                    osc.frequency.exponentialRampToValueAtTime(s.to, t0 + s.at + s.dur);
                }
                // Envelope, so it reads as a chime rather than a click.
                gain.gain.setValueAtTime(0.0001, t0 + s.at);
                gain.gain.exponentialRampToValueAtTime(s.vol == null ? 0.16 : s.vol, t0 + s.at + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + s.at + s.dur);
                osc.connect(gain); gain.connect(ac.destination);
                osc.start(t0 + s.at);
                osc.stop(t0 + s.at + s.dur + 0.02);
            });
        } catch (e) {}
    },
    playCues: function (events) {
        if (!events || !events.length) return;
        // Never while the tab is hidden, and never on the calibration read that
        // first establishes a stat's value.
        try { if (document.hidden) return; } catch (e) {}
        if (!StatTracker.soundsEnabled()) return;
        var scored = false, died = false;
        events.forEach(function (e) {
            if (e.type === "score-up") scored = true;
            if (e.type === "death") died = true;
        });
        // A death costs points in many games, so if both fired this turn the
        // death is the one that matters -- the horn would be absurd.
        if (died) StatTracker.tone([{ from: 220, to: 110, at: 0, dur: 0.5, type: "sine", vol: 0.2 }]);
        else if (scored) StatTracker.tone([
            { from: 659.25, to: 659.25, at: 0, dur: 0.12 },
            { from: 880, to: 880, at: 0.1, dur: 0.22 }
        ]);
    },

    // ---- rendering -------------------------------------------------------
    Render: function () {
        if (typeof document === "undefined") return;
        var host = document.getElementById("pl-stats");
        var rows = document.getElementById("pl-stats-rows");
        if (!host || !rows) return;
        var stats = StatTracker.visibleStats();
        var model = StatTracker.model();

        // D153: "no empty furniture" must not hide the only way to ask.
        // Identify stats lives in this block, so hiding the block whenever
        // nothing has been discovered made the button unreachable in exactly
        // the games that need it -- measured on Anchorhead at phone width,
        // where the status grid prints no stats, slot 2 is a constant, and the
        // panel therefore never appeared at all however many points were
        // scored. The block now stays up, showing just the button, until the
        // game has actually been asked and answered.
        // D156 (operator-reported): an empty panel that removes itself entirely
        // reads as a missing feature, not as a tidy one -- "the stats display
        // screen does not have a default UI so nothing displays and there's no
        // placeholders causing it to look like there's no UI system for it."
        // The strip is therefore always present, and says plainly what it is
        // and what it is waiting for.
        if (!stats.length) {
            rows.innerHTML = "";
            host.hidden = false;
            var hint = document.createElement("p");
            hint.className = "pl-stat-hint";
            hint.textContent = model.probed
                ? "This story does not report any character stats."
                : "No stats in this story's status bar yet. Ask it directly — costs one turn.";
            rows.appendChild(hint);
            var b0 = document.getElementById("pl-stats-identify");
            if (b0) b0.hidden = !!model.probed;
            return;
        }
        host.hidden = false;
        rows.innerHTML = "";

        stats.forEach(function (s) {
            var chip = document.createElement("div");
            chip.className = "pl-stat pl-stat-" + s.key.replace(/[^a-z0-9]+/gi, "-");
            chip.setAttribute("data-kind", s.kind || "counter");

            var label = document.createElement("span");
            label.className = "pl-stat-label";
            label.textContent = s.label || s.key;
            chip.appendChild(label);

            var val = document.createElement("span");
            val.className = "pl-stat-value";
            if (s.unit === "ordinal") {
                val.textContent = s.band || "";
            } else if (s.unit === "percent") {
                val.textContent = s.value + "%";
            } else if (s.max != null) {
                val.textContent = s.value + " / " + s.max;
            } else {
                val.textContent = String(s.value);
            }
            chip.appendChild(val);

            // A proportional bar whenever a real maximum is known, and a
            // discrete band for the qualitative DIAGNOSE scales. Never a bar
            // derived from a maximum the game never stated.
            if (s.unit === "ordinal" && s.steps) {
                var band = document.createElement("span");
                band.className = "pl-stat-band";
                for (var i = 0; i < s.steps; i++) {
                    var seg = document.createElement("i");
                    if (i <= s.step) seg.className = "on";
                    band.appendChild(seg);
                }
                chip.appendChild(band);
            } else if (s.max != null && s.max > 0) {
                var bar = document.createElement("span");
                bar.className = "pl-stat-bar";
                var fill = document.createElement("i");
                var pct = Math.max(0, Math.min(100, (s.value / s.max) * 100));
                fill.style.width = pct.toFixed(1) + "%";
                bar.appendChild(fill);
                chip.appendChild(bar);
            } else if (s.unit === "percent") {
                var bar2 = document.createElement("span");
                bar2.className = "pl-stat-bar";
                var fill2 = document.createElement("i");
                fill2.style.width = Math.max(0, Math.min(100, s.value)) + "%";
                bar2.appendChild(fill2);
                chip.appendChild(bar2);
            }

            if (s.key === "score" && model.rank) {
                var rank = document.createElement("span");
                rank.className = "pl-stat-rank";
                rank.textContent = model.rank;
                chip.appendChild(rank);
            }

            // A brief flash on change, paired with the cue.
            if (s.lastChange) {
                chip.classList.add(s.lastChange > 0 ? "pl-stat-up" : "pl-stat-down");
                setTimeout(function () {
                    chip.classList.remove("pl-stat-up", "pl-stat-down");
                }, 1400);
                s.lastChange = null;
            }
            rows.appendChild(chip);
        });

        var btn = document.getElementById("pl-stats-identify");
        if (btn) btn.hidden = !!model.probed;
    },

    // ---- the one opt-in write --------------------------------------------
    // SCORE is the only route to a maximum and a rank, and it costs a turn, so
    // it happens when the player asks and never on its own.
    // D152: both probes are outstanding at once and each reply is matched by
    // its own CONTENT, not by arrival order. A single "which probe is pending"
    // slot lost the score reply every time: the DIAGNOSE submission overwrote
    // the slot before the score reply had been read, so on a phone -- where the
    // status grid is too narrow to print a score at all -- pressing Identify
    // stats produced no score, which is the one case it exists for.
    _probePending: null,
    _probeTurns: 0,
    Identify: function () {
        try {
            var model = StatTracker.model();
            model.probed = true;
            // D166 (operator-reported): asking for stats printed "That's not a
            // verb I recognize" into the story, every time. Submitting a verb
            // the story does not have is the one thing this codebase already
            // knows how to avoid -- D147's isGameWord answers whether a word is
            // in THIS story's dictionary -- so a probe is only ever sent for a
            // verb that exists. Measured: 905 has no SCORE verb at all
            // ("[That verb is not recognized.]") and Anchorhead has no
            // DIAGNOSE, which is exactly where the noise came from.
            var canAsk = function (verb) {
                try {
                    if (typeof Actionable === "undefined" || !Actionable.isGameWord) return true;
                    return Actionable.isGameWord(verb);
                } catch (e) { return true; }
            };
            var askScore = canAsk("score"), askDiagnose = canAsk("diagnose");
            StatTracker._probePending = { score: askScore, diagnose: askDiagnose };
            StatTracker._probeTurns = 0;
            if (!askScore && !askDiagnose) {
                // Nothing to ask: say so rather than spending a turn on a
                // command the parser will reject.
                StatTracker._probePending = null;
                StatTracker.Render();
                return;
            }
            if (askScore && typeof Actionable !== "undefined" && Actionable.Submit) Actionable.Submit("score");
            if (askDiagnose) {
                setTimeout(function () {
                    try {
                        if (typeof Actionable !== "undefined" && Actionable.Submit) Actionable.Submit("diagnose");
                    } catch (e) {}
                }, askScore ? 1800 : 0);
            }
        } catch (e) {}
    },

    // Called by Tick's text scan. Each parser is tried against the new text
    // while its own probe is still outstanding, so the two replies may arrive
    // in either order, together, or a turn apart.
    consumeProbeReply: function (text) {
        var pending = StatTracker._probePending;
        if (!pending) return;
        if (pending.score) {
            var sc = StatTracker.parseScoreReply(text);
            if (sc) { StatTracker.applyScoreReply(text); pending.score = false; }
        }
        if (pending.diagnose) {
            var dg = StatTracker.parseDiagnoseReply(text);
            if (dg) { StatTracker.applyDiagnoseReply(text); pending.diagnose = false; }
        }
        if (!pending.score && !pending.diagnose) { StatTracker._probePending = null; return; }
        // Give up after a few turns rather than misreading ordinary play as a
        // probe reply.
        if (++StatTracker._probeTurns > 6) StatTracker._probePending = null;
    },

    Bind: function () {
        try {
            if (typeof document === "undefined") return;
            var btn = document.getElementById("pl-stats-identify");
            if (btn && !btn._plBound) {
                btn._plBound = true;
                btn.addEventListener("click", function () { StatTracker.Identify(); });
            }
        } catch (e) {}
    }
};

try {
    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () { StatTracker.Bind(); });
    }
} catch (e) {}

try { if (typeof window !== "undefined") window.StatTracker = StatTracker; } catch (e) {}
try { if (typeof module !== "undefined" && module.exports) module.exports = StatTracker; } catch (e) {}
