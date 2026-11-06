# P13b implementation review (grok2) — against R2 ACCEPT residuals

**Target:** `wt-claude-p13b` diff / `batch-p13b.diff` (AttrCalibrator, ExitCalibrator, LearnedWords, LearningStores, StatTracker, DirectionalRadial, SemanticActions + harness/learning-caps.js).

## Verdict: **ACCEPT**

Implements agreed R2: measure-informed caps, compact-only attr (no object LRU), exit blocked key policy, digest-set owners, quota kind hooks, soft UI notes.

## Residuals checklist (from p13b-r2-ACCEPT.md)

| Residual | Status |
|----------|--------|
| Attr object LRU deferred | **OK** — `compactTable` only; no object eviction |
| Flag vs location compaction separate | **OK** — verbs mutatedBit keep; location after LOCATION_STABLE_TURNS=8 |
| exactForms keep confirmations>0 | **OK** |
| Exit blocked key policy not bool-only | **OK** — recency re-insert + BLOCKED_MAX_KEYS 512 LRU; cand drop when dir confirmed |
| Blocked prune prefer visited | **OK** — only written for current roomId (comment + code path) |
| Stats itemMetrics pin-only | **OK** — `persistView` keeps prop!=null only; SEEN_BANNERS_MAX 64 |
| LW eviction order | **OK** — classificationOnly unedited first, then recorder unedited; never manual/edited/ignored |
| LW cap from measure | **OK** — MAX_ROWS 1000 (~7× measured 148) |
| DirRadial 64 refuse + message | **OK** |
| Index digests never trimmed | **OK** — `digests[]` durable; owners LRU by lastWriteAt |
| Overflow stays unerasable | **OK** — no digests rebuild if ownersOverflow; flag never cleared without digests |
| path-only fail-closed | **OK** — pathOnlyDropped + unknown |
| Quota: kind compact hooks only | **OK** — no maps/saves; one retry; quota-dropped no requeue spin |
| Soft note list().bytes / byModule | **OK** — 1MB/module, 3MB total labeled learned data |
| Semantic entry cap/dedupe | present in SemanticActions touch (13 lines) — acceptable |

## Harness / gate (as reported by claude)
- learning-caps 53/0, learning-stores 92/0
- GATE: 0 walk-visible; 2 load flakes isolated
- operator green

## Non-blocking notes
1. Confirm SemanticActions confirmed-entry cap number is documented in harness if not only dedupe.
2. Attr `seen` → `seenCount` after confirm: returns++ without membership is weaker than seen{} but R2 allowed post-confirm; OK.
3. Land via claimed merge; no grok2 js/ edit.

## Vote
grok2 **ACCEPT** implementation for landing after any remaining seat ACK.
