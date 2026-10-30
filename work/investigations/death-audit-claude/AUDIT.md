# Independent audit: save-linked death/win history (D243, commit 07b18df) — claude seat

Verdict: ACCEPT-with-issues (no correctness defect found; semantic and coverage notes).

## Design as implemented
- Ledger `PL_Playthroughs_<exec digest>` in localStorage: runs{id:{deaths,wins,recent[]}}, active id (js/SaveState.js PlaythroughState).
- Each save sidecar records `playthrough:{id,deaths,wins}`; restore selects that run and merges with Math.max (never rewinds).
- New game / accepted in-VM RESTART -> fresh run id (Transcript.onVmEvent restart -> SaveState.onLifecycle("restart") -> PlaythroughState.start).
- Ending written synchronously: StatTracker.countEnding (js/StatTracker.js:1474-1485) -> SaveState.recordOutcome -> enqueue -> ready -> flush -> localStorage.setItem.

## Attack results
- Double count: guarded twice — model.seenBanners[ending|pageEpoch|submissionId] (StatTracker.js:1477) and run.recent[] key dedup in apply("ending"). Detection runs only on new submissions (collectEnding needs _lastSubmission), so reload/transcript re-render cannot re-detect. Restore-like commands (restore/undo/restart) only count if the engine itself printed the phrase this submission (StatTracker.js:1466-1470), so restored screen text does not recount.
- Restore earlier save: count is NOT rewound to the save's value; it stays at the run's cumulative max. This matches D243/Tutorial text ("restoring a saved playthrough returns to its accumulated count") but differs from the literal wording "restore restores that save's count". Operator should confirm this is the intended meaning.
- Reopen: native proof row "page reopen keeps two deaths" = 2.
- Restart: starts at 0 — including RESTART chosen at the death menu. Intended per contract; worth stating to operator.
- Slot switching: native proof A(2) <-> B(0) switching correct, survives reload.
- Export/import: export takes max(sidecar, ledger) per run; import merges by max and is inside the transactional rollback (Qol.js ImportPackageData, stateWrites precomputed before writes). Fixture-only proof.
- Storage failure: every write wrapped in try/catch with user report; corrupt ledger blocks writes rather than overwriting (readDoc throws -> ctx.blocked). Fixture-only proof.
- Lost counts: if the executable digest is not yet ready, ending ops queue in memory only (PlaythroughState.enqueue/ready returns null without flush); an app kill in that window loses the death. StatTracker model still increments locally but is overwritten by ledger on sync. Narrow window (early boot), low risk.
- Migration: no migration of pre-D243 model.deaths; old saves without playthrough meta attach to the current run. Consistent with the no-backwards-compat rule.
- Wins: same code path as deaths, but no native win proof.

## Detection / false positives
DEATH_PHRASE (StatTracker.js:1346) requires a terminal phrase ("you have died", "you are dead", ...) classified by classifyEnding over a whole settled episode at the next input request; quoted text and stat-probe submissions are excluded (death-terminal.js PASS cases "quoted custom death phrase is not an ending", "an app probe cannot count a custom ending"). Residual risk: a story printing an unquoted terminal phrase in a non-death context (e.g. reading a book) — mitigated but not eliminated by the framing rules.

## Harness runs (this audit, current checkout)
- harness/death-persistence/native.cjs (needs output path arg; crashes with ERR_INVALID_ARG_TYPE without one — minor harness bug, harness/death-persistence/native.cjs:4,24): PASS, 14 rows, Zork I real grue deaths: 0,1,1(restore A),2,2(reload),2,0(restart),2(A),0(B),0(reload).
- harness/death-persistence/stat-integration.cjs: 10 PASS
- harness/save-state.js: 34 PASS / 0 FAIL
- harness/stat-tracker.js: 211 PASS / 0 FAIL
- harness/death-terminal.js: 40 PASS / 0 FAIL

## Evidence gaps (native vs fixture)
Native (browser, Zork I): death, restore older, reload, restart, slot switching. Fixture only: wins, export/import, storage full/unavailable, corrupt ledger, identity-late startup. On-phone Android app-kill persistence was not independently re-verified here.
