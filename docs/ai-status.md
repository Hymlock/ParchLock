## D201 EXP current / next-level (2026-09-29, grok)

Live LLR RAM probe: no unique global held current EXP at 0 (156 zeros) and the
printed next-level figure 50 never appeared in globals. Text path confirmed:
SCORE "with N experience points. You need M points to progress to the next
level." Status UI now shows EXP as N / M when both are printed together;
bare "points to progress" still contributes nothing. StatusGridDecoder also
accepts EXP:n/m and n/m exp. SW parchlock-shell-v87.

## D201 Wumpus exits + printed EXP (2026-09-29, grok)

Compass discovery labeled only direction words, then directionDoorDirs returned
those profile keys instead of every door_dir slot. wump2ka's compass also holds
numbered exits on door_dir 91-95 (short names "first exit" through "fifth exit").
Dropping them emptied look-ahead, so "exit 1" stopped being detected and underlined.
The slot list is structural again. Labeled profile is words only; discovered keys
are a fallback when the uniform door_dir scan finds nothing. LLR still uses
shifted prop 26 (12-23 = n/s/e/w, not stock UP on 15). Anchorhead e/w/in and
Alley southeast unchanged.

EXP is not invented. StatusGridDecoder and StatTracker surface it only when the
story prints it: status "EXP: 20" / "20 exp", or LLR's score sentence
"with N experience points". The chip label is EXP, beside LVL/STR.
SW parchlock-shell-v86.

﻿## D201 false-exit fix: compass door_dir discovery (2026-09-29, grok)

Live LLR3 bug after D201 pathable blank rooms: look-ahead labeled prop 15 as
`up` (stock i6-lib PROFILE) while the build's compass stores `door_dir` on
prop 26 and maps 12/13/14/15 = n/s/e/w via unnamed direction objects' parser
words. Result: UP→Dank room on the radial/map while `up` is rejected; inflated
exit counts; prop 7→`level one` meta admitted as north.

Fix (system-wide, not LLR-titled): `ZRamReader.discoverCompassProfile` reads the
compass parent's children, discovers the door_dir common property structurally,
and labels slots from short names or parser vocabulary. `lookAheadExits` prefers
that map; `pushExit` gates on `isPlausibleExitTarget`; blank takeable/unlit/
childless meta targets are refused; claimed props are not re-emitted as exit-N.
SW `parchlock-shell-v85`. Live: LLR no false UP, west/east correct; Anchorhead
keeps e/w/in and asserts Alley as southeast from discovery; `d201-unnamed-identity`
58/58. XP: D201 does not invent experience — LLR prints LVL/STR only; both confirm
and update via StatusGridDecoder/StatTracker.
# AI Status

## D201 cross-system audit (2026-09-29, grok)
Full cross-system audit of D201 against PRODUCTION_PLAN Â§D201 / ARCHITECTURE Â§65.
D201 is treated as **system-wide capability** (identity, StatusGridDecoder, map
admission/evidence, inventory recovery, MapTopology); unnamed early-Inform (LLR3)
is the stress case, not a title adapter.

**Enablement fixes applied (not feature-stripping):**
1. `MapTopology.link`: when look-ahead has blank `targetRoomName` but `toId` is
   already admitted under a player-facing Name, recover that Name so pathable
   `Exits[]` form between visited rooms (same feature named compilers get from
   non-blank names). Unvisited blank ids stay ExitMeta hints.
2. `WorldModel.tick`: blank display after refine no longer wipes
   containment-proven `roomId`/exits/scope (D201 structural identity).
3. `ZRamReader.isPlausibleExitTarget`: blank location-shaped destinations pass
   (doors/animate/clothing/nested furniture still rejected) so ExitCalibrator
   can emit learned edges for unnamed rooms.
4. `StatTracker.CANON`: native `lvl`/`level` and `str`/`strength` synonyms
   (no invented XP; games that only print LVL/STR stay LVL/STR).
5. Prior MapTopology follow-up kept: `ensureRoom` reuses admitted `HasRealId`
   before `isPlausibleMapRoom`; `link` does not strip admitted dest names.
6. `harness/d201-unnamed-identity.js` extended: look-ahead/radial + travel +
   pathable departure edge (multi-boot retry for LLR randomization). **58/58**.

**Regression:** Anchorhead pathable se/w + travel west OK; Advent/LostPig named
smoke OK; catalog audit 271 Inform / 45 parser-self / Mask fail-closed;
`d46-room-identity` 27/27. No XP invented. Uncommitted working tree (user did
not ask to commit). APK refresh still the packaging gate.

