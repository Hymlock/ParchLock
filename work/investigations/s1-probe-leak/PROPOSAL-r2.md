# S1 PROPOSAL R2 (claude): answers REVIEW-r1 (REVISE). Adopt the reviewer's alternative A
## Rule
While a hidden status probe owns the span, record the **screen-output character offset at the moment the probe verb's own action routine returns** (I6: the grammar action routine, e.g. InvSub, located from the story's action table, not by name).
- Text before that offset is the reply (hidden). Text after it is end-of-turn (shown as events, as today).
- No turns slot is needed, so it works at first Equipment open (fixes REVIEW-r1 blocking 1).
- react_before, before and life output printed **before** the action routine runs would be classed as reply. That would mask an NPC reacting to a hidden probe, so: **anything printed before the action routine is entered is also shown**, and only output between entry and return of the action routine counts as reply (fixes blocking 3). react_after/after run after the action returns, so they stay visible as events.
## Hook (blocking 4)
- js/ZvmCapture.js wraps the ZVM call/return path (frames push/pop) and the print path, active only while StatTracker._statProbeOwned is set.
- Screen output only: memory-stream output (streams[3]) is excluded.
- Character offsets, not BufferLines: releaseProbeEvents cuts the owned span's text at the recorded entry/return offsets. If the cut text doesn't match the span exactly, everything stays visible (fail-visible).
## Scope
I6 first (Anchorhead). I7/ZIL use the same entry/return mechanism once their action routine is located (I7 action-processing rule for the action; ZIL PERFORM/V-<verb> through the action table). Each title family needs a feasibility check.
## Required evidence before ACCEPT
1. A live trace on Anchorhead and Make It Good: locate the inventory action routine, record entry/return offsets during the hidden probe, and show that paragraph 2 lies inside [entry, return].
2. A trace of one turn with an end-of-turn daemon/timer message, showing it lies after return.
3. A trace of one I6 react_before/life reaction, showing it lies before entry and stays visible.
Prior-fix guard: D207, D191, D194, D195, D197; harness/probe-release.js, stat-tracker, the wump2ka carry item-2 harness, operator-regressions, plus a three-engine gate.
