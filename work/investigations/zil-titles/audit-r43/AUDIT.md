# Audit r43: batch-r43.diff (independent, Claude audit worker, 2026-10-30)

## Verdict: ACCEPT-with-issues

The three locked facts are ACCEPT. Hollywood container 4 with openCapability is ACCEPT-with-issues: it loses no options, but it adds Close/Open to non-receptacles.

## State and gates
- `git diff --stat js/` showed the batch already applied (ModuleStatFactsClaude.js, +10/-4, identical to batch-r43.diff). I did not run git apply or apply -R. Nothing was committed.
- `node harness/operator-regressions.js`: 13 PASS / 0 FAIL.
- `node harness/zil-locked-map.js`: 22 checks passed (12a/12b confirm Inform exits are unchanged).
- Inform isolation: AttributeSchema.js (lines 122/175/212/267/286) looks facts up only as `ModuleStatFactsClaude[digest]`, where the key is the exact sha256 of the story file. The four keys changed here are ZIL story digests, so no Inform title can resolve to them. The Delusns/huntdark/Sherlock/cycles/medusa diffs in the 309x2 gate cannot come from this batch. They are flake, as claimed.

## Per fact
1. **Spellbreaker locked 11: ACCEPT.** The source-flags file has LOCKED at bit 11, exact 2/2: iron door 223 and cell door 207 (fp 0, fn 0). Native evidence in claude-probe/locked/log-spellbrkr-*:
   - cabinet 67 @372/@383 reads TRUE with "The cabinet is locked.", then @373 reads FALSE after unlocking ("Opening the massive cabinet reveals...").
   - cabinet 107 @200 reads FALSE ("already open").

   Minor note-accuracy issue: the comment names only the runtime cabinets. It should also name the source-initial carriers, doors 223/207.
2. **Seastalker locked 15: ACCEPT.** Source LOCKED bit 15 is exact 3/3: window 178, Horvak's locker 155, viewport 243. In log-seastalker-20261030T114220, locker 155 reads TRUE on open and unlock @104 ("It's locked..."), then FALSE @106 once it opens. The single-owner exception for the windows (their own routines handle OPEN/LOCK) matches the comment. No room carriers.
3. **Enchanter locked 1: ACCEPT.** Source LOCKEDBIT bit 1 is exact 3/3: iron gate 232, gate 194, wooden door 152. In grok1/locked/cache/log-enchanter-20261024T191518, gate 194 reads TRUE @44 with "The gate is rusted shut." The post-REZROV read of 0 @46 is cited from grok1 probe5 run-enj-20261025T021611; that log exists, but I did not re-grep it. Residual: 232 and 152 carry the bit but their handlers never test it, so any Unlock-type radial on them is wrong but harmless. That is acceptable under the missing-over-wrong rule.
4. **Hollywood container 4 + openCapability: ACCEPT-with-issues.**
   - Source and native checks:
     - The source-flags file has CONTBIT at bit 4 (tp 24, fp 0, fn 1, not exact). The tp 24 is correct.
     - Native e7cont shows open/look-in TRUE on mailbox 225, piano 222, sack 199 and compartment 138, and FALSE on business card 63 ("You can't look inside").
     - Mantle 194 gives "You can't close that!", which justifies `none: [supporter]`.
   - Radial diff (radial-base.out vs radial-cand.out):
     - No option is lost on any object.
     - Real receptacles gain search/empty and correct Open/Close that toggles with bit 25: mailbox, piano, sack, compartment, safes 203/227, trunk 220, matchbox. These were missing before, so this is the intended win.
   - **Issue:** the source gives CONTBIT and OPENBIT to non-receptacles, so the candidate now offers "close" plus search/empty on:
     - red match 20 and green match 171
     - plank ends 8 and 68
     - small pond 14
     - holes 92/150 and niches 109/212
     - cannon 172, slide projector 133, film projector 191, hopper 216

     These are wrong options, not missing ones, and I did not probe them natively. Recommended follow-up, which does not block this batch: probe CLOSE MATCH / CLOSE POND, and if the game refuses, gate Open/Close on non-OPENBIT-at-start, or add a per-object exclusion from game data. Do not mask the options.

## Not verified
- Native radials on device were not tested.
- The original .zil text was checked only through the source-flags json. The Hollywood source in this repo (items-codex/hollywood-source) has only 4 files. I found no Spellbreaker, Seastalker or Enchanter .zil in the repo.