## D201 map-topology follow-up (2026-09-29, grok audit)
D201 identity/status work recovered unnamed early-Inform player/room/metrics, but
MapTopology still dropped pathable edges for that family: `ensureRoom` re-applied
`isPlausibleMapRoom` (blank compiled short names fail) before reusing an already-
admitted real ObjectId, and `link()` nulled destination names the same way. Live
LLR3 symptom: ExitMeta/radial empty or rooms isolated after travel; Anchorhead
unaffected (named short names). Fix is system-wide for the unnamed early-Inform
family, not an LLR/Alley special case: reuse admitted ObjectIds in `ensureRoom`,
and keep player-facing `toName` in `link()` when the destination ObjectId is already
admitted. Live verify: LLR3 radial populated from look-ahead ExitMeta; south travel
writes `Exits.s`; Level/Strength confirm via StatusGridDecoder; Anchorhead still
connects. Uncommitted working tree (D201 never landed as a git commit after D200).

## D201 implemented (2026-09-29, codex)
D201 now recovers unnamed early-Inform player, enclosing-room and held-item identity from
compiler-owned structural evidence, with a shared status-grid presentation/metric decoder.
The live Chromium gate passes 58/58 across five alternating mobile/desktop LLR starts and
RoTA, Bronze, Accuse, Anchorhead and Wumpus controls. Catalog audit: 271 Inform modules,
45 parser-self resolutions, Mask equal-score ambiguity correctly unresolved. The desktop
ZVM capture race was removed with a constructor-assignment hook before `lib/main.js`.
Distribution/cache wiring is current; APK refresh remains the final packaging gate.
## D198 complete implementation (2026-09-29, codex)
D198 gates A-G are implemented; Grok accepted the staged implementation through bus #942,
and Codex completed the final identity/deduplication and package audit after that reviewer
became unavailable. Exact executable-ZCOD
identity, complete provider registration, bounded Infocom grammar decoding, three owner-local
off/shadow/on valves, unique-ID opcode provenance, conservative TAKE/DROP semantic forms,
fail-closed exit linkage and explicit restore lifecycle resets are shipped in source. The
current decoder proves no direction-property linkage, so D198 correctly adds no speculative
exits. The focused/compatibility suites and 30-check cross-owner contract matrix pass; both
embedded document validators and package parity pass.
Clean desktop/source distributions and `ParchLock-dev.apk` were built; APK SHA-256 is
`0B01D64D6557DB23DC44CB6D34D19C327374F01678E039A0E9FE658EC0F84A0C`.

## D109 update (2026-09-22, codex)
The shared speech payload applies a narrow anchor-to-anker pronunciation hint so
Anchorhead uses a K sound in both Android and desktop voices. Display text is unchanged.

## D108 update (2026-09-22, codex)
Read-aloud now tracks consumed character length per Glk BufferLine, so later paragraphs
appended to the same element are spoken exactly once. A shared deterministic preparation
pass for Android and desktop suppresses diagram strokes/prompts, retains lexical labels,
and normalizes all-caps titles/compass labels.

## Current phase
D100-D104 COMPLETE in source and in the rebuilt dev APK (2026-09-21, claude sole active seat; codex and grok out of credits). Operator device confirmation pending reinstall.

## D104 / session close (claude)
Read-aloud reworked (BufferLine elements, not mutation text) plus optional "Skip lines repeated from the previous turn" (default off); see PRODUCTION_PLAN D104 and ARCHITECTURE_UML section 39. D103 tutorial reviewed live (appears at first line prompt on mobile only, no observer churn, Escape completes without toggling the map, Options replay works). Regression: 15-script critical suite plus both D100 harnesses green (d94 54, d96 98, d95 29, d100-read-aloud 23, d100-live-turns 16). d95-mic-hold needed the tutorial dismissed in its page setup (PL_MobileTutorialSeen), same as suites dismiss the splash. SW shell v16. Dev APK rebuilt 07:33: ParchLock-dist/ParchLock-dev.apk sha256 356ae4667d8e91fd..., every checked file inside the APK matches source. Not verified: real-device behaviour (intro speech, tutorial, Back button), web speechSynthesis path in the live-turn harness. Open decisions for the operator: ReadAloudDialogs default (first-run Help popup is not spoken), the no-prompt reachability gap after D102, release signing/legal gates from D99. Stale claims by grok/codex remain on the bus (both out of credits); operator authorised claude to edit under them.

## D103 update
The first usable mobile line prompt now presents a two-step installation-wide tutorial: actionable
quick tap versus hold, then input/submit hold -> Tools. Completion/Skip persists globally and Options
can replay it. Existing gesture handlers are untouched. Expanded D96 is 98/98; portrait and landscape
visual inspection passed. Broader regression, cache bump, distribution and APK rebuild remain.

## D102 update
Mobile no longer displays or reserves space for the bottom Menu handle. Existing input
long-hold radial access is unchanged; its Tools button opens the comprehensive list with
Open map, Modules, and Exit game added once. Desktop is unchanged. Evidence: D96 82/82.
Claude's independent live Anchorhead probe also passed with no D102 defects.

## D101 update
The duplicate Tools fix is retained and now directly tested in game and Tools menu
contexts. Mobile Display **Text size** uses a prose-only relative reading scale while
D94's fixed character-cell layer remains unchanged; desktop keeps its existing prose
scaling and fixed grid. Evidence: D94 54/54 and D96 112/112. No distribution/APK rebuild
is being raced while Grok's separate D100 read-aloud work is live.

