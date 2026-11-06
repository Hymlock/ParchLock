// grok read-only probe (no js change): Sorcerer DarkScope after FROTZ in the bed. node <this file>
const path = require('path'); process.chdir(path.resolve(__dirname, '../../../../..'));
const { chromium } = require(path.resolve('node_modules/playwright')); const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/Sorcerer.z3.js'); await p.waitForTimeout(2500);
  const toLine = async () => { for (let i = 0; i < 30; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return; const ci = p.locator('.Input.CharInput'); if (await ci.count()) await ci.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200); } };
  const state = () => p.evaluate(() => { WorldModel.tick(); const pl = WorldModel.lastPayload || {}; let chain = null; try { chain = DarkScope.chainBelowRoom(pl.playerId, pl.roomId); } catch (e) {} let par = null; try { par = ZRamReader.objectLinks(ZRamProvider.getMem(), Number(pl.playerId)).parent; } catch (e) {}
    return { dark: DarkScope.dark, cls: document.documentElement.classList.contains('pl-dark-scope'), room: pl.roomName, roomId: pl.roomId, player: pl.playerId, playerParent: par, chain, darkEvidence: pl.darkEvidence, probeSrc: pl.probe && pl.probe.roomSource, measuredDark: pl.probe && pl.probe.measuredDark, reply: DarkScope.latestReplyLines().slice(0, 4) }; });
  const send = async c => { await p.evaluate(c => { Input.Clear(); Input.Inject(c, true); }, c); await p.waitForTimeout(1300); await toLine(); return state(); };
  await toLine(); const out = [{ cmd: '(start)', ...(await state()) }];
  for (const c of ['wait', 'frotz book', 'look', 'get up', 'look']) out.push({ cmd: c, ...(await send(c)) });
  console.log(JSON.stringify(out, null, 1)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });