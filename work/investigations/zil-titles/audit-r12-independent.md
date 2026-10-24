# Audit r12 (independent, standing in for codex) — batch-r12.diff localScope roots-only

Verdict: ACCEPT all four (Ballyhoo, Cutthroats, Starcross, Plundered Hearts).

## 1. Bits
- work/investigations/2026-10-11-zil-source-flags.json: INVISIBLE / ONBIT exact (fp 0, fn 0) for every title:
  Ballyhoo 19 / 24 (5 and 31 positives), Cutthroats 30 / 17 (4 / 11), Starcross 30 / 18 (4 / 45), Plundered Hearts 20 / 29 (3 / 54).
  The diff rows match these values, and so do localscope5/<title>.json `localScope` and `proposalLocalScope` (digestMatch true).
- ONBIT used as the lit bit: in ZIL, LIGHTBIT on rooms is ONBIT (same flag), so a single bit doing both "lit room" and "device on" is how the source is written, not a mismatch. The fact is consistent with the existing `on` mapping for devices. The ONBIT positives in the source-flags examples are rooms (Under the Bleachers, Red Boar Inn, Bridge, Beach).
- "Every room carries it" (codex #4669 / grok2 #4712 concern): the consumer reads this bit only on `roomId` (js/ZRamReader.js:2382-2383). It is never read on objects, so device-ON state cannot affect it. Worst case under the positive-only rule: if a room is never dark, the gate always passes. Roots are still admitted only through that room's own GLOBAL property (:2384-2385), and INVISIBLE and empty or "(" names are filtered out (:2390-2392). Nothing beyond what the parser itself scopes in a lit room is added. The other direction is a room that lacks the bit (dark, or, for Cutthroats, which has only 11 ONBIT positives, rooms that are not set) and then gets nothing. That fails closed and only means an option is missing. No wrong-room or phantom output is possible from the lit choice. The earlier hold was about how the bit looks, not about any failure mode, so I lift it.

## 2. Two rooms plus reciprocal refusals (localscope5/<title>.json `summary`)
- Ballyhoo: In the Wings 81 / Performance Ring 131 (grandstand, center pole). Ladder 101 is refused at 81 before and after visiting 131 and is positive at 131. Path 229 is refused at 131. Turnstile is refused at 81. OK.
- Cutthroats: Your Room 183 / Upstairs Hallway 147 (wallpaper). Stairs are refused at 183 and positive at 147. Window is refused at 147 and positive at 183. The "get out of bed" gate was correctly excluded. OK.
- Starcross: Bridge 202 / Airlock 122 (airlock). Airlock and window are refused at Living Quarters 10. Window is refused at 122 and positive at 202. OK. This is weaker than the others because the second room proves only one shared object, but it meets the standard of r10/r11.
- Plundered Hearts: Captain's Quarters 169 / Landing 92 (curtain). Stair is refused at 169 before and after visiting and is positive at 92. Window is refused at 92 and positive at 169. OK.

## 3. Starcross alarm 89
It is listed by the GLOBAL property of rooms 10/122/198/202, so it is a local global by data. The engine resolves it in all of those rooms, and the reply "on the bridge, not here" is the object's action routine, not a scope refusal. The wrapper offers "alarm" in exactly the rooms where the parser resolves it, which matches the game. Nothing is wrong. At most the radial offers a verb whose answer is that refusal text, which is the game's own behaviour.

## 4. Holder children (static JSON `holderChildren`)
- Ballyhoo (77): ids 196 and 154 have empty names and are listed by no room. Secret panel 212 and trap door 233 are INVISIBLE (filtered). Chuckles, flower and others are listed by no room, so they are unreachable through roots.
- Cutthroats (58): **168 has an empty name and is listed by 6 lit-class rooms (L)**. The consumer drops it (`!name`, ZRamReader.js:2391). 220 "thingy" is listed by no room. 62, 63 and 209 have empty names and are INVISIBLE, and 211 also has an empty name. ferry 155, mast, holes and doors are INVISIBLE and filtered while the bit is set.
- Starcross (36): weasel chieftain 18 is INVISIBLE and listed by 10 rooms. It is filtered while invisible and appears only after the game clears the bit, which is the native reveal. No abstractions.
- Plundered Hearts (36): 219 "pseudo" is listed by no room, so it is never admitted.
- No title admits an abstraction or an empty-named object in any lit listing room.

## Residual (non-blocking)
The dark-room path was not exercised for Cutthroats or Starcross (late-game rooms). It fails closed by construction (:2383).
