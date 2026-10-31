# Identity Wear R3 — implementation gate (claude, 2026-10-31)

Proposal PROPOSAL-identity-wear-r3.md sha 4a1e90a7bec29faa...; packet IMPLEMENT-PACKET-identity-wear-r3.md with codex correction
(codex-votes-0231.md): instruction 3 = strip Wear for ground/out-of-scope owners; PRESERVE identity-qualified Wear for an
actually direct-held owner in any caller kind (policy 6). Wear is injected AFTER kind filtering in commandsForObject.

Worktree ../wt-claude-wear at HEAD 22fb9fc3 (games/node_modules robocopy /E /XJ real copies, 0 reparse points); base ../wt-claude-wear-base at HEAD.
Diff: work/investigations/zil-titles/wear-impl/batch-wear.diff. No commit.

## Code
- js/ActionSynth.js: `identityWearScopeFor(obj, name)` (exact digest + ModuleStatFactsClaude[digest]===executableLayoutFacts, strict
  wearForms {objects,verb:"wear",scope:"held-direct"}, validated confirmed-zil-family, bare 1-object WEAR template + dictionary,
  true object frontier, parent === resolved player, measured wornAttribute clear, unique verified noun === command noun) ->
  scope {kind, digest, generation, id, noun, command}; `identityWearCommandCurrent` re-derives at tap. Injected inside
  commandsForObject after the room/inventory filters; never for nested rows or worn objects.
- js/Actionable.js: radialCommandCurrent re-validates identityWearScope; shared (multi-object) rows exclude it.
- js/SemanticActions.js: identityWearScope carried through migration-compat and dedupe.
- js/ModuleStatFactsClaude.js: wearForms Infidel [2] (worn 22), LH [203,104] (worn 3), Starcross 1d9a6925...678c [144] (worn 24).
  LH ring and Starcross junk 176 stay out. Remove/wornAttribute behaviour unchanged.
- harness/zil-identity-wear.js (new).

Disclosed: LearnedWords provider-row list uses independentForms (attribute rules), so identity Wear is not listed there as a
learnable row; the LearnedWords room-kind commandsForObject call itself returns Wear for a held owner (tested).

## Harnesses
| harness | result |
|---|---|
| zil-identity-wear.js | 48 / 0 (held-unworn Wear main/payload/semantic/Equipment; room-kind+evidence held keeps Wear; worn -> Remove/Drop no Wear; ground none; nested none; non-owner none; malformed/drift absent; no WEAR template absent; tap generation/worn/custody/noun/digest; only 3 digests carry wearForms) |
| equipment-ui.js | 119 PASS / 0 FAIL |
| zil-direct-player-worn.js | 20 passed |
| zil-garment-worn-domain.js | 42 passed |
| zil-enter-forms.js | 7 passed |
| operator-regressions.js | 13 PASS / 0 FAIL |

## 309x2 gate (gate-parallel.sh N=8 GLULX=1)
309/309 rows each side. 6 differences, all Inform (no wearForms fact can activate there):
Help, Mulldoon, jet, medusa, permagic, suvehnux (marks).
Rerun of those 6 base-vs-base: 4 of 6 differ from the first base run (load-dependent marks). Rerun base vs cand: only Mulldoon
differed; two serial candidate Mulldoon runs show the base marks ["piece of blue coral"]. Classification: all 6 NOISE
(parallel-load nondeterminism), 0 REGRESSION, 0 INTENDED walk diffs (Wear is a radial-option change not exercised by the gate).
