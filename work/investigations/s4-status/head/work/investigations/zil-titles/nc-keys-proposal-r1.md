# NC keys proposal R1 (claude, 2026-10-30) — BUILD or OUT-OF-SCOPE per L:NC key

Source: `work/investigations/2026-10-11-zil-cell-ledger.json` (cells with `s:"NC"`), status rule from
`zil-titles/no-reader-cells-question.md` (group decision A, 2026-10-24). Read-only research; no js/ edits.

## 0. Headline finding (attack this first)

~~**None of the 25 titles carrying NC cells is in the release set.** `GAMES_INCLUDED.md` (80 games) contains no~~ (withdrawn R3: release inclusion is not a scope criterion)
Zork / Hitchhiker / Planetfall / Enchanter / Sorcerer / Spellbreaker / Wishbringer / Lurking Horror / Stationfall /
Moonmist / Ballyhoo / Deadline / Witness / Suspect / Infidel / Seastalker / Cutthroats / Hollywood Hijinx /
Leather Goddesses / Plundered Hearts / Border Zone / Starcross / Suspended (case-insensitive grep: 0 hits each).
~~Under "streamline to player-visible impact in the 80 release games", every NC cell has **zero release-visible~~ (withdrawn R3: release inclusion is not a scope criterion)
impact**. The per-key analysis below therefore asks a second question: if the ZIL lane (dev catalogue) still wants
a consumer, is there a visible gain the app does not already get another way?

~~Check for seats: `for t in Zork Hitchhik Planetfall ...; do grep -ci "$t" GAMES_INCLUDED.md; done`.~~ (withdrawn R3: release inclusion is not a scope criterion)

## 1. Exact cells (90)

| key | n | titles |
|---|---|---|
| visited | 25 | Zork1 Zork2 Zork3 Enchanter Hitchhik Ballyhoo Cutthroats Deadline Infidel HollywoodHijinx LeatherGoddessesofPhobos Moonmist PlunderedHearts Borderzo TheLurkingHorror Planetfall Seastalker Sorcerer Spellbreaker Starcross Stationfall Suspect Suspended Wishbringer TheWitness |
| lightSource | 20 | Enchanter Hitchhik Ballyhoo Cutthroats Deadline Infidel HollywoodHijinx LeatherGoddessesofPhobos Moonmist PlunderedHearts TheLurkingHorror Planetfall Seastalker Sorcerer Spellbreaker Starcross Stationfall Suspended Wishbringer TheWitness |
| light | 18 | Zork3 Hitchhik Ballyhoo Cutthroats Infidel HollywoodHijinx LeatherGoddessesofPhobos Moonmist PlunderedHearts TheLurkingHorror Planetfall Seastalker Sorcerer Spellbreaker Suspect Suspended Wishbringer TheWitness |
| proper | 11 | Hitchhik Ballyhoo HollywoodHijinx LeatherGoddessesofPhobos Moonmist PlunderedHearts Borderzo Seastalker Sorcerer Stationfall Wishbringer |
| female | 8 | Ballyhoo LeatherGoddessesofPhobos Moonmist PlunderedHearts Seastalker Suspect Wishbringer TheWitness |
| pluralname | 5 | LeatherGoddessesofPhobos Moonmist PlunderedHearts Borderzo Stationfall |
| on | 1 | Hitchhik |
| locked | 1 | Moonmist |
| enterable | 1 | Suspended |

(Title = cell-ledger key minus `.zN.js`; total 90.)

## 2. Per key

### visited (25) — OUT-OF-SCOPE (redundant source)
- Readers today: `WorldMap.isVisited` (WorldMap.js:267, used at :280/:406/:511) and MapTopology refinement derive
  visited from the app's own navigation history; `ZRamReader.js:390` only checks the Inform name table. No reader of
  `attrs.visited`.
- Visible gain: none. The map's visited/unvisited styling and dotted edges already come from history. TOUCHBIT would
  only add "visited before the app started watching" (restored save) — but project rule is no backwards compat /
  fresh state, so that case is excluded.
- Attack: find a map state where history and TOUCHBIT disagree on a fresh game (e.g. a teleport the map misses).

