# M12 docking (claude, 11-07; grok stalled so claude took #6165)

Sampled 6 Glulx titles (Alabaster, Counterfeit Monkey, Blue Lacuna, Cragne Manor, Grooverland, Rover's Day Out)
at 1280 and 412 px. Only Counterfeit Monkey opens a GraphicsWindow (rock 1040), height 0 at the opening.
Z-machine titles (v3-v5) have no graphics windows.

Conclusion: "dock the map when the story has its own graphics window" applies only to Glulx, and Glulx
has no map today (I6, blocked, last by operator ruling). Nothing to dock now; revisit with I6.

Side findings:
- Fixed: Counterfeit Monkey's GameList subtitle was an internal dev note ("Glulx format - added
  2026-09-12 to unblock D28 ...") shown to players; now "A Removal in Five Acts" (1bc091af).
- On a Glulx title the map panel opens as a short empty floating box (no map data). Harmless until I6.
