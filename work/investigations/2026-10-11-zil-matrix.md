# ZIL matrix (attribute rows; static drafts only, R3.4)

Order: GameList runtime (alphabetized). `n` = static draft bit (needs native proof), `-` = unknown (reason in JSON). takeable = derived (D214), other PROFILE keys unknown unless listed.

| Title | class | container | open | transparent | door | supporter | animate | talkable | edible | light | on | enterable | wearable | worn | locked | drafted |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ballyhoo | zil | 17 | 15 | 13 | - | - | 31 | 31 | - | - | - | 30 | - | 20 | 10 | 8/14 |
| Borderzo | zil | 36 | 34 | 43 | - | - | - | - | - | - | - | - | 41 | 39 | - | 5/14 |
| Cutthroats | zil | 11 | 21 | 25 | - | - | - | 23 | 23 | 26 | - | - | 18 | - | - | 7/14 |
| Deadline | zil | 21 | 28 | 22 | - | - | - | 20 | 5 | 20 | - | 19 | - | - | - | 7/14 |
| Enchanter | zil | 21 | 12 | 10 | 24 | 14 | - | - | - | 22 | 8 | - | - | - | - | 7/14 |
| Hitchhik | zil | 23 | 39 | 33 | - | - | - | 42 | - | 35 | - | 28 | 25 | 24 | - | 8/14 |
| HollywoodHijinx | zil | 27 | 25 | 23 | - | - | 18 | 18 | - | 3 | 20 | 8 | 22 | 14 | 15 | 11/14 |
| Infidel | zil | 20 | 25 | 9 | - | 28 | - | 6 | 7 | 11 | - | - | 22 | - | - | 8/14 |
| LeatherGoddessesofPhobos | zil | 17 | 15 | 24 | - | - | - | 31 | 31 | 31 | 30 | 29 | 20 | 21 | - | 10/14 |
| Moonmist | zil | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 0/14 |
| Planetfall | zil | 24 | 11 | 26 | - | - | 31 | - | - | 21 | 5 | - | 22 | 12 | - | 8/14 |
| PlunderedHearts | zil | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 0/14 |
| Seastalker | zil | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 0/14 |
| Sherlock | unknown | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 0/14 |
| Sorcerer | zil | 24 | 15 | 27 | 5 | 17 | - | 31 | - | 25 | 11 | - | 21 | - | - | 9/14 |
| Spellbreaker | zil | - | 21 | 15 | - | - | - | 31 | - | - | - | - | - | - | - | 3/14 |
| Starcross | zil | 8 | 9 | 12 | - | - | - | 11 | - | 2 | 18 | - | - | - | - | 6/14 |
| Stationfall | zil | 17 | 15 | 13 | - | 29 | 31 | 31 | - | 24 | 26 | 27 | 20 | 21 | - | 11/14 |
| Suspect | unknown | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 0/14 |
| Suspended | zil | 28 | 8 | 6 | - | - | - | - | - | - | 2 | - | 31 | 15 | - | 6/14 |
| TheLurkingHorror | zil | - | 13 | 5 | - | - | - | 31 | 1 | - | - | - | 3 | - | - | 5/14 |
| TheWitness | zil | 9 | 8 | 28 | - | - | - | 31 | 26 | 31 | - | 28 | - | - | 17 | 8/14 |
| Wishbringer | zil | - | 20 | - | - | - | - | - | - | - | - | - | - | - | - | 1/14 |
| Zork1-TheGreatUndergroundEmpire | zil | 19 | 11 | 12 | 23 | 10 | 30 | 30 | 21 | 31 | 20 | - | 0 | - | - | 11/14 |
| Zork2-TheWizardofFrobozz | zil | 18 | 11 | 7 | 22 | 8 | 30 | 30 | 20 | 31 | 19 | - | 3 | - | - | 11/14 |
| Zork3-TheDungeonMaster | zil | 10 | 12 | 30 | 9 | 26 | - | 11 | 5 | 19 | 15 | - | 4 | - | - | 10/14 |

# Per-item rules entries (operator rule: each key and each title passes the full rules list before work)

