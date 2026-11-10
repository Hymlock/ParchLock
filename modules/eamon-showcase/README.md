# Eamon Showcase module

Development source home for ParchLock's Eamon Showcase. This folder is NOT an installed module and is not automatically scanned or launched by ParchLock.

[Accepted master plan](../../docs/EAMON_SHOWCASE_PLAN.md)

## What the player receives

One separately versioned, importable Showcase download on both ParchLock distribution releases. The player selects the file using the existing **Modules -> Choose files / Import** interface. It installs ONE library entry. Opening it enters the Main Hall; all campaign adventures are selected from inside that module. No companion application, external service or manual folder-copy installation.

The full collection is20 player adventures plus Main Hall. The3 upstream test/demo filesets remain engineering support content. The campaign retains the agreed five-tier progression and source-specific entry/outcome rules.

## Current status

Creation started. No playable Showcase package exists yet. The current ModuleLibrary importer accepts supported Z-machine/Glulx story bytes; it does NOT yet accept an Eamon campaign package. Existing import/library/identity/storage/erase systems will be extended only after the required runtime/package proof. No separate importer UI or parallel module library is planned.

First work: source/provenance and existing-system audit, then gate G1 for the embedded engine, input, serializer and persistence. The .NET browser experiment is isolated from the production app. No runtime or release gate has passed.

The first reproducible [feasibility probes](probes/README.md) are now present. Desktop Chromium passed assembly/serializer smoke checks and synchronous worker input/resume, responsive-page, duplicate-reply and cancellation checks. These are partial results; G1 is still open and no gameplay or Android acceptance is claimed.

## Repository layout

- This folder: module-specific source, package contracts and build entry points as implemented.
- `docs/EAMON_SHOWCASE_PLAN.md`: accepted local master plan.
- Generated binaries, downloaded reference source, test receipts, private bus data and credentials are not source-package content.

Existing app distribution builds must not accidentally include this unfinished folder. The finished Showcase is packaged separately; the existing desktop app distribution continues to include its signed Android APK.
