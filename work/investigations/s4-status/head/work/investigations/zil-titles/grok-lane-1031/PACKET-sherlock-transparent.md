# PACKET sherlock transparent: FL-TRANSPARENT bit 2

Author: grok (bus seat grok). Lane: grok-lane-1031. Status: **PASS (single run)**. Not self-reviewed; needs an adversarial non-author review and an explicit ACCEPT from all 4 seats (ruling #5761). No facts written.

## Provenance
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e).
- Helper: work\investigations\zil-titles\grok-lane-1031\probes\g1-batch-sherlock-yn.cjs sha256 bf05170e876c822fe23e9fbc456e7f2d655ee21b7a717bf8d7e41ea0da17abbc. It is a copy of work/investigations/grok1/batch/g1-batch-sherlock.cjs (sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db) with one changed line: settle() answers a "press Y or N" CharInput prompt with G1YN (default n) instead of Space. Route = jericho sherlock; RNG forced to seed 0 (disclosed). G1PLAYER=232. 48-bit v5 attribute snapshots. Verdict = test_attr ops on (id,bit) during the command (TRUE/FALSE/NOTEST); judge PASS = >=2 distinct TRUE positives + >=1 FALSE negative in one run group.
- Method caveat: tests at step i run in plan order before route step i in one live walk (no save/restore), so tests consume turns; later-step tests are placed in plans with no earlier tests.

## Source semantics
V-LOOK-THRU verbs.zil:1520/1524 (PRSI ISNOT TRANSPARENT -> "can't look through"; IS TRANSPARENT -> "nothing interesting through"); charles.zil:185 (MELT HEAD FSETs FL-TRANSPARENT on TH-WAX-HEAD -> "wax pool"); charles.zil:199 (MELT AX FSETs FL-TRANSPARENT on TH-WAX-AX -> "melted axe"); V-LOOK-INSIDE verbs.zil:1452; V-EXAMINE verbs.zil:875.

## Evidence
Single run 071202 @44 (after route step 43 MELT HEAD): EXAMINE TORCH THROUGH POOL reads 179 bit2=1 ("You do not see anything unusual through the wax pool"); setup GET AX then MELT AX WITH TORCH (attr diff on 259 sets [2,5,9,22], i.e. TRANSPARENT/OPENED/CONTAINER per charles.zil:198-200); EXAMINE TORCH THROUGH MELTED AX reads 259 bit2=1 ("nothing interesting through the melted axe"); EXAMINE POOL THROUGH PIPE reads 218 bit2=0 ("can't look through the pipe"). Both positives are runtime FSETs from source (disclosed); setup steps are NOTEST by design (judge ignores NOTEST). Supplementary: static phial 128 @4 LOOK IN/EXAMINE PHIAL 2=1 vs black bag 2=0 (run 064802); pool TRUE reproduced in 4 further runs. Magnifying glass 270 action intercepts LOOK-THRU (NOTEST).

### primary runs
- run run-sherlock-20261031T071202-21732.json sha256 7374280aab09338a05648f20fa264faeee0d4909734eb08ecb6ddfe559f9b5a4; plan plan-sh-wax44e.json sha256 c913e099481deb9b0fbba5ed35f090df55e5b3b83e2886f595f8cd822d60ab50

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60493 1@60506 | - | You do not see anything unusual through the wax pool. |
| @44 | GET AX | 259 | 2 | 1 | NOTEST | 1 | - | set [3] cleared [25,32] | You take the axe off of the statue of Charles I. |
| @44 | MELT AX WITH TORCH | 259 | 2 | 1 | NOTEST | 1 | - | set [2,5,9,22] cleared [3,4,19,33,39] | The axe melts into a pool of wax on the floor. The pipe has gone out. |
| @44 | EXAMINE TORCH THROUGH MELTED AX | 259 | 2 | 1 | TRUE | 1 | 1@60476 1@60496 | - | You do not see anything interesting through the melted axe. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. |

### supplementary runs
- run run-sherlock-20261031T064802-36588.json sha256 795420f840005b9dcd6367892f9d1ca3f4b80b2a94cf599665cb6cb343cc5a28; plan plan-sh-transp.json sha256 01c3aa66f06927c2ff32e7acec018a432b67f55d93047a3bcd50358e6779fd51

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LOOK IN PHIAL | 128 | 2 | 1 | TRUE | 93 | 1@32229 1@40809 1@60236 | - | In the phial you see a clear, colourless liquid. |
| @4 | EXAMINE PHIAL | 128 | 2 | 1 | TRUE | 93 | 1@32229 1@40809 1@57669 1@60217 | - | In the phial you see a clear, colourless liquid. |
| @4 | LOOK IN BLACK BAG | 172 | 2 | 0 | FALSE | 93 | 0@32229 0@60217 | - | You would have to open the black bag to do that. |
| @14 | LOOK IN AMPOULE | 140 | 2 | 1 | NOTEST | 93 | - | - | You cannot see any ampoule here. |
| @14 | EXAMINE ETHERIUM GAS | 139 | 2 | 1 | NOTEST | 93 | - | - | You cannot see any etherium gas here. |
| @67 | EXAMINE TELESCOPE | 185 | 2 | 1 | NOTEST | 3 | - | - | You cannot see any telescope here. |
| @67 | LOOK THROUGH TELESCOPE | 185 | 2 | 1 | NOTEST | 3 | - | - | You cannot see any telescope here. |

