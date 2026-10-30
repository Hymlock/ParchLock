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

## R2 (adopting codex SEALED-amendment, #5565)
- Retention is expected, not a bug. Cleanup is optional and only runs from the Learned words Settings button. There is
  no auto-purge and no module-manager hook.
- Show an actual managed-bytes estimate: the sum of key+value lengths over the owned keys. We do not claim a global
  bound.
- Ownership is the exact manifest from P13.1. Aliases, header collisions and unknown keys are treated conservatively
  (kept).
- At click time, re-read ModuleLibrary's installed set and each owner record before erasing. Skip any identity that
  becomes installed or current between the listing and the confirm.
- Only the listed learning prefixes are removed. Installed modules' learning, and all maps, saves, transcripts and
  preferences, are untouched.
- Stale in-memory tables: erasing never targets the current identity. Other tabs: after erasing, write a
  `PL_LearningErased` stamp. Each store's write path skips persisting when its identity key is in the stamp's set and
  the store was hydrated before the stamp time; it re-hydrates on the next load.
- No booting every game and no network scan for cleanup. A store whose identity is unknown stays until its owner record
  exists.

## R3 (adopting codex D13-r1-attack.md, #5567; supersedes the P13 key-shape assumptions)
1. Exact managed keys. The owner manifest is written at each store's own write site: LearnedWords.write,
   AttrCalibrator persist, SemanticActions persist (whose key includes checksum/adapter/locale), ExitCalibrator persist,
   ZRamReader diagonal persist, StatTracker save, DirectionalRadial save (keyed by filename). Each write registers
   {key, kind, digest, path} into `PL_ModuleLearningOwner_v1` (a single JSON index, validated on read; malformed means
   ignored, and the erase is disabled with a status message). No key is reconstructed from a prefix or header.
2. Identity: registration happens when the store writes, so memory, header and digest exist at that point. Nothing runs
   before the VM. Glulx: only stores that actually write for Glulx register (DirectionalRadial, if any). There is no
   Z-header assumption.
3. The current story is protected explicitly, by both its digest and its path, even if it was uninstalled while open.
4. At confirm: re-read the installed set, the index revision and each key's current value. If any of these changed
   since the listing, abort and re-list. Each key is removed individually; the result reports removed/failed counts.
   A partial failure leaves the index entries for the failed keys.
5. Cross-tab: each store re-checks the index revision before persisting. If its key was erased after it hydrated, it
   drops the in-memory table rather than re-persisting it (a fresh start for that module).
6. Unknown or legacy keys (with no manifest entry) are never erased and are counted separately as "unmanaged".
7. Growth: the status line shows "about N KB (UTF-16 estimate)". "Small" is not claimed until per-store caps are
   reviewed; that is a separate D13b item (LearnedWords has no row cap today).
Tests: constructed collisions, aliases, reinstall race, partial failure, malformed index, the exact key formats of every
store, current-but-uninstalled, and cross-tab resurrection.
