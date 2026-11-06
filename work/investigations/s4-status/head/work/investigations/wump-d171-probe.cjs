// D171-style probe: N fresh wump2ka sessions x T random numbered exits. Counts turns where the
// game printed "Exit N" text but no exit mark was underlined, and turns with no measured room.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url'); const path = require('path');
const N = +(process.env.N || 6), T = +(process.env.T || 25);
(async () => { const b = await chromium.launch(); let bare = 0, turns = 0, nofact = 0, empty = 0;
for (let s = 0; s < N; s++) { const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/wump2ka.z5.js'); await p.waitForTimeout(2500);
  const settle = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
  const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1400); await settle(); };
  await settle(); await send('n'); await send('take all'); await send('switch on bar');
  for (let t = 0; t < T; t++) {
    const r = await p.evaluate(() => { const lines = DarkScope.latestReplyLines(); const exitText = lines.filter(l => /^exit \d/i.test(l)).length; const marks = [...document.querySelectorAll('.pl-act')].filter(e => /^exit \d$/i.test(e.textContent.trim())).length; const lp = WorldModel.lastPayload || {}; const n = lines.filter(l => /^exit \d/i.test(l)).map(l => l.match(/^exit (\d)/i)[1]); return { exitText, marks, src: lp.probe && lp.probe.roomSource, scope: (lp.discoveredObjects || []).length, n }; });
    turns++; if (r.exitText && !r.marks) bare++; if (r.src !== 'measured-fact') nofact++; if (!r.scope) empty++;
    const pick = r.n.length ? r.n[Math.floor(Math.random() * r.n.length)] : String(1 + Math.floor(Math.random() * 3));
    await send('x' + pick);
  }
  await p.close(); }
console.log(JSON.stringify({ sessions: N, turns, roomsWithExitTextButNoMarks: bare, turnsWithoutMeasuredFact: nofact, turnsWithEmptyScope: empty }));
await b.close(); })();
