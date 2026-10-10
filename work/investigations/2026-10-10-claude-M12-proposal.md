# M12 proposal (claude, bus #2578; resent as a file for durability)

## Current code
- `WorldModel.refineRoomDisplayName` (js/WorldModel.js ~214-288) works in this order:
  1. a compiled real name wins (D165);
  2. otherwise `StatusGridDecoder.fromDocument().roomLabel`;
  3. when that is empty, the legacy `.GridWindow.reverse` column parser (~251-286). Its metric filter knows only Score/Health/Moves/Turns.
- So the date column of WiR1/2, "Friday, May 21, 1954", is re-adopted as the room name.
- `StatusGridDecoder.decode` (js/StatusGridDecoder.js ~86-91) already classifies that column as a Date text metric.

## Part 1: decoder authority per column (the legacy path is kept)
- In the legacy path, after `stripGluedMetric` (D170 kept), a column is NOT a banner candidate when `StatusGridDecoder.decode(column).roomLabel === ""`, i.e. when the decoder alone classifies that column as a metric, time, date, day, season, score pair and so on.
- If no candidate survives, return `payload.roomName || ""` (blank), never `columns[0]`.
- Preserved:
  - wump2ka "A fair-sized ... caver" decodes to itself and is kept;
  - "Room #N" handling;
  - D165 compiled-name precedence;
  - D201 blank-name admission by structural id.

## Part 2: a heading owner for blank rooms (existing infrastructure only)
Actionable's reply-boundary block (js/Actionable.js ~1688-1745) already computes heading, lastBanner and lastInput, excludes asterisk end-of-game banners, and owns the item-8 upgrade. Beside item 8, the map room takes the printed heading text when ALL of these hold:
- (a) payload.roomId is structural;
- (b) that room's compiled short name is BLANK (`ZRamReader.shortName` is empty; the D201 lane);
- (c) the chosen banner index is AFTER the last consumed input: positional, current reply only, never history;
- (d) the turn either changed the structural room or the command was LOOK/L;
- (e) the banner is not the darkness name, and the room is not currently dark per the existing dark alias;
- (f) the map room for that id has an empty name, or a name that Part 1 now rejects.

Constraints:
- No timers, no whole-history regex, no extra LOOK probes.
- Never applied across a relocation (the structural id must belong to the same reply).
- Wumpus/C_ROOMS rooms are unaffected (internal names, not blank).
- The D62 freeze is respected: only empty or rejected names are filled.
- M09: before the first consumed input there is no owner, so the room stays blank until the first arrival or LOOK. M09 is not declared solved.

## Tests
- WiR1 SPACE SPACE LOOK -> room 58 is named "Central Park Underpass".
- WiR2 64 -> 76: names come from headings.
- Controls: Anchorhead (compiled names, unchanged), wump2ka (status/D62 unchanged), a dark-room game, d23/d201/d46.
