# Open work

November 2 operator priority: D263 module learning persistence and learned-item radial precedence is implemented
and independently accepted after final validation. Existing Learned Words editing/Ignore/tracking/erase is reused; no legacy migration or new
learning database. Actual HugeCave older-save restore and unsaved exit/reopen retain Light/Douse and their priority.
The final immutable309x2 comparison has zero unresolved regressions (seven measured annotation variances and seven matching no-prompt gaps); this entry does not close the unrelated rows below or announce an APK.

Baseline annotation follow-up: `heist.z8.js` can link the introductory metaphor "frame of mind" to frame124.
Natural-startup passive captures reproduce it on the unchanged baseline with identical RAM/prose to the candidate;
this existing annotation race is retained in D263 evidence, not claimed fixed by the learning repair.

Updated 2026-11-01 (America/New_York), HEAD e643191b. This is the repo's working list of what is still to be implemented. It replaces the Oct 22 list, which is kept for history as [OPEN_WORK-2026-10-22-OUTDATED.md](OPEN_WORK-2026-10-22-OUTDATED.md). Decisions and evidence remain in PRODUCTION_PLAN.md and ARCHITECTURE_UML.md.

Source: the "What's Left to Implement (Nov 1, 2026)" report (48 items). Items the report marked "unverified" were rechecked on 2026-11-01 with `git log --since=2026-10-20 --grep` plus a code grep. None had a matching commit, so they stay open; corrections are noted in the rows.

Status is one of: **Done** (with the commit), **Partly done**, **Not started** or **Blocked**. Size: S small, M medium, L large.

Latest APK: ParchLock-dev.apk sha256 7A9C9C18...A72C, versionCode 49, built 2026-11-01 00:39 ET from e643191b (review-lane-1101/DONE.md).

## Map

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| M1 | Empty map in Cabal, Blue Chairs, Tokyo2, Rameses, Heroine's Mantle: pin the real player object | Map panel stays empty and inventory shows the wrong character's items | **Done** e643191b | Exact-digest playerGlobal facts (D216/D220 path). grok-review VERDICT-001-r3 ACCEPT; gate 0 regressions. Codex/Claude audit pending (E5). Phone check pending (E7) | HANDOFF-grok-solo-1101 #1; mapzero/CLAUDE-SEALED | S |
| M2 | The Gostak: room resolver frozen at room 80 | Map never moves past the first room | **Done** e643191b | Same cause as M1 (the app followed the wrong player object); playerGlobal 18 fact. Travel Delcot->Gomway proved (mapzero-measure/s10, s11) | HANDOFF-grok-solo-1101 #2 | M |
| M3 | LASH: player id jumps 251 to 476 after CONNECT | After CONNECT, map and inventory may follow the old player object | Not started | Measure what the game swaps at CONNECT | HANDOFF-grok-solo-1101 #4 | M |
| M4 | yagwad: room admitted through a third path that contradicts the first-room gate | Map works (1 room), but the path contradicts the documented rule | Not started | Reconcile MapTopology.mayAdmitFirstCurrentRoom with the "existing-resolver" path | HANDOFF-grok-solo-1101 #3 | S |
| M5 | Guess the Verb: one-room game behind a NEW/BOY menu; is 0 rooms correct? | Map may stay empty | Not started | Decide: admit the room after the menu, or record 0 as expected | HANDOFF-grok-solo-1101 #5 | S |
| M6 | Look-ahead from a climbed room, and moving while seated or in a vehicle | No exit prediction after climbing or while in a bed, chair or vehicle | Not started | Open since D222 | PRODUCTION_PLAN D222 | M |
| M7 | Door exits: read the far side from door_to | A door exit stays a hint and can't be routed until walked once | Partly done (rechecked 11-01) | ZRamReader.js (~478/529) already uses door_to to classify an exit as a door; following it to the far room is not done. No commit since Oct 20 | OPEN_WORK Oct 22 (D157/D160) | M |
| M8 | Typed non-compass moves ("enter portal") don't become map edges | Rooms reached by ENTER aren't linked | Not started (rechecked 11-01: no commit) | Open since D89 | OPEN_WORK Oct 22 (D89) | M |
| M9 | Keep remotely described rooms (Starcross, Zork II) out of visit history | Rooms only seen described could count as visited | Not started | Still open per D262 | PRODUCTION_PLAN D262 | M |
| M10 | Ballyhoo "Connection" room identity | One Ballyhoo area creates no map room | Blocked | Not reopened by D160/D201; needs an operator call | OPEN_WORK Oct 22 (D160) | S |
| M11 | Click-to-rewind: tap a visited room to UNDO back to it | Feature from the original spec is missing | Not started | No commits | OPEN_WORK Oct 22 Phase 5 (D32) | L |
| M12 | Map beautify: cluster layout, crossings, floor tabs, docking, narrow-screen collapse | Big maps look tangled | Partly done | Visual sweeps accepted; Phase 6 mechanics remain | OPEN_WORK Oct 22 Phase 6 (D30) | L |

