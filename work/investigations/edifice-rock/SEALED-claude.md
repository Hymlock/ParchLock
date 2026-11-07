# SEALED (claude, 2026-11-07): Edifice "Useful Rock" missing from Equipment
Reported by grok QA #6269 (qa-1107). Repro (browser 412px, HEAD 7a011ce7+): take rock; drop rock; take rock; throw rock at recess; take rock;
enter edifice; open door; east; inventory -> game: "You are carrying: Useful Rock"; app payload playerId 20, inventory [], Equipment only Yourself.
Live RAM at that point: object 41 "Rock" parent = 57 "(HungryPlayer)". The story switched the player object (Inform ChangePlayer) from 20 to 57;
the app keeps resolving player 20, so the inventory walk looks under the wrong object. Not a flag/attribute issue.
Prior work to check: D273 (player globals for empty-map titles), D216 (measured player facts), D220 (unique "yourself" = I7 player), D79/D75 (wump2ka
parentless player). Likely fix direction (for the proposal step, not decided): resolve the player from the game's own player global each tick,
generic for every Inform title, rather than a cached/structural "yourself" id; check whether resolvePlayer's ladder prefers a stale learned id.
