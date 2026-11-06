// M09 first-room gate probe (orchestrator Grok Bot). node harness/m09-first-room.js
// D221 / M11 (codex #2694): DarkScope judges the latest reply once per tick on
// the finalized payload. Positives: HHG dark at start, cleared by TURN ON LIGHT
// ("Bedroom, in the bed", player chain proves the bed), exact room-name line;
// Zork cellar dark. Negatives: styled Help / Inventory headings, prose that
// begins with the room name, another room's heading, a stale room (payload
// moved but the heading names the old room), no structural room.
//   node harness/m11-dark-scope.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    p.toLine = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await p.toLine(); return rooms(p); };
    await p.toLine(); return p;
};
const rooms = p => p.evaluate(() => { WorldModel.tick(); return (ParchLockMap.Rooms || []).filter(r => r && r.Name).map(r => r.Name + '#' + r.ObjectId); });
(async () => {
    const b = await chromium.launch();
    const cases = [['curses.z5.js', ['look'], /tiny balcony/i, null], ['ghost.z8.js', ['look'], /#179$/, null], ['vespers.z8.js', ['look'], /#34$/, null], ['Zork1-TheGreatUndergroundEmpire.z3.js', [], null, /west of house/i], ['Hitchhik.z5.js', [], null, /^bedroom#150$/i]];
    for (const [g, cmds, bad, need] of cases) {
        const p = await open(b, g);
        const r0 = await rooms(p); let r1 = r0;
        for (const c of cmds) r1 = await p.send(c);
        console.log(g, 'boot=', JSON.stringify(r0), 'after=', JSON.stringify(r1));
        if (bad) check(!r0.concat(r1).some(n => bad.test(n)), g + ': boot/epigraph room not admitted');
        if (need) check(r0.some(n => need.test(n)), g + ': normal first room admitted at boot');
        await p.close();
    }
    await b.close(); console.log(pass + ' PASS / ' + fail + ' FAIL'); process.exit(fail ? 1 : 0);
})();