## Inform phase

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| I1 | P2: decide per-title Inform attribute ledger cells in batches of about 10 | No audited record of which flags the app trusts in Inform titles | Partly done | Generator landed (12c8df39); no batches decided. Needs two-seat ACCEPT (grok-review during solo) | INFORM-PHASE-PLAN-draft P2 | L |
| I2 | Ledger generator: show 0, not N, when a title lacks a name | Ledger misreports Heliopause, temple and Vacation cells | Not started | Add a missingNames field | GROK-REVIEW-p2-ledger-1450 | S |
| I3 | Build the inform-layout harness (7 flags plus a bit-flip control) | Inform attribute maps can't be checked automatically | Not started | No harness/*inform* file exists | INFORM-PHASE-PLAN-draft s5 | M |
| I4 | bookvol and chico: start-up key prompt blocks checks | Radials in these 2 titles unverified | Not started | Harness must answer a char-input prompt | HANDOFF #8; P3 | S |
| I5 | P4: browser touch-verify on a sample | Would prove taps and radials work in Inform titles | Blocked | Waits for the I1 batches | INFORM-PHASE-PLAN-draft P4 | M |
| I6 | Glulx: 5 titles parked (no map, zero items) | Glulx games run with no map or inventory | Blocked | Needs an object model and a Glulx RAM provider; operator ruled this last | PRODUCTION_PLAN D38 | L |

## Actions / radials

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| A1 | Suspect: worn mask offers "remove mask", which the game rejects | Dead radial row ("You'll have to be more specific.") | Blocked | The noun comes from shared ActionSynth.referenceFor and there is no facts noun-override, so this is a shared-code change (skipped 11-01, REVIEW-REQUEST-002) | HANDOFF #8; TO-claude-1336 | S |
| A2 | Sherlock lamp: duplicate generic switch verbs in the radial | Repeated switch rows beside on/off | **Done** c3dfec41, 7f0cba58 | Already fixed: other switch/turn verbs are dropped when an owner lightForms scope exists. Residual case is a user-saved LearnedWords command, tracked as A3 | HANDOFF #8 | S |
| A3 | LearnedWords commands re-enter after the inspect filter | A taught verb can come back after being filtered | Not started | Choose: filter (ActionSynth.js ~660) or document as intended (TO-claude-1345). Low severity | HANDOFF #7 | S |
| A4 | static/scenery fallback bits leak onto wrong objects | Suspect food, lariat, mask, TV marked static; doors marked scenery | Not started | Own packet; touches shared code | PACKET-suspect-5U-final-1332 | M |
| A5 | Commands stages 7-8: held-out challenge and legacy ActionSynth cleanup | Two command paths stay alive | Partly done | Cutover defaults ON; stages 7-8 have no commits | OPEN_WORK Oct 22 (D88) | L |
| A6 | Options cosmetics: two panels still in monospace | "Configure directions" and "Replay tutorial" look off-style | Not started (rechecked 11-01: no commit) | Monospace is the app-wide body font by design (ParchLock.css); css/Tutorial.css:65 sets 'Roboto Mono'. Operator must confirm which two panels and the intended font | OPEN_WORK Oct 22 | S |

## Stats / status

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| S1 | Status probe text leaks into the story on the first check | "You are carrying..." lines appear | Partly done | Partly fixed (4d6d0c0); general fix has no later commit (rechecked 11-01). Recheck on the 11-01 APK | OPEN_WORK Oct 22 item 2 | M |
| S2 | Duplicate items and names after loading | Cut-off names like "nutritiou" | Partly done | Fixed in source (8c2f2056); needs a phone recheck | OPEN_WORK Oct 22 items 4, 10 | S |
| S3 | Phone: status-line fields overlap | Anchorhead room name and "day one" overlap | Not started (rechecked 11-01: no commit) | | OPEN_WORK Oct 22 (D137) | S |
| S4 | Sherlock/Curses date columns; option to hide the game's status row | Raw text columns; status row duplicated | Not started (rechecked 11-01: no commit) | Designed, not built | OPEN_WORK Oct 22 (D149) | M |
| S5 | Score pin edge cases | Score can show high after an early announcement or UNDO | Not started (rechecked 11-01: no commit) | Recorded, not fixed | OPEN_WORK Oct 22 (D175/D176) | M |
| S6 | Make It Good: SCORE and first Equipment check | Equipment can end "unavailable" with no reason | Not started (rechecked 11-01: no commit) | | OPEN_WORK Oct 22 | S |

