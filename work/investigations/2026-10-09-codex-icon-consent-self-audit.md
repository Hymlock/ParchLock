# Native icon consent self-audit and APK66 delivery

Operator authorized solo takeover because Claude is out of credits. Bus handoff2268, findings2269. No independent-peer consensus is claimed for this takeover.

## Cause and repair

APK65/v38 phone crash captured from Android DropBox (logcat crash buffer was empty): IllegalStateException registering ActivityResult at RESUMED. Stack: ActivityResultRegistry.register -> Bridge.registerForActivityResult -> BridgeWebChromeClient constructor -> BridgeActivity.load -> ParchLockActivity.finishLoad -> answer. Original and reproduced failure agree. The official AndroidX registry enforces registration before STARTED: https://raw.githubusercontent.com/androidx/androidx/androidx-main/activity/activity/src/main/java/androidx/activity/result/ActivityResultRegistry.kt .

Native-only IconConsentActivity now records consent and starts a new ParchLockActivity. No Bridge exists in the consent Activity. All WebView/plugin registration occurs in normal onCreate before STARTED. The splash receives the original scene. Destroyed callbacks cannot answer or launch, Back means Not now, and existing promptAsked semantics remain.

Experimental Options controls, plugin setter, real-exit alias changes, four IconX aliases, and obsolete timing policy are removed. Only the owned pinned shortcut and PC desktop shortcut rotate. MainActivity alias stays. Package-replacement receiver can repair the previously disabled base entry; receiver registration is packaged, but actual previously-disabled-base upgrade was not simulated on the operator's home screen.

Artwork inspected at source and against the phone screenshot: one large book in the source bitmap. The small corner book is supplied by the launcher as the shortcut's app badge; replacing source artwork would not remove the launcher-owned badge. Approved images preserved.

## Verification

- Actual ParchLockActivity and actual IconConsentActivity compiled against focused lifecycle doubles:11/0, including rejection of late Bridge construction, native Add, Back, stale destroyed answer, queued Home/return, one advance and restored scene.
- Full Android Java compile and dev APK build PASS; JS syntax and scoped diff PASS.
- Live REDMAGIC NX799J Android16: installed APK66/v39 in place with adb install -r. Saves/app data not cleared. Only icon promptAsked temporarily reset to exercise consent; test-only preference backup removed afterward.
- Live native Add -> real ParchLockActivity -> startup splash PASS; Home kept process18864 alive; returning HOT kept same PID PASS. No APK66/v39 ParchLock crash record in DropBox after test. Existing owned pin update exercised; creating a brand-new pin on an empty home screen was not repeated.
- APK v2 signature PASS; compiled manifest retains MainActivity, contains IconConsentActivity and package replacement receiver, has no four experimental aliases.
-501 APK public files byte-identical to generated assets, BUILD66/cache153, both new native classes in dex; corresponding source ZIP matches build checkpoint22899da.

## Delivery

APK: C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-build66.apk
87805215 bytes; SHA2565cf1ba157ea9b6fb79b34dcfe9c249a247514895c97bcdda80503d01f8d50fae.
Source ZIP: ParchLock-source.zip,27079408 bytes; SHA25637bf1dd1284bd340339cdf71b79a51376bd9b68a4bedc7206677479b6e17917b.
Named copies preserved in operator ParchLock-APK-archive. Build65 and generated outputs preserved before build66.

Architecture, user guide, privacy and release notes updated. PRODUCTION_PLAN still held by Claude; authenticated claim refused409, so left untouched. This report is the exact plan handoff: replace D215 issue1's deferred Bridge construction and experimental controls with the contract above and add the actual v38 stack/v39 live proof. Remaining queue2-10 unchanged. No overall project completion.

## Follow-up: tiny corner icon, live A/B

Operator reports all functions now work except the small picture. Active launcher resolves to com.zte.mifavor.launcher/com.android.launcher3.uioverrides.QuickstepLauncher. Android's shortcut service lists one owned parchlock-rotating pin. Source foreground bitmap is single-book artwork. A controlled temporary native-only build changed Icon.createWithAdaptiveBitmap(out) to Icon.createWithBitmap(out); the live shortcut flags changed from adaptive PinIc-fIc-aStr to plain PinIc-fStr, and the corner book remained. The large map scene and the fixed archive badge differed. Thus changing bitmap format does not remove this launcher's app badge. Plain-bitmap experiment reverted in source; original signed APK66 reinstalled with -r successfully, preserving app data. The test build was not delivered or archived as a release.

Official AOSP Launcher3 IconCache.getShortcutIcon unconditionally attaches getShortcutInfoBadge; getShortcutInfoBadge reads the associated activity's app icon: https://android.googlesource.com/platform/packages/apps/Launcher3/+/3f442007d0/src/com/android/launcher3/icons/IconCache.java . This corroborates the device observation; vendor source itself is not publicly verified.

Operator preference requested asynchronously: badge-free rotating 1x1 app widget or fixed normal app icon. No widget implementation started without the answer. Also requested clarify native consent copy: existing owned pin updates in place; ordinary launcher-created app icon cannot be automatically replaced through ShortcutManager. That wording refinement remains pending while the preferred surface is chosen.


## Widget follow-up / build67 closeout (2026-10-09)

Widget99d17c0 corrected by8a12b95 independently accepted Claude2291. Operator-approved final default2?2 is measured from actual widget bounds40,179..608,833, cell284?327. Resize1?1..4?4 works live, artwork badge-free/full book. Consent requested path waits for system placement rather than launching game over sheet; then-tap instructions avoid promising an Android background callback. Legacy owned-pin retirement isolates exceptions. Activity12/0, compile/lint, node syntax pass. Home return scene0 samePID27479; fresh launch advances1. Approved2?2 visible screenshot widget-operator-size.png;4?4 proof widget-resized.png.

Build67/version40/cache154 compiled and signedv2. APK all501 bundledpublic files exactly match generated assets; source365 currentfile matches. APK87819118bytes SHA256a653585f1130b0f22abd17f00f08e34f1cbd3a440048cbe2e675da70d7da4ee3. Source SHA256d9834244ecead06073424922528d728266cee20b6012426f30ae01662c7b275d. Dist ParchLock-build67.apk and ParchLock-source.zip; operator archive has build67APK and named source. Installed in place successfully, no data clear/uninstall. Source archive refreshed for plan/workflow acceptance560f8f2; historic packaged checkpoint precedes independent item2 investigation/proposal. Widget completed only; extended items2-10 remain active per2293/2294. No overall goal completion.
