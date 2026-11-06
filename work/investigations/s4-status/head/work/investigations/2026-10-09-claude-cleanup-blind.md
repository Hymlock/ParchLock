# Repo cleanup inventory: claude, sealed (read-only; operator: "after APK commit and clean the repo with an adversarial round")

Written 2026-10-09 while codex builds the APK. Nothing has been deleted or moved. The counts come from `git ls-files` with `--exclude-standard`; a first pass without that flag wrongly listed ignored Android build output, so it was redone.

## Leave alone (out of scope)

- `games/` is ignored. Pruning to the 80 licensed games is the operator's own final step.
- Build output is ignored by `.gitignore` and `android/.gitignore`, so it does not clutter git: `capacitor-www/`, `android/app/build/`, `android/app/src/main/assets/`, `ParchLock.exe`, `Parchmap.apk`.
- `.ai-bus/runtime/` is ignored and is the live bus. Never touch it.
- The investigation records cited by PRODUCTION_PLAN or ARCHITECTURE stay.
- `work/investigations/icons/` holds the approved icon originals plus their provenance (credits sweep) and stays.

## Candidates (untracked, not ignored)

| ID | What | Size or count | Evidence | Proposal |
|---|---|---|---|---|
| C1 | `work/status-audit/` | 1675 files, 163 MB | operator rule: never stage these dumps | add `work/status-audit/` to `.gitignore`; delete only with operator OK, since they may be wanted for reference |
| C2 | `tmp/` | 5 MB (zoom-research, zstring/zdict scans, json) | scratch from both seats; operator rule: never stage tmp | add `tmp/` to `.gitignore`; codex decides on its own scratch files; delete after a reference check |
| C3 | root strays `shot.png`, `Counterfeit Monkey-startup-data.glkdata`, `alabstersettings.glkdata` | 3 files | the `.glkdata` files are Glulx game data written at run time (they may hold player progress) | add `*.glkdata` to `.gitignore` and **do not delete** without operator OK; delete `shot.png` if no reference is found |
| C4 | `work/learned-words-*.png/.html`, `work/learned-layout-debug.png` | 14 files | older Learned Words design artefacts, untracked | check for references in the plan; commit the ones that are referenced, delete the rest |
| C5 | `work/investigations/` untracked | 144 (116 png, 19 cjs, md, json, html) | screenshots and scratch scripts from the review loops | commit the md reports and any file cited in the plan; for the png and cjs, keep the files cited in the plan or reports and ignore or delete the rest |

## Tracked scratch probes

| ID | What | Count | Evidence | Proposal |
|---|---|---|---|---|
| C6 | `harness/_*.js` (scratch probes) | 224 tracked plus 30 untracked | a grep of PRODUCTION_PLAN, ARCHITECTURE, OPEN_WORK, docs/, tools/, the non-underscore harness/*.js files and the build scripts finds only **24 referenced** and **230 unreferenced** (list: `%TEMP%/unref.txt`, to be regenerated for the proposal) | move the referenced probes to a non-scratch name, or keep them; `git rm` the unreferenced tracked ones (history keeps them); delete the unreferenced untracked ones; add `harness/_*.js` and `harness/_*.json` to `.gitignore` so future scratch stays local |

## Safety rules for the action step

- Before any recursive delete, check for junctions and symlinks (`fsutil reparsepoint query` or `dir /AL`). `games/` was once wiped through a junction.
- Delete only explicit paths that were agreed, never wildcards over parent folders.
- Run the guard suites after the change (startup-menu-regression, layout-regression, equipment-ui, death-terminal, stat-tracker) to prove that no harness or tool imported a removed probe.
