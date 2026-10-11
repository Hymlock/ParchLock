# Standing items queue (operator 2026-10-10): find and fix EVERY item issue across all 309 games

Findings sources:
- 2026-10-10-claude-items-blind.md (C1-C8, 272 Inform)
- work/mapping-research/2026-10-10-codex-items-blind.md (6 Infocom wrong-yourself roots)
- 2026-10-10-grok-items-blind.md
- 2026-10-10-items-three-way-compare.md

Queue, in order:
- **Q1. C1:** a phrase crosses a line break (Jigsaw, MakeItGood, blair, oad, degen, doll).
- **Q2. C2:** printed casing lost (22 titles).
- **Q3.** notes-pellets-descriptors-live is red (a different-descriptor regression).
- **Q4. C3:** a descriptor is dropped against the printed structural name (dejavu, Gumshoe, Cyclops, beneath, burglar, f209, mimesis, spacest2, uhoh-demo).
- **Q5. C4:** another object's text is adopted as the name (curves keys "door", acorncourt tin pail, burglar, whispers, zdungeon, TCOTY, beneath, gardening).
- **Q6. C5:** identical duplicates (acorncourt 21x "ball", WiR "pair", curves bills).
- **Q7. C6:** items the game does not list:
  - concealed/scenery player children;
  - room root (BibleRetold);
  - NPC parts (Galatea, loose);
  - the break-in vial.
- **Q8.** Codex's 6 Infocom wrong-yourself roots (LurkingHorror, Sorcerer, Stationfall, PlunderedHearts, LGOP, Sherlock).
- **Q9. C7:** heist nested contents are missing.
- **Q10. C8:** WiR "undershir".
- **Q11.** Glulx: 11-title items census (last).
- **Q12.** Re-run the full census for all titles:
  - work/investigations/items-census-claude.cjs, with FORCE_INFORM=1 for dejavu;
  - plus Codex's ZIL census;
  - diff against the sealed baselines; there must be no new defect anywhere.

EVERY FIX, no exceptions:
- **(a) Doc check first.** Write it into 2026-10-10-grok-items-proposal.md:
  - follow DECISION-INDEX, then the PRODUCTION_PLAN D-entries, then the ARCHITECTURE sections;
  - list prior attempts, reverts and rejections, and why this fix does not repeat one;
  - list their guard harnesses.
- **(b) Implement** only that fix, under claims. The saved patch 2026-10-10-grok-actionable-UNREVIEWED.patch may be reused hunk by hunk after its doc check.
- **(c) Prove it:**
  - its own harness case;
  - all guards green: command-disambiguation, d31-nested-inventory, equipment-ui, pellets-inventory-live, notes-pellets-descriptors-live, save-labels;
  - the census subset for its titles.
- **(d) Commit** one commit per proven fix. Unproven fixes stay out, with the reason recorded.

Test APK:
- WITHDRAWN (operator 2026-10-10): build an APK only on an explicit operator request for a test build.
- Use the full path C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main\build-android.bat via PowerShell.
- Report the path, SHA256, commit, and the fixes in and out.

Codex (back 20:27) audits each committed fix adversarially; rejected fixes are reverted.

Do not edit PRODUCTION_PLAN/ARCHITECTURE (claude only). Never blanket-kill node. Never end the session on a reply.

## Q0 (TOP PRIORITY, operator-reported 2026-10-10 17:54): wump2ka Equipment lost every item
- Screenshots: work/investigations/operator-2026-10-10-wumpus/.
- The APK predates eb35f19.
- Room #38 "A vast, jagged region", with a barrel present, turn 28, after SAVE.
- The game's `inventory` lists 8 items: small rock, two food pellets, Transmat Popper, scribbled note, brittle skeleton, empty canteen, Glow Bar. It reports 24 lbs, 48% capacity, $712.
- The Equipment sheet shows ONLY "Yourself" (no items).
- The status HUD shows CARRIED 9 lbs and CAPACITY 23%: stale or wrong. VALUE $712 is correct.
- Family:
  - the inventory-root loss guarded by harness/pellets-inventory-live.js (room-root contamination after examine barrel/hole; D75/D214 root rejection);
  - D169 carried weight.
- wump2ka randomises its cave; compare across runs.
- Procedure:
  - Grok seals a BLIND investigation first, from the problem statement only: work/investigations/2026-10-10-grok-wumpus-equipment-blind.md.
  - Then the doc check (D57, D58, D68, D75, D79, D169, D184, D214 root amendment, pellets harness), then the proposal, then the fix, then guards plus a new live wump2ka repro, then commit.
- Operator addition: even after a manual `inventory` command, the 8 listed items are NOT underlined (no Actionable marks), and the Equipment sheet did not repopulate from that output.
  - So the held objects dropped out of scope/payload entirely, not just out of the sheet.
  - A typed INVENTORY normally re-anchors both (D190/E5 'RAM insert without typed INV', D214 root revalidation).
  - The repro must check underlines on the `i` output as well as the sheet.

## Rule added after c579613 (claude audit)
c579613 (C4) passed every guard harness, but the census showed it regressed acorncourt ("tennisb"), curves ("one") and gardening ("gold", "list"). So:
- Every fix MUST report its census-subset before/after table in the bus message.
- No APK is built from a commit whose census subset has not been compared.
- Standing negative case: a parser-only truncated word (e.g. "tennisb", "nutritiou") is never shown.

## REGRESSION GATE (operator 2026-10-10: "we don't need to regress something that is working correctly")
- Tool: work/investigations/regression-gate.cjs.
  - One row per non-Glulx game: map rooms, exits, LOOK underlines, shown inventory names (i, take all, i).
  - `--diff base cand` lists every difference.
