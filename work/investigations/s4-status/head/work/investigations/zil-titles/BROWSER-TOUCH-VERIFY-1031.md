# Browser touch verify: ZIL radials (2026-10-31)

This run used the real `play.html` in Playwright Chromium with a 412x915 viewport, `hasTouch`, `isMobile` and DPR 2. Each long-press was a real touch: CDP `Input.dispatchTouchEvent` touchStart, then touchEnd 800 ms later. Taps on radial pills used `page.touchscreen.tap`. The radial labels were read from `#radial-menu.show` buttons.
Script: `work/investigations/zil-titles/browser-touch-1031/touch-verify.cjs`. Raw output: `browser-touch-1031/results.json`. Screenshots: `browser-touch-1031/*.png`.

**Tree state:** HEAD moved from 39a9a686 to **3b7d9151** during the run. The working tree also had **uncommitted** edits from another seat in `js/ActionSynth.js` (`scopedLiveObject` tap revalidation) and `js/ModuleStatFactsClaude.js`. The final results below come from that working tree. Check 3 behaves differently with and without the uncommitted ActionSynth change (see the note under check 3).

| # | Check | Result | Option lists (exact) |
|---|---|---|---|
| 1a | Sherlock start inventory: whistle, coat, hat, black bag only | **PASS** | rows: coat (worn, open), hat (worn, closed), whistle (worn), black bag (closed). No pocket, lapel or pound note. |
| 1b | Long-press "coat" in the intro text | **PASS** | Examine, Remove, Search, Empty, Close, More..., Tools |
| 2 | LH hyrax 133: Wear, then "fits", then Remove | **PASS** | before: Examine, Drop, Give to..., Put in..., Wear, More, Tools. Tap Wear sent `wear hyrax` and the game replied "It fits surprisingly well." after: Examine, Remove, More, Tools |
| 3 | Starcross junk (tattered) suit 176: Wear, then worn | **PASS** (current working tree) | before: Examine, Drop, Give to..., Put in..., Wear, More..., Tools. Tap Wear sent `wear tattered suit` and the game replied "You are now wearing the tattered old suit..."; bit 24 is set. after: Examine, Remove, Unlock with..., More, Tools |
| 4 | Sherlock lamp 166: Turn on, then Turn off | **FAIL** | before: Examine, Drop, Give to..., Put in..., Turn on, More..., Tools. Tap Turn on sent `turn on lamp` and the game replied "You turn up the wick...". after: Examine, **Switch on, Switch off**, Drop, Give to..., More..., Tools. "Turn off" is missing. |

## Notes
- **Check 3 before the uncommitted ActionSynth edit:** the Wear pill appeared, but tapping it did nothing. The tap reached the button, but `radialCommandCurrent` -> `identityWearCommandCurrent` rebuilt the scope from a bare `{id, name}` stub. That stub gets null, so the command was silently dropped and no Inject happened. The other seat's uncommitted `scopedLiveObject` change fixes this. It must be committed for the PASS to hold.
- **Check 3 after Wear:** the radial offers "Remove". Starcross's JUNK-SPACESUIT-FCN only handles TAKE OFF (PROPOSAL-wear-subdomains-r1 item 2), so "Remove" is probably the wrong-but-harmless verb. "Unlock with..." also appears, which looks odd. Neither was tapped.
- **Check 4 diagnosis (not fixed, read-only):** after the lamp is on, `ActionSynth.lightFormScopeFor(lamp)` correctly returns `{verb:"turn off", command:"turn off lamp", side:"off"}`, and `AttributeSchema.lightForms` returns `["turn off"]`. The inventory radial still shows generic "Switch on"/"Switch off" in place of the scoped "Turn off". The scoped slice is lost or replaced on the lit side, in the inventory radial path.
- Check 2: gloves 203 are in 202, not held, so they are not worn.

## Disclosures (seeded custody)
- Sherlock lamp 166: `insert_obj(166, 232)`, which moves it from 275 into the payload player 232. This is not natural custody.
- LH hyrax 133: `insert_obj(133, 56)`, from 250 into player 56, at game start.
- Starcross suit 176: route `starcross[0:22]` was replayed, then `insert_obj(176, 239)` moved it from the chieftain 169 into player 239. Then `clear_attr(176, 23)` cleared NDESCBIT, which is what GIVE-TO-CHIEF does natively. Without it, the panel and the game's `i` both hide the suit.
- Player ids come from `WorldModel.lastPayload` (`probe.inventoryRootId` / `playerId`). Math.random was seeded as in regression-gate.cjs, and the splash and tutorial keys were set. The inventory warning was marked seen through `StatTracker.markInventoryWarningSeen()`.
- Inventory long-presses land on the left part of the `.equip-name` label. The row centre lies over the drag grip, which deliberately ignores hold, so this matches where a finger presses on the name.
- No js/ edits and no commits were made.
