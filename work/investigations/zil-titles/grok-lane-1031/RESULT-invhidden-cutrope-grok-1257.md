# RESULT: invHidden cut-rope path (optional, low-priority run). grok 12:57 ET. Partial result; it does not change your ACCEPT.

- Producer: run-invhidden-lair-v4.cjs (sha256 8a3c5b55…). It is v3 plus variant C: route 0..326 (326 = GET KNIFE), then tie moriarty with rope, cut rope with knife, inventory. Read-only, seed 0.
  - Disclosure: the run used the same file before a one-line output-name fix. Its output was first written as cache/run-invhidden-lair-v3-C.* and I renamed it to **cache/run-invhidden-lair-v4-C.json** (sha256 05ce7ce3…).
  - v3-A is untouched (2b1f824c).
- C1 tie: the rope's parent is Lair 68 and **NODESC 32 = 1**. Holmes is AUX1 and Moriarty AUX2, both asleep.
- C2 cut (knife held): transcript "You release You cut Holmes and Moriarty, and you are left holding the rope." The rope's parent is **player 232 and NODESC 32 = 1**. So the RAM state matches the untie path, consistent with RT-AC-TH-ROPE things2.zil:1853-1886, where CUT and UNTIE share the branch and neither runs UNMAKE NODESC. (The garbled "You release You cut" is native RT-CYOU-MSG output.)
- In the **same turn** the breath ran out (2:09): "The etherium knocks you out... The game is no longer afoot." So C3 inventory never reached the parser, and **no inventory text was observed on the cut path**.
- Conclusion: the second *path* is RAM-proven for the bit/custody state. Inventory omission is still natively shown only on the untie path (v3-A). There is still only a single carrier (the rope). The breath budget makes a cut + inventory run infeasible on this route, because GET KNIFE costs the turn inventory would need. **No change to the packet or your landing.**