### light (18) — OUT-OF-SCOPE (redundant + no radial effect)
- Readers: none of `attrs.light`. Darkness on the map is handled by MapTopology dark-name provenance
  (MapTopology.js:263-414, `NameProvenance === "dark"`) from the story's printed text; "providing light" tag comes
  from `AttributeSchema.illuminationState` (AttributeSchema.js:526, D2/D247), which uses the `on` fact, not `light`.
- Visible gain: a "room is lit" fact would not change any radial option; dark rooms already resolve by the game's own
  "too dark" output. Ledger D2 consensus (2026-10-30) already says no semantic emission reader.
- Attack: find a radial/map output that is wrong in a dark room of a ZIL title and would be fixed by a room-lit bit.

### lightSource (20) — OUT-OF-SCOPE for release; optional BUILD design recorded
- Readers: none (grep `lightSource` in js/: 0 hits outside ModuleStatFactsClaude).
- Closest consumers: `ActionSynth` switchable -> "switch on/off" (ActionSynth.js:8, :82, D237 at :404) and
  `EquipmentUI.illuminationStateTags` (EquipmentUI.js:248).
- Possible gain (dev catalogue only): offer "turn on"/"light" on a LIGHTBIT object that lacks a switchable fact
  (lamp, torch, matches). Minimal design: in ActionSynth, if `attrs.lightSource && !attrs.switchable` and the verbs
  pass `hasDictionaryWord`, add "turn on"/"turn off"; gate on the same family/digest checks as illuminationState.
  Risk: LIGHTBIT also marks permanently-lit objects (glowing items) -> harmless wrong options (acceptable per
  missing-over-wrong). Do this only if a seat shows a ZIL lamp currently missing a Light/Turn on radial.
- Attack: long-press the brass lantern (Zork1 is not lightSource-NC, so use Enchanter/Planetfall lamp) and see
  whether Turn on is already offered via grammar/switchable.

### proper (11) — OUT-OF-SCOPE (redundant: text comes from the story)
- Readers: AttributeSchema PROFILE only (AttributeSchema.js:29/:75). Labels/underlines come from printed text
  (Actionable grammar-particle handling, Actionable.js:218, :684-691); ReadAloud reads the story output, which the
  game already articled correctly.
- Visible gain: none; the app never synthesises "the X" itself in a way a NARTICLEBIT would change.
- Attack: find any UI string the app composes as article + object name (radial title, inventory list, Learned Words).

### female (8) — OUT-OF-SCOPE (no consumer)
- Readers: AttributeSchema/ZRamReader name lists only. No pronoun generation anywhere (ReadAloud speaks game text).
- Visible gain: none. Attack: same as proper — find app-composed pronoun text.

### pluralname (5) — OUT-OF-SCOPE (no consumer)
- Same as proper/female. Attack: find app-composed "is/are" or "it/them" text.

### on (Hitchhik, 1) — OUT-OF-SCOPE (wrong meaning)
- r45: ONBIT 45 in Hitchhiker is the room-lit bit (24 room carriers); mapping it makes rooms look like switched-on
  devices. illuminationState requires `fact.illuminationState.flag === 'on'`, so it would also mis-tag items.
- Attack: find a non-room HHG object whose ONBIT toggles with player action.

### locked (Moonmist, 1) — OUT-OF-SCOPE (by design, D246)
- Only reader: ExitCalibrator.js:148 (`attrs.door && attrs.locked` -> route pause). Moonmist auto-unlocks doors from
  most rooms, so a locked fact would add false route pauses (a visible regression). No-fact is correct.
- Attack: show a Moonmist door that stays locked and where the missing pause misleads the player.

### enterable (Suspended, 1) — OUT-OF-SCOPE (unreachable for the player)
- Readers exist (ActionSynth enterable -> enter/exit, ActionSynth.js:7/:268; ZRamReader.js:265). The only VEHBIT
  carrier is a vehicle only robots can board (D8); a player "enter" option would be wrong, not missing.
- Attack: reproduce a robot boarding where a radial Enter would be valid (D8 P8).

## 3. Recommendation table (ACCEPT / REVISE per row)

