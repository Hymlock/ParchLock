# Surface 3 (Map panel and World Map): comparison and proposal (claude)

This compares the two sealed reviews:
- claude: `2026-10-09-claude-surface3-visual-blind.md`, findings M1-M9;
- codex: `2026-10-08-codex-surface3-visual-blind.md`, findings V1-V5.

## Comparison

| Topic | claude | codex | Result |
|---|---|---|---|
| Map controls (and Notes) disclosure has no cue | M1 | V1 | **Agree** |
| Current-room badge overlaps the node name | M2 | V3 | **Agree.** Measure the node rectangles first. |
| World names clamp to two lines | M8 | V4: intended, and the selected panel gives the full name | **Accept codex.** Not a defect. |
| World toolbar targets are 32-34px (<44) | — | V2 | **Accept** (codex only) |
| Map sheet runs under Send, Clear and the footer on mobile | M3 | — | claude only |
| Known Rooms: light current chip is black while dark uses the accent; trash is the loudest icon | M4 | V5: themed; check the 44px targets first | **Partly.** Theme consistency in; icon spacing only on target evidence. |
| Desktop light map buttons are flat grey with low contrast | M5 | — | claude only |
| The title block's height and alignment | M6 | V5: coherent | **Concede to codex:** preserve it. |
| The World header wraps vertically at 320 | M7 | (V2 covers the toolbar) | Fold into P4. |
| The rail touches the Alley node | M9 | — | Surface 4 |

## Proposal (CSS-first; no change to graph, layout, prediction, pathing, exits or handles)

**P1. Disclosure cues for Map controls and Notes.**
- Use the same pattern as D215 Options: a 44px summary, a chevron that rotates when open, hover and focus styles, and a bordered card.
- Keep the native `<details>` and every control ID and handler.
- D112: the add-note button stays outside the summary.

**P2. The node badge reserves its space.**
- When a node shows the corner badge, its name area gets matching inline-end padding, so the name wraps before the badge instead of under it.
- No truncation, and no change to node position or size beyond the text box's own wrap.
- Proof: at 320, 390 and 1280, the badge rect never intersects the name's text rects.

**P3. The map sheet uses the D215 bottom reserve on mobile.**
- Apply the same shared variables as Equipment: `--pl-input-protect-height`, plus `--pl-bottom-exit-reserve` once surface 2 lands.
- That way Notes, the footer and the last Known Rooms row are never under Send, Clear or the handle.
- The handles stay where they are.
- D125 still holds: the sheet scrolls and sheets never stack.
- Proof: the sheet bottom equals the reserve top, and the last element is reachable.

**P4. The World toolbar.**
- Centre, Close, the level tabs and the selected-room actions all get 44px targets, use the app surface, border, radius and accent, and show a visible focus ring.
- At 320, the header lays out as two clean rows: the title and Close on the first, the levels (a single horizontal segmented group that scrolls if it is wider than the space) and Centre on the second. It must never stack the level buttons vertically.
- Fullscreen, pan, zoom, travel authority and origin restoration are unchanged.

**P5. Known Rooms theme consistency.**
- The current-room chip uses the accent treatment in both themes, matching dark.
- Eye, walk and trash keep their behaviour and confirmation.
- Lower the trash icon's resting emphasis (for example opacity .7, full on hover or focus) only if the measured targets stay at least 32px, the existing chip standard. Spacing changes only on target evidence (codex V5).

**P6. Desktop light map control buttons.**
- Use the same surface, border and accent tokens as the D215 controls, with text contrast of at least 4.5:1.

**Deferred or preserved:**
- M6, the title block, is preserved.
- M8 / V4, the World name clamp, is intended.
- M9 belongs to surface 4.

## Prior-fix guard

| Decision | What must hold | Proof |
|---|---|---|
| D112 | the notes disclosure | — |
| D122 and D125 | sheets | equipment-ui |
| D168 | the desktop sheet reflow | panel-reflow-live |
| D202 and the World Map | renderer, faded hints, dotted links | world-map-ui |
| Map pathing | — | map-pathing-regression, d23-lookahead-labels |
| D215 | the shared protector variables | — |

Visual proof: before and after at 1280, 390 and 320, in dark and light, for the map and the World Map, with no horizontal overflow.
