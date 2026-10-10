# M12: WiR1/WiR2 map rooms labelled with calendar dates. Claude blind findings, SEALED

Written before reading codex's work/mapping-research/M12-date-label-sealed.md.

**Reproduced** (WiR1, SPACE, SPACE, LOOK):
- payload room 58 (src player-containment; player 59 in 58);
- room 58's compiled short name is EMPTY (I7 routine-printed);
- map room name "Friday, May 21, 1954";
- printed heading "Central Park Underpass".

**Cause:**
- The status line of these stories shows only a DATE ("Friday, May 21, 1954"), not a location.
- `StatusGridDecoder` returns its first non-metric column as `roomLabel` (StatusGridDecoder.js ~138), and with an empty object name the room is named from that label.
- Identity is correct (structural 58); only the display name is wrong. That makes it a display defect, as codex framed it.

**Deterministic fix direction (no per-title rule):**
- **(1) Status label != location when it stays constant while the structural room changes.** WiR2 rooms share the date. A status label observed identical across two different structural room ids is not a room label for that story; stop using it for names.
- **(2) Name precedence for rooms with an empty compiled name:**
  - (a) the printed room heading (Style_subheader) in the reply where that structural room became current or was LOOKed at;
  - (b) the status label only if it has varied with the room;
  - (c) otherwise unnamed.
  - The cf7125f prefix upgrade stays for truncated names.
- (3) Already-saved rooms named with the bad label are corrected on the next heading for that room id.

**Prior decisions to check:** D137 (status-grid columns), D170 (truncation), StatusGridDecoder metrics, and cf7125f (heading prefix upgrade).

## Comparison with codex's seal (read after sealing)

- **Agree:** identity is correct (structural ids 58; WiR2 64 -> 76), the compiled names are empty, and the date is shown as the display name. Display defect only.
- **Correction to my seal (codex is more precise):** `StatusGridDecoder` (~86) already classifies the date as a Date text metric, so its `roomLabel` is EMPTY. The date returns through `WorldModel.refineRoomDisplayName` (~214), whose fallback, when the decoder label is empty, is the legacy raw-column parser (~251+). That parser knows only Score/Health/Moves/Turns as metrics and re-adopts the date. Decoder-to-legacy fallback authority failure.

## Combined proposal (planning only)

- **(1) Decoder authority:** a status column the decoder classified as a metric (date, time, day, season and so on) is never adopted as a room name by the legacy fallback.
- **(2) Constancy guard (mine, a belt-and-braces general rule):** a status label identical across two different structural room ids is not a room label for that story.
- **(3) Name precedence for empty compiled names:** the printed room heading for that structural room, then a status label that varies with the room, then unnamed.
- **Controls:** Wumpus status display (D171 "Room #N" handling), dark-name adaptation, the D54 internal-name rules, and cf7125f prefix upgrades.
