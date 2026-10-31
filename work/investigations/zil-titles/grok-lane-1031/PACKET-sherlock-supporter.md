# PACKET sherlock supporter: FL-SURFACE bit 16

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-LOOK-ON verbs.zil:1470; V-EXAMINE SURFACE branch verbs.zil:868; parser.zil:1580 SRCALL for SURFACE; supplementary PUT X ON Y = V-PUT-ON verbs.zil:2042.

## Evidence
LOOK ON SOFA / MANTELPIECE read 16=1 and list contents ("On the sofa you see..."); LOOK ON VIOLIN reads 16=0. LOOK ON BED @14 was NOTEST (bed not in scope at that point of the walk) and is not counted. Supplementary run (plan-sh-put) shows PUT KNIFE ON SOFA/MANTELPIECE reading 16=1 on PRSI.

### primary runs
- run run-sherlock-20261031T064634-56444.json sha256 e849641b84975f6fcd9a349b3b752881c575658e51d829129f16f40519c9b326; plan plan-sh-surface.json sha256 69cdc59b5158ddf6f7e28ce989e94c4529d1c8473beb8566a84ca96bca4b5af3

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LOOK ON SOFA | 239 | 16 | 1 | TRUE | 93 | 1@32229 1@40792 1@37650 1@60317 | - | On the sofa you see a morocco case and Holmes. |
| @4 | LOOK ON MANTELPIECE | 292 | 16 | 1 | TRUE | 93 | 1@32229 1@40792 1@37650 1@60305 | - | On the mantelpiece you see a pipe, a persian slipper, a knife, some mail and a p |
| @4 | LOOK ON VIOLIN | 207 | 16 | 0 | FALSE | 93 | 0@37650 0@60305 | - | You do not see anything unusual on the violin. |
| @14 | LOOK ON BED | 254 | 16 | 1 | NOTEST | 93 | - | - | You cannot see any bed here. |

### supplementary runs
