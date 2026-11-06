# Blind halves comparison

Both sealed halves agree: StatTracker.load forgetReadings resets death/win history on reopening; sidecars save only map/labels; same-page undo/restore already preserves counters; accepted restart resets. Existing successful native save/restore hooks, not attempted commands or replay output, must own save associations. D178 reading invalidation and D215 ending dedup remain unchanged.

Agreement on intent: cumulative events per playthrough, not counter rollback with old VM state; separate explicit new runs must not inherit. Save metadata links the run, while durable run totals outlive rollback. No max across all runs of a story. Exact digest, late identity/bootstrap, portable packages, malformed data/storage failures and real lifecycle ordering need tests.

Open design points for adversarial review: page reopening versus fresh boot distinction, binding missing metadata without inventing historical identity, durable ledger/active pointer ownership, restore-before-StatTracker initialization, import transaction/merge and replay dedup, coupled wins behavior. Independent report is independent/blind-findings.md; root sealed before request. No implementation exists yet. Operator stable test APK is explicitly authorized; no installation request inferred. ZIL work remains at4753da6/59aeaf7 and resumes after this issue/APK.
