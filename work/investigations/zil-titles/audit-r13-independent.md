# Audit r13 (independent, standing in for codex) - batch-r13.diff

Verdict: Deadline ACCEPT, Moonmist ACCEPT.

## Deadline (js/ModuleStatFactsClaude.js:498, digest 9c6eadbb...)
1. Bits: zil-source-flags.json Deadline INVISIBLE bit 31 exact fp0 fn0, ONBIT bit 23 exact fp0 fn0. attributeMap (open/isOpen 28, container 21, supporter 29, animate 20) does not collide; localscope6/Deadline.json searchBit 26 / surfaceBit 29 / openBit 28 agree with it.
2. Property: localscope6/Deadline.json summary.extra records property 16/holder 253 as the ROOMS list and property 15 with every listed id parented to 254. Accept.
3. Negative: the shed "You aren't in that room!" is a handler reply, but the evidence does not rest on it. Roses (230, listed by 228/231) are refused at both 249 and 238 with "You can't see that here.", and the sink is refused at 249. Two rooms with reciprocal positives (house/lawn at 249, shed at 238) still hold. Accept.
4. Holder children listed by rooms: closet, fruit tree, windows, bed, tables, sofa, chair, shower, toilet, sink, doors, telephone, balcony, lake, shed, lawn, house, roses. All are concrete scenery, with no abstractions or unknown words. FROBNO 252 is listed by no room, so it is never added. Hidden doors 179/184 are INVISIBLE and dropped by js/ZRamReader.js localScopeObjects, which runs an attr(raw, ls.invisible) check.

## Moonmist (js/ModuleStatFactsClaude.js:475, digest bcf65075...)
1. Bits: INVISIBLE bit 6 exact fp0 fn0 and ONBIT bit 10 exact fp0 fn0. These match the row's attributeMap: on 10 equals lit 10, open 14 equals openBit 14, and supporter 23 equals surfaceBit 23.
2. Holder: the source global.zil:16-18 has `<OBJECT LOCAL-GLOBALS (IN GLOBAL-OBJECTS) (DESC "stone" ...)>`, so holder 44 "stone" is exactly LOCAL-GLOBALS. OCEAN (castle.zil:79-80) and FRONT-GATE (castle.zil:483-484) are both `IN LOCAL-GLOBALS`. Some GLOBAL entries have parent 37 (ROOMS); see castle.zil:713/837, `(IN ROOMS ;LOCAL-GLOBALS)`. These are room objects. js/ZRamReader.js localScopeObjects skips them with `if (!links || links.parent !== ls.holder) continue;` (around line 2413), so they are excluded as the summary says.
3. Negatives: fireplace and oil painting are refused at 9/13, ocean and front gate are refused at 132, and the reciprocal positives are present. Accept.
4. Holder children listed by rooms: table, chair, stairs, window, lever, peephole, ladder, priest hole, bathroom door, wardrobe, dressing table, night table, fireplace, bathroom, oil painting, front gate, ocean, full moon. All are concrete. "bathroom" (197) and "full moon" are source local-global scenery, not unknown words. Brick hole 122 is INVISIBLE and gets dropped. Deirdre's body (111) is listed by no room.

Non-blocking: the hidden doors and brick hole were not probed natively. Static INVISIBLE exclusion covers them.
