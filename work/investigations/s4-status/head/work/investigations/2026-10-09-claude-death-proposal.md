# Death counter: proposal P-DEATH (claude), for adversarial review

**Inputs:**
- sealed reviews `2026-10-09-claude-death-signal-blind.md` and `2026-10-09-codex-death-signal-blind.md`;
- research `2026-10-09-claude-death-research-r1.md`;
- codex #2088, #2105, #2106, #2108, #2112 and #2113;
- the contract in **D204 "Deaths and wins"** (PRODUCTION_PLAN.md around line 7589; codex cited D208, but the text is in D204).

The operator's rule throughout: prefer a deterministic signal, verify it through text, and use text alone only when it is the only indicator.

## 1. The defect, as measured

- HHG (ZIL) dies with "Better luck next life", then the score, then the RESTART/RESTORE/HINTS/QUIT question, at an ordinary LINE prompt.
- `StatTracker.observeText` (StatTracker.js:2504-2540) counts only:
  - `***...***` banners classified by keyword (StatTracker.js:1328), or
  - a free-text regex (`you have died|you are dead|you were killed|a fatal blow|game over`) over *any* output.
- HHG matches neither, so it counts 0. The free regex is also unsafe in the other direction:
  - narrative or quoted text can match;
  - "game over" is classed as death, though it can end a game in any way;
  - the banner comment wrongly claims every ending prints stars (codex #2108).

## 2. Outcome authority (ordered)

**Step 1: is this a terminal prompt?** It is if:
- (a) **Read site.** Calibrated per story: the main-loop read site is the `(pc, frames.length)` of the VM at the line prompts that follow *distinct player submissions*. It is never counted from observer or poll ticks (codex #2106), and no extra commands are run to learn it. A prompt read from a different site is a *candidate* terminal prompt.
- (b) **Uncalibrated fallback** (codex #2112: an imported save that dies on its first command). A settled native line prompt whose fresh output ends with the authored terminal-menu grammar. That means RESTART together with RESTORE (case-insensitive word tokens, optionally with QUIT, UNDO or HINTS) in the **last output span before the prompt**.
- In both cases the terminal-menu grammar must be present: a read site alone never suffices. YES/NO confirmations, the post-Restore prompt and disambiguation all read off the main loop but carry no terminal menu, so they are negative controls.

**Step 2: what kind of ending?** It is decided only inside the **terminal span**: the output produced after the last player submission, up to this prompt. The span excludes the player's input echo (`Style_input` and the command line) and retained or replayed transcript.

| Outcome | Evidence |
|---|---|
| death | Inform `deadflag == 1`, only where proven for this story (section 3); or an explicit authored loss cue inside the terminal span. The cue is either a `***`-banner whose text says died, dead, death, killed or slain, or a fixed authored loss line, a bounded list of literal phrases: "you have died", "better luck next life", "**** you have died ****". No free-prose regex outside the span. |
| win | `deadflag == 2` (proven); or a `***` win banner ("you have won", or a banner saying won or victorious) inside the span. |
| unknown | Everything else, including "game over", custom endings (`deadflag` of 3 or more) and quit. **Nothing is counted.** |

- **Fixes to existing code:** remove "game over" from death, remove the free-text regex outside the terminal span, and correct the banner comment.
- **Unsupported, recorded honestly** (codex #2113): Inform `AfterLife` resurrection. `deadflag` is reset before any end menu, so no terminal prompt occurs. We do not add prose inference for it. A proven life-stat transition path (an existing D204 clause) may count it later, where one exists.

## 3. Inform `deadflag`: optional, proven per story, never inferred from one correlation

A global G is accepted as `deadflag` only if every one of these holds:
1. G == 0 at every calibrated main-loop read seen (at least N=5 distinct submissions).
2. G becomes 1 or 2 exactly when a terminal prompt is detected (step 1).
3. G returns to 0 after an accepted RESTART.
4. G is unique: no other global satisfies 1-3.

Until then the authored-cue path decides. A proven G is stored per executable identity, never per title, and is discarded on any contradiction. It is never used in ZIL: HHG's death turn changes no globals.

## 4. Counting, deduplication and lifecycle (D204 kept as the single owner)

- **One count per terminal episode.**
  - The episode key is (playthrough epoch, terminal-span id, submission id).
  - A latch is set at the terminal prompt. It retires on an accepted RESTART, RESTORE or UNDO, or when a main-loop prompt is next read.
  - Re-observing the same span (resync, a new capture generation, polling) never recounts: an explicit replay latch, in addition to `seenBanners` (codex #2112).
- **Restore.** Restoring a save that sits *at* a terminal prompt counts nothing. A count needs fresh terminal output after a player submission. The HHG save case counts 1, because the death is produced by the new command.
- **D204 lifecycle unchanged.** "Deaths this playthrough" and "Wins this playthrough":
  - reset on module load, New Game and accepted RESTART;
  - survive undo and restore within the playthrough without a replay recount;
  - never enter learned-fact persistence;
  - `forgetReadings()` and `Resync()` do not zero them.
- **Performance.** Evaluation runs once per new input request (a prompt transition), over the bounded terminal span only. No whole-transcript scan per Tick (earlier performance fixes).

## 5. Presentation (operator: "don't forget the death stat representation")

- Label: **"Deaths this playthrough"** (and "Wins this playthrough"), so the scope is clear.
- A numeric tile (`data-value-type="numeric"`, D215 grid), shown **only when the value is above 0** (D149, only relevant stats; current `collectRows` behaviour).
- It is product-owned: never presented as a module statistic, and never fabricated.
- When a death is counted, the existing `StatTracker._events` "death" event fires as today. Any toast or notification is unchanged.

## 6. Proof plan (bounded, sample until proof; live proofs under claims)

| Case | Expected |
|---|---|
| HHG imported save (19-14-16), then `look` | deaths = 1, through the uncalibrated fallback plus "better luck next life" |
| The same, with a second identical restore and death | the count increases once per new death, never on replayed text |
| HHG fresh start, normal turns | 0 |
| `quit` then `n` (YES/NO, off the main loop, no terminal menu) | 0 |
| Save and Restore prompts | 0 |
| Typed `say "you are dead"` and quoted narrative "you are dead" | 0 (input echo excluded; outside the terminal span) |
| Zork I JIGS-UP death (troll or grue) | 1, with the read site off the main loop |
| An Inform death, if reachable cheaply (wump2ka: pit or wumpus; random cave, so retry or seed) | 1, with `deadflag` acceptance (section 3) recorded or declined |
| RESTART | the counter resets; UNDO and RESTORE within the playthrough keep it |
| A win, if cheaply reachable | wins = 1 |

**Prior-fix guard:** D204 (stat harnesses: stat-render-diff, prowess-retry, d204-*), D149 (equipment-ui), D215 (status grid), and command-consistency. All are run before and after and judged by real exit codes.

## Revision R2 (answering codex #2116, points 1-7)

**Honest framing.** Neither sealed report found a universal deterministic death field. The outcome evidence is therefore authored text, bounded by deterministic framing:
- a real player submission;
- the next real input-request generation;
- input-echo exclusion;
- the native prompt state.

The read site becomes **corroborating evidence only** (point 4).

| Point | Change |
|---|---|
| 1, menu grammar | Token co-occurrence is not enough. The terminal menu must be a **structured choice line**: one line offering at least two distinct option words from {RESTART, RESTORE, QUIT, UNDO, HINTS, AMUSING}, including RESTART or RESTORE, set out as a list (separated by commas and "or", or parenthesised "Type X, Y or Z"), and phrased as an offer ("Would you like to…", "Do you want to…", "(Type …)", "Please give one of the answers above"). Quoted dialogue (inside quotation marks) is excluded. |
| 2, span and tail | The **submission output** is every fresh line from the submission up to the next input request, in order, without the echo. The menu must appear in the **last 3 non-empty lines** of that output (bare prompt punctuation such as ">" or ":" does not count as a line). The loss or win cue may appear anywhere in the same submission output. |
| 3, deadflag | Dropped as authority, and also as a counting path, because a correlated boolean is not proof. It is recorded as future work, needing structural executable proof (for example the compiled main-loop test). No partial use. |
| 4, same read site | The verdict no longer requires an off-main read site. The read site is stored on the event as corroboration (`readSite: main/off/unknown`) for diagnostics only. |
| 5, conflicting cues | If both a death cue and a win cue appear in one submission output, the outcome is **unknown**: no increment of either. |
| 6, prompt boundary | Use the actual input-request generation: each new line or char input request from the Glk layer, including synchronous same-site re-requests. The decision is made once per request generation, never on a PC change or an observer tick. |
| 7, replay versus new death | Only output produced by an ordinary player submission in this session can count. The output of meta submissions (RESTORE, RESTART, UNDO, SAVE) and any restored, retained or replayed transcript **never** counts. After restoring a pre-death save, the first ordinary command (for example LOOK) that produces a death **does** count. The HHG case therefore gives 1, and restoring a save that already sits at an end menu gives 0. |

**Cue lists (bounded literals, matched case-insensitively, as whole phrases):**
- Death: a `***` banner containing died, dead, death, killed or slain; "you have died"; "better luck next life".
- Win: a `***` banner containing "won", "win" or "victor"; "you have won".
- Extensions only by evidence from a real module ending, never speculatively.

**Guards narrowed** (codex): focused existing fixtures (stat-render-diff, plus any death or banner fixture in the stat harnesses), plus the new focused death fixture and the proof table above.

## Revision R3 (codex #2126): the agreed contract. It supersedes R1's cue list; R2's framing stands.

**Cues are complete, bounded outcome phrases**, case-insensitive and whole-phrase, wherever they appear (inside a `***` banner or not). Keywords alone never count, so "**Death of a Salesman**" and "**Win a prize**" are headings, not outcomes.

| Outcome | Phrases |
|---|---|
| Death | "you have died", "you are dead", "you have been killed", "better luck next life" (verified on HHG) |
| Win | "you have won", "you are victorious" |

Extensions only by evidence from a real module ending.

**Exclusions:**
- player echoes (`Style_input` and the command line);
- cue text inside quotation marks;
- retained or replayed output;
- the output of meta submissions.

**Terminal-menu detection** admits option names in parentheses or quotes when they are the offered options. "(Type RESTART, RESTORE, HINTS or QUIT)" from HHG is the canonical positive. Quoted *dialogue* lines (a speaker's sentence) are not menus.

**Fixtures (synthetic plus native):**
- **Negatives:**
  - a heading banner ("Death of a Salesman") followed by an end menu (unknown, no count);
  - quoted "you are dead" in dialogue;
  - a typed `say you are dead`;
  - mixed death and win phrases in one ending (unknown);
  - instructions mentioning RESTART and RESTORE outside a choice line.
- **Positives:**
  - a multi-line ending whose cue line comes before a blank line, the score line and the menu line (counts 1);
  - the native HHG save (counts 1).

**Sequencing:** source implementation starts after the G3 audit closes.

## Amendments A1-A3 from the live proof (claude; for codex review, sealed with evidence)

**A1. Zork resurrection.**
- Zork I's JIGS-UP prints "**** You have died ****" and resurrects the player with no end menu.
- Measured live: walking into the dark cellar until the grue strikes gives deaths 1 with this amendment; without it, Zork deaths never count.
- Rule: a `***` banner whose inner text holds a complete death phrase counts without a menu. If a complete win phrase is also present, the outcome is unknown (codex #2143).

**A2. Fresh output from a RESTORE turn counts.**
- Measured: with the operator's HHG save (19-14-16), the bulldozer and "Better luck next life." are printed in reply to the RESTORE submission itself. The story's clock runs in the restored turn (`harness/_hhg_after_restore.js`: output immediately after the native restore, before any other command).
- **Proof that this is fresh, not replayed:**
  1. The save package's stored transcript (the `Transcripts` key) does not contain "bulldozer" or "Better luck" (grep: 0 hits; it does contain earlier lines such as screwdriver and toothbrush).
  2. ParchLock never creates `BufferLine` elements: there is no js/ code that creates one. Every visible story line is interpreter output, and `Transcript.resetView` manages only the export record.
  3. Quetzal saves hold memory and stack, not output text.
- Retained or replayed text is therefore never a submission's fresh output, and the replay guard stands. App probes (`stat-probe`) stay excluded.

**A3. Pause continuation (bounded).**
- HHG pauses mid-ending ("Put on your peril-sensitive sunglasses… Hit RETURN"), and whatever is typed there (measured: "look") is an accepted submission.
- Rule: a bare RETURN, or any text typed at a pause that followed a complete death or win phrase, continues the open episode, at most 3 times. A turn without such a phrase never carries.

**Codex #2143/#2144 fixed:**
- A death banner plus a win phrase gives unknown.
- Quoted dialogue (a quote containing a space) is removed before menu detection, while single quoted option labels stay.
- Phrases must end their sentence or banner (`\s*[.!*]` or end of line), so "You are dead tired." is rejected. "You have been killed by the troll." is accepted.

**Evidence:**
- `harness/death-terminal.js` 30/0, `harness/stat-tracker.js` 211/0.
- Live: HHG save gives 1 ("Deaths this playthrough=1"); Zork cellar grue gives 1; Zork look/wait/quit/n/inventory gives 0.
