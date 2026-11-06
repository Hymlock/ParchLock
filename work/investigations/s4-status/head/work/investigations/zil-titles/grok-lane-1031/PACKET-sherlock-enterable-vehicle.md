# PACKET sherlock enterable/vehicle: FL-VEHICLE bit 1

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-ENTER verbs.zil:803/809 (RT-FIND-IN? GL-PLACE-CUR FL-VEHICLE); verbs.zil:2604.

## Evidence
One run: ENTER CAB 295 @53 and ENTER BOAT 201 @135 read 1=1 and the player moves into the vehicle (here = 295 / 201; attr diff sets bit 32 on entry); ENTER ROWBOAT 194 (Captain Bligh's boat, CONTAINER not VEHICLE, Black Museum @58) reads 1=0 and Holmes refuses. The growler 300 was not tested.

### primary runs
- run run-sherlock-20261031T070218-57136.json sha256 aaa567fd8e16243b944bbec679e86cead68374735de446062049e0f30f928d9b; plan plan-sh-veh3.json sha256 2888191458afe3e7730cb364be199d83e4057147dedc38391e911023b0ca97fc

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @53 | ENTER CAB | 295 | 1 | 1 | TRUE | 295 | 1@42749 | set [32] | You and Holmes get into the cab. "Where to, guv'nor?" |
| @58 | ENTER ROWBOAT | 194 | 1 | 0 | FALSE | 21 | 0@48537 | - | Your friend looks at you grimly and says, "I thought you had more sense than tha |
| @135 | ENTER BOAT | 201 | 1 | 1 | TRUE | 201 | 1@42749 | set [32] | You and Holmes get into the boat. |

### supplementary runs
- run run-sherlock-20261031T065329-33600.json sha256 b242607e05721bc6553d64b4d7cb0ec94b7d4dd6165cd95f8b331691807ed3c4; plan plan-sh-cab53.json sha256 87ef1c27ce6a4b9c233744ce6bfa1660d5004a1a83b13ab52a7311fc16afd9e3

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @53 | ENTER CAB | 295 | 1 | 1 | TRUE | 295 | 1@42749 | set [32] | You and Holmes get into the cab. "Where to, guv'nor?" |
| @58 | ENTER ROWBOAT | 194 | 1 | 0 | FALSE | 21 | 0@48537 | - | Your friend looks at you grimly and says, "I thought you had more sense than tha |

- run run-sherlock-20261031T065527-40720.json sha256 d1c0a6d2638a2302ed7ba5f341474d2bd6a6747f7edb93aeb8628cbb6287f2f8; plan plan-sh-boat135.json sha256 92791c7ae39a1e4bf59c9fa7490f4db651c5050d5ddb9c1d7264f643f03fd6d3

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @135 | ENTER BOAT | 201 | 1 | 1 | TRUE | 201 | 1@42749 | set [32] | You and Holmes get into the boat. |

