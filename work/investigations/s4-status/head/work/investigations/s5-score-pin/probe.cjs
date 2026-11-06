// S5 probe: GAME=x CMDS="a|b|c" node work/investigations/s5-score-pin/probe.cjs
const path = require('path');
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.env.GAME); await p.waitForTimeout(2000);
  const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
  await settle();
  const snap = () => p.evaluate(() => { const m = StatTracker.model(); const s = m.stats.score || {}; let vis; try { vis = StatTracker.visibleStats().map(x => x.key + '=' + x.value).join(','); } catch (e) { vis = 'ERR'; }
    const buf = (document.querySelector('.BufferWindow') || document.body).innerText; return { score: s.value, conf: s.confirmed, src: s.source, pinKnown: m.scorePinKnown, globals: JSON.stringify(m.globals && m.globals.score || null), vis, status: StatTracker.statusText().replace(/\s+/g, ' ').trim(), tail: buf.slice(-260).replace(/\s+/g, ' ') }; });
  for (const c of process.env.CMDS.split('|')) { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1500); await settle(); console.log('> ' + c + '  ' + JSON.stringify(await snap())); }
  await b.close();
})();
