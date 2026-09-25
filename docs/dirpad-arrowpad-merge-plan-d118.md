# D118 - Merge CharKeys' auto arrow pad into the DirectionalRadial widget (PLAN ONLY, not implemented)

Author: claude, 2026-09-23. Status: **PROPOSED DESIGN, no code written.** Operator instruction:
"I want plans to merge the arrow key system as well. It needs to be done." This is D117's own
section 2.7, written up as its own document per that section's own note ("needs its own dedicated
implementation-and-test pass, not to be rushed in alongside a large batch of other changes") --
codex's D117 audit (bus #782, blocker 4) independently agreed the deferral was the right call but
that a real plan/implementation is still owed. Workflow: plan -> adversarial review (codex) ->
operator sign-off -> implement -> audit, same as every other feature this project has shipped.

## 0. What "merge" means, precisely (operator's own words, D117 plan section 2.7)

"I really don't mind if the Arrow key system is remapped into this system as well as long as it
auto activates and shows up when needed just like before -- really nothing is changing for the
arrow key system except for basic looks and location, since it's being bundled into this, it will
just simply replace this when necessary. By the way it would not be slide to select when the arrow
key buttons pop up -- it would be normal [tap-per-button]."

Concretely: ONE shared visual widget (DirectionalRadial's handle/ring shell, already built) with
TWO trigger paths and TWO interaction modes, already specified in D117's own plan:

| Trigger | Populates | Selection |
|---|---|---|
| Player holds the idle handle, or the D117 keyboard path | Room's real exits + custom slices (unchanged) | Slide-to-select (unchanged) |
| CharKeys' existing auto-eligibility fires, or Tools > Arrow keys | Up/Left/Enter/Right/Down | Discrete tap-per-button (unchanged from today's `#pl-arrowpad`) |

## 1. Current code, exact grounding

**CharKeys' auto-pad state machine (`js/CharKeys.js`) -- the fragile part, must stay untouched:**
- `_autoEligible`/`_autoPadOwned`/`_autoSuppressed`/`_autoExitTimer` (`js/CharKeys.js:43-46`) --
  D111's own careful eligibility-latching, sticky-dismissal, and grace-period state. This is the
  code the D111 audit's `_autoSuppressed` dead-code finding already flagged as subtler than it looks
  (the finding: `_autoSuppressed` is write-only, the real protection is `_autoEligible` persisting --
  correct today, but fragile to a future refactor of when `_autoEligible` resets).
- `syncAutoPad(lineReady, charReady)` (`:293-311`) -- the eligibility-transition state machine that
  decides WHEN to call `openArrowPad("auto")`/`closeArrowPad("auto-exit")`. Untouched by this plan.
- `autoPadBlocked()` (`:273-279`) -- the existing extension point for "another overlay is up, don't
  auto-open." D117's audit-fix session already added one line here
  (`document.body.classList.contains("pl-dirpad-open")`) for immediate mutual exclusion -- this plan
  does not remove that line; the merge makes it moot once there is only one shell to check.

**CharKeys' rendering layer -- the part this plan proposes to swap out:**
- `buildPad()` (`:327-360`): builds `#pl-arrowpad` (a separate DOM tree/CSS from DirectionalRadial's
  `#pl-dirpad-ring`), five `<button>`s, tap-to-close-outside, `pointerdown`-only key presses
  (`e.preventDefault()` so the trailing synthetic click never double-fires -- this exact contract
  must be preserved in the merged version).
- `pressKey(name)` (`:361-377`): the actual key-code dispatch (`sendKeydown`/`sendKeypress` for a
  GridWindow CharInput target, or line-prompt history/caret/submit behavior for a LineInput target).
  This function's OWN logic is untouched either way -- both `#pl-arrowpad`'s buttons and the merged
  shell's arrow-mode slices call this exact function.
- `refreshPad()` (`:378-383`): toggles an idle/live visual state every 400ms (`setInterval`) based on
  whether a real char/line target currently exists.
- `openArrowPad(mode)`/`closeArrowPad(reason)`/`isPadOpen()` (`:385-405`): show/hide/query, called
  both by CharKeys itself (auto path) and externally (`WorkspaceUI.js`'s Tools > Arrow keys entry,
  `MobileLayout.js`'s back-button handler, `Input.js`'s Escape chain).

**DirectionalRadial's shell (`js/DirectionalRadial.js`) -- the part this plan proposes to reuse:**
- `expand(cx, cy, slices)`/`collapse()`/`CanOpen()` (already includes the CharKeys mutual-exclusion
  check from the D117 audit fix) -- the positioning, viewport-aware scaling, and overlay-safety
  plumbing every mode should share.
- Slices are already a generic `{label, angle, ring, command, el}` shape with a `custom`/`dir` tag --
  adding a discrete-tap SELECTION MODE alongside the existing slide-to-select one is additive, not a
  rewrite of that shape.

## 2. Proposed design

### 2.1 One shell, a mode flag
`DirectionalRadial.expand(cx, cy, slices, mode)` gains a third state: `mode` is `"exits"` (default,
current behavior, slide-to-select via `updateHover`/pointer-drag) or `"arrows"` (new: each slice is a
real, individually-tappable `<button>` -- same accessibility upgrade this session's audit already
required for the Settings panel -- calling `CharKeys.pressKey(slice.key)` directly on `click`,
`pointerdown`-only with `preventDefault()` matching `buildPad()`'s exact existing contract so a
press can never double-fire). `document.body.classList` gains `pl-dirpad-open` either way (already
true today) so `autoPadBlocked()`'s existing mutual-exclusion line keeps working without change
once CharKeys itself never opens its own separate pad.

