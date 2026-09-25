# Parchmap - GUI Baseline (live regression, 2026-09-11)

> Planning artifact only. No product code was changed.
> Captured by running repo tools/*-regression.js against a local slice with Playwright + Chrome.

## Module results

| Module | Result | Notes |
|---|---|---|
| startup-menu-regression.js | PASS | no-story recovery, library nav, Save/Restore guards, Anchorhead start |
| ui-regression.js | PASS | noun/input radials, popup/map restore, native save/restore, packages, desktop+mobile shots |
| layout-regression.js | PASS | pinned input, highlight persistence, items tab, tools radial, paths, map I/O, responsive |
| highlight-scope-regression.js | PASS | examine/inventory highlight rules, redraw, movement expiry |
| anchorhead-regression.js | PASS | requires HTTP server on 127.0.0.1:8765 |

Build observed: **Parchmap build 33**.

## GUI observations (beautify / conversion relevance)

### Keep
- Desktop split: story left, map/tools right.
- Teal accent language across nouns, current-room node, inventory chips, radials.
- Noun radial and Tools radial geometry are readable at 1400x900.
- Map chrome (search/center/zoom/Maps) and Maps modal checkpoints.
- Status grid coexistence (location + day one on Anchorhead).

### Gaps for the engine plan
1. Map starts 1 room / 0 exits until movement - RAM look-ahead stubs need careful layout.
2. Inventory is flat chips, not nested containers - tree UI must preserve tap density.
3. Heuristic nouns underline noisy phrases (e.g. older portion) - ObjectID binding should thin these.
4. Radial verbs are generic until RAM synthesis - avoid reshuffling radial slots each turn.
5. Tools radial spans both panes - must stay inside text-buffer bounds when Glk graphics present.
6. Mobile uses modals - floor tabs need a bottom-sheet pattern, not a third column.
7. Simple 2-node path clarity must survive hybrid grid/force beautification at larger sizes.

## Re-run

```powershell
cd C:\Users\hymlo\Downloads\Projects\Parchmap-main\_parchmap-test-slice
$env:PW_CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"
# serve cwd on 127.0.0.1:8765 before anchorhead-regression.js
node tools/startup-menu-regression.js
node tools/ui-regression.js
node tools/layout-regression.js
node tools/highlight-scope-regression.js
node tools/anchorhead-regression.js
```
