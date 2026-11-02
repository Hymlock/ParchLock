# Diagonal repair proposal — source only, 2026-11-02

No implementation or tests executed. Same bounded audit scope and offline directory coordination as world-status-paths-audit.md. This is a proposal, not accepted peer consensus.

## Concrete hydration seam

Use one synchronous, idempotent `ensureDiagonalCalibration(mem)` state owner in ZRamReader, reached at the start of BOTH `directionLabelForProp(propNum, mem)` (currently 870) and `lookAheadExits(mem, roomId)` (currently 2576). The first guards direct label callers; the second is essential because lookAheadExits reads `directionProps.diagonalCalibrated` itself at 2707 and may never call directionLabelForProp in its uncalibrated branch. Calling only from ZRamProvider.collect would leave direct consumers and future callers unprotected. Calling only directionLabelForProp does not fix the actual look-ahead branch. Keep the guard outside the property enumeration loop; it must do no writes and no repeated storage reads once a valid identity has been hydrated.

The real calibration writer must call the same state owner BEFORE setting a new learned value (calibrateDiagonalFromTravel:902 onward), so its first post-learning consumer cannot overwrite it by loading an older snapshot. Travel validation and library-compass bypass remain unchanged. This avoids indiscriminate reset of discovered/library compass mappings; the calibration only owns stock PROFILE 12/13.

## Identity readiness and reset

A valid identity change must first set swapped=false and calibrated=false, then attempt that identity's persisted record. Set the hydrated marker only once an actual identity is ready and the storage read has been attempted. Missing record, malformed JSON and non-boolean swapped leave that identity neutral. A null/unready identity must never be cached as hydrated, nor borrow old identity flags.

Keep separate ownership for current live travel evidence when persistent identity is unavailable: a current memory instance can retain its freshly proven calibration for that instance, but must not write an `unknown` key or reuse it for another memory/story. A later ready identity must not silently replace newer same-instance travel evidence with an older stored value; carry the known observation into the matching identity only after the memory/story binding is established. Alternatively require identity before accepting durable calibration while allowing current-session calibration under an explicit memory token. Make this choice explicit in implementation; do not reset on every unavailable-identity tick.

ModuleLibrary already computes executable SHA-256 before returning story bytes to the selected VM (`captureExecutableIdentity`, 386-438; loader wrappers 508,518). `currentExecutableIdentity` returns a path-selected summary (460-480); `whenExecutableIdentityReady` exists at 487 onward. Production normally has digest ready before first VM collection. The consumer guard should remain synchronous: do not enqueue async callbacks that can hydrate an obsolete story after a switch. If the digest is absent, remain neutral for persisted lookup and retry next consumer call. Verify path-selected identity and stable immutable header correspondence to the supplied Z-memory; release/serial alone is insufficient to prove a supplied test/other VM buffer belongs to the current app identity. Follow existing stable-header authentication patterns (`executableLayoutFacts`, 2149-2154); do not compare mutable header flags wholesale.

RESTORE/restart on the same executable keeps the established module calibration; it changes neither compiled compass layout nor digest. Memory replacement with the same authenticated digest should reload/reuse the same fact, while a different digest starts neutral. No map reset, scope snapshot, current room, death counter or SAVE sidecar changes belong in this patch.

## Legacy release/serial collision: explicit decision required

Existing `PL_DiagonalCalib_<release>-<serial>` values contain only `{swapped:boolean}`. They do not identify the executable that supplied the value. A and B may share that key and have opposite layouts. Therefore **adding unconditional calls to the existing hydrate function is mechanically narrow but cannot be described as an ownership-safe repair**: it activates potentially foreign old values which previously had no production read path.

LearningStores' owner index is erase authority, not per-value provenance: it keeps all owners and writes value/index separately (LearningStores:322-357). A singleton current owner is not enough to prove that an old value was written by that owner; crashes, prior unindexed writes, path-only history and shared-key overwrites can break the inference. Installed-library uniqueness also cannot prove an uninstalled prior writer did not collide. Do not guess ownership from title, current path, sole installed match or release/serial.

Recommended safe bounded design: new diagonal-only digest-qualified key/schema containing the same boolean plus explicit exact digest; leave existing legacy key/value untouched and do not auto-import it. Register that exact new key format with LearningStores and update writer/read/reset callback together. Fresh real travel establishes its fact under the ready authenticated digest; subsequent reopen hydrates it before any direction consumer. Maintain an explicit unclaimed legacy-data state in the proposal/evidence so its retained bytes are not misrepresented as usable learned calibration. No migration or deletion is proposed (seat rule 15 disallows migrations).

This preserves legacy bytes but does not fulfill “all past learning immediately usable” for records without provenance. That cannot be safely guaranteed from this record format alone. If the operator specifically requires reuse of those values, require an explicit ownership resolution supported by external evidence or fresh travel, not an automatic assignment. The collision ambiguity **blocks certifying the one-line legacy hydration fix as safe**, but does **not** block safe future/relearned digest-isolated hydration. Do not silently claim the latter recovers every historical calibration.

An alternative retaining legacy-key semantics can be reviewed as an explicitly accepted existing collision risk; this audit does not recommend or approve that compromise.

## Required test contract (future work; none run)

1. Production consumer seam: preload valid digest calibration, run first lookAheadExits before travel; labels/compass match stored swap. Invoke directionLabelForProp directly first as a separate entry path. Prove storage is read once per identity and no read-time writes occur.
2. Reopen without game SAVE: actual travel learning writes, fresh page/memory reopening same executable reads and displays it before first direction interaction.
3. Missing/malformed value, false/true boolean, unavailable storage, absent identity and delayed-ready identity all remain neutral or preserve only correctly owned live evidence. No `unknown` record; no hydrated marker poisoning on unavailable identity.
4. A→B→A memory/story switches: A has swapped=true, B no record; B starts uncalibrated. Same release/serial but distinct digest/opposite calibration never leak. Stale asynchronous readiness from A cannot affect B.
5. Learn before first ensure/read and learn while identity pending: subsequent consumer never restores stale persisted calibration over newer valid travel. Invalid/unmatched destination and library-compass lane never create calibration.
6. Legacy same-release/serial record with no provenance remains byte-for-byte present and is not adopted/deleted; multi-owner/path-only/missing index cannot authorize adoption.
7. Real restore/undo/restart retains module calibration, while map/scopes/current readings follow their existing lifecycle. Erase callback clears only matching new-key active calibration, never another digest's state; queued old-owner write cannot resurrect erased/current state.
8. Existing discovered compass/library lane and non-Inform ExitCalibrator output remain unchanged. Do not assert a full catalog pass from these focused contracts.
