# Issue 2 (APK 64): status/inventory probe output visible in the story. Claude blind findings, sealed

Status: early static findings only; no live reproduction yet.

- The operator's report: "You are carrying 13 lbs of stuff..." is printed twice in the story (wump2ka, operator-2026-10-09b screenshots), around opening Equipment.
- Prior decisions: D207 (every status probe is headless; lines between a probe's Submit and the next prompt are hidden at insertion with `pl-stat-probe`; the carry probe owns its span with `_carrySpanOwned`), D188 (no probe is issued unasked) and D169 (wump2ka carry is tracked headlessly).
- "13 lbs of stuff" is wump2ka's inventory carry line, so the leaking path is the carry probe (D169) or the Equipment inventory refresh, not the score/status family.
- Candidate mechanisms to verify live:
  1. Equipment's first open issues the inventory or carry probe before `_statProbeOwned` or the observer is armed, so its lines are inserted unclaimed (js/StatTracker.js 4216: the observer returns unless `_statProbeOwned` and a probe or span is active).
  2. Two probes are queued back to back (the line appears twice); the second runs after `_carrySpanOwned` was cleared by the first prompt (4239-4240), so its reply is unowned.
  3. The `pl-*-probe` class is stripped by the cleanup at 4031-4049 or 4172-4175 (probe released as visible) when the turn ends at an unexpected prompt.
- Next step: a live wump2ka run that opens Equipment first thing after start and after a restore, recording which BufferLines carry the probe classes.
