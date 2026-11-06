// S1 stage 1b trace: in-page patches only. GAME=Advent.z5.js CMDS="in|inventory" node .../trace1b.cjs
const path = require('path'); const { pathToFileURL } = require('url');
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const game = process.env.GAME || 'Advent.z5.js';
const cmds = (process.env.CMDS || 'inventory').split('|');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + game); await p.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) break; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(150); }
  await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const z = window.__PARCHLOCK_ZVM__; const P = Object.getPrototypeOf(z);
    const mem = ZRamProvider.getMem(); const L = StatTracker.decodeI6ActionLayout(mem);
    const tab = {}; if (L) for (let a = 0; a < L.actionCount; a++) { const r = ZRamReader.u16(mem, L.actionBase + 2 * a); (tab[r] = tab[r] || []).push(a); }
    const gbase = ZRamReader.u16(mem, 0x0C);
    const T = window.__TR = { on: false, text: '', ev: [], tab };
    const oc = P.call, or = P.ret, op = P._print;
    P.call = function (t, i, e, s) {
      if (T.on && t !== 0) {
        const ev = { k: 'E', a: t, d: this.frames.length, o: T.text.length, args: (s || []).slice(0, 4) };
        if (tab[t]) { const m = new DataView(this.m.buffer, this.m.byteOffset); ev.acts = tab[t]; ev.g = [];
          for (let g = 0; g < 240; g++) { const v = m.getUint16(gbase + 2 * g); if (tab[t].includes(v)) ev.g.push([g, v]); } }
        T.ev.push(ev);
      }
      return oc.apply(this, arguments); };
    P.ret = function (t) { if (T.on) T.ev.push({ k: 'R', d: this.frames.length, o: T.text.length }); return or.apply(this, arguments); };
    P._print = function (t) { const io = this.io; if (T.on && !(io.streams[3] && io.streams[3].length) && !io.currentwin) T.text += t; return op.apply(this, arguments); };
    return { layout: L ? { actionBase: L.actionBase, actionCount: L.actionCount, afterProps: L.afterProps, objMax: L.objMax } : null,
      inv: StatTracker.i6ProbeActionSpec('inventory'), gbase };
  });
  const out = [];
  for (const c of cmds) {
    await p.evaluate(() => { __TR.on = true; __TR.text = ''; __TR.ev = []; });
    await p.locator('.Input.LineInput').first().focus();
    await p.keyboard.type(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    for (let i = 0; i < 10 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(300); }
    out.push(await p.evaluate((c) => { __TR.on = false; return { cmd: c, text: __TR.text, ev: __TR.ev }; }, c));
  }
  require('fs').writeFileSync(path.join(__dirname, game + '.trace.json'), JSON.stringify({ game, info, out }));
  await b.close();
})();
