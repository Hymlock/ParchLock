// D219 / M12 part 1: a status column the shared decoder classifies as a
// date/time/metric is never adopted as a room name by the legacy fallback.
// Fresh WiR status dates are not adopted; compiled names (Anchorhead),
// Wumpus status labels and a legitimate date-shaped compiled name are
// unchanged; decoder-unavailable falls back to the previous rule.
//   node harness/d219-status-date-label.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); }
    await p.waitForTimeout(800); return p;
};
(async () => {
    const b = await chromium.launch();
    for (const [g, id, date] of [['WiR1.zblorb.js', '58', 'Friday, May 21, 1954'], ['WiR2.zblorb.js', '64', 'Tuesday, July 13, 1954']]) {
        const p = await open(b, g);
        const r = await p.evaluate(() => ({ payload: [(WorldModel.lastPayload || {}).roomId, (WorldModel.lastPayload || {}).roomName], map: (ParchLockMap.Rooms || []).map(x => [String(x.ObjectId), x.Name]), status: StatusGridDecoder.readRaw(document) }));
        check(r.status.indexOf(date) >= 0, g + ': status line shows the date (' + JSON.stringify(r.status.trim()) + ')');
        check(String(r.payload[0]) === id && r.payload[1] !== date, g + ': payload room ' + id + ' not named with the date (' + JSON.stringify(r.payload) + ')');
        check(!r.map.some(x => x[1] === date), g + ': no map room named with the date (' + JSON.stringify(r.map) + ')');
        await p.close();
    }
    // Anchorhead: compiled names win, unchanged.
    let p = await open(b, 'anchor.z8.js');
    let r = await p.evaluate(() => ({ name: (WorldModel.lastPayload || {}).roomName }));
    check(/Outside the Real Estate Office/i.test(r.name || ''), 'Anchorhead: compiled room name unchanged (' + r.name + ')');
    await p.close();
    // Wumpus: status-derived labels unchanged.
    p = await open(b, 'wump2ka.z5.js');
    await p.evaluate(() => { Input.Clear(); Input.Inject('no', true); }); await p.waitForTimeout(1200);
    for (let i = 0; i < 30; i++) { if (await p.locator('.Input.LineInput').count()) break; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(250); }
    await p.evaluate(() => { Input.Clear(); Input.Inject('look', true); }); await p.waitForTimeout(1500);
    r = await p.evaluate(() => ({ name: (WorldModel.lastPayload || {}).roomName, status: StatusGridDecoder.readRaw(document).trim() }));
    check(!!r.name && r.name !== '' && r.status.indexOf(r.name.slice(0, 6)) >= 0, 'wump2ka: status-derived room label kept (' + JSON.stringify(r) + ')');
    await p.close();
    // Isolated on WiR1 (status shows a date): decoder unavailable -> the
    // previous rule (which adopted the date) still runs; legitimate compiled
    // date-shaped name kept.
    p = await open(b, 'WiR1.zblorb.js');
    const iso = await p.evaluate(() => {
        const out = {}; const real = window.StatusGridDecoder;
        out.compiledDate = WorldModel.refineRoomDisplayName({ roomId: 5, roomName: 'March 3, 1901' });
        window.StatusGridDecoder = undefined;
        try { out.noDecoder = WorldModel.refineRoomDisplayName({ roomId: 5, roomName: '' }); } finally { window.StatusGridDecoder = real; }
        out.dateRejected = StatusGridDecoder.decode('Friday, May 21, 1954').metrics.length > 0;
        out.roomNumberKept = StatusGridDecoder.decode('Room #4').metrics.length === 0;
        return out; });
    check(iso.compiledDate === 'March 3, 1901', 'a legitimate compiled date-shaped room name is kept (D165) (' + iso.compiledDate + ')');
    check(iso.noDecoder === 'Friday, May 21, 1954', 'decoder unavailable: previous legacy rule unchanged (' + JSON.stringify(iso.noDecoder) + ')');
    check(iso.dateRejected && iso.roomNumberKept, 'decoder: a date is a metric, "Room #4" is not');
    await p.close();
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
