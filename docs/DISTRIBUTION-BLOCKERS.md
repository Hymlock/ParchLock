# What still blocks distribution (2026-11-14)

Plan: `docs/EAMON_SHOWCASE_PLAN.md`. Working tree has Build 98-era code **uncommitted** on HEAD `25264d6e`.

## Does **not** block shipping the Showcase package
- Owner design decisions (X, Eamon settings, carpet, learning, Download-first) — **decided and mostly coded**
- Map audit 175/0, existing-module regression 8/8
- Headless G1 Windows vs dist (median RT ~4–23 ms depending on run)
- Exit-band / noncardinal hide (mobile) — owner confirmed correct
- Bus restored for this seat

## **Blocks or soft-blocks distribution**

### 1. Uncommitted product tree (hard process block)
~25+ modified files (js/, MapBeautify, host, Consts BUILD 98, versionCode 73, etc.) are **not in git**.  
A clean “release from source” cannot be reproduced until this is **committed** (or deliberately discarded).  
**Owner action:** say **commit** when ready (or review first).

### 2. Phone acceptance still open (plan P1–P7 + item 11)
| ID | Item | Status |
|---|---|---|
| Item 11 | Stats card Hall / in-adventure / after LOMK | Partially probed via CDP; **owner play confirmation still listed in plan** |
| P1 | EQ long-press / swipe / grip-drag | **Not closed** |
| P2 | Carry-over N→N+1 import while afield | **Not closed** |
| P3 | Package download/import round trip | **Not closed** |
| P4 | Schema-2 refusal UI | **Not closed** |
| P5 | SAVE + force-stop + airplane reopen | **Not closed** |
| P6 | Outer chamber D/M underlines | **Seen working** in CDP session |
| P7 | Android G1 cold start + cmd RT ≤200 ms | **Cold open ~1.3 s; RT median ~9 ms** in CDP — good, but plan wants formal sign-off on device |

Without a short owner “phone OK” on the checklist, plan **G** (release gate) stays open.

### 3. G1 via **ParchLock.exe** (plan wording)
Headless Chrome vs dist **passed**. Plan still says G1 Windows is open until measured **through the exe** (fullscreen launcher).  
**Soft block:** treat as owner 2-minute smoke if headless is accepted; otherwise still open.

### 4. Saves — death menu (N4)
Death menu restore path **in play** still open. Not a whole-catalog block if save dialog works, but plan lists it as remaining.

### 5. Stats item 11 — live edge cases (soft)
Speed ×2, ABC dagger +5, Trollsfire, Jaldi’al, LOMK D3 return-to-own-stats — contracts/injected proofs exist; **not all live-driven**. Soft for distribution if core stats card works on phone.

### 6. Live clears vs injected contracts (soft / sampling)
Most of 20 adventures: contract via **injected** end state only. Plan allows owner sampling, not full live clears, before ship — **not a hard stop** if you’re OK shipping with probe-proven contracts.

### 7. Codex leftovers (soft)
Mid-write crash + concurrent tabs — robustness, not feature-complete blockers unless you want them closed first.

---

## Minimum path to “can distribute”

1. **Commit** (or explicitly freeze) the dirty Build 98 tree.  
2. **Owner phone pass** on `docs/PHONE-B98-CHECKLIST.md` (stats + P1 + P5 at least).  
3. Optional: 2-minute **ParchLock.exe** smoke.  
4. Tag/build **release** APK if you need Play/store signing (`build-android.bat release` + keystore env — **passwords required only for release**).

## Already safe to call “done enough” for PC Showcase
- Conversion layer, Hall, 20-adventure package trust, map audit, desktop regression, owner decision implementations (X, Eamon settings), mobile exit-spoke dedupe.

---

*Dev APK (no password): `Downloads\ParchLock-dist\ParchLock-dev.apk` after last build.*
