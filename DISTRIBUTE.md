# Internal Distribution Checklist

This file is repository-only and must never appear in runtime distributions or
Android assets.

For browser verification, serve the generated folder from a local static web server.
Opening the HTML directly still plays modules, but service-worker
offline caching requires localhost or HTTPS.

1. Resolve all open items in `THIRD_PARTY_NOTICES.md`, including exact WASM
   source/tag provenance and qualified legal review.
2. Record splash-art provenance and complete the ParchLock name-clearance check.
3. Remove story modules selected by the operator and review the resulting
   library. No automated story-rights gate exists.
4. Run `make-dist.bat`; confirm runtime and source manifests contain only
   declared files.
5. Set intentional Android versionCode/versionName.
6. Set external signing environment and run `build-android.bat release`.
7. Record `apksigner verify --print-certs` output and artifact hashes.
8. Decode and scan the APK, PC package and source zip for internal files,
   absolute paths, secrets, legacy branding and stale references.
9. Run desktop/mobile/offline tests and the complete regression suite.
10. Distribute the binary only with its matching `ParchLock-source.zip`.
