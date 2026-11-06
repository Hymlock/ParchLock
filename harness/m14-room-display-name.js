// M14: a room whose compiled name is internal/meta ("(Hallway)" in Book and
// Volume) takes the story's own short_name before any status-grid column.
// Book and Volume's status grid is an ASCII street map, so the old path named
// rooms "|" or "down". wump2ka (D53/D201) keeps its status-bar label.
//   node harness/m14-room-display-name.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    p.toLine = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(250); } };
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); await p.toLine(); };
    await p.toLine(); await p.waitForTimeout(800); return p;
};
const state = p => p.evaluate(() => { const P = WorldModel.lastPayload || {}; return { id: P.roomId, name: P.roomName, map: (ParchLockMap.Rooms || []).map(r => [String(r.ObjectId), r.Name]) }; });
(async () => {
    const b = await chromium.launch();
    // Book and Volume boots into a single-key menu ("B" begins) and its line
    // input is typed, not injected.
    let p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/bookvol.z5.js'); await p.waitForTimeout(3000);
    await p.evaluate(() => document.querySelector('.parchlock-splash__start')?.click()); await p.waitForTimeout(500);
    await p.locator('.Input.CharInput').first().focus(); await p.keyboard.press('b'); await p.waitForTimeout(2500);
    for (const c of ['stand', 's', 'look']) { await p.locator('.Input.LineInput').first().fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(2000);
        for (let i = 0; i < 10 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); } }
    let s = await state(p);
    check(String(s.id) === '365' && s.name === 'Hallway', 'bookvol: payload room 365 is "Hallway" (' + JSON.stringify([s.id, s.name]) + ')');
    check(s.map.some(r => r[0] === '365' && r[1] === 'Hallway'), 'bookvol: map room 365 "Hallway"');
    check(!s.map.some(r => /^\s*(\||-+|up|down|[nsew]|[a-z])\s*$/i.test(r[1] || '')), 'bookvol: no map room named from the street-map grid (' + JSON.stringify(s.map) + ')');
    await p.close();
    // Controls: internal compiled names whose status row IS a valid name keep
    // that row (storyShortName misreads these: ".Broken Top Boulevard", "b z").
    const ctl = [['MakeItGood.zblorb.js', ['look'], 391, /^Broken Top Boulevard/], ['MakeItGood.zblorb.js', ['look', 'north', 'look'], 424, /^Front Porch$/],
        ['dewdrops.z5.js', ['look'], 39, /^Stage \(A Ge/], ['vespers.z8.js', ['look'], 325, /^Your Bedroom$/]];
    for (const [g, cmds, id, re] of ctl) {
        p = await open(b, g); for (const c of cmds) await p.send(c); s = await state(p);
        check(String(s.id) === String(id) && re.test(s.name || ''), g + ': room ' + id + ' keeps its status-row name (' + JSON.stringify([s.id, s.name]) + ')');
        await p.close();
    }
    p = await open(b, 'wump2ka.z5.js'); await p.send('no'); await p.send('look'); s = await state(p);
    const story = await p.evaluate(id => ZRamReader.storyShortName(ZRamProvider.getMem(), Number(id)), s.id);
    check(!!s.name && !/^\s*$/.test(s.name) && !/^C_ROOMS/i.test(s.name), 'wump2ka: status-bar room label kept (' + JSON.stringify([s.id, s.name]) + ')');
    console.log('info: wump2ka storyShortName=' + JSON.stringify(story));
    await p.close(); await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
