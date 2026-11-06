# M5 Guess the Verb (games/guess.z5.js) - Claude covering grok, 2026-11-05
Digest e17beb4180286c155ba4449618956fe4ae3bdc3e8933accaa04c1c584b3599bd. Probe: nov5/probe.cjs (measure4 + seeded Math.random, global scan, parent chain). Script: new|boy|bob|look|n.
Raw: guess-base.json, guess-pg20.json.

## Measurements (baseline, current checkout)
- Start (menu): globals 20=20 and 55=20 "(self object)"; probe playerId 20 named-player, room none.
- After NEW: globals **20=37 and 55=37 "(StandardPlayer)"** (I6 pair k=20, k+35=55). parent(37)=51 "Verb Guessing Booth".
- Probe still picks playerId 20 "(self object)" (parentless), source named-player, so roomSource=existing-resolver, roomId 51.
  (WorldModel.lastPayload.playerId reads 37 while probe.playerId reads 20: the two disagree.)
- Map: 0 HasRealId rooms through look and n.
- Gate that refuses: js/MapTopology.js:96-97 (mayAdmitFirstCurrentRoom: Inform title, map empty, no travel; roomSource existing-resolver is not deterministic -> false). Used at MapTopology.js:615 and :665. The room never changes, so the travel clause (:83-84) never opens it.

## With playerGlobal 20 (in-memory route, repo untouched)
- After NEW: playerId 37 measured-player-global, roomSource player-containment, room 51. Map: 51 Verb Guessing Booth, plus 66 Behind the Booths and 77 The Midway (exit/lookahead neighbours).

## Proposal
0 rooms is NOT correct: the player is really inside room 51, and the game prints it. Add the exact-digest fact `playerGlobal: 20` (lower slot of the 20/55 pair), same as D216/D220 and e643191b.

## Risks
- 66/77 appear as unvisited neighbours: check they are real (the booth's exits say "can't go"; they may be door/lookahead targets). If they show as reachable, this is a neighbour-admission question, not a fact question.
- At the menu, slot 20 = 20 (self object, parentless): the fact returns no room there, which is correct.
- Run the regression gate for guess plus the operator-regressions harness before commit.
