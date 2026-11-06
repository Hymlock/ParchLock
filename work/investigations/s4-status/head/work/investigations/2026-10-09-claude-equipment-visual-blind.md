# Equipment screen and Options: blind visual review (claude, sealed)

Written 2026-10-09, before reading any Codex findings.

- **Method:** read-only. Scratch script `harness/_equip_shots.js`.
- **Setup:** Anchorhead, after `southeast` and `open umbrella`, with `EquipmentUI.Show()`.
- **Coverage:** 1280x800, 390x844 and 320x640, each in dark and light, with Options closed and open.
- **Screenshots:** `work/investigations/beautify-shots/equip-*.png`.
- **Overflow:** no horizontal page overflow at any width.

## Findings (most visible first)

| ID | Finding | Where seen |
|---|---|---|
| V1 | The floating Send and Clear buttons (bottom right) sit over the list. At 320 and 390 they hide the last row's status chip ("worn" on wedding ring), and at 320 with Options open they cover Refresh. The panel has no bottom padding for them, and the grey round dot (about x=195, y=757) also overlaps rows. | 320 and 390, both themes |
| V2 | The "Options" summary has no disclosure affordance: no chevron or marker, and no hover or focus look. It reads as a plain label, and is padded by about 40px of empty space above and below, with two rules. That is the largest waste of vertical space on mobile. | all |
| V3 | The Options body is an unstructured flex-wrap. The search field lands beside "Container view" at 390 but on its own line at 320. Refresh (an action) is mixed into the row of filter checkboxes and wraps alone ("Spells / Refresh"). The filters have no group label (for example "Show"). The Sort label and its select differ in baseline and height. | 390, 320 |
| V4 | The drag handle sits in the middle of each row, detached from both the name and the chips. At 1280 it floats in a 500px-wide row and looks like a stray glyph. It should anchor to one edge of the row (leading or trailing) at a consistent position. | all; worst at 1280 |
| V5 | The state chips ("worn", "open", "worn · open") are small and low in contrast, and the "you" badge is bold while the other chips are regular weight. They are hard to read in both themes. | all |
| V6 | Emphasis is unexplained. Worn items are italic. The trenchcoat is bold with a filled background (open container, or drop target?) while the umbrella, also "open", is regular weight with no fill. Two "open" items look different. | all |
| V7 | Status card layout: Turns takes a full row by itself, under Score and Day, with the right half empty. At 1280 the Score, Day and Turns tiles are small boxes in a wide card, with most of it empty. Score, Day and Turns could share one row, with Progress below them at full width. | all |
| V8 | Light theme: the checkboxes use the browser's default blue accent (no `accent-color`), which clashes with the green theme accent. The Sort select is unstyled native. | light |
| V9 | The hint text ("Drag an item onto an open container…") is long, small and low in contrast, and always shown. It could be shortened or styled as a quieter, dismissible tip. | all |
| V10 | Vertical rhythm is inconsistent: the gaps between the status card, the "Equipment" heading, its rule, Options and its rule, the count and the list all differ (about 12, 20 and 40px), and the corner radii differ (card, tile, row). | all |
| V11 | At 320 the right-hand tab rail (World, Map, Equipment) touches the panel border, leaving no gutter. | 320 |

## What any change must not break

- Filter, sort, search, Refresh, Container view and drag and drop (equipment-ui, 119 checks).
- The radial and long-press on rows, and the Yourself lanes (d214-yourself-verbs).
- The status and score semantics (stat-render-diff, prowess-retry).
- The D214 underline, inventory and status harnesses as listed in the A/B/C guard.

The changes are expected to be CSS-first, with no change to the JS semantics.
