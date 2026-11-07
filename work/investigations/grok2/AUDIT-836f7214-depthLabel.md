# Adversarial audit: 836f7214 depthLabel + .pl-stat-label break-word (grok2)

## Verdict: **ACCEPT with harness note**

### 1. Can `depthLabel` return a label outside LLR3?

**No, not with current facts.**

- `WorldMap.depthLabel(level)` (`js/WorldMap.js:547–556`) only returns `"Depth " + d` when `MapTopology.roomDepth(room)` is truthy for some room on that World level.
- `MapTopology.roomDepth` only ranks rooms when the layout fact has `regionDepth.regionProperty` (see MapTopology.js ~31+).
- `ModuleStatFactsClaude.js` contains **exactly one** `regionDepth` entry (LLR3 / W&W family comment). No other title is factored.

So non-LLR3 titles get `depthLabel → null` and fall back to the caller’s `"Level " + n` (`WorldMap.js:539`). No accidental "Depth N" chrome on Zork/Anchorhead/etc. without a new fact.

### 2. Does `overflow-wrap: break-word` overflow a 375px tile?

**No harmful overflow of the tile box** for normal stat labels.

- `.pl-stat-label` (`css/ParchLock.css:4466–4474`) sets `overflow-wrap: break-word` so long tokens wrap instead of truncating.
- `break-word` / `overflow-wrap: break-word` wraps within the element’s width; it does not expand past the parent flex/grid cell the way `white-space: nowrap` + long string would.
- Unbroken megastrings can still break mid-word inside the cell (readable degradation), not paint outside the tile. `.pl-stat-rank` uses `overflow-wrap: anywhere` (more aggressive).

Manual CSS review only (no 375px screenshot this turn). Phone B78/B79 already verified related LLR3 UI per claude context.

### 3. harness/llr3-depth.js

**0 PASS / 8 FAIL** on this machine/checkout (walker never hit Cold room 219 / trapdoor; Depth stayed null/1). Failure mode is **route nondeterminism / seed walk**, not proof that depthLabel is wrong:

- FAIL messages: `from === null`, `d1 === null`, `l2 === 0`, labels null — consistent with never reaching room 219.
- Code/fact path still only activates with `regionDepth` + visited rooms that carry prop 7 ranks.

**Recommendation:** treat harness FAIL as flaky walk, not REJECT of 836f7214. Optional follow-up: harden harness with a fixed jericho-style route to 219 instead of RNG walk.

### Summary
| Question | Answer |
|----------|--------|
| depthLabel outside LLR3? | No without a new `regionDepth` fact |
| break-word overflow tile? | No; wraps inside cell |
| harness | Walk failed here; not a product REJECT |

**ACCEPT** 836f7214.

## Update 2026-11-07 ~02:15

ode harness/llr3-depth.js now **8 PASS, 0 FAIL** (reply-wait walk reaches 219). Prior 0/8 was timing flake; product ACCEPT stands.
