# D204 Holistic Statistics Discovery and Event Monitoring Proposition

Status: proposed pre-GO contract under adversarial review. No product implementation is authorized until
this plan, `PRODUCTION_PLAN.md` D204, and `ARCHITECTURE_UML.md` section 68 reach review consensus.

The optional disposable shadow-VM lane described below is not available in the repository today. The
disclosed live ProbeBroker is therefore the only planned automatic bootstrap until a separate spike proves
an exact disposable clone. The evidence ledger and every passive lane are independent of that future spike.

## 1. Objective

Build one adaptive statistics system for Z-machine modules that discovers and displays the facts each
story actually exposes. It must cover conventional and module-defined statistics, update promptly through
level transitions, count repeatable deaths even when play can continue or restart, and behave identically
for typed, clicked, radial, voice, and programmatic submissions.

The exemplar failures are `LLR3.z8.js` (A Little Like Rogue) and `RoTA.zblorb.js` (The Reliques of
Tolti-Aph), but no runtime branch may name either story. They are members of a broader Inform/Woodpulp &
Wyverns family and serve as difficult controls for a general mechanism.

## 2. Existing contracts that remain authoritative

This proposition composes the current systems instead of replacing parallel solutions:

- `PRODUCTION_PLAN.md` D149 and `ARCHITECTURE_UML.md` section 60: honest absence, game-authored facts,
  source precedence, unknown numeric status labels, and no title profiles.
- D152-D153: mobile grids can omit fields, and `WorldModel.apply` can run many times per game turn.
- D167 and D173-D176: score notifications are delta evidence; RAM candidates remain ambiguous until
  proven; displayed arithmetic and RAM pinning are separate responsibilities.
- D178 and D180-D183: persist learned bindings, not stale readings; resynchronize before the first
  post-restore world tick; first readings after resync do not emit false changes.
- D188 established that a command submitted into the live story is not free merely because its transcript
  is hidden. D204 may nevertheless use a controlled live `SCORE`/`DIAGNOSE` bootstrap when passive evidence
  is insufficient, because the operator explicitly accepts a consumed turn when the app clearly discloses
  the check. It must use section 4.10's probe transaction rather than masquerading as player intent. A
  disposable shadow-VM request remains the preferred no-turn form when exact cloning is available.
- D201: `StatusGridDecoder` owns status-grid translation; `LVL`/`STR` are ordinary synonyms; unknown
  game-authored numeric labels survive; status text never creates identity.
- `TurnRecorder` is the single accepted-submit transaction owner. `UndoRestoreSync` retains its explicit
  ordered lifecycle calls. D204 does not introduce an unordered event bus.
- Existing v3 header seeding, Wumpus handling, carry-property pins, Inform declarations, D198 valves,
  and text-only fallbacks remain parallel evidence lanes.

## 3. Evidence and reproduced causes

### 3.1 Woodpulp & Wyverns semantics

The published source of The Reliques of Tolti-Aph states that Inform's built-in `score` is deliberately
used as accumulated experience. The story separately stores `level` and `strength` on the player, prints
`LVL` and `STR` in the status line, checks level advancement every turn, and overrides the `SCORE` reply
to print current level, accumulated experience, and points remaining to the next threshold.

Its advancement thresholds are 50, 100, 250, and 600, and the source advances when score is greater
than the current threshold. Therefore an EXP display such as `52 / 100` is not a bounded gauge whose value
must never exceed its previous denominator. The denominator is a moving next-level target.

Primary evidence:

- https://i7-examples.github.io/The-Reliques-of-Tolti-Aph/source_5.html
- https://i7-examples.github.io/The-Reliques-of-Tolti-Aph/source.txt
- https://www.ifwiki.org/The_Reliques_of_Tolti-Aph

A Little Like Rogue is an Inform 7 story explicitly based on the same W&W system. The repository's live
D201 harness confirms its structural player, room, LVL, STR, score/EXP text, and automatic score
notification behavior without requiring a title branch.

### 3.2 Current implementation defects

1. **Compound number words are dropped.** `SCORE_DELTA` accepts only `[a-z]+` or digits and
   `NUMBER_WORDS` maps only one token. The real notification `twenty-eight points` cannot match.
