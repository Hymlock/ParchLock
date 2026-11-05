// grok solo mapzero proof harness. node measure4.cjs <story> "<script a|b|#key>" [playerGlobal]
// With a playerGlobal argument, the page is served the facts file plus ONE appended in-memory assignment for the
// current executable digest (the repo file is not modified). Reports the digest, rooms (HasRealId), CurrentRoomId and the probe per step.
const { chromium } = require(process.cwd() + '/node_modules/playwright'); const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
(async () => { const story = process.argv[2], script = process.argv[3] || 'look', pg = process.argv[4];
  const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }; });
  await p.addInitScript(() => { sessionStorage.setItem('PL_ParchLockSplashSeen', '1'); for (const x of ['PL_TutorialSeen', 'PL_MobileTutorialSeen', 'PL_LearnedWordsTutorialSeen']) localStorage.setItem(x, '1'); });
  if (pg !== undefined) {
    await p.route(/ModuleStatFactsClaude\.js(\?.*)?$/, async (route) => {
      const src = fs.readFileSync(path.resolve('js/ModuleStatFactsClaude.js'), 'utf8');
      const add = '\n;(function(){var d="' + process.argv[5] + '";ModuleStatFactsClaude[d]=Object.assign(ModuleStatFactsClaude[d]||{}, {playerGlobal:' + Number(pg) + '});})();\n';
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: src + add }); });
  }
  await p.goto(pathToFileURL(path.resolve('play.html')).href + '?story=games/' + story); await p.waitForTimeout(3500);
  const trace = [];
  const snap = async (input) => trace.push(Object.assign({ input }, await p.evaluate(() => {
    const buf = Array.from(document.querySelectorAll('.BufferWindow')).map(e => e.innerText).join('\n');
    const grid = Array.from(document.querySelectorAll('.GridWindow')).map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' / ');
    const rooms = (typeof ParchLockMap !== 'undefined' ? (ParchLockMap.Rooms || []) : []).filter(r => r && r.HasRealId).map(r => r.ObjectId + ':' + r.Name);
    let probe = null, dig = null, fact = null, inv = null; try { dig = ModuleLibrary.currentExecutableDigest(); const pl = ZRamProvider.collect(); probe = pl.probe && { playerId: pl.probe.playerId, playerSource: pl.probe.playerSource, roomId: pl.probe.roomId, roomName: pl.probe.roomName, roomSource: pl.probe.roomSource }; inv = (pl.inventory || []).map(x => typeof x === 'string' ? x : (x.name || x.Name || x.label || x.text || JSON.stringify(x).slice(0, 50))); const f = ZRamReader.executableLayoutFacts(ZRamProvider.getMem()); fact = f ? f.playerGlobal : null; } catch (e) { probe = 'err:' + e.message; }
    let glob=null,chain=null,lp=null; try { const m=ZRamProvider.getMem(), h=ZRamReader.header(m), n=ZRamReader.objectCount(m,h); const P=WorldModel.lastPayload||{}; lp={playerId:P.playerId,roomId:P.roomId,roomName:P.roomName,pSrc:P.probe&&P.probe.playerSource,rSrc:P.probe&&P.probe.roomSource};
      const pid=(P.playerId||probe&&probe.playerId); chain=[]; let o=pid; for(let i=0;o&&i<6;i++){ const L=ZRamReader.objectLinks(m,o); chain.push(o+':'+ZRamReader.shortName(m,o)); o=L&&L.parent; }
      glob=[]; for(let g=0;g<240;g++){ const v=ZRamReader.u16(m,h.globals+g*2); if(v>=2&&v<=n){ const nm=String(ZRamReader.shortName(m,v)||''); if(v===pid||/self|yourself|player|you|^\(/i.test(nm)) glob.push(g+'='+v+':'+nm); } } } catch(e){ glob='err:'+e.message; }
    return { lp, chain, glob, dig, factPG: fact, inv, probe, status: grid.slice(0, 100), tail: buf.slice(-200).replace(/\s+/g, ' '), rooms, cur: typeof ParchLockMap !== 'undefined' ? ParchLockMap.CurrentRoomId : null };
  })));
  const charKey = async () => { const c = p.locator('.Input.CharInput'); if (await c.count()) { await c.first().focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300); return true; } return false; };
  const send = async (cmd) => { for (let i = 0; i < 25 && !await p.locator('.Input.LineInput').count(); i++) { if (!await charKey()) await p.waitForTimeout(200); }
    if (!await p.locator('.Input.LineInput').count()) { await snap('!noline:' + cmd); return; }
    await p.locator('.Input.LineInput').fill(cmd); await p.keyboard.press('Enter'); await p.waitForTimeout(900); await snap(cmd); };
  await snap('(start)');
  for (const c of script.split('|')) { if (c === '#key') { await charKey(); await snap('#key'); } else await send(c); }
  console.log(JSON.stringify({ story, pg: pg === undefined ? null : Number(pg), trace }, null, 1)); await b.close(); })();

