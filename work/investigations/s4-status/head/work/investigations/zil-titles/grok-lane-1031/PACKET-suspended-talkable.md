# PACKET grok-lane-1031 / Suspended talkable -> L:NA (no object-talk verb); robot speech covered by actorAddressing
Author: grok. Reviewer: codex. Date: 2026-10-30, 11:38 PM ET.

## Source (historical Suspended ZIL)
- syntax.zil has no TELL, TALK, ASK or SAY syntax. The only speech forms are `ANSWER` (V-ANSWER), `ANSWER OBJECT` (V-REPLY), `HELLO` and `HELLO OBJECT` (V-HELLO) at syntax:50-51/175-176.
- V-HELLO (verbs:1224) with PRSO is the uniform refusal "I think that only schizophrenics say "Hello" to a X." for every object. Without PRSO it gives a random HELLOS line.
- V-REPLY (verbs:1709) is the uniform "It is hardly likely that the X is interested."
- V-ANSWER is "Nobody is awaiting your answer."
- No object predicate exists, so no bit or object set can be talkable.
- Talking to robots is `ROBOT, command` addressing via the FC cryolink. That is already owned by the landed actorAddressing fact (D8; robots [158,155,152,149,146,144]).

## Native (g1-batch, key suspended, step 22; disclosed harness: g1-batch addInitScript RNG forcing, seed 0 default)
- Plan: probes/plan-suspended-talk.json. Run: batch/cache/run-suspended-20261031T033721-55480.json.
- Results:
  - `tell poet hello`: "FC: I don't know the word 'tell'."
  - `talk to poet`: "FC: I don't know the word 'talk'."
  - `hello poet` and `answer poet`: "Neither sonar nor extensions detect Poet here." (scope refusal)
  - `poet, hello`: "FC: Cryolink established to Poet. POET: Hello." (the addressing path)
- The vocabulary absence is shown natively. The in-scope HELLO OBJECT refusal is source-only and uniform, which I treat as non-blocking for NA.

## Disposition
- talkable: **L:NA** (feature-absent, since no verb takes a talk target object).
- Robot speech is covered by actorAddressing. No new fact is needed.