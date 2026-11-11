# Stronghold of Kahr-Dur — draft source contract

Status: source-grounded baseline slice, unreviewed; no executed outcome or full behavior acceptance.
Reference: Eamon-CS commit `5db64a37afe0b5455ee477e067fca4e6d249e419`.
Primary file: `Adventures/StrongholdOfKahrDur/Game/States/Player/PlayerMoveCheckState.cs`,
SHA-256 `ef2efc1eaddf8fd033a8a9ab5833680a616ead8ed0d707c780b041b49bdf4bd4`.

## Qualifying outcome

At `AfterBlockingArtifactCheck`, when `R2 == DirectionExit`, the source evaluates:

| Fact | Exact native predicate |
| --- | --- |
| Evil force vanquished | Monster 22 `IsInLimbo()` |
| Mirabelle rescued | Monster 26 `Location == gGameState.Ro` |

The quest predicate is the conjunction. Preserve these exact native predicates; do not substitute a
printed success line, an inferred death flag or a generic score threshold. The player is then asked
whether to leave. Answering yes sets `Die=0`, `ExitType.FinishAdventure` and shuts down the main loop
even when the quest predicate is false. Therefore `FinishAdventure` alone MUST NOT earn a clear.
Answering no also earns no clear, even if the success text has already appeared.

Capture the two quest facts and the confirmed departure in the live engine context before teardown.
Only the completed durable return transaction can turn them into campaign credit, once per qualifying
clear under the plan's character/package/run/transition identity. Exact capture hook and receipt schema
are still to review and implement. Do not evaluate old monster objects after Main Hall replaces them.

## Critical custom behavior already identified

- Movement from room 92 to 65 requires artifact 18 to be worn by the character, not merely owned.
- Movement from room 84 to 94 has a boots-dependent path using artifact 14. Without worn boots, a
  nested confirmation can trigger death (`Die=1`, player-dead state); declining does not make the move.
- Movement from 94 back to 84 is blocked without the worn boots. Ownership/capability cannot replace
  the actual worn state. Mapping/navigation must use the engine result, not assume the edge succeeded.
- These nested confirmations are not durable safe points. Fast travel must stop on the native
  interaction and must not send another queued direction or suppress its narration.

## Required executed cases (all pending)

1. Qualifying rescue/vanquish plus confirmed exit and durable Hall return: exactly one credit.
2. Neither fact, vanquished-only and rescued-only exits: no credit, despite `FinishAdventure`.
3. Both facts but decline departure: no credit yet; later valid exit still receives one credit.
4. Save/restore/retry/kill around departure, two callbacks/tabs, failure before/after commit: no false or
   duplicate credit and no lost character/inventory revision.
5. Amulet/boots worn versus held versus absent, pit confirmation yes/no, death and return: engine state,
   map, actions, Equipment, route stopping and narration agree. No forced/random acquisition retries.

The full entry-condition inventory, remaining custom behaviors, native reference transcripts and tier
placement/route proof are not established by this excerpt. Do not mark the whole adventure complete.

## Rights disposition

`Program.cs` attributes the inherited adventure to Derek C. Jeter and contains an Eamon Deluxe notice
encouraging non-commercial distribution; the C# file also attributes Michael Penner. This is a concrete
inherited-rights constraint, not automatic clearance under the repository's root license. Record the
applicable original/derivative permissions and corresponding notices in the release rights ledger.
Release permission is unresolved here; no external author contact or distribution was performed.
