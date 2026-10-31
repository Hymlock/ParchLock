# PACKET sherlock door: FL-DOOR bit 8

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-KNOCK verbs.zil:1263 (DOOR first, then OPENED -> "already open", else "no answer").

## Evidence
KNOCK ON BEDROOM DOOR 104, STUDY DOOR 70 and PARLOUR DOOR 102 (@19) read 8=1 and take the door branch; KNOCK ON VIOLIN reads 8=0.

### primary runs
- run run-sherlock-20261031T064649-44628.json sha256 e7e903e1722442ae139149081f47dc96e41bbcf2a8e753dd522cba34cf94b9c8; plan plan-sh-door.json sha256 ea3820a8a7939a5538567a654a35f6a4bc9d09f68d4c835c469967baa32c77f9

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | KNOCK ON BEDROOM DOOR | 104 | 8 | 1 | TRUE | 93 | 1@59447 | - | There's no answer. |
| @4 | KNOCK ON STUDY DOOR | 70 | 8 | 1 | TRUE | 93 | 1@59433 | - | It is already open. |
| @4 | KNOCK ON VIOLIN | 207 | 8 | 0 | FALSE | 93 | 0@59433 | - | That would not do anything useful. |
| @19 | KNOCK ON PARLOUR DOOR | 102 | 8 | 1 | TRUE | 111 | 1@59433 | - | There's no answer. |

