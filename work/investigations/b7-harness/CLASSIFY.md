# B7 classification (grok2 interim)

## STALE fixed (test-only)
| harness | cause | fix |
|---|---|---|
| d48-map-single-room-per-destination.js | jQuery stub missing `.css` (M7 R2) | no-op `css()` |
| audit-navigation.js | Navigator speech hold needs `setInterval` | stub setInterval/clearInterval |
| d198-contract-matrix.js | make-dist B1/B2 uses RUNTIME_STAGE not DEST\\js | accept RUNTIME_STAGE robocopy |
| d88-semantic-parity.js | nested key also gets inspect; not sole command | sanity: some() take out of bag |
| exit-calibrator.js | storageKey uses learningIdentityKey | stub learningIdentityKey |
| glk-tap-gate.js | HostEmglkenBridge not on play.html | GlkTap+RemGlkTap on play; bridge file exists |
| attr-calibrator-inventory-root.js | LearningStores identity required (D13/P13b) | LearningStores stub |
| attr-calibrator-location-global.js | same | LearningStores stub |
| attr-calibrator-phase-cd.js | same | LearningStores stub |
| attr-calibrator-verb-disablement.js | same | LearningStores stub |
| learned-words-adversarial-probes.js | LearnedWords.identity via LearningStores | LearningStores stub in vm |

## Runner / ENV
| harness | note |
|---|---|
| run-triage.cjs | classifier fixed for PASS=N FAIL=M (inform-layout false 75 fail) |
| inspect-single.js | ENV skip (needs argv html path) |
| e2e-anchor-path.js | ENV skip (needs :8765 static server) |
| inform-layout.js | actually 75/0; was classifier false FAIL |

## PRODUCT (do not fix under B7 test-only) — hand Claude
| harness | evidence |
|---|---|
| d34-dictionary-verbs.js | Infocom Zork1/HHGG collect() emits dictionary-verb specialCommands (gate expected empty); informVerbFlags gate may be bypassed on collect path |
| d94-cell-and-boot.js | 320x640 told 45 cols; harness floor still 48 |
| display-key-cache.js | cache miss on Transmat Popper / Glow Bar display names |
| d23-lookahead-labels.js | after calibration prop 12/13 not resolving to nw/se |
| learned-words-layout-tour.js | wrapFirstExact+relocate marks FIRST "empty canteen" not LAST (tail " then empty canteen." not ".") |
| d105-input-contract.js / d105-review-fixes.js / d119-live-audit.js | still TBD detailed (1–2 fails each) |
| d96-menu-handle-map-tab.js / d100-read-aloud.js | TIMEOUT |

## Reviews done
- M12 606dce5f ACCEPT (probe 9/0) bus #6112
- d48 fixed bus #6112

## Batch status
- 0–72 prior partial; 73–122 running (bg); next 123–183 after
