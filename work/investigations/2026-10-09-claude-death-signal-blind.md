# Death counter never increments: claude sealed findings (low priority)

**Operator.** The counter never works in any module. Look at how every module
actually ends its game (they offer RESTORE, reset the score or similar).
"Prefer deterministic but verify through text and use text if absolutely
necessary."

**Measured so far:**
1. HHG bulldozer death (the operator's 19-14-16 save): StatTracker
   deaths = 0 and no banner. HHG prints "Better luck next life", then the
   score, then "Would you like to start over, restore a saved position, get
   hints or end this session? (Type RESTART, RESTORE, HINTS or QUIT)" at an
   ordinary LINE prompt. The existing detector is banner/regex only:
   "*** You have died ***", "you have died", "you are dead", "you were
   killed", "a fatal blow", "game over". HHG matches none of them.
2. A first globals-diff attempt was inconclusive. The save dies on ANY
   command, so the control turn also died. Zero globals changed in either
   run, which suggests ZRamProvider.getMem may be a settled snapshot rather
   than live RAM at that moment. This needs a live-RAM read and a non-fatal
   control state.

**Candidate deterministic indicators to measure per family:**
- Inform: the library's `deadflag` global (0 playing, 1 dead, 2 won, 3+ custom),
  if its slot can be located.
- ZIL: JIGS-UP leads to FINISH, then the score and the end prompt. Candidate
  signals are a call into the restart/restore/quit decision loop, or the turn
  counter stopping while input is still read.
- In every family, the next input is the end-of-game choice. Text
  verification: the RESTART/RESTORE prompt, which can be distinguished from
  a win by the absence of a win banner.

**Plan:** a sample of modules per compiler family (Zork1, HHG, Planetfall,
Anchorhead, Treasures, wump2ka, one Glulx title) with a reachable death.
