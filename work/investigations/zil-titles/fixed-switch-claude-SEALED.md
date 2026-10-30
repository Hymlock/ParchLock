# Room-fixed switches get no Turn on/off - claude blind half (SEALED 2026-10-30)

Problem statement (for the other seat, without findings): objects fixed in a room that the game lets you turn on and off
(the Witness radio, for example) never get Turn on / Turn off on their radial. Should they, and how?

## Findings (claude, code and history, no native run)
1. AttributeSchema.activationForms (js/AttributeSchema.js ~387-412) returns forms only when `context === "inventory"`, for an id
   in objectCapabilityIds(mem, "switchable"), with forms exactly ["turn on","turn off"] and "turn" grammar templates.
2. Origin: 3f1fd5d (codex, 2026-10-22, "Qualify Ballyhoo held-device activation commands") scoped forms to the HELD radio and
   headphones because those were the proven owners. It was a conservative scope, not a ruling against room objects. No
   D-entry forbids room-context switch forms.
3. Known room-fixed toggles:
   - Witness RADIO 162 (LIVING-ROOM). It toggles natively ("You turn on the radio...") but its state is not an attribute:
     no ONBIT write (grok1 #5186), so no on/off state is readable. Only a state-less "turn on / turn off" pair is possible.
   - Plundered Hearts torch/chandelier: LIGHTBIT, but TURN ON/OFF is refused natively ("It already is."); no working
     toggle, so not a candidate.
   - Hitchhik jukebox: room-fixed; not measured.
4. Risk: in room context, an object listed as switchable for a held-device reason could be offered while it is out of
   reach or not toggleable from where the player stands. ZIL generally allows TURN ON on a reachable room object, but the
   game's own reply decides.

## Leaning (not a decision)
Allow the switchable forms in room context only for ids an evidence packet proves toggle natively IN ROOM CONTEXT (a
per-object scope field, like edible's scope rules: `switchable` owner entries with scope "room" | "held"), keeping the
held-only default for the existing owners. State-less toggles (radio) offer both forms, as Zork II's lantern already
does. First candidates: the Witness radio 162 and the Hitchhik jukebox (needs a probe).
Prior-fix guards: D237 (worn switchable), 3f1fd5d activation qualification, D238 owner shape.
