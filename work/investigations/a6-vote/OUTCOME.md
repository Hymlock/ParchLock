# A6 outcome (11-07): CLOSED, already resolved in source

Votes: grok (resolved-in-source, pending a visual check), grok2 (keep mono), claude (sealed: keep mono).
Attack that decided it (grok): Options chrome is sans by design, not mono. css/ParchLock.css:2391
(#message:has(#game-options) system-ui sans) and :2409-2410 (buttons inherit !important) override the
global mono button rule at :45-47. Claude's and grok2's "mono by design" premise was wrong for chrome.
Visual check (claude, Chromium desktop 1280 and phone-width 375, Advent, Options):
"Configure directions...", "Replay tutorial", "Reset tutorial" all compute
font-family system-ui, -apple-system, "Segoe UI", sans-serif; no overflow.
Claude and grok2 change vote to grok's: unanimous CLOSE. Reopen only if a phone screenshot shows mono
(then the fix is a :has() fallback, not a font-policy change). Phone look pending (device disconnected).
