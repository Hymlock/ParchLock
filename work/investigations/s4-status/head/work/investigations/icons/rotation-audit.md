# Native icon rotation audit, Codex, 2026-10-09

Accepted current rotation implementation after bus2177 corrections; acceptance
2181 and peer checkpoint`a1e5035`. Proposal R3 was reviewed against current code
and D215. Default pinned-shortcut mode preserves the launcher component. The
experimental base-icon path is off by default and requires explicit warning
confirmation; the operator authorized this experiment on their phone.

The runtime Activity remains enabled; aliases are switched only on a permitted
background boundary. File picker, share, speech and pin-confirmation launches
are suppressed; configuration changes are excluded. Below API26 no pin is
offered. A failed update does not advance the scene. Pending experimental state
is committed after successful component operations. Plugin registration stays
before BridgeActivity creation.

Desktop ownership is shared by creation/re-offer and rotation. A shortcut
replaced by the user is skipped. Deleted shortcuts are not recreated. Settings
use atomic file replacement; scene and consent persist.

Independent focused validation:

- Android`:app:compileDebugJavaWithJavac` passed after the final correction.
- Actual Windows COM shortcut fixture:6 pass,0 fail in a checked temporary
  directory. Its recursive cleanup verifies the resolved target first.
- Real browser with mocked native bridge: experimental enable sends no call
  before confirmation; Cancel receives focus and leaves the option off;
  confirmed enable and disable send exactly the expected requests.
- Read-only source review of manifest entries, API guards, safe-area foreground
  composition, failure state and current-intent handling.

The mock does not prove Android launcher behavior. Placement, refresh timing,
screen-lock behavior and the opt-in experimental home-screen effect are for
operator testing **after the APK is supplied**, not a packaging gate.

Shell149 includes the native controller and manifest icon assets. No module
catalogue sweep or unrelated runtime changes were made for this audit.
