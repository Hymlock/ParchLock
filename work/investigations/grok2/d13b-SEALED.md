# D13b SEALED — per-module learned-data growth (grok2 blind)

**Sealed before reading other seats' D13b notes.** Sources: `js/LearningStores.js` and every `LearningStores.register` call site; structural size model `work/investigations/grok2/_d13b-measure.cjs`. No live browser quota probe in this seal (structure + UTF-16 estimate only).

## Question

Operator keeps learned data after uninstall “as long as it’s not taking up a lot of space.” How large can each module’s stored learning grow over a long playthrough, which parts grow without bound, and what limits (if any) are needed?

## What counts as “learned data” (D13)

`LearningStores` owns **module-scoped calibration / override blobs** only. Registered kinds (one durable key each per identity, except semantic’s richer key):

| kind | key prefix | identity |
|------|------------|----------|
| attrCalib | `PL_AttrCalib_` | `ZRamReader.gameIdentityKey` (release-serial style) |
| exitCalib | `PM_ExitCalib_` | same |
| stats | `PM_Stats_` | same |
| learnedWords | `PL_LearnedWordOverrides_` | same |
| dirRadial | `PL_DirRadial_` | `ParchLock.GameFilename` |
| semanticActions | `PL_SemanticActions_` | release-serial-**checksum**-adapter-locale |
| diagonalCalib | `PL_DiagonalCalib_` | gameIdentityKey |

Shared index: `PL_ModuleLearningOwner_v1` (owners, tombstones, pending erase).  
`list().bytes` = Σ `(key.length + value.length) * 2` (UTF-16 estimate) over managed keys that still have a value.

**Explicitly not learned / not erased by D13 erase:** maps (`PL_Map_*`), saves (`PL_Save_*` / `PL_SaveState_*`), transcripts (`PL_Transcript_*`), prefs, playthrough ledgers (`PL_Playthroughs_*`), valves, tutorials. Those can dwarf learning on a long run; they are out of D13 erase scope by design (`LearningStores.js` header).

## Existing limits (code)

| Mechanism | Bound | What it does **not** do |
|-----------|-------|-------------------------|
| `MAX_OWNERS = 16` then `ownersOverflow` | owner list metadata | Does **not** cap value bytes; overflow **blocks erase forever** |
| ExitCalibrator `dirs[d].rooms` / `sizes` | slice 8 / 4 on confirm | `blocked` and mid-learn `cand` uncapped |
| StatTracker `evidence` | 160 entries | itemMetrics / stats / conditions uncapped by count |
| StatTracker `MAX_SAMPLES` | 8 | in-memory only, not storage shape |
| LearnedWords field lengths | label ≤160, trigger ≤120, witnesses ≤2 | **row count** uncapped |
| DirRadial normalize | label ≤20, command ≤200 | **customSlices array length** uncapped (`AddCustomSlice` only pushes) |
| SemanticActions persist | **confirmed-only** | today effectively empty; no entry-count cap if witnesses land |
| DiagonalCalib | `{swapped:bool}` | fixed tiny |
| D157 StatTracker save | skip if JSON unchanged | write rate, not size |
| `setItem` try/catch | silent fail on quota | no user-facing budget; no prune-on-quota |

**There is no per-module or global byte budget on learning values.** Browser `localStorage` quota (~5 MiB UTF-16 per origin, implementation-dependent) is the only hard ceiling; one fat key can crowd out maps/prefs for the whole app.

## What grows without bound (or soft-unbounded with play)

### 1. AttrCalibrator `table.objects` — **dominant learning growth**

- New object id on successful take, allowedVerb, or exactForm (`record` / `_recordAllowedVerb` / `recordExactForm`).
- **No prune, no max object count.**
- Per-object payload can include `takeable`, `allowedVerbs{}`, `exactForms{}` (forms keyed by full command string).
- Modeled dense long-play (many verbs/forms per id): ~0.7 KB JSON/object → **~268 KB UTF-16 for 200 objects**, **~1.0 MiB UTF-16 for 800** (Inform-scale).
- `table.verbs` (flag bit learning) stays small (few flags). `verbBehavior` small.

### 2. ExitCalibrator `blocked`

- Key `roomId|dir` incremented on failed travel; cleared only when that exit later succeeds.
- **No max keys.** Grows with dead-end exploration (× ~12 dirs).
- Modeled 500 rooms × 12 dirs blocked map alone ~177 KB UTF-16 (with full cand scaffolding in the same blob in the model).
- Confirmed `dirs` stays O(directions) (~12). `cand` cleared per dir on confirm but can be large while learning.

