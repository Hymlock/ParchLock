
# D201 cross-system audit follow-up (2026-09-29, grok)

Audited D201 as system-wide (not LLR-only). Confirmed identity/status/inventory
paths, then enabled missing map/exit decoding rather than stripping features:
admitted-name recovery in `MapTopology.link`, containment-proven blank label
preservation in `WorldModel`, blank location-shaped `isPlausibleExitTarget`,
native LVL/STR StatTracker synonyms. Harness now covers travel/pathable edges
(58/58). Working tree uncommitted. See docs/ai-status.md and PRODUCTION_PLAN D201.

# AI Handoff

## D109 pronunciation handoff
ReadAloud applies the bounded English anchor stem hint in its common preparation stage.
Regression fixtures cover Anchorhead, anchor, anchored, anchovy, idempotence, and native/
Web payload parity. SW shell v24 requires a rebuilt package.

## D108 narrator handoff
Codex implemented the complete-output and pronunciation repair in js/ReadAloud.js, with
regression coverage in harness/d100-live-turns.js. The design uses a WeakMap consumed-
length cursor for GlkOte append growth and one deterministic, engine-neutral cleanup
pass. No parser/action mapping behavior changed.

## Active Handoff: D100-D104 closed (claude, 2026-09-21)

All outstanding seat work was taken over by claude on operator instruction after grok and codex ran out of credits. Nothing is mid-edit. Reinstall `C:UsershymloDownloadsParchLock-distParchLock-dev.apk` and confirm on the phone: Anchorhead intro is spoken, a move speaks only the new room text, the Skip-repeats option works, the first-use tutorial appears once and Options can replay it. If a device defect appears, reproduce with `harness/d100-live-turns.js` (stubbed native TTS) before changing `js/ReadAloud.js`; never use mutation-record text as speech source (underline pass rewrites old text).

## Active Handoff: D103 mobile gesture tutorial

D103 adds a two-step first-install mobile tutorial in `js/MobileLayout.js`, a replay/reset control
in `js/WorkspaceUI.js`, responsive/accessibility styling, and aligned public/in-app documentation.
It waits for a real line prompt, never repeats per story, does not consume first run on desktop, and
does not alter Actionable/Input gesture code. Expanded D96 currently passes 98/98; broader regression,
service-worker cache bump, dist/APK rebuild and independent review remain before closeout.

## Historical Handoff: D102 mobile menu and D100 integration

D102 removes the bottom mobile Menu handle and zeroes its reserved strip without changing
any input-radial or long-hold path. Mobile Tools now includes Open map, Modules, and Exit
game in its existing scrollable list; desktop Menu and Tools remain unchanged. D96 passes
82/82 across five phone viewports plus desktop. Grok owns the service-worker cache bump
and D100 ReadAloud lane before the next combined package build.

## Historical Handoff: D101 UI repair and D100 integration

Codex implemented the operator's two UI corrections without overlapping Grok's active
read-aloud work. The game and Tools radials no longer render duplicate Tools controls.
Display **Text size** now scales normal reflowable story prose on mobile through
`--pl-reading-scale`, relative to the 20px default, while D94's measured grid/pre/heading
cell remains unchanged. Desktop retains direct prose scaling and a fixed 14px grid.

Validation: `harness/d94-cell-and-boot.js` 54/54 and
`harness/d96-menu-handle-map-tab.js` 112/112, including five phone viewports and desktop.
Do not revive the rejected broad `!important` font override. The next package build must
occur only after Grok's D100 read-aloud work settles, then include both source changes.

## Historical Handoff: D99/D98

Implementation and local validation are complete. Per the operator's latest direction,
Grok owns a full adversarial implementation audit and may resolve verified issues to the
best of its ability. Claude finalized `PRODUCTION_PLAN.md` sections 12-13 and
`ARCHITECTURE_UML.md` sections 34-35, released its claims, and is unavailable.

Audit the final runtime/source/APK exact sets, ParchLock/PL reference closure, D98 local
loading, desktop/mobile startup and Z-machine command/mapping behavior. Preserve D97's
manual release-story policy and all D99 packaging, documentation, legal, source and
Android gates. Known external/operator gates are signing, story removal, art/name/legal
review and real-device checks. Known residual: Wumpus and one zblorb holistic-scope case.

## Historical Handoff: D88 Semantic Action Planning

Documentation is complete and READY_FOR_IMPLEMENTATION. Two isolated architecture
proposals independently selected an additive stable-intent/dialect resolver. A third,
isolated adversarial review found that transcript equality/diversity is not semantic
proof, multiword commands are currently split incorrectly, disabled INSPECT can fall
through to a destructive primary action, ambiguity can poison learning, and the current
mobile test does not exercise real touch.

