# Surface 3 (Map panel and World Map): claude blind review, sealed

Written 2026-10-09, without reading `2026-10-08-codex-surface3-visual-blind.md`.

- **Method:** read-only. Scratch script `harness/_s3_shots.js`.
- **Setup:** Anchorhead after `southeast`, `northwest`, `west` and `east` (7 known rooms), then `ParchLockMap.Show()` and `WorldMap.Open()`.
- **Coverage:** 1280x800, 390x844 and 320x640, in dark and light.
- **Screenshots:** `work/investigations/beautify-shots/s3-map-*.png` and `s3-world-*.png`.
- **Overflow:** no horizontal overflow, and no clipped leaf text inside `#map`.

Operator rules apply: functional reserves stay, and surfaces already swept keep their styling. The World Map was recently built and accepted (D202 and the World Map work).

## Findings

| ID | Finding | Where |
|---|---|---|
| M1 | The mobile map shows a "Map controls" heading with no visible controls under it. On desktop the Center, zoom, Maps and Reset Map buttons sit there. If it is a disclosure on mobile, it has no affordance (the same defect as Equipment V2); if the controls are intentionally absent on mobile, the bare heading is noise. | 390, 320 |
| M2 | The current-room node's corner badge (the circled glyph) overlaps the room name, covering "Real" in "Outside the Real Estate Office". The name wraps under the badge instead of reserving room for it. | all widths |
| M3 | The map panel runs under the floating Send and Clear buttons. On mobile the "Notes" heading and the "ParchLock! build 63" footer sit under them. This is the same class of issue as Equipment V1: the map sheet does not use D215's `--pl-input-protect-height` or the coming bottom-exit reserve. Constraint: the handles stay where they are. | 390, 320 |
| M4 | The Known Rooms chips are dominated by their icons. Each chip has eye, walk and trash icons at full weight, larger than the 11px name, so the destructive trash icon is visually loudest. In light theme the current-room chip is solid black, while dark theme uses the green accent, so the themes disagree. | all; worst in light |
| M5 | The desktop light-theme map control buttons are flat grey with low text contrast, unlike the app accent controls elsewhere, such as the D215 Options. | 1280 light |
| M6 | The game title block (title, italic subtitle, author) takes about 110px of the mobile map's height, and the author line is right-aligned under a centred title. | 390, 320 |
| M7 | At 320 the World Map header wraps: "Level 2" and "Level 1" stack vertically, and the header grows to about 90px, with Centre and the close button separated from them. | 320 |
| M8 | The World Map truncates room names with an ellipsis ("Outside the Real Estate…"), while the local map wraps names in full. The two maps treat names inconsistently. Check whether the truncation is intended by the World Map's level-of-detail design before changing it, since D202 kept the original renderer. | all |
| M9 | The tab rail touches map content at 390: the Alley node's right edge reaches the rail. This belongs to surface 4. | 390 |

## Out of scope and preserve

Do not change:
- the graph, layout, prediction or pathing (D202 and the Z1 hints);
- the faded hinted rooms and dotted links (D202);
- the Maps save and export submenus, which were already swept.

## Prior-fix guard for any surface 3 change

- world-map-ui;
- D202 map harnesses (d23-lookahead-labels, map-pathing-regression);
- D215 protector;
- equipment-ui (for the sheets-never-stack rule, D125).