2. **A threshold is treated as a hard maximum.** `applyScoreDeltaToDisplay` rejects a next value above
   `stat.max`. For EXP, crossing the old threshold is exactly what causes a level-up, so a valid gain can
   be discarded at the most important transition.
3. **Command association is indirect and timing-sensitive.** `recordPrintedMetrics` classifies score as
   experience only when a mutable `MapTopology.lastCommand` looks like `score`. Direct typing reaches
   `TurnRecorder`, but `StatTracker.Tick` later reads the map-oriented global. Equivalent `score`,
   `score `, injected, and typed submissions can therefore bind differently despite local trimming.
4. **Output capture is a whole-buffer character watermark.** `StatTracker.Tick` slices text only when the
   current buffer is longer than `_lastBufferLen`. Redraws, clears, restore, replacement with equal/shorter
   text, appended content in an existing BufferLine, and end-state output can all be missed or replayed.
5. **Stats run only from `WorldModel.apply`.** A terminal/death banner can arrive after the final useful
   world payload. No subsequent Tick means no death event. This also explains repeatable deaths failing
   even though the banner regex itself recognizes Inform and ZIL asterisk forms.
6. **Only one delta is parsed.** A turn containing multiple game-authored score notices cannot be fully
   represented by one non-global `exec` result.
7. **Observation and transaction clocks are conflated.** `_turn` counts tracker invocations, not accepted
   player turns. The existing fallback replay key reopens D175 whenever no game turn counter is available.
8. **Generic globals do not cover player properties.** Level and strength in W&W are player object
   properties. Status text can display them, but the existing generic pinning mechanism scans only globals;
   it cannot learn a headless property source for these or similar object-owned stats.
9. **The model conflates value shape and meaning.** `n/m` means a hard capacity for some fields, a moving
   target for EXP, and progress for others such as QUEST RATE. `unit: fraction` is insufficient to decide
   whether overflow is invalid.

## 4. Proposed architecture

### 4.1 Turn-scoped evidence ledger

Add a statistics analyzer to the existing `TurnRecorder` rather than polling map state:

```text
accepted submit
  -> submissionId + raw command + canonical command
  -> pre-turn status/grid + globals + player properties
  -> exact transcript BufferLine range for this submission
  -> post-turn status/grid + globals + player properties
  -> immutable StatTurnEvidence
  -> parsers and correlators
  -> reconciled StatModel
  -> HUD/events/persistence
```

The canonical command is derived once as `trim -> collapse whitespace -> lowercase`, retained beside the
raw command, and never substituted for the text sent to the VM. `score`, `score `, ` SCORE`, radial SCORE,
and voice SCORE therefore have one semantic identity without altering interpreter input. Canonicalization
is binding-only: `score.` does not become `score`, and no dictionary synonym is substituted unless that
exact accepted text independently has a proven command relationship.

`captureAfter` freezes the same boundary for transcript, status, globals, and object properties. A later
command boundary-stamps the earlier turn before its own VM work begins, preserving D86 ordering. A
terminal output observer may close an otherwise open transaction, but it must publish through this owner
and cannot create a second synthetic turn.

### 4.2 Exact output deltas

Replace `_lastBufferLen` as a statistics correctness source. Use BufferLine identity plus consumed length,
the already-proven append-aware shape in `ReadAloud`, but expose it through a small domain-neutral output
cursor or equivalent TurnRecorder capture helper. Requirements:

- capture new nodes and suffix growth in an existing node;
- ignore command-input nodes and hidden/system probe lines;
- survive buffer replacement, clear, redraw, restore, and window recreation;
- emit each text span once per story epoch;
- retain the owning submissionId when one exists, and an explicit unbound/terminal epoch otherwise;
- preserve ReadAloud behavior byte-for-byte if its cursor is shared or migrated. Prefer one domain-neutral
  BufferLine delta helper with independent subscriber cursors; StatTracker must never read or advance
  ReadAloud's consumed-length map. A byte-parity harness must prove that statistics subscription cannot
  suppress, repeat, split, or reorder speech.

This feed lets death/end output be observed even when no new `WorldModel.apply` payload follows it.

### 4.3 One normalized evidence record

Each candidate observation uses:

```text
key, originalLabel, value, optional secondary value,
valueShape, boundSemantics, source, submissionId, storyEpoch,
confidence state, source locator, contradiction count
```

`valueShape` is `plain`, `percent`, `fraction`, `ordinal`, `clock`, or `text-band`.
`boundSemantics` is independent: `none`, `hard-cap`, `next-target`, `progress-goal`, or `unknown`.

Only `hard-cap` may reject an impossible overflow. `next-target` explicitly permits crossing the old
threshold and waits for the level/status/SCORE evidence to replace it. `unknown` is displayed as the
story printed it but never used to clamp another source.

### 4.4 Evidence lanes and precedence

Preserve existing lanes and add missing generic correlations:

1. Standard-defined header facts, where the Z-machine standard fixes semantics.
2. `StatusGridDecoder` structured metrics, including unknown numeric labels.
3. Explicit story replies (`SCORE`, `DIAGNOSE`, inventory/status commands) tied to the exact normalized
   accepted submission, never a later global command variable.
4. Unprompted story output: absolute metrics, deltas, qualitative bands, level transitions, and events.
5. Correlated RAM globals through observed changes.
6. Correlated player-object individual properties through observed changes.
7. Existing inventory aggregate/property learners.
8. Honest absence when no lane reaches confirmation.

Text can establish semantics and a baseline; confirmed RAM provides prompt current values. A higher lane
does not permanently suppress a lower one: if the preferred source is temporarily unavailable, retain the
last value with explicit stale provenance or use a verified fallback as D174 requires.

### 4.5 Generic discovery of all statistics

Keep the existing canonical synonym table for presentation, not admission. Discover metrics from:

- numeric status columns and glued status tails;
- explicit label/value forms in command-bound replies;
- known reply families whose prose is qualitative rather than numeric;
- repeated absolute observations that correlate to a unique global or player property;
- standard-defined interpreter fields;
- existing inventory aggregate evidence;
- repeatable event transitions.

Known presentation families include score, EXP/XP/experience, turns/moves, rank, level/LVL,
health/HP/hit points, strength/STR, stamina/energy, hunger/food, thirst/water, sleep/rest, time/day,
money/cash/gold, carried weight/capacity/value, deaths, and wins. Unknown labels such as QUEST RATE remain
under their normalized game-authored label. Admission never depends on being in this list.

For every newly observed label, candidate global and player-property sources are intersected over real
changes. A unique source is promoted only after two independent sealed-turn transitions agree, or after
one sealed turn contains both an authoritative absolute status/reply value and the matching property move.
Coincident equal values alone never promote. Tied equal-value aliases may be retained as an equivalent
source set only when the same transition rule proves the set; disagreeing ties remain unresolved.
Contradiction demotes the binding without removing the story-authored visible metric.

### 4.6 Score and experience relationship

Do not rename every score as EXP. Learn the relationship only from module evidence:

- strongest: a command-bound SCORE reply explicitly calls its value experience;
- structural corroboration: the same turn supplies an EXP absolute, score delta/global movement, and
  matching value;
- existing first-event classifier remains a fallback but is evaluated from one immutable turn record.

Once learned, score notifications and a confirmed score global feed the `experience` metric. Preserve
source provenance and remove a duplicate Score row only after semantic equivalence is proven.

Replace the one-token number map with a bounded deterministic parser for digits and Inform-style English
cardinals, including hyphenated and spaced forms (`twenty-eight`, `one hundred and five`). Parse every
notification in the transaction. Reject malformed, negative-as-word, or unbounded prose rather than
guessing.

### 4.7 Level-transition reconciliation

Treat level and experience as related but independently sourced facts:

1. Apply absolute post-turn level/status evidence.
2. Apply the full set of score/EXP deltas.
3. Read confirmed RAM bindings.
4. Reconcile the EXP target using a command-bound SCORE reply or observed target text.
5. Emit one coherent UI transaction containing EXP change, level change, and updated target.

Crossing an old `next-target` never rejects EXP. If the new target has not yet been printed, show the new
EXP value without a denominator rather than retain a misleading old threshold. The next authoritative
target restores the progress bar. Never synthesize a universal level table from the two W&W stories.

### 4.8 Repeatable death and win events