## Keys

### container
- Prior attempts/locks: D25 sourced bits; c33f396/5ec4c95 Zork I map (13 under review -> 19); 1e54a58 fail-closed; D148 held containers (Enchanter); R2.4 container != openable
- Existing system: AttributeSchema.bitFor -> attributeMap fact
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: static rule + live: object with children shows contents after OPEN; d31 nested inventory unchanged
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### open
- Prior attempts/locks: c33f396 (open 11 Zork I); 1e54a58; D73 allowedVerbs learner owns offered verbs (R2.4)
- Existing system: attributeMap open/isOpen
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: native transition: bit flips on OPEN and clears on CLOSE of a real object (Codex proved Zork I mailbox)
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### transparent
- Prior attempts/locks: none specific; D148 visibility of closed containers
- Existing system: attributeMap transparent
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: static rule + live: closed transparent container contents visible; D148 harness
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### door
- Prior attempts/locks: D61/D134 + Z1-R1: doors never become route destinations; ExitCalibrator owns exits (R2.1)
- Existing system: attributeMap door (object semantics only, never exit authority)
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: static rule + live OPEN/CLOSE of a door object; map gate unchanged
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### supporter
- Prior attempts/locks: 5ec4c95 SURFACEBIT 10 Zork I (live-proven)
- Existing system: attributeMap supporter
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: PUT ON PRSI test + live: items on table underlined
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### animate
- Prior attempts/locks: D204/D205 Yourself; hasConfirmedFlag animate (observedPossessions); D214 P1 possession
- Existing system: attributeMap animate (AttrCalibrator.hasConfirmedFlag still checked)
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: ATTACK precondition + live: actor attack/talk reply; possessions only when animate trusted
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### talkable
- Prior attempts/locks: R3.1: separate from animate, no derivation
- Existing system: attributeMap talkable
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: TALK/ASK/TELL precondition + live conversational reply
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### edible
- Prior attempts/locks: ActionSynth SEMANTIC_FLAGS
- Existing system: attributeMap edible
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: EAT precondition + live eat of food object (save/undo isolated)
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### light
- Prior attempts/locks: DarkScope darkness; M11 fail-closed (804af63)
- Existing system: attributeMap light
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: LIGHT precondition + live: lamp is light source; DarkScope unchanged
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### on
- Prior attempts/locks: DarkScope
- Existing system: attributeMap on
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: set by LIGHT, cleared by EXTINGUISH, live flip
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### enterable
- Prior attempts/locks: MapTopology posture verbs; vehicles
- Existing system: attributeMap enterable
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: BOARD/ENTER precondition + live board of vehicle
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### wearable
- Prior attempts/locks: D59 wear/remove radial; equipment (applyEquipmentState)
- Existing system: attributeMap wearable/clothing
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: WEAR precondition + live wear
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### worn
- Prior attempts/locks: R2.5: owned by wornAttribute fact path (wornBitFallback/wornOwnedAboveCalibration); existing facts HHG 24, Border Zone 39, Planetfall 12
- Existing system: fact wornAttribute (NOT attributeMap)
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: WEAR set + TAKE OFF clear + live flip; matches existing facts where present
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### locked
- Prior attempts/locks: per-object LOCK routines in most titles
- Existing system: attributeMap locked
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: LOCK set / UNLOCK clear + live
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### takeable
- Prior attempts/locks: D214 d214TakeAttribute; R3.2 objectOverrideFor wins last
- Existing system: derived (not mapped)
- Isolation: fact keyed by executable digest AND D198 confirmed-zil-family/validated (R2.7); Inform/Glulx/custom untouched; unknown never clears another provider.
- Proof: no new work
- Regression controls: seeded gate ZIL+Inform Z+Glulx 0 unintended diffs, operator-regressions 0 FAIL, d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix.

### All other PROFILE keys (absent concealed general lockable moved proper scored scenery static switchable visited workflag male female neuter pluralname)
- Prior: D25 (no name inference), 1e54a58 fail-closed. System: bitFor -> null on ZIL. Isolation as above. Proof: none possible from generic verb routines, so they stay UNKNOWN with a reason in the JSON. Controls: as above.

