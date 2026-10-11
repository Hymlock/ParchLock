// R2.3b live PRSO proof (read-only research). After "examine <visible object>", the inferred PRSO global must hold that object.
const fs = require('fs'), path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const M = JSON.parse(fs.readFileSync('work/investigations/2026-10-11-zil-matrix.json', 'utf8'));
(async () => { const b = await chromium.launch(); const out = {};
  for (const g of M.order) { const r = M.rows[g]; if (!r.prso) { out[g] = { status: 'no inferred PRSO' }; continue; }
    const p = await b.newPage({ viewport: { width: 390, height: 850 } });
    await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
    try {
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(2500);
      const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
      const cmd = async t => { await p.locator('.Input.LineInput').fill(t); await p.locator('.Input.LineInput').press('Enter'); await p.waitForTimeout(1300); await settle(); };
      await settle(); await cmd('look');
      const target = await p.evaluate(() => { WorldModel.tick(); const P = WorldModel.lastPayload || {}; const o = (P.discoveredObjects || []).concat(P.inventory || []).find(x => x && x.name && /^[a-z][a-z ]+$/i.test(x.name)); return o ? { id: o.id, name: o.name } : null; });
      if (!target) { out[g] = { status: 'no visible named object at start' }; await p.close(); continue; }
      const word = target.name.split(' ').pop();
      await cmd('examine ' + word);
      const vnum = +r.prso.slice(3), vi = r.prsi ? +r.prsi.slice(3) : null;
      const res = await p.evaluate(([vnum, vi]) => { const D = ZRamProvider.getMem(); const m = new Proxy({}, { get: (_, k) => D.getUint8(+k) }); const gt = (m[0x0C] << 8) | m[0x0D]; const gv = n => { const a = gt + 2 * (n - 16); return (m[a] << 8) | m[a + 1]; }; return { prso: gv(vnum), prsi: vi ? gv(vi) : null }; }, [vnum, vi]);
      out[g] = { status: res.prso === target.id ? 'PRSO PROVEN' : 'PRSO MISMATCH', var: r.prso, target, read: res };
    } catch (e) { out[g] = { status: 'error ' + e.message.slice(0, 80) }; }
    await p.close(); console.log(g, JSON.stringify(out[g]));
  }
  fs.writeFileSync('work/investigations/2026-10-11-zil-prso-live.json', JSON.stringify(out, null, 1)); await b.close(); })();