- Baseline: 77f4e87 (accepted end of the maps round), recorded twice (gate-base-77f4e87-a/b). Games that differ between their own two baseline runs are NOISY (random games such as Advent) and are judged by hand.
- The baseline is NOT assumed correct; the gate detects CHANGE. Every difference must be classified in the commit's bus report as:
  1. INTENDED: names the sealed finding it fixes; or
  2. REGRESSION: something that worked now differs. Revert or fix before any APK.
- Wrong-and-unchanged rows produce no difference. They stay on the sweep's fix list.
- Required before every APK and before Codex's acceptance of any runtime commit.

## AFTER CURRENT TASKS (operator 2026-10-10): close the open items from the 309-game MAP audit
These are Codex's open map items. Finish them before new work:
- D219: storyShortName is not fail-closed (garbage room names); the qualification proposal is in progress.
- D220: "yourself" player provenance (Facility G44 decode, no live ChangePlayer trace yet).
- D222: furniture climb; needs a qualified-room boundary (22-climb census done).
- M07 (Make It Good substate), M09 (boot/intro rooms, operator decision recorded), M10 (timed travel), M11 HHG in-bed residual.

## PAUSED (operator 2026-10-10): the items sweep waits until every MAP item is done
- Q5 v3 is accepted but not applied: work/investigations/2026-10-10-grok-Q5-v3-ACCEPTED-PARKED.patch.
- Q0 is resolved by D224 (the Wumpus identity); Grok verified the operator save.
- Q6 is a no-op, accepted.
- The Q7 trace is sealed (WorldModel.recoverInventory room-worn path).
- Resume order after maps: Q7, Q5 apply (re-gate), then Q8-Q12.

## Logged 2026-10-11 (operator: later, no fix now)
- **MAP-L1. wump2ka lookahead exit mismatch:** on the operator save (work/investigations/operator-2026-10-10-wumpus-dark/save.json), ZRamReader.lookAheadExits for room 27 offered 'exit 3' but the game answered 'You can't see any such thing' to x3/exit 3 (work/investigations/wump-dark-sections-live.js log). BFS routes also diverged from the planned path (underwater/swim exits). Investigate the lookahead label vs native exit numbering per room later.
  - **Root cause (2026-10-11, traced live; not a lookahead fault, not a regression of c53337d/7872ab4):** the 'exit 3' rejections come from harness routes that are PRECOMPUTED by BFS over ZRamReader.lookAheadExits and replayed blindly. When the game refuses a move for a game rule the RAM exit table does not encode (room 78 'exit 1': 'That exit is partly underwater...you'll need to swim'), the player stays put, the route desyncs, and a later label ('exit 3') is issued in a room with fewer exits (room 77 has exits 1-2 only; the lookahead correctly offered only those). Evidence: tmp/exit3-trace.js (seed 4, 11 steps): at every step lookahead = populated door_dir slots (91..94) on the room = the player's parent. Operator save (tmp/exit3-save.js, exit3-save27.js): rooms 30, 39, 41, 42, 27 match the lookahead exactly (27 has exit 1 only; x2..x4 -> 'There aren't that many exits'). c53337d's real_location = payload room = player parent at every observed step (no section split on these rooms), and exits live on the real room object, so the section/printed-room choice is not involved. The earlier 'Exit 3' fix (Codex equipment audit, 2026-10-09) was the printed-Exit-3 underline, a different issue. **Proposed fix:** harness only. Walk adaptively (re-plan from the current room each step, verify arrival, ban refused edges): applied in inventory-underline-guard.draft.js and wump-dark-sections-live.js (operator save: the walk refused room 38 'exit 3' -> 'That exit is partly underwater...you'll need to swim', banned it, re-planned; 9/0). Apply to any other blind-route harness. No product change. Underwater/swim is a game rule outside the RAM exit table (could later be a learned per-edge note; not planned).

- **SPEAR-1 (OPEN, unproven).** Operator: 'a stone spear' (wump2ka 290) not underlined in `i` after the formation rename. Root cause found at 12:4x: D214 retention (a40f7ba) kept the old phrase's mark. The rebind mechanism (commit below) adds a rename branch (unique id, own-name phrase, no head-noun bypass), but NO native spear pass has been captured: seeds 1-30 put 290 already named 'stone spear', either in objectbag or held by quickpaw2/rooms with lethal or long routes. Needs a native fixture (operator save carrying the spear, or a found seed) before it can be closed. Do not claim it fixed.

- **NAME-B1. Zork I bottle shows as 'bottle contains'.** Payload/display name for object 236 is 'bottle contains' (seen in Codex's command probe 2026-10-11: commands would read 'open contains'). Likely the name is picked up from printed room text ('A bottle ... contains:') or an unnamed promotion, not the ZIL short name ('glass bottle'). Pre-existing; surfaced by the container work (#3367). Doc check first (promoteUnnamed, D64/D70 VerifiedNouns, CommandNouns); fix in the shared naming path, no per-game patch.

## Standing step: published source evidence

STANDING STEP (operator 2026-10-11): for every non-Infocom module, check whether its source code is published (Inform 6/7 source on IFDB, IF Archive, GitHub, or author sites; also the library/extension source for its compiler, e.g. the Inform 6 library or I7 Standard Rules version it was built with) and use it as cited reference evidence for flags, objects, and status variables, alongside on-device proof. Source evidence never replaces on-device proof: a fact needs >=2 on-device positives + 1 negative, or a single on-device positive + a cited source only after the whole module has been searched with no second positive. Record the source URL and version per title. Infocom titles use historicalsource (work/investigations/zil-source-flags.js).

