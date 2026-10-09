# AI Plan

## Active Plan: Actor detection and unnamed-candidate trigger words (2026-10-05)

State: REVISION 2 ACCEPTED by Codex (#1383). Step 1 DONE: Claude audit ACCEPT #1388 (d201 14/0; live particle audit 1280+360 PASS). Step 2 DONE: Claude audit ACCEPT (live mark + accepted examine/talk; negatives wump2ka x3, 905, LostPig, Anchorhead PASS). Step 2b DONE: Claude audit ACCEPT (parity24, focused21; single caller). Step 3 DONE: Claude audit ACCEPT #1411. Steps 4-6 open; see tracker T3-T8.
Writer of this section: Claude. Reviewer: Codex.

### Operator defect tracker (every report is kept here until verified closed)

| # | Report | Status | Owner / step |
|---|--------|--------|--------------|
| T1 | NPCs/enemies get no underline or actions (Von Darth) | Fixed in steps 2, 2b, 3; audited | Codex writer, Claude audit |
| T2 | "the" triggers the GLADIUS SWORD (`examine the`) | Fixed in step 1; audited | Codex writer, Claude audit |
| T3 | Enemies need real actions (combat) | CLOSED by operator 2026-10-06: enemy actions were already fixed (T1: Von Darth marked, Examine/Talk to). D213 Part B NOT built | Both; evidence-first |
| T4 | Gravel Pit compass shows "assail" (D163 recorded a combat verb as an in-room step) | FIXED (D213 Part A): an in-room step also needs a RAM player-parent change; original command gate kept; Codex accepted #1611 | Both |
| T5 | Status prompts not headless (printed and read aloud); every status-screen command must be headless in every module | Implemented; Codex ACCEPTED 6a. Claude 69 rows: 129 pass, 0 leaks. Suspect released-event speech defect fixed (ReadAloud no longer consumes hidden lines) and verified at 1280 and 360. Remaining: Codex re-audit of that fix, plus startup-route gaps (adverbum, BeingSteve, bookvol, largemac@1280, Codex 122 blocked) | Step 6; Claude writer proposed, Codex audit |
| T6 | Mid-combat save package for Treasures (step 5 fixture) | Waiting: operator to place file in tmp/ | Operator |
| T7 | Docs: D-entry, ARCH §5 line 592 reconciliation, index regen | D206 + D207 written in PRODUCTION_PLAN, ARCH §5 notes, index regenerated; awaiting Codex audit | Claude writer, Codex audit |
| T8 | Cache bump for changed runtime assets | DONE: CACHE_VERSION v121 | Codex, per #1410 |
| T9 | Item actions on the status screen (use on Yourself, drag/drop) | Operator ruled: visible normal actions; no change | Closed |
| T10 | Quick repeat of last command | IMPLEMENTED; operator found radial-sent commands missing, FIXED: every command is recorded at send time (Input.Inject choke point plus a capture-phase Enter listener; mobile Enter arrives on the page), status probes excluded; empty Send repeats; hold = history radial. t10 24/0 desktop, 22/0 mobile; d105 58/0; radial 28/0. Codex audit pending | Claude + Codex audit |
| T11 | Radial commands must RUN, never paste into the line | IMPLEMENTED: a verb stem opens a target radial of scoped objects and choosing one submits; a complete Enter:false command runs (slash commands via Input.Process); paste only when no target exists. Covered in t10-history-radial. Codex audit pending | Claude |
| T12 | No Read option on readable objects | Investigated: Inform 6/7 have NO readable attribute (read = examine unless authored); ZIL has READBIT (needs D145/D73 calibration). Options for Codex review: (1) ZIL READBIT once calibrated; (2) learn Read per object after an observed successful read (AttrCalibrator allowedVerbs); (3) dictionary-verified Read on held items. No text mining (D24) | Claude draft, Codex review |
| T13 | Perilous Magic score 17/3 (status row prints clock hours in its score slot) | FIXED generally (D208): a status Score contradicted by the story SCORE reply at the same moment, or above the reply maximum, is rejected for that story; a stale status-sourced score (column gone) is re-asked on Equipment open; announced deltas count whenever the row is not currently showing a trusted score (also fixes narrow/phone rows). stat-tracker 201, equipment 112, stat-tracker-live 12 | Claude; Codex audit |
| T14 | Treasures Score and Quest Rate duplicate (I1) | October7 regression reproduced with actual restored43 save: dynamic evidence resets and needs two distinct values. Fixed with executable-authenticated semantic relationship, retaining current confirmation/value/max/SCORE-max guards and unknown-game dynamic learning. One Quest Rate row plus rank on first restored Equipment/reopen at360/1280, DOM and tracker verified | Codex writer; independent delegated blind investigation, adversarial plan and implementation ACCEPT; Claude notified bus1629/1630. Alias33/0, statistics204/0, equipment112/0. D209 amended; shellv126; APK rebuilt October7, signature and64 packaged-runtime hashes verified. |
| T15 | Long-press radial triggers native text selection (I2) | CONSENSUS #1537: root cause Actionable.js:690 (suppression removed when the timer fires); keep suppression through a successful hold on underline/Map note-hold/Send/input-line; target-bound selection clear; D105 LineInput copy/paste kept; plain text selectable | Codex writes, Claude audits -- **SOURCE DONE**: implemented (Codex), audited and accepted (#1562); Input predicates by Claude. PHYSICAL ANDROID CHECK pending (operator). D210. |
| T16 | Mic voice-to-text slow until phone reboot, NEW (I3) | CONSENSUS #1537 on hardening (settle barrier, never await native.stop, timeout abandon, bounded TTS stop, backoff) plus a metadata diagnostics ring. OPERATOR NOTE: long-standing code cannot be the NEW cause; speech code is unchanged in git since the first commit, so the investigation must target what changed (recent uncommitted ReadAloud/Input work) | Claude writes after P2 releases Input.js; Codex audits -- **INPUT + READALOUD SOURCE ACCEPTED** (Input accepted by Codex #1575/#1579; ReadAloud accepted by Claude #1578, verdict accepted #1579). p3-mic-lifecycle 21/0, d100 33/0, d95 31/0. Root cause UNPROVEN: operator to run /micdiag after a slow episode (session/build/release-to-settle). D211. |
| T17 | Newly started Anchorhead shows Turns622 | D152/D153 repair: slot2 seeding restricted to v3; divergent behavioral counter totals stay ambiguous; v4+ retained turn pins rederive on story load. Real RAM622 is File Room location while turn globals4/10 are6 on measured early route. Exact operator path/persisted pin not captured | Codex writer, delegated independent blind investigation/adversarial plan accepted; regression12/0, stats204/0, equipment112/0, D20933/0. Claude independent implementation ACCEPT #1638. Shellv127; operator builds APK manually. |

### Reported defects (operator, Treasures of a Slaver's Kingdom, mobile)

1. VON DARTH THE SLY is printed twice in the Gravel Pit but gets no underline or actions.
2. The GLADIUS SWORD is triggered by the word "the": on Abandoned Quarry and Winding Trail
   "of the" / "the" / "view of the" are marked and the radial submits `examine the`, which
   the game answers with "(the GLADIUS SWORD)". Any printed "the" becomes a sword mark.

### Root causes (current code, verified)

- **Defect 2:** `Actionable.promoteUnnamed` (js/Actionable.js:828-836) labels a D184
  unnamed candidate with the longest of its own parser words printed this turn. The
  gladius's parser words include "the". When the sword is held, "sword"/"gladius" are not
  printed in the room text, so the only match is "the". `observedPhraseFor` then builds
  multi-word labels such as "view of the" from adjacent vocabulary. Named objects already
  reject these grammar particles (`namePhrases` js/Actionable.js:994, alias loop :1352).
  The unnamed path was never given the same rule.
- **Defect 1:** Codex live proof (#1377). Actor 196 Von Darth has parent 186, which is the
  player's room. He has an empty short name, `animate`/`proper` set, parser words
  von/darth/the/sly/man/person, and no children. `ZRamReader.scopeObjects`
  (js/ZRamReader.js:1819) returns for an unnamed *animate* child **before** recording the
  D184 candidate (:1834-1836), so the actor never reaches `promoteUnnamed`. The non-animate
  unnamed GLADIUS passes the same path and is marked. The MACHETE has no RAM object at the
  encounter (actor child 0), so it is prose only and out of scope (D24).
- **Latent, exposed by fixing defect 1:** `takeable` is derived as `!static && !scenery`
  (js/AttributeSchema.js:134), so an Inform person reads takeable and
  `commandsForEvidenceObject` would offer TAKE on an actor.

### Cross-check: plan and architecture

- D24: no prose-mined objects. Every step uses only RAM-scoped objects and their own parser
  vocabulary. The printed text only confirms which in-scope word is visible (D64/D184).
- D57 and ARCHITECTURE_UML.md:1297: an unnamed animate wrapper is **not recursed**. This
  plan preserves that. Only the wrapper's own vocabulary is recorded, never its contents.
- ARCHITECTURE_UML.md:592 (§5, "animate -> Recurse held/worn") is older than D57/D68 and
  is not implemented. This plan does **not** implement it, because no held item is proven
  in RAM. The docs step reconciles line 592 to the D57 rule, so the matrix stops promising
  behaviour the code deliberately lacks.
- D82: the player is blocked in `promoteUnnamed` (:793). D201 (ARCHITECTURE_UML.md §D201,
  line 3242) owns the player-candidate evidence: declared animate plus parser self alias.
- D145/D190/D201: promoted candidates carry declared attributes only when the module's
  attribute-name table decodes. Otherwise the radial stays inspect-only. A ZIL or undecoded
  game therefore gains a mark and Examine for an actor, never invented talk/attack verbs.
- D31: an animate in-scope object already receives "Ask about..." (js/Actionable.js:576)
  and a recipient-first ring for give/show/ask/tell (:1637-1648). No new action code.

### Serial steps (each: writer implements, reviewer audits the current checkout, then next)

**Step 1 — grammar particles never trigger an unnamed candidate.**
Writer: Codex. Reviewer: Claude.
Paths: js/Actionable.js (`promoteUnnamed`, and the promoted-candidate call into
`observedPhraseFor`), and a focused regression fixture of Codex's choosing.
Rule: apply the existing seven-particle set (a/an/the/of/and/or/to, the same set as
:994/:1352, shared rather than copied a third time) to **promoted unnamed candidates only**.
Such a candidate's trigger word may not be a particle. Its observed label may not start or
end with a particle, and may not consist only of particles. Named objects and their
structural proper names are unchanged: "the Order" keeps its label, and
`observedPhraseFor`'s behaviour for named objects is not changed globally. No new stopword
list.
Acceptance:
- Treasures: Winding Trail and Abandoned Quarry with the sword held show no mark on
  "the"/"of the"/"view of the". This is checked across **every** promoted candidate, not
  only the sword. Codex's encounter evidence shows object 240 (view of mountains) also
  marks "the".
- A room printing GLADIUS SWORD still marks it, and the radial submits `examine gladius`
  or `examine sword`.
- wump2ka food pellets (the D184 origin case) are still marked.

**Step 2 — record unnamed animate actors as candidates, without recursion.**
Writer: Codex. Reviewer: Claude.
Paths: js/ZRamReader.js:1817-1840, js/Actionable.js (`promoteUnnamed` blocker), and the
regression fixture.
Rule: when an unnamed child is animate, push `{id, parentId, aliases}` to `candidates`,
then return **without** `walk()`. The `scopeObjects` return array is unchanged.
`promoteUnnamed` additionally blocks the D75 confirmed inventory root
(`AttrCalibrator.confirmedInventoryRootId(mem)`, js/AttrCalibrator.js:1089) when it differs from
`playerId`.
Acceptance:
- Treasures Gravel Pit: VON DARTH is marked on desktop and at 360 px. The radial offers
  Examine, and the game accepts it.
- No PC promotion on wump2ka across 3 runs, and none on 905.
- Anchorhead, LostPig and 905 discoveredObjects are unchanged (the D184 revert set).
- Heist and SpiritWrak mark sets are unchanged.

**Step 2b — promoted actors visible to the D88 Ask-about consumer.**
Writer: Codex. Reviewer: Claude. Added after the Step 2 audit (Claude #1395 E4, Codex #1396).
Cause: the SemanticActions cutover is on by default (js/SemanticActions.js:107), and
`payloadPoolFor` (:204-208) reads only `discoveredObjects` and `inventory`. Promoted
unnamed rows exist only in `Actionable.payloadPool`, so `resolveAskAboutFormsForObject`
never finds a promoted actor and returns no topics.
Paths: js/SemanticActions.js, plus a focused fixture.
Rule: only when the supplied payload **is** `WorldModel.lastPayload` and
`Actionable.payloadPool` exists, use that current recovered pool. An explicit older or test
snapshot keeps its own payload path, so it never borrows current-world actor ids.
Acceptance:

- harness/d88-semantic-parity.js stays green (24).
- An old-snapshot negative test passes.
- A promoted-actor topics unit test passes.
- Treasures is **not** an acceptance case, because its grammar rejects ASK ("This computeth
  not."). Whether Ask is offered without grammar evidence is a Step 5 question, for both the
  legacy and semantic paths.

**Step 3 — no TAKE on animate objects in room context.**
Writer: Codex. Reviewer: Claude.
Paths: js/ActionSynth.js `commandsForObject` room branch (:244), which covers both the
named path and `commandsForEvidenceObject`.
Rule: in room context, `attrs.animate` (after `trustworthyAttrs`) removes `take`, **unless**
`AttrCalibrator.allowedVerbsFor(id)` has learned `take` for that object from an observed
successful take. A genuinely takeable small animal keeps its proven capability. Codex
measured actor 196 as reading animate=true and takeable=true, so the gate is required, not
hypothetical.
Acceptance:
- Von Darth's radial has no Take.
- The Heist mourners have no Take.
- An ordinary takeable item still offers Take.
- An animate object with learned `take` still offers Take (fixture).
- Equipment112 and the focused action fixtures pass.

**Step 4 — documentation.** Writer: Claude. Reviewer: Codex.
Paths: PRODUCTION_PLAN.md (new D-entry covering steps 1-3), ARCHITECTURE_UML.md
(§5 line 592 reconciled to D57; note at :1297 that an unnamed animate is a vocabulary
candidate but never a recursion root; D184 particle rule), and docs/DECISION-INDEX.md
regenerated with `node tools/decision-index.js`.

**Step 5 — enemy interactions: evidence-driven decision (planning and audit first).**
Writers: Codex (discovery evidence) and Claude (decision draft), each auditing the other.
The operator asked for actions on enemies, and steps 1-3 deliver discovery plus
Examine/Ask/Talk only, so the goal is **not** complete at step 4.
This step determines which interactions the module's own compiled grammar and per-object
evidence actually support (for example, attack/hit/kill grammar lines whose noun token
accepts animate objects, or AttrCalibrator-observed accepted forms). It implements only
licensed forms, serially and with audit. Hostility or Attack is never inferred from
dictionary membership or prose (D24, D147 dictionary-verified verb rule). If no evidence
licenses a form, the honest result is no combat verb, and that is recorded.

**Step 6: every status-screen command is headless, in every module (T5).**
Writers: Codex and Claude, splitting the catalog. Each audits the other's half.
Operator rule: a status prompt bypasses the transcript **and** read-aloud. Only a command
the player actually types or explicitly chooses as a game action goes through the normal
channel. "No command from the status screen is ever supposed to be live."
Prior decisions: D188 (an injected command is not headless), D204 probe ownership
(`beginProbeOwnership`, `pl-stat-probe`, StatTracker.js:3353-3356, 3457-3610), the
inventory `pl-carry-probe` path (Actionable.js:1306), and the ReadAloud skip (ReadAloud.js:240-241).
Claude first evidence (Treasures, 1280 and 360, desktop browser): first open, Refresh and
reopen all submit `inventory`/`score`/`prowess` as `stat-probe`. Every added line is clipped
or hidden, the transcript screenshot is clean, and nothing reaches read-aloud. So the leak
the operator sees is **not** reproduced on that path yet.
Still to cover:

- Every module with a ModuleStatFacts entry, plus ordinary SCORE/DIAGNOSE games: Equipment
  open, Refresh, reopen, and Identify stats.
- Read-aloud measured through the real speech queue, not only DOM classes.
- States: a mid-turn event during the probe (combat, NPC action, timed text), a probe
  costing a turn, a question prompt pending, and a mobile long-press opening.
- The status-screen item actions (EquipmentUI.js:98 `selectYourselfAction`, :942 drag/drop
  submit): the operator rule must decide whether a deliberate item action is "live".

Acceptance: zero visible probe echo or reply lines and zero spoken probe text across the
catalog sweep. Each failure is fixed at the shared ownership layer, never per title.

**Step 6 root cause (Claude #1419, verified by Codex #1421).** `claimProbeNode`
(StatTracker.js:3512-3607) hides a measured probe's line only if it matches that family's
reply regex ("fail visible", :3513). `PROWESS_REPLY` (:441) encodes only the unarmed,
uninjured state. The operator's screenshot reply ("You wield the GLADIUS SWORD ... Hit Points
are 9 (out of 16).") is not owned, so it is printed and spoken. Every family regex has the
same single-observed-state limit.

**Step 6 serial order (amended per Codex #1421/#1423).**

*6a: origin-span ownership.*
Writer: Claude. Reviewer: Codex.
Paths:
- js/StatTracker.js (`claimProbeNode`, `ensureProbeDomGuard`, `beginProbeOwnership`, `endProbeOwnership`)
- js/ReadAloud.js (`collectNewLines`)
- new harness/status-probe-headless.js (unit and live)

**Operator rule, final (2026-10-05).** The operator's example: mid-battle you open your
inventory and the enemy attacks. You hear the attack while in the inventory, and see it
printed when you back out, but you never see or hear anything that came from the status
commands. This supersedes the interim "hide the whole turn" reading (#1435).

Implemented (#1455/#1458):

- Every line of a probe span is hidden at insertion, so nothing flashes.
- When the span ends, the probe's echo and reply stay hidden. The reply is the first
  paragraph, plus a paragraph introduced by a line ending in ":", plus known reply forms.
- A **META** probe (Inform 6 dictionary flag 0x02) keeps its whole span hidden, because it
  never runs the turn sequence.
- Otherwise the later paragraphs are the turn's events. They are revealed and spoken.
- Lines that existed before the probe was submitted are never touched.

**Operator ruling on the residual (2026-10-05): "Show the attack".** This applies to a
non-META or flagless (Inform 7) probe that takes a turn. An unrecognised later paragraph is
**shown and spoken**, because hiding it would hide real attacks, such as Treasures' "VON
DARTH THE SLY attacks!". The accepted cost: an unfamiliar extra status paragraph may
occasionally show. When one is spotted, it is added to `isKnownProbeReplyLine` (a shared
form, never per title). META probes and colon-continued replies stay wholly hidden.

Rules:

1. Display and speech ownership derive from the **stat-probe origin and its bounded response
   span** (from the probe Submit to the VM's next prompt), never from a metric regex. The
   regexes and parsers keep deciding only what is *learned*, plus the reply and event
   separation described above.
2. Text or span nodes appended into an **existing** BufferLine during the span resolve to
   their closest BufferLine and are owned. Today plain-text addedNodes and ordinary
   `Style_normal` spans are ignored.
3. Reused prompt line: speech excludes only the owned descendant text and keeps any new
   visible narration in the same line. It never skips the whole line because one child
   is owned.
4. Lifetime guards. Nothing is owned after the next prompt, cancellation, timeout,
   restore, new game or undo, or without an active probe Submit. The live input node is
   preserved. Ownership never leaks across story generations. CharInput, terminal
   prompts and the RETURN continuation are explicit boundaries.

Acceptance:

- Unit: appended text/span, mixed reused line, each lifetime boundary, and no owner leaking
  past the next prompt.
- Live: Treasures prowess in a non-starting state, with zero visible and zero spoken probe
  text.
- Speech measured with `window.__PL_TEST_SPEECH = true` and a stubbed engine, plus a
  **positive LOOK control** proving that ordinary narration is still spoken. Both the
  browser path and the native-plugin text path are covered via the existing boundary mock.
- Existing suites stay green: StatTracker, Equipment112, d201, parity24, and the D188
  no-auto-probe assertion.

*6b: catalog sweep.*
**Operator scope (2026-10-05, corrected):** FULL sweep for EVERY manifest module and probe row, with no slimming. Each row: Equipment open, Refresh, reopen and Identify stats, at both 1280 and 360, asserting 0 visible and 0 spoken probe text and, where a turn passes, that real events are shown and spoken. Failures are fixed only in the shared rule. (An earlier slimmed scope was recorded in error; the operator did not agree to it.)
Writers: Codex derives the exact executable+command manifest from the **effective
measured facts**: core StatTracker overlays (prowess etc.), ModuleStatFacts (22),
ModuleStatFactsClaude (56), plus ordinary SCORE/DIAGNOSE, deduped. Each seat then sweeps
its own registry's rows; core overlays and ordinary rows go to Codex. Each audits the
other's failures.
Paths: the harness from 6a, run per row (open, Refresh, reopen, Identify; 1280 and 360).

*6c: fixes from the sweep, at the shared layer only.* Writer: whoever owns the failing
layer; the other audits.

Not in Step 6 (separate decisions, recorded so they are not re-derived):

- **Turn-costing auto-probes.** Existing inventory probes already advance combat and hide
  the attack text in games where a probe costs a turn. Changing when probes run needs its
  own agreed rule, facts and API, and an operator decision.
- **Deliberate item actions on the status screen** (EquipmentUI.js:98 and :942): awaiting
  the operator's ruling on whether they are "live".

Out of scope for steps 1-4 (recorded so it is not re-derived):
- Actor-held items: no RAM evidence yet.
- Marking an actor's secondary aliases once its name is marked: D146, one mark per object.
- Combat or attack verbs. These are deferred to step 5, not dropped.

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

# D167 plan — nine operator-reported items (investigation done, nothing implemented yet)

Grounded in `ARCHITECTURE_UML.md` §55 (D121 reflow band), the D95 voice-input entry,
D149's tracker design and the current code. Each item below says what was MEASURED,
what the fix is, and what is still unknown.

---

## 1. Tutorial: the exits step describes only the top band

Step 6 says "Every way out of your current room appears in the band under the status
line", but the operator's screenshots show exits also rendered on the **left and right
rails** (`#exits .row.vertical.left` / `.right` — "W Narrow Street", "SE Alley", "N
Narrow Beach"). `css/ParchLock.css:3422` confirms the vertical rails are a real,
separately-styled surface.

**Fix**: reword step 6 to describe both surfaces — the band above the story and the
rails down each side — and say that tapping any of them travels. Wording only; no
behaviour change. `js/Tutorial.js` STEPS[5].

## 2. Tutorial: the notes step never says how to make a note

Step 10 explains what notes are and that they are searchable, but not the gesture.
D112 built the interaction: hold (or right-click) a room in Known Rooms to add a note,
plus an optional always-visible add button behind `Global.Prefs.ShowNotesAddButton`
(default false).

**Fix**: extend step 10's body with the actual gesture, and mention the Options
toggle for players who would rather have a visible button. Wording only.

## 3. Microphone: press-and-hold should auto-send

Already two modes (D95, `js/Input.js:412`): `Global.Prefs.MicHoldToTalk`, defaulting to
hold (`js/Input.js:630`). What is missing is submission — a hold-release drops the
transcript into the line input and stops there.

**Fix**: new preference `MicAutoSendOnRelease`, default **on**, consulted only in HOLD
mode. On release with a non-empty transcript, submit through `Actionable.Submit` (the
single choke-point every other control already uses) instead of only filling the field.
Tap mode is explicitly unchanged — the operator asked for tap NOT to auto-send, which
also preserves the "dictate, then edit" flow.

Risk: a mis-heard phrase is submitted as a turn. Mitigated by it being a preference and
by tap mode remaining manual.

## 4 + 5. The score does not update, so no sound and no graphic fire

**These are one defect.** The cue chain is `value change -> emitChange -> _events ->
playCues` (`js/StatTracker.js:426`, `:778`, `:831`), and the flash is the `pl-stat-up`
class added in `Render` when `lastChange` is set (`:950`). If the model's score never
moves, nothing downstream can fire. The operator's screenshot shows `SCORE 0 / 100`
while the story reports 5.

Why it is stuck, measured earlier: Anchorhead's status grid is too narrow on a phone to
print a score (D137), so the text source yields nothing; and `promoteGlobals` only pins
a global after the stat has been seen to **change** across samples, which a single
SCORE reply can never provide.

**The operator's requirement is that this be headless** — read from RAM, not by asking
the game or parsing prose. The plan honours that, with one bootstrap:

1. **Bootstrap (one-off, free).** Inform prints "Your score has just gone up by two
   points." of its own accord — visible in the operator's screenshot 19, costing no
   turn and requiring no command. Parsing that delta gives the one thing the promoter
   lacks: a known change. With `score = N` from the SCORE reply and a known delta `d`,
   the candidate set collapses to the single global whose value moved by exactly `d`.
2. **Steady state (fully headless).** Once pinned, `readConfirmedGlobals` already reads
   the score straight from RAM every turn with no text involved, which is what makes
   the cue fire on the exact turn the score moves.
3. A contradiction demotes the slot and the bootstrap can run again, so this is
   self-healing rather than a one-shot guess.

Also to verify while here: the cue path itself has never been observed firing end to
end. `playCues` skips when `document.hidden`, and `audio()` creates the AudioContext
lazily — on Android a context created outside a user gesture starts suspended, so the
first cue may be silent even once events flow. Needs a real check, and possibly a
resume-on-first-touch.

**Graphic**: `pl-stat-up` is currently a 1.4s background flash on the chip. The operator
asked for "a small graphic". Propose a brief `+N` badge rising from the score chip,
which is also meaningful when the sound is off or the device is muted.

## 6. Drag and drop makes the equipment screen jump

`EquipmentUI.Render` is called from `Actionable.RenderInventory` on every inventory
refresh, and D127 already defers a rebuild that lands mid-drag (`_renderPending`). The
remaining jump is the rebuild that runs on the NEXT payload after the drop: the list is
wiped (`host.innerHTML = ""`) and rebuilt, so the scroll offset resets and the sheet
snaps.

**Fix**: preserve and restore the scroll offset of the scrolling ancestor across a
rebuild, and cancel the drag auto-scroll RAF (`_scrollRaf`) on drop rather than letting
a queued frame land afterwards. No behavioural change beyond the screen staying put.

## 7. Auto-scroll to new output, with the start of the new text visible

`ParchLock.ScrollToBottom` exists (`js/ParchLock.js:305`) and is already called on
restore (`js/UndoRestoreSync.js:31`). There is no general "new output arrived" hook that
scrolls.

**Fix**, two parts:
- New preference `AutoScrollOnOutput`, default **on**, with an Options toggle.
- Scroll on new output. The operator's better request is to stop at the START of the
  new text rather than the bottom, so a long room description is read from its first
  line. Implement as: scroll so the first new line sits just under the reflow band, and
  fall back to bottom when the new text is shorter than the viewport. The marker for
  "where the new text begins" already exists in spirit — `ReadAloud.collectNewLines`
  tracks exactly that boundary — so the same idea can be reused without duplicating it.

## 8. Anchorhead's manual is taken but never appears in inventory

Not diagnosed, and I will not guess at it. What is established:

- The object cannot be found statically: no object in Anchorhead has "manual" in its
  short name, and an alias search finds nothing either because Anchorhead's objects
  largely mine no vocabulary at all (measured in D150 — even "real estate office door"
  returns `aliases: []`).
- Depth is NOT the cause. `walkVisibleDescendants(root, 2)` reaches three levels, and
  the operator's own screenshot shows keys inside a keyring inside a worn trenchcoat
  being listed correctly.
- So the likely candidates are that the game parents it somewhere the inventory root
  does not cover, or that its short name is parenthesised/meta and the walk skips it.

**Needs a reproduction.** Cheapest route: drive Anchorhead to the Library with a
walkthrough in a live probe, take the manual, and dump the object's id, parent chain and
attributes against `payload.inventory`. That is a long scripted session but it is
deterministic and it is the only way to answer this honestly.

## 9. The black band behind the top directions failed

Architecture is D121 (`ARCHITECTURE_UML.md` §55.2): `#exits` is a reflow band whose
measured height is published as `--pl-band-h` (`js/MobileLayout.js:242`); the story
buffer reserves it as `padding-top` (`css/ParchLock.css:3618`) and `#windowport::before`
paints an opaque mask of exactly `--pl-band-h + 4px` (`:3633`).

In the operator's Sitting Room screenshot the chip is drawn over story text, so mask
height and buffer reserve have diverged from the band's real height for that frame. The
measurement is deliberately skipped when unchanged (`if (h === lastH) return;`) and is
coalesced to one read per frame, so a plausible cause is a band height that changes
without any of the watched mutation sources firing.

**Needs measurement, not a guess**: reproduce a one-chip band in a room that also has a
right-rail exit, and compare the live `--pl-band-h`, the band's `getBoundingClientRect`,
the buffer's computed `padding-top` and the mask's height in the same frame.

---

## Order of work

1. Items 1, 2 (tutorial wording) and 3 (mic auto-send) — small, independent, low risk.
2. Items 4 + 5 (score bootstrap, headless tracking, cue verification, +N badge) — the
   highest-value fix, since it makes the whole tracker live.
3. Items 6 and 7 (scroll preservation, auto-scroll preference).
4. Item 9 (band measurement) — needs a live reproduction first.
5. Item 8 (Anchorhead manual) — needs the scripted walkthrough; done last because it is
   the most expensive to reproduce and affects one observed item.

Each gets its regression coverage in the same pass, and `CACHE_VERSION` bumps once at
the end.

## Active Plan: T10 quick repeat and command-history radial (2026-10-05)

State: DRAFT FOR CODEX REVIEW. Writer: Claude. Reviewer: Codex. Runs in parallel with the
Step 6b sweep and touches no Step 6 file.

Operator requirements (verbatim intent):

1. Tapping Submit with an **empty** bar repeats the last command.
2. **Holding** Submit opens a dedicated radial of the recently submitted commands, newest
   first, in the order they were typed. It does not open the general suggestions radial. That
   radial stays on the input-line hold (Input.js:298) and desktop right-click, so nothing is
   lost: Submit's hold (:380) duplicates it today.
3. Selecting a history item **submits** it at once. It never merely fills the bar.
   The history contains ONLY text the player actually submitted (typed, radial-tapped or
   spoken), never an automatic status probe (operator).
4. Long commands are truncated readably in the radial: cut at a word boundary with an
   ellipsis, keeping the leading verb. The full command is what gets submitted.
5. The tutorial teaches both gestures.

Design (existing systems reused, nothing new built):

- History source: `ParchLockQol.GetHistory()` (Qol.js:251), which reads `.Style_input` echoes
  newest first, deduplicated, up to 30. **Required fix:** skip echoes inside
  `.pl-stat-probe` / `.pl-carry-probe`, so a hidden status probe ("score", "prowess") is never
  repeated or listed. This also applies to the existing /history screen and arrow-key recall.
- Tap: `Input.SubmitPrompt` (Input.js:136). When a LineInput is visible and its value is empty
  after trim, submit `GetHistory()[0]` through the normal path (`Input.Inject(cmd, true)`). The
  transcript echo shows what was repeated. An empty history keeps today's behaviour. A
  CharInput keeps today's behaviour.
- Hold: `BindInputRadialTouch` (Input.js:376) opens
  `ParchLockQol.OpenRadial(..., historyItems, { source: "history" })`. Items are
  `{ Label: truncated, Command: full, Enter: true, Action: submit }`. The radial's existing
  paging ("More...") shows the rest. Desktop gets the same through a contextmenu or long-press
  on the Submit button. If there is no history yet, the hold shows a single disabled
  "No commands yet" or does nothing.
- Truncation helper: one shared `ParchLockQol.HistoryLabel(cmd, max)`.
- Tutorial: the "Send and speak" step (Tutorial.js ~126) body adds "Tap Send on an empty line
  to repeat your last command; hold it to pick from your recent commands." The mobile and
  desktop variants follow the step's existing pattern.

Acceptance:

- d105-input-contract stays green.
- New focused cases:
  - empty-tap repeats the last command;
  - non-empty tap submits the bar as today;
  - the hold lists newest first and excludes probe echoes;
  - selecting an item submits it (an echo appears; the bar is not left filled);
  - a long label is truncated at a word boundary with the verb kept;
  - CharInput is unchanged.
- shared-radial-integration and tutorial-live stay green.
- One live mobile (360) proof on a real module.

T10 amendments (Codex #1476, accepted by Claude):

1. Provenance: history excludes an echo whose line or any ancestor is probe-owned
   (`closest('.pl-stat-probe, .pl-carry-probe')`), never by verb string. A player-typed
   "score" or "inventory" stays in the history.
2. Guards: act only with exactly one eligible visible LineInput, behind the existing modal and
   CanInject guards. CharInput is unchanged. The RETURN continuation and multi-window ambiguity
   are verified.
3. Hold, then touchend: the existing suppress-click state is set before the history radial
   opens. Selecting an item produces exactly ONE Submit, with no trailing synthetic tap.
4. Desktop: contextmenu or pointer hold on Submit opens the history radial. The input-line
   general radial is untouched. A history Action goes through the normal Inject path and its
   source, so map, learning and timestamps still record.
5. Only the label truncates; Command is always the full text. A single overlong word is
   hard-cut with an ellipsis.

Sequencing: NO runtime edit (Input/Qol/Tutorial) until both Step 6b sweeps finish, because
those files are part of the source under test. Focused tests (including real touch
suppression and keyboard cases) are written first, as a new harness file.

## Draft Plan: Step 5 enemy interactions and the D163 "assail" compass entry (2026-10-05)

State: DRAFT by Claude for Codex adversarial review (Codex rate-limited). No runtime edits.

**Evidence (Treasures, Gravel Pit, Von Darth = unnamed animate obj 196, D206):** every one of
`attack sly`, `kill sly`, `hit sly`, `fight sly` and `assail sly` is ACCEPTED as a real combat
round, with damage dealt and taken (one `fight` round ended in the player's defeat). Bare
`assail` is also accepted (Codex #1434). Treasures rejects ASK ("This computeth not.").

**T4 defect explained (for the operator).** D163 (MapTopology.js:597-615) records a typed
command as an in-room "sub-location" step whenever the room id stays the same but the printed
room name changes (built for Anchorhead's "stand on can"). Typing `assail` started the fight
and changed the printed location heading without leaving room 186, so D163 saved "assail" as a
compass entry in the Gravel Pit. It is a false map entry: a combat action mistaken for
movement.

Options for review:

- **Combat verbs.** Option A (Codex #1434): an executable-owned capability fact (zero-argument
  `assail` while the combat context persists). Option B: offer `attack <actor>` on an animate,
  in-scope actor only when the story's own dictionary carries the verb flag for it (D147
  dictionary-verified verbs). It would be tested per game for acceptance, never assumed
  hostility. The evidence above shows B is accepted in Treasures. Codex's earlier objection
  ("no Attack from lexical membership alone") must be resolved with catalogue evidence before
  choosing.
- **D163.** Option 1: do not record a sub-location step when the command's verb is one the
  story uses for combat (needs the same evidence as above). Option 2: require the changed name
  to persist on a following LOOK before recording the step. Option 2 is general and needs no
  verb list.

Acceptance (to be agreed):

- The Treasures enemy radial offers an accepted attack form.
- A friendly NPC is never offered combat without evidence.
- No "assail" compass entry after a fight.
- Anchorhead's "stand on can" step is still learned.


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
