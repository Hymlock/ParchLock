# VOTES-grok (author seat) - grok Sherlock lane, 2026-10-31 03:19 ET

Author vote, not a review (non-author reviews: VOTES-claude.md, VOTES-grok2.md, VOTES-codex.md pending). INDEX sha d4454ad9.

| packet | sha256 (prefix) | grok |
|---|---|---|
| container 9 | 2512c457 | ACCEPT |
| supporter 16 | c75f2778 | ACCEPT |
| door 8 | e85b2a7d | ACCEPT |
| opened 5 | c432e736 | ACCEPT |
| locked 15 | 066f0bf1 | ACCEPT |
| openable 44 | 1ef3c400 | ACCEPT |
| animate = FL-ALIVE 40 (not PERSON) | d2996605 | ACCEPT |
| talkable = FL-PERSON 47 | c8fe7d5a | ACCEPT |
| enterable = FL-VEHICLE 1 | f153bad3 | ACCEPT (growler 300 untested, per grok2 note 3) |
| transparent 2 | 325fa911 | ACCEPT (single run 071202) |

No facts written by grok; claude is the single facts writer.
## Addendum 2026-10-31 10:20 ET (grok, non-author review of grok2's Sherlock packets + claude r50 apply-r50.cjs sha 1a970e52)
Review method: read the packets, the retained raw runs, and codex-sherlock-votes-0837.md. Independent static census from the
games/Sherlock.z5.js bytes (story sha ba9c2c81 = the Sherlock row digest). No replay, no facts edit (claude is the single writer).

| item | grok | notes |
|---|---|---|
| moved 3 = FL-TOUCHED (r50) | **ACCEPT** (citation fix below) | Qualifying evidence = run d854ecf6 / plan a51a105c (codex sherlock-moved-retained-substitution.json): pound note 150 sets {3,4}, pistol 122 sets {3}, Mrs Hudson 184 IN SCOPE (parent 111 = here 111) "That's impossible.", bit 3 stays clear. Static initial bytes agree: 150/122/184 all start with bit 3 clear. |
| edible 41 = FL-FOOD (r50) | **ACCEPT** at census+behaviour tier (not opcode 2+1) | The static bit-41 carriers in the story are malmsey 149, pool of malmsey 267, orange pill 229 and yellow pill 237 (the packet's "(+1)" is 267), plus pseudo-object 177 (see hazard). Swallow success on 237/229. Refusals on knife 151 and whistle 173, both bit 41 clear statically. No test_attr 41 was captured, as disclosed. |
| scenery FL-NODESC 32 -> L:X, no map | **ACCEPT** | Same as codex B3: room prose naming sofa/mantel is not a list-suppression test. Not feature-absent. |

Citation fix (comment only, no behaviour change; I don't need to re-vote if it is applied as written): the r50 comment says
"Mrs Hudson refused 0->0; grok2/sherlock/PACKET-moved-3.md". That packet's raw (run-moved-bytediff-full.json, sha 2bb3a9a8)
has Hudson at **parent 0**, and the reply is "You cannot see Mrs Hudson here." That is a parser scope rejection, not a refusal,
and the packet table mislabels it as "refuse / impossible". Please cite run d854ecf6 (codex substitution file) for the
negative instead, e.g. "Mrs Hudson in scope, 'That's impossible.' 0->0; run-sherlock-20261031T063251-46604.json (d854ecf6)".
If the comment lands unchanged, the decision log must still record that the in-scope negative is d854ecf6, not 2bb3a9a8.

Hazard (non-blocking, applies to r48-r50 alike): Sherlock object 177 has an empty name, parent 0, and 46 of 48 attributes set (every
bit except 21, 31). Every mapped bit therefore also matches 177. It is off-tree, so it is not surfaced today, but any census-style
consumer must not count it.
