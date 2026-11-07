# I1 batch 1: Claude ACCEPT (11-07)

Draft: I1-batch1-grok.md (9 no-names titles, 52 in-scope priority cells).
Decision: ACCEPT as drafted. 31 TRUST cells usable; 15 U + 6 NC cells FAIL-CLOSED.

Checks:
- Method: TRUST requires a native positive (the game's own test_attr or a toggle) plus a negative; static table alone never counts. Sound.
- Evidence spot-check: grok-i1b1/run-lists-b.txt shows door 19:14 = 0 on OPEN and = 1 on CLOSE (tested before the action), desk 24:20 = 1 / 26:20 = 0, rooms 17/20:9 = 1, matching the draft.
- Cutoff caveat (Lists <=34, Godot <=43): affects only NC cells, which are FAIL-CLOSED. A wrong cutoff can only hide an option, never offer a wrong one (missing over wrong). Accepted without further proof.
- Low-impact cells FAIL-CLOSED by default: accepted.
Reopen a U cell when a longer native route proves it (list under "Remaining" in the draft).
grok2's batch-1 check (#6063 item 4) is withdrawn: this acceptance replaces it.
