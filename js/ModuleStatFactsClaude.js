// D204 measured executable-owned command/layout relationships (Claude batch).
// Same contract as ModuleStatFacts.js: keyed by executable SHA256, command/
// field/reply-family and measured equipment-state capabilities only.
// No stored numeric readings or title dispatch.
var ModuleStatFactsClaude = {
    "abf145d22371f825f13388587d92632bcde90582698f774b896b123a90e1fb1e": {
        // D1 source-proven (r44): inventoryHiddenAttribute 14 = NDESCBIT (tp 50 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 14,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope3/): Foot Bridge 228 bridge, Great Cavern 227 mosses, Narrow Tunnel stream; reciprocal refusals; Dark Tunnel 225 dark. INVISIBLE 9 tp6 fp0 fn1 (one source owner not set at start: disclosed).
        "localScope": { "property": 12, "width": 1, "holder": 249, "roomLitAttribute": 19, "invisible": 9 },
        // on 19 (bounded, codex #5475): the earlier WITHDRAWN (Codex #3451/#3453) applied to the whole ON domain (single object, no authored terminal checkpoint) and that domain stays unknown. Later bounded qualification 0945d47 (grok1 #4827 retained packet switch/zork2.json): held lamp 76 only, see Switch below. Other ON 19 carriers are room-lit, never switchable; no whole-ON-domain consumer claim.
        // ACTORBIT 30 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16, 2026-10-16-zil-inv-hidden-ops.json command
        // records): 'ROBOT, EAST AND SOUTH' tests 30 TRUE on robot 58, 'DEMON, GIVE ME WAND' TRUE on demon 26; 'TEAPOT, HELLO' /
        // 'MAT, HELLO' FALSE on china teapot 32 / place mat 33 ("You can't talk to ..."). Source exact 9/9.
        // WEARBIT 3 / FOODBIT 20 (grok1 2026-10-17, g1-ops2 = Jericho walkthrough replay, target-scoped): 'wear crown' (180, after
        // GET CROWN) tests gaudy crown 86:3 TRUE x2; 'wear lamp' (180) tests lamp 76:3 FALSE ("You can't wear the lamp."). Full RAM
        // scan (g1-scan2, ids 1-255): crown 86 is the ONLY object carrying 3, source WEARBIT exact 1/1, so the whole-module
        // single-owner exception (rule 5) applies. EAT on a cake is intercepted by its handler (no bit test), so DRINK reaches
        // the FOODBIT check: 'drink green cake' (89) 71:20 TRUE x2, 'drink red cake' (89) 68:20 TRUE x2 ("How can you drink
        // that?"); 'eat lamp' (89) 76:20 FALSE ("I don't think that the lamp would agree with you."). RAM 20 = red/orange/blue/
        // green cakes 68-71 + package of candy 55 = source FOODBIT exact 5/5.
        // LIGHTBIT 31 = light (claude 2c72ef2 evidence, independently reproduced by grok1 2026-10-17, g1-z2L.json, cold start, test_attr recorded
        // only during the named command): 'light lamp' tests lamp 76:31 TRUE ("The lamp is now on."); 'turn on sword' tests sword 23:31 FALSE
        // ("You can't turn that on."). Source LIGHTBIT carried only by LAMP; bounded compiled-table scan (250 objects, ends at first property
        // 2992): bit-31 carriers = {76} -> rule-5 single-owner exception. Consumers (#3904): ZRamReader 1679 applies only to blank-named
        // objects (the lamp is named), 1749 is Inform-only, 2718 is inventory item-likeness; no map-room effect.
        // enterable 27 = source VEHBIT exact; native (r3-claude/vehbit + vehbit2): bucket 51 and basket 98 (ENTER/GET IN move the player inside; GET OUT returns; bare EXIT refused).
        // door 22 = source DOORBIT exact; native (r3-claude/doorbit): oak door 102 (locked, then opens), barred window 101.
        // Switch (grok1 #4827 work/investigations/grok1/switch/zork2.json): lamp 76: TURN ON -> "The lamp is now on." (19 set), TURN OFF -> "The lamp is now off."; held sword refuses. V-LAMP-ON acts only on LIGHTBIT objects, LIGHTBIT exact 1 of 1 (single-owner + whole-source exception). ONBIT 19 on other carriers is room-lit state: never switchable.
        "attributeObjects": { "edible": [31], "switchable": [76] },
        "capabilityForms": { "edible": [{ "objectId": 31, "scope": { "containerObject": 32, "openAttribute": 11, "held": true }, "actions": [{ "verb": "drink" }] }], "switchable": ["turn on", "turn off"] },
        "activationState": { "onObjects": [76] },
        // talkable 30 = the proven animate bit (grok1 2026-10-24, item 4 talkable batch; same mapping as Spellbreaker/Stationfall): talk-command scoped,
        // native, test_attr recorded only during the named command (grok1/talk/talk-probe.json, no relocation): 'robot, hello' / 'tell robot' @96 test robot 58:30 TRUE ("My programming is insufficient..."), 'demon, hello' @273 tests demon 26:30 TRUE ("The genie grins demonically, but says nothing."); 'tell teapot' @9 tests china teapot 32:30 FALSE ("You can't talk to the china teapot!").
        // Source V-TELL / parser addressing tests this bit and refuses non-actors with "You can't talk to ...".
        // climbable 23 = CLIMBBIT exact; single carrier stairs 188 (whole-source); native bare CLIMB STAIRS from Oddly-angled Room -> Stairway; CLIMB LAMP refused.
        // moved 2 = TOUCHBIT (native, codex #5178 resume-20261020/moved/packet-zork2.json): TAKE sword 23 and lamp 76 set bit 2; bridge 245 stays clear.
        // transparent 7 = source TRANSBIT exact (6 objects, fp 0 fn 0; historicalsource 3da9661); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // Proposed concealed 9 = native INVISIBLE; retained Codex packet concealed/packet-zork2.json (55/83 positives; 76 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        "attributeMap": { "container": 18, "supporter": 8, "open": 11, "isOpen": 11, "animate": 30, "talkable": 30, "wearable": 3, "edible": 20, "light": 31, "enterable": 27, "door": 22, "on": 19, "climbable": 23, "moved": 2, "transparent": 7 , "concealed": 9 },
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: ROBOT, CERBERUS, UNICORN (2dungeon.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] }
    },
    // Cutthroats (ZIL): OPENBIT 21 (original-scene native explorer, zil-native-explore4.json, no relocation): hotel-room dresser RAM bit 21
    // 0 closed -> 1 after OPEN (reveals book/key/passbook) -> 0 after CLOSE (contents hidden); OPEN on the bed tests 21 TRUE ("already open"). Container 11 unknown.
    "8600730257949c099fa9c0b3ebf2ebed5038578b9bb9e5be2b0adb63a8786180": {
        // lightForms (work/investigations/grok2/lightForms-DRAFT.md sha 76e755d4; four-seat ACCEPT (codex-votes-0231, grok-review-lightforms-draft); native lightsource-native/): flashlight 116 tests bit 27; TURN ON sets ONBIT 17, TURN OFF clears it; key 143/watch 6 refuse.
        "lightForms": { "capabilityBit": 27, "stateBit": 17, "objects": [116], "on": { "default": "turn on" }, "off": { "default": "turn off" } },
        // D1 source-proven (r44): inventoryHiddenAttribute 12 = NDESCBIT (tp 48 fp 0 fn 1); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 12,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope5/): Your Room 183 / Upstairs Hallway 147 wallpaper; stairs refused at 183, window refused at 147. Lit bit set in all reached rooms. INVISIBLE 30 exact, ONBIT 17 exact.
        "localScope": { "property": 8, "width": 1, "holder": 222, "roomLitAttribute": 17, "invisible": 30 },
        // RE-ADDED from target-scoped PROBE walk p2 (original scene, command names the object): CONTBIT 11 tested TRUE on bar, table, tube of putty, closet, bed; FALSE on Weasel knife, Pete the Rat, Johnny Red, cigar. supporter 28 already proven, so surface-aware Open/Close applies. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container, wearable - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // SURFACEBIT 28: TRUE on stove 76, chair 108, table 109, bed 146; FALSE on dinner plate 1, wrist watch 6, knife 8. WEARBIT 18: TRUE on wrist watch 6, air tank 136, diving mask 137, flippers 138, wet suit 139; FALSE on envelope 133, room key 143, passbook 144. Observer-captured walk m1 (object ids, analyzer2). Surface-aware Open/Close as Zork I. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // CONTBIT 11: tested TRUE on dresser, closet, portable drill; FALSE on bedroom door, wallpaper. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // PERSON 23 / FOODBIT 8 (grok1 2026-10-17, g1-scan2 = Jericho walkthrough replay seed 10, test_attr recorded only during the
        // named command): 'eat weasel' @23 tests Weasel 9:23 TRUE, 'eat pete' @23 tests Pete the Rat 11:23 TRUE (V-EAT PERSON branch,
        // "Cannibalism isn't a good idea."); 'eat watch' @23 tests wrist watch 6:23 FALSE x2 ("...would agree with you"). RAM 23 =
        // Weasel 9, Pete 11, Johnny Red 12, McGinty 14, you 182, cretin 184 = source PERSON exact 6/6. FOODBIT: 'eat food' @23 tests
        // meal 105:8 TRUE ("Not bad! It really hit the spot."); 'eat watch' 6:8 FALSE x2, 'eat weasel' 9:8 FALSE x2. Whole RAM scan:
        // meal 105 is the ONLY real object carrying 8 = source FOODBIT exact 1/1 (MEAL, island.zil, SYNONYM FOOD MEAL STEW), so the
        // rule-5 single-owner exception applies (SYNTAX EAT OBJECT (FIND FOODBIT); V-EAT's own FOODBIT clause is commented out).
        // WEARBIT 18 (grok1 2026-10-17, same replay): 'wear wet suit' @280 tests 139:18 TRUE, 'wear flippers' @284 tests 138:18 TRUE
        // ("You are now wearing ..."); 'wear flashlight' @291 tests flashlight 116:18 FALSE ("You can't wear the flashlight."). RAM 18 =
        // watch 6, diving suit 81, air tank 136, mask 137, flippers 138, wet suit 139 = source WEARBIT exact 6/6.
        // ONBIT 17 (state only; R3 claude lane on codex-accepted design cutthroats-on-integration-proposal.md): native ON sets 17
        // and OFF clears it on two distinct owners, flashlight 116 and the Mary Margaret's large compressor 89 (Aft Deck) (walkthrough 0-18 then
        // w,w,n,e,s); named EXAMINE 89 after OFF tests 17 FALSE with the native "off" reply. No switchable capability implied.
        // door 25 = source DOORBIT exact; native (grok2 r4-grok2/doorbit/Cutthroats.z3.js.json): bedroom door 177 and door 26 strict OPEN/CLOSE toggles on OPENBIT 21; front door 164 locked refusal; held room key refuses.
        // scenery 12 = NDESCBIT (tp 48 fp 0 fn 1; grok1 scenery3, operator scenery ruling 11:45): LOOK omits liquor/drink/mirror/bar/chair, EXAMINE works.
        "capabilityForms": { "edible": [{ "objectId": 103, "scope": { "containerObject": 109, "openAttribute": 21 }, "actions": [{ "verb": "drink" }] }] },
        "attributeObjects": { "edible": [103] },
        // transparent 19 = source TRANSBIT exact (9 objects, fp 0 fn 0; historicalsource 2febadb); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // moved 29 = TOUCHBIT (native, codex batch3-native.cjs output resume-20261020/moved/Cutthroats.z3.js.json; packet via grok1 #5201): GET PASSBOOK AND ROOM KEY: room key 143 and passbook 144 each set bit 29; air tank 136 stays clear.
        // enterable 9 = source VEHBIT exact (5 carriers incl. bunk 79, bed 146, cask 40, chair 108); native (grok1 #4853 grok1/enter/cutthroats.json, probes ect3/ect4): ENTER/GET IN BED -> player 184 parent 183->146 (step 3), ENTER/GET IN CHAIR -> 112->108 (step 27); GET OUT OF/STAND UP return; ENTER DRESSER / ENTER TABLE "You hit your head" (parent unchanged).
        // concealed 30 = INVISIBLE (native, claude worker E1 work/investigations/claude-probe/concealed/packet-cutthroats.json): ferry 155 cannot be seen until WAIT brings it (30: 1->0, then EXAMINE describes it; a daemon re-hides it after the turn); first hole 63 cannot be seen until DRILL SAFE WITH DRILL (30: 1->0, then "As holes go, it's very nice"); drill 64 visible with 30 clear.
        // talkable 26 = VICBIT (four-seat ACCEPT, grok-lane-1031/PACKET-cutthroats-talkable.md sha 684f56dd): V-TELL (verbs:2588) sets WINNER only when PRSO has VICBIT; else TELL-NO-TELL. Source exact 9/9 (11 FLAGS carriers incl self objects ME/ADVENTURER - consumer may suppress self). Native 3+2 bit-tested.
        "attributeMap": { "open": 21, "isOpen": 21, "supporter": 28, "container": 11, "animate": 23, "edible": 8, "wearable": 18, "on": 17, "door": 25, "scenery": 12, "transparent": 19, "moved": 29, "enterable": 9, "concealed": 30, "talkable": 26 },
        // WORNBIT 13 (grok1 2026-10-17, g1-ctA/B Jericho replay, test_attr recorded only during the named command): 'remove watch' @287 tests
        // wrist watch 6:13 TRUE x3 ("You are now holding the wrist watch.") and the RAM scan after it drops 6 from the owners (UNWEAR FCLEARs);
        // 'remove wet suit' @287 tests 139:13 TRUE; 'wear flippers' @284 tests 138:13 FALSE before and TRUE after; 'remove flashlight' @291
        // tests flashlight 116:13 FALSE. Codex cold WEAR WATCH (items-codex/2026-10-17-cutthroats-wear-watch.json) 6:13 TRUE. Source V-WEAR
        // (verbs:2742) checks WEARBIT 18 then FSETs WORNBIT 13; UNWEAR (2756) FCLEARs it.
        "wornAttribute": 13,
    },
    // Plundered Hearts (ZIL): OPENBIT 16: OPEN sets 16 on large cupboard, coffer, canvas hatch, iron door; CLOSE clears (cupboard, coffer). WORNBIT 22: WEAR sets 22 on breeches, shirt, ball gown; REMOVE clears (frock, shirt). zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
    "b53a2588c7926892f8f5e9b201c1855a01892e972d938bf919b4f36e1b8bd7db": {
        // D232 local globals, roots only (work/investigations/r3-claude/localscope5/): Captain's Quarters 169 / Landing 92 curtain; stair refused at 169, window refused at 92. INVISIBLE 20 exact, ONBIT 29 exact.
        "localScope": { "property": 11, "width": 1, "holder": 37, "roomLitAttribute": 29, "invisible": 20 },
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container, supporter - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // SURFACEBIT 18: TRUE on table 75, cot 82, silver tray 198; FALSE on well 4, whip 6, powder horn 14. WEARBIT 21: TRUE on shirt 130, breeches 194, ball gown 200; FALSE on line 74. Walk m2 (terminal ending). Surface-aware Open/Close as Zork I. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: LUCY, DAD, LAFOND, CRULLEY, COOKIE (extras.zil), HERO (hero.zil), CROC (island.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // Q8 player root: G185 is the only global holding object 192, and every successful TAKE in the walkthrough (4 items) moves the item into 192; the app read player 15 and showed an empty inventory (zil-player-root.json, tmp pglob).
        "playerGlobal": 185,
        // CONTBIT 24: TRUE on coffer, bed, cupboard; FALSE on Davis, pile of clothes. ACTORBIT 31: TRUE on Crulley, Cookie, Lucy, butler; FALSE on coffer, bed. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // RE-ADDED 2026-10-15 (claude, target-scoped original scene, Codex #3474 rule): CONTBIT 24 'look in X'
        // TRUE on ledge 27, skiff 52, coffer 69 and FALSE on dagger 42, shirt 130, breeches 194, oars 161 ... (walk
        // p1); SURFACEBIT 18 TRUE on silver tray 198 ('get tray', walk n2, terminal) and bed 213 ('look in bed', p1),
        // FALSE on ledge 27, skiff 52, coffer 69 (p1). Source pin (zil-source-flags.json): CONTBIT 24 and
        // SURFACEBIT 18 exact (tp 35/9, fp 0). Both together, so surfaces are never offered Open/Close
        // (openCapability above). Closes the coffer/invitation leak (app listed the invitation inside the closed coffer).
        // door 26 = source DOORBIT exact; native (codex door-ph-native.json): large cupboard 45 and canvas hatch 137 toggle 16; slippers refuse.
        // talkable 31 (grok2 #4933, verified grok1; g1-batch talk run grok1/batch/talk-plundered-{run,plan}.json, test_attr during the named talk command only): Crulley 8 "crulley, hello"/"talk to crulley" 8:31 TRUE, Captain Jamison 190 "talk to" 190:31 TRUE; smelling salts 11 11:31 FALSE.
// scenery 9 = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos ledge 27, coffer 69 (look omits, pc 42969); neg Crulley 8, pile of clothes 125 (listed, same pc). Listing routine: historicalsource f3db372 verbs.zil:3056 DESCRIBABLE?.
        // enterable 28 = source VEHBIT exact; native (grok1 #4999 grok1/enter/plundered.json): carriers 213 and 93 ENTER moves the player inside, non-carrier refuses.
        // transparent 14 = source TRANSBIT exact; native (grok1 #5073 grok1/transp/plundered.json): closed fence 111 LOOK IN shows the cage contents, closed leather bottle 121 gives its contents reply; T read at pc 29297; closed coffer 69 T=0 (flag-level negative, the visible reply auto-opens).
        // locked 10 = LOCKEDBIT exact; native (grok1 #5092 grok1/locked/plunderedhearts-locked.json): coffer 69 and gate 39 read 10=1 ("It's quite locked."); trapdoor reads 0.
        // moved 19 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): shirt 130 and breeches 194 (separate GET), pile of clothes 125; bed 213 stays clear. Coffer excluded (already touched).
        // concealed 20 = INVISIBLE (native, codex #5263 resume-20261020/concealed/packet-plundered.json, accepted grok1 #5270): fuse 188 (IN HOLD) unseen until ship.zil 1106 FCLEAR; garter (IN LUCY) INVISIBLE until FCLEAR; coffer 69 negative. Bit fact only: the actor-held garter consumer is NOT certified.
        "attributeMap": { "open": 16, "isOpen": 16, "animate": 31, "talkable": 31, "wearable": 21, "container": 24, "supporter": 18, "door": 26, "scenery": 9, "enterable": 28, "transparent": 14, "locked": 10, "moved": 19, "concealed": 20 },
        "wornAttribute": 22,
        // Native i (walkthrough step 119, 2026-10-16-zil-inv-hidden-ops.json) tests bit9 TRUE on gunpowder 144 in the open
        // powder horn and laudanum 102 in the transparent bottle, omitting both; FALSE on 15 printed held items. Source
        // NDESCBIT 9. Codex GO #3525.
        "inventoryHiddenAttribute": 9
    },
    // Wishbringer (ZIL): OPENBIT 25: OPEN sets 25 on shoppe door, metal can, toll gate, refrigerator; CLOSE clears. CONTBIT 4: OPEN tests 4 TRUE on refrigerator, little mailbox, FALSE on shoppe door. zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
    "7847ff3387dc401c511f67349d2847691ba97990f28e9c9d8b1182f3d4bc0dc0": {
        // Worn state 10: Grok4114/4115 proposal, independently native-qualified by Codex October20; see recovered-wear review.
        "wornAttribute": 10,
        // ACTORBIT 18: TRUE on poodle, Miss Voss, old woman, King Anatinus; FALSE on old bone, fountain. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // SURFACEBIT 27 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16): 'put envelope on counter' tests 27 TRUE on
        // service counter 18 (zil-route-ops.cjs), 'look in trunk' TRUE on gnarled tree trunk 230 (pzwish); 19 negatives in the
        // same walks. Source exact 10/10. Applied with openCapability so surfaces get no Open/Close.
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // door 2 = source DOORBIT exact; native (grok2 r4-grok2/doorbit/Wishbringer.z3.js.json strict): toll gate 190 and stump 19 OPEN/CLOSE toggle OPENBIT 25; held small stone refuses ("How can you do that to a small stone?").
        // transparent 23 = source TRANSBIT exact; native (grok1 #5073 grok1/transp/wishbringer.json): locked display case 209 "contains a sculpture", glass case 235 T=1 at the same pc; closed metal can 229 and envelope 43 (no bit) "is closed".
        // talkable 18 = ACTORBIT exact 21/21; native (grok1 #5181 talk2/cache/run-wishbringer-*): TALK TO / ASK Ms. Voss 193 reads 18=1 and answers; envelope 43 reads 0 and refuses; Mr. Crisp, gravedigger, old woman, Alexis, vulture, troll, platypus and King Anatinus answer natively (actor routines intercept before the bit test).
        // moved 28 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): envelope 43 and old bone 117; little mailbox 4 stays clear.
        // locked 14 = LOCKEDBIT, runtime-mutable; 10 carriers, none a room (grok1 #5228 grok1/probe5/run-wbj-*): OPEN library door 40 and display case 209 read 14=1 ("It's locked."); refrigerator 82 and mailbox 4 read 0.
        "attributeMap": { "container": 4, "open": 25, "isOpen": 25, "animate": 18, "supporter": 27, "wearable": 22, "door": 2, "transparent": 23, "talkable": 18, "moved": 28, "locked": 14 }
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
        // E5: Zork III WEARBIT4 + direct measured PLAYER G178; source requires DROP (no REMOVE). Retained native amulet39 DROP clears direct custody while bit4 stays set; generated/rendered dispatch independently verified at constructed tier (review-20261027/z3-custody-prototype-r1).
        "equipmentState": { "wornWhen": "wearable-direct-player", "wornRemoval": "drop" },
        // D1 source-proven (r44): inventoryHiddenAttribute 25 = NDESCBIT (tp 59 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 25,
        "inventoryHiddenRecurses": true,
        // Primary PLAYER G178: current GO copies WINNER G163 into this separate role; native eight-command identity/custody proof, exact digest. No NPC/restore/all-lifecycle claim.
        "playerGlobal": 178,
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // supporter 26 RESTORED 2026-10-16 (grok1 #3615/#3640, operator rule 5 module-exhaustion exception). Codex #3556 is right
        // that the old pedestal test was ambient. Re-probe (grok1 g1-z3ring/z3ringneg): past-scene "put ring on pedestal" (step 145)
        // is refused by the cage routine, and its only 84:26 tests are the scope passes. Module searched: source SURFACEBIT is exactly
        // 2/2 (cage 81, pedestal 84; historicalsource zork3). Target positive: cage 81 ("put staff on cage"). Target negative: gold
        // machine 91 ("There's no good surface"). The second surface is source-cited and RAM bit 26 is set, but no command can reach
        // it. Without 26, containers 81/84 (bit 10 too) were offered Open/Close (252e145 REJECT #3632/#3637).
        // FOODBIT5: sole current bounded-table owner waybread34; native EAT tests TRUE and consumes it,
        // held lamp198 tests FALSE/refuses. Complete pinned source corroborates one active FOODBIT owner;
        // archived release25 differs from this release17, so no exact-build source claim. Shared food
        // policy4f2123f keeps Eat without inferring Drink. Evidence: resume-20261020/zork3-food/.
        // D232 local globals, roots only (codex #4748, resume-20261020 zork3-local-roots-native): room property 7 lists LOCAL-GLOBALS
        // holder 221 children; native Endless Stair 64 [216] EXAMINE stairs recognised, Cliff 58 [57,215,75,56] EXAMINE cliff
        // recognised, reciprocal negatives refused. Room lit ONBIT 15 (exact 27 of 27; true both rooms, Junction 63 dark reply).
        // INVISIBLE 28 exact 5 of 5. Zork-era GLOBAL-CHECK never searches inside local globals, so no contents key.
        "localScope": { "property": 7, "width": 1, "holder": 221, "roomLitAttribute": 15, "invisible": 28 },
        // door 9 = source DOORBIT exact; native (r3-claude/doorbit): secret door 156, stone door 104, wooden door 103 toggle; cleft 106 is a disclosed extra.
        // Switch (grok1 2026-10-24, g1-batch.cjs one-walk replay, grok1/batch/switch-zork3.json; test_attr and bits recorded only during the named command, no relocation):
        // lamp 198 @0: TURN ON tests 198:19 TRUE and sets ONBIT 15 ("The lamp is now on."); TURN OFF tests 198:19 TRUE and clears 15 ("The lamp is now off."); TURN ON again sets 15.
        // Golden amulet 39 @28 refuses both ("You can't turn that on." / "...off.", 39:19 FALSE). Torch 41 (LIGHTBIT carrier, a flame) is NOT switchable: TURN ON "It's already lit.",
        // TURN OFF extinguishes, re-TURN ON "You have nothing to light it with." (19 never tested) -> excluded. Same per-object form as Zork2 lamp 76 (#4827).
        "attributeObjects": { "switchable": [198] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
// scenery 25 = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos tree 32, rope 33, shiny object 35, reeds 44, runes 132 (look omits, pc 25769); neg man 27 (listed, same pc). Listing routine: historicalsource 3ec9ed4 gverbs.zil:1824.
        // climbable 24 = CLIMBBIT exact; native bare (grok1 #5082): CLIMB STAIRS 216 Aqueduct View -> Lake Shore, bit read 1; CLIMB LAMP "Bizarre!". Ladder 23 unreached (low risk).
        // moved 27 = TOUCHBIT (native, codex #5178 resume-20261020/moved/packet-zork3.json; the source catalog candidate 0 is wrong): TAKE lamp 198 and waybread 34 set bit 27; stairs 216 stay clear.
        // enterable 7 = source VEHBIT exact (tier: seeded-native, g1-batch default zork3 seed 0; not a fresh unforced run); single carrier in object table (gold machine 91; whole-source exception, Enchanter precedent); native (grok1 g1-batch grok1/enter/zork3/run-zork3-20261025T230255-59496.json, G1PLAYER 202, step 131 Technology Museum): ENTER GOLD MACHINE -> player parent 101->91, test_attr 91:7=1, LOOK "(You are in the gold machine.)", GET OUT -> 101; ENTER GREY MACHINE 90 / BLACK MACHINE 89 read 7=0, "You hit your head", parent unchanged.
        // Proposed concealed 28 = native INVISIBLE; retained Codex packet concealed/packet-zork3.json (5/156 positives; 198 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        // talkable 21 = ACTORBIT (native, claude worker E4 work/investigations/claude-probe/talk/, grok1 g1-batch): SQUEEZE / SHAKE reach V-SQUEEZE/V-SHAKE (gverbs.zil 1332/1258) which test ACTORBIT generically: old man 116, man 27, hooded figure 67 read 21=1; waybread 34 reads 0. Separate walk per actor step (route drift).
        "attributeMap": { "open": 12, "isOpen": 12, "wearable": 4, "container": 10, "supporter": 26, "on": 15, "edible": 5, "door": 9, "scenery": 25, "climbable": 24, "moved": 27, "enterable": 7 , "concealed": 28, "talkable": 21 } // on 15 (codex #4333: lamp 198 +/-15, torch 41 -15 native)
    },
    // Ballyhoo (ZIL): OPENBIT 15: OPEN sets 15 on compartment, tests TRUE on bucket, transistor radio; CLOSE clears (compartment). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
    "8db665f95c6475121dadf5ffcec30b0f340816f9c88fabd63ae0fb4fa9a0d588": {
        // D232 local globals, roots only (work/investigations/r3-claude/localscope5/): In the Wings 81 / Performance Ring 131 grandstand and center pole; ladder refused at 81, path refused at 131. No dark room exists (lit gate positive-only). INVISIBLE 19 exact, ONBIT 24 exact.
        "localScope": { "property": 17, "width": 1, "holder": 50, "roomLitAttribute": 24, "invisible": 19 },
        // Native held radio/headphones TURN ON/OFF; raw ONBIT24 owns radio state only.
        "attributeObjects": { "switchable": [36, 48] },
        // Radio 48 carries CONTBIT 23 + OPENBIT 15 only to hold its hidden dial 18 (way.zil:2815/2950). Native, held
        // (claude + codex blind, agreed #4533): EMPTY refused, OPEN/CLOSE "non-opening models", SEARCH/LOOK IN nothing,
        // no state change. Structural facts stay; no container-derived action is offered for it while held.
        "capabilityForms": { "switchable": ["turn on", "turn off"], "container": [{ "objectId": 48, "scope": "held", "forms": [] }] },
        "activationState": { "onObjects": [48] },
        // Worn state 20: Grok4114/4115 proposal, independently native-qualified by Codex October20; see recovered-wear review.
        "wornAttribute": 20,
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
        // Corroborated 2026-10-16 (grok1 g1-bhput/bhputst/bhputneg): target-dispatched SURFACEBIT 17 TRUE on desk 103 ('put spreadsheet on desk',
        // step 264, 'Done.') and lion stand 96 ('put radio on stand', step 377, 'Done.'); FALSE on telephone 203 ('no good surface').
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: APE, MUNRAB, GUARD, JOEY, CON, THUMB, FAT, DEALER, HAWKER, JENNY, HYP, DICK, JIM, ANDREW (way.zil, outside.zil, bigtop.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // ONBIT24: native radio48 on/off tests and bit transitions; cited whole-source scan finds
        // RADIO the sole mutable non-room owner (single-owner exception). Adjacent source is not
        // asserted exact-build; room/global owners do not imply switchability. See ballyhoo-on/.
        // door 27 = source DOORBIT exact; native (codex door-ballyhoo-native.json + negative): trailer door 44 and cage door 164 toggle 15; pole refuses.
        // scenery 6 = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource 9f779e8 verbs.zil:3084 PRINT-CONTENTS) testing NDESCBIT on that object at pc 46920/46913 during that look, examine works. Positives 22:button, 168:crowd; negative 49:barred passage, 92:turnstile, 208:gorilla suit (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-ballyhoo.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).
        // enterable 30 = source VEHBIT exact 5/5; native (grok1 #5030 grok1/enter/ballyhoo.json): ENTER NET -> parent 3, ENTER SOFA -> 20, ENTER LONG LINE -> 80; ENTER CHANDELIER refused.
        // locked 10 = LOCKEDBIT exact; native (grok1 #5096 grok1/locked/ballyhoo-locked.json): compartment 213 and office door 100 read 10=1 ("The office door is locked."). No room carries 10 (low risk, no negative).
        // talkable 31 = ACTORBIT exact (= animate); native (grok1 #5176 talk2/cache/run-ballyhoo-*): TALK TO Chuckles 113 and guard 207 read 31=1 and answer; sunglasses 32 reads 0 and refuses.
        // transparent 13 = source TRANSBIT exact (7 objects, fp 0 fn 0; historicalsource 9f779e8); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // moved 18 = TOUCHBIT (native, codex batch3-native.cjs output resume-20261020/moved/Ballyhoo.z3.js.json; packet via grok1 #5201): TAKE clown mask 93 and fiberglass pole 129 set bit 18 (clear -> set); center pole 79 stays clear.
        // Proposed concealed 19 = native INVISIBLE; retained Codex packet concealed/packet-ballyhoo.json (24/233 positives; 129 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        "attributeMap": { "open": 15, "isOpen": 15, "animate": 31, "container": 23, "supporter": 17, "wearable": 21, "on": 24, "door": 27, "scenery": 6, "enterable": 30, "locked": 10, "talkable": 31, "transparent": 13, "moved": 18 , "concealed": 19 },
        // Native i (walkthrough step 90) tests bit6 TRUE on pink dot 231 / blue dot 71 inside the open ticket 122 and
        // omits them; tests it FALSE on bucket 65, meat 102, bullwhip 16, ticket 122 and prints them. Source NDESCBIT 6
        // exact (114/114).
        "inventoryHiddenAttribute": 6,
    },
    // Leather Goddesses of Phobos (ZIL): Q8 player root = constant PROTAGONIST object 200 (historicalsource/leathergoddesses 17cbbc1
    // globals.zil 908 OBJECT PROTAGONIST DESC "it" ACTORBIT). No PLAYER global exists; WINNER G189 is mutable (mars.zil sets MITRE/SULTAN/
    // SULTANS-WIFE), so playerGlobal would be wrong after an order. Binary has 19 store G189<-200 = 19 SETG WINNER ,PROTAGONIST in source;
    // object 200 ("it") holds the flashlight at boot. App previously read player 16 with an empty inventory (Codex #3492).
    "103324c3b7332528cc36cc15ce15ae593af5a33ac2b75fae0f04eecc1ffec8f8": {
        // LGOP R3, Claude/Codex/Grok design ACCEPT: Cell only; white SDESC variants remain outside this slice.
        "revealedLocalGlobal": { "object": 83, "holder": 40, "room": 50, "membershipProperty": 15, "nameProperty": 16, "namePackedValue": 59426, "nameValue": "black circle", "gateGlobalSlot": 144, "forms": ["examine"] },
        // D1 source-proven (r44): inventoryHiddenAttribute 8 = NDESCBIT (tp 41 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 8,
        "inventoryHiddenRecurses": true,
        "playerObject": 200,
        // OPENBIT 15 / SURFACEBIT 17 (grok1 2026-10-17, g1-ops3 = zil-inv-hidden-ops replaying 2026-10-15-zil-routes lgop, target-scoped):
        // 'open door' (12) tests wide cell door 202:15 FALSE then 202 carries 15 ("swings open"); 'close door' (13) 202:15 TRUE, 15 cleared
        // ("now closed"); 'open south door' (15) narrow cell door 176:15 FALSE then set; 'open painting' (13) 78:15 FALSE ("You can't open a
        // painting!"). 'stand on stool' (28) 114:17 TRUE ("You are now on the stool."); 'look on second slab' (107) 154:17 TRUE x2, control
        // 'wait' 0 ("You can see nothing on the second slab."); 'put tray on flashlight' (28) 110:17 FALSE beyond control ("There's no good
        // surface on the flashlight."). Source OPENBIT 15 exact 18/18, SURFACEBIT 17 exact 7/7. CONTBIT 24 HELD (rule 4): RAM CONTBIT is
        // on gorillas, stallion, salesman, your body, bed, toilet, divan, barge and stoop, so a container fact would offer Open/Close on them.
        // ACTORBIT 31 (grok1 2026-10-17, g1-scan3 = 2026-10-15-zil-routes lgop replay, test_attr recorded only during the named
        // command; source verbs.zil V-ENTER tests DOORBIT, VEHBIT, then ACTORBIT): 'enter female gorilla' @95 tests 122:31 TRUE x2;
        // 'enter male gorilla' @95 tests 85:31 TRUE; 'enter basket' @30 tests wicker basket 167:31 FALSE; 'enter barge' @127 tests
        // royal barge 116:31 FALSE. Source ACTORBIT 31 exact 10/10. Container 24 stays HELD (verbs.zil:3126 FCLEARs THETA ACTORBIT
        // while she keeps CONTBIT/OPENBIT, so none=[animate] would not cover her).
        // VEHBIT 29 (grok1 2026-10-17, same replay): 'enter barge' @127 tests royal barge 116:29 TRUE x3 ("You are now in the royal
        // barge."); 'enter bed' @209 tests bed 113:29 TRUE x3 ("You are now on the bed."); 'enter basket' @30 tests 167:29 FALSE;
        // 'enter female gorilla' @95 tests 122:29 FALSE x2. RAM 29 = cage, tree hole, both slabs, stallion, bed, stool, barge, divan,
        // toilet (+ one runtime object) = source VEHBIT exact 10/10; each is boardable in source (V-BOARD on VEHBIT).
        // CONTBIT 24 (claude 2026-10-24, r3-claude/container-open/LeatherGoddessesofPhobos.json, ordinary commands): paper PUT ON
        // tray, painting PUT IN wicker basket succeed; painting (no 24) refuses put-in. Source exact 22/22; walk CB 24. Trent, gorillas,
        // salesman carry CONTBIT: excluded by animate 31. Close on the lidless wicker basket is a disclosed harmless extra.
        "openCapability": { "all": ["container"], "none": ["animate"] },
        // door 26 = source DOORBIT exact; native (codex door-lgop-native.json): wide cell door 202 and narrow cell door 176 toggle 15; tray refuses.
        // Switch (grok1 #4840 work/investigations/grok1/switch/lgop.json): flashlight 110: TURN OFF -> "Okay, the flashlight is now off." (30 cleared), TURN ON sets 30. Blender (momentary, never sets ONBIT) and torch (fire) left out. ONBIT 30 on other carriers is room-lit state: never switchable.
        "attributeObjects": { "switchable": [110] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        "activationState": { "onObjects": [110] },
        // wearable 20 = WEARBIT exact; native (grok1 #5090 grok1/open/lgop-wear.json): overalls 134 and white suit 170 read 20=1 (worn 21 toggles separately); stool/flashlight read 0.
        // wornAttribute 21 = worn state (grok1 #5090 grok1/open/lgop-wear.json): WEAR WHITE SUIT sets 21, TAKE OFF clears it; WEARBIT 20 never changes (audit r26).
        "wornAttribute": 21,
        // locked 9 = LOCKEDBIT exact; native (grok1 #5096 grok1/locked/lgop-locked.json): back door 155 and igloo door 59 read 9=1 ("It's locked. Very locked."); unlocked cabin door 71 reads 0. No room carries 9.
        // talkable 31 = ACTORBIT exact (= animate); native (grok1 #5175 talk2/cache/run-lgop-*): TALK TO Joe 117, King Mitre 3, proprietor 123 read 31=1 and answer; flashlight 110 reads 0, "You can't talk to a flashlight!".
        // moved 18 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): stool 114 and scrap of paper 66 (separate takes), plus take-all items; Joe 117 stays clear.
        "attributeMap": { "open": 15, "isOpen": 15, "supporter": 17, "animate": 31, "enterable": 29, "container": 24, "door": 26, "on": 30, "wearable": 20, "locked": 9, "talkable": 31, "moved": 18 }
    },
    // Spellbreaker (ZIL): Q8 player root = constant PLAYER object 52 (historicalsource/spellbreaker 6f83ba4 globals.zil 324 OBJECT PLAYER
    // DESC "it"). No PLAYER global; WINNER G197 is mutable (globals.zil 923/928 BELBOZ, verbs.zil 334/359 PRSO). Native TAKE puts the
    // item in 52 (zil-player-root); app previously read 22 with an empty inventory.
    "2d097ac9e4081b68658d0331345176946253cb349ed66eeff88533826cae29d0": {
        // D232 local globals, roots only (work/investigations/r3-claude/localscope4/): Cliff Middle 29 / Cliff Top 109 cliff and stone hut; Packed Earth refuses cliff; Packed Earth dark until FROTZ. INVISIBLE 12 exact, ONBIT 8 exact.
        "localScope": { "property": 4, "width": 1, "holder": 54, "roomLitAttribute": 8, "invisible": 12 },
        // Native EAT accepts these identities (held or in the room), not a
        // FOODBIT. Both foods are consumed; knife/Drink bread refuse.
        "attributeObjects": { "edible": [43, 123] },
        "playerObject": 52,
        // SURFACEBIT 3 (grok1 2026-10-16, Jericho walk + Frotz seed 1 per c3f1254, target-dispatched occurrence counted beyond
        // a same-step control): 'put spell book on carpet' (step 209) "Done." 95:3 TRUE; 'put burin on idol' (148) "There's
        // no room." 78:3 TRUE; 'put burin on green rock' (286) "Done." 42:3 TRUE; 'put spell book on zipper' (209) "There's no
        // good surface on the zipper." 198:3 FALSE. Source SURFACEBIT 3 exact. OPENBIT 21 / CONTBIT 27 are also proven natively
        // (OPEN sets 21 on zipper/box/bottle, CLOSE clears zipper; LOOK IN tests 27 TRUE box, FALSE knife 170), but HELD (rule 4):
        // RAM CONTBIT+OPENBIT is set on actors (Belboz 13, merchant 203, ogre 232) and CONTBIT on scrolls/piles/spell book, so a
        // container/open fact would offer Open/Close on them. That needs an animate/openability disposition first.
        // PERSON 31 (grok1 2026-10-16, same tool/seed): 'ask belboz about me' (step 335) tests 13:31 TRUE ("Belboz looks at you
        // suspiciously..."); 'ask ogre about me' (71) 232:31 TRUE ("The ogre grunts nastily at you."); 'ask zipper about me' (71)
        // 198:31 FALSE ("You can't talk to the zipper."). Source PERSON 31 exact 21/21. Fixes the #3590 bit-0 animate fallback here.
        // ONBIT 8 = magical glow state (grok1 2026-10-17, g1-scan2 Jericho replay seed 1, test_attr recorded only during the named
        // command): 'turn off burin' @14 (after FROTZ BURIN) tests magic burin 149:8 TRUE ("The magical glow fades, leaving you in the
        // dark."); 'turn off bottle' @119 (after FROTZ BOTTLE) tests bottle 145:8 TRUE ("The magical glow fades."); 'turn off spell book'
        // @14 tests spell book 144:8 FALSE ("How do you do that with a spell book?"). Source historicalsource/spellbreaker@6f83ba4:
        // V-FROTZ FSETs ONBIT on the target, V-LAMP-OFF tests/FCLEARs it; ONBIT 8 source exact 28/28 (lit rooms plus frotzed objects).
        // CONTBIT 27 / OPENBIT 21 RELEASED 2026-10-24 (claude, operator missing-options-first rule): source exact 23/23 and 20/20;
        // native walk (zil-walk-analysis2 pseed1sb): OPEN sets 21 on gold box 4 and cabinet 67, tested-closed on box/cabinet/scroll;
        // LOOK IN / OPEN test 27 TRUE on box, cabinet, bottle 145, zipper 198. The old hold (actors carry CONTBIT+OPENBIT) is now
        // covered by animate 31 in the none list. Disclosed harmless extras (independent audit audit-r7-independent.md): Open on
        // the seven CONTBIT scrolls, and Close on already-open CONTBIT surfaces/fixtures (ice floe 50, carpets 95/139, outcropping
        // 183, piles 15/48, carving 26, octagonal hole 40, grouper nest 113, construction 148, crack 160, mouth 172). Surfaces are
        // NOT excluded: the rodent idol 78 is surface + container + openable and must keep Open/Close.
        "openCapability": { "all": ["container"], "none": ["animate"] },
        // scenery 19 = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource 6f83ba4 verbs.zil:1889 PRINT-CONT) testing NDESCBIT on that object at pc 54920 during that look, examine works. Positives 19:Orkan of Thriff, 21:sorcerer, 30:Gzornenplatz, 59:Hoobly; negative 238:cube (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-spellbrkr.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).
        // transparent 15 = source TRANSBIT exact; single reachable closed carrier (whole-source exception); native (grok1 #5063 transp/spellbrkr.json): closed bottle 145 LOOK IN lists the damp scroll; closed zipper 198 (no bit) "is closed".
        // enterable 29 = source VEHBIT exact; native (grok1 #5067 grok1/enter/spellbreaker.json): ENTER GREEN ROCK -> on rock 42; SIT ON CARPET -> on carpet 95.
        // moved 22 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): rye bread 43 and cube 238; smoked fish 123 stays clear.
        // door 25 = DOORBIT, source exact 6/6 (vault door 2, octagonal hole 40, shop door 188, cell door 207, iron door 223, trap door 244). Seeded-native trace (grok1 #5399, udoor/cache run-spellbrkr-20261026T021900-70584.json; Codex ACCEPT #5402): CLOSE/OPEN shop door 188 and CLOSE octagonal hole 40 test 25 TRUE; CLOSE rezrov 14 tests 25 FALSE. Gold box 4 takes the container branch (no test).
        // Proposed concealed 12 = native INVISIBLE; retained Codex packet concealed/packet-spellbreaker.json (70/186 positives; 149 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        // locked 11 = LOCKED (native, claude worker E3 claude-probe/locked/run-spellbrkr-*): massive cabinet 107 @199 and massive cabinet 67 @372 (Dungeon Cell) read 11=1 "The cabinet is locked."; both read 0 after unlocking (same V-OPEN read site). Neither is a room.
        "attributeMap": { "supporter": 3, "animate": 31, "talkable": 31, "on": 8, "container": 27, "open": 21, "isOpen": 21, "scenery": 19, "transparent": 15, "enterable": 29, "moved": 22, "door": 25 , "concealed": 12, "locked": 11 },
        // D16 P16 ext (grok2 ACCEPT): inventoryHiddenAttribute 19 = NDESCBIT (exact 55/0/0). spellbreaker-invhidden-claude-SEALED.md: PRINT-CONT BRIEFBIT
        // exception (verbs.zil:1888) never reaches held objects (TAKE clears NDESC, verbs.zil:1734); book 144 open, 7 spells; parser.zil:1562 no NDESC test.
        "inventoryHiddenAttribute": 19,
        "inventoryHiddenRecurses": true,
        "inventoryHiddenScopeRetained": true,
    },
    "431678a618ba3e1b5506adb9b4b3da9221ad0bbb0426166d5fcc0b37403b5899": {
        // lightForms (work/investigations/grok2/lightForms-DRAFT.md sha 76e755d4; four-seat ACCEPT (codex-votes-0231, grok-review-lightforms-draft); native lightsource-native/): battered lantern 94 is lit only by FROTZ (not an ordinary on form); TURN OFF clears ONBIT 8 + LIGHTBIT 22, after which TURN ON is refused. Off-only.
        "lightForms": { "capabilityBit": null, "stateBit": 22, "objects": [94], "on": null, "off": { "94": "turn off" } },
        // D232 local globals, roots only (r3-claude/localscope2 + grok2 registry-ready): property 17, holder 58. Native: Outside of
        // Shack 227 EXAMINE SHACK, Long Road 45 EXAMINE FOREST, Fork EXAMINE HILLS succeed; Fork refuses shack and forest, Long Road
        // refuses shack. Lit ONBIT 8 (grok2 lit/dark pair: Fork on, Tower off). INVISIBLE 16 exact 7 of 7. No contents key.
        "localScope": { "property": 17, "width": 1, "holder": 58, "roomLitAttribute": 8, "invisible": 16 },
        // light 22 / on 8 (codex #4349: FROTZ sets both on the battered lantern, candle carries both; bread/jug negatives).
        // door 24 = source DOORBIT exact; native (r3-claude/doorbit): cell door 202 toggles; iron gate 232 door-specific refusal.
        // enterable 29 = source VEHBIT exact; single carrier in object table (whole-source exception); native (grok1 #5066 grok1/enter/enchanter.json): ENTER FOURPOSTER BED -> in bed 133; bedpost refuses.
        // climbable 26 = CLIMBBIT exact; single census carrier stairs 168 with bit read 26=1 (grok1 #5081 grok1/climb/enchanter.json); at step 28 climb walks UP generically, so the move is not object-specific; CLIMB LANTERN "Bizarre!"
        // moved 15 = TOUCHBIT (native, codex #5183 resume-20261020/moved/packet-enchanter.json): TAKE bread 41 and jug 19 set bit 15 (clear -> set); object 7 stays clear.
        // transparent 10 = source TRANSBIT exact (16 objects, fp 0 fn 0; historicalsource 472c3b9); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // concealed 16 = INVISIBLE exact (native, codex #5240 resume-20261020/concealed/packet-enchanter.json): Flathead portrait 179 and Frobozz portrait 167 read 16=1 and cannot be seen; EXAMINE PORTRAITS 106 (16 clear, visible) identifies both and clears 16; named EXAMINE then succeeds.
        // locked 1 = LOCKEDBIT (grok1 probe5 run-enj, claude worker E3): north gate 194 @44 OPEN GATE reads 1=1 "The gate is rusted shut.", @46 reads 0 after REZROV. Single-owner exception from source: NORTH-GATE-OBJ-F (castle.zil:1085) is the only player-facing LOCKEDBIT test; IRON-GATE-F prints fixed text; V-OPEN/LOCK/UNLOCK never test it. No room carriers.
        "attributeMap": { "container": 21, "supporter": 14, "open": 12, "isOpen": 12, "light": 22, "on": 8, "door": 24, "enterable": 29, "climbable": 26, "moved": 15, "transparent": 10, "concealed": 16, "locked": 1 },
        // D1 source-proven (r44): inventoryHiddenAttribute 7 = NDESCBIT; PRINT-CONT withholds the NDESC spell labels but recurses.
        // D16 P16 (claude R1+R2, codex ACCEPT #5641): scope retained. gparser.zil:1272 SEARCH-LIST descends any OPENBIT|TRANSBIT
        // child with no NDESCBIT test (THIS-IT? rejects only INVISIBLE); spells are IN SPELL-BOOK with NDESCBIT and the book is
        // OPENBIT; magic.zil:410 READ lists them. Native `i` shows the book only; the spells stay in scope (D148 cast route).
        "inventoryHiddenAttribute": 7,
        "inventoryHiddenRecurses": true,
        "inventoryHiddenScopeRetained": true,
        "openCapability": { "all": ["container"], "none": ["supporter"] },
    },
    "91f78d4bbb6bcea5b3a6047e1efbb0ae1efa1c2382d360e679285526125babb3": {
        // lightForms (work/investigations/grok2/lightForms-DRAFT.md sha 76e755d4; four-seat ACCEPT (codex-votes-0231, grok-review-lightforms-draft); native lightsource-native/): match 46 + bronze torch 198 LIGHT tests BURNBIT 11 and sets ONBIT 21; EXTINGUISH TORCH / BLOW OUT MATCH clear it.
        // capabilityBit is informational only (BURNBIT also marks flammable non-lights; shovel 33/pickaxe 37 refuse). Other match objects: declared under-offer.
        "lightForms": { "capabilityBit": 11, "stateBit": 21, "objects": [46, 198], "on": { "default": "light" }, "off": { "198": "extinguish", "46": "blow out" } },
        // D1 source-proven (r44): inventoryHiddenAttribute 18 = NDESCBIT (tp 87 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 18,
        "inventoryHiddenRecurses": true,
        // Native crate/trunk OPEN/CLOSE use supporter as closed-lid state; raw OPEN remains set.
        "containerStateRules": [{ "objectId": 23, "closedFlag": "supporter" }, { "objectId": 39, "closedFlag": "supporter" }],
        // D232 local globals, roots only (work/investigations/r3-claude/localscope3/): Your Tent 71 flap, River Bank 82 water; reciprocal refusals, Fire Pit refuses flap. No dark witness (positive-only lit).
        "localScope": { "property": 17, "width": 1, "holder": 248, "roomLitAttribute": 21, "invisible": 30 },
        // FOODBIT7: sole bounded owner beef34, native EAT succeeds/removes;
        // shovel33 false/refuses; DRINK beef refuses (not a consumed bit).
        // enterable 14 = source VEHBIT exact; native (r3-claude/vehbit + vehbit2): army cot 51 and barge 211 (GET IN/ENTER move the player inside; GET OUT returns; bare EXIT refused). Harmless extras: beam 104 refuses entry, mast hole 108 untested.
        // climbable 16 = CLIMBBIT exact; native bare (grok1 #5082): CLIMB ROPE 32 contextual ("while you are holding the rope"), bit read 1; knapsack (bit 0) "You can't climb that!". Fatal climbs offered per operator ruling 2026-10-24.
        // door 9 = source DOORBIT exact (7 owners); native (codex #5132 resume/door-infidel-qualified.json, digest 91f78d4b): annex door 185 OPEN sets open 25 (fresh 208-command prefix), inner door 162 toggles (grok2 packet); pickaxe 37 (bit 9 false) refused.
        // moved 29 = TOUCHBIT (native, codex #5183 resume-20261020/moved/packet-infidel.json): TAKE pickaxe 37 and shovel 33 set bit 29; object 38 stays clear.
        // concealed 30 = INVISIBLE exact (native, codex #5241 resume-20261020/concealed/packet-infidel.json): broken lock 40 (Tent) and opening 52 read 30=1 and cannot be seen; SMASH PADLOCK WITH PICKAXE / DIG clears 30 and EXAMINE succeeds; held pickaxe 37 visible with 30 clear.
        "attributeMap": { "container": 20, "supporter": 28, "open": 25, "isOpen": 25, "edible": 7, "enterable": 14, "climbable": 16, "door": 9, "moved": 29, "concealed": 30 },
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // WEARBIT state22: native knapsack31/ring2 worn positives, shovel33 refusal; Grok4127 proposal independently replayed by Codex October20.
        "wornAttribute": 22,
        // Identity Wear R3 (four-seat ACCEPTED, PROPOSAL-identity-wear-r3 sha 4a1e90a7): bare WEAR native-proven for these direct-held owners.
        // Infidel ring 2 (radial-infidel-ring-held-unworn.json). Knapsack 31 NA for held-direct (take auto-wears, doff drops it; PROPOSAL-wear-subdomains-r1).
        "wearForms": { "objects": [2], "verb": "wear", "scope": "held-direct" }
    },
    // Sorcerer (ZIL): stable PLAYER global 38 (Codex #3412/#3413, verified grok2 #3425): misc.zil WINNER=PROTAGONIST, PLAYER=WINNER;
    // binary 23591 store G38<-G163 at start, TELL stores only G163 (42801). Native TAKE book inserts into body 223 = G38. Ships with the v3 nested-room fix.
    "3bf24a3d2df3a0828ac1c3d2846580d92759bd20d408151632c760f4a92ec04e": {
        // Accepted seeded-native FROTZ box/book on11 state; local Gear emission, never switchability or room light.
        "illuminationState": { "flag": "on", "scope": "inventory" },
        // D232 local globals, roots only (work/investigations/r3-claude/localscope3/): Hallway 67 heavy wooden door, Lobby 18 road; reciprocal refusals; Your Quarters 17 dark ("too dark to see"). Stairs 177 listed but parented 31: skipped by the holder check.
        "localScope": { "property": 17, "width": 1, "holder": 55, "roomLitAttribute": 11, "invisible": 19 },
        // OPENBIT 15: OPEN sets 15 on desk drawer, journal, receptacle, ochre vial; CLOSE clears (drawer, receptacle). zil-walk.js native walkthrough run (Jericho walkthrough, no relocation/forcing; zil-walk-analysis.json).
        // 2026-10-15 original scene, target-scoped, source-exact: CONTBIT 27 TRUE on desk drawer, tiny box, ochre vial, sturdy
        // trunk, receptacle (2026-10-11-zil-walk-pzsorcerer.json); SURFACEBIT 17 TRUE on bed ('look on bed') and darkwood desk
        // ('put key on desk'), FALSE on tapestry ("no good surface") (pzsorcerer3). The spell book has 27+15, so its spells stay
        // listed (D148 intent). With openCapability.
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: HAWKER (park.zil), OLDER-SELF (coal.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // ACTORBIT 31 original scene, target-scoped (SOLO/SELF-AUDIT 2026-10-16, 2026-10-16-zil-inv-hidden-ops.json):
        // 'GNOME, HELLO' tests 31 TRUE on gnome 245, 'TWIN, HELLO' TRUE on your older self 26, 'BOOK, HELLO' FALSE on spell
        // book 139 ("You can't talk to a spell book!"). Source exact 9/9.
        // Grok4119 independently audited: FROTZ box102/book139 test11 true; desk144 false. Illumination state, not switchability.
        // door 24 = source DOORBIT exact; native (r3-claude/doorbit): heavy door 164 and heavy wooden door 251 toggle; toll gate 56 opened by the gnome.
        // talkable 31 = the proven animate bit (grok1 2026-10-24, item 4 talkable batch; same mapping as Spellbreaker/Stationfall): talk-command scoped,
        // native, test_attr recorded only during the named command (grok1/talk/talk-probe.json, no relocation): 'GNOME, HELLO' @79 tests gnome 245:31 TRUE ("Sleeping gnomes make poor listeners."), 'TWIN, HELLO' @208 tests your older self 26:31 TRUE (actor reply); 'BOOK, HELLO' @3 tests spell book 139:31 FALSE ("You can't talk to a spell book!") (2026-10-16-zil-inv-hidden-ops.json).
        // Source V-TELL / parser addressing tests this bit and refuses non-actors with "You can't talk to ...".
        // enterable 29 = source VEHBIT exact; native (grok1 #5064 grok1/enter/sorcerer.json): ENTER BED -> in bed 128, ENTER LOG BOAT -> in boat 199; spell book and flume refuse.
        // climbable 8 = CLIMBBIT exact; single carrier stairs 177 (whole-source); native bare CLIMB STAIRS -> Lobby; CLIMB SPELL BOOK "Bizarre."
        "attributeObjects": { "switchable": [192] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        // switchable (grok1 #5171 switch2/cache sosw*): brass lantern 192 TURN ON sets ONBIT 11, TURN OFF clears it; crate 145 "You can't turn that on." Single holdable LIGHTBIT owner on the walk.
        "activationState": { "onObjects": [192] },
        // transparent 5 = source TRANSBIT exact (9 objects, fp 0 fn 0; historicalsource 6417e1e); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // moved 18 = TOUCHBIT (native, codex batch3-native.cjs output resume-20261020/moved/Sorcerer.z3.js.json; packet via grok1 #5201): GET BOX AND JOURNAL: tiny box 102 and journal 225 each set bit 18; blighted forest 1 stays clear.
        // concealed 19 = INVISIBLE (native, codex #5261 resume-20261020/concealed/packet-sorcerer.json, accepted grok1 #5270): pile of identical scrolls 91 unseen until LOOK IN CANNON (fort.zil 308/336 YIPPLES FCLEAR); flume START-RIDE FSETs 19 on non-protagonist contents of LOC, END-RIDE clears (tiny box 102 / calendar 61); spell book 139 negative.
        "attributeMap": { "open": 15, "isOpen": 15, "container": 27, "supporter": 17, "animate": 31, "talkable": 31, "wearable": 21, "on": 11, "door": 24, "enterable": 29, "climbable": 8, "transparent": 5, "moved": 18, "concealed": 19 },
        // D16 P16 ext (grok2 ACCEPT p16-ext-review.md): inventoryHiddenAttribute 9 = NDESCBIT. Native D16-sorcerer-trace.md: book 139 CONTBIT+OPENBIT,
        // exactly 7 NDESC spells; READ BOOK lists them (globals.zil:937-949); gparser.zil:1318 SEARCH-LIST no NDESC test. Native i omits spells; scope kept.
        "inventoryHiddenAttribute": 9,
        "inventoryHiddenRecurses": true,
        "inventoryHiddenScopeRetained": true,
        // Native amulet/suit inventory marks direct-held WEARBIT gear worn;
        // amulet dropped or nested in the carried box is not worn (no state bit).
        "equipmentState": { "wornWhen": "wearable-direct-player" },
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
        // Exact REMOVE reference: bare mask is ambiguous to the native parser; western mask removes owner38.
        "removalReferences": { "objects": [38], "verb": "remove", "scope": "worn-direct", "nouns": { "38": "western mask" } },
        // CONTBIT 16 / OPENBIT 13 / PERSON 31 (claude 2026-10-24, r3-claude/container-open/Suspect.json, ordinary commands): PUT receipt
        // IN fireplace, pen IN trash basket succeed with parent change; gunbelt and fireplace CLOSE/OPEN toggle 13; notebook (no 16)
        // refuses open/put-in. Source exact 33/33, 36/36, PERSON carriers are the characters. Actors carrying CONTBIT (Alicia,
        // Veronica's body) are excluded from Open/Close by animate. Supporter 15 not mapped (no native evidence yet).
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // SURFACEBIT 15 (claude 2026-10-24, r3-claude/animate-supporter/Suspect.json): PUT notebook ON table / ON mantel -> "Okay."
        // (parent changes); pen-on-notebook refused. Source exact 11 of 11. 10 surfaces also carry CONTBIT 16, so supporter joins
        // the Open/Close none list (tables, desks, mantel, workbench are not openable).
        // door 27 = source DOORBIT exact; native (codex door-suspect-native.json): east/west entry hall doors 241/240 toggle 13; ribbon refuses.
        // enterable 28 = source VEHBIT exact 9/9 (tier: seeded-native, g1-batch default seed, G1PLAYER 99, step 12 Library; grok1 D1b-R on R4 HEAD 70d77b4, grok1/d1bR/cache/run-suspect-20261026T094051-60304.json): ENTER CHAIR 153:28 TRUE, player 99 -> 153; GET OUT OF CHAIR 153:28 TRUE -> 156; SIT ON WINDOW SEAT 233:28 TRUE -> 233, GET UP -> 237; ENTER BOOKCASE 155:28 FALSE "You hit your head", parent unchanged. App: chair offers enter outside, "get out of" inside (d1bR/app-eval.txt).
        // transparent 7 = source TRANSBIT exact (10 objects, fp 0 fn 0; historicalsource a18e100); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // wornAttribute 5 = WEARBIT as worn state (grok1 #5218 run-suspect-*): TAKE OFF western mask 38 and EXAMINE gunbelt 96 read 5=1; no generic WEARBIT reader exists, so 2 carriers + exact census stand in for the negative.
        "wornAttribute": 5,
        // talkable 31 (seeded-native tier; grok1 packet K probe5/talk/suspect): ASK ostmann/johnson ABOUT X test 31 TRUE; bar/notebook FALSE; PRE-ASK-ABOUT verbs.zil:657-659.
        // moved 1 = TOUCHBIT (seeded-native tier, Codex #5335; grok1 packet P1 probe5/moved/suspect): TAKE pen 95 / costume receipt 12 set 1 (ITAKE verbs.zil:436-438); negative bar 119 stays clear (mask EXAMINE was ambiguous, excluded). Trace = g1-batch before/after attr-byte diff (test_attr only; no FSET op in opsOnId).
        // Proposed concealed 10 = native INVISIBLE; retained Codex packet concealed/packet-suspect.json (88/83 positives; 89 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        // locked 17 = LOCKED (source exact 18/18; native 2+1 + codex review-20261027/suspect-native-r3-diagnostic-r3: unforced START-ALICIA north door 212 locked+open and NORTH still reaches Walkway 169). With P10 (8b76ec8) route pause needs locked AND closed, so open-locked doors stay passable; raw lock glyph unchanged.
        // r51 Suspect 5U (two-active-seat ACCEPT: grok PACKET-suspect-5U-final-1332.md author, claude CLAUDE-VOTES-suspect-5U-1350.md; codex audits on return):
        // edible 25 = FOODBIT (1/1, FOOD 143 local global; native eat food flavour; notInPayload so correct but invisible); on 11 = ONBIT (TV 190 native "The TV is on"),
        // removes PROFILE leak (OPENBIT 13 read as on); switchable null = no switch flag in source (notebook PROFILE 21 leak; native turn on notebook refuses).
        "attributeMap": { "container": 16, "open": 13, "isOpen": 13, "animate": 31, "supporter": 15, "door": 27, "enterable": 28, "transparent": 7, "talkable": 31, "moved": 1 , "concealed": 10, "locked": 17, "edible": 25, "on": 11, "switchable": null },
        // wearForms (D259, W3): PRE-WEAR whitelist GUNBELT 96 / YOUR-COAT 93 / MASK 38 (verbs.zil:2642-2648); native wear/remove on 96 and 93, mask MASK-F; ALICIA-COAT 74 / FAIRY-MASK 84 excluded ("It doesn't fit").
        "wearForms": { "objects": [96, 93, 38], "verb": "wear", "scope": "held-direct" },
        "inventoryHiddenAttribute": 19,
        "inventoryHiddenPreservesWorn": true,
        // inventoryInvisibleAttribute 10 = source INVISIBLE exact 7/7 (historicalsource a18e100): native i omits an INVISIBLE child and its subtree, worn items included (Codex R2 #5300, native resume-20261020/concealed/suspect-equipment-*-native.json, R4+R2 Equipment PASS #5357). Tested on the root's children only, never the root: reporter 99 itself carries 10.
        "inventoryInvisibleAttribute": 10,
        // playerObject 99 = source PLAYER "reporter" (people.zil sha256 96A22C9C, a18e100; no SETG PLAYER anywhere, SETG WINNER swaps for NPC orders are restored); ME 98 "yourself" is the GLOBAL-OBJECTS parser stand-in (negative: parent 246, no children). Native (Codex #5366/#5374 review-20261025/packet-suspect-player99.json, raw0128): 99.parent follows statusG0 118/120/121/207 over LOOK/W/W/W; TAKE pen 95 and receipt 12 land under 99. Player may sit in a vehicle (chair 153, window seat 233), so the room stays statusG0, not parent(99).
        "playerObject": 99
    },
    // Native i tests bit17 and skips arm111 (including gash110) and badge184;
    // the held Logbook195 has this bit clear and is printed.
    "502e5c8e4cb82726ab61683f4d92afbb31f90fcb98b9b3dc3dbd4f97841c5582": {
        // D232 local globals, roots only (work/investigations/r3-claude/localscope4/): lab center 65 / north part 92 / east part 89 alarm bell; intercom and lab door refused at 65 and 92. INVISIBLE 12 exact, ONBIT 19 exact.
        "localScope": { "property": 17, "width": 1, "holder": 244, "roomLitAttribute": 19, "invisible": 12 },
        // RE-ADDED from PROBE walk p2: SURFACEBIT 6 TRUE on mechanical/electronic/chemical supply shelves; FALSE on Snark, gangplank, supply bunches. Source exact (9 objects). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // 2026-10-15 original scene, target-scoped, source-exact (16/16 each): OPENBIT 18 - OPEN sets it on access panel 250 and
        // test tank gate 21, finds it set on lab door 88; CLOSE clears it on hatch, reactor, circuit breaker
        // (2026-10-11-zil-walk-pzseastalker3.json). CONTBIT 26 - 'look in' TRUE on mechanical supply shelf, reactor; FALSE on
        // Snark, gangplank, supply bunches, scanner, Computestor (pzseastalker). With openCapability.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // ONBIT 19 = on (claude a7c17d3 work/investigations/2026-10-17-zil-on-walk-evidence.json + grok1 g1-ssO, 2026-10-17; test_attr recorded
        // only during the named command): TURN ON sets 19 on microphone 62, Computestor 91, videophone 141 and reactor 227 (each tests FALSE
        // before / TRUE after); cold 'turn on logbook' tests logbook 195:19 FALSE ("You can't turn on the Logbook now."). Source ONBIT exact;
        // bounded scan: 38 carriers, mostly lit rooms; attrs.on is read only by ZRamReader 2718 (inventory item-likeness), not room admission.
        // PERSON 30 = animate (grok1 2026-10-17, g1-ssA.json via g1-scan9.cjs, one walk with each command recorded separately; test_attr recorded only
        // during the named command, cited by its targeted block after the common parser prefix): @0 'analyze tip' tests Tip 192:30 TRUE ("How?",
        // V-ANALYZE verbs.zil:823); @7 'analyze bly' tests Commander Bly 106:30 TRUE; 'analyze microphone' tests 62:30 FALSE ("the microphone is off"),
        // 'analyze videophone' tests 141:30 FALSE ("It looks normal."). Source PERSON on the people.zil FLAGS (the matcher pinned only 2 because most
        // persons are compiled twice); bounded compiled table (255 objects, ends at first property 3041): 20 carriers, all persons + yourself 194; none
        // are rooms. FAIL-CLOSED (defensive, container 26 mapped): animate joins the openCapability none list (P3/R pattern).
        // door 27 = source DOORBIT exact; native (grok2 r4-grok2/doorbit/Seastalker.z3.js.json): lab door 88 and entry hatch 251 strict OPEN/CLOSE toggles on OPENBIT 18; Universal Tool refuses (reply says now: weak, conditional wording).
        // moved 4 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): microphone 62 and catalyst capsule 190; technician 61 stays clear.
        // talkable 30 (seeded-native tier; grok1 packet J): ASK Bly/Tip ABOUT X TRUE; microphone/diagram FALSE; V-ASK-ABOUT 936 -> WONT-HELP-TO-TALK-TO 718-719.
        // locked 15 = LOCKED (native, claude worker E3 claude-probe/locked/run-seastalker-*, route fixed: dive to 15 m under the freighter): Horvak's locker 155 reads 15=1 on OPEN/UNLOCK/OPEN WITH TOOL ("It's locked."), 0 after unlocking; entry hatch 251 reads 0. Single tested carrier: the source windows 178/243 handle OPEN/LOCK in their own routines and never test LOCKED (single-owner exception). Not a room.
        // concealed 12 = INVISIBLE (source exact 2/2; native claude-probe/e1d9): special tool 116 in the office reads 12=1 and "You can't see any odd metallic object here!" until SEARCH OFFICE or leaving reveals it (12: 1->0, dome.zil:1250-1257); freighter 237 is the second carrier; negative sonarphone 229 12=0.
        "attributeMap": { "supporter": 6, "open": 18, "isOpen": 18, "container": 26, "on": 19, "animate": 30, "door": 27, "moved": 4, "talkable": 30, "locked": 15, "concealed": 12 },
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
    // Edifice (Q1, grok QA #6269; claude sealed + grok2 blind agree, grok2 ACCEPT #6289): the story swaps the PC body
    // 27 "(PrimitivePlayer)" -> 57 "(HungryPlayer)" and moves the Useful Rock with it; the resolver kept the parentless
    // "(self object)" 20, so Equipment emptied while native INVENTORY listed the rock. g18 holds the live body at boot (27),
    // after take (27) and after the swap (57), always the rock's holder; g53 is 0 at boot so it is not the fact. g21 turns
    // into a room and g40 keeps the stale 27, so only slot 18. Same family shape as Degeneracy below (D216/D273).
    "2803fbef240e62dc6fb259109406c1a228aa41bd2c83ecc8a3f34575463d863f": {
        "playerGlobal": 18
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
    // mapzero (grok solo, grok-review): Cabal. I6 pair g18=g53=221 "you" on the seat in 32 McDonald's; the app chose
    // self object 20 (inventory showed the vagrant's beard/clothes). Native i "You are carrying: your PalmPilot" =
    // 221's children; with g18 the app matches and admits room 32 (measure4.cjs s6/s7/s8).
    "5fe1406def45c0df5edb65362ec9fa2b840f3f30ab34169d92750b654ef5b114": {
        "playerGlobal": 18
    },
    // mapzero (grok solo, grok-review): Blue Chairs. Player global pair g22=g63=100 "Dante" (k+41 here, not k+35) in 419 Stuck in an Attic; the app
    // chose self object 20 and the map stayed empty. With g22 room 419 is admitted at boot (measure4.cjs s6/s7/s8).
    "7b50dacf8d8b15e2a6429d2173a7c6d07630f4394587ddf1ddee11508503c25b": {
        "playerGlobal": 22,
        // inv-extra (grok solo, REVIEW-REQUEST-004): declared attribute 3 = concealed (inform-attribute-names). Native i "You are carrying
        // your wallet, your keys and a pager." omits worn shirt 105 (bits 2,3,12,26: concealed) and lists wallet 101/keys 103/pager 104 (bit 3 clear).
        // The game's own i routine sets bit 3 on the worn shirt (sticky; clear before the first i, so the shirt still shows until then).
        // Shirt stays in the parser (x shirt replies). review-lane-1101/inv-extra/p1,p2,p3-bluechairs*.json.
        "inventoryHiddenAttribute": 3
    },
    // mapzero (grok solo, grok-review): Tokyo2. I6 pair g19=g54=81 "our hero" in 29 A Streetside Cafe; the app chose
    // self object 20 and the map stayed empty. With g19 room 29 is admitted (measure4.cjs s6/s7/s8).
    "c805f56df1dd88dde0f869c07cd39136702026bf17589dc5071f656be5d87647": {
        "playerGlobal": 19,
        // inv-extra (grok solo, REVIEW-REQUEST-004): declared attribute 17 = scenery (inform-attribute-names). Held soup 33 (bits 6,12,17) is the
        // NPC's bowl ("takes a sip from a bowl of steaming soup"); native i omits it. Popcorn 82 (bit 17 clear) stays: it is really held
        // (x popcorn / drop popcorn reply), the game's own i text omits it by custom prose. review-lane-1101/inv-extra/p1,p2-Tokyo2.json.
        "inventoryHiddenAttribute": 17
    },
    // mapzero (grok solo, grok-review): The Gostak. I6 pair g18=g53=123 "gostak" (the PC) tracks 80 Delcot <-> 98
    // (GomwaySE) on KILOFF/JIRF; the app chose parentless self 20 and the map stayed empty. With g18 the map admits
    // Delcot, then Gomway, and follows travel both ways (measure4.cjs s10-pg-gostak.json).
    "fa704c43a7df79bceb3ecbddfa99b864758c6c714d09642eeb3220eb3131a5c5": {
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
        // PERSON 47 = animate (grok1 2026-10-17, g1-scan8.cjs chapter 3 (BZCH=3), test_attr recorded only during the named command):
        // 's' -> Apartment Building: 'search guard' tests guard 228:47 TRUE; 's','e' -> Ostnitz Square: 'search mayor' tests mayor 253:47 TRUE,
        // 'search huttinger' tests Huttinger 24:47 TRUE (all "That wouldn't be polite.", V-SEARCH verbs.zil:1049); 'search building' tests
        // building 127:47 FALSE ("You find nothing unusual."). Source PERSON: 12 carriers, exact (2026-10-11-zil-source-flags.json); bounded compiled
        // table (351 objects, ends at first property 6214): 17 carriers = 12 persons + yourself 30, GloObj 79, protagonist "it" 305 and 2 more; none
        // are rooms. FAIL-CLOSED: TOPAZ carries CONTBIT + SURFACEBIT + PERSON (bad.zil:3249), so animate joins the openCapability none list.
        // Grok4128: native WEAR chronograph81 and parka244 test41 true; oil can4 false/refused.
        // door 45 = source DOORBIT exact; native (codex door-border-qualified.json): compartment 290 and lavatory 328 OPEN/CLOSE reverse OPENBIT 34; front-facing seat refuses ("Don't even consider it").
        // transparent 32 = source TRANSBIT exact (5 objects, fp 0 fn 0; historicalsource 5c80126); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // moved 37 = TOUCHBIT (native, grok1 #5210 grok1/moved/packet-*.json, clear -> set on TAKE): white down parka 244 and knapsack 306 (separate takes); oil can 4 stays clear.
        // scenery 29 = NDESCBIT; census 72 carriers, 0 takeable, none a room (grok1 #5217/#5227 grok1/probe5/run-bzs-*, G1PLAYER=30): LOOK in Your Compartment reads 29=1 on luggage rack 38, rear seat 218 and front seat 250 (not listed); camera bag 337 reads 0 (listed).
        // talkable 47 (seeded-native tier; grok1 packet G probe5/talk/borderzone): ASK dignitary/mayor ABOUT ME 47 TRUE, revolver/building FALSE, same pc; V-ASK-ABOUT verbs.zil:289-296.
        "attributeMap": { "container": 43, "supporter": 36, "open": 34, "isOpen": 34, "animate": 47, "wearable": 41, "door": 45, "transparent": 32, "moved": 37, "scenery": 29, "talkable": 47 },
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // Identity food, no FOODBIT (codex border-food-evidence.json, design border-food-consumer-compared-proposal.md): chapter 3
        // held soda 200 and pretzel 205 each succeed on native EAT and DRINK (source FOOD-F handler); held cigarette 101 refuses
        // both. The authored pair is the only Drink licence; it is inventory-only because the native proof was held.
        "attributeObjects": { "edible": [200, 205] },
        "capabilityForms": { "edible": [
            { "objectId": 200, "scope": "held", "actions": [{ "verb": "eat" }, { "verb": "drink" }] },
            { "objectId": 205, "scope": "held", "actions": [{ "verb": "eat" }, { "verb": "drink" }] }
        ] }
    },
    // Stationfall (ZIL): untouched native routes (Codex #3393-#3400). DROP chronometer inserts it into room 198,
    // TAKE into holder 218; global 183 is the only global equal to that holder, still so after STARBOARD moves
    // holder 218 to room 54 (second DROP/TAKE 54/218). ZRamReader.resolvePlayer re-reads and link-validates it.
    // Native REMOVE uniform/chronometer clears bit 21, WEAR sets it; native i labels both as being worn.
    "3c5656897dd2503610945e80a0b42fc5d25614d967a010ace8e9cafd12f978a3": {
        // D1 source-proven (r44): inventoryHiddenAttribute 10 = NDESCBIT (tp 25 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 10,
        "inventoryHiddenRecurses": true,
        // Codex #3491 (original-scene native, source pin historicalsource/stationfall 5d05d5e verbs 2473 WEARBIT/WORNBIT, 1962 TELL ACTORBIT): WEAR tests 20 TRUE on uniform 229 and chronometer 1, FALSE on form 98 (refused); TELL tests 31 TRUE on Helen 135 and Floyd 26 with actor replies, FALSE on form 98. No container 17 (ID card OPEN/CLOSE impossible). grok2 gated. Evidence is Codex original scripted routes (2026-10-11-codex-zil-flags-proof.json), not a Jericho walkthrough.
        // LIGHTBIT 24 = light (claude fc516e7/de32205 evidence; walk data checked by grok1 2026-10-17 in 2026-10-11-zil-walk-pwstationfall.json, test_attr
        // recorded per command): 'turn reader off' (step 100) tests log reader 29:24 TRUE ("the log reader is now off"); 'turn lamp on' (steps 267, 333)
        // tests headlamp 141:24 TRUE ("the headlamp is now on"). Negatives: 'turn on uniform' 229:24 FALSE ("You can't turn that on."; reproduced cold
        // by grok1, g1-sfL4.json), chronometer 1:24 and card 81:24 FALSE (claude). Source LIGHTBIT carriers = 10 (2026-10-11-zil-source-flags.json, exact);
        // bounded compiled table (255 objects, ends at first property 3055): bit-24 carriers = 29, 46, 57 "it", 63, 65, 69, 141, 145, 205, 212, 233; none are
        // rooms or blank-named. Consumers (#3904): ZRamReader 1679 applies only to blank-named objects, 1749 is Inform-only, 2718 is inventory item-likeness.
        // CONTBIT 25 / OPENBIT 15 (claude 2026-10-24, r3-claude/container-open/Stationfall.json, ordinary commands): completion form
        // PUT IN pilot seat; survival kit and Thermos OPEN/CLOSE toggle 15 and list contents; spacetruck hatch opens; chronometer (no
        // 25) refuses. Source exact 31/31, 16/16; walk CB 25 / OB 15. Floyd and Plato carry CONTBIT: excluded by animate 31.
        "openCapability": { "all": ["container"], "none": ["animate"] },
        // Switch (grok1 #4848 grok1/switch/stationfall.json): headlamp 141: TURN ON -> "Okay, the headlamp is now on.", TURN OFF clears; kit refuses. ACTIVEBIT/ONBIT shared with Floyd, flame, rooms: no on mapping. Jammer 233 added below (sfv258).
        // Jammer 233 (grok1 grok1/switch/stationfall.json sfv258, route sf-route2.json, grok2 ACCEPT #4896): take; TURN ON JAMMER sets 26 "Okay, the jammer is now on.";
        // TURN OFF clears 26; off again "It isn't on!"; on again sets 26. No ONBIT 30 (not a light). Native walkthrough replay, no relocation.
        "attributeObjects": { "switchable": [141, 233] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        // scenery 10 = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource 5d05d5e verbs.zil:2893 DESCRIBABLE?) testing NDESCBIT on that object at pc 52787 during that look, examine works. Positives 46:SB radio, 50:pilot seat, 90:copilot seat; negative 26:Floyd (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-stationfall.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).
        // door 27 = source DOORBIT exact; native (codex door-stationfall-qualified.json): spacetruck hatch 176 and warehouse inner door 79 OPEN/CLOSE toggle OPENBIT 15; sign refuses. Automatic door 21 and the iris refuse manual OPEN (harmless extras).
        // enterable 29 = source VEHBIT exact; native (grok1 #5001 grok1/enter/stationfall.json): carriers 50 and 90 ENTER moves the player inside, non-carrier refuses.
        // supporter 17 = source SURFACEBIT exact, 2 carriers in source (pedestal, counter); native (grok2 #5008 nq/supporter-Stationfall.json): PUT CHRONOMETER ON PEDESTAL works, ID card refuses; whole-source exception.
        // transparent 13 = source TRANSBIT exact; single closed carrier in source (whole-source exception, claude #5044); native (grok1 transp/stationfall.json): closed cage 9 LOOK IN shows the balloon creature; closed safe 123 refuses.
        // locked 11 = LOCKEDBIT exact; native (grok1 #5092 grok1/locked/stationfall-locked.json): safe 123 reads 11=1 ("It's locked."); cage reads 0. One carrier + bit read (low risk: locked only steers Navigator).
        // moved 18 = TOUCHBIT (native, grok1 #5210 grok1/moved/packet-*.json, clear -> set on TAKE): Robot Use Authorization Form 248 and Assignment Completion Form 210 (drop, then take, sets 18); patrol uniform 229 stays clear. Source census inexact; native is the basis.
        "attributeMap": { "wearable": 20, "animate": 31, "talkable": 31, "light": 24, "container": 25, "open": 15, "isOpen": 15, "scenery": 10, "door": 27, "enterable": 29, "supporter": 17, "transparent": 13, "locked": 11, "moved": 18 },
        "playerGlobal": 183,
        "wornAttribute": 21
    },
    // Hitchhiker: native WEAR GOWN changes [0,0,0,64,32,193] to
    // [0,0,0,192,32,193]; REMOVE GOWN reverses exactly bit24. Native
    // inventory labels it "being worn". Executable-owned fact, not I6's bit26.
    "26dcdab275054e5899c9454a879816a1ced530e9172bd8d8cf101fb7acc27cb4": {
        // D232 local globals, roots only (work/investigations/r3-claude/localscope4/): Front of House 71 / Back of House 72 tree, Front Porch refuses tree; ids are 2-byte words (width 2); dark Bedroom 150 ("too dark") until light on. INVISIBLE 21 exact, ONBIT 45 exact.
        "localScope": { "property": 47, "width": 2, "holder": 37, "roomLitAttribute": 45, "invisible": 21 },
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
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: FORD, PROSSER (earth.zil), TRILLIAN, NUTRIMAT (heart.zil), ENGINEER, GUARDS (globals.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // WEARBIT 25 (grok1 2026-10-17, zil-inv-hidden-ops @c3f1254 seed 4): 'wear gown' (step 3) tests 206:25 TRUE ("You are now wearing
        // your gown."); 'wear toothbrush' (7) 31:25 FALSE and 'wear screwdriver' (7) 105:25 FALSE ("You can't wear the ..."). Whole module scanned
        // (all 236 objects): the gown is the only 25 owner, so the rule-5 exception applies: source WEARBIT 25 exact 1/1 confirms.
        // talkable 42 = the proven animate bit (grok1 2026-10-24, item 4 talkable batch; same mapping as Spellbreaker/Stationfall): talk-command scoped,
        // native, test_attr recorded only during the named command (grok1/talk/talk-probe.json, no relocation): 'ford, hello' @18 tests Ford Prefect 20:42 TRUE ("Hello to you too."), 'barman, hello' / 'tell barman' @22 test barman 230:42 TRUE, 'prosser, hello' @13 tests Mr. Prosser 155:42 TRUE; 'tell gown' @18 tests your gown 206:42 FALSE ("You can't talk to your gown!").
        // Source V-TELL / parser addressing tests this bit and refuses non-actors with "You can't talk to ...".
        // transparent 33 = source TRANSBIT exact (7 objects, fp 0 fn 0; historicalsource 1288855); static: the only runtime TRANSBIT writes are the parser's paired FCLEAR/FSET on the player inside the scope search (grok1 #5188). Effect: no Take on contents of a closed transparent container.
        // door 43 = source DOORBIT exact (4 carriers: bedroom, screening, corridor, inner door; none a room); native (grok1 #5199 probe4/cache19, G1PLAYER=19): bedroom door 205 CLOSE/OPEN read 43=1 and toggle OPENBIT 39; screening door 180 refuses natively.
        // moved 20 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): toothbrush 31, screwdriver 105, junk mail 198 (separate takes); doormat 101 stays clear. Gown/analgesic take via own routines (exceptions).
        // concealed 21 = INVISIBLE (native, codex #5245 resume-20261020/concealed/packet-hitchhik.json): bulldozer 228 reads 21=1 and the parser refuses it until OPEN CURTAINS clears 21 (then EXAMINE describes it); conversation 169 hidden until WAIT (Ford decides) clears 21 and LISTEN resolves it; curtains 63 visible with 21 clear. Parser visibility only.
        // enterable withdrawn (grok1 facts-D2, Codex #5367): VEHBIT 28 not proven by native evidence (bed entry raw all NOTEST; seated chair 164 alone is not 2 owners). Status UNKNOWN (ledger U), not feature-absent.
        // enterable 28 = VEHBIT (census: compiled carriers bed 114, GLOBAL-BED 166 (local-global proxy, PERFORMs on BED), pilot seat 49, poetry appreciation chair 164 - all seats/beds, no room; ENTER X = V-THROUGH -> BOARD on VEHBIT, verbs.zil:1957). Native r45 run-hhgg-*: get in bed tests 114:28=1 ("You are now in the bed."); get in gown 206:28=0 ("You can't get into your gown!"), get in jukebox 98:28=0.
        // switchable 32 = SWITCHBIT (census exact 3/3: dipswitch 143, generator switch 96, case switch 134 - all devices; DIPSWITCH-F/SWITCH-F/CASE-SWITCH-F handle LAMP-ON). Native r45 run-hg7-*: switch on switch (134, RAM 32 set) plays the case recording; switch on gown (206, 32 clear) "You can't turn that on." (run-hhgg). Switch-off is refused for 134 ("You can't turn that off.").
        "attributeMap": { "open": 39, "isOpen": 39, "animate": 42, "talkable": 42, "container": 40, "supporter": 23, "wearable": 25, "transparent": 33, "door": 43, "moved": 20, "concealed": 21, "enterable": 28, "switchable": 32 },
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
        // D1 source-proven (r44): inventoryHiddenAttribute 8 = NDESCBIT (tp 63 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 8,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope4/): Deck Nine 235 / Gangway 222 stairway, escape pod refused at Gangway; INVISIBLE bulkheads refused. INVISIBLE 19 exact, ONBIT 5 exact.
        "localScope": { "property": 9, "width": 1, "holder": 254, "roomLitAttribute": 5, "invisible": 19 },
        // Native SCORE names G2 as Galactic Standard Time (+40 per WAIT), not turns.
        // Reuse D204's existing authenticated clock relationship; no current readings seeded.
        // Evidence: resume-20261020/clock-native-transitions.json; independent design review4376.
        "command": "score",
        "fields": ["score.max", "rank", "day", "time"],
        "replyFamily": "extended-score",
        "outcome": "line",
        "statusTurnsMetric": "galactic-time",
        "evidence": "Original Planetfall native SCORE labels Galactic Standard Time, Day, score maximum and rank; WAIT advances the clock by 40. October21 independent investigations agree.",
        // RE-ADDED from PROBE walk p4: CONTBIT 24 TRUE on glass flask, large desk, small desk, canteen, dispenser unit; FALSE on old battery, laser setting dial, chemical fluid, funnel-shaped hole. Source has no SURFACEBIT object. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // CONTBIT 24: walk m1-m4 TRUE on large desk 145, small desk 149, canteen 163, survival kit 213; native dispatch TRUE on microfilm reader 55, medicine bottle 80, glass flask 125, cardboard box 137 and FALSE on four creatures 1-4 (zil-flags-neg-Planetfall). Planetfall source has NO SURFACEBIT object, so no table can be offered Open/Close. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // OPENBIT 11: OPEN sets 11 on escape pod bulkhead, door, small desk, large desk; tested FALSE first (survival kit, desks). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "wornAttribute": 12,
        // WEARBIT 22: native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). Container/open stay unproven (fail closed).
        // ACTORBIT 31 = animate (grok1 2026-10-17; target-named, test_attr recorded only during the named command): 'tell floyd' (walk 125) tests
        // Floyd 110:31 TRUE ("looks at you expectantly"); 'look in ambassador' / 'scold ambassador' (route pfD: WAITUNTIL the PROB-15 I-AMBASSADOR
        // arrival, seeds 2 and 3) test ambassador 219:31 TRUE (V-LOOK-INSIDE verbs.zil:1017, V-SCOLD 1825); 'tell kit' (walk 18) tests survival kit
        // 213:31 FALSE. Source ACTORBIT: 7 FLAGS carriers + FLOYD FSET/FCLEAR at runtime (compone.zil 1939/2154/2161); bounded compiled table
        // (255 objects, ends at first property 3069): bit-31 carriers = mutants 1-4, microbe 5, ambassador 219, ensign 220, player 234, none rooms.
        // FAIL-CLOSED: FLOYD carries CONTBIT + OPENBIT (compone.zil 1846), so animate joins the openCapability none list (P3/R pattern).
        // Residual: when FLOYD is switched off, FCLEAR ACTORBIT (1939) removes the exclusion; this is the dynamic-ACTORBIT gap of #4027 (family-default lane).
        // enterable 30 = source VEHBIT exact; native (r3-claude/vehbit + vehbit2): safety web 215 and bed 196 (ENTER moves the player inside; GET OUT returns; bare EXIT refused). Harmless extra: large vehicle 98 untested.
        // door 26 = source DOORBIT exact; native (r3-claude/doorbit): door 173 toggles, escape pod bulkhead 231 opens (floods: real game action).
        // Switch (grok1 grok1/switch/planetfall.json, grok2 ACCEPT #4896): lamp 25 (source LAMP-F comptwo.zil:2197; LIGHTBIT-free LAMP, only holdable switch owner):
        // native take; TURN ON -> sets 5, "It is on."; TURN OFF clears 5, "It isn't on."; on again; canteen refuses. ONBIT 5 is also room-lit, so no on map.
        "attributeObjects": { "switchable": [25] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
// scenery 8 = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos crevice 159, padlock 172, safety web 215 (look omits, pc 48473); neg old battery 7, towel 214 (listed, same pc). Listing routine: historicalsource 7e7af12 verbs.zil:162 PRINT-CONT.
        // climbable 29 = CLIMBBIT exact; native bare (grok1 #5082): CLIMB STAIRWAY 249 -> Courtyard, CLIMB SAFETY WEB 215 contextual; canteen 163 (bit 0) refused.
        // edible 27 = FOODBIT exact; native (grok1 #5090 grok1/open/planetfall-edible.json): bare EAT FIND reads 27=1 on red goo 212 and brown goo 211; canteen 163 negative.
        // transparent 9 = source TRANSBIT exact (6 carriers); native (grok1 #5117 pf-route, G1TRACE): medicine bottle 80 closed (OPENBIT 11=0) reads 9=1 and EXAMINE MEDICINE shows the contents, both on the Infirmary shelf @292 and held @293; closed small desk 149 (no bit) hides the kitchen card @61. One carrier + bit reads (low risk).
        // moved 18 = TOUCHBIT (seeded-native tier, Codex #5335; grok1 packet P4 probe5/moved/planetfall): TAKE scrub brush 227 / ID card 225 set 18 (ITAKE verbs.zil:580-583); chronometer 226 stays clear. Trace = g1-batch before/after attr-byte diff (test_attr only; no FSET op in opsOnId).
        // concealed 19 = INVISIBLE (native, codex #5262 resume-20261020/concealed/packet-planetfall.json, accepted grok1 #5270): emergency bulkheads (narrow bulkhead 229 @Deck Nine) unseen until the explosion sequence clears 19 (globals.zil 1136/1144 INVISIBLE, 1215/1217 FCLEAR); scrub brush 227 negative.
        "attributeMap": { "wearable": 22, "open": 11, "isOpen": 11, "container": 24, "animate": 31, "enterable": 30, "door": 26, "scenery": 8, "climbable": 29, "edible": 27, "transparent": 9, "moved": 18, "concealed": 19 }
    },
    // Hollywood Hijinx (ZIL): WEARBIT 22 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match).
    "e3341f28a0cca7a2e7bdf151c7b31b16124e77f31bf0e0e1349be2e6ae2fbe5e": {
        // D12 R2: released V-CLOSE37544 tests compiled CAPACITY property8; Open has a different predicate.
        "closeRule": { "capacityProp": 8 },
        // D1 source-proven (r44): inventoryHiddenAttribute 16 = NDESCBIT (tp 77 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 16,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope3/): Front Porch 185 oak door, Southwest Junction 31 garden; reciprocal refusals. No dark witness (positive-only lit).
        "localScope": { "property": 15, "width": 1, "holder": 54, "roomLitAttribute": 20, "invisible": 29 },
        // WITHDRAWN 2026-10-11 (operator 23:15, fail closed): container - walk evidence was not target-scoped (Codex #3474); re-add only after targeted on-device tests.
        // CONTBIT 4: TRUE on mailbox, small compartment, cannon, pile of cannon balls; FALSE on doorbell, Status Line. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // Grok4112 independently audited: native SEARCH Herman163/Aunt126 tests18 true; buzz saw152 false. No room owners.
        // SURFACEBIT 27 (claude 2026-10-24, r3-claude/animate-supporter/HollywoodHijinx.json, ordinary commands): PUT photo ON table and
        // ON mantle -> "Done." (parent changes); letter, flashlight, sofa, telephone refuse ("no good surface"). Source exact 7 of 7.
        // The three wax statuettes carry it but refuse ("no room"): disclosed harmless extra Put on.
        // door 10 = source DOORBIT exact; native (r3-claude/doorbit): oak door 117 and patio door 25: door-specific "unlock it first" refusals (no toggle reached).
        // Switch (grok1 #4833 work/investigations/grok1/switch/hollywood.json): flashlight 123: TURN ON -> "Okay, the flashlight is now on." (20 set), TURN OFF clears; held paper and mailbox refuse. Only holdable LIGHTBIT object (computer/projectors fixed, left out). ONBIT 20 on other carriers is room-lit state: never switchable.
        "attributeObjects": { "switchable": [123] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        "activationState": { "onObjects": [123] },
// scenery 16 = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos small pond 14, orchids 104, bazooka 114, doorbell 228 (look omits, pc 36783); neg business card 63, Status Line 181 (listed, same pc). Listing routine: historicalsource e93d085 verbs.zil:211 DESCRIBABLE?.
        // open 25 = OPENBIT (tp19 fp0 fn1, under-report only); native (grok1 #5090 grok1/open/hollywood-open.json): mailbox 225 reads 25=1 and CLOSE clears it; oak door 117 reads 0 while locked; doorbell negative.
        // isOpen 25 = same OPENBIT state.
        // moved 28 = TOUCHBIT (native, codex #5183 resume-20261020/moved/packet-hollywoodhijinx.json): TAKE paper 63 and card 113 set bit 28; object 44 stays clear.
        // talkable 18 = ACTORBIT (= animate), census exactly Aunt Hildegarde 126 + Cousin Herman 163 (+ player/globals); native (grok1 #5221 grok1/probe5/run-hollywood-*, vault route hw-vault.json): HELLO HERMAN / HELLO AUNT / AUNT, HELLO read 18=1; buzz saw 152 reads 0.
        // concealed 29 = INVISIBLE (native, codex #5244 resume-20261020/concealed/packet-hollywood.json): safe 203 and card 46 (Outside Parlor) read 29=1 and EXAMINE is refused; MOVE PORTRAIT clears 29 on both and EXAMINE then succeeds; portrait 65 visible with 29 clear.
        // container 4 = CONTBIT (tp24 fp0 fn1; native, claude worker E7 claude-probe/hollywood/run-hollywood-*): OPEN/LOOK IN read 4=1 on mailbox 225, piano 222, cloth sack 199, compartment 138 (contents shown); business card 63 reads 0 ("You can't look inside"). No room carries 4. Every SURFACEBIT 27 object also carries 4, hence openCapability.
        // openCapability: Open/Close for containers that are not surfaces (mantle 194 / pile 207 / table 211 carry CONTBIT but refuse CLOSE natively, claude worker E7).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // enterable 8 = VEHBIT (source exact 2/2; native claude-probe/e1d9 run-hollywood-*): ENTER left/right end of plank moves the player 90->8 / 90->68 with 8=1; ENTER SAFE 227 8=0 "You hit your head against the safe". Plain ENTER works natively (no enterForms override).
        // locked 15 = LOCKEDBIT (hollywood-locked-notes.md S; P10b door-only destination isLocked). Oak door 117 OPEN DOOR "unlock first" 15=1; statue click 1->0; Foyer LOCK/UNLOCK 0->1->0; hatch 155 15=0. Rooms carry 15 as lockable-from-here only � exits use doorObjectId/routeBlocked after P10b.
        "attributeMap": { "wearable": 22, "animate": 18, "supporter": 27, "door": 10, "on": 20, "scenery": 16, "open": 25, "isOpen": 25, "moved": 28, "talkable": 18, "concealed": 29, "container": 4, "enterable": 8, "locked": 15 },
        // WORNBIT state14: independent native ring127/skis188 wear+remove, flashlight123 refused; Grok4120 proposal, Codex October20 audit.
        "wornAttribute": 14
    },
    // Moonmist (ZIL): WEARBIT 29 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match).
    // OPENBIT 14 original scene (pzmoonmist6): "open luggage" sets 14, "open gate" finds it set on the front gate and
    // "close gate" clears it; source-exact 57/57. CONTBIT 27 / SURFACEBIT 23 from the original scene
    // (2026-10-11-zil-walk-pzmoonmist5.json, target-scoped probes: chest of drawers, sports car, wardrobe / wing chair, bed, night
    // table, bench) and source-exact. Together, so surfaces get no Open/Close. Closes the luggage-contents leak (ledger FINDING).
    "bcf65075f2343fd3d10606141d7dbfa2c50f8bbf96b65161e2bda0f7fc65e3b0": {
        // Four-seat accepted display-only LOCKED8 observation: native gate52 clear/set with
        // opening/locking text, matched-source census + behaviour tier (not a singleton bit).
        // Other LOCKED carriers include rooms/puzzle memory; no generic map/navigation fact.
        // Evidence: items-codex/resume-20261020/oct30-recovery/moonmist-raw-lock-audit.md.
        "lockedObservation": { "attribute": 8, "objects": [52] },
        // D232 local globals, roots only (work/investigations/r3-claude/localscope6/): GLOBAL property found by single-holder scan (census property 8 was the room list): driveway 9 / courtyard 13 ocean and front gate, foyer 132 oil painting; reciprocal refusals; GLOBAL entries parented 37 are skipped by the holder check. INVISIBLE 6 exact, ONBIT 10 exact.
        "localScope": { "property": 7, "width": 1, "holder": 44, "roomLitAttribute": 10, "invisible": 6 },
        // Bit21 is garment state only in its physical item domain; rooms
        // reuse it for mirrors, and offstage GLOBAL-OBJECTS carries all flags.
        "wornAttribute": 21,
        "equipmentState": { "wornWhen": "bit-garment-domain", "roomRootObject": 37, "objectCount": 253 },
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // PERSONBIT 31 = animate (grok1 2026-10-17, g1-mmA.json; route moonmist step 32, courtyard with Tamara and Bolitho present; test_attr recorded
        // only during the named command): 'analyze tamara' tests Tamara 178:31 TRUE, 'analyze bolitho' tests Bolitho 91:31 TRUE (PRE-ANALYZE verbs.zil:1370,
        // reply "(Leave that to the police.)"); 'analyze luggage' tests luggage 59:31 FALSE at the same position in the turn (after the common parser prefix). Source PERSONBIT: 10 FLAGS carriers (people.zil), exact
        // (2026-10-11-zil-source-flags.json); bounded compiled table (253 objects, ends at first property 2997): bit-31 carriers = 14 (10 persons + yourself
        // 42/69 + upstairs maid 125 + White Lady 167); none are rooms. FAIL-CLOSED (defensive): the persons carry OPENBIT + SEARCHBIT (people.zil 181...1664), so animate joins
        // the openCapability none list (P3/R pattern).
        // Grok4129 independently replayed: lamp164/lantern153 native bit10 on; bed134/chair76 false/refused. State only.
        // Switch (grok1 #4849 grok1/switch/moonmist.json): brass lantern 153: TURN ON -> "Okay, it is now on." (10 set), TURN OFF clears; nightlamp 164 fixed, left out. on 10 already mapped.
        "attributeObjects": { "switchable": [153] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        // talkable 31 (grok2 #4933, verified grok1; g1-batch talk run grok1/batch/talk-moonmist-{run,plan}.json, test_attr during the named talk command only): Tamara 178 "tamara, hello"/"talk to tamara" 178:31 TRUE, Bolitho 91 91:31 TRUE; horn 21 and luggage 59 31 FALSE.
// scenery 19 = NDESCBIT (grok1 2026-10-24 user scenery ruling 11:45; g1-batch look + test_attr/print_obj trace, grok1/batch/cache-scenery4|5 judge-scenery.json): pos dragon's eye 187, dragon 190 (look omits, pc 41980 tests 19, examine ok); neg Tamara 178 (no 19, listed via print_obj at same pc). Listing routine: historicalsource c85885f castle.zil:781 DESCRIBE-CONTENTS.
        // enterable 28 = source VEHBIT exact; native (grok1 #5002 grok1/enter/moonmist.json): carriers 171, 134, 76 ENTER moves the player inside, non-carrier refuses.
        // transparent 9 = source TRANSBIT exact; native (grok1 #5112 grok1/routes/moonmist-red-bsmt.json, G1TRACE): LOOK THROUGH closed locked gate 52 reads 9=1 and reaches ROOM-PEEK via the TRANSBIT branch (verbs.zil 2687-2693); LOOK THROUGH bottle 142 reads 9=1; chest of drawers 160 (no bit) negative.
        // moved 16 = TOUCHBIT (native, grok1 #5210 grok1/moved/packet-*.json, clear -> set on TAKE): luggage 59 and aerosol device 247; sports car 171 stays clear.
        // inventoryHiddenAttribute 19 = NDESCBIT exact; Moonmist PRINT-CONTENTS (516) lists one level and omits NDESCBIT items without descending, matching the app subtree skip (claude worker E2, claude-probe/invhidden). Source-proven like the transparent x8 precedent; TAKE clears NDESCBIT so held carriers are rare (nested coat of paint in the cane).
        "inventoryHiddenAttribute": 19,
        "attributeMap": { "wearable": 29, "open": 14, "isOpen": 14, "container": 27, "supporter": 23, "animate": 31, "talkable": 31, "on": 10, "scenery": 19, "enterable": 28, "transparent": 9, "moved": 16 , "concealed": 6 }
    },
    // Deadline (ZIL): OPENBIT 28 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). CONTBIT 21 is also proven but is NOT applied
    // until SURFACEBIT/supporter is proven, so surfaces never gain container Open/Close (Zork I table lesson, a89704b).
    // 2026-10-15: both now from the original scene (2026-10-11-zil-walk-pzdeadline.json, target-scoped probes): CONTBIT 21 on
    // living room table, marble-top table, front door; SURFACEBIT 29 on both tables; negatives cabinets, portraits, fireplace,
    // lamp, book, wood pile. Source-exact (24/24, 10/10). Applied together with openCapability.
    // Grok4099 design, independent native audit: PERSON20 Dunbar155/George153 true, sofa200 false; no talkability/switchability inference.
    "9c6eadbb30bbe1610230508865ec40969a7c54917fc40591a189c9f3835dffc4": {
        // D1 source-proven (r44): inventoryHiddenAttribute 25 = NDESCBIT (tp 60 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 25,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope6/): GLOBAL property found by single-holder scan (census had picked the room-list property 16): South Lawn 249 house/lawn, East Lawn 238 shed; roses refused at 249 and 238, sink refused at 249. INVISIBLE 31 exact, ONBIT 23 exact.
        "localScope": { "property": 15, "width": 1, "holder": 254, "roomLitAttribute": 23, "invisible": 31 },
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // scenery 25 = NDESCBIT exact (grok1 scenery3): LOOK omits cabinets/portraits/wood pile/fireplace, EXAMINE works.
        // door 22 = source DOORBIT exact; native (codex #5036 resume/door-deadline-qualified.json): front door 245 and closet door 215 OPEN/CLOSE toggle open 28 while bit 22 is set; OPEN ME (self 160, no bit 22) refused.
        // enterable 12 = source VEHBIT exact; native (grok1 #5149 routes/cache/dls*): SIT ON moves the player into bed 34, bathtub 105, toilet 209, bed 211, sofa 200 (V-CLIMB-ON reads 12=1); lounge 33, chair 212, counter 104 read 0 and refuse; GET OUT OF native on all five. ENTER refused (hits head), hence enterForms.
        // enterForms (enter-form R2, grok1 #5116 consensus): the game refuses ENTER on every carrier; SIT ON is its enter verb.
        "enterForms": { "enter": "sit on" },
        // talkable 20 (seeded-native tier; grok1 packet H): ASK Robner/Rourke TRUE; china/shelf FALSE; V-ASK-ABOUT verbs.zil:1595-1596.
        // moved 30 = TOUCHBIT (seeded-native tier, Codex #5335; grok1 probe5/moved/deadline2 FF873293): TAKE pencil 10 / cup 113 set 30 (ITAKE verbs.zil:435-436); desk 147 stays clear; room entry is supporting only. Trace = g1-batch before/after attr-byte diff (test_attr only; no FSET op in opsOnId).
        // concealed 31 = INVISIBLE (native, codex #5265 resume-20261020/concealed/packet-deadline.json, accepted grok1 #5270 + #5462 caveat): mud spot 107 (actions.zil 4295 MUD-SPOT FCLEAR) and fragment (592 FCLEAR) are 2 native reveal/clear owners; desk 147 negative. Caveat: the mud phase raw is partial (no endStable); this proves reveal/clear at the disclosed tier, not stable hidden-specific refusals.
        "attributeMap": { "open": 28, "isOpen": 28, "container": 21, "supporter": 29, "animate": 20, "scenery": 25, "door": 22, "enterable": 12, "talkable": 20, "moved": 30, "concealed": 31 }
    },
    // The Witness (ZIL): OPENBIT 8 proven by native verb dispatch (work/investigations/zil-flags-native.js, 2026-10-11-zil-flags-native.json: >=2 positives + 1 negative inside the verb routine) and the Infocom source (historicalsource; 2026-10-11-zil-source-flags.json, exact object-set match). CONTBIT 9 proven but held until supporter is proven (as Deadline).
    // The Witness (ZIL): constant PLAYER object 79 (historicalsource/witness 8fe092a people.zil 73 OBJECT PLAYER
    // IN DRIVEWAY-GATE DESC "detective"). No PLAYER global; WINNER (G112 in this binary, 19 stores G112<-79) is
    // reassigned (SETG WINNER ,PLAYER x15 in people.zil), so playerGlobal is not used. Native i at boot lists the
    // telegram, handcuffs, Colt and match book, all children of 79; the app previously resolved no player (2026-10-15).
    // CONTBIT 9 / SURFACEBIT 16 original scene (2026-10-11-zil-walk-pzwitness2.json, target-scoped, source-exact 27/27,
    // 17/17): file cabinet, liquor cabinet, lounge / lounge, carved chair, desk; negatives cat, Monica, Linder, newspaper,
    // putty, door bell. Applied together with openCapability so surfaces get no Open/Close.
    // Animate 31 (PERSON, people.zil 158/507/695/895 + GLOBAL- twins): EXAMINE LINDER (office) tests 74:31 TRUE and
    // EXAMINE MONICA (entry, step 3) tests 68:31 TRUE with their descriptions; EXAMINE DESK tests 118:31 FALSE (g1-wiA,
    // test_attr only during the named command). Bounded table: 9 carriers = 4 people x2 + GLOBAL-OBJECTS 249; no rooms.
    // Fail-closed: animate joins openCapability none (actor Open/Close refused).
    "2290bb3440ac66e14d54d41dbde575066ebdbdc42138ec899496e359bc484824": {
        // D1 source-proven (r44): inventoryHiddenAttribute 19 = NDESCBIT (tp 93 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 19,
        "inventoryHiddenRecurses": true,
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // locked 17 = LOCKED exact; native (grok1 #5096 grok1/locked/witness-locked.json): front door 231 and office back door 213 read 17=1 ("unlock it first"); bedroom door 171 reads 0 and opens. Only the ROOMS container 249 (never a destination) carries 17; no room does.
        // enterable 29 = source VEHBIT exact 11/11; native (grok1 #5135, routes/cache/ws*): SIT ON moves the player into 9 carriers (lounge 104, wooden chair 110, club chair 164, davenport 165, bench 155, table 156, bed 190 ("sit on bed"; four-poster 173 needs rephrase), bathtub 179, toilet 245) reading 29=1; carved chair 111 is Linder-intercepted (native); desk refuses; GET OUT OF LOUNGE native. ENTER refuses everywhere (V-THROUGH), hence enterForms.
        // enterForms (enter-form R2, grok1 #5116 consensus): the game refuses ENTER on every carrier; SIT ON is its enter verb.
        "enterForms": { "enter": "sit on" },
        // door 28 = source DOORBIT exact 16/16 (doors and gates only; no ROOM carries it); native (grok1 #5206, locked/cache/run-witness-*): front door 231, office back door 213, bedroom door 171 and office door 121 read 28=1; OPEN BEDROOM DOOR sets OPENBIT 8.
        // talkable 31 (seeded-native tier; grok1 packet I): ASK Monica/Linder ABOUT X TRUE; telegram/handcuffs FALSE; verbs.zil:734-735.
        // moved 4 = TOUCHBIT (seeded-native tier, Codex #5335; grok1 packet P3 probe5/moved/witness): TAKE match book 53 / telegram 54 set 4 (ITAKE verbs.zil:461-462); held handcuffs 51 stays clear (off-scope boots excluded). Trace = g1-batch before/after attr-byte diff (test_attr only; no FSET op in opsOnId).
        // Proposed concealed 12 = native INVISIBLE; retained Codex packet concealed/packet-witness.json (107/55 positives; 112 negative). Native/source tiers and SAVE/RESTORE qualifications remain in packet; no actor-possession or whole-title consumer closure.
        "attributeMap": { "open": 8, "isOpen": 8, "container": 9, "supporter": 16, "animate": 31, "locked": 17, "enterable": 29, "door": 28, "talkable": 31, "moved": 4 , "concealed": 12 },
        // switchable (P4 R2, codex ACCEPT #5543; native claude-probe/p4-witness/witness-radio-room.json): radio 162, fixed in the
        // living room ("You can't take the radio."): TURN ON RADIO -> "You turn on the radio, spin the dial and find an Amos 'n' Andy
        // serial."; TURN OFF RADIO -> "Monica looks at you with disgust as you turn off the radio."; coffee table / club chair refuse
        // ("You can't turn on the coffee table."). State-less toggle (no ONBIT write, grok1 #5186): both forms, no state badge.
        "attributeObjects": { "switchable": [162] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        "switchableScope": { "162": "room" },
        "playerObject": 79
    },
    // Starcross (Infocom v3): animate 11 = VICBIT (grok1 2026-10-17; route agent-tools/g1-routes.json 'scs' = zil-routes starcross with
    // the 'SCUM' placeholder replaced by the course for the seed-0 mass UM08, R150 theta210 phi17, dungeon.zil MASS-LOCS; test_attr only
    // during the named command, objects present): Spherical Ship @56 'look in spider' tests 196:11 TRUE and Village Center @132 'look in
    // chief' tests 169:11 TRUE ("There is nothing special to be seen.", V-LOOK-INSIDE VICBIT branch verbs.zil:982); 'give library to suit'
    // tests space suit 144:11 FALSE and 'give library to red rod' tests 45:11 FALSE ("You can't give a tape library to a ...", V-GIVE
    // verbs.zil:671). Bounded table: 6 carriers = weasel chieftain x2, rat-ant, giant spider, weasel-like alien, ship computer 24
    // (addressed by 'computer, ...'); no rooms. VILLAIN 20 is NOT animate (palisade, laser beam, nest). No container is mapped.
    "1d9a69257349060823893f4cfa616f1040a3b41cbf38a6717199f206cd8f678c": {
        // D1 source-proven (r44): inventoryHiddenAttribute 23 = NDESCBIT (tp 78 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 23,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (work/investigations/r3-claude/localscope5/): ship Bridge 202 / Airlock 122 airlock; Living Quarters 10 refuses airlock and window. Artifact rooms not reached. INVISIBLE 30 exact, ONBIT 18 exact.
        "localScope": { "property": 18, "width": 1, "holder": 111, "roomLitAttribute": 18, "invisible": 30 },
        // Switch (grok1 #4847 grok1/switch/starcross.json): tape library 71: TURN ON -> "The tape library comes on.", TURN OFF -> "...is now off."; bunk refuses. State is the global TAPE-ON (no object bit), so no activationState/on.
        "attributeObjects": { "switchable": [71] },
        "capabilityForms": { "switchable": ["turn on", "turn off"] },
        // scenery 23 = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource 3ceaa9f verbs.zil:134 PRINT-CONT) testing NDESCBIT on that object at pc 24111 during that look, examine works. Positives 22:small bump, 56:seat belt; negative 71:tape library (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-starcross.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).
        // enterable 15 = source VEHBIT exact; native (grok1 #5000 grok1/enter/starcross.json): carriers 123 and 128 ENTER moves the player inside, non-carrier refuses.
        // climbable 22 = CLIMBBIT exact; native bare (grok1 #5089 grok1/climb/starcross.json): CLIMB UP in Repair Room reads 22=1 on stairs 155, moves to Thin Forest; held tape library "Bizarre!". Other carriers unreached (low risk).
        // open 9 = OPENBIT exact; native (grok1 #5090 grok1/open/starcross-open.json): inner door 39 and access panel 29 toggle 9 both ways; tape library / space suit negatives.
        // isOpen 9 = same OPENBIT state.
        // container 8 = source CONTBIT exact (27 objects); native (grok1 #5191 probe3/cache run-starcross-*): LOOK IN metal basket 40 and nest 6 read 8=1; CLOSE/OPEN toggle open 9 both ways on both (grok1 #5193: opening the nest reveals a red rod); tape library 71, space suit 144 and square 180 read 8=0 (cannot look inside). No openCapability (supporter unmapped would fail closed).
        // door 12 = source DOORBIT exact (14 static carriers, none a room); native (grok1 #5195 probe3/cache run-starcross-*): outer door 189, inner door 39 and red outer door 121 (all carry 12) open/close by name with OPENBIT 9 tracking state; the game drives them via airlock routines, so DOORBIT itself is not tested; metal basket 40 reads 12=0.
        // supporter 28 = SURFACEBIT, static (no runtime FSET/FCLEAR in historicalsource/starcross; carriers red disk 66, blue disk 103, silver sphere 31, mouse 212; the catalog name-match missed 31/212); native (grok1 #5213 support/run-starcross-*): CLOSE red disk / blue disk / silver sphere read 28=1 and refuse ("You cannot close that."); CLOSE metal basket reads 28=0 and closes.
        // openCapability: Open/Close for containers that are not surfaces (the disks/sphere carry CONTBIT but refuse CLOSE natively, grok1 #5213).
        "openCapability": { "all": ["container"], "none": ["supporter"] },
        // moved 29 = TOUCHBIT (seeded-native tier, Codex #5335; grok1 probe5/moved/starcross2 D7C9410E): TAKE space suit 144 / black rod 84 set 29 (ITAKE verbs.zil:580-583); mass detector 221 and metal relief 23 stay clear; room entry is supporting only. Trace = g1-batch before/after attr-byte diff (test_attr only; no FSET op in opsOnId).
        // talkable 11 = VICBIT (seeded-native tier: g1-batch default seed; grok1 2026-10-25, packet E1 probe5/talk/run-starcross-20261026T011323-35324.json, test_attr during the named TELL command only): computer 24 "tell computer to look" 24:11 TRUE, giant spider 196 "tell spider to look" 196:11 TRUE; nest 6 "tell nest to look" 6:11 FALSE ("You can't talk to the nest!"), translator 9 "tell translator to look" 9:11 FALSE.
        // concealed 30 = INVISIBLE (native, codex #5264 resume-20261020/concealed/packet-starcross.json, accepted grok1 #5270): actions.zil 1436-1443 SET-dial: dial 4 with an object UNDER-GLOBE sets 30 (black rod 84 / red disk 66, parent 80 unchanged, EXAMINE "can't see"); dial 2 clears it; space suit 144 negative.
        "attributeMap": { "animate": 11, "talkable": 11, "scenery": 23, "enterable": 15, "climbable": 22, "open": 9, "isOpen": 9, "container": 8, "door": 12, "supporter": 28, "moved": 29, "concealed": 30 },
        // Grok4124 design, new native two-owner proof: normal144 and tattered176; held library71/basket40 negative.
        "wornAttribute": 24,
        // Identity Wear R3 (four-seat ACCEPTED, PROPOSAL-identity-wear-r3 sha 4a1e90a7): bare WEAR native-proven for these direct-held owners.
        // Starcross space suit 144 (cold-sc-suit.json). Junk suit 176 added (PROPOSAL-wear-subdomains-r1: claude + grok ACCEPT; native wear, worn remove clears bit 24).
        "wearForms": { "objects": [144, 176], "verb": "wear", "scope": "held-direct" }
    },
    // Sherlock (Infocom, z5; no historicalsource pin): constant PC object 232 "you" (Watson). Native i lists exactly
    // 232's children (black bag 172, whistle 173, hat 188, coat 302); G201 holds 232 and its parent follows the status-line
    // room on travel (221-B Baker Street 38 -> KNOCK ON DOOR -> Entry Hall 111), measured 2026-10-16 (zil-route-ops). The
    // resolver otherwise picked the parser "yourself" 168 (parent 177, offstage) and the room fell back to the black bag.
    // Constant object, not the global, because orders to Holmes may reassign a WINNER-style global. SOLO/SELF-AUDIT.
    // Container 9 / open 5, measured with raw (ordered, undeduplicated) VM ops beyond the per-turn background scope pass:
    // PUT WHISTLE IN BAG adds target tests of bit 9 TRUE on the black bag 172, PUT WHISTLE IN COAT (redirected) on the
    // pocket 287; PUT BAG IN WHISTLE tests 9 FALSE on the whistle 173. OPEN BAG turns the bag's bit 5 from 0 to 1 (CLOSE
    // then finds it set); the open pocket and coat carry 5. Census: bit 9 = containers, boats, cabs; bit 5 also on doors.
    // No source pin. Closed bag no longer spills its bottles/pills. SOLO/SELF-AUDIT.
    "ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0": {
        "playerObject": 232,
        // No openCapability (grok2 REVISE #3576: "all containers" offered Open on the lapel, hat and bottles).
        // wearable 11 = FL-CLOTHING: census+behaviour tier (8 static carriers, 0 setters; WEAR WHISTLE 173 reads 11 TRUE, WEAR KNIFE 151 reads 11 FALSE); V-WEAR refuses non-FL-CLOTHING.
        // r49 grok-lane Sherlock (four-seat): animate 40 = FL-ALIVE (animals too; V-LISTEN/V-LOOK-INSIDE discriminate), talkable 47 = FL-PERSON,
        // supporter 16 FL-SURFACE, door 8 FL-DOOR, locked 15 FL-LOCKED (box 137, front door 35, bedroom door 104; no rooms), openable 44,
        // enterable 1 FL-VEHICLE, transparent 2 FL-TRANSPARENT (phial 128 + wax pool 179). Packets: grok-lane-1031/PACKET-sherlock-*.md.
        // r50: moved 3 = FL-TOUCHED (object TOUCHBIT; byte-diff: pound note 150 / pistol 122 0->1 on take, Mrs Hudson refused 0->0 (run d854ecf6 / plan a51a105c, codex sherlock-moved-retained-substitution.json; not the PACKET-moved-3 parent-0 cannot-see row));
        // edible 41 = FL-FOOD (census+behaviour: 2 eats + 2 refusals, PACKET-edible-41.md). scenery FL-NODESC 32 is NOT mapped (L:X: list-suppression only).
        "attributeMap": { "container": 9, "open": 5, "isOpen": 5, "wearable": 11, "animate": 40, "talkable": 47, "supporter": 16, "door": 8, "locked": 15, "openable": 44, "enterable": 1, "transparent": 2, "moved": 3, "edible": 41 },
        // wornAttribute 34 = FL-WORN (dynamic state): native set/clear on hat 188 and whistle 173; knife stays clear. REMOVE/TAKE OFF syntax FINDs FL-WORN.
        "wornAttribute": 34,
        // inventoryHidden 32 = FL-NODESC (two-active-seat ACCEPT, codex absent/audits on return: grok PACKET-sherlock-invhidden-lair-native-grok-1115.md author, claude CLAUDE-VOTES-sherlock-invhidden.md):
        // native INVENTORY omits the held rope 176 with 32 set (Lair untie), lists it with 32 clear (cut). Hidden holders recurse (label withheld, contents walked); pocket contents gated by inventoryLabelRule. Static stays NC (26 = TRYTAKE).
        "inventoryHiddenAttribute": 32,
        "inventoryHiddenRecurses": true,
        // R3 (codex pocket-R3-proposal, claude impl): pocket 287 contents labelled only while coat 302 is worn (V-INVENTORY ~4030); unworn they stay in scope, label withheld.
        "inventoryLabelRule": { "kind": "worn-holder-pocket", "holder": 287, "garment": 302, "wornAttribute": 34 },
        // lightForms (three-seat ACCEPT: claude PACKET-lamp-claude.md, grok VOTES-grok-claude-packets.md, codex sherlock-takeover-votes-1422.md):
        // lamp 166 only; state FL-LIGHTED 38 (also room-lit, hence owner-scoped); FL-LAMP 42 = parser default for LAMP-ON/OFF objects (FL-LAMP42); forms are the game defaults turn on/turn off.
        "lightForms": { "capabilityBit": 42, "stateBit": 38, "objects": [166], "on": { "default": "turn on" }, "off": { "default": "turn off" } }
    },
    // phlegm (Inform, no attribute-name table): this library numbers container 3 (I6 default: concealed 3, container 4).
    // Raw target-scoped PUT IN tests (zil-route-ops-raw.cjs): PUT MAP IN COAT tests 3 TRUE on the blue overcoat 39, PUT MAP
    // IN CANNON TRUE on the cannon 43 (with open 14); PUT COAT IN MAP FALSE on the map 38, PUT MAP IN TREE FALSE on the tree 41.
    // Leo (37) sits in the worn overcoat and native i lists him. concealed has no bit here (null). SOLO/SELF-AUDIT.
    "7bb622d1c5c65954361c49bf2522621cfd27af7ddf4a7f1041c286f1b0f57756": {
        "attributeMap": { "container": 3, "concealed": null }
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
        "evidence": "2026-10-05 live DIAGNOSE: You can check your STR at any time from the status line, the bar at the top of the window. It's currently 14. Grid LVL/STR; SCORE EXP 0/50.",
        // Depth (operator 2026-11-06, work/investigations/llr3-depth/PROPOSAL.md): each room's property 7 is its
        // map_region (class-21 object; no property-name table in this build). Measured: level-1 rooms 215-223 -> 214,
        // level 2 225-233 -> 224, 234 (235-246), 247 (248+), 272 (273-275). Trapdoor 219 -> 233 crosses 214 -> 224.
        // Depth = 1 + rank of the region among distinct prop-7 values; a region change is a map level change.
        "regionDepth": { "regionProperty": 7 }
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
        // Inform P1b (claude PACKET-spirit): Inform 5-era alphabetical layout, yourself 0,2,16,23; raw-op + census.
        "attributeMap": { "animate": 0, "clothing": null, "wearable": null, "concealed": 2, "container": 3, "door": 4, "edible": null, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null },
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
        // mapzero (grok solo, grok-review): I6 player/actor pair g18=g53=24 "myself" inside bunkbed in 26 Dormitory Room;
        // the app chose the parentless self object 20 and the map stayed empty. Native i "I am carrying nothing" = 24 has no
        // children. Injected-fact harness (grok-lane-1031/mapzero-measure/measure4.cjs s6/s7/s8): pid 24, room 26 admitted.
        "playerGlobal": 18,
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
        // Inform P1b (claude PACKET-lost): Inform 5-era alphabetical layout, yourself 0,2,16,23; raw-op + census.
        "attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null },
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
        // mapzero (grok solo, grok-review): I6 pair g18=g53=24 "Lisa Flint"; the app chose parser-self 114 inside 112 "Golden
        // Horse" (showing its laser beam/mechanical claws as inventory). Native i describes only the worn school blazer and
        // boots; with g18 the app inventory is the school uniform and the map admits 27 Jetty (measure4.cjs s6/s7/s8).
        "playerGlobal": 18,
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
        // D5 R2 narrow audited status domain: native/source hatch119 and detached padlock135; not a lockable capability or route-block fact.
        "lockedStatusObjects": [119, 135],
        // CONTBIT 27: tested TRUE on refrigerator, cardboard carton, access panel; FALSE on Funny Bones package, microwave controls, display (zil-walk). Q8 player root: G188 is the only global holding object 56; walkthrough TAKEs (4) move items into 56; app read 29 with an empty inventory. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        "playerGlobal": 188,
        // OPENBIT 13 (original-scene native explorer, zil-native-explore2-c.json): refrigerator OPEN tests 13 false, sets it,
        // reveals carton + Coke; CLOSE tests true, clears. OPEN on chair, pc, kitchen counter, forklift tests 13 TRUE natively.
        // SURFACEBIT 8 original scene (2026-10-11-zil-walk-pzlurking.json, target-scoped): chair, kitchen counter, forklift,
        // floor waxer TRUE; catwalk, ladder, flask, refrigerator, microwave oven, flashlight, crowbar FALSE. Source exact 10/10.
        // Applied with openCapability so surfaces get no Open/Close.
        // FAIL-CLOSED (grok1 2026-10-17): actors carrying CONTBIT + OPENBIT + PERSON (source: HACKER (hacker.zil:9), URCHIN (frob.zil:201),
        // PROFESSOR (cs.zil:5279)) must never get container Open/Close, so the proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // PERSON 31 = animate (grok1 2026-10-17, g1-scan2 = Jericho walkthrough replay, test_attr recorded only during the named command):
        // 'tell hacker' @22 tests hacker 129:31 TRUE; 'tell maintenance man' @68 and 'maintenance man, hello' @69 test maintenance man
        // 20:31 TRUE; 'tell carton' @22 tests carton 58:31 FALSE. Source PERSON = bit 31 exact. Room-safe: the only runtime FSET is on
        // HAND (cs.zil:5582), no room carries PERSON, so ZRamReader.isPlausibleMapRoom is unaffected.
        // on 15 = ONBIT state (codex #4345/#4347: flashlight single player-switchable item; rooms = lit state, global waxer always on).
        // openable 2 = source OPENABLE, carrier set exact 22/22; native (codex #4752): OPEN Funny Bones 18 and fridge 105 set 13,
        // counter 160 (no bit) refuses. CLOSE on the package natively refuses: the extra Close offer is a disclosed harmless one.
        // enterable 29 = source VEHBIT, carriers exact 7 of 7; native (codex #4771): ENTER chair 62 and forklift 197 move PLAYER 56
        // inside, EXIT returns; ENTER pc 191 (no bit) refuses with the player unmoved.
        // door 25 = source DOORBIT exact; native (r3-claude/doorbit): outside door 84 toggles, elevator doors spring open.
        // locked 19 = LOCKED state (codex lurking-locked19-reconciled-qualified.json, grok2 ACCEPT #4990): padlock 135 and roof door 163 unlock/lock/unlock toggle 19; held assignment unlock refused. No lockable capability.
        // switchable (grok1 #5170 switch2/cache/run-lurking-*): flashlight 132 TURN OFF clears ONBIT 15, TURN ON sets it ("clicks on/off"); crowbar 156 and gloves 203 refuse. Single holdable LIGHTBIT owner on the walk (whole-source exception).
        "activationState": { "onObjects": [132] },
        // moved 6 = TOUCHBIT (native, codex #5183 resume-20261020/moved/packet-lurkinghorror.json): TAKE Coke 58 and carton 61 set bit 6 (ITAKE via SCORE-OBJECT); object 2 stays clear.
        // talkable 31 (seeded-native tier; grok1 packet M): ASK hacker/maintenance man TRUE; chair/floor waxer FALSE -> V-TELL "You can't talk to" (verbs.zil:362-366, 1436-1447).
        // concealed 20 = INVISIBLE (native, claude worker E1 claude-probe/concealed/packet-lurkinghorror-run10.json): bolt cutter 45 unseen inside the urchin until SHOW HAND TO URCHIN drops it (20: 1->0, EXAMINE works); reinforcing rod 231 unseen until REMOVE NEW BRICK WITH CROWBAR (20: 1->0, EXAMINE works); urchin 100 visible with 20 clear.
        "attributeMap": { "open": 13, "isOpen": 13, "container": 27, "supporter": 8, "animate": 31, "on": 15, "transparent": 5, "openable": 2, "enterable": 29, "door": 25, "locked": 19, "moved": 6, "talkable": 31, "concealed": 20 },
        // D232 local globals (claude census + codex #4618/#4621/#4632, grok2 #4637): room GLOBAL property 16 (byte ids),
        // holder LOCAL-GLOBALS 59; native: EXAMINE ROOF DOOR succeeds from TopFloor 195 (prop16 [163]), refused from
        // ComputerRoom 176; Tomb 9 padlock. Room ONBIT 15 positive-only (pzlurking trace TRUE 176/137/33, FALSE + pitch-black
        // reply 140). INVISIBLE 20 (rod 231, examine refused), SEARCHBIT 10 (carton 58 look-in), SURFACEBIT 8, OPENBIT 13.
        // TRANSBIT 5 (grok2 #4642: microwave 86 and smashed cabinet 88 look-through; refrigerator and assignment refused).
        "localScope": { "property": 16, "width": 1, "holder": 59, "roomLitAttribute": 15, "invisible": 20, "searchBit": 10, "surfaceBit": 8, "openBit": 13, "transBit": 5, "contents": "search" },
        // WEARBIT 3 = worn state (codex #4341: gloves 203 and boots 104 natively; crowbar refused).
        "wornAttribute": 3,
        // Identity Wear R3 (four-seat ACCEPTED, PROPOSAL-identity-wear-r3 sha 4a1e90a7): bare WEAR native-proven for these direct-held owners.
        // Lurking Horror gloves 203 / boots 104 (cold-lh-gloves.json, cold-lh-boots.json). Brass hyrax 133 added (PROPOSAL-wear-subdomains-r1: claude + grok ACCEPT; native wear/remove, gloves refusal is the game's own).
        "wearForms": { "objects": [203, 104, 133], "verb": "wear", "scope": "held-direct" },
        // Native i (take all, i; 2026-10-16-hidden-bit-finder.json) tests bit18 TRUE on the pc's mouse 199 and HELP key 107
        // and omits them; FALSE on the printed chair 62, pc 191, assignment 97. Source NDESCBIT 18 exact (72/72). SOLO/SELF-AUDIT.
        "inventoryHiddenAttribute": 18,
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 of a possible 100, in 0 moves. Graded on the curve, you are in the class of Freshman. DIAGNOSE: You are wide awake, and are in good health.",
        // Food, identity owners with authored state-gated actions (codex lurking-food-proposal-r2.md, claude ACCEPT; bit 1
        // FOODBIT is NOT mapped: carton 58 carries it and refuses EAT/DRINK). Fresh native routes, no VM writes
        // (resume-20261020 lurking-snack-heat/hot-native, lurking-coke-quantity-native, lurking-food-missing-native):
        // Funny Bones 18: EAT succeeds at heat prop3 = 12 and sets bit11 (wrapper stays held, no longer edible); refuses at 16
        // ("too hot"), succeeds after cooling to 10. Coke 61: DRINK lowers prop11 5->4->3->2->1, refuses at 1 (empty); its EAT
        // only prints a temperature reply, so no Eat is offered. Chinese food 90: eaten while inside the open (bit13) carton 58
        // held by the player; TAKE refused. Source 51d8060 (whole 16-file audit) corroborates, not an exact-build claim.
        "attributeObjects": { "switchable": [132], "edible": [18, 61, 90] },
        "capabilityForms": { "switchable": ["turn on", "turn off"], "edible": [
            { "objectId": 18, "scope": "held", "actions": [{ "verb": "eat", "clearAttribute": 11, "property": { "id": 3, "size": 2, "min": 0, "max": 12 } }] },
            { "objectId": 61, "scope": "held", "actions": [{ "verb": "drink", "property": { "id": 11, "size": 2, "min": 2, "max": 5 } }] },
            { "objectId": 90, "scope": { "containerObject": 58, "openAttribute": 13 }, "actions": [{ "verb": "eat" }] }
        ],
        // Held unlock tool for the generic "Unlock with..." launcher only (codex R4, claude ACCEPT #4589). Every UNLOCK handler
        // in the module accepts only MASTER-KEY 95 as tool (whole-module search; claude zil-titles/lurking-unlock-domain-source.md,
        // codex lurking-unlock-domain-audit.md); native: held 95 unlocks roof door 163 and padlock 135 (bit 19 clears), held
        // crowbar 156 and assignment 97 refused. No key bit, no success promise, no target restriction, no door/locked map.
        "unlockTools": { "scope": "held", "objectIds": [95] } }
    },
    // Zork I (Infocom v3)
    "0ae5ac229e79094ff368b6669356444af0f35e21d862a1baaa546989085c15fd": {
        // D1 source-proven (r44): inventoryHiddenAttribute 14 = NDESCBIT (tp 52 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 14,
        "inventoryHiddenRecurses": true,
        // D232 local globals, roots only (r3-claude/localscope2 + grok2 registry-ready): property 5, holder 249. Native: Kitchen 203
        // EXAMINE CHIMNEY / WINDOW succeed, Behind House 79 kitchen window, North of House 81 boarded window, Living Room stairs;
        // West of House 180 refuses chimney and window. Lit ONBIT 20 set in those rooms, clear in the dark Cellar 72 ("pitch black").
        // INVISIBLE 7 exact 9 of 9. Zork-era GLOBAL-CHECK never searches inside local globals: no contents key.
        "localScope": { "property": 5, "width": 1, "holder": 249, "roomLitAttribute": 20, "invisible": 7 },
        // ACTORBIT 30: tested TRUE on thief 114 (kill thief) and troll 217; FALSE on egg 87, engravings 97, pedestal 106, wooden door 111, rope 129, railing 134. Observer-captured walk mz3 (seed 3, full 396 steps, no death), object-id keyed, analyzer2. zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // ONBIT 20: LIGHT sets 20 on brass lantern, matchbook, pair of candles; tested FALSE on the lantern before lighting (TURN OFF clears). zil-walk.js native Jericho walkthrough, zil-walk-analysis.json (>=2 distinct non-room/non-player positives + >=1 negative).
        // Native OPEN/CLOSE dispatch (Codex 2026-10-11, owned proof JSON): mailbox 160, sack 224 and
        // bottle 236 test CONTBIT 19, OPEN sets and CLOSE clears OPENBIT 11; OPEN leaflet 161 tests 19
        // false. Initial sack/bottle/table lack 13 but have 19; 13 is mailbox-only, not CONTBIT.
        // SURFACEBIT 10 kitchen table preserved. Surface-aware Open/Close (Codex #3371/#3377):
        // CLOSE TABLE 204 (19 and 10) answers cannot-close, so container-derived Open/Close needs
        // container AND NOT supporter here. Facts stay truthful.
        // FOODBIT 21 (grok1 2026-10-16, zil-inv-hidden-ops @c3f1254 seed 12, step 11): 'eat lunch' tests 225:21 TRUE ("It really hit
        // the spot."); 'drink garlic' 189:21 TRUE ("How can you drink that?"; EAT GARLIC is intercepted by its own handler); 'eat sack'
        // 224:21 FALSE ("I don't think that the brown sack would agree with you."). Full RAM scan (247 objects): only 189 and 225 carry 21. Source FOODBIT 21 exact 2/2.
        // LIGHTBIT 31 = light (claude 7f9c74d + grok1 g1-z1T, 2026-10-17; test_attr recorded only during the named command): lamp/'douse lamp'
        // walk tests brass lantern 164:31 TRUE x5; 'turn on torch' @37 tests torch 104:31 TRUE ("It is already on.": TORCH-OBJECT, 1actions.zil:944-952,
        // does not handle LAMP-ON, so V-LAMP-ON gverbs.zil:786-789 tests FSET? PRSO LIGHTBIT); cold 'turn on' negatives mailbox 160:31 and leaflet
        // 161:31 FALSE ("You can't turn that on."). Source LIGHTBIT = torch, candles, lamp; bounded compiled-table scan (250 objects, ends at
        // first property 3000): bit-31 carriers = {104, 147, 164} = source 3/3. Consumers (#3904 audit, which answers the #3380 capability concern): no map-room effect (1679 blank names only).
        // door 23 = source DOORBIT exact; native (r3-claude/doorbit): kitchen window 235, trap door 183 toggle; front/wooden doors refuse ("cannot be opened": harmless extra).
        // D238 drink owner (grok1 #4859 grok1/drink/zork1.json): WATER 237 in glass bottle 236 is the only non-global DRINKBIT 22
        // object (single owner + whole-source V-EAT DRINKBIT branch: container must be held and open). Native: bottle closed -> "You'll
        // have to open the glass bottle first."; open -> "Thank you very much. I was rather thirsty" and 237 leaves; bottle refused.
        "attributeObjects": { "switchable": [164, 147], "edible": [237] },
        "capabilityForms": { "switchable": ["turn on", "turn off"], "edible": [{ "objectId": 237, "scope": { "containerObject": 236, "openAttribute": 11, "held": true }, "actions": [{ "verb": "drink" }] }] },
            // talkable 30 = the proven animate bit (grok1 2026-10-24, item 4 talkable batch; same mapping as Spellbreaker/Stationfall): talk-command scoped,
            // native, test_attr recorded only during the named command (grok1/talk/talk-probe.json, no relocation): 'troll, hello' @27 tests troll 217:30 TRUE ("The troll isn't much of a conversationalist."), 'tell thief' @260 tests thief 114:30 TRUE ("The thief is a strong, silent type."); 'tell sword' @27 tests sword 110:30 FALSE ("You can't talk to the sword!").
            // Source V-TELL / parser addressing tests this bit and refuses non-actors with "You can't talk to ...".
            // scenery 14 = NDESCBIT (grok1 2026-10-24, user ruling 11:45 ET): native look in Jericho, object directly in room with NDESCBIT set, look omits it, trace shows the listing routine (historicalsource 97b7b3d gverbs.zil:1780 PRINT-CONT) testing NDESCBIT on that object at pc 36719 during that look, examine works. Positives 192:carpet, 204:kitchen table; negative 160:small mailbox (listed, bit clear, same pc). work/investigations/grok1/batch/cache-scenery3 run-zork1.json, judge-scenery.json. Take unaffected (D214 TAKEBIT owns takeable).
        // D239 climbable 24 = source CLIMBBIT exact 9 of 9; native (codex climb-zork-qualified.json): bare CLIMB TREE moves 75 -> 88,
        // CLIMB CHIMNEY from the Studio 94 -> Kitchen 203; mailbox 160 refuses. Bare climb from the Kitchen is a contextual refusal.
        // transparent 12 = source TRANSBIT exact; native (grok1 #5039 grok1/transp/zork1.json): closed glass bottle 236 LOOK IN lists water, closed trophy case 194 takes the contents path; closed brown sack 224 (no bit) "is closed".
            // switchable (grok1 #5162 grok1/switch2): brass lantern 164 TURN ON/OFF toggles ONBIT 20 (LIGHTBIT 31 read 1 each time); candles 147 TURN OFF clears 20 natively (TURN ON asks for a match: native reply); rope 129 (31=0) "You can't turn that on." Torch 104 excluded: it cannot be put out.
            "activationState": { "onObjects": [164, 147] },
        // moved 3 = TOUCHBIT (native, codex #5178 resume-20261020/moved/packet-zork1.json): TAKE leaflet 161 and egg 87 each set exactly bit 3; door 181 stays clear. Also set on opened containers (TOUCHBIT, not custody).
        // concealed 7 = INVISIBLE (native, codex #5239 resume-20261020/concealed/packet-zork1.json): grating 174 (Clearing) and trapdoor 183 (Living Room) read 7=1 and EXAMINE cannot see them; MOVE LEAVES / MOVE RUG clears 7 and EXAMINE then succeeds; mailbox 160 visible with 7 clear.
        // enterable 27 = source VEHBIT exact 1/1 (magic boat 156 is the only carrier: single-owner whole-source exception, Zork3 gold machine / Zork2 crown precedent; tier: seeded-native, g1-batch default zork1 seed 12, G1PLAYER 4, step 217; grok1 z1boat/cache/run-zork1-20261026T094919-72504.json): ENTER BOAT and GET IN BOAT test 156:27 TRUE (pc 35036 V-THROUGH), player 4 -> 156, LOOK "in the magic boat"; GET OUT OF BOAT -> room 33; ENTER LABEL 108:27 and ENTER PUMP 173:27 FALSE at the same pc (joke refusal, parent unchanged).
            "attributeMap": { "container": 19, "open": 11, "isOpen": 11, "supporter": 10, "on": 20, "animate": 30, "talkable": 30, "edible": 21, "light": 31, "door": 23, "enterable": 27, "scenery": 14, "climbable": 24, "transparent": 12, "moved": 3, "concealed": 7 },
        // FAIL-CLOSED (grok1 2026-10-17, A1 of claude #3855; same leak as Enchanter turtle): actors carrying CONTBIT + OPENBIT + ACTORBIT
        // (source: THIEF (1dungeon.zil)) must never get container Open/Close, so the already-proven animate bit joins the none list.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        "command": "score", "fields": ["score.max", "rank"], "replyFamily": "inform-score", "outcome": "line",
        "evidence": "2026-10-05 live SCORE: Your score is 0 (total of 350 points), in 0 moves. / This gives you the rank of Beginner.",
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
        // Inform P1 (two-seat: claude PACKET-library + grok heist layout): Inform 5-era alphabetical attributes, no name table.
        // Measured: container 3 (drawer 18 LOOK IN/OPEN/CLOSE), concealed 2 (yourself, grue), clothing 1 (WEAR CARD tests 74:1=0); door 4 static;
        // light 9 / open 14 / scenery 17 / transparent 23 / worn 26 agree with PROFILE. edible/enterable unmeasured here -> null (fail-closed).
        "attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": null, "enterable": null, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null },
        "statusPair": ["Score", "Moves"],
        "rejectedForms": ["score"],
        "evidence": "2026-10-05 live grid Score: 15 Moves: 0..2 and compact 15/2; SCORE: You have so far scored 0 out of a possible 30, in 1 turn. Game-authored conflict; grid kept, SCORE not asked."
    },
    // heist (Inform 5-era alphabetical attributes, no name table; grok PACKET-heist-1404, claude ACCEPT). Raw ops: container 3 / open 14 (bag 19,
    // frame 124), edible 5 (eat bag), door 4 + enterable 6 (enter bag), concealed 2 (yourself); clothing 1 / female 7 / door 4 by object census.
    // Bits 8-26 equal PROFILE. Visible: Equipment now lists frame 124 + photo 126 inside the bag, matching native i.
    "251a02ace56207ff0b213e942a63732d3be6212c74a8a4e1412aa1c1aa7fb616": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // break-in (Inform 6.05, same alphabetical layout; claude PACKET-break-in, grok heist layout). Raw ops: container 3 (rucksack 46 =1, desk 35 =0),
    // enterable 6 (chair 34 seated), concealed 2 (yourself); door 4 / edible 5 / clothing 1 by object census (front door, gate, carrot, Hat class).
    // Visible: removes "eat/drink chair", restores put in on the rucksack.
    "45da361177da2e073616082377ea37654bb10b8289024833f61e1422dedb6201": {
        "attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // minster (Inform 5-era alphabetical layout; grok PACKET-minster-1407, claude ACCEPT; BASE vs FACT in grok-lane-1031/inform-plan/minster-pageview.txt).
    "41172c8e152229cde7a90aa78b04d2882223c8ba161cc67716a1660e26ea3cd1": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // Enemies (Inform 5-era alphabetical layout; grok PACKET-Enemies-1407, claude ACCEPT; BASE vs FACT in grok-lane-1031/inform-plan/Enemies-pageview.txt).
    "4d054e03616ec2fac3a2dce408ff8007ceff8ff0bde43f504c89dc1bdb12c8be": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // Gumshoe (Inform 5-era alphabetical layout; grok PACKET-Gumshoe-1407, claude ACCEPT; BASE vs FACT in grok-lane-1031/inform-plan/Gumshoe-pageview.txt).
    "3fbd9f00d865302050cca79db955ee34ba2d51f98fcbb650048fa5447dc8f27f": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": null, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // godot (Inform 5-era alphabetical layout; grok PACKET-godot-lists-SoFar-1410, claude ACCEPT; unmeasured/uncarried bits null).
    "1acdf2cc0519c9c96afdfa27d0107820a513de509050f1f23ed1710f30d6ef97": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": null, "enterable": null, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // lists (Inform 5-era alphabetical layout; grok PACKET-godot-lists-SoFar-1410, claude ACCEPT; unmeasured/uncarried bits null).
    "5e9cf5f5077975a461013294da134970ee7afe82a6f0c0121785c1446051cd59": {
        "attributeMap": { "clothing": null, "wearable": null, "concealed": 2, "container": null, "door": 4, "edible": null, "enterable": null, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // SoFar (Inform 5-era alphabetical layout; grok PACKET-godot-lists-SoFar-1410, claude ACCEPT; unmeasured/uncarried bits null).
    "b94c01b794a728806f78a9ab5a2d2ac0fcbe04632206d501848c18c809feba1c": {
        "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": null, "enterable": 6, "female": null, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // wedding (claude PACKET-wedding): Inform 5-era alphabetical layout; LOOK IN / WEAR / EAT test 3/1/5; doors 4, seats 6, women 7.
    "2ab09dc0227163e8cb6916a1a3008dc25ef8698464dd7f3353dcaf1225bb81e5": {
        "attributeMap": { "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // magic-toyshop (claude PACKET-magic-toyshop): alphabetical + one game attribute at bit 4 (door..worn +1). Raw ops: chest container 3 / open 15 /
    // openable 16 / locked 12 / lockable 11 / static 20 / enterable 7; woman animate 0 / female 8; light 10; supporter 21; transparent 24; moved 13.
    // edible 6 / worn 27 from census. worn is read from wornAttribute, not attributeMap (PROFILE 26 = workflag here).
    "7aea509542ba84a805a8c5cb423d3364739f19fa4cf00b1d41d3a058f410a667": {
        "wornAttribute": 27,
        "attributeMap": { "animate": 0, "clothing": null, "wearable": null, "concealed": 2, "container": 3, "door": 5, "edible": 6, "enterable": 7, "female": 8, "absent": null, "general": null, "light": 10, "lockable": 11, "locked": 12, "moved": 13, "on": null, "open": 15, "isOpen": 15, "openable": 16, "proper": 17, "scenery": 18, "scored": null, "static": 20, "supporter": 21, "switchable": 22, "talkable": null, "transparent": 24, "visited": null, "workflag": null, "male": null, "neuter": null, "pluralname": null }
    },
    // theatre (claude PACKET-theatre): alphabetical shifted +2 (two game attributes at 0-1). Raw ops: animate 2, container 5 / open 16 (desk),
    // door 6 (trapdoor), enterable 8, edible 7, scenery 19, static 21, light 11, visited 26, supporter 22, transparent 25; openable 17 / proper 18 census.
    // wornAttribute 28 from the uniform +2 shift (not separately measured; PROFILE 26 = visited here, so leaving it unset would be wrong).
    "0fc8bdbfe929585cd0bb35883f511af5a61053f7fc8dfabdb32c7f10de5b7d80": {
        "wornAttribute": 28,
        "attributeMap": { "animate": 2, "clothing": null, "wearable": null, "concealed": 4, "container": 5, "door": 6, "edible": 7, "enterable": 8, "female": 9, "absent": null, "general": null, "light": 11, "lockable": null, "locked": null, "moved": null, "on": null, "open": 16, "isOpen": 16, "openable": 17, "proper": 18, "scenery": 19, "scored": null, "static": 21, "supporter": 22, "switchable": null, "talkable": null, "transparent": 25, "visited": 26, "workflag": null, "male": null, "neuter": null, "pluralname": null }
    },
    // windhal1 (grok PACKET-offset-windhal1-tube-sutwin-1413, claude ACCEPT): alphabetical +1 with a game bit at 5; live bits 3/4/11/14/19/26; upper bits match theatre.
    "ffdecae479a6e5a4280c695fa67c39a0802005413e7221865fa0aa8ec32eac83": {
        "wornAttribute": 28,
        "attributeMap": { "animate": 1, "clothing": 2, "wearable": 2, "concealed": 3, "container": 4, "door": 6, "edible": 7, "enterable": 8, "female": 9, "general": 10, "light": 11, "lockable": 12, "locked": 13, "moved": 14, "on": 15, "open": 16, "isOpen": 16, "openable": 17, "proper": 18, "scenery": 19, "scored": 20, "static": 21, "supporter": 22, "switchable": 23, "talkable": 24, "transparent": 25, "visited": 26, "workflag": 27, "absent": null, "male": null, "neuter": null, "pluralname": null }
    },
    // tube (grok PACKET-offset-windhal1-tube-sutwin-1413, claude ACCEPT): alphabetical +1 with a game bit at 5; live bits 3/4/11/14/19/26; upper bits match theatre.
    "ede1e3571bc16da5c27ca48f38b95f4afcb2c71da1c6be7d835750f760609c33": {
        "wornAttribute": 28,
        "attributeMap": { "animate": 1, "clothing": 2, "wearable": 2, "concealed": 3, "container": 4, "door": 6, "edible": 7, "enterable": 8, "female": 9, "general": 10, "light": 11, "lockable": 12, "locked": 13, "moved": 14, "on": 15, "open": 16, "isOpen": 16, "openable": 17, "proper": 18, "scenery": 19, "scored": 20, "static": 21, "supporter": 22, "switchable": 23, "talkable": 24, "transparent": 25, "visited": 26, "workflag": 27, "absent": null, "male": null, "neuter": null, "pluralname": null }
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
        // M4: player 30 "Me" sits in globals 21/56, parent 29 Treasure Cave; the room had only been admitted through the travel clause after start-up screens (nov5/M4-yagwad.md).
        "playerGlobal": 21,
        "rejectedForms": ["score"],
        "statusPair": ["Score", "Moves"],
        "evidence": "2026-10-05 live (SPACE, yes, yes) SCORE: You are a perfect 10. Grid compact 10/1 with no tracked stats."
    },
    // Suspended (Infocom v3)
    "6011284a57a6200c4deebfbeae92b3bac2f98a570ddbbc8cfc8bcc382d5b524f": {
        // D1 source-proven (r44): inventoryHiddenAttribute 4 = NDESCBIT (tp 46 fp 0 fn 0); PRINT-CONT/DESCRIBE-CONTENTS withholds the NDESC label but lists its visible contents.
        "inventoryHiddenAttribute": 4,
        "inventoryHiddenRecurses": true,
        // WEARABLEBIT 31 (grok1 2026-10-17; custom route agent-tools/g1-routes.json suspW: Waldo goes to the Middle Supply Room, takes the
        // container and grasper; test_attr recorded only during the named command): 'waldo,install grasper' tests 63:31 TRUE ("It's now
        // being worn.", V-WEAR verbs.zil:1740-1745); 'waldo,install container' tests basket 76:31 FALSE ("An interesting but highly unlikely
        // thought."). Source: WEARABLEBIT is carried ONLY by SURGERY-HAND (objects.zil:393, IN SUPPLIES-MID); bounded compiled object-table
        // scan (191 objects, ends at first property 2527): bit 31 carriers = {63} -> rule-5 single-owner exception + source 1/1.
        // Grok4125 independently audited: native first33/second31 on, third32 off/on; state only, no animate or room rule.
        // moved 12 = TOUCHBIT (native, grok1 #5208 grok1/moved/packet-*.json, source bit read clear -> set on TAKE): robot custody: SENSA, TAKE RAMP / CONTAINER AND GRASPER set 12 on 64, 63 and 76 (parents move to Sensa 152); panel 80 stays clear. No radial effect (take verification only).
        // concealed 13 = INVISIBLE (native, codex #5246 resume-20261020/concealed/packet-suspended.json, robot-specific): Sensa (Gamma) cannot detect flowswitch 61 until EXAMINE CABINET clears 13; Waldo (Sub Supply) cannot detect crushed box 24 until MOVE BROKEN SHELF clears 13; cabinet 62 visible with 13 clear.
        // container 19 = CONTBIT (source exact 13/13; native r45 claude-probe/r45/run-suspW-*): sensa,look in home 81 and waldo,look in cabinet 62 test 19=1 ("The electrical column is closed." / "The hollow object is closed."), whiz,look on groove 45 19=1 (contents listed); sensa,look in ramp 64 tests 19=0 ("I don't know how to look inside a dens..."; run-suspended-20261030T160739). Robots (VICBIT 24) also carry 19+8: they hold items.
        // supporter 11 = SURFACEBIT (source exact 3/3): waldo,look on blt 37 11=1 ("There is nothing on the walkway."), whiz,look on groove 45 11=1 ("Sitting in the groove are..."); waldo,close cabinet 62 11=0 and sensa,close poet 146 11=0.
        // open/isOpen 8 = OPENBIT (source exact 6/6): BLT 37 and groove 45 test 8=1 on look on/in; cabinet 62 8=0 ("It's already closed."), HOME 81 8=0 ("The electrical column is closed.").
        // openCapability FAIL-CLOSED (r45): no CONTBIT carrier accepts container Open/Close natively: waldo,open cabinet 62 "I don't detect any easy way to do that",
        // waldo,close blt 37 / whiz,close groove 45 "Not a likely occurrence within reality, no?", sensa,close poet 146 "I don't think he would like that" (robots carry 19+8, VICBIT 24 unmapped).
        // animate is unmapped, so the none-list fails closed (#3642 pattern): container keeps search/look-in, never Open/Close.
        "openCapability": { "all": ["container"], "none": ["supporter", "animate"] },
        // enterable 28 = VEHBIT, singleton CAR 58 (four-seat ACCEPT, PACKET-suspended-enterable.md sha e290bc20): BOARD OBJECT (FIND VEHBIT) = V-BOARD; ENTER OBJECT = V-THROUGH -> PERFORM V?BOARD on VEHBIT. Native: poet, enter car TRUE (58 has 28; "I am now in the carriage"); scoped negatives. Robot-only vehicle: board is offered via D8 actorAddressing forms.
        "attributeMap": { "wearable": 31, "on": 2, "moved": 12, "concealed": 13, "container": 19, "supporter": 11, "open": 8, "isOpen": 8, "enterable": 28 },
        // WEARBIT 15 = worn (grok1 2026-10-17, route suspW): grasper 63:15 FALSE before 'waldo,install grasper', TRUE after; 'waldo,detach grasper'
        // tests 63:15 TRUE x3 ("It's been removed."); 'waldo,remove container' tests basket 76:15 FALSE (agent-tools/g1-suE.json). Single owner:
        // the only runtime FSET is V-WEAR (verbs.zil:1745), gated on WEARABLEBIT = SURGERY-HAND only; the bounded boot scan carrier {191} is
        // GLOBAL-OBJECTS (globals.zil:14-16, the flag-list pseudo object, never in inventory).
        "wornAttribute": 15,
        // D8 P8 actorAddressing (codex d8-addressed-source-r1 robot-domain.json, oct30-recovery): the game's own robot table at 8182
        // (global G183 = NAME-TBL, source globals.zil) lists [158 Iris,155 Waldo,152 Sensa,149 Auda,146 Poet,144 Whiz] then 140 People
        // (excluded; VICBIT 24 alone admits 14 incl. global proxies, rejected). Names are each robot's short name, verified as its own
        // parser word and a dictionary word. G114 = linked robot (orders first). Rooms are children of ROOMS 189. Bare verbs fail
        // ("Visual scanners cannot see..."); addressed forms are the game's command form. Native: work/investigations/suspended-d14/p8-native.
        "actorAddressing": { "robots": [158, 155, 152, 149, 146, 144], "form": "<name>, <command>",
            "nameTable": { "global": 183, "address": 8182 }, "linkedGlobal": 114, "roomsHolder": 189 },
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
        // M5: after NEW the player 37 "(StandardPlayer)" sits in globals 20/55, parent 51 Verb Guessing Booth; resolver picked parentless 20 "(self object)" so M09 refused the room (nov5/M5-guess.md).
        "playerGlobal": 20,
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

// D280 / I7 (grok2 ACCEPT #6240): attribute layouts for no-name-table Inform titles, proven from each game's own
// object table (library anchors: compass concealed, walls scenery, yourself animate/concealed/proper/transparent,
// rooms light; door/container/clothing/food/supporter exemplars). Evidence: work/investigations/inform-all/.
// Fills only flags an entry does not already state; an existing different value is kept and reported.
(function (facts) {
    var L = { animate: 0, clothing: 1, wearable: 1, concealed: 2, container: 3, door: 4, edible: 5, enterable: 6, light: 9,
        lockable: 10, locked: 11, on: 13, open: 14, isOpen: 14, openable: 15, proper: 16, scenery: 17, static: 19,
        supporter: 20, switchable: 21, transparent: 23 };
    function shift(base, by, from) { var m = {}; for (var k in base) m[k] = base[k] + (base[k] >= from ? by : 0); return m; }
    var TOY = shift(L, 1, 4);
    var LAYOUTS = { L: [L, 26], TOY: [TOY, 27], WIN: [shift(TOY, 1, 0), 28], TH: [shift(L, 2, 0), 28], L10: [shift(L, 10, 0), 36] };
    var TITLES = {
        "76ceb0777c42378f6a787a3f8d6d5475d11f32630cb123eeedc92b820ffc57c3": "TH", // claw
        "931b0be04ed43ca9791a809d567cba7ee27dc027f44a603f27e6180df938cf51": "WIN", // inhumane
        "79c13cc1b0de63630290856760f39ac93485e90b9c7bc237962ca631cb161203": "TOY", // tk1
        "9038c8045d4fc53892901315db98ebc2e36df37b5ea468e1723d6cbacec906d2": "TOY", // weather
        "dd3e03151624d55e053530f40e70bd58ecc3588842ee274d4bbd3a9eb7cb8502": "L10", // tatctae
        "ca19b493a8190382a95b15c7645480ef467207ecaa0b446525f0328b89996777": "L", // Adventureland
        "ba22783cbe996dd2f8c44f0e6206a31b2bb87a5b01ff2c58ed63b545fea76c7b": "L", // b2demo
        "c061ce09ac551078bdc21ea8580c0d049bd2ea0798f773fae5daba3d826d3fb6": "L", // bedlam
        "e571f398af533fb176522be30314c4d8b3daabdc11b92f0115f09142114b8ee5": "L", // booth
        "45da361177da2e073616082377ea37654bb10b8289024833f61e1422dedb6201": "L", // break-in
        "13d210f12f373c2617353d2caffaec6150975963218af767940c86931322a943": "L", // bse
        "b1584df5bb0c6f7ae3ea3092ef03148ea64a73be1ec6a9680a418364a2c18d0d": "L", // cheater
        "330100bf1c1ab8ed64065ceb58145ebb87cb6faef5b331fbc6684be4f14fe7da": "L", // curses
        "4d054e03616ec2fac3a2dce408ff8007ceff8ff0bde43f504c89dc1bdb12c8be": "L", // Enemies
        "4afe11ed7de6d65678ea4ebeb08c4757762d101a3ec636ad1650766293ac8be9": "L", // frozen
        "1acdf2cc0519c9c96afdfa27d0107820a513de509050f1f23ed1710f30d6ef97": "L", // godot
        "3fbd9f00d865302050cca79db955ee34ba2d51f98fcbb650048fa5447dc8f27f": "L", // Gumshoe
        "251a02ace56207ff0b213e942a63732d3be6212c74a8a4e1412aa1c1aa7fb616": "L", // heist
        "bf8b6f2e3f01cf4312129e0585809358df938d14c4fc4eb308daa86b3df5dc0d": "L", // I-0
        "1776c051db9cc3ceccd876e0cc8808188494db06957c231a9f27bc61e3f16fcf": "L", // Jigsaw
        "99cfd10988a2307c9cfbe17d0ac34f5d430d2086f2666355274e1c39c35dc1d0": "L", // karn
        "b3665eaf5e30520355a1f07657ffbd69e967ecb53942f86913d044e65fa30e11": "L", // library
        "5e9cf5f5077975a461013294da134970ee7afe82a6f0c0121785c1446051cd59": "L", // lists
        "9ad23948fdf8c4c4f72fadbe1818b4f17fc50dbf9d8fc81312ba9c4e44dc2ddb": "L", // lost
        "41172c8e152229cde7a90aa78b04d2882223c8ba161cc67716a1660e26ea3cd1": "L", // minster
        "134081ad18cf4c0fd643af8e7cd9a620955e45104ea4e1a96f70bb79745617d4": "L", // night
        "6a39aa258e1cdcdfeb85b2e41f40f1ddba169aad6dfdb38971e7af96666f44a4": "L", // ninepts
        "7bb622d1c5c65954361c49bf2522621cfd27af7ddf4a7f1041c286f1b0f57756": "L", // phlegm
        "97e0c1bb2792fe70540e64709d0e0fd2cca5edebf9414758f032dcf0d5e39628": "L", // piece_v3
        "a9528b18c7b9557a356d9ea3bb09924be218d4322ca6416748b89b02864dd3a5": "L", // Slackerx
        "b94c01b794a728806f78a9ab5a2d2ac0fcbe04632206d501848c18c809feba1c": "L", // SoFar
        "258199e5fb7b494d3c6e60cc4fbe466b08f729e90a06753db49f4af7bfdca2d5": "L", // spirit
        "1bd61b11ec4075e5f6bff397c77e89032f866e08dd7a7cdd6e7b9f562da80072": "L", // vindaloo
        "2ab09dc0227163e8cb6916a1a3008dc25ef8698464dd7f3353dcaf1225bb81e5": "L", // wedding
    };
    // dejavu.z3 (I7 z3): grok bytecode (INSERT/OPEN/CLOSE/WEAR/REMOVE/light-list sites, inform-all/grok-batch.md) and grok2 bits-v3 object table
    // (inform-all/Z3 cross-check #6261) agree: container 8, open 10, openable 11, animate 4, light 0, worn 2 (opcode). supporter unproven -> absent.
    if (!facts["64bb01746966c2280185a56aa6e641b65fe0353dc28a2ac1b178194aad25e006"]) facts["64bb01746966c2280185a56aa6e641b65fe0353dc28a2ac1b178194aad25e006"] = {
        wornAttribute: 2, attributeMap: { container: 8, open: 10, isOpen: 10, openable: 11, animate: 4, light: 0 } };
    facts.__d280Conflicts = [];
    Object.keys(TITLES).forEach(function (digest) {
        var lay = LAYOUTS[TITLES[digest]], e = facts[digest] || (facts[digest] = {}), map = e.attributeMap || (e.attributeMap = {});
        Object.keys(lay[0]).forEach(function (k) {
            if (map[k] === undefined || map[k] === null) map[k] = lay[0][k];
            else if (map[k] !== lay[0][k]) facts.__d280Conflicts.push(digest.slice(0, 12) + " " + k + " kept " + map[k] + " (layout " + lay[0][k] + ")");
        });
        if (!Number.isInteger(e.wornAttribute)) e.wornAttribute = lay[1];
        else if (e.wornAttribute !== lay[1]) facts.__d280Conflicts.push(digest.slice(0, 12) + " worn kept " + e.wornAttribute + " (layout " + lay[1] + ")");
    });
})(ModuleStatFactsClaude);
if (typeof module !== "undefined" && module.exports) module.exports = ModuleStatFactsClaude;
