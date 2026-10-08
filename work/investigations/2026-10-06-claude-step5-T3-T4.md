# Claude sealed investigation: Step 5, T3 (enemy actions) and T4 (Gravel Pit "assail" compass entry)

Sealed 2026-10-06, before reading any Codex step-5 evidence.

## T4: "assail" recorded as an in-room compass step

Path: js/MapTopology.js `applyStateDelta`, the D163 block (about line 597). It records the
last typed command as a hinted `subLocation` ExitMeta when all of these hold:

- the room ID is unchanged;
- the printed room name changed;
- the command is not on the `isNonTravelCommand` stop-list.

The name source is js/WorldModel.js `refineRoomDisplayName`:

- RAM supplies the name when the compiled room name is real.
- Otherwise the status grid's first banner column is used (D54/D80/D201).

Bus evidence (#1404, my fresh 360 run): after `assail`, the payload roomName became
"BARBARIAN" while the RAM room stayed 186 (GRAVEL PIT OF ROGUES). Treasures' combat status
grid replaces the location banner with the combatant rows ("BARBARIAN HP 10/16 / VON DARTH
THE SLY HP 59/65"). The status text changed; the player did not move.

D163's genuine case (Anchorhead "stand on can") is different in structure. There the player's
DIRECT parent changes from the room to the can, and D139's walk-up returns the same room
ID. That is why v27 (no walk-up) saw a location change.

**Proposed general rule.** A within-room step is recorded only when RAM shows the player's
immediate parent changed while the walked-up room is unchanged. Implementation:

- ZRamReader.snapshot exposes `playerParentId` (the raw parent of playerId).
- MapTopology keeps `prevPlayerParentId` and requires
  `prevPlayerParentId != null && currPlayerParentId != null && prev !== curr`.
- When no RAM parent is available (a provider without object-tree access), the old
  name-change rule remains. Status text alone is presentation, never movement evidence
  (the D165 spirit).

Existing saved maps that already hold the false entry: on load, drop `subLocation` ExitMeta
only if it can be shown to be false. It cannot be shown from the save alone. Leave this to the
operator or clear it on the next visit, when the corrected rule re-learns. Open question for
review.

Required tests:

- Anchorhead alley `push can to wall` / `stand on can` still yields `stand on can` and
  `get off can`.
- Treasures `assail` in the Gravel Pit yields no ExitMeta.
- A unit test with a stubbed payload covering the parent-unchanged-name-changed case (no
  record) and the parent-changed case (record).

## T3: real actions on enemies

Evidence so far (#1404): Treasures' combat form is ZERO-argument `assail` ("Sa-ho! You give
VON DARTH THE SLY a sampling of your bare, callused FIST"). It is not `attack <noun>`. Any
licensed action must come from:

- the compiled grammar (attack/hit/kill/fight/assail lines whose noun token accepts an
  animate object), or
- an observed accepted form (AttrCalibrator), per D24/D147.

Hostility is never inferred from prose. Steps still to measure:

1. Dump Treasures' grammar for the verb words in the dictionary (assail, attack, hit, kill,
   fight, strike, parry, retreat, flee). Record the token pattern of each, noun or none.
2. Repeat for two other combat modules in GAMES_INCLUDED.md that have the D206 actor rows.
3. Decision draft:
   - a noun-taking verb whose grammar accepts an animate object becomes a radial entry on
     the actor ("<verb> <actor>");
   - a zero-argument verb (assail) is offered on the actor radial as the bare command only
     when it was observed accepted while that actor was present (AttrCalibrator-style
     evidence), never assumed;
   - otherwise there is no combat verb.

## T3 measurement (sealed addendum, same session, before any Codex evidence)

GV2 grammar decode, scratch probe reusing harness/_d34_phase_a_deep.js `tryGV2` (grammar
table at static memory, verb index 255-n):

    Treasures: assail [noun=Routine 28733] ->A10   (zero-arg works: the filter leaves one candidate)
               strike/slay/duel [noun=Routine] ->A10
               attack/kill/fight/murder/punch [noun=Routine 28663] ->A10  [noun] ->A10
               hit ['points'] ->A86 (a stat query, not combat)  [noun=Routine] ->A10

In ~35 of the other GAMES_INCLUDED Inform games, attack/kill/fight [noun] (often plus
`with held`) is simply the standard library line. So **grammar alone licenses the form but
says nothing about hostility.** Offering Attack on every actor in every game would put
"attack" on friends, shopkeepers and the player's companions, against D24 and the operator's
"real actions" intent.

**Decision draft.**

1. **Form (what to type).** The verb is taken from the module's own grammar: a verb word
   whose line maps to the same action number as the dictionary word "attack", with an
   object token (noun / creature / noun=Routine).
   - If the player has typed one of these verbs and the game accepted it, that word is
     preferred. Treasures: the player uses "assail".
   - Otherwise "attack".
   - No verb is invented. A game with no such line gets no combat entry.
2. **Who gets it (hostility evidence).** The entry is shown on an actor only on the game's
   own evidence:
   - (a) the status grid shows that actor's name with a health metric (StatTracker
     already parses "VON DARTH THE SLY HIT POINTS: 56/65"); or
   - (b) an Attack-action command aimed at that actor was accepted earlier this game. An
     accepted command produces a state change (the status metric changes, or the actor's
     RAM attributes or parent change); a refusal does not.

   Never from prose words such as "attacks!", names, or dictionary membership.
3. **Lifetime.** (a) lasts while the grid shows the actor. (b) is per story and object ID,
   cleared on restart/restore, as other learned facts are.
4. Status-screen and headless rules (D207) are unaffected: this is an ordinary visible
   action.

The fixture tmp/TreasuresofaSlaversKingdom-z8-browser-save.json is mid-combat, so the grid
shows Von Darth with hit points and the Assail entry must appear.
