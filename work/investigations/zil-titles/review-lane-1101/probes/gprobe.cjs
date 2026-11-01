// grok-review read-only: live globals slots k and k+35 + object/parent names, per story. node gprobe.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
const T = [['cabal.z5.js',18],['bluechairs.z5.js',22],['Tokyo2.z5.js',19],['rameses.zblorb.js',18],['Heroine.z8.js',18],['Advent.z5.js',null]];
(async () => { const b = await chromium.launch();
 for (const [s,k] of T) { const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen','1'); for (const x of ['PL_TutorialSeen','PL_MobileTutorialSeen','PL_LearnedWordsTutorialSeen']) localStorage.setItem(x,'1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + s); await p.waitForTimeout(3500);
  for (let i=0;i<4;i++){ const c=p.locator('.Input.CharInput'); if (await c.count()){await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(500);} }
  const r = await p.evaluate((k) => { const m = ZRamProvider.getMem(), h = ZRamReader.header(m), n = ZRamReader.objectCount(m,h);
   const g = i => ZRamReader.u16(m, h.globals + i*2); const nm = id => id>=1&&id<=n ? ZRamReader.shortName(m,id) : '';
   const par = id => { try { return ZRamReader.objectLinks(m,id).parent; } catch(e){return -1;} };
   const out = { dig: ModuleLibrary.currentExecutableDigest(), factPG: (ZRamReader.executableLayoutFacts(m)||{}).playerGlobal };
   if (k!=null) { const a=g(k), c=g(k+35); out.pair=[a,c]; out.name=nm(a); out.parent=par(a)+':'+nm(par(a)); }
   // every slot holding the same id (uniqueness / alternatives)
   if (k!=null) { out.sameIdSlots=[]; for (let i=0;i<240;i++) if (g(i)===g(k)) out.sameIdSlots.push(i); }
   const pl = ZRamProvider.collect(); out.probe = pl.probe && [pl.probe.playerId, pl.probe.playerSource, pl.probe.roomId, pl.probe.roomSource].join('|');
   return out; }, k);
  console.log(s, JSON.stringify(r)); await p.close(); }
 await b.close(); })();
