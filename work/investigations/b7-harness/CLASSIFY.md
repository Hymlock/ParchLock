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
| d23-lookahead-labels.js | calibrate cleared without stable ZRamProvider/LearningStores; M09 admission | stubs + containment probe + isPlausible |
| display-key-cache.js | 4d6d0c0 oracle drifted (casing) | cold/warm wipe vs current |

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
| learned-words-layout-tour.js | Claude owns: wrapFirstExact marks FIRST not LAST |
| d105-input-contract.js | Tools list unique Arrow keys — labels are title+detail concat; uniqueness or exact match |
| d105-review-fixes.js | gap: controls lift stripBottom vs visible bottom (inset/layout) |
| d119-live-audit.js | 48/2 TBD |
| d96-menu-handle-map-tab.js / d100-read-aloud.js / p3-mic-lifecycle.js | TIMEOUT |
| phase2-heuristic-cutover.js | 147/2 TBD |

Claude fixed d34 (92299c96) + d94 (983f95b7). grok2 fixed d23+display-key (ab8b1172).

## Reviews done
- M12 606dce5f ACCEPT (probe 9/0) bus #6112
- d48 fixed bus #6112

## Batch status
- 0–72 prior partial; 73–122 running (bg); next 123–183 after
