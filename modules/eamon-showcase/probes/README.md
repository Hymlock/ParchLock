# Isolated runtime feasibility probes

Engineering fixtures, not an installed module or a second product. None is loaded by the ParchLock app. No imported package is allowed to install these scripts as privileged app code.

`Prepare-Probe.ps1 -Upstream <clean pinned Eamon-CS checkout> -Work <new scratch directory>` copies the needed reference projects into scratch, creates a .NET 8 browser fixture, publishes it, and runs the input check with the existing ParchLock Playwright dependency. It does not modify the upstream checkout, install a workload, launch paid agents, or publish a release. SDK 8.0.404 (latest patch allowed), Node, existing Chromium/Playwright and NuGet access/cache are prerequisites. Generated projects, binaries and receipts stay in scratch.

Pinned reference commit: `5db64a37afe0b5455ee477e067fca4e6d249e419`. EamonRT requires EamonDD transitively; retain this project in the feasibility graph.

The worker loads the .NET interpreter and calls a C# function containing two synchronous JavaScript input calls. A service worker holds each local request until the page replies. Checks require ordered replies, continued page heartbeat, ignored duplicate replies, and cancellation without issuing the next request. The mechanism preserves the managed call stack; it does not replay engine execution. The fixture is single-client and intentionally not production hardened (no per-session client authentication, durable request ownership, lifecycle journal or navigation recovery).

## Evidence and limits

On November 10, 2026, local headless Chromium passed the two-response/heartbeat and cancellation checks. A separate browser fixture reflected Eamon/EamonRT/EamonMH and two adventure assemblies and deserialized/reserialized the real Beginner's Cave MODULE.DAT (26 rooms, 24 artifacts). These are partial feasibility results only.

G1 remains OPEN: actual Eamon gameplay/console adaptation, nested fields, RNG fidelity, atomic persistence and restore, memory/timing budgets, all target deployments, Android WebView and hosted iframe/offline operation are unproven. The installed Capacitor source contains a service-worker request bridge with default resolution enabled; source presence is not an Android execution test. No Android device/emulator was connected at this check. Do not adopt this transport or change production imports on the strength of desktop results alone.

`EamonProbe.cs` provides the reflection/serializer fixture method. `run-storage-probe.cjs` commits its actual serialized module output into an isolated IndexedDB database, closes the persistent Chromium process, starts a fresh process with the same scratch profile, and deserializes the stored bytes. This passed with identical Beginner's Cave title/room/artifact counts on November 10. It does not prove engine saves, multi-file atomicity, campaign progress or production learning persistence. The scratch profile remains as evidence and contains no production app storage. The prepare script runs both input and storage checks.

Status update (2026-11-12): the playable importable Showcase now exists (host/ and docs/EAMON_SHOWCASE_PLAN.md); the notes above describe the November 10 feasibility fixtures only. Gate G1 is measured per target in the plan (desktop done; the Android measurements are part of the Build 87 phone session). Contract tests: contracts/README.md.

## Ordinary-module regression protection

`run-existing-module-regression.cjs` uses `PARCHLOCK_SOURCE_ROOT` and a private
`PARCHLOCK_REGRESSION_WORK` directory. It decodes existing repository stories into scratch fixtures,
imports them through the real Modules file input/change handler, checks compatible-wrapper duplicate
detection, and interacts with imported Z3/Z5/Z8/Zblorb/Gblorb/raw-Glulx stories. It also reloads imported
Z5 and raw Glulx with browser networking offline and checks no Eamon VM was selected. It does not modify
the operator's existing browser profile, source story files or installed APK.

Set `PARCHLOCK_REGRESSION_SAVE_PROBE=1` for the bounded Adventure Z5 lifecycle check: obtain the lamp,
operate its supported switch commands, save through the normal dialog, leave the saved room, load the
save and assert the restored status line. The actual persisted AttrCalib record must survive page reload
unchanged. This is not a full audit of every learning store, radial preference, save sidecar, undo or
erase control. It does not test the differently titled Humongous Cave story. No authentic Z4 fixture
has been exercised here; Android signed-APK regressions remain mandatory. These tests passed in local
Chromium on November 11, 2026; they do not certify every story or waive those gaps.

## Same-metadata file changes (G1 host continuation)

`MetadataProbe.cs` targets the actual host's `Persistence.Flush`: it baselines bytes 1/2/3, writes
4/5/6 with equal length and a fixed identical timestamp, then flushes twice. The old metadata-only
scanner missed the changed file entirely. The content-based candidate stages the exact changed bytes
once and commits once; the unchanged second flush does nothing. This passed in local Chromium.

To reproduce, copy only this probe C# file into an already prepared private `eamon-host` scratch project,
publish it, then run `run-persistence-probe.cjs` with `PARCHLOCK_SOURCE_ROOT` and `PARCHLOCK_HOST_WORK`.
Inspect `codex-metadata-receipt.json`: `sameStamp` must be true, staged bytes must be `[4,5,6]`, and commits
must equal one. Remove the copied probe from scratch and rebuild afterward; it is not runtime/package
content. No source engine changes are needed. The candidate keeps previous file bytes in memory for an
exact comparison and stages those same scanned bytes. Its memory/performance cost still needs real-target
measurement; this narrow test does not certify gameplay saves, transaction failure or campaign identity.

## Native visibility-query side effect

With `VisibilityProbe.cs` copied into the private host scratch project, select
`PARCHLOCK_PROBE_CASE=visibility` in the same `run-persistence-probe.cjs` harness. The actual base
Room/Artifact fixture starts with an unlisted artifact whose Seen flag is false. Calling the native
`IsArtifactListedInRoom` returns false but sets Seen true; a direct field/custody comparison in that
controlled fixture leaves it false. This passed in Chromium. The fixture replaces only primitive
category construction; it is not a full world provider, a visibility specification for custom
adventures, or proof that every unlisted object is hidden. Remove the copied probe and rebuild afterward.

## App acknowledgement ordering and fatal failures

The host runners support isolated injected fault controls; never use them with real user profiles.
`PARCHLOCK_HOST_FAIL_COMMIT=1` rejects the first native storage transaction, and the app runner also
accepts another transaction number. `PARCHLOCK_HOST_FAIL_RESULT=1` injects a returned engine-error
message. The tests require a visible error and worker termination, not silent waiting. They do not
produce an actual native serializer failure or establish mid-write crash/real-quota safety.

`PARCHLOCK_HOST_DELAY_ACK=250` in `run-app-probe.cjs` delays delivery of IndexedDB's completion callback
and checks that neither a new prompt nor successful-exit event is published first. Before the candidate
fix the bounded session violated ordering; afterward six writes/six acknowledgements had no violation.
The real transaction has already completed during this artificial delay: it tests acknowledgement/UI
ordering, not database atomicity. The normal app session and injected storage-failure checks also passed.
The standalone diagnostic page's raw output buffer is not the production story/narration delivery path.
