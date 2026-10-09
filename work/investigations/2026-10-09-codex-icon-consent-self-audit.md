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
