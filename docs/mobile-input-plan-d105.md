# D105 - Mobile character prompts, menu navigation and native copy/paste (IMPLEMENTED 2026-09-21; codex review pending)

Author: claude, 2026-09-21. Status: **IMPLEMENTED after consensus (codex #713 + section 6 + operator decision below).** Workflow set by the
operator: describe -> investigate (code + PRODUCTION_PLAN + ARCHITECTURE_UML) -> plan -> codex adversarial
review -> consensus -> claude implements -> codex reviews the implementation.

## 0. Operator report (phone screenshots, Android APK)

| # | Symptom | Screens |
|---|---------|---------|
| I1 | While a game shows a startup/paging screen ("[Press 'R' to restore; any other key to begin]", "[Press SPACE to begin.]", intro text waiting for a key) the bottom text field looks usable but tapping it does nothing; no native keyboard. | 1, 2, 5 |
| I2 | Anchorhead's own HELP/ABOUT menu ("Things you might like to know") cannot be navigated; arrow keys are needed. | 3 |
| I3 | Only the submit arrow works in that menu (it "presses Enter" on the first item); tapping the field still does nothing. | 4 |
| I4 | With the native keyboard open there is no native cut/copy/paste; the long-press opens ParchLock's radial or nothing. | 6 |

OPERATOR CORRECTION (2026-09-21): in screenshot 6 the input strip appearing over the keyboard is only an artifact of how the screenshot was
captured; there is **no keyboard-overlap defect** and nothing to fix there. (Earlier draft item I5/F4 removed.)

## 1. Root causes (from current code)

**I1 / I3 - char prompts are keyboard-less by design (D93).** ARCHITECTURE_UML section on mobile input (lines ~1033-1040):
Glk `CharInput` prompts share the bottom strip but "fire a synthetic keypress into the CharInput ... without opening the
OS soft keyboard (`inputmode=none`, blur, readonly)". Implemented in:
- `js/Input.js` `SubmitPrompt` (submit arrow = synthetic Enter then Space keypress into the CharInput);
- `js/Input.js` `DismissKeyboard` / `SyncMobilePromptFocus` (every tick: `inputmode=none`, `readonly`, blur the CharInput);
- `js/Input.js` `focusin.pmKeyboardGate` (blurs any CharInput focus);
- and there is **no touch handler at all for `.Input.CharInput`** (only `.Input.LineInput` has `touchstart.pmLineTap`).
The bottom strip IS the CharInput element (`css/ParchLock.css` ~2709 restyles it as the fixed strip), so it looks like a text
field but is inert. `docs/mobile-ui-plan-d93.md` G34 required either "an explicit visible tap target" or a written v1 gap;
the resolution chosen was submit-arrow-only. The operator now rejects that limitation.

**I2 - no way to send arrow keys.** GlkOte's char handlers (`lib/main.js`): `keypress` (`e.which`, 13 => return, else
`String.fromCharCode`) and `keydown` for special keys by `keyCode` (37 left, 39 right, 38 up, 40 down, 27 escape, 46 delete,
9 tab, page/home/end, F1-F12). Inform's menu accepts N/P/Q, Space/Enter and up/down arrows. A soft keyboard has no arrows
and today it cannot even send letters.

**I4 - a hold while the keyboard is open opens the radial and drops the keyboard (LIVE-VERIFIED).** `js/Input.js` ~230-293
`touchstart.pmLineTap` on `.Input.LineInput` starts the 500 ms radial timer regardless of keyboard state. Live (CDP real touch, 412x860,
Anchorhead): short tap -> `pmUserFocus=true`, field focused; then a 800 ms hold -> `#radial-menu.show` with context source `input`,
`pmUserFocus=false`, focus moved to `body` (the radial calls DismissKeyboard paths). So the native long-press selection / Cut-Copy-Paste
toolbar can never appear. NOTE: an earlier hypothesis (touchstart `preventDefault` blocking selection) was wrong: the jQuery handler is on
`document`, where Chrome treats touchstart as passive, and a synthetic touchstart reported `defaultPrevented=false`; the timer is the cause.
(No `user-select:none` on `.Input`; desktop uses `contextmenu`.)

## 1b. Top-down view: the four issues are one inconsistency (operator suspected a holistic problem)

