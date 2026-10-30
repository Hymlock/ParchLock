# Adversarial audit: codex D5 Locked-status candidate r1 (refreshed, bus #5647)

Auditor: claude. Read-only. Worktree ..\wt-claude-d5audit at HEAD 76a6fcf (removed after).
Candidate: work/mapping-research/items-codex/resume-20261020/oct30-recovery/d5-status-candidate-r1/

## Verdict: REVISE

## Blocking

1. **candidate.patch reverts committed-pending r45/r46 facts in js/ModuleStatFactsClaude.js.**
   The MSF hunks were diffed against the dirty root file, not HEAD: they delete Suspect `locked 17`,
   Seastalker `concealed 12`, Hitchhik `enterable 28`/`switchable 32`, Hollywood `enterable 8`, and
   Suspended `container 19`/`supporter 11`/`open 8`/`openCapability` (patch @@ -410, -444, -584, -666, -1249).
   `git apply --check` at HEAD fails on js/ModuleStatFactsClaude.js:410; applied to root it would silently
   undo the r45/r46 work. The shipped candidate file js/ModuleStatFactsClaude.js itself is correct
   (vs HEAD, CR-stripped: only +2 lines at 1051-1052, `lockedStatusObjects: [119, 135]`). Regenerate the
   patch so the MSF hunk is that 2-line addition only. Manifest `base`/`head` (3db9557) are also stale vs HEAD 76a6fcf.

2. **Tools / target pickers show the status (condition "tools omit" violated).**
   ObjectStatusForRadial (candidate js/Qol.js:769-777) only keys on context.source/kind/objectId. The second-stage
   radials reuse the owning object's context: the "Unlock with" tool picker (HEAD js/Actionable.js:2931-2945,
   `OpenRadial(x, y, payloadPool()..., context)`) and the command-target picker (js/Actionable.js:2882-2885).
   Long-press hatch 119 -> Unlock with... renders "Locked" over the list of tools. Pass an explicit marker
   (e.g. a stage/`list` flag on those calls, or only render on the first-stage object radial) and add a control.

3. **No interactionReady / module-generation guard (agreed condition).**
   Neither ObjectStatusForRadial (Qol.js:769-777) nor AttributeSchema.lockedObjectStatus (AttributeSchema.js:120-137)
   checks a captured generation/module key (cf. EquipmentUI.interactionReady, js/EquipmentUI.js:37). The
   `UndoRestoreSync.pending` check covers only an in-flight resync, not a radial opened against a stale module
   after a story swap or a closure that fires after generation++ (More page via addMoreActions re-calls OpenRadial
   with the old context). Capture generation + module key at open and omit unless current.

## Non-blocking / verified OK

- Domain getter (AttributeSchema.js:120-137): v3-5 header, object-1 base/frontier bounds, count, ids integer/unique/in-range,
  member check, confirmed-zil-family + validated, measuredFlagOwner("locked"), raw mapped bit 19 only; any throw => null. Good.
  Minor: calls `_familyOf` and then measuredFlagOwner decodes D198 again (redundant, not wrong).
- Scope: unique pool entry + referenceFor unique && verified; direction / composing / pending omit. Good (`referenceFor` called twice; cosmetic).
- Lifecycle: span appended after `menu.empty()` (Qol.js:926-928) so every open/page re-reads; removed on close (Qol.js:1097)
  and on resync (UndoRestoreSync.js:23). No stale span after restore.
- Command list/ranking/pagination/More: untouched; span is not in the command array. Unlock is never withheld (status read only).
- CSS (ParchLock.css:5230-5233): center, top calc(50% - 34px), max-inline-size 96px, 12px, pointer-events none, theme tokens
  --pl-text/--pl-surface exist. RTL fix uses `:dir(rtl)`; WebView < Chromium 120 ignores `:dir()` and falls back to the
  r1 overlap. Prefer `[dir="rtl"] #radial-menu .pl-object-status` (or physical `left:50%` with a single transform), which removes the RTL rule entirely.
- Aria: plain span, no role/tabindex. OK.

## Runs (worktree, 4 JS files + candidate MSF copy + CSS)

- selector-controls.cjs (run from scratch copy): 17 PASS / 0 FAIL
- harness/operator-regressions.js: 13 PASS / 0 FAIL
- d210-radial-selection 19/0, directional-radial 112/0, radial-auto-submit 60/0, shared-radial-integration 28 pass, t10-history-radial 26/0
- Native layout/unlock packets (native-layout-r2, native-unlock-r1) read, not re-run.

Required for ACCEPT: fix 1-3, add controls for tool-picker omit and stale-generation omit, rerun the above.

## R2 re-audit (claude, 2026-10-30) — candidate-r2.patch / manifest-r2.json (bus #5657)

Verdict: **ACCEPT** (one cosmetic nit).

Blockers:
1. Facts reversion — FIXED. Facts hunk (ModuleStatFactsClaude.js @1048, Lurking Horror digest 1862ef7c…) adds only the comment + `"lockedStatusObjects": [119, 135]`; no removals, nothing else touched. `git apply --check` passes at HEAD da88623 and on HEAD + batch-r45r46.diff.
2. Status on tool/target pickers — FIXED. Actionable.js ~2886 (target picker) and ~2946 (Unlock-with tool picker) pass `Object.assign({}, context, { objectStatusStamp: null })`; Qol.ObjectStatusForRadial returns null on a missing stamp.
3. No generation guard — FIXED. Stamp {generation, digest, buffer, offset, length} taken at Actionable context build (~2794) and EquipmentUI.js:127; ObjectStatusForRadial (Qol ~776) omits on any mismatch, pending undo, composing, typed input, >1 LineInput, #dialog, Message.IsOpen, stat probes, ambiguous/unverified/unscoped ref. CSS now physical `left:50%` (rtl nit resolved).

Lifecycle check: the attribute is read live on every OpenRadial (no cached value), so More/page reopens show current state; after undo/restore/restart generation++ makes old stamps omit, and UndoRestoreSync.resync also removes an open `.pl-object-status`; module switch changes the digest; CloseRadial removes the span. No hole found. Normal turns do not bump generation, but since the value is live-read this cannot show a stale value.

Nit (non-blocking): patch line 161 adds a trailing blank line at EOF of css/ParchLock.css (git whitespace warning).

Tests (temp worktree at HEAD + candidate-r2, real copies of games/ and node_modules, removed after): selector-controls-r2 24 PASS/0 FAIL; operator-regressions 13/0; d210-radial-selection 19/0; directional-radial 112/0; radial-auto-submit 60/0; shared-radial-integration 28 passed; t10-history-radial 26/0.
