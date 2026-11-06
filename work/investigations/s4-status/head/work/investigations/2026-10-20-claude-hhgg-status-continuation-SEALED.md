# SEALED - claude blind half: Hitchhik Equipment status continuation (#4275) - 2026-10-20
Not read: any codex artifact on this item.

Method: Playwright, games/Hitchhik.z5.js fresh boot, current checkout (5c66ce3+), visible = BufferLines without
aria-hidden/display:none; hidden lines listed separately; samples at +0.5/1.5/3/6 s.
Variants tried (all: NOT reproduced - no SCORE-related or probe text visible, and no hidden probe lines at all):
1. desktop 1400x900, boot, EquipmentUI.Show() (IsOpen true)
2. mobile 412x915, one LOOK first, EquipmentUI.Show()
3. same + click of a non-existent #refresh-inventory (falls back to Actionable.ShowInventory)
4. same + click #equipment-refresh (EquipmentUI.js:1130-1134 -> StatTracker.requestStatusFulfillment(true))
Candidate mechanism (unconfirmed): the Equipment refresh path requests a status fulfillment (a SCORE probe for this
title). If its continuation lines are ever emitted after the probe's hide window closes, they would show. Variant 4
produced no hidden lines either, so either no probe ran in this state or its lines are removed, not hidden.
Needed to go further: the exact trigger the operator used (tab click vs refresh button vs drag), device/viewport, and
the moment in play (turn count); or codex's repro command.