| key | cells | rec | reason | codex | grok | grok2 |
|---|---|---|---|---|---|---|
| visited | 25 | OUT | map history is the source; no release title | | | |
| light | 18 | OUT | dark handled from printed text; no radial change | | | |
| lightSource | 20 | OUT (BUILD design parked) | no release title; Turn on may already come from switchable | | | |
| proper | 11 | OUT | articles come from game text | | | |
| female | 8 | OUT | no app-composed pronouns | | | |
| pluralname | 5 | OUT | no app-composed number agreement | | | |
| on (HHG) | 1 | OUT | ONBIT = room-lit there | | | |
| locked (Moonmist) | 1 | OUT | D246: would cause false pauses | | | |
| enterable (Suspended) | 1 | OUT | robots-only vehicle (D8) | | | |

Proposed ledger effect if unanimous: keep status L:NC (not NA, per the 2026-10-24 rule) with reason
~~"out of release scope (no title in GAMES_INCLUDED.md) + redundant/no consumer"; reopen only if an Infocom title~~ (withdrawn R3: release inclusion is not a scope criterion)
~~enters the release set or a seat demonstrates a missing radial option.~~ (withdrawn R3: release inclusion is not a scope criterion)

## Claude self-attack before circulation (2026-10-31)
~~The "not in the 80 release games" argument (section 0) is NOT a valid basis on its own. ParchLock lets players import their~~ (withdrawn R3: release inclusion is not a scope criterion)
own story files (Modules > import), so Infocom ZIL titles run in the released app as user modules, and their radials
matter. Decide each key ONLY on its per-key merits: is there a redundant source already, and would any player-visible
option or display change for an imported ZIL game? The release-set observation stays as context, not as justification.

## R2 (claude, 2026-10-31): lightSource flips to BUILD
Evidence: work/investigations/zil-titles/lightsource-radial-check.md (live js/ ActionSynth radials, start state, lamp
moved to inventory).
- Light sources already get turn on/off when the title maps switchable: Zork1-3, Sorcerer, Planetfall, Stationfall, LH,
  Moonmist, Hollywood and LGOP are OK.
- There is NO way to light from the radial (MISSING) in Enchanter (brass lantern 175, battered lantern 94), Infidel
  (bronze torch 198, matches 44-49), Wishbringer (candle 65), Witness (brass lantern 48, lamp 159, match book 53),
  Cutthroats (flashlight 116), PlunderedHearts (torch 9) and Deadline (crystal lamp 50, possibly fixed). Lesser cases:
  Zork3 torch and Hollywood matches. The Zork1 torch is always lit.
- This is a missing radial option, which the operator rule ranks above wrong ones. lightSource becomes BUILD for the
  titles where it is proven:
  P-LS:
  - per-title attributeMap.lightSource = LIGHTBIT, admitted per title only with the usual evidence (2 native positives,
    LIGHT/TURN ON reads the bit and the game replies; plus 1 negative);
  - ActionSynth offers the game's own lighting verbs for a held or in-scope object with lightSource && !switchable. The
    verb is chosen from the title's grammar/dictionary ("turn on"/"turn off" for lamps and lanterns where TURN ON is in
    the grammar; "light"/"extinguish" or "blow out" where those are the game's verbs for torches, matches and candles),
    verified against the parser's verb table and never guessed from the name;
  - fail-closed on an unknown verb, and no change where switchable already supplies the forms.
  The 7 MISSING titles' lightSource cells move from NC to U (evidence work).
All other keys keep the R1 OUT recommendation, judged on per-key merits (redundant source / no visible change); the
release-set argument is withdrawn as justification.

## R3 (claude, adopting codex nc-r1-adversarial-review.md; release-set reasoning struck from every row above)
The review is split so that decided keys do not wait on open ones.

