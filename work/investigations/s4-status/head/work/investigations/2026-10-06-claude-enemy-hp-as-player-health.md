# Claude investigation: enemy HP shown as player health (Treasures mid-combat)

Sealed 2026-10-06. NOTE: the rule below was shared with Codex in #1595 in the same message as the
blind request, so Codex's investigation cannot be blind. #1596 retracted it and requested an
independent investigation instead.

Evidence (live 1280, fresh run: @space, take sword / east / north / north / down / take blue
banner / assail):

    grid     : "BARBARIAN HIT POINTS: 9/16 VON DARTH THE SLY HIT POINTS: 58/65"
    observed : {health:{key:"health", label:"HIT POINTS", value:58, max:65}}

The canonical player health takes the enemy's row. The actor-name prefix is discarded and the
last "HIT POINTS" match wins.

Proposed rule: a "<prefix> <health word>" row is the PLAYER's only when:

- the prefix is empty or is the player's own name/class banner, or
- it is the first such row before any actor-named row.

A row whose prefix exactly names a unique scoped non-player actor is that actor's health,
never canonical health. Ambiguous rows are neither: fail closed.

Code location still to pin down: the StatTracker status-grid parse that produces
`observed.health`.

## Code location (added before seeing any Codex findings on this item)

js/StatTracker.js:

- `splitColumns` (about line 650) splits the grid on newlines and runs of 3+ spaces, so the
  row structure (owner banner, then its metric) is lost.
- `statsFromColumns` (about line 658) maps every "HIT POINTS: x/y" column to `canonKey` "health"
  and assigns `out[key]`. A later column overwrites an earlier one, so the last row (the enemy)
  wins.

The general defect is that a canonical key repeated in one grid is silently last-wins. A
repetition means the grid lists several owners. A fix must keep the row/owner association,
for example by parsing rows before columns, and decide canonical ownership from it, failing
closed when the owner cannot be decided.
