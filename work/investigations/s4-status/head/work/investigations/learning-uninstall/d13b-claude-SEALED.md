# D13b -- learning-store size bounds (claude, SEALED, 2026-10-30)

Read-only. Index hits: D248 (D13 landed aae8445), D157 (StatTracker write
throttling, quota concern stated in js/StatTracker.js:1606-1617), D208/D215
(StatTracker, no size content). Sizes are computed from structure, not
measured (no long-walk localStorage dump was run).

## Per store

| Store | Key | Shape / growth driver | Existing bound | Est. max, large game (~250 rooms, ~600 objs) |
|---|---|---|---|---|
| LearnedWords | PL_LearnedWordOverrides_<id> (js/LearnedWords.js) | rows{type:objId:form}; one row per (object, form) the user/recorder touched; label<=160, trigger<=120, witnesses<=2 | per-field caps only, NO row cap | user-driven; realistic <50 rows ~15 KB; worst (recorder rows on every object x form) ~600x3x~350 B ~ 600 KB |
| AttrCalibrator | PL_AttrCalib_<id> (js/AttrCalibrator.js) | objects{objId}.allowedVerbs{verb}: per object x verb; verbs{flag}: per flag verb; locationGlobal.candidates{globalSlot}: transitions, history (cap 12), seen{roomId} | history<=12; candidates deleted when slot not a location; **seen{} per candidate unbounded up to #rooms** | objects ~600x~3 verbs x~80 B ~150 KB; loc.seen: confirmed slots only survive, ~2-4 slots x 250 rooms x ~8 B ~8 KB |
| SemanticActions | PL_SemanticActions_<id-cksum-adapter-locale> | entries[] = confirmed evidence only | confirmed filter; today nothing is confirmed, persists `entries:[]` | ~100 B now; future: append-only array, no dedup/cap |
| ExitCalibrator | PM_ExitCalib_<id> | dirs{dir} (<=12), cand{dir}.rooms[], blocked{room|dir} counter | dirs fixed; cand rooms capped by CONFIRM_ROOMS logic?; blocked per room x dir | blocked 250x12x~12 B ~36 KB worst; dirs/cand ~2 KB |
| ZRamReader diagonal | PL_DiagonalCalib_<id> | {swapped:bool} | constant | ~20 B |
| StatTracker | PM_Stats_<id> | model: globals/carry pins, seenBanners{}, evidence[] (cap 160) | evidence capped 160 (js/StatTracker.js:1557) | evidence 160x~250 B ~40 KB; seenBanners unbounded per distinct banner text |
| DirectionalRadial | PL_DirRadial_<filename> | customSlices[] user-added; label<=20, cmd<=200 | per-field only, no count cap | user-driven, ~250 B/slice; negligible |
| Index | PL_ModuleLearningOwner_v1 (js/LearningStores.js) | entries{key}: owners[] (MAX_OWNERS 16 + ownersOverflow), eraseEpoch stub; tombstones{} | owners<=16 | per module ~7 keys x (~150 B + 16 owners x ~200 B) |

## Unbounded paths
1. **Index eraseEpoch stubs never removed** (eraseEntry, LearningStores.js:150-153;
   "never lowered or removed"). One stub per key ever erased; tombstones are
   deleted on rewrite (l.207) but stubs persist forever. Growth = distinct keys
   ever erased (~7 per uninstalled module) x ~80 B. Slow (300 modules ~170 KB) but monotonic.
2. **Index owners per entry**: 16 owners x path+digest+inputs; ownersOverflow
   then makes the key permanently unerasable -- a size *and* erase leak.
3. **LearnedWords rows**: no row cap; rows for objects no longer in the pool are never pruned.
4. **AttrCalibrator objects/allowedVerbs and loc.candidates[g].seen**: grow with
   objects and rooms touched; structurally bounded by the story file but no explicit cap.
5. **StatTracker seenBanners** and **ExitCalibrator.blocked** counters: keyed by
   text / room|dir; bounded by the game but never compacted.
6. **SemanticActions entries[]**: append-only, no dedup -- latent (empty today).
7. Undo stacks (LearnedWords._undo<=100) are memory-only, not stored.

Conclusion: every per-module store is structurally bounded by the story's
objects/rooms/verbs, realistic total per large module ~50-250 KB, worst
~1 MB (LearnedWords). Only the index is truly unbounded across modules.

## Proposed minimal caps (never drop data the game still needs)
- Index: drop an eraseEpoch stub once no queued snapshot / hydrated store can
  reference it -- e.g. compact stubs whose eraseEpoch < min hydrated revision of
  any live tab, or simply on app start (no other tab) after the erase revision
  is finalized. Replace ownersOverflow-permanent with: owner set keyed by
  digest only (paths of same digest merged), cap 16 LRU by last write.
- LearnedWords: hard cap rows (e.g. 2000) ; on overflow evict classificationOnly/
  ignored rows first, never manual rows. Structural: one row per (type,objId,form).
- AttrCalibrator: loc.candidates[g].seen -> once confirmedSlot set, drop
  non-confirmed candidates and replace seen{} with a count; allowedVerbs
  already one slot per object x verb (keep).
- ExitCalibrator.blocked: saturate counter at threshold (store bool once blocked confirmed).
- StatTracker.seenBanners: cap/LRU (e.g. 64 distinct); evidence already 160.
- SemanticActions: dedup by (intent, formId, objectIds) before persist; cap e.g. 500.
- DirectionalRadial: cap slices (UI can't place more than ~8 per ring anyway), e.g. 64.
- Size estimate in Options already shows UTF-16 bytes; add a soft budget (e.g.
  warn when learning total > 1 MB).

## Quota-failure handling today
- Only ModuleLibrary.js:322 recognises QuotaExceededError (module import).
- LearningStores.commit: index write throws -> snapshot stays queued, lastError
  reported once; value write failure likewise stays dirty. No eviction/retry-with-compaction.
- Every store's persist wraps in try{}catch(e){} and silently drops the write
  (AttrCalibrator, ExitCalibrator, StatTracker, ZRamReader, SemanticActions,
  DirectionalRadial). No store reports quota to the user.
- Proposal: on QuotaExceeded in LearningStores.commit, run the compaction above
  once and retry; surface "storage full" in Options > Learned words.
