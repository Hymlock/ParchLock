# A5 Stage 8 deletion proposal (grok2) — no js/ edits

Evaluator seat. Freeze at stage 7 acceptance. Based on `SCOPE.md` §3 Stage 8 + current HEAD line reads.

## Preconditions
- Stage 7 held-out challenge: **ACCEPT** (8/8, label-only dreamhold wall/walls).
- Cutover defaults **ON** (`SemanticActions.CutoverFlag.isEnabled()`).

## Deletable / collapsible only after soak (with cutover ON)

| Block | File:line | Runs when cutover OFF? | Proof unreachable when ON | Risk if deleted early |
|-------|-----------|------------------------|---------------------------|------------------------|
| **resolveAskAboutTopics legacy body** | `Actionable.js:1066–1080` | Yes (after flag check fails) | When ON, `1060–1063` returns SemanticActions forms and never reaches 1066 | Low if parity harness fixture 4 stays green; ask-about UI only |
| **resolveExitCommand off-branch** | `Actionable.js:1051` → `commandForExitLabel` | Yes | When ON, `1047–1048` returns `SemanticActions.resolveExitCommand` | **Must keep `commandForExitLabel` itself** — still the implementation SA mirrors; only the *call site preference* is cutover |
| **Autocomplete collectFromPayload fallback** | `Autocomplete.js:242–243` | Yes (when `!synthCommands`) | When ON, `240` sets synthCommands from SA; fallback only if SA throws/null | Medium: need counter that SA never returns null on 309 gate before deleting fallback |
| **Qol collectFromPayload fallback** | `Qol.js:697–700` (same pattern as Autocomplete) | Yes | Same as Autocomplete | Same |
| **usageCounts / verbCounts ranking** | `Actionable.js:15–16, 902–904, 1090–1097` | Always written today | Not gated by cutover; dual path with `intentUsageCounts` (`930–933`) | High if deleted before intent ranking proven equal on radial fill |
| **first-token inspect split** | `Actionable.js` ~L13 area / inspect verb ranking (SCOPE) | Always | Not a pure OFF branch; ranking policy | Only after intent-based ranking matches user-visible order |

### Not “OFF-only” (do not list as stage-8 deletions)
- **Actionable legacy unions** (`_resolveObjectCommands` semantic.concat(legacy), EquipmentUI concat): run when ON by design — removing drops capabilities (“missing over wrong”).
- **examineOnly / possessedBy** pre-flag ActionSynth calls: outside cutover.
- **ActionSynth module** (wearForms, lightForms, inspect policy, etc.): SemanticActions calls into it.

## Must stay (one compatibility cycle minimum)

| Keep | Why |
|------|-----|
| **ActionSynth.js** entire capability synthesis | SA wrappers call it; D259/D260 wear/light live here |
| **SemanticActions.CutoverFlag** + `PL_SemanticActions_Cutover` rollback | Operator kill switch |
| **PM_AttrCalib_*** / LearningStores v2 readers | Unrelated; stage 8 must not touch |
| **commandForExitLabel** | Shared implementation under SA + OFF branch |
| **Legacy unions in Actionable + EquipmentUI** | Capability completeness when ON |
| **intentUsageCounts** path | Future sole ranking once proven |

## Recommended stage-8 sequence (implementation by Claude)

1. **Instrument only:** counters for Autocomplete/Qol SA-null fallback hits on 309 gate; counters for ask-about ON vs OFF.
2. **Delete ask-about legacy body** (`1066–1080`) once fixture 4 + stage7 soak show zero need; keep try/catch returning `[]`.
3. **Collapse ranking** to intentUsageCounts after parity study (not a one-line delete).
4. **Remove collectFromPayload fallbacks** only when SA-null counter is 0 across gate.
5. **Never** delete ActionSynth or the ON-path unions in the same PR as (2)–(4).

## Honest scope limit
“Two paths” is mostly **two consumer branches**, not two full stacks. Full collapse requires moving ActionSynth capability logic into providers — **beyond** stage 8 cleanup.

## Evidence refs
- SCOPE.md §2–3  
- Stage 7: `STAGE7-grok2.md`  
- Parity harness: `harness/d88-semantic-parity.js`