## Titles (frozen order, R3.5)

### Ballyhoo.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no prior ZIL facts. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var122, prsi=var214) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Borderzo.z5.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: existing facts playerGlobal 186, inventoryHiddenAttribute 29, wornAttribute 39 (matrix worn 39 agrees). v5 bit range < 48. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var118, prsi=var222) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Cutthroats.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no prior facts. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var184, prsi=var185) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Deadline.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: D167/D204 headless stats; mystery group. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var191, prsi=var192) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Enchanter.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: D148 held containers (d31 harness), D184 unnamed objects; must not regress d31. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var117, prsi=var218) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Hitchhik.z5.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: wornAttribute 24 (matrix agrees); M11 dark bed (804af63 fail-closed); M09 ZIL boot admission (1d494a6). (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var90, prsi=var174) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### HollywoodHijinx.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no prior facts. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var85, prsi=var164) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Infidel.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Codex #3289: trunk shows open=true while native padlock holds shut, so open rows need native proof per object (R2.4). (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var135, prsi=var136) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### LeatherGoddessesofPhobos.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: #3265: LGOP false open/close on body parts under PROFILE; rows talkable/edible/light all 31 = SUSPECT generic first test. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var128, prsi=var226) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Moonmist.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no OPEN/CLOSE-derived rows: all unknown. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=?, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Planetfall.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: wornAttribute 12 (matrix agrees); Codex: uniform pocket refuses OPEN (R2.4). (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var198, prsi=var199) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### PlunderedHearts.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no rows derivable: unknown. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=?, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Seastalker.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: inventoryHiddenAttribute 17; no rows derivable. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=?, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Sherlock.z5.js
- Classification: unknown/rejected
- Prior attempts/locks: classification unknown (invalid-dictionary): no facts; classifier resolution is Codex-owned. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=?, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Sorcerer.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Enchanter trilogy. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var104, prsi=var194) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Spellbreaker.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: control-flow analyzer finds NO container; the earlier draft 27 is withdrawn. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var118, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Starcross.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: no prior. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var101, prsi=var35) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Stationfall.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Planetfall pair; differs from Planetfall, so no group sharing. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var119, prsi=var216) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Suspect.z3.js
- Classification: unknown/rejected
- Prior attempts/locks: classification unknown (unvalidated-grammar-family); inventoryHiddenAttribute 19 + preservesWorn; b45d4a8 Q0 CustomPlayer inventory. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=?, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Suspended.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Grok #3268: multi-body player; player row needs per-body proof. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var143, prsi=var144) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### TheLurkingHorror.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: control-flow analyzer finds NO container; the earlier draft 27 is withdrawn. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var115, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### TheWitness.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Grok #3268: G1=20 is a white wire, not the player; reverted Q0 INV learner (e988c98 -> 12c35d6). talkable/light both 31 = SUSPECT. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var135, prsi=var136) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Wishbringer.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: only open derivable. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=const187, prsi=?) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Zork1-TheGreatUndergroundEmpire.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: c33f396/5ec4c95 shipped map; Codex #3287 native evidence: container 19, open 11, supporter 10. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var134, prsi=var135) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Zork2-TheWizardofFrobozz.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Zork group; bits differ from Zork I, so no group sharing. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var159, prsi=var160) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys

### Zork3-TheDungeonMaster.z3.js
- Classification: confirmed-zil-family/validated
- Prior attempts/locks: Zork group; bits differ. (git grep of investigations/docs and git log done)
- Existing systems: ModuleStatFactsClaude digest entry (attributeMap / wornAttribute / playerGlobal / inventoryHiddenAttribute); D198; D214; AttrCalibrator
- Isolation: digest + validated ZIL gate; no Inform/Glulx/custom impact
- Proof: per-key static draft + PRSO/PRSI live proof (prso=var186, prsi=var187) + native transitions on a reachable object + tree corroboration
- Regression controls: per batch, as listed under Keys
