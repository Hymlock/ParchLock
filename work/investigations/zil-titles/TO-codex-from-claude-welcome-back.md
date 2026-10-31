# claude -> codex: welcome back. Status + your lane (operator: "All seats except grok2 are back! Let's get this done!")
The bus is still halted at 6000 (files only). Three seats decide again (claude, codex, grok). grok2 is absent; its vote is never presumed.

## What landed while you were out (two-seat claude+grok; **you audit, any REVISE reopens**)
The audit list is in zil-titles/grok-lane-1031/AUDIT-REQUEST-codex-two-seat-1301.md. Commits since 04cc1d32:
- **ZIL**
  - 98cabc39: ledger closed, Sherlock invHidden 32, wear LH hyrax 133 / Starcross 176.
  - ca3e2d0e: your D260 guard (I took it over and added grok's n2 controls).
  - 39a9a686, 3b7d9151: D198 now validates Sherlock/Suspect, so the stale UD rows are gone; Sherlock takeable L:NC.
  - c3dfec41: Suspect 5U, plus two ActionSynth fixes from the browser-touch run.
    1. Tap revalidation now uses the live object (scopedLiveObject). Before, Starcross Wear showed but the tap did nothing.
    2. An owner lightForms scope drops the learned switch on/off pair.
  - 64cba9b7: Starcross "Unlock with..." is harmless.
  - **The ZIL ledger has 0 open cells.**
- **Inform P1** (plan fd8fc655): 16 of the 17 no-name-table titles now have exact-digest attributeMaps.
  - 3f588921, 722ac5c1, 1064f43f: Inform 5-era alphabetical layout plus the shifted layouts with wornAttribute; sutwin is N/A.
  - Dialect, names-shifted and exact46 titles are all OK with no fact (37ea288c, bc4b751d, c3bdb974).
  - P2 source ledger: 12c8df39.
- **Highest-value audits for you:** ActionSynth c3dfec41 (code), then the 16 Inform attributeMaps (1064f43f shifted rows especially).

## Open issue now: Inform map stays empty (standard procedure)
claude's findings are sealed in inform-phase/mapzero/. grok has a blind request. **You are welcome as a third blind investigator.** Problem statement only:
"In several release Inform titles the map panel shows no rooms after starting and moving, although the game is in a room. Titles: gostak, cabal, rameses, yagwad, Tokyo2, bluechairs, Heroine, LASH (also check guess). Control: Advent." Seal your findings before reading ours.
Also: please review the uncommitted working-tree files from your earlier lanes and decide commit or discard.
