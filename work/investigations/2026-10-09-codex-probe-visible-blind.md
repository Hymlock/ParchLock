# Item 2 ? Codex independent sealed investigation

Investigated current checkout560f8f2, before reading Claude's sealed b45f31b findings. Problem: status/inventory probes visibly leak across modules; Wumpus prints carrying summary twice.

## Positive live evidence

Read-only Playwright run of games/wump2ka.z5.js at390x844. Skip splash/tutorial, focus character prompts, answer restore NO, open Equipment and dismiss its one-time notice. At completed line prompt, capture appended BufferLines and provenance.

- `You are carrying:` and `a Glow Bar` retain pl-stat-probe ownership.
- Blank and `You are carrying 4 lbs of stuff (10% of your current capacity). It's all worth about $35.` are visible.
- The summary has `data-pl-probe-event="1"`: this is affirmative provenance from releaseProbeEvents, not a failure to claim insertion.
- At completion `_statProbeOwned=false`, `_spanOrigin=null`, and live line input exists.
- Evidence: tmp/codex-icon-activity/item2-live.json and item2-live.cjs. No product edits; one live reproduction sufficient.

## Current-code cause

StatTracker.releaseProbeEvents recognizes initial reply paragraphs and known reply headings; after a paragraph gap it reveals any unknown line as a real event. isKnownProbeReplyLine recognizes colon-bearing carrying/wearing headings but not this complete burden/value paragraph. Thus unknown status prose is classified as an event solely because it follows a gap. The bug is shared classification, not Wumpus-specific rendering or scrolling.

Initial inventory heading ends in a colon, but processing the subsequent item line resets `continues` false; the next blank sets afterGap and permits release. META verbs avoid this release path; turn-using probes do not. A fixed delay is not a solution.

## Prior-fix guard / scope

PRODUCTION_PLAN D207 (~7969) deliberately keeps genuine turn events (enemy attacks) visible and spoken, hides probe echo/replies from insertion onwards, retains real prompts, and protects pre-submit lines. Architecture's D207 contract is unchanged. Do not blanket-hide the whole turn, blacklist every carrying sentence globally, or alter typed INVENTORY output. Do not reread module state or introduce timers/per-title probes to solve paragraph ownership.

A generic fix needs safe reply continuation ownership while retaining authored real events. Extending only the Wumpus string whitelist will not establish that all multi-paragraph status replies are covered. Compare both investigations before selecting the evidence boundary; one focused hidden carry continuation and one genuine attack/released prompt are minimum positive checks.

## Limits

This proves the reported leak and shared cause in one module, not a full cross-module sweep. No read-aloud hook was captured in this run, so do not claim spoken leakage proven. Earlier un-focused @space runner did not reach a command prompt and was inconclusive. No implementation or peer consensus claimed here.
