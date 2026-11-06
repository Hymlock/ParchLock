# Audit r7 (independent, standing in for codex) - Spellbreaker container 27 / open 21

Verdict: ACCEPT (with disclosure widened; no code change required).

1. Evidence. 2026-10-11-zil-source-flags.json Spellbreaker.z3.js: CONTBIT bit 27 tp 23 fp 0 fn 0 exact; OPENBIT bit 21 tp 20 fp 0 fn 0 exact; PERSON 31 exact 21/21; SURFACEBIT 3 exact 7/7. walk-analysis2 (pseed1sb) bits CB:27 OB:21.
2. Gate. js/AttributeSchema.js:127-146 openCapabilityAllows: all[] must be truthy, each none[] flag must be mapped (bitFor) and attrs[flag] === false, else fail closed. animate 31 is mapped, so none:["animate"] removes container-derived Open/Close (js/ActionSynth.js:142-148) on Belboz 13, roc 47, merchant 203, ogre 232, rocks 42/212 (animate+surface+container). Only the container rule path is gated; D229 open-state (ActionSynth.js:107-111) then picks Open or Close by bit 21.
3. Other rows: most rows use none ["supporter"(,"animate")]; supporter exclusion exists because 252e145 was REJECTED for Open on Zork III containers (facts:106). Here supporter is mapped (3) but deliberately not excluded for the rodent idol 78.
4. Initial-memory census (attr 27 set, 36 objects):
   - Excluded (animate 31): 13 Belboz, 42 green eyed rock, 47 roc, 203 merchant, 212 brown eyed rock, 232 ogre (+ junk-name 73, 250).
   - Newly offered Open (closed, bit21=0): 4 gold box, 67/107 massive cabinet, 145 bottle, 198 zipper, 214 sack [correct]; scrolls 16,20,31,69,110,112,125 [disclosed harmless extra].
   - Newly offered Close (bit21=1): 78 rodent idol [intended], 144 spell book, 75 moldy book; ALSO not disclosed: surfaces 50 ice floe, 95 blue carpet, 139 red carpet, 183 outcropping; fixtures 15/48 piles, 26 carving, 40 octagonal hole, 113 grouper nest, 148 construction, 160 crack, 172 mouth.
   Consumers: open containers (bit 21) now let contents be listed/seen (pile/nest/carpet contents) - an improvement consistent with the game's own state. No transparent mapping, so D233 outOfReach (ActionSynth.js:428) is not triggered.
Required: none in code. Disclosure in the row comment should name the surface/fixture Close extras (carpets, ice floe, outcropping, holes/crack/mouth, piles) alongside scrolls, since they exceed "Open on scrolls". Excluding supporter would lose the idol, so the trade is accepted under missing-options-first.