The app has three prompt modes (`ParchLock.js` ~86-95 sets `body.has-line-input` / `has-char-input`; neither = no prompt).
The bottom strip is the same visual control in every mode, but its *behaviour contract* differs and was only ever completed
for one mode:

| Gesture on the strip / keys | LINE prompt (today) | CHAR prompt (today) | NO prompt (today) |
|---|---|---|---|
| short tap on the field | opens keyboard (`pmUserFocus`, `inputmode=text`) | **nothing** (readonly, `inputmode=none`, blurred every tick, focusin gate) | strip hidden |
| hold on the field | radial (keyboard closed) / **blocked native selection (keyboard open)** | **nothing** | - |
| submit arrow tap | submits line | synthetic Enter+Space | hidden |
| submit arrow hold | radial | radial | hidden |
| keys the game can receive | typed text + Enter + history arrows | **none from a phone** (only Enter/Space via arrow) | - |
| keyboard-open state stored | on the DOM element (`data pmUserFocus`), lost when GlkOte replaces it | n/a | - |

Enforcement of "the keyboard stays closed unless the player asked" is spread over `DismissKeyboard`, `SyncMobilePromptFocus`,
`focusin.pmKeyboardGate`, `touchstart.pmStoryDismissKb` and `SubmitPrompt`, and every caller (Actionable, Qol, WorkspaceUI, Message,
MobileLayout) just calls `DismissKeyboard`. The policy itself is sound (never pop the IME on taps/moves); the defects are:
1. the *consent* (keyboard intent) is per-DOM-element and only implemented for LINE prompts;
2. the touch contract has a hole (CHAR) and an over-broad guard (LINE while the keyboard is open);
3. char prompts have no path for the keys a game may need.
Therefore the fix is to make the contract uniform, not to add four unrelated patches:

**Target contract (all prompt modes with a strip):** short tap = "I want the keyboard" (app-level `Input._kbIntent`, set only by
that gesture, cleared by the existing dismiss gestures/callers); hold = radial **only while the keyboard is closed** (otherwise
native selection/paste); submit arrow tap/hold unchanged; game keys reach a CHAR prompt through the keyboard and a small key pad.
LINE-prompt behaviour with the keyboard closed stays byte-for-byte as it is today.

### Do-not-break contract (operator: "don't break anything else")
Must remain exactly as today, each pinned by a test **written and run green BEFORE any code change** (characterization first):
line-field tap opens keyboard; line-field hold (keyboard closed) opens the input radial and never the keyboard; submit tap/hold;
char-prompt submit arrow (Enter then Space) advances startup screens; no IME pops on story taps, Tools, Menu, radial, mic, Message,
tutorial; `#dialog` save-name inputs still keep focus; mic/hold-to-talk (d95); D103 tutorial; D102 Tools list; ReadAloud
(d100 x2); autocomplete; desktop (no proxy, no keypad, no handler changes); Glulx/Quixe prompts; splash.
Implementation order: (1) characterization harness on unmodified code, (2) F3, (3) F1+F2, (4) full regression, (5) codex review.

## 2. Proposed fixes (smallest sufficient; nothing about the existing radial/long-press on the line field is rebuilt)

### F1 (I1, I3) - soft keyboard for character prompts, via a persistent key proxy
Because GlkOte destroys and recreates `.Input.CharInput` after every keystroke (each menu move), focusing the element itself
would drop the keyboard on every key. So:
- Add one persistent `<input id="pl-key-proxy">` (in `play.html`, mobile-only CSS: fixed over the char strip, transparent,
  `autocapitalize=off autocorrect=off autocomplete=off spellcheck=false`, `inputmode=text`, `enterkeyhint=go`).
- A **short tap** (same 20 px / 500 ms convention as the line field) on the CharInput strip focuses the proxy (keyboard up)
  and sets `Input._charKb = true`. A long-press on the strip does NOT open anything new (radial stays on the submit arrow /
  line field as today).
- Proxy `beforeinput`/`input` translate to GlkOte events by jQuery-triggering on the current visible `.Input.CharInput`
  (the same mechanism `SubmitPrompt` already uses): inserted char -> `keypress` with `which=charCode`; Enter/`insertLineBreak`
  -> `keypress 13`; backspace -> `keydown 46`. The proxy value is cleared after each event. IME composition: use the
  diff of proxy value since last clear (handles Gboard `insertCompositionText`).
