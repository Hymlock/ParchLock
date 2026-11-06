# Independent implementation audit R1 — REVISE

Audited actual initial source/diff, not proposal alone. No production edits. SaveState source SHA256 observed F70278E3D340A4E9F53E4A10BC330D417E653BFC080AD41967E83857166BCE3D. Initial source, not final freeze/candidate/APK acceptance.

Executed once each:
- node independent/public-lifecycle.cjs: exit0, 19 scenario checkpoints PASS. VM-isolated reopen, older save cumulative, wins, independent run switching/digest, same event dedup, quota latest-selection recovery, delayed save/restore FIFO, future overwrite exclusion, import readiness.
- node independent/public-lifecycle-package.cjs: exit0, 23 scenario checkpoints PASS (includes base19), adds undurable in-memory export, pure deduplicated import plan/no precommit adoption, postcommit matching run refresh.
- node independent/public-lifecycle-extended.cjs: exit1, FAIL pending SAVE/RESTORE must retain selected run B across reload. Initial numerical repro also failed1!==2, then strengthened to compare run identity itself rather than assuming undurable outcomes recover.
- node independent/public-lifecycle-uninstall.cjs: exit0, 21 checkpoints PASS. Separate debug variant showed inactive-path session intent survives removeStory, but clean reinstall counter0 still correct, so not a claimed user-visible regression.

## Blocking actual failure: deferred FIFO selection is lost on an extra reload

1. Ready identity: create runA, count1, SAVE A.
2. Recreate page with digest pending. startPlaythrough creates runB and stores select intent B.
3. Successful SAVE A is queued under runB (native save bytes now name B).
4. Successful RESTORE A is queued. restored() at SaveState.js302-313 captures OLD disk sidecar runA and writes a restore intent containing that captured A plus fallback B.
5. Reload before digest readiness. Earlier queued SAVE operation is lost. Context reconstructs only the restore intent. apply('restore') prefers valid captured A over fallback B, selecting wrong playthrough.
6. Ready new page then SAVE C exposes its run binding: actual is runA ID; expected is the captured new runB ID. Exact deterministic assertion is in public-lifecycle-extended.cjs102.

Same-page drain passes because apply restore checks ctx.sidecars from earlier queued SAVE. The session intent path lacks that FIFO precedence. Resolve intent from the preceding queued virtual state before writing it (or preserve sufficient ordered intent metadata); do not use old disk binding when a prior queued SAVE overwrote the native name. Also cover prior queued forget -> restore and repeated restore ordering. Pending count durability may remain explicitly limited while digest unavailable, but selecting the wrong historical run is not acceptable.

## Additional implementation issue: silent dropped package metadata on ledger read error

exportFor wraps per-save read/peek in catch(e){} (SaveState.js527-540 approximately). A selected native save with valid sidecar but corrupt/unreadable ledger is silently omitted from SaveStates because peek throws before out[name]=rec. Qol exporter catches SaveState exceptions too. This produces a seemingly successful package missing the selected save's map/labels/run snapshot, despite valid fallback snapshot totals. At minimum preserve validated sidecar metadata and report inability to enrich from ledger; do not silently drop the entire sidecar. R2 explicitly requires honest snapshot failure reporting. This is code-path evidence; not yet an executable corruption fixture.

## Scope / remaining required proof

Qol inspected: plan computed before native writes, unique native keys rejected, returned ledger/sidecars participate rollback, afterImport only after success. Our package probe exercises SaveState plan, not Qol transaction rollback; real fail-after-each-write integration and browser native save/death/reopen proof still required. StatTracker changes preserve reading invalidation and route totals through ledger; actual rendering/VM story proof belongs remaining browser gate. Tutorial/story-ended intent paths inspected; no real navigation test claimed. Full309x2, required13/three-type gates, final hashes and APK remain outstanding. Initial pass is not final implementation consensus.
