# I5 browser touch verification (2026-11-06)

This browser check stands in for a phone check. It was run against **HEAD 4b6f2fe8**, using a git-archive tree in %TEMP%\i5head with games/ and node_modules copied in by robocopy /E /XJ. The tree's js/Map.js and js/ZvmCapture.js match HEAD apart from line endings. The working-tree M11 edits were not tested.

Setup:
- Method from browser-touch-1031/touch-verify.cjs: Playwright Chromium at 412x915 with hasTouch, isMobile and deviceScaleFactor 2.
- Seeded Math.random and the tutorial/splash flags, as in regression-gate.cjs.
- Taps use page.touchscreen.tap. No check here needed a long-press.

Script: `i5-touch.cjs` (`I5HEAD=<tree> node i5-touch.cjs`). Raw data: `results.json`.

| # | Check | Result |
|---|---|---|
| 1 | Door hint, Save Princeton (M7, D268) | PASS |
| 2 | Seated move, Hitchhik (M6, D269) | PASS (via a direction link; see details) |
| 3a | Inventory probe, anchor turn 1 (S1, D270) | PASS |
| 3b | Inventory probe, MakeItGood (S1, D270) | PASS |
| 4 | Status clock and hide option, Sherlock (S4, D272) | PASS |
| 5 | Room names, bookvol (M13/M14, D271) | PASS (only Home reached) |
| 6 | Rooms, guess (M5, D273) | PASS |

## Details

1. **Door hint.** After "no" the Common Room shows the bottom chip `SW → Entryway?`. The OUT chip also shows `→ Entryway?`. Tapping the SW chip moved the player to the Entryway: the game printed the Entryway description and the status line now reads Entry.... Shots: `1a-princeton-sw-hint.png`, `1b-princeton-after-tap.png`.

2. **Seated move.** After "turn on light" the player is in "Bedroom, in the bed". No compass exit chip is shown there, because no exit is known yet: all #exits chips lack `.shown` and tapping the bare W chip does nothing. So the tap went to the underlined direction link "south" in the room description, which also goes through Actionable.SubmitTapMove. The transcript then shows:
   - `>get out of bed` / "Very difficult, but you manage it..."
   - `>south` / "You miss the doorway by a good eighteen inches..."

   The miss is the game's hangover, and the M6 prefix-then-move is correct. A tap on an actual compass chip while in bed could not be exercised. Shots: `2a-hitchhik-in-bed.png`, `2b-hitchhik-after-tap.png`.

3. **Inventory probe.** On turn 1 at phone size the Equipment tab (`#pl-equip-tab`) is `display:none`, so it cannot be tapped. Equipment was opened with EquipmentUI.Toggle, the same path the probe-action-boundary harness uses.
   - In both games, every probe line in the DOM carries `pl-stat-probe` and `aria-hidden=true` and is 1px high: the `>inventory` and `>score` echoes and the forbidden sentences.
   - Neither forbidden sentence is visible in the after-close screenshots.
   - Equipment rows: anchor has clothes, trenchcoat, wedding ring, umbrella. MakeItGood has trenchcoat, shoes, hat, badge, gloves, car.

   The lines are still present in innerText, so a screen reader that ignored aria-hidden would read them. Visually they do not appear. Shots: `3a-anchor-equipment.png`, `3a-anchor-story-after.png`, `3b-MakeItGood-equipment.png`, `3b-MakeItGood-story-after.png`.

4. **Status.**
   - The strip shows `Time` / `Sat 5:00 AM`.
   - Options was opened with WorkspaceUI.ShowOptions (no menu tap). The group was expanded by tapping its summary, then the checkbox was tapped. Its label is "Hide the story's status line when the stat strip shows it". The brief's wording, "Hide game status line", differs.
   - On: #windowport gets `pl-hide-status`, the one-line grid is no longer visible, and the story top moves from 36px to 8px.
   - Off: the grid is visible again and the story top is back at 36px.

   Shots: `4a-sherlock-status-default.png`, `4b-sherlock-options-on.png`, `4c-sherlock-status-hidden.png`, `4d-sherlock-status-back.png`.

5. **Room names.** Steps: 'b', then look/n/s/e/w/u/d. The player is on the couch, so every move is refused and the pager ends the game. The only room name seen was "Home", and "|" and "down" never appeared. Hallway and the Library were not reached; the Library was skipped as allowed. Shots: `5a-bookvol-start.png`, `5b-bookvol-walk.png`.

6. **Rooms.** After "new", ParchLockMap.Rooms is Verb Guessing Booth, Behind the Booths, The Midway. The map drawer was not opened for the screenshot. Shot: `6-guess-map.png`.

## Observations (not failures)
- In every screenshot the splash text ("ParchLock!", "Start the Adventure!") shows through behind the story at file:// with the splash-seen flag. This is a harness artifact and not part of these checks.
- The Equipment tab is hidden on turn 1 at phone width (point 3).
