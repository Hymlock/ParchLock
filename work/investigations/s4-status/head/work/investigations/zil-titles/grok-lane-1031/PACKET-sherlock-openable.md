# PACKET sherlock openable: FL-OPENABLE bit 44

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-OPEN verbs.zil:1761 (ISNOT OPENABLE -> refuse); V-CLOSE verbs.zil:608.

## Evidence
One seed-0 run, all @4 in the study: OPEN KNIFE 151, CLOSE STUDY DOOR 70 (attr diff clears bit 5) and OPEN BLACK BAG 172 (attr diff sets bit 5) read 44=1; OPEN VIOLIN 207 reads 44=0 ("could not possibly open"). Supplementary runs repeat bag/knife/study door TRUE and violin/sofa FALSE; OPEN MAIL is intercepted by its action routine (NOTEST) and was dropped.

### primary runs
- run run-sherlock-20261031T070111-9080.json sha256 127b9b518cde4aed1c8a4410d24c1f9d5dc2452f0ff0f914a3f8d85ce3da7718; plan plan-sh-open4b.json sha256 6acabcf18b9a79193a4f9f1b22b093651fe576d3367da39790ec3b824714e35b

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | OPEN KNIFE | 151 | 44 | 1 | TRUE | 93 | 1@61900 | - | It is already open. |
| @4 | CLOSE STUDY DOOR | 70 | 44 | 1 | TRUE | 93 | 1@56567 | cleared [5] | You close the study door. |
| @4 | OPEN BLACK BAG | 172 | 44 | 1 | TRUE | 93 | 1@61893 | set [5] | You open the black bag. Inside you see a brown bottle and a blue bottle. |
| @4 | OPEN VIOLIN | 207 | 44 | 0 | FALSE | 93 | 0@61893 | - | You could not possibly open the violin. |

### supplementary runs
- run run-sherlock-20261031T064707-52308.json sha256 8cb147080ec7341e94cfda709ed16133bc1da853dd1f4a76859185f12d42d076; plan plan-sh-openable.json sha256 3a9eb338ce397776296fc85e886fd99d59f0cfbbcfcaee72bca891edc9cb3cc6

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | OPEN VIOLIN | 207 | 44 | 0 | FALSE | 93 | 0@61900 | - | You could not possibly open the violin. |
| @4 | OPEN SOFA | 239 | 44 | 0 | FALSE | 93 | 0@61893 | - | You could not possibly open the sofa. |
| @4 | OPEN MAIL | 203 | 44 | 1 | NOTEST | 93 | - | - | You should not read other people's mail. |
| @4 | OPEN BLACK BAG | 172 | 44 | 1 | TRUE | 93 | 1@61893 | set [5] | You open the black bag. Inside you see a brown bottle and a blue bottle. |
| @19 | OPEN MATCHBOOK | 236 | 44 | 1 | NOTEST | 111 | - | - | You cannot see any matchbook here. |

- run run-sherlock-20261031T065242-48824.json sha256 2674c70ae1bd017b63b231a81988515dd05320da753aca0a6b612d05939b1d46; plan plan-sh-open4.json sha256 eb1fd570d90e430c786a3fd5fe54682fbb5280759d88487b70b38fc3cd370cad

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | OPEN KNIFE | 151 | 44 | 1 | TRUE | 93 | 1@61900 | - | It is already open. |
| @4 | CLOSE STUDY DOOR | 70 | 44 | 1 | TRUE | 93 | 1@56567 | cleared [5] | You close the study door. |

