// Plays a route, then dumps PROFILE bitFor + per-object attrs and radial commands (claude P1, 2026-10-31).
const { chromium } = require('C:/Users/hymlo/Downloads/Projects/Parchmap-main/Parchmap-main/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('C:/Users/hymlo/Downloads/Projects/Parchmap-main/Parchmap-main/play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { await p.evaluate(() => { try { if (Message.IsOpen) Message.Hide(); } catch (e) {} }); const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  const dump = async (tag) => console.log(tag, JSON.stringify(await p.evaluate(() => { WorldModel.tick(); return (Actionable.payloadPool() || []).map(o => { const a = o.attrs || o.attributes || {}; let c = []; try { c = Actionable.resolveObjectCommands(o.id, 'object').map(x => x.command); } catch (e) {} return { id: o.id, name: o.name, attrs: Object.keys(a).filter(k => a[k] === true), cmds: c }; }); })));
  await settle();
  console.log('BITFOR', JSON.stringify(await p.evaluate(() => { const r = {}; for (const f of ['animate','clothing','concealed','container','door','light','on','open','openable','scenery','static','supporter','switchable','transparent','worn','lockable','locked']) r[f] = AttributeSchema.bitFor(f); return r; })));
  for (const c of (process.argv[3] || '').split('|').filter(Boolean)) { if (c[0] === '@') { await dump('DUMP' + c); continue; } await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(600); await settle(); }
  await dump('DUMP@end'); await b.close(); })();
