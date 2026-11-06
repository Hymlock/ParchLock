// Radial/underline latency probe (operator slowdown report 2026-10-18).
// Plays identity.z5.js under 4x CPU throttle; every action goes through Actionable.Submit (the
// underline/wheel path, not typed input) and is timed until line input is back and the main thread idles.
// Usage: node harness/radial-latency.js [N=40]   (ROOT=<tree> to test another checkout)
const path = require('path'); const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const ROOT = process.env.ROOT || '.'; const N = +process.argv[2] || 40;
const CMDS = ['look', 'inventory', 'examine me', 'look', 'north', 'south', 'east', 'west', 'look', 'inventory'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(ROOT, 'play.html')).href + '?story=games/identity.z5.js'); await p.waitForTimeout(3000);
  for (let i = 0; i < 30 && !(await p.locator('.Input.LineInput').count()); i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); await p.keyboard.press('Space'); await p.waitForTimeout(200); }
  const times = [];
  for (let i = 0; i < N; i++) {
    // Prefer a command the app itself offers for a live underline; fall back to the fixed list.
    const c = await p.evaluate((fb) => { try { const m = [...document.querySelectorAll('.pl-act:not(.is-stale)')].pop(); if (m && m.dataset.objectId) { const cs = Actionable.resolveObjectCommands(m.dataset.objectId, 'object').map(x => x.command).filter(x => /^(examine|x|look at) /.test(x)); if (cs.length) return cs[0]; } } catch (e) {} return fb; }, CMDS[i % CMDS.length]);
    const t0 = Date.now();
    const r = await p.evaluate((cmd) => { for (let j = 0; j < 5 && Message.IsOpen; j++) try { Message.Hide(); } catch (e) {} return 1; }, c) && await p.evaluate((cmd) => [Actionable.Submit(cmd, 'radial'), Message.IsOpen, !!document.querySelector('#dialog'), $('.Input.LineInput:visible').length], c); if (i === 0) console.log('submit', JSON.stringify(r));
    await p.waitForTimeout(30);
    for (let k = 0; k < 600; k++) { if (await p.locator('.Input.LineInput').count()) { await p.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))); break; } await p.waitForTimeout(20); }
    times.push(Date.now() - t0);
  }
  console.log(await p.evaluate(() => [...document.querySelectorAll(".BufferLine")].slice(-6).map(l => l.textContent.slice(0, 90)).join(" | ") + " lines=" + document.querySelectorAll(".BufferLine").length));
  const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.floor(f * (a.length - 1))];
  const first = times.slice(0, 10), last = times.slice(-10);
  console.log('per-action ms:', times.join(' '));
  console.log('first10 median', q(first, .5), ' last10 median', q(last, .5), ' max', Math.max(...times));
  await b.close();
})();
