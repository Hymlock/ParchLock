# R3 (2026-10-11 ~11:55 ET): Codex #3294 corrections and #3295 census. Overrides R2/R1 where they conflict.

R3.1 talkable is NOT derived from animate (#3294 1). AttributeSchema keeps distinct `talkable` and `animate`, and ActionSynth.SEMANTIC_FLAGS uses both. Animals and enemies are animate but not conversational. talkable is proven separately (native TALK/ASK/TELL evidence) or stays unknown. There is no animate => talkable derivation anywhere. R2.6's "talkable from animate" is withdrawn.

R3.2 takeable final winner (#3294 2). Order in AttributeSchema.applyTo: static/scenery derivation -> D214 `GrammarProvider.d214TakeAttribute` (ZIL TAKE FIND bit) -> D73 bit overrides -> **`AttrCalibrator.objectOverrideFor(id).takeable` wins last** (AttributeSchema.js ~236-243, an observed take or refusal of THIS object) -> applyEquipmentState. No attributeMap takeable.

R3.3 Snapshot validation (#3294). Mutable globals and fact-derived values (player, location, status) are validated on EVERY collected snapshot, not only after UndoRestoreSync/restore. An ordinary turn can mutate them.

R3.4 Exhaustive matrix before product GO (#3294). The matrix is generated DURING research and is a precondition for any product proposal. Per title: classification, every row, value or unknown + reason. Output: work/investigations/2026-10-11-zil-matrix.json + .md. No blanket GO: every product change needs an exact proposal plus Codex adversarial review.

R3.5 Fixed order and set (#3295 + orchestrator, frozen). Order = GameList RUNTIME order (alphabetized by GameList initialization), over the 24 D198 confirmed-zil-family/validated titles plus Sherlock.z5.js (unknown/rejected: invalid-dictionary) and Suspect.z3.js (unknown/rejected: unvalidated-grammar-family). Those two are researched and recorded with unknown reasons; a separate classifier-resolution proposal is Codex's; no bypass or false ZIL promotion. dejavu (confirmed-inform) and Moonglow (confirmed-inform) are excluded.

R3.6 Ownership. Codex: classifier resolution (Sherlock/Suspect) and the STATUS rows (StatTracker fields, units, samples). grok2: attribute rows and object-key rows (PROFILE keys, payload object keys, player/location/inventory/worn/hidden/darkness).
# R2 (2026-10-11 11:50 ET): Codex #3292 NO-GO findings applied. R2 overrides R1 below wherever they conflict.

R2.1 Exits (finding 1). R1's "no static exit decode" was stale. **Z1-R1 decoded ZIL exit hints exist and are accepted** (ARCHITECTURE_UML "Z1-R1 decoded ZIL exit hints (D214 extension)"; PRODUCTION_PLAN Z1-R1 amendment; ExitCalibrator.js ~95-191). They are hints only: they may make rooms visible, but unwalked exits stay out of the route graph until state-delta evidence. This plan preserves that path unchanged. Locked: invented route authority, inverse edges, and actor/door objects as destinations. Exits are not re-decoded here.

R2.2 Classification (finding 2). The ZIL set is NOT "isInformCompiled = false". It is the existing D198 classification: `confirmed-zil-family` + `validated` per executable. **dejavu.z3.js is excluded** (isInform=false, but decodeD198 = confirmed-inform/validated, reason inform-compass-dictionary-layout); it is recorded as a classification exception, and no ZIL facts are applied to it. Moonglow is confirmed-inform (excluded). The fixed list is the GameList titles whose D198 result is confirmed-zil-family/validated, in GameList order; every other title is listed with its classification and reason.

R2.3 Proof must be native, not first-match (finding 3). Analyzer requirements before ANY fact:
 a. exact action-table linkage, proven (action count from D198, preaction table boundary checked);
 b. PRSO/PRSI globals PROVEN, not guessed (the global written by the parser for the direct and indirect object, cross-checked live: after `open X`, the global holds X's object number);
 c. instruction boundaries and branch paths followed by control flow (no linear sweep over unreachable bytes), with branch polarity retained per test;
 d. a native before/after transition live (bit flips on the real object under the real verb), or a native static consumer semantic for keys that never flip.
 The tree check (most-common-parent is NOT proof of ROOMS) is corroboration only.

R2.4 Container != openable (finding 4). Bits describe state, not capability. Planetfall uniform and Enchanter book are container/open but natively refuse OPEN/CLOSE; Infidel trunk shows open=true while the padlock holds it shut. The plan does NOT promise operative Open/Close on every container. `openable`/`lockable` are mapped only with native transition evidence; special objects stay whatever their native behavior proves. The D73 allowedVerbs learner remains the source of offered verbs after use.

R2.5 Precedence (finding 5), stated per key and preserved:
 - worn/isWorn: declared I6 names > fact `wornAttribute` > AttrCalibrator.learnedWornBit > (Inform only) PROFILE; `wornOwnedAboveCalibration` stops calibration overwriting it. attributeMap does NOT carry worn.
 - takeable: owned by D214 `GrammarProvider.d214TakeAttribute` (the TAKE syntax FIND bit) on ZIL; NOT mapped.
 - all other PROFILE keys: declared names > attributeMap fact > ZIL fail-closed null (1e54a58) > Inform-only PROFILE; then D73 calibrator object overrides apply in applyTo as they do today.
 - equipment: applyEquipmentState (measured) unchanged.

R2.6 Exhaustive matrix (finding 6). The coverage table has one row for every PROFILE key (33), every payload key (playerId, roomId/roomName, inventory, discoveredObjects, unnamedCandidates, darkness/darkEvidence, exits, probe), every fact key, and every stat field present in facts. Each row records: consumer(s), owning existing system, ZIL source or "derived" or "unsupported", and a value per title or unknown + reason. Derived keys (takeable, talkable from animate, aliases/vocabulary) say derived and never get a bit. Also listed as existing consumers: object vocabulary / command references (D145), and nested closed-container visibility (D148, d31-nested-inventory).

R2.7 Isolation (finding 7, operator: new systems must not break other games). Every new fact is gated by executable digest AND D198 confirmed-zil-family/validated. Bit numbers are bounded by version (v3 < 32, v4+ < 48). Globals and mutable data are validated per UndoRestoreSync generation and after restore. Unknown never clears a value proven by Inform/Glulx/custom providers. The seeded gate's Inform Z and Glulx controls must show 0 differences.

R2.8 Status (finding 8). Status keeps source and units (e.g. Planetfall's clock is not turns; the v3 header time flag decides). Hidden probe lifecycle and continuations are preserved. Numeric facts need a same-generation RAM proof with a negative sample and a change sample (value changes when the game changes it), never a one-off coincidence.

R2.9 Efficiency (finding 9). Tests are risk-targeted. The full seeded gate and operator-regressions run once per batch commit, not per draft.

R2.10 Status of the 10-title draft. Codex found native support for Zork I (OPEN set 11 / CLOSE clear 11 / PUT IN test 19 / PUT ON test 10; container 19 over mailbox-only 13). The other nine titles' polarity is not established. The draft stays uncommitted input until it meets R2.3.

R2.11 Tooling note. Codex reported that new-path claims fail with claim_path_missing (400) (#3287). New files are proposed inline or in Codex's claimed audit file until that is fixed.
# Doc check: full ZIL decode (everything the app decodes for Inform/Glulx), 2026-10-11

Author: Parchmap-main Repo (Grok Bot), orchestrator on grok2 (not Claude). Status: PLAN ONLY. Nothing below is committed product work.
The uncommitted 10-title open/container attributeMap draft (js/ModuleStatFactsClaude.js working tree, `zil-attr-*.js`, `2026-10-11-zil-attr-drafts.json`) is INPUT to this plan, not the plan.

## 1. Existing-system search (done first)
I searched with `git grep` across js/, docs/, PRODUCTION_PLAN.md, DECISION-INDEX and work/investigations for: attributeMap, bitFor, PROFILE, AttrCalibrator, confirmed-zil-family, playerGlobal, wornAttribute, inventoryHiddenAttribute, measuredLocation, statusPair, StatTracker fields, ExitCalibrator, test_attr/set_attr. These systems already exist, and every item below plugs into one of them:

| System | File | What it owns |
|---|---|---|
| AttributeSchema.bitFor / applyTo | js/AttributeSchema.js | every per-object flag key (PROFILE). Precedence: declared I6 names > per-digest `attributeMap` fact > (ZIL: fail closed, 1e54a58) > I6 PROFILE (Inform only) |
| Per-digest facts registry | js/ModuleStatFactsClaude.js | attributeMap, wornAttribute, inventoryHiddenAttribute, playerGlobal, measuredLocation, statusPair, statusTurnsMetric, scoreAliasField, fields, mapStorage, rooms/dirs, equipmentState, objectUseVerb. **The only registry. No second one (D198 lock).** |
| AttrCalibrator (D73) | js/AttrCalibrator.js | after-use learning from live opcodes (allowedVerbs, learned bits). Stays the runtime learner. Static facts never overwrite its confirmed overrides. |
| D198 GrammarProvider | js/GrammarProvider.js | ZIL grammar: verbs, prepositions, syntax lines, action numbers, FIND bits |
| D214 take bit, D148 held containers, D184/D190 promoted objects | Actionable / AttrCalibrator | takeable and unnamed-object handling |
| ZRamReader | js/ZRamReader.js | object tree, attrs, shortName, player/location reads, isInformCompiled |
| StatTracker (D204) | js/StatTracker.js | status line (v3 score/moves or time), probes (score/rank/health...), module stat facts |
| ExitCalibrator (D134), MapTopology | js/ExitCalibrator.js | exits. **Locked: no static exit decode (D61/D134).** |
| DarkScope | js/DarkScope.js | darkness / light evidence |

## 2. The full list (enumerated from code with tmp/enum.js, all `attrs.X`, PROFILE, payload keys, fact keys and stat fields)

A. Per-object attribute keys (AttributeSchema.PROFILE + `attrs.*` callers):
animate, absent, clothing/wearable, concealed, container, door, edible, enterable, general, light, lockable, locked, moved, on, open/isOpen, openable, proper, scored, scenery, static, supporter, switchable, talkable, transparent, visited, workflag, worn/isWorn, male, female, neuter, pluralname, takeable.
Callers that actively branch on them: absent animate clothing concealed container door edible enterable isOpen isWorn light locked open scenery static supporter takeable talkable transparent wearable worn (+ hasConfirmedFlag animate, container).

B. Player and world (payload / facts): playerId (+ fact `playerGlobal`), roomId/roomName (+ `measuredLocation`), inventory (+ `inventoryHiddenAttribute`, `wornAttribute`), discoveredObjects, unnamedCandidates, darkness/darkEvidence (light), exits (LOCKED to ExitCalibrator), actors (animate/talkable).

C. Status (StatTracker + fact keys): v3 status line score / moves or time (header Flags1 bit 1), score.max, rank (`rankReplyPattern`), turns (`statusTurnsMetric`), `statusPair`, `scoreAliasField`, plus module fields measured in facts: health, damage, experience(.max), magic, life, time, date/day, progress, value, treasures, tasks.max, quota.max, holiness(.max), temptations.max, locations.max, odds, certainty, keys seen/turned, and others listed in `fields`.

## 3. Prior attempts and locks per item

| Decision | What it says | Effect on this plan |
|---|---|---|
| D25 | attributes from a documented, sourced bit profile read from real VM bits; never from names | allowed: per-title maps sourced from the story's own bytecode, with evidence |
| D34 -> D73 | grammar/opcode work; D73: zvm opcodes are live-patchable, after-use learning | D73 stays the runtime learner. Static analysis is offline only, producing facts |
| D58 | I6 schema right for wump2ka (Inform) | no change for Inform |
| D61, D134 | exit scanning was Inform-only; ZIL exits by ExitCalibrator; **no static exit decode** | exits OUT OF SCOPE (locked) |
| D145 (D142-D145) | vocabulary, text decoding, verb trust across compilers | no change; reuse |
| D148 | held containers whose bits do not decode (Enchanter) | keep; a map must not regress d31-nested-inventory |
| D184/D186/D190 | unnamed objects; declared-attribute query (Inform); take gated by declaration | ZIL has no declared names, so maps are the declaration substitute; keep fail closed |
| D198 | ZIL capability through EXISTING systems; no second registry | facts go into ModuleStatFactsClaude only |
| D204 | statistics discovery and event monitoring (Zork1, deadline, Enchanter) | status for ZIL already partly covered; measure per title, no new tracker |
| D214 | underlines follow words; take bit | takeable via the existing D214 path; map only where D214 lacks evidence |
| #3272 (Grok) | universal cold ZIL ABI = locked known limit; allowed: per-title attributeMap facts, fail-closed, offline drafts | this plan is per-title facts only |
| 1e54a58 | no I6 PROFILE bits on ZIL for container/open family | keep; extend fail-closed to every key a map does not prove |
| c33f396 / 5ec4c95 | Zork I map (container 13, open 11, supporter 10) | under review: evidence says container = 19 (CONTBIT); 13 is mailbox-only |
git log -S (js/) results: attributeMap -> c33f396, 1e54a58; CONTBIT -> c33f396, 5ec4c95; set_attr -> initial commit only; playerGlobal -> b747e42, 0126b14 (Degeneracy G18), c06d56d (Facility G44); wornAttribute -> b747e42; test_attr -> Q0 inventory-root attempts 311ad4a (reverted by d037132) and 1da03c2 'v5c same-turn unique full-phrase inventory root' (reverted by 4035a95). **Inventory root is a prior attempt that was reverted twice:** item B inventory must read the D148/D214/inventoryHiddenAttribute path and must not re-introduce a test_attr-based inventory-root guess. Read those two reverts before touching inventory. No removed or overwritten ZIL attribute system was found (agrees with Grok #3266 and #3278).

## 4. Allowed vs locked
Allowed: per-digest facts (attributeMap, playerGlobal, wornAttribute, inventoryHiddenAttribute, measuredLocation, status facts) with per-bit evidence; offline analyzer tools under work/investigations; fail closed (unknown stays null).
Locked: static exits (D61/D134); a second registry (D198); universal ZIL ABI (#3272); PROFILE on ZIL (1e54a58); invented labels or name-string inference (D25).

## 5. Per-title plan (fixed GameList order, all 27 non-Inform titles; none skipped)
dejavu, Zork1, Zork2, Zork3, Wishbringer, TheWitness, TheLurkingHorror, Suspended, Suspect, Stationfall, Starcross, Spellbreaker, Sorcerer, Seastalker, PlunderedHearts, Planetfall, Moonmist, LeatherGoddessesofPhobos, Infidel, HollywoodHijinx, Enchanter, Deadline, Cutthroats, Ballyhoo, Sherlock (z5), Hitchhik (z5), Borderzo (z5).
(Moonglow is Inform-compiled per ZRamReader.isInformCompiled and is not in this list. dejavu: isInformCompiled=false but Grok #3268 says D198 classifies it as Inform; resolved first.)

For each title, and per item in section 2:
1. A: verb routine evidence via zil-attr-analyzer (D198 action table, then disassemble, collecting test/set/clear on PRSO/PRSI), with one rule per key:
   container/open/transparent/door (OPEN/CLOSE/PUT IN/LOOK IN), supporter (PUT ON), takeable (TAKE tree), animate/talkable (TALK/TELL/ASK/ATTACK), edible (EAT), light/on/switchable (LIGHT/TURN ON/OFF), enterable (BOARD/ENTER/GET ON), wearable/worn (WEAR set, REMOVE/TAKE OFF clear), lockable/locked (LOCK/UNLOCK), scenery/static/concealed/absent/moved/visited/proper/plural/gender (only when a routine proves them; otherwise unknown).
2. Tree check: the initial object tree must agree (bit on plausible objects, never on rooms where it is an object property).
3. B: player via the existing player read (ZRamReader/playerGlobal), verified live; location global verified against the status line; inventory/worn/hidden via existing facts.
4. C: status via StatTracker live: the v3 status line flags (score/moves vs time) read from the header; probe facts only where a reply is measured in RAM (D204).
5. Unresolved: unknown, with a reason recorded per key.
Groups (Zork I-III; Enchanter trilogy; Planetfall/Stationfall; mysteries) are shared ONLY after each member's evidence is identical.

## 6. Proof method (every commit)
analyzer evidence per bit + tree check + live probe per title (Open/Close offered, contents underlined, no false open/close on non-containers, actors animate) + StatTracker RAM check + seeded three-type gate (work/investigations/regression-gate.cjs; ZIL + Inform Z + Glulx/tmp/glulx-smoke.js) + harness/operator-regressions.js 0 FAIL + d198-grammar-decoder, d31-nested-inventory, command-consistency-regression, d214-yourself-verbs, status-probe-matrix. Codex adversarial review per commit. One commit per title or proven group.

## R5 scope addition (operator 2026-10-11 12:36): full ZIL item sweep

Order: this runs per title only AFTER that title's flags are proven (R4 gate). It covers no new registry and no per-game patches. Gaps are fixed only in the shared item system's ZIL routing, and every item gets its own rules entry first. The all-games gate and the three-type gate run before every commit.

Existing systems (git grep js/ docs work/investigations, DECISION-INDEX):
- **Printed text vs short dictionary word:** Actionable.vocabularyKey / dictionary-key equality (D214 U3), promoteUnnamed (D184), namePhrases/headNounOf (D146), D64 phrase order. Prior attempts: ITEMS-QUEUE Q2 (casing), Q4 (descriptor dropped vs structural name), Q5 (another object's text adopted), Q10 (WiR "undershir" truncation). ZIL: v3 dictionary words are 6 characters and v5 words are 9; short names are prose ("small mailbox") while vocab is "mailbo". Allowed: dictionary-key comparison only, no prose mining (D25/D64).
- **Same base word, different descriptors:** D146 head-noun preference; ITEMS-QUEUE Q3/Q4; notes-pellets-descriptors-live. Locked: D70 visible-phrase ordering.
- **Exactly identical names:** ITEMS-QUEUE Q6 (acorncourt "ball", WiR "pair"); 0ed5cdb (pellets/pellet release, adapts D214 U1); the pending spear fix (alias mark vs renamed object). Harnesses: pellets-inventory-live, operator-regressions.
- **Switchable on/off:** AttributeSchema on/light (matrix rows), DarkScope, M11 fail-closed (804af63). Only proven rows (native transition) may route.
- **Worn:** wornAttribute fact path (R2.5), D59 radial, equipment worn state, inventoryHiddenPreservesWorn (Suspect).
- **Consumed items:** payload inventory reconciliation (Q0/D224, b45d4a8); the EAT reply + object leaving its parent. No new consumption registry.
- **Nested contents:** D148 held containers (Enchanter), d31-nested-inventory, ITEMS-QUEUE Q9 (heist). Depends on a proven container/open row.
- **Yourself / inventory root (Q8):** D204/D205/D220, AttrCalibrator.confirmedInventoryRootId, playerGlobal facts (Borderzone 186), Grok #3268 (Witness G1=20 is a wire, not the player; Suspended has several bodies). Q8 titles: LurkingHorror, Sorcerer, Stationfall, PlunderedHearts, LGOP, Sherlock.

Isolation: every routing change is gated on D198 confirmed-zil-family/validated (plus the digest where a fact is used). Inform Z, Glulx and custom paths must stay byte-identical in the gate.

Proof per (title, item category): a live seeded run on a fresh game showing the underline/Equipment/inventory state against the game's own text, plus negative controls (an alias-only mark, a different object with the same word).

Regression controls: seeded all-games gate (0 unintended diffs); the three-type set; operator-regressions; pellets-inventory-live; notes-pellets-descriptors-live; d31-nested-inventory; d214-yourself-verbs; command-consistency-regression; wump-dark-rename; games=309.

Per-(title, category) rules entries are added to 2026-10-11-zil-matrix.md before each title's sweep starts. Codex GO is required before implementing.

### R5.1 corrections (Codex #3316: research GO only, implementation per proposal)
- namePhrases returns single tokens as well as full phrases. Token membership never proves that a retained mark shows a current display name; any rule that relies on it may only become more conservative.
- Dictionary-key matching is for comparison only. Truncated vocabulary ("mailbo", "nutritiou", "undershir") never becomes a display label; labels are always printed text.
- Yourself / inventory root follows proven character/inventory-root containment, never the existence of wearable items.
- Per-object takeable overrides (objectOverrideFor) and the container vs openable distinction are preserved.
- Accepted Z1-R1 exit hints stay authoritative within their qualified scope; earlier "no static exits" wording is superseded where it conflicts.
- Implementation GO is per proposal (exact patch + per-item rules entry + gate evidence), never blanket.

## R6 doc check: ZIL non-structural keys still read Inform PROFILE bits (found 2026-10-11 by zil-sweep.js)

**Finding.** AttributeSchema.bitFor fails closed on non-Inform stories only for the structural family (container, openable, open, isOpen, supporter, lockable, locked, door, transparent, enterable; Grok proposal 2026-10-10, 1e54a58) and for worn (wornBitFallback). Every other PROFILE key (animate 0, on 13, light 9, switchable 21, scenery 17, static 19, edible 6, concealed 3, wearable/clothing 2, talkable 22, ...) still returns the I6 number on ZIL. Measured: Zork I app animate = 0 vs source ACTORBIT 30; app on = 13 while native TURN ON LAMP sets ONBIT 20.

**Existing system / prior attempts.** Owner: AttributeSchema.bitFor + applyTo (PROFILE loop), facts registry ModuleStatFactsClaude.attributeMap (no second registry). Grok's proposal limited fail-closed to containment because that was the bug in scope; it gives no reason to keep I6 bits for other keys. D73 AttrCalibrator overrides still apply after. D214 owns the ZIL TAKE capability via fixed grammar (AttributeSchema ~l.216).

**Hazard (why not a quick commit).** applyTo derives takeable from static (19) + scenery (17). Failing those closed on ZIL drops the derived takeable unless a proven ZIL TAKEBIT (or the D214 grammar path) supplies it. Any widening must keep Take, Wear, Eat, Turn on/off offered where the game supports them.

**Plan (needs Codex adversarial review before code).** (1) Prove per title on-device: on (ONBIT), light (LIGHTBIT), animate (ACTORBIT), wearable (WEARBIT), edible (FOODBIT), takeable (TAKEBIT) with zil-flags-native.js and the Infocom source. (2) Add proven bits to attributeMap. (3) Widen fail-closed to every PROFILE key on non-Inform stories, deriving ZIL takeable from attributeMap.takeable when present, else the existing D214 path; no I6 fallback. (4) Gate: sample + all 26 ZIL titles + operator-regressions + three-type. Isolation: Inform/Glulx untouched (isInformCompiled true path unchanged).