## ZIL wrap-up

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| Z1 | 94 "no reader" ZIL keys: build a consumer or rule out of scope | visited/light/lightSource decoded but unused; 7 imported-ZIL titles have no light option | Blocked | Three-seat decision (lightSource proposal R2, 2558870e); Claude and Codex back Nov 5-6 | ZIL ledger L:NC | L |
| Z2 | Sorcerer: worn amulet and lighting not displayed | Amulet not shown worn; app says dark when lit | Not started | Consumer gap, marked OPEN | PRODUCTION_PLAN | M |
| Z3 | Sherlock: Take hints need the grammar FIND reader | Sherlock Take hints are generic | Blocked | D214 FIND-reader follow-up | FINAL-DISPOSITIONS-r1 | M |
| Z4 | Seastalker: find a useful BOARD command | No correct one-tap boarding command | Blocked | Codex REVISE of the airlock CLOSE; research first | PRODUCTION_PLAN D262 | M |

## Build & release

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| B1 | make-dist deletes the old dist before building | A failed build leaves no dist at all | Not started | make-dist.bat line 20 (rmdir first); build to temp, then swap | make-dist.bat | S |
| B2 | Builds ship working-tree files, including uncommitted ones | An APK can contain files not in git | Not started | robocopy reads the live tree; add a clean-tree check or use git archive | make-dist.bat | M |
| B3 | Bump versionCode (was 48) | APK75 and the Oct 31 APK shared versionCode 48 | **Done** 1d9a3130 | versionCode 49 (VERDICT-002 ACCEPT) | android/app/build.gradle | S |
| B4 | Write publish-release.ps1 | No scripted release | Not started | File doesn't exist | Release prep | M |
| B5 | Public distro repo: clean history with only the 80 KEEP titles | Removed games remain in old commits | Blocked | List exists (GAMES_INCLUDED.md); re-clone needs the operator | docs/game-licensing-audit.md | M |
| B6 | Release sign-off: keystore, art provenance, name clearance, legal, devices, pm_vm_probe rename | Release can't ship until done | Blocked | Operator decisions; lib/pm_vm_probe.* still present | OPEN_WORK Oct 22 (D99) | L |
| B7 | Phase 9 hardening: performance, accessibility, fallbacks, full green harness | General robustness | Not started | Large | OPEN_WORK Oct 22 Phase 9 | L |
| B8 | Fix two flaky or failing harnesses | Gate noise | Not started (rechecked 11-01) | learned-words-corrections has no fix commit. d201-unnamed-identity 68/1 ("taken LLR object 195") and d201-unresolved-actions ("real printed sword vocabulary") fail on HEAD before and after e643191b (swap test). Gate flaky marks: Sherlock coat, huntdark, vespers, Delusns, medusa, permagic | OPEN_WORK Oct 22; review-lane-1101 | S |

## Evidence debt

| ID | Item | User-visible effect | Status | Blocker / notes | Source | Size |
|---|---|---|---|---|---|---|
| E1 | Lapel (Sherlock 174): disclose GUI-click and whole-title proof gaps | None (record honesty) | Partly done | Codex natural proof (14af8535) needs peer review | HANDOFF #10; D262 | S |
| E2 | Wear LH 133 / Starcross 176 natural-acquisition proof; LH ring id | Wear works in constructed tests only | Not started | Needs native routes | PRODUCTION_PLAN D262 | M |
| E3 | V34/V69: document which slot is pinned and why | None | Not started | Docs only | HANDOFF #6 | S |
| E4 | Seated/vehicle room-name rule: provenance | Active everywhere, proven only on seeds | Blocked | PARKED/UNACCEPTED (Codex) | PRODUCTION_PLAN D222 | M |
| E5 | Codex audits: 16 Inform maps, ActionSynth, all solo-period commits (incl. e643191b, 1d9a3130) | Could reopen items | Blocked | Codex back Nov 6, Claude Nov 5 | codex-votes-0231; SOLO-COMMITS | M |
| E6 | Other seats' uncommitted work (~3,300 dirty entries): commit or discard | Risk of lost or stray work | Blocked | Only the owners can decide | git status | M |
| E7 | Operator phone test of the 11-01 APK (7A9C9C18, versionCode 49) | Sherlock pocket/lamp, LH/Starcross Wear, Suspect clothes, heist bag, break-in chair, plus the 6 map-zero titles | Blocked | Needs the operator and the phone | TO-claude-from-grok-APK-BUILT; review-lane-1101/DONE.md | S |

## Known issues found 11-01 (not yet in the list above)

- Blue Chairs: app inventory adds "twenty-three dollars" and a shirt that native INVENTORY does not list.
- Tokyo2: app shows soup/popcorn while native inventory is empty.
- Tokyo2 player id 81 also appears in globals 130/133 (VERDICT-001 N1).
