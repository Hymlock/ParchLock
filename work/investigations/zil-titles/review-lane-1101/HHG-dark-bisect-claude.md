# HHG in-bed dark check: bisect (claude)

Check: `node harness/m11-dark-scope.js`, line 29, 'HHG: "Bedroom, in the bed" with unnamed bed is unproven -> state kept'.

## First bad commit
**5348c0f2** "ZIL v4/v5 room: digest-pinned locationGlobal fact ... Hitchhiker's: playerObject 202 (PROTAGONIST) + locationGlobal 116 (HERE)" (2026-10-12).

Bisect over the 222 js/ commits in 804af63d..d61c398b. Each step ran in a detached worktree, with node_modules copied by robocopy /E /XJ and the three harness games copied.

| commit | check | playerId (source) | chain below room |
|---|---|---|---|
| 804af63d | PASS | 19 (named-player) | 58 (unnamed) |
| f3600538 (parent of the first bad commit) | PASS | 19 (named-player) | 58 |
| **5348c0f2** | FAIL | 202 (measured-player-object) | 114 "bed", words [bed] |
| 4f2123ff, d61c398b (HEAD) | FAIL | 202 | 114 "bed" |

js/DarkScope.js is unchanged in the range apart from d82276ba, which only widens the dark-cue regex and does not affect this check.

## Mechanism
- js/ModuleStatFactsClaude.js:635-638 adds the facts `playerObject: 202` and `locationGlobal: 116` for HHG, pinned to the digest. They are sourced to globals.zil PROTAGONIST/HERE. js/ZRamReader.js:198 reads the room from G116 (Bedroom 150) and checks it against the player chain.
- Before this commit the app used the wrong player, object 19. Its parent, object 58, was the unnamed "bed" that the documented limit described. Object 58 was never the real bed.
- With the correct player 202, `DarkScope.chainBelowRoom` (js/DarkScope.js:33) returns [114], and object 114 has shortName "bed". After TURN ON LIGHT the reply contains no dark cue (js/DarkScope.js:90). `isHeadingLine` then matches "Bedroom, in the bed": the room name comes from the structural payload, and "bed" matches `level.names` for object 114 (js/DarkScope.js:67). So the clear happens at js/DarkScope.js:91-92.
- The probe at HEAD shows `probe.measuredDark` is null and `darkEvidence` is "unknown", so the measured path did not clear it. Prose such as "(outside the bed)" and "The light is now on." is not what clears it either.

## Verdict
**Stale test, the limit was resolved structurally.** The clear depends on three structural facts: the player object fact (202), the room global fact (116, checked against the chain), and the real container's own short name (114 "bed"). This is the D221/M11 heading rule working as designed, and it fails closed. An unnamed container, a missing fact (the old path) or a non-structural payload would still keep the dark state. The game is in fact lit at that point, so not-dark is correct.

Fix for the test (not applied, js/harness edits out of scope): change the line-29 expectation to `d1 === false`, with a message like '"Bedroom, in the bed": bed 114 on PROTAGONIST 202 chain proves heading -> clears'. Update the stale comment on lines 26-28 ("bed 58 is unnamed") and the header comment on line 3 to match.
