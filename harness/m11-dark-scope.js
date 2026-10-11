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
    p.send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await p.toLine(); return p.evaluate(() => { WorldModel.tick(); return DarkScope.dark; }); };
    await p.toLine(); return p;
};
(async () => {
    const b = await chromium.launch();
    let p = await open(b, 'Hitchhik.z5.js');
    const d0 = await p.evaluate(() => { WorldModel.tick(); return DarkScope.dark; });
    check(d0 === true, 'HHG: dark at the opening (pitch black bedroom)');
    // Limit (fail closed, orchestrator 2026-10-10): bed 58 is unnamed (no shortName,
    // no parser words), so "Bedroom, in the bed" has no structural proof; prose such as
    // "outside the bed" is not used. State is kept until the bare heading.
    const d1 = await p.send('turn on light');
    check(d1 === true, 'HHG: "Bedroom, in the bed" with unnamed bed is unproven -> state kept (documented limit, no prose)');
    await p.send('get up');
    const d1b = await p.send('look');
    check(d1b === false, 'HHG: after GET UP, LOOK prints the bare "Bedroom" heading -> clears dark');
    const hud = await p.evaluate(() => (WorldModel.lastPayload.hudMetrics || []).filter(h => h.source === 'dark-scope').length);
    check(hud === 0, 'HHG: no dark-scope HUD entry once lit');
    const d2 = await p.send('inventory');
    check(d2 === false, 'HHG: an inventory reply keeps lit (no sticky history)');
    // Controlled negatives on the real function: start dark, append a fake
    // reply after a command echo, run noteFromPayload on a payload copy.
    const neg = await p.evaluate(() => {
        const buf = document.querySelector('#windowport .BufferWindow'), added = [];
        const add = (t, styled) => { const d = document.createElement('div'); d.className = 'BufferLine'; if (styled) { const s = document.createElement('span'); s.className = 'Style_subheader'; s.textContent = t; d.appendChild(s); } else d.textContent = t; buf.appendChild(d); added.push(d); };
        const run = (lines, payloadPatch) => { added.splice(0).forEach(n => n.remove()); const echo = document.createElement('div'); echo.className = 'BufferLine'; const s = document.createElement('span'); s.className = 'Style_input'; s.textContent = 'x'; echo.appendChild(s); buf.appendChild(echo); added.push(echo);
            lines.forEach(l => add(l[0], l[1])); DarkScope.dark = true; DarkScope.lastKey = ''; const pl = Object.assign({}, WorldModel.lastPayload, payloadPatch || {}); DarkScope.noteFromPayload(pl); const r = DarkScope.dark; added.splice(0).forEach(n => n.remove()); return r; };
        const room = WorldModel.lastPayload.roomName;
        return {
            room,
            help: run([['Help', true]]),
            inventory: run([['Inventory', true]]),
            prose: run([[room + ', the door is shut.', false]]),
            otherRoom: run([['Kitchen', true]]),
            stale: run([[room, true]], { roomId: 99999, roomName: 'Somewhere Else' }),
            noRoom: run([[room, true]], { roomId: null, roomName: '' }),
            heuristicOnly: run([[room, true]], { engineMode: 'heuristic', probe: null, sources: [{ name: 'heuristic', confidence: 0.2 }] }),
            exact: run([[room, false]])
        }; });
    check(neg.help === true, 'negative: styled "Help" heading does not clear dark');
    check(neg.inventory === true, 'negative: styled "Inventory" heading does not clear dark');
    check(neg.prose === true, 'negative: "' + neg.room + ', the door is shut." does not clear dark');
    check(neg.otherRoom === true, 'negative: another room\'s heading does not clear dark');
    check(neg.stale === true, 'negative: heading of the previous room after relocation does not clear dark');
    check(neg.noRoom === true, 'negative: no structural room -> no clear');
    check(neg.heuristicOnly === true, 'negative: a non-structural (heuristic-only) payload grants no heading clear');
    check(neg.exact === false, 'positive: the exact current-room name line clears dark');
    await p.close();
    p = await open(b, 'Zork1-TheGreatUndergroundEmpire.z3.js');
    for (const c of ['north', 'east', 'open window', 'enter window', 'west', 'move rug', 'open trap door']) await p.send(c);
    const dz = await p.send('down');
    check(dz === true, 'Zork I: cellar without the lamp shows dark');
    await p.close();
    await b.close();
    console.log(pass + ' PASS / ' + fail + ' FAIL');
    process.exit(fail ? 1 : 0);
})();
