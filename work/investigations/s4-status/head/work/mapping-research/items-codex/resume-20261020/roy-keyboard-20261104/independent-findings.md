# Independent blind findings — Roy keyboard feedback (2026-11-04)

Scope: read-only source investigation of the supplied quotation; no parent hypotheses or investigation files read. No production changes or catalog/APK work.

## Meaning
Roy is asking for Ctrl+Shift+Up Arrow to submit north and Ctrl+Shift+Down Arrow to submit south. His star and numeric keypad 5 combinations describe workaround bindings necessitated by Parchment claiming the arrows. North/south are compass directions, not the separate parser commands UP/DOWN.

## Evidence
- js/Input.js:3-13 advertises north as `/ or *` and south as `Numeric keypad 5`.
- js/Input.js:133-135 installs Input.KeyPressed on body with a bubbling jQuery keydown handler.
- js/Input.js:1019-1034 already contains Ctrl+Shift+ArrowUp => Clear/Inject n and ArrowDown => Clear/Inject s, as well as the legacy /, *, Clear aliases and the other compass directions. Thus missing direction cases are not the source defect.
- lib/main.js is minified, but its GlkOte `Te(e)` line-input keydown function unconditionally handles keyCode M/I (up/down) as native command-history navigation and returns false while a live input exists. It does not exclude Ctrl or Shift. Since jQuery false stops bubbling, the input consumes the event before Input.KeyPressed on body can receive it. Its character input handler `ke(e)` separately maps arrows to game character events and returns false, so those prompts must retain their native ownership.
- js/Input.js:1095-1113 already assigns Ctrl+Up/Down to app history in the non-Ctrl+Shift branch, but the same descendant interception can affect its reachability. This is adjacent behavior, not necessary scope for Roy's request.
- js/Input.js:999-1016 excludes the char-key proxy and protects #message/#dialog targets. The present compass branch has no explicit capture/consumption.
- js/Input.js:34-86 contains the existing non-typed submission choke point. Actionable.Submit (js/Actionable.js:1338 onward) checks line prompt and dialog availability before clearing and delegating to it. Input.SubmitPrompt explicitly fails closed with several visible line prompts (161 onward).
- ARCHITECTURE_UML.md section 40 preserves real char input routing and specifies exactly one eligible prompt for synthetic keys; ordinary arrow pad up/down at line prompts mean history, whereas char prompts receive arrow key events.
- js/Map.js:202 displays shortcut tooltips from Input.KeyboardNavigation with `Shift+` prefix, although the actual handler requires both Ctrl and Shift. Any help refresh should use truthful modifier labels.

## Narrow remedy proposal
Add a narrowly scoped native capture-phase keydown owner for the requested Ctrl+Shift+ArrowUp/ArrowDown chords before GlkOte's target handler. Activate only for an unambiguous usable visible line prompt in the intended game-input context, with no blocking dialog/modal/overlay; exclude character prompts/proxy, composing events, unrelated editable fields, and unwanted extra modifiers. For an accepted movement event consume default/propagation so Glk history cannot also run, then submit `n` or `s` exactly once through the existing submission path. Preserve star/Clear aliases for compatibility. Prefer this small app-owned interception over editing the minified interpreter or changing ordinary arrows globally. Decide repeat policy explicitly to avoid accidental multi-turn held-key input. Refresh north/south shortcut labels and affected tooltip modifier text if implemented.

Validation should establish focused native event ordering and one actual command per chord, unchanged typed draft/history after ordinary arrows, retained aliases, and no movement/clearing at char prompts, dialogs, other editable fields, missing or multiple prompts. A real-browser native-key test is needed: invoking Input.KeyPressed directly cannot detect the interception defect.

## Limits
This is source evidence, not a live browser reproduction or proof of Roy's exact runtime/build/layout. Numeric keypad 5 can yield `Clear` with Num Lock off; the code does not explicitly handle `Numpad5`/key `5`, so the quotation does not establish behavior across Num Lock settings. Authentication attempts required by AGENTS (`worker-client status/read`) both returned fatal `fetch failed`; no bypass attempted and no authenticated blind findings exchange can be claimed. Root coordinator must disclose that workflow limitation. No implementation consensus or completion claimed.
