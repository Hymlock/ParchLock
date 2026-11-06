# S4 adversarial review (stand-in seat) -- verdict: REVISE

(a) regex is acceptable; (b) has one blocking defect and one functional gap.

## 1. Regex false positives -- none found (a OK)
- js/StatusGridDecoder.js:85 is anchored `^...$` and requires `\d{1,2}:\d{2}`. A room like "Saturday Market" cannot match. Widening the weekday to `(Mon|Tue|...|Sun)(day|sday|nesday|rsday|urday)?` and adding `[ap]\.?m\.?` keeps it anchored, so only whole segments of the form weekday + clock leave roomCandidates.
- Segments split on `/\r?\n| {3,}/` (line 48). Sherlock's "Sat  5:11 AM" and "Saturday  5:11:00 a.m." use 2 spaces, so each stays one segment. The trailing score "0" after 3+ spaces splits off and stays a bare number. Good.
- Corpus grep for `weekday,? H:MM` and `H:MM a.m.` across m14-roomname/census-*.jsonl and s4 probe.json: the only hits are Sherlock's (probe.json). The census holds room/short/story fields, not raw grid text, so this is not a full 309-game grid sweep. Required: run the decoder over the regression-gate status captures before and after, and diff the roomCandidates. The expected diff is Sherlock only.
- Avoid `\s*[ap]\.?m\.?` swallowing a trailing word: keep the `$` anchor and test with "5:11 amulet". It fails to match, which is correct.

## 2. GlkOte measurement -- BLOCKING
- lib/main.js measure_window builds `#layout_test_pane` (visibility:hidden, offscreen) containing `<div class="WindowFrame GridWindow">` with two GridLines. It sets gridcharheight from line positions and `gridmarginy = outerHeight(GridWindow) - (2 lines)`.
- A rule like `body.pl-hide-status .GridWindow { height:0; overflow:hidden }` matches that test div. gridmarginy goes negative, and gridheight/gridwidth go wrong for EVERY grid, Curses' quote box included, whenever the option is on or toggled before a re-measure. This is the D152 failure mode.
- Fix: scope the rule to `#windowport .GridWindow.pl-status-oneline`, with the class set by JS from GlkOte's own gridheight===1. Never use a bare `.GridWindow`. CSS cannot know a grid is one line without a class.
- Real windows: gridwidth/gridheight come from `e.bbox` (layout arithmetic from windowport size + metrics), not from the element's rendered height. So zero-height on the live grid does NOT change the column count reported to the game. OK once the selector is scoped.
- Functional gap: windows are absolutely positioned from bbox, so a zero-height grid leaves an empty band. The BufferWindow does not move up. The proposal must say whether the goal is reclaiming the line (that needs the buffer's top offset adjusted, e.g. a matching `top` override on the sibling BufferWindow) or only removing the visible text. Currently it does neither cleanly.
- Text reads: readRaw (StatusGridDecoder.js:143) reads `innerText` of a DETACHED clone. Detached nodes are not rendered, so innerText falls back to textContent semantics and hidden content is still returned. OK. ZRamProvider.js:167-175 uses textContent. OK. ZRamProvider.js:178/193 use `#windowport.innerText`. In Chrome that SKIPS visibility:hidden text, so that fallback loses the status line when the option is on. It is the last fallback, but switch those to textContent or exclude the grid explicitly. Add a test that the decoded metrics are identical with the option on and off.

## 3. Appearing/disappearing checkbox -- simplify
- Proof is per module and arrives only after the first status decode, so a gated checkbox flickers in and out between games and looks broken.
- Recommended: always show the option (a global preference), labelled "Hide status line when the stat strip shows it". Apply the hide class only while the current module's strip has at least one metric (D149 proof). The preference is stable and the effect is gated. No disappearing UI.

## 4. Accessibility
- visibility:hidden already removes the grid from the accessibility tree. aria-hidden is redundant; do not add it (double-hiding is easy to leave stale).
- Real loss: a screen-reader user loses the room name + time/score unless the strip exposes them. The strip must be readable text (not icon-only, not aria-hidden). Its update should not be an assertive live region on every turn. Gate on "strip shows the metrics AND the room label". Otherwise a hidden grid removes the room name for Sherlock's segments that stay unlabelled.

## Required before ACCEPT
1. Scope the CSS away from #layout_test_pane (JS-set one-line class).
2. Decide reclaim vs blank band; implement the buffer offset if reclaiming.
3. Change the ZRamProvider windowport innerText fallbacks to textContent; add an on/off equality test.
4. Make the option always visible with a gated effect.
5. Run a before/after decoder diff over the gate captures (expect Sherlock only), plus operator-regressions.js and regression-gate.cjs.
