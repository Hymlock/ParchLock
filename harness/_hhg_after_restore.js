const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => { const [pkg] = process.argv.slice(2); const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Hitchhik.z5.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); }
  const li = p.locator('.Input.LineInput');
  await p.evaluate(t => ParchLockQol.ImportPackageData(t), fs.readFileSync(pkg, 'utf8')); await p.waitForTimeout(400); await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  await li.fill('restore'); await li.press('Enter'); await p.waitForSelector('#dialog_select'); await p.locator('#dialog_select').selectOption({ index: 0 }); await p.locator('#dialog_accept').click(); await p.waitForTimeout(3500);
  console.log(JSON.stringify(await p.evaluate(() => ({ line: document.querySelectorAll('.Input.LineInput').length, char: document.querySelectorAll('.Input.CharInput').length, lines: Array.from(document.querySelectorAll('.BufferWindow .BufferLine')).slice(-8).map(l => (l.querySelector('.Style_input') ? '[IN]' : '') + l.textContent.trim().slice(0, 60)) }))));
  await b.close(); })();
