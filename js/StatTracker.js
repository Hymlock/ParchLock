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
    // D167: the Z-machine allows 240 globals and a story may keep a statistic
    // anywhere in that range. Scanning only the first 64 silently truncated the
    // search space for EVERY stat: measured on Anchorhead, the score lives in
    // globals 15 and 16, but its turn counter is at 4/10 and other games put
    // theirs far higher, so a short scan is a correctness limit rather than an
    // optimisation. 240 u16 reads per sample is negligible next to a turn.
    MAX_GLOBALS: 240,

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
        stamina: "stamina", energy: "stamina", strength: "strength", str: "strength",
        level: "level", lvl: "level",
        hunger: "hunger", food: "hunger", thirst: "thirst", water: "thirst",
        sleep: "sleep", rest: "sleep", time: "time", day: "day",
        money: "money", cash: "money", gold: "gold",
        experience: "experience", exp: "experience", xp: "experience"
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

    // A module that prints experience does so in its own words. This reads
    // only that printing — "with 0 experience points", "EXP: 20", "20 exp",
    // "EXP: 20/50" — and never invents a total the text did not state.
    // "50 points to progress" alone is not experience (points is a score
    // family). When the SAME text also states current experience, that
    // progress clause is the printed next-level requirement (denominator),
    // measured on LLR3 SCORE: "with 0 experience points. You need 50 points
    // to progress to the next level." No RAM global held that 50 uniquely.
    parsePrintedMetrics: (text) => {
        var t = String(text || "");
        if (!t) return null;
        var out = {};
        function take(label, value, maximum) {
            var key = StatTracker.canonKey(label);
            if (key !== "experience") return;
            var n = parseInt(value, 10);
            if (!isFinite(n)) return;
            var rec = { key: key, label: "EXP", value: n, max: null, unit: "plain", boundSemantics: "unknown" };
            if (maximum != null && maximum !== "") {
                var mx = parseInt(maximum, 10);
                if (isFinite(mx)) { rec.max = mx; rec.unit = "fraction"; rec.boundSemantics = "next-target"; }
            }
            // A later match may add a denominator the earlier one lacked.
            if (out[key] && out[key].max != null && rec.max == null) {
                rec.max = out[key].max;
                rec.unit = "fraction";
            }
            out[key] = rec;
        }
        var reLabelMax = /(experience|xp|exp)\s*[:=]\s*(-?\d+)\s*\/\s*(\d+)/ig;
        var m;
        while ((m = reLabelMax.exec(t))) take(m[1], m[2], m[3]);
        var reLabel = /(experience|xp|exp)\s*[:=]\s*(-?\d+)(?!\s*\/)/ig;
        while ((m = reLabel.exec(t))) take(m[1], m[2], null);
        var reWords = /(-?\d+)\s+experience\s+points?\b/ig;
        while ((m = reWords.exec(t))) take("experience", m[1], null);
        var reAbbrMax = /(?:^|[^A-Za-z0-9])(-?\d+)\s*\/\s*(\d+)\s+(xp|exp)\b/ig;
        while ((m = reAbbrMax.exec(t))) take(m[3], m[1], m[2]);
        var reAbbr = /(?:^|[^A-Za-z0-9])(-?\d+)\s+(xp|exp)\b/ig;
        while ((m = reAbbr.exec(t))) take(m[2], m[1], null);
        // Next-level requirement, only when experience was already printed in
        // this same text. Never promotes a bare "points to progress" line.
        if (out.experience && out.experience.max == null) {
            var need = /need\s+(\d+)\s+(more\s+)?points?\s+to\s+progress(?:\s+to\s+the\s+next\s+level)?/i.exec(t)
                || /(\d+)\s+(more\s+)?points?\s+to\s+progress(?:\s+to\s+the\s+next\s+level)?/i.exec(t);
            if (need) {
                var req = parseInt(need[1], 10);
                if (isFinite(req)) {
                    // "need 30 more" is a remaining amount, not the next
                    // threshold. At EXP 20 the displayed denominator is 50.
                    out.experience.max = need[2] ? out.experience.value + req : req;
                    out.experience.unit = "fraction";
                    out.experience.boundSemantics = "next-target";
                }
            }
        }
        return Object.keys(out).length ? out : null;
    },

    scoreMetricKey: function (model) {
        return model && model.scoreMetricKey === "experience" ? "experience" : "score";
    },

    recordPrintedMetrics: function (model, text, command) {
        var printed = StatTracker.parsePrintedMetrics(text);
        if (!printed || !model) return false;
        // A SCORE response that explicitly names experience proves how this
        // module classifies its own score notifications. Persist the semantic
        // relationship, not a title/serial exception. From this point the
        // existing delta/global learner updates EXP rather than a duplicate
        // Score row. Ordinary prose mentioning experience proves no such link.
        if (printed.experience && /^score\s*$/i.test(String(command || "").trim())) {
            model.scoreMetricKey = "experience";
            model.scorePinKnown = printed.experience.value;
            if (model.globals.score != null) {
                model.globals.experience = model.globals.score;
                delete model.globals.score;
            }
            if (model.stats.score && /^global:/.test(String(model.stats.score.source || ""))) {
                delete model.stats.score;
            }
        }
        var wrote = false;
        Object.keys(printed).forEach(function (k) {
            var rec = printed[k];
            var prev = model.stats[k];
            var unit = rec.unit || (rec.max != null ? "fraction" : "plain");
            var kind = unit === "fraction" ? "gauge" : "counter";
            if (!prev) {
                model.stats[k] = {
                    key: k, label: rec.label, value: rec.value,
                    max: rec.max != null ? rec.max : null,
                    unit: unit, kind: kind, boundSemantics: rec.boundSemantics || "unknown",
                    seen: StatTracker.CONFIRM_SAMPLES, source: "printed",
                    confirmed: true, lastChange: null
                };
                wrote = true;
                return;
            }
            var had = prev.confirmed === true;
            prev.label = rec.label || prev.label;
            prev.seen = Math.max(prev.seen || 0, StatTracker.CONFIRM_SAMPLES);
            prev.confirmed = true;
            prev.boundSemantics = rec.boundSemantics || prev.boundSemantics || "unknown";
            if (prev.source !== "status" && prev.source !== "global") prev.source = prev.source || "printed";
            // Denominator is re-read when the story states it again (same rule
            // as n/m gauges elsewhere): never invent, never latch forever.
            if (rec.max != null) {
                prev.max = rec.max;
                prev.unit = "fraction";
                prev.kind = "gauge";
            } else if (prev.boundSemantics === "next-target" && prev.max != null && rec.value >= prev.max) {
                prev.max = null;
                prev.unit = "plain";
                prev.kind = "counter";
            }
            if (rec.value !== prev.value) {
                var delta = rec.value - prev.value;
                prev.value = rec.value;
                if (had) StatTracker.emitChange(model, k, delta);
            }
            wrote = true;
        });
        return wrote;
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

    // ---- score-change notifications --------------------------------------
    // D167: the operator's requirement is that the score be readable HEADLESSLY
    // -- straight out of RAM, without asking the game or spending a turn. The
    // obstacle was never reading a global; it was working out WHICH global,
    // because promoteGlobals can only identify a slot once it has seen the
    // value change, and on a phone there is no status text to see it change in
    // (D137) and a one-off SCORE reply supplies no change either.
    //
    // Both libraries volunteer the missing piece unprompted. Inform prints
    // "Your score has just gone up by two points." and ZIL the same in square
    // brackets -- no command, no turn, just narration the game was printing
    // anyway. A known DELTA is exactly what identifies the slot: the score
    // global is the one whose value moved by precisely that much.
    //
    // So this is a bootstrap, not a text-based score. One notification pins the
    // slot; from then on readConfirmedGlobals reads the number out of RAM every
    // turn with no text involved at all, which is also what makes the cue fire
    // on the exact turn the score moves.
    NUMBER_WORDS: {
        a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
        eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
        fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
        nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50
    },
    SCORE_DELTA: /score\s+(?:has\s+)?just\s+gone\s+(up|down)\s+by\s+([a-z][a-z -]*?|\d+)\s+points?\b/ig,

    parseCardinal: function (raw) {
        raw = String(raw || "").toLowerCase().trim();
        if (/^\d+$/.test(raw)) return parseInt(raw, 10);
        var small = Object.assign({}, StatTracker.NUMBER_WORDS, {
            sixty: 60, seventy: 70, eighty: 80, ninety: 90
        });
        var total = 0, group = 0, used = false, invalid = false;
        raw.replace(/-/g, " ").split(/\s+/).forEach(function (word) {
            if (!word || word === "and") return;
            if (small[word] != null) { group += small[word]; used = true; return; }
            if (word === "hundred" && group) { group *= 100; used = true; return; }
            if (word === "thousand" && group) { total += group * 1000; group = 0; used = true; return; }
            invalid = true;
        });
        return used && !invalid ? total + group : null;
    },

    parseScoreDeltas: function (text) {
        var out = [], re = new RegExp(StatTracker.SCORE_DELTA.source, "ig"), m;
        while ((m = re.exec(String(text || "")))) {
            var n = StatTracker.parseCardinal(m[2]);
            if (!(n > 0)) continue;
            out.push({ value: /down/i.test(m[1]) ? -n : n, text: m[0] });
        }
        return out;
    },

    parseScoreDelta: (text) => {
        var all = StatTracker.parseScoreDeltas(text);
        if (!all.length) { StatTracker._pendingDeltaText = null; return null; }
        // D175: the matched notification itself is part of the replay key.
        StatTracker._pendingDeltaText = all.map(function (d) { return d.text; }).join(" | ");
        return all.reduce(function (sum, d) { return sum + d.value; }, 0);
    },

    // D173: count an announced change against the total the game itself last
    // confirmed. Every guard here answers a specific hazard raised in review.
    applyScoreDeltaToDisplay: function (model, delta, scoreBefore) {
        if (!delta) return;
        var metricKey = StatTracker.scoreMetricKey(model);
        var s = model.stats[metricKey];
        if (!s) return;

        // No baseline, no arithmetic. A delta with nothing to add it to gives a
        // RELATIVE figure, and presenting that as the score would be inventing
        // a total. Most games start at 0, but "most games" is not evidence
        // (D24) -- so the row simply does not move until the game has stated an
        // absolute, via SCORE, the status row, or a pinned global.
        if (scoreBefore === null) return;

        // The status row moves the score by itself (Zork 1 has a real Score
        // column and recordObservation already emits from it), so adding the
        // delta as well would count the same points twice.
        if (s.source === "status") return;

        // Already moved this tick -- by a pinned global reading RAM, or by a
        // status sample. RAM is ground truth; do not add on top of it. This is
        // the post-pin double-count: once the slot is known, `source` becomes
        // "global:N" rather than "status", so a source test alone misses it.
        if (s.value !== scoreBefore) return;

        // Replay guard. `fresh` comes from a buffer-length watermark, not a
        // seen-set, and SCORE_DELTA is `.exec` without /g -- so a restore or a
        // transcript reprint can re-present an OLD notification as if it were
        // new, and would re-apply it. Keyed by turn and amount rather than by
        // buffer position, which is what actually changes under a redraw.
        // D175: the first version of this keyed on `StatTracker._turn`, which
        // is a TICK counter -- D153 measured observe() running about forty
        // times per game turn -- so a replayed notification on a later tick got
        // a different stamp and was counted again. The harness passed because
        // it holds _turn still, which made it a false green; the grok seat
        // caught it by reading rather than by trusting the test.
        //
        // The GAME's own turn counter is the right key: after a restore the
        // game returns to an earlier turn, so a replayed notification produces
        // the same id it produced the first time and is correctly ignored.
        // Keyed on the notification text too, mirroring how observeText dedupes
        // death and win banners, so two different events in one turn are not
        // collapsed into one.
        var gameTurn = (model.stats.turns && typeof model.stats.turns.value === "number")
            ? model.stats.turns.value : ("t" + StatTracker._turn);
        var stamp = gameTurn + ":" + delta + ":" + String(StatTracker._pendingDeltaText || "").slice(0, 60);
        model.seenDeltas = model.seenDeltas || {};
        if (model.seenDeltas[stamp]) return;
        model.seenDeltas[stamp] = 1;

        var next = scoreBefore + delta;
        if (typeof s.max === "number" && s.max > 0 && (next < 0 || next > s.max)) return;

        s.value = next;
        s.confirmed = true;
        s.lastChange = delta;
        // The cue and the badge are driven from here, which is why this one
        // write restores all three reported symptoms at once.
        StatTracker.emitChange(model, metricKey, delta);
    },

    // Identify the score's global from a known change. Candidates are narrowed
    // across successive notifications rather than guessed at from one, so a
    // coincidence has to survive every scoring event to stay in the running.
    pinScoreByDelta: function (model, delta, globals) {
        try {
            if (!delta || !globals || !globals.length) return;
            var samples = StatTracker._samples.filter(function (x) { return x.globals && x.globals.length; });
            var prev = samples.length ? samples[samples.length - 1].globals : null;
            if (!prev || prev.length !== globals.length) return;
            // A known absolute value is a second, independent constraint and it
            // is usually enough to settle the slot outright: the score global
            // must both have MOVED by the announced delta and now HOLD the
            // resulting total. One notification narrowed 64 globals to three on
            // Anchorhead; adding this pins it in one step whenever the total is
            // already known from any source.
            // D175: this MUST be an absolute the game itself stated, never the
            // displayed value. D173 counts an announced change onto the HUD and
            // marks it confirmed, so reading stats.score here would make the
            // NEXT notification narrow against a delta-derived running total.
            // The grok seat traced the poison path: if the HUD has drifted at
            // all -- an undo, a missed notification, a double apply -- then
            // `known + delta` is a number RAM never holds, every candidate is
            // rejected, and the slot never pins. Headless reading would then
            // never start, which is the very mechanism D173 exists to
            // bootstrap. `scorePinKnown` is written only from a SCORE reply,
            // the status row or a pinned global.
            var known = (typeof model.scorePinKnown === "number") ? model.scorePinKnown : null;
            // D176: the hold-total filter is only valid while the baseline is
            // CURRENT. D175 fixed a baseline that ran too high by freezing it
            // at the last absolute -- and thereby created the opposite fault,
            // traced by the grok seat: after SCORE 0 and a counted +2, the
            // baseline is still 0, so a following +5 demands a global holding
            // 5 while RAM holds 7. Every candidate is rejected and the slot
            // never pins; and because RAM can only refresh the baseline once
            // pinned, that is a catch-22 with no way out.
            //
            // The display having moved past the last stated absolute is exactly
            // the signal that the baseline is stale. When it has, only the
            // MOVEMENT filter is applied -- which needs no baseline and is the
            // original D167 evidence -- rather than a total that is known to be
            // out of date. Nothing is loosened while the baseline is current.
            var metricKey = StatTracker.scoreMetricKey(model);
            var metric = model.stats[metricKey];
            var baselineCurrent = known === null
                || !(metric && typeof metric.value === "number")
                || metric.value === known;

            var hits = [];
            for (var i = 0; i < globals.length; i++) {
                if (globals[i] - prev[i] !== delta) continue;
                if (known !== null && baselineCurrent && globals[i] !== known + delta) continue;
                hits.push(i);
            }
            if (!hits.length) return;
            var prior = model.scoreCandidates;
            if (prior && prior.length) {
                var keep = hits.filter(function (i) { return prior.indexOf(i) >= 0; });
                // An empty intersection means the earlier guess was wrong, not
                // that this one is: start again from what was just observed.
                hits = keep.length ? keep : hits;
            }
            model.scoreCandidates = hits;
            model.scoreDeltaEvents = (model.scoreDeltaEvents || 0) + 1;
            if (hits.length > 1) {
                // One announced change never settles a tie -- a coincidence
                // must not become the score. Only once a second change has
                // narrowed the field is a remaining tie treated as real.
                if (model.scoreDeltaEvents < 2) return;
                // Several slots can legitimately follow the score at once --
                // Inform keeps a shadow copy for its own change detection, and
                // measured on Anchorhead globals 15 and 16 both move with it.
                // When every surviving candidate holds the SAME value they are
                // interchangeable for display, so there is nothing left to
                // disambiguate; take the lowest and let a later contradiction
                // demote it. Candidates that disagree are still ambiguous and
                // wait for the next announced change.
                var v0 = globals[hits[0]];
                for (var k = 1; k < hits.length; k++) {
                    if (globals[hits[k]] !== v0) return;
                }
            }
            var idx = hits[0];
            if (metricKey === "score" && model.scoreUnavailable) return;
            model.globals[metricKey] = idx;
            var sc = model.stats[metricKey];
            if (!sc) {
                sc = model.stats[metricKey] = { key: metricKey, label: metricKey === "experience" ? "EXP" : "Score", unit: "plain",
                                           kind: metricKey === "experience" ? "counter" : "score", seen: StatTracker.CONFIRM_SAMPLES,
                                           max: null, confirmed: true, value: globals[idx],
                                           lastChange: null };
            }
            sc.source = "global:" + idx;
            sc.confirmed = true;
            if (sc.value !== globals[idx]) {
                sc.lastChange = globals[idx] - sc.value;
                sc.value = globals[idx];
            }
        } catch (e) {}
    },

    // Some RPG-style stories call experience "score" in the standard Inform
    // notification. The popup alone cannot prove that semantic. A first-hit
    // classification is allowed only when four independent facts agree:
    // game-authored LVL and STR fields, the story dictionary's EXPERIENCE
    // word, a positive announced delta, and every surviving RAM candidate
    // moving from zero to exactly that total. Shadow globals may remain tied;
    // their shared value is still deterministic even though their address is
    // not. A later SCORE response remains the stronger corroboration path.
    classifyExperienceScoreEvent: function (model, observed, delta, globals) {
        try {
            if (!model || model.scoreMetricKey || !(delta > 0)) return false;
            if (!observed || !observed.level || !observed.strength) return false;
            if (typeof Actionable === "undefined" || !Actionable.isGameWord
                || !Actionable.isGameWord("experience")) return false;
            var candidates = model.scoreCandidates || [];
            if (!candidates.length || !globals || !globals.length) return false;
            var samples = StatTracker._samples.filter(function (x) { return x.globals && x.globals.length; });
            var prev = samples.length ? samples[samples.length - 1].globals : null;
            if (!prev || prev.length !== globals.length) return false;
            for (var i = 0; i < candidates.length; i++) {
                var idx = candidates[i];
                if (prev[idx] !== 0 || globals[idx] !== delta) return false;
            }
            model.scoreMetricKey = "experience";
            model.scorePinKnown = delta;
            if (model.globals.score != null) {
                model.globals.experience = model.globals.score;
                delete model.globals.score;
            }
            delete model.stats.score;
            model.stats.experience = {
                key: "experience", label: "EXP", value: delta, max: null,
                unit: "plain", kind: "counter", seen: StatTracker.CONFIRM_SAMPLES,
                source: model.globals.experience != null
                    ? "global:" + model.globals.experience : "score-notification+ram",
                confirmed: true, lastChange: delta
            };
            return true;
        } catch (e) { return false; }
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
        if (/\b(died|dead|death|killed|slain|fatal|eaten|devoured|lost your life|game over)\b/.test(t)) return "death";
        return "candidate";
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
        properties: {},     // key -> confirmed player property number
        carry: {},          // field -> learned individual-property pin
        evidence: [],       // bounded D204 provenance ledger
        conditions: {},
        itemMetrics: {},
        deaths: 0,
        wins: 0,
        scoreUnavailable: false,
        scoreMetricKey: null,
        rank: null,
        probed: false,
        seenBanners: {}
    }),

    _storyEpoch: 0,
    recordEvidence: function (fact) {
        var model = StatTracker.model();
        if (!model.evidence) model.evidence = [];
        var rec = Object.assign({
            storyEpoch: StatTracker._storyEpoch,
            submissionId: null,
            valueShape: "scalar",
            boundSemantics: "unknown",
            confidence: "authoritative",
            contradictions: 0
        }, fact || {});
        model.evidence.push(rec);
        if (model.evidence.length > 160) model.evidence.splice(0, model.evidence.length - 160);
        return rec;
    },

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

            // D178 (operator: "the score system for Wumpus is persisting
            // across separate starts of the module").
            //
            // What is worth persisting is what was LEARNED about the story --
            // which global holds the score, which individual property holds an
            // item's value -- because those are facts about the compiled file
            // and are true for every play of it. What must NOT persist is a
            // READING, because it belongs to a game that is over.
            //
            // Measured on wump2ka: finishing a session carrying the Transmat
            // Popper and starting a fresh one showed VALUE $685 and CARRIED
            // 5 lbs before the player had picked anything up, while they were
            // actually holding only the Glow Bar (35 / 4 lbs). The figures were
            // the previous game's, presented as this game's.
            //
            // Every reading is therefore unconfirmed on load. `visibleStats`
            // shows only confirmed stats, so a row stays absent until it has
            // been re-derived this session -- from the status row, from RAM
            // through a pinned slot, or from the game's own text. That is D24's
            // honest absence rather than a stale number worn as a current one.
            // The pins in `model.globals` and `model.carry` survive untouched,
            // so re-derivation is immediate rather than starting from scratch.
            StatTracker.forgetReadings(m);
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
    // D180: drop every READING while keeping everything LEARNED. Shared by the
    // load path (D178/D179) and by a mid-session resync, so the two can never
    // drift apart.
    //
    // `model.globals` and `model.carry` are untouched: which global holds the
    // score and which individual property holds an item's value are facts about
    // the compiled file, true for every play of it, so re-derivation is
    // immediate rather than starting again from nothing.
    forgetReadings: function (m, resetPlaythrough) {
        if (!m) return m;
        Object.keys(m.conditions || {}).forEach(function (key) { m.conditions[key].state = "unknown"; });
        Object.keys(m.itemMetrics || {}).forEach(function (key) {
            Object.keys(m.itemMetrics[key]).forEach(function (field) {
                var rec = m.itemMetrics[key][field];
                rec.current = false;
                rec.lastValue = null;
                rec.transitions = 0;
                if (rec.prop == null) rec.candidates = null;
            });
        });
        Object.keys(m.stats || {}).forEach(function (k) {
            var s = m.stats[k];
            if (!s) return;
            s.confirmed = false;
            s.lastChange = null;
            s.badgeUntil = 0;
            s.badgeDelta = 0;
        });
        delete m.scorePinKnown;
        delete m.lastDeltaStamp;
        delete m.scoreCandidates;
        delete m.scoreDeltaEvents;
        Object.keys(m.carry || {}).forEach(function (key) {
            var pin = m.carry[key];
            if (!pin || pin.prop == null || !Array.isArray(pin.candidates) ||
                pin.candidates.length !== 1 || pin.candidates[0] !== pin.prop) {
                delete m.carry[key];
            } else {
                delete pin.lastEvidence;
            }
        });
        m.seenDeltas = {};
        if (resetPlaythrough !== false) {
            m.seenBanners = {};
            m.deaths = 0;
            m.wins = 0;
        }
        m.probed = false;
        return m;
    },

    // D180: undo, restore and restart all land in UndoRestoreSync.resync, which
    // already re-syncs the map, the topology and the actionable scope. The
    // stats were the one subsystem it never told, so a restored game kept the
    // abandoned timeline's score and carried totals on screen until something
    // happened to overwrite them. Raised by the grok seat's audit of D178.
    Resync: function (reason) {
        try {
            StatTracker.forgetReadings(StatTracker.model(), reason === "restart" || reason === "new-game");
            StatTracker._samples = [];
            StatTracker._probePending = null;
            StatTracker._probeTurns = 0;
            StatTracker._probeQueue = [];
            StatTracker._probeActive = null;
            clearTimeout(StatTracker._probeTimer);
            StatTracker._probeTimer = null;
            StatTracker.endProbeOwnership();
            StatTracker._events = [];
            StatTracker._pendingDelta = null;
            StatTracker._pendingDeltaText = null;
            clearTimeout(StatTracker._diagnoseTimer);
            StatTracker._diagnoseTimer = null;
            // D191: the carry probe is session state too -- a queued Submit
            // belongs to the game that queued it, and a "useless" verdict
            // belongs to the story that earned it.
            StatTracker.clearCarryProbe();
            StatTracker.primeOutputCursor();
            if (StatTracker._key) StatTracker.save(StatTracker._key, StatTracker.model());
        } catch (e) {}
    },

    reset: () => {
        clearTimeout(StatTracker._diagnoseTimer);
        StatTracker._diagnoseTimer = null;
        StatTracker._pendingDelta = null;
        StatTracker._pendingDeltaText = null;
        StatTracker._lineCursor = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        StatTracker._lineIds = typeof WeakMap !== "undefined" ? new WeakMap() : null;
        StatTracker._nextLineId = 1;
        StatTracker._samples = [];
        StatTracker._events = [];
        StatTracker._model = StatTracker.blank();
        StatTracker._key = null;
        StatTracker._v3 = null;
        StatTracker._probePending = null;
        StatTracker._probeTurns = 0;
        StatTracker._probeQueue = [];
        StatTracker._probeActive = null;
        clearTimeout(StatTracker._probeTimer);
        StatTracker._probeTimer = null;
        StatTracker.endProbeOwnership();
        StatTracker._lastSubmission = null;
        StatTracker.clearCarryProbe();          // D191
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

    readPlayerProperties: function (mem) {
        var out = {};
        try {
            var payload = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
            var playerId = payload && payload.playerId;
            if (!mem || playerId == null || typeof ZRamReader === "undefined") return out;
            (ZRamReader.listProps(mem, playerId) || []).forEach(function (prop) {
                if (!prop || prop.num == null || prop.sz > 2) return;
                var value = ZRamReader.readProp(mem, playerId, prop.num);
                if (typeof value === "number" && isFinite(value)) out[prop.num] = value;
            });
        } catch (e) {}
        return out;
    },

    promotePlayerProperties: function (model) {
        var samples = StatTracker._samples.filter(function (s) { return s.playerProps; });
        if (samples.length < StatTracker.CONFIRM_SAMPLES) return;
        Object.keys(model.stats).forEach(function (key) {
            if (model.properties[key] != null || model.globals[key] != null) return;
            var withStat = samples.filter(function (s) { return s.observed[key]; });
            if (withStat.length < StatTracker.CONFIRM_SAMPLES) return;
            var values = withStat.map(function (s) { return s.observed[key].value; });
            if (new Set(values).size < 2) return;
            var candidates = Object.keys(withStat[0].playerProps || {}).filter(function (prop) {
                return withStat.every(function (sample) { return sample.playerProps[prop] === sample.observed[key].value; });
            });
            if (candidates.length === 1) {
                model.properties[key] = parseInt(candidates[0], 10);
                model.stats[key].source = "player-prop:" + candidates[0];
            }
        });
    },

    readConfirmedProperties: function (model, properties) {
        Object.keys(model.properties || {}).forEach(function (key) {
            var prop = model.properties[key], stat = model.stats[key], value = properties[prop];
            if (!stat || typeof value !== "number") return;
            if (stat.source === "status" && stat.value !== value) { delete model.properties[key]; return; }
            if (stat.value !== value) {
                var delta = value - stat.value;
                stat.value = value;
                if (stat.confirmed) { stat.lastChange = delta; StatTracker.emitChange(model, key, delta); }
            }
            stat.confirmed = true;
            stat.source = "player-prop:" + prop;
        });
    },

    // ---- the per-turn observation ----------------------------------------
    // `statusRaw` is the status window's text; `mem` may be null (no RAM, or a
    // provider that cannot supply it), in which case only the text path runs.
    observe: function (mem, statusRaw) {
        var facts = StatTracker.headerFacts(mem);
        var key = null;
        try { key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : null; } catch (e) {}
        key = key || "unknown";
        var story = "";
        try { story = (typeof ParchLock !== "undefined" && ParchLock.GameFilename) || ""; } catch (eStory) {}
        if (StatTracker._key !== key || StatTracker._storyFile !== story) {
            StatTracker._key = key;
            StatTracker._storyFile = story;
            StatTracker._samples = [];
            StatTracker._model = StatTracker.load(key);
            StatTracker._storyEpoch++;
            StatTracker._probeDisclosureEpoch = -1;
        }
        var model = StatTracker.model();
        if (facts.clockGame) model.scoreUnavailable = true;

        var observed = StatTracker.statsFromColumns(StatTracker.splitColumns(statusRaw));
        var globals = mem ? StatTracker.readGlobals(mem) : [];
        var playerProps = mem ? StatTracker.readPlayerProperties(mem) : {};

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
        // D167: a score notification arrived this turn -- use it to identify the
        // score's global while the previous sample is still the newest one.
        // D173: capture the score BEFORE anything this tick can move it. This
        // is the value pinScoreByDelta must treat as `known` -- the total the
        // game held before the notification -- and it is also what tells us,
        // further down, whether the number has already been moved by RAM.
        var scoreMetricKey = StatTracker.scoreMetricKey(model);
        var scoreMetric = model.stats[scoreMetricKey];
        var scoreBefore = (scoreMetric && scoreMetric.confirmed
            && typeof scoreMetric.value === "number") ? scoreMetric.value : null;

        if (StatTracker._pendingDelta) {
            StatTracker.pinScoreByDelta(model, StatTracker._pendingDelta, globals);
            StatTracker.classifyExperienceScoreEvent(model, observed, StatTracker._pendingDelta, globals);
        }

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
            if (same) {
                var ppk = Object.keys(prev.playerProps || {}), cpk = Object.keys(playerProps || {});
                if (ppk.length !== cpk.length) same = false;
                else for (var pi = 0; pi < cpk.length; pi++) {
                    if (prev.playerProps[cpk[pi]] !== playerProps[cpk[pi]]) { same = false; break; }
                }
            }
        }
        if (!same) {
            StatTracker._samples.push({ observed: observed, globals: globals, playerProps: playerProps });
            if (StatTracker._samples.length > StatTracker.MAX_SAMPLES) StatTracker._samples.shift();
        }

        Object.keys(observed).forEach(function (k) {
            StatTracker.recordObservation(model, k, observed[k]);
        });
        StatTracker.observeConditions(statusRaw, { source: "status-grid", locator: "status-grid", authoritative: true });
        StatTracker.seedInterpreterStatus(model, facts, globals);
        StatTracker.promoteTurnCounter(model);
        StatTracker.promoteGlobals(model);
        StatTracker.promotePlayerProperties(model);
        StatTracker.readConfirmedGlobals(model, globals);
        StatTracker.readConfirmedProperties(model, playerProps);

        // D173 (operator: "the system just simply will not register it").
        //
        // The game announced "Your score has just gone up by two points." and
        // the HUD stayed at 0, with no tone and no badge. D167 used that
        // notification ONLY to identify which global holds the score, and on
        // Anchorhead one event cannot identify it -- globals 15 and 16 both
        // shadow the score, so no unique candidate emerges and pinScoreByDelta
        // deliberately refuses to tie-break from a single event. Nothing then
        // wrote stats.score, and because the cue and the badge both hang off
        // emitChange, all three symptoms followed from that one freeze.
        //
        // Counting an announced change is a DIFFERENT job from identifying the
        // slot, and D167 only did the second. The game stated its previous
        // total (its own SCORE reply) and then stated the change; adding them
        // is arithmetic on the game's own words, not a guess.
        //
        // Ordering is the whole safety argument, and comes from the grok seat's
        // review: this runs AFTER pinScoreByDelta and AFTER
        // readConfirmedGlobals, and `scoreBefore` was captured before either.
        // So the pin still narrows against the absolute the game last confirmed
        // and never against a delta-applied running total -- which would make
        // it require globals to hold `total + delta`, a value RAM never holds,
        // and the slot would then never pin at all.
        if (StatTracker._pendingDelta) {
            StatTracker.applyScoreDeltaToDisplay(model, StatTracker._pendingDelta, scoreBefore);
        }

        // D169: once a carried-total slot is pinned it is read every turn,
        // with no command and no text -- so the figure moves the moment the
        // player picks something up or drops it.
        StatTracker.readCarryFromRam(model, mem);
        StatTracker.save(key, model);
        return model;
    },

    // A stat needs CONFIRM_SAMPLES sightings before it is shown at all.
    recordObservation: function (model, k, rec) {
        // D175: the status row prints an absolute, so it is a valid pin
        // baseline -- unlike the running total D173 maintains for display.
        if (k === "score" && typeof rec.value === "number") model.scorePinKnown = rec.value;
        var prev = model.stats[k];
        if (!prev) {
            model.stats[k] = {
                key: k, label: rec.label, value: rec.value, max: rec.max,
                unit: rec.unit, kind: StatTracker.kindFor(k, rec),
                seen: 1, source: "status", confirmed: false, lastChange: null
            };
            return;
        }
        // D181: whether this stat had a previous reading must be judged BEFORE
        // this sighting confirms it, or the first observation after a resync
        // looks like a change and renders a badge for a move the player never
        // made (measured: a "-650" on a restore).
        var hadReading = prev.confirmed === true;
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
            prev.value = rec.value;
            if (hadReading) {
                prev.lastChange = delta;
                StatTracker.emitChange(model, k, delta);
            }
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
    // D181: a stat that is not confirmed has no previous reading to differ
    // from, so its first value this session is an OBSERVATION, not a change.
    // Without this, the re-derivation that follows a restore computes a delta
    // against the abandoned timeline's number -- the grok seat measured 685 to
    // 35 -- and the score-up tone fires as though the player had just scored.
    // Ordering the resync before the tick is necessary but not sufficient,
    // because forgetReadings clears `confirmed` and deliberately keeps `value`
    // so a figure that cannot be re-derived is not silently zeroed.
    firstReadingAfterForget: function (model, k) {
        var s = model && model.stats && model.stats[k];
        return !!(s && s.confirmed === false);
    },

    emitChange: function (model, k, delta) {
        if (StatTracker.firstReadingAfterForget(model, k)) return;
        var scoreFamily = k === "score" || (k === "experience" && model.scoreMetricKey === "experience");
        if (scoreFamily && delta > 0) {
            StatTracker._events.push({ type: "score-up", key: k, delta: delta });
        } else if (scoreFamily) {
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
                if (stat.confirmed === true) {
                    stat.lastChange = delta;
                    StatTracker.emitChange(model, k, delta);
                }
            }
            stat.confirmed = true;
            if (k === "score") model.scorePinKnown = v;
        });
    },

    // ---- deaths ----------------------------------------------------------
    // Guarded against double counting: the same banner text can be re-rendered
    // when the buffer redraws, and that is not a second death.
    // ---- D169 carried value and weight -----------------------------------
    //
    // Operator: in wump2ka the value you leave the cave with is part of your
    // final score, so it has to be tracked, and it has to update as you swap
    // items rather than only when you ask.
    //
    // The game states all three numbers itself, unprompted, at the end of any
    // inventory:
    //
    //   "You are carrying 11 lbs of stuff (26% of your current capacity).
    //    It's all worth about $693."
    //
    // That text is the BOOTSTRAP, not the mechanism -- it only appears when an
    // inventory runs. The mechanism is the same one D167 uses for score: a
    // known total identifies which slot in RAM holds it, and after that the
    // number is read straight out of memory every turn with no command.
    //
    // Measured on wump2ka: per-item value lives in INDIVIDUAL property 98 and
    // weight in 100 (Inform's `private`-style table, reachable through
    // ZRamReader.parseIndivTable on common property 3). The plain properties
    // are all routine/string addresses -- this game computes almost everything
    // -- so a naive common-property scan finds nothing, which is why the
    // individual table is where this looks.
    //
    //   Transmat Popper 650, canteen 8, scribbled note 0, Glow Bar 35 = 693,
    //   drop the Popper -> 43, Glow Bar alone -> 35.
    //
    // Exact against the game's own text in all three states. The property
    // NUMBERS are still never hardcoded: they are whichever individual
    // property sums to the total the game printed, confirmed twice.
    CARRY: {
        // "carrying 11 lbs of stuff", "carrying 4 lbs"
        weight: /carrying\s+(\d+)\s*(lbs?|pounds?|kg|kilos?)\b/i,
        // "(26% of your current capacity)"
        capacity: /\((\d+)\s*%\s*of\s+your\s+current\s+capacity\)/i,
        // "It's all worth about $693.", "worth 693 gold"
        value: /all worth\s+(?:about\s+)?([$£€])?\s*(\d+)/i
    },
    // A plain per-item quantity is small. A property holding a routine or a
    // string returns its ADDRESS, which is many thousands -- the canteen's
    // weight is computed that way, because what it weighs depends on how much
    // water is in it. A candidate value above this is not a quantity.
    MAX_ITEM_QUANTITY: 5000,
    CARRY_CONFIRM: 2,

    // Every object the player is holding, including one level of container
    // nesting, straight from RAM. Mirrors how ZRamProvider roots the
    // inventory so the two cannot disagree about who the player is.
    carriedIds: function (mem) {
        var ids = [];
        try {
            var p = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) || null;
            var root = null;
            try {
                root = ZRamProvider.resolveInventoryRootId(
                    mem, p && p.playerId, null, p && p.roomId);
            } catch (e) {}
            // The payload's own inventory tree is the fallback: on the first
            // inventory of a session the player object is sometimes not
            // resolved yet, and returning nothing there costs the bootstrap a
            // whole observation.
            if (root == null) {
                var flat = function (list) {
                    (list || []).forEach(function (it) {
                        if (it && it.id != null) ids.push(it.id);
                        if (it && it.contents) flat(it.contents);
                    });
                };
                flat(p && p.inventory);
                return ids;
            }
            (ZRamReader.children(mem, root) || []).forEach(function (c) {
                var cid = (c && c.id != null) ? c.id : c;
                if (cid == null) return;
                ids.push(cid);
                (ZRamReader.children(mem, cid) || []).forEach(function (g) {
                    var gid = (g && g.id != null) ? g.id : g;
                    if (gid != null) ids.push(gid);
                });
            });
        } catch (e) {}
        return ids;
    },

    // Sum one individual property across the carried set. Returns null when
    // any holder reports an implausible quantity, because a computed slot
    // makes the total meaningless rather than merely wrong.
    sumIndiv: function (mem, ids, prop) {
        var total = 0, seen = 0;
        for (var i = 0; i < ids.length; i++) {
            var t = null;
            try { t = ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, ids[i], 3)); } catch (e) {}
            if (!t || !Object.prototype.hasOwnProperty.call(t, prop)) continue;
            var v = t[prop];
            if (typeof v !== "number") continue;
            if (v > StatTracker.MAX_ITEM_QUANTITY) return null;   // computed, not stored
            total += v;
            seen++;
        }
        return seen ? total : null;
    },

    // Narrow the candidate property for one carried total against a known
    // figure the game just printed. Same discipline as pinScoreByDelta: one
    // agreement narrows, CARRY_CONFIRM agreements pin, a contradiction tears
    // the pin down rather than letting a stale slot keep reporting.
    pinCarryProp: function (model, mem, field, known) {
        if (typeof known !== "number") return;
        var ids = StatTracker.carriedIds(mem);
        if (!ids.length) return;
        var carry = model.carry || (model.carry = {});
        var st = carry[field] || (carry[field] = { prop: null, hits: 0, candidates: null });

        if (st.prop != null) {
            var live = StatTracker.sumIndiv(mem, ids, st.prop);
            // A null sum means an item computes this slot this turn -- not a
            // contradiction, just nothing to check against.
            if (live != null && live !== known) { st.prop = null; st.hits = 0; st.candidates = null; st.lastEvidence = null; }
            else return;
        }

        var matches = [];
        for (var prop = 1; prop <= 255; prop++) {
            if (StatTracker.sumIndiv(mem, ids, prop) === known) matches.push(prop);
        }
        if (!matches.length) return;
        st.candidates = st.candidates
            ? st.candidates.filter(function (p) { return matches.indexOf(p) !== -1; })
            : matches;
        if (!st.candidates.length) { st.candidates = matches; st.hits = 0; st.lastEvidence = null; }
        var evidence = ids.slice().sort(function (a, b) { return a - b; }).join(",") + ":" + known;
        if (st.lastEvidence !== evidence) st.hits++;
        st.lastEvidence = evidence;
        // Normally two independent agreements, because at a single observation
        // a bare inventory makes several unrelated slots add up to the same
        // small number by coincidence.
        //
        // The exception is a SINGLE surviving candidate over a non-trivial
        // total across several items: measured on wump2ka, one property out of
        // 255 summed to exactly 693 over four objects. That is evidence, not
        // coincidence, and waiting for a second inventory would leave the
        // figure stale for no gain. Both guards matter -- one item makes any
        // property equal to the total match trivially, and a total of 0 or 1
        // matches far too much.
        var decisive = st.candidates.length === 1 && known > 1 && ids.length > 1;
        if (st.candidates.length === 1 && (st.hits >= StatTracker.CARRY_CONFIRM || decisive)) st.prop = st.candidates[0];
    },

    // Once pinned, this is the headless path: no command, no text, every turn.
    readCarryFromRam: function (model, mem) {
        if (!mem || !model.carry) return;
        var ids = StatTracker.carriedIds(mem);
        [["value", "Value", "money"], ["weight", "Carried", "weight"]].forEach(function (spec) {
            var st = model.carry[spec[0]];
            if (!st || st.prop == null) return;
            var total = StatTracker.sumIndiv(mem, ids, st.prop);
            // Null here means an item computes its own figure this turn, so the
            // RAM sum would silently omit it and must not be shown.
            //
            // D174: but simply returning froze the figure. Measured on wump2ka:
            // carrying the Glow Bar alone pins weight at 4 from RAM; pick up
            // the canteen, which computes its own weight, and the sum goes
            // unavailable -- so the row kept showing 4 while the game's own
            // capacity reading went from 10% to 22%. Worse, the fresh inventory
            // text that DID carry the real figure was refused, because a
            // RAM-pinned source outranks text. The number was stale and still
            // labelled live, which is the one thing D24 forbids above all.
            //
            // The flag lets that turn's text correct it, and is cleared as soon
            // as RAM can answer again.
            var cur = model.stats[spec[0]];
            if (total == null) {
                if (cur) cur.ramStale = true;
                return;
            }
            var s = model.stats[spec[0]];
            if (s) s.ramStale = false;
            if (!s) {
                model.stats[spec[0]] = { key: spec[0], label: spec[1], value: total, max: null,
                    unit: spec[2], kind: "counter", seen: StatTracker.CONFIRM_SAMPLES,
                    source: "indiv:" + st.prop, confirmed: true, lastChange: null };
                return;
            }
            s.source = "indiv:" + st.prop;
            if (s.value !== total) {
                var d = total - s.value;
                s.value = total;
                if (s.confirmed === true) {
                    s.lastChange = d;
                    StatTracker.emitChange(model, spec[0], d);
                }
            }
            s.confirmed = true;
        });
    },

    // The bootstrap: whatever the game just told us, plus an attempt to pin
    // the RAM slot that agrees with it.
    observeCarryText: function (model, text, mem) {
        if (!text) return false;
        var got = false;
        var w = StatTracker.CARRY.weight.exec(text);
        var c = StatTracker.CARRY.capacity.exec(text);
        var v = StatTracker.CARRY.value.exec(text);
        if (!w && !c && !v) return false;

        var set = function (key, label, value, unit, notation) {
            if (typeof value !== "number" || isNaN(value)) return;
            got = true;
            var s = model.stats[key];
            if (!s) {
                s = model.stats[key] = { key: key, label: label, value: value, max: null, unit: unit,
                    kind: unit === "percent" ? "gauge" : "counter",
                    seen: StatTracker.CONFIRM_SAMPLES, source: "inventory-text",
                    confirmed: true, lastChange: null };
                if (notation) { s.symbol = notation.symbol; s.uom = notation.uom; }
                return;
            }
            if (notation) {
                if (notation.symbol) s.symbol = notation.symbol;
                if (notation.uom) s.uom = notation.uom;
            }
            // A RAM-pinned figure is live every turn; this text is only as
            // fresh as the last inventory, so it must not overwrite it --
            // UNLESS RAM could not answer this turn (D174: an item that
            // computes its own figure, such as wump2ka's canteen, whose weight
            // depends on how much water is in it). Then this text is the only
            // current source there is, and the alternative is a stale number
            // presented as live. The source is corrected too, so the row stops
            // claiming to come from RAM while it does not.
            if (String(s.source || "").indexOf("indiv:") === 0) {
                if (!s.ramStale && !model.preferInventoryText) return;
                s.source = "inventory-text";
            }
            if (s.value !== value) {
                var d = value - s.value;
                s.value = value;
                if (s.confirmed === true) {
                    s.lastChange = d;
                    StatTracker.emitChange(model, key, d);
                }
            }
            s.confirmed = true;
            s.ramStale = false;
        };

        if (mem) {
            if (v) StatTracker.pinCarryProp(model, mem, "value", parseInt(v[2], 10));
            if (w) StatTracker.pinCarryProp(model, mem, "weight", parseInt(w[1], 10));
        }
        // D189 (grok/codex audit, both accepting): the game PRINTING
        // "It's all worth about $N" is itself the evidence. Gating the display
        // on `valuePinned || preferInventoryText` meant a player who simply
        // typed INVENTORY got nothing -- preferInventoryText is only set by the
        // app's own bootstrap -- so the first carrying line was read, used to
        // narrow the property candidates, and then thrown away. Measured: the
        // row stayed absent, or froze at an earlier figure, until a later pin.
        //
        // Weight and capacity on the very next lines were never gated this way,
        // so value was the odd one out rather than the careful one. The pin is
        // unaffected: pinCarryProp above still requires a unique candidate, and
        // readCarryFromRam still overrides this with RAM once a slot is pinned.
        if (v) set("value", "Value", parseInt(v[2], 10), "money", { symbol: v[1] || "$" });
        if (w) set("weight", "Carried", parseInt(w[1], 10), "weight", { uom: w[2] || "lbs" });
        if (c) set("capacity", "Capacity", parseInt(c[1], 10), "percent");
        return got;
    },

    observeText: function (text, turnMarker, command, evidence) {
        var model = StatTracker.model();
        StatTracker.observeConditions(text, Object.assign({}, evidence || {}, {
            source: String(command || "").trim().toLowerCase() === "diagnose" ? "diagnose" : evidence && evidence.source || "buffer-output", command: command,
            locator: evidence && evidence.spanId
        }));
        StatTracker.observeItemMetrics(text);
        StatTracker.recordPrintedMetrics(model, text, command);
        var found = StatTracker.bannersIn(text);
        if (/\b(?:you (?:have )?died|you are dead|you were killed|a fatal blow|game over)\b/i.test(String(text || ""))
            && !found.some(function (b) { return b.kind === "death"; })) {
            found.push({ kind: "death", text: "game-authored death transition" });
        }
        found.forEach(function (b) {
            if (b.kind === "candidate" || b.kind === "quit") return;
            var id = (evidence && evidence.spanId) || (b.kind + "|" + b.text + "|" + (turnMarker == null ? "" : turnMarker));
            id = b.kind + "|" + id;
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
        StatTracker.recordEvidence({
            key: "output", value: String(text || ""), valueShape: "text",
            source: (evidence && evidence.source) || "buffer-output",
            submissionId: evidence && evidence.submissionId,
            locator: evidence && evidence.spanId,
            command: String(command || "").trim().toLowerCase()
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
        // D175: the game stated this outright, so it is a valid pin baseline.
        model.scorePinKnown = parsed.score;
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
                    // D167: a known total narrows the outstanding candidates on
                    // its own -- any slot that does not currently HOLD that
                    // number cannot be the score. This is what lets one press of
                    // Identify finish a job an announced delta had started,
                    // after which the value is read from RAM every turn.
                    var cand = model.scoreCandidates;
                    if (cand && cand.length > 1) {
                        var keep = cand.filter(function (i) { return g[i] === parsed.score; });
                        if (keep.length) {
                            model.scoreCandidates = keep;
                            if (keep.length === 1 && !model.scoreUnavailable) {
                                model.globals.score = keep[0];
                                s.source = "global:" + keep[0];
                            }
                        }
                    }
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
        StatTracker.observeConditions(text, { source: "diagnose", command: "diagnose", locator: "diagnose-reply", authoritative: true });
        var parsed = StatTracker.parseDiagnoseReply(text);
        if (!parsed) return model;
        Object.keys(parsed).forEach(function (k) {
            var p = parsed[k];
            var current = model.stats[k];
            if (current && current.confirmed && !current.ramStale && /^(status|global:|property|player-prop:|indiv:)/.test(current.source || "") && current.unit !== "ordinal") return;
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
        // D169: value sits next to score because in wump2ka it IS part of the
        // final score; carried weight and capacity follow it as the two
        // figures that constrain what you can still pick up.
        var ORDER = { score: 0, value: 1, health: 2, stamina: 3, hunger: 4, thirst: 5, sleep: 6,
                      weight: 7, capacity: 8, turns: 10, time: 11 };
        out.sort(function (a, b) {
            var d = (ORDER[a.key] == null ? 6 : ORDER[a.key]) - (ORDER[b.key] == null ? 6 : ORDER[b.key]);
            return d || String(a.key).localeCompare(String(b.key));
        });
        if (model.deaths > 0) {
            out.push({ key: "deaths", label: "Deaths", value: model.deaths,
                       unit: "plain", kind: "counter", confirmed: true, source: "observed" });
        }
        if (model.wins > 0) {
            out.push({ key: "wins", label: "Wins", value: model.wins,
                       unit: "plain", kind: "counter", confirmed: true, source: "observed" });
        }
        return out;
    },

    CONDITION_KEYS: ["poisoned", "cursed", "diseased", "confused", "blinded", "paralyzed"],
    conditionGeneration: function () {
        return typeof UndoRestoreSync !== "undefined" ? UndoRestoreSync.generation : 0;
    },
    recordCondition: function (key, present, evidence) {
        if (StatTracker.CONDITION_KEYS.indexOf(key) < 0 || typeof present !== "boolean") return;
        evidence = evidence || {};
        var model = StatTracker.model(), conditions = model.conditions || (model.conditions = {});
        var epoch = evidence.storyEpoch == null ? StatTracker._storyEpoch : evidence.storyEpoch;
        var generation = evidence.generation == null ? StatTracker.conditionGeneration() : evidence.generation;
        if (epoch !== StatTracker._storyEpoch || generation !== StatTracker.conditionGeneration()) return;
        var at = evidence.at == null ? Date.now() : evidence.at;
        var old = conditions[key];
        if (old && old.at > at) return;
        var source = evidence.source || "buffer-output";
        var authoritative = source === "status-grid" || source === "ram" ||
            (source === "diagnose" && String(evidence.command || "").trim().toLowerCase() === "diagnose");
        // Repeated narration is not independent corroboration of a current flag.
        if (present && !authoritative && old && old.state === "confirmed") return;
        conditions[key] = { key: key, label: key.charAt(0).toUpperCase() + key.slice(1),
            state: !present ? "cleared" : authoritative ? "confirmed" : "candidate",
            source: source, locator: evidence.locator || evidence.spanId || null,
            command: evidence.command || null, storyEpoch: epoch, generation: generation, at: at };
    },
    observeConditions: function (text, evidence) {
        var raw = String(text || "");
        StatTracker.CONDITION_KEYS.forEach(function (key) {
            var flag = new RegExp("\\b" + key + "\\s*[:=]\\s*(true|false|yes|no|1|0)\\b", "ig");
            var sentence = new RegExp("(?:^|\\n)\\s*you are (not |no longer )?" + key + "[.!]", "ig");
            var hits = [], m;
            while ((m = flag.exec(raw))) hits.push({ at: m.index, present: /^(true|yes|1)$/i.test(m[1]) });
            while ((m = sentence.exec(raw))) hits.push({ at: m.index, present: !m[1] });
            hits.sort(function (a, b) { return a.at - b.at; }).forEach(function (hit) {
                StatTracker.recordCondition(key, hit.present, evidence);
            });
        });
    },
    visibleConditions: function () {
        var model = StatTracker.model(), epoch = StatTracker._storyEpoch, generation = StatTracker.conditionGeneration();
        return Object.keys(model.conditions || {}).sort().map(function (key) { return model.conditions[key]; })
            .filter(function (rec) { return rec.state === "confirmed" && rec.storyEpoch === epoch && rec.generation === generation; });
    },
    renderConditions: function (host) {
        var previous = host.querySelector ? host.querySelector(".pl-conditions") : null;
        if (previous) previous.remove();
        var confirmed = StatTracker.visibleConditions();
        if (!confirmed.length) return;
        var section = document.createElement("div");
        section.className = "pl-conditions";
        var heading = document.createElement("p");
        heading.className = "pl-stat-label";
        heading.textContent = "Conditions";
        section.appendChild(heading);
        confirmed.forEach(function (rec) {
            var chip = document.createElement("span");
            chip.className = "pl-stat";
            chip.textContent = rec.label;
            section.appendChild(chip);
        });
        host.appendChild(section);
    },
    itemPropertyValues: function (mem, objectId) {
        try { return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, objectId, 3)) || {}; }
        catch (e) { return {}; }
    },
    plainItemQuantity: function (mem, value) {
        if (!Number.isInteger(value) || value < 0 || value > StatTracker.MAX_ITEM_QUANTITY) return false;
        // A packed executable/string address must not become a row quantity.
        try {
            var h = ZRamReader.header(mem);
            var scale = h.version <= 3 ? 2 : h.version === 8 ? 8 : 4;
            if (value && value * scale >= h.himem && value * scale < mem.length) return false;
        } catch (e) { return false; }
        return true;
    },
    recordItemMetric: function (mem, objectId, field, value, unit, locator) {
        if (field !== "value" && field !== "weight" || !locator || !StatTracker.plainItemQuantity(mem, value)) return;
        var model = StatTracker.model(), items = model.itemMetrics || (model.itemMetrics = {});
        var records = items[String(objectId)] || (items[String(objectId)] = {});
        var rec = records[field] || (records[field] = { prop: null, candidates: null, transitions: 0, lastValue: null });
        if (rec.unit != null && rec.unit !== unit) {
            rec.prop = null; rec.candidates = null; rec.transitions = 0; rec.lastValue = null; rec.current = false;
        }
        var values = StatTracker.itemPropertyValues(mem, objectId);
        var matches = Object.keys(values).filter(function (prop) { return values[prop] === value && StatTracker.plainItemQuantity(mem, values[prop]); }).map(Number);
        if (rec.prop != null && values[rec.prop] !== value) { rec.prop = null; rec.candidates = null; rec.transitions = 0; rec.current = false; }
        if (rec.lastValue != null && rec.lastValue !== value) rec.transitions++;
        rec.candidates = rec.candidates ? rec.candidates.filter(function (prop) { return matches.indexOf(prop) >= 0; }) : matches;
        if (!rec.candidates.length) { rec.transitions = 0; rec.candidates = matches; rec.prop = null; }
        if (rec.candidates.length === 1 && rec.transitions >= 2) rec.prop = rec.candidates[0];
        rec.lastValue = value;
        rec.unit = unit;
        rec.locator = locator;
        rec.current = rec.prop != null;
        rec.storyEpoch = StatTracker._storyEpoch;
    },
    observeItemMetrics: function (text) {
        try {
            if (typeof WorldModel === "undefined" || !WorldModel.lastPayload || typeof Actionable === "undefined") return;
            var mem = ZRamProvider.getMem();
            if (!mem) return;
            String(text || "").split(/\r?\n/).forEach(function (line) {
                var match = /^\s*(.+?):\s*(value|weight)\s*[:=]\s*([$\u00a3\u20ac])?\s*(\d+)\s*(lbs?|kg|gold)?\s*\.?\s*$/i.exec(line);
                if (!match) return;
                var byId = {};
                (WorldModel.lastPayload.inventory || []).forEach(function (obj) {
                    var ref = Actionable.referenceFor(obj);
                    if (ref.unique && ref.verified && String(ref.noun).toLowerCase() === match[1].trim().toLowerCase()) byId[String(obj.id)] = obj;
                });
                var ids = Object.keys(byId);
                if (ids.length === 1) StatTracker.recordItemMetric(mem, ids[0], match[2].toLowerCase(), Number(match[4]), match[3] || match[5] || "", line);
            });
        } catch (e) {}
    },
    itemMetricsFor: function (objectId) {
        var out = [], records = (StatTracker.model().itemMetrics || {})[String(objectId)] || {};
        try {
            var mem = ZRamProvider.getMem();
            if (!mem) return out;
            var values = StatTracker.itemPropertyValues(mem, objectId);
            Object.keys(records).forEach(function (field) {
                var rec = records[field], value = values[rec.prop];
                if (rec.prop == null || !StatTracker.plainItemQuantity(mem, value)) return;
                out.push({ field: field, value: value, unit: rec.unit, source: "item-property:" + rec.prop });
            });
        } catch (e) {}
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
    _lineCursor: typeof WeakMap !== "undefined" ? new WeakMap() : null,
    _lineIds: typeof WeakMap !== "undefined" ? new WeakMap() : null,
    _nextLineId: 1,
    _lastSubmission: null,
    _turn: 0,

    lineText: function (line) {
        return line ? String(line.innerText || line.textContent || "") : "";
    },

    primeOutputCursor: function () {
        if (typeof document === "undefined" || typeof WeakMap === "undefined") return;
        StatTracker._lineCursor = new WeakMap();
        StatTracker._lineIds = new WeakMap();
        StatTracker._nextLineId = 1;
        var lines = document.querySelectorAll(".BufferWindow .BufferLine");
        for (var i = 0; i < lines.length; i++) {
            var text = StatTracker.lineText(lines[i]);
            StatTracker._lineCursor.set(lines[i], { text: text, generation: 0 });
            StatTracker._lineIds.set(lines[i], StatTracker._nextLineId++);
        }
    },

    // Consume append and replacement output by stable DOM-node identity. Glk
    // often rewrites a BufferLine in place; a single aggregate character
    // offset misses those rewrites and was the cause of late EXP/level updates.
    freshOutputSpans: function () {
        var out = [];
        if (typeof document === "undefined" || typeof WeakMap === "undefined") return out;
        if (!StatTracker._lineCursor) StatTracker._lineCursor = new WeakMap();
        if (!StatTracker._lineIds) StatTracker._lineIds = new WeakMap();
        var lines = document.querySelectorAll(".BufferWindow .BufferLine");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i], text = StatTracker.lineText(line);
            var state = StatTracker._lineCursor.get(line);
            var id = StatTracker._lineIds.get(line);
            if (!id) { id = StatTracker._nextLineId++; StatTracker._lineIds.set(line, id); }
            if (!state) {
                state = { text: "", generation: 0 };
            }
            if (text === state.text) { StatTracker._lineCursor.set(line, state); continue; }
            var start = 0;
            if (text.indexOf(state.text) === 0) start = state.text.length;
            else state.generation++;
            var fresh = text.slice(start);
            StatTracker._lineCursor.set(line, { text: text, generation: state.generation });
            if (fresh.trim()) out.push({
                text: fresh,
                spanId: "line:" + id + ":" + state.generation + ":" + start + ":" + text.length
            });
        }
        return out;
    },

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
        var spans = StatTracker.freshOutputSpans();
        var fresh = spans.map(function (span) { return span.text; }).join("\n");

        // D167: read the score notification BEFORE observing, because pinning
        // the slot compares this turn's globals against the previous sample --
        // and observe() is what pushes the new one.
        StatTracker._pendingDelta = fresh ? StatTracker.parseScoreDelta(fresh) : null;

        StatTracker.observe(mem, StatTracker.statusText());
        StatTracker._pendingDelta = null;

        if (fresh) {
            try {
                var submission = StatTracker._lastSubmission || {};
                var command = submission.command || "";
                spans.forEach(function (span) {
                    StatTracker.observeText(span.text, StatTracker._turn, command, {
                        source: submission.source || "buffer-output",
                        submissionId: submission.submissionId || null,
                        spanId: span.spanId
                    });
                });
                StatTracker.consumeProbeReply(fresh);
                // D169: the carried-value bootstrap needs BOTH the text the
                // game just printed and live RAM, which only meet here.
                var carryHit = StatTracker.observeCarryText(StatTracker.model(), fresh, mem);
                if (carryHit && StatTracker._key) {
                    StatTracker.save(StatTracker._key, StatTracker.model());
                }
                if (StatTracker._carryProbeTurnCheck) {
                    StatTracker._carryProbeTurnCheck = false;
                    StatTracker.model().preferInventoryText = false;
                    if (!carryHit) StatTracker._carryProbeUseless = true;
                    var after = StatTracker.model().stats.turns;
                    var before = StatTracker._carryTurnsBefore;
                    if (!StatTracker._carryTurnWarned && after && before != null
                        && typeof after.value === "number" && after.value > before) {
                        StatTracker._carryTurnWarned = true;
                        try {
                            if (StatTracker._probeDisclosureEpoch !== StatTracker._storyEpoch
                                && typeof Message !== "undefined" && Message.Show) {
                                Message.Show("Inventory check",
                                    "Each time you open Equipment, the story checks your pack. In this game that uses a turn.");
                            }
                        } catch (eMsg) {}
                    }
                }
            } catch (e) {}
        }

        // D188: NO automatic probe here. D177/D187 submitted SCORE by itself,
        // which is not headless -- it types a command into the story, prints a
        // reply, and the resulting buffer churn destroys the room's underlines.
        // The headless path already exists and is directly above:
        // promoteGlobals identifies the score's global by watching RAM change
        // across turns, and readConfirmedGlobals then reads it every turn with
        // no command and no text. Identify stats remains the explicit opt-in.
        StatTracker.Render();
        StatTracker.playCues(StatTracker.takeEvents());
        StatTracker.runProbeQueue();
    },

    // D177 (operator): ask the story for its stats ONCE when a module first
    // comes up, instead of waiting for the player to find the Identify button.
    //
    // D173 counts an announced score change against a total the game has
    // stated, and refuses to invent one (D24). But Anchorhead's desktop status
    // row shows "day one", not a score, so with no SCORE reply there is no
    // total to count against and the row sits at 0 through the player's first
    // points -- the single most likely complaint from a new tester.
    //
    // Two objections previously kept this out, and both are now answered.
    // D167 claimed the reply costs a turn; measured, it does not -- SCORE is a
    // meta action, confirmed on anchor (7/7/8), Zork1 (6/6/7, corroborated by
    // the game's own status row), LostPig (6/6/7) and wump2ka (7/7/8). And the
    // grok seat's reentrancy concern was about submitting from inside the
    // payload cycle; this fires once at session start, and only after the game
    // is demonstrably in play.
    //
    // D177: asked when the inventory sheet opens (EquipmentUI.Show), not from
    // Tick. wump2ka's restore question is an ordinary line prompt -- "score"
    // would answer it -- so refuse that text even if the sheet is open.
    // Identify() submits a line command, so CharInput is not enough.
    _carryBootstrapAt: 0,
    _hideCarryProbe: false,
    _carryProbeTurnCheck: false,
    _carryTurnsBefore: null,
    _carryTurnWarned: false,
    _carryProbeUseless: false,
    // D191: the player's own half-typed command. Any non-empty value counts --
    // whitespace alone does not, so an accidental space does not block the
    // bootstrap forever.
    lineInputHasDraft: function () {
        try {
            if (typeof document === "undefined") return false;
            var el = document.querySelector(".Input.LineInput");
            return !!(el && String(el.value || "").trim());
        } catch (e) { return false; }
    },

    // D191 finding 4 (codex/grok): Resync and reset dropped the model's
    // readings but left every carry-probe flag set, and left a queued Submit
    // in flight. A restored or restarted game could therefore inherit
    // _carryProbeUseless from the abandoned one and never probe again, or fire
    // a Submit belonging to a game that no longer exists. _hideCarryProbe left
    // true also widens the hidden-input checks in Actionable and Input to ANY
    // hidden LineInput, which is far broader than one suppressed probe.
    // D194/D195: put back whatever the pending probe changed on the model.
    // Idempotent, and a no-op once the model has been replaced by a new game,
    // so it can never resurrect an abandoned timeline's flags.
    _carryProbeRollback: null,
    rollbackCarryProbe: function () {
        try {
            var r = StatTracker._carryProbeRollback;
            if (!r) return;
            StatTracker._carryProbeRollback = null;
            var m = StatTracker.model();
            if (m !== r.model) return;
            m.preferInventoryText = r.prefer;
            Object.keys(r.stale).forEach(function (k) {
                if (m.stats[k]) m.stats[k].ramStale = r.stale[k];
            });
        } catch (e) {}
    },

    clearCarryProbe: function () {
        try { if (StatTracker._carryProbeTimer) clearTimeout(StatTracker._carryProbeTimer); } catch (e) {}
        StatTracker.rollbackCarryProbe();       // D195: undo what the cancelled probe changed
        // D197 (codex): the snapshot is released the instant a Submit succeeds,
        // because from there the reply path legitimately owns these flags. But a
        // Resync/restore/restart/undo landing AFTER the submit and BEFORE the
        // reply leaves no snapshot to restore AND no reply ever coming, so
        // preferInventoryText and the ramStale marks stayed set -- the same
        // symptom D194 fixed, by a different route. Reproduced, not theoretical.
        //
        // clearCarryProbe means "nothing is in flight and nothing will complete",
        // so no awaiting-inventory state may survive it, snapshot or not. Safe
        // because Resync calls forgetReadings first: the stats are being rebuilt.
        try {
            var m = StatTracker.model();
            m.preferInventoryText = false;
            ["value", "weight", "capacity"].forEach(function (k) {
                if (m.stats[k]) m.stats[k].ramStale = false;
            });
        } catch (eN) {}
        StatTracker._carryProbeTimer = null;
        StatTracker._carryProbeSentAt = 0;
        StatTracker._carryBootstrapAt = 0;
        StatTracker._hideCarryProbe = false;
        StatTracker._carryProbeTurnCheck = false;
        StatTracker._carryTurnsBefore = null;
        StatTracker._carryTurnWarned = false;
        StatTracker._carryProbeUseless = false;
        StatTracker._carryProbeSubmitting = false;
        setTimeout(function () { StatTracker.runProbeQueue(); }, 0);
    },

    _carryProbeTimer: null,
    _carryProbeSentAt: 0,           // D195: bounds the in-flight guard
    _carryProbeSubmitting: false,

    requestCarryBootstrap: function () {
        try {
            var now = Date.now();
            if (StatTracker._carryProbeUseless) return;
            // D195 (codex): ONE probe transaction at a time. The 800ms throttle
            // below cannot carry this, because EquipmentUI.Show() sets
            // _carryBootstrapAt = 0 immediately before calling -- deliberately,
            // so that opening the sheet always refreshes -- which means two
            // Shows in quick succession both pass it. The second call then
            // overwrote _carryProbeTimer without clearing the first, so BOTH
            // timers fired and the story received `inventory` twice: two turns
            // in a game like Wumpus where the probe costs one.
            //
            // Two states count as in flight:
            //   - a submission is queued but has not run yet;
            //   - one was sent and its reply has not been consumed. Bounded by
            //     time so a story that never answers cannot wedge the probe
            //     off permanently.
            if (StatTracker._carryProbeTimer) return;
            if (StatTracker._hideCarryProbe
                && now - (StatTracker._carryProbeSentAt || 0) < 4000) return;
            if (now - (StatTracker._carryBootstrapAt || 0) < 800) return;
            if (typeof document === "undefined") return;
            var buf = "";
            try {
                var el = document.querySelector(".BufferWindow");
                buf = el ? String(el.innerText || el.textContent || "") : "";
            } catch (eBuf) {}
            if (/would you like to restore a saved game/i.test(buf.slice(-1200))) return;
            if (!document.querySelector(".Input.LineInput")) return;
            if (StatTracker._probePending) return;
            var verb = "inventory";
            if (typeof Actionable === "undefined" || !Actionable.Submit) return;
            if (Actionable.isGameWord && !Actionable.isGameWord("inventory")) {
                if (Actionable.isGameWord("i")) verb = "i";
                else return;
            }
            // D192 (grok round 2): this check has to come BEFORE the model is
            // touched. D191 placed it after, so opening the sheet with a draft
            // skipped the Submit but still set preferInventoryText and marked
            // three stats ramStale -- side effects of a probe that never ran.
            //
            // The probe submits through the same line the player types into, so
            // a half-written command would otherwise be replaced by
            // "inventory". Re-checked again at submission time below, because
            // the submit is deferred and the player can start typing meanwhile.
            if (StatTracker.lineInputHasDraft()) return;

            // D194: remember exactly what this probe changes, so a refused or
            // abandoned submission can put it back. Operator-reported: Wumpus
            // stopped auto-updating its stats after the first sheet open. Cause:
            // the probe consumes a turn in that game, so it raises its own "this
            // uses a turn" advisory -- and Actionable.Submit refuses while
            // Message.IsOpen. The submission then failed with the model ALREADY
            // mutated, leaving value/weight marked ramStale permanently, which
            // is what the player sees as "no longer updating". D192 rolled back
            // _hideCarryProbe on a refusal but not these.
            // D195 (codex): the snapshot lives on StatTracker, not in this
            // closure. D194 put it in a local, so clearCarryProbe -- which
            // cancels the timer on Resync, restore, restart and undo -- had no
            // way to undo the mutation it was cancelling, and left
            // preferInventoryText and the ramStale marks set for a probe that
            // will now never run.
            var model = StatTracker.model();
            var rollback = { model: model, prefer: model.preferInventoryText, stale: {} };
            model.preferInventoryText = true;
            ["value", "weight", "capacity"].forEach(function (k) {
                if (model.stats[k]) {
                    rollback.stale[k] = model.stats[k].ramStale;
                    model.stats[k].ramStale = true;
                }
            });
            StatTracker._carryProbeRollback = rollback;
            var undoProbeMutation = StatTracker.rollbackCarryProbe;
            StatTracker._carryTurnsBefore = (model.stats.turns && typeof model.stats.turns.value === "number")
                ? model.stats.turns.value : null;

            StatTracker._hideCarryProbe = true;
            StatTracker._carryBootstrapAt = now;
            StatTracker._carryProbeTimer = setTimeout(function () {
                StatTracker._carryProbeTimer = null;
                try {
                    if (StatTracker.lineInputHasDraft()) {
                        // Stand down rather than overwrite what they typed.
                        StatTracker._hideCarryProbe = false;
                        undoProbeMutation();            // D194
                        return;
                    }
                    // D191: this permission is scoped to THIS submission only.
                    // _hideCarryProbe stays set for the line-hiding consumer in
                    // Actionable.RenderInventory, but it must not also mean
                    // "any injection may proceed while the input is hidden",
                    // which is what the two gates were reading it as.
                    StatTracker._carryProbeSubmitting = true;
                    var sent = false;
                    try { sent = Actionable.Submit(verb, "stat-probe"); }
                    finally { StatTracker._carryProbeSubmitting = false; }
                    // D195: a sent probe is in flight until its reply is
                    // consumed. Stamp it so the entry guard can bound the wait,
                    // and drop the rollback -- from here the ordinary reply path
                    // owns preferInventoryText and the ramStale marks, and
                    // undoing them later would discard a real reading.
                    if (sent) {
                        StatTracker._carryProbeSentAt = Date.now();
                        StatTracker._carryProbeRollback = null;
                    }
                    // D192: if the Submit was refused, nothing will arrive to
                    // consume the hide flag -- and Actionable clears it only on
                    // a successful listing. Left armed, it would hide the next
                    // inventory the PLAYER typed.
                    // D194: and put the model back. Nothing is coming to clear
                    // preferInventoryText or the ramStale marks, so left set
                    // they make the carried totals read as stale for the rest of
                    // the session even though the numbers on screen are correct.
                    if (sent === false) {
                        StatTracker._hideCarryProbe = false;
                        undoProbeMutation();
                    }
                } catch (eS) {
                    StatTracker._carryProbeSubmitting = false;
                    StatTracker._hideCarryProbe = false;
                    undoProbeMutation();                // D194
                }
            }, 0);
        } catch (e) {}
    },
    // D193: `autoIdentify` was removed here. D188 deleted both of its call
    // sites -- an injected SCORE is not headless observation -- which left the
    // body reachable only by name, from nowhere. A whole-repo reference check
    // (js/, tools/, harness/, play.html, JSON) found the definition and no
    // caller. `Identify()` is retained: it is the explicit, player-initiated
    // path, and the opcode learners are untouched.

    // ---- sound -----------------------------------------------------------
    // Synthesised, because the app ships no audio at all and a bundled asset
    // would need registering in three separate places (play.html, the service
    // worker precache list and make-dist.bat's allow-list) -- the same trap
    // that let D120's tutorial.html ship missing. An oscillator needs none of
    // them. The context is created lazily so it is born inside a real user
    // gesture wherever possible, which is what autoplay policy requires.
    // D167: an AudioContext created outside a user gesture starts SUSPENDED on
    // Android and in Chrome, so the first cue would be silent even once events
    // flow correctly. Arming it on the first real touch/click costs nothing and
    // is the only moment the platform will allow it.
    _acArmed: false,
    armAudio: function () {
        if (StatTracker._acArmed) return;
        StatTracker._acArmed = true;
        try {
            var ac = StatTracker.audio();
            if (ac && ac.state === "suspended" && ac.resume) ac.resume();
        } catch (e) {}
    },
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
        StatTracker.renderConditions(host);
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
            hint.textContent = model.fulfillment === "checking"
                ? "Checking this story for current status..."
                : model.fulfillment === "unavailable"
                ? "Current status is unavailable at this prompt."
                : model.probed
                ? "This story does not report any character stats."
                : "No stats in this story's status bar yet. Ask it directly — costs one turn.";
            rows.appendChild(hint);
            var b0 = document.getElementById("pl-stats-identify");
            if (b0) b0.hidden = !!model.probed;
            return;
        }
        host.hidden = false;
        rows.innerHTML = "";

        // Fulfillment state remains visible even when passive stats already
        // occupy the strip; otherwise an on-open command check looked idle.
        if (model.fulfillment === "checking" || model.fulfillment === "unavailable") {
            var stateHint = document.createElement("p");
            stateHint.className = "pl-stat-hint pl-stat-fulfillment";
            stateHint.textContent = model.fulfillment === "checking"
                ? "Checking this story for current status..."
                : "Some current status is unavailable at this prompt.";
            rows.appendChild(stateHint);
        }

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
            } else if (s.unit === "money") {
                // D169: the game's own notation. wump2ka prints dollars; the
                // symbol is captured from what it printed rather than assumed,
                // so a game using another one is not relabelled.
                val.textContent = (s.symbol || "$") + s.value;
            } else if (s.unit === "weight") {
                val.textContent = s.value + " " + (s.uom || "lbs");
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
            // D167: the operator asked for a small graphic, not only a colour
            // flash. A rising "+2" is readable at a glance and still works on a
            // muted phone.
            //
            // It cannot be a one-shot element with its own timer: Render is
            // driven by WorldModel.apply and was measured running about a
            // hundred times per turn, and each pass wipes the rows -- a badge
            // created on the tick the score moved was destroyed ~25ms later by
            // the next one, which is why nothing was ever visible. Instead the
            // change is given a deadline and every render inside that window
            // draws it, so it survives the rebuilds and then simply stops.
            if (s.lastChange) {
                // A turn counter and a clock advance every single turn, so a
                // badge on those is not an event -- it is permanent clutter.
                // Only a change the player would want pointed out is marked.
                // D169: "Value +650" is exactly the event worth pointing out.
                // Weight and capacity move with it on the same turn, so
                // badging all three would say one thing three times.
                var worthMarking = (s.key !== "turns" && s.key !== "time"
                                    && s.key !== "weight" && s.key !== "capacity");
                if (worthMarking) {
                    s.badgeDelta = s.lastChange;
                    s.badgeUntil = Date.now() + 1500;
                }
                s.lastChange = null;
            }
            if (s.badgeUntil && Date.now() < s.badgeUntil && s.badgeDelta) {
                var badge = document.createElement("span");
                badge.className = "pl-stat-badge " + (s.badgeDelta > 0 ? "up" : "down");
                badge.textContent = (s.badgeDelta > 0 ? "+" : "") + s.badgeDelta;
                chip.appendChild(badge);
                chip.classList.add(s.badgeDelta > 0 ? "pl-stat-up" : "pl-stat-down");
            }
            rows.appendChild(chip);
        });

        var btn = document.getElementById("pl-stats-identify");
        if (btn) btn.hidden = !!model.probed;
    },

    // ---- D204 deterministic on-demand fulfillment -------------------------
    _probePending: null,
    _probeTurns: 0,
    _probeQueue: [],
    _probeActive: null,
    _probeTimer: null,
    _probeDisclosureEpoch: -1,
    D204Valve: {
        StorageKey: "PL_D204_StatisticsValve_v1",
        _testOverride: null,
        mode: function () {
            var value = StatTracker.D204Valve._testOverride;
            if (value == null) {
                try { value = localStorage.getItem(StatTracker.D204Valve.StorageKey); } catch (e) {}
            }
            return value === "off" || value === "shadow" ? value : "on";
        },
        setMode: function (mode) {
            var value = mode === "shadow" || mode === "on" ? mode : "off";
            try { localStorage.setItem(StatTracker.D204Valve.StorageKey, value); } catch (e) {}
            return value;
        }
    },

    canAsk: function (verb) {
        try {
            if (typeof Actionable === "undefined" || !Actionable.isGameWord) return true;
            return Actionable.isGameWord(verb);
        } catch (e) { return false; }
    },

    hasPassiveMetric: function (key) {
        var stat = StatTracker.model().stats[key];
        return !!(stat && /^(?:status|global:|player-prop:|interpreter)/.test(String(stat.source || "")));
    },

    probeSafeNow: function () {
        try {
            if (typeof document === "undefined" || StatTracker.lineInputHasDraft()) return false;
            if (typeof Navigator !== "undefined" && (Navigator.Running || Navigator.Awaiting)) return false;
            if (!document.querySelector(".Input.LineInput")) return false;
            if (document.querySelector(".Input.CharInput")) return false;
            if (document.querySelector("#dialog, #dialog_frame, #dialog_screen")) return false;
            if (typeof Message !== "undefined" && Message.IsOpen) return false;
            return true;
        } catch (e) { return false; }
    },

    queueProbe: function (kind, verb) {
        if (!StatTracker.canAsk(verb)) return false;
        if (StatTracker._probeActive && StatTracker._probeActive.kind === kind) return true;
        if (StatTracker._probeQueue.some(function (p) { return p.kind === kind; })) return true;
        StatTracker._probeQueue.push({ kind: kind, verb: verb, attempts: 0 });
        return true;
    },

    requestStatusFulfillment: function (explicit) {
        var model = StatTracker.model();
        var mode = StatTracker.D204Valve.mode();
        if (mode === "off" && !explicit) return;
        model.probed = true;
        model.fulfillment = "checking";
        // A draft blocks the whole transaction, not merely INVENTORY. SCORE or
        // DIAGNOSE must never overtake a skipped first command.
        if (StatTracker.lineInputHasDraft()) {
            model.fulfillment = "unavailable";
            StatTracker.Render();
            return;
        }
        // Disclose before starting any probe. Otherwise the inventory timer
        // submits behind this modal, is refused, and never collects its reply.
        var needsNotice = (!StatTracker.hasPassiveMetric("score") && StatTracker.canAsk("score"))
            || (!StatTracker.hasPassiveMetric("health") && StatTracker.canAsk("diagnose"));
        if (mode === "on" && !explicit && needsNotice
            && StatTracker._probeDisclosureEpoch !== StatTracker._storyEpoch) {
            StatTracker._probeDisclosureEpoch = StatTracker._storyEpoch;
            var epoch = StatTracker._storyEpoch;
            Message.Show("Status check", "ParchLock may quietly ask this story for status when you open Equipment. Some stories count that check as a turn.", false, function () {
                if (!Message.IsOpen && StatTracker._storyEpoch === epoch && typeof EquipmentUI !== "undefined" && EquipmentUI.IsOpen()) {
                    StatTracker.requestStatusFulfillment(false);
                }
            });
            StatTracker.Render();
            return;
        }
        // Inventory keeps its narrowly proven span ownership (pl-carry-probe).
        // SCORE/DIAGNOSE use the same headless contract via beginProbeOwnership:
        // BufferLines created during the probe turn are marked pl-stat-probe
        // synchronously at DOM insertion (before paint) so they never appear in
        // #windowport narration, while textContent remains available for parsing.
        StatTracker._carryBootstrapAt = 0;
        StatTracker.requestCarryBootstrap();
        var queued = false;
        if (!StatTracker.hasPassiveMetric("score")) queued = StatTracker.queueProbe("score", "score") || queued;
        var diagnoseKnown = ["health", "stamina", "hunger", "thirst", "sleep"].some(function (key) {
            var s = model.stats[key];
            return s && s.source === "diagnose";
        });
        if (diagnoseKnown || !StatTracker.hasPassiveMetric("health")) {
            queued = StatTracker.queueProbe("diagnose", "diagnose") || queued;
        }
        if (mode === "shadow") {
            StatTracker.recordEvidence({ key: "probe-plan", value: StatTracker._probeQueue.map(function (p) { return p.verb; }), valueShape: "list", source: "d204-shadow" });
            StatTracker._probeQueue = [];
            model.fulfillment = "complete";
            StatTracker.Render();
            return;
        }
        if (!queued && !StatTracker._hideCarryProbe) model.fulfillment = "complete";
        StatTracker.Render();
        StatTracker.runProbeQueue();
    },

    finishProbe: function (state) {
        clearTimeout(StatTracker._probeTimer);
        StatTracker._probeTimer = null;
        StatTracker._probeActive = null;
        StatTracker._probePending = null;
        StatTracker.endProbeOwnership();
        if (!StatTracker._probeQueue.length) StatTracker.model().fulfillment = state || "complete";
        StatTracker.Render();
        StatTracker.runProbeQueue();
    },

    runProbeQueue: function () {
        if (StatTracker._probeActive || !StatTracker._probeQueue.length) return;
        // The inventory transaction must finish before another line command.
        if (StatTracker._hideCarryProbe || StatTracker._carryProbeTimer) {
            if (!StatTracker._carryProbeTimer && StatTracker._hideCarryProbe
                && StatTracker._carryProbeSentAt > 0 && Date.now() - StatTracker._carryProbeSentAt > 5000) {
                StatTracker.clearCarryProbe();
            }
            return;
        }
        var next = StatTracker._probeQueue[0];
        if (!StatTracker.probeSafeNow()) {
            if (++next.attempts > 24) {
                StatTracker._probeQueue.shift();
                StatTracker.model().fulfillment = "unavailable";
                StatTracker.runProbeQueue();
                StatTracker.Render();
                return;
            }
            clearTimeout(StatTracker._probeTimer);
            StatTracker._probeTimer = setTimeout(StatTracker.runProbeQueue, 250);
            return;
        }
        StatTracker._probeQueue.shift();
        StatTracker._probeActive = next;
        StatTracker._probeTurns = 0;
        StatTracker._probePending = {};
        StatTracker._probePending[next.kind] = true;
        StatTracker.beginProbeOwnership();
        var sent = false;
        try { sent = Actionable.Submit(next.verb, "stat-probe"); } catch (e) {}
        if (!sent) { StatTracker.finishProbe("unavailable"); return; }
        StatTracker._probeTimer = setTimeout(function () { StatTracker.finishProbe("unavailable"); }, 5000);
    },

    // ---- D204 quiet probe ownership (source/span before paint) ------------
    // Distinct from Actionable's delayed inventory display:none path: this
    // marks owned BufferLines in a sync MutationObserver microtask so the
    // browser never paints SCORE/DIAGNOSE echo or reply into #windowport.
    _statProbeOwned: false,
    _probeDomGuard: null,

    protectProbeInputs: function (root) {
        if (!root || !root.querySelectorAll) return;
        Array.prototype.forEach.call(root.querySelectorAll(".BufferLine.pl-stat-probe, .BufferLine.pl-carry-probe"), function (line) {
            if (!line.querySelector(".Input, .LineInput, .CharInput, input, textarea")) return;
            var kind = line.classList.contains("pl-stat-probe") ? "pl-stat-probe" : "pl-carry-probe";
            // Glk can reuse the last output line for the next live prompt.
            Array.prototype.slice.call(line.childNodes).forEach(function (child) {
                if (child.nodeType === 1 && (child.matches(".Input, .LineInput, .CharInput, input, textarea") || child.querySelector(".Input, .LineInput, .CharInput, input, textarea"))) return;
                if (child.nodeType === 3) {
                    var span = document.createElement("span");
                    line.insertBefore(span, child);
                    span.appendChild(child);
                    child = span;
                }
                if (child.nodeType === 1) {
                    child.classList.add(kind);
                    child.setAttribute("aria-hidden", "true");
                    if (kind === "pl-carry-probe") child.style.display = "none";
                }
            });
            line.classList.remove("pl-stat-probe", "pl-carry-probe");
            line.removeAttribute("aria-hidden");
            line.style.removeProperty("display");
        });
    },

    claimProbeNode: function (node) {
        if (!node || node.nodeType !== 1) return;
        var lines = [];
        try {
            if (node.classList && node.classList.contains("BufferLine")) lines.push(node);
            if (node.querySelectorAll) {
                Array.prototype.forEach.call(node.querySelectorAll(".BufferLine"), function (el) {
                    lines.push(el);
                });
            }
            if (node.classList && node.classList.contains("Style_input")) {
                var parent = node.closest ? node.closest(".BufferLine") : null;
                if (parent) lines.push(parent);
            } else if (node.querySelectorAll) {
                Array.prototype.forEach.call(node.querySelectorAll(".Style_input"), function (span) {
                    var p = span.closest ? span.closest(".BufferLine") : null;
                    if (p) lines.push(p);
                });
            }
        } catch (eClaim) {}
        lines.forEach(function (line) {
            if (!line || !line.classList || line.classList.contains("pl-stat-probe")) return;
            line.classList.add("pl-stat-probe");
            try { line.setAttribute("aria-hidden", "true"); } catch (eA) {}
        });
    },

    ensureProbeDomGuard: function () {
        if (StatTracker._probeDomGuard) return;
        if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
        var root = document.getElementById("windowport") || document.body;
        if (!root) return;
        StatTracker._probeDomGuard = new MutationObserver(function (mutations) {
            StatTracker.protectProbeInputs(root);
            if (!StatTracker._statProbeOwned) return;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                for (var j = 0; j < m.addedNodes.length; j++) {
                    StatTracker.claimProbeNode(m.addedNodes[j]);
                }
                if (m.type === "characterData" && m.target) {
                    var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
                    if (el && el.closest) StatTracker.claimProbeNode(el.closest(".BufferLine") || el);
                }
            }
            StatTracker.protectProbeInputs(root);
            // Claim the reply first, then release ownership at the VM's next
            // prompt even if that reply contained no recognizable metric.
            var nextInput = root.querySelector(".Input.LineInput, .Input.CharInput");
            if (StatTracker._probeActive && nextInput && nextInput !== StatTracker._probeInput) {
                var completed = StatTracker._probeActive;
                StatTracker.endProbeOwnership();
                setTimeout(function () {
                    if (StatTracker._probeActive !== completed) return;
                    StatTracker.Tick();
                    if (StatTracker._probeActive === completed) StatTracker.finishProbe("unavailable");
                }, 0);
            }
        });
        try {
            StatTracker._probeDomGuard.observe(root, { childList: true, subtree: true, characterData: true });
        } catch (eObs) { StatTracker._probeDomGuard = null; }
    },

    beginProbeOwnership: function () {
        StatTracker._probeInput = document.querySelector(".Input.LineInput, .Input.CharInput");
        StatTracker._statProbeOwned = true;
        StatTracker.ensureProbeDomGuard();
    },

    endProbeOwnership: function () {
        StatTracker._statProbeOwned = false;
    },

    Identify: function () {
        StatTracker.requestStatusFulfillment(true);
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
            else {
                // W&W family SCORE replies name experience, not "Your score is".
                var printed = StatTracker.parsePrintedMetrics(text);
                if (printed && printed.experience) {
                    StatTracker.recordPrintedMetrics(StatTracker.model(), text, "score");
                    pending.score = false;
                }
            }
        }
        if (pending.diagnose) {
            var dg = StatTracker.parseDiagnoseReply(text);
            if (dg) { StatTracker.applyDiagnoseReply(text); pending.diagnose = false; }
        }
        if (!pending.score && !pending.diagnose) { StatTracker.finishProbe("complete"); return; }
        // Give up after a few turns rather than misreading ordinary play as a
        // probe reply.
        if (++StatTracker._probeTurns > 6) StatTracker.finishProbe("unavailable");
    },

    Bind: function () {
        try {
            if (typeof document === "undefined") return;
            var btn = document.getElementById("pl-stats-identify");
            if (btn && !btn._plBound) {
                btn._plBound = true;
                btn.addEventListener("click", function () { StatTracker.Identify(); });
            }
            if (typeof TurnRecorder !== "undefined") {
                if (!StatTracker._submitUnsubscribe && TurnRecorder.subscribeAcceptedSubmit) {
                    StatTracker._submitUnsubscribe = TurnRecorder.subscribeAcceptedSubmit("d204-stat-ledger", function (event) {
                        StatTracker._lastSubmission = event;
                    });
                }
                if (!StatTracker._analyzerBound && TurnRecorder.registerAnalyzer) {
                    StatTracker._analyzerBound = true;
                    TurnRecorder.registerAnalyzer({
                        id: "d204-stat-ledger",
                        prepare: function () { return { hasWitness: function () { return true; } }; },
                        analyze: function (turn) {
                            StatTracker.recordEvidence({
                                key: "turn", value: turn.command, valueShape: "transaction",
                                source: turn.source, submissionId: turn.submissionId,
                                locator: "lines:" + turn.startLine + "-" + turn.endLine
                            });
                        }
                    });
                }
            }
            StatTracker.ensureProbeDomGuard();
            if (!StatTracker._outputObserver && typeof MutationObserver !== "undefined") {
                var root = document.getElementById("windowport") || document.body;
                var scheduled = false;
                StatTracker._outputObserver = new MutationObserver(function () {
                    if (scheduled) return;
                    scheduled = true;
                    setTimeout(function () { scheduled = false; StatTracker.Tick(); }, 20);
                });
                StatTracker._outputObserver.observe(root, { childList: true, subtree: true, characterData: true });
            }
        } catch (e) {}
    }
};

try {
    if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () { StatTracker.Bind(); });
        // One-shot, capture-phase, passive: never interferes with the gesture
        // it is listening for.
        ["pointerdown", "touchstart", "keydown"].forEach(function (evt) {
            document.addEventListener(evt, function armOnce() {
                try { StatTracker.armAudio(); } catch (e) {}
                document.removeEventListener(evt, armOnce, true);
            }, true);
        });
    }
} catch (e) {}

try { if (typeof window !== "undefined") window.StatTracker = StatTracker; } catch (e) {}
try { if (typeof module !== "undefined" && module.exports) module.exports = StatTracker; } catch (e) {}
