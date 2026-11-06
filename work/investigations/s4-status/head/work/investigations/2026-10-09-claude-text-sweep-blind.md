# Text, credits and permissions sweep: claude blind findings (sealed)

**Operator request.** After the APK, an accuracy sweep of text and documents, in code and out: updates, thoroughness, permissions, and a brief credit to the AI systems used and to Hymlock Groves. Third-party story text is never rewritten casually.

I wrote this before reading `2026-10-09-codex-*` text findings. **Scope:** shipped documents (README, USER_GUIDE, RELEASE_NOTES, CREDITS, PRIVACY, THIRD_PARTY_NOTICES, SOURCE_BUILD, GAMES_INCLUDED), the in-app About (`js/ProductInfo.js`) and Help (`js/WorkspaceUI.js` ShowHelp), plus a check of the APK 64 manifest.

## Accuracy: wrong statements

| ID | Where | Statement | Fact |
|---|---|---|---|
| X1 | README.md:8 | "ParchLock is distributed as an application without story modules." | `games/` holds 309 modules today, and GAMES_INCLUDED.md says "80 games are included" (the release set; pruning is the operator's final step). The sentence contradicts both. |
| X2 | USER_GUIDE.md:38 | "Tap the faint right-edge tab to open or close the map." | There are now three right-edge tabs: World, Map and Equipment. |
| X3 | USER_GUIDE (Mapping) | "The map … does not know unexplored destinations." | ZIL stories now show predicted (hinted) rooms from the game's own exit data: faded rooms and dotted links that are never routed until walked (D214 Z1). |
| X4 | js/ProductInfo.js:8 | `releaseDate: "2026-09-20"` | Not displayed anywhere today, but stale (APK 64 is 2026-10-09). Update it, or remove it if it is unused. |
| X5 | WorkspaceUI ShowHelp, "Notes, display and options" | "Options controls startup help, assumed return paths, speech, and tutorial replay." | Options now also has voice input, story scrolling, accessibility and controls, learned words, and (Android) App icon. |

## Out of date: missing current features

| ID | Where | Missing |
|---|---|---|
| U1 | RELEASE_NOTES.md | Only "1.0 - 2026-09-20". Builds 61-64 are not described. A new entry should cover:<ul><li>the Equipment screen (inventory, status card, Options);</li><li>the World Map;</li><li>underlines that follow their words (D214);</li><li>Infocom room prediction;</li><li>the Deaths and Wins tiles;</li><li>the beautification sweep (bottom exits, map controls, the start screen);</li><li>the storybook icons with the Android pinned and PC desktop rotating icon;</li><li>the experimental launcher-icon option.</li></ul> |
| U2 | USER_GUIDE.md | No section on the Equipment screen (filters, Container view, drag to containers, Yourself, the status card with "Deaths this playthrough"), the World Map, faded hinted rooms, or the App icon options and the PC desktop shortcut prompt. |
| U3 | README.md | The feature line lacks Equipment and status, the World Map and the death counter. The "Start" section lacks the PC first-run desktop-shortcut question and the `--desktop-shortcut` re-offer. "Install `ParchLock.apk` from a release folder" does not match the actual artefact names (`ParchLock-build64.apk`, `ParchLock-dev.apk`). |
| U4 | About (ProductInfo.showAbout) | The feature sentence lacks Equipment and status and the World Map. |
| U5 | Help (ShowHelp) | No Equipment or status section and no World Map. Mapping does not explain hinted rooms or the browsed-room Back/Go reveal on touch. |

## Credits (operator: brief AI and Hymlock credit)

| ID | Finding |
|---|---|
| R1 | CREDITS.md credits AI only for the icon: OpenAI image generation, plus Codex and Claude on the icon files. The operator asked for a brief credit to **the AI systems used** generally. The bus seats were claude (Anthropic Claude), codex (OpenAI Codex) and grok (xAI Grok; `GROK.md`, bus agent list). **Proposal:** one sentence: "Developed by Hymlock Groves with AI assistance from Anthropic's Claude, OpenAI's Codex and xAI's Grok; storybook icon artwork generated with OpenAI image generation, directed and selected by Hymlock Groves." Keep it factual and brief. Each seat's actual role is to be confirmed by the operator before wording is final, in case grok's role was limited. |
| R2 | The About box shows only `creditLine`. It could add the same one-line AI note, or link to Credits (it already links). Prefer the link plus CREDITS.md, so About stays short. |

## Permissions and provenance (operator decisions needed)

| ID | Finding |
|---|---|
| P1 | CREDITS.md and DISTRIBUTE.md both say "Splash artwork provenance and release rights must be recorded before a public release". The four splash images (archive door, dungeon door, forest path, living map) have no recorded origin, and the approved icons reuse them. **Operator question:** who made the splash art (or with which tool)? The answer goes into CREDITS and CREDITS-linked provenance. |
| P2 | Name clearance ("complete the ParchLock name-clearance check", DISTRIBUTE.md step 2) is still open. Operator item; it is recorded, not resolved, by us. |
| P3 | Game licences: GAMES_INCLUDED.md (80 games, compiled 2026-10-05, with IFIDs and licence requirements) is consistent with the operator's release set. The shipped build still bundles 309, so before any public release the operator's pruning step must happen. That is already stated as the operator's final step; no text change is needed except X1. |
| P4 | PRIVACY.md is accurate against APK 64. The compiled manifest requests only RECORD_AUDIO (the `DUMP` string is a receiver guard, not a uses-permission), so there is no INTERNET permission. Not mentioned yet, and to be added: the PC launcher writes `%LOCALAPPDATA%\ParchLock\launcher.ini` and, only with consent, a desktop shortcut; Android stores the icon scene in app preferences and pins a shortcut only after the system confirmation. |
| P5 | THIRD_PARTY_NOTICES.md: no new third-party code was added this round. The icons come from OpenAI image generation, and the operator holds the output under OpenAI's terms. A notice entry is optional; the credit (R1) covers the attribution. |

## Not to change

- Story text inside modules.
- The licence wording of third-party components, unless evidence changes.
- The historical decision records in PRODUCTION_PLAN.md (those are records, not user documents).
