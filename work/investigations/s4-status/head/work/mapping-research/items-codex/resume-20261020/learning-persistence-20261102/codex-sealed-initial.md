# Receiving-seat sealed initial investigation

Operator November2: Adventure in Humongous Cave learns LIGHT LAMP and DOUSE LAMP after two repetitions; radial correct; quit without saving/reopen loses options. All learned systems should belong to module installation, independent of game saves.

HEAD8e2c906b, JS tracked tree clean at inspection. Actual catalog filename HugeCave.z8.js, not Advent.z5.js. No runtime edits. Source-only preliminary findings, no reproduced cause yet:

- AttrCalibrator stores version2 table under PL_AttrCalib_<release-serial>; hydrate/load and persist are independent of SaveState. Exact/allowed confirmations are table fields; record() persists changed observations. LearnedWords editor overrides use a separate PL_LearnedWords key; recorder projection is transient and explicitly 'not remembered yet'. Need determine which plane user is seeing.
- LearningStores now wraps durable writes in asynchronous Web Lock queue; same-page read sees latest queued snapshot. Failed/pending writes could therefore look learned in memory without being durable across navigation. This is a hypothesis, not proven. Need inspect actual IndexedDB/localStorage/native storage and lifecycle, not assume Save is required.
- gameIdentityKey uses executable header release+serial, nominally stable across restart. Need capture keys/actual object IDs and storage before/after same-origin reload for HugeCave. d198GenerationEvidence clear on undo/restore is separate provenance and does not directly clear table; persistent data versus session projection/current scope must be checked.

Next root work: reproduce ordinary LIGHT/DOUSE on actual HugeCave with isolated persistent browser context and no SAVE, capture per-step source hashes, memory table/localStorage/index/session/identity/radial state. Observe actual learning pipeline without injected confirmations/VM game-state edits. Compare normal navigation versus fresh page after pending writes settle; scope a system-wide cause rather than title-specific patch. Original user's phone/app state is not yet captured.

Sealed before independent problem-only request. No diagnosis, proposal consensus, code change, or fix claimed.
