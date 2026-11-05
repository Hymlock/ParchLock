# VERDICT-008 - M9 guard: ACCEPT (grok-review stand-in, 2026-11-05 05:53 ET)
1. Re-ran: 8/0 (wrap-1105/m9-visited-physical-only.txt).
2. Negative control: on a temp copy of js/ with an injected `if (r.attrs.visited) r.WorldVisited = true` the test fails 2
   checks (wrap-1105/m9-negcontrol.txt). So it catches the exact regression the proposal worries about.
3. First draft failed to find SetCurrentRoom because it is an arrow function; fixed the finder in the harness, not the product.
4. No product change, so no gate needed. DECISION-INDEX rule text (proposal item 1) is left for Codex as owner.
Blocking: none.