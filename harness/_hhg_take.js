// Scratch (claude, L3): is the screwdriver's missing Take a learned refusal, and is takeable ZIL-trusted?
const { chromium } = require('playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen', 'PL_TutorialLibrarySeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Hitchhik.z5.js'); await p.waitForTimeout(4500);
  await p.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
  const ready = async () => { for (let i = 0; i < 20 && !(await p.locator('.Input.LineInput').count()); i++) { if (await p.locator('.Input.CharInput').count()) await p.keyboard.press('Space'); await p.waitForTimeout(300); } };
  const li = p.locator('.Input.LineInput');
  const probe = (label) => p.evaluate((label) => { const mem = ZRamProvider.getMem(); const q = id => { const a = ZRamReader.attrsFromObject(mem, id) || {};
      let allowed = null, disabled = null; try { allowed = AttrCalibrator.allowedVerbsFor ? AttrCalibrator.allowedVerbsFor(id) : null; } catch (e) {} try { disabled = AttrCalibrator.disabledVerbsFor ? AttrCalibrator.disabledVerbsFor(id) : null; } catch (e) {}
      return { takeable: a.takeable, static: a.static, scenery: a.scenery, allowed, disabled, cmds: Actionable.resolveObjectCommands(id, 'room').map(c => c.command) }; };
    return label + ' ' + JSON.stringify({ inform: ZRamReader.isInformCompiled(mem), declared: !!(ZRamReader.informAttributeNames(mem)), screwdriver: q(105), bedroom: q(193), wallpaper: q(102) }); }, label);
  for (const c of ['turn on light', 'get up', 'look']) { await ready(); await li.fill(c); await li.press('Enter'); await p.waitForTimeout(2000); }
  console.log(await probe('before-fumble'));
  await ready(); await li.fill('take screwdriver'); await li.press('Enter'); await p.waitForTimeout(2500);
  console.log(await probe('after-fumble'));
  await b.close(); })();
