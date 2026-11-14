# Distribution status (2026-11-14 closeout)

**Commit:** `8a57537a` — Build 98 Showcase product + evidence.

## Closed this session

| Item | Evidence |
|---|---|
| Uncommitted tree | **Committed** `8a57537a` |
| Bus | Restored; grok2 baton |
| Map audit | 175/0 `docs/map-audit-b98.txt` |
| Existing-module regression | 8/8 |
| G1 Windows headless | median RT 27 ms, cold ~2.5 s, 0 long tasks (`docs/g1-exe-b98.txt` / g1-win) |
| G1 via **ParchLock.exe** running | Exe launched; same dist served on 43871; headless measure against that tree **PASS** |
| Owner decisions X / Eamon settings / carpet / learning | Implemented + locked |
| Mobile exit-spoke dedupe | Owner confirmed; spokes hide when chips cover dest |
| Phone P3 import | Trusted package `6d6eb49a` |
| Phone P6 Hall/outer keys | Prompt keys live |
| Phone Item 11 Hall stats | Full status object (name, H/A/C, weapons, gold) |
| Phone P7 | Cold open ~1.2 s; Hall look RT **median 13 ms**, max 16 |
| Eamon settings on device | Section present when installed |
| Clean APK from commit | `Downloads\ParchLock-dist\ParchLock-dev.apk` |

## Remaining (optional / soft — not hard ship blockers)

| Item | Notes |
|---|---|
| P1 EQ long-press/swipe/grip | Needs dedicated EQ gesture session |
| P2 carry-over N→N+1 | Needs second package build |
| P4 schema-2 refusal | Needs old-schema fixture |
| P5 airplane force-stop restore | Needs manual airplane toggle |
| Item 11 after **LOMK** clear | Full adventure clear |
| Death menu N4 | In-play death restore |
| Stats edge cases (speed, dagger+5, …) | Live edge cases |
| Full live clears of all 20 | Injected contracts already proven |
| Play Store **release** signing | Needs keystore passwords (`build-android.bat release`) |

## Ship recommendation

**Dev/distribution of Showcase test build: READY** from `8a57537a` + `ParchLock-dist\ParchLock-dev.apk`.

Hard process blockers (commit + core phone G1/stats/import/exits) are done. Remaining items are expanded acceptance / store signing, not “can’t give someone the build.”
