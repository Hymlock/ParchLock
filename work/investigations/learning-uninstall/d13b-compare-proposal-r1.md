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
