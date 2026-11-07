# Carried container became the inventory root (Advent wicker cage) - claude, 2026-11-07
Found while capturing itch.io screenshots. Present in Build 83 too (rel-base tree), so not a regression from today's work.
Repro: Advent.z5 east; take all; west; south x3; unlock grate with keys; open grate; turn on lamp; down; west; take cage;
west; take rod; west; west; drop rod; take bird; inventory. Native inventory: cage(bird), bottle(water), lantern, food, keys.
App: payload playerId 58 (the cage), inventory [little bird], Equipment "Yourself, cheerful little bird".
Cause: AttrCalibrator D75 learner (verbSuccess analyze, ~line 1147) records the insert_obj target of any successful take as
table.inventoryRootId. TAKE BIRD inserts the bird into the carried cage, so the cage became the confirmed root;
ZRamProvider.resolveInventoryRootId returns the confirmed root before the player. resolvePlayer itself stayed 20.
Fix: AttrCalibrator.inventoryHolderIsCarried(mem,id) - true when the holder's parent chain reaches the resolved player or the
already-confirmed root. The learner skips such holders; confirmedInventoryRootId also rejects one (clears stale learned values).
Real holders (wump2ka custom player, Sherlock PC) hang off the room, not the player, so they are still learned.
Peer review: no seat available (grok, grok2, codex out of usage); peer audit owed on return.
Tests: harness/carried-container-root.js 10/0 (control on the unfixed tree: 8 FAIL). Guards: attr-calibrator-inventory-root 13/0,
attr-calibrator-phase-cd 30/0, d201-unresolved-actions 24/0, d214-npc-possession 15/0, hhg-links-live 22/0,
pellets-inventory-live 48/0, operator-regressions 13/0, sherlock-pocket-worn 15/0, zil-light-unresolved-player 11/0,
import-recognition 7/0, b7-snapshot-memo 44/0. Full 309 gate: see GATE.md.

Gate (operator 11-07: full 309 not required for this fix): first 91 games of the full run 0 differences; targeted 8 (Zork1, curses, edifice, heist, lost, minster, spirit, wump2ka) 0 differences. 99 games total, 0 diffs.
