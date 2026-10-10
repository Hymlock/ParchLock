// D221 / M11: DarkScope judges only the latest reply. HHG starts dark, then
// lights; the flag must clear once a lit room description prints and must not
// stick from history. Zork I: entering the dark cellar without a lamp still
// shows dark.   node harness/m11-dark-scope.js
const { chromium } = require(require('path').resolve('node_modules/playwright'));
const { pathToFileURL } = require('url'); const path = require('path');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) { pass++; console.log('PASS: ' + msg); } else { fail++; console.log('FAIL: ' + msg); } };
const open = async (b, g) => {
    const p = await b.newPage();
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
    p.toLine = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await p.toLine(); return p.evaluate(() => { WorldModel.tick && WorldModel.tick(); DarkScope.collect(); return DarkScope.dark; }); };
    await p.toLine(); return p;
};
(async () => {
    const b = await chromium.launch();
    let p = await open(b, 'Hitchhik.z5.js');
    const d0 = await p.evaluate(() => { DarkScope.collect(); return DarkScope.dark; });
    check(d0 === true, 'HHG: dark at the opening (pitch dark bedroom)');
    await p.send('turn on light');
    const d1 = await p.send('look');
    check(d1 === false, 'HHG: LOOK after TURN ON LIGHT clears dark');
    await p.send('get up');
    const d2 = await p.send('inventory');
    check(d2 === false, 'HHG: an inventory reply (no room description) keeps lit, no sticky history');
    // Heading-line contract (grok #2631): exact name or name + ","/"(";
    // prose that only begins with the room name does not clear dark.
    const hl = await p.evaluate(() => { const room = (WorldModel.lastPayload || {}).roomName; DarkScope.dark = true; DarkScope._noted = false;
        const buf = document.querySelector('#windowport .BufferWindow');
        const add = t => { const d = document.createElement('div'); d.className = 'BufferLine'; d.textContent = t; buf.appendChild(d); return d; };
        const echo = add('>x'); const s = document.createElement('span'); s.className = 'Style_input'; echo.appendChild(s);
        const prose = add(room + ' door is shut.'); DarkScope.noteText(''); const afterProse = DarkScope.dark;
        DarkScope._noted = false; const head = add(room); DarkScope.noteText(''); const afterHeading = DarkScope.dark;
        [echo, prose, head].forEach(n => n.remove()); return { room, afterProse, afterHeading }; });
    check(hl.afterProse === true, 'HHG: a line that only begins with the room name does not clear dark (' + JSON.stringify(hl) + ')');
    check(hl.afterHeading === false, 'HHG: the bare room-name heading line clears dark');
    await p.close();
    p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js');
    for (const c of ['north', 'east', 'open window', 'enter window', 'west', 'move rug', 'open trap door']) await p.send(c);
    const dz = await p.send('down');
    const zr = await p.evaluate(() => DarkScope.latestReply().text.replace(/s+/g, ' ').slice(0, 160));
    check(dz === true, 'Zork I: cellar without the lamp shows dark (' + zr + ')');
    await p.close();
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
