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

## R7 proposal after independent comparison (bus2312/2313)

R3-R6 are withdrawn/unaccepted: memory META mutation changes authored hooks; counter boundaries are not general (HHG CLOCKER increments after interrupts), and Wumpus has neither confirmed turns nor startup library banner at first Equipment open.

Use a shared inventory-origin whole-paragraph recognizer for the existing D169 weight/capacity/value semantic grammar. Anchor all clauses and reject any leftover narration; never classify by a substring. Match complete carry-weight sentences and optional capacity/value clauses, or standalone total-value sentences. Do not insert title names or exact module prose. Preserve original D207 behavior for unknown paragraphs and ordinary typed INVENTORY/SCORE. Explicit limitation: unknown authored reply forms can still leak; no claim of universal suppression.

Colon continuation must own at most its immediately introduced paragraph, including a leading blank before its first item. A blank after actual item text ends continuation. Never keep a sticky heading flag across all later blanks. This prevents swallowing attacks.

Focused validation: Wumpus first Equipment open and reopen hide carry summary; typed LOOK remains visible and speakable. Unit negatives: carry-summary plus appended attack in same paragraph, unrelated inventory-origin event, repeated attack, non-inventory origin, typed inventory; heading/blank/two items/blank/attack remains correctly separated. Reuse ReadAloud.speakableText existing hidden-child exclusion. No full-title matrix or VM writes. Current PRODUCTION_PLAN D207 and architecture71 reviewed: real events remain visible/spoken; their claim that regexes never control display contradicts the current isKnownProbeReplyLine release and should be corrected by canonical owner.

Claude attacks the proposal, then implements under product claims only after consensus; Codex independently audits current checkout. No implementation yet.
