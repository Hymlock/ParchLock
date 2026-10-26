# Suspect open/locked hazard: discriminating source plan

Read-only continuation of held locked17 audit5487. No new native reachability proof, facts edit or integration approval.

Source historicalsource-suspect-a18e100/people.zil1024: G-VERONICA queues I-ALICIA-SNEAKS two turns after Veronica reaches OFFICE. I-ALICIA-SNEAKS1911 onward chooses WALKWAY when player is outside a northern exclusion set; alternate WEST-OF-GARAGE branch waits three turns once if player is outside its western exclusion set. START-ALICIA1928 disables its interrupt, moves Alicia and locks BOTH NORTH-DOOR and WEST-DOOR without clearing either OPENBIT. It explicitly clears OPENBIT on three office doors, so those distinct clears cannot establish the hallway-door invariant.

Both target hallway doors are initially LOCKED without OPENBIT (places2759/2768) and local globals. V-UNLOCK2174 onward allows unlocking from the object's UNLOCK room (north HALLWAY-7, west HALLWAY-1) with no key; ordinary OPEN afterward can establish OPENBIT. Source DEXIT2363 prioritizes OPENBIT over locked. This is a plan, not native path success.

Minimal new discriminating experiment, if later executed: use retained pre-event unforced state/short route, reach inside HALLWAY-1 or7, ordinary UNLOCK and OPEN the exact door; record current IDs, both flags and full reply. Move to a source-qualified neutral room to allow Alicia's event (not either exclusion set), then let the ordinary event advance. Revisit the exact side and read both flags before attempting native travel. A demonstrated OPEN+LOCKED with successful travel would establish the false-navigation-block case. Record wrapper map/route separately. If event already occurred, door could not be opened first, target inaccessible or source hashes change, STOP; don't relabel as passed or replay a long route without a checkpoint.

No blind wait-count assumption: event depends on Veronica reaching OFFICE and player location, not a fixed global turn count supplied here. Prior seeded locked positives do not prove this unforced sequence. No generic 'open erases locked' override is proposed; raw lock state and route passability remain distinct.

## Independent source review correction — required before any run

Standing border_food_blind returned REVISE precision, no semantic/integration verdict. The northern and western exclusion sets are disjoint and branches are ordered. Outside N={GARDEN,WALKWAY,HALLWAY7,NORTH-OF-HOUSE,HALLWAY14}, START WALKWAY runs immediately, including HALLWAY1 even though it belongs to W. Inside N, the second branch may wait three turns once, then starts WEST-OF-GARAGE; ALICIA-WAITED true eliminates that extra wait. Player location cannot be assumed to defer the event indefinitely or provide setup time. Neutral room outside both is sufficient but unnecessary.

G-VERONICA trigger is G-REACHED/G-ALREADY plus OFFICE, then queue2/removal. Opening the hallway door must be completed before this trigger, not improvised during assumed safe waiting. If no retained pre-event state or proven short timing-safe route exists, stop before native launch and solve the route first.

Correct exact door routes: HALLWAY7 north -> WALKWAY (south -> HALLWAY6); HALLWAY1 west -> WEST-OF-HOUSE, not WEST-OF-GARAGE (east -> HALLWAY2). PRE-UNLOCK outside without key refuses; use exact inside UNLOCK room and no PRSI. DEXIT open-first retained. No native route success claimed.
