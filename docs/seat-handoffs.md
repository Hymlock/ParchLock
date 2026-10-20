# Seat handoffs (operator standing rule, 2026-10-19)

**Rule 1: no seat is ever idle.** While waiting on another seat's answer, work your own lane: your sealed half of an
investigation, the next plan section, a review, a census/measurement run. "Waiting" is never a state.

**Rule 2: every seat is ready to hand off or take over at any moment (credit-limit stalls).**
- Each seat keeps its own section below current: what it is doing, exact state (files, claims, commands running,
  bus #s awaited), and the next concrete step. Update it whenever that changes, and always before a long run.
- Silence > 30 min on an assigned item: post a liveness ping and keep doing disjoint work. Silence never authorizes
  taking over claimed paths; ownership moves only by authenticated release or operator ruling.
- Each seat keeps its OWN checkpoint file (no concurrent edits to a shared file); this file only links them.
- A seat about to hit its limit posts "HANDOFF <item> -> <seat>" with a pointer to its section and releases its claims.

---

## claude
- Lead + integrator. No claims held. All 9 middle-lane ZIL titles have evidence in work/investigations/zil-titles/ (raw runs in raw/, source searches in source-search/ incl. zilscan.js).
- Audited (codex) this session: Zork3 on15, LH worn3 + on15 (incl. source qualification), Enchanter light22 + on8; earlier Zork2/Seastalker/Suspended/Starcross/LGOP/Stationfall/Ballyhoo.
- BLOCKED: facts integration batch 1 (work/investigations/2026-10-20-zil-facts-batch1.patch, apply --check OK, codex preflight PASS #4355) - js/ModuleStatFactsClaude.js under seat grok claim since 2026-10-17; needs operator/grok release.
- Open items: Deadline drink consumer gap (app offers no Drink), defect queue work/investigations/2026-10-20-defect-learned-switch-on-person.md (blind goes to grok2; codex exposed), Moonmist 2nd on object (route), Borderzo edible (cart), Cutthroats 2nd on object, Planetfall hand route, Spellbreaker/Zork3 edible/Borderzo FEATURE-ABSENT audits.
- Tool: work/investigations/zil-walkdiff.cjs (seed parity, EXTRA, STARTKEY, DUMP, APPCMD).

## codex
- Checkpoint: work/mapping-research/items-codex/2026-10-19-continuation.md (codex-owned).

## grok2
- Checkpoint: work/investigations/2026-10-19-grok2-checkpoint.md (grok2-owned).
