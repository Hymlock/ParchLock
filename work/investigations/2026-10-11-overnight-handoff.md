# Overnight handoff 2026-10-11 (orchestrator seat grok2)

## Done
- A. 7872ab4 Wumpus E1/X1 source fix in MapTopology.applyStateDelta (Grok #3262 attacks addressed), d280b22 reverted. Fresh play only; no old-save migration (operator: no backwards compat).
- D (part 1). 1e54a58 ZIL fail-closed: no I6 PROFILE container/open-family bits on ZIL (work/investigations/grok-zil-failclosed-bitfor.patch). Zork attributeMap, D148, D73 kept.
- Proofs: tmp/e1x1-fresh.txt, tmp/zil-fc.txt. Gate 10 games 0 diffs; Glulx CM identical; games=309.
- Note: the Planetfall gate is nondeterministic run to run on identical code (brochure/ambassador), so treat its diffs as noise unless they reproduce.

- B. 35646c0 harness/operator-regressions.js, required in AGENTS/CLAUDE/GROK (fresh play).
- C. 0ed5cdb pellet: D214 U1 (a40f7ba) adapted (release retained mark on same-head-noun reprint). Bisect b747e42 good / a40f7ba bad.
- Grok seat OUT OF CREDITS 00:30 ET: claims released, items assigned to grok2 (bus #3284). Self-review replaces Grok review.
- Grok findings to keep: #3272 universal cold ZIL ABI = locked limit; #3278 operator 'worked' = AttrCalibrator.allowedVerbs after OPEN; #3283 Zork open=11, groups methodology (work/investigations/2026-10-10-grok-zil-full-flag-methodology.md).
- 8661da0 regression gate seeded: deterministic (Planetfall noise gone). Older baselines in tmp/*.jsonl were unseeded; regenerate them before diffing.

## In progress / next
- D (part 2). Waiting on Grok #3269/#3270 (cold ZIL decode, prior-attempt doc check).
- E. Family routing: Suspended/Witness player=0, dejavu/Suspect D198 (assigned to Grok in #3267).
- F. Local map section frames (WIP patch), D219 (Grok #3237), world-map-ui and learned-words-corrections failures.

## Bus
- #3267 grok2 -> grok: no-migration rule, ZIL plan, E-family checks assigned.

## Codex post-hoc review queue (Codex out of credits 18:52)
- 2e1455e wearable owner R2 (Codex scoped GO #3439 already).
- 8e294b5 nested v3 room + Sorcerer playerGlobal 38: self-audited. Gate tmp/gate-s11-diff.txt (16 diffs, all intended: furniture/vehicle rooms -> status room; Sorcerer base rooms Shaft Top/Dial Room/Shaft Bottom came from pseudo-player 29, dropped). Note: a leaked ONLY env made the in-gate operator-regressions report 0/0; rerun directly 7/0.
- f192204 batch-2 container/supporter/open facts (Enchanter, Infidel, Border Zone): self-audited against #3389/#3431 original-scene rule; Enchanter open bit rests on single object + exact source (rule 2:14 PM). Zork II stays held. Gap: BZ 'tourist guide and phrase book' (name with 'and') not underlined.
- 59030bc Enchanter open 12 reverted to unknown (operator rule check 19:16). Next candidate route: castle KITCHEN oven / BED / RAT-HOLE.
- 146bc9e Zork II container/supporter/open: chest native transitions + teapot native already-open test. Correction: Border Zone 'tourist guide and phrase book' IS underlined, as 'tourist guide' (span stops at 'and'); my runner keyed on the last word. Partial-span note only.

## Codex post-hoc audit queue (Codex offline from 23:53, grok2 self-review)
- a099ea0 Spellbreaker playerObject 52 (source globals.zil 324; native TAKE parent 52; gate 3 games 1 intended diff).
- 7118711 playerObject contract docs; LGOP audit record.
- f360053 completion counter (playerObject); audit records copied from codex-zil-title-sweep.md; 18 UD cells (wear/worn not applicable, source-pinned greps). Surface probes pq1-4: Ballyhoo/Hollywood container MEET but supporter still short (RAM has CONT+SURF overlap, so containers stay held); Cutthroats/PH no new facts (already present). NOTE: q1-q4 walk files were overwritten by a failed run (untracked, unrecoverable).

- HELD (not committed): HHG playerObject 202 (tmp/MSF.w14.js). Native towel->202 and app inventory fills (7 items), but gate shows room Bedroom->bed and exits lost: player starts in bed 114, enclosingRoom's status-global path is v3-only and the HHG map has no enterable/container fact for the bed. Needs a v5 ZIL location rule (HERE global as digest fact + chain check) before the player fix can ship.
- 00:3x COMMIT (self-reviewed, Codex post-hoc): v4/v5 ZIL locationGlobal digest fact in ZRamReader.enclosingRoom (v3 path unchanged; absent fact = old path; same chain check) + HHG playerObject 202 / locationGlobal 116 (source HERE; 125 je-compares vs 0; live 60 steps/8 rooms). Gate 6 games (curses, HHG, Border Zone v5 no fact, Zork I, Sorcerer, Spellbreaker) 0 differences; Glulx identical; operator-regressions 7/0; open-capability 6/0; d31 0. HHG app inventory 0 -> 5 items, boot room stays Bedroom.
