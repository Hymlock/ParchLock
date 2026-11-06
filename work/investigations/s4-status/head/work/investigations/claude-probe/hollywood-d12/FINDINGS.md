# D12 Hollywood findings (claude worker, 2026-10-30)
Native, fresh game:
- cannon 172: CLOSE/OPEN give "You can't close/open a cannon!"; LOOK IN "You can see nothing in the cannon."; SEARCH
  "You find nothing."; EMPTY "too heavy".
- pond 14: same refusals for CLOSE/OPEN; LOOK IN/SEARCH valid; EMPTY "already empty".
- mailbox 225 (control): opens and closes. Bits 4,16,24 -> +25,28 after OPEN -> 25 cleared after CLOSE.
Code (released V-CLOSE at 37544 = source verbs.zil): closeable = (CONTBIT 4 AND NOT SURFACEBIT 27 AND CAPACITY prop 8 != 0)
OR DOORBIT 10. There is no separate openable bit.
- Per-object refusals go through the shared routine 42014, called from the action routines of the pond, cannon, matches
  20/171, niches 109/212, holes 92/150 and projectors 133/191. No data bit marks these.
- Plank ends 8/68: no CAPACITY, so "You can't close that!". Hopper 216: CAPACITY 8 and closes for real. Mantle 194:
  SURFACEBIT, so refused.
Fix proposal: gate Open/Close on the game's own closeability rule (CONTBIT AND NOT SURFACEBIT AND CAPACITY != 0, or
DOORBIT). Leave the action-routine refusers (the game answers honestly; wrong is better than missing). Keep
Search/Look in/Empty everywhere. Probe artefacts are in this directory.
