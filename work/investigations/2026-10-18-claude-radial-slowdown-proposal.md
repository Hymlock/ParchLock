# Radial/underline slowdown: compare + proposal (claude, 2026-10-18)

Inputs: claude sealed findings `2026-10-18-claude-radial-slowdown-SEALED.md` (phone CPU profile, Build 72, Identity)
and grok2 blind findings `2026-10-18-grok2-radial-slowdown-blind.md` (desktop Chromium 6x, current checkout).

## Compare
Agree (both, independently):
- `Actionable.payloadPool()` is rebuilt per object inside loops that do not share the one-resolution snapshot
  `_resolutionPool` -> O(objects^2) per action; each rebuild runs displayNameFor/observedPhraseFor over all objects + prose.
- `ZRamReader.parseDictionary` re-decodes the whole dictionary repeatedly (grok2: 114 passes in one collect; claude: 6.9 s self on phone).

Claude-only (phone trace): the post-submit learning path
`Submit -> TurnRecorder.onAcceptedSubmit -> AttrCalibrator._splitAnyVerbNoun -> referenceFor(obj) (no pool) -> payloadPool`
was the 8 s main-thread freeze. `_splitAnyVerbNoun` is called from AttrCalibrator 366, 542 and LearnedWords 154 per submit.

grok2-only: open path `GetRadialCommands -> ActionSynth.collectFromPayload -> commandsForObject -> payloadPool().find` per object
(wheel ~1 s @6x LostPig); `Actionable.Open` already scopes `_resolutionPool`, so its addMoreActions->GetRadialCommands is covered.

Gap: neither reproduced 8-10 s on desktop; phone trace is the real reproduction. Both point at the same two mechanisms.

## Proposal (behaviour-neutral, no masking, no caps)
P1. Extend the EXISTING one-synchronous-resolution pool discipline (resolveObjectCommands / Open, Actionable.js:941-949, 2669-2675)
    to the three remaining hot loops. Same rule as today: snapshot lives only for one synchronous call, restored in finally,
    never retained across input/refresh/restore/tap.
    - `AttrCalibrator._splitAnyVerbNoun` (js/AttrCalibrator.js:762): wrap body.
    - `ActionSynth.collectFromPayload` (js/ActionSynth.js:341): wrap body.
    - `ParchLockQol.GetRadialCommands` (js/Qol.js:624): wrap body.
    Implemented via one helper `Actionable.withResolutionPool(fn)` (the two existing copies are left as is: smallest diff).
    Why neutral: these bodies are synchronous read-only matchers; inputs of payloadPool (lastPayload, LiveMarks, Scope texts,
    RoomLines, RAM) cannot change inside them, so every inner payloadPool() call already returns an equal array.
P2. Memoize `ZRamReader.parseDictionary` in a WeakMap keyed by `mem.buffer||mem` + `gameIdentityKey`, ONLY when the
    dictionary lies in static memory (`h.dict >= h.staticMem`), so a game writing its dictionary is never served stale.
    Same idiom as `_objectCountCache` (ZRamReader.js:27). All 7 callers are read-only on the result (checked).

Out of scope (deliberately, streamlined): grok2 H2 redesign of addMoreActions, H4 ring paging, H3 Loop cadence.
Re-measure after P1+P2; only revisit if still slow.

## Validation
- `node harness/operator-regressions.js` 0 FAIL; ZIL/Inform/Glulx regression gate (309x2) 0 real diff vs HEAD baseline.
- `node harness/radial-latency.js 120` before/after (underline open+submit and wheel medians); grok2 re-runs its LostPig wheel probe.
Prior D-entries touched: D86 (Input.Inject choke point - unchanged), resolution-pool rule at Actionable 941/2669, D147 dictionary words.

## Amendment R1 (answers grok2 #REVISE, work/investigations/2026-10-18-grok2-radial-slowdown-adversarial-r1.md)
A (blocking) ACCEPTED. Also found LearnedWords.js:54 (payloadPool().filter + referenceFor per object) reached from prepare.
Scope added, in js/TurnRecorder.js onAcceptedSubmit, two read-only regions only:
  - the `LearnedWords.observeSubmit(event)` call (TurnRecorder.js:104)
  - the `TurnRecorder._analyzers.forEach(... a.prepare(turn) ...)` loop (covers verbSuccess 366/388 -> _d198ScopedCorrelation 133-147,
    verbBehavior 542, LearnedWords.candidateForCommand)
  Not wrapped: MapTopology.noteCommand / UndoRestoreSync / Navigator / _submitListeners (unknown listeners may mutate state;
  keeping them outside the snapshot is the conservative reading of the existing "never retain across input" rule).
  _splitAnyVerbNoun keeps its own scope (it is also called standalone).
B ACCEPTED: GetRadialCommands wrapped (wheel-only path).
C DECLINED as redundant: inside the scope payloadPool() returns the snapshot, so referenceFor(o) already uses it; no signature change.
D/E ACCEPTED: cached result frozen (top object, words, entries); key = (mem.buffer||mem) WeakMap + gameIdentityKey, mismatch = miss
  (covers story replace); cache only when h.staticMem is a number > 0 and h.dict >= h.staticMem, else fail closed (no cache).
  hasDictionaryWord already calls parseDictionary -> reuses P2 automatically.
Validation adds the phone Identity underline-submit re-profile (when the operator's phone is next connected; APK is operator-built).

## Result (2026-10-18)
- grok2 ACCEPT proposal (R1 amended), ACCEPT implementation audit R1, ACCEPT R2 (lazy scope).
- operator-regressions: 13 PASS / 0 FAIL. radial-latency Identity @4x: underline peaks 600-750 -> ~250-300 ms; final lazy run median 83-93, max 274.
  grok2 LostPig wheel: GetRadialCommands ~970 ms @6x -> ~10 ms (1x).
- Gate 309x2 (GLULX=1, 4 shards): base vs base2 alone = 8 diffs (flaky marks: Inevita, Jigsaw, Mulldoon, Mullmurd, gamlet, medusa; cycles rooms/inv2).
  Candidate-only: Sherlock 'coat' mark. Classified harness race, not a regression: 'coat' is printed only in the boot intro
  (LOOK text never names it); the first marking Refresh lands ~2.25 s after load while the gate injects LOOK ~2.0-2.4 s;
  if LOOK wins, the intro is no longer the latest reply and is never marked. Pool/inventory/referenceFor identical in failing
  conditions; disappears under any instrumentation (22/22 instrumented runs pass). Not player-visible.
