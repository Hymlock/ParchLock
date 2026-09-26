// D170: locating the room banner in the transcript.
//
// Deterministic on purpose. wump2ka generates a new cave every game, so a live
// probe reproduces this only sometimes -- six sessions found it twice, then six
// more found it never. The failing SHAPE, though, was measured exactly, and it
// is that shape this pins:
//
//   ParchLockMap.CurrentRoom : "A fair-sized, pocked cavern"   (stale label)
//   payload.roomName         : "A large, textured, watery room" (printed now)
//   heading found            : 28      <- an old banner carrying the stale name
//   lastInput                : 196
//   buffer                   : 200 lines
//
// RoomLines then covered two lines from 168 lines earlier, long scrolled off
// screen, and every exit and item in the description the player was actually
// reading went unmarked.
//
// The rule under test: the banner is located by the name the game printed THIS
// turn (payload.roomName) as well as the stored map label, and a match that
// predates the player's last command loses to any banner printed after it.
// D62 established that wump2ka's display name is not a stable per-visit label,
// which is precisely why a locator keyed only on the stored label is unsound.

let pass = 0, fail = 0;
function check(cond, msg) {
    if (cond) { pass++; console.log('PASS:', msg); }
    else { fail++; console.log('FAIL:', msg); }
}

// Minimal stand-ins for the two helpers the locator uses.
const clean = (s) => String(s || '').trim();

// The locator, expressed exactly as js/Actionable.js Refresh() computes it.
function locate(lines, lastInput, currentRoom, payloadRoomName) {
    const headingNames = [];
    if (payloadRoomName) headingNames.push(String(payloadRoomName).toLowerCase());
    if (currentRoom) headingNames.push(String(currentRoom).toLowerCase());

    let heading = -1;
    lines.forEach((line, index) => {
        if (!line.subheader) return;
        if (headingNames.indexOf(clean(line.text).toLowerCase()) !== -1) heading = index;
    });

    let recentHeading = -1;
    lines.forEach((line, index) => {
        if (index <= lastInput) return;
        if (line.subheader) recentHeading = index;
    });
    if (recentHeading >= 0 && heading <= lastInput) heading = recentHeading;
    return heading;
}

// Build the measured buffer: an old banner with the stale name near the top,
// the real current banner just before the last command, description after it.
function buildBuffer() {
    const lines = [];
    for (let i = 0; i < 200; i++) lines.push({ text: 'filler ' + i, subheader: false, input: false });
    lines[28] = { text: 'A fair-sized, pocked cavern', subheader: true };   // stale name, old visit
    lines[185] = { text: 'A large, textured, watery room', subheader: true }; // the real one
    for (let i = 186; i <= 195; i++) lines[i] = { text: 'Exit ' + (i - 185) + ' curves away.', subheader: false };
    lines[196] = { text: '>x3', subheader: false, input: true };
    lines[197] = { text: "There aren't that many exits.", subheader: false };
    return lines;
}

// ---- the measured failure ------------------------------------------------
{
    const lines = buildBuffer();
    const h = locate(lines, 196, 'A fair-sized, pocked cavern', 'A large, textured, watery room');
    check(h !== 28, `the stale banner at line 28 is not chosen (got ${h})`);
    check(h === 185, `the banner the game printed this turn is chosen (got ${h})`);

    // and the description really is what RoomLines would then cover
    const end = lines.findIndex((l, i) => i > h && l.input);
    const covered = lines.slice(h + 1, end < 0 ? lines.length : end);
    check(covered.length === 10, `RoomLines covers the whole description (${covered.length} lines)`);
    check(covered.every(l => /^Exit /.test(l.text)), 'and those lines are the exits the player can see');
}

// ---- a banner printed AFTER the last command always wins -----------------
{
    const lines = buildBuffer();
    lines[198] = { text: 'A tiny, creased room', subheader: true };
    const h = locate(lines, 196, 'A fair-sized, pocked cavern', 'A large, textured, watery room');
    check(h === 198, `a banner printed after the command wins even if unnamed (got ${h})`);
}

// ---- a game whose names ARE stable is unaffected -------------------------
{
    const lines = buildBuffer();
    lines[28] = { text: 'Outside the Real Estate Office', subheader: true };
    lines[185] = { text: 'Alley', subheader: true };
    // Map label and payload agree, as they do in every game with stable names.
    const h = locate(lines, 196, 'Alley', 'Alley');
    check(h === 185, `stable-name game still locates its own banner (got ${h})`);

    // An older visit to the SAME room must not win over the recent one.
    const lines2 = buildBuffer();
    lines2[28] = { text: 'Alley', subheader: true };
    lines2[185] = { text: 'Alley', subheader: true };
    const h2 = locate(lines2, 196, 'Alley', 'Alley');
    check(h2 === 185, `the most recent visit to a repeated room wins (got ${h2})`);
}

// ---- no banner anywhere: the locator must report honestly ----------------
{
    const lines = buildBuffer();
    lines[28] = { text: 'filler 28', subheader: false };
    lines[185] = { text: 'filler 185', subheader: false };
    const h = locate(lines, 196, 'Nowhere', 'Nowhere');
    check(h === -1, `no banner found reports -1 rather than guessing (got ${h})`);
}

console.log(`${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
