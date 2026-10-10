// D219 / M12: rooms with a blank compiled short name take the story's own
// name (I7 short_name: direct packed string, or [header, packed] block) before
// any status-line column. WiR's date status is no longer the room's name and
// the room stays on the map. Anchorhead (compiled) and wump2ka (status) are
// unchanged.   node harness/m12-room-short-name.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    p.toLine = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(250); } };
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); await p.toLine(); };
    await p.toLine(); await p.waitForTimeout(800); return p;
};
const state = p => p.evaluate(() => ({ payload: [(WorldModel.lastPayload || {}).roomId, (WorldModel.lastPayload || {}).roomName], map: (ParchLockMap.Rooms || []).map(r => [String(r.ObjectId), r.Name]) }));
(async () => {
    const b = await chromium.launch();
    // WiR1: room 58 named from the story, not the status date; present on the map.
    let p = await open(b, 'WiR1.zblorb.js'); let s = await state(p);
    check(String(s.payload[0]) === '58' && s.payload[1] === 'Central Park Underpass', 'WiR1: payload room 58 is "Central Park Underpass" (' + JSON.stringify(s.payload) + ')');
    check(s.map.some(r => r[0] === '58' && r[1] === 'Central Park Underpass'), 'WiR1: map holds 58 "Central Park Underpass" (' + JSON.stringify(s.map) + ')');
    check(!s.map.some(r => /1954/.test(r[1] || '')), 'WiR1: no map room named with the status date');
    await p.close();
    // Repair: a map saved before D219 holds room 58 under the date; the next
    // payload upgrades it once to the story name (D62 freeze does not apply
    // to a metric label).
    p = await open(b, 'WiR1.zblorb.js');
    const rep = await p.evaluate(() => { const r = (ParchLockMap.Rooms || []).find(x => String(x.ObjectId) === '58'); if (!r) return 'no room';
        r.Name = 'Friday, May 21, 1954'; MapTopology.ensureRoom('Central Park Underpass', '58'); const after = r.Name;
        const w = { ObjectId: '7', HasRealId: true, Name: 'Room #3', Exits: {}, ExitMeta: {} }; ParchLockMap.Rooms.push(w); w.Id = w.Id || 'wtest';
        MapTopology.ensureRoom('Room #9', '7'); return [after, w.Name]; });
    check(rep[0] === 'Central Park Underpass', 'repair: saved date name upgrades to the story name (' + JSON.stringify(rep) + ')');
    check(rep[1] === 'Room #3', 'repair: a non-metric frozen name (Wumpus-style Room #N) does not change (D62)');
    await p.close();
    // WiR2: 64 "Grim Hallway".
    p = await open(b, 'WiR2.zblorb.js'); s = await state(p);
    check(s.map.some(r => r[0] === '64' && r[1] === 'Grim Hallway'), 'WiR2: map holds 64 "Grim Hallway" (' + JSON.stringify(s.map) + ')');
    check(!s.map.some(r => /1954/.test(r[1] || '')), 'WiR2: no map room named with the status date');
    const wir2 = await p.evaluate(() => ZRamReader.storyShortName(ZRamProvider.getMem(), 76));
    check(wir2 === 'Office on Floor Fifty-One', 'WiR2: room 76 decodes to "Office on Floor Fifty-One" (' + wir2 + ')');
    await p.close();
    // Facility: block form ([35, packed]).
    p = await open(b, 'Facility.z8.js');
    const fac = await p.evaluate(() => [45, 48, 50, 53].map(id => ZRamReader.storyShortName(ZRamProvider.getMem(), id)));
    check(JSON.stringify(fac) === JSON.stringify(['Lobby', 'Visitor Gallery', 'Information Center', 'Gift Shop']), 'Facility: block-form names (' + JSON.stringify(fac) + ')');
    await p.close();
    // Warbler: direct form.
    p = await open(b, 'TheWarblersNest.zblorb.js');
    const war = await p.evaluate(() => [51, 53, 56].map(id => ZRamReader.storyShortName(ZRamProvider.getMem(), id)));
    check(JSON.stringify(war) === JSON.stringify(['Among the reeds', 'Beach', 'Outside the cottage']), 'Warbler: direct-form names (' + JSON.stringify(war) + ')');
    s = await state(p);
    check(s.map.some(r => r[0] === '51' && r[1] === 'Among the reeds'), 'Warbler: map room 51 "Among the reeds" (' + JSON.stringify(s.map) + ')');
    await p.close();
    // Controls.
    p = await open(b, 'anchor.z8.js'); s = await state(p);
    check(/Outside the Real Estate Office/i.test(s.payload[1] || ''), 'Anchorhead: compiled name unchanged (' + s.payload[1] + ')');
    const anc = await p.evaluate(() => ZRamReader.storyShortName(ZRamProvider.getMem(), (WorldModel.lastPayload || {}).roomId));
    check(anc === '', 'Anchorhead (I6, no short_name table entry for rooms): helper returns "" (' + JSON.stringify(anc) + ')');
    await p.close();
    p = await open(b, 'wump2ka.z5.js'); await p.send('no'); await p.send('look'); s = await state(p);
    check(!!s.payload[1] && !/^\s*$/.test(s.payload[1]), 'wump2ka: status-derived room label still present (' + JSON.stringify(s.payload) + ')');
    await p.close();
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
