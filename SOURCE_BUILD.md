# ParchLock Source And Build

`ParchLock-source.zip` is the corresponding-source bundle for the binary
beside it. It excludes story modules, internal planning material, test captures,
AI workflow files, build output, signing keys and secrets.

## Requirements

- Windows PowerShell and batch shell
- Node.js/npm matching `package-lock.json`
- JDK 21
- Android SDK and build tools

From a fresh Git clone (not this archive), run `npm ci` and then
`npx cap update android` once. That writes the generated, Git-ignored
`android/capacitor-cordova-android-plugins` files and refreshes
`android/app/src/main/assets/capacitor.plugins.json`; the `cap copy` step in
`build-android.bat` writes neither. `build-android.bat` stops with an error if
the plugin registry is missing or does not list every native plugin. This
archive already contains these files.

Run `npm ci`, then:

- `make-dist.bat` rebuilds the static runtime and source archive from explicit
  allow-lists. It also runs `build-pc-launcher.bat` (Windows `csc`) so
  `ParchLock.exe` sits next to `play.html` in the desktop folder. `build-android.bat`
  is the full distribution builder: it calls `make-dist.bat` for the PC folder and
  for Capacitor, then builds the APK. The PC launcher is stripped from Android
  web assets and must not enter the APK.
- `build-android.bat dev` builds a debug development APK.
- `build-android.bat release` requires the external signing environment
  documented in that script, performs a clean release build, and verifies the
  signature. It fails when signing material is absent.

The app icons (`img/icons/`, `img/favicon.*`, and the Android `mipmap-*`
`ic_launcher*` images) are finished artwork files used as-is by every build; no
build step regenerates them. They were produced from generated artwork (see
`CREDITS.md`) by the packing script `tools/icon-asset-pack.cjs`, which is kept in
the project repository rather than in the source archive.

The signing keystore and passwords must remain outside this project and every
archive. Story modules are not corresponding source and are not included in the
source archive.

## Emglken Runtime Provenance

The shipped files are exact copies from `emglken@0.7.2`:

| File | SHA-256 |
|---|---|
| `bocfel.js` | `2457193256BD13349AB8DA6D8E02AB8F3AB2AF4932D1F6C9B6B00092529413EC` |
| `bocfel.wasm` | `3F1DFEC7CD45DCF6DED87AF968713BF23579646D9CE24BFC7E35564B2108DD1B` |
| `glulxe.js` | `6D370730F7F745A6E70A17B09F581DE5B0C711731AAA0581814AFC6A23BC6134` |
| `glulxe.wasm` | `6544C4C909C965B8D1DEE287043F10B70B4E500E9A22E99D549E072333D94920` |

The package tarball integrity is pinned in `vendor/emglken-stage/package-lock.json`.
For a source rebuild, check out Emglken tag `v0.7.2` recursively and run its
documented build. That tag pins AsyncGlk `67ff50261a8fa917e25141d79a9da4449ec64903`,
Gargoyle/Bocfel `cca807be21d78588cf483317a0eda2769c5ee811`, Glulxe
`56ab8743bab565de307bd892c555d8d8897ed517`, and RemGlk
`34e0ed91c1d6949862409c19d1b11816debb9ade`.

The exact tag's MIT license and its conflicting `package.json` license field are
both documented in `THIRD_PARTY_NOTICES.md`; the discrepancy is not concealed.
