// Native walkthrough replay with attribute-bit diffs around chosen steps (no insert_obj, no forcing).
//   node walkdiff.cjs <story.js> <walkthroughKey> <lastStep> <diffSteps comma>
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const W = require(path.resolve('work/investigations/2026-10-11-jericho-walkthroughs.json'));
(async () => {
  const [story, key, last, diffs] = process.argv.slice(2); const steps = (W[key].steps || W[key]).map(x => typeof x === 'string' ? x : (x.cmd || x.command));
  const D = new Set(diffs.split(',').map(Number));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.addInitScript(() => { let s = 1; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
    sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  // Frotz/Jericho z_random parity (same shim and seed table as zil-at-step.cjs) so recorded walkthroughs stay in sync.
  const JS = { zork1: 12, hhgg: 4, cutthroat: 10, spellbrkr: 1 }[key] || +(process.env.JSEED || 0);
  await p.addInitScript((J) => { let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); }, JS);
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + story); await p.waitForTimeout(3000);
  const ready = async () => { for (let i = 0; i < 40; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(150); } return false; };
  const snap = () => p.evaluate(() => { const m = ZRamProvider.getMem(), R = ZRamReader, out = {}; for (let id = 1; id < 260; id++) { let L; try { L = R.objectLinks(m, id); } catch (e) { break; } if (!L || !L.attrBytes) break; const bits = []; for (let b = 0; b < 32; b++) if (L.attrBytes[b >> 3] & (0x80 >> (b & 7))) bits.push(b); out[id] = { n: R.shortName(m, id) || '', bits, parent: L.parent }; } return out; });
  await ready();
  const extra = (process.env.EXTRA || '').split('|').filter(Boolean);
  extra.forEach((c, j) => { steps[+last + 1 + j] = c; D.add(+last + 1 + j); });
  for (let i = 0; i <= +last + extra.length; i++) {
    const before = D.has(i) ? await snap() : null;
    await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, steps[i]); await p.waitForTimeout(700); await ready();
    if (before) {
      const after = await snap(); const reply = await p.evaluate(() => [...document.querySelectorAll('.BufferLine')].slice(-6).map(l => l.textContent.trim()).filter(Boolean).join(' / '));
      const ch = []; for (const id of Object.keys(after)) { const a = new Set(before[id] ? before[id].bits : []), z = new Set(after[id].bits);
        const set = [...z].filter(x => !a.has(x)), clr = [...a].filter(x => !z.has(x)); if (set.length || clr.length) ch.push(id + ':' + after[id].n + ' +' + set + ' -' + clr); }
      console.log('STEP ' + i + ' "' + steps[i] + '" -> ' + reply.slice(0, 200) + '\n   changed: ' + ch.join(' ; '));
    }
  }
  await b.close();
})();
