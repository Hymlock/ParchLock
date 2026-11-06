// Boot-only census: v3 global0 vs the status-line room text.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
(async () => {
    const b = await chromium.launch();
    const files = fs.readdirSync('games').filter(f => /\.z3\.js$/.test(f));
    for (const f of files) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
        await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
        try {
            await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + f, { timeout: 30000 }); await p.waitForTimeout(2500);
            for (let i = 0; i < 20; i++) { if (await p.locator('.Input.LineInput').count()) break; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
            const r = await p.evaluate(() => { const m = ZRamProvider.getMem(); const dv = new DataView(m.buffer || m, m.byteOffset || 0); const g0 = dv.getUint16(dv.getUint16(0x0c));
                let nm = ''; try { nm = ZRamReader.shortName(m, g0); } catch (e) {}
                const grid = document.querySelector('.GridWindow'); const st = grid ? [...grid.querySelectorAll('.GridLine')].map(l => l.textContent).join(' ').replace(/\s+/g, ' ').trim() : '';
                const pl = WorldModel.lastPayload || {};
                return { g0, nm, status: st.slice(0, 70), payload: pl.roomId, payloadName: pl.roomName };
            });
            const statusHas = r.nm && r.status.toLowerCase().includes(r.nm.toLowerCase());
            console.log((statusHas ? 'AGREE   ' : 'DIFFER  ') + f.padEnd(40) + ' g0=' + r.g0 + ':' + r.nm + ' | status="' + r.status + '" | payload=' + r.payload + ':' + r.payloadName);
        } catch (e) { console.log('ERROR   ' + f + ' ' + e.message.slice(0, 80)); }
        await p.close();
    }
    await b.close();
})();
