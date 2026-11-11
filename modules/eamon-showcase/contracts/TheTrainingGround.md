# The Training Ground — draft entry contract

Status: source-grounded entry slice, unreviewed; no runtime boundary/outcome acceptance.
Reference: Eamon-CS commit `5db64a37afe0b5455ee477e067fca4e6d249e419`.
Primary file: `Adventures/TheTrainingGround/Game/IntroStory.cs`,
SHA-256 `818f5c150166afb5e23ff971d489533a7384304109e88a6ec949a19e4f9e042c`.

## Native entry rule

The intro rejects a character when `ArmorExpertise > 25`. It disables startup, execution and shutdown
on the adventure main loop and sets `ExitType.GoToMainHall`. This is a rejected visit, not a completed
adventure or a qualifying campaign clear. Armor expertise 25 is permitted by this particular test;
zero is also permitted and receives different introductory narration. This is not an inverted minimum.

Any host preflight must preserve the authoritative native entry check. A tier unlock cannot waive it.
Display the rejection through the existing story/narration path and return safely without changing
rewards, advancing campaign rank, clearing learned data or creating an invented success receipt.

## Required executed cases (all pending)

| Expertise | Expected result from this rule |
| --- | --- |
| 0 | Continues with novice-specific introduction |
| 25 | Continues |
| 26 | Returns to Hall without entering the main loop; no campaign clear |

Verify through the real host, not by changing a comparison in a copied source or fabricating evidence.
Check character/equipment integrity, return/quit/restart, map identity and no spurious death/clear.
For tier-route proof, demonstrate reachable qualifying adventures with an advancing legal character;
an already overqualified character must not be forced through this adventure to escape a campaign lock.
The threshold alone does not prove a complete Tier 1 route or an author-assigned tier.

Full custom-behavior census, qualifying outcome contract, rights clearance, native comparisons and
real-target execution remain to do. This document does not declare those features absent or complete.
