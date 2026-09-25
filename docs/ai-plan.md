# AI Plan

## Stored Plan: D113 Non-Live Adaptive Tutorial

State: FULLY PLANNED; READY FOR LATER IMPLEMENTATION AFTER THE CURRENT ACTIVE WORK.

This section preserves the operator-approved direction. It is planning only: no tutorial
product code, distribution artifact, or APK has been changed. The tutorial map chapter is
reconciled with the implemented D112 contract (collapsible controls, shared room/note search,
permanent Notes header, Known Rooms note gesture, and optional Settings-owned Add note button).
When implementation is authorized, promote this contract into `PRODUCTION_PLAN.md` and
`ARCHITECTURE_UML.md` before coding so those two canonical documents and the implementation
remain one reviewed change set.

### Purpose and completion behavior

Replace the current two-popup, live-story `MobileTutorial` with a responsive tutorial for
mobile and desktop. The tutorial runs in a completely non-live dummy environment: it must
not start an interpreter, load a story/module, connect to the real map or save model, start
Read Aloud, request microphone permission, invoke speech recognition, or change live
favorite/done/module/map/note state.

On Done, the tutorial writes only its versioned completion state, destroys its temporary
state, and navigates to the **live module-selection screen** (`index.html`). It must not
start, preselect, or silently resume a module. Skip follows the same destination and records
completion so the tutorial does not recur immediately. Replaying the tutorial from Settings
also finishes at the live module-selection screen.

### Voice and tone (operator: consumer-facing friendly)

The plan's own chapter copy below is implementer shorthand ("explain that Z-machine modules
receive the complete mapping/action layer") -- correct information, but not what should ever
appear on screen. Real tutorial copy must be rewritten in this voice before it ships:

- **Warm and encouraging.** Second person ("you"), short sentences, a little personality. Sounds
  like a friendly consumer app walking someone through it for the first time -- not a manual,
  not a changelog, not an engineer's own note-to-self.
- Celebrate small actions plainly rather than staying flat: "Nice, that's favorited!" beats
  "The star toggles favorite status." One idea per line; avoid stacking two instructions in one
  sentence.
- No jargon from this codebase's own internals -- "GridWindow," "CharInput," "structurally
  detected," "the D112 contract" are all implementer language and must never appear in tutorial
  copy. Say what the player sees and what happens, not the mechanism.
- Still accurate: warmth never overrides the plan's own factual guardrails below (no fixed verb
  promises, no invented exits, module-dependent wording where the plan says so). Friendly and
  correct are both required, not a tradeoff.
- Two calibration examples, engineer shorthand -> actual tutorial copy:
  - Chapter 1.3 (favorites) shorthand: "spotlight the star, let the user toggle it, show that
    favorites rise to the top." Actual copy: *"Nice! That star saves this story to your
    favorites so it's easy to find again. Tap it again anytime to remove it."*
  - Chapter 2.6 (voice input) shorthand: "explain hold-to-talk (default) and optional
    tap-to-toggle mode." Actual copy: *"Hold the microphone and say your command -- release when
    you're done, and we'll type it in for you to check before it's sent."*
- This section is guidance for whoever writes the real copy, not copy itself -- every chapter
  below still needs an actual pass in this voice before implementation, not just a literal
  transcription of its shorthand bullets.

### Architecture

1. Add a dedicated responsive training route, provisionally `tutorial.html`, backed by a
   small `js/Tutorial.js` controller and `css/Tutorial.css`. Use semantic DOM recreations of
   the real interfaces, not screenshots whose controls or text will become stale.
   This is one shared route, controller, dummy data model, and chapter sequence for mobile and
   desktop, with responsive presentation and platform-adapted wording rather than separate
   platform builds or independently drifting tutorials.
2. The page may load shared product identity, fonts, icons, and color variables. It must not
   load `ReadAloud.js`, `Input.js`, `Map.js`, `ModuleLibrary.js`, Quixe/ZVM/Glk, story files,
   native speech plugins, or any other live gameplay service.
3. Use original fictitious **Training Adventure** data whose shapes are derived from known
   module behavior. Do not reproduce copyrighted story prose. This keeps the tutorial useful
   when the distributed application contains no bundled modules.
4. Keep tutorial interaction state in memory. The only durable writes are a versioned
   completion key and, optionally, a current tutorial chapter for crash/reload recovery.
   Dummy search, favorite, done, inventory, notes, map, mic, and radial actions never write
   the real application's storage keys or databases.
5. Replace `PL_MobileTutorialSeen` with a versioned cross-platform onboarding contract.
   A major tutorial revision may increment the version and show once again; copy-only changes
   must not. Migrate an existing completion deliberately so upgrades do not surprise users.
6. First-install launch order is Splash -> Tutorial -> live Module Selection. Returning users
   continue through the normal splash/module flow. Settings exposes **Replay tutorial** and
   **Reset tutorial**, with reset touching only tutorial state.
7. Each screen has Back, Next, Skip tutorial, progress (`Chapter x of y` and step count),
   keyboard focus management, screen-reader labels, reduced-motion behavior, and a compact
   mobile composition. Instructions adapt terms to the platform: tap/touch-and-hold on touch;
   click/right-click on desktop.

### Chapter 1: Choose a module

Use a dummy version of the real module library, then return to the real library only after
the tutorial ends.

1. **Choose a story:** identify the title, author, and compatibility/status text; demonstrate
   that selecting the title launches it. Explain that Z-machine modules receive the complete
   mapping/action layer while currently supported Glulx modules are play-only.
