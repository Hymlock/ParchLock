# Why grok2 missed mail (fixed 2026-11-07)

## Root causes
1. **API trap:** `worker-client read` without `--all` returns only `unread.slice(0,1)` (mailbox.js ~452) — oldest message only; rest stay unread silently.
2. **False clear:** fragile JSON parse / subject-only handling reported unread=0 while 2–3 messages waited.
3. **Wrong drain path:** earlier drain-inbox.cjs resolved root to `work/` so it crashed instead of draining.
4. **Cron wake:** woke and did work without always looping `status` → `read --all` until 0.

## Required every turn start
```
node work/investigations/grok2/drain-inbox.cjs
```
Or manually: loop until status.unread.grok2===0 with `read --all`, print full bodies.
