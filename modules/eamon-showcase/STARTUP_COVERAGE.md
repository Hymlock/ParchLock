# Native startup coverage — bounded desktop evidence

November 11, 2026: all 20 player adventures have desktop Chromium evidence of entering native gameplay
through the real Main Hall in the untrimmed G1 host. Nineteen dedicated fresh-character launch checks
asserted the expected plugin/adventure phase, line input and top-level safe point. Beginner's Cave uses
the already executed current full-session receipt, rather than repeating its startup proof.

Tested published boot SHA-256:
`40e94becbf0df270386af0f47e535bd9dc016b0dd9006dd94d24fe5002c0cc64`.
The private receipt ledger records exact host C# input hashes and per-receipt hashes. Subsequent builds
do not inherit this result automatically; source/documentation commits alone are not executable identity.

| Player adventure | Observed scope |
| --- | --- |
| Alternate Beginner's Cave | Native launch to command prompt |
| A Runcible Cargo | Native launch to command prompt |
| Beginner's Cave II | Native launch to command prompt |
| Beginner's Forest | Native launch to command prompt |
| DharmaQuest | Native launch to command prompt |
| Escape from Mt. Moon | Native launch to command prompt using shared EamonRT engine |
| Firestorm | Native launch to command prompt |
| Land of the Mountain King | Native launch to command prompt |
| Orb of My Life | Native launch to command prompt |
| Stronghold of Kahr-Dur | Native launch to command prompt; quest cases remain open |
| The Beginner's Cave | Existing current full-session receipt includes native launch |
| The Deep Canyon | Native launch to command prompt |
| The Pyramid of Anharos | Native launch after the offered no-guide choice |
| The Sub-Aquan Laboratory | Native launch to command prompt |
| The Temple of Ngurct | Native launch to command prompt |
| The Tower of Eamon | Native launch to command prompt using shared EamonRT engine |
| The Training Ground | Fresh novice admitted; expertise 25/26 boundaries remain open |
| The Vile Grimoire of Jaldi'al | Current untrimmed native launch to command prompt |
| The Wayfarers Inn | Native launch to command prompt |
| Wrenhold's Secret Vigil | Native launch to command prompt |

`host/launch-cases.json` records native fileset IDs/plugin names from the pinned source catalog, not
invented tiers. `host/Write-LaunchScript.ps1 -Modules <selected module names> -Work <private scratch>`
writes bounded input scripts for `run-host-probe.cjs`. Select unfinished or changed cases deliberately;
do not repeatedly rerun the whole catalog. These fixtures assume the current pinned native catalog.
Pyramid's initial script correctly stopped as incomplete at an unhandled guide question; source was
checked and the explicit offered no-guide choice added. That initial receipt was retained, not erased
or relabeled as a runtime failure.

This is not campaign unlock enforcement, principal outcome/critical behavior coverage, native-platform
fidelity comparison, full rights clearance, independent review, world/Equipment/action integration or
signed Android/import acceptance. Demo/Sample/Test support entries remain engineering scope and are not
counted as player adventures. The final package remains one imported module, not twenty library rows.
