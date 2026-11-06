# M4 yagwad (games/yagwad.z5.js) - Claude covering grok, 2026-11-05
Digest 67b691534a025518db698c008f4a7251dea7a68ebe1ef728971967ae6c07986c. Script: #key|yes|yes|look|n|look.
Raw: yagwad-base.json, yagwad-pg21.json.

## Measurements (baseline)
- Boot and warnings: globals 21=20 and 56=20 "(self object)". Probe playerId 20 named-player, room **143 "Basement"** existing-resolver. Not admitted (gate at MapTopology.js:96-97).
- After the second YES: **globals 21=30 and 56=30 "Me"**; parent(30)=29 Treasure Cave. Probe still says 20 named-player, roomSource existing-resolver, roomId 29. lastPayload.playerId is 30, so it disagrees with the probe, as in guess.
- Map: 1 room, 29 Treasure Cave, current 29.

## Which path admits it
Not a third admission path: it is the **travel clause** of the same gate, js/MapTopology.js:83-84.
`prevRoomId != null && payload.roomId != prevRoomId -> return true`. prevRoomId was 143 (Basement, recorded during boot by applyStateDelta, MapTopology.js:817/1004). When the resolver moved to 29, the gate counted it as "travel", which bypasses the deterministic-source and announcement checks.
So the M09 rule ("existing-resolver alone is refused") is only enforced while the boot room stays the same. A resolver change during boot counts as travel.

## With playerGlobal 21 (in-memory)
- Boot: 20 (self object) measured-player-global, but still existing-resolver 143, not admitted. After YES: 30 measured-player-global, **player-containment**, room 29. Map: 29 Treasure Cave (same result, now through the normal containment path).

## Proposal (reconciliation)
1. Add the exact-digest fact `playerGlobal: 21` (pair 21/56). yagwad then admits through player-containment, as the rule says.
2. Tighten the travel clause at MapTopology.js:83-84 so that, while the map is empty on an Inform title, a change of prevRoomId counts as travel only when both ids come from a deterministic source (player-containment or measured-fact). Without that, an epigraph or boot resolver hop still bypasses M09. This needs its own adversarial review and a full gate run, because it can affect every Inform title whose first room is admitted on the first move.

## Risks
- Item 2 can remove first-room admission from Inform titles that rely on it today (a room is admitted only after the first move). The gate diff must list every room-count change.
- The probe/lastPayload playerId disagreement (20 vs 30, also 20 vs 37 in guess) is a separate inconsistency that should be noted for the resolver owner.
