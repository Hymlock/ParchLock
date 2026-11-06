# S4 implementation (per REVIEW.md: a ACCEPT, b REVISE/R2)

Not committed. Patch: `work/investigations/s4-status/s4.diff`.

## (a) Clock regex -- js/StatusGridDecoder.js:85
`^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(day|sday|nesday|rsday|urday)?\.?,?\s+)?H:MM(:SS)?(\s*[ap]\.?m\.?)?$`
Still anchored; the whole segment becomes the `time` metric and leaves roomCandidates.
Bare numbers ("0") stay unlabelled. "Saturday Market" and "5:11 amulet" do not match.

## (b) Hide game status line
- `Global.Prefs.HideStatusLine` (default false), js/Global.js.
- Checkbox `#pl-hide-status-line`, always shown in Options > "Accessibility & controls" (js/WorkspaceUI.js).
- `StatusLineHide` (end of js/WorkspaceUI.js): a debounced MutationObserver.
  - Tags only direct `.GridWindow` children of `#windowport` with `pl-oneline-status` when
    the grid has exactly one `.GridLine`. GlkOte keeps one GridLine per grid row (lib/main.js
    grid update adds/removes `winN_lnK` to match `gridheight`), so that equals gridheight===1.
    `#layout_test_pane` is never tagged.
  - Gate: pref on AND exactly one one-line grid AND its decoded roomLabel is readable text
    AND StatTracker.visibleStats() (fallback: decoded metrics) is non-empty. Otherwise
    nothing is hidden.
  - When on: `#windowport.pl-hide-status`. Frames whose GlkOte inline `top` sits at the grid's
    bottom (+0..16px spacing) get `pl-status-below` and `--pl-reclaim-top` = the grid's top.
- CSS (css/ParchLock.css, appended):
  `#windowport.pl-hide-status > .GridWindow.pl-oneline-status { visibility:hidden }`
  `#windowport.pl-hide-status > .WindowFrame.pl-status-below { top: var(--pl-reclaim-top) !important }`
  Reclaim works because GlkOte positions frames with inline left/top/right/bottom (not height):
  overriding `top` grows the buffer up into the freed line. GlkOte's inline styles, its
  bbox-derived gridwidth/gridheight and the arrange sizes sent to the VM are untouched.
- No aria-hidden; no display:none.
- js/ZRamProvider.js fallbacks (~178, ~193): `#windowport.innerText` -> `_windowportText(wp)`,
  i.e. textContent of each .GridLine/.BufferLine joined by "\n" (keeps the line structure the
  innerText split relied on; falls back to wp.textContent).

## Evidence
- harness/s4-status-clock.js: 12 PASS / 0 FAIL (Sat 5:11 AM, Saturday 5:11:00 a.m., Wed. 12:30 p.m.
  -> time; Saturday Market / 5:11 amulet -> no metric; Curses both widths unchanged vs probe.json).
- harness/s4-hide-status.js (Playwright, gate seeding, Sherlock+Curses x 396/1280, on vs off):
  0 FAIL. readRaw + decoded metrics identical; GlkOte inline window boxes + grid rows/cols identical;
  Sherlock@396 hidden (room + time metric) and buffer top == former grid top (8px vs 36px off);
  Sherlock@1280 grid shows only "Saturday 5:11:00 a.m." (no room label) -> stays visible;
  Curses 10-row quote grid visible at both widths; test pane untouched. Results:
  hide-status-results.json; screenshots *-hide-on.png / *-hide-off.png here.
- Focused regression gate (GLULX=1; Sherlock, curses, Advent, Zork1, anchor, Alabaster),
  base = `git archive HEAD`, candidate = base + the 5 S4 files: 0 differences
  (gate-base.jsonl / gate-cand.jsonl).
- roomCandidates before/after over the gate games at 396/1280 (roomcandidates-diff.log):
  1 diff, Sherlock@396 only ("Sat 5:01 AM" leaves roomCandidates).
- Other suites: see TESTS section below.

## Notes / limits
- Sherlock at 1280 prints the clock without the room in the grid it reads, so the option
  has no effect there by design (gate requires a room label).
- The gate reads StatTracker.visibleStats(); StatTracker.js was not edited.

## TESTS
- harness/stat-tracker.js: 211 PASS / 0 FAIL
- harness/stats-sweep.js: completed, TALLY OK 196 / UNAVAIL 66 / NOPROMPT 8 / NOSTATS 39 (no baseline diff taken)
- harness/status-module-live.js: exit 0
- harness/stat-render-diff.js: 10 PASS / 0 FAIL
- harness/operator-regressions.js: 13 PASS / 0 FAIL
- harness/status-probe-matrix.js: NOT complete -- killed by my 900 s timeout wrapper mid-sweep
  (the trailing "browser has been closed" errors come from that kill). Needs a rerun without the cap.
