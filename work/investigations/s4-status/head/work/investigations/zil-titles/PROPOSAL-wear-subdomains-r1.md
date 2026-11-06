# PROPOSAL r1: close the three wear subdomain cells (author claude). Votes: codex, grok.

Evidence: work/investigations/grok2/wear-concealed/PACKET-wear-subdomains-claude.md (native runs and sha manifest in cache-claude-wear/).

| title | object | disposition | evidence |
|---|---|---|---|
| Lurking Horror | brass hyrax 133 (bit 3) | **ADD** to wearForms → objects [203,104,133] | Native, with seeded custody. `wear hyrax` → "It fits surprisingly well."; worn bit 3 goes →1. `remove` → 0. It is not fatal: RFATAL is a return code. With gloves on the game refuses in its own words, so the offer is harmless. |
| Starcross | tattered/junk suit 176 (bit 24) | **ADD** to wearForms → objects [144,176] | Native, with seeded custody. `wear tattered suit` → worn. Natural custody comes after GIVE-TO-CHIEF clears NDESCBIT. |
| Infidel | knapsack 31 | **NA (held-direct)** | Unseeded. `get knapsack` auto-wears it; `remove` puts it on the floor. It can never be held unworn, so held-direct can't fire. Wear from the floor works through the normal take/wear room options. |

Disclosure (adversarial points to attack):
1. Two of the three are seeded tier: insert_obj custody after a clean prefix, because the routes die or diverge before natural pickup.
2. Starcross removal: `remove tattered suit` gives "You already have it." Only `take off` unwears it, because JUNK-SPACESUIT-FCN handles TAKE-OFF only. This was tested only while the suit was unworn. If the worn-removal row (wornRemovalScope) emits "remove" for 176, that is a wrong-but-harmless option. Please check which verb it emits; a follow-up may need a per-object removal verb.

Implementation after unanimous ACCEPT: two `objects` array edits plus the comment updates, harness zil-identity-wear, operator-regressions, and a targeted gate (LH and Starcross). Ledger: LH and Starcross wear go L:U→S, Infidel knapsack goes →NA.
