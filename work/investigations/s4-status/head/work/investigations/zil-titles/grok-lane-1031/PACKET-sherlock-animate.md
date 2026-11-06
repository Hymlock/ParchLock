# PACKET sherlock animate: FL-ALIVE (vs FL-PERSON 47) bit 40

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run) for both ALIVE 40 and PERSON 47, with ALIVE-not-PERSON discrimination**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-LISTEN verbs.zil:1324 (ALIVE); V-LOOK-INSIDE verbs.zil:1445-1450 (PERSON -> "surgeon" first, then ALIVE -> "veterinarian").

## Evidence
Same run @26 (Marylebone Rd): ALIVE 40: LISTEN TO GUARD 155 =1, LOOK IN DOG 147 =1, LISTEN TO PIPE 218 =0. PERSON 47: LOOK IN GUARD =1 ("surgeon"), LOOK IN HOLMES 293 =1 ("surgeon"), LOOK IN DOG =0 then reads 40=1 ("veterinarian"). The dog is the native ALIVE-not-PERSON witness that sherlock-dispositions.md:52 asks for. Supplementary pigeon 290 @109 (separate run): 47=0 then 40=1 ("veterinarian"), a second ALIVE-not-PERSON object. Round-1 study runs: LISTEN TO HOLMES 40=1, LISTEN TO VIOLIN 40=0, LOOK IN HOLMES 47=1, LOOK IN VIOLIN 47=0.

### primary runs
- run run-sherlock-20261031T070120-36848.json sha256 867ab7415166bc2aca089d0b3f9a7799d3115d967d34ba75903017e6f6e71457; plan plan-sh-mar26b.json sha256 306113fb25463675f6dfd1fa7b98ebfcba5a1ea139d95ea63280f67a96c2c043

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @26 | LISTEN TO GUARD | 155 | 40 | 1 | TRUE | 5 | 1@59893 | - | At the moment, the guard is silent. |
| @26 | LOOK IN DOG | 147 | 40 | 1 | TRUE | 5 | 1@60206 | - | You're a general practitioner, not a veterinarian. |
| @26 | LOOK IN DOG | 147 | 47 | 0 | FALSE | 5 | 0@37852 0@37864 0@37852 0@37864 0@60195 | - | You're a general practitioner, not a veterinarian. |
| @26 | LOOK IN GUARD | 155 | 47 | 1 | TRUE | 5 | 1@32248 1@40792 1@37617 1@37852 1@37864 1@37852 1@37864 1@60195 1@32248 1@40792 | - | You're a general practitioner, not a surgeon. |
| @26 | LOOK IN HOLMES | 293 | 47 | 1 | TRUE | 5 | 1@37617 1@37852 1@37864 1@37852 1@37864 1@60195 | - | You're a general practitioner, not a surgeon. |
| @26 | LISTEN TO PIPE | 218 | 40 | 0 | FALSE | 5 | 0@59866 | - | At the moment, the pipe is silent. |

### supplementary runs
- run run-sherlock-20261031T065411-4336.json sha256 50efa43bedeb5f286e5a21cfaa547ab3fa54281fe89d99e85ee57353df0dc937; plan plan-sh-pig109.json sha256 7e72917254bc60a5ca66e55f8bbc77a61603f4323cb7dd3a8c23a8739095305a

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @109 | LOOK IN PIGEON | 290 | 40 | 1 | TRUE | 16 | 1@60206 | - | You're a general practitioner, not a veterinarian. |
| @109 | LOOK IN PIGEON | 290 | 47 | 0 | FALSE | 16 | 0@37852 0@37864 0@37852 0@37864 0@60195 | - | You're a general practitioner, not a veterinarian. |

- run run-sherlock-20261031T064541-51860.json sha256 5d8e56d2de217941396c4207436538bc98e7580f65de1e1a4905c2bacc343670; plan plan-sh-alive.json sha256 a8e49e8a6a1bc3490f45fe235db75927cc1112b21f0faf94a5f79d37b7571ae5

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LISTEN TO HOLMES | 293 | 40 | 1 | TRUE | 93 | 1@59893 | - | At the moment, Holmes is silent. |
| @4 | LISTEN TO VIOLIN | 207 | 40 | 0 | FALSE | 93 | 0@59866 | - | At the moment, the violin is silent. |
| @4 | LOOK IN SOFA | 239 | 40 | 0 | FALSE | 93 | 0@60216 | - | You cannot look inside a sofa. |
| @26 | LOOK IN DOG | 147 | 40 | 1 | NOTEST | 111 | - | - | You cannot see any dog here. |
| @26 | LOOK IN GUARD | 155 | 40 | 1 | NOTEST | 111 | - | - | You cannot see any guard here. |

- run run-sherlock-20261031T064603-50388.json sha256 c6842f5cc351ea4933cf3402f30f0b3027949ff9cc4d861aa1334fc02575acc6; plan plan-sh-person.json sha256 d5fb62537ab30dd476944685acddac48e5f9de3600f3062bd816b880d04f930e

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LOOK IN HOLMES | 293 | 47 | 1 | TRUE | 93 | 1@32248 1@40792 1@37617 1@37852 1@37864 1@37852 1@37864 1@60205 | - | You're a general practitioner, not a surgeon. |
| @4 | LOOK IN VIOLIN | 207 | 47 | 0 | FALSE | 93 | 0@37617 0@37852 0@37864 0@60195 | - | You cannot look inside a violin. |
| @26 | LOOK IN GUARD | 155 | 47 | 1 | NOTEST | 111 | - | - | You cannot see any guard here. |
| @26 | LOOK IN DOG | 147 | 47 | 0 | NOTEST | 111 | - | - | You cannot see any dog here. |

