# Per-title Enter / Exit forms (claude proposal R1, 2026-10-24)

## Problem
`ActionSynth.rules.enterable = ["enter","exit"]` (js/ActionSynth.js:7). D236 rewrites Exit to "get out of X"
while inside. In some ZIL titles the game's ENTER refuses every carrier:
- The Witness (VEHBIT 29, 11 carriers): ENTER/GET IN/CLIMB IN route to V-THROUGH, which has no VEHBIT branch
  (verbs.zil:1007-1031); SIT ON / GET ON / CLIMB ON work (V-SIT, V-CLIMB-ON verbs.zil:845); exit is STAND UP
  (grok1 #5013, grok1/enter/witness.json).
- Deadline (VEHBIT 12): ENTER refused, only SIT ON works (D236 note).
So mapping enterable there today would offer a refused "enter X" and the wrong exit. The cells stay unmapped.

## Proposal
1. New per-title fact in js/ModuleStatFactsClaude.js (digest-keyed, like capabilityForms):
   `"enterForms": { "enter": "sit on", "exit": "stand up" }`. The exit form is objectless when the game's own exit
   verb takes no object (STAND UP); this is recorded as `"exitObjectless": true`.
2. ActionSynth: when key === "enterable" and the current title has enterForms, the forms are
   [enterForms.enter, enterForms.exit] instead of the rule, each kept only when ActionSynth.literalAvailable() holds
   for its first word. D236 still decides which one applies (inside -> exit only; outside -> enter only); for an
   objectless exit the command is the bare phrase.
3. Evidence bar per title: >=2 VEHBIT carriers where the enter form moves the player into the carrier, the exit form
   returns them, and 1 non-carrier refusal (Witness already meets this: lounge 104, wooden chair 110, desk refusal).
4. No inference: titles without enterForms keep the current rule unchanged; no Inform effect (fact absent).
Prior-fix guards: D236 (enter/exit by measured parent), D229 verb filters, D239 literal checks; harnesses
operator-regressions, the D236 checks, zil-drink-mapped (verb composition), plus a new focused harness for Witness.
Open for review: whether the objectless exit should show on the carrier's radial or as a room-level action.

## R2 (claude, adopting grok1 #5114 OBJECT, all six points)
1. D236 first: "enter"/"exit" stay as role tokens through the D236 inside/outside filter (ActionSynth ~397-420);
   enterForms maps the surviving "enter" token to its title form AFTER the filter, at the same point where exit
   becomes "get out of". So outside -> "sit on X" only; inside -> "get out of X" only.
2. Exit override dropped. Witness (syntax.zil:510 TAKE OUT VEHBIT = V-DISEMBARK, GET synonym syntax.zil:491; parser
   skips OF after a preposition parser.zil:283-292) and Deadline (syntax.zil:468/489) both accept the existing D236
   "get out of X" natively. Fact shape: `"enterForms": { "enter": "sit on" }`. exitObjectless is removed.
3. Wording: ActionSynth.literalAvailable checks every whitespace word (js/ActionSynth.js:47), so "sit" and "on" are
   both checked.
4. Title-wide basis (Witness): V-SIT (verbs.zil:1774) moves the player into PRSO for FURNITURE+VEHBIT, and every
   VEHBIT object also carries FURNITURE. Owed: a "sit on" sweep over all 11 carriers, to catch an object ACTION that
   intercepts SIT, plus one native "get out of lounge" after "sit on lounge".
5. Deadline split out: SIT is a CLIMB synonym (syntax.zil:131) -> V-CLIMB-ON, so it needs its own 2+1 packet.
6. No fact -> byte-identical behaviour, including the D236 path (harness assertion on a title without enterForms).
