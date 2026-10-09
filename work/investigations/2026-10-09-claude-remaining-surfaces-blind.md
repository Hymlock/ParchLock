# Surfaces 4-7 and the start screen: claude review, sealed

Written 2026-10-09, without reading `2026-10-09-codex-remaining-surfaces-blind.md`.

**Disclosure:** I had already read the subjects and bodies of codex #2065 and #2066 (the operator's start-screen overhaul request and codex's overhaul proposal) before writing this. My start-screen findings are therefore not blind to them, but every finding below comes from my own screenshots.

- **Method:** read-only. Scratch script `harness/_s47_shots.js`.
- **Screens:** `index.html` (the start screen) at 1280x800, 390x844 and 320x640; in `play.html` with Anchorhead, the desktop Menu radial, the Display button and a word radial (right-click on the first `.pl-act`).
- **Screenshots:** `work/investigations/beautify-shots/s47-*.png`.
- **Overflow:** no horizontal overflow.
- **Not visible on mobile:** `#game-menu` and `#tools-toggle`. That is by design (CSS: "Mobile menus are reached through the existing input radial's Tools button"), so they were not captured on phones.

## Start screen (`index.html`): needs the overhaul the operator asked for

| ID | Finding | Where |
|---|---|---|
| S1 | The toolbar is a light-grey bar inside the dark theme, with unlabelled glyph buttons (★, ☐, ☑, upload, i, moon). At 1280 the "Listing 309 stories" count is cut off ("Listing 309 sto") under the search box, and the "i" and moon buttons drop to a second, misaligned line; the moon is nearly invisible. On touch none of the icons has a visible label, so their meaning (favourites filter, select, select all, import, info, theme) cannot be discovered. | all |
| S2 | On mobile there is no app identity at all: the page opens directly onto the bare toolbar and list, with no "ParchLock" title or explanation. | 390, 320 |
| S3 | The intro prose (desktop right pane) is out of date and poorly typeset. It reads "ParchLock is an awesome program…", describes slash commands (`/clear map`, `/note…`, `/goto kitchen`) as the main features (these need verifying against the current code before they are kept), and does not mention Equipment, the World Map, read-aloud, Modules or the radial. It is fully justified monospace, which leaves wide gaps ("Parchment interactive fiction interpreter that"). Feature names are underlined like links but are not links. | 1280 |
| S4 | Each story row has a star on the left and an unexplained checkbox on the right, with no header or legend for the checkbox. The titles are centred, so the eye has no consistent left edge to scan in a 309-row list. | all |

## Menus and radial (surfaces 5 and 7)

| ID | Finding | Where |
|---|---|---|
| R1 | The desktop Menu radial has uneven spacing. "Exit game" sits alone on the outer ring while the other eight items crowd the inner ring, and Options, Modules and Map almost touch at the bottom (Modules at about y=334, between Options at y=306 and Map at y=306). Before changing anything, check how the radial lays itself out and what D-entries cover it: the operator corrected an earlier radial review ("don't redo existing systems"), so only measured crowding counts here, not a redesign. | 1280 |
| R2 | The word radial on a phone ("Go in", with Tools in the centre) is clean. While it is open, Send and mic are hidden and only the input box remains; that looks intended. No finding. | 390 |

## Rail and mobile layout (surface 4)

The rail at 320 touches the panel border, and at 390 it reaches map nodes (my earlier V11 and M9). It is clipped nowhere else.

## Not yet captured

- The contents of Options, Help, About and Modules opened from the Menu radial;
- the Display dialog (`s47-display-1280.png`, if it rendered);
- the light theme for the start screen.

These need a second capture pass before surface 5 is proposed.

## Constraints for any change

- **Start screen:** keep the library filter, favourite, select, import and theme behaviour and their IDs; keep the Module authority. Make no claims of features that do not exist: every feature sentence must be verified against the code, and the build and credits come from `ProductInfo`.
- **Radial:** no redesign. Spacing only, and only on measured overlap.
