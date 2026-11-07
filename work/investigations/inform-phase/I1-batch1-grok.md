# I1 batch 1 (grok) - DRAFT, all 9 titles (HELD, not sent; not yet checked by grok2 / accepted by claude)
Updated 2026-11-06 ~22:10 ET. Supersedes the 4-title interim in this file.

## Correction to the interim
The interim said "19 cells, 12 TRUST, 7 FAIL-CLOSED (5 unresolved)". Actual for its table: 20 cells (5 flags x 4 titles), 12 TRUST, 8 FAIL-CLOSED (6 unresolved-bounded + 2 no-carrier). It also omitted container/animate; animate is a P cell for Christminster and Enemies (now measured below).

## Method
- Cells = the 7 priority flags per title. Ledger (inform-attr-ledger.md) F/0 cells are already decided -> NOT-IN-SCOPE (container is F/0 in all 9; animate is F in library and Break-In).
- TRUST = native positive (game's own test_attr on the PROFILE bit at the matching library site, or a toggle) plus a negative. Static object table / negatives = not proof.
- Tool: work/investigations/inform-phase/claude-p1/rawops.cjs (native play from boot, no forcing). Object tables: claude-p1/objdump.cjs.
- Labels: TRUST | NC = no-carrier (no real object carries/can take the flag in the object table: harmless FAIL-CLOSED) | U = unproven within bounded runs (carrier exists or may exist; FAIL-CLOSED until a longer route proves it). NC and U are NOT evidence the flag is unsupported.
- Evidence dir: work/investigations/inform-phase/grok-i1b1/ (run-*.txt, objs-*.txt). Prior: claude-p1/run-library-1.txt, run-break-in-1/2.txt, PACKET-*.md; grok-lane-1031/inform-plan/*.

## Decisions
| Title | animate 0 | container | light 9 | open 14 | openable 15 | supporter 20 | worn 26 |
|---|---|---|---|---|---|---|---|
| All Quiet (library) | NIS (F) | NIS (F) | TRUST: rooms 16/35/47/51:9=1, card 74:9=0 (run-library-1) | TRUST: drawer 18:14 0->1->0 OPEN/CLOSE | U: drawer opens without 15; only carrier rare-books door 57 not reached | NC: only negatives; no real object has 20 | NC: no wearables (no bit 1), 74:26=0 |
| Break-In | NIS (F) | NIS (F) | TRUST: office 33:9=1, player 9=0 | TRUST: OPEN RUCKSACK 46:14=0 then opens | TRUST: 46:15=1 | TRUST: chair 34/desk 35:20=1, rucksack 46:20=0 | U: hat (clothing 1) exists but not reachable early; no worn test |
| Christminster | TRUST: TAKE BUSKER 104:0=1, table 100:0=0 (run-minster-3) | NIS (F) | TRUST: rooms 94/113/110/99:9=1 | TRUST: handbag 62:14 0->1->0 (run-minster-1) | TRUST: CLOSE HANDBAG tests 62:15=1 | TRUST: table 100:20=1 while cups listed on it; 104/62:20=0 (run-minster-2) | U: 62:26=0 only; cape/helmet/gown carry 26 statically, untested |
| Enemies | TRUST: TAKE RIDER 21:0=1 "wouldn't care for that"; motorcycle 20:0=0 (run-Enemies-4) | NIS (F) | TRUST: 16:9=1; carried 9=0 | U: opening holds player on Princess Street; gnome/canister not reached | U: same | U: same (coffee table 39 not reached) | TRUST: INVENTORY 19:26=1 "(being worn)"; 22/26:26=0 |
| Gumshoe | U: cabbies/Morty not reached (start Hallway; "s" refused "legs don't cooperate") | NIS (F) | TRUST: Hallway 42:9=1; carried 228/230:9=0 (run-Gumshoe-b) | U: office door 36:14=0 negative only | U: office not reachable at start | U: desk/chairs in office not reached | TRUST: INVENTORY trenchcoat 231:26=1 "(being worn)"; 228/230:26=0 |
| Heist | TRUST: TAKE GROUP 18:0=1; bag 19:0=0 (run-heist-c) | NIS (F) | TRUST: Graveyard 16:9=1; carried 9=0 (run-heist-b) | TRUST: bag 19:14=1 with "It's already open" | TRUST: bag 19:15=1; frame 124:15=0 | U: altar 42/hook/tables elsewhere; 17/18/19/124:20=0 only | U: negatives only (19/124/126:26=0) |
| Lists and Lists | TRUST: TAKE GENIE 31:0=1; door 19:0=0 (run-lists-b) | NIS (0) | TRUST: 17/20:9=1 | TRUST: door 19:14 0 on OPEN, 1 on CLOSE ("Closed.") | TRUST: 19:15=1 | TRUST: desk 24/couch 25:20=1; 21/22/23/26/31:20=0 | NC*: no object with 1 or 26 |
| Looking For Godot | NC*: no object with 0 besides yourself | NIS (F) | TRUST: Porch 16:9=1; box 17:9=0 (run-godot-b) | TRUST: box 17:14 0->1 "revealing a toothpick", close back | TRUST: 17:15=1 | NC*: no object with 20 | NC*: no object with 1 or 26 |
| So Far | TRUST: TAKE RITO 23:0=1; bench 29:0=0 (run-SoFar-b) | NIS (F) | TRUST: Lower Theater 27:9=1; bench 29:9=0 | U: heavy door 53 (Theater Hall North) not reached | U: same | TRUST: bench 29:20=1 while "(on the bench)"; 20/21/28:20=0 | U: 337:26=0 negative only |
*NC for lists/godot uses an object-table cutoff (lists <=34, godot <=43) where later entries decode as garbage; a reviewer should confirm the cutoff.

## Totals (52 in-scope P cells; 11 NIS)
TRUST 31 | NC 6 | U 15  (proposed ledger action: TRUST cells usable; NC and U FAIL-CLOSED).
Per title TRUST/NC/U: library 2/2/1, Break-In 4/0/1, Christminster 5/0/1, Enemies 3/0/3, Gumshoe 2/0/4, Heist 4/0/2, Lists 5/1/0, Godot 3/3/0, So Far 3/0/3.

## Low-impact P cells (batched)
TRUST only where a native positive appeared: scenery 17 (library TAKE CATALOG 17:17=1; Break-In 36:17=1; Enemies walls 17/18:17=1), static 19 (Break-In TAKE DESK 35:19=1), transparent 23 (library attendant 26:23=1), visited 24 (Christminster 94/99:24=1; Enemies 16:24=1).
FAIL-CLOSED (unmeasured) for all other low-impact cells in all 9 titles: general, lockable, locked, moved (12=1 on carried items each turn, not tied to a move - reviewer call), on, proper, scored, switchable, talkable, workflag, and scenery/static/transparent/visited where not listed.
Not reviewed: low-impact cells for titles 5-9 beyond the above (FAIL-CLOSED by default).

## Remaining (needs longer native routes; not done, bounded)
Enemies open/openable/supporter; Gumshoe animate/open/openable/supporter; So Far open/openable/worn; Heist supporter/worn; Break-In/Christminster worn; library openable.