- `SyncMobilePromptFocus`/`DismissKeyboard`/`focusin` gate learn `_charKb`: while true and a char prompt is active they stop
  blurring the proxy; `_charKb` clears when the user taps outside the input row, when the prompt is no longer a char prompt,
  or on Tools/Menu/mic (existing dismiss list) - same rules as `pmUserFocus` for the line field.
- Desktop unchanged (real keyboard already works).

### F2 (I2) - key pad for keys a phone keyboard lacks
While a char prompt is active on mobile, show one slim row above the input strip: **Up, Down, Left, Right, Esc, Space**
(44 px targets; Enter = the existing submit arrow). Buttons use `pointerdown` + `preventDefault` so they never steal focus /
close the keyboard, and jQuery-trigger `keydown` with the GlkOte keyCodes (38/40/37/39/27) or `keypress 32` on the current
CharInput. Hidden on desktop, hidden for line prompts. Text keys (N, P, Q, letters) come from F1.
Open question for codex: always visible at every char prompt vs only after the user taps the strip.

### F3 (I4) - no radial timer while the keyboard is open
In `touchstart.pmLineTap`: if the field is already keyboard-open (`data pmUserFocus` or `document.activeElement === this`), **do not start the
radial timer** and return without touching the event (also skip the touchend `preventDefault`). The OS then handles caret placement, selection
handles and the Cut/Copy/Paste toolbar. Keyboard closed = byte-for-byte unchanged (short tap opens the keyboard, hold opens the radial). The radial
stays reachable with the keyboard open through the submit-arrow hold (unchanged `BindInputRadialTouch`). Same rule for the F1 proxy. Autocomplete
listens to `input`, so pasted text behaves like typed text. Pinned by `harness/d105-input-contract.js` gap "I4".

## 3. Tests and evidence

**Already written (test-first): `harness/d105-input-contract.js`** - real CDP touch, real Anchorhead, desktop parity. On UNMODIFIED code it is
25 pass / 0 fail with 4 open [GAP] checks (I1/I3 char tap, I4 hold-with-keyboard, I2/I3 menu tap, I2 key pad); `D105_EXPECT_FIXED=1` makes the gaps fail
until fixed. Group A pins everything that must not change (line tap/hold, submit tap/hold, char submit advances, Tools list, story tap closes
keyboard, Q leaves the Inform menu, desktop typing).


New `harness/d105-mobile-char-input.js` (Playwright, 412x860, touch, real Anchorhead + a Glulx/Z char-prompt case):
1. char prompt (title screen): short tap on the strip focuses `#pl-key-proxy`, `inputmode=text`; `beforeinput insertText "x"` advances
   the game; keyboard flag survives the prompt swap (proxy still active element after the next CharInput is created).
2. Anchorhead `help` -> menu: keypad Down moves the `>` cursor, `n`/`p` keys work, Enter (submit arrow) opens the entry, `q`
   returns to the command prompt.
3. Line prompt: keyboard open (`pmUserFocus`) -> a touchstart on the field is **not** `defaultPrevented` and no radial appears after
   800 ms; keyboard closed -> radial still appears (existing d88-touch-longpress / d96 keep passing).
4. Submit-arrow hold still opens the radial in line, char and keyboard-open states.
5. Desktop: no proxy, no keypad, no behaviour change; no page errors.
Regression: the 15-script critical suite + d100 pair + d95 (all must pass).
**Not verifiable headless (needs the operator's device):** the real Android IME behaviour (composition, keyboard not closing on
prompt swap) and the native selection toolbar. These must be listed as unconfirmed until the operator tests the APK.

## 4. Documentation to change with the code
ARCHITECTURE_UML mobile-input paragraph (supersede "without opening the OS soft keyboard" for char prompts) + a new section;
PRODUCTION_PLAN D105 row and D93 G34 marked resolved; USER_GUIDE (keyboard at startup screens, key pad, copy/paste);
tutorial copy unchanged.

## 5. Risks codex should attack
- IME composition and `beforeinput` differences across Gboard / Samsung keyboard; proxy diff logic.
- Keyboard flicker when GlkOte swaps CharInput -> LineInput (menu -> command prompt): proxy must hand focus to the line field or
  close cleanly; must not trap focus over dialogs (`#dialog` save-name fields excluded as today).
- Tap-vs-scroll ambiguity on the strip; z-index against the tutorial overlay, radial and Message dialogs.
- Keypad crowding above the strip in landscape (740x390) and with the keyboard open.
- Anything that duplicates or alters the existing radial/long-press systems (must not).

