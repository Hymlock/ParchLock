# Suspended (Suspended.z3.js): map stuck on "Iris" — claude blind findings

Sealed before reading codex's Suspended-focus-sealed.md or its focus artifacts.

## Observed (live, typed commands, object-parent and global diffs per turn)
| cmd | text | moved | key globals |
|---|---|---|---|
| look | "Internal map reference -- Weather Monitors" | — | g0 = 158 Iris |
| south | "Internal map reference -- Sub Supply Room" | 158 Iris 157 -> 138 "Sub Supply Room" | g0 stays 158 |
| north | "... -- Weather Monitors" | Iris 138 -> 157 "Weather Monitors" | g196 138 -> 157 |
| waldo, north | "I'm in the center of a large area with a walkway..." | 155 Waldo 154 -> 113 "Beta Repair" | g0, g55, g114: 158 -> 155 |
| waldo, south | "...A large object sits before me..." | Waldo 113 -> 154 "Gamma Repair" | g0 stays 155 |

- The app's payload stays 158 "Iris" (source "existing-resolver"), with playerId 0 and no chain, the whole route.

## Semantics
- Suspended has no player body. The player commands robots; the CURRENT robot (the last one addressed; unaddressed commands go to it) is the actor.
- v3 global0 (Z-spec 8.2: the object whose short name the status line prints) holds the current ROBOT (158 Iris, then 155 Waldo), not a room. Globals 55 and 114 track the same focus.
- The robot's PARENT is the semantic room (157 Weather Monitors, 138 Sub Supply Room, 154 Gamma Repair, 113 Beta Repair). It changes exactly when the robot moves.
- Iris prints "Internal map reference -- <room>" (her map function). Other robots describe rooms through their own senses, with no heading.

## Why the map is stuck
- The v3 lane / existing resolver takes global0 as the location. That is right for status-line presentation (8.2) but wrong as room identity here: global0 is an animate-role object INSIDE a room.
- This is the M05c distinction exactly: global0 certifies the status display object, not the semantic room.

## Does a generic v3 rule apply?
Candidate (deterministic, structural, no title):
- If the global0 object has a parent that is itself a plausible room, and global0 is not itself room-like (it moves between parents on navigation commands), treat global0 as the FOCUS actor and its parent as the room.
- Otherwise (normal ZIL: global0 is the room, a top-level child of the rooms holder), the behaviour is unchanged.

Distinguishing test, ZIL: rooms are children of the ROOMS pseudo-object (a common parent of all rooms), while the robots here are children of rooms. Rule: global0 is a room iff its parent is the parent shared by the known room set; otherwise climb to the first ancestor that is.

Controls needed: ordinary v3 games (Zork, Planetfall: global0 = room, unchanged); vehicles in v3 (Zork boat: global0 stays the room while the player is in the boat?); LGOP/Plundered (global0 = title object, the M09 case).

Map edges: these are focus moves, so edges should be recorded per robot move. Room identity is shared across robots, and switching focus to another robot's room is a jump, not an edge.
