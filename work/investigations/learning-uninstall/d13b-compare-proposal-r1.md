# D13b compare + proposal R1 (claude, 2026-10-30)
Halves: claude d13b-claude-SEALED.md; grok2 grok2/d13b-SEALED.md (blind). Both are structural estimates; no live quota
probe yet.
## Agree
- There is no byte budget on any learning value. The only hard ceiling is the ~5 MB origin localStorage quota, shared
  with maps, saves and prefs. setItem failures are swallowed silently.
- Uncapped growth paths: AttrCalibrator objects (grok2: dominant, ~268 KB at 200 objects, ~1 MB at 800); LearnedWords
  row count; ExitCalibrator blocked room|dir; DirectionalRadial customSlices count; StatTracker itemMetrics/seenBanners
  (evidence already capped at 160). SemanticActions is empty today (confirmed-only) and needs a cap before witnesses land.
  Diagonal is tiny.
- In the D13 index: MAX_OWNERS 16, and overflow blocks erase forever. Claude adds that eraseEpoch stubs are never
  compacted.
## Disagreement (minor)
- Which store dominates: claude said LearnedWords and grok2 said AttrCalibrator. grok2's object model is more concrete.
  Resolve with a measurement on the largest release title before choosing cap numbers.
## Proposal P13b
1. Measure first: a long walkthrough on the 2-3 largest release titles, recording each learning key's size. The caps
   below are tuned from that measurement, not guessed.
2. Structural compaction, which drops no information still in use:
   - AttrCalibrator: after a flag is confirmed, drop the losing location-global candidates and replace seen{} with a
     count. Per-object exactForms keep only forms that succeeded.
   - ExitCalibrator: blocked becomes a boolean once confirmed, and an entry is cleared when its room|dir succeeds
     (already done).
   - StatTracker: seenBanners keeps the latest 64.
   - SemanticActions: dedupe by intent/form/object ids.
3. Count caps that only drop the least useful data:
   - LearnedWords: about 2000 rows; manual rows are never evicted, ignored/classification-only rows go first.
   - DirectionalRadial: 64 custom slices; refuse to add more, with a message.
   - AttrCalibrator: LRU objects beyond N, with N set from the measurement.
4. Index:
   - Remove eraseEpoch stubs once the erase is finalized and every live store has hydrated past it (track a minimum
     hydrated epoch per key via the existing lock).
   - Replace the permanent ownersOverflow flag with owners grouped by digest, keeping the 16 most recent. Erase stays
     conservative (unknown) only while an evicted owner's digest might still be installed: check all installed digests
     against the full digest set, and keep the digest list itself uncapped since digests are only 64 hex characters.
5. Quota: on QuotaExceededError in LearningStores.commit, compact once and retry once. On a second failure, show
   "Storage is full; learned data was not saved" in Options > Learned words and in the existing reportOnce.
6. UI: a soft note in Learned words when a module's learning passes about 1 MB, or the total about 3 MB.
Validation: harness cases for each cap/compaction (no loss of manual rows/confirmed facts), quota-failure simulation,
before/after sizes on the measured titles, operator 13/0, gate.

## R2 (adopting grok2 p13b-r1-attack.md; all of A1-A9)
1. Measure: one deep ZIL title, one large Inform title and one large Glulx release title, each a long walk. Dump the
   real localStorage learning keys with a per-key byte table. All caps are set from this measurement (percentiles).
2. AttrCalibrator, compaction only (no object LRU in R2), per field:
   - losing flag-bit candidates are dropped once mutatedBit is set;
   - non-confirmed locationGlobal slots are dropped once confirmedSlots is stable;
   - the seen{} map of a confirmed slot becomes a count, and it is never touched while that slot is still confirming;
   - exactForms keep every form with confirmations > 0 (behavioralAccept included).
   Object LRU is DEFERRED until the measurement plus all A2 guards: never in scope, payload, inventory or the inventory
   root; unconfirmed objects only; opcodeConfirmed objects pinned.
3. ExitCalibrator:
   - blocked gets a key-count policy: keep blocked keys only for rooms present in the current map/visited set, with a
     max-keys LRU from the measurement;
   - cand dirs whose dir is already confirmed are dropped.
   The bool change is optional and is not claimed as the fix.
4. StatTracker:
   - itemMetrics persists only entries with prop != null (learned pins);
   - seenBanners keeps the latest 64.
5. LearnedWords: the cap number is set from the measurement. Eviction order: classificationOnly first, then the oldest
   recorder exact/allowed rows with no user edit and not ignored. Never evicted: manual:* rows, user-edited rows, and
   ignored rows (an ignored row is an intentional suppress).
6. DirectionalRadial: refuse a 65th custom slice with a message. SemanticActions: dedupe now, with an entry cap before
   witnesses land.
7. Index:
   - a durable digests set per entry, updated on every owner add and never trimmed, is the erase authority (checked
     against all installed digests);
   - owners metadata may keep the 16 most recent;
   - migration: existing ownersOverflow entries stay unerasable until their digests set is rebuilt from known owners;
     the flag is never cleared without digests;
   - path-only owners stay fail-closed;
   - stub GC is deferred (stubs are tiny; the race risk is not worth it).
8. Quota: on QuotaExceededError in LearningStores.commit, call per-kind registered compact(value) hooks (kinds without a
   hook are skipped; learning keys only; never maps/saves/transcripts/prefs; no LRU under quota), then retry once. On a
   second failure, show "Storage is full; learned data was not saved" and stop requeueing that snapshot until the next
   real mutation.
9. UI: a soft note labelled "learned data", based on list().bytes, at about 1 MB per module or 3 MB in total; retuned
   after the measurement.
Validation: harness cases for every cap and compaction, including user-edited exact, ignored suppress,
opcodeConfirmed allowedVerb, an in-scope object never removed, overflow migration and quota hooks. Also a
before/after size table on the measured titles, operator 13/0, and a 309 gate (expected 0 walk-visible change).
