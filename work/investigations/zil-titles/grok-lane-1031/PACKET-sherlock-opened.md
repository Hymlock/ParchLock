# PACKET sherlock opened: FL-OPENED bit 5

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-OPEN verbs.zil:1759 (ISNOT OPENABLE, then OPENED -> "already open", LOCKED, CONTAINER); V-CLOSE verbs.zil:606.

## Evidence
OPEN MOROCCO CASE 304 and OPEN KNIFE 151 read 5=1 ("already open"); CLOSE STUDY DOOR 70 reads 5=1 and the attr diff CLEARS bit 5; OPEN BLACK BAG 172 reads 5=0 and the attr diff SETS bit 5 (native flip in both directions). OPEN MATCHBOOK @19 NOTEST (route drift), not counted.

### primary runs
- run run-sherlock-20261031T064725-44116.json sha256 602ec633d96a967abc9a4d1d83122afd47526019ab9102930fe5ebed0341d7a1; plan plan-sh-opened.json sha256 ce4a3862a12cd4a4c6eaf9f2ab8e424937e7c6804bcf71d3da44ec13b5058372

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | OPEN MOROCCO CASE | 304 | 5 | 1 | TRUE | 93 | 1@32229 1@40809 1@37650 | - | Holmes is faster than you are. He moves the morocco case beyond your reach and a |
| @4 | OPEN KNIFE | 151 | 5 | 1 | TRUE | 93 | 1@61911 | - | It is already open. |
| @4 | OPEN BLACK BAG | 172 | 5 | 0 | FALSE | 93 | 0@32229 0@61901 | set [5] | You open the black bag. Inside you see a brown bottle and a blue bottle. |
| @4 | CLOSE STUDY DOOR | 70 | 5 | 1 | TRUE | 93 | 1@56567 | cleared [5] | You close the study door. |
| @19 | OPEN MATCHBOOK | 236 | 5 | 0 | NOTEST | 93 | - | - | You cannot see any matchbook here. |

