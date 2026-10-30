# Audit: codex E5 z3-settled-raw-r2 (Zork III worn custody, Drop vs remove)

Auditor: claude (read-only). HEAD d0dd25c. Artifact: work/mapping-research/items-codex/resume-20261020/oct30-recovery/z3-settled-raw-r2/candidate.patch (269 lines, 7 js files, LF only).

## Verdict: ACCEPT (as research candidate; integration hold stands)

## 1. Apply
- `git apply --check` (plain, no whitespace flags) against HEAD: OK. CRLF issue from prior audit resolved (0 CR bytes).
- js/ModuleStatFactsClaude.js is NOT dirty in the main checkout at audit time (`git status --short js/` empty); hunk applies to HEAD's version (rebased below the r44 D1 comment block at dce7e6f7..., line ~146).
- Artifact js/ copies are byte-identical to HEAD+patch for all 7 files.

## 2. Hunk review
- Actionable.js:1328 now routes the primary-command check through `radialCommandCurrent`, which still contains `!c.learnedWordScope || ... LearnedWords.commandCurrent(c)` (patched Actionable ~2762). Learned-word guard PRESERVED; prior issue resolved.
- Actionable.js radialCommandCurrent (~2759-2761): shared commands carrying any wornRemovalScope rejected; single scoped commands re-derived via ActionSynth.wornRemovalCommandCurrent. Fail-closed.
- Actionable.js sharedObjectCommands (~2746-2748): scoped drops excluded from multi-object intersection (redundant double filter, harmless).
- AttributeSchema.js wornRemovalForm (+756-778): requires live-mem identity, fact.equipmentState.wornRemoval==="drop", no worn attribute, no Inform names, v3-5 confirmed/validated ZIL family, wearable bit == fact map, measured unambiguous player, parent==player and wearable bit set. Every branch returns null on doubt. Good.
- ActionSynth.js wornRemovalScopeFor (+297-316): single inventory match, D198 grammar has bare `drop OBJ`, unique+verified reference, executable digest, authoredCommandAllowed. wornRemovalCommandCurrent re-derives and compares all scope fields + command + objectId. Good. Only applied when context inventory, no container, not allowAmbiguousReference.
- EquipmentUI.js (+50-120): scoped descriptor must pass radialCommandCurrent at build and again at select (selectYourselfAction re-checks digest/noun/command/objectId before running). When scopedRemoval exists, unscoped "drop" candidates are filtered out, so a stale scope yields no Drop rather than an unproven one (missing over wrong). Good.
- LearnedWords.js:150, SemanticActions.js:352/377: scope propagated; winner only inherits scope when command and objectId match. Good.
- ModuleStatFactsClaude.js +146-147: Zork III digest gains equipmentState {wornWhen:"wearable-direct-player", wornRemoval:"drop"}. Note (non-blocking for research): comment is "PROTOTYPE ONLY"; before integration it needs the usual source-evidence comment (ZIL V-REMOVE/V-DROP custody citation) and native/on-device proof per the artifact's own stated hold.

## 3. Runs (temp worktree at HEAD + patch, real copies of games/ and node_modules/, removed after)
- harness/operator-regressions.js: 13 PASS / 0 FAIL
- harness/equipment-ui.js: 119 PASS / 0 FAIL
- harness/zil-direct-player-worn.js: 20 passed
- harness/zil-garment-worn-domain.js: 42 passed
- harness/d198-semantic-provenance.js: 31 pass / 0 fail
- harness/d88-semantic-parity.js: AssertionError "fixture 2 still exercises the nested-container branch" -- fails identically on unpatched HEAD (pre-existing, not caused by patch).
- Artifact controls: consumer-controls 17/0, selector-controls 28/0; public-resolver-controls and more-prior-controls reach their final write and refuse to overwrite existing evidence (r3: 24/0, r1: 18/0), i.e. all assertions passed on rerun.
- ZIL/Inform/Glulx regression-gate.cjs not run (research-only, no commit).
