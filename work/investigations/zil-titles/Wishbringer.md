# Wishbringer.z3.js — ZIL title work (grok2)

**Assignment:** R3 #4266 top-9

## C cells needing claude audit
- container

## Source exact bits
`CONTBIT4 OPENBIT25 SURFACEBIT27 ONBIT20 WEARBIT22 ACTORBIT18 TAKEBIT17`

## Not-F cells (18)
- container: C
- lightSource: U
- on: U
- wearable: U
- worn: U
- edible: U
- takeable: S
- playerRoot: S
- status: Os
- rooms: O
- actors: X
- underlineVsDict: X
- descriptors: X
- identical: X
- onoff: U
- wornItems: X
- consumed: U
- nested: U

## Next
1. Audit C→F
2. Native prove CONT/OPEN/SURFACE/ON/LIGHT/WEAR from source bits
3. FEATURE-ABSENT only after full FSET grep

## October20 independent target-scoped container audit (Codex takeover)

Closes the recorder qualification gap raised by Claude4320 for the existing committed attributeMap.container4. Original native walkthrough through105, no object relocation or state forcing; test_attr is observed only during the exact named command. OPEN FRIDGE tests refrigerator82 bit4 TRUE and natively opens it, revealing bottle/earthworm. OPEN MAILBOX tests little mailbox4 bit4 TRUE and natively reveals leaflet. OPEN COIN tests held gold coin250 bit4 FALSE and replies "How can you do that to a gold coin?"; this is a semantic negative, not an out-of-scope rejection. Yourself/parser/other-object tests are not substituted for these targets.

Raw: work/mapping-research/items-codex/resume-20261020/wish-container-native.txt; helper in same directory. Existing source CONTBIT4 is corroboration. Container4 independently ACCEPTED; no runtime change and no generic Open capability, remaining keys or whole-title completion claimed. Existing generated C counts are stale until reporting reconciliation; the audit registry now carries the precise verdict.
