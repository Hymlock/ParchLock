// Enchanter second OPENBIT object (rule check 19:16): JUG (globals.zil, IN SHACK, CONTBIT OPENBIT, source pin 472c3b9).
// Fresh game, native route NE/IN, no relocation/forcing; native CLOSE JUG must clear bit 12 and OPEN JUG set it, hooked in the CLOSE/OPEN routines.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const { pathToFileURL } = require('url'); const { analyze } = require('../work/investigations/zil-attr-analyzer.js');
const a = analyze('Enchanter.z3.js'); const ro = a.routineAddr(a.byVerb['open/1']), rc = a.routineAddr(a.byVerb['close/1']);
(async () => { const b = await chromium.launch({ headless: true }); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Enchanter.z3.js'); await p.waitForTimeout(4000);
  await p.evaluate(({ ro, rc }) => { const M = window.__PARCHLOCK_ZVM__; window.__ops = []; window.__fr = []; const oc = M.call, oret = M.ret;
    M.call = function (x) { const ad = x * this.addr_multipler, r = oc.apply(this, arguments); if (ad === ro || ad === rc) window.__fr.push(this.frames.length); return r; };
    M.ret = function () { const r = oret.apply(this, arguments); while (window.__fr.length && window.__fr[window.__fr.length - 1] > this.frames.length) window.__fr.pop(); return r; };
    for (const op of ['test_attr', 'set_attr', 'clear_attr']) { const n = M[op]; M[op] = function () { const g = Array.from(arguments), r = n.apply(this, g); if (window.__fr.length) window.__ops.push(op + ':' + g[0] + ':' + g[1] + (op === 'test_attr' ? '=' + !!r : '')); return r; }; } }, { ro, rc });
  const jug = await p.evaluate(() => { const m = ZRamProvider.getMem(); for (let i = 1; i < 255; i++) if (ZRamReader.shortName(m, i) === 'jug') return i; });
  const bit = () => p.evaluate(j => { const L = ZRamReader.objectLinks(ZRamProvider.getMem(), j); return !!(L.attrBytes[1] & (128 >> 4)); }, jug);
  const res = { jug, steps: [] };
  for (const c of ['ne', 'in', 'close jug', 'open jug', 'close jug', 'open jug']) { await p.evaluate(() => { window.__ops = []; }); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1000);
    res.steps.push({ c, bit12: await bit(), ops: await p.evaluate(j => window.__ops.filter(o => o.split(':')[1] == j), jug), reply: await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].slice(-3).map(l => l.textContent).join(' ').replace(/\s+/g, ' ').slice(0, 90)) }); }
  console.log(JSON.stringify(res, null, 1)); fs.writeFileSync('work/investigations/2026-10-11-enchanter-jug-open.json', JSON.stringify(res, null, 1)); await b.close(); })();

