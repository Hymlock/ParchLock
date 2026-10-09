// Scratch (claude, blind visual review): Equipment screen screenshots at 3 widths x 2 themes (Anchorhead, real items).
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch();
  for (const [w, h] of (process.env.SIZES ? JSON.parse(process.env.SIZES) : [[1280, 800], [390, 844], [320, 640]])) for (const light of [false, true]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
    await p.addInitScript((lt) => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); }, light);
    await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/anchor.z8.js'); await p.waitForTimeout(4500);
    await p.evaluate((lt) => { if (Message.IsOpen) Message.Hide(); try { localStorage.setItem(ModuleLibrary.inventoryWarningKey(ParchLock.StoryPath || ParchLock.GameFilename), '1'); } catch (e) {} document.body.classList.toggle('light', lt); }, light);
    for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(250); }
    const li = p.locator('.Input.LineInput'); for (const c of ['southeast', 'open umbrella']) { await li.fill(c); await li.press('Enter'); await p.waitForTimeout(1500); }
    await p.evaluate(() => EquipmentUI.Show()); await p.waitForTimeout(6000);
    const tag = w + (light ? '-light' : '-dark');
    await p.screenshot({ path: 'work/investigations/beautify-shots/' + (process.env.PFX||'equip') + '-' + tag + '.png' });
    const opt = p.locator('#equipment details, #equipment .equip-options, #equipment summary').first();
    if (await opt.count()) { await opt.click().catch(() => {}); await p.waitForTimeout(500); await p.screenshot({ path: 'work/investigations/beautify-shots/' + (process.env.PFX||'equip') + '-' + tag + '-options.png' }); }
    console.log(tag, JSON.stringify(await p.evaluate(() => ({ overflowX: document.documentElement.scrollWidth > window.innerWidth + 1, equipW: (document.getElementById('equipment') || {}).clientWidth }))));
    await p.close(); }
  await b.close(); })();