## 6. CONSENSUS AMENDMENTS (codex adversarial review #713, all accepted by claude; this section is authoritative over sections 2-3)

1. **F1 event contract.** One derivation path from the proxy `input` event (never `beforeinput` + `input` both). The proxy always holds a one-character
   **sentinel** so deletion is observable on empty fields. Pure, unit-testable decoder `Input.CharKb.decode(prev, next, composing)` returns
   `{ kind: "char"|"backspace"|"none", ch }`. Ignore everything while `isComposing`/between `compositionstart` and `compositionend`; commit exactly once at
   `compositionend` or a final non-composing insert; commit **only the first Unicode code point** (Array.from) of a multi-code-point commit and discard the rest
   (one Glk char request = one event); surrogate pairs handled. Enter = `keydown` Enter only (dedupe any `insertLineBreak`); Backspace = sentinel removal, or
   `keydown 8/Backspace` when it is a real key (not 229) with a per-event dedupe flag. Reset the sentinel after every commit.
2. **One keyboard-intent truth.** `Input._kbIntent = null | "line" | "char"` via `Input.KbIntent()/SetKbIntent()/ClearKbIntent()`; `data("pmUserFocus")` is removed
   (read sites replaced; only Input.js and my harness used it). Set only by a short tap on a strip; cleared by outside story tap, Tools/Menu/mic, radial, Message/#dialog,
   prompt disappearance, and the IME being dismissed (proxy/field `blur` that is not a Glk element replacement, checked after a short delay). The per-tick sync may
   transfer focus **only** when the element that held focus was replaced by Glk (disconnected) and the intent still holds; it never refocuses a still-connected
   element every tick (so Android Back stays dismissed). Transitions line->char, char->line, char->char, none are tested.
3. **Proxy geometry.** Created by JS on mobile only (desktop: DOM-absent, test unchanged), `pointer-events:none`, positioned in the strip; the visible CharInput strip's
   short-tap handler focuses it. `aria-label`, `autocomplete/autocorrect/autocapitalize=off`, `spellcheck=false`, `inputmode=text`, `enterkeyhint=go`.
4. **F2 key pad.** Always visible while a char prompt is active on mobile (not only after tapping the strip); 6 compact 44 px keys (Up, Down, Left, Right, Esc, Space) with
   arrow glyphs, `type=button`, `aria-label`/`title`; fits 320 px (6x44 + gaps). Hidden/inert under the tutorial, radial, Message and native dialogs and outside char mode.
   `pointerdown` + `preventDefault` (never steals focus); exactly one game event per press; the target is re-queried on every press.
5. **F3 + Qol contextmenu.** `touchstart.pmLineTap` starts no radial timer when `_kbIntent==="line"` and the field is focused, AND `ParchLockQol.ShowRadialMenu` returns
   without `preventDefault`/opening when `document.body.classList.contains("pl-mobile")` and the focused element is a keyboard-intent line field, so a native
   `contextmenu` from Android's long-press leaves the native Cut/Copy/Paste menu alone. Keyboard-closed hold and submit-arrow hold unchanged; desktop unchanged.
6. **Deterministic target.** Key events are dispatched to **exactly one** eligible visible `.Input.CharInput`; with zero or several, fail closed (no event). Re-query after
   every accepted key (Glk recreates the element synchronously).