## Historical D99 program
D99 ParchLock release program with D97 story policy and D98 Module Manager.
Canonical plan: `PRODUCTION_PLAN.md` sections 12-13 (Ã‚Â§12.8 Grok closeout). Target
architecture: `ARCHITECTURE_UML.md` sections 34-35. Codex implemented; Grok finished
full adversarial audit+fix: Tools duplicate fixed; Display font experiment reversed
(operator); packaging leftovers cleaned; 15/15 critical harnesses green; dist+dev APK
rebuilt. External gates remain operator-owned.

## D99 completion update

Product identity, D98 local Module Manager, documentation/legal set, runtime and source
allow-lists, Android namespace/permissions/signing flow, generated-asset cleanup and
dead Emglken runtime exclusion are implemented. Focused desktop/mobile/module/semantic
suites and the Android debug build pass. The known Wumpus/zblorb holistic-scope gap is
recorded as a residual mapping limitation, not hidden as a pass.

## Last update
2026-09-20 (evening), claude: D94 -- intermittent blank game screen (missing
UndoRestoreSync.onStateRestored threw inside the VM boot; also the true cause of the
"pre-existing" ui-regression failure D93 mis-attributed to Glk) and misaligned mobile text
(GlkOte measured its character cell in #parchment while rendering in #windowport; fixed by
css/CharCell.css). Guards: harness/d94-cell-and-boot.js, harness/audit-restore-sync.js
(real-module cases), tools/check-missing-methods.js. Five desktop Playwright suites now
dismiss the ParchLock splash like the app does. APK versionCode 25. See PRODUCTION_PLAN.md
D94 and ARCHITECTURE_UML.md section 31. Operator granted claude permission to edit files
held by other seats. NEXT: mic hold-to-talk investigation (operator report).

2026-09-20, claude: PRODUCTION_PLAN.md/ARCHITECTURE_UML.md fully updated for this
session's work -- see decision log D88 (updated, stages 1-6 shipped)/D89 (critical
whole-catalog RAM-reading recovery, joint with codex)/D90 (stale-fixture repairs)/D91
(GrammarProvider pre-existing bug)/D92 (mobile PWA + native Android conversion), plus
ARCHITECTURE_UML.md sections 28 (updated implementation status)/29 (RAM-reading recovery
architecture)/30 (mobile architecture). One known open item tracked separately, not
blocking: harness/d23-topology-smoke.js regression in codex's MapTopology.js pathing
changes, flagged to codex (bus #536), not yet resolved. Full regression suite
re-confirmed green after doc updates (18 core harnesses spot-checked directly).

## Current task
D88 staged implementation, actively in progress with claude piloting and grok as the one
live brain (codex is intentionally not running -- out of credits, operator directive: one
brain only alongside the pilot). Stages 1-6 are done and verified (see Stage 6 entry
below); Stages 7-8 (held-out challenge, cleanup) remain. Stage 1 baseline
capture is CLOSED: grok's tools/d88-baseline-capture.js (632 lines, loads real Zork1
z-code, exercises GrammarProvider against real grammar-ram, caught a real finding --
grammarSourceHardcodesLookInventory: true) runs clean to tools/screenshots/matrix/
d88-baseline.json; a second independent capture (tools/d88-baseline-capture-claude.js,
synthetic-payload, executes real ActionSynth/Actionable.Open/Qol/Autocomplete/
commandForExitLabel) cross-checks it. Stage 6 (consumer cutover) not started --
deliberately deferred to be driven by the operator's actual mobile bug reports rather
than a guessed touch-handling implementation.

