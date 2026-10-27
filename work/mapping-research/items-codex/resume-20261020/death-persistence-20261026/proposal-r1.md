# Death persistence R1 — proposal before implementation

## User behavior and amendments

Deaths are cumulative history of one human playthrough, not a value rolled backward with VM saves. Reopening/quitting and older saves in that playthrough preserve the accumulated total. Explicit accepted RESTART or explicit UI Start/Restart New Game starts a distinct run at0; restoring a save from a prior run returns to its own history. Module/page reload alone does not erase event history. This explicitly amends D204 module-load reset while retaining D178/D180 current-reading invalidation, D215 save ownership and ending-detection/dedup. Wins, already paired with deaths, follow the same run lifecycle and are tested explicitly. No changes to what qualifies as an ending.

## Ownership/data

Extend existing SaveState rather than engine or story assets. Exact executable digest is the namespace. Maintain a durable active-run pointer and a durable record per opaque run ID, separate from learned PM_Stats. Record schema/story/id/nonnegative safe-integer deaths/wins plus internal counted episode keys. Only internally generated run IDs with a strict bounded ASCII grammar are storage-key inputs. New IDs use crypto UUID where available, safe fallback nonce, never game RNG override.

Each successful native SAVE's existing sidecar includes optional playthrough {id,deaths,wins}; id links to current ledger record. Named save snapshots do not own the latest total: current ledger remains authoritative, and older totals merge by max only for the SAME exact story+run ID. Do not take max across all runs or trust module-stat cache as run identity. Internal seen-episode keys prevent duplicate count in a running/restored page; exported snapshots carry counts/id, not live readings or game state.

StatTracker keeps detection, episode framing and display. On model initialization/resync it clears current readings as today, then reads selected run totals. On a newly accepted ending it records the existing episode key once through SaveState and adopts returned totals. Replayed transcript/startup output remains excluded; a fresh actual engine ending during an accepted RESTORE retains D215 A2 behavior. SaveState must synchronize before late StatTracker.observe/load can wipe or overwrite the selected run. Re-read durable record before increments; retain unsaved in-memory counts if storage fails, report failure honestly. No claim of a cross-tab transactional guarantee.

## Lifecycle and missing data

- Lazy selection uses exact digest only and reuses its persisted active pointer on page reopen. No digest => do not write an unknown/shared namespace; preserve current-page events until the exact identity is available and the same story context is verified, rather than silently attributing them to another module.
- Transcript native successful save/restore hooks remain sole named-save authority. Failed/cancelled save or restore changes no association. Restore staging/apply selects the saved run before StatTracker.Resync; counters do not depend on map availability/validation. Autorestore reuses active run, not an empty transcript heuristic.
- Existing fresh boot map clearing remains unchanged, but must not create a new counter run. Accepted native RESTART creates one new run exactly once, independently of whether old-map archiving succeeds. The explicit story-ended Restart UI, which currently reloads the page, supplies a new-game intent before navigation; ordinary Exit/F5 does not.
- A successful restore lacking playthrough metadata continues the currently selected run (matching existing same-page preserve behavior) and establishes that named save's association at that observed restore. This is not reconstruction of historical identity or a mass migration of old saves. If no current run exists, create an empty one. No historical count lost before this fix can be invented. If map/labels are absent, attach only clean empty/validated sidecar fields, never the abandoned map. Unknown filename cannot be fabricated; retain current run without a named binding.
- A saved ID with missing ledger can rehydrate from its validated snapshot totals. Corrupt/wrong-story/invalid counters do not replace a valid run or point at arbitrary keys; define clean unknown behavior and report where data loss is actual.
- Delete save removes only its sidecar; retain shared run history/active state so other saves still work. Uninstall removes that exact story's run records/pointer alongside sidecars. New run does not delete prior saved runs.

## Packages/transactions

SaveState.exportFor enriches each SELECTED save's playthrough snapshot from its same-ID latest ledger, so exporting an old save after later deaths retains cumulative history. It does not export unrelated runs. Existing Qol importer validates before mutation and applies SaveState.importWrites inside rollback. Extend pure validation and returned write list to include sidecars and SAME-ID merged run records, preserving local higher totals and local seen keys. No active-run change merely from import; successful later RESTORE selects it. Several selected saves sharing a run produce one merged record write. Wrong digest/ID/unsafe counter/prototype keys reject before mutation. Missing optional data remains unknown, never copied from a different save's former sidecar. Import failure rolls back run writes too.

## Prior-fix and meaningful verification

D178/D180 score/carry remain unconfirmed after resume, learned pins survive, restore does not play score-up cue; D215 outcome definitions, one-per-episode and replay exclusion unchanged; E4 transcript/map/labels/failed IO still follow authoritative events; no native module changes/per-game special case.

Required red-on-current fixture and positive tests through actual lifecycle ordering: savedA0 -> native confirmed death1 -> olderA stays1 -> new fresh death2 -> quit/reopen/A/B stay2; separate new run and switching saves do not leak; failed/cancelled IO/restart no effect; overwrite; missing/invalid metadata; late identity; autorestore; import/export selected old save/latest total and rollback/quota failure; same-episode double-render and restored transcript add0. New-game0/Equipment tile hidden, positive count visible. Include wins lifecycle without changing classification.

Independent author-free implementation audit and end-to-end browser save/death/restore/reopen controls. Existing death-terminal, save-state, e4-transcript, restore-sync, stat-tracker and label/map guards; operator13/0 and ZIL/InformZ/Glulx checks; one immutable full309x2 shared-runtime gate for FINAL reviewed candidate, no per-draft catalog runs. Stable test APK only after source/audit/gates; normal build, signing and packaged source/hash parity, no physical-phone claim or automatic install. Then resume full26 ZIL at saved checkpoint.

Likely production write set SaveState.js/StatTracker.js/Transcript.js (explicit lifecycle readiness if needed)/WorkspaceUI.js (explicit restart intent/help), plus focused fixtures. Qol.js only if existing rollback interface cannot express the merged writes; no broad refactor. No production code yet.
