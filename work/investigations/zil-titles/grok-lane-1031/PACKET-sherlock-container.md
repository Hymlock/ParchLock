# PACKET sherlock container: FL-CONTAINER bit 9

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-LOOK-INSIDE verbs.zil:1435 (CONTAINER branch ~1451: closed non-transparent -> "would have to open"); RT-SEE-INSIDE? boot.zil.

## Evidence
Three containers on three objects (slipper, pipe, closed black bag) read test_attr 9=1; sofa and mantelpiece (SURFACE, not CONTAINER) read 9=0 and fall to "cannot look inside".

### primary runs
- run run-sherlock-20261031T064625-17460.json sha256 c9c5ca251e3efc170ca172379308753c0befb9afb0ee6c1e0ce0aa96a196433e; plan plan-sh-container.json sha256 731fe2449d5543a8936414a404c4436a3679457fa7002dcfde19ca2e2d35a5bb

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LOOK IN PERSIAN SLIPPER | 228 | 9 | 1 | TRUE | 93 | 1@32229 1@40809 1@37650 1@60236 | - | In the persian slipper you see some tobacco. |
| @4 | LOOK IN PIPE | 218 | 9 | 1 | TRUE | 93 | 1@37650 1@60217 | - | In the pipe you see nothing. |
| @4 | LOOK IN BLACK BAG | 172 | 9 | 1 | TRUE | 93 | 1@32229 1@60217 | - | You would have to open the black bag to do that. |
| @4 | LOOK IN SOFA | 239 | 9 | 0 | FALSE | 93 | 0@60217 | - | You cannot look inside a sofa. |
| @4 | LOOK IN MANTELPIECE | 292 | 9 | 0 | FALSE | 93 | 0@60217 | - | You cannot look inside a mantelpiece. |

