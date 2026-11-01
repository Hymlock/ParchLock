# Final combined gate (309x2): ec8d4a6a -> HEAD f2b552a0 + Sherlock pocket R3

- base: ec8d4a6a (last fully gated candidate). cand: f2b552a0 + `git apply claude-sherlock-pocket-R3-impl.diff` (js/ZRamReader.js, js/ModuleStatFactsClaude.js).
- Real-copy worktrees (`git -c core.longpaths=true worktree add --detach`), games/ and node_modules copied with robocopy /E /XJ.
- Serial: base gate, then cand gate, `N=8 GLULX=1 bash work/investigations/gate-parallel.sh`; 309/309 rows each (base.jsonl, cand.jsonl, base.log, cand.log).
- `regression-gate.cjs --diff base.jsonl cand.jsonl` -> diff.txt: 14 field differences in 9 games.
- Serial paired rerun of all 9 differing games (base worktree then cand worktree): rerun-base.jsonl, rerun-cand.jsonl, rerun-diff.txt (8 field differences in 5 games, all INTENDED, persist).

## sha256 (candidate)
```
bc9cf89eabe172166227aca724f8301eaef25da11e9bed8723c1866bfe295a14  js/ZRamReader.js
9afa23c896881b70609ede58f7bc0963138f0a2f1c4e5d66921498c050b07b10  js/ModuleStatFactsClaude.js
42311cd4b538e6a9c8252ca7bcd27df8551302f45ba6508c46e831896846e5ce  js/ActionSynth.js
```
Note: the main tree's working copy of js/ModuleStatFactsClaude.js hashes 8449193f... (differs from HEAD+diff); ZRamReader.js and ActionSynth.js match the main tree.

## Differences

| game | field | class | reason |
|---|---|---|---|
| Gumshoe.z5 | exits (+in>36, south>36), marks (+south) | INTENDED | Inform no-name-table attributeMap (722ac5c1): door exits now resolved; persists on rerun |
| heist.z8 | inv1, inv2 (+silver picture frame, student's photo) | INTENDED | attributeMap (3f588921): containers' contents in inventory; persists |
| minster.z5 | exits (+east>95, in>95), marks (+east) | INTENDED | attributeMap (722ac5c1): door exits; persists |
| Sherlock.z5 | inv1, inv2 (-pocket, -lapel; pound note kept) | INTENDED | Sherlock invHidden + pocket rule R3; persists |
| Sherlock.z5 | marks (-coat) | FLAKY | known intro "coat" mark timing race; cand rerun has coat again |
| cycles.z5 | rooms, inv2 | FLAKY | cand rerun = base (vanished) |
| gamlet.z5 | marks | FLAKY | cand rerun = base (vanished) |
| huntdark.z5 | marks | FLAKY | cand rerun = base (vanished) |
| vespers.z8 | marks | FLAKY | flips: base rerun equals cand's first value |

Totals: INTENDED 4 games (7 field diffs), FLAKY 6 (7 field diffs), REGRESSION 0.
harness/operator-regressions.js in cand: 13 PASS / 0 FAIL.

## Classification closeout (claude, author)
- **Result: 0 REGRESSION, 4 INTENDED, 6 FLAKY** (serial paired rerun of all 9 differing games; rerun-diff.txt).
  - INTENDED: Gumshoe/minster door exits (722ac5c1); heist frame/photo (3f588921); Sherlock inventory pocket/lapel labels withheld, note kept (2286cbdc R3).
  - FLAKY: Sherlock intro "coat" mark (did not reproduce on the candidate rerun: the known intro-mark race), cycles rooms/inv2, gamlet, huntdark, vespers (flipped direction).
- **Hash note.** The gated ModuleStatFactsClaude.js 9afa23c8 differs from the main-tree 8449193f only by line endings: CR-stripped, the main tree = HEAD dd3f4af6.
  - The committed 2286cbdc changes (f2b552a0..HEAD on facts + ZRamReader) are byte-identical in content to the gated R3 diff: the +/- line md5 is b6ac0ba0 on both sides. ZRamReader bc9cf89e and ActionSynth 42311cd4 match exactly.
- operator-regressions 13/0 in the candidate. Three-engine coverage: the 309 rows include ZIL, Inform Z and Glulx (GLULX=1).
