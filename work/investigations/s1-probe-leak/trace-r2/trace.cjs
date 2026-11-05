// S1 R2 feasibility trace: in-page monkey-patch of ZVM call/ret/_print (no js/ edits).
//   GAME=anchor.z8.js CMDS="inventory" node work/investigations/s1-probe-leak/trace-r2/trace.cjs
const path = require('path'); const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const game = process.env.GAME || 'anchor.z8.js';
const cmds = (process.env.CMDS || 'inventory').split('|');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    const z = window.__PARCHLOCK_ZVM__; const P = Object.getPrototypeOf(z);
    const T = window.__TR = { on: false, text: '', ev: [] };
    const oc = P.call, or = P.ret, op = P._print;
    P.call = function (t, i, e, s) { if (T.on && t !== 0) T.ev.push({ k: 'E', a: t, d: this.frames.length, o: T.text.length, args: (s || []).slice(0, 4) }); return oc.apply(this, arguments); };
    P.ret = function (t) { if (T.on) T.ev.push({ k: 'R', d: this.frames.length, o: T.text.length, v: t }); return or.apply(this, arguments); };
    P._print = function (t) { if (T.on && !this.io.streams[3].length) T.text += t; return op.apply(this, arguments); };
  });
  const out = [];
  for (const c of cmds) {
    await p.evaluate(() => { __TR.on = true; __TR.text = ''; __TR.ev = []; });
    await p.locator('.Input.LineInput').first().focus();
    await p.keyboard.type(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    for (let i = 0; i < 10 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
    out.push(await p.evaluate((c) => { __TR.on = false; return { cmd: c, text: __TR.text, ev: __TR.ev }; }, c));
  }
  // memory for static lookup
  const mem = await p.evaluate(() => Array.from(new Uint8Array(window.__PARCHLOCK_ZVM__.m.buffer, window.__PARCHLOCK_ZVM__.m.byteOffset, Math.min(window.__PARCHLOCK_ZVM__.m.byteLength, 0x10000 * 8))));
  require('fs').writeFileSync(path.join(__dirname, game + '.trace.json'), JSON.stringify({ game, out }));
  require('fs').writeFileSync(path.join(__dirname, game + '.mem.bin'), Buffer.from(mem));
  await b.close();
})();
