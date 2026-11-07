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

## Revision r2 (claude, 11-07 morning) answering grok REJECT #6180
1. Key. entryKey = objectId + "|" + attrBytes signature (the raw obj.attrBytes the caller passed, joined) ;
   cache container keyed by the effective memory view: WeakMap(buffer) -> Map("byteOffset:byteLength:" +
   ZRamReader.gameIdentityKey(mem) + ":" + calibRevision) -> Map(entryKey -> result). The raw bytes are part
   of the key, so a stale or synthetic snapshot can never reuse another snapshot's result (grok's
   [0,0,0,0] vs [0,2,0,0] counterexample becomes two entries). mem missing -> resolve _getMem() first and
   key on what it returns.
2. Lifecycle. AttributeSchema.tickBegin()/tickEnd() with a depth counter; WorldModel.tick and
   StatTracker.Tick wrap their bodies in try { tickBegin() } finally { tickEnd() }. The cache exists only
   while depth > 0 and is dropped when depth returns to 0 (also on throw). Nested ticks share the outer
   cache. Outside any tick (radials, Equipment, harness calls) applyTo is uncached, as today.
3. Calibration. AttrCalibrator gains a revision counter bumped by every state mutation: hydrate when it
   loads a different identity or table, record, recordExactForm, recordRememberedForm, reset/clear paths,
   and any override write. applyTo calls AttrCalibrator.hydrate(mem) BEFORE the lookup (preserves the side
   effect on hits) and reads the revision after it, so a first hydration inside a tick starts a new map.
4. Copies. Store Object.assign({}, result) and on a hit Object.assign(attrs, copy) into the caller's fresh
   {}; keys the helpers delete stay absent because the stored copy is taken after the helpers ran. Caller
   attrs objects are never stored.
Tests to add before landing (harness/b7-attr-tick-cache.js): two memory views / same id; two raw snapshots
/ same id; calibrator record mid-tick invalidates; nested tick; throw inside tick leaves no cache;
outside-tick call uncached; mutate a returned attrs then hit returns pristine values; container
absent-key parity. Plus full 309x2 gate, attr-calibrator-*, equipment-ui, command harnesses, operator.
