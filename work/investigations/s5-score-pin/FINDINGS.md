# S5 score pin edge cases: not reproduced, close with no runtime change (claude worker, 2026-11-05)
Recorded cases: D175 (1) the HUD runs ahead of RAM after an early announcement; (2) UNDO with an unpinned slot leaves the score high.
## Live (probe.cjs; anchor-undo.log, anchor-nobaseline.log, advent.log)
Anchorhead (no status score column), scoring move "look up verlac in cabinet" (+2):
- SCORE 0/0; scoring move 2/2 (once); UNDO hides the score row; SCORE 0/0; repeat move 2/2 (not double-counted); SCORE 2/2.
- Without an initial SCORE, the announcement doesn't move the row (D24 honest absence); after UNDO, SCORE 0 matches the game.
- Advent (status score column): the strip follows the status row at 36 throughout, UNDO included. No scoring event was reached on that route.
## Why the cases are gone
- UNDO: js/UndoRestoreSync.js:61 calls StatTracker.Resync before WorldModel.tick. Resync (StatTracker.js:1740) runs forgetReadings (:1682): confirmed=false, scorePinKnown/candidates/deltaEvents deleted, seenDeltas cleared. The next SCORE or status row re-seeds it. D175's "does not subscribe to UndoRestoreSync" is stale (fixed by D180/D181).
- Early announcement: the display is the game's last stated total plus the game's announced change, i.e. the game's own figure. It is only "ahead" of an unpinned global. Single-event pins are refused by D167 design.
## Disposition
No js change, nothing to mask. Optional harness assertion: after +2 then Resync("undo"), score.confirmed=false and scorePinKnown is undefined.
Still open, not reproduced: D176's tick-counter replay fallback for stories with no turn counter (StatTracker.js:1159-1162).