2. **Search:** focus the search field and filter the dummy cards by title, author, and subtitle.
3. **Favorites:** spotlight the star, let the user toggle it, show that favorites rise to the
   top, and demonstrate the favorites filter.
4. **Done:** spotlight the completion toggle, explain that it is the user's own reading/play
   status rather than game progress, then demonstrate Done and Unfinished filters.
5. **Modules:** demonstrate where compatible local files/folders are added and managed. State
   that technical compatibility is checked but the user is responsible for rights to files;
   imported modules remain on the device. No real picker opens in training.

### Chapter 2: Play screen

Render an original dummy room with the same layout contracts as the real play screen.

1. **Story and command line:** distinguish story output, the current prompt, command entry,
   submit arrow, command history/autocomplete, and the fact that a command is not sent until
   submitted.
2. **Actionable words:** quick tap/click submits the deterministic primary action. Touch-and-
   hold/right-click opens the object's module-derived radial. Wording varies by module, so the
   tutorial must not promise that every game uses `examine` or any other fixed verb.
3. **Game radial and Tools:** touch-and-hold the command line or submit arrow to open the game
   radial. Spotlight Tools and its combined mobile command/menu list. Desktop also identifies
   the separate Menu control without showing a nonexistent mobile bottom-menu button.
4. **Directional radial handle:** spotlight the small pulsing direction handle above the input
   row. A hold opens the current room's real-exit compass and sliding/releasing submits the
   highlighted direction; a quick tap opens its settings. Clearly distinguish holding this
   small handle from holding the adjacent command line or submit control to open the game
   radial. Desktop copy and interaction use the corresponding mouse and keyboard controls.
5. **Adaptive radial ordering:** demonstrate that use fills a command pill and that any used
   command outranks an unused command. Higher-use commands move inward/upward; ties remain
   deterministic. More and Tools are launchers and do not compete as gameplay commands.
6. **Voice input:** spotlight the microphone. Explain hold-to-talk (default) and optional
   tap-to-toggle mode in Settings; show listening, processing, and error states. The recognized
   text is inserted for review and is never submitted automatically. Training requests no
   permission and records no audio.
7. **Map entry:** spotlight the subtle right-edge map tab on mobile and the Map route in Tools/
   desktop menus. Demonstrate that the same tab returns from the map to the story.
8. **Small edge room banners:** separately spotlight the tiny room/exit banners arranged around
   the outside edges of the story screen. Explain that each visible banner is a discovered
   neighboring room, its small badge is the real direction or module-specific exit label, and
   tapping/clicking either the label or room name sends that travel command. Their screen-edge
   placement reflects direction (top/north, sides/east-west, bottom/south) but is a compact
   navigation aid, not a distance-accurate map. A note icon opens that room's notes. The banners
   hide while the full map is open and absent/unknown exits are not invented.
9. **Current-room and status details:** identify the status/title strip, current-room note icon
   when present, and transient direction/room feedback so small indicators are not mistaken for
   story text.
10. **Native single-key screens:** explain that some module-owned Help or menu screens use one
    key at a time. On mobile, the shared directional widget changes into its merged **arrows**
    mode automatically when a structurally detected GridWindow character prompt requests it; it
    is not a second standalone arrow-pad. On desktop, the same arrows mode exists as an optional,
    off-by-default manual overlay in Options (a real keyboard already has arrow keys, so it never
    auto-opens there) -- mention it only briefly as an optional aid, not as parallel behavior to
    mobile's auto-detection. Distinguish this mode from normal travel directions and the command
    line, and demonstrate it without opening a real module.

### Chapter 3: Full map

Open a dummy map that matches the final reviewed D112 interface. Give each section its own
popup and a harmless interactive demonstration.

1. **Room map:** identify the current room, neighboring room boxes, real exit labels, and path
   lines. Demonstrate pan, zoom, and selecting a room to inspect its local connections. State
   that the map records discovered information and is not a walkthrough or scale drawing.
2. **Room-box controls:** explain current-room highlighting, center-back control, travel control,
   note icon, and removal of a displayed connection. A tentative visual connection means the
   relationship is known from available evidence but does not fabricate a command.
3. **Map controls:** expand the collapsible section and cover Center, zoom out/reset/in, Maps
   save/load/download, and Reset Map. Clearly distinguish a map snapshot from a game save and
   warn that Reset Map removes the working map and its room notes.
4. **Items:** expand Items, show count, nested/carried/worn objects, Refresh, and item action
   access by quick action versus radial. Explain that availability depends on the module engine
   and the latest structurally observed inventory.
5. **Search:** demonstrate that the field above Known Rooms filters both room names and note
   text without changing the map data.
6. **Known Rooms:** show current-room highlighting and the row controls for viewing/centering,
   traveling, notes, and removing a room. Demonstrate touch-and-hold/right-click on a Known
   Rooms row to add a note; do not teach this gesture on the map canvas.
7. **Notes:** keep the Notes banner visible in every dummy state, including zero notes and a
   collapsed section. Demonstrate room-grouped notes, room-scoped view via note icons, adding,
   editing, and deleting notes. Explain that the optional visible **Add note** button is enabled
   in general Settings; disabling that button never hides Notes or removes hold/right-click and
   slash-command note entry.
8. **Return to story:** use the right-edge map tab/back affordance and preserve the dummy play
   state for the remainder of training.

### Chapter 4: Finish

1. Give a concise recap of input, actionables/radials, voice, edge room banners, full map,
   inventory, Known Rooms, and notes. Link to Help/User Guide rather than repeating every
   advanced command.
