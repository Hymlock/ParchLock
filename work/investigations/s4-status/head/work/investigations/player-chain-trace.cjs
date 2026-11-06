// After each command: the payload's room, the player's RAM parent chain (with
// names and room plausibility), and the last printed heading.
//   node chain.cjs games/X.js "cmd,cmd,..."
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path');
const game = process.argv[2]; const cmds = (process.argv[3] || 'look').split(',');
(async () => {
    const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=' + game); await p.waitForTimeout(2500);
    const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return 'line'; await p.waitForTimeout(150); } return 'char'; };
    const state = () => p.evaluate(() => {
        const m = ZRamProvider.getMem(); const pl = WorldModel.lastPayload || {}; const pr = pl.probe || {};
        const chain = []; let id = pr.playerId; const seen = new Set();
        while (id && !seen.has(id) && chain.length < 8) { seen.add(id); let nm = ''; try { nm = ZRamReader.shortName(m, id); } catch (e) {} let pl2 = null; try { pl2 = ZRamReader.isPlausibleMapRoom(m, id); } catch (e) {} chain.push(id + ':' + nm + (pl2 ? '[room]' : '')); try { id = ZRamReader.objectLinks(m, id).parent; } catch (e) { id = 0; } }
        const heads = [...document.querySelectorAll('.Style_subheader')].map(h => h.textContent.trim());
        return { payload: [pl.roomId, pl.roomName], src: pr.roomSource, player: pr.playerId, chain: chain.join(' > '), heading: heads[heads.length - 1] || '', mapCur: (ParchLockMap.GetCurrentRoom() || {}).Name };
    });
    let mode = await settle();
    for (const c of cmds) {
        if (c === '{space}') { const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(600); mode = await settle(); console.log('SPACE', mode, JSON.stringify(await state())); continue; }
        if (mode !== 'line') { const ci = p.locator('.Input.CharInput'); if (await ci.count()) { await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(400); } mode = await settle(); }
        await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(900); mode = await settle();
        console.log(c.padEnd(12), JSON.stringify(await state()));
    }
    await b.close();
})();
