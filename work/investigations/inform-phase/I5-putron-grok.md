# I5 Put-on investigation — grok (Grok1), 2026-11-06 ~22:50 EST
Scope: read-only investigation for Claude #6102, authorized by the owner (t580u). No js edits, no commits, no sends.
Method: the I5 headless touch probe (`grok-i5/touch-probe.cjs`), run on the owner's Windows machine against play.html: 412x915 viewport with isMobile and hasTouch, a CDP touch held 900 ms, normal UI taps after that. This is not a manual GUI or phone check.
Logs: `grok-i5/putron-run-1..4.txt`. Screenshots: `grok-i5/shots/` (Zork1-*-sack/-bottle/-table-more/-case-more, minster-handbag, minster-table-more, curses-paper).

## Answer: where "put" is offered
- **Held item's ring only**, as the "Put in..." stem, which opens a target picker. The supporter's own ring never offers it, in any engine:
  - Zork I kitchen table: Examine, Search, Empty, Cast at…, Unlock with…, More. The More page is a generic verb list.
  - Zork I trophy case: no Put either.
  So the I5 "missing on supporter ring" finding is **by design**. It is not an Inform-specific bug.
- **No "put X on Y" form exists anywhere.** The only put form is "put in":
  - `js/ActionSynth.js:673` adds "put in" in the inventory context, gated on the dictionary literal.
  - `js/ActionSynth.js:755` builds the stem `"put "+name+" in "`.
  - `js/SemanticActions.js:458` has only a PUT_IN template.
  - The ActionSynth rules have no put form for supporters: `js/ActionSynth.js:13` gives supporter only ["search"].
- **Supporter attrs DO feed the picker.** `js/Actionable.js:3051-3063` sorts `a.container || a.supporter` targets onto the first page (see also `EquipmentUI.js:300`). But the command is still `command + noun`, at `js/Actionable.js:3068`, so the result is always "put X in <supporter>".

## Tests (held item → Put in… → picker → chosen target)
| Title | Held | Picker (first page) | Chosen → game reply |
|---|---|---|---|
| Zork I (ZIL) | brown sack | **kitchen table** first, then bottle, stairs, … | `put sack in table` → "Done." (the ZIL table is a container/surface and accepts IN) |
| Zork I | glass bottle | **trophy case** first, then … | `put bottle in case` → "Done." Trophy case is a **container**, so this is the correct put-in comparison, not a supporter case |
| Christminster (Inform, no names; supporter cell TRUST in I1) | handbag 62 | **trestle table** first, then cups, busker… | `put handbag in table` was sent. The busker scene's game text answered instead ("Steady on… Wait until I ask you!"), so this does not show a clean parser refusal. **Inconclusive** on the parser reply; it **proves the wrong preposition reaches the game** |
| Curses (Inform) | crumpled paper | trapdoor, teachests, biscuit, torch | not chosen; shows Put in… on the main ring of a non-container held item |
| Break-In | — | — | not reproduced: the start is the street, and the desk/rucksack weren't in scope |

Selected target vs held item: long-press on the supporter gives no put row (all titles). Long-press on the held item gives "Put in...", where the supporter is ranked first but receives the "in" preposition.

## Real gap and proposed minimal fix (not applied)
For a pure Inform supporter (supporter and not container), standard Inform rejects "put X in table" ("That can't contain things."). Expected-only: this needs a clean title to confirm. ZIL hides the problem because tables accept IN.
Fix, in `js/Actionable.js:3068`: when the stem verb is put and the target has `attrs.supporter && !attrs.container`, rewrite the connector " in " to " on ", gated on `ActionSynth.literalAvailable("on")`. Alternatively, label the picker row "on <noun>". Optional matching change: add a PUT_ON template beside `js/SemanticActions.js:458`, so typed "put X on Y" is recognised. The supporter-ring absence can stay as designed.
I1 path: the I1 TRUST supporter bits reach `o.attrs.supporter` and are used, but only for ordering. No inferred-flag pipeline defect was found.

## Open
- A clean Inform supporter "put in" refusal on a non-scripted title (for example Lists couch/desk with an item held) to confirm the reply text.
- The declared-name Inform supporter case was not run. Curses paper only shows the picker.

## Addendum 22:55 EST: declared-name Inform comparison (School Days, ledger class "exact")
Logs: `grok-i5/putron-run-5-picker.txt`, `putron-run-5-typed-on.txt`, `putron-run-5-typed-in.txt`, `putron-run-6-picker.txt`. Screenshot: `shots/schooldays-freshener.png`.
- **App attrs (live payload):** night-table 156 has supporter:true, container:false, static:true. Air freshener 157 has takeable:true.
- **Typed command, native line input:**
  - `put air freshener on night-table` gives **"You put the air freshener on the night-table."**
  - `put air freshener in night-table` gives **"That can't contain things."**
  - Both are observed transcripts. They show that on this title "in" is refused and "on" succeeds for a supporter.
- **Held-item ring:** Examine, Drop, Give to…, Put in…, Cast at…, More…. The picker's first page is drawer 1–5, which are containers. **night-table was not found after paging More 6 times** (7 pages). The picker route to this supporter is therefore **unverified**; it may cycle or the label may differ. So "picker sends 'put freshener in night-table'" is **inferred from code (`Actionable.js:3068`), not observed on this title.**
- **Verified vs unknown:**
  - Verified: the game refuses "in" on a supporter and accepts "on" (School Days only). No app "on" form exists (code). The Christminster picker sent "in" to a supporter (run 3).
  - Unknown: whether the School Days picker ever lists night-table. Whether the game has an "on" dictionary entry is NOT the same as correct behaviour: the proposed `literalAvailable("on")` guard is dictionary-only, and correctness is shown here only by the School Days transcript.
- **Status:** INCOMPLETE on the picker-to-supporter observation for a declared-name title. Blocker: night-table did not appear within 7 picker pages; investigating the paging is out of this bound.
