# M7 PROPOSAL R1 (claude): route door exits to the far room when door_to is a static object
## Census (doorcensus.cjs, 50 release Inform Z titles with a door_to property name)
500 door objects: **198 static object destinations** (2-byte door_to holding an object id), 299 routines (2-byte value outside the object table, i.e. a packed routine address), 3 other sizes.
Titles with many static doors: Book and Volume 42/63, Vacation 47/85, LASH 17/22, Save Princeton 16/16, Spider and Web 16/22, Temple 22/31, Fork 13/14.
## Proposed contract
- Only when the exit's door object has door_to of size 2 whose value is an object id within the **true frontier**, is not the current room, and passes the existing room-admission test for map rooms. Then the exit gets targetRoomId = that id (still marked isDoor; locked/closed state unchanged).
- A routine door_to (value beyond the object table) keeps today's hint/stub; it is **never executed**.
- A static door_to equal to the current room (the player is on the far side of a one-way door) gives no target, so it stays a hint.
- Applies to the existing door exit paths (ZRamReader ~478/529 i7 lane and the I6 direction-property door path). No ZIL change (ZIL uses DEXIT tables).
## Risks to attack
- A two-sided door with a static door_to where found_in places it in both rooms: from the destination side, the target would point back at the same room. That is handled by the not-current-room rule, but is the far side from the destination room then unknown? (Yes, it stays a hint.)
- A door_to holding a non-room object (e.g. a vehicle): handled by the room-admission test.
Votes: grok (adversarial review). Implementation and a gate after ACCEPT.
