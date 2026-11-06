// Route + native bit-test recorder (claude, 2026-10-16). Plays "cmd|cmd|..." from boot (no relocation/forcing),
// records VM test_attr (obj:bit=result) only during the command named by REC, prints replies and the Equipment model.
//   REC=i node work/investigations/zil-route-ops.cjs Zork1-TheGreatUndergroundEmpire.z3.js "n|e|open window|w|take bottle|i"
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const { pathToFileURL } = require('url');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + process.argv[2]); await p.waitForTimeout(3500);
  const settle = async () => { for (let i = 0; i < 20 && !await p.locator('.Input.LineInput').count(); i++) { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); } await p.waitForTimeout(200); } };
  await p.evaluate(() => { const M = window.__PARCHLOCK_ZVM__; window.__ops = []; const o = M.test_attr; M.test_attr = function () { const g = Array.from(arguments), r = o.apply(this, g); if (window.__rec) window.__ops.push(g[0] + ":" + g[1] + "=" + (r ? 1 : 0)); return r; }; });
  for (const c of process.argv[3].split('|')) { await p.evaluate(rec => { try { if (Message.IsOpen) Message.Hide(); } catch (e) {} window.__ops = rec ? [] : window.__ops; window.__rec = rec; }, /^(wear|remove|take off|examine finger|take ring|i$)/.test(c.toLowerCase()) ? 1 : 0); /* an open Message blocks the typed-turn capture (learners) */ await settle(); const n0 = await p.evaluate(() => document.querySelector('#windowport').innerText.length); await p.locator('.Input.LineInput').fill(c); await p.keyboard.press('Enter'); await p.waitForTimeout(600); await settle();
    if (/^(wear|remove|take off|examine finger|take ring|i$)/.test(c.toLowerCase())) console.log('TARGET '+c+' '+JSON.stringify(await p.evaluate(()=>({ops:window.__ops,reply:document.querySelector('#windowport').innerText.slice(-500)}))));
    console.log('>' + c + ' :: ' + (await p.evaluate(n0 => document.querySelector('#windowport').innerText.slice(n0), n0)).replace(/\s+/g, ' ').slice(0, 400)); }
  console.log("OPS", JSON.stringify(await p.evaluate(() => [...new Set(window.__ops)])));
  console.log("EQ", JSON.stringify(await p.evaluate(() => { WorldModel.tick(); return EquipmentUI.model().items.map(o => o.id + ":" + o.name + "@" + o.parentId); })));
  await b.close(); })();
