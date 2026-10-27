# Death persistence R3 — final lifecycle amendments to R2

R2 remains the implementation contract except for the following explicit refinements. No production code yet.

## Retained intent means selection, not permanently new-game

Session intent protects the latest successfully selected run, not merely the first failed new-run write. A successful RESTORE supersedes any retained restart/new-game intent. With exact digest ready, replace the intent with {path,kind:select,runId,nonce} for the restored run before ledger persistence; memory selection changes immediately. Only clear an intent after an atomic ledger write containing THAT selected run succeeds, and only when the stored path/nonce still matches the committed selection. A later selection cannot be cleared by an older flush. On quota failure keep the latest selection intent; on recovery persist latest active selection and consume it, never recreate the earlier restarted run.

When restore succeeds before digest readiness, retain a bounded restore-selection intent containing the restore-time metadata candidates (below) and the selected fallback symbolic/opaque id, superseding an older new-game intent. A reopened page resolves that intent against the exact path/digest, not an older active pointer. If both storage channels are unavailable, report actual non-durability; do not claim impossible recovery. Failed/cancelled RESTORE does not supersede anything. A navigation exception may cancel only its still-matching new-game intent; it must not erase a later selection. Tests cover newB quota-failure -> restoreA -> quit/reopen -> recovery, plus stale-intent cleanup races.

## Deferred restore snapshots binding at restore time

Never resolve a queued restore by rereading its save-name sidecar later. At the authoritative successful restore event, capture that name's validated playthrough metadata immediately if exact digest is known. If the path's digest is still pending, scan only exact SaveState sidecar keys matching that native save name and strict64hex story namespaces, capture a bounded dictionary of {storyDigest: validated id/deaths/wins-or-missing/invalid}; never use a matching name as identity. After digest readiness select ONLY that exact digest's captured metadata. Capture only playthrough metadata, not every map payload; validate story/schema/id/counters. Capture errors are explicit unknown/failure, not permission to read future overwritten data.

Subsequent save-overwrite/delete operations remain FIFO and may change the actual sidecar, but cannot retroactively change which run that earlier RESTORE selected. A later forget removes any pending attachment for that name; selected run history itself remains. A later successful SAVE can replace the association in order. No named attachment for an empty/unknown name. Missing metadata continues current selected run as R2; invalid/corrupt metadata is reported and never overwritten as trusted data.

Package import is gated until explicit current-path executable identity is ready AND pending native lifecycle operations have materialized; if not, reject before any mutation with 'Wait for the story to finish loading before importing saves.' There is no import operation outside FIFO while identity is pending. Compute pure complete import plan before any package mutation and retain R2 rollback/cache rules. This is a readiness check, not a guessed identity fallback.

## Independent confirmation needed

Tests include restoreA captured -> sidecar overwrittenB/deleted before digest -> stillselectA; save->restart->digest stays distinct; death->restore->digest attributes correctly; context switch discards old pending; pending-import refusal causes zero writes; retained latest-selection intent survives each write failure and is consumed once after recovery. All earlier bounds, failure, detection/prior-fix, full shared gate and independent APK testing requirements remain. After design consensus implement the minimal source set and ask the author-free session to audit actual source/tests.
