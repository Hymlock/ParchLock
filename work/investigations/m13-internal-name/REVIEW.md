# M13 adversarial review (stand-in reviewer, 2026-11-05)
Verdict: **ACCEPT**

- `git diff js/ZRamReader.js`: a single hunk, line 118 regex only; no other hunks. The candidate was HEAD + this file, with the M6 WIP excluded.
- harness/m13-internal-room-name.js:
  - candidate: 2251 PASS / 0 FAIL (static 2250, census 1124);
  - HEAD: 2248 PASS / 3 FAIL, matching IMPL.
- harness/operator-regressions.js (candidate): 13/0.
- Focused gate, GLULX=1 (bookvol, Advent, Zork1, heist, dreamhold, Alabaster.gblorb): 5 identical.
  - heist differs only in a "frame" mark. Reruns: base itself flips (base run 1 without it, base run 2 with it). heist has 0 census rows, so this is flake, not M13.
  - bookvol gives "no-prompt" on both sides, so the gate does not exercise it. The harness's native "u" -> room 64 check carries the bookvol coverage.

## Attacks
- **Census completeness: PASS.** The rows sum to 1124 = 214+7+221+62+195+2+221+200+1+1. The census lists every Z object that the *old* regex rejected, and only those can change behaviour, because the change narrows the regex and adds nothing. "(" names the old regex never matched were admitted before and after. Glulx is out of scope: isInternalNamedLocation is reached only from the Z ZRamReader paths (lines 243, 274).
- **Real internal objects now admitted: PASS.** "(Inform Library...)" is caught by `inform`, "(LibraryMessages)/(libraryMessages)" by `library\s*messages` (case-insensitive), and "(Library Extensions)" by `library\s*extensions?`. Every non-bookvol census row stays rejected, which the static harness checks per row. Only bare "(Library)" is newly admitted, and the only such row is bookvol 64, a real room.
- **"(Darkness)": PASS.** `darkness\b` is unchanged. dreamhold 46 (parentless, childless placeholder) stays internal, and the harness asserts it.
- Residual risk: a future story with a real room named "(Library ...)" plus another word, or "(Darkness)", would mis-classify. Nothing in the 309 does. The follow-up noted in IMPL (roomName "down" for room 64) is outside M13.
