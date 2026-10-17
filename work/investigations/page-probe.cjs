// Reusable page probe (claude, research only): plays commands on a page and prints the result of an expression file.
//   STORY=games/x.js [HTML=play.html] CMDS="a|b|c" node work/investigations/page-probe.cjs expr.js
// expr.js holds the body of a function evaluated in the page (it must `return` a JSON-serialisable value).
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve(process.env.HTML || 'play.html')).href + '?story=' + process.env.STORY); await p.waitForTimeout(2000);
  const toLine = async () => { for (let i = 0; i < 35; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; await p.keyboard.press('Space'); await p.waitForTimeout(150); } };
  await toLine();
  for (const c of String(process.env.CMDS || '').split('|').filter(Boolean)) { await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); await toLine(); }
  const body = fs.readFileSync(process.argv[2], 'utf8');
  console.log(JSON.stringify(await p.evaluate(new Function(body)), null, 1)); await b.close();
})();