Known operational issue: the grok brain hit a fatal mailbox desync shortly after
finishing Stage 1 (`message #483 is no longer current unread mail for grok`), crashed,
was auto-restarted by bus-supervise, and the fresh process began waking on EMPTY
timeouts (no new mail) and burning multi-minute provider calls re-stating an
already-closed Stage 1 finding. Told to stand down (#504). Worth watching for
recurrence -- looks like a real bug in the brain's idle-wake logic, not normal behavior
(contrast with 2026-09-14's logs, which correctly no-op'd idle timeouts as
"wake-idle-skipped").

## Last update
2026-09-19, claude: took the baton (codex out of credits, no D88 product code existed on
disk; its Mendel/Halley/Hegel audits were read-only and left nothing recoverable). Fixed
both named Stage 1 stale fixtures (harness/d31-known-topics.js ask-template regex,
harness/command-consistency-regression.js Input.Inject mock return value); both green,
independently re-verified by grok (#490). The bus's grok/codex brain processes had been
dead since 2026-09-14 (no service supervisor in this bus version, per Portable-AI-Bus's
own docs); restarted via `node scripts/bus-up.js --root . --console claude --brains
codex,grok` after clearing a stale baton stall with `mailbox.js reassign`. Per operator
correction, killed the codex brain (pid 36708) and its supervisor immediately after start
and relaunched bus-supervise scoped to `--seats grok` only -- one live brain, matching
"one brain per instance" alongside the human-piloted seat. Grok's process genuinely runs
(~6 min real inference time per call, confirmed via brain-grok.log stall-resolution
timing) and produced an independent, technically specific audit (#489-491) that found a
real gap: `Intent.ASK_ABOUT` had no producing path in js/SemanticActions.js since
ActionSynth never emits an "ask about" verb (Actionable.Open() builds it ad hoc,
per-topic). Fixed with a dedicated `SemanticActions.resolveAskAboutFormsForObject`
entry point (kept separate from `resolveForObject` so Stage 2's ActionSynth byte-parity
gate stays intact) that mirrors Actionable.Open()'s real construction; proved exact
parity against the REAL Actionable.Open() output (not a reimplementation guess) via a
jQuery-mocked vm sandbox in harness/d88-semantic-parity.js fixture 4.

Stage 2 (semantic registry, shadow mode): js/SemanticActions.js added, wired into
play.html as a script tag only (no consumer calls it yet -- UI still runs through
ActionSynth). harness/d88-semantic-parity.js: 19/19, deep parity with
ActionSynth.commandsForObject/commandsForPayloadObjectId/collectFromPayload proven byte-
for-byte across mixed-attr, nested-container, and inspect-disabled fixtures.

Stage 3 (role-aware multiword recognition): SemanticActions.recognizeTypedCommand added,
covering look-at/talk-to/switch-on/switch-off/give-to/put-in/ask-about templates with
exact unique-name matching (never partial/fuzzy). harness/d88-multiword-recognition.js:
16/16, including same-named-object ambiguity (D47-style) and partial-command fail-closed
cases.

Full harness/*.js sweep re-run after each stage; clean throughout (only underscore-
prefixed live-browser/CDP probe scripts fail outside a real browser, expected).

Stage 4 (passive TurnRecorder evidence): SemanticActions.turnRecorderAnalyzer registered
against the REAL, unmodified js/TurnRecorder.js (registration call added in play.html
only). Records provisional-only evidence for recognized multiword commands; every entry
is unconditionally confirmed:false -- no per-engine structural opcode witness is wired
yet, so nothing here can promote to confirmed semantics (matches the invariant that
behavioral/transcript signal alone is never proof). harness/d88-passive-evidence.js:
9/9, including proof that recording evidence has zero effect on resolveForObject's
output (shadow mode).

Stage 5 (sidecar persistence): PM_SemanticActions_<release-serial-checksum-adapter-locale>
namespace, separate from PM_AttrCalib_* v2 (never read/rewritten). Fails closed on
corrupt JSON, version mismatch, and buildKey mismatch. Only confirmed:true entries are
ever persisted -- today that's always zero, by construction, since nothing is confirmed
yet; the empty-persist case and a real confirmed-entry case are both covered. D85
substitute-verb data imports once as provisional (never confirmed) evidence. One
additive line in js/UndoRestoreSync.js's existing resync() (same pattern as its other
subsystem tick/Refresh calls) clears generation-bound evidence on real undo/restore/
restart. harness/d88-sidecar-persistence.js: 17/17.

Stage 6 (unified consumer cutover) DONE, behind SemanticActions.CutoverFlag
(localStorage "PM_SemanticActions_Cutover" === "1", default OFF -- legacy path
byte-identical unless explicitly enabled). Swapped consumers, each proven flag-on
output identical to flag-off legacy output in harness/d88-stage6-cutover.js (13/13):
left-click primary command (js/Actionable.js Init() click.pmAct, via new
Actionable.resolveObjectCommands/resolveExitCommand helpers), object/inventory radials
and ask-about (Actionable.Open(), via the same helpers plus resolveAskAboutTopics),
input radial (js/Qol.js GetRadialCommands), autocomplete (js/Autocomplete.js
RamCommandSeeds). Usage-by-intent added additively (Actionable.intentUsageCounts /
noteIntentUsage), legacy usageCounts/verbCounts untouched, per the plan's "retain legacy
counters for comparison during the soak."

Genuine touch long-press added (ARCHITECTURE_UML.md's mobile gate -- contextmenu
simulation is explicitly not proof): real touchstart/touchmove/touchend/touchcancel
handlers in Actionable.Init(), additive only (click.pmAct/contextmenu.pmAct
completely unchanged). Real timing (LongPressMs/LongPressMoveCancelPx), real
cancellation on movement past threshold, real duplicate-submission prevention
(touchend after a fired long-press calls preventDefault so the trailing synthetic
click/contextmenu cannot also submit). harness/d88-touch-longpress.js: 9/9.

Also fixed, found via the Stage 6 regression sweep (pre-existing, unrelated to D88,
operator-approved to fix now): js/GrammarProvider.js's readVerbWords had an
alphabetical slice(0,80) cap that silently excluded late-alphabet verbs (take/look/
pray/xyzzy all missing on Advent); collect() also hardcoded look/inventory,
duplicating js/Qol.js's own universals. Both removed -- no artificial cap (same
discipline as the rest of this codebase's D77 "let OpenRadial page real overflow"
rule), specialCommands is now exactly the real per-build dictionary-verb words, never
padded. Verified bounded/real, not runaway: Advent 228, curses 276, adverbum 293
verb-flagged words, each decoded from that game's own dictionary (never an external
list). harness/d34-dictionary-verbs.js: 54/54 (was 42/54).

Stages 7-8 (held-out title-blind challenge, legacy cleanup) not started, gated on an
operator decision to flip the cutover flag on by default after a soak period.

Full harness/*.js sweep re-run after Stages 4-5; clean (only underscore-prefixed live-
browser/CDP probe scripts fail outside a real browser, expected, unrelated to D88).

## Workflow states
- PLANNING
- READY_FOR_IMPLEMENTATION
- IMPLEMENTATION_IN_PROGRESS
- READY_FOR_REVIEW
- REVIEW_IN_PROGRESS
- READY_FOR_FIXES
- DONE

## Log
- 2026-09-16 codex: Two isolated proposals converged on stable intents plus parallel
  dialect providers. An isolated challenge rejected transcript diversity as semantic
  proof and added fail-closed INSPECT, ambiguity, touch, localization, side-effect,
  persistence, and delayed-output gates. Recorded as D88; documentation only.
- 2026-09-16 codex: D87 audit remediation ready for review. Structural location
  strategies are compiler-aware and coexist: Infocom keeps native containment,
  Inform enterable nesting is walked, and parentless games use learned changing
  globals. Names remain display labels. Command lifecycle, radials, navigation,
  persistence, action contexts, autocomplete, and server endpoints were repaired.
  Full evidence is recorded in PRODUCTION_PLAN.md and docs/ai-handoff.md.
- 2026-09-13 claude: D79 (`js/ZRamReader.js` `findLocationGlobal` scoring fix) shipped, verified,
  documented. Do not reopen.
- 2026-09-13 claude: found+fixed Wumpus room-title bug scope; codex claimed js/WorldModel.js.
- 2026-09-13 codex: first edit landed, self-reported passing, but modeled the bug as multi-line
  with a fabricated harness fixture; claude verified against real captured data and found it
  still failed for wump2ka, took the file over directly.
- 2026-09-13 claude: D80 (real column-based fix) shipped, verified live, documented correctly in
  both plan/architecture files; corrected the earlier inaccurate entries.
- 2026-09-13 claude: D81 (Actionable.js room-scope tracking was name-keyed, not RAM-id-keyed --
  the same bug class D47 already closed for MapTopology/Map.js, extended to this subsystem)
  shipped, verified live across wump2ka/Anchorhead/Zork1, documented.
- 2026-09-13 claude: D82 (Deadline.z3.js real playthrough found the player object itself leaking
  into room-scope discoveredObjects) shipped, verified, documented.
- 2026-09-13 claude: D83 found (Bronze.zblorb.js never resolves a real room via parent(player) or
  findLocationGlobal) -- documented as an honest, open limitation rather than a forced guess.
- 2026-09-13 claude: D84 -- per-game learned location-global calibration, closing D83 generically.
  Investigated and rejected hooking the interpreter's `variable()` accessor (JIT compiler bypasses
  it for the common global-store path, confirmed via direct `lib/zvm.js` source inspection);
  shipped a plain-RAM-read correlation approach instead (same primitives `findLocationGlobal`
  already uses, no new VM patch surface). Verified live: Bronze now resolves rooms correctly after
  ~8 moves; Anchorhead/wump2ka/Zork1 unaffected. New harness `attr-calibrator-location-global.js`
  (13/13). Full regression suite green. No active task remains.
- 2026-09-13 claude: operator reported a live UI bug in `Alabaster.gblorb.js` (Glulx/Quixe host,
  not Z-machine/ZVM) -- widening the browser window after load permanently removes the
  `.Input.LineInput` element (confirmed live via real resize, not assumed); Anchorhead (ZVM)
  survives the identical resize fine. Traced partway: `Parchmap.js` `Init()` references
  `$(window).resize(Parchmap.UpdateUI)` but `Parchmap.UpdateUI` is never defined anywhere in the
  codebase (a real, confirmed dead reference) -- however `has-line-input`'s body-class toggle is
  just a passive per-tick reflection of the input's actual state (`Parchmap.Loop`, every 200ms),
  not the cause, so fixing that dead reference alone is unlikely to be the real fix. The disppearing
  DOM element itself points to the interpreter's/GlkOte host's own resize-triggered window-layout
  code (`lib/main.js`/`lib/quixe.js`), which is Glulx/Quixe-specific plumbing this project has not
  yet started decoding (operator: "we have not started decoding these types of modules... they're
  an entirely different system... we don't have to concentrate on them yet"). PARKED, not fixed --
  no code changed, claim released, diagnostic scripts/screenshots cleaned up. Revisit only as part
  of deliberate Glulx/Quixe work (same scope boundary as D28/D36/D38), not as a one-off patch.

- 2026-09-22 codex: D110 implemented and ready for adversarial review. All adaptive
  command radials share uncapped usage-first ordering with deterministic prior/index
  tie-breaks; non-submitting launchers/stems count once; More/Tools are excluded.
  Focused structural harness: 144/144. Existing real-browser mobile/desktop suite with
  D110 DOM checks: 102/102. Cache advanced to v25.
- 2026-09-22 codex: Claude audit #762 verified D110 A-H and found one overlap defect:
  a stem tap plus its accepted completion counted twice. Operator selected exact-once
  accounting. Pending stem completions now deduct their accepted overlap; unrelated
  submissions clear the link while preserving abandoned taps. Cache advanced to v26.
- 2026-09-22 codex: D111 automatic mobile arrow pad implemented from structural
  GridWindow+CharInput eligibility. Buffer prompts are excluded; auto/manual ownership,
  dismissal, prompt-replacement grace, and direct keyboard-strip access are preserved.
  Anchorhead live gate: six arrows, 183 animation frames, zero visibility transitions;
  real keyboard Q exits HELP. Cache advanced to v27.

- 2026-09-20 (claude): D96 -- mobile Menu is now a retractable bottom handle (no longer over the text field) and a faint right-edge Map tab opens/closes the map; also fixed first-launch Help popup losing its dialog flag. See PRODUCTION_PLAN.md D96, ARCHITECTURE_UML.md section 33, harness/d96-menu-handle-map-tab.js (109 checks). APK versionCode 28, cache v7.

- 2026-09-20 (claude): D97/D98/D99 recorded (planning only): D99 = master ledger of the ParchLock release program (retained scope), D97 = story policy, D98 = Module Manager with codex review #609 folded in; ARCHITECTURE_UML.md sections 34 (release/documentation) and 35 (module library). No implementation authorized; operator gates open: source delivery, signing-key custody, allowBackup/INTERNET, PL prefix confirmation, legal name.

- 2026-09-20 (claude): FINAL PLAN submitted to codex for implementation by operator instruction: PRODUCTION_PLAN.md sections 12 (D99 ParchLock release program) and 13 (D98 Module Manager) are the canonical text; ARCHITECTURE_UML.md sections 34-35; operator decisions Q1-Q6 in section 12.3 (source zip bundled with every release + Git later; operator keeps signing key; allowBackup off; INTERNET removed; PL prefix; credit only). Single-writer freeze begins when codex confirms claims reconciled; grok review/test-only. Implementation pending.

- 2026-09-20 (claude): SEAT FINALIZED -- claude is out of usage credits. All claims released. Handoff: PRODUCTION_PLAN.md sections 12 (D99) and 13 (D98) + ARCHITECTURE_UML.md sections 34-35 are the final plan for the ParchLock program and Module Manager (implementation pending, codex single writer). The sole-editor rule for those two docs cannot be honored while claude is out: operator must designate an editor. Operator gates all answered (section 12.3). No product code was changed after D96 (APK versionCode 28, cache v7).


## D201 final adversarial audit (2026-09-30, codex)

Catalog compass discovery now requires a complete eight-label planar family,
rejects contradictory labels, and caches by VM backing buffer. This prevented
Inevita's five-label partial profile from suppressing valid stock directions;
212 complete catalog profiles remain authoritative. Uncatalogued, text-confirmed
objects now reuse ActionSynth in a compiled-evidence-only mode: module-declared
attributes and confirmed per-object learning can populate their radials, while
parser vocabulary or dictionary membership alone cannot grant a verb. Ordinary
catalogued objects and parallel providers are unchanged. Focused contract 7/7;
catalog 271; StatTracker 132/132; live D201 gate 69/69; shell v88. A real
submitted SCORE response that explicitly names experience now binds that
module's score-popup/RAM learner to EXP; unrelated experience prose cannot.
The ordinary first score popup can establish EXP without a command when
LVL/STR, dictionary vocabulary, announced delta and zero-to-total RAM evidence
all agree. "20 experience ... need 30 more" displays 20/50.


2026-10-08 Codex D214 continuation: U1-U6/P1 peer acceptance a40f7ba/1966; authorized solo final audits1978 completed source slice (report work/investigations/2026-10-08-codex-final-self-audit.md). ZIL static room prediction and nonpathable hints implemented, generic ambiguous-word behavior verified, E1/E2/E3 fixtures repaired. APK63/version36/cache140 checkpoint/build verification next. No physical-phone claim or operator overall goal completion.


APK63 complete: source checkpoint0e9a9faffaee3632a6f7c8b74fc294bf5cadb571; Android versionCode36/versionName2.0.0, cache140. Gradle assembleDebug succeeded17s; v2 signature verified;457 bundled asset/source byte matches. ParchLock-build63.apk 84252953 bytes, SHA256 B58A519EE590CD40D2DE55235B660F2BAFF028628AC97956DF16D82F263F2FB8. Corresponding source archive SHA256 F3A9256268CA28409B4CB45168015EB3C4AB5468743866DD42A7375CB3BF1409. APK62 preserved in Downloads/ParchLock-APK-archive. Physical Android validation remains operator-owned; no overall goal completion recorded.

2026-10-08 HHG follow-up closed: A/B1998, C2000, refinement2003 accepted independently. Noun-safe links, nested held labels, real fixed-ZIL TAKE attribute, transient offstage inventory-root rejection, synchronous radial pool and full wrapping inventory names implemented. Native22/root13/disambiguation51/lifetime28 and peer cross-engine inventory controls pass. Shell141; no APK rebuilt. Next authorized queue from operator relay2004: bounded Equipment beautification with blind/adversarial loop, then full death-signal loop. APK archive location corrected by operator to C:/Users/hymlo/Downloads/Projects/Parchmap-main/ParchLock-APK-archive.

2026-10-09 Equipment surface1 accepted2051: scoped Options/control/state/text-stat presentation; centered grip unchanged; existing protector reused. Focused guards and native width/theme/keyboard-model proofs pass. Shell142, no APK. Full-app sweep continues with planned surface2 bottom-exit clearance; canonical D215 owned by Claude.

Bottom exit clearance accepted2068: measured mobile band, preserved SW/S/SE sectors, unchanged handles/input/rails. Native60/static46/equipment119/layout pass; warning fixture drift repaired after HEAD reproduction. Shell143/no APK. Surface3 accepted plan2057/2061 implementation next; full start-screen overhaul2065/2066 added.

Map visual surface3 accepted2080 after B1 specificity repair: native12 width/theme captures, centered/browsed pip geometry, World52/panel29 pass. Node geometry/handlers/handles retained; separate browsed-icon overlap queued. Shell144/source only. Start-screen overhaul implementation in progress under separate audit2083.

Start-screen overhaul accepted2086 after St1-St4 repairs: updated information, responsive library/cards and accessible native controls. Focused real keyboard/filter/persistence six-layout proof and independent startup/module guards pass. Shell145/source only; Directions close and measured radial review next.

Directions close and desktop Menu spacing accepted2102: native24 width/theme positives, startup and focused radial guards pass; exact outer radius181, mobile/input/object contexts retained. Shell146/source only. Browsed-map controls, death and icon selection remain before requested APK.

G3 browsed-room controls accepted2138: fade in place, first icon touch reveals without travel; name/body browsing immediate. Interrupted pointer state reset and keyboard behavior verified. Focused45, d48 3, map pathing and peer WorldMap52 pass. Shell147/source only; death and native icon rotation loops continue before APK.


D215 death and approved icons closed: death implementation af89695 independently accepted2169 (focused35, render10, native HHG death1); icon assets13b101f independently accepted2168 (166 packing checks). Full artwork selection is approved. Shell148 precaches the three manifest icon files and refreshes the changed StatTracker. Native rotation R3 consensus2171 is implementing before the requested APK; no new APK yet.


APK64 verified: checkpoint85c8fee88f179b1d61510a9f9abbea20e5e775ea; BUILD64/versionCode37/versionName2.0.0/cache149. Native rotation a1e5035 independently accepted2181 after final Java compile, six real desktop shortcut checks and native-warning browser verification. Gradle assembleDebug succeeded7s; v2 signature verified;494 bundled source-byte matches and350 source-archive byte matches. Artifact C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-build64.apk:87770763 bytes, SHA256515a78786841be53ce02e3722c7a27e7309fdb8a48a93d34b672bbbf2afb460b. Source archive SHA256caf7c0fd67eba341bd20d495ac88ae401e578d4556ec920f99583cd473462805. Prior APK63 and generated directories preserved in the operator-named archive. Experimental base-icon rotation remains off by default; physical launcher checks belong to the operator after delivery. Independent final package confirmation requested from Claude2185. No operator overall completion recorded. The separate adversarial text/credits/permissions review is next.


Post-APK continuation: Claude independently confirmed APK64 in2186 and canonical closeout53ea9c8. Cleanup R2 implementation27d60e7 independently accepted2194: exact191 removals,14 cited retained probes,15 ignore controls, player data preserved and no runtime changes; focused death35/0. Both post-APK text investigations are sealed and compared (Codex8d18947/7cbbb77, Claude2195). Text proposal R1 split2196 plus dependency-notice2197/cache2198 amendments awaits peer adversarial verdict; no product text changed. APK64 remains the accepted pre-text deliverable. Unknown splash provenance and public-release rights remain recorded, not assumed. My background watcher was stopped after authenticated bus500 EMFILE; active-turn reads restored communication, shared harness untouched.


2026-10-09 Text sweep closed: docs 4d293d1/0524ec5/51ac844 independently accepted2210; runtime prose be74a8b independently accepted2211; canonical06a2036. Product document links15/0, runtime syntax, prose-only tutorial/Workspace guards, visible native Help390 pass. Shell150 source only; delivered APK64 remains shell149. Release artwork rights/name clearance remain operator items, not assumed. New save-state report2209 has independent sealed findings e338018 and Claude2212; compare2214, proposalR2 review2221 pending peer acceptance. Native Treasure custom death YOUR BODY IS NEVER FOUND reproduced uncounted2220. No new runtime fix written before consensus; icon concern withdrawn by operator. Active-turn authenticated mailbox polling continues; own high-volume watch remains stopped after prior EMFILE. No overall goal completion.


2026-10-09 Save-state implementation loop mutually accepted2235/2236/2237: Claude8291b5f, Codexa8364a7/36d64f6, closure planb3eb748. Native Treasure full6names restore without extra INVENTORY and actual custom cliff death1/notice pass; native transcript15/0, SaveState34/0, death40/0, command-disambiguation51/0, label ownership and restore-order/timer guards pass. Phone notice clears existing status/input/exit reserves; CSS-only refinement66a8901 awaiting peer final acknowledgment. OPEN_WORK text boxes and four save-state issue boxes updated with honest scope and unresolved operator art/name rights. Source shell151; APK64 remains earlier shell149, no new APK. Architecture update requested2240 because plan closure alone was insufficient. Own high-volume bus watcher remains stopped after prior EMFILE; active-turn reads used. No operator overall completion recorded. Audit: work/investigations/2026-10-09-codex-save-state-audit.md.

2026-10-09 Final documentation handoff pending: functional implementation acceptance2235/2236/2237 remains valid. Codex supplied grounded architecture handoff c103968 (work/investigations/2026-10-09-save-state-architecture-handoff.md) and plan boot-qualification correction2242; canonical architecture/index remain Claude-owned. Final CSS66a8901 acknowledgment2239 and architecture requests2240-2243 have no reply after repeated authenticated mailbox checks. Operator asked asynchronously to resume Claude or confirm activity. No overall completion or fresh APK claimed; delivered64 does not contain source151. Functional claims released; completed root records and CSS released for peer review. No background watcher/model wake guarantee: prior EMFILE watcher stayed stopped, only active-turn polling used.

2026-10-09 Icon-start round active: operator requests timed mailbox monitoring until implementation consensus, then stop. Blind request2245; Codex sealed2a3e492 and Claude2246 sealed; compared2248. R2 blockers2253 (deferred lifecycle, per-Activity launch counting, immutable tapped scene and commit-after-success, removal of appUi calls, truthful pin results) resolved in R3 and accepted2257. Claude owns native Android, PC launcher and JS Options implementation; Codex independently audits current checkout, no overlapping product edits. No icon work on non-finishing stop; safe pinned rotation at new-Activity start, experimental warned/off-default and only on real finishing exit. Native consent gates Bridge/WebView startup and forwards resumed lifecycle once. Only active issue1 from OPEN_WORK APK64 queue;2-10 untouched. Prior save-state CSS accepted2254 and architecture343f45f reviewed2251; final D215 index row update belongs to Claude. Timed authenticated wait/read calls remain active; no background model-launch or wake guarantee claimed. Stop condition is current implementation mutual acceptance, not operator overall project completion; no APK request in this round.

2026-10-09 Icon-start implementation consensus met and this round stops automatically: Claude901eab8 independently accepted2264, peer closure2265. Reviewed final plan D215 issue1, architecture75 and OPEN_WORK checked item1; eight audited code hashes unchanged after commit. Codex actual Activity integration15/0, real Windows scratch COM11/0, Android offline compile BUILD SUCCESSFUL, JS syntax and scoped diff pass. Initial actual Activity Home-before-Runnable failure fixed with live resumed/pending-once guard; false refused-pin retry promise corrected. Independent audit work/investigations/2026-10-09-codex-icon-start-audit.md and fixture d8f347b. Prior CSS2254 and save-state architecture343f45f also closed. Stop timed active-turn mailbox polling now; no persistent root watcher/model wake monitor exists to terminate. Only active issue1 closed; queued2-10 untouched. No new APK, source152 remains separate from delivered APK64/source149; physical-device checks remain operator-owned. No overall project completion recorded.

2026-10-09 APK65 packaged from b1d3f775cd3d51c0b176f31a6ca5379e66f3dfe6: BUILD65/versionCode38/shell152. Gradle dev build PASS; APK v2 signature PASS; all501 public assets byte-identical to generated Android output; source356 files byte-identical to checkout (373 archive entries including directories), games/bus/generated excluded. APK87806787 bytes SHA2569233de7081b6ae817d7164d01bda2f6d011aad1afd4f3d51b63935f3fcb7c3ef. Source27080089 bytes SHA2569a50e3b1b4d459af29f276abd08765a6a0d751e59203fa5dd0aef3df855b7b7e. Current APK C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-build65.apk; APK and source copies preserved in operator ParchLock-APK-archive. Includes mutually accepted icon-start, save-state and text changes. Package audit requested2267; reply pending. Queue2-10 remain open; no physical-phone verification or overall goal completion claimed.
