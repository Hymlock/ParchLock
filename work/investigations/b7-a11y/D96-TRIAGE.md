# d96 remaining FAIL triage (grok2) — #6207

Full run after stale fixes: **122 PASS / 5 FAIL**.

## STALE fixed (test-only, this commit)

| FAIL | Cause | Fix |
|---|---|---|
| Map tab free-point tappable 5/9 (all mobile VPs) | Rotated `.dir-name` miss AABB skip but still `elementFromPoint` hits; counted as tab miss | freeOk also if hit is exit label (label-wins already separate assert) |
| dark-room filter protector (390) | Product uses `html.pl-dark-scope #windowport { opacity: 0.92 }` not `filter` | Accept opacity-based darkening; still require `::before` none |
| desktop Tools radial unchanged | Desktop Tools now opens `pl-tools-list`; assert required `!list` | Allow list; still forbid mobile-only Open map / Modules / Exit game |
| (earlier) tools labels / translucency / sticky close / replay click | detail-concat, AA tab palette, static close, Options offscreen | already in cf1706e0 |

## PRODUCT — real player-visible (hand Claude)

| FAIL | Evidence | Notes |
|---|---|---|
| **left exit labels ≥32px rotated target** (5 VPs: 320–430) | Live measure: `minWidth` **18px**, heights ~17–94px on `.dir-w` shown labels | Cross-axis touch target after -90deg is ~18px, below 32px WCAG/D96 intent. Not a fixture bug. Needs product CSS/layout if operator still wants 32px. |

No screenshot required beyond measure: rail left=8px, label width=18 at 390×844 Anchorhead after line prompt.

## Not failing anymore
- Map tab translucency (AA idle palette allowed)
- Tools list unique labels + handlers
- D120 replay tutorial path
- free-point tappable
- dark-room opacity path
- desktop mobile-only action bleed

## Next
E4 D222 review (`b51ce91`) per #6216.