2. The primary final action is **Choose a module**. It commits the versioned completion key,
   clears any temporary progress, and uses `location.replace()` to open the live `index.html`
   module library. Confirm through an integration test that the real `ModuleLibrary` then loads.
3. Skip uses the same cleanup and destination. Back never leaks into a story. Replay initiated
   from a live game warns that finishing returns to module selection, preventing accidental
   surprise or game-state confusion.

### Additional user-friendly details

- Use one spotlight and one task per step. Never cover the highlighted control with the popup.
- Make tiny controls demonstrably tappable with at least 44-by-44 CSS-pixel tutorial targets,
  even when the real visual glyph is smaller.
- Pair icons with plain-language names in tutorial copy; do not rely on color alone.
- Include light/dark themes, portrait/landscape, narrow phone, tablet, and desktop examples.
- Keep dummy controls functional enough to teach cause and effect: filtering changes cards,
  starring reorders, radial use changes rank/fill, map pan/zoom moves the dummy map, and notes
  can be added/edited/deleted in memory.
- Do not require successful gestures to continue; every step has Next so motor, browser, or
  assistive-technology differences cannot trap the user.
- Advanced save/restore, transcripts, display controls, and slash commands belong in a final
  **More in Help** summary rather than lengthening the required first-run path.

### Implementation sequence and file ledger

1. **Canonicalize:** assign the next available decision number if D113 has been consumed by
   intervening work, then add the accepted lifecycle, isolation boundaries, screen flow, and
   validation gates to `PRODUCTION_PLAN.md` and `ARCHITECTURE_UML.md`. The feature name matters
   more than retaining the provisional D113 number.
2. **Build the isolated route:** add `tutorial.html`, `js/Tutorial.js`, and
   `css/Tutorial.css`; add only original training copy/assets. Keep the dependency allowlist
   explicit and mechanically testable.
