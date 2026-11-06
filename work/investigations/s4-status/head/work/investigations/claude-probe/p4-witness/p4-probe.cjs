// P4 native probe (claude, 2026-10-30): The Witness, original story, seed parity with g1-batch (JSEED 0).
// Usage (from main repo): PROOT=<clean worktree> node p4-probe.cjs out.json "cmd1" "cmd2" ...
// Records per command: transcript delta, HERE (global 0), player 79 parent, radio 162 parent chain, and 162 attr bytes.
const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
(async () => {
  const [out, ...cmds] = process.argv.slice(2);
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { let A = 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve(process.env.PROOT || '.', 'play.html')).href + '?story=games/TheWitness.z3.js'); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  const text = () => p.evaluate(() => document.querySelector('#windowport').innerText);
  const state = () => p.evaluate(() => { const m = ZRamProvider.getMem(), L = id => ZRamReader.objectLinks(m, id), nm = id => { try { return ZRamReader.shortName(m, id); } catch (e) { return ''; } };
    const chain = []; let a = L(162).parent, d = 0; while (a && d++ < 8) { chain.push([a, nm(a)]); a = L(a).parent; }
    const here = m.getUint16(m.getUint16(0x0c)); return { here: [here, nm(here)], player79Parent: [L(79).parent, nm(L(79).parent)], radio162: nm(162), radioChain: chain, radioAttrBytes: L(162).attrBytes.map(x => x.toString(16).padStart(2, '0')).join('') }; });
  await settle(); const log = []; let prev = (await text()).length;
  for (const c of cmds) { if (!await p.locator('.Input.LineInput').count()) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); await settle(); }
    await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(600); await settle();
    const t = await text(); log.push({ cmd: c, response: t.slice(prev).trim(), state: await state() }); prev = t.length; }
  fs.writeFileSync(out, JSON.stringify({ story: 'TheWitness.z3.js', seed: 0, probe: 'p4-probe.cjs', log }, null, 1));
  for (const e of log) console.log('> ' + e.cmd + '\n' + e.response.slice(-400) + '\n  ' + JSON.stringify(e.state));
  await b.close();
})();