Deaths and wins are event records, not terminal application states. Count each proven event once per
submission/story epoch and allow the same wording in later turns to count again.

Evidence classes:

- strong: Inform/ZIL end banner or end-state prompt classified as win, voluntary quit, or involuntary end;
- strong: game-authored death statement in a terminal transition;
- corroborated: confirmed life/health/strength source crosses into a story-proven dead range with matching
  death output or end-state transition;
- insufficient alone: the words `dead`, `death`, or `killed` in ordinary prose; a low health number; room
  reset; or a restart command.

Zork resurrection and roguelike restart/continue flows do not erase the event. The same rendered banner
is deduplicated by output-span identity and epoch, not banner text plus tracker Tick. Restore/resync must
not fabricate a death, and replayed transcript text must not recount one.

The existing broad asterisk-banner classifier remains a candidate lane, but its current non-win/non-quit
default-to-death behavior is not sufficient to increment `model.deaths`. Its input moves to the exact output
feed so it runs even without a final world payload, and a count requires a strong or corroborated class above.

### 4.9 Persistence and lifecycle

Persist module/build facts only, keyed by executable story identity rather than save-timeline identity:
canonical relationships, global/property bindings, equivalent source sets, confirmed field semantics, and
reusable parser formats. Existing `unit: fraction` records migrate with `boundSemantics: unknown`; a fraction
never implies `hard-cap`. Readings, pending turns, targets, badges, and output cursors are generation-local
and follow D178/D180-D183 restore ordering.

Death/win totals are product-owned **playthrough counters**, labelled `Deaths this playthrough` and `Wins
this playthrough`. They reset on module load, explicit New Game, or accepted RESTART; they survive undo and
restore within that playthrough, while output-span/epoch deduplication prevents replay from recounting.
Module switch cannot leak either total. `forgetReadings()` and `Resync()` must not zero these counters;
they only advance the output-capture generation so restored spans cannot recount. The counters are not
written into module/build learned-fact storage.

### 4.10 Passive monitor and last-resort bootstrap

Use a strict escalation ladder:

1. status-grid, transcript-delta, standard-header, and already-confirmed RAM/property evidence;
2. passive multi-turn correlation from ordinary player actions;
3. the existing explicit user-initiated Identify action;
4. a controlled, disclosed live probe at a deterministic statistics-surface demand gate;
5. a disposable shadow-VM probe when exact cloning exists and is preferable to spending a live turn.

The live probe is not an ordinary `Actionable.Submit("score")` hidden with CSS. ProbeBroker extends the
existing accepted-submit choke rather than creating a second one. It must wait for an idle visible LineInput
with no draft, dialog, character prompt, navigation queue, restore, Identify transaction
(`_probePending` or its `_diagnoseTimer`), carry probe (`_carryProbeSubmitting`/`clearCarryProbe`), or other
probe in flight. At the first automatic live probe of
each game start, and only then, it displays
an app-owned notice such as `ParchLock may check this story's statistics with module-owned commands; this
story may count a check as a turn.` The notice is not shown at startup when no probe is needed, and later
probes in the same game start/storyEpoch do not interrupt the player again. The TurnRecorder source is
`stat-probe`, and map, command-usage, attribute, semantic, exit, narration, and tutorial consumers must
ignore it as player intent while StatTracker and the real story turn/status model still receive its facts.
The story's state change is not rolled back or denied: if the command consumes a turn, the HUD turn count
must advance and the notice must remain truthful. Probe-owned command/reply lines may be visually collapsed
only after exact ownership is proven; they remain available in transcript/export diagnostics, and the app
must never remove neighboring story output or disrupt actionable underlines.

The demand gate is testable: after the initial line prompt and at least one accepted ordinary player turn
have settled, the player opens the statistics/equipment surface, no passive lane or learned binding can
supply the specific requested metric or semantic relationship (for example EXP itself or the proven
score-to-EXP relationship; an unrelated Score row is not sufficient), the exact probe verb is owned by the
module dictionary, the
automatic-check preference is enabled, and all safe-idle gates pass. Merely reaching a timer or turn count
never probes. The live lane is at most once per requested verb per story epoch unless the user explicitly
invokes Identify again, cancellable before submission, and disabled while a user draft exists. Failure,
parser rejection, timeout, or ambiguous content imports no semantic relationship and must not trigger
another automatic probe loop.

