# D198 Sherlock single-value layout - 309x2 gate (claude, 2026-10-31)
base = ../wt-claude-d198-base (HEAD dfd11a53, real copies, 0 reparse points); cand = ../wt-claude-d198 (HEAD + batch-d198.diff).
`OUT=... N=8 GLULX=1 bash work/investigations/gate-parallel.sh` in each; 309 rows each. Diff: diff.txt (6 differences).

| Game | Field | Class | Detail |
|---|---|---|---|
| Sherlock.z5.js | exits | INTENDED | base [] -> cand ["in>null","west>null"]: D198 now validates Sherlock, so d214 direction props 52-63 link; the opening room's IN/WEST exits become known (destinations not resolved at gate time, null). |
| Sherlock.z5.js | marks | INTENDED | ["coat"] -> ["coat","west"]: compass word now recognised as a direction via d214 linkage. |
| Jigsaw.z8.js | marks | FLAKY | listed flaky; z8 Inform, decodeD198 + d214 proven identical to HEAD (d198-single-value-layout.js). |
| Mulldoon.z8.js | marks | FLAKY | same. |
| gamlet.z5.js | marks | FLAKY | same. |
| suvehnux.z5.js | marks | FLAKY | same. |

Result: only Sherlock changes for cause; 0 REGRESSION.
Harnesses (cand): d198-single-value-layout 813 checks PASS (263 Z titles identical to HEAD except decoderVersion; mutations a-h + P1=none nonzero value rejected);
d198-grammar-decoder 80 PASS (Sherlock assertion updated from rejected to admitted); contract-matrix, provider-completeness, exit-valve 14/0,
semantic-provenance 31/0 PASS; operator-regressions 13/0. d198-lifecycle, d198-loader-identity, d198-grammar-shadow fail identically on base HEAD (pre-existing, unrelated).
