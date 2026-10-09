# Codex independent cleanup inventory ? sealed before peer findings

APK64 already verified and independently confirmed2186. No files removed.

## Evidence and boundaries

- Existing .gitignore covers dependencies, generated Android/Capacitor assets/build output, runtime bus state, game modules, user data, screenshots and secrets.
- make-dist.bat explicit allowlists exclude tmp, internal planning and investigation records from runtime/source packaging. Native source and tools are deliberate source-bundle inputs.
- SOURCE_BUILD.md depends on vendor/emglken-stage provenance and native-hooks source. ARCHITECTURE_UML.md/PRODUCTION_PLAN.md cite investigation reports and screenshots and work/status-audit proofs; these are evidence, not disposable debris.
- git status has a pre-existing harness/equipment-ui.js modification. Preserve it. Do not remove any tracked files or games; operator owns story pruning.
- APK63/64 and preserved-generated folders outside the checkout are operator archive records, not automatic cleanup candidates.

## Untracked inventory

{
  "Counterfeit Monkey-startup-data.glkdata": [
    1,
    39182
  ],
  "alabstersettings.glkdata": [
    1,
    91
  ],
  "harness/_ scratch probes": [
    30,
    70025
  ],
  "shot.png": [
    1,
    9440
  ],
  "tmp": [
    259,
    4594802
  ],
  "work/investigations": [
    145,
    11028243
  ],
  "work": [
    1689,
    167366015
  ]
}

Reparse/symlink census of candidate scratch/evidence trees: []

## Proposal candidates (not implemented)

1. Prefer exact ignore entries for /tmp/, root *.glkdata runtime data and /shot.png after confirming their generators. No deletion.
2. Do not blanket-ignore work/, work/investigations/, harness/_*.js or images: durable evidence/new tests can live there. Existing probes should be manually classified from references before any archival/removal.
3. native-hooks/build/ is generated compiler output (CMake artifacts), unlike native-hooks/build.ps1; exact directory ignore is appropriate after peer compare.
4. Internal root tools/_bus*.txt and old Full Stack Engine Level Conversion.txt require provenance/reference review, not automatic deletion.
5. Avoid broad *.json/*.png/*.txt ignores. Packaging allowlist remains unchanged. No effect on APK/runtime code.

This is a narrow safe cleanup baseline. Space reclamation requires a subsequent exact, reference-checked archival proposal; absence from packaging alone is not deletion authorization.
