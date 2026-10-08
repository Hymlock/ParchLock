# Independent World Map diagnosis and proposed contract

Sealed after APK62 verification, before reading Claude's scope file. Code,
PRODUCTION_PLAN D202 and architecture section66 were reviewed first. The D202
October7 operator amendment explicitly authorizes a separate fullscreen World
map while retaining the local compass view. This is independent solution
research within that known constraint, not blind to repository history.

## Current cause

- `Map.Build` creates only the fixed here/12 directional slots.
- `Map.Draw` clears every slot and paints the displayed room plus direct
  neighbors (and tentative incoming neighbors). Scale/pan changes that same
  local view. Old discovered rooms are absent from the current canvas because
  they are outside its one-hop presentation, not because their records vanish.
- `Rooms`, `MapTopology` and `Map.Save/Load` already retain the discovered graph,
  identities, exits and notes. Known Rooms already lists the wider graph.
- `WorkspaceUI.DrawPaths` draws center-to-neighbor lines exclusively. It cannot
  render arbitrary inter-room edges without a separate world projection.
- `MapBeautify.layoutHints` recalculates positions from the current room,
  treats every non-compass edge as east and permits coordinate collisions.
  These hints cannot provide stable whole-world positions as-is.

## Proposed behavior and owners

1. Add one explicit fullscreen World map entry. Keep local compass rendering,
   zoom meaning, mini exits and default game controls unchanged. No threshold
   switches renderer. Use the existing dialog/overlay lifecycle so Escape,
   Android Back, input focus, speech and close/reopen behavior remain coherent.
2. Consume only existing `ParchLockMap.Rooms` and accepted Exits/ExitMeta. Use
   `MapTopology.isPlayerFacingRoom` for visibility. Do not scan hidden RAM rooms,
   create nodes, invent edges/reverse commands, or conflate look-ahead evidence
   with actual travel. Render known look-ahead rooms distinctly if included.
3. Use real room identity/record IDs, never room name, as the node key. Duplicate
   displayed titles stay distinct. Commands come from current ExitMeta/Navigator;
   node selection does not submit commands. Travel is explicit and keeps current
   path safety. Notes use existing owner and native identity references.
4. Separate layout coordinates from semantic directions. Cardinal directions
   may guide initial placement; collisions, cycles, vertical links, multiple
   exits to one room, disconnected components and non-compass commands require
   deterministic fallbacks and visible edge labels. Layout cannot claim physical
   distance or turn a borrowed visual position into a parser direction.
5. Compute initial layout once for the current graph; extend it without moving
   already positioned rooms during ordinary exploration. Do not reuse mutable
   `LayoutX/Y` hints. Keep renderer-owned derived state rather than a second
   persisted map graph. State keys must survive renames and detect reindex/reset,
   module switch, import, native restart and restore. Existing explicit map save,
   package import and graph-retaining game restore remain authoritative.
6. Existing floor labels may be shown/filterable, but do not assert that every
   graph knows real floors. Unknown/non-cardinal/one-way edges need honest
   presentation. Never infer reverse travel from a line that merely connects
   two boxes.
7. Rebuild graph/layout only when the relevant graph signature changes and only
   while the World map is open. Pan/zoom transforms existing nodes. No new full
   history reads or idle hidden renderer work; latest performance repairs remain
   intact. Reopening uses the latest graph and keeps discoveries visible.

## Adversarial questions before implementation

- Specify eligible revealed vs visited nodes and hinted edge appearance from
  actual existing fields; `VisitedName` is not a universally populated visit bit.
- Specify stable key/generation and reset/import/restore reconciliation without
  relying on array indices staying fixed after `RemoveRoom`.
- Demonstrate collision-free placement, disconnected components and direction
  labels for numbered exits without continuously relaying out on travel/zoom.
- Specify graph mutation detection and overlay integration within existing
  owners, including scroll/gesture suppression, Back and current-room centering.
- Keep map exports and notes on existing data; no second map persistence format
  or backward-compatibility work is required during development.

## Minimal proof gate

