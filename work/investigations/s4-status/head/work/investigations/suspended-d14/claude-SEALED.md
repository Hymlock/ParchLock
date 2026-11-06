# D14 Suspended robot-addressed radial - claude half (SEALED 2026-10-30)
Evidence: the r45 worker (claude-probe/r45 logs). Every bare command from the player gets "Visual scanners cannot see
any X here". All successful probes were addressed to a robot (e.g. "Iris, examine X" style).
Leaning: the radial must address the robot that is in the object's room (the active robot, or the robot whose location
holds the object). Robots carry VICBIT 24 and hold items (CONTBIT 19/8). The wrapper needs an actor-addressed command
form for this title ("<robot>, <verb> <noun>"), with the robot chosen from live RAM (the robot parented in the object's
room). This is a per-title fact, not a global rule. Unresolved: robot naming and parser words, multiple robots in one
room, and remote-sensor robots.
