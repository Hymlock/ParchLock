# PACKET: wear subdomains (claude, native, read-only) — 2026-10-31

Scope: the three wearable owners left open after D259 Identity-Wear (9996cb24). No js/ edits, no commits.
Tool: `cache-claude-wear/probe.cjs` (play.html + JSEED-parity random, seed 0 unless noted; same init as grok1/batch/g1-batch.cjs).
Reads worn bit per title via `ZRamReader.objectLinks(...).attrBytes` (Infidel 22, LH 3, Starcross 24) and parent via objectLinks.
**Seeded tier (disclosed):** `SEEDMOVE=obj:ref` moves obj into the player (parent of ref) with the VM's own `insert_obj`
after an unseeded route prefix. Used for LH ring and Starcross junk suit, because the jericho/zil routes diverge before
the natural acquisition point (LH dies at route step 166 for seeds 0-3; Starcross is in the Airlock at step 131, not the village).

| Owner | Verdict | Held-unworn reachable? |
|---|---|---|
| Infidel knapsack 31 | **NA for held-direct** (Wear works, but only from the ground) | **No** |
| LH brass hyrax 133 | **ADD** (`wear` normal; refused only while gloves worn) | Yes |
| Starcross tattered suit 176 | **ADD** wear; doff verb must be **`take off`**, not `remove` | Yes (after GIVE SUIT TO CHIEF) |

## 1. Infidel knapsack 31 (unseeded, route infidel[0:11], player 223) — `infidel-knapsack.json`
- `get knapsack` → "(wearing it) You swing the knapsack over your shoulders ..." bit22 false→**true**, parent 62 Work Tent→223.
- `wear knapsack` (already worn) → same swing text, stays true.
- `remove knapsack` → "You take the knapsack off and place it down. As it settles, the cover flaps open." bit22 →**false**, parent →**62 (floor)**.
- `wear knapsack` from floor → "(taken) You swing ..." →true, held. `take off knapsack` → same as remove (dropped, false).
- Conclusion: the game never leaves the knapsack held-and-unworn (take auto-wears, doff drops). A held-direct `wearForms`
  entry can never fire; adding it is inert. Wear is a normal action only from room scope ("wear knapsack" = implicit take).
  Not a refusal, not fatal. If room-scope Wear is ever introduced, this is the case; under the current held-direct contract: NA.
  Remove/Take off on the worn knapsack are normal (drop it).

## 2. LH brass hyrax 133 (seeded: route lurking[0:56], gloves 203 worn, hyrax moved into player 56) — `lh-ring-seeded.json`
- `wear hyrax` with gloves worn → "The brass hyrax won't go on over the gloves." bit3 stays false (RING-F refusal, cs.zil:5268).
- `remove gloves` → "You're no longer wearing the pair of electrician's gloves." gloves bit3 true→false.
- `wear hyrax` → "It fits surprisingly well." bit3 false→**true**. `i` → "You are wearing a brass hyrax."
- `remove hyrax` → "You're no longer wearing the brass hyrax." bit3 →false, still held.
- No death, no daemon. The "FATAL" note traces to `<RFATAL>` in PROFESSOR-DESC / IWEAR's non-T return path, i.e. a
  parser return code, not a game-ending outcome. Verdict ADD (`wearForms` LH += 133). The gloves gate is a game refusal
  with a clear message; per missing-over-wrong, offering Wear always is acceptable (optionally suppress while 203 worn).
- Unseeded attempt (`lh-ring-unseeded-died.json`): route lurking[0:180] dies of cold at step 166 ("Each breath ... swallowing knives") for seeds 0-3, so the natural GET HYRAX was not reached.

## 3. Starcross tattered suit 176 (seeded: route starcross[0:22], 176 moved into player 239) — `sc-junksuit-seeded.json`
- `wear tattered suit` → "You are now wearing the tattered old suit, which smells of alien." bit24 false→**true**.
- again → "You are already wearing it."
- `take off tattered suit` → "You are no longer wearing the tattered suit." bit24 →false.
- `remove tattered suit` (unworn) → "You already have it." — JUNK-SPACESUIT-FCN (actions.zil:1977-1992) handles only
  TAKE-OFF/DISEMBARK, so the Remove label must emit **`take off`** for 176 (generic `remove` likely maps elsewhere; worn-state remove not probed).
- Seed artifact: 176 has NDESCBIT until GIVE-TO-CHIEF (actions.zil:2567-2568) clears it, so `i` omitted it here; natural
  acquisition (give space suit to chief → suit dropped in HERE) is the reachable path. WEAR while still IN CHIEF is refused
  by the chief (normal refusal; not held-direct, so not offered anyway). Verdict ADD (Starcross += 176), doff = take off.
- Unseeded route starcross[0:131] diverged (player in Airlock, 176 still in chief) — `sc-junksuit-unseeded-diverged.json`.

## Manifest (sha256)
3cbaca0c5b85bb48d086c27068b537925a127b9319ea1d8d97cb61c98ff11a86 *infidel-knapsack.json
bd83934c468e234fa917ac5fe6c5e9cb3ed9d84bf9baad6b376e3f3f6c195726 *lh-ring-seeded.json
7610f437e95982366307295f2fcac8ede8947201bde346f60669960a203ce5de *lh-ring-unseeded-died.json
98a506a515e6d09a2197c8da78ef582f3cdaee1b8e6551fdbd65864afb9f2666 *sc-junksuit-seeded.json
4730ad866a35481dc182d08ea02d38b40fe2fd3f6b456fe92448b67d4d550d38 *sc-junksuit-unseeded-diverged.json
37ee8de32fb25201ee1a521a15e9dd541f50987ef0b4d91c948526c0b0977911 *probe.cjs
