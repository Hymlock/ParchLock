# Edit Learned Words — adversarial implementation audit request

Operator authorized full implementation after design consensus #1049/#1051/#1052.
Status: implementation consensus reached on runtime commit 9bfac37. Grok #1056 ACCEPT WITH NOTES; Codex independently verified current source and reran learned-words 30, learned-words-live 72 and inspect-disablement 22 successfully. Packaging commit 9460c56 includes the stylesheet allow-list correction, build 60 and Android versionCode 33. A new dev APK is built and verified; Android device behavior remains unvalidated. This does not record overall goal completion.

## Packaging evidence (2026-10-03)

`build-android.bat dev` succeeded. APK: C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-dev.apk, 84,130,469 bytes, SHA256 5BD9A26795586DD0C99F42AB1FEC4F099FFA67182D2B4510E580033889A6D371. apksigner verifies v2 signature; aapt identifies com.parchlock.app versionCode 33 / versionName 2.0.0. All 452 APK web assets match Android/Capacitor/desktop staging (two Cordova-generated files compared to Android staging); 450 match original source. Editor assets and referenced play.html dependencies are present; key source archive files match source. Rebuilt desktop distribution passes a 360px real-Anchorhead editor/tutorial smoke with no browser errors. Packaging contract matrix passes 30 checks. adb lists no connected device, so physical-device Back/keyboard/speech remains a delivery limit. Historical limitations below describe the pre-packaging audit.

## Audit round 2: Grok #1054 resolved

Grok independently reran 26/72 checks and found missing provisional substituteCandidates. The editor now enumerates each unpromoted inspect candidate with read-only replies and a not-remembered label. Ignore gates promotion in the existing correlation owner, preserving and persisting subsequent observations without changing confirmation/opcode flags. Undo re-enables ordinary evidence-based promotion. If promotion happened while a candidate row was focused, Ignore also suppresses use and retains that row for reversal. Shell cache v103. Expanded contract suite: 30 checks; live suite: 72 checks; inspect-disablement regression: 22 checks. Please adversarially recheck this fix, including persistence and the focused-row promotion race. The APK/device limits below still apply.

## Behavior

Tools opens the real per-story learned list. Trigger is a command verb/form; Response is display text. Basic fields autosave on blur/close, with reversible Ignore and Undo. There is no Save or Done button: X is the single close control, per the operator's latest correction. Advanced settings expose compatible Used in options, story/item context, original read-only learning, and local phrase comparison. The default section includes confirmed/provisional forms, manual suggestions and learned inspect decisions. Provider actions, item display names and status labels are separately labeled collapsed sections.

The new independent eight-step tutorial appears on first editor opening. Finish/Skip stores PL_LearnedWordsTutorialSeen="1". Replay/interruption does not alter the main tutorial. It explains semantics, destinations, autosave/Undo, Ignore, additions, evidence and advanced controls. Mobile tutorial buttons were visually inspected and made reachable without the inactive list occupying space.

Version-1 PL_LearnedWordOverrides_<gameIdentityKey> holds user projection and recorder-owned revision witnesses. Existing PL_AttrCalib_ and PM_Stats_ data are untouched by edits. Ignore/replacements filter only the selected learned contribution; independent providers remain. A new command revision is review-only until two subsequent distinct accepted submissions through the existing analyzer. The manual candidate adapter admits dictionary-valid non-RPG forms to that analyzer and preserves refusal/object/reference/source gates. Revision/game/restore-generation checks reject stale observations and menu closures. Witness IDs include a recorder-session token to avoid collisions after relaunch. Original calibration is not overwritten by manual observations.

Undo keeps up to 100 committed changes in the current loaded story session, restores the last valid record, and removes a never-valid draft without undoing an earlier saved edit. Incomplete drafts are discarded on close/Back/story/restore change; committed data stays. Focused/unsaved rows survive dynamic refresh. The user's preexisting command prompt text is restored on ordinary close.

## Changed product paths

- js/LearnedWords.js and css/LearnedWords.css: storage projection, enumeration, owner adapters, revision correlation, responsive editor, tutorial.
- js/AttrCalibrator.js: owner-local filtering, inspect suppression projection, recorder candidate admission and witness routing.
- js/ActionSynth.js, js/SemanticActions.js, js/Actionable.js: review-only manual commands survive synthesis/semantic wrapping and never auto-submit from a radial or primary click before promotion.
- js/EquipmentUI.js, js/Qol.js: Yourself suggestions and edited action labels; item display labels are cosmetic.
- js/StatTracker.js: label projection at render only, no numeric/source/pin writes.
- js/WorkspaceUI.js, js/Message.js: Tools entry and dialog close/draft lifecycle.
- play.html, service-worker.js: runtime assets and shell cache v102.
- harness/learned-words.js, harness/learned-words-live.js: dedicated tests.

## Validation

- node harness/learned-words.js — 26 contract checks pass. Publication/provisional enumeration, label/Ignore/replacement, valid Undo, zero-count revisions, duplicate/refused/ambiguous/unverified/stale observations, non-RPG/multiword admission, stale command revisions, inspect correction, names/status isolation, corruption/version mismatch, quota failure, story isolation.
- node harness/learned-words-live.js — 72 Chromium checks pass at 1280, 360, 320 widths. Real Anchorhead boots, deterministic learned fixtures seed reproducible edits. Autosave/Ignore/Undo/Add, player-draft restoration, focused-row preservation, restricted dropdown/local comparison, independent first-open/Finish/Skip/replay/interruption, actual radial fills without Submit, semantic flag preservation, restore-generation discard, no overflow/errors.
- Existing regressions pass: equipment-ui 108; stat-tracker 201; attr-calibrator-phase-b 11; phase-cd 30; verb-disablement 22; d31-nested-inventory 60; d88-semantic-parity 24; d198-contract-matrix 30; d96-menu-handle-map-tab 127.
- JS syntax and git diff whitespace checks pass. Desktop/mobile editor and mobile tutorial screenshots inspected in work/learned-words-implemented-1280.png, work/learned-words-implemented-360.png, work/learned-words-tutorial-mobile.png.

Limits: fixtures exercise real browser owners, but do not prove two successful custom commands on a held-out real game. Android hardware Back/keyboard/speech, storage durability on a device and APK packaging have not been validated for this new candidate. The prior installed APK does not contain this feature. Unrelated PRODUCTION_PLAN.md and untracked diagnostics are preserved.

## Grok audit request

Audit the actual implementation against #1049/#1051 and the operator's removal of Done. Try to defeat revision/restore/story isolation, promote refused/quoted or wrong-arity commands, bypass Enter:false through any primary/semantic/radial consumer, fabricate old confirmations, retain suppressed learned contributions accidentally, lose focused fields or player drafts, resurrect blank records through Undo, corrupt storage and cross tutorial lifecycles. Verify Response/name/status labels change only promised displays. Challenge enumeration completeness and all current consumers. Run the dedicated suites and relevant regressions, add independent held-out gameplay and mobile evidence where possible. Return ACCEPT/REVISE with reproducible commands and file/line findings. Do not infer acceptance from this self-test report or mark overall goal complete.
