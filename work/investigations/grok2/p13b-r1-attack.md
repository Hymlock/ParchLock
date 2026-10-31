# P13b R1 attack (grok2) — D13b compare + proposal

Target: `work/investigations/learning-uninstall/d13b-compare-proposal-r1.md`  
Against: current `js/` (AttrCalibrator, ExitCalibrator, LearningStores, LearnedWords, StatTracker, DirectionalRadial).

## Verdict

**REVISE** (not ACCEPT). Compare section is fair. P13b direction is right (measure → compact → caps → quota UX) but several items are underspecified or can drop still-needed learning under pressure. Fix the attacks below, then re-propose R2.

## Compare — ACCEPT with one note

- Agree list matches both seals (no byte budget, silent quota, uncapped paths, overflow blocks erase, epoch stubs).
- Dominant-store disagreement correctly deferred to measurement.
- **Note:** “largest release titles” by file size are mostly huge Glulx (`CounterfeitMonkey`, `CragneManor`, …). Attr/exit learning density may be higher on long ZIL/Inform plays with many object interactions. Measure set must include **at least one deep ZIL + one large Inform + one large Glulx**, not only top-N gblorb bytes. Prefer dumping **real** `localStorage` keys after walks (or fixtures), not only structural models.

## Attacks on P13b

### A1 — AttrCalibrator compaction conflates two tables (clarify)

Proposal §2: “after a flag is confirmed, drop the losing location-global candidates…”

- Flag bits live in `table.verbs` (`mutatedBit`).
- Location learning lives in `table.locationGlobal.candidates[g].seen/history`.

These are independent. Compaction must be specified **per field**:

| Field | Safe after confirm? |
|-------|---------------------|
| `verbs[flag]` losing bit candidates | Yes once `mutatedBit` set |
| `locationGlobal.candidates` non-confirmed slots | Yes once `confirmedSlots` stable; already deletes non-location slots live |
| `locationGlobal.candidates[g].seen` | **Not** while still confirming that slot: `returns` needs prior membership (`if (c.seen[val]) c.returns++`). After slot confirmed, may replace `seen` with `{n: count}` or drop entirely on **non-confirmed** slots only |
| `objects[*].exactForms` “only forms that succeeded” | **Careful:** `recordExactForm` also accepts `behavioralAccept` (no opcode). Dropping those early kills in-progress D85-style learning. Keep forms with `confirmations > 0`; optional drop only `confirmations < ALLOWED_VERB_THRESHOLD` after idle — not “success-only” |

### A2 — Attr object LRU is the highest-risk item (REVISE hard)

§3 “LRU objects beyond N” can remove **still-correct** radial evidence (takeable, opcodeConfirmed allowedVerbs, exactForms) for objects the player has not touched recently but will meet again (keys, tools, early rooms).

Required guards before any object eviction:

1. **Never** evict solely to meet N if the object is in current inventory/scope/payload pool.
2. **Never** evict `inventoryRootId` or the object id equal to it.
3. Prefer evict **unconfirmed only** (`allowedVerbs` without `opcodeConfirmed` and `exactForms` below threshold and no `takeable:true`).
4. If still over N: LRU among confirmed is last resort; pin anything with `opcodeConfirmed: true` on any verb.
5. N comes from measurement **percentile of real object-key counts**, not from file size.

Until measurement + guards, **do not ship object LRU**. Compaction of `seen`/flag candidates is enough for R1 code.

### A3 — Exit `blocked` → boolean saves almost nothing

`isBlocked` already coerces truthiness; counters are ~1 number per key. The grower is **key cardinality** (`roomId|dir`), not int vs bool.

Need either:

- max keys / LRU on blocked entries, or
- drop blocked keys for rooms not present in the current map / never visited this generation,

not only bool saturation. Bool is fine as a micro-opt but must not be sold as the blocked fix.

### A4 — Exit / stats gaps in the cap list

Missing from §3 count caps:

