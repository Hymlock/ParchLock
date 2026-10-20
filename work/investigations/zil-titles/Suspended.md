# Suspended.z3.js — ZIL title work (grok2)

**Assignment:** R3 lead ruling #4266 top-9  
**Digest:** `6011284a57a6200c4deebfbeae92b3bac2f98a570ddbbc8cfc8bcc382d5b524f`  
**Source:** historicalsource/suspended  
**D198:** confirmed-zil-family  

## Completion-table state (not-F work)

| key | st | next action |
|-----|-----|-------------|
| wearable | **F** | AUDIT PASS claude #4291 — attributeMap.wearable=31 |
| worn | **F** | AUDIT PASS claude #4291 — wornAttribute=15 |
| takeable | S | confirm D214 TAKEBIT consumer path for this title |
| rooms | O | native LOOK heading = RAM room already noted in completion detail — promote with short walk record |
| container | U | source CONTBIT **19** exact 13/13 — need NATIVE-PROVEN put-in/open contents |
| open | U | source OPENBIT **8** exact 6/6 — need open/close transition natives |
| supporter | U | source SURFACEBIT **11** — native put-on |
| lightSource | U | no LIGHTBIT in source-flags dump — check FEATURE-ABSENT vs ONBIT misuse |
| on | U | source ONBIT **2** (63 carriers) — device turn on/off natives |
| animate | U | check ACTORBIT/PERSON in source |
| edible | U | no EATBIT in first flag dump — FEATURE-ABSENT search |
| playerRoot | U | measure player global / resolvePlayer |
| status | U | SCORE casualty-cycles fact already on digest (:811-812) — may be C/F path |
| actors, underlineVsDict, descriptors, identical, onoff, wornItems, consumed, nested | U | sweep / native |

## Existing facts (awaiting F audit)

```
attributeMap.wearable = 31  // WEARABLEBIT; single owner SURGERY-HAND 63
wornAttribute = 15          // WEARBIT worn state on grasper install/detach
status: casualties/population/cycles via SCORE
```

Evidence cites in ModuleStatFactsClaude.js:798-812 (grok1 2026-10-17 routes).

## Source flag map (exact bits to prove)

From `2026-10-11-zil-source-flags.json` Suspended.z3.js:
- CONTBIT 19, OPENBIT 8, SURFACEBIT 11, ONBIT 2, CLIMBBIT 27, SEARCHBIT 7, …

## Shared method note (lead #4266: lightSource/on/edible)

1. **lightSource:** grep source for LIGHTBIT / LAMP-ON FIND; if absent + V-ON is CANT-TURN → FEATURE-ABSENT (UD→F after audit). Do not map ONBIT to lightSource (Codex #3380).
2. **on:** ONBIT carriers + native TURN ON / TURN OFF before/after on ≥2 devices + ≥1 negative; attributeMap.on = bit.
3. **edible:** EATBIT / FOODBIT FIND in EAT; native eat positives + non-food negative; else FEATURE-ABSENT whole-source.

## Next steps (this seat)
1. Request claude audit of wearable31 + worn15 (C→F).
2. Live boot: rooms O promotion + playerRoot probe.
3. Native batch for container19 / open8 / on2 using zil-sweep Inform-style but ZIL flags.

## Boot probe 2026-10-20 (Playwright)

File: `_suspended-boot.json`

| field | value |
|-------|--------|
| resolvePlayer | id **0**, path none |
| roomId / name | **158 Iris** |
| roomSource | existing-resolver |
| mapN | 1 |
| g0 | 158 Iris (room, not PC) |
| inventory | [] at boot |

**playerRoot U:** multi-robot game — no standard yourself; needs robot/player measured fact (not heuristic yourself).  
**rooms O:** Iris heading matches RAM 158 — promote with short native walk record after robot select if required.

## Player-visible check
_pending (robot wake / iris control path)_

## Independent on2 native audit
Suspended on2 independently accepted from Grok4125 state portion only: original native first33/second31 TRUE/already-on, third32 FALSE/not-on after native off; current decoded third32.on changes true->false->true under native OFF/ON, other switches remain true. Current bounded191-object census66 owners=63room children+3switches. Exact delta1field; no animate24, player-root or room rule. Operator13/0, complete3engine base/candidate parity0diff; known boot Iris158 room result unchanged and remains unresolved, never accepted as a valid room. Native route reaches control area94; does not prove general multi-robot root/map semantics or switch commands in Equipment. State semantic proof only; capability/useful consumer gaps stay OPEN. Evidence: work/mapping-research/items-codex/resume-20261020/suspended-on/.
