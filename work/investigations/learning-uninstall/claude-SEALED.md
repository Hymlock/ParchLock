# Learning stores vs module uninstall - claude half (SEALED 2026-10-30)
Problem (operator): module-level learning (learned words etc.) must persist across saves and starts for as long as the
module is installed, and must be erased only when the module is deleted.
Findings:
- These stores persist in localStorage, keyed by ZRamReader.gameIdentityKey = release + "-" + serial (ZRamReader.js:821).
  They are independent of saves, and SaveState never clears them.
  - PL_LearnedWordOverrides_ (LearnedWords.js:20/41)
  - PL_AttrCalib_ (AttrCalibrator.js:942/958)
  - PL_SemanticActions_ (SemanticActions.js:656/698)
  - ExitCalibrator.storageKey (ExitCalibrator.js:404-424)
  - PL_DiagonalCalib_ (ZRamReader.js:847/862)
- Gap: ModuleLibrary.removeFlags (ModuleLibrary.js:511-526) and removeLocal (:555) remove the flags, the inventory warning,
  SaveState.removeStory and the transcript, but none of the learning stores. They survive delete and return on reinstall.
- Secondary: the key is release+serial, not the executable digest. Two different files with the same release/serial
  would share learning stores.
Leaning: uninstall clears every module-scoped learning store for that module's identity (and digest). Consider keying by
digest, without migration (no backwards compatibility).

## Operator ruling (2026-10-30, after the seal)
"I don't mind if it remains on there as long as it's not taking up a lot of space that way it's still on there if a user
reinstalls a module. Although there should be an option in settings to erase them all for any uninstalled module if the
user wants."
So retention on uninstall is intended. New work: (1) a Settings action that erases the learning stores of every module
that is not installed; (2) a check that the retained stores stay small (size bound per store).
- Placement (operator, 2026-10-30): "This setting should live in the learned words section of the settings along with the rest of the settings for learned words." That is the Options "Learned words" group (WorkspaceUI.js:139 groups.learned, rows added ~361). Its description "Choose the labels shown in your editor" may need widening to cover the erase action.
