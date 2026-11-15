# Distribution status (2026-11-15 RC)

**Working tree product:** Hall inventory, stats packing, TTS *, phone P1/P3/P4/P5/N4.

## Closed

| Item | Evidence |
|---|---|
| Hall inventory | HallSnapshot.CharacterInventory; docs/HALL-INV-TEST.txt |
| Stats two-up | EamonProvider + StatTracker + CSS |
| TTS asterisks | ReadAloud scrubForSpeech |
| P1 EQ gestures | docs/P1-EQ-GESTURE.txt |
| P3 package RT | docs/P3-P4-BATCH.txt Import Complete |
| P4 schema-2 | docs/P3-P4-BATCH.txt |
| P5 offline | docs/P5-OFFLINE.txt |
| N4 death restore | docs/N4-DEATH-MENU.txt Game restored |
| Trusted pin | fd291722… hallinv in EamonPackage.js |

## Remaining for store final

| Item | Notes |
|---|---|
| Play **release** signing | Needs PARCHLOCK_KEYSTORE + passwords (`build-android.bat release`) |
| P2 full N→N+1 | Partial; owner marked off |
| E2 Wear / lightForms / full live clears | Parked product lanes |

## Ship recommendation

**Dev/test RC: READY** after clean commit + `make-dist` + `build-android.bat dev` + `package-complete.ps1`.

**Play Store final: NOT READY** until release keystore is available.
