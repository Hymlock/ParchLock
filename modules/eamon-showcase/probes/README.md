# Isolated runtime feasibility probes

Engineering fixtures, not an installed module or a second product. None is loaded by the ParchLock app. No imported package is allowed to install these scripts as privileged app code.

`Prepare-Probe.ps1 -Upstream <clean pinned Eamon-CS checkout> -Work <new scratch directory>` copies the needed reference projects into scratch, creates a .NET 8 browser fixture, publishes it, and runs the input check with the existing ParchLock Playwright dependency. It does not modify the upstream checkout, install a workload, launch paid agents, or publish a release. SDK 8.0.404 (latest patch allowed), Node, existing Chromium/Playwright and NuGet access/cache are prerequisites. Generated projects, binaries and receipts stay in scratch.

Pinned reference commit: `5db64a37afe0b5455ee477e067fca4e6d249e419`. EamonRT requires EamonDD transitively; retain this project in the feasibility graph.

The worker loads the .NET interpreter and calls a C# function containing two synchronous JavaScript input calls. A service worker holds each local request until the page replies. Checks require ordered replies, continued page heartbeat, ignored duplicate replies, and cancellation without issuing the next request. The mechanism preserves the managed call stack; it does not replay engine execution. The fixture is single-client and intentionally not production hardened (no per-session client authentication, durable request ownership, lifecycle journal or navigation recovery).

## Evidence and limits

On November 10, 2026, local headless Chromium passed the two-response/heartbeat and cancellation checks. A separate browser fixture reflected Eamon/EamonRT/EamonMH and two adventure assemblies and deserialized/reserialized the real Beginner's Cave MODULE.DAT (26 rooms, 24 artifacts). These are partial feasibility results only.

G1 remains OPEN: actual Eamon gameplay/console adaptation, nested fields, RNG fidelity, atomic persistence and restore, memory/timing budgets, all target deployments, Android WebView and hosted iframe/offline operation are unproven. The installed Capacitor source contains a service-worker request bridge with default resolution enabled; source presence is not an Android execution test. No Android device/emulator was connected at this check. Do not adopt this transport or change production imports on the strength of desktop results alone.

`EamonProbe.cs` provides the reflection/serializer fixture method; the automated input runner currently tests `InputProbe.cs`, not full gameplay or the serializer. No playable importable Showcase file exists yet.
