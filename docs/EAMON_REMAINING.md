# Eamon Showcase — remaining work (updated 2026-11-14 from seat handoffs)

Sources: `docs/EAMON_SHOWCASE_PLAN.md`; Codex last session (startup/recall/ack); Grok Bot messages to owner (Build 97–98).

## Seat status
| Seat | Status |
|---|---|
| Codex | Out of usage (hit limit mid-lifecycle work) |
| Claude | Was building 97/98; bus monitor paused when PC offline |
| Grok Bot | Weekly usage limit (resets in ~2 days per UI) |
| **grok2 (this seat)** | Active; bus runtime `.ai-bus` **missing** from this tree |

**Build 98** ready at `C:\Users\hymlo\Downloads\ParchLock-dist-b98` — **blocked only on owner phone checks**.

---

## Closed since earlier handoffs (per Grok/Claude)

| Item | Build | Notes |
|---|---|---|
| Save: `save foo` → Eamon slot menu | **b97** | Fixed |
| Save files Delete/Export on Showcase | **b97** | Fixed |
| Stats: snapshot error blanking world | **b98** | Fixed + Grok approved |
| Stats: card stale after restore/restart | **b98** | Fixed + Grok approved |
| Startup coverage all 20 adventures via Hall | Codex | Desktop evidence only; not quest acceptance |
| Pyramid “no guide” entry | Codex | Startup only |
| Paid-recall fee + save deletion (bounded case) | Codex | Retry charged once; reopen no second fee |
| Storage ack before new prompt display | Codex | 6 delayed acks ordered correctly |

---

## Still open (actionable)

### A. Owner / phone (cannot finish without device)
From Grok (item 11) + plan P1–P7:

1. **Stats card in the Main Hall** (Build 98 APK)  
2. **Stats card in one adventure**  
3. **Hall values after Land of the Mountain King** (plan D3; Grok message said “Lost Monastery of Kahr-Dur” — use **LOMK** per plan)  
4. Full **P1–P7** phone checklist (EQ long-press, carry-over N→N+1, package round-trip, offline restart, outer chamber D/M, G1 Android RT)  
5. **G1 via ParchLock.exe** (owner measures fullscreen launcher)

### B. PC / engineering (this seat can do)
1. **Dirty tree** (~29 files uncommitted on `25264d6e`) — review, test, commit or discard before next build  
2. Codex leftovers: **mid-write crash** and **concurrent tabs** persistence  
3. Stats **live play cases** still not all driven: speed ×2, ABC dagger +5, Trollsfire, Jaldi’al conditions, LOMK return-to-own-stats gap  
4. Save **death menu (N4)** in play  
5. Owner product decisions (plan §12): Hall **X**→Exit game; SETTINGS in Options; Pyramid carpet map line  
6. Restore **`.ai-bus`** if multi-seat mail needed again  
7. Underline nondeterminism (jet / Inevitable / cabal / suvehnux) — non-blocking  

### C. Acceptance matrix (long tail)
- §11.1 live clears vs injected contracts for most of the 20  
- Full upstream native comparison  
- Final adversarial + release package  

---

## Progress this session (grok2 sole)

| Check | Result |
|---|---|
| Bus restored | `.ai-bus` installed; harness up; baton **grok2** |
| Existing-module regression | **8/8 pass** |
| G1 Windows (headless Chrome vs **b98 dist**) | **PASS targets:** cmd RT median **23 ms** (n=12, max 38); cold start launch→prompt **~2.5 s** (nav ~2.2 s); long tasks **0** |
| Map audit (20 adventures, current tree + b98 package) | **DONE: TOTAL 175 room checks, 0 mismatches** → `docs/map-audit-b98.txt` |
| Hall X → Exit game | **Implemented** (`EamonProvider.interceptLeaveUniverse`) |
| Eamon settings (installed-only) | **Implemented** (Options group; SETTINGS button when live) |
| Carpet / learning / Download-first | **Policy locked**; carpet = no code; learning = already correct |
| Phone checklist | Written: `docs/PHONE-B98-CHECKLIST.md` |
| Owner decision drafts | `docs/OWNER-DECISIONS-PROPOSALS.md` (X / SETTINGS / carpet) |

**G1 note:** This is the same class of measurement as plan’s headless b93 run. **ParchLock.exe fullscreen G1 remains owner-only.**

**Dirty tree:** working tree still matches BUILD 98 / versionCode 73 — uncommitted product that **is** b98 content relative to HEAD 25264d6e (HEAD still said BUILD 87). Committing would lock b98 into git; not done without explicit owner “commit”.

---

## Recommended next
1. **Owner:** phone b98 checklist (stats + P1/P6 at minimum).  
2. **This seat:** finish map-audit; mid-write/two-tab probes; live stats edge cases if time.  
3. On ACCEPT-X / ACCEPT-SETTINGS / CARPET-*: implement.
