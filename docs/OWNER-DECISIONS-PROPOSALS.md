# Owner decisions — proposals (plan §12)

## Locked 2026-11-14
| Item | Decision | Code |
|---|---|---|
| Hall X | → Exit game | `EamonProvider.interceptLeaveUniverse` + `Actionable.Submit` |
| Eamon settings | Options section only if Showcase installed | `WorkspaceUI.ShowOptions` |
| Pyramid carpet | Rooms only (no teleport edge) | status quo |
| Learning | Per module install (not campaign) | already correct |
| Refusal dialog | Download Package first | verify when UI present |

## 1. Hall “X. Temporarily leave the universe”

**Current:** Engine dead-end: `[You have left the universe. Reopen the module…]`  
**ParchLock:** Exit game already returns to the library with campaign committed.

**Proposal:** Map Hall **X** to ParchLock **Exit game** (same commit path as leaving any story). No parallel “universe left” screen.

**Accept:** reply ACCEPT-X  
**Reject:** leave engine text as-is.

---

## 2. Eamon SETTINGS vs ParchLock Options

**Current:** Typed SETTINGS is a second options system (verbose, combat pauses, mature content, etc.).

**Proposal:** Add a **Showcase** section under ParchLock Options whose toggles issue the engine’s own SETTINGS commands behind the scenes. Typed SETTINGS still works. Wayfarers mature-content opt-in stays in-game (author content gate).

**Accept:** reply ACCEPT-SETTINGS  
**Reject / amend:** say what stays typed-only.

---

## 3. Pyramid flying carpet map line

**Current:** Teleport destinations appear as rooms; no edge from departure room (engine has no exit edge).

**Proposal A (status quo):** Keep destination-only rooms (honest to engine exits).  
**Proposal B:** Optional dashed “teleport” edge with label (cosmetic; not a walkable exit).

**Accept A or B:** reply CARPET-A or CARPET-B.

---

## Phone (Build 98)

See `docs/PHONE-B98-CHECKLIST.md`. Dist: `Downloads\ParchLock-dist-b98`.
