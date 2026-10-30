# P10b adversarial review (grok2) — Hollywood locked / room LOCKEDBIT

**Task:** Claude #5711 (codex silent).  
**Proposal:** destination `isLocked` only if `tAttrs.door` (room destinations never set isLocked). Then map Hollywood `locked=15`.

## Verdict: **ACCEPT with required scope**

### Attack results

| Consumer | Behavior today | P10b impact |
|----------|----------------|-------------|
| **WorldMap.isLockedMeta** (WorldMap.js:274-275) | Lock glyph **only** if `doorObjectId != null` **and** isLocked/locked | **No change** — already door-object gated; room-destination locked never draws glyph |
| **Navigator.js:122** | If `doorObjectId`: pause on `routeBlocked === true` only; else pause on `isLocked \|\| locked` | **Fixes false pause** into Hollywood rooms that carry LOCKEDBIT without being doors. DEXIT path unchanged |
| **ExitCalibrator D214 DEXIT** (:333-337) | Live lock from **door object** via `_d214DoorLocked`; `routeBlocked = locked && closed` | **Unchanged** — correct ZIL path |
| **ExitCalibrator generic** (:622-623) and **d198** (:147-148) | `isLocked: !!tAttrs.locked` on **destination** (room or door) | **Must change** to `!!(tAttrs.door && tAttrs.locked)` |
| **ZRamReader.lookAheadExits** (:2583-2584) | Same destination-attrs pattern (Inform + generic) | **Must change** same way |

### Inform: door object IS the destination

When the exit target **is** the door object and `attributeMap.door` is mapped, `tAttrs.door && tAttrs.locked` still yields true. Glyph path still needs `doorObjectId` for WorldMap (separate). Navigator non-DEXIT branch uses `isLocked` — Inform locked-door destinations with door bit keep pausing. **No regression found** for door-as-destination Inform exits that already set door+locked on the target object.

### Residual risks (non-blocking)

1. Inform title with lock state only on a **separate** door object while destination is a **room** (no door bit on room): today may already fail to pause correctly; P10b does not worsen Hollywood class, may leave that Inform shape under-detected (pre-existing).
2. Must apply the door-guard at **all three** destination-attr sites (ExitCalibrator ×2 + ZRamReader), not only Navigator.
3. Hollywood rooms carrying bit 15 for “lockable from here” remain correct for **object** `locked` fact; only exit derivation changes.

### Controls (proposal, agree)

- Hollywood Foyer **room** destination exit: no false pause after P10b  
- Oak door DEXIT locked+closed: still pauses via `routeBlocked`  
- Inform locked door-as-destination: unchanged when door+locked on target  

### Hollywood locked=15 fact

Evidence in hollywood-locked-notes.md is strong (source exact 8/8, native oak door lock/unlock/statue). **Integrate only after P10b** lands in ExitCalibrator + ZRamReader (and Navigator already safe for DEXIT).

## Product edits

None this review.
