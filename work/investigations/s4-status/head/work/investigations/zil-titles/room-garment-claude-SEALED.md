# D11 ZIL rooms rejected as garments - claude half (SEALED 2026-10-30)

Problem statement (for the other seat): ZRamReader.isPlausibleMapRoom rejects any object whose attrs read
clothing/wearable/worn. Many real ZIL rooms read that way, so the room check refuses them. Why, and what is the fix?

## Findings (claude + claude worker; work/investigations/claude-probe/roomreject/)
1. Rejection sites: js/ZRamReader.js ~1698 and ~1782 (clothing/wearable/worn -> false). The code comments (~1690, ~1780)
   show the intent was objects only (Anchorhead "Michael's pants"), never places. There is no D-entry for it.
2. Suspended (63 rooms) and Planetfall (39 rooms): an Inform PROFILE leak. `clothing` is not in AttributeSchema's ZIL
   fail-closed set (zilStructural, ~line 233), so it reads PROFILE bit 2. Bit 2 is Planetfall FLOYDBIT and Suspended
   ONBIT, both on rooms. Their mapped `wearable` (Planetfall 22, Suspended 31) is correct and is not what fires.
3. Moonmist (18 rooms): a real mapped bit reused. `wearable` 29 = WEARBIT is correct for garments, but Moonmist also puts
   WEARBIT on rooms to mean WING-ROOMS (castle.zil:23/36/60, global.zil:45/292; FOYER FLAGS include WEARBIT).
4. Visible effect: none found natively in Planetfall. Rejected rooms still reach the map through the current-room
   containmentProven bypass (MapTopology.js ~619/667) and look-ahead. Latent risk: gated paths (ExitCalibrator ~593,
   MapTopology ~306/532, ZRamReader room fallbacks ~1839/1900/1938) could drop edges for a rejected room.
5. Ballyhoo/Hollywood/Wishbringer/Zork1 hits are non-rooms (a veil, unnamed objects): correct rejections.

## Leaning
(a) Add clothing and wearable to zilStructural fail-closed (a measured attributeMap still wins) to remove the PROFILE
    leak. This clears the 102 Suspended/Planetfall rooms. It is also deferred item D6.
(b) For bit reuse (Moonmist), the garment rejection should not apply to an object that is structurally a room (a child
    of the rooms root, with an exit table). Restrict the garment test to non-room-shaped objects instead of trusting a
    bit that a title reuses for rooms. No hand ID lists (no masking).
Prior guards: D134, D201, D214, D240, D57/D58/D75/D79 (wrong-room cascades). Harnesses: d214-zil-exits, exit-calibrator,
d23-*, d46-room-identity, world-map-layout/ui, operator-regressions, the 309x2 gate.