### 2.2 CharKeys keeps its state machine, swaps its rendering calls only
The safest possible boundary: `syncAutoPad`, `autoPadBlocked`, `_autoEligible`/`_autoPadOwned`/
`_autoSuppressed`/`_autoExitTimer`, and every timing/grace-period decision in `js/CharKeys.js` stay
byte-for-byte unchanged. Only `buildPad`/`openArrowPad`/`closeArrowPad`/`isPadOpen`/`refreshPad`
change what they DO:
- `openArrowPad(mode)` calls `DirectionalRadial.expand(handleRect.center, arrowSlices, "arrows")`
  instead of building/showing `#pl-arrowpad`. `mode === "auto"` still sets whatever equivalent of
  `_autoPadOwned` is needed to know a later `closeArrowPad()` without an explicit reason should mark
  `_autoSuppressed` (D111's sticky-dismissal contract, unchanged).
- `closeArrowPad(reason)` calls `DirectionalRadial.collapse()`.
- `isPadOpen()` becomes `document.body.classList.contains("pl-dirpad-open") && DirectionalRadial._mode === "arrows"`
  (must distinguish "the shell is open in arrows mode" from "the shell is open in exits mode" --
  CharKeys' own callers only care about ITS pad's state, not the exits radial's).
- `refreshPad()`'s idle/live toggle becomes a class toggle on the shared ring container instead of
  `#pl-arrowpad`.
- `pressKey(name)` is called unchanged from the arrow-mode slice buttons' click handlers.

### 2.3 Arrow slices: fixed layout, not the compass LAYOUT table
Up/Left/Enter/Right/Down are NOT compass directions and must not be confused with D117's own N/E/S/W
-- a fixed, separate small layout (e.g. up at -90/ring 0, left at 180/ring 0, right at 0/ring 0,
down at 90/ring 0, enter at the CENTER -- matching `#pl-arrowpad`'s existing ring-with-center-button
visual, which needs its own small addition to `expand()`: an optional center element, since
DirectionalRadial's ring has never had a center-positioned slice before).

### 2.4 CSS
`.pl-arrowpad__*` classes retire; `#pl-arrowpad`'s own positioning/idle-state CSS is removed once
nothing builds that element anymore. `.pl-dirpad-slice`'s existing visual language (pill shape,
`.is-hovered`) needs a discrete-tap equivalent (`:active`/a brief `.pl-dirpad-slice--pressed` flash
on tap, since there is no drag-hover state in tap mode) -- a new, small addition, not a rewrite.

## 3. Open questions for adversarial review (blocking -- do not implement before these are answered)

1. **The center Enter button.** DirectionalRadial's ring has never rendered anything at its own
   center (radius 0) -- needs new layout support, not just a `LAYOUT` entry (angle is meaningless at
   radius 0). Simplest: a special-cased element, not a slice with angle/ring at all.
2. **`isPadOpen()`'s exact contract.** Every existing caller (`MobileLayout.js`'s back-button chain,
   `Input.js`'s Escape chain, `WorkspaceUI.js`'s Tools entry) needs `isPadOpen()` to keep meaning
   EXACTLY "the arrow pad, specifically, is open" -- not "the shell is open in either mode." Get this
   wrong and Escape/back could close the wrong thing, or fail to close the right one.
3. **Grace-period repaint.** `syncAutoPad`'s 750ms grace period (a brief no-prompt gap keeps the auto
   pad visibly open) currently just leaves `#pl-arrowpad` alone (no re-render needed, same DOM).
   Once open/closed means calling into `DirectionalRadial.expand`/`collapse`, does the grace period
   need to avoid a visible flicker (collapse-then-immediately-reopen) if `GetSlices`-equivalent for
   arrow mode is called again during that window? Needs an explicit "don't rebuild, just extend"
   path, not assumed free.
4. **Manual Tools > Arrow keys parity.** Confirm the manual entry point (not auto-triggered) gets
   identical arrow-mode rendering/behavior through the same code path, not a second implementation.
5. **Regression scope.** D111's own acceptance gates (real Anchorhead HELP interaction: six
   touch-driven arrows with zero visibility transitions, a real keyboard `Q` that exits HELP,
   BufferWindow startup exclusion, re-entry reopening, manual pad/line history parity, dialog
   closure, responsive geometry, desktop exclusion -- `harness/d105-review-fixes.js`,
   `harness/d105-input-contract.js`) must ALL still pass unchanged after the swap -- this is the
   real bar for "did the merge actually preserve D111," not a new, separate test suite.

## 4. Tests to add (once design questions above are resolved and implementation begins)

- Every existing D111/D105 harness (`d105-review-fixes.js`, `d105-input-contract.js`) still green,
  unmodified expectations.
- Auto-eligible GridWindow CharInput opens the shared shell in arrow mode (not exits mode), with
  discrete tap-per-button selection -- a slide gesture there must not submit anything early.
- Manual Tools > Arrow keys opens the same shared shell in arrow mode.
- `isPadOpen()` returns true only while arrow mode is open, false while exits mode is open (even
  though both use `pl-dirpad-open` on `<body>`).
- The center Enter button fires exactly `pressKey("enter")`, at any viewport size (no accidental
  angle-based hit-testing near radius 0 stealing its tap).
- Grace-period re-entry during the 750ms gap does not visibly flicker the shell closed-then-open.
- Mutual exclusion (already partially covered by D117's own audit-fix tests) still holds in both
  directions with the shells unified: exits mode cannot open while arrow mode is open and vice
  versa -- now trivially true if both really share one `pl-dirpad-open` flag rather than needing the
  cross-class checks D117's interim fix added.