One deterministic small graph fixture covers same-name nodes, collisions,
one-way/cyclic/numbered/vertical edges and a disconnected component. One native
multi-room route proves discoveries remain visible after travel and reopening,
current position and explicit navigation/notes, at phone and desktop widths.
Lifecycle reset/import checks may share that fixture. No blanket game sweep or
heavy force-layout benchmark is needed. Independent implementation audit follows
accepted planning consensus. APK62 remains the verified pre-map artifact.

## Implementation review checkpoint, October 8

Pure layout implemented under exact claims; focused graph fixture passes. Bus1881 requests Claude's independent source audit. Canonical D202/architecture66 now record the accepted split and lifecycle contract (1882).

Codex read-only review of Claude's in-progress renderer identified: reopening on a stale level; nonaccumulating slow-drag threshold and missing outside-release capture; endpoint deduplication losing distinct exit commands/evidence; synchronous Navigator enqueue before hiding obstructing mobile sheets; Browse passing a possibly ambiguous name instead of the selected room record. Findings sent1883/1885/1887, awaiting corrected candidate and independent native proof.

Claude's live route found that look-ahead overwrites state-delta exit metadata (1884). Codex conditionally accepted sticky travel evidence only when bound to destination identity, with changed-target invalidation (1886). This corrects a planning assumption; source semantics and navigation ownership remain unchanged. Neither implementation is marked independently complete yet.

Independent actual-source checks: isolated native Chromium room tap produces zero click events because immediate viewport pointer capture retargets the click (1890). The real-layout Zork route harness subsequently gives 36 PASS / 2 FAIL across phone360 and desktop1280: stable placements, removal, map export/import, app reload, origin-sheet return without another status request, Travel and page errors pass; travelled-edge solidity after reload fails at both widths. Test command: `node harness/world-map-ui.js` (no stub). Travel ordering was a source/contract concern, not a failing route in this check; transform-hidden sheets still satisfy jQuery's visibility test (correction1893). No blanket game sweep was run. Claude's independent layout audit and corrected view remain pending.

## Revised candidate audit, bus1895-1902

Claude's independent layout ACCEPT1895 was received; Codex reran the pure fixture successfully and released its layout/harness claims. Codex independently ran the revised real-layout UI harness:48 PASS /0 FAIL. Previously failing native taps and travelled-edge persistence now pass. Source review confirmed origin-sheet preservation, correct Browse record identity, current-level reopening, accumulated drag threshold and hide-before-enqueue Travel ordering.

Two narrowly measured boundary findings still prevent final renderer acceptance: wildcard question-mark proof is not destination-bound, and clipping a horizontal bent arrow must omit the degenerate target-centre corner to avoid pointing backwards. Source/isolated Chromium evidence and conservative fixes were sent1897/1898/1901/1902. Claude holds the corrective paths; Codex remains read-only. An attempted corrective claim was rejected409 before any edits;1899's mistaken ownership statement was explicitly corrected1900. Final consensus is not recorded until these cases pass independent review. No APK rebuilt and no broad game sweep repeated.

After revised freeze1903 released all paths, Codex successfully claimed only WorldMap.js and its UI harness, announced the serial handoff1904, and implemented the remaining renderer corrections. The wildcard never grants sticky travel evidence; current actual state-delta evidence remains authoritative. A horizontal bent polyline omits its degenerate target-centre corner, so its clipped terminal segment faces the destination. Two existing assertions were strengthened, without adding another game sweep. Syntax checks pass. Isolated actual-source Chromium proof passes matching/mismatching identity, unknown proof on real and text-only destinations, latest actual move, and outside/forward arrow geometry. Corrective paths released; independent Claude audit requested1906, alignment confirmed1907. Canonical final acceptance awaits that audit.

## Final acceptance

Claude independently accepts the corrective patch1908 and reports a current-checkout strengthened UI rerun52/0 at360/1280 plus pure layout PASS. Codex accepts the rest of the view/integration1906 after its own native route48/0 and actual-source boundary proof. Mutual mapping implementation consensus is satisfied. OPEN_WORK map checkboxes, D202 and architecture66 are complete; both canonical integrity validators pass (plan430 units, architecture99). No post-map APK was built. APK62 remains the delivered pre-map artifact. Physical Android/touch confirmation is not claimed. Unrelated post-map statistics queue items and operator-owned overall bus goal completion are outside this completed map step.
