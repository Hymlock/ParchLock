# PACKET sherlock locked: FL-LOCKED bit 15

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-OPEN verbs.zil:1767 (LOCKED -> "It is locked"); V-CLOSE verbs.zil:611.

## Evidence
OPEN FRONT DOOR 35 @0 and OPEN BEDROOM DOOR 104 @4 read 15=1 ("It is locked"); OPEN BLACK BAG reads 15=0 and opens. Bedroom door is later unlocked by RT-I-PM-LEAVE (dynamic clear; not exercised here). OPEN PARLOUR DOOR @17 NOTEST (drift), not counted.

### primary runs
- run run-sherlock-20261031T064743-37860.json sha256 cf0acb6e79ba624783d0b67bbd8d6418979df5b0a3600298ef4785ce216097e2; plan plan-sh-locked.json sha256 e141bd88ed00f809865d8a024b006ed6dffbd976b5e7a886731cfad2c3a0a853

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @0 | OPEN FRONT DOOR | 35 | 15 | 1 | TRUE | 38 | 1@61919 | - | You cannot do that. It is locked. |
| @4 | OPEN BEDROOM DOOR | 104 | 15 | 1 | TRUE | 93 | 1@61912 | - | You cannot do that. It is locked. |
| @4 | OPEN BLACK BAG | 172 | 15 | 0 | FALSE | 93 | 0@61912 | set [5] | You open the black bag. Inside you see a brown bottle and a blue bottle. |
| @17 | OPEN PARLOUR DOOR | 102 | 15 | 0 | NOTEST | 111 | - | - | Mrs Hudson apologetically stands in front of the closed door. "I'm terribly worr |

