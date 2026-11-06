// HERE/location-global finder for a ZIL v5 title (grok2 research): replay the Jericho walkthrough and list the globals whose
// value is always on the fixed player's containment chain and changes when the room changes.
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '../..'); const W = require('./2026-10-11-jericho-walkthroughs.json');
const KEY = process.env.KEY || 'hhgg', GAME = process.env.GAME || 'Hitchhik.z5.js', PLAYER = +(process.env.PLAYER || 202), N = +(process.env.N || 60);
const settle = async p => { for (let i = 0; i < 14 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press(i % 3 === 2 ? '1' : i % 3 === 1 ? 'Enter' : 'Space'); } await p.waitForTimeout(300); } };
(async () => { const b = await chromium.launch({ headless: true }); const p = await b.newPage();
  try { await p.addInitScript(() => { let seed = 12345; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }; sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
    await p.goto(pathToFileURL(path.join(root, 'play.html')).href + '?story=games/' + GAME); await p.waitForTimeout(3500); await settle(p);
    console.log('BOOT', JSON.stringify(await p.evaluate(() => { const m = ZRamProvider.getMem(); const u16 = a => (m.getUint8(a) << 8) | m.getUint8(a + 1); const g = u16(12); return { G0: u16(g), G41: u16(g + 82), G116: u16(g + 232), payload: (window.WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.room) || null }; })));
    const seq = W[KEY].filter(c => !/^WAIT/.test(c) || c === 'WAIT'); const cand = {}; let steps = 0; const tops = new Set();
    for (let i = 0; i < Math.min(seq.length, N); i++) { if (!await p.locator('.Input.LineInput').count()) { console.log('no input at', i); break; }
      await p.locator('.Input.LineInput').fill(seq[i]); await p.keyboard.press('Enter'); await p.waitForTimeout(450); await settle(p);
      const r = await p.evaluate(P => { const m = ZRamProvider.getMem(); const u8 = a => m.getUint8(a), u16 = a => (u8(a) << 8) | u8(a + 1); const v = u8(0), ob = u16(10) + (v <= 3 ? 62 : 126), es = v <= 3 ? 9 : 14, g = u16(12);
        const par = id => v <= 3 ? u8(ob + (id - 1) * es + 4) : u16(ob + (id - 1) * es + 6); const chain = []; let x = P; for (let k = 0; k < 10 && x; k++) { chain.push(x); x = par(x); }
        const gl = []; for (let i = 0; i < 240; i++) gl.push(u16(g + 2 * i)); return { chain, gl }; }, PLAYER);
      steps++; const anc = new Set(r.chain.slice(1)); const top = r.chain[r.chain.length - 2]; tops.add(top);
      for (let gi = 0; gi < 240; gi++) { const v = r.gl[gi]; const c = cand[gi] = cand[gi] || { hit: 0, top: 0, vals: new Set() }; if (anc.has(v)) c.hit++; if (v === top) c.top++; c.vals.add(v); }
      if (i < 14) console.log(seq[i], JSON.stringify(r.chain)); }
    console.log('steps', steps, 'distinct rooms', tops.size, 'globals always on chain:', Object.entries(cand).filter(([, c]) => c.hit === steps).map(([g, c]) => 'G' + g + ' top' + c.top + ' distinct' + c.vals.size).join(' | '));
  } catch (e) { console.log('ERR', e.message); } finally { await b.close(); } })();
