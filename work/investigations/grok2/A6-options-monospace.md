# A6 Options cosmetics monospace (grok2 inventory, no code)

OPEN_WORK A6: two panels still monospace — "Configure directions" and "Replay tutorial".

## Location
| Control | File | Notes |
|---------|------|--------|
| Configure directions... | `js/WorkspaceUI.js` ~358 (Options > Accessibility & controls) | Button opens dirpad settings |
| Replay tutorial | `js/WorkspaceUI.js` ~370 | Same group; `css/Tutorial.css:176` comments the Options row |
| Learned Words “Help / Replay tutorial” | `js/LearnedWords.js:381` | Separate toolbar control |

## Font reality
- App-wide body font is **Roboto Mono by design** (`css/ParchLock.css:3`, many `!important` rules).
- `css/Tutorial.css:65` also forces Roboto Mono.
- Changing only two buttons without a product font decision will still look mono if parents inherit Roboto Mono.

## Disposition for operator
1. **Keep mono** (matches S3 operator decision on grid font) — close A6 as WONTFIX / by design.
2. **Introduce a UI sans for chrome only** (Options buttons, tools) while story text stays mono — needs design pass + CSS scope (not a two-line tweak).

## grok2
No code until operator picks (1) or (2). Packet is inventory only.
