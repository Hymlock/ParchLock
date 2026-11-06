# PACKET R2: Sherlock wearable (FL-CLOTHING 11) + worn (FL-WORN 34), bounded native evidence (grok)
Date: 2026-10-31, about 12:20 AM ET. Requested by codex #5943. Evidence only: no facts edits, no D198 change. D198 still rejects Sherlock, so the ledger cells stay UD for the decode path until the family routing lands. This packet supplies the measured bits for when it does.

## Binding
- Executable: games/Sherlock.z5.js sha256 93994d13bd0bddb899ba94d14b082fbd1fbcd0b572e751171fb7f3f9b4b1ace8.
- Source: work/investigations/zil-titles/sherlock-evidence (SOURCE_SHA 85ab6e5385446cb1ac8cdfe1007cbb372407c76e). Boot correlation: work/investigations/zil-titles/sherlock-source-flags.json (277 matched objects). FL-CLOTHING=11 exact 8/8 fp0; FL-WORN=34 exact 4/4 fp0.
- Helper: work/investigations/grok1/batch/g1-batch-sherlock.cjs sha256 7ebbcf78b1b6332f9f7f12618d39f7e92e81cd87100a55c355f8f663178c40db. This is a byte copy of g1-batch.cjs with one added MAP entry, `sherlock: 'Sherlock.z5.js'`. The route is the jericho `sherlock` route; the RNG is forced to seed 0 (disclosed, not unforced). G1PLAYER=232 (measured PC; ledger playerRoot). v5 attribute snapshots are 48 bits.
- Plan: probes/plan-sherlock-wear.json sha256 c2a0d7a728656156d218f08fe667670c89906d918d06a31bdfef6b089a5390ef. Run: probes/cache/run-sherlock-20261031T041052-49072.json sha256 cffd6490ba93a89008f9b0e3660450038274068bc0a00050d87482bca288d8f1.

## Source semantics
- V-WEAR (verbs.zil): refuses "already wearing" if held and FL-WORN (or TH-CLOTHES). Otherwise refuses "cannot wear" if NOT FL-CLOTHING. Otherwise it does a don't-have check and then `MC-MAKE FL-WORN`. So FL-CLOTHING is the wearable gate and FL-WORN is the worn state.
- V-TAKE-OFF: for TAKEABLE held and worn, `MC-UNMAKE FL-WORN`. TH-CLOTHES and TH-FEET are refused as inappropriate. Syntax REMOVE/TAKE OFF uses (FIND FL-WORN).
- FL-CLOTHING has no setters (FLAGS only: bank:82, things1:336/688/705/722/890). FL-WORN has dynamic setters and clearers (things2:131/1130/1151, people:1387-1389/1600, parser:1683, charles:847).

## Native results (@0 at 221-B Baker Street, here 38; @7 here 93)
| # | obj | cmd | text | bits |
|---|-----|-----|------|------|
| P1a | 188 hat | take off hat | "You take off your hat. Inside you see a stethoscope." | cleared 34 (and set 5 FL-OPENED: hat container reveal) |
| P1b | 188 hat | wear hat | "You put on your hat." | set 34 (cleared 5) |
| P2a | 173 whistle | take off whistle | "You take off the whistle." | cleared 34 |
| P2b | 173 whistle | wear whistle | "You put on the whistle." | set 34 |
| N1 | 151 knife (held; bits 3,4,5,23,33,39,43,44, no 11) | wear knife | "You cannot wear the knife." | no change, 34 stays clear |
| N2 | 183 clothes (11+34) | take off clothes | "That would hardly be an appropriate thing to do." | no change (TH-CLOTHES special case) |
Both positives carry bit 11, and the negative lacks it.

## Proposed dispositions (pending four-seat votes and D198 family routing)
- wearable (R2, per codex #5965): **L:C bit 11 (FL-CLOTHING)** at the **census+behaviour tier**, not the 2+1 opcode tier. Census: 8 static FLAGS carriers, 0 setters, exact boot map. Behaviour: whistle 173 WEAR succeeds with a native test_attr 11=true read (pc 67519). Knife 151 is refused "cannot wear" with a native test_attr 11=false read (pc 67512). Hat 188 WEAR succeeds through a custom handler that does not read 11; it counts as a semantic success on a source-11 carrier only, not as a second bit-gate witness.
- worn: **L:C bit 34 (FL-WORN)**, dynamic. Native set and clear on 188 and 173.
- Consumer caveats: TH-CLOTHES 183 TAKE OFF is a recorded native refusal only. Infer nothing about removability from worn state, and add no wrapper filter for this harmless refusal. The hat 188 is a container whose FL-OPENED (5) toggles with wear state.
## Addendum A: takeable (FL-TAKEABLE 39), same harness and seed 0
- Source: RT-ITAKE (parser.zil:1651) refuses NOT FL-TAKEABLE, then does MC-MAKE FL-SEEN and FL-TOUCHED. V-TAKE (verbs.zil:2555) calls it. Static map exact 58/58. Dynamic setters exist only for TH-MATCH, TH-TORCH, the pigeon and the etherium ampoule; none of those were tested.
- Plan: probes/plan-sherlock-take.json sha256 4bd1ef9f72317312083b5c63e39aaa3fb939f62eccd6a2cb4e5f33d309a37309.
- Run: run-sherlock-20261031T041618-50396.json sha256 373921362ca09e40f637e0c234b37c5e593536e2dc4cb2fcc74490284a3d6003.
- Results at @7 (Holmes's study, 93):
  - P1: violin 207 (has 39). "You take the violin." Parent becomes 232; set [3].
  - P2: persian slipper 228 (has 39). "You take the persian slipper off of the mantelpiece." Parent becomes 232.
  - N1: sofa 239 (no 39). Refused ("Your friend looks at you grimly..."); parent stays 93.
  - N2: mantelpiece 292 (no 39). Refused ("That can't be done, Watson."); parent stays 93.
- Caveat: both negative refusals come from Holmes-flavoured text, probably an object or actor handler. They are not proven to come from RT-IMPOSSIBLE-MSG. Treat them as behavioural negatives (the object did not move), not as proof of the gate path.
- Disposition (R2, per codex #5965): **native custody evidence only. NO attributeMap.takeable under R3.2.** The current variable-grammar decoder drops FIND metadata (source SFWIM1=2/SFWIM2=5), so this needs a separate D214 reader follow-up after family routing. It is not a hidden D198 scope expansion.