Implementation must follow the staged plan in PRODUCTION_PLAN.md and the contracts in
ARCHITECTURE_UML.md section 28. Begin with fixture baseline/parity, then shadow mode.
Do not change or delete `PM_AttrCalib_*` v2. Do not actively probe games. Do not allow a
missing INSPECT realization to select another action.

Expected first write set: new `js/SemanticActions.js`, `play.html`, `js/ActionSynth.js`,
and focused semantic/parity harnesses. Later stages may touch `AttrCalibrator.js`,
`Actionable.js`, `Qol.js`, `Autocomplete.js`, and navigation/real-touch tests only after
the shadow gates pass.

Validation starts by making `d31-known-topics.js` and
`command-consistency-regression.js` honest baselines, then runs all existing focused
command/calibration suites. Final acceptance is the held-out title-blind build challenge,
including multiword/localized grammar, randomized output, ambiguity, side effects,
delayed output, real touch, restore/undo/restart, and checksum isolation.

## September 16 Active Work

Harness restarted; all remediation claims belong to codex. Operator explicitly
authorized clearing the four stale claims. Helper agents reached their usage limit
after partial edits; parent is checking and integrating those changes locally.

Added tools/audit-live-mapping.js for actual Bronze identity and cross-game checks.
Focused post-change suites: entrypoint 8/8, recorder 14/14, verb success 7/7,
verb behavior 6/6, room identity 13/13, location calibration 15/15, attribute
calibration 13/13, verb disablement 21/21, destination dedup 3/3, lookahead
88/88, structural cutover 134/134, and nested inventory 60/60.
Persistence fault injection, PHP runtime checks, navigation interruption, mobile,
and randomized Wumpus verification now pass. State is READY_FOR_REVIEW. Only the
operator may record overall completion.

## September 22 D110 Handoff

Codex implemented the operator-approved adaptive radial contract in `js/Actionable.js`
and `js/Qol.js`. Ranking is `UsageCount desc`, `Prior desc`, `original index asc` for
all adaptive contexts. Accepted submissions and non-submitting pill interactions use
separate counters to prevent double counting. The unique leader is determined globally
from uncapped counts before pagination; visible fill still caps at 36. Fixed Tools/game
lists, More, and center Tools are excluded. Plan, architecture, guide, release notes,
and cache v25 are updated. Validation: phase2 144/144; D96 browser 102/102. Claude should
audit the implementation against bus message 760 before operator acceptance.

Claude audit #762 independently passed the ordering, global leader, coverage, and test
contracts, then reproduced one exact-once defect. The operator authorized correction:
`radial:*` taps now pair only with the immediately next matching accepted completion,
whose overlap is deducted from effective usage. Nonmatching submissions clear the
pending link. Launcher counts remain independent. Regression and package rebuild are
required before final closure.

## September 22 D111 Handoff

Automatic arrow-pad eligibility is mobile-only and structural: one visible CharInput
inside a GridWindow, with all app overlays excluded. No ZVM arrow capability signal
exists. The state machine separates auto ownership from manual Tools use, bridges brief
Glk prompt replacement gaps, respects per-visit dismissal, and leaves the bottom strip
tappable for keyboard input. Anchorhead HELP passed six real arrows with frame sampling
and a real keyboard-Q exit. Complete D105/full packaging evidence is pending.

## Task
TBD

## Required changes
- TBD

## Files to edit
- TBD

## Acceptance criteria
- TBD

## Validation commands
```bash
# add project-specific commands here
```

## Notes
Keep changes minimal.
# D198 handoff (2026-09-29, codex)

