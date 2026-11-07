# I5 touch check — grok (Grok1)

## Method and its limits
- Script: `grok-i5/touch-probe.cjs`, which copies the method in `harness/d210-radial-selection.js`. It uses Playwright Chromium at 412x915 with isMobile and hasTouch, holds a CDP touchStart for 900 ms on a visible `.pl-act` word, then reads the `#radial-menu` button labels. Targets marked `+` also tap More.
- Raw output is in `grok-i5/probe-run-1.txt` and `grok-i5/probe-run-3.txt`. Run 2 failed: the probe sent touchEnd twice. Screenshots are in `grok-i5/shots/`.
- This is headless automation on the owner's machine. It is NOT a manual GUI check.

## Results (cells are batch 1/2 TRUST unless noted)
| Title | Object | Labels on the ring | Matches TRUST? |
|---|---|---|---|
| Lists and Lists | door 19 (closed) | Examine, Open, Close, Unlock with…, More, Tools | openable: yes. open-state: **not reflected**, because Close shows while the door is closed |
| Lists | desk 24, couch 25 | Examine, Search, Unlock with…, More, Tools | supporter: **no Put-on** |
| Lists | genie 31 | Examine, Talk to, Unlock with…, Ask about…, More, Tools | animate: yes |
| Looking For Godot | box 17, closed and open | Examine, Take, Open, Close, Search, More…, Tools. More gives Empty, Unlock with… | openable and container: yes. The labels do not change with state |
| Christminster | handbag 62 (held) | Examine, Open, Close, Search, Empty, More…, Tools | openable and container: yes |
| Christminster | table 100 | Examine, Search, Unlock with…, More, Tools. More gives a generic A–Z verb list | supporter: **no Put-on**, even on the More page |
| Christminster | busker 104 | Examine, Talk to, Unlock with…, Ask about…, More, Tools | animate: yes |
| Break-In | rucksack 46 | Examine, Take, Open, Close, Search, More…, Tools | openable: yes |
| Break-In | desk 35 | Examine, Search, Unlock with…, More, Tools | supporter: **no Put-on** |
| So Far | bench 29 | Examine, Enter, Exit, Search, Unlock with…, More, Tools. More gives a generic list | enterable: yes. Put-on: none |

## Findings
1. Openable items always offer both Open and Close. The open bit (14) does not set the ring, so the open-state cells are **unproven in the UI**.
2. Supporters never offer "Put X on", on the ring or on the More page. The supporter (20) TRUST cells have **no carrier in the touch UI**. Caveat: the player held an item only in the Christminster table test.
3. "Unlock with…" shows on supporters, NPCs and enterables that are not lockable. This looks like a lockable leak or a default. Needs a source check (not done).
4. Animate (Talk to / Ask about) and openable containers (Open, Search, Empty) match TRUST.

## Not tested
- Break-In chair: not visible.
- The Lists door from the White Room: not visible.
- A held-item Put-on on Break-In (the run started at the street, so no marks).
- Light, worn, visited.
