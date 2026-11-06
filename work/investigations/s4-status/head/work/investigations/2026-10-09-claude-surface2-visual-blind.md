# Surface 2 (story buffer, input bar, floating controls): claude review, sealed

Written 2026-10-09, without reading `2026-10-08-codex-surface2-visual-blind.md`.

**Disclosure: this is not fully blind.** Before writing it I had read Codex bus messages #2026 and #2027. They give Codex's input geometry (x=40, stable, from the D203 rail reserve), and that point is not independent here.

- **Method:** read-only. Scratch scripts `harness/_s2_shots.js` and `harness/_textwin_probe.js`.
- **Setup:** Anchorhead, after `look`, `southeast` and `inventory`, plus a long typed command.
- **Coverage:** 1280x800, 390x844 and 320x640 in dark and light, plus 412x915.
- **Screenshots:** `work/investigations/beautify-shots/s2-*.png` and `textwin-*.png`.
- **Overflow:** no horizontal overflow at any width.

## Operator requirements for this surface (2026-10-09)

- The text window bottom must be above the direction handle. If it is not, that needs fixing.
- The phone input line "doesn't stand all the way to the left" and "moves around sometimes, along with the other input buttons".
- These reserves are functional and must be kept:
  - the exit banners around the edge;
  - the top label protection;
  - the input line;
  - the direction handle.
- The story window is its own protected window.

## Findings

### T1: the text window bottom versus the direction handle (measured)

The text window's content bottom (window bottom minus its 96px padding) and the handle at each width:

| Viewport | Text bottom | Last line | Handle hit box | Visible dot | Protector top |
|---|---|---|---|---|---|
| 390x844 | 740 | 721-740 | 736-780 | about 748-768 | 756 |
| 320x640 | 536 | 521-536 | 532-576 | about 544-564 | 552 |
| 412x915 | 811 | 790-811 | 807-851 | about 819-839 | 827 |

- The text clears the **visible dot** by about 8px at every width.
- It does **not** clear the handle's **touch box**: the last 4px of the text window lie inside it. So a tap or long-press on an underlined word on the last line can land on the handle instead of the word.
- By the operator's rule this needs fixing. The window's bottom padding should derive from the handle box top, for example `96px` becoming `protector + handle-box overhang + gap`, with one shared variable as in D215, rather than a constant.

### T2: an exit banner is covered by the input controls

In `textwin-390.png`, the bottom-edge exit label ("SE" chip plus "Alley") is drawn at about y=830, x=290-360. That is under and behind the mic button and the right end of the input row. A functional reserve (an exit banner) is being overlapped by another functional reserve (the input bar).

- Check where the bottom-row exits (S, SE, SW, D) are meant to sit on phones.
- Either their band must sit above the input strip, or the input strip must reserve room for them.

**The operator confirmed this independently on 2026-10-09:** "the exits banner at the bottom of the screen is missing its protective space! it says alley".

Measured with `harness/_exitbot_probe.js` at 390x844, game start:

| Element | Box |
|---|---|
| Bottom-row cells (`Map.js:40` `CreateMiniMap("horizontal bottom", ["sw","s","se"])`) | top 824 |
| Visible label "SE Alley" | about x=290-360, y=824-844 |
| Input | 790-834 |
| Mic | x=336-380, y=790-834 |

- The input and mic (z 25) paint over the label (#exits z 24).
- The position is the same with the CSS of HEAD, b747e42 and 27d2fbe, all loaded with the current JS. So this is not caused by the D215 surface 1 diff, and the CSS has not changed it since at least 30 September.
- Mobile has a top protective band for the top row (D121, `#exits .row.horizontal.top` with `--pl-band-h`), but **no equivalent reserve for the bottom row**.
- `harness/exits-safe-area.js` has no bottom-row assertion, which is why nothing caught it.
- **Direction for the fix:** the bottom row needs its own protected strip. Either a band between the story window and the input strip that grows by the row's real height (mirroring the top band, D121), or the row placed inside the existing bottom protector above the input row. Either way, the story window's padding and the D215 protector variable must grow by it, so the story text, handle, input and exit label never overlap. Add a bottom-row assertion to exits-safe-area.

### T3: the status line collides (game grid window)

In `textwin-390.png`, the top status line reads "Outside the Real Estatday onee": the long room name and "day one" overwrite each other.

- It is the game's own grid window, drawn at a width the reported column count does not fit.
- It needs a check that the grid column count reported to the VM matches the pixels actually available at 390 and 320.
- This is the "label protection at the top" area, so the band itself must stay.

### T4: the input line does not reach the left edge (operator report)

The input starts at x=40 at every phone width and ends 10px from the right, so it looks asymmetric.

- The 32px left reserve is the left-rail exit banner ("W Narrow Street", rotated, vertically centred around y=370-480 at 390).
- At the input's height (y=790+) the rail shows nothing in my captures.
- Option: the input line uses the safe gutter (8px) on the left whenever the rail banner cannot reach the bottom strip. That needs evidence that the rail's vertical extent never reaches the input row, including long west labels.
- **Movement:** I did not reproduce drift in desktop emulation (no soft keyboard). It needs a check on the real device, or an emulation of keyboard open and close (the `--pl-kb-inset` transitions) and of the mic button changing state (the `--pl-mic-gutter` variable is in the width calc, line 2438), which would move Send and the input width.

### T5: light theme at 320 shows a blank status bar (needs confirmation)

In `s2-320-light.png` the grey status bar at the top has no visible text, while 390 dark shows "Alley  day one". This may be my theme-toggle timing in the capture (Codex noted a light-theme settle delay), so it needs confirmation before it is treated as a defect.

### T6: the long typed command

The long command scrolls horizontally inside the input and shows its tail, which is normal. It does not wrap, and there is no visual cue that the text is clipped on the left. This is minor.

## Prior-fix guard for any surface 2 change

| Decision | What must be preserved | Proof |
|---|---|---|
| D93 | the single `--pl-kb-inset` geometry | layout-regression |
| D121 | the exits band with its own backing | live exit-banner capture |
| D203 | the story readable-left and rail reserve | — |
| D168 | the mic placement | — |
| D215 | the shared protector variable | — |

Also run the dirpad drag and tap check, and the input focus and submit check.