3. **Wire first-run routing:** hook the tutorial-completion check into `js/MainMenu.js`'s own
   `MainMenu.Init()` (index.html's `$(document).ready` entry point, `js/MainMenu.js:236`),
   checked before the module library renders, and route unseen users into training there.
   **Do not** wire this into `img/ParchLockSplash.js`'s shared completion callback:
   `ParchLockSplash.js` is a per-session, per-page gate (sessionStorage + a `window.name`
   marker) that runs independently on BOTH `index.html` and `play.html` -- it has no concept
   of "first install" and does not navigate anywhere on its own. Routing through it would also
   fire on play.html, which would risk hijacking a legitimate direct-to-play launch (an Android
   cold-start resume, or the D119 no-story recovery screen's "Continue" button) into training
   instead of the player's actual game. Preserve the rule that the splash appears first and
   exactly once per launch session -- unchanged, just not the mechanism the tutorial hooks into.
4. **Replace live overlay ownership:** retire the old `MobileTutorial` observer/DOM overlay in
   `js/MobileLayout.js` and its CSS. Do not leave two onboarding systems able to open. Preserve
   unrelated back-button, keyboard-inset, and map-tab behavior. Replace every exclusion gate
   that names the old implementation directly: `DirectionalRadial.CanOpen()` and
   `CharKeys.autoPadBlocked()` must consume one stable tutorial-active contract owned by the
   new tutorial lifecycle, so neither exit-direction mode nor merged arrows mode can overlap
   training.
5. **Wire settings:** update `js/WorkspaceUI.js` from **Replay mobile tutorial** to platform-
   neutral replay/reset controls. Entering replay records a safe return policy; finishing still
   goes to the operator-required live module selection screen.
6. **Cache/package:** add the new runtime files to service-worker/runtime allowlists and Android
   distribution mirrors. Keep planning documents, screenshots, harnesses, and development
   artifacts excluded from the public runtime package under the existing release policy.
7. **Document:** update `USER_GUIDE.md`, in-app Help, accessibility/control descriptions,
   release notes, credits/legal references only where onboarding changes their behavior.
8. **Test in layers:** run isolated unit/storage/dependency tests first, responsive browser
   interaction and visual tests second, then the existing splash/mobile/map/radial/read-aloud
   regressions. Build distribution and APK only after source tests pass.

Expected existing-file touch surface: `img/ParchLockSplash.js`, `index.html`,
`js/MainMenu.js`, `js/MobileLayout.js`, `js/WorkspaceUI.js`, `js/DirectionalRadial.js`,
`js/CharKeys.js`, `css/ParchLock.css` (old overlay removal only), service-worker/cache manifests,
build allowlists, `USER_GUIDE.md`, Help/release documentation, and the canonical
plan/architecture files. Expected new source files are the three isolated tutorial-route files
plus focused harnesses. `js/DirectionalRadial.js` and `js/CharKeys.js` may change only to consume
the shared tutorial-active exclusion contract; their gameplay behavior must remain unchanged.
`js/ReadAloud.js`, `js/Input.js`, `js/Map.js`, interpreters, module files, game saves, and native
speech code should require no behavioral changes; needing such a change is a design-review stop
condition.

### Stop conditions

- Any story/interpreter starts before the tutorial ends.
- Read Aloud, microphone permission, speech recognition, or native TTS activates in training.
- Dummy actions mutate live modules, favorites, Done status, saves, maps, notes, preferences,
  command evidence, radial usage, or recent-story state.
- Finishing or skipping launches/preselects a story instead of the live module library.
- Old and new tutorial systems can both appear, or the splash appears again after training.
- `DirectionalRadial.CanOpen()` or `CharKeys.autoPadBlocked()` still references
  `MobileTutorial` by name after cutover, or either directional mode can open during training.
- Training copy promises fixed verbs, guessed exits, unsupported engine features, or a note
  gesture on the map canvas.
- A popup obscures its target, a required step cannot be bypassed, or controls become unusable
  at the supported mobile/desktop viewport matrix.

### Validation gates

1. Static dependency test proves the tutorial route imports no interpreter, story, Read Aloud,
   speech-recognition, live map, input, module-library, or native speech code.
2. Storage spies prove every dummy interaction leaves real module, favorite, done, save, map,
   note, voice, and radial-usage keys untouched; only tutorial version/progress may change.
3. First-install tests prove Splash -> Tutorial -> live Module Selection exactly once on mobile
   and desktop. Done and Skip both land at the live library without launching a module; replay
   also returns there.
4. Accessibility tests cover semantic headings, focus trapping/restoration, screen-reader names,
   keyboard-only completion, Escape/Android Back policy, reduced motion, and contrast.
5. Visual/browser tests cover 320x640, common phone portrait/landscape, tablet, and desktop; no
   popup or label overlaps its target, edge room banners, command controls, or map sections.
6. Interaction tests cover search/favorite/done, actionable quick/hold behavior, radial ranking,
   direction-handle hold/settings behavior, merged native arrows-mode explanation, both
   simulated mic modes, edge-room travel explanation, map controls, Items, Known Rooms, Notes,
   and return navigation.
7. Replace the D103 assumptions in `harness/d96-menu-handle-map-tab.js` (it directly asserts the
   retired `#pl-mobile-tutorial`/`.pl-mobile-tutorial__*` DOM and the `PL_MobileTutorialSeen`
   key). Separately, and just as required: `PL_MobileTutorialSeen` is also seeded purely as a
   "keep the tutorial closed" suppression key, unrelated to what they actually test, by at least
   `harness/d105-input-contract.js`, `harness/d105-review-fixes.js`, `harness/d95-mic-hold.js`,
   `harness/mobilelayout-backbutton.js`, `harness/_dirpad_live_probe.js`, and
   `tools/ui-regression.js` (grep the harness directory for the literal key at implementation
   time, as this list may grow). Reseed every one of them with the new versioned completion key,
   or the new tutorial will look like "first run" to each and can pop up mid-test, breaking
   suites that have nothing to do with onboarding. Retain regression gates for D110 radial
   accounting, D111 arrow-pad eligibility, final D112 map behavior, Read Aloud, keyboard focus,
   splash order, distribution allowlists, service worker caching, and Android.
8. Update Help, User Guide, Options text, release notes, `PRODUCTION_PLAN.md`, and
   `ARCHITECTURE_UML.md` only when implementation begins and after D112's final UI contract is
   merged. Rebuild distribution and APK only after all D113 gates pass.

## Active Plan: D99 ParchLock Release Program

State: READY_FOR_ADVERSARIAL_REVIEW.

Canonical scope is `PRODUCTION_PLAN.md` sections 12-13 and
`ARCHITECTURE_UML.md` sections 34-35. D97 is the operator's manual story-removal
policy. D98 is the implemented Module Manager. Product-wide rename and local validation
are complete; Grok performs the operator-requested final audit and resolves verified issues.

Execution order:

1. Reconcile claims and workflow ownership. COMPLETE.
2. Freeze canonical ProductInfo and final `ParchLock`/`PL` names. COMPLETE.
3. Implement and verify the D98 Module Manager/local-only import using final names. COMPLETE.
4. Convert remaining product-owned Parchmap/PM_/pm- names in atomic mechanical sets. COMPLETE.
5. Rewrite public and in-app documentation, credits, privacy and legal material. COMPLETE.
6. Replace distribution deny-lists with explicit runtime/source allow-lists. COMPLETE.
7. Produce clean Android release flow and bundled source archive. COMPLETE; external key required.
8. Run decoded-artifact, desktop/mobile and focused regression gates. LOCAL PASS; Grok final audit active.

Do not rename upstream Parchment/GlkOte contract tokens. Do not add migration shims.
Do not automate story-rights or release-story checking; D97 leaves that with the
operator. Historical plans below remain evidence, not the active assignment.

## Historical Plan: D88 Semantic Actions

State: READY_FOR_IMPLEMENTATION. This planning pass used two isolated proposals plus an
isolated adversarial challenge. No product implementation was performed.

1. Repair the two known stale command fixtures and freeze exact legacy output.
2. Add `js/SemanticActions.js` in shadow mode with stable intents, role-aware templates,
   deterministic provider precedence, and byte-equivalent legacy DTOs.
3. Add unique-object, longest-span multiword recognition; ambiguous/partial commands
   produce no evidence.
4. Add passive command-form analysis on `TurnRecorder`; structural witnesses can prove
   semantics, while transcript behavior alone remains provisional.
5. Persist to a checksum/locale/adapter-keyed sidecar without rewriting AttrCalibrator
   v2; import D85 substitute data only as provisional legacy evidence.
6. Cut left-click, desktop/inventory/touch radials, input radial, autocomplete, usage,
   and navigation to one descriptor list behind a rollback flag.
7. Freeze code, then run the held-out title-blind serial/checksum challenge and existing
   D31/D34/D73/D85/D86/D87 matrices before default-on.
8. Remove legacy first-token paths only after a release soak.

Stop conditions: any wrong automatic submission; unresolved INSPECT triggering another
intent; command surfaces disagreeing; ambiguous targets learning; active probing;
cross-build persistence; or a provider branching on story identity.

## Active Operator Override: September 16

The earlier Wumpus-only task below is historical. Current work is full audit
remediation, authorized by the operator, including plan/architecture updates.
Codex owns the claimed repair paths after authorized stale-claim clearance.
All five active steps are implemented and verified; the task is READY_FOR_REVIEW.

1. Repair identity/calibration and command lifecycle defects; preserve D80.
2. Verify Bronze, Zork, Anchorhead, and Wumpus against real gameplay.
3. Complete persistence/PHP hardening and adversarial tests.
4. Reconcile older harness assumptions without weakening correctness assertions.
5. Publish actual post-change evidence and remaining gaps; operator accepts completion.

## Task
Fix `js/WorldModel.js` `refineRoomDisplayName` (~line 135-146) so an already-visited room's map
label shows the game's real descriptive title instead of a generic "Room #N" identifier, for
wump2ka.z5.js, without regressing Anchorhead/Zork1's already-correct behavior.

## Goal
`.GridWindow.reverse` status text is one line with 3+-space-gap-separated COLUMNS (not multiple
newline-separated lines — confirmed via live Playwright capture, see PRODUCTION_PLAN.md D80).
Split the whole text into columns, discard columns matching a generic room-id pattern
(`/^(room\s*#?\s*\d+|#\d+)$/i`) or a standard IF status-bar metadata pattern
(`/^(score|health|turns?|moves?)\s*:/i`), take the first surviving column as the banner.
Single-column/two-column games (Anchorhead: title + day-counter; Zork1: title + score/turns)
must resolve exactly as they do today.

## Constraints
- Keep changes minimal unless otherwise stated.
- **Only claude edits `PRODUCTION_PLAN.md` and `ARCHITECTURE_UML.md`.** Other seats report
  evidence back to claude; do not write decision-log/diagram entries yourselves.
- Never declare a fix done or gates met without live evidence captured against the REAL game
  (Playwright/RAM), not synthetic/invented fixtures that merely match your own hypothesis.
- No per-title special-casing — the fix must derive from real, observed, structural evidence
  that generalizes to any game with the same status-bar shape.
- Do not touch `games/`.
- Do not reopen D79 (`findLocationGlobal` scoring, already shipped/verified) unless a genuinely
  new live failure appears — report that as a new finding rather than reverting it.

## Affected files
- `js/WorldModel.js` (claimed by codex)
- `harness/d46-room-identity.js` (fixture must use the real captured string, not an invented one)

## Risks
- A prior attempt (documented as D80, since found to be wrong) modeled this as multi-LINE
  (`.split(/\r?\n/)`) instead of multi-COLUMN-within-one-line, so it silently discarded the
  descriptive text before ever reaching the filter step. Verify against the real string below,
  not assumptions about line breaks.

## Step-by-step plan
1. Use the real captured `.GridWindow.reverse` text (ground truth, live Playwright capture,
   not invented):
   - wump2ka: `" Room #19                                                                                                                        Score: 2       A vast, creased, watery room                                                                                                   Health: 73%    "`
   - anchor: `" Outside the Real Estate Office                                                                                     day one                    "`
   - zork1: `" Clearing                                                                                                                   Score: 0  Turns: 5 "`
2. Implement the column-filter rule described in Goal above.
3. Re-verify Anchorhead/Zork1 are unchanged and wump2ka now resolves to its descriptive text.
4. Confirm the corrected label persists across revisits (D62's freeze-on-first-real-id in
   `MapTopology.ensureRoom` should just work once the correct value is what gets frozen).
5. Update/replace the harness fixture in `harness/d46-room-identity.js` with the real strings
   above, not synthetic ones.
6. Run the full regression suite (see PRODUCTION_PLAN.md's standard list).
7. Report to claude with concrete evidence; claude writes the PRODUCTION_PLAN.md/ARCHITECTURE_UML.md
   decision-log entry (correcting the current inaccurate D80 text).

## Validation
- `node harness/d46-room-identity.js` passes against the REAL captured strings.
- Live Playwright screenshot/transcript: wump2ka's current-room map box reads descriptive text
  after a real visit; Anchorhead/Zork1 map boxes unchanged.
- Full regression suite green (harness/*.js + tools/*-regression.js).

# Character tracker at the top of the equipment sheet (D149)

Operator request: a character tracker at the top of the inventory page that populates **only** the
features the loaded module actually tracks. Start with **score** and **deaths**. Score gets a small
graphical display and a short rising "ta-da" sound when it goes up; deaths get their own sound. Then
research what other stats modules track (health, stamina, hunger and the like), show each only when
relevant, and adjust the display dynamically. Also: note modules with custom status windows, which may
need adapting, suppressing, or relocating into this tracker. Any involuntary in-game ending counts as a
death in any module.

Everything in the Research section was **measured live**, not assumed. Each claim names its module.

---

## Research

### The app already reads this data and throws it away

`WorldModel.refineRoomDisplayName` ([js/WorldModel.js:160](js/WorldModel.js#L160)) reads
`.GridWindow.reverse`, splits it into 3+-space-separated columns, and **discards** any column matching
`/^(Score|Health|Moves?|Turns?)\s*:/i` in order to find the room title. D80 established that shape from
a live capture. The stats wanted here are parsed and dropped one line before they could be used. Nothing
else in the codebase reads score, turns or health, and there is no death handling of any kind (grep for
`deadflag`, `you have died`, `***`: no hits).

### Tier 1 - spec-guaranteed, v3 only

The v3 status line is drawn by the interpreter, so its inputs are fixed by the standard.

- **Flags1 (header byte `0x01`) bit 1** - `0` = score/turns, `1` = hours:mins. A zero-cost answer to "is
  score even a thing here". Measured: Zork 1 `0x60`, Planetfall `0x60` -> score/turns; **Deadline `0x62`
  -> hours:mins**, correct, it is a timed mystery with no score.
- **Globals**: index 0 = location object, 1 = score-or-hours, 2 = turns-or-minutes. Confirmed exactly on
  Deadline, whose clock is visible: status `8:04` with `G1=8, G2=4`; `8:07` with `G2=7`; `8:10` with
  `G2=10`. Zork 1 reads `G1=0`, its true starting score.

### Tier 2 - library convention, to be verified and never assumed

Inform 6 v5/v8 often uses the same two slots:

- Advent: `G1=36` = score, `G2` = 1,2,3,4 = moves - matches its status `Score: 36  Moves: 2` exactly.
- Balances: `G1=0` = score, `G2` = 2,3,4,5 = moves - matches `Score: 0  Moves: 3`.

Two measured counterexamples prove a bare assumption would ship wrong numbers:

- **Anchorhead**: `G1=1`, `G2=105` and constant. Its real turn counter is at `G4`/`G10`. It is scoreless
  and shows `day one` instead.
- **Planetfall**: `G2` = 4580 -> 4620 -> 4660, climbing 40 per turn. Its own SCORE reply explains it:
  *"Current Galactic Standard Time ... is 4477."* `G2` is a clock, not a turn count.

So a global slot is a **candidate to be verified against an independent observation**, never a source to
be trusted on sight - the D73 AttrCalibrator / D134 ExitCalibrator pattern, already proven twice here.

### Tier 3 - the game's own status window (v4+ draws it itself)

One row, 3+-space-separated columns. Measured, verbatim:

| Module | Status window | Readable stats |
|---|---|---|
| pentari | `Your Quarters   Score: 0   Moves: 3` | Score, Moves |
| Seastalker | `lab center   Score: 0   Turns: 0` | Score, Turns |
| CtDoom | `Control room   Score: 0   Moves: 3` | Score, Moves |
| wump2ka | `Room #2   Score: 1   A large, textured cavern   Health: 81%` | Score, **Health %** |
| TreasuresofaSlaversKingdom | `OPEN PLAIN   HIT POINTS: 15/15   Paths: N S E W   QUEST RATE: 0/500` | **HIT POINTS n/m**, **QUEST RATE n/m** |
| Sherlock | `Saturday 5:11:00 a.m.` | clock only |
| curses | `Attic (in Meldrew Hall)   4   June 3rd, 1993` | bare turn count, in-game date |
| Anchorhead | `Outside the Real Estate Office   day one` | day/chapter, no score |
| LDoDoom | `Control room` | none |
| Zork 1 / Planetfall / Enchanter / Deadline (v3) | room name **only** | none - see D137 |

Three value shapes are needed, not one: plain `N`, percent `N%`, fraction `N/M`. The fraction form was
missed by a first-pass regex and only surfaced because TreasuresofaSlaversKingdom was probed.

**The v3 gap.** Every v3 game renders the room name alone with no score column - the open D137
status-line collision. So v3 cannot use text at all and must go through Tier 1 globals. The two tiers are
complementary, not redundant; both are required.

### Tier 4 - meta-command replies: richest source, and the only one giving a maximum and a rank

Measured verbatim. There is no single phrasing, only families.

ZIL:
- Zork 1: `Your score is 0 (total of 350 points), in 1 move. This gives you the rank of Beginner.`
- Enchanter: `Your score is 0 of a possible 400, in 1 move. This puts you in the class of Charlatan.`
- Planetfall: `Your score would be 0 (out of 80 points). It is Day 1 of your adventure. Current Galactic Standard Time ... is 4477. This score gives you the rank of Beginner.`

Inform:
- Advent: `You have so far scored 36 out of a possible 350, in 1 turn, earning you the rank of Adventurer.`
- Anchorhead: `You have so far scored 0 out of a possible 100 points; you are at the threshold of a foreboding mystery.` (no turn count)
- wump2ka: `You have so far scored 1 point in 3 turns.` (no maximum)
- pentari: `You have so far scored 0 out of a possible 70, in 3 turns.` (no rank)
- Sherlock: `[You have 0 out of 100 points, which earns you a ranking of Chief Superintendent of Scotland Yard.]`
- curses: `This is the afternoon of June 3rd, 1993, and you are in Meldrew Hall. You have so far scored 0 out of a possible 550, in 4 turns, giving you the rank of hapless Tourist.`
- **LDoDoom: `There is no scoring in this game.`** - an explicit, deterministic "score is irrelevant
  here" signal, exactly what "only populate what the module actually tracks" needs.

`DIAGNOSE` (ZIL only; Inform replies `That's not a verb I recognise`) is the health/hunger source:
- Zork 1: `You are in perfect health. You can be killed by a serious wound.`
- Enchanter: `You are wide awake. You are well hydrated and well fed.` -> sleep, **thirst**, **hunger**
- Planetfall: `You are in perfect health. You feel well-rested. You seem to be well-fed.` -> health, rest, hunger

These are **qualitative, not numeric**, deliberately so - Infocom wrote prose, not gauges. They map to an
ordered scale, not a percentage, and are treated that way rather than inventing numbers.

`FULL`/`FULLSCORE` exists in Inform but in Advent and Anchorhead merely echoes SCORE.

### Deaths

No module exposes a death counter, so ParchLock must count them itself.

Confirmed live in Zork 1 (walked into the dark cellar until a grue ate me):

```
Oh, no! A lurking grue slithered into the room and devoured you!
 **** You have died ****
Now, let's take a look here... Well, you probably deserve another chance.
```

Two things fall out of that capture:

1. The banner is `**** You have died ****` - ZIL uses four asterisks, Inform three. A detector must
   accept `\*{3,}`.
2. **Score went 35 -> 25.** Death costs points, so a score *decrease* is a normal event and must never
   fire the score-up sound. Rank regressed too, Amateur Adventurer -> Beginner.

Any involuntary ending counts, in any module. That is better served by classifying the banner than by
matching one sentence, because the convention is that **all** endings print `*** ... ***`:

- `won`, `win`, `victorio`, `triumph` -> a win, not a death
- `quit`, `session`, `have left` -> voluntary, ignore
- anything else (`died`, `been killed`, `are dead`, `eaten`, `lost`, or a game's own wording) ->
  **involuntary ending, count it**

Defaulting to death is what makes this work on modules nobody has probed.

### Modules with custom status windows

All still use the ordinary Glk grid window (`.GridWindow`); what differs is that the *game* authored the
contents instead of the interpreter. So none of them needs a new window type - they are already readable.
Catalogued:

- **TreasuresofaSlaversKingdom** - richest: `HIT POINTS: 15/15`, a `Paths:` exit list, `QUEST RATE: 0/500`.
- **wump2ka** - two real stat columns, `Score` and `Health: 81%`, plus a room-description column.
- **Sherlock** - a clock, `Saturday 5:11:00 a.m.`, nothing else.
- **curses** - a bare turn number and an in-game date, neither labelled.
- **Anchorhead** - `day one`, a chapter marker rather than a statistic.

---

## Design

### Principles

1. **Never display a number that has not been verified.** A stat appears only after confirmation from
   independent evidence, in the AttrCalibrator/ExitCalibrator mould. Until then there is no row - D24's
   honest absence, applied to the HUD.
2. **Absence is a first-class answer.** `There is no scoring in this game.`, Flags1 bit 1 set, and "no
   score column ever appeared" all *suppress* the score row permanently for that module rather than
   leaving it blank or at zero.
3. **Read-only**, with one explicit opt-in exception below.
4. **Per-module memory** under `gameIdentityKey`, so a second session opens already calibrated, like
   `PM_ExitCalib_*`.

### New file `js/StatTracker.js`

**Model.** A stat is `{key, label, value, max, unit, kind, source, confidence, lastChange}` with `unit`
one of `plain | percent | fraction | clock | ordinal`, and `kind` distinguishing `score`, `counter`,
`gauge`, `clock`, `flag`.

**Discovery**, cheapest and most certain first:

1. **Header.** v3 + Flags1 bit 1 -> register a `clock`, and mark score permanently unavailable.
2. **Status text.** Each turn, take the columns `refineRoomDisplayName` already computes - a small
   refactor so both callers share one parse instead of duplicating it - and match each against
   `^([A-Za-z][A-Za-z .'-]{1,18})\s*[:=]\s*(-?\d+)\s*(?:/\s*(\d+)|(%))?$`. A label must appear with a
   numeric value on **two separate turns** before becoming a stat, so a one-off line of prose containing a
   colon can never become a permanent gauge.
3. **Globals, verified against the text.** For every global index 0..63, record whether it equals the
   observed value of a named stat on every sample. After two samples where the stat's value **changed**,
   any index that tracked it throughout is promoted to that stat's headless source. The change requirement
   is the part that matters: a game at score 0 on turn 1 has dozens of zero globals, and only a real change
   disambiguates them. Contradiction demotes it and falls back to text. This rescues Anchorhead and
   Planetfall automatically, without naming either.
4. **v3 seeding.** Seed globals 1 and 2 as *candidates* for score/turns (or hours/minutes when Flags1 bit
   1 is set) and require the same confirmation. Since v3 shows no text to verify against, confirmation
   comes from monotonic behaviour: a turn counter rises by a small amount every turn and never falls; a
   score changes rarely and can move both ways.
5. **One opt-in SCORE probe.** SCORE is the only way to learn the **maximum** and the **rank**, both
   wanted for the graphical display. It costs a turn in most games, so it is opt-in: an "Identify stats"
   button in the tracker, plus optionally one automatic probe on a module's first turn behind a preference
   defaulting to off. The reply is parsed by an ordered list of the families above, plus the explicit
   no-scoring sentence. Never repeated automatically.
6. **DIAGNOSE, same treatment.** Also opt-in, also one turn, ZIL-only, yielding an ordered qualitative
   scale rather than a number: health `perfect -> bruised -> serious wound -> dead`, hunger `well fed ->
   hungry -> starving`, rest `wide awake -> tired -> exhausted`, thirst `well hydrated -> thirsty`. Shown
   as a labelled band, never as a fake percentage.

**Deaths.** Watch the buffer for `\*{3,}[^*]{1,80}\*{3,}`, classify per the rules above, and on an
involuntary ending increment a counter persisted per module. Guard against double-counting the same banner
(the same text can be re-rendered on scroll) by remembering its text and turn number. The death row appears
only after a death, since a fresh module honestly has nothing to show.

### Sound - must be built from nothing

There is no audio anywhere in this app: no `AudioContext`, no `new Audio(`, no `<audio>`, no sound
preference. `js/ReadAloud.js` uses `speechSynthesis`, a different API entirely.

**Synthesise both cues with WebAudio oscillators**, no binary assets.

- Score up - a short rising major third, ~660 Hz -> 880 Hz, ~180 ms, triangle wave, quick decay. That is
  the "ta-da" shape requested.
- Death - a slow descending minor interval, ~220 Hz -> 110 Hz, ~500 ms, sine.

Why not files: the repo has no bundler, `make-dist.bat` carries explicit per-file allow-lists (a D120
lesson - `tutorial.html` was silently omitted and would have shipped broken), and `service-worker.js`
precaches by name, so every asset is three separate registrations that can each be forgotten. An
oscillator is a dozen lines in a file already being added. It also sidesteps autoplay policy, since the
context is created lazily inside a real user gesture and resumed on first tap.

Requirements: one `AudioContext`, created lazily and reused; a `Global.Prefs` entry `StatSounds`
defaulting on for score and death; never fire on the initial calibration read, only on a genuine
transition; never fire on a score *decrease*; skip if the tab is hidden.

### Placement and display

A new `<div id="pl-stats">` in [play.html](play.html) between the equipment `<h1>`
([play.html:298](play.html#L298)) and `#equipment-controls` ([play.html:300](play.html#L300)), above the
sort/filter row and the item list, scrolling with the sheet. The search row is sticky; the tracker must
not also be sticky or a phone loses most of its list area.

- One compact chip per confirmed stat, wrapping onto as many rows as needed - the same dynamic-reflow
  requirement as the top band, so nothing is clipped the way `wedding R...` was.
- `score` gets the graphical treatment: a slim progress bar when a maximum is known (`0/350`), a plain
  number when it is not (wump2ka), the rank as a subtitle once SCORE has run, and a brief highlight/
  count-up on increase, paired with the sound.
- `gauge` stats (`Health: 81%`, `HIT POINTS: 15/15`) get a proportional bar. Qualitative DIAGNOSE stats
  get a discrete segmented band.
- `deaths` is a plain count with a small marker, appearing only after the first death.
- **Zero chips means the whole block is `display: none`** - a module that tracks nothing shows no empty
  furniture. That is the "only when relevant" requirement, enforced at the container level.

### Custom status windows

Recommendation, in order:

1. **Always mirror, never suppress by default.** Parse the grid columns into the tracker and leave the
   game's own window alone. It is the game's authored UI, it sometimes carries things the tracker does not
   model (TreasuresofaSlaversKingdom's `Paths:` list is really an exit list, which the map already homes
   better), and suppressing a window the player relies on is a regression.
2. **Offer suppression as a preference once mirroring is proven for that module.** A `HideStatusRow`
   preference that hides the native grid row only while every field it contains is confirmed present in the
   tracker. That condition matters - hiding the row before the mirror works would destroy information. It
   also reclaims the vertical space the top band currently reserves, a real win on a phone.
3. **Never rewrite the game's window in place.** The VM owns those cells and overwrites them; that is the
   documented cause of D137. Reading them is safe, writing them is not.

### Testing

- `harness/stat-tracker.js` - pure Node against synthetic samples: every SCORE phrasing family above
  parses to the right `{score, max, rank, turns}`; the no-scoring sentence suppresses the row; all three
  value shapes parse; two-sample confirmation is genuinely required; a contradiction demotes a global;
  every banner classification (died / killed / custom / won / quit) lands correctly; a score decrease
  produces no sound event; the same banner twice counts one death.
- `tools/stat-tracker-live.js` - Playwright, asserting per module against the values measured here:
  Deadline registers a clock and no score; Zork 1 registers score from a global with no status text;
  wump2ka registers Score and Health 81%; TreasuresofaSlaversKingdom registers HIT POINTS 15/15 and QUEST
  RATE 0/500; LDoDoom registers nothing and the block stays hidden; Anchorhead registers no score.
- Guard existing behaviour: `refineRoomDisplayName` must return the same room titles after the parse is
  refactored to be shared. `tools/layout-regression.js` and the equipment suites stay green with the new
  block present.

### Order of work

1. `StatTracker` skeleton, the shared column parse, and the pure harness. No UI.
2. Status-text discovery + global verification; live harness for Tier 2/3.
3. The `#pl-stats` block, chips, score bar, dynamic reflow, CSS.
4. WebAudio cues + preference.
5. Death detection and counter.
6. Opt-in SCORE and DIAGNOSE probes, max/rank/qualitative display.
7. Status-row suppression preference.
8. Record D149 in `PRODUCTION_PLAN.md` / `ARCHITECTURE_UML.md`, bump `CACHE_VERSION`, and add the new
   files to `service-worker.js`'s precache list and `make-dist.bat`'s allow-lists - the D120 trap.

### Honest limits of this research

- 235 non-Glulx modules are present; 18 were probed. The discovery mechanism is deliberately generic so an
  unprobed module works, but the *catalogue* above is a sample, not a census.
- v3 score relies on the global convention, verified on Zork 1 and Deadline. A v3 game that breaks it fails
  the monotonic confirmation and shows nothing rather than a wrong number - acceptable, but it does mean
  some v3 modules will legitimately display no score.
- `HIT POINTS: 15/15` was read at full health. Whether that game's maximum ever moves is unverified, so the
  denominator must be re-read every turn rather than latched.
- Sherlock's and curses' unlabelled date/turn columns are recognised as text but not yet modelled.
