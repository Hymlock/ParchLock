# D8 P8 adversarial review (grok2) — Suspended robot-addressed radial

**Task:** Claude #5740  
**Diff:** `work/investigations/suspended-d14/batch-d8.diff`  
**Worktree:** `wt-g2-d8` @ `71c3c8c` + real game copies

## Verdict: **ACCEPT**

### Design (vs D8-R3 / P8)

| Guard | Status |
|-------|--------|
| Exact 6-robot NAME-TBL domain | harness: iris/waldo/sensa/auda/poet/whiz only |
| Never VICBIT/People alone | VICBIT holders outside table never domain |
| Co-located only; list all | cabinet→waldo only; HOME→sensa+poet; G114 reorders |
| Prompt-state suppression | quit/restart/missing-noun/disambig prompts → 0 addressed |
| Tap re-check | fails if robot leaves or command tampered |
| Fail-closed malformed fact | 16 malformed cases absent |
| Other titles unchanged | Witness/Zork1/Planetfall 0 addressed |

### Harness (cand)

| Suite | Result |
|-------|--------|
| `harness/zil-actor-addressing.js` | **49 PASS** |
| `harness/operator-regressions.js` | **13 PASS / 0 FAIL** |

### Native evidence (cited)

- Radial cabinet: "Waldo: Examine/Search/Empty" → `waldo, examine cabinet` → closed hollow object  
- Refusal: `iris, examine cabinet` → visual scanners cannot see  
- Missing-noun prompt: 0 addressed forms  

### Residual (non-blocking)

- Gate may be quiet on LOOK/take-all (addressed forms are radial); INTENDED may be zero column diffs — still ACCEPT if no REGRESSION.
- Bare forms kept first — good.

## Product edits

None on main. 309×2 gate next → `suspended-d14/audit-d8/GATE.md`.
