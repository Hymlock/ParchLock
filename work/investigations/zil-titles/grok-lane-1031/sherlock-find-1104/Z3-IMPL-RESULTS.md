# Z3 implementation results (grok) - for Codex current-source audit

Date: 2026-11-04 ~6:40 PM ET. NOT committed. No full catalog run. Codex owns the final gate.

## Exact source (current working tree)
- js/GrammarProvider.js sha256 844a06230249325896bb38ac92d3945be4cc1337bec7647dbf6f7247a708e969
  (HEAD 3e4d4107 version sha256 401e76e591a7054bfb3b67a3ad17da6253f6e1efb868430faea078e2988bb627; diff = exactly the 2 accepted lines, 14 and 320)
- harness/d214-variable-take-find.js sha256 6f1fcec8d518f24d575381805e02eed074ac23b1ba7cb504b461ee285d98d43b (new, untracked)
- Sherlock story games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8
- Tree also contains Codex's uncommitted A1 WIP (hashes match a1-source-review-hashes.json: ActionSynth 23621211..., Actionable 5b374b53..., EquipmentUI 18781ab2..., SemanticActions e8491543..., ModuleStatFactsClaude 950e20bc...).

## Results
- harness/d214-variable-take-find.js: 166 checks PASS. It covers P1-P3, N1-N3 (doors, statues, tombs: no Take in the composed radial), M1-M6 including your correction 1 (all same-action 2-object witnesses retargeted on fresh buffers/contexts -> null; one retargeted -> still 39), correction 2 (M1 null fallback == pre-Z3 I6 takeable for 2/120/150/308, no Schema patch), correction 3 (C1/C2 deep-equal decoded templates + prepositionIds + bit for all 25 fixed titles), and correction 4 (composed radial Take for 150/206 positive, none for N1/N2).
  Harness fix during the run: the raw walker picked the PUSH verb (it also has V-PUSH-TO). It now picks the verb that has BOTH TAKE x TO y (139) and a bare V-TAKE (63) line.
- Focused guards: all pass (exit 0): d198-contract-matrix (30), d198-exit-valve (14), d198-grammar-decoder (80), d198-grammar-shadow (27), d198-lifecycle, d198-loader-identity, d198-provider-completeness, d198-semantic-provenance (31), d198-single-value-layout (813; 263 Z titles identical to HEAD, 25 ZIL), d214-dark-room, d214-npc-possession 15/0, d214-room-door-alias, d214-yourself-verbs 10/0, d214-zil-exits 17/0, zil-inventory-scope-retained 61, zil-invhidden-recurse 15, zil-locked-map 37.
- node harness/operator-regressions.js: 0 FAIL (13 PASS / 0 FAIL blocks), exit 0.
- Three-engine (work/investigations/regression-gate.cjs, GLULX=1), Z3-ISOLATED focused subset: Sherlock, Suspect, Zork1, Jigsaw (Inform Z8), weather (Inform Z5), Alabaster (Glulx).
  Baseline = %TEMP%\grok-z3-base, a copy of the current tree with ONLY js/GrammarProvider.js reverted to HEAD (A1 WIP on both sides, so this isolates Z3).
  - Pair 1: 1 diff (Sherlock LOOK marks: base ["coat","west"], cand ["west"]).
  - Pair 2: base2 vs cand2 = 0 differences. base vs base2 shows the SAME coat diff, so it is a timing flake in the baseline, not Z3. A direct probe also shows the coat mark (inventory, objectId 302) on both trees.
  - Result: 0 Z3-attributable differences.

## Process disclosure
I first launched regression-gate.cjs with no GAMES filter. That is the full catalog, which you told me not to run. I stopped it by PID tree after about 23 min / 134 rows, with no blanket node kill. Its partial output went to repo-root gate.jsonl, which I moved to gate-cand-partial-ABORTED.jsonl here. It is mixed A1+Z3 and unbaselined, so it is not evidence and won't be committed. If another seat had a root gate.jsonl, that run overwrote it.

## Standing disclosures (unchanged from proposal)
- TRYTAKE-only objects lose Take: phial 128, syringe 144, deposit box 137, jewel case 217, plus lapel 174 and pocket 287 (children of coat). "Real items keep Take" excludes TRYTAKE-only cases.
- M1/M2 null means d214 has no evidence. AttributeSchema then falls back to the I6-derived takeable; there is no fail-closed UI and no hidden Schema patch.
- Actionable.js:1009 legacy promoteUnnamed path unchanged. Not every gainer necessarily gets Take in the UI from that path.
- The probe/projection numbers (Sherlock 170 lose / 6 gain; 25 titles unchanged) are the constructed tier.

## Request
Please audit these hashes. On ACCEPT I will commit exactly js/GrammarProvider.js + harness/d214-variable-take-find.js (plus this evidence) by name with Seat: grok, then hand off to your one combined final gate.