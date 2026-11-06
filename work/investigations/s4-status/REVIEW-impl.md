# S4 implementation review (stand-in seat) -- verdict: REVISE (one small item)

Reviewed the current working-tree source of the 5 S4 files against REVIEW.md.

## Conditions from REVIEW.md
- Selector scoping: OK. `#windowport.pl-hide-status > .GridWindow.pl-oneline-status`. Tagging walks only
  `#windowport`'s direct children, so `#layout_test_pane` is never matched (also asserted by the harness).
- One-line detection: OK. Counts direct `.GridLine` children (GlkOte keeps one per grid row).
- Reclaim and VM sizes: OK. Proved independently in the candidate tree. Sherlock was loaded at 396x850, then
  resized to 1280x900, 396x850, 850x396 (rotation), and 396x850, with the option on vs off. At every step the
  GlkOte inline left/top/right/bottom and the grid column counts were identical on vs off (49/143/49/51/49). That
  equals unchanged bbox-derived gridwidth/gridheight sent to the VM. `--pl-reclaim-top` and the buffer's rendered
  top tracked the grid top at every step (8/28/8/4/8 px). No stale top: the MutationObserver on style re-runs
  apply() after GlkOte rewrites the inline boxes. Script: scratchpad resize.cjs.
- Always-visible checkbox with a gated effect: OK. No aria-hidden, no display:none: OK.
- ZRamProvider `_windowportText`: fixes the hidden-grid read, but see below.

## REVISE item (small)
`_windowportText` uses the textContent of every `.GridLine, .BufferLine`. innerText used to skip display:none
lines. Actionable.js:2494-2497 hides D207 carry-probe replies with `display:none` + `.pl-carry-probe` +
aria-hidden. Those hidden replies now feed the room-label fallback (ZRamProvider ~178, which scans lines from the
last one back) and matchRoomFromText (~193). The old code ignored them.
Fix: skip rows that are `.pl-carry-probe`, `[aria-hidden="true"]`, or `closest('[hidden],[style*="display: none"]')`.
Keep the visibility-hidden status grid. Add one assertion: a hidden probe line is not read.

## Runs (candidate = git archive HEAD + only the 5 S4 files; base = git archive HEAD; other lanes' StatTracker/ZvmCapture edits excluded)
- status-probe-matrix --owner=claude, full, both widths: base 135 pass / 2 no-probe / 1 fail (sycamora@1280);
  candidate 136 pass / 2 no-probe / 0 fail. The base failure is a flake: it passed when rerun alone on base. No candidate regression.
- s4-status-clock 0 FAIL; s4-hide-status 0 FAIL; stat-tracker 211 PASS / 0 FAIL; operator-regressions 13 PASS / 0 FAIL (all in the candidate tree).

ACCEPT once the probe-line exclusion is added and the 4 S4/stat harnesses are rerun.

## Claude closing fix for REVIEW-impl REVISE
_windowportText now skips .pl-carry-probe rows, rows inside [aria-hidden="true"]/[hidden], and display:none ancestors. The S4 visibility-hidden status grid is still read. New s4-hide-status assertion "hidden carry-probe row not read by the fallback" passes at all 4 cases. s4-hide-status 0 FAIL, s4-status-clock 0 FAIL, stat-tracker 211/0, operator 13/0. Accepted for commit.
