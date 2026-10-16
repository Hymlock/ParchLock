// D204 measured executable-owned command/layout relationships (Claude batch).
// Same contract as ModuleStatFacts.js: keyed by executable SHA256, command/
// field/reply-family and measured equipment-state capabilities only.
// No stored numeric readings or title dispatch.
var ModuleStatFactsClaude = {
    "abf145d22371f825f13388587d92632bcde90582698f774b896b123a90e1fb1e": {
        // on 19 WITHDRAWN (Codex #3451/#3453): single-object + source needs an authored terminal checkpoint, not list exhaustion; stays unknown.
        // ACTORBIT 30 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16, 2026-10-16-zil-inv-hidden-ops.json command
        // records): 'ROBOT, EAST AND SOUTH' tests 30 TRUE on robot 58, 'DEMON, GIVE ME WAND' TRUE on demon 26; 'TEAPOT, HELLO' /
        // 'MAT, HELLO' FALSE on china teapot 32 / place mat 33 ("You can't talk to ..."). Source exact 9/9.
        "attributeMap": { "container": 18, "supporter": 8, "open": 11, "isOpen": 11, "animate": 30 },
        "openCapability": { "all": ["container"], "none": ["supporter"] }
    },
    // Cutthroats (ZIL): OPENBIT 21 (original-scene native explorer, zil-native-explore4.json, no relocation): hotel-room dresser RAM bit 21
    // 0 closed -> 1 after OPEN (reveals book/key/passbook) -> 0 after CLOSE (contents hidden); OPEN on the bed tests 21 TRUE ("already open"). Container 11 unknown.
    "8600730257949c099fa9c0b3ebf2ebed5038578b9bb9e5be2b0adb63a8786180": {
        // RE-ADDED from target-scoped PROBE walk p2 (original scene, command names the object): CONTBIT 11 tested TRUE on bar, table, tube of putty, closet, bed; FALSE on Weasel knife, Pete the Rat, Johnny Red, cigar. supporter 28 already proven, so surface-aware Open/Close applies. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container, wearable - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // SURFACEBIT 28: TRUE on stove 76, chair 108, table 109, bed 146; FALSE on dinner plate 1, wrist watch 6, knife 8. WEARBIT 18: TRUE on wrist watch 6, air tank 136, diving mask 137, flippers 138, wet suit 139; FALSE on envelope 133, room key 143, passbook 144. Observer-captured walk m1 (object ids, analyzer2). Surface-aware Open/Close as Zork I. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // CONTBIT 11: tested TRUE on dresser, closet, portable drill; FALSE on bedroom door, wallpaper. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "attributeMap": { "open": 21, "isOpen": 21, "supporter": 28, "container": 11 }
    },
    // Plundered Hearts (ZIL): OPENBIT 16: OPEN sets 16 on large cupboard, coffer, canvas hatch, iron door; CLOSE clears (cupboard, coffer). WORNBIT 22: WEAR sets 22 on breeches, shirt, ball gown; REMOVE clears (frock, shirt). zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
    "b53a2588c7926892f8f5e9b201c1855a01892e972d938bf919b4f36e1b8bd7db": {
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container, supporter - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // SURFACEBIT 18: TRUE on table 75, cot 82, silver tray 198; FALSE on well 4, whip 6, powder horn 14. WEARBIT 21: TRUE on shirt 130, breeches 194, ball gown 200; FALSE on line 74. Walk m2 (terminal ending). Surface-aware Open/Close as Zork I. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // Q8 player root: G185 is the only global holding object 192, and every successful TAKE in the walkthrough (4 items) moves the item into 192; the app read player 15 and showed an empty inventory (zil-player-root.json, tmp pglob).
        "playerGlobal": 185,
        // CONTBIT 24: TRUE on coffer, bed, cupboard; FALSE on Davis, pile of clothes. ACTORBIT 31: TRUE on Crulley, Cookie, Lucy, butler; FALSE on coffer, bed. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // RE-ADDED 2026-10-15 (claude, target-scoped original scene, Codex #3474 rule): CONTBIT 24 'look in X'
        // TRUE on ledge 27, skiff 52, coffer 69 and FALSE on dagger 42, shirt 130, breeches 194, oars 161 ... (walk
        // p1); SURFACEBIT 18 TRUE on silver tray 198 ('get tray', walk n2, terminal) and bed 213 ('look in bed', p1),
        // FALSE on ledge 27, skiff 52, coffer 69 (p1). Source pin (zil-source-flags.json): CONTBIT 24 and
        // SURFACEBIT 18 exact (tp 35/9, fp 0). Both together, so surfaces are never offered Open/Close
        // (openCapability above). Closes the coffer/invitation leak (app listed the invitation inside the closed coffer).
        "attributeMap": { "open": 16, "isOpen": 16, "animate": 31, "wearable": 21, "container": 24, "supporter": 18 },
        "wornAttribute": 22,
        // Native i (walkthrough step 119, 2026-10-16-zil-inv-hidden-ops.json) tests bit9 TRUE on gunpowder 144 in the open
        // powder horn and laudanum 102 in the transparent bottle, omitting both; FALSE on 15 printed held items. Source
        // NDESCBIT 9. Codex GO #3525.
        "inventoryHiddenAttribute": 9
    },
    // Wishbringer (ZIL): OPENBIT 25: OPEN sets 25 on shoppe door, metal can, toll gate, refrigerator; CLOSE clears. CONTBIT 4: OPEN tests 4 TRUE on refrigerator, little mailbox, FALSE on shoppe door. zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
    "7847ff3387dc401c511f67349d2847691ba97990f28e9c9d8b1182f3d4bc0dc0": {
        // ACTORBIT 18: TRUE on poodle, Miss Voss, old woman, King Anatinus; FALSE on old bone, fountain. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // SURFACEBIT 27 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16): 'put envelope on counter' tests 27 TRUE on
        // service counter 18 (zil-route-ops.cjs), 'look in trunk' TRUE on gnarled tree trunk 230 (pzwish); 19 negatives in the
        // same walks. Source exact 10/10. Applied with openCapability so surfaces get no Open/Close.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "container": 4, "open": 25, "isOpen": 25, "animate": 18, "supporter": 27 }
    },
    // Zork III (ZIL): OPENBIT 12: OPEN sets 12 on secret door, stone door, wooden door; CLOSE clears (wooden door). zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
    // WEARBIT 4 original scene (2026-10-11-zil-walk-n4.json): TAKE tests 4 TRUE on golden amulet 39, golden ring 82; FALSE on
    // strange key, chest, torch, ancient book, lamp. Source exact 4/4 (amulet, ring, cloak, hood).
    // SURFACEBIT 26 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16, 2026-10-11-zil-walk-pgapz3.json): 'put staff on
    // pedestal' / 'put staff on cage' test 26 TRUE (pedestal 84, steel cage 81); 'put staff on machine' FALSE ("no good surface",
    // gold machine 91). Source exact 2/2. CONTBIT 10 (pgapz3e): 'look in machine' TRUE on gold machine 91 ("is empty"), 'look
    // in cage' TRUE on steel cage 81, 'look in staff' FALSE (wooden staff 31), lamp 198 FALSE (pgapz3c); source exact 12/12.
    // Hooded figure 67 ('remove hood') excluded: not target-scoped. Applied together with openCapability.
    "dce7e6f757fb8379dea9da9c13cdda5412ba03fa9b70d79fb6b8c7faf5970692": {
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 12, "isOpen": 12, "wearable": 4, "supporter": 26, "container": 10 }
    },
    // Ballyhoo (ZIL): OPENBIT 15: OPEN sets 15 on compartment, tests TRUE on bucket, transistor radio; CLOSE clears (compartment). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
    "8db665f95c6475121dadf5ffcec30b0f340816f9c88fabd63ae0fb4fa9a0d588": {
        // RE-ADDED from PROBE walk p1: ACTORBIT 31 TRUE on guard and Comrade Thumb (look in <actor>); FALSE on button, sunglasses, cheese morsel. Ballyhoo container 23 held: positives pass but SURFACEBIT 17 is unproven, so tables would be offered Open/Close. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container, animate - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // CONTBIT 23: tested TRUE on bucket 65, desk 103, lower bunk 109, compartment 213, ash tray 214; FALSE on cage doors 68/149/164, secret panel 212, trailer door 239. ACTORBIT 31: TRUE on Rimshaw 2, roustabout 98, Chuckles 113; FALSE on radio dial 18, newsprint 27, trailer door 44. Repaired walk r3 (terminal ending, object-id keyed, analyzer2). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // Q8 player root: G47 = PLAYER (Codex #3461: historicalsource/ballyhoo 9f779e8 misc.zil inits PLAYER/WINNER to PROTAG; binary at 22675/22678 stores 211 into G175 and G47; TELL routine rewrites only G175 = WINNER). The app read 29 with an empty inventory; walkthrough TAKEs land in 211.
        "playerGlobal": 47,
        // ADDED 2026-10-15 (claude, target-scoped original scene): CONTBIT 23 'look in X' TRUE on barred passage 49,
        // balloon 165, compartment 213, ash tray 214; FALSE on button 22, sunglasses 32, cheese morsel 39, clown
        // mask 93 ... (probe walks pq1/p1). SURFACEBIT 17 TRUE on leather sofa 20 ('look in sofa') and lower bunk 109
        // ('look in bunk'), FALSE on bucket 65 ('take bucket'), trailer door 44 ('close door') ... (probe walk
        // pzballyhoo, surfaces targeted). Source CONTBIT 23 / SURFACEBIT 17 exact. Together, so surfaces get no Open/Close.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 15, "isOpen": 15, "animate": 31, "container": 23, "supporter": 17 },
        // Native i (walkthrough step 90) tests bit6 TRUE on pink dot 231 / blue dot 71 inside the open ticket 122 and
        // omits them; tests it FALSE on bucket 65, meat 102, bullwhip 16, ticket 122 and prints them. Source NDESCBIT 6
        // exact (114/114).
        "inventoryHiddenAttribute": 6
    },
    // Leather Goddesses of Phobos (ZIL): Q8 player root = constant PROTAGONIST object 200 (historicalsource/leathergoddesses 17cbbc1
    // globals.zil 908 OBJECT PROTAGONIST DESC "it" ACTORBIT). No PLAYER global exists; WINNER G189 is mutable (mars.zil sets MITRE/SULTAN/
    // SULTANS-WIFE), so playerGlobal would be wrong after an order. Binary has 19 store G189<-200 = 19 SETG WINNER ,PROTAGONIST in source;
    // object 200 ("it") holds the flashlight at boot. App previously read player 16 with an empty inventory (Codex #3492).
    "103324c3b7332528cc36cc15ce15ae593af5a33ac2b75fae0f04eecc1ffec8f8": {
        "playerObject": 200
    },
    // Spellbreaker (ZIL): Q8 player root = constant PLAYER object 52 (historicalsource/spellbreaker 6f83ba4 globals.zil 324 OBJECT PLAYER
    // DESC "it"). No PLAYER global; WINNER G197 is mutable (globals.zil 923/928 BELBOZ, verbs.zil 334/359 PRSO). Native TAKE puts the
    // item in 52 (zil-player-root); app previously read 22 with an empty inventory.
    "2d097ac9e4081b68658d0331345176946253cb349ed66eeff88533826cae29d0": {
        "playerObject": 52
    },
    "431678a618ba3e1b5506adb9b4b3da9221ad0bbb0426166d5fcc0b37403b5899": {
        "attributeMap": { "container": 21, "supporter": 14, "open": 12, "isOpen": 12 },
        "openCapability": { "all": ["container"], "none": ["supporter"] }
    },
    "91f78d4bbb6bcea5b3a6047e1efbb0ae1efa1c2382d360e679285526125babb3": {
        "attributeMap": { "container": 20, "supporter": 28, "open": 25, "isOpen": 25 },
        "openCapability": { "all": ["container"], "none": ["supporter"] }
    },
    // Sorcerer (ZIL): stable PLAYER global 38 (Codex #3412/#3413, verified grok2 #3425): misc.zil WINNER=PROTAGONIST, PLAYER=WINNER;
    // binary 23591 store G38<-G163 at start, TELL stores only G163 (42801). Native TAKE book inserts into body 223 = G38. Ships with the v3 nested-room fix.
    "3bf24a3d2df3a0828ac1c3d2846580d92759bd20d408151632c760f4a92ec04e": {
        // OPENBIT 15: OPEN sets 15 on desk drawer, journal, receptacle, ochre vial; CLOSE clears (drawer, receptacle). zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
        // 2026-10-15 original scene, target-scoped, source-exact: CONTBIT 27 TRUE on desk drawer, tiny box, ochre vial, sturdy
        // trunk, receptacle (2026-10-11-zil-walk-pzsorcerer.json); SURFACEBIT 17 TRUE on bed ('look on bed') and darkwood desk
        // ('put key on desk'), FALSE on tapestry ("no good surface") (pzsorcerer3). The spell book has 27+15, so its spells stay
        // listed (D148 intent). With openCapability.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // ACTORBIT 31 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16, 2026-10-16-zil-inv-hidden-ops.json):
        // 'GNOME, HELLO' tests 31 TRUE on gnome 245, 'TWIN, HELLO' TRUE on your older self 26, 'BOOK, HELLO' FALSE on spell
        // book 139 ("You can't talk to a spell book!"). Source exact 9/9.
        "attributeMap": { "open": 15, "isOpen": 15, "container": 27, "supporter": 17, "animate": 31 },
        "playerGlobal": 38
    },
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
        // RE-ADDED from PROBE walk p2: SURFACEBIT 6 TRUE on mechanical/electronic/chemical supply shelves; FALSE on Snark, gangplank, supply bunches. Source exact (9 objects). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // 2026-10-15 original scene, target-scoped, source-exact (16/16 each): OPENBIT 18 - OPEN sets it on access panel 250 and
        // test tank gate 21, finds it set on lab door 88; CLOSE clears it on hatch, reactor, circuit breaker
        // (2026-10-11-zil-walk-pzseastalker3.json). CONTBIT 26 - 'look in' TRUE on mechanical supply shelf, reactor; FALSE on
        // Snark, gangplank, supply bunches, scanner, Computestor (pzseastalker). With openCapability.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "supporter": 6, "open": 18, "isOpen": 18, "container": 26 },
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): supporter - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // SURFACEBIT 6: TRUE on workbench 64, mechanical/electronic/chemical supply shelves 67/70/72, work counter 189; FALSE on microphone 62, file drawer 78, electrolyte relay 115. Walk m1; source exact (9 objects). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
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
    // D220: G44 holds PC object 46 across moves (also G50); measured 2026-10-11.
    "ef6530a73b3a3b868f0c872a28944bba407d0e209bf73892af0f38a9ef6a3a48": {
        "playerGlobal": 44,
        // D219 R2 (Grok #3225, Codex #3199/#3203): the short_name block's PAYLOAD
        // word (u16 at val+2) is typed by the story's own region bounds: String
        // 45769..57924, Routine 8034..45768. A routine payload is never text.
        "shortNameDomains": { "stringMin": 45769, "stringMax": 57924, "routineMin": 8034, "routineMax": 45768 },
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
        "wornAttribute": 39,
        "attributeMap": { "container": 43, "supporter": 36, "open": 34, "isOpen": 34 },
        "openCapability": { "all": ["container"], "none": ["supporter"] }
    },
    // Stationfall (ZIL): untouched native routes (Codex #3393-#3400). DROP chronometer inserts it into room 198,
    // TAKE into holder 218; global 183 is the only global equal to that holder, still so after STARBOARD moves
    // holder 218 to room 54 (second DROP/TAKE 54/218). ZRamReader.resolvePlayer re-reads and link-validates it.
    // Native REMOVE uniform/chronometer clears bit 21, WEAR sets it; native i labels both as being worn.
    "3c5656897dd2503610945e80a0b42fc5d25614d967a010ace8e9cafd12f978a3": {
        // Codex #3491 (original-scene native, source pin historicalsource/stationfall 5d05d5e verbs 2473 WEARBIT/WORNBIT, 1962 TELL ACTORBIT): WEAR tests 20 TRUE on uniform 229 and chronometer 1, FALSE on form 98 (refused); TELL tests 31 TRUE on Helen 135 and Floyd 26 with actor replies, FALSE on form 98. No container 17 (ID card OPEN/CLOSE impossible). grok2 gated. Evidence is Codex original scripted routes (2026-10-11-codex-zil-flags-proof.json), not a Jericho walkthrough.
        "attributeMap": { "wearable": 20, "animate": 31, "talkable": 31 },
        "playerGlobal": 183,
        "wornAttribute": 21
    },
    // Hitchhiker: native WEAR GOWN changes [0,0,0,64,32,193] to
    // [0,0,0,192,32,193]; REMOVE GOWN reverses exactly bit24. Native
    // inventory labels it "being worn". Executable-owned fact, not I6's bit26.
    "26dcdab275054e5899c9454a879816a1ced530e9172bd8d8cf101fb7acc27cb4": {
        // Q8 player root: constant PROTAGONIST object 202 (historicalsource/hitchhikersguide 1288855 globals.zil 459 OBJECT PROTAGONIST DESC "it";
        // identity changes use IDENTITY-FLAG, the body stays PROTAGONIST - earth.zil MOVE X ,PROTAGONIST throughout; WINNER is mutable: PROSSER/FORD/BARMAN).
        // Binary: 46 stores G142<-202. Native "get towel" puts towel 121 into 202; app read 19 with an empty inventory (zil-player-root.json).
        // Room: locationGlobal 116 = source HERE (globals.zil 10): 125 je-compares of G116 against room constants in code, G41 none;
        // live replay 60 steps / 8 rooms: G116 always the top room of 202's chain, = Bedroom 150 at boot while 202 is in bed 114 (zil-here-global.js).
        "locationGlobal": 116,
        "playerObject": 202,
        // OPENBIT 39: OPEN sets 39 on Nutrimat panel, handbag; tested TRUE on Sub-Etha device, the thing your aunt gave you; FALSE on shipping carton, touch pad. ACTORBIT 42: TRUE on barman, Vogon Captain, Marvin, Eddie; FALSE on screwdriver, toothbrush. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // CONTBIT 40 / SURFACEBIT 23 original scene, target-scoped: 'look in gown' / 'look on bed' TRUE on 40, curtains FALSE
        // (2026-10-11-zil-walk-pzhhgg.json); 'look on bed' / 'look on bar' TRUE on 23, Ford and towel FALSE
        // (pzhhgg2, walkthrough + spliced probes). Source exact 22/22, 3/3. Applied together with openCapability.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 39, "isOpen": 39, "animate": 42, "container": 40, "supporter": 23 },
        "wornAttribute": 24,
        // Native i (walkthrough step 60) tests bit44 TRUE on guarantee 18, green 128 / red 197 button inside the Sub-Etha
        // device 211 and omits them; FALSE on satchel, gown, fluff, thing, device, all printed. Source NDESCBIT 44 exact (77/77).
        "inventoryHiddenAttribute": 44
    },
    // Planetfall (ZIL): the worn attribute is 12, not Inform's 26. Measured
    // (Codex #1663): native REMOVE UNIFORM clears exactly bit 12 on the
    // uniform; fresh inventory reports the uniform and chronometer
    // "(being worn)", both of which carry bit 12.
    "b73c750df3a3d6781072eb7f9f562d5c60bfc6dc8203f4952ebff50f04f412cf": {
        // RE-ADDED from PROBE walk p4: CONTBIT 24 TRUE on glass flask, large desk, small desk, canteen, dispenser unit; FALSE on old battery, laser setting dial, chemical fluid, funnel-shaped hole. Source has no SURFACEBIT object. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // CONTBIT 24: walk m1-m4 TRUE on large desk 145, small desk 149, canteen 163, survival kit 213; native dispatch TRUE on microfilm reader 55, medicine bottle 80, glass flask 125, cardboard box 137 and FALSE on four creatures 1-4 (zil-flags-neg-Planetfall). Planetfall source has NO SURFACEBIT object, so no table can be offered Open/Close. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // OPENBIT 11: OPEN sets 11 on escape pod bulkhead, door, small desk, large desk; tested FALSE first (survival kit, desks). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "wornAttribute": 12,
        // WEARBIT 22: native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). Container/open stay unproven (fail closed).
        "attributeMap": { "wearable": 22, "open": 11, "isOpen": 11, "container": 24 }
    },
    // Hollywood Hijinx (ZIL): WEARBIT 22 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match).
    "e3341f28a0cca7a2e7bdf151c7b31b16124e77f31bf0e0e1349be2e6ae2fbe5e": {
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // CONTBIT 4: TRUE on mailbox, small compartment, cannon, pile of cannon balls; FALSE on doorbell, Status Line. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "attributeMap": { "wearable": 22 }
    },
    // Moonmist (ZIL): WEARBIT 29 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match).
    // OPENBIT 14 original scene (pzmoonmist6): "open luggage" sets 14, "open gate" finds it set on the front gate and
    // "close gate" clears it; source-exact 57/57. CONTBIT 27 / SURFACEBIT 23 from the original scene
    // (2026-10-11-zil-walk-pzmoonmist5.json, target-scoped probes: chest of drawers, sports car, wardrobe / wing chair, bed, night
    // table, bench) and source-exact. Together, so surfaces get no Open/Close. Closes the luggage-contents leak (ledger FINDING).
    "bcf65075f2343fd3d10606141d7dbfa2c50f8bbf96b65161e2bda0f7fc65e3b0": {
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "wearable": 29, "open": 14, "isOpen": 14, "container": 27, "supporter": 23 }
    },
    // Deadline (ZIL): OPENBIT 28 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). CONTBIT 21 is also proven but is NOT applied
    // until SURFACEBIT/supporter is proven, so surfaces never gain container Open/Close (Zork I table lesson, a89704b).
    // 2026-10-15: both now from the original scene (2026-10-11-zil-walk-pzdeadline.json, target-scoped probes): CONTBIT 21 on
    // living room table, marble-top table, front door; SURFACEBIT 29 on both tables; negatives cabinets, portraits, fireplace,
    // lamp, book, wood pile. Source-exact (24/24, 10/10). Applied together with openCapability.
    "9c6eadbb30bbe1610230508865ec40969a7c54917fc40591a189c9f3835dffc4": {
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 28, "isOpen": 28, "container": 21, "supporter": 29 }
    },
    // The Witness (ZIL): OPENBIT 8 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). CONTBIT 9 proven but held until supporter is proven (as Deadline).
    // The Witness (ZIL): constant PLAYER object 79 (historicalsource/witness 8fe092a people.zil 73 OBJECT PLAYER
    // IN DRIVEWAY-GATE DESC "detective"). No PLAYER global; WINNER (G112 in this binary, 19 stores G112<-79) is
    // reassigned (SETG WINNER ,PLAYER x15 in people.zil), so playerGlobal is not used. Native i at boot lists the
    // telegram, handcuffs, Colt and match book, all children of 79; the app previously resolved no player (2026-10-15).
    // CONTBIT 9 / SURFACEBIT 16 original scene (2026-10-11-zil-walk-pzwitness2.json, target-scoped, source-exact 27/27,
    // 17/17): file cabinet, liquor cabinet, lounge / lounge, carved chair, desk; negatives cat, Monica, Linder, newspaper,
    // putty, door bell. Applied together with openCapability so surfaces get no Open/Close.
    "2290bb3440ac66e14d54d41dbde575066ebdbdc42138ec899496e359bc484824": {
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 8, "isOpen": 8, "container": 9, "supporter": 16 },
        "playerObject": 79
    },
    // Sherlock (Infocom, z5; no historicalsource pin): constant PC object 232 "you" (Watson). Native i lists exactly
    // 232's children (black bag 172, whistle 173, hat 188, coat 302); G201 holds 232 and its parent follows the status-line
    // room on travel (221-B Baker Street 38 -> KNOCK ON DOOR -> Entry Hall 111), measured 2026-10-16 (zil-route-ops). The
    // resolver otherwise picked the parser "yourself" 168 (parent 177, offstage) and the room fell back to the black bag.
    // Constant object, not the global, because orders to Holmes may reassign a WINNER-style global. SOLO/SELF-AUDIT.
    "ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0": {
        "playerObject": 232
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
        "evidence": "2026-10-05 live SCORE twice: The score is: (Jack 1/Life 0)",
        // Native i (after take all; 2026-10-16-hidden-bit-finder.json) tests bit17 (scenery here) TRUE on your coat 89 and
        // your head/legs/arms 64/62/63 and omits them; FALSE on the printed picture-frame 67 ("You are carrying the
        // picture-frame."). SOLO/SELF-AUDIT.
        "inventoryHiddenAttribute": 17
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
        // on 15 WITHDRAWN (Codex #3451-#3453): LH walk had a 128-step empty tail; completion unproven; stays unknown.
        // CONTBIT 27: tested TRUE on refrigerator, cardboard carton, access panel; FALSE on Funny Bones package, microwave controls, display (zil-walk). Q8 player root: G188 is the only global holding object 56; walkthrough TAKEs (4) move items into 56; app read 29 with an empty inventory. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "playerGlobal": 188,
        // OPENBIT 13 (original-scene native explorer, zil-native-explore2-c.json): refrigerator OPEN tests 13 false, sets it,
        // reveals carton + Coke; CLOSE tests true, clears. OPEN on chair, pc, kitchen counter, forklift tests 13 TRUE natively.
        // SURFACEBIT 8 original scene (2026-10-11-zil-walk-pzlurking.json, target-scoped): chair, kitchen counter, forklift,
        // floor waxer TRUE; catwalk, ladder, flask, refrigerator, microwave oven, flashlight, crowbar FALSE. Source exact 10/10.
        // Applied with openCapability so surfaces get no Open/Close.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        "attributeMap": { "open": 13, "isOpen": 13, "container": 27, "supporter": 8 },
        // Native i (take all, i; 2026-10-16-hidden-bit-finder.json) tests bit18 TRUE on the pc's mouse 199 and HELP key 107
        // and omits them; FALSE on the printed chair 62, pc 191, assignment 97. Source NDESCBIT 18 exact (72/72). SOLO/SELF-AUDIT.
        "inventoryHiddenAttribute": 18,
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 of a possible 100, in 0 moves. Graded on the curve, you are in the class of Freshman. DIAGNOSE: You are wide awake, and are in good health."
    },
    // Zork I (Infocom v3)
    "0ae5ac229e79094ff368b6669356444af0f35e21d862a1baaa546989085c15fd": {
        // ACTORBIT 30: tested TRUE on thief 114 (kill thief) and troll 217; FALSE on egg 87, engravings 97, pedestal 106, wooden door 111, rope 129, railing 134. Observer-captured walk mz3 (seed 3, full 396 steps, no death), object-id keyed, analyzer2. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // ONBIT 20: LIGHT sets 20 on brass lantern, matchbook, pair of candles; tested FALSE on the lantern before lighting (TURN OFF clears). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // Native OPEN/CLOSE dispatch (Codex 2026-10-11, owned proof JSON): mailbox 160, sack 224 and
        // bottle 236 test CONTBIT 19, OPEN sets and CLOSE clears OPENBIT 11; OPEN leaflet 161 tests 19
        // false. Initial sack/bottle/table lack 13 but have 19; 13 is mailbox-only, not CONTBIT.
        // SURFACEBIT 10 kitchen table preserved. Surface-aware Open/Close (Codex #3371/#3377):
        // CLOSE TABLE 204 (19 and 10) answers cannot-close, so container-derived Open/Close needs
        // container AND NOT supporter here. Facts stay truthful.
            "attributeMap": { "container": 19, "open": 11, "isOpen": 11, "supporter": 10, "on": 20, "animate": 30 },
        "openCapability": { "all": ["container"], "none": ["supporter"] },
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