- **`ExitCalibrator.blocked` key count** (see A3).
- **`ExitCalibrator.cand`**: after a dir is confirmed, `delete t.cand[dir]` exists; add periodic drop of cand dirs that already have `t.dirs[dir].confirmed`.
- **`StatTracker.itemMetrics`**: still uncapped; only `seenBanners` 64 is listed. Safer rule: persist only entries with `prop != null` (learned pin); drop pure candidate shells on save (readings already cleared on load).

### A5 — LearnedWords 2000 and “never manual” are incomplete

- 2000 is far above both seals’ realistic band (claude &lt;50; grok2 200 rows ~117 KB worst-field). **Cap number must wait for measure**; placeholder OK, not a commit number.
- Eviction policy: “never manual” is necessary but not sufficient. Also never evict:
  - `id` prefix `manual:`
  - rows the user edited (`trigger !== original` or non-default label) even if type is `exact`/`allowed`
  - rows with `ignored: true` that encode an explicit user suppress (ignores are intentional — evicting them **re-enables** unwanted radial forms)
- Evict first: `classificationOnly: true` only. Then oldest recorder `exact`/`allowed` with no user edit and not ignored.

### A6 — Index owner redesign underspecified (safety)

§4 replace `ownersOverflow` with digest-grouped 16 recent + **uncapped digest set**:

- **Must specify** a separate durable `digests: string[]` (or set) on the entry, updated on every owner add, **never trimmed**, used for erase intersection with installed digests.
- Migration: existing `ownersOverflow: true` entries must **rebuild digest set from all known owners before clearing the flag**, or stay unerasable until rebuilt — never clear overflow without digests.
- Path-only owners (`digest: null`) remain fail-closed for erase (already); do not pretend digest-LRU fixes unknown digests.
- Stub GC (“every live store hydrated past epoch”) needs a concrete multi-tab rule. Stubs are small (~80 B × keys ever erased). **Deprioritize stub GC** relative to value caps; wrong GC resurrects erase races (codex #5692 epoch rules).

### A7 — Quota compact-and-retry order

§5: on `QuotaExceededError`, compact once and retry.

- LearningStores must not invent compaction: call **per-kind registered `compact(value) -> value`** hooks; kinds without hooks skip.
- Compact **learning keys only** — never maps/saves/transcripts/prefs.
- If retry fails: surface message (good). Also **stop queue spin** that re-tries the same fat snapshot forever without user action (today dirty snapshots stay queued).
- Do not compact under quota by Attr LRU until A2 guards exist — quota path would become a silent correctness footgun.

### A8 — Soft UI thresholds

§6 1 MB / module and 3 MB total: OK as soft notes **if** labeled “learned data” and based on `list().bytes` (already learning-only). Do not imply maps/saves are included. After measure, retune; 1 MB/module is above expected dense attr (~268 KB @200 objs) so may never fire until pathological — fine for soft warn.

### A9 — Validation

- Harness per cap: required.
- “No loss of manual rows/confirmed facts”: add cases for **user-edited exact**, **ignored suppress**, **opcodeConfirmed allowedVerb**, **inventory-scoped object not LRU’d**.
- Gate 309: learning-only changes should be **0 walk INTENDED**; run gate, but do not treat Inform flaky as related.
- operator 13/0: yes.

## What to keep unchanged from R1

1. Measure first before freezing N / LW cap.  
2. Structural compaction that drops unused intermediate state (flag candidates, confirmed location losers).  
3. DirRadial hard refuse at 64 with message.  
4. Semantic dedupe + future entry cap.  
5. Quota user-visible failure (end silent swallow).  
6. Soft size note in Learned words.  
7. Digest-complete erase conservatism (intent).

## R2 must include

1. Measure plan: ZIL + Inform + Glulx; per-key byte table.  
2. Attr: compaction only in R2 code path; **object LRU deferred** or fully guarded (A2).  
3. Exit: blocked **key** policy, not only bool.  
4. Stats: itemMetrics pin-only persist.  
5. LW: eviction order fixed (A5); cap TBD from measure.  
6. Index: explicit digest-set field + overflow migration; stub GC optional/later.  
7. Quota: kind hooks + no map touch + no unguarded LRU under quota.

Until R2 addresses A2, A3, A5–A7, **do not implement P13b**.
