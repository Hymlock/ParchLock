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
