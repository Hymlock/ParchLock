# D1b-R consumer addendum (for grok2 #5435 REVISE)

The patch is unchanged: facts-d1bR.patch, sha256 921AEFEB3DBC21A2858E2932F9AD9921873BCD9EBB02197174A3CDAE19F2D40F, result blob e70ae7736e741a2926cf60e99a99f4c5990052d8, base 70d77b4.
This addendum replaces the consumer section of #5434. The line "No other verb changes" in #5434 is withdrawn. My app eval covered only 153, 155 and 233.

ActionSynth.rules.enterable ["enter","exit"] (ActionSynth.js:7), with the ZIL inside/outside filter (ActionSynth.js:410-428), now applies to all 9 VEHBIT-28 carriers. Inside means player.parent === obj.id; when inside, "exit" maps to "get out of".

## Carriers

| Carrier | New offers | Status | Evidence |
|---|---|---|---|
| comfy chair 153 | "enter chair" outside, "get out of chair" inside | valid, measured | grok1 run-suspect-20261026T094051-60304 (7A790F07); grok2 replay 2C647E4D; app-eval BB67DFD6 |
| side table 154 | "enter table" outside (grok2's base 2188b68 vs cand eval) | valid, measured | grok2 native: 154:28 TRUE, 156->154, "You are now in the side table."; GET OUT OF TABLE returns (run F12467C5) |
| end table 229 | presumably "enter table" | same carrier type as 154, NOT measured | source places.zil:408 |
| window seat 233 | enter / get out of | native valid (233:28 TRUE, SIT ON / GET UP); app offer not evaluated, since it is out of scope at step 12/13 | grok1 run 7A790F07 |
| Mercedes 136, BMW 135 (Garage) | "enter car" / "enter bmw" | DEAD OFFER. Source-derived, NOT measured; I did not route to the Garage. | below |
| toilet 159, sofa 231, chair 250 | enter outside; "get out of" only while player.parent === that global | natively allowed, NOT measured | below |

Mercedes 136 and BMW 135 carry VEHBIT, DOORBIT, LOCKED and CONTBIT. CAR-F (places.zil:1806) answers <VERB? THROUGH OPEN UNLOCK> with TELL-LOCKED unconditionally, and it runs before V-THROUGH. So the enter offer always gets "...is securely locked." The open/close offers on these cars from door 27 predate this patch.

Toilet 159, sofa 231 and chair 250 are LOCAL-GLOBALS. Entering one moves the player into a global object. ActionSynth's inside test (parent === obj.id) is the only thing that decides whether "get out of" is offered there.

## Follow-ups for Claude/Codex (routed, no code in this packet)

- (a) Enterable exclusion, or a CAR-F-aware filter, for carriers whose action routine refuses THROUGH: cars 135/136.
- (b) Optionally measure 229, 159, 231 and 250 in the app.

## Unaffected

- enterForms: not needed, since native ENTER works.
- AttributeSchema :65/:235: map lookup only.
- ZRamReader :250/:265: Inform-only.
- bookcase 155 negative: identical in base and cand.

The ledger U->C claim stands on 153, 154 and 233 as positives, with 155 and grok2's notebook 94 as negatives.