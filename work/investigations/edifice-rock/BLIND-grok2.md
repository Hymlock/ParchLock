# BLIND: Edifice rock inventory vs Equipment empty — grok2

**Problem:** After `take rock; drop rock; take rock; throw rock at recess; take rock; enter edifice; open door; east; inventory`, game prints `You are carrying: Useful Rock` but Equipment shows only Yourself and payload inventory is empty; retake restores.

**Constraint:** Did not read `work/investigations/edifice-rock/` prior notes or bus discussion of this bug.

**Method:** Playwright `games/edifice.z5.js`; RAM objectLinks + `WorldModel.lastPayload` after each step. Artifacts: `blind-log.json`, `blind-ram2.json`.

---

## Repro (this seat)

After full path to **Near the Arch** + `inventory`:

```text
Game text:  You are carrying: / Useful Rock
payload.inventory:  []
snapshot walk from findPlayerId: []
Equipment (from payload): empty of rock
```

---

## RAM structure (smoking gun)

| Id | shortName | role |
|---:|---|---|
| 20 | `(self object)` | **`findPlayerId` / `resolvePlayer` result** — parent 0, **no children** |
| 27 | `(PrimitivePlayer)` | early body; after take rock, **rock.parent = 27** |
| 57 | `(HungryPlayer)` | later body after east; **rock.parent = 57** |
| 41 | `Rock` | moves 33→27→…→**57** |

After first successful take:
- `rock.parent === 27` (PrimitivePlayer)
- `payload.inventory` contains Rock with `parentId: 27` ✓

After east into grass room + inventory:
- Game lists Useful Rock (true)
- `rock.parent === 57` (HungryPlayer)
- `findPlayerId === 20` still (empty self object)
- `payload.inventory === []` ✗
- `walkVisibleDescendants(20)` empty ✗

There is **no `yourself` printable name**; the live PC is a **class-named holder** that **changes id** (27 → 57) while the probe id stays 20.

---

## Why Equipment empties

1. `ZRamReader.snapshot` walks inventory from `playerId` (= resolvePlayer → **20**).
2. `ZRamProvider.collect` re-roots via `resolveInventoryRootId(mem, snap.playerId, …)` then `walkVisibleDescendants(invRoot)` (D31/D53/D75).
3. When rock was under **27**, root resolution could still surface inventory (confirmed take root / holder-with-children).
4. After the story **swaps the player instance** to **HungryPlayer 57** and reparents the rock there, inventory root resolution **does not follow** to 57:
   - probe playerId 20 still empty-handed
   - **confirmedInventoryRootId** (if set on take) likely still **27**, now empty
   - room-scope animate scan may not treat `(HungryPlayer)` as the D57 “animate plural holder” shape (or it’s not in discoveredObjects as a normal animate PC)
5. EquipmentUI renders **payload.inventory** → empty while native V-INVENTORY still walks the real holder (57).

Retake “restores” because a new successful take re-observes insert into the **current** holder and refreshes confirmed root / children under the live body.

---

## Not the cause

- Rock `takeable`/attrs look fine when held under 27.
- Map/room id (33 vs Near the Arch) is separate; bug is **inventory root identity**, not room scope hiding the rock.
- Not an EquipmentUI-only bug: payload inventory already empty.

---

## Call chain

```text
Input.Inject("inventory")
  → VM prints "You are carrying: Useful Rock"  (native holder 57)
  → WorldModel.tick → ZRamProvider.collect
       → resolveInventoryRootId(playerId=20, …)  → wrong/stale root
       → walkVisibleDescendants(root) → []
  → EquipmentUI.model from payload.inventory → no Rock
```

---

## Fix direction (pointers only; blind step)

1. **Inventory root must track the object that currently parents carried takeables**, not only the first confirmed root or empty self object.  
2. When `confirmedInventoryRootId` has **zero children** but some room/global object parents the last taken id, re-resolve.  
3. Prefer parent of last successful take’s object if still a “player-shaped” holder (child of room, holds takeables).  
4. Do not trust `findPlayerId` alone for Inform games with `(PrimitivePlayer)` / `(HungryPlayer)` style body swap.

---

## Bottom line

**The rock stays in RAM under a changing player body (`PrimitivePlayer` 27 → `HungryPlayer` 57). `findPlayerId` stays on empty `(self object)` 20. Inventory/Equipment walk the wrong root after the body swap, so payload inventory goes empty while the game’s own inventory text is correct.**
