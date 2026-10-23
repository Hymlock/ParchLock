# Border Zone edible-pair gate record (claude, 2026-10-22)

## Trees and freeze
- Base `../wt-claude-edible-base-20261022`: `git worktree add --detach` at HEAD 3f1fd5d, `games/` copied (cp -r, not linked).
- Candidate `../wt-claude-edible-cand-20261022`: same, then copied js/ModuleStatFactsClaude.js, js/AttributeSchema.js,
  js/ActionSynth.js, harness/zil-authored-edible.js from the working copy.
- PRE-RUN record (honest scope): no manifest file was written before the run. The only pre-run record is the sha256
  prefixes printed in the claude session when the trees were made, for the three changed js files:
  base 64115981efe0dda3 / 2b1a5190c735a6b8 / 6e0beeaff803e072; cand e0c5094fac95e5de / 0400d02fea48c16b / e8b80dcd1bbaecb1
  (order: ModuleStatFactsClaude, AttributeSchema, ActionSynth).
- POST-RUN manifest: post-run-manifest.json (make-manifest.cjs): every js/*.js, play.html and all 309 games/*.js in both
  trees + git HEAD/status. The three js prefixes equal the pre-run prefixes above; base status clean; candidate status
  only the 3 js + harness; jsDiffers = exactly those 3 files; gamesDiffer 0 of 309.

## Commands
Full gate (8 shards, run from the main checkout so node_modules/playwright resolve; ROOT selects the tree):
  for T in base cand; for i in 0..3: GLULX=1 ROOT=../wt-claude-edible-$T-20261022 SHARD=$i/4 OUT=$T-$i.jsonl node work/investigations/regression-gate.cjs
  cat $T-*.jsonl > $T.jsonl; node work/investigations/regression-gate.cjs --diff base.jsonl cand.jsonl > diff.txt
Paired same-state reruns (both trees concurrently, twice):
  GS=Inevita.z5.js,Mask.z5.js,jet.z8.js,vespers.z8.js; for run in 1 2: ROOT=<tree> GAMES=$GS OUT=rerun$run-<T>.jsonl node work/investigations/regression-gate.cjs
  then --diff run1 base/cand, run2 base/cand, base run1/run2, cand run1/run2.
Results: diff.txt 4 marks differences; rerun1 base-vs-cand jet only, rerun2 0, base-vs-base 0, cand-vs-cand jet ->
all four FLAKY, 0 REGRESSION.
operator: operator-full.txt (complete output, 13 PASS / 0 FAIL); operator.txt is its last two lines.
