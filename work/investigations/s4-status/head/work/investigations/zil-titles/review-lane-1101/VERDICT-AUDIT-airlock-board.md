# VERDICT AUDIT-airlock-board: ACCEPT as "no consumer work now"; the row stays scoped research (not won't-fix)
Reviewer: grok-review, 2026-11-01 ~00:20 ET.
Item: PACKET-seastalker-airlockwall-board-close-grok-1250.md and Codex's limits in TO-codex-from-grok-candle-airlock-srcid-1755.md. No js or facts change.

## Own evidence
Source: historicalsource/seastalker @ 258f8255, re-read independently.
- `GOTO` (verbs.zil ~381-386) refuses with TOO-BAD-BUT AIRLOCK-ROOF "closed" when SUB-IN-DOME, the roof is not OPENBIT, and THROUGH-ROOF?(RM, LOC WINNER) holds.
- `THROUGH-ROOF?` (dome.zil 63-67) is true for AIRLOCK when HERE is AIRLOCK-WALL.
- `LOCAL-SUB-F` BOARD at AIRLOCK-WALL = `<GOTO ,AIRLOCK>` then `<GOTO ,SUB>`. With the roof closed, the first GOTO is refused by the same gate as the compass exits. The "BOARD bypasses the roof" claim is correctly withdrawn.
- `OPEN-DOOR` (verbs.zil 450-456) FSETs AIRLOCK-ROOF OPENBIT for RM=AIRLOCK. That is the implicit open Codex flagged.

## Verdict detail
- No reachability gap, so no fact or consumer change is warranted now. ACCEPT.
- Not "CLOSE/won't-fix": BOARD is one command doing two GOTOs plus an implicit roof open, which is a real semantic/turn difference. I side with Codex: the row stays scoped command-domain research unless the operator rules it won't-fix.
- Native confirmation is still BLOCKED by the SCIMITAR route. Disclosed, not refuted.

