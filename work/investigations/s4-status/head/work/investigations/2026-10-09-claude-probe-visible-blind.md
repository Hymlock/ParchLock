# Issue 2 (APK 64): status/inventory probe output visible in the story. Claude blind findings, sealed

Status: early static findings only; no live reproduction yet.

- The operator's report: "You are carrying 13 lbs of stuff..." is printed twice in the story (wump2ka, operator-2026-10-09b screenshots), around opening Equipment.
- Prior decisions: D207 (every status probe is headless; lines between a probe's Submit and the next prompt are hidden at insertion with `pl-stat-probe`; the carry probe owns its span with `_carrySpanOwned`), D188 (no probe is issued unasked) and D169 (wump2ka carry is tracked headlessly).
- "13 lbs of stuff" is wump2ka's inventory carry line, so the leaking path is the carry probe (D169) or the Equipment inventory refresh, not the score/status family.
- Candidate mechanisms to verify live:
  1. Equipment's first open issues the inventory or carry probe before `_statProbeOwned` or the observer is armed, so its lines are inserted unclaimed (js/StatTracker.js 4216: the observer returns unless `_statProbeOwned` and a probe or span is active).
  2. Two probes are queued back to back (the line appears twice); the second runs after `_carrySpanOwned` was cleared by the first prompt (4239-4240), so its reply is unowned.
  3. The `pl-*-probe` class is stripped by the cleanup at 4031-4049 or 4172-4175 (probe released as visible) when the turn ends at an unexpected prompt.
- Next step: a matrix run across several modules (wump2ka, Treasures, Anchorhead, Zork, HHG), opening Equipment and Status at start, after a restore and mid-game, recording every BufferLine inserted during a probe and whether it carries `pl-stat-probe` or `pl-carry-probe`.

## Operator clarification (2026-10-09, after sealing)

"This is a direct result of the status requests which are supposed to be blind being transmitted instead visibly. This is happening in multiple modules at multiple times. They should all be headless and invisible."

Scope is therefore general: every status, score and inventory probe in every module and at every point (startup, Equipment open, after restore and mid-game), not the wump2ka carry path alone. Any fix must be one general rule; nothing may be fixed per title.

## Live reproduction and root cause (claude, before reading any codex findings)

**Reproduced.** `node harness/status-probe-matrix.js --owner=codex --only=wump2ka.z5.js` FAILS at 360 and 1280. On every trigger (Equipment open, Refresh, reopen, Identify) the `inventory [stat-probe]` span releases "You are carrying 4 lbs of stuff (10% of your current capacity). It's all worth about $35." as a **turn event**: visible, spoken, `data-pl-probe-event="1"`. It is not an escape from hiding: the hiding worked, and the D207 release step deliberately un-hid it.

**Root cause, `StatTracker.releaseProbeEvents` (js/StatTracker.js 4159-4205):**
- The first paragraph of the span is taken as the reply.
- After the first blank-line gap, every line is **released (shown and spoken) unless `isKnownProbeReplyLine` recognises it**.
- `isKnownProbeReplyLine` is a list of reply shapes someone has observed (score, rank, prowess, "In addition, you are wearing:", MULE status and so on).
- So any status reply with a second paragraph that is not on that list leaks: wump2ka's carry summary, and the same in other modules. This is exactly the "encodes only observed reply states" failure D207 itself named in D204. D207 moved it from the first paragraph to the later paragraphs.

**Why it is general (operator: "multiple modules at multiple times"):** the default for an unrecognised later paragraph is visible. Every module whose INVENTORY, SCORE or STATUS reply has more than one paragraph, or whose reply varies with game state, is affected, at every probe.

**Direction for the comparison (not a proposal):**
- Flip the default to **hidden** (operator 2026-10-09: "They should all be headless and invisible").
- Release a line only on deterministic evidence that it is a turn event and not part of the reply:
  - the probe verb is not META, and a turn actually elapsed (RAM turn counter or moves global changed across the span, D152/D173);
  - and the line does not recur in other spans of the same verb (digits normalised).
- Text recognition (the current list) becomes confirmation only.
- This conflicts with D207's operator rule "Show the attack"; the operator must confirm whether an attack during a status probe may still be shown when a turn deterministically elapsed.
