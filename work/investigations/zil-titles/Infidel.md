# Infidel.z3.js — ZIL title work (grok2)

## October20 current independent audit (Codex takeover)

Grok4127 worn-state22 proposal independently ACCEPTED from original native knapsack31 and jeweled ring2 positives, held shovel33 refusal, ring before/after state and native INVENTORY. Integrated wornAttribute22 only; no separate wearable capability. Equipment knapsack is worn with Remove, then absent after native take-off drops it. Bounded249-object census has no room owner for22. Operator13/0, Infidel/InformZ/Glulx baseline/candidate0diff. Full evidence: work/mapping-research/items-codex/resume-20261020/infidel-worn-audit.md and raw/helper files.

Container20 remains C/review open: OPEN CANTEEN target28 tests20 TRUE, OPEN SHOVEL target33 FALSE with refusal. Successful trunk OPEN/LOOK, jar OPEN and knapsack PUT/EMPTY go through special handling and did not test20 on those targets; none counts as a second target-qualified positive. Keep that exact gap, not a whole-title rejection or invented acceptance. The source key remains20; existing runtime fact is unchanged.

**Assignment:** R3 #4266 top-9

## C cells needing claude audit
- container

## Source exact bits
`CONTBIT20 OPENBIT25 SURFACEBIT28 ONBIT21 FOODBIT7 ACTORBIT17 TAKEBIT15`

## Not-F cells (19)
- container: C
- lightSource: U
- on: U
- wearable: U
- worn: U
- animate: U
- edible: U
- takeable: S
- playerRoot: S
- status: Os
- rooms: O
- actors: U
- underlineVsDict: X
- descriptors: X
- identical: X
- onoff: U
- wornItems: U
- consumed: X
- nested: U

## Boot probe 2026-10-20

File: `_infidel-boot.json`

| field | value |
|-------|--------|
| player | 223 cretin (named-player) |
| parent | 51 army cot (in/on cot) |
| room | 71 Your Tent |
| mapN | 2 |
| trunk 39 | container+open+supporter (attrs) |
| padlock 38 | container !open |
| cot 51 | container+open+supporter |

Note: player nested in cot (supporter/enterable posture) — rooms O OK. Container C fact still needs claude audit.

## Next
1. Audit C→F container
2. Native prove CONT/OPEN/SURFACE/ON from source bits (openCapability none supporter)
3. FEATURE-ABSENT light/wear only after full FSET grep
4. edible FOODBIT 7 single carrier — native eat
