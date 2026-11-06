// M05 control census: for every game, after boot and after LOOK, report when
// enclosingRoom resolves to an internal "(...)" object, with the chain and
// the printed heading, so admitted cases can be judged against the story.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
const games = fs.readdirSync('games').filter(f => f.endsWith('.js'));
(async () => {
    const b = await chromium.launch();
    for (const g of games) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
        await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
        try {
            await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2000);
            const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
            const probe = (tag) => p.evaluate((tag) => { try { const m = ZRamProvider.getMem(); if (!m || !window.ZRamReader) return null; const pid = ZRamReader.findPlayerId(m); if (!pid) return null; const r = ZRamReader.enclosingRoom(m, pid); if (!r) return null; const nm = ZRamReader.shortName(m, r) || ''; if (nm.charAt(0) !== '(') return null;
                const chain = []; let id = pid; for (let i = 0; id && i < 8; i++) { chain.push(id + ':' + (ZRamReader.shortName(m, id) || '')); id = ZRamReader.objectLinks(m, id).parent; }
                const h = [...document.querySelectorAll('.Style_subheader')].pop(); return tag + ' room=' + r + ' ' + nm + ' chain=' + chain.join('>') + ' heading=' + JSON.stringify(h ? h.textContent.trim() : ''); } catch (e) { return null; } }, tag);
            const ok = await settle(); const a = await probe('boot'); if (a) console.log(g, a);
            if (ok) { await p.evaluate(() => { Input.Clear(); Input.Inject('look', true); }); await p.waitForTimeout(800); await settle(); const c = await probe('look'); if (c) console.log(g, c); }
        } catch (e) { }
        await p.close();
    }
    console.log('DONE', games.length);
    await b.close();
})();
