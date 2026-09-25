# D117 - Programmable dime-sized directional radial overlay

Author: claude, 2026-09-23 (revision 3: implemented, audited by codex, audit fixes applied).
Status: **IMPLEMENTED** (`js/DirectionalRadial.js`), see `PRODUCTION_PLAN.md`'s D117 entry for the
full changelog. Revision history: revision 1 was research + design only; revision 2 folded in the
operator's answers to all 7 open questions below; the plan was then implemented in full except the
D111 merge (section 2.7), codex ran a full adversarial audit (bus #782, live Playwright
reproductions) that found 5 blocker-level and 4 medium defects, all of which were fixed in the same
implementation (see PRODUCTION_PLAN.md's "codex audit fixes" entry). The operator has since asked
for the D111 merge to be implemented too -- its own dedicated plan is
`docs/dirpad-arrowpad-merge-plan-d118.md`, not folded into this document, since section 2.7 below
already covers the design reasoning and the merge is substantial enough to track (and review) on
its own.

## 0. The request, as given

A small (dime-sized), translucent, always-present circular handle sits above the input row's
Enter/submit arrow. Press-and-hold expands it into a full radial "compass rose" showing every
direction the CURRENT room/module actually has. The player slides their finger to the wanted
slice (which lights up as the finger passes over it) and releases to submit that direction
immediately -- no separate Enter/submit step. The whole system is:

- **Togglable** in its own settings UI (on/off).
- **Programmable**: the player can edit the slice layout itself -- add static slices, add
  additional concentric "rings"/circles with more commands, not just the 8 compass points.
- **Per-module**: layout customizations are saved separately per story module, and the overlay's
  default slice set is derived dynamically from what that module's current room actually offers
  (not a fixed 8-direction assumption baked in for every game).
- **Animated**: slices light up live as the finger passes over them during the hold-and-drag.

## 1. Current code, exact grounding (what already exists to build on, and what does not)

**No existing "hold, drag across, release to select" gesture exists anywhere in this codebase.**
Grepped every radial/gesture-adjacent file; every existing radial control (`ParchLockQol.OpenRadial`,
`js/Qol.js:606-830`) is a set of absolutely-positioned circular `<button>` elements, selected by a
discrete **tap/click** on one button (`$(".radial-command").click(...)`, `js/Qol.js:801`). There is
no touchmove-driven "which slice is my finger currently over" hit-testing, no live highlight-as-you-
drag, and no "release anywhere over a slice to submit it" pattern. This feature is a genuinely new
gesture engine, not a reskin of the existing radial.

**Closest existing analog: `CharKeys`'s auto arrow pad (D111, `js/CharKeys.js`).** Useful precedent
for several sub-problems, but NOT the drag-to-select gesture itself:
- `openArrowPad`/`closeArrowPad`/`isPadOpen` (`js/CharKeys.js:378-398`): a small persistent overlay
  element (`#pl-arrowpad`), shown/hidden as a class toggle, positioned above the input strip.
  Reusable pattern for the dime-handle's own show/hide plumbing.
- Its five buttons (`up`/`left`/`enter`/`right`/`down`, `js/CharKeys.js:328-333`) are still
  discrete-tap targets, each a real `<button>` with its own click handler -- not slices hit-tested
  by continuous finger position. The requested "slide to N, let go, command fires" gesture has no
  equivalent here.
- The existing `.pl-press-pending` text-selection suppression convention (`Actionable.js:296`,
  reused for D112's Known-Rooms hold) is directly reusable for suppressing native
  text-selection/scroll during this widget's press-and-hold too.

**`ParchLockQol.OpenRadial`'s polar-coordinate math (`js/Qol.js:739-778`) is reusable for slice
layout**, even though its selection mechanism (click) is not: `angle = (2*PI/itemsInRing) *
ringIndex - PI/2`, `x = cos(angle)*radius`, `y = sin(angle)*radius`. The same math places N/NE/E/...
slices around a circle; only the SELECTION mechanism (hit-test-during-drag vs. click) needs to be
new.

**Where "known directions for the current room" already lives.** `ParchLockMap.GetCurrentRoom().Exits`
is an object keyed by direction word (`n`, `ne`, `e`, ... `in`, `out`, `up`, `down`, plus D63's
borrowed-slot mechanism for non-compass games like wump2ka's numbered `exit 1`/`exit 2` -- see
`js/Map.js:279-310`, `assignSlot`/`ALL_SLOTS`). This is the SAME data source the map's compass grid
already draws from -- reusing it means this overlay is automatically correct for non-compass games
too (a numbered-exit game shows numbered slices, not blank compass points), consistent with D63's
existing "generic UI gap, not specific to one game" principle. Compass-word display labels/opposites
already exist as `OPPOSITE` (`js/Map.js:368`) and `Input.KeyboardNavigation`/`Directions` (referenced
in `js/Input.js`) for direction-word <-> command mapping.

**Where a "submit this command immediately" primitive already exists.** `Actionable.Submit(command)`
(`js/Actionable.js:346-...`) is the existing single choke-point every other "tap a direction and go"
control (map room clicks, compass-strip mini-map, existing radial direction slices) already funnels
through. The new overlay's release-to-submit action is `Actionable.Submit(dirCommand)` -- not a new
submission path.

**Per-story persistent storage precedent.** `ParchLockMap.Save()`/`Load()`
(`js/Map.js:737-766`) key a story's map data as `localStorage.getItem/setItem("PL_Map_" +
ParchLock.GameFilename)`. The same `"PL_<Feature>_" + ParchLock.GameFilename` keying convention is
the natural, already-established place to store this overlay's per-module custom slice layout.

**Global on/off toggle precedent.** `Global.Prefs` (`js/Global.js`) plus `WorkspaceUI.ShowOptions`'s
"Interface & Accessibility" grouping (added this session, D112/D114) is where a
`Global.Prefs.DirectionalRadialEnabled` (default TBD, see open question 1) toggle belongs.

**Existing "settings UI for a feature" precedent.** `WorkspaceUI.ShowOptions` (checkboxes) and
`WorkspaceUI.ShowMaps` (a fuller `Message.Show` panel with its own named-slot save/load rows,
`js/WorkspaceUI.js:227-260`) are the two existing patterns for "a whole configuration screen inside
a Message dialog." A per-module slice EDITOR (add/remove/rearrange slices and rings) is closer in
weight to `ShowMaps` than to a simple checkbox row.

**Existing "where does this sit on screen" constraint.** The input row's Submit arrow
(`#pl-input-submit`, `play.html:193`) already has D112's D93-era fixed-position sibling layout
(`css/ParchLock.css` mobile Input.LineInput rules, `left`/`right`/`bottom` all safe-area-aware via
`var(--pl-safe-top/bottom/left/right)`, per D116's just-established convention). The dime handle's
"above the Enter arrow" position needs the same safe-area-aware anchoring, not a hardcoded pixel
offset (D116 is the freshest possible cautionary tale for skipping this).

## 2. Proposed design (high level -- full spec still needs the review round before implementation)

### 2.1 The dime handle
A small (~24-32px, TBD in review) translucent circular element, fixed-positioned directly above
`#pl-input-submit`, safe-area-aware. **Default ON** (`Global.Prefs.DirectionalRadialEnabled = true`
-- operator decision, open question 1: this is the headline new interaction, not an accessibility
add-on like D112's Add-note button, so it does not follow that default-off precedent).

**Always visible** whenever the preference is on -- not gated on the current room having 2+ exits
or any other threshold (operator decision, open question 2: "exits aren't always obvious," so the
handle's whole point is to be a constant, low-commitment affordance regardless of what the room
happens to offer this turn).

Idle state is deliberately barely-there: a hazy, low-opacity circle with a **slow pulsing
animation** (a CSS `@keyframes` opacity/scale breathe, not a one-shot fade-in) so it reads as "there
is something here" without competing for attention against the story text or the input row.

### 2.2 Press-and-hold to expand
Long-press timing reuses `Actionable.LongPressMs`/`LongPressMoveCancelPx` (the same constants
already shared by Actionable's own long-press and D112's Known-Rooms hold) for a SEPARATE listener
scoped only to the dime handle -- not by adding this element to the generic `.pl-act` delegation
(it isn't an actionable-noun element). On fire: expand into the full radial, centered on the
handle's own position (not necessarily the finger's current position, since the handle itself is
tiny and fixed -- unlike `Actionable.Open`, which centers on the long-press's own coordinates).

**Accidental activation of whatever is underneath (operator decision, open question 3):** no
separate capturing overlay element is needed for this. The press-and-hold's `touchstart` already
targets the handle specifically; the browser's own touch-event model keeps every subsequent
`touchmove`/`touchend` of that SAME continuous touch targeted at the element (or listener) that
received the `touchstart`, regardless of what the finger visually passes over next -- nothing
underneath can receive move/drag events from this gesture no matter how the radial visually
overlaps the story text or other controls. The one real risk is the gesture's own trailing
synthetic `click`/`contextmenu` firing on release and landing on whatever element is now
underneath the finger -- already solved by this codebase's established pattern (`e.preventDefault()`
on `touchend` once the gesture has fired, exactly as `Actionable.js`'s long-press and D112's
Known-Rooms hold already do). No new mechanism to design here, just the existing one applied again.

### 2.3 Slice population (dynamic per room, per module)
Default slice set = `Object.keys(ParchLockMap.GetCurrentRoom().Exits)`, laid out via the same
polar-coordinate math as `OpenRadial` (section 1), one ring for up to 8 real exits, additional
rings only if the player has added custom slices (2.5) beyond what the room offers. Each slice's
command is resolved through the SAME direction-word -> command path the map/compass-strip already
use (`Actionable.commandForExitLabel`, referenced in `js/Map.js:101`) -- not a second, parallel
direction-to-command table.

### 2.4 Slide-to-select gesture (the genuinely new part, section 1's "does not exist yet")
Real `touchmove` tracking against the expanded radial's screen-space bounding circle: at each move
tick, compute `Math.atan2(dy, dx)` from the circle's center to the current touch point, map that
angle to whichever slice's angular range contains it (not `elementFromPoint`, which breaks down
once slices/rings overlap visually near the center -- angle+radius bucketing is the correct,
robust hit-test for a true pie/ring layout). The currently-hit slice gets a `.is-hovered` class for
the animation (2.6); leaving a slice removes it. On `touchend`, whichever slice was hit LAST wins:
`Actionable.Submit(slice.Command)`. Releasing outside every slice (finger dragged off the whole
radial) cancels with no submission -- mirrors the existing radial's "click elsewhere to dismiss"
convention (`ParchLockQol.HideRadialMenu`, bound to `mousedown` outside).

### 2.5 Programmable layout (settings UI)
A `WorkspaceUI.ShowMaps`-weight `Message.Show` panel (not a full new page) listing the current
module's slices/rings with add/remove/reorder controls, persisted via the
`"PL_DirectionalRadial_" + ParchLock.GameFilename` key (section 1's storage precedent). "Static
slices" (the operator's term) = entries the player pins regardless of what the room's real Exits
currently are (e.g. a frequently-used non-directional command). "Additional radio circles" =
additional rings beyond the first, same polar math with a larger radius per ring (reusing
`OpenRadial`'s existing `ringGap`/`firstRing` constants as a starting point, not inventing new
layout math).

### 2.6 Animation

Two distinct animations, not one:
- **Idle pulse** (2.1): a slow, continuous, low-amplitude opacity/scale breathe on the handle
  itself, always running while idle and enabled.
- **Drag highlight** (2.4): slices light up (background/opacity transition, matching the existing
  radial-command CSS transition conventions already in `css/ParchLock.css`) on `.is-hovered`
  add/remove during the drag -- a CSS transition on an added/removed class, not a JS-driven
  animation loop.

### 2.7 Merging D111's arrow pad into this widget (operator decision, open question 4)

The operator does not mind D111's existing GridWindow-CharInput arrow pad being remapped into this
same widget -- **"nothing is changing for the arrow key system except basic looks and location...
it will simply replace this when necessary."** Concretely, this means ONE visual widget with TWO
distinct trigger paths and TWO distinct interaction modes, not a single unified gesture:

| Trigger | What shows | Gesture |
| --- | --- | --- |
| Player presses and holds the idle handle (2.2) | The room's real exits (2.3), player-programmable layout (2.5) | **Slide-to-select** (2.4) -- highlight-as-you-drag, release to submit |
| D111's existing auto-detection fires (one visible GridWindow `CharInput`, all of D111's existing eligibility/lifecycle rules unchanged -- see `js/CharKeys.js` `_autoEligible`/`syncAutoPad`) | The same up/left/enter/right/down keys the current `#pl-arrowpad` shows | **Normal discrete tap-per-button**, exactly like today's arrow pad -- explicitly NOT slide-to-select |

D111's own auto-open/auto-close/manual-dismissal/re-entry lifecycle (`js/CharKeys.js:280-320`) is
untouched -- only the pad's OWN chrome and screen position move to match this new widget's location
(above the input row) instead of `#pl-arrowpad`'s current placement, and the up/left/enter/right/down
buttons render inside the same shell this widget already built for the player-initiated mode. The
manual **Tools > Arrow keys** entry (`js/CharKeys.js` `openArrowPad`) opens the same shell in its
tap-per-button mode directly, same as today.

This means the widget's expand/render code needs an explicit MODE flag (`"exits"` vs. `"arrows"`),
not just a single code path -- the slice population (2.3) and gesture (2.4 vs. plain click) differ
per mode even though the show/hide/positioning/idle-handle plumbing (2.1/2.2) is fully shared.

## 3. Open questions -- resolved (operator decisions, this session)

All seven were answered directly by the operator; folded into the design above (section numbers
point to where each is now reflected). Recorded here for the historical record and so grok's review
(bus #779) has the actual resolution to check against, not just the original open question:

1. **Default on/off -> default ON.** Section 2.1. Rationale given: it's meant to be a hazy,
   barely-there suggestion, not an opt-in accessibility feature.
2. **Idle handle visibility -> always visible when enabled**, no exit-count threshold. Section 2.1.
   Rationale given: "exits aren't always obvious."
3. **Accidental activation of controls underneath -> solved by the existing continuous-touch +
   trailing-click-suppression pattern**, no new capturing overlay needed. Section 2.2.
4. **Relationship to D111's arrow pad -> merged into one widget, two modes.** Section 2.7. The
   auto-triggered (arrow-pad) mode keeps today's plain tap-per-button interaction; only the
   player-initiated (exits) mode uses the new slide-to-select gesture. This is the one place the
   operator's answer changes the shape of the implementation, not just a parameter -- flagged
   clearly for grok's review as the biggest single design decision in this revision.
5. **Angle-to-slice hit-testing -> confirmed fine as proposed.** Section 2.4 unchanged. Still needs
   real touch-driven device testing before being trusted (that part of the original question
   stands -- "fine" is the operator's design sign-off, not a substitute for testing).
6. **Storage growth -> confirmed fine, no cap needed.** Section 2.5 unchanged; operator's own words:
   "extremely small amount of data for this per module."
7. **Relationship to the existing "Go `<noun>`" radial slice -> coexists, no replacement.** Section
   2.3/2.5 unchanged from the original proposal.

## 4. Tests to add (once design questions above are resolved and implementation begins)

- Real touch-driven (D27): press-and-hold on the idle handle expands the radial; a short tap does
  not expand it and does not submit anything.
- Sliding across multiple slices highlights each in turn and un-highlights the previous one; only
  the slice under the finger at release time is submitted.
- Releasing outside every slice submits nothing and cleanly collapses the radial.
- The default slice set exactly matches `GetCurrentRoom().Exits`' keys for at least one compass-word
  game and one numbered-exit game (wump2ka-style), proving D63's non-compass generality is
  preserved.
- A custom layout saved for one module does not appear when a different module is loaded (per-
  module storage key isolation).
- The handle is safe-area-aware on a device with a non-zero bottom inset (mirrors D116's own
  regression class) and never overlaps `#pl-input-submit`/`#pl-input-mic`'s own hit areas.
- Mutual exclusion with `CharKeys`'s auto/manual arrow pad (whatever rule open question 4 settles
  on) is real and tested, not assumed.
- The idle handle pulses continuously while enabled and idle, and the pulse stops/hides while
  either mode is expanded.
- D111's auto-triggered mode (a real GridWindow CharInput prompt) renders with plain tap-per-button
  selection -- a slide gesture there must not submit anything early, matching today's arrow pad
  exactly; only the player-initiated hold-the-handle mode accepts slide-to-select.
- The manual **Tools > Arrow keys** entry still opens the arrow-pad mode directly, unchanged from
  today's behavior other than its new shared chrome/position.
