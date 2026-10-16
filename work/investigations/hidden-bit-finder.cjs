// Native inventory omission bit finder (claude, 2026-10-16). Per game: boot, `take all`, `i` (messages closed, no
// relocation). Records the VM test_attr calls made during the `i` turn, the app's held objects (EquipmentUI) and the
// native reply. A candidate inventoryHiddenAttribute is a bit the game's own `i` tested TRUE on every held object it
// omitted and FALSE on every held object it printed (>=1 of each required; >=2 omitted for a strong candidate).
// Research only; facts are written by hand after review.   node work/investigations/hidden-bit-finder.cjs a.z5.js b.z8.js
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const OUT = path.join(__dirname, '2026-10-16-hidden-bit-finder.json'); const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
(async () => { const b = await chromium.launch();
  for (const g of process.argv.slice(2)) { const p = await b.newPage(); const rec = out[g] = {};
    try {
      await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
      await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + g); await p.waitForTimeout(3000);
      const settle = async () => { for (let i = 0; i < 15 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
      const cmd = async (c, recOps) => { await settle(); await p.evaluate(r => { try { if (Message.IsOpen) Message.Hide(); } catch (e) {} window.__rec = r; if (r) window.__ops = []; }, recOps ? 1 : 0); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(800); await settle(); await p.evaluate(() => { window.__rec = 0; }); };
      await settle();
      await p.evaluate(() => { const M = window.__PARCHLOCK_ZVM__; const o = M.test_attr; window.__ops = []; M.test_attr = function () { const g = Array.from(arguments), r = o.apply(this, g); if (window.__rec) window.__ops.push([g[0], g[1], r ? 1 : 0]); return r; }; });
      await cmd('take all', 0); await cmd('i', 1);
      Object.assign(rec, await p.evaluate(() => {
        const L = [...document.querySelectorAll('#windowport .BufferWindow .BufferLine')]; let last = -1; for (let q = L.length - 1; q >= 0; q--) if (L[q].querySelector('.Style_input')) { last = q; break; }
        WorldModel.tick(); const m = ZRamProvider.getMem();
        const held = EquipmentUI.model().items.map(o => ({ id: o.id, name: ZRamReader.shortName(m, o.id) || o.name, parent: o.parentId }));
        return { nativeI: L.slice(last + 1).map(l => l.textContent).join('\n').slice(0, 1200), held, ops: window.__ops }; }));
      const T = norm(rec.nativeI); rec.held.forEach(h => { const n = norm(h.name).replace(/^(your|the|a|an|some) /, ''); h.printed = !!n && T.includes(n); });
      const om = rec.held.filter(h => !h.printed).map(h => h.id), pr = rec.held.filter(h => h.printed).map(h => h.id);
      const by = {}; rec.ops.forEach(([o, bit, r]) => { (by[bit] = by[bit] || {})[o] = r; });
      rec.omitted = om; rec.printedIds = pr;
      rec.candidates = Object.keys(by).filter(bit => om.length && pr.length && om.every(id => by[bit][id] === 1) && pr.every(id => by[bit][id] === 0)).map(Number);
    } catch (e) { rec.err = String(e.message || e).slice(0, 160); } finally { await p.close(); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
    console.log(g.padEnd(30), rec.err || '', 'omitted', JSON.stringify((rec.held || []).filter(h => !h.printed).map(h => h.id + ':' + h.name)).slice(0, 120), 'printed', (rec.printedIds || []).length, 'candidates', JSON.stringify(rec.candidates)); }
  await b.close(); })();
