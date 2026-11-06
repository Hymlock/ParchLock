// S6 repro: Make It Good, SCORE then first Equipment check. Run from repo root.
const path = require('path'); const fs = require('fs');
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const OUT = path.join(process.cwd(), 'work/investigations/s6-makeitgood');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text()));
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/MakeItGood.zblorb.js'); await p.waitForTimeout(2500);
  const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
  const cmd = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); await settle(); };
  const snap = async label => p.evaluate(label => { const m = StatTracker.model(); return { label, fulfillment: m.fulfillment, reason: m.unavailableReason, scoreUnavailable: m.scoreUnavailable, probed: m.probed, stats: Object.keys(m.stats||{}), diag: StatTracker._fulfillDiag.slice(), queue: (StatTracker._probeQueue||[]).map(q=>q.verb), active: StatTracker._probeActive && StatTracker._probeActive.verb, hideCarry: !!StatTracker._hideCarryProbe, hint: [...document.querySelectorAll('.pl-stat-hint')].map(h => h.textContent + (h.title ? ' [title:' + h.title + ']' : '')), msgOpen: typeof Message!=='undefined' && Message.IsOpen, msg: (document.querySelector('#pl-message, .pl-message')||{}).textContent, tail: [...document.querySelectorAll('.BufferLine')].slice(-12).map(l => l.textContent) }; }, label);
  const res = [];
  console.log('settled', await settle());
  res.push(await snap('start'));
  await cmd('score'); res.push(await snap('after SCORE'));
  // Hook finishProbe to log where unavailable comes from
  await p.evaluate(() => { const f = StatTracker.finishProbe; window.__fp = []; StatTracker.finishProbe = function (s) { window.__fp.push({ s, active: StatTracker._probeActive && StatTracker._probeActive.verb, turns: StatTracker._probeTurns, stack: new Error().stack.split('\n').slice(2,5).join(' | ') }); return f.apply(this, arguments); }; });
  await p.evaluate(() => EquipmentUI.Toggle()); await p.waitForTimeout(800);
  res.push(await snap('equipment opened (warning?)'));
  await p.evaluate(() => { try { Message.Hide(); } catch (e) {} }); await p.waitForTimeout(8000);
  res.push(await snap('after warning dismissed +8s'));
  res.push({ finishProbeCalls: await p.evaluate(() => window.__fp) });
  await p.screenshot({ path: path.join(OUT, 'equipment.png') });
  fs.writeFileSync(path.join(OUT, 'repro-result.json'), JSON.stringify({ res, logs: logs.slice(-60) }, null, 1));
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
