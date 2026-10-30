# D13 module learning stores: compare + proposal R1 (claude, 2026-10-30)
Halves: claude learning-uninstall/claude-SEALED.md; codex oct30-recovery/module-learning-blind/SEALED-findings.md.
Both were sealed before either half was read.

## Agree
- These module-scoped stores persist across saves and starts and are never cleared on uninstall (removeFlags/removeLocal/
  hideBuiltIn): LearnedWords, AttrCalib, ExitCalib, DiagonalCalib, SemanticActions.
- Keys are header release+serial, not the executable digest.
## Codex adds (accepted)
- PM_Stats_ (StatTracker) is durable too. Classification is needed: operator rule is stats/deaths are per-save
  (PlaythroughState is authoritative, StatTracker.syncPlaythrough). Treat PM_Stats_ as a module cache under the erase
  action, not as learning.
- DirectionalRadial custom slices are per module and retained. These are user customisations, so they go under the same
  erase action.
- Actionable ranking counters are memory-only by contract decision. They are out of scope here (raise separately if the
  operator wants usage learning persisted).
- Do not persist unconfirmed semantic evidence or fiction state.
## Operator rulings (verbatim in claude half)
Retain on uninstall (a reinstall gets them back), provided they stay small. Add an option to erase them for every
uninstalled module, in Options > Learned words (WorkspaceUI.js:139/361).

## Proposal P13
1. Ownership index. Whenever a story's identity is captured (ModuleLibrary captureExecutableIdentity, with mem available
   at first VM boot), record `PL_ModuleLearningOwner_<gameIdentityKey>` = {digests:[...], paths:[...]} (bounded, deduped).
   This maps release+serial keys to installed modules without a global prefix purge.
2. The erase action "Erase learned data for uninstalled stories" (button plus confirm, with a status line) is in the
   Learned words group. For each owner record whose paths/digests are not in the current ModuleLibrary installed set,
   remove exactly the keys built from the known prefixes for that identity key:
   PL_LearnedWordOverrides_, PL_AttrCalib_, PL_SemanticActions_, PL_DiagonalCalib_, ExitCalibrator.storageKey form,
   PM_Stats_, DirectionalRadial StorageKey form, and the owner record. Stores with no owner record (from before the
   index existed) are listed by prefix scan only if their identity key matches no installed module's identity. If
   identity is unknown, keep the store (fail-safe toward keeping user data).
3. The currently running story is never erased (its identity is in the installed set by definition).
4. Size: report the total bytes for those prefixes in the status line; add a per-store cap check (LearnedWords already
   caps rows; verify the others) in the audit. No migration (no backwards compatibility).
5. Collision (same release+serial, different digest): owner records hold several digests, and erase only when none of
   them is installed. Re-keying by digest is out of scope.
Validation: a constructed localStorage harness (installed vs uninstalled vs unknown vs current), a UI check of the row in
Options > Learned words, then operator 13/0 and the three-engine gate.
