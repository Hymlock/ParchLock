# Moonmist locked display - what is left after D254 (grok, 2026-11-04 19:30 ET)

Read-only. Source: `work/investigations/grok2/nq/_srcroot/moonmist/*.zil`. Landed: f82f243 (D254), `lockedObservation`
attribute 8, owner 52 (front gate) only. Evidence: `oct30-recovery/MOONMIST-DISPLAY-FINAL.md`, `grok2/moonmist-source-audit.md`.

## Every LOCKED use in the source
| Carrier | Where | What it means | Show "Locked"? |
|---|---|---|---|
| FRONT-GATE 52 | castle.zil 488, 470, 554 | real lock; opens when you announce yourself | **Yes - already landed** |
| FRONT-DOOR | castle.zil 717 (starts OPEN + LOCKED), cleared by COURTYARD-F 577 | scripted, cleared by the story, never a manual UNLOCK | No - the door starts open; "Locked" on an open door would confuse |
| SECRET-SITTING-DOOR | castle.zil 1113 (SECRETBIT DOORBIT LOCKED) | its action always says "stuck closed" | No - showing it would reveal a secret door |
| OLD-GREAT-HALL (room) | tower.zil 44 | room flag reuse | No - a room, not a lock |
| EARRING | tower.zil 1228 `FSET EARRING LOCKED` "Remember player did this" | puzzle memory | No - not a lock |
| HERE (room) | goal.zil 1495 I-DISCOVERED | room flag reuse | No |
| SERVANTS-QUARTERS, VIVIEN-ROOM | castle.zil 1784, 2555 | commented out (`;`) | n/a |
| V-UNLOCK / V-OPEN / V-KNOCK / V-$CHEAT | verbs.zil | generic setters/clearers | follow the carrier rules above |

## Proposal
- "Moonmist raw locked" is **done** with owner 52. Record the other carriers as rejected for display, with the reasons above.
- No js change. No new native run needed: the table is source-only, and the landed gate already proves front door
  clearing is scripted (MOONMIST-DISPLAY-FINAL.md).
- Note: Codex wrote `resume-20261020/moonmist-dexit-candidate-native.json` at 18:07 today (room-as-door exit hints).
  That is Codex's lane; this note does not touch it.

Needs a peer ACCEPT (Codex) to close.