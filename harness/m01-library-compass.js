// D217 / M01 library-compass lane. Native start-room labels must match the
// direction the game actually moves the player (ground truth:
// work/mapping-research/claude-m01/SUMMARY.md); fail-closed games and the
// prop2 control must be unchanged; directionDoorDirs must never consume the lane.
//   node harness/m01-library-compass.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const CASES = [
    // game, lane expected, start-room label -> destination name (ground truth), doorDirs expected
    { g: 'catseye.z3.js', lane: true, labels: { north: 'Sitting Room', south: 'Main Hallway', east: 'Kitchen' }, absent: ['exit-6'], doorDirs: '' },
    { g: 'moonglow.z3.js', lane: true, labels: { south: 'Barn House' }, doorDirs: '' },
    { g: 'night.z5.js', lane: true, labels: { northeast: 'Hall Outside Computer Site', out: 'Hall Outside Computer Site' }, absent: ['east', 'down'], doorDirs: '' },
    { g: 'curses.z5.js', lane: true, labels: { north: 'Old Winery', south: 'Old Furniture', east: "Servant's Room" }, absent: ['exit-5', 'exit-6'], doorDirs: '' },
    // Deja Vu fails isInformCompiled (very early build): lane stays off, unresolved.
    { g: 'dejavu.z3.js', lane: false },
    { g: 'theatre.z5.js', lane: true },
    { g: 'Advent.z5.js', lane: false, labels: { north: 'In Forest', south: 'In A Valley', east: 'Inside Building', west: 'At Hill In Road', up: 'At Hill In Road', down: 'In A Valley', in: 'Inside Building' }, doorDirs: '7,8,9,10,11,12,13,14,15,16,17,18' },
    { g: 'Inevita.z5.js', lane: false },
    { g: 'gostak.z5.js', lane: false },
    { g: 'wump2ka.z5.js', lane: false, doorDirs: '7,8,9,10,11,13,12,14,15,16,18,17,91,92,93,94,95' }
];
(async () => {
    const b = await chromium.launch();
    for (const c of CASES) {
        const p = await b.newPage();
        await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
        await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + c.g); await p.waitForTimeout(2500);
        for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
        const r = await p.evaluate(() => { const m = ZRamProvider.getMem(); const lane = ZRamReader.discoverLibraryCompassProfile(m); const prop2 = ZRamReader.discoverCompassProfile(m);
            const pid = ZRamReader.findPlayerId(m), room = pid ? ZRamReader.objectLinks(m, pid).parent : 0;
            const exits = room ? (ZRamReader.lookAheadExits(m, room) || []).map(e => [e.label, e.targetRoomName]) : [];
            return { laneActive: !!lane && !prop2, exits, doorDirs: ZRamReader.directionDoorDirs(m).join(',') }; });
        check(r.laneActive === c.lane, c.g + ': library-compass lane ' + (c.lane ? 'active' : 'inactive'));
        for (const [label, dest] of Object.entries(c.labels || {})) check(r.exits.some(e => e[0] === label && e[1] === dest), c.g + ': "' + label + '" leads to ' + dest + ' (got ' + JSON.stringify(r.exits) + ')');
        for (const label of c.absent || []) check(!r.exits.some(e => e[0] === label), c.g + ': no stock-mislabelled "' + label + '" exit');
        if (c.doorDirs != null) check(r.doorDirs === c.doorDirs, c.g + ': directionDoorDirs unchanged (' + r.doorDirs + ')');
        await p.close();
    }
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