For D204, a **game start** is a module/interpreter load, explicit New Game, or accepted RESTART. Each creates
a new `storyEpoch`, resets the one-disclosure flag and automatic per-verb budgets, and may therefore disclose
again if a later demand gate needs a live probe. Restore and undo create resynchronization generations within
the same game start: they clear pending transactions/output cursors but neither re-notify nor replenish an
automatic probe budget. Manual Identify remains user-controlled.

One statistics/equipment-open gesture may schedule at most one automatic story command. The existing carry
bootstrap has priority when it is eligible; if it runs, ProbeBroker does not submit during or after that same
open gesture. A still-needed statistics probe may be reconsidered only on a later explicit surface-open
gesture. This prevents sequential INVENTORY plus SCORE/DIAGNOSE turns from one tap.

The shadow probe is not `Actionable.Submit("score")` with hidden CSS either. It requires a disposable interpreter
instance restored from the same story/save state, receives the validated module-owned command, captures its
reply and RAM delta, and is then destroyed. It must not write the live transcript, advance the live turn,
alter RNG state, trigger narration/audio, touch map/action learning, or persist a reading. Only a parsed
semantic fact or source-binding candidate may return to the live ledger, carrying `shadow-probe` provenance.

No module is assumed to make SCORE or DIAGNOSE out-of-world. If exact cloning cannot be proven, the shadow
lane is unavailable; the disclosed live lane may still run under its safety contract. Implementing the main
D204 ledger does not depend on implementing shadow cloning.

## 5. Implementation sequence

1. **Freeze current behavior.** Add nine red-on-HEAD defect fixtures: compound cardinals; EXP target crossing;
   TurnRecorder SCORE ownership despite a different map command; same-length output replacement; terminal
   output without `WorldModel.apply`; multiple deltas; replay across extra tracker Ticks; player-property
   correlation with a decoy; and the three `boundSemantics` behaviors. Add byte-parity tests for ReadAloud
   output collection, TurnRecorder boundaries, v3 seeding, carry pins, restore ordering, and D201 decoding.
2. **Build the transaction capture seam.** Add canonical command and exact transcript/status/RAM snapshots
   to a StatTracker TurnRecorder analyzer. Keep the existing Tick path in shadow mode and compare results.
3. **Introduce the evidence schema.** Separate value shape from bound semantics and migrate current records
   without changing rendered output.
4. **Repair EXP.** Add full cardinal parsing, multiple deltas, exact SCORE binding, score-to-EXP provenance,
   player-property correlation, and level/target reconciliation.
5. **Repair repeatable events.** Move death/win classification to the exact output feed and add terminal,
   resurrection, replay, restore, and repeated-wording controls.
6. **Generalize discovery.** Correlate unknown status/reply metrics against globals and player properties;
   retain unknown labels; add conflict/demotion tests.
7. **Implement ProbeBroker only after passive gates.** Prove safe-idle scheduling, `stat-probe` consumer
   isolation, one notice at the first automatic probe of each game start, single-flight/once-per-verb limits,
   transcript ownership, and real turn accounting. Then separately evaluate whether exact shadow cloning
   can avoid the live turn.
8. **Cut over by owner-local valve.** `off` preserves current code, `shadow` records diagnostics without UI
   changes, and `on` uses the ledger. No D88/D198 valve is reused for this unrelated ownership domain.
9. **Only after parity and live gates:** remove `_lastBufferLen` as a correctness dependency, refresh cache,
   distribution, and APK, then promote the already-registered canonical D204 plan/architecture sections and
   update user documentation.

## 6. Verification matrix

### Unit and contract gates

- `score`, `score `, mixed case, repeated spaces, typed, injected, radial, and voice all bind identically.
- digits, `two`, `twenty-eight`, `one hundred and five`, multiple notices, increases, and decreases.
- hard cap rejects overflow; next-target permits crossing; unknown bound never clamps.
- exact output once across append, replace, clear, redraw, same-length replacement, and restore.
- output after the last WorldModel payload still reaches event classification.
- a shadow bootstrap, if supported, leaves live RAM, RNG, turn count, transcript, map, narration, learned
  commands, and persistence byte-equivalent; refusal or timeout imports nothing.