7. **Tests** (extend `harness/d105-input-contract.js`, no vacuous asserts): HELP menu cursor movement and activation observed (not just no-throw), exactly-one-dispatch,
   composition start/update/end, input-vs-beforeinput dedupe, Enter duplicate routes, Backspace via sentinel, multi-code-point/surrogate commit, char->line and
   line->char handoffs, two CharInputs => fail closed, hardware Android Back does not reopen the IME, contextmenu suppressed when keyboard closed / allowed when
   keyboard open, overlay gating, rect/stacking at 320x640, 390x844 and 740x390 (incl. tutorial, radial, Message, #dialog). Real Android Gboard remains a manual gate.
8. **Do-not-break additions** accepted: hardware Back priority; D103 tutorial; no event leakage through overlays; desktop mouse/right-click unchanged; submit-arrow
   hold fallback; line paste/autocomplete; modal focus restore; PWA and Capacitor paths; accessibility labels/focus order; MorePrompt/paging char requests; no double
   command from proxy+keypad.

## 7. OPERATOR DECISION (supersedes F2 / section 6 item 4): the key pad is Tools > Arrow keys

Operator: arrow keys must be an on-screen overlay in the style of the radial, reached through **Tools > Arrow keys**: Up/Down/Left/Right around the
edge of the circle, **Enter in the centre**, a tap outside the circle closes it. Implemented as `CharKeys.openArrowPad()` (js/CharKeys.js) with a mobile-only
"Arrow keys" entry in `WorkspaceUI.OpenTools`; the always-visible key row of F2 was NOT built. The pad sends the same events as the proxy to the single current
CharInput (menu navigation), and at a LINE prompt Up/Down recall command history, Left/Right move the caret, Enter submits. It closes on outside tap, Escape,
Android Back (MobileLayout back handler), and automatically under a Message, native dialog, tutorial or radial. Bundling a third-party keyboard was rejected
(an IME is a system choice; SwiftKey SDK is discontinued/licensed; a custom IME is a separate product).

Delivered: `js/CharKeys.js` (decoder, proxy, pad), `Input._kbIntent` (single state; `pmUserFocus` removed), F3 (no radial timer while the keyboard is open) + Qol.js
contextmenu guard, `play.html`/service worker (shell v17), CSS, Tools entry, Back/Escape hooks. Evidence: `harness/d105-input-contract.js` 56/56 with
`D105_EXPECT_FIXED=1`. Unverified (needs the operator's device): real Gboard/Samsung composition, the keyboard staying up across prompt swaps, and the native
selection/Cut/Copy/Paste toolbar.

## 8. Post-review corrections (2026-09-21, codex #717/#718/#719 + operator)

- Operator: **the keyboard must retract after a submitted command** (it covers the reply). Line intent is tied to the tapped field (`Input._kbLineEl`); a replaced field, the submit arrow, the pad Enter and a menu prompt opening all retract it. Leaving a char prompt for the command line also retracts (no auto-open). This supersedes the earlier "intent survives Glk replacing the line field" behaviour and section 6 item 2 for LINE prompts.
- #718 A (device): Glk focuses recreated game inputs while the WebView keyboard is animating, creating competing focus owners. The final root fix makes ParchLock the sole game-input focus owner only in a compact mobile/Capacitor or coarse-touch runtime; Glk still records its deterministic current input window without focusing it. Compact mouse/keyboard desktops retain normal Glk focus, while mobile hardware keyboards continue routing to the current prompt.
- #718 B (device): the mobile strip CSS matched only `.BufferWindow .Input.CharInput`; Anchorhead HELP is a GridWindow char request, so no bottom field existed. CSS now matches `#windowport .Input.CharInput` with `top:auto; height:auto`.
- #719 (device): the char strip had short-tap only. It now has the line-field gesture split (hold >= LongPressMs opens the input radial, move/cancel does nothing, a fired hold suppresses the trailing click; native contextmenu suppressed).
- #717 blockers: `_handled` latch replaced by a per-key token that only dedupes its own matching follow-up input (300 ms); proxy-consumed keys `stopPropagation()` and `Input.KeyPressed` ignores `#pl-key-proxy`; overlay reconciliation moved before `SyncMobilePromptFocus` early returns plus `ParchLock.HandleOverlayOpened` clears intent/pad; post-composition duplicate commit deduped; `SubmitPrompt` char branch fails closed with several CharInputs.
- Evidence: `harness/d105-review-fixes.js` 37/37 and `harness/d105-input-contract.js` 57/57 (real touch and key input), plus `harness/d100-live-turns.js` 16/16 and an 800x900 compact-desktop mouse/keyboard regression. Real Android IME remains the final operator verification.

## 9. D111 automatic grid-menu pad (2026-09-22)

The manual Tools path remains, but the mobile shell now auto-opens the same pad on the
rising edge of exactly one visible `CharInput` inside a `GridWindow`. Live evidence
distinguishes Anchorhead startup (`BufferWindow`, excluded) from HELP (`GridWindow`,
eligible). ZVM `read_char` exposes no allowed-key/menu metadata, so no broader trigger
is permitted. Eligibility survives Glk prompt replacement without flicker, user closure
is respected until re-entry, and only auto-owned pads close on automatic exit. The
automatic backdrop leaves the CharInput strip directly tappable for keyboard letters.
