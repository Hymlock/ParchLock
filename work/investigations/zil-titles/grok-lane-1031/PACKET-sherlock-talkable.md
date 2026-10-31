# PACKET sherlock talkable: FL-PERSON bit 47

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-ASK-ABOUT verbs.zil:394, V-TELL-ABOUT verbs.zil:2654; sherlock-dispositions.md:37 (talkable = FL-PERSON 47, native ASK/TELL).

## Evidence
@26: ASK GUARD ABOUT DOG (guard replies) and ASK HOLMES ABOUT DOG (Holmes replies) read 47=1; ASK DOG ABOUT GUARD reads 47=0 (non-conversational "gnaws on your leg"). Supplementary @4 run: ASK HOLMES ABOUT VIOLIN, TELL HOLMES ABOUT SLIPPER =1, ASK VIOLIN ABOUT HOLMES =0.

### primary runs
- run run-sherlock-20261031T070120-36848.json sha256 867ab7415166bc2aca089d0b3f9a7799d3115d967d34ba75903017e6f6e71457; plan plan-sh-mar26b.json sha256 306113fb25463675f6dfd1fa7b98ebfcba5a1ea139d95ea63280f67a96c2c043

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @26 | ASK GUARD ABOUT DOG | 155 | 47 | 1 | TRUE | 5 | 1@32248 1@40792 1@32248 1@40792 1@37617 1@37852 1@37864 1@37852 1@37864 1@32248 1@40792 | - | The guard says, "Sorry, sir. On duty, you know." |
| @26 | ASK HOLMES ABOUT DOG | 293 | 47 | 1 | TRUE | 5 | 1@37617 1@37852 1@37864 1@37852 1@37864 | - | "It's not the Hound of the Baskervilles. But I certainly wouldn't care to make i |
| @26 | ASK DOG ABOUT GUARD | 147 | 47 | 0 | FALSE | 5 | 0@37852 0@37864 0@37852 0@37864 | - | The dog gnaws on your leg briefly in response. |

### supplementary runs
- run run-sherlock-20261031T064925-40564.json sha256 6f283b9bbd9252bc7c0f7b54f3e6865f6d9de3b119f6d7eb114f7d18f3dd0c60; plan plan-sh-talk.json sha256 c4cc29a0ece02c1b164a9f69643cd1d3e77cb6e48d42e60163a29c8f2e64b382

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | ASK VIOLIN ABOUT HOLMES | 207 | 47 | 0 | FALSE | 93 | 0@37617 0@37852 0@37864 | - | It is not likely that the violin would respond. |
| @4 | ASK HOLMES ABOUT VIOLIN | 293 | 47 | 1 | TRUE | 93 | 1@32248 1@40792 1@32248 1@40792 1@37617 1@37852 1@37864 1@37852 1@37864 | - | Holmes seems to hear you, but he does not respond. |
| @4 | TELL HOLMES ABOUT SLIPPER | 293 | 47 | 1 | TRUE | 93 | 1@32248 1@40792 1@32248 1@40792 1@37617 1@37852 1@37864 1@37852 1@37864 | - | Holmes seems to hear you, but he does not respond. |
| @26 | ASK GUARD ABOUT DOG | 155 | 47 | 1 | NOTEST | 111 | - | - | Those things aren't here. |
| @26 | ASK DOG ABOUT GUARD | 147 | 47 | 0 | NOTEST | 111 | - | - | Those things aren't here. |