- a live bootstrap runs only at a safe idle boundary; its first use in each game start produces exactly one
  disclosure, later probes produce no repeated notification, and a turn it consumes remains counted; its
  source cannot train map, action usage, attributes, exits, semantics, narration, or tutorial state.
- the demand gate cannot fire before a settled ordinary turn, without a statistics-surface request, when a
  passive/learned value exists, for a non-dictionary verb, or while Identify/carry/navigation/restore is busy.
- one surface-open gesture emits at most one automatic story command; an eligible carry bootstrap wins and
  defers any statistics probe until a later explicit open.
- module load/New Game/RESTART reset disclosure and automatic budgets; restore/undo reset capture generations
  without re-notifying or replenishing a spent automatic budget.
- tied RAM candidates fail closed or form a proven equal-value equivalent set.
- unique player-property correlation and later contradiction/demotion.
- restore/restart clears pending transactions before the first post-resync observation.

### Required live stories

- **A Little Like Rogue:** randomized starts; first EXP classification; hyphenated +28; manual SCORE with
  whitespace variants; crossing levels; updated target; repeated combat deaths; phone and desktop.
- **The Reliques of Tolti-Aph:** spell, monster, and heroic-deed EXP; level threshold; STR damage/healing;
  multiple distinct death endings; restart/restore; phone and desktop.
- **Zork I:** score/turns v3 path; score loss on death; repeated deaths with resurrection; no duplicate replay.
- **Deadline:** clock and no score.
- **Planetfall:** reject its non-turn clock behavior.
- **Anchorhead:** no invented status score; normal score notification behavior remains correct.
- **wump2ka:** score, percent health, carry value/weight, numbered exits unaffected.
- **Slavers:** health fraction plus unknown QUEST RATE.
- **Enchanter family:** qualitative hunger/thirst/sleep and DIAGNOSE behavior.
- **LDoDoom:** explicit no-scoring remains authoritative.
- **D201 controls:** RoTA, Bronze, Accuse, Wumpus, and unnamed-room/inventory/map behavior unchanged.
- **Isolation controls:** Wumpus percent health and carry value/weight retain their names and sources; D198
  valves, numbered exits, unnamed-room identity and action evidence remain byte-equivalent; StatusGridDecoder
  remains the sole status-grid translator.

### Catalog and regression gates

- Run every non-Glulx module through a no-command status census and classify every discovered label, value
  shape, and ambiguity; no title branch is permitted.
- Run scripted SCORE/DIAGNOSE only in an explicit audit harness, never in product startup.
- Existing StatTracker, D201, D198, D200, map, navigation, inventory, read-aloud, restore, and mobile layout
  suites remain green.
- Source, desktop distribution, Android assets, and APK hashes must agree after final packaging.

## 7. Rejected shortcuts

- No per-title LLR or RoTA thresholds, globals, object properties, or death phrases.
- No silent automatic SCORE command in the live VM. A disclosed, bounded ProbeBroker transaction and an
  optional disposable shadow-VM query are acceptable only under section 4.10's gates.
- No inference that every score is experience or every fraction is a hard maximum.
- No generic prose-number mining without a label, command-bound reply, or corroborated event.
- No polling-frequency increase; forty uncertain observations are not one correct transaction.
- No replacement of v3 ABI, Wumpus, carry, status, or D198 strategies with one universal decoder.
- No silent stale value presented as live RAM.

## 8. Adversarial questions for Grok

1. Does the transaction design cover typed and injected commands without double-opening a TurnRecorder turn?
2. Can final/death output be captured without coupling correctness to WorldModel or disturbing ReadAloud?
3. Is the `boundSemantics` model sufficient for EXP targets, health/capacity, and unknown progress gauges?
4. Are player-property correlations deterministic enough, or must promotion require a status-text change plus
   a second independent transition?
5. Can repeated Zork/W&W deaths be counted without broad death-word false positives and without restore replay?
6. Which persisted facts need executable/build identity rather than the current game identity key?
7. What tests would fail against each of the nine documented defects rather than merely pass after a fix?
8. Does any phase reproduce a capability already owned by StatusGridDecoder, TurnRecorder, D198, or the carry
   learner instead of composing it?