### A. Decide now (four-seat vote): proper, female, pluralname
Disposition: L:NC "no current wrapper consumer composes articles, pronouns or grammatical number; imported ZIL titles
fully in scope; reopen on any concrete composing consumer". There is no inference from gender to talkability or animacy,
and none from plural to physical multiplicity. This adopts codex's conditional wording verbatim. codex: ACCEPT
(#5778). Needed: grok, grok2, claude ACCEPT.

### B. Stays NC under an existing ruling, no new claim: light (18)
The reader inventory is corrected: attrs.light IS read at ZRamReader.js:1729 (object admission heuristic) and :1799
(Inform-scoped heuristic). The cells remain under D247 (heuristic key, illumination via illuminationState, NOT
certified). R1's "OUT" is withdrawn. A per-title room/object meaning audit is future work only if a consumer is
proposed.

### C. Reopened as work (moved to U, evidence lanes)
- lightSource: BUILD per R2. Adopting codex: per-title carrier domain compared with switchable/on and the accepted
  grammar. "turn off"/"extinguish" is offered only where the game's own verb and handler support it; fire, magic light
  and permanently emitting objects are excluded per title. Per-title provenance is kept. Native evidence is in flight
  (lightsource-native/).
- visited (25): per-title TOUCHBIT meaning compared with navigation history (moved vs described/revealed). The
  no-backwards-compat premise is withdrawn; note that the map is saved per save (D215 snapshots), so an in-play RESTORE
  restores visited with the map. The disposition will follow the per-title comparison.
- Hitchhik on: no current device consumer; the room-lit meaning is recorded. Not a permanent exclusion; reopen on a
  room-light map/display use.
- Moonmist locked: reopened for D5-style raw "Locked" display (AttributeSchema.lockedObjectStatus), separate from route
  pausing (P10/D246). Needs a source census of Moonmist lock owners and transitions (tested/set LOCKED) and a
  usefulness check, given that auto-unlock makes the display short-lived.
- Suspended enterable: reopened against D8. Is an actor-addressed "<robot>, board/enter <vehicle>" missing? Compare
  the VEHBIT owner, robot reachability and source dispatch with retained native robot evidence. An unaddressed player
  Enter stays rejected.

## R3 addendum (adopting codex #5782)
- lightSource BUILD uses owner-local capability forms: each carrier object gets its own light/turn on (and off only if
  proven) form from native command evidence. Grammar presence alone never selects a verb. Burned-out, decorative and
  second-object carriers are excluded unless they have their own evidence. Bit provenance is recorded separately where
  the parser does not test the bit.
- Suspended enterable: the candidate is an actor-addressed BOARD (CAR VEHBIT objects 593-595; V-BOARD 1043-1080 moves
  WINNER into the vehicle). It needs grammar and native proof; the generic player Enter stays rejected.

## DECIDED (four-seat, 2026-10-31)
R3-A proper/female/pluralname: ACCEPT from all four (claude, codex #5785, grok #5786, grok2 #5801). Recorded in the
ledger reasons. R3-B light: ACCEPT from all four (the D247 NC stands). R3-C: direction ACCEPT from all four; the work is
assigned (lightSource claude, Moonmist display codex, Suspended BOARD grok, visited per-title audit unassigned).

## R4 lightSource (claude, from lightsource-native/SUMMARY.md)
Replaces a single "lightSource = LIGHTBIT" key with per-title owner-local light capability forms; each capability bit
comes from native play, never from the flag name:
- Infidel: capability = BURNBIT 11, lit state = ONBIT 21. Offer "light <X>" on held carriers with 11 set and 21 clear;
  offer "extinguish torch" / "blow out match" (the game's own off verbs per object) when 21 is set. MEETS 2+1.
- Cutthroats: single portable light, flashlight 116 (bit 27 capability, ONBIT 17 state): turn on when 17 clear, turn off
  when 17 set. Single-owner exception (only carrier) + behaviour + 2 negatives.
- Enchanter: no verb lights anything (FROTZ only), so NO on-form. When lit (22/8 set) on lantern 94, offer "turn off".
  Candle 204 has no off-form ("cannot be extinguished").
- Wishbringer, PlunderedHearts: stay U until a hand-written route puts the candle/torch in scope for 2+1.
- TheWitness, Deadline: NA for lightSource (no usable player light; refuted natively). Removed from the BUILD list.
Implementation shape: a per-title `lightForms` fact {capabilityBit, stateBit, objects?: [...], on: verb|null,
off: {default verb, perObject overrides}} consumed by ActionSynth for held/in-scope carriers; malformed = absent;
switchable titles unchanged.
