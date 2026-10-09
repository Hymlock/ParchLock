// Scratch (claude, death research): what does the live ZVM expose; do globals change on an ordinary turn?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + (process.argv[2] || 'zork1.z3.js')); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  console.log(JSON.stringify(await p.evaluate(() => { const z = window.__PARCHLOCK_ZVM__; if (!z) return 'no zvm'; return Object.keys(z).map(k => k + ':' + (Array.isArray(z[k]) ? 'array' + z[k].length : typeof z[k])).join(' '); })));
  const g = () => p.evaluate(() => { const mem = ZRamProvider.getMem(); const gb = mem.getUint16(0x0C); return Array.from({ length: 240 }, (_, i) => mem.getUint16(gb + i * 2)); });
  const a = await g(); const li = p.locator('.Input.LineInput'); await li.fill('wait'); await li.press('Enter'); await p.waitForTimeout(1500); const c = await g();
  console.log('changed on wait:', a.map((v, i) => v !== c[i] ? i + ':' + v + '>' + c[i] : null).filter(Boolean).join(' '));
  console.log(JSON.stringify(await p.evaluate(() => { const z = window.__PARCHLOCK_ZVM__; const out = {}; for (const k of ['pc', 'frames', 'call_stack', 'stack', 'frame', 'callstack', 'sp', 'fp']) if (k in z) { const v = z[k]; out[k] = Array.isArray(v) ? 'len' + v.length + ' ' + JSON.stringify(v.slice(-3)).slice(0, 300) : (typeof v === 'object' && v ? Object.keys(v).slice(0, 10).join(',') : v); } return out; })));
  await b.close(); })();
