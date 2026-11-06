const path=require('path');const { chromium } = require(process.cwd() + '/node_modules/playwright'); const { pathToFileURL } = require('url');
const plans={'Zork1-TheGreatUndergroundEmpire.z3.js':['n','e','open window','enter house','w','e','out','n','n','climb tree']};
(async()=>{const b=await chromium.launch();for(const g of Object.keys(plans)){const p=await b.newPage();
await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const k of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(k, '1'); });
await p.goto(pathToFileURL(path.resolve('play.html')).href+'?story=games/'+g);await p.waitForTimeout(2000);
const settle = async () => { for (let i = 0; i < 25; i++) { await p.evaluate(() => { document.querySelector('.parchlock-splash__start')?.click(); try { Message.Hide(); } catch (e) {} }); if (await p.locator('.Input.LineInput').count()) return true; const c = p.locator('.Input.CharInput'); if (await c.count()) await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(120); } return false; };
await settle();
for(const c of plans[g]){await p.locator('.Input.LineInput').first().focus(); await p.keyboard.type(c); await p.keyboard.press('Enter'); await p.waitForTimeout(1300); await settle();
const st=await p.evaluate(()=>({room:MapTopology.prevRoomId+':'+MapTopology.prevRoomName,last:MapTopology.lastCommand}));console.log(g.slice(0,6),JSON.stringify(c),JSON.stringify(st));}
const rooms=await p.evaluate(()=>(ParchLockMap.Rooms||[]).filter(r=>r&&r.HasRealId).map(r=>({id:r.ObjectId,n:r.Name,ex:Object.fromEntries(Object.keys(r.Exits||{}).map(k=>[k,(r.Exits[k])+'|'+((r.ExitMeta||{})[k]||{}).command+'|'+((r.ExitMeta||{})[k]||{}).source]))})));
console.log(JSON.stringify(rooms,null,1));await p.close();}await b.close();})();
