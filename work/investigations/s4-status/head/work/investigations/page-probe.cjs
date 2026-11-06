// Reusable page probe (claude, research only): plays commands on a page and prints the result of an expression file.
//   STORY=games/x.js [HTML=play.html] CMDS="a|b|c" node work/investigations/page-probe.cjs expr.js
// expr.js holds the body of a function evaluated in the page (it must `return` a JSON-serialisable value).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  // JSEED=n: Frotz/Jericho z_random parity, copied from zil-walk.js
  if (process.env.JSEED != null) await p.addInitScript((J) => { /* Frotz/Jericho z_random parity (jericho frotz/src/common/random.c): A = user seed, LCG A = 0x015a4e35*A+1, result ((A>>16)&0x7fff) % range + 1 */ let A = J >>> 0, iv = 0, ct = 0; const fr = function (t) { t = t << 16 >> 16; if (t <= 0) { const v = -t; if (v === 0) { A = J >>> 0; iv = 0; } else if (v < 1000) { ct = 0; iv = v; } else { A = v >>> 0; iv = 0; } return 0; } let r; if (iv) { r = ct++; if (ct === iv) ct = 0; } else { A = (Math.imul(0x015a4e35, A) + 1) >>> 0; r = (A >>> 16) & 0x7fff; } return r % t + 1; }; let cur; Object.defineProperty(window, '__PARCHLOCK_ZVM__', { configurable: true, get() { return cur; }, set(v) { cur = v; if (v && !v.__jr) { v.__jr = 1; v.random = fr; } } }); }, +process.env.JSEED);
  await p.goto(pathToFileURL(path.resolve(process.env.HTML || 'play.html')).href + '?story=' + process.env.STORY); await p.waitForTimeout(2000);
  let key = process.env.KEY; // KEY=3: the first character-input keypress (Border Zone chapter choice), then Space
  const toLine = async () => { for (let i = 0; i < 35; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (key && await ci.count()) { await ci.first().focus(); await p.keyboard.press(key); key = null; await p.waitForTimeout(300); continue; } await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
  await toLine();
  if (process.env.PRE) await p.evaluate(new Function(fs.readFileSync(process.env.PRE, 'utf8'))); // PRE=file: runs before the commands
  for (const c of String(process.env.CMDS || '').split('|').filter(Boolean)) { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); await toLine(); }
  const body = fs.readFileSync(process.argv[2], 'utf8');
  console.log(JSON.stringify(await p.evaluate(new Function(body)), null, 1)); await b.close();
})();