### 3. StatTracker `itemMetrics` (and open-ended `stats` / `conditions` / `seenBanners`)

- Carry/value learning records **per object id**; no object-count cap.
- `evidence` capped at 160 (~tens of KB).
- Pins in `globals` / `carry` stay small; readings are stripped on load (D178) but **structure** remains.
- Modeled 500 items with value+weight pins + full evidence ring ~252 KB UTF-16.

### 4. DirectionalRadial `customSlices[]` — **user-driven, no count cap**

- Each add persists the whole array; normalize bounds strings only.
- 100 max-sized slices ~56 KB UTF-16; **1000 ~562 KB UTF-16**.

### 5. LearnedWords `rows`

- User/editor driven; field lengths capped, **number of rows not**.
- 200 max-field rows ~117 KB UTF-16.

### 6. SemanticActions sidecar

- Persist filters `confirmed:true` only; current codebase comment: nothing confirmed yet → empty `entries` (~0 growth **today**).
- If structural witnesses arrive later, **entries[] has no cap** in persist.

### 7. Index `PL_ModuleLearningOwner_v1`

- One entry per learning key ever written; erase leaves epoch stubs.
- Grows with modules × kinds; owners ≤16 then overflow flag.
- Modeled 50 modules × 7 kinds × 2 owners ~236 KB UTF-16 for the index alone.

## Modeled totals (UTF-16, LearningStores-managed only)

| Scenario | Approx UTF-16 |
|----------|----------------|
| Long single-module play (200 objs dense attr, 100 blocked rooms, 80 item metrics, 50 LW rows, 20 custom slices, empty semantic, diagonal) | **~460 KB** |
| Extreme single module (800 objs, 500 blocked, 500 items, 200 LW, 1000 custom slices, 200 semantic confirms) | **~2.2 MiB** |
| 50 modules × “long” if all dense | would exceed typical 5 MiB origin quota (learning alone) |

Realistic average module after ordinary play is far below the dense AttrCalibrator model (most object ids never get exactForms/allowedVerbs). **Risk is the fat tail:** one heavily calibrated large Inform title + many custom radial slices + fat `blocked` map, times many installed titles’ retained learning after uninstall.

## Uninstall retention vs space

- D13 erase removes learning only when **every owner is uninstalled** and digests don’t collide with installed set; current story protected.
- `ownersOverflow` or unknown digests → **never erasable** even if “uninstalled.”
- Keeping learning after uninstall is therefore safe on space **only if** per-key values stay small; code does not enforce that.

## Limits needed? (findings only — not a design commit)

**Needed if operator wants “keep after uninstall unless large” to be enforceable:**

1. **Hard cap or LRU/prune on `AttrCalibrator.table.objects`** (largest automatic grower). Prefer dropping unconfirmed / low-confirmation exactForms first; never drop confirmed flag-level `verbs`.
2. **Cap `ExitCalibrator.blocked` keys** (e.g. max N room|dir or prune oldest / successful-travel only retention).
3. **Cap `DirectionalRadial` customSlices length** (user-visible limit in add UI).
4. **Cap `LearnedWords.rows` count**.
5. **Optional module budget** (e.g. refuse persist or prune when `key+value` UTF-16 > K, or when `list().bytes` > global soft cap); surface in Options erase row (already shows KB estimate).
6. **SemanticActions:** add entry cap before confirmed witnesses ship.
7. **Do not** fold maps/transcripts/saves into the same budget without operator product intent — they are separate and already dominate long playthroughs; D13 erase correctly leaves them.

**Not required for correctness of learning:** diagonalCalib; StatTracker evidence ring; Exit confirmed dirs; empty semantic today.

## Bottom line

- Per-module **learning** is usually **tens to low hundreds of KB UTF-16** after a serious playthrough if AttrCalibrator stays sparse.
- **Without bounds**, automatic growth is led by **AttrCalibrator per-object records**, then **exit blocked maps**, then **stats itemMetrics**; user growth by **custom radial slices** and **learned-word rows**.
- Extreme single-module learning can approach **~2 MiB UTF-16**; multi-module retention without erase can stress the **shared ~5 MiB** origin quota — especially alongside maps/saves/transcripts.
- **No value-size limit exists today**; only ownership/erase policy and silent quota failure. Limits above are what would make “keep unless large” real.

## Evidence paths

- `js/LearningStores.js` (register/persist/list/erase, `MAX_OWNERS`, bytes estimate)
- Register sites: AttrCalibrator, ExitCalibrator, StatTracker, LearnedWords, DirectionalRadial, SemanticActions, ZRamReader diagonal
- Size model: `work/investigations/grok2/_d13b-measure.cjs`
