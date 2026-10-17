# Claude seat: overnight summary, 2026-10-17

Written for: the operator, in the morning. Updated through the night.

## Commits

| Hash | What | Review |
| --- | --- | --- |
| a7cd971 | Walkthrough routes from IF Archive solutions (Stationfall, LGOP, Suspended, Starcross) | research only |
| fe57436 | Plan: rule 11 amended per directive #3780; D198 `decodeD198` named as the canonical ZIL family gate | content ACCEPT grok #3819 (after the fact) |
| 261da84 | LGOP route: 386 steps, 60 rooms (was 1 room) | research only |
| e2b4294 | Stationfall route: 349 steps, 52 rooms (was 6); course computed from the game's own formula | research only |
| 1e0352c | ZIL matrix regenerated at HEAD: finished 190/546 (C +6) | ACCEPT grok #3823 |

## Taken over from Codex (out of usage)

- **Suvehnux "cage" (directive #3780):** a bare "cage" was underlined inside the printed "brass cage", which gave the bars of the cage a mention that names only the brass cage. Fix: a word inside another object's printed full name is skipped.
- **Jigsaw "in" (directive #3780):** exit names that are prepositions (in, out, on, ...) were underlined in prose. This was long-standing (20 titles with "in", 8 with "out"). Fix: those exit names are not underlined in text; the compass and radial keep them.
- **Coverage repair (Codex's uncommitted work):** T3 fixed (a shared mark whose main owners are all marked elsewhere now covers its remaining object instead of nothing). R1 shown unreachable; grok retracted it.
- **Tests:** `harness/coverage-fixtures.js` 10/0 on the patch. Suvehnux underline 19/2 -> 21/0. operator-regressions with the new guards 12/0.
- **Status:** patch ACCEPTED by grok2 (#3802) and grok (#3819, code). The full 309-game gate x2 is done (report #3838; `work/investigations/2026-10-17-claude-cage-gate-x2.txt`):
  - 31 stable differences, all intended: 30 prose "in"/"out" exit underlines removed, plus the suvehnux bare "cage".
  - No other change.
  - 24 titles flip run to run within base or within cand (load noise). They are listed with their values, not waived.
- **Ready to commit:** yes. It is blocked only by Codex's claim on `js/Actionable.js`.

## Queued after the cage commit

- **Zork I bottle named "bottle contains":** caused by the truncated synonym "contai" matching the printed "contains". Only object 236 changes in Zork I. The rename happens only when every word of the real name is in the game's dictionary. Code ACCEPTED by grok (#3831).
  - The first 309x2 run showed 12 unwanted side effects in Inform games, for example spring's "small opening" becoming "camping area".
  - The rule is now limited to Infocom (ZIL) games through the canonical D198 family check.
  - Rerun: 1 change, intended: Hollywood's "Uncle Buddy's" becomes "photo of Uncle Buddy". No Inform or Glulx change.
  - Report #3885. It lands after the cage commit.

## My error: a message sent under another seat's name

- Bus #3917 ("grok2 -> grok2", subject "x") was sent by me, not grok2: a stray `--seat grok2` in one of my command lines. It contains nothing.
- I disclosed it to every seat at once (#3919-#3921).
- The harness accepted a send under another seat's name from my session. Seat identity is not enforced in practice; this needs your fix.

## Bus incident

- The bus harness was killed 3 times overnight. grok2 confirmed (#3857) that it was killing every node process while debugging a gate hang. It now kills only its own processes. I restarted the harness each time.
- The same kills crashed gate shards, so one bottle gate run was discarded and rerun.

## Morning (after your "We need to get this done!")

- **Cage/Jigsaw/coverage committed: `09e367f`.** Codex came back and released the claim. Codex audited it (#3959).
- **Unknown cells:** U 292 -> 240, finished 190 -> 214.
  - Matrix regenerated with all games in `66ccc47`.
  - The gains came from:
    - a sweep rerun at HEAD (`754465f`, 42 cells proven);
    - Codex's audits (F 42 -> 68);
    - grok's ledger (+17 bounded UD).
  - My first not-applicable claims were partly wrong. Peers caught it and I corrected every row: shared head nouns, EATBIT, WEARBIT as the worn state, VILLAIN actors, object-level EAT handlers.
- **Planetfall brochure "regression":** not an app bug. The game's own PROB 15 hands you the brochure on turn 1.
  - Codex's corrected guard checks the brochure's real RAM custody. I and others accepted it.
  - It waits on grok2's claim to land.
- **Actor Open/Close leak:** fixed for 6 titles by P3 (`7969f6c`); Lurking (R) accepted.
  - Enchanter needs a room-safe animate rule. My candidate is in `work/investigations/2026-10-17-claude-zramreader-roomsafe.js`, for grok2's review.
- **Bottle fix:** ready and still applies cleanly. It waits only on grok's final gate verdict (#4015).

## Afternoon

- **Committed:** 285697b (bottle) plus its permanent guard; light evidence (Zork I, Zork II, Stationfall, Seastalker on);
  sweep reruns (+2 cells); OPEN_WORK (count corrected to committed-only 223/546 at ee48083).
- **Candidates for other lanes (not applied):**
  - AttributeSchema family default (309x2 clean; grok accepted with conditions, which I met, #4058);
  - room-safe animate for Enchanter;
  - the sweep "identical" criterion (running on 5 titles).
- **Rulings:**
  - rule 7 excludes parser FIND/GWIM scans;
  - a target-named FSET write with a confirming reply counts as a positive;
  - untestable-by-rule cells stay U with a reason.
- **Mistake:** I left grok's reviews unanswered for about 44 minutes while chasing leads (#4055). Now I check the bus
  between every work step.

## Late afternoon (after "quit stalling")

- **Sweep tool fixes I applied (my claim; grok ACCEPT #4076/#4077):**
  - descriptors: `uniq()` was excluding every shared-head pair (12 cells proven);
  - identical: one group mark covering exactly the pair, and the game disambiguates or acts on a pair member (5 cells);
  - status: time-only games are compared with the status line (4 cells; merge pending ACCEPT #4095).
- **Sweep reruns:** +3 more (Moonmist actors, Border Zone underlineVsDict + descriptors).
- **Table:** U 207/546 at 5e548c0 (matrix committed 4f14b4e). It was 223 earlier today and 292 this morning.
- **grok2's bitFor D198 gate:**
  - Its sequential run was looping, so I took the 309x2 over.
  - grok found the hang: decodeD198 never caches Inform results.
  - My memo fix (`AttributeSchema._familyOf`, candidate ab4311d) brings tatctae from a hang to 15s.
  - The gate is running on the memo version.
- **Evidence for grok:**
  - Ballyhoo wearable 21 (4 WEAR positives + money negative);
  - Stationfall and LGOP consumed (original state);
  - Cutthroats meal is not removed after eating.

## Reviews I gave

- #3840: ACCEPT grok's LGOP open 15 / supporter 17 and Zork II wearable 3 / edible 20.
- **Suvehnux bars of the cage (56):** I reported it as never underlined, then retracted that (#3827). It is underlined whenever a reply names it; I had misread a transcript.

## Blockers

- Codex's claims on `js/Actionable.js` and `harness/underline-first-per-reply.js` are still held. Only Codex or the operator can release them. The patch cannot be applied or committed until then.
