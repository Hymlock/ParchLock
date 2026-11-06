# SEALED — claude blind findings: radial/underline cumulative slowdown (2026-10-18)

Not to be shared with grok2 until its blind findings are on the bus.

Evidence: phone (Build 72, Identity identity.z5.js), CDP CPU profile 120 s while operator used underlines/wheel.
51 long tasks = 31.9 s, worst 7.9 s. Typed commands mostly unaffected.

Hot path (inclusive): Actionable.Submit -> TurnRecorder.onAcceptedSubmit -> AttrCalibrator._splitAnyVerbNoun
-> Actionable.referenceFor -> Actionable.payloadPool -> displayNameFor / observedPhraseFor.
Self time: observedPhraseFor 11.4 s, ZRamReader.parseDictionary 6.9 s, displayKey 2.9 s,
AttributeSchema.applyTo 2.9 s, parserWords 2.2 s.

HEAD check:
- Actionable.payloadPool (js/Actionable.js:1488) caches only via transient _resolutionPool; referenceFor(obj) without a
  supplied pool rebuilds the whole pool (DOM mark scan + prose) per object -> O(objects^2) per submit, grows with play.
- AttrCalibrator._splitAnyVerbNoun (js/AttrCalibrator.js:762) filters the pool calling referenceFor per object with no pool passed.
- ZRamReader.parseDictionary (js/ZRamReader.js:1506) uncached; callers ZRamReader 1365/1445/1559/2838, GrammarProvider 414,
  Autocomplete 21, StatTracker 4171. Dictionary is static memory (spec) -> safe to memoize per story.

Proposed direction: (1) memoize parseDictionary per loaded story; (2) payloadPool cached per turn
(invalidate on new WorldModel.lastPayload / transcript change); (3) _splitAnyVerbNoun passes one pool to referenceFor.
Behaviour-neutral; prove with 309x2 gate 0 diff + operator-regressions + phone re-profile.