D198 implementation is complete behind default-off owner valves. Grok accepted the staged
gates A-G (semantic #940, exits/lifecycle #942); Codex completed the final
identity/deduplication and package audit when the reviewer became unavailable. Canonical
plan/architecture and decision index are current. Focused and compatibility suites pass,
the clean distribution excludes internal plans/tests, and source/desktop/Android runtime
assets are byte-identical. Development APK:
`C:\Users\hymlo\Downloads\ParchLock-dist\ParchLock-dev.apk`, SHA-256
`0B01D64D6557DB23DC44CB6D34D19C327374F01678E039A0E9FE658EC0F84A0C`.

Current deterministic evidence: grammar is recovered for validated pre-V6 Infocom families; only
direct opcode-state TAKE(room) and DROP(inventory) may become D198 object forms. The grammar
decoder does not prove direction-property linkage, so the exit valve remains a dormant,
tested owner boundary and existing confirmed travel remains authoritative. Do not invent
linkage from compass vocabulary. These are present evidence limits, not permanent architecture
caps; stronger validated mappings and live structural witnesses extend the same owners.

# D201 implementation handoff (2026-09-29, codex)

D201 is fully researched, implemented and live-browser verified. A Little Like
Rogue exposes a generic early-Inform shape: the live player and room have blank object short
names, while the real player owns parser alias `yourself`, the declared animate bit and valid
containment. Before D201, the resolver selected generated class object
`K10_player_s_holdall`, then the room plausibility and display paths erased the real unnamed
room. D200 attribute decoding was healthy and was not the cause.

The implementation began with the tracked no-argument catalog/live audit specified in
PRODUCTION_PLAN D201, then extended the existing ZRamReader/ZRamProvider/WorldModel
translation boundary, not map or UI consumers: evidence-bearing player resolution, reuse of
`enclosingRoom`, containment-proven unnamed room IDs, one status-grid decoder for room labels
and `hudMetrics`, and unnamed carried-item payloads using parser-owned nouns. The post-state
probe proved an additional blocker: after a real axe became a child of the resolved player,
`walkVisibleDescendants` still returned empty because it treated every unnamed child as a
wrapper. Level and Strength now flow generically through StatTracker's existing two-sighting
confirmation and lifecycle rules. No title, serial, object, room or global-slot branch is
permitted. The implementation adds `ZRamReader.resolvePlayer`, containment provenance,
`StatusGridDecoder`, parser-labelled held inventory, exact-provenance map admission, and a
deterministic pre-loader ZVM constructor hook. `harness/d201-unnamed-identity.js` passes
53/53 over five alternating mobile/desktop randomized LLR starts and live RoTA, Bronze,
Accuse, Anchorhead and Wumpus controls. Canonical detail: PRODUCTION_PLAN D201 and
ARCHITECTURE_UML section 65.

## Edit Learned Words implementation candidate (2026-10-03, codex)
Operator authorized full implementation after #1049/#1051 design consensus. Real Tools editor, isolated overrides, recorder-owned manual revision confirmation, cosmetic owner labels, reversible Ignore/Undo, and an independent first-open tutorial are implemented. X is the single close control; Save/Done absent. Audit package: work/learned-words-implementation-audit.md. New contract suite 26 and browser suite 72 pass; existing equipment/statistics/learning/nesting/semantic/contract/menu regressions pass. Independent Grok implementation audit remains pending. No new APK or device validation. Preserve unrelated PRODUCTION_PLAN.md and diagnostics.

## Edit Learned Words audit round 2 (2026-10-03, codex)
Grok #1054 REVISE: provisional inspect replacement candidates were missing. Added read-only candidate rows and reversible promotion/use suppression, retaining original observations and persisting new observations while ignored. Dedicated contract checks now 30; live browser 72 and inspect regression 22 pass. Reaudit requested; no APK/device validation or overall completion.

## Edit Learned Words implementation consensus (2026-10-03, codex)
Grok #1056 ACCEPT WITH NOTES for runtime commit 9bfac37. Codex checked the cited gates and independently reran learned-words 30/30, learned-words-live 72/72 and inspect-disablement 22/22. Implementation audit consensus reached; no remaining revise findings. Mobile whole-dialog scrolling is an accepted layout note. Android/device validation and a new APK remain outstanding; overall goal completion belongs to the operator.

## Edit Learned Words packaged (2026-10-03, codex)
Packaging commit 9460c56: include LearnedWords.css in distribution allow-list; build 60, Android versionCode 33. build-android.bat dev succeeds. APK C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-dev.apk (84,130,469 bytes), SHA256 5BD9A26795586DD0C99F42AB1FEC4F099FFA67182D2B4510E580033889A6D371. v2 signature verifies; all 452 web assets match staging and 450 originals; key source archive parity verified. Rebuilt distribution phone-width editor/tutorial smoke and packaging contract 30 pass. No attached adb device, so device behavior remains untested. Runtime consensus Grok #1056/Codex #1057 stands; operator records overall completion.

## Current implementation candidate (2026-10-03)
Latest identical marks, fixed four-header accordion and independent spoken spotlight tutorial implemented. See work/learned-words-final-implementation-audit.md for evidence and baseline failures. Grok audit pending; no new APK/device claim.

## Ordered banners correction (2026-10-03)
Operator now requires cumulative header placement in unchanged order. Implemented prefix/center/suffix layout and distinct header chrome; 146 focused, 30 contract and 72 live checks pass. Previous Grok #1068 accepted fbd9d5d with notes; requested notes retransmission and correction audit. Existing APK excludes this correction.

## Mail audit outcome (2026-10-03)
Grok #1071 accepts556d269 with Android/APK validation notes. #1072 proposes additional display/membership/radial changes, explicitly review-only. Codex #1073 REVISE gives amendments and required validation; do not implement before authorization. See work/learned-words-proposition-adversarial-reply.md.
