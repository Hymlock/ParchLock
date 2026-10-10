// M01 audit: raw direction properties of the start room vs where each
// compass command actually leads (UNDO between probes, so every probe starts
// from the same room).
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path');
const game = process.argv[2] || 'games/moonglow.z3.js';
// Optional intro commands, '|'-separated, replayed after boot and after each restart.
const pre = (process.argv[3] || '').split('|').filter(Boolean);
(async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + game); await p.waitForTimeout(2000);
    const toLine = async () => { for (let i = 0; i < 35; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } return false; };
    await toLine();
    const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(700); return await toLine(); };
    // Ground truth is the player's ACTUAL RAM parent (not the app payload, which
    // M05-class bugs can get wrong), plus the native reply text.
    const here = () => p.evaluate(() => { const m = ZRamProvider.getMem(); const pid = ZRamReader.findPlayerId(m); const par = pid ? ZRamReader.objectLinks(m, pid).parent : 0; const pl = WorldModel.lastPayload || {};
        const reply = [...document.querySelectorAll('.BufferLine')].slice(-4).map(l => l.textContent.trim()).filter(Boolean).join(' / ').slice(0, 160);
        return { id: par, name: par ? ZRamReader.shortName(m, par) : '', player: pid, payload: pl.roomId, reply }; });
    for (const c of pre) await send(c);
    const start = await here(); if (!start.player) console.log('WARNING: no player resolved; parent-based ground truth unavailable');
    const raw = await p.evaluate((rid) => {
        const m = ZRamProvider.getMem(); const h = ZRamReader.header(m);
        const props = (ZRamReader.listProps(m, rid) || []).filter(x => x.num >= 5 && x.num <= 31).map(x => {
            const v = x.sz === 1 ? ZRamReader.u8(m, x.dataAddr) : x.sz === 2 ? ZRamReader.u16(m, x.dataAddr) : null;
            let nm = ''; try { nm = v ? ZRamReader.shortName(m, v) : ''; } catch (e) {}
            return { prop: x.num, sz: x.sz, val: v, target: nm };
        });
        let ver = ''; const pt = ZRamReader.informPropertyNames(m); try { ver = (document.body.innerText.match(/Inform v[\d.]+[^\n]*|Library [\d\/A-Z ]+/) || [''])[0]; } catch (e) {}
        return { version: h.version, banner: ver, propertyTable: pt ? Object.keys(pt.names).filter(k => /_to$/.test(k)).map(k => k + '=' + pt.names[k]).join(' ') : 'none', props, lookahead: (ZRamReader.lookAheadExits(m, rid) || []).map(e => [e.label, e.prop, e.targetRoomName]) };
    }, start.id);
    console.log('START', JSON.stringify(start), JSON.stringify(raw, null, 0));
    for (const d of ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest']) {
        const done = await send(d); const r = await here(); const moved = r.id !== start.id;
        console.log(d.padEnd(10), (done ? '' : '[INPUT NOT COMPLETED] ') + (moved ? ('-> ' + r.id + ' ' + r.name) : '(no move)'), '| payload ' + r.payload, '| reply: ' + r.reply);
        if (moved) { await send('undo'); const back = await here(); if (back.id === start.id) console.log('  undo OK'); else { console.log('  undo unavailable (' + back.reply.slice(-40) + '); restarting the story from boot'); await p.reload(); await p.waitForTimeout(2000); await toLine(); for (const c of pre) await send(c); const again = await here(); if (again.id !== start.id) { console.log('  restart did not return to start, at', JSON.stringify(again)); break; } } }
    }
    await send('version'); console.log('BANNER', (await p.evaluate(() => (document.body.innerText.match(/Inform v[^\n]*|Library[^\n]*|Serial[^\n]*/g) || []).slice(-3))).join(' | '));
    await b.close();
})();
