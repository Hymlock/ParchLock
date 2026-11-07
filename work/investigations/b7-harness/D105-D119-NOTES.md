# d105 / d119 / phase2 notes (grok2)

## d105-input-contract.js (57/1)
Assert: `labels.includes("Arrow keys") && new Set(labels).size === labels.length`
Observed label textContent is title+detail concat without separator (`SaveSave in the game`, `Arrow keysOn-screen game controls`). Arrow keys is present as substring. Failure is Set uniqueness (duplicate full strings) or intermittent missing entry. PRODUCT/UI list structure — Claude.

## d105-review-fixes.js (42/1)
`gap (vv 520, layout 860): controls lifted ONCE... strip bottom 484 within the visible 520 ({"inset":"340px","layout":"860px","stripBottom":484})`
Viewport/safe-area geometry drift. PRODUCT.

## d119-live-audit.js (48/2)
Not fully re-captured this seat (long live run). Re-run with `node harness/d119-live-audit.js` for exact two fails. Likely PRODUCT.

## phase2-heuristic-cutover.js (147/2)
- Open without objectId: radial gets `[{Label:"window"},{Label:"More"}]` not empty — product still offers name token + More.
- id-backed Open: labels Examine/Open/Close/More — no "Use with..." (folded into More?).
PRODUCT radial policy change; not a fixture stub issue.

## TIMEOUTS
d100-read-aloud, d96-menu-handle-map-tab, p3-mic-lifecycle — raise timeout or ENV if external audio/mic.
