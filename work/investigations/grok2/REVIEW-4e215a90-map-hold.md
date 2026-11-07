# Review 4e215a90 Map room long-press (grok2)

## Verdict: **ACCEPT**

### Diff
`BindRoomHold` on each `.room` after create:
- **contextmenu** → `RoomHoldAction` (desktop parity with Known Rooms)
- **touchstart/move/end** long-press with `Actionable.LongPressMs` / `LongPressMoveCancelPx`
- Fired hold **swallows trailing click** via `stopImmediatePropagation` so map does not also re-center
- Ignores holds starting on `.icon` children

Reuses existing `RoomHoldAction` (Notes / Rewind) — no duplicate menu logic.

### Harness
`node harness/m11-rewind.js` → **20 PASS / 0 FAIL** (includes map long-press cases).

### Nits (non-blocking)
- `hold` is shared per room element; fine for single-touch.
- Relies on `room.hasClass("shown")` for target — matches click gating.

No js/ changes from grok2.
