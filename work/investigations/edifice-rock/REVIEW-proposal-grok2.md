# Edifice Q1 proposal — adversarial review (grok2)

Source: `COMPARE-PROPOSAL-claude.md`. Independent live check on `edifice.z5.js` (globals + objectLinks).

## Verdict
**ACCEPT** exact-digest `playerGlobal: 18` for Edifice, with the corrections below.

---

## Independent measurements

| Moment | g18 | g21 | g40 | g53 | rock.parent | payload.inv |
|---|---|---|---|---|---|---|
| boot | 27 PrimitivePlayer | 27 | 0 | **0** | (in room) | — |
| after take rock | 27 | 27 | 15 ceiling | 27 | **27** | Rock ✓ |
| after east + i | **57** HungryPlayer | **55** room | 27 stale body | **57** | **57** | **[]** ✗ |

`findPlayerId` stayed **20** `(self object)` the whole time.  
After east, only **g18** and **g53** point at HungryPlayer holding Rock. Game inventory text lists Useful Rock.

---

## Attacks

### 1. “g18 = g53 at each measured prompt” — **false at boot**
At boot **g53 = 0** while **g18 = 27**. Equality holds after take and after swap, not initially.  
**Condition:** Land **playerGlobal: 18 only**. Do not require or document g53 as co-equal at every prompt. g53 is a useful cross-check after play begins, not the fact.

### 2. Other globals that briefly look like the player
| Global | Behavior | Risk if chosen |
|---|---|---|
| g21 | 27 at boot/take → **55 room** after east | Would walk room (Beast) as inventory |
| g40 | 0 → ceiling → **27 empty PrimitivePlayer** after swap | Stale empty body |
| g18 | 27 → 57, always holds rock when carried | **Correct** |

Proposal correctly rejects generic promotion and non-18 slots. **Keep g18 only.**

### 3. NPC sharing g18?
After east, holders with children: g18/g53 → HungryPlayer+Rock; room globals → Near the Arch+Beast.  
**Beast is not on g18.** No companion share on 18 in this sequence. D216 generic ban still right for other titles.

### 4. Swap timing
By the inventory prompt after east, g18 already reads 57. Live global read (D273 style) follows the swap without needing a “detect class change” hook. **OK.**

### 5. resolvePlayer still returns named-player 20
Fact must **outrank** the named-player rung that picks parentless 20. Confirm `resolvePlayer` / inventory root path uses `playerGlobal` when present (D216/D273). If only inventory root is fixed but room still uses parent(20)=0, blank map may remain.

### 6. Blank initial map
Likely same root (no parent on 20). After playerGlobal 18, location via parent(g18) should be Edifice room at boot. **Verify after land** (proposal already flags this). Masquerade separate.

### 7. confirmedInventoryRootId staleness
My blind note: root can stick on 27 after body moves to 57. playerGlobal live read **bypasses** stale confirmed root if it outranks D75 confirmed id when the fact is set. **Order must be:** digest playerGlobal → then confirmed → then structural. If confirmed outranks fact, bug remains.

---

## Required land checklist
1. Exact digest fact `{ playerGlobal: 18 }` only (not g53).  
2. `resolvePlayer` / `resolveInventoryRootId`: **playerGlobal outranks named-player and must not lose to stale confirmedInventoryRootId** when g18’s object has the carried tree.  
3. Harness: after take, inv children of g18; after east+i, inv = [Rock] under 57; operator-regressions; edifice + Degeneracy/guess/yagwad gate as proposed.  
4. Post-check blank map / CurrentRoom at boot.

## Bottom line
**ACCEPT** Edifice `playerGlobal: 18`. Fix the g18=g53-at-boot claim; ensure fact beats named-player **and** stale confirmed root; verify map room after.
