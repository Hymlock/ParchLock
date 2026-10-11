// D204 measured executable-owned command/layout relationships (Claude batch).
// Same contract as ModuleStatFacts.js: keyed by executable SHA256, command/
// field/reply-family and measured equipment-state capabilities only.
// No stored numeric readings or title dispatch.
var ModuleStatFactsClaude = {
    // Wumpus 2000 (wump2ka): measured location roles (Codex GO #3103;
    // work/investigations/2026-10-10-wump-identity-proposal.md). Rooms are
    // multi-section ("a section of room #25"), so the printed number cannot
    // select the section. Native route + dark travel: G37 follows the actor's
    // section every move, also while dark (real_location); G16 is that room
    // or the darkness object 19 (location). Validated per tick, whole fact.
    "a18e057bd832ec381830cb7a6891fca39657eed6ad80e13446317d8766bf6bc7": {
        "measuredLocation": { "realLocationGlobal": 37, "locationGlobal": 16, "darknessObject": 19 }
    },
    // Native i tests bit19 and omits the absent lariat; the worn outfit also
    // has this bit, so inventory traversal preserves confirmed worn gear.
    "d02fd95bae5398f9b87fe0f537f288b45e93967008948970f1982a65b888eddb": {
        "inventoryHiddenAttribute": 19,
        "inventoryHiddenPreservesWorn": true
    },
    // Native i tests bit17 and skips arm111 (including gash110) and badge184;
    // the held Logbook195 has this bit clear and is printed.
    "502e5c8e4cb82726ab61683f4d92afbb31f90fcb98b9b3dc3dbd4f97841c5582": {
        "inventoryHiddenAttribute": 17
    },
    // D223 / M04-B: I7 Map_Storage, measured offline (work/investigations/
    // m04b-*-mapstorage-disasm.txt): the story's own MapConnection code does
    // get_prop room #25 (ik1_count), mul #nd, add direction ik3_count,
    // loadw #base. rooms = the COMPLETE 2-byte room-id:counter list; dirs =
    // direction-id:counter list; skipDirs = custom directions not labelled.
    // Validated against RAM every collection generation (Codex #2781).
    // The Warbler's Nest.
    "9f3a27369091e16a23eab33038e6416823c8f39f34a9eec803120bd88cb0e5f0": {
        "mapStorage": { "base": 17062, "nd": 13, "rowProp": 25, "colProp": 77,
            "rooms": "51:0,53:1,56:2,61:3,101:4",
            "dirs": "36:0,37:1,38:2,39:3,40:4,41:5,42:6,43:7,44:8,45:9,46:10,47:11,94:12",
            "skipDirs": [94] }
    },
    // Facility (object 210 holds prop 25 as a 1-byte value and is not a room).
    "ef6530a73b3a3b868f0c872a28944bba407d0e209bf73892af0f38a9ef6a3a48": {
        "mapStorage": { "base": 30128, "nd": 12, "rowProp": 25, "colProp": 112,
            "rooms": "45:0,48:1,50:2,52:3,53:4,54:5,55:6,56:7,57:8,58:9,59:10,60:11,61:12,62:13,64:14,65:15,67:16,68:17,69:18,71:19,72:20,73:21,75:22,76:23,77:24,78:25,80:26,82:27,83:28,84:29,85:30,87:31,88:32,89:33,90:34,91:35,92:36,93:37,94:38,95:39,96:40,97:41,98:42,100:43,101:44,102:45,104:46,105:47,106:48,107:49,108:50,110:51,112:52,113:53,114:54,115:55,116:56,117:57,118:58,119:59,120:60,121:61,122:62,123:63,125:64,126:65,128:66,129:67,130:68,131:69,132:70,133:71,134:72,136:73,137:74,138:75,139:76,140:77,141:78,143:79,144:80,145:81,146:82,147:83,150:84,152:85,153:86,156:87,157:88,158:89,159:90,160:91,161:92,162:93,163:94,164:95,165:96,166:97,167:98,169:99,170:100,171:101,174:102,175:103,176:104,177:105,178:106,179:107,180:108,181:109,184:110,185:111,186:112,187:113,188:114,190:115,192:116,193:117,195:118,196:119,197:120,198:121,199:122,200:123,201:124,202:125,203:126,205:127,206:128,207:129",
            "dirs": "33:0,34:1,35:2,36:3,37:4,38:5,39:6,40:7,41:8,42:9,43:10,44:11",
            "skipDirs": [] }
    },
    // Degeneracy: the PC is 157 "(StandardPlayer)" (the "(self object)" 20 is
    // parentless and unused). Native INVENTORY at Reception/Wait/Dining lists
    // exactly 157's children (blade, holy symbol, Chain-Mail, sheath,
    // Scroll-Case); 157's parent tracks every printed heading. g18 = g53 = 157
    // at every measured prompt; 18 is the stable player slot of this library
    // family (bear/dewdrops hold the PC only in 18). Scope: native prompt
    // measurement; no directed-NPC role test was available (Codex #2503).
    "f77c8f218f0b6f11940e342f82c8c9f91d0933d366f45a5a3587ca341d5bfdf6": {
        "playerGlobal": 18
    },
    // Border Zone: native inventory in all three chapters identifies the
    // actor referenced by global186; it is zero before chapter selection.
    // Its actual parent tracks Compartment / Railroad Tracks / Ostnitz Square.
    "b42d5a7db4df78ed2e29341e86a149fbd7a0038d5d74c48b4444a7bb73506ef8": {
        "playerGlobal": 186,
        // Native i tests29 to omit body parts and39 to print clothes/watch
        // as worn. REMOVE WATCH is refused; WEAR confirms already worn.
        "inventoryHiddenAttribute": 29,
        "wornAttribute": 39
    },
    // Hitchhiker: native WEAR GOWN changes [0,0,0,64,32,193] to
    // [0,0,0,192,32,193]; REMOVE GOWN reverses exactly bit24. Native
    // inventory labels it "being worn". Executable-owned fact, not I6's bit26.
    "26dcdab275054e5899c9454a879816a1ced530e9172bd8d8cf101fb7acc27cb4": {
        "wornAttribute": 24
    },
    // Planetfall (ZIL): the worn attribute is 12, not Inform's 26. Measured
    // (Codex #1663): native REMOVE UNIFORM clears exactly bit 12 on the
    // uniform; fresh inventory reports the uniform and chronometer
    // "(being worn)", both of which carry bit 12.
    "b73c750df3a3d6781072eb7f9f562d5c60bfc6dc8203f4952ebff50f04f412cf": {
        "wornAttribute": 12
    },
    // Treasures: measured SCORE and QUEST RATE agree at 0, 3 and restored43.
    // Semantic relationship only; base SCORE/PROWESS capabilities stay intact.
    "257edae1fea429656e638fa539a65c0f4e4daeb4f9669a2a5be368e6a9aca756": {
        "scoreAliasField": "quest rate",
        // HELP declares USE <object> as a core action, including non-equipment.
        "objectUseVerb": "use",
        // Native USE ARMOR toggles this declared boolean, not the worn bit.
        "equipmentState": { "wornProperty": "p80_girded", "toggleVerb": "use" }
    },
    // LLR3: SCORE already yields EXP n/m through the W&W printed-metric path;
    // DIAGNOSE only restates grid STR, so it is never asked automatically.
    "4bf1f6eafc25528efe1c0070576f716e269663478f2c7deac324d135e9ecc7ef": {
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live DIAGNOSE: You can check your STR at any time from the status line, the bar at the top of the window. It's currently 14. Grid LVL/STR; SCORE EXP 0/50."
    },
    // RoTA: same W&W library replies as LLR3.
    "b8d00f6135e9f2eff3b45324bc100ac85606b5b3c30fa3c818f3b358f1bc9cb6": {
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live DIAGNOSE: You can check your STR at any time from the status line ... It's currently 14. Grid LVL/STR; SCORE EXP 0/50."
    },
    // LostPig
    "7bffe25e933aa22a2b1e9bfc8073bee5687d79a70394da19e50bfed5755368c4": {
        "command": "score",
        "fields": ["score.max"],
        "replyFamily": "grunk-score",
        "outcome": "line",
        "evidence": "Historical isolated SCORE: Grunk have 0 out of 7 so far. Grid Score only."
    },
    // OMNIQuest
    "1c905ffce496afe702c04453c4abd0ab01e272afd138b87c7e0ebaed4d8accd0": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 50, in 1 turn, which gives you the rank of brain-dead adventurer. 2026-10-05 live compact grid redraw 0/3 then 0/4 while Moves stayed 1."
    },
    // Savoir-Faire
    "1b82d924011979d54795b0e5b03855d57231f4819623c501fc47e1665770577a": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 125, in 1 turn, giving you the rank of fumbling peasant. 2026-10-05 live compact grid 0/4 while Moves stayed 1."
    },
    // SpiritWrak: opening DIAGNOSE is chanting, not health.
    "258199e5fb7b494d3c6e60cc4fbe466b08f729e90a06753db49f4af7bfdca2d5": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "rejectedForms": ["diagnose"],
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 250, in 1 turn, earning you the rank of Non-believer. 2026-10-05 live DIAGNOSE: You are caught up in the collective chanting ... (narration then produced a false Health critical). Compact grid 0/4 while Moves stayed 1."
    },
    // Vacation Gone Awry
    "7c361e4c0e9bd7d008d1af7888fa9a9a349e1040ec508156b1931bf2a5ffbb18": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 100, in 1 turn, which makes you a first time player."
    },
    // Mother Loose
    "a28b241778534c4d84749fb2192ba635269daaff7c20e8ed0fd30d85cfe4da96": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "respect-score",
        "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 50, in 1 turn, earning you the same level of respect as the spider who invited itself to dinner with Miss Muffet. Grid Score/Moves labelled."
    },
    // The Mind Electric
    "62889ccf16ccfd0e9f79288eb5956f38f9d1174a2fbffdb80aa35e818f3baad0": {
        "command": "score",
        "fields": ["score.max"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 40, in 1 turn. 2026-10-05 live DIAGNOSE: Your virtual body's integrity appears to be normal."
    },
    // Rameses: authored grid labels Score/Moves; narrow redraw is a bare pair.
    "b41ec3bd73f033ed4fffac072d1d469e9d3c83f1a2e998fc56886885b18a73e6": {
        "statusPair": ["Score", "Moves"],
        // On narrow screens the story drops its own Score column; SCORE then
        // only replies "I have no chance of scoring around here." (not a stat).
        "rejectedForms": ["score"],
        "evidence": "2026-10-05 live grid Score: 7 Moves: 57 then compact 7/57 -> 7/58 after LOOK while tracked Moves stayed 57. SCORE: I have no chance of scoring around here."
    },
    // Shadowgate
    "de316b8f506a607ac47ecacb20234ea1363c2256e696377bf17ed842867b3acb": {
        "command": "score",
        "fields": [],
        "replyFamily": "no-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE: There is no score. Either you defeat the Warlock Lord or you die."
    },
    // Suveh Nux: grid Turn N / N% complete; SCORE restates percent and turns.
    "4a4e4745172ac9670cb7062126d2b4bb623d6bf61c3fc8193fb9d69cc92ff862": {
        "command": "score",
        "fields": ["progress", "turns"],
        "replyFamily": "percent-progress-score",
        "outcome": "line",
        "evidence": "2026-10-05 live grid Vault   Turn 2   0% complete; SCORE: You have so far scored 0% in 2 turns."
    },
    // Sycamora Tree
    "9581e62be94bb0902abdd4a292c7f6916d010624138b079a1718aa4386c81938": {
        "command": "score",
        "fields": ["score.max", "rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 3, in 1 turn, giving you the rank of Roxette. 2026-10-05 live compact grid 0/3; DIAGNOSE: Feeling quite well, thanks."
    },
    // Lack of Vision
    "901eebd801154aa8ba35c1213319fa280fda63941a8fcbf48b42d0b9b04d7780": {
        "command": "score",
        "fields": ["turns"],
        "replyFamily": "no-score-turns",
        "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live compact grid Place 0/2; SCORE: No score 0 at all, but 0, you have this many turns2 .Hmm.."
    },
    // The Path to Fortune: grid carries Score n/m and Time; rank is SCORE-only.
    "ffdecae479a6e5a4280c695fa67c39a0802005413e7221865fa0aa8ec32eac83": {
        "command": "score",
        "fields": ["rank"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 200, in 1 turn, which gives you the rank of an Apprentice. 2026-10-05 live DIAGNOSE: You are in good health, wide awake, and well-fed."
    },
    // Photograph: two authored counters, no Score row.
    "cc19168d7ebe041504a3458677bcd7d5314a416c2870034dd7e84c6d50241104": {
        "command": "score",
        "fields": ["jack", "life"],
        "replyFamily": "paired-counter-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE twice: The score is: (Jack 1/Life 0)"
    },
    // Ribbons: percent experienced plus ribbon title; colour varies per ask.
    "4db8fcfaeed2f3f8459f5e65d03c0bca3c67eac6730d4cb6f2549f56147f1cc2": {
        "command": "score",
        "fields": ["progress", "rank"],
        "replyFamily": "ribbon-progress-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE twice, same state: ... approximately 1 percent of this entry, earning you the coveted \"Accidental Patron\" white ribbon. / ... red ribbon."
    },
    // The Great: SCORE reports turns and qualitative progress only.
    "7092267b5751a1cab264d8690d9f8eee15ef75f6355915ccf6d6b594abb18c63": {
        "command": "score",
        "fields": ["turns", "progress"],
        "replyFamily": "turns-only-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE twice: After 2 turns, you still haven't found the truth about yourself."
    },
    // Amishville: any first command ends the story, so nothing is asked.
    "9147afde1538183057a43428393119076cde9dd9634f7e345dcce10de26b02e2": {
        "rejectedForms": ["inventory", "score", "diagnose"],
        "evidence": "2026-10-05 live first LOOK: Suddenly you realize that you're opposed to the use of electrically powered appliances such as computers. (story ends, CharInput). Grid Score: 0 Moves: 1."
    },
    // Pick Up the Phone Booth and Aisle: SCORE ends the story.
    "c48eb913ab6e7ba0fb06cd738ae646042875eb082b55fbc0a4d2ea11c8dff4a3": {
        "rejectedForms": ["score"],
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: *** You've become a bit depressed about your accomplishments *** Would you like to RESTART, RESTORE a saved game or QUIT? Grid Score: 0 Moves: 1 then compact 0/1."
    },
    // Space Station: grid Score/Time; maximum, rank and day are SCORE-only.
    "ec8f1382decbe7d4954f1834503183923a12ca83c55c93c8da914fb9a74e0467": {
        "command": "score",
        "fields": ["score.max", "rank", "day"],
        "replyFamily": "galactic-score",
        "outcome": "line",
        "statusPair": ["Score", "Time"],
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 23, in 1 turn. It is Day 1 of your adventure. Current Galactic Standard Time (adjusted to your local day-cycle) is 3010. This gives you the rank of Grease Monkey. 2026-10-05 live grid Score: 0 Time: 3010 then compact 0/3035, 0/3042."
    },
    // Solitary
    "f3ff97019bd123c5e90e7777abd4755f29c2182725e50f3ac6cb6229d125ad89": {
        "command": "score",
        "fields": ["score.max"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 10, in 0 turns. DIAGNOSE: That's not a verb I recognise."
    },
    // The Lost Spellmaker
    "9ad23948fdf8c4c4f72fadbe1818b4f17fc50dbf9d8fc81312ba9c4e44dc2ddb": {
        "command": "score",
        "fields": [],
        "replyFamily": "no-score",
        "outcome": "line",
        "evidence": "2026-10-05 live SCORE twice: \"You don't get scores in the Secret Service - there is only success and failure.\" (SPSS Spy's Manual, page 12)"
    },
    // Chico and I Ran: SCORE is a narrative statement that nothing is scored.
    "d9b0c188bb116f2c544e30032926deb41b1374b838b613c1ee581bf5585ef3be": {
        "command": "score",
        "fields": [],
        "replyFamily": "no-score",
        "outcome": "line",
        "evidence": "2026-10-05 live (SPACE, role key 1) SCORE: You have yet to truly score, and that's why you're here. DIAGNOSE: That's not a verb I recognise."
    },
    // ---- Prior-checked rows: SCORE-only maximum/rank never fetched ----
    // Deephome: rank printed on its own line after the score sentence.
    "fdae5bd090fda6fc1b0390051531190968e04355060153ad5b2ab6b75a387b31": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "rankReplyPattern": "^Sorry Excuse for a Reclaimer\\.$",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have so far scored 1 out of a possible 300, in 1 turn, / Sorry Excuse for a Reclaimer. Compact grid 1/4 while Moves stayed 1."
    },
    // Heroine's Mantle
    "35f2844ed997f5ce8782b8d77760193c50ab38438d2c2bd2426a036c516fc256": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 400, in 1 turn, earning you the rank of schoolgirl."
    },
    // Ralph
    "b6adf73177940acd90c184151689b8d793981203cbad3393240cf313f29a47a1": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 30, in 0 turns, which makes you -- Ralph, at your service. DIAGNOSE: You feel great, somehow as if you'd just been taught new tricks."
    },
    // Sherbet
    "295e476757bd2d9e5bcef160c646185145fa15a77b22d85d0aae75c6a94fc126": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 30, in 1 turn, the kind of score one would expect of the Embassy Stablehand. Compact grid 0/3 while Moves stayed 2."
    },
    // Time: All Things Come to an End
    "dd3e03151624d55e053530f40e70bd58ecc3588842ee274d4bbd3a9eb7cb8502": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 200, in 1 turn, making you a crazy scientist with no brain whatsoever. Compact grid 0/3 while Moves stayed 2."
    },
    // Inhumane
    "931b0be04ed43ca9791a809d567cba7ee27dc027f44a603f27e6180df938cf51": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 out of a possible 300. This gives you the rank of Novice Adventurer."
    },
    // SpAdventure
    "262c345ca71e97a7467badb6dde695f5ac89d2b4a7558f9ecc02d26314842f3e": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 36 out of a possible 350, in 0 turns, earning you the rank of Adventurer."
    },
    // The Lurking Horror (Infocom v3)
    "1862ef7ce4c25abd32d442392fe7eaba9c1595ed5411df75e99b06f43af6f5af": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 of a possible 100, in 0 moves. Graded on the curve, you are in the class of Freshman. DIAGNOSE: You are wide awake, and are in good health."
    },
    // Zork I (Infocom v3)
    "0ae5ac229e79094ff368b6669356444af0f35e21d862a1baaa546989085c15fd": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 (total of 350 points), in 0 moves. / This gives you the rank of Beginner."
    },
    // Risorgimento Represso
    "2ee4d715f51dfdde32559f8a079f2eb000f3864c6028b406dc1a7b1e5f5b06e8": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 50, in 0 turns, meaning you failed the admission criteria. DIAGNOSE: You're in peak physical condition; as peak as can be expected for a Classics student."
    },
    // Save Princeton
    "9b54618dfb9ba1c1694a3e49b705492a26f5b2ec20abc7b98b81742c068864b2": {
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 200, in 1 turn. This makes you a Harvard reject. Startup asks Would you like to read the introduction? (YES or NO)."
    },
    // All Quiet on the Library Front: grid Score conflicts with SCORE
    // (grid Score: 15, SCORE 0 of 30), so no SCORE bound is joined to it.
    "b3665eaf5e30520355a1f07657ffbd69e967ecb53942f86913d044e65fa30e11": {
        "statusPair": ["Score", "Moves"],
        "rejectedForms": ["score"],
        "evidence": "2026-10-05 live grid Score: 15 Moves: 0..2 and compact 15/2; SCORE: You have so far scored 0 out of a possible 30, in 1 turn. Game-authored conflict; grid kept, SCORE not asked."
    },
    // Limp
    "ab8e29c688af48c08ea29fac42e2ce3673efbb2728ae436396e6f261ce44d253": {
        "command": "score", "fields": ["score.max"], "replyFamily": "inform-score", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have scored 0 out of 1, in this many turns: 1 .. Compact grid 0/3 while Moves stayed 2."
    },
    // Zenon
    "cebb8710f287c9ae70cdbda0e04eb7b81f1740f041de0a0964cd8e28996ad439": {
        "command": "score", "fields": ["score.max"], "replyFamily": "inform-score", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 20, in 1 turn, which tells me you're still in the cell, aren't you? Go on, admit it. (taunt, not a rank). Compact grid 0/3 while Moves stayed 2."
    },
    // Mask
    "8d1d4f7c96ebc8dc9f30d4ba253bb680e66fc9ac201cf2f8b6b94bce223ab690": {
        "command": "score", "fields": ["score.max"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 14, in 1 turn."
    },
    // I-0: authored Score/Moves grid redraws as a bare pair.
    "bf8b6f2e3f01cf4312129e0585809358df938d14c4fc4eb308daa86b3df5dc0d": {
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live grid Score: 11 Moves: 40 then compact 11/41 while Moves stayed 40."
    },
    // ---- Codex #1265 assignment ----
    // Silence of the Lambs
    "50b853900fe8696fcd6044b51f4f08ff38447ebbb2b613f0373ce274ab86e522": {
        "command": "score", "fields": ["score.max"], "replyFamily": "inform-score", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: In a total of 1 turns, you have achieved a score of 0 points out of a possible 100."
    },
    // Identity
    "e256737cea05f674b20d536d5a28ccc5bad3a8d8cafb66d8a64061b8fb86b25f": {
        "command": "score", "fields": ["complete", "turns", "time spent"], "replyFamily": "completed-adventure", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have completed 0% of this adventure in 0 moves. / Some additional Statistics: (empty). Grid compact 0/0."
    },
    // Large Machine
    "ef8cafc8ce23bfb403d7c04b6f42a437efc3baab4137c31bd1b87263cdc42cff": {
        "command": "score", "fields": ["quota.max", "turns"], "replyFamily": "metaphysical-quota", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have amassed a metaphysical quota of 0 out of a possible 50, in 1 turn."
    },
    // LASH
    "a9bd579cab84b0b165732d78928641dfd383ed64d1e493c5c7c59e564fcc21f9": {
        "command": "score", "fields": ["date", "time", "location", "value"], "replyFamily": "mule-report", "outcome": "line",
        "evidence": "2026-10-05 live (restore? no) SCORE: Status report: MULE / Date: 9/22/2062 / Time:  8:00 am / Location: DISCONNECTED / All systems functioning normally. / According to my estimation, the objects I have collected have a total value of approximately 0 hundred dollars American. Grid DISCONNECTED   09/22/2062   8:00 am."
    },
    // Zork: A Troll's Eye View
    "68db95623c54dffd7a4bcc75d839af65f4e7b3abeaae4b83f09833bf330e1ec2": {
        "command": "score", "fields": ["adventurers", "turns"], "replyFamily": "adventurers-killed", "outcome": "line",
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live SCORE: You have so far killed 0 adventurers in 1 turn. DIAGNOSE: You are in perfect health."
    },
    // YAGWAD: SCORE only restates the grid score; compact pair is Score/Moves.
    "67b691534a025518db698c008f4a7251dea7a68ebe1ef728971967ae6c07986c": {
        "rejectedForms": ["score"],
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live (SPACE, yes, yes) SCORE: You are a perfect 10. Grid compact 10/1 with no tracked stats."
    },
    // Suspended (Infocom v3)
    "6011284a57a6200c4deebfbeae92b3bac2f98a570ddbbc8cfc8bcc382d5b524f": {
        "command": "score", "fields": ["casualties", "population", "cycles"], "replyFamily": "casualty-cycles", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: There have been 3,000 casualties (original population: 30,172,000) in 0 cycles."
    },
    // Pick up the Phone Booth and Die, Part 2: compact Score/Moves redraw.
    "ba22783cbe996dd2f8c44f0e6206a31b2bb87a5b01ff2c58ed63b545fea76c7b": {
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live compact grid 0/3 while Moves stayed 1; DIAGNOSE: You are a healthy human being."
    },
    // Guess The Verb: SCORE triggers an NPC sales pitch, not a status reply.
    "e17beb4180286c155ba4449618956fe4ae3bdc3e8933accaa04c1c584b3599bd": {
        "rejectedForms": ["score"],
        "evidence": "2026-10-05 live (new, boy) SCORE: \"Well Score would you like to GUESS THE VERB!?!?! Just one shiny quarter gets you a spin of the wheel!...\" (story narration). Grid guessed/completed/moves 0/0/n; DIAGNOSE: You feel fine."
    },
    // Anchorhead: overrides the legacy Grok fact for this digest; the SCORE
    // clause is a score-dependent milestone kept as Progress text, not rank.
    "c2f28a4ddd9367c260946926a33c73a4b0cc38b1f327646cc1202182a28a10ff": {
        "command": "score", "fields": ["score.max", "progress"], "replyFamily": "mystery-progress-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery. Grid 'day one' decoded as Day 1."
    },
    // ---- Glulx (Codex #1304: format + validatedForm from isolated live reply) ----
    // Cragne Manor
    "b7af5c313b5019c6a88dec12bdaa2baf1501c208a207e490bbba2f72fbd29282": {
        "format": "glulx", "validatedForm": true,
        "command": "score", "fields": [], "replyFamily": "no-score", "outcome": "line",
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live after key, yes, yes, key: SCORE: There is no score in this story. DIAGNOSE: That verb doesn't work here, or, at least, not right now, but it might work somewhere later. Grid Turns: 1."
    },
    // Robin & Orchid
    "446f2d112247c9b3cad03ef92cd7fa095bdfa8c275f384857005e4ab0caf1511": {
        "format": "glulx", "validatedForm": true,
        "command": "score", "fields": [], "replyFamily": "no-score", "outcome": "line",
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live after key: SCORE: There is no score in this story. DIAGNOSE: That's not a verb I recognize. Grid room name only."
    },
    // PataNoir: grid right column is a bare move counter.
    "0cbf961054c4866a5298dda978b2a439dd98b9eab54f7098def144fd9633e5f9": {
        "format": "glulx", "validatedForm": true,
        "command": "score", "fields": [], "replyFamily": "no-score", "outcome": "line",
        "rejectedForms": ["diagnose"],
        "statusPair": ["Moves"],
        "evidence": "2026-10-05 live: grid Your Office   1 then 2 after WAIT; SCORE: There is no score in this story. DIAGNOSE: That's not a verb I recognize."
    },
    // Grooverland: DIAGNOSE is a combat event, never asked.
    "ed706aa040176cb79f5440151403d3a164f80477126180d0fb826e486a76433d": {
        "format": "glulx", "validatedForm": true,
        "command": "score", "fields": [], "replyFamily": "no-score", "outcome": "line",
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live: SCORE: There is no score in this story. DIAGNOSE: You try to act, but you're distracted by a threatening motion from your enemy. (story event; dragon then advances). Grid Exits:none is navigation, not a stat."
    },
    // Scroll Thief: grid carries points/act/time/problems/turn; rank is SCORE-only.
    "7af1234102d31ab7e197b05b9e176423ef5c2749bc0f1f68a60cfd4d92a11b34": {
        "format": "glulx", "validatedForm": true,
        "command": "score", "fields": ["rank"], "replyFamily": "inform-score", "outcome": "line",
        "rejectedForms": ["diagnose"],
        "evidence": "2026-10-05 live (S skips intro): SCORE: You have so far scored 0 out of a possible 100, in 1 turn, earning you the rank of Inept Burglar. / [To see a more elaborate score report, type FULL SCORE.] / [To see what you are carrying, type INVENTORY.] DIAGNOSE: I didn't understand that sentence. Grid rows: 0/100 points | Act 1 | 11:15 pm | 1 problem | Turn 1."
    },
    // Get Magazine. Open Magazine. Read Article.
    "9e288e9e29a27181282b925164037b1f9bb1eeec2434f843231466617fe61aea": {
        "command": "score",
        "fields": ["score.max"],
        "replyFamily": "inform-score",
        "outcome": "line",
        "evidence": "Historical SCORE: You have so far scored 0 out of a possible 0, in 0 turns."
    }
};
if (typeof module !== "undefined" && module.exports) module.exports = ModuleStatFactsClaude;