- run run-sherlock-20261031T065926-43412.json sha256 4d4ff04589fee752c2b3713cd06937c884a956998ae3bc312c687e9893768219; plan plan-sh-wax44.json sha256 53e996d53a745ae526e24dad78968290592d55fd61c78ed5782053fef29deaf8

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @44 | EXAMINE TORCH THROUGH POOL | 259 | 2 | 1 | NOTEST | 1 | - | - | You do not see anything unusual through the wax pool. |
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60476 1@60496 | - | You do not see anything interesting through the wax pool. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. The pipe has gone out. |

- run run-sherlock-20261031T070457-45936.json sha256 8f470f032f67f55c2037c04ed29c6b5d41fa9787df8fca6a02152103d249a593; plan plan-sh-wax44c.json sha256 b29d800706188a22ee7f627da1a9087aabc5388c55ec70b2b9937d37c1c6d189

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60493 1@60506 | - | You do not see anything unusual through the wax pool. |
| @44 | EXAMINE EMERALD THROUGH GLASS | 270 | 2 | 1 | NOTEST | 1 | - | - | You would have to be holding the emerald to get a really good look at it. |
| @44 | EXAMINE TORCH THROUGH GLASS | 270 | 2 | 1 | NOTEST | 1 | - | - | You train the magnifying glass on the torch. It appears much larger now. The pip |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. |

- run run-sherlock-20261031T065250-6772.json sha256 bd03279438eca2a8740fc2bd97f9b90e367a32504922f37b20f66586520ea107; plan plan-sh-thru15.json sha256 78224ba80a3344ed42012d332c0200863491e42e22e04c85d89d75fbea447470

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @15 | EXAMINE VIOLIN THROUGH NEWSPAPER | 289 | 2 | 0 | FALSE | 93 | 0@60493 | - | You can't look through the newspaper. |
| @15 | EXAMINE VIOLIN THROUGH GLASS | 270 | 2 | 1 | NOTEST | 93 | - | - | You train the magnifying glass on the violin. It appears much larger now. |

- run run-sherlock-20261031T070545-46056.json sha256 9520ff524a47cfb8d3a335b47a9c674dfd00493839df78515467d45823cba691; plan plan-sh-transp36.json sha256 b181015f580a35ba6478f205b6bd3b2684b9738d732d3dafaf2fe8a95dd162c8

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @36 | LOOK IN PHIAL | 128 | 2 | 1 | NOTEST | 1 | - | - | You cannot see any phial here. |
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60493 1@60506 | - | You do not see anything unusual through the wax pool. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. |

- run run-sherlock-20261031T070618-20832.json sha256 43a7ea60e1e55da2130202582372bf2f1914046244a5aa861b8c7bebe469132f; plan plan-sh-transp45.json sha256 b7503970becf1d8759f9a5b02cb05740a374e249a9bbd3b85259c547d1025369

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60493 1@60506 | - | You do not see anything unusual through the wax pool. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. |
| @45 | LOOK IN PHIAL | 128 | 2 | 1 | NOTEST | 1 | - | - | You cannot see any phial here. |

- run run-sherlock-20261031T070400-56988.json sha256 352d302f3f269fcbaf0bb344f061156ac070f788da083792ce3fd0725dadb375; plan plan-sh-transp2.json sha256 d1aae0c118b4d2dbb5044c2ee05a51d99589ddd8b86770f417ef28465a529c22

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @4 | LOOK IN PHIAL | 128 | 2 | 1 | TRUE | 93 | 1@32229 1@40809 1@60236 | - | In the phial you see a clear, colourless liquid. |
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | NOTEST | 111 | - | - | You cannot see any pool here. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | NOTEST | 111 | - | - | You cannot see any pool here. |

- run run-sherlock-20261031T070145-45600.json sha256 ab2ad7468364b74c9e94d07f362e9a1509cf14d0f139ceec63d39ddac63edc9e; plan plan-sh-wax44b.json sha256 69f5f633f070b120d63f2c2b93bc96a57afcf4e8d534f3e4fed365062646b6c3

| step | command | obj | bit | expect | verdict | here | test_attr reads (val@pc) | attr diff | text |
|---|---|---|---|---|---|---|---|---|---|
| @44 | LOOK IN PHIAL | 128 | 2 | 1 | NOTEST | 1 | - | - | You cannot see any phial here. |
| @44 | EXAMINE TORCH THROUGH POOL | 179 | 2 | 1 | TRUE | 1 | 1@60493 1@60506 | - | You do not see anything unusual through the wax pool. |
| @44 | EXAMINE POOL THROUGH PIPE | 218 | 2 | 0 | FALSE | 1 | 0@60476 | - | You can't look through the pipe. |

