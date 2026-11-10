# Import compatibility contract — implementation target

Source audit: js/ModuleLibrary.js at ParchLock5c4d7a4f.

Existing path: bindPicker -> addFiles -> addFile -> File.arrayBuffer -> inspect(bytes,name) -> SHA256 -> IndexedDB modules.put -> metadata/cache -> changed -> library refresh. The picker deliberately has no restrictive accept filter (Android story-file fix). Supported story inspection is Z-machine3/4/5/8, Blorb, raw Glulx and compatible wrappers. Archive/campaign ingestion is NOT implemented.

Required Showcase behavior:
1. Same Modules file picker and import progress/error presentation. No manual unpack or folder-copy installation.
2. Inspect bytes, not filename alone. Detect the declared package format safely; validate size/count/path limits, schema, entrypoint, engine compatibility, trusted release identity and every member hash before accepting it.
3. Commit one complete installed package/library record atomically, or leave the previous installation unchanged. A failed import must not leave20 separate adventures or half a campaign visible.
4. One title/author/version/library entry; entrypoint Main Hall. Duplicate/replacement detection uses existing identity mechanisms with a reviewed campaign schema; never masquerade as a .z8/.ulx wrapper.
5. Installed package survives offline/app restart. Remove, reimport, storage failure, upgrades, saves, learned-data ownership and existing erase controls are integrated into current ModuleLibrary/SaveState/LearningStores contracts.
6. App-owned host/privileged adapters remain app code. Imported package declarations cannot grant filesystem/network/device privileges or execute arbitrary package JavaScript. Self-declared hashes alone are not a trusted-release identity.
7. Existing story-file imports remain compatible. Required verification includes the real UI/file chooser on Android, desktop and hosted web, valid Showcase, duplicate, tampered/malformed/unsupported package and quota failure; then launch from its ONE library row into Main Hall.

No final file extension, binary/archive layout or manifest schema is being claimed as implemented here. Freeze it after G1 and the package-boundary review; use existing compatible components where available.
