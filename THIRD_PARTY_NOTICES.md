# Third-Party Notices

This inventory describes components present in the ParchLock runtime or Android
build. License conclusions should receive qualified review before release.

| Component | Version/build | Declared license | Evidence |
|---|---|---|---|
| Parchment | vendored runtime | MIT | upstream Parchment LICENSE/inventory |
| Quixe | vendored `lib/quixe.js` | MIT | upstream Parchment inventory |
| ZVM / ifvms.js | vendored `lib/zvm.js` | MIT | source header/upstream |
| Emglken-generated loaders | 0.7.2 | MIT | exact-tag `LICENSE`, README component table, generated headers |
| Bocfel | Emglken WASM | MIT | upstream Parchment inventory |
| Glulxe | Emglken WASM | MIT | upstream Parchment inventory |
| AsyncGlk | vendored | MIT | upstream Parchment inventory |
| jQuery | 3.5.1 | MIT | `lib/jquery.min.js` header |
| jQuery slimScroll | 1.3.8 | MIT or GPL | vendored header; MIT selected |
| Roboto Mono | v31 asset | SIL OFL 1.1 | `css/RobotoMono-OFL.txt` |
| Capacitor core/android/cli | 8.5.2 | MIT | installed package metadata |
| Capacitor App | 8.1.1 | MIT | installed package metadata |
| Capacitor Community Speech Recognition | 7.0.1 | MIT | installed package metadata |
| Capacitor Filesystem | 8.1.3 | MIT | installed package metadata and `LICENSE` |
| Capacitor Share | 8.0.2 | MIT | installed package metadata and `LICENSE` |
| Capacitor Community Text-to-Speech | 8.0.2 | MIT | installed package metadata and `LICENSE` |
| Playwright (development only) | 1.63.0 | Apache-2.0 | installed package metadata |

## Emglken 0.7.2 Metadata Discrepancy

The exact upstream `v0.7.2` tag contains an MIT `LICENSE` and its README lists
Emglken, Bocfel, Glulxe, RemGlk and AsyncGlk as MIT. The same tag's
`package.json` contains a conflicting `GPL-2.0` field. The shipped files match
the installed `emglken@0.7.2` build byte-for-byte. ParchLock ships only its
Bocfel and Glulxe loaders/WASM; it does not ship the README's GPL-2.0 Scare or
TADS components. This notice preserves the metadata discrepancy rather than
hiding it. The license conclusion follows the tag's license text, component
table and source headers; qualified legal review remains appropriate.

Full license texts, checksums and reproducibility details are included with
`ParchLock-source.zip`. No story-module license is included here.

## Release review (operator, 2026-11-07)

Accepted as written by Hymlock Groves for the ParchLock releases. All shipped components are permissive (MIT, SIL OFL; Playwright is development-only). The Emglken 0.7.2 MIT/GPL-2.0 metadata discrepancy is accepted: ParchLock complies under either licence because every binary is distributed together with its matching ParchLock-source.zip (DISTRIBUTE.md step 10), and the release is free.
