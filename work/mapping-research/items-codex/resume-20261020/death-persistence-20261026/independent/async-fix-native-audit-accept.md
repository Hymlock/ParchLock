# Async fix and native metadata audit — ACCEPT corrected source

Read actual current SaveState callback: only new semantic guard is exact-path digest existence before recursively materializing ready state. Current same-context/generation/path checks remain. This closes the null-ready microtask loop without guessing identity or losing later ordinary observation retry.

Executed author-free async-null-ready.cjs: exit0; exactly1 null-ready subscription (previously21 at injected safety limit), future observation materializes correct run, genuinely deferred ready promise flushes queued death1, abandoned-context callback cannot flush old run and new path starts0. Exact fixture result: 'async null/deferred/stale-path regression PASS'.

Executed independent/glulx-startup-current.cjs against CURRENT live source, with10s per startup and30s overall watchdog: exit0. Actual Chromium AndromedaApocalypse.gblorb.js reaches real line prompt in400ms after navigation; CounterfeitMonkey.gblorb.js reaches real line prompt in803ms. Both zero page errors; rendered authored body captured in glulx-startup-current.json. No309 catalog repeat performed. No frozen failed candidate edits.

Current SaveState.js SHA256 DC9B85C6BAAF6EE9DAC62F03C222395B1FBAB23A4095C600FA843C098FCC10B6 supersedes prior8BD7... accepted hash. Corrected source ACCEPT for new immutable candidate/full candidate gate. Prior frozen candidate results remain rejected/partial diagnostic evidence, not eligible success.

Native audit: RotatingIconWidget.java diff contains exactly the agreed @androidx.annotation.ChecksSdkIntAtLeast(api = 26) addition before canPin, whose implementation still requires SDK>=26. SHA256 D8D11E747D481A78C9D479398D0F9403A32380E995C3902A64714DDD4BAC51E4. Inspected author-run android-lint-r2.txt: BUILD SUCCESSFUL in7s; warning/deprecation output remains visible. Did not rerun accepted lint or broader tests. Metadata fix accepted; no Android runtime behavior change.

Final immutable manifest must bind corrected SaveState hash plus same other accepted hashes and native packaging includes this exact annotation. Full corrected-candidate results/classification and APK artifact parity/signature still pending. No overall project/artifact completion claim.
