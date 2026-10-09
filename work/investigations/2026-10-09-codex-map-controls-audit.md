# Browsed-room controls: G3 implementation audit

Operator chose fade until touched (bus2114); proposal2117 with amendment2119 was recorded in D215 before implementation. Back and Go retain original24px geometry and Draw/GotoRoom handlers. At rest opacity is0.30; fine-pointer hover, keyboard focus or a revealed touch state makes them opaque.

Only a first touch on an unrevealed icon is consumed. A name/body tap keeps immediate RoomClicked and reveals the resulting displayed node after Draw. Subsequent icon taps use existing handlers. No toolbar relocation, room geometry, graph, route authority, handles or periodic timers changed. Existing div icons gain button semantics and Enter/Space activation.

Claude R1 audit2132 identified interrupted-touch pointer state. The repair resets on new primary touch, map close/outside touch, window blur and document hidden, preventing native overlays/backgrounding from permanently disabling controls. Cancel, multi-touch and displacement cannot activate a route. Draw resets reveal; keyboard focus remains visible while focus persists.

Validation: actual-source Playwright45/0 at320/390/1280 in both themes; native first/second Go, Back, neighbour browsing, keyboard, mouse, close/outside and missing-up recovery. Cancel/multi-touch/displacement are injected pointer negatives. d48 destination3/0 and real map-pathing pass. Screenshots are TEMP/g3-width-theme.png. Claude independently ran focused45 and WorldMap52 and accepted2138. No physical-phone or APK validation claimed.
