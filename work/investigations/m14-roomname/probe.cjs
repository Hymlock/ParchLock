// M14 census probe (from regression-gate.cjs). Per game: startup, LOOK, up to 2 exits (each + LOOK).
// Records payload.roomName/roomId, ZRamReader.shortName/storyShortName and the printed heading.
//   ROOT=<tree> OUT=<f.jsonl> SHARD=i/N GLULX=1 node probe.cjs   |   node probe.cjs --diff a b
const fs = require('fs'), path = require('path');
if (process.argv[2] === '--diff') {
    const rd = f => Object.fromEntries(fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean).map(r => [r.game, r]));
    const a = rd(process.argv[3]), b = rd(process.argv[4]); let n = 0;
    for (const g of Object.keys(a).sort()) { const x = a[g].steps || [], y = (b[g] || {}).steps || [];
        for (let i = 0; i < Math.max(x.length, y.length); i++) { const p = x[i] || {}, q = y[i] || {};
            if (p.roomName !== q.roomName) { n++; console.log([g, i, q.roomId, JSON.stringify(p.roomName), JSON.stringify(q.roomName), JSON.stringify(q.story), JSON.stringify(q.heading)].join('\t')); } } }
    console.log('# ' + Object.keys(a).length + ' games, ' + n + ' roomName differences'); process.exit(0);
}
const ROOT = path.resolve(process.env.ROOT || '.');
const { chromium } = require(ROOT + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const games = fs.readdirSync(ROOT + '/games').filter(f => f.endsWith('.js') && (process.env.GLULX || !/\.(ulx|gblorb)\.js$/i.test(f))).sort()
    .filter(f => !process.env.GAMES || process.env.GAMES.split(',').includes(f))
    .filter((f, idx) => { const m = /^(\d+)\/(\d+)$/.exec(process.env.SHARD || ''); return !m || idx % +m[2] === +m[1]; });
const out = fs.createWriteStream(process.env.OUT || 'm14.jsonl');
(async () => {
    const b = await chromium.launch();
    for (const g of games) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
        await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
        await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
        const row = { game: g, steps: [] };
        try {
            await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/' + g); await p.waitForTimeout(2000);
            const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
            const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await settle(); };
            const snap = tag => p.evaluate(tag => { const P = WorldModel.lastPayload || {}; const r = { tag, roomName: P.roomName, roomId: P.roomId };
                try { const m = ZRamProvider.getMem(); r.short = ZRamReader.shortName(m, Number(P.roomId)); r.story = ZRamReader.storyShortName ? ZRamReader.storyShortName(m, Number(P.roomId)) : null; } catch (e) { r.zerr = String(e.message).slice(0, 60); }
                try { const t = String((Actionable.Scope || {}).lastLookText || ''); r.heading = (t.split('\n').map(s => s.trim()).filter(Boolean)[0] || '').slice(0, 80); } catch (e) {}
                return r; }, tag);
            if (await settle()) {
                row.steps.push(await snap('start'));
                await cmd('look'); row.steps.push(await snap('look'));
                const ex = await p.evaluate(() => ((WorldModel.lastPayload || {}).exits || []).map(e => e.command || e.label).filter(Boolean).slice(0, 2));
                for (const e of ex) { await cmd(e); await cmd('look'); row.steps.push(await snap(e)); }
            } else row.error = 'no-prompt';
        } catch (e) { row.error = String(e.message).slice(0, 120); }
        out.write(JSON.stringify(row) + '\n'); await p.close();
    }
    out.end(); await b.close();
})();
