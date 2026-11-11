# Eamon world/UI adapter — source-grounded proposal, not implementation

Purpose: prepare plan packages C/D without bypassing the open G1, baseline or independent-review gates.
Source read against ParchLock `cc862964` and Eamon-CS `5db64a37afe0b5455ee477e067fca4e6d249e419`.
No provider, underlining, radial or Equipment feature is claimed to work by this document.

## Current seams and gaps

| Existing path | Observed behavior | Proposed minimal adaptation |
| --- | --- | --- |
| `WorldModel.registerProvider` / `collectProviders` | Structural fields are exclusively replaced by a structural provider. A declared top-level `playerId` is not copied; `tick` currently takes it from `probe.playerId`. | An app-owned Eamon provider returns native facts, explicit engine identity and player root. Review explicit-root propagation with unchanged existing-provider fallback; do not invent Z-machine probe status or memory. |
| `WorldModel.tick` repairs | Structural payloads pass inventory recovery, player-root correction, compiled-room-name refinement and Inform map-storage reconciliation. | Scope Z/Inform-specific repair to applicable engines while retaining shared deduplication and map processing. Tests must prove Eamon empty inventory and explicit ownership are not replaced by heuristics, and existing Z/Glulx output remains unchanged. No blanket bypass for normal modules. |
| `Actionable.resolveObjectCommands`, `ActionSynth` | Existing underlines, click behavior and radial menus share an object/action pool. `literalAvailable` allows literals when no Z dictionary adapter is present. | Supply exact Eamon object references and verified native command forms through the shared action path. Do not rely on that permissive fallback to validate Eamon commands, or add a second radial UI. Preserve learned-item priority and tracking. |
| `EquipmentUI` | Flat native object rows become a recursive tree through `parentId` plus the player root; drags send commands, not local edits. | Map native custody into those rows and root Yourself. Held/readied/worn are state/display groups, not additional containers. Only actual containers become drop targets. |
| `ReadAloud`, `Navigator`, map/notes and learning | Existing pipelines own narration, queued routes, discovered history and installed learning. | Reuse them after validating the provider and command boundary. No duplicate text delivery, knowledge store, notebook or travel simulator. |

## Snapshot authority

The worker must publish one immutable, generation-tagged snapshot at a verified top-level input
boundary after native turn processing. Bind it to bundle hash, adventure, run and revision. This is a
read-only projection, not a second engine or a durable-save receipt. The browser rejects stale snapshots
after handoff, restore or a newer generation. A nested prompt must disable unrelated radial/drag/travel
submissions so a command cannot be fed into a yes/no or parser-clarification field.

Use entity-kind-qualified native identity: bundle + adventure + kind + id. Artifact/monster/room numeric
IDs can collide across kinds and adventures. Character campaign identity is separate from installed
knowledge ownership. Imported/created character gear may have dynamic IDs: its allocation and restore
semantics must be traced before declaring those IDs stable across characters or saves.

Main Hall is a menu hub, not an invented navigable room. A selected Hall character can still supply
native Equipment/stats under Yourself. Before a character is selected, expose honest absence rather
than a guessed inventory root or another character's gear.

## Native facts and non-interference

- Room and darkness come from the active native character/room context, with visibility evaluated by
  reviewed native predicates. Hidden monsters and closed/hidden contents do not become discovered
  objects just because they exist in a database. Carried knowledge is not equivalent to room visibility.
- Preserve actual container type (in/on/under/behind), native carrying/wearing and readied-weapon state.
  `IArtifact` exposes custody methods and container relations; categories can coexist. A single generic
  `container=true` or `worn=true` must not flatten the remaining semantics.
- The engine's printing helpers are NOT read-only queries. `Room.BuildPrintedFullDesc` updates `Seen`,
  and `Engine.CheckDoor` can change a door category field. Do not call printing/check helpers to generate
  UI snapshots or visible exits without a side-effect audit. No extra RNG calls or simulated commands.
- Native `Command` bindings carry `Verb` and `Synonyms` (for example GetCommand binds get/take).
  Vocabulary alone does not prove a target/action is legal. Review target predicates and per-adventure
  overrides; a displayed form must address the correct visible/reachable object and current state.
- Preserve the distinction between capability, current state, known refusal and unknown. Do not offer
  all Inform verbs merely because Eamon has no Z dictionary. Native forms and legal deliberate refusals
  need provenance; opaque/unknown actions stay withheld pending evidence.

## Required proof before shared feature adoption

1. Read-only snapshot does not change serialized game state, RNG sequence, Seen flags or native output.
2. Empty inventory, worn/readied gear, nested real containers, closed/hidden contents, monsters, darkness,
   duplicated names, dynamic gear IDs, adventure handoff and restore produce correct identity/scope.
3. Long-press, underline click, Equipment click/drag and keyboard submission resolve the same object and
   command; UI changes only after the native result. Nested prompts accept only the requested input.
4. The existing normal-module regression suite passes, plus remaining Z4, save/learning/settings and
   Android checks. One successful Z5/desktop sample is not comprehensive acceptance.
5. Actual native snapshot/action contracts and targeted patch receive independent current-source review.
   Complete baseline, lifecycle, native-comparison and all-adventure acceptance remain required by plan.

Next concrete investigation: trace native visibility/container traversal and dynamic-gear identity; propose
the worker payload plus shared merge/action adapter patch for review. Do not silently adopt this draft.
