# Planetfall (Planetfall.z3.js) - ZIL completion (claude lane). Auditor: codex.
Census row: supporter UD, lightSource U, on U, animate C, edible U, takeable S, playerRoot S, status Os, rooms O,
actors U, underlineVsDict X, descriptors X, identical UD, onoff U, wornItems X, consumed U, nested X.
Source: ONBIT 5 (100, rooms lit), LIGHTBIT 21 (robot 110, terminal 56, microfilm reader 55), FOODBIT 27 (6: protein
liquid 162, medicine 79, celery 218, ...). Walkthrough 'planetfall' eats red goo (75), green goo (151), brown goo (211),
turns on Floyd (121), drinks liquid (243).
BLOCKER (2026-10-20): the jericho walkthrough desyncs at step 2 for z_random seeds 0-11 ("GET IN WEB" -> "You can't see
any web here!", the player is not yet in the escape pod; the ship explodes at step 14). No seed for 'planetfall' exists
in any replay tool. Options: wider seed search, or a hand route through the opening (enter the pod when the bulkhead
opens) - then the goo/Floyd steps replay with fresh evidence.
