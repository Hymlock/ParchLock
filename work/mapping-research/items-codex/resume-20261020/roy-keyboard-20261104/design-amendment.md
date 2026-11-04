# Design amendment review — 2026-11-04

Verdict: ACCEPT.

Reviewed current unamended CaptureMovement in js/Input.js. The reported failure follows directly from the target GlkOte history handler: returning unconsumed from capture preserves native history ownership, which can mutate the game-line draft even when the movement owner declines to submit.

The proposed ordering is correct: first match only Ctrl+Shift+ArrowUp/Down with forbidden modifiers/composition excluded; establish exactly one visible enabled game line, no visible char prompt, and target ownership; then preventDefault and stopImmediatePropagation; finally check overlay/leave states and repeat before any clear/submit. A blocked chord owned by the game input becomes a no-op and preserves the draft. Other controls, modal editable targets, char prompts, and unrelated keyboard combinations remain unclaimed. This does not change ordinary history.

The correction should retain all existing overlay checks, and include no-story as a blocking state. Tests must distinguish no submission from preserved draft: both are necessary. Preserve the failed pre-amendment evidence and run the final focused/gate evidence only against the amended immutable candidate. Map.js truthful Ctrl+Shift prefix and metadata/documentation changes remain accepted scope. No runtime edit made by this reviewer.
