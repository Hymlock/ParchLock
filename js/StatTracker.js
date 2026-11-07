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

    // Measured executable facts, not current readings or title dispatch.
    // Guss's Death: isolated live SCORE returns to LineInput with an explicit
    // maximum; build bytes authenticated via ModuleLibrary's existing owner.
    // The numeric sample is audit evidence only and is never seeded here.
    MeasuredProbeFacts: typeof ModuleStatFacts !== "undefined" ? ModuleStatFacts
        : (typeof module !== "undefined" && module.exports ? require("./ModuleStatFacts.js") : {}),

    // Separate writer lane for reserved modules. These are command/layout
    // capabilities, never current readings; executable identity is mandatory.
    SupplementalProbeFacts: {
        "7af1234102d31ab7e197b05b9e176423ef5c2749bc0f1f68a60cfd4d92a11b34":{ownedReplyLines:["[To see a more elaborate score report, type FULL SCORE.]","[To see what you are carrying, type INVENTORY.]"]},
        "d7bbec1bcc3ba7a2f3110017691c1e6ba647c8d6177a22cac0dbb35569be290e":{command:"score",fields:["chapter","regions","first choice"],replyFamily:"chapter-regions",outcome:"line",format:"glulx",validatedForm:true,evidence:"Current isolated SCORE prints chapter and explored regions with totals and first choice."},
        "367dfd432fc4489bdf1212030a9962b8dca9a2a8e1a18c03c2ae57cfda949c55":{command:"score",fields:["achievements"],replyFamily:"achievement-list",outcome:"line",format:"glulx",validatedForm:true,evidence:"Current isolated SCORE prints complete named achievement states."},
        "285622705ee8181fb7c01ef4a349eb826f758afeb98617cb1fa7b2e18bc606de":{command:"score",fields:[],replyFamily:"no-score",outcome:"line",format:"glulx",validatedForm:true,rejectedForms:["diagnose"],evidence:"Current normal-prompt isolated SCORE explicitly reports no score; DIAGNOSE rejected; inventory has no totals."},
        "c2f28a4ddd9367c260946926a33c73a4b0cc38b1f327646cc1202182a28a10ff": {command:"score",fields:["score.max","progress"],replyFamily:"mystery-progress-score",outcome:"line",evidence:"Current isolated SCORE reported by Claude: numeric score plus score-dependent mystery milestone; current live verification required."},
        "26dcdab275054e5899c9454a879816a1ced530e9172bd8d8cf101fb7acc27cb4": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "return-score",
            "outcome": "line",
            "continuation": "return",
            "rejectedForms": [
                "inventory",
                "diagnose"
            ],
            "evidence": "Actual SCORE asks exact peril-sensitive-sunglasses RETURN prompt; empty Enter yields numerical score/maximum. INVENTORY rejected, use player I manually. DIAGNOSE produces no health."
        },
        "b42d5a7db4df78ed2e29341e86a149fbd7a0038d5d74c48b4444a7bb73506ef8": {
            "command": "score",
            "fields": [],
            "replyFamily": "no-score",
            "outcome": "line",
            "additionalProbes": [
                {
                    "command": "diagnose",
                    "fields": [
                        "health"
                    ],
                    "replyFamily": "goal-readiness",
                    "outcome": "line"
                }
            ],
            "evidence": "Current chapter1 isolated SCORE explicitly says no score; actual status exposes complete HH:mm clock."
        },
        "c0a9b42a4d4a9b23521e6d491546969a64225b99871230c85d0e79ac06589c4d": {
            "command": "score",
            "fields": [
                "score.max",
                "rank"
            ],
            "replyFamily": "bracket-total-score",
            "outcome": "line",
            "statusPair": [
                "Score",
                "Moves"
            ],
            "evidence": "Current isolated SCORE prints bracketed total bound and separate rank line; TIME is narrative without numerical clock."
        },
        "4dd5c00c04ffb94f092fbd0d02a808b69e1f6f9753dc9d87691779f38fe629cf": {
            "command": "score",
            "fields": [
                "score.max",
                "locations.max"
            ],
            "replyFamily": "visited-locations-score",
            "outcome": "line",
            "statusPair": [
                "Score",
                "Moves"
            ],
            "rejectedForms": [
                "diagnose"
            ],
            "evidence": "Current isolated SCORE prints score maximum and visited locations/total; DIAGNOSE rejected as verb."
        },
        "430d8955b7ee55ba8b7f764a1ea98470b8625305c185fd4c094003d19a1ce482": {
            "command": "score",
            "fields": [
                "progress",
                "rank"
            ],
            "replyFamily": "rivals-progress",
            "outcome": "line",
            "evidence": "Current isolated SCORE states rivals eliminated and minister rank; authored status reports Tone."
        },
        "c889cedc652aebf87139f07cd1ce508ee9151e7249e42b241612d948bb711f92": {
            "command": "score",
            "fields": [
                "quarry",
                "health"
            ],
            "replyFamily": "hunt-status",
            "outcome": "line",
            "evidence": "Current isolated SCORE prints creature/player alive qualitative states and Score it yourself; inventory bolts are item quantity, not a separate scalar gauge."
        },
        "e18fd6b6ebe311cc3831dbd0de51b4ae4c5cf20824f32e2b0fcbdbe01595c5b7": {
            "command": "score",
            "fields": [
                "keys seen",
                "keys turned",
                "shutdown elements"
            ],
            "replyFamily": "shutdown-progress",
            "outcome": "line",
            "evidence": "Current isolated SCORE prints separate key discovery, key-turn and shutdown-element progress plus moves."
        },
        "f77c8f218f0b6f11940e342f82c8c9f91d0933d366f45a5a3587ca341d5bfdf6": {
            "command": "score",
            "fields": [
                "task"
            ],
            "replyFamily": "divine-task",
            "outcome": "line",
            "additionalProbes": [
                {
                    "command": "diagnose",
                    "fields": [
                        "health"
                    ],
                    "replyFamily": "best-health",
                    "outcome": "line"
                }
            ],
            "evidence": "Isolated SCORE states divine task completed; DIAGNOSE states best health, qualitative only."
        },
        "0e9066037c3b13ce767bda6512dfed38a0e9abc9b190b2d0228b0f2498762d2c": {
            "command": "score",
            "fields": [
                "temptations.max"
            ],
            "replyFamily": "named-counter-score",
            "outcome": "line",
            "evidence": "Isolated SCORE prints current temptations and possible bound; no numeric Score."
        },
        "e4cadbffba2ccf39a90e60eff4cada926867309b8a411f940d6a1c5ac3361db8": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "inform-score",
            "outcome": "line",
            "statusPair": [
                "Score",
                "Moves"
            ],
            "additionalProbes": [
                {
                    "command": "diagnose",
                    "fields": [
                        "diagnosis"
                    ],
                    "replyFamily": "physical-readiness",
                    "outcome": "line"
                }
            ],
            "evidence": "Current isolated SCORE maximum and DIAGNOSE physical report return usable LineInput."
        },
        "1ff9cbc61afe49dcf958163c4c556b8895943457d52cd728ddc06ba175b2529e": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "estimated-score",
            "outcome": "line",
            "evidence": "Current isolated SCORE explicitly prints possible maximum with oh-let's-say wording and returns LineInput."
        },
        "eb643fc02303d51032ac5646176eeedd91e588e41883458451af87c8800295e9": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "colloquial-score",
            "outcome": "line",
            "evidence": "Current SCORE prints points/current maximum; FULL SCORE repeats total with no additional initial fields."
        },
        "ec1d545f32842e29c69f6b586be88b2773a0f2d24e36c3e84bb7fef80d1c842a": {
            "command": "score",
            "fields": [
                "tasks.max"
            ],
            "replyFamily": "assigned-tasks",
            "outcome": "line",
            "rejectedForms": [
                "diagnose"
            ],
            "evidence": "Current isolated SCORE prints completed/assigned tasks and returns LineInput; FULL SCORE historically identical."
        },
        "5fe1406def45c0df5edb65362ec9fa2b840f3f30ab34169d92750b654ef5b114": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "short-of-full-score",
            "outcome": "line",
            "evidence": "Isolated SCORE returns bracketed remaining-points relationship and usable LineInput after intro."
        },
        "db3d6ec5262f8be84b697349068af922c0fb3750f281c89735969ffbce168ea9": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "inform-score",
            "outcome": "line",
            "evidence": "Current first Equipment and reopen verified Score 0/100 from isolated SCORE; SCORING describes rules only."
        },
        "abf145d22371f825f13388587d92632bcde90582698f774b896b123a90e1fb1e": {
            "command": "score",
            "fields": [
                "score.max",
                "rank"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "dce7e6f757fb8379dea9da9c13cdda5412ba03fa9b70d79fb6b8c7faf5970692": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "potential-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "7847ff3387dc401c511f67349d2847691ba97990f28e9c9d8b1182f3d4bc0dc0": {
            "command": "score",
            "fields": [
                "score.max"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "3c5656897dd2503610945e80a0b42fc5d25614d967a010ace8e9cafd12f978a3": {
            "statusTurnsMetric": "galactic-time",
            "command": "score",
            "fields": [
                "score.max",
                "rank",
                "day",
                "time"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "1d9a69257349060823893f4cfa616f1040a3b41cbf38a6717199f206cd8f678c": {
            "command": "score",
            "fields": [
                "score.max",
                "rank"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "91f78d4bbb6bcea5b3a6047e1efbb0ae1efa1c2382d360e679285526125babb3": {
            "command": "score",
            "fields": [
                "score.max",
                "rank"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "e3341f28a0cca7a2e7bdf151c7b31b16124e77f31bf0e0e1349be2e6ae2fbe5e": {
            "command": "score",
            "fields": [
                "score.max",
                "health"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "8600730257949c099fa9c0b3ebf2ebed5038578b9bb9e5be2b0adb63a8786180": {
            "command": "score",
            "fields": [
                "score.max",
                "rank"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion."
        },
        "570571dbc15e311d550fe271151a830e9a8be546e2a8e3305005f24d618db80e": {
            "command": "score",
            "fields": [
                "score.max",
                "locations.max",
                "treasures",
                "rank"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion.",
            "statusPair": [
                "Score",
                "Moves"
            ]
        },
        "0cdbf89e4714a102d6b0a487235546903a1f8f3880cc081bef83d87b123b49f5": {
            "command": "score",
            "fields": [
                "score.max",
                "locations.max"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion.",
            "statusPair": [
                "Score",
                "Moves"
            ]
        },
        "4b2bcd860fa1a2be066e433e273166b6c4bfc44838fa873e6aa66e2c52ba39de": {
            "command": "score",
            "fields": [
                "score.max",
                "locations.max"
            ],
            "replyFamily": "extended-score",
            "outcome": "line",
            "evidence": "Historical isolated SCORE establishes reported fields; current missing-field verification required before checklist completion.",
            "statusPair": [
                "Score",
                "Moves"
            ]
        }
    },

    probeFactsForIdentity: function (identity) {
        if (!identity) return null;
        var collaboration = typeof ModuleStatFactsClaude !== "undefined" ? ModuleStatFactsClaude
            : (typeof module !== "undefined" && module.exports ? require("./ModuleStatFactsClaude.js") : {});
        var base = StatTracker.MeasuredProbeFacts[identity.digest], extra = collaboration[identity.digest], local = StatTracker.SupplementalProbeFacts[identity.digest];
        return base || extra || local ? Object.assign({}, base || {}, extra || {}, local || {}) : null;
    },

    measuredProbe: function (command) {
        try {
            if (typeof ModuleLibrary === "undefined" || !ModuleLibrary.currentExecutableIdentity) return null;
            var identity = ModuleLibrary.currentExecutableIdentity();
            var fact = StatTracker.probeFactsForIdentity(identity);
            if (fact && fact.command !== command) fact = (fact.additionalProbes || []).filter(function (p) { return p.command === command; })[0];
            if (!fact || fact.command !== command || fact.outcome !== "line") return null;
            var executableHeader = identity.header || identity.bytes;
            var provenGlulx=/^(?:gblorb|ulx)$/.test(identity.format||'')
                && fact.format==='glulx' && fact.validatedForm===true
                && typeof fact.replyFamily==='string' && fact.replyFamily.length>0
                && executableHeader && executableHeader.length>=4
                && executableHeader[0]===0x47 && executableHeader[1]===0x6c
                && executableHeader[2]===0x75 && executableHeader[3]===0x6c;
            if(provenGlulx)return fact;
            // An authenticated isolated reply is the exact-form proof. The
            // loaded provider must additionally verify the lexical token;
            // absent providers fail closed rather than canAsk's old fallback.
            if (typeof Actionable === "undefined" || !Actionable.isGameWord
                || !Actionable.isGameWord(fact.command)) return null;
            return fact;
        } catch (e) { return null; }
    },

    measuredScoreProbe: function () { return StatTracker.measuredProbe("score"); },

    rejectedProbeForm: function (command) {
        try {
            var owner = StatTracker.probeFactsForIdentity(ModuleLibrary.currentExecutableIdentity());
            return !!(owner && owner.rejectedForms && owner.rejectedForms.indexOf(command) >= 0);
        } catch (e) { return false; }
    },

    measuredStatusPair: function () {
        try {
            var identity = ModuleLibrary.currentExecutableIdentity();
            var fact = StatTracker.probeFactsForIdentity(identity);
            return fact && fact.statusPair || null;
        } catch (e) { return null; }
    },

    // Command-owned combat relationships. Bounds are an interval, never a
    // current/maximum gauge; no numeric sample is stored in capability facts.
    // E5b: one reply family, with or without a weapon, armor or injury:
    // "You wield only your FISTS" / "You wield the TWO-HANDED SWORD"; the health
    // sentence in its full-complement or its "Hit Points" form.
    // Actual Treasures save (#1844/#1845): a carried load adds a native
    // qualifier after the odds -- "82% (burdened somewhat by your load)." --
    // which the strict grammar rejected, so Damage/Hit odds went unavailable.
    // Only that bounded burden clause is accepted, not arbitrary parentheses.
    PROWESS_REPLY: /^(?:prowess\s*)?You wield (?:only your|the|your|an?) [^.!?\n]+\. Adjusting for your abilities and progress, you do from (\d+) to (\d+) points of damage with each successful blow\. Your odds of striking true are (\d+)%(?: \((?:[a-z]+ )?burdened(?: [a-z]+){0,4} by your load\))?\. Your armor is (?:only your|the|your|an?) [^.!?\n]+\. (?:You are uninjured, with your full complement of (\d+) Hit Points\.|[^.!?\n]*\bHit Points\b[^.!?\n]*\.)(?: [^\n]*)?\s*$/i,

    applyProwessReply: function (text) {
        var match = /Adjusting for your abilities and progress, you do from (\d+) to (\d+) points of damage with each successful blow\. Your odds of striking true are (\d+)%(?: \((?:[a-z]+ )?burdened(?: [a-z]+){0,4} by your load\))?\./i.exec(String(text || ""));
        if (!match || +match[1] > +match[2] || +match[3] > 100) return false;
        var model = StatTracker.model();
        model.stats.damage = { key: "damage", label: "Damage", value: +match[1], upper: +match[2],
            unit: "range", kind: "counter", confirmed: true, seen: StatTracker.CONFIRM_SAMPLES, source: "prowess-command" };
        model.stats["hit odds"] = { key: "hit odds", label: "Hit odds", value: +match[3],
            unit: "percent", kind: "gauge", confirmed: true, seen: StatTracker.CONFIRM_SAMPLES, source: "prowess-command" };
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        return true;
    },

    applyProgressReply: function (text) {
        // Keep the measured qualitative report; never invent a percentage.
        var match = /^You have barely gotten started\.$/im.exec(String(text || "").replace(/\u00a0/g, " ").trim());
        if (!match) return false;
        StatTracker.model().stats.progress = { key: "progress", label: "Progress", value: match[0],
            max: null, unit: "text", kind: "counter", confirmed: true,
            seen: StatTracker.CONFIRM_SAMPLES, source: "status-command" };
        if (StatTracker._key) StatTracker.save(StatTracker._key, StatTracker.model());
        return true;
    },

    MEASURED_METRIC_REPLIES: {
        "assigned-tasks": /^You have so far completed (\d+) of the (\d+) tasks assigned you\.$/i,
        "named-counter-score": /^You have achieved (-?\d+) out of a possible (\d+) ([A-Za-z][A-Za-z ]{0,24})(?:, in (\d+) turns?)?\.$/i,
        "labelled-holiness": /^Your current ([A-Za-z]+) is (-?\d+) out of a possible \1 of (\d+), in (\d+) moves?\.$/i,
        "possessive-magic": /^([A-Za-z][A-Za-z '-]*)'s magic is currently at (-?\d+)\.$/i
    },

    measuredMetricProbes: function () {
        try {
            var identity = ModuleLibrary.currentExecutableIdentity();
            var owner = StatTracker.probeFactsForIdentity(identity);
            return owner ? [owner].concat(owner.additionalProbes || []).filter(function (fact) {
                return fact.command !== "score" && StatTracker.MEASURED_METRIC_REPLIES[fact.replyFamily] && StatTracker.measuredProbe(fact.command);
            }) : [];
        } catch (e) { return []; }
    },

    applyMeasuredMetricReply: function (fact, text) {
        var family=fact&&fact.replyFamily, custom=String(text||"").replace(/\u00a0/g," "), values={}, match;
        if(family==='chapter-regions') {
            match=/^You've made it to chapter ([a-z -]+|\d+) \(out of ([a-z -]+|\d+)\), exploring ([a-z -]+|\d+) regions? \(out of ([a-z -]+|\d+)\)\. And never forget that at first you chose ([^.\n]+)\.$/im.exec(custom);
            if(match){let nums=match.slice(1,5).map(x=>/^\d+$/.test(x)?+x:StatTracker.parseCardinal(x));if(nums.every(x=>x!=null)){values.chapter={label:'Chapter',value:nums[0],max:nums[1]};values.regions={label:'Regions explored',value:nums[2],max:nums[3]};values['first choice']={label:'First choice',value:match[5],unit:'text'};}}
        } else if(family==='achievement-list') {
            if(/^Achievements for [^:\n]+:$/im.test(custom)){
                let entries=custom.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[A-Za-z][^\n]+\s+\( [^()\n]+ \)$/.test(x));
                if(entries.length)values.achievements={label:'Achievements',value:entries.join('; '),unit:'text'};
            }
        } else if(family==='completed-adventure') {
            match=/^You have completed (\d+)% of this adventure in (\d+) moves?\.$/im.exec(custom);
            if(match&&+match[1]<=100){
                values.complete={label:'Complete',value:+match[1],unit:'percent'};values.turns={label:'Turns',value:+match[2]};
                var spent=/^You spent (\d+) turns? in the ([^.\n]+)\. This accounts for (\d+)% of your time\.$/img, entry, summary=[];
                while((entry=spent.exec(custom))){
                    if(+entry[3]>100)continue;
                    summary.push(entry[2]+': '+entry[1]+' turns ('+entry[3]+'%)');
                }
                if(summary.length)values['time spent']={label:'Time spent',value:summary.join('; '),unit:'text'};
            }
        } else if(family==='metaphysical-quota') {
            match=/^You have amassed a metaphysical quota of (-?\d+) out of a possible (\d+), in (\d+) turns?\.$/im.exec(custom);
            if(match){values.quota={label:'Metaphysical quota',value:+match[1],max:+match[2]};values.turns={label:'Turns',value:+match[3]};}
        } else if(family==='adventurers-killed') {
            match=/^You have so far killed (\d+) adventurers in (\d+) turns?\.$/im.exec(custom);
            if(match){values.adventurers={label:'Adventurers killed',value:+match[1]};values.turns={label:'Turns',value:+match[2]};}
        } else if(family==='perfect-score') {
            match=/^You are a perfect (-?\d+)\.$/im.exec(custom);
            if(match)values.score={label:'Score',value:+match[1]};
        } else if(family==='casualty-cycles') {
            match=/^There have been (\d[\d,]*) casualties \(original population: (\d[\d,]*)\) in (\d+) cycles?\.$/im.exec(custom);
            if(match){values.casualties={label:'Casualties',value:+match[1].replace(/,/g,'')};values.population={label:'Original population',value:+match[2].replace(/,/g,'')};values.cycles={label:'Cycles',value:+match[3]};}
        } else if(family==='mule-report') {
            if(!/^Status report: MULE$/im.test(custom))return false;
            const date=/^Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})$/im.exec(custom), time=/^Time:\s*(\d{1,2}:\d{2}\s*[ap]m)$/im.exec(custom), location=/^Location:\s*([^\n]+)$/im.exec(custom), value=/^According to my estimation, the objects I have collected have a total value of approximately (\d+) hundred dollars American\.$/im.exec(custom);
            if(date)values.date={label:'Date',value:date[1],unit:'text'};
            if(time)values.time={label:'Time',value:time[1],unit:'text'};
            if(location)values.location={label:'Robot location',value:location[1].trim(),unit:'text'};
            if(value)values.value={label:'Value (hundred dollars American)',value:+value[1]};
        }
        if(Object.keys(values).length){
            var customModel=StatTracker.model();
            Object.keys(values).forEach(function(key){var v=values[key];customModel.stats[key]={key:key,label:v.label,value:v.value,max:v.max==null?null:v.max,unit:v.unit||(v.max==null?'plain':'fraction'),kind:'counter',confirmed:true,seen:StatTracker.CONFIRM_SAMPLES,source:'module-command',boundSource:v.max==null?undefined:'module-command',readAt:Date.now()};});
            if(family==='casualty-cycles'){delete customModel.stats.score;delete customModel.stats.turns;delete customModel.globals.score;delete customModel.globals.turns;customModel.scoreUnavailable=true;}
            if(StatTracker._key)StatTracker.save(StatTracker._key,customModel);
            return (fact.fields||[]).every(function(k){k=k.replace(/\.max$/,'');return values[k]||customModel.stats[k]&&customModel.stats[k].readAt>=StatTracker._fulfillmentStartedAt;});
        }

        if (fact && fact.replyFamily === "shutdown-progress") {
            var m = StatTracker.model(), input = String(text||"").replace(/\u00a0/g," "), wrote=false;
            var families=[[/^You have seen (none|[a-z -]+|\d+) of the keys that fit in the desk\.$/im,"keys seen","Keys seen"],[/^You have turned (none|[a-z -]+|\d+) of these keys\.$/im,"keys turned","Keys turned"],[/^As far as preparing yourself for shutdown, you have (none|[a-z -]+|\d+) of the ([a-z -]+|\d+) necessary elements\.$/im,"shutdown elements","Shutdown elements"]];
            families.forEach(function(family){ var match=family[0].exec(input); if(!match)return; var value=match[1]==="none"?0:StatTracker.parseCardinal(match[1]), max=match[2]?StatTracker.parseCardinal(match[2]):null; if(value==null)return; m.stats[family[1]]={key:family[1],label:family[2],value:value,max:max,unit:max==null?"plain":"fraction",kind:"counter",confirmed:true,seen:StatTracker.CONFIRM_SAMPLES,source:"module-command",boundSource:max==null?undefined:"module-command",readAt:Date.now()};wrote=true; });
            if(wrote && StatTracker._key)StatTracker.save(StatTracker._key,m);
            return wrote && fact.fields.every(function(key){return m.stats[key]&&m.stats[key].readAt>=StatTracker._fulfillmentStartedAt;});
        }
        var special = fact && /^(?:paired-counter-score|ribbon-progress-score|turns-only-score|percent-progress-score|no-score-turns|hunt-status|rivals-progress)$/.test(fact.replyFamily);
        if (special) {
            var model = StatTracker.model(), input = String(text || "").replace(/\u00a0/g, " "), values = {}, match;
            if (fact.replyFamily === "rivals-progress") {
                match=/^Thus far, you have eliminated (none|[a-z -]+|\d+) of your rivals\. This gives you the rank of ([^.\n]+?)(?:, still)?\.$/im.exec(input);
                if(match){var count=match[1]==="none"?0:StatTracker.parseCardinal(match[1]);if(count==null)return false;values.progress={label:"Rivals eliminated",value:count};model.rank=match[2];}
            } else if (fact.replyFamily === "hunt-status") {
                match = /^The (?:creature|beast|animal) is (still alive)\. You're (still alive) also\. Score it yourself\.$/im.exec(input);
                if(match){values.quarry={label:"Quarry",value:match[1],unit:"text"};values.health={label:"Health",value:match[2],unit:"text"};}
            } else if (fact.replyFamily === "paired-counter-score") {
                match = /^The score is: \(([A-Za-z]+) (-?\d+)\/([A-Za-z]+) (-?\d+)\)$/im.exec(input);
                if (match) { values[match[1].toLowerCase()] = {label:match[1],value:+match[2]}; values[match[3].toLowerCase()] = {label:match[3],value:+match[4]}; }
            } else if (fact.replyFamily === "ribbon-progress-score") {
                match = /^You have experienced approximately (\d+) percent of this entry, earning you the coveted "([^"\n]+)" [A-Za-z]+ ribbon\.$/im.exec(input);
                if (match && +match[1] <= 100) { values.progress = {label:"Progress",value:+match[1],unit:"percent"}; model.rank = match[2]; }
            } else if (fact.replyFamily === "percent-progress-score") {
                match = /^You have so far scored (\d+)% in (\d+) turns?\.$/im.exec(input);
                if (match && +match[1] <= 100) { values.progress={label:"Progress",value:+match[1],unit:"percent"}; values.turns={label:"Turns",value:+match[2]}; }
            } else if (fact.replyFamily === "no-score-turns") {
                match = /^No score 0 at all, but 0, you have this many turns(\d+)\s*\.Hmm\.\.$/im.exec(input);
                if (match) { values.turns={label:"Turns",value:+match[1]}; model.scoreUnavailable=true; delete model.stats.score; }
            } else {
                match = /^After (\d+) turns?, you still haven't found the truth about yourself\.$/im.exec(input);
                if (match) { values.turns = {label:"Turns",value:+match[1]}; values.progress = {label:"Progress",value:"you still haven't found the truth about yourself",unit:"text"}; model.scoreUnavailable = true; delete model.stats.score; }
            }
            if (!match || !Object.keys(values).length) return false;
            Object.keys(values).forEach(function(key) { var value=values[key]; model.stats[key] = {key:key,label:value.label,value:value.value,max:null,unit:value.unit||"plain",kind:"counter",confirmed:true,seen:StatTracker.CONFIRM_SAMPLES,source:"module-command",readAt:Date.now()}; });
            if (StatTracker._key) StatTracker.save(StatTracker._key,model);
            return true;
        }
        var pattern = fact && StatTracker.MEASURED_METRIC_REPLIES[fact.replyFamily];
        if (!pattern) return false;
        var match = String(text || "").split(/\r?\n/).map(function (line) { return pattern.exec(line.trim()); }).filter(Boolean)[0];
        if (!match) return false;
        var namedCounter = fact.replyFamily === "named-counter-score";
        var assignedTasks = fact.replyFamily === "assigned-tasks";
        var key = assignedTasks ? "tasks" : fact.replyFamily === "possessive-magic" ? "magic" : StatTracker.canonKey(namedCounter ? match[3] : match[1]);
        if (!(fact.fields || []).some(function (field) { return field === key || field === key + ".max"; })) return false;
        var maximum = namedCounter || assignedTasks ? +match[2] : fact.replyFamily === "labelled-holiness" ? +match[3] : null;
        var model = StatTracker.model(), previous = model.stats[key];
        model.stats[key] = { key: key, label: assignedTasks ? "Tasks" : namedCounter ? match[3] : maximum != null ? match[1] : match[1] + "'s magic", value: +(namedCounter || assignedTasks ? match[1] : match[2]),
            max: maximum, unit: maximum != null ? "fraction" : "plain", kind: maximum != null ? "gauge" : "counter",
            confirmed: true, seen: StatTracker.CONFIRM_SAMPLES, source: previous && /^(?:status|global:)/.test(previous.source) ? previous.source : "module-command",
            boundSource: maximum != null ? "module-command" : undefined, readAt: Date.now() };
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        return true;
    },

    needsMeasuredMetricProbe: function (fact) {
        return (fact.fields || []).some(function (field) {
            var bound = /^(.*)\.max$/.exec(field), key = bound ? bound[1] : field;
            var reading = StatTracker.model().stats[key];
            if (!reading || !reading.confirmed) return true;
            if (reading.readAt >= StatTracker._fulfillmentStartedAt) return false;
            return bound ? reading.max == null || reading.boundSource === "module-command" : !StatTracker.hasPassiveMetric(key);
        });
    },

    needsScoreProbe: function () {
        if (StatTracker.model().scoreUnavailable && !(StatTracker.measuredScoreProbe() && StatTracker.measuredScoreProbe().replyFamily === "casualty-cycles")) return false;
        try {
            var identity = ModuleLibrary.currentExecutableIdentity();
            var owner = StatTracker.probeFactsForIdentity(identity);
            if (owner && owner.rejectedForms && owner.rejectedForms.indexOf("score") >= 0) return false;
        } catch (e) {}
        if (!StatTracker.hasPassiveMetric(StatTracker.scoreMetricKey(StatTracker.model()))) return true;
        // D208: a status-sourced score whose column is no longer shown (narrow
        // row, or rejected) is a stale reading -- ask the story again.
        var sk = StatTracker.model().stats[StatTracker.scoreMetricKey(StatTracker.model())];
        if (sk && sk.source === "status" && !StatTracker.statusShowsScore(StatTracker.model())) return true;
        var fact = StatTracker.measuredScoreProbe();
        // A current grid/RAM score does not prove a command-only denominator.
        // Re-read that relationship on opening; a real grid denominator wins.
        return !!(fact && fact.fields.some(function (field) {
            if (field === "rank") return true; // command-owned rank refreshes on opening
            var bound = /^(.*)\.max$/.exec(field);
            var s = StatTracker.model().stats[bound ? bound[1] : field];
            return bound ? (!s || s.max == null || /^(?:score|module)-command$/.test(s.boundSource || ""))
                : (!StatTracker.hasPassiveMetric(field) || s.source === "score-command");
        }));
    },

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
            var authoredText = /^(Time|Season|Date|Tone|Memory)\s*[:=]\s*(.+)$/i.exec(String(col).trim());
            if (authoredText && !/^-?\d+(?:\s*\/\s*\d+|%)?$/.test(authoredText[2])) {
                var textKey = StatTracker.canonKey(authoredText[1]);
                out[textKey] = { key: textKey, label: authoredText[1], value: authoredText[2].trim(), max: null, unit: "text" };
                return;
            }
            var time = /^Time\s*[:=]\s*(\d{1,2}:\d{2}(?:\s*[ap]m)?|\d+\s+(?:seconds?|minutes?|hours?|days?)|Unstarted)$/i.exec(String(col).trim());
            if (time) {
                out.time = { key: "time", label: "Time", value: time[1], max: null, unit: "text" };
                return;
            }
            var m = StatTracker.COLUMN_STAT.exec(String(col).trim());
            if (!m) return;
            var key = StatTracker.canonKey(m[1]);
            if (!key) return;
            // Same rule as StatusGridDecoder.add: the first health column is
            // the player's (Treasures lists enemies after the player).
            if (key === "health" && out.health) return;
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
        /score would be (-?\d+)\s*\(total of (\d+) points\)(?:, in (\d+) moves?)?/i,
        /score is (-?\d+)\s+out of a possible (\d+)(?:, in (\d+) moves?)?/i,
        /score is (-?\d+)\s+points out of (\d+)(?:, in (\d+) moves?)?/i,
        /score is (-?\d+)\s*\(of (\d+) points\)/i,
        /(?:You've|You have) scored (-?\d+) points out of a (?:maximum|possible) total of (\d+)/i,
        /achieved a score of (-?\d+) points out of a possible (\d+)/i,
        /score would be (-?\d+)\s*\[total of (\d+) points\](?:, in (\d+) moves?)?/i,
        /score is (-?\d+)\s*\(out of (\d+) possible\)/i,
        /scored (-?\d+) out of a possible, oh, let's say, (\d+), and in (\d+) turns? no less\./i,
        /You have like (-?\d+) points out of (\d+)(?:, in (\d+) turns?)?/i,
        /^Grunk have (-?\d+) out of (\d+) so far\.?$/im,
        // Inform: "You have so far scored 36 out of a possible 350, in 1 turn,
        // earning you the rank of Adventurer."
        /scored\s+(\d+)\s+out of a possible\s+(\d+)\s*(?:points)?[,;]?\s*(?:in\s+(\d+)\s+turns?)?/i,
        // Measured Inform variant: "You have scored 0 out of 60 points."
        /scored\s+(\d+)\s+out of\s+(\d+)\s*(?:points)?[,;]?\s*(?:in\s+(\d+)\s+turns?)?/i,
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
        /rank of\s*:?\s*"?([^".\n]+?)"?\s*[.\n]/i,
        /class of\s+([^.\n]+?)\s*[.\n]/i,
        /ranking of\s+([^.\n]+?)\s*[.\n]/i,
        /giving you the rank of\s+([^.\n]+?)\s*[.\n]/i,
        /earning you the status of\s+([^.\n]+?)\s*(?:[.\n]|$)/i,
        /making you (?:an? )?([A-Za-z][^.\n]+?)\s*(?:[.\n]|$)/i,
        /(?:This|which) makes you (?:an? )?([A-Za-z][^.\n]+?)\s*(?:[.\n]|$)/i,
        /earning you the same level of respect as ([^.\n]+?)\./i,
        /which makes you -- ([^.\n]+?)\./i,
        /the kind of score one would expect of the ([^.\n]+?)\./i,
        /meaning you (failed the admission criteria)\./i,
        /in \d+ turns?,\s*\n([A-Z][A-Za-z '-]+)\./i
    ],
    // LDoDoom answers this outright. A positive finding, not a failure.
    NO_SCORE: /there is no scoring in this game|(?:there is|there's) no score in this (?:story|game)|there is no numerical score|score is not kept|no score obtains|this game (?:has no|does not have a) score/i,

    parseScoreReply: (text) => {
        var t = String(text || "").replace(/\u00a0/g, " ");
        if (!t) return null;
        if (/^There is no score\./im.test(t)) return {scored:false,unavailable:true};
        if (/^You have yet to truly score, and that's why you're here\.$/im.test(t)) return {scored:false,unavailable:true};
        // Make It Good's own SCORE reply (S6): the game keeps no score; recognising it stops the per-open re-probe.
        if (/^What score do you want\? Either someone takes the rap or you do\.$/im.test(t)) return {scored:false,unavailable:true};
        if (/^"You don't get scores in the Secret Service - there is only success and failure\." \(SPSS Spy's Manual, page 12\)$/im.test(t)) return {scored:false,unavailable:true};
        if (StatTracker.NO_SCORE.test(t)) return { scored: false, unavailable: true };
        var potential = /Your potential is (-?\d+) of a possible (\d+)(?:, in (\d+) moves?)?/i.exec(t);
        if (potential) return {scored:true,score:+potential[1],max:+potential[2],turns:potential[3]==null?null:+potential[3],rank:null,label:"Potential"};
        var short = /You're ([a-z][a-z -]*?|\d+) points? short of the full (\d+)\./i.exec(t);
        if (short) {
            var remaining = StatTracker.parseCardinal(short[1]);
            if (remaining != null) return { scored: true, score: +short[2] - remaining, max: +short[2], turns: null, rank: null };
        }
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
        var reLabel = /(experience|xp|exp)\s*[:=]\s*(-?\d+)(?!\d|\s*\/)/ig;
        while ((m = reLabel.exec(t))) take(m[1], m[2], null);
        // Remove the whole fraction before the bare-number matcher can read
        // its denominator as current EXP (Building's measured SCORE form).
        var words = t.replace(/(-?\d+)\s+out of\s+(\d+)\s+experience\s+points?\b/ig, function (whole, current, maximum) {
            take("experience", current, maximum);
            out.experience.boundSemantics = "maximum";
            return " ";
        });
        var reWords = /(-?\d+)\s+experience\s+points?\b/ig;
        while ((m = reWords.exec(words))) take("experience", m[1], null);
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
        return model && /^(?:experience|quota|adventurers)$/.test(model.scoreMetricKey || "") ? model.scoreMetricKey : "score";
    },

    recordPrintedMetrics: function (model, text, command) {
        var printed = StatTracker.parsePrintedMetrics(text) || {};
        if (!model) return false;
        var scoreCommand = /^score\s*$/i.test(String(command || "").trim());
        if (scoreCommand) {
            var locations = /^You have visited (\d+) locations \(out of (\d+) in the game\)\.$/im.exec(String(text||"").replace(/\u00a0/g," "));
            locations = locations || /(?:You have|You've) visited (\d+) (?:out of (\d+) locations|locations out of a maximum (\d+)(?: locations)?)/i.exec(String(text||"").replace(/\u00a0/g," "));
            locations = locations || /visited (\d+) locations out of a maximum (\d+)/i.exec(String(text||"").replace(/\u00a0/g," "));
            if(locations) printed.locations={key:"locations",label:"Locations visited",value:+locations[1],max:+(locations[2]||locations[3]),unit:"fraction"};
            var treasures=/dropped (\d+) treasures in the wellhouse/i.exec(String(text||""));
            if(treasures)printed.treasures={key:"treasures",label:"Treasures deposited",value:+treasures[1],max:null,unit:"plain"};
            var galactic = StatTracker.measuredScoreProbe();
            if(galactic && (galactic.fields||[]).indexOf("day")>=0){
                var day=/\bIt is Day (\d+) of your adventure\./i.exec(String(text||""));
                if(day)printed.day={key:"day",label:"Day",value:+day[1],max:null,unit:"plain"};
                var clock=/Current Galactic Standard Time(?: \([^)]*\))? is (\d+)\./i.exec(String(text||""));
                if(clock)printed.time={key:"time",label:"Galactic Standard Time",value:+clock[1],max:null,unit:"plain"};
            }
            var progressFact=StatTracker.measuredScoreProbe();
            if(progressFact&&progressFact.replyFamily==='mystery-progress-score'){
                var milestone=/^You have so far scored -?\d+ out of a possible \d+ points; you are ([^.\n]+)\.$/im.exec(String(text||''));
                if(milestone)printed.progress={key:'progress',label:'Progress',value:milestone[1],max:null,unit:'text'};
            }
            var certainty = /\bYour certainty is ([A-Za-z][A-Za-z '-]*)\./i.exec(String(text || ""));
            if (certainty) printed.certainty = { key: "certainty", label: "Certainty", value: certainty[1], max: null, unit: "text" };
            var task = /^You have (completed) your divine Task\.$/im.exec(String(text || ""));
            if (task) printed.task = { key: "task", label: "Task", value: task[1], max: null, unit: "text" };
        }
        if (!Object.keys(printed).length) return false;
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
                    seen: StatTracker.CONFIRM_SAMPLES, source: scoreCommand ? "score-command" : "printed",
                    boundSource: rec.max != null && scoreCommand ? "score-command" : undefined,
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
            if (prev.source !== "status" && !/^global:/.test(String(prev.source || ""))) prev.source = scoreCommand ? "score-command" : prev.source || "printed";
            // Denominator is re-read when the story states it again (same rule
            // as n/m gauges elsewhere): never invent, never latch forever.
            if (rec.max != null) {
                prev.max = rec.max;
                prev.unit = "fraction";
                prev.kind = "gauge";
                if (scoreCommand) prev.boundSource = "score-command";
            } else if (prev.boundSemantics === "next-target" && prev.max != null && rec.value >= prev.max) {
                prev.max = null;
                prev.unit = "plain";
                prev.kind = "counter";
            }
            if (rec.value !== prev.value) {
                var delta = rec.value - prev.value;
                prev.value = rec.value;
                if (had && isFinite(delta) && typeof rec.value === "number") StatTracker.emitChange(model, k, delta);
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
    PHYSICAL_READINESS_REPLY: /^Well, you have a stomach full of [A-Za-z][A-Za-z '-]*, but you're ready to [A-Za-z][A-Za-z '-]*\.$/i,
    parseDiagnoseReply: (text) => {
        var t = String(text || "");
        if (!t || /not a verb|don't know the word/i.test(t)) return null;
        var out = {};
        var direct = t.split(/\r?\n/).filter(function (line) {
            return /^(?:You (?:are|feel|seem|have)|You're)\b/i.test(line.trim()) && !/["\u201c\u201d]/.test(line);
        }).join("\n");
        StatTracker.DIAGNOSE_SCALES.forEach(function (scale) {
            for (var i = 0; i < scale.steps.length; i++) {
                if (scale.steps[i][0].test(direct)) {
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
        // These measured replies state qualitative facts, without defining an
        // ordered scale. Preserve their words rather than inventing a band.
        if (!out.health) {
            var health = /^You feel (fine|just dandy)(?:[.,]|$)/im.exec(t)
                || /^You are (?:a )?(healthy)(?: human being| and sober)?[.,]/im.exec(t)
                || /^You're (still alive|feeling just dandy|in good health)(?:[.,]|$)/im.exec(t)
                || /^Hang on a moment\.\.\. yes, you're (still breathing)\./im.exec(t);
            if (/^Your virtual body's integrity appears to be normal\.$/im.test(t)) health = [null,"normal"];
            if (/^Feeling quite well, thanks\.$/im.test(t)) health = [null,"quite well"];
            if (/^You are in good health(?:[.,]|$)/im.test(t)) health = [null,"good"];
            if (/^You feel great, somehow as if you'd just been taught new tricks\.$/im.test(t)) health = [null,"great"];
            if (/^You're in peak physical condition; as peak as can be expected for a Classics student\.$/im.test(t)) health = [null,"peak physical condition"];
            if (/^You are wide awake, and are in good health\.$/im.test(t) || /^In all other respects, you are in good health\.$/im.test(t)) health = [null,"good"];
            if (/^You're in good enough shape to accomplish your goal\.$/im.test(t)) health = [null,"good enough shape"];
            if (/^You feel well-rested, and you are well-fed\. In all other respects, you are in good health\.$/im.test(t)) health = [null,"good"];
            if (/^Your health is good, but you feel a bit worried about your family\.$/im.test(t)) health = [null, "good"];
            if (health) out.health = { key: "health", value: health[1], unit: "text" };
            if (/^Never have you been in better health\.$/im.test(t)) out.health = { key: "health", value: "Never have you been in better health.", unit: "text" };
        }
        var memory = /^You feel fine, and your memory is (unimpaired)\./im.exec(t);
        if (/^On the verge of swooning from hunger\.$/im.test(t)) out.hunger = { key: "hunger", value: "On the verge of swooning from hunger.", unit: "text" };
        if (memory) out.memory = { key: "memory", value: memory[1], unit: "text" };
        if (/^You are healthy and sober\./im.test(t)) out.sobriety = { key: "sobriety", value: "sober", unit: "text" };
        var physical = t.split(/\r?\n/).map(function (line) { return StatTracker.PHYSICAL_READINESS_REPLY.exec(line.trim()); }).filter(Boolean)[0];
        if (physical) out.diagnosis = { key: "diagnosis", value: physical[0], unit: "text" };
        return Object.keys(out).length ? out : null;
    },

    isOwnedStandardScoreLine: function (text) {
        var t=String(text||"").trim();
        if (/^In a total of \d+ turns?, you have achieved a score of -?\d+ points out of a possible \d+\.$/i.test(t))return true;
        if (/^You have scored -?\d+ out of \d+, in this many turns: \d+ \.{2,}$/i.test(t))return true;
        if (/^You have so far scored -?\d+ out of a possible \d+, in \d+ turns?, which tells me you're still in the cell, aren't you\? Go on, admit it\.$/i.test(t))return true;
        if (/^(?:This (?:score )?gives you (?:a |the )rank of|Graded on the curve, you are in the class of|This makes you) [A-Za-z][^.!?\n]*\.$/i.test(t)) return true;
        var base=/^(?:You have(?: so far)? scored -?\d+ out of (?:a possible )?\d+(?: points)?(?:,? in \d+ turns?)?|Your score (?:would be|is) -?\d+(?: \((?:total of|out of|of) \d+ points\)| (?:out of|of) a possible \d+)(?:, in \d+ (?:moves?|turns?))?)/i.exec(t);
        if(!base)return false;
        var tail=t.slice(base[0].length);
        return /^(?:\.|,)?$/.test(tail)
            || /^, (?:(?:earning you the (?:rank|status) of|giving you the rank of|which gives you the rank of|making you (?:an? )?|which makes you -- |the kind of score one would expect of the |meaning you )[^.!?\n]+)\.$/i.test(tail)
            || /^\. (?:This (?:score )?gives you (?:a |the )rank of|This makes you|Graded on the curve, you are in the class of) [^.!?\n]+\.$/i.test(tail);
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
    // D208: is the status row showing a score this story's own SCORE reply
    // has not contradicted, right now?
    statusShowsScore: function (model) {
        try {
            if (model && model.statusScoreRejected) return false;
            var now = StatTracker.statsFromColumns(StatTracker.splitColumns(StatTracker.statusText()));
            return !!(now.score && typeof now.score.value === "number");
        } catch (e) { return false; }
    },

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
        // D208: but only while the row is ACTUALLY showing a trusted score.
        // A narrow row drops the column (D137), and a row the game's own SCORE
        // reply contradicted is no longer read -- then nothing else will move
        // the figure, and skipping froze it (Perilous Magic held 0 after
        // "[Your score has just gone up by one point.]").
        if (s.source === "status" && StatTracker.statusShowsScore(model)) return;

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
        // D209: only a delta applied to the SCORE itself is a fresh score
        // reading; where the delta drives experience/quota/adventurers the
        // score row did not move (Codex #1552).
        if (metricKey === "score") StatTracker._scoreFreshTick = StatTracker._turn;
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
    // Many endings print a "*** ... ***" banner, but not all: Hitchhiker's
    // prints "Better luck next life." with no stars. Banner classification is
    // descriptive only; counting is done by settleEnding() below (D215).
    BANNER: /\*{3,}\s*([^*\n]{1,90}?)\s*\*{3,}/g,
    classifyBanner: (inner) => {
        var t = String(inner || "").toLowerCase();
        if (!t) return null;
        if (/\b(won|win|victorio|triumph|congratulat)/.test(t)) return "win";
        if (/\b(quit|session|have left|end of session)/.test(t)) return "quit";
        if (/\b(died|dead|death|killed|slain|fatal|eaten|devoured|lost your life)\b/.test(t)) return "death";
        return "candidate";
    },

    // ---- D215 P-DEATH: endings at a settled terminal prompt ----------------
    // No universal death field exists (HHG's death turn changes no globals),
    // so the outcome is the game's own words, bounded by deterministic framing:
    // one player submission (never the app's own probes), its output without
    // the input echo, and the next new input request. A terminal prompt needs a
    // choice line among the last three output lines; the outcome needs a
    // complete phrase, never a keyword. "Death of a Salesman" is a heading.
    // RESTORE output can count: HHG's clock kills the player in the very turn
    // a save is restored. Replayed transcript is never a submission at all.
    // Each phrase must END the sentence or banner ("You are dead." / "****
    // You have died ****"), so "you are dead tired" is not a death.
    // LLR3/W&W: "*** You have been killed in combat ***".
    DEATH_PHRASE: /\b(?:you have died|you are dead|your body is never found|you have been killed\b[^.!?*\n]{0,60}|better luck next life)\s*(?:[.!*]|$)/im,
    WIN_PHRASE: /\b(?:you have won|you are victorious)\s*(?:[.!*]|$)/im,
    unquoted: (text) => String(text || "").replace(/"[^"\n]*"|“[^”\n]*”/g, " "),
    // Quoted dialogue (a quote holding a space) is removed before a line can be
    // a menu; a single quoted option label such as "RESTART" stays.
    undialogued: (text) => String(text || "").replace(/"[^"\n]*\s[^"\n]*"|“[^”\n]*\s[^”\n]*”/g, " "),
    isTerminalMenuLine: (line) => {
        var t = StatTracker.undialogued(line);
        if (!/\b(?:restart|restore)\b/i.test(t)) return false;
        var options = {};
        (t.match(/\b(?:restart|restore|quit|undo|hints?|amusing)\b/gi) || []).forEach(function (o) {
            options[o.toLowerCase().replace(/s$/, "")] = 1;
        });
        if (Object.keys(options).length < 2) return false;
        return /\b(?:would you like|do you (?:want|wish))\b/i.test(t) || /\(\s*type\b[^)]*\bor\b/i.test(t);
    },
    // A death banner holding a complete phrase ("**** You have died ****") is
    // itself the authored transition even when the story resurrects the
    // player without an end menu, as Zork I does on its first deaths.
    classifyEnding: (lines) => {
        var kept = (lines || []).map(function (s) { return String(s || ""); })
            .filter(function (s) { return s.trim() && !/^[\s>:]*$/.test(s); });
        if (!kept.length) return null;
        var body = StatTracker.unquoted(kept.join("\n"));
        var bannerDeath = (body.match(new RegExp(StatTracker.BANNER.source, "g")) || [])
            .some(function (b) { return StatTracker.DEATH_PHRASE.test(b); });
        var win = StatTracker.WIN_PHRASE.test(body);
        if (!kept.slice(-3).some(StatTracker.isTerminalMenuLine)) return bannerDeath ? (win ? "unknown" : "death") : null;
        var death = bannerDeath || StatTracker.DEATH_PHRASE.test(body);
        return death && win ? "unknown" : death ? "death" : win ? "win" : "unknown";
    },
    // A restore, restart or undo can print a real ending (HHG's clock kills the
    // player in the restored turn), but its DOM output could in principle hold
    // replayed text. Such endings count only if the cue passed through the
    // engine's own Glk output calls during that submission. Where the engine
    // cannot be tapped (Glulx), they stay excluded.
    RESTORE_LIKE: /^\s*(?:restore|restart|undo|load)\s*$/i,
    PAUSE_WORDING: /\b(?:hit|press|strike) (?:return|enter|any key|a key|space)\b|\[\s*more\s*\]|\(\s*more\s*\)/i,
    _engineOut: "",
    _engineCapture: false,   // true only during a restore-like submission
    tapEngine: function () {
        if (typeof window === "undefined") return;
        var z = window.__PARCHLOCK_ZVM__, G = z && z.Glk;
        if (!G || G.__plEngineTap) return;   // tapped once per engine instance
        G.__plEngineTap = true;
        Object.keys(G).filter(function (k) { return /^glk_put_(?:char|string|buffer|jstring)/.test(k); }).forEach(function (k) {
            var original = G[k];
            if (typeof original !== "function") return;
            var payload = /_stream/.test(k) ? 1 : 0;   // stream variants: (stream, payload)
            G[k] = function () {
                if (!StatTracker._engineCapture) return original.apply(this, arguments);
                try {
                    var a = arguments[payload];
                    var text = typeof a === "number" ? String.fromCharCode(a)
                        : typeof a === "string" ? a
                        : (a && a.length != null ? Array.prototype.map.call(a, function (c) { return String.fromCharCode(c); }).join("") : "");
                    var out = StatTracker._engineOut + text;
                    StatTracker._engineOut = out.length > 8000 ? out.slice(-8000) : out;
                } catch (eTap) {}
                return original.apply(this, arguments);
            };
        });
    },
    _ending: null,
    _promptSeen: typeof WeakSet !== "undefined" ? new WeakSet() : null,
    collectEnding: function (spans) {
        var sub = StatTracker._lastSubmission;
        if (!sub || !sub.submissionId) return;
        var epoch = sub.pageEpoch || "";
        var e = StatTracker._ending;
        if (!e || e.subId !== sub.submissionId || e.pageEpoch !== epoch) {
            // An answer to a pause inside an ending continues that ending, not
            // a new episode: a bare RETURN, or any text typed at a pause that
            // followed a death or win phrase (HHG: "Put on your peril-sensitive
            // sunglasses... Hit RETURN" ignores whatever is typed). Bounded.
            var carry = e && e.pageEpoch === epoch && e.eligible && !e.settled && sub.source !== "stat-probe"
                && e.pausedWithCue && (e.carries || 0) < 3;
            if (carry) {
                e.subId = sub.submissionId;
                e.carries = (e.carries || 0) + 1;
                e.pausedWithCue = false;
                e.enginePrev = e.engineOut || "";
            } else {
                e = StatTracker._ending = {
                    episodeId: sub.submissionId, subId: sub.submissionId, pageEpoch: epoch, lines: [],
                    settled: false, eligible: sub.source !== "stat-probe",
                    restoreLike: StatTracker.RESTORE_LIKE.test(String(sub.command || ""))
                };
            }
        }
        if (!e.eligible || e.settled) return;
        e.engineOut = (e.enginePrev || "") + (StatTracker._engineOut || "");
        (spans || []).forEach(function (s) { if (!s.input) e.lines.push(s.text); });
        if (e.lines.length > 400) e.lines.splice(0, e.lines.length - 400);
    },
    // Each Glk input request renders a fresh .Input element, so an element not
    // seen before is a new request generation. A request that shows neither an
    // end menu nor a death banner (a key-press or RETURN pause inside an
    // ending) leaves the episode open; the next request decides.
    // `injected` ({ request, line }) lets a fixture stand in for the DOM.
    settleEnding: function (injected) {
        var e = StatTracker._ending;
        if (!e || !e.eligible || e.settled || !StatTracker._promptSeen) return;
        if (!injected && typeof document === "undefined") return;
        var line = injected ? !!injected.line : document.querySelector(".Input.LineInput");
        var request = injected ? injected.request : (line || document.querySelector(".Input.CharInput"));
        if (!request || StatTracker._promptSeen.has(request)) return;
        StatTracker._promptSeen.add(request);
        if (!e.lines.length) return;
        var outcome = StatTracker.classifyEnding(e.lines);
        if (!outcome) {
            // Carry only across a pause the story itself announced (a key
            // request, or "Hit RETURN" / "[MORE]" wording) after a complete
            // death or win phrase; never across an ordinary prompt.
            var said = StatTracker.unquoted(e.lines.join("\n"));
            var kept = e.lines.filter(function (s) { return String(s || "").trim() && !/^[\s>:]*$/.test(s); });
            var authoredPause = !line || StatTracker.PAUSE_WORDING.test(kept.slice(-2).join(" "));
            e.pausedWithCue = authoredPause && (StatTracker.DEATH_PHRASE.test(said) || StatTracker.WIN_PHRASE.test(said));
            return;
        }
        if (e.restoreLike && (outcome === "death" || outcome === "win")) {
            var engine = StatTracker.unquoted(e.engineOut || "");
            var cue = outcome === "death" ? StatTracker.DEATH_PHRASE : StatTracker.WIN_PHRASE;
            if (!cue.test(engine)) outcome = "unknown";
        }
        e.settled = true;
        if (outcome === "death" || outcome === "win") StatTracker.countEnding(outcome, e);
    },
    countEnding: function (outcome, e) {
        var model = StatTracker.model();
        var id = "ending|" + e.pageEpoch + "|" + e.episodeId;
        if (model.seenBanners[id]) return;
        model.seenBanners[id] = 1;
        var readSite = null;   // corroboration only: where the story asked for input
        try {
            var z = typeof window !== "undefined" ? window.__PARCHLOCK_ZVM__ : null;
            if (z && typeof z.pc === "number") readSite = z.pc + "/" + (z.frames ? z.frames.length : "?");
        } catch (eZ) {}
        var totals = null;
        try { if (typeof SaveState !== "undefined" && SaveState.recordOutcome) totals = SaveState.recordOutcome(outcome, id); } catch (eHistory) {}
        if (totals) { model.deaths = totals.deaths; model.wins = totals.wins; }
        if (outcome === "death") {
            if (!totals) model.deaths = (model.deaths || 0) + 1;
            StatTracker._events.push({ type: "death", text: "game ending", count: model.deaths, readSite: readSite });
        } else {
            if (!totals) model.wins = (model.wins || 0) + 1;
            StatTracker._events.push({ type: "win", text: "game ending", readSite: readSite });
        }
        if (StatTracker._key) StatTracker.save(StatTracker._key, model);
        StatTracker.showEndingNotice(outcome, outcome === "death" ? model.deaths : model.wins);
    },
    clearEndingNotice: function () {
        clearTimeout(StatTracker._endingNoticeTimer);
        StatTracker._endingNoticeTimer = null;
        try { var node = document.getElementById("pl-ending-notice"); if(node)node.remove(); } catch(e) {}
    },
    showEndingNotice: function (outcome, count) {
        if(typeof document === "undefined" || !document.body || !document.createElement)return;
        StatTracker.clearEndingNotice();
        var node = document.createElement("div");
        node.id = "pl-ending-notice";
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        node.setAttribute("aria-atomic", "true");
        node.textContent = (outcome === "death" ? "You died. Deaths" : "You won. Wins") + " this playthrough: " + count;
        document.body.appendChild(node);
        StatTracker._endingNoticeTimer = setTimeout(StatTracker.clearEndingNotice, 8000);
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

    syncPlaythrough: function (model) {
        model = model || StatTracker.model();
        try {
            var totals = typeof SaveState !== "undefined" && SaveState.outcomes ? SaveState.outcomes() : null;
            if (totals) { model.deaths = totals.deaths; model.wins = totals.wins; }
        } catch (eHistory) {}
        return model;
    },

    load: (key) => {
        var m = StatTracker.blank();
        try {
            if (typeof localStorage === "undefined") return StatTracker.syncPlaythrough(m);
            var mem=typeof ZRamProvider!=="undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            var id=typeof LearningStores!=="undefined" ? LearningStores.identity(mem,false) : null;
            if(!id || id.identityKey!==key) return StatTracker.syncPlaythrough(m);
            var result=LearningStores.readOwned("stats",id);
            var raw=result.value;
            if (!raw) return StatTracker.syncPlaythrough(m);
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
        return StatTracker.syncPlaythrough(m);
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
    _saveReplacer: (k, v) => (k === "badgeUntil" || k === "badgeDelta" || k === "lastChange") ? undefined : v,
    // P13b R2: the persisted projection keeps only learned item-metric pins
    // (prop != null; forgetReadings drops the rest on load anyway) and the
    // latest SEEN_BANNERS_MAX ending ids (each carries its page epoch, so an
    // older one can never recur). The live model is not mutated.
    SEEN_BANNERS_MAX: 64,
    persistView: function (model) {
        if (!model || typeof model !== "object") return model;
        var out = Object.assign({}, model);
        if (model.itemMetrics) {
            var im = {};
            Object.keys(model.itemMetrics).forEach(function (id) {
                var recs = model.itemMetrics[id] || {}, kept = null;
                Object.keys(recs).forEach(function (f) { if (recs[f] && recs[f].prop != null) (kept || (kept = {}))[f] = recs[f]; });
                if (kept) im[id] = kept;
            });
            out.itemMetrics = im;
        }
        if (model.seenBanners) {
            var ids = Object.keys(model.seenBanners);
            if (ids.length > StatTracker.SEEN_BANNERS_MAX) {
                var sb = {};
                ids.slice(-StatTracker.SEEN_BANNERS_MAX).forEach(function (id) { sb[id] = model.seenBanners[id]; });
                out.seenBanners = sb;
            }
        }
        return out;
    },
    learningKeyFor: (i) => (i && typeof i.identityKey === "string" && i.identityKey ? StatTracker.STORAGE_PREFIX + i.identityKey : null),
    save: (key, model) => {
        try {
            if (typeof localStorage === "undefined" || !key) return;
            var mem=typeof ZRamProvider!=="undefined" && ZRamProvider.getMem ? ZRamProvider.getMem() : null;
            var id=typeof LearningStores!=="undefined" ? LearningStores.identity(mem,false) : null;
            if(!id || id.identityKey!==key) return;
            // D17: badgeUntil/badgeDelta/lastChange are presentation state that
            // load() resets anyway; persisting them only dirties the compare.
            // A replacer projects them out without mutating the live model.
            var json = JSON.stringify(StatTracker.persistView(model), StatTracker._saveReplacer);
            if (json === StatTracker._lastSaved) return;
            StatTracker._lastSaved = json;
            if (typeof LearningStores !== "undefined") LearningStores.persist("stats", { identityKey: key }, json, function () { if (StatTracker._key === key) { StatTracker._model = StatTracker.blank(); StatTracker._lastSaved = null; } });
            else localStorage.setItem(StatTracker.STORAGE_PREFIX + key, json);
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
        m.scoreUnavailable = false;
        m.scoreLabel = null;
        m.rank = null;
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
            if (/^(?:score|module)-command$/.test(s.boundSource || "")) {
                s.max = null;
                s.unit = "plain";
                delete s.boundSource;
            }
            s.confirmed = false;
            s.lastChange = null;
            s.badgeUntil = 0;
            s.badgeDelta = 0;
        });
        delete m.scorePinKnown;
        m.unavailableReason = null;
        try { StatTracker.cancelFulfillmentRetry(); } catch (eR) {}
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
        StatTracker.clearEndingNotice();
        try {
            StatTracker._aliasEv = null;               // D209: evidence is per timeline
            // D182 startup restore decline is the explicit new-game owner.
            // Native restart is owned once by Transcript, not by every resync.
            if (reason === "new-game" && typeof SaveState !== "undefined" && SaveState.startPlaythrough) SaveState.startPlaythrough(reason);
            StatTracker.forgetReadings(StatTracker.model(), reason === "restart" || reason === "new-game");
            StatTracker.syncPlaythrough();
            StatTracker._samples = [];
            StatTracker._probePending = null;
            StatTracker._probeTurns = 0;
            StatTracker._probeQueue = [];
            StatTracker._probeActive = null;
            clearTimeout(StatTracker._probeTimer);
            StatTracker._probeTimer = null;
            StatTracker.endProbeOwnership();
            StatTracker._events = [];
            StatTracker._ending = null;                // D215: an ending belongs to its timeline
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
        StatTracker.clearEndingNotice();
        StatTracker._aliasEv = null;                   // D209
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
        StatTracker._ending = null;             // D215
        StatTracker._engineOut = "";
        StatTracker._engineCapture = false;
        StatTracker._metaVerbCache = null;      // D207: never across stories
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
            // D208: the compiler sets the same Flags1 bit for a time status line
            // in v4+ too (measured: 14 catalogue stories, e.g. Perilous Magic,
            // 905, I-0, Gumshoe, Jigsaw). There the GAME draws the row, so the
            // bit does not decide the row's labels -- it marks a story whose
            // "Score/Moves" slots may carry hours/minutes.
            // In v4+ the interpreter rewrites Flags1 with its own capability
            // bits at load, so the compiler's bit is read from the story file.
            else {
                var original = null;
                try {
                    var ident = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableIdentity
                        ? ModuleLibrary.currentExecutableIdentity() : null;
                    var fileHeader = ident && (ident.header || ident.bytes);
                    if (fileHeader && fileHeader[0] === h.version) original = fileHeader[1];
                } catch (eId) {}
                out.timeFlag = original != null && !!(original & 0x02);
            }
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
        try { var id=LearningStores.identity(mem,false); key=id && id.identityKey; } catch(e) {}
        var story = "";
        try { story = (typeof ParchLock !== "undefined" && ParchLock.GameFilename) || ""; } catch (eStory) {}
        if (StatTracker._key !== key || StatTracker._storyFile !== story) {
            StatTracker._key = key;
            StatTracker._storyFile = story;
            StatTracker._samples = [];
            StatTracker._lastSaved=null;
            StatTracker._model=key ? StatTracker.load(key) : StatTracker.blank();
            // V4+ has no interpreter-defined turns slot. Legacy behavioral
            // pins can be room ids or offset counters; rederive this session.
            if (facts && facts.version > 3) delete StatTracker._model.globals.turns;
            StatTracker._storyEpoch++;
            StatTracker._probeDisclosureEpoch = -1;
        }
        var model = StatTracker.syncPlaythrough(StatTracker.model());
        if (facts.clockGame) {
            var scoreFact = StatTracker.measuredScoreProbe();
            if (scoreFact && (scoreFact.fields||[]).indexOf("score.max")>=0) model.scoreUnavailable = false;
            else model.scoreUnavailable = true;
        }

        var observed = StatTracker.statsFromColumns(StatTracker.splitColumns(statusRaw));
        // D208: a status field the game's own SCORE reply contradicted is not
        // read; and a v4+ story whose header carries the time-status bit is
        // checked for the same hours/minutes-in-score-slots layout.
        if (model.statusScoreRejected || facts.timeFlag) {
            // Inform's time games put hours/minutes in the same two slots as
            // score/moves ("Score: 17  Moves: 4" wide, "17/4" narrow). Once the
            // story's own reply has disproved the score reading, a pair that
            // also MOVES like a clock -- minutes step while the hour holds, or
            // roll over into the next hour -- is shown as the time it is.
            var clockPair = null;
            if (observed.score && observed.turns) clockPair = [observed.score.value, observed.turns.value];
            else StatTracker.splitColumns(statusRaw).some(function (c) {
                var bare = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(c);
                if (bare) clockPair = [parseInt(bare[1], 10), parseInt(bare[2], 10)];
                return !!bare;
            });
            if (clockPair && clockPair[0] >= 0 && clockPair[0] <= 23 && clockPair[1] >= 0 && clockPair[1] <= 59) {
                // The compiler's own time-status bit plus a clock-shaped pair in
                // those slots is structural evidence on its own.
                if (facts.timeFlag && !model.statusIsClock) { model.statusIsClock = true; model.statusTurnsRejected = true; }
                var prevClock = model.clockPrev;
                if (prevClock && (prevClock[0] !== clockPair[0] || prevClock[1] !== clockPair[1])) {
                    var mins = function (p) { return p[0] * 60 + p[1]; };
                    var step = (mins(clockPair) - mins(prevClock) + 1440) % 1440;
                    if (step > 0 && step <= 120) { model.statusIsClock = true; model.statusTurnsRejected = true; }
                }
                model.clockPrev = clockPair;
                if (model.statusIsClock) {
                    // Those slots never held a score: drop any reading taken from them.
                    if (model.stats.score && model.stats.score.source === "status") delete model.stats.score;
                    var h12 = clockPair[0] % 12 === 0 ? 12 : clockPair[0] % 12;
                    observed.time = { key: "time", label: "Time", unit: "text",
                        value: h12 + ":" + (clockPair[1] < 10 ? "0" : "") + clockPair[1] + (clockPair[0] < 12 ? " am" : " pm") };
                }
            }
            // Only a proven layout loses its score column; a time-flagged story
            // whose row carries a genuine (non-clock) score keeps it.
            if (model.statusScoreRejected || model.statusIsClock) delete observed.score;
        }
        if (model.statusTurnsRejected) {
            delete observed.turns;
            // A turns figure read from that column was never a turn count.
            if (model.stats.turns && model.stats.turns.source === "status") delete model.stats.turns;
        }
        var measuredLayout = StatTracker.measuredScoreProbe();
        if(measuredLayout && /^(?:metaphysical-quota|adventurers-killed)$/.test(measuredLayout.replyFamily)){
            var customMetric=measuredLayout.replyFamily==='metaphysical-quota'?'quota':'adventurers';
            if(observed.score){observed[customMetric]=Object.assign({},observed.score,{label:customMetric==='quota'?'Metaphysical quota':'Adventurers killed'});delete observed.score;}
            model.scoreMetricKey=customMetric;delete model.stats.score;
            if(model.globals.score!=null){model.globals[customMetric]=model.globals.score;delete model.globals.score;}
        }
        if (measuredLayout && measuredLayout.replyFamily === "casualty-cycles") {
            delete observed.score;
            if(observed.turns){observed.cycles={label:"Cycles",value:observed.turns.value,unit:"plain"};delete observed.turns;}
            delete model.stats.score;delete model.stats.turns;delete model.globals.score;delete model.globals.turns;
            model.scoreUnavailable=true;
        }
        if (measuredLayout && measuredLayout.statusTurnsMetric === "galactic-time") {
            if (observed.turns) {
                observed.time = { label: "Galactic Standard Time", value: observed.turns.value, unit: "plain" };
                delete observed.turns;
            }
            delete model.stats.turns;
            delete model.globals.turns;
        }
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

        // D209: this tick's final status sightings, for the score-alias pairing.
        StatTracker._observedTick = { turn: StatTracker._turn, observed: observed };
        Object.keys(observed).forEach(function (k) {
            StatTracker.recordObservation(model, k, observed[k]);
        });
        StatTracker.observeConditions(statusRaw, { source: "status-grid", locator: "status-grid", authoritative: true });
        StatTracker.seedInterpreterStatus(model, facts, globals);
        StatTracker.seedRegionDepth(model, mem);
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
        prev.seen = Math.min((prev.seen || 1) + 1, StatTracker.CONFIRM_SAMPLES);
        prev.label = k === "score" && model.scoreLabel ? model.scoreLabel : rec.label;
        // The denominator of an n/m gauge is re-read every turn rather than
        // latched: TreasuresofaSlaversKingdom was only ever observed at full
        // health, so there is no evidence its maximum is fixed.
        // A grid often prints only the numerator. Absence of its denominator
        // must not erase a separate, current SCORE-owned relationship.
        if (rec.max != null || !/^(?:score|module)-command$/.test(prev.boundSource || "")) {
            prev.max = rec.max;
            prev.unit = rec.unit;
            if (rec.max != null) prev.boundSource = "status";
        }
        if (prev.seen >= StatTracker.CONFIRM_SAMPLES) prev.confirmed = true;
        if (rec.value !== prev.value) {
            var delta = rec.value - prev.value;
            prev.value = rec.value;
            if (hadReading && isFinite(delta) && typeof rec.value === "number") {
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
        var scoreFamily = k === "score" || (k === StatTracker.scoreMetricKey(model) && model.scoreMetricKey != null);
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
    // Historical D152: the same behavioural test ran for EVERY version rather than v3
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
    // October 7 correction: v4+ slot 2 can be location, not turns. This
    // interpreter-slot initializer now runs ONLY for interpreterStatus (v3).
    // V4+ uses promoteTurnCounter across all globals, with ambiguity retained
    // when candidate absolute sequences differ; old turn pins rederive on load.
    V3_MAX_STEP: 8,
    _v3: null,
    // LLR3 depth (regionDepth fact): the player's room's map region rank, read from RAM.
    seedRegionDepth: function (model, mem) {
        try {
            if (!mem || typeof MapTopology === "undefined" || !MapTopology.regionDepthTable) return;
            var t = MapTopology.regionDepthTable();
            if (!t) return;
            var pl = ZRamReader.resolvePlayer(mem), x = pl && pl.id, guard = 0, depth = null;
            while (x && guard++ < 8 && depth == null) {
                var region = t.byRoom[x];
                if (region) depth = t.ranks[region];
                x = ZRamReader.objectLinks(mem, x).parent;
            }
            if (depth == null) return;
            StatTracker.setSeeded(model, "depth", "Depth", depth, "counter", "region-depth");
        } catch (e) {}
    },

    seedInterpreterStatus: function (model, facts, globals) {
        if (!facts || !facts.interpreterStatus) return;
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

        var measuredLayout = StatTracker.measuredScoreProbe();
        if (measuredLayout && measuredLayout.replyFamily === "casualty-cycles") return;
        if (measuredLayout && measuredLayout.statusTurnsMetric === "galactic-time") {
            StatTracker.setSeeded(model, "time", "Galactic Standard Time", slot2, "counter", "global:2");
            model.globals.time = 2;
            return;
        }
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
        var measured = StatTracker.measuredScoreProbe();
        if (measured && measured.replyFamily === "casualty-cycles") return;
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
        // A labelled status/SCORE observation identifies the absolute counter
        // even when another timer advances with the same offset increments.
        hits = hits.filter(function (i) {
            return samples.every(function (s) {
                var printed = s.observed && s.observed.turns;
                return !printed || s.globals[i] === printed.value;
            });
        });
        if (!hits.length) return;
        // Equal increments alone do not establish equal absolute turns.
        // Copied counters may agree, but an offset timer must remain ambiguous.
        if (hits.some(function (i) {
            return samples.some(function (s) { return s.globals[i] !== s.globals[hits[0]]; });
        })) return;
        var idx = hits[0];
        model.globals.turns = idx;
        if (model.stats.turns && model.stats.turns.source === "status" &&
            !(samples[samples.length - 1].observed || {}).turns) {
            model.stats.turns.source = "global:" + idx;
        }
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
            var hasCurrentTick = StatTracker._observedTick && StatTracker._observedTick.turn === StatTracker._turn;
            var current = hasCurrentTick && StatTracker._observedTick.observed[k];
            var statusValue = hasCurrentTick ? (current ? current.value : null) : stat.value;
            if (stat.source === "status" && statusValue != null && statusValue !== v) {
                delete model.globals[k];                    // contradicted: demote
                return;
            }
            // A disappeared label is not a current contradiction. Keep the
            // proven RAM counter moving instead of freezing its old reading.
            if (stat.source === "status" && hasCurrentTick && !current) stat.source = "global:" + idx;
            if (v !== stat.value) {
                var delta = v - stat.value;
                stat.value = v;
                if (stat.confirmed === true) {
                    stat.lastChange = delta;
                    StatTracker.emitChange(model, k, delta);
                }
            }
            stat.confirmed = true;
            if (k === "score") { model.scorePinKnown = v; StatTracker._scoreFreshTick = StatTracker._turn; }   // D209 fresh reading
        });
    },

    // ---- D209 display alias: a labelled status metric that IS the score ----
    // Treasures prints its score as "QUEST RATE: n/500" while SCORE (with rank)
    // fills the Score row, so the sheet showed the same number twice. Equal
    // numbers at one moment prove nothing, so a pairing counts only when, in
    // the SAME tick, the metric was freshly sighted AND the score had a fresh
    // reading (SCORE reply, counted delta, pinned global). The alias needs the
    // metric's max to equal the SCORE-reply max and two DISTINCT matched values,
    // is display-only (both readings are kept; score learning is untouched),
    // splits on any fresh contradiction, stays split when ambiguous, and lives
    // only for the current story epoch (Resync/reset clear it).
    _aliasEv: null,
    _scoreFreshTick: -1,
    _observedTick: null,
    updateScoreAlias: function (model) {
        var ev = StatTracker._aliasEv;
        if (!ev || ev.epoch !== StatTracker._storyEpoch) ev = StatTracker._aliasEv = { epoch: StatTracker._storyEpoch, keys: {}, key: null };
        var obs = StatTracker._observedTick;
        if (StatTracker._scoreFreshTick !== StatTracker._turn || !obs || obs.turn !== StatTracker._turn) return;
        var sc = model.stats.score;
        if (!sc || typeof sc.value !== "number" || typeof sc.max !== "number" || sc.boundSource !== "score-command") return;
        Object.keys(obs.observed).forEach(function (k) {
            var o = obs.observed[k];
            // Only a CUSTOM authored label (Quest Rate) can be the score under
            // another name; canonical stats keep their own meaning (Codex #1545).
            if (StatTracker.isCanonicalStatKey(k) || !o || typeof o.value !== "number") { delete ev.keys[k]; return; }
            // A fresh max that no longer matches the SCORE-reply max invalidates
            // any evidence already gathered (Codex #1544).
            if (o.max !== sc.max) { delete ev.keys[k]; return; }
            var e = ev.keys[k] || (ev.keys[k] = { values: [] });
            if (o.value === sc.value) { if (e.values.indexOf(o.value) < 0) e.values.push(o.value); }
            else e.values = [];          // fresh contradiction: split, start over
        });
        var qualified = Object.keys(ev.keys).filter(function (k) { return ev.keys[k].values.length >= 2; });
        ev.key = qualified.length === 1 ? qualified[0] : null;   // two candidates: ambiguous, stay split
    },
    scoreAliasKey: function () {
        var ev = StatTracker._aliasEv;
        return ev && ev.epoch === StatTracker._storyEpoch ? ev.key : null;
    },
    // Canonical stat keys (the CANON authority plus the tracker's own derived
    // rows) are never aliased; an unknown authored label may be.
    isCanonicalStatKey: function (k) {
        var canon = {};
        Object.keys(StatTracker.CANON || {}).forEach(function (label) { canon[StatTracker.CANON[label]] = 1; });
        ["value", "weight", "capacity", "quota", "adventurers", "casualties", "population", "cycles", "progress", "damage", "hit odds", "complete"].forEach(function (x) { canon[x] = 1; });
        return !!canon[k];
    },
    // The merged row is drawn only while, RIGHT NOW, the metric and the score
    // agree in value and max under a SCORE-reply max. Otherwise both rows
    // render and the evidence is kept for a later fresh revalidation.
    displayScoreAlias: function (model) {
        var k = StatTracker.scoreAliasKey();
        // Measured semantic relationships survive restore; numeric readings
        // and dynamic qualification do not. Never dispatch by story title.
        try {
            var identity = typeof ModuleLibrary !== "undefined" && ModuleLibrary.currentExecutableIdentity
                ? ModuleLibrary.currentExecutableIdentity() : null;
            var facts = StatTracker.probeFactsForIdentity(identity);
            if (facts && Object.prototype.hasOwnProperty.call(facts, "scoreAliasField")) {
                k = facts.scoreAliasField;
                if (typeof k !== "string" || !k.trim() || StatTracker.isCanonicalStatKey(k)) return null;
            }
        } catch (eIdentity) { return null; }
        var sc = model.stats.score, m = k && model.stats[k];
        if (!k || !m || !m.confirmed || !sc || !sc.confirmed || model.scoreUnavailable) return null;
        if (sc.boundSource !== "score-command" || typeof sc.max !== "number") return null;
        if (m.value !== sc.value || m.max !== sc.max) return null;
        return k;
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
        var pocket = /^You have ([$\u00a3\u20ac])(\d+) in your pocket\.$/im.exec(String(text||"").replace(/\u00a0/g," "));
        if (!w && !c && !v && !pocket) return false;

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

        if (pocket) set("money","Pocket money",+pocket[2],"money",{symbol:pocket[1]});
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
        if (/^score\s*$/i.test(String(command || "").trim())) StatTracker.applyScoreReply(text);
        if (/^score\s*$/i.test(String(command || "").trim())) StatTracker.applyMeasuredMetricReply(StatTracker.measuredScoreProbe(), text);
        if (/^diagnose\s*$/i.test(String(command || "").trim())) StatTracker.applyDiagnoseReply(text);
        if (/^prowess\s*$/i.test(String(command || "").trim()) && StatTracker.measuredProbe("prowess")) StatTracker.applyProwessReply(text);
        StatTracker.recordPrintedMetrics(model, text, command);
        StatTracker.measuredMetricProbes().forEach(function (fact) {
            if (String(command || "").trim().toLowerCase() === fact.command ||
                (/^(?:inventory|i)$/i.test(String(command || "").trim()) && fact.replyFamily === "possessive-magic")) {
                StatTracker.applyMeasuredMetricReply(fact, text);
            }
        });
        // D215 P-DEATH: deaths and wins are no longer counted from loose output.
        // They are decided once per player submission, at the next settled
        // input request, by settleEnding().
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
        var progressFact = StatTracker.measuredScoreProbe();
        if(progressFact && progressFact.replyFamily === 'mystery-progress-score')StatTracker.recordPrintedMetrics(model,text,'score');
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
        // D208: what the status row claimed before this reply replaces it.
        var statusPrior = s.source === "status" ? { source: s.source, value: s.value } : null;
        s.value = parsed.score;
        if(parsed.label){model.scoreLabel=parsed.label;s.label=parsed.label;}
        // D175: the game stated this outright, so it is a valid pin baseline.
        model.scorePinKnown = parsed.score;
        model.scoreUnavailable = false;
        if (parsed.max != null) { s.max = parsed.max; s.unit = "fraction"; s.boundSource = "score-command"; }
        s.seen = Math.max(s.seen || 0, StatTracker.CONFIRM_SAMPLES);
        s.confirmed = true;
        model.stats.score = s;
        StatTracker._scoreFreshTick = StatTracker._turn;   // D209 fresh reading
        if (parsed.rank) model.rank = parsed.rank;
        // D208: the game's own SCORE reply outranks its status line. Perilous
        // Magic is a timed game whose status row prints the clock in the score
        // slots ("Score: 17  Moves: 0" at 5:00 pm; "17/3" when narrow) while
        // SCORE says "0 out of a possible 3". When the two disagree at the same
        // moment, that status field is wrong for this story: stop reading it,
        // and drop any RAM slot that was learned from it.
        try {
            var statusNow = StatTracker.statsFromColumns(StatTracker.splitColumns(StatTracker.statusText()));
            var sNow = statusNow.score;
            // Same moment, different number -- or a status "score" above the
            // maximum the story itself states, which no real score can be.
            var priorStatus = (statusPrior && statusPrior.source === "status" && typeof statusPrior.value === "number") ? statusPrior.value : null;
            var impossible = parsed.max != null && priorStatus != null && priorStatus > parsed.max;
            if ((sNow && typeof sNow.value === "number" && sNow.value !== parsed.score) || impossible) {
                model.statusScoreRejected = true;
                var memR = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
                var gR = memR ? StatTracker.readGlobals(memR) : [];
                if (model.globals && model.globals.score != null && gR[model.globals.score] !== parsed.score) {
                    delete model.globals.score;
                    s.source = "score-command";
                }
            }
            var tNow = statusNow.turns;
            if (parsed.turns != null && tNow && typeof tNow.value === "number" && Math.abs(tNow.value - parsed.turns) > 1) {
                model.statusTurnsRejected = true;
            }
        } catch (eRej) {}
        // The figure now rests on the game's stated total, not on a status
        // column that is absent or rejected.
        if (s.source === "status" && !StatTracker.statusShowsScore(model)) s.source = "score-command";
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
                value: p.value, unit: p.unit || "ordinal", kind: p.unit === "text" ? "counter" : "gauge", seen: StatTracker.CONFIRM_SAMPLES,
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
        // D209: one row when a labelled metric is proven to be the score -- the
        // story's own label, the score's value/max and rank.
        var alias = StatTracker.displayScoreAlias(model);
        Object.keys(model.stats).forEach(function (k) {
            var s = model.stats[k];
            if (!s || !s.confirmed) return;
            if (k === "score" && model.scoreUnavailable) return;
            if (alias && k === alias) return;
            if (alias && k === "score") s = Object.assign({}, s, { label: model.stats[alias].label, aliasOf: alias });
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
            out.push({ key: "deaths", label: "Deaths this playthrough", value: model.deaths,
                       unit: "plain", kind: "counter", confirmed: true, source: "observed" });
        }
        if (model.wins > 0) {
            out.push({ key: "wins", label: "Wins this playthrough", value: model.wins,
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
        var confirmed = StatTracker.visibleConditions();
        if (!confirmed.length) { if (previous) previous.remove(); return; }
        var section = document.createElement("div");
        section.className = "pl-conditions";
        var heading = document.createElement("p");
        heading.className = "pl-stat-label";
        heading.textContent = "Conditions";
        section.appendChild(heading);
        confirmed.forEach(function (rec) {
            var chip = document.createElement("span");
            chip.className = "pl-stat";
            chip.textContent = typeof LearnedWords !== "undefined" ? LearnedWords.label("status", rec.key, rec.label) : rec.label;
            section.appendChild(chip);
        });
        // P3: keep the live section when it is identical and still last;
        // replacing it every tick dirtied layout like the stat rows did.
        if (previous && previous === host.lastElementChild && previous.outerHTML === section.outerHTML) return;
        if (previous) previous.remove();
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
        var version = typeof BufferRevision !== "undefined" ? BufferRevision.versionReader() : null;
        for (var i = 0; i < lines.length; i++) {
            var text = StatTracker.lineText(lines[i]);
            StatTracker._lineCursor.set(lines[i], { text: text, generation: 0, ver: version ? version(lines[i]) : null });
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
        // A line no mutation has touched since its text was recorded cannot
        // have new output; skip re-reading it (innerText forces layout, and
        // this runs every tick over the whole session -- consensus #1830).
        var version = typeof BufferRevision !== "undefined" ? BufferRevision.versionReader() : null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var state = StatTracker._lineCursor.get(line);
            var ver = version ? version(line) : null;
            if (ver !== null && state && state.ver === ver) continue;
            var text = StatTracker.lineText(line);
            var id = StatTracker._lineIds.get(line);
            if (!id) { id = StatTracker._nextLineId++; StatTracker._lineIds.set(line, id); }
            if (!state) {
                state = { text: "", generation: 0 };
            }
            if (text === state.text) { state.ver = ver; StatTracker._lineCursor.set(line, state); continue; }
            var start = 0;
            if (text.indexOf(state.text) === 0) start = state.text.length;
            else state.generation++;
            var fresh = text.slice(start);
            StatTracker._lineCursor.set(line, { text: text, generation: state.generation, ver: ver });
            if (fresh.trim()) out.push({
                text: fresh,
                spanId: "line:" + id + ":" + state.generation + ":" + start + ":" + text.length,
                input: !!(line.querySelector && line.querySelector(".Style_input"))
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
        // D215: collect before anything else can throw, or the spans this tick
        // consumed would be lost to the ending.
        try { StatTracker.tapEngine(); StatTracker.collectEnding(spans); } catch (eCollect) {}

        // D167: read the score notification BEFORE observing, because pinning
        // the slot compares this turn's globals against the previous sample --
        // and observe() is what pushes the new one.
        StatTracker._pendingDelta = fresh ? StatTracker.parseScoreDelta(fresh) : null;

        StatTracker.observe(mem, StatTracker.statusText());
        StatTracker._pendingDelta = null;

        try { StatTracker.settleEnding(); } catch (eEnding) {}

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
                            // E3: the install-owned WARNING already covers this;
                            // never a second per-session popup once it was seen.
                            if (!StatTracker.inventoryWarningSeen()
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
        // D209: pair this tick's FINAL readings (after observe, replies and
        // deltas), never one source mid-update against another.
        try { StatTracker.updateScoreAlias(StatTracker.model()); } catch (eAlias) {}
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
        StatTracker._carrySpanOwned = false;    // D207
        if (!StatTracker._probeActive) StatTracker.endProbeOwnership();
        setTimeout(function () { StatTracker.runProbeQueue(); }, 0);
    },

    _carryProbeTimer: null,
    _carrySpanOwned: false,         // D207: carry probe owns its response span
    _carryProbeSentAt: 0,           // D195: bounds the in-flight guard
    _carryProbeSubmitting: false,

    requestCarryBootstrap: function () {
        if (StatTracker.hasQuestionPrompt()) return;
        try {
            if (StatTracker.rejectedProbeForm("inventory")) return;
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
                    if (StatTracker.lineInputHasDraft() || StatTracker.hasQuestionPrompt()) {
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
                    // D207: own the whole response span from submission, the
                    // same way a queued stat probe does, so no reply line is
                    // ever painted or spoken.
                    StatTracker._carrySpanOwned = true;
                    StatTracker._carryVerb = verb;
                    StatTracker.beginProbeOwnership();
                    var sent = false;
                    try { sent = Actionable.Submit(verb, "stat-probe"); }
                    finally { StatTracker._carryProbeSubmitting = false; }
                    if (!sent) {
                        StatTracker._carrySpanOwned = false;
                        if (!StatTracker._probeActive) StatTracker.endProbeOwnership();
                    }
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
        var liveRows = document.getElementById("pl-stats-rows");
        if (!host || !liveRows) return;
        // Render runs on every tick. Build off-document and touch the live
        // strip only when the markup actually changed: rebuilding identical
        // rows dirtied layout, and the next status read then re-laid-out the
        // whole story (P3, consensus #1843). State side effects below
        // (badgeUntil/lastChange) still run on every call.
        var rows = document.createElement("div");
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
            if (host.hidden) host.hidden = false;
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
            StatTracker.applyRows(liveRows, rows);
            var b0 = document.getElementById("pl-stats-identify");
            if (b0 && b0.hidden !== !!model.probed) b0.hidden = !!model.probed;
            return;
        }
        if (host.hidden) host.hidden = false;

        // Fulfillment state remains visible even when passive stats already
        // occupy the strip; otherwise an on-open command check looked idle.
        if (model.fulfillment === "checking" || model.fulfillment === "unavailable") {
            var stateHint = document.createElement("p");
            stateHint.className = "pl-stat-hint pl-stat-fulfillment";
            stateHint.textContent = model.fulfillment === "checking"
                ? "Checking this story for current status..."
                : "Some current status is unavailable at this prompt.";
            if (model.fulfillment === "unavailable" && model.unavailableReason) stateHint.title = StatTracker.UNAVAILABLE_TEXT[model.unavailableReason] || "Waiting for the game";
            rows.appendChild(stateHint);
        }

        stats.forEach(function (s) {
            var chip = document.createElement("div");
            chip.className = "pl-stat pl-stat-" + s.key.replace(/[^a-z0-9]+/gi, "-");
            chip.setAttribute("data-kind", s.kind || "counter");
            // Presentation only: authored text and ordinal bands need a full-width tile.
            chip.setAttribute("data-value-type", s.unit === "text" || s.unit === "ordinal" || typeof s.value === "string" ? "text" : "numeric");

            var label = document.createElement("span");
            label.className = "pl-stat-label";
            label.textContent = typeof LearnedWords !== "undefined" ? LearnedWords.label("status", s.key, s.label || s.key) : s.label || s.key;
            // A long name ("Deaths this playthrough") gets two grid columns so a word is never split (phone: "PLAYTHROUG/H").
            if (label.textContent.length > 14) chip.setAttribute("data-long-label", "1");
            chip.appendChild(label);

            var val = document.createElement("span");
            val.className = "pl-stat-value";
            if (s.unit === "ordinal") {
                val.textContent = s.band || "";
            } else if (s.unit === "range") {
                val.textContent = s.value + " to " + s.upper;
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

            if (model.rank && (s.key === "score" || (s.key === "progress" && !stats.some(function(stat){return stat.key==="score";})))) {
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
            // P4: the badge lifecycle lives on the MODEL record. D209 shows the
            // score under its alias as a presentation copy; clearing lastChange
            // on that copy left the real record set, so the badge restarted on
            // every render until the next change.
            var rec = model.stats[s.key] || s;
            if (rec.lastChange) {
                // A turn counter and a clock advance every single turn, so a
                // badge on those is not an event -- it is permanent clutter.
                // Only a change the player would want pointed out is marked.
                // D169: "Value +650" is exactly the event worth pointing out.
                // Weight and capacity move with it on the same turn, so
                // badging all three would say one thing three times.
                var worthMarking = (s.key !== "turns" && s.key !== "time"
                                    && s.key !== "weight" && s.key !== "capacity");
                if (worthMarking) {
                    rec.badgeDelta = rec.lastChange;
                    rec.badgeUntil = Date.now() + 1500;
                }
                rec.lastChange = null;
            }
            if (rec.badgeUntil && Date.now() < rec.badgeUntil && rec.badgeDelta) {
                var badge = document.createElement("span");
                badge.className = "pl-stat-badge " + (rec.badgeDelta > 0 ? "up" : "down");
                badge.textContent = (rec.badgeDelta > 0 ? "+" : "") + rec.badgeDelta;
                chip.appendChild(badge);
                chip.classList.add(rec.badgeDelta > 0 ? "pl-stat-up" : "pl-stat-down");
            }
            rows.appendChild(chip);
        });
        StatTracker.applyRows(liveRows, rows);

        var btn = document.getElementById("pl-stats-identify");
        if (btn && btn.hidden !== !!model.probed) btn.hidden = !!model.probed;
    },

    // Replace the live strip's children with the freshly built ones only when
    // the markup differs (an expiring badge or new value does differ).
    applyRows: function (live, built) {
        if (live.innerHTML === built.innerHTML) return;
        while (live.firstChild) live.removeChild(live.firstChild);
        while (built.firstChild) { var node = built.firstChild; built.removeChild(node); live.appendChild(node); }
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
            if (StatTracker.measuredProbe(verb)) return true;
            if (typeof Actionable === "undefined" || !Actionable.isGameWord) return true;
            return Actionable.isGameWord(verb);
        } catch (e) { return false; }
    },

    hasPassiveMetric: function (key) {
        var stat = StatTracker.model().stats[key];
        return !!(stat && /^(?:status|global:|player-prop:|interpreter)/.test(String(stat.source || "")));
    },

    isQuestionPromptText: function (text) {
        var t=String(text||'').replace(/\u00a0/g,' ').trim().replace(/\s*>+\s*$/,'');
        return /^[^"\n]{1,200}\?\s*(?:\((?:y\/n|yes\/no|yes or no)\)|y\/n)$/i.test(t)
            || /^Please answer yes or no\.?$/i.test(t)
            || /(?:remember if you are (?:man or woman|woman or man)|your waking self holds in his arms|Do you make art, or make love\?)\.?$/i.test(t)
            || /^Before anything, you must remember: is the one you embrace a man or a woman\?$/i.test(t)
            || /^Would you like to restore a saved session\?$/i.test(t)
            || /^Have you played interactive fiction before\?$/i.test(t)
            || /^Would you like to start a NEW game, RESTORE a saved game, start a SCRIPT, or QUIT\?$/i.test(t)
            || /Are you a BOY or a GIRL\?["']?$/i.test(t)
            // Measured startup questions (2026-10-05): Cragne Manor, The Path
            // to Fortune, Doom stories' recap offer, Scroll Thief's name/title.
            || /\?\s*\(Please type yes or no\.?\)$/i.test(t)
            || /\(Y\/N\)\?$/i.test(t)
            || /^Would you like the story so far\?$/i.test(t)
            || /^What do you want to write\?$/i.test(t)
            || /\(Mr, Ms, Mx\?\)$/i.test(t)
            || /^["']?And what's your name,[^?\n]+\?["']?$/i.test(t);
    },

    hasQuestionPrompt: function () {
        try {
            if(typeof document==='undefined')return false;
            var input=document.querySelector('.Input.LineInput');
            var line=input&&input.closest&&input.closest('.BufferLine');
            for(var count=0;line&&count<4;count++,line=line.previousElementSibling){
                var text=String(line.textContent||'').replace(/\u00a0/g,' ').trim();
                if(!text||/^(?:>|=>|>>)$/.test(text))continue;
                return StatTracker.isQuestionPromptText(text);
            }
        }catch(e){}
        return false;
    },

    // Which guard (if any) currently blocks a quiet status probe. The name is
    // recorded when a fulfillment ends "unavailable", so the cause of a
    // missing stat (e.g. Treasures Damage) is known, not guessed.
    probeBlockReason: function () {
        try {
            if (typeof document === "undefined") return "noDocument";
            if (StatTracker.lineInputHasDraft()) return "draft";
            if (StatTracker.hasQuestionPrompt()) return "question";
            if (typeof Navigator !== "undefined" && (Navigator.Running || Navigator.Awaiting)) return "navigator";
            if (!document.querySelector(".Input.LineInput")) return "noLineInput";
            if (document.querySelector(".Input.CharInput")) return "charInput";
            if (document.querySelector("#dialog, #dialog_frame, #dialog_screen")) return "dialog";
            if (typeof Message !== "undefined" && Message.IsOpen) return "message";
            return null;
        } catch (e) { return "error"; }
    },
    probeSafeNow: function () {
        return StatTracker.probeBlockReason() === null;
    },

    // One retry of the player's own Equipment request after it ended
    // "unavailable": only while Equipment stays open, in the same story,
    // with no player command in between, and only once the prompt is safe.
    // Never consumes a "press a key" prompt; never shows stale readings.
    _fulfillRetry: null,
    _fulfillTxn: 0,
    _retryTxn: -1,
    UNAVAILABLE_TEXT: {
        draft: "Waiting: there is text in the command line",
        question: "Waiting: the game is asking a question",
        navigator: "Waiting: auto-travel is in progress",
        noLineInput: "Waiting for the command prompt",
        charInput: "Waiting for a keypress",
        dialog: "Waiting: a file dialog is open",
        message: "Waiting: a message window is open",
        unrecognisedReply: "The game's reply to a status check was not recognised",
        submitRefused: "A status check could not be sent",
        noReply: "A status check got no reply in time",
        tooManyTurns: "A status check took too many turns"
    },
    _fulfillDiag: [],
    noteUnavailable: function (reason) {
        var model = StatTracker.model();
        model.unavailableReason = reason || "unknown";
        StatTracker._fulfillDiag.push({ t: Date.now(), reason: model.unavailableReason });
        if (StatTracker._fulfillDiag.length > 20) StatTracker._fulfillDiag.shift();
        // Once per request: the retry's own transaction (and anything it
        // queued, however late it fails) never arms another retry.
        if (StatTracker._retryTxn === StatTracker._fulfillTxn) return;
        StatTracker.cancelFulfillmentRetry();
        var retry = StatTracker._fulfillRetry = { epoch: StatTracker._storyEpoch, at: Date.now(), txn: StatTracker._fulfillTxn };
        try {
            if (typeof TurnRecorder !== "undefined" && TurnRecorder.subscribeAcceptedSubmit) {
                retry.unsubscribe = TurnRecorder.subscribeAcceptedSubmit("stat-fulfill-retry", function (event) {
                    if (event && event.source !== "stat-probe") StatTracker.cancelFulfillmentRetry();
                });
            }
        } catch (eS) {}
        retry.timer = setInterval(function () {
            if (StatTracker._fulfillRetry !== retry) return;
            var open = typeof EquipmentUI !== "undefined" && EquipmentUI.IsOpen && EquipmentUI.IsOpen();
            // A newer request (reopen/refresh) supersedes this one.
            if (!open || StatTracker._storyEpoch !== retry.epoch || StatTracker._fulfillTxn !== retry.txn
                || Date.now() - retry.at > 60000) { StatTracker.cancelFulfillmentRetry(); return; }
            if (!StatTracker.probeSafeNow() || StatTracker._probeActive || StatTracker._probeQueue.length) return;
            StatTracker.cancelFulfillmentRetry();
            StatTracker._retryNext = true;
            StatTracker.requestStatusFulfillment(false);
        }, 500);
    },
    cancelFulfillmentRetry: function () {
        var r = StatTracker._fulfillRetry;
        StatTracker._fulfillRetry = null;
        if (!r) return;
        clearInterval(r.timer);
        try { if (r.unsubscribe) r.unsubscribe(); } catch (e) {}
    },

    queueProbe: function (kind, verb, measuredFact) {
        if (!StatTracker.canAsk(verb)) return false;
        if (StatTracker._probeActive && StatTracker._probeActive.kind === kind && (kind !== "measured" || StatTracker._probeActive.verb === verb)) return true;
        if (StatTracker._probeQueue.some(function (p) { return p.kind === kind && (kind !== "measured" || p.verb === verb); })) return true;
        StatTracker._probeQueue.push({ kind: kind, verb: verb, attempts: 0, measuredFact: measuredFact || null });
        return true;
    },

    // E3: one-time inventory warning per installed module (operator wording).
    INVENTORY_WARNING_TITLE: '<span class="pl-warning-title">&#9888; WARNING</span>',
    INVENTORY_WARNING_BODY: "<p><strong>Opening your inventory is like rummaging through your bags.</strong></p>" +
        "<p>While ParchLock checks what you're carrying, some stories count it as a turn &mdash; " +
        "time passes in the game world while you're elbow-deep in your pack.</p>" +
        "<p>So maybe don't do it in the middle of a fight. Enemies find it terribly rude to be ignored, " +
        "and they get irate &mdash; and they <em>will</em> attack while you're not looking.</p>" +
        "<p>You'll only see this warning once for this story.</p>",
    _inventoryWarningKey: function () {
        try {
            var path = (typeof ParchLock !== "undefined" && (ParchLock.StoryPath || ParchLock.GameFilename)) || "";
            if (!path) return null;
            return (typeof ModuleLibrary !== "undefined" && ModuleLibrary.inventoryWarningKey)
                ? ModuleLibrary.inventoryWarningKey(path) : "PL_InvWarnSeen_" + path;
        } catch (e) { return null; }
    },
    inventoryWarningSeen: function () {
        var key = StatTracker._inventoryWarningKey();
        if (!key) return true;   // no module identity: never block probes on a warning
        try { return localStorage.getItem(key) === "1"; } catch (e) { return true; }
    },
    markInventoryWarningSeen: function () {
        var key = StatTracker._inventoryWarningKey();
        try { if (key) localStorage.setItem(key, "1"); } catch (e) {}
    },

    requestStatusFulfillment: function (explicit) {
        var model = StatTracker.model();
        var mode = StatTracker.D204Valve.mode();
        // E3 (operator): a one-time WARNING per installed module, on the first
        // Equipment open -- opening the inventory is itself the turn-costing
        // act. Shown before every probe guard (valve, draft, question), which
        // still apply after it closes. The module key is captured now, so the
        // acknowledgement can never land on a different module. Re-armed only
        // by uninstalling/reinstalling (ModuleLibrary.removeFlags).
        if (!explicit && !StatTracker.inventoryWarningSeen()) {
            var epoch = StatTracker._storyEpoch, warnKey = StatTracker._inventoryWarningKey();
            // No "type any letter" footer (operator): the phone keyboard does
            // not open on a popup, and the ✕ already closes it.
            Message.Show(StatTracker.INVENTORY_WARNING_TITLE, StatTracker.INVENTORY_WARNING_BODY, true, function () {
                try { if (warnKey) localStorage.setItem(warnKey, "1"); } catch (eW) {}
                if (!Message.IsOpen && StatTracker._storyEpoch === epoch && warnKey === StatTracker._inventoryWarningKey()
                    && typeof EquipmentUI !== "undefined" && EquipmentUI.IsOpen()) {
                    StatTracker.requestStatusFulfillment(false);
                }
            });
            StatTracker.Render();
            return;
        }
        if (mode === "off" && !explicit) return;
        // Each request is a transaction. A player request supersedes any
        // pending retry; the retry marks its own transaction as consumed.
        StatTracker._fulfillTxn = (StatTracker._fulfillTxn || 0) + 1;
        if (StatTracker._retryNext) { StatTracker._retryNext = false; StatTracker._retryTxn = StatTracker._fulfillTxn; }
        else StatTracker.cancelFulfillmentRetry();
        model.probed = true;
        model.fulfillment = "checking";
        model.unavailableReason = null;
        // A draft blocks the whole transaction, not merely INVENTORY. SCORE or
        // DIAGNOSE must never overtake a skipped first command.
        if (StatTracker.lineInputHasDraft() || StatTracker.hasQuestionPrompt()) {
            model.fulfillment = "unavailable";
            StatTracker.noteUnavailable(StatTracker.probeBlockReason());
            StatTracker.Render();
            return;
        }
        // Disclose before starting any probe. Otherwise the inventory timer
        // submits behind this modal, is refused, and never collects its reply.
        var prowessFact = StatTracker.measuredProbe("prowess");
        var needsProwess = prowessFact && prowessFact.fields.some(function (key) { return !StatTracker.hasPassiveMetric(key); });
        var progressFact = StatTracker.measuredProbe("status");
        var needsProgress = progressFact && progressFact.replyFamily === "progress-status";
        StatTracker._fulfillmentStartedAt = Date.now();
        var metricProbes = StatTracker.measuredMetricProbes().filter(StatTracker.needsMeasuredMetricProbe);
        var needsNotice = metricProbes.length || needsProgress || needsProwess || (StatTracker.needsScoreProbe() && StatTracker.canAsk("score"))
            || (!StatTracker.rejectedProbeForm("diagnose") && !StatTracker.hasPassiveMetric("health") && StatTracker.canAsk("diagnose"));
        // Inventory keeps its narrowly proven span ownership (pl-carry-probe).
        // SCORE/DIAGNOSE use the same headless contract via beginProbeOwnership:
        // BufferLines created during the probe turn are marked pl-stat-probe
        // synchronously at DOM insertion (before paint) so they never appear in
        // #windowport narration, while textContent remains available for parsing.
        StatTracker._carryBootstrapAt = 0;
        if (!(progressFact && progressFact.inventoryReplyFamily === "progress-status")) StatTracker.requestCarryBootstrap();
        var queued = false;
        if (StatTracker.needsScoreProbe()) queued = StatTracker.queueProbe("score", "score", StatTracker.measuredScoreProbe()) || queued;
        if (needsProwess) queued = StatTracker.queueProbe("prowess", "prowess", prowessFact) || queued;
        if (needsProgress) {
            if (model.stats.progress) model.stats.progress.confirmed = false;
            queued = StatTracker.queueProbe("progress", "status", progressFact) || queued;
        }
        metricProbes.forEach(function (fact) { queued = StatTracker.queueProbe("measured", fact.command, fact) || queued; });
        var diagnoseKnown = ["health", "stamina", "hunger", "thirst", "sleep"].some(function (key) {
            var s = model.stats[key];
            return s && s.source === "diagnose";
        });
        if (!StatTracker.rejectedProbeForm("diagnose") && (diagnoseKnown || !StatTracker.hasPassiveMetric("health"))) {
            queued = StatTracker.queueProbe("diagnose", "diagnose", StatTracker.measuredProbe("diagnose")) || queued;
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

    // reason (S6): an unavailable ending records why, for the strip's hover text; diagnostics only, no retry is armed here.
    finishProbe: function (state, reason) {
        if (state === "unavailable" && reason) {
            StatTracker.model().unavailableReason = reason;
            StatTracker._fulfillDiag.push({ t: Date.now(), reason: reason });
            if (StatTracker._fulfillDiag.length > 20) StatTracker._fulfillDiag.shift();
        }
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
        if (StatTracker._probeActive) return;
        if (!StatTracker._probeQueue.length) {
            // A carry-only fulfillment also ends when its existing owner
            // releases the transaction; no SCORE is needed after no-score.
            if (!StatTracker._hideCarryProbe && !StatTracker._carryProbeTimer
                && StatTracker.model().fulfillment === "checking") {
                StatTracker.model().fulfillment = "complete";
                StatTracker.Render();
            }
            return;
        }
        // The inventory transaction must finish before another line command.
        if (StatTracker._hideCarryProbe || StatTracker._carryProbeTimer) {
            if (!StatTracker._carryProbeTimer && StatTracker._hideCarryProbe
                && StatTracker._carryProbeSentAt > 0 && Date.now() - StatTracker._carryProbeSentAt > 5000) {
                StatTracker.clearCarryProbe();
            }
            return;
        }
        var next = StatTracker._probeQueue[0];
        if (next.kind === "measured" && !StatTracker.needsMeasuredMetricProbe(next.measuredFact)) {
            StatTracker._probeQueue.shift();
            StatTracker.runProbeQueue();
            return;
        }
        if (!StatTracker.probeSafeNow()) {
            if (++next.attempts > 24) {
                StatTracker._probeQueue.shift();
                StatTracker.model().fulfillment = "unavailable";
                StatTracker.noteUnavailable(StatTracker.probeBlockReason());
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
        if (!sent) { StatTracker.finishProbe("unavailable", "submitRefused"); return; }
        var deadline = Date.now() + 5000;
        function scanPendingReply() {
            if (StatTracker._probeActive !== next) return;
            // A reused Glk input may emit no scan wake. Read printed output
            // promptly; this submits nothing and keeps the original deadline.
            StatTracker.Tick();
            if (StatTracker._probeActive !== next) return;
            if (Date.now() >= deadline) { StatTracker.finishProbe("unavailable", "noReply"); return; }
            StatTracker._probeTimer = setTimeout(scanPendingReply, 250);
        }
        StatTracker._probeTimer = setTimeout(scanPendingReply, 250);
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

    // D207 (operator): "you do not see anything that came from the status
    // commands" -- but a real event in that turn (the enemy attacks while you
    // dig in your bag) is still heard and seen. Every line of the probe's span
    // is hidden at insertion, so nothing flashes; when the span ends, the
    // probe's own reply stays hidden and the turn's events are released.
    _spanLines: [],

    claimProbeNode: function (node) {
        if (!node) return;
        if (node.nodeType === 3) node = node.parentElement;
        if (!node || node.nodeType !== 1) return;
        // The VM's next prompt is the span's end, not part of it (carry-probe rule).
        if (node.matches && node.matches(".Input, .LineInput, .CharInput, input, textarea")) return;
        var base = StatTracker._probeBaseline;
        var fresh = function (el) { return !(base && base.has(el)); };
        var lines = [];
        try {
            // Lines that existed at submission are never the probe's: their
            // mutations are underline re-wraps, not output. GlkOte starts the
            // reply on a new line; the probe's own echo is handled below.
            if (node.classList && node.classList.contains("BufferLine")) {
                if (fresh(node)) lines.push(node);
            } else if (node.closest && !(node.classList && node.classList.contains("Style_input"))) {
                var host = node.closest(".BufferLine");
                if (host && fresh(host)) lines.push(host);
            }
            if (node.querySelectorAll) {
                Array.prototype.forEach.call(node.querySelectorAll(".BufferLine"), function (el) {
                    if (fresh(el)) lines.push(el);
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
            if (!line || !line.classList) return;
            if (StatTracker._spanLines.indexOf(line) < 0) StatTracker._spanLines.push(line);
            // A line re-owned by a later probe (its reused prompt) is no longer a released event.
            try { line.removeAttribute("data-pl-probe-event"); } catch (eR) {}
            if (line.classList.contains("pl-stat-probe")) return;
            line.classList.add("pl-stat-probe");
            try { line.setAttribute("aria-hidden", "true"); } catch (eA) {}
        });
    },

    // Reply forms that legitimately continue past the reply's first paragraph.
    // Single-paragraph replies need no entry: the first paragraph is always
    // the reply, whatever state it describes.
    // Item 2 (APK 64, codex R7 #2312): the inventory's own carried-load summary
    // ("You are carrying 4 lbs of stuff (10% of your current capacity). It's
    // all worth about $35.") is reply, in any game using that grammar. The
    // WHOLE paragraph must consist of carry sentences built from the D169 CARRY
    // forms; one other sentence (an attack) and it is not reply, so D207 still
    // shows real events.
    CARRY_SENTENCES: [
        // Metric words only after the number (codex #2316): "of stuff" and the
        // capacity clause, never free prose such as "and the wumpus bites you".
        /^you(?:'re| are) (?:currently )?carrying \d+ ?(?:lbs?|pounds?|kg|kilos?)(?: of stuff)?(?: \(\d+ ?% of your current capacity\))?\.$/i,
        /^it(?:'s| is) all worth (?:about )?(?:[$£€] ?\d+|\d+ (?:dollars?|gold|zorkmids?))\.$/i
    ],
    isCarrySummaryLine: function (text, verb) {
        if (!/^(?:i|inv|inventory|take inventory)$/i.test(String(verb || "").trim())) return false;
        var t = String(text || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
        if (!t) return false;
        var sentences = t.match(/[^.!?]+(?:[.!?]+|$)/g) || [];
        return sentences.length > 0 && sentences.every(function (s) {
            s = s.trim();
            return StatTracker.CARRY_SENTENCES.some(function (re) { return re.test(s); });
        });
    },

    isKnownProbeReplyLine: function (text, fact) {
        var t = String(text || "").replace(/\u00a0/g, " ").trim();
        if (!t) return true;
        try {
            if (StatTracker.isOwnedStandardScoreLine(t)) return true;
            if (StatTracker.PROWESS_REPLY.test(t) || StatTracker.PHYSICAL_READINESS_REPLY.test(t)) return true;
            if (/^(?:This score gives you a rank of|This gives you the rank of|giving you the rank of|earning you the rank of:?|You have reached the rank of) [A-Za-z"'][^\n]*$/i.test(t)) return true;
            // Inventory continuation headings ("In addition, you are wearing:").
            if (/^(?:In addition,?\s+)?(?:you(?:'re| are)|you have)\s+(?:also\s+)?(?:carrying|wearing|holding|got)\b[^.!?\n]*:\s*$/i.test(t)) return true;
            if (/^(?:You've|You have) visited \d+ (?:out of \d+ locations|locations \(out of \d+ in the game\)|locations out of a maximum \d+(?: locations)?)\.?$/i.test(t)) return true;
            if (/^(?:Some additional Statistics:|You spent \d+ turns? in the [^.\n]+\. This accounts for \d+% of your time\.)$/i.test(t)) return true;
            if (/^(?:Achievements for [^:\n]+:|[A-Za-z][^\n]+\s+\( [^()\n]+ \))$/i.test(t) && fact && fact.replyFamily === "achievement-list") return true;
            if (/^(?:Status report: MULE|Date:\s*\d{1,2}\/\d{1,2}\/\d{4}|Time:\s*\d{1,2}:\d{2}\s*[ap]m|Location: [^.!?\n]+|All systems functioning normally\.|According to my estimation, the objects I have collected have a total value of approximately \d+ hundred dollars American\.)$/i.test(t)) return true;
            if (fact) {
                if (Array.isArray(fact.ownedReplyLines) && fact.ownedReplyLines.indexOf(t) >= 0) return true;
                if (fact.rankReplyPattern && new RegExp(fact.rankReplyPattern).test(t)) return true;
                var fam = StatTracker.MEASURED_METRIC_REPLIES && StatTracker.MEASURED_METRIC_REPLIES[fact.replyFamily];
                if (fam && fam.test(t)) return true;
            }
        } catch (eK) {}
        return false;
    },

    // Inform 6 marks out-of-world verbs META in the dictionary flag byte
    // (#dict_par1 bit 0x02). A META command never runs the turn sequence, so
    // nothing but its own reply can be printed in its span. Cached per game.
    _metaVerbCache: null,
    probeVerbIsMeta: function (verb) {
        try {
            var mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
            if (!mem || typeof ZRamReader === "undefined") return false;
            // Bound to this exact memory backing store AND its identity key: an
            // unresolved (null) key must never let one story's flags answer for
            // another's (Codex #1461).
            var backing = mem.buffer || mem;
            var key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : null;
            var c = StatTracker._metaVerbCache;
            if (!c || c.backing !== backing || c.key !== key || key == null) {
                var d = ZRamReader.parseDictionary(mem), flags = {};
                if (d.informVerbFlags) d.entries.forEach(function (e) { flags[e.word] = e.flags; });
                c = StatTracker._metaVerbCache = { backing: backing, key: key, flags: flags };
            }
            var w = String(verb || "").toLowerCase().trim().split(/\s+/)[0];
            var f = c.flags[w];
            if (f == null && w.length > 9) f = c.flags[w.slice(0, 9)];
            return f != null && (f & 0x01) && (f & 0x02) ? true : false;
        } catch (e) { return false; }
    },

    releaseProbeEvents: function () {
        var lines = StatTracker._spanLines || [];
        StatTracker._spanLines = [];
        if (!lines.length) return;
        // The span's own origin, captured at submission: finishProbe clears
        // _probeActive before ownership ends (Codex #1459/#1467).
        var origin = StatTracker._spanOrigin || {};
        var fact = origin.fact || null;
        // A META probe cannot have shared its turn with any event: all of it
        // is the status command's output and stays hidden.
        var verb = origin.verb;
        if (verb && StatTracker.probeVerbIsMeta(verb)) return;
        var unhide = function (el) {
            el.classList.remove("pl-stat-probe");
            el.removeAttribute("aria-hidden");
            Array.prototype.forEach.call(el.querySelectorAll(".pl-stat-probe"), function (c) {
                c.classList.remove("pl-stat-probe");
                c.removeAttribute("aria-hidden");
            });
        };
        var seenReply = false, afterGap = false, gap = null, revealed = false, continues = false;
        var cut = null;
        StatTracker._lastProbeCut = null;
        try { cut = StatTracker.probeBoundaryCut(lines, StatTracker._probeBoundary); } catch (eC) { cut = null; }
        if (cut) {
            var pending = [];
            cut.forEach(function (c) {
                if (c.kind === "gap") { pending.push(c.line); return; }
                if (c.kind === "prompt" || /^>\s*$/.test(String(c.line.textContent || "").replace(/ /g, " ").trim())) { unhide(c.line); pending = []; return; }
                if (c.kind === "event") {
                    if (revealed) pending.forEach(unhide);
                    unhide(c.line);
                    try { c.line.setAttribute("data-pl-probe-event", "1"); } catch (eM) {}
                    revealed = true;
                }
                pending = [];
            });
            try { StatTracker._lastProbeCut = cut.map(function (c) { return c.kind; }); } catch (eL) {}
            if (revealed) { try { if (typeof ReadAloud !== "undefined" && ReadAloud.schedule) ReadAloud.schedule(); } catch (eR) {} }
            return;
        }
        StatTracker._lastProbeCut = null;
        lines.forEach(function (line) {
            if (!line || !line.isConnected) return;
            if (line.querySelector && line.querySelector(".Style_input")) return;   // the probe's echo
            var text = String(line.textContent || "").replace(/\u00a0/g, " ").trim();
            if (!text) { if (seenReply && !continues) { afterGap = true; gap = line; } return; }
            // A reply line ending in a colon introduces more of the same reply
            // ("Current statistics:"), so the next paragraph is still the reply.
            if (!afterGap) { seenReply = true; continues = /:\s*$/.test(text); return; }   // the reply itself
            // The VM's own prompt is restored, but it is not an event -- a bare
            // ">" or any line holding the live input ("Combat>" in LLR3).
            if (/^>\s*$/.test(text) || (line.querySelector && line.querySelector(".Input, .LineInput, .CharInput"))) { unhide(line); return; }
            if (StatTracker.isCarrySummaryLine(text, verb)) return;   // item 2: the inventory's load summary
            if (StatTracker.isKnownProbeReplyLine(text, fact)) {
                // A known reply heading that ends in a colon ("In addition, you
                // are wearing:") owns the paragraph it introduces (Codex #1517).
                if (/:\s*$/.test(text)) { afterGap = false; seenReply = true; continues = true; }
                return;
            }
            // A real event of that turn: shown and spoken like any other output.
            if (gap) { unhide(gap); gap = null; }
            unhide(line);
            // Provenance for audits: this line was released as a turn event.
            try { line.setAttribute("data-pl-probe-event", "1"); } catch (eM) {}
            revealed = true;
        });
        if (revealed) { try { if (typeof ReadAloud !== "undefined" && ReadAloud.schedule) ReadAloud.schedule(); } catch (eR) {} }
    },

    ensureProbeDomGuard: function () {
        if (StatTracker._probeDomGuard) return;
        if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
        var root = document.getElementById("windowport") || document.body;
        if (!root) return;
        StatTracker._probeDomGuard = new MutationObserver(function (mutations) {
            StatTracker.protectProbeInputs(root);
            // D207: only a live, submitted probe owns output -- a queued stat
            // probe, or the inventory carry probe.
            if (!StatTracker._statProbeOwned || !(StatTracker._probeActive || StatTracker._carrySpanOwned)) return;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                for (var j = 0; j < m.addedNodes.length; j++) {
                    StatTracker.claimProbeNode(m.addedNodes[j]);
                }
                if (m.type === "characterData" && m.target) {
                    var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
                    var hostLine = el && el.closest ? el.closest(".BufferLine") : null;
                    // D207: pre-submit lines are not the probe's (underline re-wraps).
                    if (hostLine && StatTracker._probeBaseline && StatTracker._probeBaseline.has(hostLine)) continue;
                    if (el && el.closest) StatTracker.claimProbeNode(hostLine || el);
                }
            }
            StatTracker.protectProbeInputs(root);
            // Claim the reply first, then release ownership at the VM's next
            // prompt even if that reply contained no recognizable metric.
            var nextInput = root.querySelector(".Input.LineInput, .Input.CharInput");
            // D207: the carry probe's span ends at the VM's next prompt too,
            // whether that is a line prompt or "(press a key)".
            var freshInput = Array.prototype.find.call(root.querySelectorAll(".Input.LineInput, .Input.CharInput"), function (n) {
                return n !== StatTracker._probeInput;
            });
            if (!StatTracker._probeActive && StatTracker._carrySpanOwned && freshInput) {
                StatTracker._carrySpanOwned = false;
                StatTracker.endProbeOwnership();
            }
            if (StatTracker._probeActive && nextInput) {
                var completed = StatTracker._probeActive;
                var replacedInput = nextInput !== StatTracker._probeInput;
                if (completed.measuredFact && nextInput.classList.contains("CharInput")) StatTracker._probeQueue = [];
                if (replacedInput) StatTracker.endProbeOwnership();
                setTimeout(function () {
                    if (StatTracker._probeActive !== completed) return;
                    StatTracker.Tick();
                    var fact = completed.measuredFact;
                    var continuationText = String(nextInput.closest(".BufferLine") && nextInput.closest(".BufferLine").textContent || "").replace(/\u00a0/g," ").trim();
                    if (fact && fact.continuation === "return" && !completed.continued && nextInput.classList.contains("LineInput") && !nextInput.value
                        && /^We are about to give you your score\. Put on your peril-sensitive sunglasses now\. \(Hit RETURN or ENTER when ready\.\)\s*>?$/.test(continuationText)) {
                        completed.continued = true;
                        StatTracker.beginProbeOwnership();
                        if (Input.Inject("",true,"stat-probe")) return;
                    }
                    if (replacedInput && StatTracker._probeActive === completed) StatTracker.finishProbe("unavailable", "unrecognisedReply");
                }, 0);
            }
        });
        try {
            StatTracker._probeDomGuard.observe(root, { childList: true, subtree: true, characterData: true });
        } catch (eObs) { StatTracker._probeDomGuard = null; }
    },

    beginProbeOwnership: function () {
        StatTracker._probeInput = document.querySelector(".Input.LineInput, .Input.CharInput");
        // D207: lines that already exist at submission are not the probe's.
        try {
            StatTracker._probeBaseline = typeof WeakSet !== "undefined" ? new WeakSet() : null;
            if (StatTracker._probeBaseline) {
                Array.prototype.forEach.call(document.querySelectorAll("#windowport .BufferLine"), function (l) {
                    StatTracker._probeBaseline.add(l);
                });
                // The line holding the prompt the probe is typed into belongs
                // to the span: under load GlkOte writes the echo -- and even the
                // reply -- into it (deephome/Lurking "diagnose" leak, rev3).
                var own = StatTracker._probeInput && StatTracker._probeInput.closest
                    ? StatTracker._probeInput.closest(".BufferLine") : null;
                if (own) StatTracker._probeBaseline.delete(own);
            }
        } catch (eB) { StatTracker._probeBaseline = null; }
        StatTracker._spanLines = [];
        // D207: remember which command this span answers, for release.
        var active = StatTracker._probeActive;
        StatTracker._spanOrigin = active
            ? { verb: active.verb, fact: active.measuredFact || null }
            : (StatTracker._carrySpanOwned ? { verb: StatTracker._carryVerb, fact: null } : null);
        StatTracker._statProbeOwned = true;
        // S1 stage 1: arm the action-routine boundary for an I6 probe verb.
        StatTracker._probeBoundary = null;
        try {
            var spec = StatTracker._spanOrigin && StatTracker.i6ProbeActionSpec(StatTracker._spanOrigin.verb);
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.armProbeBoundary) ZvmCapture.armProbeBoundary(spec || null);
        } catch (eA) {}
        StatTracker.ensureProbeDomGuard();
    },

    endProbeOwnership: function () {
        try {
            StatTracker._probeBoundary = (typeof ZvmCapture !== "undefined" && ZvmCapture.takeProbeBoundary) ? ZvmCapture.takeProbeBoundary() : null;
        } catch (eT) { StatTracker._probeBoundary = null; }
        if (StatTracker._statProbeOwned) StatTracker.releaseProbeEvents();
        StatTracker._probeBoundary = null;
        StatTracker._spanOrigin = null;
        StatTracker._statProbeOwned = false;
    },

    // S1 stage 1: the probe verb's action routine in a validated Inform 6
    // story, from the story's own tables. Grammar version 2: the grammar
    // table's word pointers start static memory; each verb's lines are an
    // action word plus 3-byte tokens ended by ENDIT (15); the actions table
    // follows the last line. The whole layout must parse exactly and every
    // action-table entry must be a routine, or nothing is armed. Inform 7
    // (ik1_count/ik1_link compiler properties) and non-Inform stories are not
    // armed, so they keep the paragraph rule. Cached per story.
    _i6ActionCache: null,
    i6ProbeActionSpec: function (verb) {
        var words = String(verb || "").toLowerCase().trim().split(/\s+/);
        if (words.length !== 1 || !words[0]) return null;
        var mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
        if (!mem || typeof ZRamReader === "undefined") return null;
        var backing = mem.buffer || mem;
        var key = ZRamReader.gameIdentityKey ? ZRamReader.gameIdentityKey(mem) : null;
        var c = StatTracker._i6ActionCache;
        if (!c || c.backing !== backing || c.key !== key || key == null) {
            c = StatTracker._i6ActionCache = { backing: backing, key: key, layout: StatTracker.decodeI6ActionLayout(mem), verbs: {} };
        }
        var L = c.layout;
        if (!L) return null;
        var w = words[0];
        if (Object.prototype.hasOwnProperty.call(c.verbs, w)) return c.verbs[w];
        var spec = null;
        try {
            var d = ZRamReader.parseDictionary(mem);
            var addr = d && d.words ? (d.words[w] != null ? d.words[w] : (w.length > 9 ? d.words[w.slice(0, 9)] : null)) : null;
            if (addr != null && d.entryLen >= 8 && (ZRamReader.u8(mem, addr + 6) & 0x01)) {
                var vn = 255 - ZRamReader.u8(mem, addr + 7);
                var lines = L.verbs[vn] || [];
                // The bare verb: exactly one zero-token grammar line.
                var bare = lines.filter(function (l) { return l.tokens === 0; });
                if (bare.length === 1 && !bare[0].reverse) {
                    var act = bare[0].action;
                    if (act < L.actionCount && L.afterProps.length === 2 && L.objMax > 0) {
                        if (!c.disp) {
                            var disp = c.disp = {};
                            c.dispatcherGlobal = function (pk) {
                                if (!Object.prototype.hasOwnProperty.call(disp, pk)) disp[pk] = StatTracker.i6DispatcherGlobal(mem, pk, L.actionBase);
                                return disp[pk];
                            };
                        }
                        spec = { routine: ZRamReader.u16(mem, L.actionBase + 2 * act), action: act, afterProps: L.afterProps, objMax: L.objMax,
                            actionBase: L.actionBase, dispatcherGlobal: c.dispatcherGlobal };
                    }
                }
            }
        } catch (eV) { spec = null; }
        c.verbs[w] = spec;
        return spec;
    },
    // S1 stage 1b: a no-argument action dispatcher is the library's
    // ActionPrimitive, `indirect(#actions_table-->action)`. The routine at
    // packed address pk must have 0 locals and exactly one of these bodies:
    //   A  loadw #actionBase Gk -> sp; call_1n sp; rtrue
    //   B  call_vs #V #actionBase Gk -> sp; call_1n sp; rtrue   (V: the
    //      strict-mode RT__ChLDW bounds-check veneer, not checked)
    // with the constant equal to the decoded actions table base. Returns the
    // global number k (the `action` global), or null. Any other shape, or a
    // decode exception, is not a dispatcher, so nothing is armed.
    i6DispatcherGlobal: function (mem, pk, actionBase) {
        try {
            var h = ZRamReader.header(mem);
            if (!h || (h.version !== 5 && h.version !== 8) || !(pk > 0)) return null;
            var a = pk * (h.version === 8 ? 8 : 4), length = mem.byteLength || mem.length || 0;
            if (a + 12 > length) return null;
            var u8 = function (o) { return ZRamReader.u8(mem, a + o); };
            if (u8(0) !== 0) return null;
            if (u8(1) === 0xCF && u8(2) === 0x2F && ZRamReader.u16(mem, a + 3) === actionBase && u8(5) >= 16
                && u8(6) === 0 && u8(7) === 0xAF && u8(8) === 0 && u8(9) === 0xB0) return u8(5) - 16;
            if (u8(1) === 0xE0 && u8(2) === 0x0B && ZRamReader.u16(mem, a + 5) === actionBase && u8(7) >= 16
                && u8(8) === 0 && u8(9) === 0xAF && u8(10) === 0 && u8(11) === 0xB0) return u8(7) - 16;
            return null;
        } catch (e) { return null; }
    },
    decodeI6ActionLayout: function (mem) {
        try {
            var h = ZRamReader.header(mem);
            if (!h || (h.version !== 5 && h.version !== 8)) return null;
            if (!(ZRamReader.isInformCompiled && ZRamReader.isInformCompiled(mem))) return null;
            // The story's own property names: Inform 7 is excluded, and the
            // after phase (react_after, after) is located by these numbers.
            // Without them the after phase is unprovable, so nothing is armed.
            var pn = ZRamReader.informPropertyNames && ZRamReader.informPropertyNames(mem);
            var names = pn && pn.names;
            // S1-1c: older I7 builds lack ik1_* but carry i7_kind / i7_map_region; their rulebook code mimics the after-phase call.
            if (!names || names.ik1_count != null || names.ik1_link != null || names.i7_kind != null || names.i7_map_region != null) return null;
            if (!(names.after > 0) || !(names.react_after > 0) || names.after === names.react_after) return null;
            var objMax = ZRamReader.objectCount ? ZRamReader.objectCount(mem, h) : 0;
            if (!(objMax > 0)) return null;
            var length = mem.byteLength || mem.length || 0, base = h.staticMem;
            if (!(base >= 0x40 && base + 4 <= length)) return null;
            var first = ZRamReader.u16(mem, base);
            if (!(first > base && first < length) || ((first - base) & 1)) return null;
            var n = (first - base) / 2;
            if (n < 2 || n > 256) return null;
            var verbs = [], maxAction = -1, pos = first;
            for (var i = 0; i < n; i++) {
                if (ZRamReader.u16(mem, base + 2 * i) !== pos) return null;
                var count = ZRamReader.u8(mem, pos++), lines = [];
                if (count > 64) return null;
                for (var k = 0; k < count; k++) {
                    var aw = ZRamReader.u16(mem, pos); pos += 2;
                    var tokens = 0;
                    while (ZRamReader.u8(mem, pos) !== 15) { pos += 3; if (++tokens > 32 || pos >= length) return null; }
                    pos++;
                    var action = aw & 0x3ff;
                    lines.push({ action: action, reverse: !!(aw & 0x400), tokens: tokens });
                    if (action > maxAction) maxAction = action;
                }
                verbs.push(lines);
            }
            if (maxAction < 0) return null;
            var actionBase = pos, actionCount = maxAction + 1;
            if (actionBase + actionCount * 2 > length) return null;
            var mult = h.version === 8 ? 8 : 4;
            for (var a = 0; a < actionCount; a++) {
                var r = ZRamReader.u16(mem, actionBase + 2 * a);
                if (!r || r * mult >= length || ZRamReader.u8(mem, r * mult) > 15) return null;
            }
            return { verbs: verbs, actionBase: actionBase, actionCount: actionCount, afterProps: [names.after, names.react_after], objMax: objMax };
        } catch (e) { return null; }
    },

    // S1 stage 1: cut the span at the recorded action-routine entry and the
    // start of its after phase (or its return when it has none). Text the
    // action routine printed before its after phase is the reply (stays
    // hidden). Text before its entry (react_before, life, orders), from its
    // after phase (AfterRoutines: react_after, after, GamePostRoutine -- run
    // INSIDE a stock InvSub) and after its return (daemons, timers) is a turn
    // event (shown). Every span line must match the VM's own printed text in
    // order and none may cross a boundary; otherwise null, and the caller
    // keeps the paragraph rule.
    probeBoundaryCut: function (lines, pb) {
        if (!pb || pb.bad || pb.entry < 0 || pb.ret < pb.entry) return null;
        var end = (pb.after >= pb.entry && pb.after <= pb.ret) ? pb.after : pb.ret;
        var norm = function (s) { return String(s || "").replace(/ /g, " ").replace(/\s+/g, ""); };
        var pre = norm(pb.text.slice(0, pb.entry)), reply = norm(pb.text.slice(pb.entry, end));
        var all = pre + reply + norm(pb.text.slice(end));
        var b1 = pre.length, b2 = b1 + reply.length, cur = 0, out = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line || !line.isConnected) continue;
            if (line.querySelector && line.querySelector(".Style_input")) continue;   // the probe's echo
            var t = norm(line.textContent);
            var live = !!(line.querySelector && line.querySelector(".Input, .LineInput, .CharInput"));
            if (!t) { out.push({ line: line, kind: "gap" }); continue; }
            if (all.substr(cur, t.length) !== t) return null;
            var s = cur, e = cur + t.length;
            cur = e;
            var kind = (s >= b1 && e <= b2) ? "reply" : (e <= b1 || s >= b2) ? "event" : null;
            if (!kind) return null;
            if (live) kind = "prompt";
            out.push({ line: line, kind: kind });
        }
        if (cur < b2) return null;   // the whole reply must be on screen
        return out;
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
            else if (StatTracker.applyMeasuredMetricReply(StatTracker.measuredScoreProbe(), text)) pending.score = false;
            else {
                // W&W family SCORE replies name experience, not "Your score is".
                var printed = StatTracker.parsePrintedMetrics(text);
                if ((printed && printed.experience) || /^You have completed your divine Task\.$/im.test(String(text || ""))) {
                    StatTracker.recordPrintedMetrics(StatTracker.model(), text, "score");
                    pending.score = false;
                }
            }
        }
        if (pending.diagnose) {
            var dg = StatTracker.parseDiagnoseReply(text);
            if (dg) { StatTracker.applyDiagnoseReply(text); pending.diagnose = false; }
        }
        if (pending.prowess && StatTracker.applyProwessReply(text)) pending.prowess = false;
        if (pending.progress && StatTracker.applyProgressReply(text)) pending.progress = false;
        if (pending.measured && StatTracker.applyMeasuredMetricReply(StatTracker._probeActive && StatTracker._probeActive.measuredFact, text)) pending.measured = false;
        if (!pending.score && !pending.diagnose && !pending.prowess && !pending.progress && !pending.measured) { StatTracker.finishProbe("complete"); return; }
        // Give up after a few turns rather than misreading ordinary play as a
        // probe reply.
        if (++StatTracker._probeTurns > 6) StatTracker.finishProbe("unavailable", "tooManyTurns");
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
                        StatTracker._engineOut = "";   // D215: engine output belongs to one submission
                        StatTracker._engineCapture = event.source !== "stat-probe" && StatTracker.RESTORE_LIKE.test(String(event.command || ""));
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

if (typeof LearningStores !== "undefined") LearningStores.register("stats", StatTracker.STORAGE_PREFIX, StatTracker.learningKeyFor, {
    compact: function (value) { return JSON.stringify(StatTracker.persistView(JSON.parse(value))); }
});
try { if (typeof window !== "undefined") window.StatTracker = StatTracker; } catch (e) {}
try { if (typeof module !== "undefined" && module.exports) module.exports = StatTracker; } catch (e) {}
