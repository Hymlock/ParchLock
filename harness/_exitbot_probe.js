// Scratch (claude): bottom exit banner vs input controls, HEAD css vs working css.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
 for (const which of ['head','work']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  if (which === 'head') await p.route(/ParchLock\.css/, r => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(process.env.HEADCSS, 'utf8') }));
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen','PL_TutorialLibrarySeen']) localStorage.setItem(k,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'work/investigations/beautify-shots/exitbot-' + which + '.png' });
  console.log(which, JSON.stringify(await p.evaluate(() => { const r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    return { exits: Array.from(document.querySelectorAll('#exits .exit')).filter(e => e.offsetParent && e.textContent.trim()).map(e => [e.parentElement.className, e.textContent.trim().slice(0, 20), r(e)]), input: r(document.querySelector('.Input.LineInput')), mic: r(document.getElementById('pl-input-mic')) }; })));
  await p.close(); }
 await b.close(); })();
