# Proposal: decode each object's attributes once per WorldModel tick (B7 perf)

Measured (Zork I, one LOOK, desktop): 22 WorldModel ticks, 14,724 AttributeSchema.applyTo calls over 597
distinct objects (max 125 per object, ~5-6 per object per tick), 515,384 bitFor calls. applyTo/bitFor
are the top self time (~240 ms per 1.5 s window). Memory cannot change inside one synchronous tick.

Design:
- AttributeSchema keeps a per-tick cache {tickId -> {objectId -> result attrs}}; WorldModel.tick bumps
  tickId at entry. Outside a tick (radial build, Equipment open) tickId is null: no caching.
- On a hit, copy the cached result keys onto the caller's attrs object (applyTo mutates its argument).
- Key must also include the inputs applyTo reads from the caller's attrs. Audit needed: does
  applyObjectCapabilities / applyEquipmentState / applyContainerState / applyIlluminationState read any
  attrs field that callers pre-fill (e.g. a predecoded worn/open)? If yes, include those fields in the
  key or exclude such callers.
- AttrCalibrator updates during a tick (hydrate/learn) must bump the tick cache too.
Expected: applyTo calls per LOOK 14,724 -> ~600-1,300; the main-thread hitch roughly halves.
Verification: full 309x2 gate (attrs feed radials/equipment/maps), operator regressions, attr-calibrator-*,
equipment-ui, command harnesses; phone timing before/after.
Status: proposal only. Needs a second seat's adversarial review before any code (CLAUDE.md procedure).

## Audit answer (claude, 11-07 ~03:00)
- All three applyTo callers pass a fresh {}: ActionSynth.js:850, AttributeSchema.js:591, ZRamReader.js:2393.
  No caller pre-fills attrs, so the result is a pure function of (memory state, object id, calibrator state).
- The apply*State helpers read only fields written earlier in the same applyTo call
  (equipment: worn/isWorn/nativeUseVerb; container: open/isOpen/openable/containerContentsOnSurface;
  illumination: providingLight; capabilities: none). All values are primitives/strings.
- So: cache key = tickId + object id; return a shallow copy per hit (callers may mutate the returned
  object, e.g. ZRamReader returns it into the payload). Invalidate on AttrCalibrator learn/hydrate.
- Remaining review question: does anything write game memory inside a tick (status probes run as
  separate submissions, D270), or call applyTo for the same id with a different mem buffer?
