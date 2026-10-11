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
